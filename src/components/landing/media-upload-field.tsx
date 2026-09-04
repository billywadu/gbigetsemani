'use client'

import React, { useRef, useState } from 'react'
import {
  Upload,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Film,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { uploadLandingMediaAction } from '@/actions/landing-page'
import { cn } from '@/lib/utils'

interface MediaUploadFieldProps {
  label: string
  description?: string
  value: string
  onChange: (newUrl: string) => void
  type?: 'image' | 'video'
  placeholder?: string
  className?: string
}

export function MediaUploadField({
  label,
  description,
  value,
  onChange,
  type = 'image',
  className,
}: MediaUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const isVideo = type === 'video'
  const acceptTypes = isVideo
    ? 'video/mp4,video/webm,video/quicktime'
    : 'image/png,image/jpeg,image/jpg,image/webp'

  const handleUploadFile = async (file: File) => {
    if (!file) return

    // Validation
    if (isVideo && !file.type.startsWith('video/')) {
      toast.error('Pilih berkas video yang valid (.mp4, .webm).')
      return
    }
    if (!isVideo && !file.type.startsWith('image/')) {
      toast.error('Pilih berkas gambar yang valid (.png, .jpg, .webp).')
      return
    }

    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error(
        `Ukuran berkas melebihi batas ${isVideo ? '50MB' : '10MB'}.`
      )
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await uploadLandingMediaAction(formData)
      if (res.success && res.fileUrl) {
        onChange(res.fileUrl)
        toast.success(
          `Berkas ${isVideo ? 'video' : 'gambar'} "${file.name}" berhasil diunggah.`
        )
      } else {
        toast.error(res.error || 'Gagal mengunggah berkas.')
      }
    } catch (err: any) {
      console.error('[MediaUploadField] Error:', err)
      toast.error('Terjadi kesalahan saat mengunggah berkas.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUploadFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleUploadFile(file)
    }
  }

  const handleClear = () => {
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    toast.info(`Berkas ${isVideo ? 'video' : 'gambar'} dihapus.`)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className='space-y-0.5'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs sm:text-sm font-semibold text-foreground'>
            {label}
          </Label>
          {value && (
            <span className='text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1'>
              <CheckCircle2 className='size-3' /> Terpasang
            </span>
          )}
        </div>
        {description && (
          <p className='text-[11px] text-muted-foreground leading-relaxed'>
            {description}
          </p>
        )}
      </div>

      <input
        type='file'
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptTypes}
        className='hidden'
      />

      {/* Upload & Preview Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-3 sm:p-4 transition-all flex flex-col sm:flex-row items-center gap-4 bg-muted/20 hover:bg-muted/30',
          isDragOver ? 'border-primary bg-primary/5' : 'border-border',
          value ? 'border-solid border-border/80 bg-card/60' : ''
        )}
      >
        {/* Preview Thumbnail Box */}
        <div className='w-full sm:w-44 h-28 sm:h-28 rounded-lg overflow-hidden bg-background/80 border flex items-center justify-center relative shrink-0 shadow-2xs group'>
          {value ? (
            isVideo ? (
              <video
                src={value}
                muted
                playsInline
                autoPlay
                loop
                className='w-full h-full object-cover'
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt='Preview'
                className='w-full h-full object-cover transition-transform group-hover:scale-105'
              />
            )
          ) : (
            <div className='flex flex-col items-center justify-center text-muted-foreground/60 gap-1.5 p-2 text-center'>
              {isVideo ? (
                <Film className='size-8 stroke-[1.5]' />
              ) : (
                <ImageIcon className='size-8 stroke-[1.5]' />
              )}
              <span className='text-[10px] font-medium'>
                {isVideo ? 'Belum Ada Video' : 'Belum Ada Gambar'}
              </span>
            </div>
          )}

          {uploading && (
            <div className='absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 text-primary'>
              <Loader2 className='size-6 animate-spin' />
              <span className='text-[10px] font-semibold'>Mengunggah...</span>
            </div>
          )}
        </div>

        {/* Action Controls & Metadata */}
        <div className='flex-1 w-full min-w-0 space-y-2 text-center sm:text-left'>
          <div>
            <p className='text-xs font-medium text-foreground truncate'>
              {value
                ? value.split('/').pop()
                : isVideo
                  ? 'Format .mp4, .webm (Maks. 50MB)'
                  : 'Format .png, .jpg, .webp (Maks. 10MB)'}
            </p>
            <p className='text-[11px] text-muted-foreground mt-0.5 truncate'>
              {value
                ? 'Klik ganti berkas atau drag & drop file baru.'
                : 'Tarik & lepas file ke sini, atau klik tombol di bawah.'}
            </p>
          </div>

          <div className='flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className='h-8 px-3 text-xs gap-1.5 font-semibold shadow-2xs'
            >
              {uploading ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <Upload className='size-3.5' />
              )}
              {value ? 'Ganti Berkas' : isVideo ? 'Upload Video MP4' : 'Upload Gambar'}
            </Button>

            {value && (
              <Button
                type='button'
                size='sm'
                variant='ghost'
                disabled={uploading}
                onClick={handleClear}
                className='h-8 px-2.5 text-xs gap-1.5 text-destructive hover:bg-destructive/10'
                title='Hapus Berkas'
              >
                <Trash2 className='size-3.5' /> Hapus
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
