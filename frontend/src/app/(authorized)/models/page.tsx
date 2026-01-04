"use client";
import React from 'react';
import Button2 from '@/components/custom/Button2';
import { ModelsTable, ModelRowData } from '@/components/model/ModelsTable';
import { useModels } from '@/context/ModelsContext';
import Loading from '../loading'
import Link from 'next/link';

const ModelsListPage = () => {
  const { models, isLoading } = useModels()
  if (isLoading) return Loading()
  const rows: ModelRowData[] = models as ModelRowData[]
console.log(models)

  return (
    <div className="max-w-4xl w-full mx-auto">
      <header className="flex flex-row items-start justify-between gap-4 w-full">
        <div>
          <h1 className="text-4xl font-extrabold dark:text-white mb-3">Modele</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/models/new"><Button2>Nowy model</Button2></Link>
        </div>
      </header>

      <ModelsTable rows={rows} />
    </div>
  )
}

export default ModelsListPage
