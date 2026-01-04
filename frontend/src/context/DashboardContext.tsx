"use client"
import { createContext, useContext, useState } from "react"

type DashboardContextType = {
  isEditMode: boolean
  isModalOpen: boolean
  toggleEditMode: () => void
  openModal: () => void
    closeModal: () => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const toggleEditMode = () => setIsEditMode(prev => !prev)
  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  return (
    <DashboardContext.Provider value={{ isEditMode, toggleEditMode, openModal, closeModal, isModalOpen }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider")
  return ctx
}
