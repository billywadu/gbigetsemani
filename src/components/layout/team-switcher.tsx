'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronsUpDown, Building2, Settings2, Globe, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { getAppProfileAction } from '@/actions/app-profile'
import { AppProfileConfig } from '@/lib/validations/app-profile'

type TeamSwitcherProps = {
  teams?: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}

export function TeamSwitcher({ teams }: TeamSwitcherProps) {
  const { isMobile } = useSidebar()
  const [profile, setProfile] = React.useState<AppProfileConfig | null>(null)

  React.useEffect(() => {
    let isMounted = true
    async function loadProfile() {
      const res = await getAppProfileAction()
      if (res.success && res.data && isMounted) {
        setProfile(res.data)
      }
    }
    loadProfile()
    return () => {
      isMounted = false
    }
  }, [])

  const churchName = profile?.namaSingkat || 'CMS Gereja'
  const churchFullName = profile?.namaResmi || churchName
  const churchLogoUrl = profile?.logoUrl || null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div
                className={cn(
                  'flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden shrink-0 transition-colors',
                  churchLogoUrl
                    ? 'bg-transparent'
                    : 'bg-primary/10 text-primary border border-primary/20'
                )}
              >
                {churchLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={churchLogoUrl}
                    alt={churchName}
                    className='size-full object-contain'
                  />
                ) : (
                  <Building2 className='size-4' />
                )}
              </div>
              <div className='grid flex-1 text-start text-sm leading-tight min-w-0'>
                <span className='truncate font-semibold'>
                  {churchName}
                </span>
                <span className='truncate text-[11px] text-muted-foreground font-mono'>
                  CMS v4.2.0 Enterprise
                </span>
              </div>
              <ChevronsUpDown className='ms-auto size-4 opacity-50' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-2 font-normal'>
              <div className='flex items-center gap-2'>
                {churchLogoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={churchLogoUrl} alt={churchName} className='size-6 object-contain' />
                )}
                <div className='grid flex-1 text-start text-xs leading-tight min-w-0'>
                  <span className='truncate font-bold text-foreground'>{churchFullName}</span>
                  <span className='truncate text-[10px] text-muted-foreground font-mono'>Sistem Informasi Gereja</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className='gap-2 p-2 text-xs'>
              <Link href='/dashboard/settings'>
                <Settings2 className='size-4 text-primary' />
                <span>Pengaturan Identitas & Logo</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className='gap-2 p-2 text-xs'>
              <Link href='/' target='_blank'>
                <Globe className='size-4 text-emerald-600' />
                <span>Buka Beranda Publik</span>
                <DropdownMenuShortcut>↗</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className='gap-2 p-2 text-xs'>
              <Link href='/dashboard/event'>
                <QrCode className='size-4 text-blue-600' />
                <span>Terminal Presensi Ibadah</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
