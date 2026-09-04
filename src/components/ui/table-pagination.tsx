import React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type TablePaginationProps = {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  itemLabel?: string
  className?: string
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = 'data',
  className,
}: TablePaginationProps) {
  if (totalItems === 0) return null

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems)
  const endItem = Math.min(currentPage * pageSize, totalItems)

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i)
      }

      if (currentPage < totalPages - 2) pages.push('...')
      if (!pages.includes(totalPages)) pages.push(totalPages)
    }

    return pages
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 border-t bg-muted/10 text-xs text-muted-foreground',
        className
      )}
    >
      {/* Left: Info items displayed */}
      <div className='text-center sm:text-left text-[11px] sm:text-xs'>
        <span>
          Menampilkan <strong className='font-mono text-foreground'>{startItem}</strong>-
          <strong className='font-mono text-foreground'>{endItem}</strong> dari{' '}
          <strong className='font-mono text-foreground'>{totalItems}</strong> {itemLabel}
        </span>
      </div>

      {/* Right: Page Size & Navigation Controls */}
      <div className='flex flex-wrap items-center justify-center gap-2 sm:gap-4'>
        {onPageSizeChange && (
          <div className='flex items-center gap-1.5'>
            <span className='hidden sm:inline text-[11px]'>Baris:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                onPageSizeChange(Number(val))
                onPageChange(1) // Reset to first page
              }}
            >
              <SelectTrigger className='h-7 w-15 text-[11px] bg-background font-mono px-2'>
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent side='top'>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className='text-xs font-mono'>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='icon'
            className='size-7 h-7 w-7 p-0 bg-background disabled:opacity-40'
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            title='Halaman Pertama'
          >
            <ChevronsLeft className='size-3.5' />
          </Button>

          <Button
            variant='outline'
            size='icon'
            className='size-7 h-7 w-7 p-0 bg-background disabled:opacity-40'
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title='Halaman Sebelumnya'
          >
            <ChevronLeft className='size-3.5' />
          </Button>

          {/* Page numbers */}
          <div className='flex items-center gap-0.5 sm:gap-1'>
            {getPageNumbers().map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className='px-1 text-xs text-muted-foreground'>
                  ...
                </span>
              ) : (
                <Button
                  key={`page-${p}`}
                  variant={currentPage === p ? 'default' : 'outline'}
                  size='sm'
                  className={cn(
                    'h-7 min-w-7 px-1.5 text-xs font-mono font-medium',
                    currentPage === p ? 'bg-primary text-primary-foreground font-bold shadow-2xs' : 'bg-background'
                  )}
                  onClick={() => onPageChange(p as number)}
                >
                  {p}
                </Button>
              )
            )}
          </div>

          <Button
            variant='outline'
            size='icon'
            className='size-7 h-7 w-7 p-0 bg-background disabled:opacity-40'
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title='Halaman Selanjutnya'
          >
            <ChevronRight className='size-3.5' />
          </Button>

          <Button
            variant='outline'
            size='icon'
            className='size-7 h-7 w-7 p-0 bg-background disabled:opacity-40'
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title='Halaman Terakhir'
          >
            <ChevronsRight className='size-3.5' />
          </Button>
        </div>
      </div>
    </div>
  )
}
