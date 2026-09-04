'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Church,
  Users,
  Sparkles,
  ShieldCheck,
  Search,
  ArrowRight,
  Layers,
  Award,
  BookOpen,
  Calendar,
  Loader2,
  ChevronRight,
  ExternalLink,
  Flame,
  Heart,
  Compass,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import {
  getStrukturOrganisasiPublicAction,
  StrukturTierDTO,
  KategorialProfilDTO,
  PengurusGerejaDTO,
} from '@/actions/struktur-organisasi'
import { getProfilGerejaPublicAction, ProfilGerejaDTO } from '@/actions/profil-gereja'

export default function StrukturOrganisasiPublicPage() {
  const [loading, setLoading] = useState(true)
  const [profil, setProfil] = useState<ProfilGerejaDTO | null>(null)
  const [tiers, setTiers] = useState<StrukturTierDTO[]>([])
  const [kategorialKatalog, setKategorialKatalog] = useState<KategorialProfilDTO[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [resStruktur, resProfil] = await Promise.all([
        getStrukturOrganisasiPublicAction(),
        getProfilGerejaPublicAction(),
      ])

      if (resStruktur.success && resStruktur.data) {
        setTiers(resStruktur.data.tiers)
        setKategorialKatalog(resStruktur.data.kategorialKatalog)
      }

      if (resProfil.success && resProfil.data) {
        setProfil(resProfil.data.profil)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  // Filter officials by search query within each tier
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
        {/* HERO SECTION */}
        <section className='py-12 sm:py-16 border-b bg-gradient-to-b from-primary/5 via-background to-background'>
          <div className='max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-3'>
            <Badge
              variant='outline'
              className='px-3 py-1 text-xs gap-1.5 bg-background/80 border-primary/30 text-primary'
            >
              <Award className='size-3 text-primary' /> Tata Kelola & Kepemimpinan Pelayanan
            </Badge>

            <h1 className='text-3xl sm:text-4xl md:text-5xl font-black tracking-tight font-serif text-foreground'>
              Struktur Organisasi Gereja
            </h1>

            <p className='text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed'>
              Jajaran kepemimpinan pastoral, majelis jemaat, dan pengurus pelayan Tuhan yang setia menggembalakan
              serta memfasilitasi pertumbuhan iman di {profil?.namaGereja || 'GBI Getsemani'}.
            </p>

            {/* Quick Search */}
            <div className='pt-3 max-w-md mx-auto'>
              <div className='relative shadow-xs rounded-xl'>
                <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Cari nama hamba Tuhan atau jabatan...'
                  className='pl-10 h-10 text-xs bg-background/90'
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── DYNAMIC TIERS LEADERSHIP ──────────────────────────────── */}
        <div className='max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-16'>
          {loading ? (
            <div className='py-28 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs'>
              <Loader2 className='size-6 animate-spin text-primary' />
              Memuat struktur kepengurusan gereja...
            </div>
          ) : tiers.length === 0 ? (
            <div className='py-20 text-center text-xs text-muted-foreground space-y-2'>
              <Users className='size-10 mx-auto text-muted-foreground/30' />
              <p>Belum ada tingkatan kepengurusan yang ditambahkan.</p>
            </div>
          ) : (
            <>
              {tiers.map((tier) => {
                const tierOfficials = filterOfficials(tier.pengurusList)
                if (tierOfficials.length === 0 && searchQuery.trim()) return null

                return (
                  <section key={tier.id} className='space-y-6'>
                    {/* Section Tier Title & Divider */}
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
                        {tierOfficials.length} Pejabat Pelayanan
                      </div>
                    </div>

                    {/* RENDER FEATURED TIERS (Kartu Potret Besar) */}
                    {tier.layoutStyle === 'FEATURED' ? (
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        {tierOfficials.map((p) => (
                          <Card
                            key={p.id}
                            className='overflow-hidden border shadow-xs hover:shadow-md transition-all group bg-card flex flex-col sm:flex-row'
                          >
                            {/* Photo Column */}
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

                            {/* Details Column */}
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
                      /* RENDER GRID TIERS (Kartu Standar 3-4 Kolom) */
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
              })}

              {/* ── KATALOG KOMISI KATEGORIAL (HUB KE SUB-PAGES) ──────── */}
              <section className='pt-8 border-t space-y-6'>
                <div className='text-center max-w-xl mx-auto space-y-2'>
                  <Badge variant='outline' className='px-3 py-1 text-xs gap-1.5 border-primary/30 text-primary'>
                    <Flame className='size-3 text-amber-500' /> Komisi Kategorial & Generasi
                  </Badge>
                  <h2 className='text-2xl sm:text-3xl font-black font-serif tracking-tight text-foreground'>
                    Struktur Komisi Kategorial
                  </h2>
                  <p className='text-xs sm:text-sm text-muted-foreground leading-relaxed'>
                    Setiap komisi kategorial memiliki kepengurusan dan kegiatan khusus sesuai dengan tahapan usia
                    dan pertumbuhan rohani jemaat.
                  </p>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2'>
                  {kategorialKatalog.map((kat) => (
                    <Card
                      key={kat.id}
                      className='overflow-hidden border shadow-xs hover:border-primary/50 hover:shadow-md transition-all group bg-card flex flex-col justify-between'
                    >
                      <CardContent className='p-5 space-y-4 flex-1 flex flex-col justify-between'>
                        <div className='space-y-2.5'>
                          <div className='flex items-center justify-between'>
                            <div className='size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold group-hover:scale-110 transition-transform'>
                              {kat.slug === 'youth' ? (
                                <Flame className='size-5 text-amber-500' />
                              ) : kat.slug === 'anak' ? (
                                <Sparkles className='size-5 text-blue-500' />
                              ) : kat.slug === 'wanita' ? (
                                <Heart className='size-5 text-rose-500' />
                              ) : (
                                <Users className='size-5 text-primary' />
                              )}
                            </div>
                            {kat.jadwalIbadah && (
                              <Badge variant='secondary' className='text-[10px] font-mono'>
                                <Calendar className='size-3 mr-1' /> {kat.jadwalIbadah}
                              </Badge>
                            )}
                          </div>

                          <div>
                            <h3 className='text-base font-bold text-foreground group-hover:text-primary transition-colors'>
                              {kat.nama}
                            </h3>
                            <p className='text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed'>
                              {kat.slogan || kat.deskripsi || 'Melayani dan bertumbuh bersama dalam kasih Kristus.'}
                            </p>
                          </div>

                          {kat.ayatTema && (
                            <div className='text-[11px] text-muted-foreground/80 font-serif italic border-l-2 border-primary/30 pl-2'>
                              "{kat.ayatTema}"
                            </div>
                          )}
                        </div>

                        <div className='pt-3 border-t flex items-center justify-between'>
                          <span className='text-[11px] text-muted-foreground font-mono'>
                            {kat.pengurusCount || 0} Pengurus
                          </span>
                          <Link href={`/struktur-organisasi/${kat.slug}`}>
                            <Button size='sm' variant='ghost' className='h-8 text-xs font-semibold gap-1.5 group-hover:text-primary group-hover:translate-x-1 transition-all p-0'>
                              Lihat Kepengurusan <ArrowRight className='size-3.5' />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* ── Dynamic Database Connected Footer ─────────────────────── */}
      <PublicFooter />
    </div>
  )
}
