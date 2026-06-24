// ─── HTN Pilot Clinical Engine — Main Entry Point ────────────────────────────
// Orchestrates: screening → classification → risk → management → eligibility

import type {
  PatientProfile,
  HtnClassificationResult,
  FullAssessmentResult,
  ManagementProtocolResult,
  SecondaryHtnFlag,
} from './types'

import {
  classifyBpAccAha,
  assessResistantHtn,
  getBpTargetAccAha,
  getLifestyleInterventions,
  getMedicationStepsAccAha,
  calculateCvRiskAccAha,
  ACC_AHA_VERSION,
} from './guidelines/acc-aha-2023'

import {
  getBpTargetEsc,
  getMedicationStepsEsc,
  getCvRiskEsc,
  assessResistantHtnEsc,
  ESC_VERSION,
} from './guidelines/esc-2024'

import { assessRdnEligibility } from './eligibility/rdn'
import { assessStentingEligibility } from './eligibility/stenting'
import { assessPtaEligibility } from './eligibility/pta'

export const GUIDELINE_VERSION = `${ACC_AHA_VERSION} + ${ESC_VERSION}` as const

// ─── Main Assessment Orchestrator ────────────────────────────────────────────

export function runFullClinicalAssessment(profile: PatientProfile): FullAssessmentResult {
  // 1. Classify HTN
  const classification = classifyHypertension(profile)

  // 2. CV Risk
  const cvRisk = calculateCvRiskAccAha(profile)
  const cvRiskEsc = getCvRiskEsc(profile)
  // Use higher risk category (conservative approach)
  const riskCategories = ['LOW', 'BORDERLINE', 'INTERMEDIATE', 'HIGH', 'VERY_HIGH']
  const finalRisk = riskCategories.indexOf(cvRisk.category) >= riskCategories.indexOf(cvRiskEsc.category)
    ? cvRisk
    : cvRiskEsc

  // 3. Secondary HTN flags
  const secondaryHtnFlags = identifySecondaryHtnFlags(profile)

  // 4. Management protocol
  const managementProtocol = buildManagementProtocol(profile, classification, finalRisk)

  // 5. Invasive therapy eligibility
  const rdnEligibility = assessRdnEligibility(profile, classification)
  const stentingEligibility = assessStentingEligibility(profile)
  const ptaEligibility = assessPtaEligibility(profile)

  // 6. Urgent flags
  const urgentFlags = identifyUrgentFlags(profile, classification)

  return {
    classification,
    cvRisk: finalRisk,
    secondaryHtnFlags,
    managementProtocol,
    invasiveTherapy: {
      rdnEligibility,
      stentingEligibility,
      ptaEligibility,
    },
    urgentFlags,
    guidelineVersion: GUIDELINE_VERSION,
    assessedAt: new Date(),
  }
}

// ─── HTN Classification ───────────────────────────────────────────────────────

function classifyHypertension(profile: PatientProfile): HtnClassificationResult {
  const bp = profile.bp

  // Determine best BP value to use (priority: ABPM > Home > Office)
  let clinicalSbp: number
  let clinicalDbp: number
  let bpSource: 'AMBULATORY' | 'HOME' | 'OFFICE' | 'AVERAGE'

  if (bp.abpmPerformed && bp.avgAbpmDaySbp && bp.avgAbpmDayDbp) {
    clinicalSbp = bp.avgAbpmDaySbp
    clinicalDbp = bp.avgAbpmDayDbp
    bpSource = 'AMBULATORY'
  } else if (bp.avgHomeSbp && bp.avgHomeDbp) {
    clinicalSbp = bp.avgHomeSbp
    clinicalDbp = bp.avgHomeDbp
    bpSource = 'HOME'
  } else if (bp.avgOfficeSbp && bp.avgOfficeDbp) {
    clinicalSbp = bp.avgOfficeSbp
    clinicalDbp = bp.avgOfficeDbp
    bpSource = 'OFFICE'
  } else {
    return {
      classification: 'STAGE_1',
      resistanceCategory: 'NOT_RESISTANT',
      criteriaMetFor: ['Insufficient BP data — defaulting to Stage 1 pending more readings'],
      criteriaNotMet: [],
      clinicalBpValue: { sbp: 0, dbp: 0 },
      bpSource: 'OFFICE',
    }
  }

  const classification = classifyBpAccAha(clinicalSbp, clinicalDbp) as HtnClassificationResult['classification']

  // Resistance assessment
  const accResistance = assessResistantHtn(profile)
  const escResistance = assessResistantHtnEsc(profile)

  let resistanceCategory: HtnClassificationResult['resistanceCategory']
  if (accResistance.isRefractory) {
    resistanceCategory = 'REFRACTORY'
  } else if (accResistance.isResistant || escResistance.isResistant) {
    resistanceCategory = 'TRUE_RESISTANT'
  } else if (accResistance.isPseudoresistant) {
    resistanceCategory = 'POSSIBLE_RESISTANT'
  } else {
    resistanceCategory = 'NOT_RESISTANT'
  }

  return {
    classification,
    resistanceCategory,
    criteriaMetFor: accResistance.criteria,
    criteriaNotMet: accResistance.missing,
    clinicalBpValue: { sbp: clinicalSbp, dbp: clinicalDbp },
    bpSource,
  }
}

// ─── Management Protocol Builder ─────────────────────────────────────────────

function buildManagementProtocol(
  profile: PatientProfile,
  classification: HtnClassificationResult,
  cvRisk: ReturnType<typeof calculateCvRiskAccAha>,
): ManagementProtocolResult {
  const meds = profile.medications

  // Determine management phase
  let phase: string
  const isHighRisk = ['HIGH', 'VERY_HIGH'].includes(cvRisk.category)
  const isStage2 = ['STAGE_2', 'HYPERTENSIVE_CRISIS'].includes(classification.classification)
  const isResistant = ['TRUE_RESISTANT', 'REFRACTORY'].includes(classification.resistanceCategory)

  if (classification.classification === 'ELEVATED' && !isHighRisk) {
    phase = 'LIFESTYLE_ONLY'
  } else if (classification.classification === 'STAGE_1' && !isHighRisk) {
    phase = 'LIFESTYLE_ONLY'
  } else if (meds.antihypertensiveCount === 0) {
    phase = isStage2 ? 'DUAL_THERAPY' : 'MONOTHERAPY'
  } else if (meds.antihypertensiveCount === 1) {
    phase = 'DUAL_THERAPY'
  } else if (meds.antihypertensiveCount === 2) {
    phase = 'TRIPLE_THERAPY'
  } else if (meds.antihypertensiveCount === 3 && !meds.onMineralocorticoidAntagonist) {
    phase = 'QUADRUPLE_THERAPY'
  } else if (isResistant) {
    phase = 'INVASIVE_EVALUATION'
  } else {
    phase = 'QUADRUPLE_THERAPY'
  }

  // BP Target (use ACC/AHA as primary, note ESC alignment)
  const bpTarget = getBpTargetAccAha(profile)
  const escTarget = getBpTargetEsc(profile)

  // If targets differ, note the discrepancy
  if (bpTarget.targetSbp !== escTarget.targetSbp) {
    bpTarget.rationale += ` (Note: ESC 2024 target is ${escTarget.targetSbp}/${escTarget.targetDbp} mmHg)`
  }

  // Lifestyle interventions
  const lifestyleInterventions = getLifestyleInterventions(profile)

  // Medication steps — use ACC/AHA as primary, note ESC preferences
  const accSteps = getMedicationStepsAccAha(profile, classification)
  const escSteps = getMedicationStepsEsc(profile)

  // Merge: use ACC/AHA steps, annotate where ESC differs (e.g., SPC preference)
  const mergedSteps = accSteps.map((step, i) => {
    const escStep = escSteps[i]
    if (escStep && JSON.stringify(escStep.preferredAgents) !== JSON.stringify(step.preferredAgents)) {
      return {
        ...step,
        notes: `ESC 2024 preference: ${escStep.preferredAgents[0]}`,
      }
    }
    return step
  })

  // Current step assessment
  const currentStep = Math.min(meds.antihypertensiveCount, mergedSteps.length)
  const nextStep = currentStep < mergedSteps.length ? currentStep + 1 : undefined

  // Monitoring plan
  const monitoringPlan = {
    bpCheckIntervalWeeks: isResistant ? 2 : isStage2 ? 4 : 8,
    labsNeeded: buildLabMonitoringList(profile, meds),
    labIntervalMonths: meds.onMineralocorticoidAntagonist ? 1 : 6,
  }

  // Special considerations
  const specialConsiderations = buildSpecialConsiderations(profile, classification)

  return {
    recommendedPhase: phase,
    bpTarget,
    lifestyleInterventions: lifestyleInterventions.filter(i => i.applicable),
    medicationSteps: mergedSteps,
    currentStepAssessment: {
      currentStep,
      nextStep,
      nextStepRationale: nextStep ? mergedSteps[nextStep - 1]?.rationale : undefined,
      isAtMaxStep: nextStep === undefined,
    },
    monitoringPlan,
    specialConsiderations,
  }
}

function buildLabMonitoringList(
  profile: PatientProfile,
  meds: PatientProfile['medications'],
): string[] {
  const labs: string[] = ['BMP (electrolytes, creatinine, eGFR)']

  if (meds.onMineralocorticoidAntagonist || meds.onAce || meds.onArb) {
    labs.push('Potassium (hyperkalemia risk with RAAS + MRA)')
  }
  if (meds.onDirectVasodilator) {
    labs.push('CBC, ANA (hydralazine-associated lupus risk)')
  }
  if (profile.comorbidities.hasDiabetes) {
    labs.push('HbA1c (quarterly)')
    labs.push('Urine albumin-creatinine ratio (annually)')
  }
  if (profile.comorbidities.hasCkd) {
    labs.push('eGFR + proteinuria (every 3-6 months per KDIGO)')
  }
  if (profile.labs.aldosteroneReninRatio && profile.labs.aldosteroneReninRatio >= 30) {
    labs.push('Repeat aldosterone + renin (primary aldosteronism follow-up)')
  }

  return labs
}

function buildSpecialConsiderations(
  profile: PatientProfile,
  classification: HtnClassificationResult,
): string[] {
  const considerations: string[] = []
  const comorbidities = profile.comorbidities

  if (comorbidities.hasSleepApnea) {
    considerations.push('OSA: Ensure CPAP therapy is initiated and adherent — untreated OSA significantly limits BP control')
  }

  if (comorbidities.hasPrimaryAldosteronism) {
    considerations.push('Primary Aldosteronism: Confirm with adrenal vein sampling; unilateral disease → adrenalectomy (curative); bilateral → spironolactone/eplerenone long-term')
  }

  if (comorbidities.hasRenovascularHtn) {
    considerations.push('Renovascular HTN: Evaluate for renal artery stenting or PTA — see eligibility assessment below')
  }

  if (comorbidities.hasDiabetes && (profile.labs.egfr ?? 60) >= 25) {
    considerations.push('Diabetic nephropathy: SGLT2 inhibitor (empagliflozin, dapagliflozin) and GLP-1 RA have additive BP and cardiorenal protective effects — coordinate with endocrinology')
  }

  if (classification.resistanceCategory === 'REFRACTORY') {
    considerations.push('Refractory HTN (uncontrolled on ≥5 agents + MRA + diuretic): This patient is a strong candidate for invasive therapy evaluation (RDN, device-based therapy). Ensure referral is expedited.')
  }

  if (comorbidities.isPregnant) {
    considerations.push('PREGNANCY: Use methyldopa, nifedipine, or labetalol. AVOID ACE inhibitors, ARBs, direct renin inhibitors, MRAs (all contraindicated in pregnancy). Immediate obstetric co-management required.')
  }

  if ((profile.labs.egfr ?? 60) < 30) {
    considerations.push('Severe CKD (eGFR <30): Loop diuretic preferred over thiazide-like. Avoid NSAIDs. Dose adjust RAAS agents carefully. Nephrology co-management.')
  }

  return considerations
}

// ─── Secondary HTN Flags ──────────────────────────────────────────────────────

function identifySecondaryHtnFlags(profile: PatientProfile): SecondaryHtnFlag[] {
  const flags: SecondaryHtnFlag[] = []
  const labs = profile.labs
  const comorbidities = profile.comorbidities

  // 1. Primary Aldosteronism — most common (5-20% of resistant HTN)
  const arr = labs.aldosteroneReninRatio
  if (arr && arr >= 30) {
    flags.push({
      condition: 'Primary Aldosteronism',
      likelihoodOfSecondary: arr >= 50 ? 'HIGH' : 'MODERATE',
      supportingEvidence: [
        `Aldosterone-renin ratio: ${arr.toFixed(1)} ng/dL per ng/mL/h (threshold ≥30)`,
        arr >= 50 ? 'Markedly elevated ARR — strong suspicion' : 'Elevated ARR — confirmatory testing needed',
        ...(profile.labs.potassium && profile.labs.potassium < 3.5 ? ['Hypokalemia present (supports aldosteronism)'] : []),
      ],
      recommendedWorkup: [
        'Confirmatory testing: sodium loading (oral or IV) or fludrocortisone suppression test',
        'Adrenal CT (bilateral adrenal evaluation)',
        'Adrenal vein sampling (if CT non-diagnostic or surgical candidacy being evaluated)',
        'Endocrinology referral',
      ],
      urgency: 'ROUTINE',
    })
  } else if (!arr) {
    flags.push({
      condition: 'Primary Aldosteronism (screening not yet done)',
      likelihoodOfSecondary: 'MODERATE',
      supportingEvidence: [
        'ACC/AHA & ESC recommend screening all resistant HTN patients for primary aldosteronism',
        'Prevalence in resistant HTN: ~20-30%',
      ],
      recommendedWorkup: [
        'Morning plasma aldosterone + renin (off interfering medications if possible)',
        'Discontinue: MRA, amiloride (4 weeks); beta-blocker, diuretics (2 weeks) if feasible',
        'Potassium supplementation if hypokalemic before testing',
      ],
      urgency: 'ROUTINE',
    })
  }

  // 2. Renovascular HTN / Renal Artery Stenosis
  const stenosis = profile.imaging.maxStenosisPercent
  const clinicalClues =
    comorbidities.hasCkd ||
    (profile.labs.egfr !== undefined && profile.labs.egfr < 60) ||
    comorbidities.hasPeripheralArteryDisease

  if (stenosis && stenosis >= 50) {
    flags.push({
      condition: 'Renovascular Hypertension (Renal Artery Stenosis)',
      likelihoodOfSecondary: stenosis >= 70 ? 'HIGH' : 'MODERATE',
      supportingEvidence: [
        `Renal artery stenosis: ${stenosis}% on imaging`,
        stenosis >= 70 ? 'Hemodynamically significant stenosis — likely contributing to HTN' : 'Moderate stenosis — functional significance uncertain',
        ...(clinicalClues ? ['Associated CKD or PAD — increases likelihood of atherosclerotic RAS'] : []),
      ],
      recommendedWorkup: [
        'CTA or MRA renal arteries for anatomical detail',
        'Renal function correlation (creatinine trend, split renal function if captopril renogram available)',
        'Consider renal artery stenting evaluation — see eligibility assessment',
        'Interventional cardiology / vascular surgery referral',
      ],
      urgency: stenosis >= 70 ? 'URGENT' : 'ROUTINE',
    })
  } else if (!profile.imaging.renalDuplexDone && profile.medications.antihypertensiveCount >= 2) {
    flags.push({
      condition: 'Renovascular HTN (screening not performed)',
      likelihoodOfSecondary: 'LOW',
      supportingEvidence: [
        'Renal duplex ultrasound not documented',
        'Consider RAS screening if: onset <30 or >55, abdominal bruit, worsening CKD on RAAS therapy, asymmetric renal size',
      ],
      recommendedWorkup: ['Renal duplex ultrasound (first-line screening, non-invasive)'],
      urgency: 'ROUTINE',
    })
  }

  // 3. Obstructive Sleep Apnea
  if (comorbidities.hasSleepApnea && !profile.comorbidities.hasSleepApnea) {
    flags.push({
      condition: 'Obstructive Sleep Apnea',
      likelihoodOfSecondary: 'MODERATE',
      supportingEvidence: [
        'OSA present in ~30-83% of resistant HTN patients (Pedrosa et al.)',
        'Nocturnal hypoxia → sympathetic activation → BP surges',
        profile.bmi && profile.bmi >= 30 ? 'Obesity (BMI ≥30) — major OSA risk factor' : '',
      ].filter(Boolean),
      recommendedWorkup: ['STOP-BANG questionnaire', 'Overnight polysomnography (PSG) or home sleep apnea test (HSAT)', 'CPAP titration if AHI ≥15/hr'],
      urgency: 'ROUTINE',
    })
  }

  // 4. Pheochromocytoma/Paraganglioma
  if (labs.plasmaMeta && labs.plasmaMeta >= 0.5) {
    flags.push({
      condition: 'Pheochromocytoma / Paraganglioma',
      likelihoodOfSecondary: labs.plasmaMeta >= 2.0 ? 'HIGH' : 'MODERATE',
      supportingEvidence: [
        `Plasma metanephrines elevated: ${labs.plasmaMeta} nmol/L (threshold 0.5)`,
        'Classic triad: headache, sweating, palpitations — inquire if episodic',
      ],
      recommendedWorkup: [
        '24-hour urine catecholamines and metanephrines (confirmatory)',
        'Adrenal CT/MRI (localization)',
        'MIBG scan or PET if CT negative but high suspicion',
        'Endocrinology referral (mandatory before any procedure or surgery)',
        'Alpha-blockade BEFORE beta-blockade if confirmed (phenoxybenzamine 10-40mg)',
      ],
      urgency: 'URGENT',
    })
  }

  // 5. Cushing's Syndrome
  if (labs.morningCortisol && labs.morningCortisol >= 1.8) {
    flags.push({
      condition: "Cushing's Syndrome",
      likelihoodOfSecondary: 'MODERATE',
      supportingEvidence: [
        `Elevated morning cortisol after dexamethasone suppression (${labs.morningCortisol} mcg/dL — threshold 1.8)`,
      ],
      recommendedWorkup: [
        '24-hour urine free cortisol',
        'Late-night salivary cortisol (×2)',
        'ACTH level (to determine ACTH-dependent vs. independent)',
        'Pituitary MRI or adrenal CT based on ACTH result',
        'Endocrinology referral',
      ],
      urgency: 'ROUTINE',
    })
  }

  // 6. Thyroid Disease
  if (labs.tsh !== undefined && (labs.tsh > 4.5 || labs.tsh < 0.4)) {
    flags.push({
      condition: labs.tsh > 4.5 ? 'Hypothyroidism' : 'Hyperthyroidism',
      likelihoodOfSecondary: 'MODERATE',
      supportingEvidence: [
        `TSH: ${labs.tsh} mU/L (abnormal)`,
        labs.tsh > 4.5
          ? 'Hypothyroidism causes diastolic HTN via increased peripheral resistance'
          : 'Hyperthyroidism causes systolic HTN via increased cardiac output',
      ],
      recommendedWorkup: ['Free T4, Free T3', 'Thyroid antibodies (if hypothyroid)', 'Endocrinology referral', 'Treat thyroid condition — may significantly improve BP'],
      urgency: 'ROUTINE',
    })
  }

  return flags
}

// ─── Urgent Flags ─────────────────────────────────────────────────────────────

function identifyUrgentFlags(
  profile: PatientProfile,
  classification: HtnClassificationResult,
): string[] {
  const flags: string[] = []
  const bp = classification.clinicalBpValue

  if (bp.sbp > 180 || bp.dbp > 120) {
    flags.push(`HYPERTENSIVE CRISIS: BP ${bp.sbp}/${bp.dbp} mmHg — assess for end-organ damage (AKI, encephalopathy, aortic dissection, STEMI). If symptomatic → emergency (hypertensive emergency). If asymptomatic → hypertensive urgency (oral agents, close follow-up within 24-48h).`)
  }

  if (profile.comorbidities.isPregnant) {
    flags.push('PREGNANCY: Preeclampsia/eclampsia risk — immediate obstetric evaluation. Avoid ACE inhibitors, ARBs, renin inhibitors (teratogenic).')
  }

  const labs = profile.labs
  if (labs.plasmaMeta && labs.plasmaMeta >= 2.0) {
    flags.push('Markedly elevated plasma metanephrines — high suspicion pheochromocytoma. Initiate alpha-blockade BEFORE any procedure. Avoid beta-blockers until alpha-blocked.')
  }

  if (labs.potassium !== undefined && labs.potassium < 3.0) {
    flags.push(`Severe hypokalemia (K+ ${labs.potassium} mEq/L) — replete urgently. Primary aldosteronism likely. Avoid adding loop diuretics.`)
  }

  if (labs.egfr !== undefined && labs.egfr < 15) {
    flags.push(`Severely reduced eGFR (${labs.egfr} mL/min/1.73m²) — urgent nephrology referral. Avoid nephrotoxic agents. Dose-adjust all renal-cleared medications.`)
  }

  if (classification.resistanceCategory === 'REFRACTORY') {
    flags.push('REFRACTORY HYPERTENSION: BP uncontrolled on ≥5 agents including MRA and diuretic — escalate to invasive therapy evaluation on urgent basis.')
  }

  return flags
}
