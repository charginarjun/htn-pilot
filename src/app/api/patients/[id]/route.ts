import { NextRequest } from 'next/server'
import db from '@/lib/db'
import { withAuth, ok, error } from '@/lib/api-middleware'
import { auditLog } from '@/lib/auth'

// GET /api/patients/[id] — fetch single patient with full clinical data
export const GET = withAuth(async (req: NextRequest, auth, params) => {
  try {
    const patientId = params?.id
    if (!patientId) return error({ statusCode: 400, message: 'Patient ID required' } as never)

    const patient = await db.patient.findUnique({
      where: { id: patientId },
      include: {
        bpReadings: { orderBy: { readingDate: 'desc' }, take: 20 },
        medications: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
        labResults: { orderBy: { labDate: 'desc' } },
        imagingStudies: { orderBy: { studyDate: 'desc' }, take: 10 },
        comorbidities: { where: { isActive: true } },
        referrals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { workup: true },
        },
      },
    })

    if (!patient) return error({ statusCode: 404, message: `Patient not found (id: ${patientId})` } as never)
    if (patient.tenantId !== auth.tenantId) {
      return error({ statusCode: 403, message: 'Access denied' } as never)
    }

    await auditLog({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: 'READ',
      resource: 'patient',
      resourceId: patientId,
      req,
    })

    return ok(patient)
  } catch (err) {
    return error(err)
  }
})
