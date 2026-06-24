// ─── Renal Artery Stenting Eligibility Engine ────────────────────────────────
// Guidelines:
// - ACC/AHA 2013 Peripheral Artery Disease Guidelines (JACC 2013;61:e50)
// - ACC/AHA 2018 HTN Guidelines (Section on Renovascular HTN)
// - ESC 2017 Peripheral Arterial Diseases Guidelines
// - CORAL Trial (NEJM 2014) — landmark trial showing stenting not superior to
//   medical therapy in most atherosclerotic RAS patients
// - ASTRAL Trial (NEJM 2009) — similar findings
//
// CRITICAL: CORAL and ASTRAL have significantly narrowed indications for
// stenting in atherosclerotic RAS. Strong medical therapy is standard.
// Stenting reserved for specific anatomical/clinical circumstances.
// ─────────────────────────────────────────────────────────────────────────────

import type { PatientProfile, EligibilityResult, EligibilityCriterion, GuidelineRef } from '../types'

const STENTING_REFS: GuidelineRef[] = [
  {
    society: 'ACC/AHA',
    year: 2013,
    section: '2013 ACC/AHA Peripheral Artery Disease Guideline, Section 9',
    recommendationClass: 'IIa',
    evidenceLevel: 'B',
    text: 'Renal artery stenting is indicated for hemodynamically significant RAS with recurrent flash pulmonary edema, refractory HTN, or unexplained AKI. Class IIa.',
  },
  {
    society: 'ESC',
    year: 2017,
    section: 'ESC 2017 PAD Guidelines, Section 9.3',
    text: 'Revascularization may be beneficial in RAS with uncontrolled HTN, renal salvage situations, or hemodynamic significance with flash pulmonary edema.',
  },
]

export function assessStentingEligibility(profile: PatientProfile): EligibilityResult {
  const supportingCriteria: EligibilityCriterion[] = []
  const contraindications: EligibilityCriterion[] = []
  const relativeContraindications: EligibilityCriterion[] = []
  const prerequisites: string[] = []
  const notes: string[] = []

  const imaging = profile.imaging
  const labs = profile.labs
  const comorbidities = profile.comorbidities
  const meds = profile.medications

  const maxStenosis = imaging.maxStenosisPercent ?? 0
  const egfr = labs.egfr ?? 60

  // ── ANATOMICAL CRITERIA ────────────────────────────────────────────────────

  // 1. Degree of stenosis — must be hemodynamically significant
  const isHemodynamicallySignificant = maxStenosis >= 60
  const isBilateral = imaging.stenosisSide === 'BILATERAL'

  supportingCriteria.push({
    criterion: 'Hemodynamically significant renal artery stenosis (≥60%)',
    met: isHemodynamicallySignificant,
    detail: maxStenosis > 0
      ? `Stenosis: ${maxStenosis}% (${imaging.stenosisSide ?? 'side not specified'}) ${isHemodynamicallySignificant ? '✓' : '— below threshold for revascularization consideration'}`
      : 'Stenosis not characterized — imaging required',
    critical: true,
  })

  if (maxStenosis >= 60 && maxStenosis < 70) {
    notes.push('Moderate stenosis (60-70%): hemodynamic significance uncertain. Consider FFR (fractional flow reserve) measurement at time of angiography to confirm physiologic significance before stenting.')
  }

  // ── CLINICAL INDICATIONS — One of the following must be present ────────────
  // Post-CORAL/ASTRAL: stenting only justified in specific clinical scenarios

  // 2. Flash pulmonary edema (Pickering syndrome) — strongest Class I indication
  const hasFlashPe = false // This would come from clinical history — flag for manual review
  supportingCriteria.push({
    criterion: 'Recurrent unexplained flash pulmonary edema (Pickering syndrome)',
    met: hasFlashPe,
    detail: 'Bilateral RAS or RAS to solitary kidney causing flash pulmonary edema — Class I indication for revascularization if anatomically suitable',
  })

  // 3. Ischemic nephropathy — declining kidney function
  const hasAkiOnRaas = false // RAAS-induced AKI — would come from clinical notes
  const hasRapidCkdProgression = false // Clinical assessment needed
  supportingCriteria.push({
    criterion: 'Ischemic nephropathy (eGFR declining on RAAS therapy, or AKI on ACE/ARB)',
    met: hasAkiOnRaas || hasRapidCkdProgression,
    detail: 'AKI precipitated by ACE inhibitor/ARB, or rapidly declining eGFR in setting of bilateral RAS or RAS to solitary kidney — stenting may preserve renal function',
  })

  // 4. Uncontrolled HTN despite maximal medical therapy + hemodynamically significant RAS
  const bpUncontrolled = (profile.bp.avgOfficeSbp ?? 0) >= 130
  const onMaximalTherapy = meds.antihypertensiveCount >= 3

  supportingCriteria.push({
    criterion: 'Uncontrolled HTN on ≥3 medications with hemodynamically significant RAS',
    met: bpUncontrolled && onMaximalTherapy && isHemodynamicallySignificant,
    detail: bpUncontrolled && onMaximalTherapy
      ? `BP uncontrolled on ${meds.antihypertensiveCount} agents in setting of ${maxStenosis}% RAS — revascularization may be considered (Class IIa, evidence B)`
      : 'Criteria not fully met',
  })

  // 5. Fibromuscular dysplasia (FMD) — different etiology, stronger indication
  const hasFmd = false // Would be identified on imaging — 'string of beads' appearance
  if (hasFmd) {
    supportingCriteria.push({
      criterion: 'Fibromuscular dysplasia (FMD) — preferred: PTA (not stenting)',
      met: true,
      detail: 'FMD-related RAS: PTA (balloon angioplasty without stenting) is first-line treatment — see PTA eligibility. Stenting reserved for failed PTA.',
    })
    notes.push('FMD: PTA is preferred over stenting. Stent only if PTA fails or flow-limiting dissection occurs.')
  }

  // ── CONTRAINDICATIONS ─────────────────────────────────────────────────────

  // CORAL/ASTRAL finding: stenting NOT superior to medical therapy in stable atherosclerotic RAS
  notes.push(
    'CLINICAL NOTE — CORAL Trial (NEJM 2014): In stable patients with atherosclerotic RAS (no flash PE, stable CKD, reasonably controlled BP), stenting did NOT reduce CV events vs. medical therapy alone. Strong medical therapy remains standard for most patients with atherosclerotic RAS.'
  )

  // Severe CKD with small echogenic kidneys — no benefit
  const kidneyTooSmall = false // Would need kidney size from imaging — <7cm = atrophic
  if (egfr < 15 || kidneyTooSmall) {
    contraindications.push({
      criterion: 'Severe CKD (eGFR <15) or atrophic kidney (<7 cm)',
      met: egfr < 15,
      detail: `eGFR: ${egfr} mL/min — renal parenchyma likely non-salvageable. Stenting unlikely to improve function and carries contrast nephropathy risk.`,
      critical: true,
    })
  }

  // Non-obstructive or non-hemodynamically significant stenosis
  if (maxStenosis > 0 && maxStenosis < 60) {
    contraindications.push({
      criterion: 'Non-hemodynamically significant stenosis (<60%)',
      met: true,
      detail: `Stenosis ${maxStenosis}% — CORAL and ASTRAL trials showed no benefit of stenting below ~60-70% in absence of hemodynamic significance. Medical therapy preferred.`,
      critical: true,
    })
  }

  // Contrast allergy
  relativeContraindications.push({
    criterion: 'Contrast allergy / Iodinated contrast risk',
    met: false, // Would come from allergy history
    detail: 'If significant contrast allergy: consider CO2 angiography or gadolinium (with NSF precautions if CKD). Pre-medicate with steroids/antihistamine protocol if proceeding.',
  })

  // ── PREREQUISITES ──────────────────────────────────────────────────────────
  if (!imaging.ctaOrMraDone) {
    prerequisites.push('CTA renal arteries (preferred) or MRA renal arteries — required for anatomical assessment before stenting')
  }
  prerequisites.push('Functional hemodynamic assessment: consider translesional pressure gradient (FFR/Pd:Pa) at time of angiography if stenosis 60-80%')
  prerequisites.push('Optimize medical therapy: ACE/ARB (unless bilateral RAS — causes AKI), statin, antiplatelet')
  prerequisites.push('Creatinine/eGFR within 7 days of procedure (contrast nephropathy baseline)')
  prerequisites.push('IV hydration protocol pre/post procedure (contrast protection, especially if eGFR 30-60)')
  prerequisites.push('Discuss risks: contrast nephropathy, cholesterol embolism, restenosis (~15-20% at 1 year), access site complications')

  // ── ELIGIBILITY DETERMINATION ──────────────────────────────────────────────
  const absoluteContraindications = contraindications.filter(c => c.met && c.critical)
  const hasStrongClinicalIndication =
    bpUncontrolled && onMaximalTherapy && isHemodynamicallySignificant

  const eligible = absoluteContraindications.length === 0 && isHemodynamicallySignificant && hasStrongClinicalIndication

  return {
    eligible,
    recommendationStrength: eligible ? 'CLASS_IIA_B' : undefined,
    primaryIndication: eligible
      ? `Hemodynamically significant RAS (${maxStenosis}%) with uncontrolled HTN on ≥${meds.antihypertensiveCount} medications — may consider revascularization (ACC/AHA Class IIa, Level B)`
      : undefined,
    supportingCriteria: supportingCriteria.filter(c => c.met),
    contraindications: contraindications.filter(c => c.met),
    relativeContraindications: relativeContraindications.filter(c => c.met),
    prerequisites,
    guidelineRefs: STENTING_REFS,
    notes,
  }
}
