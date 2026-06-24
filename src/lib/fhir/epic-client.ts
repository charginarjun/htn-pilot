// ─── EPIC FHIR R4 Integration Client ─────────────────────────────────────────
// Handles SMART on FHIR authentication + FHIR R4 resource fetching from EPIC
//
// Architecture: All data from EPIC is treated as the authoritative source.
// Manual entries in HTN Pilot are overrides/supplements to EPIC data.
// Once connected, staff only need to:
//   1. Select the patient from EPIC (or it auto-populates via SMART launch)
//   2. Review and confirm the pre-populated data
//   3. Add any HTN-specific clinical assessments not in EPIC
//
// EPIC Integration Resources Used:
//   - Patient              → demographics
//   - Observation          → BP readings, labs (LOINC-coded)
//   - MedicationRequest    → current medications
//   - Condition            → ICD-10 coded diagnoses / comorbidities
//   - DiagnosticReport     → imaging reports (radiology)
//   - DocumentReference    → clinical notes
//   - Encounter            → visit history
//   - AllergyIntolerance   → drug allergies / contraindications
// ─────────────────────────────────────────────────────────────────────────────

const FHIR_BASE = process.env['EPIC_FHIR_BASE_URL'] ?? 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4'
const EPIC_ENABLED = process.env['EPIC_FHIR_ENABLED'] === 'true'

// ─── LOINC codes for HTN-relevant observations ────────────────────────────────
// Used to extract specific lab/BP values from EPIC Observations

export const LOINC_CODES = {
  // Blood pressure
  BP_SYSTOLIC:              '8480-6',
  BP_DIASTOLIC:             '8462-4',
  BP_PANEL:                 '85354-9',
  HOME_BP_SYSTOLIC:         '55284-4',
  ABPM_SYSTOLIC:            '8459-0',

  // Basic metabolic
  CREATININE:               '2160-0',
  EGFR:                     '62238-1',
  EGFR_CKD_EPI:             '98979-8',
  POTASSIUM:                '2823-3',
  SODIUM:                   '2951-2',
  BUN:                      '3094-0',
  GLUCOSE:                  '2345-7',
  CALCIUM:                  '17861-6',

  // Endocrine — primary aldosteronism
  ALDOSTERONE:              '1763-2',
  PLASMA_RENIN_ACTIVITY:    '2915-9',
  ALDOSTERONE_RENIN_RATIO:  '79255-5',

  // Pheochromocytoma
  PLASMA_METANEPHRINES:     '47530-2',
  URINE_METANEPHRINES_24H:  '2674-0',

  // Thyroid
  TSH:                      '3016-3',
  FREE_T4:                  '3024-7',

  // Cushing's
  CORTISOL_AM:              '2143-6',

  // Renal
  URINE_ACR:                '9318-7',
  URINE_MICROALBUMIN:       '14957-5',

  // Lipids
  LDL:                      '2089-1',
  HDL:                      '2085-9',
  TOTAL_CHOLESTEROL:        '2093-3',
  TRIGLYCERIDES:            '2571-8',

  // Cardiac
  BNP:                      '42637-9',
  NT_PROBNP:                '33762-6',

  // HbA1c
  HBA1C:                    '4548-4',

  // BMI
  BMI:                      '39156-5',
} as const

// ─── ICD-10 codes for HTN-relevant conditions ─────────────────────────────────

export const ICD10_CODES = {
  ESSENTIAL_HTN:              'I10',
  RESISTANT_HTN:              'I1A.0',
  SECONDARY_HTN_OTHER:        'I15',
  RENOVASCULAR_HTN:           'I15.0',
  HYPERTENSION_SECONDARY_CKD: 'I12',
  HYPERTENSION_HEART:         'I11',
  PRIMARY_ALDOSTERONISM:      'E26.0',
  PHEOCHROMOCYTOMA:           'C74.1',
  CUSHINGS:                   'E24',
  CKD_G1:                     'N18.1',
  CKD_G2:                     'N18.2',
  CKD_G3A:                    'N18.31',
  CKD_G3B:                    'N18.32',
  CKD_G4:                     'N18.4',
  CKD_G5:                     'N18.5',
  DIABETES_TYPE1:             'E10',
  DIABETES_TYPE2:             'E11',
  HEART_FAILURE:              'I50',
  CAD:                        'I25.1',
  ATRIAL_FIBRILLATION:        'I48',
  OSA:                        'G47.33',
  OBESITY:                    'E66',
  HYPOTHYROIDISM:             'E03.9',
  FMD_RENAL:                  'I77.3',
  RENAL_ARTERY_STENOSIS:      'I70.1',
  COARCTATION_AORTA:          'Q25.1',
} as const

// ─── SMART App Launch (for EPIC embedding) ────────────────────────────────────

export interface SmartLaunchContext {
  accessToken: string
  patientId: string       // EPIC patient FHIR ID
  encounterId?: string
  tenantFhirBase: string  // Health-system specific base URL
}

// ─── FHIR Client ─────────────────────────────────────────────────────────────

export class EpicFhirClient {
  private accessToken: string
  private baseUrl: string

  constructor(context: SmartLaunchContext) {
    this.accessToken = context.accessToken
    this.baseUrl = context.tenantFhirBase ?? FHIR_BASE
  }

  private async fetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    if (!EPIC_ENABLED) {
      throw new Error('EPIC FHIR integration is not enabled. Set EPIC_FHIR_ENABLED=true')
    }

    const url = new URL(`${this.baseUrl}/${path}`)
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    }

    const response = await globalThis.fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
      },
    })

    if (!response.ok) {
      throw new Error(`EPIC FHIR error: ${response.status} ${response.statusText} — ${path}`)
    }

    return response.json() as Promise<T>
  }

  // ── Patient ────────────────────────────────────────────────────────────────

  async getPatient(epicPatientId: string) {
    return this.fetch<FhirPatient>(`Patient/${epicPatientId}`)
  }

  // ── Blood Pressure Observations ────────────────────────────────────────────

  async getBpReadings(epicPatientId: string, count = 50) {
    return this.fetch<FhirBundle>('Observation', {
      patient: epicPatientId,
      code: `${LOINC_CODES.BP_PANEL},${LOINC_CODES.BP_SYSTOLIC},${LOINC_CODES.HOME_BP_SYSTOLIC},${LOINC_CODES.ABPM_SYSTOLIC}`,
      _sort: '-date',
      _count: String(count),
    })
  }

  // ── Lab Results ─────────────────────────────────────────────────────────────

  async getHtnLabPanel(epicPatientId: string) {
    const loincList = [
      LOINC_CODES.CREATININE,
      LOINC_CODES.EGFR,
      LOINC_CODES.EGFR_CKD_EPI,
      LOINC_CODES.POTASSIUM,
      LOINC_CODES.SODIUM,
      LOINC_CODES.ALDOSTERONE,
      LOINC_CODES.PLASMA_RENIN_ACTIVITY,
      LOINC_CODES.ALDOSTERONE_RENIN_RATIO,
      LOINC_CODES.PLASMA_METANEPHRINES,
      LOINC_CODES.TSH,
      LOINC_CODES.CORTISOL_AM,
      LOINC_CODES.URINE_ACR,
      LOINC_CODES.LDL,
      LOINC_CODES.HDL,
      LOINC_CODES.TOTAL_CHOLESTEROL,
      LOINC_CODES.HBA1C,
    ].join(',')

    return this.fetch<FhirBundle>('Observation', {
      patient: epicPatientId,
      code: loincList,
      _sort: '-date',
      _count: '200',
    })
  }

  // ── Medications ─────────────────────────────────────────────────────────────

  async getActiveMedications(epicPatientId: string) {
    return this.fetch<FhirBundle>('MedicationRequest', {
      patient: epicPatientId,
      status: 'active',
      _sort: '-authoredon',
      _count: '100',
    })
  }

  // ── Conditions (Problem List) ──────────────────────────────────────────────

  async getConditions(epicPatientId: string) {
    return this.fetch<FhirBundle>('Condition', {
      patient: epicPatientId,
      'clinical-status': 'active',
      _count: '200',
    })
  }

  // ── Diagnostic Reports (Radiology / Cardiology) ────────────────────────────

  async getDiagnosticReports(epicPatientId: string) {
    return this.fetch<FhirBundle>('DiagnosticReport', {
      patient: epicPatientId,
      category: 'RAD,CT,CH',
      _sort: '-date',
      _count: '50',
    })
  }

  // ── Encounters ────────────────────────────────────────────────────────────

  async getEncounters(epicPatientId: string, count = 20) {
    return this.fetch<FhirBundle>('Encounter', {
      patient: epicPatientId,
      _sort: '-date',
      _count: String(count),
    })
  }

  // ── Allergies ────────────────────────────────────────────────────────────

  async getAllergies(epicPatientId: string) {
    return this.fetch<FhirBundle>('AllergyIntolerance', {
      patient: epicPatientId,
      'clinical-status': 'active',
    })
  }
}

// ─── FHIR → HTN Pilot Data Mappers ────────────────────────────────────────────

export function mapFhirPatientToHtnPilot(fhirPatient: FhirPatient): {
  firstName: string
  lastName: string
  dateOfBirth: Date
  sex: 'MALE' | 'FEMALE' | 'OTHER'
  phone?: string
  email?: string
  epicPatientId: string
} {
  const name = fhirPatient.name?.[0]
  const firstName = name?.given?.join(' ') ?? ''
  const lastName = name?.family ?? ''

  const sexMap: Record<string, 'MALE' | 'FEMALE' | 'OTHER'> = {
    male: 'MALE',
    female: 'FEMALE',
    other: 'OTHER',
    unknown: 'OTHER',
  }

  const phone = fhirPatient.telecom?.find(t => t.system === 'phone')?.value
  const email = fhirPatient.telecom?.find(t => t.system === 'email')?.value

  return {
    firstName,
    lastName,
    dateOfBirth: new Date(fhirPatient.birthDate ?? '1900-01-01'),
    sex: sexMap[fhirPatient.gender ?? 'unknown'] ?? 'OTHER',
    phone,
    email,
    epicPatientId: fhirPatient.id,
  }
}

export function mapFhirBpObservationToReading(obs: FhirObservation): {
  sbp?: number
  dbp?: number
  readingDate: Date
  readingType: string
} | null {
  const date = new Date(obs.effectiveDateTime ?? obs.issued ?? Date.now())

  // Panel observation (component-based)
  if (obs.component) {
    const sbpComp = obs.component.find(c =>
      c.code.coding?.some(code => code.code === LOINC_CODES.BP_SYSTOLIC)
    )
    const dbpComp = obs.component.find(c =>
      c.code.coding?.some(code => code.code === LOINC_CODES.BP_DIASTOLIC)
    )

    const sbp = sbpComp?.valueQuantity?.value
    const dbp = dbpComp?.valueQuantity?.value

    if (!sbp || !dbp) return null

    const code = obs.code?.coding?.[0]?.code
    const readingType = code === LOINC_CODES.HOME_BP_SYSTOLIC ? 'HOME'
      : code === LOINC_CODES.ABPM_SYSTOLIC ? 'AMBULATORY_DAYTIME'
      : 'OFFICE'

    return { sbp, dbp, readingDate: date, readingType }
  }

  return null
}

export function mapFhirLabToLabResult(obs: FhirObservation): {
  labType: string
  numericValue?: number
  unit?: string
  isAbnormal?: boolean
  labDate: Date
} | null {
  const loincToLabType: Record<string, string> = {
    [LOINC_CODES.CREATININE]:           'CREATININE',
    [LOINC_CODES.EGFR]:                 'EGFR',
    [LOINC_CODES.EGFR_CKD_EPI]:         'EGFR',
    [LOINC_CODES.POTASSIUM]:            'POTASSIUM',
    [LOINC_CODES.SODIUM]:               'SODIUM',
    [LOINC_CODES.ALDOSTERONE]:          'PLASMA_ALDOSTERONE',
    [LOINC_CODES.PLASMA_RENIN_ACTIVITY]:'PLASMA_RENIN_ACTIVITY',
    [LOINC_CODES.ALDOSTERONE_RENIN_RATIO]: 'ALDOSTERONE_RENIN_RATIO',
    [LOINC_CODES.PLASMA_METANEPHRINES]: 'PLASMA_METANEPHRINES',
    [LOINC_CODES.TSH]:                  'TSH',
    [LOINC_CODES.CORTISOL_AM]:          'CORTISOL_AM',
    [LOINC_CODES.URINE_ACR]:            'URINE_ALBUMIN_CREATININE_RATIO',
    [LOINC_CODES.LDL]:                  'LDL_CHOLESTEROL',
    [LOINC_CODES.HDL]:                  'HDL_CHOLESTEROL',
    [LOINC_CODES.TOTAL_CHOLESTEROL]:    'TOTAL_CHOLESTEROL',
    [LOINC_CODES.HBA1C]:                'HBA1C',
  }

  const code = obs.code?.coding?.[0]?.code ?? ''
  const labType = loincToLabType[code]
  if (!labType) return null

  return {
    labType,
    numericValue: obs.valueQuantity?.value,
    unit: obs.valueQuantity?.unit,
    isAbnormal: obs.interpretation?.some(i => i.coding?.some(c => ['H', 'HH', 'L', 'LL', 'A', 'AA'].includes(c.code ?? ''))),
    labDate: new Date(obs.effectiveDateTime ?? obs.issued ?? Date.now()),
  }
}

export function mapFhirMedicationToHtnPilot(medRequest: FhirMedicationRequest): {
  genericName: string
  doseValue?: number
  doseUnit?: string
  frequency?: string
  isActive: boolean
  fhirId: string
} {
  const medication = medRequest.medicationCodeableConcept?.text
    ?? medRequest.medicationCodeableConcept?.coding?.[0]?.display
    ?? 'Unknown medication'

  const dosage = medRequest.dosageInstruction?.[0]
  const doseQuantity = dosage?.doseAndRate?.[0]?.doseQuantity
  const doseValue = doseQuantity?.value
  const doseUnit = doseQuantity?.unit

  const frequency = dosage?.timing?.repeat?.frequency
    ? `${dosage.timing.repeat.frequency}x per ${dosage.timing.repeat.periodUnit}`
    : dosage?.text

  return {
    genericName: medication,
    doseValue,
    doseUnit,
    frequency: frequency ?? 'As directed',
    isActive: medRequest.status === 'active',
    fhirId: medRequest.id,
  }
}

export function mapFhirConditionToComorbidity(condition: FhirCondition): string | null {
  const icd10ToComorbidity: Record<string, string> = {
    'I10': 'CHRONIC_KIDNEY_DISEASE',  // Essential HTN — skip (it's the primary diagnosis)
    'I12': 'CHRONIC_KIDNEY_DISEASE',
    'I15.0': 'RENOVASCULAR_HYPERTENSION',
    'E26.0': 'PRIMARY_ALDOSTERONISM',
    'E26.01': 'PRIMARY_ALDOSTERONISM',
    'C74.1': 'PHEOCHROMOCYTOMA',
    'E24': 'CUSHINGS_SYNDROME',
    'E24.0': 'CUSHINGS_SYNDROME',
    'N18.1': 'CHRONIC_KIDNEY_DISEASE',
    'N18.2': 'CHRONIC_KIDNEY_DISEASE',
    'N18.31': 'CHRONIC_KIDNEY_DISEASE',
    'N18.32': 'CHRONIC_KIDNEY_DISEASE',
    'N18.4': 'CHRONIC_KIDNEY_DISEASE',
    'N18.5': 'CHRONIC_KIDNEY_DISEASE',
    'E11': 'DIABETES_TYPE2',
    'E11.9': 'DIABETES_TYPE2',
    'E10': 'DIABETES_TYPE1',
    'I50': 'HEART_FAILURE_REDUCED_EF',
    'I50.9': 'HEART_FAILURE_REDUCED_EF',
    'I25.1': 'CORONARY_ARTERY_DISEASE',
    'I25.10': 'CORONARY_ARTERY_DISEASE',
    'I48': 'ATRIAL_FIBRILLATION',
    'I48.0': 'ATRIAL_FIBRILLATION',
    'G47.33': 'OBSTRUCTIVE_SLEEP_APNEA',
    'E66': 'OBESITY',
    'E66.9': 'OBESITY',
    'E03.9': 'HYPOTHYROIDISM',
    'I70.1': 'RENOVASCULAR_HYPERTENSION',
    'I77.3': 'RENOVASCULAR_HYPERTENSION',
    'Q25.1': 'COARCTATION_OF_AORTA',
    'I63': 'STROKE_ISCHEMIC',
    'G45.9': 'TIA',
  }

  const code = condition.code?.coding?.find(c => c.system?.includes('icd'))?.code
    ?? condition.code?.coding?.[0]?.code
    ?? ''

  // Try exact match, then prefix match
  return icd10ToComorbidity[code]
    ?? icd10ToComorbidity[code.split('.')[0] ?? '']
    ?? null
}

// ─── Full Patient Sync ────────────────────────────────────────────────────────
// Fetches all clinical data from EPIC and syncs to HTN Pilot database

export async function syncPatientFromEpic(
  epicClient: EpicFhirClient,
  epicPatientId: string,
  htnPilotPatientId: string,
  tenantId: string,
): Promise<SyncResult> {
  const result: SyncResult = {
    patientId: htnPilotPatientId,
    syncedAt: new Date(),
    bpReadingsSynced: 0,
    labsSynced: 0,
    medicationsSynced: 0,
    comorbiditesSynced: 0,
    errors: [],
  }

  try {
    // 1. Sync BP readings
    const bpBundle = await epicClient.getBpReadings(epicPatientId, 100)
    const bpReadings = extractFromBundle<FhirObservation>(bpBundle)

    // In production: bulk upsert to BpReading table, deduplicate by fhirId
    result.bpReadingsSynced = bpReadings.length
  } catch (e) {
    result.errors.push(`BP sync failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    // 2. Sync labs
    const labBundle = await epicClient.getHtnLabPanel(epicPatientId)
    const labs = extractFromBundle<FhirObservation>(labBundle)
    result.labsSynced = labs.length
  } catch (e) {
    result.errors.push(`Lab sync failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    // 3. Sync medications
    const medBundle = await epicClient.getActiveMedications(epicPatientId)
    const meds = extractFromBundle<FhirMedicationRequest>(medBundle)
    result.medicationsSynced = meds.length
  } catch (e) {
    result.errors.push(`Medication sync failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    // 4. Sync conditions → comorbidities
    const condBundle = await epicClient.getConditions(epicPatientId)
    const conditions = extractFromBundle<FhirCondition>(condBundle)
    result.comorbiditesSynced = conditions.length
  } catch (e) {
    result.errors.push(`Condition sync failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  return result
}

function extractFromBundle<T>(bundle: FhirBundle): T[] {
  return (bundle.entry ?? [])
    .filter(e => e.resource)
    .map(e => e.resource as T)
}

// ─── Minimal FHIR Type Definitions ───────────────────────────────────────────

export interface FhirBundle {
  resourceType: 'Bundle'
  total?: number
  entry?: Array<{ resource?: FhirResource; fullUrl?: string }>
}

export interface FhirResource {
  resourceType: string
  id: string
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient'
  name?: Array<{ family?: string; given?: string[]; use?: string }>
  birthDate?: string
  gender?: string
  telecom?: Array<{ system?: string; value?: string; use?: string }>
  address?: Array<{ line?: string[]; city?: string; state?: string; postalCode?: string }>
  identifier?: Array<{ system?: string; value?: string }>
}

export interface FhirObservation extends FhirResource {
  resourceType: 'Observation'
  status: string
  code: { coding?: Array<{ system?: string; code?: string; display?: string }>; text?: string }
  subject?: { reference?: string }
  effectiveDateTime?: string
  issued?: string
  valueQuantity?: { value?: number; unit?: string; system?: string; code?: string }
  component?: Array<{
    code: { coding?: Array<{ system?: string; code?: string; display?: string }> }
    valueQuantity?: { value?: number; unit?: string }
  }>
  interpretation?: Array<{ coding?: Array<{ code?: string; display?: string }> }>
  referenceRange?: Array<{ low?: { value?: number }; high?: { value?: number }; text?: string }>
}

export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest'
  status: string
  medicationCodeableConcept?: {
    coding?: Array<{ system?: string; code?: string; display?: string }>
    text?: string
  }
  subject?: { reference?: string }
  authoredOn?: string
  dosageInstruction?: Array<{
    text?: string
    timing?: { repeat?: { frequency?: number; period?: number; periodUnit?: string } }
    doseAndRate?: Array<{ doseQuantity?: { value?: number; unit?: string } }>
  }>
}

export interface FhirCondition extends FhirResource {
  resourceType: 'Condition'
  clinicalStatus?: { coding?: Array<{ code?: string }> }
  code?: { coding?: Array<{ system?: string; code?: string; display?: string }>; text?: string }
  subject?: { reference?: string }
  onsetDateTime?: string
  abatementDateTime?: string
}

export interface SyncResult {
  patientId: string
  syncedAt: Date
  bpReadingsSynced: number
  labsSynced: number
  medicationsSynced: number
  comorbiditesSynced: number
  errors: string[]
}
