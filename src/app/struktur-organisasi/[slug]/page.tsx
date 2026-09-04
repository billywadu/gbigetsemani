'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Users,
  Flame,
  Sparkles,
  Heart,
  ChevronLeft,
  Calendar,
  Globe,
  ArrowRight,
  ShieldCheck,
  Search,
  Award,
  BookOpen,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import {
  getStrukturKategorialPublicAction,
  KategorialProfilDTO,
  StrukturTierDTO,
  PengurusGerejaDTO,
} from '@/actions/struktur-organisasi'

export default function DedicatedKategorialPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kategorial, setKategorial] = useState<KategorialProfilDTO | null>(null)
  const [tiers, setTiers] = useState<StrukturTierDTO[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!slug) return
    async function loadData() {
      setLoading(true)
      const res = await getStrukturKategorialPublicAction(slug)
      if (res.success && res.data) {
        setKategorial(res.data.kategorial)
        setTiers(res.data.tiers)
      } else {
        setError(res.error || 'Halaman kategorial tidak ditemukan.')
      }
      setLoading(false)
    }
    loadData()
  }, [slug])

  const filterOfficials = (officials: PengurusGerejaDTO[] = []) => {
    if (!searchQuery.trim()) return officials
    const q = searchQuery.toLowerCase()
    return officials.filter(
      (p) =>
        p.namaLengkapTampil.toLowerCase().includes(q) ||
        p.jabatan.toLowerCase().includes(q) ||
        (p.bioRingkas && p.bioRingkas.toLowerCase().includes(q))
    )
  }

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground'>
      {/* ── Unified Top Public Header ───────────────────────────────── */}
      <PublicHeader />

      {/* ── Main Body ─────────────────────────────────────────────── */}
      <main className='flex-1 pb-20'>
        {loading ? (
          <div className='py-32 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs'>
            <Loader2 className='size-6 animate-spin text-primary' />
            Memuat struktur komunitas {slug}...
          </div>
        ) : error || !kategorial ? (
          <div className='max-w-md mx-auto py-28 px-4 text-center space-y-4 text-muted-foreground'>
            <Users className='size-12 mx-auto text-muted-foreground/30' />
            <h2 className='text-lg font-bold text-foreground'>Komisi Tidak Ditemukan</h2>
            <p className='text-xs leading-relaxed'>
              Halaman komisi kategorial yang Anda tuju tidak ditemukan atau belum dipublikasikan.
            </p>
            <Link href='/struktur-organisasi'>
              <Button size='sm' className='gap-2 text-xs'>
                <ChevronLeft className='size-3.5' /> Kembali ke Struktur Utama
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* ── COMMUNITY HERO BANNER ───────────────────────────────── */}
            <section className='relative py-12 sm:py-16 border-b bg-gradient-to-b from-primary/10 via-background to-background overflow-hidden'>
              <div className='max-w-4xl mx-auto px-4 sm:px-6 space-y-5 text-center'>
                {/* Back to main link */}
                <div className='flex items-center justify-center'>
                  <Link
                    href='/struktur-organisasi'
                    className='inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors bg-background/80 px-3 py-1 rounded-full border shadow-2xs'
                  >
                    <ChevronLeft className='size-3.5' />
                    <span>Kembali ke Struktur Organisasi Utama</span>
                  </Link>
                </div>

                <div className='space-y-2'>
                  <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold'>
                    {kategorial.slug === 'youth' ? (
                      <Flame className='size-4 text-amber-500' />
                    ) : kategorial.slug === 'anak' ? (
                      <Sparkles className='size-4 text-blue-500' />
                    ) : kategorial.slug === 'wanita' ? (
                      <Heart className='size-4 text-rose-500' />
                    ) : (
                      <Users className='size-4 text-primary' />
                    )}
                    <span>Komisi Kategorial</span>
                  </div>

                  <h1 className='text-3xl sm:text-4xl md:text-5xl font-black tracking-tight font-serif text-foreground'>
                    {kategorial.nama}
                  </h1>

                  {kategorial.slogan && (
                    <p className='text-sm sm:text-base text-foreground/80 font-medium max-w-xl mx-auto'>
                      "{kategorial.slogan}"
                    </p>
                  )}

                  {kategorial.ayatTema && (
                    <p className='text-xs text-muted-foreground font-serif italic'>
                      Ayat Visi: {kategorial.ayatTema}
                    </p>
                  )}
                </div>

                {/* Practical Community Info Chips */}
                <div className='flex flex-wrap items-center justify-center gap-2.5 pt-2'>
                  {kategorial.jadwalIbadah && (
                    <Badge variant='outline' className='text-xs py-1 px-3 gap-1.5 bg-background'>
                      <Calendar className='size-3.5 text-primary' /> {kategorial.jadwalIbadah}
                    </Badge>
                  )}

                  {kategorial.instagramUrl && (
                    <a
                      href={
                        kategorial.instagramUrl.startsWith('http')
                          ? kategorial.instagramUrl
                          : `https://instagram.com/${kategorial.instagramUrl.replace('@', '')}`
                      }
                      target='_blank'
                      rel='noreferrer'
                    >
                      <Badge variant='outline' className='text-xs py-1 px-3 gap-1.5 bg-background hover:bg-muted/50 cursor-pointer'>
                        <Globe className='size-3.5 text-rose-500' /> {kategorial.instagramUrl}
                      </Badge>
                    </a>
                  )}

                  <Badge variant='secondary' className='text-xs py-1 px-3 gap-1.5'>
                    <Users className='size-3.5 text-primary' /> {kategorial.totalAnggota} Jemaat Bergabung
                  </Badge>
                </div>

                {/* Search Bar */}
                <div className='pt-4 max-w-md mx-auto'>
                  <div className='relative shadow-xs rounded-xl'>
                    <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Cari pengurus ${kategorial.nama}...`}
                      className='pl-10 h-10 text-xs bg-background/90'
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── DYNAMIC TIERS SECTION ───────────────────────────────── */}
            <div className='max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-16'>
              {tiers.length === 0 ? (
                <div className='py-20 text-center text-xs text-muted-foreground space-y-2'>
                  <Users className='size-10 mx-auto text-muted-foreground/30' />
                  <p>Belum ada susunan pengurus yang ditambahkan pada komisi ini.</p>
                </div>
              ) : (
                tiers.map((tier) => {
                  const tierOfficials = filterOfficials(tier.pengurusList)
                  if (tierOfficials.length === 0 && searchQuery.trim()) return null

                  return (
                    <section key={tier.id} className='space-y-6'>
                      <div className='border-b pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-1'>
                        <div>
                          <div className='flex items-center gap-2'>
                            <span className='size-2 rounded-full bg-primary inline-block' />
                            <h2 className='text-lg sm:text-xl font-bold tracking-tight text-foreground font-serif'>
                              {tier.nama}
                            </h2>
                          </div>
                          {tier.deskripsi && (
                            <p className='text-xs text-muted-foreground mt-0.5 max-w-2xl'>
                              {tier.deskripsi}
                            </p>
                          )}
                        </div>
                        <div className='text-[11px] text-muted-foreground font-mono'>
                          {tierOfficials.length} Pengurus Komisi
                        </div>
                      </div>

                      {/* RENDER FEATURED OR GRID */}
                      {tier.layoutStyle === 'FEATURED' ? (
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                          {tierOfficials.map((p) => (
                            <Card
                              key={p.id}
                              className='overflow-hidden border shadow-xs hover:shadow-md transition-all group bg-card flex flex-col sm:flex-row'
                            >
                              <div className='w-full sm:w-52 h-64 sm:h-auto bg-muted shrink-0 relative overflow-hidden flex items-center justify-center'>
                                {p.fotoPublikUrl ? (
                                  <img
                                    src={p.fotoPublikUrl}
                                    alt={p.nama}
                                    className='w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500'
                                    loading='lazy'
                                  />
                                ) : (
                                  <div className='size-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl font-serif'>
                                    {p.nama.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <Badge className='absolute top-3 left-3 text-[10px] shadow-xs' variant='secondary'>
                                  #{p.urutan}
                                </Badge>
                              </div>

                              <CardContent className='p-5 flex-1 flex flex-col justify-between space-y-3'>
                                <div>
                                  <Badge variant='outline' className='text-[10px] text-primary border-primary/30 mb-1.5'>
                                    {p.jabatan}
                                  </Badge>
                                  <h3 className='text-base sm:text-lg font-bold text-foreground leading-tight'>
                                    {p.namaLengkapTampil}
                                  </h3>
                                  {p.periodeAwal && (
                                    <p className='text-[11px] text-muted-foreground font-mono mt-1'>
                                      Periode: {p.periodeAwal} {p.periodeAkhir ? `- ${p.periodeAkhir}` : '- Sekarang'}
                                    </p>
                                  )}
                                </div>

                                {p.bioRingkas && (
                                  <p className='text-xs text-muted-foreground italic border-t pt-3 leading-relaxed'>
                                    "{p.bioRingkas}"
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'>
                          {tierOfficials.map((p) => (
                            <Card
                              key={p.id}
                              className='overflow-hidden border shadow-2xs hover:shadow-xs hover:border-primary/40 transition-all group bg-card flex flex-col justify-between'
                            >
                              <div className='aspect-square w-full bg-muted overflow-hidden relative flex items-center justify-center'>
                                {p.fotoPublikUrl ? (
                                  <img
                                    src={p.fotoPublikUrl}
                                    alt={p.nama}
                                    className='w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300'
                                    loading='lazy'
                                  />
                                ) : (
                                  <div className='size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg font-serif'>
                                    {p.nama.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <CardContent className='p-3.5 space-y-2 flex-1 flex flex-col justify-between'>
                                <div>
                                  <span className='text-[10px] font-semibold text-primary block leading-tight truncate'>
                                    {p.jabatan}
                                  </span>
                                  <h3 className='font-bold text-xs sm:text-sm text-foreground leading-tight line-clamp-1 mt-0.5'>
                                    {p.namaLengkapTampil}
                                  </h3>
                                  {p.periodeAwal && (
                                    <span className='text-[10px] text-muted-foreground font-mono block mt-1'>
                                      {p.periodeAwal} {p.periodeAkhir ? `- ${p.periodeAkhir}` : ''}
                                    </span>
                                  )}
                                </div>

                                {p.bioRingkas && (
                                  <p className='text-[10px] text-muted-foreground line-clamp-2 italic border-t pt-2 w-full leading-relaxed'>
                                    "{p.bioRingkas}"
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </section>
                  )
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Dynamic Database Connected Footer ─────────────────────── */}
      <PublicFooter />
    </div>
  )
}
