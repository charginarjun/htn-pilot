'use client'

import Link from 'next/link'

const mockProcedures = [
  {
    id: '1',
    patient: 'Linda Chen',
    mrn: 'HTN-0437',
    age: 70,
    type: 'Renal Denervation',
    typeShort: 'RDN',
    typeColor: 'bg-purple-100 text-purple-700',
    system: 'Recor Paradise (Ultrasound)',
    status: 'SCHEDULED',
    scheduledDate: 'Jun 26, 2026',
    physician: 'Dr. Alex Reynolds',
    indication: 'Resistant HTN — ACC/AHA Class IIa, Level A',
    preBp: '148/90',
    room: 'Cath Lab 2',
    consentObtained: true,
    rdnEligibilityCriteria: ['BP ≥130/80 on ≥3 meds ✓', 'Renal artery length ≥20mm ✓', 'eGFR ≥30 ✓', 'No stenosis ≥50% ✓'],
  },
  {
    id: '2',
    patient: 'Robert Kim',
    mrn: 'HTN-0435',
    age: 64,
    type: 'Renal Artery Stenting',
    typeShort: 'RAS Stent',
    typeColor: 'bg-blue-100 text-blue-700',
    system: 'Flash PE + RAS 75%',
    status: 'SCHEDULED',
    scheduledDate: 'Jun 27, 2026',
    physician: 'Dr. Alex Reynolds',
    indication: 'Hemodynamically significant stenosis 75% — flash pulmonary edema',
    preBp: '176/104',
    room: 'Cath Lab 1',
    consentObtained: true,
    rdnEligibilityCriteria: ['Stenosis ≥60% ✓', 'Flash PE indication ✓', 'FFR confirmed ✓'],
  },
  {
    id: '3',
    patient: 'Sarah Park',
    mrn: 'HTN-0433',
    age: 38,
    type: 'Percutaneous Transluminal Angioplasty',
    typeShort: 'PTA',
    typeColor: 'bg-teal-100 text-teal-700',
    system: 'FMD — String of beads pattern',
    status: 'COMPLETED',
    scheduledDate: 'Jun 19, 2026',
    physician: 'Dr. Alex Reynolds',
    indication: 'Fibromuscular dysplasia — Class I, Level B',
    preBp: '158/96',
    postBp: '128/78',
    room: 'Cath Lab 2',
    consentObtained: true,
    rdnEligibilityCriteria: ['FMD confirmed ✓', 'Age <50 ✓', 'No ostial lesion ✓'],
  },
  {
    id: '4',
    patient: 'Michael Torres',
    mrn: 'HTN-0436',
    age: 55,
    type: 'Renal Denervation',
    typeShort: 'RDN',
    typeColor: 'bg-purple-100 text-purple-700',
    system: 'Symplicity Spyral (RF)',
    status: 'COMPLETED',
    scheduledDate: 'Jun 12, 2026',
    physician: 'Dr. Alex Reynolds',
    indication: 'True resistant HTN — 4 medications at max dose',
    preBp: '164/98',
    postBp: '142/86',
    room: 'Cath Lab 1',
    consentObtained: true,
    rdnEligibilityCriteria: ['BP ≥130/80 on ≥3 meds ✓', 'Adherence confirmed ✓', 'Renal anatomy favorable ✓'],
  },
]

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  PENDING_SCHEDULING: { label: 'Pending Scheduling', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
}

export default function ProceduresPage() {
  const scheduled = mockProcedures.filter(p => p.status === 'SCHEDULED')
  const completed = mockProcedures.filter(p => p.status === 'COMPLETED')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Procedures</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {scheduled.length} scheduled · {completed.length} completed this month
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Renal Denervation', count: 2, color: 'text-purple-600 bg-purple-50', icon: '🫀' },
          { label: 'Renal Artery Stenting', count: 1, color: 'text-blue-600 bg-blue-50', icon: '🩺' },
          { label: 'PTA / Angioplasty', count: 1, color: 'text-teal-600 bg-teal-50', icon: '⚕️' },
        ].map(s => (
          <div key={s.label} className="card-padded flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.color} flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <div className={`text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.count}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      {scheduled.length > 0 && (
        <div>
          <h2 className="mb-3">Upcoming Procedures</h2>
          <div className="space-y-4">
            {scheduled.map(proc => {
              const sc = STATUS_CONFIG[proc.status as keyof typeof STATUS_CONFIG]
              return (
                <div key={proc.id} className="card-padded border-l-4 border-l-blue-500">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white">
                        {proc.patient.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <Link href={`/patients/${proc.id}`} className="font-semibold text-slate-900 hover:text-blue-700 transition-colors">
                          {proc.patient}
                        </Link>
                        <div className="text-xs text-slate-400">{proc.mrn} · {proc.age}yo</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${proc.typeColor}`}>
                        {proc.typeShort}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-slate-400">Date</div>
                      <div className="text-sm font-semibold text-slate-900">{proc.scheduledDate}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Room</div>
                      <div className="text-sm font-semibold text-slate-900">{proc.room}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Pre-Procedure BP</div>
                      <div className="text-sm font-semibold text-orange-700">{proc.preBp} mmHg</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Consent</div>
                      <div className={`text-sm font-semibold ${proc.consentObtained ? 'text-green-700' : 'text-red-600'}`}>
                        {proc.consentObtained ? '✓ Obtained' : '⚠ Pending'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 mb-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1">Indication</div>
                    <div className="text-sm text-slate-700">{proc.indication}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1.5">Eligibility Criteria Met</div>
                    <div className="flex flex-wrap gap-1.5">
                      {proc.rdnEligibilityCriteria.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="mb-3">Completed This Month</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Procedure</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pre BP</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Post BP</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {completed.map(proc => (
                  <tr key={proc.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-sm text-slate-900">{proc.patient}</div>
                      <div className="text-xs text-slate-400">{proc.mrn}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${proc.typeColor}`}>
                        {proc.typeShort}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{proc.scheduledDate}</td>
                    <td className="px-4 py-3.5 text-sm text-orange-700 font-medium">{proc.preBp}</td>
                    <td className="px-4 py-3.5 text-sm text-green-700 font-medium">{proc.postBp ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="badge-good text-xs">Successful</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guideline note */}
      <div className="card-padded bg-blue-50 border-blue-100">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="text-sm font-semibold text-blue-800 mb-1">Guideline-Based Procedure Selection</div>
            <p className="text-xs text-blue-700">
              All procedure recommendations are generated by the HTN Pilot clinical engine using ACC/AHA 2023 + ESC 2024 guidelines.
              RDN eligibility follows FDA Recor Paradise criteria (ESC Class IIa) and the SPYRAL HTN program.
              Stenting requires hemodynamically significant stenosis ≥60% with a specific clinical indication per post-CORAL/ASTRAL criteria.
              All procedures require physician approval before scheduling.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
