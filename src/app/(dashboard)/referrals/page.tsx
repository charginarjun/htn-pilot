'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api-client'

const STATUS_CONFIG: Record<string, { label: string; dot: string; textColor: string }> = {
  PENDING_REVIEW:        { label: 'Pending Review',        dot: 'bg-slate-400',  textColor: 'text-slate-600' },
  SCREENING_IN_PROGRESS: { label: 'Screening',             dot: 'bg-amber-400',  textColor: 'text-amber-700' },
  NOT_ELIGIBLE:          { label: 'Not Eligible',          dot: 'bg-slate-400',  textColor: 'text-slate-500' },
  WORKUP_IN_PROGRESS:    { label: 'In Workup',             dot: 'bg-amber-500',  textColor: 'text-amber-700' },
  AWAITING_LABS:         { label: 'Awaiting Labs',         dot: 'bg-amber-400',  textColor: 'text-amber-700' },
  ASSESSMENT_PENDING:    { label: 'Ready for Assessment',  dot: 'bg-blue-500',   textColor: 'text-blue-700' },
  ASSESSMENT_COMPLETE:   { label: 'Assessment Complete',   dot: 'bg-blue-500',   textColor: 'text-blue-700' },
  PHYSICIAN_REVIEW:      { label: 'Physician Review',      dot: 'bg-blue-600',   textColor: 'text-blue-700' },
  THERAPY_RECOMMENDED:   { label: 'Therapy Recommended',   dot: 'bg-green-500',  textColor: 'text-green-700' },
  PROCEDURE_SCHEDULED:   { label: 'Procedure Scheduled',   dot: 'bg-green-600',  textColor: 'text-green-700' },
  PROCEDURE_COMPLETE:    { label: 'Complete',              dot: 'bg-green-700',  textColor: 'text-green-700' },
  DISCHARGED:            { label: 'Discharged',            dot: 'bg-slate-300',  textColor: 'text-slate-500' },
  LOST_TO_FOLLOWUP:      { label: 'Lost to Follow-up',     dot: 'bg-red-300',    textColor: 'text-red-600' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  URGENT:  { label: 'Urgent',  color: 'text-red-600 bg-red-50 border border-red-200' },
  HIGH:    { label: 'High',    color: 'text-orange-600 bg-orange-50 border border-orange-200' },
  ROUTINE: { label: 'Routine', color: 'text-slate-600 bg-slate-50 border border-slate-200' },
}

type Patient = { id: string; mrn: string; firstName: string; lastName: string }

type Referral = {
  id: string
  referralNumber: string
  referringProvider?: string
  referringFacility?: string
  chiefComplaint?: string
  status: string
  priority: string
  createdAt: string
  patient: {
    id: string
    mrn: string
    firstName: string
    lastName: string
    dateOfBirth: string
    sex: string
    bpReadings: Array<{ sbp: number; dbp: number }>
    medications: Array<{ id: string }>
  }
}

// ─── New Referral Modal ───────────────────────────────────────────────────────
function NewReferralModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [form, setForm] = useState({
    patientId: '',
    referringProvider: '',
    referringFacility: '',
    chiefComplaint: '',
    referralNotes: '',
    priority: 'ROUTINE',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    apiFetch<{ data: Patient[] }>('/api/patients?pageSize=100')
      .then(res => setPatients(res.data ?? []))
      .catch(() => {})
  }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.patientId) { setErr('Please select a patient'); return }
    setSaving(true)
    setErr('')
    try {
      await apiFetch('/api/referrals', {
        method: 'POST',
        body: JSON.stringify({
          patientId: form.patientId,
          referringProvider: form.referringProvider || undefined,
          referringFacility: form.referringFacility || undefined,
          chiefComplaint: form.chiefComplaint || undefined,
          referralNotes: form.referralNotes || undefined,
          priority: form.priority,
        }),
      })
      onCreated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create referral')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-900">New Referral</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Patient <span className="text-red-500">*</span></label>
            <select className="input" value={form.patientId} onChange={e => set('patientId', e.target.value)} required>
              <option value="">Select a patient…</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} ({p.mrn})</option>
              ))}
            </select>
            {patients.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">No patients found — add a patient first from the Patients page.</p>
            )}
          </div>

          <div>
            <label className="label">Priority</label>
            <div className="flex gap-2">
              {(['ROUTINE', 'HIGH', 'URGENT'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('priority', p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.priority === p
                      ? p === 'URGENT' ? 'bg-red-600 text-white border-red-600'
                        : p === 'HIGH' ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Referring Provider</label>
              <input className="input" placeholder="Dr. Smith" value={form.referringProvider} onChange={e => set('referringProvider', e.target.value)} />
            </div>
            <div>
              <label className="label">Referring Facility</label>
              <input className="input" placeholder="City Medical Center" value={form.referringFacility} onChange={e => set('referringFacility', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Chief Complaint</label>
            <input className="input" placeholder="e.g. Resistant HTN on 4 agents, BP 172/104" value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)} />
          </div>

          <div>
            <label className="label">Clinical Notes</label>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Additional clinical context, relevant history, reason for referral…"
              value={form.referralNotes}
              onChange={e => set('referralNotes', e.target.value)}
            />
          </div>

          {err && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{err}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Submitting…' : 'Submit Referral'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type FilterType = 'ALL' | 'PENDING' | 'ACTIVE' | 'REVIEW' | 'COMPLETE'

export default function ReferralsPage() {
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [search, setSearch] = useState('')
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const loadReferrals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ data: Referral[] }>(`/api/referrals?pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ''}`)
      setReferrals(res.data ?? [])
    } catch {
      setReferrals([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { loadReferrals() }, [loadReferrals])

  const filtered = referrals.filter(r => {
    if (filter === 'PENDING') return ['PENDING_REVIEW', 'SCREENING_IN_PROGRESS'].includes(r.status)
    if (filter === 'ACTIVE') return ['WORKUP_IN_PROGRESS', 'AWAITING_LABS', 'ASSESSMENT_PENDING', 'ASSESSMENT_COMPLETE'].includes(r.status)
    if (filter === 'REVIEW') return ['PHYSICIAN_REVIEW', 'THERAPY_RECOMMENDED'].includes(r.status)
    if (filter === 'COMPLETE') return ['PROCEDURE_SCHEDULED', 'PROCEDURE_COMPLETE', 'DISCHARGED', 'NOT_ELIGIBLE', 'LOST_TO_FOLLOWUP'].includes(r.status)
    return true
  })

  const urgent = referrals.filter(r => r.priority === 'URGENT' && !['DISCHARGED', 'PROCEDURE_COMPLETE', 'LOST_TO_FOLLOWUP'].includes(r.status)).length

  function getAge(dob: string) {
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  }

  function getBpColor(sbp: number) {
    if (sbp >= 180) return 'text-red-700 font-bold'
    if (sbp >= 140) return 'text-orange-700 font-semibold'
    if (sbp >= 130) return 'text-amber-700'
    return 'text-green-700'
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    const w = Math.floor(d / 7)
    if (w > 0) return `${w}w ago`
    if (d > 0) return `${d}d ago`
    if (h > 0) return `${h}h ago`
    return 'just now'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {showNew && (
        <NewReferralModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); loadReferrals() }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Referral Queue</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {referrals.length} referral{referrals.length !== 1 ? 's' : ''}
            {urgent > 0 && <span className="text-red-600 font-medium ml-1">· {urgent} urgent</span>}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
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
              {f === 'ALL' ? `All (${referrals.length})` : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Loading referrals…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-slate-500 font-medium">No referrals yet</p>
            <p className="text-slate-400 text-sm mt-1">Click "New Referral" to submit one manually, or receive one via EMR.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last BP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Meds</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Referred by</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Received</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ref => {
                const sc = STATUS_CONFIG[ref.status] ?? { label: ref.status, dot: 'bg-slate-400', textColor: 'text-slate-600' }
                const pc = PRIORITY_CONFIG[ref.priority] ?? PRIORITY_CONFIG['ROUTINE']!
                const bp = ref.patient.bpReadings[0]
                const age = getAge(ref.patient.dateOfBirth)
                return (
                  <tr key={ref.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {ref.patient.firstName[0]}{ref.patient.lastName[0]}
                        </div>
                        <div>
                          <Link href={`/patients/${ref.patient.id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors">
                            {ref.patient.firstName} {ref.patient.lastName}
                          </Link>
                          <div className="text-xs text-slate-400">{ref.patient.mrn} · {age}yo {ref.patient.sex === 'MALE' ? 'M' : ref.patient.sex === 'FEMALE' ? 'F' : ref.patient.sex}</div>
                          {ref.referralNumber && <div className="text-xs text-slate-300">{ref.referralNumber}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {bp ? (
                        <span className={`text-sm ${getBpColor(bp.sbp)}`}>{bp.sbp}/{bp.dbp}</span>
                      ) : (
                        <span className="text-xs text-slate-400">No readings</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`w-3 h-3 rounded-full ${i < ref.patient.medications.length ? 'bg-blue-500' : 'bg-slate-200'}`} />
                        ))}
                        <span className="text-xs text-slate-500 ml-1">{ref.patient.medications.length}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                        <span className={`text-xs font-medium ${sc.textColor}`}>{sc.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${pc.color}`}>
                        {pc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="text-xs text-slate-600">{ref.referringProvider ?? '—'}</div>
                      <div className="text-xs text-slate-400">{ref.referringFacility ?? ''}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-slate-500">{timeAgo(ref.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/patients/${ref.patient.id}`} className="btn-secondary text-xs py-1.5 px-3">
                        Open →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* EMR integration note */}
      <div className="card-padded bg-slate-50 border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">EMR Integration</p>
            <p className="text-xs text-slate-500 mt-0.5">
              This app supports incoming FHIR R4 referrals via <code className="bg-slate-200 px-1 rounded">/api/fhir/sync</code>.
              To connect your EMR (Epic, Athena, eCW, etc.), configure it to POST FHIR ServiceRequest resources to that endpoint with your API key.
              Contact your EMR administrator to set up the outbound referral workflow.
            </p>
          </div>
        </div>
      </div>

      {/* Workflow guide */}
      <div className="card-padded bg-blue-50 border-blue-100">
        <h3 className="text-blue-800 mb-3">Clinical Workflow</h3>
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
