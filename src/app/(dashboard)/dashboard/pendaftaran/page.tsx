'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Check,
  X,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  FilterX,
  Loader2,
  ShieldCheck,
  UserCheck,
  UserX,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Trash2,
  RotateCcw,
  ShieldAlert,
  MessageSquare,
  Download,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Users,
  FileText,
  FileCheck,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Card, CardContent } from '@/components/ui/card'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getPendaftaranQueueAction,
  approvePendaftaranAction,
  rejectPendaftaranAction,
  deletePendaftaranAction,
  restorePendaftaranAction,
  hardDeletePendaftaranAction,
  bulkApprovePendaftaranAction,
  bulkRejectPendaftaranAction,
  bulkSoftDeletePendaftaranAction,
} from '@/actions/pendaftaran'
import { getWhatsAppTemplatesAction } from '@/actions/whatsapp-template'
import {
  DEFAULT_WHATSAPP_TEMPLATES_CONFIG,
  WhatsAppTemplatesConfig,
} from '@/lib/validations/whatsapp-template'
import { formatWhatsAppMessage } from '@/lib/whatsapp-helpers'
import { getAppProfileAction } from '@/actions/app-profile'
import { StatusPendaftaran } from '@/lib/validations/pendaftaran'
import { toast } from 'sonner'

export default function PendaftaranQueuePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    totalPendaftaran: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  })

  // Dynamic WhatsApp Templates from Settings
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplatesConfig>(DEFAULT_WHATSAPP_TEMPLATES_CONFIG)

  // Filters (Default: PENDING for Inbox Zero Workflow)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [filterStatus, setFilterStatus] = useState<string>('PENDING')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  const [churchName, setChurchName] = useState('Gereja')

  // Load WhatsApp Templates on Mount
  useEffect(() => {
    getWhatsAppTemplatesAction().then((res) => {
      if (res.success && res.data) {
        setWaTemplates(res.data)
      }
    })
    getAppProfileAction().then((res) => {
      if (res.success && res.data) {
        setChurchName(res.data.namaSingkat || res.data.namaResmi || 'Gereja')
      }
    })
  }, [])

  // Pagination
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({
    createdAt: true,
    nama: true,
    kontak: true,
    jenisKelamin: true,
    statusPernikahan: true,
    status: true,
  })

  // Detail Modal
  const [detailTarget, setDetailTarget] = useState<any | null>(null)

  // Additional Family Members Memo
  const additionalFamilyMembers = React.useMemo(() => {
    if (!detailTarget?.anggotaKeluargaJson) return []
    try {
      const parsed =
        typeof detailTarget.anggotaKeluargaJson === 'string'
          ? JSON.parse(detailTarget.anggotaKeluargaJson)
          : detailTarget.anggotaKeluargaJson
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [detailTarget])

  // Approve Modal
  const [approveTarget, setApproveTarget] = useState<any | null>(null)
  const [isApproving, setIsApproving] = useState(false)

  // Reject Modal
  const [rejectTarget, setRejectTarget] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  // Soft Delete, Restore & Hard Delete States
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [hardDeleteTarget, setHardDeleteTarget] = useState<any | null>(null)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [isHardDeleting, setIsHardDeleting] = useState(false)

  // Bulk Actions States
  const [bulkApproveModalOpen, setBulkApproveModalOpen] = useState(false)
  const [isBulkApproving, setIsBulkApproving] = useState(false)

  const [bulkRejectModalOpen, setBulkRejectModalOpen] = useState(false)
  const [bulkRejectReason, setBulkRejectReason] = useState('')
  const [isBulkRejecting, setIsBulkRejecting] = useState(false)

  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState('')
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [copiedContacts, setCopiedContacts] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getPendaftaranQueueAction({
      search: searchTerm,
      statusHapus: statusHapusFilter,
      status: filterStatus !== 'all' ? (filterStatus as StatusPendaftaran) : undefined,
      page: pageIndex + 1,
      pageSize,
    })

    if (res.success && res.data) {
      setQueue(res.data.items)
      setTotalCount(res.data.total)
      setStats(res.data.stats)
    } else {
      toast.error(res.error || 'Gagal memuat antrean pendaftaran.')
    }
    setLoading(false)
  }, [searchTerm, statusHapusFilter, filterStatus, pageIndex, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Sorting state
  const [sortField, setSortField] = useState<'createdAt' | 'nama' | 'kontak' | 'jenisKelamin' | 'statusPernikahan' | 'status' | null>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const sortedQueue = React.useMemo(() => {
    if (!sortField) return queue
    return [...queue].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''
      if (sortField === 'nama') {
        aVal = a.nama || ''
        bVal = b.nama || ''
      } else if (sortField === 'kontak') {
        aVal = a.noHp || a.telepon || ''
        bVal = b.noHp || b.telepon || ''
      } else if (sortField === 'jenisKelamin') {
        aVal = a.jenisKelamin || ''
        bVal = b.jenisKelamin || ''
      } else if (sortField === 'statusPernikahan') {
        aVal = a.statusPernikahan || ''
        bVal = b.statusPernikahan || ''
      } else if (sortField === 'status') {
        aVal = a.status || ''
        bVal = b.status || ''
      } else if (sortField === 'createdAt') {
        aVal = new Date(a.createdAt || 0).getTime()
        bVal = new Date(b.createdAt || 0).getTime()
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [queue, sortField, sortOrder])

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id])
  const selectedCount = selectedIds.length
  const isAllSelected = sortedQueue.length > 0 && sortedQueue.every((item) => selectedRows[item.id])

  const selectedItemsData = sortedQueue.filter((item) => selectedRows[item.id])
  const pendingSelectedItems = selectedItemsData.filter((item) => item.status === 'PENDING')
  const validPhoneContacts = selectedItemsData
    .map((item) => ({
      nama: item.nama,
      noHp: (item.noHp || item.whatsApp || '').replace(/[^0-9]/g, ''),
      email: item.email,
      status: item.status,
    }))
    .filter((c) => c.noHp.length >= 8)

  const formatWhatsAppUrl = (phone?: string | null, message?: string) => {
    if (!phone) return ''
    let cleaned = phone.replace(/[^0-9]/g, '')
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1)
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned
    }
    const textQuery = message ? `?text=${encodeURIComponent(message)}` : ''
    return `https://wa.me/${cleaned}${textQuery}`
  }

  const getWhatsAppTemplate = (item: any, type: 'APPROVE' | 'PENDING' | 'REJECT') => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    if (type === 'APPROVE') {
      const template = waTemplates.PENDAFTARAN_DISETUJUI || DEFAULT_WHATSAPP_TEMPLATES_CONFIG.PENDAFTARAN_DISETUJUI || ''
      return formatWhatsAppMessage(template, {
        nama: item.nama || 'Bapak/Ibu/Saudara/i',
        nij: item.nij || 'Dalam Penerbitan',
        namaGereja: churchName,
        linkProfil: `${origin}/dashboard/jemaat`,
      })
    }
    if (type === 'REJECT') {
      return `Syalom Bapak/Ibu/Sdr. ${item.nama},\n\nSehubungan dengan permohonan pendaftaran jemaat Anda di ${churchName}, terdapat berkas yang belum dapat kami verifikasi${item.rejectionReason ? ` (${item.rejectionReason})` : ''}.\n\nMohon dapat menghubungi Sekretariat untuk bantuan lebih lanjut. Terima kasih dan Tuhan Yesus memberkati.`
    }
    const template = waTemplates.FOLLOWUP_PENDAFTARAN || DEFAULT_WHATSAPP_TEMPLATES_CONFIG.FOLLOWUP_PENDAFTARAN || ''
    return formatWhatsAppMessage(template, {
      nama: item.nama || 'Bapak/Ibu/Saudara/i',
      namaGereja: churchName,
    })
  }

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    sortedQueue.forEach((item) => {
      updated[item.id] = checked
    })
    setSelectedRows(updated)
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows((prev) => ({ ...prev, [id]: checked }))
  }

  // 1. Export CSV Handler
  const handleExportCsv = () => {
    const targets = selectedCount > 0 ? selectedItemsData : queue

    if (targets.length === 0) {
      toast.error('Tidak ada data pendaftaran untuk diekspor.')
      return
    }

    const headers = [
      'Nama Lengkap',
      'Nama Panggilan',
      'Jenis Kelamin',
      'No. HP',
      'WhatsApp',
      'Email',
      'Alamat',
      'Status Pernikahan',
      'Pekerjaan',
      'Status Pendaftaran',
      'Alasan Penolakan',
      'Tanggal Mendaftar',
    ]

    const rows = targets.map((item) => [
      `"${(item.nama || '').replace(/"/g, '""')}"`,
      `"${(item.namaPanggilan || '').replace(/"/g, '""')}"`,
      `"${item.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}"`,
      `"${item.noHp || '-'}"`,
      `"${item.whatsApp || '-'}"`,
      `"${item.email || '-'}"`,
      `"${(item.alamat || '').replace(/"/g, '""')}"`,
      `"${item.statusPernikahan || '-'}"`,
      `"${(item.pekerjaan || '').replace(/"/g, '""')}"`,
      `"${item.status || 'PENDING'}"`,
      `"${(item.rejectionReason || '').replace(/"/g, '""')}"`,
      `"${item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    const cleanChurch = (churchName || 'Gereja').replace(/[^a-zA-Z0-9]/g, '_')
    link.setAttribute('download', `Pendaftaran_Jemaat_${cleanChurch}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${targets.length} data pendaftaran ke CSV.`)
  }

  // 2. Bulk Approve Submit
  const handleBulkApproveSubmit = async () => {
    if (selectedIds.length === 0) return
    setIsBulkApproving(true)
    const res = await bulkApprovePendaftaranAction(selectedIds)
    setIsBulkApproving(false)
    if (res.success) {
      toast.success(res.message)
      setBulkApproveModalOpen(false)
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menyetujui pendaftaran terpilih.')
    }
  }

  // 3. Bulk Reject Submit
  const handleBulkRejectSubmit = async () => {
    if (selectedIds.length === 0) return
    if (!bulkRejectReason.trim()) {
      toast.error('Alasan penolakan massal wajib diisi.')
      return
    }
    setIsBulkRejecting(true)
    const res = await bulkRejectPendaftaranAction({
      ids: selectedIds,
      reason: bulkRejectReason.trim(),
    })
    setIsBulkRejecting(false)
    if (res.success) {
      toast.success(res.message)
      setBulkRejectModalOpen(false)
      setBulkRejectReason('')
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menolak pendaftaran terpilih.')
    }
  }

  // 4. Bulk Delete Submit
  const handleBulkDeleteSubmit = async () => {
    if (selectedIds.length === 0) return
    if (!bulkDeleteReason.trim()) {
      toast.error('Alasan penghapusan massal wajib diisi.')
      return
    }
    setIsBulkDeleting(true)
    const res = await bulkSoftDeletePendaftaranAction({
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
      toast.error(res.error || 'Gagal menghapus data pendaftaran.')
    }
  }

  // 5. Copy All Phone Contacts
  const handleCopyAllContacts = () => {
    if (validPhoneContacts.length === 0) return
    const contactLines = validPhoneContacts.map((c) => `${c.nama}: ${c.noHp}`).join('\n')
    navigator.clipboard.writeText(contactLines)
    setCopiedContacts(true)
    toast.success(`${validPhoneContacts.length} nomor WhatsApp berhasil disalin!`)
    setTimeout(() => setCopiedContacts(false), 2500)
  }

  const handleApproveConfirm = async () => {
    if (!approveTarget) return

    setIsApproving(true)
    const res = await approvePendaftaranAction({
      registrationId: approveTarget.id,
    })
    setIsApproving(false)

    if (res.success && res.data) {
      toast.success(res.message || 'Pendaftaran berhasil disetujui! Jemaat Tetap telah dibuat.', {
        action: res.data.jemaatId ? {
          label: 'Buka Profil',
          onClick: () => {
            router.push(`/dashboard/jemaat/${res.data.jemaatId}`)
          },
        } : undefined,
      })
      setApproveTarget(null)
      if (detailTarget?.id === approveTarget.id) setDetailTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menyetujui pendaftaran.')
    }
  }

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi!')
      return
    }

    setIsRejecting(true)
    const res = await rejectPendaftaranAction({
      registrationId: rejectTarget.id,
      reason: rejectReason.trim(),
    })
    setIsRejecting(false)

    if (res.success) {
      toast.success(res.message || 'Pendaftaran berhasil ditolak.')
      setRejectTarget(null)
      setRejectReason('')
      if (detailTarget?.id === rejectTarget.id) setDetailTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menolak pendaftaran.')
    }
  }

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return
    if (!deleteReason.trim()) {
      toast.error('Alasan penghapusan permohonan pendaftaran wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deletePendaftaranAction({
      id: deleteTarget.id,
      reason: deleteReason.trim(),
    })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Pendaftaran berhasil di-soft delete.')
      setDeleteTarget(null)
      setDeleteReason('')
      if (detailTarget?.id === deleteTarget.id) setDetailTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus permohonan pendaftaran.')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    const res = await restorePendaftaranAction({ id: restoreTarget.id })
    setIsRestoring(false)

    if (res.success) {
      toast.success(res.message || 'Pendaftaran berhasil dipulihkan!')
      setRestoreTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memulihkan pendaftaran.')
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return
    setIsHardDeleting(true)
    const res = await hardDeletePendaftaranAction({
      id: hardDeleteTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Pendaftaran berhasil dihapus permanen dari database!')
      setHardDeleteTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen pendaftaran.')
    }
  }

  const renderStatusBadge = (status: StatusPendaftaran) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-mono'>
            MENUNGGU REVIEW
          </Badge>
        )
      case 'APPROVED':
        return (
          <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono'>
            DISETUJUI
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge className='bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-mono'>
            DITOLAK
          </Badge>
        )
      default:
        return <Badge variant='outline'>{status}</Badge>
    }
  }

  const formatPernikahan = (status?: string | null) => {
    if (!status) return '-'
    switch (status) {
      case 'BELUM_MENIKAH':
        return 'Belum Menikah'
      case 'MENIKAH':
        return 'Menikah'
      case 'JANDA_DUDA':
        return 'Janda / Duda'
      case 'DUDA':
        return 'Duda'
      case 'JANDA':
        return 'Janda'
      case 'BERCERAI':
        return 'Bercerai'
      default:
        return status
    }
  }

  const renderColumnHeader = (
    title: string,
    columnKey: keyof typeof visibleColumns,
    field?: 'createdAt' | 'nama' | 'kontak' | 'jenisKelamin' | 'statusPernikahan' | 'status'
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
        <div className='flex items-start sm:items-center gap-3'>
          <div className='p-2 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5 sm:mt-0'>
            <ClipboardCheck className='size-5' />
          </div>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Verifikasi Pendaftaran</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Tinjau permohonan pendaftaran mandiri calon jemaat.
            </p>
          </div>
        </div>
      </div>

      {/* 1. TOP ROW: 4 KPI METRIC CARDS (SWIPER.JS) */}
      <div className='w-full'>
        <Swiper
          modules={[Pagination]}
          spaceBetween={12}
          slidesPerView={1}
          pagination={{
            clickable: true,
            bulletClass: 'swiper-pagination-bullet !bg-primary/30 !opacity-100 !w-2 !h-2 !transition-all',
            bulletActiveClass: '!bg-primary !w-6 !rounded-full',
          }}
          breakpoints={{
            640: {
              slidesPerView: 2,
              spaceBetween: 16,
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 16,
            },
          }}
          className='kpi-swiper pb-7! sm:pb-0!'
        >
          {/* KPI 1: Total Permohonan */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs bg-card h-full border border-border/70'>
              <CardContent className='p-3.5 flex items-center justify-between'>
                <div>
                  <p className='text-xs font-medium text-muted-foreground uppercase'>Total Permohonan</p>
                  <p className='text-2xl font-bold font-mono text-primary mt-0.5'>{stats.totalPendaftaran}</p>
                  <p className='text-[11px] text-muted-foreground mt-0.5'>Seluruh formulir masuk</p>
                </div>
                <div className='size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20'>
                  <ClipboardList className='size-4.5' />
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          {/* KPI 2: Menunggu Review */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs bg-card h-full border border-border/70'>
              <CardContent className='p-3.5 flex items-center justify-between'>
                <div>
                  <p className='text-xs font-medium text-amber-600 dark:text-amber-400 uppercase'>Menunggu Review</p>
                  <p className='text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5'>{stats.pendingCount}</p>
                  <p className='text-[11px] text-muted-foreground mt-0.5'>Perlu tindakan verifikasi</p>
                </div>
                <div className='size-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20'>
                  <Clock className='size-4.5' />
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          {/* KPI 3: Telah Disetujui */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs bg-card h-full border border-border/70'>
              <CardContent className='p-3.5 flex items-center justify-between'>
                <div>
                  <p className='text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase'>Telah Disetujui</p>
                  <p className='text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5'>{stats.approvedCount}</p>
                  <p className='text-[11px] text-muted-foreground mt-0.5'>Diterima jadi jemaat</p>
                </div>
                <div className='size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20'>
                  <CheckCircle2 className='size-4.5' />
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          {/* KPI 4: Ditolak */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs bg-card h-full border border-border/70'>
              <CardContent className='p-3.5 flex items-center justify-between'>
                <div>
                  <p className='text-xs font-medium text-rose-600 dark:text-rose-400 uppercase'>Ditolak</p>
                  <p className='text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5'>{stats.rejectedCount}</p>
                  <p className='text-[11px] text-muted-foreground mt-0.5'>Duplikasi / tidak valid</p>
                </div>
                <div className='size-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20'>
                  <XCircle className='size-4.5' />
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>
        </Swiper>
      </div>

      {/* 2. FILTER & TOOLBAR SECTION */}
      <div className='space-y-2.5'>
        {/* Status Queue Tabs */}
        <div className='flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-full sm:w-fit overflow-x-auto text-xs'>
          <button
            type='button'
            onClick={() => {
              setFilterStatus('PENDING')
              setPageIndex(0)
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs whitespace-nowrap transition-all ${
              filterStatus === 'PENDING'
                ? 'bg-background shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className='size-3.5 text-amber-500' />
            <span>Menunggu Review</span>
            {stats.pendingCount > 0 ? (
              <Badge className='rounded-full px-1.5 py-0 text-[10px] font-bold font-mono h-4 min-w-4 bg-amber-500 text-white'>
                {stats.pendingCount}
              </Badge>
            ) : (
              <span className='text-[10px] text-muted-foreground font-mono'>(0)</span>
            )}
          </button>

          <button
            type='button'
            onClick={() => {
              setFilterStatus('APPROVED')
              setPageIndex(0)
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs whitespace-nowrap transition-all ${
              filterStatus === 'APPROVED'
                ? 'bg-background shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className='size-3.5 text-emerald-500' />
            <span>Riwayat Disetujui</span>
            <span className='text-[11px] text-muted-foreground font-mono'>({stats.approvedCount})</span>
          </button>

          <button
            type='button'
            onClick={() => {
              setFilterStatus('REJECTED')
              setPageIndex(0)
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs whitespace-nowrap transition-all ${
              filterStatus === 'REJECTED'
                ? 'bg-background shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <XCircle className='size-3.5 text-rose-500' />
            <span>Ditolak</span>
            <span className='text-[11px] text-muted-foreground font-mono'>({stats.rejectedCount})</span>
          </button>

          <button
            type='button'
            onClick={() => {
              setFilterStatus('all')
              setPageIndex(0)
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs whitespace-nowrap transition-all ${
              filterStatus === 'all'
                ? 'bg-background shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList className='size-3.5' />
            <span>Semua Riwayat</span>
            <span className='text-[11px] text-muted-foreground font-mono'>({stats.totalPendaftaran})</span>
          </button>
        </div>

        {/* Toolbar Search & Secondary Filter */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <Input
              placeholder='Cari nama, kontak, email...'
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

              {(searchTerm || statusHapusFilter !== 'ACTIVE' || filterStatus !== 'PENDING') && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setSearchTerm('')
                    setStatusHapusFilter('ACTIVE')
                    setFilterStatus('PENDING')
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
              {(['createdAt', 'nama', 'kontak', 'jenisKelamin', 'statusPernikahan', 'status'] as const).map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={visibleColumns[col]}
                  onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, [col]: !!c }))}
                >
                  {col === 'createdAt' ? 'Tgl Pengajuan' : col === 'nama' ? 'Nama Pemohon' : col === 'kontak' ? 'Kontak' : col === 'jenisKelamin' ? 'Jenis Kelamin' : col === 'statusPernikahan' ? 'Status Pernikahan' : 'Status'}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main DataTable */}
      <div className='rounded-md border overflow-hidden bg-card'>
        <div className='overflow-x-auto'>
          <Table className='text-xs'>
            <TableHeader className='bg-muted/30'>
              <TableRow className='hover:bg-transparent border-b'>
                <TableHead className='w-9 px-2 text-center'>
                  <Checkbox checked={isAllSelected} onCheckedChange={(c) => handleSelectAll(!!c)} />
                </TableHead>
                {visibleColumns.createdAt && <TableHead className='w-32 px-3'>{renderColumnHeader('Tgl Pengajuan', 'createdAt', 'createdAt')}</TableHead>}
                {visibleColumns.nama && <TableHead className='min-w-[170px] px-3'>{renderColumnHeader('Nama Calon Jemaat', 'nama', 'nama')}</TableHead>}
                {visibleColumns.kontak && <TableHead className='w-32 px-3'>{renderColumnHeader('Kontak', 'kontak', 'kontak')}</TableHead>}
                {visibleColumns.jenisKelamin && <TableHead className='w-24 px-3'>{renderColumnHeader('Gender', 'jenisKelamin', 'jenisKelamin')}</TableHead>}
                {visibleColumns.statusPernikahan && <TableHead className='w-28 px-3'>{renderColumnHeader('Status Nikah', 'statusPernikahan', 'statusPernikahan')}</TableHead>}
                {visibleColumns.status && <TableHead className='w-32 px-3 text-center'>{renderColumnHeader('Status Antrean', 'status', 'status')}</TableHead>}
                <TableHead className='w-16 px-2 text-end'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-32 text-center text-muted-foreground text-xs'>
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='size-3.5 animate-spin text-primary' /> Memuat antrean pendaftaran...
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedQueue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-44 text-center text-muted-foreground text-xs'>
                    {filterStatus === 'PENDING' && !searchTerm && statusHapusFilter === 'ACTIVE' ? (
                      <div className='py-5 text-center space-y-2'>
                        <div className='size-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20 shadow-xs'>
                          <Sparkles className='size-5' />
                        </div>
                        <div className='space-y-0.5'>
                          <h4 className='text-xs font-bold text-foreground'>Antrean Bersih (Inbox Zero)</h4>
                          <p className='text-[11px] text-muted-foreground max-w-sm mx-auto'>
                            Semua formulir pendaftaran calon jemaat telah selesai ditinjau.
                          </p>
                        </div>
                        {stats.approvedCount > 0 && (
                          <div className='pt-1'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setFilterStatus('APPROVED')}
                              className='text-xs gap-1.5 h-7 text-foreground'
                            >
                              <CheckCircle2 className='size-3 text-emerald-500' /> Riwayat Disetujui ({stats.approvedCount})
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : searchTerm || statusHapusFilter !== 'ACTIVE' || filterStatus !== 'PENDING' ? (
                      <div className='space-y-2 py-5'>
                        <div>Tidak ada data pendaftaran yang sesuai dengan filter.</div>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 text-xs'
                          onClick={() => {
                            setSearchTerm('')
                            setStatusHapusFilter('ACTIVE')
                            setFilterStatus('PENDING')
                          }}
                        >
                          Reset Filter
                        </Button>
                      </div>
                    ) : (
                      <div className='space-y-2 py-5'>
                        <div>Belum ada pendaftaran yang masuk.</div>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                sortedQueue.map((item) => {
                  const isSelected = !!selectedRows[item.id]
                  const isDeleted = !!item.deletedAt
                  return (
                    <TableRow
                      key={item.id}
                      className={`transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'} ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className='w-9 px-2 py-2 text-center'>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => setSelectedRows((p) => ({ ...p, [item.id]: !!c }))}
                        />
                      </TableCell>
                      {visibleColumns.createdAt && (
                        <TableCell className='w-32 px-3 py-2 text-xs text-muted-foreground font-mono whitespace-nowrap'>
                          <div className='text-foreground font-medium'>
                            {new Date(item.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className='text-[10px] text-muted-foreground'>
                            {new Date(item.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} WIB
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.nama && (
                        <TableCell className='px-3 py-2'>
                          <div className='flex items-center gap-1.5'>
                            <button
                              onClick={() => setDetailTarget(item)}
                              className='font-bold text-xs sm:text-sm text-foreground hover:underline hover:text-primary text-left leading-tight'
                            >
                              {item.nama}
                            </button>
                            {item.namaPanggilan && (
                              <span className='text-xs text-muted-foreground font-normal'>
                                ({item.namaPanggilan})
                              </span>
                            )}
                            {isDeleted && (
                              <Badge variant='destructive' className='text-[9px] py-0 px-1 font-mono'>
                                Terhapus
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.kontak && (
                        <TableCell className='w-32 px-3 py-2 text-xs text-foreground'>
                          <div className='font-mono text-xs'>{item.noHp || item.whatsApp || '-'}</div>
                          {item.email && <div className='text-[10px] text-muted-foreground truncate max-w-[130px]' title={item.email}>{item.email}</div>}
                        </TableCell>
                      )}
                      {visibleColumns.jenisKelamin && (
                        <TableCell className='w-24 px-3 py-2 text-xs whitespace-nowrap text-foreground'>
                          {item.jenisKelamin === 'LAK_LAKI' ? 'Laki-Laki' : 'Perempuan'}
                        </TableCell>
                      )}
                      {visibleColumns.statusPernikahan && (
                        <TableCell className='w-28 px-3 py-2 text-xs text-muted-foreground whitespace-nowrap'>
                          <span className='text-foreground/90'>{formatPernikahan(item.statusPernikahan)}</span>
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell className='w-32 px-3 py-2 text-center whitespace-nowrap'>
                          {renderStatusBadge(item.status)}
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
                                onClick={() => setRestoreTarget(item)}
                              >
                                <RotateCcw className='size-3.5' /> Pulihkan
                              </Button>
                              <Button
                                size='sm'
                                variant='ghost'
                                className='h-7 px-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 gap-1'
                                onClick={() => setHardDeleteTarget(item)}
                              >
                                <Trash2 className='size-3.5' /> Hapus
                              </Button>
                            </>
                          ) : (
                            <>
                              {(item.noHp || item.whatsApp) && (
                                <Button
                                  asChild
                                  variant='ghost'
                                  size='icon'
                                  className='size-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700'
                                  title='Hubungi via WhatsApp'
                                >
                                  <a
                                    href={formatWhatsAppUrl(
                                      item.whatsApp || item.noHp,
                                      getWhatsAppTemplate(item, item.status === 'APPROVED' ? 'APPROVE' : item.status === 'REJECTED' ? 'REJECT' : 'PENDING')
                                    )}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                  >
                                    <MessageSquare className='size-3.5' />
                                  </a>
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant='ghost' size='icon' className='size-7'>
                                    <MoreHorizontal className='size-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                  <DropdownMenuLabel className='text-xs'>Aksi Peninjauan</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => setDetailTarget(item)}>
                                    <Eye className='size-3.5 me-2' /> Lihat Formulir Detail
                                  </DropdownMenuItem>
                                  {(item.noHp || item.whatsApp) && (
                                    <DropdownMenuItem asChild>
                                      <a
                                        href={formatWhatsAppUrl(
                                          item.whatsApp || item.noHp,
                                          getWhatsAppTemplate(item, item.status === 'APPROVED' ? 'APPROVE' : item.status === 'REJECTED' ? 'REJECT' : 'PENDING')
                                        )}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='text-emerald-600 dark:text-emerald-400 font-medium'
                                      >
                                        <MessageSquare className='size-3.5 me-2' /> Hubungi via WhatsApp
                                      </a>
                                    </DropdownMenuItem>
                                  )}
                                  {item.status === 'PENDING' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className='text-emerald-600 dark:text-emerald-400 font-semibold text-xs'
                                        onClick={() => setApproveTarget(item)}
                                      >
                                        <Check className='size-3.5 me-2' /> Setujui & Buat Jemaat
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className='text-rose-600 dark:text-rose-400 text-xs'
                                        onClick={() => setRejectTarget(item)}
                                      >
                                        <X className='size-3.5 me-2' /> Tolak Permohonan
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {item.status === 'APPROVED' && item.jemaatId && (
                                    <DropdownMenuItem asChild>
                                      <Link href={`/dashboard/jemaat/${item.jemaatId}`}>
                                        <UserCheck className='size-3.5 me-2 text-primary' /> Buka Profil Jemaat
                                      </Link>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className='text-rose-600 dark:text-rose-400 text-xs'
                                    onClick={() => {
                                      setDeleteTarget(item)
                                      setDeleteReason('')
                                    }}
                                  >
                                    <Trash2 className='size-3.5 me-2' /> Soft Delete Permohonan
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
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
                <SelectTrigger className='h-7 w-14 text-xs'><SelectValue /></SelectTrigger>
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

      {/* ── Dialog Detail Formulir Pendaftaran ──────────────────── */}
      <Dialog open={!!detailTarget} onOpenChange={(o) => { if (!o) setDetailTarget(null) }}>
        <DialogContent className='max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden'>
          <DialogHeader className='text-left p-4 sm:p-5 border-b shrink-0 bg-muted/20'>
            <div className='flex items-start gap-2.5'>
              <div className='p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5'>
                <ClipboardList className='size-5 text-primary' />
              </div>
              <div className='min-w-0 flex-1 pr-6'>
                <DialogTitle className='text-base sm:text-lg font-bold tracking-tight text-foreground'>
                  Detail Pendaftaran Mandiri
                </DialogTitle>
                <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                  Tinjau rincian permohonan keanggotaan jemaat dan berkas pendukung.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {detailTarget && (
            <div className='flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs'>
              {/* Approved Jemaat Status Banner */}
              {detailTarget.status === 'APPROVED' && (
                <div className='p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                  <div className='flex items-center gap-2'>
                    <UserCheck className='size-4 text-emerald-600 dark:text-emerald-400 shrink-0' />
                    <span className='font-medium text-emerald-800 dark:text-emerald-300 text-xs'>
                      Telah disetujui & terdaftar sebagai Jemaat Tetap
                    </span>
                  </div>
                  {detailTarget.jemaatId && (
                    <Button asChild size='sm' className='h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 w-full sm:w-auto justify-center'>
                      <Link href={`/dashboard/jemaat/${detailTarget.jemaatId}`}>
                        <ExternalLink className='size-3' /> Buka Profil Jemaat
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {/* Applicant Header Badge Card */}
              <div className='p-3.5 bg-muted/40 rounded-lg space-y-2 border'>
                <div className='flex justify-between items-start gap-2'>
                  <div className='min-w-0 flex-1'>
                    <span className='font-bold text-base text-foreground leading-tight block'>
                      {detailTarget.nama}
                    </span>
                    {detailTarget.namaPanggilan && (
                      <span className='text-xs text-muted-foreground'>
                        Nama Panggilan: <span className='font-semibold text-foreground'>{detailTarget.namaPanggilan}</span>
                      </span>
                    )}
                  </div>
                  <div className='flex items-center gap-1.5 shrink-0'>
                    {detailTarget.tipePendaftaran === 'KELUARGA' ? (
                      <Badge variant='outline' className='text-[10px] bg-primary/10 text-primary border-primary/30'>
                        <Users className='size-3 mr-1' /> Keluarga
                      </Badge>
                    ) : (
                      <Badge variant='outline' className='text-[10px] bg-muted text-muted-foreground'>
                        Pribadi
                      </Badge>
                    )}
                    {renderStatusBadge(detailTarget.status)}
                  </div>
                </div>
                <div className='text-muted-foreground text-[11px] flex items-center gap-1.5 pt-1 border-t border-border/50'>
                  <Calendar className='size-3 text-muted-foreground' />
                  <span>Diajukan pada: {new Date(detailTarget.createdAt).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Grid 2-Kolom Informasi Pemohon */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-lg p-3.5 bg-card'>
                <div className='min-w-0'>
                  <span className='text-muted-foreground block text-[11px]'>Jenis Kelamin</span>
                  <span className='font-medium text-foreground'>{detailTarget.jenisKelamin === 'LAK_LAKI' ? 'Laki-Laki' : 'Perempuan'}</span>
                </div>
                <div className='min-w-0'>
                  <span className='text-muted-foreground block text-[11px]'>Status Pernikahan</span>
                  <span className='font-medium text-foreground'>
                    {detailTarget.statusPernikahan === 'BELUM_MENIKAH'
                      ? 'Belum Menikah'
                      : detailTarget.statusPernikahan === 'MENIKAH'
                      ? 'Menikah'
                      : detailTarget.statusPernikahan === 'JANDA_DUDA'
                      ? 'Janda / Duda'
                      : detailTarget.statusPernikahan || '-'}
                  </span>
                </div>
                <div className='min-w-0'>
                  <span className='text-muted-foreground block text-[11px]'>No. HP / WhatsApp</span>
                  <div className='flex items-center gap-1.5 flex-wrap mt-0.5'>
                    <span className='font-medium font-mono text-[11px] text-foreground'>{detailTarget.noHp || detailTarget.whatsApp || '-'}</span>
                    {(detailTarget.noHp || detailTarget.whatsApp) && (
                      <a
                        href={formatWhatsAppUrl(
                          detailTarget.whatsApp || detailTarget.noHp,
                          getWhatsAppTemplate(detailTarget, detailTarget.status === 'APPROVED' ? 'APPROVE' : detailTarget.status === 'REJECTED' ? 'REJECT' : 'PENDING')
                        )}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 text-[10px] font-semibold transition-colors'
                      >
                        <MessageSquare className='size-3' /> Chat WA
                      </a>
                    )}
                  </div>
                </div>
                <div className='min-w-0'>
                  <span className='text-muted-foreground block text-[11px]'>Email</span>
                  <span className='font-medium truncate block text-foreground' title={detailTarget.email || '-'}>{detailTarget.email || '-'}</span>
                </div>
                <div className='min-w-0'>
                  <span className='text-muted-foreground block text-[11px]'>Tempat & Tgl Lahir</span>
                  <span className='font-medium block text-foreground'>
                    {detailTarget.tempatLahir ? `${detailTarget.tempatLahir}, ` : ''}
                    {detailTarget.tanggalLahir
                      ? new Date(detailTarget.tanggalLahir).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </span>
                </div>
                <div className='min-w-0'>
                  <span className='text-muted-foreground block text-[11px]'>Profesi / Pekerjaan</span>
                  <span className='font-medium truncate block text-foreground'>{detailTarget.pekerjaan || '-'}</span>
                </div>
                <div className='col-span-1 sm:col-span-2 min-w-0'>
                  <span className='text-muted-foreground block text-[11px]'>Alamat Domisili</span>
                  <span className='font-medium leading-relaxed block text-foreground'>{detailTarget.alamat || '-'}</span>
                </div>
              </div>

              {/* Family Registration Section (if applicable) */}
              {(detailTarget.tipePendaftaran === 'KELUARGA' || detailTarget.nomorKk || detailTarget.namaKeluarga || additionalFamilyMembers.length > 0) && (
                <div className='p-3.5 bg-card border rounded-lg space-y-2.5'>
                  <div className='flex items-center justify-between text-xs font-semibold'>
                    <span className='flex items-center gap-1.5 text-foreground'>
                      <Users className='size-4 text-primary' /> Informasi Keluarga Pemohon
                    </span>
                    {detailTarget.nomorKk && (
                      <span className='font-mono text-[11px] text-muted-foreground'>
                        No. KK: <strong className='text-foreground'>{detailTarget.nomorKk}</strong>
                      </span>
                    )}
                  </div>
                  {detailTarget.namaKeluarga && (
                    <div className='text-xs text-muted-foreground'>
                      Nama Keluarga: <span className='font-semibold text-foreground'>{detailTarget.namaKeluarga}</span>
                    </div>
                  )}

                  {additionalFamilyMembers.length > 0 && (
                    <div className='space-y-1.5 pt-1'>
                      <span className='text-[11px] font-medium text-muted-foreground block'>
                        Anggota Keluarga Tambahan ({additionalFamilyMembers.length}):
                      </span>
                      <div className='space-y-1.5'>
                        {additionalFamilyMembers.map((member: any, idx: number) => (
                          <div key={idx} className='p-2 bg-muted/40 rounded border flex items-center justify-between gap-2 text-xs'>
                            <div>
                              <span className='font-bold text-foreground'>{member.nama}</span>
                              <div className='text-[10px] text-muted-foreground'>
                                {member.hubunganKeluarga || 'Anggota'} • {member.jenisKelamin === 'LAK_LAKI' ? 'Laki-Laki' : 'Perempuan'}
                                {member.tanggalLahir ? ` • Lahir ${new Date(member.tanggalLahir).toLocaleDateString('id-ID')}` : ''}
                              </div>
                            </div>
                            {member.statusPernikahan && (
                              <Badge variant='outline' className='text-[10px] capitalize'>
                                {member.statusPernikahan.toLowerCase().replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Document Attachment Preview */}
              {detailTarget.kkFileUrl && (
                <div className='p-3.5 bg-card border rounded-lg space-y-2.5'>
                  <div className='flex items-center justify-between text-xs font-semibold'>
                    <span className='flex items-center gap-1.5 text-foreground'>
                      <FileText className='size-4 text-primary' /> Lampiran Berkas Pendukung (Terunggah)
                    </span>
                    <Button asChild variant='outline' size='sm' className='h-6 text-[10px] gap-1'>
                      <a href={detailTarget.kkFileUrl} target='_blank' rel='noopener noreferrer'>
                        <Eye className='size-3' /> Buka Berkas Penuh
                      </a>
                    </Button>
                  </div>
                  {detailTarget.kkFileUrl.match(/\.(jpeg|jpg|png|webp)$/i) ? (
                    <div className='rounded border overflow-hidden max-h-48 bg-black/5 flex items-center justify-center p-1'>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={detailTarget.kkFileUrl} alt='Lampiran Berkas' className='max-h-44 object-contain rounded' />
                    </div>
                  ) : (
                    <div className='p-3 bg-muted/30 rounded border text-center text-xs text-muted-foreground'>
                      Berkas non-gambar terlampir (PDF/Dokumen). Klik tombol di atas untuk membuka.
                    </div>
                  )}
                </div>
              )}

              {detailTarget.rejectionReason && (
                <div className='p-3 bg-rose-500/10 border border-rose-500/20 rounded-md text-xs text-rose-700 dark:text-rose-300'>
                  <strong>Alasan Penolakan:</strong> {detailTarget.rejectionReason}
                </div>
              )}
            </div>
          )}

          <DialogFooter className='flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 p-4 sm:p-5 border-t shrink-0 bg-muted/20'>
            <Button variant='outline' size='sm' onClick={() => setDetailTarget(null)} className='w-full sm:w-auto h-8 text-xs font-medium justify-center'>
              Tutup
            </Button>
            {detailTarget?.status === 'PENDING' && (
              <div className='grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto'>
                <Button
                  size='sm'
                  variant='outline'
                  className='text-rose-600 dark:text-rose-400 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1 h-8 text-xs justify-center font-medium'
                  onClick={() => {
                    setRejectTarget(detailTarget)
                  }}
                >
                  <X className='size-3.5' /> Tolak
                </Button>
                <Button
                  size='sm'
                  className='bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8 text-xs justify-center font-semibold'
                  onClick={() => {
                    setApproveTarget(detailTarget)
                  }}
                >
                  <Check className='size-3.5' /> Setujui
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog Konfirmasi Setujui Pendaftaran ──────────── */}
      <AlertDialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <CheckCircle2 className='size-5' /> Setujui Pendaftaran Calon Jemaat?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Apakah Anda yakin ingin menyetujui permohonan pendaftaran dari <strong className='text-foreground'>{approveTarget?.nama}</strong>?
                </span>
                <span className='block text-xs text-muted-foreground'>
                  Sistem akan membuat profil Jemaat Tetap baru dengan status <strong className='text-emerald-600 dark:text-emerald-400'>ACTIVE</strong>, menerbitkan <strong>Nomor Induk Jemaat (NIJ)</strong>, dan membuat <strong>Barcode Presensi</strong> resmi secara otomatis. Transaksi dilindungi log audit SHA-256.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setApproveTarget(null)} disabled={isApproving}>
              Batal
            </Button>
            <Button
              className='bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold'
              onClick={handleApproveConfirm}
              disabled={isApproving}
            >
              {isApproving ? <Loader2 className='size-4 animate-spin' /> : <UserCheck className='size-4' />}
              {isApproving ? 'Memproses...' : 'Setujui & Terbitkan NIJ'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog Reject Pendaftaran ──────────────────────────── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason('') } }}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleRejectConfirm}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>
                Tolak Permohonan Pendaftaran
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Permohonan dari <strong className='text-foreground'>{rejectTarget?.nama}</strong> akan ditandai sebagai REJECTED.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Alasan Penolakan (Wajib) *</Label>
                <Textarea
                  placeholder='Contoh: Data KTP/kontak tidak dapat diverifikasi / calon jemaat sudah terdaftar sebelumnya...'
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className='text-xs min-h-22.5'
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => { setRejectTarget(null); setRejectReason('') }} disabled={isRejecting}>
                Batal
              </Button>
              <Button
                type='submit'
                className='bg-rose-600 hover:bg-rose-700 text-white gap-2'
                disabled={isRejecting || !rejectReason.trim()}
              >
                {isRejecting ? <Loader2 className='size-4 animate-spin' /> : <X className='size-4' />}
                {isRejecting ? 'Menolak...' : 'Konfirmasi Penolakan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog Konfirmasi Soft Delete Pendaftaran ─────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeleteReason('') }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Hapus Permohonan Pendaftaran?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Permohonan pendaftaran <strong className='text-foreground'>{deleteTarget?.nama}</strong> akan dinonaktifkan via Soft Delete.
                </span>
                <span className='block text-xs text-muted-foreground'>
                  Data tetap tersimpan dan dapat dipulihkan sewaktu-waktu.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <Label className='text-xs font-semibold'>Alasan Penghapusan (Wajib):</Label>
            <Textarea
              placeholder='Contoh: Permohonan duplikat / dibatalkan oleh pemohon'
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

      {/* ── AlertDialog Restore Pendaftaran Confirm ────────────── */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Permohonan Pendaftaran?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Permohonan pendaftaran <strong className='text-foreground'>{restoreTarget?.nama}</strong> akan dipulihkan ke antrean aktif.
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
              Ya, Pulihkan Permohonan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Hard Delete Pendaftaran Confirm ────────── */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5 text-rose-600' /> Hapus Permanen Permohonan Pendaftaran?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs'>
                  ⚠️ <strong>PERINGATAN</strong>: Permohonan pendaftaran <strong className='text-foreground'>{hardDeleteTarget?.nama}</strong> akan dihapus secara PERMANEN dari database.
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
              onClick={() => setBulkApproveModalOpen(true)}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 rounded-full whitespace-nowrap'
              title='Setujui pendaftaran PENDING terpilih & buat profil Jemaat baru'
            >
              <CheckCircle2 className='size-3.5' />
              <span>Setujui Massal</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setBulkRejectReason('')
                setBulkRejectModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/10 rounded-full whitespace-nowrap'
              title='Tolak pendaftaran PENDING terpilih dengan alasan'
            >
              <XCircle className='size-3.5' />
              <span>Tolak Massal</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => setContactsModalOpen(true)}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Broadcast & Salin Nomor WhatsApp Calon Jemaat'
            >
              <MessageSquare className='size-3.5' />
              <span>Kontak WA Pendaftar</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleExportCsv}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ekspor data pendaftaran terpilih ke CSV / Excel'
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
              title='Hapus data pendaftaran terpilih (soft delete)'
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

      {/* ── MODAL 1: KONFIRMASI SETUJUI MASSAL ──────────────────── */}
      <AlertDialog open={bulkApproveModalOpen} onOpenChange={setBulkApproveModalOpen}>
        <AlertDialogContent className='max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <CheckCircle2 className='size-5' /> Setujui ({pendingSelectedItems.length}) Pendaftaran Jemaat?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Sistem akan secara otomatis menyetujui seluruh pendaftaran berstatus <strong className='text-amber-600'>PENDING</strong> yang dipilih ({pendingSelectedItems.length} orang) dan membuatkan:
                </div>
                <div className='p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-xl space-y-1.5 text-foreground'>
                  <div className='flex items-center gap-2'>
                    <Check className='size-4 text-emerald-600 shrink-0' />
                    <span>Profil Master Jemaat Baru dengan status <strong>ACTIVE</strong></span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Check className='size-4 text-emerald-600 shrink-0' />
                    <span>Nomor Induk Jemaat (NIJ) resmi berurutan</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Check className='size-4 text-emerald-600 shrink-0' />
                    <span>Kode Barcode & QR Code Presensi unik</span>
                  </div>
                </div>
                {selectedCount > pendingSelectedItems.length && (
                  <div className='text-amber-600 text-[11px] italic'>
                    * {selectedCount - pendingSelectedItems.length} pendaftaran yang sudah APPROVED / REJECTED akan dilewati secara otomatis.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setBulkApproveModalOpen(false)} disabled={isBulkApproving}>
              Batal
            </Button>
            <Button
              className='bg-emerald-600 hover:bg-emerald-700 text-white gap-2'
              onClick={handleBulkApproveSubmit}
              disabled={isBulkApproving || pendingSelectedItems.length === 0}
            >
              {isBulkApproving ? <Loader2 className='size-4 animate-spin' /> : <CheckCircle2 className='size-4' />}
              {isBulkApproving ? 'Memproses...' : `Ya, Setujui (${pendingSelectedItems.length}) Pendaftar`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL 2: KONFIRMASI TOLAK MASSAL ────────────────────── */}
      <AlertDialog open={bulkRejectModalOpen} onOpenChange={setBulkRejectModalOpen}>
        <AlertDialogContent className='max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-amber-600 flex items-center gap-2'>
              <XCircle className='size-5' /> Tolak ({pendingSelectedItems.length}) Pendaftaran Jemaat?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Pendaftaran berstatus PENDING terpilih akan diubah statusnya menjadi <strong className='text-rose-600'>REJECTED</strong>.
                </div>
                <div className='space-y-1 pt-1'>
                  <Label className='text-xs font-semibold text-foreground block'>Alasan Penolakan Massal (Wajib):</Label>
                  <Textarea
                    placeholder='Contoh: Formulir tidak lengkap / data pendaftaran uji coba'
                    value={bulkRejectReason}
                    onChange={(e) => setBulkRejectReason(e.target.value)}
                    className='text-xs min-h-15'
                    required
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setBulkRejectModalOpen(false)} disabled={isBulkRejecting}>
              Batal
            </Button>
            <Button
              className='bg-amber-600 hover:bg-amber-700 text-white gap-2'
              onClick={handleBulkRejectSubmit}
              disabled={isBulkRejecting || !bulkRejectReason.trim() || pendingSelectedItems.length === 0}
            >
              {isBulkRejecting ? <Loader2 className='size-4 animate-spin' /> : <XCircle className='size-4' />}
              Konfirmasi Tolak ({pendingSelectedItems.length})
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL 3: BROADCAST & SALIN KONTAK WA PENDAFTAR ──────── */}
      <Dialog open={contactsModalOpen} onOpenChange={setContactsModalOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <MessageSquare className='size-5 text-emerald-600' />
              Kontak WhatsApp Calon Jemaat ({selectedCount} Pendaftar)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Daftar nomor WhatsApp pendaftar untuk koordinasi pastoral, kirim ucapan selamat datang, atau jadwal orientasi.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <div className='flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20'>
              <div>
                <div className='font-bold text-emerald-800 dark:text-emerald-300 text-xs'>
                  {validPhoneContacts.length} Nomor WA Teridentifikasi
                </div>
                <div className='text-[11px] text-muted-foreground'>
                  Dari total {selectedCount} pendaftar terpilih
                </div>
              </div>
              <Button
                size='sm'
                onClick={handleCopyAllContacts}
                className='h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white'
              >
                {copiedContacts ? <Check className='size-3.5' /> : <Copy className='size-3.5' />}
                {copiedContacts ? 'Tersalin!' : 'Salin Semua Nomor'}
              </Button>
            </div>

            <div className='max-h-60 overflow-y-auto divide-y border rounded-xl'>
              {selectedItemsData.map((item) => {
                const rawPhone = (item.noHp || item.whatsApp || '').replace(/[^0-9]/g, '')
                const waLink = rawPhone ? `https://wa.me/${rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone}` : null

                return (
                  <div key={item.id} className='p-2.5 px-3 flex items-center justify-between hover:bg-muted/30 text-xs'>
                    <div>
                      <div className='font-bold text-foreground'>{item.nama}</div>
                      <div className='text-[11px] text-muted-foreground flex items-center gap-2 pt-0.5'>
                        <Badge
                          variant='outline'
                          className={`text-[9px] px-1.5 py-0 ${
                            item.status === 'APPROVED'
                              ? 'text-emerald-600 border-emerald-500/30'
                              : item.status === 'REJECTED'
                              ? 'text-rose-600 border-rose-500/30'
                              : 'text-amber-600 border-amber-500/30'
                          }`}
                        >
                          {item.status}
                        </Badge>
                        {item.email && <span>{item.email}</span>}
                      </div>
                    </div>
                    <div>
                      {rawPhone ? (
                        <div className='flex items-center gap-2'>
                          <span className='font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400'>
                            {item.noHp || item.whatsApp}
                          </span>
                          {waLink && (
                            <a
                              href={waLink}
                              target='_blank'
                              rel='noreferrer'
                              className='size-7 rounded-lg border flex items-center justify-center text-emerald-600 hover:bg-emerald-500/10'
                              title='Buka Chat WhatsApp'
                            >
                              <ExternalLink className='size-3.5' />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className='text-muted-foreground italic text-[11px]'>Tanpa No. HP</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setContactsModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4: HAPUS MASSAL PENDAFTARAN (SOFT DELETE) ──────── */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Pindahkan {selectedCount} Data Pendaftaran ke Kotak Sampah?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Seluruh data formulir pendaftaran terpilih ({selectedCount} baris) akan diarsipkan ke kotak sampah (*soft delete*) dan dapat dipulihkan kapan saja.
                </div>
                <div className='space-y-1 pt-1'>
                  <Label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan Massal (Wajib):</Label>
                  <Textarea
                    placeholder='Contoh: Pembersihan data permohonan lama / data duplikat'
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
