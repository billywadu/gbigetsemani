'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  Printer,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Lock,
  Unlock,
  CheckCircle2,
  FolderOpen,
  Download,
  X,
  BarChart3,
  PieChart as PieIcon,
  Search,
  BookOpen,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  SlidersHorizontal,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  getLaporanGabunganAction,
  bulkFinalizeLaporanAction,
  bulkReopenLaporanAction,
  getConsolidatedFullBookPrintDataAction,
  type ConsolidatedBookPrintDataDTO,
} from '@/actions/keuangan'
import { getPrintLayoutConfigAction } from '@/actions/print-layout'
import { getEffectivePrintConfig } from '@/lib/print-helpers'
import { MonthYearPicker } from '@/components/month-year-picker'
import { TablePagination } from '@/components/ui/table-pagination'
import { toast } from 'sonner'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const DONUT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e',
]

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function LaporanGabunganContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const qTahun = searchParams.get('tahun')
  const qBulan = searchParams.get('bulan')

  const [loading, setLoading] = useState(true)
  const [tahun, setTahun] = useState<string>(qTahun || String(new Date().getFullYear()))
  const [bulan, setBulan] = useState<string>(qBulan || 'all')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Chart Analytics State
  const [showChart, setShowChart] = useState(true)
  const [chartView, setChartView] = useState<'BAR_COMPARISON' | 'DONUT_SHARE'>('BAR_COMPARISON')

  // Search & Table Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'CLOSED'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Bulk Actions States
  const [bulkFinalizeModalOpen, setBulkFinalizeModalOpen] = useState(false)
  const [isBulkFinalizing, setIsBulkFinalizing] = useState(false)

  const [bulkReopenModalOpen, setBulkReopenModalOpen] = useState(false)
  const [bulkReopenReason, setBulkReopenReason] = useState('')
  const [isBulkReopening, setIsBulkReopening] = useState(false)

  // Print States
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [isGeneratingFullBook, setIsGeneratingFullBook] = useState(false)
  const [churchName, setChurchName] = useState('Gereja')

  const [reportData, setReportData] = useState<{
    tahun: number
    bulan: number | null
    totalSaldoAwal: number
    totalPemasukan: number
    totalPengeluaran: number
    totalSaldoAkhir: number
    scopes: {
      scopeId: string
      scopeCode: string
      scopeName: string
      laporanId: string
      saldoAwal: number
      totalPemasukan: number
      totalPengeluaran: number
      saldoAkhir: number
      status: 'DRAFT' | 'CLOSED'
    }[]
  } | null>(null)

  // Sync states when URL changes
  useEffect(() => {
    if (qTahun && qTahun !== tahun) setTahun(qTahun)
    if (qBulan && qBulan !== bulan) setBulan(qBulan)
  }, [qTahun, qBulan])

  const fetchConsolidated = useCallback(async () => {
    setLoading(true)
    const res = await getLaporanGabunganAction({
      tahun: Number(tahun),
      bulan: bulan !== 'all' ? Number(bulan) : undefined,
    })

    if (res.success && res.data) {
      setReportData(res.data)
      setSelectedRows({})
    } else {
      toast.error(res.error || 'Gagal memuat laporan gabungan.')
    }
    setLoading(false)
  }, [tahun, bulan])

  useEffect(() => {
    fetchConsolidated()
    getEffectivePrintConfig().then((pc) => {
      if (pc?.kop?.namaGereja) {
        setChurchName(pc.kop.namaGereja)
      }
    })
  }, [fetchConsolidated])

  // Handle MonthYearPicker Change and update URL
  const handleDateFilterChange = (val: { bulan: number | 'all'; tahun: number | 'all' }) => {
    const newTahun = String(val.tahun)
    const newBulan = String(val.bulan)
    setTahun(newTahun)
    setBulan(newBulan)

    const params = new URLSearchParams()
    if (newTahun !== 'all') params.set('tahun', newTahun)
    if (newBulan !== 'all') params.set('bulan', newBulan)
    router.push(`/dashboard/keuangan/laporan-gabungan?${params.toString()}`)
  }

  const rawScopes = reportData?.scopes || []

  // Filtered scopes based on search and status
  const filteredScopes = rawScopes.filter((s) => {
    const matchSearch =
      s.scopeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.scopeCode.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus =
      statusFilter === 'ALL' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filteredScopes.length / pageSize) || 1
  const paginatedScopes = filteredScopes.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id])
  const selectedCount = selectedIds.length
  const isAllSelected =
    filteredScopes.length > 0 && filteredScopes.every((s) => selectedRows[s.laporanId])
  const selectedScopesData = rawScopes.filter((s) => selectedRows[s.laporanId])

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = { ...selectedRows }
    filteredScopes.forEach((s) => {
      if (s.laporanId) updated[s.laporanId] = checked
    })
    setSelectedRows(updated)
  }

  const handleSelectRow = (laporanId: string, checked: boolean) => {
    setSelectedRows((prev) => ({ ...prev, [laporanId]: checked }))
  }

  // 1. Export CSV Handler
  const handleExportCsv = () => {
    const targets = selectedCount > 0 ? selectedScopesData : filteredScopes

    if (targets.length === 0) {
      toast.error('Tidak ada data departemen untuk diekspor.')
      return
    }

    const headers = [
      'Departemen / Scope Kas',
      'Kode Scope',
      'Periode',
      'Saldo Awal (Rp)',
      'Total Pemasukan (Rp)',
      'Total Pengeluaran (Rp)',
      'Saldo Akhir (Rp)',
      'Surplus/Defisit (Rp)',
      'Status Pembukuan',
    ]

    const periodeStr = bulan !== 'all' ? `${MONTH_NAMES[Number(bulan) - 1]} ${tahun}` : `Tahun ${tahun}`

    const rows = targets.map((s) => {
      const net = (s.totalPemasukan || 0) - (s.totalPengeluaran || 0)
      return [
        `"${(s.scopeName || '').replace(/"/g, '""')}"`,
        `"${s.scopeCode || '-'}"`,
        `"${periodeStr}"`,
        `"${s.saldoAwal || 0}"`,
        `"${s.totalPemasukan || 0}"`,
        `"${s.totalPengeluaran || 0}"`,
        `"${s.saldoAkhir || 0}"`,
        `"${net}"`,
        `"${s.status || 'DRAFT'}"`,
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    const cleanChurch = (churchName || 'Gereja').replace(/[^a-zA-Z0-9]/g, '_')
    link.setAttribute('download', `Neraca_Gabungan_${cleanChurch}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${targets.length} data scope kas ke CSV.`)
  }

  // 2. Standalone Clean Print Engine for A4 Consolidated Financial Sheet (Universal Print Layout - Landscape)
  const handleExecutePrint = async () => {
    const targets = selectedCount > 0 ? selectedScopesData : rawScopes
    if (targets.length === 0) {
      toast.error('Tidak ada data laporan untuk dicetak.')
      return
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=850')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const layoutRes = await getPrintLayoutConfigAction()
    const layout = layoutRes.data

    const totalSaldoAwal = targets.reduce((acc, curr) => acc + (curr.saldoAwal || 0), 0)
    const totalPemasukan = targets.reduce((acc, curr) => acc + (curr.totalPemasukan || 0), 0)
    const totalPengeluaran = targets.reduce((acc, curr) => acc + (curr.totalPengeluaran || 0), 0)
    const totalSaldoAkhir = targets.reduce((acc, curr) => acc + (curr.saldoAkhir || 0), 0)
    const periodeStr = bulan !== 'all' ? `${MONTH_NAMES[Number(bulan) - 1]} ${tahun}` : `Tahun ${tahun}`

    const rowsHtml = targets.map((s, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: 700; color: #0f172a;">${s.scopeName}</td>
        <td style="text-align: center; font-family: monospace; font-size: 9px;">${s.scopeCode}</td>
        <td style="text-align: right; font-family: monospace;">Rp ${s.saldoAwal.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-family: monospace; color: #16a34a; font-weight: 700;">+ Rp ${s.totalPemasukan.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-family: monospace; color: #dc2626; font-weight: 700;">- Rp ${s.totalPengeluaran.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #0f172a;">Rp ${s.saldoAkhir.toLocaleString('id-ID')}</td>
        <td style="text-align: center; font-size: 8.5px; font-weight: 700;">
          <span style="border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; background: ${s.status === 'CLOSED' ? '#f0fdf4' : '#f8fafc'}; color: ${s.status === 'CLOSED' ? '#166534' : '#475569'};">
            ${s.status}
          </span>
        </td>
      </tr>
    `).join('')

    const logoHtml = layout.kop.tampilkanLogo && layout.kop.logoUrl
      ? `<img src="${layout.kop.logoUrl}" alt="Logo" style="height: 46px; width: 46px; object-fit: contain; border-radius: 6px;" />`
      : `<div style="width: 42px; height: 42px; background: ${layout.kop.garisKopColor}; color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px;">G</div>`

    const borderBottomStyle = layout.kop.garisKopStyle === 'DOUBLE'
      ? `3px double ${layout.kop.garisKopColor}`
      : `2px solid ${layout.kop.garisKopColor}`

    const bendaharaTtd = layout.signatories.bendahara.ttdUrl && layout.options.modeTandaTangan !== 'MANUAL_LINE'
      ? `<img src="${layout.signatories.bendahara.ttdUrl}" alt="TTD" style="max-height: 46px; max-width: 120px; object-fit: contain;" />`
      : `<div style="height: 46px;"></div>`

    const ketuaMajelisTtd = layout.signatories.ketuaMajelis.ttdUrl && layout.options.modeTandaTangan !== 'MANUAL_LINE'
      ? `<img src="${layout.signatories.ketuaMajelis.ttdUrl}" alt="TTD" style="max-height: 46px; max-width: 120px; object-fit: contain;" />`
      : `<div style="height: 46px;"></div>`

    const gembalaTtd = layout.signatories.gembala.ttdUrl && layout.options.modeTandaTangan !== 'MANUAL_LINE'
      ? `<img src="${layout.signatories.gembala.ttdUrl}" alt="TTD" style="max-height: 46px; max-width: 120px; object-fit: contain;" />`
      : `<div style="height: 46px;"></div>`

    const stampHtml = layout.stempel.tampilkanStempel && layout.stempel.stempelUrl
      ? `<img src="${layout.stempel.stempelUrl}" alt="Stempel" style="position: absolute; right: 5px; top: 0; height: 50px; opacity: 0.8; pointer-events: none;" />`
      : ''

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Neraca Saldo Gabungan & Konsolidasi Kas (${targets.length} Departemen) - ${layout.kop.namaGereja}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
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
            font-size: 9.5px;
          }
          .kop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: ${borderBottomStyle};
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .title {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: -0.2px;
            color: ${layout.kop.garisKopColor};
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 8.5px;
            color: #475569;
          }
          .meta {
            text-align: right;
          }
          .badge {
            background: ${layout.kop.garisKopColor};
            color: #ffffff;
            font-size: 8.5px;
            font-weight: 800;
            padding: 2.5px 8px;
            border-radius: 4px;
            display: inline-block;
          }
          .date {
            font-size: 8.5px;
            font-family: monospace;
            color: #64748b;
            margin-top: 3px;
          }
          .doc-header {
            text-align: center;
            margin: 8px 0 12px 0;
          }
          .doc-header h2 {
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .doc-header p {
            font-size: 9.5px;
            color: #64748b;
            font-family: monospace;
            font-weight: bold;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }
          .stat-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 10px;
            text-align: center;
          }
          .stat-lbl {
            font-size: 8.5px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
          }
          .stat-val {
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 1px;
            font-family: monospace;
          }
          .reports-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin-bottom: 16px;
          }
          .reports-table th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
            font-weight: 800;
            text-align: left;
          }
          .reports-table td {
            border: 1px solid #e2e8f0;
            padding: 4px 6px;
            color: #1e293b;
          }
          .sheet-footer {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            padding-top: 16px;
            margin-top: 12px;
            border-top: 1px solid #e2e8f0;
          }
          .sign-box {
            text-align: center;
            font-size: 9px;
            color: #475569;
            width: 210px;
            position: relative;
          }
          .sign-name {
            border-top: 1px solid #0f172a;
            padding-top: 3px;
            font-weight: 800;
            color: #0f172a;
          }
          .footer-note {
            font-size: 8px;
            color: #94a3b8;
            margin-top: 12px;
            text-align: center;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="kop">
          <div class="brand">
            ${logoHtml}
            <div>
              <div class="title">${layout.kop.namaGereja}</div>
              <div class="subtitle">${layout.kop.subJudul} • ${layout.kop.kontak}</div>
              <div class="subtitle" style="font-style: italic; font-size: 8px;">${layout.kop.nomorIzin}</div>
            </div>
          </div>
          <div class="meta">
            <div class="badge">LEMBAR KONSOLIDASI RESMI</div>
            <div class="date">Tanggal: ${new Date().toLocaleDateString('id-ID')}</div>
          </div>
        </div>

        <div class="doc-header">
          <h2>NERACA SALDO GABUNGAN & KONSOLIDASI KAS GEREJA</h2>
          <p>PERIODE: ${periodeStr.toUpperCase()} • ${targets.length} POS KAS DEPARTEMEN</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-lbl">Total Saldo Awal Gabungan</div>
            <div class="stat-val">Rp ${totalSaldoAwal.toLocaleString('id-ID')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Total Penerimaan / Masuk (+)</div>
            <div class="stat-val" style="color: #16a34a;">+ Rp ${totalPemasukan.toLocaleString('id-ID')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Total Pengeluaran / Belanja (-)</div>
            <div class="stat-val" style="color: #dc2626;">- Rp ${totalPengeluaran.toLocaleString('id-ID')}</div>
          </div>
          <div class="stat-card" style="background: #0f172a; color: #ffffff; border-color: #0f172a;">
            <div class="stat-lbl" style="color: #94a3b8;">Total Posisi Saldo Kas Akhir</div>
            <div class="stat-val" style="color: #ffffff;">Rp ${totalSaldoAkhir.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <table class="reports-table">
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">No</th>
              <th>Pos Kas Pelayanan / Departemen</th>
              <th style="width: 75px; text-align: center;">Kode Scope</th>
              <th style="text-align: right; width: 110px;">Saldo Awal</th>
              <th style="text-align: right; width: 110px;">Penerimaan (+)</th>
              <th style="text-align: right; width: 110px;">Pengeluaran (-)</th>
              <th style="text-align: right; width: 120px;">Saldo Akhir (=)</th>
              <th style="width: 70px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 900;">
              <td colspan="3" style="text-align: center;">TOTAL KONSOLIDASI KAS GABUNGAN</td>
              <td style="text-align: right; font-family: monospace;">Rp ${totalSaldoAwal.toLocaleString('id-ID')}</td>
              <td style="text-align: right; font-family: monospace; color: #16a34a;">+ Rp ${totalPemasukan.toLocaleString('id-ID')}</td>
              <td style="text-align: right; font-family: monospace; color: #dc2626;">- Rp ${totalPengeluaran.toLocaleString('id-ID')}</td>
              <td style="text-align: right; font-family: monospace; color: #0f172a; font-size: 10px;">Rp ${totalSaldoAkhir.toLocaleString('id-ID')}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <!-- Signatures Section -->
        <div class="sheet-footer">
          <div class="sign-box">
            <div style="font-weight: 600; color: #475569;">${layout.signatories.bendahara.jabatan}</div>
            <div style="height: 46px; display: flex; align-items: center; justify-content: center;">
              ${bendaharaTtd}
            </div>
            <div class="sign-name">
              ${layout.signatories.bendahara.nama}${layout.signatories.bendahara.gelar ? ', ' + layout.signatories.bendahara.gelar : ''}
            </div>
            ${layout.signatories.bendahara.nomorInduk ? `<div style="font-size: 8px; color: #64748b; font-family: monospace;">NIP: ${layout.signatories.bendahara.nomorInduk}</div>` : ''}
          </div>

          <div class="sign-box">
            <div style="font-weight: 600; color: #475569;">${layout.signatories.ketuaMajelis.jabatan}</div>
            <div style="height: 46px; display: flex; align-items: center; justify-content: center;">
              ${ketuaMajelisTtd}
            </div>
            <div class="sign-name">
              ${layout.signatories.ketuaMajelis.nama}${layout.signatories.ketuaMajelis.gelar ? ', ' + layout.signatories.ketuaMajelis.gelar : ''}
            </div>
            ${layout.signatories.ketuaMajelis.nomorInduk ? `<div style="font-size: 8px; color: #64748b; font-family: monospace;">NIP: ${layout.signatories.ketuaMajelis.nomorInduk}</div>` : ''}
          </div>

          <div class="sign-box">
            <div style="font-weight: 600; color: #475569;">${layout.signatories.gembala.jabatan}</div>
            <div style="height: 46px; display: flex; align-items: center; justify-content: center; position: relative;">
              ${gembalaTtd}
              ${stampHtml}
            </div>
            <div class="sign-name">
              ${layout.signatories.gembala.nama}${layout.signatories.gembala.gelar ? ', ' + layout.signatories.gembala.gelar : ''}
            </div>
            ${layout.signatories.gembala.nomorInduk ? `<div style="font-size: 8px; color: #64748b; font-family: monospace;">NIP: ${layout.signatories.gembala.nomorInduk}</div>` : ''}
          </div>
        </div>

        ${layout.options.tampilkanWatermarkAudit ? `
          <div class="footer-note">
            ${layout.options.catatanKakiResmi} • Verifikasi Dokumen SHA-256 Otentik ${escapeHtml(layout.kop?.namaGereja || 'Gereja')}.
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

  // 3. Multi-Page Comprehensive Church Consolidation Book Print Engine (A4 Portrait Multi-Page)
  const handleExecuteFullBookPrint = async () => {
    setIsGeneratingFullBook(true)
    const res = await getConsolidatedFullBookPrintDataAction({
      tahun: Number(tahun),
      bulan: bulan !== 'all' ? Number(bulan) : undefined,
    })

    if (!res.success || !res.data) {
      toast.error(res.error || 'Gagal memuat bundel buku LPJ konsolidasi.')
      setIsGeneratingFullBook(false)
      return
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=900')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      setIsGeneratingFullBook(false)
      return
    }

    const layoutRes = await getPrintLayoutConfigAction()
    const layout = layoutRes.data
    const data = res.data

    const periodeTitle = bulan !== 'all' ? `${MONTH_NAMES[Number(bulan) - 1]} ${tahun}` : `Tahun ${tahun}`

    const logoHtml = layout.kop.tampilkanLogo && layout.kop.logoUrl
      ? `<img src="${layout.kop.logoUrl}" alt="Logo" style="height: 52px; width: 52px; object-fit: contain; border-radius: 8px;" />`
      : `<div style="width: 48px; height: 48px; background: ${layout.kop.garisKopColor}; color: #ffffff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 22px;">G</div>`

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
      ? `<img src="${layout.stempel.stempelUrl}" alt="Stempel" style="position: absolute; right: 10px; top: -5px; height: 55px; opacity: 0.8; pointer-events: none;" />`
      : ''

    // Page 2: Summary Matrix Table Rows
    const summaryRowsHtml = data.scopes.map((s, idx) => `
      <tr>
        <td style="text-align: center; font-size: 9px;">${idx + 1}</td>
        <td style="font-weight: 700; color: #0f172a; font-size: 9.5px;">${s.scopeName}</td>
        <td style="text-align: center; font-family: monospace; font-size: 8.5px;">${s.scopeCode}</td>
        <td style="text-align: right; font-family: monospace; font-size: 9px;">Rp ${s.saldoAwal.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-family: monospace; color: #16a34a; font-weight: 700; font-size: 9px;">+ Rp ${s.totalPemasukan.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-family: monospace; color: #dc2626; font-weight: 700; font-size: 9px;">- Rp ${s.totalPengeluaran.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #0f172a; font-size: 9.5px;">Rp ${s.saldoAkhir.toLocaleString('id-ID')}</td>
      </tr>
    `).join('')

    // Page 3+: Detail Mutasi per Pos Kas
    const scopeDetailsHtml = data.scopes.map((s, idx) => {
      const hasMasuk = s.transaksiPemasukan.length > 0
      const hasKeluar = s.transaksiPengeluaran.length > 0

      const masukRows = s.transaksiPemasukan.map((t, tIdx) => `
        <tr>
          <td style="text-align: center; width: 25px;">${tIdx + 1}</td>
          <td style="font-family: monospace; width: 75px;">${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
          <td style="font-family: monospace; width: 95px; font-size: 8px;">${t.nomorReferensi || '-'}</td>
          <td style="font-weight: 600;">${t.kategori}</td>
          <td style="color: #64748b; font-size: 8.5px;">${t.catatan || '-'}</td>
          <td style="text-align: right; font-family: monospace; color: #16a34a; font-weight: 700; width: 95px;">+ Rp ${t.nominal.toLocaleString('id-ID')}</td>
        </tr>
      `).join('')

      const keluarRows = s.transaksiPengeluaran.map((t, tIdx) => `
        <tr>
          <td style="text-align: center; width: 25px;">${tIdx + 1}</td>
          <td style="font-family: monospace; width: 75px;">${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
          <td style="font-family: monospace; width: 95px; font-size: 8px;">${t.nomorReferensi || '-'}</td>
          <td style="font-weight: 600;">${t.kategori}</td>
          <td style="color: #64748b; font-size: 8.5px;">${t.catatan || '-'}</td>
          <td style="text-align: right; font-family: monospace; color: #dc2626; font-weight: 700; width: 95px;">- Rp ${t.nominal.toLocaleString('id-ID')}</td>
        </tr>
      `).join('')

      return `
        <div class="page-break" style="padding-top: 8px;">
          <div class="kop" style="margin-bottom: 12px;">
            <div class="brand">
              ${logoHtml}
              <div>
                <div class="title" style="font-size: 11.5px;">${layout.kop.namaGereja}</div>
                <div class="subtitle" style="font-size: 8px;">${layout.kop.subJudul} • ${layout.kop.kontak}</div>
              </div>
            </div>
            <div class="meta">
              <div class="badge" style="font-size: 8px;">LAMPIRAN RINCIAN MUTASI [${idx + 1}/${data.scopes.length}]</div>
              <div class="date" style="font-size: 8px;">Periode: ${periodeTitle}</div>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${s.scopeName} (${s.scopeCode})</div>
              <div style="font-size: 8.5px; color: #64748b;">Rincian Transaksi Kas Masuk & Kas Keluar</div>
            </div>
            <div style="text-align: right; font-family: monospace;">
              <div style="font-size: 8.5px; color: #64748b;">Posisi Saldo Akhir:</div>
              <div style="font-size: 12px; font-weight: 900; color: #0f172a;">Rp ${s.saldoAkhir.toLocaleString('id-ID')}</div>
            </div>
          </div>

          <!-- Pemasukan Table -->
          <div style="margin-bottom: 12px;">
            <div style="font-size: 9.5px; font-weight: 800; color: #16a34a; margin-bottom: 4px; display: flex; justify-content: space-between;">
              <span>A. DAFTAR PENERIMAAN / KAS MASUK</span>
              <span style="font-family: monospace;">Total: + Rp ${s.totalPemasukan.toLocaleString('id-ID')}</span>
            </div>
            <table class="detail-table">
              <thead>
                <tr>
                  <th style="text-align: center;">No</th>
                  <th>Tanggal</th>
                  <th>No. Ref</th>
                  <th>Kategori</th>
                  <th>Keterangan / Catatan</th>
                  <th style="text-align: right;">Nominal</th>
                </tr>
              </thead>
              <tbody>
                ${hasMasuk ? masukRows : '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 6px;">Tidak ada transaksi kas masuk pada periode ini.</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Pengeluaran Table -->
          <div>
            <div style="font-size: 9.5px; font-weight: 800; color: #dc2626; margin-bottom: 4px; display: flex; justify-content: space-between;">
              <span>B. DAFTAR BEBAN & BELANJA OPERASIONAL / KAS KELUAR</span>
              <span style="font-family: monospace;">Total: - Rp ${s.totalPengeluaran.toLocaleString('id-ID')}</span>
            </div>
            <table class="detail-table">
              <thead>
                <tr>
                  <th style="text-align: center;">No</th>
                  <th>Tanggal</th>
                  <th>No. Ref</th>
                  <th>Kategori</th>
                  <th>Keterangan / Catatan</th>
                  <th style="text-align: right;">Nominal</th>
                </tr>
              </thead>
              <tbody>
                ${hasKeluar ? keluarRows : '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 6px;">Tidak ada transaksi kas keluar pada periode ini.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `
    }).join('')

    const fullBookHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Buku Bundel LPJ Konsolidasi Keuangan Gereja - ${layout.kop.namaGereja}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            font-size: 9px;
          }
          .page-break {
            page-break-before: always;
          }
          .kop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: ${borderBottomStyle};
            padding-bottom: 8px;
            margin-bottom: 14px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .title {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: -0.2px;
            color: ${layout.kop.garisKopColor};
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 8.5px;
            color: #475569;
          }
          .meta {
            text-align: right;
          }
          .badge {
            background: ${layout.kop.garisKopColor};
            color: #ffffff;
            font-size: 8.5px;
            font-weight: 800;
            padding: 2.5px 8px;
            border-radius: 4px;
            display: inline-block;
          }
          .date {
            font-size: 8px;
            font-family: monospace;
            color: #64748b;
            margin-top: 3px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }
          .stat-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
          }
          .stat-lbl {
            font-size: 8px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
          }
          .stat-val {
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 2px;
            font-family: monospace;
          }
          .detail-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
            margin-bottom: 8px;
          }
          .detail-table th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
            font-weight: 800;
            text-align: left;
          }
          .detail-table td {
            border: 1px solid #e2e8f0;
            padding: 3.5px 5px;
            color: #1e293b;
          }
          .cover-container {
            height: 90vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            padding: 30px 10px;
          }
          .cover-title {
            font-size: 20px;
            font-weight: 900;
            color: ${layout.kop.garisKopColor};
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 16px;
            line-height: 1.3;
          }
          .sheet-footer {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            padding-top: 14px;
            margin-top: 14px;
            border-top: 1px solid #e2e8f0;
          }
          .sign-box {
            text-align: center;
            font-size: 8.5px;
            color: #475569;
            width: 180px;
            position: relative;
          }
          .sign-name {
            border-top: 1px solid #0f172a;
            padding-top: 3px;
            font-weight: 800;
            color: #0f172a;
          }
          .footer-note {
            font-size: 7.5px;
            color: #94a3b8;
            margin-top: 10px;
            text-align: center;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <!-- ══════════════════════════════════════════
             HALAMAN 1: COVER SAMPUL LPJ KONSOLIDASI
             ══════════════════════════════════════════ -->
        <div class="cover-container">
          <div style="border-bottom: 2px solid ${layout.kop.garisKopColor}; padding-bottom: 12px; width: 100%;">
            ${logoHtml}
            <div style="font-size: 14px; font-weight: 900; margin-top: 6px; text-transform: uppercase; color: #0f172a;">
              ${layout.kop.namaGereja}
            </div>
            <div style="font-size: 8.5px; color: #64748b;">
              ${layout.kop.subJudul} • ${layout.kop.kontak}
            </div>
          </div>

          <div style="margin: 40px 0;">
            <div style="font-size: 10px; letter-spacing: 2px; font-weight: 800; color: #64748b; text-transform: uppercase;">
              DOKUMEN RESMI PEMBUKUAN GEREJA
            </div>
            <div class="cover-title">
              BUKU LAPORAN PERTANGGUNGJAWABAN (LPJ)<br />KONSOLIDASI KEUANGAN GEREJA
            </div>
            <div style="font-size: 13px; font-weight: bold; font-family: monospace; color: #0f172a; margin-top: 12px;">
              PERIODE: ${periodeTitle.toUpperCase()}
            </div>
            <div style="font-size: 9.5px; color: #475569; margin-top: 6px;">
              Memuat ${data.scopes.length} Pos Pelayanan / Departemen Kas Aktif
            </div>
          </div>

          <div style="width: 100%; max-width: 500px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">
              IKHTISAR SALDO KONSOLIDASI
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: monospace; font-size: 9.5px; text-align: left;">
              <div>Saldo Awal: <b>Rp ${data.totalSaldoAwal.toLocaleString('id-ID')}</b></div>
              <div style="color: #16a34a;">Kas Masuk: <b>+ Rp ${data.totalPemasukan.toLocaleString('id-ID')}</b></div>
              <div style="color: #dc2626;">Kas Keluar: <b>- Rp ${data.totalPengeluaran.toLocaleString('id-ID')}</b></div>
              <div style="color: #0f172a;">Saldo Akhir: <b>Rp ${data.totalSaldoAkhir.toLocaleString('id-ID')}</b></div>
            </div>
          </div>

          <div style="font-size: 8px; color: #94a3b8; font-family: monospace;">
            Dicetak Otomatis oleh Sistem CMS Keuangan ${escapeHtml(layout.kop?.namaGereja || 'Gereja')} pada ${new Date().toLocaleDateString('id-ID')}.
          </div>
        </div>

        <!-- ══════════════════════════════════════════
             HALAMAN 2: MATRIKS NERACA SALDO & PENGESAHAN
             ══════════════════════════════════════════ -->
        <div class="page-break" style="padding-top: 8px;">
          <div class="kop">
            <div class="brand">
              ${logoHtml}
              <div>
                <div class="title">${layout.kop.namaGereja}</div>
                <div class="subtitle">${layout.kop.subJudul} • ${layout.kop.kontak}</div>
              </div>
            </div>
            <div class="meta">
              <div class="badge">MATRIKS KONSOLIDASI</div>
              <div class="date">Tanggal: ${new Date().toLocaleDateString('id-ID')}</div>
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 12px;">
            <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase;">
              REKAPITULASI NERACA SALDO POS KAS GEREJA
            </h2>
            <p style="font-size: 9px; font-family: monospace; color: #64748b; font-weight: bold;">
              PERIODE: ${periodeTitle.toUpperCase()} • ${data.scopes.length} POS PELAYANAN
            </p>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-lbl">Saldo Awal Gabungan</div>
              <div class="stat-val">Rp ${data.totalSaldoAwal.toLocaleString('id-ID')}</div>
            </div>
            <div class="stat-card">
              <div class="stat-lbl">Total Kas Masuk</div>
              <div class="stat-val" style="color: #16a34a;">+ Rp ${data.totalPemasukan.toLocaleString('id-ID')}</div>
            </div>
            <div class="stat-card">
              <div class="stat-lbl">Total Kas Keluar</div>
              <div class="stat-val" style="color: #dc2626;">- Rp ${data.totalPengeluaran.toLocaleString('id-ID')}</div>
            </div>
            <div class="stat-card" style="background: #0f172a; color: #ffffff;">
              <div class="stat-lbl" style="color: #94a3b8;">Saldo Akhir Kas</div>
              <div class="stat-val" style="color: #ffffff;">Rp ${data.totalSaldoAkhir.toLocaleString('id-ID')}</div>
            </div>
          </div>

          <table class="detail-table" style="margin-bottom: 14px;">
            <thead>
              <tr>
                <th style="text-align: center; width: 25px;">No</th>
                <th>Pos Kas Pelayanan / Departemen</th>
                <th style="text-align: center; width: 65px;">Kode</th>
                <th style="text-align: right; width: 95px;">Saldo Awal</th>
                <th style="text-align: right; width: 95px;">Penerimaan (+)</th>
                <th style="text-align: right; width: 95px;">Pengeluaran (-)</th>
                <th style="text-align: right; width: 105px;">Saldo Akhir (=)</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 900;">
                <td colspan="3" style="text-align: center;">TOTAL KONSOLIDASI SELURUH POS KAS</td>
                <td style="text-align: right; font-family: monospace;">Rp ${data.totalSaldoAwal.toLocaleString('id-ID')}</td>
                <td style="text-align: right; font-family: monospace; color: #16a34a;">+ Rp ${data.totalPemasukan.toLocaleString('id-ID')}</td>
                <td style="text-align: right; font-family: monospace; color: #dc2626;">- Rp ${data.totalPengeluaran.toLocaleString('id-ID')}</td>
                <td style="text-align: right; font-family: monospace; color: #0f172a;">Rp ${data.totalSaldoAkhir.toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          </table>

          <!-- 3 Signatures -->
          <div class="sheet-footer">
            <div class="sign-box">
              <div style="font-weight: 600; color: #475569;">${layout.signatories.bendahara.jabatan}</div>
              <div style="height: 48px; display: flex; align-items: center; justify-content: center;">
                ${bendaharaTtd}
              </div>
              <div class="sign-name">
                ${layout.signatories.bendahara.nama}${layout.signatories.bendahara.gelar ? ', ' + layout.signatories.bendahara.gelar : ''}
              </div>
              ${layout.signatories.bendahara.nomorInduk ? `<div style="font-size: 7.5px; color: #64748b; font-family: monospace;">NIP: ${layout.signatories.bendahara.nomorInduk}</div>` : ''}
            </div>

            <div class="sign-box">
              <div style="font-weight: 600; color: #475569;">${layout.signatories.ketuaMajelis.jabatan}</div>
              <div style="height: 48px; display: flex; align-items: center; justify-content: center;">
                ${ketuaMajelisTtd}
              </div>
              <div class="sign-name">
                ${layout.signatories.ketuaMajelis.nama}${layout.signatories.ketuaMajelis.gelar ? ', ' + layout.signatories.ketuaMajelis.gelar : ''}
              </div>
              ${layout.signatories.ketuaMajelis.nomorInduk ? `<div style="font-size: 7.5px; color: #64748b; font-family: monospace;">NIP: ${layout.signatories.ketuaMajelis.nomorInduk}</div>` : ''}
            </div>

            <div class="sign-box">
              <div style="font-weight: 600; color: #475569;">${layout.signatories.gembala.jabatan}</div>
              <div style="height: 48px; display: flex; align-items: center; justify-content: center; position: relative;">
                ${gembalaTtd}
                ${stampHtml}
              </div>
              <div class="sign-name">
                ${layout.signatories.gembala.nama}${layout.signatories.gembala.gelar ? ', ' + layout.signatories.gembala.gelar : ''}
              </div>
              ${layout.signatories.gembala.nomorInduk ? `<div style="font-size: 7.5px; color: #64748b; font-family: monospace;">NIP: ${layout.signatories.gembala.nomorInduk}</div>` : ''}
            </div>
          </div>

          ${layout.options.tampilkanWatermarkAudit ? `
            <div class="footer-note">
              ${layout.options.catatanKakiResmi} • Verifikasi Dokumen SHA-256 Otentik ${escapeHtml(layout.kop?.namaGereja || 'Gereja')}.
            </div>
          ` : ''}
        </div>

        <!-- ══════════════════════════════════════════
             HALAMAN 3+: RINCIAN MUTASI PER POS KAS
             ══════════════════════════════════════════ -->
        ${scopeDetailsHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(fullBookHtml)
    printWindow.document.close()
    setIsGeneratingFullBook(false)
  }

  // 4. Bulk Finalize Submit
  const handleBulkFinalizeSubmit = async () => {
    if (selectedIds.length === 0) return
    setIsBulkFinalizing(true)
    const res = await bulkFinalizeLaporanAction({ ids: selectedIds })
    setIsBulkFinalizing(false)
    if (res.success) {
      toast.success(res.message)
      setBulkFinalizeModalOpen(false)
      setSelectedRows({})
      fetchConsolidated()
    } else {
      toast.error(res.error || 'Gagal menutup buku scope keuangan.')
    }
  }

  // 5. Bulk Reopen Submit
  const handleBulkReopenSubmit = async () => {
    if (selectedIds.length === 0) return
    if (!bulkReopenReason.trim() || bulkReopenReason.trim().length < 10) {
      toast.error('Alasan buka buku wajib diisi minimal 10 karakter.')
      return
    }
    setIsBulkReopening(true)
    const res = await bulkReopenLaporanAction({
      ids: selectedIds,
      reason: bulkReopenReason.trim(),
    })
    setIsBulkReopening(false)
    if (res.success) {
      toast.success(res.message)
      setBulkReopenModalOpen(false)
      setBulkReopenReason('')
      setSelectedRows({})
      fetchConsolidated()
    } else {
      toast.error(res.error || 'Gagal membuka kembali scope keuangan.')
    }
  }

  // Prepare Data for Charts
  const barChartData = rawScopes.map((s) => ({
    name: s.scopeName,
    fullName: s.scopeName,
    code: s.scopeCode,
    pemasukan: s.totalPemasukan,
    pengeluaran: s.totalPengeluaran,
    saldoAkhir: s.saldoAkhir,
    net: s.totalPemasukan - s.totalPengeluaran,
  }))

  const totalPositiveBalance = rawScopes.reduce(
    (acc, curr) => acc + (curr.saldoAkhir > 0 ? curr.saldoAkhir : 0),
    0
  )

  const donutChartData = rawScopes
    .filter((s) => s.saldoAkhir > 0)
    .map((s) => ({
      name: s.scopeName,
      value: s.saldoAkhir,
      percent: totalPositiveBalance > 0 ? ((s.saldoAkhir / totalPositiveBalance) * 100).toFixed(1) : '0',
    }))

  return (
    <div className='space-y-6 max-w-6xl mx-auto pb-20'>
      {/* Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div className='flex items-start gap-3'>
          <Button asChild variant='ghost' size='icon' className='size-8 shrink-0 mt-0.5'>
            <Link href='/dashboard/keuangan'>
              <ArrowLeft className='size-4' />
            </Link>
          </Button>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Laporan Gabungan</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Konsolidasi neraca saldo seluruh pos kas pelayanan.
            </p>
          </div>
        </div>

        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto'>
          <div className='w-full sm:w-auto'>
            <MonthYearPicker
              isFilter
              className='w-full sm:w-auto'
              value={{
                bulan: bulan !== 'all' ? Number(bulan) : 'all',
                tahun: tahun !== 'all' ? Number(tahun) : 'all',
              }}
              onChange={handleDateFilterChange}
            />
          </div>

          <div className='grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto'>
            <Button
              variant='outline'
              size='sm'
              className='h-8.5 sm:h-8 gap-1.5 text-xs font-semibold w-full sm:w-auto justify-center'
              onClick={handleExecutePrint}
              title='Cetak Ringkasan Neraca Saldo A4'
            >
              <Printer className='size-3.5' /> Cetak Neraca
            </Button>

            <Button
              size='sm'
              className='h-8.5 sm:h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-xs w-full sm:w-auto justify-center'
              onClick={handleExecuteFullBookPrint}
              disabled={isGeneratingFullBook}
              title='Cetak Bundel Buku LPJ A4'
            >
              {isGeneratingFullBook ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <BookOpen className='size-3.5' />
              )}
              {isGeneratingFullBook ? 'Menyiapkan...' : 'Cetak LPJ (A4)'}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center min-h-87.5 text-muted-foreground gap-2 text-sm'>
          <Loader2 className='size-5 animate-spin text-primary' /> Mengompilasi laporan keuangan gabungan...
        </div>
      ) : reportData ? (
        <>
          {/* Main Consolidated Total Card */}
          <Card className='shadow-xs border-primary/20 bg-primary/5'>
            <CardContent className='p-6'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                <div>
                  <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider block'>
                    TOTAL KAS GABUNGAN SELURUH SCOPE ({bulan !== 'all' ? `${MONTH_NAMES[Number(bulan) - 1]} ` : ''}{tahun})
                  </span>
                  <div className='text-3xl font-black font-mono text-primary mt-1'>
                    Rp {reportData.totalSaldoAkhir.toLocaleString('id-ID')}
                  </div>
                  <div className='text-xs text-muted-foreground mt-1'>
                    Konsolidasi dari {reportData.scopes.length} scope kas departemen
                  </div>
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-mono gap-1 border-emerald-500/20'>
                    <CheckCircle2 className='size-3.5' /> SEIMBANG & AUDITED (SHA-256)
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aggregate Stat Breakdown Cards */}
          <div className='grid gap-3 sm:grid-cols-3'>
            <Card className='shadow-2xs bg-card'>
              <CardHeader className='pb-1 pt-3 px-3.5'>
                <CardTitle className='text-xs font-semibold text-muted-foreground uppercase'>TOTAL SALDO AWAL</CardTitle>
              </CardHeader>
              <CardContent className='pb-3 pt-0 px-3.5'>
                <div className='text-xl font-bold font-mono text-foreground'>
                  Rp {reportData.totalSaldoAwal.toLocaleString('id-ID')}
                </div>
                <div className='text-[11px] text-muted-foreground mt-0.5'>Bawaan periode sebelumnya</div>
              </CardContent>
            </Card>

            <Card className='shadow-2xs bg-card'>
              <CardHeader className='pb-1 pt-3 px-3.5'>
                <CardTitle className='text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase'>TOTAL PEMASUKAN GEREJA</CardTitle>
              </CardHeader>
              <CardContent className='pb-3 pt-0 px-3.5'>
                <div className='text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1'>
                  <ArrowDownRight className='size-4' /> +Rp {reportData.totalPemasukan.toLocaleString('id-ID')}
                </div>
                <div className='text-[11px] text-muted-foreground mt-0.5'>Penerimaan seluruh departemen</div>
              </CardContent>
            </Card>

            <Card className='shadow-2xs bg-card'>
              <CardHeader className='pb-1 pt-3 px-3.5'>
                <CardTitle className='text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase'>TOTAL PENGELUARAN GEREJA</CardTitle>
              </CardHeader>
              <CardContent className='pb-3 pt-0 px-3.5'>
                <div className='text-xl font-bold font-mono text-rose-600 dark:text-rose-400 flex items-center gap-1'>
                  <ArrowUpRight className='size-4' /> -Rp {reportData.totalPengeluaran.toLocaleString('id-ID')}
                </div>
                <div className='text-[11px] text-muted-foreground mt-0.5'>Beban & belanja operasional</div>
              </CardContent>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: ANALITIK & GRAFIK KONSOLIDASI KEUANGAN GEREJA
              ═══════════════════════════════════════════════════════════════ */}
          <Card className='shadow-xs overflow-hidden border-border/80'>
            <CardHeader className='pb-3 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b bg-muted/20'>
              <div className='space-y-0.5'>
                <CardTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
                  <BarChart3 className='size-4 text-primary shrink-0' />
                  Analitik & Distribusi Dana
                </CardTitle>
                <CardDescription className='text-xs'>
                  Visualisasi arus kas masuk, keluar, dan proporsi saldo per pos kas.
                </CardDescription>
              </div>

              <div className='flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto'>
                {/* View Toggle */}
                <div className='flex items-center bg-background border rounded-lg p-0.5'>
                  <Button
                    size='sm'
                    variant={chartView === 'BAR_COMPARISON' ? 'secondary' : 'ghost'}
                    onClick={() => setChartView('BAR_COMPARISON')}
                    className='h-7 text-xs px-2.5 gap-1.5 font-semibold'
                    title='Perbandingan Arus Kas'
                  >
                    <BarChart3 className='size-3.5' />
                    <span className='text-[11px] sm:text-xs'>Arus Kas</span>
                  </Button>
                  <Button
                    size='sm'
                    variant={chartView === 'DONUT_SHARE' ? 'secondary' : 'ghost'}
                    onClick={() => setChartView('DONUT_SHARE')}
                    className='h-7 text-xs px-2.5 gap-1.5 font-semibold'
                    title='Proporsi Saldo Kas'
                  >
                    <PieIcon className='size-3.5' />
                    <span className='text-[11px] sm:text-xs'>Proporsi</span>
                  </Button>
                </div>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setShowChart(!showChart)}
                  className='h-7 text-xs gap-1 font-semibold bg-background shrink-0'
                >
                  {showChart ? <ChevronUp className='size-3.5' /> : <ChevronDown className='size-3.5' />}
                  {showChart ? 'Tutup' : 'Lihat'}
                </Button>
              </div>
            </CardHeader>

            {showChart && (
              <CardContent className='p-3.5 sm:p-6'>
                {rawScopes.length === 0 ? (
                  <div className='text-center py-10 text-xs text-muted-foreground'>
                    Belum ada data pos kas untuk ditampilkan.
                  </div>
                ) : chartView === 'BAR_COMPARISON' ? (
                  /* ── BAR CHART: PERBANDINGAN ARUS KAS ANTAR POS ── */
                  <div className='space-y-2'>
                    {/* Clean HTML Legend (Responsive & Never Overlaps) */}
                    <div className='flex flex-wrap items-center justify-end gap-3 text-xs'>
                      <div className='flex items-center gap-1.5 font-medium'>
                        <span className='size-2.5 rounded-full bg-[#16a34a]' />
                        <span className='text-xs text-foreground'>Kas Masuk</span>
                      </div>
                      <div className='flex items-center gap-1.5 font-medium'>
                        <span className='size-2.5 rounded-full bg-[#dc2626]' />
                        <span className='text-xs text-foreground'>Kas Keluar</span>
                      </div>
                    </div>

                    {/* Scrollable Container on Mobile */}
                    <div className='overflow-x-auto pb-2'>
                      <div className='h-72.5 sm:h-82.5' style={{ minWidth: Math.max(520, barChartData.length * 110) }}>
                        <ResponsiveContainer width='100%' height='100%'>
                          <ComposedChart
                            data={barChartData}
                            margin={{ top: 15, right: 20, left: 5, bottom: 45 }}
                          >
                            <CartesianGrid strokeDasharray='3 3' className='stroke-muted/40' vertical={false} />
                            <XAxis
                              dataKey='name'
                              className='text-[11px] font-medium'
                              tick={{ fill: 'currentColor', opacity: 0.85, fontSize: 11 }}
                              interval={0}
                              angle={-20}
                              textAnchor='end'
                              height={50}
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
                            <RechartsTooltip
                              allowEscapeViewBox={{ x: false, y: false }}
                              wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload
                                  return (
                                    <div className='bg-card/95 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-xl text-xs space-y-1.5 w-48 sm:w-52'>
                                      <div className='flex items-center justify-between border-b pb-1 font-bold text-foreground'>
                                        <span className='truncate text-xs'>{d.fullName}</span>
                                        <Badge variant='outline' className='text-[9px] font-mono px-1 py-0 shrink-0'>
                                          {d.code}
                                        </Badge>
                                      </div>
                                      <div className='space-y-1 font-mono text-[10.5px] sm:text-[11px]'>
                                        <div className='flex justify-between text-emerald-600 font-bold'>
                                          <span>Kas Masuk:</span>
                                          <span>+ Rp {d.pemasukan.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className='flex justify-between text-rose-600 font-bold'>
                                          <span>Kas Keluar:</span>
                                          <span>- Rp {d.pengeluaran.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className='flex justify-between text-muted-foreground border-t pt-1'>
                                          <span>Net Kas:</span>
                                          <span className={d.net >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                                            {d.net >= 0 ? '+ ' : ''}Rp {d.net.toLocaleString('id-ID')}
                                          </span>
                                        </div>
                                        <div className='flex justify-between font-bold text-foreground'>
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
                              name='Kas Keluar (Beban)'
                              fill='#dc2626'
                              radius={[4, 4, 0, 0]}
                              maxBarSize={28}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── DONUT CHART: PROPORSI SALDO KAS GEREJA ── */
                  <div className='flex flex-col md:flex-row items-center gap-6 py-1'>
                    <div className='h-55 sm:h-65 w-full md:w-1/2 flex items-center justify-center shrink-0'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Pie
                            data={donutChartData}
                            cx='50%'
                            cy='50%'
                            innerRadius={52}
                            outerRadius={82}
                            paddingAngle={3}
                            dataKey='value'
                          >
                            {donutChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const d = payload[0].payload
                                return (
                                  <div className='bg-card/95 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-xl text-xs space-y-1'>
                                    <div className='font-bold text-foreground'>{d.name}</div>
                                    <div className='text-primary font-mono font-bold'>
                                      Rp {d.value.toLocaleString('id-ID')} ({d.percent}%)
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className='w-full md:w-1/2 max-h-64 sm:max-h-72 overflow-y-auto space-y-1 pe-1 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4'>
                      <div className='text-xs font-bold text-muted-foreground uppercase mb-2'>
                        Distribusi Dana Pos Kas:
                      </div>
                      {donutChartData.map((item, idx) => (
                        <div key={item.name} className='flex items-center justify-between text-xs py-1.5 border-b border-border/50 gap-2'>
                          <div className='flex items-center gap-2 min-w-0'>
                            <div
                              className='size-2.5 rounded-full shrink-0'
                              style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                            />
                            <span className='font-medium text-foreground truncate'>
                              {item.name}
                            </span>
                          </div>
                          <div className='font-mono font-semibold text-end shrink-0 whitespace-nowrap text-xs'>
                            <span className='text-foreground'>Rp {item.value.toLocaleString('id-ID')}</span>
                            <span className='text-muted-foreground ms-1.5 text-[11px] font-normal'>({item.percent}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: REKAPITULASI RINCI PER SCOPE DEPARTEMEN
              ═══════════════════════════════════════════════════════════════ */}
          <Card className='shadow-xs bg-card overflow-hidden'>
            <CardHeader className='pb-3 pt-4 px-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div>
                <CardTitle className='text-sm sm:text-base flex items-center gap-2'>
                  <FileText className='size-4 text-primary shrink-0' /> Rekapitulasi Pos Kas
                </CardTitle>
                <CardDescription className='text-xs'>
                  Daftar mutasi saldo dan serapan kas per pos pelayanan.
                </CardDescription>
              </div>

              {/* Search & Status Filter Controls */}
              <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto'>
                <div className='relative w-full sm:w-52'>
                  <Search className='size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    placeholder='Cari nama / kode...'
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className='h-8 text-xs pl-8 pr-3 bg-background w-full'
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setCurrentPage(1)
                      }}
                      className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                    >
                      <X className='size-3' />
                    </button>
                  )}
                </div>

                <div className='grid grid-cols-3 sm:flex items-center bg-muted/50 border rounded-lg p-0.5 w-full sm:w-auto'>
                  <Button
                    size='sm'
                    variant={statusFilter === 'ALL' ? 'secondary' : 'ghost'}
                    onClick={() => {
                      setStatusFilter('ALL')
                      setCurrentPage(1)
                    }}
                    className='h-7 text-xs font-medium justify-center'
                  >
                    Semua
                  </Button>
                  <Button
                    size='sm'
                    variant={statusFilter === 'DRAFT' ? 'secondary' : 'ghost'}
                    onClick={() => {
                      setStatusFilter('DRAFT')
                      setCurrentPage(1)
                    }}
                    className='h-7 text-xs font-medium text-emerald-600 justify-center'
                  >
                    Draft
                  </Button>
                  <Button
                    size='sm'
                    variant={statusFilter === 'CLOSED' ? 'secondary' : 'ghost'}
                    onClick={() => {
                      setStatusFilter('CLOSED')
                      setCurrentPage(1)
                    }}
                    className='h-7 text-xs font-medium text-muted-foreground justify-center'
                  >
                    Closed
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className='p-0'>
              <div className='overflow-x-auto'>
                <Table className='min-w-187.5'>
                  <TableHeader>
                    <TableRow className='hover:bg-transparent border-b bg-muted/10'>
                      <TableHead className='w-10 px-3 text-center'>
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={(c) => handleSelectAll(!!c)}
                          aria-label='Pilih semua scope'
                        />
                      </TableHead>
                      <TableHead className='px-4 text-xs font-semibold'>Departemen / Scope Kas</TableHead>
                      <TableHead className='px-4 text-xs font-semibold text-end'>Saldo Awal</TableHead>
                      <TableHead className='px-4 text-xs font-semibold text-end'>Kas Masuk (+)</TableHead>
                      <TableHead className='px-4 text-xs font-semibold text-end'>Kas Keluar (-)</TableHead>
                      <TableHead className='px-4 text-xs font-semibold text-end'>Arus Kas Bersih</TableHead>
                      <TableHead className='px-4 text-xs font-semibold text-end'>Saldo Akhir</TableHead>
                      <TableHead className='px-4 text-xs font-semibold text-center'>Status</TableHead>
                      <TableHead className='w-25 px-4 text-end'>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScopes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className='text-center py-10 text-xs text-muted-foreground'>
                          Tidak ada pos kas yang sesuai dengan kriteria pencarian / filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedScopes.map((scope) => {
                        const isSelected = !!selectedRows[scope.laporanId]
                        const netKas = (scope.totalPemasukan || 0) - (scope.totalPengeluaran || 0)

                        return (
                          <TableRow
                            key={scope.scopeId}
                            className={`hover:bg-muted/40 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                          >
                            <TableCell className='px-3 py-2.5 text-center'>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(c) => handleSelectRow(scope.laporanId, !!c)}
                                aria-label={`Pilih ${scope.scopeName}`}
                              />
                            </TableCell>
                            <TableCell className='px-4 py-2.5'>
                              <Link
                                href={`/dashboard/keuangan/scope/${scope.scopeCode}`}
                                className='font-bold text-sm text-foreground hover:underline hover:text-primary'
                              >
                                {scope.scopeName}
                              </Link>
                              <span className='text-muted-foreground text-[11px] font-mono block'>
                                Code: {scope.scopeCode}
                              </span>
                            </TableCell>
                            <TableCell className='px-4 py-2.5 text-end font-mono text-xs text-muted-foreground'>
                              Rp {scope.saldoAwal.toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell className='px-4 py-2.5 text-end font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
                              +Rp {scope.totalPemasukan.toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell className='px-4 py-2.5 text-end font-mono text-xs font-semibold text-rose-600 dark:text-rose-400'>
                              -Rp {scope.totalPengeluaran.toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell className='px-4 py-2.5 text-end font-mono text-xs'>
                              <span className={netKas >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                                {netKas >= 0 ? '+ ' : ''}Rp {netKas.toLocaleString('id-ID')}
                              </span>
                            </TableCell>
                            <TableCell className='px-4 py-2.5 text-end font-mono text-xs font-bold text-primary'>
                              Rp {scope.saldoAkhir.toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell className='px-4 py-2.5 text-center'>
                              {scope.status === 'CLOSED' ? (
                                <Badge className='bg-muted text-muted-foreground border-muted-foreground/30 text-[10px] font-mono gap-1'>
                                  <Lock className='size-3' /> CLOSED
                                </Badge>
                              ) : (
                                <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono gap-1'>
                                  <Unlock className='size-3' /> DRAFT
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className='px-4 py-2.5 text-end'>
                              <Button asChild size='sm' variant='outline' className='h-7 px-2 text-xs gap-1'>
                                <Link href={`/dashboard/keuangan/scope/${scope.scopeCode}`}>
                                  <FolderOpen className='size-3.5' /> Buka Kas
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredScopes.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 20, 50]}
                itemLabel='pos kas'
              />
            </CardContent>
          </Card>
        </>
      ) : null}

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
              onClick={handleExecutePrint}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10 rounded-full whitespace-nowrap'
              title='Cetak Lembar Neraca Saldo Konsolidasi A4 Landscape'
            >
              <Printer className='size-3.5' />
              <span>Cetak Neraca</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => setBulkFinalizeModalOpen(true)}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Tutup Buku Bersama Scope Terpilih'
            >
              <Lock className='size-3.5' />
              <span>Tutup Buku</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setBulkReopenReason('')
                setBulkReopenModalOpen(true)
              }}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/10 rounded-full whitespace-nowrap'
              title='Buka Kembali Scope Terpilih'
            >
              <Unlock className='size-3.5' />
              <span>Buka Buku</span>
            </Button>

            <Button
              size='sm'
              variant='outline'
              onClick={handleExportCsv}
              className='h-7.5 px-2.5 text-xs gap-1.5 font-medium rounded-full whitespace-nowrap'
              title='Ekspor data scope terpilih ke CSV / Excel'
            >
              <Download className='size-3.5' />
              <span>Export CSV</span>
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

      {/* ── MODAL 1: CETAK NERACA SALDO GABUNGAN (A4 LANDSCAPE) ──── */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
          <DialogHeader className='p-4 sm:p-5 pb-3 sm:pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0'>
            <div className='min-w-0 flex-1 pe-6 sm:pe-0'>
              <DialogTitle className='text-base sm:text-lg font-bold flex items-center gap-2 leading-tight'>
                <Printer className='size-5 text-primary shrink-0' />
                <span>Pratinjau Neraca Saldo Gabungan ({selectedCount > 0 ? `${selectedCount} Scope Terpilih` : 'Seluruh Scope Kas'})</span>
              </DialogTitle>
              <DialogDescription className='text-xs mt-0.5'>
                Dokumen resmi konsolidasi neraca kas gereja siap cetak A4 Landscape.
              </DialogDescription>
            </div>
            <Button
              size='sm'
              onClick={handleExecutePrint}
              className='w-full sm:w-auto gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm shrink-0'
            >
              <Printer className='size-4' /> Cetak Dokumen Neraca (Print / PDF)
            </Button>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-3 sm:p-6 bg-muted/20'>
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
                      NERACA SALDO GABUNGAN & KONSOLIDASI KAS GEREJA
                    </div>
                  </div>
                </div>
                <Badge variant='outline' className='font-mono font-bold text-xs bg-primary/5 text-primary'>
                  Periode: {bulan !== 'all' ? `${MONTH_NAMES[Number(bulan) - 1]} ` : ''}{tahun}
                </Badge>
              </div>

              {/* Table */}
              <div className='border rounded-xl overflow-hidden'>
                <table className='w-full text-xs text-left'>
                  <thead className='bg-muted/60 text-muted-foreground font-semibold border-b'>
                    <tr>
                      <th className='p-2 text-center w-8'>No</th>
                      <th className='p-2'>Departemen / Scope Kas</th>
                      <th className='p-2 text-center'>Kode</th>
                      <th className='p-2 text-right'>Saldo Awal</th>
                      <th className='p-2 text-right'>Pemasukan (+)</th>
                      <th className='p-2 text-right'>Pengeluaran (-)</th>
                      <th className='p-2 text-right'>Saldo Akhir (=)</th>
                      <th className='p-2 text-center'>Status</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {(selectedCount > 0 ? selectedScopesData : rawScopes).map((scope, idx) => (
                      <tr key={scope.scopeId} className='hover:bg-muted/20'>
                        <td className='p-2 text-center text-muted-foreground'>{idx + 1}</td>
                        <td className='p-2 font-bold text-foreground'>{scope.scopeName}</td>
                        <td className='p-2 text-center font-mono text-xs text-muted-foreground'>{scope.scopeCode}</td>
                        <td className='p-2 text-right font-mono'>Rp {scope.saldoAwal.toLocaleString('id-ID')}</td>
                        <td className='p-2 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold'>
                          + Rp {scope.totalPemasukan.toLocaleString('id-ID')}
                        </td>
                        <td className='p-2 text-right font-mono text-rose-600 dark:text-rose-400 font-bold'>
                          - Rp {scope.totalPengeluaran.toLocaleString('id-ID')}
                        </td>
                        <td className='p-2 text-right font-mono font-black text-foreground'>
                          Rp {scope.saldoAkhir.toLocaleString('id-ID')}
                        </td>
                        <td className='p-2 text-center'>
                          <Badge variant='outline' className='text-[10px] font-mono'>
                            {scope.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className='p-3 sm:p-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0'>
            <span className='text-xs text-muted-foreground text-center sm:text-left'>
              Format cetak A4 Landscape siap digunakan untuk Sidang Majelis & Laporan Konsolidasi.
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPrintModalOpen(false)}
              className='w-full sm:w-auto'
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: TUTUP BUKU MASSAL (BULK FINALIZE) ───────────── */}
      <AlertDialog open={bulkFinalizeModalOpen} onOpenChange={setBulkFinalizeModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold flex items-center gap-2 text-primary'>
              <Lock className='size-5' /> Tutup Buku {selectedCount} Scope Keuangan?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-2 text-xs text-muted-foreground'>
                <div>
                  Scope keuangan yang dipilih akan ditutup (*CLOSED*). Seluruh transaksi kas di dalamnya akan dikunci (*Read-Only*) untuk menjamin akurasi neraca pembukuan.
                </div>
                <div className='p-2.5 rounded bg-muted/60 border text-foreground font-medium'>
                  🔒 Periode yang ditutup tetap dapat dibuka kembali (*Reopen*) jika diperlukan koreksi jurnal.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setBulkFinalizeModalOpen(false)} disabled={isBulkFinalizing}>
              Batal
            </Button>
            <Button
              onClick={handleBulkFinalizeSubmit}
              disabled={isBulkFinalizing}
              className='gap-2'
            >
              {isBulkFinalizing ? <Loader2 className='size-4 animate-spin' /> : <Lock className='size-4' />}
              Konfirmasi Tutup Buku ({selectedCount})
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL 3: BUKA KEMBALI MASSAL (BULK REOPEN) ──────────── */}
      <AlertDialog open={bulkReopenModalOpen} onOpenChange={setBulkReopenModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold flex items-center gap-2 text-amber-600'>
              <Unlock className='size-5' /> Buka Kembali {selectedCount} Scope Keuangan?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-xs text-muted-foreground'>
                <div>
                  Status pembukuan akan dikembalikan ke *DRAFT* agar transaksi kas dapat disesuaikan kembali. Aksi ini akan dicatat dalam Audit Trail SHA-256.
                </div>
                <div className='space-y-1 pt-1'>
                  <Label className='text-xs font-semibold text-foreground block'>Alasan Buka Buku (Wajib, min. 10 karakter):</Label>
                  <Textarea
                    placeholder='Contoh: Penyesuaian nota transaksi operasional yang terlambat dilaporkan...'
                    value={bulkReopenReason}
                    onChange={(e) => setBulkReopenReason(e.target.value)}
                    className='text-xs min-h-15'
                    required
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setBulkReopenModalOpen(false)} disabled={isBulkReopening}>
              Batal
            </Button>
            <Button
              onClick={handleBulkReopenSubmit}
              disabled={isBulkReopening || bulkReopenReason.trim().length < 10}
              className='gap-2 bg-amber-600 hover:bg-amber-700 text-white'
            >
              {isBulkReopening ? <Loader2 className='size-4 animate-spin' /> : <Unlock className='size-4' />}
              Konfirmasi Buka Buku ({selectedCount})
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function LaporanGabunganPage() {
  return (
    <Suspense
      fallback={
        <div className='flex h-96 items-center justify-center'>
          <Loader2 className='size-8 animate-spin text-primary' />
        </div>
      }
    >
      <LaporanGabunganContent />
    </Suspense>
  )
}
