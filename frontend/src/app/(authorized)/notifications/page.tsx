'use client'
import { Table2 } from '@/components/notify/Table2'
import React from 'react'
import Button2 from '@/components/custom/Button2';
import Link from 'next/link';
import { useReports } from '@/context/ReportsContext'
import Loading from '../loading'


function formatRepeat(value?: number | null, unit?: string | null): string {
  if (!value || !unit) return '-';
  const lower = unit.toLowerCase();
  const base = `co ${value}`;
  switch (lower) {
    case 'h':
      return `${base}h`;
    case 'd':
      return value === 1 ? 'co dzień' : `${base} dni`;
    case 'm':
      return value === 1 ? 'co minutę' : `${base} minut`;
    default:
      return `${base} ${unit}`;
  }
}


interface TableReportItem {
  id: string;
  name: string;
  status: 'WŁ' | 'WYŁ';
  repeat: string;
}

const Page = () => {
  const { reports, isLoading, removeReport } = useReports()

  if (isLoading) return Loading()

  const mapped: TableReportItem[] = reports.map(r => ({
    id: r.id,
    name: r.name,
    status: r.enabled ? 'WŁ' : 'WYŁ',
    repeat: formatRepeat(r.frequencyValue, r.frequencyUnit)
  }));

  const handleDelete = async (id: string) => {
    await removeReport(id);
  }

  return (
    <div className='max-w-4xl w-full mx-auto'>
      <header className="flex flex-row items-start justify-between gap-4 w-full">
        <div>
          <h1 className="text-4xl font-extrabold dark:text-white mb-3">Powiadomienia</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/notifications/new"><Button2>Utwórz</Button2></Link>
        </div>
      </header>
      <Table2 variant="reports" items={mapped} onDelete={handleDelete} />
    </div>
  );
};

export default Page;
