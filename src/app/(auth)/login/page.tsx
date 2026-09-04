'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Command, Lock, User, AlertCircle, ShieldCheck, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { loginAction } from '@/actions/auth'
import { getAppProfileAction } from '@/actions/app-profile'
import { AppProfileConfig, DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [lockoutError, setLockoutError] = useState<string | null>(null)
  const [profile, setProfile] = useState<AppProfileConfig>(DEFAULT_APP_PROFILE_CONFIG)

  useEffect(() => {
    let isMounted = true
    async function loadBranding() {
      const res = await getAppProfileAction()
      if (res.success && res.data && isMounted) {
        setProfile(res.data)
      }
    }
    loadBranding()
    return () => {
      isMounted = false
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.error('Username dan Password wajib diisi!')
      return
    }

    setLoading(true)
    setLockoutError(null)

    const res = await loginAction({
      username: username.trim(),
      password,
    })

    setLoading(false)

    if (res.success) {
      toast.success(`Selamat datang kembali, ${res.user?.nama}! (Role: ${res.user?.role})`)
      router.push('/dashboard')
    } else {
      if (res.isLockedOut) {
        setLockoutError(res.error || 'Akun sementara dikunci karena 5x percobaan gagal (15 Menit).')
        toast.error('AKUN TERKUNCI: Terlalu banyak percobaan gagal.')
      } else {
        toast.error(res.error || 'Gagal Login. Periksa kembali username dan password Anda.')
      }
    }
  }

  return (
    <div className='min-h-svh flex items-center justify-center p-4 bg-muted/40'>
      <Card className='w-full max-w-md shadow-lg border-primary/20 bg-card'>
        <CardHeader className='space-y-3 text-center'>
          <div
            className={`mx-auto flex items-center justify-center overflow-hidden transition-all ${
              profile.logoUrl
                ? 'size-16 bg-transparent border-0 shadow-none'
                : 'size-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs p-1.5'
            }`}
          >
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logoUrl}
                alt={profile.namaSingkat}
                className='size-full object-contain drop-shadow-xs'
              />
            ) : (
              <Building2 className='size-7 text-primary' />
            )}
          </div>
          <div>
            <CardTitle className='text-2xl font-bold tracking-tight'>
              {profile.namaSingkat} CMS
            </CardTitle>
            <CardDescription className='text-xs mt-1'>
              Portal Autentikasi Staf & Pelayanan Pastoral — {profile.namaResmi}
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className='space-y-4'>
            {lockoutError && (
              <div className='p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5'>
                <AlertCircle className='size-5 shrink-0 text-rose-600 dark:text-rose-400' />
                <span className='font-medium'>{lockoutError}</span>
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='username'>Username Staff</Label>
              <div className='relative'>
                <User className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                <Input
                  id='username'
                  placeholder='admin'
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className='pl-9 text-xs'
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Kata Sandi (Password)</Label>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                <Input
                  id='password'
                  type='password'
                  placeholder='••••••••'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='pl-9 text-xs'
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className='flex items-center justify-between text-xs text-muted-foreground'>
              <span className='flex items-center gap-1 text-[11px]'>
                <ShieldCheck className='size-3.5 text-emerald-600' /> Argon2id Encrypted
              </span>
              <span className='text-[11px] font-mono'>Lockout Protected</span>
            </div>
          </CardContent>

          <CardFooter className='flex flex-col space-y-3 pt-2'>
            <Button
              type='submit'
              className='w-full gap-2 text-xs font-semibold'
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className='size-4 animate-spin' /> Memverifikasi Akun...
                </>
              ) : (
                'Masuk ke Dashboard'
              )}
            </Button>
            <p className='text-[11px] text-center text-muted-foreground'>
              Gunakan akun staf terdaftar Anda. Hubungi Sekretariat jika lupa password.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
