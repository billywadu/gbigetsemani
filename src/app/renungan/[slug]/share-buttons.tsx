'use client'

import React, { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface RenunganShareButtonsProps {
  title: string
  churchName?: string
}

export function RenunganShareButtons({ title, churchName = 'Gereja' }: RenunganShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success('Link renungan berhasil disalin ke clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWhatsAppShare = () => {
    if (typeof window !== 'undefined') {
      const text = encodeURIComponent(`*${title}*\n\nBaca materi renungan ${churchName}:\n${window.location.href}`)
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
    }
  }

  const handleFacebookShare = () => {
    if (typeof window !== 'undefined') {
      const url = encodeURIComponent(window.location.href)
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
    }
  }

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleCopyLink}
        className='h-7 text-xs gap-1.5'
      >
        {copied ? <Check className='size-3 text-emerald-600' /> : <Copy className='size-3' />}
        {copied ? 'Tersalin' : 'Salin Link'}
      </Button>

      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleWhatsAppShare}
        className='h-7 text-xs gap-1.5 text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400'
      >
        <Share2 className='size-3' />
        <span>WhatsApp</span>
      </Button>

      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleFacebookShare}
        className='h-7 text-xs gap-1.5 text-blue-600 hover:text-blue-700 dark:hover:text-blue-400'
      >
        <Share2 className='size-3' />
        <span>Facebook</span>
      </Button>
    </div>
  )
}
