// ─── ESC Hypertension Guidelines ─────────────────────────────────────────────
// Primary source: 2024 ESC Guidelines for the management of elevated blood
// pressure and hypertension (Mancia G et al., Eur Heart J 2024)
//
// Key differences from ACC/AHA 2018:
// - Uses 140/90 as the threshold for hypertension (vs ACC/AHA 130/80)
// - Grades 1/2/3 instead of Stage 1/2
// - BP targets remain <140/90 first, then <130/80 if tolerated (vs ACC/AHA uniform <130/80)
// - Slightly different stepped-care algorithm (single-pill combination preferred)
// - Same core drug classes: RAAS, CCB, thiazide-like
// - HEARTS framework for simplified hypertension management
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PatientProfile,
  BpTarget,
  CvRiskResult,
  ManagementProtocolResult,
  GuidelineRef,
  LifestyleIntervention,
  MedicationStep,
} from '../types'

export const ESC_VERSION = 'ESC-2024' as const

const REF_ESC: GuidelineRef = {
  society: 'ESC',
  year: 2024,
  section: 'Mancia et al. Eur Heart J 2024',
}

// ─── BP Classification (ESC 2024, Table 1) ────────────────────────────────────

export function classifyBpEsc(sbp: number, dbp: number): {
  grade: string
  category: string
} {
  if (sbp < 120 && dbp < 80) return { grade: 'OPTIMAL', category: 'Normal' }
  if (sbp < 130 && dbp < 85) return { grade: 'NORMAL', category: 'Normal' }
  if (sbp >= 130 && sbp <= 139 && dbp >= 85 && dbp <= 89) return { grade: 'HIGH_NORMAL', category: 'High Normal' }
  if ((sbp >= 140 && sbp <= 159) || (dbp >= 90 && dbp <= 99)) return { grade: 'GRADE_1', category: 'Grade 1 Hypertension' }
  if ((sbp >= 160 && sbp <= 179) || (dbp >= 100 && dbp <= 109)) return { grade: 'GRADE_2', category: 'Grade 2 Hypertension' }
  if (sbp >= 180 || dbp >= 110) return { grade: 'GRADE_3', category: 'Grade 3 Hypertension' }
  return { grade: 'GRADE_1', category: 'Grade 1 Hypertension' }
}

// ─── BP Targets (ESC 2024, Table 11) ─────────────────────────────────────────
// ESC 2024 uses a two-step approach: first target <140/90, then <130/80 if tolerated

export function getBpTargetEsc(profile: PatientProfile): BpTarget {
  const comorbidities = profile.comorbidities
  const age = profile.age

  // Very elderly (≥80 years): office SBP 140-150 mmHg if tolerated
  if (age >= 80) {
    return {
      targetSbp: 140,
      targetDbp: 80,
      rationale: 'Age ≥80: ESC 2024 recommends targeting SBP 140-150 mmHg (individualize, consider frailty)',
      guidelineRef: { ...REF_ESC, section: 'Table 11, Elderly HTN', recommendationClass: 'IIa', evidenceLevel: 'B' },
    }
  }

  // CKD with proteinuria: <130/80
  if (comorbidities.hasCkd && (profile.labs.albuminCreatinineRatio ?? 0) >= 30) {
    return {
      targetSbp: 130,
      targetDbp: 80,
      rationale: 'CKD with proteinuria (ACR ≥30 mg/g): ESC 2024 target <130/80 mmHg to slow CKD progression',
      guidelineRef: { ...REF_ESC, section: 'Section 9.4.3', recommendationClass: 'I', evidenceLevel: 'A' },
    }
  }

  // Prior stroke/TIA: <130/80 (individualize in elderly)
  if (comorbidities.hasStrokeOrTia) {
    return {
      targetSbp: 130,
      targetDbp: 80,
      rationale: 'Prior stroke/TIA: ESC 2024 target SBP 120-130 mmHg (secondary prevention)',
      guidelineRef: { ...REF_ESC, section: 'Section 9.4.6', recommendationClass: 'I', evidenceLevel: 'A' },
    }
  }

  // Diabetes with target organ damage: <130/80
  if (comorbidities.hasDiabetes) {
    return {
      targetSbp: 130,
      targetDbp: 80,
      rationale: 'Diabetes mellitus: ESC 2024 recommends target <130/80 mmHg (if tolerated)',
      guidelineRef: { ...REF_ESC, section: 'Section 9.4.1', recommendationClass: 'I', evidenceLevel: 'A' },
    }
  }

  // General: initial target <140/90, then intensify to <130/80 if tolerated
  return {
    targetSbp: 130,
    targetDbp: 80,
    rationale: 'General HTN: ESC 2024 recommends office BP target <140/90 mmHg initially, then <130/80 if tolerated (most patients under 80)',
    guidelineRef: { ...REF_ESC, section: 'Table 11, General', recommendationClass: 'I', evidenceLevel: 'A' },
  }
}

// ─── ESC Stepped Care — Single Pill Combination Strategy ─────────────────────
// ESC 2024 strongly emphasizes single-pill combination (SPC) for adherence

export function getMedicationStepsEsc(
  profile: PatientProfile,
): MedicationStep[] {
  const comorbidities = profile.comorbidities
  const meds = profile.medications
  const steps: MedicationStep[] = []

  const refEscAlgorithm: GuidelineRef = { ...REF_ESC, section: 'Figure 7, Treatment Algorithm' }

  // ── Step 1: Two-drug SPC as initial strategy (ESC 2024 strongly recommends) ──
  // ESC 2024 recommends starting with SPC rather than monotherapy for most Grade 1+

  let step1Agents: string[]
  const step1Avoid: string[] = []

  if (comorbidities.hasHeartFailure) {
    step1Agents = [
      'ACE inhibitor or ARB (Class I, Level A — RAAS mandatory in HFrEF)',
      'Beta-blocker — bisoprolol, carvedilol, metoprolol succinate (Class I, Level A)',
      'Loop diuretic if volume overloaded',
      'MRA (eplerenone/spironolactone) for HFrEF',
    ]
  } else if (comorbidities.hasCkd) {
    step1Agents = [
      'ACE inhibitor or ARB (preferred, especially if proteinuric — Class I Level A)',
      'Combine with dihydropyridine CCB or loop diuretic (if eGFR <30)',
    ]
    step1Avoid.push('Avoid thiazide-like if eGFR <30 mL/min (reduced efficacy)')
    step1Avoid.push('ACE + ARB combination contraindicated')
  } else if (comorbidities.hasCoronaryArteryDisease) {
    step1Agents = [
      'ACE inhibitor or ARB (Class I) + CCB (amlodipine for angina)',
      'Beta-blocker (if angina or post-MI — Class I) in SPC with RAAS or CCB',
    ]
  } else {
    // Standard ESC 2024 algorithm: preferred SPC = RAAS + CCB or RAAS + thiazide-like
    step1Agents = [
      'RAAS + CCB single-pill combination (preferred): e.g., perindopril/amlodipine, ramipril/amlodipine',
      'RAAS + thiazide-like SPC: e.g., olmesartan/chlorthalidone, irbesartan/indapamide',
      'If CCB monotherapy preferred: long-acting dihydropyridine (amlodipine)',
    ]
  }

  steps.push({
    step: 1,
    phase: 'Initial: Two-Drug Single-Pill Combination (ESC 2024 preferred)',
    drugClassPrimary: 'RAAS blocker + CCB (preferred) or RAAS + thiazide-like',
    preferredAgents: step1Agents,
    avoidIn: step1Avoid.length ? step1Avoid : ['Beta-blocker as initial therapy unless specific indication (CAD, HF, tachyarrhythmia)'],
    rationale: 'ESC 2024 strongly recommends initiating most patients on two-drug SPC therapy. Monotherapy only for Grade 1 + low CV risk + SBP <150. SPC improves adherence (proven across multiple RCTs).',
    guidelineRef: { ...refEscAlgorithm, recommendationClass: 'I', evidenceLevel: 'A' },
  })

  // ── Step 2: Triple therapy SPC ──
  steps.push({
    step: 2,
    phase: 'Triple Therapy — RAAS + CCB + Thiazide-like Diuretic',
    drugClassPrimary: 'Three-drug SPC: RAAS + CCB + Thiazide-like',
    drugClassAlternative: 'RAAS + CCB + MRA (if aldosteronism or resistant)',
    preferredAgents: [
      'Perindopril/amlodipine/indapamide (Trinomia — validated in ASCOT-BPLA-based analyses)',
      'Olmesartan/amlodipine/hydrochlorothiazide',
      'ACE/ARB + amlodipine 10mg + chlorthalidone 25mg (if SPC unavailable)',
    ],
    rationale: 'ESC 2024: if BP not at target on two-drug combination, add third agent. Three-drug SPC markedly improves adherence. Most patients with HTN will ultimately need three drugs.',
    guidelineRef: { ...refEscAlgorithm, recommendationClass: 'I', evidenceLevel: 'A' },
  })

  // ── Step 3: Add MRA (ESC 2024 endorses, as per PATHWAY-2) ──
  if (meds.antihypertensiveCount >= 3) {
    const hyperkalemiaRisk = (profile.labs.potassium ?? 4.0) >= 4.5 || (profile.labs.egfr ?? 60) < 45
    steps.push({
      step: 3,
      phase: 'Resistant HTN — Add Mineralocorticoid Antagonist',
      drugClassPrimary: 'Mineralocorticoid Receptor Antagonist',
      preferredAgents: hyperkalemiaRisk
        ? ['Eplerenone 25-50mg (selective, preferred if hyperkalemia risk)', 'Finerenone 10-20mg (if CKD/DM — reduces CV-renal events)']
        : ['Spironolactone 25-50mg (PATHWAY-2 — best 4th-line agent, ESC Class IIa)', 'Eplerenone if gynecomastia concern'],
      avoidIn: ['K+ >5.0 mEq/L', 'eGFR <30 (spironolactone)', 'Combined ACE+ARB+MRA'],
      rationale: 'ESC 2024: for resistant HTN (Grade 1-3 despite optimized triple therapy), add spironolactone 25-50mg as preferred 4th-line agent (PATHWAY-2, Level B). Addresses the high prevalence of primary aldosteronism in resistant HTN.',
      guidelineRef: { ...REF_ESC, section: 'Section 8.3 Resistant HTN', recommendationClass: 'IIa', evidenceLevel: 'B' },
    })
  }

  // ── Step 4: Additional agents ──
  if (meds.antihypertensiveCount >= 4) {
    steps.push({
      step: 4,
      phase: 'Refractory — Additional Agents',
      drugClassPrimary: 'Alpha-blocker, beta-blocker, or direct vasodilator',
      preferredAgents: [
        'Doxazosin 1-8mg (alpha-blocker — useful in men, metabolically neutral)',
        'Bisoprolol/carvedilol (if not yet on beta-blocker)',
        'Minoxidil 2.5-10mg (most potent oral vasodilator — requires diuretic + beta-blocker)',
        'Clonidine (central agonist — adherence issues due to rebound effect)',
      ],
      avoidIn: ['Minoxidil without diuretic and beta-blocker', 'Clonidine + non-selective beta-blocker (severe rebound hypertension on withdrawal)'],
      rationale: 'ESC 2024: for refractory resistant HTN on ≥4 drugs, consider further add-on therapy before invasive procedures. Evaluate for device-based therapy (RDN) if refractory to ≥3-4 drugs.',
      guidelineRef: { ...REF_ESC, section: 'Section 8.3', recommendationClass: 'IIb', evidenceLevel: 'C' },
    })
  }

  return steps
}

// ─── ESC CV Risk Assessment (SCORE2 / SCORE2-OP) ─────────────────────────────
// ESC 2024 uses SCORE2 for 10-year CVD mortality + non-fatal MI/stroke risk

export function getCvRiskEsc(profile: PatientProfile): CvRiskResult {
  const comorbidities = profile.comorbidities
  const highRiskConditions: string[] = []
  const riskEnhancers: string[] = []

  // Automatic high/very-high risk (ESC 2021 CVD Risk, Table 4)
  if (comorbidities.priorCvEvent) {
    highRiskConditions.push('Established ASCVD (very high risk per SCORE2)')
  }
  if (comorbidities.hasDiabetes && (profile.age >= 40 || (profile.labs.albuminCreatinineRatio ?? 0) >= 30)) {
    highRiskConditions.push('Diabetes with target organ damage or age ≥40')
  }
  if (comorbidities.hasCkd) {
    const stage = comorbidities.ckdStage ?? ''
    if (['G3a', 'G3b', 'G4', 'G5'].includes(stage)) {
      highRiskConditions.push(`CKD stage ${stage} (eGFR ${profile.labs.egfr} mL/min)`)
    }
  }
  if (profile.labs.ldl && profile.labs.ldl >= 190) {
    highRiskConditions.push('LDL ≥190 mg/dL — familial hypercholesterolemia')
  }

  if (comorbidities.hasAtrialFibrillation) riskEnhancers.push('Atrial fibrillation')
  if (profile.bmi && profile.bmi >= 30) riskEnhancers.push('Obesity (BMI ≥30)')
  if (profile.smokingStatus === 'Current') riskEnhancers.push('Smoking')

  if (comorbidities.priorCvEvent) {
    return { category: 'VERY_HIGH', highRiskConditions, riskEnhancers }
  }
  if (highRiskConditions.length >= 2) return { category: 'HIGH', highRiskConditions, riskEnhancers }
  if (highRiskConditions.length === 1) return { category: 'HIGH', highRiskConditions, riskEnhancers }
  if (riskEnhancers.length >= 2) return { category: 'INTERMEDIATE', highRiskConditions, riskEnhancers }
  return { category: 'LOW', highRiskConditions, riskEnhancers }
}

// ─── ESC Resistant HTN Definition ────────────────────────────────────────────
// Slightly broader than ACC/AHA — includes non-adherence discovery period

export function assessResistantHtnEsc(profile: PatientProfile): {
  isResistant: boolean
  notes: string[]
} {
  const meds = profile.medications
  const bp = profile.bp
  const notes: string[] = []

  const effectiveSbp = bp.avgOfficeSbp ?? bp.avgHomeSbp ?? 999
  const bpUncontrolled = effectiveSbp >= 140

  if (!bpUncontrolled) {
    notes.push('BP controlled (ESC threshold <140 mmHg SBP) — does not meet ESC resistant HTN definition')
    return { isResistant: false, notes }
  }

  if (meds.antihypertensiveCount < 3) {
    notes.push('Fewer than 3 antihypertensives — ESC recommends optimizing to full triple therapy before labeling resistant')
    return { isResistant: false, notes }
  }

  if (!meds.onAnyDiuretic) {
    notes.push('ESC: no diuretic in regimen — add diuretic before confirming resistant HTN')
    return { isResistant: false, notes }
  }

  notes.push(`BP ≥140 mmHg SBP on ${meds.antihypertensiveCount} antihypertensive drugs including diuretic — ESC resistant HTN criteria met`)
  notes.push('Confirm: ABPM recommended to exclude white coat effect')
  notes.push('Confirm: medication adherence (urine/blood toxicology screen if doubt)')
  notes.push('Secondary causes: systematically exclude before device-based therapy')

  return { isResistant: true, notes }
}
