'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: 'text-red-600 bg-red-50 border border-red-200',
  HIGH: 'text-orange-600 bg-orange-50 border border-orange-200',
  ROUTINE: 'text-slate-600 bg-slate-50 border border-slate-200',
}

type Patient = {
  id: string
  mrn: string
  firstName: string
  lastName: string
  dateOfBirth: string
  sex: string
  referrals: Array<{ id: string; status: string; priority: string }>
  _count: { bpReadings: number; medications: number }
}

// ─── New Patient Modal ────────────────────────────────────────────────────────
function NewPatientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    sex: 'MALE',
    phone: '',
    mrn: `HTN-${String(Math.floor(Math.random() * 9000) + 1000)}`,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    try {
      const dob = new Date(form.dateOfBirth + 'T00:00:00.000Z').toISOString()
      const res = await apiFetch<{ data: { id: string } }>('/api/patients', {
        method: 'POST',
        body: JSON.stringify({
          mrn: form.mrn,
          firstName: form.firstName,
          lastName: form.lastName,
          dateOfBirth: dob,
          sex: form.sex,
          phone: form.phone || undefined,
        }),
      })
      onCreated(res.data.id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create patient')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">New Patient</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input className="input" required value={form.firstName} onChange={e => set('firstName', e.target.value)} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" required value={form.lastName} onChange={e => set('lastName', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date of Birth</label>
              <input className="input" type="date" required value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
            </div>
            <div>
              <label className="label">Sex</label>
              <select className="input" value={form.sex} onChange={e => set('sex', e.target.value)}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">MRN</label>
              <input className="input" required value={form.mrn} onChange={e => set('mrn', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone (optional)</label>
              <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          {err && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{err}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Creating…' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PatientsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewPatient, setShowNewPatient] = useState(false)

  const loadPatients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ data: Patient[] }>(`/api/patients?pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ''}`)
      setPatients(res.data ?? [])
    } catch {
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { loadPatients() }, [loadPatients])

  function getAge(dob: string) {
    const diff = Date.now() - new Date(dob).getTime()
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
  }

  function getPriority(p: Patient) {
    return (p.referrals[0]?.priority ?? 'ROUTINE') as string
  }

  function getStatus(p: Patient) {
    const s = p.referrals[0]?.status
    if (!s) return { label: 'No Referral', color: 'bg-slate-100 text-slate-600' }
    const map: Record<string, { label: string; color: string }> = {
      PENDING_SCREENING: { label: 'Pending Screening', color: 'bg-slate-100 text-slate-600' },
      SCREENING_COMPLETE: { label: 'Screening Complete', color: 'bg-amber-100 text-amber-700' },
      WORKUP_IN_PROGRESS: { label: 'In Workup', color: 'bg-amber-100 text-amber-700' },
      WORKUP_COMPLETE: { label: 'Workup Complete', color: 'bg-blue-100 text-blue-700' },
      PHYSICIAN_REVIEW: { label: 'Physician Review', color: 'bg-blue-100 text-blue-700' },
      THERAPY_RECOMMENDED: { label: 'Therapy Recommended', color: 'bg-green-100 text-green-700' },
      DISCHARGED: { label: 'Discharged', color: 'bg-slate-100 text-slate-500' },
    }
    return map[s] ?? { label: s, color: 'bg-slate-100 text-slate-600' }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {showNewPatient && (
        <NewPatientModal
          onClose={() => setShowNewPatient(false)}
          onCreated={(id) => router.push(`/patients/${id}`)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Patients</h1>
          <p className="text-slate-500 text-sm mt-0.5">{patients.length} patient{patients.length !== 1 ? 's' : ''} in panel</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewPatient(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Patient
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading patients…</div>
      )}

      {/* Empty state */}
      {!loading && patients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">No patients yet</p>
          <p className="text-slate-400 text-sm mt-1">Click "New Patient" to add your first patient</p>
        </div>
      )}

      {/* Patient cards */}
      {!loading && patients.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {patients.map(p => {
            const priority = getPriority(p)
            const status = getStatus(p)
            const age = getAge(p.dateOfBirth)
            return (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="card-padded hover:border-blue-200 hover:shadow-md transition-all group block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {p.firstName[0]}{p.lastName[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {p.firstName} {p.lastName}
                      </div>
                      <div className="text-xs text-slate-400">{p.mrn} · {age}yo {p.sex === 'MALE' ? 'M' : p.sex === 'FEMALE' ? 'F' : p.sex}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLOR[priority] ?? PRIORITY_COLOR.ROUTINE}`}>
                    {priority}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">BP Readings</div>
                    <div className="text-xl font-bold text-slate-700">{p._count.bpReadings}</div>
                    <div className="text-xs text-slate-500">recorded</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-0.5">Medications</div>
                    <div className="text-xl font-bold text-slate-700">{p._count.medications}</div>
                    <div className="text-xs text-slate-500">active</div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
