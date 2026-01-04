"use client"
import { notFound } from 'next/navigation';
import FunctionForm from '@/components/function/FunctionForm'
import React from 'react'

import { useUserFunctions } from '@/context/UserFunctionsContext'
import Loading from '../../loading';

export default function Page({ params } : { params: { id: string } }) {
  const { id } = params
  const {  functions, editFunction,isLoading } = useUserFunctions()
  if (!id) return notFound()
  const fn = functions.find(f=>f.id === id)


  if (isLoading) return Loading()
  if (!fn) return notFound()
  

  
    


  return (
    <div>
      <h2 className="text-4xl font-extrabold dark:text-white max-w-4xl w-full mx-auto mb-3">Edytuj funkcję</h2>
      <FunctionForm
        isEditMode={true}
        initialName={fn?.name}
        initialBody={fn?.body}
        initialDescription={fn?.description ?? ''}
        onSubmitClient={(fd)=>editFunction(id, fd)}
      />
    </div>
  )
}
