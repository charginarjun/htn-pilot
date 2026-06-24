import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import { withAuth, ok, created, paginated, getPaginationParams, error } from '@/lib/api-middleware'
import { auditLog, requireRole } from '@/lib/auth'

const createPatientSchema = z.object({
  mrn: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().datetime(),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  race: z.string().optional(),
  ethnicity: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  insuranceName: z.string().optional(),
  insuranceId: z.string().optional(),
})

// GET /api/patients — list patients for tenant
export const GET = withAuth(async (req, auth) => {
  try {
    const { page, pageSize, skip } = getPaginationParams(req)
    const url = new URL(req.url)
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')

    const where = {
      tenantId: auth.tenantId,
      isActive: true,
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { mrn: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    }

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          referrals: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, status: true, priority: true, createdAt: true },
          },
          _count: { select: { bpReadings: true, medications: true } },
        },
      }),
      db.patient.count({ where }),
    ])

    await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: 'READ', resource: 'patient', req })

    return paginated(patients, total, page, pageSize)
  } catch (err) {
    return error(err)
  }
})

// POST /api/patients — create patient
export const POST = withAuth(async (req, auth) => {
  try {
    requireRole(auth.role, 'MEDICAL_STAFF')

    const body = await req.json()
    const data = createPatientSchema.parse(body)

    // Check for duplicate MRN
    const existing = await db.patient.findUnique({
      where: { tenantId_mrn: { tenantId: auth.tenantId, mrn: data.mrn } },
    })
    if (existing) {
      return error({ statusCode: 409, message: `Patient with MRN ${data.mrn} already exists` })
    }

    const patient = await db.patient.create({
      data: {
        ...data,
        tenantId: auth.tenantId,
        dateOfBirth: new Date(data.dateOfBirth),
        createdById: auth.userId,
      },
    })

    await auditLog({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: 'CREATE',
      resource: 'patient',
      resourceId: patient.id,
      newValues: { mrn: data.mrn, name: `${data.firstName} ${data.lastName}` },
      req,
    })

    return created(patient)
  } catch (err) {
    return error(err)
  }
})
