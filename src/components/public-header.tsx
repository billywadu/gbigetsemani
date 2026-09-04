'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Church,
  BookOpen,
  Users,
  HeartHandshake,
  UserPlus,
  Search,
  Lock,
  Menu,
  Sparkles,
  Info,
  ChevronDown,
  ChevronRight,
  Home,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getAppProfileAction } from '@/actions/app-profile'
import { getLandingPageConfigAction } from '@/actions/landing-page'
import { AppProfileConfig, DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'
import { LandingPageConfig, DEFAULT_LANDING_PAGE_CONFIG } from '@/lib/validations/landing-page'

export interface PublicHeaderProps {
  initialProfile?: AppProfileConfig | null
  initialConfig?: LandingPageConfig | null
}

export function PublicHeader({ initialProfile, initialConfig }: PublicHeaderProps) {
  const pathname = usePathname()
  const [profile, setProfile] = useState<AppProfileConfig>(
    initialProfile || DEFAULT_APP_PROFILE_CONFIG
  )
  const [config, setConfig] = useState<LandingPageConfig>(
    initialConfig || DEFAULT_LANDING_PAGE_CONFIG
  )
  const [churchNameOverride, setChurchNameOverride] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    Promise.all([getAppProfileAction(), getLandingPageConfigAction()]).then(
      ([profileRes, configRes]) => {
        if (profileRes.success && profileRes.data) {
          setProfile(profileRes.data)
        }
        if (configRes.success && configRes.data) {
          setConfig(configRes.data)
          if (configRes.data.footer?.churchName) {
            setChurchNameOverride(configRes.data.footer.churchName)
          }
        }
      }
    )
  }, [])

  const churchName =
    churchNameOverride ||
    profile.namaSingkat ||
    profile.namaResmi ||
    'GBI Getsemani'
  const churchLogoUrl = profile.logoUrl || null

  // Active state helpers
  const isBerandaActive = pathname === '/'
  const isTentangActive =
    pathname === '/tentang-kami' || pathname?.startsWith('/struktur-organisasi')
  const isArtikelActive = pathname === '/artikel' || pathname?.startsWith('/artikel/')
  const isLayananActive =
    pathname === '/doa' ||
    pathname?.startsWith('/daftar') ||
    pathname?.startsWith('/profil-jemaat')

  return (
    <div className='sticky top-0 z-50 w-full'>
      <header className='h-16 border-b bg-card/85 px-4 sm:px-6 md:px-8 flex items-center justify-between backdrop-blur-md'>
      {/* ── Brand Logo & Name ────────────────────────────────────────── */}
      <Link href='/' className='flex items-center gap-3 shrink-0 group'>
        {churchLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={churchLogoUrl}
            alt={churchName}
            className='size-8 sm:size-9 object-contain group-hover:scale-105 transition-transform'
          />
        ) : (
          <div className='size-8 sm:size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-2xs'>
            <Church className='size-5' />
          </div>
        )}
        <div className='hidden sm:block'>
          <span className='font-bold text-sm sm:text-base leading-tight block text-foreground'>
            {churchName}
          </span>
          <span className='text-[10px] text-muted-foreground block font-mono'>
            Portal Publik & CMS Jemaat
          </span>
        </div>
      </Link>

      {/* ── Desktop Navigation (Unified 4-Pillar Architecture) ─────── */}
      <nav className='hidden md:flex items-center gap-1.5 text-xs font-medium'>
        {/* 1. Beranda */}
        <Link
          href='/'
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            isBerandaActive
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          Beranda
        </Link>

        {/* 2. Tentang Kami (Dropdown) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type='button'
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors cursor-pointer outline-hidden ${
                isTentangActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>Tentang Kami</span>
              <ChevronDown className='size-3.5 opacity-60 transition-transform duration-200' />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align='start'
            className='w-64 p-1.5 rounded-xl shadow-lg border bg-popover/95 backdrop-blur-md'
          >
            <DropdownMenuItem asChild className='rounded-lg focus:bg-primary/10 cursor-pointer p-2.5'>
              <Link href='/tentang-kami' className='flex items-start gap-3'>
                <div className='size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5'>
                  <Info className='size-3.5' />
                </div>
                <div className='space-y-0.5'>
                  <div className='font-semibold text-xs text-foreground'>Profil & Visi Misi</div>
                  <div className='text-[10px] text-muted-foreground leading-tight'>
                    Sejarah, nilai inti, & pengakuan iman
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className='rounded-lg focus:bg-primary/10 cursor-pointer p-2.5'>
              <Link href='/struktur-organisasi' className='flex items-start gap-3'>
                <div className='size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5'>
                  <Users className='size-3.5' />
                </div>
                <div className='space-y-0.5'>
                  <div className='font-semibold text-xs text-foreground'>Struktur Organisasi</div>
                  <div className='text-[10px] text-muted-foreground leading-tight'>
                    BPH, dewan pastoral, & kategorial
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 3. Artikel & Renungan */}
        <Link
          href='/artikel'
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            isArtikelActive
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          Artikel & Renungan
        </Link>

        {/* 4. Layanan Jemaat (Dropdown) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type='button'
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors cursor-pointer outline-hidden ${
                isLayananActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>Layanan Jemaat</span>
              <ChevronDown className='size-3.5 opacity-60 transition-transform duration-200' />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align='start'
            className='w-72 p-1.5 rounded-xl shadow-lg border bg-popover/95 backdrop-blur-md'
          >
            <DropdownMenuItem asChild className='rounded-lg focus:bg-rose-500/10 cursor-pointer p-2.5'>
              <Link href='/doa' className='flex items-start gap-3'>
                <div className='size-7 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5'>
                  <HeartHandshake className='size-3.5' />
                </div>
                <div className='space-y-0.5'>
                  <div className='font-semibold text-xs text-foreground'>Permohonan Doa</div>
                  <div className='text-[10px] text-muted-foreground leading-tight'>
                    Sampaikan pokok doa untuk didoakan
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className='rounded-lg focus:bg-emerald-500/10 cursor-pointer p-2.5'>
              <Link href='/daftar' className='flex items-start gap-3'>
                <div className='size-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5'>
                  <UserPlus className='size-3.5' />
                </div>
                <div className='space-y-0.5'>
                  <div className='font-semibold text-xs text-foreground'>Pendaftaran Jemaat</div>
                  <div className='text-[10px] text-muted-foreground leading-tight'>
                    Formulir jemaat baru & simpatisan
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className='rounded-lg focus:bg-blue-500/10 cursor-pointer p-2.5'>
              <Link href='/profil-jemaat' className='flex items-start gap-3'>
                <div className='size-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5'>
                  <Search className='size-3.5' />
                </div>
                <div className='space-y-0.5'>
                  <div className='font-semibold text-xs text-foreground'>Cek Data & Kartu NIJ</div>
                  <div className='text-[10px] text-muted-foreground leading-tight'>
                    Verifikasi status anggota & kartu digital
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* ── Right Actions ────────────────────────────────────────────── */}
      <div className='flex items-center gap-2 shrink-0'>
        {/* ── Mobile Hamburger Menu ──────────────────────────────────── */}

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant='ghost' size='sm' className='md:hidden h-9 w-9 p-0 text-muted-foreground'>
              <Menu className='size-5' />
              <span className='sr-only'>Buka Menu Navigasi</span>
            </Button>
          </SheetTrigger>
          <SheetContent side='right' className='w-72 sm:w-80 p-0 flex flex-col justify-between'>
            <div className='p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-120px)]'>
              <SheetHeader className='text-left pb-4 border-b'>
                <SheetTitle className='flex items-center gap-2.5 text-base font-bold'>
                  {churchLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={churchLogoUrl}
                      alt={churchName}
                      className='size-8 sm:size-9 object-contain rounded-lg'
                    />
                  ) : (
                    <div className='size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs'>
                      <Church className='size-4' />
                    </div>
                  )}
                  <div>
                    <div className='text-sm font-bold text-foreground leading-tight'>{churchName}</div>
                    <div className='text-[10px] text-muted-foreground font-mono'>Portal Publik</div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              {/* Group 1: Menu Utama */}
              <div className='space-y-1'>
                <div className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 font-mono'>
                  Utama
                </div>
                <Link
                  href='/'
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isBerandaActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className='flex items-center gap-2.5'>
                    <Home className='size-4' />
                    <span>Beranda</span>
                  </div>
                  <ChevronRight className='size-3.5 opacity-50' />
                </Link>

                <Link
                  href='/artikel'
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isArtikelActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className='flex items-center gap-2.5'>
                    <BookOpen className='size-4' />
                    <span>Artikel & Renungan</span>
                  </div>
                  <ChevronRight className='size-3.5 opacity-50' />
                </Link>
              </div>

              {/* Group 2: Mengenal Kami */}
              <div className='space-y-1 pt-2 border-t'>
                <div className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 font-mono'>
                  Mengenal Gereja
                </div>
                <Link
                  href='/tentang-kami'
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === '/tentang-kami'
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className='flex items-center gap-2.5'>
                    <Info className='size-4' />
                    <span>Profil & Visi Misi</span>
                  </div>
                  <ChevronRight className='size-3.5 opacity-50' />
                </Link>

                <Link
                  href='/struktur-organisasi'
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname?.startsWith('/struktur-organisasi')
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className='flex items-center gap-2.5'>
                    <Users className='size-4' />
                    <span>Struktur Organisasi</span>
                  </div>
                  <ChevronRight className='size-3.5 opacity-50' />
                </Link>
              </div>

              {/* Group 3: Layanan Jemaat */}
              <div className='space-y-1 pt-2 border-t'>
                <div className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 font-mono'>
                  Layanan Jemaat
                </div>
                <Link
                  href='/doa'
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === '/doa'
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className='flex items-center gap-2.5'>
                    <HeartHandshake className='size-4' />
                    <span>Permohonan Doa</span>
                  </div>
                  <ChevronRight className='size-3.5 opacity-50' />
                </Link>

                <Link
                  href='/daftar'
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname?.startsWith('/daftar')
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className='flex items-center gap-2.5'>
                    <UserPlus className='size-4' />
                    <span>Pendaftaran Jemaat</span>
                  </div>
                  <ChevronRight className='size-3.5 opacity-50' />
                </Link>

                <Link
                  href='/profil-jemaat'
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname?.startsWith('/profil-jemaat')
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className='flex items-center gap-2.5'>
                    <Search className='size-4' />
                    <span>Cek Data & Kartu NIJ</span>
                  </div>
                  <ChevronRight className='size-3.5 opacity-50' />
                </Link>
              </div>
            </div>

            <div className='p-4 border-t bg-muted/20 text-center text-[10px] text-muted-foreground'>
              © {new Date().getFullYear()} {churchName}. Portal Jemaat & Informasi Publik.
            </div>

          </SheetContent>
        </Sheet>
      </div>
    </header>
    </div>
  )
}
