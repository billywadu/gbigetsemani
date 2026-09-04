'use client'

import React from 'react'
import Link from 'next/link'
import { BookOpen, Calendar, User, ArrowRight, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KhotbahConfig } from '@/lib/validations/landing-page'
import { ArtikelDTO } from '@/actions/artikel'

interface KhotbahSectionProps {
  config: KhotbahConfig
  articles: ArtikelDTO[]
}

export function KhotbahSection({ config, articles }: KhotbahSectionProps) {
  const displayArticles = articles.slice(0, config.limit || 4)
  if (displayArticles.length === 0) return null

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return isoString
    }
  }

  return (
    <section className='max-w-6xl mx-auto px-4 sm:px-6 mb-16'>
      {/* Section Header */}
      <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8'>
        <div>
          <div className='flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1'>
            <BookOpen className='size-3.5' />
            <span>Mimbar Firman Tuhan</span>
          </div>
          <h2 className='text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif'>
            {config.sectionTitle}
          </h2>
          {config.sectionSubtitle && (
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              {config.sectionSubtitle}
            </p>
          )}
        </div>

        <Button asChild variant='ghost' className='gap-2 text-primary font-semibold shrink-0 self-start sm:self-auto hover:bg-primary/10'>
          <Link href='/artikel'>
            <span>Lihat Semua Khotbah</span>
            <ArrowRight className='size-4' />
          </Link>
        </Button>
      </div>

      {/* 2-Column Horizontal Cards Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6'>
        {displayArticles.map((art) => (
          <Link
            key={art.id}
            href={`/artikel/${art.slug}`}
            className='group flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border bg-card hover:bg-muted/30 hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden'
          >
            {/* Thumbnail */}
            <div className='relative w-full sm:w-44 h-48 sm:h-auto rounded-xl overflow-hidden shrink-0 bg-muted'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  art.thumbnailUrl ||
                  'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=600&q=80'
                }
                alt={art.judul}
                className='w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300'
              />
              <div className='absolute top-2.5 left-2.5 sm:hidden'>
                <Badge className='bg-primary/90 text-primary-foreground text-[10px] font-semibold'>
                  {art.kategoriNama}
                </Badge>
              </div>
            </div>

            {/* Content Details */}
            <div className='flex flex-col justify-between flex-1 py-1 space-y-2'>
              <div className='space-y-2'>
                <div className='hidden sm:flex items-center gap-2'>
                  <Badge variant='outline' className='text-[10px] font-semibold border-primary/30 text-primary'>
                    {art.kategoriNama}
                  </Badge>
                  <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                    <Calendar className='size-3' />
                    {formatDate(art.tanggal)}
                  </span>
                </div>

                <h3 className='font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug font-serif'>
                  {art.judul}
                </h3>

                <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed'>
                  {art.ringkasan}
                </p>
              </div>

              <div className='flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground'>
                <span className='inline-flex items-center gap-1.5 font-medium text-foreground'>
                  <User className='size-3 text-primary' />
                  {art.penulis || 'Hamba Tuhan'}
                </span>
                <span className='text-primary font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1'>
                  Baca <ArrowRight className='size-3' />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
