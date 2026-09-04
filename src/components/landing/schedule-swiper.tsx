'use client'

import React from 'react'
import { Clock, MapPin, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination as SwiperPagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { ScheduleItem } from '@/lib/validations/landing-page'

interface ScheduleSwiperProps {
  items: ScheduleItem[]
}

function ScheduleCard({ ibadah }: { ibadah: ScheduleItem }) {
  return (
    <Card className='shadow-xs bg-card p-5 flex flex-col justify-between w-full h-full border hover:border-primary/50 transition-all rounded-2xl'>
      {/* Top Section: Time Badge, Title & Location */}
      <div className='space-y-3'>
        <Badge
          variant='outline'
          className='px-2.5 py-1 text-xs font-mono font-semibold bg-primary/10 text-primary border-primary/20 gap-1.5 inline-flex items-center rounded-lg'
        >
          <Clock className='size-3.5 text-primary shrink-0' />
          <span>{ibadah.hari}, {ibadah.jam}</span>
        </Badge>

        <div>
          <h3 className='font-bold text-base text-foreground leading-snug line-clamp-1'>
            {ibadah.nama}
          </h3>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-1.5'>
            <MapPin className='size-3.5 text-primary/80 shrink-0' />
            <span className='truncate'>{ibadah.lokasi}</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Description Note */}
      {ibadah.deskripsi && (
        <div className='pt-3 mt-3 border-t border-border/50'>
          <p className='text-xs text-muted-foreground leading-relaxed line-clamp-2'>
            {ibadah.deskripsi}
          </p>
        </div>
      )}
    </Card>
  )
}

export function ScheduleSwiper({ items }: ScheduleSwiperProps) {
  if (!items || items.length === 0) {
    return (
      <div className='text-center py-10 bg-card rounded-xl border p-6 text-muted-foreground text-xs'>
        <Calendar className='size-8 text-muted-foreground mx-auto mb-2 opacity-50' />
        <div className='font-semibold text-sm text-foreground'>Belum Ada Jadwal Ibadah</div>
        <p className='text-xs text-muted-foreground mt-1'>Jadwal sesi ibadah akan segera diperbarui.</p>
      </div>
    )
  }

  return (
    <div className='w-full'>
      {/* Mobile: Touch Swiper Carousel */}
      <div className='block md:hidden'>
        <Swiper
          modules={[SwiperPagination]}
          pagination={{ clickable: true }}
          spaceBetween={16}
          slidesPerView={1.15}
          className='kpi-swiper pb-8!'
        >
          {items.map((ibadah, idx) => (
            <SwiperSlide key={ibadah.id || idx} className='h-auto! flex'>
              <ScheduleCard ibadah={ibadah} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Desktop / Tablet (>= md): Clean 2-Column Grid */}
      <div className='hidden md:grid md:grid-cols-2 gap-4'>
        {items.map((ibadah, idx) => (
          <ScheduleCard key={ibadah.id || idx} ibadah={ibadah} />
        ))}
      </div>
    </div>
  )
}
