'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  submitPermohonanDoaSchema,
  SubmitPermohonanDoaInput,
  updateStatusDoaSchema,
  UpdateStatusDoaInput,
  PermohonanDoaDTO,
  PermohonanDoaStatsDTO,
} from '@/lib/validations/doa'
import { createAuditLog } from '@/lib/jemaat-helpers'

import { requireStaffSession } from '@/lib/security/auth-guard'
import { checkRateLimit, RateLimitProfiles } from '@/lib/security/rate-limit'

/**
 * Public Prayer Request Submission Action (Protected with Centralized Rate Limiter)
 */
export async function submitPublicDoaAction(
  input: SubmitPermohonanDoaInput,
  clientIp = '127.0.0.1'
): Promise<{ success: boolean; data?: PermohonanDoaDTO; error?: string }> {
  try {
    // 1. Rate Limit Enforcement
    const rateLimit = checkRateLimit(`doa_ip_${clientIp}`, RateLimitProfiles.PUBLIC_PRAYER)
    if (!rateLimit.success) {
      return {
        success: false,
        error: `Batas pengiriman doa tercapai. Silakan coba kembali dalam ${Math.ceil((rateLimit.retryAfterSeconds || 60) / 60)} menit.`,
      }
    }

    // 2. Validate input
    const validated = submitPermohonanDoaSchema.parse(input)

    const displayName = validated.isAnonim ? 'Anonim (Hamba Tuhan)' : validated.namaPemohon

    const created = await (prisma as any).permohonanDoa.create({
      data: {
        namaPemohon: displayName,
        isAnonim: validated.isAnonim,
        kontakWa: validated.kontakWa || null,
        kategori: validated.kategori,
        privasi: validated.privasi,
        isiDoa: validated.isiDoa,
        status: 'BARU',
        ipAddress: clientIp,
      },
    })

    // Audit Log SHA-256
    await createAuditLog(
      `Publik (${displayName})`,
      'CREATE',
      'PERMOHONAN_DOA',
      created.id,
      `Mengirimkan permohonan doa baru kategori [${validated.kategori}] tingkat privasi [${validated.privasi}].`
    )

    revalidatePath('/dashboard/doa')

    return {
      success: true,
      data: {
        id: created.id,
        namaPemohon: created.namaPemohon,
        isAnonim: created.isAnonim,
        kontakWa: created.kontakWa,
        kategori: created.kategori,
        privasi: created.privasi,
        isiDoa: created.isiDoa,
        status: created.status,
        catatanPastoral: created.catatanPastoral,
        didoakanOleh: created.didoakanOleh,
        didoakanAt: created.didoakanAt ? created.didoakanAt.toISOString() : null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    }
  } catch (error: any) {
    console.error('[submitPublicDoaAction] Error:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengirimkan permohonan doa. Silakan periksa kembali input Anda.',
    }
  }
}

/**
 * Admin Action: Create Prayer Request manually from dashboard (Offline/Phone/Prayer Box)
 */
export async function createPermohonanDoaAdminAction(
  input: SubmitPermohonanDoaInput
): Promise<{ success: boolean; data?: PermohonanDoaDTO; error?: string }> {
  try {
    const auth = await requireStaffSession()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const staffActor = `${auth.user.nama} (${auth.user.role})`

    const validated = submitPermohonanDoaSchema.parse(input)
    const displayName = validated.isAnonim ? 'Anonim (Hamba Tuhan)' : validated.namaPemohon

    const created = await (prisma as any).permohonanDoa.create({
      data: {
        namaPemohon: displayName,
        isAnonim: validated.isAnonim,
        kontakWa: validated.kontakWa || null,
        kategori: validated.kategori,
        privasi: validated.privasi,
        isiDoa: validated.isiDoa,
        status: 'BARU',
      },
    })

    await createAuditLog(
      staffActor,
      'CREATE',
      'PERMOHONAN_DOA',
      created.id,
      `Menambahkan permohonan doa baru [${displayName}] kategori [${validated.kategori}].`
    )

    revalidatePath('/dashboard/doa')

    return {
      success: true,
      data: {
        id: created.id,
        namaPemohon: created.namaPemohon,
        isAnonim: created.isAnonim,
        kontakWa: created.kontakWa,
        kategori: created.kategori,
        privasi: created.privasi,
        isiDoa: created.isiDoa,
        status: created.status,
        catatanPastoral: created.catatanPastoral,
        didoakanOleh: created.didoakanOleh,
        didoakanAt: created.didoakanAt ? created.didoakanAt.toISOString() : null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    }
  } catch (error: any) {
    console.error('[createPermohonanDoaAdminAction] Error:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menambahkan permohonan doa.',
    }
  }
}

export interface GetDoaListParams {
  query?: string
  status?: string
  kategori?: string
  privasi?: string
  page?: number
  pageSize?: number
  showDeleted?: boolean
}

/**
 * Dashboard Action: Get List of Prayer Requests with Filters & KPI Stats
 */
export async function getPermohonanDoaListAction(params: GetDoaListParams = {}) {
  try {
    const auth = await requireStaffSession()
    if (!auth.success) {
      return {
        success: false,
        error: auth.error,
        data: [],
        stats: { total: 0, baru: 0, sedangDidoakan: 0, selesai: 0, terjawab: 0 },
        pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
      }
    }

    const page = Math.max(1, params.page || 1)
    const pageSize = Math.max(1, Math.min(100, params.pageSize || 10))
    const skip = (page - 1) * pageSize

    const where: any = {}

    // Soft delete filter
    if (params.showDeleted) {
      where.deletedAt = { not: null }
    } else {
      where.deletedAt = null
    }

    // Faceted filters
    if (params.status && params.status !== 'ALL') {
      where.status = params.status
    }
    if (params.kategori && params.kategori !== 'ALL') {
      where.kategori = params.kategori
    }
    if (params.privasi && params.privasi !== 'ALL') {
      where.privasi = params.privasi
    }

    // Search query
    if (params.query && params.query.trim()) {
      const q = params.query.trim()
      where.OR = [
        { namaPemohon: { contains: q, mode: 'insensitive' } },
        { isiDoa: { contains: q, mode: 'insensitive' } },
        { kontakWa: { contains: q, mode: 'insensitive' } },
        { didoakanOleh: { contains: q, mode: 'insensitive' } },
      ]
    }

    // Query Data & Total in Parallel
    const [rawItems, totalCount, statsData] = await Promise.all([
      (prisma as any).permohonanDoa.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).permohonanDoa.count({ where }),
      (prisma as any).permohonanDoa.findMany({
        where: { deletedAt: null },
        select: { status: true },
      }),
    ])

    // Calculate KPI Stats
    const stats: PermohonanDoaStatsDTO = {
      total: statsData.length,
      baru: statsData.filter((d: any) => d.status === 'BARU').length,
      sedangDidoakan: statsData.filter((d: any) => d.status === 'SEDANG_DIDOAKAN').length,
      selesai: statsData.filter((d: any) => d.status === 'SELESAI').length,
      terjawab: statsData.filter((d: any) => d.status === 'TERJAWAB').length,
    }

    const items: PermohonanDoaDTO[] = rawItems.map((item: any) => ({
      id: item.id,
      namaPemohon: item.namaPemohon,
      isAnonim: item.isAnonim,
      kontakWa: item.kontakWa,
      kategori: item.kategori,
      privasi: item.privasi,
      isiDoa: item.isiDoa,
      status: item.status,
      catatanPastoral: item.catatanPastoral,
      didoakanOleh: item.didoakanOleh,
      didoakanAt: item.didoakanAt ? item.didoakanAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      isDeleted: !!item.deletedAt,
    }))

    return {
      success: true,
      data: items,
      stats,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
      },
    }
  } catch (error: any) {
    console.error('[getPermohonanDoaListAction] Error:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat daftar permohonan doa.',
      data: [],
      stats: { total: 0, baru: 0, sedangDidoakan: 0, selesai: 0, terjawab: 0 },
      pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
    }
  }
}

/**
 * Dashboard Action: Update Status, Prayer Person, or Pastoral Note
 */
export async function updateStatusDoaAction(input: UpdateStatusDoaInput) {
  try {
    const auth = await requireStaffSession()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const staffActor = `${auth.user.nama} (${auth.user.role})`

    const validated = updateStatusDoaSchema.parse(input)

    const existing = await (prisma as any).permohonanDoa.findUnique({
      where: { id: validated.id },
    })

    if (!existing) {
      return { success: false, error: 'Data permohonan doa tidak ditemukan.' }
    }

    const updateData: any = {
      status: validated.status,
      catatanPastoral: validated.catatanPastoral !== undefined ? validated.catatanPastoral : existing.catatanPastoral,
    }

    if (validated.didoakanOleh !== undefined) {
      updateData.didoakanOleh = validated.didoakanOleh
    }

    if (validated.status !== 'BARU' && !existing.didoakanAt) {
      updateData.didoakanAt = new Date()
    }

    const updated = await (prisma as any).permohonanDoa.update({
      where: { id: validated.id },
      data: updateData,
    })

    // Audit Log SHA-256
    await createAuditLog(
      staffActor,
      'UPDATE',
      'PERMOHONAN_DOA',
      updated.id,
      `Mengubah status permohonan doa [${existing.namaPemohon}] menjadi [${validated.status}].`
    )

    revalidatePath('/dashboard/doa')

    return {
      success: true,
      data: updated,
    }
  } catch (error: any) {
    console.error('[updateStatusDoaAction] Error:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui status permohonan doa.',
    }
  }
}

/**
 * Soft Delete Prayer Request
 */
export async function softDeleteDoaAction(id: string, reason = 'Dihapus oleh admin') {
  try {
    const auth = await requireStaffSession()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const staffActor = `${auth.user.nama} (${auth.user.role})`

    const updated = await (prisma as any).permohonanDoa.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: staffActor,
        deletionReason: reason,
      },
    })

    await createAuditLog(
      staffActor,
      'SOFT_DELETE',
      'PERMOHONAN_DOA',
      id,
      `Menghapus sementara permohonan doa [${updated.namaPemohon}]: ${reason}`
    )

    revalidatePath('/dashboard/doa')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Gagal menghapus data.' }
  }
}

/**
 * Restore Soft-Deleted Prayer Request
 */
export async function restoreDoaAction(id: string) {
  try {
    const auth = await requireStaffSession()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const staffActor = `${auth.user.nama} (${auth.user.role})`

    const updated = await (prisma as any).permohonanDoa.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      },
    })

    await createAuditLog(
      staffActor,
      'RESTORE',
      'PERMOHONAN_DOA',
      id,
      `Memulihkan permohonan doa [${updated.namaPemohon}]`
    )

    revalidatePath('/dashboard/doa')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Gagal memulihkan data.' }
  }
}

/**
 * Permanent Hard Delete Prayer Request
 */
export async function permanentDeleteDoaAction(id: string) {
  try {
    const auth = await requireStaffSession()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    await (prisma as any).permohonanDoa.delete({
      where: { id },
    })

    await createAuditLog(
      auth.user.nama,
      'HARD_DELETE',
      'PERMOHONAN_DOA',
      id,
      `Menghapus permanen permohonan doa ID [${id}]`,
      auth.user.userId
    )

    revalidatePath('/dashboard/doa')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Gagal menghapus permanen.' }
  }
}

/**
 * Bulk Update Status for Prayer Requests
 */
export async function bulkUpdateStatusDoaAction(data: {
  ids: string[]
  status: 'BARU' | 'SEDANG_DIDOAKAN' | 'SELESAI'
  didoakanOleh?: string
  catatanPastoral?: string
}) {
  try {
    const auth = await requireStaffSession()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada pokok doa yang dipilih.' }
    }

    const updateData: any = {
      status: data.status,
    }

    if (data.status === 'SEDANG_DIDOAKAN' || data.status === 'SELESAI') {
      updateData.didoakanAt = new Date()
      if (data.didoakanOleh && data.didoakanOleh.trim()) {
        updateData.didoakanOleh = data.didoakanOleh.trim()
      } else {
        updateData.didoakanOleh = auth.user.nama
      }
    }

    if (data.catatanPastoral && data.catatanPastoral.trim()) {
      updateData.catatanPastoral = data.catatanPastoral.trim()
    }

    await (prisma as any).$transaction(async (tx: any) => {
      await tx.permohonanDoa.updateMany({
        where: { id: { in: data.ids } },
        data: updateData,
      })

      await createAuditLog(
        auth.user.nama,
        'UPDATE_BULK_STATUS',
        'PERMOHONAN_DOA',
        `${data.ids.length}_RECORDS`,
        `Mengubah status massal (${data.ids.length} pokok doa) menjadi [${data.status}].`,
        auth.user.userId,
        tx
      )
    })

    revalidatePath('/dashboard/doa')

    return {
      success: true,
      message: `Berhasil memperbarui status ${data.ids.length} pokok doa menjadi "${data.status}".`,
    }
  } catch (error: any) {
    console.error('[bulkUpdateStatusDoaAction] Error:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui status pokok doa.' }
  }
}

/**
 * Bulk Soft Delete Prayer Requests
 */
export async function bulkSoftDeleteDoaAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    const auth = await requireStaffSession()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada pokok doa yang dipilih.' }
    }

    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penghapusan massal wajib diisi.' }
    }

    const { ids, reason } = data

    await (prisma as any).$transaction(async (tx: any) => {
      await tx.permohonanDoa.updateMany({
        where: { id: { in: ids } },
        data: {
          deletedAt: new Date(),
          deletedBy: auth.user.nama,
          deletionReason: reason.trim(),
        },
      })

      await createAuditLog(
        auth.user.nama,
        'DELETE_BULK_SOFT',
        'PERMOHONAN_DOA',
        `${ids.length}_RECORDS`,
        `Soft delete massal (${ids.length} pokok doa). Alasan: ${reason.trim()}`,
        auth.user.userId,
        tx
      )
    })

    revalidatePath('/dashboard/doa')

    return {
      success: true,
      message: `${ids.length} permohonan doa berhasil dipindahkan ke kotak sampah.`,
    }
  } catch (error: any) {
    console.error('[bulkSoftDeleteDoaAction] Error:', error)
    return { success: false, error: error?.message || 'Gagal menghapus permohonan doa terpilih.' }
  }
}

/**
 * Get Full Prayer Requests for Official A4 Print Sheets
 */
export async function getDoaForPrintSheetsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada pokok doa yang dipilih.', data: [] }
    }

    const items = await (prisma as any).permohonanDoa.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      data: items,
    }
  } catch (error: any) {
    console.error('[getDoaForPrintSheetsAction] Error:', error)
    return { success: false, error: error?.message || 'Gagal memuat data lembar doa.', data: [] }
  }
}
