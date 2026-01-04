"use client";

import * as React from "react";
import { FileText, MoreHorizontal, Settings2, Copy, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDashboard } from "@/context/DashboardContext";
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

export function NavActions() {
  const { isEditMode, toggleEditMode, openModal } = useDashboard();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPrivate, setIsPrivate] = useState<boolean | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const { user } = useUser()

  const data = React.useMemo(() => {
    const group = [
      {
        label: isEditMode ? "Zakończ edycję" : "Tryb edycji",
        icon: Settings2,
        onClick: toggleEditMode,
      },
      {
        label: "Dodaj widget",
        icon: FileText,
        onClick: openModal,
      },
    ]

    group.push({
      label: `Profil prywatny: ${isPrivate === null ? '...' : isPrivate ? 'Tak' : 'Nie'}`,
      icon: Eye,
      onClick: async () => {
        try {
          const resp = await fetch('/api/account/visibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isAccountPrivate: !isPrivate })
          })
          const j = await resp.json()
          if (j && typeof j.isAccountPrivate === 'boolean') setIsPrivate(j.isAccountPrivate)
        } catch (e) {
          console.error(e)
        }
      }
    })

    if (isPrivate === false && user?.id) {
      group.push({
        label: isCopied ? 'Skopiowano!' : 'Kopiuj link do profilu',
        icon: Copy,
        onClick: async () => {
          try {
            const link = `${window.location.origin}/user/${user.id}`
            await navigator.clipboard.writeText(link)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
          } catch (e) {
            console.error('Copy failed', e)
          }
        }
      })
    }


    return [group]
  }, [isEditMode, toggleEditMode, openModal, isPrivate, user?.id, isCopied])

  useEffect(() => {
    let mounted = true
    fetch('/api/account/visibility').then(r => r.json()).then(j => {
      if (!mounted) return
      if (j && typeof j.isAccountPrivate === 'boolean') setIsPrivate(j.isAccountPrivate)
    }).catch(()=>{})
    return () => { mounted = false }
  }, [])

  React.useEffect(() => {
    setIsOpen(false);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="data-[state=open]:bg-accent h-7 w-7"
          >
            <MoreHorizontal />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 overflow-hidden rounded-lg p-0"
          align="end"
        >
          <Sidebar collapsible="none" className="bg-transparent">
            <SidebarContent>
              {data.map((group, index) => (
                <SidebarGroup key={index} className="border-b last:border-none">
                  <SidebarGroupContent className="gap-0">
                    <SidebarMenu>
                      {group.map((item, index) => (
                        <SidebarMenuItem key={index}>
                          <SidebarMenuButton onClick={item.onClick}>
                            <item.icon /> <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                      
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>
    </div>
  );
}
