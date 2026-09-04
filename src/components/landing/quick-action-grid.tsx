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
  ArrowRight,
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
  const getGridColsClass = () => {
    switch (count) {
      case 1:
        return 'grid-cols-1 max-w-sm mx-auto'
      case 2:
        return 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
      case 3:
        return 'grid-cols-1 sm:grid-cols-3'
      case 5:
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      case 6:
        return 'grid-cols-2 sm:grid-cols-3'
      default:
        // 4, 7, 8+
        return 'grid-cols-2 sm:grid-cols-4'
    }
  }

  return (
    <section className='relative z-30 max-w-6xl mx-auto px-4 sm:px-6 -mt-12 sm:-mt-16 mb-12'>
      <div className='bg-card/95 backdrop-blur-xl border rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xl shadow-black/5'>
        {/* Header Title & Subtitle */}
        <div className='text-center max-w-xl mx-auto mb-6 sm:mb-8'>
          <h2 className='text-base sm:text-lg md:text-xl font-bold tracking-tight text-foreground'>
            {config.sectionTitle}
          </h2>
          {config.sectionSubtitle && (
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              {config.sectionSubtitle}
            </p>
          )}
        </div>

        {/* Action Grid */}
        <div className={cn('grid gap-3 sm:gap-4 md:gap-5', getGridColsClass())}>
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
                  'group relative rounded-2xl border transition-all duration-300 active:scale-[0.98]',
                  'bg-muted/30 hover:bg-card border-border/70 hover:border-primary/40 shadow-2xs hover:shadow-lg hover:-translate-y-0.5',
                  count <= 3
                    ? 'flex flex-row sm:flex-col items-center sm:text-center text-left p-4 sm:p-6 gap-3.5 sm:gap-0'
                    : 'flex flex-col items-center text-center p-3.5 sm:p-5'
                )}
              >
                {/* Icon Container */}
                <div
                  className={cn(
                    'rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0',
                    'group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 group-hover:shadow-md group-hover:shadow-primary/20 transition-all duration-300',
                    count <= 3
                      ? 'size-11 sm:size-13 sm:mb-3.5'
                      : 'size-10 sm:size-12 mb-2.5 sm:mb-3'
                  )}
                >
                  <IconComponent className='size-5 sm:size-6 transition-transform duration-300 group-hover:scale-110' />
                </div>

                {/* Content Container */}
                <div className={count <= 3 ? 'flex-1 min-w-0 sm:w-full' : 'w-full'}>
                  {/* Title */}
                  <span
                    className={cn(
                      'font-semibold text-foreground group-hover:text-primary transition-colors tracking-tight block truncate',
                      count <= 3 ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                    )}
                  >
                    {item.title}
                  </span>

                  {/* Short Subtitle / Description (if provided) */}
                  {hasDescription && (
                    <p className='text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed'>
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Micro indicator icon */}
                {isExternal ? (
                  <ArrowUpRight className='absolute top-3 right-3 size-4 text-muted-foreground/50 group-hover:text-primary transition-colors' />
                ) : count <= 3 ? (
                  <ArrowRight className='size-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all sm:hidden shrink-0' />
                ) : null}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
