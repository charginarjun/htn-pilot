import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import { withAuth, ok, error } from '@/lib/api-middleware'

const CONDITIONS = [
  'DIABETES_TYPE1','DIABETES_TYPE2','PREDIABETES','CHRONIC_KIDNEY_DISEASE','END_STAGE_RENAL_DISEASE',
  'NEPHROTIC_SYNDROME','HEART_FAILURE_PRESERVED_EF','HEART_FAILURE_REDUCED_EF','CORONARY_ARTERY_DISEASE',
  'MYOCARDIAL_INFARCTION_HISTORY','ATRIAL_FIBRILLATION','STROKE_ISCHEMIC','TIA','PERIPHERAL_ARTERY_DISEASE',
  'AORTIC_ANEURYSM','OBSTRUCTIVE_SLEEP_APNEA','OBESITY','METABOLIC_SYNDROME','DYSLIPIDEMIA',
  'HYPOTHYROIDISM','HYPERTHYROIDISM','PRIMARY_ALDOSTERONISM','RENOVASCULAR_HYPERTENSION','CUSHINGS_SYNDROME',
  'PHEOCHROMOCYTOMA','PARAGANGLIOMA','COARCTATION_OF_AORTA','AORTIC_STENOSIS','CHRONIC_PAIN_SYNDROME',
  'DEPRESSION','ANXIETY','NSAID_USE_REGULAR','ALCOHOL_USE_DISORDER','STIMULANT_USE',
  'ORAL_CONTRACEPTIVE_USE','PREGNANCY_RELATED_HTN','AUTOIMMUNE_DISEASE','HYPERPARATHYROIDISM',
] as const

const schema = z.object({
  condition: z.enum(CONDITIONS),
  severity: z.string().optional(),
  icdCode: z.string().optional(),
  diagnosedDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export const POST = withAuth(async (req: NextRequest, auth, params) => {
  try {
    const patientId = params?.id
    if (!patientId) return error({ statusCode: 400, message: 'Patient ID required' } as never)

    const patient = await db.patient.findUnique({ where: { id: patientId }, select: { tenantId: true } })
    if (!patient) return error({ statusCode: 404, message: 'Patient not found' } as never)
    if (patient.tenantId !== auth.tenantId) return error({ statusCode: 403, message: 'Access denied' } as never)

    const body = schema.parse(await req.json())
    const comorbidity = await db.patientComorbidity.upsert({
      where: { patientId_condition: { patientId, condition: body.condition } },
      update: { isActive: true, severity: body.severity, icdCode: body.icdCode, notes: body.notes },
      create: {
        patientId,
        ...body,
        diagnosedDate: body.diagnosedDate ? new Date(body.diagnosedDate) : undefined,
        isActive: true,
      },
    })
    return ok(comorbidity, 201)
  } catch (err) {
    return error(err)
  }
})
