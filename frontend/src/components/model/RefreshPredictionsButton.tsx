"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RefreshPredictionsButton({ modelId }: { modelId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handle = async () => {
    setLoading(true)
    try {
      const resp = await fetch(`/api/models/${encodeURIComponent(modelId)}/predictions/refresh`, { method: 'POST' })
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '')
        console.error('Refresh failed', resp.status, txt)
      }
      // refresh server components / data
      router.refresh()
    } catch (e) {
      console.error('Refresh error', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="ml-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 disabled:opacity-60"
    >
      {loading ? 'Odświeżanie...' : 'Odśwież'}
    </button>
  )
}
