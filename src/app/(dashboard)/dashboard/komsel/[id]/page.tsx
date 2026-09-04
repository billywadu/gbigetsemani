'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Clock,
  UserPlus,
  UserCheck,
  UserMinus,
  Trash2,
  Loader2,
  MoreHorizontal,
  Eye,
  Tag,
  ShieldCheck,
  Check,
  AlertCircle,
  Printer,
  MessageSquare,
  Crown,
  Edit,
  ExternalLink,
  Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getKomselByIdAction,
  addAnggotaKomselAction,
  removeAnggotaKomselAction,
  setKoordinatorKomselAction,
  updateKomselAction,
  deleteKomselAction,
} from '@/actions/komsel'
import { getJemaatListAction } from '@/actions/jemaat'
import { getKategorialListAction } from '@/actions/kategorial'
import { formatAgeString } from '@/lib/utils/age'
import { escapeHtml } from '@/lib/utils'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'
import { toast } from 'sonner'

const HARI_OPTIONS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'] as const

export default function KomselDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [komsel, setKomsel] = useState<any | null>(null)

  // Edit Komsel Modal State
  const [editOpen, setEditOpen] = useState(false)
  const [editNama, setEditNama] = useState('')
  const [editWilayah, setEditWilayah] = useState('')
  const [editHari, setEditHari] = useState<any>('RABU')
  const [editJam, setEditJam] = useState('19:00 WIB')
  const [editKategorialId, setEditKategorialId] = useState('')
  const [kategorialOptions, setKategorialOptions] = useState<any[]>([])
  const [isUpdatingKomsel, setIsUpdatingKomsel] = useState(false)

  // Add Member Modal State
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [jemaatSearch, setJemaatSearch] = useState('')
  const [availableJemaat, setAvailableJemaat] = useState<any[]>([])
  const [selectedJemaatId, setSelectedJemaatId] = useState('')
  const [selectedJemaat, setSelectedJemaat] = useState<any | null>(null)
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Promote / Change Koordinator State
  const [promoteTarget, setPromoteTarget] = useState<any | null>(null)
  const [isPromoting, setIsPromoting] = useState(false)

  const [changeKoordinatorOpen, setChangeKoordinatorOpen] = useState(false)
  const [koordinatorSearch, setKoordinatorSearch] = useState('')
  const [koordinatorCandidates, setKoordinatorCandidates] = useState<any[]>([])
  const [selectedKoordinatorId, setSelectedKoordinatorId] = useState('')
  const [selectedNewKoordinator, setSelectedNewKoordinator] = useState<any | null>(null)
  const [isChangingKoordinator, setIsChangingKoordinator] = useState(false)

  // Remove Member Modal State
  const [removeMemberTarget, setRemoveMemberTarget] = useState<any | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)

  // Delete Komsel Modal State
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getKomselByIdAction(id)
    if (res.success && res.data) {
      setKomsel(res.data)
      setEditNama(res.data.nama || '')
      setEditWilayah(res.data.wilayah || '')
      setEditHari(res.data.hari || 'RABU')
      setEditJam(res.data.jam || '19:00 WIB')
      setEditKategorialId(res.data.kategorialId || '')
    } else {
      toast.error(res.error || 'Data Komsel tidak ditemukan.')
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // Load Kategorial Options for Edit Modal
  useEffect(() => {
    getKategorialListAction().then((res: any) => {
      if (res.success && res.data) {
        setKategorialOptions(res.data.items || res.data || [])
      }
    })
  }, [])

  // Load available jemaat for Add Member
  useEffect(() => {
    if (addMemberOpen) {
      getJemaatListAction({ search: jemaatSearch, statusJemaat: 'ACTIVE' as any, page: 1, pageSize: 50 }).then((res) => {
        if (res.success && res.data) {
          setAvailableJemaat(res.data.items)
        }
      })
    }
  }, [addMemberOpen, jemaatSearch])

  // Sync selected jemaat for Add Member
  useEffect(() => {
    if (selectedJemaatId) {
      const match = availableJemaat.find((j) => j.id === selectedJemaatId)
      setSelectedJemaat(match || null)
    } else {
      setSelectedJemaat(null)
    }
  }, [selectedJemaatId, availableJemaat])

  // Load candidates for Change Coordinator
  useEffect(() => {
    if (changeKoordinatorOpen) {
      getJemaatListAction({ search: koordinatorSearch, statusJemaat: 'ACTIVE' as any, page: 1, pageSize: 50 }).then((res) => {
        if (res.success && res.data) {
          setKoordinatorCandidates(res.data.items)
        }
      })
    }
  }, [changeKoordinatorOpen, koordinatorSearch])

  // Sync selected new koordinator
  useEffect(() => {
    if (selectedKoordinatorId) {
      const match = koordinatorCandidates.find((j) => j.id === selectedKoordinatorId)
      setSelectedNewKoordinator(match || null)
    } else {
      setSelectedNewKoordinator(null)
    }
  }, [selectedKoordinatorId, koordinatorCandidates])

  // 1. Official Presensi Komsel Print Generator (A4)
  const handlePrintPresensi = async () => {
    if (!komsel) return
    const toastId = toast.loading('Menyiapkan lembar presensi Komsel...')
    const printConfig = await getEffectivePrintConfig()
    toast.dismiss(toastId)

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const members = komsel.anggota || []
    const koordinator = komsel.koordinator

    const rowsHtml = members.length > 0
      ? members.map((mem: any, idx: number) => {
          const j = mem.jemaat || {}
          const isKoord = j.id === komsel.koordinatorId
          return `
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="text-align: center; padding: 6px 8px;">${idx + 1}</td>
              <td style="font-weight: 700; padding: 6px 8px;">
                ${escapeHtml(j.nama || '-')}
                ${isKoord ? ' <span style="font-size: 8.5px; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 1px 4px; border-radius: 3px; font-weight: 800;">KOORDINATOR</span>' : ''}
              </td>
              <td style="font-family: monospace; text-align: center; padding: 6px 8px; color: #0284c7; font-weight: 700;">${escapeHtml(j.nij || '-')}</td>
              <td style="text-align: center; padding: 6px 8px;">${j.jenisKelamin === 'LAK_LAKI' ? 'L' : j.jenisKelamin === 'PEREMPUAN' ? 'P' : '-'}</td>
              <td style="padding: 6px 8px; text-align: center;">${escapeHtml(j.kategorial?.nama || '-')}</td>
              <td style="border: 1px solid #cbd5e1; width: 45px; text-align: center;"></td>
              <td style="border: 1px solid #cbd5e1; width: 45px; text-align: center;"></td>
              <td style="border: 1px solid #cbd5e1; width: 45px; text-align: center;"></td>
              <td style="border: 1px solid #cbd5e1; width: 45px; text-align: center;"></td>
              <td style="border: 1px solid #cbd5e1; width: 45px; text-align: center;"></td>
              <td style="border: 1px solid #cbd5e1; width: 80px;"></td>
            </tr>
          `
        }).join('')
      : `
        <tr>
          <td colspan="11" style="text-align: center; padding: 16px; color: #64748b;">Belum ada anggota komsel terdaftar.</td>
        </tr>
      `

    const kopHtml = buildKopHtml(printConfig, {
      badgeText: 'LEMBAR PRESENSI KOMUNITAS SEL',
      dateText: `WILAYAH: ${komsel.wilayah.toUpperCase()}`,
    })

    const signaturesHtml = buildSignaturesHtml(printConfig, [
      { roleKey: 'koordinatorKomsel', overrideName: koordinator?.nama || 'Koordinator Komsel', customTitle: `Koordinator ${komsel.nama}` },
      { roleKey: 'gembala', includeStamp: true },
    ])

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Lembar Presensi Komsel - ${escapeHtml(komsel.nama)}</title>
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
            padding: 0;
            font-size: 10.5px;
          }
          .sheet-container {
            width: 100%;
            margin: 0 auto;
          }
          .meta-box {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 12px 0;
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .meta-label {
            font-size: 8.5px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .meta-val {
            font-size: 11.5px;
            font-weight: 700;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-weight: 800;
            font-size: 9.5px;
            text-transform: uppercase;
            padding: 6px 6px;
            border: 1px solid #0f172a;
            text-align: center;
          }
          td {
            border: 1px solid #cbd5e1;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="sheet-container">
          ${kopHtml}

          <div class="meta-box">
            <div class="meta-item">
              <span class="meta-label">Nama Komsel & Wilayah</span>
              <span class="meta-val">${escapeHtml(komsel.nama)} (${escapeHtml(komsel.wilayah)})</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Jadwal Pertemuan</span>
              <span class="meta-val">${escapeHtml(komsel.hari)}, ${escapeHtml(komsel.jam)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Koordinator Komsel</span>
              <span class="meta-val">${escapeHtml(koordinator?.nama || 'Belum Ditentukan')}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2" style="width: 26px;">No</th>
                <th rowspan="2" style="text-align: left;">Nama Anggota Jemaat</th>
                <th rowspan="2" style="width: 70px;">NIJ</th>
                <th rowspan="2" style="width: 28px;">L/P</th>
                <th rowspan="2" style="width: 75px;">Kategorial</th>
                <th colspan="5">Kehadiran Pertemuan Mingguan</th>
                <th rowspan="2" style="width: 80px;">Keterangan</th>
              </tr>
              <tr>
                <th style="width: 42px;">M-1</th>
                <th style="width: 42px;">M-2</th>
                <th style="width: 42px;">M-3</th>
                <th style="width: 42px;">M-4</th>
                <th style="width: 42px;">M-5</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 24px;">
            ${signaturesHtml}
          </div>

          ${
            printConfig.options.tampilkanWatermarkAudit
              ? `<div style="font-size: 8px; color: #94a3b8; margin-top: 16px; text-align: center; font-family: monospace; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
                  ${escapeHtml(printConfig.options.catatanKakiResmi)} • Verifikasi Otentikasi ${escapeHtml(printConfig.kop?.namaGereja || 'Gereja')}.
                </div>`
              : ''
          }
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(fullHtml)
    printWindow.document.close()
  }

  // 2. Add Member Submit
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJemaatId) {
      toast.error('Pilih Jemaat yang akan ditambahkan!')
      return
    }

    if (selectedJemaat?.komselId && selectedJemaat.komselId !== komsel?.id) {
      toast.error(`Jemaat sudah terdaftar pada Komsel lain. Lepaskan terlebih dahulu dari Komsel sebelumnya.`)
      return
    }

    setIsAddingMember(true)
    const res = await addAnggotaKomselAction({
      komselId: id,
      jemaatId: selectedJemaatId,
    })
    setIsAddingMember(false)

    if (res.success) {
      toast.success(res.message || 'Anggota berhasil ditambahkan! Log audit SHA-256 tersimpan.')
      setAddMemberOpen(false)
      setSelectedJemaatId('')
      setSelectedJemaat(null)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal menambahkan anggota Komsel.')
    }
  }

  // 3. Edit Komsel Profile Submit
  const handleEditKomselSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editNama.trim()) { toast.error('Nama Komsel wajib diisi!'); return }
    if (!editWilayah.trim()) { toast.error('Wilayah Komsel wajib diisi!'); return }
    if (!editJam.trim()) { toast.error('Jam pertemuan wajib diisi!'); return }

    setIsUpdatingKomsel(true)
    const res = await updateKomselAction({
      id,
      nama: editNama.trim(),
      wilayah: editWilayah.trim(),
      hari: editHari,
      jam: editJam.trim(),
      kategorialId: editKategorialId || null,
    })
    setIsUpdatingKomsel(false)

    if (res.success) {
      toast.success('Informasi Komsel berhasil diperbarui! Log audit SHA-256 tersimpan.')
      setEditOpen(false)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal memperbarui informasi Komsel.')
    }
  }

  // 4. One-Click Promote Member to Koordinator Submit
  const handlePromoteConfirm = async () => {
    if (!promoteTarget) return

    setIsPromoting(true)
    const res = await setKoordinatorKomselAction({
      komselId: id,
      koordinatorId: promoteTarget.jemaat.id,
    })
    setIsPromoting(false)

    if (res.success) {
      toast.success(res.message || `Berhasil menetapkan ${promoteTarget.jemaat.nama} sebagai Koordinator Komsel!`)
      setPromoteTarget(null)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal mengubah Koordinator.')
    }
  }

  // 5. Change Koordinator Modal Submit
  const handleChangeKoordinatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKoordinatorId) {
      toast.error('Pilih Jemaat Koordinator!')
      return
    }

    if (selectedNewKoordinator?.komselId && selectedNewKoordinator.komselId !== komsel?.id) {
      toast.error('Jemaat sudah terdaftar pada Komsel lain. Lepaskan terlebih dahulu dari Komsel sebelumnya.')
      return
    }

    setIsChangingKoordinator(true)
    const res = await setKoordinatorKomselAction({
      komselId: id,
      koordinatorId: selectedKoordinatorId,
    })
    setIsChangingKoordinator(false)

    if (res.success) {
      toast.success(res.message || 'Koordinator Komsel berhasil diperbarui!')
      setChangeKoordinatorOpen(false)
      setSelectedKoordinatorId('')
      setSelectedNewKoordinator(null)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal mengubah Koordinator.')
    }
  }

  // 6. Remove Member Submit
  const handleRemoveMemberConfirm = async () => {
    if (!removeMemberTarget) return

    setIsRemovingMember(true)
    const res = await removeAnggotaKomselAction({
      anggotaId: removeMemberTarget.id,
    })
    setIsRemovingMember(false)

    if (res.success) {
      toast.success(res.message || 'Anggota berhasil dilepaskan dari Komsel.')
      setRemoveMemberTarget(null)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal melepaskan anggota Komsel.')
    }
  }

  // 7. Delete Komsel Submit
  const handleDeleteKomselConfirm = async () => {
    if (!komsel) return
    if (!deletionReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deleteKomselAction({
      id: komsel.id,
      reason: deletionReason.trim(),
    })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Komsel berhasil di-soft delete.')
      setDeleteOpen(false)
      router.push('/dashboard/komsel')
    } else {
      toast.error(res.error || 'Gagal menghapus Komsel.')
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-100 text-muted-foreground gap-2 text-sm'>
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat detail komsel...
      </div>
    )
  }

  if (!komsel) {
    return (
      <div className='space-y-4 max-w-xl mx-auto py-12 text-center'>
        <h2 className='text-xl font-bold text-rose-600 dark:text-rose-400'>Data Tidak Ditemukan</h2>
        <p className='text-sm text-muted-foreground'>Komsel telah dihapus atau tidak terdaftar.</p>
        <Button asChild variant='outline'>
          <Link href='/dashboard/komsel'>Kembali ke Daftar Komsel</Link>
        </Button>
      </div>
    )
  }

  const rawPhone = (komsel.koordinator?.noHp || '').replace(/[^0-9]/g, '')
  const waLink = rawPhone ? `https://wa.me/${rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone}` : null

  return (
    <div className='space-y-6'>
      {/* Header Bar */}
      <div className='flex flex-col gap-3.5 border-b pb-4'>
        {/* Navigation & Badges Row */}
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          <Button asChild variant='ghost' size='sm' className='h-8 px-2 -ml-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground'>
            <Link href='/dashboard/komsel'>
              <ArrowLeft className='size-4' />
              <span>Daftar Komsel</span>
            </Link>
          </Button>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <Badge variant='outline' className='gap-1 font-mono text-[10px] sm:text-[11px] shrink-0'>
              <Building2 className='size-3 text-primary' /> {komsel.wilayah}
            </Badge>
            {komsel.kategorial && (
              <Badge variant='secondary' className='gap-1 font-mono text-[10px] shrink-0'>
                <Tag className='size-3' /> {komsel.kategorial.nama}
              </Badge>
            )}
          </div>
        </div>

        {/* Title & Schedule */}
        <div className='space-y-1'>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
            {komsel.nama}
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground'>
            Jadwal Pertemuan: <span className='font-semibold text-foreground'>{komsel.hari}, {komsel.jam}</span>
            {komsel.koordinator && ` • Koordinator: ${komsel.koordinator.nama}`}
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className='flex items-center gap-2 flex-wrap pt-1'>
          <Button
            size='sm'
            onClick={handlePrintPresensi}
            className='gap-1.5 h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs'
          >
            <Printer className='size-3.5' /> Cetak Presensi Komsel
          </Button>

          {waLink && (
            <Button
              asChild
              variant='outline'
              size='sm'
              className='gap-1.5 h-8 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10'
            >
              <a href={waLink} target='_blank' rel='noreferrer'>
                <MessageSquare className='size-3.5' /> Hubungi WA Koordinator
              </a>
            </Button>
          )}

          <Button
            variant='outline'
            size='sm'
            onClick={() => setEditOpen(true)}
            className='gap-1.5 h-8 text-xs font-medium'
          >
            <Edit className='size-3.5' /> Edit Info Komsel
          </Button>

          <Button
            size='sm'
            variant='outline'
            onClick={() => setAddMemberOpen(true)}
            className='gap-1.5 h-8 text-xs font-semibold'
          >
            <UserPlus className='size-3.5' /> Tambah Anggota
          </Button>

          <Button
            variant='ghost'
            size='sm'
            onClick={() => setDeleteOpen(true)}
            className='gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 h-8 text-xs ml-auto'
          >
            <Trash2 className='size-3.5' /> Hapus Komsel
          </Button>
        </div>
      </div>

      {/* Summary Cards & Koordinator Section */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>WILAYAH & JADWAL</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5 space-y-1'>
            <div className='text-sm font-bold text-foreground flex items-center gap-1.5'>
              <Building2 className='size-4 text-primary' /> {komsel.wilayah}
            </div>
            <div className='text-xs text-muted-foreground flex items-center gap-1.5'>
              <Calendar className='size-3.5' /> {komsel.hari}, <Clock className='size-3.5' /> {komsel.jam}
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TARGET KATEGORIAL</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5'>
            <div className='text-sm font-bold text-foreground'>
              {komsel.kategorial ? (
                <Link href={`/dashboard/komsel/kategorial/${komsel.kategorial.id}`} className='text-primary hover:underline'>
                  {komsel.kategorial.nama}
                </Link>
              ) : (
                <span className='text-muted-foreground font-normal'>Umum (Semua Kategorial)</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TOTAL ANGGOTA</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5'>
            <div className='text-xl font-bold font-mono text-primary flex items-center gap-1.5'>
              <Users className='size-5' /> {komsel.totalAnggota} Jemaat
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Koordinator Komsel Card */}
      <Card className='shadow-xs bg-card border-primary/20 overflow-hidden'>
        <CardHeader className='pb-3 pt-4 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b bg-muted/10'>
          <div>
            <CardTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
              <UserCheck className='size-4 text-primary shrink-0' /> Koordinator Komsel
            </CardTitle>
            <CardDescription className='text-xs'>
              Pemimpin rohani dan penanggung jawab pertemuan Komsel ini.
            </CardDescription>
          </div>
          <Button size='sm' variant='outline' onClick={() => setChangeKoordinatorOpen(true)} className='text-xs h-8 w-full sm:w-auto shrink-0 justify-center font-medium'>
            {komsel.koordinator ? 'Ganti Koordinator' : 'Tunjuk Koordinator'}
          </Button>
        </CardHeader>
        <CardContent className='pt-3.5 pb-4 px-4'>
          {komsel.koordinator ? (
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/20 border rounded-xl gap-3'>
              <div className='flex items-start sm:items-center gap-3 min-w-0 flex-1'>
                <div className='size-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 sm:mt-0'>
                  {komsel.koordinator.nama.charAt(0)}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='font-bold text-sm text-foreground flex items-center gap-2 flex-wrap'>
                    <span>{komsel.koordinator.nama}</span>
                    <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono shrink-0'>
                      {komsel.koordinator.statusJemaat}
                    </Badge>
                  </div>
                  <div className='font-mono text-muted-foreground text-xs mt-0.5 truncate'>
                    NIJ: {komsel.koordinator.nij} • Kontak: {komsel.koordinator.noHp || '-'}
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                {waLink && (
                  <Button asChild variant='outline' size='sm' className='text-xs h-8 gap-1.5 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 font-semibold'>
                    <a href={waLink} target='_blank' rel='noreferrer'>
                      <MessageSquare className='size-3.5' /> Chat WA
                    </a>
                  </Button>
                )}
                <Button asChild variant='outline' size='sm' className='text-xs h-8'>
                  <Link href={`/dashboard/jemaat/${komsel.koordinator.id}`}>
                    Buka Profil Jemaat
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className='p-4 bg-muted/20 border border-dashed rounded-xl text-center text-xs text-muted-foreground'>
              Belum ada Koordinator yang ditunjuk untuk Komsel ini. Klik "Tunjuk Koordinator" untuk menetapkan.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Members Table */}
      <Card className='shadow-xs overflow-hidden'>
        <CardHeader className='pb-3 pt-4 px-4 border-b bg-muted/20 flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='text-sm sm:text-base flex items-center gap-2 font-bold'>
              <Users className='size-4 text-primary shrink-0' /> Anggota Terdaftar ({komsel.totalAnggota})
            </CardTitle>
            <CardDescription className='text-xs'>
              Daftar jemaat aktif yang tergabung dalam Komsel {komsel.nama}.
            </CardDescription>
          </div>
          <Button
            size='sm'
            onClick={() => setAddMemberOpen(true)}
            className='h-8 text-xs font-semibold gap-1.5'
          >
            <UserPlus className='size-3.5' /> Tambah Anggota
          </Button>
        </CardHeader>
        <CardContent className='p-0 overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent border-b bg-muted/30'>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Nama Lengkap</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>NIJ</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Gender</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Usia</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Nomor Kontak</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Kategorial</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Status Jemaat</TableHead>
                <TableHead className='px-4 font-semibold text-xs text-end whitespace-nowrap'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {komsel.anggota?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-32 text-center text-muted-foreground text-xs'>
                    Belum ada jemaat yang terdaftar dalam Komsel ini. Klik "+ Tambah Anggota" untuk mendaftarkan.
                  </TableCell>
                </TableRow>
              ) : (
                komsel.anggota.map((mem: any) => {
                  const isKoordinator = komsel.koordinatorId === mem.jemaat.id
                  return (
                    <TableRow key={mem.id} className='hover:bg-muted/30 transition-colors'>
                      <TableCell className='px-4 py-3 font-semibold text-sm text-foreground'>
                        <div className='flex items-center gap-2'>
                          <span>{mem.jemaat.nama}</span>
                          {isKoordinator && (
                            <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold gap-1'>
                              <Crown className='size-3 text-amber-500' /> Koordinator
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='px-4 py-3 font-mono text-xs font-bold text-primary'>
                        {mem.jemaat.nij || '-'}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-xs'>
                        {mem.jemaat.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}
                      </TableCell>
                      <TableCell className='px-4 py-3 font-mono text-xs font-semibold text-foreground'>
                        {formatAgeString(mem.jemaat.tanggalLahir)}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-xs text-muted-foreground font-mono'>
                        {mem.jemaat.noHp || mem.jemaat.whatsApp || '-'}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-xs'>
                        {mem.jemaat.kategorial ? (
                          <Badge variant='outline' className='text-[10px]'>
                            {mem.jemaat.kategorial.nama}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-xs'>
                        <Badge className={
                          mem.jemaat.statusJemaat === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px]'
                        }>
                          {mem.jemaat.statusJemaat}
                        </Badge>
                      </TableCell>
                      <TableCell className='px-4 py-3 text-end'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='icon' className='size-7'>
                              <MoreHorizontal className='size-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-48'>
                            <DropdownMenuLabel className='text-xs'>Aksi Anggota</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/jemaat/${mem.jemaat.id}`} className='text-xs'>
                                <Eye className='size-3.5 me-2' /> Buka Profil Jemaat
                              </Link>
                            </DropdownMenuItem>

                            {!isKoordinator && (
                              <DropdownMenuItem
                                onClick={() => setPromoteTarget(mem)}
                                className='text-xs text-primary font-semibold'
                              >
                                <Crown className='size-3.5 me-2 text-amber-500' /> Jadikan Koordinator
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className='text-rose-600 dark:text-rose-400 text-xs'
                              onClick={() => setRemoveMemberTarget(mem)}
                            >
                              <UserMinus className='size-3.5 me-2' /> Lepaskan dari Komsel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog Add Member ──────────────────────────────────── */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className='max-w-lg'>
          <form onSubmit={handleAddMemberSubmit}>
            <DialogHeader>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
                <UserPlus className='size-5 text-primary' />
                <span>Tambah Anggota ke Komsel {komsel.nama}</span>
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Setiap jemaat aktif hanya dapat terdaftar pada satu Komsel utama (Single Primary Rule).
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              {/* Search input */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Cari Jemaat (Nama / NIJ) *</Label>
                <div className='space-y-2'>
                  <Input
                    placeholder='Ketik nama atau NIJ jemaat...'
                    value={jemaatSearch}
                    onChange={(e) => setJemaatSearch(e.target.value)}
                    className='text-xs h-8'
                  />

                  <Select value={selectedJemaatId} onValueChange={setSelectedJemaatId}>
                    <SelectTrigger className='h-9 text-xs w-full'>
                      <SelectValue placeholder='Pilih jemaat dari hasil pencarian...' />
                    </SelectTrigger>
                    <SelectContent className='max-h-56'>
                      {availableJemaat.map((j) => (
                        <SelectItem key={j.id} value={j.id} className='text-xs'>
                          <div className='flex items-center gap-2'>
                            <span className='font-semibold'>{j.nama}</span>
                            <span className='font-mono text-[10px] text-muted-foreground'>({j.nij || '-'})</span>
                            {j.kategorial?.nama && (
                              <Badge variant='outline' className='text-[9px] py-0 px-1 font-normal'>
                                {j.kategorial.nama}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Jemaat Preview Card */}
              {selectedJemaat && (
                <div className={`p-3 border rounded-xl text-xs space-y-1.5 ${
                  selectedJemaat.komselId && selectedJemaat.komselId !== komsel.id
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-muted/40'
                }`}>
                  <div className='font-semibold text-foreground flex items-center justify-between'>
                    <span>{selectedJemaat.nama}</span>
                    <Badge variant='outline' className='text-[10px]'>{formatAgeString(selectedJemaat.tanggalLahir)}</Badge>
                  </div>
                  <div className='text-muted-foreground font-mono text-[11px] flex items-center gap-2 flex-wrap'>
                    <span>NIJ: {selectedJemaat.nij || '-'}</span>
                    <span>•</span>
                    <span>Gender: {selectedJemaat.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}</span>
                    {selectedJemaat.kategorial?.nama && (
                      <>
                        <span>•</span>
                        <span>{selectedJemaat.kategorial.nama}</span>
                      </>
                    )}
                  </div>
                  {selectedJemaat.komselId && selectedJemaat.komselId !== komsel.id && (
                    <div className='flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold text-[11px] pt-1 border-t border-amber-500/20'>
                      <AlertCircle className='size-3.5 shrink-0' />
                      <span>Jemaat ini sudah terdaftar di {selectedJemaat.komsel?.nama || 'Komsel lain'}. Lepaskan terlebih dahulu dari Komsel sebelumnya.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className='gap-2 pt-2'>
              <Button variant='outline' size='sm' type='button' onClick={() => setAddMemberOpen(false)} disabled={isAddingMember}>
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={
                  isAddingMember ||
                  !selectedJemaatId ||
                  (selectedJemaat?.komselId && selectedJemaat.komselId !== komsel.id)
                }
                className='gap-2'
              >
                {isAddingMember ? <Loader2 className='size-4 animate-spin' /> : <UserPlus className='size-4' />}
                {isAddingMember ? 'Menambahkan...' : 'Tambahkan Anggota'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Edit Komsel Profile ─────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleEditKomselSubmit} className='space-y-4'>
            <DialogHeader>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
                <Edit className='size-5 text-primary' />
                <span>Edit Informasi Komsel</span>
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Perbarui nama, wilayah domisili, jadwal pertemuan, dan target kategorial.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3 py-1 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nama Komsel (Wajib):</Label>
                <Input
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className='h-8 text-xs font-semibold'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Wilayah / Area (Wajib):</Label>
                <Input
                  value={editWilayah}
                  onChange={(e) => setEditWilayah(e.target.value)}
                  className='h-8 text-xs'
                  placeholder='Contoh: Padang Barat / Siteba / Ulak Karang'
                  required
                />
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Hari Pertemuan:</Label>
                  <Select value={editHari} onValueChange={(val) => setEditHari(val)}>
                    <SelectTrigger className='h-8 text-xs w-full'>
                      <SelectValue placeholder='Pilih Hari' />
                    </SelectTrigger>
                    <SelectContent>
                      {HARI_OPTIONS.map((h) => (
                        <SelectItem key={h} value={h} className='text-xs'>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Jam Pertemuan:</Label>
                  <Input
                    value={editJam}
                    onChange={(e) => setEditJam(e.target.value)}
                    className='h-8 text-xs'
                    placeholder='19:00 WIB'
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Departemen Kategorial (Opsional):</Label>
                <Select
                  value={editKategorialId || 'NONE'}
                  onValueChange={(val) => setEditKategorialId(val === 'NONE' ? '' : val)}
                >
                  <SelectTrigger className='h-8 text-xs w-full'>
                    <SelectValue placeholder='Umum (Semua Kategorial)' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='NONE' className='text-xs'>
                      🌐 Umum (Semua Kategorial)
                    </SelectItem>
                    {kategorialOptions.map((k) => (
                      <SelectItem key={k.id} value={k.id} className='text-xs'>
                        {k.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className='gap-2 pt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setEditOpen(false)}
                disabled={isUpdatingKomsel}
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isUpdatingKomsel || !editNama.trim() || !editWilayah.trim()}
                className='gap-1.5'
              >
                {isUpdatingKomsel ? <Loader2 className='size-3.5 animate-spin' /> : <Check className='size-3.5' />}
                {isUpdatingKomsel ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Change Koordinator ──────────────────────────── */}
      <Dialog open={changeKoordinatorOpen} onOpenChange={setChangeKoordinatorOpen}>
        <DialogContent className='max-w-lg'>
          <form onSubmit={handleChangeKoordinatorSubmit}>
            <DialogHeader>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
                <UserCheck className='size-5 text-primary' />
                <span>Tunjuk / Ganti Koordinator Komsel</span>
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Koordinator wajib merupakan Jemaat dengan status ACTIVE dan akan otomatis didaftarkan sebagai anggota Komsel ini.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Cari & Pilih Koordinator (Jemaat ACTIVE) *</Label>
                <div className='space-y-2'>
                  <Input
                    placeholder='Ketik nama atau NIJ...'
                    value={koordinatorSearch}
                    onChange={(e) => setKoordinatorSearch(e.target.value)}
                    className='text-xs h-8'
                  />

                  <Select value={selectedKoordinatorId} onValueChange={setSelectedKoordinatorId}>
                    <SelectTrigger className='h-9 text-xs w-full'>
                      <SelectValue placeholder='Pilih jemaat sebagai koordinator...' />
                    </SelectTrigger>
                    <SelectContent className='max-h-56'>
                      {koordinatorCandidates.map((j) => (
                        <SelectItem key={j.id} value={j.id} className='text-xs'>
                          <div className='flex items-center gap-2'>
                            <span className='font-semibold'>{j.nama}</span>
                            <span className='font-mono text-[10px] text-muted-foreground'>({j.nij || '-'})</span>
                            {j.kategorial?.nama && (
                              <Badge variant='outline' className='text-[9px] py-0 px-1 font-normal'>
                                {j.kategorial.nama}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedNewKoordinator && (
                <div className={`p-3 border rounded-xl text-xs space-y-1.5 ${
                  selectedNewKoordinator.komselId && selectedNewKoordinator.komselId !== komsel.id
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-muted/40'
                }`}>
                  <div className='font-semibold text-foreground flex items-center justify-between'>
                    <span>{selectedNewKoordinator.nama}</span>
                    <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]'>
                      {selectedNewKoordinator.statusJemaat}
                    </Badge>
                  </div>
                  <div className='text-muted-foreground font-mono text-[11px]'>
                    NIJ: {selectedNewKoordinator.nij} • Kontak: {selectedNewKoordinator.noHp || '-'}
                  </div>
                  {selectedNewKoordinator.komselId && selectedNewKoordinator.komselId !== komsel.id && (
                    <div className='flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold text-[11px] pt-1 border-t border-amber-500/20'>
                      <AlertCircle className='size-3.5 shrink-0' />
                      <span>Jemaat ini sudah terdaftar di Komsel lain. Lepaskan terlebih dahulu dari Komsel sebelumnya sebelum menjadikannya Koordinator.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className='gap-2 pt-2'>
              <Button variant='outline' size='sm' type='button' onClick={() => setChangeKoordinatorOpen(false)} disabled={isChangingKoordinator}>
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={
                  isChangingKoordinator ||
                  !selectedKoordinatorId ||
                  (selectedNewKoordinator?.komselId && selectedNewKoordinator.komselId !== komsel.id)
                }
                className='gap-2'
              >
                {isChangingKoordinator ? <Loader2 className='size-4 animate-spin' /> : <UserCheck className='size-4' />}
                {isChangingKoordinator ? 'Menyimpan...' : 'Simpan Koordinator'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog Promote Member to Koordinator ──────────── */}
      <AlertDialog open={!!promoteTarget} onOpenChange={() => setPromoteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base sm:text-lg font-bold text-foreground flex items-center gap-2'>
              <Crown className='size-5 text-amber-500' />
              <span>Jadikan {promoteTarget?.jemaat?.nama} sebagai Koordinator?</span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs text-muted-foreground space-y-2 pt-1'>
                <p>
                  Peran Koordinator Komsel untuk <strong className='text-foreground'>{komsel.nama}</strong> akan dialihkan ke <strong className='text-foreground'>{promoteTarget?.jemaat?.nama}</strong>.
                </p>
                <p>
                  Sistem akan mencatat log audit transaksi keamanan SHA-256 secara otomatis.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setPromoteTarget(null)} disabled={isPromoting}>
              Batal
            </Button>
            <Button
              className='bg-primary text-primary-foreground gap-1.5'
              onClick={handlePromoteConfirm}
              disabled={isPromoting}
            >
              {isPromoting ? <Loader2 className='size-3.5 animate-spin' /> : <Crown className='size-3.5' />}
              {isPromoting ? 'Mempromosikan...' : 'Konfirmasi Jadikan Koordinator'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Remove Member ──────────────────────────── */}
      <AlertDialog open={!!removeMemberTarget} onOpenChange={() => setRemoveMemberTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-amber-600 dark:text-amber-400'>
              Lepaskan Anggota dari Komsel?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-sm space-y-2'>
              <span>
                Apakah Anda yakin ingin melepaskan <strong className='text-foreground'>{removeMemberTarget?.jemaat?.nama}</strong> dari Komsel {komsel.nama}?
              </span>
              <span className='block text-xs text-muted-foreground'>
                Data profil Jemaat TIDAK akan dihapus. Hubungan Komsel jemaat akan dilepaskan secara aman dan log audit SHA-256 dicatat.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setRemoveMemberTarget(null)} disabled={isRemovingMember}>
              Batal
            </Button>
            <Button
              className='bg-amber-600 hover:bg-amber-700 text-white gap-2'
              onClick={handleRemoveMemberConfirm}
              disabled={isRemovingMember}
            >
              {isRemovingMember ? <Loader2 className='size-4 animate-spin' /> : <UserMinus className='size-4' />}
              Lepaskan Anggota
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Soft Delete Komsel ─────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>
              Hapus Komsel Ini?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-sm space-y-2'>
              <span>
                Komsel <strong className='text-foreground'>{komsel.nama}</strong> akan dinonaktifkan via Soft Delete.
              </span>
              <span className='block text-xs text-muted-foreground'>
                Semua anggota Komsel akan dilepaskan secara aman. Data profil Jemaat TIDAK akan dihapus dan log audit SHA-256 dicatat.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan (Wajib):</label>
            <Textarea
              placeholder='Masukkan alasan penghapusan Komsel ini...'
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className='text-xs'
            />
          </div>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button
              className='bg-rose-600 hover:bg-rose-700 text-white gap-2'
              onClick={handleDeleteKomselConfirm}
              disabled={isDeleting || !deletionReason.trim()}
            >
              {isDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
              Konfirmasi Soft Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
