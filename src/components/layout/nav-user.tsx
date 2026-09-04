'use client'

import Link from 'next/link'
import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { SignOutDialog } from '@/components/sign-out-dialog'

type NavUserProps = {
  user?: {
    name: string
    email: string
    avatar?: string | null
    role?: string
  } | null
}

function getInitials(name?: string) {
  if (!name) return 'ST'
  const clean = name.replace(/^Pdt\.\s*/i, '').trim()
  const parts = clean.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatRoleName(role?: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Administrator'
    case 'GEMBALA':
      return 'Gembala Sidang'
    case 'SEKRETARIAT':
      return 'Sekretariat Gereja'
    case 'BENDAHARA':
      return 'Bendahara Gereja'
    case 'USHER':
      return 'Petugas Usher / Presensi'
    case 'JEMAAT':
      return 'Anggota Jemaat'
    default:
      return role || 'Staff Administrator'
  }
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = useDialogState()

  const displayName = user?.name || 'Administrator'
  const displayEmail = user?.email || 'admin@gereja.org'
  const displayRole = formatRoleName(user?.role)
  const initials = getInitials(displayName)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <Avatar className='h-8 w-8 rounded-lg'>
                  {user?.avatar && <AvatarImage src={user.avatar} alt={displayName} />}
                  <AvatarFallback className='rounded-lg bg-primary/10 text-primary font-bold text-xs border border-primary/20'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-start text-sm leading-tight min-w-0'>
                  <span className='truncate font-semibold'>{displayName}</span>
                  <span className='truncate text-[11px] text-muted-foreground'>{displayRole}</span>
                </div>
                <ChevronsUpDown className='ms-auto size-4 opacity-50' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={4}
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-2 py-1.5 text-start text-sm'>
                  <Avatar className='h-8 w-8 rounded-lg'>
                    {user?.avatar && <AvatarImage src={user.avatar} alt={displayName} />}
                    <AvatarFallback className='rounded-lg bg-primary/10 text-primary font-bold text-xs border border-primary/20'>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-start text-sm leading-tight min-w-0'>
                    <span className='truncate font-semibold'>{displayName}</span>
                    <span className='truncate text-xs text-muted-foreground'>{displayEmail}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild className='text-xs'>
                  <Link href='/dashboard/audit'>
                    <ShieldCheck className='size-4 text-emerald-600' />
                    <span>Audit Trail Log</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className='text-xs'>
                  <Link href='/dashboard/jemaat'>
                    <BadgeCheck className='size-4 text-primary' />
                    <span>Direktori Jemaat</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                onClick={() => setOpen(true)}
                className='text-xs'
              >
                <LogOut className='size-4' />
                <span>Keluar (Sign Out)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
