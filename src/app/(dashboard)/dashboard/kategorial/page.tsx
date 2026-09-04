'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  Users,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  FilterX,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Printer,
  Download,
  RefreshCw,
  X,
  Check,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  DropdownMenuCheckboxItem,
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
  getKategorialListAction,
  createKategorialAction,
  updateKategorialAction,
  deleteKategorialAction,
  restoreKategorialAction,
  hardDeleteKategorialAction,
  bulkSoftDeleteKategorialAction,
  bulkRecalculateKategorialCountsAction,
  getKategorialForPrintReportsAction,
} from '@/actions/kategorial'
import { toast } from 'sonner'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'

export default function KategorialListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [kategorialList, setKategorialList] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newNama, setNewNama] = useState('')
  const [newDeskripsi, setNewDeskripsi] = useState('')

  // Edit Modal State
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [editNama, setEditNama] = useState('')
  const [editDeskripsi, setEditDeskripsi] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Delete & Restore State
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [hardDeleteTarget, setHardDeleteTarget] = useState<any | null>(null)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [isHardDeleting, setIsHardDeleting] = useState(false)

  // Bulk Actions States
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState('')
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const [isSyncingCounts, setIsSyncingCounts] = useState(false)

  const [printReportsModalOpen, setPrintReportsModalOpen] = useState(false)
  const [printReportsData, setPrintReportsData] = useState<any[]>([])
  const [isLoadingPrintReports, setIsLoadingPrintReports] = useState(false)

  // Column Visibility States
  const [visibleColumns, setVisibleColumns] = useState({
    nama: true,
    deskripsi: true,
    totalAnggota: true,
    systemType: true,
  })

  // Pagination states
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  // Sorting state
  const [sortField, setSortField] = useState<'nama' | 'totalAnggota' | null>('nama')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Fetch Data Function from PostgreSQL
  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getKategorialListAction({
      search: searchTerm,
      statusHapus: statusHapusFilter,
      page: pageIndex + 1,
      pageSize,
    })

    if (res.success && res.data) {
      setKategorialList(res.data.items)
      setTotalCount(res.data.total)
    } else {
      toast.error(res.error || 'Gagal memuat data kategorial.')
    }
    setLoading(false)
  }, [searchTerm, statusHapusFilter, pageIndex, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Client-side Sorting
  const sortedKategorialList = React.useMemo(() => {
    if (!sortField) return kategorialList
    return [...kategorialList].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''
      if (sortField === 'nama') {
        aVal = a.nama || ''
        bVal = b.nama || ''
      } else if (sortField === 'totalAnggota') {
        aVal = a.totalAnggota || 0
        bVal = b.totalAnggota || 0
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [kategorialList, sortField, sortOrder])

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id])
  const selectedCount = selectedIds.length

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    sortedKategorialList.forEach((item) => {
      updated[item.id] = checked
    })
    setSelectedRows(updated)
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows((prev) => ({ ...prev, [id]: checked }))
  }

  // 1. Export CSV Handler
  const handleExportCsv = () => {
    const targets = selectedCount > 0
      ? kategorialList.filter((k) => selectedRows[k.id])
      : kategorialList

    if (targets.length === 0) {
      toast.error('Tidak ada data kategorial untuk diekspor.')
      return
    }

    const headers = [
      'Nama Kategorial',
      'Deskripsi Pelayanan',
      'Status Default',
      'Total Anggota',
      'Status Data',
      'Tanggal Terdaftar',
    ]

    const rows = targets.map((k) => [
      `"${(k.nama || '').replace(/"/g, '""')}"`,
      `"${(k.deskripsi || '').replace(/"/g, '""')}"`,
      `"${k.isDefault ? 'BAWAAN SISTEM (DEFAULT)' : 'KUSTOM'}"`,
      `"${k.totalAnggota || 0}"`,
      `"${k.deletedAt ? 'TERHAPUS (SOFT)' : 'AKTIF'}"`,
      `"${k.createdAt ? new Date(k.createdAt).toLocaleDateString('id-ID') : '-'}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Data_Kategorial_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${targets.length} data kategorial ke CSV.`)
  }

  // 2. Bulk Sync / Recalculate Member Counts
  const handleBulkSyncCounts = async () => {
    if (selectedIds.length === 0) return
    setIsSyncingCounts(true)
    const res = await bulkRecalculateKategorialCountsAction(selectedIds)
    setIsSyncingCounts(false)
    if (res.success) {
      toast.success(res.message)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menyinkronkan total anggota.')
    }
  }

  // 3. Direct Print Kategorial Reports (Without Preview Modal)
  const handleOpenPrintReports = async () => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal satu kategorial untuk dicetak.')
      return
    }
    const toastId = toast.loading('Menyiapkan laporan kategorial...')
    setIsLoadingPrintReports(true)
    const res = await getKategorialForPrintReportsAction(selectedIds)
    setIsLoadingPrintReports(false)
    toast.dismiss(toastId)

    if (!res.success || !res.data || res.data.length === 0) {
      toast.error(res.error || 'Gagal memuat laporan kategorial.')
      return
    }

    const printReportsData = res.data
    const printConfig = await getEffectivePrintConfig()

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const reportsHtml = printReportsData
      .map((kat) => {
        const members = kat.anggotaKategorial || []
        const total = members.length
        const totalL = members.filter((m: any) => m.jemaat?.jenisKelamin === 'LAK_LAKI').length
        const totalP = members.filter((m: any) => m.jemaat?.jenisKelamin === 'PEREMPUAN').length
        const totalBaptis = members.filter((m: any) => m.jemaat?.statusBaptis === 'SUDAH_BAPTIS').length

        const rowsHtml = members.length > 0
          ? members.map((m: any, idx: number) => {
              const j = m.jemaat || {}
              return `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td style="font-weight: 700;">${j.nama || '-'}${j.namaPanggilan ? ` (${j.namaPanggilan})` : ''}</td>
                  <td style="font-family: monospace; text-align: center;">${j.nij || '-'}</td>
                  <td style="text-align: center;">${j.jenisKelamin === 'LAK_LAKI' ? 'L' : j.jenisKelamin === 'PEREMPUAN' ? 'P' : '-'}</td>
                  <td>${j.noHp || '-'}</td>
                  <td>${j.komsel?.nama || '-'}</td>
                  <td style="text-align: center;">${j.statusBaptis === 'SUDAH_BAPTIS' ? 'Sudah' : 'Belum'}</td>
                  <td style="text-align: center;">${j.statusJemaat || 'ACTIVE'}</td>
                </tr>
              `
            }).join('')
          : `
            <tr>
              <td colspan="8" style="text-align: center; padding: 16px; color: #64748b;">Belum ada anggota jemaat terdaftar di departemen ini.</td>
            </tr>
          `

        const kopHtml = buildKopHtml(printConfig, {
          badgeText: kat.isDefault ? 'KATEGORIAL UTAMA' : 'KATEGORIAL PELAYANAN',
          dateText: `Tanggal: ${new Date().toLocaleDateString('id-ID')}`,
        })

        const signaturesHtml = buildSignaturesHtml(printConfig, [
          { roleKey: 'pembinaKategorial', customTitle: 'Ketua / Koordinator Departemen' },
          { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
        ])

        return `
          <div class="sheet">
            <!-- Kop Surat Resmi -->
            ${kopHtml}

            <!-- Title & Description Box -->
            <div class="overview-box">
              <div class="overview-title">DEPARTEMEN KATEGORIAL: ${kat.nama.toUpperCase()}</div>
              ${kat.deskripsi ? `<div class="overview-desc">${kat.deskripsi}</div>` : ''}
              
              <!-- Stats Cards Grid -->
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-lbl">Total Anggota</div>
                  <div class="stat-val">${total} Jemaat</div>
                </div>
                <div class="stat-card">
                  <div class="stat-lbl">Pria / Laki-laki</div>
                  <div class="stat-val">${totalL} Orang</div>
                </div>
                <div class="stat-card">
                  <div class="stat-lbl">Wanita / Perempuan</div>
                  <div class="stat-val">${totalP} Orang</div>
                </div>
                <div class="stat-card">
                  <div class="stat-lbl">Sudah Dibaptis</div>
                  <div class="stat-val">${totalBaptis} Jemaat</div>
                </div>
              </div>
            </div>

            <!-- Member Roster Table -->
            <div style="font-weight: 800; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; color: #0f172a;">
              Daftar Roster Anggota Terdaftar (${total} Orang)
            </div>
            <table class="members-table">
              <thead>
                <tr>
                  <th style="width: 30px;">No</th>
                  <th>Nama Lengkap</th>
                  <th style="width: 100px;">NIJ</th>
                  <th style="width: 40px;">L/P</th>
                  <th>No. WhatsApp</th>
                  <th>Komsel</th>
                  <th style="width: 70px;">Baptis</th>
                  <th style="width: 70px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- Signatures -->
            ${signaturesHtml}

            ${printConfig.options.tampilkanWatermarkAudit ? `
              <div style="font-size: 8px; color: #94a3b8; margin-top: 10px; text-align: center; font-family: monospace; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                ${printConfig.options.catatanKakiResmi} • Verifikasi Dokumen SHA-256 Otentik ${printConfig.kop?.namaGereja || 'Gereja'}.
              </div>
            ` : ''}
          </div>
        `
      })
      .join('')

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Laporan Rekap Kategorial (${printReportsData.length} Kategorial) - ${printConfig.kop?.namaGereja || 'Gereja'}</title>
        <style>
          @page {
            size: ${printConfig.options.ukuranKertasDefault || 'A4'} portrait;
            margin: 12mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .sheet {
            page-break-after: always;
            break-after: page;
            padding: 10px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 270mm;
            border-bottom: 1px dashed #cbd5e1;
          }
          .sheet:last-child {
            page-break-after: auto;
            break-after: auto;
            border-bottom: none;
          }
          .overview-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 14px;
          }
          .overview-title {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
          }
          .overview-desc {
            font-size: 11px;
            color: #475569;
            margin-top: 2px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-top: 10px;
          }
          .stat-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 10px;
            text-align: center;
          }
          .stat-lbl {
            font-size: 9px;
            color: #64748b;
            font-weight: 600;
          }
          .stat-val {
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          .members-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: auto;
          }
          .members-table th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            font-weight: 800;
            text-align: left;
          }
          .members-table td {
            border: 1px solid #e2e8f0;
            padding: 5px 8px;
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        ${reportsHtml}
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

  // 4. Bulk Delete Submit
  const handleBulkDeleteSubmit = async () => {
    if (selectedIds.length === 0) return
    if (!bulkDeleteReason.trim()) {
      toast.error('Alasan penghapusan massal wajib diisi.')
      return
    }
    setIsBulkDeleting(true)
    const res = await bulkSoftDeleteKategorialAction({
      ids: selectedIds,
      reason: bulkDeleteReason.trim(),
    })
    setIsBulkDeleting(false)
    if (res.success) {
      toast.success(res.message)
      setBulkDeleteModalOpen(false)
      setBulkDeleteReason('')
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus kategorial.')
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNama.trim()) {
      toast.error('Nama Kategorial wajib diisi!')
      return
    }

    setIsSubmitting(true)
    const res = await createKategorialAction({
      nama: newNama.trim(),
      deskripsi: newDeskripsi.trim() || null,
    })

    setIsSubmitting(false)
    if (res.success && res.data) {
      const created = res.data
      toast.success(`Kategorial "${created.nama}" berhasil dibuat!`, {
        action: {
          label: 'Buka Detail',
          onClick: () => router.push(`/dashboard/kategorial/${created.id}`),
        },
      })
      setCreateOpen(false)
      setNewNama('')
      setNewDeskripsi('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal membuat kategorial.')
    }
  }

  const openEditModal = (kat: any) => {
    setEditTarget(kat)
    setEditNama(kat.nama || '')
    setEditDeskripsi(kat.deskripsi || '')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    if (!editNama.trim()) {
      toast.error('Nama kategorial wajib diisi!')
      return
    }

    setIsEditing(true)
    const res = await updateKategorialAction({
      id: editTarget.id,
      nama: editNama.trim(),
      deskripsi: editDeskripsi.trim() || null,
    })
    setIsEditing(false)

    if (res.success) {
      toast.success('Kategorial berhasil diperbarui!')
      setEditTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui kategorial.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    if (deleteTarget.isDefault) {
      toast.error('Kategorial bawaan sistem tidak dapat dihapus!')
      return
    }

    if (!deletionReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deleteKategorialAction({
      id: deleteTarget.id,
      reason: deletionReason.trim(),
    })

    setIsDeleting(false)
    if (res.success) {
      toast.success(res.message || 'Kategorial berhasil di-soft delete.')
      setDeleteTarget(null)
      setDeletionReason('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus kategorial.')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    const res = await restoreKategorialAction({ id: restoreTarget.id })
    setIsRestoring(false)

    if (res.success) {
      toast.success(res.message || 'Kategorial berhasil dipulihkan!')
      setRestoreTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memulihkan kategorial.')
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return
    setIsHardDeleting(true)
    const res = await hardDeleteKategorialAction({
      id: hardDeleteTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Kategorial berhasil dihapus permanen dari database!')
      setHardDeleteTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen kategorial.')
    }
  }

  const isAllPaginatedSelected =
    kategorialList.length > 0 && kategorialList.every((item) => selectedRows[item.id])

  const renderColumnHeader = (
    title: string,
    field?: 'nama' | 'totalAnggota',
    columnKey?: keyof typeof visibleColumns
  ) => {
    const isSorted = field && sortField === field

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            className='-ms-3 h-8 data-[state=open]:bg-accent font-semibold text-xs text-foreground flex items-center gap-1.5'
          >
            <span>{title}</span>
            {isSorted ? (
              sortOrder === 'asc' ? (
                <ArrowUp className='size-3.5' />
              ) : (
                <ArrowDown className='size-3.5' />
              )
            ) : (
              field && <ArrowUpDown className='size-3.5 opacity-50' />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-44'>
          {field && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setSortField(field)
                  setSortOrder('asc')
                }}
                className='text-xs gap-2'
              >
                <ArrowUp className='size-3.5 text-muted-foreground' /> Menaik (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSortField(field)
                  setSortOrder('desc')
                }}
                className='text-xs gap-2'
              >
                <ArrowDown className='size-3.5 text-muted-foreground' /> Menurun (Z-A)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {columnKey && (
            <DropdownMenuItem
              onClick={() => setVisibleColumns((prev) => ({ ...prev, [columnKey]: false }))}
              className='text-xs gap-2'
            >
              <EyeOff className='size-3.5 text-muted-foreground' /> Sembunyikan Kolom
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Header Bar matching shadcn-admin */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Kategorial Jemaat</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Kelola kelompok demografi dan kategorial usia.
          </p>
        </div>
        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button size='sm' onClick={() => setCreateOpen(true)} className='w-full sm:w-auto h-9 sm:h-8 gap-1.5 text-xs shadow-xs'>
            <Plus className='size-3.5' /> Tambah Kategorial
          </Button>
        </div>
      </div>

      {/* Toolbar Filter Section */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <Input
            placeholder='Cari nama, deskripsi...'
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPageIndex(0)
            }}
            className='h-8 text-xs w-full sm:w-60'
          />

          <div className='flex items-center gap-2'>
            {/* Filter Status Hapus */}
            <Select
              value={statusHapusFilter}
              onValueChange={(val: 'ACTIVE' | 'DELETED' | 'ALL') => {
                setStatusHapusFilter(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 flex-1 sm:flex-initial sm:w-36 text-xs font-medium'>
                <SelectValue placeholder='Status Data' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ACTIVE' className='text-xs'>
                  <span className='flex items-center gap-1.5'>
                    <CheckCircle2 className='size-3.5 text-emerald-600' />
                    <span>Data Aktif</span>
                  </span>
                </SelectItem>
                <SelectItem value='DELETED' className='text-xs'>
                  <span className='flex items-center gap-1.5'>
                    <Trash2 className='size-3.5 text-rose-500' />
                    <span>Terhapus</span>
                  </span>
                </SelectItem>
                <SelectItem value='ALL' className='text-xs'>
                  <span className='flex items-center gap-1.5'>
                    <Layers className='size-3.5 text-muted-foreground' />
                    <span>Semua Status</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || statusHapusFilter !== 'ACTIVE') && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSearchTerm('')
                  setStatusHapusFilter('ACTIVE')
                  setPageIndex(0)
                }}
                className='h-8 px-2 text-xs gap-1 text-muted-foreground shrink-0'
              >
                Reset <FilterX className='size-3' />
              </Button>
            )}
          </div>
        </div>

        {/* View Options Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='h-8 w-full sm:w-auto gap-1.5 text-xs'>
              <SlidersHorizontal className='size-3.5' /> View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuLabel className='text-xs'>Toggle Kolom</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={visibleColumns.nama}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, nama: !!c }))}
            >
              Nama Kategorial
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.deskripsi}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, deskripsi: !!c }))}
            >
              Deskripsi Scope
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.systemType}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, systemType: !!c }))}
            >
              Tipe Sistem
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.totalAnggota}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, totalAnggota: !!c }))}
            >
              Total Anggota
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Data Table */}
      <div className='rounded-md border overflow-hidden bg-card'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent border-b'>
                <TableHead className='w-10 px-3'>
                  <Checkbox
                    checked={isAllPaginatedSelected}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </TableHead>
                {visibleColumns.nama && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Nama Kategorial', 'nama', 'nama')}
                  </TableHead>
                )}
                {visibleColumns.deskripsi && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Deskripsi Scope Demografi', undefined, 'deskripsi')}
                  </TableHead>
                )}
                {visibleColumns.systemType && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Tipe Sistem', undefined, 'systemType')}
                  </TableHead>
                )}
                {visibleColumns.totalAnggota && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Total Anggota', 'totalAnggota', 'totalAnggota')}
                  </TableHead>
                )}
                <TableHead className='w-12.5 px-3 text-end'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-32 text-center text-muted-foreground text-sm'>
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='size-4 animate-spin text-primary' /> Memuat data kategorial...
                    </div>
                  </TableCell>
                </TableRow>
              ) : kategorialList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-32 text-center text-muted-foreground text-sm'>
                    No results. Belum ada kategorial.
                  </TableCell>
                </TableRow>
              ) : (
                sortedKategorialList.map((kat) => {
                  const isSelected = !!selectedRows[kat.id]
                  const isDeleted = !!kat.deletedAt
                  return (
                    <TableRow
                      key={kat.id}
                      className={`transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'} ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className='px-3 py-2.5'>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(kat.id, !!checked)}
                        />
                      </TableCell>
                      {visibleColumns.nama && (
                        <TableCell className='px-3 py-2.5 font-bold text-sm text-foreground'>
                          <div className='flex items-center gap-2'>
                            <span>{kat.nama}</span>
                            {isDeleted && (
                              <Badge variant='destructive' className='text-[10px] gap-1 font-mono'>
                                <Trash2 className='size-3' /> Terhapus
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.deskripsi && (
                        <TableCell
                          className='px-3 py-2.5 text-xs text-muted-foreground max-w-sm truncate'
                          title={kat.deskripsi || '-'}
                        >
                          {kat.deskripsi || '-'}
                        </TableCell>
                      )}
                      {visibleColumns.systemType && (
                        <TableCell className='px-3 py-2.5'>
                          {kat.isDefault ? (
                            <Badge className='bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 gap-1 font-mono text-[10px]'>
                              <ShieldCheck className='size-3' /> Protected Default
                            </Badge>
                          ) : (
                            <Badge variant='outline' className='gap-1 font-mono text-[10px]'>
                              <Tag className='size-3 text-muted-foreground' /> Kustom
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.totalAnggota && (
                        <TableCell className='px-3 py-2.5'>
                          <Badge variant='outline' className='gap-1 font-mono font-normal text-[11px]'>
                            <Users className='size-3 text-primary' /> {kat.totalAnggota} Jemaat
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className='px-3 py-2.5 text-end'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='icon' className='size-7'>
                              <MoreHorizontal className='size-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuLabel className='text-xs'>Aksi Kategorial</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/kategorial/${kat.id}`}>
                                <Eye className='size-3.5 me-2' /> Lihat Detail Rincian
                              </Link>
                            </DropdownMenuItem>

                            {!isDeleted && !kat.isDefault && (
                              <DropdownMenuItem
                                onClick={() => openEditModal(kat)}
                                className='text-xs'
                              >
                                <Edit className='size-3.5 me-2' /> Edit Kategorial
                              </DropdownMenuItem>
                            )}

                            {isDeleted ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setRestoreTarget(kat)}
                                  className='text-emerald-600 dark:text-emerald-400 text-xs'
                                >
                                  <RotateCcw className='size-3.5 me-2' /> Pulihkan Kategorial
                                </DropdownMenuItem>
                                {!kat.isDefault && (
                                  <DropdownMenuItem
                                    onClick={() => setHardDeleteTarget(kat)}
                                    className='text-rose-600 dark:text-rose-400 text-xs'
                                  >
                                    <Trash2 className='size-3.5 me-2' /> Hapus Permanen
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className={kat.isDefault ? 'text-muted-foreground cursor-not-allowed' : 'text-rose-600 dark:text-rose-400'}
                                  onClick={() => {
                                    if (kat.isDefault) {
                                      toast.error('Kategorial bawaan sistem tidak dapat dihapus!')
                                      return
                                    }
                                    setDeleteTarget(kat)
                                  }}
                                >
                                  <Trash2 className='size-3.5 me-2' /> Hapus Kategorial
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer / Pagination */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border-t text-xs text-muted-foreground bg-card'>
          {/* Selection count */}
          <div className='text-center sm:text-left shrink-0'>
            <span className='font-medium text-foreground'>{selectedCount}</span> dari {totalCount} baris dipilih.
          </div>

          <div className='flex items-center justify-between sm:justify-end gap-4'>
            {/* Rows per page */}
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Per halaman</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val))
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className='h-7 w-14 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='5'>5</SelectItem>
                  <SelectItem value='10'>10</SelectItem>
                  <SelectItem value='20'>20</SelectItem>
                  <SelectItem value='50'>50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Page info + navigation */}
            <div className='flex items-center gap-2'>
              <span className='whitespace-nowrap'>Hal. {pageIndex + 1} / {totalPages}</span>
              <div className='flex items-center gap-0.5'>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex(0)}
                >
                  <ChevronsLeft className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  disabled={pageIndex >= totalPages - 1}
                  onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                >
                  <ChevronRight className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  disabled={pageIndex >= totalPages - 1}
                  onClick={() => setPageIndex(totalPages - 1)}
                >
                  <ChevronsRight className='size-3.5' />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Create Kategorial Kustom */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Buat Kategorial Kustom Baru</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Kategorial kustom dibuat untuk mengelompokkan jemaat sesuai divisi pelayanan khusus.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label htmlFor='nama' className='text-xs'>Nama Kategorial *</Label>
                <Input
                  id='nama'
                  placeholder='Contoh: Usia Emas / Single Parents / Multi-Ethnic'
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className='text-xs'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='deskripsi' className='text-xs'>Deskripsi & Scope Demografi</Label>
                <Textarea
                  id='deskripsi'
                  placeholder='Penjelasan ruang lingkup kategorial ini...'
                  value={newDeskripsi}
                  onChange={(e) => setNewDeskripsi(e.target.value)}
                  className='text-xs'
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => setCreateOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type='submit' disabled={isSubmitting} className='gap-2'>
                {isSubmitting ? <Loader2 className='size-4 animate-spin' /> : <Plus className='size-4' />}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Kategorial'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Kategorial Kustom */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Edit Kategorial</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Perbarui informasi nama dan deskripsi kategorial kustom.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label htmlFor='edit-nama' className='text-xs'>Nama Kategorial *</Label>
                <Input
                  id='edit-nama'
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className='text-xs'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='edit-deskripsi' className='text-xs'>Deskripsi & Scope Demografi</Label>
                <Textarea
                  id='edit-deskripsi'
                  value={editDeskripsi}
                  onChange={(e) => setEditDeskripsi(e.target.value)}
                  className='text-xs'
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => setEditTarget(null)} disabled={isEditing}>
                Batal
              </Button>
              <Button type='submit' disabled={isEditing} className='gap-2'>
                {isEditing ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
                {isEditing ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Soft Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>
              Hapus Kategorial?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                {deleteTarget?.isDefault ? (
                  <div className='p-3 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-800 dark:text-indigo-300 text-xs flex items-center gap-2'>
                    <ShieldAlert className='size-5 shrink-0' />
                    <span>PROTEKSI SISTEM: Kategorial bawaan sistem ({deleteTarget?.nama}) tidak dapat dihapus!</span>
                  </div>
                ) : (
                  <>
                    <span>
                      Kategorial kustom <strong className='text-foreground'>{deleteTarget?.nama}</strong> akan dinonaktifkan via Soft Delete.
                    </span>
                    <span className='block text-xs text-muted-foreground'>
                      Data profil Jemaat TIDAK akan dihapus. Hubungan kategorial jemaat akan dilepas secara aman dan log audit SHA-256 dicatat.
                    </span>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {!deleteTarget?.isDefault && (
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
            <Button variant='outline' onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Tutup
            </Button>
            {!deleteTarget?.isDefault && (
              <Button
                className='bg-rose-600 hover:bg-rose-700 text-white gap-2'
                onClick={handleDeleteConfirm}
                disabled={isDeleting || !deletionReason.trim()}
              >
                {isDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
                Konfirmasi Soft Delete
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Restore Confirm */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Kategorial?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Kategorial <strong className='text-foreground'>{restoreTarget?.nama}</strong> akan dipulihkan kembali ke daftar aktif.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setRestoreTarget(null)} disabled={isRestoring}>
              Batal
            </Button>
            <Button
              className='bg-emerald-600 hover:bg-emerald-700 text-white gap-2'
              onClick={handleRestoreConfirm}
              disabled={isRestoring}
            >
              {isRestoring ? <Loader2 className='size-4 animate-spin' /> : <RotateCcw className='size-4' />}
              Ya, Pulihkan Kategorial
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Hard Delete Confirm */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5 text-rose-600' /> Hapus Permanen Kategorial?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs'>
                  ⚠️ <strong>PERINGATAN</strong>: Kategorial <strong className='text-foreground'>{hardDeleteTarget?.nama}</strong> akan dihapus secara permanen dari database.
                </div>
                <div className='space-y-1 pt-2'>
                  <label className='text-xs font-semibold text-foreground block'>Keterangan Tambahan (Opsional):</label>
                  <Textarea
                    placeholder='Catatan penghapusan permanen...'
                    value={hardDeleteReason}
                    onChange={(e) => setHardDeleteReason(e.target.value)}
                    className='text-xs min-h-12.5'
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setHardDeleteTarget(null)} disabled={isHardDeleting}>
              Batal
            </Button>
            <Button
              variant='destructive'
              className='gap-2 bg-rose-700 hover:bg-rose-800'
              onClick={handleHardDeleteConfirm}
              disabled={isHardDeleting}
            >
              {isHardDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
              Hapus Permanen Sekarang
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── FLOATING BOTTOM BATCH BAR (Single Clean 1-Row Pill) ── */}
      {selectedCount > 0 && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-full p-1.5 px-3 sm:px-4 flex items-center flex-nowrap gap-1.5 sm:gap-2 max-w-[calc(100vw-2rem)] overflow-x-auto animate-in fade-in-50 slide-in-from-bottom-4 duration-200'>
          <div className='flex items-center gap-1.5 pe-2.5 border-r border-border shrink-0'>
            <Badge className='text-xs font-mono font-bold bg-primary text-primary-foreground h-6 px-2 rounded-full'>
              {selectedCount}
            </Badge>
            <span className='font-semibold text-xs text-foreground whitespace-nowrap hidden sm:inline'>
              Dipilih
            </span>
          </div>

          <div className='flex items-center gap-1.5 shrink-0'>
            <Button
              size='sm'
              variant='outline'
              onClick={handleOpenPrintReports}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10 rounded-full whitespace-nowrap'
              title='Cetak Lembar Laporan Rekapitulasi & Roster Anggota Kategorial A4'
            >
              <Printer className='size-3.5' />
              <span>Cetak Laporan Rekap</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleBulkSyncCounts}
              disabled={isSyncingCounts}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Sinkronkan & hitung ulang jumlah jemaat aktif riil untuk kategorial terpilih'
            >
              {isSyncingCounts ? <Loader2 className='size-3.5 animate-spin' /> : <RefreshCw className='size-3.5' />}
              <span>{isSyncingCounts ? 'Menyinkronkan...' : 'Sinkronkan Anggota'}</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleExportCsv}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ekspor data kategorial terpilih ke CSV / Excel'
            >
              <Download className='size-3.5' />
              <span>Export CSV</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setBulkDeleteReason('')
                setBulkDeleteModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium text-rose-600 border-rose-500/30 hover:bg-rose-500/10 rounded-full whitespace-nowrap'
              title='Hapus kategorial terpilih (soft delete, kategorial default dilindungi)'
            >
              <Trash2 className='size-3.5' />
              <span>Hapus</span>
            </Button>

            <div className='h-4 w-px bg-border shrink-0 my-auto' />

            <Button
              size='icon'
              variant='ghost'
              onClick={() => setSelectedRows({})}
              className='size-7 rounded-full text-muted-foreground hover:text-foreground shrink-0'
              title='Batalkan pilihan'
            >
              <X className='size-3.5' />
            </Button>
          </div>
        </div>
      )}

      {/* ── MODAL 1: CETAK LAPORAN REKAPITULASI KATEGORIAL (A4) ─── */}
      <Dialog open={printReportsModalOpen} onOpenChange={setPrintReportsModalOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
          <DialogHeader className='p-4 sm:p-5 pb-3 sm:pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0'>
            <div className='min-w-0 flex-1 pe-6 sm:pe-0'>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2 leading-tight'>
                <Printer className='size-5 text-primary shrink-0' />
                <span>Laporan Rekapitulasi Kategorial ({printReportsData.length} Departemen)</span>
              </DialogTitle>
              <DialogDescription className='text-xs mt-0.5'>
                Pratinjau laporan statistik demografi dan daftar anggota jemaat siap cetak A4.
              </DialogDescription>
            </div>
            <Button
              size='sm'
              onClick={handleOpenPrintReports}
              className='w-full sm:w-auto gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm shrink-0'
            >
              <Printer className='size-4' /> Cetak Laporan (Print / PDF)
            </Button>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-3 sm:p-6 bg-muted/20 space-y-6'>
            {isLoadingPrintReports ? (
              <div className='py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs'>
                <Loader2 className='size-6 animate-spin text-primary' />
                <span>Menyiapkan susunan data laporan kategorial...</span>
              </div>
            ) : printReportsData.length === 0 ? (
              <div className='py-12 text-center text-xs text-muted-foreground'>
                Tidak ada data kategorial yang dapat ditampilkan.
              </div>
            ) : (
              printReportsData.map((kat) => {
                const members = kat.anggotaKategorial || []
                const total = members.length
                const totalL = members.filter((m: any) => m.jemaat?.jenisKelamin === 'LAK_LAKI').length
                const totalP = members.filter((m: any) => m.jemaat?.jenisKelamin === 'PEREMPUAN').length
                const totalBaptis = members.filter((m: any) => m.jemaat?.statusBaptis === 'SUDAH_BAPTIS').length

                return (
                  <div
                    key={kat.id}
                    className='bg-card border-2 border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 max-w-3xl mx-auto'
                  >
                    {/* Header */}
                    <div className='flex items-center justify-between border-b pb-3'>
                      <div className='flex items-center gap-3'>
                        <div className='size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-lg shadow-xs'>
                          G
                        </div>
                        <div>
                          <div className='text-sm sm:text-base font-black tracking-tight uppercase text-foreground'>
                            {kat.nama}
                          </div>
                          <div className='text-[10px] font-mono text-muted-foreground uppercase tracking-wider'>
                            {kat.isDefault ? 'KATEGORIAL UTAMA (DEFAULT)' : 'KATEGORIAL PELAYANAN'}
                          </div>
                        </div>
                      </div>
                      <Badge variant={kat.isDefault ? 'default' : 'secondary'} className='text-xs font-semibold'>
                        {total} Anggota
                      </Badge>
                    </div>

                    {/* Stats summary grid */}
                    <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-muted/30 p-3 rounded-xl border text-center'>
                      <div className='p-2 bg-card rounded-lg border'>
                        <div className='text-[10px] text-muted-foreground font-medium'>Total Terdaftar</div>
                        <div className='text-sm font-bold text-foreground mt-0.5'>{total} Jemaat</div>
                      </div>
                      <div className='p-2 bg-card rounded-lg border'>
                        <div className='text-[10px] text-muted-foreground font-medium'>Pria (L)</div>
                        <div className='text-sm font-bold text-foreground mt-0.5'>{totalL} Orang</div>
                      </div>
                      <div className='p-2 bg-card rounded-lg border'>
                        <div className='text-[10px] text-muted-foreground font-medium'>Wanita (P)</div>
                        <div className='text-sm font-bold text-foreground mt-0.5'>{totalP} Orang</div>
                      </div>
                      <div className='p-2 bg-card rounded-lg border'>
                        <div className='text-[10px] text-muted-foreground font-medium'>Sudah Baptis</div>
                        <div className='text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5'>{totalBaptis} Jemaat</div>
                      </div>
                    </div>

                    {/* Member Roster List Preview */}
                    <div className='border rounded-xl overflow-hidden'>
                      <table className='w-full text-xs text-left'>
                        <thead className='bg-muted/60 text-muted-foreground font-semibold border-b'>
                          <tr>
                            <th className='p-2 text-center w-8'>No</th>
                            <th className='p-2'>Nama Anggota</th>
                            <th className='p-2'>NIJ</th>
                            <th className='p-2 text-center'>L/P</th>
                            <th className='p-2'>Komsel</th>
                            <th className='p-2 text-center'>Status</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y'>
                          {members.length > 0 ? (
                            members.slice(0, 8).map((m: any, idx: number) => {
                              const j = m.jemaat || {}
                              return (
                                <tr key={m.id} className='hover:bg-muted/20'>
                                  <td className='p-2 text-center text-muted-foreground'>{idx + 1}</td>
                                  <td className='p-2 font-bold text-foreground'>
                                    {j.nama}
                                    {j.namaPanggilan && <span className='text-muted-foreground font-normal'> ({j.namaPanggilan})</span>}
                                  </td>
                                  <td className='p-2 font-mono text-primary font-semibold'>{j.nij || '-'}</td>
                                  <td className='p-2 text-center'>{j.jenisKelamin === 'LAK_LAKI' ? 'L' : 'P'}</td>
                                  <td className='p-2 text-muted-foreground'>{j.komsel?.nama || '-'}</td>
                                  <td className='p-2 text-center'>
                                    <Badge variant='outline' className='text-[10px] font-mono'>
                                      {j.statusJemaat || 'ACTIVE'}
                                    </Badge>
                                  </td>
                                </tr>
                              )
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className='p-4 text-center text-muted-foreground text-xs'>
                                Belum ada data anggota terdaftar di kategorial ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {members.length > 8 && (
                        <div className='p-2 text-center text-[11px] text-muted-foreground bg-muted/20 border-t'>
                          + {members.length - 8} anggota lainnya (akan tercetak lengkap pada lembar dokumen cetak A4).
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className='p-3 sm:p-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0'>
            <span className='text-xs text-muted-foreground text-center sm:text-left'>
              Hasil cetak A4 akan memuat ringkasan demografi, seluruh tabel roster jemaat, dan tanda tangan resmi.
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPrintReportsModalOpen(false)}
              className='w-full sm:w-auto'
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: HAPUS MASSAL KATEGORIAL (SOFT DELETE) ──────── */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Pindahkan {selectedCount} Kategorial ke Kotak Sampah?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Kategorial kustom terpilih akan diarsipkan ke kotak sampah (*soft delete*).
                </div>
                <div className='p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium'>
                  🛡️ <strong>Catatan Keamanan</strong>: Kategorial bawaan sistem (*Default*) dilindungi secara otomatis dan tidak akan dihapus.
                </div>
                <div className='space-y-1 pt-1'>
                  <label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan Massal (Wajib):</label>
                  <Textarea
                    placeholder='Contoh: Penyesuaian struktur departemen pelayanan tahun 2026'
                    value={bulkDeleteReason}
                    onChange={(e) => setBulkDeleteReason(e.target.value)}
                    className='text-xs min-h-12.5'
                    required
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setBulkDeleteModalOpen(false)} disabled={isBulkDeleting}>
              Batal
            </Button>
            <Button
              variant='destructive'
              className='gap-2 bg-rose-600 hover:bg-rose-700 text-white'
              onClick={handleBulkDeleteSubmit}
              disabled={isBulkDeleting || !bulkDeleteReason.trim()}
            >
              {isBulkDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
              Konfirmasi Hapus ({selectedCount})
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
