'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  QrCode,
  Search,
  Loader2,
  CheckCircle2,
  Download,
  Building,
  Tag,
  Phone,
  Edit2,
  Timer,
  Info,
  Hash,
  UserPlus,
  Plus,
  Minus,
  Check,
  UserCheck,
  RotateCw,
  Printer,
  FileSpreadsheet,
} from 'lucide-react'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EventFormDialog } from '@/components/event/event-form-dialog'
import {
  getEventByIdAction,
  updateEventHeadcountAction,
  recordAttendanceByIdAction,
  recordGuestAttendanceAction,
  searchJemaatForAttendanceAction,
  EventDTO,
  AttendanceResultDTO,
} from '@/actions/event'
import { EventKategori } from '@/lib/validations/event'
import { toast } from 'sonner'

export default function EventDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<EventDTO | null>(null)
  const [attendance, setAttendance] = useState<AttendanceResultDTO[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  // Reconciliation: Headcount Modal State
  const [headcountModalOpen, setHeadcountModalOpen] = useState(false)
  const [headcountInput, setHeadcountInput] = useState<number>(0)
  const [isSavingHeadcount, setIsSavingHeadcount] = useState(false)

  // Reconciliation: Manual Attendance Modal State
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [manualTab, setManualTab] = useState<'JEMAAT' | 'TAMU'>('JEMAAT')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [guestNama, setGuestNama] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestGender, setGuestGender] = useState<'LAK_LAKI' | 'PEREMPUAN'>('LAK_LAKI')
  const [guestNotes, setGuestNotes] = useState('')
  const [isSubmittingManual, setIsSubmittingManual] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getEventByIdAction(id)
    if (res.success && res.data) {
      setEvent(res.data.event)
      setAttendance(res.data.attendance)
      setHeadcountInput(res.data.event.manualHeadcount || 0)
    } else {
      toast.error(res.error || 'Event tidak ditemukan.')
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // Debounced Search for Manual Jemaat Recording
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true)
        const res = await searchJemaatForAttendanceAction(searchQuery.trim())
        if (res.success && res.data) {
          setSearchResults(res.data)
        }
        setIsSearching(false)
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Headcount Save Handler
  const handleSaveHeadcount = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingHeadcount(true)
    try {
      const res = await updateEventHeadcountAction({
        eventId: id,
        manualHeadcount: Math.max(0, Number(headcountInput)),
        isDashboardOverride: true,
      })
      if (res.success) {
        toast.success(res.message)
        setHeadcountModalOpen(false)
        fetchDetail()
      } else {
        toast.error(res.message || 'Gagal menyimpan headcount.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan.')
    } finally {
      setIsSavingHeadcount(false)
    }
  }

  // Manual Jemaat Attendance Handler
  const handleRecordJemaat = async (jemaatId: string, nama: string) => {
    setIsSubmittingManual(true)
    try {
      const res = await recordAttendanceByIdAction({
        eventId: id,
        jemaatId,
        isDashboardOverride: true,
        notes: 'Input Manual dari Dashboard Rekapan',
      })
      if (res.success) {
        toast.success(`Presensi "${nama}" berhasil dicatat!`)
        fetchDetail()
        setSearchQuery('')
        setSearchResults([])
      } else {
        toast.error(res.message || 'Gagal mencatat presensi jemaat.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan.')
    } finally {
      setIsSubmittingManual(false)
    }
  }

  // Manual Guest Attendance Handler
  const handleRecordGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestNama.trim()) {
      toast.error('Nama tamu wajib diisi.')
      return
    }
    setIsSubmittingManual(true)
    try {
      const res = await recordGuestAttendanceAction({
        eventId: id,
        nama: guestNama.trim(),
        jenisKelamin: guestGender,
        noHp: guestPhone.trim() || undefined,
        whatsApp: guestPhone.trim() || undefined,
        catatan: guestNotes.trim() || 'Tamu diinput dari Dashboard Rekapan',
        isDashboardOverride: true,
      })
      if (res.success) {
        toast.success(res.message)
        setGuestNama('')
        setGuestPhone('')
        setGuestGender('LAK_LAKI')
        setGuestNotes('')
        setManualModalOpen(false)
        fetchDetail()
      } else {
        toast.error(res.message || 'Gagal mencatat tamu baru.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan.')
    } finally {
      setIsSubmittingManual(false)
    }
  }

  // Official Event Attendance Report Print Generator (A4)
  const handlePrintAttendanceReport = async () => {
    if (!event) return
    const toastId = toast.loading('Menyiapkan lembar rekapitulasi presensi...')
    const printConfig = await getEffectivePrintConfig()
    toast.dismiss(toastId)

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const startDate = new Date(event.tanggalMulai || event.tanggal)
    const totalJemaat = attendance.filter((a) => a.statusJemaat !== 'TAMU').length
    const totalTamu = attendance.filter((a) => a.statusJemaat === 'TAMU').length

    const rowsHtml = attendance.map((item, idx) => {
      const scanTime = new Date(item.scannedAt)
      const isGuest = item.statusJemaat === 'TAMU' || item.nij === 'TAMU BARU'
      const timeStr = !isNaN(scanTime.getTime())
        ? scanTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        : '-'

      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700; color: #0f172a;">${item.nama}</td>
          <td style="font-family: monospace; font-size: 10px;">${item.nij}</td>
          <td style="font-family: monospace; font-size: 9.5px; color: #475569;">${item.barcodeCode}</td>
          <td style="text-align: center;">
            <span style="border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; background: ${isGuest ? '#eff6ff' : '#f0fdf4'}; color: ${isGuest ? '#1d4ed8' : '#15803d'};">
              ${isGuest ? 'TAMU BARU' : 'JEMAAT TETAP'}
            </span>
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 10px;">${timeStr}</td>
        </tr>
      `
    }).join('')

    const kopHtml = buildKopHtml(printConfig, {
      badgeText: 'LAPORAN REKAPITULASI PRESENSI KEHADIRAN',
      dateText: `EVENT: ${event.namaEvent.toUpperCase()}`,
    })

    const signaturesHtml = buildSignaturesHtml(printConfig, [
      { roleKey: 'sekretaris', customTitle: 'Petugas Presensi / Usher' },
      { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Sidang' },
    ])

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Rekap Presensi Event - ${event.namaEvent}</title>
        <style>
          @page {
            size: ${printConfig.options.ukuranKertasDefault || 'A4'} portrait;
            margin: 12mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            padding: 4px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .event-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 12px;
            font-size: 11px;
          }
          .meta-item {
            display: flex;
            gap: 6px;
          }
          .meta-label {
            color: #64748b;
            font-weight: 600;
            min-width: 110px;
          }
          .meta-val {
            font-weight: 700;
            color: #0f172a;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }
          .stat-card {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
          }
          .stat-lbl {
            font-size: 9px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
          }
          .stat-val {
            font-size: 14px;
            font-weight: 800;
            color: #1e3a8a;
            margin-top: 2px;
          }
          .attendance-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 20px;
          }
          .attendance-table th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            font-weight: 800;
            text-align: left;
          }
          .attendance-table td {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        ${kopHtml}

        <div class="event-meta">
          <div class="meta-item">
            <span class="meta-label">Nama Ibadah/Event:</span>
            <span class="meta-val">${event.namaEvent}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Kategori Kegiatan:</span>
            <span class="meta-val">${(event.kategori || '').replace(/_/g, ' ')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Hari & Tanggal:</span>
            <span class="meta-val">${startDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Waktu & Lokasi:</span>
            <span class="meta-val">${startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB • ${event.namaLokasi || event.lokasi}</span>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-lbl">Total Presensi Terdata</div>
            <div class="stat-val">${attendance.length} Jiwa</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Jemaat Tetap</div>
            <div class="stat-val">${totalJemaat} Orang</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Tamu Baru</div>
            <div class="stat-val">${totalTamu} Orang</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Headcount Fisik Usher</div>
            <div class="stat-val">${event.manualHeadcount > 0 ? `${event.manualHeadcount} Jiwa` : '-'}</div>
          </div>
        </div>

        <table class="attendance-table">
          <thead>
            <tr>
              <th style="width: 25px;">No</th>
              <th>Nama Jemaat / Tamu</th>
              <th style="width: 110px;">Nomor Induk (NIJ)</th>
              <th style="width: 120px;">Barcode ID</th>
              <th style="width: 95px; text-align: center;">Status</th>
              <th style="width: 80px; text-align: center;">Waktu Presensi</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #94a3b8;">Belum ada data presensi pada event ini.</td></tr>'}
          </tbody>
        </table>

        ${signaturesHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `
    printWindow.document.open()
    printWindow.document.write(fullHtml)
    printWindow.document.close()
  }

  // Export Attendance CSV Handler
  const handleExportCsv = () => {
    if (attendance.length === 0) {
      toast.error('Belum ada data presensi untuk diekspor.')
      return
    }

    const headers = ['No', 'Nama Jemaat / Tamu', 'NIJ', 'Barcode Code', 'Status Keanggotaan', 'Waktu Presensi']
    const rows = attendance.map((item, idx) => [
      idx + 1,
      `"${(item.nama || '').replace(/"/g, '""')}"`,
      `"${item.nij || '-'}"`,
      `"${item.barcodeCode || '-'}"`,
      `"${item.statusJemaat || 'JEMAAT'}"`,
      `"${item.scannedAt ? new Date(item.scannedAt).toLocaleTimeString('id-ID') : '-'}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Rekap_Presensi_${event?.namaEvent?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${attendance.length} data presensi ke CSV.`)
  }

  const renderKategoriBadge = (kat: EventKategori) => {
    switch (kat) {
      case 'IBADAH_RAYA':
        return <Badge className='bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs'>Ibadah Raya</Badge>
      case 'KOMSEL':
        return <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs'>Komsel</Badge>
      case 'YOUTH':
        return <Badge className='bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs'>Youth</Badge>
      case 'SEMINAR':
        return <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs'>Seminar</Badge>
      case 'SEKOLAH_MINGGU':
        return <Badge className='bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs'>Sekolah Minggu</Badge>
      default:
        return <Badge variant='outline'>{kat}</Badge>
    }
  }

  const filteredAttendance = attendance.filter((item) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      item.nama.toLowerCase().includes(q) ||
      item.nij.toLowerCase().includes(q) ||
      item.barcodeCode.toLowerCase().includes(q)
    )
  })

  if (loading && !event) {
    return (
      <div className='flex items-center justify-center min-h-100 text-muted-foreground gap-2 text-sm'>
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat data event dan presensi...
      </div>
    )
  }

  if (!event) {
    return (
      <div className='space-y-4 max-w-xl mx-auto py-12 text-center'>
        <h2 className='text-xl font-bold text-rose-600 dark:text-rose-400'>Event Tidak Ditemukan</h2>
        <p className='text-sm text-muted-foreground'>Jadwal event tidak ditemukan atau telah dihapus.</p>
        <Button asChild variant='outline'>
          <Link href='/dashboard/event'>Kembali ke Daftar Event</Link>
        </Button>
      </div>
    )
  }

  const startDate = new Date(event.tanggalMulai || event.tanggal)
  const endDate = event.tanggalSelesai ? new Date(event.tanggalSelesai) : null
  const checkInOpen = event.presensiBuka ? new Date(event.presensiBuka) : null
  const checkInClose = event.presensiTutup ? new Date(event.presensiTutup) : null

  return (
    <div className='space-y-6'>
      {/* Optional Poster Banner */}
      {event.thumbnailUrl && (
        <div className='relative h-44 sm:h-60 w-full rounded-2xl overflow-hidden shadow-xs border bg-black/10'>
          <img
            src={event.thumbnailUrl}
            alt={event.namaEvent}
            className='w-full h-full object-cover object-center'
            onError={(e) => {
              ;(e.target as HTMLElement).style.display = 'none'
            }}
          />
        </div>
      )}

      {/* Header Bar (Responsive & Clean) */}
      <div className='flex flex-col gap-3.5 border-b pb-4'>
        {/* Navigation & Category Row */}
        <div className='flex items-center justify-between gap-2'>
          <Button asChild variant='ghost' size='sm' className='h-8 px-2 -ml-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground'>
            <Link href='/dashboard/event'>
              <ArrowLeft className='size-4' />
              <span>Daftar Event</span>
            </Link>
          </Button>
          <div>{renderKategoriBadge(event.kategori)}</div>
        </div>

        {/* Title & Description */}
        <div className='space-y-1'>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug'>
            {event.namaEvent}
          </h1>
          <p className='text-xs text-muted-foreground leading-relaxed'>
            {event.deskripsi || 'Jadwal pelaksanaan ibadah dan kegiatan gereja.'}
          </p>
        </div>

        {/* Action Buttons Row */}
        <div className='flex flex-wrap items-center gap-2 pt-1'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setEditOpen(true)}
            className='h-8 text-xs font-semibold gap-1.5 justify-center'
          >
            <Edit2 className='size-3.5 text-muted-foreground shrink-0' />
            <span>Edit Event</span>
          </Button>

          <Button
            asChild
            size='sm'
            className='h-8 text-xs font-bold gap-1.5 justify-center bg-primary hover:bg-primary/90 text-primary-foreground'
          >
            <Link href={`/scan/${event.id}`}>
              <QrCode className='size-3.5 shrink-0' />
              <span>Buka Scanner Presensi</span>
            </Link>
          </Button>

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handlePrintAttendanceReport}
            className='h-8 text-xs font-medium gap-1.5'
            title='Cetak Lembar Rekapitulasi Presensi A4'
          >
            <Printer className='size-3.5' />
            <span>Cetak Rekap Presensi</span>
          </Button>

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleExportCsv}
            className='h-8 text-xs font-medium gap-1.5'
            title='Ekspor Rekap Presensi ke CSV'
          >
            <Download className='size-3.5' />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Stat Cards Bar */}
      <div className='grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
        {/* 1. TOTAL KEHADIRAN RESMI */}
        <Card className='shadow-xs bg-primary/5 border-primary/30'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-[11px] font-bold text-primary uppercase flex items-center justify-between'>
              <span>TOTAL KEHADIRAN</span>
              <Users className='size-3.5 text-primary' />
            </CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5'>
            <div className='text-2xl font-black font-mono text-primary flex items-baseline gap-1.5'>
              {event.manualHeadcount > 0 ? event.manualHeadcount : attendance.length}
              <span className='text-xs font-normal text-primary/80'>Jiwa</span>
            </div>
            <div className='text-[10px] text-muted-foreground font-medium mt-0.5 truncate'>
              {event.manualHeadcount > 0 ? 'Berdasarkan headcount fisik resmi' : 'Berdasarkan scan terdata'}
            </div>
          </CardContent>
        </Card>

        {/* 2. HEADCOUNT FISIK USHER */}
        <Card className='shadow-xs bg-card border-border/80'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between'>
              <span>HEADCOUNT FISIK</span>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => setHeadcountModalOpen(true)}
                className='size-5 text-muted-foreground hover:text-primary'
                title='Ubah Headcount Fisik'
              >
                <Edit2 className='size-3' />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5'>
            <div className='text-2xl font-black font-mono text-foreground flex items-baseline gap-1.5'>
              {event.manualHeadcount > 0 ? event.manualHeadcount : '-'}
              <span className='text-xs font-normal text-muted-foreground'>Jiwa</span>
            </div>
            <div className='text-[10px] text-muted-foreground font-medium mt-0.5 flex items-center justify-between'>
              <span className='truncate'>
                {event.manualHeadcount > 0
                  ? `Akurasi scan: ${Math.min(100, Math.round((attendance.length / event.manualHeadcount) * 100))}%`
                  : 'Hitungan clicker usher'}
              </span>
              <button
                type='button'
                onClick={() => setHeadcountModalOpen(true)}
                className='text-[10px] text-primary hover:underline font-semibold shrink-0 ms-1'
              >
                {event.manualHeadcount > 0 ? 'Update →' : '+ Input →'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 3. SCAN TERDATA INDIVIDUAL */}
        <Card className='shadow-xs bg-card border-border/80'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between'>
              <span>SCAN TERDATA</span>
              <QrCode className='size-3.5 text-primary' />
            </CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5'>
            <div className='text-2xl font-black font-mono text-foreground flex items-baseline gap-1.5'>
              {attendance.length}
              <span className='text-xs font-normal text-muted-foreground'>Orang</span>
            </div>
            <div className='text-[10px] text-muted-foreground font-mono mt-0.5 truncate'>
              {attendance.filter((a) => a.statusJemaat !== 'TAMU').length} Tetap • {attendance.filter((a) => a.statusJemaat === 'TAMU').length} Tamu
            </div>
          </CardContent>
        </Card>

        {/* 4. WAKTU & LOKASI PELAKSANAAN */}
        <Card className='shadow-xs bg-card border-border/80'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between'>
              <span>WAKTU &amp; LOKASI</span>
              <Calendar className='size-3.5 text-primary' />
            </CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5 text-xs space-y-0.5 font-mono text-foreground'>
            <div className='flex items-center gap-1.5 truncate'>
              <span>
                {startDate.toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className='text-muted-foreground'>•</span>
              <span className='text-muted-foreground text-[11px]'>
                {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                {endDate ? ` - ${endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}{' '}
                WIB
              </span>
            </div>
            <div className='flex items-center gap-1 text-muted-foreground text-[11px] truncate pt-0.5 font-sans'>
              <MapPin className='size-3 text-primary shrink-0' />
              <span className='truncate'>{event.namaLokasi || event.lokasi}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jendela Waktu Presensi Card */}
      {(checkInOpen || checkInClose) && (
        <Card className='bg-primary/5 border-primary/20 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs'>
          <div className='flex items-center gap-2.5'>
            <div className='p-2 rounded-lg bg-primary/10 text-primary shrink-0'>
              <Timer className='size-4' />
            </div>
            <div>
              <div className='font-bold text-foreground'>Jendela Waktu Presensi QR (Check-in Window)</div>
              <div className='text-muted-foreground text-[11px]'>
                Dibuka: {checkInOpen ? `${checkInOpen.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : 'Langsung'} • Ditutup: {checkInClose ? `${checkInClose.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : 'Selesai Acara'}
              </div>
            </div>
          </div>
          <Badge variant='outline' className='bg-background font-mono text-[10.5px] border-primary/30 text-primary'>
            Status: {checkInClose && new Date() > checkInClose ? 'DITUTUP RESMI' : 'AKTIF OTOMATIS'}
          </Badge>
        </Card>
      )}

      {/* ── Dialog Edit Event ────────────────────────────────────── */}
      <EventFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        eventToEdit={event}
        onSuccess={fetchDetail}
      />

      {/* ── Dialog 1: Update Headcount Override (Admin) ───────────── */}
      <Dialog open={headcountModalOpen} onOpenChange={setHeadcountModalOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Hash className='size-5 text-primary' /> Headcount Fisik Ruangan
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Update jumlah fisik jemaat yang dihitung oleh petugas usher untuk rekonsiliasi laporan.
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
              >
                <Minus className='size-4' />
              </Button>

              <div className='flex-1 max-w-35 text-center'>
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
              >
                <Plus className='size-4' />
              </Button>
            </div>

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setHeadcountModalOpen(false)}
                disabled={isSavingHeadcount}
              >
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={isSavingHeadcount} className='gap-1 font-bold'>
                {isSavingHeadcount ? <Loader2 className='size-3.5 animate-spin' /> : <Check className='size-3.5' />}
                <span>Simpan Headcount</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: Manual Attendance Override Modal (Admin) ────── */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <UserCheck className='size-5 text-primary' /> Input Presensi Manual (Rekonsiliasi)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tambahkan jemaat atau tamu yang terlewat scan saat ibadah berlangsung.
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-2 p-1 bg-muted/40 rounded-lg text-xs font-semibold'>
            <button
              type='button'
              onClick={() => setManualTab('JEMAAT')}
              className={`py-1.5 rounded-md transition-all ${
                manualTab === 'JEMAAT' ? 'bg-background shadow-xs text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Jemaat Terdaftar
            </button>
            <button
              type='button'
              onClick={() => setManualTab('TAMU')}
              className={`py-1.5 rounded-md transition-all ${
                manualTab === 'TAMU' ? 'bg-background shadow-xs text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              + Tamu Baru
            </button>
          </div>

          {manualTab === 'JEMAAT' ? (
            <div className='space-y-3 pt-2'>
              <div className='relative'>
                <Search className='size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
                <Input
                  placeholder='Cari nama, NIJ, atau No. HP jemaat...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='text-xs h-9 pl-9 pr-8'
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className='size-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary' />
                )}
              </div>

              <div className='max-h-60 overflow-y-auto space-y-1 divide-y rounded-lg border p-1'>
                {searchResults.length > 0 ? (
                  searchResults.map((j) => {
                    const isAlreadyScanned = attendance.some((a) => a.jemaatId === j.id)
                    return (
                      <div
                        key={j.id}
                        className='p-2 flex items-center justify-between gap-2 hover:bg-muted/50 rounded-md transition-colors text-xs'
                      >
                        <div className='min-w-0'>
                          <div className='font-bold text-foreground truncate'>{j.nama}</div>
                          <div className='text-[10.5px] text-muted-foreground font-mono truncate'>
                            NIJ: {j.nij} • {j.noHp}
                          </div>
                        </div>

                        {isAlreadyScanned ? (
                          <Badge variant='outline' className='text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'>
                            Sudah Hadir
                          </Badge>
                        ) : (
                          <Button
                            type='button'
                            size='sm'
                            disabled={isSubmittingManual}
                            onClick={() => handleRecordJemaat(j.id, j.nama)}
                            className='h-7 px-2.5 text-xs font-bold gap-1 bg-primary text-primary-foreground shrink-0'
                          >
                            <Plus className='size-3' /> Hadir
                          </Button>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className='p-6 text-center text-xs text-muted-foreground'>
                    {searchQuery.trim().length >= 2
                      ? `Tidak ditemukan jemaat dengan kata kunci "${searchQuery}".`
                      : 'Ketik minimal 2 huruf untuk mencari jemaat.'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleRecordGuest} className='space-y-3 pt-2'>
              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>Nama Lengkap Tamu <span className='text-rose-500'>*</span></Label>
                <Input
                  required
                  placeholder='Contoh: Stefanus William'
                  value={guestNama}
                  onChange={(e) => setGuestNama(e.target.value)}
                  className='text-xs h-9'
                  autoFocus
                />
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <div className='space-y-1'>
                  <Label className='text-xs font-semibold'>Jenis Kelamin</Label>
                  <Select value={guestGender} onValueChange={(val: any) => setGuestGender(val)}>
                    <SelectTrigger className='text-xs h-9'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='LAK_LAKI'>Laki-Laki</SelectItem>
                      <SelectItem value='PEREMPUAN'>Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1'>
                  <Label className='text-xs font-semibold'>No. WhatsApp</Label>
                  <Input
                    placeholder='08123456789'
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className='text-xs h-9 font-mono'
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>Catatan / Keterangan</Label>
                <Input
                  placeholder='Asal gereja / undangan dari jemaat...'
                  value={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.value)}
                  className='text-xs h-9'
                />
              </div>

              <DialogFooter className='pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setManualModalOpen(false)}
                  disabled={isSubmittingManual}
                >
                  Batal
                </Button>
                <Button type='submit' size='sm' disabled={isSubmittingManual} className='gap-1 font-bold'>
                  {isSubmittingManual ? <Loader2 className='size-3.5 animate-spin' /> : <Plus className='size-3.5' />}
                  <span>Simpan Tamu &amp; Presensi</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Attendance List Table Section */}
      <Card className='shadow-xs bg-card overflow-hidden'>
        {/* Header Bar */}
        <div className='px-4 py-3 border-b flex items-center justify-between gap-2 bg-card'>
          <div className='flex items-center gap-2 min-w-0'>
            <CheckCircle2 className='size-4 text-emerald-500 shrink-0' />
            <span className='font-bold text-sm text-foreground truncate'>
              Rekapitulasi Presensi
            </span>
            <Badge variant='outline' className='font-mono text-[10.5px] bg-primary/10 text-primary border-primary/30 shrink-0'>
              {attendance.length} Hadir
            </Badge>
          </div>

          <Button size='sm' variant='outline' onClick={fetchDetail} className='h-7.5 px-2.5 text-xs gap-1.5 shrink-0'>
            <RotateCw className='size-3 text-muted-foreground' />
            <span className='hidden sm:inline'>Refresh</span>
          </Button>
        </div>

        {/* Toolbar: Search Input + Add Manual Button */}
        <div className='p-3 bg-muted/20 border-b flex flex-col sm:flex-row gap-2'>
          <div className='relative flex-1'>
            <Search className='size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Cari nama, NIJ, atau barcode jemaat...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='h-8.5 pl-8 text-xs w-full'
            />
          </div>

          <Button
            type='button'
            size='sm'
            onClick={() => setManualModalOpen(true)}
            className='h-8.5 px-3 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-2xs shrink-0 justify-center w-full sm:w-auto'
          >
            <UserPlus className='size-3.5' />
            <span>Input Presensi Manual</span>
          </Button>
        </div>

        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='hover:bg-transparent'>
                  <TableHead className='w-15 px-4 text-xs'>No</TableHead>
                  <TableHead className='px-4 text-xs font-semibold'>Nama Jemaat / Tamu</TableHead>
                  <TableHead className='px-4 text-xs font-semibold'>Nomor Induk (NIJ)</TableHead>
                  <TableHead className='px-4 text-xs font-semibold'>Barcode Presensi</TableHead>
                  <TableHead className='px-4 text-xs font-semibold'>Status</TableHead>
                  <TableHead className='px-4 text-xs font-semibold text-end'>Waktu Presensi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='h-32 text-center text-muted-foreground text-sm'>
                      {searchTerm ? (
                        'Tidak ada data jemaat yang cocok dengan pencarian.'
                      ) : (
                        <div className='space-y-2'>
                          <div>Belum ada jemaat yang melakukan presensi pada event ini.</div>
                          <Button asChild size='sm' className='gap-2'>
                            <Link href={`/scan/${event.id}`}>
                              <QrCode className='size-4' /> Buka Scanner Presensi Sekarang
                            </Link>
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendance.map((item, idx) => {
                    const scanTime = new Date(item.scannedAt)
                    const isGuest = item.statusJemaat === 'TAMU' || item.nij === 'TAMU BARU'
                    return (
                      <TableRow key={item.attendanceId} className='hover:bg-muted/40 transition-colors'>
                        <TableCell className='px-4 py-2.5 font-mono text-xs text-muted-foreground'>
                          {idx + 1}
                        </TableCell>
                        <TableCell className='px-4 py-2.5'>
                          <Link
                            href={isGuest ? `/dashboard/tamu` : `/dashboard/jemaat/${item.jemaatId}`}
                            className='font-bold text-sm text-foreground hover:underline hover:text-primary'
                          >
                            {item.nama}
                          </Link>
                        </TableCell>
                        <TableCell className='px-4 py-2.5 font-mono text-xs text-foreground'>
                          {item.nij}
                        </TableCell>
                        <TableCell className='px-4 py-2.5 font-mono text-xs text-muted-foreground'>
                          <Badge variant='outline' className='font-mono text-[11px] bg-muted/40'>
                            {item.barcodeCode}
                          </Badge>
                        </TableCell>
                        <TableCell className='px-4 py-2.5'>
                          {isGuest ? (
                            <Badge className='bg-primary/15 text-primary border-primary/30 text-[10px] font-mono'>
                              TAMU BARU
                            </Badge>
                          ) : (
                            <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono'>
                              JEMAAT TETAP
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className='px-4 py-2.5 text-end font-mono text-xs text-muted-foreground'>
                          {scanTime.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}{' '}
                          WIB
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

