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
  ShieldAlert,
  Users,
  Phone,
  MapPin,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  FilterX,
  Loader2,
  Sparkles,
  ShieldCheck,
  Printer,
  MessageSquare,
  Download,
  Copy,
  Check,
  X,
  Send,
  ExternalLink,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
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
  getKeluargaListAction,
  createKeluargaAction,
  deleteKeluargaAction,
  restoreKeluargaAction,
  hardDeleteKeluargaAction,
  bulkSoftDeleteKeluargaAction,
  bulkAssignKomselKeluargaAction,
  getKeluargaForPrintSheetsAction,
  getKeluargaFormOptionsAction,
} from '@/actions/keluarga'
import { getJemaatListAction } from '@/actions/jemaat'
import { toast } from 'sonner'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'

export default function KeluargaListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [keluargaList, setKeluargaList] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown Form Options
  const [formOptions, setFormOptions] = useState<{ komsel: { id: string; nama: string }[] }>({ komsel: [] })

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newNamaKeluarga, setNewNamaKeluarga] = useState('')
  const [newKepalaId, setNewKepalaId] = useState<string>('')
  const [newNoHp, setNewNoHp] = useState('')
  const [newAlamat, setNewAlamat] = useState('')

  // Jemaat List for Kepala Selector
  const [availableJemaat, setAvailableJemaat] = useState<any[]>([])
  const [jemaatSearch, setJemaatSearch] = useState('')

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
  const [bulkKomselModalOpen, setBulkKomselModalOpen] = useState(false)
  const [selectedBulkKomsel, setSelectedBulkKomsel] = useState<string>('NONE')
  const [isBulkAssigningKomsel, setIsBulkAssigningKomsel] = useState(false)

  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState('')
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<string>('AKTIF')
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [churchName, setChurchName] = useState('Gereja')

  const [printSheetsModalOpen, setPrintSheetsModalOpen] = useState(false)
  const [printSheetsData, setPrintSheetsData] = useState<any[]>([])
  const [isLoadingPrintSheets, setIsLoadingPrintSheets] = useState(false)

  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [copiedContacts, setCopiedContacts] = useState(false)

  // Column Visibility States
  const [visibleColumns, setVisibleColumns] = useState({
    nomorKeluarga: true,
    namaKeluarga: true,
    kepalaName: true,
    totalAnggota: true,
    kontak: true,
  })

  // Pagination states
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  // Sorting state
  const [sortField, setSortField] = useState<'namaKeluarga' | 'nomorKeluarga' | 'totalAnggota' | null>('namaKeluarga')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Load Form Options
  useEffect(() => {
    getKeluargaFormOptionsAction().then((res) => {
      if (res.success && res.data) {
        setFormOptions({
          komsel: res.data.komsel || [],
        })
      }
    })
  }, [])

  // Fetch Data Function from PostgreSQL
  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getKeluargaListAction({
      search: searchTerm,
      statusHapus: statusHapusFilter,
      page: pageIndex + 1,
      pageSize,
    })

    if (res.success && res.data) {
      setKeluargaList(res.data.items)
      setTotalCount(res.data.total)
    } else {
      toast.error(res.error || 'Gagal memuat data keluarga.')
    }
    setLoading(false)
  }, [searchTerm, statusHapusFilter, pageIndex, pageSize])

  useEffect(() => {
    fetchData()
    getEffectivePrintConfig().then((pc) => {
      if (pc?.kop?.namaGereja) {
        setChurchName(pc.kop.namaGereja)
      }
    })
  }, [fetchData])

  // Load available Jemaat when create modal opens
  useEffect(() => {
    if (createOpen) {
      getJemaatListAction({ search: jemaatSearch, page: 1, pageSize: 50 }).then((res) => {
        if (res.success && res.data) {
          setAvailableJemaat(res.data.items)
        }
      })
    }
  }, [createOpen, jemaatSearch])

  // Client-side Sorting
  const sortedKeluargaList = React.useMemo(() => {
    if (!sortField) return keluargaList
    return [...keluargaList].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''
      if (sortField === 'namaKeluarga') {
        aVal = a.namaKeluarga || ''
        bVal = b.namaKeluarga || ''
      } else if (sortField === 'nomorKeluarga') {
        aVal = a.nomorKeluarga || ''
        bVal = b.nomorKeluarga || ''
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
  }, [keluargaList, sortField, sortOrder])

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id])
  const selectedCount = selectedIds.length

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    sortedKeluargaList.forEach((item) => {
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
      ? keluargaList.filter((k) => selectedRows[k.id])
      : keluargaList

    if (targets.length === 0) {
      toast.error('Tidak ada data keluarga untuk diekspor.')
      return
    }

    const headers = [
      'Nomor KK',
      'Nama Keluarga',
      'Kepala Keluarga',
      'NIJ Kepala',
      'Kontak HP / WA',
      'Alamat Rumah',
      'Total Anggota',
      'Status Data',
      'Tanggal Terdaftar',
    ]

    const rows = targets.map((k) => [
      `"${k.nomorKeluarga || ''}"`,
      `"${(k.namaKeluarga || '').replace(/"/g, '""')}"`,
      `"${(k.kepalaJemaat?.nama || 'Belum Ditentukan').replace(/"/g, '""')}"`,
      `"${k.kepalaJemaat?.nij || '-'}"`,
      `"${k.noHp || k.kepalaJemaat?.noHp || '-'}"`,
      `"${(k.alamat || '').replace(/"/g, '""')}"`,
      `"${k.totalAnggota || 0}"`,
      `"${k.deletedAt ? 'TERHAPUS (SOFT)' : 'AKTIF'}"`,
      `"${k.createdAt ? new Date(k.createdAt).toLocaleDateString('id-ID') : '-'}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    const cleanChurch = (churchName || 'Gereja').replace(/[^a-zA-Z0-9]/g, '_')
    link.setAttribute('download', `Data_Keluarga_${cleanChurch}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${targets.length} data keluarga ke CSV.`)
  }

  // 2. Direct Print KK Sheets (Without Preview Modal)
  const handleOpenPrintSheets = async () => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal satu keluarga untuk dicetak.')
      return
    }
    const toastId = toast.loading('Menyiapkan formulir kartu keluarga...')
    setIsLoadingPrintSheets(true)
    const res = await getKeluargaForPrintSheetsAction(selectedIds)
    setIsLoadingPrintSheets(false)
    toast.dismiss(toastId)

    if (!res.success || !res.data || res.data.length === 0) {
      toast.error(res.error || 'Gagal memuat data formulir kartu keluarga.')
      return
    }

    const printSheetsData = res.data
    const printConfig = await getEffectivePrintConfig()

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const sheetsHtml = printSheetsData
      .map((k) => {
        const kepala = k.kepalaJemaat
        const members = k.anggotaKeluarga || []

        const rowsHtml = members.length > 0
          ? members.map((m: any, idx: number) => {
              const j = m.jemaat || {}
              const birth = j.tanggalLahir
                ? `${j.tempatLahir ? j.tempatLahir + ', ' : ''}${new Date(j.tanggalLahir).toLocaleDateString('id-ID')}`
                : j.tempatLahir || '-'
              return `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td style="font-weight: 700;">${j.nama || '-'}${j.namaPanggilan ? ` (${j.namaPanggilan})` : ''}</td>
                  <td style="font-family: monospace; text-align: center;">${j.nij || '-'}</td>
                  <td style="text-align: center; font-weight: 600;">${m.relasi || '-'}</td>
                  <td style="text-align: center;">${j.jenisKelamin === 'LAK_LAKI' ? 'L' : j.jenisKelamin === 'PEREMPUAN' ? 'P' : '-'}</td>
                  <td>${birth}</td>
                  <td style="text-align: center;">${j.statusBaptis === 'SUDAH_BAPTIS' ? 'Sudah' : 'Belum'}</td>
                  <td style="text-align: center;">${j.statusPernikahan || '-'}</td>
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
          dateText: `NO: ${k.nomorKeluarga || '-'}`,
        })

        const signaturesHtml = buildSignaturesHtml(printConfig, [
          { roleKey: 'sekretaris', customTitle: 'Sekretaris Jemaat' },
          { roleKey: 'gembala', customTitle: 'Gembala Jemaat / Senior Pastor' },
        ])

        return `
          <div class="sheet">
            <!-- Kop Surat Resmi -->
            ${kopHtml}

            <!-- Family Overview Box -->
            <div class="family-info-grid">
              <div class="info-group">
                <div class="info-row"><span class="lbl">Nama Keluarga:</span><span class="val">${k.namaKeluarga}</span></div>
                <div class="info-row"><span class="lbl">Kepala Keluarga:</span><span class="val">${kepala?.nama || 'Belum Ditentukan'}</span></div>
                <div class="info-row"><span class="lbl">NIJ Kepala:</span><span class="val font-mono">${kepala?.nij || '-'}</span></div>
              </div>
              <div class="info-group">
                <div class="info-row"><span class="lbl">No. HP / WhatsApp:</span><span class="val">${k.noHp || kepala?.noHp || '-'}</span></div>
                <div class="info-row"><span class="lbl">Komunitas Sel (Komsel):</span><span class="val">${kepala?.komsel?.nama || '-'}</span></div>
                <div class="info-row"><span class="lbl">Alamat Domisili:</span><span class="val">${k.alamat || '-'}</span></div>
              </div>
            </div>

            <!-- Members Table -->
            <table class="members-table">
              <thead>
                <tr>
                  <th style="width: 30px;">No</th>
                  <th>Nama Lengkap</th>
                  <th style="width: 100px;">NIJ</th>
                  <th style="width: 90px;">Hubungan</th>
                  <th style="width: 40px;">L/P</th>
                  <th>Tempat, Tgl Lahir</th>
                  <th style="width: 70px;">Baptis</th>
                  <th style="width: 80px;">Pernikahan</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- Dynamic Signatures Block -->
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
        <title>Cetak Lembar Kartu Keluarga (${printSheetsData.length} KK) - ${printConfig.kop?.namaGereja || 'Gereja'}</title>
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
          .family-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 14px;
          }
          .info-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .info-row {
            display: flex;
            align-items: baseline;
            font-size: 11px;
          }
          .lbl {
            width: 140px;
            color: #64748b;
            font-weight: 600;
            flex-shrink: 0;
          }
          .val {
            font-weight: 700;
            color: #0f172a;
          }
          .font-mono {
            font-family: monospace;
          }
          .members-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
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
            padding: 6px 8px;
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        ${sheetsHtml}
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

  // 3. Bulk Assign Komsel Submit
  const handleBulkKomselSubmit = async () => {
    if (selectedIds.length === 0) return
    setIsBulkAssigningKomsel(true)
    const res = await bulkAssignKomselKeluargaAction({
      ids: selectedIds,
      komselId: selectedBulkKomsel,
    })
    setIsBulkAssigningKomsel(false)
    if (res.success) {
      toast.success(res.message)
      setBulkKomselModalOpen(false)
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal mengubah komsel keluarga.')
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
    const res = await bulkSoftDeleteKeluargaAction({
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
      toast.error(res.error || 'Gagal menghapus kartu keluarga.')
    }
  }

  // Selected Families Data for WhatsApp Broadcast Modal
  const selectedFamiliesData = keluargaList.filter((k) => selectedRows[k.id])
  const validPhoneContacts = selectedFamiliesData
    .map((k) => ({
      namaKeluarga: k.namaKeluarga,
      kepala: k.kepalaJemaat?.nama || 'Kepala Keluarga',
      noHp: (k.noHp || k.kepalaJemaat?.noHp || '').replace(/[^0-9]/g, ''),
    }))
    .filter((c) => c.noHp.length >= 8)

  const handleCopyAllContacts = () => {
    if (validPhoneContacts.length === 0) return
    const contactLines = validPhoneContacts.map((c) => `${c.kepala} (${c.namaKeluarga}): ${c.noHp}`).join('\n')
    navigator.clipboard.writeText(contactLines)
    setCopiedContacts(true)
    toast.success(`${validPhoneContacts.length} kontak WhatsApp berhasil disalin!`)
    setTimeout(() => setCopiedContacts(false), 2500)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNamaKeluarga.trim()) {
      toast.error('Nama Keluarga wajib diisi!')
      return
    }

    setIsSubmitting(true)
    const res = await createKeluargaAction({
      namaKeluarga: newNamaKeluarga.trim(),
      kepalaId: newKepalaId && newKepalaId !== 'NONE' ? newKepalaId : undefined,
      noHp: newNoHp.trim() || undefined,
      alamat: newAlamat.trim() || undefined,
    })

    setIsSubmitting(false)
    if (res.success && res.data) {
      const created = res.data
      toast.success(`Kartu Keluarga ${created.namaKeluarga} (${created.nomorKeluarga}) berhasil dibuat.`, {
        action: {
          label: 'Buka Detail',
          onClick: () => router.push(`/dashboard/keluarga/${created.id}`),
        },
      })
      setCreateOpen(false)
      setNewNamaKeluarga('')
      setNewKepalaId('')
      setNewNoHp('')
      setNewAlamat('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal membuat Kartu Keluarga.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    if (!deletionReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deleteKeluargaAction({
      id: deleteTarget.id,
      reason: deletionReason.trim(),
    })

    setIsDeleting(false)
    if (res.success) {
      toast.success(res.message || 'Kartu Keluarga berhasil di-soft delete.')
      setDeleteTarget(null)
      setDeletionReason('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus Kartu Keluarga.')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    const res = await restoreKeluargaAction({ id: restoreTarget.id })
    setIsRestoring(false)

    if (res.success) {
      toast.success(res.message || 'Kartu Keluarga berhasil dipulihkan!')
      setRestoreTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memulihkan Kartu Keluarga.')
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return
    setIsHardDeleting(true)
    const res = await hardDeleteKeluargaAction({
      id: hardDeleteTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Kartu Keluarga berhasil dihapus permanen dari database!')
      setHardDeleteTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen Kartu Keluarga.')
    }
  }

  const isAllPaginatedSelected =
    keluargaList.length > 0 && keluargaList.every((item) => selectedRows[item.id])

  // Column Header component with Dropdown Menu matching shadcn-admin
  const renderColumnHeader = (
    title: string,
    field?: 'namaKeluarga' | 'nomorKeluarga' | 'totalAnggota',
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
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Data Keluarga</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Kelola data Kartu Keluarga dan relasi jemaat.
          </p>
        </div>
        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button size='sm' onClick={() => setCreateOpen(true)} className='w-full sm:w-auto h-9 sm:h-8 gap-1.5 text-xs shadow-xs'>
            <Plus className='size-3.5' /> Tambah KK
          </Button>
        </div>
      </div>

      {/* Toolbar Filter Section */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <Input
            placeholder='Cari No. KK, nama, kepala...'
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
              checked={visibleColumns.nomorKeluarga}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, nomorKeluarga: !!c }))}
            >
              Nomor KK
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.namaKeluarga}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, namaKeluarga: !!c }))}
            >
              Nama Keluarga
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.kepalaName}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, kepalaName: !!c }))}
            >
              Kepala Keluarga
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.totalAnggota}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, totalAnggota: !!c }))}
            >
              Total Anggota
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.kontak}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, kontak: !!c }))}
            >
              Kontak & Alamat
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
                {visibleColumns.nomorKeluarga && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Nomor KK', 'nomorKeluarga', 'nomorKeluarga')}
                  </TableHead>
                )}
                {visibleColumns.namaKeluarga && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Nama Keluarga', 'namaKeluarga', 'namaKeluarga')}
                  </TableHead>
                )}
                {visibleColumns.kepalaName && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Kepala Keluarga', undefined, 'kepalaName')}
                  </TableHead>
                )}
                {visibleColumns.totalAnggota && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Total Anggota', 'totalAnggota', 'totalAnggota')}
                  </TableHead>
                )}
                {visibleColumns.kontak && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Kontak & Alamat', undefined, 'kontak')}
                  </TableHead>
                )}
                <TableHead className='w-12.5 px-3 text-end'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-sm'>
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='size-4 animate-spin text-primary' /> Memuat data kartu keluarga...
                    </div>
                  </TableCell>
                </TableRow>
              ) : keluargaList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-sm'>
                    No results. Belum ada data Kartu Keluarga.
                  </TableCell>
                </TableRow>
              ) : (
                sortedKeluargaList.map((kk) => {
                  const isSelected = !!selectedRows[kk.id]
                  const isDeleted = !!kk.deletedAt
                  return (
                    <TableRow
                      key={kk.id}
                      className={`transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'} ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className='px-3 py-2.5'>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(kk.id, !!checked)}
                        />
                      </TableCell>
                      {visibleColumns.nomorKeluarga && (
                        <TableCell className='px-3 py-2.5 font-mono text-xs font-semibold text-primary'>
                          <div className='flex items-center gap-1.5'>
                            {kk.nomorKeluarga}
                            {isDeleted && (
                              <Badge variant='destructive' className='text-[10px] gap-1 font-mono'>
                                <Trash2 className='size-3' /> Terhapus
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.namaKeluarga && (
                        <TableCell className='px-3 py-2.5 font-medium text-sm text-foreground'>
                          {kk.namaKeluarga}
                        </TableCell>
                      )}
                      {visibleColumns.kepalaName && (
                        <TableCell className='px-3 py-2.5 text-xs font-semibold text-foreground'>
                          {kk.kepalaJemaat ? (
                            <div>
                              <div>{kk.kepalaJemaat.nama}</div>
                              <div className='font-mono text-[10px] text-muted-foreground'>{kk.kepalaJemaat.nij}</div>
                            </div>
                          ) : (
                            <span className='text-muted-foreground italic text-[11px]'>Belum ditentukan</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.totalAnggota && (
                        <TableCell className='px-3 py-2.5'>
                          <Badge variant='outline' className='gap-1 font-mono font-normal text-[11px]'>
                            <Users className='size-3 text-primary' /> {kk.totalAnggota} Anggota
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.kontak && (
                        <TableCell className='px-3 py-2.5 text-xs space-y-0.5'>
                          <div className='font-mono text-muted-foreground flex items-center gap-1'>
                            <Phone className='size-3' /> {kk.noHp || '-'}
                          </div>
                          <div className='text-muted-foreground truncate max-w-xs flex items-center gap-1 text-[11px]'>
                            <MapPin className='size-3' /> {kk.alamat || '-'}
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
                            <DropdownMenuLabel className='text-xs'>Aksi Keluarga</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/keluarga/${kk.id}`}>
                                <Eye className='size-3.5 me-2' /> Lihat Detail Rincian KK
                              </Link>
                            </DropdownMenuItem>

                            {isDeleted ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setRestoreTarget(kk)}
                                  className='text-emerald-600 dark:text-emerald-400 text-xs'
                                >
                                  <RotateCcw className='size-3.5 me-2' /> Pulihkan Kartu Keluarga
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setHardDeleteTarget(kk)}
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                >
                                  <Trash2 className='size-3.5 me-2' /> Hapus Permanen
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                  onClick={() => setDeleteTarget(kk)}
                                >
                                  <Trash2 className='size-3.5 me-2' /> Hapus Kartu Keluarga
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

      {/* Dialog Create KK Baru */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-125'>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Terbitkan Kartu Keluarga Baru</DialogTitle>
              <DialogDescription className='text-xs'>
                Nomor KK Gereja akan digenerate secara otomatis dengan format <code className='font-mono text-primary'>KK-YYYYMM-XXXX</code>.
              </DialogDescription>
            </DialogHeader>

            <div className='grid gap-3.5 py-4'>
              <div className='grid gap-1.5'>
                <Label htmlFor='namaKeluarga' className='text-xs font-semibold'>
                  Nama Keluarga (Family Name) <span className='text-rose-500'>*</span>
                </Label>
                <Input
                  id='namaKeluarga'
                  placeholder='Contoh: Keluarga Santoso / Keluarga Gunawan'
                  value={newNamaKeluarga}
                  onChange={(e) => setNewNamaKeluarga(e.target.value)}
                  className='text-xs'
                  required
                />
              </div>

              <div className='grid gap-1.5'>
                <Label className='text-xs font-semibold'>
                  Pilih Kepala Keluarga (Optional)
                </Label>
                <Select value={newKepalaId} onValueChange={setNewKepalaId}>
                  <SelectTrigger className='text-xs'>
                    <SelectValue placeholder='Pilih dari jemaat yang terdaftar...' />
                  </SelectTrigger>
                  <SelectContent className='max-h-56'>
                    {availableJemaat.map((j) => (
                      <SelectItem key={j.id} value={j.id} className='text-xs'>
                        {j.nama} ({j.nij}) - {j.jenisKelamin === 'LAK_LAKI' ? 'L' : 'P'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className='text-[11px] text-muted-foreground'>
                  Hanya menampilkan jemaat yang belum terdaftar di KK manapun.
                </span>
              </div>

              <div className='grid gap-1.5'>
                <Label htmlFor='noHp' className='text-xs font-semibold'>
                  Nomor HP / WhatsApp Keluarga
                </Label>
                <Input
                  id='noHp'
                  placeholder='0812xxxxxxxx'
                  value={newNoHp}
                  onChange={(e) => setNewNoHp(e.target.value)}
                  className='text-xs font-mono'
                />
              </div>

              <div className='grid gap-1.5'>
                <Label htmlFor='alamat' className='text-xs font-semibold'>
                  Alamat Domisili Keluarga
                </Label>
                <Textarea
                  id='alamat'
                  placeholder='Alamat lengkap tempat tinggal keluarga...'
                  value={newAlamat}
                  onChange={(e) => setNewAlamat(e.target.value)}
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
                {isSubmitting ? 'Menyimpan...' : 'Simpan & Terbitkan KK'}
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
              Hapus Kartu Keluarga?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Kartu Keluarga <strong className='text-foreground'>{deleteTarget?.namaKeluarga}</strong> ({deleteTarget?.nomorKeluarga}) akan dinonaktifkan via Soft Delete.
                </span>
                <span className='block text-xs text-muted-foreground'>
                  Data Jemaat anggota keluarga ini TIDAK akan dihapus. Hubungan anggota dengan KK ini akan dilepas secara aman dan log audit SHA-256 dicatat.
                </span>
              </div>
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
            <Button variant='outline' onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
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

      {/* AlertDialog Restore Confirm */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Kartu Keluarga?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Kartu Keluarga <strong className='text-foreground'>{restoreTarget?.namaKeluarga}</strong> ({restoreTarget?.nomorKeluarga}) akan dipulihkan kembali ke daftar aktif.
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
              Ya, Pulihkan Kartu Keluarga
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Hard Delete Confirm */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5 text-rose-600' /> Hapus Permanen Kartu Keluarga?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs'>
                  ⚠️ <strong>PERINGATAN</strong>: Kartu Keluarga <strong className='text-foreground'>{hardDeleteTarget?.namaKeluarga}</strong> ({hardDeleteTarget?.nomorKeluarga}) akan dihapus secara permanen dari database.
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
              onClick={handleOpenPrintSheets}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10 rounded-full whitespace-nowrap'
              title='Cetak Lembar Kartu Keluarga Resmi A4 untuk keluarga terpilih'
            >
              <Printer className='size-3.5' />
              <span>Cetak Kartu Keluarga</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setSelectedBulkKomsel('NONE')
                setBulkKomselModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Tugaskan Komsel untuk seluruh anggota keluarga terpilih'
            >
              <Users className='size-3.5' />
              <span>Ubah Komsel</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => setContactsModalOpen(true)}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 rounded-full whitespace-nowrap'
              title='Broadcast & Salin Nomor WhatsApp Kepala Keluarga'
            >
              <MessageSquare className='size-3.5' />
              <span>Kontak WA Kepala</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleExportCsv}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ekspor data keluarga terpilih ke CSV / Excel'
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
              title='Hapus data kartu keluarga terpilih (soft delete)'
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

      {/* ── MODAL 1: CETAK LEMBAR KARTU KELUARGA (A4 SHEETS) ──────── */}
      <Dialog open={printSheetsModalOpen} onOpenChange={setPrintSheetsModalOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
          <DialogHeader className='p-4 sm:p-5 pb-3 sm:pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0'>
            <div className='min-w-0 flex-1 pe-6 sm:pe-0'>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2 leading-tight'>
                <Printer className='size-5 text-primary shrink-0' />
                <span>Pratinjau Lembar Kartu Keluarga ({printSheetsData.length} KK)</span>
              </DialogTitle>
              <DialogDescription className='text-xs mt-0.5'>
                Format resmi Kartu Keluarga Jemaat siap cetak A4.
              </DialogDescription>
            </div>
            <Button
              size='sm'
              onClick={handleOpenPrintSheets}
              className='w-full sm:w-auto gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm shrink-0'
            >
              <Printer className='size-4' /> Cetak Lembar KK (Print / PDF)
            </Button>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-3 sm:p-6 bg-muted/20 space-y-6'>
            {isLoadingPrintSheets ? (
              <div className='py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs'>
                <Loader2 className='size-6 animate-spin text-primary' />
                <span>Menyiapkan susunan data Kartu Keluarga...</span>
              </div>
            ) : printSheetsData.length === 0 ? (
              <div className='py-12 text-center text-xs text-muted-foreground'>
                Tidak ada data kartu keluarga yang dapat ditampilkan.
              </div>
            ) : (
              printSheetsData.map((k) => {
                const kepala = k.kepalaJemaat
                const members = k.anggotaKeluarga || []
                return (
                  <div
                    key={k.id}
                    className='bg-card border-2 border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 max-w-3xl mx-auto'
                  >
                    {/* Header KK */}
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
                            KARTU KELUARGA JEMAAT
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <Badge variant='outline' className='font-mono font-bold text-xs bg-primary/5 text-primary'>
                          {k.nomorKeluarga}
                        </Badge>
                      </div>
                    </div>

                    {/* Info Ringkas KK */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 p-3.5 rounded-xl border text-xs'>
                      <div className='space-y-1'>
                        <div className='text-muted-foreground'>Nama Keluarga:</div>
                        <div className='font-bold text-foreground text-sm'>{k.namaKeluarga}</div>
                        <div className='text-muted-foreground pt-1'>Kepala Keluarga:</div>
                        <div className='font-semibold text-foreground'>{kepala?.nama || 'Belum Ditentukan'} ({kepala?.nij || '-'})</div>
                      </div>
                      <div className='space-y-1'>
                        <div className='text-muted-foreground'>Kontak HP / WA:</div>
                        <div className='font-semibold text-foreground'>{k.noHp || kepala?.noHp || '-'}</div>
                        <div className='text-muted-foreground pt-1'>Alamat Domisili:</div>
                        <div className='font-semibold text-foreground'>{k.alamat || '-'}</div>
                      </div>
                    </div>

                    {/* Tabel Anggota */}
                    <div className='border rounded-xl overflow-hidden'>
                      <table className='w-full text-xs text-left'>
                        <thead className='bg-muted/60 text-muted-foreground font-semibold border-b'>
                          <tr>
                            <th className='p-2 text-center w-8'>No</th>
                            <th className='p-2'>Nama Anggota</th>
                            <th className='p-2'>NIJ</th>
                            <th className='p-2 text-center'>Hubungan</th>
                            <th className='p-2 text-center'>L/P</th>
                            <th className='p-2 text-center'>Baptis</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y'>
                          {members.length > 0 ? (
                            members.map((m: any, idx: number) => {
                              const j = m.jemaat || {}
                              return (
                                <tr key={m.id} className='hover:bg-muted/20'>
                                  <td className='p-2 text-center text-muted-foreground'>{idx + 1}</td>
                                  <td className='p-2 font-bold text-foreground'>
                                    {j.nama}
                                    {j.namaPanggilan && <span className='text-muted-foreground font-normal'> ({j.namaPanggilan})</span>}
                                  </td>
                                  <td className='p-2 font-mono text-primary font-semibold'>{j.nij || '-'}</td>
                                  <td className='p-2 text-center'>
                                    <Badge variant='outline' className='text-[10px]'>
                                      {m.relasi || '-'}
                                    </Badge>
                                  </td>
                                  <td className='p-2 text-center'>{j.jenisKelamin === 'LAK_LAKI' ? 'L' : 'P'}</td>
                                  <td className='p-2 text-center'>
                                    {j.statusBaptis === 'SUDAH_BAPTIS' ? (
                                      <Badge variant='secondary' className='text-[10px] text-emerald-600 bg-emerald-500/10'>Sudah</Badge>
                                    ) : (
                                      <span className='text-muted-foreground text-[11px]'>Belum</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className='p-4 text-center text-muted-foreground text-xs'>
                                Belum ada data anggota keluarga terdaftar.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className='p-3 sm:p-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0'>
            <span className='text-xs text-muted-foreground text-center sm:text-left'>
              Format cetak resmi A4 mencakup seluruh daftar anggota keluarga & tanda tangan pastoral.
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

      {/* ── MODAL 2: UBAH KOMSEL KELUARGA MASSAL ─────────────────── */}
      <Dialog open={bulkKomselModalOpen} onOpenChange={setBulkKomselModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Users className='size-5 text-primary' />
              Tugaskan Komsel ({selectedCount} Keluarga)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tetapkan kelompok sel (Komsel) untuk seluruh anggota di dalam keluarga yang dipilih.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2 text-xs'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Kelompok Sel (Komsel) Tujuan:</Label>
              <Select value={selectedBulkKomsel} onValueChange={setSelectedBulkKomsel}>
                <SelectTrigger className='w-full text-xs h-9'>
                  <SelectValue placeholder='Pilih komsel' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='NONE' className='text-xs font-medium text-amber-600'>
                    ✕ Kosongkan / Tanpa Komsel
                  </SelectItem>
                  {formOptions.komsel.map((kom) => (
                    <SelectItem key={kom.id} value={kom.id} className='text-xs'>
                      {kom.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1'>
              <div className='font-semibold text-foreground'>Catatan Penugasan:</div>
              <div>
                Seluruh anggota jemaat yang terdaftar di dalam {selectedCount} Kartu Keluarga terpilih akan otomatis diperbarui komselnya ke grup ini.
              </div>
            </div>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setBulkKomselModalOpen(false)} disabled={isBulkAssigningKomsel}>
              Batal
            </Button>
            <Button
              onClick={handleBulkKomselSubmit}
              disabled={isBulkAssigningKomsel}
              className='gap-1.5'
            >
              {isBulkAssigningKomsel ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
              {isBulkAssigningKomsel ? 'Menerapkan...' : `Tugaskan Komsel (${selectedCount} KK)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: BROADCAST & SALIN KONTAK WA KEPALA KK ───────── */}
      <Dialog open={contactsModalOpen} onOpenChange={setContactsModalOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <MessageSquare className='size-5 text-emerald-600' />
              Kontak WhatsApp Kepala Keluarga ({selectedCount} KK)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Daftar nomor WhatsApp Kepala Keluarga untuk kemudahan koordinasi dan broadcast warta jemaat.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <div className='flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20'>
              <div>
                <div className='font-bold text-emerald-800 dark:text-emerald-300 text-xs'>
                  {validPhoneContacts.length} Nomor WA Teridentifikasi
                </div>
                <div className='text-[11px] text-muted-foreground'>
                  Dari total {selectedCount} keluarga terpilih
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
              {selectedFamiliesData.map((k) => {
                const kepala = k.kepalaJemaat
                const rawPhone = (k.noHp || kepala?.noHp || '').replace(/[^0-9]/g, '')
                const waLink = rawPhone ? `https://wa.me/${rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone}` : null

                return (
                  <div key={k.id} className='p-2.5 px-3 flex items-center justify-between hover:bg-muted/30 text-xs'>
                    <div>
                      <div className='font-bold text-foreground'>{k.namaKeluarga}</div>
                      <div className='text-[11px] text-muted-foreground'>
                        Kepala: <span className='text-foreground font-medium'>{kepala?.nama || 'Belum Ditentukan'}</span>
                      </div>
                    </div>
                    <div>
                      {rawPhone ? (
                        <div className='flex items-center gap-2'>
                          <span className='font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400'>
                            {k.noHp || kepala?.noHp}
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

      {/* ── MODAL 4: HAPUS MASSAL (SOFT DELETE) ─────────────────── */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Pindahkan {selectedCount} Kartu Keluarga ke Kotak Sampah?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Seluruh ({selectedCount}) data Kartu Keluarga yang dipilih akan diarsipkan ke kotak sampah (*soft delete*). Data anggota jemaat tetap aman dan KK dapat dipulihkan kapan saja.
                </div>
                <div className='space-y-1 pt-1'>
                  <label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan Massal (Wajib):</label>
                  <Textarea
                    placeholder='Contoh: Duplikasi pendaftaran / pembersihan data uji coba'
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

      {/* ── MODAL 5: TAMBAH KARTU KELUARGA BARU ─────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-lg'>
          <form onSubmit={handleCreateSubmit} className='space-y-4'>
            <DialogHeader>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
                <Users className='size-5 text-primary shrink-0' />
                <span>Buat Kartu Keluarga Baru</span>
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Daftarkan keluarga baru dan tentukan Kepala Keluarga (opsional).
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3.5 py-1 text-xs'>
              {/* Kepala Keluarga Picker with Live Search */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold flex items-center justify-between'>
                  <span>Pilih Kepala Keluarga:</span>
                  <span className='text-[11px] text-muted-foreground font-normal'>Opsional</span>
                </Label>

                <div className='space-y-2'>
                  <div className='relative'>
                    <Search className='size-3.5 absolute left-2.5 top-2.5 text-muted-foreground' />
                    <Input
                      placeholder='Ketik nama / NIJ jemaat untuk mencari...'
                      value={jemaatSearch}
                      onChange={(e) => setJemaatSearch(e.target.value)}
                      className='h-8 text-xs pl-8'
                    />
                  </div>

                  <Select
                    value={newKepalaId}
                    onValueChange={(val) => {
                      setNewKepalaId(val)
                      const match = availableJemaat.find((j) => j.id === val)
                      if (match) {
                        // Smart Auto-Fill
                        if (!newNamaKeluarga || newNamaKeluarga.startsWith('Keluarga ')) {
                          setNewNamaKeluarga(`Keluarga ${match.nama}`)
                        }
                        if (!newNoHp && (match.noHp || match.whatsApp)) {
                          setNewNoHp(match.noHp || match.whatsApp || '')
                        }
                        if (!newAlamat && match.alamat) {
                          setNewAlamat(match.alamat)
                        }
                      }
                    }}
                  >
                    <SelectTrigger className='h-9 text-xs w-full min-w-0'>
                      <SelectValue placeholder='Pilih jemaat sebagai Kepala Keluarga...' />
                    </SelectTrigger>
                    <SelectContent className='max-h-56'>
                      <SelectItem value='NONE' className='text-xs font-medium text-amber-600'>
                        ✕ Tanpa Kepala Keluarga (Tentukan Nanti)
                      </SelectItem>
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

              {/* Nama Keluarga */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nama Kartu Keluarga (Wajib):</Label>
                <Input
                  placeholder='Contoh: Keluarga Andreas Wijaya'
                  value={newNamaKeluarga}
                  onChange={(e) => setNewNamaKeluarga(e.target.value)}
                  className='h-8 text-xs font-semibold'
                  required
                />
              </div>

              {/* Kontak HP / WhatsApp */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nomor Telepon / WhatsApp:</Label>
                <Input
                  placeholder='Contoh: 081234567890'
                  value={newNoHp}
                  onChange={(e) => setNewNoHp(e.target.value)}
                  className='h-8 text-xs font-mono'
                />
              </div>

              {/* Alamat Domisili */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Alamat Domisili Rumah:</Label>
                <Textarea
                  placeholder='Contoh: Jl. Sudirman No. 12, RT 02 / RW 04, Padang'
                  value={newAlamat}
                  onChange={(e) => setNewAlamat(e.target.value)}
                  className='text-xs min-h-16'
                />
              </div>
            </div>

            <DialogFooter className='gap-2 pt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setCreateOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isSubmitting || !newNamaKeluarga.trim()}
                className='gap-1.5'
              >
                {isSubmitting ? <Loader2 className='size-3.5 animate-spin' /> : <Plus className='size-3.5' />}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Kartu Keluarga'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
