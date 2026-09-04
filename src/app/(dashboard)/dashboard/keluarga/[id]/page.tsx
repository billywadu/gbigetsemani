'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  Users,
  Phone,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserMinus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Printer,
  MessageSquare,
  ExternalLink,
  Crown,
  Sparkles,
  Home,
  Check,
  Calendar,
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
  getKeluargaByIdAction,
  addAnggotaKeluargaAction,
  updateRelasiAnggotaAction,
  removeAnggotaKeluargaAction,
  deleteKeluargaAction,
  updateKeluargaAction,
  promoteKepalaKeluargaAction,
} from '@/actions/keluarga'
import { getJemaatListAction } from '@/actions/jemaat'
import { toast } from 'sonner'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'
import { escapeHtml } from '@/lib/utils'

export default function KeluargaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [keluarga, setKeluarga] = useState<any | null>(null)

  // Add Member Modal State
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [jemaatSearch, setJemaatSearch] = useState('')
  const [availableJemaat, setAvailableJemaat] = useState<any[]>([])
  const [selectedJemaatId, setSelectedJemaatId] = useState('')
  const [selectedJemaat, setSelectedJemaat] = useState<any | null>(null)
  const [newRelasi, setNewRelasi] = useState<string>('ANAK')
  const [newCatatanRelasi, setNewCatatanRelasi] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Edit Relation Modal State
  const [editMemberTarget, setEditMemberTarget] = useState<any | null>(null)
  const [editRelasi, setEditRelasi] = useState<string>('ANAK')
  const [editCatatanRelasi, setEditCatatanRelasi] = useState('')
  const [isUpdatingRelation, setIsUpdatingRelation] = useState(false)

  // Promote Kepala Keluarga Modal State
  const [promoteTarget, setPromoteTarget] = useState<any | null>(null)
  const [isPromoting, setIsPromoting] = useState(false)

  // Edit Family Profile Modal State
  const [editFamilyOpen, setEditFamilyOpen] = useState(false)
  const [editFamilyNama, setEditFamilyNama] = useState('')
  const [editFamilyNoHp, setEditFamilyNoHp] = useState('')
  const [editFamilyAlamat, setEditFamilyAlamat] = useState('')
  const [isEditingFamily, setIsEditingFamily] = useState(false)

  // Remove Member State
  const [removeMemberTarget, setRemoveMemberTarget] = useState<any | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)

  // Delete Family State
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeletingFamily, setIsDeletingFamily] = useState(false)

  // Fetch Family Detail from PostgreSQL
  const fetchDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getKeluargaByIdAction(id)
    if (res.success && res.data) {
      setKeluarga(res.data)
      setEditFamilyNama(res.data.namaKeluarga || '')
      setEditFamilyNoHp(res.data.noHp || '')
      setEditFamilyAlamat(res.data.alamat || '')
    } else {
      toast.error(res.error || 'Data Kartu Keluarga tidak ditemukan.')
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // Fetch Available Jemaats for Add Member modal
  useEffect(() => {
    if (addMemberOpen) {
      getJemaatListAction({ search: jemaatSearch, page: 1, pageSize: 50 }).then((res) => {
        if (res.success && res.data) {
          setAvailableJemaat(res.data.items)
        }
      })
    }
  }, [addMemberOpen, jemaatSearch])

  // Update selected jemaat object preview
  useEffect(() => {
    if (selectedJemaatId) {
      const match = availableJemaat.find((j) => j.id === selectedJemaatId)
      setSelectedJemaat(match || null)
    } else {
      setSelectedJemaat(null)
    }
  }, [selectedJemaatId, availableJemaat])

  // 1. Single Print KKG Sheet
  const handlePrintKKG = async () => {
    if (!keluarga) return
    const toastId = toast.loading('Menyiapkan formulir Kartu Keluarga...')
    const printConfig = await getEffectivePrintConfig()
    toast.dismiss(toastId)

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const kepala = keluarga.kepalaJemaat
    const members = keluarga.anggotaKeluarga || []

    const rowsHtml = members.length > 0
      ? members.map((m: any, idx: number) => {
          const j = m.jemaat || {}
          const isKepala = j.id === keluarga.kepalaId
          const birth = j.tanggalLahir
            ? `${j.tempatLahir ? j.tempatLahir + ', ' : ''}${new Date(j.tanggalLahir).toLocaleDateString('id-ID')}`
            : j.tempatLahir || '-'
          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="text-align: center; padding: 6px 8px;">${idx + 1}</td>
              <td style="font-weight: 700; padding: 6px 8px;">
                ${escapeHtml(j.nama || '-')}${j.namaPanggilan ? ` (${escapeHtml(j.namaPanggilan)})` : ''}
                ${isKepala ? ' <span style="font-size: 8.5px; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 1px 4px; border-radius: 3px; font-weight: 800;">KEPALA</span>' : ''}
              </td>
              <td style="font-family: monospace; text-align: center; padding: 6px 8px; color: #0284c7; font-weight: 700;">${escapeHtml(j.nij || '-')}</td>
              <td style="text-align: center; font-weight: 600; padding: 6px 8px;">${escapeHtml(m.relasi || '-')}</td>
              <td style="text-align: center; padding: 6px 8px;">${j.jenisKelamin === 'LAK_LAKI' ? 'L' : j.jenisKelamin === 'PEREMPUAN' ? 'P' : '-'}</td>
              <td style="padding: 6px 8px;">${escapeHtml(birth)}</td>
              <td style="text-align: center; padding: 6px 8px;">${j.statusBaptis === 'SUDAH_BAPTIS' ? 'Sudah' : 'Belum'}</td>
              <td style="text-align: center; padding: 6px 8px;">${escapeHtml(j.statusPernikahan || '-')}</td>
            </tr>
          `
        }).join('')
      : `
        <tr>
          <td colspan="8" style="text-align: center; padding: 16px; color: #64748b;">Belum ada anggota keluarga terdaftar.</td>
        </tr>
      `

    const kopHtml = buildKopHtml(printConfig, {
      badgeText: 'KARTU KELUARGA GEREJA',
      dateText: `NO: ${keluarga.nomorKeluarga || '-'}`,
    })

    const signaturesHtml = buildSignaturesHtml(printConfig, [
      { roleKey: 'gembala', includeStamp: true },
      { roleKey: 'sekretaris' },
    ])

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Kartu Keluarga - ${escapeHtml(keluarga.namaKeluarga)} (${escapeHtml(keluarga.nomorKeluarga)})</title>
        <style>
          @page {
            size: ${printConfig.options.ukuranKertasDefault || 'A4'} portrait;
            margin: 12mm 15mm;
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
            font-size: 11px;
          }
          .sheet-container {
            width: 100%;
            margin: 0 auto;
          }
          .meta-box {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin: 14px 0;
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
            margin-top: 10px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-weight: 800;
            font-size: 10px;
            text-transform: uppercase;
            padding: 7px 8px;
            border: 1px solid #0f172a;
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
              <span class="meta-label">Nama Kartu Keluarga</span>
              <span class="meta-val">${escapeHtml(keluarga.namaKeluarga)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Nomor Kartu Keluarga</span>
              <span class="meta-val" style="font-family: monospace; color: #0284c7;">${escapeHtml(keluarga.nomorKeluarga)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Kepala Keluarga</span>
              <span class="meta-val">${escapeHtml(kepala?.nama || 'Belum Ditentukan')} ${kepala?.nij ? `(${escapeHtml(kepala.nij)})` : ''}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Kontak & Alamat Domisili</span>
              <span class="meta-val" style="font-size: 10.5px; font-weight: 600;">
                ${escapeHtml(keluarga.noHp || kepala?.noHp || '-')} • ${escapeHtml(keluarga.alamat || '-')}
              </span>
            </div>
          </div>

          <div style="font-weight: 800; font-size: 11px; margin-top: 14px; margin-bottom: 4px; text-transform: uppercase; color: #0f172a; border-left: 3px solid #0f172a; padding-left: 6px;">
            Daftar Susunan Anggota Keluarga (${members.length} Jemaat)
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 28px; text-align: center;">No</th>
                <th style="text-align: left;">Nama Lengkap</th>
                <th style="width: 80px; text-align: center;">NIJ</th>
                <th style="width: 75px; text-align: center;">Relasi</th>
                <th style="width: 32px; text-align: center;">L/P</th>
                <th>Tempat, Tanggal Lahir</th>
                <th style="width: 55px; text-align: center;">Baptis</th>
                <th style="width: 70px; text-align: center;">Pernikahan</th>
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
                  ${escapeHtml(printConfig.options.catatanKakiResmi)} • Verifikasi Dokumen SHA-256 Otentik ${escapeHtml(printConfig.kop?.namaGereja || 'Gereja')}.
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
      toast.error('Silakan pilih Jemaat!')
      return
    }

    setIsAddingMember(true)
    const res = await addAnggotaKeluargaAction({
      keluargaId: id,
      jemaatId: selectedJemaatId,
      relasi: newRelasi as any,
      catatanRelasi: newCatatanRelasi.trim() || undefined,
    })

    setIsAddingMember(false)
    if (res.success) {
      toast.success('Anggota keluarga berhasil ditambahkan! Log audit SHA-256 tersimpan.')
      setAddMemberOpen(false)
      setSelectedJemaatId('')
      setNewRelasi('ANAK')
      setNewCatatanRelasi('')
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal menambahkan anggota keluarga.')
    }
  }

  // 3. Edit Relation Submit
  const handleEditRelationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMemberTarget) return

    setIsUpdatingRelation(true)
    const res = await updateRelasiAnggotaAction({
      anggotaId: editMemberTarget.id,
      relasi: editRelasi as any,
      catatanRelasi: editCatatanRelasi.trim() || undefined,
    })

    setIsUpdatingRelation(false)
    if (res.success) {
      toast.success('Status relasi anggota berhasil diperbarui.')
      setEditMemberTarget(null)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal memperbarui relasi anggota.')
    }
  }

  // 4. Promote to Kepala Keluarga Submit
  const handlePromoteConfirm = async () => {
    if (!promoteTarget) return

    setIsPromoting(true)
    const res = await promoteKepalaKeluargaAction({
      keluargaId: id,
      anggotaId: promoteTarget.id,
    })

    setIsPromoting(false)
    if (res.success) {
      toast.success(res.message || 'Berhasil menetapkan Kepala Keluarga baru!')
      setPromoteTarget(null)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal mengubah Kepala Keluarga.')
    }
  }

  // 5. Edit Family Info Submit
  const handleEditFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editFamilyNama.trim()) {
      toast.error('Nama Keluarga wajib diisi!')
      return
    }

    setIsEditingFamily(true)
    const res = await updateKeluargaAction({
      id,
      namaKeluarga: editFamilyNama.trim(),
      noHp: editFamilyNoHp.trim() || undefined,
      alamat: editFamilyAlamat.trim() || undefined,
    })

    setIsEditingFamily(false)
    if (res.success) {
      toast.success('Informasi profil keluarga berhasil diperbarui.')
      setEditFamilyOpen(false)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal memperbarui informasi keluarga.')
    }
  }

  // 6. Remove Member Submit
  const handleRemoveMemberConfirm = async () => {
    if (!removeMemberTarget) return

    setIsRemovingMember(true)
    const res = await removeAnggotaKeluargaAction({
      anggotaId: removeMemberTarget.id,
    })

    setIsRemovingMember(false)
    if (res.success) {
      toast.success(res.message || 'Anggota berhasil dikeluarkan dari Kartu Keluarga.')
      setRemoveMemberTarget(null)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal mengeluarkan anggota keluarga.')
    }
  }

  // 7. Delete Family Submit
  const handleDeleteFamilyConfirm = async () => {
    if (!keluarga) return
    if (!deletionReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }

    setIsDeletingFamily(true)
    const res = await deleteKeluargaAction({
      id: keluarga.id,
      reason: deletionReason.trim(),
    })

    setIsDeletingFamily(false)
    if (res.success) {
      toast.success(res.message || 'Kartu Keluarga berhasil di-soft delete.')
      setDeleteOpen(false)
      router.push('/dashboard/keluarga')
    } else {
      toast.error(res.error || 'Gagal menghapus Kartu Keluarga.')
    }
  }

  // Helper Badge Function
  const getRelasiBadge = (relasi: string, isKepala: boolean) => {
    if (isKepala) {
      return (
        <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-bold text-[11px]'>
          <Crown className='size-3 text-amber-500' /> KEPALA KELUARGA
        </Badge>
      )
    }
    switch (relasi) {
      case 'SUAMI':
        return (
          <Badge variant='outline' className='bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold text-[11px]'>
            SUAMI
          </Badge>
        )
      case 'ISTRI':
        return (
          <Badge variant='outline' className='bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 font-semibold text-[11px]'>
            ISTRI
          </Badge>
        )
      case 'ANAK':
        return (
          <Badge variant='outline' className='bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 font-semibold text-[11px]'>
            ANAK
          </Badge>
        )
      case 'ORANG_TUA':
      case 'MERTUA':
        return (
          <Badge variant='outline' className='bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold text-[11px]'>
            {relasi}
          </Badge>
        )
      case 'CUCU':
        return (
          <Badge variant='outline' className='bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 font-semibold text-[11px]'>
            CUCU
          </Badge>
        )
      default:
        return (
          <Badge variant='outline' className='font-semibold text-[11px]'>
            {relasi}
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-100 text-muted-foreground gap-2 text-sm'>
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat detail kartu keluarga...
      </div>
    )
  }

  if (!keluarga) {
    return (
      <div className='space-y-4 max-w-xl mx-auto py-12 text-center'>
        <h2 className='text-xl font-bold text-rose-600 dark:text-rose-400'>Data Tidak Ditemukan</h2>
        <p className='text-sm text-muted-foreground'>Kartu Keluarga telah dihapus atau tidak terdaftar.</p>
        <Button asChild variant='outline'>
          <Link href='/dashboard/keluarga'>Kembali ke Daftar Keluarga</Link>
        </Button>
      </div>
    )
  }

  const rawPhone = (keluarga.noHp || keluarga.kepalaJemaat?.noHp || '').replace(/[^0-9]/g, '')
  const waLink = rawPhone ? `https://wa.me/${rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone}` : null

  return (
    <div className='space-y-6'>
      {/* Header Bar */}
      <div className='flex flex-col gap-3.5 border-b pb-4'>
        {/* Navigation & Badges Row */}
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          <Button asChild variant='ghost' size='sm' className='h-8 px-2 -ml-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground'>
            <Link href='/dashboard/keluarga'>
              <ArrowLeft className='size-4' />
              <span>Daftar Keluarga</span>
            </Link>
          </Button>
          <Badge className='font-mono bg-primary/10 text-primary border-primary/20 text-xs shrink-0'>
            {keluarga.nomorKeluarga}
          </Badge>
        </div>

        {/* Title & Kepala Keluarga */}
        <div className='space-y-1'>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
            {keluarga.namaKeluarga}
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground'>
            Kepala Keluarga:{' '}
            <span className='font-semibold text-foreground'>
              {keluarga.kepalaJemaat?.nama || 'Belum Ditentukan'}
            </span>
            {keluarga.alamat && ` • Alamat: ${keluarga.alamat}`}
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className='flex items-center gap-2 flex-wrap pt-1'>
          <Button
            size='sm'
            onClick={handlePrintKKG}
            className='gap-1.5 h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs'
          >
            <Printer className='size-3.5' /> Cetak Kartu Keluarga (KKG)
          </Button>

          {waLink && (
            <Button
              asChild
              variant='outline'
              size='sm'
              className='gap-1.5 h-8 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10'
            >
              <a href={waLink} target='_blank' rel='noreferrer'>
                <MessageSquare className='size-3.5' /> Hubungi WA Kepala
              </a>
            </Button>
          )}

          <Button
            variant='outline'
            size='sm'
            onClick={() => setEditFamilyOpen(true)}
            className='gap-1.5 h-8 text-xs font-medium'
          >
            <Edit className='size-3.5' /> Edit Info Keluarga
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
            <Trash2 className='size-3.5' /> Hapus KK
          </Button>
        </div>
      </div>

      {/* Summary Information Cards */}
      <div className='grid gap-4 sm:grid-cols-4'>
        <Card className='shadow-xs bg-card border-primary/20'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>NOMOR KARTU KELUARGA</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5'>
            <div className='text-lg font-bold font-mono text-primary flex items-center gap-1.5'>
              <ShieldCheck className='size-4 text-emerald-500' />
              {keluarga.nomorKeluarga}
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>KEPALA KELUARGA</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5'>
            <div className='text-sm font-bold text-foreground truncate'>
              {keluarga.kepalaJemaat?.nama || 'Belum Ditentukan'}
            </div>
            {keluarga.kepalaJemaat && (
              <div className='text-[10px] font-mono text-muted-foreground'>{keluarga.kepalaJemaat.nij}</div>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TOTAL ANGGOTA</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5'>
            <div className='text-lg font-bold font-mono text-foreground flex items-center gap-1'>
              <Users className='size-4 text-primary' />
              {keluarga.totalAnggota} Jemaat
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>KONTAK UTAMA</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5 text-xs'>
            <div className='font-mono font-semibold flex items-center gap-1 text-foreground'>
              <Phone className='size-3 text-primary' /> {keluarga.noHp || '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Members Table */}
      <Card className='shadow-xs overflow-hidden'>
        <CardHeader className='pb-3 pt-4 px-4 border-b bg-muted/20 flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='text-sm sm:text-base flex items-center gap-2 font-bold'>
              <Users className='size-4 text-primary shrink-0' /> Anggota Keluarga ({keluarga.totalAnggota})
            </CardTitle>
            <CardDescription className='text-xs'>
              Daftar jemaat yang terdaftar dalam susunan Kartu Keluarga ini.
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
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Nama Anggota Jemaat</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Status Relasi</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Catatan Relasi</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Status Jemaat</TableHead>
                <TableHead className='px-4 font-semibold text-xs text-end whitespace-nowrap'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keluarga.anggotaKeluarga?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='h-32 text-center text-muted-foreground text-xs'>
                    Belum ada anggota yang terhubung dalam Kartu Keluarga ini. Klik "+ Tambah Anggota" untuk menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                keluarga.anggotaKeluarga.map((mem: any) => {
                  const isKepala = mem.jemaat.id === keluarga.kepalaId
                  return (
                    <TableRow key={mem.id} className='hover:bg-muted/30 transition-colors'>
                      <TableCell className='px-4 py-3 font-medium text-xs'>
                        <div className='font-semibold text-foreground text-sm flex items-center gap-2'>
                          <span>{mem.jemaat.nama}</span>
                          {isKepala && (
                            <Badge className='text-[9px] bg-amber-500 text-white font-bold h-4 px-1 gap-0.5 border-none'>
                              <Crown className='size-2.5' /> Kepala
                            </Badge>
                          )}
                        </div>
                        <div className='font-mono text-muted-foreground text-[11px]'>
                          {mem.jemaat.nij} • {mem.jemaat.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}
                        </div>
                      </TableCell>
                      <TableCell className='px-4 py-3 text-xs'>
                        {getRelasiBadge(mem.relasi, isKepala)}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-xs text-muted-foreground'>
                        {mem.catatanRelasi || '-'}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-xs'>
                        <Badge className={
                          mem.jemaat.statusJemaat === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold text-[10px]'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold text-[10px]'
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

                            {!isKepala && (
                              <DropdownMenuItem
                                onClick={() => setPromoteTarget(mem)}
                                className='text-xs text-primary font-semibold'
                              >
                                <Crown className='size-3.5 me-2 text-amber-500' /> Jadikan Kepala Keluarga
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => {
                                setEditMemberTarget(mem)
                                setEditRelasi(mem.relasi)
                                setEditCatatanRelasi(mem.catatanRelasi || '')
                              }}
                              className='text-xs'
                            >
                              <Edit className='size-3.5 me-2' /> Edit Status Relasi
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className='text-rose-600 dark:text-rose-400 text-xs'
                              onClick={() => setRemoveMemberTarget(mem)}
                            >
                              <UserMinus className='size-3.5 me-2' /> Keluarkan dari KK
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

      {/* Dialog Add Member */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className='max-w-lg'>
          <form onSubmit={handleAddMemberSubmit}>
            <DialogHeader>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
                <UserPlus className='size-5 text-primary' />
                <span>Tambah Anggota ke Kartu Keluarga</span>
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Hubungkan jemaat aktif ke Kartu Keluarga ini. Setiap jemaat hanya dapat memiliki 1 KK aktif.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              {/* Searchable Jemaat selector */}
              <div className='space-y-1.5'>
                <Label htmlFor='jemaatSearch' className='text-xs font-semibold'>Cari Jemaat (Nama / NIJ) *</Label>
                <div className='relative'>
                  <Input
                    id='jemaatSearch'
                    placeholder='Ketik nama atau NIJ jemaat...'
                    value={jemaatSearch}
                    onChange={(e) => setJemaatSearch(e.target.value)}
                    className='text-xs h-8'
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='selectedJemaatId' className='text-xs font-semibold'>Pilih Jemaat *</Label>
                <Select value={selectedJemaatId} onValueChange={setSelectedJemaatId}>
                  <SelectTrigger id='selectedJemaatId' className='text-xs h-9'>
                    <SelectValue placeholder='Pilih dari daftar jemaat...' />
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

              {/* Jemaat Preview Card */}
              {selectedJemaat && (
                <div className='p-3 bg-muted/40 border rounded-xl space-y-1.5 text-xs'>
                  <div className='font-semibold text-foreground flex items-center justify-between'>
                    <span>{selectedJemaat.nama}</span>
                    <Badge variant='outline' className='text-[10px]'>{selectedJemaat.statusJemaat}</Badge>
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
                </div>
              )}

              <div className='space-y-1.5'>
                <Label htmlFor='newRelasi' className='text-xs font-semibold'>Status Relasi Keluarga *</Label>
                <Select value={newRelasi} onValueChange={setNewRelasi}>
                  <SelectTrigger id='newRelasi' className='text-xs h-8'>
                    <SelectValue placeholder='Pilih Relasi' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='SUAMI'>Suami</SelectItem>
                    <SelectItem value='ISTRI'>Istri</SelectItem>
                    <SelectItem value='ANAK'>Anak</SelectItem>
                    <SelectItem value='ORANG_TUA'>Orang Tua</SelectItem>
                    <SelectItem value='MERTUA'>Mertua</SelectItem>
                    <SelectItem value='CUCU'>Cucu</SelectItem>
                    <SelectItem value='LAINNYA'>Famili Lain / Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='newCatatanRelasi' className='text-xs font-semibold'>Catatan Relasi (Opsional)</Label>
                <Input
                  id='newCatatanRelasi'
                  placeholder='Contoh: Anak Pertama / Anak Kedua / Tinggal Bersama...'
                  value={newCatatanRelasi}
                  onChange={(e) => setNewCatatanRelasi(e.target.value)}
                  className='text-xs h-8'
                />
              </div>
            </div>

            <DialogFooter className='gap-2 pt-2'>
              <Button variant='outline' size='sm' type='button' onClick={() => setAddMemberOpen(false)} disabled={isAddingMember}>
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={isAddingMember || !selectedJemaatId} className='gap-2'>
                {isAddingMember ? <Loader2 className='size-4 animate-spin' /> : <UserPlus className='size-4' />}
                {isAddingMember ? 'Menambahkan...' : 'Tambahkan Anggota'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Relasi */}
      <Dialog open={!!editMemberTarget} onOpenChange={() => setEditMemberTarget(null)}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleEditRelationSubmit}>
            <DialogHeader>
              <DialogTitle className='text-base sm:text-lg font-bold'>Edit Status Relasi Anggota</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Perbarui status hubungan relasi <strong className='text-foreground'>{editMemberTarget?.jemaat?.nama}</strong> dalam KK ini.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label htmlFor='editRelasi' className='text-xs font-semibold'>Status Relasi *</Label>
                <Select value={editRelasi} onValueChange={setEditRelasi}>
                  <SelectTrigger id='editRelasi' className='text-xs h-8'>
                    <SelectValue placeholder='Pilih Relasi' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='SUAMI'>Suami</SelectItem>
                    <SelectItem value='ISTRI'>Istri</SelectItem>
                    <SelectItem value='ANAK'>Anak</SelectItem>
                    <SelectItem value='ORANG_TUA'>Orang Tua</SelectItem>
                    <SelectItem value='MERTUA'>Mertua</SelectItem>
                    <SelectItem value='CUCU'>Cucu</SelectItem>
                    <SelectItem value='LAINNYA'>Famili Lain / Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='editCatatanRelasi' className='text-xs font-semibold'>Catatan Relasi</Label>
                <Input
                  id='editCatatanRelasi'
                  placeholder='Catatan khusus relasi...'
                  value={editCatatanRelasi}
                  onChange={(e) => setEditCatatanRelasi(e.target.value)}
                  className='text-xs h-8'
                />
              </div>
            </div>

            <DialogFooter className='gap-2 pt-2'>
              <Button variant='outline' size='sm' type='button' onClick={() => setEditMemberTarget(null)} disabled={isUpdatingRelation}>
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={isUpdatingRelation} className='gap-2'>
                {isUpdatingRelation ? <Loader2 className='size-4 animate-spin' /> : <Edit className='size-4' />}
                {isUpdatingRelation ? 'Memperbarui...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Family Profile */}
      <Dialog open={editFamilyOpen} onOpenChange={setEditFamilyOpen}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleEditFamilySubmit} className='space-y-4'>
            <DialogHeader>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
                <Edit className='size-5 text-primary' />
                <span>Edit Informasi Keluarga</span>
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Perbarui nama kartu keluarga, nomor kontak, dan alamat domisili.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3 py-1 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nama Kartu Keluarga (Wajib):</Label>
                <Input
                  value={editFamilyNama}
                  onChange={(e) => setEditFamilyNama(e.target.value)}
                  className='h-8 text-xs font-semibold'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nomor Telepon / WhatsApp:</Label>
                <Input
                  value={editFamilyNoHp}
                  onChange={(e) => setEditFamilyNoHp(e.target.value)}
                  className='h-8 text-xs font-mono'
                  placeholder='081234567890'
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Alamat Domisili:</Label>
                <Textarea
                  value={editFamilyAlamat}
                  onChange={(e) => setEditFamilyAlamat(e.target.value)}
                  className='text-xs min-h-16'
                  placeholder='Alamat lengkap rumah keluarga...'
                />
              </div>
            </div>

            <DialogFooter className='gap-2 pt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setEditFamilyOpen(false)}
                disabled={isEditingFamily}
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isEditingFamily || !editFamilyNama.trim()}
                className='gap-1.5'
              >
                {isEditingFamily ? <Loader2 className='size-3.5 animate-spin' /> : <Check className='size-3.5' />}
                {isEditingFamily ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Promote Member to Kepala Keluarga */}
      <AlertDialog open={!!promoteTarget} onOpenChange={() => setPromoteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base sm:text-lg font-bold text-foreground flex items-center gap-2'>
              <Crown className='size-5 text-amber-500' />
              <span>Jadikan {promoteTarget?.jemaat?.nama} sebagai Kepala Keluarga?</span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs text-muted-foreground space-y-2 pt-1'>
                <p>
                  Peran Kepala Keluarga untuk <strong className='text-foreground'>{keluarga.namaKeluarga}</strong> akan dialihkan ke <strong className='text-foreground'>{promoteTarget?.jemaat?.nama}</strong>.
                </p>
                <p className='text-muted-foreground'>
                  Kepala Keluarga sebelumnya akan otomatis disesuaikan status relasinya dan log audit otentikasi SHA-256 akan dicatat di sistem.
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
              {isPromoting ? 'Mempromosikan...' : 'Konfirmasi Jadikan Kepala'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Remove Member */}
      <AlertDialog open={!!removeMemberTarget} onOpenChange={() => setRemoveMemberTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-amber-600 dark:text-amber-400'>
              Keluarkan Anggota dari Kartu Keluarga?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-sm space-y-2'>
              <span>
                Anda akan mengeluarkan <strong className='text-foreground'>{removeMemberTarget?.jemaat?.nama}</strong> dari Kartu Keluarga {keluarga.nomorKeluarga}.
              </span>
              <span className='block text-xs text-muted-foreground'>
                Data Jemaat tidak akan dihapus dari sistem. Hanya hubungan relasi dengan Kartu Keluarga ini yang akan dilepas secara aman.
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
              Keluarkan dari KK
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Delete Family */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>
              Soft Delete Kartu Keluarga Ini?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-sm space-y-2'>
              <span>
                Kartu Keluarga <strong className='text-foreground'>{keluarga.namaKeluarga}</strong> ({keluarga.nomorKeluarga}) akan dinonaktifkan via Soft Delete.
              </span>
              <span className='block text-xs text-muted-foreground'>
                Seluruh data Jemaat anggota keluarga ini TIDAK akan dihapus. Hubungan anggota akan dilepas dan log audit SHA-256 dicatat.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan (Wajib):</label>
            <Textarea
              placeholder='Contoh: Pemisahan kartu keluarga baru / Penggabungan KK...'
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className='text-xs'
            />
          </div>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setDeleteOpen(false)} disabled={isDeletingFamily}>
              Batal
            </Button>
            <Button
              className='bg-rose-600 hover:bg-rose-700 text-white gap-2'
              onClick={handleDeleteFamilyConfirm}
              disabled={isDeletingFamily || !deletionReason.trim()}
            >
              {isDeletingFamily ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
              Konfirmasi Soft Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
