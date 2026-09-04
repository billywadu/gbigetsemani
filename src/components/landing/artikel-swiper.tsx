'use client'

import React from 'react'
import Link from 'next/link'
import { BookOpen, User, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination as SwiperPagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { ArtikelDTO } from '@/actions/artikel'

interface ArtikelSwiperProps {
  items: ArtikelDTO[]
}

export function ArtikelSwiper({ items }: ArtikelSwiperProps) {
  if (!items || items.length === 0) {
    return (
      <div className='text-center py-12 bg-card rounded-xl border p-6'>
        <BookOpen className='size-8 text-muted-foreground mx-auto mb-2 opacity-50' />
        <div className='font-semibold text-sm text-foreground'>Belum Ada Artikel yang Dipublikasikan</div>
        <p className='text-xs text-muted-foreground mt-1'>Nantikan update artikel dan renungan rohani terbaru segera.</p>
      </div>
    )
  }

  return (
    <div className='w-full'>
      <Swiper
        modules={[SwiperPagination]}
        pagination={{ clickable: true }}
        spaceBetween={16}
        slidesPerView={1.15}
        breakpoints={{
          640: { slidesPerView: 2, spaceBetween: 16 },
          1024: { slidesPerView: 3, spaceBetween: 20 },
        }}
        className='kpi-swiper pb-8! sm:pb-0!'
      >
        {items.map((artikel) => {
          const docDate = new Date(artikel.tanggal)
          return (
            <SwiperSlide key={artikel.id} className='h-auto! flex'>
              <Link href={`/artikel/${artikel.slug}`} className='w-full h-full flex flex-col group'>
                <Card className='shadow-xs bg-card overflow-hidden group-hover:border-primary/50 group-hover:shadow-md transition-all flex flex-col justify-between w-full h-full border rounded-xl'>
                  {/* Top Section: Thumbnail & Header Details */}
                  <div className='flex-1 flex flex-col'>
                    {artikel.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artikel.thumbnailUrl}
                        alt={artikel.judul}
                        className='w-full aspect-video object-cover border-b group-hover:scale-102 transition-transform duration-300'
                      />
                    ) : (
                      <div className='w-full aspect-video bg-muted/60 flex items-center justify-center text-muted-foreground border-b'>
                        <BookOpen className='size-8 opacity-40' />
                      </div>
                    )}

                    <CardHeader className='p-4 pb-3 space-y-2 flex-1 flex flex-col justify-between'>
                      <div className='space-y-2'>
                        <div className='flex items-center justify-between gap-2'>
                          <Badge variant='outline' className='text-[10px] font-medium'>
                            {artikel.kategoriNama}
                          </Badge>
                          <span className='text-[11px] text-muted-foreground font-mono shrink-0'>
                            {docDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <CardTitle className='text-sm font-bold leading-snug line-clamp-2 min-h-10 text-foreground group-hover:text-primary transition-colors'>
                          {artikel.judul}
                        </CardTitle>
                      </div>

                      <CardDescription className='text-xs line-clamp-2 leading-relaxed min-h-9 text-muted-foreground pt-1'>
                        {artikel.ringkasan}
                      </CardDescription>
                    </CardHeader>
                  </div>

                  {/* Bottom Section: Author & Views Footer */}
                  <CardContent className='px-4 py-3 border-t bg-muted/10 flex items-center justify-between gap-3 text-xs text-muted-foreground mt-auto'>
                    <div className='flex items-center gap-1.5 font-medium text-foreground min-w-0 flex-1'>
                      <User className='size-3.5 text-primary shrink-0' />
                      <span className='truncate text-xs'>{artikel.penulis}</span>
                    </div>
                    <div className='flex items-center gap-1 text-[11px] font-mono text-muted-foreground shrink-0 ps-1' title={`${artikel.totalDilihat} kali dibaca`}>
                      <Eye className='size-3.5 text-muted-foreground/80' />
                      <span>{artikel.totalDilihat}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </SwiperSlide>
          )
        })}
      </Swiper>
    </div>
  )
}
