'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  X,
  Loader2,
  Calendar,
  Building,
  ShieldCheck,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  uploadArsipGerejaAction,
  getKategorialOptionsAction,
} from '@/actions/arsip'
import { JenisArsip, StatusArsip } from '@/lib/validations/arsip'
import { toast } from 'sonner'

export default function TambahArsipGerejaPage() {
  const router = useRouter()

  // Form Fields
  const [judul, setJudul] = useState('')
  const [jenisArsip, setJenisArsip] = useState<JenisArsip>('LEGALITAS')
  const [kategorialId, setKategorialId] = useState<string>('none')
  const [kategorialOptions, setKategorialOptions] = useState<{ id: string; nama: string }[]>([])
  const [tanggalDokumen, setTanggalDokumen] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<StatusArsip>('AKTIF')
  const [deskripsi, setDeskripsi] = useState('')

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getKategorialOptionsAction().then((res) => {
      if (res.success && res.data) {
        setKategorialOptions(res.data)
      }
    })
  }, [])

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null)
      return
    }

    // Client-side file size check (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran berkas melebihi batas maksimum 5 MB!')
      return
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format berkas tidak didukung. Hanya file PDF, PNG, JPG, dan WEBP yang diperbolehkan.')
      return
    }

    setSelectedFile(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!judul.trim()) {
      toast.error('Judul arsip dokumen wajib diisi!')
      return
    }
    if (!selectedFile) {
      toast.error('Pilih berkas fisik arsip untuk diunggah!')
      return
    }

    const formData = new FormData()
    formData.append('judul', judul.trim())
    formData.append('jenisArsip', jenisArsip)
    if (kategorialId && kategorialId !== 'none') {
      formData.append('kategorialId', kategorialId)
    }
    formData.append('tanggalDokumen', tanggalDokumen)
    formData.append('status', status)
    if (deskripsi.trim()) {
      formData.append('deskripsi', deskripsi.trim())
    }
    formData.append('file', selectedFile)

    setSubmitting(true)
    const res = await uploadArsipGerejaAction(formData)
    setSubmitting(false)

    if (res.success) {
      toast.success(res.message || 'Arsip dokumen gereja berhasil diunggah!')
      router.push('/dashboard/arsip-gereja')
    } else {
      toast.error(res.error || 'Gagal mengunggah arsip.')
    }
  }

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(2)} MB`
  }

  return (
    <div className='space-y-6 max-w-3xl mx-auto'>
      {/* Header Bar */}
      <div className='flex items-start gap-3 border-b pb-4'>
        <Button asChild variant='ghost' size='icon' className='size-8 shrink-0 mt-0.5'>
          <Link href='/dashboard/arsip-gereja'>
            <ArrowLeft className='size-4' />
          </Link>
        </Button>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight'>Tambah Arsip Dokumen</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Unggah dan simpan dokumen arsip resmi gereja.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-3 pt-4 px-4'>
            <CardTitle className='text-base font-bold'>Metadata Arsip</CardTitle>
            <CardDescription className='text-xs'>
              Informasi identitas dokumen dan lingkup arsip.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4 px-4 pb-4 text-xs'>
            {/* Judul Arsip */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Judul Dokumen *</Label>
              <Input
                placeholder='Contoh: Sertifikat IMB Gedung Utama'
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                className='text-xs h-9'
                required
              />
            </div>

            {/* Kategori & Lingkup */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Jenis Arsip *</Label>
                <Select value={jenisArsip} onValueChange={(val) => setJenisArsip(val as JenisArsip)}>
                  <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='LEGALITAS' className='text-xs'>Legalitas (Akta / IMB / Tanah)</SelectItem>
                    <SelectItem value='NOTULEN' className='text-xs'>Notulen Rapat Dewan</SelectItem>
                    <SelectItem value='SURAT_MASUK' className='text-xs'>Surat Masuk (Sinode / Eksternal)</SelectItem>
                    <SelectItem value='SURAT_KELUAR' className='text-xs'>Surat Keluar Resmi</SelectItem>
                    <SelectItem value='KONTRAK' className='text-xs'>Kontrak / Kerjasama</SelectItem>
                    <SelectItem value='KEUANGAN_ARCHIVE' className='text-xs'>Arsip Keuangan Tahunan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Lingkup Kategorial</Label>
                <Select value={kategorialId} onValueChange={setKategorialId}>
                  <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none' className='text-xs'>Arsip Umum Gereja</SelectItem>
                    {kategorialOptions.map((k) => (
                      <SelectItem key={k.id} value={k.id} className='text-xs'>
                        {k.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tanggal & Status */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Tanggal Dokumen *</Label>
                <Input
                  type='date'
                  value={tanggalDokumen}
                  onChange={(e) => setTanggalDokumen(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Status Masa Berlaku *</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as StatusArsip)}>
                  <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='AKTIF' className='text-xs'>AKTIF (Berlaku)</SelectItem>
                    <SelectItem value='PERMANEN' className='text-xs'>PERMANEN (Legalitas / Statuta)</SelectItem>
                    <SelectItem value='INAKTIF' className='text-xs'>INAKTIF (Selesai / Lampau)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Deskripsi */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Keterangan (Opsional)</Label>
              <Textarea
                placeholder='Catatan nomor surat, notaris, instansi penerbit, dsb...'
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className='text-xs'
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* File Dropzone Card */}
        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-3 pt-4 px-4'>
            <CardTitle className='text-base font-bold'>Berkas Dokumen</CardTitle>
            <CardDescription className='text-xs'>
              Format didukung: <strong>PDF, PNG, JPG, WEBP</strong> (Maksimal 5 MB).
            </CardDescription>
          </CardHeader>
          <CardContent className='px-4 pb-4'>
            <input
              ref={fileInputRef}
              type='file'
              accept='.pdf, .png, .jpg, .jpeg, .webp, application/pdf, image/png, image/jpeg, image/webp'
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0])
                }
              }}
              className='hidden'
            />

            {!selectedFile ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30'
                }`}
              >
                <UploadCloud className='size-12 text-primary mx-auto mb-2 opacity-80' />
                <h4 className='font-bold text-sm text-foreground'>
                  Klik atau Tarik Berkas Arsip ke Sini
                </h4>
                <p className='text-xs text-muted-foreground mt-1'>
                  PDF, PNG, JPG, WEBP hingga 5 MB
                </p>
                <Button type='button' variant='outline' size='sm' className='mt-3 text-xs'>
                  Pilih Berkas Dari Komputer
                </Button>
              </div>
            ) : (
              <div className='p-4 border rounded-xl bg-muted/20 flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3 min-w-0'>
                  <div className='p-2.5 bg-primary/10 rounded-lg text-primary shrink-0'>
                    <FileText className='size-6' />
                  </div>
                  <div className='min-w-0'>
                    <div className='font-bold text-xs truncate text-foreground'>
                      {selectedFile.name}
                    </div>
                    <div className='text-[11px] text-muted-foreground font-mono flex items-center gap-2 mt-0.5'>
                      <span>{formatFileSize(selectedFile.size)}</span>
                      <span>•</span>
                      <Badge variant='outline' className='text-[10px] py-0 uppercase'>
                        {selectedFile.type.split('/')[1] || 'FILE'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className='size-8 text-muted-foreground hover:text-rose-600'
                >
                  <X className='size-4' />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className='flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2'>
          <Button asChild variant='outline' size='default' className='h-9 w-full sm:w-auto text-xs font-medium justify-center' disabled={submitting}>
            <Link href='/dashboard/arsip-gereja'>Batal</Link>
          </Button>
          <Button type='submit' disabled={submitting || !selectedFile} size='default' className='h-9 w-full sm:w-auto gap-2 text-xs font-semibold justify-center'>
            {submitting ? <Loader2 className='size-4 animate-spin' /> : <UploadCloud className='size-4' />}
            {submitting ? 'Mengunggah...' : 'Unggah Arsip'}
          </Button>
        </div>
      </form>
    </div>
  )
}
