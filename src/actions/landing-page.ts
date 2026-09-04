'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  landingPageConfigSchema,
  LandingPageConfig,
  DEFAULT_LANDING_PAGE_CONFIG,
  SectionOrderItem,
} from '@/lib/validations/landing-page'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { requireStaffSession } from '@/lib/security/auth-guard'
import { getStorageProvider } from '@/lib/storage'
import { Role } from '@/config/navigation'

const SETTINGS_KEY = 'LANDING_PAGE_CONFIG'

/**
 * Fetch Landing Page Configuration with PostgreSQL Fallback and Auto-Merge
 */
export async function getLandingPageConfigAction(): Promise<{
  success: boolean
  data: LandingPageConfig
  isCustomized: boolean
}> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTINGS_KEY },
    })

    if (!setting || !setting.value) {
      return {
        success: true,
        data: DEFAULT_LANDING_PAGE_CONFIG,
        isCustomized: false,
      }
    }

    const rawValue = (setting.value || {}) as Record<string, any>

    // Deep merge with DEFAULT_LANDING_PAGE_CONFIG to ensure new section fields are present
    const mergedConfig: LandingPageConfig = {
      ...DEFAULT_LANDING_PAGE_CONFIG,
      ...rawValue,
      topBar: { ...DEFAULT_LANDING_PAGE_CONFIG.topBar, ...(rawValue.topBar || {}) },
      hero: { ...DEFAULT_LANDING_PAGE_CONFIG.hero, ...(rawValue.hero || {}) },
      quickActions: {
        ...DEFAULT_LANDING_PAGE_CONFIG.quickActions,
        ...(rawValue.quickActions || {}),
        items:
          rawValue.quickActions?.items && rawValue.quickActions.items.length > 0
            ? rawValue.quickActions.items
            : rawValue.services?.items && rawValue.services.items.length > 0
              ? rawValue.services.items
              : DEFAULT_LANDING_PAGE_CONFIG.quickActions.items,
      },
      services: {
        ...DEFAULT_LANDING_PAGE_CONFIG.services,
        ...(rawValue.services || {}),
      },
      eventBanner: {
        ...DEFAULT_LANDING_PAGE_CONFIG.eventBanner,
        ...(rawValue.eventBanner || {}),
      },
      khotbah: { ...DEFAULT_LANDING_PAGE_CONFIG.khotbah, ...(rawValue.khotbah || {}) },
      socialMedia: {
        ...DEFAULT_LANDING_PAGE_CONFIG.socialMedia,
        ...(rawValue.socialMedia || {}),
      },
      bibleStudy: {
        ...DEFAULT_LANDING_PAGE_CONFIG.bibleStudy,
        ...(rawValue.bibleStudy || {}),
      },
      zoom: {
        ...DEFAULT_LANDING_PAGE_CONFIG.zoom,
        ...(rawValue.zoom || {}),
        cards:
          rawValue.zoom?.cards && rawValue.zoom.cards.length > 0
            ? rawValue.zoom.cards
            : DEFAULT_LANDING_PAGE_CONFIG.zoom.cards,
      },
      schedule: {
        ...DEFAULT_LANDING_PAGE_CONFIG.schedule,
        ...(rawValue.schedule || {}),
        items:
          rawValue.schedule?.items && rawValue.schedule.items.length > 0
            ? rawValue.schedule.items
            : DEFAULT_LANDING_PAGE_CONFIG.schedule.items,
      },
      footer: { ...DEFAULT_LANDING_PAGE_CONFIG.footer, ...(rawValue.footer || {}) },
      materi: { ...DEFAULT_LANDING_PAGE_CONFIG.materi, ...(rawValue.materi || {}) },
      sections: (() => {
        const rawSections: SectionOrderItem[] = Array.isArray(rawValue.sections)
          ? rawValue.sections
          : []
        
        // 1. Normalize legacy aliases and filter obsolete sections
        const normalized: SectionOrderItem[] = []
        const seenIds = new Set<string>()

        for (const s of rawSections) {
          let id = s.id
          let title = s.title
          if (id === 'services') {
            id = 'quickActions'
            title = title || 'Akses Cepat Layanan Jemaat'
          } else if (id === 'materi') {
            id = 'khotbah'
            title = title || 'Ringkasan Khotbah'
          } else if (id === 'contact') {
            // Obsolete: contact info is rendered by PublicFooter
            continue
          }

          if (!seenIds.has(id)) {
            seenIds.add(id)
            normalized.push({ ...s, id, title })
          }
        }

        // 2. Add missing default sections
        let maxOrder = normalized.reduce((max, s) => Math.max(max, s.order || 0), 0)
        for (const defaultSec of DEFAULT_LANDING_PAGE_CONFIG.sections) {
          if (!seenIds.has(defaultSec.id)) {
            seenIds.add(defaultSec.id)
            maxOrder += 1
            normalized.push({ ...defaultSec, order: maxOrder })
          }
        }
        return normalized.sort((a, b) => a.order - b.order)
      })(),
    }

    const parsed = landingPageConfigSchema.safeParse(mergedConfig)
    if (!parsed.success) {
      console.warn('[LandingPageConfig] Invalid JSON in DB, falling back to defaults', parsed.error)
      return {
        success: true,
        data: DEFAULT_LANDING_PAGE_CONFIG,
        isCustomized: false,
      }
    }

    return {
      success: true,
      data: parsed.data,
      isCustomized: true,
    }
  } catch (error) {
    console.error('[getLandingPageConfigAction] Error:', error)
    return {
      success: true,
      data: DEFAULT_LANDING_PAGE_CONFIG,
      isCustomized: false,
    }
  }
}

/**
 * Save / Update Landing Page Configuration
 */
export async function updateLandingPageConfigAction(
  input: LandingPageConfig
): Promise<{ success: boolean; data?: LandingPageConfig; error?: string }> {
  try {
    const auth = await requireStaffSession('user.manage')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const staffActor = `${auth.user.nama} (${auth.user.role})`

    const validated = landingPageConfigSchema.parse(input)

    const updated = await (prisma as any).siteSetting.upsert({
      where: { key: SETTINGS_KEY },
      create: {
        key: SETTINGS_KEY,
        value: validated as any,
        updatedBy: staffActor,
      },
      update: {
        value: validated as any,
        updatedBy: staffActor,
      },
    })

    // Create Audit Log SHA-256
    await createAuditLog(
      staffActor,
      'UPDATE',
      'SITE_SETTING',
      updated.id,
      'Memperbarui konfigurasi & seksi Landing Page publik modern.'
    )

    // Revalidate public landing page and settings page
    revalidatePath('/')
    revalidatePath('/dashboard/settings/landing-page')

    return {
      success: true,
      data: validated,
    }
  } catch (error: any) {
    console.error('[updateLandingPageConfigAction] Error:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menyimpan pengaturan Landing Page.',
    }
  }
}

/**
 * Reset Landing Page Configuration to Initial Factory Defaults
 */
export async function resetLandingPageConfigAction(): Promise<{
  success: boolean
  data?: LandingPageConfig
  error?: string
}> {
  try {
    const auth = await requireStaffSession('user.manage')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const staffActor = `${auth.user.nama} (${auth.user.role})`

    await (prisma as any).siteSetting.deleteMany({
      where: { key: SETTINGS_KEY },
    })

    // Create Audit Log SHA-256
    await createAuditLog(
      staffActor,
      'DELETE',
      'SITE_SETTING',
      SETTINGS_KEY,
      'Mereset konfigurasi Landing Page kembali ke pengaturan bawaan awal.'
    )

    revalidatePath('/')
    revalidatePath('/dashboard/settings/landing-page')

    return {
      success: true,
      data: DEFAULT_LANDING_PAGE_CONFIG,
    }
  } catch (error: any) {
    console.error('[resetLandingPageConfigAction] Error:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mereset pengaturan Landing Page.',
    }
  }
}

/**
 * Upload Media File (Video or Image) for Landing Page
 */
export async function uploadLandingMediaAction(formData: FormData): Promise<{
  success: boolean
  fileUrl?: string
  error?: string
}> {
  try {
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Berkas tidak ditemukan atau kosong.' }
    }

    const isVideo = file.type.startsWith('video/')
    const maxSizeBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024 // 50MB for video, 10MB for image

    if (file.size > maxSizeBytes) {
      return {
        success: false,
        error: `Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal (${isVideo ? '50MB' : '10MB'}).`,
      }
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const folder = isVideo ? 'landing/videos' : 'landing/banners'
    const targetResourceType = isVideo ? 'video' : 'image'

    const storage = getStorageProvider(folder)
    const uploadResult = await storage.upload(file, folder)

    return {
      success: true,
      fileUrl: uploadResult.fileUrl,
    }
  } catch (error: any) {
    console.error('[uploadLandingMediaAction] Error:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengunggah berkas media ke Cloudinary.',
    }
  }
}

