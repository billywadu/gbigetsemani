'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Clock,
  Eye,
  Loader2,
  Tag
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
import { getKomselByKategorialAction } from '@/actions/komsel'
import { toast } from 'sonner'

export default function KomselByKategorialPage() {
  const params = useParams()
  const kategorialId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any | null>(null)

  const fetchData = useCallback(async () => {
    if (!kategorialId) return
    setLoading(true)
    const res = await getKomselByKategorialAction(kategorialId)
    if (res.success && res.data) {
      setData(res.data)
    } else {
      toast.error(res.error || 'Gagal memuat data Komsel per kategorial.')
    }
    setLoading(false)
  }, [kategorialId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading && !data) {
    return (
      <div className='flex items-center justify-center min-h-100 text-muted-foreground gap-2 text-sm'>
        <Loader2 className='size-5 animate-spin text-primary' /> Memuat data komsel kategorial...
      </div>
    )
  }

  if (!data && !loading) {
    return (
      <div className='space-y-4 max-w-xl mx-auto py-12 text-center'>
        <h2 className='text-xl font-bold text-rose-600 dark:text-rose-400'>Data Tidak Ditemukan</h2>
        <p className='text-sm text-muted-foreground'>Kategorial tidak ditemukan atau belum memiliki kelompok Komsel.</p>
        <Button asChild variant='outline'>
          <Link href='/dashboard/komsel'>Kembali ke Daftar Komsel</Link>
        </Button>
      </div>
    )
  }

  const { kategorial, items, totalKomsel, totalAnggotaAll } = data

  return (
    <div className='space-y-6'>
      {/* Header Bar */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4'>
        <div className='flex items-center gap-4'>
          <Button asChild variant='ghost' size='icon'>
            <Link href='/dashboard/komsel'>
              <ArrowLeft className='size-5' />
            </Link>
          </Button>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-2xl font-bold tracking-tight'>
                Komsel Kategorial: {kategorial?.nama}
              </h1>
              <Badge variant='secondary' className='gap-1 font-mono text-[10px]'>
                <Tag className='size-3' /> Kategorial
              </Badge>
            </div>
            <p className='text-sm text-muted-foreground'>
              {kategorial?.deskripsi || `Daftar kelompok Komsel khusus target kategorial ${kategorial?.nama}.`}
            </p>
          </div>
        </div>

        <Button asChild variant='outline' size='sm' className='gap-2 h-9'>
          <Link href={`/dashboard/kategorial/${kategorialId}`}>
            <Tag className='size-4' /> Detail Kategorial
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card className='shadow-xs bg-card border-primary/20'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>NAMA KATEGORIAL</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3'>
            <div className='text-lg font-bold text-primary flex items-center gap-1.5'>
              <Tag className='size-4 text-primary' /> {kategorial?.nama}
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TOTAL KELOMPOK KOMSEL</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3'>
            <div className='text-2xl font-bold font-mono text-foreground flex items-center gap-1.5'>
              <Building2 className='size-5 text-primary' /> {totalKomsel}
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs bg-card'>
          <CardHeader className='pb-1 pt-3 px-3'>
            <CardTitle className='text-xs font-medium text-muted-foreground uppercase'>TOTAL ANGGOTA TERGABUNG</CardTitle>
          </CardHeader>
          <CardContent className='pb-3 pt-0 px-3'>
            <div className='text-2xl font-bold font-mono text-foreground flex items-center gap-1.5'>
              <Users className='size-5 text-primary' /> {totalAnggotaAll} Jemaat
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main DataTable */}
      <Card className='shadow-xs overflow-hidden'>
        <CardHeader>
          <CardTitle className='text-base flex items-center gap-2'>
            <Building2 className='size-4 text-primary' /> Daftar Komsel ({totalKomsel})
          </CardTitle>
          <CardDescription className='text-xs'>
            Kelompok Komsel aktif yang ditargetkan untuk kategorial {kategorial?.nama}.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent border-b'>
                <TableHead className='px-4 font-semibold text-xs'>Nama Komsel</TableHead>
                <TableHead className='px-4 font-semibold text-xs'>Wilayah</TableHead>
                <TableHead className='px-4 font-semibold text-xs'>Jadwal Pertemuan</TableHead>
                <TableHead className='px-4 font-semibold text-xs'>Koordinator</TableHead>
                <TableHead className='px-4 font-semibold text-xs'>Total Anggota</TableHead>
                <TableHead className='px-4 font-semibold text-xs text-end'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-32 text-center text-muted-foreground text-xs'>
                    Belum ada kelompok Komsel untuk kategorial ini.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((kms: any) => (
                  <TableRow key={kms.id} className='hover:bg-muted/30 transition-colors'>
                    <TableCell className='px-4 py-3 font-semibold text-sm text-foreground'>
                      <Link href={`/dashboard/komsel/${kms.id}`} className='hover:underline hover:text-primary'>
                        {kms.nama}
                      </Link>
                    </TableCell>
                    <TableCell className='px-4 py-3 text-xs text-muted-foreground'>
                      <Badge variant='outline' className='font-normal text-[11px]'>
                        <Building2 className='size-3 me-1 text-primary' /> {kms.wilayah}
                      </Badge>
                    </TableCell>
                    <TableCell className='px-4 py-3 text-xs text-foreground'>
                      <div className='flex items-center gap-1 font-medium'>
                        <Calendar className='size-3 text-muted-foreground' /> {kms.hari}
                      </div>
                      <div className='flex items-center gap-1 text-[11px] text-muted-foreground'>
                        <Clock className='size-3' /> {kms.jam}
                      </div>
                    </TableCell>
                    <TableCell className='px-4 py-3 text-xs'>
                      {kms.koordinator ? (
                        <div>
                          <div className='font-semibold text-foreground'>{kms.koordinator.nama}</div>
                          <div className='font-mono text-muted-foreground text-[10px]'>{kms.koordinator.nij}</div>
                        </div>
                      ) : (
                        <span className='text-muted-foreground italic text-[11px]'>Belum ada</span>
                      )}
                    </TableCell>
                    <TableCell className='px-4 py-3'>
                      <Badge variant='outline' className='gap-1 font-mono font-normal text-[11px]'>
                        <Users className='size-3 text-primary' /> {kms.totalAnggota} Jemaat
                      </Badge>
                    </TableCell>
                    <TableCell className='px-4 py-3 text-end'>
                      <Button asChild variant='outline' size='sm' className='text-xs h-8'>
                        <Link href={`/dashboard/komsel/${kms.id}`}>
                          <Eye className='size-3.5 me-1.5' /> Lihat Komsel
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
