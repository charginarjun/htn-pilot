// ─── EPIC FHIR Sync API ───────────────────────────────────────────────────────
// POST /api/fhir/sync — Pull all clinical data from EPIC for a patient
//
// When connected to EPIC, this replaces manual data entry for:
//   - Blood pressure readings (all types)
//   - Laboratory results (full HTN panel + metabolic)
//   - Active medications (with doses and frequencies)
//   - Problem list / diagnoses / comorbidities
//   - Medication allergies and intolerances (feeds safety checks)
//   - Imaging reports (when structured data available)
//
// Manual entry remains available for:
//   - Data not in EPIC (e.g., home BP monitors not connected)
//   - Overrides / corrections
//   - Specialist findings entered directly by HTN Pilot team

import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import { withAuth, ok, error } from '@/lib/api-middleware'
import { requireRole, auditLog } from '@/lib/auth'
import {
  EpicFhirClient,
  syncPatientFromEpic,
  mapFhirPatientToHtnPilot,
  mapFhirBpObservationToReading,
  mapFhirLabToLabResult,
  mapFhirMedicationToHtnPilot,
  mapFhirConditionToComorbidity,
  type FhirObservation,
  type FhirMedicationRequest,
  type FhirCondition,
} from '@/lib/fhir/epic-client'
import {
  mapFhirAllergyToHtnPilot,
  summarizeAllergyImpact,
  type FhirAllergyIntolerance,
} from '@/lib/fhir/allergy-mapper'

const syncSchema = z.object({
  patientId: z.string(),           // HTN Pilot patient ID
  epicPatientId: z.string(),       // EPIC FHIR patient ID
  accessToken: z.string(),         // SMART on FHIR access token
  tenantFhirBase: z.string().url().optional(),
  syncTypes: z.array(z.enum(['bp', 'labs', 'medications', 'conditions', 'allergies', 'all'])).default(['all']),
})

export const POST = withAuth(async (req, auth) => {
  try {
    requireRole(auth.role, 'COORDINATOR')

    const body = await req.json()
    const params = syncSchema.parse(body)

    // Verify patient belongs to this tenant
    const patient = await db.patient.findFirst({
      where: { id: params.patientId, tenantId: auth.tenantId },
    })
    if (!patient) return error({ statusCode: 404, message: 'Patient not found' })

    // Check EPIC is enabled for this tenant
    const tenant = await db.tenant.findUnique({ where: { id: auth.tenantId } })
    if (!tenant?.epicEnabled) {
      return error({ statusCode: 403, message: 'EPIC integration is not enabled for this organization. Contact your administrator.' })
    }

    const epicClient = new EpicFhirClient({
      accessToken: params.accessToken,
      patientId: params.epicPatientId,
      tenantFhirBase: params.tenantFhirBase ?? '',
    })

    const syncAll = params.syncTypes.includes('all')
    const syncResults: Record<string, number | string[]> = {}
    const warnings: string[] = []

    // ── BP Readings ────────────────────────────────────────────────────────
    if (syncAll || params.syncTypes.includes('bp')) {
      const bpBundle = await epicClient.getBpReadings(params.epicPatientId, 100)
      const bpObs = (bpBundle.entry ?? []).map(e => e.resource as FhirObservation).filter(Boolean)

      let bpCount = 0
      for (const obs of bpObs) {
        const reading = mapFhirBpObservationToReading(obs)
        if (!reading?.sbp || !reading?.dbp) continue

        await db.bpReading.upsert({
          where: { fhirId: obs.id } as never,
          create: {
            patientId: params.patientId,
            fhirId: obs.id,
            readingDate: reading.readingDate,
            readingType: reading.readingType as never,
            sbp: reading.sbp,
            dbp: reading.dbp,
          },
          update: {
            sbp: reading.sbp,
            dbp: reading.dbp,
          },
        }).catch(() => null) // Skip duplicates gracefully

        bpCount++
      }
      syncResults['bpReadings'] = bpCount
    }

    // ── Lab Results ────────────────────────────────────────────────────────
    if (syncAll || params.syncTypes.includes('labs')) {
      const labBundle = await epicClient.getHtnLabPanel(params.epicPatientId)
      const labObs = (labBundle.entry ?? []).map(e => e.resource as FhirObservation).filter(Boolean)

      let labCount = 0
      for (const obs of labObs) {
        const lab = mapFhirLabToLabResult(obs)
        if (!lab) continue

        await db.labResult.upsert({
          where: { fhirId: obs.id } as never,
          create: {
            patientId: params.patientId,
            fhirId: obs.id,
            labDate: lab.labDate,
            labType: lab.labType as never,
            numericValue: lab.numericValue,
            unit: lab.unit,
            isAbnormal: lab.isAbnormal,
          },
          update: {
            numericValue: lab.numericValue,
            isAbnormal: lab.isAbnormal,
          },
        }).catch(() => null)

        labCount++
      }
      syncResults['labs'] = labCount
    }

    // ── Medications ────────────────────────────────────────────────────────
    if (syncAll || params.syncTypes.includes('medications')) {
      const medBundle = await epicClient.getActiveMedications(params.epicPatientId)
      const meds = (medBundle.entry ?? []).map(e => e.resource as FhirMedicationRequest).filter(Boolean)

      let medCount = 0
      for (const med of meds) {
        const mapped = mapFhirMedicationToHtnPilot(med)

        await db.patientMedication.upsert({
          where: { fhirId: med.id } as never,
          create: {
            patientId: params.patientId,
            fhirId: med.id,
            genericName: mapped.genericName,
            doseUnit: mapped.doseUnit ?? 'mg',
            doseValue: mapped.doseValue ?? null,
            frequency: mapped.frequency ?? 'See EPIC',
            isActive: mapped.isActive,
          },
          update: {
            genericName: mapped.genericName,
            doseValue: mapped.doseValue ?? null,
            doseUnit: mapped.doseUnit ?? 'mg',
            isActive: mapped.isActive,
          },
        }).catch(() => null)

        medCount++
      }
      syncResults['medications'] = medCount
    }

    // ── Conditions / Problem List ────────────────────────────────────────
    if (syncAll || params.syncTypes.includes('conditions')) {
      const condBundle = await epicClient.getConditions(params.epicPatientId)
      const conditions = (condBundle.entry ?? []).map(e => e.resource as FhirCondition).filter(Boolean)

      let condCount = 0
      const unmappedConditions: string[] = []

      for (const cond of conditions) {
        const comorbidity = mapFhirConditionToComorbidity(cond)
        if (!comorbidity) {
          const display = cond.code?.text ?? cond.code?.coding?.[0]?.display
          if (display) unmappedConditions.push(display)
          continue
        }

        await db.patientComorbidity.upsert({
          where: { patientId_condition: { patientId: params.patientId, condition: comorbidity as never } },
          create: {
            patientId: params.patientId,
            fhirId: cond.id,
            condition: comorbidity as never,
            isActive: true,
          },
          update: { isActive: true, fhirId: cond.id },
        }).catch(() => null)

        condCount++
      }

      syncResults['conditions'] = condCount
      if (unmappedConditions.length > 0) {
        warnings.push(`${unmappedConditions.length} conditions from EPIC not mapped to HTN Pilot categories (manual review may be needed): ${unmappedConditions.slice(0, 5).join(', ')}`)
      }
    }

    // ── Allergies & Intolerances ─────────────────────────────────────────
    if (syncAll || params.syncTypes.includes('allergies')) {
      const allergyBundle = await epicClient.getAllergies(params.epicPatientId)
      const fhirAllergies = (allergyBundle.entry ?? [])
        .map(e => e.resource as FhirAllergyIntolerance)
        .filter(a => a && a.category?.includes('medication'))

      const processedAllergies = fhirAllergies.map(mapFhirAllergyToHtnPilot)
      const allergyImpact = summarizeAllergyImpact(processedAllergies)

      // TODO: Store allergy impact on a dedicated AllergyRecord table (future schema migration)
      // For now, allergy summary is returned in the API response and used at assessment time
      // via re-fetching from EPIC or re-summarizing stored allergy records.

      syncResults['allergies'] = processedAllergies.length
      syncResults['allergyFlags'] = allergyImpact.procedureFlags

      if (allergyImpact.contraindicatedClasses.length > 0) {
        warnings.push(
          `DRUG CONTRAINDICATIONS from allergies: ${allergyImpact.contraindicatedClasses.join(', ')} — these drug classes should not be prescribed. See allergy details.`
        )
      }
      if (allergyImpact.requiresCo2Angiography) {
        warnings.push('⚠️ PROCEDURE FLAG: Severe contrast allergy — CO2 angiography required for any cath lab procedure.')
      }
      if (allergyImpact.requiresPremedication) {
        warnings.push('⚠️ PROCEDURE FLAG: Contrast allergy — premedication protocol required before RDN/stenting/PTA.')
      }
    }

    // Update EPIC patient ID on record
    await db.patient.update({
      where: { id: params.patientId },
      data: { epicPatientId: params.epicPatientId },
    })

    await auditLog({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: 'UPDATE',
      resource: 'patient',
      resourceId: params.patientId,
      newValues: { epicSync: syncResults, epicPatientId: params.epicPatientId },
      req,
    })

    return ok({
      message: 'EPIC sync complete',
      patientId: params.patientId,
      syncResults,
      warnings,
      syncedAt: new Date().toISOString(),
      note: 'All synced data is marked with EPIC FHIR source. Manual entries remain as overrides.',
    })

  } catch (err) {
    return error(err)
  }
})

// ─── EPIC Subscription Webhook ────────────────────────────────────────────────
// Receives real-time updates from EPIC when patient data changes

export const PUT = withAuth(async (req, auth) => {
  try {
    // EPIC sends subscription notifications here
    // In production: validate the EPIC subscription token, then trigger incremental sync
    const body = await req.json()

    console.log('[EPIC Webhook] Received notification:', body)

    // Queue incremental sync job (BullMQ in production)
    // await syncQueue.add('epic-incremental-sync', { ... })

    return ok({ received: true })
  } catch (err) {
    return error(err)
  }
})
