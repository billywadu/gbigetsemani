'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Wallet,
  Plus,
  Lock,
  Unlock,
  Building,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  ShieldAlert,
  Search,
  FileText,
  CreditCard,
  Banknote,
  QrCode as QrIcon,
  Trash2,
  RotateCcw,
  MoreHorizontal,
  FolderOpen,
  Printer,
  ChevronRight,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Edit,
  Trash,
  BookOpen,
  FileSpreadsheet,
  FileDown,
  CheckSquare,
  Square,
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getLaporanKeuanganListAction,
  getLaporanByIdAction,
  createTransaksiKeuanganAction,
  updateTransaksiKeuanganAction,
  finalizePeriodAction,
  reopenPeriodAction,
  createLaporanKeuanganAction,
  updateLaporanKeuanganAction,
  deleteLaporanKeuanganAction,
  restoreLaporanKeuanganAction,
  hardDeleteLaporanKeuanganAction,
  deleteTransaksiKeuanganAction,
  restoreTransaksiKeuanganAction,
  hardDeleteTransaksiKeuanganAction,
  getPriorPeriodBalanceAction,
  getScopesAction,
  getScopeFullBookPrintDataAction,
  getLaporanForPrintSheetsAction,
  bulkFinalizeLaporanAction,
  bulkReopenLaporanAction,
  bulkSoftDeleteLaporanAction,
  ScopeBookPrintDataDTO,
  LaporanKeuanganDTO,
  TransaksiKeuanganDTO,
} from '@/actions/keuangan'
import { getPrintLayoutConfigAction } from '@/actions/print-layout'
import { TablePagination } from '@/components/ui/table-pagination'
import { TipeTransaksi, MetodePembayaran } from '@/lib/validations/keuangan'
import { toast } from 'sonner'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function ScopeKasDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const scopeCodeParam = (params?.scopeId as string) || 'UMUM'

  const qBulan = searchParams?.get('bulan')
  const qTahun = searchParams?.get('tahun')

  const [loading, setLoading] = useState(true)
  const [scopeInfo, setScopeInfo] = useState<{ id: string; code: string; name: string; description: string | null } | null>(null)
  const [scopeLaporanList, setScopeLaporanList] = useState<LaporanKeuanganDTO[]>([])
  
  // View mode: 'PERIODS_LIST' (Level 2) or 'TRANSACTIONS_VIEW' (Level 3)
  const [viewMode, setViewMode] = useState<'PERIODS_LIST' | 'TRANSACTIONS_VIEW'>('PERIODS_LIST')
  const [selectedLaporanId, setSelectedLaporanId] = useState<string>('')
  const [activeLaporan, setActiveLaporan] = useState<LaporanKeuanganDTO | null>(null)
  const [transaksiList, setTransaksiList] = useState<TransaksiKeuanganDTO[]>([])
  const [loadingLaporan, setLoadingLaporan] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [filterTipe, setFilterTipe] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL')

  // Modal: Create New Period (Level 2)
  const [createPeriodOpen, setCreatePeriodOpen] = useState(false)
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false)
  const [newPeriodBulan, setNewPeriodBulan] = useState(new Date().getMonth() + 1)
  const [newPeriodTahun, setNewPeriodTahun] = useState(new Date().getFullYear())
  const [saldoAwalMode, setSaldoAwalMode] = useState<'CARRY_OVER' | 'MANUAL'>('CARRY_OVER')
  const [priorBalanceData, setPriorBalanceData] = useState<{
    hasPrior: boolean
    priorPeriod: { id: string; bulan: number; tahun: number; saldoAkhir: number; status: string } | null
  } | null>(null)
  const [isCheckingPrior, setIsCheckingPrior] = useState(false)
  const [enableAdjustment, setEnableAdjustment] = useState(false)
  const [penyesuaianManual, setPenyesuaianManual] = useState('')
  const [saldoAwalCustom, setSaldoAwalCustom] = useState('')

  // Level 2 Period Actions (Edit, Soft Delete, Restore, Hard Delete, Pagination)
  const [periodTabFilter, setPeriodTabFilter] = useState<'ACTIVE' | 'DELETED'>('ACTIVE')
  const [periodPage, setPeriodPage] = useState(1)
  const [periodPageSize, setPeriodPageSize] = useState(10)
  const [editPeriodTarget, setEditPeriodTarget] = useState<LaporanKeuanganDTO | null>(null)
  const [editPeriodBulan, setEditPeriodBulan] = useState(1)
  const [editPeriodTahun, setEditPeriodTahun] = useState(new Date().getFullYear())
  const [editPeriodSaldoAwal, setEditPeriodSaldoAwal] = useState('')
  const [isUpdatingPeriod, setIsUpdatingPeriod] = useState(false)

  const [deletePeriodTarget, setDeletePeriodTarget] = useState<LaporanKeuanganDTO | null>(null)
  const [deletePeriodReason, setDeletePeriodReason] = useState('')
  const [isDeletingPeriod, setIsDeletingPeriod] = useState(false)

  const [restorePeriodTarget, setRestorePeriodTarget] = useState<LaporanKeuanganDTO | null>(null)
  const [isRestoringPeriod, setIsRestoringPeriod] = useState(false)

  const [hardDeletePeriodTarget, setHardDeletePeriodTarget] = useState<LaporanKeuanganDTO | null>(null)
  const [hardDeletePeriodReason, setHardDeletePeriodReason] = useState('')
  const [isHardDeletingPeriod, setIsHardDeletingPeriod] = useState(false)

  // Multi-Select & Bulk Actions State (Level 2)
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([])
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [bulkReopenModalOpen, setBulkReopenModalOpen] = useState(false)
  const [bulkReopenReason, setBulkReopenReason] = useState('')
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState('')

  // Book Print State (Full & Selected)
  const [bookPrintModalOpen, setBookPrintModalOpen] = useState(false)
  const [selectedBookYear, setSelectedBookYear] = useState<string>('ALL')
  const [isPreparingBookPrint, setIsPreparingBookPrint] = useState(false)
  const [isGeneratingBookPrint, setIsGeneratingBookPrint] = useState(false)
  const [bookPrintData, setBookPrintData] = useState<ScopeBookPrintDataDTO | null>(null)

  // Level 2 Chart & Analytics State
  const [showChart, setShowChart] = useState(true)
  const [chartYearFilter, setChartYearFilter] = useState<string>('ALL')

  // Modal: Create Transaction (Level 3)
  const [trxPage, setTrxPage] = useState(1)
  const [trxPageSize, setTrxPageSize] = useState(15)
  const [trxOpen, setTrxOpen] = useState(false)
  const [tipe, setTipe] = useState<TipeTransaksi>('MASUK')
  const [kategori, setKategori] = useState('Persembahan Kolekte')
  const [nominal, setNominal] = useState('')
  const [metodePembayaran, setMetodePembayaran] = useState<MetodePembayaran>('CASH')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [catatan, setCatatan] = useState('')
  const [isSavingTrx, setIsSavingTrx] = useState(false)

  // Modal: Edit Transaction (Level 3)
  const [editTrxTarget, setEditTrxTarget] = useState<TransaksiKeuanganDTO | null>(null)
  const [editTipe, setEditTipe] = useState<TipeTransaksi>('MASUK')
  const [editKategori, setEditKategori] = useState('')
  const [editNominal, setEditNominal] = useState('')
  const [editMetodePembayaran, setEditMetodePembayaran] = useState<MetodePembayaran>('CASH')
  const [editTanggal, setEditTanggal] = useState(new Date().toISOString().split('T')[0])
  const [editCatatan, setEditCatatan] = useState('')
  const [isUpdatingTrx, setIsUpdatingTrx] = useState(false)

  // Modal: Close & Reopen Period
  const [closeAlertOpen, setCloseAlertOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [isReopening, setIsReopening] = useState(false)

  // Modal: Soft Delete / Restore / Hard Delete Trx
  const [deleteTrxTarget, setDeleteTrxTarget] = useState<TransaksiKeuanganDTO | null>(null)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeletingTrx, setIsDeletingTrx] = useState(false)

  const [restoreTrxTarget, setRestoreTrxTarget] = useState<TransaksiKeuanganDTO | null>(null)
  const [isRestoringTrx, setIsRestoringTrx] = useState(false)

  const [hardDeleteTrxTarget, setHardDeleteTrxTarget] = useState<TransaksiKeuanganDTO | null>(null)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [isHardDeletingTrx, setIsHardDeletingTrx] = useState(false)

  // Load scope info and all periods
  const fetchScopeData = useCallback(async () => {
    setLoading(true)
    const scopesRes = await getScopesAction()
    if (scopesRes.success && scopesRes.data) {
      const found = scopesRes.data.find(
        (s) => s.code.toUpperCase() === scopeCodeParam.toUpperCase() || s.id === scopeCodeParam
      )
      if (found) {
        setScopeInfo(found)
      }
    }

    const res = await getLaporanKeuanganListAction({
      scopeId: scopeCodeParam,
      statusHapus: 'ALL',
      pageSize: 100,
    })

    if (res.success && res.data) {
      setScopeLaporanList(res.data.items)
    } else {
      setScopeLaporanList([])
    }
    setLoading(false)
  }, [scopeCodeParam])

  // Fetch active report details and transactions (Level 3)
  const fetchLaporanDetail = useCallback(async (id: string) => {
    if (!id) return
    setLoadingLaporan(true)
    const res = await getLaporanByIdAction(id)
    if (res.success && res.data) {
      setActiveLaporan(res.data.laporan)
      setTransaksiList(res.data.transaksi)
    } else {
      toast.error(res.error || 'Gagal memuat detail transaksi kas.')
    }
    setLoadingLaporan(false)
  }, [])

  useEffect(() => {
    fetchScopeData()
  }, [fetchScopeData])

  useEffect(() => {
    if (selectedLaporanId) {
      fetchLaporanDetail(selectedLaporanId)
    }
  }, [selectedLaporanId, fetchLaporanDetail])

  // Sync viewMode and activeLaporan with URL search params (?bulan=X&tahun=Y)
  useEffect(() => {
    if (qBulan && qTahun && scopeLaporanList.length > 0) {
      const found = scopeLaporanList.find(
        (l) => l.bulan === Number(qBulan) && l.tahun === Number(qTahun)
      )
      if (found) {
        setSelectedLaporanId(found.id)
        setActiveLaporan(found)
        setViewMode('TRANSACTIONS_VIEW')
      }
    } else if (!qBulan || !qTahun) {
      setViewMode('PERIODS_LIST')
      setActiveLaporan(null)
      setSelectedLaporanId('')
    }
  }, [qBulan, qTahun, scopeLaporanList])

  const handleOpenTransactionView = (lap: LaporanKeuanganDTO) => {
    router.push(`/dashboard/keuangan/scope/${scopeCodeParam}?bulan=${lap.bulan}&tahun=${lap.tahun}`)
  }

  // Auto-detect prior period balance when createPeriodOpen or selected month/year changes
  useEffect(() => {
    if (!createPeriodOpen) return
    async function checkPrior() {
      setIsCheckingPrior(true)
      const res = await getPriorPeriodBalanceAction({
        scopeIdOrCode: scopeInfo?.id || scopeCodeParam,
        bulan: Number(newPeriodBulan),
        tahun: Number(newPeriodTahun),
      })
      setIsCheckingPrior(false)
      if (res.success && res.data) {
        setPriorBalanceData(res.data)
      } else {
        setPriorBalanceData({ hasPrior: false, priorPeriod: null })
      }
    }
    checkPrior()
  }, [createPeriodOpen, newPeriodBulan, newPeriodTahun, scopeInfo?.id, scopeCodeParam])

  const handleCreatePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scopeInfo) return

    const parsedCustom = saldoAwalCustom ? Number(saldoAwalCustom.replace(/[^0-9]/g, '')) : 0
    const parsedAdj = (enableAdjustment && penyesuaianManual) ? Number(penyesuaianManual.replace(/[^0-9-]/g, '')) : 0

    setIsCreatingPeriod(true)
    const res = await createLaporanKeuanganAction({
      scopeId: scopeInfo.code,
      bulan: Number(newPeriodBulan),
      tahun: Number(newPeriodTahun),
      saldoAwalMode,
      saldoAwalCustom: saldoAwalMode === 'MANUAL' ? parsedCustom : undefined,
      penyesuaianManual: saldoAwalMode === 'CARRY_OVER' ? parsedAdj : undefined,
    })
    setIsCreatingPeriod(false)

    if (res.success && res.data) {
      toast.success(res.message || 'Periode pembukuan baru berhasil dibuka.')
      setCreatePeriodOpen(false)
      setSaldoAwalMode('CARRY_OVER')
      setEnableAdjustment(false)
      setPenyesuaianManual('')
      setSaldoAwalCustom('')
      fetchScopeData()
      handleOpenTransactionView(res.data)
    } else {
      toast.error(res.error || 'Gagal membuka periode pembukuan baru.')
    }
  }

  // Level 2 Period Action Handlers
  const handleOpenEditPeriod = (lap: LaporanKeuanganDTO) => {
    setEditPeriodTarget(lap)
    setEditPeriodBulan(lap.bulan)
    setEditPeriodTahun(lap.tahun)
    setEditPeriodSaldoAwal(Number(lap.saldoAwal).toLocaleString('id-ID'))
  }

  const handleUpdatePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPeriodTarget) return
    const parsedSaldo = Number(editPeriodSaldoAwal.replace(/[^0-9]/g, ''))
    setIsUpdatingPeriod(true)
    const res = await updateLaporanKeuanganAction({
      id: editPeriodTarget.id,
      bulan: Number(editPeriodBulan),
      tahun: Number(editPeriodTahun),
      saldoAwal: parsedSaldo,
    })
    setIsUpdatingPeriod(false)

    if (res.success) {
      toast.success(res.message || 'Periode pembukuan berhasil diperbarui.')
      setEditPeriodTarget(null)
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal memperbarui periode pembukuan.')
    }
  }

  const handleDeletePeriodConfirm = async () => {
    if (!deletePeriodTarget || !deletePeriodReason.trim()) {
      toast.error('Alasan penghapusan periode wajib diisi!')
      return
    }
    setIsDeletingPeriod(true)
    const res = await deleteLaporanKeuanganAction({
      id: deletePeriodTarget.id,
      reason: deletePeriodReason.trim(),
    })
    setIsDeletingPeriod(false)

    if (res.success) {
      toast.success(res.message || 'Periode berhasil dipindahkan ke kotak sampah.')
      setDeletePeriodTarget(null)
      setDeletePeriodReason('')
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal menghapus periode.')
    }
  }

  const handleRestorePeriodConfirm = async () => {
    if (!restorePeriodTarget) return
    setIsRestoringPeriod(true)
    const res = await restoreLaporanKeuanganAction({ id: restorePeriodTarget.id })
    setIsRestoringPeriod(false)

    if (res.success) {
      toast.success(res.message || 'Periode berhasil dipulihkan.')
      setRestorePeriodTarget(null)
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal memulihkan periode.')
    }
  }

  const handleHardDeletePeriodConfirm = async () => {
    if (!hardDeletePeriodTarget) return
    setIsHardDeletingPeriod(true)
    const res = await hardDeleteLaporanKeuanganAction({
      id: hardDeletePeriodTarget.id,
      reason: hardDeletePeriodReason.trim() || undefined,
    })
    setIsHardDeletingPeriod(false)

    if (res.success) {
      toast.success(res.message || 'Periode beserta seluruh transaksinya telah dihapus secara permanen.')
      setHardDeletePeriodTarget(null)
      setHardDeletePeriodReason('')
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen periode.')
    }
  }

  // Multi-Select Toggle Handlers
  const handleToggleSelectAll = (visibleItems: LaporanKeuanganDTO[]) => {
    const visibleIds = visibleItems.map((i) => i.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedPeriodIds.includes(id))
    if (allSelected) {
      setSelectedPeriodIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelectedPeriodIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedPeriodIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Bulk Actions
  const handleBulkFinalize = async () => {
    if (selectedPeriodIds.length === 0) return
    setIsBulkProcessing(true)
    const res = await bulkFinalizeLaporanAction({ ids: selectedPeriodIds })
    setIsBulkProcessing(false)
    if (res.success) {
      toast.success(res.message || 'Periode terpilih berhasil ditutup!')
      setSelectedPeriodIds([])
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal menutup periode terpilih.')
    }
  }

  const handleBulkReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPeriodIds.length === 0 || !bulkReopenReason.trim()) {
      toast.error('Alasan pembukaan kembali wajib diisi!')
      return
    }
    setIsBulkProcessing(true)
    const res = await bulkReopenLaporanAction({ ids: selectedPeriodIds, reason: bulkReopenReason.trim() })
    setIsBulkProcessing(false)
    if (res.success) {
      toast.success(res.message || 'Periode terpilih berhasil dibuka kembali!')
      setBulkReopenModalOpen(false)
      setBulkReopenReason('')
      setSelectedPeriodIds([])
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal membuka kembali periode terpilih.')
    }
  }

  const handleBulkSoftDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPeriodIds.length === 0 || !bulkDeleteReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }
    setIsBulkProcessing(true)
    const res = await bulkSoftDeleteLaporanAction({ ids: selectedPeriodIds, reason: bulkDeleteReason.trim() })
    setIsBulkProcessing(false)
    if (res.success) {
      toast.success(res.message || 'Periode terpilih berhasil dipindahkan ke kotak sampah!')
      setBulkDeleteModalOpen(false)
      setBulkDeleteReason('')
      setSelectedPeriodIds([])
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal menghapus periode terpilih.')
    }
  }

  const handleExportCSV = () => {
    const periodsToExport = selectedPeriodIds.length > 0
      ? scopeLaporanList.filter((l) => selectedPeriodIds.includes(l.id))
      : scopeLaporanList.filter((l) => !l.deletedAt)

    if (periodsToExport.length === 0) {
      toast.error('Tidak ada periode yang dapat diekspor.')
      return
    }

    const headers = ['Pos Kas', 'Bulan', 'Tahun', 'Saldo Awal', 'Total Pemasukan', 'Total Pengeluaran', 'Saldo Akhir', 'Status', 'Jumlah Transaksi', 'Dibuat Pada']
    const rows = periodsToExport.map((p) => [
      `"${p.scopeName}"`,
      `"${MONTH_NAMES[p.bulan - 1]}"`,
      p.tahun,
      p.saldoAwal,
      p.totalPemasukan,
      p.totalPengeluaran,
      p.saldoAkhir,
      `"${p.status}"`,
      p.transaksiCount ?? 0,
      `"${new Date(p.createdAt).toLocaleDateString('id-ID')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `rekap-buku-kas-${scopeCodeParam.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${periodsToExport.length} periode ke CSV.`)
  }

  // Full Book Print Handlers
  const handleOpenBookPrintModal = async () => {
    setIsPreparingBookPrint(true)
    const res = await getScopeFullBookPrintDataAction({
      scopeIdOrCode: scopeInfo?.id || scopeCodeParam,
    })
    setIsPreparingBookPrint(false)
    if (res.success && res.data) {
      setBookPrintData(res.data)
      setBookPrintModalOpen(true)
    } else {
      toast.error(res.error || 'Gagal menyiapkan data buku LPJ kas.')
    }
  }

  const handleExecuteBookPrint = async (targetYear: string = 'ALL', customPeriodIds?: string[]) => {
    if (!bookPrintData && !customPeriodIds) {
      toast.error('Data buku belum siap.')
      return
    }

    setIsGeneratingBookPrint(true)
    let data = bookPrintData
    if (!data || customPeriodIds) {
      const res = await getScopeFullBookPrintDataAction({
        scopeIdOrCode: scopeInfo?.id || scopeCodeParam,
      })
      if (res.success && res.data) {
        data = res.data
      } else {
        toast.error('Gagal mengambil data buku.')
        setIsGeneratingBookPrint(false)
        return
      }
    }

    const layoutRes = await getPrintLayoutConfigAction()
    const layout = layoutRes.data

    let filteredPeriods = data.periods
    if (customPeriodIds && customPeriodIds.length > 0) {
      filteredPeriods = data.periods.filter((p) => customPeriodIds.includes(p.id))
    } else if (targetYear !== 'ALL') {
      filteredPeriods = data.periods.filter((p) => p.tahun === Number(targetYear))
    }

    if (filteredPeriods.length === 0) {
      toast.error('Tidak ada periode pembukuan untuk kriteria cetak ini.')
      setIsGeneratingBookPrint(false)
      return
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=900')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      setIsGeneratingBookPrint(false)
      return
    }

    setBookPrintModalOpen(false)
    setIsGeneratingBookPrint(false)

    const logoHtml = layout.kop.tampilkanLogo && layout.kop.logoUrl
      ? `<img src="${layout.kop.logoUrl}" alt="Logo" style="height: 48px; width: 48px; object-fit: contain; border-radius: 6px;" />`
      : `<div style="width: 44px; height: 44px; background: ${layout.kop.garisKopColor}; color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px;">G</div>`

    const borderBottomStyle = layout.kop.garisKopStyle === 'DOUBLE'
      ? `3px double ${layout.kop.garisKopColor}`
      : `2px solid ${layout.kop.garisKopColor}`

    const bendaharaTtd = layout.signatories.bendahara.ttdUrl && layout.options.modeTandaTangan !== 'MANUAL_LINE'
      ? `<img src="${layout.signatories.bendahara.ttdUrl}" alt="TTD" style="max-height: 48px; max-width: 120px; object-fit: contain;" />`
      : `<div style="height: 48px;"></div>`

    const ketuaMajelisTtd = layout.signatories.ketuaMajelis.ttdUrl && layout.options.modeTandaTangan !== 'MANUAL_LINE'
      ? `<img src="${layout.signatories.ketuaMajelis.ttdUrl}" alt="TTD" style="max-height: 48px; max-width: 120px; object-fit: contain;" />`
      : `<div style="height: 48px;"></div>`

    const gembalaTtd = layout.signatories.gembala.ttdUrl && layout.options.modeTandaTangan !== 'MANUAL_LINE'
      ? `<img src="${layout.signatories.gembala.ttdUrl}" alt="TTD" style="max-height: 48px; max-width: 120px; object-fit: contain;" />`
      : `<div style="height: 48px;"></div>`

    const stampHtml = layout.stempel.tampilkanStempel && layout.stempel.stempelUrl
      ? `<img src="${layout.stempel.stempelUrl}" alt="Stempel" style="position: absolute; right: 5px; top: 0; height: 50px; opacity: 0.8; pointer-events: none;" />`
      : ''

    const tahunLabel = targetYear === 'ALL'
      ? (data.summary.tahunList.length > 1 ? `${data.summary.tahunList[data.summary.tahunList.length - 1]} - ${data.summary.tahunList[0]}` : `Tahun ${data.summary.tahunList[0] || new Date().getFullYear()}`)
      : `Tahun ${targetYear}`

    const summaryRowsHtml = filteredPeriods.map((p, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: 700; color: #0f172a;">${MONTH_NAMES[p.bulan - 1]} ${p.tahun}</td>
        <td style="text-align: right; font-family: monospace;">Rp ${p.saldoAwal.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-family: monospace; color: #16a34a; font-weight: 700;">+ Rp ${p.totalPemasukan.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-family: monospace; color: #dc2626; font-weight: 700;">- Rp ${p.totalPengeluaran.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #0f172a;">Rp ${p.saldoAkhir.toLocaleString('id-ID')}</td>
        <td style="text-align: center; font-size: 8.5px; font-weight: 700;">
          <span style="border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; background: ${p.status === 'CLOSED' ? '#f0fdf4' : '#f8fafc'}; color: ${p.status === 'CLOSED' ? '#166534' : '#475569'};">
            ${p.status}
          </span>
        </td>
      </tr>
    `).join('')

    const monthlySheetsHtml = filteredPeriods.map((p, pIdx) => {
      const pemasukanRows = p.transaksiPemasukan.length === 0
        ? `<tr><td colspan="7" style="text-align: center; color: #94a3b8; font-style: italic; padding: 8px;">Tidak ada transaksi pemasukan pada periode ini.</td></tr>`
        : p.transaksiPemasukan.map((t, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-family: monospace; font-size: 8.5px;">${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
            <td style="font-family: monospace; font-size: 8px; color: #475569;">${t.nomorReferensi}</td>
            <td style="font-weight: 700;">${t.kategori}</td>
            <td>${t.catatan || '-'}</td>
            <td style="text-align: center; font-size: 8px;">${t.metodePembayaran}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700; color: #16a34a;">+ Rp ${t.nominal.toLocaleString('id-ID')}</td>
          </tr>
        `).join('')

      const pengeluaranRows = p.transaksiPengeluaran.length === 0
        ? `<tr><td colspan="7" style="text-align: center; color: #94a3b8; font-style: italic; padding: 8px;">Tidak ada transaksi pengeluaran pada periode ini.</td></tr>`
        : p.transaksiPengeluaran.map((t, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-family: monospace; font-size: 8.5px;">${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
            <td style="font-family: monospace; font-size: 8px; color: #475569;">${t.nomorReferensi}</td>
            <td style="font-weight: 700;">${t.kategori}</td>
            <td>${t.catatan || '-'}</td>
            <td style="text-align: center; font-size: 8px;">${t.metodePembayaran}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700; color: #dc2626;">- Rp ${t.nominal.toLocaleString('id-ID')}</td>
          </tr>
        `).join('')

      return `
        <div class="page-break">
          <div class="kop-mini">
            <div>
              <strong style="color: ${layout.kop.garisKopColor}; font-size: 11px; text-transform: uppercase;">${layout.kop.namaGereja}</strong>
              <div style="font-size: 8.5px; color: #64748b;">${data.scope.name} • Buku LPJ Kas</div>
            </div>
            <div style="text-align: right; font-family: monospace; font-size: 8.5px; color: #64748b;">
              BAGIAN ${pIdx + 1} DARI ${filteredPeriods.length} BULAN
            </div>
          </div>

          <div class="doc-header" style="margin: 10px 0;">
            <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin: 0;">
              RINCIAN TRANSAKSI MUTASI KAS: ${MONTH_NAMES[p.bulan - 1].toUpperCase()} ${p.tahun}
            </h2>
            <p style="font-size: 8.5px; color: #64748b; font-family: monospace; margin: 2px 0 0 0;">
              STATUS PEMBUKUAN: ${p.status === 'CLOSED' ? 'DITUTUP RESMI (CLOSED)' : 'MASIH BERJALAN (DRAFT)'}
            </p>
          </div>

          <div class="section-title">I. DAFTAR PENERIMAAN KAS (PEMASUKAN)</div>
          <table class="trx-table">
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">No</th>
                <th style="width: 65px;">Tanggal</th>
                <th style="width: 90px;">No. Referensi</th>
                <th style="width: 120px;">Kategori</th>
                <th>Uraian / Keterangan</th>
                <th style="width: 55px; text-align: center;">Metode</th>
                <th style="width: 95px; text-align: right;">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${pemasukanRows}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 900;">
                <td colspan="6" style="text-align: right;">SUBTOTAL PENERIMAAN KAS (+):</td>
                <td style="text-align: right; font-family: monospace; color: #16a34a;">+ Rp ${p.totalPemasukan.toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          </table>

          <div class="section-title" style="margin-top: 14px;">II. DAFTAR PENGELUARAN KAS (BELANJA & BIAYA)</div>
          <table class="trx-table">
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">No</th>
                <th style="width: 65px;">Tanggal</th>
                <th style="width: 90px;">No. Referensi</th>
                <th style="width: 120px;">Kategori</th>
                <th>Uraian / Keterangan</th>
                <th style="width: 55px; text-align: center;">Metode</th>
                <th style="width: 95px; text-align: right;">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${pengeluaranRows}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 900;">
                <td colspan="6" style="text-align: right;">SUBTOTAL PENGELUARAN KAS (-):</td>
                <td style="text-align: right; font-family: monospace; color: #dc2626;">- Rp ${p.totalPengeluaran.toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          </table>

          <div class="section-title" style="margin-top: 14px;">III. REKAPITULASI & POSISI SALDO KAS AKHIR BULAN</div>
          <table class="rekap-table">
            <tr>
              <td style="width: 70%; font-weight: 600;">A. Saldo Awal Pembukuan (${MONTH_NAMES[p.bulan - 1]} ${p.tahun})</td>
              <td style="text-align: right; font-family: monospace; font-weight: bold;">Rp ${p.saldoAwal.toLocaleString('id-ID')}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #16a34a;">B. Total Penerimaan Kas Periode Ini (+)</td>
              <td style="text-align: right; font-family: monospace; font-weight: bold; color: #16a34a;">+ Rp ${p.totalPemasukan.toLocaleString('id-ID')}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #dc2626;">C. Total Pengeluaran Kas Periode Ini (-)</td>
              <td style="text-align: right; font-family: monospace; font-weight: bold; color: #dc2626;">- Rp ${p.totalPengeluaran.toLocaleString('id-ID')}</td>
            </tr>
            <tr style="background: #f1f5f9;">
              <td style="font-weight: 800; text-transform: uppercase;">D. POSISI SALDO AKHIR KAS (A + B - C)</td>
              <td style="text-align: right; font-family: monospace; font-weight: 900; font-size: 10px; color: #0f172a;">Rp ${p.saldoAkhir.toLocaleString('id-ID')}</td>
            </tr>
          </table>
        </div>
      `
    }).join('')

    const fullBookHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Buku Bundel LPJ Kas - ${data.scope.name} (${tahunLabel})</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          * { box-sizing: border-box; margin: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            font-size: 9px;
            line-height: 1.4;
          }
          .page-break { page-break-after: always; break-after: page; }
          .kop {
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: ${borderBottomStyle}; padding-bottom: 8px; margin-bottom: 12px;
          }
          .kop-mini {
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;
          }
          .brand { display: flex; align-items: center; gap: 12px; }
          .title { font-size: 13px; font-weight: 900; color: ${layout.kop.garisKopColor}; text-transform: uppercase; }
          .subtitle { font-size: 8.5px; color: #475569; }
          .badge { background: ${layout.kop.garisKopColor}; color: #ffffff; font-size: 8px; font-weight: 800; padding: 2px 7px; border-radius: 4px; display: inline-block; }

          .cover-container {
            text-align: center; padding: 20px 10px;
            border: 2px solid ${layout.kop.garisKopColor}; border-radius: 12px; margin-top: 10px; background: #fafafa;
          }
          .cover-title {
            font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; margin-top: 16px;
          }
          .cover-scope {
            font-size: 20px; font-weight: 900; color: ${layout.kop.garisKopColor}; text-transform: uppercase; margin: 8px 0;
          }
          .cover-period {
            font-size: 11px; font-family: monospace; font-weight: bold; color: #475569; background: #e2e8f0;
            display: inline-block; padding: 4px 12px; border-radius: 6px; margin-bottom: 20px;
          }
          .cover-stats-grid {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 20px 0; text-align: center;
          }
          .cover-stat-card {
            background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px;
          }
          .cover-stat-lbl { font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase; }
          .cover-stat-val { font-size: 12px; font-weight: 900; color: #0f172a; font-family: monospace; margin-top: 2px; }

          .trx-table, .summary-table, .rekap-table { width: 100%; border-collapse: collapse; font-size: 8.5px; margin-top: 4px; }
          .trx-table th, .summary-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 6px; font-weight: 800; text-align: left; }
          .trx-table td, .summary-table td, .rekap-table td { border: 1px solid #e2e8f0; padding: 3.5px 6px; }
          .section-title { font-size: 9.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 3px solid ${layout.kop.garisKopColor}; padding-left: 6px; margin-bottom: 4px; }

          .sheet-footer { display: flex; align-items: flex-end; justify-content: space-between; padding-top: 14px; margin-top: 16px; border-top: 1px solid #e2e8f0; }
          .sign-box { text-align: center; font-size: 8.5px; color: #475569; width: 200px; position: relative; }
          .sign-name { border-top: 1px solid #0f172a; padding-top: 3px; font-weight: 800; color: #0f172a; }
          .footer-note { font-size: 7.5px; color: #94a3b8; margin-top: 12px; text-align: center; font-family: monospace; }
        </style>
      </head>
      <body>

        <!-- HALAMAN 1: COVER / SAMPUL DEPAN BUKU LPJ KAS -->
        <div class="page-break">
          <div class="kop">
            <div class="brand">
              ${logoHtml}
              <div>
                <div class="title">${layout.kop.namaGereja}</div>
                <div class="subtitle">${layout.kop.subJudul} • ${layout.kop.kontak}</div>
                <div class="subtitle" style="font-style: italic; font-size: 8px;">${layout.kop.nomorIzin}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="badge">BUKU BUNDEL RESMI</div>
              <div style="font-size: 8px; font-family: monospace; color: #64748b; margin-top: 3px;">Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</div>
            </div>
          </div>

          <div class="cover-container">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">
              BADAN PENGURUS JEMAAT & TIM KEUANGAN GEREJA
            </div>

            <div class="cover-title">
              BUKU LAPORAN PERTANGGUNGJAWABAN (LPJ) KAS & KEUANGAN
            </div>

            <div class="cover-scope">
              ${data.scope.name}
            </div>

            <div class="cover-period">
              PERIODE BUKU: ${tahunLabel.toUpperCase()} • ${filteredPeriods.length} BULAN PEMBUKUAN
            </div>

            ${data.scope.description ? `
              <p style="font-size: 9.5px; color: #475569; max-width: 500px; margin: 0 auto 16px auto; font-style: italic;">
                "${data.scope.description}"
              </p>
            ` : ''}

            <!-- 4 KPI Cover Metrics -->
            <div class="cover-stats-grid">
              <div class="cover-stat-card">
                <div class="cover-stat-lbl">Saldo Awal Awal</div>
                <div class="cover-stat-val">Rp ${filteredPeriods[0]?.saldoAwal.toLocaleString('id-ID') || '0'}</div>
              </div>
              <div class="cover-stat-card">
                <div class="cover-stat-lbl">Total Kas Masuk</div>
                <div class="cover-stat-val" style="color: #16a34a;">+ Rp ${filteredPeriods.reduce((s, p) => s + p.totalPemasukan, 0).toLocaleString('id-ID')}</div>
              </div>
              <div class="cover-stat-card">
                <div class="cover-stat-lbl">Total Kas Keluar</div>
                <div class="cover-stat-val" style="color: #dc2626;">- Rp ${filteredPeriods.reduce((s, p) => s + p.totalPengeluaran, 0).toLocaleString('id-ID')}</div>
              </div>
              <div class="cover-stat-card">
                <div class="cover-stat-lbl">Posisi Saldo Akhir</div>
                <div class="cover-stat-val" style="color: ${layout.kop.garisKopColor};">Rp ${filteredPeriods[filteredPeriods.length - 1]?.saldoAkhir.toLocaleString('id-ID') || '0'}</div>
              </div>
            </div>

            <div style="margin-top: 30px; font-size: 9px; color: #64748b; line-height: 1.6;">
              Dokumen ini merupakan bundel laporan keuangan resmi terverifikasi.<br />
              Diterbitkan secara elektronik oleh Sistem Informasi Keuangan Gereja (CMS).
            </div>
          </div>
        </div>

        <!-- HALAMAN 2: RINGKASAN EKSEKUTIF / MATRIKS BULANAN -->
        <div class="page-break">
          <div class="kop-mini">
            <div>
              <strong style="color: ${layout.kop.garisKopColor}; font-size: 11px; text-transform: uppercase;">${layout.kop.namaGereja}</strong>
              <div style="font-size: 8.5px; color: #64748b;">${data.scope.name} • Ringkasan Eksekutif Buku LPJ Kas</div>
            </div>
            <div style="text-align: right; font-family: monospace; font-size: 8.5px; color: #64748b;">
              LEMBAR RINGKASAN RESMI
            </div>
          </div>

          <div class="doc-header" style="margin: 10px 0;">
            <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin: 0;">
              MATRIKS REKAPITULASI PENERIMAAN & PENGELUARAN KAS
            </h2>
            <p style="font-size: 8.5px; color: #64748b; font-family: monospace; margin: 2px 0 0 0;">
              POS KAS: ${data.scope.name.toUpperCase()} • PERIODE: ${tahunLabel.toUpperCase()}
            </p>
          </div>

          <table class="summary-table">
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">No</th>
                <th>Bulan Pembukuan</th>
                <th style="text-align: right;">Saldo Awal (Rp)</th>
                <th style="text-align: right;">Penerimaan (+)</th>
                <th style="text-align: right;">Pengeluaran (-)</th>
                <th style="text-align: right;">Saldo Akhir (Rp)</th>
                <th style="text-align: center; width: 60px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: 900;">
                <td colspan="3" style="text-align: right;">TOTAL KUMULATIF PERIODE INI:</td>
                <td style="text-align: right; font-family: monospace; color: #16a34a;">+ Rp ${filteredPeriods.reduce((s, p) => s + p.totalPemasukan, 0).toLocaleString('id-ID')}</td>
                <td style="text-align: right; font-family: monospace; color: #dc2626;">- Rp ${filteredPeriods.reduce((s, p) => s + p.totalPengeluaran, 0).toLocaleString('id-ID')}</td>
                <td style="text-align: right; font-family: monospace; color: #0f172a;">Rp ${filteredPeriods[filteredPeriods.length - 1]?.saldoAkhir.toLocaleString('id-ID') || '0'}</td>
                <td style="text-align: center;">-</td>
              </tr>
            </tfoot>
          </table>

          <div class="sheet-footer" style="margin-top: 30px;">
            <div class="sign-box">
              <p style="margin-bottom: 2px; font-weight: 600;">${layout.signatories.bendahara.jabatan}</p>
              ${bendaharaTtd}
              <div class="sign-name">${layout.signatories.bendahara.nama}${layout.signatories.bendahara.gelar ? ', ' + layout.signatories.bendahara.gelar : ''}</div>
              ${layout.signatories.bendahara.nomorInduk ? `<div style="font-size: 7.5px; font-family: monospace;">NIP: ${layout.signatories.bendahara.nomorInduk}</div>` : ''}
            </div>

            <div class="sign-box">
              <p style="margin-bottom: 2px; font-weight: 600;">${layout.signatories.ketuaMajelis.jabatan}</p>
              ${ketuaMajelisTtd}
              <div class="sign-name">${layout.signatories.ketuaMajelis.nama}${layout.signatories.ketuaMajelis.gelar ? ', ' + layout.signatories.ketuaMajelis.gelar : ''}</div>
              ${layout.signatories.ketuaMajelis.nomorInduk ? `<div style="font-size: 7.5px; font-family: monospace;">NIP: ${layout.signatories.ketuaMajelis.nomorInduk}</div>` : ''}
            </div>

            <div class="sign-box">
              <p style="margin-bottom: 2px; font-weight: 600;">${layout.signatories.gembala.jabatan}</p>
              <div style="position: relative;">
                ${gembalaTtd}
                ${stampHtml}
              </div>
              <div class="sign-name">${layout.signatories.gembala.nama}${layout.signatories.gembala.gelar ? ', ' + layout.signatories.gembala.gelar : ''}</div>
              ${layout.signatories.gembala.nomorInduk ? `<div style="font-size: 7.5px; font-family: monospace;">NIP: ${layout.signatories.gembala.nomorInduk}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- HALAMAN 3+: RINCIAN TRANSAKSI BULANAN -->
        ${monthlySheetsHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(fullBookHtml)
    printWindow.document.close()
  }

  const resetTrxForm = () => {
    setTipe('MASUK')
    setKategori(tipe === 'MASUK' ? 'Persembahan Kolekte' : 'Belanja Operasional')
    setNominal('')
    setMetodePembayaran('CASH')
    setTanggal(new Date().toISOString().split('T')[0])
    setCatatan('')
  }

  const handleCreateTrxSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeLaporan) return

    const parsedNominal = Number(nominal.replace(/[^0-9]/g, ''))
    if (!parsedNominal || parsedNominal <= 0) {
      toast.error('Nominal transaksi harus lebih besar dari 0!')
      return
    }
    if (!kategori.trim()) {
      toast.error('Kategori transaksi wajib diisi!')
      return
    }

    setIsSavingTrx(true)
    const res = await createTransaksiKeuanganAction({
      laporanId: activeLaporan.id,
      tipe,
      kategori: kategori.trim(),
      nominal: parsedNominal,
      metodePembayaran,
      tanggal: new Date(tanggal),
      catatan: catatan.trim() || null,
    })
    setIsSavingTrx(false)

    if (res.success && res.data) {
      toast.success(res.message || 'Transaksi berhasil dicatat!')
      setTrxOpen(false)
      resetTrxForm()
      fetchLaporanDetail(activeLaporan.id)
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal mencatat transaksi.')
    }
  }

  const handleOpenEditTrx = (t: TransaksiKeuanganDTO) => {
    setEditTrxTarget(t)
    setEditTipe(t.tipe)
    setEditKategori(t.kategori)
    setEditNominal(t.nominal.toLocaleString('id-ID'))
    setEditMetodePembayaran(t.metodePembayaran)
    setEditTanggal(t.tanggal.split('T')[0])
    setEditCatatan(t.catatan || '')
  }

  const handleUpdateTrxSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTrxTarget || !activeLaporan) return

    const parsedNominal = Number(editNominal.replace(/[^0-9]/g, ''))
    if (!parsedNominal || parsedNominal <= 0) {
      toast.error('Nominal transaksi harus lebih besar dari 0!')
      return
    }
    if (!editKategori.trim()) {
      toast.error('Kategori transaksi wajib diisi!')
      return
    }

    setIsUpdatingTrx(true)
    const res = await updateTransaksiKeuanganAction({
      id: editTrxTarget.id,
      tipe: editTipe,
      kategori: editKategori.trim(),
      nominal: parsedNominal,
      metodePembayaran: editMetodePembayaran,
      tanggal: new Date(editTanggal),
      catatan: editCatatan.trim() || null,
    })
    setIsUpdatingTrx(false)

    if (res.success && res.data) {
      toast.success(res.message || 'Transaksi berhasil diperbarui!')
      setEditTrxTarget(null)
      fetchLaporanDetail(activeLaporan.id)
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal memperbarui transaksi.')
    }
  }

  const handleFinalizePeriod = async () => {
    if (!activeLaporan) return
    setIsClosing(true)
    const res = await finalizePeriodAction({ laporanId: activeLaporan.id })
    setIsClosing(false)

    if (res.success) {
      toast.success(res.message || 'Periode berhasil ditutup!')
      setCloseAlertOpen(false)
      fetchLaporanDetail(activeLaporan.id)
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal menutup periode.')
    }
  }

  const handleReopenPeriod = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeLaporan) return
    if (reopenReason.trim().length < 10) {
      toast.error('Alasan pembukaan kembali minimal 10 karakter!')
      return
    }

    setIsReopening(true)
    const res = await reopenPeriodAction({
      laporanId: activeLaporan.id,
      reason: reopenReason.trim(),
    })
    setIsReopening(false)

    if (res.success) {
      toast.success(res.message || 'Periode berhasil dibuka kembali!')
      setReopenDialogOpen(false)
      setReopenReason('')
      fetchLaporanDetail(activeLaporan.id)
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal membuka kembali periode.')
    }
  }

  const handleDeleteTrxConfirm = async () => {
    if (!deleteTrxTarget || !deletionReason.trim()) {
      toast.error('Alasan penghapusan transaksi wajib diisi!')
      return
    }
    setIsDeletingTrx(true)
    const res = await deleteTransaksiKeuanganAction({ id: deleteTrxTarget.id, reason: deletionReason.trim() })
    setIsDeletingTrx(false)
    if (res.success) {
      toast.success(res.message || 'Transaksi berhasil di-soft delete.')
      setDeleteTrxTarget(null)
      setDeletionReason('')
      if (activeLaporan) fetchLaporanDetail(activeLaporan.id)
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal menghapus transaksi.')
    }
  }

  const handleRestoreTrxConfirm = async () => {
    if (!restoreTrxTarget) return
    setIsRestoringTrx(true)
    const res = await restoreTransaksiKeuanganAction({ id: restoreTrxTarget.id })
    setIsRestoringTrx(false)
    if (res.success) {
      toast.success(res.message || 'Transaksi berhasil dipulihkan!')
      setRestoreTrxTarget(null)
      if (activeLaporan) fetchLaporanDetail(activeLaporan.id)
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal mempulihkan transaksi.')
    }
  }

  const handleHardDeleteTrxConfirm = async () => {
    if (!hardDeleteTrxTarget) return
    setIsHardDeletingTrx(true)
    const res = await hardDeleteTransaksiKeuanganAction({
      id: hardDeleteTrxTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeletingTrx(false)
    if (res.success) {
      toast.success(res.message || 'Transaksi berhasil dihapus permanen!')
      setHardDeleteTrxTarget(null)
      if (activeLaporan) fetchLaporanDetail(activeLaporan.id)
      fetchScopeData()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen transaksi.')
    }
  }

  // Standalone Print Engine for Current Period (Separated Pemasukan & Pengeluaran Tables)
  const handlePrintLaporanPeriod = async () => {
    if (!activeLaporan) return

    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      toast.error('Izinkan pop-up browser untuk mencetak.')
      return
    }

    const layoutRes = await getPrintLayoutConfigAction()
    const layout = layoutRes.data

    const nonDeletedTrx = transaksiList.filter((t) => !t.deletedAt)
    const pemasukanList = nonDeletedTrx.filter((t) => t.tipe === 'MASUK')
    const pengeluaranList = nonDeletedTrx.filter((t) => t.tipe === 'KELUAR')

    const totalMasuk = pemasukanList.reduce((sum, t) => sum + Number(t.nominal), 0)
    const totalKeluar = pengeluaranList.reduce((sum, t) => sum + Number(t.nominal), 0)

    const pemasukanRowsHtml = pemasukanList.length === 0
      ? `<tr><td colspan="7" style="text-align: center; color: #94a3b8; font-style: italic; padding: 8px;">Tidak ada transaksi penerimaan pada periode ini.</td></tr>`
      : pemasukanList
          .map(
            (t, i) => `
          <tr>
            <td style="text-align: center;">${i + 1}</td>
            <td>${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
            <td style="font-family: monospace; font-weight: 600;">${t.nomorReferensi}</td>
            <td style="font-weight: 600;">${t.kategori}</td>
            <td>${t.catatan || '-'}</td>
            <td style="text-align: center; font-size: 8px;">${t.metodePembayaran}</td>
            <td style="text-align: right; color: #16a34a; font-weight: 700; font-family: monospace;">
              Rp ${Number(t.nominal).toLocaleString('id-ID')}
            </td>
          </tr>
        `
          )
          .join('')

    const pengeluaranRowsHtml = pengeluaranList.length === 0
      ? `<tr><td colspan="7" style="text-align: center; color: #94a3b8; font-style: italic; padding: 8px;">Tidak ada transaksi pengeluaran pada periode ini.</td></tr>`
      : pengeluaranList
          .map(
            (t, i) => `
          <tr>
            <td style="text-align: center;">${i + 1}</td>
            <td>${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
            <td style="font-family: monospace; font-weight: 600;">${t.nomorReferensi}</td>
            <td style="font-weight: 600;">${t.kategori}</td>
            <td>${t.catatan || '-'}</td>
            <td style="text-align: center; font-size: 8px;">${t.metodePembayaran}</td>
            <td style="text-align: right; color: #dc2626; font-weight: 700; font-family: monospace;">
              Rp ${Number(t.nominal).toLocaleString('id-ID')}
            </td>
          </tr>
        `
          )
          .join('')

    const logoHtml = layout.kop.tampilkanLogo && layout.kop.logoUrl
      ? `<img src="${layout.kop.logoUrl}" alt="Logo" style="height: 48px; width: 48px; object-fit: contain; border-radius: 6px;" />`
      : `<div style="width: 44px; height: 44px; background: ${layout.kop.garisKopColor}; color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px;">G</div>`

    const borderBottomStyle = layout.kop.garisKopStyle === 'DOUBLE'
      ? `3px double ${layout.kop.garisKopColor}`
      : `2px solid ${layout.kop.garisKopColor}`

    const bendaharaTtd = layout.signatories.bendahara.ttdUrl && layout.options.modeTandaTangan !== 'MANUAL_LINE'
      ? `<img src="${layout.signatories.bendahara.ttdUrl}" alt="TTD" style="max-height: 48px; max-width: 130px; object-fit: contain;" />`
      : `<div style="height: 48px;"></div>`

    const gembalaTtd = layout.signatories.gembala.ttdUrl && layout.options.modeTandaTangan !== 'MANUAL_LINE'
      ? `<img src="${layout.signatories.gembala.ttdUrl}" alt="TTD" style="max-height: 48px; max-width: 130px; object-fit: contain;" />`
      : `<div style="height: 48px;"></div>`

    const stampHtml = layout.stempel.tampilkanStempel && layout.stempel.stempelUrl
      ? `<img src="${layout.stempel.stempelUrl}" alt="Stempel" style="position: absolute; right: 10px; top: 0; height: 55px; opacity: 0.8; pointer-events: none;" />`
      : ''

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>LPJ Kas - ${activeLaporan.scopeName} (${MONTH_NAMES[activeLaporan.bulan - 1]} ${activeLaporan.tahun})</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; color: #0f172a; margin: 0; padding: 4px; line-height: 1.3; }
          .kop { display: flex; align-items: center; gap: 12px; border-bottom: ${borderBottomStyle}; padding-bottom: 8px; margin-bottom: 12px; }
          .kop-text h2 { margin: 0; font-size: 13px; text-transform: uppercase; color: ${layout.kop.garisKopColor}; font-weight: 900; }
          .kop-text p { margin: 1px 0 0 0; font-size: 8.5px; color: #475569; }
          .title { text-align: center; margin: 12px 0; }
          .title h3 { margin: 0; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 900; }
          .title p { margin: 2px 0 0 0; font-size: 9.5px; color: #64748b; font-family: monospace; font-weight: bold; }
          .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; margin: 10px 0 4px 0; color: #0f172a; border-left: 3px solid ${layout.kop.garisKopColor}; padding-left: 6px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-top: 2px; font-size: 8.5px; }
          table.data-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; font-weight: 800; }
          table.data-table td { border: 1px solid #e2e8f0; padding: 4px 6px; }
          .subtotal-row { background: #f8fafc; font-weight: bold; }
          table.rekap-table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9px; }
          table.rekap-table td { border: 1px solid #cbd5e1; padding: 4px 8px; }
          .footer { display: flex; justify-content: space-between; margin-top: 24px; }
          .sign-box { text-align: center; width: 200px; position: relative; }
          .footer-note { font-size: 8px; color: #94a3b8; margin-top: 16px; text-align: center; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="kop">
          ${logoHtml}
          <div class="kop-text">
            <h2>${layout.kop.namaGereja}</h2>
            <p>${layout.kop.subJudul} • ${layout.kop.kontak}</p>
            <p style="font-style: italic; font-size: 8px;">${layout.kop.nomorIzin}</p>
          </div>
        </div>

        <div class="title">
          <h3>LAPORAN PERTANGGUNGJAWABAN (LPJ) MUTASI KAS</h3>
          <p>POS KAS: ${activeLaporan.scopeName.toUpperCase()} • PERIODE: ${MONTH_NAMES[activeLaporan.bulan - 1].toUpperCase()} ${activeLaporan.tahun}</p>
        </div>

        <!-- Bagian I: Penerimaan Kas -->
        <div class="section-title">I. PENERIMAAN KAS (PEMASUKAN)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">No</th>
              <th style="width: 65px;">Tanggal</th>
              <th style="width: 95px;">No Referensi</th>
              <th style="width: 140px;">Pos / Kategori Penerimaan</th>
              <th>Keterangan / Catatan</th>
              <th style="width: 55px; text-align: center;">Metode</th>
              <th style="width: 90px; text-align: right;">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${pemasukanRowsHtml}
            <tr class="subtotal-row">
              <td colspan="6" style="text-align: right; font-weight: 800;">TOTAL PENERIMAAN KAS (I):</td>
              <td style="text-align: right; font-weight: 800; color: #16a34a; font-family: monospace;">+ Rp ${totalMasuk.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <!-- Bagian II: Pengeluaran Kas -->
        <div class="section-title">II. PENGELUARAN KAS (BELANJA & BIAYA)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">No</th>
              <th style="width: 65px;">Tanggal</th>
              <th style="width: 95px;">No Referensi</th>
              <th style="width: 140px;">Pos / Kategori Pengeluaran</th>
              <th>Keterangan / Catatan</th>
              <th style="width: 55px; text-align: center;">Metode</th>
              <th style="width: 90px; text-align: right;">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${pengeluaranRowsHtml}
            <tr class="subtotal-row">
              <td colspan="6" style="text-align: right; font-weight: 800;">TOTAL PENGELUARAN KAS (II):</td>
              <td style="text-align: right; font-weight: 800; color: #dc2626; font-family: monospace;">- Rp ${totalKeluar.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <!-- Bagian III: Rekapitulasi & Saldo Akhir -->
        <div class="section-title">III. REKAPITULASI & SALDO AKHIR KAS</div>
        <table class="rekap-table">
          <tr>
            <td style="width: 70%; font-weight: 600;">A. Saldo Awal Pembukuan Periode Ini</td>
            <td style="text-align: right; font-family: monospace; font-weight: bold;">Rp ${Number(activeLaporan.saldoAwal).toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #16a34a;">B. Total Penerimaan Kas Periode Ini (+)</td>
            <td style="text-align: right; font-family: monospace; font-weight: bold; color: #16a34a;">+ Rp ${totalMasuk.toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #dc2626;">C. Total Pengeluaran Kas Periode Ini (-)</td>
            <td style="text-align: right; font-family: monospace; font-weight: bold; color: #dc2626;">- Rp ${totalKeluar.toLocaleString('id-ID')}</td>
          </tr>
          <tr style="background: #f1f5f9;">
            <td style="font-weight: 800; text-transform: uppercase;">D. SALDO AKHIR KAS PERIODE INI (A + B - C)</td>
            <td style="text-align: right; font-family: monospace; font-weight: 900; font-size: 10.5px; color: #0f172a;">Rp ${Number(activeLaporan.saldoAkhir).toLocaleString('id-ID')}</td>
          </tr>
        </table>

        <!-- Tanda Tangan Pejabat Pengesahan -->
        <div class="footer">
          <div class="sign-box">
            <p style="font-weight: 600; color: #475569; margin: 0;">${layout.signatories.bendahara.jabatan}</p>
            <div style="height: 48px; display: flex; align-items: center; justify-content: center;">
              ${bendaharaTtd}
            </div>
            <p style="font-weight: bold; border-top: 1px solid #000; padding-top: 3px; margin: 0;">
              ${layout.signatories.bendahara.nama}${layout.signatories.bendahara.gelar ? ', ' + layout.signatories.bendahara.gelar : ''}
            </p>
            ${layout.signatories.bendahara.nomorInduk ? `<div style="font-size: 8px; color: #64748b; font-family: monospace;">NIP: ${layout.signatories.bendahara.nomorInduk}</div>` : ''}
          </div>
          <div class="sign-box">
            <p style="font-weight: 600; color: #475569; margin: 0;">${layout.signatories.gembala.jabatan}</p>
            <div style="height: 48px; display: flex; align-items: center; justify-content: center; position: relative;">
              ${gembalaTtd}
              ${stampHtml}
            </div>
            <p style="font-weight: bold; border-top: 1px solid #000; padding-top: 3px; margin: 0;">
              ${layout.signatories.gembala.nama}${layout.signatories.gembala.gelar ? ', ' + layout.signatories.gembala.gelar : ''}
            </p>
            ${layout.signatories.gembala.nomorInduk ? `<div style="font-size: 8px; color: #64748b; font-family: monospace;">NIP: ${layout.signatories.gembala.nomorInduk}</div>` : ''}
          </div>
        </div>

        ${layout.options.tampilkanWatermarkAudit ? `
          <div class="footer-note">
            ${layout.options.catatanKakiResmi} • Verifikasi Dokumen SHA-256 Otentik ${escapeHtml(layout.kop?.namaGereja || 'Gereja')}.
          </div>
        ` : ''}
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(fullHtml)
    printWindow.document.close()
  }

  const filteredTransaksi = transaksiList.filter((t) => {
    if (statusHapusFilter === 'ACTIVE' && t.deletedAt) return false
    if (statusHapusFilter === 'DELETED' && !t.deletedAt) return false
    if (filterTipe === 'MASUK' && t.tipe !== 'MASUK') return false
    if (filterTipe === 'KELUAR' && t.tipe !== 'KELUAR') return false
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      t.nomorReferensi.toLowerCase().includes(q) ||
      t.kategori.toLowerCase().includes(q) ||
      (t.catatan && t.catatan.toLowerCase().includes(q))
    )
  })

  const isClosed = activeLaporan?.status === 'CLOSED'
  const displayScopeName = scopeInfo?.name || `Pos Kas: ${scopeCodeParam}`

  return (
    <div className='space-y-6 max-w-7xl mx-auto pb-20 px-2 sm:px-4'>
      {/* Top Breadcrumb Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div className='space-y-1 min-w-0'>
          {/* Responsive Breadcrumbs */}
          <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap pb-0.5'>
            <Link
              href='/dashboard/keuangan'
              className='hover:text-foreground transition-colors flex items-center gap-1 font-medium shrink-0'
            >
              <Wallet className='size-3.5 shrink-0 text-muted-foreground' />
              <span>Buku Kas</span>
            </Link>

            <ChevronRight className='size-3 shrink-0 text-muted-foreground/60' />

            {viewMode === 'TRANSACTIONS_VIEW' && activeLaporan ? (
              <>
                <button
                  type='button'
                  onClick={() => router.push(`/dashboard/keuangan/scope/${scopeCodeParam}`)}
                  className='hover:text-foreground transition-colors font-medium text-left truncate max-w-32.5 sm:max-w-50 hover:underline'
                  title={displayScopeName}
                >
                  {displayScopeName}
                </button>
                <ChevronRight className='size-3 shrink-0 text-muted-foreground/60' />
                <span className='font-semibold text-foreground shrink-0'>
                  {MONTH_NAMES[activeLaporan.bulan - 1]} {activeLaporan.tahun}
                </span>
              </>
            ) : (
              <span className='font-semibold text-foreground truncate max-w-45 sm:max-w-none' title={displayScopeName}>
                {displayScopeName}
              </span>
            )}
          </nav>

          <div className='flex items-center gap-2 pt-1'>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight'>{displayScopeName}</h1>
          </div>

          {scopeInfo?.description && (
            <p className='text-xs text-muted-foreground'>{scopeInfo.description}</p>
          )}
        </div>

        <div className='w-full sm:w-auto shrink-0'>
          {viewMode === 'TRANSACTIONS_VIEW' ? (
            <div className='grid grid-cols-2 gap-2 w-full sm:flex sm:items-center sm:w-auto'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => router.push(`/dashboard/keuangan/scope/${scopeCodeParam}`)}
                className='text-xs gap-1.5 h-8.5 sm:h-8 w-full sm:w-auto justify-center'
              >
                <ArrowLeft className='size-3.5' /> Arsip Periode
              </Button>

              <Button
                variant='outline'
                size='sm'
                onClick={handlePrintLaporanPeriod}
                className='text-xs gap-1.5 h-8.5 sm:h-8 w-full sm:w-auto justify-center'
              >
                <Printer className='size-3.5 text-primary' /> Cetak LPJ A4
              </Button>

              {activeLaporan && (
                isClosed ? (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setReopenDialogOpen(true)}
                    className='text-xs gap-1.5 h-8.5 sm:h-8 text-amber-600 border-amber-500/30 col-span-2 sm:col-span-1 w-full sm:w-auto justify-center'
                  >
                    <Unlock className='size-3.5' /> Buka Kembali
                  </Button>
                ) : (
                  <>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => setCloseAlertOpen(true)}
                      className='text-xs gap-1.5 h-8.5 sm:h-8 text-amber-600 border-amber-500/30 w-full sm:w-auto justify-center'
                    >
                      <Lock className='size-3.5' /> Tutup Periode
                    </Button>
                    <Button
                      size='sm'
                      onClick={() => {
                        resetTrxForm()
                        setTrxOpen(true)
                      }}
                      className='text-xs gap-1.5 h-8.5 sm:h-8 bg-primary text-primary-foreground font-semibold shadow-xs w-full sm:w-auto justify-center'
                    >
                      <Plus className='size-3.5' /> Tambah Transaksi
                    </Button>
                  </>
                )
              )}
            </div>
          ) : (
            <div className='grid grid-cols-2 gap-2 w-full sm:flex sm:items-center sm:w-auto'>
              <Link href='/dashboard/keuangan' className='w-full sm:w-auto'>
                <Button variant='outline' size='sm' className='text-xs gap-1.5 h-8.5 sm:h-8 w-full sm:w-auto justify-center'>
                  <ArrowLeft className='size-3.5' /> Semua Pos Kas
                </Button>
              </Link>

              <Button
                variant='outline'
                size='sm'
                onClick={handleOpenBookPrintModal}
                disabled={isPreparingBookPrint || scopeLaporanList.length === 0}
                className='text-xs gap-1.5 h-8.5 sm:h-8 border-primary/30 text-primary hover:bg-primary/5 font-semibold shadow-xs w-full sm:w-auto justify-center'
              >
                {isPreparingBookPrint ? <Loader2 className='size-3.5 animate-spin' /> : <BookOpen className='size-3.5 text-primary' />}
                <span className='sm:hidden'>{isPreparingBookPrint ? 'Menyiapkan...' : 'Cetak LPJ Kas'}</span>
                <span className='hidden sm:inline'>{isPreparingBookPrint ? 'Menyiapkan...' : 'Cetak Buku LPJ Kas (A4)'}</span>
              </Button>

              <Button
                size='sm'
                onClick={() => setCreatePeriodOpen(true)}
                className='text-xs gap-1.5 h-8.5 sm:h-8 bg-primary text-primary-foreground font-semibold shadow-xs col-span-2 sm:col-span-1 w-full sm:w-auto justify-center'
              >
                <Plus className='size-3.5' /> Buat Periode Baru
              </Button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-20 text-muted-foreground gap-2 text-xs'>
          <Loader2 className='size-5 animate-spin text-primary' /> Memuat data buku kas...
        </div>
      ) : viewMode === 'PERIODS_LIST' ? (
        <>
        {/* ═══════════════════════════════════════════════════════════════
           LEVEL 2 - SECTION A: ANALITIK & GRAFIK TREN KAS BULANAN
           ═══════════════════════════════════════════════════════════════ */}
        {(() => {
          const activePeriods = scopeLaporanList.filter((l) => !l.deletedAt)
          const availableYears = Array.from(new Set(activePeriods.map((l) => l.tahun))).sort((a, b) => b - a)

          // Timeline Data Filtering
          let filteredPeriods = [...activePeriods]
          const sortedChronological = [...activePeriods].sort((a, b) => a.tahun !== b.tahun ? a.tahun - b.tahun : a.bulan - b.bulan)

          if (chartYearFilter === 'LAST_3_MONTHS') {
            filteredPeriods = sortedChronological.slice(-3)
          } else if (chartYearFilter === 'LAST_6_MONTHS') {
            filteredPeriods = sortedChronological.slice(-6)
          } else if (chartYearFilter === 'LAST_12_MONTHS') {
            filteredPeriods = sortedChronological.slice(-12)
          } else if (chartYearFilter.startsWith('YEAR_')) {
            const targetYr = Number(chartYearFilter.replace('YEAR_', ''))
            filteredPeriods = activePeriods.filter((l) => l.tahun === targetYr)
          }

          const multiChartData = filteredPeriods
            .sort((a, b) => a.tahun !== b.tahun ? a.tahun - b.tahun : a.bulan - b.bulan)
            .map((l) => ({
              name: `${MONTH_NAMES[l.bulan - 1].slice(0, 3)} ${l.tahun}`,
              bulanFull: `${MONTH_NAMES[l.bulan - 1]} ${l.tahun}`,
              saldoAwal: l.saldoAwal,
              pemasukan: l.totalPemasukan,
              pengeluaran: l.totalPengeluaran,
              saldoAkhir: l.saldoAkhir,
              netKas: l.totalPemasukan - l.totalPengeluaran,
              status: l.status,
            }))

          const totalPemasukanChart = multiChartData.reduce((acc, curr) => acc + curr.pemasukan, 0)
          const totalPengeluaranChart = multiChartData.reduce((acc, curr) => acc + curr.pengeluaran, 0)
          const netKasChart = totalPemasukanChart - totalPengeluaranChart
          const latestSaldo = multiChartData.length > 0 ? multiChartData[multiChartData.length - 1].saldoAkhir : 0

          return (
            <Card className='shadow-xs overflow-hidden border-border/80'>
              <CardHeader className='pb-3 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b bg-muted/20'>
                <div className='space-y-0.5'>
                  <CardTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
                    <BarChart3 className='size-4 text-primary shrink-0' />
                    Analitik & Tren Arus Kas
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Grafik perbandingan arus kas masuk, kas keluar, dan saldo akhir.
                  </CardDescription>
                </div>

                <div className='flex items-center gap-2 w-full sm:w-auto'>
                  <Select value={chartYearFilter} onValueChange={setChartYearFilter}>
                    <SelectTrigger className='h-8 text-xs font-semibold flex-1 sm:w-48 bg-background'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='ALL' className='text-xs font-semibold'>
                        Semua Periode ({activePeriods.length})
                      </SelectItem>
                      <SelectItem value='LAST_3_MONTHS' className='text-xs font-semibold'>
                        3 Bulan Terakhir
                      </SelectItem>
                      <SelectItem value='LAST_6_MONTHS' className='text-xs font-semibold'>
                        6 Bulan Terakhir
                      </SelectItem>
                      <SelectItem value='LAST_12_MONTHS' className='text-xs font-semibold'>
                        12 Bulan Terakhir
                      </SelectItem>
                      {availableYears.length > 0 && <SelectSeparator />}
                      {availableYears.map((yr) => (
                        <SelectItem key={yr} value={`YEAR_${yr}`} className='text-xs font-semibold font-mono'>
                          Tahun {yr} ({activePeriods.filter((l) => l.tahun === yr).length} Periode)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setShowChart(!showChart)}
                    className='h-8 text-xs gap-1 font-semibold bg-background shrink-0'
                  >
                    {showChart ? <ChevronUp className='size-3.5' /> : <ChevronDown className='size-3.5' />}
                    {showChart ? 'Tutup' : 'Lihat'}
                  </Button>
                </div>
              </CardHeader>

              {showChart && (
                <CardContent className='p-3.5 sm:p-6 space-y-5'>
                  {/* 4 Mini KPI Cards */}
                  <div className='grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3'>
                    <div className='p-2.5 sm:p-3.5 rounded-xl border bg-card/60 space-y-1 shadow-2xs overflow-hidden'>
                      <div className='flex items-center justify-between text-muted-foreground text-[10px] sm:text-[11px] font-semibold gap-1'>
                        <span className='truncate'>Kas Masuk</span>
                        <div className='p-1 rounded-md bg-emerald-500/10 text-emerald-600 shrink-0'>
                          <ArrowUpRight className='size-3 sm:size-3.5' />
                        </div>
                      </div>
                      <div className='text-xs sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 truncate tracking-tight' title={`+ Rp ${totalPemasukanChart.toLocaleString('id-ID')}`}>
                        + Rp {totalPemasukanChart.toLocaleString('id-ID')}
                      </div>
                      <div className='text-[9px] sm:text-[10px] text-muted-foreground font-mono truncate'>
                        {multiChartData.length} Periode Pembukuan
                      </div>
                    </div>

                    <div className='p-2.5 sm:p-3.5 rounded-xl border bg-card/60 space-y-1 shadow-2xs overflow-hidden'>
                      <div className='flex items-center justify-between text-muted-foreground text-[10px] sm:text-[11px] font-semibold gap-1'>
                        <span className='truncate'>Kas Keluar</span>
                        <div className='p-1 rounded-md bg-rose-500/10 text-rose-600 shrink-0'>
                          <ArrowDownRight className='size-3 sm:size-3.5' />
                        </div>
                      </div>
                      <div className='text-xs sm:text-base font-black font-mono text-rose-600 dark:text-rose-400 truncate tracking-tight' title={`- Rp ${totalPengeluaranChart.toLocaleString('id-ID')}`}>
                        - Rp {totalPengeluaranChart.toLocaleString('id-ID')}
                      </div>
                      <div className='text-[9px] sm:text-[10px] text-muted-foreground font-mono truncate'>
                        Belanja Operasional
                      </div>
                    </div>

                    <div className='p-2.5 sm:p-3.5 rounded-xl border bg-card/60 space-y-1 shadow-2xs overflow-hidden'>
                      <div className='flex items-center justify-between text-muted-foreground text-[10px] sm:text-[11px] font-semibold gap-1'>
                        <span className='truncate'>Arus Kas Bersih</span>
                        <div className={`p-1 rounded-md shrink-0 ${netKasChart >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {netKasChart >= 0 ? <TrendingUp className='size-3 sm:size-3.5' /> : <TrendingDown className='size-3 sm:size-3.5' />}
                        </div>
                      </div>
                      <div className={`text-xs sm:text-base font-black font-mono truncate tracking-tight ${netKasChart >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} title={`${netKasChart >= 0 ? '+ ' : ''}Rp ${netKasChart.toLocaleString('id-ID')}`}>
                        {netKasChart >= 0 ? '+ ' : ''}Rp {netKasChart.toLocaleString('id-ID')}
                      </div>
                      <div className='text-[9px] sm:text-[10px] font-semibold'>
                        <Badge variant='outline' className={`text-[8.5px] sm:text-[9px] px-1.5 py-0 ${netKasChart >= 0 ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5' : 'border-rose-500/30 text-rose-600 bg-rose-500/5'}`}>
                          {netKasChart >= 0 ? 'Surplus' : 'Defisit'}
                        </Badge>
                      </div>
                    </div>

                    <div className='p-2.5 sm:p-3.5 rounded-xl border bg-card/60 space-y-1 shadow-2xs overflow-hidden'>
                      <div className='flex items-center justify-between text-muted-foreground text-[10px] sm:text-[11px] font-semibold gap-1'>
                        <span className='truncate'>Saldo Terkini</span>
                        <div className='p-1 rounded-md bg-primary/10 text-primary shrink-0'>
                          <Wallet className='size-3 sm:size-3.5' />
                        </div>
                      </div>
                      <div className='text-xs sm:text-base font-black font-mono text-primary truncate tracking-tight' title={`Rp ${latestSaldo.toLocaleString('id-ID')}`}>
                        Rp {latestSaldo.toLocaleString('id-ID')}
                      </div>
                      <div className='text-[9px] sm:text-[10px] text-muted-foreground font-mono truncate'>
                        {multiChartData.length > 0 ? multiChartData[multiChartData.length - 1].bulanFull : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Chart Graphic Area */}
                  {multiChartData.length === 0 ? (
                    <div className='text-center py-12 text-muted-foreground text-xs'>
                      Belum ada data periode untuk ditampilkan pada grafik.
                    </div>
                  ) : (
                    <div className='pt-2 space-y-2'>
                      {/* Clean HTML Legend */}
                      <div className='flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1.5 text-[11px] sm:text-xs pt-1'>
                        <div className='flex items-center gap-1.5 font-medium'>
                          <span className='size-2.5 rounded-full bg-[#16a34a] shrink-0' />
                          <span className='text-foreground'>Kas Masuk</span>
                        </div>
                        <div className='flex items-center gap-1.5 font-medium'>
                          <span className='size-2.5 rounded-full bg-[#dc2626] shrink-0' />
                          <span className='text-foreground'>Kas Keluar</span>
                        </div>
                        <div className='flex items-center gap-1.5 font-medium'>
                          <span className='size-2.5 rounded-full bg-[#3b82f6] shrink-0' />
                          <span className='text-foreground'>Posisi Saldo Kas</span>
                        </div>
                      </div>

                      <div className='overflow-x-auto pb-2'>
                        <div className={`h-70 sm:h-80 ${multiChartData.length > 5 ? 'min-w-120 sm:min-w-full' : 'w-full'}`}>
                          <ResponsiveContainer width='100%' height='100%'>
                            <ComposedChart
                              data={multiChartData}
                              margin={{ top: 15, right: 25, left: -10, bottom: 25 }}
                            >
                              <CartesianGrid strokeDasharray='3 3' className='stroke-muted/40' vertical={false} />
                              <XAxis
                                dataKey='name'
                                className='text-[11px] font-mono'
                                tick={{ fill: 'currentColor', opacity: 0.8, fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                width={45}
                                className='text-[10px] font-mono'
                                tick={{ fill: 'currentColor', opacity: 0.75, fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => {
                                  if (value >= 1000000) return `${(value / 1000000).toFixed(0)} jt`
                                  if (value >= 1000) return `${(value / 1000).toFixed(0)} rb`
                                  return String(value)
                                }}
                              />
                              <Tooltip
                                allowEscapeViewBox={{ x: false, y: false }}
                                wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const d = payload[0].payload
                                    return (
                                      <div className='bg-card/95 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-xl text-xs space-y-1.5 w-48 sm:w-52'>
                                        <div className='flex items-center justify-between border-b pb-1 font-bold text-foreground'>
                                          <span className='truncate text-xs'>{d.bulanFull}</span>
                                          <Badge variant='outline' className='text-[9px] font-mono px-1 py-0 shrink-0'>
                                            {d.status}
                                          </Badge>
                                        </div>
                                        <div className='space-y-1 font-mono text-[10.5px] sm:text-[11px]'>
                                          <div className='flex justify-between text-muted-foreground'>
                                            <span>Saldo Awal:</span>
                                            <span className='font-semibold text-foreground'>Rp {d.saldoAwal.toLocaleString('id-ID')}</span>
                                          </div>
                                          <div className='flex justify-between text-emerald-600 font-bold'>
                                            <span>Pemasukan:</span>
                                            <span>+ Rp {d.pemasukan.toLocaleString('id-ID')}</span>
                                          </div>
                                          <div className='flex justify-between text-rose-600 font-bold'>
                                            <span>Pengeluaran:</span>
                                            <span>- Rp {d.pengeluaran.toLocaleString('id-ID')}</span>
                                          </div>
                                          <div className='flex justify-between font-bold border-t pt-1 text-foreground'>
                                            <span>Saldo Akhir:</span>
                                            <span className='text-primary'>Rp {d.saldoAkhir.toLocaleString('id-ID')}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                }}
                              />
                              <Bar
                                dataKey='pemasukan'
                                name='Kas Masuk (Pemasukan)'
                                fill='#16a34a'
                                radius={[4, 4, 0, 0]}
                                maxBarSize={28}
                              />
                              <Bar
                                dataKey='pengeluaran'
                                name='Kas Keluar (Pengeluaran)'
                                fill='#dc2626'
                                radius={[4, 4, 0, 0]}
                                maxBarSize={28}
                              />
                              <Line
                                type='monotone'
                                dataKey='saldoAkhir'
                                name='Posisi Saldo Kas'
                                stroke='#3b82f6'
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6 }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })()}

        {/* ═══════════════════════════════════════════════════════════════
           LEVEL 2 - SECTION B: DAFTAR SELURUH PERIODE LAPORAN (TABEL ARSIP)
           ═══════════════════════════════════════════════════════════════ */}
        <Card className='shadow-xs overflow-hidden'>
          <CardHeader className='pb-3 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b bg-muted/20'>
            <div>
              <CardTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
                <Calendar className='size-4 text-primary shrink-0' />
                Arsip Periode Pembukuan
              </CardTitle>
              <CardDescription className='text-xs'>
                Daftar buku kas per bulan & tahun. Klik baris untuk rincian mutasi.
              </CardDescription>
            </div>

            <div className='flex items-center gap-2 w-full sm:w-auto'>
              <div className='grid grid-cols-2 gap-1 sm:flex items-center bg-muted/60 p-1 rounded-lg border text-xs w-full sm:w-auto'>
                <button
                  type='button'
                  onClick={() => {
                    setPeriodTabFilter('ACTIVE')
                    setPeriodPage(1)
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap text-center ${
                    periodTabFilter === 'ACTIVE'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  Buku Aktif ({scopeLaporanList.filter((l) => !l.deletedAt).length})
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setPeriodTabFilter('DELETED')
                    setPeriodPage(1)
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap text-center flex items-center justify-center gap-1.5 ${
                    periodTabFilter === 'DELETED'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <Trash2 className='size-3 text-rose-500 shrink-0' />
                  Sampah ({scopeLaporanList.filter((l) => !!l.deletedAt).length})
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className='p-0'>

            {(() => {
              const displayPeriods = scopeLaporanList.filter((l) =>
                periodTabFilter === 'ACTIVE' ? !l.deletedAt : !!l.deletedAt
              )

              const allVisibleSelected = displayPeriods.length > 0 && displayPeriods.every((l) => selectedPeriodIds.includes(l.id))

              if (displayPeriods.length === 0) {
                return (
                  <div className='text-center py-16 text-muted-foreground text-xs space-y-3'>
                    <Calendar className='size-8 mx-auto text-muted-foreground/40' />
                    <p className='font-semibold text-foreground'>
                      {periodTabFilter === 'ACTIVE'
                        ? 'Belum ada periode pembukuan aktif untuk pos kas ini.'
                        : 'Kotak sampah kosong (tidak ada periode yang terhapus).'}
                    </p>
                    {periodTabFilter === 'ACTIVE' && (
                      <Button
                        size='sm'
                        onClick={() => setCreatePeriodOpen(true)}
                        className='text-xs gap-1.5 bg-primary text-primary-foreground mt-2'
                      >
                        <Plus className='size-3.5' /> Buat Periode Sekarang
                      </Button>
                    )}
                  </div>
                )
              }

              const totalPeriodPages = Math.ceil(displayPeriods.length / periodPageSize) || 1
              const paginatedPeriods = displayPeriods.slice((periodPage - 1) * periodPageSize, periodPage * periodPageSize)

              return (
                <div className='overflow-x-auto'>
                  <Table className='min-w-170'>
                    <TableHeader className='bg-muted/40'>
                      <TableRow className='text-[11px]'>
                        <TableHead className='w-10 text-center'>
                          <input
                            type='checkbox'
                            checked={allVisibleSelected}
                            onChange={() => handleToggleSelectAll(displayPeriods)}
                            className='rounded text-primary focus:ring-0 cursor-pointer size-3.5'
                            aria-label='Pilih semua periode'
                          />
                        </TableHead>
                        <TableHead className='w-10 text-center'>No</TableHead>
                        <TableHead>Periode Buku Kas</TableHead>
                        <TableHead className='text-right'>Saldo Awal</TableHead>
                        <TableHead className='text-right'>Total Pemasukan</TableHead>
                        <TableHead className='text-right'>Total Pengeluaran</TableHead>
                        <TableHead className='text-right'>Saldo Akhir</TableHead>
                        <TableHead className='text-center'>Transaksi</TableHead>
                        <TableHead className='text-center'>Status</TableHead>
                        <TableHead className='text-right w-44'>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className='divide-y text-xs'>
                      {paginatedPeriods.map((lap, idx) => {
                        const isSelected = selectedPeriodIds.includes(lap.id)
                        return (
                          <TableRow key={lap.id} className={`hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                            <TableCell className='text-center'>
                              <input
                                type='checkbox'
                                checked={isSelected}
                                onChange={() => handleToggleSelect(lap.id)}
                                className='rounded text-primary focus:ring-0 cursor-pointer size-3.5'
                                aria-label={`Pilih periode ${MONTH_NAMES[lap.bulan - 1]} ${lap.tahun}`}
                              />
                            </TableCell>

                            <TableCell className='text-center text-muted-foreground font-mono text-[11px]'>
                              {(periodPage - 1) * periodPageSize + idx + 1}
                            </TableCell>

                            <TableCell>
                              <div className='font-bold text-foreground text-sm'>
                                {MONTH_NAMES[lap.bulan - 1]} {lap.tahun}
                              </div>
                              {lap.deletedAt ? (
                                <div className='text-[10px] text-rose-600 font-mono'>
                                  Terhapus: {new Date(lap.deletedAt).toLocaleDateString('id-ID')}
                                </div>
                              ) : (
                                <div className='text-[10px] text-muted-foreground font-mono'>
                                  Dibuat: {new Date(lap.createdAt).toLocaleDateString('id-ID')}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className='text-right font-mono text-muted-foreground'>
                              Rp {lap.saldoAwal.toLocaleString('id-ID')}
                            </TableCell>

                            <TableCell className='text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold'>
                              + Rp {lap.totalPemasukan.toLocaleString('id-ID')}
                            </TableCell>

                            <TableCell className='text-right font-mono text-rose-600 dark:text-rose-400 font-semibold'>
                              - Rp {lap.totalPengeluaran.toLocaleString('id-ID')}
                            </TableCell>

                            <TableCell className='text-right font-mono font-black text-foreground'>
                              Rp {lap.saldoAkhir.toLocaleString('id-ID')}
                            </TableCell>

                            <TableCell className='text-center'>
                              <Badge variant='secondary' className='text-[10px] font-mono'>
                                {lap.transaksiCount ?? 0} item
                              </Badge>
                            </TableCell>

                            <TableCell className='text-center'>
                              {lap.deletedAt ? (
                                <Badge variant='outline' className='text-rose-600 border-rose-500/30 text-[10px] gap-1 py-0.5 px-2 bg-rose-500/10'>
                                  <Trash2 className='size-3' /> Terhapus
                                </Badge>
                              ) : lap.status === 'CLOSED' ? (
                                <Badge variant='outline' className='text-muted-foreground text-[10px] gap-1 py-0.5 px-2 bg-muted/40'>
                                  <Lock className='size-3' /> Tertutup (Closed)
                                </Badge>
                              ) : (
                                <Badge className='bg-emerald-600 text-white text-[10px] gap-1 py-0.5 px-2'>
                                  <Clock className='size-3' /> Berjalan (Draft)
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className='text-right'>
                              <div className='flex items-center justify-end gap-1.5'>
                                {periodTabFilter === 'ACTIVE' ? (
                                  <>
                                    <Button
                                      size='sm'
                                      onClick={() => handleOpenTransactionView(lap)}
                                      className='h-7 px-2.5 text-[11px] gap-1 bg-primary text-primary-foreground font-semibold shadow-xs'
                                    >
                                      <FolderOpen className='size-3' /> Buka Mutasi
                                    </Button>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant='ghost' size='sm' className='h-7 w-7 p-0'>
                                          <MoreHorizontal className='size-4' />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align='end' className='w-48 text-xs'>
                                        <DropdownMenuLabel className='text-[10px] text-muted-foreground uppercase font-mono'>
                                          Opsi Periode
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            if (lap.status === 'CLOSED') {
                                              toast.error('Periode sudah ditutup. Buka kembali periode untuk mengedit.')
                                              return
                                            }
                                            handleOpenEditPeriod(lap)
                                          }}
                                          className='gap-2 text-xs cursor-pointer'
                                        >
                                          <Edit className='size-3.5 text-primary' /> Edit Periode & Saldo
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setDeletePeriodTarget(lap)
                                            setDeletePeriodReason('')
                                          }}
                                          className='gap-2 text-xs text-rose-600 focus:text-rose-700 cursor-pointer'
                                        >
                                          <Trash2 className='size-3.5' /> Hapus Periode (Soft Delete)
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      onClick={() => setRestorePeriodTarget(lap)}
                                      className='h-7 px-2.5 text-[11px] gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50'
                                    >
                                      <RotateCcw className='size-3' /> Pulihkan
                                    </Button>
                                    <Button
                                      size='sm'
                                      variant='destructive'
                                      onClick={() => {
                                        setHardDeletePeriodTarget(lap)
                                        setHardDeletePeriodReason('')
                                      }}
                                      className='h-7 px-2 text-[11px] gap-1'
                                    >
                                      <Trash2 className='size-3' /> Hapus Permanen
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  <TablePagination
                    currentPage={periodPage}
                    totalPages={totalPeriodPages}
                    pageSize={periodPageSize}
                    totalItems={displayPeriods.length}
                    onPageChange={setPeriodPage}
                    onPageSizeChange={setPeriodPageSize}
                    pageSizeOptions={[10, 20, 50]}
                    itemLabel='periode pembukuan'
                  />
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* ── FLOATING BOTTOM BATCH BAR (Single Clean 1-Row Pill) ── */}
        {selectedPeriodIds.length > 0 && (
          <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-full p-1.5 px-3 sm:px-4 flex items-center flex-nowrap gap-1.5 sm:gap-2 max-w-[calc(100vw-2rem)] overflow-x-auto animate-in fade-in-50 slide-in-from-bottom-4 duration-200'>
            <div className='flex items-center gap-1.5 pe-2.5 border-r border-border shrink-0'>
              <Badge className='text-xs font-mono font-bold bg-primary text-primary-foreground h-6 px-2 rounded-full'>
                {selectedPeriodIds.length}
              </Badge>
              <span className='font-semibold text-xs text-foreground whitespace-nowrap hidden sm:inline'>
                Dipilih
              </span>
            </div>

            <div className='flex items-center gap-1.5 shrink-0'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => handleExecuteBookPrint('ALL', selectedPeriodIds)}
                disabled={isGeneratingBookPrint}
                className='h-7.5 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10 rounded-full whitespace-nowrap'
                title='Cetak Bundel LPJ A4 Periode Terpilih'
              >
                {isGeneratingBookPrint ? <Loader2 className='size-3.5 animate-spin' /> : <Printer className='size-3.5' />}
                <span>Cetak Terpilih (A4)</span>
              </Button>

              <Button
                size='sm'
                variant='outline'
                onClick={handleBulkFinalize}
                disabled={isBulkProcessing}
                className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
                title='Tutup Buku Periode Terpilih'
              >
                {isBulkProcessing ? <Loader2 className='size-3.5 animate-spin' /> : <Lock className='size-3.5' />}
                <span>Tutup Buku</span>
              </Button>

              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  setBulkReopenReason('')
                  setBulkReopenModalOpen(true)
                }}
                disabled={isBulkProcessing}
                className='h-7.5 px-2.5 text-xs gap-1.5 font-medium text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/10 rounded-full whitespace-nowrap'
                title='Buka Kembali Periode Terpilih'
              >
                <Unlock className='size-3.5' />
                <span>Buka Buku</span>
              </Button>

              <Button
                size='sm'
                variant='outline'
                onClick={handleExportCSV}
                className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
                title='Ekspor data periode terpilih ke CSV / Excel'
              >
                <FileSpreadsheet className='size-3.5' />
                <span>Export CSV</span>
              </Button>

              <Button
                size='sm'
                variant='destructive'
                onClick={() => {
                  setBulkDeleteReason('')
                  setBulkDeleteModalOpen(true)
                }}
                disabled={isBulkProcessing}
                className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
                title='Hapus periode terpilih ke kotak sampah'
              >
                <Trash2 className='size-3.5' />
                <span>Hapus</span>
              </Button>

              <div className='h-4 w-px bg-border shrink-0 my-auto' />

              <Button
                size='icon'
                variant='ghost'
                onClick={() => setSelectedPeriodIds([])}
                className='size-7 rounded-full text-muted-foreground hover:text-foreground shrink-0'
                title='Batalkan pilihan'
              >
                <X className='size-3.5' />
              </Button>
            </div>
          </div>
        )}
      </>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           LEVEL 3: DETAIL BUKU MUTASI TRANSAKSI PERIODE TERPILIH
           ═══════════════════════════════════════════════════════════════ */
        <div className='space-y-6'>
          {/* Quick Period Selector Dropdown */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-muted/30 border rounded-xl'>
            <div className='flex items-center gap-2 text-xs'>
              <span className='text-muted-foreground font-semibold'>Pilih Periode:</span>
              <Select
                value={selectedLaporanId}
                onValueChange={(val) => {
                  const found = scopeLaporanList.find((l) => l.id === val)
                  if (found) {
                    router.push(`/dashboard/keuangan/scope/${scopeCodeParam}?bulan=${found.bulan}&tahun=${found.tahun}`)
                  }
                }}
              >
                <SelectTrigger className='h-8 w-48 text-xs font-bold'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scopeLaporanList.map((lap) => (
                    <SelectItem key={lap.id} value={lap.id} className='text-xs font-semibold'>
                      {MONTH_NAMES[lap.bulan - 1]} {lap.tahun} ({lap.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='flex items-center gap-2'>
              {isClosed ? (
                <Badge variant='outline' className='text-xs gap-1 bg-muted/50 text-muted-foreground font-mono'>
                  <Lock className='size-3.5 text-amber-600' /> Status: Terkunci (Read-Only)
                </Badge>
              ) : (
                <Badge className='text-xs gap-1 bg-emerald-600 text-white font-mono'>
                  <Clock className='size-3.5' /> Status: Periode Berjalan (Draft)
                </Badge>
              )}
            </div>
          </div>

          {/* Level 3 KPI Summary Cards */}
          {activeLaporan && (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
              <Card className='shadow-xs bg-card'>
                <CardHeader className='pb-1 pt-3 px-4 space-y-0'>
                  <CardTitle className='text-[10px] uppercase font-semibold text-muted-foreground'>
                    Saldo Awal Periode
                  </CardTitle>
                </CardHeader>
                <CardContent className='pb-3 pt-1 px-4 font-mono font-bold text-lg sm:text-xl text-foreground'>
                  Rp {activeLaporan.saldoAwal.toLocaleString('id-ID')}
                </CardContent>
              </Card>

              <Card className='shadow-xs bg-card'>
                <CardHeader className='pb-1 pt-3 px-4 space-y-0'>
                  <CardTitle className='text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400'>
                    Total Kas Masuk (+)
                  </CardTitle>
                </CardHeader>
                <CardContent className='pb-3 pt-1 px-4 font-mono font-bold text-lg sm:text-xl text-emerald-600 dark:text-emerald-400'>
                  + Rp {activeLaporan.totalPemasukan.toLocaleString('id-ID')}
                </CardContent>
              </Card>

              <Card className='shadow-xs bg-card'>
                <CardHeader className='pb-1 pt-3 px-4 space-y-0'>
                  <CardTitle className='text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400'>
                    Total Kas Keluar (-)
                  </CardTitle>
                </CardHeader>
                <CardContent className='pb-3 pt-1 px-4 font-mono font-bold text-lg sm:text-xl text-rose-600 dark:text-rose-400'>
                  - Rp {activeLaporan.totalPengeluaran.toLocaleString('id-ID')}
                </CardContent>
              </Card>

              <Card className='shadow-xs border-primary/20 bg-primary/2'>
                <CardHeader className='pb-1 pt-3 px-4 space-y-0'>
                  <CardTitle className='text-[10px] uppercase font-bold text-primary'>
                    Saldo Akhir Periode
                  </CardTitle>
                </CardHeader>
                <CardContent className='pb-3 pt-1 px-4 font-mono font-black text-lg sm:text-xl text-primary'>
                  Rp {activeLaporan.saldoAkhir.toLocaleString('id-ID')}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Level 3: Mutation Transactions Table */}
          <Card className='shadow-xs overflow-hidden'>
            <CardHeader className='pb-3 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b bg-muted/20'>
              <div>
                <CardTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
                  <FileText className='size-4 text-primary shrink-0' />
                  Buku Mutasi Transaksi
                </CardTitle>
                <CardDescription className='text-xs'>
                  Catatan penerimaan dan pengeluaran kas.
                </CardDescription>
              </div>

              <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto'>
                <div className='relative w-full sm:w-48'>
                  <Search className='absolute left-2.5 top-2.5 size-3.5 text-muted-foreground' />
                  <Input
                    placeholder='Cari transaksi...'
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setTrxPage(1)
                    }}
                    className='pl-8 text-xs h-8 bg-background'
                  />
                </div>

                <div className='grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto'>
                  <Select
                    value={filterTipe}
                    onValueChange={(v: any) => {
                      setFilterTipe(v)
                      setTrxPage(1)
                    }}
                  >
                    <SelectTrigger className='h-8 text-xs px-2.5 w-full sm:w-32 bg-background'>
                      <SelectValue placeholder='Semua Tipe' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='ALL' className='text-xs'>Semua Tipe</SelectItem>
                      <SelectItem value='MASUK' className='text-xs text-emerald-600 font-semibold'>Kas Masuk (+)</SelectItem>
                      <SelectItem value='KELUAR' className='text-xs text-rose-600 font-semibold'>Kas Keluar (-)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusHapusFilter}
                    onValueChange={(v: any) => {
                      setStatusHapusFilter(v)
                      setTrxPage(1)
                    }}
                  >
                    <SelectTrigger className='h-8 text-xs px-2.5 w-full sm:w-28 bg-background'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='ACTIVE' className='text-xs'>Data Aktif</SelectItem>
                      <SelectItem value='DELETED' className='text-xs text-rose-600'>Terhapus</SelectItem>
                      <SelectItem value='ALL' className='text-xs'>Semua Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className='p-0'>
              {loadingLaporan ? (
                <div className='flex items-center justify-center py-16 text-muted-foreground gap-2 text-xs'>
                  <Loader2 className='size-4 animate-spin text-primary' /> Memuat rincian transaksi...
                </div>
              ) : filteredTransaksi.length === 0 ? (
                <div className='text-center py-16 text-muted-foreground text-xs space-y-2'>
                  <FileText className='size-8 mx-auto text-muted-foreground/40' />
                  <p>Belum ada transaksi yang tercatat pada periode ini.</p>
                  {!isClosed && (
                    <Button
                      size='sm'
                      onClick={() => {
                        resetTrxForm()
                        setTrxOpen(true)
                      }}
                      className='text-xs gap-1.5 bg-primary text-primary-foreground mt-2'
                    >
                      <Plus className='size-3.5' /> Tambah Transaksi Pertama
                    </Button>
                  )}
                </div>
              ) : (
                (() => {
                  const totalTrxPages = Math.ceil(filteredTransaksi.length / trxPageSize) || 1
                  const paginatedTransaksi = filteredTransaksi.slice((trxPage - 1) * trxPageSize, trxPage * trxPageSize)

                  return (
                    <div className='overflow-x-auto'>
                      <Table className='min-w-180'>
                        <TableHeader className='bg-muted/40'>
                          <TableRow className='text-[11px]'>
                            <TableHead className='w-12 text-center'>No</TableHead>
                            <TableHead className='w-28'>Tanggal</TableHead>
                            <TableHead className='w-36'>No Referensi</TableHead>
                            <TableHead className='w-28 text-center'>Tipe</TableHead>
                            <TableHead>Kategori Transaksi</TableHead>
                            <TableHead>Catatan / Peruntukan</TableHead>
                            <TableHead className='w-24 text-center'>Metode</TableHead>
                            <TableHead className='w-36 text-right'>Nominal (Rp)</TableHead>
                            <TableHead className='w-14 text-center'>Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className='divide-y text-xs'>
                          {paginatedTransaksi.map((trx, idx) => {
                            const isDeleted = !!trx.deletedAt
                            return (
                              <TableRow key={trx.id} className={isDeleted ? 'bg-rose-500/5 line-through opacity-60' : 'hover:bg-muted/30'}>
                                <TableCell className='text-center text-muted-foreground font-mono text-[11px]'>
                                  {(trxPage - 1) * trxPageSize + idx + 1}
                                </TableCell>
                                <TableCell className='font-medium'>
                                  {new Date(trx.tanggal).toLocaleDateString('id-ID')}
                                </TableCell>
                                <TableCell className='font-mono font-semibold text-foreground text-[11px]'>
                                  {trx.nomorReferensi}
                                </TableCell>
                                <TableCell className='text-center'>
                                  {trx.tipe === 'MASUK' ? (
                                    <Badge className='bg-emerald-600 text-white text-[10px] py-0 px-2'>
                                      MASUK (+)
                                    </Badge>
                                  ) : (
                                    <Badge variant='destructive' className='text-[10px] py-0 px-2'>
                                      KELUAR (-)
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className='font-semibold'>{trx.kategori}</TableCell>
                                <TableCell className='text-muted-foreground text-[11px] max-w-xs truncate'>
                                  {trx.catatan || '-'}
                                </TableCell>
                                <TableCell className='text-center'>
                                  <Badge variant='outline' className='font-mono text-[9px]'>
                                    {trx.metodePembayaran}
                                  </Badge>
                                </TableCell>
                                <TableCell
                                  className={`text-right font-mono font-bold text-sm ${
                                    trx.tipe === 'MASUK'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {trx.tipe === 'MASUK' ? '+' : '-'} Rp {trx.nominal.toLocaleString('id-ID')}
                                </TableCell>
                                <TableCell className='text-center'>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant='ghost' size='sm' className='h-7 w-7 p-0'>
                                        <MoreHorizontal className='size-4' />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end' className='w-44 text-xs'>
                                      <DropdownMenuLabel className='text-[10px] text-muted-foreground font-mono'>
                                        Opsi Transaksi
                                      </DropdownMenuLabel>
                                      {isDeleted ? (
                                        <>
                                          <DropdownMenuItem onClick={() => setRestoreTrxTarget(trx)} className='gap-2 text-xs'>
                                            <RotateCcw className='size-3.5 text-emerald-600' /> Pulihkan Transaksi
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => setHardDeleteTrxTarget(trx)}
                                            className='gap-2 text-xs text-rose-600'
                                          >
                                            <Trash2 className='size-3.5' /> Hapus Permanen
                                          </DropdownMenuItem>
                                        </>
                                      ) : isClosed ? (
                                         <DropdownMenuItem disabled className='text-xs text-muted-foreground'>
                                           <Lock className='size-3.5 me-2' /> Periode Terkunci
                                         </DropdownMenuItem>
                                       ) : (
                                         <>
                                           <DropdownMenuItem
                                             onClick={() => handleOpenEditTrx(trx)}
                                             className='gap-2 text-xs font-medium cursor-pointer text-blue-600 focus:text-blue-700'
                                           >
                                             <Edit className='size-3.5' /> Edit Transaksi
                                           </DropdownMenuItem>
                                           <DropdownMenuSeparator />
                                           <DropdownMenuItem
                                             onClick={() => setDeleteTrxTarget(trx)}
                                             className='gap-2 text-xs text-rose-600 focus:text-rose-700 cursor-pointer'
                                           >
                                             <Trash2 className='size-3.5' /> Hapus Transaksi
                                           </DropdownMenuItem>
                                         </>
                                       )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                      <TablePagination
                        currentPage={trxPage}
                        totalPages={totalTrxPages}
                        pageSize={trxPageSize}
                        totalItems={filteredTransaksi.length}
                        onPageChange={setTrxPage}
                        onPageSizeChange={setTrxPageSize}
                        pageSizeOptions={[10, 15, 25, 50, 100]}
                        itemLabel='transaksi kas'
                      />
                    </div>
                  )
                })()
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── MODAL: Buat Periode Pembukuan Baru (Level 2) ──────────── */}
      <Dialog open={createPeriodOpen} onOpenChange={setCreatePeriodOpen}>
        <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Plus className='size-4 text-primary' /> Buat Periode Pembukuan Baru
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Buka buku kas bulanan baru untuk <strong>{displayScopeName}</strong>. Tentukan sumber saldo awal di bawah ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePeriodSubmit} className='space-y-4 pt-2'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Bulan Pembukuan *</Label>
                <Select value={String(newPeriodBulan)} onValueChange={(val) => setNewPeriodBulan(Number(val))}>
                  <SelectTrigger className='text-xs h-9 font-bold'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)} className='text-xs'>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Tahun Pembukuan *</Label>
                <Input
                  type='number'
                  min={2020}
                  max={2050}
                  value={newPeriodTahun}
                  onChange={(e) => setNewPeriodTahun(Number(e.target.value))}
                  className='text-xs h-9 font-mono font-bold'
                  required
                />
              </div>
            </div>

            {/* 2-Option Saldo Awal Source Selector */}
            <div className='space-y-2.5'>
              <Label className='text-xs font-bold text-foreground block'>
                Pilihan Sumber Saldo Awal Kas:
              </Label>

              {/* Card Opsi 1: Lanjutkan dari Periode Sebelumnya */}
              <div
                onClick={() => setSaldoAwalMode('CARRY_OVER')}
                className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  saldoAwalMode === 'CARRY_OVER'
                    ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='space-y-0.5 min-w-0'>
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <div
                        className={`size-4 rounded-full border flex items-center justify-center shrink-0 ${
                          saldoAwalMode === 'CARRY_OVER' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground'
                        }`}
                      >
                        {saldoAwalMode === 'CARRY_OVER' && <div className='size-1.5 rounded-full bg-white' />}
                      </div>
                      <span className='text-xs font-bold text-foreground'>
                        Lanjutkan dari Periode Sebelumnya
                      </span>
                      <Badge className='bg-emerald-600 text-white text-[9px] py-0 px-1.5 shrink-0'>Rekomendasi</Badge>
                    </div>
                    <p className='text-[11px] text-muted-foreground pl-5.5 leading-relaxed'>
                      Otomatis meneruskan sisa kas akhir bulan sebelumnya agar mutasi kas bersambung akurat.
                    </p>
                  </div>
                </div>

                <div className='pl-5.5 space-y-2'>
                  <div className='p-2 bg-background/80 rounded-lg border text-xs flex flex-col xs:flex-row xs:items-center justify-between gap-1'>
                    <span className='text-muted-foreground text-[11px] leading-tight'>
                      {isCheckingPrior ? (
                        <span className='flex items-center gap-1.5'>
                          <Loader2 className='size-3 animate-spin text-primary' /> Memeriksa riwayat saldo...
                        </span>
                      ) : priorBalanceData?.hasPrior ? (
                        `Sisa Kas (${MONTH_NAMES[priorBalanceData.priorPeriod!.bulan - 1]} ${priorBalanceData.priorPeriod!.tahun}):`
                      ) : (
                        'Belum ada periode sebelumnya (Kas Awal):'
                      )}
                    </span>
                    <span className='font-mono font-bold text-foreground shrink-0 whitespace-nowrap'>
                      Rp {(priorBalanceData?.hasPrior ? priorBalanceData.priorPeriod!.saldoAkhir : 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {saldoAwalMode === 'CARRY_OVER' && (
                    <div className='space-y-2 pt-1 border-t border-dashed'>
                      <div className='flex items-center justify-between'>
                        <label
                          htmlFor='toggle-adj'
                          className='text-[11px] font-semibold text-muted-foreground cursor-pointer flex items-center gap-1.5'
                        >
                          <input
                            type='checkbox'
                            id='toggle-adj'
                            checked={enableAdjustment}
                            onChange={(e) => setEnableAdjustment(e.target.checked)}
                            className='rounded text-primary focus:ring-0 cursor-pointer'
                          />
                          Tambah Penyesuaian Saldo Kas Fisik (Opsional)
                        </label>
                      </div>

                      {enableAdjustment && (
                        <div className='space-y-1 animate-in fade-in-50'>
                          <Input
                            placeholder='Contoh: 500.000'
                            value={penyesuaianManual}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9-]/g, '')
                              setPenyesuaianManual(val ? Number(val).toLocaleString('id-ID') : '')
                            }}
                            className='text-xs h-8 font-mono font-bold bg-background'
                          />
                          <p className='text-[10px] text-muted-foreground'>
                            Isi jika ada sisa uang kas fisik tambahan atau rekonsiliasi yang belum tercatat.
                          </p>
                        </div>
                      )}

                      <div className='p-2 bg-emerald-600/10 rounded-lg border border-emerald-500/20 text-xs flex flex-col xs:flex-row xs:items-center justify-between gap-1'>
                        <span className='text-[11px] font-semibold text-emerald-800 dark:text-emerald-300'>
                          Total Saldo Awal:
                        </span>
                        <span className='font-mono font-black text-emerald-700 dark:text-emerald-400 shrink-0 whitespace-nowrap'>
                          Rp {(
                            (priorBalanceData?.hasPrior ? priorBalanceData.priorPeriod!.saldoAkhir : 0) +
                            (enableAdjustment && penyesuaianManual ? Number(penyesuaianManual.replace(/[^0-9-]/g, '')) : 0)
                          ).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Opsi 2: Atur Saldo Awal Baru Secara Manual */}
              <div
                onClick={() => setSaldoAwalMode('MANUAL')}
                className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  saldoAwalMode === 'MANUAL'
                    ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='space-y-0.5 min-w-0'>
                    <div className='flex items-center gap-1.5'>
                      <div
                        className={`size-4 rounded-full border flex items-center justify-center shrink-0 ${
                          saldoAwalMode === 'MANUAL' ? 'border-blue-600 bg-blue-600 text-white' : 'border-muted-foreground'
                        }`}
                      >
                        {saldoAwalMode === 'MANUAL' && <div className='size-1.5 rounded-full bg-white' />}
                      </div>
                      <span className='text-xs font-bold text-foreground'>
                        Atur Saldo Awal Baru (Manual / Reset)
                      </span>
                    </div>
                    <p className='text-[11px] text-muted-foreground pl-5.5 leading-relaxed'>
                      Gunakan opsi ini jika memulai pembukuan baru dari nol atau menetapkan modal kas awal khusus.
                    </p>
                  </div>
                </div>

                {saldoAwalMode === 'MANUAL' && (
                  <div className='pl-5.5 space-y-1.5 pt-1 animate-in fade-in-50'>
                    <Label className='text-xs font-semibold'>Nominal Saldo Awal (Rp) *</Label>
                    <Input
                      placeholder='Contoh: 10.000.000'
                      value={saldoAwalCustom}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        setSaldoAwalCustom(val ? Number(val).toLocaleString('id-ID') : '')
                      }}
                      className='text-xs h-8 font-mono font-bold bg-background'
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className='pt-3 gap-2 flex-col-reverse sm:flex-row sm:justify-end'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setCreatePeriodOpen(false)}
                disabled={isCreatingPeriod}
                className='text-xs h-9 sm:h-8 w-full sm:w-auto'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isCreatingPeriod}
                className='text-xs h-9 sm:h-8 font-semibold bg-primary text-primary-foreground gap-1.5 shadow-xs w-full sm:w-auto'
              >
                {isCreatingPeriod ? <Loader2 className='size-3.5 animate-spin' /> : <Plus className='size-3.5' />}
                {isCreatingPeriod ? 'Membuka Periode...' : 'Buka Periode Baru'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Catat Transaksi Baru (Level 3) ────────────────── */}
      <Dialog open={trxOpen} onOpenChange={setTrxOpen}>
        <DialogContent className='sm:max-w-md'>
          <form onSubmit={handleCreateTrxSubmit}>
            <DialogHeader>
              <DialogTitle className='text-base font-bold flex items-center gap-2'>
                <Plus className='size-4 text-primary' /> Catat Transaksi Kas Baru
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Pencatatan kas masuk atau keluar pada periode {activeLaporan ? `${MONTH_NAMES[activeLaporan.bulan - 1]} ${activeLaporan.tahun}` : ''}.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3.5 py-3 text-xs'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Tipe Transaksi *</Label>
                  <Select value={tipe} onValueChange={(val) => setTipe(val as TipeTransaksi)}>
                    <SelectTrigger className='text-xs h-9'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='MASUK' className='text-xs text-emerald-600 font-bold'>
                        Kas Masuk (+)
                      </SelectItem>
                      <SelectItem value='KELUAR' className='text-xs text-rose-600 font-bold'>
                        Kas Keluar (-)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Metode Pembayaran *</Label>
                  <Select value={metodePembayaran} onValueChange={(val) => setMetodePembayaran(val as MetodePembayaran)}>
                    <SelectTrigger className='text-xs h-9'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='CASH' className='text-xs'>Tunai (CASH)</SelectItem>
                      <SelectItem value='TRANSFER' className='text-xs'>Transfer Bank</SelectItem>
                      <SelectItem value='QRIS' className='text-xs'>QRIS / E-Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Kategori Transaksi *</Label>
                <Input
                  placeholder={tipe === 'MASUK' ? 'Contoh: Persembahan Kolekte Ibadah Raya' : 'Contoh: Bantuan Diakonia'}
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Nominal (Rp) *</Label>
                  <Input
                    placeholder='Contoh: 1.500.000'
                    value={nominal}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      setNominal(val ? Number(val).toLocaleString('id-ID') : '')
                    }}
                    className='text-xs h-9 font-mono font-bold'
                    required
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Tanggal Transaksi *</Label>
                  <Input
                    type='date'
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className='text-xs h-9'
                    required
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Catatan / Keterangan (Opsional)</Label>
                <Textarea
                  placeholder='Keterangan nota, kuitansi manual, atau nomor rekening...'
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className='text-xs resize-none'
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className='pt-3 gap-2 flex-col-reverse sm:flex-row sm:justify-end'>
              <Button variant='outline' type='button' size='sm' onClick={() => setTrxOpen(false)} disabled={isSavingTrx} className='text-xs h-9 sm:h-8 w-full sm:w-auto'>
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={isSavingTrx} className='text-xs h-9 sm:h-8 font-semibold bg-primary text-primary-foreground gap-1.5 w-full sm:w-auto'>
                {isSavingTrx ? <Loader2 className='size-3.5 animate-spin' /> : <Plus className='size-3.5' />}
                {isSavingTrx ? 'Menyimpan...' : 'Simpan Transaksi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Edit Transaksi (Level 3) ──────────────────────── */}
      <Dialog open={!!editTrxTarget} onOpenChange={(open) => !open && setEditTrxTarget(null)}>
        <DialogContent className='sm:max-w-md max-h-[90vh] overflow-y-auto'>
          <form onSubmit={handleUpdateTrxSubmit}>
            <DialogHeader>
              <DialogTitle className='text-base font-bold flex items-center gap-2'>
                <Edit className='size-4 text-primary' /> Edit Transaksi Kas
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Ubah rincian transaksi <strong className='font-mono text-foreground'>{editTrxTarget?.nomorReferensi}</strong> pada periode {activeLaporan ? `${MONTH_NAMES[activeLaporan.bulan - 1]} ${activeLaporan.tahun}` : ''}.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3.5 py-3 text-xs'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Tipe Transaksi *</Label>
                  <Select value={editTipe} onValueChange={(val) => setEditTipe(val as TipeTransaksi)}>
                    <SelectTrigger className='text-xs h-9 font-semibold'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='MASUK' className='text-xs text-emerald-600 font-bold'>
                        Kas Masuk (+)
                      </SelectItem>
                      <SelectItem value='KELUAR' className='text-xs text-rose-600 font-bold'>
                        Kas Keluar (-)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Metode Pembayaran *</Label>
                  <Select value={editMetodePembayaran} onValueChange={(val) => setEditMetodePembayaran(val as MetodePembayaran)}>
                    <SelectTrigger className='text-xs h-9'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='CASH' className='text-xs'>Tunai (CASH)</SelectItem>
                      <SelectItem value='TRANSFER' className='text-xs'>Transfer Bank</SelectItem>
                      <SelectItem value='QRIS' className='text-xs'>QRIS / E-Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Kategori Transaksi *</Label>
                <Input
                  placeholder='Kategori transaksi...'
                  value={editKategori}
                  onChange={(e) => setEditKategori(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Nominal (Rp) *</Label>
                  <Input
                    placeholder='Contoh: 1.500.000'
                    value={editNominal}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      setEditNominal(val ? Number(val).toLocaleString('id-ID') : '')
                    }}
                    className='text-xs h-9 font-mono font-bold'
                    required
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Tanggal Transaksi *</Label>
                  <Input
                    type='date'
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    className='text-xs h-9'
                    required
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Catatan / Keterangan (Opsional)</Label>
                <Textarea
                  placeholder='Keterangan nota, kuitansi manual, atau nomor rekening...'
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  className='text-xs resize-none'
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className='pt-3 gap-2 flex-col-reverse sm:flex-row sm:justify-end'>
              <Button variant='outline' type='button' size='sm' onClick={() => setEditTrxTarget(null)} disabled={isUpdatingTrx} className='text-xs h-9 sm:h-8 w-full sm:w-auto'>
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={isUpdatingTrx} className='text-xs h-9 sm:h-8 font-semibold bg-primary text-primary-foreground gap-1.5 w-full sm:w-auto'>
                {isUpdatingTrx ? <Loader2 className='size-3.5 animate-spin' /> : <Edit className='size-3.5' />}
                {isUpdatingTrx ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Konfirmasi Tutup Periode (Finalize) ───────────── */}
      <AlertDialog open={closeAlertOpen} onOpenChange={setCloseAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-amber-600 flex items-center gap-2'>
              <Lock className='size-5' /> Tutup Periode Keuangan?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground leading-relaxed'>
                <p>
                  Setelah periode ditutup, seluruh transaksi pada periode ini akan menjadi <strong>Read-Only</strong> dan terkunci.
                </p>
                <p>
                  Pastikan seluruh mutasi telah diperiksa dan disesuaikan dengan rekening koran/fisik kas.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing} className='text-xs'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5'
              onClick={handleFinalizePeriod}
              disabled={isClosing}
            >
              {isClosing ? <Loader2 className='size-3.5 animate-spin' /> : <Lock className='size-3.5' />}
              {isClosing ? 'Menutup Periode...' : 'Ya, Tutup Periode'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL: Buka Kembali Periode (Reopen) ────────────────── */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <form onSubmit={handleReopenPeriod}>
            <DialogHeader>
              <DialogTitle className='text-base font-bold flex items-center gap-2 text-primary'>
                <Unlock className='size-4' /> Buka Kembali Periode Keuangan
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Periode ini sebelumnya telah ditutup. Pembukaan kembali dicatat dalam <strong>Audit Trail SHA-256</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Alasan Pembukaan Kembali (Wajib, min. 10 karakter) *</Label>
                <Textarea
                  placeholder='Contoh: Revisi pencatatan persembahan khusus yang belum dimasukkan...'
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className='text-xs min-h-20'
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' size='sm' onClick={() => setReopenDialogOpen(false)} disabled={isReopening} className='text-xs'>
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isReopening || reopenReason.trim().length < 10}
                className='text-xs font-semibold bg-primary text-primary-foreground gap-1.5'
              >
                {isReopening ? <Loader2 className='size-3.5 animate-spin' /> : <Unlock className='size-3.5' />}
                {isReopening ? 'Membuka...' : 'Buka Kembali Periode'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Soft Delete Transaksi ────────────────────────── */}
      <AlertDialog open={!!deleteTrxTarget} onOpenChange={() => { setDeleteTrxTarget(null); setDeletionReason('') }}>
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-rose-600'>
              Hapus Transaksi Kas?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground'>
                <p>
                  Transaksi <strong className='text-foreground'>{deleteTrxTarget?.nomorReferensi}</strong> ({deleteTrxTarget?.kategori} - Rp {deleteTrxTarget?.nominal.toLocaleString('id-ID')}) akan dinonaktifkan.
                </p>
                <p>
                  Saldo kas periode ini akan dikalkulasi ulang secara otomatis.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <Label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan (Wajib):</Label>
            <Textarea
              placeholder='Masukkan alasan penghapusan transaksi...'
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className='text-xs'
              rows={2}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTrx} className='text-xs'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold gap-1.5'
              onClick={handleDeleteTrxConfirm}
              disabled={isDeletingTrx || !deletionReason.trim()}
            >
              {isDeletingTrx ? <Loader2 className='size-3.5 animate-spin' /> : <Trash2 className='size-3.5' />}
              Konfirmasi Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL: Restore Transaksi ───────────────────────────── */}
      <AlertDialog open={!!restoreTrxTarget} onOpenChange={() => setRestoreTrxTarget(null)}>
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-emerald-600 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Transaksi?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground'>
                <p>
                  Transaksi <strong className='text-foreground'>{restoreTrxTarget?.nomorReferensi}</strong> ({restoreTrxTarget?.kategori} - Rp {restoreTrxTarget?.nominal.toLocaleString('id-ID')}) akan dipulihkan kembali.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoringTrx} className='text-xs'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5'
              onClick={handleRestoreTrxConfirm}
              disabled={isRestoringTrx}
            >
              {isRestoringTrx ? <Loader2 className='size-3.5 animate-spin' /> : <RotateCcw className='size-3.5' />}
              Ya, Pulihkan Transaksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL: Hard Delete Transaksi ───────────────────────── */}
      <AlertDialog open={!!hardDeleteTrxTarget} onOpenChange={() => setHardDeleteTrxTarget(null)}>
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5' /> Hapus Permanen Transaksi?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground'>
                <div className='p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs'>
                  ⚠️ Transaksi <strong className='text-foreground'>{hardDeleteTrxTarget?.nomorReferensi}</strong> akan dihapus secara permanen dari database.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isHardDeletingTrx} className='text-xs'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold gap-1.5'
              onClick={handleHardDeleteTrxConfirm}
              disabled={isHardDeletingTrx}
            >
              {isHardDeletingTrx ? <Loader2 className='size-3.5 animate-spin' /> : <Trash2 className='size-3.5' />}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ── MODAL: Edit Periode Pembukuan ─────────────────────── */}
      <Dialog open={!!editPeriodTarget} onOpenChange={() => setEditPeriodTarget(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Edit className='size-4 text-primary' /> Edit Periode Pembukuan
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Ubah bulan, tahun, atau saldo awal periode pembukuan ({displayScopeName}).
            </DialogDescription>
          </DialogHeader>

          {editPeriodTarget && (
            <form onSubmit={handleUpdatePeriodSubmit} className='space-y-4 pt-2'>
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Bulan Pembukuan *</Label>
                  <Select value={String(editPeriodBulan)} onValueChange={(val) => setEditPeriodBulan(Number(val))}>
                    <SelectTrigger className='text-xs h-9 font-bold'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)} className='text-xs'>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Tahun Pembukuan *</Label>
                  <Input
                    type='number'
                    min={2020}
                    max={2050}
                    value={editPeriodTahun}
                    onChange={(e) => setEditPeriodTahun(Number(e.target.value))}
                    className='text-xs h-9 font-mono font-bold'
                    required
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Saldo Awal Periode (Rp) *</Label>
                <Input
                  value={editPeriodSaldoAwal}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '')
                    setEditPeriodSaldoAwal(val ? Number(val).toLocaleString('id-ID') : '')
                  }}
                  className='text-xs h-9 font-mono font-bold'
                  required
                />
              </div>

              <div className='p-2.5 bg-muted/40 rounded-xl border text-xs space-y-1'>
                <div className='flex justify-between text-[11px] text-muted-foreground'>
                  <span>Pemasukan: +Rp {editPeriodTarget.totalPemasukan.toLocaleString('id-ID')}</span>
                  <span>Pengeluaran: -Rp {editPeriodTarget.totalPengeluaran.toLocaleString('id-ID')}</span>
                </div>
                <div className='flex justify-between font-bold text-foreground pt-1 border-t'>
                  <span>Estimasi Saldo Akhir:</span>
                  <span className='font-mono text-primary'>
                    Rp {(
                      (Number(editPeriodSaldoAwal.replace(/[^0-9]/g, '')) || 0) +
                      editPeriodTarget.totalPemasukan -
                      editPeriodTarget.totalPengeluaran
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <DialogFooter className='pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setEditPeriodTarget(null)}
                  disabled={isUpdatingPeriod}
                  className='text-xs'
                >
                  Batal
                </Button>
                <Button
                  type='submit'
                  size='sm'
                  disabled={isUpdatingPeriod}
                  className='text-xs font-semibold bg-primary text-primary-foreground gap-1.5'
                >
                  {isUpdatingPeriod ? <Loader2 className='size-3.5 animate-spin' /> : null}
                  {isUpdatingPeriod ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Soft Delete Periode ─────────────────────────── */}
      <AlertDialog open={!!deletePeriodTarget} onOpenChange={() => { setDeletePeriodTarget(null); setDeletePeriodReason('') }}>
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Hapus Periode Pembukuan?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground leading-relaxed'>
                <p>
                  Periode <strong>{deletePeriodTarget ? `${MONTH_NAMES[deletePeriodTarget.bulan - 1]} ${deletePeriodTarget.tahun}` : ''}</strong> ({displayScopeName}) akan dipindahkan ke kotak sampah.
                </p>
                <p>
                  Periode yang berada di kotak sampah dapat dipulihkan kembali kapan saja.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <Label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan (Wajib):</Label>
            <Textarea
              placeholder='Contoh: Kesalahan pembuatan periode atau duplikasi...'
              value={deletePeriodReason}
              onChange={(e) => setDeletePeriodReason(e.target.value)}
              className='text-xs'
              rows={2}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPeriod} className='text-xs'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold gap-1.5'
              onClick={handleDeletePeriodConfirm}
              disabled={isDeletingPeriod || !deletePeriodReason.trim()}
            >
              {isDeletingPeriod ? <Loader2 className='size-3.5 animate-spin' /> : <Trash2 className='size-3.5' />}
              Hapus ke Kotak Sampah
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL: Restore Periode ─────────────────────────────── */}
      <AlertDialog open={!!restorePeriodTarget} onOpenChange={() => setRestorePeriodTarget(null)}>
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-emerald-600 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Periode Pembukuan?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground'>
                <p>
                  Periode <strong>{restorePeriodTarget ? `${MONTH_NAMES[restorePeriodTarget.bulan - 1]} ${restorePeriodTarget.tahun}` : ''}</strong> akan dipulihkan kembali ke daftar buku aktif.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoringPeriod} className='text-xs'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5'
              onClick={handleRestorePeriodConfirm}
              disabled={isRestoringPeriod}
            >
              {isRestoringPeriod ? <Loader2 className='size-3.5 animate-spin' /> : <RotateCcw className='size-3.5' />}
              Ya, Pulihkan Periode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL: Hard Delete Periode (Permanen) ───────────────── */}
      <AlertDialog open={!!hardDeletePeriodTarget} onOpenChange={() => setHardDeletePeriodTarget(null)}>
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5' /> Hapus Permanen Periode?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs leading-relaxed'>
                  ⚠️ <strong>PERINGATAN</strong>: Seluruh data buku kas periode <strong>{hardDeletePeriodTarget ? `${MONTH_NAMES[hardDeletePeriodTarget.bulan - 1]} ${hardDeletePeriodTarget.tahun}` : ''}</strong> beserta <strong>seluruh transaksi mutasi di dalamnya</strong> akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan!
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isHardDeletingPeriod} className='text-xs'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold gap-1.5'
              onClick={handleHardDeletePeriodConfirm}
              disabled={isHardDeletingPeriod}
            >
              {isHardDeletingPeriod ? <Loader2 className='size-3.5 animate-spin' /> : <Trash2 className='size-3.5' />}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ── MODAL: Cetak Buku Bundel LPJ Kas (Multi-Page A4) ─────── */}
      <Dialog open={bookPrintModalOpen} onOpenChange={setBookPrintModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <BookOpen className='size-4 text-primary' /> Cetak Buku Bundel LPJ Kas (A4)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Mencetak seluruh periode pembukuan untuk <strong>{displayScopeName}</strong> dalam format buku LPJ resmi multi-halaman.
            </DialogDescription>
          </DialogHeader>

          {bookPrintData && (
            <div className='space-y-4 py-2 text-xs'>
              <div className='p-3 bg-muted/40 rounded-xl border space-y-2'>
                <div className='flex justify-between font-bold text-foreground'>
                  <span>Pos Kas:</span>
                  <span>{bookPrintData.scope.name}</span>
                </div>
                <div className='flex justify-between text-muted-foreground'>
                  <span>Total Periode Pembukuan:</span>
                  <span className='font-mono font-semibold text-foreground'>{bookPrintData.summary.totalPeriods} Bulan</span>
                </div>
                <div className='flex justify-between text-muted-foreground'>
                  <span>Total Mutasi Transaksi:</span>
                  <span className='font-mono font-semibold text-foreground'>{bookPrintData.periods.reduce((acc, p) => acc + p.transaksiPemasukan.length + p.transaksiPengeluaran.length, 0)} Item</span>
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Filter Tahun Pembukuan:</Label>
                <Select value={selectedBookYear} onValueChange={setSelectedBookYear}>
                  <SelectTrigger className='text-xs h-9 font-bold'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ALL' className='text-xs'>
                      Seluruh Tahun ({bookPrintData.summary.totalPeriods} Periode)
                    </SelectItem>
                    {bookPrintData.summary.tahunList.map((th) => (
                      <SelectItem key={th} value={String(th)} className='text-xs font-mono font-bold'>
                        Tahun {th} ({bookPrintData.periods.filter((p) => p.tahun === th).length} Periode)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-500/20 text-[11px] text-muted-foreground leading-relaxed'>
                📄 <strong>Struktur Buku</strong>: Halaman 1 (Cover Eksekutif & 4 KPI), Halaman 2 (Matriks Ringkasan Tahunan & 3 Tanda Tangan), Halaman 3+ (Lembar Mutasi Transaksi Bulanan Terpisah Masuk & Keluar).
              </div>
            </div>
          )}

          <DialogFooter className='pt-2'>
            <Button variant='outline' size='sm' onClick={() => setBookPrintModalOpen(false)} disabled={isGeneratingBookPrint} className='text-xs'>
              Batal
            </Button>
            <Button
              size='sm'
              onClick={() => handleExecuteBookPrint(selectedBookYear)}
              disabled={isGeneratingBookPrint || !bookPrintData || bookPrintData.periods.length === 0}
              className='text-xs font-semibold bg-primary text-primary-foreground gap-1.5 shadow-xs'
            >
              {isGeneratingBookPrint ? <Loader2 className='size-3.5 animate-spin' /> : <Printer className='size-3.5' />}
              {isGeneratingBookPrint ? 'Menyusun Dokumen...' : 'Buka Preview & Cetak A4'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Bulk Reopen Periods ───────────────────────────── */}
      <Dialog open={bulkReopenModalOpen} onOpenChange={setBulkReopenModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <form onSubmit={handleBulkReopenSubmit}>
            <DialogHeader>
              <DialogTitle className='text-base font-bold flex items-center gap-2 text-primary'>
                <Unlock className='size-4' /> Buka Kembali {selectedPeriodIds.length} Periode Keuangan
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Membuka kembali status laporan keuangan yang terkunci menjadi <strong>Draft</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className='py-3 space-y-2'>
              <Label className='text-xs font-semibold'>Alasan Pembukaan Kembali (Wajib):</Label>
              <Textarea
                placeholder='Masukkan alasan pembukaan kembali buku kas...'
                value={bulkReopenReason}
                onChange={(e) => setBulkReopenReason(e.target.value)}
                className='text-xs'
                rows={3}
                required
              />
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' size='sm' onClick={() => setBulkReopenModalOpen(false)} disabled={isBulkProcessing} className='text-xs'>
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isBulkProcessing || !bulkReopenReason.trim()}
                className='text-xs font-semibold bg-primary text-primary-foreground gap-1.5'
              >
                {isBulkProcessing ? <Loader2 className='size-3.5 animate-spin' /> : <Unlock className='size-3.5' />}
                Konfirmasi Buka Buku
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Bulk Soft Delete Periods ──────────────────────── */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Hapus {selectedPeriodIds.length} Periode Terpilih?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground'>
                <p>
                  Seluruh periode yang dipilih beserta transaksi di dalamnya akan dipindahkan ke kotak sampah.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <Label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan Massal (Wajib):</Label>
            <Textarea
              placeholder='Masukkan alasan penghapusan massal...'
              value={bulkDeleteReason}
              onChange={(e) => setBulkDeleteReason(e.target.value)}
              className='text-xs'
              rows={2}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing} className='text-xs'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold gap-1.5'
              onClick={handleBulkSoftDeleteSubmit}
              disabled={isBulkProcessing || !bulkDeleteReason.trim()}
            >
              {isBulkProcessing ? <Loader2 className='size-3.5 animate-spin' /> : <Trash2 className='size-3.5' />}
              Hapus ke Kotak Sampah
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ScopeKasDetailPage() {
  return (
    <Suspense
      fallback={
        <div className='flex h-96 items-center justify-center'>
          <Loader2 className='size-8 animate-spin text-primary' />
        </div>
      }
    >
      <ScopeKasDetailContent />
    </Suspense>
  )
}
