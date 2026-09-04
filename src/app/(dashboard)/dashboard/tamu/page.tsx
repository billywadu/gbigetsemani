'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  UserPlus,
  UserCheck,
  Phone,
  MapPin,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Eye,
  Edit,
  FilterX,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  Check,
  Trash2,
  RotateCcw,
  ShieldAlert,
  MessageSquare,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import {
  getTamuListAction,
  createTamuAction,
  updateStatusFollowUpAction,
  konversiTamuKeJemaatAction,
  deleteTamuAction,
  restoreTamuAction,
  hardDeleteTamuAction,
} from '@/actions/tamu'
import { getWhatsAppTemplatesAction } from '@/actions/whatsapp-template'
import { formatWhatsAppMessage, openWhatsAppChat } from '@/lib/whatsapp-helpers'
import { DEFAULT_WHATSAPP_TEMPLATES_CONFIG } from '@/lib/validations/whatsapp-template'
import { StatusFollowUp } from '@/lib/validations/tamu'
import { getAppProfileAction } from '@/actions/app-profile'
import { toast } from 'sonner'

export default function TamuPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tamuList, setTamuList] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [churchName, setChurchName] = useState('Gereja')
  const [waTemplates, setWaTemplates] = useState(DEFAULT_WHATSAPP_TEMPLATES_CONFIG)
  const [stats, setStats] = useState({
    totalTamu: 0,
    newCount: 0,
    inProgressCount: 0,
    needVisitationCount: 0,
    completedCount: 0,
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Pagination
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({
    nama: true,
    kontak: true,
    alamat: true,
    statusFollowUp: true,
    durasi: true,
  })

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [nama, setNama] = useState('')
  const [namaPanggilan, setNamaPanggilan] = useState('')
  const [jenisKelamin, setJenisKelamin] = useState<'LAK_LAKI' | 'PEREMPUAN'>('LAK_LAKI')
  const [noHp, setNoHp] = useState('')
  const [whatsApp, setWhatsApp] = useState('')
  const [email, setEmail] = useState('')
  const [alamat, setAlamat] = useState('')
  const [catatan, setCatatan] = useState('')

  // Update Status Modal
  const [updateTarget, setUpdateTarget] = useState<any | null>(null)
  const [updateStatus, setUpdateStatus] = useState<StatusFollowUp>('NEW')
  const [updateCatatan, setUpdateCatatan] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Convert Modal
  const [convertTarget, setConvertTarget] = useState<any | null>(null)
  const [isConverting, setIsConverting] = useState(false)

  // Soft Delete & Restore & Hard Delete States
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [hardDeleteTarget, setHardDeleteTarget] = useState<any | null>(null)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [isHardDeleting, setIsHardDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getTamuListAction({
      search: searchTerm,
      statusHapus: statusHapusFilter,
      statusFollowUp: filterStatus !== 'all' ? (filterStatus as StatusFollowUp) : undefined,
      page: pageIndex + 1,
      pageSize,
    })

    if (res.success && res.data) {
      setTamuList(res.data.items)
      setTotalCount(res.data.total)
      setStats(res.data.stats)
    } else {
      toast.error(res.error || 'Gagal memuat data tamu.')
    }
    setLoading(false)
  }, [searchTerm, statusHapusFilter, filterStatus, pageIndex, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Sorting state
  const [sortField, setSortField] = useState<'nama' | 'statusFollowUp' | 'createdAt' | null>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const sortedTamuList = React.useMemo(() => {
    if (!sortField) return tamuList
    return [...tamuList].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''
      if (sortField === 'nama') {
        aVal = a.nama || ''
        bVal = b.nama || ''
      } else if (sortField === 'statusFollowUp') {
        aVal = a.statusFollowUp || ''
        bVal = b.statusFollowUp || ''
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
  }, [tamuList, sortField, sortOrder])

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

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const selectedCount = Object.values(selectedRows).filter(Boolean).length
  const isAllSelected = sortedTamuList.length > 0 && sortedTamuList.every((t) => selectedRows[t.id])

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    sortedTamuList.forEach((t) => {
      updated[t.id] = checked
    })
    setSelectedRows(updated)
  }

  const resetCreateForm = () => {
    setNama('')
    setNamaPanggilan('')
    setJenisKelamin('LAK_LAKI')
    setNoHp('')
    setWhatsApp('')
    setEmail('')
    setAlamat('')
    setCatatan('')
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nama.trim()) { toast.error('Nama tamu wajib diisi!'); return }

    setIsCreating(true)
    const res = await createTamuAction({
      nama: nama.trim(),
      namaPanggilan: namaPanggilan.trim() || null,
      jenisKelamin,
      noHp: noHp.trim() || null,
      whatsApp: whatsApp.trim() || null,
      email: email.trim() || null,
      alamat: alamat.trim() || null,
      catatan: catatan.trim() || null,
    })
    setIsCreating(false)

    if (res.success && res.data) {
      toast.success(`Slip tamu "${res.data.nama}" berhasil didaftarkan! Log audit SHA-256 tersimpan.`, {
        action: {
          label: 'Buka Detail',
          onClick: () => {
            router.push(`/dashboard/tamu/${res.data.id}`)
          },
        },
      })
      setCreateOpen(false)
      resetCreateForm()
      fetchData()
    } else {
      toast.error(res.error || 'Gagal mendaftarkan tamu.')
    }
  }

  const handleUpdateOpen = (tamu: any) => {
    setUpdateTarget(tamu)
    setUpdateStatus(tamu.statusFollowUp || 'NEW')
    setUpdateCatatan(tamu.catatan || '')
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!updateTarget) return

    setIsUpdating(true)
    const res = await updateStatusFollowUpAction({
      id: updateTarget.id,
      statusFollowUp: updateStatus,
      catatan: updateCatatan.trim() || null,
    })
    setIsUpdating(false)

    if (res.success) {
      toast.success(res.message || 'Status follow-up berhasil diperbarui! Log audit SHA-256 tersimpan.')
      setUpdateTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui status follow-up.')
    }
  }

  const handleConvertConfirm = async () => {
    if (!convertTarget) return

    setIsConverting(true)
    const res = await konversiTamuKeJemaatAction({
      id: convertTarget.id,
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
      setConvertTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal mengonversi tamu.')
    }
  }

  const handleSendRegistrationLink = (phone: string, name: string) => {
    if (!phone) {
      toast.error(`Nomor WhatsApp untuk ${name} belum terdaftar.`)
      return
    }
    const template = waTemplates.LINK_PENDAFTARAN_TAMU || DEFAULT_WHATSAPP_TEMPLATES_CONFIG.LINK_PENDAFTARAN_TAMU
    const formUrl = typeof window !== 'undefined' ? `${window.location.origin}/daftar` : '/daftar'
    const msg = formatWhatsAppMessage(template, {
      nama: name,
      namaGereja: churchName,
      linkFormulir: formUrl,
    })
    const opened = openWhatsAppChat(phone, msg)
    if (opened) {
      toast.success(`Membuka WhatsApp untuk mengirimkan link formulir jemaat ke ${name}.`)
    } else {
      toast.error(`Format nomor WhatsApp untuk ${name} tidak valid.`)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !deletionReason.trim()) {
      toast.error('Alasan penghapusan tamu wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deleteTamuAction({
      id: deleteTarget.id,
      reason: deletionReason.trim(),
    })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Data tamu berhasil di-soft delete.')
      setDeleteTarget(null)
      setDeletionReason('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus data tamu.')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    const res = await restoreTamuAction({ id: restoreTarget.id })
    setIsRestoring(false)

    if (res.success) {
      toast.success(res.message || 'Data tamu berhasil dipulihkan!')
      setRestoreTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memulihkan data tamu.')
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return
    setIsHardDeleting(true)
    const res = await hardDeleteTamuAction({
      id: hardDeleteTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Data tamu berhasil dihapus permanen dari database!')
      setHardDeleteTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen data tamu.')
    }
  }

  const renderStatusBadge = (status: StatusFollowUp) => {
    switch (status) {
      case 'NEW':
        return (
          <Badge className='bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] font-mono'>
            BARU TIBA
          </Badge>
        )
      case 'IN_PROGRESS':
        return (
          <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-mono'>
            SEDANG FOLLOW-UP
          </Badge>
        )
      case 'NEED_VISITATION':
        return (
          <Badge className='bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-mono'>
            PERLU KUNJUNGAN
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono'>
            SELESAI
          </Badge>
        )
      default:
        return <Badge variant='outline'>{status}</Badge>
    }
  }

  const renderColumnHeader = (
    title: string,
    columnKey: keyof typeof visibleColumns,
    field?: 'nama' | 'statusFollowUp' | 'createdAt'
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
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Tamu & Follow-Up</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Kelola pengunjung baru dan tindak lanjut pastoral.
          </p>
        </div>
        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button size='sm' onClick={() => setCreateOpen(true)} className='w-full sm:w-auto h-9 sm:h-8 gap-1.5 text-xs shadow-xs'>
            <UserPlus className='size-3.5' /> Tambah Tamu
          </Button>
        </div>
      </div>

      {/* 1. TOP ROW: 5 KPI METRIC CARDS (SWIPER.JS) */}
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
            480: { slidesPerView: 2, spaceBetween: 12 },
            640: { slidesPerView: 3, spaceBetween: 16 },
            1024: { slidesPerView: 5, spaceBetween: 16 },
          }}
          className='kpi-swiper pb-7! sm:pb-0!'
        >
          {/* KPI 1: Total Tamu */}
          <SwiperSlide className='h-auto'>
            <Card
              onClick={() => { setFilterStatus('all'); setPageIndex(0); }}
              className={`shadow-xs border transition-all bg-card h-full cursor-pointer hover:border-purple-500/50 hover:shadow-xs select-none ${
                filterStatus === 'all'
                  ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-2 ring-purple-500/20 shadow-xs'
                  : 'border-border/70 opacity-80 hover:opacity-100'
              }`}
            >
              <CardContent className='p-4 flex items-center gap-4'>
                <div className='rounded-full bg-purple-100 dark:bg-purple-950/50 p-3 text-purple-600 dark:text-purple-400 shrink-0'>
                  <UserPlus className='size-6' />
                </div>
                <div className='space-y-0.5 flex-1 min-w-0'>
                  <div className='text-xs font-medium text-muted-foreground'>Total Tamu</div>
                  <div className='text-2xl font-bold tracking-tight font-mono text-foreground'>
                    {stats.totalTamu.toLocaleString('id-ID')}
                  </div>
                  <div className='text-[11px] text-muted-foreground'>Semua kunjungan</div>
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          {/* KPI 2: Baru Tiba */}
          <SwiperSlide className='h-auto'>
            <Card
              onClick={() => { setFilterStatus('NEW'); setPageIndex(0); }}
              className={`shadow-xs border transition-all bg-card h-full cursor-pointer hover:border-sky-500/50 hover:shadow-xs select-none ${
                filterStatus === 'NEW'
                  ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-sky-500/20 shadow-xs'
                  : 'border-border/70 opacity-80 hover:opacity-100'
              }`}
            >
              <CardContent className='p-4 flex items-center gap-4'>
                <div className='rounded-full bg-sky-100 dark:bg-sky-950/50 p-3 text-sky-600 dark:text-sky-400 shrink-0'>
                  <Clock className='size-6' />
                </div>
                <div className='space-y-0.5 flex-1 min-w-0'>
                  <div className='text-xs font-medium text-muted-foreground'>Baru Tiba</div>
                  <div className='text-2xl font-bold tracking-tight font-mono text-foreground'>
                    {stats.newCount.toLocaleString('id-ID')}
                  </div>
                  <div className='text-[11px] text-muted-foreground'>Perlu kontak awal</div>
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          {/* KPI 3: Follow-Up */}
          <SwiperSlide className='h-auto'>
            <Card
              onClick={() => { setFilterStatus('IN_PROGRESS'); setPageIndex(0); }}
              className={`shadow-xs border transition-all bg-card h-full cursor-pointer hover:border-amber-500/50 hover:shadow-xs select-none ${
                filterStatus === 'IN_PROGRESS'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20 shadow-xs'
                  : 'border-border/70 opacity-80 hover:opacity-100'
              }`}
            >
              <CardContent className='p-4 flex items-center gap-4'>
                <div className='rounded-full bg-amber-100 dark:bg-amber-950/50 p-3 text-amber-600 dark:text-amber-400 shrink-0'>
                  <Phone className='size-6' />
                </div>
                <div className='space-y-0.5 flex-1 min-w-0'>
                  <div className='text-xs font-medium text-muted-foreground'>Follow-Up</div>
                  <div className='text-2xl font-bold tracking-tight font-mono text-foreground'>
                    {stats.inProgressCount.toLocaleString('id-ID')}
                  </div>
                  <div className='text-[11px] text-muted-foreground'>Proses komunikasi</div>
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          {/* KPI 4: Perlu Visitasi */}
          <SwiperSlide className='h-auto'>
            <Card
              onClick={() => { setFilterStatus('NEED_VISITATION'); setPageIndex(0); }}
              className={`shadow-xs border transition-all bg-card h-full cursor-pointer hover:border-indigo-500/50 hover:shadow-xs select-none ${
                filterStatus === 'NEED_VISITATION'
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-border/70 opacity-80 hover:opacity-100'
              }`}
            >
              <CardContent className='p-4 flex items-center gap-4'>
                <div className='rounded-full bg-indigo-100 dark:bg-indigo-950/50 p-3 text-indigo-600 dark:text-indigo-400 shrink-0'>
                  <MapPin className='size-6' />
                </div>
                <div className='space-y-0.5 flex-1 min-w-0'>
                  <div className='text-xs font-medium text-muted-foreground'>Perlu Visitasi</div>
                  <div className='text-2xl font-bold tracking-tight font-mono text-foreground'>
                    {stats.needVisitationCount.toLocaleString('id-ID')}
                  </div>
                  <div className='text-[11px] text-muted-foreground'>Kunjungan pastoral</div>
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>

          {/* KPI 5: Selesai */}
          <SwiperSlide className='h-auto'>
            <Card
              onClick={() => { setFilterStatus('COMPLETED'); setPageIndex(0); }}
              className={`shadow-xs border transition-all bg-card h-full cursor-pointer hover:border-emerald-500/50 hover:shadow-xs select-none ${
                filterStatus === 'COMPLETED'
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-border/70 opacity-80 hover:opacity-100'
              }`}
            >
              <CardContent className='p-4 flex items-center gap-4'>
                <div className='rounded-full bg-emerald-100 dark:bg-emerald-950/50 p-3 text-emerald-600 dark:text-emerald-400 shrink-0'>
                  <CheckCircle2 className='size-6' />
                </div>
                <div className='space-y-0.5 flex-1 min-w-0'>
                  <div className='text-xs font-medium text-muted-foreground'>Selesai</div>
                  <div className='text-2xl font-bold tracking-tight font-mono text-foreground'>
                    {stats.completedCount.toLocaleString('id-ID')}
                  </div>
                  <div className='text-[11px] text-muted-foreground'>Tertangani penuh</div>
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>
        </Swiper>
      </div>

      {/* Toolbar Filter Section */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <Input
            placeholder='Cari nama tamu, kontak, email...'
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
              <SelectTrigger className='h-8 text-xs font-medium w-36'>
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

            {(searchTerm || statusHapusFilter !== 'ACTIVE' || filterStatus !== 'all') && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSearchTerm('')
                  setStatusHapusFilter('ACTIVE')
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
            {(['nama', 'kontak', 'alamat', 'statusFollowUp', 'durasi'] as const).map((col) => (
              <DropdownMenuCheckboxItem
                key={col}
                checked={visibleColumns[col]}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, [col]: !!c }))}
              >
                {col === 'nama' ? 'Nama Tamu' : col === 'kontak' ? 'Kontak' : col === 'alamat' ? 'Alamat' : col === 'statusFollowUp' ? 'Status Follow-Up' : 'Durasi Kedatangan'}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main DataTable */}
      <div className='rounded-md border overflow-hidden bg-card'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent border-b'>
                <TableHead className='w-10 px-3'>
                  <Checkbox checked={isAllSelected} onCheckedChange={(c) => handleSelectAll(!!c)} />
                </TableHead>
                {visibleColumns.nama && <TableHead className='px-3'>{renderColumnHeader('Nama Tamu', 'nama', 'nama')}</TableHead>}
                {visibleColumns.kontak && <TableHead className='px-3'>{renderColumnHeader('Kontak (HP/WA)', 'kontak')}</TableHead>}
                {visibleColumns.alamat && <TableHead className='px-3'>{renderColumnHeader('Alamat', 'alamat')}</TableHead>}
                {visibleColumns.statusFollowUp && <TableHead className='px-3'>{renderColumnHeader('Status Follow-Up', 'statusFollowUp', 'statusFollowUp')}</TableHead>}
                {visibleColumns.durasi && <TableHead className='px-3'>{renderColumnHeader('Durasi Kedatangan', 'durasi', 'createdAt')}</TableHead>}
                <TableHead className='w-16 px-3 text-end'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-32 text-center text-muted-foreground text-sm'>
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='size-4 animate-spin text-primary' /> Memuat data tamu...
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedTamuList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-32 text-center text-muted-foreground text-sm'>
                    {searchTerm || filterStatus !== 'all' || statusHapusFilter !== 'ACTIVE' ? (
                      <div className='space-y-2'>
                        <div>Tidak ada tamu yang sesuai dengan filter.</div>
                        <Button variant='outline' size='sm' onClick={() => { setSearchTerm(''); setStatusHapusFilter('ACTIVE'); setFilterStatus('all'); }}>
                          Reset Filter
                        </Button>
                      </div>
                    ) : (
                      <div className='space-y-2'>
                        <div>Belum ada data tamu terdaftar.</div>
                        <Button size='sm' onClick={() => setCreateOpen(true)}>
                          <UserPlus className='size-4 me-1' /> Daftarkan Tamu
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                sortedTamuList.map((tamu) => {
                  const isSelected = !!selectedRows[tamu.id]
                  const isDeleted = !!tamu.deletedAt
                  return (
                    <TableRow
                      key={tamu.id}
                      className={`transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'} ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className='px-3 py-2.5'>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => setSelectedRows((p) => ({ ...p, [tamu.id]: !!c }))}
                        />
                      </TableCell>
                      {visibleColumns.nama && (
                        <TableCell className='px-3 py-2.5'>
                          <div className='flex items-center gap-2'>
                            <div className='font-bold text-sm text-foreground'>
                              <Link href={`/dashboard/tamu/${tamu.id}`} className='hover:underline hover:text-primary'>
                                {tamu.nama}
                              </Link>
                            </div>
                            {isDeleted && (
                              <Badge variant='destructive' className='text-[10px] gap-1 font-mono'>
                                <Trash2 className='size-3' /> Terhapus
                              </Badge>
                            )}
                          </div>
                          <div className='text-muted-foreground text-[11px] font-mono'>
                            {tamu.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.kontak && (
                        <TableCell className='px-3 py-2.5 text-xs text-foreground'>
                          <div>{tamu.noHp || tamu.whatsApp || '-'}</div>
                          {tamu.email && <div className='text-[10px] text-muted-foreground'>{tamu.email}</div>}
                        </TableCell>
                      )}
                      {visibleColumns.alamat && (
                        <TableCell className='px-3 py-2.5 text-xs text-muted-foreground max-w-xs truncate' title={tamu.alamat ? `${tamu.alamat}, ${tamu.kota || ''}` : ''}>
                          {tamu.alamat ? `${tamu.alamat}, ${tamu.kota || ''}` : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.statusFollowUp && (
                        <TableCell className='px-3 py-2.5'>
                          {renderStatusBadge(tamu.statusFollowUp)}
                        </TableCell>
                      )}
                      {visibleColumns.durasi && (
                        <TableCell className='px-3 py-2.5 text-xs text-muted-foreground font-mono'>
                          <div className='flex items-center gap-1'>
                            <Clock className='size-3 text-primary' /> {tamu.durasiKedatangan}
                          </div>
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
                            <DropdownMenuLabel className='text-xs'>Aksi Tamu</DropdownMenuLabel>
                            {isDeleted ? (
                              <>
                                <DropdownMenuItem
                                  className='text-emerald-600 dark:text-emerald-400 text-xs'
                                  onClick={() => setRestoreTarget(tamu)}
                                >
                                  <RotateCcw className='size-3.5 me-2' /> Pulihkan Data Tamu
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                  onClick={() => setHardDeleteTarget(tamu)}
                                >
                                  <Trash2 className='size-3.5 me-2' /> Hapus Permanen
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/tamu/${tamu.id}`}>
                                    <Eye className='size-3.5 me-2' /> Lihat Detail
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateOpen(tamu)}>
                                  <Edit className='size-3.5 me-2' /> Update Status Follow-Up
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className='text-primary font-medium text-xs'
                                  onClick={() => handleSendRegistrationLink(tamu.whatsApp || tamu.noHp || '', tamu.nama)}
                                >
                                  <MessageSquare className='size-3.5 me-2 text-primary' /> Kirim Link Form Jemaat (/daftar)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className='text-emerald-600 dark:text-emerald-400 font-semibold text-xs'
                                  onClick={() => setConvertTarget(tamu)}
                                >
                                  <Sparkles className='size-3.5 me-2' /> Konversi ke Jemaat Tetap
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                  onClick={() => setDeleteTarget(tamu)}
                                >
                                  <Trash2 className='size-3.5 me-2' /> Soft Delete Tamu
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

      {/* ── Dialog Catat Slip Tamu Baru ───────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreateForm() }}>
        <DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Catat Slip Tamu Baru</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Daftarkan pengunjung baru yang hadir untuk kebutuhan follow-up dan pendampingan pastoral.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Nama Lengkap *</Label>
                <Input
                  placeholder='Contoh: Bpk. Yohanes Siregar'
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Nama Panggilan</Label>
                  <Input
                    placeholder='Contoh: Yohanes'
                    value={namaPanggilan}
                    onChange={(e) => setNamaPanggilan(e.target.value)}
                    className='text-xs h-9'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs'>Jenis Kelamin *</Label>
                  <Select value={jenisKelamin} onValueChange={(val) => setJenisKelamin(val as any)}>
                    <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='LAK_LAKI' className='text-xs'>Laki-Laki</SelectItem>
                      <SelectItem value='PEREMPUAN' className='text-xs'>Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Nomor Handphone / WhatsApp</Label>
                  <Input
                    placeholder='Contoh: 08123456789'
                    value={noHp}
                    onChange={(e) => { setNoHp(e.target.value); setWhatsApp(e.target.value) }}
                    className='text-xs h-9'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs'>Alamat Email</Label>
                  <Input
                    type='email'
                    placeholder='Contoh: yohanes@gmail.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='text-xs h-9'
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Alamat Domisili</Label>
                <Textarea
                  placeholder='Alamat tempat tinggal di Padang...'
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className='text-xs'
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Catatan Pastoral Awal (Opsional)</Label>
                <Textarea
                  placeholder='Contoh: Pertama kali hadir diajak oleh Kel. Hendra, meminta pokok doa untuk keluarga...'
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className='text-xs'
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => { setCreateOpen(false); resetCreateForm() }} disabled={isCreating}>
                Batal
              </Button>
              <Button type='submit' disabled={isCreating} className='gap-2'>
                {isCreating ? <Loader2 className='size-4 animate-spin' /> : <UserPlus className='size-4' />}
                {isCreating ? 'Menyimpan...' : 'Simpan Slip Tamu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Update Status Follow-Up ─────────────────────── */}
      <Dialog open={!!updateTarget} onOpenChange={(o) => { if (!o) setUpdateTarget(null) }}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Update Status Follow-Up</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Perbarui tahapan pastoral untuk tamu <strong className='text-foreground'>{updateTarget?.nama}</strong>.
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
              <Button variant='outline' type='button' onClick={() => setUpdateTarget(null)} disabled={isUpdating}>
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
      <AlertDialog open={!!convertTarget} onOpenChange={() => setConvertTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <Sparkles className='size-5' /> Konversi Tamu Menjadi Jemaat Tetap?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Tamu <strong className='text-foreground'>{convertTarget?.nama}</strong> akan dikonversi menjadi Jemaat Tetap dengan status <strong className='text-emerald-600 dark:text-emerald-400'>ACTIVE</strong>.
                </span>
                <span className='block text-xs text-muted-foreground'>
                  Sistem akan menerbitkan <strong>Nomor Induk Jemaat (NIJ)</strong> dan <strong>Barcode Code Presensi</strong> resmi secara otomatis. Transaksi aman terlindungi dengan log audit SHA-256.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setConvertTarget(null)} disabled={isConverting}>
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

      {/* ── AlertDialog Soft Delete Tamu ──────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeletionReason('') }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>
              Hapus Data Tamu Ini?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Tamu <strong className='text-foreground'>{deleteTarget?.nama}</strong> akan dinonaktifkan via Soft Delete.
                </span>
                <span className='block text-xs text-muted-foreground'>
                  Data tidak akan hilang dari database dan dapat dipulihkan kembali kapan saja melalui filter status terhapus.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan (Wajib):</label>
            <Textarea
              placeholder='Masukkan alasan penghapusan data tamu ini...'
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

      {/* ── AlertDialog Restore Tamu Confirm ──────────────────── */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Data Tamu?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Data tamu <strong className='text-foreground'>{restoreTarget?.nama}</strong> akan dipulihkan ke daftar aktif.
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
              Ya, Pulihkan Data
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Hard Delete Tamu Confirm ──────────────── */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5 text-rose-600' /> Hapus Permanen Data Tamu?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs'>
                  ⚠️ <strong>PERINGATAN</strong>: Data tamu <strong className='text-foreground'>{hardDeleteTarget?.nama}</strong> akan dihapus secara PERMANEN dari database. Tindakan ini tidak dapat dibatalkan.
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
    </div>
  )
}
