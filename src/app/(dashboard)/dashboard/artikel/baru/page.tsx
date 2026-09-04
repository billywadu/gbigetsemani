'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  ArrowLeft,
  Save,
  Globe,
  ImageIcon,
  X,
  Loader2,
  Calendar,
  User,
  Layers,
  BookOpen,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArtikelEditor } from '@/components/artikel/artikel-editor'
import {
  createArtikelAction,
  getKategoriArtikelListAction,
  KategoriArtikelDTO,
} from '@/actions/artikel'
import { QuickCreateCategoryDialog } from '@/components/artikel/quick-create-category-dialog'
import { StatusArtikel } from '@/lib/validations/artikel'
import { slugify } from '@/lib/slug'
import { toast } from 'sonner'

export default function TulisArtikelBaruPage() {
  const router = useRouter()

  const [judul, setJudul] = useState('')
  const [slugPreview, setSlugPreview] = useState('')
  const [kategoriId, setKategoriId] = useState('')
  const [categories, setCategories] = useState<KategoriArtikelDTO[]>([])
  const [penulis, setPenulis] = useState('Pdt. Hendra Wijaya, S.Th.')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [ringkasan, setRingkasan] = useState('')
  const [konten, setKonten] = useState('')

  // Thumbnail State
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getKategoriArtikelListAction().then((res) => {
      if (res.success && res.data) {
        setCategories(res.data)
        if (res.data.length > 0 && !kategoriId) {
          setKategoriId(res.data[0].id)
        }
      }
    })
  }, [kategoriId])

  const handleTitleChange = (val: string) => {
    setJudul(val)
    setSlugPreview(slugify(val))
  }

  const handleThumbnailChange = (file: File | null) => {
    if (!file) {
      setThumbnailFile(null)
      setThumbnailPreview(null)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar thumbnail melebihi 5 MB!')
      return
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('Format gambar thumbnail harus JPG, PNG, atau WEBP.')
      return
    }

    setThumbnailFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setThumbnailPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (targetStatus: StatusArtikel) => {
    if (!judul.trim()) {
      toast.error('Judul artikel wajib diisi!')
      return
    }
    if (!kategoriId) {
      toast.error('Pilih kategori artikel!')
      return
    }
    if (!penulis.trim()) {
      toast.error('Nama penulis / narasumber wajib diisi!')
      return
    }
    if (!ringkasan.trim()) {
      toast.error('Ringkasan / kutipan artikel wajib diisi!')
      return
    }
    if (!konten.trim() || konten.trim().length < 10) {
      toast.error('Isi konten artikel minimal 10 karakter!')
      return
    }

    const formData = new FormData()
    formData.append('judul', judul.trim())
    formData.append('kategoriId', kategoriId)
    formData.append('penulis', penulis.trim())
    formData.append('tanggal', tanggal)
    formData.append('status', targetStatus)
    formData.append('ringkasan', ringkasan.trim())
    formData.append('konten', konten.trim())
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile)
    }

    setSubmitting(true)
    const res = await createArtikelAction(formData)
    setSubmitting(false)

    if (res.success) {
      toast.success(
        targetStatus === 'PUBLISHED'
          ? 'Artikel berhasil dipublikasikan!'
          : 'Draf artikel berhasil disimpan!'
      )
      router.push('/dashboard/artikel')
    } else {
      toast.error(res.error || 'Gagal menyimpan artikel.')
    }
  }

  return (
    <div className='space-y-6 max-w-5xl mx-auto'>
      {/* Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div className='flex items-start sm:items-center gap-3'>
          <Button asChild variant='ghost' size='icon' className='shrink-0 size-8 sm:size-9 mt-0.5 sm:mt-0'>
            <Link href='/dashboard/artikel'>
              <ArrowLeft className='size-4 sm:size-5' />
            </Link>
          </Button>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Tulis Artikel Baru</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Buat artikel, renungan rohani, wawasan pelayanan, atau warta jemaat dengan editor kaya format.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleSubmit('DRAFT')}
            disabled={submitting}
            className='flex-1 sm:flex-initial gap-1.5 text-xs h-9 sm:h-8'
          >
            <Save className='size-3.5' /> Simpan Draf
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={() => handleSubmit('PUBLISHED')}
            disabled={submitting}
            className='flex-1 sm:flex-initial gap-1.5 text-xs h-9 sm:h-8 bg-emerald-600 hover:bg-emerald-700 text-white'
          >
            {submitting ? <Loader2 className='size-3.5 animate-spin' /> : <Globe className='size-3.5' />}
            {submitting ? 'Menyimpan...' : 'Publikasikan'}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left 2 Cols: Main Content */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Judul & Slug */}
          <Card className='shadow-xs bg-card'>
            <CardHeader className='pb-3 pt-4 px-4'>
              <CardTitle className='text-sm font-bold'>Judul & Cuplikan Artikel</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4 px-4 pb-4 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Judul Artikel *</Label>
                <Input
                  placeholder='Contoh: Hidup Yang Berdampak Bagi Kota'
                  value={judul}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className='text-sm font-bold h-10'
                  required
                />
                {slugPreview && (
                  <div className='text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-1'>
                    <span>Preview URL:</span>
                    <span className='text-primary font-semibold'>/artikel/{slugPreview}</span>
                  </div>
                )}
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Ringkasan / Sinopsis Singkat *</Label>
                <Textarea
                  placeholder='Tuliskan 1-3 kalimat inti pesan atau kutipan artikel untuk pratinjau kartu dan SEO...'
                  value={ringkasan}
                  onChange={(e) => setRingkasan(e.target.value)}
                  className='text-xs min-h-20'
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Rich Content Editor */}
          <div className='space-y-2'>
            <Label className='text-xs font-semibold'>Isi Konten Artikel (HTML Editor) *</Label>
            <ArtikelEditor
              value={konten}
              onChange={setKonten}
              placeholder='Tuliskan artikel, renungan, nats ayat Alkitab (gunakan tombol Bible Callout), dan gambar ilustrasi di sini...'
            />
          </div>
        </div>

        {/* Right 1 Col: Metadata & Thumbnail */}
        <div className='space-y-6'>
          <Card className='shadow-xs bg-card'>
            <CardHeader className='pb-3 pt-4 px-4'>
              <CardTitle className='text-sm font-bold'>Pengaturan Publikasi</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4 px-4 pb-4 text-xs'>
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>Kategori Artikel *</Label>
                  <QuickCreateCategoryDialog
                    trigger={
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-6 px-1.5 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1 rounded-md'
                      >
                        <Plus className='size-3' /> Tambah Baru
                      </Button>
                    }
                    onSuccess={(newCat) => {
                      setCategories((prev) => [...prev, newCat])
                      setKategoriId(newCat.id)
                    }}
                  />
                </div>
                <Select value={kategoriId} onValueChange={setKategoriId}>
                  <SelectTrigger className='w-full text-xs h-9'>
                    <SelectValue placeholder='Pilih Kategori...' />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className='text-xs'>
                        {c.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Penulis / Narasumber *</Label>
                <Input
                  value={penulis}
                  onChange={(e) => setPenulis(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Tanggal Publikasi *</Label>
                <Input
                  type='date'
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Thumbnail Cover Card */}
          <Card className='shadow-xs bg-card'>
            <CardHeader className='pb-3 pt-4 px-4'>
              <CardTitle className='text-sm font-bold'>Gambar Sampul (Thumbnail)</CardTitle>
              <CardDescription className='text-xs'>
                Gambar cover artikel (JPG/PNG/WEBP maks. 5 MB)
              </CardDescription>
            </CardHeader>
            <CardContent className='px-4 pb-4 text-xs'>
              <input
                ref={thumbnailInputRef}
                type='file'
                accept='image/jpeg, image/png, image/webp'
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleThumbnailChange(e.target.files[0])
                  }
                }}
                className='hidden'
              />

              {thumbnailPreview ? (
                <div className='relative rounded-xl overflow-hidden border'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailPreview}
                    alt='Preview Cover'
                    className='w-full h-44 object-cover'
                  />
                  <Button
                    type='button'
                    variant='destructive'
                    size='icon'
                    onClick={() => handleThumbnailChange(null)}
                    className='absolute top-2 right-2 size-7 shadow-md'
                  >
                    <X className='size-3.5' />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  className='p-6 border-2 border-dashed rounded-xl text-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-all'
                >
                  <ImageIcon className='size-8 text-primary mx-auto mb-2 opacity-80' />
                  <div className='font-bold text-xs text-foreground'>Pilih Gambar Sampul</div>
                  <div className='text-[11px] text-muted-foreground mt-0.5'>Maksimal 5 MB</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
