// ─── Health Check Endpoint ────────────────────────────────────────────────────
// GET /api/health
//
// Used by:
//   - Kubernetes liveness + readiness probes
//   - Load balancer health checks (ALB / nginx)
//   - Uptime monitoring (Better Uptime, Datadog Synthetics)
//
// Returns 200 when the app and all critical dependencies are healthy.
// Returns 503 when any critical dependency is degraded.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import db from '@/lib/db'

const APP_VERSION = process.env['APP_VERSION'] ?? 'dev'
const START_TIME = Date.now()

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down'
  latencyMs?: number
  error?: string
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown DB error',
    }
  }
}

async function checkRedis(): Promise<HealthCheck> {
  // Redis is used for BullMQ job queue — degraded if down, not critical for reads
  const redisUrl = process.env['REDIS_URL']
  if (!redisUrl || redisUrl === 'redis://localhost:6379') {
    return { status: 'ok', latencyMs: 0 } // Not configured — skip check
  }

  const start = Date.now()
  try {
    const { default: IORedis } = await import('ioredis')
    const redis = new IORedis(redisUrl, { connectTimeout: 2000, lazyConnect: true })
    await redis.ping()
    await redis.disconnect()
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    return {
      status: 'degraded', // Degraded (not down) — job queue affected, reads still work
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Redis unreachable',
    }
  }
}

export async function GET() {
  const start = Date.now()

  const [dbCheck, redisCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ])

  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000)
  const isHealthy = dbCheck.status === 'ok' // DB is the only hard dependency

  const body = {
    status: isHealthy ? 'ok' : 'degraded',
    version: APP_VERSION,
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbCheck,
      redis: redisCheck,
    },
    responseMs: Date.now() - start,
  }

  return NextResponse.json(body, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache',
      'X-Health-Version': APP_VERSION,
    },
  })
}
