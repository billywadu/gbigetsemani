'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  Sparkles,
  Info,
  Check,
  Loader2,
  Plus,
  Edit2,
  Tag,
  Building,
  Zap,
  HelpCircle,
  Timer,
  ChevronRight,
  ExternalLink,
  Upload,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createEventAction,
  updateEventAction,
  uploadEventThumbnailAction,
  EventDTO,
} from '@/actions/event'
import { EventKategori } from '@/lib/validations/event'
import { toast } from 'sonner'

interface EventFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventToEdit?: EventDTO | null
  onSuccess?: () => void
}

export function EventFormDialog({
  open,
  onOpenChange,
  eventToEdit,
  onSuccess,
}: EventFormDialogProps) {
  const isEditing = !!eventToEdit
  const [activeTab, setActiveTab] = useState('info')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  // Form States - Tab 1: Info Event
  const [namaEvent, setNamaEvent] = useState('')
  const [kategori, setKategori] = useState<EventKategori>('IBADAH_RAYA')
  const [deskripsi, setDeskripsi] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')

  // Waktu Event
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('11:00')

  // Tab 2: Jendela Presensi (Check-in Window)
  const [checkInOpenDate, setCheckInOpenDate] = useState('')
  const [checkInOpenTime, setCheckInOpenTime] = useState('08:30')
  const [checkInCloseDate, setCheckInCloseDate] = useState('')
  const [checkInCloseTime, setCheckInCloseTime] = useState('12:00')

  // Tab 3: Lokasi
  const [namaLokasi, setNamaLokasi] = useState('Main Sanctuary (Gedung Utama Lt. 2)')
  const [alamatLokasi, setAlamatLokasi] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize or Reset Form
  useEffect(() => {
    if (eventToEdit) {
      setNamaEvent(eventToEdit.namaEvent || '')
      setKategori(eventToEdit.kategori || 'IBADAH_RAYA')
      setDeskripsi(eventToEdit.deskripsi || '')
      setThumbnailUrl(eventToEdit.thumbnailUrl || '')
      setNamaLokasi(eventToEdit.namaLokasi || eventToEdit.lokasi || 'Main Sanctuary')
      setAlamatLokasi(eventToEdit.alamatLokasi || '')

      // Start Time
      if (eventToEdit.tanggalMulai) {
        const d = new Date(eventToEdit.tanggalMulai)
        if (!isNaN(d.getTime())) {
          setStartDate(d.toISOString().split('T')[0])
          setStartTime(d.toTimeString().slice(0, 5))
        }
      }

      // End Time
      if (eventToEdit.tanggalSelesai) {
        const d = new Date(eventToEdit.tanggalSelesai)
        if (!isNaN(d.getTime())) {
          setEndDate(d.toISOString().split('T')[0])
          setEndTime(d.toTimeString().slice(0, 5))
        }
      } else if (eventToEdit.tanggalMulai) {
        const d = new Date(eventToEdit.tanggalMulai)
        setEndDate(d.toISOString().split('T')[0])
        setEndTime('11:00')
      }

      // Check-in Window Open
      if (eventToEdit.presensiBuka) {
        const d = new Date(eventToEdit.presensiBuka)
        if (!isNaN(d.getTime())) {
          setCheckInOpenDate(d.toISOString().split('T')[0])
          setCheckInOpenTime(d.toTimeString().slice(0, 5))
        }
      }

      // Check-in Window Close
      if (eventToEdit.presensiTutup) {
        const d = new Date(eventToEdit.presensiTutup)
        if (!isNaN(d.getTime())) {
          setCheckInCloseDate(d.toISOString().split('T')[0])
          setCheckInCloseTime(d.toTimeString().slice(0, 5))
        }
      }
    } else {
      // Default Values for New Event
      const today = new Date().toISOString().split('T')[0]
      setNamaEvent('')
      setKategori('IBADAH_RAYA')
      setDeskripsi('')
      setThumbnailUrl('')
      setStartDate(today)
      setStartTime('09:00')
      setEndDate(today)
      setEndTime('11:00')
      setCheckInOpenDate(today)
      setCheckInOpenTime('08:30')
      setCheckInCloseDate(today)
      setCheckInCloseTime('12:00')
      setNamaLokasi('Main Sanctuary (Gedung Utama Lt. 2)')
      setAlamatLokasi('')
    }
    setActiveTab('info')
  }, [eventToEdit, open])

  // File Upload Handler (Local Filesystem)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validasi Ukuran (Maks 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran berkas melebihi batas maksimum 5 MB.')
      return
    }

    setIsUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await uploadEventThumbnailAction(formData)
      if (res.success && res.data?.fileUrl) {
        setThumbnailUrl(res.data.fileUrl)
        toast.success('Poster event berhasil diunggah!')
      } else {
        toast.error(res.error || 'Gagal mengunggah berkas poster.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah file poster.')
    } finally {
      setIsUploadingFile(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Smart Preset: Auto-fill Check-In Window (-30 min before start, +45 min after end)
  const handleAutoFillCheckIn = () => {
    if (!startDate || !startTime) {
      toast.error('Pilih tanggal dan jam mulai event terlebih dahulu!')
      return
    }

    try {
      const start = new Date(`${startDate}T${startTime}:00`)
      const end = endDate && endTime ? new Date(`${endDate}T${endTime}:00`) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

      // Open: -30 mins
      const openTimeDate = new Date(start.getTime() - 30 * 60 * 1000)
      // Close: +45 mins after end
      const closeTimeDate = new Date(end.getTime() + 45 * 60 * 1000)

      setCheckInOpenDate(openTimeDate.toISOString().split('T')[0])
      setCheckInOpenTime(openTimeDate.toTimeString().slice(0, 5))

      setCheckInCloseDate(closeTimeDate.toISOString().split('T')[0])
      setCheckInCloseTime(closeTimeDate.toTimeString().slice(0, 5))

      if (!endDate) {
        setEndDate(end.toISOString().split('T')[0])
        setEndTime(end.toTimeString().slice(0, 5))
      }

      toast.success('Jendela waktu presensi berhasil diatur otomatis (-30 mnt s/d +45 mnt)!')
    } catch {
      toast.error('Format tanggal/jam tidak valid.')
    }
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!namaEvent.trim()) {
      toast.error('Nama event wajib diisi!')
      setActiveTab('info')
      return
    }
    if (!startDate) {
      toast.error('Tanggal mulai event wajib diisi!')
      setActiveTab('info')
      return
    }

    const startDateTime = new Date(`${startDate}T${startTime || '00:00'}:00`)
    const endDateTime = endDate ? new Date(`${endDate}T${endTime || '00:00'}:00`) : null
    const checkInOpenDateTime = checkInOpenDate ? new Date(`${checkInOpenDate}T${checkInOpenTime || '00:00'}:00`) : null
    const checkInCloseDateTime = checkInCloseDate ? new Date(`${checkInCloseDate}T${checkInCloseTime || '00:00'}:00`) : null

    setIsSubmitting(true)
    try {
      if (isEditing && eventToEdit) {
        const res = await updateEventAction({
          id: eventToEdit.id,
          namaEvent: namaEvent.trim(),
          kategori,
          tanggalMulai: startDateTime,
          tanggalSelesai: endDateTime,
          presensiBuka: checkInOpenDateTime,
          presensiTutup: checkInCloseDateTime,
          namaLokasi: namaLokasi.trim(),
          alamatLokasi: alamatLokasi.trim() || null,
          lokasi: namaLokasi.trim(),
          thumbnailUrl: thumbnailUrl.trim() || null,
          deskripsi: deskripsi.trim() || null,
        })

        if (res.success) {
          toast.success(res.message || 'Event berhasil diperbarui!')
          onOpenChange(false)
          onSuccess?.()
        } else {
          toast.error(res.error || 'Gagal memperbarui event.')
        }
      } else {
        const res = await createEventAction({
          namaEvent: namaEvent.trim(),
          kategori,
          tanggalMulai: startDateTime,
          tanggalSelesai: endDateTime,
          presensiBuka: checkInOpenDateTime,
          presensiTutup: checkInCloseDateTime,
          namaLokasi: namaLokasi.trim(),
          alamatLokasi: alamatLokasi.trim() || null,
          lokasi: namaLokasi.trim(),
          thumbnailUrl: thumbnailUrl.trim() || null,
          deskripsi: deskripsi.trim() || null,
        })

        if (res.success) {
          toast.success(res.message || 'Event baru berhasil dibuat!')
          onOpenChange(false)
          onSuccess?.()
        } else {
          toast.error(res.error || 'Gagal membuat event.')
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border shadow-2xl'>
        <form onSubmit={handleSubmit} className='flex flex-col h-full overflow-hidden'>
          {/* Header */}
          <DialogHeader className='p-3.5 sm:px-6 sm:py-3.5 border-b bg-card shrink-0 pe-10 text-left'>
            <DialogTitle className='text-sm sm:text-base font-bold flex items-center gap-2 text-foreground'>
              {isEditing ? (
                <>
                  <Edit2 className='size-4 text-primary shrink-0' /> Edit Event
                </>
              ) : (
                <>
                  <Plus className='size-4 text-primary shrink-0' /> Tambah Event Baru
                </>
              )}
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
              Kelola jadwal ibadah, presensi QR, dan lokasi.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs & Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className='flex flex-col flex-1 overflow-hidden'>
            <div className='px-3 sm:px-6 pt-2.5 pb-2 border-b bg-muted/20 shrink-0'>
              <TabsList className='grid grid-cols-3 w-full h-9 p-1'>
                <TabsTrigger value='info' className='text-xs font-semibold gap-1 px-1.5 sm:px-3'>
                  <Info className='size-3.5 shrink-0' />
                  <span className='hidden sm:inline'>Informasi Event</span>
                  <span className='sm:hidden'>Info</span>
                </TabsTrigger>
                <TabsTrigger value='presensi' className='text-xs font-semibold gap-1 px-1.5 sm:px-3'>
                  <Timer className='size-3.5 shrink-0' />
                  <span className='hidden sm:inline'>Waktu Presensi</span>
                  <span className='sm:hidden'>Presensi</span>
                </TabsTrigger>
                <TabsTrigger value='lokasi' className='text-xs font-semibold gap-1 px-1.5 sm:px-3'>
                  <MapPin className='size-3.5 shrink-0' />
                  <span className='hidden sm:inline'>Lokasi Ruangan</span>
                  <span className='sm:hidden'>Lokasi</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className='flex-1 overflow-y-auto p-4 sm:p-6 text-xs'>
              {/* ── TAB 1: INFORMASI EVENT ─────────────────────────── */}
              <TabsContent value='info' className='mt-0 space-y-4 focus-visible:outline-none'>
                {/* Nama Event */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-foreground'>
                    Nama Event / Ibadah <span className='text-rose-500'>*</span>
                  </Label>
                  <Input
                    required
                    placeholder='Contoh: Ibadah Raya 1 (Pagi) - Minggu Kasih Karunia'
                    value={namaEvent}
                    onChange={(e) => setNamaEvent(e.target.value)}
                    className='text-xs h-9 font-medium'
                  />
                </div>

                {/* Kategori Event */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-foreground'>
                    Kategori Event <span className='text-rose-500'>*</span>
                  </Label>
                  <Select value={kategori} onValueChange={(val: any) => setKategori(val)}>
                    <SelectTrigger className='text-xs h-9'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='IBADAH_RAYA'>Ibadah Raya Mingguan</SelectItem>
                      <SelectItem value='KOMSEL'>Komsel / Persekutuan Doa</SelectItem>
                      <SelectItem value='YOUTH'>Youth & Teens Service</SelectItem>
                      <SelectItem value='SEMINAR'>Seminar / Workshop Rohani</SelectItem>
                      <SelectItem value='SEKOLAH_MINGGU'>Sekolah Minggu (Kids)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Waktu Mulai & Selesai Event (Stacked Full Width Rows) */}
                <div className='space-y-3 pt-1'>
                  {/* Waktu Mulai (Baris 1) */}
                  <div className='space-y-1.5 min-w-0'>
                    <Label className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                      <Calendar className='size-3.5 text-primary' /> Tanggal &amp; Jam Mulai <span className='text-rose-500'>*</span>
                    </Label>
                    <div className='flex items-center gap-2 w-full min-w-0'>
                      <Input
                        type='date'
                        required
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value)
                          if (!endDate) setEndDate(e.target.value)
                          if (!checkInOpenDate) setCheckInOpenDate(e.target.value)
                          if (!checkInCloseDate) setCheckInCloseDate(e.target.value)
                        }}
                        className='text-xs h-9 flex-1 min-w-0'
                      />
                      <Input
                        type='time'
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className='text-xs h-9 w-24 sm:w-28 shrink-0'
                      />
                    </div>
                  </div>

                  {/* Waktu Selesai (Baris 2) */}
                  <div className='space-y-1.5 min-w-0'>
                    <Label className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                      <Clock className='size-3.5 text-primary' /> Tanggal &amp; Jam Selesai
                    </Label>
                    <div className='flex items-center gap-2 w-full min-w-0'>
                      <Input
                        type='date'
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className='text-xs h-9 flex-1 min-w-0'
                      />
                      <Input
                        type='time'
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className='text-xs h-9 w-24 sm:w-28 shrink-0'
                      />
                    </div>
                  </div>
                </div>

                {/* Poster Banner Local File Upload */}
                <div className='space-y-2 pt-1'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                      <ImageIcon className='size-3.5 text-primary' /> Poster / Banner Acara
                    </Label>
                    <span className='text-[10px] text-muted-foreground'>Maks. 5 MB (JPG, PNG, WebP)</span>
                  </div>

                  {/* Hidden Native File Input */}
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/jpeg,image/png,image/webp'
                    className='hidden'
                    onChange={handleFileSelect}
                  />

                  {thumbnailUrl ? (
                    <div className='relative rounded-xl overflow-hidden border bg-muted/30 group'>
                      <div className='h-36 sm:h-44 w-full bg-black/10 flex items-center justify-center overflow-hidden'>
                        <img
                          src={thumbnailUrl}
                          alt='Preview Poster'
                          className='w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300'
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      </div>
                      <div className='p-2.5 bg-card/95 backdrop-blur border-t flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2 truncate text-xs text-muted-foreground min-w-0'>
                          <Check className='size-3.5 text-emerald-600 shrink-0' />
                          <span className='truncate font-mono text-[11px]'>{thumbnailUrl}</span>
                        </div>
                        <div className='flex items-center gap-1.5 shrink-0'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={isUploadingFile}
                            onClick={() => fileInputRef.current?.click()}
                            className='h-7 px-2 text-xs gap-1'
                          >
                            {isUploadingFile ? <Loader2 className='size-3 animate-spin' /> : <RefreshCw className='size-3' />}
                            <span>Ganti</span>
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            disabled={isUploadingFile}
                            onClick={() => setThumbnailUrl('')}
                            className='h-7 px-2 text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700'
                          >
                            <Trash2 className='size-3' />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all hover:bg-primary/5 hover:border-primary/40 flex flex-col items-center justify-center gap-2 ${
                        isUploadingFile ? 'opacity-50 pointer-events-none' : 'border-border/80 bg-muted/10'
                      }`}
                    >
                      <div className='size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center'>
                        {isUploadingFile ? (
                          <Loader2 className='size-5 animate-spin' />
                        ) : (
                          <Upload className='size-5' />
                        )}
                      </div>
                      <div>
                        <div className='text-xs font-bold text-foreground'>
                          {isUploadingFile ? 'Sedang Mengunggah Berkas...' : 'Unggah Poster dari Komputer / Perangkat'}
                        </div>
                        <p className='text-[11px] text-muted-foreground mt-0.5'>
                          Klik di sini untuk memilih file gambar (JPG, PNG, atau WebP)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Deskripsi */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-foreground'>Deskripsi / Keterangan Acara</Label>
                  <Textarea
                    placeholder='Informasi tema khotbah, pembicara tamu, dress code, atau catatan pengerja...'
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    className='text-xs min-h-16 resize-none'
                  />
                </div>
              </TabsContent>

              {/* ── TAB 2: JENDELA WAKTU PRESENSI ──────────────────── */}
              <TabsContent value='presensi' className='mt-0 space-y-4 focus-visible:outline-none'>
                {/* Banner Helper Auto Preset */}
                <div className='p-3.5 bg-primary/5 rounded-xl border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5'>
                  <div className='space-y-0.5'>
                    <div className='font-bold text-foreground flex items-center gap-1.5 text-xs'>
                      <Timer className='size-3.5 text-primary' /> Jendela Waktu Presensi QR
                    </div>
                    <p className='text-[11px] text-muted-foreground'>
                      Scanner presensi otomatis aktif pada rentang waktu buka s/d tutup berikut.
                    </p>
                  </div>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={handleAutoFillCheckIn}
                    className='h-7.5 px-3 text-xs font-semibold gap-1.5 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 shrink-0 w-full sm:w-auto justify-center'
                  >
                    <Zap className='size-3.5 text-amber-500' />
                    <span>Atur Otomatis</span>
                  </Button>
                </div>

                {/* Buka Presensi Row */}
                <div className='space-y-1.5 pt-1'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                      <div className='size-2 rounded-full bg-emerald-500' />
                      <span>Tanggal &amp; Jam Buka Presensi</span>
                    </Label>
                    <span className='text-[10.5px] text-muted-foreground'>Awal scanner aktif</span>
                  </div>
                  <div className='flex items-center gap-2 w-full min-w-0'>
                    <Input
                      type='date'
                      value={checkInOpenDate}
                      onChange={(e) => setCheckInOpenDate(e.target.value)}
                      className='text-xs h-9 flex-1 min-w-0'
                    />
                    <Input
                      type='time'
                      value={checkInOpenTime}
                      onChange={(e) => setCheckInOpenTime(e.target.value)}
                      className='text-xs h-9 w-24 sm:w-28 shrink-0'
                    />
                  </div>
                </div>

                {/* Tutup Presensi Row */}
                <div className='space-y-1.5 pt-1'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                      <div className='size-2 rounded-full bg-rose-500' />
                      <span>Tanggal &amp; Jam Tutup Presensi</span>
                    </Label>
                    <span className='text-[10.5px] text-muted-foreground'>Akhir scanner aktif</span>
                  </div>
                  <div className='flex items-center gap-2 w-full min-w-0'>
                    <Input
                      type='date'
                      value={checkInCloseDate}
                      onChange={(e) => setCheckInCloseDate(e.target.value)}
                      className='text-xs h-9 flex-1 min-w-0'
                    />
                    <Input
                      type='time'
                      value={checkInCloseTime}
                      onChange={(e) => setCheckInCloseTime(e.target.value)}
                      className='text-xs h-9 w-24 sm:w-28 shrink-0'
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ── TAB 3: LOKASI RUANGAN ──────────────────────────── */}
              <TabsContent value='lokasi' className='mt-0 space-y-4 focus-visible:outline-none'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-foreground'>
                    Nama Ruangan / Tempat Pelaksanaan <span className='text-rose-500'>*</span>
                  </Label>
                  <Input
                    required
                    placeholder='Contoh: Main Sanctuary (Gedung Utama Lt. 2) / Chapel Bethesda'
                    value={namaLokasi}
                    onChange={(e) => setNamaLokasi(e.target.value)}
                    className='text-xs h-9 font-medium'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-foreground'>
                    Alamat Lengkap &amp; Keterangan Akses (Opsional)
                  </Label>
                  <Textarea
                    placeholder='Contoh: Gedung Gereja Utama (Masuk melalui pintu lobby timur)'
                    value={alamatLokasi}
                    onChange={(e) => setAlamatLokasi(e.target.value)}
                    className='text-xs min-h-22.5'
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Responsive Footer Navigation */}
          <DialogFooter className='p-3 sm:px-6 sm:py-3.5 border-t bg-card shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2'>
            <div className='flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className='h-8.5 text-xs flex-1 sm:flex-none'
              >
                Batal
              </Button>
              {activeTab === 'info' && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setActiveTab('presensi')}
                  className='h-8.5 text-xs gap-1 font-semibold text-primary hover:text-primary flex-1 sm:flex-none justify-center'
                >
                  <span>Presensi</span>
                  <ChevronRight className='size-3.5' />
                </Button>
              )}
              {activeTab === 'presensi' && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setActiveTab('lokasi')}
                  className='h-8.5 text-xs gap-1 font-semibold text-primary hover:text-primary flex-1 sm:flex-none justify-center'
                >
                  <span>Lokasi</span>
                  <ChevronRight className='size-3.5' />
                </Button>
              )}
            </div>

            <Button
              type='submit'
              size='sm'
              disabled={isSubmitting || !namaEvent.trim()}
              className='h-8.5 text-xs gap-1.5 font-bold w-full sm:w-auto shrink-0'
            >
              {isSubmitting ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <Check className='size-3.5' />
              )}
              <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Jadwal Event'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
