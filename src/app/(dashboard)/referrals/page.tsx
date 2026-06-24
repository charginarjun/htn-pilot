'use client'

import { useState } from 'react'
import Link from 'next/link'

const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'Pending Screening', color: 'badge-neutral', dot: 'bg-slate-400' },
  SCREENING_IN_PROGRESS: { label: 'Screening', color: 'badge-moderate', dot: 'bg-amber-400' },
  WORKUP_IN_PROGRESS: { label: 'In Workup', color: 'badge-moderate', dot: 'bg-amber-500' },
  AWAITING_LABS: { label: 'Awaiting Labs', color: 'badge-moderate', dot: 'bg-amber-400' },
  ASSESSMENT_PENDING: { label: 'Ready for Assessment', color: 'badge-blue', dot: 'bg-blue-500' },
  PHYSICIAN_REVIEW: { label: 'Physician Review', color: 'badge-blue', dot: 'bg-blue-600' },
  THERAPY_RECOMMENDED: { label: 'Therapy Recommended', color: 'badge-good', dot: 'bg-green-500' },
  PROCEDURE_SCHEDULED: { label: 'Procedure Scheduled', color: 'badge-good', dot: 'bg-green-600' },
  PROCEDURE_COMPLETE: { label: 'Complete', color: 'badge-good', dot: 'bg-green-700' },
  NOT_ELIGIBLE: { label: 'Not Eligible', color: 'badge-neutral', dot: 'bg-slate-400' },
  DISCHARGED: { label: 'Discharged', color: 'badge-neutral', dot: 'bg-slate-300' },
} as const

const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgent', color: 'text-red-600 bg-red-50 border border-red-200' },
  HIGH: { label: 'High', color: 'text-orange-600 bg-orange-50 border border-orange-200' },
  ROUTINE: { label: 'Routine', color: 'text-slate-600 bg-slate-50 border border-slate-200' },
}

const mockReferrals = [
  { id: '1', name: 'James Thompson', mrn: 'HTN-0442', age: 58, sex: 'M', bp: '198/112', status: 'PENDING_REVIEW' as const, priority: 'URGENT' as const, referring: 'Dr. R. Park', received: '1h ago', htnClass: 'Stage 2 Crisis', meds: 3 },
  { id: '2', name: 'Patricia Martinez', mrn: 'HTN-0441', age: 60, sex: 'F', bp: '168/98', status: 'PHYSICIAN_REVIEW' as const, priority: 'HIGH' as const, referring: 'Dr. J. Chen', received: '2d ago', htnClass: 'Resistant HTN', meds: 4 },
  { id: '3', name: 'David Lee', mrn: 'HTN-0440', age: 52, sex: 'M', bp: '152/94', status: 'WORKUP_IN_PROGRESS' as const, priority: 'ROUTINE' as const, referring: 'Dr. M. Singh', received: '5d ago', htnClass: 'Stage 2', meds: 3 },
  { id: '4', name: 'Sandra Wilson', mrn: 'HTN-0439', age: 65, sex: 'F', bp: '145/88', status: 'ASSESSMENT_PENDING' as const, priority: 'ROUTINE' as const, referring: 'Dr. K. Brown', received: '1w ago', htnClass: 'Stage 2', meds: 3 },
  { id: '5', name: 'Thomas Berg', mrn: 'HTN-0438', age: 47, sex: 'M', bp: '162/101', status: 'PENDING_REVIEW' as const, priority: 'HIGH' as const, referring: 'Dr. L. Evans', received: '3h ago', htnClass: 'Stage 2', meds: 2 },
  { id: '6', name: 'Linda Chen', mrn: 'HTN-0437', age: 70, sex: 'F', bp: '138/84', status: 'THERAPY_RECOMMENDED' as const, priority: 'ROUTINE' as const, referring: 'Dr. P. Jones', received: '2w ago', htnClass: 'Resistant HTN', meds: 4 },
]

export default function ReferralsPage() {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'REVIEW' | 'COMPLETE'>('ALL')
  const [search, setSearch] = useState('')

  const filtered = mockReferrals.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.mrn.includes(search)) return false
    if (filter === 'PENDING') return ['PENDING_REVIEW', 'SCREENING_IN_PROGRESS'].includes(r.status)
    if (filter === 'ACTIVE') return ['WORKUP_IN_PROGRESS', 'AWAITING_LABS', 'ASSESSMENT_PENDING'].includes(r.status)
    if (filter === 'REVIEW') return ['PHYSICIAN_REVIEW', 'THERAPY_RECOMMENDED'].includes(r.status)
    if (filter === 'COMPLETE') return ['PROCEDURE_SCHEDULED', 'PROCEDURE_COMPLETE', 'DISCHARGED', 'NOT_ELIGIBLE'].includes(r.status)
    return true
  })

  const statusCfg = STATUS_CONFIG
  const priorityCfg = PRIORITY_CONFIG

  const getBpColor = (bp: string) => {
    const sbp = parseInt(bp.split('/')[0] ?? '0')
    if (sbp >= 180) return 'text-red-700 font-bold'
    if (sbp >= 140) return 'text-orange-700 font-semibold'
    if (sbp >= 130) return 'text-amber-700 font-medium'
    return 'text-green-700'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Referral Queue</h1>
          <p className="text-slate-500 text-sm mt-0.5">{mockReferrals.length} active referrals · 3 require attention</p>
        </div>
        <button className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Referral
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or MRN..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {(['ALL', 'PENDING', 'ACTIVE', 'REVIEW', 'COMPLETE'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {f === 'ALL' ? `All (${mockReferrals.length})` : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">BP (Last)</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Classification</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Meds</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Referred by</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ref) => {
              const sc = statusCfg[ref.status] ?? { label: ref.status, color: 'badge-neutral', dot: 'bg-slate-400' }
              const pc = priorityCfg[ref.priority]
              return (
                <tr key={ref.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {ref.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <Link href={`/patients/${ref.id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors">
                          {ref.name}
                        </Link>
                        <div className="text-xs text-slate-400">{ref.mrn} · {ref.age}yo {ref.sex}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-sm ${getBpColor(ref.bp)}`}>{ref.bp} mmHg</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-slate-700">{ref.htnClass}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full ${i < ref.meds ? 'bg-blue-500' : 'bg-slate-200'}`} />
                      ))}
                      <span className="text-xs text-slate-500 ml-1">{ref.meds}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      <span className={`text-xs font-medium ${sc.color.includes('blue') ? 'text-blue-700' : sc.color.includes('good') ? 'text-green-700' : sc.color.includes('moderate') ? 'text-amber-700' : 'text-slate-600'}`}>
                        {sc.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${pc.color}`}>
                      {pc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-xs text-slate-600">{ref.referring}</div>
                    <div className="text-xs text-slate-400">{ref.received}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link href={`/patients/${ref.id}`} className="btn-secondary text-xs py-1.5 px-3">
                      Open →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No referrals match your filters</p>
          </div>
        )}
      </div>

      {/* Workflow guide */}
      <div className="card-padded bg-blue-50 border-blue-100">
        <h3 className="text-blue-800 mb-3">Clinical Workflow Guide</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { step: '1', label: 'Initial Screening', detail: 'Review BP criteria, med count, adherence, white coat exclusion' },
            { step: '2', label: 'Comprehensive Workup', detail: 'Secondary HTN labs + imaging, organ damage, lifestyle' },
            { step: '3', label: 'AI Assessment', detail: 'ACC/AHA + ESC guideline analysis powered by Claude AI' },
            { step: '4', label: 'Physician Review', detail: 'Physician reviews and approves therapy recommendations' },
            { step: '5', label: 'Procedure / Plan', detail: 'Schedule RDN, stenting, PTA, or management plan' },
          ].map(w => (
            <div key={w.step} className="text-center">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mx-auto mb-2">{w.step}</div>
              <div className="text-xs font-semibold text-blue-800">{w.label}</div>
              <div className="text-xs text-blue-600 mt-0.5">{w.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
