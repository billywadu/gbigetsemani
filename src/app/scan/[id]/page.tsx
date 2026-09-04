import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getAppProfileAction } from '@/actions/app-profile'
import { DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'
import { stripHtmlAndTruncate } from '@/lib/sanitizer'
import DedicatedScannerPage from './scan-client'

interface ScanPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ScanPageProps): Promise<Metadata> {
  const { id } = await params
  const [profileRes, event] = await Promise.all([
    getAppProfileAction(),
    id && id !== 'live'
      ? prisma.event.findFirst({
          where: { id, deletedAt: null },
        })
      : null,
  ])

  const profile = profileRes.data || DEFAULT_APP_PROFILE_CONFIG
  const churchName = profile.namaResmi || profile.namaSingkat || 'Gereja'
  const baseUrl =
    profile.website && profile.website.startsWith('http')
      ? profile.website
      : process.env.NEXT_PUBLIC_APP_URL || 'https://gereja.org'

  const canonicalPath = `/scan/${id}`

  if (id === 'live' || !event) {
    const rawImage = profile.logoUrl || '/logo.png'
    const absoluteImageUrl = rawImage.startsWith('http')
      ? rawImage
      : `${baseUrl.replace(/\/$/, '')}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`

    const pageTitle = id === 'live' ? 'Terminal Presensi QR Live' : 'Scanner Presensi'
    const title = `${pageTitle} | ${churchName}`
    const description = `Terminal Mandiri & Petugas Pemindaian QR Code Presensi Ibadah & Acara ${churchName}.`

    return {
      title: {
        absolute: title,
      },
      description,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        type: 'website',
        locale: 'id_ID',
        url: canonicalPath,
        siteName: churchName,
        title: `${pageTitle} — ${profile.namaSingkat}`,
        description,

        images: [
          {
            url: absoluteImageUrl,
            width: 1200,
            height: 630,
            alt: `Scanner Presensi ${churchName}`,
            type: 'image/png',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${pageTitle} — ${profile.namaSingkat}`,
        description,
        images: [absoluteImageUrl],
      },

    }
  }

  // Format dynamic event schedule
  const eventDate = new Date(event.tanggalMulai)
  const formattedDate = eventDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const formattedTime =
    eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'

  const locationStr = event.lokasi || event.namaLokasi || 'Gedung Utama Gereja'
  const cleanTitle = `${event.namaEvent}`
  const description =
    stripHtmlAndTruncate(
      `Presensi & Jadwal Acara: ${event.namaEvent}. Pelaksanaan: ${formattedDate} pukul ${formattedTime} bertempat di ${locationStr}. ${event.deskripsi || ''}`,
      160
    ) || `Presensi ${event.namaEvent} di ${churchName}.`

  const rawImage = event.thumbnailUrl || profile.logoUrl || '/logo.png'
  const absoluteImageUrl = rawImage.startsWith('http')
    ? rawImage
    : `${baseUrl.replace(/\/$/, '')}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`

  return {
    title: {
      absolute: `${cleanTitle} | Presensi ${profile.namaSingkat}`,
    },
    description,
    alternates: {
      canonical: canonicalPath,
    },
    authors: [{ name: churchName, url: baseUrl }],
    publisher: churchName,
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      url: canonicalPath,
      siteName: churchName,
      title: `${cleanTitle} — ${profile.namaSingkat}`,
      description,
      images: [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: cleanTitle,
          type: 'image/jpeg',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${cleanTitle} — ${profile.namaSingkat}`,
      description,
      images: [absoluteImageUrl],
    },
  }
}

export default async function ScanPage({ params }: ScanPageProps) {
  await params
  return <DedicatedScannerPage />
}

