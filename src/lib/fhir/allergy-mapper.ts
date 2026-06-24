// ─── FHIR AllergyIntolerance → HTN Pilot Medication Safety ────────────────────
// Maps EPIC allergies/intolerances to clinical contraindications that feed
// directly into the guideline engine and therapy eligibility assessments.
//
// CRITICAL: These directly impact:
//   - Medication step recommendations (cannot recommend an agent the patient is allergic to)
//   - Drug class substitutions (e.g., ACE cough → switch to ARB, NOT stop RAAS)
//   - Invasive therapy pre-procedure planning (contrast allergy → RDN/stenting protocols)
// ─────────────────────────────────────────────────────────────────────────────

// ─── FHIR AllergyIntolerance type ────────────────────────────────────────────

export interface FhirAllergyIntolerance {
  resourceType: 'AllergyIntolerance'
  id: string
  clinicalStatus?: { coding?: Array<{ code?: string }> }
  type?: 'allergy' | 'intolerance'
  category?: string[]   // 'medication', 'food', 'environment', 'biologic'
  criticality?: 'low' | 'high' | 'unable-to-assess'
  code?: {
    coding?: Array<{ system?: string; code?: string; display?: string }>
    text?: string
  }
  reaction?: Array<{
    manifestation: Array<{ text?: string; coding?: Array<{ display?: string }> }>
    severity?: 'mild' | 'moderate' | 'severe'
    description?: string
  }>
  note?: Array<{ text?: string }>
  recordedDate?: string
}

// ─── Processed allergy for HTN Pilot ─────────────────────────────────────────

export interface ProcessedAllergy {
  fhirId: string
  type: 'ALLERGY' | 'INTOLERANCE'
  criticality: 'LOW' | 'HIGH' | 'UNKNOWN'
  substance: string
  rxNormCode?: string
  snomedCode?: string
  reactions: string[]
  severity?: 'MILD' | 'MODERATE' | 'SEVERE'

  // Derived clinical flags — used by medication engine
  drugClassContraindicated?: string   // e.g., 'ACE_INHIBITOR'
  contraindication: boolean           // True = do not prescribe
  clinicalNote?: string               // Auto-generated guidance for clinician
}

// ─── Drug name/code → drug class mapping ─────────────────────────────────────
// RxNorm codes and common names for antihypertensive drug classes

const DRUG_TO_CLASS: Record<string, string> = {
  // ACE Inhibitors (ACE cough is an intolerance — switch to ARB, not remove RAAS)
  'lisinopril': 'ACE_INHIBITOR',
  'enalapril': 'ACE_INHIBITOR',
  'ramipril': 'ACE_INHIBITOR',
  'perindopril': 'ACE_INHIBITOR',
  'benazepril': 'ACE_INHIBITOR',
  'captopril': 'ACE_INHIBITOR',
  'fosinopril': 'ACE_INHIBITOR',
  'quinapril': 'ACE_INHIBITOR',
  'ace inhibitor': 'ACE_INHIBITOR',
  'angiotensin converting enzyme inhibitor': 'ACE_INHIBITOR',

  // ARBs
  'losartan': 'ARB',
  'valsartan': 'ARB',
  'olmesartan': 'ARB',
  'irbesartan': 'ARB',
  'telmisartan': 'ARB',
  'candesartan': 'ARB',
  'azilsartan': 'ARB',
  'angiotensin receptor blocker': 'ARB',
  'arb': 'ARB',

  // ARNIs
  'sacubitril': 'ARNI',
  'sacubitril/valsartan': 'ARNI',
  'entresto': 'ARNI',

  // CCBs (DHP)
  'amlodipine': 'CALCIUM_CHANNEL_BLOCKER_DHP',
  'nifedipine': 'CALCIUM_CHANNEL_BLOCKER_DHP',
  'felodipine': 'CALCIUM_CHANNEL_BLOCKER_DHP',
  'nicardipine': 'CALCIUM_CHANNEL_BLOCKER_DHP',
  'dihydropyridine': 'CALCIUM_CHANNEL_BLOCKER_DHP',

  // CCBs (non-DHP)
  'diltiazem': 'CALCIUM_CHANNEL_BLOCKER_NDHP',
  'verapamil': 'CALCIUM_CHANNEL_BLOCKER_NDHP',
  'non-dihydropyridine': 'CALCIUM_CHANNEL_BLOCKER_NDHP',

  // Thiazide-like
  'chlorthalidone': 'THIAZIDE_LIKE_DIURETIC',
  'indapamide': 'THIAZIDE_LIKE_DIURETIC',

  // Thiazide
  'hydrochlorothiazide': 'THIAZIDE_DIURETIC',
  'hctz': 'THIAZIDE_DIURETIC',
  'thiazide': 'THIAZIDE_DIURETIC',

  // Loop diuretics
  'furosemide': 'LOOP_DIURETIC',
  'torsemide': 'LOOP_DIURETIC',
  'bumetanide': 'LOOP_DIURETIC',
  'loop diuretic': 'LOOP_DIURETIC',

  // MRA
  'spironolactone': 'MINERALOCORTICOID_ANTAGONIST',
  'eplerenone': 'MINERALOCORTICOID_ANTAGONIST',
  'finerenone': 'MINERALOCORTICOID_ANTAGONIST',
  'mineralocorticoid antagonist': 'MINERALOCORTICOID_ANTAGONIST',
  'aldosterone antagonist': 'MINERALOCORTICOID_ANTAGONIST',

  // Beta-blockers
  'metoprolol': 'BETA_BLOCKER',
  'carvedilol': 'BETA_BLOCKER',
  'bisoprolol': 'BETA_BLOCKER',
  'atenolol': 'BETA_BLOCKER',
  'propranolol': 'BETA_BLOCKER',
  'nebivolol': 'BETA_BLOCKER',
  'labetalol': 'BETA_BLOCKER',
  'beta blocker': 'BETA_BLOCKER',
  'beta-blocker': 'BETA_BLOCKER',

  // Alpha-blockers
  'doxazosin': 'ALPHA_BLOCKER',
  'prazosin': 'ALPHA_BLOCKER',
  'terazosin': 'ALPHA_BLOCKER',
  'alpha blocker': 'ALPHA_BLOCKER',

  // Vasodilators
  'hydralazine': 'DIRECT_VASODILATOR',
  'minoxidil': 'DIRECT_VASODILATOR',

  // Central alpha agonists
  'clonidine': 'CENTRAL_ALPHA_AGONIST',
  'methyldopa': 'CENTRAL_ALPHA_AGONIST',
  'guanfacine': 'CENTRAL_ALPHA_AGONIST',

  // Contrast media (critical for RDN/stenting procedures)
  'iodinated contrast': 'CONTRAST_MEDIA',
  'contrast media': 'CONTRAST_MEDIA',
  'contrast dye': 'CONTRAST_MEDIA',
  'omnipaque': 'CONTRAST_MEDIA',
  'visipaque': 'CONTRAST_MEDIA',
  'isovue': 'CONTRAST_MEDIA',
  'ioversol': 'CONTRAST_MEDIA',
  'iohexol': 'CONTRAST_MEDIA',
  'gadolinium': 'GADOLINIUM',

  // NSAIDs — raise BP, interfere with antihypertensive therapy
  'ibuprofen': 'NSAID',
  'naproxen': 'NSAID',
  'aspirin': 'ASPIRIN',
  'nsaid': 'NSAID',
}

// ─── Clinical guidance by drug class intolerance ─────────────────────────────

const CLASS_INTOLERANCE_GUIDANCE: Record<string, string> = {
  ACE_INHIBITOR: 'ACE inhibitor intolerance documented (likely cough — most common). Substitute with ARB (equally effective, no cough). RAAS blockade should be maintained if indicated.',
  ARB: 'ARB intolerance documented. Check if ACE inhibitor tolerated. If RAAS required (CKD, HF, DM), consider ARNI (sacubitril/valsartan) after specialist review.',
  ARNI: 'ARNI (sacubitril/valsartan) intolerance. Use ACE inhibitor or ARB instead.',
  CALCIUM_CHANNEL_BLOCKER_DHP: 'DHP-CCB intolerance (e.g., amlodipine-induced edema). Consider switch to non-DHP CCB (diltiazem) if tolerated. Avoid non-DHP + beta-blocker (bradycardia risk).',
  CALCIUM_CHANNEL_BLOCKER_NDHP: 'Non-DHP CCB intolerance. Use DHP-CCB (amlodipine) instead. AVOID non-DHP CCB with beta-blocker — both contraindicated.',
  THIAZIDE_DIURETIC: 'Thiazide diuretic intolerance/allergy. Consider thiazide-like (chlorthalidone, indapamide) — different chemical structure, may be tolerated. Confirm with allergy specialist. If sulfa allergy component, use loop diuretic.',
  THIAZIDE_LIKE_DIURETIC: 'Thiazide-like diuretic intolerance. Use loop diuretic (furosemide/torsemide) if eGFR permits. Note: diuretic of some kind is required for resistant HTN management.',
  LOOP_DIURETIC: 'Loop diuretic intolerance. May still tolerate thiazide-like (different sulfonamide structure). Consult allergy/nephrology.',
  MINERALOCORTICOID_ANTAGONIST: 'MRA intolerance (spironolactone: gynecomastia, hyperkalemia). Try eplerenone (more selective, fewer hormonal side effects) or finerenone (if CKD/DM). MRA is the preferred 4th-line agent for resistant HTN — important to find a tolerated agent.',
  BETA_BLOCKER: 'Beta-blocker intolerance. Avoid entire class unless compelling indication (angina, post-MI, HFrEF — benefit may outweigh risk). Use carvedilol (alpha+beta) if bronchospasm not the issue.',
  ALPHA_BLOCKER: 'Alpha-blocker intolerance (orthostatic hypotension common). Avoid doxazosin/prazosin. Consider other 4th-line agents.',
  DIRECT_VASODILATOR: 'Direct vasodilator intolerance (hydralazine: lupus risk; minoxidil: fluid retention/hirsutism). Last-line agents — document clearly.',
  CENTRAL_ALPHA_AGONIST: 'Central alpha agonist intolerance (clonidine: rebound hypertension on withdrawal). Avoid abrupt discontinuation. Consider other classes.',
  CONTRAST_MEDIA: '⚠️ IODINATED CONTRAST ALLERGY — CRITICAL FOR PROCEDURES: RDN, renal artery stenting, and PTA all require contrast angiography. Pre-procedure steroid/antihistamine premedication protocol required. Consider CO2 angiography alternative. Flag for interventionalist BEFORE scheduling any cath lab procedure.',
  GADOLINIUM: 'Gadolinium allergy — avoid MRA with contrast (use CTA or non-contrast MRA). Relevant to renal artery imaging.',
  NSAID: 'NSAID use/allergy noted. Clinically important: NSAIDs raise BP by 3-5 mmHg and blunt antihypertensive drug effects. Document NSAIDs as a contributor to difficult-to-control HTN.',
  ASPIRIN: 'Aspirin intolerance. Alternative antiplatelet: clopidogrel 75mg daily (for post-procedure after RDN/stenting). Inform proceduralist.',
}

// ─── Main Mapper ──────────────────────────────────────────────────────────────

export function mapFhirAllergyToHtnPilot(fhirAllergy: FhirAllergyIntolerance): ProcessedAllergy {
  const substanceName = (
    fhirAllergy.code?.text ??
    fhirAllergy.code?.coding?.[0]?.display ??
    'Unknown substance'
  ).toLowerCase()

  const rxNormCode = fhirAllergy.code?.coding?.find(c => c.system?.includes('rxnorm'))?.code
  const snomedCode = fhirAllergy.code?.coding?.find(c => c.system?.includes('snomed'))?.code

  // Determine drug class
  const drugClass = DRUG_TO_CLASS[substanceName]
    ?? DRUG_TO_CLASS[substanceName.split(' ')[0] ?? '']
    ?? undefined

  // Reactions
  const reactions = fhirAllergy.reaction?.flatMap(r =>
    r.manifestation.map(m => m.text ?? m.coding?.[0]?.display ?? 'Reaction not specified')
  ) ?? []

  // Severity
  const severityMap: Record<string, 'MILD' | 'MODERATE' | 'SEVERE'> = {
    mild: 'MILD', moderate: 'MODERATE', severe: 'SEVERE',
  }
  const severity = fhirAllergy.reaction?.[0]?.severity
    ? severityMap[fhirAllergy.reaction[0].severity]
    : undefined

  // Criticality
  const criticalityMap: Record<string, 'LOW' | 'HIGH' | 'UNKNOWN'> = {
    low: 'LOW', high: 'HIGH', 'unable-to-assess': 'UNKNOWN',
  }

  const isContraindication =
    fhirAllergy.type === 'allergy' ||
    (severity === 'SEVERE') ||
    fhirAllergy.criticality === 'high' ||
    reactions.some(r => ['anaphylaxis', 'anaphylactic', 'severe', 'angioedema'].some(s => r.toLowerCase().includes(s)))

  const clinicalNote = drugClass ? CLASS_INTOLERANCE_GUIDANCE[drugClass] : undefined

  return {
    fhirId: fhirAllergy.id,
    type: fhirAllergy.type === 'allergy' ? 'ALLERGY' : 'INTOLERANCE',
    criticality: criticalityMap[fhirAllergy.criticality ?? 'unable-to-assess'] ?? 'UNKNOWN',
    substance: fhirAllergy.code?.text ?? fhirAllergy.code?.coding?.[0]?.display ?? 'Unknown',
    rxNormCode,
    snomedCode,
    reactions,
    severity,
    drugClassContraindicated: drugClass,
    contraindication: isContraindication,
    clinicalNote,
  }
}

// ─── Allergy Impact on Clinical Engine ────────────────────────────────────────

export interface AllergyImpactSummary {
  contraindicatedClasses: string[]      // Drug classes that cannot be used
  requiresPremedication: boolean        // Contrast allergy → need premedication protocol
  requiresCo2Angiography: boolean       // Severe contrast allergy → CO2 alternative
  requiresAlternativeAntiplatelet: boolean  // Aspirin allergy → clopidogrel
  clinicalNotes: string[]               // All allergy-derived guidance
  procedureFlags: string[]              // Flags specifically for cath lab team
}

export function summarizeAllergyImpact(allergies: ProcessedAllergy[]): AllergyImpactSummary {
  const contraindicatedClasses: string[] = []
  const clinicalNotes: string[] = []
  const procedureFlags: string[] = []
  let requiresPremedication = false
  let requiresCo2Angiography = false
  let requiresAlternativeAntiplatelet = false

  for (const allergy of allergies) {
    if (allergy.contraindication && allergy.drugClassContraindicated) {
      contraindicatedClasses.push(allergy.drugClassContraindicated)
    }

    if (allergy.clinicalNote) {
      clinicalNotes.push(`${allergy.substance}: ${allergy.clinicalNote}`)
    }

    if (allergy.drugClassContraindicated === 'CONTRAST_MEDIA') {
      if (allergy.severity === 'SEVERE' || allergy.criticality === 'HIGH') {
        requiresCo2Angiography = true
        procedureFlags.push('SEVERE contrast allergy — CO2 angiography required for RDN/stenting. No iodinated contrast.')
      } else {
        requiresPremedication = true
        procedureFlags.push('Contrast allergy — premedication required: methylprednisolone 32mg PO 12h and 2h before, diphenhydramine 50mg IV 1h before.')
      }
    }

    if (allergy.drugClassContraindicated === 'ASPIRIN') {
      requiresAlternativeAntiplatelet = true
      procedureFlags.push('Aspirin allergy — use clopidogrel 75mg daily for post-procedural antiplatelet therapy (RDN/stenting).')
    }
  }

  return {
    contraindicatedClasses: [...new Set(contraindicatedClasses)],
    requiresPremedication,
    requiresCo2Angiography,
    requiresAlternativeAntiplatelet,
    clinicalNotes,
    procedureFlags,
  }
}
