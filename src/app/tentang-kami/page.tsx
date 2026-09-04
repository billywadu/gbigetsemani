'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Church,
  BookOpen,
  Heart,
  Sparkles,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Compass,
  Award,
  ShieldCheck,
  CheckCircle2,
  Users,
  Layers,
  ArrowRight,
  Home,
  MessageSquare,
  Globe,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { getProfilGerejaPublicAction, ProfilGerejaDTO, MilestoneDTO } from '@/actions/profil-gereja'
import { formatRichTextToHtml } from '@/lib/sanitizer'

export default function TentangKamiPublicPage() {
  const [loading, setLoading] = useState(true)
  const [profil, setProfil] = useState<ProfilGerejaDTO | null>(null)
  const [milestones, setMilestones] = useState<MilestoneDTO[]>([])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const res = await getProfilGerejaPublicAction()
      if (res.success && res.data) {
        setProfil(res.data.profil)
        setMilestones(res.data.milestones)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  // Parse JSON data safely
  let misiList: string[] = []
  try {
    if (profil?.misi) {
      misiList = JSON.parse(profil.misi)
    }
  } catch {
    misiList = profil?.misi ? [profil.misi] : []
  }

  let nilaiIntiList: { title: string; desc: string }[] = []
  try {
    if (profil?.nilaiInti) {
      nilaiIntiList = JSON.parse(profil.nilaiInti)
    }
  } catch {
    nilaiIntiList = []
  }

  return (
    <div className='dark min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground'>
      {/* ── Unified Top Public Header ───────────────────────────────── */}
      <PublicHeader />

      {/* ── Main Body ─────────────────────────────────────────────── */}
      <main className='flex-1'>
        {loading ? (
          <div className='py-32 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm'>
            <Loader2 className='size-6 animate-spin text-primary' />
            Memuat profil & sejarah gereja...
          </div>
        ) : (
          <>
            {/* 1. HERO SECTION */}
            <section className='relative py-12 sm:py-20 md:py-24 border-b bg-linear-to-b from-primary/5 via-background to-background overflow-hidden'>
              <div className='max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-3 sm:space-y-4'>
                <Badge variant='outline' className='px-3 py-1 text-[11px] sm:text-xs gap-1.5 border-primary/30 text-primary bg-primary/5 rounded-full'>
                  <Sparkles className='size-3.5' /> Mengenal Kami Lebih Dekat
                </Badge>
                <h1 className='text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground font-serif leading-tight wrap-break-word px-1'>
                  {profil?.tagline || 'Gereja Yang Membawa Pemulihan & Transformasi Hidup'}
                </h1>
                <p className='text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed px-1'>
                  {profil?.isiAyatEmas ? `"${profil.isiAyatEmas}"` : 'Berakar kuat dalam firman, bertumbuh dalam kasih, dan berbuah bagi kemuliaan Kristus.'}
                </p>
                {profil?.ayatEmas && (
                  <div className='text-[11px] sm:text-xs font-semibold text-primary font-mono tracking-wider uppercase'>
                    — {profil.ayatEmas}
                  </div>
                )}
              </div>
            </section>

            {/* 2. VISI & MISI */}
            <section className='py-12 sm:py-16 border-b'>
              <div className='max-w-5xl mx-auto px-4 sm:px-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8'>
                  {/* Visi Card */}
                  <Card className='border-primary/20 bg-linear-to-br from-primary/3 to-transparent shadow-xs relative overflow-hidden'>
                    <div className='absolute top-0 right-0 translate-x-4 -translate-y-4 size-24 bg-primary/10 rounded-full blur-2xl' />
                    <CardContent className='p-5 sm:p-8 space-y-4'>
                      <div className='size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold'>
                        <Compass className='size-5' />
                      </div>
                      <div>
                        <div className='text-xs font-bold text-primary tracking-widest uppercase'>Visi Pelayanan</div>
                        <h2 className='text-lg sm:text-2xl font-bold text-foreground mt-1'>Arah & Panggilan Kami</h2>
                      </div>
                      <p className='text-xs sm:text-sm text-muted-foreground leading-relaxed'>
                        {profil?.visi ||
                          'Menjadi gereja yang berakar kuat dalam firman Tuhan, bertumbuh dalam kasih persaudaraan, dan berbuah lebat mentransformasi komunitas serta bangsa-bangsa bagi kemuliaan Kristus.'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Misi Card */}
                  <Card className='border-border/80 shadow-xs'>
                    <CardContent className='p-5 sm:p-8 space-y-4'>
                      <div className='size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold'>
                        <Award className='size-5' />
                      </div>
                      <div>
                        <div className='text-xs font-bold text-amber-600 dark:text-amber-400 tracking-widest uppercase'>Misi Pelayanan</div>
                        <h2 className='text-lg sm:text-2xl font-bold text-foreground mt-1'>Langkah Konkret Kami</h2>
                      </div>
                      <ul className='space-y-2.5 text-xs sm:text-sm text-muted-foreground'>
                        {misiList.length > 0 ? (
                          misiList.map((m, idx) => (
                            <li key={idx} className='flex items-start gap-2.5'>
                              <CheckCircle2 className='size-4 text-primary shrink-0 mt-0.5' />
                              <span>{m}</span>
                            </li>
                          ))
                        ) : (
                          <li className='flex items-start gap-2.5'>
                            <CheckCircle2 className='size-4 text-primary shrink-0 mt-0.5' />
                            <span>Menyatakan kasih Kristus melalui ibadah yang hidup dan pemuridan yang berakar kuat.</span>
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>

            {/* 3. 4 PILAR NILAI INTI (CORE VALUES) */}
            <section className='py-12 sm:py-16 border-b bg-muted/20'>
              <div className='max-w-5xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10'>
                <div className='text-center space-y-2 max-w-xl mx-auto px-2'>
                  <Badge variant='secondary' className='text-[10px] font-semibold uppercase tracking-wider'>
                    DNA & Budaya Kami
                  </Badge>
                  <h2 className='text-xl sm:text-3xl font-extrabold text-foreground'>Nilai-Nilai Inti (Core Values)</h2>
                  <p className='text-xs sm:text-sm text-muted-foreground'>
                    Prinsip-prinsip alkitabiah yang menjadi denyut nadi seluruh jemaat dan pelayan dalam melangkah.
                  </p>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5'>
                  {nilaiIntiList.map((val, idx) => (
                    <Card key={idx} className='bg-background/80 hover:shadow-md transition-all border-border/80 group'>
                      <CardContent className='p-4 sm:p-5 space-y-2.5 sm:space-y-3'>
                        <div className='size-8 sm:size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform'>
                          {idx + 1}
                        </div>
                        <h3 className='font-bold text-xs sm:text-sm text-foreground leading-snug'>{val.title}</h3>
                        <p className='text-[11px] sm:text-xs text-muted-foreground leading-relaxed'>{val.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </section>

            {/* 4. PERJALANAN SEJARAH & MILESTONE TIMELINE */}
            <section className='py-12 sm:py-20 border-b'>
              <div className='max-w-4xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-12'>
                <div className='text-center space-y-2 max-w-xl mx-auto px-2'>
                  <Badge variant='outline' className='text-[10px] font-semibold uppercase tracking-wider text-primary border-primary/30'>
                    Perjalanan Iman
                  </Badge>
                  <h2 className='text-xl sm:text-3xl font-extrabold text-foreground font-serif'>
                    Sejarah & Tonggak Perjalanan
                  </h2>
                  <p className='text-xs sm:text-sm text-muted-foreground'>
                    Melihat kembali bagaimana tangan Tuhan yang setia menuntun jemaat ini dari awal perintisan hingga saat ini.
                  </p>
                </div>

                {/* Narasi Sejarah Lengkap dari Editor Profil Gereja */}
                {profil?.sejarahLengkap && (
                  <Card className='border-border/80 bg-card/70 shadow-xs relative overflow-hidden backdrop-blur-xs'>
                    <div className='absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-12 translate-x-12 pointer-events-none' />
                    <CardContent className='p-4 sm:p-8 md:p-10 space-y-4 sm:space-y-6 relative'>
                      <div className='flex items-center gap-2 pb-3 border-b text-primary'>
                        <BookOpen className='size-4 sm:size-5 shrink-0' />
                        <span className='text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground'>
                          Kilas Balik & Sejarah Pendirian
                        </span>
                      </div>

                      <div
                        className='prose dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-xs sm:text-sm md:text-base space-y-3 sm:space-y-4 font-normal wrap-break-word'
                        dangerouslySetInnerHTML={{
                          __html: formatRichTextToHtml(profil.sejarahLengkap),
                        }}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Garis Waktu Tonggak Sejarah (Milestones) */}
                {milestones.length > 0 && (
                  <div className='space-y-6 pt-2 sm:pt-4'>
                    <div className='flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider'>
                      <Calendar className='size-4 text-primary shrink-0' />
                      <span>Tonggak Sejarah Penting (Milestones)</span>
                    </div>

                    <div className='relative pl-6 sm:pl-10 space-y-6 sm:space-y-10 border-l-2 border-primary/20 ml-2 sm:ml-4'>
                      {milestones.map((ms, idx) => (
                        <div key={ms.id} className='relative group'>
                          {/* Timeline Dot */}
                          <div className='absolute -left-8 sm:-left-12.25 top-2 size-3.5 sm:size-4 rounded-full bg-background border-4 border-primary group-hover:scale-125 transition-transform shadow-xs' />

                          <div className='space-y-1.5 bg-card/60 border rounded-xl p-3.5 sm:p-6 shadow-2xs hover:shadow-xs transition-shadow'>
                            <div className='inline-flex items-center gap-2'>
                              <span className='px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-mono font-bold text-[11px] sm:text-xs'>
                                {ms.tahun}
                              </span>
                              <span className='text-[11px] sm:text-xs font-semibold text-muted-foreground'>Tonggak #{idx + 1}</span>
                            </div>
                            <h3 className='text-sm sm:text-lg font-bold text-foreground leading-snug'>{ms.judul}</h3>
                            <p className='text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line'>
                              {ms.deskripsi}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 5. PENGAKUAN IMAN DOKTRINAL */}
            {profil?.pengakuanIman && (
              <section className='py-12 sm:py-16 border-b bg-muted/10'>
                <div className='max-w-4xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-6'>
                  <div className='flex items-center gap-2 text-primary'>
                    <ShieldCheck className='size-4 sm:size-5 shrink-0' />
                    <span className='text-xs font-bold uppercase tracking-wider'>Dasar Doktrin</span>
                  </div>
                  <h2 className='text-xl sm:text-2xl font-bold text-foreground'>Pengakuan Iman</h2>
                  <div className='p-4 sm:p-8 bg-card border rounded-2xl shadow-xs text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-line font-sans space-y-4 wrap-break-word'>
                    {profil.pengakuanIman}
                  </div>
                </div>
              </section>
            )}

            {/* 6. CTA MENUJU STRUKTUR ORGANISASI & KONTAK */}
            <section className='py-12 sm:py-16 bg-primary/5 text-center overflow-hidden'>
              <div className='max-w-2xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-5'>
                <h2 className='text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-snug'>
                  Ingin Mengenal Pengurus & Pelayan Kami?
                </h2>
                <p className='text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto'>
                  Ketahui susunan kepemimpinan, Badan Pengurus Harian, serta koordinator kategorial yang melayani di {profil?.namaGereja || 'GBI Getsemani'}.
                </p>
                <div className='flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full max-w-xs sm:max-w-none mx-auto'>
                  <Button asChild className='gap-2 font-semibold shadow-xs w-full sm:w-auto text-xs sm:text-sm h-10 px-5'>
                    <Link href='/struktur-organisasi'>
                      Lihat Struktur Organisasi <ArrowRight className='size-4' />
                    </Link>
                  </Button>
                  <Button asChild variant='outline' className='gap-2 w-full sm:w-auto text-xs sm:text-sm h-10 px-5'>
                    <Link href='/doa'>
                      Permohonan Doa
                    </Link>
                  </Button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* ── Dynamic Database Connected Footer ─────────────────────── */}
      <PublicFooter />
    </div>
  )
}
