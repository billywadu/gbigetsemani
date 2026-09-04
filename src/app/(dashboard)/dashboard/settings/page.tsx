'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Settings2,
  Building2,
  Printer,
  Globe,
  Sliders,
  Users,
  Upload,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  Loader2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  QrCode,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  FileText,
  Lock,
  Phone,
  Mail,
  MapPin,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  getAppProfileAction,
  updateAppProfileAction,
  resetAppProfileAction,
} from '@/actions/app-profile'
import {
  getAppSystemConfigAction,
  updateAppSystemConfigAction,
  resetAppSystemConfigAction,
} from '@/actions/app-system'
import {
  getWhatsAppTemplatesAction,
  updateWhatsAppTemplatesAction,
  resetWhatsAppTemplatesAction,
} from '@/actions/whatsapp-template'
import { AppProfileConfig, DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'
import { AppSystemConfig, DEFAULT_APP_SYSTEM_CONFIG } from '@/lib/validations/app-system'
import {
  WhatsAppTemplatesConfig,
  DEFAULT_WHATSAPP_TEMPLATES_CONFIG,
  WHATSAPP_TEMPLATES_METADATA,
  WhatsAppTemplateKey,
} from '@/lib/validations/whatsapp-template'
import { formatWhatsAppMessage } from '@/lib/whatsapp-helpers'
import { toast } from 'sonner'
import { MessageSquare, Send, Smartphone, Copy, Check } from 'lucide-react'

export default function UnifiedSettingsPage() {
  const [activeTab, setActiveTab] = useState('profil')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSystem, setSavingSystem] = useState(false)
  const [savingWhatsApp, setSavingWhatsApp] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<'profile' | 'system' | 'whatsapp'>('profile')

  // Profile Config States
  const [profileConfig, setProfileConfig] = useState<AppProfileConfig>(DEFAULT_APP_PROFILE_CONFIG)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const faviconInputRef = useRef<HTMLInputElement | null>(null)

  // System Config States
  const [systemConfig, setSystemConfig] = useState<AppSystemConfig>(DEFAULT_APP_SYSTEM_CONFIG)

  // WhatsApp Templates States
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppTemplatesConfig>(DEFAULT_WHATSAPP_TEMPLATES_CONFIG)
  const [selectedWaKey, setSelectedWaKey] = useState<WhatsAppTemplateKey>('ULTAH_JEMAAT')
  const [copiedTag, setCopiedTag] = useState<string | null>(null)

  // Load Configurations
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [profileRes, systemRes, whatsappRes] = await Promise.all([
        getAppProfileAction(),
        getAppSystemConfigAction(),
        getWhatsAppTemplatesAction(),
      ])

      if (profileRes.success && profileRes.data) {
        setProfileConfig(profileRes.data)
        setLogoPreview(profileRes.data.logoUrl)
        setFaviconPreview(profileRes.data.faviconUrl)
      }

      if (systemRes.success && systemRes.data) {
        setSystemConfig(systemRes.data)
      }

      if (whatsappRes.success && whatsappRes.data) {
        setWhatsappConfig(whatsappRes.data)
      }

      setLoading(false)
    }
    loadData()
  }, [])

  // 1. Save Profile Handler
  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const formData = new FormData()
    formData.append('configJson', JSON.stringify(profileConfig))

    if (logoFile) {
      formData.append('logoFile', logoFile)
    }
    if (faviconFile) {
      formData.append('faviconFile', faviconFile)
    }

    const res = await updateAppProfileAction(formData)
    setSavingProfile(false)

    if (res.success && res.data) {
      toast.success(res.message || 'Profil gereja berhasil diperbarui.')
      setProfileConfig(res.data)
      setLogoFile(null)
      setFaviconFile(null)
      if (res.data.logoUrl) setLogoPreview(res.data.logoUrl)
      if (res.data.faviconUrl) setFaviconPreview(res.data.faviconUrl)
    } else {
      toast.error(res.error || 'Gagal menyimpan profil gereja.')
    }
  }

  // 2. Save System Config Handler
  const handleSaveSystem = async () => {
    setSavingSystem(true)
    const res = await updateAppSystemConfigAction(systemConfig)
    setSavingSystem(false)

    if (res.success && res.data) {
      toast.success(res.message || 'Pengaturan sistem berhasil disimpan.')
      setSystemConfig(res.data)
    } else {
      toast.error(res.error || 'Gagal menyimpan pengaturan sistem.')
    }
  }

  // 3. Save WhatsApp Templates Handler
  const handleSaveWhatsApp = async () => {
    setSavingWhatsApp(true)
    const res = await updateWhatsAppTemplatesAction(whatsappConfig)
    setSavingWhatsApp(false)

    if (res.success && res.data) {
      toast.success(res.message || 'Template pesan WhatsApp berhasil disimpan.')
      setWhatsappConfig(res.data)
    } else {
      toast.error(res.error || 'Gagal menyimpan template WhatsApp.')
    }
  }

  // 4. Reset Single Template Handler
  const handleResetSingleTemplate = (key: WhatsAppTemplateKey) => {
    const meta = WHATSAPP_TEMPLATES_METADATA.find((m) => m.key === key)
    if (meta) {
      setWhatsappConfig((prev) => ({
        ...prev,
        [key]: meta.defaultText,
      }))
      toast.info(`Template "${meta.title}" dikembalikan ke narasi standar. Silakan klik Simpan Template.`)
    }
  }

  // 5. Insert variable tag into editor
  const handleInsertTag = (tag: string) => {
    setWhatsappConfig((prev) => ({
      ...prev,
      [selectedWaKey]: (prev[selectedWaKey] || '') + ' ' + tag,
    }))
    setCopiedTag(tag)
    setTimeout(() => setCopiedTag(null), 1500)
    toast.success(`Variabel ${tag} disisipkan ke pesan.`)
  }

  // 6. Reset Handler
  const handleConfirmReset = async () => {
    if (resetTarget === 'profile') {
      const res = await resetAppProfileAction()
      if (res.success) {
        toast.success('Profil aplikasi direset ke standar.')
        setProfileConfig(DEFAULT_APP_PROFILE_CONFIG)
        setLogoFile(null)
        setLogoPreview(null)
        setFaviconFile(null)
        setFaviconPreview(null)
      } else {
        toast.error(res.error || 'Gagal mereset profil aplikasi.')
      }
    } else if (resetTarget === 'system') {
      const res = await resetAppSystemConfigAction()
      if (res.success) {
        toast.success('Pengaturan sistem direset ke standar.')
        setSystemConfig(DEFAULT_APP_SYSTEM_CONFIG)
      } else {
        toast.error(res.error || 'Gagal mereset pengaturan sistem.')
      }
    } else if (resetTarget === 'whatsapp') {
      const res = await resetWhatsAppTemplatesAction()
      if (res.success && res.data) {
        toast.success(res.message || 'Template WhatsApp direset ke standar.')
        setWhatsappConfig(res.data)
      } else {
        toast.error(res.error || 'Gagal mereset template WhatsApp.')
      }
    }
    setResetDialogOpen(false)
  }

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] gap-3'>
        <Loader2 className='size-8 animate-spin text-primary' />
        <p className='text-sm text-muted-foreground'>Memuat konfigurasi aplikasi dari database...</p>
      </div>
    )
  }

  return (
    <div className='space-y-6 max-w-7xl mx-auto pb-16'>
      {/* Page Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div className='flex items-start sm:items-center gap-3'>
          <div className='p-2 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5 sm:mt-0'>
            <Settings2 className='size-5' />
          </div>
          <div>
            <div className='flex items-center gap-2 flex-wrap'>
              <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Pengaturan</h1>
              <Badge variant='outline' className='text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200'>
                Super Admin
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Pusat kendali profil gereja dan preferensi sistem.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className='flex items-center gap-2 w-full sm:w-auto'>
          {activeTab === 'profil' && (
            <>
              <Button
                variant='outline'
                size='sm'
                className='flex-1 sm:flex-initial h-9 sm:h-8 text-xs text-muted-foreground gap-1.5'
                onClick={() => {
                  setResetTarget('profile')
                  setResetDialogOpen(true)
                }}
              >
                <RotateCcw className='size-3.5' /> Reset Profil
              </Button>
              <Button
                size='sm'
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className='flex-1 sm:flex-initial h-9 sm:h-8 text-xs gap-1.5 shadow-xs'
              >
                {savingProfile ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
                {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
              </Button>
            </>
          )}

          {activeTab === 'sistem' && (
            <>
              <Button
                variant='outline'
                size='sm'
                className='flex-1 sm:flex-initial h-9 sm:h-8 text-xs text-muted-foreground gap-1.5'
                onClick={() => {
                  setResetTarget('system')
                  setResetDialogOpen(true)
                }}
              >
                <RotateCcw className='size-3.5' /> Reset Sistem
              </Button>
              <Button
                size='sm'
                onClick={handleSaveSystem}
                disabled={savingSystem}
                className='flex-1 sm:flex-initial h-9 sm:h-8 text-xs gap-1.5 shadow-xs'
              >
                {savingSystem ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
                {savingSystem ? 'Menyimpan...' : 'Simpan Sistem'}
              </Button>
            </>
          )}

          {activeTab === 'whatsapp' && (
            <>
              <Button
                variant='outline'
                size='sm'
                className='flex-1 sm:flex-initial h-9 sm:h-8 text-xs text-muted-foreground gap-1.5'
                onClick={() => {
                  setResetTarget('whatsapp')
                  setResetDialogOpen(true)
                }}
              >
                <RotateCcw className='size-3.5' /> Reset Semua Template
              </Button>
              <Button
                size='sm'
                onClick={handleSaveWhatsApp}
                disabled={savingWhatsApp}
                className='flex-1 sm:flex-initial h-9 sm:h-8 text-xs gap-1.5 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white'
              >
                {savingWhatsApp ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
                {savingWhatsApp ? 'Menyimpan...' : 'Simpan Template'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
        <TabsList className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 w-full h-auto p-1 bg-muted/70 gap-1'>
          <TabsTrigger value='profil' className='text-xs py-2 gap-1.5 data-[state=active]:font-bold'>
            <Building2 className='size-4 text-primary' />
            <span>Profil Gereja</span>
          </TabsTrigger>
          <TabsTrigger value='cetak' className='text-xs py-2 gap-1.5 data-[state=active]:font-bold'>
            <Printer className='size-4 text-indigo-500' />
            <span>Cetak & Dokumen</span>
          </TabsTrigger>
          <TabsTrigger value='landing' className='text-xs py-2 gap-1.5 data-[state=active]:font-bold'>
            <Globe className='size-4 text-emerald-500' />
            <span>Landing Page</span>
          </TabsTrigger>
          <TabsTrigger value='sistem' className='text-xs py-2 gap-1.5 data-[state=active]:font-bold'>
            <Sliders className='size-4 text-amber-500' />
            <span>Sistem & Preferensi</span>
          </TabsTrigger>
          <TabsTrigger value='whatsapp' className='text-xs py-2 gap-1.5 data-[state=active]:font-bold'>
            <MessageSquare className='size-4 text-emerald-600' />
            <span>Pesan WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value='users' className='text-xs py-2 gap-1.5 data-[state=active]:font-bold'>
            <Users className='size-4 text-rose-500' />
            <span>Hak Akses User</span>
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: PROFIL GEREJA (SINGLE SOURCE OF TRUTH) */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value='profil' className='space-y-6 mt-0'>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Left: Branding & Logos */}
            <div className='space-y-6'>
              {/* Logo Card */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <ImageIcon className='size-4 text-primary' /> Logo Utama Gereja
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Tampil pada kop surat resmi, terminal scanner, dan header sistem.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3 text-center'>
                  <div className='border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-35 bg-muted/20 relative group'>
                    {logoPreview ? (
                      <div className='relative'>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoPreview}
                          alt='Logo Gereja'
                          className='max-h-24 max-w-full object-contain mx-auto transition-transform group-hover:scale-105'
                        />
                      </div>
                    ) : (
                      <div className='text-muted-foreground space-y-1'>
                        <Building2 className='size-8 mx-auto opacity-40' />
                        <p className='text-[11px] font-medium'>Belum ada logo terpasang</p>
                      </div>
                    )}
                  </div>

                  <input
                    ref={logoInputRef}
                    type='file'
                    accept='image/png,image/jpeg,image/webp,image/svg+xml'
                    className='hidden'
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        setLogoFile(f)
                        setLogoPreview(URL.createObjectURL(f))
                      }
                    }}
                  />

                  <div className='flex items-center justify-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='text-xs h-8 gap-1.5'
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className='size-3.5' /> {logoPreview ? 'Ganti Logo' : 'Upload Logo'}
                    </Button>
                    {logoPreview && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                        onClick={() => {
                          setLogoFile(null)
                          setLogoPreview(null)
                          setProfileConfig((p) => ({ ...p, logoUrl: null, logoCloudinaryId: null }))
                        }}
                      >
                        <Trash2 className='size-3.5' />
                      </Button>
                    )}
                  </div>
                  <p className='text-[10px] text-muted-foreground'>Format disarankan: PNG transparan (Maks. 5MB)</p>
                </CardContent>
              </Card>

              {/* Favicon Card */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <Globe className='size-4 text-emerald-600' /> Favicon Browser Tab
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Ikon kecil yang tampil pada tab browser dan shortcut web.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3 text-center'>
                  <div className='border-2 border-dashed rounded-lg p-3 flex items-center justify-center min-h-20 bg-muted/20'>
                    {faviconPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={faviconPreview} alt='Favicon' className='size-10 object-contain rounded-md border shadow-xs' />
                    ) : (
                      <div className='text-muted-foreground text-[11px] flex items-center gap-1.5'>
                        <Globe className='size-4 opacity-40' /> Default Favicon
                      </div>
                    )}
                  </div>

                  <input
                    ref={faviconInputRef}
                    type='file'
                    accept='image/png,image/x-icon,image/svg+xml,image/jpeg'
                    className='hidden'
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        setFaviconFile(f)
                        setFaviconPreview(URL.createObjectURL(f))
                      }
                    }}
                  />

                  <div className='flex items-center justify-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='text-xs h-7 gap-1'
                      onClick={() => faviconInputRef.current?.click()}
                    >
                      <Upload className='size-3' /> {faviconPreview ? 'Ganti Favicon' : 'Upload Favicon'}
                    </Button>
                    {faviconPreview && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='text-xs h-7 text-rose-600 px-2'
                        onClick={() => {
                          setFaviconFile(null)
                          setFaviconPreview(null)
                          setProfileConfig((p) => ({ ...p, faviconUrl: null }))
                        }}
                      >
                        <Trash2 className='size-3' />
                      </Button>
                    )}
                  </div>
                  <p className='text-[10px] text-muted-foreground'>Format: PNG / ICO (Rekomendasi rasio 1:1, misal 64x64px)</p>
                </CardContent>
              </Card>

              {/* Sync Alert */}
              <div className='p-3.5 rounded-lg border bg-primary/5 border-primary/20 space-y-1.5 text-xs text-muted-foreground'>
                <div className='flex items-center gap-1.5 text-primary font-semibold'>
                  <Sparkles className='size-3.5' /> Sinkronisasi Otomatis Terpadu
                </div>
                <p className='text-[11px] leading-relaxed'>
                  Perubahan nama gereja, logo, dan kontak di sini akan otomatis disinkronkan ke kop cetak dokumen resmi dan footer landing page publik.
                </p>
              </div>
            </div>

            {/* Right: Church Details Form */}
            <div className='lg:col-span-2 space-y-6'>
              {/* Identitas Dasar */}
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <Tag className='size-4 text-primary' /> Identitas & Penamaan Resmi
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 text-xs'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='namaResmi' className='text-xs font-semibold'>
                      Nama Resmi Gereja (Huruf Kapital Lengkap) <span className='text-rose-500'>*</span>
                    </Label>
                    <Input
                      id='namaResmi'
                      value={profileConfig.namaResmi}
                      onChange={(e) => setProfileConfig((p) => ({ ...p, namaResmi: e.target.value }))}
                      placeholder='Contoh: GEREJA BETH-EL INDONESIA'
                      className='text-xs font-medium'
                    />
                    <p className='text-[11px] text-muted-foreground'>Digunakan pada kop surat cetak dan dokumen legalitas resmi.</p>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-1.5'>
                      <Label htmlFor='namaSingkat' className='text-xs font-semibold'>
                        Nama Singkat / Brand Aplikasi <span className='text-rose-500'>*</span>
                      </Label>
                      <Input
                        id='namaSingkat'
                        value={profileConfig.namaSingkat}
                        onChange={(e) => setProfileConfig((p) => ({ ...p, namaSingkat: e.target.value }))}
                        placeholder='Contoh: GBI Jemaat'
                        className='text-xs'
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <Label htmlFor='akronim' className='text-xs font-semibold'>
                        Singkatan / Akronim <span className='text-rose-500'>*</span>
                      </Label>
                      <Input
                        id='akronim'
                        value={profileConfig.akronim}
                        onChange={(e) => setProfileConfig((p) => ({ ...p, akronim: e.target.value }))}
                        placeholder='Contoh: GBI'
                        className='text-xs font-mono uppercase'
                      />
                    </div>
                  </div>

                  <div className='space-y-1.5'>
                    <Label htmlFor='tagline' className='text-xs font-semibold'>
                      Tagline / Visi Misi Singkat
                    </Label>
                    <Textarea
                      id='tagline'
                      rows={2}
                      value={profileConfig.tagline}
                      onChange={(e) => setProfileConfig((p) => ({ ...p, tagline: e.target.value }))}
                      placeholder='Slogan atau moto pelayanan gereja...'
                      className='text-xs'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label htmlFor='nomorIzin' className='text-xs font-semibold'>
                      Nomor Izin Operasional / Legalitas Sinode
                    </Label>
                    <Input
                      id='nomorIzin'
                      value={profileConfig.nomorIzin}
                      onChange={(e) => setProfileConfig((p) => ({ ...p, nomorIzin: e.target.value }))}
                      placeholder='Contoh: SK Sinode GBI No. 123/GBI/2005 - Kemenag RI No. 45/2010'
                      className='text-xs font-mono'
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Kontak & Lokasi */}
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <MapPin className='size-4 text-emerald-600' /> Alamat & Saluran Komunikasi
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 text-xs'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='alamat' className='text-xs font-semibold'>
                      Alamat Lengkap Gedung Gereja
                    </Label>
                    <Input
                      id='alamat'
                      value={profileConfig.alamat}
                      onChange={(e) => setProfileConfig((p) => ({ ...p, alamat: e.target.value }))}
                      placeholder='Jln. Bagindo Aziz Chan No. 34'
                      className='text-xs'
                    />
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    <div className='space-y-1.5'>
                      <Label htmlFor='kota' className='text-xs font-semibold'>Kota</Label>
                      <Input
                        id='kota'
                        value={profileConfig.kota}
                        onChange={(e) => setProfileConfig((p) => ({ ...p, kota: e.target.value }))}
                        placeholder='Padang'
                        className='text-xs'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label htmlFor='provinsi' className='text-xs font-semibold'>Provinsi</Label>
                      <Input
                        id='provinsi'
                        value={profileConfig.provinsi}
                        onChange={(e) => setProfileConfig((p) => ({ ...p, provinsi: e.target.value }))}
                        placeholder='Sumatera Barat'
                        className='text-xs'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label htmlFor='kodePos' className='text-xs font-semibold'>Kode Pos</Label>
                      <Input
                        id='kodePos'
                        value={profileConfig.kodePos}
                        onChange={(e) => setProfileConfig((p) => ({ ...p, kodePos: e.target.value }))}
                        placeholder='25112'
                        className='text-xs font-mono'
                      />
                    </div>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t'>
                    <div className='space-y-1.5'>
                      <Label htmlFor='telepon' className='text-xs font-semibold flex items-center gap-1'>
                        <Phone className='size-3 text-muted-foreground' /> Telepon Sekretariat
                      </Label>
                      <Input
                        id='telepon'
                        value={profileConfig.telepon}
                        onChange={(e) => setProfileConfig((p) => ({ ...p, telepon: e.target.value }))}
                        placeholder='(0751) 34567'
                        className='text-xs'
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <Label htmlFor='whatsAppCenter' className='text-xs font-semibold flex items-center gap-1'>
                        <Phone className='size-3 text-emerald-600' /> WhatsApp Center Jemaat
                      </Label>
                      <Input
                        id='whatsAppCenter'
                        value={profileConfig.whatsAppCenter}
                        onChange={(e) => setProfileConfig((p) => ({ ...p, whatsAppCenter: e.target.value }))}
                        placeholder='0812-3456-7890'
                        className='text-xs'
                      />
                    </div>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-1.5'>
                      <Label htmlFor='email' className='text-xs font-semibold flex items-center gap-1'>
                        <Mail className='size-3 text-muted-foreground' /> Email Resmi
                      </Label>
                      <Input
                        id='email'
                        type='email'
                        value={profileConfig.email}
                        onChange={(e) => setProfileConfig((p) => ({ ...p, email: e.target.value }))}
                        placeholder='sekretariat@gereja.org'
                        className='text-xs'
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <Label htmlFor='website' className='text-xs font-semibold flex items-center gap-1'>
                        <Globe className='size-3 text-muted-foreground' /> Website
                      </Label>
                      <Input
                        id='website'
                        value={profileConfig.website}
                        onChange={(e) => setProfileConfig((p) => ({ ...p, website: e.target.value }))}
                        placeholder='https://gereja.org'
                        className='text-xs'
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: CETAK & DOKUMEN (INTEGRATED STUDIO SHORTCUT) */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value='cetak' className='space-y-6 mt-0'>
          <Card>
            <CardHeader className='pb-4'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                <div>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Printer className='size-5 text-indigo-600' /> Studio Pengaturan Cetak & PDF
                  </CardTitle>
                  <CardDescription className='text-xs mt-1'>
                    Konfigurasi tanda tangan digital 8 pejabat, stempel gereja, garis kop surat, dan format lembar kerja.
                  </CardDescription>
                </div>
                <Button asChild size='sm' className='gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white'>
                  <Link href='/dashboard/settings/cetak'>
                    Buka Studio Cetak Lengkap <ExternalLink className='size-3.5' />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='p-4 rounded-lg border bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2'>
                  <div className='flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs'>
                    <ShieldCheck className='size-4' /> Pejabat Penandatangan
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    Kelola nama, gelar, jabatan, nomor induk, serta upload tanda tangan transparan untuk Gembala, Sekretaris, Bendahara, dan Ketua Majelis.
                  </p>
                </div>

                <div className='p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 space-y-2'>
                  <div className='flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs'>
                    <Sparkles className='size-4' /> Stempel Resmi Gereja
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    Pengaturan posisi stempel (overlap kanan/kiri/tengah), ukuran otomatis, serta AI background removal stempel fisik.
                  </p>
                </div>

                <div className='p-4 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2'>
                  <div className='flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs'>
                    <FileSpreadsheet className='size-4' /> 11 Template Terintegrasi
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    Live preview pada Neraca Keuangan, Biodata Jemaat, Kartu Keluarga, Roster Pelayan, Lembar Doa, Agenda Acara, dan Berita Acara.
                  </p>
                </div>
              </div>

              <div className='p-4 rounded-lg border bg-muted/30 flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>
                  Kop surat otomatis mengadopsi nama <strong>{profileConfig.namaResmi}</strong> dan logo yang diunggah di Tab Profil.
                </span>
                <Button asChild variant='outline' size='sm' className='text-xs h-7 gap-1'>
                  <Link href='/dashboard/settings/cetak'>Kelola Cetak &rarr;</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: LANDING PAGE PUBLIK */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value='landing' className='space-y-6 mt-0'>
          <Card>
            <CardHeader className='pb-4'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                <div>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Globe className='size-5 text-emerald-600' /> Pengaturan Landing Page & Portal Publik
                  </CardTitle>
                  <CardDescription className='text-xs mt-1'>
                    Kustomisasi tampilan selamat datang jemaat, layanan mandiri NIJ, pendaftaran online, dan jadwal ibadah.
                  </CardDescription>
                </div>
                <div className='flex items-center gap-2'>
                  <Button asChild variant='outline' size='sm' className='gap-1.5 text-xs'>
                    <Link href='/' target='_blank'>
                      Lihat Website Publik <ExternalLink className='size-3.5' />
                    </Link>
                  </Button>
                  <Button asChild size='sm' className='gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'>
                    <Link href='/dashboard/settings/landing-page'>
                      Buka Editor Landing Page <ExternalLink className='size-3.5' />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='p-4 rounded-lg border bg-card space-y-2'>
                  <div className='font-bold text-xs text-foreground flex items-center gap-2'>
                    <Layers className='size-4 text-primary' /> Urutan & Struktur Seksi Publik
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    Atur urutan modul Hero, Layanan Publik, Materi Khotbah, Jadwal Ibadah Mingguan, serta Informasi Kontak Footer.
                  </p>
                </div>

                <div className='p-4 rounded-lg border bg-card space-y-2'>
                  <div className='font-bold text-xs text-foreground flex items-center gap-2'>
                    <Clock className='size-4 text-amber-500' /> Jadwal & Jam Pelayanan
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    Tambah dan ubah waktu ibadah raya, persekutuan doa, ibadah pemuda, serta kategorial anak secara interaktif.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: SISTEM & PREFERENSI */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value='sistem' className='space-y-6 mt-0'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Format & Nomorasi */}
            <Card>
              <CardHeader className='pb-4'>
                <CardTitle className='text-sm flex items-center gap-2'>
                  <QrCode className='size-4 text-primary' /> Standar Penomoran & Presensi
                </CardTitle>
                <CardDescription className='text-xs'>
                  Pengaturan prefix otomatis untuk Nomor Induk Jemaat (NIJ) dan kartu barcode presensi.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 text-xs'>
                <div className='space-y-1.5'>
                  <Label htmlFor='prefixNij' className='text-xs font-semibold'>
                    Prefix Nomor Induk Jemaat (NIJ)
                  </Label>
                  <Input
                    id='prefixNij'
                    value={systemConfig.prefixNij}
                    onChange={(e) => setSystemConfig((s) => ({ ...s, prefixNij: e.target.value }))}
                    placeholder='NIJ-'
                    className='text-xs font-mono uppercase'
                  />
                  <p className='text-[11px] text-muted-foreground'>Format hasil: {systemConfig.prefixNij}0001, {systemConfig.prefixNij}0002, dst.</p>
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='prefixBarcode' className='text-xs font-semibold'>
                    Prefix Kartu Barcode Scanner
                  </Label>
                  <Input
                    id='prefixBarcode'
                    value={systemConfig.prefixBarcode}
                    onChange={(e) => setSystemConfig((s) => ({ ...s, prefixBarcode: e.target.value }))}
                    placeholder='JMT-'
                    className='text-xs font-mono uppercase'
                  />
                  <p className='text-[11px] text-muted-foreground'>Format hasil: {systemConfig.prefixBarcode}893201</p>
                </div>

                <div className='space-y-1.5 pt-2 border-t'>
                  <Label htmlFor='defaultJendelaScanMenit' className='text-xs font-semibold flex items-center justify-between'>
                    <span>Default Buka Jendela Scanner Sebelum Acara</span>
                    <Badge variant='outline' className='font-mono'>{systemConfig.defaultJendelaScanMenit} Menit</Badge>
                  </Label>
                  <Input
                    id='defaultJendelaScanMenit'
                    type='number'
                    min={5}
                    max={180}
                    value={systemConfig.defaultJendelaScanMenit}
                    onChange={(e) => setSystemConfig((s) => ({ ...s, defaultJendelaScanMenit: parseInt(e.target.value) || 30 }))}
                    className='text-xs'
                  />
                  <p className='text-[11px] text-muted-foreground'>Waktu otomatis dibukanya terminal scanner sebelum jam mulai event.</p>
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='pesanSambutanScanner' className='text-xs font-semibold'>
                    Pesan Sambutan Layar Scanner
                  </Label>
                  <Input
                    id='pesanSambutanScanner'
                    value={systemConfig.pesanSambutanScanner}
                    onChange={(e) => setSystemConfig((s) => ({ ...s, pesanSambutanScanner: e.target.value }))}
                    placeholder='Selamat datang dan selamat beribadah!'
                    className='text-xs'
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lokalisasi & Modul Toggles */}
            <div className='space-y-6'>
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <Clock className='size-4 text-emerald-600' /> Lokalisasi & Format
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 text-xs'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Zona Waktu Operasional</Label>
                    <Select
                      value={systemConfig.zonaWaktu}
                      onValueChange={(val: any) => setSystemConfig((s) => ({ ...s, zonaWaktu: val }))}
                    >
                      <SelectTrigger className='text-xs h-8'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='Asia/Jakarta' className='text-xs'>Waktu Indonesia Barat (WIB - UTC+7)</SelectItem>
                        <SelectItem value='Asia/Makassar' className='text-xs'>Waktu Indonesia Tengah (WITA - UTC+8)</SelectItem>
                        <SelectItem value='Asia/Jayapura' className='text-xs'>Waktu Indonesia Timur (WIT - UTC+9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Format Kalender & Tanggal</Label>
                    <Select
                      value={systemConfig.formatTanggal}
                      onValueChange={(val: any) => setSystemConfig((s) => ({ ...s, formatTanggal: val }))}
                    >
                      <SelectTrigger className='text-xs h-8'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='id-ID' className='text-xs'>Bahasa Indonesia (31 Agustus 2026)</SelectItem>
                        <SelectItem value='en-US' className='text-xs'>English (August 31, 2026)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1.5'>
                    <Label htmlFor='maxUploadFileMb' className='text-xs font-semibold flex items-center justify-between'>
                      <span>Batas Maksimal Upload Berkas</span>
                      <Badge variant='outline' className='font-mono'>{systemConfig.maxUploadFileMb} MB</Badge>
                    </Label>
                    <Input
                      id='maxUploadFileMb'
                      type='number'
                      min={1}
                      max={50}
                      value={systemConfig.maxUploadFileMb}
                      onChange={(e) => setSystemConfig((s) => ({ ...s, maxUploadFileMb: parseInt(e.target.value) || 10 }))}
                      className='text-xs'
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Modul Toggles */}
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <Layers className='size-4 text-indigo-600' /> Modul Aplikasi
                  </CardTitle>
                  <CardDescription className='text-xs'>Aktifkan atau nonaktifkan visibilitas modul gereja.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-3 text-xs'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <div className='font-semibold text-xs'>Modul Keuangan & Kas</div>
                      <div className='text-[11px] text-muted-foreground'>Laporan pemasukan, pengeluaran, dan LPJ kas jemaat.</div>
                    </div>
                    <Switch
                      checked={systemConfig.fiturKeuangan}
                      onCheckedChange={(c) => setSystemConfig((s) => ({ ...s, fiturKeuangan: c }))}
                    />
                  </div>

                  <div className='flex items-center justify-between pt-2 border-t'>
                    <div>
                      <div className='font-semibold text-xs'>Modul Arsip & SK Gereja</div>
                      <div className='text-[11px] text-muted-foreground'>Penyimpanan dokumen legalitas, surat keputusan, dan notulen.</div>
                    </div>
                    <Switch
                      checked={systemConfig.fiturArsip}
                      onCheckedChange={(c) => setSystemConfig((s) => ({ ...s, fiturArsip: c }))}
                    />
                  </div>

                  <div className='flex items-center justify-between pt-2 border-t'>
                    <div>
                      <div className='font-semibold text-xs'>Modul Materi & Renungan</div>
                      <div className='text-[11px] text-muted-foreground'>Pengajaran firman mingguan dan publikasi bahan khotbah.</div>
                    </div>
                    <Switch
                      checked={systemConfig.fiturMateri}
                      onCheckedChange={(c) => setSystemConfig((s) => ({ ...s, fiturMateri: c }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: PENGGUNA & HAK AKSES */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value='users' className='space-y-6 mt-0'>
          <Card>
            <CardHeader className='pb-4'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                <div>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Users className='size-5 text-rose-600' /> Manajemen Akun & Hak Akses (RBAC)
                  </CardTitle>
                  <CardDescription className='text-xs mt-1'>
                    Pengelolaan staf administrator, gembala, sekretaris, bendahara, dan usher terminal.
                  </CardDescription>
                </div>
                <Button asChild size='sm' className='gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white'>
                  <Link href='/dashboard/users'>
                    Buka Manajemen Pengguna <ExternalLink className='size-3.5' />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-4 text-xs'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='p-4 rounded-lg border bg-rose-50/50 dark:bg-rose-950/20 space-y-1.5'>
                  <div className='font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5'>
                    <ShieldCheck className='size-4' /> Hak Akses Berjenjang
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    6 Role sistem: SUPER_ADMIN, GEMBALA, SEKRETARIS, BENDAHARA, USHER, dan PUBLIC.
                  </p>
                </div>

                <div className='p-4 rounded-lg border bg-card space-y-1.5'>
                  <div className='font-bold text-foreground flex items-center gap-1.5'>
                    <Lock className='size-4 text-primary' /> Keamanan Akun
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    Proteksi brute-force login lockout (5x gagal), enkripsi password Argon2id, dan session tracking.
                  </p>
                </div>

                <div className='p-4 rounded-lg border bg-card space-y-1.5'>
                  <div className='font-bold text-foreground flex items-center gap-1.5'>
                    <FileText className='size-4 text-emerald-600' /> Audit Trail SHA-256
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    Setiap perubahan data dan otentikasi login terekam otomatis pada log audit kriptografis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: TEMPLATE PESAN WHATSAPP (DYNAMIC ADJUSTMENTS) */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value='whatsapp' className='space-y-6 mt-0'>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            {/* Left Col: Template Selector */}
            <div className='lg:col-span-4 space-y-3'>
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <MessageSquare className='size-4 text-emerald-600' /> Kategori Pesan WhatsApp
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Pilih skenario pesan untuk menyesuaikan narasi dan variabel dinamis.
                  </CardDescription>
                </CardHeader>
                <CardContent className='p-2 space-y-1.5'>
                  {WHATSAPP_TEMPLATES_METADATA.map((meta) => {
                    const isSelected = selectedWaKey === meta.key
                    return (
                      <button
                        key={meta.key}
                        type='button'
                        onClick={() => setSelectedWaKey(meta.key)}
                        className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex flex-col gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xs'
                            : 'bg-card hover:bg-muted/50 border-border/70'
                        }`}
                      >
                        <div className='flex items-center justify-between w-full'>
                          <span className={`font-bold ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
                            {meta.title}
                          </span>
                          <Badge variant='outline' className='text-[10px] font-mono py-0 px-1.5'>
                            {meta.category}
                          </Badge>
                        </div>
                        <p className='text-[11px] text-muted-foreground line-clamp-2'>
                          {meta.description}
                        </p>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Editor & Live Preview */}
            <div className='lg:col-span-8 space-y-6'>
              {(() => {
                const currentMeta = WHATSAPP_TEMPLATES_METADATA.find((m) => m.key === selectedWaKey)!
                const sampleVars: Record<string, string> = {
                  namaGereja: profileConfig.namaSingkat || profileConfig.namaResmi || 'Gereja',
                }
                currentMeta.availableVariables.forEach((v) => {
                  const rawTag = v.tag.replace(/[{}]/g, '')
                  sampleVars[rawTag] = v.example
                })
                const previewText = formatWhatsAppMessage(whatsappConfig[selectedWaKey] || '', sampleVars)

                return (
                  <div className='grid grid-cols-1 xl:grid-cols-12 gap-6'>
                    {/* Editor Form */}
                    <div className='xl:col-span-7 space-y-4'>
                      <Card>
                        <CardHeader className='pb-3'>
                          <div className='flex items-center justify-between gap-2 flex-wrap'>
                            <div>
                              <CardTitle className='text-sm font-bold flex items-center gap-2'>
                                <Send className='size-4 text-emerald-600' /> {currentMeta.title}
                              </CardTitle>
                              <CardDescription className='text-xs mt-0.5'>
                                {currentMeta.description}
                              </CardDescription>
                            </div>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleResetSingleTemplate(selectedWaKey)}
                              className='h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1'
                            >
                              <RotateCcw className='size-3' /> Reset Standar
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className='space-y-4 text-xs'>
                          {/* Variable Chips Bar */}
                          <div className='space-y-1.5 p-2.5 rounded-lg bg-muted/40 border border-muted'>
                            <Label className='text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5'>
                              <Sparkles className='size-3 text-amber-500' />
                              <span>Klik variabel di bawah untuk menyisipkan ke pesan:</span>
                            </Label>
                            <div className='flex flex-wrap gap-1.5 pt-1'>
                              {currentMeta.availableVariables.map((v) => (
                                <button
                                  key={v.tag}
                                  type='button'
                                  onClick={() => handleInsertTag(v.tag)}
                                  className='inline-flex items-center gap-1 px-2 py-1 rounded bg-background border hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/40 text-[11px] font-mono transition-colors group cursor-pointer'
                                  title={`Contoh isi: ${v.example}`}
                                >
                                  <span className='font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline'>
                                    {v.tag}
                                  </span>
                                  <span className='text-[10px] text-muted-foreground'>({v.label})</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Message Textarea */}
                          <div className='space-y-1.5'>
                            <div className='flex items-center justify-between'>
                              <Label htmlFor='wa-editor' className='text-xs font-semibold'>
                                Format Teks Pesan WhatsApp *
                              </Label>
                              <span className='text-[10px] text-muted-foreground font-mono'>
                                {(whatsappConfig[selectedWaKey] || '').length} karakter
                              </span>
                            </div>
                            <Textarea
                              id='wa-editor'
                              value={whatsappConfig[selectedWaKey] || ''}
                              onChange={(e) =>
                                setWhatsappConfig((prev) => ({
                                  ...prev,
                                  [selectedWaKey]: e.target.value,
                                }))
                              }
                              rows={8}
                              className='font-sans text-xs leading-relaxed'
                              placeholder='Ketik narasi template WhatsApp di sini...'
                            />
                            <p className='text-[10px] text-muted-foreground'>
                              Gunakan format tanda bintang <code className='bg-muted px-1 rounded'>*teks tebal*</code> atau <code className='bg-muted px-1 rounded'>_teks miring_</code> sesuai standar WhatsApp.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Live Preview Bubble */}
                    <div className='xl:col-span-5 space-y-3'>
                      <Card className='overflow-hidden border-emerald-500/20 shadow-xs bg-slate-100 dark:bg-slate-900/60'>
                        <CardHeader className='py-2.5 px-3.5 bg-emerald-700 text-white flex flex-row items-center gap-2.5 space-y-0'>
                          <div className='size-7 rounded-full bg-white/20 overflow-hidden flex items-center justify-center text-white font-bold text-xs shrink-0 border border-white/20'>
                            {logoPreview || profileConfig.logoUrl ? (
                              <img
                                src={logoPreview || profileConfig.logoUrl || ''}
                                alt='Logo'
                                className='w-full h-full object-cover'
                              />
                            ) : (
                              <span>{profileConfig.akronim || 'GBI'}</span>
                            )}
                          </div>
                          <div className='min-w-0 flex-1 leading-tight'>
                            <div className='text-xs font-bold truncate'>
                              {profileConfig.namaSingkat || profileConfig.namaResmi || 'Gereja'} Official
                            </div>
                            <div className='text-[10px] text-emerald-100 font-normal'>Online</div>
                          </div>
                          <Smartphone className='size-4 text-emerald-200 shrink-0' />
                        </CardHeader>
                        <CardContent className='p-3 min-h-65 flex flex-col justify-end bg-[#ECE5DD]/40 dark:bg-[#0B141A]/50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-size-[16px_16px]'>
                          {/* Chat Bubble */}
                          <div className='bg-[#DCF8C6] dark:bg-[#005C4B] text-slate-800 dark:text-slate-100 p-3 rounded-lg rounded-tr-none shadow-xs text-xs space-y-2 relative border border-emerald-600/10 max-w-full'>
                            <div className='whitespace-pre-wrap leading-relaxed wrap-break-word font-sans'>
                              {previewText}
                            </div>
                            <div className='flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-300 font-mono'>
                              <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className='text-sky-500 font-bold'>✓✓</span>
                            </div>
                          </div>
                          <p className='text-[10px] text-center text-muted-foreground mt-2 italic'>
                            Simulasi tampilan pesan pada aplikasi WhatsApp penerima
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold'>
              Kembalikan {resetTarget === 'profile' ? 'Profil Aplikasi' : resetTarget === 'system' ? 'Pengaturan Sistem' : 'Template WhatsApp'} ke Standar?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              Tindakan ini akan mengembalikan data {resetTarget === 'profile' ? 'identitas gereja dan logo' : resetTarget === 'system' ? 'preferensi penomoran dan lokalisasi' : 'seluruh format pesan WhatsApp'} ke konfigurasi bawaan awal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs'>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReset} className='text-xs bg-rose-600 hover:bg-rose-700 text-white'>
              Ya, Reset ke Standar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
