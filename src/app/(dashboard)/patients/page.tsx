'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api-client'

// Display cards (visual placeholders for demo)
const DISPLAY_PATIENTS = [
  { mrn: 'HTN-0441', name: 'Patricia Martinez', age: 60, sex: 'F', primaryBp: '168/98', stage: 'Resistant HTN', stageColor: 'text-red-700', meds: 4, provider: 'Dr. J. Chen', lastSeen: '2d ago', status: 'Physician Review', statusColor: 'badge-blue', priority: 'HIGH' as const, comorbidities: ['CKD G3a', 'OSA', 'Obesity'] },
  { mrn: 'HTN-0442', name: 'James Thompson', age: 58, sex: 'M', primaryBp: '198/112', stage: 'Hypertensive Crisis', stageColor: 'text-red-800', meds: 3, provider: 'Dr. R. Park', lastSeen: '1h ago', status: 'Pending Screening', statusColor: 'badge-neutral', priority: 'URGENT' as const, comorbidities: ['CAD', 'Dyslipidemia'] },
  { mrn: 'HTN-0440', name: 'David Lee', age: 52, sex: 'M', primaryBp: '152/94', stage: 'Stage 2', stageColor: 'text-orange-700', meds: 3, provider: 'Dr. M. Singh', lastSeen: '5d ago', status: 'In Workup', statusColor: 'badge-moderate', priority: 'ROUTINE' as const, comorbidities: ['Diabetes T2', 'CKD G2'] },
  { mrn: 'HTN-0439', name: 'Sandra Wilson', age: 65, sex: 'F', primaryBp: '145/88', stage: 'Stage 2', stageColor: 'text-orange-700', meds: 3, provider: 'Dr. K. Brown', lastSeen: '1w ago', status: 'Assessment Pending', statusColor: 'badge-blue', priority: 'ROUTINE' as const, comorbidities: ['Dyslipidemia', 'OSA'] },
  { mrn: 'HTN-0438', name: 'Thomas Berg', age: 47, sex: 'M', primaryBp: '162/101', stage: 'Stage 2', stageColor: 'text-orange-700', meds: 2, provider: 'Dr. L. Evans', lastSeen: '3h ago', status: 'Pending Screening', statusColor: 'badge-neutral', priority: 'HIGH' as const, comorbidities: ['Obesity'] },
  { mrn: 'HTN-0437', name: 'Linda Chen', age: 70, sex: 'F', primaryBp: '138/84', stage: 'Resistant HTN', stageColor: 'text-amber-700', meds: 4, provider: 'Dr. P. Jones', lastSeen: '2w ago', status: 'Therapy Recommended', statusColor: 'badge-good', priority: 'ROUTINE' as const, comorbidities: ['Atrial Fibrillation', 'CKD G2'] },
]

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: 'text-red-600 bg-red-50 border border-red-200',
  HIGH: 'text-orange-600 bg-orange-50 border border-orange-200',
  ROUTINE: 'text-slate-600 bg-slate-50 border border-slate-200',
}

type RealPatient = { id: string; mrn: string }

export default function PatientsPage() {
  const [search, setSearch] = useState('')
  const [realIds, setRealIds] = useState<Record<string, string>>({}) // mrn → real db id

  useEffect(() => {
    apiFetch<{ data: RealPatient[] }>('/api/patients?pageSize=50')
      .then(res => {
        const map: Record<string, string> = {}
        for (const p of res.data ?? []) map[p.mrn] = p.id
        setRealIds(map)
      })
      .catch(() => {}) // gracefully ignore if not logged in
  }, [])

  const patients = DISPLAY_PATIENTS.map(p => ({
    ...p,
    id: realIds[p.mrn] ?? p.mrn, // use real UUID if available, else MRN as fallback
    isReal: !!realIds[p.mrn],
  }))

  const filtered = patients.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.mrn.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Patients</h1>
          <p className="text-slate-500 text-sm mt-0.5">{patients.length} patients in panel</p>
        </div>
        <button className="btn-primary">
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

      {/* Patient cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => (
          <Link
            key={p.mrn}
            href={`/patients/${p.id}`}
            className="card-padded hover:border-blue-200 hover:shadow-md transition-all group block"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {p.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center gap-1.5">
                    {p.name}
                    {p.isReal && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" title="Live data" />}
                  </div>
                  <div className="text-xs text-slate-400">{p.mrn} · {p.age}yo {p.sex}</div>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLOR[p.priority]}`}>
                {p.priority}
              </span>
            </div>

            <div className="flex items-center justify-between mb-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="text-xs text-slate-500 mb-0.5">Last BP</div>
                <div className={`text-xl font-bold ${p.stageColor}`}>{p.primaryBp}</div>
                <div className="text-xs text-slate-500">mmHg</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-0.5">Classification</div>
                <div className={`text-sm font-semibold ${p.stageColor}`}>{p.stage}</div>
                <div className="text-xs text-slate-400">{p.meds} medications</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {p.comorbidities.map(c => (
                <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">{c}</span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-500">{p.provider} · {p.lastSeen}</div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                p.statusColor === 'badge-blue' ? 'bg-blue-100 text-blue-700' :
                p.statusColor === 'badge-good' ? 'bg-green-100 text-green-700' :
                p.statusColor === 'badge-moderate' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {p.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
