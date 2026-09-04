'use client'

import React, { useState } from 'react'
import {
  Video,
  Clock,
  Key,
  Hash,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ZoomConfig } from '@/lib/validations/landing-page'
import { ArtikelDTO } from '@/actions/artikel'

interface ZoomOnlineSectionProps {
  config: ZoomConfig
  articles?: ArtikelDTO[]
}

export function ZoomOnlineSection({ config, articles = [] }: ZoomOnlineSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (!config.enabled) return null

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const cards = config.cards && config.cards.length > 0
    ? config.cards
    : [
        {
          id: 'zm-1',
          title: 'Doa Fajar Online',
          hariJam: 'Setiap Senin – Sabtu, 05.00 WIB',
          deskripsi: 'Memulai hari dengan puji-pujian, doa syafaat, dan perenungan firman Tuhan bersama jemaat.',
          meetingId: config.meetingIdDefault || '842 9182 3019',
          passcode: config.passcodeDefault || 'GETSEMANI',
          linkUrl: config.zoomUrlDefault || 'https://zoom.us/j/84291823019',
        },
        {
          id: 'zm-2',
          title: 'Menara Doa Syafaat Online',
          hariJam: 'Setiap Rabu Malam, 19.30 WIB',
          deskripsi: 'Mezbah doa bersama mendoakan pemulihan keluarga, gereja, bangsa, dan keselamatan jiwa-jiwa.',
          meetingId: config.meetingIdDefault || '842 9182 3019',
          passcode: config.passcodeDefault || 'GETSEMANI',
          linkUrl: config.zoomUrlDefault || 'https://zoom.us/j/84291823019',
        },
      ]

  return (
    <section className='max-w-6xl mx-auto px-4 sm:px-6 mb-16'>
      {/* Section Header */}
      <div className='text-center max-w-2xl mx-auto mb-8 sm:mb-10'>
        <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2'>
          <Video className='size-3.5' />
          <span>Persekutuan Virtual</span>
        </div>
        <h2 className='text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground font-serif'>
          {config.sectionTitle}
        </h2>
        {config.sectionSubtitle && (
          <p className='text-xs sm:text-sm md:text-base text-muted-foreground mt-2 leading-relaxed'>
            {config.sectionSubtitle}
          </p>
        )}
      </div>

      {/* Zoom Cards Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {cards.map((item) => (
          <div
            key={item.id}
            className='group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl border bg-card/90 hover:bg-card hover:border-blue-500/40 hover:shadow-xl transition-all duration-300'
          >
            <div className='space-y-4'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <h3 className='font-bold text-lg sm:text-xl text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
                    {item.title}
                  </h3>
                  <div className='flex items-center gap-1.5 text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium mt-1'>
                    <Clock className='size-3.5' />
                    <span>{item.hariJam}</span>
                  </div>
                </div>
                <div className='size-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0'>
                  <Video className='size-5' />
                </div>
              </div>

              <p className='text-xs sm:text-sm text-muted-foreground leading-relaxed'>
                {item.deskripsi}
              </p>

              {/* Meeting ID & Passcode info boxes */}
              <div className='grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-muted/40 border text-xs'>
                <div>
                  <div className='text-[10px] text-muted-foreground font-medium flex items-center gap-1'>
                    <Hash className='size-3 text-primary' />
                    <span>Meeting ID</span>
                  </div>
                  <div className='flex items-center justify-between mt-1'>
                    <span className='font-mono font-bold text-foreground text-xs sm:text-sm'>
                      {item.meetingId}
                    </span>
                    <button
                      type='button'
                      onClick={() => handleCopy(item.meetingId, `${item.id}-mid`)}
                      className='p-1 text-muted-foreground hover:text-foreground'
                      title='Salin Meeting ID'
                    >
                      {copiedId === `${item.id}-mid` ? (
                        <Check className='size-3.5 text-emerald-500' />
                      ) : (
                        <Copy className='size-3.5' />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <div className='text-[10px] text-muted-foreground font-medium flex items-center gap-1'>
                    <Key className='size-3 text-amber-500' />
                    <span>Passcode</span>
                  </div>
                  <div className='flex items-center justify-between mt-1'>
                    <span className='font-mono font-bold text-foreground text-xs sm:text-sm'>
                      {item.passcode}
                    </span>
                    <button
                      type='button'
                      onClick={() => handleCopy(item.passcode, `${item.id}-pass`)}
                      className='p-1 text-muted-foreground hover:text-foreground'
                      title='Salin Passcode'
                    >
                      {copiedId === `${item.id}-pass` ? (
                        <Check className='size-3.5 text-emerald-500' />
                      ) : (
                        <Copy className='size-3.5' />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Join Button */}
            <div className='pt-5 mt-4 border-t'>
              <Button
                asChild
                className='w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-md shadow-blue-500/20'
              >
                <a href={item.linkUrl} target='_blank' rel='noopener noreferrer'>
                  <Video className='size-4' />
                  <span>Gabung Zoom Sekarang</span>
                  <ExternalLink className='size-3.5 opacity-70' />
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
