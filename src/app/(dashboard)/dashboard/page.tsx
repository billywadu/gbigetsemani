'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  UserCheck,
  CalendarCheck,
  Wallet,
  Calendar as CalendarIcon,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  Cake,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import {
  getDashboardOverviewAction,
  DashboardOverviewDTO,
  BirthdayItemDTO,
} from '@/actions/dashboard'
import { getWhatsAppTemplatesAction } from '@/actions/whatsapp-template'
import { formatWhatsAppMessage, openWhatsAppChat } from '@/lib/whatsapp-helpers'
import { DEFAULT_WHATSAPP_TEMPLATES_CONFIG, WhatsAppTemplatesConfig } from '@/lib/validations/whatsapp-template'
import { getAppProfileAction } from '@/actions/app-profile'
import { toast } from 'sonner'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardOverviewDTO | null>(null)
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplatesConfig>(DEFAULT_WHATSAPP_TEMPLATES_CONFIG)
  const [churchName, setChurchName] = useState('Gereja')

  // Filter States
  const [timeRange, setTimeRange] = useState<'6_BULAN' | '1_TAHUN' | '2_TAHUN' | 'SEMUA'>('1_TAHUN')
  const [birthdayTab, setBirthdayTab] = useState<'HARI_INI' | 'MINGGU_INI' | 'BULAN_INI'>('HARI_INI')
  const [monthOffset, setMonthOffset] = useState<number>(0)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [financialPeriod, setFinancialPeriod] = useState<'BULAN_INI' | 'BULAN_LALU' | 'TAHUN_INI' | 'SEMUA'>('BULAN_INI')
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    getWhatsAppTemplatesAction().then((res) => {
      if (res.success && res.data) setWaTemplates(res.data)
    })
    getAppProfileAction().then((res) => {
      if (res.success && res.data) {
        setChurchName(res.data.namaSingkat || res.data.namaResmi || 'Gereja')
      }
    })
  }, [])

  const fetchData = useCallback(async (
    range: '6_BULAN' | '1_TAHUN' | '2_TAHUN' | 'SEMUA',
    offset: number,
    finPeriod: 'BULAN_INI' | 'BULAN_LALU' | 'TAHUN_INI' | 'SEMUA'
  ) => {
    setLoading(true)
    const res = await getDashboardOverviewAction(range, offset, finPeriod)
    if (res.success && res.data) {
      setData(res.data)
    } else {
      toast.error('Gagal memuat data dashboard.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData(timeRange, monthOffset, financialPeriod)
  }, [fetchData, timeRange, monthOffset, financialPeriod])

  const handleWhatsAppClick = (phone: string, name: string, age: number) => {
    if (!phone) {
      toast.error(`Nomor WhatsApp untuk ${name} belum terdaftar.`)
      return
    }
    const template = waTemplates.ULTAH_JEMAAT || DEFAULT_WHATSAPP_TEMPLATES_CONFIG.ULTAH_JEMAAT
    const msg = formatWhatsAppMessage(template, {
      nama: name,
      umur: age,
      namaGereja: churchName,
      ayatAlkitab: 'Mazmur 90:12',
    })
    const opened = openWhatsAppChat(phone, msg)
    if (!opened) {
      toast.error(`Format nomor WhatsApp untuk ${name} tidak valid.`)
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const formatCompactIDR = (val: number) => {
    if (Math.abs(val) >= 1_000_000_000) {
      return `Rp ${(val / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
    }
    if (Math.abs(val) >= 1_000_000) {
      return `Rp ${(val / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`
    }
    if (Math.abs(val) >= 1_000) {
      return `Rp ${(val / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Rb`
    }
    return formatIDR(val)
  }

  // Active birthday list based on tab
  const currentBirthdays: BirthdayItemDTO[] = React.useMemo(() => {
    if (!data?.birthdays) return []
    if (birthdayTab === 'HARI_INI') return data.birthdays.today
    if (birthdayTab === 'MINGGU_INI') return data.birthdays.thisWeek
    return data.birthdays.thisMonth
  }, [data, birthdayTab])

  // Calendar Day Generation
  const calendarGrid = React.useMemo(() => {
    const now = new Date()
    const currentTarget = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    const year = currentTarget.getFullYear()
    const month = currentTarget.getMonth()

    const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Min, 1 = Sen, etc.
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days: { day: number; isCurrentMonth: boolean }[] = []

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true })
    }

    // Next month padding to fill grid
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false })
    }

    return days
  }, [monthOffset])

  // Filtered Events for Calendar
  const filteredEvents = React.useMemo(() => {
    if (!data?.calendar?.events) return []
    if (selectedDay === null) return data.calendar.events
    return data.calendar.events.filter((e) => e.day === selectedDay)
  }, [data, selectedDay])

  if (loading && !data) {
    return (
      <div className='flex items-center justify-center min-h-125 text-muted-foreground gap-2 text-sm'>
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat ringkasan eksekutif dashboard...
      </div>
    )
  }

  const kpi = data?.kpi || {
    totalJemaat: 1248,
    growthCount: 18,
    activeJemaat: 986,
    activePercentage: '79,0%',
    saldoKas: 126450000,
    lastAttendance: 432,
    lastAttendanceDate: 'Minggu, 11 Mei 2025',
  }

  return (
    <div className='space-y-6 pb-12 font-sans'>
      {/* ============================================================ */}
      {/* 1. TOP ROW: 4 KPI METRIC CARDS (SWIPER.JS)                    */}
      {/* ============================================================ */}
      <div className='w-full'>
        <Swiper
          modules={[Pagination]}
          spaceBetween={12}
          slidesPerView={1}
          pagination={{
            clickable: true,
            bulletClass: 'swiper-pagination-bullet !bg-primary/30 !opacity-100 !w-2 !h-2 !transition-all',
            bulletActiveClass: '!bg-primary !w-6 !rounded-full',
          }}
          breakpoints={{
            640: {
              slidesPerView: 2,
              spaceBetween: 16,
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 16,
            },
          }}
          className='kpi-swiper pb-7! sm:pb-0!'
        >
          {/* KPI 1: Total Jemaat */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs border border-border/70 hover:shadow-sm transition-all bg-card h-full'>
              <CardContent className='p-4 flex items-center gap-4'>
                <div className='rounded-full bg-purple-100 dark:bg-purple-950/50 p-3 text-purple-600 dark:text-purple-400 shrink-0'>
                  <Users className='size-6' />
                </div>
                <div className='space-y-0.5 flex-1 min-w-0'>
                  <div className='text-xs font-medium text-muted-foreground'>Total Jemaat</div>
                  <div className='flex items-center gap-2'>
                    <span className='text-2xl font-bold tracking-tight font-mono text-foreground'>
                      {kpi.totalJemaat.toLocaleString('id-ID')}
                    </span>
                    <span className='text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-mono'>
                      ↑ {kpi.growthCount}
                    </span>
                  </div>
                  <div className='text-[11px] text-muted-foreground'>Dibanding bulan lalu</div>
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          {/* KPI 2: Jemaat Aktif */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs border border-border/70 hover:shadow-sm transition-all bg-card h-full'>
              <CardContent className='p-4 flex items-center gap-4'>
                <div className='rounded-full bg-emerald-100 dark:bg-emerald-950/50 p-3 text-emerald-600 dark:text-emerald-400 shrink-0'>
                  <UserCheck className='size-6' />
                </div>
                <div className='space-y-0.5 flex-1 min-w-0'>
                  <div className='text-xs font-medium text-muted-foreground'>Jemaat Aktif</div>
                  <div className='flex items-baseline gap-2'>
                    <span className='text-2xl font-bold tracking-tight font-mono text-foreground'>
                      {kpi.activeJemaat.toLocaleString('id-ID')}
                    </span>
                    <span className='text-xs text-muted-foreground font-mono font-medium'>
                      {kpi.activePercentage}
                    </span>
                  </div>
                  <div className='text-[11px] text-muted-foreground'>Dari total jemaat</div>
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          {/* KPI 3: Saldo Kas */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs border border-border/70 hover:shadow-sm transition-all bg-card h-full'>
              <CardContent className='p-4 flex items-center gap-4'>
                <div className='rounded-full bg-blue-100 dark:bg-blue-950/50 p-3 text-blue-600 dark:text-blue-400 shrink-0'>
                  <Wallet className='size-6' />
                </div>
                <div className='space-y-0.5 flex-1 min-w-0'>
                  <div className='text-xs font-medium text-muted-foreground'>Saldo Kas</div>
                  <div className='text-xl sm:text-2xl font-bold tracking-tight font-mono text-foreground truncate'>
                    {formatIDR(kpi.saldoKas)}
                  </div>
                  <div className='text-[11px] text-muted-foreground'>
                    {data?.calendar?.monthName ? `Per ${data.calendar.monthName}` : 'Per Bulan Berjalan'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          {/* KPI 4: Hadir Terakhir */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs border border-border/70 hover:shadow-sm transition-all bg-card h-full'>
              <CardContent className='p-4 flex items-center gap-4'>
                <div className='rounded-full bg-amber-100 dark:bg-amber-950/50 p-3 text-amber-600 dark:text-amber-400 shrink-0'>
                  <CalendarCheck className='size-6' />
                </div>
                <div className='space-y-0.5 flex-1 min-w-0'>
                  <div className='text-xs font-medium text-muted-foreground'>Hadir Terakhir</div>
                  <div className='text-2xl font-bold tracking-tight font-mono text-foreground'>
                    {kpi.lastAttendance}
                  </div>
                  <div className='text-[11px] text-muted-foreground truncate'>
                    {kpi.lastAttendanceDate}
                  </div>
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>
        </Swiper>
      </div>

      {/* ============================================================ */}
      {/* 2. MIDDLE ROW: 3 COLUMNS (CHART ~55%, BDAY ~22%, CAL ~23%)   */}
      {/* ============================================================ */}
      <div className='grid gap-5 grid-cols-1 lg:grid-cols-12'>
        {/* 2.1 Area Chart: Pertumbuhan Jemaat */}
        <Card className='shadow-xs border border-border/70 lg:col-span-6 xl:col-span-6 bg-card flex flex-col justify-between'>
          <CardHeader className='pb-2 pt-4 px-4 sm:px-5 space-y-2.5'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5'>
              <div className='flex items-center gap-1.5 min-w-0'>
                <CardTitle className='text-sm sm:text-base font-bold text-foreground'>
                  Pertumbuhan Jemaat
                </CardTitle>
                <Info className='size-3.5 text-muted-foreground shrink-0 cursor-pointer hover:text-foreground transition-colors' />
              </div>

              {/* Time Range Filter Buttons */}
              <div className='flex items-center justify-between sm:justify-end gap-1 w-full sm:w-auto bg-muted/60 p-1 rounded-lg text-xs'>
                <button
                  onClick={() => setTimeRange('6_BULAN')}
                  className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium text-center whitespace-nowrap transition-all ${
                    timeRange === '6_BULAN'
                      ? 'bg-background shadow-xs text-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className='sm:hidden'>6 Bln</span>
                  <span className='hidden sm:inline'>6 Bulan</span>
                </button>
                <button
                  onClick={() => setTimeRange('1_TAHUN')}
                  className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium text-center whitespace-nowrap transition-all ${
                    timeRange === '1_TAHUN'
                      ? 'bg-background shadow-xs text-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className='sm:hidden'>1 Thn</span>
                  <span className='hidden sm:inline'>1 Tahun</span>
                </button>
                <button
                  onClick={() => setTimeRange('2_TAHUN')}
                  className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium text-center whitespace-nowrap transition-all ${
                    timeRange === '2_TAHUN'
                      ? 'bg-background shadow-xs text-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className='sm:hidden'>2 Thn</span>
                  <span className='hidden sm:inline'>2 Tahun</span>
                </button>
                <button
                  onClick={() => setTimeRange('SEMUA')}
                  className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium text-center whitespace-nowrap transition-all ${
                    timeRange === 'SEMUA'
                      ? 'bg-background shadow-xs text-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Semua
                </button>
                <div className='hidden sm:flex border-s ps-1 pe-0.5 text-muted-foreground'>
                  <CalendarIcon className='size-3.5' />
                </div>
              </div>
            </div>

            {/* Chart Legend */}
            <div className='flex items-center gap-4 sm:gap-6 pt-1 text-xs'>
              <div className='flex items-center gap-1.5 whitespace-nowrap'>
                <div className='size-2.5 rounded-full bg-blue-600 shrink-0' />
                <span className='text-muted-foreground text-[11px] sm:text-xs font-medium'>
                  Kehadiran Mingguan
                </span>
              </div>
              <div className='flex items-center gap-1.5 whitespace-nowrap'>
                <div className='size-2.5 rounded-full bg-emerald-500 shrink-0' />
                <span className='text-muted-foreground text-[11px] sm:text-xs font-medium'>
                  Pertumbuhan Jemaat
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className='px-3 sm:px-5 pt-1 pb-4'>
            <div className='h-55 sm:h-70 w-full'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart
                  data={data?.chartData || []}
                  margin={
                    isMobile
                      ? { top: 10, right: 6, left: -14, bottom: 4 }
                      : { top: 12, right: 12, left: 6, bottom: 8 }
                  }
                >
                  <defs>
                    <linearGradient id='colorKehadiran' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#2563eb' stopOpacity={0.25} />
                      <stop offset='95%' stopColor='#2563eb' stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id='colorPertumbuhan' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#10b981' stopOpacity={0.25} />
                      <stop offset='95%' stopColor='#10b981' stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='hsl(var(--border))' opacity={0.6} />
                  <XAxis
                    dataKey='month'
                    tickLine={false}
                    axisLine={false}
                    interval='preserveStartEnd'
                    minTickGap={20}
                    tickMargin={8}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    yAxisId='left'
                    domain={[0, 'auto']}
                    allowDecimals={false}
                    width={32}
                    tickMargin={4}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(val) => `${val}`}
                  />
                  <YAxis
                    yAxisId='right'
                    orientation='right'
                    domain={[0, 'auto']}
                    allowDecimals={false}
                    width={40}
                    hide={isMobile}
                    tickMargin={4}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(val) => `${val.toLocaleString('id-ID')}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null
                      return (
                        <div className='rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1 z-50'>
                          <div className='font-bold text-foreground'>{label}</div>
                          <div className='flex items-center justify-between gap-4 text-blue-600'>
                            <span>Kehadiran:</span>
                            <span className='font-mono font-bold'>{payload[0]?.value} jemaat</span>
                          </div>
                          <div className='flex items-center justify-between gap-4 text-emerald-600'>
                            <span>Pertumbuhan:</span>
                            <span className='font-mono font-bold'>{payload[1]?.value?.toLocaleString('id-ID')} jemaat</span>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Area
                    yAxisId='left'
                    type='monotone'
                    dataKey='kehadiran'
                    stroke='#2563eb'
                    strokeWidth={2}
                    fillOpacity={1}
                    fill='url(#colorKehadiran)'
                    dot={isMobile ? false : { r: 2.5, fill: '#2563eb', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    yAxisId='right'
                    type='monotone'
                    dataKey='pertumbuhan'
                    stroke='#10b981'
                    strokeWidth={2}
                    fillOpacity={1}
                    fill='url(#colorPertumbuhan)'
                    dot={isMobile ? false : { r: 2.5, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2.2 Ulang Tahun Jemaat */}
        <Card className='shadow-xs border border-border/70 lg:col-span-3 xl:col-span-3 bg-card flex flex-col justify-between'>
          <div>
            <CardHeader className='pb-2 pt-4 px-4'>
              <div className='flex items-center gap-2'>
                <Cake className='size-4 text-primary' />
                <CardTitle className='text-sm font-bold text-foreground'>
                  Ulang Tahun Jemaat
                </CardTitle>
              </div>

              {/* Tabs Hari ini / Minggu ini / Bulan ini */}
              <div className='grid grid-cols-3 gap-1 bg-muted/60 p-0.5 rounded-lg text-xs mt-2'>
                <button
                  onClick={() => setBirthdayTab('HARI_INI')}
                  className={`py-1 rounded-md text-xs font-medium text-center transition-all ${
                    birthdayTab === 'HARI_INI'
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => setBirthdayTab('MINGGU_INI')}
                  className={`py-1 rounded-md text-xs font-medium text-center transition-all ${
                    birthdayTab === 'MINGGU_INI'
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Minggu Ini
                </button>
                <button
                  onClick={() => setBirthdayTab('BULAN_INI')}
                  className={`py-1 rounded-md text-xs font-medium text-center transition-all ${
                    birthdayTab === 'BULAN_INI'
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Bulan Ini
                </button>
              </div>
            </CardHeader>

            <CardContent className='px-4 py-2 space-y-2.5'>
              {currentBirthdays.length > 0 ? (
                currentBirthdays.slice(0, 5).map((item) => (
                  <div key={item.id} className='flex items-center justify-between gap-2 py-0.5'>
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <div
                        className={`size-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${item.bgClass}`}
                      >
                        {item.initial}
                      </div>
                      <div className='min-w-0'>
                        <div className='text-xs font-semibold text-foreground truncate'>
                          {item.nama}
                        </div>
                        <div className='text-[11px] text-muted-foreground'>
                          {item.tanggalLahirStr} • Umur {item.umur} thn
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Action Button */}
                    <button
                      onClick={() => handleWhatsAppClick(item.phone, item.nama, item.umur)}
                      title='Kirim Ucapan WhatsApp'
                      className='size-7 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shrink-0'
                    >
                      <svg className='size-4 fill-current' viewBox='0 0 24 24'>
                        <path d='M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z' />
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <div className='text-center py-6 text-xs text-muted-foreground'>
                  Tidak ada jemaat yang berulang tahun pada periode ini.
                </div>
              )}
            </CardContent>
          </div>

          <div className='border-t px-4 py-2 text-center'>
            <Link
              href='/dashboard/jemaat'
              className='text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1'
            >
              Lihat semua data jemaat <ArrowRight className='size-3' />
            </Link>
          </div>
        </Card>

        {/* 2.3 Kalender Agenda & Event */}
        <Card className='shadow-xs border border-border/70 lg:col-span-3 xl:col-span-3 bg-card flex flex-col justify-between'>
          <div>
            <CardHeader className='pb-2 pt-4 px-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <CalendarIcon className='size-4 text-primary' />
                  <CardTitle className='text-sm font-bold text-foreground'>
                    Kalender Agenda & Event
                  </CardTitle>
                </div>
              </div>

              {/* Mini Month Navigator */}
              <div className='flex items-center justify-between pt-2'>
                <div className='flex items-center gap-1'>
                  <button
                    onClick={() => setMonthOffset((prev) => prev - 1)}
                    title='Bulan Sebelumnya'
                    className='size-6 rounded border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors'
                  >
                    <ChevronLeft className='size-3.5' />
                  </button>
                  <button
                    onClick={() => setMonthOffset((prev) => prev + 1)}
                    title='Bulan Berikutnya'
                    className='size-6 rounded border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors'
                  >
                    <ChevronRight className='size-3.5' />
                  </button>
                  <span className='text-xs font-bold font-sans text-foreground ms-1'>
                    {data?.calendar?.monthName || 'Mei 2025'}
                  </span>
                </div>

                <div className='flex items-center gap-1'>
                  <button
                    onClick={() => {
                      setMonthOffset(0)
                      setSelectedDay(new Date().getDate())
                    }}
                    className='text-[10px] font-medium px-2 py-0.5 border rounded bg-muted/40 hover:bg-muted transition-colors'
                  >
                    Hari ini
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className='px-4 py-1'>
              {/* Mini Month Grid */}
              <div className='grid grid-cols-7 text-center text-[10px] text-muted-foreground font-medium pb-1'>
                <div>Min</div>
                <div>Sen</div>
                <div>Sel</div>
                <div>Rab</div>
                <div>Kam</div>
                <div>Jum</div>
                <div>Sab</div>
              </div>

              <div className='grid grid-cols-7 text-center text-[10px] gap-y-1 font-mono'>
                {calendarGrid.map((cell, idx) => {
                  const hasEvent = cell.isCurrentMonth && (data?.calendar?.eventDates || []).includes(cell.day)
                  const isSelected = cell.isCurrentMonth && selectedDay === cell.day

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (cell.isCurrentMonth) {
                          setSelectedDay((prev) => (prev === cell.day ? null : cell.day))
                        }
                      }}
                      className={`py-0.5 relative transition-all rounded flex flex-col items-center justify-center ${
                        !cell.isCurrentMonth
                          ? 'text-muted-foreground/30'
                          : isSelected
                          ? 'text-white'
                          : 'text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <span
                        className={`size-6 rounded-md flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 font-bold shadow-xs'
                            : ''
                        }`}
                      >
                        {cell.day}
                      </span>
                      {hasEvent && !isSelected && (
                        <span className='size-1 rounded-full bg-amber-500 mt-0.5' />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Event Schedule List Below Calendar with Dynamic Status Header */}
              <div className='mt-3 space-y-2 border-t pt-2 text-[11px]'>
                <div className='flex items-center justify-between text-[10.5px] font-semibold text-muted-foreground pb-0.5'>
                  <span className='flex items-center gap-1 text-foreground/90'>
                    {selectedDay !== null ? (
                      <>
                        <span>Agenda Tgl {selectedDay} {data?.calendar?.monthName?.split(' ')[0] || ''}:</span>
                      </>
                    ) : (
                      <>
                        <span>Agenda Bulan {data?.calendar?.monthName || 'Ini'}:</span>
                      </>
                    )}
                  </span>
                  {selectedDay !== null && (
                    <button
                      type='button'
                      onClick={() => setSelectedDay(null)}
                      className='text-[9.5px] font-medium text-primary hover:underline'
                    >
                      Tampilkan Semua
                    </button>
                  )}
                </div>

                {filteredEvents.length > 0 ? (
                  filteredEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`border-s-2 ${ev.borderClass} ps-2 flex items-center justify-between gap-2`}
                    >
                      <span className='font-semibold text-foreground truncate'>{ev.title}</span>
                      <div className='text-end text-[10px] text-muted-foreground shrink-0 ms-1'>
                        <div>{ev.time}</div>
                        <div className='text-muted-foreground/70 line-clamp-1 max-w-30'>{ev.room}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-4 text-xs text-muted-foreground'>
                    {selectedDay !== null
                      ? `Tidak ada agenda pada tanggal ${selectedDay} ${data?.calendar?.monthName || ''}.`
                      : 'Belum ada agenda event pada bulan ini.'}
                  </div>
                )}
              </div>
            </CardContent>
          </div>

          <div className='border-t px-4 py-2 text-center'>
            <Link
              href='/dashboard/event'
              className='text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1'
            >
              Lihat semua agenda event <ArrowRight className='size-3' />
            </Link>
          </div>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 3. BOTTOM ROW: 2 EQUAL COLUMNS (KEUANGAN 50%, SHA-256 50%)    */}
      {/* ============================================================ */}
      <div className='grid gap-5 grid-cols-1 lg:grid-cols-2'>
        {/* 3.1 Ringkasan Arus Kas */}
        <Card className='shadow-xs border border-border/70 bg-card flex flex-col justify-between'>
          <div>
            <CardHeader className='pb-3 pt-4 px-4 sm:px-5'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <Receipt className='size-4 text-primary' />
                  <CardTitle className='text-sm font-bold text-foreground'>
                    Ringkasan Arus Kas
                  </CardTitle>
                </div>

                {/* Financial Period Dropdown Filter */}
                <Select
                  value={financialPeriod}
                  onValueChange={(val: any) => setFinancialPeriod(val)}
                >
                  <SelectTrigger className='w-31.25 h-7 text-xs'>
                    <SelectValue placeholder='Pilih Periode' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='BULAN_INI'>Bulan Ini</SelectItem>
                    <SelectItem value='BULAN_LALU'>Bulan Lalu</SelectItem>
                    <SelectItem value='TAHUN_INI'>Tahun Ini</SelectItem>
                    <SelectItem value='SEMUA'>Semua Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 3 Summary Boxes */}
              <div className='grid grid-cols-3 gap-2 sm:gap-3 pt-2'>
                <div className='bg-muted/30 border rounded-lg p-2 sm:p-2.5 min-w-0'>
                  <div className='text-[10px] text-muted-foreground font-medium truncate'>Pemasukan</div>
                  <div
                    className='text-[11px] sm:text-sm font-bold text-emerald-600 font-mono flex items-center gap-0.5 whitespace-nowrap'
                    title={formatIDR(data?.financial.pemasukan || 0)}
                  >
                    <span className='sm:hidden'>{formatCompactIDR(data?.financial.pemasukan || 0)}</span>
                    <span className='hidden sm:inline'>{formatIDR(data?.financial.pemasukan || 0)}</span>
                    <span className='text-[10px] sm:text-[11px]'>↗</span>
                  </div>
                </div>

                <div className='bg-muted/30 border rounded-lg p-2 sm:p-2.5 min-w-0'>
                  <div className='text-[10px] text-muted-foreground font-medium truncate'>Pengeluaran</div>
                  <div
                    className='text-[11px] sm:text-sm font-bold text-rose-600 font-mono flex items-center gap-0.5 whitespace-nowrap'
                    title={formatIDR(data?.financial.pengeluaran || 0)}
                  >
                    <span className='sm:hidden'>{formatCompactIDR(data?.financial.pengeluaran || 0)}</span>
                    <span className='hidden sm:inline'>{formatIDR(data?.financial.pengeluaran || 0)}</span>
                    <span className='text-[10px] sm:text-[11px]'>↘</span>
                  </div>
                </div>

                <div className='bg-muted/30 border rounded-lg p-2 sm:p-2.5 min-w-0'>
                  <div className='text-[10px] text-muted-foreground font-medium truncate'>Saldo Akhir</div>
                  <div
                    className='text-[11px] sm:text-sm font-bold text-blue-600 font-mono truncate'
                    title={formatIDR(data?.financial.saldoAkhir || 0)}
                  >
                    <span className='sm:hidden'>{formatCompactIDR(data?.financial.saldoAkhir || 0)}</span>
                    <span className='hidden sm:inline'>{formatIDR(data?.financial.saldoAkhir || 0)}</span>
                  </div>
                </div>
              </div>

              <div className='pt-2 text-xs font-bold text-foreground'>
                5 Jurnal Transaksi Terakhir
              </div>
            </CardHeader>

            <CardContent className='px-4 sm:px-5 py-0 overflow-x-auto'>
              {(data?.financial.recentJournal || []).length > 0 ? (
                <table className='w-full min-w-125 text-left text-xs border-collapse'>
                  <thead>
                    <tr className='text-muted-foreground border-b text-[11px]'>
                      <th className='pb-2.5 pe-4 ps-1 font-medium whitespace-nowrap'>Tanggal</th>
                      <th className='pb-2.5 pe-4 font-medium whitespace-nowrap'>Akun</th>
                      <th className='pb-2.5 pe-4 font-medium'>Deskripsi</th>
                      <th className='pb-2.5 pe-4 font-medium text-end whitespace-nowrap'>Debit</th>
                      <th className='pb-2.5 pe-1 font-medium text-end whitespace-nowrap'>Kredit</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border/60 text-xs font-sans'>
                    {(data?.financial.recentJournal || []).map((jmt) => (
                      <tr key={jmt.id} className='hover:bg-muted/30 transition-colors'>
                        <td className='py-2.5 pe-4 ps-1 font-mono text-[11px] text-muted-foreground whitespace-nowrap'>
                          {jmt.tanggal}
                        </td>
                        <td className='py-2.5 pe-4 font-medium whitespace-nowrap text-foreground'>
                          {jmt.akun}
                        </td>
                        <td className='py-2.5 pe-4 text-muted-foreground max-w-45 truncate'>
                          {jmt.deskripsi}
                        </td>
                        <td className='py-2.5 pe-4 text-end font-mono text-foreground whitespace-nowrap'>
                          {jmt.debit}
                        </td>
                        <td className='py-2.5 pe-1 text-end font-mono font-semibold text-foreground whitespace-nowrap'>
                          {jmt.kredit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className='text-center py-6 text-xs text-muted-foreground'>
                  Belum ada catatan transaksi pada periode ini.
                </div>
              )}
            </CardContent>
          </div>

          <div className='border-t px-4 sm:px-5 py-2.5 text-center mt-3'>
            <Link
              href='/dashboard/keuangan'
              className='text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1'
            >
              Lihat semua jurnal keuangan <ArrowRight className='size-3' />
            </Link>
          </div>
        </Card>

        {/* 3.2 Status Integritas Kriptografi (SHA-256) */}
        <Card className='shadow-xs border border-border/70 bg-card flex flex-col justify-between'>
          <div>
            <CardHeader className='pb-3 pt-4 px-4 sm:px-5'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <ShieldCheck className='size-4 text-emerald-600' />
                  <CardTitle className='text-sm font-bold text-foreground'>
                    Status Integritas Kriptografi (SHA-256)
                  </CardTitle>
                </div>
                <span className='text-xs text-muted-foreground'>Status Saat Ini</span>
              </div>

              {/* Verified Status Banner */}
              <div className='bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-3 flex items-center justify-between mt-1'>
                <div>
                  <div className='text-xs font-bold text-emerald-800 dark:text-emerald-300'>
                    Sistem AMAN & TERINTEGRITAS
                  </div>
                  <div className='text-[11px] text-emerald-700/80 dark:text-emerald-400/80'>
                    {data?.audit.statusMessage || 'Hash Valid. Tidak ada perubahan data terdeteksi.'}
                  </div>
                </div>
                <div className='size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0'>
                  <CheckCircle2 className='size-4' />
                </div>
              </div>

              <div className='pt-2 text-xs font-bold text-foreground'>
                5 Log Terakhir
              </div>
            </CardHeader>

            <CardContent className='px-4 sm:px-5 py-0 overflow-x-auto'>
              {(data?.audit.recentLogs || []).length > 0 ? (
                <table className='w-full min-w-125 text-left text-xs border-collapse'>
                  <thead>
                    <tr className='text-muted-foreground border-b text-[11px]'>
                      <th className='pb-2.5 pe-4 ps-1 font-medium whitespace-nowrap'>Waktu</th>
                      <th className='pb-2.5 pe-4 font-medium whitespace-nowrap'>Aksi</th>
                      <th className='pb-2.5 pe-4 font-medium whitespace-nowrap'>Tabel/Modul</th>
                      <th className='pb-2.5 pe-4 font-medium'>Hash (SHA-256)</th>
                      <th className='pb-2.5 pe-1 font-medium text-end whitespace-nowrap'>Status</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border/60 text-xs'>
                    {(data?.audit.recentLogs || []).map((log) => (
                      <tr key={log.id} className='hover:bg-muted/30 transition-colors'>
                        <td className='py-2.5 pe-4 ps-1 font-mono text-[11px] text-muted-foreground whitespace-nowrap'>
                          {log.waktu}
                        </td>
                        <td className='py-2.5 pe-4 font-semibold text-[11px] whitespace-nowrap'>
                          <span
                            className={
                              log.aksi === 'INSERT'
                                ? 'text-emerald-600 font-bold'
                                : log.aksi === 'DELETE'
                                ? 'text-rose-600 font-bold'
                                : 'text-blue-600 font-bold'
                            }
                          >
                            {log.aksi}
                          </span>
                        </td>
                        <td className='py-2.5 pe-4 text-foreground whitespace-nowrap'>
                          {log.modul}
                        </td>
                        <td className='py-2.5 pe-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap'>
                          {log.hash}
                        </td>
                        <td className='py-2.5 pe-1 text-end font-semibold text-emerald-600 whitespace-nowrap'>
                          {log.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className='text-center py-6 text-xs text-muted-foreground'>
                  Belum ada catatan audit log kriptografi.
                </div>
              )}
            </CardContent>
          </div>

          <div className='border-t px-4 sm:px-5 py-2.5 text-center mt-3'>
            <Link
              href='/dashboard/audit'
              className='text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1'
            >
              Lihat semua audit log <ArrowRight className='size-3' />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
