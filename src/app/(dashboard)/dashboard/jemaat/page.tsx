'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
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
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  Check,
  FilterX,
  Users,
  UserCheck,
  UserX,
  Loader2,
  LayoutGrid,
  Table2,
  Search,
  Phone,
  Calendar,
  Printer,
  Download,
  X,
  QrCode,
  CheckCircle2,
  UserMinus,
  ArrowRightLeft,
  Sparkles,
  Layers,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination as SwiperPagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import {
  getJemaatListAction,
  deleteJemaatAction,
  restoreJemaatAction,
  hardDeleteJemaatAction,
  bulkUpdateJemaatStatusAction,
  bulkAssignJemaatGroupAction,
  bulkSoftDeleteJemaatAction,
  getJemaatForPrintCardsAction,
  getJemaatFormOptionsAction,
} from '@/actions/jemaat'
import { getWhatsAppTemplatesAction } from '@/actions/whatsapp-template'
import {
  DEFAULT_WHATSAPP_TEMPLATES_CONFIG,
  WhatsAppTemplatesConfig,
} from '@/lib/validations/whatsapp-template'
import { formatWhatsAppMessage } from '@/lib/whatsapp-helpers'
import { getAppProfileAction } from '@/actions/app-profile'
import { toast } from 'sonner'
import { getEffectivePrintConfig } from '@/lib/print-helpers'
import { getKtaThemeColors } from '@/lib/validations/print-layout'
import QRCode from 'qrcode'

export default function JemaatListPage() {
  const [loading, setLoading] = useState(true)
  const [jemaatList, setJemaatList] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    totalJemaat: 0,
    active: 0,
    inactive: 0,
    male: 0,
    female: 0,
  })

  // Dynamic WhatsApp Templates from Settings
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplatesConfig>(DEFAULT_WHATSAPP_TEMPLATES_CONFIG)
  const [churchName, setChurchName] = useState('Gereja')

  // Dropdown Form Options
  const [formOptions, setFormOptions] = useState<{
    kategorial: { id: string; nama: string }[]
    komsel: { id: string; nama: string }[]
  }>({ kategorial: [], komsel: [] })

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [genderFilter, setGenderFilter] = useState<string | undefined>(undefined)
  const [kategorialFilter, setKategorialFilter] = useState<string | undefined>(undefined)
  const [komselFilter, setKomselFilter] = useState<string | undefined>(undefined)
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Active Print Layout Config for Card Previews
  const [activePrintConfig, setActivePrintConfig] = useState<any>(null)

  useEffect(() => {
    getEffectivePrintConfig().then((cfg) => setActivePrintConfig(cfg))
  }, [])

  // WhatsApp Helpers connected to WhatsApp Templates Settings
  const formatWhatsAppUrl = (phone?: string | null, message?: string) => {
    if (!phone) return '#'
    let clean = phone.replace(/[^0-9]/g, '')
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1)
    } else if (clean.startsWith('8')) {
      clean = '62' + clean
    }
    const encodedMsg = message ? encodeURIComponent(message) : ''
    return `https://wa.me/${clean}${encodedMsg ? `?text=${encodedMsg}` : ''}`
  }

  const getWhatsAppTemplate = (jemaat: any) => {
    const template = waTemplates.SAPAAN_JEMAAT || DEFAULT_WHATSAPP_TEMPLATES_CONFIG.SAPAAN_JEMAAT || ''
    return formatWhatsAppMessage(template, {
      nama: jemaat.nama || 'Bapak/Ibu/Saudara/i',
      nij: jmtNij(jemaat),
      kategorial: jemaat.kategorial?.nama || '-',
      komsel: jemaat.komsel?.nama || '-',
      namaGereja: churchName,
    })
  }

  const jmtNij = (j: any) => j.nij || '-'

  // Delete & Restore States
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [hardDeleteTarget, setHardDeleteTarget] = useState<any | null>(null)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [isHardDeleting, setIsHardDeleting] = useState(false)

  // Bulk Actions Dialog States
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false)
  const [bulkStatusValue, setBulkStatusValue] = useState<'ACTIVE' | 'INACTIVE' | 'MOVED' | 'DECEASED' | 'SUSPENDED'>('ACTIVE')
  const [bulkStatusReason, setBulkStatusReason] = useState('')
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false)

  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false)
  const [bulkKategorialValue, setBulkKategorialValue] = useState<string>('KEEP')
  const [bulkKomselValue, setBulkKomselValue] = useState<string>('KEEP')
  const [isBulkAssigning, setIsBulkAssigning] = useState(false)

  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState('')
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const [printCardsModalOpen, setPrintCardsModalOpen] = useState(false)
  const [printCardsData, setPrintCardsData] = useState<any[]>([])
  const [isLoadingPrintCards, setIsLoadingPrintCards] = useState(false)

  // Column Visibility States
  const [visibleColumns, setVisibleColumns] = useState({
    nij: true,
    nama: true,
    kontak: true,
    kategorial: true,
    status: true,
    kelengkapan: true,
  })

  // Pagination states
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  // View Mode: Table vs Card
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  // Sorting state
  const [sortField, setSortField] = useState<'nama' | 'nij' | 'statusJemaat' | null>('nama')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Load Form Options & Dynamic WhatsApp Templates from Settings
  useEffect(() => {
    getJemaatFormOptionsAction().then((res) => {
      if (res.success && res.data) {
        setFormOptions({
          kategorial: res.data.kategorial || [],
          komsel: res.data.komsel || [],
        })
      }
    })
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

  // Fetch Data Function from PostgreSQL
  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getJemaatListAction({
      search: searchTerm,
      statusJemaat: statusFilter as any,
      jenisKelamin: genderFilter as any,
      kategorialId: kategorialFilter,
      komselId: komselFilter,
      statusHapus: statusHapusFilter,
      page: pageIndex + 1,
      pageSize,
    })

    if (res.success && res.data) {
      setJemaatList(res.data.items)
      setTotalCount(res.data.total)
      setStats(res.data.stats)
    } else {
      toast.error(res.error || 'Gagal memuat data jemaat.')
    }
    setLoading(false)
  }, [searchTerm, statusFilter, genderFilter, kategorialFilter, komselFilter, statusHapusFilter, pageIndex, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Client-side Sorting
  const sortedJemaatList = React.useMemo(() => {
    if (!sortField) return jemaatList
    return [...jemaatList].sort((a, b) => {
      let aVal = a[sortField] || ''
      let bVal = b[sortField] || ''
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [jemaatList, sortField, sortOrder])

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id])
  const selectedCount = selectedIds.length

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    sortedJemaatList.forEach((item) => {
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
      ? jemaatList.filter((j) => selectedRows[j.id])
      : jemaatList

    if (targets.length === 0) {
      toast.error('Tidak ada data jemaat untuk diekspor.')
      return
    }

    const headers = [
      'NIJ',
      'Nama Lengkap',
      'Nama Panggilan',
      'NIK',
      'Jenis Kelamin',
      'No. HP',
      'WhatsApp',
      'Email',
      'Kategorial',
      'Komsel',
      'Status Keanggotaan',
      'Status Baptis',
      'Status Pernikahan',
      'Pendidikan',
      'Pekerjaan',
      'Alamat',
      'Kota',
    ]

    const rows = targets.map((j) => [
      `"${j.nij || ''}"`,
      `"${(j.nama || '').replace(/"/g, '""')}"`,
      `"${(j.namaPanggilan || '').replace(/"/g, '""')}"`,
      `"${j.nik || ''}"`,
      `"${j.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}"`,
      `"${j.noHp || ''}"`,
      `"${j.whatsApp || ''}"`,
      `"${j.email || ''}"`,
      `"${j.kategorial?.nama || '-'}"`,
      `"${j.komsel?.nama || '-'}"`,
      `"${j.statusJemaat || ''}"`,
      `"${j.statusBaptis || ''}"`,
      `"${j.statusPernikahan || ''}"`,
      `"${j.pendidikan || ''}"`,
      `"${(j.pekerjaan || '').replace(/"/g, '""')}"`,
      `"${(j.alamat || '').replace(/"/g, '""')}"`,
      `"${j.kota || 'Padang'}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    const cleanChurch = (churchName || 'Gereja').replace(/[^a-zA-Z0-9]/g, '_')
    link.setAttribute('download', `Data_Jemaat_${cleanChurch}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${targets.length} data jemaat ke CSV.`)
  }

  // 3. Print Cards Handler
  const handleOpenPrintCards = async (targetJemaatIds?: string[]) => {
    const selectedIdsList = Object.entries(selectedRows)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id)
    const targetIds = targetJemaatIds && targetJemaatIds.length > 0
      ? targetJemaatIds
      : (selectedIdsList.length > 0 ? selectedIdsList : jemaatList.map((j) => j.id))

    if (!targetIds || targetIds.length === 0) {
      toast.error('Tidak ada data jemaat yang dapat dicetak.')
      return
    }

    const res = await getJemaatForPrintCardsAction(targetIds)

    if (!res.success || !res.data || res.data.length === 0) {
      toast.error('Tidak ada data jemaat yang dapat dicetak.')
      return
    }

    const printCardsData = res.data
    const printConfig = await getEffectivePrintConfig()
    const ktaColors = getKtaThemeColors(printConfig.kta)

    const printWindow = window.open('', '_blank', 'width=950,height=750')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const logoHtml = printConfig.kop.tampilkanLogo && printConfig.kop.logoUrl
      ? `<img src="${printConfig.kop.logoUrl}" alt="Logo" style="width: 32px; height: 32px; object-fit: contain; flex-shrink: 0;" />`
      : `<div class="church-logo" style="background: ${printConfig.kop.garisKopColor || '#0f172a'};">G</div>`

    const getKategorialStyle = (nama?: string | null) => {
      const n = (nama || '').toLowerCase()
      if (n.includes('youth') || n.includes('pemuda') || n.includes('remaja')) {
        return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' }
      }
      if (n.includes('pria') || n.includes('bapa') || n.includes('men')) {
        return { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' }
      }
      if (n.includes('wanita') || n.includes('ibu') || n.includes('women')) {
        return { bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' }
      }
      if (n.includes('anak') || n.includes('minggu') || n.includes('kids')) {
        return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' }
      }
      if (n.includes('lansia') || n.includes('senin') || n.includes('indah')) {
        return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' }
      }
      return { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' }
    }

    // Generate real unique QR code for each member
    const cardsHtmlList = await Promise.all(
      printCardsData.map(async (item) => {
        const nij = item.nij || '-'
        const barcode = item.barcodeCode || item.nij || item.id || '-'
        const kategorial = item.kategorial?.nama || 'Umum'
        const katStyle = getKategorialStyle(item.kategorial?.nama)
        const rawKomsel = item.komsel?.nama || ''
        const komselLabel = rawKomsel
          ? (rawKomsel.toLowerCase().startsWith('komsel') ? rawKomsel : `Komsel ${rawKomsel}`)
          : ''

        let qrDataUrl = ''
        try {
          qrDataUrl = await QRCode.toDataURL(barcode, {
            width: 340,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          })
        } catch (err) {
          console.error('Error generating QR code for', barcode, err)
        }

        return `
          <div class="card">
            <!-- Card Header with Dynamic Theme Gradient -->
            <div class="card-header" style="background: ${ktaColors.bgGradient} !important;">
              <div class="church-brand">
                ${logoHtml}
                <div class="church-text">
                  <div class="church-name">${printConfig.kop.namaGereja}</div>
                  <div class="church-sub" style="color: ${ktaColors.subColor} !important;">KARTU TANDA ANGGOTA RESMI</div>
                </div>
              </div>
              <div class="status-pill" style="background: ${ktaColors.statusBg} !important;">${item.statusJemaat || 'ACTIVE'}</div>
            </div>
            <div class="header-gold-line" style="background: ${ktaColors.accentGradient} !important;"></div>

            <!-- Card Body: Large QR Code + Member Details -->
            <div class="card-body">
              <div class="qr-col">
                <div class="qr-box">
                  ${
                    qrDataUrl
                      ? `<img src="${qrDataUrl}" alt="QR ${barcode}" class="qr-img" />`
                      : `<div class="qr-fallback">QR CODE</div>`
                  }
                </div>
              </div>

              <div class="info-col">
                <div class="member-name">${item.nama}</div>
                ${item.namaPanggilan ? `<div class="member-nickname">(${item.namaPanggilan})</div>` : ''}
                
                <div class="badges-row">
                  <span class="cat-badge" style="background: ${katStyle.bg} !important; color: ${katStyle.color} !important; border: 1px solid ${katStyle.border} !important;">
                    ${kategorial}
                  </span>
                  ${
                    komselLabel
                      ? `<span class="komsel-badge">${komselLabel}</span>`
                      : ''
                  }
                </div>

                <div class="nij-chip">
                  <span class="chip-icon">NIJ</span>
                  <span class="chip-val">${nij}</span>
                </div>
              </div>
            </div>

            <!-- Card Footer -->
            <div class="card-footer">
              <div class="footer-domisili">📍 ${printConfig.kop.subJudul || 'Indonesia'}</div>
            </div>
          </div>
        `
      })
    )

    const cardsHtml = cardsHtmlList.join('')

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Cetak Kartu Anggota (${printCardsData.length} Jemaat) - ${printConfig.kop.namaGereja}</title>
        <style>
          @page {
            size: ${printConfig.options.ukuranKertasDefault || 'A4'} portrait;
            margin: 8mm;
          }
          *, *:before, *:after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff !important;
            color: #0f172a;
            padding: 4px;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            width: 100%;
          }
          .card {
            border: 1.5px solid #1e293b;
            border-radius: 14px;
            background: #ffffff !important;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 198px;
            page-break-inside: avoid;
            break-inside: avoid;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            position: relative;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .card-header {
            background: ${ktaColors.bgGradient} !important;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header-gold-line {
            height: 3px;
            background: ${ktaColors.accentGradient} !important;
            width: 100%;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .church-brand {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .church-logo {
            width: 32px;
            height: 32px;
            background: #0f172a !important;
            color: #ffffff !important;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 13px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .church-text {
            display: flex;
            flex-direction: column;
          }
          .church-name {
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: #ffffff !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          }
          .church-sub {
            font-size: 7.5px;
            font-family: monospace;
            color: #93c5fd !important;
            letter-spacing: 0.8px;
            font-weight: 700;
          }
          .status-pill {
            background: #10b981 !important;
            color: #ffffff !important;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 8px;
            font-weight: 800;
            font-family: monospace;
            letter-spacing: 0.5px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .card-body {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            flex: 1;
            background: #fafafa !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .qr-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            flex-shrink: 0;
          }
          .qr-box {
            width: 82px;
            height: 82px;
            background: #ffffff !important;
            border: 1.5px solid #cbd5e1;
            border-radius: 10px;
            padding: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.06);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .qr-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 6px;
            display: block;
          }
          .qr-fallback {
            font-size: 8.5px;
            font-family: monospace;
            color: #64748b;
            font-weight: 700;
          }
          .qr-caption {
            font-size: 7px;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #64748b !important;
            font-family: monospace;
          }
          .info-col {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .member-name {
            font-size: 13.5px;
            font-weight: 900;
            color: #0f172a !important;
            line-height: 1.2;
            letter-spacing: -0.2px;
          }
          .member-nickname {
            font-size: 9.5px;
            color: #64748b !important;
            font-weight: 600;
          }
          .badges-row {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 2px;
          }
          .cat-badge {
            font-size: 8.5px;
            font-weight: 700;
            padding: 1.5px 6px;
            border-radius: 6px;
            display: inline-block;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .komsel-badge {
            font-size: 8.5px;
            font-weight: 600;
            color: #475569 !important;
            background: #e2e8f0 !important;
            border: 1px solid #cbd5e1;
            padding: 1.5px 6px;
            border-radius: 6px;
            display: inline-block;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .nij-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #0f172a !important;
            color: #ffffff !important;
            border-radius: 6px;
            padding: 2.5px 7px;
            margin-top: 4px;
            width: fit-content;
            box-shadow: 0 1px 2px rgba(0,0,0,0.15);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .chip-icon {
            font-size: 7.5px;
            font-family: monospace;
            font-weight: 700;
            color: #94a3b8 !important;
            letter-spacing: 0.5px;
          }
          .chip-val {
            font-size: 10px;
            font-family: monospace;
            font-weight: 800;
            color: #facc15 !important;
            letter-spacing: 0.5px;
          }
          .card-footer {
            background: #ffffff !important;
            border-top: 1px solid #e2e8f0;
            padding: 5px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 8px;
            color: #64748b;
            font-family: monospace;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .footer-domisili {
            font-weight: 600;
            color: #475569 !important;
          }
          .footer-cert {
            font-weight: 700;
            color: #0284c7 !important;
          }
        </style>
      </head>
      <body>
        <div class="grid-container">
          ${cardsHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(fullHtml)
    printWindow.document.close()
  }

  // 3. Bulk Status Update Handler
  const handleBulkStatusSubmit = async () => {
    if (selectedIds.length === 0) return
    setIsBulkUpdatingStatus(true)
    const res = await bulkUpdateJemaatStatusAction({
      ids: selectedIds,
      statusJemaat: bulkStatusValue,
      reason: bulkStatusReason.trim() || undefined,
    })
    setIsBulkUpdatingStatus(false)
    if (res.success) {
      toast.success(res.message)
      setBulkStatusModalOpen(false)
      setBulkStatusReason('')
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal mengubah status massal.')
    }
  }

  // 4. Bulk Assign Group (Kategorial / Komsel) Handler
  const handleBulkAssignSubmit = async () => {
    if (selectedIds.length === 0) return
    setIsBulkAssigning(true)
    const res = await bulkAssignJemaatGroupAction({
      ids: selectedIds,
      kategorialId: bulkKategorialValue === 'KEEP' ? undefined : bulkKategorialValue,
      komselId: bulkKomselValue === 'KEEP' ? undefined : bulkKomselValue,
    })
    setIsBulkAssigning(false)
    if (res.success) {
      toast.success(res.message)
      setBulkAssignModalOpen(false)
      setSelectedRows({})
      fetchData()
    } else {
      toast.error(res.error || 'Gagal mengubah grup massal.')
    }
  }

  // 5. Bulk Soft Delete Handler
  const handleBulkDeleteSubmit = async () => {
    if (selectedIds.length === 0) return
    if (!bulkDeleteReason.trim()) {
      toast.error('Alasan penghapusan massal wajib diisi.')
      return
    }
    setIsBulkDeleting(true)
    const res = await bulkSoftDeleteJemaatAction({
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
      toast.error(res.error || 'Gagal menghapus data massal.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    if (!deletionReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deleteJemaatAction({
      id: deleteTarget.id,
      reason: deletionReason.trim(),
    })

    setIsDeleting(false)
    if (res.success) {
      toast.success(res.message || 'Jemaat berhasil di-soft delete.')
      setDeleteTarget(null)
      setDeletionReason('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus jemaat.')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    const res = await restoreJemaatAction({ id: restoreTarget.id })
    setIsRestoring(false)

    if (res.success) {
      toast.success(res.message || 'Jemaat berhasil dipulihkan!')
      setRestoreTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memulihkan jemaat.')
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return
    setIsHardDeleting(true)
    const res = await hardDeleteJemaatAction({
      id: hardDeleteTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Data jemaat berhasil dihapus permanen dari database!')
      setHardDeleteTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus data jemaat secara permanen.')
    }
  }

  const isAllPaginatedSelected =
    jemaatList.length > 0 && jemaatList.every((item) => selectedRows[item.id])

  // Column Header component with Dropdown Menu
  const renderColumnHeader = (
    title: string,
    field?: 'nama' | 'nij' | 'statusJemaat',
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
      {/* Top Banner / Actions Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div>
          <h2 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Data Jemaat</h2>
          <p className='text-muted-foreground text-xs mt-0.5'>
            Kelola data dan keanggotaan jemaat gereja.
          </p>
        </div>
        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExportCsv}
            className='w-full sm:w-auto gap-1.5 text-xs h-9 sm:h-8 font-medium shadow-xs'
            title='Ekspor seluruh data jemaat ke file CSV / Excel'
          >
            <Download className='size-3.5 text-muted-foreground' /> Ekspor CSV
          </Button>
          <Button asChild size='sm' className='w-full sm:w-auto gap-1.5 text-xs h-9 sm:h-8 shadow-xs font-semibold'>
            <Link href='/dashboard/jemaat/baru'>
              <Plus className='size-3.5' /> Tambah Jemaat
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards with Swiper on Mobile */}
      <div className='w-full'>
        <Swiper
          modules={[SwiperPagination]}
          pagination={{ clickable: true }}
          spaceBetween={12}
          slidesPerView={1.2}
          breakpoints={{
            480: { slidesPerView: 2, spaceBetween: 12 },
            640: { slidesPerView: 3, spaceBetween: 12 },
            1024: { slidesPerView: 5, spaceBetween: 12 },
          }}
          className='kpi-swiper pb-7! sm:pb-0!'
        >
          <SwiperSlide className='h-auto'>
            <div className='rounded-lg border bg-card p-3 shadow-xs flex flex-col justify-between h-full'>
              <div className='flex items-center justify-between text-muted-foreground text-[11px] font-medium uppercase tracking-wider'>
                <span>Total Jemaat</span>
                <Users className='size-3.5 text-primary' />
              </div>
              <div className='text-xl font-bold font-mono text-foreground mt-2'>{stats.totalJemaat}</div>
            </div>
          </SwiperSlide>

          <SwiperSlide className='h-auto'>
            <div className='rounded-lg border bg-card p-3 shadow-xs flex flex-col justify-between h-full'>
              <div className='flex items-center justify-between text-muted-foreground text-[11px] font-medium uppercase tracking-wider'>
                <span>Aktif</span>
                <UserCheck className='size-3.5 text-emerald-600' />
              </div>
              <div className='text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2'>{stats.active}</div>
            </div>
          </SwiperSlide>

          <SwiperSlide className='h-auto'>
            <div className='rounded-lg border bg-card p-3 shadow-xs flex flex-col justify-between h-full'>
              <div className='flex items-center justify-between text-muted-foreground text-[11px] font-medium uppercase tracking-wider'>
                <span>Nonaktif</span>
                <UserX className='size-3.5 text-rose-600' />
              </div>
              <div className='text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2'>{stats.inactive}</div>
            </div>
          </SwiperSlide>

          <SwiperSlide className='h-auto'>
            <div className='rounded-lg border bg-card p-3 shadow-xs flex flex-col justify-between h-full'>
              <div className='flex items-center justify-between text-muted-foreground text-[11px] font-medium uppercase tracking-wider'>
                <span>Laki-Laki</span>
              </div>
              <div className='text-xl font-bold font-mono text-foreground mt-2'>{stats.male}</div>
            </div>
          </SwiperSlide>

          <SwiperSlide className='h-auto'>
            <div className='rounded-lg border bg-card p-3 shadow-xs flex flex-col justify-between h-full'>
              <div className='flex items-center justify-between text-muted-foreground text-[11px] font-medium uppercase tracking-wider'>
                <span>Perempuan</span>
              </div>
              <div className='text-xl font-bold font-mono text-foreground mt-2'>{stats.female}</div>
            </div>
          </SwiperSlide>
        </Swiper>
      </div>

      {/* Toolbar Filter Section */}
      <div className='space-y-2.5'>
        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5'>
          {/* Search & Filter Controls */}
          <div className='flex flex-wrap items-center gap-2 flex-1'>
            {/* Search Input */}
            <div className='relative w-full sm:w-64'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
              <Input
                placeholder='Cari nama, NIJ, HP, barcode...'
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPageIndex(0)
                }}
                className='h-8 ps-8 pe-3 text-xs w-full bg-background'
              />
            </div>

            {/* Filter Buttons Group */}
            <div className='flex flex-wrap items-center gap-1.5'>
              {/* Filter Kategorial */}
              <Select
                value={kategorialFilter || 'ALL'}
                onValueChange={(val) => {
                  setKategorialFilter(val === 'ALL' ? undefined : val)
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className='h-8 text-xs font-medium w-[130px] bg-background'>
                  <SelectValue placeholder='Semua Kategori' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL' className='text-xs'>Semua Kategori</SelectItem>
                  {formOptions.kategorial.map((kat) => (
                    <SelectItem key={kat.id} value={kat.id} className='text-xs'>
                      {kat.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter Komsel */}
              <Select
                value={komselFilter || 'ALL'}
                onValueChange={(val) => {
                  setKomselFilter(val === 'ALL' ? undefined : val)
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className='h-8 text-xs font-medium w-[125px] bg-background'>
                  <SelectValue placeholder='Semua Komsel' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL' className='text-xs'>Semua Komsel</SelectItem>
                  {formOptions.komsel.map((kom) => (
                    <SelectItem key={kom.id} value={kom.id} className='text-xs'>
                      {kom.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Faceted Filter: Status */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant='outline' size='sm' className='h-8 border-dashed gap-1 text-xs bg-background'>
                    <Plus className='size-3.5' /> Status
                    {statusFilter && (
                      <Badge variant='secondary' className='rounded-xs px-1 font-mono text-[10px] ms-0.5'>
                        {statusFilter}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-44 p-2 space-y-1' align='start'>
                  <div className='text-xs font-semibold text-muted-foreground px-2 py-1'>Status Jemaat</div>
                  {['ACTIVE', 'INACTIVE', 'MOVED', 'DECEASED', 'SUSPENDED'].map((st) => (
                    <div
                      key={st}
                      onClick={() => {
                        setStatusFilter(statusFilter === st ? undefined : st)
                        setPageIndex(0)
                      }}
                      className='flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs cursor-pointer'
                    >
                      <div className={`size-4 rounded border flex items-center justify-center ${statusFilter === st ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}>
                        {statusFilter === st && <Check className='size-3' />}
                      </div>
                      <span>{st}</span>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Faceted Filter: Jenis Kelamin */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant='outline' size='sm' className='h-8 border-dashed gap-1 text-xs bg-background'>
                    <Plus className='size-3.5' /> Gender
                    {genderFilter && (
                      <Badge variant='secondary' className='rounded-xs px-1 font-mono text-[10px] ms-0.5'>
                        {genderFilter === 'LAK_LAKI' ? 'L' : 'P'}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-40 p-2 space-y-1' align='start'>
                  <div className='text-xs font-semibold text-muted-foreground px-2 py-1'>Jenis Kelamin</div>
                  {[
                    { label: 'Laki-Laki', val: 'LAK_LAKI' },
                    { label: 'Perempuan', val: 'PEREMPUAN' },
                  ].map((g) => (
                    <div
                      key={g.val}
                      onClick={() => {
                        setGenderFilter(genderFilter === g.val ? undefined : g.val)
                        setPageIndex(0)
                      }}
                      className='flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs cursor-pointer'
                    >
                      <div className={`size-4 rounded border flex items-center justify-center ${genderFilter === g.val ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}>
                        {genderFilter === g.val && <Check className='size-3' />}
                      </div>
                      <span>{g.label}</span>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Filter Status Hapus */}
              <Select
                value={statusHapusFilter}
                onValueChange={(val: 'ACTIVE' | 'DELETED' | 'ALL') => {
                  setStatusHapusFilter(val)
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className='h-8 w-[105px] text-xs font-medium bg-background'>
                  <SelectValue placeholder='Status Data' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ACTIVE' className='text-xs'>
                    <span className='flex items-center gap-1.5'>
                      <UserCheck className='size-3.5 text-emerald-600' />
                      <span>Aktif</span>
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
                      <span>Semua</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Reset Filter Button */}
              {(searchTerm || statusFilter || genderFilter || kategorialFilter || komselFilter || statusHapusFilter !== 'ACTIVE') && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter(undefined)
                    setGenderFilter(undefined)
                    setKategorialFilter(undefined)
                    setKomselFilter(undefined)
                    setStatusHapusFilter('ACTIVE')
                    setPageIndex(0)
                  }}
                  className='h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground'
                >
                  Reset <FilterX className='size-3' />
                </Button>
              )}
            </div>
          </div>

          {/* Right: View Switcher & Column Toggle */}
          <div className='flex items-center justify-between sm:justify-end gap-2 shrink-0'>
            {/* View Switcher */}
            <div className='flex items-center border rounded-lg p-0.5 bg-muted/40'>
              <Button
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
                  <Button variant='outline' size='sm' className='h-8 gap-1.5 text-xs bg-background'>
                    <SlidersHorizontal className='size-3.5' /> Kolom
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-40'>
                  <DropdownMenuLabel className='text-xs'>Toggle Kolom</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(['nij', 'nama', 'kontak', 'kategorial', 'status', 'kelengkapan'] as const).map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col}
                      checked={visibleColumns[col]}
                      onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, [col]: !!c }))}
                    >
                      {col === 'nij' ? 'NIJ' : col === 'nama' ? 'Nama Lengkap' : col === 'kontak' ? 'Kontak' : col === 'kategorial' ? 'Kategorial' : col === 'status' ? 'Status' : 'Kelengkapan'}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
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
                    <Checkbox
                      checked={isAllPaginatedSelected}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label='Select all'
                    />
                  </TableHead>
                  {visibleColumns.nij && (
                    <TableHead className='px-3 font-semibold text-xs'>
                      {renderColumnHeader('NIJ & Barcode', 'nij', 'nij')}
                    </TableHead>
                  )}
                  {visibleColumns.nama && (
                    <TableHead className='px-3 font-semibold text-xs'>
                      {renderColumnHeader('Identitas Jemaat', 'nama', 'nama')}
                    </TableHead>
                  )}
                  {visibleColumns.kontak && (
                    <TableHead className='px-3 font-semibold text-xs'>
                      {renderColumnHeader('Kontak HP / WA', undefined, 'kontak')}
                    </TableHead>
                  )}
                  {visibleColumns.kategorial && (
                    <TableHead className='px-3 font-semibold text-xs'>
                      {renderColumnHeader('Kategorial & Komsel', undefined, 'kategorial')}
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead className='px-3 font-semibold text-xs'>
                      {renderColumnHeader('Status', 'statusJemaat', 'status')}
                    </TableHead>
                  )}
                  {visibleColumns.kelengkapan && (
                    <TableHead className='px-3 font-semibold text-xs text-end'>
                      {renderColumnHeader('Completeness', undefined, 'kelengkapan')}
                    </TableHead>
                  )}
                  <TableHead className='w-15 px-3 text-end'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className='h-32 text-center text-muted-foreground text-sm'>
                      <div className='flex items-center justify-center gap-2'>
                        <Loader2 className='size-4 animate-spin text-primary' /> Memuat data jemaat...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : jemaatList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className='h-32 text-center text-muted-foreground text-sm'>
                      <div className='space-y-2'>
                        <div>Tidak ada jemaat yang ditemukan.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedJemaatList.map((jmt) => {
                    const isSelected = !!selectedRows[jmt.id]
                    const isDeleted = !!jmt.deletedAt
                    return (
                      <TableRow
                        key={jmt.id}
                        className={`transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'} ${isSelected ? 'bg-muted/50' : ''}`}
                      >
                        <TableCell className='px-3 py-2.5'>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => setSelectedRows((p) => ({ ...p, [jmt.id]: !!c }))}
                            aria-label={`Select ${jmt.nama}`}
                          />
                        </TableCell>
                        {visibleColumns.nij && (
                          <TableCell className='px-3 py-2.5 font-mono text-xs text-muted-foreground'>
                            {jmt.nij || '-'}
                          </TableCell>
                        )}
                        {visibleColumns.nama && (
                          <TableCell className='px-3 py-2.5 font-medium text-sm text-foreground'>
                            <Link href={`/dashboard/jemaat/${jmt.id}`} className='font-semibold hover:underline hover:text-primary block'>
                              {jmt.nama}
                            </Link>
                            <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                              {jmt.namaPanggilan && <span>({jmt.namaPanggilan})</span>}
                              {jmt.nik && <span className='font-mono text-[10px] text-muted-foreground/80'>NIK: {jmt.nik}</span>}
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.kontak && (
                          <TableCell className='px-3 py-2.5 text-xs font-mono text-muted-foreground'>
                            <div className='flex items-center gap-1.5'>
                              <span>{jmt.noHp || jmt.whatsApp || '-'}</span>
                              {(jmt.whatsApp || jmt.noHp) && (
                                <a
                                  href={formatWhatsAppUrl(jmt.whatsApp || jmt.noHp, getWhatsAppTemplate(jmt))}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-500/10 transition-colors shrink-0'
                                  title='Hubungi via WhatsApp'
                                >
                                  <MessageSquare className='size-3.5' />
                                </a>
                              )}
                            </div>
                            {jmt.email && <div className='text-[10px] truncate max-w-35'>{jmt.email}</div>}
                          </TableCell>
                        )}
                        {visibleColumns.kategorial && (
                          <TableCell className='px-3 py-2.5 text-xs space-y-1'>
                            {jmt.kategorial ? (
                              <Badge variant='outline' className='text-[10px]'>{jmt.kategorial.nama}</Badge>
                            ) : (
                              <span className='text-muted-foreground text-[11px]'>-</span>
                            )}
                            {jmt.komsel && (
                              <div className='text-[10px] text-muted-foreground font-mono'>{jmt.komsel.nama}</div>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.status && (
                          <TableCell className='px-3 py-2.5'>
                            {isDeleted ? (
                              <Badge variant='destructive' className='text-[10px] gap-1 font-mono'>
                                <Trash2 className='size-3' /> Terhapus
                              </Badge>
                            ) : (
                              <Badge className={
                                jmt.statusJemaat === 'ACTIVE'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-normal px-2 py-0 text-[11px]'
                                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 font-normal px-2 py-0 text-[11px]'
                              }>
                                {jmt.statusJemaat}
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.kelengkapan && (
                          <TableCell className='px-3 py-2.5 text-end'>
                            <div className='flex items-center justify-end gap-1.5'>
                              <div className='w-12 bg-muted rounded-full h-1.5 overflow-hidden'>
                                <div
                                  className='bg-primary h-full rounded-full transition-all'
                                  style={{ width: `${jmt.completenessPercentage}%` }}
                                />
                              </div>
                              <span className='font-mono text-xs font-semibold text-foreground'>
                                {jmt.completenessPercentage}%
                              </span>
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
                            <DropdownMenuContent align='end' className='w-48'>
                              <DropdownMenuLabel className='text-xs'>Aksi Jemaat</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/jemaat/${jmt.id}`}>
                                  <Eye className='size-3.5 me-2' /> Lihat Detail Profil
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenPrintCards([jmt.id])}>
                                <Printer className='size-3.5 me-2 text-blue-600' /> Cetak Kartu Anggota
                              </DropdownMenuItem>
                              {(jmt.whatsApp || jmt.noHp) && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={formatWhatsAppUrl(jmt.whatsApp || jmt.noHp, getWhatsAppTemplate(jmt))}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='text-emerald-600 dark:text-emerald-400 font-medium'
                                  >
                                    <MessageSquare className='size-3.5 me-2' /> Hubungi via WhatsApp
                                  </a>
                                </DropdownMenuItem>
                              )}

                              {isDeleted ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setRestoreTarget(jmt)}
                                    className='text-emerald-600 dark:text-emerald-400 text-xs'
                                  >
                                    <RotateCcw className='size-3.5 me-2' /> Pulihkan Data
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setHardDeleteTarget(jmt)}
                                    className='text-rose-600 dark:text-rose-400 text-xs'
                                  >
                                    <Trash2 className='size-3.5 me-2' /> Hapus Permanen
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/jemaat/${jmt.id}?edit=true`}>
                                      <Edit className='size-3.5 me-2' /> Edit Data
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteTarget(jmt)}
                                    className='text-rose-600 dark:text-rose-400 text-xs'
                                  >
                                    <Trash2 className='size-3.5 me-2' /> Hapus Jemaat
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

          {/* Footer / Pagination for Table */}
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
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex(0)}
                  title='Halaman Pertama'
                >
                  <ChevronsLeft className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  title='Halaman Sebelumnya'
                >
                  <ChevronLeft className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  disabled={pageIndex >= totalPages - 1}
                  onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                  title='Halaman Berikutnya'
                >
                  <ChevronRight className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  disabled={pageIndex >= totalPages - 1}
                  onClick={() => setPageIndex(totalPages - 1)}
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
              <Loader2 className='size-5 animate-spin text-primary' /> Memuat data jemaat...
            </div>
          ) : jemaatList.length === 0 ? (
            <div className='rounded-lg border bg-card p-12 text-center text-muted-foreground space-y-3'>
              <div className='font-medium text-foreground text-sm'>Tidak ada data jemaat.</div>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
              {sortedJemaatList.map((jmt) => {
                const isSelected = !!selectedRows[jmt.id]
                const isDeleted = !!jmt.deletedAt
                const initials = jmt.nama.slice(0, 2).toUpperCase()

                return (
                  <Card
                    key={jmt.id}
                    className={`overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between border ${
                      isDeleted ? 'bg-rose-500/5 border-rose-200 dark:border-rose-900/50' : 'bg-card'
                    } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className='p-3.5 pb-2 border-b bg-muted/20 flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2'>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => setSelectedRows((p) => ({ ...p, [jmt.id]: !!c }))}
                          />
                          <span className='font-mono text-xs text-muted-foreground font-semibold'>
                            {jmt.nij || 'NO-NIJ'}
                          </span>
                        </div>

                        {isDeleted ? (
                          <Badge variant='destructive' className='text-[10px] font-mono'>
                            <Trash2 className='size-3 me-1' /> Terhapus
                          </Badge>
                        ) : (
                          <Badge
                            className={
                              jmt.statusJemaat === 'ACTIVE'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-medium'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px] font-mono font-medium'
                            }
                          >
                            {jmt.statusJemaat}
                          </Badge>
                        )}
                      </div>

                      {/* Card Content Body */}
                      <CardContent className='p-3.5 space-y-3'>
                        {/* Profile Info */}
                        <div className='flex items-start gap-3'>
                          <div className='size-10 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20'>
                            {initials}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <Link
                              href={`/dashboard/jemaat/${jmt.id}`}
                              className='font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1 block'
                            >
                              {jmt.nama}
                            </Link>
                            <div className='text-xs text-muted-foreground truncate'>
                              {jmt.namaPanggilan ? `(${jmt.namaPanggilan})` : jmt.jenisKelamin === 'LAK_LAKI' ? 'Laki-Laki' : 'Perempuan'}
                            </div>
                          </div>
                        </div>

                        {/* Badges Info */}
                        <div className='flex flex-wrap gap-1.5 pt-1'>
                          {jmt.kategorial && (
                            <Badge variant='outline' className='text-[10px] bg-muted/40'>
                              {jmt.kategorial.nama}
                            </Badge>
                          )}
                          {jmt.komsel && (
                            <Badge variant='secondary' className='text-[10px] font-mono'>
                              📍 {jmt.komsel.nama}
                            </Badge>
                          )}
                          {jmt.statusBaptis && (
                            <Badge variant='outline' className='text-[10px] text-primary border-primary/20'>
                              Baptis
                            </Badge>
                          )}
                        </div>

                        {/* Contact Info */}
                        <div className='text-xs text-muted-foreground space-y-1 font-mono'>
                          {(jmt.whatsApp || jmt.noHp) && (
                            <div className='flex items-center justify-between gap-1.5'>
                              <div className='flex items-center gap-1.5 min-w-0'>
                                <Phone className='size-3 text-primary shrink-0' />
                                <span className='truncate'>{jmt.whatsApp || jmt.noHp}</span>
                              </div>
                              <a
                                href={formatWhatsAppUrl(jmt.whatsApp || jmt.noHp, getWhatsAppTemplate(jmt))}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 text-[10px] font-semibold transition-colors shrink-0'
                                title='Hubungi via WhatsApp'
                              >
                                <MessageSquare className='size-3' /> WA
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Profile Completeness Bar */}
                        <div className='pt-2 border-t space-y-1'>
                          <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
                            <span>Kelengkapan Data</span>
                            <span className='font-mono font-semibold text-foreground'>{jmt.completenessPercentage}%</span>
                          </div>
                          <div className='w-full bg-muted rounded-full h-1.5 overflow-hidden'>
                            <div
                              className='bg-primary h-full rounded-full transition-all'
                              style={{ width: `${jmt.completenessPercentage}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    {/* Card Footer */}
                    <div className='px-3.5 py-2.5 bg-muted/20 border-t flex items-center justify-between gap-1.5'>
                      <div className='flex items-center gap-1.5'>
                        <Button asChild size='sm' variant='outline' className='h-7 px-2.5 text-xs gap-1'>
                          <Link href={`/dashboard/jemaat/${jmt.id}`}>
                            <Eye className='size-3.5' /> Profil
                          </Link>
                        </Button>
                        {!isDeleted && (
                          <Button asChild size='sm' variant='outline' className='h-7 px-2.5 text-xs gap-1'>
                            <Link href={`/dashboard/jemaat/${jmt.id}?edit=true`}>
                              <Edit className='size-3.5' /> Edit
                            </Link>
                          </Button>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon' className='size-7'>
                            <MoreHorizontal className='size-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-48'>
                          <DropdownMenuLabel className='text-xs'>Aksi Jemaat</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/jemaat/${jmt.id}`}>
                              <Eye className='size-3.5 me-2' /> Lihat Detail Profil
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenPrintCards([jmt.id])}>
                            <Printer className='size-3.5 me-2 text-blue-600' /> Cetak Kartu Anggota
                          </DropdownMenuItem>
                          {(jmt.whatsApp || jmt.noHp) && (
                            <DropdownMenuItem asChild>
                              <a
                                href={formatWhatsAppUrl(jmt.whatsApp || jmt.noHp, getWhatsAppTemplate(jmt))}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-emerald-600 dark:text-emerald-400 font-medium'
                              >
                                <MessageSquare className='size-3.5 me-2' /> Hubungi via WhatsApp
                              </a>
                            </DropdownMenuItem>
                          )}

                          {isDeleted ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setRestoreTarget(jmt)}
                                className='text-emerald-600 dark:text-emerald-400 text-xs'
                              >
                                <RotateCcw className='size-3.5 me-2' /> Pulihkan Data
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setHardDeleteTarget(jmt)}
                                className='text-rose-600 dark:text-rose-400 text-xs'
                              >
                                <Trash2 className='size-3.5 me-2' /> Hapus Permanen
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/jemaat/${jmt.id}?edit=true`}>
                                  <Edit className='size-3.5 me-2' /> Edit Data
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(jmt)}
                                className='text-rose-600 dark:text-rose-400 text-xs'
                              >
                                <Trash2 className='size-3.5 me-2' /> Hapus Jemaat
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex(0)}
                  title='Halaman Pertama'
                >
                  <ChevronsLeft className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  title='Halaman Sebelumnya'
                >
                  <ChevronLeft className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  disabled={pageIndex >= totalPages - 1}
                  onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                  title='Halaman Berikutnya'
                >
                  <ChevronRight className='size-3.5' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-7'
                  disabled={pageIndex >= totalPages - 1}
                  onClick={() => setPageIndex(totalPages - 1)}
                  title='Halaman Terakhir'
                >
                  <ChevronsRight className='size-3.5' />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>
              Hapus Data Jemaat?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Anda akan menghapus data jemaat <strong className='text-foreground'>{deleteTarget?.nama}</strong> ({deleteTarget?.nij}).
                </span>
                <span className='block text-xs text-muted-foreground'>
                  Data tidak akan dihapus permanen dari database, melainkan ditandai sebagai Soft-Deleted dengan pencatatan audit trail SHA-256.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan (Wajib):</label>
            <Textarea
              placeholder='Contoh: Pindah domisili ke luar kota / Meninggal dunia / Permintaan mandiri...'
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
              Konfirmasi Hapus (Soft Delete)
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Alert Dialog */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Data Jemaat?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Data jemaat <strong className='text-foreground'>{restoreTarget?.nama}</strong> ({restoreTarget?.nij}) akan dipulihkan kembali ke status <strong>AKTIF</strong>.
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
              Ya, Pulihkan Jemaat
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
              onClick={() => handleOpenPrintCards()}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10 rounded-full whitespace-nowrap'
              title='Cetak Kartu Anggota & Barcode QR untuk jemaat terpilih'
            >
              <Printer className='size-3.5' />
              <span>Cetak Kartu QR</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setBulkKategorialValue('KEEP')
                setBulkKomselValue('KEEP')
                setBulkAssignModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ubah Kategorial atau Komsel jemaat terpilih'
            >
              <Users className='size-3.5' />
              <span>Ubah Komsel / Kategori</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setBulkStatusValue('ACTIVE')
                setBulkStatusReason('')
                setBulkStatusModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ubah Status Keanggotaan jemaat terpilih'
            >
              <UserCheck className='size-3.5' />
              <span>Ubah Status</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleExportCsv}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 rounded-full whitespace-nowrap'
              title='Ekspor data jemaat terpilih ke CSV / Excel'
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
              title='Hapus data jemaat terpilih (soft delete)'
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

      {/* ── MODAL 1: UBAH STATUS KEANGGOTAAN MASSAL ─────────────── */}
      <Dialog open={bulkStatusModalOpen} onOpenChange={setBulkStatusModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <UserCheck className='size-5 text-primary' />
              Ubah Status Keanggotaan ({selectedCount} Jemaat)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Pilih status keanggotaan baru yang akan diterapkan pada seluruh jemaat terpilih.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2 text-xs'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Status Keanggotaan Baru:</Label>
              <Select value={bulkStatusValue} onValueChange={(val: any) => setBulkStatusValue(val)}>
                <SelectTrigger className='w-full text-xs h-9'>
                  <SelectValue placeholder='Pilih status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ACTIVE' className='text-xs font-medium'>
                    <span className='flex items-center gap-1.5'>
                      <CheckCircle2 className='size-3.5 text-emerald-600' />
                      <span>ACTIVE — Jemaat Tetap (Warga Aktif)</span>
                    </span>
                  </SelectItem>
                  <SelectItem value='INACTIVE' className='text-xs font-medium'>
                    <span className='flex items-center gap-1.5'>
                      <UserMinus className='size-3.5 text-muted-foreground' />
                      <span>INACTIVE — Jemaat Nonaktif</span>
                    </span>
                  </SelectItem>
                  <SelectItem value='MOVED' className='text-xs font-medium'>
                    <span className='flex items-center gap-1.5'>
                      <ArrowRightLeft className='size-3.5 text-amber-500' />
                      <span>MOVED — Pindah / Mutasi Gereja Lain</span>
                    </span>
                  </SelectItem>
                  <SelectItem value='DECEASED' className='text-xs font-medium'>
                    <span className='flex items-center gap-1.5'>
                      <UserX className='size-3.5 text-slate-500' />
                      <span>DECEASED — Meninggal Dunia</span>
                    </span>
                  </SelectItem>
                  <SelectItem value='SUSPENDED' className='text-xs font-medium'>
                    <span className='flex items-center gap-1.5'>
                      <ShieldAlert className='size-3.5 text-rose-500' />
                      <span>SUSPENDED — Ditangguhkan / Skorsing</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Catatan / Alasan Perubahan (Opsional):</Label>
              <Input
                placeholder='Contoh: Menyelesaikan kelas dasar kekristenan / baptisan baru'
                value={bulkStatusReason}
                onChange={(e) => setBulkStatusReason(e.target.value)}
                className='text-xs h-9'
              />
            </div>

            <div className='p-2.5 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground'>
              Perubahan status ini akan dicatat ke dalam <strong>Cryptographic Audit Trail SHA-256</strong>.
            </div>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setBulkStatusModalOpen(false)} disabled={isBulkUpdatingStatus}>
              Batal
            </Button>
            <Button onClick={handleBulkStatusSubmit} disabled={isBulkUpdatingStatus} className='gap-1.5'>
              {isBulkUpdatingStatus ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
              {isBulkUpdatingStatus ? 'Menyimpan...' : `Terapkan Status (${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: UBAH KOMSEL & KATEGORIAL MASSAL ─────────────── */}
      <Dialog open={bulkAssignModalOpen} onOpenChange={setBulkAssignModalOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Users className='size-5 text-primary' />
              Ubah Kategorial & Komsel ({selectedCount} Jemaat)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tetapkan kategorial usia dan/atau persekutuan komsel untuk jemaat yang dipilih.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2 text-xs'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Kategorial Usia:</Label>
              <Select value={bulkKategorialValue} onValueChange={setBulkKategorialValue}>
                <SelectTrigger className='w-full text-xs h-9'>
                  <SelectValue placeholder='Pilih kategorial' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='KEEP' className='text-xs italic text-muted-foreground'>
                    — Jangan Ubah Kategorial Saat Ini —
                  </SelectItem>
                  <SelectItem value='NONE' className='text-xs font-medium text-amber-600'>
                    ✕ Kosongkan / Tanpa Kategorial
                  </SelectItem>
                  {formOptions.kategorial.map((kat) => (
                    <SelectItem key={kat.id} value={kat.id} className='text-xs'>
                      {kat.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Kelompok Sel (Komsel):</Label>
              <Select value={bulkKomselValue} onValueChange={setBulkKomselValue}>
                <SelectTrigger className='w-full text-xs h-9'>
                  <SelectValue placeholder='Pilih komsel' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='KEEP' className='text-xs italic text-muted-foreground'>
                    — Jangan Ubah Komsel Saat Ini —
                  </SelectItem>
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
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setBulkAssignModalOpen(false)} disabled={isBulkAssigning}>
              Batal
            </Button>
            <Button
              onClick={handleBulkAssignSubmit}
              disabled={isBulkAssigning || (bulkKategorialValue === 'KEEP' && bulkKomselValue === 'KEEP')}
              className='gap-1.5'
            >
              {isBulkAssigning ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
              {isBulkAssigning ? 'Memperbarui...' : `Terapkan Grup (${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: HAPUS MASSAL (SOFT DELETE) ─────────────────── */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Pindahkan {selectedCount} Jemaat ke Kotak Sampah?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Seluruh ({selectedCount}) data jemaat yang dipilih akan diarsipkan ke kotak sampah (*soft delete*). Data masih dapat dipulihkan kembali kapan saja.
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

      {/* ── MODAL 4: CETAK KARTU ANGGOTA & QR MASSAL ─────────────── */}
      <Dialog open={printCardsModalOpen} onOpenChange={setPrintCardsModalOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden print:static print:max-w-none print:w-full print:max-h-none print:h-auto print:border-none print:shadow-none print:p-0 print:bg-white print:overflow-visible'>
          <DialogHeader className='p-4 sm:p-5 pb-3 sm:pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 print:hidden'>
            <div className='min-w-0 flex-1 pe-6 sm:pe-0'>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2 leading-tight'>
                <Printer className='size-5 text-primary shrink-0' />
                <span>Pratinjau Kartu Anggota ({printCardsData.length} Jemaat)</span>
              </DialogTitle>
              <DialogDescription className='text-xs mt-0.5'>
                Format tata letak kartu jemaat siap cetak dengan QR code presensi.
              </DialogDescription>
            </div>
            <Button
              size='sm'
              onClick={() => handleOpenPrintCards()}
              className='w-full sm:w-auto gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm print:hidden shrink-0'
            >
              <Printer className='size-4' /> Cetak Sekarang (Print / PDF)
            </Button>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-3 sm:p-6 bg-muted/20'>
            {isLoadingPrintCards ? (
              <div className='py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs'>
                <Loader2 className='size-6 animate-spin text-primary' />
                <span>Menyiapkan kartu anggota & kode QR...</span>
              </div>
            ) : printCardsData.length === 0 ? (
              <div className='py-12 text-center text-xs text-muted-foreground'>
                Tidak ada data kartu yang dapat ditampilkan.
              </div>
            ) : (
              <div
                className='grid grid-cols-1 max-w-xl mx-auto gap-5 w-full'
                id='printable-card-grid'
              >
                {printCardsData.map((item) => {
                  const modalKtaColors = getKtaThemeColors(activePrintConfig?.kta)
                  return (
                    <div
                      key={item.id}
                      className='border-2 border-slate-800 dark:border-slate-700 bg-card rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between min-h-55'
                    >
                      {/* Card Header with Dynamic Gradient */}
                      <div
                        className='text-white p-3 px-4 flex items-center justify-between gap-2'
                        style={{ background: modalKtaColors.bgGradient }}
                      >
                        <div className='flex items-center gap-2.5 min-w-0'>
                          {activePrintConfig?.kop?.tampilkanLogo && activePrintConfig?.kop?.logoUrl ? (
                            <img
                              src={activePrintConfig.kop.logoUrl}
                              alt='Logo'
                              className='size-8 object-contain shrink-0'
                            />
                          ) : (
                            <div className='size-8 bg-transparent text-white flex items-center justify-center font-black text-lg shrink-0'>
                              ⛪
                            </div>
                          )}
                          <div className='min-w-0'>
                            <div className='text-xs sm:text-sm font-black tracking-tight uppercase truncate text-white'>
                              {activePrintConfig?.kop?.namaGereja || churchName}
                            </div>
                            <div
                              className='text-[9px] font-mono uppercase tracking-wider font-semibold'
                              style={{ color: modalKtaColors.subColor }}
                            >
                              KARTU TANDA ANGGOTA RESMI
                            </div>
                          </div>
                        </div>
                        <Badge
                          className='text-[9px] font-mono font-bold text-white px-2.5 py-0.5 rounded-full shrink-0 shadow-xs border-none'
                          style={{ background: modalKtaColors.statusBg }}
                        >
                          {item.statusJemaat}
                        </Badge>
                      </div>
                      <div
                        className='h-0.75 w-full'
                        style={{ background: modalKtaColors.accentGradient }}
                      />

                      {/* Card Middle: Large QR Code + Member Info */}
                      <div className='flex items-center gap-3.5 p-4 py-3 bg-slate-50/50 dark:bg-slate-900/30 flex-1'>
                        {/* Large QR Code Container */}
                        <div className='size-20 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white p-1 flex items-center justify-center shrink-0 shadow-xs'>
                          <QrCode className='size-16 text-slate-900' />
                        </div>

                        {/* Details */}
                        <div className='min-w-0 flex-1 space-y-1.5'>
                          <div>
                            <div className='font-black text-sm sm:text-base text-foreground leading-snug wrap-break-word'>
                              {item.nama}
                            </div>
                            {item.namaPanggilan && (
                              <div className='text-xs text-muted-foreground font-medium'>
                                ({item.namaPanggilan})
                              </div>
                            )}
                          </div>
                          <div className='flex items-center gap-1.5 flex-wrap'>
                            <span className='text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'>
                              {item.kategorial?.nama || 'Umum'}
                            </span>
                            {item.komsel?.nama && (
                              <span className='text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'>
                                {item.komsel.nama.toLowerCase().startsWith('komsel') ? item.komsel.nama : `Komsel ${item.komsel.nama}`}
                              </span>
                            )}
                          </div>
                          <div className='inline-flex items-center gap-1.5 bg-slate-900 text-white rounded-md px-2 py-0.5 text-[10px] font-mono shadow-xs'>
                            <span className='text-slate-400 font-semibold'>NIJ:</span>
                            <span className='font-bold text-amber-400'>{item.nij || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className='border-t p-2 px-4 flex items-center justify-between text-[9px] text-muted-foreground font-mono bg-white dark:bg-slate-900'>
                        <span className='text-slate-600 dark:text-slate-400 font-medium truncate'>
                          📍 {activePrintConfig?.kop?.subJudul || 'Padang, Sumatera Barat'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className='p-3 sm:p-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0'>
            <span className='text-xs text-muted-foreground text-center sm:text-left'>
              Gunakan kertas tebal (Art Paper / PVC) untuk hasil cetak kartu terbaik.
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPrintCardsModalOpen(false)}
              className='w-full sm:w-auto'
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
