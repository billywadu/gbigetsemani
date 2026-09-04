'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FilterX,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
  Edit,
  Eye,
  Lock,
  KeyRound,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  UserCheck,
  UserX,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Phone,
  Mail,
  User,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  getUserListAction,
  createUserAction,
  updateUserAction,
  resetUserPasswordAction,
  toggleUserStatusAction,
  deleteUserAction,
  restoreUserAction,
  hardDeleteUserAction,
  UserDTO,
  UserStatsSummary,
} from '@/actions/users'
import { getKategorialListAction } from '@/actions/kategorial'
import { Role } from '@/config/navigation'

type StaffRole =
  | 'SUPER_ADMIN'
  | 'GEMBALA'
  | 'SEKRETARIS'
  | 'BENDAHARA'
  | 'SEKRETARIS_KATEGORIAL'
  | 'BENDAHARA_KATEGORIAL'
  | 'USHER'

export default function UserManagementPage() {
  const [availableKategorials, setAvailableKategorials] = useState<{ id: string; nama: string }[]>([])
  // Data State
  const [users, setUsers] = useState<UserDTO[]>([])
  const [stats, setStats] = useState<UserStatsSummary>({
    totalStaff: 0,
    totalActive: 0,
    totalInactive: 0,
    roleBreakdown: {
      superAdmin: 0,
      gembala: 0,
      sekretaris: 0,
      bendahara: 0,
      sekretarisKategorial: 0,
      bendaharaKategorial: 0,
      usher: 0,
    },
  })
  const [loading, setLoading] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Filter & Pagination State
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [statusHapusFilter, setStatusHapusFilter] = useState<'ACTIVE' | 'DELETED' | 'ALL'>('ACTIVE')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
    username: true,
    email: true,
    role: true,
    status: true,
    lastLogin: true,
    actions: true,
  })

  // Sorting state
  const [sortField, setSortField] = useState<'nama' | 'username' | 'email' | 'role' | 'status' | 'lastLogin' | null>('nama')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const sortedUsers = React.useMemo(() => {
    if (!sortField) return users
    return [...users].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''
      if (sortField === 'nama') {
        aVal = a.nama || ''
        bVal = b.nama || ''
      } else if (sortField === 'username') {
        aVal = a.username || ''
        bVal = b.username || ''
      } else if (sortField === 'email') {
        aVal = a.email || ''
        bVal = b.email || ''
      } else if (sortField === 'role') {
        aVal = a.role || ''
        bVal = b.role || ''
      } else if (sortField === 'status') {
        aVal = a.status || ''
        bVal = b.status || ''
      } else if (sortField === 'lastLogin') {
        aVal = new Date(a.lastLoginAt || a.createdAt || 0).getTime()
        bVal = new Date(b.lastLoginAt || b.createdAt || 0).getTime()
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [users, sortField, sortOrder])

  // Modal Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [resetPwdDialogOpen, setResetPwdDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  // Selected User for Actions
  const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Form State: Create User
  const [createForm, setCreateForm] = useState({
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

  // Form State: Edit User
  const [editForm, setEditForm] = useState({
    id: '',
    nama: '',
    email: '',
    noHp: '',
    role: 'SEKRETARIS' as StaffRole,
    kategorialIds: [] as string[],
  })

  useEffect(() => {
    getKategorialListAction({ page: 1, pageSize: 100 }).then((res) => {
      if (res.success && res.data?.items) {
        setAvailableKategorials(res.data.items.map((k: any) => ({ id: k.id, nama: k.nama })))
      }
    })
  }, [])

  // Form State: Reset Password
  const [resetPwdForm, setResetPwdForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  // Fetch Users from Server Action
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getUserListAction({
        search: search.trim() ? search.trim() : '',
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        statusHapus: statusHapusFilter,
        page,
        pageSize,
      })

      if (res.success && res.data) {
        setUsers(res.data)
        setTotalRecords(res.total)
        setTotalPages(res.totalPages || 1)
        if (res.stats) {
          setStats(res.stats)
        }
      } else {
        toast.error(res.error || 'Gagal mengambil data pengguna.')
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat memuat data pengguna.')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter, statusHapusFilter, page, pageSize])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Reset Filters
  const handleResetFilter = () => {
    setSearch('')
    setRoleFilter('ALL')
    setStatusFilter('ALL')
    setStatusHapusFilter('ACTIVE')
    setPage(1)
  }

  // Generate Random Password Helper
  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$'
    let pwd = ''
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setResetPwdForm({ newPassword: pwd, confirmPassword: pwd })
    toast.info(`Kata sandi acak dihasilkan: ${pwd}`)
  }

  // Handle Create User Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.nama.trim()) {
      toast.error('Nama lengkap wajib diisi!')
      return
    }
    if (!createForm.username.trim()) {
      toast.error('Username wajib diisi!')
      return
    }
    if (!createForm.email.trim()) {
      toast.error('Email resmi wajib diisi!')
      return
    }
    if (createForm.password.length < 6) {
      toast.error('Kata sandi minimal 6 karakter!')
      return
    }
    if (createForm.password !== createForm.confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok!')
      return
    }

    setActionLoading(true)
    const res = await createUserAction({
      nama: createForm.nama,
      username: createForm.username,
      email: createForm.email,
      noHp: createForm.noHp || null,
      role: createForm.role,
      kategorialIds: createForm.kategorialIds,
      password: createForm.password,
      confirmPassword: createForm.confirmPassword,
      status: createForm.status,
    })
    setActionLoading(false)

    if (res.success) {
      toast.success(res.message || 'Akun pengguna berhasil didaftarkan!')
      setCreateDialogOpen(false)
      setCreateForm({
        nama: '',
        username: '',
        email: '',
        noHp: '',
        role: 'SEKRETARIS',
        kategorialIds: [],
        password: '',
        confirmPassword: '',
        status: 'AKTIF',
      })
      fetchUsers()
    } else {
      toast.error(res.error || 'Gagal mendaftarkan pengguna.')
    }
  }

  // Handle Edit User Open
  const handleOpenEdit = (u: UserDTO) => {
    setSelectedUser(u)
    setEditForm({
      id: u.id,
      nama: u.nama,
      email: u.email,
      noHp: u.noHp || '',
      role: u.role as StaffRole,
      kategorialIds: u.kategorialScopes?.map((s) => s.kategorialId) || [],
    })
    setEditDialogOpen(true)
  }

  // Handle Edit User Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.nama.trim() || !editForm.email.trim()) {
      toast.error('Nama dan email wajib diisi!')
      return
    }

    setActionLoading(true)
    const res = await updateUserAction({
      id: editForm.id,
      nama: editForm.nama,
      email: editForm.email,
      noHp: editForm.noHp || null,
      role: editForm.role,
      kategorialIds: editForm.kategorialIds,
    })
    setActionLoading(false)

    if (res.success) {
      toast.success(res.message || 'Data akun pengguna berhasil diperbarui!')
      setEditDialogOpen(false)
      fetchUsers()
    } else {
      toast.error(res.error || 'Gagal memperbarui pengguna.')
    }
  }

  // Handle Reset Password Open
  const handleOpenResetPwd = (u: UserDTO) => {
    setSelectedUser(u)
    setResetPwdForm({ newPassword: '', confirmPassword: '' })
    setResetPwdDialogOpen(true)
  }

  // Handle Reset Password Submit
  const handleResetPwdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
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
      userId: selectedUser.id,
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

  // Handle Toggle Status Open
  const handleOpenToggleStatus = (u: UserDTO) => {
    setSelectedUser(u)
    setStatusDialogOpen(true)
  }

  // Handle Toggle Status Submit
  const handleToggleStatusSubmit = async () => {
    if (!selectedUser) return
    const newStatus = selectedUser.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF'

    setActionLoading(true)
    const res = await toggleUserStatusAction({
      id: selectedUser.id,
      status: newStatus,
    })
    setActionLoading(false)

    if (res.success) {
      toast.success(res.message || 'Status akun berhasil diperbarui!')
      setStatusDialogOpen(false)
      fetchUsers()
    } else {
      toast.error(res.error || 'Gagal mengubah status akun.')
    }
  }

  // Handle Delete Open
  const handleOpenDelete = (u: UserDTO) => {
    setSelectedUser(u)
    setDeleteReason('')
    setDeleteDialogOpen(true)
  }

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!selectedUser) return
    if (!deleteReason.trim()) {
      toast.error('Alasan penghapusan wajib diisi!')
      return
    }

    setActionLoading(true)
    const res = await deleteUserAction({
      id: selectedUser.id,
      reason: deleteReason.trim(),
    })
    setActionLoading(false)

    if (res.success) {
      toast.success(res.message || 'Akun pengguna berhasil dihapus!')
      setDeleteDialogOpen(false)
      fetchUsers()
    } else {
      toast.error(res.error || 'Gagal menghapus pengguna.')
    }
  }

  // Handle Restore Open
  const handleOpenRestore = (u: UserDTO) => {
    setSelectedUser(u)
    setRestoreDialogOpen(true)
  }

  // Handle Restore Submit
  const handleRestoreSubmit = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    const res = await restoreUserAction({ id: selectedUser.id })
    setActionLoading(false)

    if (res.success) {
      toast.success(res.message || 'Akun pengguna berhasil dipulihkan!')
      setRestoreDialogOpen(false)
      fetchUsers()
    } else {
      toast.error(res.error || 'Gagal memulihkan pengguna.')
    }
  }

  // Handle Hard Delete Open
  const handleOpenHardDelete = (u: UserDTO) => {
    setSelectedUser(u)
    setHardDeleteReason('')
    setHardDeleteDialogOpen(true)
  }

  // Handle Hard Delete Submit
  const handleHardDeleteSubmit = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    const res = await hardDeleteUserAction({
      id: selectedUser.id,
      reason: hardDeleteReason.trim() || undefined,
    })
    setActionLoading(false)

    if (res.success) {
      toast.success(res.message || 'Akun pengguna berhasil dihapus secara permanen dari database!')
      setHardDeleteDialogOpen(false)
      fetchUsers()
    } else {
      toast.error(res.error || 'Gagal menghapus pengguna secara permanen.')
    }
  }

  // Role Badge Formatter
  const renderRoleBadge = (role: Role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <Badge variant='outline' className='bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 text-[10px] font-mono'>
            SUPER ADMIN
          </Badge>
        )
      case 'GEMBALA':
        return (
          <Badge variant='outline' className='bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-mono'>
            GEMBALA
          </Badge>
        )
      case 'SEKRETARIS':
        return (
          <Badge variant='outline' className='bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-mono'>
            SEKRETARIS
          </Badge>
        )
      case 'BENDAHARA':
        return (
          <Badge variant='outline' className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono'>
            BENDAHARA
          </Badge>
        )
      case 'SEKRETARIS_KATEGORIAL':
        return (
          <Badge variant='outline' className='bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] font-mono'>
            SEKRETARIS KATEGORIAL
          </Badge>
        )
      case 'BENDAHARA_KATEGORIAL':
        return (
          <Badge variant='outline' className='bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 text-[10px] font-mono'>
            BENDAHARA KATEGORIAL
          </Badge>
        )
      case 'USHER':
        return (
          <Badge variant='outline' className='bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-mono'>
            USHER / SCAN
          </Badge>
        )
      default:
        return <Badge variant='outline' className='text-[10px] font-mono'>{role}</Badge>
    }
  }

  // Status Badge Formatter
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'AKTIF':
        return (
          <Badge variant='outline' className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-medium'>
            <span className='size-1.5 rounded-full bg-emerald-500' /> AKTIF
          </Badge>
        )
      case 'NONAKTIF':
        return (
          <Badge variant='outline' className='bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] gap-1 font-medium'>
            <span className='size-1.5 rounded-full bg-amber-500' /> NONAKTIF
          </Badge>
        )
      case 'SUSPENDED':
        return (
          <Badge variant='outline' className='bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] gap-1 font-medium'>
            <span className='size-1.5 rounded-full bg-rose-500' /> SUSPENDED
          </Badge>
        )
      default:
        return <Badge variant='outline' className='text-[10px]'>{status}</Badge>
    }
  }

  const renderColumnHeader = (
    title: string,
    columnKey?: keyof typeof visibleColumns,
    field?: 'nama' | 'username' | 'email' | 'role' | 'status' | 'lastLogin'
  ) => {
    const isSorted = field && sortField === field

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='sm' className='-ms-3 h-8 data-[state=open]:bg-accent font-bold text-xs text-foreground flex items-center gap-1.5'>
            <span>{title}</span>
            {isSorted ? (
              sortOrder === 'asc' ? <ArrowUp className='size-3.5' /> : <ArrowDown className='size-3.5' />
            ) : (
              <ArrowUpDown className='size-3.5 opacity-50' />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-44'>
          {field && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setSortField(field)
                  setSortOrder('asc')
                }}
                className='text-xs gap-2'
              >
                <ArrowUp className='size-3.5 text-muted-foreground' /> Menaik (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSortField(field)
                  setSortOrder('desc')
                }}
                className='text-xs gap-2'
              >
                <ArrowDown className='size-3.5 text-muted-foreground' /> Menurun (Z-A)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {columnKey && (
            <DropdownMenuItem onClick={() => setVisibleColumns((p) => ({ ...p, [columnKey]: false }))} className='text-xs gap-2'>
              <EyeOff className='size-3.5 text-muted-foreground' /> Sembunyikan Kolom
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className='p-4 md:p-8 space-y-6 max-w-7xl mx-auto'>
      {/* Header Section */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div className='flex items-start sm:items-center gap-3'>
          <div className='p-2 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5 sm:mt-0'>
            <ShieldCheck className='size-5' />
          </div>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Pengguna & Akses</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Kelola akun staf gereja dan hak akses peran.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button variant='outline' size='sm' onClick={fetchUsers} disabled={loading} className='flex-1 sm:flex-initial h-9 sm:h-8 gap-1.5 text-xs'>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size='sm' onClick={() => setCreateDialogOpen(true)} className='flex-1 sm:flex-initial h-9 sm:h-8 gap-1.5 text-xs shadow-xs'>
            <UserPlus className='size-3.5' />
            Tambah Pengguna
          </Button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='shadow-xs bg-card'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>Total Akun Staf</CardTitle>
            <Users className='size-4 text-primary' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-foreground'>{stats.totalStaff}</div>
            <p className='text-[11px] text-muted-foreground mt-1'>Akun terdaftar dalam database</p>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>Pengguna Aktif</CardTitle>
            <UserCheck className='size-4 text-emerald-600 dark:text-emerald-400' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>{stats.totalActive}</div>
            <p className='text-[11px] text-muted-foreground mt-1'>Dapat mengakses sistem CMS</p>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>Nonaktif / Suspended</CardTitle>
            <UserX className='size-4 text-amber-600 dark:text-amber-400' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-amber-600 dark:text-amber-400'>{stats.totalInactive}</div>
            <p className='text-[11px] text-muted-foreground mt-1'>Akses login dinonaktifkan</p>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>Distribusi Peran</CardTitle>
            <Lock className='size-4 text-purple-600 dark:text-purple-400' />
          </CardHeader>
          <CardContent>
            <div className='flex flex-wrap gap-1 pt-1'>
              <span className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted'>SA: {stats.roleBreakdown.superAdmin}</span>
              <span className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted'>G: {stats.roleBreakdown.gembala}</span>
              <span className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted'>S: {stats.roleBreakdown.sekretaris}</span>
              <span className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted'>B: {stats.roleBreakdown.bendahara}</span>
              <span className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted'>U: {stats.roleBreakdown.usher}</span>
            </div>
            <p className='text-[11px] text-muted-foreground mt-1'>5 peran hierarki PBAC</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Search, Filters, Column Visibility */}
      <Card className='shadow-xs bg-card'>
        <CardContent className='p-4 space-y-3'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
            {/* Search Input */}
            <div className='relative flex-1 max-w-sm'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
              <Input
                placeholder='Cari nama, email, username...'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className='h-8 text-xs ps-8'
              />
            </div>

            {/* Filters */}
            <div className='flex flex-wrap items-center gap-2'>
              <div className='grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 w-full sm:w-auto'>
                {/* Role Filter */}
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                  <SelectTrigger className='h-8 text-xs w-full sm:w-36 font-medium'>
                    <SelectValue placeholder='Semua Peran' />
                  </SelectTrigger>
                  <SelectContent className='text-xs'>
                    <SelectItem value='ALL' className='text-xs'>Semua Peran</SelectItem>
                    <SelectItem value='SUPER_ADMIN' className='text-xs'>Super Admin</SelectItem>
                    <SelectItem value='GEMBALA' className='text-xs'>Gembala</SelectItem>
                    <SelectItem value='SEKRETARIS' className='text-xs'>Sekretaris</SelectItem>
                    <SelectItem value='BENDAHARA' className='text-xs'>Bendahara</SelectItem>
                    <SelectItem value='USHER' className='text-xs'>Usher / Presensi</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className='h-8 text-xs w-full sm:w-32 font-medium'>
                    <SelectValue placeholder='Semua Status' />
                  </SelectTrigger>
                  <SelectContent className='text-xs'>
                    <SelectItem value='ALL' className='text-xs'>Semua Status</SelectItem>
                    <SelectItem value='ACTIVE' className='text-xs'>Aktif</SelectItem>
                    <SelectItem value='INACTIVE' className='text-xs'>Nonaktif</SelectItem>
                    <SelectItem value='SUSPENDED' className='text-xs'>Suspended</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Hapus Filter */}
                <Select value={statusHapusFilter} onValueChange={(v: 'ACTIVE' | 'DELETED' | 'ALL') => { setStatusHapusFilter(v); setPage(1); }}>
                  <SelectTrigger className='h-8 text-xs w-full sm:w-32 font-medium'>
                    <SelectValue placeholder='Status Data' />
                  </SelectTrigger>
                  <SelectContent className='text-xs'>
                    <SelectItem value='ACTIVE' className='text-xs'>
                      <span className='flex items-center gap-1.5'>
                        <CheckCircle2 className='size-3.5 text-emerald-600' />
                        <span>Data Aktif</span>
                      </span>
                    </SelectItem>
                    <SelectItem value='DELETED' className='text-xs'>
                      <span className='flex items-center gap-1.5'>
                        <Trash2 className='size-3.5 text-rose-500' />
                        <span>Terhapus</span>
                      </span>
                    </SelectItem>
                    <SelectItem value='ALL' className='text-xs'>
                      <span className='flex items-center gap-1.5'>
                        <Layers className='size-3.5 text-muted-foreground' />
                        <span>Semua Data</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(search || roleFilter !== 'ALL' || statusFilter !== 'ALL' || statusHapusFilter !== 'ACTIVE') && (
                <Button variant='ghost' size='sm' onClick={handleResetFilter} className='h-8 text-xs gap-1 text-muted-foreground w-full sm:w-auto'>
                  <FilterX className='size-3.5' /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DataTable Section */}
      <Card className='shadow-xs bg-card overflow-hidden'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/30 text-xs'>
                <TableHead>{renderColumnHeader('Pengguna & Nama Lengkap', undefined, 'nama')}</TableHead>
                {visibleColumns.username && <TableHead>{renderColumnHeader('Username', 'username', 'username')}</TableHead>}
                {visibleColumns.email && <TableHead>{renderColumnHeader('Email', 'email', 'email')}</TableHead>}
                {visibleColumns.role && <TableHead>{renderColumnHeader('Peran (Role)', 'role', 'role')}</TableHead>}
                {visibleColumns.status && <TableHead>{renderColumnHeader('Status', 'status', 'status')}</TableHead>}
                {visibleColumns.lastLogin && <TableHead>{renderColumnHeader('Terakhir Login', 'lastLogin', 'lastLogin')}</TableHead>}
                <TableHead className='text-right font-bold'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center'>
                    <div className='flex items-center justify-center gap-2 text-xs text-muted-foreground'>
                      <Loader2 className='size-4 animate-spin text-primary' /> Memuat data pengguna...
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center'>
                    <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground py-4'>
                      <Users className='size-8 opacity-40' />
                      <div className='font-medium text-xs text-foreground'>Tidak ada akun pengguna yang cocok</div>
                      <p className='text-[11px] text-muted-foreground'>Coba sesuaikan kata kunci pencarian atau filter status.</p>
                      <Button size='sm' variant='outline' onClick={() => setCreateDialogOpen(true)} className='mt-2 text-xs gap-1.5'>
                        <UserPlus className='size-3.5' /> Tambah Pengguna Baru
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((u) => {
                  const initial = u.nama.charAt(0).toUpperCase()
                  const isDeleted = !!u.deletedAt
                  return (
                    <TableRow key={u.id} className={`text-xs transition-colors ${isDeleted ? 'bg-rose-500/5 hover:bg-rose-500/10 opacity-80' : 'hover:bg-muted/40'}`}>
                      {/* Avatar & Nama */}
                      <TableCell className='py-3'>
                        <div className='flex items-center gap-2.5'>
                          <Avatar className='size-8'>
                            <AvatarImage src={u.fotoUrl || undefined} alt={u.nama} />
                            <AvatarFallback className={`font-bold text-xs ${isDeleted ? 'bg-rose-500/10 text-rose-600' : 'bg-primary/10 text-primary'}`}>
                              {initial}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link href={`/dashboard/users/${u.id}`} className='font-semibold text-foreground hover:underline hover:text-primary block'>
                              {u.nama}
                            </Link>
                            {u.noHp && (
                              <span className='text-[10px] text-muted-foreground flex items-center gap-1 font-mono'>
                                <Phone className='size-2.5' /> {u.noHp}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Username */}
                      {visibleColumns.username && (
                        <TableCell className='font-mono text-muted-foreground text-xs'>
                          @{u.username}
                        </TableCell>
                      )}

                      {/* Email */}
                      {visibleColumns.email && (
                        <TableCell className='text-muted-foreground text-xs'>
                          {u.email || '-'}
                        </TableCell>
                      )}

                      {/* Role */}
                      {visibleColumns.role && (
                        <TableCell>
                          <div className='flex flex-col items-start gap-1'>
                            {renderRoleBadge(u.role)}
                            {u.kategorialScopes && u.kategorialScopes.length > 0 && (
                              <div className='flex flex-wrap gap-1'>
                                {u.kategorialScopes.map((s) => (
                                  <Badge key={s.id} variant='secondary' className='text-[9px] px-1.5 py-0 h-4 bg-muted font-normal text-muted-foreground'>
                                    <Layers className='size-2.5 me-0.5' /> {s.namaKategorial}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <TableCell>
                          {isDeleted ? (
                            <Badge variant='destructive' className='text-[10px] gap-1 font-mono'>
                              <Trash2 className='size-3' /> Terhapus
                            </Badge>
                          ) : (
                            renderStatusBadge(u.status)
                          )}
                        </TableCell>
                      )}

                      {/* Last Login */}
                      {visibleColumns.lastLogin && (
                        <TableCell className='text-[11px] text-muted-foreground font-mono'>
                          {u.lastLoginAt ? (
                            new Date(u.lastLoginAt).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          ) : (
                            <span className='italic opacity-60'>Belum pernah</span>
                          )}
                        </TableCell>
                      )}

                      {/* Action Menu */}
                      <TableCell className='text-right'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='icon' className='size-8'>
                              <MoreHorizontal className='size-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-48 text-xs'>
                            <DropdownMenuLabel className='text-[11px] text-muted-foreground'>Opsi Akun</DropdownMenuLabel>
                            <DropdownMenuItem asChild className='text-xs gap-2'>
                              <Link href={`/dashboard/users/${u.id}`}>
                                <Eye className='size-3.5' /> Lihat Profil & Audit
                              </Link>
                            </DropdownMenuItem>

                            {isDeleted ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenRestore(u)} className='text-xs gap-2 text-emerald-600 focus:text-emerald-600'>
                                  <RotateCcw className='size-3.5' /> Pulihkan Akun
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenHardDelete(u)} className='text-xs gap-2 text-rose-600 focus:text-rose-600'>
                                  <Trash2 className='size-3.5' /> Hapus Permanen
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => handleOpenEdit(u)} className='text-xs gap-2'>
                                  <Edit className='size-3.5' /> Edit Data Staf
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenResetPwd(u)} className='text-xs gap-2'>
                                  <KeyRound className='size-3.5 text-amber-500' /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenToggleStatus(u)} className='text-xs gap-2'>
                                  {u.status === 'AKTIF' ? (
                                    <>
                                      <UserX className='size-3.5 text-amber-600' />
                                      <span>Nonaktifkan Akun</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className='size-3.5 text-emerald-600' />
                                      <span>Aktifkan Akun</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenDelete(u)} className='text-xs gap-2 text-rose-600 focus:text-rose-600'>
                                  <Trash2 className='size-3.5' /> Hapus Akun (Soft Delete)
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className='p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <span>Menampilkan</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
              <SelectTrigger className='w-16 h-8 text-xs px-2'><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value='10' className='text-xs'>10</SelectItem>
                <SelectItem value='25' className='text-xs'>25</SelectItem>
                <SelectItem value='50' className='text-xs'>50</SelectItem>
              </SelectContent>
            </Select>
            <span className='whitespace-nowrap'>dari <strong>{totalRecords}</strong> pengguna</span>
          </div>

          <div className='flex items-center gap-1.5'>
            <Button variant='outline' size='icon' className='size-8' onClick={() => setPage(1)} disabled={page <= 1 || loading}>
              <ChevronsLeft className='size-4' />
            </Button>
            <Button variant='outline' size='icon' className='size-8' onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
              <ChevronLeft className='size-4' />
            </Button>
            <span className='px-2 font-mono text-[11px] font-semibold text-foreground whitespace-nowrap'>
              Hal. {page} / {totalPages}
            </span>
            <Button variant='outline' size='icon' className='size-8' onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
              <ChevronRight className='size-4' />
            </Button>
            <Button variant='outline' size='icon' className='size-8' onClick={() => setPage(totalPages)} disabled={page >= totalPages || loading}>
              <ChevronsRight className='size-4' />
            </Button>
          </div>
        </div>
      </Card>

      {/* DIALOG 1: Tambah Pengguna Cepat */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className='sm:max-w-xl w-full max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <UserPlus className='size-5 text-primary' /> Tambah Pengguna Baru
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Daftarkan akun staf baru dengan peran hierarkis PBAC dan kata sandi terenkripsi Bcrypt.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className='space-y-4 text-xs pt-1'>
            {/* Nama Lengkap */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Nama Lengkap Staf *</Label>
              <Input
                placeholder='Contoh: David Jonathan'
                value={createForm.nama}
                onChange={(e) => setCreateForm((p) => ({ ...p, nama: e.target.value }))}
                className='text-xs h-9'
                required
              />
            </div>

            {/* Username & Email */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
              <div className='space-y-1.5 min-w-0'>
                <Label className='text-xs font-semibold'>Username (Login ID) *</Label>
                <Input
                  placeholder='contoh: david'
                  value={createForm.username}
                  onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value.toLowerCase() }))}
                  className='text-xs h-9 font-mono'
                  required
                />
              </div>

              <div className='space-y-1.5 min-w-0'>
                <Label className='text-xs font-semibold'>Alamat Email Resmi *</Label>
                <Input
                  type='email'
                  placeholder='user@gereja.org'
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  className='text-xs h-9'
                  required
                />
              </div>
            </div>

            {/* No HP & Role */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
              <div className='space-y-1.5 min-w-0'>
                <Label className='text-xs font-semibold'>Nomor Handphone / WhatsApp</Label>
                <Input
                  placeholder='081234567890'
                  value={createForm.noHp}
                  onChange={(e) => setCreateForm((p) => ({ ...p, noHp: e.target.value }))}
                  className='text-xs h-9'
                />
              </div>

              <div className='space-y-1.5 min-w-0'>
                <Label className='text-xs font-semibold'>Peran & Hak Akses (Role) *</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(val) => setCreateForm((p) => ({ ...p, role: val as StaffRole }))}
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

            {/* Department Assignment Box (Visible when role is scoped) */}
            {(createForm.role === 'SEKRETARIS_KATEGORIAL' || createForm.role === 'BENDAHARA_KATEGORIAL') && (
              <div className='p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5 font-bold text-xs text-foreground'>
                    <Layers className='size-3.5 text-primary' /> Penugasan Kategorial / Departemen *
                  </div>
                  <Badge variant='outline' className='text-[10px] bg-background font-mono'>
                    {createForm.kategorialIds.length} Dipilih
                  </Badge>
                </div>
                <p className='text-[11px] text-muted-foreground'>
                  Pilih kategorial yang boleh diakses dan dikelola oleh akun staf ini:
                </p>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1'>
                  {availableKategorials.map((kat) => {
                    const isSelected = createForm.kategorialIds.includes(kat.id)
                    return (
                      <button
                        key={kat.id}
                        type='button'
                        onClick={() => {
                          setCreateForm((prev) => ({
                            ...prev,
                            kategorialIds: isSelected
                              ? prev.kategorialIds.filter((id) => id !== kat.id)
                              : [...prev.kategorialIds, kat.id],
                          }))
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-2xs'
                            : 'bg-card text-foreground border-border hover:bg-accent/50'
                        }`}
                      >
                        <span className='truncate'>{kat.nama}</span>
                        {isSelected && <span className='text-xs font-bold'>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Passwords */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
              <div className='space-y-1.5 min-w-0'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>Kata Sandi Awal *</Label>
                  <Button type='button' variant='ghost' size='sm' onClick={handleGenerateRandomPassword} className='h-4 text-[10px] text-primary gap-1 p-0'>
                    <Sparkles className='size-2.5' /> Acak
                  </Button>
                </div>
                <Input
                  type='password'
                  placeholder='Min. 6 karakter'
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  className='text-xs h-9 font-mono'
                  required
                />
              </div>

              <div className='space-y-1.5 min-w-0'>
                <Label className='text-xs font-semibold'>Konfirmasi Sandi *</Label>
                <Input
                  type='password'
                  placeholder='Ulangi kata sandi'
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className='text-xs h-9 font-mono'
                  required
                />
              </div>
            </div>

            {/* Status Akun */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Status Akun Awal</Label>
              <Select
                value={createForm.status}
                onValueChange={(val) => setCreateForm((p) => ({ ...p, status: val as any }))}
              >
                <SelectTrigger className='text-xs h-9 w-full min-w-0'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='AKTIF' className='text-xs'>AKTIF (Bisa langsung login)</SelectItem>
                  <SelectItem value='NONAKTIF' className='text-xs'>NONAKTIF (Ditangguhkan sementara)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className='pt-3 gap-2 sm:gap-0'>
              <Button type='button' variant='outline' size='sm' onClick={() => setCreateDialogOpen(false)} disabled={actionLoading} className='text-xs'>
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={actionLoading} className='text-xs gap-1.5 font-semibold'>
                {actionLoading ? <Loader2 className='size-3.5 animate-spin' /> : <UserPlus className='size-3.5' />}
                {actionLoading ? 'Mendaftarkan...' : 'Daftarkan Pengguna'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Edit Data Staf */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className='sm:max-w-xl w-full max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Edit className='size-5 text-primary' /> Edit Akun Pengguna
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Perbarui profil dan peran staf. Perubahan peran dilindungi kunci Super Admin terakhir.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className='space-y-4 text-xs pt-1'>
            {/* Nama Lengkap */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Nama Lengkap Staf *</Label>
              <Input
                value={editForm.nama}
                onChange={(e) => setEditForm((p) => ({ ...p, nama: e.target.value }))}
                className='text-xs h-9'
                required
              />
            </div>

            {/* Email & No HP */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
              <div className='space-y-1.5 min-w-0'>
                <Label className='text-xs font-semibold'>Email *</Label>
                <Input
                  type='email'
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className='text-xs h-9'
                  required
                />
              </div>

              <div className='space-y-1.5 min-w-0'>
                <Label className='text-xs font-semibold'>Nomor Handphone</Label>
                <Input
                  value={editForm.noHp}
                  onChange={(e) => setEditForm((p) => ({ ...p, noHp: e.target.value }))}
                  className='text-xs h-9'
                />
              </div>
            </div>

            {/* Role */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Peran & Hak Akses (Role) *</Label>
              <Select
                value={editForm.role}
                onValueChange={(val) => setEditForm((p) => ({ ...p, role: val as StaffRole }))}
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

            {/* Department Assignment Box (Visible when role is scoped) */}
            {(editForm.role === 'SEKRETARIS_KATEGORIAL' || editForm.role === 'BENDAHARA_KATEGORIAL') && (
              <div className='p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5 font-bold text-xs text-foreground'>
                    <Layers className='size-3.5 text-primary' /> Penugasan Kategorial / Departemen *
                  </div>
                  <Badge variant='outline' className='text-[10px] bg-background font-mono'>
                    {editForm.kategorialIds.length} Dipilih
                  </Badge>
                </div>
                <p className='text-[11px] text-muted-foreground'>
                  Pilih kategorial yang boleh diakses dan dikelola oleh akun staf ini:
                </p>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1'>
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
                        className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-2xs'
                            : 'bg-card text-foreground border-border hover:bg-accent/50'
                        }`}
                      >
                        <span className='truncate'>{kat.nama}</span>
                        {isSelected && <span className='text-xs font-bold'>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <DialogFooter className='pt-3 gap-2 sm:gap-0'>
              <Button type='button' variant='outline' size='sm' onClick={() => setEditDialogOpen(false)} disabled={actionLoading} className='text-xs'>
                Batal
              </Button>
              <Button type='submit' size='sm' disabled={actionLoading} className='text-xs gap-1.5 font-semibold'>
                {actionLoading ? <Loader2 className='size-3.5 animate-spin' /> : <CheckCircle2 className='size-3.5' />}
                {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Reset Password */}
      <Dialog open={resetPwdDialogOpen} onOpenChange={setResetPwdDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <KeyRound className='size-5 text-amber-500' /> Reset Kata Sandi Pengguna
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tetapkan kata sandi baru untuk <strong className='text-foreground'>@{selectedUser?.username}</strong>. Seluruh sesi login sebelumnya akan otomatis diakhiri.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPwdSubmit} className='space-y-3.5 text-xs'>
            <div className='space-y-1'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-semibold'>Kata Sandi Baru *</Label>
                <Button type='button' variant='ghost' size='sm' onClick={handleGenerateRandomPassword} className='h-6 text-[11px] text-primary gap-1 p-0'>
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

      {/* DIALOG 4: Toggle Status Confirmation */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold flex items-center gap-2'>
              <AlertTriangle className='size-5 text-amber-500' />
              {selectedUser?.status === 'AKTIF' ? 'Nonaktifkan Akun Pengguna?' : 'Aktifkan Kembali Akun?'}
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              {selectedUser?.status === 'AKTIF'
                ? `Akun @${selectedUser?.username} (${selectedUser?.nama}) akan dinonaktifkan. Pengguna tidak akan dapat melakukan login ke CMS.`
                : `Akun @${selectedUser?.username} (${selectedUser?.nama}) akan diaktifkan kembali dan dapat melakukan login.`}
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

      {/* DIALOG 5: Delete User AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-rose-600 flex items-center gap-2'>
              <Trash2 className='size-5' /> Hapus Akun Staf (Soft Delete)?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground'>
                <div>
                  Akun <strong className='text-foreground'>@{selectedUser?.username}</strong> ({selectedUser?.nama}) akan dihapus secara soft delete dan seluruh sesi login akan diakhiri.
                </div>
                <div className='space-y-1 pt-2'>
                  <Label className='text-xs font-semibold text-foreground'>Alasan Penghapusan Wajib *</Label>
                  <Textarea
                    placeholder='Tuliskan alasan resmi penghapusan akun staf ini...'
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className='text-xs min-h-15'
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

      {/* DIALOG 6: Restore User AlertDialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-emerald-600 flex items-center gap-2'>
              <RotateCcw className='size-5' /> Pulihkan Akun Pengguna?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground'>
                <div>
                  Akun <strong className='text-foreground'>@{selectedUser?.username}</strong> ({selectedUser?.nama}) akan dipulihkan kembali ke status <strong>AKTIF</strong> dan dapat digunakan untuk login kembali.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' size='sm' onClick={() => setRestoreDialogOpen(false)} disabled={actionLoading} className='text-xs'>
              Batal
            </Button>
            <Button
              size='sm'
              onClick={handleRestoreSubmit}
              disabled={actionLoading}
              className='text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white'
            >
              {actionLoading ? <Loader2 className='size-3.5 animate-spin' /> : <RotateCcw className='size-3.5' />}
              {actionLoading ? 'Memulihkan...' : 'Ya, Pulihkan Akun'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG 7: Hard Delete User AlertDialog */}
      <AlertDialog open={hardDeleteDialogOpen} onOpenChange={setHardDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-rose-600 flex items-center gap-2'>
              <ShieldAlert className='size-5 text-rose-600' /> Hapus Permanen dari Database?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-xs space-y-2 text-muted-foreground'>
                <div className='p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium'>
                  ⚠️ <strong>PERINGATAN</strong>: Akun <strong className='text-foreground'>@{selectedUser?.username}</strong> ({selectedUser?.nama}) akan dihapus secara permanen dari database. Data yang dihapus permanen TIDAK DAPAT dipulihkan kembali!
                </div>
                <div className='space-y-1 pt-2'>
                  <Label className='text-xs font-semibold text-foreground'>Keterangan / Catatan Tambahan (Opsional)</Label>
                  <Textarea
                    placeholder='Catatan penghapusan permanen...'
                    value={hardDeleteReason}
                    onChange={(e) => setHardDeleteReason(e.target.value)}
                    className='text-xs min-h-12.5'
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant='outline' size='sm' onClick={() => setHardDeleteDialogOpen(false)} disabled={actionLoading} className='text-xs'>
              Batal
            </Button>
            <Button
              size='sm'
              variant='destructive'
              onClick={handleHardDeleteSubmit}
              disabled={actionLoading}
              className='text-xs gap-1.5 bg-rose-700 hover:bg-rose-800'
            >
              {actionLoading ? <Loader2 className='size-3.5 animate-spin' /> : <Trash2 className='size-3.5' />}
              {actionLoading ? 'Menghapus...' : 'Hapus Permanen Sekarang'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
