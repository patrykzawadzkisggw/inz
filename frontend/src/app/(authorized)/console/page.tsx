import React from 'react'
import { ConsoleRunner } from './ConsoleRunner'

export default function Page() {
  return (
    <div className="container px-4 mx-auto max-w-4xl">
      <h1 className="text-4xl font-extrabold dark:text-white max-w-4xl w-full mx-auto mb-3">Konsola</h1>
      <ConsoleRunner />
    </div>
  )
}
