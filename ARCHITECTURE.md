# HTN Pilot — System Architecture

## Overview

HTN Pilot is a multi-tenant clinical decision support SaaS for hypertension screening, workup, management, and invasive therapy selection. It is built to scale to millions of patients across health systems while remaining compliant with HIPAA, HL7 FHIR R4, and meeting the clinical rigor demanded by ACC/AHA and ESC guidelines.

---

## Product Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HTN PILOT PLATFORM                          │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────────┐ │
│  │   Web App     │    │  AI Agent    │    │   FHIR Integration     │ │
│  │  (Next.js 14) │    │  Microservice│    │   Layer (EPIC)         │ │
│  │               │    │  (Node.js)   │    │   (FHIR R4 Adapter)   │ │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬─────────────┘ │
│         │                   │                        │               │
│  ┌──────▼───────────────────▼────────────────────────▼─────────────┐│
│  │                     API Gateway (Next.js API Routes)              ││
│  │  - JWT Auth + RBAC    - Rate limiting    - Audit logging          ││
│  │  - Multi-tenant isolation  - Request validation                   ││
│  └──────────────────────────┬────────────────────────────────────── ┘│
│                             │                                        │
│  ┌──────────────────────────▼───────────────────────────────────── ┐ │
│  │                   Clinical Engine                                 │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────────────┐  │ │
│  │  │  Screener   │ │  Classifier │ │   Management Protocols   │  │ │
│  │  │  (HTN/RH)   │ │  (Stage,    │ │   - Stepped care         │  │ │
│  │  │             │ │  resistant) │ │   - Medication algorithm │  │ │
│  │  └─────────────┘ └─────────────┘ │   - BP targets           │  │ │
│  │  ┌─────────────────────────────┐ │   - Lifestyle            │  │ │
│  │  │  Invasive Therapy Eligibility│ └──────────────────────────┘  │ │
│  │  │  - Renal Denervation (RDN)  │                                 │ │
│  │  │  - Renal Artery Stenting    │ ┌──────────────────────────┐  │ │
│  │  │  - PTA                      │ │   Guideline Registry     │  │ │
│  │  │  - Future therapies         │ │   - ACC/AHA 2023         │  │ │
│  │  └─────────────────────────────┘ │   - ESC 2024             │  │ │
│  │                                  │   - Versioned & updatable│  │ │
│  │                                  └──────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────── ┘ │
│                             │                                        │
│  ┌──────────────────────────▼──────────────────────────────────────┐ │
│  │              PostgreSQL (via Prisma ORM)                          │ │
│  │  - Row-level multi-tenancy   - HIPAA audit trail                  │ │
│  │  - Encrypted PII fields      - Full clinical data model           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR for HIPAA-safe data rendering, strong typing |
| Styling | Tailwind CSS + shadcn/ui primitives | Rapid clinical UI, accessible components |
| Backend | Next.js API Routes + Node.js | Unified deployment, serverless-ready |
| Database | PostgreSQL 15 + Prisma ORM | ACID compliance, complex clinical queries, type-safe |
| Auth | JWT + bcrypt + RBAC | Stateless, scalable, role-granular |
| AI Agent | OpenAI GPT-4o + structured outputs | Clinical narrative + structured recommendations |
| File Storage | S3-compatible (AWS S3 / MinIO) | HIPAA BAA-eligible, lab/imaging uploads |
| Job Queue | BullMQ + Redis | Async AI assessments, FHIR sync jobs |
| FHIR | HL7 FHIR R4 adapter | EPIC integration, interoperability |
| Monitoring | OpenTelemetry + structured logs | Production observability |
| Deployment | Docker + Kubernetes (or Vercel + Supabase) | Horizontal scaling to millions |

---

## Multi-Tenancy Model

Each health system is a **Tenant**. All data is isolated by `tenantId` at the database row level. API middleware enforces tenant scoping on every request. No cross-tenant data leakage is possible at the query layer.

```
Tenant (Health System)
  └── Users (Staff / Clinicians / Physicians)
  └── Patients (MRN-scoped per tenant)
       └── Referrals → Screening → Workup → Assessment → Procedure
```

Tenant plans (STARTER / PROFESSIONAL / ENTERPRISE) gate features like AI assessments, EPIC integration, and bulk data export.

---

## Clinical Workflow

```
Referral Received
       │
       ▼
  HTN Screening
  (BP criteria, med count, adherence, white coat exclusion)
       │
  ┌────┴────┐
  │Eligible │ Not Eligible → Discharge / Return to PCP
  └────┬────┘
       ▼
  Comprehensive Workup
  ├── Secondary HTN evaluation (aldosteronism, RAS, OSA, etc.)
  ├── Labs (BMP, aldosterone/renin ratio, thyroid, metanephrines)
  ├── Imaging (renal duplex, CTA/MRA renal arteries)
  ├── Organ damage (LVH, CKD, albuminuria, retinopathy)
  └── Medication optimization (≥3 drugs including diuretic)
       │
       ▼
  Clinical Assessment (AI + Guideline Engine)
  ├── HTN classification (Stage 1/2, Resistant, Refractory)
  ├── CV risk stratification (ASCVD 10-yr risk)
  ├── BP target determination (ACC/AHA or ESC)
  ├── Management protocol recommendation
  │   ├── Lifestyle interventions
  │   ├── Medication stepped-care algorithm
  │   └── Specialist referrals
  └── Invasive therapy eligibility
       ├── Renal Denervation (RDN)
       ├── Renal Artery Stenting
       └── PTA
            │
            ▼
       Physician Review & Approval
            │
            ▼
       Procedure Scheduling & Cath Lab Coordination
```

---

## Database Schema (Entity Map)

```
tenants ──────────────────────────────────────────┐
    │                                              │
    ├── users (RBAC: SUPER_ADMIN, TENANT_ADMIN,    │
    │          PHYSICIAN, NP_PA, COORDINATOR,      │
    │          MEDICAL_STAFF)                      │
    │                                              │
    └── patients ─────────────────────────────────┤
             │                                    │
             ├── bp_readings                      │
             ├── patient_medications              │
             ├── lab_results                      │
             ├── imaging_studies                  │
             ├── patient_comorbidities            │
             │                                    │
             └── referrals ──────────────────────┤
                      │                          │
                      ├── htn_screening           │
                      │                          │
                      └── htn_workup ────────────┤
                               │                 │
                               └── clinical_assessment
                                        │
                                        ├── therapy_recommendations
                                        │        │
                                        │        └── procedures
                                        │
                                        └── management_plans

audit_logs (all actions, HIPAA compliance)
guideline_versions (versioned rule sets)
```

---

## API Design

### Authentication
All endpoints require `Authorization: Bearer <jwt>`. Tokens encode `userId`, `tenantId`, `role`.

### Endpoints

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/patients                    (list, paginated, filtered)
POST   /api/patients                    (create)
GET    /api/patients/:id                (detail with full clinical data)
PUT    /api/patients/:id                (update)
POST   /api/patients/import             (CSV/FHIR bulk import)

GET    /api/referrals                   (queue view with status)
POST   /api/referrals                   (new referral)
GET    /api/referrals/:id               (detail)
PATCH  /api/referrals/:id/status        (advance workflow)

GET    /api/workup/:referralId          (get workup)
PUT    /api/workup/:referralId          (update workup checklist)
POST   /api/workup/:referralId/labs     (add lab result)
POST   /api/workup/:referralId/imaging  (add imaging study)
POST   /api/workup/:referralId/bp       (add BP reading)
POST   /api/workup/:referralId/meds     (add/update medication)

POST   /api/assessment/:workupId        (trigger AI assessment)
GET    /api/assessment/:workupId        (get assessment)
PATCH  /api/assessment/:workupId/review (physician review + notes)

GET    /api/procedures                  (cath lab schedule)
POST   /api/procedures                  (schedule procedure)
PATCH  /api/procedures/:id              (update procedure status)

GET    /api/guidelines                  (list active guideline versions)
POST   /api/guidelines                  (admin: upload new guideline version)

GET    /api/fhir/patient/:epicId        (EPIC patient fetch)
POST   /api/fhir/webhook                (EPIC subscription webhook)

GET    /api/dashboard/metrics           (aggregate stats for tenant)
```

---

## AI Agent Architecture

The AI agent runs as an internal service triggered by the clinical assessment endpoint. It:

1. **Retrieves** all patient data (demographics, BP readings, meds, labs, imaging, comorbidities, workup)
2. **Loads** the active guideline version (ACC/AHA 2023, ESC 2024) from the guideline registry
3. **Runs** the deterministic clinical engine first (classification, resistance criteria, eligibility checks)
4. **Constructs** a structured prompt with the patient summary + deterministic findings
5. **Calls** GPT-4o with structured JSON output schema for recommendations
6. **Validates** AI output against deterministic engine results for consistency
7. **Stores** the full assessment with guideline citations and confidence scores
8. **Flags** for physician review with priority scoring

The deterministic engine ALWAYS runs. The AI layer adds narrative, nuance, and catches edge cases. Physicians always review before any recommendation becomes actionable.

---

## EPIC FHIR R4 Integration (Future-Ready)

The FHIR adapter is architected but gated behind a feature flag. When enabled:

- **Patient sync**: FHIR `Patient` → internal `Patient` via MRN matching
- **Observations**: FHIR `Observation` (BP, labs) → `BpReading`, `LabResult`
- **Medications**: FHIR `MedicationRequest` → `PatientMedication`
- **Conditions**: FHIR `Condition` → `PatientComorbidity`
- **Webhooks**: EPIC subscription events update patient records in real time
- **Write-back**: Approved recommendations can post `CarePlan` back to EPIC

SMART on FHIR launch context is supported for embedding HTN Pilot within EPIC workflows.

---

## Security & Compliance

- **HIPAA**: All PHI encrypted at rest (AES-256) and in transit (TLS 1.3). Audit log on every PHI access.
- **Authentication**: JWT (15-min access token + 7-day refresh). bcrypt password hashing (cost 12).
- **RBAC**: Middleware enforces role-based access. MEDICAL_STAFF cannot approve recommendations. Only PHYSICIAN can approve procedures.
- **Multi-tenancy isolation**: Every DB query scoped by `tenantId`. No cross-tenant queries possible.
- **Rate limiting**: 100 req/min per user, 1000 req/min per tenant.
- **Input validation**: Zod schemas on all API inputs.
- **Audit logging**: Every PHI read/write/delete logged with user, IP, timestamp, old/new values.
- **PII encryption**: Patient DOB, contact info encrypted at column level.

---

## Scalability Design

- **Stateless API**: All state in PostgreSQL + Redis. Horizontally scalable.
- **Database**: Connection pooling via PgBouncer. Read replicas for analytics queries.
- **AI assessments**: Queued via BullMQ. Non-blocking, retryable.
- **FHIR sync**: Background job, rate-limited per EPIC tenant quota.
- **Caching**: Redis for session tokens, guideline rule sets (TTL 24h).
- **CDN**: Static assets via Vercel Edge / CloudFront.
- **Target**: 10M+ patients, 1000+ concurrent clinical users.

---

## Guideline Update Protocol

Guidelines are versioned in the `guideline_versions` table. When ACC/AHA or ESC publish updates:

1. Clinical team reviews changes and updates the TypeScript rule files
2. New guideline version is tagged and deployed
3. Existing assessments retain their guideline version reference (immutable historical record)
4. New assessments automatically use the latest active version
5. Administrators can compare old vs. new guideline outputs on existing patients

This ensures clinical decisions are always traceable to a specific published guideline.
