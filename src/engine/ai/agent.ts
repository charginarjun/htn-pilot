// ─── HTN Pilot AI Agent — Powered by Anthropic Claude ────────────────────────
// Augments the deterministic clinical engine with:
// - Clinical narrative generation
// - Edge case reasoning
// - Patient-specific nuance beyond rule-based logic
// - Cited guideline references
// - Physician-ready summary reports
//
// ARCHITECTURE: Deterministic engine runs FIRST. Claude augments — never overrides.
// All AI outputs are flagged for physician review before becoming actionable.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import type { FullAssessmentResult, PatientProfile } from '../types'

const API_KEY = process.env['ANTHROPIC_API_KEY'] ?? ''
const AI_ENABLED = API_KEY.startsWith('sk-ant-') && API_KEY.length > 20

const anthropic = AI_ENABLED
  ? new Anthropic({ apiKey: API_KEY })
  : null

const MODEL = process.env['ANTHROPIC_MODEL'] ?? 'claude-opus-4-8'
const FAST_MODEL = process.env['ANTHROPIC_MODEL_FAST'] ?? 'claude-haiku-4-5-20251001'

// ─── Agent Input / Output Types ───────────────────────────────────────────────

export interface AgentAssessmentInput {
  patient: PatientProfile
  deterministicResult: FullAssessmentResult
  guidelineVersion: string
}

export interface AgentAssessmentOutput {
  clinicalSummary: string
  keyFindings: KeyFinding[]
  structuredRecommendations: StructuredRecommendation[]
  guidelineConflicts: GuidelineConflict[]
  patientFacingSummary: string
  urgencyLevel: 'ROUTINE' | 'URGENT' | 'EMERGENT'
  confidenceScore: number
  modelUsed: string
  tokensUsed: number
}

export interface KeyFinding {
  category: 'BP_CONTROL' | 'MEDICATION' | 'SECONDARY_HTN' | 'ORGAN_DAMAGE' | 'CV_RISK' | 'LIFESTYLE' | 'PROCEDURE_ELIGIBILITY'
  finding: string
  significance: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFORMATIONAL'
  actionRequired: boolean
  guidelineRef?: string
}

export interface StructuredRecommendation {
  priority: number           // 1 = highest
  category: string
  recommendation: string
  rationale: string
  guidelineRef: string
  timeframe: string          // 'Immediately' | 'Within 1 week' | 'Next visit' | etc.
  responsibleParty: string   // 'Physician' | 'Coordinator' | 'Patient'
}

export interface GuidelineConflict {
  topic: string
  accAhaPosition: string
  escPosition: string
  recommendation: string     // What HTN Pilot recommends given the conflict
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert clinical cardiologist and hypertension specialist AI assistant embedded in HTN Pilot, a clinical decision support system for hypertension management and invasive therapy selection.

Your role is to:
1. Synthesize patient data and deterministic guideline-engine findings into a clear clinical narrative
2. Identify nuances and edge cases that rule-based logic may miss
3. Resolve conflicts between ACC/AHA 2018/2023 and ESC 2024 guidelines for the specific patient
4. Generate physician-ready clinical summaries with guideline citations
5. Provide structured recommendations with clear priorities and rationale

CRITICAL RULES:
- You AUGMENT the deterministic engine. You do NOT override it.
- Always cite specific guidelines (e.g., "ACC/AHA 2018 Section 9.3, Class I Level A")
- Flag uncertainty explicitly — do not extrapolate beyond available data
- If data is missing, state what additional information is needed
- All recommendations are ADVISORY and require physician review before implementation
- Never make absolute statements about contraindications without noting clinical judgment is required

OUTPUT FORMAT: You must respond with valid JSON matching the specified schema. Do not include any text outside the JSON.`

// ─── Main Agent Function ──────────────────────────────────────────────────────

export async function runClinicalAiAgent(
  input: AgentAssessmentInput,
): Promise<AgentAssessmentOutput> {
  // Graceful fallback when no API key is configured
  if (!AI_ENABLED || !anthropic) {
    return {
      clinicalSummary: 'AI narrative unavailable — Anthropic API key not configured. The deterministic clinical engine findings above are complete and guideline-based. Add your ANTHROPIC_API_KEY to .env to enable AI-generated narratives.',
      keyFindings: [],
      structuredRecommendations: [],
      guidelineConflicts: [],
      patientFacingSummary: 'Your clinical assessment has been completed using guideline-based analysis. Your care team will review the findings.',
      urgencyLevel: 'ROUTINE',
      confidenceScore: 0,
      modelUsed: 'none',
      tokensUsed: 0,
    }
  }

  const { patient, deterministicResult, guidelineVersion } = input
  const startTime = Date.now()

  // Build the clinical context prompt
  const userPrompt = buildClinicalPrompt(patient, deterministicResult, guidelineVersion)

  // Define the output schema
  const outputSchema = buildOutputSchema()

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    tools: [
      {
        name: 'generate_clinical_assessment',
        description: 'Generate a structured clinical assessment for this hypertension patient',
        input_schema: outputSchema,
      },
    ],
    tool_choice: { type: 'auto' },
  })

  const processingTime = Date.now() - startTime
  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

  // Extract tool use result
  const toolUse = response.content.find(block => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('AI agent did not return structured assessment')
  }

  const result = toolUse.input as AgentAssessmentOutput
  result.modelUsed = MODEL
  result.tokensUsed = tokensUsed

  return result
}

// ─── Prompt Builder ────────────────────────────────────────────────────────────

function buildClinicalPrompt(
  patient: PatientProfile,
  det: FullAssessmentResult,
  guidelineVersion: string,
): string {
  const bp = det.classification.clinicalBpValue
  const meds = patient.medications
  const labs = patient.labs
  const imaging = patient.imaging
  const comorbidities = patient.comorbidities

  return `
## PATIENT CLINICAL DATA

**Demographics**: ${patient.age} year old ${patient.sex}, BMI ${patient.bmi?.toFixed(1) ?? 'not recorded'} kg/m²

**Blood Pressure**:
- Clinical BP: ${bp.sbp}/${bp.dbp} mmHg (source: ${det.classification.bpSource})
- Office avg: ${patient.bp.avgOfficeSbp ?? 'N/A'}/${patient.bp.avgOfficeDbp ?? 'N/A'} mmHg
- Home avg: ${patient.bp.avgHomeSbp ?? 'N/A'}/${patient.bp.avgHomeDbp ?? 'N/A'} mmHg
- ABPM daytime: ${patient.bp.avgAbpmDaySbp ?? 'N/A'}/${patient.bp.avgAbpmDayDbp ?? 'N/A'} mmHg
- ABPM performed: ${patient.bp.abpmPerformed ? 'Yes' : 'No'}

**Antihypertensive Medications** (${meds.antihypertensiveCount} agents):
- Drug classes: ${meds.drugClasses.join(', ') || 'None'}
- On diuretic: ${meds.onAnyDiuretic ? `Yes (thiazide-like: ${meds.onThiazideLike ? 'Yes' : 'No'})` : 'No'}
- On ACE/ARB: ${meds.onAce || meds.onArb ? 'Yes' : 'No'}
- On CCB: ${meds.onCcb ? 'Yes' : 'No'}
- On MRA (spironolactone/eplerenone): ${meds.onMineralocorticoidAntagonist ? 'Yes' : 'No'}
- Adherence confirmed: ${meds.adherenceConfirmed ? 'Yes' : 'Not confirmed'}

**Key Laboratory Values**:
- eGFR: ${labs.egfr ?? 'N/A'} mL/min/1.73m²
- Creatinine: ${labs.creatinine ?? 'N/A'} mg/dL
- Potassium: ${labs.potassium ?? 'N/A'} mEq/L
- Sodium: ${labs.sodium ?? 'N/A'} mEq/L
- Aldosterone-Renin Ratio: ${labs.aldosteroneReninRatio ?? 'Not done'} ${labs.aldosteroneReninRatio ? '(threshold ≥30 ng/dL per ng/mL/h)' : ''}
- Plasma Metanephrines: ${labs.plasmaMeta ?? 'Not done'}
- TSH: ${labs.tsh ?? 'Not done'}
- HbA1c: ${labs.hba1c ?? 'N/A'}%
- LDL: ${labs.ldl ?? 'N/A'} mg/dL
- Albumin-Creatinine Ratio: ${labs.albuminCreatinineRatio ?? 'N/A'} mg/g

**Imaging**:
- Renal duplex ultrasound: ${imaging.renalDuplexDone ? 'Done' : 'Not done'}
- CTA/MRA renal arteries: ${imaging.ctaOrMraDone ? 'Done' : 'Not done'}
- Renal artery stenosis: ${imaging.maxStenosisPercent ? `${imaging.maxStenosisPercent}% (${imaging.stenosisSide})` : 'Not identified / not assessed'}
- Renal artery length: ${imaging.renalArteryLength ?? 'N/A'} mm | Diameter: ${imaging.renalArteryDiameter ?? 'N/A'} mm
- Accessory arteries: ${imaging.accessoryArteries ? 'Yes' : 'None identified / not assessed'}
- Echo EF: ${imaging.echoEf ?? 'N/A'}% | LV Mass Index: ${imaging.echoLvmi ?? 'N/A'} g/m²
- LVH: ${imaging.lvh ? 'Present' : 'Absent/Not assessed'}

**Comorbidities**:
${Object.entries(comorbidities).filter(([, v]) => v === true).map(([k]) => `- ${formatComorbidity(k)}`).join('\n') || '- None documented'}

**Lifestyle**:
- Smoking: ${patient.smokingStatus ?? 'Not documented'}
- Alcohol: ${patient.alcoholDrinksPerWeek ?? 'N/A'} drinks/week
- Physical activity: ${patient.physicalActivityMinWk ?? 'N/A'} min/week
- Dietary sodium: ${patient.dietaryNaclGDay ?? 'N/A'} g/day

---

## DETERMINISTIC ENGINE FINDINGS (Guidelines: ${guidelineVersion})

**HTN Classification**: ${det.classification.classification} | Resistance: ${det.classification.resistanceCategory}
- Criteria met: ${det.classification.criteriaMetFor.join('; ')}
- Not met: ${det.classification.criteriaNotMet.join('; ')}

**CV Risk**: ${det.cvRisk.category}
- High-risk conditions: ${det.cvRisk.highRiskConditions.join(', ') || 'None'}
- Risk enhancers: ${det.cvRisk.riskEnhancers.join(', ') || 'None'}

**BP Target**: ${det.managementProtocol.bpTarget.targetSbp}/${det.managementProtocol.bpTarget.targetDbp} mmHg
- Rationale: ${det.managementProtocol.bpTarget.rationale}

**Current Management Phase**: ${det.managementProtocol.recommendedPhase}

**Secondary HTN Flags** (${det.secondaryHtnFlags.length} identified):
${det.secondaryHtnFlags.map(f => `- [${f.likelihoodOfSecondary}] ${f.condition}: ${f.supportingEvidence[0]}`).join('\n') || '- None flagged'}

**Invasive Therapy Eligibility**:
- Renal Denervation (RDN): ${det.invasiveTherapy.rdnEligibility.eligible ? '✅ ELIGIBLE' : '❌ Not eligible at this time'}
  ${det.invasiveTherapy.rdnEligibility.eligible ? `Strength: ${det.invasiveTherapy.rdnEligibility.recommendationStrength}` : `Barriers: ${[...det.invasiveTherapy.rdnEligibility.contraindications, ...det.invasiveTherapy.rdnEligibility.prerequisites].slice(0, 2).map(c => typeof c === 'string' ? c : c.detail).join('; ')}`}
- Renal Artery Stenting: ${det.invasiveTherapy.stentingEligibility.eligible ? '✅ ELIGIBLE' : '❌ Not eligible at this time'}
- PTA: ${det.invasiveTherapy.ptaEligibility.eligible ? '✅ ELIGIBLE' : '❌ Not eligible at this time'}

**Urgent Flags**: ${det.urgentFlags.length > 0 ? det.urgentFlags.join(' | ') : 'None'}

---

## YOUR TASK

Based on ALL of the above data, generate a comprehensive clinical assessment using the generate_clinical_assessment tool. Be specific, cite guidelines, and flag where ACC/AHA and ESC guidelines differ for this patient. Resolve conflicts using clinical judgment and patient-specific factors.

Prioritize recommendations by clinical urgency and potential BP reduction. Identify any clinical gaps not addressed by the deterministic engine.
`
}

function formatComorbidity(key: string): string {
  const map: Record<string, string> = {
    hasDiabetes: 'Diabetes mellitus',
    hasCkd: 'Chronic kidney disease',
    hasHeartFailure: 'Heart failure',
    hasCoronaryArteryDisease: 'Coronary artery disease',
    hasStrokeOrTia: 'Stroke / TIA',
    hasAtrialFibrillation: 'Atrial fibrillation',
    hasPeripheralArteryDisease: 'Peripheral artery disease',
    hasSleepApnea: 'Obstructive sleep apnea',
    hasObesity: 'Obesity',
    hasPrimaryAldosteronism: 'Primary aldosteronism',
    hasRenovascularHtn: 'Renovascular hypertension',
    hasPheochromocytoma: 'Pheochromocytoma',
    hasCushings: "Cushing's syndrome",
    hasCoarctation: 'Coarctation of aorta',
    hasThyroidDisease: 'Thyroid disease',
    isPregnant: 'PREGNANCY',
    priorCvEvent: 'Prior CV event (MI/stroke/PAD)',
  }
  return map[key] ?? key
}

// ─── Output Schema ────────────────────────────────────────────────────────────

function buildOutputSchema(): Anthropic.Tool['input_schema'] {
  return {
    type: 'object' as const,
    properties: {
      clinicalSummary: {
        type: 'string',
        description: '2-3 paragraph clinical narrative summarizing the patient\'s hypertension status, key findings, management assessment, and recommendations for the physician. Professional medical tone.',
      },
      keyFindings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['BP_CONTROL', 'MEDICATION', 'SECONDARY_HTN', 'ORGAN_DAMAGE', 'CV_RISK', 'LIFESTYLE', 'PROCEDURE_ELIGIBILITY'] },
            finding: { type: 'string' },
            significance: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MODERATE', 'INFORMATIONAL'] },
            actionRequired: { type: 'boolean' },
            guidelineRef: { type: 'string' },
          },
          required: ['category', 'finding', 'significance', 'actionRequired'],
        },
      },
      structuredRecommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            priority: { type: 'number' },
            category: { type: 'string' },
            recommendation: { type: 'string' },
            rationale: { type: 'string' },
            guidelineRef: { type: 'string' },
            timeframe: { type: 'string' },
            responsibleParty: { type: 'string' },
          },
          required: ['priority', 'category', 'recommendation', 'rationale', 'guidelineRef', 'timeframe', 'responsibleParty'],
        },
      },
      guidelineConflicts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
            accAhaPosition: { type: 'string' },
            escPosition: { type: 'string' },
            recommendation: { type: 'string' },
          },
          required: ['topic', 'accAhaPosition', 'escPosition', 'recommendation'],
        },
      },
      patientFacingSummary: {
        type: 'string',
        description: '1-2 sentences in plain language for the patient — what are the main findings and what needs to happen next. No medical jargon.',
      },
      urgencyLevel: {
        type: 'string',
        enum: ['ROUTINE', 'URGENT', 'EMERGENT'],
        description: 'ROUTINE: standard follow-up. URGENT: needs attention within days. EMERGENT: immediate action required.',
      },
      confidenceScore: {
        type: 'number',
        description: '0.0-1.0 confidence in the assessment based on data completeness and clinical complexity.',
      },
    },
    required: [
      'clinicalSummary',
      'keyFindings',
      'structuredRecommendations',
      'guidelineConflicts',
      'patientFacingSummary',
      'urgencyLevel',
      'confidenceScore',
    ],
  }
}

// ─── Quick Summary Agent (lightweight, uses fast model) ───────────────────────

export async function generateQuickSummary(
  patient: { age: number; bpSbp: number; bpDbp: number; medCount: number },
  finding: string,
): Promise<string> {
  if (!AI_ENABLED || !anthropic) return finding

  const response = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Patient: ${patient.age}yo, BP ${patient.bpSbp}/${patient.bpDbp} mmHg, on ${patient.medCount} antihypertensives. Key finding: ${finding}. Provide a 1-sentence clinical note for the coordinator queue.`,
      },
    ],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  return textBlock && textBlock.type === 'text' ? textBlock.text : finding
}
