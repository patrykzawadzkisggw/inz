'use client'
import { Table2 } from '@/components/notify/Table2'
import React from 'react'
import { useUserFunctions } from '@/context/UserFunctionsContext'
import Link from 'next/link';
import Button2 from '@/components/custom/Button2';
import Loading from '../loading'


export default function Page() {
  const { functions, removeFunction, isLoading } = useUserFunctions()

  if (isLoading) return Loading()

  return (
    <div className='max-w-4xl w-full mx-auto'>
      <header className="flex flex-row items-start justify-between gap-4 w-full">
        <div>
          <h1 className="text-4xl font-extrabold dark:text-white mb-3">Funkcje</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/functions/new"><Button2>Utwórz</Button2></Link>
        </div>
      </header>
  <Table2
        variant="functions"
        items={functions}
        onDelete={removeFunction}
      />
    </div>
  )
}

