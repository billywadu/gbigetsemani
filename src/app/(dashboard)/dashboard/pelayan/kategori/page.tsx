'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Loader2,
  Users,
  MoreHorizontal,
  Eye,
  SlidersHorizontal,
  FilterX,
  CheckCircle2,
  Layers,
  Tag,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getKategoriPelayananListAction,
  createKategoriPelayananAction,
  updateKategoriPelayananAction,
  deleteKategoriPelayananAction,
  restoreKategoriPelayananAction,
  hardDeleteKategoriPelayananAction,
} from '@/actions/pelayan'
import { toast } from 'sonner'

export default function KategoriPelayananPage() {
  const [loading, setLoading] = useState(true)
  const [kategoriList, setKategoriList] = useState<any[]>([])
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [searchTerm, setSearchTerm] = useState('')

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newNama, setNewNama] = useState('')
  const [newDeskripsi, setNewDeskripsi] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Edit Modal
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [editNama, setEditNama] = useState('')
  const [editDeskripsi, setEditDeskripsi] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete & Restore & Hard Delete
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deletionReason, setDeletionReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [hardDeleteTarget, setHardDeleteTarget] = useState<any | null>(null)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [isHardDeleting, setIsHardDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getKategoriPelayananListAction({ statusHapus: statusHapusFilter })
    if (res.success && res.data) {
      setKategoriList(res.data)
    } else {
      toast.error(res.error || 'Gagal memuat bidang pelayanan.')
    }
    setLoading(false)
  }, [statusHapusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNama.trim()) { toast.error('Nama bidang pelayanan wajib diisi!'); return }

    setIsCreating(true)
    const res = await createKategoriPelayananAction({ nama: newNama.trim(), deskripsi: newDeskripsi.trim() || null })
    setIsCreating(false)

    if (res.success) {
      toast.success(`Bidang pelayanan "${res.data?.nama}" berhasil dibuat! Log audit SHA-256 tersimpan.`)
      setCreateOpen(false)
      setNewNama('')
      setNewDeskripsi('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal membuat bidang pelayanan.')
    }
  }

  const handleEditOpen = (kat: any) => {
    setEditTarget(kat)
    setEditNama(kat.nama)
    setEditDeskripsi(kat.deskripsi || '')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return

    setIsUpdating(true)
    const res = await updateKategoriPelayananAction({ id: editTarget.id, nama: editNama.trim(), deskripsi: editDeskripsi.trim() || null })
    setIsUpdating(false)

    if (res.success) {
      toast.success(`Bidang pelayanan "${res.data?.nama}" berhasil diperbarui!`)
      setEditTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui bidang pelayanan.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !deletionReason.trim()) { toast.error('Alasan penghapusan wajib diisi!'); return }

    setIsDeleting(true)
    const res = await deleteKategoriPelayananAction({ id: deleteTarget.id, reason: deletionReason.trim() })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Bidang pelayanan berhasil di-soft delete.')
      setDeleteTarget(null)
      setDeletionReason('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus bidang pelayanan.')
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    const res = await restoreKategoriPelayananAction({ id: restoreTarget.id })
    setIsRestoring(false)

    if (res.success) {
      toast.success(res.message || 'Bidang pelayanan berhasil dipulihkan!')
      setRestoreTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memulihkan bidang pelayanan.')
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return
    setIsHardDeleting(true)
    const res = await hardDeleteKategoriPelayananAction({
      id: hardDeleteTarget.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setIsHardDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Bidang pelayanan berhasil dihapus permanen dari database!')
      setHardDeleteTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus permanen bidang pelayanan.')
    }
  }

  const filteredList = kategoriList.filter((k) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return k.nama.toLowerCase().includes(q) || (k.deskripsi && k.deskripsi.toLowerCase().includes(q))
  })

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4'>
        <div className='flex items-start gap-3 sm:gap-4'>
          <Button asChild variant='ghost' size='icon' className='size-8 mt-0.5 shrink-0'>
            <Link href='/dashboard/pelayan'><ArrowLeft className='size-4' /></Link>
          </Button>
          <div className='min-w-0 flex-1'>
            <h1 className='text-lg sm:text-2xl font-bold tracking-tight text-foreground'>Bidang Pelayanan</h1>
            <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
              Master divisi, peran, dan spesialisasi tim pelayanan ibadah.
            </p>
          </div>
        </div>
        <Button size='sm' onClick={() => setCreateOpen(true)} className='gap-2 h-8 text-xs font-semibold w-full sm:w-auto justify-center'>
          <Plus className='size-3.5' /> Tambah Bidang Baru
        </Button>
      </div>

      {/* Top Sub-Navigation Tabs matching shadcn design */}
      <div className='flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl w-fit border'>
        <Button
          asChild
          size='sm'
          variant='ghost'
          className='h-8 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground'
        >
          <Link href='/dashboard/pelayan'>
            <Users className='size-3.5 text-primary' />
            <span>Daftar Pelayan</span>
          </Link>
        </Button>

        <Button
          asChild
          size='sm'
          variant='secondary'
          className='h-8 text-xs font-semibold gap-1.5 shadow-xs bg-background text-foreground'
        >
          <Link href='/dashboard/pelayan/kategori'>
            <Tag className='size-3.5 text-primary' />
            <span>Divisi & Bidang Pelayanan</span>
            <Badge variant='outline' className='text-[10px] py-0 px-1.5 ml-1 font-mono'>
              {kategoriList.length}
            </Badge>
          </Link>
        </Button>
      </div>

      {/* Toolbar Filter Section */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <Input
            placeholder='Filter bidang pelayanan...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='h-8 text-xs w-full sm:w-55'
          />

          {/* Filter Status Hapus */}
          <div className='flex items-center gap-2'>
            <Select
              value={statusHapusFilter}
              onValueChange={(val: 'ACTIVE' | 'DELETED' | 'ALL') => setStatusHapusFilter(val)}
            >
              <SelectTrigger className='h-8 w-full sm:w-36 text-xs font-medium px-2.5'>
                <SelectValue placeholder='Status Data' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ACTIVE' className='text-xs'>
                  <span className='flex items-center gap-1.5'>
                    <CheckCircle2 className='size-3.5 text-emerald-600' />
                    <span>Data Aktif</span>
                  </span>
                </SelectItem>
                <SelectItem value='DELETED' className='text-xs'>
                  <span className='flex items-center gap-1.5'>
                    <Trash2 className='size-3.5 text-rose-500' />
                    <span>Terhapus</span>
                  </span>
                </SelectItem>
                <SelectItem value='ALL' className='text-xs'>
                  <span className='flex items-center gap-1.5'>
                    <Layers className='size-3.5 text-muted-foreground' />
                    <span>Semua Status</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || statusHapusFilter !== 'ACTIVE') && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSearchTerm('')
                  setStatusHapusFilter('ACTIVE')
                }}
                className='h-8 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0'
              >
                <RotateCcw className='size-3.5 mr-1' /> Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <div className='rounded-md border overflow-hidden bg-card'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent border-b bg-muted/30'>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap w-56'>Nama Bidang Pelayanan</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap max-w-xs'>Deskripsi & Tanggung Jawab</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap w-36'>Total Pelayan</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap min-w-45'>Breakdown Kategorial</TableHead>
                <TableHead className='w-12.5 px-4 whitespace-nowrap text-end'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className='h-32 text-center text-muted-foreground text-sm'>
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='size-4 animate-spin text-primary' /> Memuat bidang pelayanan...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='h-32 text-center text-muted-foreground text-sm'>
                    Belum ada bidang pelayanan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((kat) => {
                  const isDeleted = !!kat.deletedAt
                  return (
                    <TableRow
                      key={kat.id}
                      className={`transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'}`}
                    >
                      <TableCell className='px-4 py-3 font-semibold text-sm text-foreground whitespace-nowrap'>
                        <div className='flex items-center gap-2'>
                          <span>{kat.nama}</span>
                          {isDeleted && (
                            <Badge variant='destructive' className='text-[10px] gap-1 font-mono'>
                              <Trash2 className='size-3' /> Terhapus
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className='px-4 py-3 text-xs text-muted-foreground max-w-xs truncate'
                        title={kat.deskripsi || '-'}
                      >
                        {kat.deskripsi || '-'}
                      </TableCell>
                      <TableCell className='px-4 py-3 whitespace-nowrap'>
                        <Badge variant='outline' className='gap-1 font-mono font-normal text-[11px] shrink-0'>
                          <Users className='size-3 text-primary' /> {kat.totalPelayan} Pelayan
                        </Badge>
                      </TableCell>
                      <TableCell className='px-4 py-3 text-xs whitespace-nowrap'>
                        {kat.breakdownPerKategorial.length === 0 ? (
                          <span className='text-muted-foreground'>-</span>
                        ) : (
                          <div className='flex flex-wrap gap-1 max-w-xs'>
                            {kat.breakdownPerKategorial.slice(0, 3).map((b: any) => (
                              <Badge key={b.kategorialId} variant='secondary' className='text-[10px] font-normal py-0 px-1.5'>
                                {b.kategorialName}: {b.totalPelayan}
                              </Badge>
                            ))}
                            {kat.breakdownPerKategorial.length > 3 && (
                              <Link href={`/dashboard/pelayan/kategori/${kat.id}`} className='text-[10px] text-primary hover:underline'>
                                +{kat.breakdownPerKategorial.length - 3} lagi
                              </Link>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-end whitespace-nowrap'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='icon' className='size-7'>
                              <MoreHorizontal className='size-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuLabel className='text-xs'>Aksi Bidang</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/pelayan/kategori/${kat.id}`}>
                                <Eye className='size-3.5 me-2' /> Lihat Detail
                              </Link>
                            </DropdownMenuItem>

                            {isDeleted ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setRestoreTarget(kat)}
                                  className='text-emerald-600 dark:text-emerald-400 text-xs'
                                >
                                  <RotateCcw className='size-3.5 me-2' /> Pulihkan Bidang Pelayanan
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setHardDeleteTarget(kat)}
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                >
                                  <Trash2 className='size-3.5 me-2' /> Hapus Permanen
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => handleEditOpen(kat)}>
                                  <Edit className='size-3.5 me-2' /> Edit Bidang
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className='text-rose-600 dark:text-rose-400 text-xs'
                                  onClick={() => setDeleteTarget(kat)}
                                >
                                  <Trash2 className='size-3.5 me-2' /> Soft Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Dialog Create Bidang Pelayanan ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Tambah Bidang Pelayanan Baru</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Buat kategori spesialisasi baru untuk tim pelayan gereja.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Nama Bidang Pelayanan *</Label>
                <Input value={newNama} onChange={(e) => setNewNama(e.target.value)} placeholder='Contoh: Dekorasi Gereja, Media Sosial...' className='text-xs' required />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Deskripsi & Tanggung Jawab</Label>
                <Textarea value={newDeskripsi} onChange={(e) => setNewDeskripsi(e.target.value)} placeholder='Jelaskan ruang lingkup pelayanan ini...' className='text-xs' />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => setCreateOpen(false)} disabled={isCreating}>Batal</Button>
              <Button type='submit' disabled={isCreating} className='gap-2'>
                {isCreating ? <Loader2 className='size-4 animate-spin' /> : <Plus className='size-4' />}
                {isCreating ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Edit Bidang Pelayanan ──── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent className='max-w-md'>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold'>Edit Bidang Pelayanan</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Perbarui nama dan deskripsi bidang spesialisasi {editTarget?.nama}.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-3 text-xs'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Nama Bidang Pelayanan *</Label>
                <Input value={editNama} onChange={(e) => setEditNama(e.target.value)} placeholder='Nama bidang pelayanan...' className='text-xs' required />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Deskripsi & Tanggung Jawab</Label>
                <Textarea value={editDeskripsi} onChange={(e) => setEditDeskripsi(e.target.value)} placeholder='Jelaskan ruang lingkup pelayanan ini...' className='text-xs' />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => setEditTarget(null)} disabled={isUpdating}>Batal</Button>
              <Button type='submit' disabled={isUpdating} className='gap-2'>
                {isUpdating ? <Loader2 className='size-4 animate-spin' /> : <Edit className='size-4' />}
                {isUpdating ? 'Memperbarui...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog Soft Delete ──────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeletionReason('') }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 dark:text-rose-400'>Soft Delete Bidang Pelayanan?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>Bidang <strong className='text-foreground'>{deleteTarget?.nama}</strong> akan dinonaktifkan via Soft Delete.</span>
                <span className='block text-xs text-muted-foreground'>Menghapus bidang pelayanan akan melepaskan relasi bidang tersebut dari seluruh Pelayan. Data Pelayan dan Jemaat tidak akan dihapus.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='py-2 space-y-1.5'>
            <label className='text-xs font-semibold text-foreground block'>Alasan Penghapusan (Wajib):</label>
            <Textarea
              placeholder='Masukkan alasan penghapusan bidang pelayanan ini...'
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className='text-xs'
            />
          </div>
          <AlertDialogFooter>
            <Button variant='outline' onClick={() => { setDeleteTarget(null); setDeletionReason('') }} disabled={isDeleting}>Batal</Button>
            <Button
              className='bg-rose-600 hover:bg-rose-700 text-white gap-2'
              onClick={handleDeleteConfirm}
              disabled={isDeleting || !deletionReason.trim()}
            >
              {isDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
              Konfirmasi Soft Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Restore Confirm ──── */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Bidang Pelayanan?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <span>
                  Bidang Pelayanan <strong className='text-foreground'>{restoreTarget?.nama}</strong> akan dipulihkan kembali ke daftar aktif.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setRestoreTarget(null)} disabled={isRestoring}>
              Batal
            </Button>
            <Button
              className='bg-emerald-600 hover:bg-emerald-700 text-white gap-2'
              onClick={handleRestoreConfirm}
              disabled={isRestoring}
            >
              {isRestoring ? <Loader2 className='size-4 animate-spin' /> : <RotateCcw className='size-4' />}
              Ya, Pulihkan Bidang Pelayanan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog Hard Delete Confirm ─ */}
      <AlertDialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5 text-rose-600' /> Hapus Permanen Bidang Pelayanan?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium text-xs'>
                  ⚠️ <strong>PERINGATAN</strong>: Bidang Pelayanan <strong className='text-foreground'>{hardDeleteTarget?.nama}</strong> akan dihapus secara permanen dari database.
                </div>
                <div className='space-y-1 pt-2'>
                  <label className='text-xs font-semibold text-foreground block'>Keterangan Tambahan (Opsional):</label>
                  <Textarea
                    placeholder='Catatan penghapusan permanen...'
                    value={hardDeleteReason}
                    onChange={(e) => setHardDeleteReason(e.target.value)}
                    className='text-xs min-h-12.5'
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <Button variant='outline' onClick={() => setHardDeleteTarget(null)} disabled={isHardDeleting}>
              Batal
            </Button>
            <Button
              variant='destructive'
              className='gap-2 bg-rose-700 hover:bg-rose-800'
              onClick={handleHardDeleteConfirm}
              disabled={isHardDeleting}
            >
              {isHardDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
              Hapus Permanen Sekarang
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
