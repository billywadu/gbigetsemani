import type { Metadata } from 'next'
import { getAppProfileAction } from '@/actions/app-profile'
import { DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'

export async function generateMetadata(): Promise<Metadata> {
  const profileRes = await getAppProfileAction()
  const profile = profileRes.data || DEFAULT_APP_PROFILE_CONFIG
  const pageTitle = 'Pendaftaran Mandiri Jemaat'
  const fullTitle = `${pageTitle} | ${profile.namaSingkat}`
  const description = `Pendaftaran resmi keanggotaan jemaat baru di ${profile.namaResmi}. Formulir mandiri cepat, terverifikasi, dan dilindungi UU PDP No. 27/2022.`
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

export default function DaftarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
