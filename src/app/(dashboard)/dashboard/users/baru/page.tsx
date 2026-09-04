'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  Lock,
  KeyRound,
  Sparkles,
  Phone,
  Mail,
  User,
  Loader2,
  Info,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createUserAction } from '@/actions/users'
import { getKategorialListAction } from '@/actions/kategorial'
import { Layers, Check } from 'lucide-react'

type StaffRole =
  | 'SUPER_ADMIN'
  | 'GEMBALA'
  | 'SEKRETARIS'
  | 'BENDAHARA'
  | 'SEKRETARIS_KATEGORIAL'
  | 'BENDAHARA_KATEGORIAL'
  | 'USHER'

export default function CreateUserPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [availableKategorials, setAvailableKategorials] = useState<{ id: string; nama: string }[]>([])

  const [formData, setFormData] = useState({
    nama: '',
    username: '',
    email: '',
    noHp: '',
    role: 'SEKRETARIS' as StaffRole,
    kategorialIds: [] as string[],
    password: '',
    confirmPassword: '',
    status: 'AKTIF' as 'AKTIF' | 'NONAKTIF',
  })

  React.useEffect(() => {
    getKategorialListAction({ page: 1, pageSize: 100 }).then((res) => {
      if (res.success && res.data?.items) {
        setAvailableKategorials(res.data.items.map((k: any) => ({ id: k.id, nama: k.nama })))
      }
    })
  }, [])

  const handleToggleKategorial = (id: string) => {
    setFormData((prev) => {
      const exists = prev.kategorialIds.includes(id)
      return {
        ...prev,
        kategorialIds: exists
          ? prev.kategorialIds.filter((item) => item !== id)
          : [...prev.kategorialIds, id],
      }
    })
  }

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$'
    let pwd = ''
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData((p) => ({ ...p, password: pwd, confirmPassword: pwd }))
    toast.info(`Kata sandi acak dihasilkan: ${pwd}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nama.trim()) {
      toast.error('Nama lengkap wajib diisi!')
      return
    }
    if (!formData.username.trim()) {
      toast.error('Username wajib diisi!')
      return
    }
    if (!formData.email.trim()) {
      toast.error('Email resmi wajib diisi!')
      return
    }
    if (
      (formData.role === 'SEKRETARIS_KATEGORIAL' || formData.role === 'BENDAHARA_KATEGORIAL') &&
      formData.kategorialIds.length === 0
    ) {
      toast.error('Pilih minimal 1 kategorial yang ditugaskan kepada staf ini!')
      return
    }
    if (formData.password.length < 6) {
      toast.error('Kata sandi minimal 6 karakter!')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok!')
      return
    }

    setSubmitting(true)
    const res = await createUserAction({
      nama: formData.nama.trim(),
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      noHp: formData.noHp.trim() || null,
      role: formData.role,
      kategorialIds: formData.kategorialIds,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      status: formData.status,
    })
    setSubmitting(false)

    if (res.success) {
      toast.success(res.message || 'Akun staf baru berhasil didaftarkan!')
      router.push('/dashboard/users')
    } else {
      toast.error(res.error || 'Gagal mendaftarkan pengguna.')
    }
  }

  const isScopedRole =
    formData.role === 'SEKRETARIS_KATEGORIAL' || formData.role === 'BENDAHARA_KATEGORIAL'

  return (
    <div className='p-4 md:p-8 space-y-6 max-w-3xl mx-auto'>
      {/* Header Bar */}
      <div className='flex items-center gap-3'>
        <Button asChild variant='ghost' size='icon' className='size-9'>
          <Link href='/dashboard/users'>
            <ArrowLeft className='size-4' />
          </Link>
        </Button>
        <div>
          <h1 className='text-xl font-bold tracking-tight text-foreground flex items-center gap-2'>
            <UserPlus className='size-5 text-primary' /> Pendaftaran Pengguna & Staf Baru
          </h1>
          <p className='text-xs text-muted-foreground'>
            Daftarkan akun staf gereja dengan enkripsi Bcrypt dan integrasi audit kriptografi SHA-256.
          </p>
        </div>
      </div>

      {/* Main Form Card */}
      <Card className='shadow-xs bg-card'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-base font-bold'>Formulir Kredensial Pengguna</CardTitle>
          <CardDescription className='text-xs'>
            Seluruh data akun terdaftar secara permanen dalam database dan diverifikasi melalui PBAC.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4 text-xs'>
            {/* Nama Lengkap */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Nama Lengkap Staf *</Label>
              <Input
                placeholder='Contoh: Andreas Wijaya, S.Th.'
                value={formData.nama}
                onChange={(e) => setFormData((p) => ({ ...p, nama: e.target.value }))}
                className='text-xs h-9'
                required
              />
            </div>

            {/* Username & Email */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Username (Login ID) *</Label>
                <Input
                  placeholder='contoh: andreas'
                  value={formData.username}
                  onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value.toLowerCase() }))}
                  className='text-xs h-9 font-mono'
                  required
                />
                <p className='text-[10px] text-muted-foreground'>Gunakan huruf kecil dan angka tanpa spasi.</p>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Alamat Email Resmi *</Label>
                <Input
                  type='email'
                  placeholder='user@gereja.org'
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className='text-xs h-9'
                  required
                />
                <p className='text-[10px] text-muted-foreground'>Digunakan untuk verifikasi dan identifikasi.</p>
              </div>
            </div>

            {/* No HP & Role */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Nomor Handphone / WhatsApp</Label>
                <Input
                  placeholder='081234567890'
                  value={formData.noHp}
                  onChange={(e) => setFormData((p) => ({ ...p, noHp: e.target.value }))}
                  className='text-xs h-9'
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Peran & Hak Akses (Role) *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData((p) => ({ ...p, role: val as StaffRole }))}
                >
                  <SelectTrigger className='text-xs h-9 w-full min-w-0'>
                    <SelectValue placeholder='Pilih peran' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='SUPER_ADMIN' className='text-xs'>Super Admin</SelectItem>
                    <SelectItem value='GEMBALA' className='text-xs'>Gembala</SelectItem>
                    <SelectItem value='SEKRETARIS' className='text-xs'>Sekretaris Pusat</SelectItem>
                    <SelectItem value='BENDAHARA' className='text-xs'>Bendahara Pusat</SelectItem>
                    <SelectItem value='SEKRETARIS_KATEGORIAL' className='text-xs'>Sekretaris Kategorial</SelectItem>
                    <SelectItem value='BENDAHARA_KATEGORIAL' className='text-xs'>Bendahara Kategorial</SelectItem>
                    <SelectItem value='USHER' className='text-xs'>Usher / Scanner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Department / Kategorial Assignment (Visible only for Scoped Roles) */}
            {isScopedRole && (
              <div className='p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Layers className='size-4 text-primary' />
                    <Label className='text-xs font-bold text-foreground'>
                      Penugasan Kategorial / Departemen *
                    </Label>
                  </div>
                  <Badge variant='outline' className='text-[10px] bg-background font-mono'>
                    {formData.kategorialIds.length} Dipilih
                  </Badge>
                </div>
                <p className='text-[11px] text-muted-foreground'>
                  Pilih satu atau lebih kategorial yang boleh diakses dan dikelola oleh akun staf ini.
                </p>

                {availableKategorials.length === 0 ? (
                  <p className='text-xs text-amber-600 italic'>Memuat daftar kategorial...</p>
                ) : (
                  <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1'>
                    {availableKategorials.map((kat) => {
                      const isSelected = formData.kategorialIds.includes(kat.id)
                      return (
                        <button
                          key={kat.id}
                          type='button'
                          onClick={() => handleToggleKategorial(kat.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all text-xs ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                              : 'bg-card text-foreground border-border hover:bg-accent/50'
                          }`}
                        >
                          <span className='truncate'>{kat.nama}</span>
                          {isSelected && <Check className='size-3.5 shrink-0 ms-1.5' />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Passwords */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1'>
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>Kata Sandi Awal *</Label>
                  <Button type='button' variant='ghost' size='sm' onClick={handleGenerateRandomPassword} className='h-5 text-[10px] text-primary gap-1 p-0'>
                    <Sparkles className='size-3' /> Buat Acak
                  </Button>
                </div>
                <Input
                  type='password'
                  placeholder='Minimal 6 karakter'
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  className='text-xs h-9 font-mono'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Konfirmasi Kata Sandi *</Label>
                <Input
                  type='password'
                  placeholder='Ulangi kata sandi'
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className='text-xs h-9 font-mono'
                  required
                />
              </div>
            </div>

            {/* Status Akun */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Status Akun Awal</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData((p) => ({ ...p, status: val as any }))}
              >
                <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='AKTIF' className='text-xs'>AKTIF — Akun langsung aktif dan dapat login</SelectItem>
                  <SelectItem value='NONAKTIF' className='text-xs'>NONAKTIF — Ditangguhkan sementara</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Security Notice */}
            <div className='p-3 bg-muted/40 rounded-lg text-[11px] text-muted-foreground flex items-start gap-2 border'>
              <ShieldCheck className='size-4 text-primary shrink-0 mt-0.5' />
              <span>
                Kata sandi akan di-hash menggunakan algoritma <strong>Bcrypt (Salt 10)</strong> dan tidak pernah tersimpan dalam bentuk teks biasa. Tindakan pendaftaran akan dicatat ke dalam <strong>Audit Log SHA-256</strong>.
              </span>
            </div>

            <div className='flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t'>
              <Button asChild type='button' variant='outline' size='sm' className='h-8 w-full sm:w-auto text-xs font-medium justify-center' disabled={submitting}>
                <Link href='/dashboard/users'>Batal</Link>
              </Button>
              <Button type='submit' size='sm' className='h-8 w-full sm:w-auto text-xs gap-1.5 font-semibold justify-center' disabled={submitting}>
                {submitting ? <Loader2 className='size-3.5 animate-spin' /> : <UserPlus className='size-3.5' />}
                {submitting ? 'Mendaftarkan...' : 'Simpan Akun Staf'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
