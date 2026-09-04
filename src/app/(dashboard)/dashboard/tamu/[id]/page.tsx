'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  Calendar,
  Sparkles,
  UserCheck,
  Edit,
  Loader2,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
  Printer,
  MessageSquare,
  Send,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getTamuByIdAction,
  updateStatusFollowUpAction,
  konversiTamuKeJemaatAction,
} from '@/actions/tamu'
import { getWhatsAppTemplatesAction } from '@/actions/whatsapp-template'
import { formatWhatsAppMessage, openWhatsAppChat } from '@/lib/whatsapp-helpers'
import { DEFAULT_WHATSAPP_TEMPLATES_CONFIG, WhatsAppTemplatesConfig } from '@/lib/validations/whatsapp-template'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'
import { StatusFollowUp } from '@/lib/validations/tamu'
import { toast } from 'sonner'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default function TamuDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [tamu, setTamu] = useState<any | null>(null)
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplatesConfig>(DEFAULT_WHATSAPP_TEMPLATES_CONFIG)
  const [churchName, setChurchName] = useState('Gereja')

  // Update Status Modal
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<StatusFollowUp>('NEW')
  const [updateCatatan, setUpdateCatatan] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Convert Modal
  const [convertOpen, setConvertOpen] = useState(false)
  const [isConverting, setIsConverting] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getTamuByIdAction(id)
    if (res.success && res.data) {
      setTamu(res.data)
      setUpdateStatus(res.data.statusFollowUp || 'NEW')
      setUpdateCatatan(res.data.catatan || '')
    } else {
      toast.error(res.error || 'Data tamu tidak ditemukan.')
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  useEffect(() => {
    getWhatsAppTemplatesAction().then((res) => {
      if (res.success && res.data) {
        setWaTemplates(res.data)
      }
    })
    getEffectivePrintConfig().then((pc) => {
      if (pc?.kop?.namaGereja) {
        setChurchName(pc.kop.namaGereja)
      }
    })
  }, [])

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tamu) return

    setIsUpdating(true)
    const res = await updateStatusFollowUpAction({
      id: tamu.id,
      statusFollowUp: updateStatus,
      catatan: updateCatatan.trim() || null,
    })
    setIsUpdating(false)

    if (res.success) {
      toast.success(res.message || 'Status follow-up berhasil diperbarui!')
      setUpdateOpen(false)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal memperbarui status follow-up.')
    }
  }

  const handleConvertConfirm = async () => {
    if (!tamu) return

    setIsConverting(true)
    const res = await konversiTamuKeJemaatAction({
      id: tamu.id,
    })
    setIsConverting(false)

    if (res.success && res.data) {
      toast.success(`Konversi Berhasil! ${res.data.nama} telah resmi menjadi Jemaat Tetap (NIJ: ${res.data.nij}).`, {
        action: {
          label: 'Buka Profil Jemaat',
          onClick: () => {
            router.push(`/dashboard/jemaat/${res.data.id}`)
          },
        },
      })
      setConvertOpen(false)
      router.push(`/dashboard/jemaat/${res.data.id}`)
    } else {
      toast.error(res.error || 'Gagal mengonversi tamu.')
    }
  }

  // Official Form Visitasi & Kartu Tamu Print Generator (A4)
  const handlePrintFormVisitasi = async () => {
    if (!tamu) return
    const toastId = toast.loading('Menyiapkan lembar kartu tamu & form visitasi...')
    const printConfig = await getEffectivePrintConfig()
    toast.dismiss(toastId)

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const kopHtml = buildKopHtml(printConfig, {
      badgeText: 'KARTU TAMU & LEMBAR VISITASI PASTORAL',
      dateText: `TGL TERDAFTAR: ${new Date(tamu.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}`,
    })

    const signaturesHtml = buildSignaturesHtml(printConfig, [
      { roleKey: 'sekretaris', customTitle: 'Pengerja / Tim Visitasi' },
      { roleKey: 'gembala', includeStamp: true },
    ])

    const statusLabel =
      tamu.statusFollowUp === 'NEW'
        ? 'Baru Tiba (NEW)'
        : tamu.statusFollowUp === 'IN_PROGRESS'
        ? 'Sedang Follow-Up (IN_PROGRESS)'
        : tamu.statusFollowUp === 'NEED_VISITATION'
        ? 'Perlu Kunjungan Pastoral (NEED_VISITATION)'
        : 'Selesai Pendampingan (COMPLETED)'

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Lembar Visitasi Tamu - ${escapeHtml(tamu.nama)}</title>
        <style>
          @page {
            size: ${printConfig.options.ukuranKertasDefault || 'A4'} portrait;
            margin: 12mm 14mm;
          }
          *, *:before, *:after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff !important;
            color: #0f172a;
            font-size: 12px;
            line-height: 1.5;
          }
          .content-box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px 14px;
            margin-bottom: 14px;
          }
          .section-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #475569;
            margin-bottom: 8px;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 4px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
          }
          .field-label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
          }
          .field-value {
            font-size: 12px;
            font-weight: 600;
            color: #0f172a;
          }
          .notes-box {
            min-height: 70px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 11px;
            white-space: pre-wrap;
          }
          .report-blank {
            height: 130px;
            border: 1px dashed #94a3b8;
            border-radius: 4px;
            padding: 8px;
            font-size: 10px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        ${kopHtml}

        <!-- 1. Identitas Tamu -->
        <div class="content-box">
          <div class="section-title">I. IDENTITAS & KONTAK TAMU</div>
          <div class="grid-2">
            <div>
              <div class="field-label">Nama Lengkap</div>
              <div class="field-value" style="font-size: 14px; font-weight: 800; color: #1e3a8a;">
                ${escapeHtml(tamu.nama || '-')} ${tamu.namaPanggilan ? `(${escapeHtml(tamu.namaPanggilan)})` : ''}
              </div>
            </div>
            <div>
              <div class="field-label">Tahapan Follow-Up Saat Ini</div>
              <div class="field-value" style="color: #0284c7;">${escapeHtml(statusLabel)}</div>
            </div>
            <div>
              <div class="field-label">Jenis Kelamin</div>
              <div class="field-value">${tamu.jenisKelamin === 'LAK_LAKI' ? 'Laki-Laki' : 'Perempuan'}</div>
            </div>
            <div>
              <div class="field-label">Durasi Terdaftar</div>
              <div class="field-value">${escapeHtml(tamu.durasiKedatangan || '-')}</div>
            </div>
            <div>
              <div class="field-label">No. Telepon / WhatsApp</div>
              <div class="field-value" style="font-family: monospace;">${escapeHtml(tamu.noHp || tamu.whatsApp || '-')}</div>
            </div>
            <div>
              <div class="field-label">Email</div>
              <div class="field-value">${escapeHtml(tamu.email || '-')}</div>
            </div>
            <div style="grid-column: span 2;">
              <div class="field-label">Alamat Domisili</div>
              <div class="field-value">${escapeHtml(tamu.alamat ? `${tamu.alamat}, ${tamu.kota || ''}, ${tamu.provinsi || ''}` : 'Kota Padang')}</div>
            </div>
          </div>
        </div>

        <!-- 2. Catatan Perkembangan Pastoral -->
        <div class="content-box">
          <div class="section-title">II. RIWAYAT CATATAN PASTORAL & PERKEMBANGAN</div>
          <div class="notes-box">${escapeHtml(tamu.catatan || 'Belum ada catatan pastoral sebelumnya.')}</div>
        </div>

        <!-- 3. Hasil Kunjungan Lapangan -->
        <div class="content-box">
          <div class="section-title">III. HASIL KUNJUNGAN / VISITASI LAPANGAN (DIISI OLEH PENGERJA)</div>
          <div class="report-blank">
            [ Tuliskan ringkasan hasil kunjungan, kebutuhan rohani, pokok doa khusus keluarga, serta rekomendasi penempatan Komsel / Kategorial ]
          </div>
        </div>

        ${signaturesHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          }
        </script>
      </body>
      </html>
    `
    printWindow.document.open()
    printWindow.document.write(fullHtml)
    printWindow.document.close()
  }

  // Direct WhatsApp Handlers
  const handleSendWhatsAppGreeting = () => {
    if (!tamu) return
    const phone = tamu.noHp || tamu.whatsApp
    if (!phone) {
      toast.error(`Nomor WhatsApp untuk ${tamu.nama} belum terdaftar.`)
      return
    }
    const msg = `Syalom Bapak/Ibu/Sdr. ${tamu.nama},\n\nSalam hangat dari Tim Penggembalaan ${churchName}. Kami bersyukur atas kehadiran Anda. Apabila ada hal atau pokok doa yang dapat kami bantu layani, jangan ragu untuk menghubungi kami.\n\nKiranya kasih karunia dan damai sejahtera Tuhan Yesus Kristus senantiasa menyertai Anda sekeluarga!`
    openWhatsAppChat(phone, msg)
    toast.success(`Membuka WhatsApp untuk menyapa ${tamu.nama}.`)
  }

  const handleSendWhatsAppRegistrationLink = () => {
    if (!tamu) return
    const phone = tamu.noHp || tamu.whatsApp
    if (!phone) {
      toast.error(`Nomor WhatsApp untuk ${tamu.nama} belum terdaftar.`)
      return
    }
    const template = waTemplates.LINK_PENDAFTARAN_TAMU || DEFAULT_WHATSAPP_TEMPLATES_CONFIG.LINK_PENDAFTARAN_TAMU
    const formUrl = typeof window !== 'undefined' ? `${window.location.origin}/daftar` : '/daftar'
    const msg = formatWhatsAppMessage(template, {
      nama: tamu.nama,
      namaGereja: churchName,
      linkFormulir: formUrl,
    })
    openWhatsAppChat(phone, msg)
    toast.success(`Membuka WhatsApp untuk mengirimkan link formulir jemaat ke ${tamu.nama}.`)
  }

  const renderStatusBadge = (status: StatusFollowUp) => {
    switch (status) {
      case 'NEW':
        return (
          <Badge className='bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-xs font-mono'>
            BARU TIBA (NEW)
          </Badge>
        )
      case 'IN_PROGRESS':
        return (
          <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-mono'>
            SEDANG FOLLOW-UP (IN_PROGRESS)
          </Badge>
        )
      case 'NEED_VISITATION':
        return (
          <Badge className='bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs font-mono'>
            PERLU KUNJUNGAN PASTORAL
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-mono'>
            SELESAI PENDAMPINGAN
          </Badge>
        )
      default:
        return <Badge variant='outline'>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-100 text-muted-foreground gap-2 text-sm'>
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat profil tamu...
      </div>
    )
  }

  if (!tamu) {
    return (
      <div className='space-y-4 max-w-xl mx-auto py-12 text-center'>
        <h2 className='text-xl font-bold text-rose-600 dark:text-rose-400'>Data Tidak Ditemukan</h2>
        <p className='text-sm text-muted-foreground'>Data tamu telah dikonversi menjadi Jemaat Tetap atau telah dihapus.</p>
        <Button asChild variant='outline'>
          <Link href='/dashboard/tamu'>Kembali ke Daftar Tamu</Link>
        </Button>
      </div>
    )
  }

  const stages: { key: StatusFollowUp; label: string; number: number }[] = [
    { key: 'NEW', label: 'Baru Tiba', number: 1 },
    { key: 'IN_PROGRESS', label: 'Follow-Up', number: 2 },
    { key: 'NEED_VISITATION', label: 'Kunjungan', number: 3 },
    { key: 'COMPLETED', label: 'Selesai', number: 4 },
  ]

  const currentStageIndex = stages.findIndex((s) => s.key === tamu.statusFollowUp)

  return (
    <div className='space-y-6'>
      {/* Header Bar */}
      <div className='flex flex-col gap-3.5 border-b pb-4'>
        {/* Navigation & Status Row */}
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          <Button asChild variant='ghost' size='sm' className='h-8 px-2 -ml-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground'>
            <Link href='/dashboard/tamu'>
              <ArrowLeft className='size-4' />
              <span>Daftar Tamu</span>
            </Link>
          </Button>
          <div className='shrink-0'>{renderStatusBadge(tamu.statusFollowUp)}</div>
        </div>

        {/* Title & Duration */}
        <div className='space-y-1'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
              {tamu.nama}
            </h1>
            {tamu.namaPanggilan && (
              <span className='text-sm text-muted-foreground font-normal'>
                ({tamu.namaPanggilan})
              </span>
            )}
          </div>
          <p className='text-xs sm:text-sm text-muted-foreground'>
            Terdaftar sejak: <span className='font-semibold text-foreground'>{tamu.durasiKedatangan}</span>
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className='flex flex-wrap items-center gap-2 pt-1'>
          <Button
            variant='outline'
            size='sm'
            onClick={handlePrintFormVisitasi}
            className='gap-1.5 h-8 text-xs font-medium'
          >
            <Printer className='size-3.5' /> Cetak Form Visitasi
          </Button>

          {(tamu.noHp || tamu.whatsApp) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='gap-1.5 h-8 text-xs font-medium text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'>
                  <MessageSquare className='size-3.5 text-emerald-600' />
                  <span>WhatsApp</span>
                  <ChevronDown className='size-3 text-muted-foreground ml-0.5' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-64'>
                <DropdownMenuLabel className='text-xs'>Pilihan Pesan WhatsApp</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSendWhatsAppGreeting} className='text-xs gap-2'>
                  <MessageSquare className='size-3.5 text-emerald-600' />
                  <div>
                    <div className='font-medium'>Sapaan Ramah Tamu</div>
                    <div className='text-[10px] text-muted-foreground'>Salam kasih & terima kasih kunjungan</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSendWhatsAppRegistrationLink} className='text-xs gap-2'>
                  <Send className='size-3.5 text-primary' />
                  <div>
                    <div className='font-medium'>Kirim Link Pendaftaran</div>
                    <div className='text-[10px] text-muted-foreground'>Ajakan resmi menjadi jemaat tetap</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant='outline'
            size='sm'
            onClick={() => setUpdateOpen(true)}
            className='gap-1.5 h-8 text-xs font-medium'
          >
            <Edit className='size-3.5' /> Follow-Up
          </Button>

          <Button
            size='sm'
            onClick={() => setConvertOpen(true)}
            className='gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold'
          >
            <Sparkles className='size-3.5' /> Konversi Jemaat
          </Button>
        </div>
      </div>

      {/* Pipeline Visual Timeline */}
      <Card className='shadow-xs bg-card overflow-hidden'>
        <CardHeader className='pb-2.5 pt-4 px-4 border-b bg-muted/10'>
          <CardTitle className='text-xs font-bold text-muted-foreground uppercase tracking-wider'>
            Tahapan Pipeline Follow-Up Pastoral
          </CardTitle>
        </CardHeader>
        <CardContent className='p-3 sm:p-4'>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3'>
            {stages.map((st, idx) => {
              const isPassed = idx < currentStageIndex
              const isCurrent = idx === currentStageIndex
              return (
                <div
                  key={st.key}
                  className={`p-2.5 sm:p-3 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : isPassed
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'border-muted bg-muted/20 text-muted-foreground'
                  }`}
                >
                  <div className='text-[10px] font-mono tracking-wider'>TAHAP {st.number}</div>
                  <div className='text-xs sm:text-sm font-semibold mt-0.5'>{st.label}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Profile Details */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>KONTAK & KOMUNIKASI</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3 space-y-1.5 text-xs'>
            <div className='flex items-center gap-1.5 text-foreground font-semibold'>
              <Phone className='size-3.5 text-primary' /> {tamu.noHp || tamu.whatsApp || '-'}
            </div>
            {tamu.email && (
              <div className='flex items-center gap-1.5 text-muted-foreground'>
                <Mail className='size-3.5' /> {tamu.email}
              </div>
            )}
            <div className='text-muted-foreground text-[11px] pt-0.5 font-mono'>
              Gender: <span className='font-semibold text-foreground'>{tamu.jenisKelamin === 'LAK_LAKI' ? 'Laki-Laki' : 'Perempuan'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>DOMISILI / ALAMAT</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3 space-y-1 text-xs'>
            <div className='flex items-start gap-1.5 text-foreground'>
              <MapPin className='size-3.5 text-primary shrink-0 mt-0.5' />
              <span>{tamu.alamat ? `${tamu.alamat}, ${tamu.kota || ''}, ${tamu.provinsi || ''}` : 'Kota Padang'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>DURASI SEJAK KEDATANGAN</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3 space-y-1'>
            <div className='text-lg font-bold font-mono text-primary flex items-center gap-1.5'>
              <Clock className='size-4' /> {tamu.durasiKedatangan}
            </div>
            <div className='text-[11px] text-muted-foreground'>
              Tgl: {new Date(tamu.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pastoral Notes Section */}
      <Card className='shadow-xs bg-card overflow-hidden'>
        <CardHeader className='pb-3 pt-4 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b bg-muted/10'>
          <div>
            <CardTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
              <FileText className='size-4 text-primary shrink-0' /> Catatan Pastoral
            </CardTitle>
            <CardDescription className='text-xs'>
              Riwayat catatan kunjungan, kontak, dan perkembangan jemaat.
            </CardDescription>
          </div>
          <Button size='sm' variant='outline' onClick={() => setUpdateOpen(true)} className='text-xs h-8 gap-1.5 w-full sm:w-auto shrink-0 justify-center font-medium'>
            <Edit className='size-3.5' /> Perbarui Catatan
          </Button>
        </CardHeader>
        <CardContent className='pt-3.5 pb-4 px-4'>
          {tamu.catatan ? (
            <div className='p-3.5 bg-muted/30 border rounded-lg text-xs leading-relaxed text-foreground whitespace-pre-wrap'>
              {tamu.catatan}
            </div>
          ) : (
            <div className='p-4 bg-muted/20 border border-dashed rounded-lg text-center text-xs text-muted-foreground'>
              Belum ada catatan pastoral. Klik "Perbarui Catatan" untuk menambahkan info follow-up.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog Update Status Follow-Up ─────────────────────── */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Update Status Follow-Up</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Perbarui tahapan pastoral untuk tamu <strong className='text-foreground'>{tamu.nama}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Tahapan Status Follow-Up *</Label>
                <Select value={updateStatus} onValueChange={(val) => setUpdateStatus(val as StatusFollowUp)}>
                  <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='NEW' className='text-xs'>1. Baru Tiba (NEW)</SelectItem>
                    <SelectItem value='IN_PROGRESS' className='text-xs'>2. Sedang Follow-Up (IN_PROGRESS)</SelectItem>
                    <SelectItem value='NEED_VISITATION' className='text-xs'>3. Perlu Kunjungan Pastoral (NEED_VISITATION)</SelectItem>
                    <SelectItem value='COMPLETED' className='text-xs'>4. Selesai Pendampingan (COMPLETED)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Catatan Pastoral / Perkembangan</Label>
                <Textarea
                  placeholder='Tuliskan catatan hasil kontak WhatsApp / kunjungan / pokok doa...'
                  value={updateCatatan}
                  onChange={(e) => setUpdateCatatan(e.target.value)}
                  className='text-xs min-h-25'
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => setUpdateOpen(false)} disabled={isUpdating}>
                Batal
              </Button>
              <Button type='submit' disabled={isUpdating} className='gap-2'>
                {isUpdating ? <Loader2 className='size-4 animate-spin' /> : <Edit className='size-4' />}
                {isUpdating ? 'Memperbarui...' : 'Simpan Update'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog 1-Click Conversion ─────────────────────── */}
      <AlertDialog open={convertOpen} onOpenChange={setConvertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <Sparkles className='size-5' /> Konversi Tamu Menjadi Jemaat Tetap?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-sm space-y-2' asChild>
              <div>
                <span>
                  Tamu <strong className='text-foreground'>{tamu.nama}</strong> akan dikonversi menjadi Jemaat Tetap dengan status <strong className='text-emerald-600 dark:text-emerald-400'>ACTIVE</strong>.
                </span>
                <span className='block text-xs text-muted-foreground mt-1'>
                  Sistem akan menerbitkan <strong>Nomor Induk Jemaat (NIJ)</strong> dan <strong>Barcode Code Presensi</strong> resmi secara otomatis. Transaksi aman terlindungi dengan log audit SHA-256.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setConvertOpen(false)} disabled={isConverting}>
              Batal
            </Button>
            <Button
              className='bg-emerald-600 hover:bg-emerald-700 text-white gap-2'
              onClick={handleConvertConfirm}
              disabled={isConverting}
            >
              {isConverting ? <Loader2 className='size-4 animate-spin' /> : <UserCheck className='size-4' />}
              {isConverting ? 'Mengonversi...' : 'Konversi ke Jemaat Tetap'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
