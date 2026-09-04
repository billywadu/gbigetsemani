'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'
import { getPendaftaranPendingCountAction } from '@/actions/pendaftaran'
import { getTamuActiveCountAction } from '@/actions/tamu'
import { getAuthUserAction } from '@/actions/auth'

type SidebarUser = {
  name: string
  email: string
  avatar?: string | null
  role?: string
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [tamuCount, setTamuCount] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<SidebarUser>(sidebarData.user)

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      const [pendaftarRes, tamuRes, authRes] = await Promise.all([
        getPendaftaranPendingCountAction(),
        getTamuActiveCountAction(),
        getAuthUserAction(),
      ])
      if (isMounted) {
        if (pendaftarRes.success) setPendingCount(pendaftarRes.pendingCount)
        if (tamuRes.success) setTamuCount(tamuRes.count)
        if (authRes.success && authRes.user) {
          setCurrentUser({
            name: authRes.user.nama || authRes.user.username,
            email: authRes.user.email || `@${authRes.user.username}`,
            avatar: (authRes.user as any).fotoUrl || null,
            role: authRes.user.role,
          })
        }
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [pathname])

  const dynamicNavGroups = useMemo(() => {
    const userRole = (currentUser.role as any) || 'SUPER_ADMIN'

    return sidebarData.navGroups
      .filter((group) => {
        if (!group.roles || group.roles.length === 0) return true
        if (userRole === 'SUPER_ADMIN') return true
        return group.roles.includes(userRole)
      })
      .map((group) => {
        const allowedItems = group.items.filter((item) => {
          if (!item.roles || item.roles.length === 0) return true
          if (userRole === 'SUPER_ADMIN') return true
          return item.roles.includes(userRole)
        })

        return {
          ...group,
          items: allowedItems.map((item) => {
            if (item.url === '/dashboard/pendaftaran') {
              const badgeVal = pendingCount !== null ? pendingCount : (item.badge ? Number(item.badge) : 0)
              return {
                ...item,
                badge: badgeVal > 0 ? String(badgeVal) : undefined,
              }
            }
            if (item.url === '/dashboard/tamu') {
              const badgeVal = tamuCount !== null ? tamuCount : (item.badge ? Number(item.badge) : 0)
              return {
                ...item,
                badge: badgeVal > 0 ? String(badgeVal) : undefined,
              }
            }
            return item
          }),
        }
      })
      .filter((group) => group.items.length > 0)
  }, [pendingCount, tamuCount, currentUser.role])

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        {dynamicNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
