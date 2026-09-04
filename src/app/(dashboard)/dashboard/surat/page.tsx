'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  Save,
  Plus,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  BookOpen,
  Send,
  Building2,
  Calendar,
  Layers,
  Stamp,
  Paperclip,
  CheckCircle2,
  RefreshCw,
  Eye,
  Loader2,
  ArrowRight,
  Download,
  Tag,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

import {
  SuratResmiFormValues,
  DEFAULT_SURAT_FORM_VALUES,
  KategoriSuratType,
  generateAutoNomorSurat,
  PoinIsiItem,
} from '@/lib/validations/surat'
import { SURAT_PRESET_TEMPLATES, SuratTemplatePreset } from '@/lib/templates-surat'
import {
  getSuratListAction,
  getSuratDetailAction,
  saveSuratResmiAction,
  deleteSuratResmiAction,
  getNextNomorSuratAction,
} from '@/actions/surat'
import { getPrintLayoutConfigAction } from '@/actions/print-layout'
import { SuratPreviewSheet } from '@/components/surat/surat-preview-sheet'
import { ImageUploadField } from '@/components/surat/image-upload-field'
import { exportSuratToWord } from '@/lib/export-word'

export default function GeneratorSuratPage() {
  const [activeTab, setActiveTab] = useState<'editor' | 'arsip' | 'templates'>('editor')
  const [mobileEditorTab, setMobileEditorTab] = useState<'form' | 'preview'>('form')

  // Form State
  const [formValues, setFormValues] = useState<SuratResmiFormValues>(DEFAULT_SURAT_FORM_VALUES)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingNo, setIsGeneratingNo] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<number>(75)

  // Archive List State
  const [suratList, setSuratList] = useState<any[]>([])
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKategori, setFilterKategori] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  // Load Archive List
  const fetchSuratList = async () => {
    setIsLoadingList(true)
    const res = await getSuratListAction({
      search: searchQuery,
      kategori: filterKategori,
      status: filterStatus,
    })
    setIsLoadingList(false)
    if (res.success && res.data) {
      setSuratList(res.data)
    }
  }

  useEffect(() => {
    if (activeTab === 'arsip') {
      fetchSuratList()
    }
  }, [activeTab, searchQuery, filterKategori, filterStatus])

  // Initial setup: auto number
  useEffect(() => {
    if (!formValues.nomorSurat) {
      handleGenerateAutoNumber(formValues.kategori)
    }
  }, [])

  // Auto Number Generator Trigger
  const handleGenerateAutoNumber = async (kat: KategoriSuratType) => {
    setIsGeneratingNo(true)
    const res = await getNextNomorSuratAction(kat)
    setIsGeneratingNo(false)
    if (res.success && res.data) {
      setFormValues((prev) => ({ ...prev, nomorSurat: res.data }))
    }
  }

  // Load Default Master Kop & Signatories from Print Layout Settings
  const handleSyncMasterKop = async () => {
    const toastId = toast.loading('Mengambil konfigurasi master kop...')
    const res = await getPrintLayoutConfigAction()
    toast.dismiss(toastId)
    if (res.success && res.data) {
      const pc = res.data
      setFormValues((prev) => ({
        ...prev,
        kopNama: pc.kop.namaGereja,
        kopSub: pc.kop.subJudul,
        kopBadanHukum: pc.kop.nomorIzin,
        kopAlamat: prev.kopAlamat || pc.kop.subJudul || '',
        kopKontak: pc.kop.kontak,
        logoKiriUrl: pc.kop.logoUrl,
        garisKopStyle: pc.kop.garisKopStyle as any,
        garisKopColor: pc.kop.garisKopColor,
        stempelUrl: pc.stempel.stempelUrl,
        tampilkanStempel: pc.stempel.tampilkanStempel,
        signatories: [
          {
            roleKey: 'gembala',
            jabatan: pc.signatories.gembala.jabatan || 'Gembala Jemaat',
            nama: pc.signatories.gembala.nama,
            gelar: pc.signatories.gembala.gelar,
            nomorInduk: pc.signatories.gembala.nomorInduk,
            ttdUrl: pc.signatories.gembala.ttdUrl,
          },
          {
            roleKey: 'sekretaris',
            jabatan: pc.signatories.sekretaris.jabatan || 'Sekretaris Jemaat',
            nama: pc.signatories.sekretaris.nama,
            gelar: pc.signatories.sekretaris.gelar,
            nomorInduk: pc.signatories.sekretaris.nomorInduk,
            ttdUrl: pc.signatories.sekretaris.ttdUrl,
          },
        ],
      }))
      toast.success('Kop surat dan tanda tangan berhasil disinkronkan dengan Master Cetak.')
    } else {
      toast.error('Gagal mengambil konfigurasi master cetak.')
    }
  }

  // Official Letter Direct A4 Print Engine
  const handlePrintSurat = (values: SuratResmiFormValues) => {
    const printWindow = window.open('', '_blank', 'width=950,height=850')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    const isDoubleLogo = values.modeLogo === 'DUA_LOGO'
    const borderBottomStyle =
      values.garisKopStyle === 'DOUBLE'
        ? `3px double ${values.garisKopColor || '#0f172a'}`
        : values.garisKopStyle === 'GOLD'
        ? `3px solid #d97706`
        : values.garisKopStyle === 'NAVY'
        ? `3px solid #1e3a8a`
        : `2px solid ${values.garisKopColor || '#0f172a'}`

    const formattedDate = values.tanggalSurat
      ? (() => {
          try {
            const d = new Date(values.tanggalSurat)
            if (isNaN(d.getTime())) return values.tanggalSurat
            return d.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          } catch {
            return values.tanggalSurat
          }
        })()
      : new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })

    const signatoriesHtml = values.signatories && values.signatories.length > 0
      ? values.signatories.map((sig) => `
          <div style="text-align: center; width: 200px;">
            <div style="font-weight: 600; color: #334155; margin-bottom: 8px;">${sig.jabatan}</div>
            <div style="height: 60px; display: flex; align-items: center; justify-content: center; position: relative;">
              ${sig.ttdUrl ? `<img src="${sig.ttdUrl}" style="max-height: 55px; max-width: 140px; object-fit: contain;" />` : ''}
              ${values.tampilkanStempel && values.stempelUrl ? `<img src="${values.stempelUrl}" style="position: absolute; width: 75px; opacity: 0.85; pointer-events: none;" />` : ''}
            </div>
            <div style="font-weight: 800; text-decoration: underline; margin-top: 4px;">
              ${sig.nama}${sig.gelar ? ', ' + sig.gelar : ''}
            </div>
            ${sig.nomorInduk ? `<div style="font-size: 10px; color: #64748b; font-family: monospace;">NIP/NIJ: ${sig.nomorInduk}</div>` : ''}
          </div>
        `).join('')
      : ''

    const poinIsiHtml = values.poinIsi && values.poinIsi.length > 0
      ? `<ol style="margin: 8px 0 12px 24px; line-height: 1.6;">
          ${values.poinIsi.map((p) => `<li style="${p.isBold ? 'font-weight: bold;' : ''}">${p.text}</li>`).join('')}
        </ol>`
      : ''

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Surat Resmi - ${values.nomorSurat} - ${values.perihal}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 20mm 15mm 20mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: "Times New Roman", Times, "Nimbus Roman No9 L", Georgia, serif;
            background: #ffffff;
            color: #0f172a;
            font-size: 12pt;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .kop-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: ${borderBottomStyle};
            padding-bottom: 10px;
            margin-bottom: 16px;
            gap: 12px;
          }
          .kop-logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
            flex-shrink: 0;
          }
          .kop-text {
            flex: 1;
            text-align: center;
          }
          .kop-nama {
            font-size: 13pt;
            font-weight: 900;
            text-transform: uppercase;
            color: ${values.garisKopColor || '#0f172a'};
            line-height: 1.2;
          }
          .kop-sub {
            font-size: 10pt;
            font-weight: bold;
            color: #334155;
            margin-top: 2px;
          }
          .kop-info {
            font-size: 8.5pt;
            color: #475569;
            margin-top: 2px;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11pt;
            margin-bottom: 16px;
          }
          .meta-table td {
            vertical-align: top;
            padding: 1.5px 0;
          }
          .letter-content {
            font-size: 11.5pt;
            text-align: justify;
            line-height: 1.5;
            margin-bottom: 24px;
          }
          .signatures-container {
            display: flex;
            justify-content: ${values.formatTtd === 'SATU_PEJABAT' ? 'flex-end' : 'space-between'};
            align-items: flex-end;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .attachment-page {
            page-break-before: always;
            margin-top: 20px;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="kop-container">
          ${values.logoKiriUrl ? `<img src="${values.logoKiriUrl}" class="kop-logo" alt="Logo" />` : '<div style="width: 70px;"></div>'}
          <div class="kop-text">
            <div class="kop-nama">${values.kopNama.replace(/\n/g, '<br/>')}</div>
            ${values.kopSub ? `<div class="kop-sub">${values.kopSub}</div>` : ''}
            ${values.kopBadanHukum ? `<div class="kop-info">Badan Hukum / Izin: ${values.kopBadanHukum}</div>` : ''}
            ${values.kopAlamat ? `<div class="kop-info">${values.kopAlamat}</div>` : ''}
            ${values.kopKontak ? `<div class="kop-info">${values.kopKontak}</div>` : ''}
          </div>
          ${isDoubleLogo && values.logoKananUrl ? `<img src="${values.logoKananUrl}" class="kop-logo" alt="Logo 2" />` : '<div style="width: 70px;"></div>'}
        </div>

        <table class="meta-table">
          <tr>
            <td style="width: 85px;">Nomor</td>
            <td style="width: 15px;">:</td>
            <td style="font-weight: bold;">${values.nomorSurat}</td>
            <td style="text-align: right;">${values.tempatSurat || ''}${values.tempatSurat ? ', ' : ''}${formattedDate}</td>
          </tr>
          <tr>
            <td>Lampiran</td>
            <td>:</td>
            <td>${values.lampiran || '-'}</td>
            <td></td>
          </tr>
          <tr>
            <td>Perihal</td>
            <td>:</td>
            <td style="font-weight: bold; text-decoration: underline;">${values.perihal}</td>
            <td></td>
          </tr>
        </table>

        <div style="margin-bottom: 16px; font-size: 11.5pt;">
          <div>Kepada Yth,</div>
          <div style="font-weight: bold;">${values.tujuanKepada.replace(/\n/g, '<br/>')}</div>
          <div>di -</div>
          <div style="font-style: italic; margin-left: 20px;">${values.tujuanDi || 'Tempat'}</div>
        </div>

        <div class="letter-content">
          ${values.salamPembuka ? `<p style="margin-bottom: 10px;">${values.salamPembuka}</p>` : ''}
          ${values.paragrafPembuka ? `<p style="margin-bottom: 10px; text-indent: 30px;">${values.paragrafPembuka.replace(/\n/g, '<br/>')}</p>` : ''}
          ${values.subJudul ? `<p style="font-weight: bold; margin: 12px 0 6px 0;">${values.subJudul}</p>` : ''}
          ${poinIsiHtml}
          ${values.paragrafPenutup ? `<p style="margin-top: 10px; text-indent: 30px;">${values.paragrafPenutup.replace(/\n/g, '<br/>')}</p>` : ''}
        </div>

        <div style="margin-top: 20px; text-align: ${values.formatTtd === 'SATU_PEJABAT' ? 'right' : 'center'};">
          ${values.salamPenutup ? `<div style="margin-bottom: 4px;">${values.salamPenutup}</div>` : ''}
          ${values.namaInstansiTtd ? `<div style="font-weight: bold; text-transform: uppercase; margin-bottom: 12px;">${values.namaInstansiTtd}</div>` : ''}
        </div>

        <div class="signatures-container">
          ${signatoriesHtml}
        </div>

        ${values.adaLampiran ? `
          <div class="attachment-page">
            <h2 style="font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 16px;">
              ${values.judulLampiran || 'LAMPIRAN SURAT'}
            </h2>
            <div style="font-size: 11pt; line-height: 1.6; text-align: justify;">
              ${(values.isiLampiran || '').replace(/\n/g, '<br/>')}
            </div>
            ${values.gambarLampiranUrl ? `
              <div style="text-align: center; margin-top: 20px;">
                <img src="${values.gambarLampiranUrl}" style="max-width: 100%; max-height: 400px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 4px;" />
              </div>
            ` : ''}
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

  // Apply Preset Template
  const handleApplyPreset = (preset: SuratTemplatePreset) => {
    setFormValues((prev) => ({
      ...prev,
      ...preset.values,
      id: undefined, // Create new copy
    }))
    handleGenerateAutoNumber(preset.values.kategori as any || 'UNDANGAN')
    setActiveTab('editor')
    toast.success(`Template "${preset.title}" berhasil dimuat ke editor.`)
  }

  // Add Dynamic Point Item
  const handleAddPoin = () => {
    const newId = String(Date.now())
    setFormValues((prev) => ({
      ...prev,
      poinIsi: [...prev.poinIsi, { id: newId, text: '', isBold: false }],
    }))
  }

  // Update Dynamic Point
  const handleUpdatePoin = (id: string, text: string, isBold?: boolean) => {
    setFormValues((prev) => ({
      ...prev,
      poinIsi: prev.poinIsi.map((p) =>
        p.id === id ? { ...p, text, ...(isBold !== undefined ? { isBold } : {}) } : p
      ),
    }))
  }

  // Remove Dynamic Point
  const handleRemovePoin = (id: string) => {
    setFormValues((prev) => ({
      ...prev,
      poinIsi: prev.poinIsi.filter((p) => p.id !== id),
    }))
  }

  // Save / Archive Action
  const handleSave = async (status: 'DRAFT' | 'DITERBITKAN') => {
    if (!formValues.nomorSurat.trim()) {
      toast.error('Nomor surat wajib diisi.')
      return
    }
    if (!formValues.perihal.trim()) {
      toast.error('Perihal surat wajib diisi.')
      return
    }

    setIsSaving(true)
    const payload = { ...formValues, status }
    const res = await saveSuratResmiAction(payload)
    setIsSaving(false)

    if (res.success && res.data) {
      toast.success(res.message || 'Surat resmi berhasil disimpan.')
      setFormValues((prev) => ({ ...prev, id: res.data.id, status }))
    } else {
      toast.error(res.error || 'Gagal menyimpan surat.')
    }
  }

  // Load Letter into Editor from Archive
  const handleEditLetter = async (id: string) => {
    const toastId = toast.loading('Memuat berkas surat...')
    const res = await getSuratDetailAction(id)
    toast.dismiss(toastId)
    if (res.success && res.data) {
      const d = res.data
      setFormValues({
        id: d.id,
        nomorSurat: d.nomorSurat,
        perihal: d.perihal,
        lampiran: d.lampiran || '-',
        tanggalSurat: new Date(d.tanggalSurat).toISOString().split('T')[0],
        tempatSurat: d.tempatSurat,
        kategori: d.kategori,
        status: d.status,

        tujuanKepada: d.tujuanKepada,
        tujuanDi: d.tujuanDi,

        salamPembuka: d.salamPembuka,
        paragrafPembuka: d.paragrafPembuka,
        subJudul: d.subJudul || '',
        poinIsi: Array.isArray(d.poinIsi) ? (d.poinIsi as any) : [],
        paragrafPenutup: d.paragrafPenutup,

        modeLogo: (d.modeLogo as any) || 'SATU_LOGO',
        logoKiriUrl: d.logoKiriUrl,
        logoKananUrl: d.logoKananUrl,
        kopNama: d.kopNama,
        kopSub: d.kopSub || '',
        kopBadanHukum: d.kopBadanHukum || '',
        kopAlamat: d.kopAlamat || '',
        kopKontak: d.kopKontak || '',
        garisKopStyle: (d.garisKopStyle as any) || 'DOUBLE',
        garisKopColor: d.garisKopColor || '#0f172a',

        salamPenutup: d.salamPenutup,
        namaInstansiTtd: d.namaInstansiTtd || '',
        formatTtd: (d.formatTtd as any) || 'DUA_PEJABAT',
        signatories: Array.isArray(d.signatories) ? (d.signatories as any) : [],
        tampilkanStempel: d.tampilkanStempel ?? true,
        stempelUrl: d.stempelUrl,
        posisiStempel: (d.posisiStempel as any) || 'CENTER_OVERLAP',

        adaLampiran: d.adaLampiran ?? false,
        judulLampiran: d.judulLampiran || '',
        isiLampiran: d.isiLampiran || '',
        gambarLampiranUrl: d.gambarLampiranUrl,
      })
      setActiveTab('editor')
      toast.success('Surat berhasil dibuka di editor.')
    } else {
      toast.error(res.error || 'Gagal memuat surat.')
    }
  }

  // Delete Letter Action
  const handleDeleteLetter = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin memindahkan surat ini ke sampah arsip?')) return
    const res = await deleteSuratResmiAction(id)
    if (res.success) {
      toast.success('Surat berhasil dihapus.')
      fetchSuratList()
    } else {
      toast.error(res.error || 'Gagal menghapus surat.')
    }
  }

  return (
    <div className='p-4 sm:p-6 space-y-6 max-w-7xl mx-auto'>
      {/* ── HEADER HALAMAN ────────────────────────────────────────── */}
      <div className='flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b'>
        <div className='flex items-start sm:items-center gap-3'>
          <div className='p-2 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5 sm:mt-0'>
            <Sparkles className='size-5' />
          </div>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
              Surat Resmi
            </h1>
            <p className='text-xs text-muted-foreground mt-0.5 leading-relaxed'>
              Penyusun surat dinas dan ekspor dokumen Word.
            </p>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className='flex flex-wrap items-center gap-2 w-full xl:w-auto shrink-0'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              setFormValues(DEFAULT_SURAT_FORM_VALUES)
              handleGenerateAutoNumber('PEMBERITAHUAN')
              toast.info('Formulir surat baru telah disiapkan.')
            }}
            className='h-8 text-xs gap-1.5'
          >
            <Plus className='size-3.5' /> Surat Baru
          </Button>

          <Button
            size='sm'
            variant='outline'
            onClick={() => handleSave('DRAFT')}
            disabled={isSaving}
            className='h-8 text-xs gap-1.5'
          >
            {isSaving ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
            Simpan Draf
          </Button>

          <Button
            size='sm'
            variant='outline'
            onClick={() => handlePrintSurat(formValues)}
            className='h-8 text-xs gap-1.5 font-medium'
            title='Cetak langsung lembar surat A4'
          >
            <Printer className='size-3.5' /> Cetak Surat (A4)
          </Button>

          <Button
            size='sm'
            onClick={async () => {
              const toastId = toast.loading('Menyiapkan dokumen Word (.docx)...')
              try {
                await exportSuratToWord(formValues)
                toast.dismiss(toastId)
                toast.success('Dokumen Word (.docx) berhasil diunduh.')
              } catch (err) {
                toast.dismiss(toastId)
                toast.error('Gagal mengunduh dokumen Word.')
              }
            }}
            className='h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs'
            title='Unduh format Word (.docx) asli yang dapat diedit di Microsoft Word / WPS Office'
          >
            <Download className='size-3.5' /> Unduh Word (.docx)
          </Button>
        </div>
      </div>

      {/* ── TABS NAVIGATION ──────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className='flex w-full overflow-x-auto justify-start gap-1 p-1 bg-muted/60 rounded-xl no-scrollbar'>
          <TabsTrigger value='editor' className='text-xs gap-1.5 px-3 py-1.5 shrink-0'>
            <Edit3 className='size-3.5' /> Editor Surat
          </TabsTrigger>
          <TabsTrigger value='arsip' className='text-xs gap-1.5 px-3 py-1.5 shrink-0'>
            <BookOpen className='size-3.5' /> Arsip Surat ({suratList.length})
          </TabsTrigger>
          <TabsTrigger value='templates' className='text-xs gap-1.5 px-3 py-1.5 shrink-0'>
            <Sparkles className='size-3.5' /> Template Cepat
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: SPLIT-SCREEN EDITOR + LIVE PREVIEW ─────────────── */}
        <TabsContent value='editor' className='space-y-4 pt-2'>
          {/* Mobile View Toggle Switcher (Shown only on < lg screens) */}
          <div className='lg:hidden flex items-center bg-muted/60 p-1 rounded-xl text-xs font-semibold gap-1'>
            <button
              type='button'
              onClick={() => setMobileEditorTab('form')}
              className={`flex-1 h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                mobileEditorTab === 'form'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Edit3 className='size-3.5 shrink-0' /> Form Input
            </button>
            <button
              type='button'
              onClick={() => setMobileEditorTab('preview')}
              className={`flex-1 h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                mobileEditorTab === 'preview'
                  ? 'bg-background text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className='size-3.5 shrink-0' /> Pratinjau A4
            </button>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
            {/* SISI KIRI: FORMULIR INPUT LENGKAP */}
            <div className={`space-y-4 lg:col-span-6 ${mobileEditorTab === 'form' ? 'block' : 'hidden lg:block'}`}>
              {/* Toolbar Pembantu Cepat */}
              <div className='flex flex-wrap items-center justify-between gap-2 p-2.5 bg-muted/40 border rounded-lg text-xs'>
                <span className='font-semibold text-foreground flex items-center gap-1'>
                  Status:{' '}
                  <Badge variant='outline' className='font-mono'>
                    {formValues.status}
                  </Badge>
                </span>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={handleSyncMasterKop}
                  className='h-7 text-xs gap-1 text-primary hover:bg-primary/10 px-2'
                >
                  <RefreshCw className='size-3' /> Ambil Kop Master Cetak
                </Button>
              </div>

              {/* Accordion Bagian-Bagian Surat */}
              <div className='space-y-4'>
                {/* 1. KOP SURAT */}
                <Card className='shadow-xs'>
                  <CardHeader className='pb-2 pt-3 px-4'>
                    <CardTitle className='text-xs sm:text-sm font-bold flex items-center gap-2'>
                      <Building2 className='size-4 text-primary' /> 1. Konfigurasi Kop Surat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='px-4 pb-4 space-y-3 text-xs'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <div>
                        <Label className='text-[11px] font-semibold'>Mode Logo</Label>
                        <Select
                          value={formValues.modeLogo}
                          onValueChange={(val: any) => setFormValues((p) => ({ ...p, modeLogo: val }))}
                        >
                          <SelectTrigger className='h-8 text-xs mt-1'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='SATU_LOGO'>1 Logo (Gereja Lokal)</SelectItem>
                            <SelectItem value='DUA_LOGO'>2 Logo (Sinode &amp; Lokal)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className='text-[11px] font-semibold'>Garis Kop</Label>
                        <Select
                          value={formValues.garisKopStyle}
                          onValueChange={(val: any) => setFormValues((p) => ({ ...p, garisKopStyle: val }))}
                        >
                          <SelectTrigger className='h-8 text-xs mt-1'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='DOUBLE'>Garis Ganda (Resmi)</SelectItem>
                            <SelectItem value='SINGLE'>Garis Tunggal</SelectItem>
                            <SelectItem value='GOLD'>Garis Emas Elegan</SelectItem>
                            <SelectItem value='NAVY'>Garis Biru Navy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <ImageUploadField
                        label='Logo Kiri (Logo Sinode / Utama)'
                        description='PNG / JPG transparan'
                        value={formValues.logoKiriUrl}
                        onChange={(newUrl) => setFormValues((p) => ({ ...p, logoKiriUrl: newUrl }))}
                        enableBgRemoval={true}
                      />
                      {formValues.modeLogo === 'DUA_LOGO' && (
                        <ImageUploadField
                          label='Logo Kanan (Logo Lokal / Event)'
                          description='PNG / JPG transparan'
                          value={formValues.logoKananUrl}
                          onChange={(newUrl) => setFormValues((p) => ({ ...p, logoKananUrl: newUrl }))}
                          enableBgRemoval={true}
                        />
                      )}
                    </div>

                    <div>
                      <Label className='text-[11px] font-semibold'>Nama Instansi / Gereja (Baris Judul Kop)</Label>
                      <Textarea
                        rows={2}
                        className='text-xs mt-1'
                        placeholder='GEREJA BETHEL INDONESIA&#10;JEMAAT LOKAL'
                        value={formValues.kopNama}
                        onChange={(e) => setFormValues((p) => ({ ...p, kopNama: e.target.value }))}
                      />
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <div>
                        <Label className='text-[11px] font-semibold'>Sub-Judul Lembaga</Label>
                        <Input
                          className='h-8 text-xs mt-1'
                          placeholder='SEKRETARIAT BPD / PENGURUS JEMAAT'
                          value={formValues.kopSub || ''}
                          onChange={(e) => setFormValues((p) => ({ ...p, kopSub: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className='text-[11px] font-semibold'>SK Dirjen Bimas / Badan Hukum</Label>
                        <Input
                          className='h-8 text-xs mt-1'
                          placeholder='SK Dirjen Bimas Kristen No.41 Thn 1972'
                          value={formValues.kopBadanHukum || ''}
                          onChange={(e) => setFormValues((p) => ({ ...p, kopBadanHukum: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <div>
                        <Label className='text-[11px] font-semibold'>Alamat Sekretariat</Label>
                        <Input
                          className='h-8 text-xs mt-1'
                          placeholder='Jl. Jenderal Sudirman No. 45, Padang'
                          value={formValues.kopAlamat || ''}
                          onChange={(e) => setFormValues((p) => ({ ...p, kopAlamat: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className='text-[11px] font-semibold'>Kontak / Email / Telp</Label>
                        <Input
                          className='h-8 text-xs mt-1'
                          placeholder='Telp: (0751) 123456 • Email: ...'
                          value={formValues.kopKontak || ''}
                          onChange={(e) => setFormValues((p) => ({ ...p, kopKontak: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. METADATA & TUJUAN SURAT */}
                <Card className='shadow-xs'>
                  <CardHeader className='pb-2 pt-3 px-4'>
                    <CardTitle className='text-xs sm:text-sm font-bold flex items-center gap-2'>
                      <Calendar className='size-4 text-primary' /> 2. Metadata &amp; Tujuan Surat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='px-4 pb-4 space-y-3 text-xs'>
                    <div className='grid grid-cols-1 sm:grid-cols-12 gap-3'>
                      <div className='sm:col-span-8'>
                        <div className='flex items-center justify-between mb-1'>
                          <Label className='text-[11px] font-semibold text-foreground'>Nomor Surat Resmi</Label>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            onClick={() => handleGenerateAutoNumber(formValues.kategori)}
                            disabled={isGeneratingNo}
                            className='h-5 px-2 text-[10px] font-bold gap-1 rounded-md bg-primary/10 text-primary border-primary/25 hover:bg-primary/20 hover:border-primary/40 transition-colors shadow-2xs'
                            title='Generate nomor surat otomatis berdasarkan urutan & kategori'
                          >
                            <Sparkles className={`size-3 ${isGeneratingNo ? 'animate-spin text-primary' : 'text-primary'}`} />
                            <span>Auto Nomor</span>
                          </Button>
                        </div>
                        <Input
                          className='h-8 text-xs font-mono font-bold'
                          placeholder='Contoh: 001/GBI-GET/UND/VIII/2026'
                          value={formValues.nomorSurat}
                          onChange={(e) => setFormValues((p) => ({ ...p, nomorSurat: e.target.value }))}
                        />
                      </div>

                      <div className='sm:col-span-4'>
                        <Label className='text-[11px] font-semibold'>Kategori Surat</Label>
                        <Select
                          value={formValues.kategori}
                          onValueChange={(val: any) => {
                            setFormValues((p) => ({ ...p, kategori: val }))
                            handleGenerateAutoNumber(val)
                          }}
                        >
                          <SelectTrigger className='h-8 text-xs mt-1'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='UNDANGAN'>Undangan</SelectItem>
                            <SelectItem value='KETERANGAN'>Keterangan</SelectItem>
                            <SelectItem value='REKOMENDASI'>Rekomendasi</SelectItem>
                            <SelectItem value='TUGAS'>Surat Tugas</SelectItem>
                            <SelectItem value='PEMBERITAHUAN'>Pemberitahuan</SelectItem>
                            <SelectItem value='BAPTIS'>Baptisan Kudus</SelectItem>
                            <SelectItem value='PENYERAHAN_ANAK'>Penyerahan Anak</SelectItem>
                            <SelectItem value='PERNIKAHAN'>Pernikahan</SelectItem>
                            <SelectItem value='LAINNYA'>Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                      <div className='sm:col-span-2'>
                        <Label className='text-[11px] font-semibold'>Perihal Surat (Hal)</Label>
                        <Input
                          className='h-8 text-xs mt-1 font-bold'
                          placeholder='SIDANG MD BPD DKI JAKARTA'
                          value={formValues.perihal}
                          onChange={(e) => setFormValues((p) => ({ ...p, perihal: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className='text-[11px] font-semibold'>Lampiran</Label>
                        <Input
                          className='h-8 text-xs mt-1'
                          placeholder='- atau 1 Berkas'
                          value={formValues.lampiran}
                          onChange={(e) => setFormValues((p) => ({ ...p, lampiran: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <div>
                        <Label className='text-[11px] font-semibold'>Tempat Terbit</Label>
                        <Input
                          className='h-8 text-xs mt-1'
                          placeholder='Jakarta / Padang'
                          value={formValues.tempatSurat}
                          onChange={(e) => setFormValues((p) => ({ ...p, tempatSurat: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className='text-[11px] font-semibold'>Tanggal Surat</Label>
                        <Input
                          type='date'
                          className='h-8 text-xs mt-1'
                          value={formValues.tanggalSurat}
                          onChange={(e) => setFormValues((p) => ({ ...p, tanggalSurat: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1'>
                      <div className='sm:col-span-8'>
                        <Label className='text-[11px] font-semibold'>Penerima (Kepada Yth)</Label>
                        <Textarea
                          rows={2}
                          className='text-xs mt-1'
                          placeholder='Bapak/Ibu Gembala Jemaat / Seluruh Pejabat&#10;Gereja Bethel Indonesia'
                          value={formValues.tujuanKepada}
                          onChange={(e) => setFormValues((p) => ({ ...p, tujuanKepada: e.target.value }))}
                        />
                      </div>
                      <div className='sm:col-span-4'>
                        <Label className='text-[11px] font-semibold'>Kota / Lokasi Tujuan</Label>
                        <Input
                          className='h-8 text-xs mt-1'
                          placeholder='Di Jakarta / Di Tempat'
                          value={formValues.tujuanDi}
                          onChange={(e) => setFormValues((p) => ({ ...p, tujuanDi: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. ISI SURAT & POIN-POIN */}
                <Card className='shadow-xs'>
                  <CardHeader className='pb-2 pt-3 px-4'>
                    <CardTitle className='text-xs sm:text-sm font-bold flex items-center gap-2'>
                      <Layers className='size-4 text-primary' /> 3. Pembangun Isi Surat Dinamis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='px-4 pb-4 space-y-3 text-xs'>
                    <div>
                      <Label className='text-[11px] font-semibold'>Salam Pembuka</Label>
                      <Input
                        className='h-8 text-xs mt-1 font-medium'
                        placeholder='Salam dalam kasih Kristus,'
                        value={formValues.salamPembuka}
                        onChange={(e) => setFormValues((p) => ({ ...p, salamPembuka: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label className='text-[11px] font-semibold'>Paragraf Pembuka / Pengantar</Label>
                      <Textarea
                        rows={3}
                        className='text-xs mt-1 leading-relaxed'
                        placeholder='Dengan ucapan syukur dan penuh sukacita, bersama ini kami sampaikan bahwa...'
                        value={formValues.paragrafPembuka}
                        onChange={(e) => setFormValues((p) => ({ ...p, paragrafPembuka: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label className='text-[11px] font-semibold'>Sub-Judul Pokok Isi (Opsional)</Label>
                      <Input
                        className='h-8 text-xs mt-1 font-bold uppercase'
                        placeholder='SIDANG MAJELIS DAERAH'
                        value={formValues.subJudul || ''}
                        onChange={(e) => setFormValues((p) => ({ ...p, subJudul: e.target.value }))}
                      />
                    </div>

                    {/* Dynamic Points Builder */}
                    <div className='space-y-2 pt-1 border-t'>
                      <div className='flex items-center justify-between'>
                        <Label className='text-[11px] font-bold text-slate-900'>
                          Poin-Poin Isi Surat ({formValues.poinIsi.length})
                        </Label>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={handleAddPoin}
                          className='h-6 text-[10.5px] gap-1 text-primary'
                        >
                          <Plus className='size-3' /> Tambah Baris Poin
                        </Button>
                      </div>

                      <div className='space-y-2 max-h-60 overflow-y-auto pr-1'>
                        {formValues.poinIsi.map((item, idx) => (
                          <div key={item.id} className='flex items-start gap-1.5 bg-muted/30 p-2 rounded-md border'>
                            <span className='font-bold text-xs shrink-0 w-5 pt-1 text-center'>{idx + 1}.</span>
                            <Textarea
                              rows={2}
                              className={`text-xs flex-1 ${item.isBold ? 'font-bold' : ''}`}
                              placeholder={`Poin penjelasan ke-${idx + 1}...`}
                              value={item.text}
                              onChange={(e) => handleUpdatePoin(item.id, e.target.value)}
                            />
                            <div className='flex flex-col gap-1 shrink-0'>
                              <Button
                                size='icon'
                                variant='ghost'
                                title={item.isBold ? 'Batal Tebal' : 'Tebalkan Teks'}
                                onClick={() => handleUpdatePoin(item.id, item.text, !item.isBold)}
                                className={`size-6 text-[10px] font-black ${
                                  item.isBold ? 'bg-primary text-primary-foreground' : 'text-slate-600'
                                }`}
                              >
                                B
                              </Button>
                              <Button
                                size='icon'
                                variant='ghost'
                                onClick={() => handleRemovePoin(item.id)}
                                className='size-6 text-destructive hover:bg-destructive/10'
                              >
                                <Trash2 className='size-3' />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className='text-[11px] font-semibold'>Paragraf Penutup</Label>
                      <Textarea
                        rows={3}
                        className='text-xs mt-1 leading-relaxed'
                        placeholder='Demikianlah hal yang dapat kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih. Tuhan Yesus Memberkati.'
                        value={formValues.paragrafPenutup}
                        onChange={(e) => setFormValues((p) => ({ ...p, paragrafPenutup: e.target.value }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 4. PENANDATANGAN & STEMPEL RESMI */}
                <Card className='shadow-xs'>
                  <CardHeader className='pb-2 pt-3 px-4'>
                    <CardTitle className='text-xs sm:text-sm font-bold flex items-center gap-2'>
                      <Stamp className='size-4 text-primary' /> 4. Tanda Tangan &amp; Stempel Resmi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='px-4 pb-4 space-y-3 text-xs'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <div>
                        <Label className='text-[11px] font-semibold'>Salam Penutup TTD</Label>
                        <Input
                          className='h-8 text-xs mt-1 font-medium'
                          placeholder='Dalam KasihNya,'
                          value={formValues.salamPenutup}
                          onChange={(e) => setFormValues((p) => ({ ...p, salamPenutup: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className='text-[11px] font-semibold'>Nama Instansi / Badan Penandatangan</Label>
                        <Input
                          className='h-8 text-xs mt-1 font-bold'
                          placeholder='Badan Pekerja Daerah DKI Jakarta'
                          value={formValues.namaInstansiTtd || ''}
                          onChange={(e) => setFormValues((p) => ({ ...p, namaInstansiTtd: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <div>
                        <Label className='text-[11px] font-semibold'>Format Pejabat</Label>
                        <Select
                          value={formValues.formatTtd}
                          onValueChange={(val: any) => setFormValues((p) => ({ ...p, formatTtd: val }))}
                        >
                          <SelectTrigger className='h-8 text-xs mt-1'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='DUA_PEJABAT'>2 Pejabat (Ketua &amp; Sekretaris)</SelectItem>
                            <SelectItem value='SATU_PEJABAT'>1 Pejabat (Gembala Jemaat)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className='text-[11px] font-semibold'>Posisi Stempel</Label>
                        <Select
                          value={formValues.posisiStempel}
                          onValueChange={(val: any) => setFormValues((p) => ({ ...p, posisiStempel: val }))}
                        >
                          <SelectTrigger className='h-8 text-xs mt-1 truncate'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='CENTER_OVERLAP'>Tengah (Overlap TTD)</SelectItem>
                            <SelectItem value='LEFT'>Sisi Kiri (Pejabat 1)</SelectItem>
                            <SelectItem value='RIGHT'>Sisi Kanan (Pejabat 2)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Pejabat 1 Configuration */}
                    <div className='p-3.5 bg-muted/30 border rounded-xl space-y-3'>
                      <div className='flex items-center justify-between'>
                        <span className='font-bold text-xs text-foreground'>
                          Pejabat 1 (Sisi Kiri / Ketua / Gembala)
                        </span>
                        <Badge variant='outline' className='text-[10px] font-mono'>KIRI</Badge>
                      </div>

                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                        <div>
                          <Label className='text-[10.5px] font-semibold text-foreground'>Jabatan</Label>
                          <Input
                            placeholder='contoh: Gembala Jemaat'
                            className='h-8 text-xs mt-1'
                            value={formValues.signatories[0]?.jabatan || ''}
                            onChange={(e) => {
                              const updated = [...formValues.signatories]
                              if (!updated[0]) updated[0] = { roleKey: 'ketua', jabatan: '', nama: '', gelar: '', nomorInduk: '', ttdUrl: null }
                              updated[0].jabatan = e.target.value
                              setFormValues((p) => ({ ...p, signatories: updated }))
                            }}
                          />
                        </div>
                        <div>
                          <Label className='text-[10.5px] font-semibold text-foreground'>Nama Lengkap</Label>
                          <Input
                            placeholder='Nama Pejabat'
                            className='h-8 text-xs font-bold mt-1'
                            value={formValues.signatories[0]?.nama || ''}
                            onChange={(e) => {
                              const updated = [...formValues.signatories]
                              if (!updated[0]) updated[0] = { roleKey: 'ketua', jabatan: '', nama: '', gelar: '', nomorInduk: '', ttdUrl: null }
                              updated[0].nama = e.target.value
                              setFormValues((p) => ({ ...p, signatories: updated }))
                            }}
                          />
                        </div>
                        <div>
                          <Label className='text-[10.5px] font-semibold text-foreground'>Gelar (Opsional)</Label>
                          <Input
                            placeholder='contoh: M.Th., M.Pd.'
                            className='h-8 text-xs mt-1'
                            value={formValues.signatories[0]?.gelar || ''}
                            onChange={(e) => {
                              const updated = [...formValues.signatories]
                              if (updated[0]) updated[0].gelar = e.target.value
                              setFormValues((p) => ({ ...p, signatories: updated }))
                            }}
                          />
                        </div>
                        <div>
                          <Label className='text-[10.5px] font-semibold text-foreground'>NIP / Nomor Induk (Opsional)</Label>
                          <Input
                            placeholder='contoh: NIP-2024-001'
                            className='h-8 text-xs mt-1'
                            value={formValues.signatories[0]?.nomorInduk || ''}
                            onChange={(e) => {
                              const updated = [...formValues.signatories]
                              if (updated[0]) updated[0].nomorInduk = e.target.value
                              setFormValues((p) => ({ ...p, signatories: updated }))
                            }}
                          />
                        </div>
                      </div>

                      <ImageUploadField
                        label='Upload Tanda Tangan Pejabat 1'
                        description='Foto / scan tanda tangan di kertas'
                        value={formValues.signatories[0]?.ttdUrl}
                        onChange={(newUrl) => {
                          const updated = [...formValues.signatories]
                          if (updated[0]) updated[0].ttdUrl = newUrl
                          setFormValues((p) => ({ ...p, signatories: updated }))
                        }}
                        enableBgRemoval={true}
                        aspect='wide'
                      />
                    </div>

                    {/* Pejabat 2 Configuration */}
                    {formValues.formatTtd === 'DUA_PEJABAT' && (
                      <div className='p-3.5 bg-muted/30 border rounded-xl space-y-3'>
                        <div className='flex items-center justify-between'>
                          <span className='font-bold text-xs text-foreground'>
                            Pejabat 2 (Sisi Kanan / Sekretaris)
                          </span>
                          <Badge variant='outline' className='text-[10px] font-mono'>KANAN</Badge>
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                          <div>
                            <Label className='text-[10.5px] font-semibold text-foreground'>Jabatan</Label>
                            <Input
                              placeholder='contoh: Sekretaris Majelis'
                              className='h-8 text-xs mt-1'
                              value={formValues.signatories[1]?.jabatan || ''}
                              onChange={(e) => {
                                const updated = [...formValues.signatories]
                                if (!updated[1]) updated[1] = { roleKey: 'sekretaris', jabatan: '', nama: '', gelar: '', nomorInduk: '', ttdUrl: null }
                                updated[1].jabatan = e.target.value
                                setFormValues((p) => ({ ...p, signatories: updated }))
                              }}
                            />
                          </div>
                          <div>
                            <Label className='text-[10.5px] font-semibold text-foreground'>Nama Lengkap</Label>
                            <Input
                              placeholder='Nama Pejabat'
                              className='h-8 text-xs font-bold mt-1'
                              value={formValues.signatories[1]?.nama || ''}
                              onChange={(e) => {
                                const updated = [...formValues.signatories]
                                if (!updated[1]) updated[1] = { roleKey: 'sekretaris', jabatan: '', nama: '', gelar: '', nomorInduk: '', ttdUrl: null }
                                updated[1].nama = e.target.value
                                setFormValues((p) => ({ ...p, signatories: updated }))
                              }}
                            />
                          </div>
                          <div>
                            <Label className='text-[10.5px] font-semibold text-foreground'>Gelar (Opsional)</Label>
                            <Input
                              placeholder='contoh: S.Th.'
                              className='h-8 text-xs mt-1'
                              value={formValues.signatories[1]?.gelar || ''}
                              onChange={(e) => {
                                const updated = [...formValues.signatories]
                                if (updated[1]) updated[1].gelar = e.target.value
                                setFormValues((p) => ({ ...p, signatories: updated }))
                              }}
                            />
                          </div>
                          <div>
                            <Label className='text-[10.5px] font-semibold text-foreground'>NIP / Nomor Induk (Opsional)</Label>
                            <Input
                              placeholder='contoh: NIP-2024-002'
                              className='h-8 text-xs mt-1'
                              value={formValues.signatories[1]?.nomorInduk || ''}
                              onChange={(e) => {
                                const updated = [...formValues.signatories]
                                if (updated[1]) updated[1].nomorInduk = e.target.value
                                setFormValues((p) => ({ ...p, signatories: updated }))
                              }}
                            />
                          </div>
                        </div>

                        <ImageUploadField
                          label='Upload Tanda Tangan Pejabat 2'
                          description='Foto / scan tanda tangan di kertas'
                          value={formValues.signatories[1]?.ttdUrl}
                          onChange={(newUrl) => {
                            const updated = [...formValues.signatories]
                            if (updated[1]) updated[1].ttdUrl = newUrl
                            setFormValues((p) => ({ ...p, signatories: updated }))
                          }}
                          enableBgRemoval={true}
                          aspect='wide'
                        />
                      </div>
                    )}

                    {/* Stempel Toggle & URL */}
                    <div className='flex items-center justify-between pt-2 border-t'>
                      <div className='space-y-0.5'>
                        <Label className='text-[11px] font-semibold'>Tampilkan Stempel Resmi Gereja</Label>
                        <p className='text-[10px] text-muted-foreground'>
                          Cap stempel berada di belakang tanda tangan pejabat
                        </p>
                      </div>
                      <Switch
                        checked={formValues.tampilkanStempel}
                        onCheckedChange={(val) => setFormValues((p) => ({ ...p, tampilkanStempel: val }))}
                      />
                    </div>

                    {formValues.tampilkanStempel && (
                      <ImageUploadField
                        label='Upload Cap Stempel Resmi'
                        description='Foto/scan cap basah (tersedia AI Transparan)'
                        value={formValues.stempelUrl}
                        onChange={(newUrl) => setFormValues((p) => ({ ...p, stempelUrl: newUrl }))}
                        enableBgRemoval={true}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* 5. LAMPIRAN TAMBAHAN */}
                <Card className='shadow-xs'>
                  <CardHeader className='pb-2 pt-3 px-4'>
                    <div className='flex items-center justify-between'>
                      <CardTitle className='text-xs sm:text-sm font-bold flex items-center gap-2'>
                        <Paperclip className='size-4 text-primary' /> 5. Lembar Lampiran Tambahan (Opsional)
                      </CardTitle>
                      <Switch
                        checked={formValues.adaLampiran}
                        onCheckedChange={(val) => setFormValues((p) => ({ ...p, adaLampiran: val }))}
                      />
                    </div>
                  </CardHeader>
                  {formValues.adaLampiran && (
                    <CardContent className='px-4 pb-4 space-y-3 text-xs'>
                      <div>
                        <Label className='text-[11px] font-semibold'>Judul Lampiran</Label>
                        <Input
                          className='h-8 text-xs mt-1'
                          placeholder='Rincian Jadwal Sidang MD &amp; Rundown Acara'
                          value={formValues.judulLampiran || ''}
                          onChange={(e) => setFormValues((p) => ({ ...p, judulLampiran: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className='text-[11px] font-semibold'>Isi Teks Lampiran</Label>
                        <Textarea
                          rows={3}
                          className='text-xs mt-1'
                          placeholder='Tuliskan rincian tabel/jadwal/instruksi lampiran di sini...'
                          value={formValues.isiLampiran || ''}
                          onChange={(e) => setFormValues((p) => ({ ...p, isiLampiran: e.target.value }))}
                        />
                      </div>
                      <ImageUploadField
                        label='Gambar / Brosur / Bagan Lampiran (Opsional)'
                        description='PNG / JPG lampiran'
                        value={formValues.gambarLampiranUrl}
                        onChange={(newUrl) => setFormValues((p) => ({ ...p, gambarLampiranUrl: newUrl }))}
                        enableBgRemoval={false}
                        aspect='wide'
                      />
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>

            {/* SISI KANAN: LIVE PREVIEW LEMBAR A4 */}
            <div className={`lg:col-span-6 sticky top-4 space-y-3 ${mobileEditorTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
              {/* Header Toolbar */}
              <div className='flex items-center justify-between gap-2 bg-muted/40 p-2 border rounded-lg text-xs'>
                <div className='flex items-center gap-2 min-w-0'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setMobileEditorTab('form')}
                    className='lg:hidden h-8 px-2.5 text-xs font-semibold gap-1.5 text-foreground shrink-0 shadow-2xs'
                  >
                    <Edit3 className='size-3.5' />
                    <span>Edit Form</span>
                  </Button>
                  <div className='hidden lg:flex items-center gap-2'>
                    <span className='font-bold text-xs flex items-center gap-1.5 text-foreground'>
                      <Eye className='size-4 text-primary' /> Pratinjau Lembar A4
                    </span>
                    <Badge variant='outline' className='text-[10px] font-mono text-muted-foreground'>
                      210 × 297 mm
                    </Badge>
                  </div>
                </div>

                {/* Tombol Unduh Dokumen Word */}
                <Button
                  size='sm'
                  onClick={async () => {
                    const toastId = toast.loading('Menyiapkan dokumen Word (.docx)...')
                    try {
                      await exportSuratToWord(formValues)
                      toast.dismiss(toastId)
                      toast.success('Dokumen Word (.docx) berhasil diunduh.')
                    } catch (err) {
                      toast.dismiss(toastId)
                      toast.error('Gagal mengunduh dokumen Word.')
                    }
                  }}
                  className='h-8 text-xs px-2.5 sm:px-3 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs shrink-0'
                  title='Unduh format Word (.docx)'
                >
                  <Download className='size-3.5' />
                  <span>Unduh Word</span>
                  <span className='hidden sm:inline'>(.docx)</span>
                </Button>
              </div>

              {/* A4 Sheet Container with Floating Zoom Controller at TOP */}
              <div className='relative rounded-xl overflow-hidden border'>
                {/* Floating Modern Zoom Controller Dock at TOP (Top-Center Dock) */}
                <div className='absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto'>
                  <div className='flex items-center gap-1 bg-background/95 dark:bg-card/95 backdrop-blur-md border border-border/80 shadow-md px-2 py-1 rounded-full text-xs animate-in fade-in zoom-in-95 duration-150'>
                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      onClick={() => setZoomLevel((prev) => Math.max(40, prev - 10))}
                      disabled={zoomLevel <= 40}
                      className='size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted'
                      title='Perkecil (Zoom Out -10%)'
                    >
                      <ZoomOut className='size-3.5' />
                    </Button>

                    <Select
                      value={String(zoomLevel)}
                      onValueChange={(val) => setZoomLevel(Number(val))}
                    >
                      <SelectTrigger className='h-7 text-xs font-bold px-2 gap-1 border-none shadow-none bg-muted/50 hover:bg-muted rounded-full focus:ring-0'>
                        <SelectValue>{zoomLevel}%</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='40'>40%</SelectItem>
                        <SelectItem value='50'>50% (Kompak)</SelectItem>
                        <SelectItem value='60'>60%</SelectItem>
                        <SelectItem value='75'>75% (Ideal Layar)</SelectItem>
                        <SelectItem value='85'>85%</SelectItem>
                        <SelectItem value='100'>100% (Ukuran Asli A4)</SelectItem>
                        <SelectItem value='125'>125% (Besar)</SelectItem>
                        <SelectItem value='150'>150%</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      onClick={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
                      disabled={zoomLevel >= 150}
                      className='size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted'
                      title='Perbesar (Zoom In +10%)'
                    >
                      <ZoomIn className='size-3.5' />
                    </Button>

                    <div className='w-px h-4 bg-border mx-0.5' />

                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      onClick={() => setZoomLevel(100)}
                      className='size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted'
                      title='Reset ke 100% (Ukuran Cetak Asli)'
                    >
                      <RotateCcw className='size-3.5' />
                    </Button>
                  </div>
                </div>

                {/* A4 Printable Paper Scroll Container */}
                <div className='bg-slate-100/80 dark:bg-slate-900/60 pt-12 pb-6 px-3 sm:px-6 max-h-[82vh] overflow-y-auto overflow-x-auto shadow-inner flex justify-center'>
                  <div
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center',
                      width: '210mm',
                      height: `calc(297mm * ${zoomLevel / 100})`,
                      transition: 'transform 0.15s ease-out, height 0.15s ease-out',
                      flexShrink: 0,
                    }}
                  >
                    <SuratPreviewSheet values={formValues} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Mobile Preview Pill */}
          {activeTab === 'editor' && mobileEditorTab === 'form' && (
            <div className='lg:hidden fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-4 duration-200'>
              <Button
                onClick={() => {
                  setMobileEditorTab('preview')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className='rounded-full shadow-xl h-11 px-4 gap-2 text-xs font-bold bg-primary text-primary-foreground border border-primary-foreground/20 hover:scale-105 transition-transform'
              >
                <Eye className='size-4' /> Pratinjau Surat
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: DAFTAR ARSIP & RIWAYAT SURAT ───────────────────── */}
        <TabsContent value='arsip' className='space-y-4 pt-2'>
          <Card className='shadow-xs'>
            <CardHeader className='pb-3 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div>
                <CardTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
                  <BookOpen className='size-4 text-primary' /> Arsip Surat
                </CardTitle>
                <CardDescription className='text-xs'>
                  Daftar riwayat dan draf surat dinas yang tersimpan.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto'>
                <div className='relative w-full sm:w-60'>
                  <Search className='size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    placeholder='Cari nomor / perihal...'
                    className='h-8 text-xs pl-8 w-full'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className='grid grid-cols-2 gap-2 w-full sm:w-auto'>
                  <Select value={filterKategori} onValueChange={setFilterKategori}>
                    <SelectTrigger className='h-8 text-xs px-2 w-full sm:w-36'>
                      <SelectValue placeholder='Kategori' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='ALL' className='text-xs'>Semua Kategori</SelectItem>
                      <SelectItem value='UNDANGAN' className='text-xs'>Undangan</SelectItem>
                      <SelectItem value='KETERANGAN' className='text-xs'>Keterangan</SelectItem>
                      <SelectItem value='REKOMENDASI' className='text-xs'>Rekomendasi</SelectItem>
                      <SelectItem value='TUGAS' className='text-xs'>Surat Tugas</SelectItem>
                      <SelectItem value='PEMBERITAHUAN' className='text-xs'>Pemberitahuan</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className='h-8 text-xs px-2 w-full sm:w-28'>
                      <SelectValue placeholder='Status' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='ALL' className='text-xs'>Semua Status</SelectItem>
                      <SelectItem value='DRAFT' className='text-xs'>Draf</SelectItem>
                      <SelectItem value='DITERBITKAN' className='text-xs'>Terbit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className='p-0'>
              {isLoadingList ? (
                <div className='flex items-center justify-center min-h-[250px] text-muted-foreground gap-2 text-xs'>
                  <Loader2 className='size-4 animate-spin text-primary' /> Memuat arsip surat...
                </div>
              ) : suratList.length === 0 ? (
                <div className='text-center py-12 text-muted-foreground space-y-2'>
                  <FileText className='size-10 mx-auto opacity-30' />
                  <p className='text-xs font-semibold'>Belum ada arsip surat resmi yang tersimpan.</p>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setActiveTab('editor')}
                    className='text-xs gap-1.5'
                  >
                    <Plus className='size-3.5' /> Buat Surat Sekarang
                  </Button>
                </div>
              ) : (
                <>
                  {/* Desktop / Tablet Table View */}
                  <div className='hidden md:block overflow-x-auto'>
                    <table className='w-full text-xs text-left border-collapse'>
                      <thead>
                        <tr className='bg-muted/50 border-y font-bold text-foreground/80'>
                          <th className='py-2.5 px-4 w-12 text-center'>No</th>
                          <th className='py-2.5 px-4'>Nomor &amp; Perihal Surat</th>
                          <th className='py-2.5 px-4 w-48'>Tujuan Penerima</th>
                          <th className='py-2.5 px-4 w-32'>Kategori</th>
                          <th className='py-2.5 px-4 w-28'>Tanggal</th>
                          <th className='py-2.5 px-4 w-24 text-center'>Status</th>
                          <th className='py-2.5 px-4 w-32 text-right'>Aksi</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y'>
                        {suratList.map((item, idx) => (
                          <tr key={item.id} className='hover:bg-muted/20 transition-colors'>
                            <td className='py-3 px-4 text-center text-muted-foreground font-mono'>
                              {idx + 1}
                            </td>
                            <td className='py-3 px-4'>
                              <div className='font-mono font-bold text-foreground'>{item.nomorSurat}</div>
                              <div className='font-semibold text-foreground/90 text-[11px] mt-0.5'>
                                {item.perihal}
                              </div>
                            </td>
                            <td className='py-3 px-4 text-muted-foreground truncate max-w-[200px]'>
                              {item.tujuanKepada.split('\n')[0]}
                            </td>
                            <td className='py-3 px-4'>
                              <Badge variant='outline' className='text-[10px]'>
                                {item.kategori}
                              </Badge>
                            </td>
                            <td className='py-3 px-4 text-muted-foreground text-[11px]'>
                              {new Date(item.tanggalSurat).toLocaleDateString('id-ID')}
                            </td>
                            <td className='py-3 px-4 text-center'>
                              <Badge
                                className={`text-[10px] ${
                                  item.status === 'DITERBITKAN'
                                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700'
                                    : 'bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700'
                                }`}
                              >
                                {item.status}
                              </Badge>
                            </td>
                            <td className='py-3 px-4 text-right'>
                              <div className='flex items-center justify-end gap-1.5'>
                                <Button
                                  size='icon'
                                  variant='outline'
                                  title='Cetak Surat (A4)'
                                  onClick={() => handlePrintSurat({
                                    ...item,
                                    poinIsi: Array.isArray(item.poinIsi) ? item.poinIsi : [],
                                    signatories: Array.isArray(item.signatories) ? item.signatories : [],
                                    tanggalSurat: new Date(item.tanggalSurat).toISOString().split('T')[0],
                                  })}
                                  className='size-7 text-primary hover:bg-primary/10'
                                >
                                  <Printer className='size-3.5' />
                                </Button>
                                <Button
                                  size='icon'
                                  variant='outline'
                                  title='Unduh Word (.docx)'
                                  onClick={async () => {
                                    const toastId = toast.loading('Menyiapkan dokumen Word...')
                                    try {
                                      await exportSuratToWord({
                                        ...item,
                                        poinIsi: Array.isArray(item.poinIsi) ? item.poinIsi : [],
                                        signatories: Array.isArray(item.signatories) ? item.signatories : [],
                                        tanggalSurat: new Date(item.tanggalSurat).toISOString().split('T')[0],
                                      })
                                      toast.dismiss(toastId)
                                      toast.success(`Surat "${item.perihal}" berhasil diunduh ke Word (.docx).`)
                                    } catch {
                                      toast.dismiss(toastId)
                                      toast.error('Gagal mengunduh dokumen Word.')
                                    }
                                  }}
                                  className='size-7 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                                >
                                  <Download className='size-3.5' />
                                </Button>
                                <Button
                                  size='icon'
                                  variant='outline'
                                  title='Buka di Editor'
                                  onClick={() => handleEditLetter(item.id)}
                                  className='size-7 text-foreground/80 hover:bg-muted'
                                >
                                  <Edit3 className='size-3.5' />
                                </Button>
                                <Button
                                  size='icon'
                                  variant='outline'
                                  title='Hapus Surat'
                                  onClick={() => handleDeleteLetter(item.id)}
                                  className='size-7 text-destructive hover:bg-destructive/10'
                                >
                                  <Trash2 className='size-3.5' />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List View (< md) */}
                  <div className='block md:hidden divide-y'>
                    {suratList.map((item) => (
                      <div key={item.id} className='p-3.5 space-y-2.5 hover:bg-muted/10'>
                        <div className='flex items-start justify-between gap-2'>
                          <div className='min-w-0 flex-1'>
                            <div className='font-mono font-bold text-xs text-foreground break-all'>
                              {item.nomorSurat}
                            </div>
                            <div className='font-semibold text-xs text-foreground/90 mt-0.5'>
                              {item.perihal}
                            </div>
                          </div>
                          <Badge
                            className={`text-[9.5px] shrink-0 ${
                              item.status === 'DITERBITKAN'
                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700'
                                : 'bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700'
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </div>

                        <div className='text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1'>
                          <span className='flex items-center gap-1'>
                            <Calendar className='size-3 shrink-0 text-muted-foreground/80' />
                            {new Date(item.tanggalSurat).toLocaleDateString('id-ID')}
                          </span>
                          <span className='flex items-center gap-1'>
                            <Tag className='size-3 shrink-0 text-muted-foreground/80' />
                            {item.kategori}
                          </span>
                        </div>

                        <div className='text-[11px] text-muted-foreground bg-muted/40 border p-2 rounded-md'>
                          <span className='font-medium text-muted-foreground'>Kepada: </span>
                          <span className='font-semibold text-foreground'>{item.tujuanKepada.split('\n')[0]}</span>
                        </div>

                        <div className='flex items-center gap-2 pt-1 border-t'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={async () => {
                              const toastId = toast.loading('Menyiapkan dokumen Word...')
                              try {
                                await exportSuratToWord({
                                  ...item,
                                  poinIsi: Array.isArray(item.poinIsi) ? item.poinIsi : [],
                                  signatories: Array.isArray(item.signatories) ? item.signatories : [],
                                  tanggalSurat: new Date(item.tanggalSurat).toISOString().split('T')[0],
                                })
                                toast.dismiss(toastId)
                                toast.success(`Surat "${item.perihal}" berhasil diunduh.`)
                              } catch {
                                toast.dismiss(toastId)
                                toast.error('Gagal mengunduh.')
                              }
                            }}
                            className='h-8 text-xs flex-1 text-blue-600 dark:text-blue-400 justify-center'
                          >
                            <Download className='size-3 mr-1' /> Word (.docx)
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleEditLetter(item.id)}
                            className='h-8 text-xs flex-1 text-primary justify-center'
                          >
                            <Edit3 className='size-3 mr-1' /> Edit
                          </Button>
                          <Button
                            size='icon'
                            variant='ghost'
                            onClick={() => handleDeleteLetter(item.id)}
                            className='size-8 shrink-0 text-destructive hover:bg-destructive/10'
                            title='Hapus'
                          >
                            <Trash2 className='size-3.5' />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: KOLEKSI TEMPLATE CEPAT ────────────────────────── */}
        <TabsContent value='templates' className='space-y-4 pt-2'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {SURAT_PRESET_TEMPLATES.map((preset) => (
              <Card key={preset.id} className='shadow-xs hover:border-primary/50 transition-all'>
                <CardHeader className='pb-2.5 px-4'>
                  <div className='flex items-center justify-between gap-2'>
                    <Badge variant='outline' className='text-[10.5px] font-semibold text-primary'>
                      {preset.badge}
                    </Badge>
                    <Badge variant='secondary' className='text-[10px] font-mono'>
                      {preset.kategori}
                    </Badge>
                  </div>
                  <CardTitle className='text-sm sm:text-base font-bold mt-1 text-slate-900'>
                    {preset.title}
                  </CardTitle>
                  <CardDescription className='text-xs leading-relaxed'>
                    {preset.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className='px-4 pb-4 pt-1'>
                  <Button
                    size='sm'
                    onClick={() => handleApplyPreset(preset)}
                    className='w-full text-xs gap-1.5 font-semibold bg-primary text-primary-foreground'
                  >
                    Gunakan Template Ini <ArrowRight className='size-3.5' />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
