import { useCallback, useMemo, useState } from 'react'

export type RecordItem = {
    id: string
    name: string
    value: string
    draft?: boolean
}

export type UseRecordNavigatorOptions = {
    initial?: Array<{ name: string; value: string }>
}

function genId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useRecordNavigator(opts?: UseRecordNavigatorOptions) {
    const createEmpty = useCallback((): RecordItem => ({ id: genId(), name: '', value: '', draft: true }), [])

    const [records, setRecords] = useState<RecordItem[]>(() => {
        const init = opts?.initial || []
        return init.length ? init.map(r => ({ id: genId(), name: r.name, value: r.value })) : [createEmpty()]
    })
    const [index, setIndex] = useState(0)
    const current = records[index]

    const savedRecords = useMemo(
        () => records.filter(r => !(r.draft && r.name === '' && r.value === '')),
        [records]
    )

    const { displayIndex, displayTotal } = useMemo(() => {
        const isEmptyDraft = (r: RecordItem) => r.draft && r.name === '' && r.value === ''
        const currentIsEmptyDraft = !!current && isEmptyDraft(current)
        const total = savedRecords.length + (currentIsEmptyDraft ? 1 : 0)
        if (currentIsEmptyDraft) {
            return { displayIndex: savedRecords.length + 1, displayTotal: Math.max(total, 1) }
        }
        const savedIndex = savedRecords.findIndex(r => r.id === current?.id)
        const logicalIndex = savedIndex === -1 ? 0 : savedIndex + 1
        return { displayIndex: Math.max(logicalIndex, 1), displayTotal: Math.max(total, 1) }
    }, [current, savedRecords])

    const isCurrentComplete = useCallback((r: RecordItem | undefined) => !!r && r.name.trim() !== '' && r.value.trim() !== '', [])
    const isCurrentEmpty = useCallback((r: RecordItem | undefined) => !!r && r.name.trim() === '' && r.value.trim() === '', [])
    const isCurrentPartial = useCallback((r: RecordItem | undefined) => !!r && !isCurrentEmpty(r) && !isCurrentComplete(r), [isCurrentEmpty, isCurrentComplete])

    const ensureFocus = useCallback((nameEl?: HTMLInputElement | null, valueEl?: HTMLInputElement | null) => {
        const c = current
        if (!c) return
        if (c.name.trim() === '' && nameEl) { nameEl.focus(); return }
        if (c.value.trim() === '' && valueEl) { valueEl.focus(); return }
    }, [current])

    const handleNew = useCallback((nameEl?: HTMLInputElement | null, valueEl?: HTMLInputElement | null) => {
        if (!isCurrentComplete(current)) { ensureFocus(nameEl, valueEl); return }
        const existingDraftIndex = records.findIndex(r => r.draft && r.name === '' && r.value === '')
        if (existingDraftIndex !== -1) { setIndex(existingDraftIndex); ensureFocus(nameEl, valueEl); return }
        setRecords(prev => {
            const insertionIndex = index + 1
            const draft = createEmpty()
            return [...prev.slice(0, insertionIndex), draft, ...prev.slice(insertionIndex)]
        })
        setIndex(i => i + 1)
    }, [createEmpty, current, ensureFocus, index, isCurrentComplete, records])

    const handleDelete = useCallback(() => {
        setRecords(prev => {
            if (prev.length === 1) {
                return [createEmpty()]
            }
            const currentId = current?.id
            const next = prev.filter(r => r.id !== currentId)
            setIndex(idx => (idx >= next.length ? next.length - 1 : idx))
            return next.length === 0 ? [createEmpty()] : next
        })
    }, [createEmpty, current?.id])

    const handleChange = useCallback(<K extends keyof Omit<RecordItem, 'id' | 'draft'>>(field: K, value: string) => {
        setRecords(prev => prev.map((r, i) => {
            if (i !== index) return r
            const updated: RecordItem = { ...r, [field]: value } as RecordItem
            if (updated.draft && isCurrentComplete(updated)) updated.draft = false
            return updated
        }))
    }, [index, isCurrentComplete])

    const goPrev = useCallback((nameEl?: HTMLInputElement | null, valueEl?: HTMLInputElement | null) => {
        if (isCurrentPartial(current)) { ensureFocus(nameEl, valueEl); return }
        if (current?.draft && isCurrentEmpty(current) && index > 0) {
            setRecords(prev => prev.filter((_, i) => i !== index))
            setIndex(i => i - 1)
            return
        }
        setIndex(i => (i > 0 ? i - 1 : i))
    }, [current, ensureFocus, isCurrentEmpty, isCurrentPartial, index])

    const goNext = useCallback((nameEl?: HTMLInputElement | null, valueEl?: HTMLInputElement | null) => {
        if (isCurrentPartial(current)) { ensureFocus(nameEl, valueEl); return }
        setIndex(i => {
            const last = records.length - 1
            if (i < last) return i + 1
            if (!isCurrentComplete(current)) { ensureFocus(nameEl, valueEl); return i }
            const existingDraftIndex = records.findIndex(r => r.draft && r.name === '' && r.value === '')
            if (existingDraftIndex !== -1) return existingDraftIndex
            setRecords(prev => [...prev, createEmpty()])
            return i + 1
        })
    }, [current, ensureFocus, isCurrentComplete, isCurrentPartial, createEmpty, records])

    return {
        records,
        index,
        current,
        savedRecords,
        displayIndex,
        displayTotal,
        isCurrentComplete,
        isCurrentEmpty,
        isCurrentPartial,
        ensureFocus,
        handleNew,
        handleDelete,
        handleChange,
        goPrev,
        goNext,
    }
}
