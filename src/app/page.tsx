import React from 'react'
import Link from 'next/link'
import { Calendar, Sparkles } from 'lucide-react'
import { getLandingPageConfigAction } from '@/actions/landing-page'
import { getAppProfileAction } from '@/actions/app-profile'
import { getPublicActiveEventsAction } from '@/actions/event'
import { getPublicArticlesByCategoryAction } from '@/actions/artikel'
import { DEFAULT_LANDING_PAGE_CONFIG } from '@/lib/validations/landing-page'
import { DEFAULT_APP_PROFILE_CONFIG } from '@/lib/validations/app-profile'
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'
import { HeroVideoSection } from '@/components/landing/hero-video-section'
import { QuickActionGrid } from '@/components/landing/quick-action-grid'
import { EventBannerCarousel } from '@/components/landing/event-banner-carousel'
import { KhotbahSection } from '@/components/landing/khotbah-section'
import { SocialMediaHub } from '@/components/landing/social-media-hub'
import { BibleStudySection } from '@/components/landing/bible-study-section'
import { ZoomOnlineSection } from '@/components/landing/zoom-online-section'
import { ScheduleSwiper } from '@/components/landing/schedule-swiper'
import { ArtikelSwiper } from '@/components/landing/artikel-swiper'

export default async function PublicLandingPage() {
  // 1. Fetch Landing Page & Church Profile Configuration in Parallel
  const [configRes, profileRes] = await Promise.all([
    getLandingPageConfigAction(),
    getAppProfileAction(),
  ])
  const config = configRes.data || DEFAULT_LANDING_PAGE_CONFIG
  const profile = profileRes.data || DEFAULT_APP_PROFILE_CONFIG

  // 2. Fetch Active Events and Categorized Articles concurrently
  const [eventsRes, khotbahRes, bibleRes, zoomArticlesRes] = await Promise.all([
    getPublicActiveEventsAction(config.eventBanner?.limit || 6),
    getPublicArticlesByCategoryAction({
      kategoriId: config.khotbah?.kategoriId,
      limit: config.khotbah?.limit || 4,
    }),
    getPublicArticlesByCategoryAction({
      kategoriId: config.bibleStudy?.kategoriId,
      limit: config.bibleStudy?.limit || 4,
    }),
    getPublicArticlesByCategoryAction({
      kategoriId: config.zoom?.kategoriId,
      limit: 4,
    }),
  ])

  const activeEvents = eventsRes.data || []
  const khotbahArticles = khotbahRes.data || []
  const bibleArticles = bibleRes.data || []
  const zoomArticles = zoomArticlesRes.data || []

  // 3. Filter, normalize legacy IDs, deduplicate, and sort active sections
  const seenSectionIds = new Set<string>()
  const activeSections = [...config.sections]
    .filter((sec) => sec.enabled)
    .map((sec) => {
      let id = sec.id
      if (id === 'services') id = 'quickActions'
      if (id === 'materi') id = 'khotbah'
      return { ...sec, id }
    })
    .filter((sec) => {
      if (sec.id === 'contact') return false
      if (seenSectionIds.has(sec.id)) return false
      seenSectionIds.add(sec.id)
      return true
    })
    .sort((a, b) => a.order - b.order)

  // Render individual sections dynamically
  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'hero':
        return <HeroVideoSection key={sectionId} config={config.hero} />

      case 'quickActions':
      case 'services': // Legacy fallback
        return <QuickActionGrid key={sectionId} config={config.quickActions || config.services} />

      case 'eventBanner':
        return (
          <EventBannerCarousel
            key={sectionId}
            config={config.eventBanner}
            events={activeEvents}
          />
        )

      case 'khotbah':
        return (
          <KhotbahSection
            key={sectionId}
            config={config.khotbah}
            articles={khotbahArticles}
          />
        )

      case 'socialMedia':
        return <SocialMediaHub key={sectionId} config={config.socialMedia} />

      case 'bibleStudy':
        return (
          <BibleStudySection
            key={sectionId}
            config={config.bibleStudy}
            articles={bibleArticles}
          />
        )

      case 'zoom':
        return (
          <ZoomOnlineSection
            key={sectionId}
            config={config.zoom}
            articles={zoomArticles}
          />
        )

      case 'schedule': {
        const activeScheduleItems = config.schedule?.items?.filter((item) => item.enabled) || []
        return (
          <section id='jadwal' key={sectionId} className='py-12 sm:py-16 px-4 bg-muted/20 border-t w-full mb-12'>
            <div className='max-w-6xl mx-auto'>
              <div className='text-center mb-8 sm:mb-10 max-w-xl mx-auto'>
                <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2'>
                  <Calendar className='size-3.5' />
                  <span>Ibadah Raya & Persekutuan</span>
                </div>
                <h2 className='text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground font-serif'>
                  {config.schedule.sectionTitle}
                </h2>
                {config.schedule.sectionSubtitle && (
                  <p className='text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed'>
                    {config.schedule.sectionSubtitle}
                  </p>
                )}
              </div>

              <ScheduleSwiper items={activeScheduleItems} />
            </div>
          </section>
        )
      }

      case 'materi': {
        // Legacy fallback if section 'materi' is still active
        return (
          <section key={sectionId} className='py-12 px-4 max-w-6xl mx-auto w-full mb-12 border-t'>
            <div className='flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4'>
              <div>
                <h2 className='text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif'>
                  {config.materi?.sectionTitle || 'Artikel & Renungan Terbaru'}
                </h2>
                <p className='text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed'>
                  {config.materi?.sectionSubtitle}
                </p>
              </div>
              <Link
                href='/artikel'
                className='text-xs font-semibold text-primary hover:underline self-start sm:self-auto'
              >
                Lihat Semua Artikel &rarr;
              </Link>
            </div>
            <ArtikelSwiper items={khotbahArticles} />
          </section>
        )
      }

      default:
        return null
    }
  }

  return (
    <div className='dark min-h-svh bg-background text-foreground flex flex-col'>
      {/* 1. Unified Public Header with Top Bar Info */}
      <PublicHeader initialProfile={profile} initialConfig={config} />

      {/* 2. Main Body with Dynamically Ordered Sections */}
      <main className='flex-1 flex flex-col'>
        {activeSections.map((section) => renderSection(section.id))}
      </main>

      {/* 3. Parallax Grand Public Footer */}
      <PublicFooter initialProfile={profile} initialConfig={config} />
    </div>
  )
}
