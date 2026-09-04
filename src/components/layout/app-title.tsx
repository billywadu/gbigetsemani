'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '../ui/button'
import { getAppProfileAction } from '@/actions/app-profile'

export function AppTitle() {
  const { setOpenMobile } = useSidebar()
  const [churchName, setChurchName] = useState('Gereja')

  useEffect(() => {
    let isMounted = true
    async function loadProfile() {
      const res = await getAppProfileAction()
      if (res.success && res.data?.namaSingkat && isMounted) {
        setChurchName(res.data.namaSingkat)
      }
    }
    loadProfile()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='gap-0 py-0 hover:bg-transparent active:bg-transparent'
          asChild
        >
          <div>
            <Link
              href='/dashboard'
              onClick={() => setOpenMobile(false)}
              className='grid flex-1 text-start text-sm leading-tight'
            >
              <span className='truncate font-bold'>{churchName}</span>
              <span className='truncate text-xs text-muted-foreground'>Church Management System</span>
            </Link>
            <ToggleSidebar />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function ToggleSidebar({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar='trigger'
      data-slot='sidebar-trigger'
      variant='ghost'
      size='icon'
      className={cn('aspect-square size-8 max-md:scale-125', className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <span className='sr-only'>Toggle Sidebar</span>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='size-4'
      >
        <rect width='18' height='18' x='3' y='3' rx='2' />
        <path d='M9 3v18' />
      </svg>
    </Button>
  )
}
