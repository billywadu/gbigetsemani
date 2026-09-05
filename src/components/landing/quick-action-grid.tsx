'use client'

import React from 'react'
import Link from 'next/link'
import {
  HeartHandshake,
  BookOpen,
  Video,
  Calendar,
  UserPlus,
  Search,
  Users,
  MapPin,
  ShieldCheck,
  QrCode,
  Phone,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { QuickActionsConfig, QuickActionIcon } from '@/lib/validations/landing-page'
import { cn } from '@/lib/utils'

interface QuickActionGridProps {
  config: QuickActionsConfig
}

const iconMap: Record<QuickActionIcon, React.ElementType> = {
  HeartHandshake,
  BookOpen,
  Video,
  Calendar,
  UserPlus,
  Search,
  Users,
  MapPin,
  ShieldCheck,
  QrCode,
  Phone,
}

export function QuickActionGrid({ config }: QuickActionGridProps) {
  const activeItems = config.items?.filter((item) => item.enabled) || []
  if (activeItems.length === 0) return null

  const count = activeItems.length

  // Dynamically adapt grid columns according to the number of items
  // On mobile (< sm): Always 1 column (Horizontal Action Row)
  // On desktop (sm+): Adaptive Grid Columns (2, 3, 4, 5)
  const getGridColsClass = () => {
    switch (count) {
      case 1:
        return 'grid-cols-1 max-w-md mx-auto'
      case 2:
        return 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
      case 3:
        return 'grid-cols-1 sm:grid-cols-3'
      case 5:
        return 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-5'
      case 6:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      default:
        // 4, 7, 8+
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    }
  }

  return (
    <section className='relative z-30 max-w-6xl mx-auto px-3.5 sm:px-6 -mt-8 sm:-mt-16 mb-10 sm:mb-14'>
      <div className='relative overflow-hidden rounded-2xl sm:rounded-3xl bg-linear-to-br from-card via-card/95 to-muted/50 border p-4.5 sm:p-8 md:p-10 shadow-xl shadow-black/5'>
        {/* Background ambient lighting */}
        <div className='absolute -top-24 -right-24 size-96 bg-primary/10 rounded-full blur-3xl pointer-events-none' />
        <div className='absolute -bottom-24 -left-24 size-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none' />

        <div className='relative z-10'>
          {/* Header Title & Subtitle */}
          <div className='text-center max-w-2xl mx-auto mb-5 sm:mb-8 md:mb-10'>
            <h2 className='text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground font-serif'>
              {config.sectionTitle}
            </h2>
            {config.sectionSubtitle && (
              <p className='text-xs sm:text-sm md:text-base text-muted-foreground mt-1.5 sm:mt-2 leading-relaxed'>
                {config.sectionSubtitle}
              </p>
            )}
          </div>

          {/* Action Grid (Responsive: 1-Col Horizontal on Mobile, Multi-Col Grid on Desktop) */}
          <div className={cn('grid gap-2.5 sm:gap-4 md:gap-5', getGridColsClass())}>
            {activeItems.map((item) => {
              const IconComponent = iconMap[item.icon] || HeartHandshake
              const isExternal = item.linkUrl.startsWith('http')
              const hasDescription = Boolean(item.description?.trim())

              return (
                <Link
                  key={item.id}
                  href={item.linkUrl}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  className={cn(
                    'group relative rounded-xl sm:rounded-2xl border transition-all duration-300 active:scale-[0.98]',
                    'bg-card/80 hover:bg-card border-border/70 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5',
                    // Mobile: Horizontal List Row
                    'flex flex-row items-center text-left p-3.5 gap-3.5',
                    // Desktop: Vertical Centered Card
                    'sm:flex-col sm:items-center sm:text-center sm:p-5 sm:gap-0'
                  )}
                >
                  {/* Icon Container */}
                  <div
                    className={cn(
                      'rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0',
                      'group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 group-hover:shadow-md group-hover:shadow-primary/20 transition-all duration-300',
                      'size-11 sm:size-12 sm:mb-3 sm:rounded-2xl'
                    )}
                  >
                    <IconComponent className='size-5 sm:size-6 transition-transform duration-300 group-hover:scale-110' />
                  </div>

                  {/* Content Container */}
                  <div className='flex-1 min-w-0 sm:w-full'>
                    {/* Title */}
                    <span className='font-semibold text-sm sm:text-sm md:text-base text-foreground group-hover:text-primary transition-colors tracking-tight block truncate sm:truncate'>
                      {item.title}
                    </span>

                    {/* Short Subtitle / Description (if provided) */}
                    {hasDescription && (
                      <p className='text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-2 leading-relaxed'>
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Trailing Action Icon */}
                  {isExternal ? (
                    <ArrowUpRight className='size-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 sm:absolute sm:top-3 sm:right-3' />
                  ) : (
                    <ChevronRight className='size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 sm:hidden' />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
