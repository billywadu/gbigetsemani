import type { Metadata } from 'next'
import { getAppProfileAction } from '@/actions/app-profile'
import { DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'

export async function generateMetadata(): Promise<Metadata> {
  const profileRes = await getAppProfileAction()
  const profile = profileRes.data || DEFAULT_APP_PROFILE_CONFIG
  const pageTitle = 'Verifikasi NIJ & Kartu Jemaat Digital'
  const fullTitle = `${pageTitle} | ${profile.namaSingkat}`
  const description = `Portal mandiri verifikasi Nomor Induk Jemaat (NIJ), Kartu Anggota Digital, dan QR Barcode Presensi resmi ${profile.namaResmi}.`
  const ogImage = profile.logoUrl || '/favicon.ico'

  return {
    title: pageTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      siteName: profile.namaResmi,
      type: 'website',
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: fullTitle }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: ogImage ? [ogImage] : [],
    },
  }
}

export default function ProfilJemaatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
