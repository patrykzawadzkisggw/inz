import React from 'react'

export type ImportSourceType = 'url' | 'file'

interface TypeSelectorProps {
  value: ImportSourceType
  onChange: (value: ImportSourceType) => void
  className?: string
}

export const TypeSelector: React.FC<TypeSelectorProps> = ({ value, onChange, className = '' }) => {
  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <div className={`flex items-center ps-4 border rounded-sm transition-colors ${value === 'url' ? 'border-blue-500 ring-1 ring-blue-300 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'}`}>
        <input
          id="import-source-url"
          type="radio"
          value="url"
          name="import-source"
          checked={value === 'url'}
          onChange={() => onChange('url')}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <label
          htmlFor="import-source-url"
          className="w-full py-4 ms-2 text-sm font-medium text-gray-900 dark:text-gray-300 cursor-pointer"
        >
          Z url
        </label>
      </div>
      <div className={`flex items-center ps-4 border rounded-sm transition-colors ${value === 'file' ? 'border-blue-500 ring-1 ring-blue-300 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'}`}>
        <input
          id="import-source-file"
          type="radio"
          value="file"
          name="import-source"
          checked={value === 'file'}
          onChange={() => onChange('file')}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <label
          htmlFor="import-source-file"
          className="w-full py-4 ms-2 text-sm font-medium text-gray-900 dark:text-gray-300 cursor-pointer"
        >
          Z pliku
        </label>
      </div>
    </div>
  )
}


