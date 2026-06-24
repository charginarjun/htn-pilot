import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import { withAuth, ok, error } from '@/lib/api-middleware'

const schema = z.object({
  allergen: z.string().min(1).max(200),
  allergyType: z.enum(['DRUG', 'FOOD', 'ENVIRONMENTAL', 'LATEX', 'OTHER']).default('DRUG'),
  reaction: z.string().optional(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'ANAPHYLAXIS']).optional(),
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
    const allergy = await db.patientAllergy.create({ data: { patientId, ...body } })
    return ok(allergy, 201)
  } catch (err) {
    return error(err)
  }
})

export const DELETE = withAuth(async (req: NextRequest, auth, params) => {
  try {
    const patientId = params?.id
    if (!patientId) return error({ statusCode: 400, message: 'Patient ID required' } as never)

    const { allergyId } = await req.json()
    if (!allergyId) return error({ statusCode: 400, message: 'allergyId required' } as never)

    const allergy = await db.patientAllergy.findUnique({
      where: { id: allergyId },
      include: { patient: { select: { tenantId: true } } },
    })
    if (!allergy || allergy.patientId !== patientId) return error({ statusCode: 404, message: 'Allergy not found' } as never)
    if (allergy.patient.tenantId !== auth.tenantId) return error({ statusCode: 403, message: 'Access denied' } as never)

    await db.patientAllergy.update({ where: { id: allergyId }, data: { isActive: false } })
    return ok({ removed: true })
  } catch (err) {
    return error(err)
  }
})
