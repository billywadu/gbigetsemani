'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  ShieldCheck,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  uploadDokumenJemaatAction,
  searchJemaatOptionsAction,
} from '@/actions/dokumen'
import { JenisDokumen } from '@/lib/validations/dokumen'
import { toast } from 'sonner'

export default function UploadDokumenJemaatPage() {
  const router = useRouter()

  // Form Fields
  const [jemaatId, setJemaatId] = useState('')
  const [jemaatSearch, setJemaatSearch] = useState('')
  const [jemaatOptions, setJemaatOptions] = useState<{ id: string; nama: string; nij: string }[]>([])
  const [searchingJemaat, setSearchingJemaat] = useState(false)

  const [judul, setJudul] = useState('')
  const [jenisDokumen, setJenisDokumen] = useState<JenisDokumen>('BAPTIS')
  const [tanggalTerbit, setTanggalTerbit] = useState(new Date().toISOString().split('T')[0])
  const [tanggalKadaluarsa, setTanggalKadaluarsa] = useState('')
  const [deskripsi, setDeskripsi] = useState('')

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchJemaatOptions = useCallback(async (query: string) => {
    setSearchingJemaat(true)
    const res = await searchJemaatOptionsAction(query)
    if (res.success && res.data) {
      setJemaatOptions(res.data)
      if (res.data.length > 0 && !jemaatId) {
        setJemaatId(res.data[0].id)
      }
    }
    setSearchingJemaat(false)
  }, [jemaatId])

  useEffect(() => {
    fetchJemaatOptions('')
  }, [fetchJemaatOptions])

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

    if (!jemaatId) {
      toast.error('Pilih jemaat pemilik dokumen!')
      return
    }
    if (!judul.trim()) {
      toast.error('Judul dokumen wajib diisi!')
      return
    }
    if (!selectedFile) {
      toast.error('Pilih berkas fisik dokumen untuk diunggah!')
      return
    }
    if (tanggalKadaluarsa && new Date(tanggalKadaluarsa) < new Date(tanggalTerbit)) {
      toast.error('Tanggal kadaluarsa tidak boleh sebelum tanggal terbit!')
      return
    }

    const formData = new FormData()
    formData.append('jemaatId', jemaatId)
    formData.append('judul', judul.trim())
    formData.append('jenisDokumen', jenisDokumen)
    formData.append('tanggalTerbit', tanggalTerbit)
    if (tanggalKadaluarsa) formData.append('tanggalKadaluarsa', tanggalKadaluarsa)
    if (deskripsi.trim()) formData.append('deskripsi', deskripsi.trim())
    formData.append('file', selectedFile)

    setSubmitting(true)
    const res = await uploadDokumenJemaatAction(formData)
    setSubmitting(false)

    if (res.success) {
      toast.success(res.message || 'Dokumen jemaat berhasil diunggah!')
      router.push('/dashboard/dokumen-jemaat')
    } else {
      toast.error(res.error || 'Gagal mengunggah dokumen.')
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
          <Link href='/dashboard/dokumen-jemaat'>
            <ArrowLeft className='size-4' />
          </Link>
        </Button>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight'>Unggah Dokumen Jemaat</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Unggah dan simpan berkas sertifikat atau dokumen jemaat.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-3 pt-4 px-4'>
            <CardTitle className='text-base font-bold'>Metadata Dokumen</CardTitle>
            <CardDescription className='text-xs'>
              Informasi identitas berkas dan pemilik dokumen jemaat.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4 px-4 pb-4 text-xs'>
            {/* Jemaat Selector */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Jemaat Pemilik *</Label>
              <Select value={jemaatId} onValueChange={setJemaatId}>
                <SelectTrigger className='text-xs h-9'>
                  <SelectValue placeholder='Pilih Jemaat' />
                </SelectTrigger>
                <SelectContent>
                  {jemaatOptions.map((j) => (
                    <SelectItem key={j.id} value={j.id} className='text-xs'>
                      {j.nama} (NIJ: {j.nij})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Judul Dokumen */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Judul Dokumen *</Label>
              <Input
                placeholder='Contoh: Sertifikat Baptis Selam'
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                className='text-xs h-9'
                required
              />
            </div>

            {/* Jenis & Tanggal */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Jenis Dokumen *</Label>
                <Select value={jenisDokumen} onValueChange={(val) => setJenisDokumen(val as JenisDokumen)}>
                  <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='BAPTIS' className='text-xs'>Surat Baptis</SelectItem>
                    <SelectItem value='NIKAH' className='text-xs'>Surat Nikah</SelectItem>
                    <SelectItem value='PENYERAHAN_ANAK' className='text-xs'>Penyerahan Anak</SelectItem>
                    <SelectItem value='SAKSI' className='text-xs'>Surat Saksi</SelectItem>
                    <SelectItem value='LAINNYA' className='text-xs'>Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Tanggal Terbit *</Label>
                <Input
                  type='date'
                  value={tanggalTerbit}
                  onChange={(e) => setTanggalTerbit(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Tanggal Kadaluarsa (Opsional)</Label>
                <Input
                  type='date'
                  value={tanggalKadaluarsa}
                  onChange={(e) => setTanggalKadaluarsa(e.target.value)}
                  className='text-xs h-9'
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Catatan Tambahan (Opsional)</Label>
              <Textarea
                placeholder='Keterangan nomor register sinode, pendeta penahbis, atau lokasi pelayanan...'
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
                  Klik atau Tarik Berkas Dokumen ke Sini
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
            <Link href='/dashboard/dokumen-jemaat'>Batal</Link>
          </Button>
          <Button type='submit' disabled={submitting || !selectedFile} size='default' className='h-9 w-full sm:w-auto gap-2 text-xs font-semibold justify-center'>
            {submitting ? <Loader2 className='size-4 animate-spin' /> : <UploadCloud className='size-4' />}
            {submitting ? 'Mengunggah...' : 'Unggah Dokumen'}
          </Button>
        </div>
      </form>
    </div>
  )
}
