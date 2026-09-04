'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Plus,
  QrCode,
  Users,
  MapPin,
  Clock,
  Eye,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  FilterX,
  Loader2,
  Trash2,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  RotateCcw,
  ShieldAlert,
  LayoutGrid,
  Table2,
  Printer,
  Download,
  Check,
  X,
  FileSpreadsheet,
  Edit2,
  Image as ImageIcon,
  Tag,
  Lock,
  Timer,
  Building,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { EventFormDialog } from '@/components/event/event-form-dialog'
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
import {
  getEventListAction,
  createEventAction,
  deleteEventAction,
  restoreEventAction,
  hardDeleteEventAction,
  bulkUpdateKategoriEventAction,
  bulkUpdateLokasiEventAction,
  bulkSoftDeleteEventAction,
  getEventsForPrintAgendaAction,
  EventDTO,
} from '@/actions/event'
import { EventKategori } from '@/lib/validations/event'
import { toast } from 'sonner'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'

export default function EventListPage() {
  const [loading, setLoading] = useState(true)
  const [eventList, setEventList] = useState<EventDTO[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [filterKategori, setFilterKategori] = useState<string>('all')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Pagination
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  // View Mode: Table vs Card
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  // Column Visibility States
  const [visibleColumns, setVisibleColumns] = useState({
    namaEvent: true,
    kategori: true,
    tanggal: true,
    statusPresensi: true,
    totalAttendance: true,
  })

  // Create & Edit Event Modal States
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EventDTO | null>(null)

  // Bulk Actions States
  const [bulkKategoriModalOpen, setBulkKategoriModalOpen] = useState(false)
  const [selectedBulkKategori, setSelectedBulkKategori] = useState<EventKategori>('IBADAH_RAYA')
  const [isBulkUpdatingKategori, setIsBulkUpdatingKategori] = useState(false)

  const [bulkLokasiModalOpen, setBulkLokasiModalOpen] = useState(false)
  const [bulkLokasiInput, setBulkLokasiInput] = useState('Gedung Utama Gereja')
  const [isBulkUpdatingLokasi, setIsBulkUpdatingLokasi] = useState(false)
  const [churchName, setChurchName] = useState('Gereja')

  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState('')
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const [printAgendaModalOpen, setPrintAgendaModalOpen] = useState(false)
  const [printAgendaData, setPrintAgendaData] = useState<EventDTO[]>([])
  const [isLoadingPrintAgenda, setIsLoadingPrintAgenda] = useState(false)

  // Soft Delete & Restore & Hard Delete States
  const [deleteTarget, setDeleteTarget] = useState<EventDTO | null>(null)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreTarget, setRestoreTarget] = useState<EventDTO | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [hardDeleteTarget, setHardDeleteTarget] = useState<EventDTO | null>(null)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [isHardDeleting, setIsHardDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getEventListAction({
      search: searchTerm,
      statusHapus: statusHapusFilter,
      kategori: filterKategori !== 'all' ? (filterKategori as EventKategori) : undefined,
      page: pageIndex + 1,
      pageSize,
    })

    if (res.success && res.data) {
      setEventList(res.data.items)
      setTotalCount(res.data.total)
    } else {
      toast.error(res.error || 'Gagal memuat jadwal event.')
    }
    setLoading(false)
  }, [searchTerm, statusHapusFilter, filterKategori, pageIndex, pageSize])

  useEffect(() => {
    fetchData()
    getEffectivePrintConfig().then((pc) => {
      if (pc?.kop?.namaGereja) {
        setChurchName(pc.kop.namaGereja)
      }
    })
  }, [fetchData])

  // Sorting state
  const [sortField, setSortField] = useState<'namaEvent' | 'kategori' | 'tanggal' | 'statusPresensi' | null>('tanggal')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const sortedEventList = React.useMemo(() => {
    if (!sortField) return eventList
    return [...eventList].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''
      if (sortField === 'namaEvent') {
        aVal = a.namaEvent || ''
        bVal = b.namaEvent || ''
      } else if (sortField === 'kategori') {
        aVal = a.kategori || ''
        bVal = b.kategori || ''
      } else if (sortField === 'statusPresensi') {
        const getPresensiStatus = (event: EventDTO) => {
          const now = new Date()
          const open = event.presensiBuka ? new Date(event.presensiBuka) : null
          const close = event.presensiTutup ? new Date(event.presensiTutup) : null
          if (open && now < open) return 'BELUM_BUKA'
          if (close && now > close) return 'DITUTUP'
          return 'DIBUKA'
        }
        aVal = getPresensiStatus(a)
        bVal = getPresensiStatus(b)
      } else if (sortField === 'tanggal') {
        aVal = new Date(a.tanggalMulai || a.tanggal || 0).getTime()
        bVal = new Date(b.tanggalMulai || b.tanggal || 0).getTime()
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [eventList, sortField, sortOrder])

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id])
  const selectedCount = selectedIds.length
  const isAllPaginatedSelected = sortedEventList.length > 0 && sortedEventList.every((e) => selectedRows[e.id])
  const isAllSelected = isAllPaginatedSelected

  const selectedEventData = sortedEventList.filter((item) => selectedRows[item.id])

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    sortedEventList.forEach((item) => {
      updated[item.id] = checked
    })
    setSelectedRows(updated)
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows((prev) => ({ ...prev, [id]: checked }))
  }

  // 1. Export CSV Handler
  const handleExportCsv = () => {
    const targets = selectedCount > 0 ? selectedEventData : eventList

    if (targets.length === 0) {
      toast.error('Tidak ada data event untuk diekspor.')
      return
    }

    const headers = [
      'Nama Event / Ibadah',
      'Kategori',
      'Tanggal Pelaksanaan',
      'Waktu',
      'Lokasi / Ruang',
      'Total Kehadiran',
      'Deskripsi',
      'Status Data',
      'Tanggal Dibuat',
    ]

    const rows = targets.map((item) => {
      const d = new Date(item.tanggal)
      return [
        `"${(item.namaEvent || '').replace(/"/g, '""')}"`,
        `"${item.kategori || '-'}"`,
        `"${!isNaN(d.getTime()) ? d.toLocaleDateString('id-ID') : '-'}"`,
        `"${!isNaN(d.getTime()) ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}"`,
        `"${(item.lokasi || '').replace(/"/g, '""')}"`,
        `"${item.totalAttendance || 0}"`,
        `"${(item.deskripsi || '').replace(/"/g, '""')}"`,
        `"${item.deletedAt ? 'TERHAPUS (SOFT)' : 'AKTIF'}"`,
        `"${item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}"`,
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    const cleanChurch = (churchName || 'Gereja').replace(/[^a-zA-Z0-9]/g, '_')
    link.setAttribute('download', `Data_Event_${cleanChurch}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${targets.length} data event ke CSV.`)
  }

  // 2. Direct Print Event Agenda Sheet (Without Preview Modal)
  const handleOpenPrintAgenda = async () => {
    const idsToPrint =
      selectedIds.length > 0
        ? selectedIds
        : eventList.map((e) => e.id)

    if (idsToPrint.length === 0) {
      toast.error('Tidak ada agenda event yang dapat dicetak.')
      return
    }
    const toastId = toast.loading('Menyiapkan agenda cetak...')
    setIsLoadingPrintAgenda(true)
    const res = await getEventsForPrintAgendaAction(idsToPrint)
    setIsLoadingPrintAgenda(false)
    toast.dismiss(toastId)

    if (!res.success || !res.data || res.data.length === 0) {
      toast.error(res.error || 'Gagal memuat data agenda event.')
      return
    }

    const printAgendaData = res.data
    const printConfig = await getEffectivePrintConfig()

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const totalPresensi = printAgendaData.reduce((acc, curr) => acc + (curr.totalAttendance || 0), 0)

    const rowsHtml = printAgendaData.map((ev, idx) => {
      const d = new Date(ev.tanggal)
      const dateStr = !isNaN(d.getTime())
        ? d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '-'
      const timeStr = !isNaN(d.getTime())
        ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        : '-'

      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700; color: #0f172a;">${ev.namaEvent}</td>
          <td style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${(ev.kategori || '').replace(/_/g, ' ')}</td>
          <td>${dateStr}</td>
          <td style="text-align: center; font-family: monospace; font-weight: 700;">${timeStr}</td>
          <td>${ev.lokasi}</td>
          <td style="text-align: center; font-weight: 800; color: #0f172a;">${ev.totalAttendance || 0} Jemaat</td>
        </tr>
      `
    }).join('')

    const kopHtml = buildKopHtml(printConfig, {
      badgeText: 'DIVISI ACARA & IBADAH',
      dateText: `Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
    })

    const signaturesHtml = buildSignaturesHtml(printConfig, [
      { roleKey: 'koordinatorDivisi', customTitle: 'Koordinator Divisi Acara & Usher' },
      { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
    ])

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Warta & Agenda Jadwal Ibadah/Event (${printAgendaData.length} Acara) - ${printConfig.kop.namaGereja}</title>
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
          .events-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 20px;
          }
          .events-table th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            font-weight: 800;
            text-align: left;
          }
          .events-table td {
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
            <div class="stat-lbl">Total Agenda Terjadwal</div>
            <div class="stat-val">${printAgendaData.length} Acara / Ibadah</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Total Akumulasi Presensi Hadir</div>
            <div class="stat-val">${totalPresensi} Jemaat</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Status Periode</div>
            <div class="stat-val">Agenda Resmi Aktif</div>
          </div>
        </div>

        <table class="events-table">
          <thead>
            <tr>
              <th style="width: 25px;">No</th>
              <th>Nama Ibadah / Event</th>
              <th style="width: 95px;">Kategori</th>
              <th>Hari & Tanggal</th>
              <th style="width: 70px; text-align: center;">Waktu</th>
              <th>Lokasi Pelaksanaan</th>
              <th style="width: 85px; text-align: center;">Kehadiran</th>
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

  // 3. Bulk Update Kategori Submit
  const handleBulkKategoriSubmit = async () => {
    if (selectedIds.length === 0) return
    setIsBulkUpdatingKategori(true)
    const res = await bulkUpdateKategoriEventAction({
      ids: selectedIds,
      kategori: selectedBulkKategori,
    })
    setIsBulkUpdatingKategori(false)
    if (res.success) {
      toast.success(res.message)
      setBulkKategoriModalOpen(false)
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui kategori event.')
    }
  }

  // 4. Bulk Update Lokasi Submit
  const handleBulkLokasiSubmit = async () => {
    if (selectedIds.length === 0) return
    if (!bulkLokasiInput.trim()) {
      toast.error('Lokasi/ruangan event wajib diisi.')
      return
    }
    setIsBulkUpdatingLokasi(true)
    const res = await bulkUpdateLokasiEventAction({
      ids: selectedIds,
      lokasi: bulkLokasiInput.trim(),
    })
    setIsBulkUpdatingLokasi(false)
    if (res.success) {
      toast.success(res.message)
      setBulkLokasiModalOpen(false)
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui lokasi event.')
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
    const res = await bulkSoftDeleteEventAction({
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
      toast.error(res.error || 'Gagal menghapus data event.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !deletionReason.trim()) {
      toast.error('Alasan penghapusan event wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deleteEventAction({
      id: deleteTarget.id,
      reason: deletionReason.trim(),
    })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Event berhasil di-soft delete.')
      setDeleteTarget(null)
      setDeletionReason('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus event.')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    const res = await restoreEventAction({ id: restoreTarget.id })
    setIsRestoring(false)

    if (res.success) {
      toast.success(res.message || 'Event berhasil dipulihkan!')
      setRestoreTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memulihkan event.')
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return
    setIsHardDeleting(true)
    const res = await hardDeleteEventAction({
      id: hardDeleteTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Event berhasil dihapus permanen dari database!')
      setHardDeleteTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen event.')
    }
  }

  const renderKategoriBadge = (kat: EventKategori) => {
    switch (kat) {
      case 'IBADAH_RAYA':
        return <Badge className='bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px]'>Ibadah Raya</Badge>
      case 'KOMSEL':
        return <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]'>Komsel</Badge>
      case 'YOUTH':
        return <Badge className='bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px]'>Youth</Badge>
      case 'SEMINAR':
        return <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]'>Seminar</Badge>
      case 'SEKOLAH_MINGGU':
        return <Badge className='bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px]'>Sekolah Minggu</Badge>
      default:
        return <Badge variant='outline'>{kat}</Badge>
    }
  }

  const renderCheckInStatusBadge = (event: EventDTO) => {
    const now = new Date()
    const open = event.presensiBuka ? new Date(event.presensiBuka) : null
    const close = event.presensiTutup ? new Date(event.presensiTutup) : null

    if (open && now < open) {
      return (
        <Badge variant='outline' className='font-mono text-[9.5px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1'>
          <Timer className='size-2.5' /> BELUM BUKA
        </Badge>
      )
    }

    if (close && now > close) {
      return (
        <Badge variant='outline' className='font-mono text-[9.5px] bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1'>
          <Lock className='size-2.5' /> DITUTUP
        </Badge>
      )
    }

    return (
      <Badge className='font-mono text-[9.5px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1'>
        <Sparkles className='size-2.5' /> DIBUKA
      </Badge>
    )
  }

  const renderColumnHeader = (
    title: string,
    columnKey: keyof typeof visibleColumns,
    field?: 'namaEvent' | 'kategori' | 'tanggal' | 'statusPresensi'
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
      {/* Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Jadwal & Presensi Event</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Kelola jadwal ibadah, seminar, dan presensi kegiatan.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2 w-full sm:w-auto'>
          <Button size='sm' onClick={() => setCreateOpen(true)} className='w-full sm:w-auto h-9 sm:h-8 gap-1.5 text-xs shadow-xs font-semibold'>
            <Plus className='size-3.5' /> Buat Event
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={handleOpenPrintAgenda}
            className='w-full sm:w-auto h-9 sm:h-8 gap-1.5 text-xs font-medium'
            title='Cetak Warta & Agenda Jadwal Ibadah/Event A4'
          >
            <Printer className='size-3.5' /> Cetak Agenda Event
          </Button>
        </div>
      </div>

      {/* Toolbar Filter Section */}
      <div className='flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between'>
        {/* Search & Filters */}
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1 sm:max-w-4xl'>
          {/* Search Input */}
          <div className='relative w-full sm:w-72 md:w-80'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
            <Input
              placeholder='Cari nama event, pembicara, lokasi...'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPageIndex(0)
              }}
              className='h-8 ps-8 pe-3 text-xs w-full'
            />
          </div>

          {/* Filters Grid on Mobile, Flex on Desktop */}
          <div className='grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto'>
            {/* Filter Status Hapus */}
            <Select
              value={statusHapusFilter}
              onValueChange={(val: 'ACTIVE' | 'DELETED' | 'ALL') => {
                setStatusHapusFilter(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 w-full sm:w-32 text-xs font-medium'>
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

            {/* Filter Kategori Event */}
            <Select
              value={filterKategori}
              onValueChange={(val) => {
                setFilterKategori(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 w-full sm:w-36 text-xs'>
                <SelectValue placeholder='Kategori Event' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs'>Semua Kategori</SelectItem>
                <SelectItem value='IBADAH_RAYA' className='text-xs'>Ibadah Raya</SelectItem>
                <SelectItem value='KOMSEL' className='text-xs'>Komsel</SelectItem>
                <SelectItem value='YOUTH' className='text-xs'>Youth</SelectItem>
                <SelectItem value='SEMINAR' className='text-xs'>Seminar</SelectItem>
                <SelectItem value='SEKOLAH_MINGGU' className='text-xs'>Sekolah Minggu</SelectItem>
                <SelectItem value='LAINNYA' className='text-xs'>Lainnya</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || statusHapusFilter !== 'ACTIVE' || filterKategori !== 'all') && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSearchTerm('')
                  setStatusHapusFilter('ACTIVE')
                  setFilterKategori('all')
                  setPageIndex(0)
                }}
                className='h-8 px-2 text-xs gap-1 text-muted-foreground col-span-2 sm:col-span-1 justify-center'
              >
                Reset <FilterX className='size-3' />
              </Button>
            )}
          </div>
        </div>

        {/* View Switcher & Column Toggle */}
        <div className='flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0'>
          {/* View Switcher: Table vs Card */}
          <div className='flex items-center border rounded-lg p-0.5 bg-muted/40'>
            <Button
              type='button'
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setViewMode('table')}
              className={`h-7 px-2.5 text-xs gap-1.5 ${
                viewMode === 'table' ? 'shadow-xs font-semibold' : 'text-muted-foreground'
              }`}
              title='Tampilan Tabel'
            >
              <Table2 className='size-3.5' /> <span>Tabel</span>
            </Button>
            <Button
              type='button'
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setViewMode('card')}
              className={`h-7 px-2.5 text-xs gap-1.5 ${
                viewMode === 'card' ? 'shadow-xs font-semibold' : 'text-muted-foreground'
              }`}
              title='Tampilan Kartu / Grid'
            >
              <LayoutGrid className='size-3.5' /> <span>Kartu</span>
            </Button>
          </div>

          {/* Column Toggle (Only in Table View) */}
          {viewMode === 'table' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='h-8 gap-1.5 text-xs'>
                  <SlidersHorizontal className='size-3.5' /> Kolom
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-44'>
                <DropdownMenuLabel className='text-xs'>Toggle Kolom</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['namaEvent', 'kategori', 'tanggal', 'statusPresensi', 'totalAttendance'] as const).map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col}
                    checked={visibleColumns[col]}
                    onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, [col]: !!c }))}
                  >
                    {col === 'namaEvent' ? 'Nama Event' : col === 'kategori' ? 'Kategori' : col === 'tanggal' ? 'Jadwal / Waktu' : col === 'statusPresensi' ? 'Status Presensi' : 'Kehadiran'}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Content: Table View vs Card View */}
      {viewMode === 'table' ? (
        <div className='rounded-md border overflow-hidden bg-card'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='hover:bg-transparent border-b'>
                  <TableHead className='w-10 px-3'>
                    <Checkbox checked={isAllSelected} onCheckedChange={(c) => handleSelectAll(!!c)} />
                  </TableHead>
                  {visibleColumns.namaEvent && <TableHead className='px-3'>{renderColumnHeader('Nama Event & Deskripsi', 'namaEvent', 'namaEvent')}</TableHead>}
                  {visibleColumns.kategori && <TableHead className='px-3'>{renderColumnHeader('Kategori', 'kategori', 'kategori')}</TableHead>}
                  {visibleColumns.tanggal && <TableHead className='px-3'>{renderColumnHeader('Jadwal / Waktu', 'tanggal', 'tanggal')}</TableHead>}
                  {visibleColumns.statusPresensi && <TableHead className='px-3 text-center'>{renderColumnHeader('Status Presensi', 'statusPresensi', 'statusPresensi')}</TableHead>}
                  {visibleColumns.totalAttendance && <TableHead className='px-3 font-semibold text-xs text-center'>Kehadiran</TableHead>}
                  <TableHead className='w-14 px-3 text-end'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className='h-32 text-center text-muted-foreground text-sm'>
                      <div className='flex items-center justify-center gap-2'>
                        <Loader2 className='size-4 animate-spin text-primary' /> Memuat jadwal event...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedEventList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='h-32 text-center text-muted-foreground text-sm'>
                      {searchTerm || filterKategori !== 'all' || statusHapusFilter !== 'ACTIVE' ? (
                        <div className='space-y-2'>
                          <div>Tidak ada event yang sesuai dengan filter.</div>
                          <Button variant='outline' size='sm' onClick={() => { setSearchTerm(''); setStatusHapusFilter('ACTIVE'); setFilterKategori('all'); }}>
                            Reset Filter
                          </Button>
                        </div>
                      ) : (
                        <div className='space-y-2'>
                          <div>Belum ada event terjadwal.</div>
                          <Button size='sm' onClick={() => setCreateOpen(true)}>
                            <Plus className='size-4 me-1' /> Buat Event Pertama
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEventList.map((event) => {
                    const isSelected = !!selectedRows[event.id]
                    const isDeleted = !!event.deletedAt
                    const startDate = new Date(event.tanggalMulai || event.tanggal)
                    const endDate = event.tanggalSelesai ? new Date(event.tanggalSelesai) : null

                    return (
                      <TableRow
                        key={event.id}
                        className={`transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'} ${isSelected ? 'bg-muted/50' : ''}`}
                      >
                        <TableCell className='px-3 py-2.5'>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => setSelectedRows((p) => ({ ...p, [event.id]: !!c }))}
                          />
                        </TableCell>
                        {visibleColumns.namaEvent && (
                          <TableCell className='px-3 py-2.5'>
                            <div className='flex items-center gap-2.5'>
                              {event.thumbnailUrl ? (
                                <img
                                  src={event.thumbnailUrl}
                                  alt={event.namaEvent}
                                  className='size-9 rounded-lg object-cover border shrink-0 bg-black/10'
                                  onError={(e) => {
                                    ;(e.target as HTMLElement).style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className='size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20'>
                                  <Calendar className='size-4' />
                                </div>
                              )}
                              <div className='min-w-0'>
                                <div className='flex items-center gap-2'>
                                  <Link href={`/dashboard/event/${event.id}`} className='font-bold text-sm text-foreground hover:underline hover:text-primary block truncate'>
                                    {event.namaEvent}
                                  </Link>
                                  {isDeleted && (
                                    <Badge variant='destructive' className='text-[9.5px] font-mono shrink-0'>
                                      <Trash2 className='size-2.5 me-1' /> Terhapus
                                    </Badge>
                                  )}
                                </div>
                                <span className='text-muted-foreground text-[11px] truncate block max-w-xs sm:max-w-sm'>
                                  {event.deskripsi || 'Jadwal kegiatan agenda gereja.'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.kategori && (
                          <TableCell className='px-3 py-2.5 text-xs whitespace-nowrap'>
                            {renderKategoriBadge(event.kategori)}
                          </TableCell>
                        )}
                        {visibleColumns.tanggal && (
                          <TableCell className='px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap'>
                            <div className='flex items-center gap-1.5 font-medium text-foreground'>
                              <Calendar className='size-3 text-primary' />
                              <span>{startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className='flex items-center gap-1 text-[11px] text-muted-foreground/80 mt-0.5'>
                              <Clock className='size-3' />
                              <span>
                                {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                {endDate ? ` - ${endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}{' '}
                                WIB
                              </span>
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.statusPresensi && (
                          <TableCell className='px-3 py-2.5 text-center whitespace-nowrap'>
                            {renderCheckInStatusBadge(event)}
                          </TableCell>
                        )}
                        {visibleColumns.totalAttendance && (
                          <TableCell className='px-3 py-2.5 text-center whitespace-nowrap'>
                            <Badge variant='outline' className='font-mono text-xs bg-muted/40 font-semibold px-2.5 py-0.5 text-foreground'>
                              <Users className='size-3 me-1 text-primary shrink-0' />
                              <span>{event.manualHeadcount > 0 ? event.manualHeadcount : event.totalAttendance} Jiwa</span>
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className='px-3 py-2.5 text-end'>
                          <div className='flex items-center justify-end gap-1'>
                            {isDeleted ? (
                              <>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1'
                                  onClick={() => setRestoreTarget(event)}
                                >
                                  <RotateCcw className='size-3.5' /> Pulihkan
                                </Button>
                                <Button
                                  size='sm'
                                  variant='ghost'
                                  className='h-7 px-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 gap-1'
                                  onClick={() => setHardDeleteTarget(event)}
                                >
                                  <Trash2 className='size-3.5' /> Hapus
                                </Button>
                              </>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant='ghost' size='icon' className='size-7'>
                                    <MoreHorizontal className='size-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                  <DropdownMenuLabel className='text-xs'>Aksi Event</DropdownMenuLabel>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/event/${event.id}`}>
                                      <Eye className='size-3.5 me-2 text-primary' /> Lihat Rekap Kehadiran
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditTarget(event)
                                      setEditOpen(true)
                                    }}
                                  >
                                    <Edit2 className='size-3.5 me-2 text-muted-foreground' /> Edit Data Event
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/scan/${event.id}`}>
                                      <QrCode className='size-3.5 me-2 text-primary' /> Buka Scanner Presensi
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className='text-rose-600 dark:text-rose-400 text-xs'
                                    onClick={() => setDeleteTarget(event)}
                                  >
                                    <Trash2 className='size-3.5 me-2' /> Soft Delete Event
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

          {/* Pagination Footer for Table */}
          <div className='flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t text-xs text-muted-foreground bg-card'>
            <div className='text-center sm:text-left text-xs font-medium'>
              {selectedCount} dari {totalCount} baris dipilih.
            </div>
            <div className='flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto'>
              <div className='flex items-center gap-2 shrink-0'>
                <span className='whitespace-nowrap text-[11px] sm:text-xs'>Baris per hal:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val))
                    setPageIndex(0)
                  }}
                >
                  <SelectTrigger className='h-7 w-14 px-2 text-xs font-mono'>
                    <SelectValue placeholder={String(pageSize)} />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((size) => (
                      <SelectItem key={size} value={String(size)} className='text-xs'>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='font-mono whitespace-nowrap text-[11px] sm:text-xs shrink-0'>
                Hal {pageIndex + 1} / {totalPages || 1}
              </div>

              <div className='flex items-center gap-1 shrink-0'>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  onClick={() => setPageIndex(0)}
                  disabled={pageIndex === 0}
                  title='Halaman Pertama'
                >
                  <ChevronsLeft className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  disabled={pageIndex === 0}
                  title='Halaman Sebelumnya'
                >
                  <ChevronLeft className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  onClick={() => setPageIndex((p) => p + 1)}
                  disabled={pageIndex >= totalPages - 1}
                  title='Halaman Berikutnya'
                >
                  <ChevronRight className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  onClick={() => setPageIndex(totalPages - 1)}
                  disabled={pageIndex >= totalPages - 1}
                  title='Halaman Terakhir'
                >
                  <ChevronsRight className='size-3.5' />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Card View Section */
        <div className='space-y-4'>
          {loading ? (
            <div className='flex items-center justify-center min-h-75 text-muted-foreground gap-2 text-sm border rounded-lg bg-card p-12'>
              <Loader2 className='size-5 animate-spin text-primary' /> Memuat jadwal event...
            </div>
          ) : eventList.length === 0 ? (
            <div className='rounded-lg border bg-card p-12 text-center text-muted-foreground space-y-3'>
              {searchTerm || filterKategori !== 'all' || statusHapusFilter !== 'ACTIVE' ? (
                <div className='space-y-2'>
                  <div className='font-medium text-foreground text-sm'>Tidak ada event yang sesuai dengan filter.</div>
                  <Button variant='outline' size='sm' onClick={() => { setSearchTerm(''); setStatusHapusFilter('ACTIVE'); setFilterKategori('all'); }}>
                    Reset Filter
                  </Button>
                </div>
              ) : (
                <div className='space-y-2'>
                  <div className='font-medium text-foreground text-sm'>Belum ada event terjadwal.</div>
                  <p className='text-xs text-muted-foreground'>Buat jadwal event baru untuk memulai pemindaian presensi jemaat.</p>
                  <Button size='sm' onClick={() => setCreateOpen(true)}>
                    <Plus className='size-4 me-1' /> Buat Event Pertama
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
              {sortedEventList.map((event) => {
                const isSelected = !!selectedRows[event.id]
                const isDeleted = !!event.deletedAt
                const startDate = new Date(event.tanggalMulai || event.tanggal)
                const endDate = event.tanggalSelesai ? new Date(event.tanggalSelesai) : null

                return (
                  <Card
                    key={event.id}
                    className={`overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between border group ${
                      isDeleted ? 'bg-rose-500/5 border-rose-200 dark:border-rose-900/50' : 'bg-card'
                    } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div>
                      {/* Optional Banner Poster Thumbnail */}
                      {event.thumbnailUrl && (
                        <div className='relative h-32 w-full overflow-hidden bg-black/10 border-b'>
                          <img
                            src={event.thumbnailUrl}
                            alt={event.namaEvent}
                            className='w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300'
                            onError={(e) => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        </div>
                      )}

                      {/* Top Header with Category & Selection */}
                      <div className='p-3 pb-2 border-b bg-muted/20 flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2'>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => setSelectedRows((p) => ({ ...p, [event.id]: !!c }))}
                          />
                          {renderKategoriBadge(event.kategori)}
                        </div>

                        <div>
                          {renderCheckInStatusBadge(event)}
                        </div>
                      </div>

                      {/* Card Content Body */}
                      <CardContent className='p-3.5 space-y-2.5'>
                        {/* Title */}
                        <Link
                          href={`/dashboard/event/${event.id}`}
                          className='font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-2 block leading-snug'
                        >
                          {event.namaEvent}
                        </Link>

                        {/* Date & Time */}
                        <div className='space-y-1 text-xs text-muted-foreground font-mono'>
                          <div className='flex items-center gap-1.5'>
                            <Calendar className='size-3.5 text-primary shrink-0' />
                            <span>
                              {startDate.toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground/80'>
                            <Clock className='size-3.5 text-primary shrink-0' />
                            <span>
                              {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              {endDate ? ` - ${endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}{' '}
                              WIB
                            </span>
                          </div>
                        </div>

                        {/* Location */}
                        <div className='flex items-start gap-1.5 text-xs text-muted-foreground'>
                          <MapPin className='size-3.5 text-primary shrink-0 mt-0.5' />
                          <span className='line-clamp-1'>{event.namaLokasi || event.lokasi}</span>
                        </div>

                        {/* Description */}
                        <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed pt-1 border-t'>
                          {event.deskripsi || 'Tidak ada catatan tambahan untuk event ini.'}
                        </p>
                      </CardContent>
                    </div>

                    {/* Card Actions Footer */}
                    <div className='px-3.5 py-2.5 bg-muted/20 border-t flex items-center justify-between gap-1.5'>
                      {isDeleted ? (
                        <div className='flex items-center justify-end gap-1 w-full'>
                          <Button
                            size='sm'
                            variant='outline'
                            className='h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1'
                            onClick={() => setRestoreTarget(event)}
                          >
                            <RotateCcw className='size-3.5' /> Pulihkan
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-7 px-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 gap-1'
                            onClick={() => setHardDeleteTarget(event)}
                          >
                            <Trash2 className='size-3.5' /> Hapus
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button asChild size='sm' variant='outline' className='h-7 px-2 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10'>
                            <Link href={`/scan/${event.id}`}>
                              <QrCode className='size-3.5' /> Scanner
                            </Link>
                          </Button>

                          <div className='flex items-center gap-1'>
                            <Button
                              type='button'
                              size='sm'
                              variant='outline'
                              className='h-7 px-2 text-xs gap-1'
                              onClick={() => {
                                setEditTarget(event)
                                setEditOpen(true)
                              }}
                            >
                              <Edit2 className='size-3.5' /> Edit
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon' className='size-7'>
                                  <MoreHorizontal className='size-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuLabel className='text-xs'>Aksi Event</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/event/${event.id}`}>
                                    <Eye className='size-3.5 me-2' /> Lihat Rekap Kehadiran
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditTarget(event)
                                    setEditOpen(true)
                                  }}
                                >
                                  <Edit2 className='size-3.5 me-2 text-primary' /> Edit Data Event
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/scan/${event.id}`}>
                                    <QrCode className='size-3.5 me-2' /> Buka Scanner Presensi
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                  onClick={() => setDeleteTarget(event)}
                                >
                                  <Trash2 className='size-3.5 me-2' /> Soft Delete Event
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Pagination Footer for Card View */}
          <div className='flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border rounded-lg text-xs text-muted-foreground bg-card'>
            <div className='text-center sm:text-left text-xs font-medium'>
              {selectedCount} dari {totalCount} kartu dipilih.
            </div>
            <div className='flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto'>
              <div className='flex items-center gap-2 shrink-0'>
                <span className='whitespace-nowrap text-[11px] sm:text-xs'>Kartu per hal:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val))
                    setPageIndex(0)
                  }}
                >
                  <SelectTrigger className='h-7 w-14 px-2 text-xs font-mono'>
                    <SelectValue placeholder={String(pageSize)} />
                  </SelectTrigger>
                  <SelectContent>
                    {[8, 12, 24, 48].map((size) => (
                      <SelectItem key={size} value={String(size)} className='text-xs'>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='font-mono whitespace-nowrap text-[11px] sm:text-xs shrink-0'>
                Hal {pageIndex + 1} / {totalPages || 1}
              </div>

              <div className='flex items-center gap-1 shrink-0'>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  onClick={() => setPageIndex(0)}
                  disabled={pageIndex === 0}
                  title='Halaman Pertama'
                >
                  <ChevronsLeft className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  disabled={pageIndex === 0}
                  title='Halaman Sebelumnya'
                >
                  <ChevronLeft className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  onClick={() => setPageIndex((p) => p + 1)}
                  disabled={pageIndex >= totalPages - 1}
                  title='Halaman Berikutnya'
                >
                  <ChevronRight className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  onClick={() => setPageIndex(totalPages - 1)}
                  disabled={pageIndex >= totalPages - 1}
                  title='Halaman Terakhir'
                >
                  <ChevronsRight className='size-3.5' />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Form Tambah Event Baru ────────────────────────── */}
      <EventFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchData}
      />

      {/* ── Modal Form Edit Event ───────────────────────────────── */}
      <EventFormDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) setEditTarget(null)
        }}
        eventToEdit={editTarget}
        onSuccess={fetchData}
      />

      {/* ── AlertDialog Konfirmasi Soft Delete Event ──────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeletionReason('') }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2'>
              <Trash2 className='size-5' /> Hapus Jadwal Event?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Event <strong className='text-foreground'>{deleteTarget?.namaEvent}</strong> akan dinonaktifkan via Soft Delete.
                </span>
                <span className='block text-xs text-muted-foreground'>
                  Data kehadiran presensi tetap tersimpan dan jadwal event dapat dipulihkan kembali sewaktu-waktu.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan (Wajib):</label>
            <Textarea
              placeholder='Masukkan alasan penghapusan event ini...'
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className='text-xs'
            />
          </div>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => { setDeleteTarget(null); setDeletionReason('') }} disabled={isDeleting}>
              Batal
            </Button>
            <Button
              className='bg-rose-600 hover:bg-rose-700 text-white gap-2'
              onClick={handleDeleteConfirm}
              disabled={isDeleting || !deletionReason.trim()}
            >
              {isDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
              Konfirmasi Soft Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Restore Event Confirm ─────────────────── */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Jadwal Event?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Event <strong className='text-foreground'>{restoreTarget?.namaEvent}</strong> akan dipulihkan ke daftar aktif.
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
              Ya, Pulihkan Event
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Hard Delete Event Confirm ─────────────── */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5 text-rose-600' /> Hapus Permanen Jadwal Event?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs'>
                  ⚠️ <strong>PERINGATAN</strong>: Event <strong className='text-foreground'>{hardDeleteTarget?.namaEvent}</strong> beserta SELURUH riwayat presensi yang terhubung akan dihapus secara PERMANEN dari database.
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
              onClick={handleOpenPrintAgenda}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10 rounded-full whitespace-nowrap'
              title='Cetak Lembar Warta & Agenda Jadwal Event A4'
            >
              <Printer className='size-3.5' />
              <span>Cetak Lembar Agenda</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setSelectedBulkKategori('IBADAH_RAYA')
                setBulkKategoriModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ubah Kategori Jadwal / Event Terpilih'
            >
              <Tag className='size-3.5' />
              <span>Ubah Kategori</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setBulkLokasiInput('Gedung Utama Gereja')
                setBulkLokasiModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ubah Lokasi / Ruang Pelaksanaan Event Terpilih'
            >
              <MapPin className='size-3.5' />
              <span>Ubah Lokasi</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleExportCsv}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ekspor data event terpilih ke CSV / Excel'
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
              title='Hapus event terpilih (soft delete)'
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

      {/* ── MODAL 1: CETAK LEMBAR WARTA & AGENDA EVENT (A4) ──────── */}
      <Dialog open={printAgendaModalOpen} onOpenChange={setPrintAgendaModalOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
          <DialogHeader className='p-4 sm:p-5 pb-3 sm:pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0'>
            <div className='min-w-0 flex-1 pe-6 sm:pe-0'>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2 leading-tight'>
                <Printer className='size-5 text-primary shrink-0' />
                <span>Pratinjau Lembar Agenda Event ({printAgendaData.length} Acara)</span>
              </DialogTitle>
              <DialogDescription className='text-xs mt-0.5'>
                Dokumen jadwal dan agenda acara resmi gereja siap cetak A4.
              </DialogDescription>
            </div>
            <Button
              size='sm'
              onClick={handleOpenPrintAgenda}
              className='w-full sm:w-auto gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm shrink-0'
            >
              <Printer className='size-4' /> Cetak Dokumen Agenda (Print / PDF)
            </Button>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-3 sm:p-6 bg-muted/20'>
            {isLoadingPrintAgenda ? (
              <div className='py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs'>
                <Loader2 className='size-6 animate-spin text-primary' />
                <span>Menyiapkan susunan data lembar agenda event...</span>
              </div>
            ) : printAgendaData.length === 0 ? (
              <div className='py-12 text-center text-xs text-muted-foreground'>
                Tidak ada data event yang dapat ditampilkan.
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
                        WARTA & LEMBAR AGENDA JADWAL EVENT GEREJA
                      </div>
                    </div>
                  </div>
                  <Badge variant='outline' className='font-mono font-bold text-xs bg-primary/5 text-primary'>
                    {printAgendaData.length} Acara Terjadwal
                  </Badge>
                </div>

                {/* Table */}
                <div className='border rounded-xl overflow-hidden'>
                  <table className='w-full text-xs text-left'>
                    <thead className='bg-muted/60 text-muted-foreground font-semibold border-b'>
                      <tr>
                        <th className='p-2 text-center w-8'>No</th>
                        <th className='p-2'>Nama Ibadah / Event</th>
                        <th className='p-2'>Kategori</th>
                        <th className='p-2'>Tanggal & Waktu</th>
                        <th className='p-2'>Lokasi</th>
                        <th className='p-2 text-center'>Presensi Hadir</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y'>
                      {printAgendaData.map((ev, idx) => {
                        const d = new Date(ev.tanggal)
                        const dateStr = !isNaN(d.getTime())
                          ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '-'
                        const timeStr = !isNaN(d.getTime())
                          ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                          : '-'

                        return (
                          <tr key={ev.id} className='hover:bg-muted/20'>
                            <td className='p-2 text-center text-muted-foreground'>{idx + 1}</td>
                            <td className='p-2 font-bold text-foreground'>{ev.namaEvent}</td>
                            <td className='p-2 text-muted-foreground uppercase text-[10px] font-semibold'>
                              {(ev.kategori || '').replace(/_/g, ' ')}
                            </td>
                            <td className='p-2 font-mono text-xs'>
                              {dateStr} • {timeStr}
                            </td>
                            <td className='p-2 text-foreground'>{ev.lokasi}</td>
                            <td className='p-2 text-center font-mono font-bold text-primary'>
                              {ev.totalAttendance || 0} Jemaat
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
              Format cetak A4 Portrait siap digunakan untuk Warta Jemaat & Rapat Pengerja.
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPrintAgendaModalOpen(false)}
              className='w-full sm:w-auto'
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: UBAH KATEGORI EVENT MASSAL ──────────────────── */}
      <Dialog open={bulkKategoriModalOpen} onOpenChange={setBulkKategoriModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Tag className='size-5 text-primary' />
              Ubah Kategori ({selectedCount} Event)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tetapkan kategori baru untuk seluruh jadwal / event yang dipilih.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <Label className='text-xs font-semibold'>Pilih Kategori Baru:</Label>
            <Select value={selectedBulkKategori} onValueChange={(val: any) => setSelectedBulkKategori(val)}>
              <SelectTrigger className='text-xs'>
                <SelectValue placeholder='Pilih Kategori...' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='IBADAH_RAYA'>Ibadah Raya Mingguan</SelectItem>
                <SelectItem value='DOA_PUJIAN'>Doa & Pujian / Menara Doa</SelectItem>
                <SelectItem value='SEMINAR'>Seminar / Workshop</SelectItem>
                <SelectItem value='RETREAT'>Retreat / Camp Rohani</SelectItem>
                <SelectItem value='BAPTISAN'>Sakramen Baptisan Air</SelectItem>
                <SelectItem value='NATAL_PASKAH'>Perayaan Natal / Paskah</SelectItem>
                <SelectItem value='LAINNYA'>Acara Khusus / Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setBulkKategoriModalOpen(false)} disabled={isBulkUpdatingKategori}>
              Batal
            </Button>
            <Button
              onClick={handleBulkKategoriSubmit}
              disabled={isBulkUpdatingKategori}
              className='gap-1.5'
            >
              {isBulkUpdatingKategori ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
              {isBulkUpdatingKategori ? 'Memperbarui...' : `Simpan Kategori (${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: UBAH LOKASI EVENT MASSAL ────────────────────── */}
      <Dialog open={bulkLokasiModalOpen} onOpenChange={setBulkLokasiModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <MapPin className='size-5 text-primary' />
              Ubah Lokasi Pelaksanaan ({selectedCount} Event)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tetapkan lokasi atau ruangan baru untuk seluruh jadwal / event terpilih.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <Label className='text-xs font-semibold'>Lokasi / Ruangan Baru:</Label>
            <Input
              placeholder='Contoh: Main Sanctuary Lt. 2 / Ruang Chapel'
              value={bulkLokasiInput}
              onChange={(e) => setBulkLokasiInput(e.target.value)}
              className='text-xs'
              required
            />
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setBulkLokasiModalOpen(false)} disabled={isBulkUpdatingLokasi}>
              Batal
            </Button>
            <Button
              onClick={handleBulkLokasiSubmit}
              disabled={isBulkUpdatingLokasi || !bulkLokasiInput.trim()}
              className='gap-1.5'
            >
              {isBulkUpdatingLokasi ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
              {isBulkUpdatingLokasi ? 'Memperbarui...' : `Simpan Lokasi (${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4: HAPUS MASSAL JADWAL EVENT (SOFT DELETE) ─────── */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Pindahkan {selectedCount} Jadwal Event ke Kotak Sampah?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Jadwal event terpilih ({selectedCount} acara) akan diarsipkan ke kotak sampah (*soft delete*). Seluruh data riwayat presensi jemaat di dalamnya tetap terlindungi.
                </div>
                <div className='space-y-1 pt-1'>
                  <Label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan Massal (Wajib):</Label>
                  <Textarea
                    placeholder='Contoh: Penataan ulang kalender kegiatan semester 2026'
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
