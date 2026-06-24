// ─── API Route Middleware ─────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { ApiError, authenticateRequest, type AuthContext } from './auth'
import { ZodError } from 'zod'

// ─── Standard API Response Helpers ────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data }, { status: 201 })
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): NextResponse {
  return NextResponse.json({
    success: true,
    data: items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrev: page > 1,
    },
  })
}

export function error(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: err.message, details: err.details },
      { status: err.statusCode },
    )
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation error',
        details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      },
      { status: 422 },
    )
  }

  // Log unexpected errors (in production, this goes to your error tracker)
  console.error('[API Error]', err)

  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 },
  )
}

// ─── Route Handler Wrapper ────────────────────────────────────────────────────

type RouteHandler = (
  req: NextRequest,
  auth: AuthContext,
  params?: Record<string, string>,
) => Promise<NextResponse>

export function withAuth(handler: RouteHandler) {
  return async (
    req: NextRequest,
    context?: { params?: Promise<Record<string, string>> | Record<string, string> },
  ): Promise<NextResponse> => {
    try {
      const auth = await authenticateRequest(req)
      // Next.js 15: params may be a Promise — resolve it before passing to handler
      const params = context?.params instanceof Promise
        ? await context.params
        : context?.params
      return await handler(req, auth, params)
    } catch (err) {
      return error(err)
    }
  }
}

// ─── Pagination Helpers ────────────────────────────────────────────────────────

export function getPaginationParams(req: NextRequest): { page: number; pageSize: number; skip: number } {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

// ─── Tenant Scope Guard ────────────────────────────────────────────────────────

export function assertTenantScope(resourceTenantId: string, authTenantId: string): void {
  if (resourceTenantId !== authTenantId) {
    throw new ApiError(403, 'Access denied to this resource')
  }
}
