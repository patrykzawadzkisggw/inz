'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { 
  listFunctionsAction, 
  deleteFunctionAction, 
  createFunctionAction, 
  updateFunctionAction, 
  FunctionFormState 
} from '@/app/(authorized)/functions/actions'

export interface UserFunction {
  id: string
  name: string
  description?: string
  body: string
  body2?: string
  userId: string
  createdAt?: Date
  updatedAt?: Date
}

interface UserFunctionsContextType {
  functions: UserFunction[]
  isLoading: boolean
  isMutating: boolean
  refreshFunctions: () => Promise<void>
  removeFunction: (id: string) => Promise<void>
  addFunction: (formData: FormData) => Promise<FunctionFormState>
  editFunction: (id: string, formData: FormData) => Promise<FunctionFormState>
}

const UserFunctionsContext = createContext<UserFunctionsContextType | undefined>(undefined)

export const UserFunctionsProvider = ({ children, initialFunctions = [] }: { children: ReactNode, initialFunctions?: UserFunction[] }) => {
  const [functions, setFunctions] = useState<UserFunction[]>(initialFunctions)
  const [isLoading, setIsLoading] = useState<boolean>(!initialFunctions.length)
  const [isMutating, setIsMutating] = useState<boolean>(false)

  const refreshFunctions = useCallback(async () => {
    try {
      const data = await listFunctionsAction()
      setFunctions(data  as UserFunction[])
      console.log('Functions refreshed')
    }  finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialFunctions.length === 0) {
      refreshFunctions()
    }
  }, [refreshFunctions, initialFunctions.length])

  const removeFunction = async (id: string) => {
    const previousFunctions = [...functions]
    setFunctions((prev) => prev.filter((fn) => fn.id !== id))
    setIsMutating(true)

    try {
      await deleteFunctionAction(id)
    } catch {
      setFunctions(previousFunctions)
    } finally {
      setIsMutating(false)
    }
  }

  const addFunction = async (formData: FormData): Promise<FunctionFormState> => {
    setIsMutating(true)
    try {
      const result = await createFunctionAction({ errors: {} }, formData)
      
      if (result.ok) {
          setFunctions((prev) => [result.record as UserFunction, ...prev])

      } else if (result.error) {
      }
      
      return result
    } catch  {
      await refreshFunctions()
      return { errors: {}, error: 'Wystąpił nieoczekiwany błąd' }
    } finally {
      setIsMutating(false)
    }
  }

   const editFunction = async (id: string, formData: FormData): Promise<FunctionFormState> => {
    setIsMutating(true)
    try {
      const result = await updateFunctionAction(id, { errors: {} }, formData)
      
      if (result.ok) {
       const updated = result.record as UserFunction
          setFunctions((prev) => {
            const idx = prev.findIndex((f) => f.id === id)
            if (idx === -1) return [updated, ...prev]
            const next = [...prev]
            next[idx] = { ...prev[idx], ...updated }
            return next
          })
        
      }
      
      return result
    } catch {
      await refreshFunctions()
      return { errors: {}, error: 'Wystąpił nieoczekiwany błąd' }
    } finally {
      setIsMutating(false)
    }
  }

  const value = {
    functions,
    isLoading,
    isMutating,
    refreshFunctions,
    removeFunction,
    addFunction,
    editFunction
  }

  return (
    <UserFunctionsContext.Provider value={value}>
      {children}
    </UserFunctionsContext.Provider>
  )
}

export const useUserFunctions = () => {
  const context = useContext(UserFunctionsContext)
  if (context === undefined) {
    throw new Error('useUserFunctions must be used within a UserFunctionsProvider')
  }
  return context
}