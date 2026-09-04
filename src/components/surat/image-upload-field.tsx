'use client'

import React, { useRef, useState } from 'react'
import { Upload, Trash2, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { removeImageBackground } from '@/lib/image-bg-removal'
import { toast } from 'sonner'

interface ImageUploadFieldProps {
  label: string
  description?: string
  value: string | null | undefined
  onChange: (newUrl: string | null) => void
  enableBgRemoval?: boolean
  aspect?: 'square' | 'wide'
}

/**
 * Helper to compress and resize image on the client side before saving
 */
async function compressImageToDataUrl(
  fileOrBlob: File | Blob,
  maxDimension = 1000,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(reader.result as string)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const isPng = (fileOrBlob as File).type === 'image/png'
        const outputMime = isPng ? 'image/png' : 'image/jpeg'
        const compressedDataUrl = canvas.toDataURL(outputMime, quality)
        resolve(compressedDataUrl)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(fileOrBlob)
  })
}

export function ImageUploadField({
  label,
  description,
  value,
  onChange,
  enableBgRemoval = true,
  aspect = 'square',
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [isProcessingBg, setIsProcessingBg] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Pilih berkas gambar yang valid (PNG, JPG, JPEG, WEBP).')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran berkas maksimal 10MB.')
      return
    }

    setCurrentFile(file)
    try {
      const optimizedDataUrl = await compressImageToDataUrl(file, 1000, 0.85)
      onChange(optimizedDataUrl)
      toast.success(`Berkas ${file.name} berhasil dimuat.`)
    } catch {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        onChange(dataUrl)
        toast.success(`Berkas ${file.name} berhasil dimuat.`)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemove = () => {
    setCurrentFile(null)
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleProcessBgRemoval = async () => {
    if (!value && !currentFile) {
      toast.error('Pilih atau upload gambar terlebih dahulu.')
      return
    }

    setIsProcessingBg(true)
    setProgressMsg('Memulai AI background removal...')

    try {
      const source = currentFile || value!
      const cleanFile = await removeImageBackground(source, {
        onProgress: (p, msg) => {
          setProgressMsg(msg)
        },
      })

      setCurrentFile(cleanFile)
      try {
        const optimizedClean = await compressImageToDataUrl(cleanFile, 1000, 0.9)
        onChange(optimizedClean)
      } catch {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          onChange(dataUrl)
        }
        reader.readAsDataURL(cleanFile)
      }
      setIsProcessingBg(false)
      toast.success('Background gambar berhasil dihilangkan transparan.')
    } catch (err: any) {
      setIsProcessingBg(false)
      console.error('[handleProcessBgRemoval] Error:', err)
      toast.error('Gagal memproses background gambar.')
    }
  }

  return (
    <div className='space-y-1.5'>
      {/* Label & Description Header */}
      <div className='space-y-0.5 mb-1'>
        <Label className='text-[11px] font-semibold text-foreground block leading-snug'>{label}</Label>
        {description && (
          <p className='text-[10px] text-muted-foreground leading-normal'>
            {description}
          </p>
        )}
      </div>

      <input
        type='file'
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept='image/png, image/jpeg, image/jpg, image/webp'
        className='hidden'
      />

      <div className='flex items-center gap-3 p-2.5 bg-muted/20 hover:bg-muted/30 transition-colors border border-border/70 rounded-xl overflow-hidden'>
        {/* Preview Thumbnail Box */}
        <div
          className={`shrink-0 border border-border/80 rounded-lg overflow-hidden bg-background/90 flex items-center justify-center relative shadow-2xs ${
            aspect === 'wide' ? 'w-20 sm:w-24 h-14 sm:h-16' : 'w-14 sm:w-16 h-14 sm:h-16'
          }`}
          style={{
            backgroundImage:
              'radial-gradient(currentColor 0.75px, transparent 0.75px)',
            backgroundSize: '6px 6px',
            opacity: 0.85,
          }}
        >
          {value ? (
            <img src={value} alt='Preview' className='max-w-full max-h-full object-contain p-1' />
          ) : (
            <ImageIcon className='size-5 text-muted-foreground/40' />
          )}
        </div>

        {/* Action Controls */}
        <div className='flex-1 min-w-0 space-y-1.5'>
          <div className='flex items-center gap-1.5 w-full'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => fileInputRef.current?.click()}
              className='h-8 px-3 text-xs gap-1.5 font-semibold flex-1 min-w-0 justify-center truncate shadow-2xs hover:bg-muted/80'
            >
              <Upload className='size-3.5 shrink-0 text-muted-foreground' />
              <span className='truncate'>{value ? 'Ganti File' : 'Pilih File'}</span>
            </Button>

            {value && (
              <Button
                type='button'
                size='icon'
                variant='ghost'
                onClick={handleRemove}
                className='size-8 shrink-0 text-destructive hover:bg-destructive/10'
                title='Hapus Gambar'
              >
                <Trash2 className='size-3.5' />
              </Button>
            )}
          </div>

          {value && enableBgRemoval && (
            <Button
              type='button'
              size='sm'
              variant='secondary'
              disabled={isProcessingBg}
              onClick={handleProcessBgRemoval}
              className='h-7 sm:h-8 w-full px-2 text-[10.5px] sm:text-[11px] gap-1.5 font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 justify-center truncate'
              title='Hilangkan background putih / foto kertas secara otomatis'
            >
              {isProcessingBg ? (
                <Loader2 className='size-3 shrink-0 animate-spin' />
              ) : (
                <Sparkles className='size-3 shrink-0' />
              )}
              <span className='truncate'>{isProcessingBg ? 'Memproses...' : 'AI Hapus Background'}</span>
            </Button>
          )}

          {isProcessingBg && progressMsg && (
            <span className='text-[9.5px] text-primary font-medium block truncate animate-pulse'>
              {progressMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
