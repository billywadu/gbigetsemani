'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  HeartHandshake,
  Search,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  Lock,
  Users,
  HeartPulse,
  Briefcase,
  Sparkles,
  Coins,
  HelpCircle,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Send,
  Loader2,
  UserCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FilterX,
  Check,
  Printer,
  MessageSquare,
  Download,
  Copy,
  ExternalLink,
  X,
  FileSpreadsheet,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination as SwiperPagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import {
  getPermohonanDoaListAction,
  createPermohonanDoaAdminAction,
  updateStatusDoaAction,
  softDeleteDoaAction,
  bulkUpdateStatusDoaAction,
  bulkSoftDeleteDoaAction,
  getDoaForPrintSheetsAction,
} from '@/actions/doa'
import { getWhatsAppTemplatesAction } from '@/actions/whatsapp-template'
import { formatWhatsAppMessage } from '@/lib/whatsapp-helpers'
import { DEFAULT_WHATSAPP_TEMPLATES_CONFIG, WhatsAppTemplatesConfig } from '@/lib/validations/whatsapp-template'
import {
  PermohonanDoaDTO,
  PermohonanDoaStatsDTO,
  STATUS_DOA_OPTIONS,
  KATEGORI_DOA_OPTIONS,
  PRIVASI_DOA_OPTIONS,
} from '@/lib/validations/doa'
import { toast } from 'sonner'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'
import { getAppProfileAction } from '@/actions/app-profile'

type SortField = 'namaPemohon' | 'kategori' | 'privasi' | 'status' | 'createdAt'
type SortOrder = 'asc' | 'desc'

export default function DashboardDoaPage() {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<PermohonanDoaDTO[]>([])
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplatesConfig>(DEFAULT_WHATSAPP_TEMPLATES_CONFIG)
  const [churchName, setChurchName] = useState('Gereja')
  const [stats, setStats] = useState<PermohonanDoaStatsDTO>({
    total: 0,
    baru: 0,
    sedangDidoakan: 0,
    selesai: 0,
    terjawab: 0,
  })

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [kategoriFilter, setKategoriFilter] = useState('ALL')
  const [privasiFilter, setPrivasiFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Table Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({
    pemohon: true,
    pokokDoa: true,
    status: true,
    tanggal: true,
  })

  // Table Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Detail & Action Modal State
  const [activeItem, setActiveItem] = useState<PermohonanDoaDTO | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [modalStatus, setModalStatus] = useState<PermohonanDoaDTO['status']>('BARU')
  const [modalPendoa, setModalPendoa] = useState('')
  const [modalCatatan, setModalCatatan] = useState('')
  const [updating, setUpdating] = useState(false)

  // Bulk Actions States
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false)
  const [bulkStatusValue, setBulkStatusValue] = useState<'BARU' | 'SEDANG_DIDOAKAN' | 'SELESAI'>('SEDANG_DIDOAKAN')
  const [bulkPendoa, setBulkPendoa] = useState('')
  const [bulkCatatan, setBulkCatatan] = useState('')
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false)

  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState('')
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const [printSheetsModalOpen, setPrintSheetsModalOpen] = useState(false)
  const [printSheetsData, setPrintSheetsData] = useState<any[]>([])
  const [isLoadingPrintSheets, setIsLoadingPrintSheets] = useState(false)

  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [copiedContacts, setCopiedContacts] = useState(false)

  // Create Modal State (Manual entry for offline/prayer box)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createNama, setCreateNama] = useState('')
  const [createIsAnonim, setCreateIsAnonim] = useState(false)
  const [createKontakWa, setCreateKontakWa] = useState('')
  const [createKategori, setCreateKategori] = useState<'KESEHATAN' | 'KELUARGA' | 'PEKERJAAN' | 'ROHANI' | 'KEUANGAN' | 'LAINNYA'>('LAINNYA')
  const [createPrivasi, setCreatePrivasi] = useState<'TIM_DOA_PUBLIK' | 'RAHASIA_PASTORAL'>('TIM_DOA_PUBLIK')
  const [createIsiDoa, setCreateIsiDoa] = useState('')

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createIsAnonim && !createNama.trim()) {
      toast.error('Nama pemohon wajib diisi atau centang opsi Anonim.')
      return
    }
    if (!createIsiDoa.trim() || createIsiDoa.trim().length < 10) {
      toast.error('Isi pokok doa wajib diisi minimal 10 karakter.')
      return
    }

    setIsCreating(true)
    const res = await createPermohonanDoaAdminAction({
      namaPemohon: createIsAnonim ? 'Anonim' : createNama.trim(),
      isAnonim: createIsAnonim,
      kontakWa: createKontakWa.trim() || undefined,
      kategori: createKategori,
      privasi: createPrivasi,
      isiDoa: createIsiDoa.trim(),
    })
    setIsCreating(false)

    if (res.success) {
      toast.success('Permohonan doa berhasil ditambahkan ke sistem!')
      setCreateModalOpen(false)
      setCreateNama('')
      setCreateIsAnonim(false)
      setCreateKontakWa('')
      setCreateKategori('LAINNYA')
      setCreatePrivasi('TIM_DOA_PUBLIK')
      setCreateIsiDoa('')
      loadData()
    } else {
      toast.error(res.error || 'Gagal menambahkan permohonan doa.')
    }
  }

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPermohonanDoaListAction({
        query: searchQuery,
        status: statusFilter,
        kategori: kategoriFilter,
        privasi: privasiFilter,
        page,
        pageSize,
      })

      if (res.success) {
        setItems(res.data)
        setStats(res.stats)
        setTotalPages(res.pagination.totalPages)
        setTotalCount(res.pagination.totalCount)
      } else {
        toast.error(res.error || 'Gagal memuat daftar doa.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Terjadi kesalahan memuat data.')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, kategoriFilter, privasiFilter, page, pageSize])

  useEffect(() => {
    loadData()
    getWhatsAppTemplatesAction().then((res) => {
      if (res.success && res.data) setWaTemplates(res.data)
    })
    getAppProfileAction().then((res) => {
      if (res.success && res.data) {
        setChurchName(res.data.namaSingkat || res.data.namaResmi || 'Gereja')
      }
    })
  }, [loadData])

  // Sorted items for client-side sorting view
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let aVal: any = a[sortField] || ''
      let bVal: any = b[sortField] || ''

      if (sortField === 'createdAt') {
        aVal = new Date(a.createdAt).getTime()
        bVal = new Date(b.createdAt).getTime()
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
return 0
    })
  }, [items, sortField, sortOrder])

  // Selection handlers
  const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id])
  const selectedCount = selectedIds.length
  const isAllSelected = items.length > 0 && items.every((item) => selectedRows[item.id])

  const selectedDoaData = items.filter((item) => selectedRows[item.id])
  const validPrayerContacts = selectedDoaData
    .map((item) => ({
      nama: item.namaPemohon,
      noHp: (item.kontakWa || '').replace(/[^0-9]/g, ''),
      kategori: item.kategori,
      isiDoa: item.isiDoa,
    }))
    .filter((c) => c.noHp.length >= 8)

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    items.forEach((item) => {
      updated[item.id] = checked
    })
    setSelectedRows(updated)
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows((prev) => ({ ...prev, [id]: checked }))
  }

  // 1. Export CSV Handler
  const handleExportCsv = () => {
    const targets = selectedCount > 0 ? selectedDoaData : items

    if (targets.length === 0) {
      toast.error('Tidak ada permohonan doa untuk diekspor.')
      return
    }

    const headers = [
      'Nama Pemohon',
      'Anonim',
      'No. WhatsApp',
      'Kategori Kebutuhan',
      'Tingkat Privasi',
      'Isi Permohonan Doa',
      'Status Pelayanan',
      'Didoakan Oleh',
      'Catatan Pastoral',
      'Tanggal Permohonan',
    ]

    const rows = targets.map((item) => [
      `"${(item.namaPemohon || '').replace(/"/g, '""')}"`,
      `"${item.isAnonim ? 'YA' : 'TIDAK'}"`,
      `"${item.kontakWa || '-'}"`,
      `"${item.kategori || '-'}"`,
      `"${item.privasi || '-'}"`,
      `"${(item.isiDoa || '').replace(/"/g, '""')}"`,
      `"${item.status || 'BARU'}"`,
      `"${(item.didoakanOleh || '').replace(/"/g, '""')}"`,
      `"${(item.catatanPastoral || '').replace(/"/g, '""')}"`,
      `"${item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    const cleanChurch = (churchName || 'Gereja').replace(/[^a-zA-Z0-9]/g, '_')
    link.setAttribute('download', `Pokok_Doa_${cleanChurch}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${targets.length} pokok doa ke CSV.`)
  }

  // 2. Direct Print Prayer Request Sheets (Without Preview Modal)
  const handleOpenPrintSheets = async () => {
    const idsToPrint =
      selectedIds.length > 0
        ? selectedIds
        : items.filter((item) => item.privasi === 'TIM_DOA_PUBLIK').map((i) => i.id)

    if (idsToPrint.length === 0) {
      toast.error('Tidak ada pokok doa publik yang dapat dicetak.')
      return
    }
    const toastId = toast.loading('Menyiapkan lembar pokok doa...')
    setIsLoadingPrintSheets(true)
    const res = await getDoaForPrintSheetsAction(idsToPrint)
    setIsLoadingPrintSheets(false)
    toast.dismiss(toastId)

    if (!res.success || !res.data || res.data.length === 0) {
      toast.error(res.error || 'Gagal memuat data lembar pokok doa.')
      return
    }

    const printSheetsData = res.data
    const printConfig = await getEffectivePrintConfig()

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const rowsHtml = printSheetsData.map((item: any, idx: number) => {
      // Privacy safeguard for public printouts
      const displayName = item.privasi === 'RAHASIA_PASTORAL' || item.isAnonim
        ? 'Hamba Tuhan (Anonim/Pastoral)'
        : item.namaPemohon

      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700; color: #0f172a;">${displayName}</td>
          <td style="font-size: 9.5px; font-weight: 700; color: #475569; text-transform: uppercase;">
            ${(item.kategori || 'LAINNYA').replace(/_/g, ' ')}
          </td>
          <td style="font-size: 10px; color: #1e293b; line-height: 1.4;">${item.isiDoa || '-'}</td>
          <td style="text-align: center; font-size: 9px; font-weight: 700;">
            <span style="border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; background: #f8fafc;">
              ${item.status || 'BARU'}
            </span>
          </td>
          <td style="text-align: center; width: 35px;">
            <div style="width: 14px; height: 14px; border: 1.5px solid #64748b; border-radius: 3px; margin: 0 auto;"></div>
          </td>
        </tr>
      `
    }).join('')

    const kopHtml = buildKopHtml(printConfig, {
      badgeText: 'MENARA DOA & SYAFAAT',
      dateText: `Total: ${printSheetsData.length} Pokok Doa • ${new Date().toLocaleDateString('id-ID')}`,
    })

    const signaturesHtml = buildSignaturesHtml(printConfig, [
      { roleKey: 'koordinatorKomsel', customTitle: 'Koordinator Tim Doa Syafaat' },
      { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
    ])

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Lembar Pokok Doa Syafaat (${printSheetsData.length} Pokok Doa) - ${printConfig.kop.namaGereja}</title>
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
          .notice-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 9.5px;
            color: #475569;
            margin-bottom: 12px;
          }
          .prayer-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 20px;
          }
          .prayer-table th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            font-weight: 800;
            text-align: left;
          }
          .prayer-table td {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        ${kopHtml}

        <div class="notice-box">
          📖 <em>"Sebab di mana dua atau tiga orang berkumpul dalam Nama-Ku, di situ Aku ada di tengah-tengah mereka."</em> (Matius 18:20)
          • Seluruh pokok doa di bawah ini telah disaring dengan tingkat kerahasiaan pastoral untuk perlindungan privasi jemaat.
        </div>

        <table class="prayer-table">
          <thead>
            <tr>
              <th style="width: 25px;">No</th>
              <th style="width: 140px;">Nama Pemohon</th>
              <th style="width: 110px;">Kategori</th>
              <th>Isi Permohonan Doa</th>
              <th style="width: 80px; text-align: center;">Status</th>
              <th style="width: 35px; text-align: center;">✓</th>
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
    const res = await bulkUpdateStatusDoaAction({
      ids: selectedIds,
      status: bulkStatusValue,
      didoakanOleh: bulkPendoa,
      catatanPastoral: bulkCatatan,
    })
    setIsBulkUpdatingStatus(false)
    if (res.success) {
      toast.success(res.message)
      setBulkStatusModalOpen(false)
      setBulkPendoa('')
      setBulkCatatan('')
      setSelectedRows({})
      loadData()
    } else {
      toast.error(res.error || 'Gagal memperbarui status doa.')
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
    const res = await bulkSoftDeleteDoaAction({
      ids: selectedIds,
      reason: bulkDeleteReason.trim(),
    })
    setIsBulkDeleting(false)
    if (res.success) {
      toast.success(res.message)
      setBulkDeleteModalOpen(false)
      setBulkDeleteReason('')
      setSelectedRows({})
      loadData()
    } else {
      toast.error(res.error || 'Gagal menghapus data permohonan doa.')
    }
  }

  // 5. Copy All Contacts
  const handleCopyAllContacts = () => {
    if (validPrayerContacts.length === 0) return
    const contactLines = validPrayerContacts
      .map((c) => `${c.nama} (${c.kategori}): ${c.noHp}`)
      .join('\n')
    navigator.clipboard.writeText(contactLines)
    setCopiedContacts(true)
    toast.success(`${validPrayerContacts.length} nomor WhatsApp pemohon doa berhasil disalin!`)
    setTimeout(() => setCopiedContacts(false), 2500)
  }

  // Batch Mark as Prayed
  const handleBatchMarkPrayed = async () => {
    const ids = Object.keys(selectedRows).filter((id) => selectedRows[id])
    if (ids.length === 0) return

    setLoading(true)
    try {
      let successCount = 0
      for (const id of ids) {
        const res = await updateStatusDoaAction({
          id,
          status: 'SELESAI',
          didoakanOleh: `Tim Doa ${churchName || 'Gereja'}`,
        })
        if (res.success) successCount++
      }
      toast.success(`${successCount} permohonan doa berhasil ditandai selesai didoakan.`)
      setSelectedRows({})
      loadData()
    } catch (err) {
      toast.error('Gagal memperbarui beberapa permohonan doa.')
    } finally {
      setLoading(false)
    }
  }

  // Open Detail / Action Modal
  const handleOpenDetail = (item: PermohonanDoaDTO) => {
    setActiveItem(item)
    setModalStatus(item.status)
    setModalPendoa(item.didoakanOleh || 'Tim Pastoral')
    setModalCatatan(item.catatanPastoral || '')
    setDetailModalOpen(true)
  }

  // Save Status / Note Updates
  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeItem) return

    setUpdating(true)
    try {
      const res = await updateStatusDoaAction({
        id: activeItem.id,
        status: modalStatus,
        didoakanOleh: modalPendoa.trim() || undefined,
        catatanPastoral: modalCatatan.trim() || undefined,
      })

      if (res.success) {
        toast.success('Status pelayanan doa berhasil diperbarui!')
        setDetailModalOpen(false)
        loadData()
      } else {
        toast.error(res.error || 'Gagal memperbarui status.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setUpdating(false)
    }
  }

  // Soft Delete
  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus permohonan doa dari "${nama}"?`)) return
    try {
      const res = await softDeleteDoaAction(id)
      if (res.success) {
        toast.success('Permohonan doa berhasil dihapus.')
        loadData()
      } else {
        toast.error(res.error)
      }
    } catch (err) {
      toast.error('Gagal menghapus permohonan doa.')
    }
  }

  // WhatsApp 1-Click Generator
  const getWhatsAppLink = (item: PermohonanDoaDTO) => {
    if (!item.kontakWa) return null
    let cleanPhone = item.kontakWa.replace(/[^0-9]/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1)
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone
    }

    const sapaan = item.isAnonim ? 'Bpk/Ibu/Sdr/i' : item.namaPemohon
    const template = waTemplates.RESPON_DOA || DEFAULT_WHATSAPP_TEMPLATES_CONFIG.RESPON_DOA
    const msg = formatWhatsAppMessage(template, {
      nama: sapaan,
      kategoriDoa: item.kategori || 'Pokok Doa',
      namaGereja: churchName,
      namaPendoa: 'Tim Doa & Pastoral',
    })
    const text = encodeURIComponent(msg)
    return `https://wa.me/${cleanPhone}?text=${text}`
  }

  const getStatusBadge = (status: PermohonanDoaDTO['status']) => {
    const opt = STATUS_DOA_OPTIONS.find((s) => s.value === status)
    return (
      <Badge variant='outline' className={`text-[10px] font-semibold ${opt?.badgeClass || 'bg-muted'}`}>
        {opt?.label || status}
      </Badge>
    )
  }

  const getCategoryBadge = (kategori: PermohonanDoaDTO['kategori']) => {
    const opt = KATEGORI_DOA_OPTIONS.find((k) => k.value === kategori)
    return (
      <Badge variant='outline' className='text-[10px] font-medium bg-muted/40'>
        {opt?.label || kategori}
      </Badge>
    )
  }

  // Column Header with sorting & hide dropdown (Identical to Jemaat page)
  const renderColumnHeader = (
    title: string,
    field?: SortField,
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
                <ArrowUp className='size-3.5 text-primary' />
              ) : (
                <ArrowDown className='size-3.5 text-primary' />
              )
            ) : (
              field && <ArrowUpDown className='size-3.5 opacity-40' />
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
    <div className='space-y-6 max-w-7xl pb-16'>
      {/* Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div className='flex items-start sm:items-center gap-3'>
          <div className='p-2 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5 sm:mt-0'>
            <HeartHandshake className='size-5' />
          </div>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Permohonan Doa</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Kelola pokok doa jemaat dan tindak lanjut pastoral.
            </p>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2 w-full sm:w-auto'>
          <Button
            size='sm'
            onClick={() => setCreateModalOpen(true)}
            className='h-8 text-xs gap-1.5 font-semibold shadow-xs'
          >
            <Plus className='size-3.5' /> Tambah Pokok Doa
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={handleOpenPrintSheets}
            className='h-8 text-xs gap-1.5 font-medium'
            title='Cetak Lembar Warta Pokok Doa Syafaat A4'
          >
            <Printer className='size-3.5' /> Cetak Lembar Doa
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={loadData}
            className='gap-1.5 text-xs h-8'
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Bar Carousel */}
      <div className='w-full'>
        <Swiper
          modules={[SwiperPagination]}
          pagination={{ clickable: true }}
          spaceBetween={12}
          slidesPerView={1.2}
          breakpoints={{
            480: { slidesPerView: 2, spaceBetween: 12 },
            640: { slidesPerView: 3, spaceBetween: 16 },
            1024: { slidesPerView: 5, spaceBetween: 16 },
          }}
          className='kpi-swiper pb-7! sm:pb-0!'
        >
          {/* KPI 1: Total */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs bg-card p-4 h-full border rounded-xl flex items-center gap-3'>
              <div className='size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0'>
                <HeartHandshake className='size-5' />
              </div>
              <div className='min-w-0'>
                <div className='text-xl font-bold font-mono text-foreground'>{stats.total}</div>
                <div className='text-xs text-muted-foreground truncate'>Total Masuk</div>
              </div>
            </Card>
          </SwiperSlide>

          {/* KPI 2: Baru */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs p-4 h-full border rounded-xl flex items-center gap-3 border-rose-500/20 bg-rose-500/5'>
              <div className='size-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0'>
                <Clock className='size-5' />
              </div>
              <div className='min-w-0'>
                <div className='text-xl font-bold font-mono text-rose-600'>{stats.baru}</div>
                <div className='text-xs text-muted-foreground truncate'>Perlu Didoakan</div>
              </div>
            </Card>
          </SwiperSlide>

          {/* KPI 3: Sedang Didoakan */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs p-4 h-full border rounded-xl flex items-center gap-3 border-amber-500/20 bg-amber-500/5'>
              <div className='size-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0'>
                <Sparkles className='size-5' />
              </div>
              <div className='min-w-0'>
                <div className='text-xl font-bold font-mono text-amber-600'>{stats.sedangDidoakan}</div>
                <div className='text-xs text-muted-foreground truncate'>Sedang Didoakan</div>
              </div>
            </Card>
          </SwiperSlide>

          {/* KPI 4: Sudah Didoakan */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs p-4 h-full border rounded-xl flex items-center gap-3 border-blue-500/20 bg-blue-500/5'>
              <div className='size-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0'>
                <UserCheck className='size-5' />
              </div>
              <div className='min-w-0'>
                <div className='text-xl font-bold font-mono text-blue-600'>{stats.selesai}</div>
                <div className='text-xs text-muted-foreground truncate'>Sudah Didoakan</div>
              </div>
            </Card>
          </SwiperSlide>

          {/* KPI 5: Terjawab */}
          <SwiperSlide className='h-auto'>
            <Card className='shadow-xs p-4 h-full border rounded-xl flex items-center gap-3 border-emerald-500/20 bg-emerald-500/5'>
              <div className='size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0'>
                <CheckCircle2 className='size-5' />
              </div>
              <div className='min-w-0'>
                <div className='text-xl font-bold font-mono text-emerald-600'>{stats.terjawab}</div>
                <div className='text-xs text-muted-foreground truncate'>Doa Terjawab</div>
              </div>
            </Card>
          </SwiperSlide>
        </Swiper>
      </div>

      {/* Toolbar & Filters (Modeled directly after Jemaat page) */}
      <Card className='shadow-xs p-3.5'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          {/* Left: Search & Filter Facets */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2 flex-1'>
            <div className='relative w-full sm:w-64'>
              <Search className='size-4 absolute left-2.5 top-2.5 text-muted-foreground' />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                placeholder='Cari nama, isi doa, WA...'
                className='text-xs ps-8 h-8 w-full'
              />
            </div>

            <div className='grid grid-cols-2 sm:flex sm:flex-row items-center gap-2'>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className='h-8 text-xs w-full sm:w-35'>
                  <SelectValue placeholder='Semua Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL' className='text-xs'>Semua Status</SelectItem>
                  {STATUS_DOA_OPTIONS.map((st) => (
                    <SelectItem key={st.value} value={st.value} className='text-xs'>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={kategoriFilter}
                onValueChange={(val) => {
                  setKategoriFilter(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className='h-8 text-xs w-full sm:w-37.5'>
                  <SelectValue placeholder='Semua Kategori' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL' className='text-xs'>Semua Kategori</SelectItem>
                  {KATEGORI_DOA_OPTIONS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className='text-xs'>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={privasiFilter}
                onValueChange={(val) => {
                  setPrivasiFilter(val)
                  setPage(1)
                }}
              >
                <SelectTrigger className='h-8 text-xs w-full sm:w-35'>
                  <SelectValue placeholder='Semua Privasi' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL' className='text-xs'>Semua Privasi</SelectItem>
                  <SelectItem value='TIM_DOA_PUBLIK' className='text-xs'>Tim Doa Syafaat</SelectItem>
                  <SelectItem value='RAHASIA_PASTORAL' className='text-xs'>Rahasia Pastoral</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || statusFilter !== 'ALL' || kategoriFilter !== 'ALL' || privasiFilter !== 'ALL') && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('ALL')
                    setKategoriFilter('ALL')
                    setPrivasiFilter('ALL')
                    setPage(1)
                  }}
                  className='h-8 px-2 text-xs gap-1 text-muted-foreground shrink-0'
                >
                  Reset <FilterX className='size-3' />
                </Button>
              )}
            </div>
          </div>

          {/* Right: View Switcher & Column Visibility Toggle */}
          <div className='flex items-center justify-between sm:justify-end gap-2 w-full lg:w-auto pt-1 lg:pt-0 border-t lg:border-t-0'>
            {/* View Mode Segmented Switcher */}
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
                <TableIcon className='size-3.5' /> <span>Tabel</span>
              </Button>
              <Button
                type='button'
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('card')}
                className={`h-7 px-2.5 text-xs gap-1.5 ${
                  viewMode === 'card' ? 'shadow-xs font-semibold' : 'text-muted-foreground'
                }`}
                title='Tampilan Kartu'
              >
                <LayoutGrid className='size-3.5' /> <span>Kartu</span>
              </Button>
            </div>

            {/* View / Column Toggle (Identical to Jemaat View Button) */}
            {viewMode === 'table' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm' className='h-8 gap-1.5 text-xs'>
                    <SlidersHorizontal className='size-3.5' /> Kolom
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-44'>
                  <DropdownMenuLabel className='text-xs'>Tampilan Kolom</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.pemohon}
                    onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, pemohon: !!c }))}
                  >
                    Pemohon & Kontak
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.pokokDoa}
                    onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, pokokDoa: !!c }))}
                  >
                    Pokok Doa & Kategori
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.status}
                    onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, status: !!c }))}
                  >
                    Status & Privasi
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.tanggal}
                    onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, tanggal: !!c }))}
                  >
                    Tanggal Masuk
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Batch Action Floating Bar */}
        {selectedCount > 0 && (
          <div className='mt-3 pt-3 border-t flex items-center justify-between gap-3 text-xs bg-primary/5 p-2 rounded-lg border border-primary/20 animate-in fade-in-50 duration-200'>
            <div className='flex items-center gap-2'>
              <Badge variant='default' className='text-xs font-mono'>
                {selectedCount}
              </Badge>
              <span className='font-medium text-foreground'>pokok doa dipilih</span>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleBatchMarkPrayed}
                className='h-7 text-xs gap-1 text-blue-600 border-blue-500/30'
              >
                <UserCheck className='size-3.5' /> Tandai Selesai ({selectedCount})
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setSelectedRows({})}
                className='h-7 text-xs text-muted-foreground'
              >
                Batal
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Main Content: Table or Card View */}
      {loading ? (
        <div className='flex items-center justify-center min-h-75 text-muted-foreground text-xs gap-2 bg-card rounded-xl border'>
          <Loader2 className='size-4 animate-spin text-primary' /> Memuat data permohonan doa...
        </div>
      ) : sortedItems.length === 0 ? (
        <div className='text-center py-16 bg-card rounded-xl border p-6 space-y-2'>
          <HeartHandshake className='size-10 text-muted-foreground mx-auto opacity-40' />
          <div className='font-bold text-sm text-foreground'>Tidak Ada Permohonan Doa Ditemukan</div>
          <p className='text-xs text-muted-foreground max-w-sm mx-auto'>
            Tidak ada permohonan doa yang cocok dengan kriteria filter saat ini.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* ── TABLE VIEW (Full Jemaat Style) ────────────────────────── */
        <Card className='shadow-xs overflow-hidden border rounded-xl'>
          <div className='overflow-x-auto'>
            <Table className='text-xs'>
              <TableHeader>
                <TableRow className='bg-muted/40'>
                  {/* Select All Checkbox */}
                  <TableHead className='w-10 px-3'>
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(c) => handleSelectAll(!!c)}
                      aria-label='Pilih semua data'
                    />
                  </TableHead>

                  {visibleColumns.pemohon && (
                    <TableHead className='min-w-44'>
                      {renderColumnHeader('Pemohon & Kontak', 'namaPemohon', 'pemohon')}
                    </TableHead>
                  )}

                  {visibleColumns.pokokDoa && (
                    <TableHead className='min-w-64'>
                      {renderColumnHeader('Pokok Doa & Kategori', 'kategori', 'pokokDoa')}
                    </TableHead>
                  )}

                  {visibleColumns.status && (
                    <TableHead className='w-36'>
                      {renderColumnHeader('Status & Privasi', 'status', 'status')}
                    </TableHead>
                  )}

                  {visibleColumns.tanggal && (
                    <TableHead className='w-28'>
                      {renderColumnHeader('Tanggal', 'createdAt', 'tanggal')}
                    </TableHead>
                  )}

                  <TableHead className='text-right w-16 font-bold'>Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedItems.map((item) => {
                  const createdDate = new Date(item.createdAt)
                  const waLink = getWhatsAppLink(item)
                  const isChecked = !!selectedRows[item.id]

                  return (
                    <TableRow
                      key={item.id}
                      data-state={isChecked ? 'selected' : undefined}
                      className='hover:bg-muted/25 transition-colors'
                    >
                      {/* Row Checkbox */}
                      <TableCell className='px-3 py-2.5'>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(c) => handleSelectRow(item.id, !!c)}
                          aria-label={`Pilih ${item.namaPemohon}`}
                        />
                      </TableCell>

                      {/* Pemohon & Kontak */}
                      {visibleColumns.pemohon && (
                        <TableCell className='font-medium py-2.5'>
                          <div className='font-bold text-foreground text-xs leading-snug'>{item.namaPemohon}</div>
                          <div className='flex items-center gap-1.5 pt-0.5'>
                            {item.isAnonim && (
                              <span className='text-[10px] text-muted-foreground italic'>(Anonim)</span>
                            )}
                            {item.kontakWa ? (
                              <div className='flex items-center gap-1 font-mono text-[11px] text-muted-foreground'>
                                <Phone className='size-2.5 text-emerald-600 shrink-0' />
                                <span>{item.kontakWa}</span>
                                {waLink && (
                                  <a
                                    href={waLink}
                                    target='_blank'
                                    rel='noreferrer'
                                    className='text-emerald-600 hover:text-emerald-700'
                                    title='Chat WhatsApp'
                                  >
                                    <MessageCircle className='size-3' />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className='text-muted-foreground text-[10px]'>-</span>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Pokok Doa & Kategori */}
                      {visibleColumns.pokokDoa && (
                        <TableCell className='py-2.5 max-w-md'>
                          <div className='flex items-center gap-1.5 mb-1'>
                            {getCategoryBadge(item.kategori)}
                          </div>
                          <p
                            className='line-clamp-2 text-xs text-foreground/90 leading-relaxed cursor-pointer hover:text-primary'
                            onClick={() => handleOpenDetail(item)}
                            title='Klik untuk melihat rincian isi doa'
                          >
                            {item.isiDoa}
                          </p>
                        </TableCell>
                      )}

                      {/* Status & Privasi */}
                      {visibleColumns.status && (
                        <TableCell className='py-2.5'>
                          <div className='space-y-1'>
                            <div>{getStatusBadge(item.status)}</div>
                            <div>
                              {item.privasi === 'RAHASIA_PASTORAL' ? (
                                <Badge variant='outline' className='text-[9.5px] bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 px-1.5 py-0'>
                                  <Lock className='size-2.5' /> Rahasia
                                </Badge>
                              ) : (
                                <Badge variant='outline' className='text-[9.5px] bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1 px-1.5 py-0'>
                                  <Users className='size-2.5' /> Tim Doa
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {/* Tanggal Masuk */}
                      {visibleColumns.tanggal && (
                        <TableCell className='text-[11px] font-mono text-muted-foreground whitespace-nowrap py-2.5'>
                          {createdDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                      )}

                      {/* Aksi Dropdown */}
                      <TableCell className='text-right'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='icon' className='size-7'>
                              <MoreHorizontal className='size-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-44 text-xs'>
                            <DropdownMenuItem onClick={() => handleOpenDetail(item)} className='gap-2'>
                              <Edit className='size-3.5' /> Detail & Status
                            </DropdownMenuItem>

                            {waLink && (
                              <DropdownMenuItem asChild className='gap-2 text-emerald-600'>
                                <a href={waLink} target='_blank' rel='noreferrer'>
                                  <MessageCircle className='size-3.5' /> Chat WhatsApp
                                </a>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleDelete(item.id, item.namaPemohon)}
                              className='gap-2 text-destructive'
                            >
                              <Trash2 className='size-3.5' /> Hapus Doa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        /* ── CARD VIEW ─────────────────────────────────────── */
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          {sortedItems.map((item) => {
            const createdDate = new Date(item.createdAt)
            const waLink = getWhatsAppLink(item)

            return (
              <Card key={item.id} className='shadow-xs bg-card p-4 border rounded-2xl flex flex-col justify-between hover:border-primary/50 transition-all'>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between gap-2 flex-wrap'>
                    {getCategoryBadge(item.kategori)}
                    {item.privasi === 'RAHASIA_PASTORAL' ? (
                      <Badge variant='outline' className='text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1'>
                        <Lock className='size-2.5' /> Rahasia
                      </Badge>
                    ) : (
                      <Badge variant='outline' className='text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1'>
                        <Users className='size-2.5' /> Tim Doa
                      </Badge>
                    )}
                  </div>

                  <div>
                    <div className='flex items-center justify-between gap-2'>
                      <div className='font-bold text-sm text-foreground truncate'>
                        {item.namaPemohon}
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className='text-[10px] font-mono text-muted-foreground mt-0.5'>
                      {createdDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                    </div>
                  </div>

                  <div className='p-2.5 rounded-lg bg-muted/30 border text-xs text-foreground/90 leading-relaxed line-clamp-4 min-h-18'>
                    {item.isiDoa}
                  </div>

                  {item.catatanPastoral && (
                    <div className='text-[11px] bg-amber-500/5 text-amber-900 dark:text-amber-200 p-2 rounded-lg border border-amber-500/20'>
                      <span className='font-semibold block text-[10px]'>Catatan Pastoral:</span>
                      <span className='line-clamp-2'>{item.catatanPastoral}</span>
                    </div>
                  )}
                </div>

                <div className='pt-3 mt-3 border-t flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-1'>
                    {waLink && (
                      <Button asChild variant='outline' size='sm' className='h-7 px-2 text-[11px] text-emerald-600 gap-1 border-emerald-500/30 bg-emerald-500/5'>
                        <a href={waLink} target='_blank' rel='noreferrer'>
                          <MessageCircle className='size-3' /> WA
                        </a>
                      </Button>
                    )}
                  </div>

                  <div className='flex items-center gap-1 ms-auto'>
                    <Button variant='ghost' size='icon' className='size-7' onClick={() => handleOpenDetail(item)} title='Detail'>
                      <Edit className='size-3.5' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-7 text-rose-600 hover:text-rose-700'
                      onClick={() => handleDelete(item.id, item.namaPemohon)}
                      title='Hapus'
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination Footer */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border-t text-xs text-muted-foreground bg-card rounded-lg'>
        <div className='text-center sm:text-left shrink-0'>
          Menampilkan <span className='font-medium text-foreground'>{sortedItems.length}</span> dari <span className='font-medium text-foreground'>{totalCount}</span> pokok doa
        </div>

        <div className='flex items-center justify-center sm:justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className='h-7 text-xs gap-1'
          >
            <ChevronLeft className='size-3.5' /> Sebelumnya
          </Button>
          <span className='font-mono text-xs whitespace-nowrap px-1'>
            Hal. {page} / {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className='h-7 text-xs gap-1'
          >
            Berikutnya <ChevronRight className='size-3.5' />
          </Button>
        </div>
      </div>

      {/* ── DETAIL & PASTORAL ACTION MODAL ────────────────────── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className='max-w-lg'>
          {activeItem && (
            <form onSubmit={handleSaveDetail} className='space-y-4 text-xs'>
              <DialogHeader className='text-left'>
                <div className='flex items-start gap-2.5'>
                  <div className='p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5'>
                    <HeartHandshake className='size-4' />
                  </div>
                  <div className='min-w-0 flex-1 pr-6 space-y-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <DialogTitle className='text-base sm:text-lg font-bold tracking-tight text-foreground'>
                        Permohonan Doa
                      </DialogTitle>
                      <div className='shrink-0'>{getStatusBadge(modalStatus)}</div>
                    </div>
                    <DialogDescription className='text-xs text-muted-foreground'>
                      Diterima pada {new Date(activeItem.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Sender info */}
              <div className='p-3 bg-muted/30 rounded-xl border space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-foreground text-sm'>{activeItem.namaPemohon}</span>
                  {getCategoryBadge(activeItem.kategori)}
                </div>
                {activeItem.kontakWa && (
                  <div className='flex items-center justify-between pt-1 border-t'>
                    <span className='font-mono text-muted-foreground'>{activeItem.kontakWa}</span>
                    {getWhatsAppLink(activeItem) && (
                      <Button asChild size='sm' variant='outline' className='h-6 px-2 text-[11px] gap-1 text-emerald-600'>
                        <a href={getWhatsAppLink(activeItem)!} target='_blank' rel='noreferrer'>
                          <MessageCircle className='size-3' /> Buka WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Full prayer body */}
              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>Isi Pokok Permohonan Doa</Label>
                <div className='p-3 rounded-xl border bg-card text-foreground leading-relaxed max-h-48 overflow-y-auto'>
                  {activeItem.isiDoa}
                </div>
              </div>

              {/* Status Selector */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Status Pelayanan Doa <span className='text-rose-500'>*</span></Label>
                  <Select value={modalStatus} onValueChange={(val) => setModalStatus(val as any)}>
                    <SelectTrigger className='h-9 text-xs'>
                      <SelectValue placeholder='Pilih Status' />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_DOA_OPTIONS.map((st) => (
                        <SelectItem key={st.value} value={st.value} className='text-xs'>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Didoakan Oleh</Label>
                  <Input
                    value={modalPendoa}
                    onChange={(e) => setModalPendoa(e.target.value)}
                    placeholder='Nama pendoa / tim...'
                    className='text-xs h-9'
                  />
                </div>
              </div>

              {/* Pastoral Notes */}
              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>Catatan Pastoral / Riwayat Konseling</Label>
                <Textarea
                  value={modalCatatan}
                  onChange={(e) => setModalCatatan(e.target.value)}
                  rows={3}
                  placeholder='Tuliskan catatan konseling, ayat firman yang dibagikan, atau perkembangan kesaksian...'
                  className='text-xs'
                />
              </div>

              <DialogFooter className='flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-0 pt-2'>
                <Button type='button' variant='outline' size='sm' onClick={() => setDetailModalOpen(false)} className='w-full sm:w-auto h-8 text-xs font-medium justify-center'>
                  Tutup
                </Button>
                <Button type='submit' size='sm' disabled={updating} className='gap-1.5 text-xs font-semibold w-full sm:w-auto h-8 justify-center'>
                  {updating ? <Loader2 className='size-3.5 animate-spin' /> : <CheckCircle2 className='size-3.5' />}
                  {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
              onClick={handleOpenPrintSheets}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10 rounded-full whitespace-nowrap'
              title='Cetak Lembar Warta Pokok Doa Syafaat A4'
            >
              <Printer className='size-3.5' />
              <span>Cetak Lembar Doa</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setBulkStatusValue('SEDANG_DIDOAKAN')
                setBulkPendoa('')
                setBulkCatatan('')
                setBulkStatusModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ubah Status Pelayanan Doa untuk Pokok Doa Terpilih'
            >
              <HeartHandshake className='size-3.5' />
              <span>Update Status Doa</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => setContactsModalOpen(true)}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 rounded-full whitespace-nowrap'
              title='Kirim Pesan Peneguhan & Salin Kontak WhatsApp Pemohon Doa'
            >
              <MessageSquare className='size-3.5' />
              <span>Kontak WA Pemohon</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleExportCsv}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ekspor data pokok doa terpilih ke CSV / Excel'
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
              title='Hapus pokok doa terpilih (soft delete)'
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

      {/* ── MODAL 1: CETAK LEMBAR POKOK DOA SYAFAAT (A4) ─────────── */}
      <Dialog open={printSheetsModalOpen} onOpenChange={setPrintSheetsModalOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
          <DialogHeader className='p-4 sm:p-5 pb-3 sm:pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0'>
            <div className='min-w-0 flex-1 pe-6 sm:pe-0'>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2 leading-tight'>
                <Printer className='size-5 text-primary shrink-0' />
                <span>Pratinjau Lembar Pokok Doa Syafaat ({printSheetsData.length} Pokok Doa)</span>
              </DialogTitle>
              <DialogDescription className='text-xs mt-0.5'>
                Dokumen warta doa jemaat dengan penyaringan privasi siap cetak A4.
              </DialogDescription>
            </div>
            <Button
              size='sm'
              onClick={handleOpenPrintSheets}
              className='w-full sm:w-auto gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm shrink-0'
            >
              <Printer className='size-4' /> Cetak Dokumen Doa (Print / PDF)
            </Button>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-3 sm:p-6 bg-muted/20'>
            {isLoadingPrintSheets ? (
              <div className='py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs'>
                <Loader2 className='size-6 animate-spin text-primary' />
                <span>Menyiapkan susunan data lembar doa syafaat...</span>
              </div>
            ) : printSheetsData.length === 0 ? (
              <div className='py-12 text-center text-xs text-muted-foreground'>
                Tidak ada data pokok doa yang dapat ditampilkan.
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
                        WARTA & POKOK DOA SYAFAAT JEMAAT
                      </div>
                    </div>
                  </div>
                  <Badge variant='outline' className='font-mono font-bold text-xs bg-primary/5 text-primary'>
                    {printSheetsData.length} Pokok Doa
                  </Badge>
                </div>

                {/* Table */}
                <div className='border rounded-xl overflow-hidden'>
                  <table className='w-full text-xs text-left'>
                    <thead className='bg-muted/60 text-muted-foreground font-semibold border-b'>
                      <tr>
                        <th className='p-2 text-center w-8'>No</th>
                        <th className='p-2'>Nama Pemohon</th>
                        <th className='p-2'>Kategori</th>
                        <th className='p-2'>Isi Permohonan Doa</th>
                        <th className='p-2 text-center'>Status</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y'>
                      {printSheetsData.map((item, idx) => {
                        const displayName = item.privasi === 'RAHASIA_PASTORAL' || item.isAnonim
                          ? 'Hamba Tuhan (Anonim/Pastoral)'
                          : item.namaPemohon

                        return (
                          <tr key={item.id} className='hover:bg-muted/20'>
                            <td className='p-2 text-center text-muted-foreground'>{idx + 1}</td>
                            <td className='p-2 font-bold text-foreground'>{displayName}</td>
                            <td className='p-2 text-muted-foreground uppercase text-[10px] font-semibold'>
                              {(item.kategori || 'LAINNYA').replace(/_/g, ' ')}
                            </td>
                            <td className='p-2 text-foreground leading-relaxed'>{item.isiDoa}</td>
                            <td className='p-2 text-center'>
                              <Badge variant='outline' className='text-[10px] font-mono'>
                                {item.status || 'BARU'}
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
              Format cetak A4 Portrait siap digunakan untuk Menara Doa & Ibadah Doa Fajar.
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPrintSheetsModalOpen(false)}
              className='w-full sm:w-auto'
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: UBAH STATUS DOA MASSAL ─────────────────────── */}
      <Dialog open={bulkStatusModalOpen} onOpenChange={setBulkStatusModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <HeartHandshake className='size-5 text-primary' />
              Update Status Doa ({selectedCount} Pokok Doa)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Perbarui status penanganan pelayanan doa untuk seluruh pokok doa terpilih secara serentak.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Status Pelayanan Doa *</Label>
              <Select value={bulkStatusValue} onValueChange={(v: any) => setBulkStatusValue(v)}>
                <SelectTrigger className='text-xs'>
                  <SelectValue placeholder='Pilih Status...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='BARU'>BARU (Menunggu Penanganan)</SelectItem>
                  <SelectItem value='SEDANG_DIDOAKAN'>SEDANG DIDOAKAN (Aktif di Menara Doa)</SelectItem>
                  <SelectItem value='SELESAI'>SELESAI (Tuntas / Terjawab)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Didoakan Oleh (Opsional):</Label>
              <Input
                placeholder='Contoh: Tim Menara Doa Syafaat / Pdt. Andreas'
                value={bulkPendoa}
                onChange={(e) => setBulkPendoa(e.target.value)}
                className='text-xs'
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Catatan Tambahan (Opsional):</Label>
              <Textarea
                placeholder='Catatan penanganan doa massal...'
                value={bulkCatatan}
                onChange={(e) => setBulkCatatan(e.target.value)}
                className='text-xs min-h-12.5'
              />
            </div>
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
              {isBulkUpdatingStatus ? <Loader2 className='size-4 animate-spin' /> : <CheckCircle2 className='size-4' />}
              {isBulkUpdatingStatus ? 'Memperbarui...' : `Simpan Status (${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: BROADCAST & KONTAK WA PEMOHON DOA ──────────── */}
      <Dialog open={contactsModalOpen} onOpenChange={setContactsModalOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <MessageSquare className='size-5 text-emerald-600' />
              Kontak WhatsApp Pemohon Doa ({selectedCount} Permohonan)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Daftar nomor WhatsApp pemohon doa untuk mengirimkan pesan peneguhan firman dan follow-up pastoral.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <div className='flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20'>
              <div>
                <div className='font-bold text-emerald-800 dark:text-emerald-300 text-xs'>
                  {validPrayerContacts.length} Nomor WA Teridentifikasi
                </div>
                <div className='text-[11px] text-muted-foreground'>
                  Dari total {selectedCount} pokok doa terpilih
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
              {selectedDoaData.map((item) => {
                const rawPhone = (item.kontakWa || '').replace(/[^0-9]/g, '')
                const defaultMsg = encodeURIComponent(
                  `Shalom Bapak/Ibu ${item.namaPemohon},\n\nPermohonan doa Anda mengenai *[${item.kategori}]* telah kami bawa dan doakan dalam Menara Doa ${churchName}.\n\nKiranya damai sejahtera dan anugerah Tuhan Yesus senantiasa menyertai Anda. Tuhan Yesus memberkati! 🙏`
                )
                const waLink = rawPhone ? `https://wa.me/${rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone}?text=${defaultMsg}` : null

                return (
                  <div key={item.id} className='p-2.5 px-3 flex items-center justify-between hover:bg-muted/30 text-xs'>
                    <div>
                      <div className='font-bold text-foreground'>{item.namaPemohon}</div>
                      <div className='text-[11px] text-muted-foreground'>
                        Kategori: <span className='text-foreground font-medium'>{item.kategori}</span>
                      </div>
                    </div>
                    <div>
                      {rawPhone ? (
                        <div className='flex items-center gap-2'>
                          <span className='font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400'>
                            {item.kontakWa}
                          </span>
                          {waLink && (
                            <a
                              href={waLink}
                              target='_blank'
                              rel='noreferrer'
                              className='size-7 rounded-lg border flex items-center justify-center text-emerald-600 hover:bg-emerald-500/10'
                              title='Buka Chat WhatsApp dengan Template Pesan Peneguhan'
                            >
                              <ExternalLink className='size-3.5' />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className='text-muted-foreground italic text-[11px]'>Tanpa Kontak</span>
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

      {/* ── MODAL 4: HAPUS MASSAL POKOK DOA (SOFT DELETE) ───────── */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Pindahkan {selectedCount} Pokok Doa ke Kotak Sampah?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Pokok doa terpilih ({selectedCount} permohonan) akan diarsipkan ke kotak sampah (*soft delete*) dan dapat dipulihkan kapan saja.
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

      {/* ── MODAL 5: TAMBAH POKOK DOA BARU (OFFLINE/SECRETARIAT) ─────── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className='max-w-lg'>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className='text-base font-bold flex items-center gap-2'>
                <HeartHandshake className='size-5 text-primary' />
                Tambah Permohonan Doa Baru
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Catat permohonan doa yang diterima melalui warta, kotak doa gereja, atau telepon pastoral.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3.5 py-3 text-xs'>
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>Nama Pemohon *</Label>
                  <label className='flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer'>
                    <Checkbox
                      checked={createIsAnonim}
                      onCheckedChange={(c) => setCreateIsAnonim(!!c)}
                    />
                    <span>Anonim (Hamba Tuhan)</span>
                  </label>
                </div>
                <Input
                  placeholder='Nama lengkap pemohon doa...'
                  value={createNama}
                  onChange={(e) => setCreateNama(e.target.value)}
                  disabled={createIsAnonim}
                  className='text-xs'
                  required={!createIsAnonim}
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nomor WhatsApp (Opsional)</Label>
                <Input
                  placeholder='Contoh: 08123456789 (untuk konfirmasi/update pastoral)'
                  value={createKontakWa}
                  onChange={(e) => setCreateKontakWa(e.target.value)}
                  className='text-xs'
                />
              </div>

              <div className='grid grid-cols-2 gap-2.5'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Kategori Pokok Doa *</Label>
                  <Select value={createKategori} onValueChange={(val: any) => setCreateKategori(val)}>
                    <SelectTrigger className='text-xs'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KATEGORI_DOA_OPTIONS.map((k) => (
                        <SelectItem key={k.value} value={k.value} className='text-xs'>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Tingkat Privasi *</Label>
                  <Select value={createPrivasi} onValueChange={(val: any) => setCreatePrivasi(val)}>
                    <SelectTrigger className='text-xs'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='TIM_DOA_PUBLIK' className='text-xs'>Tim Doa Syafaat</SelectItem>
                      <SelectItem value='RAHASIA_PASTORAL' className='text-xs'>Rahasia Pastoral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Isi Pokok Doa * (Minimal 10 karakter)</Label>
                <Textarea
                  placeholder='Tuliskan rincian pokok permohonan doa, kebutuhan rohani, atau kondisi medis jemaat...'
                  value={createIsiDoa}
                  onChange={(e) => setCreateIsiDoa(e.target.value)}
                  className='text-xs min-h-25'
                  required
                />
              </div>
            </div>

            <DialogFooter className='gap-2'>
              <Button type='button' variant='outline' onClick={() => setCreateModalOpen(false)} disabled={isCreating}>
                Batal
              </Button>
              <Button type='submit' disabled={isCreating} className='gap-1.5'>
                {isCreating ? <Loader2 className='size-4 animate-spin' /> : <Plus className='size-4' />}
                {isCreating ? 'Menyimpan...' : 'Simpan Pokok Doa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
