# HTN Pilot — Production Deployment Guide

## Infrastructure Architecture

```
                        ┌─────────────────────────────────────────┐
                        │              AWS us-east-1               │
                        │                                          │
  Users/Clinicians ────▶│  CloudFront CDN (static assets + edge)  │
                        │            │                             │
                        │     ┌──────▼──────┐                      │
                        │     │   AWS WAF   │  (SQL injection,     │
                        │     │  Web ACL    │   XSS, rate limit)   │
                        │     └──────┬──────┘                      │
                        │            │                             │
                        │  ┌─────────▼──────────┐                 │
                        │  │  Application Load   │                 │
                        │  │  Balancer (HTTPS)   │                 │
                        │  │  ACM SSL cert       │                 │
                        │  └─────────┬───────────┘                 │
                        │            │                             │
                        │   ┌────────▼─────────────────────────┐  │
                        │   │      ECS Fargate / EKS            │  │
                        │   │  ┌──────────┐  ┌──────────┐      │  │
                        │   │  │ htn-pilot│  │ htn-pilot│  ... │  │
                        │   │  │  pod (AZ1)│  │  pod (AZ2)│     │  │
                        │   │  └─────┬────┘  └────┬─────┘      │  │
                        │   │        │             │             │  │
                        │   └────────┼─────────────┼────────────┘  │
                        │            │             │               │
                        │   ┌────────▼─────────────▼────────────┐  │
                        │   │         Private Subnet              │  │
                        │   │                                    │  │
                        │   │  ┌──────────────┐  ┌──────────┐   │  │
                        │   │  │ Neon Postgres │  │ ElastiC  │   │  │
                        │   │  │  (primary +   │  │  Cache   │   │  │
                        │   │  │   read replica│  │  Redis   │   │  │
                        │   │  └──────────────┘  └──────────┘   │  │
                        │   └────────────────────────────────────┘  │
                        │                                          │
                        │   ┌──────────────────────────────────┐  │
                        │   │  AWS Secrets Manager             │  │
                        │   │  AWS S3 (documents/labs)         │  │
                        │   │  AWS CloudWatch (logs)           │  │
                        │   │  AWS ECR (container registry)    │  │
                        │   └──────────────────────────────────┘  │
                        └─────────────────────────────────────────┘

External:
  Anthropic API  ◀──── api.anthropic.com  (clinical AI assessments)
  EPIC FHIR      ◀──── fhir.epic.com      (future — feature flagged)
```

---

## Deployment Workflow

```
Developer PR → GitHub Actions CI (typecheck + lint + build + docker + security scan)
                         │
                         ▼ (all green)
              Merge to main branch
                         │
                         ▼ (auto-trigger)
              Build Docker image → push to ECR
                         │
                         ▼
              Run Prisma migrate (staging DB)
                         │
                         ▼
              Deploy to STAGING (rolling update, 100% min healthy)
                         │
                         ▼
              Smoke test /api/health → Slack notification
                         │
                         ▼ (manual: git tag v1.2.3)
              Production deploy triggered
                         │
                         ▼ (GitHub Environment approval gate)
              Required reviewers approve (2 engineers)
                         │
                         ▼
              Run Prisma migrate (production DB)
                         │
                         ▼
              Blue/Green deploy via CodeDeploy
              (10% canary → 5 min bake → 100%)
                         │
                         ▼
              Production health check → GitHub Release → Slack
                         │
              Auto-rollback if health check fails ──────────────▶ PagerDuty alert
```

---

## Pre-Launch Checklist

### Infrastructure
- [ ] AWS account created, IAM roles configured (least-privilege)
- [ ] VPC with private/public subnets across 3 AZs
- [ ] Security groups: ALB (443 inbound), ECS (ALB SG inbound only), RDS (ECS SG inbound only)
- [ ] ECR repository created: `htn-pilot`
- [ ] ECS cluster (Fargate) or EKS cluster provisioned
- [ ] ALB provisioned with ACM SSL certificate
- [ ] CloudFront distribution for static assets (`/_next/static/`)
- [ ] WAF Web ACL attached to ALB (OWASP Core Rule Set enabled)
- [ ] Route 53 DNS: `app.htnpilot.com` → ALB

### Database
- [ ] Neon production project created (or RDS PostgreSQL 16 provisioned)
- [ ] Connection pooler enabled (PgBouncer / Neon pooled connection)
- [ ] Read replica enabled in separate AZ
- [ ] Automated backups: 7-day retention, point-in-time recovery enabled
- [ ] SSL required on all connections (`sslmode=require`)
- [ ] Database credentials rotated from dev defaults
- [ ] `prisma migrate deploy` run against production DB
- [ ] Seed data confirmed NOT loaded in production
- [ ] Database monitoring: slow query log threshold = 1000ms

### Redis
- [ ] AWS ElastiCache (Redis 7) or Upstash Redis provisioned
- [ ] TLS enabled (`rediss://` connection string)
- [ ] AUTH password set
- [ ] Persistence enabled (RDB snapshots every 60s)
- [ ] Maxmemory policy: `allkeys-lru`

### Secrets Management
- [ ] All secrets in AWS Secrets Manager (not in code or environment variables)
- [ ] JWT_SECRET: minimum 64-char random string (generate: `openssl rand -hex 64`)
- [ ] FIELD_ENCRYPTION_KEY: 32-byte AES key (generate: `openssl rand -base64 32`)
- [ ] ANTHROPIC_API_KEY: production key with usage limits set in Anthropic console
- [ ] Secrets rotation schedule configured (90 days)
- [ ] No secrets in git history (run: `git log --all --full-history -- .env*`)

### Application
- [ ] `NODE_ENV=production` confirmed
- [ ] `NEXT_TELEMETRY_DISABLED=1` set
- [ ] Health check endpoint responding: `curl https://app.htnpilot.com/api/health`
- [ ] Login page accessible and functional
- [ ] Demo patient (Patricia Martinez, HTN-0441) loads correctly
- [ ] Referral queue renders with correct styling
- [ ] Assessment engine runs without errors (test with demo patient)
- [ ] EPIC integration feature flag OFF (`EPIC_FHIR_ENABLED=false`)

### Security & Compliance (HIPAA)
- [ ] HTTPS enforced everywhere (HTTP → HTTPS redirect)
- [ ] HSTS header present: `Strict-Transport-Security: max-age=63072000`
- [ ] CSP header present and correct
- [ ] X-Frame-Options: DENY
- [ ] All PHI encrypted at rest (RDS/Neon encryption enabled)
- [ ] All PHI encrypted in transit (TLS 1.2+ minimum)
- [ ] Audit log writes verified (check AuditLog table after test login)
- [ ] HIPAA BAA signed with: AWS, Neon (or RDS), Anthropic
- [ ] Penetration test scheduled before launch
- [ ] SBOM (Software Bill of Materials) generated: `npm sbom --format cyclonedx`

### Monitoring
- [ ] CloudWatch log groups created and retention set (90 days minimum for HIPAA)
- [ ] Prometheus + Grafana deployed (or Datadog agent)
- [ ] All alert rules loaded and tested
- [ ] PagerDuty integration: critical alerts → on-call rotation
- [ ] Slack webhook configured for deployment notifications
- [ ] Uptime monitor: Better Uptime or Datadog Synthetics on `/api/health`
- [ ] Error tracking: Sentry DSN configured in application
- [ ] Dashboard created: error rate, p99 latency, active users, assessments/day

### CI/CD
- [ ] GitHub Actions secrets configured (see deploy.yml for full list)
- [ ] GitHub Environments created: `staging`, `production`
- [ ] Production environment: required reviewers set (minimum 2)
- [ ] Branch protection on `main`: CI must pass, no force push
- [ ] ECR lifecycle policy: keep last 10 tagged images, expire untagged > 7 days

### Disaster Recovery
- [ ] RTO target documented: 4 hours (restore from backup)
- [ ] RPO target documented: 1 hour (point-in-time recovery)
- [ ] DB restore procedure tested in staging
- [ ] Rollback procedure documented and tested
- [ ] On-call runbook written and accessible

---

## Scaling Playbook

### Traffic spike (e.g. conference, health system onboarding)
```bash
# Pre-scale before anticipated spike
kubectl scale deployment htn-pilot -n htn-pilot --replicas=10

# Monitor during spike
kubectl top pods -n htn-pilot
kubectl get hpa -n htn-pilot -w

# HPA will auto-scale based on CPU/memory — manual pre-scaling avoids cold start lag
```

### Database connection exhaustion
```bash
# Check current connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Enable PgBouncer pooling (should already be on via DATABASE_URL_POOL)
# Emergency: increase max_connections (requires DB restart — use with caution)
# Long-term: reduce connection pool size per app instance in Prisma config
```

### Anthropic API rate limiting
```bash
# AI assessments will gracefully return deterministic-only results
# Check: grep "AI_ENABLED" in src/engine/ai/agent.ts
# Fallback is automatic — no action needed
# Monitor: anthropic_api_errors_total metric
```

---

## Rollback Procedure

### ECS rollback (< 5 min)
```bash
# List recent task definition revisions
aws ecs list-task-definitions --family htn-pilot-prod --sort DESC

# Roll back to previous revision
aws ecs update-service \
  --cluster htn-pilot-prod \
  --service htn-pilot \
  --task-definition htn-pilot-prod:PREVIOUS_REVISION

aws ecs wait services-stable --cluster htn-pilot-prod --services htn-pilot
```

### Kubernetes rollback (< 2 min)
```bash
kubectl rollout undo deployment/htn-pilot -n htn-pilot
kubectl rollout status deployment/htn-pilot -n htn-pilot
```

### Database rollback (Prisma)
```bash
# List applied migrations
npx prisma migrate status

# Roll back last migration (only for non-destructive changes)
# WARNING: Data-destructive rollbacks require manual intervention
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

---

## Common Incident Runbooks

### `AppDown` alert fires
1. Check pod status: `kubectl get pods -n htn-pilot`
2. Check pod logs: `kubectl logs -l app=htn-pilot -n htn-pilot --tail=100`
3. Check health endpoint directly from within cluster: `kubectl exec -it <pod> -- curl localhost:3000/api/health`
4. If crash loop: `kubectl describe pod <pod> -n htn-pilot` → check OOMKill or image pull error
5. If all pods failing: check database connectivity first (most common root cause)

### `DatabaseDown` alert fires
1. Check Neon/RDS console for maintenance or failover in progress
2. Test connection: `psql $DATABASE_URL -c "SELECT 1"`
3. If primary is down, failover to read replica (update DATABASE_URL temporarily)
4. Notify affected clinical staff — app will be down until DB is restored

### `AIAssessmentFailureSpike` alert fires
1. Check Anthropic status page: https://status.anthropic.com
2. Check API key validity: `curl https://api.anthropic.com/v1/messages -H "x-api-key: $KEY"`
3. If Anthropic is down: assessments fall back to deterministic-only (automatic)
4. Notify clinical staff that AI narratives are temporarily unavailable
5. Deterministic recommendations (ACC/AHA + ESC engine) remain fully functional

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL direct connection (migrations, seeding) |
| `DATABASE_URL_POOL` | ✅ | PostgreSQL pooled connection (app runtime) |
| `REDIS_URL` | ✅ | Redis for BullMQ job queue |
| `JWT_SECRET` | ✅ | 64-char random secret for JWT signing |
| `ANTHROPIC_API_KEY` | ⚠️ | Claude API key — AI disabled if missing |
| `FIELD_ENCRYPTION_KEY` | ✅ | 32-byte AES key for PHI field encryption |
| `EPIC_FHIR_ENABLED` | ✅ | `false` until EPIC integration is live |
| `AWS_ACCESS_KEY_ID` | ✅ (S3) | AWS credentials for document storage |
| `AWS_SECRET_ACCESS_KEY` | ✅ (S3) | AWS credentials for document storage |
| `APP_VERSION` | — | Injected by CI — used in health check response |
| `NODE_ENV` | ✅ | Must be `production` |

---

## Cost Estimates (AWS, us-east-1, 2026)

| Service | Config | Est. Monthly |
|---|---|---|
| ECS Fargate | 3× tasks (0.5 vCPU, 1GB RAM) | ~$45 |
| Neon PostgreSQL | Pro (auto-scaling) | ~$69 |
| ElastiCache Redis | cache.t4g.micro | ~$12 |
| ALB | ~1M requests/month | ~$25 |
| CloudFront | ~10GB transfer | ~$10 |
| ECR | ~5GB storage | ~$0.50 |
| CloudWatch Logs | ~5GB/month | ~$5 |
| WAF | ~1M requests | ~$10 |
| **Total** | | **~$177/month** |

Scales linearly with usage. At 10,000 patients, expect ~$400-600/month.
At 100,000 patients (enterprise tier), migrate to EKS + RDS Multi-AZ: ~$2,000-3,000/month.
