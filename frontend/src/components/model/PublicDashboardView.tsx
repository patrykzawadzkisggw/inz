"use client"

import React from 'react'
import { DashboardProvider } from '@/context/DashboardContext'
import DashboardGrid from '@/components/DashboardGrid'
import { GridItem } from '@/lib/gridHelpers'

export default function PublicDashboardView({ initialItems }: { initialItems: GridItem[] }) {
  return (
    <DashboardProvider>
      <DashboardGrid initialItems={initialItems} readOnly={true} />
    </DashboardProvider>
  )
}
