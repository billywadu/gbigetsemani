'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  HeartHandshake,
  ShieldCheck,
  Lock,
  Users,
  HeartPulse,
  Briefcase,
  Sparkles,
  Coins,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  Phone,
  Send,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  KATEGORI_DOA_OPTIONS,
  PRIVASI_DOA_OPTIONS,
  SubmitPermohonanDoaInput,
} from '@/lib/validations/doa'
import { submitPublicDoaAction } from '@/actions/doa'
import { getAppProfileAction } from '@/actions/app-profile'
import { AppProfileConfig, DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { toast } from 'sonner'

export default function PublicDoaPage() {
  const [namaPemohon, setNamaPemohon] = useState('')
  const [isAnonim, setIsAnonim] = useState(false)
  const [kontakWa, setKontakWa] = useState('')
  const [kategori, setKategori] = useState<SubmitPermohonanDoaInput['kategori']>('KESEHATAN')
  const [privasi, setPrivasi] = useState<SubmitPermohonanDoaInput['privasi']>('TIM_DOA_PUBLIK')
  const [isiDoa, setIsiDoa] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [profile, setProfile] = useState<AppProfileConfig>(DEFAULT_APP_PROFILE_CONFIG)

  useEffect(() => {
    let isMounted = true
    async function loadProfile() {
      const res = await getAppProfileAction()
      if (res.success && res.data && isMounted) {
        setProfile(res.data)
      }
    }
    loadProfile()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalNama = isAnonim ? 'Anonim (Hamba Tuhan)' : namaPemohon.trim()
    if (!isAnonim && !finalNama) {
      toast.error('Nama pemohon wajib diisi, atau aktifkan opsi Anonim.')
      return
    }

    if (!isiDoa.trim() || isiDoa.trim().length < 10) {
      toast.error('Pokok permohonan doa wajib diisi minimal 10 karakter.')
      return
    }

    setSubmitting(true)
    try {
      const res = await submitPublicDoaAction({
        namaPemohon: finalNama,
        isAnonim,
        kontakWa: kontakWa.trim() || undefined,
        kategori,
        privasi,
        isiDoa: isiDoa.trim(),
      })

      if (res.success) {
        setSuccessModalOpen(true)
        // Reset Form
        setNamaPemohon('')
        setKontakWa('')
        setIsiDoa('')
        setIsAnonim(false)
      } else {
        toast.error(res.error || 'Gagal mengirim permohonan doa.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderCategoryIcon = (catValue: string) => {
    switch (catValue) {
      case 'KESEHATAN':
        return <HeartPulse className='size-4' />
      case 'KELUARGA':
        return <Users className='size-4' />
      case 'PEKERJAAN':
        return <Briefcase className='size-4' />
      case 'ROHANI':
        return <Sparkles className='size-4' />
      case 'KEUANGAN':
        return <Coins className='size-4' />
      default:
        return <HelpCircle className='size-4' />
    }
  }

  return (
    <div className='min-h-svh bg-background text-foreground flex flex-col'>
      {/* Official Public Navigation Header */}
      <PublicHeader initialProfile={profile} />

      {/* Main Content */}
      <main className='flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6'>
        {/* Banner Penguatan Iman */}
        <div className='text-center space-y-3'>
          <Badge
            variant='outline'
            className='px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20 gap-1.5 inline-flex items-center rounded-full'
          >
            <HeartHandshake className='size-3.5 text-primary' />
            <span>Pelayanan Doa Syafaat & Pastoral</span>
          </Badge>

          <h1 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-serif'>
            Permohonan Doa Online
          </h1>

          <p className='text-xs sm:text-sm text-muted-foreground italic max-w-lg mx-auto leading-relaxed'>
            &ldquo;Janganlah hendaknya kamu kuatir tentang apapun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur.&rdquo;
            <br />
            <span className='font-semibold not-italic text-foreground text-xs'>— Filipi 4:6</span>
          </p>
        </div>

        {/* Form Card */}
        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-4 space-y-1'>
            <CardTitle className='text-lg font-bold text-foreground'>
              Formulir Permohonan Doa
            </CardTitle>
            <CardDescription className='text-xs leading-relaxed'>
              Ceritakan kebutuhan doa Anda. Tim Doa dan Pastoral kami akan membawa setiap permohonan doa ke hadapan Tuhan.
            </CardDescription>
          </CardHeader>

          <CardContent className='p-5 sm:p-6 pt-0'>
            <form onSubmit={handleSubmit} className='space-y-4 text-xs'>
              {/* 1. Nama Lengkap & Opsi Anonim */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nama Lengkap / Panggilan *</Label>
                <Input
                  value={isAnonim ? 'Anonim (Hamba Tuhan)' : namaPemohon}
                  onChange={(e) => setNamaPemohon(e.target.value)}
                  disabled={isAnonim}
                  placeholder='Masukkan nama Anda...'
                  className={`text-xs h-9 ${isAnonim ? 'bg-muted text-muted-foreground italic' : ''}`}
                  required={!isAnonim}
                />
                <div className='flex items-center gap-2 pt-0.5'>
                  <Switch
                    id='switch-anonim'
                    checked={isAnonim}
                    onCheckedChange={(val) => {
                      setIsAnonim(val)
                      if (val) setNamaPemohon('')
                    }}
                  />
                  <Label htmlFor='switch-anonim' className='text-xs text-muted-foreground cursor-pointer font-normal'>
                    Kirim sebagai Anonim (Hamba Tuhan)
                  </Label>
                </div>
              </div>

              {/* 2. Nomor WhatsApp (Opsional) */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nomor WhatsApp (Opsional)</Label>
                <Input
                  value={kontakWa}
                  onChange={(e) => setKontakWa(e.target.value)}
                  placeholder='Contoh: 081234567890'
                  className='text-xs h-9 font-mono'
                  type='tel'
                />
                <p className='text-[11px] text-muted-foreground'>
                  Isi nomor WhatsApp jika Anda ingin dikirimi pesan penguatan firman atau dihubungi oleh Tim Pastoral.
                </p>
              </div>

              {/* 3. Kategori Pokok Doa (Interactive Chips Wrap) */}
              <div className='space-y-2 pt-1'>
                <Label className='text-xs font-semibold block'>Kategori Pokok Doa *</Label>
                <div className='flex flex-wrap gap-2'>
                  {KATEGORI_DOA_OPTIONS.map((cat) => {
                    const isSelected = kategori === cat.value
                    return (
                      <button
                        type='button'
                        key={cat.value}
                        onClick={() => setKategori(cat.value as any)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs transition-all active:scale-[0.98] ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'border-border bg-card hover:bg-muted text-foreground'
                        }`}
                      >
                        <span className={`shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`}>
                          {renderCategoryIcon(cat.value)}
                        </span>
                        <span className='whitespace-nowrap text-xs font-medium'>{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 4. Tingkat Kerahasiaan */}
              <div className='space-y-2 pt-1'>
                <Label className='text-xs font-semibold flex items-center gap-1.5'>
                  <ShieldCheck className='size-3.5 text-primary' /> Tingkat Kerahasiaan Doa *
                </Label>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                  {PRIVASI_DOA_OPTIONS.map((priv) => {
                    const isSelected = privasi === priv.value
                    return (
                      <button
                        type='button'
                        key={priv.value}
                        onClick={() => setPrivasi(priv.value as any)}
                        className={`p-3 rounded-xl border text-left text-xs space-y-1 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                            : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className='flex items-center gap-2'>
                          {priv.value === 'RAHASIA_PASTORAL' ? (
                            <Lock className={`size-3.5 ${isSelected ? 'text-primary' : 'text-amber-600'}`} />
                          ) : (
                            <Users className={`size-3.5 ${isSelected ? 'text-primary' : 'text-blue-600'}`} />
                          )}
                          <span className='font-bold text-xs text-foreground'>{priv.label}</span>
                        </div>
                        <p className='text-[10px] text-muted-foreground font-normal leading-relaxed'>
                          {priv.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 5. Isi Pokok Doa */}
              <div className='space-y-1.5 pt-1'>
                <Label className='text-xs font-semibold block'>Isi Pokok Permohonan Doa *</Label>
                <Textarea
                  value={isiDoa}
                  onChange={(e) => setIsiDoa(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder='Tuliskan pergumulan, permohonan doa, atau hal yang ingin Anda bawa ke hadapan Tuhan...'
                  className='text-xs leading-relaxed'
                  required
                />
                <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
                  <span>Minimal 10 karakter</span>
                  <span className='font-mono text-[10px]'>{isiDoa.length} / 2000</span>
                </div>
              </div>

              {/* Submit Button */}
              <div className='pt-2'>
                <Button
                  type='submit'
                  disabled={submitting}
                  size='lg'
                  className='w-full gap-2 text-xs sm:text-sm font-semibold shadow-xs'
                >
                  {submitting ? (
                    <>
                      <Loader2 className='size-4 animate-spin' /> Mengirimkan Permohonan Doa...
                    </>
                  ) : (
                    <>
                      <Send className='size-4' /> Kirim Permohonan Doa
                    </>
                  )}
                </Button>
                <p className='text-[10px] text-muted-foreground text-center mt-2.5 leading-relaxed'>
                  Data Anda dilindungi sesuai UU Perlindungan Data Pribadi (UU No. 27/2022).
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Success Modal */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className='max-w-md text-center p-6 space-y-4 rounded-2xl'>
          <div className='size-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto'>
            <CheckCircle2 className='size-8' />
          </div>

          <div className='space-y-1.5 text-center'>
            <DialogTitle className='text-lg font-bold text-foreground text-center'>
              Permohonan Doa Telah Diterima
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground leading-relaxed text-center'>
              Terima kasih telah mempercayakan pokok doa Anda. Tim Doa Syafaat & Pastoral {profile.namaSingkat} akan segera membawanya dalam doa.
            </DialogDescription>
          </div>

          <div className='p-3.5 bg-muted/40 rounded-xl border text-[11px] italic text-muted-foreground leading-relaxed text-center'>
            &ldquo;Sebab Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu, demikianlah firman TUHAN, yaitu rancangan damai sejahtera dan bukan rancangan kecelakaan, untuk memberikan kepadamu hari depan yang penuh harapan.&rdquo;
            <br />
            <span className='font-semibold not-italic text-foreground text-xs'>— Yeremia 29:11</span>
          </div>

          <div className='flex flex-col sm:flex-row items-center gap-2 pt-2 w-full'>
            <Button size='sm' onClick={() => setSuccessModalOpen(false)} className='w-full sm:flex-1 text-xs font-semibold'>
              Kirim Doa Lainnya
            </Button>
            <Button asChild variant='outline' size='sm' className='w-full sm:flex-1 text-xs'>
              <Link href='/'>Ke Halaman Utama</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Official Public Footer */}
      <PublicFooter initialProfile={profile} />
    </div>
  )
}
