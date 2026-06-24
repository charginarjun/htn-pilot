// ─── Renal Denervation (RDN) Eligibility Engine ──────────────────────────────
// Guidelines:
// - ACC/AHA Hypertension 2018 (device therapy context)
// - ESC 2024 Guidelines — Section 8.4: Device-based therapy
// - FDA approval: Recor Medical Paradise System (Nov 2023) — US market
// - SYMPLICITY HTN-3 (2014), RADIANCE-HTN SOLO (2018), RADIANCE-II (2021),
//   SPYRAL HTN-OFF MED Pivotal (2024), SPYRAL HTN-ON MED (ongoing)
// ─────────────────────────────────────────────────────────────────────────────

import type { PatientProfile, EligibilityResult, EligibilityCriterion, GuidelineRef, HtnClassificationResult } from '../types'

const RDN_REFS: GuidelineRef[] = [
  {
    society: 'ESC',
    year: 2024,
    section: 'Section 8.4.1 — Catheter-based renal denervation',
    recommendationClass: 'IIa',
    evidenceLevel: 'A',
    text: 'RDN may be considered in patients with uncontrolled hypertension on optimized medical therapy (≥3 drugs). ESC 2024.',
  },
  {
    society: 'ACC/AHA',
    year: 2023,
    section: 'FDA-approved Paradise Ultrasound RDN System (Recor Medical, Nov 2023)',
    text: 'FDA approved for adults with uncontrolled HTN on ≥2 medications who are not candidates for or refuse additional medications.',
  },
]

export function assessRdnEligibility(
  profile: PatientProfile,
  classification: HtnClassificationResult,
): EligibilityResult {
  const supportingCriteria: EligibilityCriterion[] = []
  const contraindications: EligibilityCriterion[] = []
  const relativeContraindications: EligibilityCriterion[] = []
  const prerequisites: string[] = []
  const notes: string[] = []

  const meds = profile.medications
  const imaging = profile.imaging
  const labs = profile.labs
  const comorbidities = profile.comorbidities
  const bp = classification.clinicalBpValue

  // ── PRIMARY ELIGIBILITY CRITERIA ────────────────────────────────────────────

  // 1. Uncontrolled BP
  const bpUncontrolled = bp.sbp >= 130 || bp.dbp >= 80
  supportingCriteria.push({
    criterion: 'Uncontrolled blood pressure',
    met: bpUncontrolled,
    detail: `Office/ambulatory BP: ${bp.sbp}/${bp.dbp} mmHg (threshold: ≥130/80 per ACC/AHA target)`,
    critical: true,
  })

  // 2. Antihypertensive medication requirement
  // FDA approval: ≥2 medications; ESC: ≥3 medications (optimized)
  const meetsMinMedCriteria = meds.antihypertensiveCount >= 2
  const meetsResistantMedCriteria = meds.antihypertensiveCount >= 3 && meds.onAnyDiuretic
  supportingCriteria.push({
    criterion: `On ≥2 antihypertensive medications (FDA criterion) / ≥3 including diuretic (ESC criterion for resistant HTN)`,
    met: meetsMinMedCriteria,
    detail: `Currently on ${meds.antihypertensiveCount} antihypertensive agents. ${meds.onAnyDiuretic ? 'Diuretic included ✓' : 'No diuretic — add before considering RDN'}`,
    critical: true,
  })

  if (meetsResistantMedCriteria) {
    supportingCriteria.push({
      criterion: 'True resistant HTN confirmed (≥3 drugs including diuretic, adherence confirmed)',
      met: meds.adherenceConfirmed,
      detail: meds.adherenceConfirmed
        ? 'Medication adherence confirmed — true resistant HTN'
        : 'Adherence NOT yet confirmed — pseudoresistance must be excluded first (urine tox, pill count, supervised intake)',
    })
  }

  // 3. Renal anatomy — key anatomical requirement for RDN
  const arteryLengthOk =
    (imaging.renalArteryLength ?? 0) >= 20  // ≥20mm main renal artery
  const arteryDiamOk =
    (imaging.renalArteryDiameter ?? 0) >= 3 && (imaging.renalArteryDiameter ?? 99) <= 8 // 3-8mm

  supportingCriteria.push({
    criterion: 'Renal artery length ≥20 mm',
    met: arteryLengthOk,
    detail: imaging.renalArteryLength
      ? `Measured length: ${imaging.renalArteryLength} mm ${arteryLengthOk ? '✓' : '✗ — insufficient length for catheter delivery'}`
      : 'Renal artery length not documented — CTA/MRA required before RDN eligibility determination',
    critical: false,
  })

  supportingCriteria.push({
    criterion: 'Main renal artery diameter 3-8 mm (catheter sizing)',
    met: arteryDiamOk,
    detail: imaging.renalArteryDiameter
      ? `Measured diameter: ${imaging.renalArteryDiameter} mm ${arteryDiamOk ? '✓' : '✗ — out of catheter range'}`
      : 'Renal artery diameter not documented — required for catheter/balloon selection',
    critical: false,
  })

  // 4. No hemodynamically significant renal artery stenosis
  const noSignificantStenosis = (imaging.maxStenosisPercent ?? 0) < 50
  const hasSignificantStenosis = (imaging.maxStenosisPercent ?? 0) >= 50

  contraindications.push({
    criterion: 'Significant renal artery stenosis (≥50%)',
    met: hasSignificantStenosis,
    detail: imaging.maxStenosisPercent
      ? `Stenosis: ${imaging.maxStenosisPercent}% ${hasSignificantStenosis ? '— CONTRAINDICATED for RDN; consider stenting/PTA instead' : '✓ No significant stenosis'}`
      : 'Stenosis not assessed — renal duplex or CTA/MRA required before RDN',
    critical: true,
  })

  // 5. No prior renal artery intervention on target vessel
  if (profile.comorbidities.hasRenovascularHtn) {
    relativeContraindications.push({
      criterion: 'Prior renal artery stenting or intervention',
      met: true, // Flag for manual review
      detail: 'Renovascular HTN history noted — confirm whether renal artery stent is in place. Stented vessels are not candidates for RDN of that artery.',
      critical: true,
    })
  }

  // ── RENAL FUNCTION ────────────────────────────────────────────────────────
  const egfr = labs.egfr ?? 60

  if (egfr < 15) {
    contraindications.push({
      criterion: 'eGFR <15 mL/min/1.73m² (severe CKD / dialysis)',
      met: true,
      detail: `eGFR: ${egfr} mL/min — CONTRAINDICATED. Patients on dialysis or with eGFR <15 excluded from all RDN trials.`,
      critical: true,
    })
  } else if (egfr >= 15 && egfr < 30) {
    relativeContraindications.push({
      criterion: 'eGFR 15-30 mL/min/1.73m² (severe CKD)',
      met: true,
      detail: `eGFR: ${egfr} mL/min — relative contraindication. Limited data in severe CKD. Contrast use for angiography carries AKI risk. Consider CO2 angiography or minimize contrast.`,
    })
  } else {
    supportingCriteria.push({
      criterion: 'Adequate renal function (eGFR ≥30)',
      met: true,
      detail: `eGFR: ${egfr} mL/min/1.73m² — acceptable renal function for RDN`,
    })
  }

  // ── ACCESSORY RENAL ARTERIES ──────────────────────────────────────────────
  if (imaging.accessoryArteries) {
    relativeContraindications.push({
      criterion: 'Accessory renal arteries present',
      met: true,
      detail: 'Multiple renal arteries noted — denervation may be incomplete if accessory arteries not treated. SPYRAL system can treat multiple arteries. Case-by-case basis.',
    })
    notes.push('Accessory renal arteries: discuss with operator. SPYRAL Spyral system designed for multi-artery treatment.')
  }

  // ── SECONDARY HTN EXCLUSION ────────────────────────────────────────────────
  if (comorbidities.hasPrimaryAldosteronism) {
    prerequisites.push('Primary aldosteronism workup complete (if confirmed, treat surgically or with MRA before RDN consideration)')
  }
  if (comorbidities.hasPheochromocytoma) {
    contraindications.push({
      criterion: 'Pheochromocytoma — must treat first',
      met: true,
      detail: 'Active pheochromocytoma — surgical resection or alpha-blockade required before any procedural HTN therapy.',
      critical: true,
    })
  }

  // ── OTHER CONTRAINDICATIONS ────────────────────────────────────────────────
  if (comorbidities.isPregnant) {
    contraindications.push({
      criterion: 'Pregnancy',
      met: true,
      detail: 'Pregnancy — absolute contraindication to renal denervation.',
      critical: true,
    })
  }

  // ── PREREQUISITES ──────────────────────────────────────────────────────────
  if (!imaging.renalDuplexDone && !imaging.ctaOrMraDone) {
    prerequisites.push('Renal artery imaging (CTA renal arteries preferred — provides anatomical roadmap for RDN planning)')
  }
  if (!meds.adherenceConfirmed) {
    prerequisites.push('Confirm medication adherence (urine/blood toxicology screen, pill count, or supervised drug intake for 2-4 weeks)')
  }
  if (meds.antihypertensiveCount < 2) {
    prerequisites.push('Optimize medical therapy: ≥3 antihypertensive drug classes at maximum tolerated doses including thiazide-like diuretic')
  }
  if (!profile.imaging.renalDuplexDone) {
    prerequisites.push('Renal duplex ultrasound to screen for RAS before proceeding to more invasive imaging')
  }

  prerequisites.push('ABPM to confirm true (non-white-coat) uncontrolled HTN before scheduling')
  prerequisites.push('Discussion of risks/benefits with patient; informed consent documentation')

  // ── ELIGIBILITY DETERMINATION ──────────────────────────────────────────────
  const absoluteContraindications = contraindications.filter(c => c.met && c.critical)
  const coreCriteriaMet =
    bpUncontrolled && meetsMinMedCriteria && noSignificantStenosis && egfr >= 30

  const eligible = absoluteContraindications.length === 0 && coreCriteriaMet

  return {
    eligible,
    recommendationStrength: eligible
      ? meetsResistantMedCriteria
        ? 'CLASS_IIA_A'  // ESC 2024 IIa, Level A for resistant HTN
        : 'CLASS_IIA_B'  // FDA-approved pathway with ≥2 medications
      : undefined,
    primaryIndication: eligible
      ? meetsResistantMedCriteria
        ? 'Resistant hypertension (uncontrolled BP on ≥3 optimized antihypertensive drugs including diuretic) — ESC 2024 Class IIa, Level A'
        : 'Uncontrolled hypertension on ≥2 medications — FDA-approved indication (Recor Paradise System, 2023)'
      : undefined,
    supportingCriteria: supportingCriteria.filter(c => c.met),
    contraindications: contraindications.filter(c => c.met),
    relativeContraindications: relativeContraindications.filter(c => c.met),
    prerequisites,
    guidelineRefs: RDN_REFS,
    notes,
  }
}
