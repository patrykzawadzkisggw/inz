"use client"
import React, { useCallback, useId, useRef, useState } from 'react'

interface ImportProps {
  onFileSelected?: (file: File) => void
  onError?: (message: string) => void
  accept?: string //  .csv'
  maxSizeMB?: number
  preview?: boolean
  className?: string
  disabled?: boolean
  label?: string
  helperText?: string
}

export const FileImport: React.FC<ImportProps> = ({
    onFileSelected,
    onError,
    accept = '.txt,.json,.csv',
    maxSizeMB = 1000,
    className = '',
    disabled = false,
    label = 'Kliknij aby wgrać lub przeciągnij plik',
    helperText = 'Obsługiwane: TXT, JSON, CSV do ' + maxSizeMB + 'MB'
}) => {
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [objectUrl, setObjectUrl] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const id = useId()

    const resetPreview = useCallback(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        setObjectUrl(null)
    }, [objectUrl])

    const validate = useCallback((f: File): string | null => {
        if (f.size > maxSizeMB * 1024 * 1024) return `Plik jest za duży (>${maxSizeMB}MB)`
        if (accept && !accept.split(',').some(a => {
            const trimmed = a.trim()
            if (trimmed.endsWith('/*')) {
                return f.type.startsWith(trimmed.slice(0, -1))
            }
            if (trimmed.startsWith('.')) return f.name.toLowerCase().endsWith(trimmed.toLowerCase())
            return f.type === trimmed
        })) return 'Nieobsługiwany typ pliku'
        return null
    }, [accept, maxSizeMB])

    const handleSelected = useCallback((files: FileList | null) => {
        if (!files || !files.length) return
        const f = files[0]
        const validationError = validate(f)
        if (validationError) {
            setError(validationError)
            setFile(null)
            resetPreview()
            onError?.(validationError)
            return
        }
        setError(null)
        setFile(f)
        resetPreview()
        onFileSelected?.(f)
    }, [onFileSelected, onError, resetPreview, validate])

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleSelected(e.target.files)
    }

    const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault()
        if (disabled) return
        setIsDragging(false)
        handleSelected(e.dataTransfer.files)
    }

    const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault()
        if (disabled) return
        if (!isDragging) setIsDragging(true)
    }

    const onDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setIsDragging(false)
    }

    const clearFile = () => {
        setFile(null)
        setError(null)
        resetPreview()
        if (inputRef.current) inputRef.current.value = ''
    }

    return (
        <div className={`flex w-full ${className}`}> 
            <label
                htmlFor={id}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={[
                    'relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-colors',
                    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                    isDragging ? 'border-blue-500 bg-blue-50 dark:bg-neutral-800' : 'border-gray-300 bg-gray-50 dark:bg-gray-700',
                    'hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600'
                ].join(' ')}
                aria-disabled={disabled}
            >
                <div className="flex flex-col items-center justify-center px-4 pt-5 pb-6 text-center select-none">
                    <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                    </svg>
                    {!file && !error && (
                        <>
                            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-semibold">{label}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
                            {accept.includes('.csv') && (
                                <p className="mt-1 text-[11px] text-gray-400">CSV także wspierane</p>
                            )}
                        </>
                    )}
                    {file && !error && (
                        <div className="flex flex-col items-center gap-2 w-full">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[220px]" title={file.name}>{file.name}</p>
                            <p className="text-xs text-gray-400">{(file.size/1024).toFixed(1)} KB</p>
                            <div className="flex gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={clearFile}
                                    className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500"
                                >Usuń</button>
                            
                            </div>
                            
                        </div>
                    )}
                    {error && (
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Błąd</p>
                            <p className="text-xs text-red-500 dark:text-red-300">{error}</p>
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="mt-1 px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                            >Spróbuj ponownie</button>
                        </div>
                    )}
                </div>
                <input
                    ref={inputRef}
                    id={id}
                    accept={accept}
                    type="file"
                    disabled={disabled}
                    onChange={onInputChange}
                    className="hidden"
                />
            </label>
        </div>
    )
}

