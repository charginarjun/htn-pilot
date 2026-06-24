// ─── Database Seed Script ─────────────────────────────────────────────────────
// Creates demo tenant, users, and sample patients for development

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding HTN Pilot database...')

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await db.tenant.upsert({
    where: { slug: 'metro-cardiology' },
    update: {},
    create: {
      name: 'Metro Cardiology Center',
      slug: 'metro-cardiology',
      plan: 'PROFESSIONAL',
      aiAssessmentsEnabled: true,
      bulkImportEnabled: true,
    },
  })
  console.log('✓ Tenant created:', tenant.name)

  // ── Guideline versions ────────────────────────────────────────────────────
  await db.guidelineVersion.upsert({
    where: { society_year_version: { society: 'ACC/AHA', year: 2023, version: '2023.1' } },
    update: {},
    create: {
      name: 'ACC/AHA Hypertension Guidelines',
      society: 'ACC/AHA',
      year: 2023,
      version: '2023.1',
      description: 'ACC/AHA 2018 + 2023 Hypertension Updates + Resistant HTN Scientific Statement',
      engineVersion: 'acc-aha-2023',
      isActive: true,
      publishedAt: new Date('2023-10-01'),
    },
  })

  await db.guidelineVersion.upsert({
    where: { society_year_version: { society: 'ESC', year: 2024, version: '2024.0' } },
    update: {},
    create: {
      name: 'ESC Hypertension Guidelines',
      society: 'ESC',
      year: 2024,
      version: '2024.0',
      description: 'ESC 2024 Guidelines for the Management of Elevated Blood Pressure and Hypertension (Mancia et al.)',
      engineVersion: 'esc-2024',
      isActive: true,
      publishedAt: new Date('2024-08-30'),
    },
  })
  console.log('✓ Guideline versions seeded')

  // ── Users ─────────────────────────────────────────────────────────────────
  // Remove any old demo accounts before re-seeding
  await db.user.deleteMany({
    where: {
      email: {
        in: [
          'dr.interventional@metro-cardiology.demo',
          'dr.stent.strimmer@metro-cardiology.demo',
          'coordinator@metro-cardiology.demo',
          'admin@metro-cardiology.demo',
        ],
      },
    },
  })

  const pwHash = await bcrypt.hash('HTNpilot2026!', 12)

  const physician = await db.user.upsert({
    where: { email: 'Dr.Stent.Strimmer@gmail.com' },
    update: { passwordHash: pwHash },
    create: {
      tenantId: tenant.id,
      email: 'Dr.Stent.Strimmer@gmail.com',
      name: 'Dr. Stent Strimmer',
      title: 'MD',
      role: 'PHYSICIAN',
      specialty: 'Interventional Cardiology',
      npi: '1234567890',
      passwordHash: pwHash,
    },
  })

  console.log('✓ Users seeded')

  // ── Demo patient ──────────────────────────────────────────────────────────
  const patient = await db.patient.upsert({
    where: { tenantId_mrn: { tenantId: tenant.id, mrn: 'HTN-0441' } },
    update: {},
    create: {
      tenantId: tenant.id,
      mrn: 'HTN-0441',
      firstName: 'Patricia',
      lastName: 'Martinez',
      dateOfBirth: new Date('1963-08-14'),
      sex: 'FEMALE',
      phone: '(555) 867-5309',
      createdById: physician.id,
    },
  })

  // BP readings
  const bpData = [
    { sbp: 168, dbp: 98, type: 'OFFICE' as const, daysAgo: 4 },
    { sbp: 172, dbp: 102, type: 'OFFICE' as const, daysAgo: 7 },
    { sbp: 154, dbp: 94, type: 'HOME' as const, daysAgo: 12 },
    { sbp: 161, dbp: 92, type: 'AMBULATORY_DAYTIME' as const, daysAgo: 14 },
    { sbp: 158, dbp: 96, type: 'HOME' as const, daysAgo: 21 },
  ]

  for (const bp of bpData) {
    const readingDate = new Date()
    readingDate.setDate(readingDate.getDate() - bp.daysAgo)
    await db.bpReading.create({
      data: {
        patientId: patient.id,
        readingDate,
        readingType: bp.type,
        sbp: bp.sbp,
        dbp: bp.dbp,
        heartRate: 76,
        position: 'SITTING',
        arm: 'RIGHT',
      },
    }).catch(() => null)
  }

  // Medications
  const medData = [
    { genericName: 'Lisinopril', doseValue: 40, doseUnit: 'mg', frequency: 'once daily', drugClass: 'ACE_INHIBITOR' as const, isAtMaxDose: true, adherence: 'ADHERENT' as const },
    { genericName: 'Amlodipine', doseValue: 10, doseUnit: 'mg', frequency: 'once daily', drugClass: 'CALCIUM_CHANNEL_BLOCKER_DHP' as const, isAtMaxDose: true, adherence: 'ADHERENT' as const },
    { genericName: 'Chlorthalidone', doseValue: 25, doseUnit: 'mg', frequency: 'once daily', drugClass: 'THIAZIDE_LIKE_DIURETIC' as const, isAtMaxDose: true, adherence: 'ADHERENT' as const },
    { genericName: 'Spironolactone', doseValue: 50, doseUnit: 'mg', frequency: 'once daily', drugClass: 'MINERALOCORTICOID_ANTAGONIST' as const, isAtMaxDose: false, adherence: 'ADHERENT' as const },
  ]

  for (const med of medData) {
    await db.patientMedication.create({
      data: { patientId: patient.id, ...med, isActive: true },
    }).catch(() => null)
  }

  // Labs
  const labData = [
    { labType: 'EGFR' as const, numericValue: 52, unit: 'mL/min/1.73m²', isAbnormal: true },
    { labType: 'CREATININE' as const, numericValue: 1.3, unit: 'mg/dL', isAbnormal: true },
    { labType: 'POTASSIUM' as const, numericValue: 4.2, unit: 'mEq/L', isAbnormal: false },
    { labType: 'SODIUM' as const, numericValue: 140, unit: 'mEq/L', isAbnormal: false },
    { labType: 'PLASMA_ALDOSTERONE' as const, numericValue: 22, unit: 'ng/dL', isAbnormal: true },
    { labType: 'PLASMA_RENIN_ACTIVITY' as const, numericValue: 0.4, unit: 'ng/mL/h', isAbnormal: false },
    { labType: 'ALDOSTERONE_RENIN_RATIO' as const, numericValue: 55, unit: '', isAbnormal: true },
    { labType: 'TSH' as const, numericValue: 2.1, unit: 'mU/L', isAbnormal: false },
    { labType: 'LDL_CHOLESTEROL' as const, numericValue: 98, unit: 'mg/dL', isAbnormal: true },
    { labType: 'URINE_ALBUMIN_CREATININE_RATIO' as const, numericValue: 42, unit: 'mg/g', isAbnormal: true },
    { labType: 'HBA1C' as const, numericValue: 5.4, unit: '%', isAbnormal: false },
  ]

  for (const lab of labData) {
    await db.labResult.create({
      data: {
        patientId: patient.id,
        labDate: new Date(),
        ...lab,
      },
    }).catch(() => null)
  }

  // Comorbidities
  const comorbData = [
    { condition: 'CHRONIC_KIDNEY_DISEASE' as const, severity: 'G3a', icdCode: 'N18.31' },
    { condition: 'DYSLIPIDEMIA' as const, icdCode: 'E78.5' },
    { condition: 'OBSTRUCTIVE_SLEEP_APNEA' as const, icdCode: 'G47.33' },
    { condition: 'OBESITY' as const, icdCode: 'E66.9' },
  ]

  for (const comorbidity of comorbData) {
    await db.patientComorbidity.upsert({
      where: { patientId_condition: { patientId: patient.id, condition: comorbidity.condition } },
      update: {},
      create: { patientId: patient.id, isActive: true, ...comorbidity },
    }).catch(() => null)
  }

  // Referral + workup
  const referral = await db.referral.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      referringProvider: 'Dr. J. Chen',
      referringFacility: 'Northwest Medical Group',
      status: 'PHYSICIAN_REVIEW',
      priority: 'HIGH',
      chiefComplaint: 'Uncontrolled blood pressure on 4 antihypertensive medications',
      createdById: physician.id,
    },
  }).catch(async () => {
    return db.referral.findFirst({ where: { patientId: patient.id } })
  })

  if (referral) {
    await db.htnWorkup.upsert({
      where: { referralId: referral.id },
      update: {},
      create: {
        referralId: referral.id,
        primaryAldosteronism: 'COMPLETED_ABNORMAL',
        arrResult: 55,
        arrAbnormal: true,
        renovascularHtn: 'COMPLETED_NORMAL',
        renalDuplexDone: true,
        sleepApnea: 'COMPLETED_ABNORMAL',
        ahi: 22,
        cpapInitiated: true,
        renalParenchymal: 'COMPLETED_NORMAL',
        ckdStage: 'G3a',
        thyroidDisease: 'COMPLETED_NORMAL',
        cushings: 'COMPLETED_NORMAL',
        pheochromocytoma: 'COMPLETED_NORMAL',
        ecgDone: true,
        ecgLvh: true,
        echocardiogramDone: true,
        echoLvh: true,
        echoLvmi: 128,
        microalbuminuriaDone: true,
        albuminuriaMgG: 42,
        bmi: 31.2,
        dietaryNaclGDay: 3.8,
        physicalActivityMinWk: 60,
        alcoholDrinksPerWeek: 5,
        smokingStatus: 'Former',
        workupStatus: 'COMPLETE',
        drugInducedReviewed: true,
      },
    }).catch(() => null)
  }

  console.log('✓ Demo patient "Patricia Martinez" created with full clinical data')
  console.log('\n🎉 Seed complete!')
  console.log('\nLogin credentials:')
  console.log('  Dr.Stent.Strimmer@gmail.com / HTNpilot2026!')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
