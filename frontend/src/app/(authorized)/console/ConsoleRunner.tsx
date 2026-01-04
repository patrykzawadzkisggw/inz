"use client"
import React, { useState, useRef, useEffect, useCallback } from 'react'
import FormulaBox from '@/components/FormulaBox'
import { Chart2, ChartResultData } from '@/components/custom/Chart2'
import { SimpleObjectTable } from '@/components/DataTable'
import { useRouter, useSearchParams } from 'next/navigation'

export function ConsoleRunner() {
  const [formula, setFormula] = useState('Print("Hello, World!");')
  const [result, setResult] = useState<string | null>(null)
  type TextItem = { type: 'text'; text: string }
  type TableRow = Record<string, unknown>
  type TableItem = { type: 'table'; columns: string[]; rows: TableRow[] }
  type ChartItem = { type: 'chart'; chartType?: string; data: { series: Record<string, unknown> } }
  type ResultItem = TextItem | TableItem | ChartItem
  const [structured, setStructured] = useState<ResultItem[] | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoSentRef = useRef(false)

  const send = useCallback(async (code?: string) => {
    const toSend = (code !== undefined ? code : formula) ?? ''
    if (!toSend.trim()) {
      setError('Formuła jest pusta')
      return
    }
    try {
      const encoded = encodeURIComponent(toSend)
      router.push(`${window.location.pathname}?code=${encoded}`)
    } catch {
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setStructured(null)
    try {
      const resp = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: toSend })
      })
      const json = await resp.json().catch(()=>null)
      if (!resp.ok) { setError(json?.error || 'Błąd API (' + resp.status + ')'); return }
      if (!json || typeof json.output !== 'string') setError('Brak pola output')
      else setResult(json.output)
      if (Array.isArray(json?.results)) {
        const filtered = (json.results as unknown[]).filter((r: unknown) => {
          if (!r || typeof r !== 'object') return false
          const o = r as { type?: unknown; text?: unknown; columns?: unknown; rows?: unknown; data?: unknown }
          return (
            (o.type === 'text' && typeof o.text === 'string') ||
            (o.type === 'table' && Array.isArray(o.columns) && Array.isArray(o.rows)) ||
            (o.type === 'chart' && !!o.data && typeof o.data === 'object')
          )
        }) as ResultItem[]
        setStructured(filtered)
      }
    } catch (e) {
      const msg = (e as Error)?.message || 'nieznany'
      setError('Wyjątek: ' + msg)
    } finally {
      setLoading(false)
    }
  }, [formula, router])

  useEffect(() => {
    const code = searchParams?.get('code')
    if (code && !autoSentRef.current) {
      autoSentRef.current = true
      const decoded = decodeURIComponent(code)
      setFormula(decoded)
      void send(decoded)
    }
  }, [searchParams, send])

  return (
    <div className="space-y-4 max-w-4xl">
      <FormulaBox Title="Formuła" initialValue={formula} onChangeText={setFormula} />
      <div className="flex gap-2 justify-end">
         <button
          onClick={()=> {
            setFormula(''); setResult(null); setStructured(null); setError(null)
            try {
              router.push(window.location.pathname)
            } catch {}
          }}
          disabled={loading}
          className="px-3 py-2 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
        >Wyczyść</button>
        <button
          onClick={() => void send()}
          disabled={loading}
          className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >{loading ? 'Wysyłanie...' : 'Wyślij'}</button>
       
      </div>
      {error && <div className="text-sm text-red-500 whitespace-pre-wrap">{error}</div>}
      {(result || (structured && structured.length)) && (
        <div className="space-y-4">
          {result && result.trim().length > 0 && (
            <div>
              <div className="text-sm font-semibold mb-1">Stdout</div>
              <div className="rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                {result || '\u00A0'}
              </div>
            </div>
          )}
          {structured && structured.length > 0 && (
            <div className="space-y-6">
              {structured.map((item, idx) => {
                if (item.type === 'text') {
                  return (
                    <div key={idx} className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm whitespace-pre-wrap">
                      {item.text}
                    </div>
                  )
                }
                if (item.type === 'table') {
                  return (
                    <SimpleObjectTable key={idx} data={item.rows} columns={item.columns} />
                  
                  )
                }
                if (item.type === 'chart') {
                  const series = Object.entries(item.data?.series || {}).reduce((acc, [k, v]) => {
                    acc[k] = Array.isArray(v) ? v as unknown[] : [v]
                    return acc
                  }, {} as Record<string, unknown[]>)
                  const chartResult: ChartResultData = { type: 'chart', chartType: item.chartType || 'line', data: { series } }
                  return (
                    <div key={idx} className="rounded border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                      <div className="font-semibold mb-2 text-sm">Wykres ({chartResult.chartType})</div>
                      <Chart2 height={288} result={chartResult} />
                    </div>
                  )
                }
                return null
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
