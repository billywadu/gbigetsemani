import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  User,
  Eye,
  ChevronRight,
  List,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { prisma } from '@/lib/prisma'
import { getPublicArtikelBySlugAction, incrementArtikelViewAction } from '@/actions/artikel'
import { sanitizeAndFormatArticleHtml, stripHtmlAndTruncate } from '@/lib/sanitizer'
import { ArtikelShareButtons } from './share-buttons'
import { getAppProfileAction } from '@/actions/app-profile'
import { DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'

interface ArtikelPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ArtikelPageProps): Promise<Metadata> {
  const { slug } = await params
  const [artikel, profileRes] = await Promise.all([
    prisma.artikel.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      include: { kategori: true },
    }),
    getAppProfileAction(),
  ])

  const profile = profileRes.data || DEFAULT_APP_PROFILE_CONFIG

  if (!artikel) {
    return {
      title: {
        absolute: `Artikel Tidak Ditemukan | ${profile.namaSingkat}`,
      },
      description: 'Artikel atau renungan rohani tidak ditemukan atau belum dipublikasikan.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const cleanTitle = artikel.judul.trim()
  const cleanDescription =
    stripHtmlAndTruncate(artikel.ringkasan, 160) ||
    stripHtmlAndTruncate(artikel.konten, 160) ||
    `${cleanTitle} — Artikel dan renungan rohani jemaat ${profile.namaSingkat}.`

  const baseUrl =
    profile.website && profile.website.startsWith('http')
      ? profile.website
      : process.env.NEXT_PUBLIC_APP_URL || 'https://gereja.org'

  const rawImage = artikel.thumbnailUrl || profile.logoUrl || '/logo.png'
  const absoluteImageUrl = rawImage.startsWith('http')
    ? rawImage
    : `${baseUrl.replace(/\/$/, '')}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`

  const canonicalPath = `/artikel/${slug}`
  const absoluteCanonicalUrl = `${baseUrl.replace(/\/$/, '')}${canonicalPath}`

  return {
    title: {
      absolute: `${cleanTitle} | ${profile.namaSingkat}`,
    },
    description: cleanDescription,
    alternates: {
      canonical: canonicalPath,
    },
    authors: [{ name: artikel.penulis, url: baseUrl }],
    creator: artikel.penulis,
    publisher: profile.namaResmi,
    openGraph: {
      type: 'article',
      locale: 'id_ID',
      url: canonicalPath,
      siteName: profile.namaResmi || profile.namaSingkat,
      title: `${cleanTitle} — ${profile.namaSingkat}`,
      description: cleanDescription,
      publishedTime: artikel.tanggal.toISOString(),
      modifiedTime: artikel.updatedAt ? artikel.updatedAt.toISOString() : artikel.tanggal.toISOString(),
      authors: [artikel.penulis],
      section: artikel.kategori?.nama || 'Renungan',
      tags: [artikel.kategori?.nama, profile.namaSingkat, 'Artikel Rohani', 'Renungan Kristen'].filter(
        Boolean
      ) as string[],
      images: [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: cleanTitle,
          type: 'image/jpeg',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${cleanTitle} — ${profile.namaSingkat}`,
      description: cleanDescription,
      images: [absoluteImageUrl],
      creator: artikel.penulis,
    },
  }
}


export default async function ArtikelPublicDetailPage({ params }: ArtikelPageProps) {
  const { slug } = await params
  const [res, profileRes] = await Promise.all([
    getPublicArtikelBySlugAction(slug),
    getAppProfileAction(),
  ])

  if (!res.success || !res.data) {
    notFound()
  }

  // Increment view counter safely (non-blocking)
  incrementArtikelViewAction(slug).catch(() => {})

  const profile = profileRes.data || DEFAULT_APP_PROFILE_CONFIG
  const artikel = res.data
  const docDate = new Date(artikel.tanggal)

  // 1. Sanitize HTML & extract Table of Contents headings
  const { sanitizedHtml, headings } = sanitizeAndFormatArticleHtml(artikel.konten)

  return (
    <div className='min-h-svh bg-background text-foreground flex flex-col'>
      {/* Official Public Navigation Header */}
      <PublicHeader initialProfile={profile} />

      {/* Main Container */}
      <main className='flex-1 py-8 px-4'>
        <div className='max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8'>
          {/* Main Article Content (3 Cols) */}
          <article className='lg:col-span-3 space-y-6'>
            {/* Breadcrumbs */}
            <nav className='flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap'>
              <Link href='/' className='hover:underline hover:text-foreground'>
                Beranda
              </Link>
              <ChevronRight className='size-3 text-muted-foreground/60' />
              <Link href='/artikel' className='hover:underline hover:text-foreground'>
                Artikel & Renungan
              </Link>
              <ChevronRight className='size-3 text-muted-foreground/60' />
              <Link href={`/artikel?kategori=${artikel.kategoriSlug}`} className='hover:underline text-foreground'>
                <Badge variant='outline' className='text-[10px] font-normal py-0 hover:bg-muted'>
                  {artikel.kategoriNama}
                </Badge>
              </Link>
            </nav>

            {/* Article Header */}
            <div className='space-y-4 border-b pb-6'>
              <Badge className='bg-primary/15 text-primary border-primary/30 text-xs px-2.5 py-0.5 font-semibold'>
                {artikel.kategoriNama}
              </Badge>

              <h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-foreground font-serif'>
                {artikel.judul}
              </h1>

              {/* Author, Date & Views Meta */}
              <div className='flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground pt-2'>
                <div className='flex flex-wrap items-center gap-4'>
                  <div className='flex items-center gap-1.5 font-medium text-foreground'>
                    <User className='size-3.5 text-primary' />
                    <span>{artikel.penulis}</span>
                  </div>
                  <div className='flex items-center gap-1.5 font-mono'>
                    <Calendar className='size-3.5 text-muted-foreground' />
                    <span>
                      {docDate.toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className='flex items-center gap-1.5 font-mono text-primary'>
                    <Eye className='size-3.5' />
                    <span>{artikel.totalDilihat.toLocaleString('id-ID')} views</span>
                  </div>
                </div>

                {/* Share Component */}
                <ArtikelShareButtons title={artikel.judul} churchName={profile.namaSingkat} />
              </div>
            </div>

            {/* Mobile Table of Contents Accordion */}
            {headings.length > 0 && (
              <div className='block lg:hidden'>
                <Collapsible className='border rounded-xl bg-card p-3 shadow-xs'>
                  <CollapsibleTrigger asChild>
                    <Button variant='ghost' size='sm' className='w-full justify-between text-xs font-semibold p-1'>
                      <span className='flex items-center gap-2'>
                        <List className='size-3.5 text-primary' /> Daftar Isi Artikel ({headings.length})
                      </span>
                      <span className='text-muted-foreground text-[11px] font-normal'>Buka / Tutup</span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className='pt-3 space-y-1.5 border-t mt-2 text-xs'>
                    {headings.map((h, idx) => (
                      <a
                        key={h.id}
                        href={`#${h.id}`}
                        className={`block py-1 hover:text-primary transition-colors text-muted-foreground ${
                          h.level === 3 ? 'pl-4 text-[11px]' : 'font-medium'
                        }`}
                      >
                        {idx + 1}. {h.text}
                      </a>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Hero Thumbnail */}
            {artikel.thumbnailUrl && (
              <div className='rounded-2xl overflow-hidden border shadow-sm bg-muted/20'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={artikel.thumbnailUrl}
                  alt={artikel.judul}
                  className='w-full max-h-115 object-cover'
                />
              </div>
            )}

            {/* Ringkasan / Lead Box */}
            <div className='p-5 rounded-2xl bg-muted/30 border border-muted-foreground/20 text-foreground/90 font-serif italic text-base leading-relaxed'>
              &ldquo;{artikel.ringkasan}&rdquo;
            </div>

            {/* Sanitized Rich HTML Content */}
            <div
              className='prose dark:prose-invert max-w-none text-base leading-relaxed space-y-4 font-sans text-foreground/95'
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />

            {/* Footer Blessings Card */}
            <div className='mt-12 pt-6 border-t'>
              <Card className='shadow-xs bg-muted/20 border-dashed'>
                <CardContent className='p-6 text-center space-y-3'>
                  <div className='p-2 bg-primary/10 rounded-full w-fit mx-auto text-primary'>
                    <BookOpen className='size-6' />
                  </div>
                  <h4 className='font-bold text-sm text-foreground'>{profile.namaSingkat}</h4>
                  <p className='text-xs text-muted-foreground max-w-md mx-auto'>
                    Diberkati dengan firman Tuhan dan artikel ini? Bagikan kepada keluarga, rekan komsel, dan sahabat Anda untuk saling menguatkan iman.
                  </p>
                  <div className='pt-2'>
                    <ArtikelShareButtons title={artikel.judul} churchName={profile.namaSingkat} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </article>

          {/* Desktop Table of Contents Sidebar (1 Col) */}
          <aside className='hidden lg:block'>
            <div className='sticky top-20 space-y-4'>
              {headings.length > 0 && (
                <Card className='shadow-xs bg-card'>
                  <CardContent className='p-4 space-y-3'>
                    <div className='font-bold text-xs flex items-center gap-1.5 text-foreground'>
                      <List className='size-4 text-primary' /> Daftar Isi Artikel
                    </div>
                    <nav className='space-y-1.5 text-xs text-muted-foreground max-h-105 overflow-y-auto pr-1'>
                      {headings.map((h, idx) => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          className={`block py-1 hover:text-primary transition-colors ${
                            h.level === 3 ? 'pl-3 text-[11px] border-l' : 'font-medium'
                          }`}
                        >
                          {idx + 1}. {h.text}
                        </a>
                      ))}
                    </nav>
                  </CardContent>
                </Card>
              )}

              {/* Service Quick Links Card */}
              <Card className='shadow-xs bg-card'>
                <CardContent className='p-4 space-y-2 text-xs'>
                  <div className='font-bold text-foreground'>Layanan Publik Gereja</div>
                  <div className='space-y-1 pt-1'>
                    <Link href='/daftar' className='block text-muted-foreground hover:text-primary'>
                      • Pendaftaran Mandiri Jemaat
                    </Link>
                    <Link href='/profil-jemaat' className='block text-muted-foreground hover:text-primary'>
                      • Verifikasi NIJ Keanggotaan
                    </Link>
                    <Link href='/scan/live' className='block text-muted-foreground hover:text-primary'>
                      • Presensi Scan QR Code
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </main>

      {/* Public Footer */}
      <PublicFooter initialProfile={profile} />
    </div>
  )
}
