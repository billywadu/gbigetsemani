'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Plus,
  Eye,
  Edit,
  Globe,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FilterX,
  Clock,
  Loader2,
  Trash2,
  Calendar,
  Layers,
  ExternalLink,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  User,
  Share2,
  RotateCcw,
  ShieldAlert,
  LayoutGrid,
  Table2,
  Search,
  Printer,
  Tag,
  Download,
  Check,
  CheckCircle2,
  X,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
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
  getArtikelListAction,
  getKategoriArtikelListAction,
  createKategoriArtikelAction,
  updateKategoriArtikelAction,
  deleteKategoriArtikelAction,
  deleteArtikelAction,
  restoreArtikelAction,
  hardDeleteArtikelAction,
  updateArtikelAction,
  bulkUpdateStatusArtikelAction,
  bulkUpdateKategoriArtikelAction,
  bulkSoftDeleteArtikelAction,
  getArtikelForPrintSheetsAction,
  ArtikelDTO,
  KategoriArtikelDTO,
} from '@/actions/artikel'
import { StatusArtikel } from '@/lib/validations/artikel'
import { toast } from 'sonner'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'

export default function ArtikelListPage() {
  const [loading, setLoading] = useState(true)
  const [artikelList, setArtikelList] = useState<ArtikelDTO[]>([])
  const [categories, setCategories] = useState<KategoriArtikelDTO[]>([])
  const [totalCount, setTotalCount] = useState(0)

  const [stats, setStats] = useState({
    totalArtikel: 0,
    totalPublished: 0,
    totalDraft: 0,
    totalViews: 0,
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [filterKategori, setFilterKategori] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Pagination
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  // View Mode: Table vs Card
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  // Column Visibility States
  const [visibleColumns, setVisibleColumns] = useState({
    thumbnail: true,
    judul: true,
    kategori: true,
    penulis: true,
    tanggal: true,
    status: true,
    views: true,
  })

  // Bulk Actions States
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false)
  const [selectedBulkStatus, setSelectedBulkStatus] = useState<StatusArtikel>('PUBLISHED')
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false)

  const [bulkKategoriModalOpen, setBulkKategoriModalOpen] = useState(false)
  const [selectedBulkKategori, setSelectedBulkKategori] = useState<string>('')
  const [isBulkUpdatingKategori, setIsBulkUpdatingKategori] = useState(false)

  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState('')
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const [printSyllabusModalOpen, setPrintSyllabusModalOpen] = useState(false)
  const [printSyllabusData, setPrintSyllabusData] = useState<ArtikelDTO[]>([])
  const [isLoadingPrintSyllabus, setIsLoadingPrintSyllabus] = useState(false)

  // Soft Delete, Restore & Hard Delete Article State
  const [deleteTarget, setDeleteTarget] = useState<ArtikelDTO | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreTarget, setRestoreTarget] = useState<ArtikelDTO | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [hardDeleteTarget, setHardDeleteTarget] = useState<ArtikelDTO | null>(null)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [isHardDeleting, setIsHardDeleting] = useState(false)

  // Category Manager Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<KategoriArtikelDTO | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [isCategoryActionLoading, setIsCategoryActionLoading] = useState(false)

  const loadCategories = useCallback(async () => {
    const res = await getKategoriArtikelListAction()
    if (res.success && res.data) {
      setCategories(res.data)
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getArtikelListAction({
      search: searchTerm,
      statusHapus: statusHapusFilter,
      kategoriId: filterKategori !== 'all' ? filterKategori : undefined,
      status: filterStatus !== 'all' ? (filterStatus as StatusArtikel) : undefined,
      page: pageIndex + 1,
      pageSize,
    })

    if (res.success && res.data) {
      setArtikelList(res.data.items)
      setTotalCount(res.data.total)
      if (res.data.stats) {
        setStats({
          totalArtikel: res.data.stats.totalArtikel || res.data.total,
          totalPublished: res.data.stats.totalPublished || 0,
          totalDraft: res.data.stats.totalDraft || 0,
          totalViews: res.data.stats.totalViews || 0,
        })
      }
    } else {
      toast.error(res.error || 'Gagal memuat daftar artikel.')
    }
    setLoading(false)
  }, [searchTerm, statusHapusFilter, filterKategori, filterStatus, pageIndex, pageSize])

  useEffect(() => {
    loadCategories()
    fetchData()
  }, [loadCategories, fetchData])

  // Sorting state
  const [sortField, setSortField] = useState<'judul' | 'penulis' | 'tanggal' | 'totalDilihat' | 'status' | null>('tanggal')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const sortedArtikelList = React.useMemo(() => {
    if (!sortField) return artikelList
    return [...artikelList].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''
      if (sortField === 'judul') {
        aVal = a.judul || ''
        bVal = b.judul || ''
      } else if (sortField === 'penulis') {
        aVal = a.penulis || ''
        bVal = b.penulis || ''
      } else if (sortField === 'status') {
        aVal = a.status || ''
        bVal = b.status || ''
      } else if (sortField === 'tanggal') {
        aVal = new Date(a.tanggal || a.createdAt || 0).getTime()
        bVal = new Date(b.tanggal || b.createdAt || 0).getTime()
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      } else if (sortField === 'totalDilihat') {
        aVal = a.totalDilihat || 0
        bVal = b.totalDilihat || 0
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [artikelList, sortField, sortOrder])

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id])
  const selectedCount = selectedIds.length
  const isAllPaginatedSelected = sortedArtikelList.length > 0 && sortedArtikelList.every((m) => selectedRows[m.id])
  const isAllSelected = isAllPaginatedSelected

  const selectedArtikelData = sortedArtikelList.filter((item) => selectedRows[item.id])

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    sortedArtikelList.forEach((item) => {
      updated[item.id] = checked
    })
    setSelectedRows(updated)
  }

  // 1. Export CSV Handler
  const handleExportCsv = () => {
    const targets = selectedCount > 0 ? selectedArtikelData : artikelList

    if (targets.length === 0) {
      toast.error('Tidak ada data artikel untuk diekspor.')
      return
    }

    const headers = [
      'Judul Artikel',
      'Kategori',
      'Penulis / Narasumber',
      'Tanggal Publikasi',
      'Status Publikasi',
      'Total Pembaca / Views',
      'Ringkasan',
      'Status Data',
      'Tanggal Dibuat',
    ]

    const rows = targets.map((item) => {
      const d = new Date(item.tanggal)
      return [
        `"${(item.judul || '').replace(/"/g, '""')}"`,
        `"${(item.kategoriNama || '').replace(/"/g, '""')}"`,
        `"${(item.penulis || '').replace(/"/g, '""')}"`,
        `"${!isNaN(d.getTime()) ? d.toLocaleDateString('id-ID') : '-'}"`,
        `"${item.status || 'DRAFT'}"`,
        `"${item.totalDilihat || 0}"`,
        `"${(item.ringkasan || '').replace(/"/g, '""')}"`,
        `"${item.deletedAt ? 'TERHAPUS (SOFT)' : 'AKTIF'}"`,
        `"${item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}"`,
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Katalog_Artikel_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${targets.length} artikel ke CSV.`)
  }

  // 2. Direct Print Syllabus Sheet
  const handleOpenPrintSyllabus = async () => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal satu artikel untuk dicetak.')
      return
    }
    const toastId = toast.loading('Menyiapkan katalog cetak...')
    setIsLoadingPrintSyllabus(true)
    const res = await getArtikelForPrintSheetsAction(selectedIds)
    setIsLoadingPrintSyllabus(false)
    toast.dismiss(toastId)

    if (!res.success || !res.data || res.data.length === 0) {
      toast.error(res.error || 'Gagal memuat data lembar artikel.')
      return
    }

    const printData = res.data
    const printConfig = await getEffectivePrintConfig()

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const totalPublished = printData.filter((d) => d.status === 'PUBLISHED').length
    const totalViews = printData.reduce((acc, curr) => acc + (curr.totalDilihat || 0), 0)
    const uniqueCategories = Array.from(new Set(printData.map((d) => d.kategoriNama))).length

    const rowsHtml = printData.map((art, idx) => {
      const d = new Date(art.tanggal)
      const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID') : '-'

      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700; color: #0f172a;">${art.judul}</td>
          <td style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${art.kategoriNama}</td>
          <td style="font-weight: 600;">${art.penulis}</td>
          <td style="text-align: center;">${dateStr}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700;">${art.totalDilihat.toLocaleString('id-ID')} views</td>
          <td style="text-align: center; font-size: 9px; font-weight: 700;">
            <span style="border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; background: ${art.status === 'PUBLISHED' ? '#f0fdf4' : '#fefce8'}; color: ${art.status === 'PUBLISHED' ? '#166534' : '#854d0e'};">
              ${art.status}
            </span>
          </td>
        </tr>
      `
    }).join('')

    const kopHtml = buildKopHtml(printConfig, {
      badgeText: 'DIVISI PUBLIKASI & MEDIA',
      dateText: `Terbit: ${new Date().toLocaleDateString('id-ID')}`,
    })

    const signaturesHtml = buildSignaturesHtml(printConfig, [
      { roleKey: 'ketuaPendidikan', customTitle: 'Kepala Divisi Publikasi & Media' },
      { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
    ])

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Katalog Artikel & Publikasi (${printData.length} Artikel) - ${printConfig.kop.namaGereja}</title>
        <style>
          @page {
            size: ${printConfig.options.ukuranKertasDefault || 'A4'} portrait;
            margin: 12mm;
          }
          * { box-sizing: border-box; margin: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            padding: 4px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
          .stat-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; text-align: center; }
          .stat-lbl { font-size: 9px; color: #64748b; font-weight: 600; }
          .stat-val { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          .art-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px; }
          .art-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 800; text-align: left; }
          .art-table td { border: 1px solid #e2e8f0; padding: 6px 8px; color: #1e293b; }
        </style>
      </head>
      <body>
        ${kopHtml}
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-lbl">Total Artikel</div><div class="stat-val">${printData.length} Judul</div></div>
          <div class="stat-card"><div class="stat-lbl">Terpublikasi</div><div class="stat-val" style="color: #16a34a;">${totalPublished} Artikel</div></div>
          <div class="stat-card"><div class="stat-lbl">Akumulasi Pembaca</div><div class="stat-val">${totalViews.toLocaleString('id-ID')} views</div></div>
          <div class="stat-card"><div class="stat-lbl">Kategori Terpilih</div><div class="stat-val">${uniqueCategories} Kategori</div></div>
        </div>
        <table class="art-table">
          <thead>
            <tr>
              <th style="width: 25px;">No</th>
              <th>Judul Artikel</th>
              <th style="width: 100px;">Kategori</th>
              <th style="width: 100px;">Penulis</th>
              <th style="width: 80px; text-align: center;">Tgl Rilis</th>
              <th style="width: 80px; text-align: right;">Views</th>
              <th style="width: 75px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${signaturesHtml}
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(fullHtml)
    printWindow.document.close()
    setTimeout(() => { printWindow.print() }, 300)
  }

  // 3. Bulk Update Status Submit
  const handleBulkStatusSubmit = async () => {
    if (selectedIds.length === 0) return
    setIsBulkUpdatingStatus(true)
    const res = await bulkUpdateStatusArtikelAction({
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
      toast.error(res.error || 'Gagal memperbarui status artikel.')
    }
  }

  // 4. Bulk Update Kategori Submit
  const handleBulkKategoriSubmit = async () => {
    if (selectedIds.length === 0) return
    if (!selectedBulkKategori) {
      toast.error('Pilih kategori tujuan terlebih dahulu.')
      return
    }
    setIsBulkUpdatingKategori(true)
    const res = await bulkUpdateKategoriArtikelAction({
      ids: selectedIds,
      kategoriId: selectedBulkKategori,
    })
    setIsBulkUpdatingKategori(false)
    if (res.success) {
      toast.success(res.message)
      setBulkKategoriModalOpen(false)
      setSelectedRows({})
      fetchData()
      loadCategories()
    } else {
      toast.error(res.error || 'Gagal memperbarui kategori artikel.')
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
    const res = await bulkSoftDeleteArtikelAction({
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
      loadCategories()
    } else {
      toast.error(res.error || 'Gagal menghapus artikel.')
    }
  }

  const handleToggleStatus = async (art: ArtikelDTO) => {
    const newStatus: StatusArtikel = art.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    const formData = new FormData()
    formData.append('id', art.id)
    formData.append('status', newStatus)

    const res = await updateArtikelAction(formData)
    if (res.success) {
      toast.success(
        newStatus === 'PUBLISHED'
          ? `Artikel "${art.judul}" telah dipublikasikan!`
          : `Artikel "${art.judul}" dialihkan menjadi DRAFT.`
      )
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui status artikel.')
    }
  }

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return
    if (!deleteReason.trim()) {
      toast.error('Alasan penghapusan artikel wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deleteArtikelAction({
      id: deleteTarget.id,
      reason: deleteReason.trim(),
    })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Artikel berhasil dipindahkan ke sampah.')
      setDeleteTarget(null)
      setDeleteReason('')
      fetchData()
      loadCategories()
    } else {
      toast.error(res.error || 'Gagal menghapus artikel.')
    }
  }

  const handleCopyShareLink = (slug: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/artikel/${slug}`
      navigator.clipboard.writeText(url)
      toast.success('Tautan artikel publik berhasil disalin ke clipboard!')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    const res = await restoreArtikelAction({ id: restoreTarget.id })
    setIsRestoring(false)

    if (res.success) {
      toast.success(res.message || 'Artikel berhasil dipulihkan!')
      setRestoreTarget(null)
      fetchData()
      loadCategories()
    } else {
      toast.error(res.error || 'Gagal memulihkan artikel.')
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return
    setIsHardDeleting(true)
    const res = await hardDeleteArtikelAction({
      id: hardDeleteTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Artikel berhasil dihapus permanen!')
      setHardDeleteTarget(null)
      fetchData()
      loadCategories()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen artikel.')
    }
  }

  const renderColumnHeader = (
    title: string,
    columnKey: keyof typeof visibleColumns,
    field?: 'judul' | 'penulis' | 'tanggal' | 'totalDilihat' | 'status'
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
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
            Artikel & Publikasi
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Kelola warta, renungan firman, berita jemaat, dan materi publikasi gereja.
          </p>
        </div>
        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setCategoryModalOpen(true)}
            className='h-9 sm:h-8 gap-1.5 text-xs'
          >
            <Tag className='size-3.5 text-primary' /> Kelola Kategori
          </Button>
          <Button size='sm' asChild className='h-9 sm:h-8 gap-1.5 text-xs shadow-xs'>
            <Link href='/dashboard/artikel/baru'>
              <Plus className='size-3.5' /> Tulis Artikel
            </Link>
          </Button>
        </div>
      </div>
      {/* KPI Stats Swiper / Grid */}
      <div className='w-full overflow-hidden'>
        <Swiper
          modules={[Pagination]}
          spaceBetween={12}
          slidesPerView={1}
          pagination={{ clickable: true }}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 16 },
            1024: { slidesPerView: 4, spaceBetween: 16 },
          }}
          className='kpi-swiper pb-7! sm:pb-0!'
        >
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs bg-card h-full border border-border/70'>
              <CardHeader className='pb-1 pt-3 px-3.5'>
                <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>
                  TOTAL ARTIKEL
                </CardTitle>
              </CardHeader>
              <CardContent className='pb-3 pt-0 px-3.5'>
                <div className='text-2xl font-bold font-mono text-primary flex items-center gap-2'>
                  <BookOpen className='size-5' /> {stats.totalArtikel} Judul
                </div>
                <div className='text-muted-foreground text-[11px] mt-0.5'>
                  Seluruh repositori publikasi
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs bg-card h-full border border-border/70'>
              <CardHeader className='pb-1 pt-3 px-3.5'>
                <CardTitle className='text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase'>
                  TERPUBLIKASI (PUBLISHED)
                </CardTitle>
              </CardHeader>
              <CardContent className='pb-3 pt-0 px-3.5'>
                <div className='text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
                  <Globe className='size-5' /> {stats.totalPublished} Artikel
                </div>
                <div className='text-muted-foreground text-[11px] mt-0.5'>
                  Tayang di portal publik
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs bg-card h-full border border-border/70'>
              <CardHeader className='pb-1 pt-3 px-3.5'>
                <CardTitle className='text-xs font-medium text-amber-600 dark:text-amber-400 uppercase'>
                  DRAF DISIAPKAN (DRAFT)
                </CardTitle>
              </CardHeader>
              <CardContent className='pb-3 pt-0 px-3.5'>
                <div className='text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 flex items-center gap-2'>
                  <Clock className='size-5' /> {stats.totalDraft} Draf
                </div>
                <div className='text-muted-foreground text-[11px] mt-0.5'>
                  Menunggu rilis
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs bg-card h-full border border-border/70'>
              <CardHeader className='pb-1 pt-3 px-3.5'>
                <CardTitle className='text-xs font-medium text-blue-600 dark:text-blue-400 uppercase'>
                  TOTAL PEMBACA (VIEWS)
                </CardTitle>
              </CardHeader>
              <CardContent className='pb-3 pt-0 px-3.5'>
                <div className='text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 flex items-center gap-2'>
                  <Eye className='size-5' /> {stats.totalViews.toLocaleString('id-ID')} Kali
                </div>
                <div className='text-muted-foreground text-[11px] mt-0.5'>
                  Akumulasi pembaca publik
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>
        </Swiper>
      </div>

      {/* Toolbar Filter Section */}
      <div className='flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1 sm:max-w-4xl'>
          <div className='relative w-full sm:w-72 md:w-80'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
            <Input
              placeholder='Cari judul artikel, penulis...'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPageIndex(0)
              }}
              className='h-8 ps-8 pe-3 text-xs w-full'
            />
          </div>

          <div className='grid grid-cols-2 xs:grid-cols-3 sm:flex sm:items-center gap-1.5 w-full sm:w-auto'>
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

            <Select
              value={filterKategori}
              onValueChange={(val) => {
                setFilterKategori(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 w-full sm:w-36 text-xs'>
                <SelectValue placeholder='Kategori' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs'>Semua Kategori</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className='text-xs'>
                    {c.nama} ({c.totalArtikel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(val) => {
                setFilterStatus(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 w-full sm:w-32 text-xs'>
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs'>Semua Status</SelectItem>
                <SelectItem value='PUBLISHED' className='text-xs'>PUBLISHED</SelectItem>
                <SelectItem value='DRAFT' className='text-xs'>DRAFT</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || filterKategori !== 'all' || filterStatus !== 'all' || statusHapusFilter !== 'ACTIVE') && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSearchTerm('')
                  setFilterKategori('all')
                  setFilterStatus('all')
                  setStatusHapusFilter('ACTIVE')
                  setPageIndex(0)
                }}
                className='h-8 px-2 text-xs gap-1 text-muted-foreground'
              >
                Reset <FilterX className='size-3' />
              </Button>
            )}
          </div>
        </div>

        {/* View Switcher & Column Toggle */}
        <div className='flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0'>
          {/* View Switcher */}
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
                {(['thumbnail', 'judul', 'kategori', 'penulis', 'tanggal', 'status', 'views'] as const).map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col}
                    checked={visibleColumns[col]}
                    onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, [col]: !!c }))}
                  >
                    {col === 'thumbnail' ? 'Thumbnail' : col === 'judul' ? 'Judul' : col === 'kategori' ? 'Kategori' : col === 'penulis' ? 'Penulis' : col === 'tanggal' ? 'Tanggal' : col === 'status' ? 'Status' : 'Dilihat'}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Content Area: Table View or Card View */}
      {viewMode === 'table' ? (
        <div className='rounded-md border overflow-hidden bg-card'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='hover:bg-transparent border-b'>
                  <TableHead className='w-10 px-3'>
                    <Checkbox checked={isAllSelected} onCheckedChange={(c) => handleSelectAll(!!c)} />
                  </TableHead>
                  {visibleColumns.thumbnail && <TableHead className='w-15 px-2 font-semibold text-xs text-center'>Cover</TableHead>}
                  {visibleColumns.judul && <TableHead className='px-3'>{renderColumnHeader('Judul Artikel', 'judul', 'judul')}</TableHead>}
                  {visibleColumns.kategori && <TableHead className='px-3'>{renderColumnHeader('Kategori', 'kategori')}</TableHead>}
                  {visibleColumns.penulis && <TableHead className='px-3'>{renderColumnHeader('Penulis', 'penulis', 'penulis')}</TableHead>}
                  {visibleColumns.tanggal && <TableHead className='px-3'>{renderColumnHeader('Tanggal', 'tanggal', 'tanggal')}</TableHead>}
                  {visibleColumns.status && <TableHead className='px-3 text-center'>{renderColumnHeader('Status', 'status', 'status')}</TableHead>}
                  {visibleColumns.views && <TableHead className='px-3 text-end'>{renderColumnHeader('Dilihat', 'views', 'totalDilihat')}</TableHead>}
                  <TableHead className='w-14 px-2 text-center font-semibold text-xs'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className='h-32 text-center text-muted-foreground text-sm'>
                      <div className='flex items-center justify-center gap-2'>
                        <Loader2 className='size-4 animate-spin text-primary' /> Memuat daftar artikel...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedArtikelList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className='h-32 text-center text-muted-foreground text-sm'>
                      <div className='space-y-2'>
                        <div className='font-medium text-foreground'>Belum ada artikel yang sesuai filter.</div>
                        <p className='text-xs text-muted-foreground'>Mulai menulis artikel baru untuk memberkati jemaat.</p>
                        <Button asChild size='sm'>
                          <Link href='/dashboard/artikel/baru'>
                            <Plus className='size-4 me-1' /> Tulis Artikel
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedArtikelList.map((art) => {
                    const isSelected = !!selectedRows[art.id]
                    const isDeleted = !!art.deletedAt
                    const docDate = new Date(art.tanggal)
                    return (
                      <TableRow
                        key={art.id}
                        className={`transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'} ${isSelected ? 'bg-muted/50' : ''}`}
                      >
                        <TableCell className='px-3 py-2.5'>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => setSelectedRows((p) => ({ ...p, [art.id]: !!c }))}
                          />
                        </TableCell>
                        {visibleColumns.thumbnail && (
                          <TableCell className='px-2 py-2.5 text-center'>
                            {art.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={art.thumbnailUrl}
                                alt={art.judul}
                                className='size-10 object-cover rounded-md border mx-auto'
                              />
                            ) : (
                              <div className='size-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground mx-auto'>
                                <BookOpen className='size-4 opacity-60' />
                              </div>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.judul && (
                          <TableCell className='px-3 py-2.5 max-w-xs sm:max-w-sm'>
                            <div className='flex items-center gap-1.5' title={art.ringkasan || art.judul}>
                              <Link
                                href={`/dashboard/artikel/${art.id}/edit`}
                                className='font-semibold text-xs text-foreground hover:underline hover:text-primary truncate block'
                              >
                                {art.judul}
                              </Link>
                              {art.status === 'PUBLISHED' && !isDeleted && (
                                <Link
                                  href={`/artikel/${art.slug}`}
                                  target='_blank'
                                  className='text-muted-foreground hover:text-primary shrink-0'
                                  title='Buka halaman publik'
                                >
                                  <ExternalLink className='size-3' />
                                </Link>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.kategori && (
                          <TableCell className='px-3 py-2.5'>
                            <Badge variant='secondary' className='text-[10px] font-normal'>
                              {art.kategoriNama || 'Umum'}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.penulis && (
                          <TableCell className='px-3 py-2.5 text-xs text-muted-foreground'>
                            {art.penulis || '-'}
                          </TableCell>
                        )}
                        {visibleColumns.tanggal && (
                          <TableCell className='px-3 py-2.5 text-xs text-muted-foreground font-mono'>
                            {docDate.toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </TableCell>
                        )}
                        {visibleColumns.status && (
                          <TableCell className='px-3 py-2.5 text-center'>
                            {isDeleted ? (
                              <Badge variant='destructive' className='text-[10px] font-normal'>
                                TERHAPUS
                              </Badge>
                            ) : art.status === 'PUBLISHED' ? (
                              <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30 text-[10px] font-normal gap-1'>
                                <Globe className='size-3' /> PUBLISHED
                              </Badge>
                            ) : (
                              <Badge variant='outline' className='text-muted-foreground text-[10px] font-normal'>
                                DRAFT
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.views && (
                          <TableCell className='px-3 py-2.5 text-end text-xs font-mono font-medium'>
                            {art.totalDilihat.toLocaleString('id-ID')}
                          </TableCell>
                        )}
                        <TableCell className='px-2 py-2.5 text-center'>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='size-7 text-muted-foreground hover:text-foreground mx-auto'
                              >
                                <MoreHorizontal className='size-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-48'>
                              <DropdownMenuLabel className='text-xs'>Aksi Artikel</DropdownMenuLabel>
                              {!isDeleted && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/artikel/${art.id}/edit`}>
                                    <Edit className='size-3.5 me-2 text-muted-foreground' /> Edit Konten
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {art.status === 'PUBLISHED' && !isDeleted && (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/artikel/${art.slug}`} target='_blank'>
                                      <ExternalLink className='size-3.5 me-2 text-emerald-600' /> Buka Portal Publik
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopyShareLink(art.slug)}>
                                    <Share2 className='size-3.5 me-2 text-sky-600' /> Salin Link Publik
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!isDeleted && (
                                <DropdownMenuItem onClick={() => handleToggleStatus(art)}>
                                  {art.status === 'PUBLISHED' ? (
                                    <>
                                      <EyeOff className='size-3.5 me-2 text-amber-600' /> Jadikan DRAFT
                                    </>
                                  ) : (
                                    <>
                                      <Globe className='size-3.5 me-2 text-emerald-600' /> Publikasikan
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {isDeleted ? (
                                <>
                                  <DropdownMenuItem
                                    className='text-emerald-600 dark:text-emerald-400 text-xs'
                                    onClick={() => setRestoreTarget(art)}
                                  >
                                    <RotateCcw className='size-3.5 me-2' /> Pulihkan Artikel
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className='text-rose-600 dark:text-rose-400 text-xs'
                                    onClick={() => setHardDeleteTarget(art)}
                                  >
                                    <ShieldAlert className='size-3.5 me-2' /> Hapus Permanen
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                  onClick={() => {
                                    setDeleteTarget(art)
                                    setDeleteReason('')
                                  }}
                                >
                                  <Trash2 className='size-3.5 me-2' /> Soft Delete Artikel
                                </DropdownMenuItem>
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

          {/* Pagination Footer */}
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
              <Loader2 className='size-5 animate-spin text-primary' /> Memuat daftar artikel...
            </div>
          ) : artikelList.length === 0 ? (
            <div className='rounded-lg border bg-card p-12 text-center text-muted-foreground space-y-3'>
              <div className='font-medium text-foreground text-sm'>Belum ada artikel yang sesuai filter.</div>
              <p className='text-xs text-muted-foreground'>Mulai menulis artikel baru untuk memberkati jemaat.</p>
              <Button asChild size='sm'>
                <Link href='/dashboard/artikel/baru'>
                  <Plus className='size-4 me-1' /> Tulis Artikel
                </Link>
              </Button>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
              {sortedArtikelList.map((art) => {
                const isSelected = !!selectedRows[art.id]
                const isDeleted = !!art.deletedAt
                const docDate = new Date(art.tanggal)

                return (
                  <Card
                    key={art.id}
                    className={`group overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between border ${
                      isDeleted
                        ? 'bg-rose-500/5 border-rose-200 dark:border-rose-900/50'
                        : 'bg-card hover:border-primary/40'
                    } ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
                  >
                    <div>
                      <div className='relative aspect-video w-full bg-muted overflow-hidden border-b'>
                        {art.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={art.thumbnailUrl}
                            alt={art.judul}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                          />
                        ) : (
                          <div className='w-full h-full bg-linear-to-br from-primary/10 via-muted to-muted flex items-center justify-center text-muted-foreground/50'>
                            <BookOpen className='size-10' />
                          </div>
                        )}

                        <div className='absolute top-2.5 left-2.5 z-10'>
                          <label className='cursor-pointer flex items-center justify-center size-6 rounded-md bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 transition-all shadow-xs'>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(c) => setSelectedRows((p) => ({ ...p, [art.id]: !!c }))}
                              className='size-3.5 border-white/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary text-primary-foreground'
                            />
                          </label>
                        </div>

                        <div className='absolute top-2.5 right-2.5 z-10'>
                          {isDeleted ? (
                            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-rose-600/90 text-white backdrop-blur-md border border-rose-400/30 shadow-xs'>
                              <Trash2 className='size-2.5' /> TERHAPUS
                            </span>
                          ) : art.status === 'PUBLISHED' ? (
                            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-emerald-600/90 text-white backdrop-blur-md border border-emerald-400/30 shadow-xs'>
                              <Globe className='size-2.5' /> PUBLISHED
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-amber-600/90 text-white backdrop-blur-md border border-amber-400/30 shadow-xs'>
                              <Clock className='size-2.5' /> DRAFT
                            </span>
                          )}
                        </div>

                        <div className='absolute bottom-2.5 right-2.5 z-10 bg-black/65 backdrop-blur-md text-white/90 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium flex items-center gap-1 border border-white/15 shadow-xs'>
                          <Eye className='size-3 text-white/70' />
                          {art.totalDilihat.toLocaleString('id-ID')}
                        </div>
                      </div>

                      <CardContent className='p-4 space-y-2.5'>
                        <div className='flex items-center justify-between gap-2 text-xs'>
                          <Badge variant='secondary' className='font-semibold text-primary text-[10px] px-2 py-0.5 rounded-md truncate max-w-36'>
                            {art.kategoriNama || 'Umum'}
                          </Badge>
                          <span className='font-mono text-[11px] text-muted-foreground flex items-center gap-1 shrink-0'>
                            <Calendar className='size-3 text-muted-foreground/70' />
                            {docDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <Link
                          href={`/dashboard/artikel/${art.id}/edit`}
                          className='font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 block leading-snug min-h-10'
                        >
                          {art.judul}
                        </Link>

                        <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-8'>
                          {art.ringkasan || 'Tidak ada ringkasan artikel.'}
                        </p>

                        <div className='flex items-center gap-1.5 pt-2 text-xs text-muted-foreground border-t mt-2'>
                          <User className='size-3.5 text-primary/70 shrink-0' />
                          <span className='truncate font-medium text-foreground text-[11px]'>
                            {art.penulis || 'Penulis'}
                          </span>
                        </div>
                      </CardContent>
                    </div>

                    <div className='px-3.5 py-2.5 bg-muted/20 border-t flex items-center justify-between gap-2'>
                      <div className='flex items-center gap-1'>
                        {art.status === 'PUBLISHED' && !isDeleted ? (
                          <>
                            <Button
                              asChild
                              variant='outline'
                              size='icon'
                              className='size-7 text-muted-foreground hover:text-foreground'
                              title='Buka Halaman Publik'
                            >
                              <Link href={`/artikel/${art.slug}`} target='_blank'>
                                <ExternalLink className='size-3.5' />
                              </Link>
                            </Button>
                            <Button
                              variant='outline'
                              size='icon'
                              className='size-7 text-muted-foreground hover:text-foreground'
                              onClick={() => handleCopyShareLink(art.slug)}
                              title='Bagikan Link WhatsApp'
                            >
                              <Share2 className='size-3.5' />
                            </Button>
                          </>
                        ) : (
                          <span className='text-[10px] text-muted-foreground font-mono px-1'>
                            {isDeleted ? 'Arsip' : 'Draf'}
                          </span>
                        )}
                      </div>

                      <div className='flex items-center gap-1.5'>
                        {!isDeleted ? (
                          <>
                            <Button asChild variant='outline' size='sm' className='h-7 text-xs px-2.5 gap-1 font-medium'>
                              <Link href={`/dashboard/artikel/${art.id}/edit`}>
                                <Edit className='size-3 text-muted-foreground' /> Edit
                              </Link>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon' className='size-7 text-muted-foreground hover:text-foreground'>
                                  <MoreHorizontal className='size-3.5' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end' className='w-48'>
                                <DropdownMenuLabel className='text-xs'>Pilihan Artikel</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/artikel/${art.id}/edit`}>
                                    <Edit className='size-3.5 me-2 text-muted-foreground' /> Edit Konten
                                  </Link>
                                </DropdownMenuItem>
                                {art.status === 'PUBLISHED' && (
                                  <>
                                    <DropdownMenuItem asChild>
                                      <Link href={`/artikel/${art.slug}`} target='_blank'>
                                        <ExternalLink className='size-3.5 me-2 text-muted-foreground' /> Portal Publik
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCopyShareLink(art.slug)}>
                                      <Share2 className='size-3.5 me-2 text-sky-600' /> Salin Link Share
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(art)}
                                  className='text-xs'
                                >
                                  {art.status === 'PUBLISHED' ? (
                                    <>
                                      <EyeOff className='size-3.5 me-2 text-amber-600' /> Jadikan Draf
                                    </>
                                  ) : (
                                    <>
                                      <Globe className='size-3.5 me-2 text-emerald-600' /> Publikasikan
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDeleteTarget(art)
                                    setDeleteReason('')
                                  }}
                                  className='text-xs text-destructive focus:text-destructive'
                                >
                                  <Trash2 className='size-3.5 me-2' /> Hapus (Pindah ke Bin)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        ) : (
                          <div className='flex items-center gap-1'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setRestoreTarget(art)}
                              className='h-7 text-xs px-2 text-emerald-600 border-emerald-300 dark:border-emerald-800'
                              title='Pulihkan Artikel'
                            >
                              <RotateCcw className='size-3 me-1' /> Pulihkan
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setHardDeleteTarget(art)}
                              className='h-7 text-xs px-2 text-rose-600 border-rose-300 dark:border-rose-800'
                              title='Hapus Permanen'
                            >
                              <ShieldAlert className='size-3' />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── FLOATING BOTTOM BATCH BAR ── */}
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
              onClick={handleOpenPrintSyllabus}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10 rounded-full whitespace-nowrap'
              title='Cetak Silabus & Katalog Artikel A4'
            >
              <Printer className='size-3.5' />
              <span>Cetak Silabus</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setSelectedBulkStatus('PUBLISHED')
                setBulkStatusModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ubah Status Publikasi Artikel Terpilih'
            >
              <Globe className='size-3.5' />
              <span>Publikasikan</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                if (categories.length > 0) setSelectedBulkKategori(categories[0].id)
                setBulkKategoriModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ubah Kategori Artikel Terpilih'
            >
              <Tag className='size-3.5' />
              <span>Ubah Kategori</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleExportCsv}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ekspor data artikel terpilih ke CSV / Excel'
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
              title='Hapus artikel terpilih (soft delete)'
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

      {/* ── MODAL: UBAH STATUS PUBLIKASI MASSAL ───────────────── */}
      <Dialog open={bulkStatusModalOpen} onOpenChange={setBulkStatusModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Globe className='size-5 text-primary' />
              Status Publikasi ({selectedCount} Artikel)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tetapkan status penayangan baru untuk seluruh artikel terpilih.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <Label className='text-xs font-semibold'>Pilih Status Publikasi:</Label>
            <Select value={selectedBulkStatus} onValueChange={(val: any) => setSelectedBulkStatus(val)}>
              <SelectTrigger className='text-xs'>
                <SelectValue placeholder='Pilih Status Publikasi...' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='PUBLISHED'>PUBLISHED (Tayang di Portal & App Jemaat)</SelectItem>
                <SelectItem value='DRAFT'>DRAFT (Tarik dari Penayangan / Konsep)</SelectItem>
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

      {/* ── MODAL: UBAH KATEGORI ARTIKEL MASSAL ────────────────── */}
      <Dialog open={bulkKategoriModalOpen} onOpenChange={setBulkKategoriModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Tag className='size-5 text-primary' />
              Ubah Kategori ({selectedCount} Artikel)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Pindahkan seluruh artikel terpilih ke kelompok kategori baru.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <Label className='text-xs font-semibold'>Pilih Kategori Baru:</Label>
            <Select value={selectedBulkKategori} onValueChange={setSelectedBulkKategori}>
              <SelectTrigger className='text-xs'>
                <SelectValue placeholder='Pilih Kategori...' />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nama} ({cat.totalArtikel} artikel)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setBulkKategoriModalOpen(false)} disabled={isBulkUpdatingKategori}>
              Batal
            </Button>
            <Button
              onClick={handleBulkKategoriSubmit}
              disabled={isBulkUpdatingKategori || !selectedBulkKategori}
              className='gap-1.5'
            >
              {isBulkUpdatingKategori ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
              {isBulkUpdatingKategori ? 'Memperbarui...' : `Simpan Kategori (${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: HAPUS MASSAL ARTIKEL (SOFT DELETE) ──────────── */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Pindahkan {selectedCount} Artikel ke Kotak Sampah?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Artikel terpilih ({selectedCount} judul) akan diarsipkan ke kotak sampah (*soft delete*). Konten dan gambar cover tetap aman dan dapat dipulihkan sewaktu-waktu.
                </div>
                <div className='space-y-1 pt-1'>
                  <Label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan Massal (Wajib):</Label>
                  <Textarea
                    placeholder='Contoh: Pembersihan artikel ganda / draft lama'
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

      {/* ── AlertDialog Konfirmasi Soft Delete ─────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeleteReason('') }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Hapus Artikel?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Artikel <strong className='text-foreground'>{deleteTarget?.judul}</strong> akan dinonaktifkan via Soft Delete.
                </span>
                <span className='block text-xs text-muted-foreground'>
                  Artikel dapat dipulihkan kembali sewaktu-waktu dan cover thumbnail tetap aman tersimpan.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <Label className='text-xs font-semibold'>Alasan Penghapusan (Wajib):</Label>
            <Textarea
              placeholder='Contoh: Artikel keliru atau digantikan dengan edisi revisi'
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

      {/* ── AlertDialog Restore Artikel Confirm ────────────────── */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Artikel?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Artikel <strong className='text-foreground'>{restoreTarget?.judul}</strong> akan dipulihkan ke daftar aktif.
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
              Ya, Pulihkan Artikel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Hard Delete Artikel Confirm ────────────── */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5 text-rose-600' /> Hapus Permanen Artikel?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs'>
                  ⚠️ <strong>PERINGATAN</strong>: Artikel <strong className='text-foreground'>{hardDeleteTarget?.judul}</strong> beserta gambar cover akan dihapus secara PERMANEN dari database.
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
    </div>
  )
}
