'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FilterX,
  FileCheck,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
  Edit,
  User,
  Calendar,
  FileCode,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  RotateCcw,
  ShieldAlert,
  Printer,
  Tag,
  Check,
  CheckCircle2,
  Layers,
  X,
  FileSpreadsheet,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { Textarea } from '@/components/ui/textarea'
import {
  getDokumenJemaatListAction,
  updateDokumenJemaatAction,
  deleteDokumenJemaatAction,
  restoreDokumenJemaatAction,
  hardDeleteDokumenJemaatAction,
  bulkUpdateStatusDokumenAction,
  bulkUpdateJenisDokumenAction,
  bulkSoftDeleteDokumenAction,
  getDokumenForPrintSheetsAction,
  DokumenJemaatDTO,
} from '@/actions/dokumen'
import { JenisDokumen, StatusDokumen } from '@/lib/validations/dokumen'
import { toast } from 'sonner'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'

export default function DokumenJemaatPage() {
  const [loading, setLoading] = useState(true)
  const [dokumenList, setDokumenList] = useState<DokumenJemaatDTO[]>([])
  const [totalCount, setTotalCount] = useState(0)

  const [stats, setStats] = useState({
    totalDokumen: 0,
    totalVerified: 0,
    totalDraft: 0,
    totalExpired: 0,
  })

  const [churchName, setChurchName] = useState('Gereja')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [filterJenis, setFilterJenis] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Pagination
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  // Column Visibility States
  const [visibleColumns, setVisibleColumns] = useState({
    jemaat: true,
    dokumen: true,
    status: true,
    tanggalTerbit: true,
  })

  // Edit Metadata Modal State
  const [editTarget, setEditTarget] = useState<DokumenJemaatDTO | null>(null)
  const [editJudul, setEditJudul] = useState('')
  const [editJenis, setEditJenis] = useState<JenisDokumen>('BAPTIS')
  const [editStatus, setEditStatus] = useState<StatusDokumen>('DRAFT')
  const [editDeskripsi, setEditDeskripsi] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Bulk Actions States
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false)
  const [selectedBulkStatus, setSelectedBulkStatus] = useState<StatusDokumen>('VERIFIED')
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false)

  const [bulkJenisModalOpen, setBulkJenisModalOpen] = useState(false)
  const [selectedBulkJenis, setSelectedBulkJenis] = useState<JenisDokumen>('BAPTIS')
  const [isBulkUpdatingJenis, setIsBulkUpdatingJenis] = useState(false)

  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState('')
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const [printTranscriptModalOpen, setPrintTranscriptModalOpen] = useState(false)
  const [printTranscriptData, setPrintTranscriptData] = useState<DokumenJemaatDTO[]>([])
  const [isLoadingPrintTranscript, setIsLoadingPrintTranscript] = useState(false)

  // Soft Delete & Restore & Hard Delete States
  const [deleteTarget, setDeleteTarget] = useState<DokumenJemaatDTO | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreTarget, setRestoreTarget] = useState<DokumenJemaatDTO | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [hardDeleteTarget, setHardDeleteTarget] = useState<DokumenJemaatDTO | null>(null)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [isHardDeleting, setIsHardDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getDokumenJemaatListAction({
      search: searchTerm,
      statusHapus: statusHapusFilter,
      jenisDokumen: filterJenis !== 'all' ? (filterJenis as JenisDokumen) : undefined,
      status: filterStatus !== 'all' ? (filterStatus as StatusDokumen) : undefined,
      page: pageIndex + 1,
      pageSize,
    })

    if (res.success && res.data) {
      setDokumenList(res.data.items)
      setTotalCount(res.data.total)
      if (res.data.stats) {
        setStats(res.data.stats)
      }
    } else {
      toast.error(res.error || 'Gagal memuat repositori dokumen jemaat.')
    }
    setLoading(false)
  }, [searchTerm, statusHapusFilter, filterJenis, filterStatus, pageIndex, pageSize])

  useEffect(() => {
    fetchData()
    getEffectivePrintConfig().then((pc) => {
      if (pc?.kop?.namaGereja) {
        setChurchName(pc.kop.namaGereja)
      }
    })
  }, [fetchData])

  // Sorting state
  const [sortField, setSortField] = useState<'jemaat' | 'judul' | 'jenis' | 'tanggalTerbit' | 'status' | null>('tanggalTerbit')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const sortedDokumenList = React.useMemo(() => {
    if (!sortField) return dokumenList
    return [...dokumenList].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''
      if (sortField === 'jemaat') {
        aVal = a.jemaatNama || ''
        bVal = b.jemaatNama || ''
      } else if (sortField === 'judul') {
        aVal = a.judul || ''
        bVal = b.judul || ''
      } else if (sortField === 'jenis') {
        aVal = a.jenisDokumen || ''
        bVal = b.jenisDokumen || ''
      } else if (sortField === 'status') {
        aVal = a.status || ''
        bVal = b.status || ''
      } else if (sortField === 'tanggalTerbit') {
        aVal = new Date(a.tanggalTerbit || a.createdAt || 0).getTime()
        bVal = new Date(b.tanggalTerbit || b.createdAt || 0).getTime()
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [dokumenList, sortField, sortOrder])

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id])
  const selectedCount = selectedIds.length
  const isAllPaginatedSelected = sortedDokumenList.length > 0 && sortedDokumenList.every((d) => selectedRows[d.id])
  const isAllSelected = isAllPaginatedSelected

  const selectedDokumenData = sortedDokumenList.filter((item) => selectedRows[item.id])

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    sortedDokumenList.forEach((item) => {
      updated[item.id] = checked
    })
    setSelectedRows(updated)
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows((prev) => ({ ...prev, [id]: checked }))
  }

  // 1. Export CSV Handler
  const handleExportCsv = () => {
    const targets = selectedCount > 0 ? selectedDokumenData : dokumenList

    if (targets.length === 0) {
      toast.error('Tidak ada data dokumen untuk diekspor.')
      return
    }

    const headers = [
      'Nama Jemaat',
      'NIJ',
      'Judul Dokumen',
      'Jenis Dokumen',
      'Status Verifikasi',
      'Tanggal Terbit',
      'Tanggal Kadaluarsa',
      'Ukuran Berkas (Bytes)',
      'Status Data',
      'Tanggal Upload',
    ]

    const rows = targets.map((item) => {
      const d = new Date(item.tanggalTerbit)
      const exp = item.tanggalKadaluarsa ? new Date(item.tanggalKadaluarsa) : null
      return [
        `"${(item.jemaatNama || '').replace(/"/g, '""')}"`,
        `"${item.jemaatNij || '-'}"`,
        `"${(item.judul || '').replace(/"/g, '""')}"`,
        `"${item.jenisDokumen || '-'}"`,
        `"${item.status || 'DRAFT'}"`,
        `"${!isNaN(d.getTime()) ? d.toLocaleDateString('id-ID') : '-'}"`,
        `"${exp && !isNaN(exp.getTime()) ? exp.toLocaleDateString('id-ID') : '-'}"`,
        `"${item.fileSize || 0}"`,
        `"${item.deletedAt ? 'TERHAPUS (SOFT)' : 'AKTIF'}"`,
        `"${item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}"`,
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Dokumen_Jemaat_${churchName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${targets.length} data dokumen ke CSV.`)
  }

  // 2. Direct Print Document Transcript Sheet (Without Preview Modal)
  const handleOpenPrintTranscript = async () => {
    const idsToPrint =
      selectedIds.length > 0
        ? selectedIds
        : dokumenList.map((d) => d.id)

    if (idsToPrint.length === 0) {
      toast.error('Tidak ada data dokumen yang dapat dicetak.')
      return
    }
    const toastId = toast.loading('Menyiapkan berkas cetak transkrip...')
    setIsLoadingPrintTranscript(true)
    const res = await getDokumenForPrintSheetsAction(idsToPrint)
    setIsLoadingPrintTranscript(false)
    toast.dismiss(toastId)

    if (!res.success || !res.data || res.data.length === 0) {
      toast.error(res.error || 'Gagal memuat data lembar dokumen.')
      return
    }

    const printTranscriptData = res.data
    const printConfig = await getEffectivePrintConfig()

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const totalVerified = printTranscriptData.filter((d) => d.status === 'VERIFIED').length
    const totalBytes = printTranscriptData.reduce((acc, curr) => acc + (curr.fileSize || 0), 0)
    const totalSizeKb = (totalBytes / 1024).toFixed(1)

    const rowsHtml = printTranscriptData.map((doc, idx) => {
      const d = new Date(doc.tanggalTerbit)
      const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID') : '-'
      const sizeKb = (doc.fileSize / 1024).toFixed(1) + ' KB'

      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700; color: #0f172a;">${doc.jemaatNama}</td>
          <td style="font-family: monospace; text-align: center;">${doc.jemaatNij}</td>
          <td style="font-weight: 600;">${doc.judul}</td>
          <td style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${(doc.jenisDokumen || '').replace(/_/g, ' ')}</td>
          <td style="text-align: center;">${dateStr}</td>
          <td style="text-align: center; font-family: monospace; font-size: 9.5px;">${sizeKb}</td>
          <td style="text-align: center; font-size: 9px; font-weight: 700;">
            <span style="border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; background: ${doc.status === 'VERIFIED' ? '#f0fdf4' : '#f8fafc'}; color: ${doc.status === 'VERIFIED' ? '#166534' : '#475569'};">
              ${doc.status}
            </span>
          </td>
        </tr>
      `
    }).join('')

    const kopHtml = buildKopHtml(printConfig, {
      badgeText: 'DIVISI ARSIP & TATA USAHA',
      dateText: `Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
    })

    const signaturesHtml = buildSignaturesHtml(printConfig, [
      { roleKey: 'sekretaris', customTitle: 'Arsiparis / Tata Usaha' },
      { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
    ])

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Berita Acara & Transkrip Dokumen Jemaat (${printTranscriptData.length} Berkas) - ${printConfig.kop.namaGereja}</title>
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
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 14px;
          }
          .stat-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            text-align: center;
          }
          .stat-lbl {
            font-size: 9px;
            color: #64748b;
            font-weight: 600;
          }
          .stat-val {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          .docs-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 20px;
          }
          .docs-table th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            font-weight: 800;
            text-align: left;
          }
          .docs-table td {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        ${kopHtml}

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-lbl">Total Berkas Terdaftar</div>
            <div class="stat-val">${printTranscriptData.length} Dokumen</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Telah Terverifikasi Resmi</div>
            <div class="stat-val" style="color: #16a34a;">${totalVerified} Dokumen</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Total Ukuran Arsip Digital</div>
            <div class="stat-val">${totalSizeKb} KB</div>
          </div>
        </div>

        <table class="docs-table">
          <thead>
            <tr>
              <th style="width: 25px;">No</th>
              <th>Nama Jemaat</th>
              <th style="width: 80px; text-align: center;">NIJ</th>
              <th>Judul Dokumen</th>
              <th style="width: 95px;">Jenis</th>
              <th style="width: 75px; text-align: center;">Tgl Terbit</th>
              <th style="width: 65px; text-align: center;">Ukuran</th>
              <th style="width: 70px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        ${signaturesHtml}

        ${printConfig.options.tampilkanWatermarkAudit ? `
          <div style="font-size: 8px; color: #94a3b8; margin-top: 10px; text-align: center; font-family: monospace; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
            ${printConfig.options.catatanKakiResmi} • Verifikasi Dokumen SHA-256 Otentik ${printConfig.kop?.namaGereja || 'Gereja'}.
          </div>
        ` : ''}

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

  // 3. Bulk Update Status Submit
  const handleBulkStatusSubmit = async () => {
    if (selectedIds.length === 0) return
    setIsBulkUpdatingStatus(true)
    const res = await bulkUpdateStatusDokumenAction({
      ids: selectedIds,
      status: selectedBulkStatus,
    })
    setIsBulkUpdatingStatus(false)
    if (res.success) {
      toast.success(res.message)
      setBulkStatusModalOpen(false)
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui status dokumen.')
    }
  }

  // 4. Bulk Update Jenis Submit
  const handleBulkJenisSubmit = async () => {
    if (selectedIds.length === 0) return
    setIsBulkUpdatingJenis(true)
    const res = await bulkUpdateJenisDokumenAction({
      ids: selectedIds,
      jenisDokumen: selectedBulkJenis,
    })
    setIsBulkUpdatingJenis(false)
    if (res.success) {
      toast.success(res.message)
      setBulkJenisModalOpen(false)
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui jenis dokumen.')
    }
  }

  // 5. Bulk Delete Submit
  const handleBulkDeleteSubmit = async () => {
    if (selectedIds.length === 0) return
    if (!bulkDeleteReason.trim()) {
      toast.error('Alasan penghapusan massal wajib diisi.')
      return
    }
    setIsBulkDeleting(true)
    const res = await bulkSoftDeleteDokumenAction({
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
      toast.error(res.error || 'Gagal menghapus data dokumen.')
    }
  }

  const handleOpenEdit = (doc: DokumenJemaatDTO) => {
    setEditTarget(doc)
    setEditJudul(doc.judul)
    setEditJenis(doc.jenisDokumen)
    setEditStatus(doc.status)
    setEditDeskripsi(doc.deskripsi || '')
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return

    setIsUpdating(true)
    const res = await updateDokumenJemaatAction({
      id: editTarget.id,
      judul: editJudul.trim(),
      jenisDokumen: editJenis,
      status: editStatus,
      deskripsi: editDeskripsi.trim() || null,
    })
    setIsUpdating(false)

    if (res.success) {
      toast.success(res.message || 'Dokumen berhasil diperbarui!')
      setEditTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui dokumen.')
    }
  }

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return
    if (!deleteReason.trim()) {
      toast.error('Alasan penghapusan dokumen wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deleteDokumenJemaatAction({
      id: deleteTarget.id,
      reason: deleteReason.trim(),
    })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Dokumen berhasil di-soft delete.')
      setDeleteTarget(null)
      setDeleteReason('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus dokumen.')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    const res = await restoreDokumenJemaatAction({ id: restoreTarget.id })
    setIsRestoring(false)

    if (res.success) {
      toast.success(res.message || 'Dokumen berhasil dipulihkan!')
      setRestoreTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memulihkan dokumen.')
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return
    setIsHardDeleting(true)
    const res = await hardDeleteDokumenJemaatAction({
      id: hardDeleteTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Dokumen berhasil dihapus permanen dari database!')
      setHardDeleteTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen dokumen.')
    }
  }

  const renderJenisBadge = (jenis: JenisDokumen) => {
    switch (jenis) {
      case 'BAPTIS':
        return <Badge className='bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px]'>Surat Baptis</Badge>
      case 'NIKAH':
        return <Badge className='bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px]'>Surat Nikah</Badge>
      case 'PENYERAHAN_ANAK':
        return <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]'>Penyerahan Anak</Badge>
      case 'SAKSI':
        return <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]'>Surat Saksi</Badge>
      default:
        return <Badge variant='outline' className='text-[10px]'>{jenis}</Badge>
    }
  }

  const renderStatusBadge = (status: StatusDokumen) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-mono'>
            <ShieldCheck className='size-3' /> VERIFIED
          </Badge>
        )
      case 'DRAFT':
        return (
          <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] gap-1 font-mono'>
            <Clock className='size-3' /> DRAFT
          </Badge>
        )
      case 'EXPIRED':
        return (
          <Badge className='bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] gap-1 font-mono'>
            <AlertTriangle className='size-3' /> EXPIRED
          </Badge>
        )
      default:
        return <Badge variant='outline'>{status}</Badge>
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(2)} MB`
  }
  const renderColumnHeader = (
    title: string,
    columnKey: keyof typeof visibleColumns,
    field?: 'jemaat' | 'judul' | 'jenis' | 'tanggalTerbit' | 'status'
  ) => {
    const isSorted = field && sortField === field

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='sm' className='-ms-3 h-8 data-[state=open]:bg-accent font-semibold text-xs text-foreground flex items-center gap-1.5'>
            <span>{title}</span>
            {isSorted ? (
              sortOrder === 'asc' ? <ArrowUp className='size-3.5' /> : <ArrowDown className='size-3.5' />
            ) : (
              <ArrowUpDown className='size-3.5 opacity-50' />
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
          <DropdownMenuItem onClick={() => setVisibleColumns((p) => ({ ...p, [columnKey]: false }))} className='text-xs gap-2'>
            <EyeOff className='size-3.5 text-muted-foreground' /> Sembunyikan Kolom
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Header matching shadcn-admin */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
            Arsip Dokumen Jemaat
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Kelola repositori digital akta baptis, surat nikah, sertifikat dedikasi, dan dokumen resmi jemaat.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2 w-full sm:w-auto'>
          <Button size='sm' asChild className='w-full sm:w-auto h-9 sm:h-8 gap-1.5 text-xs shadow-xs font-semibold'>
            <Link href='/dashboard/dokumen-jemaat/baru'>
              <Plus className='size-3.5' /> Unggah Dokumen
            </Link>
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={handleOpenPrintTranscript}
            className='w-full sm:w-auto h-9 sm:h-8 gap-1.5 text-xs font-medium'
            title='Cetak Buku Register / Transkrip Arsip Dokumen A4'
          >
            <Printer className='size-3.5' /> Cetak Transkrip Arsip
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className='grid gap-4 sm:grid-cols-4'>
        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TOTAL ARSIP DOKUMEN</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3'>
            <div className='text-2xl font-bold font-mono text-primary flex items-center gap-2'>
              <FileText className='size-5' /> {stats.totalDokumen} Berkas
            </div>
            <div className='text-muted-foreground text-[11px] mt-0.5'>Seluruh repositori jemaat</div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase'>TERVERIFIKASI (VERIFIED)</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3'>
            <div className='text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <ShieldCheck className='size-5' /> {stats.totalVerified} Dokumen
            </div>
            <div className='text-muted-foreground text-[11px] mt-0.5'>Telah diaudit & disahkan gereja</div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-amber-600 dark:text-amber-400 uppercase'>MENUNGGU VERIFIKASI (DRAFT)</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3'>
            <div className='text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 flex items-center gap-2'>
              <Clock className='size-5' /> {stats.totalDraft} Dokumen
            </div>
            <div className='text-muted-foreground text-[11px] mt-0.5'>Perlu pemeriksaan staf sekretariat</div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-rose-600 dark:text-rose-400 uppercase'>KADALUARSA (EXPIRED)</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3'>
            <div className='text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 flex items-center gap-2'>
              <AlertTriangle className='size-5' /> {stats.totalExpired} Dokumen
            </div>
            <div className='text-muted-foreground text-[11px] mt-0.5'>Melewati masa berlaku</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar Filter Section */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <Input
            placeholder='Cari judul, jemaat, NIJ...'
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPageIndex(0)
            }}
            className='h-8 text-xs w-full sm:w-55'
          />

          <div className='grid grid-cols-2 sm:flex sm:flex-row items-center gap-2'>
            {/* Filter Status Hapus */}
            <Select
              value={statusHapusFilter}
              onValueChange={(val: 'ACTIVE' | 'DELETED' | 'ALL') => {
                setStatusHapusFilter(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 text-xs font-medium w-full sm:w-32'>
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

            {/* Filter Jenis Dokumen */}
            <Select
              value={filterJenis}
              onValueChange={(val) => {
                setFilterJenis(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 text-xs w-full sm:w-36'>
                <SelectValue placeholder='Jenis Dokumen' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs'>Semua Jenis</SelectItem>
                <SelectItem value='BAPTIS' className='text-xs'>Surat Baptis</SelectItem>
                <SelectItem value='NIKAH' className='text-xs'>Akta Nikah</SelectItem>
                <SelectItem value='PENYERAHAN_ANAK' className='text-xs'>Penyerahan Anak</SelectItem>
                <SelectItem value='KEANGGOTAAN' className='text-xs'>Surat Keanggotaan</SelectItem>
                <SelectItem value='PINDAH' className='text-xs'>Surat Atestasi Pindah</SelectItem>
                <SelectItem value='KTP' className='text-xs'>KTP / Identitas</SelectItem>
                <SelectItem value='KK' className='text-xs'>Kartu Keluarga (KK)</SelectItem>
                <SelectItem value='LAINNYA' className='text-xs'>Lainnya</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(val) => {
                setFilterStatus(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 text-xs w-full sm:w-32'>
                <SelectValue placeholder='Status Dokumen' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs'>Semua Status</SelectItem>
                <SelectItem value='VERIFIED' className='text-xs'>VERIFIED</SelectItem>
                <SelectItem value='DRAFT' className='text-xs'>DRAFT</SelectItem>
                <SelectItem value='EXPIRED' className='text-xs'>EXPIRED</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || statusHapusFilter !== 'ACTIVE' || filterJenis !== 'all' || filterStatus !== 'all') && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSearchTerm('')
                  setStatusHapusFilter('ACTIVE')
                  setFilterJenis('all')
                  setFilterStatus('all')
                  setPageIndex(0)
                }}
                className='h-8 px-2 text-xs gap-1 text-muted-foreground shrink-0'
              >
                Reset <FilterX className='size-3' />
              </Button>
            )}
          </div>
        </div>

        {/* Column Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='h-8 w-full sm:w-auto gap-1.5 text-xs'>
              <SlidersHorizontal className='size-3.5' /> Kolom
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuLabel className='text-xs'>Tampilan Kolom</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={visibleColumns.jemaat}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, jemaat: !!c }))}
            >
              Jemaat &amp; NIJ
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.dokumen}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, dokumen: !!c }))}
            >
              Dokumen &amp; Jenis
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.status}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, status: !!c }))}
            >
              Status &amp; Ukuran
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.tanggalTerbit}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, tanggalTerbit: !!c }))}
            >
              Tanggal Terbit
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main DataTable */}
      <div className='rounded-md border overflow-hidden bg-card'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/40'>
                <TableHead className='w-10 px-3'>
                  <Checkbox checked={isAllSelected} onCheckedChange={(c) => handleSelectAll(!!c)} />
                </TableHead>
                {visibleColumns.jemaat && (
                  <TableHead className='min-w-44'>
                    {renderColumnHeader('Jemaat Pemilik', 'jemaat', 'jemaat')}
                  </TableHead>
                )}
                {visibleColumns.dokumen && (
                  <TableHead className='min-w-60'>
                    {renderColumnHeader('Dokumen & Jenis', 'dokumen', 'judul')}
                  </TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className='w-32'>
                    {renderColumnHeader('Status & Ukuran', 'status', 'status')}
                  </TableHead>
                )}
                {visibleColumns.tanggalTerbit && (
                  <TableHead className='w-28'>
                    {renderColumnHeader('Tanggal Terbit', 'tanggalTerbit', 'tanggalTerbit')}
                  </TableHead>
                )}
                <TableHead className='w-16 px-3 text-end font-bold'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-32 text-center text-muted-foreground text-sm'>
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='size-4 animate-spin text-primary' /> Memuat repositori dokumen jemaat...
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedDokumenList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-32 text-center text-muted-foreground text-sm'>
                    <div className='space-y-2'>
                      <div>Belum ada dokumen jemaat yang sesuai dengan filter.</div>
                      <Button asChild size='sm'>
                        <Link href='/dashboard/dokumen-jemaat/baru'>
                          <Plus className='size-4 me-1' /> Unggah Dokumen
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedDokumenList.map((doc) => {
                  const isSelected = !!selectedRows[doc.id]
                  const isDeleted = !!doc.deletedAt
                  const docDate = new Date(doc.tanggalTerbit)
                  return (
                    <TableRow
                      key={doc.id}
                      className={`transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'} ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className='px-3 py-2.5'>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => setSelectedRows((p) => ({ ...p, [doc.id]: !!c }))}
                        />
                      </TableCell>

                      {/* Jemaat Pemilik */}
                      {visibleColumns.jemaat && (
                        <TableCell className='px-3 py-2.5'>
                          <Link href={`/dashboard/jemaat/${doc.jemaatId}`} className='font-bold text-xs text-foreground hover:underline hover:text-primary block leading-snug'>
                            {doc.jemaatNama}
                          </Link>
                          <span className='text-muted-foreground text-[10.5px] font-mono'>
                            NIJ: {doc.jemaatNij}
                          </span>
                        </TableCell>
                      )}

                      {/* Dokumen & Jenis */}
                      {visibleColumns.dokumen && (
                        <TableCell className='px-3 py-2.5 max-w-md'>
                          <div className='flex items-center gap-1.5 mb-1'>
                            {renderJenisBadge(doc.jenisDokumen)}
                            {isDeleted && (
                              <Badge variant='destructive' className='text-[9.5px] gap-0.5 font-mono py-0 px-1'>
                                Terhapus
                              </Badge>
                            )}
                          </div>
                          <Link href={`/dashboard/dokumen-jemaat/${doc.id}`} className='font-bold text-xs text-foreground hover:underline hover:text-primary block leading-snug'>
                            {doc.judul}
                          </Link>
                          {doc.deskripsi && (
                            <span className='text-muted-foreground text-[11px] truncate block max-w-xs pt-0.5'>
                              {doc.deskripsi}
                            </span>
                          )}
                        </TableCell>
                      )}

                      {/* Status & Ukuran */}
                      {visibleColumns.status && (
                        <TableCell className='px-3 py-2.5'>
                          <div className='space-y-1'>
                            <div>{renderStatusBadge(doc.status)}</div>
                            <div className='text-[10.5px] font-mono text-muted-foreground'>
                              {formatFileSize(doc.fileSize)}
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {/* Tanggal Terbit */}
                      {visibleColumns.tanggalTerbit && (
                        <TableCell className='px-3 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap'>
                          {docDate.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                      )}

                      {/* Aksi Dropdown */}
                      <TableCell className='px-3 py-2.5 text-end'>
                        <div className='flex items-center justify-end'>
                          {isDeleted ? (
                            <div className='flex items-center gap-1'>
                              <Button
                                size='sm'
                                variant='outline'
                                className='h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1'
                                onClick={() => setRestoreTarget(doc)}
                              >
                                <RotateCcw className='size-3.5' /> Pulihkan
                              </Button>
                              <Button
                                size='sm'
                                variant='ghost'
                                className='h-7 px-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 gap-1'
                                onClick={() => setHardDeleteTarget(doc)}
                              >
                                <Trash2 className='size-3.5' /> Hapus
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon' className='size-7'>
                                  <MoreHorizontal className='size-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end' className='w-44 text-xs'>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/dokumen-jemaat/${doc.id}`} className='gap-2'>
                                    <Eye className='size-3.5' /> Detail &amp; Viewer
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenEdit(doc)} className='gap-2'>
                                  <Edit className='size-3.5' /> Edit Metadata
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className='text-destructive gap-2'
                                  onClick={() => {
                                    setDeleteTarget(doc)
                                    setDeleteReason('')
                                  }}
                                >
                                  <Trash2 className='size-3.5' /> Hapus Dokumen
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border-t text-xs text-muted-foreground bg-card'>
          <div className='text-center sm:text-left shrink-0'>
            <span className='font-medium text-foreground'>{selectedCount}</span> dari {totalCount} baris dipilih.
          </div>
          <div className='flex items-center justify-between sm:justify-end gap-4'>
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Per halaman</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val))
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className='h-7 w-14 text-xs'><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='5'>5</SelectItem>
                  <SelectItem value='10'>10</SelectItem>
                  <SelectItem value='20'>20</SelectItem>
                  <SelectItem value='50'>50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='flex items-center gap-2'>
              <span className='whitespace-nowrap'>Hal. {pageIndex + 1} / {totalPages}</span>
              <div className='flex items-center gap-0.5'>
                <Button variant='outline' size='icon' className='size-7' disabled={pageIndex === 0} onClick={() => setPageIndex(0)}>
                  <ChevronsLeft className='size-3.5' />
                </Button>
                <Button variant='outline' size='icon' className='size-7' disabled={pageIndex === 0} onClick={() => setPageIndex((p) => Math.max(0, p - 1))}>
                  <ChevronLeft className='size-3.5' />
                </Button>
                <Button variant='outline' size='icon' className='size-7' disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}>
                  <ChevronRight className='size-3.5' />
                </Button>
                <Button variant='outline' size='icon' className='size-7' disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(totalPages - 1)}>
                  <ChevronsRight className='size-3.5' />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialog Edit Metadata Dokumen ──────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Edit Metadata Dokumen</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Perbarui judul, jenis, status verifikasi berkas <strong className='text-foreground'>{editTarget?.judul}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Judul Dokumen *</Label>
                <Input
                  value={editJudul}
                  onChange={(e) => setEditJudul(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Jenis Dokumen *</Label>
                  <Select value={editJenis} onValueChange={(val) => setEditJenis(val as JenisDokumen)}>
                    <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='BAPTIS' className='text-xs'>Surat Baptis</SelectItem>
                      <SelectItem value='NIKAH' className='text-xs'>Surat Nikah</SelectItem>
                      <SelectItem value='PENYERAHAN_ANAK' className='text-xs'>Penyerahan Anak</SelectItem>
                      <SelectItem value='SAKSI' className='text-xs'>Surat Saksi</SelectItem>
                      <SelectItem value='LAINNYA' className='text-xs'>Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs'>Status Verifikasi *</Label>
                  <Select value={editStatus} onValueChange={(val) => setEditStatus(val as StatusDokumen)}>
                    <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='DRAFT' className='text-xs'>DRAFT</SelectItem>
                      <SelectItem value='VERIFIED' className='text-xs'>VERIFIED (Sah)</SelectItem>
                      <SelectItem value='EXPIRED' className='text-xs'>EXPIRED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Deskripsi / Catatan Tambahan</Label>
                <Textarea
                  value={editDeskripsi}
                  onChange={(e) => setEditDeskripsi(e.target.value)}
                  className='text-xs'
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => setEditTarget(null)} disabled={isUpdating}>
                Batal
              </Button>
              <Button type='submit' disabled={isUpdating} className='gap-2'>
                {isUpdating ? <Loader2 className='size-4 animate-spin' /> : <Edit className='size-4' />}
                {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog Konfirmasi Soft Delete Dokumen ────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeleteReason('') }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Hapus Dokumen Vault Jemaat?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Dokumen <strong className='text-foreground'>{deleteTarget?.judul}</strong> milik <strong className='text-foreground'>{deleteTarget?.jemaatNama}</strong> akan dinonaktifkan via Soft Delete.
                </span>
                <span className='block text-xs text-muted-foreground'>
                  Berkas fisik tetap tersimpan dan dokumen dapat dipulihkan kembali sewaktu-waktu.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <Label className='text-xs font-semibold'>Alasan Penghapusan (Wajib):</Label>
            <Textarea
              placeholder='Contoh: Dokumen keliru diunggah / diganti dengan berkas asli terbaru'
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className='text-xs'
            />
          </div>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => { setDeleteTarget(null); setDeleteReason('') }} disabled={isDeleting}>
              Batal
            </Button>
            <Button
              className='bg-rose-600 hover:bg-rose-700 text-white gap-2'
              onClick={handleDeleteSubmit}
              disabled={isDeleting || !deleteReason.trim()}
            >
              {isDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
              Konfirmasi Soft Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Restore Dokumen Confirm ───────────────── */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Dokumen Jemaat?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Dokumen <strong className='text-foreground'>{restoreTarget?.judul}</strong> akan dipulihkan ke repositori aktif.
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
              Ya, Pulihkan Dokumen
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Hard Delete Dokumen Confirm ───────────── */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5 text-rose-600' /> Hapus Permanen Dokumen Jemaat?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs'>
                  ⚠️ <strong>PERINGATAN</strong>: Dokumen <strong className='text-foreground'>{hardDeleteTarget?.judul}</strong> beserta file fisik di cloud storage akan dihapus secara PERMANEN dari database.
                </div>
                <div className='space-y-1 pt-2'>
                  <Label className='text-xs font-semibold'>Keterangan Tambahan (Opsional):</Label>
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
              onClick={handleOpenPrintTranscript}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10 rounded-full whitespace-nowrap'
              title='Cetak Berita Acara & Transkrip Dokumen A4'
            >
              <Printer className='size-3.5' />
              <span>Cetak Berita Acara</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setSelectedBulkStatus('VERIFIED')
                setBulkStatusModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Verifikasi / Validasi Status Dokumen Terpilih'
            >
              <ShieldCheck className='size-3.5' />
              <span>Verifikasi Status</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setSelectedBulkJenis('BAPTIS')
                setBulkJenisModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ubah Jenis Klasifikasi Dokumen Terpilih'
            >
              <Tag className='size-3.5' />
              <span>Ubah Jenis Berkas</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleExportCsv}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ekspor data dokumen terpilih ke CSV / Excel'
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
              title='Hapus dokumen terpilih (soft delete)'
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

      {/* ── MODAL 1: CETAK LEMBAR BERITA ACARA & TRANSKRIP (A4) ──── */}
      <Dialog open={printTranscriptModalOpen} onOpenChange={setPrintTranscriptModalOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
          <DialogHeader className='p-4 sm:p-5 pb-3 sm:pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0'>
            <div className='min-w-0 flex-1 pe-6 sm:pe-0'>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2 leading-tight'>
                <Printer className='size-5 text-primary shrink-0' />
                <span>Pratinjau Berita Acara Dokumen ({printTranscriptData.length} Berkas)</span>
              </DialogTitle>
              <DialogDescription className='text-xs mt-0.5'>
                Dokumen resmi transkrip sertifikat & berkas jemaat siap cetak A4 Portrait.
              </DialogDescription>
            </div>
            <Button
              size='sm'
              onClick={handleOpenPrintTranscript}
              className='w-full sm:w-auto gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm shrink-0'
            >
              <Printer className='size-4' /> Cetak Dokumen (Print / PDF)
            </Button>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-3 sm:p-6 bg-muted/20'>
            {isLoadingPrintTranscript ? (
              <div className='py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs'>
                <Loader2 className='size-6 animate-spin text-primary' />
                <span>Menyiapkan susunan data transkrip dokumen...</span>
              </div>
            ) : printTranscriptData.length === 0 ? (
              <div className='py-12 text-center text-xs text-muted-foreground'>
                Tidak ada data dokumen yang dapat ditampilkan.
              </div>
            ) : (
              <div className='bg-card border-2 border-border rounded-2xl p-5 shadow-sm space-y-4 max-w-4xl mx-auto'>
                {/* Header */}
                <div className='flex items-center justify-between border-b pb-3'>
                  <div className='flex items-center gap-3'>
                    <div className='size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-lg shadow-xs'>
                      {churchName.charAt(0) || 'G'}
                    </div>
                    <div>
                      <div className='text-sm sm:text-base font-black tracking-tight uppercase text-foreground'>
                        {churchName}
                      </div>
                      <div className='text-[10px] font-mono text-muted-foreground uppercase tracking-wider'>
                        BERITA ACARA & TRANSKRIP DOKUMEN JEMAAT
                      </div>
                    </div>
                  </div>
                  <Badge variant='outline' className='font-mono font-bold text-xs bg-primary/5 text-primary'>
                    {printTranscriptData.length} Dokumen Terpilih
                  </Badge>
                </div>

                {/* Table */}
                <div className='border rounded-xl overflow-hidden'>
                  <table className='w-full text-xs text-left'>
                    <thead className='bg-muted/60 text-muted-foreground font-semibold border-b'>
                      <tr>
                        <th className='p-2 text-center w-8'>No</th>
                        <th className='p-2'>Nama Jemaat</th>
                        <th className='p-2 text-center'>NIJ</th>
                        <th className='p-2'>Judul Dokumen</th>
                        <th className='p-2'>Jenis</th>
                        <th className='p-2 text-center'>Tgl Terbit</th>
                        <th className='p-2 text-center'>Status</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y'>
                      {printTranscriptData.map((doc, idx) => {
                        const d = new Date(doc.tanggalTerbit)
                        const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID') : '-'

                        return (
                          <tr key={doc.id} className='hover:bg-muted/20'>
                            <td className='p-2 text-center text-muted-foreground'>{idx + 1}</td>
                            <td className='p-2 font-bold text-foreground'>{doc.jemaatNama}</td>
                            <td className='p-2 text-center font-mono text-xs text-primary font-semibold'>{doc.jemaatNij}</td>
                            <td className='p-2 text-foreground font-medium'>{doc.judul}</td>
                            <td className='p-2 text-muted-foreground uppercase text-[10px] font-semibold'>
                              {(doc.jenisDokumen || '').replace(/_/g, ' ')}
                            </td>
                            <td className='p-2 text-center font-mono text-xs'>{dateStr}</td>
                            <td className='p-2 text-center'>
                              <Badge variant='outline' className='text-[10px] font-mono'>
                                {doc.status}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className='p-3 sm:p-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0'>
            <span className='text-xs text-muted-foreground text-center sm:text-left'>
              Format cetak A4 Portrait siap digunakan untuk Berita Acara & Atestasi.
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPrintTranscriptModalOpen(false)}
              className='w-full sm:w-auto'
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: VERIFIKASI STATUS DOKUMEN MASSAL ────────────── */}
      <Dialog open={bulkStatusModalOpen} onOpenChange={setBulkStatusModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <ShieldCheck className='size-5 text-primary' />
              Verifikasi Status ({selectedCount} Dokumen)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tetapkan status verifikasi baru untuk seluruh dokumen jemaat yang dipilih.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <Label className='text-xs font-semibold'>Pilih Status Verifikasi:</Label>
            <Select value={selectedBulkStatus} onValueChange={(val: any) => setSelectedBulkStatus(val)}>
              <SelectTrigger className='text-xs'>
                <SelectValue placeholder='Pilih Status...' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='VERIFIED'>VERIFIED (Sah & Terverifikasi)</SelectItem>
                <SelectItem value='DRAFT'>DRAFT (Menunggu Pemeriksaan Fisik)</SelectItem>
                <SelectItem value='REJECTED'>REJECTED (Ditolak / Berkas Tidak Sah)</SelectItem>
                <SelectItem value='EXPIRED'>EXPIRED (Kadaluarsa)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setBulkStatusModalOpen(false)} disabled={isBulkUpdatingStatus}>
              Batal
            </Button>
            <Button
              onClick={handleBulkStatusSubmit}
              disabled={isBulkUpdatingStatus}
              className='gap-1.5'
            >
              {isBulkUpdatingStatus ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
              {isBulkUpdatingStatus ? 'Memperbarui...' : `Simpan Status (${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: UBAH JENIS DOKUMEN MASSAL ──────────────────── */}
      <Dialog open={bulkJenisModalOpen} onOpenChange={setBulkJenisModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Tag className='size-5 text-primary' />
              Ubah Jenis Dokumen ({selectedCount} Berkas)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tetapkan klasifikasi jenis sertifikat baru untuk seluruh berkas terpilih.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <Label className='text-xs font-semibold'>Pilih Jenis Dokumen Baru:</Label>
            <Select value={selectedBulkJenis} onValueChange={(val: any) => setSelectedBulkJenis(val)}>
              <SelectTrigger className='text-xs'>
                <SelectValue placeholder='Pilih Jenis Dokumen...' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='BAPTIS'>Sertifikat Baptisan Selam</SelectItem>
                <SelectItem value='PERNIKAHAN'>Surat Nikah Gereja</SelectItem>
                <SelectItem value='PENYERAHAN_ANAK'>Akta Penyerahan Anak</SelectItem>
                <SelectItem value='SIDI'>Sertifikat Katekisasi / Sidi</SelectItem>
                <SelectItem value='KTP'>KTP / Kartu Identitas</SelectItem>
                <SelectItem value='KK'>Kartu Keluarga (KK)</SelectItem>
                <SelectItem value='LAINNYA'>Dokumen Pendukung Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setBulkJenisModalOpen(false)} disabled={isBulkUpdatingJenis}>
              Batal
            </Button>
            <Button
              onClick={handleBulkJenisSubmit}
              disabled={isBulkUpdatingJenis}
              className='gap-1.5'
            >
              {isBulkUpdatingJenis ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
              {isBulkUpdatingJenis ? 'Memperbarui...' : `Simpan Jenis (${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4: HAPUS MASSAL DOKUMEN (SOFT DELETE) ─────────── */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Pindahkan {selectedCount} Dokumen ke Kotak Sampah?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Dokumen jemaat terpilih ({selectedCount} berkas) akan diarsipkan ke kotak sampah (*soft delete*). File fisik di cloud storage tetap aman untuk pemulihan sewaktu-waktu.
                </div>
                <div className='space-y-1 pt-1'>
                  <Label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan Massal (Wajib):</Label>
                  <Textarea
                    placeholder='Contoh: Pembersihan dokumen salah unggah / arsip ganda'
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
