'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  QrCode,
  ArrowLeft,
  Users,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Sparkles,
  Keyboard,
  Clock,
  UserCheck,
  Building,
  Volume2,
  UserPlus,
  Phone,
  MessageSquare,
  Search,
  Hash,
  Edit2,
  Check,
  Plus,
  Minus,
  HelpCircle,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  getEventByIdAction,
  scanAttendanceAction,
  recordGuestAttendanceAction,
  searchJemaatForAttendanceAction,
  recordAttendanceByIdAction,
  updateEventHeadcountAction,
  EventDTO,
  AttendanceResultDTO
} from '@/actions/event'
import { toast } from 'sonner'

export default function DedicatedScannerPage() {
  const params = useParams()
  const eventId = params?.id as string

  const [event, setEvent] = useState<EventDTO | null>(null)
  const [totalAttendance, setTotalAttendance] = useState<number>(0)
  const [guestCount, setGuestCount] = useState<number>(0)
  const [headcount, setHeadcount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<any>(null)
  const isProcessingRef = useRef(false)

  // Manual & Hardware barcode input
  const [manualBarcode, setManualBarcode] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  // Omni-Search State (Name, NIJ, Phone)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Headcount Modal State
  const [headcountModalOpen, setHeadcountModalOpen] = useState(false)
  const [headcountInput, setHeadcountInput] = useState<number>(0)
  const [isSavingHeadcount, setIsSavingHeadcount] = useState(false)

  // Quick Guest Registration Modal State
  const [guestModalOpen, setGuestModalOpen] = useState(false)
  const [guestNama, setGuestNama] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestGender, setGuestGender] = useState<'LAK_LAKI' | 'PEREMPUAN'>('LAK_LAKI')
  const [guestNotes, setGuestNotes] = useState('')
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false)

  // Scan Result Feedback State
  const [scanResult, setScanResult] = useState<{
    status: 'SUCCESS' | 'DUPLICATE' | 'ERROR'
    message: string
    data?: AttendanceResultDTO
    isGuest?: boolean
    guestPhone?: string
  } | null>(null)

  const resetTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch Event Initial Data
  const loadEvent = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    const res = await getEventByIdAction(eventId)
    if (res.success && res.data) {
      setEvent(res.data.event)
      setTotalAttendance(res.data.totalAttendance)
      setGuestCount(res.data.event.guestAttendanceCount || 0)
      setHeadcount(res.data.event.manualHeadcount || 0)
      setHeadcountInput(res.data.event.manualHeadcount || res.data.totalAttendance || 0)
    } else {
      toast.error(res.error || 'Event tidak ditemukan.')
    }
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  // Debounced Omni-Search for Jemaat
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true)
        const res = await searchJemaatForAttendanceAction(searchQuery.trim())
        if (res.success && res.data) {
          setSearchResults(res.data)
          setSearchOpen(true)
        }
        setIsSearching(false)
      } else {
        setSearchResults([])
        setSearchOpen(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Core Scan Processor (Barcode/QR)
  const processBarcodeScan = useCallback(
    async (barcode: string) => {
      if (!barcode || !eventId || isProcessingRef.current) return

      isProcessingRef.current = true
      setIsScanning(true)

      try {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current)

        const res = await scanAttendanceAction({
          eventId,
          barcodeCode: barcode,
        })

        if (res.success && res.data) {
          if (res.idempotent) {
            setScanResult({
              status: 'DUPLICATE',
              message: res.message || 'Presensi sudah tercatat sebelumnya.',
              data: res.data,
            })
            playAudioFeedback('duplicate')
          } else {
            setTotalAttendance((prev) => prev + 1)
            setScanResult({
              status: 'SUCCESS',
              message: res.message || 'Presensi berhasil dicatat.',
              data: res.data,
            })
            playAudioFeedback('success')
          }
        } else {
          setScanResult({
            status: 'ERROR',
            message: res.message || 'Barcode / Kartu Jemaat tidak terdaftar.',
          })
          playAudioFeedback('error')
        }
      } catch (err: any) {
        setScanResult({
          status: 'ERROR',
          message: err?.message || 'Terjadi kesalahan sistem scanner.',
        })
        playAudioFeedback('error')
      } finally {
        setIsScanning(false)
        isProcessingRef.current = false

        // Auto-reset feedback banner after 3.5s for seamless continuous scanning
        resetTimerRef.current = setTimeout(() => {
          setScanResult(null)
        }, 3500)
      }
    },
    [eventId]
  )

  // Record Attendance by Selecting Jemaat from Omni-Search
  const handleSelectJemaat = async (jemaat: any) => {
    setSearchOpen(false)
    setSearchQuery('')
    setIsScanning(true)

    try {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)

      const res = await recordAttendanceByIdAction({
        eventId,
        jemaatId: jemaat.id,
      })

      if (res.success && res.data) {
        if (res.idempotent) {
          setScanResult({
            status: 'DUPLICATE',
            message: res.message,
            data: res.data,
          })
          playAudioFeedback('duplicate')
        } else {
          setTotalAttendance((prev) => prev + 1)
          setScanResult({
            status: 'SUCCESS',
            message: res.message,
            data: res.data,
          })
          playAudioFeedback('success')
        }
      } else {
        toast.error(res.message || 'Gagal mencatat presensi jemaat.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan.')
    } finally {
      setIsScanning(false)
      resetTimerRef.current = setTimeout(() => {
        setScanResult(null)
      }, 3500)
    }
  }

  // Save Headcount Submit Handler
  const handleSaveHeadcount = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingHeadcount(true)
    try {
      const res = await updateEventHeadcountAction({
        eventId,
        manualHeadcount: Math.max(0, Number(headcountInput)),
      })

      if (res.success) {
        setHeadcount(Math.max(0, Number(headcountInput)))
        toast.success(res.message)
        setHeadcountModalOpen(false)
      } else {
        toast.error(res.message || 'Gagal menyimpan headcount.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan saat menyimpan headcount.')
    } finally {
      setIsSavingHeadcount(false)
    }
  }

  // Guest Registration Submit Handler
  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestNama.trim()) {
      toast.error('Nama tamu wajib diisi.')
      return
    }

    setIsSubmittingGuest(true)
    try {
      const res = await recordGuestAttendanceAction({
        eventId,
        nama: guestNama.trim(),
        jenisKelamin: guestGender,
        noHp: guestPhone.trim() || undefined,
        whatsApp: guestPhone.trim() || undefined,
        catatan: guestNotes.trim() || undefined,
      })

      if (res.success && res.data) {
        setTotalAttendance((prev) => prev + 1)
        setGuestCount((prev) => prev + 1)
        toast.success(res.message)

        setScanResult({
          status: 'SUCCESS',
          message: `Tamu Baru: ${res.data.nama} berhasil dicatat hadir.`,
          data: {
            attendanceId: res.data.tamuId,
            jemaatId: res.data.tamuId,
            nama: res.data.nama,
            nij: 'TAMU BARU',
            barcodeCode: '-',
            statusJemaat: 'TAMU',
            scannedAt: new Date().toISOString(),
            idempotent: false,
          },
          isGuest: true,
          guestPhone: res.data.whatsApp || undefined,
        })
        playAudioFeedback('success')

        // Reset form & close dialog
        setGuestNama('')
        setGuestPhone('')
        setGuestGender('LAK_LAKI')
        setGuestNotes('')
        setGuestModalOpen(false)
      } else {
        toast.error(res.message || 'Gagal mencatat kehadiran tamu.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan saat mencatat tamu.')
    } finally {
      setIsSubmittingGuest(false)
    }
  }

  // Quick WhatsApp Greeting Handler for Guest
  const handleSendGuestGreeting = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Syalom Bapak/Ibu/Sdr. ${name}, terima kasih telah hadir beribadah bersama kami di ${event?.namaEvent || 'GBI Getsemani Padang'} hari ini. Kiranya hadirat Tuhan senantiasa memberkati dan menjadi berkat bagi kehidupan Anda!`
    )
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank')
  }

  // Hardware Wedge Barcode Scanner Listener (Keyboard buffer)
  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      const currentTime = Date.now()
      if (currentTime - lastKeyTime > 100) {
        buffer = ''
      }
      lastKeyTime = currentTime

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          processBarcodeScan(buffer)
          buffer = ''
        }
      } else if (e.key.length === 1) {
        buffer += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [processBarcodeScan])

  // Camera Scanner Initializer
  const startCamera = async () => {
    setCameraError(null)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode('camera-reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (!isProcessingRef.current) {
            processBarcodeScan(decodedText)
          }
        },
        () => {}
      )
      setCameraActive(true)
    } catch (err: any) {
      console.error('Camera Scanner Error:', err)
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan atau gunakan scanner hardware / input manual.')
      setCameraActive(false)
    }
  }

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (err) {
        console.error('Error stopping camera:', err)
      }
      scannerRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  // Audio Feedback Synthesizer
  const playAudioFeedback = (type: 'success' | 'duplicate' | 'error') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime)
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      } else if (type === 'duplicate') {
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime)
        gain.gain.setValueAtTime(0.4, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      }
    } catch {}
  }

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualBarcode.trim()) return
    processBarcodeScan(manualBarcode.trim())
    setManualBarcode('')
  }

  if (loading && !event) {
    return (
      <div className='min-h-svh bg-background flex flex-col justify-center items-center p-4 text-center space-y-3'>
        <Loader2 className='size-6 animate-spin text-primary' /> Memuat terminal scanner presensi...
      </div>
    )
  }

  if (!event) {
    return (
      <div className='min-h-svh bg-background flex flex-col justify-center items-center p-4 text-center space-y-4'>
        <h2 className='text-xl font-bold text-rose-600'>Event Tidak Ditemukan</h2>
        <Button asChild>
          <Link href='/dashboard/event'>Kembali ke Daftar Event</Link>
        </Button>
      </div>
    )
  }

  const jemaatTetapCount = Math.max(0, totalAttendance - guestCount)
  const reconciliationRate = headcount > 0 ? Math.min(100, Math.round((totalAttendance / headcount) * 100)) : 0

  return (
    <div className='min-h-svh bg-muted/20 flex flex-col items-center p-3 sm:p-6'>
      {/* Top Header Bar */}
      <div className='w-full max-w-xl flex items-center justify-between pb-3 border-b'>
        <Button asChild variant='ghost' size='sm' className='gap-1.5 text-xs h-8'>
          <Link href={`/dashboard/event/${event.id}`}>
            <ArrowLeft className='size-4' /> Kembali ke Rekap Event
          </Link>
        </Button>
        <ThemeSwitch />
      </div>

      <div className='w-full max-w-xl space-y-4 mt-3'>
        {/* Event Header & Live Attendance Reconciliation Card */}
        <Card className='shadow-sm bg-card border-primary/20'>
          <CardHeader className='pb-2 pt-4 px-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5 text-primary text-xs font-semibold uppercase'>
                <Building className='size-3.5' /> GBI Getsemani Padang
              </div>
              <Badge variant='outline' className='font-mono text-xs bg-primary/10 text-primary border-primary/30'>
                {event.kategori}
              </Badge>
            </div>
            <CardTitle className='text-xl font-bold tracking-tight'>{event.namaEvent}</CardTitle>
            <CardDescription className='text-xs text-muted-foreground flex items-center gap-1'>
              <Clock className='size-3 text-primary' />
              <span>
                {new Date(event.tanggal).toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                WIB
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className='pb-4 px-4 pt-1 space-y-3'>
            {/* Dual Metrics: Headcount Fisik vs Scan Terdata */}
            <div className='grid grid-cols-2 gap-2.5'>
              {/* Box 1: Headcount Fisik Usher */}
              <div
                onClick={() => setHeadcountModalOpen(true)}
                className='p-3 bg-muted/40 hover:bg-muted/60 border border-border/80 rounded-xl cursor-pointer transition-all flex flex-col justify-between group shadow-2xs'
                title='Klik untuk mengubah jumlah fisik yang dihitung usher'
              >
                <div className='flex items-center justify-between text-[11px] text-muted-foreground font-medium'>
                  <span>Headcount Fisik</span>
                  <Edit2 className='size-3 text-muted-foreground group-hover:text-primary transition-colors' />
                </div>
                <div className='flex items-baseline gap-1.5 mt-1'>
                  <span className='text-2xl font-black font-mono text-foreground'>
                    {headcount > 0 ? headcount : '-'}
                  </span>
                  <span className='text-[10px] text-muted-foreground'>Jiwa</span>
                </div>
                <div className='text-[9.5px] text-primary/80 font-medium truncate mt-0.5'>
                  {headcount > 0 ? `Akurasi scan: ${reconciliationRate}%` : 'Hitungan clicker usher'}
                </div>
              </div>

              {/* Box 2: Total Scan Terdata */}
              <div className='p-3 bg-primary/10 border border-primary/20 rounded-xl flex flex-col justify-between shadow-2xs'>
                <div className='text-[11px] text-primary font-medium flex items-center justify-between'>
                  <span>Scan Terdata</span>
                  <Users className='size-3.5' />
                </div>
                <div className='flex items-baseline gap-1.5 mt-1'>
                  <span className='text-2xl font-black font-mono text-primary'>
                    {totalAttendance}
                  </span>
                  <span className='text-[10px] text-primary/80'>Orang</span>
                </div>
                <div className='text-[9.5px] text-muted-foreground truncate mt-0.5 font-mono'>
                  {jemaatTetapCount} Tetap • {guestCount} Tamu
                </div>
              </div>
            </div>

            {/* Quick Action Buttons: Headcount Counter & Catat Tamu */}
            <div className='flex items-center gap-2 pt-1'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => setHeadcountModalOpen(true)}
                className='flex-1 h-8 text-xs font-semibold gap-1.5 justify-center shadow-2xs'
              >
                <Hash className='size-3.5 text-primary' />
                <span>Update Headcount ({headcount})</span>
              </Button>

              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => setGuestModalOpen(true)}
                className='flex-1 h-8 text-xs font-bold gap-1.5 justify-center bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 shadow-2xs'
              >
                <UserPlus className='size-3.5' />
                <span>+ Catat Tamu Baru</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Scan Result Feedback Banner */}
        {scanResult && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 shadow-sm transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
              scanResult.status === 'SUCCESS'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                : scanResult.status === 'DUPLICATE'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
            }`}
          >
            <div className='mt-0.5 shrink-0'>
              {scanResult.status === 'SUCCESS' && (
                <CheckCircle2 className='size-6 text-emerald-600 dark:text-emerald-400' />
              )}
              {scanResult.status === 'DUPLICATE' && (
                <AlertTriangle className='size-6 text-amber-600 dark:text-amber-400' />
              )}
              {scanResult.status === 'ERROR' && (
                <XCircle className='size-6 text-rose-600 dark:text-rose-400' />
              )}
            </div>
            <div className='flex-1 min-w-0 space-y-1 text-xs'>
              <div className='flex items-center justify-between gap-2'>
                <span className='font-bold uppercase tracking-wider text-[11px]'>
                  {scanResult.status === 'SUCCESS'
                    ? 'Presensi Berhasil'
                    : scanResult.status === 'DUPLICATE'
                    ? 'Sudah Terdata'
                    : 'Gagal Memindai'}
                </span>
                {scanResult.isGuest && (
                  <Badge className='bg-primary text-primary-foreground text-[9.5px] font-mono'>
                    TAMU BARU
                  </Badge>
                )}
              </div>
              <div className='text-sm font-black text-foreground truncate'>
                {scanResult.data?.nama || scanResult.message}
              </div>
              {scanResult.data && (
                <div className='text-[11px] text-muted-foreground font-mono space-y-0.5'>
                  <div>NIJ / Status: <strong>{scanResult.data.nij}</strong></div>
                  <div>
                    Jam: {new Date(scanResult.data.scannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                  </div>
                </div>
              )}

              {/* Action for Guest WhatsApp Greeting */}
              {scanResult.isGuest && scanResult.guestPhone && (
                <div className='pt-1.5'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => handleSendGuestGreeting(scanResult.guestPhone!, scanResult.data?.nama || '')}
                    className='h-6.5 px-2 text-[10.5px] font-bold gap-1 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/20'
                  >
                    <MessageSquare className='size-3' /> Sapa via WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1. OMNI-SEARCH BAR (CARI VIA NAMA / NIJ / NO HP) */}
        <Card className='shadow-sm bg-card border-primary/20 relative' ref={searchContainerRef}>
          <CardHeader className='pb-2 pt-3 px-4'>
            <div className='flex items-center gap-2'>
              <Search className='size-4 text-primary' />
              <CardTitle className='text-sm font-bold'>Cari Jemaat Manual (Nama / NIJ / HP)</CardTitle>
            </div>
            <CardDescription className='text-xs'>
              Ketik nama jemaat, nomor induk (NIJ), atau nomor WhatsApp untuk presensi instan tanpa scan QR.
            </CardDescription>
          </CardHeader>
          <CardContent className='pb-4 px-4 relative'>
            <div className='relative'>
              <Search className='size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Cari nama jemaat, contoh: "Stefanus", "0812...", "JMT-..."'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setSearchOpen(true)
                }}
                className='text-xs h-9 pl-9 pr-8 shadow-2xs'
              />
              {isSearching && (
                <Loader2 className='size-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary' />
              )}
            </div>

            {/* Live Autocomplete Dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <div className='absolute z-50 left-4 right-4 mt-1 bg-popover border border-border/80 rounded-xl shadow-lg overflow-hidden divide-y text-xs animate-in fade-in zoom-in-95 duration-150'>
                {searchResults.map((j) => (
                  <div
                    key={j.id}
                    className='p-2.5 hover:bg-muted/60 transition-colors flex items-center justify-between gap-2.5 cursor-pointer'
                    onClick={() => handleSelectJemaat(j)}
                  >
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <div className='size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 font-mono'>
                        {j.nama.charAt(0)}
                      </div>
                      <div className='min-w-0'>
                        <div className='font-bold text-foreground truncate'>{j.nama}</div>
                        <div className='text-[10.5px] text-muted-foreground font-mono truncate'>
                          NIJ: {j.nij} • {j.noHp} {j.kategorial ? `• ${j.kategorial}` : ''}
                        </div>
                      </div>
                    </div>

                    <Button
                      type='button'
                      size='sm'
                      className='h-7 px-2.5 text-[11px] font-bold gap-1 bg-primary text-primary-foreground shrink-0 shadow-2xs'
                    >
                      <Plus className='size-3' /> Hadir
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className='absolute z-50 left-4 right-4 mt-1 p-3 bg-popover border rounded-xl shadow-lg text-center text-xs text-muted-foreground'>
                Tidak ditemukan jemaat dengan kata kunci "{searchQuery}".
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. CAMERA SCANNER VIEW AREA */}
        <Card className='shadow-sm bg-card'>
          <CardHeader className='pb-2 pt-3 px-4 flex flex-row items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Camera className='size-4 text-primary' />
              <CardTitle className='text-sm font-bold'>Pemindai Kamera Barcode / QR</CardTitle>
            </div>
            {cameraActive ? (
              <Button size='sm' variant='outline' onClick={stopCamera} className='h-7 text-xs gap-1 text-rose-600'>
                <CameraOff className='size-3.5' /> Matikan Kamera
              </Button>
            ) : (
              <Button size='sm' onClick={startCamera} className='h-7 text-xs gap-1 bg-primary text-primary-foreground'>
                <Camera className='size-3.5' /> Buka Kamera
              </Button>
            )}
          </CardHeader>
          <CardContent className='pb-4 px-4'>
            {cameraActive ? (
              <div className='overflow-hidden rounded-lg border bg-black relative min-h-[260px] flex items-center justify-center'>
                <div id='camera-reader' className='w-full' />
              </div>
            ) : (
              <div className='p-6 border border-dashed rounded-lg text-center space-y-2 bg-muted/20'>
                <QrCode className='size-12 text-muted-foreground mx-auto' />
                <p className='text-xs text-muted-foreground'>
                  Klik <strong>"Buka Kamera"</strong> untuk mengaktifkan pemindaian barcode/QR visual, atau gunakan scanner fisik.
                </p>
                {cameraError && <p className='text-xs text-rose-600 font-medium'>{cameraError}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. HARDWARE BARCODE INPUT FALLBACK */}
        <Card className='shadow-sm bg-card'>
          <CardHeader className='pb-2 pt-3 px-4'>
            <div className='flex items-center gap-2'>
              <Keyboard className='size-4 text-primary' />
              <CardTitle className='text-sm font-bold'>Input Laser Scanner / Barcode Fisik</CardTitle>
            </div>
          </CardHeader>
          <CardContent className='pb-4 px-4'>
            <form onSubmit={handleManualBarcodeSubmit} className='flex gap-2'>
              <Input
                placeholder='Scan atau masukkan kode barcode kartu (e.g. JMT-893201)...'
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className='text-xs h-9 font-mono'
                disabled={isScanning}
              />
              <Button type='submit' size='sm' disabled={isScanning || !manualBarcode.trim()} className='h-9 px-4'>
                {isScanning ? <Loader2 className='size-4 animate-spin' /> : 'Kirim'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* MODAL 1: UPDATE HEADCOUNT COUNTING USHER */}
      <Dialog open={headcountModalOpen} onOpenChange={setHeadcountModalOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Hash className='size-5 text-primary' /> Headcount Fisik Ruangan
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Masukkan jumlah fisik jemaat yang dihitung oleh petugas usher (menggunakan hand clicker counter).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveHeadcount} className='space-y-4 py-2'>
            <div className='flex items-center justify-center gap-3'>
              <Button
                type='button'
                variant='outline'
                size='icon'
                onClick={() => setHeadcountInput((prev) => Math.max(0, prev - 5))}
                className='size-10 rounded-xl'
                title='Kurang 5'
              >
                <Minus className='size-4' />
              </Button>

              <div className='flex-1 max-w-[140px] text-center'>
                <Input
                  type='number'
                  min='0'
                  value={headcountInput}
                  onChange={(e) => setHeadcountInput(Math.max(0, parseInt(e.target.value) || 0))}
                  className='text-2xl font-black font-mono text-center h-12 rounded-xl text-primary'
                  autoFocus
                />
                <span className='text-[10px] text-muted-foreground block mt-1 font-medium'>Total Jiwa di Ruangan</span>
              </div>

              <Button
                type='button'
                variant='outline'
                size='icon'
                onClick={() => setHeadcountInput((prev) => prev + 5)}
                className='size-10 rounded-xl'
                title='Tambah 5'
              >
                <Plus className='size-4' />
              </Button>
            </div>

            <div className='p-2.5 bg-muted/40 border rounded-lg text-[11px] text-muted-foreground space-y-1'>
              <div className='flex justify-between'>
                <span>Scan Terdata Saat Ini:</span>
                <strong className='font-mono text-foreground'>{totalAttendance} Orang</strong>
              </div>
              <div className='flex justify-between'>
                <span>Selisih Belum Scan:</span>
                <strong className='font-mono text-primary'>
                  {Math.max(0, headcountInput - totalAttendance)} Orang
                </strong>
              </div>
            </div>

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setHeadcountModalOpen(false)}
                disabled={isSavingHeadcount}
                className='h-8 text-xs'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isSavingHeadcount}
                className='h-8 text-xs gap-1.5 font-bold'
              >
                {isSavingHeadcount ? <Loader2 className='size-3.5 animate-spin' /> : <Check className='size-3.5' />}
                Simpan Headcount
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: QUICK GUEST ATTENDANCE DIALOG */}
      <Dialog open={guestModalOpen} onOpenChange={setGuestModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <UserPlus className='size-5 text-primary' /> Catat Pengunjung / Tamu Baru
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tamu akan otomatis tercatat hadir di event ini dan masuk ke pipeline <strong>Tamu &amp; Follow-Up Pastoral</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGuestSubmit} className='space-y-3 py-1'>
            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>Nama Lengkap Tamu *</Label>
              <Input
                required
                placeholder='Contoh: Bpk. Stefanus Robert'
                value={guestNama}
                onChange={(e) => setGuestNama(e.target.value)}
                className='h-8 text-xs'
              />
            </div>

            <div className='grid grid-cols-2 gap-2.5'>
              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>Jenis Kelamin</Label>
                <Select
                  value={guestGender}
                  onValueChange={(val: any) => setGuestGender(val)}
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='LAK_LAKI'>Laki-laki</SelectItem>
                    <SelectItem value='PEREMPUAN'>Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>No. WhatsApp / HP</Label>
                <Input
                  placeholder='0812xxxxxxxx'
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className='h-8 text-xs font-mono'
                />
              </div>
            </div>

            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>Catatan Singkat / Asal Kenalan</Label>
              <Input
                placeholder='Contoh: Diajak Sdr. Michael / Pengunjung dari luar kota'
                value={guestNotes}
                onChange={(e) => setGuestNotes(e.target.value)}
                className='h-8 text-xs'
              />
            </div>

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setGuestModalOpen(false)}
                disabled={isSubmittingGuest}
                className='h-8 text-xs'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isSubmittingGuest || !guestNama.trim()}
                className='h-8 text-xs gap-1.5 font-bold'
              >
                {isSubmittingGuest ? <Loader2 className='size-3.5 animate-spin' /> : <CheckCircle2 className='size-3.5' />}
                Simpan &amp; Catat Hadir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
