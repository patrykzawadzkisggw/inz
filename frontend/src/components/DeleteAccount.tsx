"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import DeleteModal from '@/components/notify/DeleteModal'
import { Checkbox } from '@/components/ui/checkbox'
import { useClerk } from "@clerk/nextjs"

export function DeleteAccount() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const { signOut } = useClerk()

  async function handleDelete() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) throw new Error('Error')

      try { await signOut() } catch {}
      setMessage('Konto zostało usunięte')
    } catch {
      setMessage('Nie udało się usunąć konta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 grid gap-2">
      <p className="text-sm text-muted-foreground mt-2">Usunięcie konta spowoduje usunięcie Twoich danych z aplikacji. Ta operacja jest nieodwracalna.</p>
<label className="flex items-center gap-2">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} />
            <span className="text-sm">Rozumiem skutki i chcę usunąć konto</span>
          </label>
          <div>
<Button variant="destructive" onClick={() => setIsOpen(true)} disabled={loading || !confirmed}>Usuń konto</Button>
          </div>
          

<DeleteModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => void handleDelete()}
          itemName="konto"
        />
<div className="text-sm text-muted-foreground">{message}</div>
      
    </div>
  )
}

export default DeleteAccount
