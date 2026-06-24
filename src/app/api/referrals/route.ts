import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import { withAuth, ok, created, error, getPaginationParams } from '@/lib/api-middleware'
import { auditLog } from '@/lib/auth'

const createReferralSchema = z.object({
  patientId: z.string().min(1),
  referringProvider: z.string().optional(),
  referringFacility: z.string().optional(),
  chiefComplaint: z.string().optional(),
  referralNotes: z.string().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'ROUTINE']).default('ROUTINE'),
})

// GET /api/referrals — list referrals for tenant
export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    const { page, pageSize, skip } = getPaginationParams(req)
    const url = new URL(req.url)
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')

    const where = {
      tenantId: auth.tenantId,
      ...(status ? { status: status as never } : {}),
      ...(search ? {
        OR: [
          { patient: { firstName: { contains: search, mode: 'insensitive' as const } } },
          { patient: { lastName: { contains: search, mode: 'insensitive' as const } } },
          { patient: { mrn: { contains: search, mode: 'insensitive' as const } } },
          { referringProvider: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    }

    const referrals = await db.referral.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            sex: true,
            bpReadings: { orderBy: { readingDate: 'desc' }, take: 1 },
            medications: { where: { isActive: true }, select: { id: true } },
          },
        },
      },
    })

    await auditLog({ tenantId: auth.tenantId, userId: auth.userId, action: 'READ', resource: 'referral', req })

    return ok(referrals)
  } catch (err) {
    return error(err)
  }
})

// POST /api/referrals — create referral
export const POST = withAuth(async (req: NextRequest, auth) => {
  try {
    const body = await req.json()
    const data = createReferralSchema.parse(body)

    // Verify patient belongs to this tenant
    const patient = await db.patient.findUnique({ where: { id: data.patientId } })
    if (!patient || patient.tenantId !== auth.tenantId) {
      return error({ statusCode: 404, message: 'Patient not found' })
    }

    // Generate referral number
    const count = await db.referral.count({ where: { tenantId: auth.tenantId } })
    const referralNumber = `REF-${String(count + 1).padStart(4, '0')}`

    const referral = await db.referral.create({
      data: {
        tenantId: auth.tenantId,
        patientId: data.patientId,
        referralNumber,
        referringProvider: data.referringProvider,
        referringFacility: data.referringFacility,
        chiefComplaint: data.chiefComplaint,
        referralNotes: data.referralNotes,
        priority: data.priority as never,
        createdById: auth.userId,
      },
      include: {
        patient: { select: { id: true, mrn: true, firstName: true, lastName: true } },
      },
    })

    await auditLog({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: 'CREATE',
      resource: 'referral',
      resourceId: referral.id,
      req,
    })

    return created(referral)
  } catch (err) {
    return error(err)
  }
})
