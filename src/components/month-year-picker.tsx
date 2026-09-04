'use client'

import * as React from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export const MONTH_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

export interface MonthYearPickerValue {
  bulan?: number | 'all' | null
  tahun?: number | 'all' | null
}

export interface MonthYearPickerProps {
  value: MonthYearPickerValue
  onChange: (val: { bulan: number | 'all'; tahun: number | 'all' }) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  isFilter?: boolean
}

export function MonthYearPicker({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = 'Pilih Periode',
  isFilter = false,
}: MonthYearPickerProps) {
  const [open, setOpen] = React.useState(false)
  const currentYear = new Date().getFullYear()

  const initialYear =
    typeof value.tahun === 'number' && !isNaN(value.tahun)
      ? value.tahun
      : currentYear

  const [viewYear, setViewYear] = React.useState<number>(initialYear)

  // Keep viewYear synced when value.tahun changes to a specific number
  React.useEffect(() => {
    if (typeof value.tahun === 'number' && !isNaN(value.tahun)) {
      setViewYear(value.tahun)
    }
  }, [value.tahun])

  const handleSelectMonth = (monthIndex: number) => {
    onChange({
      bulan: monthIndex + 1,
      tahun: viewYear,
    })
    setOpen(false)
  }

  const handleSelectAllMonthsInYear = () => {
    onChange({
      bulan: 'all',
      tahun: viewYear,
    })
    setOpen(false)
  }

  const handleResetAll = () => {
    onChange({
      bulan: 'all',
      tahun: 'all',
    })
    setOpen(false)
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    const currentBulan = now.getMonth() + 1
    const currentTahun = now.getFullYear()
    setViewYear(currentTahun)
    onChange({
      bulan: currentBulan,
      tahun: currentTahun,
    })
    setOpen(false)
  }

  const isSelected = (monthIndex: number) => {
    return value.bulan === monthIndex + 1 && value.tahun === viewYear
  }

  const isCurrentMonth = (monthIndex: number) => {
    const now = new Date()
    return now.getMonth() === monthIndex && now.getFullYear() === viewYear
  }

  // Display text logic
  let displayText = placeholder
  if (isFilter) {
    if ((!value.tahun || value.tahun === 'all') && (!value.bulan || value.bulan === 'all')) {
      displayText = 'Semua Periode'
    } else if (value.tahun && value.tahun !== 'all' && (!value.bulan || value.bulan === 'all')) {
      displayText = `Tahun ${value.tahun}`
    } else if (typeof value.bulan === 'number' && value.bulan >= 1 && value.bulan <= 12 && value.tahun && value.tahun !== 'all') {
      displayText = `${MONTH_NAMES_ID[value.bulan - 1]} ${value.tahun}`
    }
  } else {
    if (typeof value.bulan === 'number' && value.bulan >= 1 && value.bulan <= 12 && value.tahun) {
      displayText = `${MONTH_NAMES_ID[value.bulan - 1]} ${value.tahun}`
    }
  }

  const hasActiveFilter =
    isFilter &&
    ((value.tahun && value.tahun !== 'all') || (value.bulan && value.bulan !== 'all'))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          disabled={disabled}
          className={cn(
            'justify-between text-left font-normal h-8 text-xs px-3 bg-background hover:bg-muted/50 border-input shadow-xs min-w-[140px]',
            !hasActiveFilter && isFilter && 'text-muted-foreground',
            hasActiveFilter && 'border-primary/40 font-medium text-foreground bg-primary/5',
            className
          )}
        >
          <span className='flex items-center gap-2 truncate'>
            <CalendarIcon className='size-3.5 text-primary shrink-0' />
            <span className='truncate'>{displayText}</span>
          </span>
          <ChevronDown className='size-3.5 opacity-50 shrink-0' />
        </Button>
      </PopoverTrigger>

      <PopoverContent className='w-72 p-3 shadow-lg border bg-popover text-popover-foreground' align='start'>
        <div className='space-y-3'>
          {/* Header Year Navigation */}
          <div className='flex items-center justify-between border-b pb-2 px-0.5'>
            <div className='flex items-center gap-1'>
              <Button
                variant='ghost'
                size='icon'
                className='size-7 text-muted-foreground hover:text-foreground'
                onClick={() => setViewYear((y) => y - 10)}
                title='Mundur 10 Tahun'
              >
                <ChevronsLeft className='size-3.5' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='size-7 text-muted-foreground hover:text-foreground'
                onClick={() => setViewYear((y) => y - 1)}
                title='Tahun Sebelumnya'
              >
                <ChevronLeft className='size-3.5' />
              </Button>
            </div>

            {/* Year Input / Display */}
            <div className='flex items-center gap-1'>
              <input
                type='number'
                value={viewYear}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) setViewYear(val)
                }}
                className='w-16 h-7 text-center font-bold text-sm bg-muted/50 border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono'
              />
            </div>

            <div className='flex items-center gap-1'>
              <Button
                variant='ghost'
                size='icon'
                className='size-7 text-muted-foreground hover:text-foreground'
                onClick={() => setViewYear((y) => y + 1)}
                title='Tahun Berikutnya'
              >
                <ChevronRight className='size-3.5' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='size-7 text-muted-foreground hover:text-foreground'
                onClick={() => setViewYear((y) => y + 10)}
                title='Maju 10 Tahun'
              >
                <ChevronsRight className='size-3.5' />
              </Button>
            </div>
          </div>

          {/* If Filter Mode: Option to select entire year */}
          {isFilter && (
            <Button
              type='button'
              variant={value.tahun === viewYear && value.bulan === 'all' ? 'default' : 'outline'}
              size='sm'
              onClick={handleSelectAllMonthsInYear}
              className='w-full h-7 text-[11px] justify-center font-medium'
            >
              Pilih Seluruh Tahun {viewYear} (Semua Bulan)
            </Button>
          )}

          {/* 12 Months Grid */}
          <div className='grid grid-cols-3 gap-1.5 pt-0.5'>
            {MONTH_SHORT_ID.map((name, index) => {
              const selected = isSelected(index)
              const current = isCurrentMonth(index)

              return (
                <Button
                  key={name}
                  type='button'
                  variant={selected ? 'default' : 'ghost'}
                  size='sm'
                  onClick={() => handleSelectMonth(index)}
                  className={cn(
                    'h-9 text-xs font-medium justify-center relative transition-all',
                    selected
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                      : 'hover:bg-accent text-foreground hover:text-accent-foreground',
                    current && !selected && 'border border-primary/40 font-semibold text-primary'
                  )}
                >
                  {name}
                  {selected && <Check className='size-3 absolute top-1 right-1 opacity-80' />}
                </Button>
              )
            })}
          </div>

          {/* Footer Action Bar */}
          <div className='flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground'>
            {isFilter ? (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleResetAll}
                className='h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1'
              >
                <RotateCcw className='size-3' /> Semua Periode
              </Button>
            ) : (
              <span>Pilih bulan di atas</span>
            )}

            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleCurrentMonth}
              className='h-6 px-2 text-[11px] text-primary hover:text-primary font-semibold gap-1'
            >
              <Sparkles className='size-3' /> Bulan Ini
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
