"use client"
import NotifyForm from '@/components/notify/NotifyForm'
import { useReports } from '@/context/ReportsContext'

export default function Page() {
  const { addReport } = useReports()
  return (
    <div>
      <h2 className="text-4xl font-extrabold dark:text-white max-w-4xl w-full mx-auto mb-3">Dodaj nowy raport</h2>
  <NotifyForm onSubmitClient={addReport} />
    </div>
  )
}
