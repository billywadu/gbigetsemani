'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { getAuthUserAction } from '@/actions/auth'

export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const [user, setUser] = useState<{ nama: string; role: string; username: string; email?: string | null; fotoUrl?: string | null } | null>(null)

  useEffect(() => {
    getAuthUserAction()
      .then((res) => {
        if (res?.success && res.user) {
          setUser({
            nama: res.user.nama,
            role: res.user.role,
            username: res.user.username,
            email: res.user.email,
            fotoUrl: (res.user as any).fotoUrl || null,
          })
        }
      })
      .catch(() => {})
  }, [])

  const userInitials = user?.nama
    ? user.nama
        .replace(/^Pdt\.\s*/i, '')
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'SA'

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full shrink-0'>
            <Avatar className='h-8 w-8 border border-primary/20'>
              {user?.fotoUrl && <AvatarImage src={user.fotoUrl} alt={user.nama} />}
              <AvatarFallback className='bg-primary/10 text-primary font-bold text-xs'>
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm leading-none font-semibold text-foreground'>
                {user?.nama || 'Super Administrator'}
              </p>
              <p className='text-xs leading-none text-muted-foreground font-mono'>
                {user?.email || `@${user?.username || 'admin'}`}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild className='text-xs'>
              <Link href='/dashboard/audit'>
                Audit Trail SHA-256
                <DropdownMenuShortcut>⇧⌘A</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className='text-xs'>
              <Link href='/dashboard/jemaat'>
                Master Data Jemaat
                <DropdownMenuShortcut>⌘J</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className='text-xs'>
              <Link href='/dashboard/keluarga'>
                Master Data Keluarga
                <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant='destructive' onClick={() => setOpen(true)} className='text-xs'>
            Keluar (Sign Out)
            <DropdownMenuShortcut className='text-current'>
              ⇧⌘Q
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
