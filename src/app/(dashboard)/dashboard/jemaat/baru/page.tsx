'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, ShieldCheck, QrCode, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createJemaatAction } from '@/actions/jemaat'
import { toast } from 'sonner'

export default function JemaatBaruPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    tanggalBergabung: new Date().toISOString().split('T')[0],
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

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nama.trim()) {
      toast.error('Nama Lengkap wajib diisi!')
      return
    }

    setIsSubmitting(true)
    const res = await createJemaatAction({
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

    setIsSubmitting(false)
    if (res.success && res.data) {
      toast.success(`Jemaat berhasil didaftarkan! NIJ: ${res.data.nij} | Barcode: ${res.data.barcodeCode}. Log audit SHA-256 tersimpan.`)
      router.push(`/dashboard/jemaat/${res.data.id}`)
    } else {
      toast.error(res.error || 'Gagal mendaftarkan jemaat baru.')
    }
  }

  return (
    <div className='space-y-6 max-w-4xl mx-auto'>
      {/* Header */}
      <div className='flex items-start gap-3 sm:gap-4 border-b pb-4'>
        <Button asChild variant='ghost' size='icon' className='size-8 mt-0.5 shrink-0'>
          <Link href='/dashboard/jemaat'>
            <ArrowLeft className='size-4' />
          </Link>
        </Button>
        <div className='min-w-0 flex-1'>
          <h1 className='text-lg sm:text-2xl font-bold tracking-tight text-foreground'>Tambah Jemaat Baru</h1>
          <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
            Penerbitan Nomor Induk Jemaat (NIJ) dan Kode QR Presensi otomatis secara terproteksi.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Auto Generated Identifiers Banner */}
        <Card className='bg-primary/5 border-primary/20 shadow-xs overflow-hidden'>
          <CardContent className='p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4'>
            <div className='flex items-start sm:items-center gap-2.5 sm:gap-3'>
              <div className='rounded-full bg-primary p-1.5 sm:p-2 text-primary-foreground shrink-0 mt-0.5 sm:mt-0'>
                <Sparkles className='size-4 sm:size-5' />
              </div>
              <div className='min-w-0'>
                <h3 className='font-bold text-xs sm:text-sm text-foreground'>Generator Otomatis Identitas Jemaat</h3>
                <p className='text-[11px] sm:text-xs text-muted-foreground'>Penerbitan NIJ & Barcode terproteksi atomic sequence.</p>
              </div>
            </div>
            <div className='grid grid-cols-2 sm:flex sm:items-center gap-2 font-mono text-xs'>
              <div className='bg-card px-2.5 py-1.5 rounded border'>
                <span className='text-muted-foreground block text-[10px]'>NIJ Format</span>
                <span className='font-bold text-primary flex items-center gap-1 text-[11px] sm:text-xs'>
                  <ShieldCheck className='size-3 text-emerald-500 shrink-0' /> NIJ-XXXX
                </span>
              </div>
              <div className='bg-card px-2.5 py-1.5 rounded border'>
                <span className='text-muted-foreground block text-[10px]'>QR Barcode</span>
                <span className='font-bold flex items-center gap-1 text-[11px] sm:text-xs'>
                  <QrCode className='size-3 shrink-0' /> JMT-XXXXXX
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Data Identitas Pribadi */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>1. Data Identitas Utama & Pribadi</CardTitle>
            <CardDescription>Informasi lengkap sesuai KTP / Identitas Resmi</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='nik'>
                NIK (Nomor Induk Kependudukan) <span className='text-xs text-muted-foreground font-normal'>(Opsional)</span>
              </Label>
              <Input
                id='nik'
                maxLength={16}
                placeholder='Contoh: 1371XXXXXXXXXXXX (16 digit, opsional)'
                value={formData.nik}
                onChange={(e) => handleChange('nik', e.target.value.replace(/\D/g, ''))}
                className='font-mono'
              />
            </div>

            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='nama'>Nama Lengkap (Sesuai KTP) *</Label>
              <Input
                id='nama'
                placeholder='Contoh: Stephen Tanuwijaya'
                value={formData.nama}
                onChange={(e) => handleChange('nama', e.target.value)}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='namaPanggilan'>Nama Panggilan</Label>
              <Input
                id='namaPanggilan'
                placeholder='Contoh: Stephen'
                value={formData.namaPanggilan}
                onChange={(e) => handleChange('namaPanggilan', e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='jenisKelamin'>Jenis Kelamin *</Label>
              <Select value={formData.jenisKelamin} onValueChange={(val) => handleChange('jenisKelamin', val)}>
                <SelectTrigger id='jenisKelamin'>
                  <SelectValue placeholder='Pilih Gender' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='LAK_LAKI'>Laki-laki</SelectItem>
                  <SelectItem value='PEREMPUAN'>Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='tempatLahir'>Tempat Lahir</Label>
              <Input
                id='tempatLahir'
                placeholder='Contoh: Padang'
                value={formData.tempatLahir}
                onChange={(e) => handleChange('tempatLahir', e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='tanggalLahir'>Tanggal Lahir</Label>
              <Input
                id='tanggalLahir'
                type='date'
                value={formData.tanggalLahir}
                onChange={(e) => handleChange('tanggalLahir', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Data Kontak & Domisili */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>2. Kontak & Alamat Domisili</CardTitle>
            <CardDescription>Nomor HP/WhatsApp aktif untuk komunikasi pastoral</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='noHp'>Nomor HP Utama</Label>
              <Input
                id='noHp'
                placeholder='0812XXXXXXXX'
                value={formData.noHp}
                onChange={(e) => handleChange('noHp', e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='whatsApp'>Nomor WhatsApp</Label>
              <Input
                id='whatsApp'
                placeholder='0812XXXXXXXX'
                value={formData.whatsApp}
                onChange={(e) => handleChange('whatsApp', e.target.value)}
              />
            </div>

            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='email'>Alamat Email</Label>
              <Input
                id='email'
                type='email'
                placeholder='nama@gmail.com'
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='alamat'>Alamat Rumah Lengkap</Label>
              <Textarea
                id='alamat'
                placeholder='Jl. Ngarai Sianok No. 12, Kel. Padang Barat'
                value={formData.alamat}
                onChange={(e) => handleChange('alamat', e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='kota'>Kota / Kabupaten</Label>
              <Input
                id='kota'
                value={formData.kota}
                onChange={(e) => handleChange('kota', e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='provinsi'>Provinsi</Label>
              <Input
                id='provinsi'
                value={formData.provinsi}
                onChange={(e) => handleChange('provinsi', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Status Rohani & Baptisan */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>3. Status Keanggotaan & Rohani</CardTitle>
            <CardDescription>Penetapan status jemaat dan baptisan</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='statusJemaat'>Status Jemaat *</Label>
              <Select value={formData.statusJemaat} onValueChange={(val) => handleChange('statusJemaat', val)}>
                <SelectTrigger id='statusJemaat'>
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

            <div className='space-y-2'>
              <Label htmlFor='statusBaptis'>Status Baptis Air</Label>
              <Select value={formData.statusBaptis} onValueChange={(val) => handleChange('statusBaptis', val)}>
                <SelectTrigger id='statusBaptis'>
                  <SelectValue placeholder='Pilih Status Baptis' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='SUDAH_BAPTIS'>Sudah Baptis Air</SelectItem>
                  <SelectItem value='BELUM_BAPTIS'>Belum Baptis Air</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.statusBaptis === 'SUDAH_BAPTIS' && (
              <div className='space-y-2 sm:col-span-2'>
                <Label htmlFor='tanggalBaptis'>Tanggal Baptis Air</Label>
                <Input
                  id='tanggalBaptis'
                  type='date'
                  value={formData.tanggalBaptis}
                  onChange={(e) => handleChange('tanggalBaptis', e.target.value)}
                />
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='statusPernikahan'>Status Pernikahan</Label>
              <Select value={formData.statusPernikahan} onValueChange={(val) => handleChange('statusPernikahan', val)}>
                <SelectTrigger id='statusPernikahan'>
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
              <div className='space-y-2'>
                <Label htmlFor='tanggalMenikah'>Tanggal Menikah</Label>
                <Input
                  id='tanggalMenikah'
                  type='date'
                  value={formData.tanggalMenikah}
                  onChange={(e) => handleChange('tanggalMenikah', e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Pekerjaan & Kontak Darurat */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>4. Pekerjaan & Kontak Darurat</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='pekerjaan'>Pekerjaan / Profesi</Label>
              <Input
                id='pekerjaan'
                placeholder='Contoh: Wiraswasta / PNS / Mahasiswa'
                value={formData.pekerjaan}
                onChange={(e) => handleChange('pekerjaan', e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='pendidikan'>Pendidikan Terakhir</Label>
              <Select value={formData.pendidikan} onValueChange={(val) => handleChange('pendidikan', val)}>
                <SelectTrigger id='pendidikan'>
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

            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='kontakDarurat'>Kontak Darurat (Nama & Telp)</Label>
              <Input
                id='kontakDarurat'
                placeholder='Contoh: Budi (Adak Kandung) - 0812XXXXXXXX'
                value={formData.kontakDarurat}
                onChange={(e) => handleChange('kontakDarurat', e.target.value)}
              />
            </div>

            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='catatan'>Catatan Pastoral</Label>
              <Textarea
                id='catatan'
                placeholder='Catatan khusus dari gembala atau tim pastoral...'
                value={formData.catatan}
                onChange={(e) => handleChange('catatan', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className='flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t'>
          <Button asChild variant='outline' size='default' className='h-9 w-full sm:w-auto text-xs font-medium justify-center'>
            <Link href='/dashboard/jemaat'>Batal</Link>
          </Button>
          <Button type='submit' disabled={isSubmitting} size='default' className='h-9 w-full sm:w-auto gap-2 text-xs font-semibold justify-center'>
            {isSubmitting ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
            {isSubmitting ? 'Menyimpan...' : 'Simpan Data & Terbitkan NIJ'}
          </Button>
        </div>
      </form>
    </div>
  )
}
