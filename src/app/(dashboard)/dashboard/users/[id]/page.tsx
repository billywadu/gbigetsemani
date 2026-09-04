'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  User,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Lock,
  KeyRound,
  Edit,
  Trash2,
  Phone,
  Mail,
  UserCheck,
  UserX,
  History,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  MoreHorizontal,
  Sparkles,
  Hash,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  getUserByIdAction,
  updateUserAction,
  resetUserPasswordAction,
  toggleUserStatusAction,
  deleteUserAction,
  UserDTO,
  AuditActivityDTO,
} from '@/actions/users'
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

interface UserDetailPageProps {
  params: Promise<{ id: string }>
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const userId = resolvedParams.id

  const [user, setUser] = useState<UserDTO | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditActivityDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Dialog States
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [resetPwdDialogOpen, setResetPwdDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')

  const [availableKategorials, setAvailableKategorials] = useState<{ id: string; nama: string }[]>([])

  // Form States
  const [editForm, setEditForm] = useState({
    nama: '',
    email: '',
    noHp: '',
    role: 'SEKRETARIS' as StaffRole,
    kategorialIds: [] as string[],
  })

  const [resetPwdForm, setResetPwdForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  const loadUserData = async () => {
    setLoading(true)
    const [res, katRes] = await Promise.all([
      getUserByIdAction(userId),
      getKategorialListAction({ page: 1, pageSize: 100 }),
    ])
    setLoading(false)

    if (katRes.success && katRes.data?.items) {
      setAvailableKategorials(katRes.data.items.map((k: any) => ({ id: k.id, nama: k.nama })))
    }

    if (res.success && res.data) {
      setUser(res.data)
      setAuditLogs(res.auditLogs || [])
      setEditForm({
        nama: res.data.nama,
        email: res.data.email,
        noHp: res.data.noHp || '',
        role: res.data.role as StaffRole,
        kategorialIds: res.data.kategorialScopes?.map((s) => s.kategorialId) || [],
      })
    } else {
      toast.error(res.error || 'Gagal memuat detail pengguna.')
    }
  }

  useEffect(() => {
    loadUserData()
  }, [userId])

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$'
    let pwd = ''
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setResetPwdForm({ newPassword: pwd, confirmPassword: pwd })
    toast.info(`Kata sandi acak dihasilkan: ${pwd}`)
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.nama.trim() || !editForm.email.trim()) {
      toast.error('Nama dan email wajib diisi!')
      return
    }

    setActionLoading(true)
    const res = await updateUserAction({
      id: userId,
      nama: editForm.nama,
      email: editForm.email,
      noHp: editForm.noHp || null,
      role: editForm.role,
      kategorialIds: editForm.kategorialIds,
    })
    setActionLoading(false)

    if (res.success) {
      toast.success(res.message || 'Data staf berhasil diperbarui!')
      setEditDialogOpen(false)
      loadUserData()
    } else {
      toast.error(res.error || 'Gagal memperbarui pengguna.')
    }
  }

  // Handle Reset Password Submit
  const handleResetPwdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (resetPwdForm.newPassword.length < 6) {
      toast.error('Kata sandi baru minimal 6 karakter!')
      return
    }
    if (resetPwdForm.newPassword !== resetPwdForm.confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok!')
      return
    }

    setActionLoading(true)
    const res = await resetUserPasswordAction({
      userId,
      newPassword: resetPwdForm.newPassword,
      confirmPassword: resetPwdForm.confirmPassword,
    })
    setActionLoading(false)

    if (res.success) {
      toast.success(res.message || 'Kata sandi berhasil diatur ulang!')
      setResetPwdDialogOpen(false)
    } else {
      toast.error(res.error || 'Gagal mengatur ulang kata sandi.')
    }
  }

  // Handle Toggle Status Submit
  const handleToggleStatusSubmit = async () => {
    if (!user) return
    const newStatus = user.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF'

    setActionLoading(true)
    const res = await toggleUserStatusAction({
      id: userId,
      status: newStatus,
    })
    setActionLoading(false)

    if (res.success) {
      toast.success(res.message || 'Status akun berhasil diperbarui!')
      setStatusDialogOpen(false)
      loadUserData()
    } else {
      toast.error(res.error || 'Gagal mengubah status akun.')
    }
  }

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!deleteReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }

    setActionLoading(true)
    const res = await deleteUserAction({
      id: userId,
      reason: deleteReason.trim(),
    })
    setActionLoading(false)

    if (res.success) {
      toast.success(res.message || 'Pengguna berhasil dihapus!')
      router.push('/dashboard/users')
    } else {
      toast.error(res.error || 'Gagal menghapus pengguna.')
    }
  }

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge variant='outline' className='bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 text-xs font-mono'>SUPER ADMIN</Badge>
      case 'GEMBALA':
        return <Badge variant='outline' className='bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs font-mono'>GEMBALA</Badge>
      case 'SEKRETARIS':
        return <Badge variant='outline' className='bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-mono'>SEKRETARIS</Badge>
      case 'BENDAHARA':
        return (
          <Badge variant='outline' className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-mono'>
            BENDAHARA
          </Badge>
        )
      case 'SEKRETARIS_KATEGORIAL':
        return (
          <Badge variant='outline' className='bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 text-xs font-mono'>
            SEKRETARIS KATEGORIAL
          </Badge>
        )
      case 'BENDAHARA_KATEGORIAL':
        return (
          <Badge variant='outline' className='bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 text-xs font-mono'>
            BENDAHARA KATEGORIAL
          </Badge>
        )
      case 'USHER':
        return (
          <Badge variant='outline' className='bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-mono'>
            USHER / SCAN
          </Badge>
        )
      default:
        return <Badge variant='outline' className='text-xs font-mono'>{role}</Badge>
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'AKTIF':
        return (
          <Badge variant='outline' className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs gap-1 font-medium'>
            <span className='size-1.5 rounded-full bg-emerald-500' /> AKTIF
          </Badge>
        )
      case 'NONAKTIF':
        return (
          <Badge variant='outline' className='bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs gap-1 font-medium'>
            <span className='size-1.5 rounded-full bg-amber-500' /> NONAKTIF
          </Badge>
        )
      case 'SUSPENDED':
        return (
          <Badge variant='outline' className='bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs gap-1 font-medium'>
            <span className='size-1.5 rounded-full bg-rose-500' /> SUSPENDED
          </Badge>
        )
      default:
        return <Badge variant='outline' className='text-xs'>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className='p-8 flex items-center justify-center min-h-[400px] text-xs text-muted-foreground gap-2'>
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat detail profil pengguna...
      </div>
    )
  }

  if (!user) {
    return (
      <div className='p-8 text-center space-y-4 max-w-md mx-auto'>
        <ShieldAlert className='size-12 text-rose-500 mx-auto' />
        <h2 className='text-lg font-bold text-foreground'>Pengguna Tidak Ditemukan</h2>
        <p className='text-xs text-muted-foreground'>
          Data pengguna ini mungkin telah dihapus atau ID yang Anda cari tidak terdaftar.
        </p>
        <Button asChild size='sm' variant='outline' className='text-xs'>
          <Link href='/dashboard/users'>Kembali ke Daftar Pengguna</Link>
        </Button>
      </div>
    )
  }

  const initial = user.nama.charAt(0).toUpperCase()

  return (
    <div className='p-4 md:p-8 space-y-6 max-w-6xl mx-auto'>
      {/* Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex items-start gap-3'>
          <Button asChild variant='ghost' size='icon' className='size-8 mt-0.5 shrink-0'>
            <Link href='/dashboard/users'>
              <ArrowLeft className='size-4' />
            </Link>
          </Button>
          <div>
            <h1 className='text-lg sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2'>
              {user.nama}
            </h1>
            <span className='text-xs text-muted-foreground font-mono'>@{user.username} &bull; ID: {user.id}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className='grid grid-cols-2 sm:flex sm:flex-row items-center gap-2'>
          <Button variant='outline' size='sm' onClick={() => setEditDialogOpen(true)} className='h-8 text-xs gap-1.5 justify-center'>
            <Edit className='size-3.5' /> Edit Data
          </Button>
          <Button variant='outline' size='sm' onClick={() => { setResetPwdForm({ newPassword: '', confirmPassword: '' }); setResetPwdDialogOpen(true) }} className='h-8 text-xs gap-1.5 text-amber-600 hover:text-amber-700 justify-center'>
            <KeyRound className='size-3.5' /> Reset Sandi
          </Button>
          <Button variant='outline' size='sm' onClick={() => setStatusDialogOpen(true)} className='h-8 text-xs gap-1.5 justify-center'>
            {user.status === 'AKTIF' ? <UserX className='size-3.5 text-amber-600' /> : <UserCheck className='size-3.5 text-emerald-600' />}
            {user.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
          <Button variant='outline' size='sm' onClick={() => { setDeleteReason(''); setDeleteDialogOpen(true) }} className='h-8 text-xs gap-1.5 text-rose-600 hover:text-rose-700 justify-center'>
            <Trash2 className='size-3.5' /> Hapus
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left Column: User Profile Card */}
        <Card className='shadow-xs bg-card'>
          <CardHeader className='text-center pb-4 pt-6'>
            <Avatar className='size-20 mx-auto mb-3 shadow-inner'>
              <AvatarImage src={user.fotoUrl || undefined} alt={user.nama} />
              <AvatarFallback className='bg-primary/10 text-primary font-bold text-2xl'>
                {initial}
              </AvatarFallback>
            </Avatar>
            <CardTitle className='text-base font-bold'>{user.nama}</CardTitle>
            <CardDescription className='font-mono text-xs text-primary'>@{user.username}</CardDescription>
            <div className='flex items-center justify-center gap-2 pt-2'>
              {renderRoleBadge(user.role)}
              {renderStatusBadge(user.status)}
            </div>

            {user.kategorialScopes && user.kategorialScopes.length > 0 && (
              <div className='flex flex-wrap items-center justify-center gap-1.5 pt-2'>
                {user.kategorialScopes.map((s) => (
                  <Badge
                    key={s.id}
                    variant='outline'
                    className='bg-primary/5 text-primary border-primary/20 text-[11px] font-semibold flex items-center gap-1 py-0.5 px-2'
                  >
                    <Layers className='size-3' />
                    {s.namaKategorial}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent className='space-y-3 text-xs border-t pt-4'>
            <div>
              <span className='text-[10px] text-muted-foreground uppercase font-semibold block'>Alamat Email</span>
              <span className='font-medium text-foreground flex items-center gap-1.5 pt-0.5'>
                <Mail className='size-3.5 text-primary' /> {user.email || '-'}
              </span>
            </div>

            <div>
              <span className='text-[10px] text-muted-foreground uppercase font-semibold block'>Nomor Handphone / WA</span>
              <span className='font-medium text-foreground flex items-center gap-1.5 pt-0.5'>
                <Phone className='size-3.5 text-primary' /> {user.noHp || '-'}
              </span>
            </div>

            <div>
              <span className='text-[10px] text-muted-foreground uppercase font-semibold block'>Tanggal Terdaftar</span>
              <span className='font-medium text-foreground flex items-center gap-1.5 pt-0.5'>
                <Calendar className='size-3.5 text-primary' />
                {new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div>
              <span className='text-[10px] text-muted-foreground uppercase font-semibold block'>Aktivitas Login Terakhir</span>
              <span className='font-mono text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5'>
                <Clock className='size-3.5 text-primary' />
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah login'}
              </span>
            </div>

            {user.lastLoginIp && (
              <div>
                <span className='text-[10px] text-muted-foreground uppercase font-semibold block'>IP Address Terakhir</span>
                <span className='font-mono text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5'>
                  <Globe className='size-3.5 text-primary' /> {user.lastLoginIp}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: 20 Latest Audit Trail Activity */}
        <Card className='shadow-xs bg-card lg:col-span-2 overflow-hidden flex flex-col'>
          <CardHeader className='pb-3 border-b bg-muted/20 space-y-1'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3'>
              <CardTitle className='text-sm font-bold flex items-center gap-2 text-foreground'>
                <History className='size-4 text-primary shrink-0' />
                <span>Jejak Audit Aktivitas Staf (20 Terakhir)</span>
              </CardTitle>
              <Badge variant='outline' className='text-[10px] font-mono w-fit'>
                SHA-256 Chained
              </Badge>
            </div>
            <CardDescription className='text-xs'>
              Riwayat tindakan operasional dalam rantai audit anti-manipulasi.
            </CardDescription>
          </CardHeader>

          <CardContent className='p-0 flex-1 overflow-x-auto'>
            {auditLogs.length === 0 ? (
              <div className='text-center py-12 text-xs text-muted-foreground space-y-2'>
                <ShieldCheck className='size-8 mx-auto opacity-40' />
                <p>Belum ada riwayat aktivitas yang tercatat untuk staf ini.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/30 text-xs'>
                    <TableHead className='font-bold'>Aksi Sistem</TableHead>
                    <TableHead className='font-bold'>Entitas Target</TableHead>
                    <TableHead className='font-bold'>Waktu Eksekusi</TableHead>
                    <TableHead className='font-bold'>IP Perangkat</TableHead>
                    <TableHead className='font-bold text-right'>Hash Audit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} className='text-xs hover:bg-muted/40'>
                      <TableCell>
                        <Badge variant='outline' className='text-[10px] font-mono uppercase bg-primary/5 text-primary border-primary/20'>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-muted-foreground font-mono text-[11px]'>
                        {log.entity}
                      </TableCell>
                      <TableCell className='text-muted-foreground font-mono text-[11px] whitespace-nowrap'>
                        {new Date(log.timestamp).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className='text-muted-foreground font-mono text-[11px]'>
                        {log.ip}
                      </TableCell>
                      <TableCell className='text-right font-mono text-[10px] text-muted-foreground'>
                        {log.currentHash.substring(0, 10)}...
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL 1: Edit Data Staf */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Edit className='size-5 text-primary' /> Edit Data Pengguna
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Perbarui nama, email, dan peran staf. Peran dilindungi verifikasi Super Admin terakhir.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className='space-y-3.5 text-xs'>
            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>Nama Lengkap Staf *</Label>
              <Input
                value={editForm.nama}
                onChange={(e) => setEditForm((p) => ({ ...p, nama: e.target.value }))}
                className='text-xs h-9'
                required
              />
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>Email *</Label>
                <Input
                  type='email'
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-xs font-semibold'>Nomor Handphone</Label>
                <Input
                  value={editForm.noHp}
                  onChange={(e) => setEditForm((p) => ({ ...p, noHp: e.target.value }))}
                  className='text-xs h-9'
                />
              </div>
            </div>

            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>Peran & Otoritas (Role) *</Label>
              <Select
                value={editForm.role}
                onValueChange={(val) => setEditForm((p) => ({ ...p, role: val as StaffRole }))}
              >
                <SelectTrigger className='text-xs h-9'><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='SUPER_ADMIN' className='text-xs'>SUPER ADMIN — Akses Penuh Sistem</SelectItem>
                  <SelectItem value='GEMBALA' className='text-xs'>GEMBALA — Pastoral & Monitoring</SelectItem>
                  <SelectItem value='SEKRETARIS' className='text-xs'>SEKRETARIS PUSAT — Administrasi & Jemaat</SelectItem>
                  <SelectItem value='BENDAHARA' className='text-xs'>BENDAHARA PUSAT — Pembukuan Kas Umum</SelectItem>
                  <SelectItem value='SEKRETARIS_KATEGORIAL' className='text-xs'>SEKRETARIS KATEGORIAL — Khusus Departemen</SelectItem>
                  <SelectItem value='BENDAHARA_KATEGORIAL' className='text-xs'>BENDAHARA KATEGORIAL — Khusus Departemen</SelectItem>
                  <SelectItem value='USHER' className='text-xs'>USHER — Operator Scanner Presensi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(editForm.role === 'SEKRETARIS_KATEGORIAL' || editForm.role === 'BENDAHARA_KATEGORIAL') && (
              <div className='p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5 font-bold text-xs text-foreground'>
                    <Layers className='size-3.5 text-primary' /> Penugasan Kategorial *
                  </div>
                  <Badge variant='outline' className='text-[10px] bg-background font-mono'>
                    {editForm.kategorialIds.length} Dipilih
                  </Badge>
                </div>
                <p className='text-[11px] text-muted-foreground'>
                  Pilih kategorial yang boleh diakses dan dikelola oleh akun staf ini:
                </p>
                <div className='grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1'>
                  {availableKategorials.map((kat) => {
                    const isSelected = editForm.kategorialIds.includes(kat.id)
                    return (
                      <button
                        key={kat.id}
                        type='button'
                        onClick={() => {
                          setEditForm((prev) => ({
                            ...prev,
                            kategorialIds: isSelected
                              ? prev.kategorialIds.filter((id) => id !== kat.id)
                              : [...prev.kategorialIds, kat.id],
                          }))
                        }}
                        className={`flex items-center justify-between p-2 rounded border text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
                            : 'bg-card text-foreground border-border hover:bg-accent/50'
                        }`}
                      >
                        <span className='truncate'>{kat.nama}</span>
                        {isSelected && <span className='text-xs'>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <DialogFooter className='pt-2'>
              <Button type='button' variant='outline' size='sm' onClick={() => setEditDialogOpen(false)} disabled={actionLoading} className='text-xs'>
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={actionLoading} className='text-xs gap-1.5'>
                {actionLoading ? <Loader2 className='size-3.5 animate-spin' /> : <CheckCircle2 className='size-3.5' />}
                {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Reset Password */}
      <Dialog open={resetPwdDialogOpen} onOpenChange={setResetPwdDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <KeyRound className='size-5 text-amber-500' /> Reset Kata Sandi Pengguna
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tetapkan kata sandi baru untuk <strong className='text-foreground'>@{user.username}</strong>. Seluruh sesi login sebelumnya akan otomatis diakhiri.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPwdSubmit} className='space-y-3.5 text-xs'>
            <div className='space-y-1'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-semibold'>Kata Sandi Baru *</Label>
                <Button type='button' variant='ghost' size='sm' onClick={handleGenerateRandomPassword} className='h-5 text-[10px] text-primary gap-1 p-0'>
                  <Sparkles className='size-3' /> Buat Acak
                </Button>
              </div>
              <Input
                type='password'
                placeholder='Minimal 6 karakter'
                value={resetPwdForm.newPassword}
                onChange={(e) => setResetPwdForm((p) => ({ ...p, newPassword: e.target.value }))}
                className='text-xs h-9 font-mono'
                required
              />
            </div>

            <div className='space-y-1'>
              <Label className='text-xs font-semibold'>Konfirmasi Kata Sandi Baru *</Label>
              <Input
                type='password'
                placeholder='Ulangi kata sandi baru'
                value={resetPwdForm.confirmPassword}
                onChange={(e) => setResetPwdForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className='text-xs h-9 font-mono'
                required
              />
            </div>

            <DialogFooter className='pt-2'>
              <Button type='button' variant='outline' size='sm' onClick={() => setResetPwdDialogOpen(false)} disabled={actionLoading} className='text-xs'>
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={actionLoading} className='text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white'>
                {actionLoading ? <Loader2 className='size-3.5 animate-spin' /> : <KeyRound className='size-3.5' />}
                {actionLoading ? 'Mereset...' : 'Reset Kata Sandi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Toggle Status */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold flex items-center gap-2'>
              <AlertTriangle className='size-5 text-amber-500' />
              {user.status === 'AKTIF' ? 'Nonaktifkan Akun Pengguna?' : 'Aktifkan Kembali Akun?'}
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              {user.status === 'AKTIF'
                ? `Akun @${user.username} (${user.nama}) akan dinonaktifkan dan sesi login saat ini akan langsung diakhiri.`
                : `Akun @${user.username} (${user.nama}) akan diaktifkan kembali dan dapat melakukan login ke CMS.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' size='sm' onClick={() => setStatusDialogOpen(false)} disabled={actionLoading} className='text-xs'>
              Batal
            </Button>
            <Button size='sm' onClick={handleToggleStatusSubmit} disabled={actionLoading} className='text-xs gap-1.5'>
              {actionLoading ? <Loader2 className='size-3.5 animate-spin' /> : <CheckCircle2 className='size-3.5' />}
              {actionLoading ? 'Memproses...' : 'Ya, Ubah Status'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL 4: Delete User */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Hapus Akun Staf (Soft Delete)?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground'>
                <div>
                  Akun <strong className='text-foreground'>@{user.username}</strong> ({user.nama}) akan dihapus secara soft delete. Data jejak audit historis akan tetap tersimpan aman.
                </div>
                <div className='space-y-1 pt-2'>
                  <Label className='text-xs font-semibold text-foreground'>Alasan Penghapusan Wajib *</Label>
                  <Textarea
                    placeholder='Tuliskan alasan resmi penghapusan akun staf ini...'
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className='text-xs min-h-[60px]'
                    required
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' size='sm' onClick={() => setDeleteDialogOpen(false)} disabled={actionLoading} className='text-xs'>
              Batal
            </Button>
            <Button
              size='sm'
              variant='destructive'
              onClick={handleDeleteSubmit}
              disabled={actionLoading || !deleteReason.trim()}
              className='text-xs gap-1.5'
            >
              {actionLoading ? <Loader2 className='size-3.5 animate-spin' /> : <Trash2 className='size-3.5' />}
              {actionLoading ? 'Menghapus...' : 'Hapus Pengguna'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
