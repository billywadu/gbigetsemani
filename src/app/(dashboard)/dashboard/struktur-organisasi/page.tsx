'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  Users,
  Plus,
  Search,
  Filter,
  Loader2,
  Trash2,
  Edit,
  ExternalLink,
  Save,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  User,
  Sparkles,
  ShieldCheck,
  Layers,
  Award,
  BookOpen,
  Calendar,
  Flame,
  Heart,
  Settings,
  ArrowUpDown,
  LayoutGrid,
  CreditCard,
  Globe,
  Compass,
  ArrowRight,
  ArrowLeft,
  Info,
  HelpCircle,
  Check,
  ChevronRight,
  Layout,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUploadField } from '@/components/surat/image-upload-field'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getStrukturOrganisasiAdminAction,
  getJemaatListForSelectAction,
  createPengurusAction,
  updatePengurusAction,
  deletePengurusAction,
  getStrukturTiersAction,
  createStrukturTierAction,
  updateStrukturTierAction,
  deleteStrukturTierAction,
  getKategorialListForAdminAction,
  updateProfilKategorialAction,
  PengurusGerejaDTO,
  StrukturTierDTO,
  KategorialProfilDTO,
  ScopeStrukturType,
  LayoutStyleTierType,
  KategoriPengurusType,
} from '@/actions/struktur-organisasi'
import { toast } from 'sonner'

export default function StrukturOrganisasiAdminPage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pejabat' | 'tiers' | 'profil'>('pejabat')

  // Scope: 'UTAMA' or Kategorial ID
  const [selectedScope, setSelectedScope] = useState<string>('UTAMA')
  const [kategorialList, setKategorialList] = useState<KategorialProfilDTO[]>([])

  // Data lists
  const [pengurusList, setPengurusList] = useState<PengurusGerejaDTO[]>([])
  const [tierList, setTierList] = useState<StrukturTierDTO[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // ── MODAL FORM STATE: PEJABAT PENGURUS ──
  const [pengurusDialogOpen, setPengurusDialogOpen] = useState(false)
  const [editingPengurusId, setEditingPengurusId] = useState<string | null>(null)
  const [savingPengurus, setSavingPengurus] = useState(false)
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1)
  const [showGuide, setShowGuide] = useState(false)

  // Pengurus Fields
  const [jemaatId, setJemaatId] = useState('')
  const [jemaatSearch, setJemaatSearch] = useState('')
  const [jemaatOptions, setJemaatOptions] = useState<Array<{ id: string; nama: string; nij: string | null; statusJemaat?: string | null }>>([])
  const [searchingJemaat, setSearchingJemaat] = useState(false)
  const [selectedJemaatName, setSelectedJemaatName] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [gelar, setGelar] = useState('')
  const [namaOverride, setNamaOverride] = useState('')
  const [tierId, setTierId] = useState<string>('')
  const [urutan, setUrutan] = useState(1)
  const [fotoPublikUrl, setFotoPublikUrl] = useState('')
  const [bioRingkas, setBioRingkas] = useState('')
  const [isActivePublik, setIsActivePublik] = useState(true)
  const [periodeAwal, setPeriodeAwal] = useState<number | undefined>(new Date().getFullYear())
  const [periodeAkhir, setPeriodeAkhir] = useState<number | undefined>(undefined)

  // ── MODAL FORM STATE: TINGKATAN (TIER) ──
  const [tierDialogOpen, setTierDialogOpen] = useState(false)
  const [editingTierId, setEditingTierId] = useState<string | null>(null)
  const [savingTier, setSavingTier] = useState(false)

  // Tier Fields
  const [tierNama, setTierNama] = useState('')
  const [tierDeskripsi, setTierDeskripsi] = useState('')
  const [tierUrutan, setTierUrutan] = useState(1)
  const [tierLayoutStyle, setTierLayoutStyle] = useState<LayoutStyleTierType>('GRID')

  // ── KATEGORIAL PROFILE SETTINGS STATE ──
  const [currentKategorial, setCurrentKategorial] = useState<KategorialProfilDTO | null>(null)
  const [katSlogan, setKatSlogan] = useState('')
  const [katAyatTema, setKatAyatTema] = useState('')
  const [katJadwal, setKatJadwal] = useState('')
  const [katInstagram, setKatInstagram] = useState('')
  const [katActivePublik, setKatActivePublik] = useState(true)
  const [savingKatProfile, setSavingKatProfile] = useState(false)

  // Current scope helper (unify UTAMA and kategorial 'Umum')
  const isMainScope =
    selectedScope === 'UTAMA' ||
    kategorialList.find((k) => k.id === selectedScope)?.slug === 'umum' ||
    kategorialList.find((k) => k.id === selectedScope)?.nama.toLowerCase() === 'umum'
  const currentScopeType: ScopeStrukturType = isMainScope ? 'UTAMA' : 'KATEGORIAL'
  const currentKategorialId = isMainScope ? undefined : selectedScope

  // Load Kategorials Master List
  const loadKategorials = useCallback(async () => {
    const res = await getKategorialListForAdminAction()
    if (res.success && res.data) {
      setKategorialList(res.data)
    }
  }, [])

  // Load Main Data (Officials, Tiers, and Kategorial Profile)
  const loadScopeData = useCallback(async () => {
    setLoading(true)
    const [resPengurus, resTiers] = await Promise.all([
      getStrukturOrganisasiAdminAction({
        scope: currentScopeType,
        kategorialId: currentKategorialId,
        search: searchQuery,
      }),
      getStrukturTiersAction(currentScopeType, currentKategorialId),
    ])

    if (resPengurus.success && resPengurus.data) {
      setPengurusList(resPengurus.data)
    }
    if (resTiers.success && resTiers.data) {
      setTierList(resTiers.data)
    }

    // Set kategorial profile fields if kategorial scope
    if (!isMainScope && currentKategorialId) {
      const kat = kategorialList.find((k) => k.id === currentKategorialId)
      if (kat) {
        setCurrentKategorial(kat)
        setKatSlogan(kat.slogan || '')
        setKatAyatTema(kat.ayatTema || '')
        setKatJadwal(kat.jadwalIbadah || '')
        setKatInstagram(kat.instagramUrl || '')
        setKatActivePublik(kat.isActivePublik)
      }
    } else {
      setCurrentKategorial(null)
    }

    setLoading(false)
  }, [currentScopeType, currentKategorialId, isMainScope, searchQuery, kategorialList])

  useEffect(() => {
    loadKategorials()
  }, [loadKategorials])

  useEffect(() => {
    loadScopeData()
  }, [loadScopeData])

  // Search Jemaat Autocomplete
  useEffect(() => {
    if (!pengurusDialogOpen) return
    const timer = setTimeout(async () => {
      setSearchingJemaat(true)
      const res = await getJemaatListForSelectAction(jemaatSearch)
      if (res.success && res.data) {
        setJemaatOptions(res.data)
      }
      setSearchingJemaat(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [jemaatSearch, pengurusDialogOpen])

  // ── HANDLERS: PEJABAT PENGURUS ──
  const handleOpenCreatePengurus = () => {
    setEditingPengurusId(null)
    setFormStep(1)
    setJemaatId('')
    setSelectedJemaatName('')
    setJemaatSearch('')
    setJabatan('')
    setGelar('')
    setNamaOverride('')
    setTierId(tierList.length > 0 ? tierList[0].id : '')
    setUrutan(pengurusList.length + 1)
    setFotoPublikUrl('')
    setBioRingkas('')
    setIsActivePublik(true)
    setPeriodeAwal(new Date().getFullYear())
    setPeriodeAkhir(undefined)
    setPengurusDialogOpen(true)
    // Preload jemaat list
    getJemaatListForSelectAction('').then((res) => {
      if (res.success && res.data) setJemaatOptions(res.data)
    })
  }

  const handleOpenEditPengurus = (p: PengurusGerejaDTO) => {
    setEditingPengurusId(p.id)
    setFormStep(1)
    setJemaatId(p.jemaatId)
    setSelectedJemaatName(p.nama)
    setJemaatSearch(p.nama)
    setJabatan(p.jabatan)
    setGelar(p.gelar || '')
    setNamaOverride(p.namaOverride || '')
    setTierId(p.tierId || (tierList.length > 0 ? tierList[0].id : ''))
    setUrutan(p.urutan)
    setFotoPublikUrl(p.fotoPublikUrl || '')
    setBioRingkas(p.bioRingkas || '')
    setIsActivePublik(p.isActivePublik)
    setPeriodeAwal(p.periodeAwal || undefined)
    setPeriodeAkhir(p.periodeAkhir || undefined)
    setPengurusDialogOpen(true)
    // Preload jemaat list
    getJemaatListForSelectAction('').then((res) => {
      if (res.success && res.data) setJemaatOptions(res.data)
    })
  }

  const handleSavePengurus = async () => {
    if (!editingPengurusId && !jemaatId) {
      toast.error('Silakan pilih jemaat dari master data.')
      return
    }
    if (!jabatan.trim()) {
      toast.error('Jabatan pelayanan wajib diisi.')
      return
    }

    setSavingPengurus(true)
    try {
      const kategori: KategoriPengurusType = isMainScope ? 'PIMPINAN_UTAMA' : 'KATEGORIAL'

      if (editingPengurusId) {
        const res = await updatePengurusAction(editingPengurusId, {
          jemaatId: jemaatId || undefined,
          jabatan,
          gelar,
          namaOverride,
          kategori,
          kategorialId: currentKategorialId,
          tierId: tierId || undefined,
          level: 3,
          urutan: Number(urutan),
          fotoPublikUrl: fotoPublikUrl.trim() || undefined,
          bioRingkas,
          isActivePublik,
          periodeAwal,
          periodeAkhir,
        })
        if (res.success) {
          toast.success('Data pengurus berhasil diperbarui!')
          setPengurusDialogOpen(false)
          loadScopeData()
        } else {
          toast.error(res.error || 'Gagal memperbarui pengurus.')
        }
      } else {
        const res = await createPengurusAction({
          jemaatId,
          jabatan,
          gelar,
          namaOverride,
          kategori,
          kategorialId: currentKategorialId,
          tierId: tierId || undefined,
          level: 3,
          urutan: Number(urutan),
          fotoPublikUrl: fotoPublikUrl.trim() || undefined,
          bioRingkas,
          isActivePublik,
          periodeAwal,
          periodeAkhir,
        })
        if (res.success) {
          toast.success('Pengurus baru berhasil ditambahkan!')
          setPengurusDialogOpen(false)
          loadScopeData()
        } else {
          toast.error(res.error || 'Gagal menambahkan pengurus.')
        }
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan data.')
    } finally {
      setSavingPengurus(false)
    }
  }

  const handleDeletePengurus = async (id: string, name: string) => {
    if (!confirm(`Hapus "${name}" dari kepengurusan?`)) return
    const res = await deletePengurusAction(id)
    if (res.success) {
      toast.success('Pengurus berhasil dihapus.')
      loadScopeData()
    } else {
      toast.error(res.error || 'Gagal menghapus pengurus.')
    }
  }

  // ── HANDLERS: TINGKATAN (TIER) ──
  const handleOpenCreateTier = () => {
    setEditingTierId(null)
    setTierNama('')
    setTierDeskripsi('')
    setTierUrutan(tierList.length + 1)
    setTierLayoutStyle('GRID')
    setTierDialogOpen(true)
  }

  const handleOpenEditTier = (t: StrukturTierDTO) => {
    setEditingTierId(t.id)
    setTierNama(t.nama)
    setTierDeskripsi(t.deskripsi || '')
    setTierUrutan(t.urutan)
    setTierLayoutStyle(t.layoutStyle)
    setTierDialogOpen(true)
  }

  const handleSaveTier = async () => {
    if (!tierNama.trim()) {
      toast.error('Nama tingkat jabatan wajib diisi.')
      return
    }

    setSavingTier(true)
    try {
      if (editingTierId) {
        const res = await updateStrukturTierAction(editingTierId, {
          nama: tierNama,
          deskripsi: tierDeskripsi,
          layoutStyle: tierLayoutStyle,
          urutan: Number(tierUrutan),
        })
        if (res.success) {
          toast.success('Tingkat jabatan berhasil diperbarui!')
          setTierDialogOpen(false)
          loadScopeData()
        } else {
          toast.error(res.error || 'Gagal memperbarui tingkat.')
        }
      } else {
        const res = await createStrukturTierAction({
          lingkup: currentScopeType,
          kategorialId: currentKategorialId,
          nama: tierNama,
          deskripsi: tierDeskripsi,
          layoutStyle: tierLayoutStyle,
          urutan: Number(tierUrutan),
        })
        if (res.success) {
          toast.success('Tingkat jabatan baru berhasil ditambahkan!')
          setTierDialogOpen(false)
          loadScopeData()
        } else {
          toast.error(res.error || 'Gagal menambahkan tingkat.')
        }
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan tingkat.')
    } finally {
      setSavingTier(false)
    }
  }

  const handleDeleteTier = async (target: string | StrukturTierDTO, targetName?: string) => {
    const id = typeof target === 'string' ? target : target.id
    const name = typeof target === 'string' ? (targetName || 'Tingkat ini') : target.nama
    if (!confirm(`Hapus tingkat "${name}"? Pengurus di dalam tingkat ini akan tetap ada dan menjadi belum berkategori tingkat.`)) {
      return
    }
    const res = await deleteStrukturTierAction(id)
    if (res.success) {
      toast.success('Tingkat berhasil dihapus.')
      loadScopeData()
    } else {
      toast.error(res.error || 'Gagal menghapus tingkat.')
    }
  }

  // ── HANDLERS: KATEGORIAL PROFILE ──
  const handleSaveKatProfile = async () => {
    if (!currentKategorialId) return
    setSavingKatProfile(true)
    try {
      const res = await updateProfilKategorialAction(currentKategorialId, {
        slogan: katSlogan,
        ayatTema: katAyatTema,
        jadwalIbadah: katJadwal,
        instagramUrl: katInstagram,
        isActivePublik: katActivePublik,
      })
      if (res.success) {
        toast.success('Profil komunitas kategorial berhasil diperbarui!')
        loadKategorials()
      } else {
        toast.error(res.error || 'Gagal memperbarui profil.')
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan profil.')
    } finally {
      setSavingKatProfile(false)
    }
  }

  const currentScopeTitle = isMainScope
    ? 'Kepengurusan Umum Gereja'
    : currentKategorial?.nama || 'Komisi Kategorial'

  return (
    <div className='p-4 sm:p-6 space-y-6 max-w-7xl mx-auto'>
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div>
          <div className='flex items-center gap-2'>
            <Users className='size-5 text-primary' />
            <h1 className='text-lg sm:text-xl font-bold text-foreground'>Manajemen Struktur Organisasi</h1>
          </div>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Kelola tingkatan hierarki dinamis dan susunan pengurus untuk kepengurusan umum maupun per komisi kategorial.
          </p>
        </div>

        <div className='flex items-center gap-2.5 flex-wrap'>
          <Link
            href={isMainScope ? '/struktur-organisasi' : `/struktur-organisasi/${currentKategorial?.slug || ''}`}
            target='_blank'
          >
            <Button variant='outline' size='sm' className='h-9 text-xs gap-1.5 shadow-xs'>
              <ExternalLink className='size-3.5' /> Lihat Halaman Publik
            </Button>
          </Link>
          <Button onClick={handleOpenCreatePengurus} size='sm' className='h-9 text-xs gap-1.5 font-semibold shadow-xs'>
            <Plus className='size-3.5' /> Tambah Pengurus
          </Button>
        </div>
      </div>

      {/* ── SCOPE SELECTOR (UMUM VS KATEGORIAL) ───────────────────── */}
      <Card className='bg-muted/30 border shadow-2xs'>
        <CardContent className='p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0'>
              {isMainScope ? (
                <ShieldCheck className='size-5' />
              ) : currentKategorial?.slug === 'youth' ? (
                <Flame className='size-5 text-amber-500' />
              ) : (
                <Users className='size-5 text-primary' />
              )}
            </div>
            <div>
              <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono'>
                Wadah / Lingkup Kepengurusan Aktif:
              </div>
              <div className='text-sm sm:text-base font-bold text-foreground'>
                {currentScopeTitle}
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Label className='text-xs text-muted-foreground whitespace-nowrap hidden sm:inline'>Pilih Lingkup:</Label>
            <Select value={selectedScope} onValueChange={setSelectedScope}>
              <SelectTrigger className='w-full sm:w-64 text-xs h-9 bg-background'>
                <SelectValue placeholder='Pilih Lingkup' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='UTAMA' className='text-xs font-semibold'>
                  Kepengurusan Umum / BPH (Umum)
                </SelectItem>
                {kategorialList
                  .filter((kat) => kat.slug !== 'umum' && kat.nama.toLowerCase() !== 'umum')
                  .map((kat) => (
                    <SelectItem key={kat.id} value={kat.id} className='text-xs'>
                      {kat.nama}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── VISUAL WORKFLOW GUIDE BANNER ─────────────────────────── */}
      <div className='p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs'>
        <div className='flex items-center gap-3'>
          <div className='size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold'>
            <Sparkles className='size-4 text-primary' />
          </div>
          <div>
            <span className='font-bold text-foreground'>Alur Pengaturan Struktur Organisasi:</span>
            <div className='text-muted-foreground text-[11px] mt-0.5 flex flex-wrap items-center gap-x-2'>
              <span>Langkah 1: Buat atau atur nama tingkat di tab <strong>Tingkatan Jabatan</strong></span>
              <span>→</span>
              <span>Langkah 2: Masukkan pejabat dan jabatannya di tab <strong>Daftar Pejabat</strong></span>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2 shrink-0'>
          <Button
            size='sm'
            variant='outline'
            onClick={handleOpenCreateTier}
            className='h-7 text-[11px] bg-background gap-1'
          >
            <Plus className='size-3' /> Buat Tingkat
          </Button>
          <Button
            size='sm'
            onClick={handleOpenCreatePengurus}
            className='h-7 text-[11px] font-semibold gap-1 shadow-2xs'
          >
            <Plus className='size-3' /> Tambah Pengurus
          </Button>
        </div>
      </div>

      {/* ── NAVIGATION TABS: PEJABAT, TIERS, PROFIL ─────────────────── */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className='space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-1'>
          <TabsList className='h-9 p-1'>
            <TabsTrigger value='pejabat' className='text-xs gap-1.5'>
              <Users className='size-3.5' /> Daftar Pejabat ({pengurusList.length})
            </TabsTrigger>
            <TabsTrigger value='tiers' className='text-xs gap-1.5'>
              <Layers className='size-3.5' /> Tingkatan Jabatan ({tierList.length})
            </TabsTrigger>
            {!isMainScope && (
              <TabsTrigger value='profil' className='text-xs gap-1.5'>
                <Settings className='size-3.5' /> Profil Komunitas
              </TabsTrigger>
            )}
          </TabsList>

          {activeTab === 'pejabat' && (
            <div className='relative w-full sm:w-72'>
              <Search className='absolute left-2.5 top-2.5 size-3.5 text-muted-foreground' />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Cari nama atau jabatan...'
                className='pl-8 text-xs h-8 bg-background'
              />
            </div>
          )}

          {activeTab === 'tiers' && (
            <Button onClick={handleOpenCreateTier} size='sm' variant='outline' className='h-8 text-xs gap-1.5 self-start'>
              <Plus className='size-3.5' /> Tambah Tingkat Baru
            </Button>
          )}
        </div>

        {/* ── TAB CONTENT 1: DAFTAR PEJABAT PENGURUS ───────────────── */}
        <TabsContent value='pejabat' className='space-y-4 pt-1'>
          <Card className='shadow-xs overflow-hidden'>
            <CardContent className='p-0'>
              {loading ? (
                <div className='py-20 flex items-center justify-center gap-2 text-xs text-muted-foreground'>
                  <Loader2 className='size-4 animate-spin text-primary' /> Memuat daftar pengurus...
                </div>
              ) : pengurusList.length === 0 ? (
                <div className='py-20 text-center space-y-2 text-xs text-muted-foreground'>
                  <Users className='size-8 mx-auto text-muted-foreground/40' />
                  <p>Belum ada pengurus di lingkup ini.</p>
                  <Button variant='ghost' size='sm' onClick={handleOpenCreatePengurus} className='text-xs'>
                    Tambah Pengurus Pertama
                  </Button>
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader className='bg-muted/30 border-b'>
                      <TableRow className='text-[11px] font-semibold text-muted-foreground'>
                        <TableHead>Pejabat & Jabatan</TableHead>
                        <TableHead className='w-56'>Tingkat Hierarki</TableHead>
                        <TableHead className='text-center w-28'>Status Publik</TableHead>
                        <TableHead className='text-right w-20'>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className='divide-y text-xs'>
                      {pengurusList.map((p) => (
                        <TableRow key={p.id} className='hover:bg-muted/30 transition-colors'>
                          {/* Pejabat, Foto, Urutan & Jabatan */}
                          <TableCell className='py-3'>
                            <div className='flex items-center gap-3'>
                              <div className='relative size-10 rounded-lg border bg-muted overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs shadow-2xs'>
                                {p.fotoPublikUrl ? (
                                  <img src={p.fotoPublikUrl} alt={p.nama} className='w-full h-full object-cover object-top' />
                                ) : (
                                  <span className='text-primary'>{p.nama.slice(0, 2).toUpperCase()}</span>
                                )}
                                <span className='absolute bottom-0 right-0 bg-background/90 text-foreground font-mono text-[9px] px-1 rounded-tl border-t border-l font-bold'>
                                  #{p.urutan}
                                </span>
                              </div>
                              <div className='space-y-0.5'>
                                <div className='font-bold text-foreground text-sm leading-tight'>
                                  {p.namaLengkapTampil}
                                </div>
                                <div className='flex items-center gap-2 text-xs'>
                                  <span className='font-medium text-primary'>{p.jabatan}</span>
                                  {(p.periodeAwal || p.periodeAkhir) && (
                                    <>
                                      <span className='text-muted-foreground/40'>•</span>
                                      <span className='text-[10.5px] text-muted-foreground font-mono'>
                                        {p.periodeAwal || ''} {p.periodeAkhir ? `- ${p.periodeAkhir}` : ''}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Tingkat Hierarki */}
                          <TableCell>
                            <Badge variant='outline' className='text-[11px] font-medium py-0.5 border-primary/25 bg-primary/5 text-primary'>
                              {p.tierNama || 'Tingkat Standar'}
                            </Badge>
                          </TableCell>

                          {/* Status Publik */}
                          <TableCell className='text-center'>
                            {p.isActivePublik ? (
                              <span className='inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400'>
                                <CheckCircle2 className='size-3.5' /> Tampil
                              </span>
                            ) : (
                              <span className='inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/60'>
                                <XCircle className='size-3.5' /> Sembunyi
                              </span>
                            )}
                          </TableCell>

                          {/* Aksi */}
                          <TableCell className='text-right'>
                            <div className='flex items-center justify-end gap-1'>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => handleOpenEditPengurus(p)}
                                className='h-8 w-8 p-0 text-muted-foreground hover:text-foreground'
                                title='Edit Pengurus'
                              >
                                <Edit className='size-3.5' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => handleDeletePengurus(p.id, p.namaLengkapTampil)}
                                className='h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                title='Hapus Pengurus'
                              >
                                <Trash2 className='size-3.5' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB CONTENT 2: MANAJEMEN TINGKAT JABATAN (TIERS) ─────── */}
        <TabsContent value='tiers' className='space-y-4 pt-1'>
          <Card className='shadow-xs'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-bold flex items-center gap-2'>
                <Layers className='size-4 text-primary' /> Daftar Tingkat Hierarki Jabatan
              </CardTitle>
              <CardDescription className='text-xs'>
                Tingkat hierarki mengatur urutan vertikal dan gaya kartu di website publik. Anda bebas menambah atau mengubah nama tingkat sesuai struktur kepengurusan.
              </CardDescription>
            </CardHeader>
            <CardContent className='p-0'>
              {tierList.length === 0 ? (
                <div className='py-16 text-center text-xs text-muted-foreground space-y-2'>
                  <Layers className='size-8 mx-auto text-muted-foreground/30' />
                  <p>Belum ada tingkat jabatan yang dibuat pada lingkup ini.</p>
                  <Button variant='ghost' size='sm' onClick={handleOpenCreateTier} className='text-xs'>
                    Buat Tingkat Pertama
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader className='bg-muted/30 border-b'>
                    <TableRow className='text-[11px] font-semibold text-muted-foreground'>
                      <TableHead>Tingkat Hierarki & Tanggung Jawab</TableHead>
                      <TableHead className='w-48 text-center'>Format Kartu Publik</TableHead>
                      <TableHead className='w-24 text-center'>Pejabat</TableHead>
                      <TableHead className='text-right w-20'>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className='divide-y text-xs'>
                    {tierList.map((t) => (
                      <TableRow key={t.id} className='hover:bg-muted/30 transition-colors'>
                        {/* Tingkat & Tanggung Jawab */}
                        <TableCell className='py-3'>
                          <div className='flex items-start gap-3'>
                            <div className='font-mono font-bold text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md shrink-0'>
                              #{t.urutan}
                            </div>
                            <div className='space-y-0.5 min-w-0'>
                              <div className='font-bold text-foreground text-sm leading-tight'>
                                {t.nama}
                              </div>
                              {t.deskripsi && (
                                <p className='text-[11.5px] text-muted-foreground line-clamp-2 leading-relaxed'>
                                  {t.deskripsi}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Format Kartu Publik */}
                        <TableCell className='text-center'>
                          <Badge
                            variant={t.layoutStyle === 'FEATURED' ? 'default' : 'outline'}
                            className={`text-[10.5px] ${
                              t.layoutStyle === 'FEATURED'
                                ? 'bg-primary text-primary-foreground'
                                : 'border-border text-muted-foreground'
                            }`}
                          >
                            {t.layoutStyle === 'FEATURED' ? 'Kartu Besar (Featured)' : 'Grid Standar'}
                          </Badge>
                        </TableCell>

                        {/* Jumlah Pejabat */}
                        <TableCell className='text-center font-mono text-[11px] text-muted-foreground'>
                          {t.jumlahPengurus || 0} orang
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className='text-right'>
                          <div className='flex items-center justify-end gap-1'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleOpenEditTier(t)}
                              className='h-8 w-8 p-0 text-muted-foreground hover:text-foreground'
                              title='Edit Tingkat'
                            >
                              <Edit className='size-3.5' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleDeleteTier(t.id, t.nama)}
                              className='h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              title='Hapus Tingkat'
                            >
                              <Trash2 className='size-3.5' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB CONTENT 3: PROFIL KOMUNITAS KATEGORIAL ────────────── */}
        {!isMainScope && (
          <TabsContent value='profil' className='space-y-4 pt-1'>
            <Card className='shadow-xs max-w-3xl'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-bold flex items-center gap-2'>
                  <Settings className='size-4 text-primary' /> Pengaturan Identitas Komunitas ({currentKategorial?.nama})
                </CardTitle>
                <CardDescription className='text-xs'>
                  Informasi ini ditampilkan secara eksklusif pada halaman publik mandiri komisi ini (misal: <code>/struktur-organisasi/{currentKategorial?.slug}</code>).
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 text-xs'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Slogan / Motto Komunitas</Label>
                    <Input
                      value={katSlogan}
                      onChange={(e) => setKatSlogan(e.target.value)}
                      placeholder='Contoh: Generasi Terang Pembawa Dampak'
                      className='text-xs h-9'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Ayat Tema / Visi</Label>
                    <Input
                      value={katAyatTema}
                      onChange={(e) => setKatAyatTema(e.target.value)}
                      placeholder='Contoh: 1 Timotius 4:12'
                      className='text-xs h-9'
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Jadwal Ibadah / Kumpul</Label>
                    <Input
                      value={katJadwal}
                      onChange={(e) => setKatJadwal(e.target.value)}
                      placeholder='Contoh: Setiap Sabtu, 17:00 WIB'
                      className='text-xs h-9'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Instagram Komunitas</Label>
                    <Input
                      value={katInstagram}
                      onChange={(e) => setKatInstagram(e.target.value)}
                      placeholder='Contoh: @getsemaniyouth'
                      className='text-xs h-9'
                    />
                  </div>
                </div>

                <div className='flex items-center justify-between p-3 rounded-lg bg-muted/40 border'>
                  <div className='space-y-0.5'>
                    <div className='font-semibold text-xs text-foreground'>Publikasikan Komisi di Website</div>
                    <div className='text-[10px] text-muted-foreground'>
                      Jika aktif, komisi ini akan muncul di katalog dan halaman khusus komisi dapat diakses publik.
                    </div>
                  </div>
                  <Switch checked={katActivePublik} onCheckedChange={setKatActivePublik} />
                </div>

                <div className='pt-2 flex justify-end'>
                  <Button onClick={handleSaveKatProfile} disabled={savingKatProfile} size='sm' className='text-xs font-semibold gap-1.5 shadow-xs'>
                    {savingKatProfile ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
                    Simpan Profil Komunitas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── MODAL: TAMBAH / EDIT PEJABAT PENGURUS (CLEAN & SPACIOUS) ─── */}
      <Dialog open={pengurusDialogOpen} onOpenChange={setPengurusDialogOpen}>
        <DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6'>
          <DialogHeader className='border-b pb-3.5'>
            <div className='flex items-center gap-3'>
              <div className='size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0'>
                <User className='size-5' />
              </div>
              <div>
                <DialogTitle className='text-base font-bold text-foreground'>
                  {editingPengurusId ? 'Edit Pejabat Pengurus' : 'Tambah Pejabat Pengurus'}
                </DialogTitle>
                <DialogDescription className='text-xs mt-0.5'>
                  Wadah Pelayanan: <strong className='text-foreground'>{currentScopeTitle}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='space-y-5 py-3 text-xs'>
            {/* ── BAGIAN 1: IDENTITAS MASTER JEMAAT ──────────────── */}
            <div className='space-y-3 p-4 rounded-xl border bg-muted/20'>
              <div className='font-bold text-xs text-foreground uppercase tracking-wider text-[11px] text-muted-foreground'>
                1. Identitas Personil
              </div>

              {/* Master Jemaat Picker */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>
                  Pilih Dari Master Data Jemaat <span className='text-rose-500'>*</span>
                </Label>

                {jemaatId ? (
                  <div className='p-3 rounded-lg border bg-background flex items-center justify-between shadow-2xs'>
                    <div className='flex items-center gap-3'>
                      <div className='size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-serif shrink-0'>
                        {selectedJemaatName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className='font-bold text-sm text-foreground'>{selectedJemaatName}</div>
                        <div className='text-[10px] text-muted-foreground font-mono'>Master Jemaat Terpilih</div>
                      </div>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setJemaatId('')
                        setSelectedJemaatName('')
                        setJemaatSearch('')
                      }}
                      className='h-7 text-xs px-2.5 hover:text-rose-600'
                    >
                      Ganti Jemaat
                    </Button>
                  </div>
                ) : (
                  <div className='space-y-1.5 relative'>
                    <div className='relative'>
                      <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
                      <Input
                        value={jemaatSearch}
                        onChange={(e) => setJemaatSearch(e.target.value)}
                        placeholder='Ketik nama jemaat atau NIJ untuk mencari...'
                        className='text-xs h-9 pl-8 bg-background'
                        autoFocus={!editingPengurusId}
                      />
                    </div>
                    {searchingJemaat && (
                      <div className='text-[10px] text-muted-foreground flex items-center gap-1.5 py-1'>
                        <Loader2 className='size-3 animate-spin text-primary' /> Mencari di master data...
                      </div>
                    )}
                    {jemaatOptions.length > 0 && (
                      <div className='max-h-48 overflow-y-auto border rounded-lg divide-y bg-popover shadow-lg absolute top-full left-0 right-0 z-50 mt-1'>
                        {jemaatOptions.map((jm) => (
                          <div
                            key={jm.id}
                            onClick={() => {
                              setJemaatId(jm.id)
                              setSelectedJemaatName(jm.nama)
                              setJemaatSearch(jm.nama)
                              setJemaatOptions([])
                            }}
                            className='p-2.5 hover:bg-muted/60 cursor-pointer flex items-center justify-between text-xs transition-colors'
                          >
                            <div className='font-semibold text-foreground'>{jm.nama}</div>
                            <Badge variant='outline' className='text-[10px] font-mono'>
                              {jm.nij || 'Tanpa NIJ'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Nama Override & Gelar */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Nama Tampil Khusus</Label>
                  <Input
                    value={namaOverride}
                    onChange={(e) => setNamaOverride(e.target.value)}
                    placeholder='Kosongkan jika sama dengan jemaat'
                    className='text-xs h-9 bg-background'
                  />
                  <p className='text-[10px] text-muted-foreground'>Jika nama panggilan berbeda dari KTP.</p>
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Gelar Akademik / Teologi</Label>
                  <Input
                    value={gelar}
                    onChange={(e) => setGelar(e.target.value)}
                    placeholder='Contoh: M.Th, S.Kom, B.A'
                    className='text-xs h-9 bg-background'
                  />
                  <p className='text-[10px] text-muted-foreground'>Ditampilkan di belakang nama.</p>
                </div>
              </div>
            </div>

            {/* ── BAGIAN 2: PENEMPATAN & JABATAN ────────────────── */}
            <div className='space-y-3 p-4 rounded-xl border bg-muted/20'>
              <div className='font-bold text-xs text-foreground uppercase tracking-wider text-[11px] text-muted-foreground'>
                2. Jabatan & Tingkat Hierarki
              </div>

              {/* Jabatan Pelayanan */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>
                  Nama Jabatan Pelayanan <span className='text-rose-500'>*</span>
                </Label>
                <Input
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder='Contoh: Gembala Sidang, Ketua Pemuda, Bendahara, Koordinator Musik'
                  className='text-xs h-9 bg-background'
                />
              </div>

              {/* Tingkat Hierarki */}
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>
                    Tingkat Hierarki (Section Website) <span className='text-rose-500'>*</span>
                  </Label>
                  <button
                    type='button'
                    onClick={() => handleOpenCreateTier()}
                    className='text-[11px] text-primary hover:underline font-semibold flex items-center gap-1'
                  >
                    <Plus className='size-3' /> Buat Tingkat Baru
                  </button>
                </div>
                <Select value={tierId} onValueChange={setTierId}>
                  <SelectTrigger className='text-xs h-9 bg-background'>
                    <SelectValue placeholder='Pilih Tingkat Jabatan' />
                  </SelectTrigger>
                  <SelectContent>
                    {tierList.map((t) => (
                      <SelectItem key={t.id} value={t.id} className='text-xs'>
                        Tingkat #{t.urutan} — {t.nama} ({t.layoutStyle === 'FEATURED' ? 'Kartu Besar' : 'Grid'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className='text-[10px] text-muted-foreground'>
                  Menentukan di section mana pejabat ini akan dikelompokkan di website publik.
                </p>
              </div>

              {/* Urutan & Periode */}
              <div className='grid grid-cols-3 gap-3 pt-1'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Urutan Tampil</Label>
                  <Input
                    type='number'
                    value={urutan}
                    onChange={(e) => setUrutan(Number(e.target.value))}
                    placeholder='1'
                    className='text-xs h-9 font-mono bg-background'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Tahun Mulai</Label>
                  <Input
                    type='number'
                    value={periodeAwal || ''}
                    onChange={(e) => setPeriodeAwal(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder='2024'
                    className='text-xs h-9 font-mono bg-background'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Tahun Selesai</Label>
                  <Input
                    type='number'
                    value={periodeAkhir || ''}
                    onChange={(e) => setPeriodeAkhir(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder='2026'
                    className='text-xs h-9 font-mono bg-background'
                  />
                </div>
              </div>
            </div>

            {/* ── BAGIAN 3: MEDIA & PROFIL PUBLIK ───────────────── */}
            <div className='space-y-3.5 p-4 rounded-xl border bg-muted/20'>
              <div className='font-bold text-xs text-foreground uppercase tracking-wider text-[11px] text-muted-foreground'>
                3. Foto & Tampilan Publik
              </div>

              {/* Panduan Ukuran & Format Foto */}
              <div className='p-3 rounded-lg bg-background border text-xs space-y-1.5 text-muted-foreground'>
                <div className='font-semibold text-foreground flex items-center gap-1.5 text-[11px]'>
                  <Sparkles className='size-3.5 text-primary shrink-0' /> Panduan Ukuran & Tampilan Foto
                </div>
                <ul className='space-y-1 text-[11px] list-disc list-inside leading-relaxed'>
                  <li><span className='font-medium text-foreground'>Rasio Ideal:</span> 1:1 (Persegi) atau 3:4 (Potret Resmi).</li>
                  <li><span className='font-medium text-foreground'>Ukuran Rekomendasi:</span> 800 × 800 px (min. 400 × 400 px, maks. 10 MB).</li>
                  <li><span className='font-medium text-foreground'>Auto-Resize Responsif:</span> Foto otomatis menyesuaikan layar HP, tablet, dan PC secara proporsional.</li>
                  <li><span className='font-medium text-foreground'>Tips:</span> Gunakan pakaian formal/jas dan manfaatkan tombol <em>AI Hapus Background</em> bila perlu.</li>
                </ul>
              </div>

              {/* Foto Upload Field */}
              <ImageUploadField
                label='Unggah Foto Resmi Publik'
                description='Pilih berkas foto formal dari perangkat Anda (PNG, JPG, WEBP).'
                value={fotoPublikUrl}
                onChange={(newUrl) => setFotoPublikUrl(newUrl || '')}
                enableBgRemoval={true}
                aspect='square'
              />

              {/* Bio Singkat */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Kutipan Visi / Bio Pelayanan Singkat</Label>
                <Textarea
                  value={bioRingkas}
                  onChange={(e) => setBioRingkas(e.target.value)}
                  placeholder='Contoh: Menggembalakan generasi dengan kasih dan integritas firman...'
                  rows={2}
                  className='text-xs leading-relaxed bg-background'
                />
              </div>

              {/* Switch Publik */}
              <div className='flex items-center justify-between p-3 rounded-lg bg-background border mt-1'>
                <div className='space-y-0.5'>
                  <div className='font-semibold text-xs text-foreground'>Tampilkan di Website Publik</div>
                  <div className='text-[10px] text-muted-foreground'>
                    Nonaktifkan jika profil ini sementara ingin disembunyikan dari publik.
                  </div>
                </div>
                <Switch checked={isActivePublik} onCheckedChange={setIsActivePublik} />
              </div>
            </div>
          </div>

          <DialogFooter className='border-t pt-3.5 gap-2'>
            <Button variant='outline' size='sm' onClick={() => setPengurusDialogOpen(false)} className='text-xs h-9 px-4'>
              Batal
            </Button>
            <Button
              onClick={handleSavePengurus}
              disabled={savingPengurus}
              size='sm'
              className='text-xs h-9 px-5 font-semibold gap-1.5 shadow-xs'
            >
              {savingPengurus ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
              {editingPengurusId ? 'Simpan Perubahan' : 'Simpan Pengurus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: TAMBAH / EDIT TINGKATAN (TIER) ─────────────────── */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold'>
              {editingTierId ? 'Edit Tingkat Hierarki' : `Tambah Tingkat Baru — ${currentScopeTitle}`}
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tentukan nama, nomor urutan, dan format tampilan untuk bagian tingkat ini.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2 text-xs'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                Nama Tingkat Hierarki <span className='text-rose-500'>*</span>
              </Label>
              <Input
                value={tierNama}
                onChange={(e) => setTierNama(e.target.value)}
                placeholder='Contoh: Dewan Gembala, BPH, Core Team Youth'
                className='text-xs h-9'
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Deskripsi Tanggung Jawab (Opsional)</Label>
              <Textarea
                value={tierDeskripsi}
                onChange={(e) => setTierDeskripsi(e.target.value)}
                placeholder='Keterangan singkat mengenai peran tingkat pelayanan ini...'
                rows={2}
                className='text-xs leading-relaxed'
              />
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nomor Urut Tingkat</Label>
                <Input
                  type='number'
                  value={tierUrutan}
                  onChange={(e) => setTierUrutan(Number(e.target.value))}
                  placeholder='1'
                  className='text-xs h-9 font-mono'
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Gaya Tampilan Kartu</Label>
                <Select value={tierLayoutStyle} onValueChange={(val: any) => setTierLayoutStyle(val)}>
                  <SelectTrigger className='text-xs h-9'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='GRID' className='text-xs'>Grid Kartu Standar (3-4 Kolom)</SelectItem>
                    <SelectItem value='FEATURED' className='text-xs'>Kartu Besar (Featured Portret)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' size='sm' onClick={() => setTierDialogOpen(false)} className='text-xs h-8'>
              Batal
            </Button>
            <Button onClick={handleSaveTier} disabled={savingTier} size='sm' className='text-xs h-8 font-semibold shadow-xs'>
              {savingTier ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
              Simpan Tingkat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
