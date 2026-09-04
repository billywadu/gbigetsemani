'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MapPin,
  Phone,
  Mail,
  Church,
  ShieldCheck,
  Clock,
  ExternalLink,
  Heart,
} from 'lucide-react'
import { getLandingPageConfigAction } from '@/actions/landing-page'
import { getAppProfileAction } from '@/actions/app-profile'
import { LandingPageConfig, DEFAULT_LANDING_PAGE_CONFIG } from '@/lib/validations/landing-page'
import { AppProfileConfig, DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'

export interface PublicFooterProps {
  initialConfig?: LandingPageConfig | null
  initialProfile?: AppProfileConfig | null
}

export function PublicFooter({ initialConfig, initialProfile }: PublicFooterProps) {
  const [config, setConfig] = useState<LandingPageConfig>(
    initialConfig || DEFAULT_LANDING_PAGE_CONFIG
  )
  const [profile, setProfile] = useState<AppProfileConfig>(
    initialProfile || DEFAULT_APP_PROFILE_CONFIG
  )

  useEffect(() => {
    if (!initialConfig || !initialProfile) {
      Promise.all([getLandingPageConfigAction(), getAppProfileAction()]).then(
        ([configRes, profileRes]) => {
          if (configRes.success && configRes.data) {
            setConfig(configRes.data)
          }
          if (profileRes.success && profileRes.data) {
            setProfile(profileRes.data)
          }
        }
      )
    }
  }, [initialConfig, initialProfile])

  const churchName =
    config.footer?.churchName || profile.namaSingkat || profile.namaResmi || 'GBI Getsemani'
  const churchLogoUrl = profile.logoUrl || null
  const tagline =
    config.footer?.tagline ||
    profile.tagline ||
    'Gereja Yang Membawa Pemulihan & Transformasi Hidup'
  const alamat =
    config.footer?.alamat ||
    profile.alamat ||
    'Jl. Bagindo Aziz Chan No. 34-36, Padang, Sumatera Barat 25112'
  const telepon = config.footer?.telepon || profile.telepon || '(0751) 34567 / 0812-3456-7890'
  const email = config.footer?.email || profile.email || 'sekretariat@gbigetsemanipadang.org'
  const copyrightText =
    config.footer?.copyrightText ||
    `© ${new Date().getFullYear()} ${churchName}. Segala kemuliaan hanya bagi Tuhan.`
  const bgImage =
    config.footer?.backgroundImageUrl ||
    'https://images.unsplash.com/photo-1519491058846-2bf9eb2b3394?auto=format&fit=crop&w=1920&q=80'
  const isParallax = config.footer?.parallaxEnabled !== false

  return (
    <footer
      className={`relative mt-auto border-t overflow-hidden ${
        isParallax ? 'bg-scroll sm:bg-fixed bg-cover bg-center' : 'bg-card'
      }`}
      style={isParallax ? { backgroundImage: `url("${bgImage}")` } : undefined}
    >
      {/* Dark overlay with glassmorphism gradient */}
      <div className='absolute inset-0 bg-linear-to-b from-black/85 via-black/90 to-black/95 z-0' />

      {/* Content wrapper */}
      <div className='relative z-10 text-white/80 py-12 px-4 sm:px-6 md:px-8'>
        {/* ── Main Footer Grid (4 Columns) ─────────────────────────── */}
        <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-white/10 text-xs'>
          {/* Col 1: Brand & Tagline */}
          <div className='space-y-3.5 lg:col-span-1'>
            <div className='flex items-center gap-2.5'>
              {churchLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={churchLogoUrl}
                  alt={churchName}
                  className='size-8 object-contain drop-shadow-md'
                />
              ) : (
                <div className='size-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/30'>
                  <Church className='size-4' />
                </div>
              )}
              <span className='font-bold text-sm sm:text-base text-white leading-tight font-serif'>
                {churchName}
              </span>
            </div>
            <p className='text-white/70 leading-relaxed text-[11px]'>
              {tagline}
            </p>
            <div className='text-[10px] text-amber-300/80 font-mono'>
              Portal Jemaat & Informasi Resmi
            </div>
          </div>

          {/* Col 2: Alamat & Kontak Sekretariat */}
          <div className='space-y-2.5 text-[11px]'>
            <div className='font-bold text-white text-xs uppercase tracking-wider'>
              Alamat & Sekretariat
            </div>
            <div className='flex items-start gap-2 text-white/75'>
              <MapPin className='size-3.5 text-amber-400 shrink-0 mt-0.5' />
              <span className='leading-relaxed'>{alamat}</span>
            </div>
            {telepon && (
              <div className='flex items-center gap-2 text-white/75'>
                <Phone className='size-3.5 text-amber-400 shrink-0' />
                <span>{telepon}</span>
              </div>
            )}
            {email && (
              <div className='flex items-center gap-2 text-white/75'>
                <Mail className='size-3.5 text-amber-400 shrink-0' />
                <span>{email}</span>
              </div>
            )}
          </div>

          {/* Col 3: Waktu Ibadah & Doa */}
          <div className='space-y-2 text-[11px]'>
            <div className='font-bold text-white text-xs uppercase tracking-wider'>
              Jadwal Ibadah
            </div>
            <div className='space-y-1.5 text-white/75'>
              <div className='flex items-start gap-2'>
                <Clock className='size-3 text-amber-400 shrink-0 mt-0.5' />
                <div>
                  <span className='font-semibold text-white'>Ibadah Raya Minggu:</span>
                  <div className='text-[10px] text-white/70'>Sesi 1: 08.00 WIB | Sesi 2: 10.30 WIB</div>
                </div>
              </div>
              <div className='flex items-start gap-2'>
                <Clock className='size-3 text-amber-400 shrink-0 mt-0.5' />
                <div>
                  <span className='font-semibold text-white'>Youth & Remaja:</span>
                  <div className='text-[10px] text-white/70'>Sabtu, 19.00 WIB</div>
                </div>
              </div>
              <div className='flex items-start gap-2'>
                <Clock className='size-3 text-amber-400 shrink-0 mt-0.5' />
                <div>
                  <span className='font-semibold text-white'>Doa Fajar Online:</span>
                  <div className='text-[10px] text-white/70'>Senin – Sabtu, 05.00 WIB (Zoom)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Col 4: Perlindungan Data Jemaat & Integritas */}
          <div className='space-y-2.5 text-[11px]'>
            <div className='font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5'>
              <ShieldCheck className='size-3.5 text-emerald-400' />
              <span>Privasi & Keamanan Data</span>
            </div>
            <p className='text-white/70 leading-relaxed text-[11px]'>
              Seluruh data pribadi jemaat dienkripsi dan dikelola secara aman sesuai Undang-Undang Perlindungan Data Pribadi (UU No. 27/2022).
            </p>
            <div className='pt-1'>
              <Link
                href='/login'
                className='inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 font-semibold'
              >
                <span>Portal Staff & Admin</span>
                <ExternalLink className='size-3' />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Bottom Bar: Copyright & Quick Links ───────────────────── */}
        <div className='max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/60'>
          <p className='text-center sm:text-left leading-relaxed'>
            {copyrightText}
          </p>

          <div className='flex items-center justify-center sm:justify-end gap-x-3 gap-y-1.5 flex-wrap text-center text-white/70'>
            <Link href='/tentang-kami' className='hover:text-white transition-colors'>
              Tentang Kami
            </Link>
            <span className='text-white/30 hidden sm:inline'>•</span>
            <Link href='/struktur-organisasi' className='hover:text-white transition-colors'>
              Struktur Organisasi
            </Link>
            <span className='text-white/30 hidden sm:inline'>•</span>
            <Link href='/artikel' className='hover:text-white transition-colors'>
              Renungan & Firman
            </Link>
            <span className='text-white/30 hidden sm:inline'>•</span>
            <Link href='/profil-jemaat' className='hover:text-white transition-colors'>
              Verifikasi NIJ
            </Link>
            <span className='text-white/30 hidden sm:inline'>•</span>
            <Link href='/daftar' className='hover:text-white transition-colors'>
              Pendaftaran
            </Link>
            <span className='text-white/30 hidden sm:inline'>•</span>
            <Link href='/doa' className='hover:text-white transition-colors'>
              Permohonan Doa
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
