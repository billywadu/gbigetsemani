'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  whatsappTemplatesConfigSchema,
  WhatsAppTemplatesConfig,
  DEFAULT_WHATSAPP_TEMPLATES_CONFIG,
} from '@/lib/validations/whatsapp-template'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

const SETTINGS_KEY = 'WHATSAPP_TEMPLATES_CONFIG'
const CURRENT_STAFF_ACTOR = 'Super Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

/**
 * Fetch WhatsApp Templates Configuration
 */
export async function getWhatsAppTemplatesAction(): Promise<{
  success: boolean
  data: WhatsAppTemplatesConfig
  isCustomized: boolean
  error?: string
}> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTINGS_KEY },
    })

    if (!setting || !setting.value) {
      return {
        success: true,
        data: DEFAULT_WHATSAPP_TEMPLATES_CONFIG,
        isCustomized: false,
      }
    }

    const rawVal = setting.value && typeof setting.value === 'object' ? setting.value : {}
    const merged = { ...DEFAULT_WHATSAPP_TEMPLATES_CONFIG, ...rawVal }
    const parsed = whatsappTemplatesConfigSchema.safeParse(merged)
    if (!parsed.success) {
      console.warn('[WhatsAppTemplates] Invalid JSON in DB, falling back to defaults', parsed.error)
      return {
        success: true,
        data: DEFAULT_WHATSAPP_TEMPLATES_CONFIG,
        isCustomized: false,
      }
    }

    return {
      success: true,
      data: parsed.data,
      isCustomized: true,
    }
  } catch (error: any) {
    console.error('Error fetching WhatsApp templates config:', error)
    return {
      success: false,
      data: DEFAULT_WHATSAPP_TEMPLATES_CONFIG,
      isCustomized: false,
      error: error?.message || 'Gagal memuat template WhatsApp.',
    }
  }
}

/**
 * Save & Update WhatsApp Templates Configuration
 */
export async function updateWhatsAppTemplatesAction(input: Partial<WhatsAppTemplatesConfig>): Promise<{
  success: boolean
  message?: string
  error?: string
  data?: WhatsAppTemplatesConfig
}> {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'user.manage') && CURRENT_STAFF_ROLE !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Hanya Super Administrator yang dapat mengubah Template WhatsApp.' }
    }

    const currentRes = await getWhatsAppTemplatesAction()
    const merged = { ...currentRes.data, ...input }
    const validated = whatsappTemplatesConfigSchema.parse(merged)

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
        'UPDATE_WHATSAPP_TEMPLATES',
        'SiteSetting',
        SETTINGS_KEY,
        JSON.stringify({ updatedKeys: Object.keys(input) }),
        undefined,
        tx
      )
    })

    try {
      revalidatePath('/dashboard/settings')
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/tamu')
      revalidatePath('/dashboard/doa')
    } catch {}

    return {
      success: true,
      message: 'Template Pesan WhatsApp berhasil disimpan.',
      data: validated,
    }
  } catch (error: any) {
    console.error('Error updating WhatsApp templates config:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menyimpan template WhatsApp.',
    }
  }
}

/**
 * Reset WhatsApp Templates Configuration to Defaults
 */
export async function resetWhatsAppTemplatesAction(): Promise<{
  success: boolean
  message?: string
  error?: string
  data?: WhatsAppTemplatesConfig
}> {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'user.manage') && CURRENT_STAFF_ROLE !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Hanya Super Administrator yang dapat mereset template WhatsApp.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.siteSetting.deleteMany({
        where: { key: SETTINGS_KEY },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'RESET_WHATSAPP_TEMPLATES',
        'SiteSetting',
        SETTINGS_KEY,
        'Template Pesan WhatsApp direset ke nilai standar.',
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
      message: 'Template Pesan WhatsApp berhasil dikembalikan ke pengaturan standar.',
      data: DEFAULT_WHATSAPP_TEMPLATES_CONFIG,
    }
  } catch (error: any) {
    console.error('Error resetting WhatsApp templates config:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mereset template WhatsApp.',
    }
  }
}
