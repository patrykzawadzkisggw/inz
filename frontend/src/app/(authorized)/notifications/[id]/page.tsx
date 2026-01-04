
"use client"
import NotifyForm from '@/components/notify/NotifyForm';
import { notFound } from 'next/navigation';
import React from 'react'
import { useReports } from '@/context/ReportsContext'

const Page = ({ params } : { params: { id: string } }) => {
  const { reports, editReport } = useReports()
  const { id } = params;
  if (!id) return notFound()
  const report = reports.find(r=>r.id === id)

  if (!report) return notFound()
  

  return (
    <div>
        <h2 className="text-4xl font-extrabold dark:text-white max-w-4xl w-full mx-auto mb-3">Edytuj</h2>
      <NotifyForm
        onSubmitClient={editReport.bind(null, id)}
        isEditMode={true}
        initialName={report?.name}
        initialEnabled={report?.enabled}
        initialFrequency={report?.frequencyValue ?? undefined}
        initialUnit={report?.frequencyUnit ?? ''}
        initialCondition={report?.conditionFormula || ''}
        initialContent={report?.messageTemplate || ''}
      />
    </div>
  )
}

export default Page;
