'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Search,
  BookOpen,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ShieldAlert,
  FolderOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  getKategoriArtikelPaginatedAction,
  createKategoriArtikelAction,
  updateKategoriArtikelAction,
  deleteKategoriArtikelAction,
  KategoriArtikelDTO,
} from '@/actions/artikel'
import { slugify } from '@/lib/slug'
import { toast } from 'sonner'

export default function KategoriArtikelManagementPage() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<KategoriArtikelDTO[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<KategoriArtikelDTO | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete Alert
  const [deleteTarget, setDeleteTarget] = useState<KategoriArtikelDTO | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getKategoriArtikelPaginatedAction({
      search: searchTerm,
      statusHapus: 'ACTIVE',
      page: pageIndex + 1,
      pageSize,
    })

    if (res.success && res.data) {
      setCategories(res.data.items)
      setTotalCount(res.data.total)
    } else {
      toast.error(res.error || 'Gagal memuat kategori artikel.')
    }
    setLoading(false)
  }, [searchTerm, pageIndex, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const totalActiveArtikelCount = categories.reduce((acc, curr) => acc + curr.totalArtikel, 0)

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim() || newCatName.trim().length < 2) {
      toast.error('Nama kategori minimal 2 karakter!')
      return
    }

    setIsCreating(true)
    const res = await createKategoriArtikelAction({ nama: newCatName.trim() })
    setIsCreating(false)

    if (res.success) {
      toast.success(res.message || 'Kategori berhasil ditambahkan!')
      setNewCatName('')
      setCreateModalOpen(false)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menambahkan kategori.')
    }
  }

  const handleOpenEdit = (cat: KategoriArtikelDTO) => {
    setEditingTarget(cat)
    setEditCatName(cat.nama)
    setEditModalOpen(true)
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTarget || !editCatName.trim()) return

    setIsUpdating(true)
    const res = await updateKategoriArtikelAction({
      id: editingTarget.id,
      nama: editCatName.trim(),
    })
    setIsUpdating(false)

    if (res.success) {
      toast.success(res.message || 'Kategori berhasil diperbarui!')
      setEditModalOpen(false)
      setEditingTarget(null)
      fetchData()
    } else {
      toast.error(res.error || 'Gagal memperbarui kategori.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const res = await deleteKategoriArtikelAction({
      id: deleteTarget.id,
      reason: deleteReason.trim() || 'Dihapus dari manajemen kategori',
    })
    setIsDeleting(false)

    if (res.success) {
      toast.success(res.message || 'Kategori berhasil dihapus.')
      setDeleteTarget(null)
      setDeleteReason('')
      fetchData()
    } else {
      toast.error(res.error || 'Gagal menghapus kategori.')
    }
  }

  return (
    <div className='space-y-6'>
      {/* Header Bar with Sub-Nav Tabs */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div className='flex items-start sm:items-center gap-3'>
          <div className='p-2 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5 sm:mt-0'>
            <Tag className='size-5' />
          </div>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Kategori Artikel</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Kelola topik dan kategori artikel jemaat.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button
            size='sm'
            onClick={() => setCreateModalOpen(true)}
            className='w-full sm:w-auto gap-1.5 shadow-xs text-xs h-9 sm:h-8'
          >
            <Plus className='size-3.5' /> Tambah Kategori
          </Button>
        </div>
      </div>

      {/* Sub-Nav Tab Switcher */}
      <div className='flex items-center gap-2 border-b pb-2'>
        <Button asChild variant='ghost' size='sm' className='text-xs text-muted-foreground hover:text-foreground'>
          <Link href='/dashboard/artikel' className='flex items-center gap-1.5'>
            <BookOpen className='size-3.5' /> Semua Artikel
          </Link>
        </Button>
        <Button variant='secondary' size='sm' className='text-xs font-semibold flex items-center gap-1.5 shadow-xs'>
          <Tag className='size-3.5 text-primary' /> Kategori ({totalCount})
        </Button>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <Card className='shadow-xs'>
          <CardHeader className='p-4 pb-2 flex flex-row items-center justify-between'>
            <CardTitle className='text-xs font-semibold text-muted-foreground'>Total Kategori</CardTitle>
            <Tag className='size-4 text-primary' />
          </CardHeader>
          <CardContent className='p-4 pt-0'>
            <div className='text-2xl font-bold font-mono'>{totalCount}</div>
            <p className='text-[11px] text-muted-foreground mt-0.5'>Klasifikasi topik artikel aktif</p>
          </CardContent>
        </Card>

        <Card className='shadow-xs'>
          <CardHeader className='p-4 pb-2 flex flex-row items-center justify-between'>
            <CardTitle className='text-xs font-semibold text-muted-foreground'>Total Artikel Terkategori</CardTitle>
            <BookOpen className='size-4 text-emerald-500' />
          </CardHeader>
          <CardContent className='p-4 pt-0'>
            <div className='text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400'>
              {totalActiveArtikelCount}
            </div>
            <p className='text-[11px] text-muted-foreground mt-0.5'>Artikel & materi terhubung</p>
          </CardContent>
        </Card>

        <Card className='shadow-xs'>
          <CardHeader className='p-4 pb-2 flex flex-row items-center justify-between'>
            <CardTitle className='text-xs font-semibold text-muted-foreground'>Portal Katalog Publik</CardTitle>
            <ExternalLink className='size-4 text-sky-500' />
          </CardHeader>
          <CardContent className='p-4 pt-0 flex items-center justify-between'>
            <div>
              <div className='text-sm font-semibold text-foreground'>/artikel</div>
              <p className='text-[11px] text-muted-foreground mt-0.5'>Filter kategori publik langsung aktif</p>
            </div>
            <Button asChild variant='outline' size='sm' className='text-xs h-8'>
              <Link href='/artikel' target='_blank'>
                Kunjungi <ExternalLink className='size-3 ms-1' />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Action Toolbar */}
      <Card className='shadow-xs'>
        <CardContent className='p-4 space-y-4'>
          <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
            <div className='relative flex-1 max-w-sm'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
              <Input
                placeholder='Cari nama kategori atau slug...'
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPageIndex(0)
                }}
                className='ps-9 text-xs h-9'
              />
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-muted-foreground'>
                Menampilkan <strong className='text-foreground'>{categories.length}</strong> dari{' '}
                <strong className='text-foreground'>{totalCount}</strong> kategori
              </span>
            </div>
          </div>

          {/* Categories Table */}
          <div className='border rounded-lg overflow-hidden bg-card'>
            <Table>
              <TableHeader className='bg-muted/50'>
                <TableRow>
                  <TableHead className='w-12 text-center text-xs'>No</TableHead>
                  <TableHead className='text-xs'>Nama Kategori</TableHead>
                  <TableHead className='text-xs'>Slug URL Publik</TableHead>
                  <TableHead className='text-xs text-center'>Total Artikel</TableHead>
                  <TableHead className='text-xs text-end'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className='h-32 text-center text-muted-foreground text-sm'>
                      <div className='flex items-center justify-center gap-2'>
                        <Loader2 className='size-4 animate-spin text-primary' /> Memuat data kategori artikel...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='h-32 text-center text-muted-foreground text-sm'>
                      <div className='space-y-2'>
                        <FolderOpen className='size-8 text-muted-foreground mx-auto opacity-50' />
                        <div className='font-medium text-foreground'>Belum ada kategori yang sesuai.</div>
                        <Button size='sm' variant='outline' onClick={() => setCreateModalOpen(true)} className='text-xs'>
                          <Plus className='size-3.5 me-1 text-primary' /> Tambah Kategori Baru
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat, idx) => (
                    <TableRow key={cat.id} className='hover:bg-muted/40 transition-colors'>
                      <TableCell className='text-center text-xs font-mono text-muted-foreground'>
                        {pageIndex * pageSize + idx + 1}
                      </TableCell>
                      <TableCell className='text-xs font-bold text-foreground'>
                        <div className='flex items-center gap-2'>
                          <Tag className='size-3.5 text-primary shrink-0' />
                          <span>{cat.nama}</span>
                        </div>
                      </TableCell>
                      <TableCell className='text-xs font-mono text-muted-foreground'>
                        <Link
                          href={`/artikel?kategori=${cat.slug}`}
                          target='_blank'
                          className='inline-flex items-center gap-1 hover:text-primary hover:underline'
                        >
                          <span>/artikel?kategori={cat.slug}</span>
                          <ExternalLink className='size-3 text-muted-foreground/60' />
                        </Link>
                      </TableCell>
                      <TableCell className='text-center'>
                        <Badge variant={cat.totalArtikel > 0 ? 'secondary' : 'outline'} className='text-[10px] font-mono'>
                          {cat.totalArtikel} Artikel
                        </Badge>
                      </TableCell>
                      <TableCell className='text-end'>
                        <div className='flex items-center justify-end gap-1'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-7 px-2 text-xs'
                            onClick={() => handleOpenEdit(cat)}
                            title='Edit Nama Kategori'
                          >
                            <Edit className='size-3.5 me-1' /> Edit
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10'
                            onClick={() => {
                              setDeleteTarget(cat)
                              setDeleteReason('')
                            }}
                            title='Hapus Kategori'
                          >
                            <Trash2 className='size-3.5 me-1' /> Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between pt-2'>
              <span className='text-xs text-muted-foreground'>
                Halaman <strong className='text-foreground'>{pageIndex + 1}</strong> dari{' '}
                <strong className='text-foreground'>{totalPages}</strong>
              </span>
              <div className='flex items-center gap-1'>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-8'
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className='size-4' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='size-8'
                  disabled={pageIndex >= totalPages - 1}
                  onClick={() => setPageIndex((p) => p + 1)}
                >
                  <ChevronRight className='size-4' />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE CATEGORY MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader className='space-y-2'>
              <div className='flex items-center gap-2 text-primary'>
                <div className='p-2 bg-primary/10 rounded-lg'>
                  <Tag className='size-5' />
                </div>
                <DialogTitle className='text-base font-bold'>Tambah Kategori Baru</DialogTitle>
              </div>
              <DialogDescription className='text-xs text-muted-foreground'>
                Tambahkan taksonomi kategori baru untuk mengelompokkan artikel, renungan, dan berita jemaat.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='new-cat-nama' className='text-xs font-semibold'>
                  Nama Kategori <span className='text-rose-500'>*</span>
                </Label>
                <Input
                  id='new-cat-nama'
                  placeholder='Contoh: Renungan Harian, Khotbah Seri, Opini...'
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                  disabled={isCreating}
                  className='text-sm'
                />
              </div>

              {newCatName.trim() && (
                <div className='p-2.5 rounded-md bg-muted/50 border text-xs text-muted-foreground flex items-center gap-2'>
                  <Sparkles className='size-3.5 text-primary shrink-0' />
                  <div className='truncate'>
                    <span className='font-medium text-foreground'>Slug URL: </span>
                    <span className='font-mono text-primary'>/artikel?kategori={slugify(newCatName)}</span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setCreateModalOpen(false)}
                disabled={isCreating}
                className='text-xs'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isCreating || !newCatName.trim()}
                className='text-xs gap-1.5'
              >
                {isCreating ? (
                  <>
                    <Loader2 className='size-3.5 animate-spin' /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus className='size-3.5' /> Simpan Kategori
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT CATEGORY MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader className='space-y-2'>
              <div className='flex items-center gap-2 text-primary'>
                <div className='p-2 bg-primary/10 rounded-lg'>
                  <Edit className='size-5' />
                </div>
                <DialogTitle className='text-base font-bold'>Edit Kategori</DialogTitle>
              </div>
              <DialogDescription className='text-xs text-muted-foreground'>
                Perbarui nama kategori. Perubahan akan berlaku pada seluruh artikel yang terkait.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='edit-cat-nama' className='text-xs font-semibold'>
                  Nama Kategori <span className='text-rose-500'>*</span>
                </Label>
                <Input
                  id='edit-cat-nama'
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  autoFocus
                  disabled={isUpdating}
                  className='text-sm'
                />
              </div>
            </div>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setEditModalOpen(false)}
                disabled={isUpdating}
                className='text-xs'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isUpdating || !editCatName.trim()}
                className='text-xs gap-1.5'
              >
                {isUpdating ? (
                  <>
                    <Loader2 className='size-3.5 animate-spin' /> Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION ALERT */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className='flex items-center gap-2 text-rose-600 dark:text-rose-400'>
              <ShieldAlert className='size-5' />
              <AlertDialogTitle className='text-base font-bold'>Hapus Kategori Artikel?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className='text-xs space-y-2 text-muted-foreground pt-2'>
              {deleteTarget && deleteTarget.totalArtikel > 0 ? (
                <div className='p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-800 dark:text-amber-300'>
                  <strong>Perhatian Proteksi Integritas Data:</strong> Kategori{' '}
                  <strong className='font-bold underline'>"{deleteTarget?.nama}"</strong> saat ini masih menampung{' '}
                  <strong>{deleteTarget.totalArtikel} artikel aktif</strong>. Sistem tidak mengizinkan penghapusan kategori
                  yang masih memiliki artikel aktif untuk mencegah broken links pada jemaat publik. Silakan pindahkan
                  atau hapus artikel terkait terlebih dahulu.
                </div>
              ) : (
                <p>
                  Apakah Anda yakin ingin menghapus kategori <strong>"{deleteTarget?.nama}"</strong>? Kategori yang
                  dihapus tidak akan muncul pada form penulisan artikel baru.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteTarget && deleteTarget.totalArtikel === 0 && (
            <div className='py-2 space-y-1.5'>
              <Label htmlFor='delete-reason' className='text-xs font-semibold'>
                Alasan Penghapusan <span className='text-rose-500'>*</span>
              </Label>
              <Input
                id='delete-reason'
                placeholder='Contoh: Duplikat, Tidak digunakan lagi...'
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                disabled={isDeleting}
                className='text-xs'
              />
            </div>
          )}

          <AlertDialogFooter className='gap-2 sm:gap-0'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className='text-xs'
            >
              Batal
            </Button>
            {deleteTarget && deleteTarget.totalArtikel === 0 ? (
              <Button
                variant='destructive'
                size='sm'
                onClick={handleDeleteConfirm}
                disabled={isDeleting || !deleteReason.trim()}
                className='text-xs gap-1.5'
              >
                {isDeleting ? (
                  <>
                    <Loader2 className='size-3.5 animate-spin' /> Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className='size-3.5' /> Hapus Kategori
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant='secondary'
                size='sm'
                onClick={() => setDeleteTarget(null)}
                className='text-xs'
              >
                Mengerti
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
