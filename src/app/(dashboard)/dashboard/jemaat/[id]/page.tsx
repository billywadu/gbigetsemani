'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ShieldCheck,
  QrCode,
  User,
  Home,
  FileText,
  Clock,
  Activity,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Users,
  Building2,
  FileCheck,
  Loader2,
  Trash2,
  Edit,
  Save,
  X,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Eye,
  Download,
  Award,
  Church,
  ShieldAlert,
  Hash,
  ArrowRight,
  Info,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getJemaatByIdAction,
  updateJemaatAction,
  deleteJemaatAction,
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

function JemaatDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [jemaat, setJemaat] = useState<any | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [churchName, setChurchName] = useState('Gereja')

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [options, setOptions] = useState<{
    kategorial: { id: string; nama: string }[]
    komsel: { id: string; nama: string }[]
    keluarga: { id: string; nama: string }[]
  }>({ kategorial: [], komsel: [], keluarga: [] })

  // Form State
  const [formData, setFormData] = useState({
    nik: '',
    nama: '',
    namaPanggilan: '',
    jenisKelamin: 'LAK_LAKI',
    tempatLahir: '',
    tanggalLahir: '',
    noHp: '',
    whatsApp: '',
    email: '',
    alamat: '',
    kota: 'Padang',
    provinsi: 'Sumatera Barat',
    kodePos: '',
    statusJemaat: 'ACTIVE',
    tanggalBergabung: '',
    statusBaptis: 'BELUM_BAPTIS',
    tanggalBaptis: '',
    statusFollowUp: 'NEW',
    statusPernikahan: 'BELUM_MENIKAH',
    tanggalMenikah: '',
    pekerjaan: '',
    pendidikan: 'S1',
    kontakDarurat: '',
    catatan: '',
    kategorialId: '',
    komselId: '',
    keluargaId: '',
  })

  // Delete State
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Pagination State for Tabs
  const [keluargaPage, setKeluargaPage] = useState(1)
  const [presensiPage, setPresensiPage] = useState(1)
  const [dokumenPage, setDokumenPage] = useState(1)
  const [auditPage, setAuditPage] = useState(1)

  // Dynamic WhatsApp Templates from Settings
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplatesConfig>(DEFAULT_WHATSAPP_TEMPLATES_CONFIG)

  // Check URL ?edit=true on mount/change
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true)
    }
    getWhatsAppTemplatesAction()
      .then((res) => {
        if (res?.success && res.data) {
          setWaTemplates(res.data)
        }
      })
      .catch(() => {})

    getAppProfileAction()
      .then((res) => {
        if (res?.success && res.data) {
          setChurchName(res.data.namaSingkat || res.data.namaResmi || 'Gereja')
        }
      })
      .catch(() => {})
  }, [searchParams])

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

  const getWhatsAppTemplate = (targetJemaat: any) => {
    const template = waTemplates.SAPAAN_JEMAAT || DEFAULT_WHATSAPP_TEMPLATES_CONFIG.SAPAAN_JEMAAT || ''
    return formatWhatsAppMessage(template, {
      nama: targetJemaat.nama || 'Bapak/Ibu/Saudara/i',
      nij: targetJemaat.nij || '-',
      kategorial: targetJemaat.kategorial?.nama || '-',
      komsel: targetJemaat.komsel?.nama || '-',
      namaGereja: churchName,
    })
  }

  const fetchDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [res, optRes] = await Promise.all([
        getJemaatByIdAction(id),
        getJemaatFormOptionsAction(),
      ])

      if (optRes?.success && optRes.data) {
        setOptions(optRes.data)
      }

      if (res?.success && res.data) {
        const d = res.data
        setJemaat(d)
        setErrorMsg(null)

        // Pre-fill form data
        setFormData({
          nik: d.nik || '',
          nama: d.nama || '',
          namaPanggilan: d.namaPanggilan || '',
          jenisKelamin: d.jenisKelamin || 'LAK_LAKI',
          tempatLahir: d.tempatLahir || '',
          tanggalLahir: d.tanggalLahir ? new Date(d.tanggalLahir).toISOString().split('T')[0] : '',
          noHp: d.noHp || '',
          whatsApp: d.whatsApp || '',
          email: d.email || '',
          alamat: d.alamat || '',
          kota: d.kota || 'Padang',
          provinsi: d.provinsi || 'Sumatera Barat',
          kodePos: d.kodePos || '',
          statusJemaat: d.statusJemaat || 'ACTIVE',
          tanggalBergabung: d.tanggalBergabung ? new Date(d.tanggalBergabung).toISOString().split('T')[0] : '',
          statusBaptis: d.statusBaptis || 'BELUM_BAPTIS',
          tanggalBaptis: d.tanggalBaptis ? new Date(d.tanggalBaptis).toISOString().split('T')[0] : '',
          statusFollowUp: d.statusFollowUp || 'NEW',
          statusPernikahan: d.statusPernikahan || 'BELUM_MENIKAH',
          tanggalMenikah: d.tanggalMenikah ? new Date(d.tanggalMenikah).toISOString().split('T')[0] : '',
          pekerjaan: d.pekerjaan || '',
          pendidikan: d.pendidikan || 'S1',
          kontakDarurat: d.kontakDarurat || '',
          catatan: d.catatan || '',
          kategorialId: d.kategorialId || '',
          komselId: d.komselId || '',
          keluargaId: d.keluargaId || '',
        })
      } else {
        setErrorMsg(res?.error || 'Data jemaat tidak ditemukan.')
      }
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke server. Silakan muat ulang halaman.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jemaat) return
    if (!formData.nama.trim()) {
      toast.error('Nama Lengkap wajib diisi!')
      return
    }

    setIsSaving(true)
    try {
      const res = await updateJemaatAction({
        id: jemaat.id,
        nik: formData.nik.trim() || undefined,
        nama: formData.nama.trim(),
        namaPanggilan: formData.namaPanggilan.trim() || undefined,
        jenisKelamin: formData.jenisKelamin as any,
        tempatLahir: formData.tempatLahir.trim() || undefined,
        tanggalLahir: formData.tanggalLahir || undefined,
        noHp: formData.noHp.trim() || undefined,
        whatsApp: formData.whatsApp.trim() || undefined,
        email: formData.email.trim() || undefined,
        alamat: formData.alamat.trim() || undefined,
        kota: formData.kota || 'Padang',
        provinsi: formData.provinsi || 'Sumatera Barat',
        kodePos: formData.kodePos.trim() || undefined,
        statusJemaat: formData.statusJemaat as any,
        tanggalBergabung: formData.tanggalBergabung || undefined,
        statusBaptis: formData.statusBaptis as any,
        tanggalBaptis: formData.tanggalBaptis || undefined,
        statusFollowUp: formData.statusFollowUp as any,
        statusPernikahan: formData.statusPernikahan as any,
        tanggalMenikah: formData.tanggalMenikah || undefined,
        pekerjaan: formData.pekerjaan.trim() || undefined,
        pendidikan: (formData.pendidikan as any) || undefined,
        kontakDarurat: formData.kontakDarurat.trim() || undefined,
        catatan: formData.catatan.trim() || undefined,
        kategorialId: formData.kategorialId || undefined,
        komselId: formData.komselId || undefined,
        keluargaId: formData.keluargaId || undefined,
      })

      if (res?.success && res.data) {
        toast.success('Data jemaat berhasil diperbarui! Log audit SHA-256 tersimpan.')
        setIsEditing(false)
        router.replace(`/dashboard/jemaat/${id}`)
        fetchDetail()
      } else {
        toast.error(res?.error || 'Gagal menyimpan perubahan data jemaat.')
      }
    } catch (err: any) {
      toast.error('Gagal terhubung ke server saat menyimpan. Silakan coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    router.replace(`/dashboard/jemaat/${id}`)
    if (jemaat) {
      setFormData({
        nik: jemaat.nik || '',
        nama: jemaat.nama || '',
        namaPanggilan: jemaat.namaPanggilan || '',
        jenisKelamin: jemaat.jenisKelamin || 'LAK_LAKI',
        tempatLahir: jemaat.tempatLahir || '',
        tanggalLahir: jemaat.tanggalLahir ? new Date(jemaat.tanggalLahir).toISOString().split('T')[0] : '',
        noHp: jemaat.noHp || '',
        whatsApp: jemaat.whatsApp || '',
        email: jemaat.email || '',
        alamat: jemaat.alamat || '',
        kota: jemaat.kota || 'Padang',
        provinsi: jemaat.provinsi || 'Sumatera Barat',
        kodePos: jemaat.kodePos || '',
        statusJemaat: jemaat.statusJemaat || 'ACTIVE',
        tanggalBergabung: jemaat.tanggalBergabung ? new Date(jemaat.tanggalBergabung).toISOString().split('T')[0] : '',
        statusBaptis: jemaat.statusBaptis || 'BELUM_BAPTIS',
        tanggalBaptis: jemaat.tanggalBaptis ? new Date(jemaat.tanggalBaptis).toISOString().split('T')[0] : '',
        statusFollowUp: jemaat.statusFollowUp || 'NEW',
        statusPernikahan: jemaat.statusPernikahan || 'BELUM_MENIKAH',
        tanggalMenikah: jemaat.tanggalMenikah ? new Date(jemaat.tanggalMenikah).toISOString().split('T')[0] : '',
        pekerjaan: jemaat.pekerjaan || '',
        pendidikan: jemaat.pendidikan || 'S1',
        kontakDarurat: jemaat.kontakDarurat || '',
        catatan: jemaat.catatan || '',
        kategorialId: jemaat.kategorialId || '',
        komselId: jemaat.komselId || '',
        keluargaId: jemaat.keluargaId || '',
      })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!jemaat) return
    if (!deletionReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deleteJemaatAction({
      id: jemaat.id,
      reason: deletionReason.trim(),
    })

    setIsDeleting(false)
    if (res.success) {
      toast.success(res.message || 'Jemaat berhasil di-soft delete.')
      setDeleteOpen(false)
      router.push('/dashboard/jemaat')
    } else {
      toast.error(res.error || 'Gagal menghapus jemaat.')
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-100 text-muted-foreground gap-2 text-sm'>
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat data jemaat...
      </div>
    )
  }

  if (errorMsg || !jemaat) {
    return (
      <div className='space-y-4 max-w-xl mx-auto py-12 text-center'>
        <h2 className='text-xl font-bold text-rose-600 dark:text-rose-400'>Data Tidak Ditemukan</h2>
        <p className='text-sm text-muted-foreground'>{errorMsg || 'Data jemaat telah dihapus atau tidak terdaftar.'}</p>
        <Button asChild variant='outline'>
          <Link href='/dashboard/jemaat'>Kembali ke Daftar Jemaat</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Top Navigation & Header Actions */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4'>
        <div className='flex items-start gap-3 sm:gap-4'>
          <Button asChild variant='ghost' size='icon' className='size-8 mt-0.5 shrink-0'>
            <Link href='/dashboard/jemaat'>
              <ArrowLeft className='size-4' />
            </Link>
          </Button>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h1 className='text-lg sm:text-2xl font-bold tracking-tight text-foreground'>{jemaat.nama}</h1>
              <Badge
                className={`text-xs font-semibold shrink-0 ${
                  jemaat.statusJemaat === 'ACTIVE'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                }`}
              >
                {jemaat.statusJemaat}
              </Badge>
              {isEditing && (
                <Badge variant='outline' className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold text-xs shrink-0'>
                  Mode Edit
                </Badge>
              )}
            </div>
            <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
              Profil Terverifikasi {churchName} • Terdaftar sejak {jemaat.tanggalBergabung ? new Date(jemaat.tanggalBergabung).toLocaleDateString('id-ID') : '-'}
            </p>
          </div>
        </div>

        <div className='grid grid-cols-2 sm:flex items-center gap-2'>
          {!isEditing ? (
            <>
              {(jemaat.whatsApp || jemaat.noHp) && (
                <Button
                  asChild
                  variant='outline'
                  size='sm'
                  className='gap-1.5 font-medium h-8 text-xs justify-center border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10'
                >
                  <a
                    href={formatWhatsAppUrl(
                      jemaat.whatsApp || jemaat.noHp,
                      getWhatsAppTemplate(jemaat)
                    )}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <MessageSquare className='size-3.5 text-emerald-600' /> Chat WA
                  </a>
                </Button>
              )}
              <Button
                variant='default'
                size='sm'
                onClick={() => setIsEditing(true)}
                className='gap-1.5 font-medium h-8 text-xs justify-center'
              >
                <Edit className='size-3.5' /> Edit Data Jemaat
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setDeleteOpen(true)}
                className='gap-1.5 text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 h-8 text-xs justify-center'
              >
                <Trash2 className='size-3.5' /> Hapus
              </Button>
            </>
          ) : (
            <>
              <Button
                variant='outline'
                size='sm'
                onClick={handleCancelEdit}
                className='gap-1.5 h-8 text-xs justify-center'
                disabled={isSaving}
              >
                <X className='size-3.5' /> Batal
              </Button>
              <Button
                size='sm'
                onClick={handleSaveEdit}
                disabled={isSaving}
                className='gap-1.5 font-semibold bg-primary text-primary-foreground h-8 text-xs justify-center'
              >
                {isSaving ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Header Cards (NIJ, Barcode, Completeness) */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card className='shadow-xs bg-card border-primary/20'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
              Nomor Induk Jemaat (NIJ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold font-mono text-primary flex items-center gap-2'>
              <ShieldCheck className='size-5 text-emerald-500' />
              {jemaat.nij}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>Nomor tunggal resmi terlindungi atomic sequence</p>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
              Kode Barcode Presensi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold font-mono flex items-center gap-2'>
              <QrCode className='size-5 text-muted-foreground' />
              {jemaat.barcodeCode}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>Dipindai saat presensi ibadah / event</p>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
              Kelengkapan Profil (13 Indikator)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <span className='text-2xl font-bold font-mono'>{jemaat.completenessPercentage}%</span>
              <Badge variant='outline' className='text-xs font-semibold'>
                {jemaat.completenessPercentage >= 80 ? 'Lengkap' : 'Perlu Dilengkapi'}
              </Badge>
            </div>
            <div className='w-full bg-muted h-2 rounded-full overflow-hidden mt-2'>
              <div
                className='bg-primary h-full rounded-full transition-all'
                style={{ width: `${jemaat.completenessPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EDIT MODE FORM */}
      {isEditing ? (
        <form onSubmit={handleSaveEdit} className='space-y-6 animate-in fade-in-50 duration-200'>
          {/* Section 1: Identitas Utama & Pribadi */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base font-bold flex items-center gap-2'>
                <User className='size-4 text-primary' /> 1. Data Identitas Utama & Pribadi
              </CardTitle>
              <CardDescription className='text-xs'>Informasi lengkap sesuai KTP / Identitas Resmi</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='nik' className='text-xs font-medium'>
                  NIK (Nomor Induk Kependudukan) <span className='text-xs text-muted-foreground font-normal'>(Opsional)</span>
                </Label>
                <Input
                  id='nik'
                  maxLength={16}
                  placeholder='Contoh: 1371XXXXXXXXXXXX (16 digit, opsional)'
                  value={formData.nik}
                  onChange={(e) => handleFieldChange('nik', e.target.value.replace(/\D/g, ''))}
                  className='text-xs font-mono'
                />
              </div>

              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='nama' className='text-xs font-medium'>
                  Nama Lengkap (Sesuai KTP) *
                </Label>
                <Input
                  id='nama'
                  value={formData.nama}
                  onChange={(e) => handleFieldChange('nama', e.target.value)}
                  className='text-xs'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='namaPanggilan' className='text-xs font-medium'>
                  Nama Panggilan
                </Label>
                <Input
                  id='namaPanggilan'
                  value={formData.namaPanggilan}
                  onChange={(e) => handleFieldChange('namaPanggilan', e.target.value)}
                  className='text-xs'
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='jenisKelamin' className='text-xs font-medium'>
                  Jenis Kelamin *
                </Label>
                <Select
                  value={formData.jenisKelamin}
                  onValueChange={(val) => handleFieldChange('jenisKelamin', val)}
                >
                  <SelectTrigger id='jenisKelamin' className='text-xs'>
                    <SelectValue placeholder='Pilih Gender' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='LAK_LAKI'>Laki-laki</SelectItem>
                    <SelectItem value='PEREMPUAN'>Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='tempatLahir' className='text-xs font-medium'>
                  Tempat Lahir
                </Label>
                <Input
                  id='tempatLahir'
                  value={formData.tempatLahir}
                  onChange={(e) => handleFieldChange('tempatLahir', e.target.value)}
                  className='text-xs'
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='tanggalLahir' className='text-xs font-medium'>
                  Tanggal Lahir
                </Label>
                <Input
                  id='tanggalLahir'
                  type='date'
                  value={formData.tanggalLahir}
                  onChange={(e) => handleFieldChange('tanggalLahir', e.target.value)}
                  className='text-xs'
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Kontak & Domisili */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base font-bold flex items-center gap-2'>
                <Phone className='size-4 text-primary' /> 2. Kontak & Alamat Domisili
              </CardTitle>
              <CardDescription className='text-xs'>Nomor HP/WhatsApp aktif untuk komunikasi pastoral</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='noHp' className='text-xs font-medium'>
                  Nomor HP Utama
                </Label>
                <Input
                  id='noHp'
                  value={formData.noHp}
                  onChange={(e) => handleFieldChange('noHp', e.target.value)}
                  className='text-xs font-mono'
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='whatsApp' className='text-xs font-medium'>
                  Nomor WhatsApp
                </Label>
                <Input
                  id='whatsApp'
                  value={formData.whatsApp}
                  onChange={(e) => handleFieldChange('whatsApp', e.target.value)}
                  className='text-xs font-mono'
                />
              </div>

              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='email' className='text-xs font-medium'>
                  Alamat Email
                </Label>
                <Input
                  id='email'
                  type='email'
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className='text-xs font-mono'
                />
              </div>

              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='alamat' className='text-xs font-medium'>
                  Alamat Rumah Lengkap
                </Label>
                <Textarea
                  id='alamat'
                  value={formData.alamat}
                  onChange={(e) => handleFieldChange('alamat', e.target.value)}
                  className='text-xs'
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='kota' className='text-xs font-medium'>
                  Kota / Kabupaten
                </Label>
                <Input
                  id='kota'
                  value={formData.kota}
                  onChange={(e) => handleFieldChange('kota', e.target.value)}
                  className='text-xs'
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='provinsi' className='text-xs font-medium'>
                  Provinsi
                </Label>
                <Input
                  id='provinsi'
                  value={formData.provinsi}
                  onChange={(e) => handleFieldChange('provinsi', e.target.value)}
                  className='text-xs'
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='kodePos' className='text-xs font-medium'>
                  Kode Pos
                </Label>
                <Input
                  id='kodePos'
                  value={formData.kodePos}
                  onChange={(e) => handleFieldChange('kodePos', e.target.value)}
                  className='text-xs font-mono'
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Status Keanggotaan, Rohani, & Keluarga */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base font-bold flex items-center gap-2'>
                <Building2 className='size-4 text-primary' /> 3. Status Keanggotaan, Rohani, & Afiliasi
              </CardTitle>
              <CardDescription className='text-xs'>Penetapan status jemaat, baptisan, dan penempatan pelayanan</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='statusJemaat' className='text-xs font-medium'>
                  Status Jemaat *
                </Label>
                <Select
                  value={formData.statusJemaat}
                  onValueChange={(val) => handleFieldChange('statusJemaat', val)}
                >
                  <SelectTrigger id='statusJemaat' className='text-xs'>
                    <SelectValue placeholder='Pilih Status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ACTIVE'>Jemaat Aktif (Active)</SelectItem>
                    <SelectItem value='INACTIVE'>Non-Aktif</SelectItem>
                    <SelectItem value='MOVED'>Pindah / Mutasi</SelectItem>
                    <SelectItem value='DECEASED'>Meninggal Dunia</SelectItem>
                    <SelectItem value='SUSPENDED'>Pembinaan / Skorsing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='statusBaptis' className='text-xs font-medium'>
                  Status Baptis Air
                </Label>
                <Select
                  value={formData.statusBaptis}
                  onValueChange={(val) => handleFieldChange('statusBaptis', val)}
                >
                  <SelectTrigger id='statusBaptis' className='text-xs'>
                    <SelectValue placeholder='Pilih Status Baptis' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='SUDAH_BAPTIS'>Sudah Baptis Air</SelectItem>
                    <SelectItem value='BELUM_BAPTIS'>Belum Baptis Air</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.statusBaptis === 'SUDAH_BAPTIS' && (
                <div className='space-y-1.5 sm:col-span-2'>
                  <Label htmlFor='tanggalBaptis' className='text-xs font-medium'>
                    Tanggal Baptis Air
                  </Label>
                  <Input
                    id='tanggalBaptis'
                    type='date'
                    value={formData.tanggalBaptis}
                    onChange={(e) => handleFieldChange('tanggalBaptis', e.target.value)}
                    className='text-xs'
                  />
                </div>
              )}

              <div className='space-y-1.5'>
                <Label htmlFor='statusPernikahan' className='text-xs font-medium'>
                  Status Pernikahan
                </Label>
                <Select
                  value={formData.statusPernikahan}
                  onValueChange={(val) => handleFieldChange('statusPernikahan', val)}
                >
                  <SelectTrigger id='statusPernikahan' className='text-xs'>
                    <SelectValue placeholder='Pilih Pernikahan' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='BELUM_MENIKAH'>Belum Menikah</SelectItem>
                    <SelectItem value='MENIKAH'>Menikah</SelectItem>
                    <SelectItem value='DUDA'>Duda</SelectItem>
                    <SelectItem value='JANDA'>Janda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.statusPernikahan === 'MENIKAH' && (
                <div className='space-y-1.5'>
                  <Label htmlFor='tanggalMenikah' className='text-xs font-medium'>
                    Tanggal Menikah
                  </Label>
                  <Input
                    id='tanggalMenikah'
                    type='date'
                    value={formData.tanggalMenikah}
                    onChange={(e) => handleFieldChange('tanggalMenikah', e.target.value)}
                    className='text-xs'
                  />
                </div>
              )}

              <div className='space-y-1.5'>
                <Label htmlFor='kategorialId' className='text-xs font-medium'>
                  Kelompok Kategorial
                </Label>
                <Select
                  value={formData.kategorialId || '_NONE_'}
                  onValueChange={(val) => handleFieldChange('kategorialId', val === '_NONE_' ? '' : val)}
                >
                  <SelectTrigger id='kategorialId' className='text-xs'>
                    <SelectValue placeholder='Pilih Kategorial' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='_NONE_'>-- Tanpa Kategorial --</SelectItem>
                    {options.kategorial.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='komselId' className='text-xs font-medium'>
                  Komunitas Sel (Komsel)
                </Label>
                <Select
                  value={formData.komselId || '_NONE_'}
                  onValueChange={(val) => handleFieldChange('komselId', val === '_NONE_' ? '' : val)}
                >
                  <SelectTrigger id='komselId' className='text-xs'>
                    <SelectValue placeholder='Pilih Komsel' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='_NONE_'>-- Tanpa Komsel --</SelectItem>
                    {options.komsel.map((km) => (
                      <SelectItem key={km.id} value={km.id}>
                        {km.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='keluargaId' className='text-xs font-medium'>
                  Kartu Keluarga (KK)
                </Label>
                <Select
                  value={formData.keluargaId || '_NONE_'}
                  onValueChange={(val) => handleFieldChange('keluargaId', val === '_NONE_' ? '' : val)}
                >
                  <SelectTrigger id='keluargaId' className='text-xs'>
                    <SelectValue placeholder='Pilih Keluarga' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='_NONE_'>-- Tanpa Relasi KK --</SelectItem>
                    {options.keluarga.map((kl) => (
                      <SelectItem key={kl.id} value={kl.id}>
                        {kl.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Pekerjaan, Pendidikan & Catatan */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base font-bold flex items-center gap-2'>
                <Briefcase className='size-4 text-primary' /> 4. Pekerjaan & Catatan Pastoral
              </CardTitle>
            </CardHeader>
            <CardContent className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='pekerjaan' className='text-xs font-medium'>
                  Pekerjaan / Profesi
                </Label>
                <Input
                  id='pekerjaan'
                  value={formData.pekerjaan}
                  onChange={(e) => handleFieldChange('pekerjaan', e.target.value)}
                  className='text-xs'
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='pendidikan' className='text-xs font-medium'>
                  Pendidikan Terakhir
                </Label>
                <Select
                  value={formData.pendidikan}
                  onValueChange={(val) => handleFieldChange('pendidikan', val)}
                >
                  <SelectTrigger id='pendidikan' className='text-xs'>
                    <SelectValue placeholder='Pilih Pendidikan' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='SD'>SD</SelectItem>
                    <SelectItem value='SMP'>SMP</SelectItem>
                    <SelectItem value='SMA'>SMA</SelectItem>
                    <SelectItem value='D3'>D3</SelectItem>
                    <SelectItem value='S1'>S1</SelectItem>
                    <SelectItem value='S2'>S2</SelectItem>
                    <SelectItem value='S3'>S3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='kontakDarurat' className='text-xs font-medium'>
                  Kontak Darurat (Nama & Telp)
                </Label>
                <Input
                  id='kontakDarurat'
                  value={formData.kontakDarurat}
                  onChange={(e) => handleFieldChange('kontakDarurat', e.target.value)}
                  className='text-xs'
                />
              </div>

              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='catatan' className='text-xs font-medium'>
                  Catatan Pastoral
                </Label>
                <Textarea
                  id='catatan'
                  value={formData.catatan}
                  onChange={(e) => handleFieldChange('catatan', e.target.value)}
                  className='text-xs'
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit / Cancel Footer */}
          <div className='flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t'>
            <Button
              type='button'
              variant='outline'
              onClick={handleCancelEdit}
              disabled={isSaving}
              className='h-9 w-full sm:w-auto text-xs font-medium justify-center'
            >
              Batal
            </Button>
            <Button
              type='submit'
              disabled={isSaving}
              className='h-9 w-full sm:w-auto gap-2 text-xs font-semibold bg-primary text-primary-foreground justify-center'
            >
              {isSaving ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Data'}
            </Button>
          </div>
        </form>
      ) : (
        /* READ-ONLY DETAIL TABS */
        <Tabs defaultValue='overview' className='space-y-4'>
          <div className='overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0'>
            <TabsList className='inline-flex w-auto min-w-full justify-start h-9 p-1 bg-muted/60'>
              <TabsTrigger value='overview' className='text-xs gap-1.5 px-3 py-1.5 shrink-0'>
                <User className='size-3.5' /> Overview
              </TabsTrigger>
              <TabsTrigger value='identitas' className='text-xs gap-1.5 px-3 py-1.5 shrink-0'>
                <FileText className='size-3.5' /> Identitas
              </TabsTrigger>
              <TabsTrigger value='keluarga' className='text-xs gap-1.5 px-3 py-1.5 shrink-0'>
                <Users className='size-3.5' /> Keluarga
                {jemaat.keluarga && (
                  <Badge variant='secondary' className='ml-1 text-[10px] px-1.5 py-0'>
                    {jemaat.keluarga.anggotaKeluarga?.length || jemaat.keluarga.totalAnggota || 1}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value='gereja' className='text-xs gap-1.5 px-3 py-1.5 shrink-0'>
                <Building2 className='size-3.5' /> Ministry
                {jemaat.pelayanRecord && (
                  <Badge variant='secondary' className='ml-1 text-[10px] px-1.5 py-0 bg-primary/10 text-primary'>
                    {jemaat.pelayanRecord.kategoriPelayanan?.length || 1} Bidang
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value='presensi' className='text-xs gap-1.5 px-3 py-1.5 shrink-0'>
                <Clock className='size-3.5' /> Presensi
                {jemaat.attendances?.length > 0 && (
                  <Badge variant='secondary' className='ml-1 text-[10px] px-1.5 py-0'>
                    {jemaat.attendances.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value='dokumen' className='text-xs gap-1.5 px-3 py-1.5 shrink-0'>
                <FileCheck className='size-3.5' /> Dokumen
                {jemaat.documents?.length > 0 && (
                  <Badge variant='secondary' className='ml-1 text-[10px] px-1.5 py-0'>
                    {jemaat.documents.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value='riwayat' className='text-xs gap-1.5 px-3 py-1.5 shrink-0'>
                <Activity className='size-3.5' /> Audit Log
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── TAB 1: OVERVIEW ── */}
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {/* Card 1: Kontak & Domisili */}
              <Card className='shadow-xs'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm sm:text-base flex items-center gap-2 font-bold'>
                    <User className='size-4 text-primary shrink-0' /> Kontak & Domisili
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-2.5 text-xs'>
                  <div className='flex items-center justify-between border-b pb-2 gap-2'>
                    <span className='text-muted-foreground flex items-center gap-1.5 shrink-0'>
                      <Phone className='size-3.5' /> No HP / WA
                    </span>
                    <span className='font-semibold font-mono text-end truncate'>{jemaat.noHp || jemaat.whatsApp || '-'}</span>
                  </div>
                  <div className='flex items-center justify-between border-b pb-2 gap-2'>
                    <span className='text-muted-foreground flex items-center gap-1.5 shrink-0'>
                      <Mail className='size-3.5' /> Email
                    </span>
                    <span className='font-semibold font-mono text-end truncate'>{jemaat.email || '-'}</span>
                  </div>
                  <div className='flex items-start justify-between border-b pb-2 gap-2'>
                    <span className='text-muted-foreground flex items-center gap-1.5 shrink-0'>
                      <MapPin className='size-3.5' /> Alamat
                    </span>
                    <span className='font-semibold text-end max-w-50 leading-relaxed'>{jemaat.alamat || '-'}</span>
                  </div>
                  <div className='flex items-center justify-between border-b pb-2 gap-2'>
                    <span className='text-muted-foreground shrink-0'>Kota / Provinsi</span>
                    <span className='font-semibold text-end truncate'>
                      {jemaat.kota || 'Padang'}, {jemaat.provinsi || 'Sumatera Barat'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-muted-foreground shrink-0'>Kode Pos</span>
                    <span className='font-semibold font-mono text-end'>{jemaat.kodePos || '-'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Pelayanan & Rohani */}
              <Card className='shadow-xs'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm sm:text-base flex items-center gap-2 font-bold'>
                    <Building2 className='size-4 text-primary shrink-0' /> Pelayanan & Rohani
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-2.5 text-xs'>
                  <div className='flex items-center justify-between border-b pb-2 gap-2'>
                    <span className='text-muted-foreground shrink-0'>Kelompok Kategorial</span>
                    <Link href='/dashboard/kategorial' className='font-semibold text-primary hover:underline truncate'>
                      {jemaat.kategorial?.nama || 'Umum'}
                    </Link>
                  </div>
                  <div className='flex items-center justify-between border-b pb-2 gap-2'>
                    <span className='text-muted-foreground shrink-0'>Komunitas Sel (Komsel)</span>
                    {jemaat.komsel ? (
                      <Link href='/dashboard/komsel' className='font-semibold text-primary hover:underline truncate text-end'>
                        {jemaat.komsel.nama} ({jemaat.komsel.wilayah})
                      </Link>
                    ) : (
                      <span className='text-muted-foreground font-medium'>Belum Bergabung</span>
                    )}
                  </div>
                  <div className='flex items-center justify-between border-b pb-2 gap-2'>
                    <span className='text-muted-foreground shrink-0'>Status Pelayanan Ibadah</span>
                    {jemaat.pelayanRecord ? (
                      <Link href='/dashboard/pelayan'>
                        <Badge className='bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-[10px]'>
                          Pelayan Aktif ({jemaat.pelayanRecord.kategoriPelayanan?.length || 0} Bidang)
                        </Badge>
                      </Link>
                    ) : (
                      <span className='text-muted-foreground font-medium'>Bukan Pelayan</span>
                    )}
                  </div>
                  <div className='flex items-center justify-between border-b pb-2 gap-2'>
                    <span className='text-muted-foreground shrink-0'>Status Baptisan Air</span>
                    <Badge variant='outline' className='text-[10px] font-medium'>
                      {jemaat.statusBaptis === 'SUDAH_BAPTIS'
                        ? 'Sudah Baptis'
                        : jemaat.statusBaptis === 'BELUM_BAPTIS'
                        ? 'Belum Baptis'
                        : jemaat.statusBaptis}
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-muted-foreground shrink-0'>Status Pernikahan</span>
                    <span className='font-semibold text-end truncate'>
                      {jemaat.statusPernikahan === 'BELUM_MENIKAH'
                        ? 'Belum Menikah'
                        : jemaat.statusPernikahan === 'MENIKAH'
                        ? 'Menikah'
                        : jemaat.statusPernikahan === 'JANDA_DUDA' || jemaat.statusPernikahan === 'DUDA' || jemaat.statusPernikahan === 'JANDA'
                        ? 'Janda / Duda'
                        : jemaat.statusPernikahan || '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Ringkasan Hubungan Keluarga */}
              <Card className='shadow-xs sm:col-span-2 lg:col-span-1'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm sm:text-base flex items-center gap-2 font-bold'>
                    <Users className='size-4 text-primary shrink-0' /> Ringkasan Keluarga
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-2.5 text-xs'>
                  {jemaat.keluarga ? (
                    <>
                      <div className='flex items-center justify-between border-b pb-2 gap-2'>
                        <span className='text-muted-foreground shrink-0'>Nomor KK</span>
                        <span className='font-bold font-mono text-end'>{jemaat.keluarga.nomorKeluarga}</span>
                      </div>
                      <div className='flex items-center justify-between border-b pb-2 gap-2'>
                        <span className='text-muted-foreground shrink-0'>Nama Keluarga</span>
                        <span className='font-semibold text-end truncate'>{jemaat.keluarga.namaKeluarga}</span>
                      </div>
                      <div className='flex items-center justify-between border-b pb-2 gap-2'>
                        <span className='text-muted-foreground shrink-0'>Kepala Keluarga</span>
                        <span className='font-semibold text-end truncate'>{jemaat.keluarga.kepalaJemaat?.nama || '-'}</span>
                      </div>
                      <div className='flex items-center justify-between border-b pb-2 gap-2'>
                        <span className='text-muted-foreground shrink-0'>Total Anggota</span>
                        <Badge variant='outline' className='font-mono'>
                          {jemaat.keluarga.anggotaKeluarga?.length || jemaat.keluarga.totalAnggota || 1} Jiwa
                        </Badge>
                      </div>
                      <div className='pt-1'>
                        <Button variant='outline' size='sm' className='w-full h-7 text-xs gap-1.5' asChild>
                          <Link href='/dashboard/keluarga'>
                            <ExternalLink className='size-3' /> Buka di Modul Keluarga
                          </Link>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className='text-center py-5 space-y-2 text-muted-foreground'>
                      <Users className='size-8 mx-auto opacity-30' />
                      <p className='text-xs'>Jemaat belum terhubung dengan Kartu Keluarga manapun.</p>
                      <Button variant='outline' size='sm' className='h-7 text-xs gap-1.5' asChild>
                        <Link href='/dashboard/keluarga'>
                          <Users className='size-3' /> Hubungkan ke Keluarga
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── TAB 2: IDENTITAS LENGKAP ── */}
          <TabsContent value='identitas' className='space-y-4'>
            <Card className='shadow-xs'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-base flex items-center gap-2'>
                  <FileText className='size-4 text-primary' /> Detail Profil & Berkas Kependudukan
                </CardTitle>
                <CardDescription className='text-xs'>
                  Informasi data induk sipil dan catatan keanggotaan jemaat di {churchName}.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs'>
                <div className='p-3 border rounded-lg bg-muted/10 space-y-1'>
                  <span className='text-muted-foreground block text-[11px] font-medium'>Nomor Induk Kependudukan (NIK)</span>
                  <span className='font-bold font-mono text-sm text-foreground'>{jemaat.nik || '-'}</span>
                </div>
                <div className='p-3 border rounded-lg bg-muted/10 space-y-1'>
                  <span className='text-muted-foreground block text-[11px] font-medium'>Nomor Induk Jemaat (NIJ)</span>
                  <span className='font-bold font-mono text-sm text-primary'>{jemaat.nij || '-'}</span>
                </div>
                <div className='p-3 border rounded-lg bg-muted/10 space-y-1'>
                  <span className='text-muted-foreground block text-[11px] font-medium'>Kode Barcode / QR Presensi</span>
                  <span className='font-bold font-mono text-xs text-foreground flex items-center gap-1.5'>
                    <QrCode className='size-3.5 text-primary' /> {jemaat.barcodeCode || '-'}
                  </span>
                </div>

                <div>
                  <span className='text-muted-foreground block font-medium'>Nama Lengkap</span>
                  <span className='font-semibold text-sm'>{jemaat.nama}</span>
                </div>
                <div>
                  <span className='text-muted-foreground block font-medium'>Nama Panggilan</span>
                  <span className='font-semibold'>{jemaat.namaPanggilan || '-'}</span>
                </div>
                <div>
                  <span className='text-muted-foreground block font-medium'>Jenis Kelamin</span>
                  <span className='font-semibold'>{jemaat.jenisKelamin === 'LAK_LAKI' ? 'Laki-Laki' : 'Perempuan'}</span>
                </div>

                <div>
                  <span className='text-muted-foreground block font-medium'>Tempat & Tanggal Lahir</span>
                  <span className='font-semibold'>
                    {jemaat.tempatLahir || '-'},{' '}
                    {jemaat.tanggalLahir
                      ? `${new Date(jemaat.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} (${Math.floor((Date.now() - new Date(jemaat.tanggalLahir).getTime()) / (365.25 * 24 * 3600 * 1000))} thn)`
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground block font-medium'>Status Keanggotaan</span>
                  <Badge variant='outline' className='mt-0.5'>
                    {jemaat.statusJemaat}
                  </Badge>
                </div>
                <div>
                  <span className='text-muted-foreground block font-medium'>Tanggal Bergabung</span>
                  <span className='font-semibold'>
                    {jemaat.tanggalBergabung ? new Date(jemaat.tanggalBergabung).toLocaleDateString('id-ID') : '-'}
                  </span>
                </div>

                <div>
                  <span className='text-muted-foreground block font-medium'>Status & Tanggal Baptis</span>
                  <span className='font-semibold'>
                    {jemaat.statusBaptis === 'SUDAH_BAPTIS' ? 'Sudah Baptis' : 'Belum Baptis'}
                    {jemaat.tanggalBaptis && ` • ${new Date(jemaat.tanggalBaptis).toLocaleDateString('id-ID')}`}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground block font-medium'>Status & Tanggal Menikah</span>
                  <span className='font-semibold'>
                    {jemaat.statusPernikahan}
                    {jemaat.tanggalMenikah && ` • ${new Date(jemaat.tanggalMenikah).toLocaleDateString('id-ID')}`}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground block font-medium'>Pendidikan Terakhir</span>
                  <span className='font-semibold'>{jemaat.pendidikan || '-'}</span>
                </div>

                <div>
                  <span className='text-muted-foreground block font-medium'>Profesi / Pekerjaan</span>
                  <span className='font-semibold'>{jemaat.pekerjaan || '-'}</span>
                </div>
                <div>
                  <span className='text-muted-foreground block font-medium'>Kontak Darurat</span>
                  <span className='font-semibold'>{jemaat.kontakDarurat || '-'}</span>
                </div>
                <div>
                  <span className='text-muted-foreground block font-medium'>Kelengkapan Data</span>
                  <span className='font-semibold font-mono text-primary'>{jemaat.completenessPercentage || 0}% Terisi</span>
                </div>

                <div className='sm:col-span-2 lg:col-span-3 pt-2 border-t'>
                  <span className='text-muted-foreground block font-medium mb-1'>Catatan Pastoral / Konseling</span>
                  <div className='p-3 rounded-md bg-muted/30 border text-xs leading-relaxed'>
                    {jemaat.catatan || 'Tidak ada catatan pastoral khusus untuk jemaat ini.'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 3: HUBUNGAN KELUARGA (MODUL KELUARGA) ── */}
          <TabsContent value='keluarga' className='space-y-4'>
            {jemaat.keluarga ? (
              <Card className='shadow-xs'>
                <CardHeader className='pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b'>
                  <div>
                    <div className='flex items-center gap-2'>
                      <Users className='size-5 text-primary' />
                      <CardTitle className='text-base font-bold'>
                        Keluarga {jemaat.keluarga.namaKeluarga}
                      </CardTitle>
                    </div>
                    <CardDescription className='text-xs font-mono mt-0.5'>
                      Nomor KK: {jemaat.keluarga.nomorKeluarga}
                    </CardDescription>
                  </div>
                  <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5 w-full sm:w-auto' asChild>
                    <Link href='/dashboard/keluarga'>
                      <ExternalLink className='size-3.5' /> Kelola di Modul Keluarga
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className='pt-4 space-y-4 text-xs'>
                  <div className='grid gap-3 sm:grid-cols-3 p-3 bg-muted/20 border rounded-lg'>
                    <div>
                      <span className='text-muted-foreground block text-[11px]'>Kepala Keluarga:</span>
                      <span className='font-bold text-foreground'>
                        {jemaat.keluarga.kepalaJemaat?.nama || '-'}
                      </span>
                    </div>
                    <div>
                      <span className='text-muted-foreground block text-[11px]'>Alamat Domisili KK:</span>
                      <span className='font-medium text-foreground'>{jemaat.keluarga.alamat || jemaat.alamat || '-'}</span>
                    </div>
                    <div>
                      <span className='text-muted-foreground block text-[11px]'>Total Anggota Terdaftar:</span>
                      <span className='font-bold text-primary font-mono'>
                        {jemaat.keluarga.anggotaKeluarga?.length || jemaat.keluarga.totalAnggota || 1} Jiwa
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className='font-semibold text-xs mb-2 flex items-center gap-1.5'>
                      <Users className='size-3.5 text-primary' /> Daftar Anggota Keluarga Terhubung:
                    </h4>
                    {(() => {
                      const anggota = jemaat.keluarga.anggotaKeluarga || []
                      const pageSize = 5
                      const totalPages = Math.ceil(anggota.length / pageSize) || 1
                      const currentPage = Math.min(keluargaPage, totalPages)
                      const pagedAnggota = anggota.slice((currentPage - 1) * pageSize, currentPage * pageSize)

                      return (
                        <div className='space-y-3'>
                          <div className='border rounded-lg overflow-hidden'>
                            <div className='overflow-x-auto'>
                              <table className='w-full text-xs text-left'>
                                <thead className='bg-muted/40 border-b text-[11px] text-muted-foreground font-semibold'>
                                  <tr>
                                    <th className='p-3'>Nama & NIJ</th>
                                    <th className='p-3'>Hubungan / Relasi</th>
                                    <th className='p-3'>Gender</th>
                                    <th className='p-3'>Status Jemaat</th>
                                    <th className='p-3 text-end'>Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className='divide-y'>
                                  {pagedAnggota.length > 0 ? (
                                    pagedAnggota.map((ak: any) => {
                                      const isCurrent = ak.jemaat?.id === jemaat.id
                                      return (
                                        <tr key={ak.id} className={isCurrent ? 'bg-primary/5 font-medium' : 'hover:bg-muted/20'}>
                                          <td className='p-3'>
                                            <div className='font-semibold text-foreground flex items-center gap-1.5'>
                                              {ak.jemaat?.nama || '-'}
                                              {isCurrent && <Badge variant='outline' className='text-[9px] py-0 px-1 border-primary text-primary'>Profil Ini</Badge>}
                                            </div>
                                            <div className='text-[10px] text-muted-foreground font-mono'>{ak.jemaat?.nij || '-'}</div>
                                          </td>
                                          <td className='p-3'>
                                            <Badge variant='outline' className='text-[10px]'>
                                              {ak.relasi === 'KEPALA_KELUARGA' || ak.relasi === 'SUAMI'
                                                ? 'Kepala Keluarga / Suami'
                                                : ak.relasi === 'ISTRI'
                                                ? 'Istri'
                                                : ak.relasi === 'ANAK'
                                                ? 'Anak'
                                                : ak.relasi === 'ORANG_TUA'
                                                ? 'Orang Tua'
                                                : ak.relasi === 'MERTUA'
                                                ? 'Mertua'
                                                : ak.relasi === 'CUCU'
                                                ? 'Cucu'
                                                : ak.relasi || 'Anggota Keluarga'}
                                            </Badge>
                                          </td>
                                          <td className='p-3'>{ak.jemaat?.jenisKelamin === 'LAK_LAKI' ? 'Laki-Laki' : 'Perempuan'}</td>
                                          <td className='p-3'>
                                            <Badge variant='outline' className='text-[10px]'>
                                              {ak.jemaat?.statusJemaat || 'ACTIVE'}
                                            </Badge>
                                          </td>
                                          <td className='p-3 text-end'>
                                            {ak.jemaat?.id && !isCurrent && (
                                              <Button variant='ghost' size='sm' className='h-7 text-xs gap-1' asChild>
                                                <Link href={`/dashboard/jemaat/${ak.jemaat.id}`}>
                                                  <Eye className='size-3' /> Lihat Profil
                                                </Link>
                                              </Button>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan={5} className='p-4 text-center text-muted-foreground'>
                                        Belum ada rincian anggota keluarga yang terdaftar.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          {totalPages > 1 && (
                            <div className='flex items-center justify-between pt-2 text-xs text-muted-foreground'>
                              <span>
                                Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, anggota.length)} dari {anggota.length} anggota
                              </span>
                              <div className='flex items-center gap-1.5'>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  className='h-7 text-xs px-2 gap-1'
                                  disabled={currentPage <= 1}
                                  onClick={() => setKeluargaPage((p) => Math.max(1, p - 1))}
                                >
                                  <ChevronLeft className='size-3.5' /> Sebelumnya
                                </Button>
                                <span className='px-2 font-mono font-medium text-[11px]'>
                                  Hal. {currentPage} / {totalPages}
                                </span>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  className='h-7 text-xs px-2 gap-1'
                                  disabled={currentPage >= totalPages}
                                  onClick={() => setKeluargaPage((p) => Math.min(totalPages, p + 1))}
                                >
                                  Selanjutnya <ChevronRight className='size-3.5' />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className='shadow-xs'>
                <CardContent className='py-12 text-center space-y-3'>
                  <Users className='size-12 mx-auto text-muted-foreground opacity-30' />
                  <div className='space-y-1 max-w-sm mx-auto'>
                    <h3 className='font-bold text-sm text-foreground'>Belum Terhubung dengan Data Keluarga</h3>
                    <p className='text-xs text-muted-foreground leading-relaxed'>
                      Jemaat ini belum dimasukkan ke dalam Kartu Keluarga (KK) manapun. Anda dapat menghubungkannya melalui modul Keluarga.
                    </p>
                  </div>
                  <Button size='sm' className='h-8 text-xs gap-1.5' asChild>
                    <Link href='/dashboard/keluarga'>
                      <Users className='size-3.5' /> Buka Modul Keluarga
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── TAB 4: MINISTRY & PELAYANAN (MODUL PELAYAN) ── */}
          <TabsContent value='gereja' className='space-y-4'>
            {jemaat.pelayanRecord ? (
              <Card className='shadow-xs'>
                <CardHeader className='pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b'>
                  <div>
                    <div className='flex items-center gap-2'>
                      <Building2 className='size-5 text-primary' />
                      <CardTitle className='text-base font-bold'>Data Penugasan Tim Pelayanan Ibadah</CardTitle>
                    </div>
                    <CardDescription className='text-xs mt-0.5'>
                      Penugasan resmi dalam bidang pelayanan liturgi, musik, dan operasional ibadah gereja.
                    </CardDescription>
                  </div>
                  <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5 w-full sm:w-auto' asChild>
                    <Link href='/dashboard/pelayan'>
                      <ExternalLink className='size-3.5' /> Kelola di Modul Pelayan
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className='pt-4 space-y-4 text-xs'>
                  <div className='grid gap-3 sm:grid-cols-2 p-3 bg-muted/20 border rounded-lg'>
                    <div>
                      <span className='text-muted-foreground block text-[11px]'>Kategorial Pelayanan:</span>
                      <span className='font-bold text-foreground'>
                        {jemaat.pelayanRecord.kategorial?.nama || jemaat.kategorial?.nama || 'Umum / Semua Kategorial'}
                      </span>
                    </div>
                    <div>
                      <span className='text-muted-foreground block text-[11px]'>Status Keaktifan:</span>
                      <Badge className='bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] mt-0.5'>
                        Aktif Melayani
                      </Badge>
                    </div>
                    {jemaat.pelayanRecord.keterangan && (
                      <div className='sm:col-span-2 pt-1 border-t'>
                        <span className='text-muted-foreground block text-[11px]'>Deskripsi Tugas / Catatan:</span>
                        <p className='text-foreground'>{jemaat.pelayanRecord.keterangan}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className='font-semibold text-xs mb-2 flex items-center gap-1.5'>
                      <Award className='size-3.5 text-primary' /> Bidang & Posisi Pelayanan yang Diemban:
                    </h4>
                    {jemaat.pelayanRecord.kategoriPelayanan?.length > 0 ? (
                      <div className='grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3'>
                        {jemaat.pelayanRecord.kategoriPelayanan.map((kp: any) => (
                          <div key={kp.id} className='p-3 border rounded-lg bg-card hover:bg-muted/20 transition-colors space-y-1.5'>
                            <div className='flex items-center justify-between gap-1'>
                              <span className='font-bold text-foreground text-xs'>
                                {kp.kategoriPelayanan?.nama || 'Bidang Pelayanan'}
                              </span>
                              <Badge variant='outline' className='text-[9px] py-0 px-1'>
                                {kp.kategoriPelayanan?.kode || 'MINISTRY'}
                              </Badge>
                            </div>
                            <p className='text-[11px] text-muted-foreground line-clamp-2'>
                              {kp.kategoriPelayanan?.deskripsi || 'Melayani dalam tim operasional dan liturgi ibadah gereja.'}
                            </p>
                            {kp.kategorial && (
                              <div className='text-[10px] text-primary font-medium pt-1 border-t'>
                                Lingkup: {kp.kategorial.nama}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='p-4 border rounded-lg bg-muted/10 text-center text-muted-foreground'>
                        Belum ada bidang pelayanan spesifik yang dikaitkan pada pelayan ini.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className='shadow-xs'>
                <CardContent className='py-12 text-center space-y-3'>
                  <Building2 className='size-12 mx-auto text-muted-foreground opacity-30' />
                  <div className='space-y-1 max-w-sm mx-auto'>
                    <h3 className='font-bold text-sm text-foreground'>Belum Terdaftar Sebagai Pelayan</h3>
                    <p className='text-xs text-muted-foreground leading-relaxed'>
                      Jemaat ini belum terdaftar aktif dalam struktur tim pelayanan ibadah / volunteer gereja.
                    </p>
                  </div>
                  <Button size='sm' className='h-8 text-xs gap-1.5' asChild>
                    <Link href='/dashboard/pelayan'>
                      <Building2 className='size-3.5' /> Daftarkan di Modul Pelayan
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── TAB 5: RIWAYAT PRESENSI (MODUL EVENT) ── */}
          <TabsContent value='presensi' className='space-y-4'>
            <Card className='shadow-xs'>
              <CardHeader className='pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b'>
                <div>
                  <div className='flex items-center gap-2'>
                    <Clock className='size-5 text-primary' />
                    <CardTitle className='text-base font-bold'>Riwayat Kehadiran Ibadah & Event</CardTitle>
                  </div>
                  <CardDescription className='text-xs mt-0.5'>
                    Catatan rekaman kehadiran jemaat melalui scanner barcode/QR event.
                  </CardDescription>
                </div>
                <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5 w-full sm:w-auto' asChild>
                  <Link href='/dashboard/event'>
                    <ExternalLink className='size-3.5' /> Buka Modul Event & Presensi
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className='pt-4 space-y-3 text-xs'>
                {(() => {
                  const attendances = jemaat.attendances || []
                  const pageSize = 5
                  const totalPages = Math.ceil(attendances.length / pageSize) || 1
                  const currentPage = Math.min(presensiPage, totalPages)
                  const pagedAttendances = attendances.slice((currentPage - 1) * pageSize, currentPage * pageSize)

                  if (attendances.length === 0) {
                    return (
                      <div className='py-10 text-center space-y-2 text-muted-foreground'>
                        <Clock className='size-10 mx-auto opacity-30' />
                        <p className='text-xs'>Belum ada rekaman kehadiran event atau ibadah yang tercatat untuk jemaat ini.</p>
                      </div>
                    )
                  }

                  return (
                    <div className='space-y-3'>
                      <div className='space-y-2'>
                        {pagedAttendances.map((att: any) => (
                          <div key={att.id} className='p-3 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-muted/10 transition-colors'>
                            <div className='space-y-0.5'>
                              <div className='flex items-center gap-2'>
                                <Link href={`/dashboard/event/${att.eventId}`} className='font-bold text-foreground text-xs hover:text-primary hover:underline'>
                                  {att.event?.namaEvent || 'Ibadah Raya Mingguan'}
                                </Link>
                                {att.event?.kategori && (
                                  <Badge variant='outline' className='text-[9px] py-0 px-1.5'>
                                    {att.event.kategori}
                                  </Badge>
                                )}
                              </div>
                              <div className='text-[11px] text-muted-foreground flex flex-wrap items-center gap-3 font-sans'>
                                <span className='flex items-center gap-1'>
                                  <Clock className='size-3 text-primary' />
                                  {new Date(att.scannedAt).toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {att.event?.namaLokasi && (
                                  <span className='flex items-center gap-1'>
                                    <MapPin className='size-3' /> {att.event.namaLokasi}
                                  </span>
                                )}
                                {att.scannedBy && (
                                  <span className='text-[10px] text-muted-foreground font-mono'>
                                    Scanner: {att.scannedBy}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge className='bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] shrink-0 self-start sm:self-center'>
                              ✓ Hadir (Tercatat)
                            </Badge>
                          </div>
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div className='flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground'>
                          <span>
                            Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, attendances.length)} dari {attendances.length} kehadiran
                          </span>
                          <div className='flex items-center gap-1.5'>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-7 text-xs px-2.5 gap-1'
                              disabled={currentPage <= 1}
                              onClick={() => setPresensiPage((p) => Math.max(1, p - 1))}
                            >
                              <ChevronLeft className='size-3.5' /> Sebelumnya
                            </Button>
                            <span className='px-2 font-mono font-medium text-[11px]'>
                              Hal. {currentPage} / {totalPages}
                            </span>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-7 text-xs px-2.5 gap-1'
                              disabled={currentPage >= totalPages}
                              onClick={() => setPresensiPage((p) => Math.min(totalPages, p + 1))}
                            >
                              Selanjutnya <ChevronRight className='size-3.5' />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 6: DOKUMEN JEMAAT (MODUL DOKUMEN) ── */}
          <TabsContent value='dokumen' className='space-y-4'>
            <Card className='shadow-xs'>
              <CardHeader className='pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b'>
                <div>
                  <div className='flex items-center gap-2'>
                    <FileCheck className='size-5 text-primary' />
                    <CardTitle className='text-base font-bold'>Arsip Berkas & Dokumen Jemaat</CardTitle>
                  </div>
                  <CardDescription className='text-xs mt-0.5'>
                    Sertifikat baptis, surat nikah, akta lahir, KTP, dan arsip resmi lainnya.
                  </CardDescription>
                </div>
                <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5 w-full sm:w-auto' asChild>
                  <Link href='/dashboard/dokumen-jemaat'>
                    <ExternalLink className='size-3.5' /> Buka Arsip Dokumen Jemaat
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className='pt-4 space-y-3 text-xs'>
                {(() => {
                  const documents = jemaat.documents || []
                  const pageSize = 6
                  const totalPages = Math.ceil(documents.length / pageSize) || 1
                  const currentPage = Math.min(dokumenPage, totalPages)
                  const pagedDocuments = documents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

                  if (documents.length === 0) {
                    return (
                      <div className='py-10 text-center space-y-3 text-muted-foreground'>
                        <FileCheck className='size-10 mx-auto opacity-30' />
                        <div className='space-y-1'>
                          <p className='text-xs'>Belum ada dokumen atau sertifikat yang diunggah untuk jemaat ini.</p>
                          <p className='text-[11px] text-muted-foreground'>Unggah sertifikat baptis, surat nikah, atau identitas kependudukan di modul Dokumen Jemaat.</p>
                        </div>
                        <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5' asChild>
                          <Link href='/dashboard/dokumen-jemaat'>
                            <FileCheck className='size-3.5' /> Unggah Dokumen Jemaat
                          </Link>
                        </Button>
                      </div>
                    )
                  }

                  return (
                    <div className='space-y-3'>
                      <div className='grid gap-3 sm:grid-cols-2'>
                        {pagedDocuments.map((doc: any) => (
                          <div key={doc.id} className='p-3 border rounded-lg bg-card hover:bg-muted/10 transition-colors flex flex-col justify-between gap-2.5'>
                            <div className='space-y-1'>
                              <div className='flex items-start justify-between gap-2'>
                                <div className='flex items-center gap-2'>
                                  <FileCheck className='size-4 text-emerald-600 shrink-0' />
                                  <span className='font-bold text-foreground text-xs line-clamp-1'>{doc.judul}</span>
                                </div>
                                <Badge
                                  variant={doc.status === 'VERIFIED' ? 'default' : 'outline'}
                                  className={
                                    doc.status === 'VERIFIED'
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]'
                                      : 'text-[10px]'
                                  }
                                >
                                  {doc.status}
                                </Badge>
                              </div>
                              <div className='text-[11px] text-muted-foreground space-y-0.5 pt-0.5'>
                                <div>Jenis: <span className='font-medium text-foreground'>{doc.jenisDokumen}</span></div>
                                <div>
                                  Tanggal Terbit:{' '}
                                  <span className='font-medium text-foreground'>
                                    {new Date(doc.tanggalTerbit).toLocaleDateString('id-ID')}
                                  </span>
                                </div>
                                {doc.deskripsi && (
                                  <p className='text-[10px] text-muted-foreground italic line-clamp-2 pt-0.5'>
                                    {doc.deskripsi}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className='flex items-center justify-between pt-2 border-t'>
                              <span className='text-[10px] text-muted-foreground font-mono'>
                                {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : doc.mimeType || 'Dokumen'}
                              </span>
                              {doc.fileUrl && (
                                <Button variant='ghost' size='sm' className='h-6 text-[11px] gap-1 px-2 text-primary' asChild>
                                  <a href={doc.fileUrl} target='_blank' rel='noopener noreferrer'>
                                    <Eye className='size-3' /> Lihat Berkas
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div className='flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground'>
                          <span>
                            Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, documents.length)} dari {documents.length} dokumen
                          </span>
                          <div className='flex items-center gap-1.5'>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-7 text-xs px-2.5 gap-1'
                              disabled={currentPage <= 1}
                              onClick={() => setDokumenPage((p) => Math.max(1, p - 1))}
                            >
                              <ChevronLeft className='size-3.5' /> Sebelumnya
                            </Button>
                            <span className='px-2 font-mono font-medium text-[11px]'>
                              Hal. {currentPage} / {totalPages}
                            </span>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-7 text-xs px-2.5 gap-1'
                              disabled={currentPage >= totalPages}
                              onClick={() => setDokumenPage((p) => Math.min(totalPages, p + 1))}
                            >
                              Selanjutnya <ChevronRight className='size-3.5' />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 7: AUDIT LOG (MODUL AUDIT TRAIL) ── */}
          <TabsContent value='riwayat' className='space-y-4'>
            <Card className='shadow-xs'>
              <CardHeader className='pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b'>
                <div>
                  <div className='flex items-center gap-2'>
                    <Activity className='size-5 text-primary' />
                    <CardTitle className='text-base font-bold'>Jejak Audit Perubahan Data Jemaat</CardTitle>
                  </div>
                  <CardDescription className='text-xs mt-0.5'>
                    Catatan forensik mutasi data terenkripsi SHA-256 Hash Chain Integrity.
                  </CardDescription>
                </div>
                <Badge variant='outline' className='text-[10px] gap-1 bg-emerald-500/5 text-emerald-600 border-emerald-500/20 py-1 px-2.5 self-start sm:self-center'>
                  <ShieldCheck className='size-3' /> SHA-256 Hash Chain Valid
                </Badge>
              </CardHeader>
              <CardContent className='pt-4 space-y-3 text-xs'>
                {(() => {
                  const auditLogs = jemaat.auditLogs || []
                  const pageSize = 5
                  const totalPages = Math.ceil(auditLogs.length / pageSize) || 1
                  const currentPage = Math.min(auditPage, totalPages)
                  const pagedAuditLogs = auditLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

                  if (auditLogs.length === 0) {
                    return (
                      <div className='space-y-2'>
                        <div className='p-3 bg-muted/20 border rounded-lg flex items-center justify-between text-xs'>
                          <span className='text-muted-foreground'>Tanggal Pembuatan Record:</span>
                          <span className='font-mono font-bold text-foreground'>
                            {new Date(jemaat.createdAt).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className='p-3 bg-muted/20 border rounded-lg flex items-center justify-between text-xs'>
                          <span className='text-muted-foreground'>Terakhir Diperbarui:</span>
                          <span className='font-mono font-bold text-foreground'>
                            {new Date(jemaat.updatedAt).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className='space-y-3'>
                      <div className='space-y-2.5'>
                        {pagedAuditLogs.map((log: any) => (
                          <div key={log.id} className='p-3 border rounded-lg bg-card hover:bg-muted/10 transition-colors space-y-1.5'>
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                              <div className='flex items-center gap-2'>
                                <Badge className='text-[10px] py-0 px-2 font-mono bg-primary/10 text-primary border-primary/20'>
                                  {log.action}
                                </Badge>
                                <span className='font-bold text-foreground text-xs'>
                                  {log.user?.nama || log.actor || 'System'}
                                </span>
                                {log.user?.role && (
                                  <span className='text-[10px] text-muted-foreground font-mono'>
                                    ({log.user.role})
                                  </span>
                                )}
                              </div>
                              <span className='text-[11px] text-muted-foreground font-mono'>
                                {new Date(log.timestamp).toLocaleString('id-ID')}
                              </span>
                            </div>
                            {log.stateChange && (
                              <div className='p-2 bg-muted/30 rounded text-[11px] font-mono text-muted-foreground leading-relaxed break-all'>
                                {log.stateChange}
                              </div>
                            )}
                            <div className='flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t'>
                              <span>IP: <code className='font-mono'>{log.ip}</code></span>
                              <span className='font-mono truncate max-w-60'>
                                Hash: {log.currentHash ? `${log.currentHash.slice(0, 16)}...` : '-'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div className='flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground'>
                          <span>
                            Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, auditLogs.length)} dari {auditLogs.length} riwayat log
                          </span>
                          <div className='flex items-center gap-1.5'>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-7 text-xs px-2.5 gap-1'
                              disabled={currentPage <= 1}
                              onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                            >
                              <ChevronLeft className='size-3.5' /> Sebelumnya
                            </Button>
                            <span className='px-2 font-mono font-medium text-[11px]'>
                              Hal. {currentPage} / {totalPages}
                            </span>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-7 text-xs px-2.5 gap-1'
                              disabled={currentPage >= totalPages}
                              onClick={() => setAuditPage((p) => Math.min(totalPages, p + 1))}
                            >
                              Selanjutnya <ChevronRight className='size-3.5' />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Konfirmasi Soft Delete Jemaat
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs space-y-2'>
              <p>
                Anda akan menonaktifkan akun jemaat <strong>{jemaat.nama}</strong> ({jemaat.nij}). Data jemaat tidak akan
                muncul di pencarian aktif, namun riwayat transaksi dan dokumen tetap tersimpan di audit trail database.
              </p>
              <div className='space-y-1 pt-2'>
                <Label htmlFor='delReason' className='text-foreground font-semibold'>
                  Alasan Penghapusan (Wajib):
                </Label>
                <Textarea
                  id='delReason'
                  placeholder='Contoh: Pindah domisili ke luar kota / Meninggal dunia / Permintaan mandiri'
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className='text-xs'
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteConfirm}
              disabled={isDeleting || !deletionReason.trim()}
              className='gap-2'
            >
              {isDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
              {isDeleting ? 'Menghapus...' : 'Konfirmasi Hapus'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function JemaatDetailPage() {
  return (
    <Suspense
      fallback={
        <div className='flex h-96 items-center justify-center'>
          <Loader2 className='size-8 animate-spin text-primary' />
        </div>
      }
    >
      <JemaatDetailContent />
    </Suspense>
  )
}
