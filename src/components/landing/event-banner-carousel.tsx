'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EventBannerConfig } from '@/lib/validations/landing-page'

export interface EventBannerItem {
  id: string
  namaEvent: string
  kategori: string
  tanggalMulai: string
  tanggalSelesai?: string | null
  namaLokasi?: string | null
  thumbnailUrl?: string | null
  deskripsi?: string
}

interface EventBannerCarouselProps {
  config: EventBannerConfig
  events: EventBannerItem[]
}

export function EventBannerCarousel({ config, events }: EventBannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Default fallback if no events in DB
  const displayEvents: EventBannerItem[] =
    events && events.length > 0
      ? events
      : [
          {
            id: 'default-1',
            namaEvent: 'Ibadah Raya Minggu & Perjamuan Kudus',
            kategori: 'IBADAH_RAYA',
            tanggalMulai: new Date().toISOString(),
            namaLokasi: 'Main Sanctuary Lt. 1',
            thumbnailUrl:
              'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=80',
            deskripsi:
              'Mari bersekutu bersama dalam hadirat Tuhan, puji-pujian, dan berkat firman yang mentransformasi hidup.',
          },
        ]

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % displayEvents.length)
  }, [displayEvents.length])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + displayEvents.length) % displayEvents.length)
  }, [displayEvents.length])

  useEffect(() => {
    if (displayEvents.length <= 1 || isPaused) return
    const timer = setInterval(nextSlide, config.autoPlayInterval || 5000)
    return () => clearInterval(timer)
  }, [displayEvents.length, isPaused, config.autoPlayInterval, nextSlide])

  const current = displayEvents[currentIndex]

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return isoString
    }
  }

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    } catch {
      return ''
    }
  }

  return (
    <section className='max-w-6xl mx-auto px-4 sm:px-6 mb-16'>
      {/* Section Header */}
      <div className='flex items-end justify-between mb-6'>
        <div>
          <div className='flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1'>
            <Sparkles className='size-3.5' />
            <span>Agenda Mendatang</span>
          </div>
          <h2 className='text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground'>
            {config.sectionTitle}
          </h2>
          {config.sectionSubtitle && (
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              {config.sectionSubtitle}
            </p>
          )}
        </div>

        {/* Carousel Navigation Buttons (Desktop) */}
        {displayEvents.length > 1 && (
          <div className='hidden sm:flex items-center gap-2'>
            <Button
              variant='outline'
              size='icon'
              onClick={prevSlide}
              className='size-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all'
              aria-label='Previous slide'
            >
              <ChevronLeft className='size-4' />
            </Button>
            <Button
              variant='outline'
              size='icon'
              onClick={nextSlide}
              className='size-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all'
              aria-label='Next slide'
            >
              <ChevronRight className='size-4' />
            </Button>
          </div>
        )}
      </div>

      {/* Featured Banner Card */}
      <div
        className='relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border shadow-lg bg-card group min-h-[360px] sm:min-h-[420px] md:min-h-[460px] flex items-end'
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Banner Background Image */}
        <div className='absolute inset-0 z-0 overflow-hidden'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              current.thumbnailUrl ||
              'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80'
            }
            alt={current.namaEvent}
            className='w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700'
          />
          {/* Gradients */}
          <div className='absolute inset-0 bg-linear-to-t from-black/95 via-black/60 to-black/20' />
        </div>

        {/* Banner Content Details */}
        <div className='relative z-10 p-6 sm:p-8 md:p-10 text-white w-full max-w-3xl space-y-3 sm:space-y-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge className='bg-primary text-primary-foreground font-semibold px-3 py-1 text-xs'>
              {current.kategori.replace('_', ' ')}
            </Badge>
            <span className='inline-flex items-center gap-1.5 text-xs text-white/90 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full font-medium'>
              <Calendar className='size-3 text-amber-300' />
              {formatDate(current.tanggalMulai)}
            </span>
            <span className='inline-flex items-center gap-1.5 text-xs text-white/90 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full font-medium'>
              <Clock className='size-3 text-amber-300' />
              {formatTime(current.tanggalMulai)}
            </span>
          </div>

          <h3 className='text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight drop-shadow-md text-white'>
            {current.namaEvent}
          </h3>

          {current.deskripsi && (
            <p className='text-xs sm:text-sm md:text-base text-white/80 line-clamp-2 leading-relaxed max-w-2xl'>
              {current.deskripsi}
            </p>
          )}

          {current.namaLokasi && (
            <div className='flex items-center gap-1.5 text-xs sm:text-sm text-white/90'>
              <MapPin className='size-4 text-emerald-400 shrink-0' />
              <span>{current.namaLokasi}</span>
            </div>
          )}
        </div>

        {/* Carousel Indicators / Dots */}
        {displayEvents.length > 1 && (
          <div className='absolute bottom-4 right-6 z-20 flex items-center gap-1.5'>
            {displayEvents.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'w-6 bg-amber-400'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
