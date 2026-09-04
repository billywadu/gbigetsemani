'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Archive,
  Download,
  ShieldCheck,
  Clock,
  Lock,
  Building,
  Calendar,
  Trash2,
  Edit,
  Loader2,
  ExternalLink,
  Eye,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getArsipGerejaByIdAction,
  getKategorialOptionsAction,
  updateArsipGerejaAction,
  deleteArsipGerejaAction,
  ArsipGerejaDetailDTO,
} from '@/actions/arsip'
import { JenisArsip, StatusArsip } from '@/lib/validations/arsip'
import { toast } from 'sonner'

export default function ArsipGerejaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [archive, setArchive] = useState<ArsipGerejaDetailDTO | null>(null)
  const [kategorialOptions, setKategorialOptions] = useState<{ id: string; nama: string }[]>([])

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false)
  const [editJudul, setEditJudul] = useState('')
  const [editJenis, setEditJenis] = useState<JenisArsip>('LEGALITAS')
  const [editKategorialId, setEditKategorialId] = useState<string>('none')
  const [editStatus, setEditStatus] = useState<StatusArsip>('AKTIF')
  const [editDeskripsi, setEditDeskripsi] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete Modal State
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    getKategorialOptionsAction().then((res) => {
      if (res.success && res.data) {
        setKategorialOptions(res.data)
      }
    })
  }, [])

  const fetchArchive = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getArsipGerejaByIdAction(id)
    if (res.success && res.data) {
      setArchive(res.data)
      setEditJudul(res.data.judul)
      setEditJenis(res.data.jenisArsip)
      setEditKategorialId(res.data.kategorialId || 'none')
      setEditStatus(res.data.status)
      setEditDeskripsi(res.data.deskripsi || '')
    } else {
      toast.error(res.error || 'Arsip dokumen tidak ditemukan.')
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchArchive()
  }, [fetchArchive])

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!archive) return

    setIsUpdating(true)
    const res = await updateArsipGerejaAction({
      id: archive.id,
      judul: editJudul.trim(),
      jenisArsip: editJenis,
      kategorialId: editKategorialId === 'none' ? null : editKategorialId,
      status: editStatus,
      deskripsi: editDeskripsi.trim() || null,
    })
    setIsUpdating(false)

    if (res.success) {
      toast.success(res.message || 'Arsip berhasil diperbarui!')
      setEditOpen(false)
      fetchArchive()
    } else {
      toast.error(res.error || 'Gagal memperbarui arsip.')
    }
  }

  const handleDeleteSubmit = async () => {
    if (!archive) return
    if (!deleteReason.trim() || deleteReason.trim().length < 5) {
      toast.error('Alasan penghapusan minimal 5 karakter!')
      return
    }

    setIsDeleting(true)
    const res = await deleteArsipGerejaAction({
      id: archive.id,
      reason: deleteReason.trim(),
    })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Arsip berhasil dihapus!')
      router.push('/dashboard/arsip-gereja')
    } else {
      toast.error(res.error || 'Gagal menghapus arsip.')
    }
  }

  const renderJenisBadge = (jenis: JenisArsip) => {
    switch (jenis) {
      case 'LEGALITAS':
        return <Badge className='bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs'>Legalitas</Badge>
      case 'NOTULEN':
        return <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs'>Notulen</Badge>
      case 'SURAT_MASUK':
        return <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs'>Surat Masuk</Badge>
      case 'SURAT_KELUAR':
        return <Badge className='bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs'>Surat Keluar</Badge>
      case 'KONTRAK':
        return <Badge className='bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs'>Kontrak</Badge>
      case 'KEUANGAN_ARCHIVE':
        return <Badge className='bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 text-xs'>Arsip Keuangan</Badge>
      default:
        return <Badge variant='outline' className='text-xs'>{jenis}</Badge>
    }
  }

  const renderStatusBadge = (status: StatusArsip) => {
    switch (status) {
      case 'AKTIF':
        return (
          <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs gap-1 font-mono'>
            <ShieldCheck className='size-3.5' /> AKTIF (BERLAKU)
          </Badge>
        )
      case 'PERMANEN':
        return (
          <Badge className='bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs gap-1 font-mono'>
            <Lock className='size-3.5' /> PERMANEN
          </Badge>
        )
      case 'INAKTIF':
        return (
          <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs gap-1 font-mono'>
            <Clock className='size-3.5' /> INAKTIF (LAMPAU)
          </Badge>
        )
      default:
        return <Badge variant='outline'>{status}</Badge>
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(2)} MB`
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px] text-muted-foreground gap-2 text-sm'>
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat arsip dokumen gereja...
      </div>
    )
  }

  if (!archive) {
    return (
      <div className='space-y-4 max-w-xl mx-auto py-12 text-center'>
        <h2 className='text-xl font-bold text-rose-600 dark:text-rose-400'>Arsip Tidak Ditemukan</h2>
        <p className='text-sm text-muted-foreground'>Berkas arsip dokumen gereja tidak ditemukan atau telah dihapus.</p>
        <Button asChild variant='outline'>
          <Link href='/dashboard/arsip-gereja'>Kembali ke Daftar Arsip</Link>
        </Button>
      </div>
    )
  }

  const isImage = archive.mimeType.startsWith('image/')
  const isPdf = archive.mimeType === 'application/pdf'

  return (
    <div className='space-y-6 max-w-5xl mx-auto'>
      {/* Header Bar */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4'>
        <div className='flex items-start gap-3'>
          <Button asChild variant='ghost' size='icon' className='size-8 shrink-0 mt-0.5'>
            <Link href='/dashboard/arsip-gereja'>
              <ArrowLeft className='size-4' />
            </Link>
          </Button>
          <div className='min-w-0 flex-1 space-y-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-lg sm:text-2xl font-bold tracking-tight text-foreground'>{archive.judul}</h1>
              {renderJenisBadge(archive.jenisArsip)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Lingkup: <strong className='text-foreground'>{archive.kategorialNama}</strong>
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => setEditOpen(true)}
            className='flex-1 sm:flex-initial h-8.5 sm:h-8 gap-1.5 text-xs font-semibold'
          >
            <Edit className='size-3.5' /> Edit Metadata
          </Button>
          <Button
            asChild
            size='sm'
            className='flex-1 sm:flex-initial h-8.5 sm:h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold'
          >
            <a href={archive.accessUrl} target='_blank' rel='noopener noreferrer' download>
              <Download className='size-3.5' /> Unduh Arsip
            </a>
          </Button>
          <Button
            size='icon'
            variant='ghost'
            onClick={() => {
              setDeleteOpen(true)
              setDeleteReason('')
            }}
            className='size-8.5 sm:size-8 shrink-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            title='Hapus Arsip'
          >
            <Trash2 className='size-4' />
          </Button>
        </div>
      </div>

      {/* Metadata Overview Cards */}
      <div className='grid gap-4 sm:grid-cols-4'>
        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>STATUS MASA BERLAKU</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-1 px-3'>
            {renderStatusBadge(archive.status)}
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TANGGAL DOKUMEN</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3 text-xs font-mono font-medium'>
            {new Date(archive.tanggalDokumen).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>LINGKUP ORGANISASI</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3 text-xs font-medium text-foreground flex items-center gap-1.5'>
            <Building className='size-3.5 text-primary' /> {archive.kategorialNama}
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>UKURAN & FORMAT</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3 text-xs font-mono'>
            {formatFileSize(archive.fileSize)} ({archive.mimeType})
          </CardContent>
        </Card>
      </div>

      {/* Uploader & Description */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card className='shadow-xs bg-card sm:col-span-1'>
          <CardHeader className='pb-2 pt-3 px-4'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase'>INFORMASI PENGUNGGAH</CardTitle>
          </CardHeader>
          <CardContent className='px-4 pb-4 space-y-2 text-xs'>
            <div className='text-muted-foreground text-[11px]'>
              Diupload oleh: <strong>{archive.uploadedById || 'Staff Sekretariat'}</strong>
            </div>
            <div className='text-muted-foreground text-[11px] font-mono'>
              Tanggal Upload: {new Date(archive.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card sm:col-span-2'>
          <CardHeader className='pb-2 pt-3 px-4'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase'>CATATAN & DESKRIPSI</CardTitle>
          </CardHeader>
          <CardContent className='px-4 pb-4 text-xs text-foreground'>
            {archive.deskripsi ? (
              <p className='leading-relaxed'>{archive.deskripsi}</p>
            ) : (
              <span className='text-muted-foreground italic'>Tidak ada catatan khusus untuk arsip ini.</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Document Viewer Preview Section */}
      <Card className='shadow-xs bg-card overflow-hidden'>
        <CardHeader className='pb-3 pt-4 px-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div>
            <CardTitle className='text-sm font-bold flex items-center gap-2'>
              <Eye className='size-4 text-primary shrink-0' /> Pratinjau Dokumen
            </CardTitle>
            <CardDescription className='text-xs'>
              Pratinjau berkas arsip resmi gereja.
            </CardDescription>
          </div>
          <Button asChild size='sm' variant='outline' className='h-8 sm:h-7 text-xs gap-1.5 w-full sm:w-auto justify-center font-medium shrink-0'>
            <a href={archive.accessUrl} target='_blank' rel='noopener noreferrer'>
              <ExternalLink className='size-3.5' /> Buka di Tab Baru
            </a>
          </Button>
        </CardHeader>
        <CardContent className='p-4'>
          {isImage ? (
            <div className='flex justify-center bg-muted/20 p-4 rounded-lg border'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={archive.accessUrl}
                alt={archive.judul}
                className='max-h-[600px] object-contain rounded shadow-sm'
              />
            </div>
          ) : isPdf ? (
            <div className='w-full rounded-lg overflow-hidden border bg-muted/10'>
              <iframe
                src={archive.accessUrl}
                title={archive.judul}
                className='w-full h-[650px] border-0'
              />
            </div>
          ) : (
            <div className='p-8 border border-dashed rounded-lg text-center space-y-3'>
              <FileText className='size-12 text-muted-foreground mx-auto' />
              <p className='text-xs text-muted-foreground'>
                Pratinjau langsung tidak didukung untuk format ini di browser Anda. Silakan unduh berkas untuk membukanya.
              </p>
              <Button asChild size='sm'>
                <a href={archive.accessUrl} download>
                  <Download className='size-4 me-1' /> Unduh Berkas Arsip
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog Edit Metadata Arsip ────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Edit Metadata Arsip Dokumen</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Perbarui informasi judul, kategori, lingkup pelayanan, atau status masa berlaku arsip.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Judul Dokumen Arsip *</Label>
                <Input
                  value={editJudul}
                  onChange={(e) => setEditJudul(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Jenis Arsip *</Label>
                  <Select value={editJenis} onValueChange={(val) => setEditJenis(val as JenisArsip)}>
                    <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='LEGALITAS' className='text-xs'>Legalitas</SelectItem>
                      <SelectItem value='NOTULEN' className='text-xs'>Notulen</SelectItem>
                      <SelectItem value='SURAT_MASUK' className='text-xs'>Surat Masuk</SelectItem>
                      <SelectItem value='SURAT_KELUAR' className='text-xs'>Surat Keluar</SelectItem>
                      <SelectItem value='KONTRAK' className='text-xs'>Kontrak</SelectItem>
                      <SelectItem value='KEUANGAN_ARCHIVE' className='text-xs'>Arsip Keuangan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs'>Status Masa Berlaku *</Label>
                  <Select value={editStatus} onValueChange={(val) => setEditStatus(val as StatusArsip)}>
                    <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='AKTIF' className='text-xs'>AKTIF</SelectItem>
                      <SelectItem value='PERMANEN' className='text-xs'>PERMANEN</SelectItem>
                      <SelectItem value='INAKTIF' className='text-xs'>INAKTIF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Lingkup Kategorial</Label>
                <Select value={editKategorialId} onValueChange={setEditKategorialId}>
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

              <div className='space-y-1.5'>
                <Label className='text-xs'>Deskripsi / Catatan Dokumen</Label>
                <Textarea
                  value={editDeskripsi}
                  onChange={(e) => setEditDeskripsi(e.target.value)}
                  className='text-xs'
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => setEditOpen(false)} disabled={isUpdating}>
                Batal
              </Button>
              <Button type='submit' disabled={isUpdating} className='gap-2'>
                {isUpdating ? <Loader2 className='size-4 animate-spin' /> : <Edit className='size-4' />}
                {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog Konfirmasi Hapus Arsip ─────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Hapus Dokumen Arsip Gereja?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-sm space-y-2'>
              <span>
                Apakah Anda yakin ingin menghapus berkas <strong className='text-foreground'>{archive.judul}</strong>?
              </span>
              <span className='block text-xs text-muted-foreground'>
                Arsip akan ditandai sebagai dihapus (soft-delete), berkas fisik dibersihkan dari penyimpanan, dan pencatatan audit SHA-256 akan disimpan.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2'>
            <Label className='text-xs font-semibold'>Alasan Penghapusan (Wajib, min. 5 karakter) *</Label>
            <Input
              placeholder='Contoh: Dokumen kadaluarsa / diganti dengan addendum kontrak terbaru'
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className='text-xs h-9 mt-1.5'
              required
            />
          </div>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button
              className='bg-rose-600 hover:bg-rose-700 text-white gap-2'
              onClick={handleDeleteSubmit}
              disabled={isDeleting || deleteReason.trim().length < 5}
            >
              {isDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
              {isDeleting ? 'Menghapus...' : 'Hapus Arsip'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
