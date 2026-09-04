import { Metadata } from 'next'
import { getAppProfileAction } from '@/actions/app-profile'
import { DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'
import { ArtikelCatalogClient } from './artikel-catalog-client'

export async function generateMetadata(): Promise<Metadata> {
  const profileRes = await getAppProfileAction()
  const profile = profileRes.data || DEFAULT_APP_PROFILE_CONFIG

  const churchName = profile.namaResmi || profile.namaSingkat || 'Gereja'
  const baseUrl =
    profile.website && profile.website.startsWith('http')
      ? profile.website
      : process.env.NEXT_PUBLIC_APP_URL || 'https://gereja.org'

  const rawLogo = profile.logoUrl || '/logo.png'
  const ogImageUrl = rawLogo.startsWith('http')
    ? rawLogo
    : `${baseUrl.replace(/\/$/, '')}${rawLogo.startsWith('/') ? '' : '/'}${rawLogo}`

  const canonicalPath = '/artikel'
  const description = `Koleksi artikel rohani, khotbah firman Tuhan, bahan renungan harian, dan warta jemaat ${churchName}. Diberkati dan bertumbuh bersama dalam iman.`

  return {
    title: {
      absolute: `Artikel & Renungan Rohani | ${churchName}`,
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
      title: `Artikel & Renungan Rohani — ${churchName}`,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Katalog Artikel ${churchName}`,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Artikel & Renungan Rohani — ${churchName}`,
      description,
      images: [ogImageUrl],
    },
  }
}

export default async function PublicArtikelCatalogPage() {
  const profileRes = await getAppProfileAction()
  const profile = profileRes.data || DEFAULT_APP_PROFILE_CONFIG

  return <ArtikelCatalogClient initialProfile={profile} />
}
