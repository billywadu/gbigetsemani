'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Wallet,
  Plus,
  Search,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  FolderOpen,
  MoreHorizontal,
  Edit,
  Trash2,
  PowerOff,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  XCircle,
  BookOpen,
  Printer,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getScopeListWithStatsAction,
  createScopeAction,
  updateScopeAction,
  deleteScopeAction,
  getScopeFullBookPrintDataAction,
  ScopeWithStatsDTO,
} from '@/actions/keuangan'
import { getAuthUserAction } from '@/actions/auth'
import { getPrintLayoutConfigAction } from '@/actions/print-layout'
import { TablePagination } from '@/components/ui/table-pagination'
import { toast } from 'sonner'

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default function KeuanganMasterPage() {
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [scopes, setScopes] = useState<ScopeWithStatsDTO[]>([])
  const [summary, setSummary] = useState({
    totalSaldoKonsolidasi: 0,
    totalPemasukanYtd: 0,
    totalPengeluaranYtd: 0,
    totalActiveScopes: 0,
    totalAllScopes: 0,
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Dialog state: Create Scope
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [newScopeData, setNewScopeData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true,
  })

  // Dialog state: Edit Scope
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editingScope, setEditingScope] = useState<{
    id: string
    name: string
    code: string
    description: string
    isActive: boolean
  } | null>(null)

  // Dialog state: Delete / Deactivate Scope
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deletingScope, setDeletingScope] = useState<ScopeWithStatsDTO | null>(null)
  const [deleteReason, setDeleteReason] = useState('')

  // Dialog state: Print Multi-Period Book (Buku Bundel LPJ)
  const [printBookModalOpen, setPrintBookModalOpen] = useState(false)
  const [printingBookScope, setPrintingBookScope] = useState<ScopeWithStatsDTO | null>(null)
  const [selectedBookYear, setSelectedBookYear] = useState<string>('ALL')
  const [isGeneratingBook, setIsGeneratingBook] = useState(false)

  const fetchScopes = useCallback(async () => {
    setLoading(true)
    const [res, authRes] = await Promise.all([
      getScopeListWithStatsAction(),
      getAuthUserAction().catch(() => ({ success: false, user: null })),
    ])
    if (authRes.success && authRes.user) {
      setUserRole(authRes.user.role)
    }
    if (res.success && res.data) {
      setScopes(res.data.scopes)
      setSummary(res.data.summary)
    } else {
      toast.error(res.error || 'Gagal memuat data master pos kas.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchScopes()
  }, [fetchScopes])

  const handleCreateScope = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newScopeData.name.trim()) {
      toast.error('Nama Pos Kas wajib diisi.')
      return
    }

    setCreateSubmitting(true)
    const res = await createScopeAction({
      name: newScopeData.name.trim(),
      description: newScopeData.description.trim() || undefined,
      isActive: newScopeData.isActive,
    })
    setCreateSubmitting(false)

    if (res.success) {
      toast.success(res.message || 'Pos kas berhasil dibuat.')
      setCreateDialogOpen(false)
      setNewScopeData({ name: '', code: '', description: '', isActive: true })
      fetchScopes()
    } else {
      toast.error(res.error || 'Gagal membuat pos kas.')
    }
  }

  const handleOpenEdit = (sc: ScopeWithStatsDTO) => {
    setEditingScope({
      id: sc.id,
      name: sc.name,
      code: sc.code,
      description: sc.description || '',
      isActive: sc.isActive,
    })
    setEditDialogOpen(true)
  }

  const handleUpdateScope = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingScope || !editingScope.name.trim()) {
      toast.error('Nama Pos Kas wajib diisi.')
      return
    }

    setEditSubmitting(true)
    const res = await updateScopeAction({
      id: editingScope.id,
      name: editingScope.name,
      description: editingScope.description || null,
      isActive: editingScope.isActive,
    })
    setEditSubmitting(false)

    if (res.success) {
      toast.success(res.message || 'Pos kas berhasil diperbarui.')
      setEditDialogOpen(false)
      setEditingScope(null)
      fetchScopes()
    } else {
      toast.error(res.error || 'Gagal memperbarui pos kas.')
    }
  }

  const handleOpenDelete = (sc: ScopeWithStatsDTO) => {
    setDeletingScope(sc)
    setDeleteReason('')
    setDeleteDialogOpen(true)
  }

  const handleDeleteScope = async () => {
    if (!deletingScope) return

    setDeleteSubmitting(true)
    const res = await deleteScopeAction({
      id: deletingScope.id,
      reason: deleteReason || undefined,
    })
    setDeleteSubmitting(false)

    if (res.success) {
      toast.success(res.message || 'Aksi pos kas berhasil dijalankan.')
      setDeleteDialogOpen(false)
      setDeletingScope(null)
      fetchScopes()
    } else {
      toast.error(res.error || 'Gagal memproses pos kas.')
    }
  }

  const handleOpenPrintBookModal = (sc: ScopeWithStatsDTO) => {
    if (sc.totalPeriodeCount === 0) {
      toast.error('Pos kas ini belum memiliki catatan periode pembukuan untuk dicetak.')
      return
    }
    setPrintingBookScope(sc)
    setSelectedBookYear('ALL')
    setPrintBookModalOpen(true)
  }

  // ── Standalone Print Engine for Multi-Period Book (Buku Bundel LPJ Kas) ──
  const handleExecutePrintBook = async () => {
    if (!printingBookScope) return
    setIsGeneratingBook(true)

    const yearNum = selectedBookYear === 'ALL' ? undefined : Number(selectedBookYear)
    const [bookRes, layoutRes] = await Promise.all([
      getScopeFullBookPrintDataAction({
        scopeIdOrCode: printingBookScope.id,
        tahun: yearNum,
      }),
      getPrintLayoutConfigAction(),
    ])

    setIsGeneratingBook(false)

    if (!bookRes.success || !bookRes.data) {
      toast.error(bookRes.error || 'Gagal menyiapkan bundel buku laporan kas.')
      return
    }

    const data = bookRes.data
    const layout = layoutRes.data

    const printWindow = window.open('', '_blank', 'width=1100,height=900')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    setPrintBookModalOpen(false)

    const logoHtml = layout.kop.tampilkanLogo && layout.kop.logoUrl
      ? `<img src="${layout.kop.logoUrl}" alt="Logo" style="height: 48px; width: 48px; object-fit: contain; border-radius: 6px;" />`
      : `<div style="width: 44px; height: 44px; background: ${layout.kop.garisKopColor}; color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px;">G</div>`

    const borderBottomStyle = layout.kop.garisKopStyle === 'DOUBLE'
      ? `3px double ${layout.kop.garisKopColor}`
      : `2px solid ${layout.kop.garisKopColor}`

    const bendaharaTtd = layout.signatories.bendahara.ttdUrl && layout.options.modeTandaTangan !== 'MANUAL_LINE'
      ? `<img src="${layout.signatories.bendahara.ttdUrl}" alt="TTD" style="max-height: 48px; max-width: 120px; object-fit: contain; position: relative; z-index: 2;" />`
      : `<div style="height: 48px; position: relative; z-index: 2;"></div>`

    const ketuaMajelisTtd = layout.signatories.ketuaMajelis.ttdUrl && layout.options.modeTandaTangan !== 'MANUAL_LINE'
      ? `<img src="${layout.signatories.ketuaMajelis.ttdUrl}" alt="TTD" style="max-height: 48px; max-width: 120px; object-fit: contain; position: relative; z-index: 2;" />`
      : `<div style="height: 48px; position: relative; z-index: 2;"></div>`

    const gembalaTtd = layout.signatories.gembala.ttdUrl && layout.options.modeTandaTangan !== 'MANUAL_LINE'
      ? `<img src="${layout.signatories.gembala.ttdUrl}" alt="TTD" style="max-height: 48px; max-width: 120px; object-fit: contain; position: relative; z-index: 2;" />`
      : `<div style="height: 48px; position: relative; z-index: 2;"></div>`

    const stampHtml = layout.stempel.tampilkanStempel && layout.stempel.stempelUrl
      ? `<img src="${layout.stempel.stempelUrl}" alt="Stempel" style="position: absolute; right: 5px; top: 0; height: 50px; opacity: ${layout.stempel.opacity ?? 0.8}; pointer-events: none; z-index: 1; transform: rotate(${layout.stempel.rotasi ?? -6}deg);" />`
      : ''

    const tahunLabel = selectedBookYear === 'ALL'
      ? (data.summary.tahunList.length > 1 ? `${data.summary.tahunList[data.summary.tahunList.length - 1]} - ${data.summary.tahunList[0]}` : `Tahun ${data.summary.tahunList[0] || new Date().getFullYear()}`)
      : `Tahun ${selectedBookYear}`

    // 1. Executive Summary Table Rows
    const summaryRowsHtml = data.periods.map((p, idx) => `
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

    // 2. Monthly Detail Sheets HTML
    const monthlySheetsHtml = data.periods.map((p, pIdx) => {
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
          <!-- Kop Mini Per Bulan -->
          <div class="kop-mini">
            <div>
              <strong style="color: ${layout.kop.garisKopColor}; font-size: 11px; text-transform: uppercase;">${layout.kop.namaGereja}</strong>
              <div style="font-size: 8.5px; color: #64748b;">${data.scope.name} • Buku LPJ Kas</div>
            </div>
            <div style="text-align: right; font-family: monospace; font-size: 8.5px; color: #64748b;">
              BAGIAN ${pIdx + 1} DARI ${data.periods.length} BULAN
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

          <!-- Section I: Pemasukan -->
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

          <!-- Section II: Pengeluaran -->
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

          <!-- Section III: Rekapitulasi Periode Tersebut -->
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
          * {
            box-sizing: border-box;
            margin: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            font-size: 9px;
            line-height: 1.4;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .kop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: ${borderBottomStyle};
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .kop-mini {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          .brand { display: flex; align-items: center; gap: 12px; }
          .title { font-size: 13px; font-weight: 900; color: ${layout.kop.garisKopColor}; text-transform: uppercase; }
          .subtitle { font-size: 8.5px; color: #475569; }
          .badge { background: ${layout.kop.garisKopColor}; color: #ffffff; font-size: 8px; font-weight: 800; padding: 2px 7px; border-radius: 4px; display: inline-block; }

          /* Cover Styling */
          .cover-container {
            text-align: center;
            padding: 20px 10px;
            border: 2px solid ${layout.kop.garisKopColor};
            border-radius: 12px;
            margin-top: 10px;
            background: #fafafa;
          }
          .cover-title {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin-top: 16px;
          }
          .cover-scope {
            font-size: 20px;
            font-weight: 900;
            color: ${layout.kop.garisKopColor};
            text-transform: uppercase;
            margin: 8px 0;
          }
          .cover-period {
            font-size: 11px;
            font-family: monospace;
            font-weight: bold;
            color: #475569;
            background: #e2e8f0;
            display: inline-block;
            padding: 4px 12px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .cover-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin: 20px 0;
            text-align: center;
          }
          .cover-stat-card {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 10px;
          }
          .cover-stat-lbl {
            font-size: 8px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
          }
          .cover-stat-val {
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
            font-family: monospace;
            margin-top: 2px;
          }

          /* Tables */
          .trx-table, .summary-table, .rekap-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
            margin-top: 4px;
          }
          .trx-table th, .summary-table th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
            font-weight: 800;
            text-align: left;
          }
          .trx-table td, .summary-table td, .rekap-table td {
            border: 1px solid #e2e8f0;
            padding: 3.5px 6px;
          }
          .section-title {
            font-size: 9.5px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            border-left: 3px solid ${layout.kop.garisKopColor};
            padding-left: 6px;
            margin-bottom: 4px;
          }

          /* Signatures */
          .sheet-footer {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            padding-top: 14px;
            margin-top: 16px;
            border-top: 1px solid #e2e8f0;
          }
          .sign-box {
            text-align: center;
            font-size: 8.5px;
            color: #475569;
            width: 200px;
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
            margin-top: 12px;
            text-align: center;
            font-family: monospace;
          }
        </style>
      </head>
      <body>

        <!-- ═══════════════════════════════════════════════════════════════
             HALAMAN 1: COVER / SAMPUL DEPAN BUKU LPJ KAS
             ═══════════════════════════════════════════════════════════════ -->
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
              PERIODE BUKU: ${tahunLabel.toUpperCase()} • ${data.summary.totalPeriods} BULAN PEMBUKUAN
            </div>

            ${data.scope.description ? `
              <p style="font-size: 9.5px; color: #475569; max-width: 500px; margin: 0 auto 16px auto; font-style: italic;">
                "${data.scope.description}"
              </p>
            ` : ''}

            <!-- 4 KPI Cover Metrics -->
            <div class="cover-stats-grid">
              <div class="cover-stat-card">
                <div class="cover-stat-lbl">Saldo Awal Buku</div>
                <div class="cover-stat-val">Rp ${data.summary.saldoAwalPertama.toLocaleString('id-ID')}</div>
              </div>
              <div class="cover-stat-card">
                <div class="cover-stat-lbl">Total Penerimaan (+)</div>
                <div class="cover-stat-val" style="color: #16a34a;">+ Rp ${data.summary.totalPemasukan.toLocaleString('id-ID')}</div>
              </div>
              <div class="cover-stat-card">
                <div class="cover-stat-lbl">Total Pengeluaran (-)</div>
                <div class="cover-stat-val" style="color: #dc2626;">- Rp ${data.summary.totalPengeluaran.toLocaleString('id-ID')}</div>
              </div>
              <div class="cover-stat-card" style="background: #0f172a; color: #ffffff; border-color: #0f172a;">
                <div class="cover-stat-lbl" style="color: #94a3b8;">Saldo Akhir Terkini</div>
                <div class="cover-stat-val" style="color: #ffffff;">Rp ${data.summary.saldoAkhirTerkini.toLocaleString('id-ID')}</div>
              </div>
            </div>

            <div style="font-size: 8.5px; color: #64748b; margin-top: 24px; line-height: 1.5;">
              Buku laporan ini disusun secara otomatis oleh Sistem Manajemen Keuangan Gereja <strong>${escapeHtml(layout.kop?.namaGereja || 'Gereja')}</strong>, memuat ringkasan eksekutif dan seluruh rincian transaksi mutasi kas per bulan secara akuntabel, transparan, dan terotentikasi.
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════
             HALAMAN 2: IKHTISAR REKAPITULASI PEMBUKUAN KAS (MULTI-PERIODE)
             ═══════════════════════════════════════════════════════════════ -->
        <div class="page-break">
          <div class="kop-mini">
            <div>
              <strong style="color: ${layout.kop.garisKopColor}; font-size: 11px; text-transform: uppercase;">${layout.kop.namaGereja}</strong>
              <div style="font-size: 8.5px; color: #64748b;">${data.scope.name} • Ikhtisar Rekapitulasi Tahunan</div>
            </div>
            <div style="text-align: right; font-family: monospace; font-size: 8.5px; color: #64748b;">
              LEMBAR REKAPITULASI
            </div>
          </div>

          <div style="text-align: center; margin: 8px 0 12px 0;">
            <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin: 0;">
              IKHTISAR REKAPITULASI PEMBUKUAN KAS PER BULAN
            </h2>
            <p style="font-size: 9px; color: #64748b; font-family: monospace; font-weight: bold; margin: 2px 0 0 0;">
              POS KAS: ${data.scope.name.toUpperCase()} • ${tahunLabel.toUpperCase()}
            </p>
          </div>

          <table class="summary-table">
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">No</th>
                <th>Periode Pembukuan Bulanan</th>
                <th style="text-align: right; width: 110px;">Saldo Awal (Rp)</th>
                <th style="text-align: right; width: 110px;">Total Masuk (+)</th>
                <th style="text-align: right; width: 110px;">Total Keluar (-)</th>
                <th style="text-align: right; width: 115px;">Saldo Akhir (=)</th>
                <th style="width: 65px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 900;">
                <td colspan="2" style="text-align: center;">TOTAL AKUMULASI BUKU KAS</td>
                <td style="text-align: right; font-family: monospace;">Rp ${data.summary.saldoAwalPertama.toLocaleString('id-ID')}</td>
                <td style="text-align: right; font-family: monospace; color: #16a34a;">+ Rp ${data.summary.totalPemasukan.toLocaleString('id-ID')}</td>
                <td style="text-align: right; font-family: monospace; color: #dc2626;">- Rp ${data.summary.totalPengeluaran.toLocaleString('id-ID')}</td>
                <td style="text-align: right; font-family: monospace; color: #0f172a; font-size: 9.5px;">Rp ${data.summary.saldoAkhirTerkini.toLocaleString('id-ID')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════
             HALAMAN 3+: RINCIAN TRANSAKSI MUTASI PER BULAN (PAGE BREAK)
             ═══════════════════════════════════════════════════════════════ -->
        ${monthlySheetsHtml}

        <!-- ═══════════════════════════════════════════════════════════════
             HALAMAN AKHIR: PENGESAHAN RESMI BUKU LPJ KAS
             ═══════════════════════════════════════════════════════════════ -->
        <div style="margin-top: 10px;">
          <div class="kop-mini">
            <div>
              <strong style="color: ${layout.kop.garisKopColor}; font-size: 11px; text-transform: uppercase;">${layout.kop.namaGereja}</strong>
              <div style="font-size: 8.5px; color: #64748b;">${data.scope.name} • Lembar Pengesahan Resmi</div>
            </div>
            <div style="text-align: right; font-family: monospace; font-size: 8.5px; color: #64748b;">
              PENGESAHAN DOKUMEN
            </div>
          </div>

          <div style="text-align: center; margin: 12px 0 16px 0;">
            <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin: 0;">
              LEMBAR PENGESAHAN & OTENTIKASI RESMI BUKU LPJ KAS
            </h2>
            <p style="font-size: 9px; color: #64748b; font-family: monospace; margin: 2px 0 0 0;">
              ${data.scope.name.toUpperCase()} • ${tahunLabel.toUpperCase()}
            </p>
          </div>

          <table class="rekap-table" style="max-width: 600px; margin: 0 auto 20px auto;">
            <tr>
              <td style="width: 65%; font-weight: 600;">Posisi Saldo Kas Akhir Pembukuan:</td>
              <td style="text-align: right; font-family: monospace; font-weight: 900; font-size: 11px; color: #0f172a;">Rp ${data.summary.saldoAkhirTerkini.toLocaleString('id-ID')}</td>
            </tr>
            <tr>
              <td style="font-weight: 600;">Jumlah Periode Pembukuan Terselesaikan:</td>
              <td style="text-align: right; font-family: monospace; font-weight: bold;">${data.summary.totalPeriods} Periode Bulanan</td>
            </tr>
          </table>

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
  }

  const filteredScopes = scopes.filter((sc) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return sc.name.toLowerCase().includes(q) || sc.code.toLowerCase().includes(q)
  })

  const totalPages = Math.ceil(filteredScopes.length / pageSize) || 1
  const paginatedScopes = filteredScopes.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const isBendaharaKategorial = userRole === 'BENDAHARA_KATEGORIAL'

  return (
    <div className='space-y-6 max-w-7xl mx-auto pb-20 px-2 sm:px-4'>
      {/* Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div className='flex items-start sm:items-center gap-3'>
          <div className='p-2 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5 sm:mt-0'>
            <Wallet className='size-5' />
          </div>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
              {isBendaharaKategorial ? 'Buku Kas Kategorial' : 'Buku Kas & Keuangan'}
            </h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {isBendaharaKategorial
                ? 'Kelola pembukuan dan mutasi kas khusus kategorial pelayanan Anda.'
                : 'Kelola pos kas pelayanan dan neraca keuangan gereja.'}
            </p>
          </div>
        </div>

        {!isBendaharaKategorial && (
          <div className='flex items-center gap-2 w-full sm:w-auto shrink-0'>
            <Link href='/dashboard/keuangan/laporan-gabungan' className='flex-1 sm:flex-initial'>
              <Button variant='outline' size='sm' className='w-full h-9 sm:h-8 gap-1.5 text-xs font-semibold'>
                <FileSpreadsheet className='size-3.5 text-primary' /> Neraca Saldo
              </Button>
            </Link>
            <Button
              size='sm'
              onClick={() => setCreateDialogOpen(true)}
              className='flex-1 sm:flex-initial h-9 sm:h-8 gap-1.5 bg-primary text-primary-foreground text-xs font-semibold shadow-xs'
            >
              <Plus className='size-3.5' /> Tambah Pos Kas
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards: Konsolidasi Real-time */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
        <Card className='shadow-xs border-primary/20 bg-card'>
          <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              {isBendaharaKategorial ? 'Total Saldo Kas Terkelola' : 'Total Saldo Konsolidasi'}
            </CardTitle>
            <div className='size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary'>
              <Wallet className='size-4' />
            </div>
          </CardHeader>
          <CardContent>
            <div className='text-xl sm:text-2xl font-black tracking-tight text-foreground font-mono'>
              Rp {summary.totalSaldoKonsolidasi.toLocaleString('id-ID')}
            </div>
            <p className='text-[11px] text-muted-foreground mt-1 flex items-center gap-1'>
              <TrendingUp className='size-3 text-emerald-600' />{' '}
              {isBendaharaKategorial ? 'Akumulasi saldo kas kategorial aktif' : 'Akumulasi saldo live seluruh pos kas'}
            </p>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Pemasukan Tahun {new Date().getFullYear()}
            </CardTitle>
            <div className='size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400'>
              <ArrowUpRight className='size-4' />
            </div>
          </CardHeader>
          <CardContent>
            <div className='text-xl sm:text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-mono'>
              Rp {summary.totalPemasukanYtd.toLocaleString('id-ID')}
            </div>
            <p className='text-[11px] text-muted-foreground mt-1'>
              Total penerimaan kas tahun berjalan
            </p>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Pengeluaran Tahun {new Date().getFullYear()}
            </CardTitle>
            <div className='size-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400'>
              <ArrowDownRight className='size-4' />
            </div>
          </CardHeader>
          <CardContent>
            <div className='text-xl sm:text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400 font-mono'>
              Rp {summary.totalPengeluaranYtd.toLocaleString('id-ID')}
            </div>
            <p className='text-[11px] text-muted-foreground mt-1'>
              Total pengeluaran operasional & program
            </p>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              {isBendaharaKategorial ? 'Buku Kas Terkelola' : 'Pos Kas Aktif'}
            </CardTitle>
            <div className='size-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400'>
              <Layers className='size-4' />
            </div>
          </CardHeader>
          <CardContent>
            <div className='text-xl sm:text-2xl font-black tracking-tight text-foreground font-mono'>
              {summary.totalActiveScopes} <span className='text-xs text-muted-foreground font-sans'>/ {summary.totalAllScopes} pos</span>
            </div>
            <p className='text-[11px] text-muted-foreground mt-1'>
              {isBendaharaKategorial ? 'Kategorial pelayanan Anda' : 'Departemen & pos pelayanan keuangan'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table: Master Pos Kas (Level 1) */}
      <Card className='shadow-xs overflow-hidden'>
        <CardHeader className='pb-3 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b bg-muted/20'>
          <div className='flex items-start sm:items-center gap-2.5'>
            <div className='p-1.5 bg-primary/10 rounded-md text-primary shrink-0 mt-0.5 sm:mt-0'>
              <Layers className='size-4' />
            </div>
            <div>
              <CardTitle className='text-sm sm:text-base font-bold text-foreground'>
                {isBendaharaKategorial ? 'Daftar Buku Kas Kategorial' : 'Daftar Pos Kas'}
              </CardTitle>
              <CardDescription className='text-xs text-muted-foreground mt-0.5'>
                Pilih pos kas untuk melihat buku kas bulanan dan mutasi transaksi.
              </CardDescription>
            </div>
          </div>

          <div className='relative w-full sm:w-64 shrink-0'>
            <Search className='absolute left-2.5 top-2.5 size-3.5 text-muted-foreground' />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder='Cari nama pos kas pelayanan...'
              className='pl-8 text-xs h-9'
            />
          </div>
        </CardHeader>

        <CardContent className='p-0'>
          {loading ? (
            <div className='flex items-center justify-center py-16 text-muted-foreground gap-2 text-xs'>
              <Loader2 className='size-4 animate-spin text-primary' /> Memuat data master pos kas...
            </div>
          ) : filteredScopes.length === 0 ? (
            <div className='text-center py-16 text-muted-foreground text-xs space-y-2'>
              <Wallet className='size-8 mx-auto text-muted-foreground/40' />
              <p>Tidak ada pos kas yang sesuai dengan pencarian atau hak akses Anda.</p>
              {searchQuery && (
                <Button variant='ghost' size='sm' onClick={() => setSearchQuery('')} className='text-xs h-7'>
                  Reset Pencarian
                </Button>
              )}
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table className='min-w-[680px]'>
                <TableHeader className='bg-muted/20 border-b'>
                  <TableRow className='hover:bg-transparent text-[11px] font-medium text-muted-foreground'>
                    <TableHead className='w-10 text-center'>#</TableHead>
                    <TableHead className='py-3'>Pos Kas Pelayanan</TableHead>
                    <TableHead className='text-right py-3'>Saldo Kas</TableHead>
                    <TableHead className='text-right py-3'>Mutasi (YTD)</TableHead>
                    <TableHead className='text-center py-3'>Pembukuan</TableHead>
                    <TableHead className='text-center py-3'>Status</TableHead>
                    <TableHead className='text-right py-3 w-40'>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className='divide-y text-xs'>
                  {paginatedScopes.map((sc, idx) => (
                    <TableRow key={sc.id} className='hover:bg-muted/30 transition-colors group'>
                      <TableCell className='text-center text-muted-foreground/60 font-mono text-[11px] py-3.5'>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </TableCell>

                      <TableCell className='py-3.5'>
                        <div>
                          <Link
                            href={`/dashboard/keuangan/scope/${sc.code}`}
                            className='font-semibold text-foreground text-sm hover:text-primary transition-colors line-clamp-1'
                          >
                            {sc.name}
                          </Link>
                          {sc.description ? (
                            <p className='text-[11px] text-muted-foreground line-clamp-1 mt-0.5'>{sc.description}</p>
                          ) : (
                            <p className='text-[11px] text-muted-foreground/60 font-mono'>Kode: {sc.code}</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className='text-right py-3.5'>
                        <span className='font-mono font-bold text-sm text-foreground'>
                          Rp {sc.saldoTerkini.toLocaleString('id-ID')}
                        </span>
                      </TableCell>

                      <TableCell className='text-right py-3.5'>
                        <div className='inline-flex flex-col items-end gap-0.5'>
                          <span className='text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400'>
                            + Rp {sc.totalPemasukanYtd.toLocaleString('id-ID')}
                          </span>
                          <span className='text-[11px] font-mono font-medium text-rose-500/80 dark:text-rose-400'>
                            - Rp {sc.totalPengeluaranYtd.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className='text-center py-3.5'>
                        <div className='inline-flex flex-col items-center gap-0.5'>
                          <span className='font-medium text-xs text-foreground'>
                            {sc.totalPeriodeCount} Periode
                          </span>
                          <span className='text-[10px] text-muted-foreground'>
                            {sc.activePeriodeCount > 0 ? (
                              <span className='text-amber-600 dark:text-amber-400 font-medium'>
                                {sc.activePeriodeCount} aktif
                              </span>
                            ) : (
                              'Semua tutup'
                            )}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className='text-center py-3.5'>
                        {sc.isActive ? (
                          <span className='inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                            <span className='size-1.5 rounded-full bg-emerald-500' />
                            Aktif
                          </span>
                        ) : (
                          <span className='inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
                            <span className='size-1.5 rounded-full bg-muted-foreground/40' />
                            Nonaktif
                          </span>
                        )}
                      </TableCell>

                      <TableCell className='text-right py-3.5'>
                        <div className='flex items-center justify-end gap-1.5'>
                          <Link href={`/dashboard/keuangan/scope/${sc.code}`}>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-8 px-3 text-xs font-medium gap-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-2xs'
                            >
                              <FolderOpen className='size-3.5' />
                              Buka Kas
                            </Button>
                          </Link>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' size='sm' className='h-8 w-8 p-0 text-muted-foreground hover:text-foreground'>
                                <MoreHorizontal className='size-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-48 text-xs'>
                              <DropdownMenuLabel className='text-[10px] text-muted-foreground uppercase font-mono'>
                                Opsi Pos Kas
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleOpenPrintBookModal(sc)}
                                className='gap-2 text-xs font-semibold text-primary focus:text-primary cursor-pointer'
                              >
                                <BookOpen className='size-3.5' /> Cetak Buku LPJ Kas
                              </DropdownMenuItem>

                              {!isBendaharaKategorial && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleOpenEdit(sc)} className='gap-2 text-xs cursor-pointer'>
                                    <Edit className='size-3.5' /> Edit Informasi
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleOpenDelete(sc)}
                                    className='gap-2 text-xs text-rose-600 focus:text-rose-700 cursor-pointer'
                                  >
                                    {sc.totalPeriodeCount > 0 ? (
                                      <>
                                        <PowerOff className='size-3.5' /> Nonaktifkan Pos
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className='size-3.5' /> Hapus Pos Kas
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MODAL 1: Tambah Pos Kas Baru ────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Plus className='size-4 text-primary' /> Tambah Pos Kas / Scope Baru
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Buat pos kas pelayanan baru untuk memisahkan pencatatan keuangan dan mutasi transaksi secara mandiri.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateScope} className='space-y-4 pt-2'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Nama Pos Kas Pelayanan *</Label>
              <Input
                value={newScopeData.name}
                onChange={(e) => setNewScopeData((p) => ({ ...p, name: e.target.value }))}
                placeholder='Contoh: Kas Pembangunan Menara Doa'
                className='text-xs font-semibold'
                required
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Deskripsi / Peruntukan Dana (Opsional)</Label>
              <Textarea
                value={newScopeData.description}
                onChange={(e) => setNewScopeData((p) => ({ ...p, description: e.target.value }))}
                placeholder='Contoh: Khusus penerimaan persembahan dan belanja pembangunan gedung...'
                rows={2}
                className='text-xs resize-none'
              />
            </div>

            <div className='flex items-center justify-between p-3 bg-muted/40 rounded-xl border'>
              <div>
                <Label htmlFor='switch-active-new' className='text-xs font-bold block cursor-pointer'>
                  Status Pos Kas Aktif
                </Label>
                <p className='text-[10px] text-muted-foreground'>
                  Pos kas aktif dapat langsung dibuatkan periode pembukuan bulanan.
                </p>
              </div>
              <Switch
                id='switch-active-new'
                checked={newScopeData.isActive}
                onCheckedChange={(c) => setNewScopeData((p) => ({ ...p, isActive: c }))}
              />
            </div>

            <DialogFooter className='pt-3'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setCreateDialogOpen(false)}
                disabled={createSubmitting}
                className='text-xs'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={createSubmitting}
                className='text-xs font-semibold bg-primary text-primary-foreground gap-1.5'
              >
                {createSubmitting ? <Loader2 className='size-3.5 animate-spin' /> : <Plus className='size-3.5' />}
                {createSubmitting ? 'Menyimpan...' : 'Buat Pos Kas'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: Edit Pos Kas ──────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Edit className='size-4 text-primary' /> Edit Pos Kas: {editingScope?.name}
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Perbarui nama, catatan peruntukan, atau status aktif pos kas.
            </DialogDescription>
          </DialogHeader>

          {editingScope && (
            <form onSubmit={handleUpdateScope} className='space-y-4 pt-2'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nama Pos Kas Pelayanan *</Label>
                <Input
                  value={editingScope.name}
                  onChange={(e) => setEditingScope((p) => (p ? { ...p, name: e.target.value } : null))}
                  className='text-xs font-semibold'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Deskripsi / Peruntukan Dana</Label>
                <Textarea
                  value={editingScope.description}
                  onChange={(e) => setEditingScope((p) => (p ? { ...p, description: e.target.value } : null))}
                  rows={2}
                  className='text-xs resize-none'
                />
              </div>

              <div className='flex items-center justify-between p-3 bg-muted/40 rounded-xl border'>
                <div>
                  <Label htmlFor='switch-active-edit' className='text-xs font-bold block cursor-pointer'>
                    Status Pos Kas Aktif
                  </Label>
                  <p className='text-[10px] text-muted-foreground'>
                    Pos kas non-aktif tidak akan muncul di pilihan periode baru.
                  </p>
                </div>
                <Switch
                  id='switch-active-edit'
                  checked={editingScope.isActive}
                  onCheckedChange={(c) => setEditingScope((p) => (p ? { ...p, isActive: c } : null))}
                />
              </div>

              <DialogFooter className='pt-3'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setEditDialogOpen(false)}
                  disabled={editSubmitting}
                  className='text-xs'
                >
                  Batal
                </Button>
                <Button
                  type='submit'
                  size='sm'
                  disabled={editSubmitting}
                  className='text-xs font-semibold bg-primary text-primary-foreground'
                >
                  {editSubmitting ? <Loader2 className='size-3.5 animate-spin mr-1' /> : null}
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: Konfirmasi Hapus / Nonaktifkan Pos Kas ────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold flex items-center gap-2 text-rose-600'>
              <Trash2 className='size-5' /> Konfirmasi Tindakan Pos Kas
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs space-y-2'>
              <p>
                Anda akan memproses pos kas: <strong>{deletingScope?.name}</strong>.
              </p>
              {deletingScope && deletingScope.totalPeriodeCount > 0 ? (
                <div className='p-2.5 bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20 rounded-lg text-[11px] leading-relaxed'>
                  ⚠️ Pos kas ini telah memiliki <strong>{deletingScope.totalPeriodeCount} buku laporan historis</strong>.
                  Sistem akan <strong>menonaktifkan (mengarsipkan)</strong> pos kas ini untuk menjaga keaslian audit pembukuan.
                </div>
              ) : (
                <p className='text-muted-foreground'>
                  Pos kas belum memiliki laporan apapun dan akan dihapus secara permanen dari sistem.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2 space-y-1.5'>
            <Label className='text-xs font-semibold'>Alasan Tindakan (Opsional):</Label>
            <Input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder='Contoh: Kepanitiaan telah selesai atau penataan ulang pos...'
              className='text-xs'
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting} className='text-xs'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScope}
              disabled={deleteSubmitting}
              className='bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold'
            >
              {deleteSubmitting ? <Loader2 className='size-3.5 animate-spin mr-1' /> : null}
              {deletingScope && deletingScope.totalPeriodeCount > 0 ? 'Ya, Nonaktifkan Pos' : 'Ya, Hapus Permanen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MODAL 4: Cetak Bundel Buku LPJ Kas (Multi-Periode) ─── */}
      <Dialog open={printBookModalOpen} onOpenChange={setPrintBookModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2 text-primary'>
              <BookOpen className='size-4' /> Cetak Buku Bundel LPJ Kas
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Kompilasi seluruh riwayat pembukuan pos kas <strong>{printingBookScope?.name}</strong> menjadi satu berkas buku laporan A4 resmi (Cover, Rekap Tahunan, Rincian Tiap Bulan, & Pengesahan).
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 pt-2'>
            <div className='p-3 bg-muted/40 rounded-xl border space-y-2'>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Pos Kas:</span>
                <span className='font-bold text-foreground'>{printingBookScope?.name}</span>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Total Periode Tercatat:</span>
                <span className='font-mono font-bold'>{printingBookScope?.totalPeriodeCount} Bulan Laporan</span>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Posisi Saldo Terkini:</span>
                <span className='font-mono font-bold text-foreground'>
                  Rp {printingBookScope?.saldoTerkini.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold flex items-center gap-1.5'>
                <Calendar className='size-3.5 text-primary' /> Filter Cakupan Tahun Buku:
              </Label>
              <Select value={selectedBookYear} onValueChange={(val) => setSelectedBookYear(val)}>
                <SelectTrigger className='text-xs'>
                  <SelectValue placeholder='Pilih cakupan tahun...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>📚 Seluruh Periode (Kompilasi Lengkap)</SelectItem>
                  <SelectItem value={String(new Date().getFullYear())}>
                    📅 Tahun Berjalan ({new Date().getFullYear()})
                  </SelectItem>
                  <SelectItem value={String(new Date().getFullYear() - 1)}>
                    📅 Tahun Lalu ({new Date().getFullYear() - 1})
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className='text-[10px] text-muted-foreground leading-relaxed'>
                Setiap periode bulanan otomatis dipisahkan ke halaman baru (Page-Break) dan tabel pemasukan dipisah dari tabel pengeluaran.
              </p>
            </div>

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setPrintBookModalOpen(false)}
                disabled={isGeneratingBook}
                className='text-xs'
              >
                Batal
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={handleExecutePrintBook}
                disabled={isGeneratingBook}
                className='text-xs font-semibold bg-primary text-primary-foreground gap-1.5 shadow-xs'
              >
                {isGeneratingBook ? <Loader2 className='size-3.5 animate-spin' /> : <Printer className='size-3.5' />}
                {isGeneratingBook ? 'Menyiapkan Buku LPJ...' : 'Cetak Buku LPJ (PDF)'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
