// ─── ACC/AHA Hypertension Guidelines ─────────────────────────────────────────
// Primary source: 2018 ACC/AHA/AAPA/ABC/ACPM/AGS/APhA/ASH/ASPC/NMA/PCNA
// Guideline for the Prevention, Detection, Evaluation, and Management of
// High Blood Pressure in Adults (Whelton PK et al., JACC 2018;71:e127-e248)
//
// Updated with:
// - 2018 ACC/AHA Scientific Statement: Resistant Hypertension
// - 2023 ACC/AHA Chronic Coronary Disease Guideline (BP targets)
// - 2024 ACC/AHA Hypertension Focused Update (when applicable)
// - AHA/ACC/HFSA 2022 Heart Failure Guideline
// - KDIGO 2021 CKD Guideline (BP targets in CKD)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PatientProfile,
  HtnClassificationResult,
  BpTarget,
  CvRiskResult,
  ManagementProtocolResult,
  GuidelineRef,
  LifestyleIntervention,
  MedicationStep,
} from '../types'

export const ACC_AHA_VERSION = 'ACC/AHA-2018+2023' as const

const REF_MAIN: GuidelineRef = {
  society: 'ACC/AHA',
  year: 2018,
  section: 'Whelton et al. JACC 2018;71:e127',
}

const REF_RESISTANT: GuidelineRef = {
  society: 'ACC/AHA',
  year: 2018,
  section: 'Resistant Hypertension Scientific Statement. Hypertension 2018;72:e53',
}

// ─── BP Classification (Table 2 of 2018 ACC/AHA Guideline) ───────────────────

export function classifyBpAccAha(sbp: number, dbp: number): string {
  if (sbp < 120 && dbp < 80) return 'NORMAL'
  if (sbp >= 120 && sbp <= 129 && dbp < 80) return 'ELEVATED'
  if ((sbp >= 130 && sbp <= 139) || (dbp >= 80 && dbp <= 89)) return 'STAGE_1'
  if (sbp >= 140 || dbp >= 90) return 'STAGE_2'
  if (sbp > 180 || dbp > 120) return 'HYPERTENSIVE_CRISIS'
  return 'STAGE_2'
}

// ─── Resistant HTN Criteria (ACC/AHA 2018 Scientific Statement) ──────────────
// Definition: BP above goal despite concurrent use of ≥3 antihypertensive
// drug classes, commonly including a long-acting CCB, RAAS blocker (ACE/ARB),
// and a diuretic, at maximum or maximally tolerated doses.

export function assessResistantHtn(profile: PatientProfile): {
  isResistant: boolean
  isRefractory: boolean
  isPseudoresistant: boolean
  criteria: string[]
  missing: string[]
} {
  const criteria: string[] = []
  const missing: string[] = []
  const meds = profile.medications
  const bp = profile.bp

  // Determine effective BP
  const effectiveSbp = bp.avgOfficeSbp ?? bp.avgHomeSbp ?? bp.avgAbpmDaySbp
  const effectiveDbp = bp.avgOfficeDbp ?? bp.avgHomeDbp ?? bp.avgAbpmDayDbp

  if (!effectiveSbp || !effectiveDbp) {
    return { isResistant: false, isRefractory: false, isPseudoresistant: false, criteria, missing: ['BP data insufficient'] }
  }

  const bpUncontrolled = effectiveSbp >= 130 || effectiveDbp >= 80

  // Criterion 1: BP above goal
  if (bpUncontrolled) {
    criteria.push('BP above goal (≥130/80 mmHg)')
  } else if (meds.antihypertensiveCount >= 4) {
    // Controlled resistant: BP controlled but on ≥4 medications
    criteria.push('BP controlled on ≥4 antihypertensive medications')
  } else {
    missing.push('BP is at or below goal — may not be resistant HTN')
    return { isResistant: false, isRefractory: false, isPseudoresistant: false, criteria, missing }
  }

  // Criterion 2: ≥3 antihypertensive drug classes
  if (meds.antihypertensiveCount >= 3) {
    criteria.push(`On ${meds.antihypertensiveCount} antihypertensive medications`)
  } else {
    missing.push('Fewer than 3 antihypertensive medications — not yet resistant HTN criteria')
    return { isResistant: false, isRefractory: false, isPseudoresistant: false, criteria, missing }
  }

  // Criterion 3: Diuretic included (preferably thiazide-like)
  if (meds.onThiazideLike) {
    criteria.push('On thiazide-like diuretic (preferred: chlorthalidone or indapamide)')
  } else if (meds.onThiazide) {
    criteria.push('On thiazide diuretic (consider switching to chlorthalidone/indapamide)')
  } else if (meds.onAnyDiuretic) {
    criteria.push('On loop diuretic (consider adding thiazide-like if eGFR allows)')
  } else {
    missing.push('No diuretic in regimen — pseudoresistance suspected; add thiazide-like diuretic first')
    return { isResistant: false, isRefractory: false, isPseudoresistant: true, criteria, missing }
  }

  // Check for pseudoresistance factors
  const pseudoFactors: string[] = []
  if (!meds.adherenceConfirmed) {
    pseudoFactors.push('Medication adherence not confirmed')
  }
  if (meds.medicationsAtMaxDose.length === 0) {
    pseudoFactors.push('No medications documented at maximum tolerated dose')
  }

  if (pseudoFactors.length > 0) {
    missing.push(...pseudoFactors)
    return {
      isResistant: false,
      isRefractory: false,
      isPseudoresistant: true,
      criteria,
      missing,
    }
  }

  criteria.push('Adherence confirmed')
  criteria.push('Medications at optimal/maximum tolerated doses')

  // Refractory HTN: Uncontrolled on ≥5 agents including MRA
  const isRefractory =
    bpUncontrolled &&
    meds.antihypertensiveCount >= 5 &&
    meds.onMineralocorticoidAntagonist

  if (isRefractory) {
    criteria.push('Refractory: uncontrolled on ≥5 agents including mineralocorticoid antagonist')
  }

  return {
    isResistant: true,
    isRefractory,
    isPseudoresistant: false,
    criteria,
    missing,
  }
}

// ─── BP Targets (ACC/AHA 2018, Table 10) ─────────────────────────────────────

export function getBpTargetAccAha(profile: PatientProfile): BpTarget {
  const { comorbidities, cvRisk } = {
    comorbidities: profile.comorbidities,
    cvRisk: null as CvRiskResult | null,
  }

  // Clinical ASCVD or 10-yr risk ≥10%: Target <130/80 (Class I, Level A)
  if (comorbidities.priorCvEvent) {
    return {
      targetSbp: 130,
      targetDbp: 80,
      rationale: 'Clinical ASCVD: BP target <130/80 mmHg (ACC/AHA Class I, Level A)',
      guidelineRef: { ...REF_MAIN, section: 'Table 10, Recommendation 9.1', recommendationClass: 'I', evidenceLevel: 'A' },
    }
  }

  // CKD: KDIGO 2021 / ACC/AHA align on <130/80
  if (comorbidities.hasCkd) {
    return {
      targetSbp: 130,
      targetDbp: 80,
      rationale: 'CKD: BP target <130/80 mmHg to reduce CKD progression and CV events (KDIGO 2021, ACC/AHA)',
      guidelineRef: { society: 'KDIGO', year: 2021, section: 'Chapter 3.1', recommendationClass: 'I', evidenceLevel: 'A' },
    }
  }

  // Heart Failure (HFrEF): <130/80
  if (comorbidities.hasHeartFailure) {
    return {
      targetSbp: 130,
      targetDbp: 80,
      rationale: 'Heart failure: BP target <130/80 mmHg (ACC/AHA HF Guideline 2022)',
      guidelineRef: { society: 'ACC/AHA', year: 2022, section: 'HF Guideline', recommendationClass: 'I', evidenceLevel: 'B-R' },
    }
  }

  // Diabetes: <130/80 (ACC/AHA 2018 Class IIa, Level A; ADA aligns)
  if (comorbidities.hasDiabetes) {
    return {
      targetSbp: 130,
      targetDbp: 80,
      rationale: 'Diabetes mellitus: BP target <130/80 mmHg (ACC/AHA Class IIa, Level A)',
      guidelineRef: { ...REF_MAIN, section: 'Recommendation 9.3', recommendationClass: 'IIa', evidenceLevel: 'A' },
    }
  }

  // Stage 2 HTN or Stage 1 with 10-yr ASCVD ≥10%: <130/80
  // Stage 1 with 10-yr ASCVD <10%: <130/80 still recommended
  return {
    targetSbp: 130,
    targetDbp: 80,
    rationale: 'General hypertension: BP target <130/80 mmHg (ACC/AHA 2018 Class I)',
    guidelineRef: { ...REF_MAIN, section: 'Recommendation 9.2', recommendationClass: 'I', evidenceLevel: 'A' },
  }
}

// ─── Lifestyle Interventions (ACC/AHA Table 6) ────────────────────────────────

export function getLifestyleInterventions(profile: PatientProfile): LifestyleIntervention[] {
  const interventions: LifestyleIntervention[] = []
  const ref: GuidelineRef = { ...REF_MAIN, section: 'Table 6, Nonpharmacological Interventions' }

  // 1. Weight loss (if overweight/obese)
  if (profile.bmi && profile.bmi >= 25) {
    const isObese = profile.bmi >= 30
    interventions.push({
      intervention: 'Weight Reduction',
      detail: isObese
        ? `BMI ${profile.bmi.toFixed(1)} kg/m² — target BMI <25 kg/m²; 1 kg weight loss ≈ 1 mmHg BP reduction`
        : `BMI ${profile.bmi.toFixed(1)} kg/m² — achieve/maintain normal weight (BMI 18.5-24.9 kg/m²)`,
      expectedBpReductionSbp: '5 mmHg per 5 kg weight loss',
      priority: 'HIGH',
      guidelineRef: ref,
      applicable: true,
    })
  }

  // 2. DASH diet
  interventions.push({
    intervention: 'DASH Diet',
    detail: 'Dietary Approaches to Stop Hypertension: rich in fruits, vegetables, whole grains, low-fat dairy; reduce saturated fat and sodium',
    expectedBpReductionSbp: '11 mmHg',
    priority: 'HIGH',
    guidelineRef: ref,
    applicable: true,
  })

  // 3. Sodium restriction
  const currentNaGDay = profile.dietaryNaclGDay
  if (!currentNaGDay || currentNaGDay > 1.5) {
    interventions.push({
      intervention: 'Dietary Sodium Reduction',
      detail: currentNaGDay
        ? `Current intake ~${currentNaGDay}g NaCl/day — target <1.5g sodium/day (optimal) or ≥1g/day reduction`
        : 'Target dietary sodium <1.5 g/day (or at minimum reduce by ≥1g/day)',
      expectedBpReductionSbp: '5-6 mmHg',
      priority: 'HIGH',
      guidelineRef: ref,
      applicable: true,
    })
  }

  // 4. Dietary potassium
  interventions.push({
    intervention: 'Increased Dietary Potassium',
    detail: 'Target 3.5-5.0 g/day dietary potassium (unless CKD or on K-sparing drugs) — fruits, vegetables, legumes',
    expectedBpReductionSbp: '4-5 mmHg',
    priority: 'MEDIUM',
    guidelineRef: ref,
    applicable: !profile.comorbidities.hasCkd || (profile.labs.egfr ?? 60) >= 30,
    notApplicableReason: profile.comorbidities.hasCkd ? 'CKD present — monitor potassium carefully, limit high-K foods if hyperkalemia' : undefined,
  })

  // 5. Physical activity
  const activityMin = profile.physicalActivityMinWk ?? 0
  if (activityMin < 150) {
    interventions.push({
      intervention: 'Physical Activity — Aerobic',
      detail: `Current: ~${activityMin} min/week — target ≥150 min/week of moderate-intensity aerobic exercise (e.g., brisk walking, cycling, swimming)`,
      expectedBpReductionSbp: '4-5 mmHg',
      priority: 'HIGH',
      guidelineRef: ref,
      applicable: true,
    })
  }

  // 6. Dynamic resistance exercise
  interventions.push({
    intervention: 'Dynamic Resistance Training',
    detail: '90-150 min/week of resistance training (6 exercises, 3 sets of 10 reps at 50-80% max effort)',
    expectedBpReductionSbp: '4 mmHg',
    priority: 'MEDIUM',
    guidelineRef: ref,
    applicable: true,
  })

  // 7. Alcohol reduction
  const drinks = profile.alcoholDrinksPerWeek ?? 0
  const maxDrinks = profile.sex === 'MALE' ? 14 : 7
  if (drinks > maxDrinks) {
    interventions.push({
      intervention: 'Alcohol Reduction',
      detail: `Current: ~${drinks} drinks/week — reduce to ≤${profile.sex === 'MALE' ? '14' : '7'} drinks/week (≤2/day men, ≤1/day women); alcohol raises BP dose-dependently`,
      expectedBpReductionSbp: '4 mmHg',
      priority: 'HIGH',
      guidelineRef: ref,
      applicable: true,
    })
  }

  return interventions
}

// ─── Pharmacological Stepped Care (ACC/AHA 2018, Fig 3 & Supplement) ─────────

export function getMedicationStepsAccAha(
  profile: PatientProfile,
  classificationResult: HtnClassificationResult,
): MedicationStep[] {
  const meds = profile.medications
  const comorbidities = profile.comorbidities
  const isResistant = classificationResult.resistanceCategory === 'TRUE_RESISTANT' ||
                      classificationResult.resistanceCategory === 'REFRACTORY'
  const isStage2 = classificationResult.classification === 'STAGE_2'

  const steps: MedicationStep[] = []

  // ── Step 1: First-line monotherapy (or initial dual therapy for Stage 2) ──
  const firstLineAgents: string[] = []
  const avoidIn: string[] = []

  // Special first-line considerations
  if (comorbidities.hasHeartFailure) {
    firstLineAgents.push('ACE inhibitor or ARB (Class I)', 'Beta-blocker (Class I for HFrEF)', 'Diuretic — loop (if fluid overload)')
  } else if (comorbidities.hasCkd) {
    firstLineAgents.push('ACE inhibitor or ARB (first-line in proteinuric CKD, Class I Level A)')
    avoidIn.push('Avoid combination ACE + ARB (hyperkalemia, AKI risk)')
    if (profile.labs.egfr && profile.labs.egfr < 30) {
      avoidIn.push('Thiazide-like diuretics less effective if eGFR <30 — consider loop diuretic')
    }
  } else if (comorbidities.hasDiabetes) {
    firstLineAgents.push(
      'ACE inhibitor or ARB (preferred if proteinuria, Class I Level A)',
      'Long-acting dihydropyridine CCB (amlodipine)',
      'Thiazide-like diuretic (chlorthalidone preferred)',
    )
  } else if (comorbidities.hasCoronaryArteryDisease || comorbidities.priorCvEvent) {
    firstLineAgents.push(
      'Beta-blocker (post-MI, angina — Class I)',
      'ACE inhibitor or ARB (post-MI, LV dysfunction — Class I)',
      'Long-acting dihydropyridine CCB',
    )
  } else {
    // General hypertension — 3 preferred classes per ACC/AHA
    firstLineAgents.push(
      'Thiazide-like diuretic (chlorthalidone 12.5-25mg or indapamide 1.25-2.5mg)',
      'Dihydropyridine CCB (amlodipine 2.5-10mg)',
      'ACE inhibitor (e.g., lisinopril 10-40mg) or ARB (e.g., losartan 50-100mg)',
    )
  }

  steps.push({
    step: 1,
    phase: isStage2 ? 'Initial Combination Therapy (Stage 2)' : 'Monotherapy',
    drugClassPrimary: isStage2
      ? 'Two-drug combination: thiazide-like + CCB or RAAS'
      : firstLineAgents[0] ?? 'Thiazide-like diuretic or CCB or ACE inhibitor/ARB',
    preferredAgents: firstLineAgents,
    avoidIn: avoidIn.length ? avoidIn : undefined,
    rationale: isStage2
      ? 'Stage 2 HTN: ACC/AHA recommends initiating two-drug combination therapy (Class I, Level C-EO) to more rapidly achieve BP goal'
      : 'Stage 1 HTN or Stage 2 with comorbidities: initiate single agent from preferred class; reassess in 1 month',
    guidelineRef: { ...REF_MAIN, section: 'Section 9, Figure 3', recommendationClass: 'I', evidenceLevel: 'A' },
  })

  // ── Step 2: Two-drug combination ──
  if (!isStage2 || meds.antihypertensiveCount < 2) {
    steps.push({
      step: 2,
      phase: 'Two-Drug Combination',
      drugClassPrimary: 'Thiazide-like diuretic + CCB + RAAS (choose 2)',
      drugClassAlternative: 'RAAS + CCB preferred over RAAS + thiazide (ACCOMPLISH trial)',
      preferredAgents: [
        'ACE/ARB + dihydropyridine CCB (ACCOMPLISH: superior to ACE + thiazide)',
        'ACE/ARB + thiazide-like diuretic',
        'CCB + thiazide-like diuretic',
      ],
      avoidIn: ['ACE + ARB combination (ONTARGET: no added benefit, ↑harm)', 'CCB-NDHP + beta-blocker (bradycardia/heart block risk)'],
      rationale: 'Combination therapy: ACCOMPLISH trial showed ACE inhibitor + CCB reduced CV events vs. ACE + thiazide. All three classes (RAAS, CCB, thiazide-like) are first-line.',
      guidelineRef: { ...REF_MAIN, section: 'Section 9.3', recommendationClass: 'I', evidenceLevel: 'A' },
    })
  }

  // ── Step 3: Three-drug combination (Resistant HTN first step) ──
  steps.push({
    step: 3,
    phase: 'Triple Therapy — Core Resistant HTN Regimen',
    drugClassPrimary: 'RAAS (ACE/ARB) + CCB + Thiazide-like diuretic',
    preferredAgents: [
      'ACE inhibitor (e.g., lisinopril 40mg) or ARB (e.g., olmesartan 40mg)',
      'Amlodipine 10mg (maximum dose)',
      'Chlorthalidone 25mg (preferred over HCTZ — longer half-life, greater BP reduction)',
    ],
    avoidIn: ['HCTZ preferred to switch to chlorthalidone at this step if not already'],
    rationale: 'Resistant HTN: ensure triple therapy with RAAS + CCB + thiazide-like diuretic at maximum tolerated doses before diagnosing true resistant HTN. Chlorthalidone superior to HCTZ (MRFIT, Veterans Affairs studies).',
    guidelineRef: { ...REF_RESISTANT, section: 'Section 4', recommendationClass: 'I', evidenceLevel: 'C-LD' },
  })

  // ── Step 4: Add spironolactone (PATHWAY-2 — best 4th agent for resistant HTN) ──
  if (isResistant || meds.antihypertensiveCount >= 3) {
    const hasHyperkalemiaRisk = (profile.labs.potassium ?? 4.0) >= 4.5 ||
                                 (profile.labs.egfr ?? 60) < 45

    steps.push({
      step: 4,
      phase: 'Fourth Agent — Mineralocorticoid Antagonist (MRA)',
      drugClassPrimary: 'Mineralocorticoid Receptor Antagonist',
      preferredAgents: hasHyperkalemiaRisk
        ? [
            'Eplerenone 25-50mg (more selective, less gynecomastia)',
            'Finerenone 10-20mg (if CKD/DM — FIDELIO, FIGARO trials)',
            '(Monitor potassium closely — check 1-2 weeks after start)',
          ]
        : [
            'Spironolactone 25-50mg (PATHWAY-2: best 4th drug for resistant HTN, p<0.0001)',
            '(Check potassium/eGFR before starting; avoid if K >5.0 or eGFR <30)',
          ],
      avoidIn: [
        'Contraindicated: K >5.0 mEq/L',
        'Contraindicated: eGFR <30 mL/min/1.73m² (spironolactone)',
        'Avoid with combined ACE+ARB+MRA (triple RAAS blockade)',
      ],
      rationale: 'PATHWAY-2 RCT: spironolactone reduced BP by ~8.7 mmHg SBP vs. placebo in resistant HTN — most effective 4th-line agent. Primary aldosteronism is common in resistant HTN (20-30%) and responds particularly well to MRA.',
      guidelineRef: {
        society: 'ACC/AHA',
        year: 2018,
        section: 'Resistant HTN Statement, Section 6. Williams B, PATHWAY-2, Lancet 2015;386:2059',
        recommendationClass: 'I',
        evidenceLevel: 'B-R',
      },
    })
  }

  // ── Step 5: Additional agents for refractory HTN ──
  if (isResistant && meds.antihypertensiveCount >= 4) {
    steps.push({
      step: 5,
      phase: 'Fifth Agent — Beta-blocker or Alpha-blocker',
      drugClassPrimary: 'Beta-blocker or Alpha-blocker (additional agent)',
      preferredAgents: [
        'Carvedilol (alpha + beta blocker) — especially with CAD/HF',
        'Bisoprolol or metoprolol succinate — heart rate control',
        'Doxazosin 1-8mg (ASCOT-BPLA: effective add-on; men with BPH)',
        'Atenolol (less preferred — less outcome data vs. newer agents)',
      ],
      rationale: 'Refractory HTN: add beta-blocker or alpha-blocker. Beta-blockers reduce cardiac output and renin release. Alpha-blockers reduce peripheral resistance.',
      guidelineRef: { ...REF_RESISTANT, section: 'Section 6.2', recommendationClass: 'IIa', evidenceLevel: 'C-LD' },
    })

    steps.push({
      step: 6,
      phase: 'Sixth Agent — Direct Vasodilator (Late Refractory)',
      drugClassPrimary: 'Direct Vasodilator',
      preferredAgents: [
        'Minoxidil 2.5-10mg twice daily (most potent oral vasodilator — requires loop diuretic + beta-blocker to offset side effects)',
        'Hydralazine 25-100mg twice daily (less potent, lupus risk at >200mg/day)',
      ],
      avoidIn: [
        'Minoxidil without loop diuretic (fluid retention)',
        'Minoxidil without beta-blocker (reflex tachycardia)',
        'Hydralazine >200mg/day (drug-induced lupus)',
      ],
      rationale: 'Late refractory HTN: direct vasodilators are last-line oral agents before invasive therapy consideration. Minoxidil is the most potent but requires concurrent diuretic and beta-blocker.',
      guidelineRef: { ...REF_RESISTANT, section: 'Section 6.3', recommendationClass: 'IIb', evidenceLevel: 'C-LD' },
    })
  }

  return steps
}

// ─── CV Risk Stratification (Pooled Cohort Equations) ────────────────────────

export function calculateCvRiskAccAha(profile: PatientProfile): CvRiskResult {
  const comorbidities = profile.comorbidities
  const labs = profile.labs
  const highRiskConditions: string[] = []
  const riskEnhancers: string[] = []

  // Automatic high-risk conditions (Fam Heart J Classification)
  if (comorbidities.priorCvEvent) highRiskConditions.push('Prior ASCVD event (very high risk)')
  if (comorbidities.hasCkd && ['G3', 'G3a', 'G3b', 'G4', 'G5'].includes(comorbidities.ckdStage ?? '')) {
    highRiskConditions.push('CKD stage ≥3 (high risk)')
  }
  if (labs.ldl && labs.ldl >= 190) highRiskConditions.push('LDL ≥190 mg/dL (familial hypercholesterolemia)')
  if (comorbidities.hasDiabetes && profile.age >= 40) highRiskConditions.push('Diabetes mellitus (high risk)')

  // Risk enhancers (ACC/AHA 2018 Cholesterol Guideline)
  if (comorbidities.hasAtrialFibrillation) riskEnhancers.push('Atrial fibrillation')
  if (comorbidities.hasSleepApnea) riskEnhancers.push('Obstructive sleep apnea')
  if (profile.comorbidities.hasObesity) riskEnhancers.push('Obesity (BMI ≥30)')
  if (profile.smokingStatus === 'Current') riskEnhancers.push('Current smoker')

  // Simplified risk estimation (Pooled Cohort Equations)
  // Full PCE implementation requires race-specific coefficients
  // This is a simplified approximation for clinical guidance
  let estimatedRisk: number | undefined
  const { age, sex } = profile

  if (highRiskConditions.some(c => c.includes('Prior ASCVD'))) {
    return {
      category: 'VERY_HIGH',
      tenYearAscvdRisk: estimatedRisk,
      highRiskConditions,
      riskEnhancers,
    }
  }

  if (highRiskConditions.length >= 2) {
    return {
      category: 'HIGH',
      tenYearAscvdRisk: estimatedRisk,
      highRiskConditions,
      riskEnhancers,
    }
  }

  if (highRiskConditions.length === 1) {
    return {
      category: 'HIGH',
      tenYearAscvdRisk: estimatedRisk,
      highRiskConditions,
      riskEnhancers,
    }
  }

  // Age-based simplified risk (in absence of full PCE inputs)
  const isHighAgeRisk =
    (sex === 'MALE' && age >= 55) || (sex === 'FEMALE' && age >= 65)
  if (isHighAgeRisk && riskEnhancers.length >= 2) {
    return { category: 'INTERMEDIATE', tenYearAscvdRisk: estimatedRisk, highRiskConditions, riskEnhancers }
  }

  if (riskEnhancers.length >= 2) {
    return { category: 'BORDERLINE', tenYearAscvdRisk: estimatedRisk, highRiskConditions, riskEnhancers }
  }

  return { category: 'LOW', tenYearAscvdRisk: estimatedRisk, highRiskConditions, riskEnhancers }
}
