"use client"
import React from 'react'
import FunctionForm from '@/components/function/FunctionForm'
import { useUserFunctions } from '@/context/UserFunctionsContext'

export default function Page() {
  const { addFunction } = useUserFunctions()
  return (
    <div>
      <h2 className="text-4xl font-extrabold dark:text-white max-w-4xl w-full mx-auto mb-3">Nowa funkcja</h2>
      <FunctionForm onSubmitClient={addFunction} />
    </div>
  )
}
