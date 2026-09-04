'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building2,
  Compass,
  BookOpen,
  Calendar,
  Save,
  Loader2,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  ShieldCheck,
  Award,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { ArtikelEditor } from '@/components/artikel/artikel-editor'
import {
  getProfilGerejaAdminAction,
  updateProfilGerejaAction,
  createMilestoneAction,
  updateMilestoneAction,
  deleteMilestoneAction,
  ProfilGerejaDTO,
  MilestoneDTO,
} from '@/actions/profil-gereja'
import { toast } from 'sonner'

export default function ProfilGerejaSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form State
  const [namaGereja, setNamaGereja] = useState('')
  const [sinode, setSinode] = useState('')
  const [tagline, setTagline] = useState('')
  const [ayatEmas, setAyatEmas] = useState('')
  const [isiAyatEmas, setIsiAyatEmas] = useState('')
  const [alamat, setAlamat] = useState('')
  const [telepon, setTelepon] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')
  const [youtube, setYoutube] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')

  // Visi, Misi, Nilai Inti
  const [visi, setVisi] = useState('')
  const [misiList, setMisiList] = useState<string[]>([''])
  const [nilaiIntiList, setNilaiIntiList] = useState<{ title: string; desc: string }[]>([
    { title: '', desc: '' },
  ])

  // Sejarah & Pengakuan Iman
  const [sejarahLengkap, setSejarahLengkap] = useState('')
  const [pengakuanIman, setPengakuanIman] = useState('')

  // Milestones State
  const [milestones, setMilestones] = useState<MilestoneDTO[]>([])
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null)
  const [msTahun, setMsTahun] = useState(new Date().getFullYear())
  const [msJudul, setMsJudul] = useState('')
  const [msDeskripsi, setMsDeskripsi] = useState('')
  const [msUrutan, setMsUrutan] = useState(0)
  const [savingMs, setSavingMs] = useState(false)

  // Load Data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const res = await getProfilGerejaAdminAction()
      if (res.success && res.data) {
        const p = res.data.profil
        setNamaGereja(p.namaGereja || '')
        setSinode(p.sinode || '')
        setTagline(p.tagline || '')
        setAyatEmas(p.ayatEmas || '')
        setIsiAyatEmas(p.isiAyatEmas || '')
        setAlamat(p.alamat || '')
        setTelepon(p.telepon || '')
        setEmail(p.email || '')
        setWhatsapp(p.whatsapp || '')
        setInstagram(p.instagram || '')
        setYoutube(p.youtube || '')
        setGoogleMapsUrl(p.googleMapsUrl || '')

        setVisi(p.visi || '')
        setSejarahLengkap(p.sejarahLengkap || '')
        setPengakuanIman(p.pengakuanIman || '')

        // Parse Misi
        try {
          if (p.misi) {
            const parsed = JSON.parse(p.misi)
            if (Array.isArray(parsed) && parsed.length > 0) setMisiList(parsed)
          }
        } catch {}

        // Parse Nilai Inti
        try {
          if (p.nilaiInti) {
            const parsed = JSON.parse(p.nilaiInti)
            if (Array.isArray(parsed) && parsed.length > 0) setNilaiIntiList(parsed)
          }
        } catch {}

        setMilestones(res.data.milestones || [])
      } else if (res.error) {
        toast.error(res.error)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  // Save All Profile Settings
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await updateProfilGerejaAction({
        namaGereja,
        sinode,
        tagline,
        ayatEmas,
        isiAyatEmas,
        alamat,
        telepon,
        email,
        whatsapp,
        instagram,
        youtube,
        googleMapsUrl,
        visi,
        misi: JSON.stringify(misiList.filter((m) => m.trim().length > 0)),
        nilaiInti: JSON.stringify(nilaiIntiList.filter((n) => n.title.trim().length > 0)),
        sejarahLengkap,
        pengakuanIman,
      })

      if (res.success) {
        toast.success('Profil gereja & sejarah berhasil disimpan!')
      } else {
        toast.error(res.error || 'Gagal menyimpan profil gereja.')
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat menyimpan data.')
    } finally {
      setSaving(false)
    }
  }

  // Milestone Dialog Handlers
  const handleOpenNewMilestone = () => {
    setEditingMilestoneId(null)
    setMsTahun(new Date().getFullYear())
    setMsJudul('')
    setMsDeskripsi('')
    setMsUrutan(milestones.length + 1)
    setMilestoneDialogOpen(true)
  }

  const handleOpenEditMilestone = (ms: MilestoneDTO) => {
    setEditingMilestoneId(ms.id)
    setMsTahun(ms.tahun)
    setMsJudul(ms.judul)
    setMsDeskripsi(ms.deskripsi)
    setMsUrutan(ms.urutan)
    setMilestoneDialogOpen(true)
  }

  const handleSaveMilestone = async () => {
    if (!msJudul.trim() || !msDeskripsi.trim()) {
      toast.error('Judul dan deskripsi tonggak sejarah wajib diisi.')
      return
    }

    setSavingMs(true)
    if (editingMilestoneId) {
      const res = await updateMilestoneAction(editingMilestoneId, {
        tahun: Number(msTahun),
        judul: msJudul,
        deskripsi: msDeskripsi,
        urutan: Number(msUrutan),
      })
      if (res.success) {
        toast.success('Tonggak sejarah diperbarui!')
        setMilestones((prev) =>
          prev.map((m) =>
            m.id === editingMilestoneId
              ? { ...m, tahun: Number(msTahun), judul: msJudul, deskripsi: msDeskripsi, urutan: Number(msUrutan) }
              : m
          ).sort((a, b) => a.tahun - b.tahun)
        )
        setMilestoneDialogOpen(false)
      } else {
        toast.error(res.error || 'Gagal memperbarui tonggak.')
      }
    } else {
      const res = await createMilestoneAction({
        tahun: Number(msTahun),
        judul: msJudul,
        deskripsi: msDeskripsi,
        urutan: Number(msUrutan),
      })
      if (res.success && res.data) {
        toast.success('Tonggak sejarah baru ditambahkan!')
        setMilestones((prev) => [...prev, res.data!].sort((a, b) => a.tahun - b.tahun))
        setMilestoneDialogOpen(false)
      } else {
        toast.error(res.error || 'Gagal menambahkan tonggak.')
      }
    }
    setSavingMs(false)
  }

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tonggak sejarah ini?')) return
    const res = await deleteMilestoneAction(id)
    if (res.success) {
      toast.success('Tonggak sejarah berhasil dihapus.')
      setMilestones((prev) => prev.filter((m) => m.id !== id))
    } else {
      toast.error(res.error || 'Gagal menghapus tonggak.')
    }
  }

  return (
    <div className='p-4 sm:p-6 space-y-6 max-w-6xl mx-auto'>
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div>
          <div className='flex items-center gap-2'>
            <Building2 className='size-5 text-primary' />
            <h1 className='text-lg sm:text-xl font-bold text-foreground'>Profil, Visi, Misi & Sejarah Gereja</h1>
          </div>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Kelola konten profil publik, visi misi, sejarah perjalanan, dan pengakuan iman jemaat.
          </p>
        </div>

        <div className='flex items-center gap-2.5'>
          <Link href='/tentang-kami' target='_blank'>
            <Button variant='outline' size='sm' className='h-9 text-xs gap-1.5 shadow-xs'>
              <ExternalLink className='size-3.5' /> Lihat Halaman Publik
            </Button>
          </Link>
          <Button
            onClick={handleSaveProfile}
            disabled={saving || loading}
            size='sm'
            className='h-9 text-xs gap-1.5 font-semibold shadow-xs'
          >
            {saving ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
            Simpan Perubahan
          </Button>
        </div>
      </div>

      {loading ? (
        <div className='py-24 flex items-center justify-center gap-2 text-xs text-muted-foreground'>
          <Loader2 className='size-4 animate-spin text-primary' /> Memuat data profil gereja...
        </div>
      ) : (
        <Tabs defaultValue='identitas' className='space-y-6'>
          <TabsList className='grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/60'>
            <TabsTrigger value='identitas' className='text-xs py-2 gap-1.5'>
              <Building2 className='size-3.5' /> Identitas & Kontak
            </TabsTrigger>
            <TabsTrigger value='visi-misi' className='text-xs py-2 gap-1.5'>
              <Compass className='size-3.5' /> Visi, Misi & Nilai
            </TabsTrigger>
            <TabsTrigger value='sejarah' className='text-xs py-2 gap-1.5'>
              <BookOpen className='size-3.5' /> Sejarah (Rich Editor)
            </TabsTrigger>
            <TabsTrigger value='milestones' className='text-xs py-2 gap-1.5'>
              <Calendar className='size-3.5' /> Tonggak Sejarah ({milestones.length})
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: IDENTITAS & KONTAK ───────────────────────────── */}
          <TabsContent value='identitas' className='space-y-6'>
            <Card className='shadow-xs'>
              <CardHeader className='pb-4 border-b bg-muted/20'>
                <CardTitle className='text-sm font-bold text-foreground'>Identitas Resmi Gereja</CardTitle>
                <CardDescription className='text-xs text-muted-foreground'>
                  Informasi nama gereja, sinode, dan kontak yang ditampilkan di website publik.
                </CardDescription>
              </CardHeader>
              <CardContent className='p-6 space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Nama Gereja</Label>
                    <Input
                      value={namaGereja}
                      onChange={(e) => setNamaGereja(e.target.value)}
                      placeholder='Contoh: GBI Getsemani'
                      className='text-xs h-9'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Nama Sinode / Afiliasi</Label>
                    <Input
                      value={sinode}
                      onChange={(e) => setSinode(e.target.value)}
                      placeholder='Contoh: Gereja Bethel Indonesia'
                      className='text-xs h-9'
                    />
                  </div>

                  <div className='space-y-1.5 sm:col-span-2'>
                    <Label className='text-xs font-semibold'>Tagline / Slogan Pelayanan</Label>
                    <Input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder='Contoh: Gereja Yang Membawa Pemulihan & Transformasi Hidup'
                      className='text-xs h-9'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Ayat Emas Pelayanan</Label>
                    <Input
                      value={ayatEmas}
                      onChange={(e) => setAyatEmas(e.target.value)}
                      placeholder='Contoh: Matius 28:19-20'
                      className='text-xs h-9'
                    />
                  </div>

                  <div className='space-y-1.5 sm:col-span-2'>
                    <Label className='text-xs font-semibold'>Bunyi Ayat Firman Tuhan</Label>
                    <Textarea
                      value={isiAyatEmas}
                      onChange={(e) => setIsiAyatEmas(e.target.value)}
                      placeholder='Tuliskan teks lengkap firman Tuhan...'
                      rows={2}
                      className='text-xs'
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='shadow-xs'>
              <CardHeader className='pb-4 border-b bg-muted/20'>
                <CardTitle className='text-sm font-bold text-foreground'>Alamat & Kontak Pelayanan</CardTitle>
                <CardDescription className='text-xs text-muted-foreground'>
                  Lokasi fisik dan saluran komunikasi resmi gereja.
                </CardDescription>
              </CardHeader>
              <CardContent className='p-6 space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-1.5 sm:col-span-2'>
                    <Label className='text-xs font-semibold'>Alamat Lengkap Gereja</Label>
                    <Input
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      placeholder='Jl. Kasih Karunia No. 7, Jakarta'
                      className='text-xs h-9'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Nomor Telepon Kantor</Label>
                    <Input
                      value={telepon}
                      onChange={(e) => setTelepon(e.target.value)}
                      placeholder='(021) 555-1234'
                      className='text-xs h-9'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Email Resmi</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder='info@gbigetsemani.org'
                      className='text-xs h-9'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>WhatsApp Pelayanan</Label>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder='+6281234567890'
                      className='text-xs h-9'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Akun Instagram</Label>
                    <Input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder='@gbigetsemani'
                      className='text-xs h-9'
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 2: VISI, MISI & NILAI INTI ───────────────────────── */}
          <TabsContent value='visi-misi' className='space-y-6'>
            <Card className='shadow-xs'>
              <CardHeader className='pb-4 border-b bg-muted/20'>
                <CardTitle className='text-sm font-bold text-foreground'>Visi & Misi Gereja</CardTitle>
                <CardDescription className='text-xs text-muted-foreground'>
                  Arah dan langkah konkret panggilan pelayanan gereja.
                </CardDescription>
              </CardHeader>
              <CardContent className='p-6 space-y-6'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Teks Visi Pelayanan</Label>
                  <Textarea
                    value={visi}
                    onChange={(e) => setVisi(e.target.value)}
                    placeholder='Tuliskan visi pelayanan gereja...'
                    rows={3}
                    className='text-xs leading-relaxed'
                  />
                </div>

                <div className='space-y-3 pt-2 border-t'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-xs font-semibold'>Butir-Butir Misi Pelayanan</Label>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setMisiList([...misiList, ''])}
                      className='h-7 text-[11px] gap-1'
                    >
                      <Plus className='size-3' /> Tambah Butir Misi
                    </Button>
                  </div>

                  <div className='space-y-2'>
                    {misiList.map((m, idx) => (
                      <div key={idx} className='flex items-center gap-2'>
                        <span className='size-6 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0'>
                          {idx + 1}
                        </span>
                        <Input
                          value={m}
                          onChange={(e) => {
                            const updated = [...misiList]
                            updated[idx] = e.target.value
                            setMisiList(updated)
                          }}
                          placeholder={`Butir misi ke-${idx + 1}...`}
                          className='text-xs h-9'
                        />
                        {misiList.length > 1 && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => setMisiList(misiList.filter((_, i) => i !== idx))}
                            className='h-9 w-9 p-0 text-muted-foreground hover:text-rose-600'
                          >
                            <Trash2 className='size-3.5' />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='shadow-xs'>
              <CardHeader className='pb-4 border-b bg-muted/20 flex flex-row items-center justify-between'>
                <div>
                  <CardTitle className='text-sm font-bold text-foreground'>Nilai-Nilai Inti (Core Values)</CardTitle>
                  <CardDescription className='text-xs text-muted-foreground'>
                    Pilar budaya dan prinsip iman yang dihidupi bersama.
                  </CardDescription>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setNilaiIntiList([...nilaiIntiList, { title: '', desc: '' }])}
                  className='h-8 text-xs gap-1'
                >
                  <Plus className='size-3' /> Tambah Nilai
                </Button>
              </CardHeader>
              <CardContent className='p-6 space-y-4'>
                {nilaiIntiList.map((val, idx) => (
                  <div key={idx} className='p-4 border rounded-xl bg-card space-y-3 relative group'>
                    <div className='flex items-center justify-between'>
                      <Badge variant='secondary' className='text-[10px] font-mono'>
                        Nilai #{idx + 1}
                      </Badge>
                      {nilaiIntiList.length > 1 && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => setNilaiIntiList(nilaiIntiList.filter((_, i) => i !== idx))}
                          className='h-7 w-7 p-0 text-muted-foreground hover:text-rose-600'
                        >
                          <Trash2 className='size-3.5' />
                        </Button>
                      )}
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                      <div className='space-y-1'>
                        <Label className='text-[11px] font-medium'>Judul Nilai</Label>
                        <Input
                          value={val.title}
                          onChange={(e) => {
                            const updated = [...nilaiIntiList]
                            updated[idx].title = e.target.value
                            setNilaiIntiList(updated)
                          }}
                          placeholder='Misal: Christ-Centered'
                          className='text-xs h-8'
                        />
                      </div>
                      <div className='space-y-1 sm:col-span-2'>
                        <Label className='text-[11px] font-medium'>Deskripsi Singkat</Label>
                        <Input
                          value={val.desc}
                          onChange={(e) => {
                            const updated = [...nilaiIntiList]
                            updated[idx].desc = e.target.value
                            setNilaiIntiList(updated)
                          }}
                          placeholder='Penjelasan singkat nilai...'
                          className='text-xs h-8'
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 3: SEJARAH & PENGAKUAN IMAN (RICH EDITOR) ────────── */}
          <TabsContent value='sejarah' className='space-y-6'>
            <Card className='shadow-xs'>
              <CardHeader className='pb-4 border-b bg-muted/20'>
                <CardTitle className='text-sm font-bold text-foreground'>
                  Narasi Sejarah Lengkap (Rich Editor)
                </CardTitle>
                <CardDescription className='text-xs text-muted-foreground'>
                  Tuliskan cerita sejarah pendirian, perkembangan, dan firman Tuhan yang menjadi fondasi jemaat. Mendukung heading, gambar, dan Bible callouts.
                </CardDescription>
              </CardHeader>
              <CardContent className='p-6'>
                <ArtikelEditor
                  value={sejarahLengkap}
                  onChange={setSejarahLengkap}
                  placeholder='Tuliskan narasi sejarah pendirian gereja secara mendalam di sini...'
                />
              </CardContent>
            </Card>

            <Card className='shadow-xs'>
              <CardHeader className='pb-4 border-b bg-muted/20'>
                <CardTitle className='text-sm font-bold text-foreground'>Pengakuan Iman Doktrinal</CardTitle>
                <CardDescription className='text-xs text-muted-foreground'>
                  Pernyataan kredo doktrin dan pengakuan iman yang diakui gereja.
                </CardDescription>
              </CardHeader>
              <CardContent className='p-6'>
                <Textarea
                  value={pengakuanIman}
                  onChange={(e) => setPengakuanIman(e.target.value)}
                  placeholder='Tuliskan butir-butir pengakuan iman gereja...'
                  rows={8}
                  className='text-xs font-sans leading-relaxed'
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 4: TONGGAK SEJARAH (MILESTONES) ──────────────────── */}
          <TabsContent value='milestones' className='space-y-6'>
            <Card className='shadow-xs'>
              <CardHeader className='pb-4 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                <div>
                  <CardTitle className='text-sm font-bold text-foreground'>
                    Garis Waktu Sejarah (Timeline Milestones)
                  </CardTitle>
                  <CardDescription className='text-xs text-muted-foreground'>
                    Daftar tonggak sejarah penting per tahun yang ditampilkan pada timeline interaktif di halaman publik.
                  </CardDescription>
                </div>
                <Button onClick={handleOpenNewMilestone} size='sm' className='h-8 text-xs gap-1.5 font-semibold shadow-xs'>
                  <Plus className='size-3.5' /> Tambah Tonggak Sejarah
                </Button>
              </CardHeader>
              <CardContent className='p-6'>
                {milestones.length === 0 ? (
                  <div className='py-12 text-center text-xs text-muted-foreground space-y-2'>
                    <Calendar className='size-8 mx-auto text-muted-foreground/40' />
                    <p>Belum ada tonggak sejarah. Klik tombol di atas untuk menambahkan.</p>
                  </div>
                ) : (
                  <div className='divide-y border rounded-xl overflow-hidden'>
                    {milestones.map((ms, idx) => (
                      <div key={ms.id} className='p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors'>
                        <div className='flex items-start gap-3.5'>
                          <div className='px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-sm shrink-0 mt-0.5'>
                            {ms.tahun}
                          </div>
                          <div className='space-y-1'>
                            <h3 className='font-bold text-sm text-foreground'>{ms.judul}</h3>
                            <p className='text-xs text-muted-foreground leading-relaxed whitespace-pre-line max-w-2xl'>
                              {ms.deskripsi}
                            </p>
                          </div>
                        </div>

                        <div className='flex items-center gap-1 shrink-0'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleOpenEditMilestone(ms)}
                            className='h-8 w-8 p-0'
                          >
                            <Edit className='size-3.5' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleDeleteMilestone(ms.id)}
                            className='h-8 w-8 p-0 text-rose-600 hover:text-rose-700'
                          >
                            <Trash2 className='size-3.5' />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ── DIALOG TAMBAH/EDIT MILESTONE ──────────────────────────── */}
      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold'>
              {editingMilestoneId ? 'Edit Tonggak Sejarah' : 'Tambah Tonggak Sejarah Baru'}
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tentukan tahun dan deskripsi peristiwa penting perjalanan pelayanan gereja.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Tahun Peristiwa</Label>
                <Input
                  type='number'
                  value={msTahun}
                  onChange={(e) => setMsTahun(Number(e.target.value))}
                  placeholder='1995'
                  className='text-xs h-9 font-mono'
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Urutan Sort</Label>
                <Input
                  type='number'
                  value={msUrutan}
                  onChange={(e) => setMsUrutan(Number(e.target.value))}
                  placeholder='1'
                  className='text-xs h-9 font-mono'
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Judul Peristiwa</Label>
              <Input
                value={msJudul}
                onChange={(e) => setMsJudul(e.target.value)}
                placeholder='Misal: Peresmian Gedung Ibadah'
                className='text-xs h-9'
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Deskripsi Perjalanan</Label>
              <Textarea
                value={msDeskripsi}
                onChange={(e) => setMsDeskripsi(e.target.value)}
                placeholder='Ceritakan secara ringkas peristiwa ini...'
                rows={4}
                className='text-xs leading-relaxed'
              />
            </div>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' size='sm' onClick={() => setMilestoneDialogOpen(false)} className='text-xs h-8'>
              Batal
            </Button>
            <Button onClick={handleSaveMilestone} disabled={savingMs} size='sm' className='text-xs h-8 font-semibold'>
              {savingMs ? <Loader2 className='size-3.5 animate-spin' /> : <Save className='size-3.5' />}
              Simpan Tonggak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
