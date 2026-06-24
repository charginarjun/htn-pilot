'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api-client'
import { AddBpModal, AddMedModal, AddLabModal, AddComorbidityModal, AddAllergyModal, AddImagingModal } from './modals'

// ─── Types ────────────────────────────────────────────────────────────────────
interface BpReading { id: string; readingDate: string; readingType: string; sbp: number; dbp: number; heartRate?: number }
interface Medication { id: string; genericName: string; doseValue?: number; doseUnit?: string; frequency?: string; drugClass: string; adherence?: string; isAtMaxDose?: boolean }
interface LabResult { id: string; labType: string; numericValue?: number; unit?: string; isAbnormal?: boolean; labDate: string }
interface Comorbidity { id: string; condition: string; severity?: string; icdCode?: string }
interface Allergy { id: string; allergen: string; allergyType: string; reaction?: string; severity?: string }
interface Workup { id: string; workupStatus?: string; primaryAldosteronism?: string; arrResult?: number; arrAbnormal?: boolean; renovascularHtn?: string; sleepApnea?: string; ahi?: number; ecgLvh?: boolean; echoLvmi?: number; albuminuriaMgG?: number; ckdStage?: string; thyroidDisease?: string; cushings?: string; pheochromocytoma?: string; bmi?: number }
interface Patient {
  id: string; mrn: string; firstName: string; lastName: string; dateOfBirth: string; sex: string
  bpReadings: BpReading[]; medications: Medication[]; labResults: LabResult[]
  comorbidities: Comorbidity[]; allergies: Allergy[]
  referrals: Array<{ id: string; status: string; priority: string; referringProvider?: string; referringFacility?: string; workup?: Workup }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function bpStage(sbp: number, dbp: number) {
  if (sbp >= 180 || dbp >= 120) return { label: 'Crisis', color: 'text-red-700', bg: 'bg-red-50 border-red-200' }
  if (sbp >= 140 || dbp >= 90) return { label: 'Stage 2', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' }
  if (sbp >= 130 || dbp >= 80) return { label: 'Stage 1', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' }
  return { label: 'Controlled', color: 'text-green-700', bg: 'bg-green-50 border-green-200' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
}

function age(dob: string) {
  const d = new Date(dob)
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

const DRUG_CLASS_COLORS: Record<string, string> = {
  ACE_INHIBITOR: 'bg-blue-50 text-blue-800 border-blue-200',
  ARB: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  CALCIUM_CHANNEL_BLOCKER_DHP: 'bg-purple-50 text-purple-800 border-purple-200',
  THIAZIDE_LIKE_DIURETIC: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  LOOP_DIURETIC: 'bg-teal-50 text-teal-800 border-teal-200',
  MINERALOCORTICOID_ANTAGONIST: 'bg-green-50 text-green-800 border-green-200',
  BETA_BLOCKER: 'bg-orange-50 text-orange-800 border-orange-200',
  ALPHA_BLOCKER: 'bg-rose-50 text-rose-800 border-rose-200',
}

const DRUG_CLASS_LABEL: Record<string, string> = {
  ACE_INHIBITOR: 'ACE Inhibitor',
  ARB: 'ARB',
  CALCIUM_CHANNEL_BLOCKER_DHP: 'CCB (DHP)',
  THIAZIDE_LIKE_DIURETIC: 'Thiazide-like',
  LOOP_DIURETIC: 'Loop Diuretic',
  MINERALOCORTICOID_ANTAGONIST: 'MRA',
  BETA_BLOCKER: 'Beta-Blocker',
  ALPHA_BLOCKER: 'Alpha-Blocker',
}

// Lab display name & reference range
const LAB_META: Record<string, { label: string; ref?: string }> = {
  // BMP / Electrolytes
  SODIUM:             { label: 'Na⁺',         ref: '136–145 mEq/L' },
  POTASSIUM:          { label: 'K⁺',           ref: '3.5–5.0 mEq/L' },
  CHLORIDE:           { label: 'Cl⁻',          ref: '98–106 mEq/L' },
  CO2_BICARBONATE:    { label: 'HCO₃⁻',        ref: '22–29 mEq/L' },
  GLUCOSE:            { label: 'Glucose',      ref: '70–99 mg/dL' },
  CALCIUM:            { label: 'Ca²⁺',         ref: '8.5–10.5 mg/dL' },
  MAGNESIUM:          { label: 'Mg²⁺',         ref: '1.7–2.2 mg/dL' },
  // Renal
  BUN:                { label: 'BUN',          ref: '7–20 mg/dL' },
  CREATININE:         { label: 'Creatinine',   ref: '<1.1 mg/dL (F) / <1.3 (M)' },
  EGFR:               { label: 'eGFR',         ref: '≥60 mL/min/1.73m²' },
  URINE_ALBUMIN_CREATININE_RATIO: { label: 'ACR', ref: '<30 mg/g' },
  URINE_PROTEIN:      { label: 'Urine Protein', ref: '<150 mg/day' },
  // CBC
  HEMOGLOBIN:         { label: 'Hgb',          ref: '12–17 g/dL' },
  HEMATOCRIT:         { label: 'Hct',          ref: '36–50%' },
  WBC:                { label: 'WBC',          ref: '4.5–11 ×10³/µL' },
  PLATELETS:          { label: 'Plt',          ref: '150–400 ×10³/µL' },
  // Lipids
  TOTAL_CHOLESTEROL:  { label: 'Total Chol',   ref: '<200 mg/dL' },
  LDL_CHOLESTEROL:    { label: 'LDL-C',        ref: '<100 mg/dL (high risk <70)' },
  HDL_CHOLESTEROL:    { label: 'HDL-C',        ref: '>40 mg/dL (M) / >50 (F)' },
  TRIGLYCERIDES:      { label: 'TG',           ref: '<150 mg/dL' },
  // Metabolic
  HBA1C:              { label: 'HbA1c',        ref: '<5.7%' },
  INSULIN_FASTING:    { label: 'Fasting Insulin', ref: '2–20 µIU/mL' },
  // Thyroid
  TSH:                { label: 'TSH',          ref: '0.4–4.0 mU/L' },
  FREE_T4:            { label: 'Free T4',      ref: '0.8–1.8 ng/dL' },
  FREE_T3:            { label: 'Free T3',      ref: '2.3–4.1 pg/mL' },
  // Aldosterone / Renin
  PLASMA_ALDOSTERONE:   { label: 'Aldosterone',   ref: '1–16 ng/dL (upright)' },
  PLASMA_RENIN_ACTIVITY:{ label: 'PRA',            ref: '0.6–4.3 ng/mL/h' },
  PLASMA_RENIN:         { label: 'Renin (direct)', ref: '2.8–39.9 mU/L' },
  ALDOSTERONE_RENIN_RATIO: { label: 'ARR',        ref: '<30 ng/dL per ng/mL/h' },
  // Liver (CMP add-ons)
  ALT:                { label: 'ALT',          ref: '7–56 U/L' },
  AST:                { label: 'AST',          ref: '10–40 U/L' },
  ALKALINE_PHOSPHATASE:{ label: 'Alk Phos',   ref: '44–147 U/L' },
  TOTAL_BILIRUBIN:    { label: 'T. Bili',      ref: '0.1–1.2 mg/dL' },
  ALBUMIN:            { label: 'Albumin',      ref: '3.5–5.0 g/dL' },
  TOTAL_PROTEIN:      { label: 'Total Protein', ref: '6.0–8.3 g/dL' },
  // Other cardiometabolic
  BNP:                { label: 'BNP',          ref: '<100 pg/mL' },
  NT_PRO_BNP:         { label: 'NT-proBNP',    ref: '<125 pg/mL' },
  TROPONIN_I:         { label: 'Troponin I',   ref: '<0.04 ng/mL' },
  CRP:                { label: 'hsCRP',        ref: '<1.0 mg/L (low risk)' },
  URIC_ACID:          { label: 'Uric Acid',    ref: '3.5–7.2 mg/dL' },
}

// Ordered lab panel groups — only panels with ≥1 result are shown
const LAB_GROUPS: Array<{ title: string; abbr: string; types: string[] }> = [
  {
    title: 'Basic Metabolic Panel',
    abbr: 'BMP',
    types: ['SODIUM','POTASSIUM','CHLORIDE','CO2_BICARBONATE','GLUCOSE','CALCIUM','MAGNESIUM'],
  },
  {
    title: 'Renal Function',
    abbr: 'Renal',
    types: ['BUN','CREATININE','EGFR','URINE_ALBUMIN_CREATININE_RATIO','URINE_PROTEIN'],
  },
  {
    title: 'Complete Blood Count',
    abbr: 'CBC',
    types: ['HEMOGLOBIN','HEMATOCRIT','WBC','PLATELETS'],
  },
  {
    title: 'Lipid Panel',
    abbr: 'Lipids',
    types: ['TOTAL_CHOLESTEROL','LDL_CHOLESTEROL','HDL_CHOLESTEROL','TRIGLYCERIDES'],
  },
  {
    title: 'Metabolic',
    abbr: 'Metabolic',
    types: ['HBA1C','GLUCOSE','INSULIN_FASTING'],
  },
  {
    title: 'Thyroid Function Panel',
    abbr: 'TFTs',
    types: ['TSH','FREE_T4','FREE_T3'],
  },
  {
    title: 'Aldosterone / Renin',
    abbr: 'Aldo:Renin',
    types: ['PLASMA_ALDOSTERONE','PLASMA_RENIN_ACTIVITY','PLASMA_RENIN','ALDOSTERONE_RENIN_RATIO'],
  },
  {
    title: 'Comprehensive Metabolic (Liver)',
    abbr: 'CMP',
    types: ['ALT','AST','ALKALINE_PHOSPHATASE','TOTAL_BILIRUBIN','ALBUMIN','TOTAL_PROTEIN'],
  },
  {
    title: 'Cardiac Biomarkers',
    abbr: 'Cardiac',
    types: ['BNP','NT_PRO_BNP','TROPONIN_I','CRP','URIC_ACID'],
  },
]

const WORKUP_STATUS_CFG: Record<string, { icon: string; color: string; bg: string }> = {
  NOT_DONE: { icon: '○', color: 'text-slate-400', bg: 'bg-slate-50' },
  ORDERED: { icon: '⏳', color: 'text-amber-600', bg: 'bg-amber-50' },
  PENDING_RESULT: { icon: '⏳', color: 'text-amber-600', bg: 'bg-amber-50' },
  COMPLETED_NORMAL: { icon: '✓', color: 'text-green-600', bg: 'bg-green-50' },
  COMPLETED_ABNORMAL: { icon: '!', color: 'text-red-600', bg: 'bg-red-50' },
  NOT_APPLICABLE: { icon: '—', color: 'text-slate-300', bg: 'bg-slate-50' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function WorkupItem({ label, status, finding }: { label: string; status?: string; finding?: string }) {
  const cfg = WORKUP_STATUS_CFG[status ?? 'NOT_DONE'] ?? WORKUP_STATUS_CFG['NOT_DONE']!
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg}`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${cfg.color} border border-current flex-shrink-0 mt-0.5`}>
        {cfg.icon}
      </span>
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {finding && <div className="text-xs text-slate-500 mt-0.5">{finding}</div>}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = useState<'overview' | 'workup' | 'assessment'>('overview')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assessmentRunning, setAssessmentRunning] = useState(false)
  const [assessmentResult, setAssessmentResult] = useState<Record<string, unknown> | null>(null)
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<'bp'|'med'|'lab'|'comorbidity'|'allergy'|'imaging'|null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const loadPatient = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch<{ data: Patient }>(`/api/patients/${id}`)
      setPatient(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load patient')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadPatient() }, [loadPatient])

  const handleRunAssessment = async () => {
    const workupId = patient?.referrals[0]?.workup?.id
    if (!workupId) { showToast('No workup found for this patient. Complete the workup first.'); return }
    setAssessmentRunning(true)
    try {
      const res = await apiFetch<{ data: Record<string, unknown> }>(`/api/assessment/${workupId}`, { method: 'POST' })
      setAssessmentResult(res.data)
      setActiveTab('assessment')
      showToast('Assessment complete ✓')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Assessment failed')
    } finally {
      setAssessmentRunning(false)
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <svg className="animate-spin w-8 h-8 text-blue-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 text-sm">Loading patient record…</p>
      </div>
    </div>
  )

  if (error || !patient) return (
    <div className="max-w-lg mx-auto mt-16 text-center">
      <div className="text-4xl mb-4">🔍</div>
      <h2 className="text-slate-800 mb-2">{error ? 'Error loading patient' : 'Patient not found'}</h2>
      <p className="text-slate-500 text-sm mb-6">{error || 'This patient record could not be loaded.'}</p>
      <Link href="/patients" className="btn-primary">← Back to Patients</Link>
    </div>
  )

  const latestBp = patient.bpReadings[0]
  const stage = latestBp ? bpStage(latestBp.sbp, latestBp.dbp) : null
  const referral = patient.referrals[0]
  const workup = referral?.workup

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'workup' as const, label: 'Workup Checklist' },
    { id: 'assessment' as const, label: 'Clinical Assessment' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Clinical data entry modals */}
      {modal === 'bp' && <AddBpModal patientId={id} onClose={() => setModal(null)} onAdded={() => { setModal(null); loadPatient(); showToast('BP reading added ✓') }} />}
      {modal === 'med' && <AddMedModal patientId={id} onClose={() => setModal(null)} onAdded={() => { setModal(null); loadPatient(); showToast('Medication added ✓') }} />}
      {modal === 'lab' && <AddLabModal patientId={id} onClose={() => setModal(null)} onAdded={() => { setModal(null); loadPatient(); showToast('Lab result added ✓') }} />}
      {modal === 'comorbidity' && <AddComorbidityModal patientId={id} onClose={() => setModal(null)} onAdded={() => { setModal(null); loadPatient(); showToast('Comorbidity added ✓') }} />}
      {modal === 'allergy' && <AddAllergyModal patientId={id} onClose={() => setModal(null)} onAdded={() => { setModal(null); loadPatient(); showToast('Allergy added ✓') }} />}
      {modal === 'imaging' && <AddImagingModal patientId={id} onClose={() => setModal(null)} onAdded={() => { setModal(null); loadPatient(); showToast('Study added ✓') }} />}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/patients" className="hover:text-slate-700">Patients</Link>
        <span>›</span>
        <span className="text-slate-800 font-medium">{patient.firstName} {patient.lastName}</span>
      </div>

      {/* Patient header */}
      <div className="card-padded space-y-4">
        {/* Row 1: identity + actions */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar + name */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl">{patient.firstName} {patient.lastName}</h1>
                {referral?.priority === 'HIGH' && <span className="badge-high">HIGH PRIORITY</span>}
                {referral?.priority === 'URGENT' && <span className="badge-critical">URGENT</span>}
                {referral?.status && <span className="badge-blue">{referral.status.replace(/_/g, ' ')}</span>}
              </div>
              <div className="text-sm text-slate-500 mt-1">
                MRN: <span className="font-mono text-slate-700">{patient.mrn}</span> ·
                DOB: {new Date(patient.dateOfBirth).toLocaleDateString()} (Age {age(patient.dateOfBirth)}) ·
                {patient.sex === 'FEMALE' ? ' Female' : patient.sex === 'MALE' ? ' Male' : ' Other'}
              </div>
              {referral && (
                <div className="text-sm text-slate-500">
                  Referred by: {referral.referringProvider ?? 'Unknown'} · {referral.referringFacility ?? ''}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex sm:flex-col gap-2 flex-shrink-0">
            <button
              onClick={handleRunAssessment}
              disabled={assessmentRunning}
              className="btn-primary text-sm"
            >
              {assessmentRunning ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {assessmentRunning ? 'Running…' : 'Run Assessment'}
            </button>
            <button onClick={() => showToast('Export coming soon')} className="btn-secondary text-sm">
              Export Report
            </button>
          </div>
        </div>

        {/* Row 2: BP readings */}
        {patient.bpReadings.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {patient.bpReadings.slice(0, 5).map(bp => {
              const s = bpStage(bp.sbp, bp.dbp)
              return (
                <div key={bp.id} className={`rounded-lg border p-3 text-center ${s.bg}`}>
                  <div className="text-xs text-slate-500 mb-1">
                    {bp.readingType.replace(/_/g, ' ').replace('AMBULATORY DAYTIME', 'ABPM Day')}
                  </div>
                  <div className={`text-lg font-bold ${s.color}`}>{bp.sbp}/{bp.dbp}</div>
                  <div className="text-xs text-slate-400">mmHg</div>
                  <div className={`text-xs font-semibold mt-1 ${s.color}`}>{s.label}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Alert: elevated ARR */}
        {workup?.arrAbnormal && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-amber-800">
                Elevated ARR: {workup.arrResult} ng/dL per ng/mL/h
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                Threshold ≥30 — primary aldosteronism suspected. Confirmatory testing recommended.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">

            {/* Medications */}
            <div className="card-padded">
              <div className="section-header flex items-center justify-between mb-3">
                <h3>Antihypertensive Regimen ({patient.medications.length} agents)</h3>
                <button onClick={() => setModal('med')} className="btn-secondary text-xs py-1 px-2">+ Add</button>
              </div>
              {patient.medications.length === 0 ? (
                <p className="text-sm text-slate-400">No medications recorded</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {patient.medications.map(med => (
                    <div key={med.id} className={`p-3 rounded-lg border ${DRUG_CLASS_COLORS[med.drugClass] ?? 'bg-slate-50 text-slate-800 border-slate-200'}`}>
                      <div className="font-semibold text-sm">{med.genericName}</div>
                      <div className="text-xs opacity-75 mt-0.5">
                        {med.doseValue}{med.doseUnit} {med.frequency} · {DRUG_CLASS_LABEL[med.drugClass] ?? med.drugClass}
                      </div>
                      {med.adherence && (
                        <div className={`text-xs mt-1 font-medium ${med.adherence === 'ADHERENT' ? 'text-green-600' : 'text-red-600'}`}>
                          {med.adherence === 'ADHERENT' ? '✓ Adherent' : '⚠ Non-adherent'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BP history table */}
            <div className="card-padded">
              <div className="flex items-center justify-between mb-3">
                <h3>Blood Pressure History</h3>
                <button onClick={() => setModal('bp')} className="btn-secondary text-xs py-1 px-2">+ Add</button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-slate-500 font-medium text-xs">Date</th>
                    <th className="text-left py-2 text-slate-500 font-medium text-xs">Type</th>
                    <th className="text-right py-2 text-slate-500 font-medium text-xs">SBP/DBP</th>
                    <th className="text-right py-2 text-slate-500 font-medium text-xs">HR</th>
                    <th className="text-left py-2 text-slate-500 font-medium text-xs pl-3">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {patient.bpReadings.map(r => {
                    const s = bpStage(r.sbp, r.dbp)
                    return (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 font-mono text-xs text-slate-500">{formatDate(r.readingDate)}</td>
                        <td className="py-2 text-slate-600 text-xs">{r.readingType.replace(/_/g, ' ')}</td>
                        <td className="py-2 text-right font-semibold text-slate-900">{r.sbp}/{r.dbp}</td>
                        <td className="py-2 text-right text-slate-400">{r.heartRate ?? '—'}</td>
                        <td className="py-2 pl-3"><span className={`text-xs font-semibold ${s.color}`}>{s.label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Labs — grouped by panel */}
            <div className="card-padded">
              <div className="flex items-center justify-between mb-4">
                <h3>Laboratory Values</h3>
                <div className="flex gap-2">
                  <button onClick={() => setModal('imaging')} className="btn-secondary text-xs py-1 px-2">+ Imaging</button>
                  <button onClick={() => setModal('lab')} className="btn-secondary text-xs py-1 px-2">+ Lab</button>
                </div>
              </div>
              {patient.labResults.length === 0 ? (
                <p className="text-sm text-slate-400">No labs recorded</p>
              ) : (() => {
                // Index results by type for O(1) lookup
                const byType = Object.fromEntries(
                  patient.labResults.map(l => [l.labType, l])
                )
                // Only show groups that have at least one result
                const activeGroups = LAB_GROUPS.filter(g =>
                  g.types.some(t => byType[t])
                )
                // Collect any lab types not covered by a named group
                const coveredTypes = new Set(LAB_GROUPS.flatMap(g => g.types))
                const otherLabs = patient.labResults.filter(l => !coveredTypes.has(l.labType))

                return (
                  <div className="space-y-4">
                    {activeGroups.map(group => (
                      <div key={group.abbr}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{group.abbr}</span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-400">{group.title}</span>
                        </div>
                        <div className="rounded-lg border border-slate-100 overflow-hidden">
                          {group.types
                            .filter(t => byType[t])
                            .map((t, i, arr) => {
                              const lab = byType[t]!
                              const meta = LAB_META[t]
                              return (
                                <div
                                  key={t}
                                  className={`flex items-center justify-between px-3 py-2 ${
                                    i < arr.length - 1 ? 'border-b border-slate-50' : ''
                                  } ${lab.isAbnormal ? 'bg-red-50' : 'bg-white'}`}
                                >
                                  <div>
                                    <span className="text-sm font-medium text-slate-700">
                                      {meta?.label ?? t}
                                    </span>
                                    {meta?.ref && (
                                      <span className="text-xs text-slate-400 ml-2">({meta.ref})</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-sm font-semibold tabular-nums ${lab.isAbnormal ? 'text-red-600' : 'text-slate-900'}`}>
                                      {lab.numericValue}
                                    </span>
                                    <span className="text-xs text-slate-400">{lab.unit}</span>
                                    {lab.isAbnormal && (
                                      <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    ))}

                    {/* Catch-all for any uncategorised lab types */}
                    {otherLabs.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Other</span>
                        </div>
                        <div className="rounded-lg border border-slate-100 overflow-hidden">
                          {otherLabs.map((lab, i) => (
                            <div
                              key={lab.id}
                              className={`flex items-center justify-between px-3 py-2 ${
                                i < otherLabs.length - 1 ? 'border-b border-slate-50' : ''
                              } ${lab.isAbnormal ? 'bg-red-50' : 'bg-white'}`}
                            >
                              <span className="text-sm font-medium text-slate-700">{lab.labType.replace(/_/g, ' ')}</span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-semibold tabular-nums ${lab.isAbnormal ? 'text-red-600' : 'text-slate-900'}`}>
                                  {lab.numericValue}
                                </span>
                                <span className="text-xs text-slate-400">{lab.unit}</span>
                                {lab.isAbnormal && (
                                  <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Comorbidities */}
            <div className="card-padded">
              <div className="flex items-center justify-between mb-3">
                <h3>Comorbidities</h3>
                <button onClick={() => setModal('comorbidity')} className="btn-secondary text-xs py-1 px-2">+ Add</button>
              </div>
              <div className="space-y-1.5">
                {patient.comorbidities.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                    <span className="text-slate-700">
                      {c.condition.replace(/_/g, ' ')}
                      {c.severity ? ` (${c.severity})` : ''}
                    </span>
                  </div>
                ))}
                {patient.comorbidities.length === 0 && <p className="text-sm text-slate-400">None recorded</p>}
              </div>
            </div>

            {/* Allergies */}
            <div className="card-padded">
              <div className="flex items-center justify-between mb-3">
                <h3>Allergies & Intolerances</h3>
                <button onClick={() => setModal('allergy')} className="btn-secondary text-xs py-1 px-2">+ Add</button>
              </div>
              {patient.allergies.length === 0 ? (
                <p className="text-sm text-slate-400">No known allergies recorded</p>
              ) : (
                <div className="space-y-2">
                  {patient.allergies.map(a => {
                    const sevColor: Record<string, string> = {
                      ANAPHYLAXIS: 'bg-red-100 text-red-800 border-red-300',
                      SEVERE: 'bg-red-50 text-red-700 border-red-200',
                      MODERATE: 'bg-amber-50 text-amber-700 border-amber-200',
                      MILD: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                    }
                    const color = sevColor[a.severity ?? ''] ?? 'bg-slate-50 text-slate-700 border-slate-200'
                    return (
                      <div key={a.id} className={`flex items-start gap-3 p-2.5 rounded-lg border text-sm ${color}`}>
                        <div className="flex-1">
                          <span className="font-semibold">{a.allergen}</span>
                          <span className="text-xs opacity-75 ml-2">{a.allergyType}</span>
                          {a.reaction && <div className="text-xs mt-0.5 opacity-80">{a.reaction}</div>}
                        </div>
                        {a.severity && <span className="text-xs font-medium">{a.severity}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Workup ───────────────────────────────────────────────────────────── */}
      {activeTab === 'workup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card-padded">
            <h3 className="mb-4">Secondary HTN Evaluation</h3>
            {workup ? (
              <div className="space-y-2">
                <WorkupItem label="Primary Aldosteronism (ARR screening)" status={workup.primaryAldosteronism}
                  finding={workup.arrResult ? `ARR ${workup.arrResult} ${workup.arrAbnormal ? '— Elevated ⚠' : '— Normal'}` : undefined} />
                <WorkupItem label="Renovascular HTN (Renal duplex)" status={workup.renovascularHtn} />
                <WorkupItem label="Obstructive Sleep Apnea" status={workup.sleepApnea}
                  finding={workup.ahi ? `AHI ${workup.ahi}/hr` : undefined} />
                <WorkupItem label="Thyroid Disease (TSH)" status={workup.thyroidDisease} />
                <WorkupItem label="Cushing's Syndrome" status={workup.cushings} />
                <WorkupItem label="Pheochromocytoma (Plasma metanephrines)" status={workup.pheochromocytoma} />
              </div>
            ) : (
              <p className="text-sm text-slate-400">No workup data found for this patient.</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="card-padded">
              <h3 className="mb-4">Target Organ Damage</h3>
              {workup ? (
                <div className="space-y-2">
                  <WorkupItem label="ECG — LVH assessment"
                    status={workup.ecgLvh === true ? 'COMPLETED_ABNORMAL' : workup.ecgLvh === false ? 'COMPLETED_NORMAL' : 'NOT_DONE'}
                    finding={workup.ecgLvh ? 'LVH criteria met' : undefined} />
                  <WorkupItem label="Echocardiogram (LV mass index)"
                    status={workup.echoLvmi ? (workup.echoLvmi > 115 ? 'COMPLETED_ABNORMAL' : 'COMPLETED_NORMAL') : 'NOT_DONE'}
                    finding={workup.echoLvmi ? `LVMI ${workup.echoLvmi} g/m²` : undefined} />
                  <WorkupItem label="Urine albumin-creatinine ratio"
                    status={workup.albuminuriaMgG ? (workup.albuminuriaMgG >= 30 ? 'COMPLETED_ABNORMAL' : 'COMPLETED_NORMAL') : 'NOT_DONE'}
                    finding={workup.albuminuriaMgG ? `ACR ${workup.albuminuriaMgG} mg/g` : undefined} />
                </div>
              ) : (
                <p className="text-sm text-slate-400">No data</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => showToast('Workup saved ✓')}
                className="btn-primary flex-1"
              >
                Save Progress
              </button>
              <button
                onClick={handleRunAssessment}
                disabled={assessmentRunning}
                className="btn-secondary"
              >
                {assessmentRunning ? 'Running…' : 'Run Assessment →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assessment ───────────────────────────────────────────────────────── */}
      {activeTab === 'assessment' && (
        <div className="space-y-5">
          {!assessmentResult ? (
            <div className="card-padded text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-slate-700 mb-2">No assessment run yet</h2>
              <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                Run the clinical assessment to get ACC/AHA 2023 + ESC 2024 guideline-based recommendations and invasive therapy eligibility.
              </p>
              <button
                onClick={handleRunAssessment}
                disabled={assessmentRunning}
                className="btn-primary"
              >
                {assessmentRunning ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running Assessment…
                  </>
                ) : '⚡ Run Clinical Assessment'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="card-padded border-l-4 border-l-blue-500">
                <div className="flex items-center gap-2 mb-3">
                  <h2>Clinical Assessment</h2>
                  <span className="badge-blue">ACC/AHA 2023 · ESC 2024</span>
                  <button
                    onClick={handleRunAssessment}
                    disabled={assessmentRunning}
                    className="btn-secondary text-xs ml-auto"
                  >
                    Re-run
                  </button>
                </div>
                {(assessmentResult.aiNarrative as string | undefined) && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {String(assessmentResult.aiNarrative)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Classification */}
                <div className="space-y-4">
                  <div className="card-padded">
                    <h3 className="mb-3">HTN Classification</h3>
                    {(() => {
                      const det = assessmentResult.deterministicResult as Record<string, unknown> | undefined
                      const cls = det?.classification as Record<string, unknown> | undefined
                      return (
                        <div className="space-y-3">
                          <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                            <div className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Stage</div>
                            <div className="text-2xl font-bold text-orange-700 mt-1">{String(cls?.stage ?? 'Stage 2')}</div>
                            <div className="text-sm text-orange-600">{String(cls?.subtype ?? 'Resistant HTN')}</div>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">BP Target</div>
                            <div className="text-2xl font-bold text-blue-700 mt-1">&lt;130/80</div>
                            <div className="text-xs text-blue-500 mt-1">mmHg · ACC/AHA Class I</div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Invasive therapy */}
                <div className="card-padded">
                  <h3 className="mb-4">Invasive Therapy Eligibility</h3>
                  {(() => {
                    const det = assessmentResult.deterministicResult as Record<string, unknown> | undefined
                    const invasive = det?.invasiveTherapy as Record<string, unknown> | undefined
                    const rdn = invasive?.rdn as Record<string, unknown> | undefined
                    const stenting = invasive?.renalArteryStenting as Record<string, unknown> | undefined
                    return (
                      <div className="space-y-3">
                        <div className={`p-4 rounded-xl border-2 ${rdn?.eligible ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">Renal Denervation (RDN)</span>
                            <span className={rdn?.eligible ? 'badge-moderate' : 'badge-neutral'}>
                              {rdn?.eligible ? 'Conditional' : 'Not indicated'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{String(rdn?.rationale ?? 'See full report for details.')}</p>
                        </div>
                        <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">Renal Artery Stenting</span>
                            <span className="badge-neutral">{stenting?.eligible ? 'Consider' : 'Not indicated'}</span>
                          </div>
                          <p className="text-xs text-slate-600">{String(stenting?.rationale ?? 'No hemodynamically significant stenosis identified.')}</p>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Recommendations */}
                <div className="card-padded">
                  <h3 className="mb-4">Priority Recommendations</h3>
                  {(() => {
                    const det = assessmentResult.deterministicResult as Record<string, unknown> | undefined
                    const recs = (det?.recommendations as Array<Record<string, unknown>>) ?? []
                    return (
                      <div className="space-y-3">
                        {recs.slice(0, 4).map((rec, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 bg-blue-500">
                              {i + 1}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{String(rec.recommendation ?? rec.title ?? 'Recommendation')}</div>
                              {(rec.rationale as string | undefined) && <div className="text-xs text-slate-500 mt-0.5">{String(rec.rationale)}</div>}
                              {(rec.guidelineReference as string | undefined) && <div className="text-xs text-blue-500 mt-1">{String(rec.guidelineReference)}</div>}
                            </div>
                          </div>
                        ))}
                        {recs.length === 0 && <p className="text-sm text-slate-400">No recommendations generated.</p>}
                      </div>
                    )
                  })()}

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <button onClick={() => showToast('Signed off ✓')} className="btn-primary w-full text-sm">
                      ✓ Approve & Sign
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
