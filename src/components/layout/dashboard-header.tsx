'use client'

import React, { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { getAuthUserAction } from '@/actions/auth'
import { Layers, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DashboardHeaderProps {
  children?: React.ReactNode
}

export function DashboardHeader({ children }: DashboardHeaderProps) {
  const [scopedUser, setScopedUser] = useState<{
    role: string
    scopes: { id: string; nama: string }[]
  } | null>(null)

  useEffect(() => {
    getAuthUserAction()
      .then((res) => {
        if (res?.success && res.user) {
          const userScopes =
            (res.user as any).kategorialScopes?.map((s: any) => ({
              id: s.kategorialId || s.id,
              nama: s.kategorial?.nama || 'Kategorial',
            })) || []

          if (
            (res.user.role === 'SEKRETARIS_KATEGORIAL' || res.user.role === 'BENDAHARA_KATEGORIAL') &&
            userScopes.length > 0
          ) {
            setScopedUser({
              role: res.user.role,
              scopes: userScopes,
            })
          }
        }
      })
      .catch(() => {})
  }, [])

  return (
    <Header fixed>
      {/* Left side: Quick Search Bar & Scoped Context Badge */}
      <div className='flex items-center gap-2 flex-1 max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl min-w-0'>
        <Search />
        {scopedUser && (
          <div className='hidden md:flex items-center gap-1.5 shrink-0'>
            {scopedUser.scopes.map((s) => (
              <Badge
                key={s.id}
                variant='outline'
                className='bg-primary/10 border-primary/30 text-primary text-[11px] font-semibold flex items-center gap-1 py-1 px-2.5 rounded-full shadow-xs'
              >
                <Layers className='size-3 shrink-0' />
                <span>{s.nama}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>
      {children}

      {/* Right side: Actions & User Menu */}
      <div className='ms-auto flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0'>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </div>
    </Header>
  )
}
