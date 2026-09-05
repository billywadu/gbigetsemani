'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, UserPlus, HeartHandshake, ShieldCheck, Sparkles, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HeroConfig } from '@/lib/validations/landing-page'

interface HeroVideoSectionProps {
  config: HeroConfig
}

export function HeroVideoSection({ config }: HeroVideoSectionProps) {
  const words = config.rotatingWords && config.rotatingWords.length > 0
    ? config.rotatingWords
    : ['Pemulihan', 'Transformasi', 'Pengharapan', 'Kasih Karunia']

  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in')

  useEffect(() => {
    if (words.length <= 1) return

    const interval = setInterval(() => {
      setFadeState('out')
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % words.length)
        setFadeState('in')
      }, 300)
    }, 3200)

    return () => clearInterval(interval)
  }, [words.length])

  return (
    <section className='relative w-full min-h-[520px] sm:min-h-[600px] md:min-h-[680px] lg:min-h-[740px] flex items-center justify-center overflow-hidden bg-black text-white'>
      {/* ── 1. HTML5 Looping Video Background / Poster ────────────────── */}
      {config.videoUrl ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={config.videoPosterUrl || undefined}
          className='absolute inset-0 w-full h-full object-cover object-center scale-105 filter brightness-[0.70] contrast-[1.05]'
        >
          <source src={config.videoUrl} type='video/mp4' />
        </video>
      ) : config.videoPosterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={config.videoPosterUrl}
          alt='Hero Background'
          className='absolute inset-0 w-full h-full object-cover object-center scale-105 filter brightness-[0.70] contrast-[1.05]'
        />
      ) : (
        <div className='absolute inset-0 bg-slate-950' />
      )}

      {/* ── 2. Cinematic Gradient Overlays ───────────────────────────── */}
      {/* Top soft vignette */}
      <div className='absolute inset-0 bg-linear-to-b from-black/80 via-black/40 to-black/85 z-10' />
      {/* Radial soft glow for text focus */}
      <div className='absolute inset-0 bg-radial from-transparent via-black/20 to-black/90 z-10' />
      {/* Bottom subtle cinematic vignette to keep video contrast solid */}
      <div className='absolute bottom-0 inset-x-0 h-32 bg-linear-to-t from-black/90 via-black/40 to-transparent z-10' />

      {/* ── 3. Content Container ─────────────────────────────────────── */}
      <div className='relative z-20 max-w-4xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center space-y-6 sm:space-y-8'>
        {/* Compliance / Welcome Badge */}
        {config.badgeEnabled !== false && config.badgeText && (
          <div className='inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs sm:text-[13px] font-medium shadow-lg animate-fade-in'>
            <Sparkles className='size-3.5 text-amber-300 shrink-0' />
            <span>{config.badgeText}</span>
          </div>
        )}

        {/* Dynamic Rotating Headline */}
        <h1 className='text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] drop-shadow-md'>
          <span className='block text-white/90 font-serif font-medium text-2xl sm:text-4xl md:text-5xl mb-1 sm:mb-2'>
            {config.titlePrefix || 'Gereja Yang Membawa'}
          </span>
          <span
            className={`inline-block text-transparent bg-clip-text bg-linear-to-r from-amber-300 via-amber-200 to-yellow-400 font-extrabold transition-all duration-300 transform ${
              fadeState === 'in'
                ? 'opacity-100 translate-y-0 filter blur-none scale-100'
                : 'opacity-0 translate-y-2 filter blur-xs scale-95'
            }`}
          >
            {words[currentWordIndex]}
          </span>
        </h1>

        {/* Description / Ayat Tagline */}
        <p className='max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-white/80 font-normal leading-relaxed drop-shadow-sm'>
          {config.description}
        </p>

        {/* Action Buttons */}
        <div className='flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2'>
          {config.ctaDaftarEnabled && (
            <Button
              asChild
              size='lg'
              className='h-12 px-6 sm:px-8 rounded-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm sm:text-base'
            >
              <Link href={config.ctaDaftarUrl || '/daftar'} className='gap-2.5'>
                <UserPlus className='size-4' />
                <span>{config.ctaDaftarText || 'Daftar Jemaat'}</span>
              </Link>
            </Button>
          )}

          {config.ctaVerifikasiEnabled && (
            <Button
              asChild
              variant='outline'
              size='lg'
              className='h-12 px-6 sm:px-8 rounded-full bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-md font-semibold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-sm sm:text-base'
            >
              <Link href={config.ctaVerifikasiUrl || '/doa'} className='gap-2.5'>
                <HeartHandshake className='size-4 text-amber-300' />
                <span>{config.ctaVerifikasiText || 'Permohonan Doa'}</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
