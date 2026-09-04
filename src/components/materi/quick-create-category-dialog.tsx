'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Tag, Loader2, Sparkles } from 'lucide-react'
import { createKategoriMateriAction, KategoriMateriDTO } from '@/actions/materi'
import { slugify } from '@/lib/slug'
import { toast } from 'sonner'

interface QuickCreateCategoryDialogProps {
  onSuccess: (newCategory: KategoriMateriDTO) => void
  trigger?: React.ReactNode
}

export function QuickCreateCategoryDialog({ onSuccess, trigger }: QuickCreateCategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [nama, setNama] = useState('')
  const [loading, setLoading] = useState(false)

  const slugPreview = slugify(nama)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nama.trim() || nama.trim().length < 2) {
      toast.error('Nama kategori minimal 2 karakter!')
      return
    }

    setLoading(true)
    const res = await createKategoriMateriAction({ nama: nama.trim() })
    setLoading(false)

    if (res.success && res.data) {
      toast.success(res.message || `Kategori "${res.data.nama}" berhasil dibuat!`)
      onSuccess(res.data)
      setNama('')
      setOpen(false)
    } else {
      toast.error(res.error || 'Gagal membuat kategori baru.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-9 text-xs gap-1.5 shrink-0 hover:border-primary/50'
            title='Tambah Kategori Baru'
          >
            <Plus className='size-3.5 text-primary' /> Kategori Baru
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <form onSubmit={handleSubmit}>
          <DialogHeader className='space-y-2'>
            <div className='flex items-center gap-2 text-primary'>
              <div className='p-2 bg-primary/10 rounded-lg'>
                <Tag className='size-5' />
              </div>
              <DialogTitle className='text-base font-bold'>Tambah Kategori Baru</DialogTitle>
            </div>
            <DialogDescription className='text-xs text-muted-foreground'>
              Kategori baru akan langsung tersimpan dan otomatis terpilih pada form materi yang sedang Anda tulis.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='quick-cat-nama' className='text-xs font-semibold'>
                Nama Kategori <span className='text-rose-500'>*</span>
              </Label>
              <Input
                id='quick-cat-nama'
                placeholder='Contoh: Pemuda & Remaja, Khotbah Seri...'
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                autoFocus
                disabled={loading}
                className='text-sm'
              />
            </div>

            {nama.trim() && (
              <div className='p-2.5 rounded-md bg-muted/50 border text-xs text-muted-foreground flex items-center gap-2'>
                <Sparkles className='size-3.5 text-primary shrink-0' />
                <div className='truncate'>
                  <span className='font-medium text-foreground'>Slug URL: </span>
                  <span className='font-mono text-primary'>/renungan?kategori={slugPreview}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setOpen(false)}
              disabled={loading}
              className='text-xs'
            >
              Batal
            </Button>
            <Button
              type='submit'
              size='sm'
              disabled={loading || !nama.trim()}
              className='text-xs gap-1.5'
            >
              {loading ? (
                <>
                  <Loader2 className='size-3.5 animate-spin' /> Menyimpan...
                </>
              ) : (
                <>
                  <Plus className='size-3.5' /> Simpan & Pilih
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
