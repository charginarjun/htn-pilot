import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import { verifyPassword, signAccessToken, signRefreshToken, type TokenPayload } from '@/lib/auth'
import { ok, error } from '@/lib/api-middleware'
import { auditLog } from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = loginSchema.parse(body)

    const user = await db.user.findUnique({
      where: { email },
      include: { tenant: { select: { id: true, name: true, plan: true, aiAssessmentsEnabled: true } } },
    })

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials')
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      await auditLog({ tenantId: user.tenantId, action: 'LOGIN', resource: 'user', resourceId: user.id, req })
      throw new Error('Invalid credentials')
    }

    const payload: TokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    // Store refresh token
    await db.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.headers.get('x-forwarded-for') ?? 'unknown',
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })

    // Update last login
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    await auditLog({ tenantId: user.tenantId, userId: user.id, action: 'LOGIN', resource: 'user', resourceId: user.id, req })

    return ok({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        tenant: user.tenant,
      },
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid credentials') {
      const { error: errorFn } = await import('@/lib/api-middleware')
      return errorFn({ statusCode: 401, message: 'Invalid email or password' })
    }
    return error(err)
  }
}
