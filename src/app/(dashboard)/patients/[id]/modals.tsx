'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api-client'

// ─── Shared ───────────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormRow({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return <div className={`grid gap-3 ${cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const sel = inp + ' bg-white'

function ErrMsg({ msg }: { msg: string }) {
  return msg ? <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{msg}</div> : null
}

function FooterBtns({ onClose, saving, label }: { onClose: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
        {saving ? 'Saving…' : label}
      </button>
    </div>
  )
}

// ─── Add BP Reading ───────────────────────────────────────────────────────────

export function AddBpModal({ patientId, onClose, onAdded }: { patientId: string; onClose: () => void; onAdded: () => void }) {
  const now = new Date().toISOString().slice(0, 16)
  const [form, setForm] = useState({
    readingDate: now, readingType: 'OFFICE', sbp: '', dbp: '', heartRate: '', arm: 'RIGHT', position: 'SITTING', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await apiFetch(`/api/patients/${patientId}/bp-readings`, {
        method: 'POST',
        body: JSON.stringify({
          readingDate: new Date(form.readingDate).toISOString(),
          readingType: form.readingType,
          sbp: parseInt(form.sbp),
          dbp: parseInt(form.dbp),
          heartRate: form.heartRate ? parseInt(form.heartRate) : undefined,
          arm: form.arm || undefined,
          position: form.position || undefined,
          notes: form.notes || undefined,
        }),
      })
      onAdded()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <ModalShell title="Add BP Reading" onClose={onClose}>
      <form onSubmit={submit} className="p-5 space-y-4">
        <FormRow>
          <Field label="Date & Time">
            <input className={inp} type="datetime-local" value={form.readingDate} onChange={e => set('readingDate', e.target.value)} required />
          </Field>
          <Field label="Reading Type">
            <select className={sel} value={form.readingType} onChange={e => set('readingType', e.target.value)}>
              <option value="OFFICE">Office</option>
              <option value="HOME">Home</option>
              <option value="AMBULATORY_DAYTIME">ABPM Daytime</option>
              <option value="AMBULATORY_NIGHTTIME">ABPM Nighttime</option>
              <option value="AMBULATORY_24H_AVG">ABPM 24h Average</option>
            </select>
          </Field>
        </FormRow>
        <FormRow cols={3}>
          <Field label="SBP (mmHg)">
            <input className={inp} type="number" min={50} max={300} value={form.sbp} onChange={e => set('sbp', e.target.value)} required placeholder="120" />
          </Field>
          <Field label="DBP (mmHg)">
            <input className={inp} type="number" min={30} max={200} value={form.dbp} onChange={e => set('dbp', e.target.value)} required placeholder="80" />
          </Field>
          <Field label="Heart Rate">
            <input className={inp} type="number" min={20} max={300} value={form.heartRate} onChange={e => set('heartRate', e.target.value)} placeholder="—" />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Arm">
            <select className={sel} value={form.arm} onChange={e => set('arm', e.target.value)}>
              <option value="RIGHT">Right</option>
              <option value="LEFT">Left</option>
              <option value="BOTH">Both</option>
            </select>
          </Field>
          <Field label="Position">
            <select className={sel} value={form.position} onChange={e => set('position', e.target.value)}>
              <option value="SITTING">Sitting</option>
              <option value="STANDING">Standing</option>
              <option value="SUPINE">Supine</option>
            </select>
          </Field>
        </FormRow>
        <Field label="Notes (optional)">
          <input className={inp} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Device, circumstances, etc." />
        </Field>
        <ErrMsg msg={err} />
        <FooterBtns onClose={onClose} saving={saving} label="Add Reading" />
      </form>
    </ModalShell>
  )
}

// ─── Add Medication ───────────────────────────────────────────────────────────

const DRUG_CLASS_OPTIONS = [
  { value: 'ACE_INHIBITOR', label: 'ACE Inhibitor' },
  { value: 'ARB', label: 'ARB' },
  { value: 'ARNI', label: 'ARNI (Sacubitril/Valsartan)' },
  { value: 'CALCIUM_CHANNEL_BLOCKER_DHP', label: 'CCB – Dihydropyridine' },
  { value: 'CALCIUM_CHANNEL_BLOCKER_NDHP', label: 'CCB – Non-DHP' },
  { value: 'THIAZIDE_LIKE_DIURETIC', label: 'Thiazide-like Diuretic' },
  { value: 'THIAZIDE_DIURETIC', label: 'Thiazide Diuretic' },
  { value: 'LOOP_DIURETIC', label: 'Loop Diuretic' },
  { value: 'POTASSIUM_SPARING_DIURETIC', label: 'K-Sparing Diuretic' },
  { value: 'MINERALOCORTICOID_ANTAGONIST', label: 'MRA (Spironolactone/Eplerenone)' },
  { value: 'BETA_BLOCKER', label: 'Beta-Blocker' },
  { value: 'ALPHA_BLOCKER', label: 'Alpha-Blocker' },
  { value: 'CENTRAL_ALPHA_AGONIST', label: 'Central Alpha-Agonist' },
  { value: 'DIRECT_VASODILATOR', label: 'Direct Vasodilator' },
  { value: 'RENIN_INHIBITOR', label: 'Renin Inhibitor' },
  { value: 'OTHER', label: 'Other' },
]

export function AddMedModal({ patientId, onClose, onAdded }: { patientId: string; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    genericName: '', brandName: '', drugClass: '', doseValue: '', doseUnit: 'mg',
    frequency: 'once daily', adherence: 'ADHERENT', isAtMaxDose: false, notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await apiFetch(`/api/patients/${patientId}/medications`, {
        method: 'POST',
        body: JSON.stringify({
          genericName: form.genericName,
          brandName: form.brandName || undefined,
          drugClass: form.drugClass || undefined,
          doseValue: form.doseValue ? parseFloat(form.doseValue) : undefined,
          doseUnit: form.doseUnit || undefined,
          frequency: form.frequency,
          adherence: form.adherence || undefined,
          isAtMaxDose: form.isAtMaxDose,
          notes: form.notes || undefined,
        }),
      })
      onAdded()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <ModalShell title="Add Medication" onClose={onClose}>
      <form onSubmit={submit} className="p-5 space-y-4">
        <FormRow>
          <Field label="Generic Name *">
            <input className={inp} value={form.genericName} onChange={e => set('genericName', e.target.value)} required placeholder="Lisinopril" />
          </Field>
          <Field label="Brand Name">
            <input className={inp} value={form.brandName} onChange={e => set('brandName', e.target.value)} placeholder="Zestril" />
          </Field>
        </FormRow>
        <Field label="Drug Class">
          <select className={sel} value={form.drugClass} onChange={e => set('drugClass', e.target.value)}>
            <option value="">— Select class —</option>
            {DRUG_CLASS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <FormRow cols={3}>
          <Field label="Dose">
            <input className={inp} type="number" step="0.5" min={0} value={form.doseValue} onChange={e => set('doseValue', e.target.value)} placeholder="10" />
          </Field>
          <Field label="Unit">
            <select className={sel} value={form.doseUnit} onChange={e => set('doseUnit', e.target.value)}>
              <option value="mg">mg</option>
              <option value="mcg">mcg</option>
              <option value="g">g</option>
              <option value="mEq">mEq</option>
            </select>
          </Field>
          <Field label="Frequency">
            <select className={sel} value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              <option value="once daily">Once daily</option>
              <option value="twice daily">Twice daily</option>
              <option value="three times daily">Three times daily</option>
              <option value="every other day">Every other day</option>
              <option value="weekly">Weekly</option>
              <option value="as needed">As needed</option>
            </select>
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Adherence">
            <select className={sel} value={form.adherence} onChange={e => set('adherence', e.target.value)}>
              <option value="ADHERENT">Adherent</option>
              <option value="PARTIALLY_ADHERENT">Partially Adherent</option>
              <option value="NON_ADHERENT">Non-Adherent</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </Field>
          <Field label="At Max Dose?">
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="maxDose" checked={form.isAtMaxDose} onChange={e => set('isAtMaxDose', e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="maxDose" className="text-sm text-slate-600">Yes, at maximum dose</label>
            </div>
          </Field>
        </FormRow>
        <Field label="Notes (optional)">
          <input className={inp} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Side effects, reason for choice, etc." />
        </Field>
        <ErrMsg msg={err} />
        <FooterBtns onClose={onClose} saving={saving} label="Add Medication" />
      </form>
    </ModalShell>
  )
}

// ─── Add Lab Result ───────────────────────────────────────────────────────────

const LAB_OPTIONS = [
  { group: 'Basic Metabolic', options: [
    { v: 'SODIUM', l: 'Sodium (Na⁺)', unit: 'mEq/L', lo: 136, hi: 145 },
    { v: 'POTASSIUM', l: 'Potassium (K⁺)', unit: 'mEq/L', lo: 3.5, hi: 5.0 },
    { v: 'CHLORIDE', l: 'Chloride (Cl⁻)', unit: 'mEq/L', lo: 98, hi: 106 },
    { v: 'BICARBONATE', l: 'Bicarbonate (HCO₃⁻)', unit: 'mEq/L', lo: 22, hi: 29 },
    { v: 'GLUCOSE', l: 'Glucose', unit: 'mg/dL', lo: 70, hi: 99 },
    { v: 'CALCIUM', l: 'Calcium (Ca²⁺)', unit: 'mg/dL', lo: 8.5, hi: 10.5 },
    { v: 'MAGNESIUM', l: 'Magnesium (Mg²⁺)', unit: 'mg/dL', lo: 1.7, hi: 2.2 },
    { v: 'BUN', l: 'BUN', unit: 'mg/dL', lo: 7, hi: 20 },
    { v: 'CREATININE', l: 'Creatinine', unit: 'mg/dL', lo: 0.6, hi: 1.3 },
    { v: 'EGFR', l: 'eGFR', unit: 'mL/min/1.73m²', lo: 60, hi: 999 },
    { v: 'URIC_ACID', l: 'Uric Acid', unit: 'mg/dL', lo: 3.5, hi: 7.2 },
  ]},
  { group: 'Renal / Urine', options: [
    { v: 'URINE_ALBUMIN_CREATININE_RATIO', l: 'Albumin:Creatinine Ratio (ACR)', unit: 'mg/g', lo: 0, hi: 30 },
    { v: 'URINE_PROTEIN_CREATININE_RATIO', l: 'Protein:Creatinine Ratio', unit: 'mg/g', lo: 0, hi: 150 },
    { v: 'URINE_MICROALBUMIN', l: 'Urine Microalbumin', unit: 'mg/L', lo: 0, hi: 20 },
    { v: 'URINE_SODIUM_24H', l: 'Urine Na 24h', unit: 'mEq/day', lo: 100, hi: 200 },
  ]},
  { group: 'Lipids', options: [
    { v: 'TOTAL_CHOLESTEROL', l: 'Total Cholesterol', unit: 'mg/dL', lo: 0, hi: 200 },
    { v: 'LDL_CHOLESTEROL', l: 'LDL Cholesterol', unit: 'mg/dL', lo: 0, hi: 100 },
    { v: 'HDL_CHOLESTEROL', l: 'HDL Cholesterol', unit: 'mg/dL', lo: 40, hi: 999 },
    { v: 'TRIGLYCERIDES', l: 'Triglycerides', unit: 'mg/dL', lo: 0, hi: 150 },
    { v: 'APOLIPOPROTEIN_B', l: 'Apolipoprotein B', unit: 'mg/dL', lo: 0, hi: 90 },
  ]},
  { group: 'Aldosterone / Renin', options: [
    { v: 'PLASMA_ALDOSTERONE', l: 'Plasma Aldosterone', unit: 'ng/dL', lo: 1, hi: 16 },
    { v: 'PLASMA_RENIN_ACTIVITY', l: 'Plasma Renin Activity (PRA)', unit: 'ng/mL/h', lo: 0.6, hi: 4.3 },
    { v: 'PLASMA_RENIN_DIRECT', l: 'Direct Renin', unit: 'mU/L', lo: 2.8, hi: 39.9 },
    { v: 'ALDOSTERONE_RENIN_RATIO', l: 'Aldosterone:Renin Ratio (ARR)', unit: '', lo: 0, hi: 30 },
  ]},
  { group: 'Thyroid', options: [
    { v: 'TSH', l: 'TSH', unit: 'mU/L', lo: 0.4, hi: 4.0 },
    { v: 'FREE_T4', l: 'Free T4', unit: 'ng/dL', lo: 0.8, hi: 1.8 },
    { v: 'FREE_T3', l: 'Free T3', unit: 'pg/mL', lo: 2.3, hi: 4.1 },
  ]},
  { group: 'Metabolic', options: [
    { v: 'HBA1C', l: 'HbA1c', unit: '%', lo: 0, hi: 5.7 },
    { v: 'INSULIN_FASTING', l: 'Fasting Insulin', unit: 'µIU/mL', lo: 2, hi: 20 },
    { v: 'HOMOCYSTEINE', l: 'Homocysteine', unit: 'µmol/L', lo: 0, hi: 15 },
    { v: 'HSCRP', l: 'hs-CRP', unit: 'mg/L', lo: 0, hi: 1.0 },
  ]},
  { group: 'Adrenal / Pheo', options: [
    { v: 'PLASMA_METANEPHRINES', l: 'Plasma Metanephrines', unit: 'pg/mL', lo: 0, hi: 57 },
    { v: 'PLASMA_NORMETANEPHRINES', l: 'Plasma Normetanephrines', unit: 'pg/mL', lo: 0, hi: 148 },
    { v: 'CORTISOL_AM', l: 'Cortisol AM', unit: 'mcg/dL', lo: 6, hi: 23 },
    { v: 'DEXAMETHASONE_SUPPRESSION', l: 'Dex Suppression (1mg)', unit: 'mcg/dL', lo: 0, hi: 1.8 },
    { v: 'URINE_FREE_CORTISOL_24H', l: 'Urine Free Cortisol 24h', unit: 'mcg/day', lo: 0, hi: 50 },
  ]},
  { group: 'CBC', options: [
    { v: 'HEMOGLOBIN', l: 'Hemoglobin', unit: 'g/dL', lo: 12, hi: 17 },
    { v: 'HEMATOCRIT', l: 'Hematocrit', unit: '%', lo: 36, hi: 50 },
    { v: 'WBC', l: 'WBC', unit: '×10³/µL', lo: 4.5, hi: 11 },
    { v: 'PLATELETS', l: 'Platelets', unit: '×10³/µL', lo: 150, hi: 400 },
  ]},
  { group: 'Cardiac Biomarkers', options: [
    { v: 'BNP', l: 'BNP', unit: 'pg/mL', lo: 0, hi: 100 },
    { v: 'NT_PROBNP', l: 'NT-proBNP', unit: 'pg/mL', lo: 0, hi: 125 },
    { v: 'TROPONIN_I', l: 'Troponin I', unit: 'ng/mL', lo: 0, hi: 0.04 },
  ]},
]

const labFlat = LAB_OPTIONS.flatMap(g => g.options)

export function AddLabModal({ patientId, onClose, onAdded }: { patientId: string; onClose: () => void; onAdded: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [labType, setLabType] = useState('')
  const [labDate, setLabDate] = useState(today)
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('')
  const [isAbnormal, setIsAbnormal] = useState(false)
  const [performingLab, setPerformingLab] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function onTypeChange(v: string) {
    setLabType(v)
    const meta = labFlat.find(l => l.v === v)
    if (meta) setUnit(meta.unit)
  }

  function autoAbnormal() {
    const meta = labFlat.find(l => l.v === labType)
    if (!meta || !value) return
    const n = parseFloat(value)
    setIsAbnormal(n < meta.lo || n > meta.hi)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await apiFetch(`/api/patients/${patientId}/labs`, {
        method: 'POST',
        body: JSON.stringify({
          labDate: new Date(labDate + 'T12:00:00.000Z').toISOString(),
          labType,
          numericValue: value ? parseFloat(value) : undefined,
          unit: unit || undefined,
          isAbnormal,
          performingLab: performingLab || undefined,
          notes: notes || undefined,
        }),
      })
      onAdded()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <ModalShell title="Add Lab Result" onClose={onClose}>
      <form onSubmit={submit} className="p-5 space-y-4">
        <Field label="Lab Test *">
          <select className={sel} value={labType} onChange={e => onTypeChange(e.target.value)} required>
            <option value="">— Select lab test —</option>
            {LAB_OPTIONS.map(g => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
        <FormRow>
          <Field label="Date *">
            <input className={inp} type="date" value={labDate} onChange={e => setLabDate(e.target.value)} required />
          </Field>
          <Field label="Performing Lab">
            <input className={inp} value={performingLab} onChange={e => setPerformingLab(e.target.value)} placeholder="Quest, LabCorp…" />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Result Value">
            <div className="flex gap-2">
              <input className={inp} type="number" step="any" value={value} onChange={e => setValue(e.target.value)} onBlur={autoAbnormal} placeholder="0.0" />
            </div>
          </Field>
          <Field label="Unit">
            <input className={inp} value={unit} onChange={e => setUnit(e.target.value)} placeholder="mg/dL" />
          </Field>
        </FormRow>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="abnormal" checked={isAbnormal} onChange={e => setIsAbnormal(e.target.checked)} className="w-4 h-4 rounded" />
          <label htmlFor="abnormal" className="text-sm text-slate-600">Mark as abnormal</label>
          {labType && value && (
            <button type="button" onClick={autoAbnormal} className="text-xs text-blue-600 hover:underline ml-auto">
              Auto-detect from reference range
            </button>
          )}
        </div>
        <Field label="Notes (optional)">
          <input className={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Fasting, hemolyzed specimen, etc." />
        </Field>
        <ErrMsg msg={err} />
        <FooterBtns onClose={onClose} saving={saving} label="Add Lab Result" />
      </form>
    </ModalShell>
  )
}

// ─── Add Comorbidity ──────────────────────────────────────────────────────────

const COMORBIDITY_OPTIONS = [
  { group: 'Diabetes / Metabolic', options: [
    { v: 'DIABETES_TYPE2', l: 'Diabetes Mellitus Type 2' },
    { v: 'DIABETES_TYPE1', l: 'Diabetes Mellitus Type 1' },
    { v: 'PREDIABETES', l: 'Prediabetes' },
    { v: 'METABOLIC_SYNDROME', l: 'Metabolic Syndrome' },
    { v: 'OBESITY', l: 'Obesity' },
    { v: 'DYSLIPIDEMIA', l: 'Dyslipidemia' },
  ]},
  { group: 'Cardiovascular', options: [
    { v: 'CORONARY_ARTERY_DISEASE', l: 'Coronary Artery Disease' },
    { v: 'MYOCARDIAL_INFARCTION_HISTORY', l: 'Prior Myocardial Infarction' },
    { v: 'HEART_FAILURE_REDUCED_EF', l: 'Heart Failure with Reduced EF (HFrEF)' },
    { v: 'HEART_FAILURE_PRESERVED_EF', l: 'Heart Failure with Preserved EF (HFpEF)' },
    { v: 'ATRIAL_FIBRILLATION', l: 'Atrial Fibrillation' },
    { v: 'PERIPHERAL_ARTERY_DISEASE', l: 'Peripheral Artery Disease' },
    { v: 'AORTIC_ANEURYSM', l: 'Aortic Aneurysm' },
    { v: 'AORTIC_STENOSIS', l: 'Aortic Stenosis' },
    { v: 'COARCTATION_OF_AORTA', l: 'Coarctation of the Aorta' },
  ]},
  { group: 'Cerebrovascular', options: [
    { v: 'STROKE_ISCHEMIC', l: 'Ischemic Stroke' },
    { v: 'TIA', l: 'TIA' },
  ]},
  { group: 'Renal', options: [
    { v: 'CHRONIC_KIDNEY_DISEASE', l: 'Chronic Kidney Disease' },
    { v: 'END_STAGE_RENAL_DISEASE', l: 'End-Stage Renal Disease' },
    { v: 'NEPHROTIC_SYNDROME', l: 'Nephrotic Syndrome' },
  ]},
  { group: 'Secondary HTN Causes', options: [
    { v: 'PRIMARY_ALDOSTERONISM', l: 'Primary Aldosteronism' },
    { v: 'RENOVASCULAR_HYPERTENSION', l: 'Renovascular Hypertension' },
    { v: 'CUSHINGS_SYNDROME', l: "Cushing's Syndrome" },
    { v: 'PHEOCHROMOCYTOMA', l: 'Pheochromocytoma' },
    { v: 'PARAGANGLIOMA', l: 'Paraganglioma' },
    { v: 'HYPOTHYROIDISM', l: 'Hypothyroidism' },
    { v: 'HYPERTHYROIDISM', l: 'Hyperthyroidism' },
    { v: 'HYPERPARATHYROIDISM', l: 'Hyperparathyroidism' },
    { v: 'OBSTRUCTIVE_SLEEP_APNEA', l: 'Obstructive Sleep Apnea' },
  ]},
  { group: 'Medications / Lifestyle', options: [
    { v: 'NSAID_USE_REGULAR', l: 'Regular NSAID Use' },
    { v: 'ORAL_CONTRACEPTIVE_USE', l: 'Oral Contraceptive Use' },
    { v: 'ALCOHOL_USE_DISORDER', l: 'Alcohol Use Disorder' },
    { v: 'STIMULANT_USE', l: 'Stimulant Use (Cocaine/Amphetamines)' },
  ]},
  { group: 'Other', options: [
    { v: 'DEPRESSION', l: 'Depression' },
    { v: 'ANXIETY', l: 'Anxiety' },
    { v: 'CHRONIC_PAIN_SYNDROME', l: 'Chronic Pain Syndrome' },
    { v: 'AUTOIMMUNE_DISEASE', l: 'Autoimmune Disease' },
    { v: 'PREGNANCY_RELATED_HTN', l: 'Pregnancy-Related HTN' },
  ]},
]

export function AddComorbidityModal({ patientId, onClose, onAdded }: { patientId: string; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ condition: '', severity: '', icdCode: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await apiFetch(`/api/patients/${patientId}/comorbidities`, {
        method: 'POST',
        body: JSON.stringify({
          condition: form.condition,
          severity: form.severity || undefined,
          icdCode: form.icdCode || undefined,
          notes: form.notes || undefined,
        }),
      })
      onAdded()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <ModalShell title="Add Comorbidity" onClose={onClose}>
      <form onSubmit={submit} className="p-5 space-y-4">
        <Field label="Condition *">
          <select className={sel} value={form.condition} onChange={e => set('condition', e.target.value)} required>
            <option value="">— Select condition —</option>
            {COMORBIDITY_OPTIONS.map(g => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
        <FormRow>
          <Field label="Severity">
            <select className={sel} value={form.severity} onChange={e => set('severity', e.target.value)}>
              <option value="">Not specified</option>
              <option value="Mild">Mild</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
            </select>
          </Field>
          <Field label="ICD-10 Code">
            <input className={inp} value={form.icdCode} onChange={e => set('icdCode', e.target.value)} placeholder="e.g. N18.3" />
          </Field>
        </FormRow>
        <Field label="Notes (optional)">
          <input className={inp} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Stage, management, relevant details" />
        </Field>
        <ErrMsg msg={err} />
        <FooterBtns onClose={onClose} saving={saving} label="Add Comorbidity" />
      </form>
    </ModalShell>
  )
}

// ─── Add Allergy ──────────────────────────────────────────────────────────────

export function AddAllergyModal({ patientId, onClose, onAdded }: { patientId: string; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ allergen: '', allergyType: 'DRUG', reaction: '', severity: 'MODERATE', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await apiFetch(`/api/patients/${patientId}/allergies`, {
        method: 'POST',
        body: JSON.stringify({
          allergen: form.allergen,
          allergyType: form.allergyType,
          reaction: form.reaction || undefined,
          severity: form.severity || undefined,
          notes: form.notes || undefined,
        }),
      })
      onAdded()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <ModalShell title="Add Allergy / Intolerance" onClose={onClose}>
      <form onSubmit={submit} className="p-5 space-y-4">
        <FormRow>
          <Field label="Allergen *">
            <input className={inp} value={form.allergen} onChange={e => set('allergen', e.target.value)} required placeholder="Penicillin, Shellfish…" />
          </Field>
          <Field label="Type">
            <select className={sel} value={form.allergyType} onChange={e => set('allergyType', e.target.value)}>
              <option value="DRUG">Drug</option>
              <option value="FOOD">Food</option>
              <option value="ENVIRONMENTAL">Environmental</option>
              <option value="LATEX">Latex</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Reaction">
            <input className={inp} value={form.reaction} onChange={e => set('reaction', e.target.value)} placeholder="Hives, angioedema, rash…" />
          </Field>
          <Field label="Severity">
            <select className={sel} value={form.severity} onChange={e => set('severity', e.target.value)}>
              <option value="MILD">Mild</option>
              <option value="MODERATE">Moderate</option>
              <option value="SEVERE">Severe</option>
              <option value="ANAPHYLAXIS">Anaphylaxis</option>
            </select>
          </Field>
        </FormRow>
        <Field label="Notes (optional)">
          <input className={inp} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional details" />
        </Field>
        <ErrMsg msg={err} />
        <FooterBtns onClose={onClose} saving={saving} label="Add Allergy" />
      </form>
    </ModalShell>
  )
}

// ─── Add Imaging Study ────────────────────────────────────────────────────────

const IMAGING_OPTIONS = [
  { group: 'Renal / Vascular', options: [
    { v: 'RENAL_DUPLEX_ULTRASOUND', l: 'Renal Duplex Ultrasound' },
    { v: 'CTA_RENAL_ARTERIES', l: 'CTA Renal Arteries' },
    { v: 'MRA_RENAL_ARTERIES', l: 'MRA Renal Arteries' },
    { v: 'RENAL_ANGIOGRAM', l: 'Renal Angiogram' },
    { v: 'RENAL_ULTRASOUND', l: 'Renal Ultrasound' },
    { v: 'ABDOMINAL_ULTRASOUND', l: 'Abdominal Ultrasound' },
    { v: 'CT_AORTA', l: 'CT Aorta' },
  ]},
  { group: 'Cardiac', options: [
    { v: 'ECHOCARDIOGRAM_TTE', l: 'Echocardiogram (TTE)' },
    { v: 'ECHOCARDIOGRAM_TEE', l: 'Echocardiogram (TEE)' },
    { v: 'CARDIAC_MRI', l: 'Cardiac MRI' },
    { v: 'ECG', l: 'ECG / EKG' },
    { v: 'CHEST_XRAY', l: 'Chest X-Ray' },
  ]},
  { group: 'Adrenal / Endocrine', options: [
    { v: 'ADRENAL_CT', l: 'Adrenal CT' },
    { v: 'ADRENAL_MRI', l: 'Adrenal MRI' },
  ]},
  { group: 'Sleep / Other', options: [
    { v: 'POLYSOMNOGRAPHY', l: 'Polysomnography (Sleep Study)' },
    { v: 'AMBULATORY_BP_MONITOR', l: 'Ambulatory BP Monitor (ABPM)' },
    { v: 'FUNDUSCOPIC_EXAM', l: 'Funduscopic Exam' },
  ]},
]

export function AddImagingModal({ patientId, onClose, onAdded }: { patientId: string; onClose: () => void; onAdded: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    studyType: '', studyDate: today, indication: '', findings: '', impression: '',
    performingFacility: '', lvEjectionFraction: '', lvMassIndex: '',
    stenosisPercentLeft: '', stenosisPercentRight: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const isCardiac = ['ECHOCARDIOGRAM_TTE', 'ECHOCARDIOGRAM_TEE', 'CARDIAC_MRI'].includes(form.studyType)
  const isRenal = ['RENAL_DUPLEX_ULTRASOUND', 'CTA_RENAL_ARTERIES', 'MRA_RENAL_ARTERIES', 'RENAL_ANGIOGRAM'].includes(form.studyType)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await apiFetch(`/api/patients/${patientId}/imaging`, {
        method: 'POST',
        body: JSON.stringify({
          studyType: form.studyType,
          studyDate: new Date(form.studyDate + 'T12:00:00.000Z').toISOString(),
          indication: form.indication || undefined,
          findings: form.findings || undefined,
          impression: form.impression || undefined,
          performingFacility: form.performingFacility || undefined,
          lvEjectionFraction: form.lvEjectionFraction ? parseFloat(form.lvEjectionFraction) : undefined,
          lvMassIndex: form.lvMassIndex ? parseFloat(form.lvMassIndex) : undefined,
          stenosisPercentLeft: form.stenosisPercentLeft ? parseFloat(form.stenosisPercentLeft) : undefined,
          stenosisPercentRight: form.stenosisPercentRight ? parseFloat(form.stenosisPercentRight) : undefined,
        }),
      })
      onAdded()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <ModalShell title="Add Imaging / Study" onClose={onClose}>
      <form onSubmit={submit} className="p-5 space-y-4">
        <FormRow>
          <Field label="Study Type *">
            <select className={sel} value={form.studyType} onChange={e => set('studyType', e.target.value)} required>
              <option value="">— Select study —</option>
              {IMAGING_OPTIONS.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Study Date *">
            <input className={inp} type="date" value={form.studyDate} onChange={e => set('studyDate', e.target.value)} required />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Indication">
            <input className={inp} value={form.indication} onChange={e => set('indication', e.target.value)} placeholder="HTN workup, rule out RAS…" />
          </Field>
          <Field label="Performing Facility">
            <input className={inp} value={form.performingFacility} onChange={e => set('performingFacility', e.target.value)} placeholder="Hospital / radiology group" />
          </Field>
        </FormRow>
        {isCardiac && (
          <FormRow>
            <Field label="EF (%)">
              <input className={inp} type="number" step="1" min={0} max={100} value={form.lvEjectionFraction} onChange={e => set('lvEjectionFraction', e.target.value)} placeholder="55" />
            </Field>
            <Field label="LV Mass Index (g/m²)">
              <input className={inp} type="number" step="0.1" value={form.lvMassIndex} onChange={e => set('lvMassIndex', e.target.value)} placeholder="95" />
            </Field>
          </FormRow>
        )}
        {isRenal && (
          <FormRow>
            <Field label="Left Stenosis (%)">
              <input className={inp} type="number" min={0} max={100} value={form.stenosisPercentLeft} onChange={e => set('stenosisPercentLeft', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Right Stenosis (%)">
              <input className={inp} type="number" min={0} max={100} value={form.stenosisPercentRight} onChange={e => set('stenosisPercentRight', e.target.value)} placeholder="0" />
            </Field>
          </FormRow>
        )}
        <Field label="Findings">
          <textarea className={inp + ' min-h-[80px] resize-none'} value={form.findings} onChange={e => set('findings', e.target.value)} placeholder="Radiologist findings narrative" />
        </Field>
        <Field label="Impression / Conclusion">
          <textarea className={inp + ' min-h-[60px] resize-none'} value={form.impression} onChange={e => set('impression', e.target.value)} placeholder="Final radiologist impression" />
        </Field>
        <ErrMsg msg={err} />
        <FooterBtns onClose={onClose} saving={saving} label="Add Study" />
      </form>
    </ModalShell>
  )
}
