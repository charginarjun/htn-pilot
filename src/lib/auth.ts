// ─── Auth Utilities ───────────────────────────────────────────────────────────

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import db from './db'

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production'
const ACCESS_EXPIRES = process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m'
const REFRESH_EXPIRES = process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d'

export interface TokenPayload {
  userId: string
  tenantId: string
  role: string
  email: string
}

// ─── Password Utilities ───────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ─── JWT Utilities ────────────────────────────────────────────────────────────

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions)
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions)
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}

// ─── Request Authentication ────────────────────────────────────────────────────

export interface AuthContext {
  userId: string
  tenantId: string
  role: string
  email: string
}

export async function authenticateRequest(req: NextRequest): Promise<AuthContext> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, 'No authorization token provided')
  }

  const token = authHeader.slice(7)
  let payload: TokenPayload

  try {
    payload = verifyToken(token)
  } catch {
    throw new ApiError(401, 'Invalid or expired token')
  }

  // Verify user still exists and is active
  const user = await db.user.findFirst({
    where: { id: payload.userId, tenantId: payload.tenantId, isActive: true },
    select: { id: true, tenantId: true, role: true, email: true },
  })

  if (!user) {
    throw new ApiError(401, 'User not found or deactivated')
  }

  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  }
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────

export const ROLE_HIERARCHY = {
  SUPER_ADMIN: 100,
  TENANT_ADMIN: 80,
  PHYSICIAN: 70,
  NP_PA: 60,
  COORDINATOR: 40,
  MEDICAL_STAFF: 20,
} as const

export type UserRole = keyof typeof ROLE_HIERARCHY

export function requireRole(userRole: string, minimumRole: UserRole): void {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] ?? 0
  const requiredLevel = ROLE_HIERARCHY[minimumRole]

  if (userLevel < requiredLevel) {
    throw new ApiError(403, `Access denied. Required role: ${minimumRole} or above.`)
  }
}

// ─── Custom Error Class ────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─── Audit Logging ─────────────────────────────────────────────────────────────

export async function auditLog(params: {
  tenantId: string
  userId?: string
  action: string
  resource: string
  resourceId?: string
  req?: NextRequest
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action as never,
        resource: params.resource,
        resourceId: params.resourceId,
        oldValues: params.oldValues as never,
        newValues: params.newValues as never,
        ipAddress: params.req?.headers.get('x-forwarded-for')
          ?? params.req?.headers.get('x-real-ip')
          ?? 'unknown',
        userAgent: params.req?.headers.get('user-agent') ?? undefined,
      },
    })
  } catch (error) {
    // Audit log failure should not break the main request
    console.error('Audit log failed:', error)
  }
}
