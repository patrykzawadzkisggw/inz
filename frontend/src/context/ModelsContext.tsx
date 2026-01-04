'use client'

import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react'
import { 
  createModelAction,
  updateModelAction,
  deleteModelAction,
  type ModelFormState,
  listModelsAction,
} from '@/app/(authorized)/models/actions'
import { ForecastConfig } from '@/components/model/EditModelTabs'

export interface ModelItem {
  id: string
  name: string
  description?: string | null
  type?: string | null
  mode?: string | null
  enableUpdates?: boolean
  updatedAt?: Date
  configJson?: ForecastConfig | null
  imports?: Array<{processedSchemaJson?: Array<{ name?: string; key?: string; removed?: boolean }>}>
}


interface ModelsContextType {
  models: ModelItem[]
  isLoading: boolean
  isMutating: boolean
  refreshModels: () => Promise<void>
  addModel: (formData: FormData) => Promise<ModelFormState>
  editModel: (id: string, formData: FormData) => Promise<ModelFormState>
  removeModel: (id: string) => Promise<{ ok?: boolean; error?: string }>
}

const ModelsContext = createContext<ModelsContextType | undefined>(undefined)

export const ModelsProvider = ({ children, initialModels = [] }: { children: ReactNode, initialModels?: ModelItem[] }) => {
  const [models, setModels] = useState<ModelItem[]>(initialModels)
  const [isLoading, setIsLoading] = useState<boolean>(!initialModels.length)
  const [isMutating, setIsMutating] = useState<boolean>(false)

  const refreshModels = useCallback(async () => {
    try {
      const resp = await listModelsAction()
      
      setModels(resp as ModelItem[])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialModels.length) refreshModels()
  }, [initialModels.length, refreshModels])

  const addModel = async (formData: FormData): Promise<ModelFormState> => {
    setIsMutating(true)
    try {
      const result = await createModelAction({ errors: {} }, formData)
      if (result.ok) {
        await refreshModels()
      }
      return result
    } finally {
      setIsMutating(false)
    }
  }

  const editModel = async (id: string, formData: FormData): Promise<ModelFormState> => {
    setIsMutating(true)
    try {
      const result = await updateModelAction({ errors: {} }, formData)
      if (result.ok) {
        await refreshModels()
      }
      return result
    } finally {
      setIsMutating(false)
    }
  }

  const removeModel = async (id: string) => {
    setIsMutating(true)
    const prev = [...models]
    setModels(m => m.filter(x => x.id !== id))
    try {
      const res = await deleteModelAction(id)
      if (res?.ok) return { ok: true }
      setModels(prev)
      return { error: res?.error || 'Nie udało się usunąć modelu' }
    } catch {
      setModels(prev)
      return { error: 'Nie udało się usunąć modelu' }
    } finally {
      setIsMutating(false)
    }
  }



  const value: ModelsContextType = {
    models,
    isLoading,
    isMutating,
    refreshModels,
    addModel,
    editModel,
    removeModel
  }

  return (
    <ModelsContext.Provider value={value}>
      {children}
    </ModelsContext.Provider>
  )
}

export const useModels = () => {
  const ctx = useContext(ModelsContext)
  if (!ctx) throw new Error('useModels must be used within a ModelsProvider')
  return ctx
}
