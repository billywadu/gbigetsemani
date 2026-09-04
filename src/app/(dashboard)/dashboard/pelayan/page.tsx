'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
  UserCheck,
  Loader2,
  FilterX,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  EyeOff,
  X,
  Check,
  Printer,
  MessageSquare,
  Download,
  Copy,
  ExternalLink,
  Tag,
  Layers,
  CheckCircle2,
  FileSpreadsheet,
  Users,
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
  getPelayanListAction,
  createPelayanAction,
  updatePelayanAction,
  deletePelayanAction,
  restorePelayanAction,
  hardDeletePelayanAction,
  getKategoriPelayananListAction,
  bulkSoftDeletePelayanAction,
  bulkAssignKategoriPelayananAction,
  getPelayanForPrintRosterAction,
} from '@/actions/pelayan'
import { getKategorialListAction } from '@/actions/kategorial'
import { getJemaatListAction } from '@/actions/jemaat'
import { toast } from 'sonner'
import { getEffectivePrintConfig, buildKopHtml, buildSignaturesHtml } from '@/lib/print-helpers'

export default function PelayanListPage() {
  const [loading, setLoading] = useState(true)
  const [pelayanList, setPelayanList] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [filterKategorialId, setFilterKategorialId] = useState<string>('all')
  const [filterKategoriPelayananId, setFilterKategoriPelayananId] = useState<string>('all')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Ref data
  const [kategorialOptions, setKategorialOptions] = useState<any[]>([])
  const [kategoriPelayananOptions, setKategoriPelayananOptions] = useState<any[]>([])

  // Pagination
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({
    nij: true,
    nama: true,
    kategorial: true,
    bidang: true,
    deskripsiTugas: true,
    status: true,
  })

  // Create Pelayan Modal
  const [createOpen, setCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [churchName, setChurchName] = useState('Gereja')

  // Form: Jemaat selector
  const [jemaatSearch, setJemaatSearch] = useState('')
  const [jemaatOptions, setJemaatOptions] = useState<any[]>([])
  const [selectedJemaatId, setSelectedJemaatId] = useState('')
  const [selectedJemaat, setSelectedJemaat] = useState<any | null>(null)
  const [jemaatSelectorOpen, setJemaatSelectorOpen] = useState(false)

  // Delete & Restore & Hard Delete states
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [hardDeleteTarget, setHardDeleteTarget] = useState<any | null>(null)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [isHardDeleting, setIsHardDeleting] = useState(false)

  // Bulk Actions States
  const [bulkCategoryModalOpen, setBulkCategoryModalOpen] = useState(false)
  const [selectedBulkCategories, setSelectedBulkCategories] = useState<string[]>([])
  const [isBulkAssigningCategory, setIsBulkAssigningCategory] = useState(false)

  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState('')
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const [printRosterModalOpen, setPrintRosterModalOpen] = useState(false)
  const [printRosterData, setPrintRosterData] = useState<any[]>([])
  const [isLoadingPrintRoster, setIsLoadingPrintRoster] = useState(false)

  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [copiedContacts, setCopiedContacts] = useState(false)

  // Form: Matrix Penugasan fields
  const [formDeskripsiTugas, setFormDeskripsiTugas] = useState('')
  const [formPenugasan, setFormPenugasan] = useState<{ kategorialId: string; kategoriPelayananIds: string[] }[]>([
    { kategorialId: '', kategoriPelayananIds: [] },
  ])

  // Edit Pelayan Modal
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editDeskripsiTugas, setEditDeskripsiTugas] = useState('')
  const [editPenugasan, setEditPenugasan] = useState<{ kategorialId: string; kategoriPelayananIds: string[] }[]>([
    { kategorialId: '', kategoriPelayananIds: [] },
  ])
  const [isUpdating, setIsUpdating] = useState(false)

  // Load ref data
  useEffect(() => {
    getKategorialListAction({ page: 1, pageSize: 50 }).then((res) => {
      if (res.success && res.data) setKategorialOptions(res.data.items)
    })
    getKategoriPelayananListAction().then((res) => {
      if (res.success && res.data) setKategoriPelayananOptions(res.data)
    })
  }, [])

  // Load jemaat for create form
  useEffect(() => {
    if (createOpen) {
      getJemaatListAction({ search: jemaatSearch, statusJemaat: 'ACTIVE' as any, page: 1, pageSize: 50 }).then((res) => {
        if (res.success && res.data) setJemaatOptions(res.data.items)
      })
    }
  }, [createOpen, jemaatSearch])

  // Sync selected jemaat preview
  useEffect(() => {
    if (selectedJemaatId) {
      const match = jemaatOptions.find((j) => j.id === selectedJemaatId)
      setSelectedJemaat(match || null)
    } else {
      setSelectedJemaat(null)
    }
  }, [selectedJemaatId, jemaatOptions])

  // Connected Kategorial Sets for Jemaat validation
  const selectedJemaatConnectedKategorialIds = React.useMemo(() => {
    if (!selectedJemaat) return new Set<string>()
    const set = new Set<string>()
    if (selectedJemaat.kategorialId || selectedJemaat.kategorial?.id) {
      set.add(selectedJemaat.kategorialId || selectedJemaat.kategorial?.id)
    }
    if (selectedJemaat.anggotaKategorialList) {
      selectedJemaat.anggotaKategorialList.forEach((ak: any) => set.add(ak.kategorialId))
    }
    return set
  }, [selectedJemaat])

  const editJemaatConnectedKategorialIds = React.useMemo(() => {
    if (!editTarget?.jemaat) return new Set<string>()
    const set = new Set<string>()
    if (editTarget.jemaat.kategorialId || editTarget.jemaat.kategorial?.id) {
      set.add(editTarget.jemaat.kategorialId || editTarget.jemaat.kategorial?.id)
    }
    if (editTarget.jemaat.anggotaKategorialList) {
      editTarget.jemaat.anggotaKategorialList.forEach((ak: any) => set.add(ak.kategorialId))
    }
    return set
  }, [editTarget])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getPelayanListAction({
      search: searchTerm,
      statusHapus: statusHapusFilter,
      kategorialId: filterKategorialId !== 'all' ? filterKategorialId : undefined,
      kategoriPelayananId: filterKategoriPelayananId !== 'all' ? filterKategoriPelayananId : undefined,
      page: pageIndex + 1,
      pageSize,
    })
    if (res.success && res.data) {
      setPelayanList(res.data.items)
      setTotalCount(res.data.total)
    } else {
      toast.error(res.error || 'Gagal memuat data pelayan.')
    }
    setLoading(false)
  }, [searchTerm, statusHapusFilter, filterKategorialId, filterKategoriPelayananId, pageIndex, pageSize])

  useEffect(() => {
    fetchData()
    getEffectivePrintConfig().then((pc) => {
      if (pc?.kop?.namaGereja) {
        setChurchName(pc.kop.namaGereja)
      }
    })
  }, [fetchData])

  // Load Reference Options (Kategorial & KategoriPelayanan)
  useEffect(() => {
    getKategorialListAction().then((res: any) => {
      if (res.success && res.data) {
        setKategorialOptions(res.data.items || res.data || [])
      }
    })
    getKategoriPelayananListAction({ statusHapus: 'ACTIVE' }).then((res: any) => {
      if (res.success && res.data) {
        setKategoriPelayananOptions(res.data.items || res.data || [])
      }
    })
  }, [])

  // Load Candidate Jemaat on Modal Open or Search
  useEffect(() => {
    if (createOpen) {
      getJemaatListAction({ search: jemaatSearch, page: 1, pageSize: 50 }).then((res) => {
        if (res.success && res.data) {
          setJemaatOptions(res.data.items)
        }
      })
    }
  }, [createOpen, jemaatSearch])

  // Sync Selected Jemaat Object
  useEffect(() => {
    if (selectedJemaatId) {
      const match = jemaatOptions.find((j) => j.id === selectedJemaatId)
      setSelectedJemaat(match || null)
    } else {
      setSelectedJemaat(null)
    }
  }, [selectedJemaatId, jemaatOptions])

  // Sorting state
  const [sortField, setSortField] = useState<'nama' | 'nij' | 'status' | null>('nama')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const sortedPelayanList = React.useMemo(() => {
    if (!sortField) return pelayanList
    return [...pelayanList].sort((a, b) => {
      let aVal = ''
      let bVal = ''
      if (sortField === 'nama') {
        aVal = a.jemaat?.nama || ''
        bVal = b.jemaat?.nama || ''
      } else if (sortField === 'nij') {
        aVal = a.jemaat?.nij || ''
        bVal = b.jemaat?.nij || ''
      } else if (sortField === 'status') {
        aVal = a.jemaat?.statusJemaat || ''
        bVal = b.jemaat?.statusJemaat || ''
      }
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [pelayanList, sortField, sortOrder])

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id])
  const selectedCount = selectedIds.length

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    sortedPelayanList.forEach((item) => {
      updated[item.id] = checked
    })
    setSelectedRows(updated)
  }

  const isAllSelected = sortedPelayanList.length > 0 && sortedPelayanList.every((p) => selectedRows[p.id])

  const selectedPelayanData = sortedPelayanList.filter((item) => selectedRows[item.id])
  const validPhoneContacts = selectedPelayanData
    .map((item) => ({
      nama: item.jemaat?.nama || 'Pelayan',
      noHp: (item.jemaat?.noHp || item.jemaat?.whatsApp || '').replace(/[^0-9]/g, ''),
      bidang: (item.kategoriPelayanan || []).map((b: any) => b.kategoriPelayanan?.nama).join(', ') || '-',
    }))
    .filter((c) => c.noHp.length >= 8)

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows((prev) => ({ ...prev, [id]: checked }))
  }

  // 1. Export CSV Handler
  const handleExportCsv = () => {
    const targets = selectedCount > 0 ? selectedPelayanData : pelayanList

    if (targets.length === 0) {
      toast.error('Tidak ada data pelayan untuk diekspor.')
      return
    }

    const headers = [
      'NIJ',
      'Nama Lengkap',
      'Kategorial',
      'Divisi Pelayanan',
      'No. HP / WA',
      'Komsel',
      'Deskripsi Tugas',
      'Status Data',
      'Tanggal Bergabung',
    ]

    const rows = targets.map((item) => {
      const j = item.jemaat || {}
      const bidangStr = (item.kategoriPelayanan || [])
        .map((b: any) => b.kategoriPelayanan?.nama)
        .filter(Boolean)
        .join('; ')
      return [
        `"${j.nij || '-'}"`,
        `"${(j.nama || '').replace(/"/g, '""')}"`,
        `"${item.kategorial?.nama || '-'}"`,
        `"${bidangStr.replace(/"/g, '""') || '-'}"`,
        `"${j.noHp || j.whatsApp || '-'}"`,
        `"${j.komsel?.nama || '-'}"`,
        `"${(item.deskripsiTugas || '').replace(/"/g, '""')}"`,
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
    link.setAttribute('download', `Data_Pelayan_Ibadah_${cleanChurch}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${targets.length} data pelayan ke CSV.`)
  }

  // 2. Direct Print Roster Sheet (Without Preview Modal)
  const handleOpenPrintRoster = async () => {
    if (selectedIds.length === 0) {
      toast.error('Pilih minimal satu pelayan untuk dicetak.')
      return
    }
    const toastId = toast.loading('Menyiapkan roster cetak pelayan...')
    setIsLoadingPrintRoster(true)
    const res = await getPelayanForPrintRosterAction(selectedIds)
    setIsLoadingPrintRoster(false)
    toast.dismiss(toastId)

    if (!res.success || !res.data || res.data.length === 0) {
      toast.error(res.error || 'Gagal memuat data roster pelayan.')
      return
    }

    const printRosterData = res.data
    const printConfig = await getEffectivePrintConfig()

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const rowsHtml = printRosterData.map((item, idx) => {
      const j = item.jemaat || {}
      const roles = ((item.kategoriPelayanan as any) || [])
        .map((pk: any) => pk.kategoriPelayanan?.nama)
        .filter(Boolean)
        .join(', ') || '-'
      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700;">${j.nama || '-'}${j.namaPanggilan ? ` (${j.namaPanggilan})` : ''}</td>
          <td style="font-family: monospace; text-align: center;">${j.nij || '-'}</td>
          <td style="font-weight: 600; color: #0f172a;">${roles}</td>
          <td>${item.kategorial?.nama || '-'}</td>
          <td>${j.noHp || j.whatsApp || '-'}</td>
          <td>${j.komsel?.nama || '-'}</td>
          <td style="font-size: 9.5px; color: #64748b;">${item.deskripsiTugas || '-'}</td>
        </tr>
      `
    }).join('')

    const kopHtml = buildKopHtml(printConfig, {
      badgeText: 'ROSTER RESMI PELAYANAN',
      dateText: `Total: ${printRosterData.length} Pelayan • ${new Date().toLocaleDateString('id-ID')}`,
    })

    const signaturesHtml = buildSignaturesHtml(printConfig, [
      { roleKey: 'koordinatorDivisi', customTitle: 'Koordinator Pelayanan Ibadah' },
      { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
    ])

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Roster Pelayan Ibadah (${printRosterData.length} Pelayan) - ${printConfig.kop?.namaGereja || 'Gereja'}</title>
        <style>
          @page {
            size: ${printConfig.options.ukuranKertasDefault || 'A4'} landscape;
            margin: 10mm;
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
          .roster-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 16px;
          }
          .roster-table th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 5px 7px;
            font-weight: 800;
            text-align: left;
          }
          .roster-table td {
            border: 1px solid #e2e8f0;
            padding: 5px 7px;
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        ${kopHtml}

        <table class="roster-table">
          <thead>
            <tr>
              <th style="width: 25px;">No</th>
              <th>Nama Lengkap</th>
              <th style="width: 85px;">NIJ</th>
              <th>Divisi / Kategori Pelayanan</th>
              <th>Kategorial</th>
              <th>WhatsApp</th>
              <th>Komsel</th>
              <th>Deskripsi Tugas</th>
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

  // 3. Bulk Assign Ministry Categories Submit
  const handleBulkCategorySubmit = async () => {
    if (selectedIds.length === 0) return
    if (selectedBulkCategories.length === 0) {
      toast.error('Pilih minimal satu kategori pelayanan.')
      return
    }

    setIsBulkAssigningCategory(true)
    const res = await bulkAssignKategoriPelayananAction({
      ids: selectedIds,
      kategoriPelayananIds: selectedBulkCategories,
    })
    setIsBulkAssigningCategory(false)
    if (res.success) {
      toast.success(res.message)
      setBulkCategoryModalOpen(false)
      setSelectedBulkCategories([])
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menugaskan kategori pelayanan.')
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
    const res = await bulkSoftDeletePelayanAction({
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
      toast.error(res.error || 'Gagal menghapus data pelayan.')
    }
  }

  // 5. Copy All Contacts
  const handleCopyAllContacts = () => {
    if (validPhoneContacts.length === 0) return
    const contactLines = validPhoneContacts.map((c) => `${c.nama} (${c.bidang}): ${c.noHp}`).join('\n')
    navigator.clipboard.writeText(contactLines)
    setCopiedContacts(true)
    toast.success(`${validPhoneContacts.length} nomor WhatsApp pelayan berhasil disalin!`)
    setTimeout(() => setCopiedContacts(false), 2500)
  }

  const resetCreateForm = () => {
    setSelectedJemaatId('')
    setSelectedJemaat(null)
    setFormDeskripsiTugas('')
    setFormPenugasan([{ kategorialId: '', kategoriPelayananIds: [] }])
    setJemaatSearch('')
  }

  const addCreatePenugasanRow = () => {
    setFormPenugasan((prev) => [...prev, { kategorialId: '', kategoriPelayananIds: [] }])
  }

  const removeCreatePenugasanRow = (index: number) => {
    setFormPenugasan((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleCreatePenugasanBidang = (index: number, kpId: string) => {
    setFormPenugasan((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const exists = item.kategoriPelayananIds.includes(kpId)
        return {
          ...item,
          kategoriPelayananIds: exists
            ? item.kategoriPelayananIds.filter((id) => id !== kpId)
            : [...item.kategoriPelayananIds, kpId],
        }
      })
    )
  }

  const setCreatePenugasanKategorial = (index: number, kategorialId: string) => {
    setFormPenugasan((prev) =>
      prev.map((item, i) => (i === index ? { ...item, kategorialId } : item))
    )
  }

  const addEditPenugasanRow = () => {
    setEditPenugasan((prev) => [...prev, { kategorialId: '', kategoriPelayananIds: [] }])
  }

  const removeEditPenugasanRow = (index: number) => {
    setEditPenugasan((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleEditPenugasanBidang = (index: number, kpId: string) => {
    setEditPenugasan((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const exists = item.kategoriPelayananIds.includes(kpId)
        return {
          ...item,
          kategoriPelayananIds: exists
            ? item.kategoriPelayananIds.filter((id) => id !== kpId)
            : [...item.kategoriPelayananIds, kpId],
        }
      })
    )
  }

  const setEditPenugasanKategorial = (index: number, kategorialId: string) => {
    setEditPenugasan((prev) =>
      prev.map((item, i) => (i === index ? { ...item, kategorialId } : item))
    )
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJemaatId) { toast.error('Pilih Jemaat yang akan didaftarkan!'); return }

    const validPenugasan = formPenugasan
      .filter((p) => p.kategoriPelayananIds.length > 0)
      .map((p) => ({
        kategorialId: p.kategorialId || undefined,
        kategoriPelayananIds: p.kategoriPelayananIds,
      }))

    if (validPenugasan.length === 0) {
      toast.error('Pilih minimal satu bidang pelayanan pada kategorial yang ditentukan!')
      return
    }

    setIsSubmitting(true)
    const res = await createPelayanAction({
      jemaatId: selectedJemaatId,
      deskripsiTugas: formDeskripsiTugas.trim() || null,
      penugasan: validPenugasan as any,
    })
    setIsSubmitting(false)

    if (res.success) {
      toast.success('Pelayan berhasil didaftarkan! Terlindungi audit log SHA-256.')
      setCreateOpen(false)
      resetCreateForm()
      fetchData()
    } else {
      toast.error(res.error || 'Gagal mendaftarkan pelayan.')
    }
  }

  const handleEditOpen = (pelayan: any) => {
    setEditTarget(pelayan)
    setEditDeskripsiTugas(pelayan.deskripsiTugas || '')

    const grouped: Record<string, string[]> = {}
    pelayan.kategoriPelayanan.forEach((pk: any) => {
      const kId = pk.kategorialId || pk.kategorial?.id || ''
      if (!grouped[kId]) grouped[kId] = []
      if (!grouped[kId].includes(pk.kategoriPelayananId)) {
        grouped[kId].push(pk.kategoriPelayananId)
      }
    })

    const initialRows = Object.entries(grouped).map(([kId, kpIds]) => ({
      kategorialId: kId,
      kategoriPelayananIds: kpIds,
    }))

    if (initialRows.length === 0) {
      initialRows.push({ kategorialId: '', kategoriPelayananIds: [] })
    }

    setEditPenugasan(initialRows)
    setEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return

    const validPenugasan = editPenugasan
      .filter((p) => p.kategoriPelayananIds.length > 0)
      .map((p) => ({
        kategorialId: p.kategorialId || undefined,
        kategoriPelayananIds: p.kategoriPelayananIds,
      }))

    if (validPenugasan.length === 0) {
      toast.error('Pilih minimal satu bidang pelayanan pada kategorial yang ditentukan!')
      return
    }

    setIsUpdating(true)
    const res = await updatePelayanAction({
      id: editTarget.id,
      deskripsiTugas: editDeskripsiTugas.trim() || null,
      penugasan: validPenugasan as any,
    })
    setIsUpdating(false)

    if (res.success) {
      toast.success('Data pelayan berhasil diperbarui! Log audit SHA-256 tersimpan.')
      setEditOpen(false)
      setEditTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui pelayan.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !deletionReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }
    setIsDeleting(true)
    const res = await deletePelayanAction({ id: deleteTarget.id, reason: deletionReason.trim() })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Pelayan berhasil di-soft delete.')
      setDeleteTarget(null)
      setDeletionReason('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus pelayan.')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    const res = await restorePelayanAction({ id: restoreTarget.id })
    setIsRestoring(false)

    if (res.success) {
      toast.success(res.message || 'Pelayan berhasil dipulihkan!')
      setRestoreTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memulihkan pelayan.')
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return
    setIsHardDeleting(true)
    const res = await hardDeletePelayanAction({
      id: hardDeleteTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Pelayan berhasil dihapus permanen dari database!')
      setHardDeleteTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen pelayan.')
    }
  }

  const renderSortableHeader = (title: string, columnKey: keyof typeof visibleColumns, field?: 'nama' | 'nij' | 'status') => {
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
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Pelayan Ibadah</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Kelola penugasan dan bidang pelayanan jemaat.
          </p>
        </div>
        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button size='sm' onClick={() => setCreateOpen(true)} className='flex-1 sm:flex-initial h-9 sm:h-8 gap-1.5 text-xs shadow-xs'>
            <Plus className='size-3.5' /> Tambah Pelayan
          </Button>
        </div>
      </div>

      {/* Top Sub-Navigation Tabs matching shadcn design */}
      <div className='flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl w-fit border'>
        <Button
          asChild
          size='sm'
          variant='secondary'
          className='h-8 text-xs font-semibold gap-1.5 shadow-xs bg-background text-foreground'
        >
          <Link href='/dashboard/pelayan'>
            <Users className='size-3.5 text-primary' />
            <span>Daftar Pelayan</span>
            <Badge variant='outline' className='text-[10px] py-0 px-1.5 ml-1 font-mono'>
              {totalCount}
            </Badge>
          </Link>
        </Button>

        <Button
          asChild
          size='sm'
          variant='ghost'
          className='h-8 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground'
        >
          <Link href='/dashboard/pelayan/kategori'>
            <Tag className='size-3.5 text-primary' />
            <span>Divisi & Bidang Pelayanan</span>
            <Badge variant='outline' className='text-[10px] py-0 px-1.5 ml-1 font-mono'>
              {kategoriPelayananOptions.length}
            </Badge>
          </Link>
        </Button>
      </div>

      {/* Toolbar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <Input
            placeholder='Cari nama, NIJ, tugas...'
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPageIndex(0) }}
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

            <Select value={filterKategorialId} onValueChange={(v) => { setFilterKategorialId(v); setPageIndex(0) }}>
              <SelectTrigger className='h-8 text-xs w-full sm:w-36'>
                <SelectValue placeholder='Filter Kategorial' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs'>Semua Kategorial</SelectItem>
                {kategorialOptions.map((k) => (
                  <SelectItem key={k.id} value={k.id} className='text-xs'>{k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterKategoriPelayananId} onValueChange={(v) => { setFilterKategoriPelayananId(v); setPageIndex(0) }}>
              <SelectTrigger className='h-8 text-xs w-full sm:w-40'>
                <SelectValue placeholder='Filter Bidang Pelayanan' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all' className='text-xs'>Semua Bidang</SelectItem>
                {kategoriPelayananOptions.map((k) => (
                  <SelectItem key={k.id} value={k.id} className='text-xs'>{k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm || statusHapusFilter !== 'ACTIVE' || filterKategorialId !== 'all' || filterKategoriPelayananId !== 'all') && (
              <Button
                variant='ghost' size='sm'
                onClick={() => {
                  setSearchTerm('')
                  setStatusHapusFilter('ACTIVE')
                  setFilterKategorialId('all')
                  setFilterKategoriPelayananId('all')
                  setPageIndex(0)
                }}
                className='h-8 px-2 text-xs gap-1 text-muted-foreground shrink-0'
              >
                Reset <FilterX className='size-3' />
              </Button>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='h-8 w-full sm:w-auto gap-1.5 text-xs'>
              <SlidersHorizontal className='size-3.5' /> View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuLabel className='text-xs'>Toggle Kolom</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(['nij', 'nama', 'kategorial', 'bidang', 'deskripsiTugas', 'status'] as const).map((col) => (
              <DropdownMenuCheckboxItem
                key={col}
                checked={visibleColumns[col]}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, [col]: !!c }))}
              >
                {col === 'nij' ? 'NIJ' : col === 'nama' ? 'Nama' : col === 'kategorial' ? 'Kategorial' : col === 'bidang' ? 'Bidang Pelayanan' : col === 'deskripsiTugas' ? 'Deskripsi Tugas' : 'Status'}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Table */}
      <div className='rounded-md border overflow-hidden bg-card'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent border-b'>
                <TableHead className='w-10 px-3'>
                  <Checkbox checked={isAllSelected} onCheckedChange={(c) => handleSelectAll(!!c)} />
                </TableHead>
                {visibleColumns.nij && <TableHead className='px-3'>{renderSortableHeader('NIJ', 'nij', 'nij')}</TableHead>}
                {visibleColumns.nama && <TableHead className='px-3'>{renderSortableHeader('Nama Pelayan', 'nama', 'nama')}</TableHead>}
                {visibleColumns.kategorial && <TableHead className='px-3'>{renderSortableHeader('Kategorial', 'kategorial')}</TableHead>}
                {visibleColumns.bidang && <TableHead className='px-3'>{renderSortableHeader('Bidang Pelayanan', 'bidang')}</TableHead>}
                {visibleColumns.deskripsiTugas && <TableHead className='px-3'>{renderSortableHeader('Deskripsi Tugas', 'deskripsiTugas')}</TableHead>}
                {visibleColumns.status && <TableHead className='px-3'>{renderSortableHeader('Status', 'status', 'status')}</TableHead>}
                <TableHead className='w-12.5 px-3'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-32 text-center text-muted-foreground text-sm'>
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='size-4 animate-spin text-primary' /> Memuat data pelayan...
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedPelayanList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-32 text-center text-muted-foreground text-sm'>
                    Belum ada Pelayan yang terdaftar.
                  </TableCell>
                </TableRow>
              ) : (
                sortedPelayanList.map((pelayan) => {
                  const isDeleted = !!pelayan.deletedAt
                  return (
                    <TableRow
                      key={pelayan.id}
                      className={`transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'} ${selectedRows[pelayan.id] ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className='px-3 py-2.5'>
                        <Checkbox
                          checked={!!selectedRows[pelayan.id]}
                          onCheckedChange={(c) => setSelectedRows((p) => ({ ...p, [pelayan.id]: !!c }))}
                        />
                      </TableCell>
                      {visibleColumns.nij && (
                        <TableCell className='px-3 py-2.5 font-mono text-xs font-bold text-primary'>
                          {pelayan.jemaat.nij}
                        </TableCell>
                      )}
                      {visibleColumns.nama && (
                        <TableCell className='px-3 py-2.5 font-semibold text-sm text-foreground'>
                          <div className='flex items-center gap-2'>
                            <span>{pelayan.jemaat.nama}</span>
                            {isDeleted && (
                              <Badge variant='destructive' className='text-[10px] gap-1 font-mono'>
                                <Trash2 className='size-3' /> Terhapus
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.kategorial && (
                        <TableCell className='px-3 py-2.5 text-xs'>
                          {(() => {
                            const kategorialMap = new Map<string, string>()
                            if (pelayan.kategorial) {
                              kategorialMap.set(pelayan.kategorial.id, pelayan.kategorial.nama)
                            }
                            pelayan.kategoriPelayanan?.forEach((pk: any) => {
                              if (pk.kategorial) {
                                kategorialMap.set(pk.kategorial.id, pk.kategorial.nama)
                              }
                            })
                            const kategorials = Array.from(kategorialMap.entries())
                            if (kategorials.length === 0) {
                              return <span className='text-muted-foreground'>-</span>
                            }
                            return (
                              <div className='flex flex-wrap gap-1'>
                                {kategorials.map(([id, nama]) => (
                                  <Badge key={id} variant='secondary' className='text-[10px] py-0 px-1.5 font-normal'>
                                    {nama}
                                  </Badge>
                                ))}
                              </div>
                            )
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.bidang && (
                        <TableCell className='px-3 py-2.5 text-xs'>
                          <div className='flex flex-wrap gap-1 max-w-sm'>
                            {pelayan.kategoriPelayanan.slice(0, 3).map((pk: any) => (
                              <Badge key={pk.id} variant='outline' className='font-normal text-[10px] py-0 px-1.5 flex items-center gap-1'>
                                {pk.kategorial && (
                                  <span className='font-bold text-primary'>[{pk.kategorial.nama}]</span>
                                )}
                                <span>{pk.kategoriPelayanan.nama}</span>
                              </Badge>
                            ))}
                            {pelayan.kategoriPelayanan.length > 3 && (
                              <Badge variant='secondary' className='font-normal text-[10px] py-0 px-1.5'>
                                +{pelayan.kategoriPelayanan.length - 3} lagi
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.deskripsiTugas && (
                        <TableCell className='px-3 py-2.5 text-xs text-muted-foreground max-w-50 truncate'>
                          {pelayan.deskripsiTugas || '-'}
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell className='px-3 py-2.5'>
                          <Badge className={
                            pelayan.jemaat.statusJemaat === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px]'
                          }>
                            {pelayan.jemaat.statusJemaat}
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
                            <DropdownMenuLabel className='text-xs'>Aksi Pelayan</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/jemaat/${pelayan.jemaat.id}`}>
                                <Eye className='size-3.5 me-2' /> Lihat Profil Jemaat
                              </Link>
                            </DropdownMenuItem>

                            {isDeleted ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setRestoreTarget(pelayan)}
                                  className='text-emerald-600 dark:text-emerald-400 text-xs'
                                >
                                  <RotateCcw className='size-3.5 me-2' /> Pulihkan Pelayan
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setHardDeleteTarget(pelayan)}
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                >
                                  <Trash2 className='size-3.5 me-2' /> Hapus Permanen
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => handleEditOpen(pelayan)}>
                                  <Edit className='size-3.5 me-2' /> Edit Penugasan Pelayanan
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                  onClick={() => setDeleteTarget(pelayan)}
                                >
                                  <Trash2 className='size-3.5 me-2' /> Soft Delete Pelayan
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

        {/* Footer */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border-t text-xs text-muted-foreground bg-card'>
          <div className='text-center sm:text-left shrink-0'>
            <span className='font-medium text-foreground'>{selectedCount}</span> dari {totalCount} baris dipilih.
          </div>
          <div className='flex items-center justify-between sm:justify-end gap-4'>
            <div className='flex items-center gap-1.5'>
              <span className='whitespace-nowrap'>Per halaman</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPageIndex(0) }}>
                <SelectTrigger className='h-7 w-14 text-xs'><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['5', '10', '20', '50'].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center gap-2'>
              <span className='whitespace-nowrap'>Hal. {pageIndex + 1} / {totalPages}</span>
              <div className='flex items-center gap-0.5'>
                <Button variant='outline' size='icon' className='size-7' disabled={pageIndex === 0} onClick={() => setPageIndex(0)}><ChevronsLeft className='size-3.5' /></Button>
                <Button variant='outline' size='icon' className='size-7' disabled={pageIndex === 0} onClick={() => setPageIndex((p) => p - 1)}><ChevronLeft className='size-3.5' /></Button>
                <Button variant='outline' size='icon' className='size-7' disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex((p) => p + 1)}><ChevronRight className='size-3.5' /></Button>
                <Button variant='outline' size='icon' className='size-7' disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(totalPages - 1)}><ChevronsRight className='size-3.5' /></Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialog Create Pelayan ─────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreateForm() }}>
        <DialogContent className='w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-5'>
          <form onSubmit={handleCreateSubmit} className='overflow-x-hidden'>
            <DialogHeader className='pr-6 text-left space-y-1'>
              <DialogTitle className='text-base sm:text-lg font-bold tracking-tight'>Daftarkan Pelayan</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Penugasan jemaat melayani di kategorial & bidang pelayanan.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3.5 py-3 text-xs overflow-x-hidden'>
              {/* Jemaat Selector */}
              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>Pilih Jemaat *</Label>
                <Popover open={jemaatSelectorOpen} onOpenChange={setJemaatSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button variant='outline' role='combobox' className='w-full justify-between text-xs h-9 px-3'>
                      <span className='truncate text-left'>
                        {selectedJemaat ? `${selectedJemaat.nama} (${selectedJemaat.nij})` : 'Cari & pilih jemaat...'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-(--radix-popover-trigger-width) p-0' align='start'>
                    <Command>
                      <CommandInput
                        placeholder='Cari nama / NIJ...'
                        value={jemaatSearch}
                        onValueChange={setJemaatSearch}
                        className='text-xs'
                      />
                      <CommandList>
                        <CommandEmpty>Tidak ada jemaat ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {jemaatOptions.map((j) => (
                            <CommandItem
                              key={j.id}
                              value={j.id}
                              onSelect={() => { setSelectedJemaatId(j.id); setJemaatSelectorOpen(false) }}
                              className='text-xs'
                            >
                              <Check className={`size-3 me-2 shrink-0 ${selectedJemaatId === j.id ? 'opacity-100' : 'opacity-0'}`} />
                              <span className='truncate'>{j.nama} — {j.nij}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Jemaat Preview */}
                {selectedJemaat && (
                  <div className='p-2.5 bg-muted/40 border rounded-lg space-y-1 text-xs overflow-hidden'>
                    <div className='font-semibold text-foreground flex items-center justify-between gap-2'>
                      <span className='truncate font-bold'>{selectedJemaat.nama}</span>
                      <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] shrink-0'>
                        {selectedJemaat.statusJemaat}
                      </Badge>
                    </div>
                    <div className='text-muted-foreground font-mono text-[11px] truncate'>
                      NIJ: {selectedJemaat.nij} • {selectedJemaat.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}
                    </div>
                    <div className='text-[11px] flex items-center gap-1.5 flex-wrap pt-0.5'>
                      <span className='font-medium text-foreground shrink-0'>Kategorial:</span>
                      {selectedJemaatConnectedKategorialIds.size > 0 ? (
                        kategorialOptions
                          .filter((k) => selectedJemaatConnectedKategorialIds.has(k.id))
                          .map((k) => (
                            <Badge key={k.id} variant='secondary' className='text-[10px] py-0 px-1.5 font-normal'>
                              {k.nama}
                            </Badge>
                          ))
                      ) : (
                        <span className='italic text-amber-600 dark:text-amber-400 text-[10px]'>Hanya Ibadah Raya / Umum</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Deskripsi Tugas */}
              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>Deskripsi Tugas (Opsional)</Label>
                <Input
                  placeholder='Contoh: Pemain Bass, Multimedia...'
                  value={formDeskripsiTugas}
                  onChange={(e) => setFormDeskripsiTugas(e.target.value)}
                  className='text-xs h-8.5'
                />
              </div>

              {/* Matriks Penugasan Multi-Kategorial */}
              <div className='space-y-2.5 pt-1'>
                <div className='flex items-center justify-between gap-2'>
                  <Label className='text-xs font-bold text-foreground flex items-center gap-1.5'>
                    <Layers className='size-3.5 text-primary shrink-0' /> Penugasan Pelayanan *
                  </Label>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={addCreatePenugasanRow}
                    className='h-7 text-xs gap-1 border-dashed px-2.5 shrink-0'
                  >
                    <Plus className='size-3' /> Tambah Kategorial
                  </Button>
                </div>

                <div className='space-y-2.5'>
                  {formPenugasan.map((penugasanItem, pIdx) => (
                    <div key={pIdx} className='border rounded-lg p-2.5 sm:p-3 bg-card space-y-2.5 shadow-2xs overflow-hidden'>
                      <div className='flex items-center justify-between gap-2 border-b pb-2'>
                        <div className='flex items-center gap-2 flex-1 min-w-0'>
                          <span className='text-[11px] font-semibold text-muted-foreground shrink-0'>Kategorial:</span>
                          <Select
                            value={penugasanItem.kategorialId || 'umum'}
                            onValueChange={(v) => setCreatePenugasanKategorial(pIdx, v === 'umum' ? '' : v)}
                          >
                            <SelectTrigger className='text-xs h-7.5 w-full min-w-0'>
                              <SelectValue placeholder='Pilih Kategorial...' />
                            </SelectTrigger>
                            <SelectContent className='max-h-56'>
                              <SelectItem value='umum' className='text-xs font-semibold'>— Ibadah Raya / Umum —</SelectItem>
                              {kategorialOptions.map((k) => {
                                const isMember = selectedJemaatConnectedKategorialIds.has(k.id)
                                return (
                                  <SelectItem
                                    key={k.id}
                                    value={k.id}
                                    disabled={!isMember}
                                    className='text-xs'
                                  >
                                    {k.nama} {isMember ? '(Anggota)' : '(Bukan Anggota)'}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        {formPenugasan.length > 1 && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => removeCreatePenugasanRow(pIdx)}
                            className='size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 shrink-0'
                            title='Hapus baris ini'
                          >
                            <X className='size-3.5' />
                          </Button>
                        )}
                      </div>

                      <div className='space-y-1.5'>
                        <span className='text-[11px] text-muted-foreground block font-medium'>Bidang Pelayanan:</span>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-1.5'>
                          {kategoriPelayananOptions.map((kp) => {
                            const isChecked = penugasanItem.kategoriPelayananIds.includes(kp.id)
                            return (
                              <label
                                key={kp.id}
                                className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors text-xs select-none min-w-0 ${
                                  isChecked ? 'bg-primary/10 border-primary/40 font-semibold text-foreground shadow-2xs' : 'bg-background hover:bg-muted/40 text-muted-foreground'
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleCreatePenugasanBidang(pIdx, kp.id)}
                                  className='shrink-0'
                                />
                                <span className='truncate text-xs min-w-0'>{kp.nama}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className='flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2'>
              <Button variant='outline' type='button' onClick={() => { setCreateOpen(false); resetCreateForm() }} disabled={isSubmitting} className='w-full sm:w-auto h-8.5 text-xs'>
                Batal
              </Button>
              <Button
                type='submit'
                disabled={isSubmitting || !selectedJemaatId || formPenugasan.every((p) => p.kategoriPelayananIds.length === 0)}
                className='gap-2 w-full sm:w-auto h-8.5 text-xs'
              >
                {isSubmitting ? <Loader2 className='size-3.5 animate-spin' /> : <UserCheck className='size-3.5' />}
                {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Pelayan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Edit Pelayan ───────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-5'>
          <form onSubmit={handleEditSubmit} className='overflow-x-hidden'>
            <DialogHeader className='pr-6 text-left space-y-1'>
              <DialogTitle className='text-base sm:text-lg font-bold tracking-tight'>Edit Penugasan Pelayan</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground truncate'>
                {editTarget?.jemaat?.nama} ({editTarget?.jemaat?.nij})
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3.5 py-3 text-xs overflow-x-hidden'>
              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>Deskripsi Tugas (Opsional)</Label>
                <Input
                  placeholder='Contoh: Pemain Bass, Multimedia...'
                  value={editDeskripsiTugas}
                  onChange={(e) => setEditDeskripsiTugas(e.target.value)}
                  className='text-xs h-8.5'
                />
              </div>

              {/* Matriks Penugasan Multi-Kategorial (Edit) */}
              <div className='space-y-2.5 pt-1'>
                <div className='flex items-center justify-between gap-2'>
                  <Label className='text-xs font-bold text-foreground flex items-center gap-1.5'>
                    <Layers className='size-3.5 text-primary shrink-0' /> Penugasan Pelayanan *
                  </Label>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={addEditPenugasanRow}
                    className='h-7 text-xs gap-1 border-dashed px-2.5 shrink-0'
                  >
                    <Plus className='size-3' /> Tambah Kategorial
                  </Button>
                </div>

                <div className='space-y-2.5'>
                  {editPenugasan.map((penugasanItem, pIdx) => (
                    <div key={pIdx} className='border rounded-lg p-2.5 sm:p-3 bg-card space-y-2.5 shadow-2xs overflow-hidden'>
                      <div className='flex items-center justify-between gap-2 border-b pb-2'>
                        <div className='flex items-center gap-2 flex-1 min-w-0'>
                          <span className='text-[11px] font-semibold text-muted-foreground shrink-0'>Kategorial:</span>
                          <Select
                            value={penugasanItem.kategorialId || 'umum'}
                            onValueChange={(v) => setEditPenugasanKategorial(pIdx, v === 'umum' ? '' : v)}
                          >
                            <SelectTrigger className='text-xs h-7.5 w-full min-w-0'>
                              <SelectValue placeholder='Pilih Kategorial...' />
                            </SelectTrigger>
                            <SelectContent className='max-h-56'>
                              <SelectItem value='umum' className='text-xs font-semibold'>— Ibadah Raya / Umum —</SelectItem>
                              {kategorialOptions.map((k) => {
                                const isMember = editJemaatConnectedKategorialIds.has(k.id)
                                return (
                                  <SelectItem
                                    key={k.id}
                                    value={k.id}
                                    disabled={!isMember}
                                    className='text-xs'
                                  >
                                    {k.nama} {isMember ? '(Anggota)' : '(Bukan Anggota)'}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        {editPenugasan.length > 1 && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => removeEditPenugasanRow(pIdx)}
                            className='size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 shrink-0'
                            title='Hapus baris ini'
                          >
                            <X className='size-3.5' />
                          </Button>
                        )}
                      </div>

                      <div className='space-y-1.5'>
                        <span className='text-[11px] text-muted-foreground block font-medium'>Bidang Pelayanan:</span>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-1.5'>
                          {kategoriPelayananOptions.map((kp) => {
                            const isChecked = penugasanItem.kategoriPelayananIds.includes(kp.id)
                            return (
                              <label
                                key={kp.id}
                                className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors text-xs select-none min-w-0 ${
                                  isChecked ? 'bg-primary/10 border-primary/40 font-semibold text-foreground shadow-2xs' : 'bg-background hover:bg-muted/40 text-muted-foreground'
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleEditPenugasanBidang(pIdx, kp.id)}
                                  className='shrink-0'
                                />
                                <span className='truncate text-xs min-w-0'>{kp.nama}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className='flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2'>
              <Button variant='outline' type='button' onClick={() => setEditOpen(false)} disabled={isUpdating} className='w-full sm:w-auto h-8.5 text-xs'>
                Batal
              </Button>
              <Button
                type='submit'
                disabled={isUpdating || editPenugasan.every((p) => p.kategoriPelayananIds.length === 0)}
                className='gap-2 w-full sm:w-auto h-8.5 text-xs'
              >
                {isUpdating ? <Loader2 className='size-3.5 animate-spin' /> : <Edit className='size-3.5' />}
                {isUpdating ? 'Memperbarui...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog Soft Delete ───────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeletionReason('') }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>Soft Delete Pelayan?</AlertDialogTitle>
            <AlertDialogDescription className='text-sm space-y-2'>
              <span>Data Pelayan <strong className='text-foreground'>{deleteTarget?.jemaat?.nama}</strong> akan dinonaktifkan via Soft Delete.</span>
              <span className='block text-xs text-muted-foreground'>Data profil Jemaat TIDAK akan dihapus. Log audit SHA-256 akan dicatat.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='py-2 space-y-1.5'>
            <label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan (Wajib):</label>
            <Textarea
              placeholder='Masukkan alasan penghapusan pelayan ini...'
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className='text-xs'
            />
          </div>
          <AlertDialogFooter>
            <Button variant='outline' onClick={() => { setDeleteTarget(null); setDeletionReason('') }} disabled={isDeleting}>Batal</Button>
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
              <RotateCcw className='size-5' /> Pulihkan Pelayan?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Pelayan <strong className='text-foreground'>{restoreTarget?.jemaat?.nama}</strong> ({restoreTarget?.jemaat?.nij}) akan dipulihkan kembali ke daftar pelayan aktif.
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
              Ya, Pulihkan Pelayan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Hard Delete Confirm ───────────────────── */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5 text-rose-600' /> Hapus Permanen Pelayan?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs'>
                  ⚠️ <strong>PERINGATAN</strong>: Pelayan <strong className='text-foreground'>{hardDeleteTarget?.jemaat?.nama}</strong> ({hardDeleteTarget?.jemaat?.nij}) akan dihapus secara permanen dari database.
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
              onClick={handleOpenPrintRoster}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10 rounded-full whitespace-nowrap'
              title='Cetak Lembar Roster Penugasan Pelayanan Ibadah A4'
            >
              <Printer className='size-3.5' />
              <span>Cetak Roster Pelayan</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setSelectedBulkCategories([])
                setBulkCategoryModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Tugaskan kategori/divisi pelayanan untuk pelayan terpilih'
            >
              <Tag className='size-3.5' />
              <span>Tugaskan Divisi</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => setContactsModalOpen(true)}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 rounded-full whitespace-nowrap'
              title='Broadcast & Salin Nomor WhatsApp Pelayan'
            >
              <MessageSquare className='size-3.5' />
              <span>Kontak WA Pelayan</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleExportCsv}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ekspor data pelayan terpilih ke CSV / Excel'
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
              title='Nonaktifkan / Hapus data pelayan terpilih (soft delete)'
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

      {/* ── MODAL 1: CETAK ROSTER PELAYAN (A4 LANDSCAPE) ─────────── */}
      <Dialog open={printRosterModalOpen} onOpenChange={setPrintRosterModalOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
          <DialogHeader className='p-4 sm:p-5 pb-3 sm:pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0'>
            <div className='min-w-0 flex-1 pe-6 sm:pe-0'>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2 leading-tight'>
                <Printer className='size-5 text-primary shrink-0' />
                <span>Pratinjau Roster Pelayan ({printRosterData.length} Pelayan)</span>
              </DialogTitle>
              <DialogDescription className='text-xs mt-0.5'>
                Lembar direktori penugasan divisi pelayanan ibadah siap cetak A4.
              </DialogDescription>
            </div>
            <Button
              size='sm'
              onClick={handleOpenPrintRoster}
              className='w-full sm:w-auto gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm shrink-0'
            >
              <Printer className='size-4' /> Cetak Lembar Roster (Print / PDF)
            </Button>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-3 sm:p-6 bg-muted/20'>
            {isLoadingPrintRoster ? (
              <div className='py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs'>
                <Loader2 className='size-6 animate-spin text-primary' />
                <span>Menyiapkan susunan data roster pelayan...</span>
              </div>
            ) : printRosterData.length === 0 ? (
              <div className='py-12 text-center text-xs text-muted-foreground'>
                Tidak ada data pelayan yang dapat ditampilkan.
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
                        ROSTER PENUGASAN PELAYANAN IBADAH
                      </div>
                    </div>
                  </div>
                  <Badge variant='outline' className='font-mono font-bold text-xs bg-primary/5 text-primary'>
                    {printRosterData.length} Pelayan Terdaftar
                  </Badge>
                </div>

                {/* Table */}
                <div className='border rounded-xl overflow-hidden'>
                  <table className='w-full text-xs text-left'>
                    <thead className='bg-muted/60 text-muted-foreground font-semibold border-b'>
                      <tr>
                        <th className='p-2 text-center w-8'>No</th>
                        <th className='p-2'>Nama Pelayan</th>
                        <th className='p-2'>NIJ</th>
                        <th className='p-2'>Divisi Pelayanan</th>
                        <th className='p-2'>Kategorial</th>
                        <th className='p-2'>WhatsApp</th>
                        <th className='p-2'>Komsel</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y'>
                      {printRosterData.map((item, idx) => {
                        const j = item.jemaat || {}
                        const roles = (item.kategoriPelayanan || item.pelayanKategori || [])
                          .map((pk: any) => pk.kategoriPelayanan?.nama)
                          .filter(Boolean)
                          .join(', ') || '-'
                        return (
                          <tr key={item.id} className='hover:bg-muted/20'>
                            <td className='p-2 text-center text-muted-foreground'>{idx + 1}</td>
                            <td className='p-2 font-bold text-foreground'>
                              {j.nama}
                              {j.namaPanggilan && <span className='text-muted-foreground font-normal'> ({j.namaPanggilan})</span>}
                            </td>
                            <td className='p-2 font-mono text-primary font-semibold'>{j.nij || '-'}</td>
                            <td className='p-2 font-medium text-foreground'>{roles}</td>
                            <td className='p-2 text-muted-foreground'>{item.kategorial?.nama || '-'}</td>
                            <td className='p-2 font-mono text-emerald-700 dark:text-emerald-400'>{j.noHp || j.whatsApp || '-'}</td>
                            <td className='p-2 text-muted-foreground'>{j.komsel?.nama || '-'}</td>
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
              Format cetak A4 Landscape siap digunakan untuk lembar briefing & jadwal gladi bersih.
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPrintRosterModalOpen(false)}
              className='w-full sm:w-auto'
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: TUGASKAN DIVISI / KATEGORI PELAYANAN MASSAL ─── */}
      <Dialog open={bulkCategoryModalOpen} onOpenChange={setBulkCategoryModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Tag className='size-5 text-primary' />
              Tugaskan Divisi Pelayanan ({selectedCount} Pelayan)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tambahkan satu atau beberapa kategori pelayanan untuk seluruh pelayan terpilih.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <Label className='text-xs font-semibold'>Pilih Divisi / Kategori Pelayanan:</Label>
            <div className='grid grid-cols-1 gap-2 max-h-56 overflow-y-auto p-1 border rounded-xl'>
              {kategoriPelayananOptions.map((cat) => {
                const checked = selectedBulkCategories.includes(cat.id)
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setSelectedBulkCategories((prev) =>
                        checked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                      )
                    }}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                      checked
                        ? 'bg-primary/10 border-primary text-primary font-semibold'
                        : 'hover:bg-muted/40 text-foreground'
                    }`}
                  >
                    <div>
                      <div>{cat.nama}</div>
                      {cat.deskripsi && <div className='text-[10px] text-muted-foreground font-normal'>{cat.deskripsi}</div>}
                    </div>
                    {checked && <Check className='size-4 text-primary shrink-0' />}
                  </div>
                )
              })}
            </div>
            <div className='text-[11px] text-muted-foreground'>
              * Kategori pelayanan yang sudah dimiliki sebelumnya oleh pelayan tidak akan terduplikasi.
            </div>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setBulkCategoryModalOpen(false)} disabled={isBulkAssigningCategory}>
              Batal
            </Button>
            <Button
              onClick={handleBulkCategorySubmit}
              disabled={isBulkAssigningCategory || selectedBulkCategories.length === 0}
              className='gap-1.5'
            >
              {isBulkAssigningCategory ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
              {isBulkAssigningCategory ? 'Menugaskan...' : `Tugaskan (${selectedBulkCategories.length}) Divisi`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: BROADCAST & SALIN KONTAK WA PELAYAN ─────────── */}
      <Dialog open={contactsModalOpen} onOpenChange={setContactsModalOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <MessageSquare className='size-5 text-emerald-600' />
              Kontak WhatsApp Pelayan Ibadah ({selectedCount} Pelayan)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Daftar nomor WhatsApp pelayan untuk koordinasi gladi bersih, pengingat tugas ibadah, atau materi pelayanan.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <div className='flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20'>
              <div>
                <div className='font-bold text-emerald-800 dark:text-emerald-300 text-xs'>
                  {validPhoneContacts.length} Nomor WA Teridentifikasi
                </div>
                <div className='text-[11px] text-muted-foreground'>
                  Dari total {selectedCount} pelayan terpilih
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
              {selectedPelayanData.map((item) => {
                const j = item.jemaat || {}
                const rawPhone = (j.noHp || j.whatsApp || '').replace(/[^0-9]/g, '')
                const waLink = rawPhone ? `https://wa.me/${rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone}` : null
                const roles = (item.kategoriPelayananList || []).map((b: any) => b.kategoriPelayanan?.nama).join(', ') || '-'

                return (
                  <div key={item.id} className='p-2.5 px-3 flex items-center justify-between hover:bg-muted/30 text-xs'>
                    <div>
                      <div className='font-bold text-foreground'>{j.nama}</div>
                      <div className='text-[11px] text-muted-foreground'>
                        Divisi: <span className='text-foreground font-medium'>{roles}</span>
                      </div>
                    </div>
                    <div>
                      {rawPhone ? (
                        <div className='flex items-center gap-2'>
                          <span className='font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400'>
                            {j.noHp || j.whatsApp}
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

      {/* ── MODAL 4: HAPUS MASSAL PELAYAN (SOFT DELETE) ─────────── */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Nonaktifkan {selectedCount} Pelayan Ibadah?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Pelayan terpilih akan dinonaktifkan dari daftar aktif pelayanan ibadah (*soft delete*). Data master jemaat tetap aman dan tidak terhapus.
                </div>
                <div className='space-y-1 pt-1'>
                  <Label className='text-xs font-semibold text-foreground block'>Alasan Penonaktifan Massal (Wajib):</Label>
                  <Textarea
                    placeholder='Contoh: Rotasi pelayanan periode 2026 / cuti pelayanan'
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
              Konfirmasi Nonaktifkan ({selectedCount})
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL 5: DAFTARKAN PELAYAN BARU ─────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
          <form onSubmit={handleCreateSubmit} className='flex flex-col h-full overflow-hidden'>
            <DialogHeader className='p-4 sm:p-5 pb-3 border-b shrink-0'>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
                <UserCheck className='size-5 text-primary' />
                <span>Daftarkan Pelayan Ibadah Baru</span>
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Pilih jemaat dan tentukan divisi / bidang pelayanan yang ditugaskan.
              </DialogDescription>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs'>
              {/* Jemaat Selector */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Pilih Jemaat (Calon Pelayan) *</Label>
                <div className='space-y-2'>
                  <div className='relative'>
                    <Search className='size-3.5 absolute left-2.5 top-2.5 text-muted-foreground' />
                    <Input
                      placeholder='Ketik nama atau NIJ jemaat untuk mencari...'
                      value={jemaatSearch}
                      onChange={(e) => setJemaatSearch(e.target.value)}
                      className='h-8 text-xs pl-8'
                    />
                  </div>

                  <Select value={selectedJemaatId} onValueChange={setSelectedJemaatId}>
                    <SelectTrigger className='h-9 text-xs w-full'>
                      <SelectValue placeholder='Pilih jemaat dari hasil pencarian...' />
                    </SelectTrigger>
                    <SelectContent className='max-h-56'>
                      {jemaatOptions.map((j) => (
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

              {/* Jemaat Preview Card */}
              {selectedJemaat && (
                <div className='p-3 bg-muted/40 border rounded-xl space-y-1 text-xs'>
                  <div className='font-semibold text-foreground flex items-center justify-between'>
                    <span>{selectedJemaat.nama}</span>
                    <Badge variant='outline' className='text-[10px]'>{selectedJemaat.statusJemaat || 'ACTIVE'}</Badge>
                  </div>
                  <div className='text-muted-foreground font-mono text-[11px] flex items-center gap-2 flex-wrap'>
                    <span>NIJ: {selectedJemaat.nij || '-'}</span>
                    <span>•</span>
                    <span>Gender: {selectedJemaat.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}</span>
                    {selectedJemaat.kategorial?.nama && (
                      <>
                        <span>•</span>
                        <span>Kategorial: {selectedJemaat.kategorial.nama}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Penugasan Bidang Pelayanan */}
              <div className='space-y-3 pt-1'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>Penugasan Bidang Pelayanan *</Label>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={addCreatePenugasanRow}
                    className='h-6 px-2 text-[11px] gap-1'
                  >
                    <Plus className='size-3' /> Tambah Divisi Kategorial
                  </Button>
                </div>

                <div className='space-y-3'>
                  {formPenugasan.map((row, rIdx) => (
                    <div key={rIdx} className='p-3 bg-muted/30 border rounded-xl space-y-2.5'>
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex-1'>
                          <Label className='text-[11px] text-muted-foreground mb-1 block'>
                            Departemen Kategorial (Opsional):
                          </Label>
                          <Select
                            value={row.kategorialId || 'NONE'}
                            onValueChange={(val) =>
                              setCreatePenugasanKategorial(rIdx, val === 'NONE' ? '' : val)
                            }
                          >
                            <SelectTrigger className='h-7.5 text-xs w-full'>
                              <SelectValue placeholder='Umum (Seluruh Jemaat)' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='NONE' className='text-xs'>
                                🌐 Umum / Seluruh Jemaat
                              </SelectItem>
                              {kategorialOptions.map((k) => (
                                <SelectItem key={k.id} value={k.id} className='text-xs'>
                                  {k.nama}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {formPenugasan.length > 1 && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => removeCreatePenugasanRow(rIdx)}
                            className='size-7 text-rose-500 hover:bg-rose-500/10 mt-4 shrink-0'
                          >
                            <Trash2 className='size-3.5' />
                          </Button>
                        )}
                      </div>

                      {/* Bidang Pelayanan Chips Multi-Select */}
                      <div className='space-y-1.5'>
                        <Label className='text-[11px] text-muted-foreground block'>
                          Pilih Bidang Pelayanan:
                        </Label>
                        <div className='flex flex-wrap gap-1.5'>
                          {kategoriPelayananOptions.map((kp) => {
                            const isSelected = row.kategoriPelayananIds.includes(kp.id)
                            return (
                              <button
                                key={kp.id}
                                type='button'
                                onClick={() => toggleCreatePenugasanBidang(rIdx, kp.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                    : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {isSelected && <Check className='size-3' />}
                                <span>{kp.nama}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deskripsi Tugas */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Deskripsi / Catatan Tugas (Opsional):</Label>
                <Textarea
                  placeholder='Contoh: Pemain Keyboard Ibadah Raya 1 & 2 / Koordinator Usher...'
                  value={formDeskripsiTugas}
                  onChange={(e) => setFormDeskripsiTugas(e.target.value)}
                  className='text-xs min-h-16'
                />
              </div>
            </div>

            <DialogFooter className='p-3 sm:p-4 border-t bg-muted/20 gap-2 shrink-0'>
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
                disabled={isSubmitting || !selectedJemaatId}
                className='gap-1.5'
              >
                {isSubmitting ? <Loader2 className='size-3.5 animate-spin' /> : <Plus className='size-3.5' />}
                {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Pelayan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 6: EDIT PENUGASAN PELAYAN ─────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
          <form onSubmit={handleEditSubmit} className='flex flex-col h-full overflow-hidden'>
            <DialogHeader className='p-4 sm:p-5 pb-3 border-b shrink-0'>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2'>
                <Edit className='size-5 text-primary' />
                <span>Edit Penugasan - {editTarget?.jemaat?.nama}</span>
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Perbarui divisi dan bidang penugasan pelayanan jemaat ini.
              </DialogDescription>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs'>
              {/* Pelayan Info Banner */}
              <div className='p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between'>
                <div>
                  <div className='font-bold text-foreground'>{editTarget?.jemaat?.nama}</div>
                  <div className='text-[11px] font-mono text-muted-foreground'>
                    NIJ: {editTarget?.jemaat?.nij || '-'} • {editTarget?.jemaat?.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}
                  </div>
                </div>
                <Badge variant='outline' className='text-[10px]'>
                  {editTarget?.jemaat?.kategorial?.nama || 'Umum'}
                </Badge>
              </div>

              {/* Penugasan Bidang Pelayanan */}
              <div className='space-y-3 pt-1'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>Penugasan Bidang Pelayanan *</Label>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={addEditPenugasanRow}
                    className='h-6 px-2 text-[11px] gap-1'
                  >
                    <Plus className='size-3' /> Tambah Divisi Kategorial
                  </Button>
                </div>

                <div className='space-y-3'>
                  {editPenugasan.map((row, rIdx) => (
                    <div key={rIdx} className='p-3 bg-muted/30 border rounded-xl space-y-2.5'>
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex-1'>
                          <Label className='text-[11px] text-muted-foreground mb-1 block'>
                            Departemen Kategorial (Opsional):
                          </Label>
                          <Select
                            value={row.kategorialId || 'NONE'}
                            onValueChange={(val) =>
                              setEditPenugasanKategorial(rIdx, val === 'NONE' ? '' : val)
                            }
                          >
                            <SelectTrigger className='h-7.5 text-xs w-full'>
                              <SelectValue placeholder='Umum (Seluruh Jemaat)' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='NONE' className='text-xs'>
                                🌐 Umum / Seluruh Jemaat
                              </SelectItem>
                              {kategorialOptions.map((k) => (
                                <SelectItem key={k.id} value={k.id} className='text-xs'>
                                  {k.nama}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {editPenugasan.length > 1 && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => removeEditPenugasanRow(rIdx)}
                            className='size-7 text-rose-500 hover:bg-rose-500/10 mt-4 shrink-0'
                          >
                            <Trash2 className='size-3.5' />
                          </Button>
                        )}
                      </div>

                      {/* Bidang Pelayanan Chips Multi-Select */}
                      <div className='space-y-1.5'>
                        <Label className='text-[11px] text-muted-foreground block'>
                          Pilih Bidang Pelayanan:
                        </Label>
                        <div className='flex flex-wrap gap-1.5'>
                          {kategoriPelayananOptions.map((kp) => {
                            const isSelected = row.kategoriPelayananIds.includes(kp.id)
                            return (
                              <button
                                key={kp.id}
                                type='button'
                                onClick={() => toggleEditPenugasanBidang(rIdx, kp.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                    : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {isSelected && <Check className='size-3' />}
                                <span>{kp.nama}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deskripsi Tugas */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Deskripsi / Catatan Tugas (Opsional):</Label>
                <Textarea
                  placeholder='Contoh: Pemain Keyboard Ibadah Raya 1 & 2...'
                  value={editDeskripsiTugas}
                  onChange={(e) => setEditDeskripsiTugas(e.target.value)}
                  className='text-xs min-h-16'
                />
              </div>
            </div>

            <DialogFooter className='p-3 sm:p-4 border-t bg-muted/20 gap-2 shrink-0'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setEditOpen(false)}
                disabled={isUpdating}
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isUpdating}
                className='gap-1.5'
              >
                {isUpdating ? <Loader2 className='size-3.5 animate-spin' /> : <Check className='size-3.5' />}
                {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
