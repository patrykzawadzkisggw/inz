"use client"

import { UserProfile } from '@clerk/nextjs'
import SimpleTabs from '@/components/ui/simple-tabs'
import DeleteAccount from '@/components/DeleteAccount'

export default function Page() {
  const tabs = [
    { id: 'profile', label: 'Profil', content: <UserProfile /> },
    { id: 'danger', label: 'Niebezpieczeństwo', content: <DeleteAccount /> },
  ]

  return (
    <div className="flex flex-1 w-full justify-center">
      <div className="w-full max-w-3xl">
        <SimpleTabs tabs={tabs} />
      </div>
    </div>
  )
}