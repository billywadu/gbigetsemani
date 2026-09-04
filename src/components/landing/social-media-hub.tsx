'use client'

import React from 'react'
import {
  Video,
  Share2,
  MessageCircle,
  Headphones,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { SocialMediaConfig } from '@/lib/validations/landing-page'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <rect width='20' height='20' x='2' y='2' rx='5' ry='5' />
      <path d='M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' />
      <line x1='17.5' x2='17.51' y1='6.5' y2='6.5' />
    </svg>
  )
}

interface SocialMediaHubProps {
  config: SocialMediaConfig
}

export function SocialMediaHub({ config }: SocialMediaHubProps) {
  if (!config.enabled) return null

  const channels = [
    {
      id: 'youtube',
      name: 'YouTube',
      label: config.youtubeLabel || 'Live Streaming & Khotbah',
      url: config.youtubeUrl,
      icon: Video,
      color: 'from-red-500 to-rose-600',
      bgGlow: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      btnText: 'Tonton Streaming',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      label: config.instagramLabel || 'Warta & Foto Kegiatan',
      url: config.instagramUrl,
      icon: InstagramIcon,
      color: 'from-purple-500 via-pink-500 to-amber-500',
      bgGlow: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
      btnText: 'Ikuti @Instagram',
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      label: config.tiktokLabel || 'Inspirasi Firman 1 Menit',
      url: config.tiktokUrl,
      icon: Share2,
      color: 'from-cyan-500 to-slate-900',
      bgGlow: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      btnText: 'Lihat Konten TikTok',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      label: config.whatsappLabel || 'Layanan Doa & Informasi',
      url: config.whatsappUrl,
      icon: MessageCircle,
      color: 'from-emerald-500 to-green-600',
      bgGlow: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      btnText: 'Chat WhatsApp Gereja',
    },
  ]

  return (
    <section className='max-w-6xl mx-auto px-4 sm:px-6 mb-16'>
      <div className='relative overflow-hidden rounded-3xl bg-linear-to-br from-card via-card/95 to-muted/50 border p-6 sm:p-10 shadow-lg'>
        {/* Background ambient lighting */}
        <div className='absolute -top-24 -right-24 size-96 bg-primary/10 rounded-full blur-3xl pointer-events-none' />
        <div className='absolute -bottom-24 -left-24 size-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none' />

        <div className='relative z-10'>
          {/* Section Header */}
          <div className='text-center max-w-2xl mx-auto mb-8 sm:mb-10'>
            <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3'>
              <Sparkles className='size-3.5' />
              <span>Komunitas Digital</span>
            </div>
            <h2 className='text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground font-serif'>
              {config.sectionTitle}
            </h2>
            <p className='text-xs sm:text-sm md:text-base text-muted-foreground mt-2 leading-relaxed'>
              {config.sectionSubtitle}
            </p>
          </div>

          {/* Social Media 4-Grid Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            {channels.map((chan) => {
              const Icon = chan.icon
              return (
                <a
                  key={chan.id}
                  href={chan.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='group relative flex flex-col justify-between p-5 rounded-2xl border bg-card/80 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300'
                >
                  <div className='space-y-3'>
                    <div className={`size-11 rounded-xl flex items-center justify-center border ${chan.bgGlow} group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className='size-5.5' />
                    </div>
                    <div>
                      <h3 className='font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors'>
                        {chan.name}
                      </h3>
                      <p className='text-xs text-muted-foreground mt-0.5 leading-snug'>
                        {chan.label}
                      </p>
                    </div>
                  </div>

                  <div className='pt-4 mt-2 border-t flex items-center justify-between text-xs font-semibold text-primary group-hover:underline'>
                    <span>{chan.btnText}</span>
                    <ExternalLink className='size-3.5 group-hover:translate-x-0.5 transition-transform' />
                  </div>
                </a>
              )
            })}
          </div>

          {/* Optional Spotify Podcast Bar */}
          {config.spotifyUrl && (
            <div className='mt-6 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left'>
              <div className='flex items-center gap-3'>
                <div className='size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0'>
                  <Headphones className='size-5' />
                </div>
                <div>
                  <div className='text-xs sm:text-sm font-semibold text-foreground'>
                    {config.spotifyLabel || 'Podcast Firman Tuhan di Spotify'}
                  </div>
                  <div className='text-[11px] text-muted-foreground'>
                    Dengarkan audio khotbah & renungan di mana saja saat beraktivitas
                  </div>
                </div>
              </div>
              <a
                href={config.spotifyUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-all shrink-0'
              >
                <span>Dengar di Spotify</span>
                <ExternalLink className='size-3.5' />
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
