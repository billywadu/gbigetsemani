'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  printLayoutConfigSchema,
  PrintLayoutConfig,
  DEFAULT_PRINT_LAYOUT_CONFIG,
} from '@/lib/validations/print-layout'
import { getStorageProvider } from '@/lib/storage'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

const SETTINGS_KEY = 'PRINT_LAYOUT_CONFIG'
const CURRENT_STAFF_ACTOR = 'Administrator / Gembala'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

/**
 * Fetch Universal Print Layout Configuration with PostgreSQL Fallback
 */
export async function getPrintLayoutConfigAction(): Promise<{
  success: boolean
  data: PrintLayoutConfig
  isCustomized: boolean
}> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTINGS_KEY },
    })

    if (!setting || !setting.value) {
      return {
        success: true,
        data: DEFAULT_PRINT_LAYOUT_CONFIG,
        isCustomized: false,
      }
    }

    const parsed = printLayoutConfigSchema.safeParse(setting.value)
    if (!parsed.success) {
      console.warn('[PrintLayoutConfig] Invalid JSON in DB, falling back to defaults', parsed.error)
      return {
        success: true,
        data: DEFAULT_PRINT_LAYOUT_CONFIG,
        isCustomized: false,
      }
    }

    return {
      success: true,
      data: parsed.data,
      isCustomized: true,
    }
  } catch (error: any) {
    console.error('Error fetching print layout config:', error)
    return {
      success: false,
      data: DEFAULT_PRINT_LAYOUT_CONFIG,
      isCustomized: false,
    }
  }
}

/**
 * Save & Update Universal Print Layout Configuration with File Upload Support
 */
export async function updatePrintLayoutConfigAction(formData: FormData): Promise<{
  success: boolean
  message?: string
  error?: string
  data?: PrintLayoutConfig
}> {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'user.manage') && CURRENT_STAFF_ROLE !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mengedit pengaturan cetak.' }
    }

    // 1. Fetch current config to preserve existing URLs/IDs if not replaced
    const currentRes = await getPrintLayoutConfigAction()
    const current = currentRes.data

    const rawJsonStr = formData.get('configJson') as string
    if (!rawJsonStr) {
      return { success: false, error: 'Data konfigurasi cetak tidak ditemukan.' }
    }

    let parsedBody: PrintLayoutConfig
    try {
      parsedBody = JSON.parse(rawJsonStr)
    } catch {
      return { success: false, error: 'Format data JSON konfigurasi tidak valid.' }
    }

    const brandStorage = getStorageProvider('public/uploads/brand')
    const sigStorage = getStorageProvider('public/uploads/signatures')

    // 2. Handle Logo Upload
    const logoFile = formData.get('logoFile') as File | null
    if (logoFile && logoFile instanceof File && logoFile.size > 0) {
      const uploadRes = await brandStorage.upload(logoFile)
      parsedBody.kop.logoUrl = uploadRes.fileUrl
      parsedBody.kop.logoCloudinaryId = uploadRes.identifier
    } else if (parsedBody.kop.logoUrl === null) {
      parsedBody.kop.logoCloudinaryId = null
    }

    // 3. Handle Stempel Upload
    const stempelFile = formData.get('stempelFile') as File | null
    if (stempelFile && stempelFile instanceof File && stempelFile.size > 0) {
      const uploadRes = await sigStorage.upload(stempelFile)
      parsedBody.stempel.stempelUrl = uploadRes.fileUrl
      parsedBody.stempel.stempelCloudinaryId = uploadRes.identifier
    } else if (parsedBody.stempel.stempelUrl === null) {
      parsedBody.stempel.stempelCloudinaryId = null
    }

    // 4. Handle Gembala TTD Upload
    const gembalaTtdFile = formData.get('gembalaTtdFile') as File | null
    if (gembalaTtdFile && gembalaTtdFile instanceof File && gembalaTtdFile.size > 0) {
      const uploadRes = await sigStorage.upload(gembalaTtdFile)
      parsedBody.signatories.gembala.ttdUrl = uploadRes.fileUrl
      parsedBody.signatories.gembala.cloudinaryPublicId = uploadRes.identifier
    } else if (parsedBody.signatories.gembala.ttdUrl === null) {
      parsedBody.signatories.gembala.cloudinaryPublicId = null
    }

    // 5. Handle Sekretaris TTD Upload
    const sekretarisTtdFile = formData.get('sekretarisTtdFile') as File | null
    if (sekretarisTtdFile && sekretarisTtdFile instanceof File && sekretarisTtdFile.size > 0) {
      const uploadRes = await sigStorage.upload(sekretarisTtdFile)
      parsedBody.signatories.sekretaris.ttdUrl = uploadRes.fileUrl
      parsedBody.signatories.sekretaris.cloudinaryPublicId = uploadRes.identifier
    } else if (parsedBody.signatories.sekretaris.ttdUrl === null) {
      parsedBody.signatories.sekretaris.cloudinaryPublicId = null
    }

    // 6. Handle Bendahara TTD Upload
    const bendaharaTtdFile = formData.get('bendaharaTtdFile') as File | null
    if (bendaharaTtdFile && bendaharaTtdFile instanceof File && bendaharaTtdFile.size > 0) {
      const uploadRes = await sigStorage.upload(bendaharaTtdFile)
      parsedBody.signatories.bendahara.ttdUrl = uploadRes.fileUrl
      parsedBody.signatories.bendahara.cloudinaryPublicId = uploadRes.identifier
    } else if (parsedBody.signatories.bendahara.ttdUrl === null) {
      parsedBody.signatories.bendahara.cloudinaryPublicId = null
    }

    // 7. Handle Ketua Majelis TTD Upload
    const ketuaMajelisTtdFile = formData.get('ketuaMajelisTtdFile') as File | null
    if (ketuaMajelisTtdFile && ketuaMajelisTtdFile instanceof File && ketuaMajelisTtdFile.size > 0) {
      const uploadRes = await sigStorage.upload(ketuaMajelisTtdFile)
      parsedBody.signatories.ketuaMajelis.ttdUrl = uploadRes.fileUrl
      parsedBody.signatories.ketuaMajelis.cloudinaryPublicId = uploadRes.identifier
    } else if (parsedBody.signatories.ketuaMajelis.ttdUrl === null) {
      parsedBody.signatories.ketuaMajelis.cloudinaryPublicId = null
    }

    // 8. Handle Koordinator Divisi TTD Upload
    const koordinatorDivisiTtdFile = formData.get('koordinatorDivisiTtdFile') as File | null
    if (koordinatorDivisiTtdFile && koordinatorDivisiTtdFile instanceof File && koordinatorDivisiTtdFile.size > 0) {
      const uploadRes = await sigStorage.upload(koordinatorDivisiTtdFile)
      parsedBody.signatories.koordinatorDivisi.ttdUrl = uploadRes.fileUrl
      parsedBody.signatories.koordinatorDivisi.cloudinaryPublicId = uploadRes.identifier
    } else if (parsedBody.signatories.koordinatorDivisi.ttdUrl === null) {
      parsedBody.signatories.koordinatorDivisi.cloudinaryPublicId = null
    }

    // 9. Handle Pembina Kategorial TTD Upload
    const pembinaKategorialTtdFile = formData.get('pembinaKategorialTtdFile') as File | null
    if (pembinaKategorialTtdFile && pembinaKategorialTtdFile instanceof File && pembinaKategorialTtdFile.size > 0) {
      const uploadRes = await sigStorage.upload(pembinaKategorialTtdFile)
      parsedBody.signatories.pembinaKategorial.ttdUrl = uploadRes.fileUrl
      parsedBody.signatories.pembinaKategorial.cloudinaryPublicId = uploadRes.identifier
    } else if (parsedBody.signatories.pembinaKategorial.ttdUrl === null) {
      parsedBody.signatories.pembinaKategorial.cloudinaryPublicId = null
    }

    // 10. Handle Koordinator Komsel TTD Upload
    const koordinatorKomselTtdFile = formData.get('koordinatorKomselTtdFile') as File | null
    if (koordinatorKomselTtdFile && koordinatorKomselTtdFile instanceof File && koordinatorKomselTtdFile.size > 0) {
      const uploadRes = await sigStorage.upload(koordinatorKomselTtdFile)
      parsedBody.signatories.koordinatorKomsel.ttdUrl = uploadRes.fileUrl
      parsedBody.signatories.koordinatorKomsel.cloudinaryPublicId = uploadRes.identifier
    } else if (parsedBody.signatories.koordinatorKomsel.ttdUrl === null) {
      parsedBody.signatories.koordinatorKomsel.cloudinaryPublicId = null
    }

    // 11. Handle Ketua Pendidikan / Kurikulum TTD Upload
    const ketuaPendidikanTtdFile = formData.get('ketuaPendidikanTtdFile') as File | null
    if (ketuaPendidikanTtdFile && ketuaPendidikanTtdFile instanceof File && ketuaPendidikanTtdFile.size > 0) {
      const uploadRes = await sigStorage.upload(ketuaPendidikanTtdFile)
      parsedBody.signatories.ketuaPendidikan.ttdUrl = uploadRes.fileUrl
      parsedBody.signatories.ketuaPendidikan.cloudinaryPublicId = uploadRes.identifier
    } else if (parsedBody.signatories.ketuaPendidikan.ttdUrl === null) {
      parsedBody.signatories.ketuaPendidikan.cloudinaryPublicId = null
    }

    // 9. Zod Validation
    const validated = printLayoutConfigSchema.parse(parsedBody)

    // 10. Upsert to SiteSetting
    await prisma.$transaction(async (tx) => {
      await tx.siteSetting.upsert({
        where: { key: SETTINGS_KEY },
        update: {
          value: validated as any,
          updatedBy: CURRENT_STAFF_ACTOR,
        },
        create: {
          key: SETTINGS_KEY,
          value: validated as any,
          updatedBy: CURRENT_STAFF_ACTOR,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'UPDATE_PRINT_LAYOUT_CONFIG',
        'SiteSetting',
        SETTINGS_KEY,
        `Memperbarui konfigurasi kop surat dan tanda tangan cetak/PDF gereja.`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/settings/cetak')
    revalidatePath('/dashboard/keuangan')
    revalidatePath('/dashboard/keuangan/laporan-gabungan')
    revalidatePath('/dashboard/event')
    revalidatePath('/dashboard/dokumen-jemaat')
    revalidatePath('/dashboard/arsip-gereja')
    revalidatePath('/dashboard/materi')

    return {
      success: true,
      message: 'Pengaturan kop cetak dan tanda tangan digital berhasil disimpan.',
      data: validated,
    }
  } catch (error: any) {
    console.error('Error in updatePrintLayoutConfigAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menyimpan konfigurasi cetak & PDF.',
    }
  }
}

/**
 * Reset Print Layout Config to Defaults
 */
export async function resetPrintLayoutConfigAction(): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'user.manage') && CURRENT_STAFF_ROLE !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mereset pengaturan.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.siteSetting.upsert({
        where: { key: SETTINGS_KEY },
        update: {
          value: DEFAULT_PRINT_LAYOUT_CONFIG as any,
          updatedBy: CURRENT_STAFF_ACTOR,
        },
        create: {
          key: SETTINGS_KEY,
          value: DEFAULT_PRINT_LAYOUT_CONFIG as any,
          updatedBy: CURRENT_STAFF_ACTOR,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'RESET_PRINT_LAYOUT_CONFIG',
        'SiteSetting',
        SETTINGS_KEY,
        `Mereset konfigurasi kop cetak dan tanda tangan ke format bawaan gereja.`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/settings/cetak')

    return {
      success: true,
      message: 'Konfigurasi cetak berhasil direset ke format standar.',
    }
  } catch (error: any) {
    console.error('Error in resetPrintLayoutConfigAction:', error)
    return { success: false, error: error?.message || 'Gagal mereset konfigurasi.' }
  }
}
