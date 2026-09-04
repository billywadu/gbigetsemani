'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  Download,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Trash2,
  Edit,
  Loader2,
  FileCode,
  ExternalLink,
  Eye
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
  getDokumenJemaatByIdAction,
  updateDokumenJemaatAction,
  deleteDokumenJemaatAction,
  DokumenJemaatDetailDTO,
} from '@/actions/dokumen'
import { JenisDokumen, StatusDokumen } from '@/lib/validations/dokumen'
import { toast } from 'sonner'

export default function DokumenJemaatDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [doc, setDoc] = useState<DokumenJemaatDetailDTO | null>(null)

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false)
  const [editJudul, setEditJudul] = useState('')
  const [editJenis, setEditJenis] = useState<JenisDokumen>('BAPTIS')
  const [editStatus, setEditStatus] = useState<StatusDokumen>('DRAFT')
  const [editDeskripsi, setEditDeskripsi] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete Modal State
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchDoc = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getDokumenJemaatByIdAction(id)
    if (res.success && res.data) {
      setDoc(res.data)
      setEditJudul(res.data.judul)
      setEditJenis(res.data.jenisDokumen)
      setEditStatus(res.data.status)
      setEditDeskripsi(res.data.deskripsi || '')
    } else {
      toast.error(res.error || 'Dokumen tidak ditemukan.')
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchDoc()
  }, [fetchDoc])

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doc) return

    setIsUpdating(true)
    const res = await updateDokumenJemaatAction({
      id: doc.id,
      judul: editJudul.trim(),
      jenisDokumen: editJenis,
      status: editStatus,
      deskripsi: editDeskripsi.trim() || null,
    })
    setIsUpdating(false)

    if (res.success) {
      toast.success(res.message || 'Dokumen berhasil diperbarui!')
      setEditOpen(false)
      fetchDoc()
    } else {
      toast.error(res.error || 'Gagal memperbarui dokumen.')
    }
  }

  const handleDeleteSubmit = async () => {
    if (!doc) return
    if (!deleteReason.trim() || deleteReason.trim().length < 5) {
      toast.error('Alasan penghapusan minimal 5 karakter!')
      return
    }

    setIsDeleting(true)
    const res = await deleteDokumenJemaatAction({
      id: doc.id,
      reason: deleteReason.trim(),
    })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Dokumen berhasil dihapus!')
      router.push('/dashboard/dokumen-jemaat')
    } else {
      toast.error(res.error || 'Gagal menghapus dokumen.')
    }
  }

  const renderJenisBadge = (jenis: JenisDokumen) => {
    switch (jenis) {
      case 'BAPTIS':
        return <Badge className='bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs'>Surat Baptis</Badge>
      case 'NIKAH':
        return <Badge className='bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs'>Surat Nikah</Badge>
      case 'PENYERAHAN_ANAK':
        return <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs'>Penyerahan Anak</Badge>
      case 'SAKSI':
        return <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs'>Surat Saksi</Badge>
      default:
        return <Badge variant='outline' className='text-xs'>{jenis}</Badge>
    }
  }

  const renderStatusBadge = (status: StatusDokumen) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs gap-1 font-mono'>
            <ShieldCheck className='size-3.5' /> TERVERIFIKASI (VERIFIED)
          </Badge>
        )
      case 'DRAFT':
        return (
          <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs gap-1 font-mono'>
            <Clock className='size-3.5' /> DRAFT (MENUNGGU VERIFIKASI)
          </Badge>
        )
      case 'EXPIRED':
        return (
          <Badge className='bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs gap-1 font-mono'>
            <AlertTriangle className='size-3.5' /> KADALUARSA (EXPIRED)
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
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat berkas dokumen dari secure storage...
      </div>
    )
  }

  if (!doc) {
    return (
      <div className='space-y-4 max-w-xl mx-auto py-12 text-center'>
        <h2 className='text-xl font-bold text-rose-600 dark:text-rose-400'>Dokumen Tidak Ditemukan</h2>
        <p className='text-sm text-muted-foreground'>Berkas dokumen jemaat tidak ditemukan atau telah dihapus.</p>
        <Button asChild variant='outline'>
          <Link href='/dashboard/dokumen-jemaat'>Kembali ke Repositori</Link>
        </Button>
      </div>
    )
  }

  const isImage = doc.mimeType.startsWith('image/')
  const isPdf = doc.mimeType === 'application/pdf'

  return (
    <div className='space-y-6 max-w-5xl mx-auto'>
      {/* Header Bar */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4'>
        <div className='flex items-start gap-3'>
          <Button asChild variant='ghost' size='icon' className='size-8 shrink-0 mt-0.5'>
            <Link href='/dashboard/dokumen-jemaat'>
              <ArrowLeft className='size-4' />
            </Link>
          </Button>
          <div className='min-w-0 flex-1 space-y-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-lg sm:text-2xl font-bold tracking-tight text-foreground'>{doc.judul}</h1>
              {renderJenisBadge(doc.jenisDokumen)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Dokumen milik <strong className='text-foreground'>{doc.jemaatNama}</strong> (NIJ: {doc.jemaatNij})
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
            <a href={doc.accessUrl} target='_blank' rel='noopener noreferrer' download>
              <Download className='size-3.5' /> Unduh Berkas
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
            title='Hapus Dokumen'
          >
            <Trash2 className='size-4' />
          </Button>
        </div>
      </div>

      {/* Metadata Overview Cards */}
      <div className='grid gap-4 sm:grid-cols-4'>
        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>STATUS DOKUMEN</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-1 px-3'>
            {renderStatusBadge(doc.status)}
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TANGGAL TERBIT</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3 text-xs font-mono font-medium'>
            {new Date(doc.tanggalTerbit).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TANGGAL KADALUARSA</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3 text-xs font-mono'>
            {doc.tanggalKadaluarsa ? (
              new Date(doc.tanggalKadaluarsa).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            ) : (
              <span className='text-muted-foreground'>Berlaku Permanen</span>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>UKURAN & FORMAT</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3 text-xs font-mono'>
            {formatFileSize(doc.fileSize)} ({doc.mimeType})
          </CardContent>
        </Card>
      </div>

      {/* Jemaat Info & Description */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card className='shadow-xs bg-card sm:col-span-1'>
          <CardHeader className='pb-2 pt-3 px-4'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase'>PROFIL PEMILIK</CardTitle>
          </CardHeader>
          <CardContent className='px-4 pb-4 space-y-2 text-xs'>
            <div className='flex items-center gap-2'>
              <User className='size-4 text-primary shrink-0' />
              <div>
                <Link href={`/dashboard/jemaat/${doc.jemaatId}`} className='font-bold hover:underline hover:text-primary'>
                  {doc.jemaatNama}
                </Link>
                <div className='text-muted-foreground font-mono text-[11px]'>NIJ: {doc.jemaatNij}</div>
              </div>
            </div>
            <div className='pt-2 border-t text-muted-foreground text-[11px]'>
              Diupload oleh: <strong>{doc.uploadedById || 'Staff Sekretariat'}</strong> pada {new Date(doc.createdAt).toLocaleDateString('id-ID')}
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card sm:col-span-2'>
          <CardHeader className='pb-2 pt-3 px-4'>
            <CardTitle className='text-xs font-semibold text-muted-foreground uppercase'>CATATAN & DESKRIPSI</CardTitle>
          </CardHeader>
          <CardContent className='px-4 pb-4 text-xs text-foreground'>
            {doc.deskripsi ? (
              <p className='leading-relaxed'>{doc.deskripsi}</p>
            ) : (
              <span className='text-muted-foreground italic'>Tidak ada catatan khusus untuk dokumen ini.</span>
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
              Pratinjau berkas sertifikat atau dokumen jemaat.
            </CardDescription>
          </div>
          <Button asChild size='sm' variant='outline' className='h-8 sm:h-7 text-xs gap-1.5 w-full sm:w-auto justify-center font-medium shrink-0'>
            <a href={doc.accessUrl} target='_blank' rel='noopener noreferrer'>
              <ExternalLink className='size-3.5' /> Buka di Tab Baru
            </a>
          </Button>
        </CardHeader>
        <CardContent className='p-4'>
          {isImage ? (
            <div className='flex justify-center bg-muted/20 p-4 rounded-lg border'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.accessUrl}
                alt={doc.judul}
                className='max-h-[600px] object-contain rounded shadow-sm'
              />
            </div>
          ) : isPdf ? (
            <div className='w-full rounded-lg overflow-hidden border bg-muted/10'>
              <iframe
                src={doc.accessUrl}
                title={doc.judul}
                className='w-full h-[650px] border-0'
              />
            </div>
          ) : (
            <div className='p-8 border border-dashed rounded-lg text-center space-y-3'>
              <FileText className='size-12 text-muted-foreground mx-auto' />
              <p className='text-xs text-muted-foreground'>
                Pratinjau langsung tidak didukung untuk format ini di peramban Anda. Silakan unduh berkas untuk membukanya.
              </p>
              <Button asChild size='sm'>
                <a href={doc.accessUrl} download>
                  <Download className='size-4 me-1' /> Unduh Berkas Dokumen
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog Edit Metadata Dokumen ────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Edit Metadata & Status Dokumen</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Perbarui status verifikasi atau informasi judul dokumen jemaat.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Judul Dokumen *</Label>
                <Input
                  value={editJudul}
                  onChange={(e) => setEditJudul(e.target.value)}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Jenis Dokumen *</Label>
                  <Select value={editJenis} onValueChange={(val) => setEditJenis(val as JenisDokumen)}>
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
                  <Label className='text-xs'>Status Verifikasi *</Label>
                  <Select value={editStatus} onValueChange={(val) => setEditStatus(val as StatusDokumen)}>
                    <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='DRAFT' className='text-xs'>DRAFT</SelectItem>
                      <SelectItem value='VERIFIED' className='text-xs'>VERIFIED (Sah)</SelectItem>
                      <SelectItem value='EXPIRED' className='text-xs'>EXPIRED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Deskripsi / Catatan Tambahan</Label>
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

      {/* ── AlertDialog Konfirmasi Hapus Dokumen ────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Hapus Dokumen Vault Jemaat?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-sm space-y-2'>
              <span>
                Apakah Anda yakin ingin menghapus berkas <strong className='text-foreground'>{doc.judul}</strong> milik <strong className='text-foreground'>{doc.jemaatNama}</strong>?
              </span>
              <span className='block text-xs text-muted-foreground'>
                Record akan di-soft-delete dari database, berkas fisik dihapus dari storage, dan audit SHA-256 akan dicatat.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2'>
            <Label className='text-xs font-semibold'>Alasan Penghapusan (Wajib, min. 5 karakter) *</Label>
            <Input
              placeholder='Contoh: Dokumen keliru diunggah / diganti dengan berkas asli terbaru'
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
              {isDeleting ? 'Menghapus...' : 'Hapus Dokumen'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
