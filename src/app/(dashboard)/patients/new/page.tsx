import { redirect } from 'next/navigation'

// /patients/new → redirect to patients list (new patient is created via modal)
export default function NewPatientPage() {
  redirect('/patients')
}
