'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  BookOpen,
  Code,
  Eye,
  Edit3,
  Undo,
  Redo,
  Sparkles,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadEditorImageAction } from '@/actions/materi'
import { toast } from 'sonner'

interface MateriEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
}

export function MateriEditor({
  value,
  onChange,
  placeholder = 'Tuliskan isi khotbah, renungan, atau pemahaman Alkitab di sini...',
}: MateriEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Bible Callout Modal State
  const [bibleOpen, setBibleOpen] = useState(false)
  const [bibleVerse, setBibleVerse] = useState('Yohanes 3:16')
  const [bibleText, setBibleText] = useState(
    'Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal, supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal.'
  )

  // Image Upload Modal State
  const [imageOpen, setImageOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Link Modal State
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const insertTag = (openTag: string, closeTag = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentText = textarea.value
    const selectedText = currentText.substring(start, end)

    const replacement = `${openTag}${selectedText}${closeTag}`
    const newContent = currentText.substring(0, start) + replacement + currentText.substring(end)

    onChange(newContent)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + selectedText.length)
    }, 50)
  }

  const insertBibleCallout = () => {
    if (!bibleVerse.trim() || !bibleText.trim()) {
      toast.error('Ayat dan kutipan firman Tuhan tidak boleh kosong!')
      return
    }

    const callout = `\n<div class="bible-callout my-6 p-5 border-l-4 border-primary bg-primary/10 rounded-r-xl shadow-xs">\n  <div class="flex items-center gap-2 font-bold text-primary text-sm mb-2">\n    <span class="inline-block">📖</span> ${bibleVerse.trim()}\n  </div>\n  <blockquote class="italic text-foreground/90 font-serif leading-relaxed text-base">\n    "${bibleText.trim()}"\n  </blockquote>\n</div>\n`

    insertTag(callout)
    setBibleOpen(false)
    toast.success(`Kutipan firman (${bibleVerse}) berhasil dimasukkan!`)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]

    const formData = new FormData()
    formData.append('file', file)

    setUploadingImage(true)
    const res = await uploadEditorImageAction(formData)
    setUploadingImage(false)

    if (res.success && res.data?.url) {
      setImageUrl(res.data.url)
      toast.success('Gambar berhasil diunggah ke storage!')
    } else {
      toast.error(res.error || 'Gagal mengunggah gambar.')
    }
  }

  const insertImage = () => {
    if (!imageUrl.trim()) {
      toast.error('URL gambar wajib diisi!')
      return
    }

    const alt = imageAlt.trim() || 'Ilustrasi Khotbah'
    const imgHtml = `\n<figure class="my-6">\n  <img src="${imageUrl.trim()}" alt="${alt}" class="w-full rounded-xl shadow-sm border max-h-[500px] object-cover" />\n  <figcaption class="text-xs text-center text-muted-foreground mt-2 italic">${alt}</figcaption>\n</figure>\n`

    insertTag(imgHtml)
    setImageOpen(false)
    setImageUrl('')
    setImageAlt('')
    toast.success('Gambar berhasil disematkan!')
  }

  const insertLink = () => {
    if (!linkUrl.trim()) {
      toast.error('URL tautan wajib diisi!')
      return
    }

    const text = linkText.trim() || linkUrl.trim()
    const linkHtml = `<a href="${linkUrl.trim()}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80 font-medium">${text}</a>`

    insertTag(linkHtml)
    setLinkOpen(false)
    setLinkText('')
    setLinkUrl('')
  }

  return (
    <div className='border rounded-xl bg-card overflow-hidden shadow-xs'>
      {/* Editor Top Bar */}
      <div className='flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-muted/40'>
        <div className='flex flex-wrap items-center gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            title='Heading 1 (H1)'
            onClick={() => insertTag('<h1>', '</h1>')}
          >
            <Heading1 className='size-3.5' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            title='Heading 2 (H2)'
            onClick={() => insertTag('<h2>', '</h2>')}
          >
            <Heading2 className='size-3.5' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            title='Heading 3 (H3)'
            onClick={() => insertTag('<h3>', '</h3>')}
          >
            <Heading3 className='size-3.5' />
          </Button>

          <div className='h-4 w-px bg-border mx-1' />

          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7 font-bold'
            title='Bold (Tebal)'
            onClick={() => insertTag('<strong>', '</strong>')}
          >
            <Bold className='size-3.5' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7 italic'
            title='Italic (Miring)'
            onClick={() => insertTag('<em>', '</em>')}
          >
            <Italic className='size-3.5' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7 underline'
            title='Underline (Garis Bawah)'
            onClick={() => insertTag('<u>', '</u>')}
          >
            <Underline className='size-3.5' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            title='Strikethrough (Coret)'
            onClick={() => insertTag('<s>', '</s>')}
          >
            <Strikethrough className='size-3.5' />
          </Button>

          <div className='h-4 w-px bg-border mx-1' />

          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            title='Bullet List'
            onClick={() => insertTag('<ul>\n  <li>', '</li>\n  <li>Poin kedua...</li>\n</ul>')}
          >
            <List className='size-3.5' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            title='Numbered List'
            onClick={() => insertTag('<ol>\n  <li>', '</li>\n  <li>Langkah kedua...</li>\n</ol>')}
          >
            <ListOrdered className='size-3.5' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            title='Kutipan (Blockquote)'
            onClick={() => insertTag('<blockquote class="border-l-2 border-primary pl-4 italic text-muted-foreground my-4">\n  ', '\n</blockquote>')}
          >
            <Quote className='size-3.5' />
          </Button>

          <div className='h-4 w-px bg-border mx-1' />

          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            title='Sisipkan Tautan'
            onClick={() => setLinkOpen(true)}
          >
            <LinkIcon className='size-3.5' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-7'
            title='Sisipkan Gambar'
            onClick={() => setImageOpen(true)}
          >
            <ImageIcon className='size-3.5' />
          </Button>

          <div className='h-4 w-px bg-border mx-1' />

          {/* Bible Callout Custom Button */}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 text-xs gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border-primary/30 font-semibold'
            onClick={() => setBibleOpen(true)}
          >
            <BookOpen className='size-3.5' /> Bible Callout
          </Button>
        </div>

        {/* View Tabs */}
        <div className='flex items-center gap-1'>
          <Button
            type='button'
            variant={activeTab === 'edit' ? 'secondary' : 'ghost'}
            size='sm'
            className='h-7 text-xs gap-1'
            onClick={() => setActiveTab('edit')}
          >
            <Edit3 className='size-3' /> Tulis HTML
          </Button>
          <Button
            type='button'
            variant={activeTab === 'preview' ? 'secondary' : 'ghost'}
            size='sm'
            className='h-7 text-xs gap-1'
            onClick={() => setActiveTab('preview')}
          >
            <Eye className='size-3' /> Pratinjau
          </Button>
        </div>
      </div>

      {/* Editor Content Area */}
      {activeTab === 'edit' ? (
        <div className='p-3'>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className='w-full min-h-[420px] p-3 text-sm font-mono bg-transparent border-0 focus:outline-none resize-y leading-relaxed text-foreground'
          />
        </div>
      ) : (
        <div className='p-6 min-h-[420px] prose dark:prose-invert max-w-none bg-background/50 overflow-y-auto'>
          {value.trim() ? (
            <div
              className='space-y-4 text-sm leading-relaxed'
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <p className='text-muted-foreground italic text-xs text-center py-12'>
              Belum ada konten untuk ditampilkan dalam pratinjau. Tuliskan materi pada tab editor.
            </p>
          )}
        </div>
      )}

      {/* ── Dialog Sisipkan Ayat Alkitab (Bible Callout Box) ────── */}
      <Dialog open={bibleOpen} onOpenChange={setBibleOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <BookOpen className='size-4 text-primary' /> Sisipkan Bible Callout Box
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2 text-xs'>
            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>Kitab, Pasal & Ayat *</Label>
              <Input
                placeholder='Contoh: Yohanes 3:16 / Mazmur 23:1'
                value={bibleVerse}
                onChange={(e) => setBibleVerse(e.target.value)}
                className='text-xs h-9'
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>Teks Firman Tuhan *</Label>
              <textarea
                placeholder='Masukkan nats firman Tuhan...'
                value={bibleText}
                onChange={(e) => setBibleText(e.target.value)}
                className='w-full p-2.5 text-xs rounded-md border bg-background min-h-[100px]'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setBibleOpen(false)}>
              Batal
            </Button>
            <Button size='sm' onClick={insertBibleCallout} className='gap-1.5'>
              <Sparkles className='size-3.5' /> Sisipkan ke Materi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Sisipkan Gambar ──────────────────────────────── */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <ImageIcon className='size-4 text-primary' /> Sisipkan Gambar ke Editor
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2 text-xs'>
            <div>
              <Label className='text-xs font-semibold'>Unggah dari Komputer</Label>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg, image/png, image/webp'
                onChange={handleFileUpload}
                className='hidden'
              />
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className='w-full mt-1.5 text-xs gap-2'
              >
                {uploadingImage ? <Loader2 className='size-4 animate-spin' /> : <ImageIcon className='size-4' />}
                {uploadingImage ? 'Mengunggah...' : 'Pilih Gambar (JPG/PNG/WEBP <= 5MB)'}
              </Button>
            </div>

            <div className='text-center text-muted-foreground text-[11px]'>- ATAU -</div>

            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>URL Gambar Langsung</Label>
              <Input
                placeholder='https://.../gambar.jpg'
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className='text-xs h-9'
              />
            </div>

            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>Keterangan Gambar (Alt text)</Label>
              <Input
                placeholder='Contoh: Bagan Khotbah / Dokumentasi Pelayanan'
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                className='text-xs h-9'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setImageOpen(false)}>
              Batal
            </Button>
            <Button size='sm' onClick={insertImage} disabled={!imageUrl.trim()}>
              Sisipkan Gambar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Sisipkan Tautan (Link) ───────────────────────── */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <LinkIcon className='size-4 text-primary' /> Sisipkan Tautan URL
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2 text-xs'>
            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>Teks Tautan</Label>
              <Input
                placeholder='Contoh: Baca panduan lengkap'
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className='text-xs h-9'
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>URL Tujuan *</Label>
              <Input
                placeholder='https://gereja.or.id/...'
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className='text-xs h-9'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setLinkOpen(false)}>
              Batal
            </Button>
            <Button size='sm' onClick={insertLink} disabled={!linkUrl.trim()}>
              Sisipkan Tautan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
