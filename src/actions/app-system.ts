'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  appSystemConfigSchema,
  AppSystemConfig,
  DEFAULT_APP_SYSTEM_CONFIG,
} from '@/lib/validations/app-system'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

const SETTINGS_KEY = 'APP_SYSTEM_CONFIG'
const CURRENT_STAFF_ACTOR = 'Super Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

/**
 * Fetch System & Preferences Configuration
 */
export async function getAppSystemConfigAction(): Promise<{
  success: boolean
  data: AppSystemConfig
  isCustomized: boolean
}> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTINGS_KEY },
    })

    if (!setting || !setting.value) {
      return {
        success: true,
        data: DEFAULT_APP_SYSTEM_CONFIG,
        isCustomized: false,
      }
    }

    const parsed = appSystemConfigSchema.safeParse(setting.value)
    if (!parsed.success) {
      console.warn('[AppSystemConfig] Invalid JSON in DB, falling back to defaults', parsed.error)
      return {
        success: true,
        data: DEFAULT_APP_SYSTEM_CONFIG,
        isCustomized: false,
      }
    }

    return {
      success: true,
      data: parsed.data,
      isCustomized: true,
    }
  } catch (error: any) {
    console.error('Error fetching system config:', error)
    return {
      success: false,
      data: DEFAULT_APP_SYSTEM_CONFIG,
      isCustomized: false,
    }
  }
}

/**
 * Save & Update System & Preferences Configuration
 */
export async function updateAppSystemConfigAction(input: Partial<AppSystemConfig>): Promise<{
  success: boolean
  message?: string
  error?: string
  data?: AppSystemConfig
}> {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'user.manage') && CURRENT_STAFF_ROLE !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Hanya Super Administrator yang dapat mengubah Pengaturan Sistem.' }
    }

    const currentRes = await getAppSystemConfigAction()
    const merged = { ...currentRes.data, ...input }
    const validated = appSystemConfigSchema.parse(merged)

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

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'UPDATE_APP_SYSTEM_CONFIG',
        'SiteSetting',
        SETTINGS_KEY,
        JSON.stringify(validated),
        undefined,
        tx
      )
    })

    try {
      revalidatePath('/dashboard/settings')
      revalidatePath('/dashboard')
    } catch {}

    return {
      success: true,
      message: 'Preferensi dan Pengaturan Sistem berhasil disimpan.',
      data: validated,
    }
  } catch (error: any) {
    console.error('Error updating app system config:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menyimpan pengaturan sistem.',
    }
  }
}

/**
 * Reset System Configuration to Defaults
 */
export async function resetAppSystemConfigAction(): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'user.manage') && CURRENT_STAFF_ROLE !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Hanya Super Administrator yang dapat mereset pengaturan sistem.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.siteSetting.deleteMany({
        where: { key: SETTINGS_KEY },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'RESET_APP_SYSTEM_CONFIG',
        'SiteSetting',
        SETTINGS_KEY,
        'Pengaturan Sistem & Preferensi direset ke nilai standar.',
        undefined,
        tx
      )
    })

    try {
      revalidatePath('/dashboard/settings')
      revalidatePath('/dashboard')
    } catch {}

    return {
      success: true,
      message: 'Pengaturan sistem berhasil dikembalikan ke standar bawaan.',
    }
  } catch (error: any) {
    console.error('Error resetting app system config:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mereset pengaturan sistem.',
    }
  }
}
