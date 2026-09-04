'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Globe,
  Save,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  UserPlus,
  QrCode,
  HeartHandshake,
  BookOpen,
  Building,
  Phone,
  Mail,
  Loader2,
  CheckCircle2,
  Sliders,
  Layers,
  Video,
  Share2,
  MessageCircle,
  Headphones,
  Search,
  Image as ImageIcon,
  Key,
  Hash,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MediaUploadField } from '@/components/landing/media-upload-field'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getLandingPageConfigAction,
  updateLandingPageConfigAction,
  resetLandingPageConfigAction,
} from '@/actions/landing-page'
import { getKategoriArtikelListAction, KategoriArtikelDTO } from '@/actions/artikel'
import {
  LandingPageConfig,
  DEFAULT_LANDING_PAGE_CONFIG,
  SectionOrderItem,
  ScheduleItem,
  QuickActionItem,
  QuickActionIcon,
  ZoomCardItem,
} from '@/lib/validations/landing-page'
import { toast } from 'sonner'

export const SETTINGS_SECTIONS = [
  { value: 'sections', label: 'Urutan Seksi', icon: Layers, color: 'text-primary' },
  { value: 'hero', label: 'Hero Video Banner', icon: Video, color: 'text-sky-500' },
  { value: 'quickActions', label: 'Tombol Cepat (Quick Actions)', icon: Sliders, color: 'text-amber-500' },
  { value: 'eventBanner', label: 'Banner Event & Warta', icon: Calendar, color: 'text-rose-500' },
  { value: 'khotbah', label: 'Ringkasan Khotbah', icon: BookOpen, color: 'text-emerald-500' },
  { value: 'socialMedia', label: 'Sosial Media Hub', icon: Share2, color: 'text-blue-500' },
  { value: 'bibleStudy', label: 'Bible Study & Doktrin', icon: Sparkles, color: 'text-purple-500' },
  { value: 'zoom', label: 'Zoom & Doa Online', icon: Video, color: 'text-indigo-500' },
  { value: 'schedule', label: 'Jadwal Ibadah Gereja', icon: Clock, color: 'text-orange-500' },
  { value: 'footer', label: 'Footer & Kontak Parallax', icon: Building, color: 'text-teal-500' },
] as const

export default function LandingPageSettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('sections')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [config, setConfig] = useState<LandingPageConfig>(DEFAULT_LANDING_PAGE_CONFIG)
  const [isCustomized, setIsCustomized] = useState(false)
  const [kategoriList, setKategoriList] = useState<KategoriArtikelDTO[]>([])

  // Schedule Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null)
  const [scheduleForm, setScheduleForm] = useState<ScheduleItem>({
    id: '',
    nama: '',
    hari: 'Minggu',
    jam: '08.00 WIB',
    lokasi: 'Main Hall Gereja',
    deskripsi: '',
    enabled: true,
    order: 1,
  })

  // Quick Action Modal State
  const [quickActionModalOpen, setQuickActionModalOpen] = useState(false)
  const [editingQuickActionIndex, setEditingQuickActionIndex] = useState<number | null>(null)
  const [quickActionForm, setQuickActionForm] = useState<QuickActionItem>({
    id: '',
    title: '',
    description: '',
    buttonText: '',
    linkUrl: '',
    icon: 'HeartHandshake',
    enabled: true,
  })

  // Zoom Card Modal State
  const [zoomModalOpen, setZoomModalOpen] = useState(false)
  const [editingZoomIndex, setEditingZoomIndex] = useState<number | null>(null)
  const [zoomForm, setZoomForm] = useState<ZoomCardItem>({
    id: '',
    title: '',
    hariJam: '',
    deskripsi: '',
    meetingId: '',
    passcode: '',
    linkUrl: '',
  })

  // Load config and categories
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [configRes, katRes] = await Promise.all([
        getLandingPageConfigAction(),
        getKategoriArtikelListAction(),
      ])

      if (configRes.success && configRes.data) {
        const sortedSections = [...configRes.data.sections].sort((a, b) => a.order - b.order)
        setConfig({
          ...configRes.data,
          sections: sortedSections,
        })
        setIsCustomized(configRes.isCustomized)
      }

      if (katRes.success && katRes.data) {
        setKategoriList(katRes.data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat pengaturan landing page.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Section Order Handlers
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...config.sections]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newSections.length) return

    const temp = newSections[index]
    newSections[index] = newSections[targetIndex]
    newSections[targetIndex] = temp

    // Reassign sequential order numbers
    newSections.forEach((s, idx) => {
      s.order = idx + 1
    })

    setConfig((prev) => ({ ...prev, sections: newSections }))
  }

  const toggleSection = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    }))
  }

  // Save changes
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updateLandingPageConfigAction(config)
      if (res.success && res.data) {
        setConfig(res.data)
        setIsCustomized(true)
        toast.success('Pengaturan Landing Page berhasil disimpan!')
      } else {
        toast.error(res.error || 'Gagal menyimpan pengaturan.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem saat menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  // Reset to defaults
  const handleReset = async () => {
    setResetting(true)
    try {
      const res = await resetLandingPageConfigAction()
      if (res.success && res.data) {
        setConfig(res.data)
        setIsCustomized(false)
        setResetDialogOpen(false)
        toast.success('Pengaturan berhasil direset ke konfigurasi awal.')
      } else {
        toast.error(res.error || 'Gagal mereset pengaturan.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mereset pengaturan.')
    } finally {
      setResetting(false)
    }
  }

  // Schedule modal helpers
  const handleOpenAddSchedule = () => {
    setEditingScheduleIndex(null)
    setScheduleForm({
      id: `sch-${Date.now()}`,
      nama: '',
      hari: 'Minggu',
      jam: '08.00 WIB',
      lokasi: 'Main Hall',
      deskripsi: '',
      enabled: true,
      order: config.schedule.items.length + 1,
    })
    setScheduleModalOpen(true)
  }

  const handleOpenEditSchedule = (index: number) => {
    setEditingScheduleIndex(index)
    setScheduleForm({ ...config.schedule.items[index] })
    setScheduleModalOpen(true)
  }

  const handleSaveSchedule = () => {
    if (!scheduleForm.nama.trim()) {
      toast.error('Nama ibadah wajib diisi.')
      return
    }

    const items = [...config.schedule.items]
    if (editingScheduleIndex !== null) {
      items[editingScheduleIndex] = scheduleForm
    } else {
      items.push(scheduleForm)
    }

    setConfig((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        items,
      },
    }))
    setScheduleModalOpen(false)
  }

  const handleDeleteSchedule = (index: number) => {
    const items = config.schedule.items.filter((_, idx) => idx !== index)
    setConfig((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        items,
      },
    }))
    toast.success('Jadwal berhasil dihapus.')
  }

  // Quick Action modal helpers
  const handleOpenEditQuickAction = (index: number) => {
    setEditingQuickActionIndex(index)
    setQuickActionForm({ ...config.quickActions.items[index] })
    setQuickActionModalOpen(true)
  }

  const handleSaveQuickAction = () => {
    if (!quickActionForm.title.trim()) {
      toast.error('Judul tombol aksi wajib diisi.')
      return
    }

    const items = [...config.quickActions.items]
    if (editingQuickActionIndex !== null) {
      items[editingQuickActionIndex] = quickActionForm
    }

    setConfig((prev) => ({
      ...prev,
      quickActions: {
        ...prev.quickActions,
        items,
      },
    }))
    setQuickActionModalOpen(false)
  }

  // Zoom card modal helpers
  const handleOpenAddZoom = () => {
    setEditingZoomIndex(null)
    setZoomForm({
      id: `zm-${Date.now()}`,
      title: '',
      hariJam: '',
      deskripsi: '',
      meetingId: config.zoom.meetingIdDefault || '',
      passcode: config.zoom.passcodeDefault || '',
      linkUrl: config.zoom.zoomUrlDefault || '',
    })
    setZoomModalOpen(true)
  }

  const handleOpenEditZoom = (index: number) => {
    setEditingZoomIndex(index)
    setZoomForm({ ...config.zoom.cards[index] })
    setZoomModalOpen(true)
  }

  const handleSaveZoom = () => {
    if (!zoomForm.title.trim()) {
      toast.error('Nama persekutuan Zoom wajib diisi.')
      return
    }

    const cards = [...config.zoom.cards]
    if (editingZoomIndex !== null) {
      cards[editingZoomIndex] = zoomForm
    } else {
      cards.push(zoomForm)
    }

    setConfig((prev) => ({
      ...prev,
      zoom: {
        ...prev.zoom,
        cards,
      },
    }))
    setZoomModalOpen(false)
  }

  const handleDeleteZoom = (index: number) => {
    const cards = config.zoom.cards.filter((_, idx) => idx !== index)
    setConfig((prev) => ({
      ...prev,
      zoom: {
        ...prev.zoom,
        cards,
      },
    }))
    toast.success('Kartu Zoom berhasil dihapus.')
  }

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground'>
        <Loader2 className='size-8 animate-spin text-primary' />
        <p className='text-sm'>Memuat pengaturan Landing Page modern...</p>
      </div>
    )
  }

  return (
    <div className='space-y-6 max-w-7xl mx-auto pb-16'>
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div className='flex items-start gap-3 min-w-0'>
          <div className='p-2 sm:p-2.5 bg-primary/10 rounded-xl text-primary shrink-0 mt-0.5'>
            <Globe className='size-5' />
          </div>
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-lg sm:text-2xl font-bold tracking-tight text-foreground'>
                Pengaturan Landing Page
              </h1>
              {isCustomized ? (
                <Badge
                  variant='outline'
                  className='border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 text-[11px] sm:text-xs py-0.5 font-medium shrink-0'
                >
                  <CheckCircle2 className='size-3' /> Tersimpan di Database
                </Badge>
              ) : (
                <Badge variant='secondary' className='text-muted-foreground text-[11px] sm:text-xs py-0.5 shrink-0'>
                  Pengaturan Bawaan
                </Badge>
              )}
            </div>
            <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
              Kustomisasi tata letak, banner, khotbah, dan konten beranda website gereja.
            </p>
          </div>
        </div>

        <div className='grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0'>
          <Button asChild variant='outline' size='sm' className='h-8 sm:h-9 text-xs gap-1.5 justify-center'>
            <Link href='/' target='_blank' rel='noopener noreferrer'>
              <ExternalLink className='size-3.5' /> Pratinjau
            </Link>
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={() => setResetDialogOpen(true)}
            disabled={saving || resetting}
            className='h-8 sm:h-9 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 justify-center'
          >
            <RotateCcw className='size-3.5' /> Reset
          </Button>

          <Button
            size='sm'
            onClick={handleSave}
            disabled={saving}
            className='col-span-2 sm:col-span-1 h-8 sm:h-9 text-xs gap-1.5 font-semibold bg-primary hover:bg-primary/90 shadow-xs justify-center'
          >
            {saving ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
            Simpan Perubahan
          </Button>
        </div>
      </div>

      {/* ── Main Settings 2-Column Layout (Shadcn UI Settings Pattern) ── */}
      <div className='flex flex-col lg:flex-row gap-6 lg:gap-8 items-start'>
        {/* 1. Left Sidebar Navigation (Desktop lg:) */}
        <aside className='hidden lg:block w-56 xl:w-64 shrink-0'>
          <nav className='flex flex-col space-y-1 sticky top-6'>
            {SETTINGS_SECTIONS.map((sec) => {
              const Icon = sec.icon
              const isActive = activeTab === sec.value
              return (
                <button
                  key={sec.value}
                  type='button'
                  onClick={() => setActiveTab(sec.value)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left w-full cursor-pointer',
                    isActive
                      ? 'bg-muted font-semibold text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', isActive ? sec.color : 'text-muted-foreground')} />
                  <span className='truncate'>{sec.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* 2. Mobile Dropdown Selector (Hidden on Desktop) */}
        <div className='lg:hidden w-full flex flex-col gap-1.5'>
          <Label htmlFor='section-select' className='text-xs font-semibold text-muted-foreground'>
            Pilih Seksi Pengaturan:
          </Label>
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger id='section-select' className='w-full h-10 font-semibold bg-card'>
              <SelectValue placeholder='Pilih Seksi Pengaturan' />
            </SelectTrigger>
            <SelectContent className='max-h-80'>
              {SETTINGS_SECTIONS.map((sec) => (
                <SelectItem key={sec.value} value={sec.value} className='py-2.5 font-medium cursor-pointer'>
                  <div className='flex items-center gap-2.5'>
                    <sec.icon className={cn('size-4 shrink-0', sec.color)} />
                    <span>{sec.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. Right Content Area */}
        <div className='flex-1 w-full min-w-0'>
          <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>


        {/* ── TAB 1: SECTIONS REORDER & TOGGLE ──────────────────────── */}
        <TabsContent value='sections' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Urutan & Visibilitas Seksi</CardTitle>
              <CardDescription>
                Atur urutan tampil seksi di beranda publik. Anda dapat menyembunyikan atau menampilkan seksi sesuai kebutuhan pelayanan.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {config.sections.map((sec, index) => (
                <div
                  key={sec.id}
                  className='flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border bg-card/60 hover:bg-muted/40 transition-colors'
                >
                  <div className='flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1'>
                    <div className='size-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center font-mono shrink-0'>
                      {sec.order}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5 flex-wrap leading-tight'>
                        <span className='truncate'>{sec.title}</span>
                        {!sec.enabled && (
                          <Badge variant='secondary' className='text-[9px] sm:text-[10px] text-muted-foreground px-1 py-0 shrink-0'>
                            Nonaktif
                          </Badge>
                        )}
                      </div>
                      <span className='text-[11px] text-muted-foreground font-mono block mt-0.5 truncate'>
                        id: {sec.id}
                      </span>
                    </div>
                  </div>

                  <div className='flex items-center gap-1.5 sm:gap-2 shrink-0'>
                    <Switch
                      checked={sec.enabled}
                      onCheckedChange={() => toggleSection(sec.id)}
                      aria-label={`Toggle ${sec.title}`}
                      className='scale-90 sm:scale-100'
                    />
                    <div className='flex items-center border rounded-lg p-0.5 bg-background/50'>
                      <Button
                        variant='ghost'
                        size='icon'
                        disabled={index === 0}
                        onClick={() => moveSection(index, 'up')}
                        className='size-6 sm:size-7'
                        title='Geser ke atas'
                      >
                        <ArrowUp className='size-3 sm:size-3.5' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        disabled={index === config.sections.length - 1}
                        onClick={() => moveSection(index, 'down')}
                        className='size-6 sm:size-7'
                        title='Geser ke bawah'
                      >
                        <ArrowDown className='size-3 sm:size-3.5' />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: HERO VIDEO ─────────────────────────────────────── */}
        <TabsContent value='hero' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Hero Section Video & Teks Dinamis</CardTitle>
              <CardDescription>
                Latar belakang video sinematik dengan animasi kata-kata berganti dan tombol navigasi utama.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-5'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                <MediaUploadField
                  label='Video Background Utama (.MP4)'
                  description='Video loop tanpa suara (.mp4, .webm) untuk latar belakang sinematik hero.'
                  value={config.hero.videoUrl}
                  type='video'
                  onChange={(url) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, videoUrl: url },
                    }))
                  }
                />

                <MediaUploadField
                  label='Poster Gambar Fallback'
                  description='Gambar statis berkualitas tinggi sebelum video selesai dimuat di perangkat.'
                  value={config.hero.videoPosterUrl}
                  type='image'
                  onChange={(url) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, videoPosterUrl: url },
                    }))
                  }
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='hero-badge'>Teks Badge Sambutan</Label>
                <Input
                  id='hero-badge'
                  value={config.hero.badgeText}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, badgeText: e.target.value },
                    }))
                  }
                  placeholder='Selamat Datang di Rumah Tuhan'
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='hero-prefix'>Awalan Judul Utama</Label>
                  <Input
                    id='hero-prefix'
                    value={config.hero.titlePrefix}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, titlePrefix: e.target.value },
                      }))
                    }
                    placeholder='Gereja Yang Membawa'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='hero-rotating'>Kata-Kata Berganti (Pisahkan dengan koma)</Label>
                  <Input
                    id='hero-rotating'
                    value={config.hero.rotatingWords.join(', ')}
                    onChange={(e) => {
                      const list = e.target.value.split(',').map((w) => w.trim()).filter(Boolean)
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, rotatingWords: list },
                      }))
                    }}
                    placeholder='Pemulihan, Transformasi, Pengharapan, Kasih Karunia'
                  />
                  <p className='text-[11px] text-muted-foreground'>
                    Kata-kata ini akan berputar otomatis secara bergantian dengan efek fade warna emas.
                  </p>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='hero-desc'>Deskripsi / Ayat Visi</Label>
                <Textarea
                  id='hero-desc'
                  rows={3}
                  value={config.hero.description}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, description: e.target.value },
                    }))
                  }
                  placeholder='Menjadi komunitas jemaat yang bertumbuh dalam iman...'
                />
              </div>

              {/* Action Buttons Config */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t'>
                <div className='space-y-3 p-4 border rounded-xl bg-card'>
                  <div className='flex items-center justify-between'>
                    <Label className='font-bold text-sm'>Tombol Utama (Kiri)</Label>
                    <Switch
                      checked={config.hero.ctaDaftarEnabled}
                      onCheckedChange={(val) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, ctaDaftarEnabled: val },
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='cta-left-text' className='text-xs'>Teks Tombol</Label>
                    <Input
                      id='cta-left-text'
                      value={config.hero.ctaDaftarText}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, ctaDaftarText: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='cta-left-url' className='text-xs'>URL Target</Label>
                    <Input
                      id='cta-left-url'
                      value={config.hero.ctaDaftarUrl}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, ctaDaftarUrl: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className='space-y-3 p-4 border rounded-xl bg-card'>
                  <div className='flex items-center justify-between'>
                    <Label className='font-bold text-sm'>Tombol Sekunder (Kanan)</Label>
                    <Switch
                      checked={config.hero.ctaVerifikasiEnabled}
                      onCheckedChange={(val) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, ctaVerifikasiEnabled: val },
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='cta-right-text' className='text-xs'>Teks Tombol</Label>
                    <Input
                      id='cta-right-text'
                      value={config.hero.ctaVerifikasiText}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, ctaVerifikasiText: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='cta-right-url' className='text-xs'>URL Target</Label>
                    <Input
                      id='cta-right-url'
                      value={config.hero.ctaVerifikasiUrl}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, ctaVerifikasiUrl: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: QUICK ACTIONS ─────────────────────────────────── */}
        <TabsContent value='quickActions' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Tombol Cepat (Quick Action Grid)</CardTitle>
              <CardDescription>
                8 kartu aksi cepat yang melayang rapi di bawah Hero section untuk memudahkan jemaat menjangkau fitur penting.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='qa-title'>Judul Seksi</Label>
                  <Input
                    id='qa-title'
                    value={config.quickActions.sectionTitle}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        quickActions: { ...prev.quickActions, sectionTitle: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='qa-subtitle' className='text-xs sm:text-sm font-semibold'>Subjudul Seksi</Label>
                  <Textarea
                    id='qa-subtitle'
                    rows={2}
                    value={config.quickActions.sectionSubtitle}
                    className='resize-none text-xs sm:text-sm leading-relaxed'
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        quickActions: { ...prev.quickActions, sectionSubtitle: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              {/* Items List */}
              <div className='space-y-2.5 pt-2'>
                <Label className='font-semibold text-sm'>Daftar 8 Tombol Layanan</Label>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {config.quickActions.items.map((item, index) => (
                    <div
                      key={item.id}
                      className='flex items-center justify-between p-3.5 rounded-xl border bg-card/60 hover:bg-card transition-colors'
                    >
                      <div className='flex items-center gap-3 min-w-0'>
                        <div className='size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs'>
                          {index + 1}
                        </div>
                        <div className='min-w-0'>
                          <div className='font-semibold text-sm truncate'>{item.title}</div>
                          <div className='text-xs text-muted-foreground truncate'>{item.linkUrl}</div>
                        </div>
                      </div>

                      <div className='flex items-center gap-2 shrink-0'>
                        <Switch
                          checked={item.enabled}
                          onCheckedChange={(val) => {
                            const newItems = [...config.quickActions.items]
                            newItems[index].enabled = val
                            setConfig((prev) => ({
                              ...prev,
                              quickActions: { ...prev.quickActions, items: newItems },
                            }))
                          }}
                        />
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-8'
                          onClick={() => handleOpenEditQuickAction(index)}
                        >
                          <Edit className='size-3.5' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 5: BANNER EVENT ──────────────────────────────────── */}
        <TabsContent value='eventBanner' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Banner Event Mendatang (Carousel)</CardTitle>
              <CardDescription>
                Banner slide carousel yang secara otomatis menampilkan event-event aktif dari database dengan visual poster yang menarik.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='eb-title'>Judul Seksi</Label>
                  <Input
                    id='eb-title'
                    value={config.eventBanner.sectionTitle}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        eventBanner: { ...prev.eventBanner, sectionTitle: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='eb-subtitle' className='text-xs sm:text-sm font-semibold'>Subjudul Seksi</Label>
                  <Textarea
                    id='eb-subtitle'
                    rows={2}
                    value={config.eventBanner.sectionSubtitle}
                    className='resize-none text-xs sm:text-sm leading-relaxed'
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        eventBanner: { ...prev.eventBanner, sectionSubtitle: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='eb-interval'>Interval Auto-Slide (Milidetik)</Label>
                  <Input
                    id='eb-interval'
                    type='number'
                    value={config.eventBanner.autoPlayInterval}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        eventBanner: {
                          ...prev.eventBanner,
                          autoPlayInterval: parseInt(e.target.value) || 5000,
                        },
                      }))
                    }
                  />
                  <p className='text-[11px] text-muted-foreground'>Contoh: 5000 untuk pergeseran tiap 5 detik.</p>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='eb-limit'>Jumlah Maksimal Event Ditampilkan</Label>
                  <Input
                    id='eb-limit'
                    type='number'
                    value={config.eventBanner.limit}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        eventBanner: {
                          ...prev.eventBanner,
                          limit: parseInt(e.target.value) || 6,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 6: KHOTBAH ────────────────────────────────────────── */}
        <TabsContent value='khotbah' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Seksi Khotbah & Ringkasan Mimbar</CardTitle>
              <CardDescription>
                Tampilkan ringkasan pesan firman Tuhan dengan tata letak kartu horizontal yang nyaman dibaca.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='kt-title'>Judul Seksi</Label>
                  <Input
                    id='kt-title'
                    value={config.khotbah.sectionTitle}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        khotbah: { ...prev.khotbah, sectionTitle: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='kt-subtitle' className='text-xs sm:text-sm font-semibold'>Subjudul Seksi</Label>
                  <Textarea
                    id='kt-subtitle'
                    rows={2}
                    value={config.khotbah.sectionSubtitle}
                    className='resize-none text-xs sm:text-sm leading-relaxed'
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        khotbah: { ...prev.khotbah, sectionSubtitle: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='kt-kat'>Kategori Khusus Artikel (Opsional)</Label>
                  <Select
                    value={config.khotbah.kategoriId || 'all'}
                    onValueChange={(val) =>
                      setConfig((prev) => ({
                        ...prev,
                        khotbah: {
                          ...prev.khotbah,
                          kategoriId: val === 'all' ? null : val,
                        },
                      }))
                    }
                  >
                    <SelectTrigger id='kt-kat'>
                      <SelectValue placeholder='Semua Kategori (Artikel Terbaru)' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Semua Kategori (Terbaru)</SelectItem>
                      {kategoriList.map((kat) => (
                        <SelectItem key={kat.id} value={kat.id}>
                          {kat.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className='text-[11px] text-muted-foreground'>
                    Pilih kategori khusus (misal &quot;Khotbah Minggu&quot;) atau biarkan Semua Kategori.
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='kt-limit'>Jumlah Khotbah Ditampilkan</Label>
                  <Input
                    id='kt-limit'
                    type='number'
                    value={config.khotbah.limit}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        khotbah: { ...prev.khotbah, limit: parseInt(e.target.value) || 4 },
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 7: SOSIAL MEDIA HUB ──────────────────────────────── */}
        <TabsContent value='socialMedia' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Sosial Media Community Hub</CardTitle>
              <CardDescription>
                Tautkan saluran digital gereja seperti YouTube Streaming, Instagram, TikTok, WhatsApp Doa, dan Spotify.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-5'>
              <div className='flex items-center justify-between p-3.5 border rounded-xl bg-muted/20'>
                <div>
                  <Label className='font-semibold text-sm'>Aktifkan Seksi Sosial Media</Label>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    Tampilkan 4 kartu saluran digital komunitas gereja.
                  </p>
                </div>
                <Switch
                  checked={config.socialMedia.enabled}
                  onCheckedChange={(val) =>
                    setConfig((prev) => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, enabled: val },
                    }))
                  }
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='sm-title' className='text-xs sm:text-sm font-semibold'>Judul Seksi</Label>
                  <Input
                    id='sm-title'
                    value={config.socialMedia.sectionTitle}
                    className='text-xs sm:text-sm'
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, sectionTitle: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='sm-subtitle' className='text-xs sm:text-sm font-semibold'>Subjudul Seksi</Label>
                  <Textarea
                    id='sm-subtitle'
                    rows={2}
                    value={config.socialMedia.sectionSubtitle}
                    className='resize-none text-xs sm:text-sm leading-relaxed'
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, sectionSubtitle: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              {/* Social Channels Inputs */}
              <div className='space-y-4 pt-2 border-t'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='sm-yt' className='text-xs sm:text-sm font-semibold'>URL YouTube (Live Stream)</Label>
                    <Input
                      id='sm-yt'
                      value={config.socialMedia.youtubeUrl}
                      className='text-xs sm:text-sm'
                      placeholder='https://youtube.com/@channel'
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          socialMedia: { ...prev.socialMedia, youtubeUrl: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='sm-ig' className='text-xs sm:text-sm font-semibold'>URL Instagram Resmi</Label>
                    <Input
                      id='sm-ig'
                      value={config.socialMedia.instagramUrl}
                      className='text-xs sm:text-sm'
                      placeholder='https://instagram.com/akun'
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          socialMedia: { ...prev.socialMedia, instagramUrl: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='sm-tt' className='text-xs sm:text-sm font-semibold'>URL Akun TikTok</Label>
                    <Input
                      id='sm-tt'
                      value={config.socialMedia.tiktokUrl}
                      className='text-xs sm:text-sm'
                      placeholder='https://tiktok.com/@akun'
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          socialMedia: { ...prev.socialMedia, tiktokUrl: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='sm-wa' className='text-xs sm:text-sm font-semibold'>URL WhatsApp Pastoral</Label>
                    <Input
                      id='sm-wa'
                      value={config.socialMedia.whatsappUrl}
                      className='text-xs sm:text-sm'
                      placeholder='https://wa.me/6281234567890'
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          socialMedia: { ...prev.socialMedia, whatsappUrl: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className='space-y-2 pt-2 border-t'>
                  <Label htmlFor='sm-sp' className='text-xs sm:text-sm font-semibold'>URL Spotify / Podcast (Opsional)</Label>
                  <Input
                    id='sm-sp'
                    value={config.socialMedia.spotifyUrl || ''}
                    className='text-xs sm:text-sm'
                    placeholder='https://open.spotify.com/...'
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, spotifyUrl: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 8: BIBLE STUDY ────────────────────────────────────── */}
        <TabsContent value='bibleStudy' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Seksi Bible Study & Doktrin</CardTitle>
              <CardDescription>
                Tampilkan materi pendalaman Alkitab, pemuridan jemaat, dan wawasan rohani.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='bs-title'>Judul Seksi</Label>
                  <Input
                    id='bs-title'
                    value={config.bibleStudy.sectionTitle}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        bibleStudy: { ...prev.bibleStudy, sectionTitle: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='bs-subtitle' className='text-xs sm:text-sm font-semibold'>Subjudul Seksi</Label>
                  <Textarea
                    id='bs-subtitle'
                    rows={2}
                    value={config.bibleStudy.sectionSubtitle}
                    className='resize-none text-xs sm:text-sm leading-relaxed'
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        bibleStudy: { ...prev.bibleStudy, sectionSubtitle: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='bs-kat'>Kategori Materi Doktrin / Studi</Label>
                  <Select
                    value={config.bibleStudy.kategoriId || 'all'}
                    onValueChange={(val) =>
                      setConfig((prev) => ({
                        ...prev,
                        bibleStudy: {
                          ...prev.bibleStudy,
                          kategoriId: val === 'all' ? null : val,
                        },
                      }))
                    }
                  >
                    <SelectTrigger id='bs-kat'>
                      <SelectValue placeholder='Semua Kategori (Artikel Terbaru)' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Semua Kategori (Terbaru)</SelectItem>
                      {kategoriList.map((kat) => (
                        <SelectItem key={kat.id} value={kat.id}>
                          {kat.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='bs-limit'>Jumlah Materi Ditampilkan</Label>
                  <Input
                    id='bs-limit'
                    type='number'
                    value={config.bibleStudy.limit}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        bibleStudy: { ...prev.bibleStudy, limit: parseInt(e.target.value) || 4 },
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 9: ZOOM ONLINE ────────────────────────────────────── */}
        <TabsContent value='zoom' className='space-y-4'>
          <Card>
            <CardHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div className='space-y-1 min-w-0'>
                <CardTitle className='text-base sm:text-lg'>Zoom & Doa Online</CardTitle>
                <CardDescription className='text-xs sm:text-sm'>
                  Kelola kartu persekutuan virtual, jadwal doa fajar, Meeting ID, Passcode, dan link langsung.
                </CardDescription>
              </div>
              <Button size='sm' onClick={handleOpenAddZoom} className='gap-1.5 shrink-0 self-start sm:self-auto h-8 sm:h-9 text-xs'>
                <Plus className='size-3.5' /> Tambah Sesi Zoom
              </Button>
            </CardHeader>
            <CardContent className='space-y-5'>
              <div className='flex items-center justify-between p-3.5 border rounded-xl bg-muted/20'>
                <div>
                  <Label className='font-semibold text-sm'>Aktifkan Seksi Zoom</Label>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    Tampilkan kartu persekutuan virtual dan doa online di beranda.
                  </p>
                </div>
                <Switch
                  checked={config.zoom.enabled}
                  onCheckedChange={(val) =>
                    setConfig((prev) => ({
                      ...prev,
                      zoom: { ...prev.zoom, enabled: val },
                    }))
                  }
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='zm-title'>Judul Seksi</Label>
                  <Input
                    id='zm-title'
                    value={config.zoom.sectionTitle}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        zoom: { ...prev.zoom, sectionTitle: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='zm-subtitle' className='text-xs sm:text-sm font-semibold'>Subjudul Seksi</Label>
                  <Textarea
                    id='zm-subtitle'
                    rows={2}
                    value={config.zoom.sectionSubtitle}
                    className='resize-none text-xs sm:text-sm leading-relaxed'
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        zoom: { ...prev.zoom, sectionSubtitle: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              {/* Default Zoom Credentials */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-xl bg-card'>
                <div className='space-y-2'>
                  <Label htmlFor='zm-def-id'>Meeting ID Bawaan</Label>
                  <Input
                    id='zm-def-id'
                    value={config.zoom.meetingIdDefault}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        zoom: { ...prev.zoom, meetingIdDefault: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='zm-def-pass'>Passcode Bawaan</Label>
                  <Input
                    id='zm-def-pass'
                    value={config.zoom.passcodeDefault}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        zoom: { ...prev.zoom, passcodeDefault: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='zm-def-url'>URL Tautan Bawaan</Label>
                  <Input
                    id='zm-def-url'
                    value={config.zoom.zoomUrlDefault}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        zoom: { ...prev.zoom, zoomUrlDefault: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              {/* Cards List */}
              <div className='space-y-3 pt-2'>
                <Label className='font-semibold text-sm'>Daftar Sesi Persekutuan Zoom</Label>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {config.zoom.cards.map((card, index) => (
                    <div
                      key={card.id}
                      className='p-4 border rounded-2xl bg-card/60 flex flex-col justify-between space-y-3'
                    >
                      <div className='space-y-2'>
                        <div className='flex items-start justify-between gap-2'>
                          <div>
                            <h4 className='font-bold text-sm text-foreground'>{card.title}</h4>
                            <span className='text-xs text-blue-600 dark:text-blue-400 font-medium'>
                              {card.hariJam}
                            </span>
                          </div>
                          <div className='flex items-center gap-1'>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-7'
                              onClick={() => handleOpenEditZoom(index)}
                            >
                              <Edit className='size-3.5' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-7 text-rose-500 hover:text-rose-600'
                              onClick={() => handleDeleteZoom(index)}
                            >
                              <Trash2 className='size-3.5' />
                            </Button>
                          </div>
                        </div>
                        <p className='text-xs text-muted-foreground line-clamp-2'>{card.deskripsi}</p>
                        <div className='text-[11px] font-mono text-muted-foreground'>
                          ID: {card.meetingId} | Pass: {card.passcode}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 10: JADWAL IBADAH ─────────────────────────────────── */}
        <TabsContent value='schedule' className='space-y-4'>
          <Card>
            <CardHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div className='space-y-1 min-w-0'>
                <CardTitle className='text-base sm:text-lg'>Jadwal Ibadah Raya</CardTitle>
                <CardDescription className='text-xs sm:text-sm'>
                  Kelola kartu jadwal ibadah mingguan, waktu pelaksanaan, dan lokasi aula.
                </CardDescription>
              </div>
              <Button size='sm' onClick={handleOpenAddSchedule} className='gap-1.5 shrink-0 self-start sm:self-auto h-8 sm:h-9 text-xs'>
                <Plus className='size-3.5' /> Tambah Jadwal
              </Button>
            </CardHeader>
            <CardContent className='space-y-5'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='sch-title'>Judul Seksi</Label>
                  <Input
                    id='sch-title'
                    value={config.schedule.sectionTitle}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        schedule: { ...prev.schedule, sectionTitle: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='sch-subtitle' className='text-xs sm:text-sm font-semibold'>Subjudul Seksi</Label>
                  <Textarea
                    id='sch-subtitle'
                    rows={2}
                    value={config.schedule.sectionSubtitle}
                    className='resize-none text-xs sm:text-sm leading-relaxed'
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        schedule: { ...prev.schedule, sectionSubtitle: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              {/* Schedule cards list */}
              <div className='space-y-3 pt-2'>
                <Label className='font-semibold text-sm'>Daftar Jadwal Terdaftar</Label>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'>
                  {config.schedule.items.map((sch, index) => (
                    <div
                      key={sch.id}
                      className='p-4 border rounded-2xl bg-card/60 flex flex-col justify-between space-y-3'
                    >
                      <div className='space-y-1.5'>
                        <div className='flex items-start justify-between gap-2'>
                          <Badge variant='outline' className='text-[10px]'>
                            {sch.hari}
                          </Badge>
                          <div className='flex items-center gap-1'>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-7'
                              onClick={() => handleOpenEditSchedule(index)}
                            >
                              <Edit className='size-3.5' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-7 text-rose-500 hover:text-rose-600'
                              onClick={() => handleDeleteSchedule(index)}
                            >
                              <Trash2 className='size-3.5' />
                            </Button>
                          </div>
                        </div>

                        <h4 className='font-bold text-sm text-foreground'>{sch.nama}</h4>
                        <div className='text-xs text-primary font-semibold flex items-center gap-1'>
                          <Clock className='size-3' />
                          <span>{sch.jam}</span>
                        </div>
                        <div className='text-xs text-muted-foreground flex items-center gap-1'>
                          <MapPin className='size-3' />
                          <span>{sch.lokasi}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 11: FOOTER & PARALLAX ─────────────────────────────── */}
        <TabsContent value='footer' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Footer Website & Efek Parallax</CardTitle>
              <CardDescription>
                Kustomisasi latar belakang gambar berdimensi parallax, kontak sekretariat, dan informasi legal perlindungan data jemaat.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-5'>
              <div className='flex items-center justify-between p-3.5 border rounded-xl bg-muted/20'>
                <div>
                  <Label className='font-semibold text-sm'>Aktifkan Efek Parallax</Label>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    Memberikan latar belakang foto tetap (fixed background) yang sinematik saat halaman digulir.
                  </p>
                </div>
                <Switch
                  checked={config.footer.parallaxEnabled}
                  onCheckedChange={(val) =>
                    setConfig((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, parallaxEnabled: val },
                    }))
                  }
                />
              </div>

              <MediaUploadField
                label='Gambar Latar Belakang Parallax'
                description='Foto resolusi tinggi yang tampil dengan efek parallax saat pengunjung menggulir ke bagian footer.'
                value={config.footer.backgroundImageUrl}
                type='image'
                onChange={(url) =>
                  setConfig((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, backgroundImageUrl: url },
                  }))
                }
              />

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='ft-name'>Nama Gereja di Footer</Label>
                  <Input
                    id='ft-name'
                    value={config.footer.churchName}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, churchName: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='ft-tagline'>Tagline / Slogan Pelayanan</Label>
                  <Input
                    id='ft-tagline'
                    value={config.footer.tagline}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, tagline: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='ft-alamat'>Alamat Lengkap Gereja</Label>
                <Textarea
                  id='ft-alamat'
                  rows={2}
                  value={config.footer.alamat}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, alamat: e.target.value },
                    }))
                  }
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='ft-telp'>Nomor Telepon Sekretariat</Label>
                  <Input
                    id='ft-telp'
                    value={config.footer.telepon}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, telepon: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='ft-email'>Email Resmi Sekretariat</Label>
                  <Input
                    id='ft-email'
                    value={config.footer.email}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, email: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='ft-copy'>Teks Hak Cipta (Copyright)</Label>
                <Input
                  id='ft-copy'
                  value={config.footer.copyrightText}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, copyrightText: e.target.value },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </div>

      {/* ── SCHEDULE MODAL ─────────────────────────────────────────── */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingScheduleIndex !== null ? 'Edit Jadwal Ibadah' : 'Tambah Jadwal Ibadah'}
            </DialogTitle>
            <DialogDescription>
              Isi data sesi ibadah mingguan atau persekutuan kategorial.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='sm-nama'>Nama Ibadah</Label>
              <Input
                id='sm-nama'
                value={scheduleForm.nama}
                onChange={(e) => setScheduleForm({ ...scheduleForm, nama: e.target.value })}
                placeholder='Ibadah Raya 1'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='sm-hari'>Hari</Label>
                <Input
                  id='sm-hari'
                  value={scheduleForm.hari}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, hari: e.target.value })}
                  placeholder='Minggu'
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='sm-jam'>Jam</Label>
                <Input
                  id='sm-jam'
                  value={scheduleForm.jam}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, jam: e.target.value })}
                  placeholder='08.00 WIB'
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='sm-lok'>Lokasi</Label>
              <Input
                id='sm-lok'
                value={scheduleForm.lokasi}
                onChange={(e) => setScheduleForm({ ...scheduleForm, lokasi: e.target.value })}
                placeholder='Main Hall Lantai 2'
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='sm-desk'>Keterangan Tambahan</Label>
              <Input
                id='sm-desk'
                value={scheduleForm.deskripsi}
                onChange={(e) => setScheduleForm({ ...scheduleForm, deskripsi: e.target.value })}
                placeholder='Disertai Sekolah Minggu anak'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setScheduleModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveSchedule}>Simpan Jadwal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QUICK ACTION MODAL ─────────────────────────────────────── */}
      <Dialog open={quickActionModalOpen} onOpenChange={setQuickActionModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit Tombol Cepat</DialogTitle>
            <DialogDescription>
              Kustomisasi judul, tautan halaman, dan ikon tombol aksi cepat.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='qam-title'>Judul Tombol</Label>
              <Input
                id='qam-title'
                value={quickActionForm.title}
                onChange={(e) => setQuickActionForm({ ...quickActionForm, title: e.target.value })}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='qam-desc'>Deskripsi Singkat</Label>
              <Input
                id='qam-desc'
                value={quickActionForm.description}
                onChange={(e) => setQuickActionForm({ ...quickActionForm, description: e.target.value })}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='qam-url'>URL Tujuan</Label>
              <Input
                id='qam-url'
                value={quickActionForm.linkUrl}
                onChange={(e) => setQuickActionForm({ ...quickActionForm, linkUrl: e.target.value })}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='qam-icon'>Pilihan Ikon</Label>
              <Select
                value={quickActionForm.icon}
                onValueChange={(val) =>
                  setQuickActionForm({ ...quickActionForm, icon: val as QuickActionIcon })
                }
              >
                <SelectTrigger id='qam-icon'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='HeartHandshake'>HeartHandshake (Doa/Pelayanan)</SelectItem>
                  <SelectItem value='BookOpen'>BookOpen (Firman/Artikel)</SelectItem>
                  <SelectItem value='Video'>Video (Zoom/Live)</SelectItem>
                  <SelectItem value='Calendar'>Calendar (Jadwal/Event)</SelectItem>
                  <SelectItem value='UserPlus'>UserPlus (Pendaftaran Jemaat)</SelectItem>
                  <SelectItem value='Search'>Search (Verifikasi NIJ)</SelectItem>
                  <SelectItem value='Users'>Users (Komunitas/Struktur)</SelectItem>
                  <SelectItem value='MapPin'>MapPin (Lokasi/Tentang)</SelectItem>
                  <SelectItem value='Phone'>Phone (Hotline)</SelectItem>
                  <SelectItem value='ShieldCheck'>ShieldCheck (Keamanan)</SelectItem>
                  <SelectItem value='QrCode'>QrCode (Scan QR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setQuickActionModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveQuickAction}>Simpan Tombol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ZOOM MODAL ─────────────────────────────────────────────── */}
      <Dialog open={zoomModalOpen} onOpenChange={setZoomModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingZoomIndex !== null ? 'Edit Sesi Zoom' : 'Tambah Sesi Zoom'}
            </DialogTitle>
            <DialogDescription>
              Isi data sesi persekutuan virtual atau menara doa online.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='zmm-title'>Nama Persekutuan / Doa</Label>
              <Input
                id='zmm-title'
                value={zoomForm.title}
                onChange={(e) => setZoomForm({ ...zoomForm, title: e.target.value })}
                placeholder='Doa Fajar Online'
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='zmm-jam'>Hari & Waktu</Label>
              <Input
                id='zmm-jam'
                value={zoomForm.hariJam}
                onChange={(e) => setZoomForm({ ...zoomForm, hariJam: e.target.value })}
                placeholder='Senin – Sabtu, 05.00 WIB'
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='zmm-desc'>Keterangan Singkat</Label>
              <Input
                id='zmm-desc'
                value={zoomForm.deskripsi}
                onChange={(e) => setZoomForm({ ...zoomForm, deskripsi: e.target.value })}
                placeholder='Mezbah doa bersama jemaat'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='zmm-id'>Meeting ID</Label>
                <Input
                  id='zmm-id'
                  value={zoomForm.meetingId}
                  onChange={(e) => setZoomForm({ ...zoomForm, meetingId: e.target.value })}
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='zmm-pass'>Passcode</Label>
                <Input
                  id='zmm-pass'
                  value={zoomForm.passcode}
                  onChange={(e) => setZoomForm({ ...zoomForm, passcode: e.target.value })}
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='zmm-url'>URL Link Langsung</Label>
              <Input
                id='zmm-url'
                value={zoomForm.linkUrl}
                onChange={(e) => setZoomForm({ ...zoomForm, linkUrl: e.target.value })}
                placeholder='https://zoom.us/j/...'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setZoomModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveZoom}>Simpan Sesi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RESET CONFIRMATION ALERT ───────────────────────────────── */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset ke Pengaturan Awal?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus kustomisasi landing page di database dan mengembalikannya ke pengaturan bawaan awal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setResetDialogOpen(false)} disabled={resetting}>
              Batal
            </Button>
            <Button
              variant='destructive'
              onClick={handleReset}
              disabled={resetting}
              className='gap-1.5'
            >
              {resetting && <Loader2 className='size-3.5 animate-spin' />}
              Ya, Reset Sekarang
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
