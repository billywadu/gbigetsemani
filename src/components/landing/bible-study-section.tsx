'use client'

import React from 'react'
import Link from 'next/link'
import { BookOpen, Calendar, ArrowRight, GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BibleStudyConfig } from '@/lib/validations/landing-page'
import { ArtikelDTO } from '@/actions/artikel'

interface BibleStudySectionProps {
  config: BibleStudyConfig
  articles: ArtikelDTO[]
}

export function BibleStudySection({ config, articles }: BibleStudySectionProps) {
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
            <GraduationCap className='size-3.5' />
            <span>Pendalaman Alkitab & Doktrin</span>
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
            <span>Semua Materi Studi</span>
            <ArrowRight className='size-4' />
          </Link>
        </Button>
      </div>

      {/* 4-Card Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'>
        {displayArticles.map((art) => (
          <Link
            key={art.id}
            href={`/artikel/${art.slug}`}
            className='group flex flex-col rounded-2xl border bg-card hover:bg-muted/30 hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden'
          >
            {/* 16:9 Thumbnail */}
            <div className='relative aspect-video w-full overflow-hidden bg-muted'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  art.thumbnailUrl ||
                  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80'
                }
                alt={art.judul}
                className='w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300'
              />
              <div className='absolute top-2.5 left-2.5'>
                <Badge className='bg-card/90 backdrop-blur-md text-foreground border text-[10px] font-semibold'>
                  {art.kategoriNama}
                </Badge>
              </div>
            </div>

            {/* Content Info */}
            <div className='p-4 flex flex-col justify-between flex-1 space-y-3'>
              <div className='space-y-1.5'>
                <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                  <Calendar className='size-3' />
                  {formatDate(art.tanggal)}
                </span>
                <h3 className='font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug'>
                  {art.judul}
                </h3>
                <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed'>
                  {art.ringkasan}
                </p>
              </div>

              <div className='pt-3 border-t flex items-center justify-between text-[11px] text-muted-foreground'>
                <span className='line-clamp-1 font-medium text-foreground/80'>
                  {art.penulis || 'Tim Pastoral'}
                </span>
                <span className='text-primary font-semibold group-hover:translate-x-0.5 transition-transform shrink-0'>
                  Pelajari &rarr;
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
