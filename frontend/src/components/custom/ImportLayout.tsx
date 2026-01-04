"use client"
import React, { useMemo, useState } from 'react'
import Button2 from './Button2'
import { FileImport } from './FileImport'
import Input2 from './Input2'
import { TypeSelector, ImportSourceType } from './TypeSelector'
import ImportPreviewModal, { SchemaCol } from '@/components/custom/ImportPreviewModal'

import { useParams } from 'next/navigation'
import {
  parseCSVText,
  PreviewGrid,
  isJsonPreferred,
  normalizeSeparator,
  gridFromJsonText,
  buildKeyBaseFile,
  buildKeyBaseUrl,
} from '@/lib/importHelpers'

type ImportFormat = 'auto' | 'csv' | 'json'



const ImportLayout = () => {
  const params = useParams() as Record<string, string | string[]>
  const modelId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined

  const [sourceType, setSourceType] = useState<ImportSourceType>('url')
  const [file, setFile] = useState<File | null>(null)
  const [urlValue, setUrlValue] = useState('')
  const [format, setFormat] = useState<ImportFormat>('auto')
  const [separator, setSeparator] = useState<string>(',')
  const [headerRow, setHeaderRow] = useState<boolean>(true)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewGrid | null>(null)
  const [initialSchema, setInitialSchema] = useState<SchemaCol[] | undefined>(undefined)
  const [contentKey, setContentKey] = useState<string | null>(null)

  const [schemaCache, setSchemaCache] = useState<Record<string, SchemaCol[]>>({})

  const [finalRowsJson, setFinalRowsJson] = useState<string>('')
  const [finalSchemaJson, setFinalSchemaJson] = useState<string>('')
  const [finalOptionsJson, setFinalOptionsJson] = useState<string>('')

  const fileExt = useMemo(() => file?.name.split('.').pop()?.toLowerCase() ?? undefined, [file])
  const isLikelyCSV = useMemo(() => {
    if (format === 'csv') return true
    if (format === 'json') return false
    return !!file && /\.(csv|tsv|txt)$/i.test(file.name)
  }, [file, format])

  React.useEffect(() => {
    if (format === 'csv') return
    if (!fileExt) return
    if (fileExt === 'tsv') setSeparator('\t')
    else if (fileExt === 'csv') setSeparator(',')
    else if (fileExt === 'txt') setSeparator(';')
  }, [fileExt, format])

  const canPreview = sourceType === 'file' ? !!file : urlValue.trim().length > 0


  function saveSchema(key: string, schema: SchemaCol[]) {

    setSchemaCache(prev => ({ ...prev, [key]: schema }))

    if (!modelId) return
    try { localStorage.setItem(`importSchema:model:${modelId}:${key}`, JSON.stringify(schema)) } catch {}
  }
  function loadSchema(key: string): SchemaCol[] | undefined {

    if (schemaCache[key]) return schemaCache[key]

    if (modelId) {
      try {
        const raw = localStorage.getItem(`importSchema:model:${modelId}:${key}`)
        if (!raw) return undefined
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed as SchemaCol[]
      } catch {}
    }
    return undefined
  }

  async function handlePreview() {
    try {
      let grid: PreviewGrid | null = null
      let keyBase = ''

      if (sourceType === 'file' && file) {
        const text = await file.text()
        const asJson = isJsonPreferred(format, { ext: fileExt })
        const sep = normalizeSeparator(separator)
        grid = asJson ? gridFromJsonText(text, headerRow) : await parseCSVText(text, sep, headerRow)
        keyBase = buildKeyBaseFile(file.name, text)
      } else if (sourceType === 'url') {
        const u = urlValue.trim()
        if (!/^https?:\/\//i.test(u)) throw new Error('Nieprawidłowy URL')
        const resp = await fetch(`/api/fetch-proxy?url=${encodeURIComponent(u)}`)
        if (!resp.ok) throw new Error(`Proxy fetch failed: ${resp.status}`)
        const ct = resp.headers.get('content-type') || ''
        const asText = await resp.text()
        const asJson = isJsonPreferred(format, { contentType: ct })
        const sep = normalizeSeparator(separator)
        grid = asJson ? gridFromJsonText(asText, headerRow) : await parseCSVText(asText, sep, headerRow)
        keyBase = buildKeyBaseUrl(u, asText)
      }

      if (grid) {
        setPreviewData(grid)
        const key = keyBase || `adhoc:${Date.now()}`
        setContentKey(key)
        setInitialSchema(loadSchema(key))
        setPreviewOpen(true)
      }
    } catch (e) {
      console.error('Preview failed', e)
      alert('Nie udało się przetworzyć danych do podglądu.')
    }
  }

  return (
    <div className="space-y-4">
      

      <TypeSelector value={sourceType} onChange={(v) => { setSourceType(v); if (v === 'file') { setUrlValue('') } else { setFile(null) } }} />

      {/* wybór formatu (auto/json/csv) */}
      <div className="flex flex-col gap-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">Format danych</label>
        <select
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500"
          value={format}
          onChange={(e) => setFormat(e.target.value as ImportFormat)}
        >
          <option value="auto">Auto</option>
          <option value="csv">CSV / tekst rozdzielany</option>
          <option value="json">JSON</option>
        </select>
      </div>

      {sourceType === 'url' && (
        <div className="flex flex-col gap-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">Podaj url</label>
          <Input2 label="Nazwa" placeholder="https://example.com" value={urlValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrlValue(e.target.value)} />
        </div>
      )}

      {sourceType === 'file' && (
        <FileImport onFileSelected={(f) => setFile(f)} onError={() => setFile(null)} />
      )}

      {(isLikelyCSV || format === 'csv' || (sourceType === 'url' && format !== 'json')) && (
        <div className="grid">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-900 dark:text-white">Separator</label>
            <div className="flex items-center gap-2">
              <select
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500"
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
              >
                <option value=",">Przecinek ,</option>
                <option value=";">Średnik ;</option>
                <option value="\t">Tabulator \t</option>
                <option value="|">Pionowa kreska |</option>
              </select>
             
            </div>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input id="hdr" type="checkbox" checked={headerRow} onChange={(e) => setHeaderRow(e.target.checked)} />
            <label htmlFor="hdr" className="text-sm">Pierwszy wiersz zawiera nazwy kolumn</label>
          </div>
        </div>
      )}


      <div className="flex justify-end">
        <Button2 variant="outline" className="w-max" disabled={!canPreview} onClick={handlePreview}>Podgląd</Button2>
      </div>

      <ImportPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={previewData}
        initialSchema={initialSchema}
        onConfirm={(schema)=>{
          if (contentKey) saveSchema(contentKey, schema)
          try {
            const visible = schema.filter(s=>!s.removed)
            const rows = (previewData?.rows ?? []).map((r: Record<string, unknown>)=>{
              const out: Record<string, unknown> = {}
              for (const c of visible) out[c.name] = (r as Record<string, unknown>)[c.key]
              return out
            })
            setFinalRowsJson(JSON.stringify(rows))
            setFinalSchemaJson(JSON.stringify(schema))
            const opts = {
              sourceType,
              urlValue: sourceType==='url'? urlValue: undefined,
              fileName: sourceType==='file'? file?.name: undefined,
              format,
              separator,
              headerRow,
              contentKey,
            }
            setFinalOptionsJson(JSON.stringify(opts))
          } catch {}
        }}
      />

 
      <input type="hidden" name="import_rows_json" value={finalRowsJson} />
      <input type="hidden" name="import_schema_json" value={finalSchemaJson} />
      <input type="hidden" name="import_options_json" value={finalOptionsJson} />
    </div>
  )
}

export default ImportLayout
