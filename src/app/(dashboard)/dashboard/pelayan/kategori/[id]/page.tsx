'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  Loader2,
  MoreHorizontal,
  Eye,
  Tag,
  UserMinus,
  Edit,
  Trash2,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  getKategoriPelayananByIdAction,
  updateKategoriPelayananAction,
  deleteKategoriPelayananAction,
  removePelayanFromKategoriPelayananAction,
} from '@/actions/pelayan'
import { formatAgeString } from '@/lib/utils/age'
import { toast } from 'sonner'

export default function KategoriPelayananDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<any | null>(null)

  // Edit Category State
  const [editOpen, setEditOpen] = useState(false)
  const [editNama, setEditNama] = useState('')
  const [editDeskripsi, setEditDeskripsi] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete Category State
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Remove Member State
  const [removeTarget, setRemoveTarget] = useState<any | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getKategoriPelayananByIdAction(id)
    if (res.success && res.data) {
      setCategory(res.data)
    } else {
      toast.error(res.error || 'Data bidang pelayanan tidak ditemukan.')
    }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRemovePelayan = async () => {
    if (!removeTarget || !category) return
    setIsRemoving(true)
    const res = await removePelayanFromKategoriPelayananAction({
      pelayanId: removeTarget.pelayan.id,
      kategoriPelayananId: category.id,
      kategorialId: removeTarget.kategorialId || removeTarget.kategorial?.id || undefined,
    })
    setIsRemoving(false)
    if (res.success) {
      toast.success(res.message || 'Pelayan berhasil dikeluarkan dari bidang ini.')
      setRemoveTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal mengeluarkan pelayan.')
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category) return
    if (!editNama.trim()) {
      toast.error('Nama bidang pelayanan wajib diisi!')
      return
    }

    setIsUpdating(true)
    const res = await updateKategoriPelayananAction({
      id: category.id,
      nama: editNama.trim(),
      deskripsi: editDeskripsi.trim() || null,
    })
    setIsUpdating(false)

    if (res.success) {
      toast.success('Bidang pelayanan berhasil diperbarui!')
      setEditOpen(false)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui bidang pelayanan.')
    }
  }

  const handleDeleteSubmit = async () => {
    if (!category) return
    if (!deletionReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }

    setIsDeleting(true)
    const res = await deleteKategoriPelayananAction({
      id: category.id,
      reason: deletionReason.trim(),
    })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Bidang pelayanan berhasil di-soft delete.')
      setDeleteOpen(false)
      router.push('/dashboard/pelayan/kategori')
    } else {
      toast.error(res.error || 'Gagal menghapus bidang pelayanan.')
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-100 text-muted-foreground gap-2 text-sm'>
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat detail bidang pelayanan...
      </div>
    )
  }

  if (!category) {
    return (
      <div className='space-y-4 max-w-xl mx-auto py-12 text-center'>
        <h2 className='text-xl font-bold text-rose-600 dark:text-rose-400'>Data Tidak Ditemukan</h2>
        <p className='text-sm text-muted-foreground'>Bidang pelayanan telah dihapus atau tidak terdaftar.</p>
        <Button asChild variant='outline'>
          <Link href='/dashboard/pelayan/kategori'>Kembali ke Bidang Pelayanan</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header Bar */}
      <div className='flex flex-col gap-3.5 border-b pb-4'>
        {/* Navigation & Badges Row */}
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          <Button asChild variant='ghost' size='sm' className='h-8 px-2 -ml-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground'>
            <Link href='/dashboard/pelayan/kategori'>
              <ArrowLeft className='size-4' />
              <span>Daftar Bidang Pelayanan</span>
            </Link>
          </Button>
          <Badge variant='outline' className='gap-1 font-mono text-[10px] shrink-0'>
            <Tag className='size-3 text-muted-foreground' /> Bidang Pelayanan
          </Badge>
        </div>

        {/* Title & Description */}
        <div className='space-y-1'>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
            {category.nama}
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground'>
            {category.deskripsi || 'Bidang pelayanan jemaat gereja.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className='flex flex-wrap items-center gap-2 w-full pt-1 sm:w-auto sm:justify-start'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setEditNama(category.nama || '')
              setEditDeskripsi(category.deskripsi || '')
              setEditOpen(true)
            }}
            className='gap-1.5 h-8 text-xs justify-center flex-1 sm:flex-initial font-medium'
          >
            <Edit className='size-3.5' /> Edit Kategori
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setDeletionReason('')
              setDeleteOpen(true)
            }}
            className='gap-1.5 text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 h-8 text-xs justify-center flex-1 sm:flex-initial'
          >
            <Trash2 className='size-3.5' /> Hapus Kategori
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TOTAL PELAYAN TERDAFTAR</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3'>
            <div className='text-2xl font-bold font-mono text-primary flex items-center gap-1.5'>
              <Users className='size-5' /> {category.totalPelayan}
            </div>
          </CardContent>
        </Card>

        {/* Breakdown Per Kategorial */}
        <Card className='shadow-xs bg-card sm:col-span-2 lg:col-span-2'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>BREAKDOWN PER KATEGORIAL</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3'>
            {category.breakdownPerKategorial.length === 0 ? (
              <p className='text-xs text-muted-foreground'>Belum ada data breakdown.</p>
            ) : (
              <div className='flex flex-wrap gap-2'>
                {category.breakdownPerKategorial.map((b: any) => (
                  <Link key={b.kategorialId} href={`/dashboard/pelayan/kategorial/${b.kategorialId}`}>
                    <Badge variant='outline' className='gap-1.5 font-normal text-xs py-1 px-2.5 hover:bg-muted cursor-pointer'>
                      <Tag className='size-3 text-primary' />
                      {b.kategorialName}: <span className='font-bold font-mono'>{b.totalPelayan}</span>
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pelayan List Table */}
      <Card className='shadow-xs overflow-hidden'>
        <CardHeader className='pb-3 pt-4 px-4 border-b bg-muted/20'>
          <CardTitle className='text-sm sm:text-base flex items-center gap-2 font-bold'>
            <Users className='size-4 text-primary shrink-0' /> Daftar Pelayan ({category.totalPelayan})
          </CardTitle>
          <CardDescription className='text-xs'>
            Anggota tim pelayan dengan spesialisasi {category.nama}.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0 overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent border-b bg-muted/30'>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Nama Pelayan & NIJ</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Jenis Kelamin</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Usia</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Kategorial</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap min-w-45'>Deskripsi Tugas</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Status Jemaat</TableHead>
                <TableHead className='px-4 font-semibold text-xs text-end whitespace-nowrap'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {category.pelayanKategori.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-xs'>
                    Belum ada Pelayan pada bidang ini.
                  </TableCell>
                </TableRow>
              ) : (
                category.pelayanKategori.map((pk: any) => (
                  <TableRow key={pk.id} className='hover:bg-muted/30 transition-colors'>
                    <TableCell className='px-4 py-3'>
                      <div className='font-semibold text-foreground text-sm'>{pk.pelayan.jemaat.nama}</div>
                      <div className='font-mono text-muted-foreground text-[11px]'>{pk.pelayan.jemaat.nij}</div>
                    </TableCell>
                    <TableCell className='px-4 py-3 text-xs'>
                      {pk.pelayan.jemaat.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}
                    </TableCell>
                    <TableCell className='px-4 py-3 font-mono text-xs font-semibold text-foreground'>
                      {formatAgeString(pk.pelayan.jemaat.tanggalLahir)}
                    </TableCell>
                    <TableCell className='px-4 py-3 text-xs'>
                      {(() => {
                        const kat = pk.kategorial || pk.pelayan.kategorial
                        if (!kat) return <span className='text-muted-foreground'>Ibadah Raya / Umum</span>
                        return (
                          <Link href={`/dashboard/pelayan/kategorial/${kat.id}`} className='hover:underline text-primary text-xs font-medium'>
                            {kat.nama}
                          </Link>
                        )
                      })()}
                    </TableCell>
                    <TableCell className='px-4 py-3 text-xs text-muted-foreground'>
                      {pk.pelayan.deskripsiTugas || '-'}
                    </TableCell>
                    <TableCell className='px-4 py-3'>
                      <Badge className={
                        pk.pelayan.jemaat.statusJemaat === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px]'
                      }>
                        {pk.pelayan.jemaat.statusJemaat}
                      </Badge>
                    </TableCell>
                    <TableCell className='px-4 py-3 text-end'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon' className='size-7'>
                            <MoreHorizontal className='size-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuLabel className='text-xs'>Aksi</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/jemaat/${pk.pelayan.jemaat.id}`}>
                              <Eye className='size-3.5 me-2' /> Lihat Profil Jemaat
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setRemoveTarget(pk)}
                            className='text-rose-600 dark:text-rose-400 text-xs'
                          >
                            <UserMinus className='size-3.5 me-2' /> Keluarkan dari Bidang Ini
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AlertDialog Konfirmasi Hapus/Keluarkan Pelayan dari Bidang Pelayanan */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>
              Keluarkan Pelayan dari Bidang Pelayanan?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <p>
                  Anda akan mengeluarkan{' '}
                  <strong className='text-foreground'>{removeTarget?.pelayan?.jemaat?.nama}</strong> dari bidang pelayanan{' '}
                  <strong className='text-foreground'>{category?.nama}</strong>.
                </p>
                <p className='text-xs text-muted-foreground'>
                  Tindakan ini hanya menghapus penugasan pada bidang ini. Data profil pelayan dan keanggotaan jemaat tetap aman dan tidak terhapus.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setRemoveTarget(null)} disabled={isRemoving}>
              Batal
            </Button>
            <Button variant='destructive' onClick={handleRemovePelayan} disabled={isRemoving} className='gap-2'>
              {isRemoving ? <Loader2 className='size-4 animate-spin' /> : <UserMinus className='size-4' />}
              {isRemoving ? 'Mengeluarkan...' : 'Keluarkan dari Bidang'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Edit Kategori Pelayanan */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Edit Bidang Pelayanan</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Perbarui informasi nama dan deskripsi bidang pelayanan ini.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label htmlFor='edit-nama' className='text-xs'>Nama Bidang Pelayanan *</Label>
                <Input
                  id='edit-nama'
                  placeholder='Contoh: Pemusik, Multimedia, Usher...'
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className='text-xs'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='edit-deskripsi' className='text-xs'>Deskripsi & Spesialisasi</Label>
                <Textarea
                  id='edit-deskripsi'
                  placeholder='Penjelasan ruang lingkup pelayanan...'
                  value={editDeskripsi}
                  onChange={(e) => setEditDeskripsi(e.target.value)}
                  className='text-xs'
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => setEditOpen(false)} disabled={isUpdating}>
                Batal
              </Button>
              <Button type='submit' disabled={isUpdating} className='gap-2'>
                {isUpdating ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
                {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Soft Delete Kategori Pelayanan */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>
              Hapus Bidang Pelayanan?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-3 text-muted-foreground'>
                <p>
                  Apakah Anda yakin ingin menghapus bidang pelayanan{' '}
                  <strong className='text-foreground'>{category?.nama}</strong>?
                </p>
                <p className='text-xs text-muted-foreground'>
                  Semua penugasan pelayan pada bidang ini akan dilepas. Data profil pelayan dan jemaat tetap aman dan tidak terhapus.
                </p>
                <div className='space-y-1.5 pt-2'>
                  <Label htmlFor='deletion-reason' className='text-xs font-semibold text-foreground'>
                    Alasan Penghapusan *
                  </Label>
                  <Textarea
                    id='deletion-reason'
                    placeholder='Contoh: Penataan ulang struktur bidang pelayanan...'
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                    className='text-xs'
                    rows={2}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button variant='destructive' onClick={handleDeleteSubmit} disabled={isDeleting} className='gap-2'>
              {isDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
              {isDeleting ? 'Menghapus...' : 'Hapus Bidang Pelayanan'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
