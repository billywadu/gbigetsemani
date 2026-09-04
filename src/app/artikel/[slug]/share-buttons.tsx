'use client'

import React, { useState, useEffect } from 'react'
import { Share2, Copy, Check, Send, Globe, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface ArtikelShareButtonsProps {
  title: string
  churchName?: string
}

export function ArtikelShareButtons({ title, churchName = 'Gereja' }: ArtikelShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'share' in navigator) {
      setCanNativeShare(true)
    }
  }, [])

  const getShareUrl = () => {
    return typeof window !== 'undefined' ? window.location.href : ''
  }

  const handleCopyLink = () => {
    const url = getShareUrl()
    if (url) {
      navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link artikel berhasil disalin ke clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNativeShare = async () => {
    const url = getShareUrl()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Baca artikel & renungan rohani ${churchName}: ${title}`,
          url,
        })
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink()
        }
      }
    } else {
      handleCopyLink()
    }
  }

  const handleWhatsAppShare = () => {
    const url = getShareUrl()
    const text = encodeURIComponent(`*${title}*\n\nBaca artikel & renungan ${churchName}:\n${url}`)
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const handleFacebookShare = () => {
    const url = encodeURIComponent(getShareUrl())
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer')
  }

  const handleTelegramShare = () => {
    const url = encodeURIComponent(getShareUrl())
    const text = encodeURIComponent(`*${title}*\n${churchName}`)
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const handleTwitterShare = () => {
    const url = encodeURIComponent(getShareUrl())
    const text = encodeURIComponent(`"${title}" — Renungan & Artikel ${churchName}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer')
  }

  const handleLinkedInShare = () => {
    const url = encodeURIComponent(getShareUrl())
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      {/* Native Web Share Button (Mobile / Supported Browsers) */}
      {canNativeShare && (
        <Button
          type='button'
          variant='default'
          size='sm'
          onClick={handleNativeShare}
          className='h-7 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90'
        >
          <Share2 className='size-3' />
          <span>Bagikan</span>
        </Button>
      )}

      {/* Copy Link Button */}
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleCopyLink}
        className='h-7 text-xs gap-1.5 bg-muted/30 hover:bg-muted'
        title='Salin Tautan Artikel'
      >
        {copied ? <Check className='size-3 text-emerald-500' /> : <Copy className='size-3' />}
        <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
      </Button>

      {/* WhatsApp Button */}
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleWhatsAppShare}
        className='h-7 text-xs gap-1.5 text-emerald-500 hover:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
        title='Bagikan ke WhatsApp'
      >
        <MessageSquare className='size-3' />
        <span>WhatsApp</span>
      </Button>

      {/* Facebook Button */}
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleFacebookShare}
        className='h-7 text-xs gap-1.5 text-blue-500 hover:text-blue-400 border-blue-500/20 hover:bg-blue-500/10'
        title='Bagikan ke Facebook'
      >
        <Globe className='size-3' />
        <span>Facebook</span>
      </Button>

      {/* More Options Dropdown (Telegram, X/Twitter, LinkedIn) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 px-2 text-xs text-muted-foreground hover:text-foreground'
            title='Opsi Berbagi Lainnya'
          >
            <Share2 className='size-3 mr-1' />
            <span>Lainnya</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-44 text-xs'>
          <DropdownMenuItem onClick={handleTelegramShare} className='cursor-pointer gap-2 py-1.5'>
            <Send className='size-3.5 text-sky-400' />
            <span>Telegram</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleTwitterShare} className='cursor-pointer gap-2 py-1.5'>
            <svg className='size-3.5 fill-current' viewBox='0 0 24 24'>
              <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
            </svg>
            <span>X (Twitter)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLinkedInShare} className='cursor-pointer gap-2 py-1.5'>
            <svg className='size-3.5 fill-current text-blue-400' viewBox='0 0 24 24'>
              <path d='M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.23a1.64 1.64 0 0 0-1.64 1.64c0 .9.73 1.64 1.64 1.64s1.64-.74 1.64-1.64c0-.9-.73-1.64-1.64-1.64' />
            </svg>
            <span>LinkedIn</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

