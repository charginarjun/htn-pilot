// ─── Percutaneous Transluminal Angioplasty (PTA) Eligibility Engine ──────────
// Primarily for fibromuscular dysplasia (FMD) — PTA is first-line over stenting
// Also: short-segment lesions where stenting may be deferred
//
// Guidelines:
// - ACC/AHA 2013 PAD Guidelines (FMD section)
// - ESC 2017 PAD Guidelines
// - AHA Scientific Statement on FMD (Olin et al. Circulation 2012)
// - ARCADIA Registry (2019) — largest FMD cohort
// ─────────────────────────────────────────────────────────────────────────────

import type { PatientProfile, EligibilityResult, EligibilityCriterion, GuidelineRef } from '../types'

const PTA_REFS: GuidelineRef[] = [
  {
    society: 'ACC/AHA',
    year: 2013,
    section: '2013 PAD Guideline, Section 9.2 — FMD and PTA',
    recommendationClass: 'I',
    evidenceLevel: 'B',
    text: 'PTA is recommended for FMD-related RAS (Class I, Level B). Stenting reserved for failed PTA.',
  },
  {
    society: 'ESC',
    year: 2017,
    section: 'ESC 2017 PAD Guidelines, Section 9.4 — FMD',
    recommendationClass: 'I',
    evidenceLevel: 'B',
    text: 'For FMD, balloon angioplasty without stenting is the recommended treatment.',
  },
]

export function assessPtaEligibility(profile: PatientProfile): EligibilityResult {
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

  // ── FMD CRITERIA (primary indication for PTA over stenting) ───────────────

  // Key distinguishing features of FMD:
  // - Younger patient (typically 20-50, predominantly women)
  // - "String of beads" appearance on CTA/MRA
  // - No atherosclerotic risk factors driving the lesion
  // - Non-ostial, mid-to-distal renal artery location
  const isFmdAge = profile.age < 50
  const isFmdSex = profile.sex === 'FEMALE'
  const isFmdLikely = isFmdAge && isFmdSex && maxStenosis > 0 && !comorbidities.hasDiabetes

  supportingCriteria.push({
    criterion: 'Fibromuscular Dysplasia (FMD) — primary indication for PTA',
    met: isFmdLikely,
    detail: isFmdLikely
      ? `Demographic profile consistent with FMD (age ${profile.age}, ${profile.sex}). Confirm "string of beads" appearance on CTA/MRA. FMD: PTA is Class I recommended (vs. stenting Class III for FMD).`
      : `Demographic profile (age ${profile.age}, ${profile.sex}) less typical for FMD. Atherosclerotic etiology more likely — see stenting eligibility if hemodynamically significant.`,
    critical: false,
  })

  // ── HEMODYNAMICALLY SIGNIFICANT STENOSIS ──────────────────────────────────

  supportingCriteria.push({
    criterion: 'Hemodynamically significant stenosis (≥60%)',
    met: maxStenosis >= 60,
    detail: maxStenosis > 0
      ? `Stenosis: ${maxStenosis}% (${imaging.stenosisSide ?? 'unspecified side'})`
      : 'Stenosis not yet characterized — imaging required',
    critical: true,
  })

  // ── SHORT-SEGMENT / NON-OSTIAL LESION (preferred for PTA without stenting) ─

  notes.push(
    'Lesion morphology matters: PTA most effective for focal/short-segment stenoses, medial FMD, non-ostial lesions. Ostial or diffuse atherosclerotic lesions → stenting preferred if revascularization needed.'
  )

  // ── UNCONTROLLED HTN ──────────────────────────────────────────────────────

  const bpUncontrolled = (profile.bp.avgOfficeSbp ?? 0) >= 130
  supportingCriteria.push({
    criterion: 'Uncontrolled hypertension despite antihypertensive therapy',
    met: bpUncontrolled,
    detail: `Current BP ${profile.bp.avgOfficeSbp ?? '--'}/${profile.bp.avgOfficeDbp ?? '--'} mmHg on ${meds.antihypertensiveCount} agent(s)`,
    critical: true,
  })

  // ── FMD CURE RATE NOTE ────────────────────────────────────────────────────
  if (isFmdLikely) {
    notes.push(
      'PTA for FMD: technical success rate >90%. BP cure (off all medications) in ~30-50% of cases; significant BP improvement in ~80-90%. Best outcomes in younger patients with shorter HTN duration.'
    )
    notes.push(
      'ARCADIA Registry: restenosis rate ~15% at 2 years for renal FMD. Repeat PTA (not stenting) is preferred for restenosis.'
    )
  }

  // ── CONTRAINDICATIONS ─────────────────────────────────────────────────────

  // Severe CKD
  if (egfr < 15) {
    contraindications.push({
      criterion: 'Severe renal impairment (eGFR <15) — contrast risk outweighs benefit',
      met: true,
      detail: `eGFR: ${egfr} mL/min/1.73m² — high contrast nephropathy risk. Consider deferring or alternative imaging/access strategy.`,
      critical: true,
    })
  }

  // No stenosis identified
  if (maxStenosis > 0 && maxStenosis < 60) {
    contraindications.push({
      criterion: 'Stenosis <60% — non-hemodynamically significant',
      met: true,
      detail: `${maxStenosis}% stenosis below threshold for revascularization consideration. Medical therapy preferred.`,
      critical: true,
    })
  }

  // Bilateral ostial atherosclerotic RAS — stenting preferred
  if (!isFmdLikely && maxStenosis >= 60) {
    relativeContraindications.push({
      criterion: 'Atherosclerotic ostial lesion — stenting preferred over PTA alone',
      met: true,
      detail: 'Ostial atherosclerotic RAS: high elastic recoil with PTA alone → stenting preferred. PTA may be performed as pre-dilatation before stent placement.',
    })
  }

  // ── PREREQUISITES ──────────────────────────────────────────────────────────
  if (!imaging.ctaOrMraDone) {
    prerequisites.push('CTA renal arteries (preferred for FMD — shows string of beads, lesion location, and branch vessels) or MRA if contrast allergy')
  }
  prerequisites.push('Confirm lesion morphology at diagnostic angiogram — PTA decision made at table based on findings')
  prerequisites.push('Baseline creatinine/eGFR within 7 days (contrast nephropathy risk assessment)')
  prerequisites.push('IV hydration pre/post procedure')
  prerequisites.push('Antiplatelet therapy: aspirin 81-325mg before and after procedure')
  if (isFmdLikely) {
    prerequisites.push('FMD workup: screen for intracranial FMD (CTA head/neck) — multivessel FMD common')
    prerequisites.push('Genetic testing referral if bilateral or multifocal FMD (COL4A1, ACE, fibrillin mutations)')
  }
  prerequisites.push('Surgical backup: notify vascular surgery if complex anatomy anticipated')

  // ── ELIGIBILITY ────────────────────────────────────────────────────────────
  const absoluteContraindications = contraindications.filter(c => c.met && c.critical)
  const eligible =
    absoluteContraindications.length === 0 &&
    maxStenosis >= 60 &&
    bpUncontrolled

  return {
    eligible,
    recommendationStrength: eligible
      ? isFmdLikely
        ? 'CLASS_I_B'    // FMD: Class I, Level B
        : 'CLASS_IIA_B'  // Atherosclerotic short-segment: Class IIa
      : undefined,
    primaryIndication: eligible
      ? isFmdLikely
        ? 'Fibromuscular dysplasia with hemodynamically significant RAS — PTA is first-line treatment (ACC/AHA Class I, Level B)'
        : `Renal artery stenosis (${maxStenosis}%) with uncontrolled HTN — PTA as initial revascularization strategy`
      : undefined,
    supportingCriteria: supportingCriteria.filter(c => c.met),
    contraindications: contraindications.filter(c => c.met),
    relativeContraindications: relativeContraindications.filter(c => c.met),
    prerequisites,
    guidelineRefs: PTA_REFS,
    notes,
  }
}
