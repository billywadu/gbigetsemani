'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  appProfileConfigSchema,
  AppProfileConfig,
  DEFAULT_APP_PROFILE_CONFIG,
} from '@/lib/validations/app-profile'
import { getStorageProvider } from '@/lib/storage'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

const SETTINGS_KEY = 'APP_PROFILE_CONFIG'
const CURRENT_STAFF_ACTOR = 'Super Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

/**
 * Fetch Church/App Profile Configuration with DB Fallback
 */
export async function getAppProfileAction(): Promise<{
  success: boolean
  data: AppProfileConfig
  isCustomized: boolean
}> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTINGS_KEY },
    })

    if (!setting || !setting.value) {
      return {
        success: true,
        data: DEFAULT_APP_PROFILE_CONFIG,
        isCustomized: false,
      }
    }

    const parsed = appProfileConfigSchema.safeParse(setting.value)
    if (!parsed.success) {
      console.warn('[AppProfileConfig] Invalid JSON in DB, falling back to defaults', parsed.error)
      return {
        success: true,
        data: DEFAULT_APP_PROFILE_CONFIG,
        isCustomized: false,
      }
    }

    return {
      success: true,
      data: parsed.data,
      isCustomized: true,
    }
  } catch (error: any) {
    console.error('Error fetching app profile config:', error)
    return {
      success: false,
      data: DEFAULT_APP_PROFILE_CONFIG,
      isCustomized: false,
    }
  }
}

/**
 * Save & Update Church/App Profile Configuration with File Upload & Automatic Sync
 */
export async function updateAppProfileAction(formData: FormData): Promise<{
  success: boolean
  message?: string
  error?: string
  data?: AppProfileConfig
}> {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'user.manage') && CURRENT_STAFF_ROLE !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Hanya Super Administrator yang dapat mengubah Pengaturan Aplikasi.' }
    }

    // 1. Fetch current config
    const currentRes = await getAppProfileAction()
    let currentConfig: AppProfileConfig = currentRes.data

    // 2. Parse payload
    const configJson = formData.get('configJson') as string | null
    if (configJson) {
      try {
        const parsedIncoming = JSON.parse(configJson)
        currentConfig = { ...currentConfig, ...parsedIncoming }
      } catch (e) {
        return { success: false, error: 'Format konfigurasi JSON tidak valid.' }
      }
    }

    const storage = getStorageProvider('public/uploads/app')

    // 3. Handle Logo Upload
    const logoFile = formData.get('logoFile') as File | null
    if (logoFile && logoFile instanceof File && logoFile.size > 0) {
      const uploadRes = await storage.upload(logoFile)
      currentConfig.logoUrl = uploadRes.fileUrl
      currentConfig.logoCloudinaryId = uploadRes.identifier || null
    }

    // 4. Handle Favicon Upload
    const faviconFile = formData.get('faviconFile') as File | null
    if (faviconFile && faviconFile instanceof File && faviconFile.size > 0) {
      const uploadFaviconRes = await storage.upload(faviconFile)
      currentConfig.faviconUrl = uploadFaviconRes.fileUrl
    }

    // 5. Validate final structure
    const validated = appProfileConfigSchema.parse(currentConfig)

    // 6. Save in DB via Transaction and Sync with Dependent Settings
    await prisma.$transaction(async (tx) => {
      await tx.siteSetting.upsert({
        where: { key: SETTINGS_KEY },
        create: {
          key: SETTINGS_KEY,
          value: validated as any,
          updatedBy: CURRENT_STAFF_ACTOR,
        },
        update: {
          value: validated as any,
          updatedBy: CURRENT_STAFF_ACTOR,
        },
      })

      // Sync Kop Surat in Print Layout if existing
      const printSetting = await tx.siteSetting.findUnique({
        where: { key: 'PRINT_LAYOUT_CONFIG' },
      })
      if (printSetting && printSetting.value && typeof printSetting.value === 'object') {
        const pVal = printSetting.value as any
        if (pVal.kop) {
          pVal.kop.namaGereja = validated.namaResmi
          pVal.kop.subJudul = `${validated.alamat}, ${validated.kota} - ${validated.provinsi}`
          pVal.kop.kontak = `Telp: ${validated.telepon} | Email: ${validated.email} | Web: ${validated.website}`
          pVal.kop.nomorIzin = validated.nomorIzin
          if (validated.logoUrl) {
            pVal.kop.logoUrl = validated.logoUrl
            pVal.kop.logoCloudinaryId = validated.logoCloudinaryId
          }
          await tx.siteSetting.update({
            where: { key: 'PRINT_LAYOUT_CONFIG' },
            data: { value: pVal, updatedBy: CURRENT_STAFF_ACTOR },
          })
        }
      }

      // Sync Footer in Landing Page if existing
      const landingSetting = await tx.siteSetting.findUnique({
        where: { key: 'LANDING_PAGE_CONFIG' },
      })
      if (landingSetting && landingSetting.value && typeof landingSetting.value === 'object') {
        const lVal = landingSetting.value as any
        if (lVal.footer) {
          lVal.footer.churchName = validated.namaSingkat
          lVal.footer.tagline = validated.tagline
          lVal.footer.alamat = `${validated.alamat}, ${validated.kota}, ${validated.provinsi} ${validated.kodePos}`
          lVal.footer.telepon = `${validated.telepon} / ${validated.whatsAppCenter}`
          lVal.footer.email = validated.email
          lVal.footer.copyrightText = `© ${new Date().getFullYear()} ${validated.namaSingkat}. Dilindungi Hak Cipta & UU PDP No. 27/2022.`
          await tx.siteSetting.update({
            where: { key: 'LANDING_PAGE_CONFIG' },
            data: { value: lVal, updatedBy: CURRENT_STAFF_ACTOR },
          })
        }
        if (lVal.hero) {
          lVal.hero.titleHighlight = validated.namaSingkat
          lVal.hero.description = validated.tagline
        }
      }

      // Audit Trail
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'UPDATE_APP_PROFILE',
        'SiteSetting',
        SETTINGS_KEY,
        JSON.stringify({
          namaResmi: validated.namaResmi,
          namaSingkat: validated.namaSingkat,
          logoUrl: validated.logoUrl,
          faviconUrl: validated.faviconUrl,
        }),
        undefined,
        tx
      )
    })

    // Revalidate paths across the app
    try {
      revalidatePath('/dashboard/settings')
      revalidatePath('/dashboard/settings/cetak')
      revalidatePath('/dashboard/settings/landing-page')
      revalidatePath('/dashboard')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: 'Profil Gereja & Identitas Aplikasi berhasil diperbarui dan disinkronkan ke seluruh modul.',
      data: validated,
    }
  } catch (error: any) {
    console.error('Error updating app profile config:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menyimpan profil aplikasi.',
    }
  }
}

/**
 * Reset App Profile Configuration to Defaults
 */
export async function resetAppProfileAction(): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'user.manage') && CURRENT_STAFF_ROLE !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Hanya Super Administrator yang dapat mereset profil aplikasi.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.siteSetting.deleteMany({
        where: { key: SETTINGS_KEY },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'RESET_APP_PROFILE',
        'SiteSetting',
        SETTINGS_KEY,
        'Pengaturan Profil Gereja & Identitas Aplikasi direset ke nilai standar.',
        undefined,
        tx
      )
    })

    try {
      revalidatePath('/dashboard/settings')
      revalidatePath('/dashboard')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: 'Profil aplikasi berhasil dikembalikan ke standar bawaan.',
    }
  } catch (error: any) {
    console.error('Error resetting app profile config:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mereset profil aplikasi.',
    }
  }
}
