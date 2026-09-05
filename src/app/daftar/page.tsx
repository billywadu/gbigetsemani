'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  UserPlus,
  Users,
  User,
  CheckCircle2,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Loader2,
  Trash2,
  Plus,
  Upload,
  FileCheck,
  FileText,
  RotateCcw,
  Check,
  FileUp,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { submitPendaftaranMandiriAction, uploadKkRegistrationAction } from '@/actions/pendaftaran'
import { getAppProfileAction } from '@/actions/app-profile'
import { AppProfileConfig, DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'
import { AnggotaKeluargaItem, RelasiKeluarga } from '@/lib/validations/pendaftaran'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { toast } from 'sonner'

type MetodeKeluarga = 'NONE' | 'UPLOAD_KK' | 'MANUAL_INPUT'

export default function PublicDaftarPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrantName, setRegistrantName] = useState('')
  const [profile, setProfile] = useState<AppProfileConfig>(DEFAULT_APP_PROFILE_CONFIG)
  const [isSamePhone, setIsSamePhone] = useState(false)

  // Honeypot Field (Anti-Bot Trap)
  const [honeypot, setHoneypot] = useState('')

  // Load Church Branding
  useEffect(() => {
    let isMounted = true
    async function loadProfile() {
      const res = await getAppProfileAction()
      if (res.success && res.data && isMounted) {
        setProfile(res.data)
      }
    }
    loadProfile()
    return () => {
      isMounted = false
    }
  }, [])

  // Primary Registrant Form State
  const [formData, setFormData] = useState({
    nama: '',
    namaPanggilan: '',
    jenisKelamin: 'LAK_LAKI' as 'LAK_LAKI' | 'PEREMPUAN',
    tempatLahir: '',
    tanggalLahir: '',
    noHp: '',
    whatsApp: '',
    email: '',
    alamat: '',
    statusPernikahan: 'BELUM_MENIKAH' as any,
    pekerjaan: '',
    nomorKk: '',
  })

  // Family Method Selection
  const [metodeKeluarga, setMetodeKeluarga] = useState<MetodeKeluarga>('NONE')

  // KK Document Upload State
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const [docFile, setDocFile] = useState<{
    fileUrl: string
    fileSize: number
    mimeType: string
    name: string
  } | null>(null)

  // Dynamic Family Members State (Manual Entry)
  const [anggotaList, setAnggotaList] = useState<AnggotaKeluargaItem[]>([])

  // Agreement Checkbox
  const [agreed, setAgreed] = useState(false)

  // Reset Form
  const resetForm = () => {
    setFormData({
      nama: '',
      namaPanggilan: '',
      jenisKelamin: 'LAK_LAKI',
      tempatLahir: '',
      tanggalLahir: '',
      noHp: '',
      whatsApp: '',
      email: '',
      alamat: '',
      statusPernikahan: 'BELUM_MENIKAH',
      pekerjaan: '',
      nomorKk: '',
    })
    setMetodeKeluarga('NONE')
    setDocFile(null)
    setAnggotaList([])
    setSubmitted(false)
    setRegistrantName('')
    setAgreed(false)
    setIsSamePhone(false)
  }

  // Handle KK Document Upload
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran berkas KK maksimal 5 MB.')
      return
    }

    const uploadData = new FormData()
    uploadData.append('file', file)

    setIsUploadingDoc(true)
    const res = await uploadKkRegistrationAction(uploadData)
    setIsUploadingDoc(false)

    if (res.success && res.data) {
      setDocFile({
        fileUrl: res.data.fileUrl,
        fileSize: res.data.fileSize,
        mimeType: res.data.mimeType,
        name: file.name,
      })
      toast.success('Foto Kartu Keluarga berhasil diunggah.')
    } else {
      toast.error(res.error || 'Gagal mengunggah berkas KK.')
    }
  }

  // Add Family Member Item
  const handleAddMember = () => {
    const newMember: AnggotaKeluargaItem = {
      id: crypto.randomUUID(),
      nama: '',
      namaPanggilan: '',
      hubungan: 'ANAK',
      jenisKelamin: 'LAK_LAKI',
      statusPernikahan: 'BELUM_MENIKAH',
      tempatLahir: '',
      tanggalLahir: '',
      statusBaptis: 'BELUM_BAPTIS',
      noHp: '',
      email: '',
      pekerjaan: '',
    }
    setAnggotaList((prev) => [...prev, newMember])
  }

  // Update Member Item
  const handleUpdateMember = (index: number, field: keyof AnggotaKeluargaItem, value: any) => {
    setAnggotaList((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Remove Member Item
  const handleRemoveMember = (index: number) => {
    setAnggotaList((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit Final Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nama.trim()) {
      toast.error('Nama lengkap wajib diisi.')
      return
    }
    if (!formData.whatsApp.trim() && !formData.noHp.trim()) {
      toast.error('Nomor WhatsApp atau HP wajib diisi.')
      return
    }
    if (!formData.alamat.trim()) {
      toast.error('Alamat domisili wajib diisi.')
      return
    }

    if (metodeKeluarga === 'MANUAL_INPUT') {
      if (anggotaList.length === 0) {
        toast.error('Silakan tambahkan minimal 1 anggota keluarga atau ubah pilihan ke Tanpa Data Keluarga.')
        return
      }
      for (let i = 0; i < anggotaList.length; i++) {
        if (!anggotaList[i].nama.trim()) {
          toast.error(`Nama anggota keluarga #${i + 1} belum diisi.`)
          return
        }
      }
    }

    if (!agreed) {
      toast.error('Silakan centang persetujuan kebenaran data.')
      return
    }

    const isFamily = metodeKeluarga !== 'NONE'

    const sanitizedAnggota =
      metodeKeluarga === 'MANUAL_INPUT'
        ? anggotaList.map((m) => ({
            ...m,
            nama: m.nama.trim(),
            namaPanggilan: m.namaPanggilan?.trim() || null,
            hubungan: m.hubungan || 'ANAK',
            jenisKelamin: m.jenisKelamin || 'LAK_LAKI',
            statusPernikahan: m.statusPernikahan || 'BELUM_MENIKAH',
            statusBaptis: m.statusBaptis || 'BELUM_BAPTIS',
            tempatLahir: m.tempatLahir?.trim() || null,
            tanggalLahir: m.tanggalLahir || null,
            noHp: m.noHp?.trim() || null,
            email: m.email?.trim() || null,
            pekerjaan: m.pekerjaan?.trim() || null,
          }))
        : []

    setIsSubmitting(true)
    const res = await submitPendaftaranMandiriAction({
      website: honeypot,
      tipePendaftaran: 'PRIBADI',
      nama: formData.nama.trim(),
      namaPanggilan: formData.namaPanggilan.trim() || null,
      jenisKelamin: formData.jenisKelamin,
      tempatLahir: formData.tempatLahir.trim() || null,
      tanggalLahir: formData.tanggalLahir || null,
      noHp: formData.noHp.trim() || null,
      whatsApp: formData.whatsApp.trim() || null,
      email: formData.email.trim() || null,
      alamat: formData.alamat.trim() || null,
      statusPernikahan: formData.statusPernikahan,
      pekerjaan: formData.pekerjaan.trim() || null,
      namaKeluarga: null,
      nomorKk: formData.nomorKk?.trim() || null,
      kkFileUrl: metodeKeluarga === 'UPLOAD_KK' ? docFile?.fileUrl || null : null,
      kkFileSize: metodeKeluarga === 'UPLOAD_KK' ? docFile?.fileSize || null : null,
      anggotaKeluarga: sanitizedAnggota,
    })
    setIsSubmitting(false)

    if (res.success) {
      setRegistrantName(formData.nama.trim())
      setSubmitted(true)
      toast.success(
        isFamily
          ? 'Pendaftaran data keluarga Anda berhasil dikirim.'
          : 'Pendaftaran Anda berhasil dikirim.'
      )
    } else {
      toast.error(res.error || 'Gagal mengirim pendaftaran.')
    }
  }

  const getAge = (dateStr?: string | null) => {
    if (!dateStr) return null
    const birthDate = new Date(dateStr)
    if (isNaN(birthDate.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className='min-h-svh bg-background text-foreground flex flex-col'>
      <PublicHeader initialProfile={profile} />

      <main className='flex-1 p-3 sm:p-6 max-w-xl mx-auto w-full space-y-4'>
        {submitted ? (
          <Card className='border-emerald-500/30 bg-card shadow-xs animate-in zoom-in-95 duration-200'>
            <CardHeader className='text-center pb-3 pt-5 px-4'>
              <div className='size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2'>
                <CheckCircle2 className='size-7' />
              </div>
              <Badge className='bg-emerald-600 text-white text-[10px] w-fit mx-auto mb-1'>
                PENDAFTARAN DITERIMA
              </Badge>
              <CardTitle className='text-xl font-bold text-foreground'>
                Pendaftaran Berhasil Dikirim
              </CardTitle>
              <CardDescription className='text-xs text-muted-foreground pt-0.5 leading-relaxed'>
                Terima kasih, <strong className='text-foreground'>{registrantName}</strong>. Formulir Anda telah masuk ke antrean verifikasi Sekretariat {profile.namaSingkat}.
              </CardDescription>
            </CardHeader>

            <CardContent className='space-y-4 px-4 sm:px-6 text-xs'>
              {/* Summary Card */}
              <div className='p-3 rounded-lg border bg-muted/20 space-y-2 text-[11px]'>
                <div className='font-bold text-foreground flex items-center gap-1.5 border-b pb-1.5'>
                  <ShieldCheck className='size-3.5 text-primary' /> Ringkasan Pendaftaran
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-1.5'>
                  <div>
                    <span className='text-muted-foreground'>Nama:</span>{' '}
                    <span className='font-semibold text-foreground'>{formData.nama}</span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>WhatsApp:</span>{' '}
                    <span className='font-mono font-semibold text-foreground'>{formData.whatsApp || formData.noHp}</span>
                  </div>
                  <div className='sm:col-span-2'>
                    <span className='text-muted-foreground'>Alamat:</span>{' '}
                    <span className='text-foreground'>{formData.alamat}</span>
                  </div>
                  {metodeKeluarga === 'UPLOAD_KK' && docFile && (
                    <div className='sm:col-span-2'>
                      <span className='text-muted-foreground'>Lampiran KK:</span>{' '}
                      <span className='font-mono text-emerald-600 font-medium'>✓ {docFile.name}</span>
                    </div>
                  )}
                  {metodeKeluarga === 'MANUAL_INPUT' && anggotaList.length > 0 && (
                    <div className='sm:col-span-2'>
                      <span className='text-muted-foreground'>Anggota Tambahan:</span>{' '}
                      <span className='font-semibold text-primary'>{anggotaList.length} Orang Terdaftar</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Steps Info */}
              <div className='p-3 bg-muted/30 rounded-lg border space-y-2 text-[11px]'>
                <div className='font-bold text-foreground text-center uppercase tracking-wide text-[10px]'>
                  Tahap Verifikasi Sekretariat
                </div>
                <div className='grid grid-cols-3 gap-2 text-center text-[10px]'>
                  <div className='p-2 rounded bg-card border'>
                    <div className='font-bold text-primary'>1. Tinjau</div>
                    <span className='text-muted-foreground'>Antrean data</span>
                  </div>
                  <div className='p-2 rounded bg-card border'>
                    <div className='font-bold text-foreground'>2. Verifikasi</div>
                    <span className='text-muted-foreground'>Validasi berkas</span>
                  </div>
                  <div className='p-2 rounded bg-card border'>
                    <div className='font-bold text-foreground'>3. Terbit NIJ</div>
                    <span className='text-muted-foreground'>Penerbitan kartu</span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className='flex flex-col sm:flex-row items-center justify-center gap-2 pt-1 pb-5 px-4'>
              <Button variant='outline' size='sm' onClick={resetForm} className='w-full sm:w-auto gap-1.5 text-xs h-8'>
                <RotateCcw className='size-3.5' /> Daftar Baru
              </Button>
              <Button asChild size='sm' className='w-full sm:w-auto text-xs h-8'>
                <Link href='/'>Beranda Gereja</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className='shadow-xs bg-card'>
            <form onSubmit={handleSubmit}>
              {/* Anti-Bot Honeypot */}
              <input
                type='text'
                name='website'
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ display: 'none', position: 'absolute', left: '-9999px' }}
                tabIndex={-1}
                autoComplete='off'
              />

              <CardHeader className='pb-3 pt-5 px-4 sm:px-6'>
                <div className='flex items-center gap-2'>
                  <div className='p-2 bg-primary/10 text-primary rounded-lg shrink-0'>
                    <UserPlus className='size-5' />
                  </div>
                  <div>
                    <CardTitle className='text-base sm:text-lg font-bold'>Formulir Calon Jemaat</CardTitle>
                    <CardDescription className='text-xs'>
                      Isi data diri Anda secara lengkap dan akurat. Tanda (*) wajib diisi.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className='space-y-4 px-4 sm:px-6 text-xs'>
                {/* ── BAGIAN 1: DATA PRIBADI ── */}
                <div className='space-y-4'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4'>
                    {/* Nama Lengkap — full width */}
                    <div className='space-y-1.5 sm:col-span-2'>
                      <Label className='text-xs font-semibold text-foreground'>Nama Lengkap (Sesuai KTP) *</Label>
                      <Input
                        placeholder='Contoh: Andreas Wijaya'
                        value={formData.nama}
                        onChange={(e) => setFormData((p) => ({ ...p, nama: e.target.value }))}
                        className='text-xs h-9'
                        required
                      />
                    </div>

                    {/* Nama Panggilan */}
                    <div className='space-y-1.5 sm:col-span-1'>
                      <Label className='text-xs font-semibold text-foreground'>Nama Panggilan</Label>
                      <Input
                        placeholder='Contoh: Andre'
                        value={formData.namaPanggilan}
                        onChange={(e) => setFormData((p) => ({ ...p, namaPanggilan: e.target.value }))}
                        className='text-xs h-9'
                      />
                    </div>

                    {/* Jenis Kelamin */}
                    <div className='space-y-1.5 sm:col-span-1'>
                      <Label className='text-xs font-semibold text-foreground'>Jenis Kelamin *</Label>
                      <Select
                        value={formData.jenisKelamin}
                        onValueChange={(val) => setFormData((p) => ({ ...p, jenisKelamin: val as any }))}
                      >
                        <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value='LAK_LAKI' className='text-xs'>Laki-Laki</SelectItem>
                          <SelectItem value='PEREMPUAN' className='text-xs'>Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Pernikahan */}
                    <div className='space-y-1.5 sm:col-span-1'>
                      <Label className='text-xs font-semibold text-foreground'>Status Pernikahan</Label>
                      <Select
                        value={formData.statusPernikahan}
                        onValueChange={(val) => setFormData((p) => ({ ...p, statusPernikahan: val as any }))}
                      >
                        <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value='BELUM_MENIKAH' className='text-xs'>Belum Menikah</SelectItem>
                          <SelectItem value='MENIKAH' className='text-xs'>Menikah</SelectItem>
                          <SelectItem value='DUDA' className='text-xs'>Duda</SelectItem>
                          <SelectItem value='JANDA' className='text-xs'>Janda</SelectItem>
                          <SelectItem value='BERCERAI' className='text-xs'>Bercerai</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tempat Lahir */}
                    <div className='space-y-1.5 sm:col-span-1'>
                      <Label className='text-xs font-semibold text-foreground'>Tempat Lahir</Label>
                      <Input
                        placeholder='Contoh: Padang'
                        value={formData.tempatLahir}
                        onChange={(e) => setFormData((p) => ({ ...p, tempatLahir: e.target.value }))}
                        className='text-xs h-9'
                      />
                    </div>

                    {/* Tanggal Lahir */}
                    <div className='space-y-1.5 sm:col-span-1'>
                      <div className='flex items-center justify-between'>
                        <Label className='text-xs font-semibold text-foreground'>Tanggal Lahir</Label>
                        {formData.tanggalLahir && getAge(formData.tanggalLahir) !== null && (
                          <span className='text-[10px] font-mono text-primary font-semibold'>
                            {getAge(formData.tanggalLahir)} Tahun
                          </span>
                        )}
                      </div>
                      <Input
                        type='date'
                        value={formData.tanggalLahir}
                        onChange={(e) => setFormData((p) => ({ ...p, tanggalLahir: e.target.value }))}
                        className='text-xs h-9'
                      />
                    </div>

                    {/* Profesi / Pekerjaan */}
                    <div className='space-y-1.5 sm:col-span-1'>
                      <Label className='text-xs font-semibold text-foreground'>Profesi / Pekerjaan</Label>
                      <Input
                        placeholder='Contoh: Wiraswasta / Karyawan'
                        value={formData.pekerjaan}
                        onChange={(e) => setFormData((p) => ({ ...p, pekerjaan: e.target.value }))}
                        className='text-xs h-9'
                      />
                    </div>

                    {/* Nomor WhatsApp */}
                    <div className='space-y-1.5 sm:col-span-1'>
                      <Label htmlFor='whatsApp' className='text-xs font-semibold text-foreground'>Nomor WhatsApp (Aktif) *</Label>
                      <Input
                        id='whatsApp'
                        placeholder='Contoh: 081234567890'
                        value={formData.whatsApp}
                        onChange={(e) => {
                          const val = e.target.value
                          setFormData((p) => ({
                            ...p,
                            whatsApp: val,
                            ...(isSamePhone ? { noHp: val } : {}),
                          }))
                        }}
                        className='text-xs h-9 font-mono'
                        required
                      />
                    </div>

                    {/* Nomor Handphone */}
                    <div className='space-y-1.5 sm:col-span-1'>
                      <Label htmlFor='noHp' className='text-xs font-semibold text-foreground'>Nomor Handphone (Telepon)</Label>
                      <Input
                        id='noHp'
                        placeholder='Contoh: 081234567890'
                        value={formData.noHp}
                        disabled={isSamePhone}
                        onChange={(e) => setFormData((p) => ({ ...p, noHp: e.target.value }))}
                        className={`text-xs h-9 font-mono transition-colors ${isSamePhone ? 'bg-muted/60 text-muted-foreground' : ''}`}
                      />
                    </div>

                    {/* Checkbox Samakan Nomor — full width */}
                    <div className='sm:col-span-2 pt-0.5'>
                      <label
                        htmlFor='samePhone'
                        className='flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none transition-colors'
                      >
                        <Checkbox
                          id='samePhone'
                          checked={isSamePhone}
                          onCheckedChange={(checked) => {
                            const val = !!checked
                            setIsSamePhone(val)
                            if (val) {
                              setFormData((p) => ({ ...p, noHp: p.whatsApp }))
                            }
                          }}
                        />
                        <span>Nomor Handphone sama dengan Nomor WhatsApp</span>
                      </label>
                    </div>

                    {/* Email — full width */}
                    <div className='space-y-1.5 sm:col-span-2'>
                      <Label className='text-xs font-semibold text-foreground'>Email (Opsional)</Label>
                      <Input
                        type='email'
                        placeholder='nama@email.com'
                        value={formData.email}
                        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                        className='text-xs h-9'
                      />
                    </div>

                    {/* Alamat Lengkap — full width */}
                    <div className='space-y-1.5 sm:col-span-2'>
                      <Label className='text-xs font-semibold text-foreground'>Alamat Domisili Lengkap *</Label>
                      <Textarea
                        placeholder='Tuliskan jalan, nomor rumah, RT/RW, kelurahan, kecamatan di Kota Padang...'
                        value={formData.alamat}
                        onChange={(e) => setFormData((p) => ({ ...p, alamat: e.target.value }))}
                        className='text-xs min-h-20 leading-relaxed'
                        required
                      />
                    </div>
                  </div>
                </div>


                {/* ── BAGIAN 2: PILIHAN DATA KELUARGA (OPSIONAL: UPLOAD KK ATAU INPUT MANUAL) ── */}
                <div className='pt-3 border-t space-y-3'>
                  <div className='space-y-1'>
                    <Label className='text-xs font-bold text-foreground flex items-center gap-1.5'>
                      <Users className='size-3.5 text-primary' /> Pilihan Data Keluarga (Opsional)
                    </Label>
                    <p className='text-[11px] text-muted-foreground'>
                      Pilih cara jika ingin mendaftarkan keluarga bersama Anda:
                    </p>
                  </div>

                  {/* 3 Choice Buttons */}
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                    {/* Choice 1: Tanpa Data Keluarga */}
                    <button
                      type='button'
                      onClick={() => setMetodeKeluarga('NONE')}
                      className={`p-2.5 rounded-lg border text-start transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        metodeKeluarga === 'NONE'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border bg-card hover:bg-muted/20'
                      }`}
                    >
                      <div className='flex items-center justify-between'>
                        <span className='font-bold text-[11px] text-foreground flex items-center gap-1'>
                          <User className='size-3 text-muted-foreground' /> Pribadi Saja
                        </span>
                        {metodeKeluarga === 'NONE' && (
                          <div className='size-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px]'>
                            ✓
                          </div>
                        )}
                      </div>
                      <span className='text-[10px] text-muted-foreground leading-tight'>
                        Tanpa data keluarga tambahan
                      </span>
                    </button>

                    {/* Choice 2: Upload KK */}
                    <button
                      type='button'
                      onClick={() => setMetodeKeluarga('UPLOAD_KK')}
                      className={`p-2.5 rounded-lg border text-start transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        metodeKeluarga === 'UPLOAD_KK'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border bg-card hover:bg-muted/20'
                      }`}
                    >
                      <div className='flex items-center justify-between'>
                        <span className='font-bold text-[11px] text-foreground flex items-center gap-1'>
                          <FileUp className='size-3 text-primary' /> Upload Foto KK
                        </span>
                        {metodeKeluarga === 'UPLOAD_KK' && (
                          <div className='size-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px]'>
                            ✓
                          </div>
                        )}
                      </div>
                      <span className='text-[10px] text-muted-foreground leading-tight'>
                        Lampirkan foto Kartu Keluarga
                      </span>
                    </button>

                    {/* Choice 3: Input Manual */}
                    <button
                      type='button'
                      onClick={() => {
                        setMetodeKeluarga('MANUAL_INPUT')
                        if (anggotaList.length === 0) {
                          handleAddMember()
                        }
                      }}
                      className={`p-2.5 rounded-lg border text-start transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        metodeKeluarga === 'MANUAL_INPUT'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border bg-card hover:bg-muted/20'
                      }`}
                    >
                      <div className='flex items-center justify-between'>
                        <span className='font-bold text-[11px] text-foreground flex items-center gap-1'>
                          <Users className='size-3 text-primary' /> Isi Manual
                        </span>
                        {metodeKeluarga === 'MANUAL_INPUT' && (
                          <div className='size-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px]'>
                            ✓
                          </div>
                        )}
                      </div>
                      <span className='text-[10px] text-muted-foreground leading-tight'>
                        Ketik nama anggota keluarga
                      </span>
                    </button>
                  </div>

                  {/* ── PANELS BASED ON CHOICE ── */}

                  {/* Panel A: Upload KK */}
                  {metodeKeluarga === 'UPLOAD_KK' && (
                    <div className='p-3 rounded-xl border bg-card shadow-2xs space-y-3 animate-in fade-in-50 duration-150'>
                      <div className='space-y-1.5'>
                        <Label className='text-xs font-semibold text-foreground'>Nomor Kartu Keluarga (Opsional)</Label>
                        <Input
                          placeholder='16 digit nomor KK jika ada'
                          value={formData.nomorKk}
                          onChange={(e) => setFormData((p) => ({ ...p, nomorKk: e.target.value }))}
                          className='text-xs h-9 font-mono'
                          maxLength={20}
                        />
                      </div>

                      <div className='p-3 rounded-lg border border-dashed bg-muted/20 space-y-2'>
                        <div className='flex items-center justify-between text-[11px]'>
                          <span className='font-semibold text-foreground flex items-center gap-1.5'>
                            <FileText className='size-3.5 text-primary' /> Foto / Berkas Kartu Keluarga (KK) *
                          </span>
                          <span className='text-[10px] text-muted-foreground'>Maks. 5MB</span>
                        </div>

                        {docFile ? (
                          <div className='p-2.5 rounded-lg bg-card border flex items-center justify-between gap-2 text-xs'>
                            <div className='flex items-center gap-2 min-w-0'>
                              <FileCheck className='size-4 text-emerald-600 shrink-0' />
                              <span className='truncate font-medium text-xs'>{docFile.name}</span>
                            </div>
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='h-7 text-xs text-rose-600 hover:text-rose-700'
                              onClick={() => setDocFile(null)}
                            >
                              <Trash2 className='size-3 mr-1' /> Hapus
                            </Button>
                          </div>
                        ) : (
                          <label className='border rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-card hover:bg-muted/30 transition-colors'>
                            {isUploadingDoc ? (
                              <Loader2 className='size-5 text-primary animate-spin' />
                            ) : (
                              <Upload className='size-5 text-muted-foreground' />
                            )}
                            <span className='text-xs font-semibold text-primary'>Pilih Foto / Berkas KK</span>
                            <span className='text-[10px] text-muted-foreground'>Format JPG, PNG, WEBP, atau PDF</span>
                            <input
                              type='file'
                              accept='image/jpeg,image/png,image/webp,application/pdf'
                              className='hidden'
                              onChange={handleDocUpload}
                              disabled={isUploadingDoc}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Panel B: Isi Manual Anggota */}
                  {metodeKeluarga === 'MANUAL_INPUT' && (
                    <div className='p-3 sm:p-4 rounded-xl border bg-card shadow-2xs space-y-3.5 animate-in fade-in-50 duration-150'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <span className='font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5'>
                            <Users className='size-3.5 text-primary' /> Tambah Anggota Keluarga
                          </span>
                          <p className='text-[10px] text-muted-foreground'>Keluarga yang didaftarkan bersama calon jemaat</p>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={handleAddMember}
                          className='h-8 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/5'
                        >
                          <Plus className='size-3.5' /> Tambah
                        </Button>
                      </div>

                      <div className='space-y-3'>
                        {anggotaList.map((member, index) => (
                          <div
                            key={member.id || index}
                            className='p-3 sm:p-4 rounded-xl border bg-muted/15 shadow-2xs space-y-3'
                          >
                            <div className='flex items-center justify-between border-b pb-2'>
                              <div className='flex items-center gap-2'>
                                <Badge variant='outline' className='font-mono text-[10px] bg-primary/5 text-primary py-0.5 px-2'>
                                  Anggota #{index + 1}
                                </Badge>
                                {member.nama && <span className='font-bold text-foreground text-xs'>{member.nama}</span>}
                                {member.tanggalLahir && getAge(member.tanggalLahir) !== null && (
                                  <Badge variant='secondary' className='text-[10px] py-0'>
                                    {getAge(member.tanggalLahir)} Tahun
                                  </Badge>
                                )}
                              </div>
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => handleRemoveMember(index)}
                                className='h-7 px-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs'
                              >
                                <Trash2 className='size-3.5 mr-1' /> Hapus
                              </Button>
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                              {/* Row 1: Nama Lengkap (full width on sm) */}
                              <div className='space-y-1.5 sm:col-span-2'>
                                <Label className='text-xs font-semibold text-foreground'>Nama Lengkap (Sesuai KTP/Akta) *</Label>
                                <Input
                                  placeholder='Contoh: Maria Magdalena'
                                  value={member.nama}
                                  onChange={(e) => handleUpdateMember(index, 'nama', e.target.value)}
                                  className='text-xs h-8.5'
                                  required
                                />
                              </div>

                              {/* Row 2: Panggilan & Hubungan */}
                              <div className='space-y-1.5 sm:col-span-1'>
                                <Label className='text-xs font-semibold text-foreground'>Nama Panggilan</Label>
                                <Input
                                  placeholder='Contoh: Maria'
                                  value={member.namaPanggilan || ''}
                                  onChange={(e) => handleUpdateMember(index, 'namaPanggilan', e.target.value)}
                                  className='text-xs h-8.5'
                                />
                              </div>
                              <div className='space-y-1.5 sm:col-span-1'>
                                <Label className='text-xs font-semibold text-foreground'>Hubungan Keluarga *</Label>
                                <Select
                                  value={member.hubungan}
                                  onValueChange={(val: RelasiKeluarga) => handleUpdateMember(index, 'hubungan', val)}
                                >
                                  <SelectTrigger className='text-xs h-8.5'><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='ISTRI' className='text-xs'>Istri</SelectItem>
                                    <SelectItem value='SUAMI' className='text-xs'>Suami</SelectItem>
                                    <SelectItem value='ANAK' className='text-xs'>Anak</SelectItem>
                                    <SelectItem value='ORANG_TUA' className='text-xs'>Orang Tua</SelectItem>
                                    <SelectItem value='MERTUA' className='text-xs'>Mertua</SelectItem>
                                    <SelectItem value='CUCU' className='text-xs'>Cucu</SelectItem>
                                    <SelectItem value='FAMILI' className='text-xs'>Famili</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Row 3: Kelamin & Pernikahan */}
                              <div className='space-y-1.5 sm:col-span-1'>
                                <Label className='text-xs font-semibold text-foreground'>Jenis Kelamin *</Label>
                                <Select
                                  value={member.jenisKelamin}
                                  onValueChange={(val) => handleUpdateMember(index, 'jenisKelamin', val)}
                                >
                                  <SelectTrigger className='text-xs h-8.5'><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='LAK_LAKI' className='text-xs'>Laki-Laki</SelectItem>
                                    <SelectItem value='PEREMPUAN' className='text-xs'>Perempuan</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className='space-y-1.5 sm:col-span-1'>
                                <Label className='text-xs font-semibold text-foreground'>Status Pernikahan</Label>
                                <Select
                                  value={member.statusPernikahan || 'BELUM_MENIKAH'}
                                  onValueChange={(val) => handleUpdateMember(index, 'statusPernikahan', val)}
                                >
                                  <SelectTrigger className='text-xs h-8.5'><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='BELUM_MENIKAH' className='text-xs'>Belum Menikah</SelectItem>
                                    <SelectItem value='MENIKAH' className='text-xs'>Menikah</SelectItem>
                                    <SelectItem value='DUDA' className='text-xs'>Duda</SelectItem>
                                    <SelectItem value='JANDA' className='text-xs'>Janda</SelectItem>
                                    <SelectItem value='BERCERAI' className='text-xs'>Bercerai</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Row 4: Baptis & Tempat Lahir */}
                              <div className='space-y-1.5 sm:col-span-1'>
                                <Label className='text-xs font-semibold text-foreground'>Status Baptis</Label>
                                <Select
                                  value={member.statusBaptis || 'BELUM_BAPTIS'}
                                  onValueChange={(val) => handleUpdateMember(index, 'statusBaptis', val)}
                                >
                                  <SelectTrigger className='text-xs h-8.5'><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='SUDAH_BAPTIS' className='text-xs'>Sudah Baptis</SelectItem>
                                    <SelectItem value='BELUM_BAPTIS' className='text-xs'>Belum Baptis</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className='space-y-1.5 sm:col-span-1'>
                                <Label className='text-xs font-semibold text-foreground'>Tempat Lahir</Label>
                                <Input
                                  placeholder='Contoh: Padang'
                                  value={member.tempatLahir || ''}
                                  onChange={(e) => handleUpdateMember(index, 'tempatLahir', e.target.value)}
                                  className='text-xs h-8.5'
                                />
                              </div>

                              {/* Row 5: Tgl Lahir & No HP */}
                              <div className='space-y-1.5 sm:col-span-1'>
                                <div className='flex items-center justify-between'>
                                  <Label className='text-xs font-semibold text-foreground'>Tanggal Lahir</Label>
                                  {member.tanggalLahir && getAge(member.tanggalLahir) !== null && (
                                    <span className='text-[10px] font-mono text-primary font-semibold'>
                                      {getAge(member.tanggalLahir)} Tahun
                                    </span>
                                  )}
                                </div>
                                <Input
                                  type='date'
                                  value={member.tanggalLahir || ''}
                                  onChange={(e) => handleUpdateMember(index, 'tanggalLahir', e.target.value)}
                                  className='text-xs h-8.5'
                                />
                              </div>
                              <div className='space-y-1.5 sm:col-span-1'>
                                <Label className='text-xs font-semibold text-foreground'>Nomor WA / HP</Label>
                                <Input
                                  placeholder='Contoh: 081234567890'
                                  value={member.noHp || ''}
                                  onChange={(e) => handleUpdateMember(index, 'noHp', e.target.value)}
                                  className='text-xs h-8.5 font-mono'
                                />
                              </div>

                              {/* Row 6: Pekerjaan & Email */}
                              <div className='space-y-1.5 sm:col-span-1'>
                                <Label className='text-xs font-semibold text-foreground'>Profesi / Pekerjaan</Label>
                                <Input
                                  placeholder='Contoh: Pelajar / Karyawan'
                                  value={member.pekerjaan || ''}
                                  onChange={(e) => handleUpdateMember(index, 'pekerjaan', e.target.value)}
                                  className='text-xs h-8.5'
                                />
                              </div>
                              <div className='space-y-1.5 sm:col-span-1'>
                                <Label className='text-xs font-semibold text-foreground'>Email (Opsional)</Label>
                                <Input
                                  type='email'
                                  placeholder='nama@email.com'
                                  value={member.email || ''}
                                  onChange={(e) => handleUpdateMember(index, 'email', e.target.value)}
                                  className='text-xs h-8.5'
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── BAGIAN 3: PERSETUJUAN & SUBMIT ── */}
                <div className='pt-2 space-y-3'>
                  <div className='p-2.5 bg-muted/30 rounded-lg border'>
                    <label className='flex items-start gap-2 cursor-pointer text-[11px]'>
                      <input
                        type='checkbox'
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className='mt-0.5 size-3.5 rounded accent-primary text-primary'
                        required
                      />
                      <span className='text-muted-foreground leading-relaxed'>
                        Saya menyatakan data yang diisikan benar dan sah untuk pendaftaran jemaat {profile.namaSingkat}.
                      </span>
                    </label>
                  </div>

                  <Button
                    type='submit'
                    disabled={isSubmitting || !agreed}
                    className='w-full gap-2 text-xs font-semibold h-9.5'
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className='size-4 animate-spin' /> Mengirim Pendaftaran...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className='size-4' />{' '}
                        {metodeKeluarga === 'MANUAL_INPUT'
                          ? `Kirim Pendaftaran (${1 + anggotaList.length} Jiwa)`
                          : 'Kirim Pendaftaran Calon Jemaat'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        )}
      </main>

      {/* Official Public Footer */}
      <PublicFooter initialProfile={profile} />
    </div>
  )
}
