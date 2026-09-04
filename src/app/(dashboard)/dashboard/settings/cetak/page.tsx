'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Printer,
  Upload,
  Trash2,
  Check,
  Building,
  UserCheck,
  Stamp,
  Sliders,
  Eye,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info,
  Users,
  HeartHandshake,
  Users2,
  Calendar,
  FileText,
  BookOpen,
  GraduationCap,
  Sparkle,
  Download,
  RotateCw,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getPrintLayoutConfigAction,
  updatePrintLayoutConfigAction,
  resetPrintLayoutConfigAction,
} from '@/actions/print-layout'
import {
  PrintLayoutConfig,
  DEFAULT_PRINT_LAYOUT_CONFIG,
  SignatoryConfig,
  KTA_THEME_PRESETS,
  getKtaThemeColors,
} from '@/lib/validations/print-layout'
import { buildKopHtml, buildSignaturesHtml, TtdPreviewOverrides } from '@/lib/print-helpers'
import { removeImageBackground } from '@/lib/image-bg-removal'
import { escapeHtml } from '@/lib/utils'
import { toast } from 'sonner'

export type PrintTemplateType =
  | 'NERACA_GABUNGAN'
  | 'KEUANGAN_LPJ'
  | 'BIODATA_JEMAAT'
  | 'KARTU_KELUARGA'
  | 'KATEGORIAL_ANGGOTA'
  | 'PELAYAN_ROSTER'
  | 'KOMSEL_PRESENSI'
  | 'LEMBAR_DOA'
  | 'AGENDA_EVENT'
  | 'BERITA_ACARA'
  | 'SILABUS_MATERI'

// Sub-component for individual signatory upload card
interface SignatoryCardProps {
  title: string
  subtitle: string
  icon: any
  signatory: SignatoryConfig
  previewUrl: string | null
  targetKey: string
  isProcessing: boolean
  progressMsg: string
  onNameChange: (v: string) => void
  onGelarChange: (v: string) => void
  onNipChange: (v: string) => void
  onFileSelect: (f: File) => void
  onRemoveBackground: () => void
  onRemoveTtd: () => void
}

function SignatoryUploadCard({
  title,
  subtitle,
  icon: Icon,
  signatory,
  previewUrl,
  isProcessing,
  progressMsg,
  onNameChange,
  onGelarChange,
  onNipChange,
  onFileSelect,
  onRemoveBackground,
  onRemoveTtd,
}: SignatoryCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <Card className='shadow-xs overflow-hidden border border-border/80 flex flex-col justify-between'>
      <CardHeader className='pb-3 px-4 bg-muted/20'>
        <CardTitle className='text-sm font-bold flex items-center gap-2'>
          <Icon className='size-4 text-primary shrink-0' />
          <span className='truncate'>{title}</span>
        </CardTitle>
        <CardDescription className='text-xs'>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-3.5 px-4 pt-3.5 flex-1 flex flex-col justify-between'>
        <div className='space-y-3'>
          <div className='space-y-1'>
            <Label className='text-xs font-semibold'>Nama Lengkap:</Label>
            <Input
              value={signatory.nama}
              onChange={(e) => onNameChange(e.target.value)}
              className='text-xs font-semibold'
              placeholder='Nama lengkap pejabat...'
            />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>Gelar:</Label>
              <Input
                value={signatory.gelar || ''}
                onChange={(e) => onGelarChange(e.target.value)}
                placeholder='Contoh: M.Th.'
                className='text-xs'
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>Nomor Induk / NIP:</Label>
              <Input
                value={signatory.nomorInduk || ''}
                onChange={(e) => onNipChange(e.target.value)}
                placeholder='Nomor NIP...'
                className='text-xs font-mono'
              />
            </div>
          </div>
        </div>

        {/* Tanda Tangan Digital Upload Box */}
        <div className='pt-2.5 border-t space-y-2 mt-auto'>
          <div className='flex items-center justify-between'>
            <Label className='text-xs font-semibold flex items-center gap-1.5'>
              <Sparkles className='size-3.5 text-primary' /> Tanda Tangan Digital:
            </Label>
            {previewUrl ? (
              <Badge
                variant='outline'
                className='text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200'
              >
                TTD Terpasang
              </Badge>
            ) : (
              <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                Manual Line
              </Badge>
            )}
          </div>

          <div className='p-2.5 bg-muted/40 rounded-lg border space-y-2.5'>
            {/* Transparent checkerboard preview */}
            <div className='w-full h-14 rounded-md border bg-card flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative [background-image:linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] [background-size:8px_8px] [background-position:0_0,0_4px,4px_-4px,-4px_0]'>
              {previewUrl ? (
                <img src={previewUrl} alt='TTD' className='max-h-12 max-w-[140px] object-contain' />
              ) : (
                <span className='text-[10px] text-muted-foreground italic text-center px-1'>Belum ada TTD</span>
              )}
            </div>

            <div className='space-y-1.5'>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/png,image/jpeg,image/webp'
                className='hidden'
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    onFileSelect(file)
                  }
                }}
              />

              <div className='grid grid-cols-2 sm:flex items-center gap-1.5'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => fileInputRef.current?.click()}
                  className='h-7.5 text-xs gap-1.5 font-medium justify-center w-full sm:w-auto'
                >
                  <Upload className='size-3' />
                  {previewUrl ? 'Ganti TTD' : 'Upload TTD'}
                </Button>

                {previewUrl && (
                  <Button
                    type='button'
                    variant='secondary'
                    size='sm'
                    disabled={isProcessing}
                    onClick={onRemoveBackground}
                    className='h-7.5 text-xs gap-1.5 px-2.5 font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50 justify-center w-full sm:w-auto'
                    title='Hapus background putih/kertas menggunakan AI @imgly'
                  >
                    {isProcessing ? (
                      <Loader2 className='size-3 animate-spin text-primary' />
                    ) : (
                      <Sparkles className='size-3 text-indigo-600' />
                    )}
                    {isProcessing ? 'Memproses...' : 'Hapus BG'}
                  </Button>
                )}

                {previewUrl && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={onRemoveTtd}
                    className='col-span-2 sm:col-span-1 h-7.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 justify-center w-full sm:w-auto'
                  >
                    <Trash2 className='size-3 mr-1' /> Hapus TTD
                  </Button>
                )}
              </div>

              {isProcessing && progressMsg && (
                <p className='text-[10px] text-indigo-600 dark:text-indigo-400 font-medium animate-pulse'>
                  {progressMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PengaturanCetakPage() {
  const [config, setConfig] = useState<PrintLayoutConfig>(DEFAULT_PRINT_LAYOUT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  // AI Background Removal Processing Target
  const [bgProcessingTarget, setBgProcessingTarget] = useState<string | null>(null)
  const [bgProgressMessage, setBgProgressMessage] = useState<string>('')

  // Local File Upload States & Refs
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const stempelInputRef = useRef<HTMLInputElement | null>(null)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [stempelFile, setStempelFile] = useState<File | null>(null)
  const [stempelPreview, setStempelPreview] = useState<string | null>(null)

  const [gembalaTtdFile, setGembalaTtdFile] = useState<File | null>(null)
  const [gembalaTtdPreview, setGembalaTtdPreview] = useState<string | null>(null)

  const [sekretarisTtdFile, setSekretarisTtdFile] = useState<File | null>(null)
  const [sekretarisTtdPreview, setSekretarisTtdPreview] = useState<string | null>(null)

  const [bendaharaTtdFile, setBendaharaTtdFile] = useState<File | null>(null)
  const [bendaharaTtdPreview, setBendaharaTtdPreview] = useState<string | null>(null)

  const [ketuaMajelisTtdFile, setKetuaMajelisTtdFile] = useState<File | null>(null)
  const [ketuaMajelisTtdPreview, setKetuaMajelisTtdPreview] = useState<string | null>(null)

  const [koordinatorTtdFile, setKoordinatorTtdFile] = useState<File | null>(null)
  const [koordinatorTtdPreview, setKoordinatorTtdPreview] = useState<string | null>(null)

  const [pembinaKategorialTtdFile, setPembinaKategorialTtdFile] = useState<File | null>(null)
  const [pembinaKategorialTtdPreview, setPembinaKategorialTtdPreview] = useState<string | null>(null)

  const [koordinatorKomselTtdFile, setKoordinatorKomselTtdFile] = useState<File | null>(null)
  const [koordinatorKomselTtdPreview, setKoordinatorKomselTtdPreview] = useState<string | null>(null)

  const [ketuaPendidikanTtdFile, setKetuaPendidikanTtdFile] = useState<File | null>(null)
  const [ketuaPendidikanTtdPreview, setKetuaPendidikanTtdPreview] = useState<string | null>(null)

  // Selected Preview Template (11 Modules)
  const [previewTemplate, setPreviewTemplate] = useState<PrintTemplateType>('NERACA_GABUNGAN')

  // Preview Scale / Zoom
  const [previewScale, setPreviewScale] = useState<number>(75)
  const ZOOM_STEPS = [50, 60, 70, 75, 80, 90, 100, 110, 125]
  const zoomIn = () => setPreviewScale((s) => { const i = ZOOM_STEPS.indexOf(s); return i < ZOOM_STEPS.length - 1 ? ZOOM_STEPS[i + 1] : s })
  const zoomOut = () => setPreviewScale((s) => { const i = ZOOM_STEPS.indexOf(s); return i > 0 ? ZOOM_STEPS[i - 1] : s })
  const fitPage = () => setPreviewScale(75)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const res = await getPrintLayoutConfigAction()
      if (res.success && res.data) {
        setConfig(res.data)
        setLogoPreview(res.data.kop.logoUrl)
        setStempelPreview(res.data.stempel.stempelUrl)
        setGembalaTtdPreview(res.data.signatories.gembala.ttdUrl)
        setSekretarisTtdPreview(res.data.signatories.sekretaris.ttdUrl)
        setBendaharaTtdPreview(res.data.signatories.bendahara.ttdUrl)
        setKetuaMajelisTtdPreview(res.data.signatories.ketuaMajelis.ttdUrl)
        setKoordinatorTtdPreview(res.data.signatories.koordinatorDivisi.ttdUrl)
        setPembinaKategorialTtdPreview(res.data.signatories.pembinaKategorial?.ttdUrl || null)
        setKoordinatorKomselTtdPreview(res.data.signatories.koordinatorKomsel?.ttdUrl || null)
        setKetuaPendidikanTtdPreview(res.data.signatories.ketuaPendidikan?.ttdUrl || null)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  // AI Background Removal Handler
  const handleRemoveBackground = async (
    target:
      | 'logo'
      | 'stempel'
      | 'gembala'
      | 'sekretaris'
      | 'bendahara'
      | 'ketuaMajelis'
      | 'koordinatorDivisi'
      | 'pembinaKategorial'
      | 'koordinatorKomsel'
      | 'ketuaPendidikan'
  ) => {
    let source: File | string | null = null
    if (target === 'logo') source = logoFile || logoPreview
    else if (target === 'stempel') source = stempelFile || stempelPreview
    else if (target === 'gembala') source = gembalaTtdFile || gembalaTtdPreview
    else if (target === 'sekretaris') source = sekretarisTtdFile || sekretarisTtdPreview
    else if (target === 'bendahara') source = bendaharaTtdFile || bendaharaTtdPreview
    else if (target === 'ketuaMajelis') source = ketuaMajelisTtdFile || ketuaMajelisTtdPreview
    else if (target === 'koordinatorDivisi') source = koordinatorTtdFile || koordinatorTtdPreview
    else if (target === 'pembinaKategorial') source = pembinaKategorialTtdFile || pembinaKategorialTtdPreview
    else if (target === 'koordinatorKomsel') source = koordinatorKomselTtdFile || koordinatorKomselTtdPreview
    else if (target === 'ketuaPendidikan') source = ketuaPendidikanTtdFile || ketuaPendidikanTtdPreview

    if (!source) {
      toast.error('Pilih atau upload gambar terlebih dahulu.')
      return
    }

    setBgProcessingTarget(target)
    setBgProgressMessage('Memulai AI background removal...')

    try {
      const cleanFile = await removeImageBackground(source, {
        onProgress: (p, msg) => {
          setBgProgressMessage(`${msg}`)
        },
      })

      const newPreview = URL.createObjectURL(cleanFile)

      if (target === 'logo') {
        setLogoFile(cleanFile)
        setLogoPreview(newPreview)
      } else if (target === 'stempel') {
        setStempelFile(cleanFile)
        setStempelPreview(newPreview)
      } else if (target === 'gembala') {
        setGembalaTtdFile(cleanFile)
        setGembalaTtdPreview(newPreview)
      } else if (target === 'sekretaris') {
        setSekretarisTtdFile(cleanFile)
        setSekretarisTtdPreview(newPreview)
      } else if (target === 'bendahara') {
        setBendaharaTtdFile(cleanFile)
        setBendaharaTtdPreview(newPreview)
      } else if (target === 'ketuaMajelis') {
        setKetuaMajelisTtdFile(cleanFile)
        setKetuaMajelisTtdPreview(newPreview)
      } else if (target === 'koordinatorDivisi') {
        setKoordinatorTtdFile(cleanFile)
        setKoordinatorTtdPreview(newPreview)
      } else if (target === 'pembinaKategorial') {
        setPembinaKategorialTtdFile(cleanFile)
        setPembinaKategorialTtdPreview(newPreview)
      } else if (target === 'koordinatorKomsel') {
        setKoordinatorKomselTtdFile(cleanFile)
        setKoordinatorKomselTtdPreview(newPreview)
      } else if (target === 'ketuaPendidikan') {
        setKetuaPendidikanTtdFile(cleanFile)
        setKetuaPendidikanTtdPreview(newPreview)
      }

      toast.success('Latar belakang berhasil dibersihkan menjadi PNG transparan!')
    } catch (err: any) {
      toast.error('Gagal menghapus background: ' + (err?.message || 'Error'))
    } finally {
      setBgProcessingTarget(null)
      setBgProgressMessage('')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const formData = new FormData()
    formData.append('configJson', JSON.stringify(config))

    if (logoFile) formData.append('logoFile', logoFile)
    if (stempelFile) formData.append('stempelFile', stempelFile)
    if (gembalaTtdFile) formData.append('gembalaTtdFile', gembalaTtdFile)
    if (sekretarisTtdFile) formData.append('sekretarisTtdFile', sekretarisTtdFile)
    if (bendaharaTtdFile) formData.append('bendaharaTtdFile', bendaharaTtdFile)
    if (ketuaMajelisTtdFile) formData.append('ketuaMajelisTtdFile', ketuaMajelisTtdFile)
    if (koordinatorTtdFile) formData.append('koordinatorDivisiTtdFile', koordinatorTtdFile)
    if (pembinaKategorialTtdFile) formData.append('pembinaKategorialTtdFile', pembinaKategorialTtdFile)
    if (koordinatorKomselTtdFile) formData.append('koordinatorKomselTtdFile', koordinatorKomselTtdFile)
    if (ketuaPendidikanTtdFile) formData.append('ketuaPendidikanTtdFile', ketuaPendidikanTtdFile)

    const res = await updatePrintLayoutConfigAction(formData)
    setSaving(false)

    if (res.success && res.data) {
      toast.success(res.message || 'Pengaturan cetak berhasil disimpan.')
      setConfig(res.data)
      setLogoFile(null)
      setStempelFile(null)
      setGembalaTtdFile(null)
      setSekretarisTtdFile(null)
      setBendaharaTtdFile(null)
      setKetuaMajelisTtdFile(null)
      setKoordinatorTtdFile(null)
      setPembinaKategorialTtdFile(null)
      setKoordinatorKomselTtdFile(null)
      setKetuaPendidikanTtdFile(null)
    } else {
      toast.error(res.error || 'Gagal menyimpan pengaturan cetak.')
    }
  }

  const handleReset = async () => {
    setResetting(true)
    const res = await resetPrintLayoutConfigAction()
    setResetting(false)
    if (res.success) {
      toast.success('Pengaturan cetak berhasil direset ke standar.')
      setConfig(DEFAULT_PRINT_LAYOUT_CONFIG)
      setLogoFile(null)
      setLogoPreview(null)
      setStempelFile(null)
      setStempelPreview(null)
      setGembalaTtdFile(null)
      setGembalaTtdPreview(null)
      setSekretarisTtdFile(null)
      setSekretarisTtdPreview(null)
      setBendaharaTtdFile(null)
      setBendaharaTtdPreview(null)
      setKetuaMajelisTtdFile(null)
      setKetuaMajelisTtdPreview(null)
      setKoordinatorTtdFile(null)
      setKoordinatorTtdPreview(null)
      setPembinaKategorialTtdFile(null)
      setPembinaKategorialTtdPreview(null)
      setKoordinatorKomselTtdFile(null)
      setKoordinatorKomselTtdPreview(null)
      setKetuaPendidikanTtdFile(null)
      setKetuaPendidikanTtdPreview(null)
    } else {
      toast.error(res.error || 'Gagal mereset pengaturan cetak.')
    }
  }

  // Build preview overrides object from local state (local blob URLs for logo/TTD/stempel)
  const buildPreviewOverrides = (): TtdPreviewOverrides => ({
    gembala: gembalaTtdPreview,
    sekretaris: sekretarisTtdPreview,
    bendahara: bendaharaTtdPreview,
    ketuaMajelis: ketuaMajelisTtdPreview,
    koordinatorDivisi: koordinatorTtdPreview,
    pembinaKategorial: pembinaKategorialTtdPreview,
    koordinatorKomsel: koordinatorKomselTtdPreview,
    ketuaPendidikan: ketuaPendidikanTtdPreview,
    stempelPreviewUrl: stempelPreview,
  })

  // Build a unified config view that injects local preview URLs as if they were already saved
  // This is needed so buildKopHtml and buildSignaturesHtml render exactly like production
  const buildPreviewConfig = (): PrintLayoutConfig => ({
    ...config,
    kop: {
      ...config.kop,
      // When logoPreview is a local blob URL, temporarily inject it so buildKopHtml sees it
      logoUrl: logoPreview ?? config.kop.logoUrl,
    },
    stempel: {
      ...config.stempel,
      stempelUrl: stempelPreview ?? config.stempel.stempelUrl,
    },
    signatories: {
      ...config.signatories,
      gembala: { ...config.signatories.gembala, ttdUrl: gembalaTtdPreview ?? config.signatories.gembala.ttdUrl },
      sekretaris: { ...config.signatories.sekretaris, ttdUrl: sekretarisTtdPreview ?? config.signatories.sekretaris.ttdUrl },
      bendahara: { ...config.signatories.bendahara, ttdUrl: bendaharaTtdPreview ?? config.signatories.bendahara.ttdUrl },
      ketuaMajelis: { ...config.signatories.ketuaMajelis, ttdUrl: ketuaMajelisTtdPreview ?? config.signatories.ketuaMajelis.ttdUrl },
      koordinatorDivisi: { ...config.signatories.koordinatorDivisi, ttdUrl: koordinatorTtdPreview ?? config.signatories.koordinatorDivisi.ttdUrl },
      pembinaKategorial: {
        ...(config.signatories.pembinaKategorial || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.pembinaKategorial!),
        ttdUrl: pembinaKategorialTtdPreview ?? config.signatories.pembinaKategorial?.ttdUrl ?? null,
      },
      koordinatorKomsel: {
        ...(config.signatories.koordinatorKomsel || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.koordinatorKomsel!),
        ttdUrl: koordinatorKomselTtdPreview ?? config.signatories.koordinatorKomsel?.ttdUrl ?? null,
      },
      ketuaPendidikan: {
        ...(config.signatories.ketuaPendidikan || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.ketuaPendidikan!),
        ttdUrl: ketuaPendidikanTtdPreview ?? config.signatories.ketuaPendidikan?.ttdUrl ?? null,
      },
    },
  })

  // Generate Template HTML Content for Live Test Print & On-Screen Preview
  // Uses the same buildKopHtml & buildSignaturesHtml as production modules — 100% identical output
  const getTemplateContent = (template: PrintTemplateType) => {
    const pc = buildPreviewConfig()

    // Shared CSS stylesheet to ensure exact visual styling across all 11 modules
    const printStyles = `
      <style>
        .print-preview-root {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          font-size: 9.5px;
          line-height: 1.4;
        }
        .overview-box {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .overview-title {
          font-size: 11px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
        }
        .overview-desc {
          font-size: 9px;
          color: #64748b;
          margin-top: 2px;
        }
        .overview-grid {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 8px;
          margin-top: 8px;
          margin-bottom: 10px;
        }
        .stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 8px;
          text-align: center;
        }
        .stat-lbl {
          font-size: 8px;
          color: #64748b;
          font-weight: 600;
        }
        .stat-val {
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 1px;
        }
        .family-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 12px;
        }
        .info-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .info-row {
          display: flex;
          font-size: 9px;
        }
        .info-row .lbl {
          width: 120px;
          color: #64748b;
          font-weight: 600;
        }
        .info-row .val {
          flex: 1;
          color: #0f172a;
          font-weight: 700;
        }
        .members-table, .roster-table, .prayer-table, .events-table, .docs-table, .materi-table, .finance-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
          margin-bottom: 12px;
        }
        .members-table th, .roster-table th, .prayer-table th, .events-table th, .docs-table th, .materi-table th, .finance-table th {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 4px 6px;
          font-weight: 800;
          text-align: left;
          color: #334155;
        }
        .members-table td, .roster-table td, .prayer-table td, .events-table td, .docs-table td, .materi-table td, .finance-table td {
          border: 1px solid #e2e8f0;
          padding: 4px 6px;
          color: #1e293b;
        }
        .notice-box {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 8.5px;
          color: #475569;
          margin-bottom: 10px;
        }
        .grid-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          width: 100%;
          margin-bottom: 12px;
        }
        .jemaat-card {
          border: 1.5px solid #1e293b;
          border-radius: 12px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 185px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);
        }
        .jemaat-card-header {
          background: linear-gradient(135deg, #0f172a 0%, ${pc.kop.garisKopColor || '#1e3a8a'} 100%);
          padding: 6px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #ffffff;
        }
        .church-brand {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .logo-box {
          width: 22px;
          height: 22px;
          background: #ffffff;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1px;
        }
        .church-logo {
          width: 100%;
          height: 100%;
          background: #0f172a;
          color: #ffffff;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 10px;
        }
        .church-name {
          font-size: 9.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.2px;
          color: #ffffff;
        }
        .church-sub {
          font-size: 6.5px;
          font-family: monospace;
          color: #93c5fd;
          font-weight: 700;
        }
        .status-badge {
          background: #10b981;
          color: #ffffff;
          padding: 1px 6px;
          border-radius: 9999px;
          font-size: 7px;
          font-weight: 800;
          font-family: monospace;
          border: none;
        }
        .jemaat-card-body {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: #fafafa;
          flex: 1;
        }
        .qr-container {
          width: 58px;
          height: 58px;
          border-radius: 8px;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 2px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .jemaat-card-footer {
          background: #ffffff;
          display: flex;
          justify-content: space-between;
          font-size: 7.5px;
          color: #64748b;
          font-family: monospace;
          border-top: 1px solid #e2e8f0;
          padding: 4px 10px;
        }
      </style>
    `

    // Build kop HTML using the shared helper — same function used in all production modules
    const kopHtml = buildKopHtml(pc, {
      badgeText: (() => {
        switch (template) {
          case 'NERACA_GABUNGAN': return 'NERACA KONSOLIDASI'
          case 'KEUANGAN_LPJ': return 'LPJ KEUANGAN GEREJA'
          case 'BIODATA_JEMAAT': return 'KARTU ANGGOTA JEMAAT'
          case 'KARTU_KELUARGA': return 'KARTU KELUARGA GEREJA'
          case 'KATEGORIAL_ANGGOTA': return 'KATEGORIAL PELAYANAN'
          case 'PELAYAN_ROSTER': return 'ROSTER RESMI PELAYANAN'
          case 'KOMSEL_PRESENSI': return 'DIREKTORI KOMUNITAS SEL'
          case 'LEMBAR_DOA': return 'MENARA DOA & SYAFAAT'
          case 'AGENDA_EVENT': return 'DIVISI ACARA & IBADAH'
          case 'BERITA_ACARA': return 'LEMBAGA TATA USAHA & ARSIP'
          case 'SILABUS_MATERI': return 'DIVISI PENGAJARAN & MEDIA'
          default: return 'DOKUMEN RESMI'
        }
      })(),
      dateText: `Tanggal: ${new Date().toLocaleDateString('id-ID')}`,
    })

    // Watermark audit footer — same as production buildPrintableHtmlDocument
    const watermarkHtml = pc.options.tampilkanWatermarkAudit
      ? `<div style="font-size: 8px; color: #94a3b8; margin-top: 12px; text-align: center; font-family: monospace; border-top: 1px dashed #cbd5e1; padding-top: 6px;">${escapeHtml(pc.options.catatanKakiResmi)} • Verifikasi Dokumen SHA-256 Otentik ${escapeHtml(pc.kop?.namaGereja || 'Gereja')}.</div>`
      : ''

    switch (template) {
      case 'BIODATA_JEMAAT': {
        const logoUrl = pc.kop.tampilkanLogo && (logoPreview || pc.kop.logoUrl)
        const logoEl = logoUrl
          ? `<img src="${logoUrl}" alt="Logo" style="width: 24px; height: 24px; object-fit: contain; flex-shrink: 0;" />`
          : `<div class="church-logo">G</div>`
        const ktaColors = getKtaThemeColors(pc.kta)

        return `
          <div class="print-preview-root">
            ${printStyles}
            ${kopHtml}
            <div style="font-weight: 800; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; color: #0f172a;">
              Pratinjau Format Kartu Tanda Anggota Jemaat (KTA Resmi Kreatif & Berwarna)
            </div>
            <div class="grid-container">
              <!-- Kartu Jemaat 1 -->
              <div class="jemaat-card">
                <div class="jemaat-card-header" style="background: ${ktaColors.bgGradient};">
                  <div class="church-brand">
                    ${logoEl}
                    <div>
                      <div class="church-name">${escapeHtml(pc.kop.namaGereja)}</div>
                      <div class="church-sub" style="color: ${ktaColors.subColor};">KARTU TANDA ANGGOTA RESMI</div>
                    </div>
                  </div>
                  <div class="status-badge" style="background: ${ktaColors.statusBg};">ACTIVE</div>
                </div>
                <div style="height: 2.5px; background: ${ktaColors.accentGradient}; width: 100%;"></div>
                
                <div class="jemaat-card-body">
                  <div class="qr-container">
                    <svg viewBox="0 0 100 100" width="52" height="52" style="display: block;">
                      <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
                      <path d="M10 10h30v30h-30z M15 15h20v20h-20z M20 20h10v10h-10z M60 10h30v30h-30z M65 15h20v20h-20z M70 20h10v10h-10z M10 60h30v30h-30z M15 65h20v20h-20z M20 70h10v10h-10z M50 10h5v15h-5z M50 30h5v15h-5z M60 50h15v5h-15z M80 50h10v10h-10z M50 60h10v10h-10z M70 65h15v5h-15z M50 80h10v10h-10z M65 80h10v10h-10z M80 80h10v10h-10z" fill="#0f172a" />
                    </svg>
                  </div>

                  <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2.5px;">
                    <div style="font-weight: 900; font-size: 11px; color: #0f172a; line-height: 1.2;">Yohanes Pratama Putra, S.Th.</div>
                    <div style="font-size: 8px; color: #64748b; font-weight: 600;">(Hanes)</div>
                    <div style="display: flex; align-items: center; gap: 3px; flex-wrap: wrap; margin-top: 1px;">
                      <span style="font-size: 7.5px; font-weight: 700; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 1px 5px; border-radius: 4px;">Dewasa Muda</span>
                      <span style="font-size: 7.5px; font-weight: 600; background: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; padding: 1px 5px; border-radius: 4px;">Komsel Betania 3</span>
                    </div>
                    <div style="display: inline-flex; align-items: center; gap: 3px; background: #0f172a; color: #ffffff; border-radius: 4px; padding: 1.5px 5px; margin-top: 2px; width: fit-content;">
                      <span style="font-size: 7px; font-family: monospace; color: #94a3b8; font-weight: 600;">NIJ</span>
                      <span style="font-size: 8px; font-family: monospace; font-weight: 800; color: #facc15;">NIJ-2024-0142</span>
                    </div>
                  </div>
                </div>

                <div class="jemaat-card-footer">
                  <span style="color: #475569; font-weight: 600;">📍 ${escapeHtml(pc.kop.subJudul)}</span>
                </div>
              </div>

              <!-- Kartu Jemaat 2 -->
              <div class="jemaat-card">
                <div class="jemaat-card-header" style="background: ${ktaColors.bgGradient};">
                  <div class="church-brand">
                    ${logoEl}
                    <div>
                      <div class="church-name">${escapeHtml(pc.kop.namaGereja)}</div>
                      <div class="church-sub" style="color: ${ktaColors.subColor};">KARTU TANDA ANGGOTA RESMI</div>
                    </div>
                  </div>
                  <div class="status-badge" style="background: ${ktaColors.statusBg};">ACTIVE</div>
                </div>
                <div style="height: 2.5px; background: ${ktaColors.accentGradient}; width: 100%;"></div>

                <div class="jemaat-card-body">
                  <div class="qr-container">
                    <svg viewBox="0 0 100 100" width="52" height="52" style="display: block;">
                      <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
                      <path d="M10 10h30v30h-30z M15 15h20v20h-20z M20 20h10v10h-10z M60 10h30v30h-30z M65 15h20v20h-20z M70 20h10v10h-10z M10 60h30v30h-30z M15 65h20v20h-20z M20 70h10v10h-10z M50 15h5v20h-5z M50 45h5v15h-5z M60 55h15v5h-15z M75 50h15v10h-15z M50 65h10v10h-10z M65 65h15v5h-15z M50 80h10v10h-10z M65 80h10v10h-10z M80 80h10v10h-10z" fill="#0f172a" />
                    </svg>
                  </div>

                  <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2.5px;">
                    <div style="font-weight: 900; font-size: 11px; color: #0f172a; line-height: 1.2;">Maria Sutanto, S.E.</div>
                    <div style="font-size: 8px; color: #64748b; font-weight: 600;">(Maria)</div>
                    <div style="display: flex; align-items: center; gap: 3px; flex-wrap: wrap; margin-top: 1px;">
                      <span style="font-size: 7.5px; font-weight: 700; background: #fce7f3; color: #be185d; border: 1px solid #fbcfe8; padding: 1px 5px; border-radius: 4px;">Wanita Bijak</span>
                      <span style="font-size: 7.5px; font-weight: 600; background: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; padding: 1px 5px; border-radius: 4px;">Komsel Betania 2</span>
                    </div>
                    <div style="display: inline-flex; align-items: center; gap: 3px; background: #0f172a; color: #ffffff; border-radius: 4px; padding: 1.5px 5px; margin-top: 2px; width: fit-content;">
                      <span style="font-size: 7px; font-family: monospace; color: #94a3b8; font-weight: 600;">NIJ</span>
                      <span style="font-size: 8px; font-family: monospace; font-weight: 800; color: #facc15;">NIJ-2024-0088</span>
                    </div>
                  </div>
                </div>

                <div class="jemaat-card-footer">
                  <span style="color: #475569; font-weight: 600;">📍 ${escapeHtml(pc.kop.subJudul)}</span>
                </div>
              </div>
            </div>
            ${buildSignaturesHtml(pc, [
              { roleKey: 'sekretaris', customTitle: 'Sekretaris Jemaat' },
              { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
            ])}
            ${watermarkHtml}
          </div>
        `
      }

      case 'KARTU_KELUARGA':
        return `
          <div class="print-preview-root">
            ${printStyles}
            ${kopHtml}
            <div class="family-info-grid">
              <div class="info-group">
                <div class="info-row"><span class="lbl">Nama Keluarga:</span><span class="val">Keluarga Andreas Sutanto</span></div>
                <div class="info-row"><span class="lbl">Kepala Keluarga:</span><span class="val">Bpk. Andreas Sutanto</span></div>
                <div class="info-row"><span class="lbl">NIJ Kepala:</span><span class="val font-mono">NIJ-2024-0087</span></div>
              </div>
              <div class="info-group">
                <div class="info-row"><span class="lbl">No. HP / WhatsApp:</span><span class="val">0812-3456-7890</span></div>
                <div class="info-row"><span class="lbl">Komsel / Rayon:</span><span class="val">Betania 2 (Rayon Selatan)</span></div>
                <div class="info-row"><span class="lbl">Alamat Domisili:</span><span class="val">Komplek Cendana Indah Blok B-4, Padang</span></div>
              </div>
            </div>

            <div style="font-weight: 800; font-size: 10px; margin-bottom: 5px; text-transform: uppercase; color: #0f172a;">
              Daftar Anggota Keluarga Terdaftar
            </div>
            <table class="members-table">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th>Nama Lengkap</th>
                  <th style="width: 90px; text-align: center;">NIJ</th>
                  <th style="width: 80px; text-align: center;">Hubungan</th>
                  <th style="width: 35px; text-align: center;">L/P</th>
                  <th>Tempat, Tgl Lahir</th>
                  <th style="width: 60px; text-align: center;">Baptis</th>
                  <th style="width: 70px; text-align: center;">Pernikahan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td style="font-weight: 700;">Andreas Sutanto</td>
                  <td style="font-family: monospace; text-align: center;">NIJ-2024-0087</td>
                  <td style="text-align: center; font-weight: 600;">Kepala Keluarga</td>
                  <td style="text-align: center;">L</td>
                  <td>Padang, 12 Agustus 1980</td>
                  <td style="text-align: center;">Sudah</td>
                  <td style="text-align: center;">Menikah</td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td style="font-weight: 700;">Maria Sutanto</td>
                  <td style="font-family: monospace; text-align: center;">NIJ-2024-0088</td>
                  <td style="text-align: center; font-weight: 600;">Istri</td>
                  <td style="text-align: center;">P</td>
                  <td>Bukittinggi, 05 Mei 1983</td>
                  <td style="text-align: center;">Sudah</td>
                  <td style="text-align: center;">Menikah</td>
                </tr>
                <tr>
                  <td style="text-align: center;">3</td>
                  <td style="font-weight: 700;">Timothy Sutanto</td>
                  <td style="font-family: monospace; text-align: center;">NIJ-2024-0089</td>
                  <td style="text-align: center; font-weight: 600;">Anak</td>
                  <td style="text-align: center;">L</td>
                  <td>Padang, 20 Oktober 2010</td>
                  <td style="text-align: center;">Sudah</td>
                  <td style="text-align: center;">Belum Menikah</td>
                </tr>
              </tbody>
            </table>

            ${buildSignaturesHtml(pc, [
              { roleKey: 'sekretaris', customTitle: 'Sekretaris Jemaat' },
              { roleKey: 'gembala', customTitle: 'Gembala Jemaat / Senior Pastor' },
            ])}
            ${watermarkHtml}
          </div>
        `

      case 'KATEGORIAL_ANGGOTA':
        return `
          <div class="print-preview-root">
            ${printStyles}
            ${kopHtml}
            <div class="overview-box">
              <div class="overview-title">DEPARTEMEN KATEGORIAL: PEMUDA &amp; REMAJA (YOUTH &amp; TEENS)</div>
              <div class="overview-desc">Wadah pembinaan generasi muda gereja untuk pertumbuhan iman, kepemimpinan Kristen, dan pelayanan misi.</div>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-lbl">Total Anggota</div>
                  <div class="stat-val">48 Jemaat</div>
                </div>
                <div class="stat-card">
                  <div class="stat-lbl">Pria / Laki-laki</div>
                  <div class="stat-val">22 Orang</div>
                </div>
                <div class="stat-card">
                  <div class="stat-lbl">Wanita / Perempuan</div>
                  <div class="stat-val">26 Orang</div>
                </div>
                <div class="stat-card">
                  <div class="stat-lbl">Sudah Dibaptis</div>
                  <div class="stat-val">44 Jemaat</div>
                </div>
              </div>
            </div>

            <div style="font-weight: 800; font-size: 10px; margin-bottom: 5px; text-transform: uppercase; color: #0f172a;">
              Daftar Roster Anggota Terdaftar (48 Orang)
            </div>
            <table class="members-table">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th>Nama Lengkap</th>
                  <th style="width: 90px; text-align: center;">NIJ</th>
                  <th style="width: 35px; text-align: center;">L/P</th>
                  <th>No. WhatsApp</th>
                  <th>Komsel</th>
                  <th style="width: 60px; text-align: center;">Baptis</th>
                  <th style="width: 65px; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td style="font-weight: 700;">Samuel Wijaya (Sam)</td>
                  <td style="font-family: monospace; text-align: center;">NIJ-2024-0031</td>
                  <td style="text-align: center;">L</td>
                  <td>0812-7788-9900</td>
                  <td>Betania 1</td>
                  <td style="text-align: center;">Sudah</td>
                  <td style="text-align: center; font-weight: 700; color: #166534;">ACTIVE</td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td style="font-weight: 700;">Debora Rahayu (Deby)</td>
                  <td style="font-family: monospace; text-align: center;">NIJ-2024-0044</td>
                  <td style="text-align: center;">P</td>
                  <td>0813-1122-3344</td>
                  <td>Betania 2</td>
                  <td style="text-align: center;">Sudah</td>
                  <td style="text-align: center; font-weight: 700; color: #166534;">ACTIVE</td>
                </tr>
                <tr>
                  <td style="text-align: center;">3</td>
                  <td style="font-weight: 700;">Jonathan Kevin (Joe)</td>
                  <td style="font-family: monospace; text-align: center;">NIJ-2024-0056</td>
                  <td style="text-align: center;">L</td>
                  <td>0821-5566-7788</td>
                  <td>Betania 3</td>
                  <td style="text-align: center;">Sudah</td>
                  <td style="text-align: center; font-weight: 700; color: #166534;">ACTIVE</td>
                </tr>
              </tbody>
            </table>

            ${buildSignaturesHtml(pc, [
              { roleKey: 'pembinaKategorial', customTitle: 'Ketua / Koordinator Departemen' },
              { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
            ])}
            ${watermarkHtml}
          </div>
        `

      case 'PELAYAN_ROSTER':
        return `
          <div class="print-preview-root">
            ${printStyles}
            ${kopHtml}
            <div style="font-weight: 800; font-size: 10px; margin-bottom: 6px; text-transform: uppercase; color: #0f172a;">
              Jadwal Roster Penugasan Pelayan Ibadah Raya &amp; Acara Khusus
            </div>
            <table class="roster-table">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th>Nama Lengkap</th>
                  <th style="width: 85px; text-align: center;">NIJ</th>
                  <th>Divisi / Kategori Pelayanan</th>
                  <th>Kategorial</th>
                  <th>WhatsApp</th>
                  <th>Komsel</th>
                  <th>Deskripsi Tugas</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td style="font-weight: 700;">Andi Susanto (Andi)</td>
                  <td style="font-family: monospace; text-align: center;">NIJ-2024-0012</td>
                  <td style="font-weight: 600; color: #0f172a;">Worship Leader, Multimedia</td>
                  <td>Pemuda &amp; Remaja</td>
                  <td>0812-3456-7890</td>
                  <td>Betania 1</td>
                  <td style="font-size: 8.5px; color: #64748b;">Memimpin pujian Ibadah Raya I &amp; operator visual</td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td style="font-weight: 700;">Lina Dewi (Lina)</td>
                  <td style="font-family: monospace; text-align: center;">NIJ-2024-0019</td>
                  <td style="font-weight: 600; color: #0f172a;">Singer / Backing Vocal</td>
                  <td>Wanita Bijak</td>
                  <td>0813-9876-5432</td>
                  <td>Betania 2</td>
                  <td style="font-size: 8.5px; color: #64748b;">Vokal pendamping sesi perjamuan kudus</td>
                </tr>
                <tr>
                  <td style="text-align: center;">3</td>
                  <td style="font-weight: 700;">Budi Hermawan (Budi)</td>
                  <td style="font-family: monospace; text-align: center;">NIJ-2024-0025</td>
                  <td style="font-weight: 600; color: #0f172a;">Usher &amp; Kolektan, Soundman</td>
                  <td>Pria Sejati</td>
                  <td>0821-4433-2211</td>
                  <td>Betania 3</td>
                  <td style="font-size: 8.5px; color: #64748b;">Penyambutan jemaat dan tata tertib ruang utama</td>
                </tr>
              </tbody>
            </table>

            ${buildSignaturesHtml(pc, [
              { roleKey: 'koordinatorDivisi', customTitle: 'Koordinator Pelayanan Ibadah' },
              { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
            ])}
            ${watermarkHtml}
          </div>
        `

      case 'KOMSEL_PRESENSI':
        return `
          <div class="print-preview-root">
            ${printStyles}
            ${kopHtml}
            <div class="overview-box">
              <div class="overview-grid">
                <div>
                  <div style="font-size: 8.5px; color: #64748b; font-weight: 700; text-transform: uppercase;">Nama Komunitas Sel</div>
                  <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">KOMSEL BETANIA 3</div>
                  <div style="font-size: 9.5px; color: #475569; margin-top: 1px;">Wilayah: <strong>Rayon Pusat / Padang Barat</strong></div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 8.5px; color: #64748b; font-weight: 700; text-transform: uppercase;">Jadwal Pertemuan</div>
                  <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-top: 1px;">Jumat, 19:30 WIB</div>
                  <div style="font-size: 9.5px; color: #475569; margin-top: 1px;">Koordinator: <strong>Bpk. Daniel Setiawan</strong> (0812-8899-0011)</div>
                </div>
              </div>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-lbl">Total Anggota</div>
                  <div class="stat-val">16 Jemaat</div>
                </div>
                <div class="stat-card">
                  <div class="stat-lbl">Pria / Laki-laki</div>
                  <div class="stat-val">7 Orang</div>
                </div>
                <div class="stat-card">
                  <div class="stat-lbl">Wanita / Perempuan</div>
                  <div class="stat-val">9 Orang</div>
                </div>
                <div class="stat-card">
                  <div class="stat-lbl">Sudah Dibaptis</div>
                  <div class="stat-val">15 Jemaat</div>
                </div>
              </div>
            </div>

            <div style="font-weight: 800; font-size: 10px; margin-bottom: 5px; text-transform: uppercase; color: #0f172a;">
              Daftar Roster Anggota Komsel (16 Orang)
            </div>
            <table class="members-table">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th>Nama Lengkap</th>
                  <th style="width: 85px; text-align: center;">NIJ</th>
                  <th style="width: 35px; text-align: center;">L/P</th>
                  <th>No. WhatsApp</th>
                  <th>Alamat Domisili</th>
                  <th style="width: 60px; text-align: center;">Baptis</th>
                  <th style="width: 60px; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td style="font-weight: 700;">Daniel Setiawan</td>
                  <td style="font-family: monospace; text-align: center;">NIJ-2024-0061</td>
                  <td style="text-align: center;">L</td>
                  <td>0812-8899-0011</td>
                  <td style="font-size: 8.5px; color: #475569;">Jl. Veteran No. 12, Padang</td>
                  <td style="text-align: center;">Sudah</td>
                  <td style="text-align: center; font-weight: 700; color: #166534;">ACTIVE</td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td style="font-weight: 700;">Ruth Paramita</td>
                  <td style="font-family: monospace; text-align: center;">NIJ-2024-0062</td>
                  <td style="text-align: center;">P</td>
                  <td>0813-7766-5544</td>
                  <td style="font-size: 8.5px; color: #475569;">Jl. Hayam Wuruk No. 8, Padang</td>
                  <td style="text-align: center;">Sudah</td>
                  <td style="text-align: center; font-weight: 700; color: #166534;">ACTIVE</td>
                </tr>
              </tbody>
            </table>

            ${buildSignaturesHtml(pc, [
              { roleKey: 'koordinatorKomsel', customTitle: 'Koordinator Komunitas Sel (Komsel)', overrideName: 'Daniel Setiawan' },
              { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
            ])}
            ${watermarkHtml}
          </div>
        `

      case 'LEMBAR_DOA':
        return `
          <div class="print-preview-root">
            ${printStyles}
            ${kopHtml}
            <div class="notice-box">
              📖 <em>"Sebab di mana dua atau tiga orang berkumpul dalam Nama-Ku, di situ Aku ada di tengah-tengah mereka."</em> (Matius 18:20)
              • Seluruh pokok doa di bawah ini telah disaring dengan tingkat kerahasiaan pastoral untuk perlindungan privasi jemaat.
            </div>

            <table class="prayer-table">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th style="width: 140px;">Nama Pemohon</th>
                  <th style="width: 110px;">Kategori Doa</th>
                  <th>Isi Pokok Permohonan Doa Syafaat</th>
                  <th style="width: 70px; text-align: center;">Status</th>
                  <th style="width: 35px; text-align: center;">Doakan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td style="font-weight: 700; color: #0f172a;">Keluarga Bpk. Hendra Gunawan</td>
                  <td style="font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase;">KESEHATAN &amp; PEMULIHAN</td>
                  <td style="font-size: 9px; color: #1e293b; line-height: 1.4;">Mohon dukungan doa untuk kesembuhan Ibu Sarah pasca operasi di RS M. Djamil Padang agar proses pemulihan lancar dan sempurna.</td>
                  <td style="text-align: center; font-size: 8.5px; font-weight: 700;">
                    <span style="border: 1px solid #cbd5e1; padding: 1.5px 5px; border-radius: 4px; background: #f8fafc;">BARU</span>
                  </td>
                  <td style="text-align: center; width: 35px;">
                    <div style="width: 13px; height: 13px; border: 1.5px solid #64748b; border-radius: 3px; margin: 0 auto;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td style="font-weight: 700; color: #0f172a;">Hamba Tuhan (Pastoral)</td>
                  <td style="font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase;">PEKERJAAN &amp; USAHA</td>
                  <td style="font-size: 9px; color: #1e293b; line-height: 1.4;">Doa terobosan bagi rencana pembukaan cabang usaha baru dan hikmat dalam pengambilan keputusan finansial keluarga.</td>
                  <td style="text-align: center; font-size: 8.5px; font-weight: 700;">
                    <span style="border: 1px solid #bbf7d0; padding: 1.5px 5px; border-radius: 4px; background: #f0fdf4; color: #166534;">DIDOAKAN</span>
                  </td>
                  <td style="text-align: center; width: 35px;">
                    <div style="width: 13px; height: 13px; border: 1.5px solid #64748b; border-radius: 3px; margin: 0 auto;"></div>
                  </td>
                </tr>
              </tbody>
            </table>

            ${buildSignaturesHtml(pc, [
              { roleKey: 'koordinatorKomsel', customTitle: 'Koordinator Tim Doa Syafaat' },
              { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
            ])}
            ${watermarkHtml}
          </div>
        `

      case 'AGENDA_EVENT':
        return `
          <div class="print-preview-root">
            ${printStyles}
            ${kopHtml}
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-lbl">Total Agenda Terjadwal</div>
                <div class="stat-val">3 Acara / Ibadah</div>
              </div>
              <div class="stat-card">
                <div class="stat-lbl">Total Akumulasi Presensi</div>
                <div class="stat-val">450 Jemaat</div>
              </div>
              <div class="stat-card">
                <div class="stat-lbl">Status Periode</div>
                <div class="stat-val" style="color: #166534;">Agenda Resmi Aktif</div>
              </div>
            </div>

            <table class="events-table">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th>Nama Ibadah / Event</th>
                  <th style="width: 95px;">Kategori</th>
                  <th>Hari &amp; Tanggal</th>
                  <th style="width: 70px; text-align: center;">Waktu</th>
                  <th>Lokasi Pelaksanaan</th>
                  <th style="width: 85px; text-align: center;">Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td style="font-weight: 700; color: #0f172a;">Ibadah Raya Minggu Pertama &amp; Perjamuan Kudus</td>
                  <td style="font-size: 8.5px; font-weight: 700; text-transform: uppercase;">IBADAH RAYA</td>
                  <td>Minggu, 01 ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</td>
                  <td style="text-align: center; font-family: monospace; font-weight: 700;">09:00 WIB</td>
                  <td>Gedung Utama Gereja</td>
                  <td style="text-align: center; font-weight: 800; color: #0f172a;">220 Jemaat</td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td style="font-weight: 700; color: #0f172a;">Persekutuan Doa Malam Syafaat</td>
                  <td style="font-size: 8.5px; font-weight: 700; text-transform: uppercase;">DOA &amp; PUJIAN</td>
                  <td>Rabu, 04 ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</td>
                  <td style="text-align: center; font-family: monospace; font-weight: 700;">19:00 WIB</td>
                  <td>Ruang Doa Lt. 2</td>
                  <td style="text-align: center; font-weight: 800; color: #0f172a;">80 Jemaat</td>
                </tr>
                <tr>
                  <td style="text-align: center;">3</td>
                  <td style="font-weight: 700; color: #0f172a;">Youth Revival Fellowship (Pemuda)</td>
                  <td style="font-size: 8.5px; font-weight: 700; text-transform: uppercase;">KATEGORIAL</td>
                  <td>Sabtu, 07 ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</td>
                  <td style="text-align: center; font-family: monospace; font-weight: 700;">18:00 WIB</td>
                  <td>Hall Serbaguna</td>
                  <td style="text-align: center; font-weight: 800; color: #0f172a;">150 Jemaat</td>
                </tr>
              </tbody>
            </table>

            ${buildSignaturesHtml(pc, [
              { roleKey: 'koordinatorDivisi', customTitle: 'Koordinator Divisi Acara & Usher' },
              { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
            ])}
            ${watermarkHtml}
          </div>
        `

      case 'BERITA_ACARA':
        return `
          <div class="print-preview-root">
            ${printStyles}
            ${kopHtml}
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-lbl">Total Berkas Terdaftar</div>
                <div class="stat-val">38 Arsip</div>
              </div>
              <div class="stat-card">
                <div class="stat-lbl">Arsip Aktif Operasional</div>
                <div class="stat-val" style="color: #166534;">28 Berkas</div>
              </div>
              <div class="stat-card">
                <div class="stat-lbl">Arsip Permanen (Heritage)</div>
                <div class="stat-val" style="color: #1d4ed8;">10 Berkas</div>
              </div>
              <div class="stat-card">
                <div class="stat-lbl">Total Kapasitas Digital</div>
                <div class="stat-val">12.4 MB</div>
              </div>
            </div>

            <div style="font-weight: 800; font-size: 10px; margin-bottom: 5px; text-transform: uppercase; color: #0f172a;">
              Daftar Inventaris Berkas &amp; Dokumen Arsip Resmi Gereja
            </div>
            <table class="docs-table">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th>Judul Dokumen Arsip</th>
                  <th style="width: 100px;">Klasifikasi Jenis</th>
                  <th style="width: 100px;">Kategorial</th>
                  <th style="width: 80px; text-align: center;">Tgl Dokumen</th>
                  <th style="width: 65px; text-align: center;">Ukuran</th>
                  <th style="width: 70px; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td style="font-weight: 700; color: #0f172a;">Surat Keputusan Gembala Pengangkatan Majelis 2026</td>
                  <td style="font-size: 8.5px; font-weight: 700; text-transform: uppercase;">SURAT KEPUTUSAN</td>
                  <td style="font-weight: 600;">Umum Gereja</td>
                  <td style="text-align: center;">02/01/2026</td>
                  <td style="text-align: center; font-family: monospace; font-size: 8.5px;">245.0 KB</td>
                  <td style="text-align: center; font-size: 8.5px; font-weight: 700;">
                    <span style="border: 1px solid #bfdbfe; padding: 1.5px 5px; border-radius: 4px; background: #eff6ff; color: #1d4ed8;">PERMANEN</span>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td style="font-weight: 700; color: #0f172a;">Sertifikat Baptisan Kudus Massal Periode Paskah</td>
                  <td style="font-size: 8.5px; font-weight: 700; text-transform: uppercase;">SERTIFIKAT SAKRAMEN</td>
                  <td style="font-weight: 600;">Departemen Pastoral</td>
                  <td style="text-align: center;">15/04/2025</td>
                  <td style="text-align: center; font-family: monospace; font-size: 8.5px;">512.4 KB</td>
                  <td style="text-align: center; font-size: 8.5px; font-weight: 700;">
                    <span style="border: 1px solid #bbf7d0; padding: 1.5px 5px; border-radius: 4px; background: #f0fdf4; color: #166534;">AKTIF</span>
                  </td>
                </tr>
              </tbody>
            </table>

            ${buildSignaturesHtml(pc, [
              { roleKey: 'sekretaris', customTitle: 'Kepala Tata Usaha / Arsiparis' },
              { roleKey: 'ketuaMajelis', customTitle: 'Ketua Majelis Jemaat' },
              { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
            ])}
            ${watermarkHtml}
          </div>
        `

      case 'SILABUS_MATERI':
        return `
          <div class="print-preview-root">
            ${printStyles}
            ${kopHtml}
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-lbl">Total Materi Terpilih</div>
                <div class="stat-val">24 Judul</div>
              </div>
              <div class="stat-card">
                <div class="stat-lbl">Terpublikasi Aktif</div>
                <div class="stat-val" style="color: #166534;">22 Materi</div>
              </div>
              <div class="stat-card">
                <div class="stat-lbl">Akumulasi Pembaca</div>
                <div class="stat-val" style="color: #0f172a;">3.450 views</div>
              </div>
              <div class="stat-card">
                <div class="stat-lbl">Kategori Terpilih</div>
                <div class="stat-val">4 Kategori</div>
              </div>
            </div>

            <table class="materi-table">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th>Judul Materi Khotbah / Pengajaran</th>
                  <th style="width: 110px;">Kategori</th>
                  <th>Pembicara / Penulis</th>
                  <th style="width: 80px; text-align: center;">Tanggal Terbit</th>
                  <th style="width: 80px; text-align: right;">Total Views</th>
                  <th style="width: 75px; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td style="font-weight: 700; color: #0f172a;">Fondasi Iman yang Tak Tergoyahkan di Era Modern</td>
                  <td style="font-size: 8.5px; font-weight: 700; text-transform: uppercase;">KHOTBAH RAYA</td>
                  <td style="font-weight: 600;">Pdt. Gembala Jemaat</td>
                  <td style="text-align: center;">15/01/2026</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700;">1.240 views</td>
                  <td style="text-align: center; font-size: 8.5px; font-weight: 700;">
                    <span style="border: 1px solid #bbf7d0; padding: 1.5px 5px; border-radius: 4px; background: #f0fdf4; color: #166534;">PUBLISHED</span>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td style="font-weight: 700; color: #0f172a;">Membangun Mezbah Doa Keluarga yang Berbuah</td>
                  <td style="font-size: 8.5px; font-weight: 700; text-transform: uppercase;">RENUNGAN HARIAN</td>
                  <td style="font-weight: 600;">Tim Pastoral Biro Pendidikan</td>
                  <td style="text-align: center;">02/02/2026</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700;">890 views</td>
                  <td style="text-align: center; font-size: 8.5px; font-weight: 700;">
                    <span style="border: 1px solid #bbf7d0; padding: 1.5px 5px; border-radius: 4px; background: #f0fdf4; color: #166534;">PUBLISHED</span>
                  </td>
                </tr>
              </tbody>
            </table>

            ${buildSignaturesHtml(pc, [
              { roleKey: 'ketuaPendidikan', customTitle: 'Kepala Biro Pendidikan / Pengajaran' },
              { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
            ])}
            ${watermarkHtml}
          </div>
        `

      case 'KEUANGAN_LPJ':
        return `
          <div class="print-preview-root">
            ${printStyles}
            ${kopHtml}
            <div style="text-align: center; margin: 4px 0 10px 0;">
              <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin: 0;">LAPORAN PERTANGGUNGJAWABAN (LPJ) REALISASI ANGGARAN</h2>
              <p style="font-size: 8.5px; color: #64748b; font-family: monospace; font-weight: bold; margin: 2px 0 0 0;">PERIODE: JANUARI – DESEMBER ${new Date().getFullYear()}</p>
            </div>
            <table class="finance-table">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th>Keterangan Pos Anggaran</th>
                  <th style="text-align: right; width: 110px;">Anggaran Disetujui</th>
                  <th style="text-align: right; width: 110px;">Realisasi Kas</th>
                  <th style="text-align: right; width: 100px;">Selisih (+/-)</th>
                  <th style="text-align: center; width: 70px;">% Capaian</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td style="font-weight: 700;">Penerimaan Persembahan Umum &amp; Perpuluhan</td>
                  <td style="text-align: right; font-family: monospace;">Rp 120.000.000</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700;">Rp 124.500.000</td>
                  <td style="text-align: right; font-family: monospace; color: #16a34a; font-weight: 700;">+ Rp 4.500.000</td>
                  <td style="text-align: center; font-weight: 700; color: #166534;">103.7%</td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td style="font-weight: 700;">Operasional Rutin &amp; Utilitas Gedung</td>
                  <td style="text-align: right; font-family: monospace;">Rp 45.000.000</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700;">Rp 42.800.000</td>
                  <td style="text-align: right; font-family: monospace; color: #16a34a; font-weight: 700;">+ Rp 2.200.000</td>
                  <td style="text-align: center; font-weight: 700; color: #166534;">95.1%</td>
                </tr>
                <tr>
                  <td style="text-align: center;">3</td>
                  <td style="font-weight: 700;">Pelayanan Diakonia &amp; Kasih Jemaat</td>
                  <td style="text-align: right; font-family: monospace;">Rp 20.000.000</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700;">Rp 19.500.000</td>
                  <td style="text-align: right; font-family: monospace; color: #16a34a; font-weight: 700;">+ Rp 500.000</td>
                  <td style="text-align: center; font-weight: 700; color: #166534;">97.5%</td>
                </tr>
              </tbody>
            </table>

            ${buildSignaturesHtml(pc, [
              { roleKey: 'bendahara', customTitle: 'Bendahara Gereja' },
              { roleKey: 'ketuaMajelis', customTitle: 'Ketua Majelis' },
              { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
            ])}
            ${watermarkHtml}
          </div>
        `

      case 'NERACA_GABUNGAN':
      default:
        return `
          <div class="print-preview-root">
            ${printStyles}
            ${kopHtml}
            <div style="text-align: center; margin: 4px 0 10px 0;">
              <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin: 0;">NERACA SALDO GABUNGAN &amp; KONSOLIDASI KAS GEREJA</h2>
              <p style="font-size: 8.5px; color: #64748b; font-family: monospace; font-weight: bold; margin: 2px 0 0 0;">PERIODE: TAHUN ${new Date().getFullYear()} • KONSOLIDASI SELURUH POS KAS</p>
            </div>
            <table class="finance-table">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th>Pos Kas Pelayanan / Departemen</th>
                  <th style="text-align: center; width: 65px;">Kode</th>
                  <th style="text-align: right; width: 100px;">Saldo Awal</th>
                  <th style="text-align: right; width: 100px;">Penerimaan (+)</th>
                  <th style="text-align: right; width: 100px;">Pengeluaran (-)</th>
                  <th style="text-align: right; width: 110px;">Saldo Akhir</th>
                  <th style="text-align: center; width: 60px;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center;">1</td>
                  <td style="font-weight: 700;">Kas Umum Operasional Gereja</td>
                  <td style="text-align: center; font-family: monospace;">UMUM</td>
                  <td style="text-align: right; font-family: monospace;">Rp 25.000.000</td>
                  <td style="text-align: right; font-family: monospace; color: #16a34a; font-weight: 700;">+ Rp 22.000.000</td>
                  <td style="text-align: right; font-family: monospace; color: #dc2626; font-weight: 700;">- Rp 10.500.000</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 900;">Rp 36.500.000</td>
                  <td style="text-align: center; font-size: 8px; font-weight: 700; color: #166534;">AKTIF</td>
                </tr>
                <tr>
                  <td style="text-align: center;">2</td>
                  <td style="font-weight: 700;">Kas Pembangunan &amp; Renovasi Gedung</td>
                  <td style="text-align: center; font-family: monospace;">BANGUN</td>
                  <td style="text-align: right; font-family: monospace;">Rp 15.000.000</td>
                  <td style="text-align: right; font-family: monospace; color: #16a34a; font-weight: 700;">+ Rp 10.000.000</td>
                  <td style="text-align: right; font-family: monospace; color: #dc2626; font-weight: 700;">- Rp 5.200.000</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 900;">Rp 19.800.000</td>
                  <td style="text-align: center; font-size: 8px; font-weight: 700; color: #166534;">AKTIF</td>
                </tr>
                <tr>
                  <td style="text-align: center;">3</td>
                  <td style="font-weight: 700;">Kas Diakonia &amp; Peduli Kasih</td>
                  <td style="text-align: center; font-family: monospace;">DIAKONIA</td>
                  <td style="text-align: right; font-family: monospace;">Rp 5.000.000</td>
                  <td style="text-align: right; font-family: monospace; color: #16a34a; font-weight: 700;">+ Rp 6.500.000</td>
                  <td style="text-align: right; font-family: monospace; color: #dc2626; font-weight: 700;">- Rp 2.500.000</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 900;">Rp 9.000.000</td>
                  <td style="text-align: center; font-size: 8px; font-weight: 700; color: #166534;">AKTIF</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc; font-weight: 900;">
                  <td colspan="3" style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center;">TOTAL KONSOLIDASI KAS GABUNGAN</td>
                  <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: right; font-family: monospace;">Rp 45.000.000</td>
                  <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: right; font-family: monospace; color: #16a34a;">+ Rp 38.500.000</td>
                  <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: right; font-family: monospace; color: #dc2626;">- Rp 18.200.000</td>
                  <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: right; font-family: monospace; color: #0f172a; font-size: 9.5px;">Rp 65.300.000</td>
                  <td style="border: 1px solid #cbd5e1;"></td>
                </tr>
              </tfoot>
            </table>

            ${buildSignaturesHtml(pc, [
              { roleKey: 'bendahara', customTitle: 'Bendahara Gereja' },
              { roleKey: 'ketuaMajelis', customTitle: 'Ketua Majelis' },
              { roleKey: 'gembala', customTitle: 'Mengetahui: Gembala Jemaat' },
            ])}
            ${watermarkHtml}
          </div>
        `
    }
  }

  // Live Test Print Execution
  // Uses the same buildKopHtml & buildSignaturesHtml as all production print modules
  const handleTestPrint = () => {
    const pc = buildPreviewConfig()
    const isLandscape = pc.options.orientasiDefault === 'LANDSCAPE'
    const printWindow = window.open('', '_blank', 'width=1100,height=850')
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Izinkan pop-up pada browser.')
      return
    }

    // getTemplateContent already embeds kopHtml via buildKopHtml(pc) — just wrap in print shell
    const bodyContent = getTemplateContent(previewTemplate)

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Uji Cetak: ${previewTemplate} — ${pc.kop.namaGereja}</title>
        <style>
          @page {
            size: ${pc.options.ukuranKertasDefault || 'A4'} ${isLandscape ? 'landscape' : 'portrait'};
            margin: ${isLandscape ? '10mm' : '12mm'};
          }
          * { box-sizing: border-box; margin: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            padding: 4px;
            font-size: 9.5px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(fullHtml)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[450px] text-muted-foreground gap-3 text-sm'>
        <Loader2 className='size-6 animate-spin text-primary' /> Memuat konfigurasi cetak & tanda tangan digital...
      </div>
    )
  }

  return (
    <div className='space-y-6 max-w-6xl mx-auto pb-20 px-2 sm:px-4'>
      {/* Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div className='flex items-start sm:items-center gap-3'>
          <div className='p-2 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5 sm:mt-0'>
            <Printer className='size-5' />
          </div>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Cetak & Dokumen</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Konfigurasi kop surat, tanda tangan, dan stempel resmi.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 w-full sm:w-auto shrink-0'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleReset}
            disabled={saving || resetting}
            className='flex-1 sm:flex-initial h-9 sm:h-8 text-xs gap-1.5'
          >
            {resetting ? <Loader2 className='size-3.5 animate-spin' /> : <RotateCcw className='size-3.5' />}
            Reset Default
          </Button>

          <Button
            size='sm'
            onClick={handleSave}
            disabled={saving || resetting}
            className='flex-1 sm:flex-initial h-9 sm:h-8 text-xs font-semibold bg-primary text-primary-foreground gap-1.5 shadow-xs'
          >
            {saving ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue='kop' className='space-y-4'>
        <div className='overflow-x-auto pb-1 no-scrollbar'>
          <TabsList className='h-9 w-max sm:w-full justify-start sm:justify-between p-1 bg-muted/60 rounded-xl'>
            <TabsTrigger value='kop' className='gap-1.5 py-1.5 px-3 sm:flex-1 text-xs font-semibold shrink-0'>
              <Building className='size-3.5 text-primary shrink-0' />
              <span>Kop Surat</span>
            </TabsTrigger>
            <TabsTrigger value='signatories' className='gap-1.5 py-1.5 px-3 sm:flex-1 text-xs font-semibold shrink-0'>
              <UserCheck className='size-3.5 text-primary shrink-0' />
              <span>Pejabat & TTD</span>
            </TabsTrigger>
            <TabsTrigger value='options' className='gap-1.5 py-1.5 px-3 sm:flex-1 text-xs font-semibold shrink-0'>
              <Stamp className='size-3.5 text-primary shrink-0' />
              <span>Stempel</span>
            </TabsTrigger>
            <TabsTrigger value='kta' className='gap-1.5 py-1.5 px-3 sm:flex-1 text-xs font-semibold shrink-0'>
              <Sparkles className='size-3.5 text-primary shrink-0' />
              <span>Tema Kartu Jemaat</span>
            </TabsTrigger>
            <TabsTrigger value='preview' className='gap-1.5 py-1.5 px-3 sm:flex-1 text-xs font-semibold shrink-0'>
              <Eye className='size-3.5 text-primary shrink-0' />
              <span>Preview Cetak</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB 1: KOP SURAT & LOGO ───────────────────────────── */}
        <TabsContent value='kop' className='space-y-6 pt-4'>
          <Card className='shadow-xs overflow-hidden w-full'>
            <CardHeader className='pb-3 px-4 sm:px-6'>
              <CardTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
                <Building className='size-4 text-primary shrink-0' />
                Kop Surat Resmi
              </CardTitle>
              <CardDescription className='text-xs text-muted-foreground mt-0.5'>
                Diterapkan otomatis pada seluruh cetakan dan dokumen PDF resmi gereja.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4 px-4 sm:px-6'>
              <div className='space-y-1.5 min-w-0'>
                <Label className='text-xs font-semibold'>Nama Resmi Gereja:</Label>
                <Input
                  value={config.kop.namaGereja}
                  onChange={(e) => setConfig((p) => ({ ...p, kop: { ...p.kop, namaGereja: e.target.value } }))}
                  placeholder='Contoh: GEREJA BETH-EL INDONESIA'
                  className='text-xs font-bold w-full'
                />
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='space-y-1.5 min-w-0'>
                  <Label className='text-xs font-semibold'>Alamat Lengkap Gereja:</Label>
                  <Input
                    value={config.kop.subJudul}
                    onChange={(e) => setConfig((p) => ({ ...p, kop: { ...p.kop, subJudul: e.target.value } }))}
                    placeholder='Contoh: Jln. Gereja No. 1, Kota - Provinsi'
                    className='text-xs w-full'
                  />
                </div>
                <div className='space-y-1.5 min-w-0'>
                  <Label className='text-xs font-semibold'>Kontak & Website:</Label>
                  <Input
                    value={config.kop.kontak}
                    onChange={(e) => setConfig((p) => ({ ...p, kop: { ...p.kop, kontak: e.target.value } }))}
                    placeholder='Contoh: Telp: (021) 123456 | Email: info@gereja.org | Web: www.gereja.org'
                    className='text-xs w-full'
                  />
                </div>
              </div>

              <div className='space-y-1.5 min-w-0'>
                <Label className='text-xs font-semibold'>Nomor SK Sinode / Badan Hukum Kemenag:</Label>
                <Input
                  value={config.kop.nomorIzin}
                  onChange={(e) => setConfig((p) => ({ ...p, kop: { ...p.kop, nomorIzin: e.target.value } }))}
                  placeholder='Contoh: SK Sinode GBI No. 123/GBI/2005 - Kemenag RI No. 45/2010'
                  className='text-xs font-mono w-full'
                />
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t'>
                <div className='space-y-1.5 min-w-0'>
                  <Label className='text-xs font-semibold'>Gaya Garis Pembatas Kop:</Label>
                  <Select
                    value={config.kop.garisKopStyle}
                    onValueChange={(val: any) => setConfig((p) => ({ ...p, kop: { ...p.kop, garisKopStyle: val } }))}
                  >
                    <SelectTrigger className='text-xs w-full max-w-full [&>span]:truncate [&>span]:block text-left'>
                      <SelectValue placeholder='Pilih gaya garis kop...' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='DOUBLE'>Garis Ganda Formal (Double Line)</SelectItem>
                      <SelectItem value='SINGLE'>Garis Tunggal Minimalis (Single Line)</SelectItem>
                      <SelectItem value='GOLD'>Aksen Emas Formal (Gold Border)</SelectItem>
                      <SelectItem value='NAVY'>Aksen Biru Tua (Navy Blue Border)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5 min-w-0'>
                  <Label className='text-xs font-semibold'>Warna Aksen Teks & Garis Kop:</Label>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='color'
                      value={config.kop.garisKopColor}
                      onChange={(e) => setConfig((p) => ({ ...p, kop: { ...p.kop, garisKopColor: e.target.value } }))}
                      className='w-12 h-9 p-1 cursor-pointer shrink-0'
                    />
                    <Input
                      value={config.kop.garisKopColor}
                      onChange={(e) => setConfig((p) => ({ ...p, kop: { ...p.kop, garisKopColor: e.target.value } }))}
                      placeholder='#0f172a'
                      className='text-xs font-mono flex-1'
                    />
                  </div>
                </div>
              </div>

              {/* Upload Logo Gereja */}
              <div className='pt-2 border-t space-y-2'>
                <Label className='text-xs font-semibold'>Logo Resmi Gereja:</Label>
                <div className='flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 bg-muted/40 rounded-xl border'>
                  <div className='size-16 sm:size-20 rounded-xl border bg-card flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative [background-image:linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] [background-size:8px_8px]'>
                    {logoPreview ? (
                      <img src={logoPreview} alt='Logo Gereja' className='size-full object-contain p-1' />
                    ) : (
                      <div className='size-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl'>
                        G
                      </div>
                    )}
                  </div>

                  <div className='flex-1 w-full space-y-2 min-w-0'>
                    <input
                      ref={logoInputRef}
                      type='file'
                      accept='image/png,image/jpeg,image/webp'
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setLogoFile(file)
                          setLogoPreview(URL.createObjectURL(file))
                        }
                      }}
                      className='hidden'
                    />

                    <div className='grid grid-cols-2 sm:flex sm:items-center gap-1.5'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => logoInputRef.current?.click()}
                        className='h-8 text-xs gap-1.5 font-medium justify-center w-full sm:w-auto'
                      >
                        <Upload className='size-3.5' /> {logoPreview ? 'Ganti Logo' : 'Pilih Logo'}
                      </Button>

                      {logoPreview && (
                        <Button
                          type='button'
                          variant='secondary'
                          size='sm'
                          disabled={bgProcessingTarget === 'logo'}
                          onClick={() => handleRemoveBackground('logo')}
                          className='h-8 text-xs gap-1 px-2.5 font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 justify-center w-full sm:w-auto'
                        >
                          {bgProcessingTarget === 'logo' ? (
                            <Loader2 className='size-3.5 animate-spin' />
                          ) : (
                            <Sparkles className='size-3.5 text-indigo-600' />
                          )}
                          {bgProcessingTarget === 'logo' ? 'Memproses...' : 'Hapus BG'}
                        </Button>
                      )}

                      {logoPreview && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => {
                            setLogoFile(null)
                            setLogoPreview(null)
                            setConfig((p) => ({ ...p, kop: { ...p.kop, logoUrl: null, logoCloudinaryId: null } }))
                          }}
                          className='col-span-2 sm:col-span-1 h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 justify-center w-full sm:w-auto'
                        >
                          <Trash2 className='size-3.5 mr-1' /> Hapus Logo
                        </Button>
                      )}
                    </div>

                    <p className='text-[11px] text-muted-foreground'>Format PNG/JPG transparan (Maks. 2MB)</p>

                    {bgProcessingTarget === 'logo' && bgProgressMessage && (
                      <p className='text-[10px] text-indigo-600 dark:text-indigo-400 font-medium animate-pulse'>
                        {bgProgressMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: DATA PEJABAT & TTD DIGITAL (8 PEJABAT LENGKAP DENGAN UPLOAD TTD & AI REMOVAL) ── */}
        <TabsContent value='signatories' className='space-y-6 pt-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* 1. Gembala Jemaat */}
            <SignatoryUploadCard
              title='Gembala Jemaat (Senior Pastor)'
              subtitle='Pengesahan utama seluruh warta, kartu jemaat, kartu keluarga & berkas gereja.'
              icon={UserCheck}
              signatory={config.signatories.gembala}
              previewUrl={gembalaTtdPreview}
              targetKey='gembala'
              isProcessing={bgProcessingTarget === 'gembala'}
              progressMsg={bgProgressMessage}
              onNameChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, gembala: { ...p.signatories.gembala, nama: val } },
                }))
              }
              onGelarChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, gembala: { ...p.signatories.gembala, gelar: val } },
                }))
              }
              onNipChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, gembala: { ...p.signatories.gembala, nomorInduk: val } },
                }))
              }
              onFileSelect={(file) => {
                setGembalaTtdFile(file)
                setGembalaTtdPreview(URL.createObjectURL(file))
              }}
              onRemoveBackground={() => handleRemoveBackground('gembala')}
              onRemoveTtd={() => {
                setGembalaTtdFile(null)
                setGembalaTtdPreview(null)
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    gembala: { ...p.signatories.gembala, ttdUrl: null, cloudinaryPublicId: null },
                  },
                }))
              }}
            />

            {/* 2. Sekretaris Majelis Jemaat */}
            <SignatoryUploadCard
              title='Sekretaris Majelis Jemaat'
              subtitle='Pengesahan surat keluar, biodata jemaat, sertifikat & kearsipan gereja.'
              icon={UserCheck}
              signatory={config.signatories.sekretaris}
              previewUrl={sekretarisTtdPreview}
              targetKey='sekretaris'
              isProcessing={bgProcessingTarget === 'sekretaris'}
              progressMsg={bgProgressMessage}
              onNameChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, sekretaris: { ...p.signatories.sekretaris, nama: val } },
                }))
              }
              onGelarChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, sekretaris: { ...p.signatories.sekretaris, gelar: val } },
                }))
              }
              onNipChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, sekretaris: { ...p.signatories.sekretaris, nomorInduk: val } },
                }))
              }
              onFileSelect={(file) => {
                setSekretarisTtdFile(file)
                setSekretarisTtdPreview(URL.createObjectURL(file))
              }}
              onRemoveBackground={() => handleRemoveBackground('sekretaris')}
              onRemoveTtd={() => {
                setSekretarisTtdFile(null)
                setSekretarisTtdPreview(null)
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    sekretaris: { ...p.signatories.sekretaris, ttdUrl: null, cloudinaryPublicId: null },
                  },
                }))
              }}
            />

            {/* 3. Bendahara Jemaat */}
            <SignatoryUploadCard
              title='Bendahara Jemaat'
              subtitle='Pengesahan laporan pertanggungjawaban (LPJ), buku kas & neraca keuangan.'
              icon={UserCheck}
              signatory={config.signatories.bendahara}
              previewUrl={bendaharaTtdPreview}
              targetKey='bendahara'
              isProcessing={bgProcessingTarget === 'bendahara'}
              progressMsg={bgProgressMessage}
              onNameChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, bendahara: { ...p.signatories.bendahara, nama: val } },
                }))
              }
              onGelarChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, bendahara: { ...p.signatories.bendahara, gelar: val } },
                }))
              }
              onNipChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, bendahara: { ...p.signatories.bendahara, nomorInduk: val } },
                }))
              }
              onFileSelect={(file) => {
                setBendaharaTtdFile(file)
                setBendaharaTtdPreview(URL.createObjectURL(file))
              }}
              onRemoveBackground={() => handleRemoveBackground('bendahara')}
              onRemoveTtd={() => {
                setBendaharaTtdFile(null)
                setBendaharaTtdPreview(null)
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    bendahara: { ...p.signatories.bendahara, ttdUrl: null, cloudinaryPublicId: null },
                  },
                }))
              }}
            />

            {/* 4. Ketua Majelis Jemaat */}
            <SignatoryUploadCard
              title='Ketua Majelis Jemaat'
              subtitle='Pengesahan Berita Acara Rapat Majelis, Sidang Sinode & SK Pelayan.'
              icon={UserCheck}
              signatory={config.signatories.ketuaMajelis}
              previewUrl={ketuaMajelisTtdPreview}
              targetKey='ketuaMajelis'
              isProcessing={bgProcessingTarget === 'ketuaMajelis'}
              progressMsg={bgProgressMessage}
              onNameChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, ketuaMajelis: { ...p.signatories.ketuaMajelis, nama: val } },
                }))
              }
              onGelarChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, ketuaMajelis: { ...p.signatories.ketuaMajelis, gelar: val } },
                }))
              }
              onNipChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: { ...p.signatories, ketuaMajelis: { ...p.signatories.ketuaMajelis, nomorInduk: val } },
                }))
              }
              onFileSelect={(file) => {
                setKetuaMajelisTtdFile(file)
                setKetuaMajelisTtdPreview(URL.createObjectURL(file))
              }}
              onRemoveBackground={() => handleRemoveBackground('ketuaMajelis')}
              onRemoveTtd={() => {
                setKetuaMajelisTtdFile(null)
                setKetuaMajelisTtdPreview(null)
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    ketuaMajelis: { ...p.signatories.ketuaMajelis, ttdUrl: null, cloudinaryPublicId: null },
                  },
                }))
              }}
            />

            {/* 5. Koordinator Divisi Pelayanan & Acara */}
            <SignatoryUploadCard
              title='Koordinator Divisi Pelayanan & Acara'
              subtitle='Pengesahan roster jadwal pelayan ibadah raya & rundown acara warta.'
              icon={UserCheck}
              signatory={config.signatories.koordinatorDivisi}
              previewUrl={koordinatorTtdPreview}
              targetKey='koordinatorDivisi'
              isProcessing={bgProcessingTarget === 'koordinatorDivisi'}
              progressMsg={bgProgressMessage}
              onNameChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    koordinatorDivisi: { ...p.signatories.koordinatorDivisi, nama: val },
                  },
                }))
              }
              onGelarChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    koordinatorDivisi: { ...p.signatories.koordinatorDivisi, gelar: val },
                  },
                }))
              }
              onNipChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    koordinatorDivisi: { ...p.signatories.koordinatorDivisi, nomorInduk: val },
                  },
                }))
              }
              onFileSelect={(file) => {
                setKoordinatorTtdFile(file)
                setKoordinatorTtdPreview(URL.createObjectURL(file))
              }}
              onRemoveBackground={() => handleRemoveBackground('koordinatorDivisi')}
              onRemoveTtd={() => {
                setKoordinatorTtdFile(null)
                setKoordinatorTtdPreview(null)
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    koordinatorDivisi: {
                      ...p.signatories.koordinatorDivisi,
                      ttdUrl: null,
                      cloudinaryPublicId: null,
                    },
                  },
                }))
              }}
            />

            {/* 6. Koordinator Komunitas Sel (Komsel) */}
            <SignatoryUploadCard
              title='Koordinator Komunitas Sel (Komsel)'
              subtitle='Pengesahan lembar presensi kelompok sel & warta pokok doa jemaat.'
              icon={UserCheck}
              signatory={config.signatories.koordinatorKomsel || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.koordinatorKomsel!}
              previewUrl={koordinatorKomselTtdPreview}
              targetKey='koordinatorKomsel'
              isProcessing={bgProcessingTarget === 'koordinatorKomsel'}
              progressMsg={bgProgressMessage}
              onNameChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    koordinatorKomsel: {
                      ...(p.signatories.koordinatorKomsel || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.koordinatorKomsel!),
                      nama: val,
                    },
                  },
                }))
              }
              onGelarChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    koordinatorKomsel: {
                      ...(p.signatories.koordinatorKomsel || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.koordinatorKomsel!),
                      gelar: val,
                    },
                  },
                }))
              }
              onNipChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    koordinatorKomsel: {
                      ...(p.signatories.koordinatorKomsel || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.koordinatorKomsel!),
                      nomorInduk: val,
                    },
                  },
                }))
              }
              onFileSelect={(file) => {
                setKoordinatorKomselTtdFile(file)
                setKoordinatorKomselTtdPreview(URL.createObjectURL(file))
              }}
              onRemoveBackground={() => handleRemoveBackground('koordinatorKomsel')}
              onRemoveTtd={() => {
                setKoordinatorKomselTtdFile(null)
                setKoordinatorKomselTtdPreview(null)
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    koordinatorKomsel: {
                      ...(p.signatories.koordinatorKomsel || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.koordinatorKomsel!),
                      ttdUrl: null,
                      cloudinaryPublicId: null,
                    },
                  },
                }))
              }}
            />

            {/* 7. Kepala Biro Pengajaran & Silabus */}
            <SignatoryUploadCard
              title='Kepala Biro Pengajaran & Kurikulum'
              subtitle='Pengesahan silabus kurikulum khotbah, kelas pemuridan & sertifikat kelulusan.'
              icon={UserCheck}
              signatory={config.signatories.ketuaPendidikan || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.ketuaPendidikan!}
              previewUrl={ketuaPendidikanTtdPreview}
              targetKey='ketuaPendidikan'
              isProcessing={bgProcessingTarget === 'ketuaPendidikan'}
              progressMsg={bgProgressMessage}
              onNameChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    ketuaPendidikan: {
                      ...(p.signatories.ketuaPendidikan || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.ketuaPendidikan!),
                      nama: val,
                    },
                  },
                }))
              }
              onGelarChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    ketuaPendidikan: {
                      ...(p.signatories.ketuaPendidikan || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.ketuaPendidikan!),
                      gelar: val,
                    },
                  },
                }))
              }
              onNipChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    ketuaPendidikan: {
                      ...(p.signatories.ketuaPendidikan || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.ketuaPendidikan!),
                      nomorInduk: val,
                    },
                  },
                }))
              }
              onFileSelect={(file) => {
                setKetuaPendidikanTtdFile(file)
                setKetuaPendidikanTtdPreview(URL.createObjectURL(file))
              }}
              onRemoveBackground={() => handleRemoveBackground('ketuaPendidikan')}
              onRemoveTtd={() => {
                setKetuaPendidikanTtdFile(null)
                setKetuaPendidikanTtdPreview(null)
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    ketuaPendidikan: {
                      ...(p.signatories.ketuaPendidikan || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.ketuaPendidikan!),
                      ttdUrl: null,
                      cloudinaryPublicId: null,
                    },
                  },
                }))
              }}
            />

            {/* 8. Koordinator Departemen Kategorial */}
            <SignatoryUploadCard
              title='Koordinator Departemen Kategorial'
              subtitle='Pengesahan laporan rekap data anggota & demografi departemen kategorial.'
              icon={UserCheck}
              signatory={config.signatories.pembinaKategorial || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.pembinaKategorial!}
              previewUrl={pembinaKategorialTtdPreview}
              targetKey='pembinaKategorial'
              isProcessing={bgProcessingTarget === 'pembinaKategorial'}
              progressMsg={bgProgressMessage}
              onNameChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    pembinaKategorial: {
                      ...(p.signatories.pembinaKategorial || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.pembinaKategorial!),
                      nama: val,
                    },
                  },
                }))
              }
              onGelarChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    pembinaKategorial: {
                      ...(p.signatories.pembinaKategorial || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.pembinaKategorial!),
                      gelar: val,
                    },
                  },
                }))
              }
              onNipChange={(val) =>
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    pembinaKategorial: {
                      ...(p.signatories.pembinaKategorial || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.pembinaKategorial!),
                      nomorInduk: val,
                    },
                  },
                }))
              }
              onFileSelect={(file) => {
                setPembinaKategorialTtdFile(file)
                setPembinaKategorialTtdPreview(URL.createObjectURL(file))
              }}
              onRemoveBackground={() => handleRemoveBackground('pembinaKategorial')}
              onRemoveTtd={() => {
                setPembinaKategorialTtdFile(null)
                setPembinaKategorialTtdPreview(null)
                setConfig((p) => ({
                  ...p,
                  signatories: {
                    ...p.signatories,
                    pembinaKategorial: {
                      ...(p.signatories.pembinaKategorial || DEFAULT_PRINT_LAYOUT_CONFIG.signatories.pembinaKategorial!),
                      ttdUrl: null,
                      cloudinaryPublicId: null,
                    },
                  },
                }))
              }}
            />
          </div>
        </TabsContent>

        {/* ── TAB 3: OPSI STEMPEL & AUTO ADJUST ──────────────────────── */}
        <TabsContent value='options' className='space-y-6 pt-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Stempel Resmi Gereja & AI Background Removal */}
              <Card className='shadow-xs overflow-hidden'>
                <CardHeader className='pb-3 px-4'>
                  <CardTitle className='text-sm font-bold flex items-center gap-2'>
                    <Stamp className='size-4 text-primary shrink-0' /> Stempel Resmi Gereja
                  </CardTitle>
                  <CardDescription className='text-xs'>Cap stempel digital transparan pada lembar cetak.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-3.5 px-4'>
                  <div className='flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border'>
                    <Label className='text-xs font-semibold'>Tampilkan Stempel Digital:</Label>
                    <Switch
                      checked={config.stempel.tampilkanStempel}
                      onCheckedChange={(val) => setConfig((p) => ({ ...p, stempel: { ...p.stempel, tampilkanStempel: val } }))}
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Pejabat Pemegang Stempel:</Label>
                    <Select
                      value={config.stempel.posisiStempel}
                      onValueChange={(val: any) => setConfig((p) => ({ ...p, stempel: { ...p.stempel, posisiStempel: val } }))}
                    >
                      <SelectTrigger className='text-xs h-8 w-full min-w-0 overflow-hidden px-2.5'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='GEMBALA' className='text-xs'>Di Atas TTD Gembala Jemaat</SelectItem>
                        <SelectItem value='SEKRETARIS' className='text-xs'>Di Atas TTD Sekretaris</SelectItem>
                        <SelectItem value='BENDAHARA' className='text-xs'>Di Atas TTD Bendahara</SelectItem>
                        <SelectItem value='KETUA_MAJELIS' className='text-xs'>Di Atas TTD Ketua Majelis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                {/* Upload Stempel */}
                <div className='space-y-2 pt-2 border-t'>
                  <Label className='text-xs font-semibold'>Upload File Stempel Gereja:</Label>
                  <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3 p-2.5 bg-muted/40 rounded-lg border'>
                    {/* Transparent checkerboard preview with live rotation */}
                    <div className='size-16 rounded-md border bg-card flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative [background-image:linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] [background-size:8px_8px]'>
                      {stempelPreview ? (
                        <img
                          src={stempelPreview}
                          alt='Stempel'
                          style={{
                            transform: `rotate(${config.stempel.rotasi ?? -6}deg)`,
                            opacity: config.stempel.opacity ?? 0.85,
                          }}
                          className='max-h-14 max-w-[56px] object-contain transition-all'
                        />
                      ) : (
                        <Stamp className='size-6 text-muted-foreground' />
                      )}
                    </div>

                    <div className='flex-1 w-full space-y-2 min-w-0'>
                      <input
                        ref={stempelInputRef}
                        type='file'
                        accept='image/png,image/jpeg,image/webp'
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setStempelFile(file)
                            setStempelPreview(URL.createObjectURL(file))
                          }
                        }}
                        className='hidden'
                      />

                      <div className='grid grid-cols-2 sm:flex sm:items-center gap-1.5'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => stempelInputRef.current?.click()}
                          className='h-8 text-xs gap-1.5 font-medium justify-center w-full sm:w-auto'
                        >
                          <Upload className='size-3.5' /> {stempelPreview ? 'Ganti Stempel' : 'Pilih Stempel'}
                        </Button>

                        {stempelPreview && (
                          <Button
                            type='button'
                            variant='secondary'
                            size='sm'
                            disabled={bgProcessingTarget === 'stempel'}
                            onClick={() => handleRemoveBackground('stempel')}
                            className='h-8 text-xs gap-1 px-2.5 font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 justify-center w-full sm:w-auto'
                          >
                            {bgProcessingTarget === 'stempel' ? (
                              <Loader2 className='size-3.5 animate-spin' />
                            ) : (
                              <Sparkles className='size-3.5 text-indigo-600' />
                            )}
                            {bgProcessingTarget === 'stempel' ? 'Memproses...' : 'Hapus BG'}
                          </Button>
                        )}

                        {stempelPreview && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              setStempelFile(null)
                              setStempelPreview(null)
                              setConfig((p) => ({
                                ...p,
                                stempel: { ...p.stempel, stempelUrl: null, stempelCloudinaryId: null },
                              }))
                            }}
                            className='col-span-2 sm:col-span-1 h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 justify-center w-full sm:w-auto'
                          >
                            <Trash2 className='size-3.5 mr-1' /> Hapus Stempel
                          </Button>
                        )}
                      </div>

                      <p className='text-[11px] text-muted-foreground'>Format PNG transparan dianjurkan (Maks. 2MB)</p>

                      {bgProcessingTarget === 'stempel' && bgProgressMessage && (
                        <p className='text-[10px] text-indigo-600 dark:text-indigo-400 font-medium animate-pulse'>
                          {bgProgressMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto Adjust & Auto Size Settings */}
            <Card className='shadow-xs overflow-hidden border-border/80'>
              <CardHeader className='pb-3 px-4'>
                <CardTitle className='text-sm font-bold flex items-center gap-2'>
                  <SlidersHorizontal className='size-4 text-primary' /> Auto Adjust & Ukuran Stempel
                </CardTitle>
                <CardDescription className='text-xs'>Pengaturan proporsi skala, rotasi kemiringan & transparansi cap.</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 px-4'>
                {/* Ukuran Stempel */}
                <div className='space-y-1.5'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-xs font-semibold'>Ukuran Skala Stempel:</Label>
                    <Badge variant='secondary' className='text-[10px]'>
                      {config.stempel.ukuran === 'SMALL'
                        ? '44px (Kecil)'
                        : config.stempel.ukuran === 'MEDIUM'
                        ? '56px (Sedang)'
                        : config.stempel.ukuran === 'LARGE'
                        ? '68px (Besar)'
                        : '52px (Auto Size)'}
                    </Badge>
                  </div>
                  <Select
                    value={config.stempel.ukuran || 'AUTO'}
                    onValueChange={(val: any) =>
                      setConfig((p) => ({ ...p, stempel: { ...p.stempel, ukuran: val } }))
                    }
                  >
                    <SelectTrigger className='text-xs h-8 w-full min-w-0 overflow-hidden px-2.5'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='AUTO' className='text-xs'>Auto Adjust (~52px)</SelectItem>
                      <SelectItem value='SMALL' className='text-xs'>Kecil (Compact ~44px)</SelectItem>
                      <SelectItem value='MEDIUM' className='text-xs'>Sedang (Standard ~56px)</SelectItem>
                      <SelectItem value='LARGE' className='text-xs'>Besar (Large ~68px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Kemiringan / Rotasi Cap Basah Slider */}
                <div className='space-y-2 pt-2 border-t'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-xs font-semibold flex items-center gap-1.5'>
                      <RotateCw className='size-3.5 text-primary' /> Kemiringan Sudut Cap Basah:
                    </Label>
                    <Badge variant='outline' className='text-[10px] font-mono'>
                      {config.stempel.rotasi ?? -6}°
                    </Badge>
                  </div>
                  <input
                    type='range'
                    min='-15'
                    max='15'
                    step='1'
                    value={config.stempel.rotasi ?? -6}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        stempel: { ...p.stempel, rotasi: parseInt(e.target.value) },
                      }))
                    }
                    className='w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer'
                  />
                  <div className='flex justify-between text-[10px] text-muted-foreground'>
                    <span>-15° (Miring Kiri)</span>
                    <span>0° (Tegak)</span>
                    <span>+15° (Miring Kanan)</span>
                  </div>
                </div>

                {/* Transparansi / Opasitas Slider */}
                <div className='space-y-2 pt-2 border-t'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-xs font-semibold'>Transparansi / Opasitas Cap:</Label>
                    <Badge variant='outline' className='text-[10px] font-mono'>
                      {Math.round((config.stempel.opacity ?? 0.85) * 100)}%
                    </Badge>
                  </div>
                  <input
                    type='range'
                    min='0.5'
                    max='1.0'
                    step='0.05'
                    value={config.stempel.opacity ?? 0.85}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        stempel: { ...p.stempel, opacity: parseFloat(e.target.value) },
                      }))
                    }
                    className='w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer'
                  />
                  <div className='flex justify-between text-[10px] text-muted-foreground'>
                    <span>50% (Transparan)</span>
                    <span>85% (Otentik)</span>
                    <span>100% (Solid)</span>
                  </div>
                </div>

                {/* Penempatan Posisi Overlap */}
                <div className='space-y-1.5 pt-2 border-t'>
                  <Label className='text-xs font-semibold'>Posisi Overlap terhadap Tanda Tangan:</Label>
                  <Select
                    value={config.stempel.posisiOffset || 'OVERLAP_RIGHT'}
                    onValueChange={(val: any) =>
                      setConfig((p) => ({ ...p, stempel: { ...p.stempel, posisiOffset: val } }))
                    }
                  >
                    <SelectTrigger className='text-xs h-8 w-full min-w-0 overflow-hidden px-2.5'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='OVERLAP_RIGHT' className='text-xs'>Overlap Kanan TTD (Standar Resmi)</SelectItem>
                      <SelectItem value='OVERLAP_LEFT' className='text-xs'>Overlap Kiri TTD</SelectItem>
                      <SelectItem value='CENTER' className='text-xs'>Tepat di Tengah TTD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Opsi Tampilan & Format Kertas */}
            <Card className='shadow-xs overflow-hidden md:col-span-2'>
              <CardHeader className='pb-3 px-4'>
                <CardTitle className='text-sm font-bold flex items-center gap-2'>
                  <Sliders className='size-4 text-primary' /> Opsi Format Dokumen & Keamanan
                </CardTitle>
                <CardDescription className='text-xs'>Standar pencetakan global seluruh modul.</CardDescription>
              </CardHeader>
              <CardContent className='space-y-3.5 px-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border'>
                    <Label className='text-xs font-semibold'>Watermark Otentikasi SHA-256:</Label>
                    <Switch
                      checked={config.options.tampilkanWatermarkAudit}
                      onCheckedChange={(val) =>
                        setConfig((p) => ({ ...p, options: { ...p.options, tampilkanWatermarkAudit: val } }))
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border'>
                    <Label className='text-xs font-semibold'>Nomor Halaman Dokumen:</Label>
                    <Switch
                      checked={config.options.tampilkanNomorHalaman}
                      onCheckedChange={(val) =>
                        setConfig((p) => ({ ...p, options: { ...p.options, tampilkanNomorHalaman: val } }))
                      }
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Ukuran Kertas Standar:</Label>
                    <Select
                      value={config.options.ukuranKertasDefault || 'A4'}
                      onValueChange={(val: any) =>
                        setConfig((p) => ({ ...p, options: { ...p.options, ukuranKertasDefault: val } }))
                      }
                    >
                      <SelectTrigger className='text-xs'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='A4'>A4 (210 x 297 mm)</SelectItem>
                        <SelectItem value='F4'>F4 / Folio (215 x 330 mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Mode Tanda Tangan:</Label>
                    <Select
                      value={config.options.modeTandaTangan}
                      onValueChange={(val: any) =>
                        setConfig((p) => ({ ...p, options: { ...p.options, modeTandaTangan: val } }))
                      }
                    >
                      <SelectTrigger className='text-xs'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='DIGITAL_IMAGE'>Tanda Tangan Digital Gambar (Transparan)</SelectItem>
                        <SelectItem value='MANUAL_LINE'>Garis Tanda Tangan Basah Manual</SelectItem>
                        <SelectItem value='BOTH'>Gambar Digital & Garis Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB KTA: TEMA & WARNA KARTU JEMAAT ─────────────────────── */}
        <TabsContent value='kta' className='space-y-6 pt-4'>
          <Card className='shadow-xs overflow-hidden w-full'>
            <CardHeader className='pb-3 px-4 sm:px-6'>
              <CardTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
                <Sparkles className='size-4 text-primary shrink-0' />
                Tema & Desain Warna Kartu Tanda Anggota (KTA)
              </CardTitle>
              <CardDescription className='text-xs text-muted-foreground mt-0.5'>
                Pilih palet tema warna eksklusif untuk kartu tanda anggota resmi jemaat yang digunakan saat cetak dan presensi QR.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6 px-4 sm:px-6'>
              {/* Presets Grid */}
              <div className='space-y-2.5'>
                <Label className='text-xs font-semibold'>Pilihan Tema Warna Kartu:</Label>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
                  {KTA_THEME_PRESETS.map((preset) => {
                    const isSelected = (config.kta?.theme || 'NAVY_GOLD') === preset.id
                    return (
                      <button
                        key={preset.id}
                        type='button'
                        onClick={() => {
                          setConfig((p) => ({
                            ...p,
                            kta: {
                              ...p.kta,
                              theme: preset.id as any,
                            },
                          }))
                        }}
                        className={`text-left rounded-xl p-3.5 border-2 transition-all flex flex-col justify-between gap-3 relative overflow-hidden bg-card hover:shadow-md cursor-pointer ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 shadow-xs'
                            : 'border-border/80 hover:border-border'
                        }`}
                      >
                        {/* Mini Card Header Bar Preview */}
                        <div
                          className='h-8 w-full rounded-md flex items-center justify-between px-2.5 text-[10px] font-bold text-white relative shadow-2xs overflow-hidden'
                          style={{ background: preset.previewGradient }}
                        >
                          <span className='tracking-wide uppercase text-[9px] truncate max-w-[80%]'>
                            {config.kop.namaGereja || 'NAMA GEREJA'}
                          </span>
                          <span className='size-2 rounded-full shrink-0' style={{ background: preset.accent }} />
                          <div
                            className='absolute bottom-0 left-0 right-0 h-0.75'
                            style={{ background: preset.accentGradient }}
                          />
                        </div>

                        {/* Title & Description */}
                        <div className='min-w-0 space-y-0.5'>
                          <div className='flex items-center justify-between gap-2'>
                            <span className='font-bold text-xs text-foreground'>{preset.name}</span>
                            {isSelected && (
                              <Badge className='text-[9px] bg-primary text-primary-foreground h-4 px-1.5 font-bold gap-1'>
                                <Check className='size-2.5' /> Aktif
                              </Badge>
                            )}
                          </div>
                          <p className='text-[10.5px] text-muted-foreground line-clamp-2 leading-tight'>
                            {preset.desc}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom Color Pickers if 'CUSTOM' selected */}
              {config.kta?.theme === 'CUSTOM' && (
                <div className='p-4 bg-muted/40 rounded-xl border space-y-3.5'>
                  <Label className='text-xs font-semibold flex items-center gap-1.5'>
                    <Sliders className='size-3.5 text-primary' /> Kustomisasi Warna Gradien & Aksen Sendiri:
                  </Label>
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    <div className='space-y-1.5'>
                      <Label className='text-[11px] font-medium'>Warna Gradien Awal:</Label>
                      <div className='flex items-center gap-2'>
                        <Input
                          type='color'
                          value={config.kta?.customColor1 || '#0f172a'}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              kta: { ...(p.kta || DEFAULT_PRINT_LAYOUT_CONFIG.kta), customColor1: e.target.value },
                            }))
                          }
                          className='w-10 h-8 p-1 cursor-pointer shrink-0'
                        />
                        <Input
                          value={config.kta?.customColor1 || '#0f172a'}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              kta: { ...(p.kta || DEFAULT_PRINT_LAYOUT_CONFIG.kta), customColor1: e.target.value },
                            }))
                          }
                          className='text-xs font-mono h-8 flex-1'
                        />
                      </div>
                    </div>

                    <div className='space-y-1.5'>
                      <Label className='text-[11px] font-medium'>Warna Gradien Akhir:</Label>
                      <div className='flex items-center gap-2'>
                        <Input
                          type='color'
                          value={config.kta?.customColor2 || '#1e3a8a'}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              kta: { ...(p.kta || DEFAULT_PRINT_LAYOUT_CONFIG.kta), customColor2: e.target.value },
                            }))
                          }
                          className='w-10 h-8 p-1 cursor-pointer shrink-0'
                        />
                        <Input
                          value={config.kta?.customColor2 || '#1e3a8a'}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              kta: { ...(p.kta || DEFAULT_PRINT_LAYOUT_CONFIG.kta), customColor2: e.target.value },
                            }))
                          }
                          className='text-xs font-mono h-8 flex-1'
                        />
                      </div>
                    </div>

                    <div className='space-y-1.5'>
                      <Label className='text-[11px] font-medium'>Warna Garis Aksen Emas/Warna:</Label>
                      <div className='flex items-center gap-2'>
                        <Input
                          type='color'
                          value={config.kta?.accentColor || '#eab308'}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              kta: { ...(p.kta || DEFAULT_PRINT_LAYOUT_CONFIG.kta), accentColor: e.target.value },
                            }))
                          }
                          className='w-10 h-8 p-1 cursor-pointer shrink-0'
                        />
                        <Input
                          value={config.kta?.accentColor || '#eab308'}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              kta: { ...(p.kta || DEFAULT_PRINT_LAYOUT_CONFIG.kta), accentColor: e.target.value },
                            }))
                          }
                          className='text-xs font-mono h-8 flex-1'
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: LIVE PREVIEW & UJI CETAK ──────────────────────── */}
        <TabsContent value='preview' className='space-y-4 pt-4'>
          <Card className='shadow-xs'>
            <CardHeader className='pb-3 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div>
                <CardTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
                  <Eye className='size-4 text-primary shrink-0' /> Pratinjau Dokumen
                </CardTitle>
                <CardDescription className='text-xs text-muted-foreground mt-0.5'>
                  Pilih jenis modul untuk melihat kop, tanda tangan, dan stempel resmi.
                </CardDescription>
              </div>

              <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0'>
                <Select
                  value={previewTemplate}
                  onValueChange={(val: PrintTemplateType) => setPreviewTemplate(val)}
                >
                  <SelectTrigger className='text-xs w-full sm:w-[220px] h-9 sm:h-8'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='NERACA_GABUNGAN'>Neraca Saldo Gabungan Keuangan</SelectItem>
                    <SelectItem value='KEUANGAN_LPJ'>LPJ Keuangan Gereja</SelectItem>
                    <SelectItem value='BIODATA_JEMAAT'>Biodata Jemaat (Data Anggota)</SelectItem>
                    <SelectItem value='KARTU_KELUARGA'>Kartu Keluarga Gereja (KKG)</SelectItem>
                    <SelectItem value='KATEGORIAL_ANGGOTA'>Rekap Anggota Kategorial</SelectItem>
                    <SelectItem value='PELAYAN_ROSTER'>Roster Jadwal Pelayan Ibadah</SelectItem>
                    <SelectItem value='KOMSEL_PRESENSI'>Lembar Presensi Komsel</SelectItem>
                    <SelectItem value='LEMBAR_DOA'>Lembar Doa Syafaat Gereja</SelectItem>
                    <SelectItem value='AGENDA_EVENT'>Agenda &amp; Event Gereja</SelectItem>
                    <SelectItem value='BERITA_ACARA'>Berita Acara Dokumen</SelectItem>
                    <SelectItem value='SILABUS_MATERI'>Silabus Materi Pemuridan</SelectItem>
                  </SelectContent>
                </Select>

                <Button size='sm' onClick={handleTestPrint} className='w-full sm:w-auto h-9 sm:h-8 text-xs gap-1.5 shadow-xs'>
                  <Printer className='size-3.5' />
                  Uji Cetak
                </Button>
              </div>
            </CardHeader>
            <CardContent className='p-0 overflow-hidden rounded-b-xl'>
              {/* Zoom Toolbar */}
              <div className='flex items-center justify-between gap-2 px-4 py-2 border-b bg-muted/60'>
                <div className='flex items-center gap-1'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-7'
                    onClick={zoomOut}
                    disabled={previewScale <= 50}
                    title='Perkecil'
                  >
                    <ZoomOut className='size-3.5' />
                  </Button>

                  <div className='flex items-center gap-1 px-2 py-0.5 rounded-md border bg-background text-xs font-mono font-semibold min-w-[54px] text-center'>
                    {previewScale}%
                  </div>

                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-7'
                    onClick={zoomIn}
                    disabled={previewScale >= 125}
                    title='Perbesar'
                  >
                    <ZoomIn className='size-3.5' />
                  </Button>
                </div>

                <div className='flex items-center gap-1'>
                  {/* Quick zoom presets */}
                  {[75, 100, 125].map((pct) => (
                    <Button
                      key={pct}
                      variant={previewScale === pct ? 'secondary' : 'ghost'}
                      size='sm'
                      onClick={() => setPreviewScale(pct)}
                      className='h-6 px-2 text-[11px] font-mono'
                    >
                      {pct}%
                    </Button>
                  ))}
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-7 ml-1'
                    onClick={fitPage}
                    title='Sesuaikan halaman'
                  >
                    <Minimize2 className='size-3.5' />
                  </Button>
                </div>
              </div>

              {/* Canvas — mimics PDF viewer background */}
              <div
                className='overflow-auto bg-[#3a3a3a]'
                style={{ height: '70vh', minHeight: '460px' }}
              >
                <div className='flex justify-center py-8 px-4'>
                  {/* Paper sheet with zoom transform */}
                  <div
                    style={{
                      transform: `scale(${previewScale / 100})`,
                      transformOrigin: 'top center',
                      marginBottom: `calc((${previewScale / 100} - 1) * 100%)`,
                      width: '794px', /* A4 width in px at 96dpi */
                    }}
                    className='shrink-0'
                  >
                    <div
                      className='bg-white text-slate-900 shadow-2xl'
                      style={{
                        width: '794px',
                        minHeight: '1122px', /* A4 height */
                        padding: '48px 56px',
                        fontFamily: 'Georgia, serif',
                        fontSize: '10px',
                        lineHeight: '1.5',
                        boxShadow: '0 4px 32px 0 rgba(0,0,0,0.5)',
                      }}
                    >
                      <div dangerouslySetInnerHTML={{ __html: getTemplateContent(previewTemplate) }} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
