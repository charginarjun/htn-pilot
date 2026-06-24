'use client'

import Link from 'next/link'

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sublabel,
  color = 'blue',
  icon,
}: {
  label: string
  value: string | number
  sublabel?: string
  color?: 'blue' | 'amber' | 'green' | 'red' | 'purple'
  icon: React.ReactNode
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="card-padded">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ─── Workflow Step Indicator ───────────────────────────────────────────────────
function WorkflowCard({
  title,
  count,
  href,
  statusColor,
  description,
}: {
  title: string
  count: number
  href: string
  statusColor: string
  description: string
}) {
  return (
    <Link href={href} className="card-padded flex items-center gap-4 hover:border-blue-200 hover:shadow-md transition-all group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white ${statusColor} flex-shrink-0`}>
        {count}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{title}</div>
        <div className="text-sm text-slate-500 truncate">{description}</div>
      </div>
      <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// ─── Recent Activity Item ─────────────────────────────────────────────────────
function ActivityItem({
  name,
  mrn,
  action,
  time,
  badge,
  badgeColor,
}: {
  name: string
  mrn: string
  action: string
  time: string
  badge: string
  badgeColor: string
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
        {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{name}</span>
          <span className="text-xs text-slate-400">MRN: {mrn}</span>
        </div>
        <div className="text-xs text-slate-500">{action}</div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`badge-${badgeColor} text-xs`}>{badge}</span>
        <span className="text-xs text-slate-400">{time}</span>
      </div>
    </div>
  )
}

// ─── BP Status Indicator ──────────────────────────────────────────────────────
function BpBar({ label, value, max = 200, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-slate-500 text-right">{label}</div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-12 text-xs font-medium text-slate-700">{value}</div>
    </div>
  )
}

// ─── Dashboard Page ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Monday, June 22 · Metro Cardiology Center</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-blue">ACC/AHA 2023 · ESC 2024</span>
          <span className="text-xs text-slate-400">Guidelines active</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Patients"
          value="248"
          sublabel="↑ 12 this month"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Review"
          value="14"
          sublabel="Needs physician action"
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Procedures This Month"
          value="6"
          sublabel="3 RDN · 2 Stenting · 1 PTA"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Urgent Referrals"
          value="3"
          sublabel="Requires immediate attention"
          color="red"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow queue */}
        <div className="lg:col-span-2 space-y-3">
          <h2>Active Workflow Queue</h2>
          <div className="space-y-2">
            <WorkflowCard
              title="New Referrals — Pending Screening"
              count={7}
              href="/referrals?status=PENDING_REVIEW"
              statusColor="bg-slate-500"
              description="Received referrals awaiting initial screening review"
            />
            <WorkflowCard
              title="Workup In Progress"
              count={11}
              href="/referrals?status=WORKUP_IN_PROGRESS"
              statusColor="bg-amber-500"
              description="Labs, imaging, and secondary HTN evaluation underway"
            />
            <WorkflowCard
              title="Ready for AI Assessment"
              count={5}
              href="/referrals?status=ASSESSMENT_PENDING"
              statusColor="bg-blue-500"
              description="Workup complete — trigger clinical assessment"
            />
            <WorkflowCard
              title="Physician Review Required"
              count={14}
              href="/referrals?status=PHYSICIAN_REVIEW"
              statusColor="bg-purple-500"
              description="AI assessment complete — awaiting physician sign-off"
            />
            <WorkflowCard
              title="Procedures Scheduled"
              count={4}
              href="/procedures"
              statusColor="bg-green-500"
              description="RDN, stenting, or PTA on the cath lab schedule"
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Urgent flags */}
          <div className="card-padded border-l-4 border-l-red-500">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-red-700">Urgent Flags</h3>
            </div>
            <div className="space-y-2">
              {[
                { name: 'James T.', issue: 'BP 198/112 — Hypertensive crisis', time: '2h ago' },
                { name: 'Maria S.', issue: 'Markedly elevated metanephrines — Pheo suspected', time: '4h ago' },
                { name: 'Robert K.', issue: 'eGFR drop 45→28 on ACE inhibitor — Bilateral RAS?', time: '1d ago' },
              ].map((flag, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-red-50">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-red-900">{flag.name}</div>
                    <div className="text-xs text-red-700">{flag.issue}</div>
                    <div className="text-xs text-red-400 mt-0.5">{flag.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BP distribution */}
          <div className="card-padded">
            <h3 className="mb-4">Panel BP Control</h3>
            <div className="space-y-2.5">
              <BpBar label="<130/80" value={89} max={248} color="bg-green-500" />
              <BpBar label="130–139" value={72} max={248} color="bg-amber-400" />
              <BpBar label="140–159" value={54} max={248} color="bg-orange-500" />
              <BpBar label="≥160/100" value={33} max={248} color="bg-red-500" />
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 text-center">
              36% of patients at ACC/AHA target (&lt;130/80)
            </div>
          </div>

          {/* Guideline info */}
          <div className="card-padded bg-blue-50 border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-blue-800 text-sm">Guidelines Current</h3>
            </div>
            <p className="text-xs text-blue-600">
              ACC/AHA 2023 + ESC 2024 · FDA Recor Paradise RDN approval included ·
              All assessments auto-tagged with guideline version
            </p>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card-padded">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <Link href="/referrals" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all →</Link>
        </div>
        <div>
          <ActivityItem name="Patricia M." mrn="HTN-0441" action="AI Assessment complete — RDN eligible (Class IIa)" time="35m ago" badge="Ready for Review" badgeColor="blue" />
          <ActivityItem name="David L." mrn="HTN-0440" action="Workup updated — Primary aldosteronism screening ordered" time="1h ago" badge="In Workup" badgeColor="moderate" />
          <ActivityItem name="Sandra W." mrn="HTN-0439" action="Renal denervation completed successfully" time="3h ago" badge="Procedure Done" badgeColor="good" />
          <ActivityItem name="Thomas B." mrn="HTN-0438" action="New referral received — Stage 2 resistant HTN" time="4h ago" badge="Pending Screening" badgeColor="neutral" />
          <ActivityItem name="Linda C." mrn="HTN-0437" action="Physician approved — Renal artery stenting recommended" time="Yesterday" badge="Approved" badgeColor="good" />
        </div>
      </div>
    </div>
  )
}
