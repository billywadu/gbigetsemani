'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  Loader2,
  MoreHorizontal,
  Eye,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getPelayanByKategorialAction } from '@/actions/pelayan'
import { formatAgeString } from '@/lib/utils/age'
import { toast } from 'sonner'

export default function PelayanByKategorialPage() {
  const params = useParams()
  const kategorialId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [kategorial, setKategorial] = useState<any | null>(null)
  const [pelayanList, setPelayanList] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Pagination
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const fetchData = useCallback(async () => {
    if (!kategorialId) return
    setLoading(true)
    const res = await getPelayanByKategorialAction(kategorialId, pageIndex + 1, pageSize)
    if (res.success && res.data) {
      setKategorial(res.data.kategorial)
      setPelayanList(res.data.items)
      setTotalCount(res.data.total)
    } else {
      toast.error(res.error || 'Gagal memuat data pelayan per kategorial.')
    }
    setLoading(false)
  }, [kategorialId, pageIndex, pageSize])

  useEffect(() => { fetchData() }, [fetchData])

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  if (loading && !kategorial) {
    return (
      <div className='flex items-center justify-center min-h-100 text-muted-foreground gap-2 text-sm'>
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat data pelayan per kategorial...
      </div>
    )
  }

  if (!kategorial && !loading) {
    return (
      <div className='space-y-4 max-w-xl mx-auto py-12 text-center'>
        <h2 className='text-xl font-bold text-rose-600 dark:text-rose-400'>Data Tidak Ditemukan</h2>
        <p className='text-sm text-muted-foreground'>Kategorial tidak ditemukan atau telah dihapus.</p>
        <Button asChild variant='outline'>
          <Link href='/dashboard/pelayan'>Kembali ke Daftar Pelayan</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4'>
        <div className='flex items-start gap-3 sm:gap-4'>
          <Button asChild variant='ghost' size='icon' className='size-8 mt-0.5 shrink-0'>
            <Link href='/dashboard/pelayan'><ArrowLeft className='size-4' /></Link>
          </Button>
          <div className='min-w-0 flex-1'>
            <h1 className='text-lg sm:text-2xl font-bold tracking-tight text-foreground'>
              Pelayan: {kategorial?.nama}
            </h1>
            <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
              Breakdown tim pelayan yang berasal dari kategorial {kategorial?.nama}.
            </p>
          </div>
        </div>
        <Button asChild variant='outline' size='sm' className='gap-2 h-8 text-xs font-semibold w-full sm:w-auto justify-center'>
          <Link href={`/dashboard/kategorial/${kategorialId}`}>
            <UserCheck className='size-3.5' /> Lihat Detail Kategorial
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 sm:grid-cols-2'>
        <Card className='shadow-xs bg-card border-primary/20'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>NAMA KATEGORIAL</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3'>
            <div className='text-lg font-bold text-primary'>{kategorial?.nama}</div>
          </CardContent>
        </Card>
        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TOTAL PELAYAN</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3'>
            <div className='text-2xl font-bold font-mono text-foreground flex items-center gap-1.5'>
              <Users className='size-5 text-primary' /> {totalCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pelayan Table */}
      <div className='rounded-md border overflow-hidden bg-card'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent border-b bg-muted/30'>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Nama & NIJ</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Jenis Kelamin</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Usia</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap min-w-40'>Bidang Pelayanan</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap min-w-45'>Deskripsi Tugas</TableHead>
                <TableHead className='px-4 font-semibold text-xs whitespace-nowrap'>Status</TableHead>
                <TableHead className='px-4 font-semibold text-xs text-end whitespace-nowrap'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-sm'>
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='size-4 animate-spin text-primary' /> Memuat...
                    </div>
                  </TableCell>
                </TableRow>
              ) : pelayanList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-xs'>
                    Belum ada Pelayan dari kategorial {kategorial?.nama}.
                  </TableCell>
                </TableRow>
              ) : (
                pelayanList.map((pelayan) => (
                  <TableRow key={pelayan.id} className='hover:bg-muted/30 transition-colors'>
                    <TableCell className='px-4 py-3'>
                      <div className='font-semibold text-foreground text-sm'>{pelayan.jemaat.nama}</div>
                      <div className='font-mono text-muted-foreground text-[11px]'>{pelayan.jemaat.nij}</div>
                    </TableCell>
                    <TableCell className='px-4 py-3 text-xs'>
                      {pelayan.jemaat.jenisKelamin === 'LAK_LAKI' ? 'Laki-laki' : 'Perempuan'}
                    </TableCell>
                    <TableCell className='px-4 py-3 font-mono text-xs font-semibold text-foreground'>
                      {formatAgeString(pelayan.jemaat.tanggalLahir)}
                    </TableCell>
                    <TableCell className='px-4 py-3 text-xs'>
                      <div className='flex flex-wrap gap-1 max-w-xs'>
                        {pelayan.kategoriPelayanan
                          .filter((pk: any) => !pk.kategorialId || pk.kategorialId === kategorialId || pk.kategorial?.id === kategorialId)
                          .slice(0, 3)
                          .map((pk: any) => (
                            <Badge key={pk.id} variant='outline' className='font-normal text-[10px] py-0 px-1.5'>
                              {pk.kategoriPelayanan.nama}
                            </Badge>
                          ))}
                        {pelayan.kategoriPelayanan.length > 3 && (
                          <Badge variant='secondary' className='font-normal text-[10px] py-0 px-1.5'>
                            +{pelayan.kategoriPelayanan.length - 3} lagi
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='px-4 py-3 text-xs text-muted-foreground'>
                      {pelayan.deskripsiTugas || '-'}
                    </TableCell>
                    <TableCell className='px-4 py-3'>
                      <Badge className={
                        pelayan.jemaat.statusJemaat === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px]'
                      }>
                        {pelayan.jemaat.statusJemaat}
                      </Badge>
                    </TableCell>
                    <TableCell className='px-4 py-3 text-end'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon' className='size-7'>
                            <MoreHorizontal className='size-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuLabel className='text-xs'>Aksi</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/jemaat/${pelayan.jemaat.id}`}>
                              <Eye className='size-3.5 me-2' /> Lihat Profil Jemaat
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4 p-3 border-t text-xs text-muted-foreground bg-card'>
          <div>{totalCount} total pelayan dalam kategorial {kategorial?.nama}.</div>
          <div className='flex items-center gap-6'>
            <div className='flex items-center gap-2'>
              <span>Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPageIndex(0) }}>
                <SelectTrigger className='h-7 w-16 text-xs'><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['5', '10', '20', '50'].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>Page {pageIndex + 1} of {totalPages}</div>
            <div className='flex items-center gap-1'>
              <Button variant='outline' size='icon' className='size-7' disabled={pageIndex === 0} onClick={() => setPageIndex(0)}><ChevronsLeft className='size-3.5' /></Button>
              <Button variant='outline' size='icon' className='size-7' disabled={pageIndex === 0} onClick={() => setPageIndex((p) => p - 1)}><ChevronLeft className='size-3.5' /></Button>
              <Button variant='outline' size='icon' className='size-7' disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex((p) => p + 1)}><ChevronRight className='size-3.5' /></Button>
              <Button variant='outline' size='icon' className='size-7' disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(totalPages - 1)}><ChevronsRight className='size-3.5' /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
