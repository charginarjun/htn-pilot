import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import { withAuth, ok, error } from '@/lib/api-middleware'

const schema = z.object({
  readingDate: z.string().datetime(),
  readingType: z.enum(['OFFICE', 'HOME', 'AMBULATORY_DAYTIME', 'AMBULATORY_NIGHTTIME', 'AMBULATORY_24H_AVG']),
  sbp: z.number().int().min(50).max(300),
  dbp: z.number().int().min(30).max(200),
  heartRate: z.number().int().min(20).max(300).optional(),
  arm: z.enum(['LEFT', 'RIGHT', 'BOTH']).optional(),
  position: z.enum(['SITTING', 'STANDING', 'SUPINE']).optional(),
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
    const reading = await db.bpReading.create({
      data: { patientId, ...body, readingDate: new Date(body.readingDate) },
    })
    return ok(reading, 201)
  } catch (err) {
    return error(err)
  }
})
