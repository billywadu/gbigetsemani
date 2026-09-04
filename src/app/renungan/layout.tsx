import { Metadata } from 'next'
import { getAppProfileAction } from '@/actions/app-profile'

export async function generateMetadata(): Promise<Metadata> {
  const profileRes = await getAppProfileAction()
  const profile = profileRes.data

  const churchName = profile?.namaResmi || profile?.namaSingkat || 'Gereja'
  const churchTagline = profile?.tagline || 'Sistem Informasi Gereja'
  const churchLogo = profile?.logoUrl || '/logo.png'

  return {
    title: `Renungan & Khotbah Rohani | ${churchName}`,
    description: `Koleksi khotbah firman Tuhan, bahan renungan harian rohani, dan pengajaran jemaat ${churchName}. Diberkati dan bertumbuh dalam iman.`,
    alternates: {
      canonical: '/renungan',
    },
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      url: '/renungan',
      siteName: churchName,
      title: `Renungan & Khotbah Rohani | ${churchName}`,
      description: `Koleksi khotbah firman Tuhan, renungan harian, dan pengajaran rohani ${churchName}.`,
      images: [
        {
          url: churchLogo,
          width: 1200,
          height: 630,
          alt: `Katalog Renungan ${churchName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Renungan & Khotbah Rohani | ${churchName}`,
      description: `Koleksi khotbah firman Tuhan dan renungan rohani ${churchName}.`,
      images: [churchLogo],
    },
  }
}

export default function PublicRenunganCatalogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
