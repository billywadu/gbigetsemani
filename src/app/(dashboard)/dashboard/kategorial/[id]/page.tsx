'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  Users,
  Tag,
  MoreHorizontal,
  Eye,
  Trash2,
  UserMinus,
  Loader2,
  AlertCircle,
  Edit,
  Pencil,
  CheckCircle2,
  Printer,
  MessageSquare,
  Copy,
  Check,
  Phone,
  ExternalLink,
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
  getKategorialByIdAction,
  addAnggotaKategorialAction,
  removeAnggotaKategorialAction,
  updateAnggotaKategorialAction,
  updateKategorialAction,
  deleteKategorialAction,
} from '@/actions/kategorial'
import { getJemaatListAction } from '@/actions/jemaat'
import { calculateAge, formatAgeString } from '@/lib/utils/age'
import { escapeHtml } from '@/lib/utils'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'
import { toast } from 'sonner'

export default function KategorialDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [kategorial, setKategorial] = useState<any | null>(null)

  // Edit Kategorial Modal State
  const [editKategorialOpen, setEditKategorialOpen] = useState(false)
  const [editNama, setEditNama] = useState('')
  const [editDeskripsi, setEditDeskripsi] = useState('')
  const [isEditingKategorial, setIsEditingKategorial] = useState(false)

  // Broadcast / Copy Contact Modal State
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)

  // Add Member Modal State
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [jemaatSearch, setJemaatSearch] = useState('')
  const [availableJemaat, setAvailableJemaat] = useState<any[]>([])
  const [selectedJemaatId, setSelectedJemaatId] = useState('')
  const [selectedJemaat, setSelectedJemaat] = useState<any | null>(null)
  const [newCatatan, setNewCatatan] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Edit Member Note State
  const [editMemberTarget, setEditMemberTarget] = useState<any | null>(null)
  const [editMemberCatatan, setEditMemberCatatan] = useState('')
  const [isUpdatingMember, setIsUpdatingMember] = useState(false)

  // Remove Member State
  const [removeMemberTarget, setRemoveMemberTarget] = useState<any | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)

  // Delete Category State
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)

  // Fetch Kategorial Detail from PostgreSQL
  const fetchDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getKategorialByIdAction(id)
    if (res.success && res.data) {
      setKategorial(res.data)
      setEditNama(res.data.nama || '')
      setEditDeskripsi(res.data.deskripsi || '')
    } else {
      toast.error(res.error || 'Data kategorial tidak ditemukan.')
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // Fetch Available Jemaats for Add Member modal
  useEffect(() => {
    if (addMemberOpen) {
      getJemaatListAction({ search: jemaatSearch, statusJemaat: 'ACTIVE' as any, page: 1, pageSize: 50 }).then((res) => {
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

  // 1. Official Roster Print Generator (A4)
  const handlePrintRoster = async () => {
    if (!kategorial) return
    const toastId = toast.loading('Menyiapkan dokumen daftar anggota...')
    const printConfig = await getEffectivePrintConfig()
    toast.dismiss(toastId)

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const members = kategorial.anggotaKategorial || []

    const rowsHtml = members.length > 0
      ? members.map((mem: any, idx: number) => {
          const j = mem.jemaat || {}
          return `
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="text-align: center; padding: 6px 8px;">${idx + 1}</td>
              <td style="font-weight: 700; padding: 6px 8px;">${escapeHtml(j.nama || '-')}</td>
              <td style="font-family: monospace; text-align: center; padding: 6px 8px; color: #0284c7; font-weight: 700;">${escapeHtml(j.nij || '-')}</td>
              <td style="text-align: center; padding: 6px 8px;">${j.jenisKelamin === 'LAK_LAKI' ? 'L' : j.jenisKelamin === 'PEREMPUAN' ? 'P' : '-'}</td>
              <td style="text-align: center; padding: 6px 8px;">${formatAgeString(j.tanggalLahir)}</td>
              <td style="font-family: monospace; padding: 6px 8px;">${escapeHtml(j.noHp || j.whatsApp || '-')}</td>
              <td style="padding: 6px 8px; text-align: center;">${escapeHtml(j.komsel?.nama || '-')}</td>
              <td style="padding: 6px 8px;">${escapeHtml(mem.catatan || '-')}</td>
            </tr>
          `
        }).join('')
      : `
        <tr>
          <td colspan="8" style="text-align: center; padding: 16px; color: #64748b;">Belum ada anggota kategorial terdaftar.</td>
        </tr>
      `

    const kopHtml = buildKopHtml(printConfig, {
      badgeText: 'ROSTER ANGGOTA KATEGORIAL',
      dateText: `DEPARTEMEN: ${kategorial.nama.toUpperCase()}`,
    })

    const signaturesHtml = buildSignaturesHtml(printConfig, [
      { roleKey: 'pembinaKategorial', customTitle: `Koordinator ${kategorial.nama}` },
      { roleKey: 'gembala', includeStamp: true },
    ])

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Roster Anggota - ${escapeHtml(kategorial.nama)}</title>
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
            padding: 6px 8px;
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
              <span class="meta-label">Departemen Kategorial</span>
              <span class="meta-val">${escapeHtml(kategorial.nama)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Tipe Sistem</span>
              <span class="meta-val">${kategorial.isDefault ? 'Protected Default' : 'Kategori Kustom'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Total Anggota Terdaftar</span>
              <span class="meta-val">${members.length} Jemaat</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 26px;">No</th>
                <th style="text-align: left;">Nama Lengkap Jemaat</th>
                <th style="width: 75px;">NIJ</th>
                <th style="width: 28px;">L/P</th>
                <th style="width: 60px;">Usia</th>
                <th style="width: 95px;">Nomor HP</th>
                <th style="width: 90px;">Komsel</th>
                <th>Catatan / Peran</th>
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

  // 2. Edit Kategorial Submit
  const handleEditKategorialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kategorial) return
    if (!editNama.trim()) {
      toast.error('Nama kategorial wajib diisi!')
      return
    }

    setIsEditingKategorial(true)
    const res = await updateKategorialAction({
      id: kategorial.id,
      nama: editNama.trim(),
      deskripsi: editDeskripsi.trim() || null,
    })

    setIsEditingKategorial(false)
    if (res.success) {
      toast.success('Kategorial berhasil diperbarui!')
      setEditKategorialOpen(false)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal memperbarui kategorial.')
    }
  }

  // 3. Update Member Note Submit
  const handleUpdateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMemberTarget) return

    setIsUpdatingMember(true)
    const res = await updateAnggotaKategorialAction({
      anggotaId: editMemberTarget.id,
      catatan: editMemberCatatan.trim() || null,
    })

    setIsUpdatingMember(false)
    if (res.success) {
      toast.success(res.message || 'Catatan anggota berhasil diperbarui!')
      setEditMemberTarget(null)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal memperbarui catatan anggota.')
    }
  }

  // 4. Add Member Submit
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJemaatId) {
      toast.error('Silakan pilih Jemaat!')
      return
    }

    setIsAddingMember(true)
    const res = await addAnggotaKategorialAction({
      kategorialId: id,
      jemaatId: selectedJemaatId,
      catatan: newCatatan.trim() || null,
    })

    setIsAddingMember(false)
    if (res.success) {
      toast.success('Anggota kategorial berhasil ditambahkan! Log audit SHA-256 tersimpan.')
      setAddMemberOpen(false)
      setSelectedJemaatId('')
      setNewCatatan('')
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal menambahkan anggota kategorial.')
    }
  }

  // 5. Remove Member Submit
  const handleRemoveMemberConfirm = async () => {
    if (!removeMemberTarget) return

    setIsRemovingMember(true)
    const res = await removeAnggotaKategorialAction({
      anggotaId: removeMemberTarget.id,
    })

    setIsRemovingMember(false)
    if (res.success) {
      toast.success(res.message || 'Anggota berhasil dikeluarkan dari kategorial.')
      setRemoveMemberTarget(null)
      fetchDetail()
    } else {
      toast.error(res.error || 'Gagal mengeluarkan anggota kategorial.')
    }
  }

  // 6. Delete Category Submit
  const handleDeleteCategoryConfirm = async () => {
    if (!kategorial) return
    if (kategorial.isDefault) {
      toast.error('Kategorial bawaan sistem tidak dapat dihapus!')
      return
    }
    if (!deletionReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }

    setIsDeletingCategory(true)
    const res = await deleteKategorialAction({
      id: kategorial.id,
      reason: deletionReason.trim(),
    })

    setIsDeletingCategory(false)
    if (res.success) {
      toast.success(res.message || 'Kategorial berhasil di-soft delete.')
      setDeleteOpen(false)
      router.push('/dashboard/kategorial')
    } else {
      toast.error(res.error || 'Gagal menghapus kategorial.')
    }
  }

  // 7. Copy All Phone Numbers
  const validContacts = (kategorial?.anggotaKategorial || [])
    .filter((mem: any) => mem.jemaat?.noHp || mem.jemaat?.whatsApp)
    .map((mem: any) => ({
      nama: mem.jemaat.nama,
      noHp: mem.jemaat.noHp || mem.jemaat.whatsApp,
    }))

  const handleCopyContacts = () => {
    if (validContacts.length === 0) return
    const text = validContacts.map((c: any) => `${c.nama}: ${c.noHp}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    toast.success(`${validContacts.length} kontak WhatsApp berhasil disalin!`)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  if (loading) {
    return (
      <div className='p-8 flex items-center justify-center min-h-[50vh]'>
        <div className='flex items-center gap-3 text-muted-foreground'>
          <Loader2 className='size-5 animate-spin text-primary' />
          <span>Memuat detail kategorial...</span>
        </div>
      </div>
    )
  }

  if (!kategorial) {
    return (
      <div className='p-8 text-center space-y-4'>
        <div className='text-rose-500 font-bold text-lg'>Kategorial Tidak Ditemukan</div>
        <Button asChild variant='outline'>
          <Link href='/dashboard/kategorial'>Kembali ke Daftar Kategorial</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header Bar */}
      <div className='flex flex-col gap-3.5 border-b pb-4'>
        {/* Navigation & Badges Row */}
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          <Button asChild variant='ghost' size='sm' className='h-8 px-2 -ml-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground'>
            <Link href='/dashboard/kategorial'>
              <ArrowLeft className='size-4' />
              <span>Daftar Kategorial</span>
            </Link>
          </Button>
          {kategorial.isDefault ? (
            <Badge className='bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 gap-1 font-mono text-[10px] shrink-0'>
              <ShieldCheck className='size-3' /> Protected Default
            </Badge>
          ) : (
            <Badge variant='outline' className='gap-1 font-mono text-[10px] shrink-0'>
              <Tag className='size-3 text-muted-foreground' /> Kustom
            </Badge>
          )}
        </div>

        {/* Title & Description */}
        <div className='space-y-1'>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
            {kategorial.nama}
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground'>
            {kategorial.deskripsi || 'Departemen pembinaan kategorial jemaat gereja.'}
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className='flex flex-wrap items-center gap-2 w-full pt-1'>
          <Button
            size='sm'
            onClick={handlePrintRoster}
            className='gap-1.5 h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs'
          >
            <Printer className='size-3.5' /> Cetak Roster Kategorial
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={() => setBroadcastOpen(true)}
            className='gap-1.5 h-8 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10'
          >
            <MessageSquare className='size-3.5' /> Broadcast & Kontak WA
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setEditNama(kategorial.nama)
              setEditDeskripsi(kategorial.deskripsi || '')
              setEditKategorialOpen(true)
            }}
            className='gap-1.5 h-8 text-xs font-medium'
          >
            <Edit className='size-3.5' /> Edit Info Kategorial
          </Button>

          <Button
            size='sm'
            variant='outline'
            onClick={() => setAddMemberOpen(true)}
            className='gap-1.5 h-8 text-xs font-semibold'
          >
            <UserPlus className='size-3.5' /> Tambah Anggota
          </Button>

          {!kategorial.isDefault && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setDeleteOpen(true)}
              className='gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 h-8 text-xs ml-auto'
            >
              <Trash2 className='size-3.5' /> Hapus Kategori
            </Button>
          )}
        </div>
      </div>

      {/* Summary Information Cards */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card className='shadow-xs bg-card border-primary/20'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>NAMA DEPARTEMEN</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5'>
            <div className='text-base sm:text-lg font-bold text-primary flex items-center gap-1.5'>
              <Tag className='size-4 text-primary' />
              {kategorial.nama}
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TIPE SISTEM</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5'>
            <div className='text-sm font-bold text-foreground'>
              {kategorial.isDefault ? 'Sistem Bawaan (Protected)' : 'Kategorial Kustom'}
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3.5'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TOTAL ANGGOTA TERDAFTAR</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3.5'>
            <div className='text-lg font-bold font-mono text-primary flex items-center gap-1.5'>
              <Users className='size-4 text-primary' />
              {kategorial.totalAnggota} Jemaat
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Members Table */}
      <Card className='shadow-xs overflow-hidden'>
        <CardHeader className='pb-3 pt-4 px-4 border-b bg-muted/20 flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='text-sm sm:text-base flex items-center gap-2 font-bold'>
              <Users className='size-4 text-primary shrink-0' /> Anggota Terdaftar ({kategorial.totalAnggota})
            </CardTitle>
            <CardDescription className='text-xs'>
              Daftar jemaat yang terdaftar dalam kategorial {kategorial.nama}.
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
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Catatan / Peran</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Status Jemaat</TableHead>
                <TableHead className='px-4 font-semibold text-xs text-end whitespace-nowrap'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kategorial.anggotaKategorial?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-32 text-center text-muted-foreground text-xs'>
                    Belum ada jemaat yang terdaftar dalam kategorial ini. Klik "+ Tambah Anggota" untuk menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                kategorial.anggotaKategorial.map((mem: any) => {
                  const ageStr = formatAgeString(mem.jemaat.tanggalLahir)
                  const rawHp = (mem.jemaat.noHp || mem.jemaat.whatsApp || '').replace(/[^0-9]/g, '')
                  const waUrl = rawHp ? `https://wa.me/${rawHp.startsWith('0') ? '62' + rawHp.slice(1) : rawHp}` : null

                  return (
                    <TableRow key={mem.id} className='hover:bg-muted/30 transition-colors'>
                      <TableCell className='px-4 py-3 font-semibold text-sm text-foreground'>
                        {mem.jemaat.nama}
                      </TableCell>
                      <TableCell className='px-4 py-3 font-mono text-xs font-bold text-primary'>
                        {mem.jemaat.nij || '-'}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-xs'>
                        {mem.jemaat.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}
                      </TableCell>
                      <TableCell className='px-4 py-3 font-mono text-xs font-semibold text-foreground'>
                        {ageStr}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-xs font-mono text-muted-foreground'>
                        {waUrl ? (
                          <a href={waUrl} target='_blank' rel='noreferrer' className='text-primary hover:underline flex items-center gap-1'>
                            <MessageSquare className='size-3 text-emerald-600' />
                            <span>{mem.jemaat.noHp || mem.jemaat.whatsApp}</span>
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-xs text-muted-foreground max-w-xs truncate' title={mem.catatan || ''}>
                        {mem.catatan || '-'}
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
                                <Eye className='size-3.5 me-2' /> Lihat Profil Jemaat
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className='text-xs'
                              onClick={() => {
                                setEditMemberTarget(mem)
                                setEditMemberCatatan(mem.catatan || '')
                              }}
                            >
                              <Pencil className='size-3.5 me-2' /> Edit Catatan
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className='text-rose-600 dark:text-rose-400 text-xs'
                              onClick={() => setRemoveMemberTarget(mem)}
                            >
                              <UserMinus className='size-3.5 me-2' /> Keluarkan dari Kategori
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

      {/* ── Dialog Broadcast & Contacts ────────────────────────── */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
              <MessageSquare className='size-5 text-emerald-600' />
              <span>Kontak WhatsApp Anggota ({validContacts.length})</span>
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Salin daftar nomor untuk broadcast warta atau hubungi anggota langsung via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className='max-h-60 overflow-y-auto space-y-1.5 py-2'>
            {validContacts.length === 0 ? (
              <div className='p-4 text-center text-xs text-muted-foreground border rounded-lg'>
                Belum ada nomor kontak yang tercatat pada anggota kategorial ini.
              </div>
            ) : (
              validContacts.map((c: any, i: number) => {
                const raw = c.noHp.replace(/[^0-9]/g, '')
                const link = `https://wa.me/${raw.startsWith('0') ? '62' + raw.slice(1) : raw}`
                return (
                  <div key={i} className='flex items-center justify-between p-2 rounded-lg border text-xs bg-muted/20'>
                    <div>
                      <div className='font-semibold text-foreground'>{c.nama}</div>
                      <div className='font-mono text-muted-foreground text-[11px]'>{c.noHp}</div>
                    </div>
                    <Button asChild variant='ghost' size='sm' className='h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700'>
                      <a href={link} target='_blank' rel='noreferrer'>
                        <MessageSquare className='size-3' /> Chat
                      </a>
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className='gap-2 pt-2'>
            <Button variant='outline' size='sm' onClick={() => setBroadcastOpen(false)}>
              Tutup
            </Button>
            {validContacts.length > 0 && (
              <Button size='sm' onClick={handleCopyContacts} className='gap-1.5'>
                {copiedAll ? <Check className='size-3.5' /> : <Copy className='size-3.5' />}
                {copiedAll ? 'Tersalin!' : 'Salin Semua Nomor'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Add Member ──────────────────────────────────── */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className='max-w-lg'>
          <form onSubmit={handleAddMemberSubmit}>
            <DialogHeader>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
                <UserPlus className='size-5 text-primary' />
                <span>Tambah Anggota ke {kategorial.nama}</span>
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Setiap jemaat dapat memiliki 1 kategorial utama + multiple sub-kategorial.
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
                            <Badge variant='outline' className='text-[9px] py-0 px-1 font-normal'>
                              {j.jenisKelamin === 'LAK_LAKI' ? 'L' : 'P'} • {formatAgeString(j.tanggalLahir)}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Jemaat Preview Card */}
              {selectedJemaat && (
                <div className='p-3 bg-muted/40 border rounded-xl space-y-1 text-xs'>
                  <div className='font-semibold text-foreground flex items-center justify-between'>
                    <span>{selectedJemaat.nama}</span>
                    <Badge variant='outline' className='text-[10px]'>{formatAgeString(selectedJemaat.tanggalLahir)}</Badge>
                  </div>
                  <div className='text-muted-foreground font-mono text-[11px] flex items-center gap-2 flex-wrap'>
                    <span>NIJ: {selectedJemaat.nij || '-'}</span>
                    <span>•</span>
                    <span>Gender: {selectedJemaat.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}</span>
                  </div>
                </div>
              )}

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Catatan Keanggotaan / Peran (Opsional):</Label>
                <Input
                  placeholder='Contoh: Pengurus, Pembina Kelompok, Anggota Aktif...'
                  value={newCatatan}
                  onChange={(e) => setNewCatatan(e.target.value)}
                  className='text-xs h-8'
                />
              </div>
            </div>

            <DialogFooter className='gap-2 pt-2'>
              <Button variant='outline' size='sm' type='button' onClick={() => setAddMemberOpen(false)} disabled={isAddingMember}>
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={isAddingMember || !selectedJemaatId} className='gap-1.5'>
                {isAddingMember ? <Loader2 className='size-3.5 animate-spin' /> : <UserPlus className='size-3.5' />}
                {isAddingMember ? 'Menambahkan...' : 'Tambahkan Anggota'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Edit Kategorial ─────────────────────────────── */}
      <Dialog open={editKategorialOpen} onOpenChange={setEditKategorialOpen}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleEditKategorialSubmit} className='space-y-4'>
            <DialogHeader>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
                <Edit className='size-5 text-primary' />
                <span>Edit Informasi Kategorial</span>
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Perbarui nama atau deskripsi scope untuk departemen kategorial ini.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3 py-1 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nama Kategorial (Wajib):</Label>
                <Input
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  placeholder='Nama kategorial...'
                  className='h-8 text-xs font-semibold'
                  disabled={kategorial.isDefault}
                  required
                />
                {kategorial.isDefault && (
                  <p className='text-[10px] text-muted-foreground'>Nama kategori bawaan sistem dilindungi dari perubahan.</p>
                )}
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Deskripsi Scope Kategorial:</Label>
                <Textarea
                  value={editDeskripsi}
                  onChange={(e) => setEditDeskripsi(e.target.value)}
                  placeholder='Deskripsi target usia atau kelompok kategorial ini...'
                  className='text-xs'
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className='gap-2 pt-2'>
              <Button type='button' variant='outline' size='sm' onClick={() => setEditKategorialOpen(false)}>
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={isEditingKategorial} className='gap-1.5 font-semibold'>
                {isEditingKategorial ? <Loader2 className='size-3.5 animate-spin' /> : <CheckCircle2 className='size-3.5' />}
                {isEditingKategorial ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Edit Member Catatan ─────────────────────────── */}
      <Dialog open={!!editMemberTarget} onOpenChange={() => setEditMemberTarget(null)}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleUpdateMemberSubmit} className='space-y-4'>
            <DialogHeader>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
                <Pencil className='size-5 text-primary' />
                <span>Edit Catatan Anggota</span>
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Perbarui catatan keanggotaan untuk <strong className='text-foreground'>{editMemberTarget?.jemaat?.nama}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3 py-1 text-xs'>
              {editMemberTarget && (
                <div className='p-3 bg-muted/40 border rounded-xl space-y-1 text-xs'>
                  <div className='font-semibold text-foreground flex items-center justify-between'>
                    <span>{editMemberTarget.jemaat?.nama}</span>
                    <Badge variant='outline' className='text-[10px]'>{formatAgeString(editMemberTarget.jemaat?.tanggalLahir)}</Badge>
                  </div>
                  <div className='text-muted-foreground font-mono text-[11px]'>
                    NIJ: {editMemberTarget.jemaat?.nij} • Gender: {editMemberTarget.jemaat?.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}
                  </div>
                </div>
              )}

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Catatan / Peran Anggota:</Label>
                <Textarea
                  value={editMemberCatatan}
                  onChange={(e) => setEditMemberCatatan(e.target.value)}
                  placeholder='Misal: Pengurus inti, pembimbing kelompok, anggota aktif...'
                  className='text-xs'
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className='gap-2 pt-2'>
              <Button type='button' variant='outline' size='sm' onClick={() => setEditMemberTarget(null)}>
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={isUpdatingMember} className='gap-1.5 font-semibold'>
                {isUpdatingMember ? <Loader2 className='size-3.5 animate-spin' /> : <CheckCircle2 className='size-3.5' />}
                {isUpdatingMember ? 'Menyimpan...' : 'Simpan Catatan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog Remove Member ──────────────────────────── */}
      <AlertDialog open={!!removeMemberTarget} onOpenChange={() => setRemoveMemberTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-amber-600 dark:text-amber-400'>
              Keluarkan Anggota dari Kategorial?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-sm space-y-2'>
              <span>
                Anda akan mengeluarkan <strong className='text-foreground'>{removeMemberTarget?.jemaat?.nama}</strong> dari kategorial {kategorial.nama}.
              </span>
              <span className='block text-xs text-muted-foreground'>
                Data profil Jemaat TIDAK akan dihapus. Hanya hubungan dengan kategorial ini yang dilepas secara aman.
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
              Keluarkan dari Kategorial
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Delete Kategorial ──────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>
              Soft Delete Kategorial Ini?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-sm space-y-2'>
              {kategorial.isDefault ? (
                <div className='p-3 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-800 dark:text-indigo-300 text-xs flex items-center gap-2'>
                  <AlertCircle className='size-5 shrink-0' />
                  <span>PROTEKSI SISTEM: Kategorial bawaan sistem ({kategorial.nama}) tidak dapat dihapus!</span>
                </div>
              ) : (
                <>
                  <span>
                    Kategorial kustom <strong className='text-foreground'>{kategorial.nama}</strong> akan dinonaktifkan via Soft Delete.
                  </span>
                  <span className='block text-xs text-muted-foreground'>
                    Seluruh data profil Jemaat TIDAK akan dihapus. Hubungan anggota akan dilepas dan log audit SHA-256 dicatat.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {!kategorial.isDefault && (
            <div className='py-2 space-y-1.5'>
              <label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan (Wajib):</label>
              <Textarea
                placeholder='Masukkan alasan penghapusan kategorial ini...'
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className='text-xs'
              />
            </div>
          )}

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setDeleteOpen(false)} disabled={isDeletingCategory}>
              {kategorial.isDefault ? 'Tutup' : 'Batal'}
            </Button>
            {!kategorial.isDefault && (
              <Button
                className='bg-rose-600 hover:bg-rose-700 text-white gap-2'
                onClick={handleDeleteCategoryConfirm}
                disabled={isDeletingCategory || !deletionReason.trim()}
              >
                {isDeletingCategory ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
                Konfirmasi Soft Delete
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
