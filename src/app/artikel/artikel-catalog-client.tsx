'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  BookOpen,
  Calendar,
  User,
  Eye,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Tag,
  Sparkles,
  Loader2,
  FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getPublicArtikelCatalogAction, ArtikelDTO } from '@/actions/artikel'
import { getAppProfileAction } from '@/actions/app-profile'
import { AppProfileConfig, DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'

interface ArtikelCatalogClientProps {
  initialProfile?: AppProfileConfig
}

export function ArtikelCatalogClient({ initialProfile }: ArtikelCatalogClientProps) {
  const [profile, setProfile] = useState<AppProfileConfig>(initialProfile || DEFAULT_APP_PROFILE_CONFIG)
  const [loading, setLoading] = useState(true)
  const [articles, setArticles] = useState<ArtikelDTO[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; nama: string; slug: string; totalArtikel: number }>>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalPublishedAll, setTotalPublishedAll] = useState(0)

  // Filters & State
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 9

  // Initial church profile fetch if not provided
  useEffect(() => {
    if (!initialProfile) {
      getAppProfileAction().then((res) => {
        if (res.success && res.data) {
          setProfile(res.data)
        }
      })
    }
  }, [initialProfile])

  // Fetch artikel items
  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPublicArtikelCatalogAction({
        kategoriSlug: selectedCategorySlug === 'all' ? undefined : selectedCategorySlug,
        search: searchTerm.trim() || undefined,
        page: currentPage,
        pageSize,
      })

      if (res.success && res.data) {
        setArticles(res.data.items)
        setTotalItems(res.data.total)
        setTotalPages(res.data.totalPages)
        setCategories(res.data.categories)
        setTotalPublishedAll(res.data.totalPublishedAll)
      }
    } catch (err) {
      console.error('Error fetching articles:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedCategorySlug, searchTerm, currentPage])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  const churchName = profile?.namaResmi || profile?.namaSingkat || 'Gereja'

  return (
    <div className='dark min-h-screen bg-linear-to-b from-background via-muted/20 to-background text-foreground flex flex-col'>
      {/* Official Public Navigation Bar */}
      <PublicHeader initialProfile={profile} />

      {/* Hero Banner */}
      <section className='relative py-12 sm:py-16 bg-radial from-primary/10 via-transparent to-transparent border-b overflow-hidden'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4'>
          <Badge variant='outline' className='px-3 py-1 text-xs gap-1.5 bg-background/60 backdrop-blur-sm border-primary/30 text-primary'>
            <Sparkles className='size-3 text-primary animate-pulse' /> Firman, Inspirasi & Warta
          </Badge>
          <h1 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground'>
            Artikel & Renungan Rohani
          </h1>
          <p className='text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed'>
            Diberkati dan bertumbuh dalam pengenalan akan Tuhan melalui kumpulan artikel rohani, renungan firman, dan warta jemaat {churchName}.
          </p>

          {/* Search Box in Hero */}
          <div className='pt-2 max-w-xl mx-auto'>
            <div className='relative shadow-md rounded-xl overflow-hidden'>
              <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
              <Input
                placeholder='Cari judul artikel, penulis, atau kata kunci firman...'
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className='ps-11 pe-4 h-12 text-sm bg-background border-border/80 focus-visible:ring-primary rounded-xl'
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className='flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8'>
        {/* Category Pills Bar */}
        <div className='flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none'>
          <Button
            size='sm'
            variant={selectedCategorySlug === 'all' ? 'default' : 'outline'}
            onClick={() => {
              setSelectedCategorySlug('all')
              setCurrentPage(1)
            }}
            className='rounded-full text-xs shrink-0 gap-1.5'
          >
            Semua Topik
            <Badge
              variant={selectedCategorySlug === 'all' ? 'secondary' : 'outline'}
              className='ms-1 px-1.5 py-0 text-[10px] h-4.5 rounded-full'
            >
              {totalPublishedAll}
            </Badge>
          </Button>

          {categories.map((cat) => {
            const isSelected = selectedCategorySlug === cat.slug
            return (
              <Button
                key={cat.id}
                size='sm'
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedCategorySlug(cat.slug)
                  setCurrentPage(1)
                }}
                className='rounded-full text-xs shrink-0 gap-1.5'
              >
                <Tag className='size-3' />
                {cat.nama}
                <Badge
                  variant={isSelected ? 'secondary' : 'outline'}
                  className='ms-1 px-1.5 py-0 text-[10px] h-4.5 rounded-full'
                >
                  {cat.totalArtikel}
                </Badge>
              </Button>
            )
          })}
        </div>

        {/* Status Bar */}
        <div className='flex items-center justify-between text-xs text-muted-foreground border-b pb-3'>
          <div>
            Menampilkan <strong className='text-foreground'>{articles.length}</strong> dari{' '}
            <strong className='text-foreground'>{totalItems}</strong> artikel
            {selectedCategorySlug !== 'all' && (
              <span> dalam kategori <strong className='text-primary'>{categories.find(c => c.slug === selectedCategorySlug)?.nama}</strong></span>
            )}
          </div>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('')
                setCurrentPage(1)
              }}
              className='text-primary hover:underline font-medium'
            >
              Reset Pencarian
            </button>
          )}
        </div>

        {/* Artikel Cards Grid */}
        {loading ? (
          <div className='py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground'>
            <Loader2 className='size-8 animate-spin text-primary' />
            <p className='text-sm'>Memuat artikel...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className='py-20 text-center space-y-4 max-w-md mx-auto'>
            <div className='size-14 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground'>
              <FolderOpen className='size-7' />
            </div>
            <div className='space-y-1'>
              <h3 className='text-base font-bold text-foreground'>Tidak Ada Artikel Ditemukan</h3>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                {searchTerm
                  ? `Tidak ada artikel yang cocok dengan kata kunci "${searchTerm}". Silakan coba kata kunci lain.`
                  : 'Belum ada artikel yang dipublikasikan dalam kategori ini.'}
              </p>
            </div>
            {(searchTerm || selectedCategorySlug !== 'all') && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategorySlug('all')
                  setCurrentPage(1)
                }}
                className='text-xs'
              >
                Tampilkan Semua Artikel
              </Button>
            )}
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {articles.map((item) => {
              const formattedDate = new Date(item.tanggal).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })

              return (
                <Link
                  key={item.id}
                  href={`/artikel/${item.slug}`}
                  className='group flex flex-col h-full'
                >
                  <Card className='flex flex-col h-full overflow-hidden border-border/80 group-hover:border-primary/50 transition-all duration-300 group-hover:shadow-lg bg-card rounded-xl'>
                    {/* Thumbnail Image / Fallback Header */}
                    <div className='block relative aspect-video overflow-hidden bg-muted'>
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt={item.judul}
                          fill
                          sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                          className='object-cover group-hover:scale-105 transition-transform duration-500'
                        />
                      ) : (
                        <div className='absolute inset-0 bg-linear-to-br from-primary/20 via-primary/5 to-muted flex items-center justify-center text-primary/40 group-hover:text-primary/60 transition-colors'>
                          <BookOpen className='size-14 stroke-1' />
                        </div>
                      )}
                      {/* Category Overlay Badge */}
                      <div className='absolute top-3 left-3'>
                        <Badge className='bg-background/90 backdrop-blur-md text-foreground group-hover:bg-background border-none shadow-xs text-[11px] font-medium'>
                          {item.kategoriNama}
                        </Badge>
                      </div>
                    </div>

                    {/* Card Body */}
                    <CardContent className='p-5 flex-1 flex flex-col justify-between space-y-4'>
                      <div className='space-y-2.5'>
                        {/* Meta info: Date & Views */}
                        <div className='flex items-center justify-between text-[11px] text-muted-foreground gap-2'>
                          <div className='flex items-center gap-1.5 truncate'>
                            <Calendar className='size-3.5 text-primary shrink-0' />
                            <span className='truncate'>{formattedDate}</span>
                          </div>
                          <div className='flex items-center gap-1 text-muted-foreground shrink-0' title='Jumlah Dibaca'>
                            <Eye className='size-3.5' />
                            <span>{item.totalDilihat}</span>
                          </div>
                        </div>

                        {/* Title */}
                        <h2 className='font-bold text-base sm:text-lg leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2'>
                          {item.judul}
                        </h2>

                        {/* Penulis */}
                        <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                          <User className='size-3.5 text-muted-foreground/70 shrink-0' />
                          <span className='truncate font-medium text-foreground/80'>{item.penulis}</span>
                        </div>

                        {/* Ringkasan */}
                        <p className='text-xs text-muted-foreground line-clamp-3 leading-relaxed'>
                          {item.ringkasan}
                        </p>
                      </div>

                      {/* Bottom CTA Link */}
                      <div className='pt-2 border-t flex items-center justify-between'>
                        <span className='text-xs font-semibold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform'>
                          Baca Artikel <ArrowRight className='size-3.5' />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className='flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t'>
            <span className='text-xs text-muted-foreground text-center sm:text-left'>
              Menampilkan halaman <strong className='text-foreground'>{currentPage}</strong> dari{' '}
              <strong className='text-foreground'>{totalPages}</strong> ({totalItems} total artikel)
            </span>
            <div className='flex items-center gap-1.5 flex-wrap justify-center'>
              <Button
                variant='outline'
                size='sm'
                disabled={currentPage <= 1 || loading}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className='text-xs gap-1 h-8 px-2.5'
              >
                <ChevronLeft className='size-3.5' /> Sebelumnya
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((pageNum, idx, arr) => {
                  const prev = arr[idx - 1]
                  return (
                    <React.Fragment key={pageNum}>
                      {prev && pageNum - prev > 1 && (
                        <span className='text-xs text-muted-foreground px-1 select-none'>...</span>
                      )}
                      <Button
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => {
                          setCurrentPage(pageNum)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className='size-8 p-0 text-xs font-semibold'
                      >
                        {pageNum}
                      </Button>
                    </React.Fragment>
                  )
                })}

              <Button
                variant='outline'
                size='sm'
                disabled={currentPage >= totalPages || loading}
                onClick={() => {
                  setCurrentPage((p) => p + 1)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className='text-xs gap-1 h-8 px-2.5'
              >
                Berikutnya <ChevronRight className='size-3.5' />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Public Footer */}
      <PublicFooter initialProfile={profile} />
    </div>
  )
}
