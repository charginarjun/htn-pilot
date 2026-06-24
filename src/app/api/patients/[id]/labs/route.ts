import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import { withAuth, ok, error } from '@/lib/api-middleware'

const LAB_TYPES = [
  'SODIUM','POTASSIUM','CHLORIDE','BICARBONATE','CREATININE','BUN','EGFR','GLUCOSE','CALCIUM','MAGNESIUM','URIC_ACID',
  'TOTAL_CHOLESTEROL','LDL_CHOLESTEROL','HDL_CHOLESTEROL','NON_HDL_CHOLESTEROL','TRIGLYCERIDES','APOLIPOPROTEIN_B',
  'PLASMA_ALDOSTERONE','PLASMA_RENIN_ACTIVITY','PLASMA_RENIN_DIRECT','ALDOSTERONE_RENIN_RATIO',
  'PLASMA_METANEPHRINES','PLASMA_NORMETANEPHRINES','URINE_METANEPHRINES_24H','URINE_CATECHOLAMINES_24H','URINE_VMA_24H',
  'TSH','FREE_T4','FREE_T3',
  'CORTISOL_AM','CORTISOL_PM','DEXAMETHASONE_SUPPRESSION','URINE_FREE_CORTISOL_24H','ACTH',
  'URINE_MICROALBUMIN','URINE_ALBUMIN_CREATININE_RATIO','URINE_PROTEIN_CREATININE_RATIO','URINE_SODIUM_24H',
  'HEMOGLOBIN','HEMATOCRIT','WBC','PLATELETS',
  'BNP','NT_PROBNP','TROPONIN_I','TROPONIN_T',
  'HBA1C','INSULIN_FASTING','HOMOCYSTEINE','HSCRP',
] as const

const schema = z.object({
  labDate: z.string().datetime(),
  labType: z.enum(LAB_TYPES),
  numericValue: z.number().optional(),
  unit: z.string().optional(),
  isAbnormal: z.boolean().optional(),
  notes: z.string().optional(),
  performingLab: z.string().optional(),
})

export const POST = withAuth(async (req: NextRequest, auth, params) => {
  try {
    const patientId = params?.id
    if (!patientId) return error({ statusCode: 400, message: 'Patient ID required' } as never)

    const patient = await db.patient.findUnique({ where: { id: patientId }, select: { tenantId: true } })
    if (!patient) return error({ statusCode: 404, message: 'Patient not found' } as never)
    if (patient.tenantId !== auth.tenantId) return error({ statusCode: 403, message: 'Access denied' } as never)

    const body = schema.parse(await req.json())
    const lab = await db.labResult.create({
      data: { patientId, ...body, labDate: new Date(body.labDate) },
    })
    return ok(lab, 201)
  } catch (err) {
    return error(err)
  }
})
