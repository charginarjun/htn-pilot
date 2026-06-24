// ─── Clinical Engine Type Definitions ────────────────────────────────────────
// Shared types for the guideline-based clinical decision engine

export interface BpSummary {
  avgOfficeSbp?: number
  avgOfficeDbp?: number
  avgHomeSbp?: number
  avgHomeDbp?: number
  avgAbpmDaySbp?: number
  avgAbpmDayDbp?: number
  abpmPerformed?: boolean
}

export interface MedicationSummary {
  totalActive: number
  antihypertensiveCount: number
  drugClasses: string[]
  onThiazideLike: boolean         // Chlorthalidone or indapamide (preferred)
  onThiazide: boolean
  onAnyDiuretic: boolean
  onAce: boolean
  onArb: boolean
  onCcb: boolean
  onMineralocorticoidAntagonist: boolean // Spironolactone/eplerenone — 4th-line resistant
  onBetaBlocker: boolean
  onAlphaBlocker: boolean
  onDirectVasodilator: boolean          // Hydralazine/minoxidil — late resistant
  onCentralActing: boolean
  medicationsAtMaxDose: string[]
  adherenceConfirmed: boolean
}

export interface LabSummary {
  creatinine?: number
  egfr?: number
  potassium?: number
  sodium?: number
  aldosterone?: number
  reninActivity?: number
  reninDirect?: number
  aldosteroneReninRatio?: number
  plasmaMeta?: number         // Plasma metanephrines
  plasmaNormeta?: number      // Plasma normetanephrines
  tsh?: number
  morningCortisol?: number
  albuminCreatinineRatio?: number  // mg/g
  hba1c?: number
  totalCholesterol?: number
  ldl?: number
  hdl?: number
  triglycerides?: number
}

export interface ImagingSummary {
  renalDuplexDone: boolean
  ctaOrMraDone: boolean
  maxStenosisPercent?: number     // Max of left/right
  stenosisSide?: string
  renalArteryLength?: number      // mm — for RDN planning
  renalArteryDiameter?: number    // mm
  accessoryArteries?: boolean
  echoEf?: number
  echoLvmi?: number               // g/m²
  lvh?: boolean
}

export interface ComorbiditySummary {
  hasDiabetes: boolean
  hasCkd: boolean
  ckdStage?: string
  hasHeartFailure: boolean
  hasCoronaryArteryDisease: boolean
  hasStrokeOrTia: boolean
  hasAtrialFibrillation: boolean
  hasPeripheralArteryDisease: boolean
  hasSleepApnea: boolean
  hasObesity: boolean
  hasPrimaryAldosteronism: boolean
  hasRenovascularHtn: boolean
  hasPheochromocytoma: boolean
  hasCushings: boolean
  hasCoarctation: boolean
  hasThyroidDisease: boolean
  isPregnant: boolean
  priorCvEvent: boolean   // MI, stroke, PAD = very high risk
}

export interface PatientProfile {
  id: string
  age: number
  sex: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'
  bmi?: number
  bp: BpSummary
  medications: MedicationSummary
  labs: LabSummary
  imaging: ImagingSummary
  comorbidities: ComorbiditySummary
  smokingStatus?: string
  alcoholDrinksPerWeek?: number
  physicalActivityMinWk?: number
  dietaryNaclGDay?: number
  workupComplete: boolean
}

// ─── Engine Output Types ──────────────────────────────────────────────────────

export type HtnClassification =
  | 'NORMAL'
  | 'ELEVATED'
  | 'STAGE_1'
  | 'STAGE_2'
  | 'HYPERTENSIVE_CRISIS'

export type ResistanceCategory =
  | 'NOT_RESISTANT'          // BP controlled or <3 meds
  | 'POSSIBLE_RESISTANT'     // Criteria met but adherence unconfirmed
  | 'TRUE_RESISTANT'         // Criteria met + adherence confirmed + secondary excluded
  | 'REFRACTORY'             // Uncontrolled on ≥5 agents incl. MRA + diuretic

export interface HtnClassificationResult {
  classification: HtnClassification
  resistanceCategory: ResistanceCategory
  criteriaMetFor: string[]   // Which criteria support this classification
  criteriaNotMet: string[]   // Which criteria were not met
  clinicalBpValue: { sbp: number; dbp: number } // Effective BP used for classification
  bpSource: 'OFFICE' | 'HOME' | 'AMBULATORY' | 'AVERAGE'
}

export type CvRiskCategory = 'LOW' | 'BORDERLINE' | 'INTERMEDIATE' | 'HIGH' | 'VERY_HIGH'

export interface CvRiskResult {
  category: CvRiskCategory
  tenYearAscvdRisk?: number   // % from Pooled Cohort Equation
  highRiskConditions: string[] // DM, CKD3+, prior ASCVD, LDL≥190
  riskEnhancers: string[]      // Additional factors
}

export interface BpTarget {
  targetSbp: number
  targetDbp: number
  rationale: string
  guidelineRef: GuidelineRef
}

export interface GuidelineRef {
  society: 'ACC/AHA' | 'ESC' | 'JNC' | 'ISH' | 'KDIGO'
  year: number
  section?: string
  recommendationClass?: string   // I, IIa, IIb, III
  evidenceLevel?: string         // A, B-R, B-NR, C-LD, C-EO
  text?: string
}

export interface LifestyleIntervention {
  intervention: string
  detail: string
  expectedBpReductionSbp: string  // e.g., "4-11 mmHg"
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  guidelineRef: GuidelineRef
  applicable: boolean
  notApplicableReason?: string
}

export interface MedicationStep {
  step: number
  phase: string
  drugClassPrimary: string
  drugClassAlternative?: string
  preferredAgents: string[]
  avoidIn?: string[]             // e.g., "Avoid ACE in bilateral RAS"
  rationale: string
  guidelineRef: GuidelineRef
  bpReductionExpected?: string
}

export interface ManagementProtocolResult {
  recommendedPhase: string
  bpTarget: BpTarget
  lifestyleInterventions: LifestyleIntervention[]
  medicationSteps: MedicationStep[]
  currentStepAssessment: {
    currentStep: number
    nextStep?: number
    nextStepRationale?: string
    isAtMaxStep: boolean
  }
  monitoringPlan: {
    bpCheckIntervalWeeks: number
    labsNeeded: string[]
    labIntervalMonths: number
  }
  specialConsiderations: string[]
}

export interface EligibilityResult {
  eligible: boolean
  recommendationStrength?: string
  primaryIndication?: string
  supportingCriteria: EligibilityCriterion[]
  contraindications: EligibilityCriterion[]
  relativeContraindications: EligibilityCriterion[]
  prerequisites: string[]          // Must be done before procedure
  guidelineRefs: GuidelineRef[]
  notes: string[]
}

export interface EligibilityCriterion {
  criterion: string
  met: boolean
  detail?: string
  critical?: boolean               // If unmet/met, this alone determines eligibility
}

export interface SecondaryHtnFlag {
  condition: string
  likelihoodOfSecondary: 'HIGH' | 'MODERATE' | 'LOW'
  supportingEvidence: string[]
  recommendedWorkup: string[]
  urgency: 'URGENT' | 'ROUTINE'
}

export interface FullAssessmentResult {
  classification: HtnClassificationResult
  cvRisk: CvRiskResult
  secondaryHtnFlags: SecondaryHtnFlag[]
  managementProtocol: ManagementProtocolResult
  invasiveTherapy: {
    rdnEligibility: EligibilityResult
    stentingEligibility: EligibilityResult
    ptaEligibility: EligibilityResult
  }
  urgentFlags: string[]             // Immediate action required
  guidelineVersion: string
  assessedAt: Date
}
