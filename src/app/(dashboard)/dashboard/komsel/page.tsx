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
  Building2,
  Calendar,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  FilterX,
  Loader2,
  UserCheck,
  UserPlus,
  Tag,
  Check,
  Printer,
  MessageSquare,
  Download,
  Copy,
  ExternalLink,
  Layers,
  CheckCircle2,
  FileSpreadsheet,
  X,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import {
  getKomselListAction,
  createKomselAction,
  updateKomselAction,
  deleteKomselAction,
  restoreKomselAction,
  hardDeleteKomselAction,
  bulkSoftDeleteKomselAction,
  bulkAssignKategorialKomselAction,
  getKomselForPrintSheetsAction,
} from '@/actions/komsel'
import { getKategorialListAction } from '@/actions/kategorial'
import { getJemaatListAction } from '@/actions/jemaat'
import { toast } from 'sonner'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'

const HARI_OPTIONS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'] as const

export default function KomselListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [komselList, setKomselList] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [filterKategorialId, setFilterKategorialId] = useState<string>('all')
  const [filterHari, setFilterHari] = useState<string>('all')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Ref Data
  const [kategorialOptions, setKategorialOptions] = useState<any[]>([])

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({
    nama: true,
    wilayah: true,
    kategorial: true,
    jadwal: true,
    koordinator: true,
    totalAnggota: true,
    status: true,
  })

  // Pagination
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [nama, setNama] = useState('')
  const [wilayah, setWilayah] = useState('')
  const [hari, setHari] = useState<any>('RABU')
  const [jam, setJam] = useState('19:00 WIB')
  const [kategorialId, setKategorialId] = useState('')
  const [koordinatorId, setKoordinatorId] = useState('')
  const [selectedKoordinator, setSelectedKoordinator] = useState<any | null>(null)
  const [jemaatSearch, setJemaatSearch] = useState('')
  const [jemaatOptions, setJemaatOptions] = useState<any[]>([])
  const [koordinatorSelectorOpen, setKoordinatorSelectorOpen] = useState(false)

  // Edit Modal
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [editNama, setEditNama] = useState('')
  const [editWilayah, setEditWilayah] = useState('')
  const [editHari, setEditHari] = useState<any>('RABU')
  const [editJam, setEditJam] = useState('19:00 WIB')
  const [editKategorialId, setEditKategorialId] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Bulk Actions States
  const [bulkKategorialModalOpen, setBulkKategorialModalOpen] = useState(false)
  const [selectedBulkKategorialId, setSelectedBulkKategorialId] = useState<string>('')
  const [isBulkAssigningKategorial, setIsBulkAssigningKategorial] = useState(false)

  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState('')
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const [printSheetsModalOpen, setPrintSheetsModalOpen] = useState(false)
  const [printSheetsData, setPrintSheetsData] = useState<any[]>([])
  const [isLoadingPrintSheets, setIsLoadingPrintSheets] = useState(false)

  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [copiedContacts, setCopiedContacts] = useState(false)

  // Delete & Restore & Hard Delete
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [hardDeleteTarget, setHardDeleteTarget] = useState<any | null>(null)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [isHardDeleting, setIsHardDeleting] = useState(false)

  // Load Kategorial Options
  useEffect(() => {
    getKategorialListAction({ page: 1, pageSize: 50 }).then((res) => {
      if (res.success && res.data) {
        setKategorialOptions(res.data.items)
      }
    })
  }, [])

  // Load Jemaat for Koordinator Selector
  useEffect(() => {
    if (createOpen) {
      getJemaatListAction({ search: jemaatSearch, statusJemaat: 'ACTIVE' as any, page: 1, pageSize: 50 }).then((res) => {
        if (res.success && res.data) {
          setJemaatOptions(res.data.items)
        }
      })
    }
  }, [createOpen, jemaatSearch])

  // Sync selected koordinator
  useEffect(() => {
    if (koordinatorId) {
      const match = jemaatOptions.find((j) => j.id === koordinatorId)
      setSelectedKoordinator(match || null)
    } else {
      setSelectedKoordinator(null)
    }
  }, [koordinatorId, jemaatOptions])

  // Fetch Data from PostgreSQL
  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getKomselListAction({
      search: searchTerm,
      statusHapus: statusHapusFilter,
      kategorialId: filterKategorialId !== 'all' ? filterKategorialId : undefined,
      hari: filterHari !== 'all' ? (filterHari as any) : undefined,
      page: pageIndex + 1,
      pageSize,
    })

    if (res.success && res.data) {
      setKomselList(res.data.items)
      setTotalCount(res.data.total)
    } else {
      toast.error(res.error || 'Gagal memuat data Komsel.')
    }
    setLoading(false)
  }, [searchTerm, statusHapusFilter, filterKategorialId, filterHari, pageIndex, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Sorting state
  const [sortField, setSortField] = useState<'nama' | 'wilayah' | 'kategorial' | 'totalAnggota' | null>('nama')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const sortedKomselList = React.useMemo(() => {
    if (!sortField) return komselList
    return [...komselList].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''
      if (sortField === 'nama') {
        aVal = a.nama || ''
        bVal = b.nama || ''
      } else if (sortField === 'wilayah') {
        aVal = a.wilayah || ''
        bVal = b.wilayah || ''
      } else if (sortField === 'kategorial') {
        aVal = a.kategorial?.nama || ''
        bVal = b.kategorial?.nama || ''
      } else if (sortField === 'totalAnggota') {
        aVal = a._count?.anggota || 0
        bVal = b._count?.anggota || 0
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [komselList, sortField, sortOrder])

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id])
  const selectedCount = selectedIds.length
  const isAllPaginatedSelected = sortedKomselList.length > 0 && sortedKomselList.every((k) => selectedRows[k.id])
  const isAllSelected = isAllPaginatedSelected

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    sortedKomselList.forEach((item) => {
      updated[item.id] = checked
    })
    setSelectedRows(updated)
  }

  const selectedKomselData = sortedKomselList.filter((item) => selectedRows[item.id])
  const validCoordinatorContacts = selectedKomselData
    .map((item) => ({
      namaKomsel: item.nama,
      namaKoordinator: item.koordinator?.nama || 'Koordinator',
      noHp: (item.koordinator?.noHp || '').replace(/[^0-9]/g, ''),
      wilayah: item.wilayah,
    }))
    .filter((c) => c.noHp.length >= 8)

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows((prev) => ({ ...prev, [id]: checked }))
  }

  // 1. Export CSV Handler
  const handleExportCsv = () => {
    const targets = selectedCount > 0 ? selectedKomselData : komselList

    if (targets.length === 0) {
      toast.error('Tidak ada data komsel untuk diekspor.')
      return
    }

    const headers = [
      'Nama Komsel',
      'Wilayah / Sektor',
      'Hari Pertemuan',
      'Jam Pertemuan',
      'Kategorial Pembina',
      'Nama Koordinator',
      'NIJ Koordinator',
      'No. HP Koordinator',
      'Total Anggota',
      'Status Data',
      'Tanggal Terdaftar',
    ]

    const rows = targets.map((item) => [
      `"${(item.nama || '').replace(/"/g, '""')}"`,
      `"${(item.wilayah || '').replace(/"/g, '""')}"`,
      `"${item.hari || '-'}"`,
      `"${item.jam || '-'}"`,
      `"${item.kategorial?.nama || '-'}"`,
      `"${item.koordinator?.nama || '-'}"`,
      `"${item.koordinator?.nij || '-'}"`,
      `"${item.koordinator?.noHp || '-'}"`,
      `"${item.totalAnggota || 0}"`,
      `"${item.deletedAt ? 'TERHAPUS (SOFT)' : 'AKTIF'}"`,
      `"${item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Data_Komsel_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${targets.length} data komsel ke CSV.`)
  }

  // 2. Direct Print Komsel Sheets (Without Preview Modal)
  const handleOpenPrintSheets = async () => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal satu komsel untuk dicetak.')
      return
    }
    const toastId = toast.loading('Menyiapkan lembar direktori komsel...')
    setIsLoadingPrintSheets(true)
    const res = await getKomselForPrintSheetsAction(selectedIds)
    setIsLoadingPrintSheets(false)
    toast.dismiss(toastId)

    if (!res.success || !res.data || res.data.length === 0) {
      toast.error(res.error || 'Gagal memuat data lembar komsel.')
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
      .map((kms) => {
        const members = (kms.anggota || []).map((a: any) => a.jemaat).filter(Boolean)
        const total = members.length
        const totalL = members.filter((m: any) => m.jenisKelamin === 'LAK_LAKI').length
        const totalP = members.filter((m: any) => m.jenisKelamin === 'PEREMPUAN').length
        const totalBaptis = members.filter((m: any) => m.statusBaptis === 'SUDAH_BAPTIS').length

        const rowsHtml = members.length > 0
          ? members.map((j: any, idx: number) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="font-weight: 700;">${j.nama || '-'}${j.namaPanggilan ? ` (${j.namaPanggilan})` : ''}</td>
                <td style="font-family: monospace; text-align: center;">${j.nij || '-'}</td>
                <td style="text-align: center;">${j.jenisKelamin === 'LAK_LAKI' ? 'L' : j.jenisKelamin === 'PEREMPUAN' ? 'P' : '-'}</td>
                <td>${j.noHp || j.whatsApp || '-'}</td>
                <td style="font-size: 9px; color: #475569;">${j.alamat || '-'}</td>
                <td style="text-align: center;">${j.statusBaptis === 'SUDAH_BAPTIS' ? 'Sudah' : 'Belum'}</td>
                <td style="text-align: center;">${j.statusJemaat || 'ACTIVE'}</td>
              </tr>
            `).join('')
          : `
            <tr>
              <td colspan="8" style="text-align: center; padding: 16px; color: #64748b;">Belum ada anggota jemaat terdaftar di kelompok sel ini.</td>
            </tr>
          `

        const kopHtml = buildKopHtml(printConfig, {
          badgeText: kms.kategorial?.nama || 'KOMSEL UMUM',
          dateText: `Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
        })

        const signaturesHtml = buildSignaturesHtml(printConfig, [
          { roleKey: 'koordinatorKomsel', customTitle: 'Koordinator Komunitas Sel (Komsel)', overrideName: kms.koordinator?.nama },
          { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
        ])

        return `
          <div class="sheet">
            <!-- Kop Surat Resmi -->
            ${kopHtml}

            <!-- Overview Profile Box -->
            <div class="overview-box">
              <div class="overview-grid">
                <div>
                  <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">Nama Komunitas Sel</div>
                  <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">${kms.nama.toUpperCase()}</div>
                  <div style="font-size: 10px; color: #475569; margin-top: 1px;">Wilayah: <strong>${kms.wilayah}</strong></div>
                </div>
                <div>
                  <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">Jadwal Pertemuan</div>
                  <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">${kms.hari}, ${kms.jam}</div>
                  <div style="font-size: 10px; color: #475569; margin-top: 1px;">Koordinator: <strong>${kms.koordinator?.nama || '-'}</strong> (${kms.koordinator?.noHp || '-'})</div>
                </div>
              </div>

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
              Daftar Roster Anggota Komsel (${total} Orang)
            </div>
            <table class="members-table">
              <thead>
                <tr>
                  <th style="width: 25px;">No</th>
                  <th>Nama Lengkap</th>
                  <th style="width: 90px;">NIJ</th>
                  <th style="width: 35px;">L/P</th>
                  <th>No. WhatsApp</th>
                  <th>Alamat Domisili</th>
                  <th style="width: 65px;">Baptis</th>
                  <th style="width: 65px;">Status</th>
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
        <title>Cetak Direktori Komsel (${printSheetsData.length} Komsel) - ${printConfig.kop?.namaGereja || 'Gereja'}</title>
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
            padding: 12px;
            margin-bottom: 12px;
          }
          .overview-grid {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 10px;
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
            font-size: 8.5px;
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

  // 3. Bulk Assign Kategorial Submit
  const handleBulkKategorialSubmit = async () => {
    if (selectedIds.length === 0) return
    setIsBulkAssigningKategorial(true)
    const res = await bulkAssignKategorialKomselAction({
      ids: selectedIds,
      kategorialId: selectedBulkKategorialId || null,
    })
    setIsBulkAssigningKategorial(false)
    if (res.success) {
      toast.success(res.message)
      setBulkKategorialModalOpen(false)
      setSelectedBulkKategorialId('')
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui kategorial komsel.')
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
    const res = await bulkSoftDeleteKomselAction({
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
      toast.error(res.error || 'Gagal menghapus data komsel.')
    }
  }

  // 5. Copy All Coordinator Contacts
  const handleCopyAllContacts = () => {
    if (validCoordinatorContacts.length === 0) return
    const contactLines = validCoordinatorContacts
      .map((c) => `${c.namaKomsel} (${c.namaKoordinator} - ${c.wilayah}): ${c.noHp}`)
      .join('\n')
    navigator.clipboard.writeText(contactLines)
    setCopiedContacts(true)
    toast.success(`${validCoordinatorContacts.length} nomor WhatsApp koordinator berhasil disalin!`)
    setTimeout(() => setCopiedContacts(false), 2500)
  }

  const resetCreateForm = () => {
    setNama('')
    setWilayah('')
    setHari('RABU')
    setJam('19:00 WIB')
    setKategorialId('')
    setKoordinatorId('')
    setSelectedKoordinator(null)
    setJemaatSearch('')
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nama.trim()) { toast.error('Nama Komsel wajib diisi!'); return }
    if (!wilayah.trim()) { toast.error('Wilayah Komsel wajib diisi!'); return }
    if (!jam.trim()) { toast.error('Jam pertemuan wajib diisi!'); return }

    setIsCreating(true)
    const res = await createKomselAction({
      nama: nama.trim(),
      wilayah: wilayah.trim(),
      hari,
      jam: jam.trim(),
      kategorialId: kategorialId || null,
      koordinatorId: koordinatorId || null,
    })
    setIsCreating(false)

    if (res.success && res.data) {
      const created = res.data
      toast.success(`Komsel "${created.nama}" berhasil dibuat!`, {
        action: {
          label: 'Buka Detail',
          onClick: () => router.push(`/dashboard/komsel/${created.id}`),
        },
      })
      setCreateOpen(false)
      resetCreateForm()
      fetchData()
    } else {
      toast.error(res.error || 'Gagal membuat Komsel.')
    }
  }

  const handleEditOpen = (komsel: any) => {
    setEditTarget(komsel)
    setEditNama(komsel.nama)
    setEditWilayah(komsel.wilayah)
    setEditHari(komsel.hari)
    setEditJam(komsel.jam)
    setEditKategorialId(komsel.kategorialId || '')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    if (!editNama.trim()) { toast.error('Nama Komsel wajib diisi!'); return }
    if (!editWilayah.trim()) { toast.error('Wilayah Komsel wajib diisi!'); return }
    if (!editJam.trim()) { toast.error('Jam pertemuan wajib diisi!'); return }

    setIsUpdating(true)
    const res = await updateKomselAction({
      id: editTarget.id,
      nama: editNama.trim(),
      wilayah: editWilayah.trim(),
      hari: editHari,
      jam: editJam.trim(),
      kategorialId: editKategorialId || null,
    })
    setIsUpdating(false)

    if (res.success && res.data) {
      toast.success(`Komsel "${res.data.nama}" berhasil diperbarui! Log audit SHA-256 tersimpan.`)
      setEditTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui Komsel.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    if (!deletionReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deleteKomselAction({
      id: deleteTarget.id,
      reason: deletionReason.trim(),
    })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Komsel berhasil di-soft delete.')
      setDeleteTarget(null)
      setDeletionReason('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus Komsel.')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    const res = await restoreKomselAction({ id: restoreTarget.id })
    setIsRestoring(false)

    if (res.success) {
      toast.success(res.message || 'Komsel berhasil dipulihkan!')
      setRestoreTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memulihkan Komsel.')
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return
    setIsHardDeleting(true)
    const res = await hardDeleteKomselAction({
      id: hardDeleteTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Komsel berhasil dihapus permanen dari database!')
      setHardDeleteTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen Komsel.')
    }
  }

  const renderSortableHeader = (
    title: string,
    columnKey: keyof typeof visibleColumns,
    field?: 'nama' | 'wilayah' | 'kategorial' | 'totalAnggota'
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
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Komunitas Sel (Komsel)</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Kelola kelompok komsel, wilayah, dan anggota.
          </p>
        </div>
        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button size='sm' onClick={() => setCreateOpen(true)} className='w-full sm:w-auto h-9 sm:h-8 gap-1.5 text-xs shadow-xs'>
            <Plus className='size-3.5' /> Tambah Komsel
          </Button>
        </div>
      </div>

      {/* Toolbar Filter Section */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <Input
            placeholder='Cari nama, wilayah, koordinator...'
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPageIndex(0)
            }}
            className='h-8 text-xs w-full sm:w-50'
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

            <Select
              value={filterKategorialId}
              onValueChange={(val) => {
                setFilterKategorialId(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 text-xs w-full sm:w-36'>
                <SelectValue placeholder='Semua Kategorial' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs'>Semua Kategorial</SelectItem>
                {kategorialOptions.map((k) => (
                  <SelectItem key={k.id} value={k.id} className='text-xs'>{k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterHari}
              onValueChange={(val) => {
                setFilterHari(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 text-xs w-full sm:w-32'>
                <SelectValue placeholder='Semua Hari' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs'>Semua Hari</SelectItem>
                {HARI_OPTIONS.map((h) => (
                  <SelectItem key={h} value={h} className='text-xs'>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm || statusHapusFilter !== 'ACTIVE' || filterKategorialId !== 'all' || filterHari !== 'all') && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSearchTerm('')
                  setStatusHapusFilter('ACTIVE')
                  setFilterKategorialId('all')
                  setFilterHari('all')
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
            {(['nama', 'wilayah', 'kategorial', 'jadwal', 'koordinator', 'totalAnggota', 'status'] as const).map((col) => (
              <DropdownMenuCheckboxItem
                key={col}
                checked={visibleColumns[col]}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, [col]: !!c }))}
              >
                {col === 'nama' ? 'Nama Komsel' : col === 'wilayah' ? 'Wilayah' : col === 'kategorial' ? 'Kategorial' : col === 'jadwal' ? 'Jadwal Pertemuan' : col === 'koordinator' ? 'Koordinator' : col === 'totalAnggota' ? 'Total Anggota' : 'Status'}
              </DropdownMenuCheckboxItem>
            ))}
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
                  <Checkbox checked={isAllSelected} onCheckedChange={(c) => handleSelectAll(!!c)} />
                </TableHead>
                {visibleColumns.nama && <TableHead className='px-3'>{renderSortableHeader('Nama Komsel', 'nama', 'nama')}</TableHead>}
                {visibleColumns.wilayah && <TableHead className='px-3'>{renderSortableHeader('Wilayah', 'wilayah', 'wilayah')}</TableHead>}
                {visibleColumns.kategorial && <TableHead className='px-3'>{renderSortableHeader('Target Kategorial', 'kategorial', 'kategorial')}</TableHead>}
                {visibleColumns.jadwal && <TableHead className='px-3'>{renderSortableHeader('Jadwal Pertemuan', 'jadwal')}</TableHead>}
                {visibleColumns.koordinator && <TableHead className='px-3'>{renderSortableHeader('Koordinator', 'koordinator')}</TableHead>}
                {visibleColumns.totalAnggota && <TableHead className='px-3'>{renderSortableHeader('Total Anggota', 'totalAnggota', 'totalAnggota')}</TableHead>}
                {visibleColumns.status && <TableHead className='px-3'>{renderSortableHeader('Status', 'status')}</TableHead>}
                <TableHead className='w-12.5 px-3 text-end'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className='h-32 text-center text-muted-foreground text-sm'>
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='size-5 animate-spin text-primary' /> Memuat data komsel...
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedKomselList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className='h-32 text-center text-muted-foreground text-sm'>
                    {searchTerm || filterKategorialId !== 'all' || filterHari !== 'all' ? (
                      <div className='space-y-2'>
                        <div>Komsel tidak ditemukan dengan filter yang dipilih.</div>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setSearchTerm('')
                            setFilterKategorialId('all')
                            setFilterHari('all')
                          }}
                        >
                          Reset Filter
                        </Button>
                      </div>
                    ) : (
                      <div className='space-y-2'>
                        <div>Belum ada data Komsel yang terdaftar.</div>
                        <Button size='sm' onClick={() => setCreateOpen(true)}>
                          <Plus className='size-4 me-1' /> Tambah Komsel
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                sortedKomselList.map((kms) => {
                  const isSelected = !!selectedRows[kms.id]
                  const isDeleted = !!kms.deletedAt
                  return (
                    <TableRow
                      key={kms.id}
                      className={`transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'} ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className='px-3 py-2.5'>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => setSelectedRows((p) => ({ ...p, [kms.id]: !!c }))}
                        />
                      </TableCell>
                      {visibleColumns.nama && (
                        <TableCell className='px-3 py-2.5 font-bold text-sm text-foreground'>
                          <div className='flex items-center gap-2'>
                            <Link href={`/dashboard/komsel/${kms.id}`} className='hover:underline hover:text-primary'>
                              {kms.nama}
                            </Link>
                            {isDeleted && (
                              <Badge variant='destructive' className='text-[10px] gap-1 font-mono'>
                                <Trash2 className='size-3' /> Terhapus
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.wilayah && (
                        <TableCell className='px-3 py-2.5 text-xs text-muted-foreground'>
                          <Badge variant='outline' className='font-normal text-[11px]'>
                            <Building2 className='size-3 me-1 text-primary' /> {kms.wilayah}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.kategorial && (
                        <TableCell className='px-3 py-2.5 text-xs'>
                          {kms.kategorial ? (
                            <Link href={`/dashboard/komsel/kategorial/${kms.kategorial.id}`} className='hover:underline text-primary'>
                              <Badge variant='secondary' className='font-normal text-[10px]'>
                                <Tag className='size-3 me-1' /> {kms.kategorial.nama}
                              </Badge>
                            </Link>
                          ) : (
                            <span className='text-muted-foreground'>-</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.jadwal && (
                        <TableCell className='px-3 py-2.5 text-xs text-foreground'>
                          <div className='flex items-center gap-1 font-medium'>
                            <Calendar className='size-3 text-muted-foreground' /> {kms.hari}
                          </div>
                          <div className='flex items-center gap-1 text-[11px] text-muted-foreground'>
                            <Clock className='size-3' /> {kms.jam}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.koordinator && (
                        <TableCell className='px-3 py-2.5 text-xs'>
                          {kms.koordinator ? (
                            <div>
                              <div className='font-semibold text-foreground'>{kms.koordinator.nama}</div>
                              <div className='font-mono text-muted-foreground text-[10px]'>{kms.koordinator.nij}</div>
                            </div>
                          ) : (
                            <span className='text-muted-foreground italic text-[11px]'>Belum ada</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.totalAnggota && (
                        <TableCell className='px-3 py-2.5'>
                          <Badge variant='outline' className='gap-1 font-mono font-normal text-[11px]'>
                            <Users className='size-3 text-primary' /> {kms.totalAnggota} Jemaat
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell className='px-3 py-2.5'>
                          {isDeleted ? (
                            <Badge variant='destructive' className='font-mono text-[10px] gap-1'>
                              <Trash2 className='size-3' /> TERHAPUS
                            </Badge>
                          ) : (
                            <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-mono text-[10px]'>
                              AKTIF
                            </Badge>
                          )}
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
                            <DropdownMenuLabel className='text-xs'>Aksi Komsel</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/komsel/${kms.id}`}>
                                <Eye className='size-3.5 me-2' /> Lihat Detail
                              </Link>
                            </DropdownMenuItem>

                            {isDeleted ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setRestoreTarget(kms)}
                                  className='text-emerald-600 dark:text-emerald-400 text-xs'
                                >
                                  <RotateCcw className='size-3.5 me-2' /> Pulihkan Komsel
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setHardDeleteTarget(kms)}
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                >
                                  <Trash2 className='size-3.5 me-2' /> Hapus Permanen
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => handleEditOpen(kms)}>
                                  <Edit className='size-3.5 me-2' /> Edit Informasi
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/komsel/${kms.id}`}>
                                    <UserPlus className='size-3.5 me-2' /> Kelola Anggota
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                  onClick={() => setDeleteTarget(kms)}
                                >
                                  <Trash2 className='size-3.5 me-2' /> Hapus Komsel
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

      {/* ── Dialog Create Komsel ───────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreateForm() }}>
        <DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Tambah Komsel Baru</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Daftarkan kelompok Komunitas Sel (Komsel) baru.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Nama Komsel *</Label>
                <Input
                  placeholder='Contoh: Komsel Agape / Komsel Filadelfia'
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Wilayah Komsel *</Label>
                <Input
                  placeholder='Contoh: Padang Barat / Padang Timur / Kuranji'
                  value={wilayah}
                  onChange={(e) => setWilayah(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Hari Pertemuan *</Label>
                  <Select value={hari} onValueChange={(val) => setHari(val as any)}>
                    <SelectTrigger className='text-xs h-9'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HARI_OPTIONS.map((h) => (
                        <SelectItem key={h} value={h} className='text-xs'>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs'>Jam Pertemuan *</Label>
                  <Input
                    placeholder='Contoh: 19:00 WIB'
                    value={jam}
                    onChange={(e) => setJam(e.target.value)}
                    className='text-xs h-9'
                    required
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Target Kategorial (Opsional)</Label>
                <Select value={kategorialId} onValueChange={setKategorialId}>
                  <SelectTrigger className='text-xs h-9'>
                    <SelectValue placeholder='Pilih Kategorial...' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='' className='text-xs text-muted-foreground'>— Tidak ada target khusus —</SelectItem>
                    {kategorialOptions.map((k) => (
                      <SelectItem key={k.id} value={k.id} className='text-xs'>{k.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Koordinator Selector */}
              <div className='space-y-1.5'>
                <Label className='text-xs'>Koordinator Komsel (Opsional - Jemaat ACTIVE)</Label>
                <Popover open={koordinatorSelectorOpen} onOpenChange={setKoordinatorSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button variant='outline' role='combobox' className='w-full justify-between text-xs h-9'>
                      {selectedKoordinator ? `${selectedKoordinator.nama} (${selectedKoordinator.nij})` : 'Pilih Koordinator...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-full p-0' align='start'>
                    <Command>
                      <CommandInput
                        placeholder='Cari nama / NIJ...'
                        value={jemaatSearch}
                        onValueChange={setJemaatSearch}
                        className='text-xs'
                      />
                      <CommandList>
                        <CommandEmpty>Tidak ada Jemaat ACTIVE ditemukan.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value=''
                            onSelect={() => {
                              setKoordinatorId('')
                              setSelectedKoordinator(null)
                              setKoordinatorSelectorOpen(false)
                            }}
                            className='text-xs text-muted-foreground'
                          >
                            — Kosongkan Koordinator —
                          </CommandItem>
                          {jemaatOptions.map((j) => (
                            <CommandItem
                              key={j.id}
                              value={j.id}
                              onSelect={() => {
                                setKoordinatorId(j.id)
                                setKoordinatorSelectorOpen(false)
                              }}
                              className='text-xs'
                            >
                              <Check className={`size-3 me-2 ${koordinatorId === j.id ? 'opacity-100' : 'opacity-0'}`} />
                              {j.nama} — {j.nij}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedKoordinator && (
                  <div className='p-2.5 bg-muted/40 border rounded-lg text-xs space-y-0.5'>
                    <div className='font-semibold text-foreground'>{selectedKoordinator.nama}</div>
                    <div className='text-muted-foreground font-mono text-[11px]'>
                      NIJ: {selectedKoordinator.nij} • Kontak: {selectedKoordinator.noHp || '-'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => { setCreateOpen(false); resetCreateForm() }} disabled={isCreating}>
                Batal
              </Button>
              <Button type='submit' disabled={isCreating} className='gap-2'>
                {isCreating ? <Loader2 className='size-4 animate-spin' /> : <Plus className='size-4' />}
                {isCreating ? 'Menyimpan...' : 'Simpan Komsel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Edit Komsel ─────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent className='max-w-lg'>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Edit Informasi Komsel</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Perbarui detail Komsel {editTarget?.nama}.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Nama Komsel *</Label>
                <Input
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Wilayah Komsel *</Label>
                <Input
                  value={editWilayah}
                  onChange={(e) => setEditWilayah(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Hari Pertemuan *</Label>
                  <Select value={editHari} onValueChange={(val) => setEditHari(val as any)}>
                    <SelectTrigger className='text-xs h-9'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HARI_OPTIONS.map((h) => (
                        <SelectItem key={h} value={h} className='text-xs'>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs'>Jam Pertemuan *</Label>
                  <Input
                    value={editJam}
                    onChange={(e) => setEditJam(e.target.value)}
                    className='text-xs h-9'
                    required
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Target Kategorial (Opsional)</Label>
                <Select value={editKategorialId} onValueChange={setEditKategorialId}>
                  <SelectTrigger className='text-xs h-9'>
                    <SelectValue placeholder='Pilih Kategorial...' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='' className='text-xs text-muted-foreground'>— Tidak ada target khusus —</SelectItem>
                    {kategorialOptions.map((k) => (
                      <SelectItem key={k.id} value={k.id} className='text-xs'>{k.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => setEditTarget(null)} disabled={isUpdating}>
                Batal
              </Button>
              <Button type='submit' disabled={isUpdating} className='gap-2'>
                {isUpdating ? <Loader2 className='size-4 animate-spin' /> : <Edit className='size-4' />}
                {isUpdating ? 'Memperbarui...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog Soft Delete ────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeletionReason('') }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>
              Hapus Komsel Ini?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Komsel <strong className='text-foreground'>{deleteTarget?.nama}</strong> akan dinonaktifkan via Soft Delete.
                </span>
                <span className='block text-xs text-muted-foreground'>
                  Semua anggota Komsel akan dilepaskan secara aman (Jemaat.komselId = null). Data profil Jemaat TIDAK akan dihapus dan log audit SHA-256 dicatat.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan (Wajib):</label>
            <Textarea
              placeholder='Masukkan alasan penghapusan Komsel ini...'
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

      {/* ── AlertDialog Restore Confirm ───────────────────────── */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Komsel?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Komsel <strong className='text-foreground'>{restoreTarget?.nama}</strong> akan dipulihkan kembali ke daftar komsel aktif.
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
              Ya, Pulihkan Komsel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Hard Delete Confirm ───────────────────── */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5 text-rose-600' /> Hapus Permanen Komsel?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs'>
                  ⚠️ <strong>PERINGATAN</strong>: Komsel <strong className='text-foreground'>{hardDeleteTarget?.nama}</strong> akan dihapus secara permanen dari database.
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
              title='Cetak Lembar Direktori & Roster Anggota Komsel A4'
            >
              <Printer className='size-3.5' />
              <span>Cetak Lembar Komsel</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setSelectedBulkKategorialId('')
                setBulkKategorialModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Tetapkan Kategorial Pembina untuk Komsel terpilih'
            >
              <Layers className='size-3.5' />
              <span>Kategorial Pembina</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => setContactsModalOpen(true)}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 rounded-full whitespace-nowrap'
              title='Broadcast & Salin Nomor WhatsApp Koordinator Komsel'
            >
              <MessageSquare className='size-3.5' />
              <span>Kontak Koordinator</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleExportCsv}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ekspor data komsel terpilih ke CSV / Excel'
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
              title='Hapus data komsel terpilih (soft delete)'
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

      {/* ── MODAL 1: CETAK LEMBAR KOMSEL (A4 PORTRAIT) ──────────── */}
      <Dialog open={printSheetsModalOpen} onOpenChange={setPrintSheetsModalOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
          <DialogHeader className='p-4 sm:p-5 pb-3 sm:pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0'>
            <div className='min-w-0 flex-1 pe-6 sm:pe-0'>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2 leading-tight'>
                <Printer className='size-5 text-primary shrink-0' />
                <span>Pratinjau Lembar Komsel ({printSheetsData.length} Komsel)</span>
              </DialogTitle>
              <DialogDescription className='text-xs mt-0.5'>
                Dokumen resmi direktori dan roster anggota kelompok sel siap cetak A4.
              </DialogDescription>
            </div>
            <Button
              size='sm'
              onClick={handleOpenPrintSheets}
              className='w-full sm:w-auto gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm shrink-0'
            >
              <Printer className='size-4' /> Cetak Dokumen (Print / PDF)
            </Button>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-3 sm:p-6 bg-muted/20 space-y-6'>
            {isLoadingPrintSheets ? (
              <div className='py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs'>
                <Loader2 className='size-6 animate-spin text-primary' />
                <span>Menyiapkan susunan data lembar komsel...</span>
              </div>
            ) : printSheetsData.length === 0 ? (
              <div className='py-12 text-center text-xs text-muted-foreground'>
                Tidak ada data komsel yang dapat ditampilkan.
              </div>
            ) : (
              printSheetsData.map((kms) => {
                const members = (kms.anggota || []).map((a: any) => a.jemaat).filter(Boolean)
                const total = members.length
                const totalL = members.filter((m: any) => m.jenisKelamin === 'LAK_LAKI').length
                const totalP = members.filter((m: any) => m.jenisKelamin === 'PEREMPUAN').length
                const totalBaptis = members.filter((m: any) => m.statusBaptis === 'SUDAH_BAPTIS').length

                return (
                  <div
                    key={kms.id}
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
                            KOMSEL {kms.nama}
                          </div>
                          <div className='text-[10px] font-mono text-muted-foreground uppercase tracking-wider'>
                            WILAYAH: {kms.wilayah} • {kms.kategorial?.nama || 'KOMSEL UMUM'}
                          </div>
                        </div>
                      </div>
                      <Badge variant='outline' className='font-mono font-bold text-xs bg-primary/5 text-primary'>
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
                            <th className='p-2'>WhatsApp</th>
                            <th className='p-2 text-center'>Status</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y'>
                          {members.length > 0 ? (
                            members.slice(0, 8).map((j: any, idx: number) => (
                              <tr key={j.id} className='hover:bg-muted/20'>
                                <td className='p-2 text-center text-muted-foreground'>{idx + 1}</td>
                                <td className='p-2 font-bold text-foreground'>
                                  {j.nama}
                                  {j.namaPanggilan && <span className='text-muted-foreground font-normal'> ({j.namaPanggilan})</span>}
                                </td>
                                <td className='p-2 font-mono text-primary font-semibold'>{j.nij || '-'}</td>
                                <td className='p-2 text-center'>{j.jenisKelamin === 'LAK_LAKI' ? 'L' : 'P'}</td>
                                <td className='p-2 font-mono text-muted-foreground'>{j.noHp || j.whatsApp || '-'}</td>
                                <td className='p-2 text-center'>
                                  <Badge variant='outline' className='text-[10px] font-mono'>
                                    {j.statusJemaat || 'ACTIVE'}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className='p-4 text-center text-muted-foreground text-xs'>
                                Belum ada data anggota terdaftar di komsel ini.
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
              Format cetak A4 Portrait siap digunakan untuk supervisi pastoral & visitasi jemaat.
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

      {/* ── MODAL 2: TETAPKAN KATEGORIAL PEMBINA MASSAL ──────────── */}
      <Dialog open={bulkKategorialModalOpen} onOpenChange={setBulkKategorialModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Layers className='size-5 text-primary' />
              Tetapkan Kategorial Pembina ({selectedCount} Komsel)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tugaskan departemen kategorial pembina untuk seluruh komsel terpilih.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <Label className='text-xs font-semibold'>Pilih Kategorial Pembina:</Label>
            <Select value={selectedBulkKategorialId} onValueChange={setSelectedBulkKategorialId}>
              <SelectTrigger className='text-xs'>
                <SelectValue placeholder='Pilih Kategorial...' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>-- Tanpa Kategorial (Komsel Umum) --</SelectItem>
                {kategorialOptions.map((kat) => (
                  <SelectItem key={kat.id} value={kat.id}>
                    {kat.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setBulkKategorialModalOpen(false)} disabled={isBulkAssigningKategorial}>
              Batal
            </Button>
            <Button
              onClick={handleBulkKategorialSubmit}
              disabled={isBulkAssigningKategorial}
              className='gap-1.5'
            >
              {isBulkAssigningKategorial ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
              {isBulkAssigningKategorial ? 'Menyimpan...' : 'Simpan Kategorial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: BROADCAST & SALIN KONTAK KOORDINATOR ────────── */}
      <Dialog open={contactsModalOpen} onOpenChange={setContactsModalOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <MessageSquare className='size-5 text-emerald-600' />
              Kontak Koordinator Komsel ({selectedCount} Komsel)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Daftar nomor WhatsApp Koordinator / Pemimpin Komsel untuk pengiriman materi khotbah sel mingguan dan pengumuman pastoral.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <div className='flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20'>
              <div>
                <div className='font-bold text-emerald-800 dark:text-emerald-300 text-xs'>
                  {validCoordinatorContacts.length} Nomor WA Koordinator Teridentifikasi
                </div>
                <div className='text-[11px] text-muted-foreground'>
                  Dari total {selectedCount} komsel terpilih
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
              {selectedKomselData.map((item) => {
                const rawPhone = (item.koordinator?.noHp || '').replace(/[^0-9]/g, '')
                const waLink = rawPhone ? `https://wa.me/${rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone}` : null

                return (
                  <div key={item.id} className='p-2.5 px-3 flex items-center justify-between hover:bg-muted/30 text-xs'>
                    <div>
                      <div className='font-bold text-foreground'>{item.nama}</div>
                      <div className='text-[11px] text-muted-foreground'>
                        Koordinator: <span className='text-foreground font-medium'>{item.koordinator?.nama || '-'}</span> • {item.wilayah}
                      </div>
                    </div>
                    <div>
                      {rawPhone ? (
                        <div className='flex items-center gap-2'>
                          <span className='font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400'>
                            {item.koordinator?.noHp}
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

      {/* ── MODAL 4: HAPUS MASSAL KOMSEL (SOFT DELETE) ──────────── */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Pindahkan {selectedCount} Komsel ke Kotak Sampah?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Komsel terpilih akan diarsipkan ke kotak sampah (*soft delete*). Data anggota jemaat di dalamnya tetap aman dan tidak terhapus.
                </div>
                <div className='space-y-1 pt-1'>
                  <Label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan Massal (Wajib):</Label>
                  <Textarea
                    placeholder='Contoh: Restrukturisasi wilayah komsel tahun 2026'
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
