'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ChevronRight,
  Laptop,
  Moon,
  Sun,
  UserPlus,
  QrCode,
  CalendarPlus,
  FilePlus2,
  PenTool,
  HeartHandshake,
  Wallet,
  Users,
  Calendar,
  FileText,
  BookOpen,
  Loader2,
  Sparkles,
  Search,
} from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { sidebarData } from './layout/data/sidebar-data'
import { globalSearchAction, SearchResultItem } from '@/actions/search'
import { Badge } from '@/components/ui/badge'

export function CommandMenu() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()

  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [liveResults, setLiveResults] = useState<{
    jemaat: SearchResultItem[]
    event: SearchResultItem[]
    surat: SearchResultItem[]
    artikel: SearchResultItem[]
    doa: SearchResultItem[]
  }>({
    jemaat: [],
    event: [],
    surat: [],
    artikel: [],
    doa: [],
  })

  // Debounced live database query
  useEffect(() => {
    if (!open) {
      setQuery('')
      setLiveResults({ jemaat: [], event: [], surat: [], artikel: [], doa: [] })
      return
    }

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setLiveResults({ jemaat: [], event: [], surat: [], artikel: [], doa: [] })
      return
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await globalSearchAction(trimmed)
          if (res.success && res.data) {
            setLiveResults(res.data)
          }
        } catch (err) {
          console.error('Failed to fetch search results', err)
        }
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [query, open])

  const runCommand = useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  const hasLiveResults =
    liveResults.jemaat.length > 0 ||
    liveResults.event.length > 0 ||
    liveResults.surat.length > 0 ||
    liveResults.artikel.length > 0 ||
    liveResults.doa.length > 0

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen}>
      <div className='relative'>
        <CommandInput
          placeholder='Cari jemaat, event, surat, modul...'
          value={query}
          onValueChange={setQuery}
        />
        {isPending && (
          <div className='pointer-events-none absolute right-10 top-1/2 -translate-y-1/2'>
            <Loader2 className='size-4 animate-spin text-muted-foreground' />
          </div>
        )}
      </div>

      <CommandList className='max-h-90 sm:max-h-95 overflow-y-auto px-1'>
        <CommandEmpty>
          <div className='py-6 text-center text-sm'>
            <p className='font-medium text-muted-foreground'>Tidak ada hasil yang ditemukan.</p>
            <p className='mt-1 text-xs text-muted-foreground/70'>
              Coba gunakan kata kunci nama, nomor surat, judul artikel, atau modul lain.
            </p>
          </div>
        </CommandEmpty>

        {/* 1. AKSI CEPAT / QUICK ACTIONS (Prioritas Atas) */}
        <CommandGroup heading='Aksi Cepat'>
          <CommandItem
            value='Aksi Tambah Jemaat Baru Formulir Anggota'
            onSelect={() => runCommand(() => router.push('/dashboard/jemaat?action=create'))}
          >
            <UserPlus className='size-4 shrink-0 text-muted-foreground' />
            <span className='font-medium truncate'>Tambah Jemaat Baru</span>
            <span className='ms-auto shrink-0 text-[11px] text-muted-foreground'>Formulir</span>
          </CommandItem>

          <CommandItem
            value='Aksi Buka Scanner QR Presensi Live Kehadiran'
            onSelect={() => runCommand(() => router.push('/scan/event-raya'))}
          >
            <QrCode className='size-4 shrink-0 text-muted-foreground' />
            <span className='font-medium truncate'>Buka Scanner QR Live</span>
            <span className='ms-auto shrink-0 text-[11px] text-muted-foreground'>Presensi</span>
          </CommandItem>

          <CommandItem
            value='Aksi Buat Event Jadwal Ibadah Baru Acara'
            onSelect={() => runCommand(() => router.push('/dashboard/event'))}
          >
            <CalendarPlus className='size-4 shrink-0 text-muted-foreground' />
            <span className='font-medium truncate'>Buat Jadwal / Event Baru</span>
            <span className='ms-auto shrink-0 text-[11px] text-muted-foreground'>Acara</span>
          </CommandItem>

          <CommandItem
            value='Aksi Buat Surat Resmi Generator Dokumen Kop'
            onSelect={() => runCommand(() => router.push('/dashboard/surat'))}
          >
            <FilePlus2 className='size-4 shrink-0 text-muted-foreground' />
            <span className='font-medium truncate'>Buat Surat Resmi Baru</span>
            <span className='ms-auto shrink-0 text-[11px] text-muted-foreground'>Generator</span>
          </CommandItem>

          <CommandItem
            value='Aksi Tulis Artikel Renungan Khotbah Baru'
            onSelect={() => runCommand(() => router.push('/dashboard/artikel'))}
          >
            <PenTool className='size-4 shrink-0 text-muted-foreground' />
            <span className='font-medium truncate'>Tulis Artikel & Renungan</span>
            <span className='ms-auto shrink-0 text-[11px] text-muted-foreground'>Publikasi</span>
          </CommandItem>

          <CommandItem
            value='Aksi Lihat Permohonan Doa Jemaat Masuk'
            onSelect={() => runCommand(() => router.push('/dashboard/doa'))}
          >
            <HeartHandshake className='size-4 shrink-0 text-muted-foreground' />
            <span className='font-medium truncate'>Lihat Permohonan Doa Masuk</span>
            <span className='ms-auto shrink-0 text-[11px] text-muted-foreground'>Pastoral</span>
          </CommandItem>

          <CommandItem
            value='Aksi Catat Kas Keuangan Transaksi Masuk Keluar'
            onSelect={() => runCommand(() => router.push('/dashboard/keuangan'))}
          >
            <Wallet className='size-4 shrink-0 text-muted-foreground' />
            <span className='font-medium truncate'>Pencatatan Kas & Keuangan</span>
            <span className='ms-auto shrink-0 text-[11px] text-muted-foreground'>Kas</span>
          </CommandItem>
        </CommandGroup>

        {/* 2. HASIL PENCARIAN DATABASE (LIVE DATA) */}
        {liveResults.jemaat.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading='Data Jemaat'>
              {liveResults.jemaat.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`jemaat-${item.title}-${item.subtitle}`}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <Users className='size-4 shrink-0 text-muted-foreground' />
                  <div className='flex flex-col min-w-0'>
                    <span className='font-medium truncate'>{item.title}</span>
                    {item.subtitle && (
                      <span className='text-[11px] text-muted-foreground truncate'>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  {item.badge && (
                    <Badge variant='outline' className='ms-auto text-[10px] uppercase shrink-0'>
                      {item.badge}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {liveResults.event.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading='Jadwal & Event Ibadah'>
              {liveResults.event.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`event-${item.title}-${item.subtitle}`}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <Calendar className='size-4 shrink-0 text-muted-foreground' />
                  <div className='flex flex-col min-w-0'>
                    <span className='font-medium truncate'>{item.title}</span>
                    {item.subtitle && (
                      <span className='text-[11px] text-muted-foreground truncate'>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  {item.badge && (
                    <Badge variant='outline' className='ms-auto text-[10px] shrink-0'>
                      {item.badge}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {liveResults.surat.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading='Surat Resmi'>
              {liveResults.surat.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`surat-${item.title}-${item.subtitle}`}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <FileText className='size-4 shrink-0 text-muted-foreground' />
                  <div className='flex flex-col min-w-0'>
                    <span className='font-medium truncate'>{item.title}</span>
                    {item.subtitle && (
                      <span className='text-[11px] text-muted-foreground truncate'>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  {item.badge && (
                    <Badge variant='outline' className='ms-auto text-[10px] shrink-0'>
                      {item.badge}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {liveResults.artikel.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading='Artikel & Renungan'>
              {liveResults.artikel.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`artikel-${item.title}-${item.subtitle}`}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <BookOpen className='size-4 shrink-0 text-muted-foreground' />
                  <div className='flex flex-col min-w-0'>
                    <span className='font-medium truncate'>{item.title}</span>
                    {item.subtitle && (
                      <span className='text-[11px] text-muted-foreground truncate'>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  {item.badge && (
                    <Badge variant='outline' className='ms-auto text-[10px] shrink-0'>
                      {item.badge}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {liveResults.doa.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading='Permohonan Doa'>
              {liveResults.doa.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`doa-${item.title}-${item.subtitle}`}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <HeartHandshake className='size-4 shrink-0 text-muted-foreground' />
                  <div className='flex flex-col min-w-0'>
                    <span className='font-medium truncate'>{item.title}</span>
                    {item.subtitle && (
                      <span className='text-[11px] text-muted-foreground truncate'>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  {item.badge && (
                    <Badge variant='outline' className='ms-auto text-[10px] shrink-0'>
                      {item.badge}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* 3. NAVIGASI MODUL & HALAMAN DASHBOARD */}
        <CommandSeparator />
        {sidebarData.navGroups.map((group) => (
          <CommandGroup key={group.title} heading={`Modul: ${group.title}`}>
            {group.items.map((navItem, i) => {
              const ItemIcon = navItem.icon || ArrowRight

              if (navItem.url)
                return (
                  <CommandItem
                    key={`${navItem.url}-${i}`}
                    value={`${group.title} ${navItem.title} ${navItem.url}`}
                    onSelect={() => {
                      runCommand(() => router.push(navItem.url))
                    }}
                  >
                    <ItemIcon className='size-4 shrink-0 text-muted-foreground' />
                    <span className='truncate'>{navItem.title}</span>
                  </CommandItem>
                )

              return navItem.items?.map((subItem, j) => {
                const SubIcon = subItem.icon || ChevronRight
                return (
                  <CommandItem
                    key={`${navItem.title}-${subItem.url}-${j}`}
                    value={`${group.title} ${navItem.title} ${subItem.title} ${subItem.url}`}
                    onSelect={() => {
                      runCommand(() => router.push(subItem.url))
                    }}
                  >
                    <SubIcon className='size-4 shrink-0 text-muted-foreground' />
                    <span className='truncate'>
                      {navItem.title} &rsaquo; {subItem.title}
                    </span>
                  </CommandItem>
                )
              })
            })}
          </CommandGroup>
        ))}

        {/* 4. PENGATURAN TEMA TAMPILAN */}
        <CommandSeparator />
        <CommandGroup heading='Tema Tampilan'>
          <CommandItem
            value='Tema Terang Light Mode Tampilan'
            onSelect={() => runCommand(() => setTheme('light'))}
          >
            <Sun className='size-4 shrink-0 text-muted-foreground' />
            <span>Terang (Light)</span>
          </CommandItem>
          <CommandItem
            value='Tema Gelap Dark Mode Tampilan'
            onSelect={() => runCommand(() => setTheme('dark'))}
          >
            <Moon className='size-4 shrink-0 text-muted-foreground' />
            <span>Gelap (Dark)</span>
          </CommandItem>
          <CommandItem
            value='Tema Sistem Otomatis OS Default'
            onSelect={() => runCommand(() => setTheme('system'))}
          >
            <Laptop className='size-4 shrink-0 text-muted-foreground' />
            <span>Sistem</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
