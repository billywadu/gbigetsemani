'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentStaffSession } from '@/lib/security/session'
import { sanitizeText } from '@/lib/sanitizer'

export type SearchResultItem = {
  id: string
  title: string
  subtitle?: string
  badge?: string
  url: string
  category: 'jemaat' | 'event' | 'surat' | 'artikel' | 'doa'
}

export type GlobalSearchResponse = {
  success: boolean
  error?: string
  data?: {
    jemaat: SearchResultItem[]
    event: SearchResultItem[]
    surat: SearchResultItem[]
    artikel: SearchResultItem[]
    doa: SearchResultItem[]
  }
}

/**
 * Global Search Action across multiple database entities
 * Protected by staff session authentication and input sanitization.
 */
export async function globalSearchAction(rawQuery: string): Promise<GlobalSearchResponse> {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !session.user) {
      return {
        success: false,
        error: 'Sesi tidak valid atau telah berakhir.',
      }
    }

    const cleanQuery = sanitizeText(rawQuery || '').trim()
    if (!cleanQuery || cleanQuery.length < 2) {
      return {
        success: true,
        data: {
          jemaat: [],
          event: [],
          surat: [],
          artikel: [],
          doa: [],
        },
      }
    }

    // Safe truncation to avoid regex/db overhead on huge inputs
    const query = cleanQuery.slice(0, 50)
    const userRole = session.user.role

    // Parallel queries with soft-delete exclusion & limit 5 items per group
    const [jemaatResults, eventResults, suratResults, artikelResults, doaResults] =
      await Promise.all([
        // 1. Search Jemaat
        prisma.jemaat.findMany({
          where: {
            deletedAt: null,
            OR: [
              { nama: { contains: query, mode: 'insensitive' } },
              { namaPanggilan: { contains: query, mode: 'insensitive' } },
              { nij: { contains: query, mode: 'insensitive' } },
              { noHp: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            nama: true,
            nij: true,
            noHp: true,
            statusJemaat: true,
          },
          take: 5,
          orderBy: { nama: 'asc' },
        }),

        // 2. Search Event / Ibadah
        prisma.event.findMany({
          where: {
            deletedAt: null,
            OR: [
              { namaEvent: { contains: query, mode: 'insensitive' } },
              { lokasi: { contains: query, mode: 'insensitive' } },
              { namaLokasi: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            namaEvent: true,
            lokasi: true,
            namaLokasi: true,
            kategori: true,
            tanggalMulai: true,
          },
          take: 5,
          orderBy: { tanggalMulai: 'desc' },
        }),

        // 3. Search Surat Resmi
        prisma.suratResmi.findMany({
          where: {
            deletedAt: null,
            OR: [
              { nomorSurat: { contains: query, mode: 'insensitive' } },
              { perihal: { contains: query, mode: 'insensitive' } },
              { tujuanKepada: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            nomorSurat: true,
            perihal: true,
            tujuanKepada: true,
            status: true,
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),

        // 4. Search Artikel & Renungan
        prisma.artikel.findMany({
          where: {
            deletedAt: null,
            OR: [
              { judul: { contains: query, mode: 'insensitive' } },
              { penulis: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            judul: true,
            slug: true,
            penulis: true,
            status: true,
            kategori: {
              select: { nama: true },
            },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),

        // 5. Search Permohonan Doa (Role restricted for sensitive pastoral notes)
        userRole === 'USHER'
          ? Promise.resolve([])
          : prisma.permohonanDoa.findMany({
              where: {
                deletedAt: null,
                OR: [
                  { namaPemohon: { contains: query, mode: 'insensitive' } },
                  { isiDoa: { contains: query, mode: 'insensitive' } },
                ],
              },
              select: {
                id: true,
                namaPemohon: true,
                kategori: true,
                status: true,
                isAnonim: true,
              },
              take: 5,
              orderBy: { createdAt: 'desc' },
            }),
      ])

    // Format results to standard SearchResultItem
    const jemaatFormatted: SearchResultItem[] = jemaatResults.map((j) => ({
      id: j.id,
      title: j.nama,
      subtitle: [j.nij ? `NIJ: ${j.nij}` : null, j.noHp ? `HP: ${j.noHp}` : null]
        .filter(Boolean)
        .join(' • '),
      badge: j.statusJemaat,
      url: `/dashboard/jemaat?id=${j.id}`,
      category: 'jemaat',
    }))

    const eventFormatted: SearchResultItem[] = eventResults.map((e) => ({
      id: e.id,
      title: e.namaEvent,
      subtitle: [
        e.kategori?.replace(/_/g, ' '),
        e.namaLokasi || e.lokasi,
        new Date(e.tanggalMulai).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      ]
        .filter(Boolean)
        .join(' • '),
      badge: e.kategori?.replace(/_/g, ' '),
      url: `/dashboard/event?id=${e.id}`,
      category: 'event',
    }))

    const suratFormatted: SearchResultItem[] = suratResults.map((s) => ({
      id: s.id,
      title: s.perihal || s.nomorSurat,
      subtitle: [s.nomorSurat, s.tujuanKepada ? `Kepada: ${s.tujuanKepada}` : null]
        .filter(Boolean)
        .join(' • '),
      badge: s.status,
      url: `/dashboard/surat?id=${s.id}`,
      category: 'surat',
    }))

    const artikelFormatted: SearchResultItem[] = artikelResults.map((a) => ({
      id: a.id,
      title: a.judul,
      subtitle: [a.penulis ? `Penulis: ${a.penulis}` : null, a.kategori?.nama]
        .filter(Boolean)
        .join(' • '),
      badge: a.status,
      url: `/dashboard/artikel?id=${a.id}`,
      category: 'artikel',
    }))

    const doaFormatted: SearchResultItem[] = doaResults.map((d) => ({
      id: d.id,
      title: d.isAnonim ? `Permohonan Doa (Anonim)` : `Doa dari ${d.namaPemohon}`,
      subtitle: `Kategori: ${d.kategori}`,
      badge: d.status?.replace(/_/g, ' '),
      url: `/dashboard/doa?id=${d.id}`,
      category: 'doa',
    }))

    return {
      success: true,
      data: {
        jemaat: jemaatFormatted,
        event: eventFormatted,
        surat: suratFormatted,
        artikel: artikelFormatted,
        doa: doaFormatted,
      },
    }
  } catch (error: any) {
    console.error('Error in globalSearchAction:', error)
    return {
      success: false,
      error: 'Terjadi kesalahan sistem saat melakukan pencarian.',
    }
  }
}
