import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import { withAuth, ok, error } from '@/lib/api-middleware'

const DRUG_CLASSES = [
  'ACE_INHIBITOR','ARB','ARNI','CALCIUM_CHANNEL_BLOCKER_DHP','CALCIUM_CHANNEL_BLOCKER_NDHP',
  'THIAZIDE_DIURETIC','THIAZIDE_LIKE_DIURETIC','LOOP_DIURETIC','POTASSIUM_SPARING_DIURETIC',
  'MINERALOCORTICOID_ANTAGONIST','BETA_BLOCKER','ALPHA_BLOCKER','CENTRAL_ALPHA_AGONIST',
  'DIRECT_VASODILATOR','RENIN_INHIBITOR','OTHER',
] as const

const schema = z.object({
  genericName: z.string().min(1).max(200),
  brandName: z.string().optional(),
  drugClass: z.enum(DRUG_CLASSES).optional(),
  doseValue: z.number().positive().optional(),
  doseUnit: z.string().optional(),
  frequency: z.string().min(1),
  adherence: z.enum(['ADHERENT','PARTIALLY_ADHERENT','NON_ADHERENT','UNKNOWN']).optional(),
  isAtMaxDose: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
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
    const med = await db.patientMedication.create({
      data: {
        patientId,
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        isActive: true,
      },
    })
    return ok(med, 201)
  } catch (err) {
    return error(err)
  }
})

export const DELETE = withAuth(async (req: NextRequest, auth, params) => {
  try {
    const patientId = params?.id
    if (!patientId) return error({ statusCode: 400, message: 'Patient ID required' } as never)

    const { medicationId } = await req.json()
    if (!medicationId) return error({ statusCode: 400, message: 'medicationId required' } as never)

    const med = await db.patientMedication.findUnique({
      where: { id: medicationId },
      include: { patient: { select: { tenantId: true } } },
    })
    if (!med || med.patientId !== patientId) return error({ statusCode: 404, message: 'Medication not found' } as never)
    if (med.patient.tenantId !== auth.tenantId) return error({ statusCode: 403, message: 'Access denied' } as never)

    await db.patientMedication.update({ where: { id: medicationId }, data: { isActive: false } })
    return ok({ discontinued: true })
  } catch (err) {
    return error(err)
  }
})
