import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/context/theme-provider'
import { DirectionProvider } from '@/context/direction-provider'
import { Toaster } from '@/components/ui/sonner'
import { getAppProfileAction } from '@/actions/app-profile'
import { DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const profileRes = await getAppProfileAction()
  const profile = profileRes.data || DEFAULT_APP_PROFILE_CONFIG

  const baseUrl = profile.website && profile.website.startsWith('http')
    ? profile.website
    : 'https://gereja.org'

  const siteTitle = `${profile.namaSingkat} CMS v4`
  const defaultDesc = profile.tagline || 'Sistem Informasi Manajemen Gereja Terpadu'
  const iconUrl = profile.faviconUrl || profile.logoUrl || '/favicon.ico'
  const appleIconUrl = profile.logoUrl || profile.faviconUrl || '/apple-touch-icon.png'
  const ogImageUrl = profile.logoUrl || iconUrl

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: siteTitle,
      template: `%s | ${profile.namaSingkat}`,
    },
    description: defaultDesc,
    applicationName: profile.namaSingkat,
    authors: [{ name: profile.namaResmi, url: baseUrl }],
    keywords: [
      profile.namaSingkat,
      profile.namaResmi,
      'Gereja',
      'Sistem Informasi Gereja',
      'Presensi QR',
      'Keanggotaan Jemaat',
      'Manajemen Gereja',
    ],
    icons: {
      icon: [{ url: iconUrl }],
      shortcut: [{ url: iconUrl }],
      apple: [{ url: appleIconUrl }],
    },
    appleWebApp: {
      capable: true,
      title: profile.namaSingkat,
      statusBarStyle: 'default',
    },
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      url: baseUrl,
      siteName: profile.namaResmi,
      title: `${profile.namaSingkat} — Sistem Informasi Gereja Terpadu`,
      description: defaultDesc,
      images: ogImageUrl
        ? [
            {
              url: ogImageUrl,
              width: 1200,
              height: 630,
              alt: profile.namaResmi,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.namaSingkat} — Sistem Informasi Gereja Terpadu`,
      description: defaultDesc,
      images: ogImageUrl ? [ogImageUrl] : [],
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='id' className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-svh w-full bg-background text-foreground`} suppressHydrationWarning>
        <ThemeProvider defaultTheme='system'>
          <DirectionProvider>
            {children}
            <Toaster position='top-right' />
          </DirectionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
