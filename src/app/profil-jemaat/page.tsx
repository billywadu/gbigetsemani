'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  Unlock,
  Loader2,
  FileText,
  Download,
  Eye,
  Calendar,
  Phone,
  ShieldAlert,
  KeyRound,
  FileCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import {
  getProfilPublikAction,
  verifyDokumenAccessAction,
  PublicVerificationDTO,
} from '@/actions/publik'
import {
  PublicDokumenItemDTO,
  VerificationMethod,
} from '@/lib/validations/publik'
import { getAppProfileAction } from '@/actions/app-profile'
import { AppProfileConfig, DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { toast } from 'sonner'

export default function ProfilJemaatVerifikasiPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [result, setResult] = useState<PublicVerificationDTO | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [profile, setProfile] = useState<AppProfileConfig>(DEFAULT_APP_PROFILE_CONFIG)

  React.useEffect(() => {
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

  // Document Security Gate States
  const [activeTab, setActiveTab] = useState('profil')
  const [docUnlocked, setDocUnlocked] = useState(false)
  const [docList, setDocList] = useState<PublicDokumenItemDTO[]>([])
  const [verifyingDoc, setVerifyingDoc] = useState(false)
  const [method, setMethod] = useState<VerificationMethod>('TANGGAL_LAHIR')
  const [tanggalLahirInput, setTanggalLahirInput] = useState('')
  const [last4HpInput, setLast4HpInput] = useState('')
  const [docError, setDocError] = useState<string | null>(null)
  const [docRateLimited, setDocRateLimited] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanQuery = query.trim()
    if (!cleanQuery) {
      toast.error('Masukkan Nomor Induk Jemaat (NIJ) atau Kode Barcode!')
      return
    }

    setLoading(true)
    setSearched(true)
    setErrorMessage(null)
    setRateLimited(false)
    setResult(null)
    setDocUnlocked(false)
    setDocList([])
    setDocError(null)
    setActiveTab('profil')

    // Call server-side public verification action
    const res = await getProfilPublikAction(cleanQuery)
    setLoading(false)

    if (res.success && res.data) {
      setResult(res.data)
      toast.success('Keanggotaan jemaat berhasil diverifikasi!')
    } else {
      if (res.rateLimited) {
        setRateLimited(true)
        setErrorMessage(res.error || 'Terlalu banyak permintaan verifikasi. Silakan coba kembali dalam 1 menit.')
      } else {
        setErrorMessage(
          res.error || 'Data keanggotaan tidak ditemukan. Pastikan NIJ atau kode barcode yang Anda masukkan sudah benar.'
        )
      }
    }
  }

  const handleVerifyDocumentAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!result) return

    setVerifyingDoc(true)
    setDocError(null)
    setDocRateLimited(false)

    const res = await verifyDokumenAccessAction({
      nij: result.nij,
      verificationMethod: method,
      tanggalLahir: method === 'TANGGAL_LAHIR' ? tanggalLahirInput : null,
      last4Hp: method === 'LAST_4_HP' ? last4HpInput : null,
    })

    setVerifyingDoc(false)

    if (res.success && res.data) {
      setDocUnlocked(true)
      setDocList(res.data.dokumenList)
      setDocRateLimited(false)
      toast.success(res.message || 'Akses dokumen resmi berhasil dibuka!')
    } else {
      if (res.rateLimited) {
        setDocRateLimited(true)
      }
      setDocError(res.error || 'Verifikasi keamanan dokumen gagal.')
      toast.error(res.error || 'Verifikasi gagal.')
    }
  }

  const handleLockDocuments = () => {
    setDocUnlocked(false)
    setDocList([])
    setTanggalLahirInput('')
    setLast4HpInput('')
    setDocError(null)
    toast.info('Akses dokumen telah dikunci kembali.')
  }

  const formatDocType = (type: string) => {
    switch (type) {
      case 'BAPTIS':
        return 'Surat Baptis Selam'
      case 'NIKAH':
        return 'Akta Pernikahan Kudus'
      case 'PENYERAHAN_ANAK':
        return 'Surat Penyerahan Anak'
      case 'SAKSI':
        return 'Surat Saksi Pernikahan'
      default:
        return 'Dokumen Resmi'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className='dark min-h-svh bg-background text-foreground flex flex-col font-sans'>
      {/* Official Public Navigation Header */}
      <PublicHeader initialProfile={profile} />

      <main className='flex-1 px-3 py-4 sm:px-6 sm:py-6 md:p-8 max-w-2xl mx-auto w-full space-y-4 sm:space-y-6'>
        {/* Verification Card */}
        <Card className='shadow-xs bg-card'>
          <CardHeader className='text-center pb-2 px-4 sm:px-6'>
            <div className='size-11 sm:size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2'>
              <ShieldCheck className='size-5 sm:size-6' />
            </div>
            <CardTitle className='text-lg sm:text-xl font-bold'>Verifikasi & Akses Dokumen Jemaat</CardTitle>
            <CardDescription className='text-xs'>
              Masukkan Nomor Induk Jemaat (NIJ) resmi atau Kode Barcode kartu jemaat fisik Anda.
            </CardDescription>
          </CardHeader>

          <CardContent className='space-y-4 px-4 sm:px-6 pb-5'>
            <form onSubmit={handleSearch} className='space-y-3'>
              <div className='flex flex-col sm:flex-row gap-2'>
                <div className='relative flex-1'>
                  <Search className='size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none' />
                  <Input
                    placeholder='Contoh: NIJ-0001 atau JMT-893201'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className='pl-9 text-xs h-10 font-mono uppercase w-full'
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type='submit'
                  size='sm'
                  className='h-10 px-5 gap-1.5 w-full sm:w-auto font-medium shrink-0'
                  disabled={loading || !query.trim()}
                >
                  {loading ? <Loader2 className='size-4 animate-spin' /> : <Search className='size-4' />}
                  {loading ? 'Memeriksa...' : 'Periksa'}
                </Button>
              </div>
            </form>

            <div className='p-3 bg-muted/40 rounded-lg text-[11px] text-muted-foreground space-y-1'>
              <div className='flex items-center gap-1.5 font-semibold text-foreground'>
                <Lock className='size-3 text-primary shrink-0' /> Kepatuhan Privasi & Keamanan Berlapis (UU PDP)
              </div>
              <p className='leading-relaxed'>
                Sistem menerapkan verifikasi eksak. Dokumen pribadi hanya dapat dibuka setelah jemaat menyelesaikan Security Challenge data sekunder.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Verification Output Section */}
        {searched && (
          <div className='space-y-4 transition-all animate-in fade-in-50 duration-300'>
            {result ? (
              <div className='space-y-4'>
                <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
                  <TabsList className='grid grid-cols-2 w-full h-auto p-1 bg-muted/60 rounded-lg gap-1'>
                    <TabsTrigger
                      value='profil'
                      className='text-[11px] sm:text-xs font-semibold py-2 px-1.5 sm:px-3 flex items-center justify-center gap-1 sm:gap-1.5 text-center leading-tight whitespace-nowrap'
                    >
                      <CheckCircle2 className='size-3.5 text-emerald-600 shrink-0' />
                      <span>Status Jemaat</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value='dokumen'
                      className='text-[11px] sm:text-xs font-semibold py-2 px-1.5 sm:px-3 flex items-center justify-center gap-1 sm:gap-1.5 text-center leading-tight whitespace-nowrap'
                    >
                      <FileText className='size-3.5 text-primary shrink-0' />
                      <span>Dokumen Resmi</span>
                      {docUnlocked && (
                        <Badge variant='secondary' className='text-[10px] px-1 py-0 h-4 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 font-mono'>
                          {docList.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: Status Keanggotaan */}
                  <TabsContent value='profil' className='pt-2'>
                    <Card className='border-emerald-500/40 bg-emerald-500/5 shadow-xs overflow-hidden'>
                      <CardHeader className='pb-3 pt-4 px-4 bg-emerald-500/10 border-b border-emerald-500/20'>
                        <div className='flex items-center justify-between gap-2'>
                          <div className='flex items-center gap-1.5 sm:gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm min-w-0'>
                            <CheckCircle2 className='size-4 sm:size-5 text-emerald-600 dark:text-emerald-400 shrink-0' />
                            <span className='truncate'>Keanggotaan Terverifikasi</span>
                          </div>
                          <Badge className='bg-emerald-600 text-white font-mono text-[10px] shrink-0'>
                            RESMI
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className='p-4 space-y-3 text-xs'>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                          <div>
                            <span className='text-[10px] text-muted-foreground uppercase block font-semibold'>Nama Jemaat</span>
                            <span className='font-bold text-sm text-foreground block wrap-break-word'>{result.nama}</span>
                          </div>

                          <div>
                            <span className='text-[10px] text-muted-foreground uppercase block font-semibold'>Nomor Induk (NIJ)</span>
                            <span className='font-mono font-bold text-sm text-primary block break-all'>{result.nij}</span>
                          </div>

                          <div>
                            <span className='text-[10px] text-muted-foreground uppercase block font-semibold'>Status Keanggotaan</span>
                            <div className='pt-0.5'>
                              <Badge variant='outline' className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold'>
                                {result.statusJemaat.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>

                          <div>
                            <span className='text-[10px] text-muted-foreground uppercase block font-semibold'>Kategori Jemaat</span>
                            <span className='font-medium text-foreground block pt-0.5'>{result.kategoriNama}</span>
                          </div>
                        </div>

                        <div className='pt-3 border-t text-[11px] text-muted-foreground flex flex-col xs:flex-row xs:items-center justify-between gap-1'>
                          <span>Terverifikasi melalui Server CMS</span>
                          <span className='font-mono'>
                            {new Date(result.verifiedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB 2: Dokumen Resmi Saya */}
                  <TabsContent value='dokumen' className='pt-2'>
                    {!docUnlocked ? (
                      /* Security Gate Challenge */
                      <Card className='border shadow-xs bg-card'>
                        <CardHeader className='pb-2 text-center px-4 sm:px-6'>
                          <div className='size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1.5'>
                            <KeyRound className='size-5' />
                          </div>
                          <CardTitle className='text-sm sm:text-base font-bold'>Verifikasi Keamanan Akses Dokumen</CardTitle>
                          <CardDescription className='text-xs max-w-md mx-auto leading-relaxed'>
                            Demi perlindungan dokumen resmi Anda dari akses yang tidak berhak, silakan lengkapi verifikasi keamanan data pribadi berikut.
                          </CardDescription>
                        </CardHeader>

                        <CardContent className='p-4 pt-1 space-y-4'>
                          {/* Method Selector */}
                          <div className='flex gap-2 justify-center max-w-sm mx-auto'>
                            <Button
                              type='button'
                              size='sm'
                              variant={method === 'TANGGAL_LAHIR' ? 'default' : 'outline'}
                              className='text-xs h-8 gap-1.5 flex-1'
                              onClick={() => { setMethod('TANGGAL_LAHIR'); setDocError(null) }}
                            >
                              <Calendar className='size-3.5 shrink-0' />
                              <span className='truncate'>Tanggal Lahir</span>
                            </Button>
                            <Button
                              type='button'
                              size='sm'
                              variant={method === 'LAST_4_HP' ? 'default' : 'outline'}
                              className='text-xs h-8 gap-1.5 flex-1'
                              onClick={() => { setMethod('LAST_4_HP'); setDocError(null) }}
                            >
                              <Phone className='size-3.5 shrink-0' />
                              <span className='truncate'>4 Digit No. HP</span>
                            </Button>
                          </div>

                          <form onSubmit={handleVerifyDocumentAccess} className='space-y-3 max-w-sm mx-auto'>
                            {method === 'TANGGAL_LAHIR' ? (
                              <div className='space-y-1.5'>
                                <div className='flex flex-wrap items-center justify-between gap-1'>
                                  <Label htmlFor='tglLahirInput' className='text-xs font-medium text-foreground'>
                                    Pilih Tanggal Lahir Anda:
                                  </Label>
                                  {tanggalLahirInput && (
                                    <span className='text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold'>
                                      {new Date(tanggalLahirInput + 'T00:00:00').toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </span>
                                  )}
                                </div>
                                <div className='relative'>
                                  <Calendar className='size-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none' />
                                  <Input
                                    id='tglLahirInput'
                                    type='date'
                                    max={new Date().toISOString().split('T')[0]}
                                    min='1920-01-01'
                                    value={tanggalLahirInput}
                                    onChange={(e) => setTanggalLahirInput(e.target.value)}
                                    className='text-xs h-9 pl-9 pr-3 font-medium bg-background text-foreground w-full'
                                    required
                                    disabled={verifyingDoc || docRateLimited}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className='space-y-2.5 flex flex-col items-center justify-center text-center'>
                                <Label className='text-xs font-medium text-foreground text-center block'>
                                  4 Digit Terakhir No. HP / WhatsApp Terdaftar:
                                </Label>
                                <div className='flex justify-center py-1'>
                                  <InputOTP
                                    maxLength={4}
                                    value={last4HpInput}
                                    onChange={(val) => setLast4HpInput(val.replace(/\D/g, ''))}
                                    pattern={REGEXP_ONLY_DIGITS}
                                    disabled={verifyingDoc || docRateLimited}
                                    containerClassName='justify-center gap-2.5'
                                  >
                                    <InputOTPGroup className='gap-2.5'>
                                      <InputOTPSlot index={0} className='size-11 sm:size-12 text-base font-bold rounded-lg border shadow-xs bg-background' />
                                      <InputOTPSlot index={1} className='size-11 sm:size-12 text-base font-bold rounded-lg border shadow-xs bg-background' />
                                      <InputOTPSlot index={2} className='size-11 sm:size-12 text-base font-bold rounded-lg border shadow-xs bg-background' />
                                      <InputOTPSlot index={3} className='size-11 sm:size-12 text-base font-bold rounded-lg border shadow-xs bg-background' />
                                    </InputOTPGroup>
                                  </InputOTP>
                                </div>
                              </div>
                            )}

                            {docError && (
                              <div className='p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2'>
                                <ShieldAlert className='size-4 shrink-0 mt-0.5' />
                                <span className='leading-relaxed'>{docError}</span>
                              </div>
                            )}

                            <Button
                              type='submit'
                              className='w-full text-xs h-9 gap-1.5 font-medium'
                              disabled={verifyingDoc || docRateLimited || (method === 'TANGGAL_LAHIR' ? !tanggalLahirInput.trim() : last4HpInput.length !== 4)}
                            >
                              {verifyingDoc ? <Loader2 className='size-4 animate-spin' /> : <Unlock className='size-4' />}
                              {verifyingDoc ? 'Memverifikasi Kredensial...' : 'Buka Akses Dokumen'}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    ) : (
                      /* Unlocked Documents List */
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg'>
                          <div className='flex items-center gap-2.5 min-w-0'>
                            <div className='size-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0'>
                              <Unlock className='size-3.5' />
                            </div>
                            <div className='min-w-0'>
                              <span className='font-semibold text-xs text-emerald-800 dark:text-emerald-300 block truncate'>
                                Akses Dokumen Terbuka
                              </span>
                              <span className='text-[10px] text-emerald-700/80 dark:text-emerald-400/80 block font-mono'>
                                Terverifikasi Resmi
                              </span>
                            </div>
                          </div>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-8 px-3 text-xs gap-1.5 border-emerald-500/30 bg-card hover:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 shrink-0 font-medium'
                            onClick={handleLockDocuments}
                          >
                            <Lock className='size-3' /> Kunci
                          </Button>
                        </div>

                        {docList.length === 0 ? (
                          <Card className='border bg-card shadow-xs text-center p-6 sm:p-8 space-y-2'>
                            <FileText className='size-8 text-muted-foreground/60 mx-auto' />
                            <div className='font-bold text-sm text-foreground'>Belum Ada Dokumen Resmi</div>
                            <p className='text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed'>
                              Dokumen baptis atau pernikahan Anda sedang dalam proses verifikasi dan penerbitan oleh Sekretariat Gereja.
                            </p>
                          </Card>
                        ) : (
                          <div className='space-y-3'>
                            {docList.map((doc) => (
                              <Card key={doc.id} className='border bg-card shadow-xs hover:border-primary/40 transition-all overflow-hidden'>
                                <CardContent className='p-4 space-y-3.5'>
                                  {/* Header: Icon, Judul, & Badges */}
                                  <div className='flex items-start gap-3 min-w-0'>
                                    <div className='size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5'>
                                      <FileCheck className='size-5' />
                                    </div>
                                    <div className='min-w-0 flex-1 space-y-1.5'>
                                      <h4 className='font-bold text-sm text-foreground leading-snug wrap-break-word'>
                                        {doc.judul}
                                      </h4>
                                      <div className='flex flex-wrap items-center gap-1.5'>
                                        <Badge variant='outline' className='text-[10px] font-medium bg-muted/50 border-muted-foreground/20 text-muted-foreground'>
                                          {formatDocType(doc.jenisDokumen)}
                                        </Badge>
                                        <Badge className='text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'>
                                          VERIFIED
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Metadata Bar: Tanggal Terbit & Ukuran Berkas */}
                                  <div className='flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50'>
                                    <div className='flex items-center gap-1.5'>
                                      <Calendar className='size-3.5 text-muted-foreground/70 shrink-0' />
                                      <span>Terbit: {new Date(doc.tanggalTerbit).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <span className='font-mono font-medium'>{formatFileSize(doc.fileSize)}</span>
                                  </div>

                                  {/* Action Buttons: 2-Kolom Seimbang */}
                                  <div className='grid grid-cols-2 gap-2 pt-0.5'>
                                    <Button
                                      asChild
                                      size='sm'
                                      variant='outline'
                                      className='h-9 text-xs gap-1.5 font-medium text-foreground'
                                    >
                                      <a
                                        href={`/api/dokumen-publik/download?token=${doc.downloadToken}&mode=view`}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                      >
                                        <Eye className='size-3.5' /> Lihat
                                      </a>
                                    </Button>

                                    <Button
                                      asChild
                                      size='sm'
                                      className='h-9 text-xs gap-1.5 font-semibold bg-primary text-primary-foreground shadow-xs'
                                    >
                                      <a
                                        href={`/api/dokumen-publik/download?token=${doc.downloadToken}&mode=download`}
                                        download
                                      >
                                        <Download className='size-3.5' /> Unduh (PDF)
                                      </a>
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : rateLimited ? (
              <Card className='border-amber-500/40 bg-amber-500/5 shadow-xs'>
                <CardContent className='p-5 text-center space-y-2'>
                  <AlertCircle className='size-8 text-amber-500 mx-auto' />
                  <h4 className='font-bold text-sm text-foreground'>Terlalu Banyak Permintaan</h4>
                  <p className='text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed'>
                    {errorMessage}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className='border-rose-500/30 bg-rose-500/5 shadow-xs'>
                <CardContent className='p-5 text-center space-y-2'>
                  <XCircle className='size-8 text-rose-500 mx-auto' />
                  <h4 className='font-bold text-sm text-foreground'>Data Keanggotaan Tidak Ditemukan</h4>
                  <p className='text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed'>
                    {errorMessage}
                  </p>
                  <div className='pt-2'>
                    <Button asChild variant='outline' size='sm' className='text-xs'>
                      <Link href='/daftar'>Daftar Menjadi Jemaat Baru</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Official Public Footer */}
      <PublicFooter initialProfile={profile} />
    </div>
  )
}
