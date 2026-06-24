import { NextRequest } from 'next/server'
import db from '@/lib/db'
import { withAuth, ok, error } from '@/lib/api-middleware'
import { requireRole, auditLog } from '@/lib/auth'
import { runFullClinicalAssessment, GUIDELINE_VERSION } from '@/engine'
import { runClinicalAiAgent } from '@/engine/ai/agent'
import type { PatientProfile, BpSummary, MedicationSummary, LabSummary, ImagingSummary, ComorbiditySummary } from '@/engine/types'

// POST /api/assessment/[workupId] — trigger AI assessment
export const POST = withAuth(async (req, auth, params) => {
  try {
    requireRole(auth.role, 'COORDINATOR')

    const workupId = params?.workupId
    if (!workupId) return error({ statusCode: 400, message: 'workupId required' })

    // Load full workup + patient data
    const workup = await db.htnWorkup.findUnique({
      where: { id: workupId },
      include: {
        referral: {
          include: {
            patient: {
              include: {
                bpReadings: { orderBy: { readingDate: 'desc' }, take: 20 },
                medications: { where: { isActive: true } },
                labResults: { orderBy: { labDate: 'desc' } },
                imagingStudies: { orderBy: { studyDate: 'desc' } },
                comorbidities: { where: { isActive: true } },
              },
            },
            screening: true,
          },
        },
      },
    })

    if (!workup) return error({ statusCode: 404, message: 'Workup not found' })
    if (workup.referral.patient.tenantId !== auth.tenantId) {
      return error({ statusCode: 403, message: 'Access denied' })
    }

    const patient = workup.referral.patient

    // Build PatientProfile from DB data
    const profile = buildPatientProfile(patient, workup)

    // 1. Run deterministic clinical engine
    const deterministicResult = runFullClinicalAssessment(profile)

    // 2. Run AI agent (Claude)
    let aiResult = null
    const tenant = await db.tenant.findUnique({ where: { id: auth.tenantId } })

    if (tenant?.aiAssessmentsEnabled && process.env['ANTHROPIC_API_KEY']) {
      try {
        aiResult = await runClinicalAiAgent({
          patient: profile,
          deterministicResult,
          guidelineVersion: GUIDELINE_VERSION,
        })
      } catch (aiError) {
        console.error('AI agent error (using deterministic only):', aiError)
      }
    }

    // 3. Store assessment
    const assessment = await db.clinicalAssessment.upsert({
      where: { workupId },
      create: {
        workupId,
        guidelineSetId: 'current',
        guidelineVersion: GUIDELINE_VERSION,
        htnStage: deterministicResult.classification.classification as never,
        resistantHtnConfirmed: deterministicResult.classification.resistanceCategory === 'TRUE_RESISTANT',
        refractoryHtnConfirmed: deterministicResult.classification.resistanceCategory === 'REFRACTORY',
        cvRiskCategory: deterministicResult.cvRisk.category as never,
        secondaryCausesIdentified: deterministicResult.secondaryHtnFlags as never,
        bpTargetSbp: deterministicResult.managementProtocol.bpTarget.targetSbp,
        bpTargetDbp: deterministicResult.managementProtocol.bpTarget.targetDbp,
        bpTargetRationale: deterministicResult.managementProtocol.bpTarget.rationale,
        managementPhase: deterministicResult.managementProtocol.recommendedPhase as never,
        lifestyleRecommendations: deterministicResult.managementProtocol.lifestyleInterventions as never,
        medicationGaps: deterministicResult.managementProtocol.medicationSteps as never,
        rdnEligible: deterministicResult.invasiveTherapy.rdnEligibility.eligible,
        rdnEligibilityDetails: deterministicResult.invasiveTherapy.rdnEligibility as never,
        stentingEligible: deterministicResult.invasiveTherapy.stentingEligibility.eligible,
        stentingEligibilityDetails: deterministicResult.invasiveTherapy.stentingEligibility as never,
        ptaEligible: deterministicResult.invasiveTherapy.ptaEligibility.eligible,
        ptaEligibilityDetails: deterministicResult.invasiveTherapy.ptaEligibility as never,
        urgencyFlags: deterministicResult.urgentFlags as never,
        guidelinesUsed: deterministicResult.guidelineVersion as never,
        // AI augmentation
        clinicalSummary: aiResult?.clinicalSummary,
        keyFindings: aiResult?.keyFindings as never,
        recommendations: aiResult?.structuredRecommendations as never,
        aiModel: aiResult?.modelUsed,
        aiTokensUsed: aiResult?.tokensUsed,
        confidenceScore: aiResult?.confidenceScore,
      },
      update: {
        guidelineVersion: GUIDELINE_VERSION,
        htnStage: deterministicResult.classification.classification as never,
        resistantHtnConfirmed: deterministicResult.classification.resistanceCategory === 'TRUE_RESISTANT',
        refractoryHtnConfirmed: deterministicResult.classification.resistanceCategory === 'REFRACTORY',
        cvRiskCategory: deterministicResult.cvRisk.category as never,
        bpTargetSbp: deterministicResult.managementProtocol.bpTarget.targetSbp,
        bpTargetDbp: deterministicResult.managementProtocol.bpTarget.targetDbp,
        rdnEligible: deterministicResult.invasiveTherapy.rdnEligibility.eligible,
        stentingEligible: deterministicResult.invasiveTherapy.stentingEligibility.eligible,
        ptaEligible: deterministicResult.invasiveTherapy.ptaEligibility.eligible,
        clinicalSummary: aiResult?.clinicalSummary,
        keyFindings: aiResult?.keyFindings as never,
        recommendations: aiResult?.structuredRecommendations as never,
        aiModel: aiResult?.modelUsed,
        assessedAt: new Date(),
      },
    })

    await auditLog({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: 'ASSESSMENT_TRIGGERED',
      resource: 'clinical_assessment',
      resourceId: assessment.id,
      req,
    })

    // Update referral status
    await db.referral.update({
      where: { id: workup.referralId },
      data: { status: 'PHYSICIAN_REVIEW' },
    })

    return ok({
      assessmentId: assessment.id,
      deterministicResult,
      aiAugmented: aiResult !== null,
      summary: aiResult?.clinicalSummary ?? buildFallbackSummary(deterministicResult),
    })
  } catch (err) {
    return error(err)
  }
})

// GET /api/assessment/[workupId] — get existing assessment
export const GET = withAuth(async (req, auth, params) => {
  try {
    const workupId = params?.workupId
    if (!workupId) return error({ statusCode: 400, message: 'workupId required' })

    const assessment = await db.clinicalAssessment.findUnique({
      where: { workupId },
      include: {
        therapyRecommendations: true,
        managementPlan: true,
        workup: {
          include: {
            referral: {
              include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } },
            },
          },
        },
      },
    })

    if (!assessment) return error({ statusCode: 404, message: 'Assessment not found' })

    return ok(assessment)
  } catch (err) {
    return error(err)
  }
})

// ─── Build PatientProfile from DB records ─────────────────────────────────────

function buildPatientProfile(patient: any, workup: any): PatientProfile {
  const now = new Date()
  const dob = new Date(patient.dateOfBirth)
  const age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  // BP Summary
  const readings = patient.bpReadings ?? []
  const officeReadings = readings.filter((r: any) => r.readingType === 'OFFICE')
  const homeReadings = readings.filter((r: any) => r.readingType === 'HOME')
  const abpmDay = readings.filter((r: any) => r.readingType === 'AMBULATORY_DAYTIME')

  const avg = (arr: any[], key: string) =>
    arr.length > 0 ? arr.reduce((sum: number, r: any) => sum + r[key], 0) / arr.length : undefined

  const bp: BpSummary = {
    avgOfficeSbp: avg(officeReadings, 'sbp'),
    avgOfficeDbp: avg(officeReadings, 'dbp'),
    avgHomeSbp: avg(homeReadings, 'sbp'),
    avgHomeDbp: avg(homeReadings, 'dbp'),
    avgAbpmDaySbp: avg(abpmDay, 'sbp'),
    avgAbpmDayDbp: avg(abpmDay, 'dbp'),
    abpmPerformed: abpmDay.length > 0,
  }

  // Medication Summary
  const meds = patient.medications ?? []
  const activeMeds = meds.filter((m: any) => m.isActive)
  const drugClasses = [...new Set(activeMeds.map((m: any) => m.drugClass).filter(Boolean))] as string[]

  const hasDrugClass = (classes: string[]) =>
    drugClasses.some(dc => classes.includes(dc))

  const medications: MedicationSummary = {
    totalActive: activeMeds.length,
    antihypertensiveCount: activeMeds.filter((m: any) => m.drugClass).length,
    drugClasses,
    onThiazideLike: hasDrugClass(['THIAZIDE_LIKE_DIURETIC']),
    onThiazide: hasDrugClass(['THIAZIDE_DIURETIC', 'THIAZIDE_LIKE_DIURETIC']),
    onAnyDiuretic: hasDrugClass(['THIAZIDE_DIURETIC', 'THIAZIDE_LIKE_DIURETIC', 'LOOP_DIURETIC', 'POTASSIUM_SPARING_DIURETIC', 'MINERALOCORTICOID_ANTAGONIST']),
    onAce: hasDrugClass(['ACE_INHIBITOR']),
    onArb: hasDrugClass(['ARB', 'ARNI']),
    onCcb: hasDrugClass(['CALCIUM_CHANNEL_BLOCKER_DHP', 'CALCIUM_CHANNEL_BLOCKER_NDHP']),
    onMineralocorticoidAntagonist: hasDrugClass(['MINERALOCORTICOID_ANTAGONIST']),
    onBetaBlocker: hasDrugClass(['BETA_BLOCKER']),
    onAlphaBlocker: hasDrugClass(['ALPHA_BLOCKER']),
    onDirectVasodilator: hasDrugClass(['DIRECT_VASODILATOR']),
    onCentralActing: hasDrugClass(['CENTRAL_ALPHA_AGONIST']),
    medicationsAtMaxDose: activeMeds.filter((m: any) => m.isAtMaxDose).map((m: any) => m.genericName),
    adherenceConfirmed: activeMeds.some((m: any) => m.adherence === 'ADHERENT'),
  }

  // Lab Summary
  const labs = patient.labResults ?? []
  const getLatestLab = (type: string) => {
    const lab = labs.filter((l: any) => l.labType === type).sort((a: any, b: any) =>
      new Date(b.labDate).getTime() - new Date(a.labDate).getTime()
    )[0]
    return lab?.numericValue
  }

  const labSummary: LabSummary = {
    creatinine: getLatestLab('CREATININE'),
    egfr: getLatestLab('EGFR'),
    potassium: getLatestLab('POTASSIUM'),
    sodium: getLatestLab('SODIUM'),
    aldosterone: getLatestLab('PLASMA_ALDOSTERONE'),
    reninActivity: getLatestLab('PLASMA_RENIN_ACTIVITY'),
    reninDirect: getLatestLab('PLASMA_RENIN_DIRECT'),
    aldosteroneReninRatio: getLatestLab('ALDOSTERONE_RENIN_RATIO'),
    plasmaMeta: getLatestLab('PLASMA_METANEPHRINES'),
    plasmaNormeta: getLatestLab('PLASMA_NORMETANEPHRINES'),
    tsh: getLatestLab('TSH'),
    morningCortisol: getLatestLab('CORTISOL_AM'),
    albuminCreatinineRatio: getLatestLab('URINE_ALBUMIN_CREATININE_RATIO'),
    hba1c: getLatestLab('HBA1C'),
    totalCholesterol: getLatestLab('TOTAL_CHOLESTEROL'),
    ldl: getLatestLab('LDL_CHOLESTEROL'),
    hdl: getLatestLab('HDL_CHOLESTEROL'),
    triglycerides: getLatestLab('TRIGLYCERIDES'),
  }

  // Imaging Summary
  const imaging = patient.imagingStudies ?? []
  const getLatestImaging = (type: string) =>
    imaging.filter((i: any) => i.studyType === type).sort((a: any, b: any) =>
      new Date(b.studyDate).getTime() - new Date(a.studyDate).getTime()
    )[0]

  const renalDuplex = getLatestImaging('RENAL_DUPLEX_ULTRASOUND')
  const cta = getLatestImaging('CTA_RENAL_ARTERIES')
  const mra = getLatestImaging('MRA_RENAL_ARTERIES')
  const angio = getLatestImaging('RENAL_ANGIOGRAM')
  const echo = getLatestImaging('ECHOCARDIOGRAM_TTE')

  const bestRenalImaging = angio ?? cta ?? mra ?? renalDuplex

  const maxStenosis = bestRenalImaging
    ? Math.max(bestRenalImaging.stenosisPercentLeft ?? 0, bestRenalImaging.stenosisPercentRight ?? 0)
    : undefined

  const imagingSummary: ImagingSummary = {
    renalDuplexDone: !!renalDuplex,
    ctaOrMraDone: !!(cta ?? mra),
    maxStenosisPercent: maxStenosis && maxStenosis > 0 ? maxStenosis : undefined,
    stenosisSide: bestRenalImaging?.stenosisPercentLeft && bestRenalImaging?.stenosisPercentRight
      ? 'BILATERAL'
      : bestRenalImaging?.stenosisPercentLeft ? 'LEFT'
      : bestRenalImaging?.stenosisPercentRight ? 'RIGHT'
      : undefined,
    renalArteryLength: workup.renalArteryLength ?? bestRenalImaging?.renalArteryLengthLeft,
    renalArteryDiameter: workup.renalArteryDiameter ?? bestRenalImaging?.renalArteryDiamLeft,
    accessoryArteries: !!(bestRenalImaging?.accessoryArteriesLeft || bestRenalImaging?.accessoryArteriesRight),
    echoEf: echo?.lvEjectionFraction,
    echoLvmi: echo?.lvMassIndex,
    lvh: !!(echo?.lvMassIndex && echo.lvMassIndex > 115),
  }

  // Comorbidities
  const comorbs = patient.comorbidities ?? []
  const hasCondition = (conditions: string[]) =>
    comorbs.some((c: any) => conditions.includes(c.condition) && c.isActive)

  const comorbidities: ComorbiditySummary = {
    hasDiabetes: hasCondition(['DIABETES_TYPE1', 'DIABETES_TYPE2', 'PREDIABETES']),
    hasCkd: hasCondition(['CHRONIC_KIDNEY_DISEASE', 'END_STAGE_RENAL_DISEASE']),
    ckdStage: comorbs.find((c: any) => c.condition === 'CHRONIC_KIDNEY_DISEASE')?.severity,
    hasHeartFailure: hasCondition(['HEART_FAILURE_PRESERVED_EF', 'HEART_FAILURE_REDUCED_EF']),
    hasCoronaryArteryDisease: hasCondition(['CORONARY_ARTERY_DISEASE', 'MYOCARDIAL_INFARCTION_HISTORY']),
    hasStrokeOrTia: hasCondition(['STROKE_ISCHEMIC', 'TIA']),
    hasAtrialFibrillation: hasCondition(['ATRIAL_FIBRILLATION']),
    hasPeripheralArteryDisease: hasCondition(['PERIPHERAL_ARTERY_DISEASE']),
    hasSleepApnea: hasCondition(['OBSTRUCTIVE_SLEEP_APNEA']),
    hasObesity: hasCondition(['OBESITY']),
    hasPrimaryAldosteronism: hasCondition(['PRIMARY_ALDOSTERONISM']),
    hasRenovascularHtn: hasCondition(['RENOVASCULAR_HYPERTENSION']),
    hasPheochromocytoma: hasCondition(['PHEOCHROMOCYTOMA', 'PARAGANGLIOMA']),
    hasCushings: hasCondition(['CUSHINGS_SYNDROME']),
    hasCoarctation: hasCondition(['COARCTATION_OF_AORTA']),
    hasThyroidDisease: hasCondition(['HYPOTHYROIDISM', 'HYPERTHYROIDISM']),
    isPregnant: hasCondition(['PREGNANCY_RELATED_HTN']),
    priorCvEvent: hasCondition(['MYOCARDIAL_INFARCTION_HISTORY', 'STROKE_ISCHEMIC', 'PERIPHERAL_ARTERY_DISEASE', 'CORONARY_ARTERY_DISEASE']),
  }

  return {
    id: patient.id,
    age,
    sex: patient.sex,
    bmi: workup.bmi,
    bp,
    medications,
    labs: labSummary,
    imaging: imagingSummary,
    comorbidities,
    smokingStatus: workup.smokingStatus,
    alcoholDrinksPerWeek: workup.alcoholDrinksPerWeek,
    physicalActivityMinWk: workup.physicalActivityMinWk,
    dietaryNaclGDay: workup.dietaryNaclGDay,
    workupComplete: workup.workupStatus === 'COMPLETE',
  }
}

function buildFallbackSummary(result: any): string {
  return `HTN Classification: ${result.classification.classification}. ` +
    `Resistance status: ${result.classification.resistanceCategory}. ` +
    `CV Risk: ${result.cvRisk.category}. ` +
    `BP Target: <${result.managementProtocol.bpTarget.targetSbp}/${result.managementProtocol.bpTarget.targetDbp} mmHg. ` +
    `RDN eligible: ${result.invasiveTherapy.rdnEligibility.eligible ? 'Yes' : 'No'}. ` +
    `Physician review required.`
}
