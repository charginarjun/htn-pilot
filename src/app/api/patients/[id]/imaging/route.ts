import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import { withAuth, ok, error } from '@/lib/api-middleware'

const IMAGING_TYPES = [
  'RENAL_DUPLEX_ULTRASOUND','CTA_RENAL_ARTERIES','MRA_RENAL_ARTERIES','RENAL_ANGIOGRAM',
  'ECHOCARDIOGRAM_TTE','ECHOCARDIOGRAM_TEE','CARDIAC_MRI','ADRENAL_CT','ADRENAL_MRI',
  'ABDOMINAL_ULTRASOUND','RENAL_ULTRASOUND','POLYSOMNOGRAPHY','AMBULATORY_BP_MONITOR',
  'ECG','CHEST_XRAY','CT_AORTA','FUNDUSCOPIC_EXAM',
] as const

const schema = z.object({
  studyDate: z.string().datetime(),
  studyType: z.enum(IMAGING_TYPES),
  indication: z.string().optional(),
  findings: z.string().optional(),
  impression: z.string().optional(),
  performingFacility: z.string().optional(),
  lvEjectionFraction: z.number().min(0).max(100).optional(),
  lvMassIndex: z.number().optional(),
  stenosisPercentLeft: z.number().min(0).max(100).optional(),
  stenosisPercentRight: z.number().min(0).max(100).optional(),
})

export const POST = withAuth(async (req: NextRequest, auth, params) => {
  try {
    const patientId = params?.id
    if (!patientId) return error({ statusCode: 400, message: 'Patient ID required' } as never)

    const patient = await db.patient.findUnique({ where: { id: patientId }, select: { tenantId: true } })
    if (!patient) return error({ statusCode: 404, message: 'Patient not found' } as never)
    if (patient.tenantId !== auth.tenantId) return error({ statusCode: 403, message: 'Access denied' } as never)

    const body = schema.parse(await req.json())
    const study = await db.imagingStudy.create({
      data: { patientId, ...body, studyDate: new Date(body.studyDate) },
    })
    return ok(study, 201)
  } catch (err) {
    return error(err)
  }
})
