'use client'

import { SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearch } from '@/context/search-provider'
import { Button } from './ui/button'

export function Search({
  className = '',
  placeholder = 'Cari modul, jemaat, event, surat...',
  ...props
}: React.ComponentProps<'button'> & { placeholder?: string }) {
  const { setOpen } = useSearch()
  return (
    <Button
      {...props}
      variant='outline'
      className={cn(
        'group relative flex h-9 w-full min-w-0 max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl items-center justify-start gap-2.5 rounded-lg bg-muted/30 px-3 text-xs sm:text-sm font-normal text-muted-foreground shadow-none hover:bg-accent/80 hover:text-foreground transition-all shrink-0',
        className
      )}
      aria-keyshortcuts='Meta+K Control+K'
      onClick={() => setOpen(true)}
    >
      <SearchIcon
        aria-hidden='true'
        className='size-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity'
      />
      <span className='truncate text-xs sm:text-sm'>
        <span className='sm:hidden'>Cari...</span>
        <span className='hidden sm:inline'>{placeholder}</span>
      </span>
      <kbd className='pointer-events-none ms-auto hidden h-5 shrink-0 items-center gap-1 rounded border bg-muted/80 px-1.5 font-mono text-[10px] font-medium opacity-80 select-none group-hover:opacity-100 sm:flex'>
        <span className='text-[10px]'>⌘</span>K
      </kbd>
    </Button>
  )
}
