"use client"
import React, { useMemo, useState } from 'react'
import { Modal } from '@/components/Modal'
import Button2 from './Button2'
import DataTable, { DataTableColumn } from '@/components/DataTable'

export type ColumnType = 'text' | 'number' | 'date' | 'boolean'

export type SchemaCol = { key: string; name: string; type: ColumnType; removed: boolean }

export default function ImportPreviewModal({
  isOpen,
  onClose,
  data,
  initialSchema,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  data: { columns: string[]; rows: Record<string, unknown>[] } | null
  initialSchema?: SchemaCol[]
  onConfirm?: (schema: SchemaCol[]) => void
}) {
  const defaultFromColumns = (cols: string[] | undefined): SchemaCol[] => (cols ?? []).map(c => ({ key: c, name: c, type: 'text' as ColumnType, removed: false }))
  const [schema, setSchema] = useState<SchemaCol[]>(() => initialSchema ?? defaultFromColumns(data?.columns))

  React.useEffect(() => {
  if (initialSchema && initialSchema.length) setSchema(initialSchema)
  else setSchema(defaultFromColumns(data?.columns))
  }, [initialSchema, data?.columns])

  const visibleColumns = useMemo(() => schema.filter(c => !c.removed), [schema])
  const rows = useMemo(() => data?.rows ?? [], [data?.rows])

  const tableColumns: DataTableColumn<Record<string, unknown>>[] = useMemo(() => visibleColumns.map(col => ({ key: col.name, header: col.name, truncate: true })), [visibleColumns])

  function setIncluded(key: string, include: boolean) {
    setSchema(prev => prev.map(c => c.key === key ? { ...c, removed: !include } : c))
  }

  function renameColumn(key: string, newName: string) {
    if (!newName) return
    setSchema(prev => prev.map(c => c.key === key ? { ...c, name: newName } : c))
  }

  function setType(key: string, type: ColumnType) {
    setSchema(prev => prev.map(c => c.key === key ? { ...c, type } : c))
  }

  const projectedRows = useMemo(() => {
    return rows.map(r => {
      const obj: Record<string, unknown> = {}
      for (const c of visibleColumns) obj[c.name] = (r as Record<string, unknown>)[c.key]
      return obj
    })
  }, [rows, visibleColumns])

  return (
    <Modal isOpen={isOpen} onClose={onClose} Title="Podgląd danych" size="xl" contentClassName="max-h-[90vh] flex flex-col">
      <div className="p-4 flex flex-col gap-3 flex-1 min-h-0">
        {(!data || data.columns.length === 0) ? (
          <div className="text-sm text-muted-foreground">Brak danych do podglądu</div>
        ) : (
          <>
            {/* Panel sterowania kolumnami (pionowa lista, własny scroll) */}
            <div className="border rounded bg-muted/30">
              <div className="p-2 text-[11px] text-muted-foreground">Kolumny</div>
              <div className="max-h-48 overflow-auto divide-y">
                {schema.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Brak kolumn</div>
                ) : (
                  schema.map(col => (
                    <div key={col.key} className="px-2 py-2 flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs select-none">
                        <input
                          type="checkbox"
                          checked={!col.removed}
                          onChange={(e) => setIncluded(col.key, e.target.checked)}
                        />
                      </label>
                      <input
                        className="border rounded px-2 py-1 text-xs bg-background w-48"
                        value={col.name}
                        onChange={(e) => renameColumn(col.key, e.target.value)}
                      />
                      <select
                        className="border rounded px-2 py-1 text-xs bg-background"
                        value={col.type}
                        onChange={(e) => setType(col.key, e.target.value as ColumnType)}
                      >
                        <option value="number">number</option>
                        <option value="date">date</option>
                      </select>
                    </div>
                  ))
                )}
                {visibleColumns.length === 0 && schema.length > 0 && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Brak widocznych kolumn (odznaczono wszystkie)</div>
                )}
              </div>
            </div>

            {/* Obszar tabeli ze scroll */}
            <div className="flex-1 min-h-0 overflow-auto border rounded">
              <div className="min-h-[300px]">
                <DataTable<Record<string, unknown>> data={projectedRows} columns={tableColumns} fillParent />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button2 variant="outline" onClick={onClose}>Zamknij</Button2>
              <Button2 onClick={() => { onConfirm?.(schema); onClose() }}>Zatwierdź</Button2>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
