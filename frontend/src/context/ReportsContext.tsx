'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { 
  listReportsAction, 
  deleteReportAction, 
  createReportAction, 
  updateReportAction, 
  ReportFormState 
} from '@/app/(authorized)/notifications/actions'

export interface Report {
  id: string
  name: string
  enabled: boolean
  frequencyValue?: number
  frequencyUnit?: string
  conditionFormula?: string
  messageTemplate?: string
  userId: string
  createdAt?: Date
  updatedAt?: Date
}

interface ReportsContextType {
  reports: Report[]
  isLoading: boolean
  isMutating: boolean
  refreshReports: () => Promise<void>
  removeReport: (id: string) => Promise<void>
  addReport: (formData: FormData) => Promise<ReportFormState>
  editReport: (id: string, formData: FormData) => Promise<ReportFormState>
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined)

export const ReportsProvider = ({ children, initialReports = [] }: { children: ReactNode, initialReports?: Report[] }) => {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [isLoading, setIsLoading] = useState<boolean>(!initialReports.length)
  const [isMutating, setIsMutating] = useState<boolean>(false)

  const refreshReports = useCallback(async () => {
    try {
      const data = await listReportsAction()
      setReports(data as Report[])
      console.log('Reports refreshed')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialReports.length === 0) {
      refreshReports()
    }
  }, [refreshReports, initialReports.length])

  const removeReport = async (id: string) => {
    const previousReports = [...reports]
    setReports((prev) => prev.filter((r) => r.id !== id))
    setIsMutating(true)

    try {
      await deleteReportAction(id)
    } catch {
      setReports(previousReports)
    } finally {
      setIsMutating(false)
    }
  }

  const addReport = async (formData: FormData): Promise<ReportFormState> => {
    setIsMutating(true)
    try {
      const result = await createReportAction({ errors: {} }, formData)
      
      if (result.ok) {
        setReports((prev) => [result.record as Report, ...prev])
      }
      
      return result
    } catch {
      await refreshReports()
      return { errors: {}, error: 'Wystąpił nieoczekiwany błąd' }
    } finally {
      setIsMutating(false)
    }
  }

  const editReport = async (id: string, formData: FormData): Promise<ReportFormState> => {
    setIsMutating(true)
    try {
      const result = await updateReportAction(id, { errors: {} }, formData)
      
      if (result.ok) {
        const updated = result.record as Report
        setReports((prev) => {
          const idx = prev.findIndex((r) => r.id === id)
          if (idx === -1) return [updated, ...prev]
          const next = [...prev]
          next[idx] = { ...prev[idx], ...updated }
          return next
        })
      }
      
      return result
    } catch {
      await refreshReports()
      return { errors: {}, error: 'Wystąpił nieoczekiwany błąd' }
    } finally {
      setIsMutating(false)
    }
  }

  const value = {
    reports,
    isLoading,
    isMutating,
    refreshReports,
    removeReport,
    addReport,
    editReport
  }

  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  )
}

export const useReports = () => {
  const context = useContext(ReportsContext)
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportsProvider')
  }
  return context
}