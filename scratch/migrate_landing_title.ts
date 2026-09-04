import { prisma } from '../src/lib/prisma'
import { landingPageConfigSchema, DEFAULT_LANDING_PAGE_CONFIG } from '../src/lib/validations/landing-page'

async function updateDbLandingPage() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: 'LANDING_PAGE_CONFIG' },
  })

  if (!setting) {
    console.log('No site setting found, defaults will be used.')
    return
  }

  const parsed = landingPageConfigSchema.safeParse(setting.value)
  if (parsed.success) {
    const data = parsed.data
    data.materi.sectionTitle = 'Artikel & Renungan'
    data.materi.sectionSubtitle = 'Kumpulan artikel firman Tuhan, renungan rohani, dan wawasan pelayanan jemaat.'
    data.sections = data.sections.map((s) => (s.id === 'materi' ? { ...s, title: 'Artikel & Renungan' } : s))

    await prisma.siteSetting.update({
      where: { key: 'LANDING_PAGE_CONFIG' },
      data: { value: data as any },
    })
    console.log('✓ Successfully updated database landing page config to "Artikel & Renungan"!')
  }
}

updateDbLandingPage()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
