'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  createKategorialSchema,
  updateKategorialSchema,
  addAnggotaKategorialSchema,
  removeAnggotaKategorialSchema,
  updateAnggotaKategorialSchema,
  deleteKategorialSchema,
  restoreKategorialSchema,
  hardDeleteKategorialSchema,
  kategorialFilterSchema,
  CreateKategorialInput,
  UpdateKategorialInput,
  AddAnggotaKategorialInput,
  RemoveAnggotaKategorialInput,
  UpdateAnggotaKategorialInput,
  DeleteKategorialInput,
  RestoreKategorialInput,
  HardDeleteKategorialInput,
  KategorialFilterParams,
} from '@/lib/validations/kategorial'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission, isUserAssignedToKategorial } from '@/lib/permissions'
import { Role } from '@/config/navigation'
import { getCurrentStaffSession } from '@/lib/security/session'

const CURRENT_STAFF_ACTOR = 'Staff Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

async function getKategorialActor() {
  try {
    const session = await getCurrentStaffSession()
    if (session?.user) {
      return {
        userId: session.user.id,
        name: session.user.nama || session.user.username,
        role: session.user.role as Role,
        kategorialScopes: session.user.kategorialScopes || [],
      }
    }
  } catch {}
  return {
    userId: 'system',
    name: CURRENT_STAFF_ACTOR,
    role: CURRENT_STAFF_ROLE,
    kategorialScopes: [],
  }
}

/**
 * Get Paginated Kategorial List
 */
export async function getKategorialListAction(params?: KategorialFilterParams) {
  try {
    // Ensure permanent system-default "Umum" category exists
    await getOrCreateDefaultKategorial(prisma)

    const actor = await getKategorialActor()
    const validated = kategorialFilterSchema.parse(params || {})
    const { search, statusHapus = 'ACTIVE', page, pageSize } = validated

    const whereClause: any = {}

    // Scoped restriction for SEKRETARIS_KATEGORIAL
    if (actor.role === 'SEKRETARIS_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId)
      whereClause.id = { in: assignedIds }
    }

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }
    // If 'ALL', no deletedAt filter is applied

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { nama: { contains: q, mode: 'insensitive' } },
        { deskripsi: { contains: q, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.kategorial.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: [{ isDefault: 'desc' }, { nama: 'asc' }],
        include: {
          _count: {
            select: { anggotaKategorial: true },
          },
        },
      }),
      prisma.kategorial.count({ where: whereClause }),
    ])

    const formattedItems = items.map((kat) => ({
      ...kat,
      totalAnggota: kat._count.anggotaKategorial,
    }))

    const totalPages = Math.ceil(total / pageSize) || 1

    return {
      success: true,
      data: {
        items: formattedItems,
        total,
        page,
        pageSize,
        totalPages,
      },
    }
  } catch (error: any) {
    console.error('Error in getKategorialListAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat data kategorial.',
    }
  }
}

/**
 * Get Kategorial Detail by ID with Full Member List
 */
export async function getKategorialByIdAction(id: string) {
  try {
    if (!id) throw new Error('ID Kategorial wajib disertakan.')
    const actor = await getKategorialActor()

    // Scoped access verification
    if (!isUserAssignedToKategorial(actor as any, id)) {
      return {
        success: false,
        error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengakses data kategorial ini.',
      }
    }

    const kategorial = await prisma.kategorial.findFirst({
      where: { id, deletedAt: null },
      include: {
        anggotaKategorial: {
          include: {
            jemaat: {
              select: {
                id: true,
                nama: true,
                namaPanggilan: true,
                nij: true,
                jenisKelamin: true,
                tanggalLahir: true,
                statusJemaat: true,
                statusBaptis: true,
                statusPernikahan: true,
                noHp: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!kategorial) {
      return {
        success: false,
        error: 'Data Kategorial tidak ditemukan atau telah dihapus.',
      }
    }

    return {
      success: true,
      data: {
        ...kategorial,
        totalAnggota: kategorial.anggotaKategorial.length,
      },
    }
  } catch (error: any) {
    console.error('Error in getKategorialByIdAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengambil detail kategorial.',
    }
  }
}

/**
 * Helper to retrieve or lazily ensure System-Default "Umum" Kategorial within a transaction
 */
export async function getOrCreateDefaultKategorial(tx: any) {
  let defaultKat = await tx.kategorial.findFirst({
    where: {
      isDefault: true,
      deletedAt: null,
    },
  })

  if (!defaultKat) {
    defaultKat = await tx.kategorial.findFirst({
      where: {
        nama: { equals: 'Umum', mode: 'insensitive' },
      },
    })
  }

  if (!defaultKat) {
    defaultKat = await tx.kategorial.create({
      data: {
        nama: 'Umum',
        deskripsi: 'Kategori jemaat umum bawaan sistem. Seluruh jemaat baru secara otomatis masuk ke kategori ini.',
        isDefault: true,
        totalAnggota: 0,
      },
    })
  } else if (!defaultKat.isDefault || defaultKat.deletedAt) {
    defaultKat = await tx.kategorial.update({
      where: { id: defaultKat.id },
      data: {
        isDefault: true,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      },
    })
  }

  return defaultKat
}

/**
 * Create Custom Kategorial (isDefault = false)
 */
export async function createKategorialAction(input: CreateKategorialInput) {
  try {
    const actor = await getKategorialActor()
    if (actor.role === 'SEKRETARIS_KATEGORIAL') {
      return {
        success: false,
        error: 'Akses ditolak: Pengurus Kategorial tidak memiliki wewenang membuat departemen kategorial baru.',
      }
    }
    if (!hasPermission(actor.role, 'kategorial.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin kategorial.manage.' }
    }

    const validated = createKategorialSchema.parse(input)

    // Reject attempt to create category named "Umum" as it is reserved for system default
    if (validated.nama.trim().toLowerCase() === 'umum') {
      return {
        success: false,
        error: 'Nama "Umum" dicadangkan sebagai Kategori Default Sistem dan tidak dapat dibuat ulang.',
      }
    }

    const existing = await prisma.kategorial.findFirst({
      where: {
        nama: { equals: validated.nama, mode: 'insensitive' },
        deletedAt: null,
      },
    })

    if (existing) {
      return { success: false, error: `Kategorial dengan nama "${validated.nama}" sudah ada.` }
    }

    const created = await prisma.$transaction(async (tx) => {
      const res = await tx.kategorial.create({
        data: {
          nama: validated.nama,
          deskripsi: validated.deskripsi || null,
          isDefault: false,
          totalAnggota: 0,
        },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KATEGORIAL_CREATED',
        'Kategorial',
        res.id,
        `Created Custom Kategorial "${res.nama}"`,
        undefined,
        tx
      )

      return res
    })

    try { revalidatePath('/dashboard/kategorial') } catch {}

    return {
      success: true,
      data: created,
    }
  } catch (error: any) {
    console.error('Error in createKategorialAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal membuat kategorial baru.',
    }
  }
}

/**
 * Update Kategorial (Custom or Default)
 */
export async function updateKategorialAction(input: UpdateKategorialInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'kategorial.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin kategorial.manage.' }
    }

    const validated = updateKategorialSchema.parse(input)
    const existing = await prisma.kategorial.findUnique({
      where: { id: validated.id },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Kategorial tidak ditemukan.' }
    }

    // STRICT ZERO-TRUST IMMUTABILITY FOR DEFAULT KATEGORIAL "UMUM"
    const isProtectedDefault = existing.isDefault || existing.nama.toLowerCase() === 'umum'

    if (isProtectedDefault && validated.nama.trim().toLowerCase() !== 'umum') {
      return {
        success: false,
        error: 'Kategorial "Umum" adalah kategori default sistem yang dilindungi dan namanya tidak dapat diubah.',
      }
    }

    // Unique name check excluding current
    const duplicate = await prisma.kategorial.findFirst({
      where: {
        nama: { equals: validated.nama, mode: 'insensitive' },
        id: { not: validated.id },
        deletedAt: null,
      },
    })

    if (duplicate) {
      return { success: false, error: `Kategorial dengan nama "${validated.nama}" sudah ada.` }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.kategorial.update({
        where: { id: validated.id },
        data: {
          nama: isProtectedDefault ? 'Umum' : validated.nama,
          deskripsi: validated.deskripsi !== undefined ? validated.deskripsi : existing.deskripsi,
          isDefault: isProtectedDefault ? true : existing.isDefault,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KATEGORIAL_UPDATED',
        'Kategorial',
        res.id,
        `Updated Kategorial "${res.nama}"`,
        undefined,
        tx
      )

      return res
    })

    try { revalidatePath('/dashboard/kategorial') } catch {}
    try { revalidatePath(`/dashboard/kategorial/${validated.id}`) } catch {}

    return {
      success: true,
      data: updated,
    }
  } catch (error: any) {
    console.error('Error in updateKategorialAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui kategorial.',
    }
  }
}

/**
 * Add Member to Kategorial
 */
export async function addAnggotaKategorialAction(input: AddAnggotaKategorialInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'kategorial.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin kategorial.manage.' }
    }

    const validated = addAnggotaKategorialSchema.parse(input)

    const result = await prisma.$transaction(async (tx) => {
      const kategorial = await tx.kategorial.findUnique({
        where: { id: validated.kategorialId },
      })
      if (!kategorial || kategorial.deletedAt) {
        throw new Error('Kategorial tidak ditemukan.')
      }

      const jemaat = await tx.jemaat.findUnique({
        where: { id: validated.jemaatId },
      })
      if (!jemaat || jemaat.deletedAt) {
        throw new Error('Jemaat tidak ditemukan.')
      }

      // Check if already in this Kategorial
      const existingRel = await tx.anggotaKategorial.findUnique({
        where: {
          kategorialId_jemaatId: {
            kategorialId: validated.kategorialId,
            jemaatId: validated.jemaatId,
          },
        },
      })

      if (existingRel) {
        throw new Error(`Jemaat ${jemaat.nama} (${jemaat.nij}) sudah terdaftar dalam kategorial ${kategorial.nama}.`)
      }

      // Create AnggotaKategorial
      const newAnggota = await tx.anggotaKategorial.create({
        data: {
          kategorialId: validated.kategorialId,
          jemaatId: validated.jemaatId,
          catatan: validated.catatan || null,
        },
      })

      // Set Jemaat.kategorialId as primary kategorial
      await tx.jemaat.update({
        where: { id: validated.jemaatId },
        data: { kategorialId: validated.kategorialId },
      })

      // Sync count
      const count = await tx.anggotaKategorial.count({
        where: { kategorialId: validated.kategorialId },
      })
      await tx.kategorial.update({
        where: { id: validated.kategorialId },
        data: { totalAnggota: count },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ANGGOTA_KATEGORIAL_ADDED',
        'AnggotaKategorial',
        newAnggota.id,
        `Added ${jemaat.nama} (${jemaat.nij}) to Kategorial ${kategorial.nama}`,
        undefined,
        tx
      )

      return newAnggota
    })

    try { revalidatePath('/dashboard/kategorial') } catch {}
    try { revalidatePath(`/dashboard/kategorial/${validated.kategorialId}`) } catch {}
    try { revalidatePath('/dashboard/jemaat') } catch {}
    try { revalidatePath(`/dashboard/jemaat/${validated.jemaatId}`) } catch {}

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error('Error in addAnggotaKategorialAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menambahkan anggota kategorial.',
    }
  }
}

/**
 * Remove Member from Kategorial (Safely clears Jemaat.kategorialId ONLY IF matching)
 */
export async function removeAnggotaKategorialAction(input: RemoveAnggotaKategorialInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'kategorial.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin kategorial.manage.' }
    }

    const validated = removeAnggotaKategorialSchema.parse(input)

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.anggotaKategorial.findUnique({
        where: { id: validated.anggotaId },
        include: { jemaat: true, kategorial: true },
      })

      if (!member) {
        throw new Error('Data keanggotaan kategorial tidak ditemukan.')
      }

      // STRICT ZERO-TRUST: Cannot remove members from System Default "Umum"
      if (member.kategorial.isDefault || member.kategorial.nama.toLowerCase() === 'umum') {
        throw new Error('Anggota jemaat tidak dapat dikeluarkan dari Kategorial Umum (Default Sistem).')
      }

      // Clear Jemaat.kategorialId ONLY IF it currently matches this category
      if (member.jemaat.kategorialId === member.kategorialId) {
        // Fallback to default "Umum" category if available
        const defaultKat = await tx.kategorial.findFirst({
          where: { isDefault: true, deletedAt: null },
        })
        await tx.jemaat.update({
          where: { id: member.jemaatId },
          data: { kategorialId: defaultKat?.id || null },
        })
      }

      // Delete AnggotaKategorial record
      await tx.anggotaKategorial.delete({
        where: { id: validated.anggotaId },
      })

      // Sync count
      const count = await tx.anggotaKategorial.count({
        where: { kategorialId: member.kategorialId },
      })
      await tx.kategorial.update({
        where: { id: member.kategorialId },
        data: { totalAnggota: count },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ANGGOTA_KATEGORIAL_REMOVED',
        'AnggotaKategorial',
        member.id,
        `Removed ${member.jemaat.nama} (${member.jemaat.nij}) from Kategorial ${member.kategorial.nama}`,
        undefined,
        tx
      )

      return member
    })

    try { revalidatePath('/dashboard/kategorial') } catch {}
    try { revalidatePath(`/dashboard/kategorial/${result.kategorialId}`) } catch {}
    try { revalidatePath('/dashboard/jemaat') } catch {}
    try { revalidatePath(`/dashboard/jemaat/${result.jemaatId}`) } catch {}

    return {
      success: true,
      message: `Anggota ${result.jemaat.nama} berhasil dikeluarkan dari Kategorial ${result.kategorial.nama}.`,
    }
  } catch (error: any) {
    console.error('Error in removeAnggotaKategorialAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengeluarkan anggota kategorial.',
    }
  }
}

/**
 * Update Member in Kategorial (Edit Catatan Keanggotaan)
 */
export async function updateAnggotaKategorialAction(input: UpdateAnggotaKategorialInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'kategorial.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin kategorial.manage.' }
    }

    const validated = updateAnggotaKategorialSchema.parse(input)

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.anggotaKategorial.findUnique({
        where: { id: validated.anggotaId },
        include: { jemaat: true, kategorial: true },
      })

      if (!member) {
        throw new Error('Data keanggotaan kategorial tidak ditemukan.')
      }

      const updated = await tx.anggotaKategorial.update({
        where: { id: validated.anggotaId },
        data: {
          catatan: validated.catatan !== undefined ? validated.catatan : member.catatan,
        },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ANGGOTA_KATEGORIAL_UPDATED',
        'AnggotaKategorial',
        updated.id,
        `Updated member notes for ${member.jemaat.nama} (${member.jemaat.nij}) in Kategorial ${member.kategorial.nama}`,
        undefined,
        tx
      )

      return {
        ...updated,
        jemaat: member.jemaat,
        kategorial: member.kategorial,
      }
    })

    try { revalidatePath('/dashboard/kategorial') } catch {}
    try { revalidatePath(`/dashboard/kategorial/${result.kategorialId}`) } catch {}

    return {
      success: true,
      data: result,
      message: `Catatan anggota ${result.jemaat.nama} berhasil diperbarui.`,
    }
  } catch (error: any) {
    console.error('Error in updateAnggotaKategorialAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui catatan anggota kategorial.',
    }
  }
}

/**
 * Soft Delete Custom Kategorial (Rejects if isDefault === true)
 */
export async function deleteKategorialAction(input: { id: string; reason: string }) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'kategorial.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin kategorial.manage.' }
    }

    if (!input.id || !input.reason?.trim()) {
      return { success: false, error: 'Alasan penghapusan wajib diisi (minimal 3 karakter).' }
    }

    const existing = await prisma.kategorial.findUnique({
      where: { id: input.id },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Kategorial tidak ditemukan atau sudah dihapus.' }
    }

    // STRICT DEFAULT CATEGORY PROTECTION
    if (existing.isDefault || existing.nama.toLowerCase() === 'umum') {
      return {
        success: false,
        error: 'Kategorial "Umum" merupakan kategori default sistem yang dilindungi dan tidak dapat dihapus.',
      }
    }

    await prisma.$transaction(async (tx) => {
      // 0. Get or ensure Default "Umum" Kategorial for fallback
      const defaultKat = await getOrCreateDefaultKategorial(tx)

      // 1. Fallback primary Jemaat.kategorialId to Default "Umum"
      await tx.jemaat.updateMany({
        where: { kategorialId: existing.id },
        data: { kategorialId: defaultKat.id },
      })

      // 2. Delete AnggotaKategorial records of this deleted custom category
      await tx.anggotaKategorial.deleteMany({
        where: { kategorialId: existing.id },
      })

      // 3. Soft Delete Kategorial
      const softDeleted = await tx.kategorial.update({
        where: { id: existing.id },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: input.reason.trim(),
          totalAnggota: 0,
        },
      })

      // Sync member count for default category
      const countDefault = await tx.anggotaKategorial.count({
        where: { kategorialId: defaultKat.id },
      })
      await tx.kategorial.update({
        where: { id: defaultKat.id },
        data: { totalAnggota: countDefault },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KATEGORIAL_DELETED',
        'Kategorial',
        softDeleted.id,
        `Soft-deleted Kategorial "${softDeleted.nama}". Reason: "${input.reason}"`,
        undefined,
        tx
      )
    })

    try { revalidatePath('/dashboard/kategorial') } catch {}
    try { revalidatePath('/dashboard/jemaat') } catch {}

    return {
      success: true,
      message: `Kategorial "${existing.nama}" berhasil di-soft delete. Seluruh data Jemaat dialihkan ke Kategorial Umum.`,
    }
  } catch (error: any) {
    console.error('Error in deleteKategorialAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menghapus kategorial.',
    }
  }
}

/**
 * Restore Soft-Deleted Kategorial
 */
export async function restoreKategorialAction(input: RestoreKategorialInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'kategorial.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin memulihkan kategorial.' }
    }

    const validated = restoreKategorialSchema.parse(input)
    const existing = await prisma.kategorial.findFirst({
      where: { id: validated.id, deletedAt: { not: null } },
    })

    if (!existing) {
      return { success: false, error: 'Data kategorial yang terhapus tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.kategorial.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KATEGORIAL_RESTORED',
        'Kategorial',
        existing.id,
        `Restored Kategorial "${existing.nama}"`,
        undefined,
        tx
      )
    })

    try { revalidatePath('/dashboard/kategorial') } catch {}

    return {
      success: true,
      message: `Kategorial "${existing.nama}" berhasil dipulihkan.`,
    }
  } catch (error: any) {
    console.error('Error in restoreKategorialAction:', error)
    return { success: false, error: error?.message || 'Gagal memulihkan kategorial.' }
  }
}

/**
 * Hard Delete Kategorial Permanently from PostgreSQL Database
 */
export async function hardDeleteKategorialAction(input: HardDeleteKategorialInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'kategorial.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus permanen kategorial.' }
    }

    const validated = hardDeleteKategorialSchema.parse(input)
    const existing = await prisma.kategorial.findUnique({
      where: { id: validated.id },
    })

    if (!existing) {
      return { success: false, error: 'Data kategorial tidak ditemukan di database.' }
    }

    if (existing.isDefault || existing.nama.toLowerCase() === 'umum') {
      return { success: false, error: 'Kategorial "Umum" merupakan kategori default sistem yang dilindungi dan tidak dapat dihapus permanen.' }
    }

    await prisma.$transaction(async (tx) => {
      // 0. Fallback to default "Umum"
      const defaultKat = await getOrCreateDefaultKategorial(tx)

      // 1. Unlink & fallback primary Jemaat.kategorialId to Default "Umum"
      await tx.jemaat.updateMany({
        where: { kategorialId: existing.id },
        data: { kategorialId: defaultKat.id },
      })

      // 2. Delete AnggotaKategorial records
      await tx.anggotaKategorial.deleteMany({
        where: { kategorialId: existing.id },
      })

      // 3. Delete Kategorial from DB
      await tx.kategorial.delete({
        where: { id: existing.id },
      })

      // Sync member count for default category
      const countDefault = await tx.anggotaKategorial.count({
        where: { kategorialId: defaultKat.id },
      })
      await tx.kategorial.update({
        where: { id: defaultKat.id },
        data: { totalAnggota: countDefault },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KATEGORIAL_PERMANENTLY_DELETED',
        'Kategorial',
        existing.id,
        `Permanently deleted Kategorial "${existing.nama}" from database.`,
        undefined,
        tx
      )
    })

    try { revalidatePath('/dashboard/kategorial') } catch {}

    return {
      success: true,
      message: `Kategorial "${existing.nama}" berhasil dihapus secara PERMANEN dari database.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeleteKategorialAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus permanen kategorial.' }
  }
}

/**
 * Bulk Soft Delete Kategorial with Default Category Protection
 */
export async function bulkSoftDeleteKategorialAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada kategorial yang dipilih.' }
    }
    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penghapusan massal wajib diisi.' }
    }

    const { ids, reason } = data

    // Check which ones are default
    const kategorials = await prisma.kategorial.findMany({
      where: { id: { in: ids } },
    })

    const nonDefaultIds = kategorials.filter((k) => !k.isDefault).map((k) => k.id)
    const defaultCount = kategorials.length - nonDefaultIds.length

    if (nonDefaultIds.length === 0) {
      return {
        success: false,
        error: 'Kategorial yang dipilih merupakan kategorial bawaan sistem (Default) yang dilindungi dan tidak dapat dihapus.',
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.kategorial.updateMany({
        where: { id: { in: nonDefaultIds } },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: reason,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'DELETE_BULK_SOFT',
        'Kategorial',
        `${nonDefaultIds.length}_RECORDS`,
        `Soft delete massal (${nonDefaultIds.length} kategorial). Alasan: ${reason}`,
        undefined,
        tx
      )
    })

    try { revalidatePath('/dashboard/kategorial') } catch {}
    try { revalidatePath('/dashboard') } catch {}

    const message = defaultCount > 0
      ? `${nonDefaultIds.length} kategorial berhasil dipindahkan ke kotak sampah (${defaultCount} kategorial default dilindungi).`
      : `${nonDefaultIds.length} kategorial berhasil dipindahkan ke kotak sampah.`

    return {
      success: true,
      message,
    }
  } catch (error: any) {
    console.error('Error in bulkSoftDeleteKategorialAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus kategorial terpilih.' }
  }
}

/**
 * Bulk Recalculate and Sync Total Members Count for Kategorials
 */
export async function bulkRecalculateKategorialCountsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada kategorial yang dipilih.' }
    }

    await prisma.$transaction(async (tx) => {
      for (const id of ids) {
        const count = await tx.anggotaKategorial.count({
          where: {
            kategorialId: id,
            jemaat: { deletedAt: null },
          },
        })

        await tx.kategorial.update({
          where: { id },
          data: { totalAnggota: count },
        })
      }

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'RECALCULATE_BULK_KATEGORIAL',
        'Kategorial',
        `${ids.length}_RECORDS`,
        `Sinkronisasi hitung ulang total anggota riil untuk ${ids.length} kategorial.`,
        undefined,
        tx
      )
    })

    try { revalidatePath('/dashboard/kategorial') } catch {}
    return {
      success: true,
      message: `Berhasil menyinkronkan & menghitung ulang total anggota untuk ${ids.length} kategorial.`,
    }
  } catch (error: any) {
    console.error('Error in bulkRecalculateKategorialCountsAction:', error)
    return { success: false, error: error?.message || 'Gagal menyinkronkan total anggota kategorial.' }
  }
}

/**
 * Get Full Kategorial Details with Member Rosters for Official Report Printing (A4)
 */
export async function getKategorialForPrintReportsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada kategorial yang dipilih.', data: [] }
    }

    const items = await prisma.kategorial.findMany({
      where: { id: { in: ids } },
      include: {
        anggotaKategorial: {
          include: {
            jemaat: {
              select: {
                id: true,
                nij: true,
                nama: true,
                namaPanggilan: true,
                jenisKelamin: true,
                noHp: true,
                statusBaptis: true,
                statusJemaat: true,
                komsel: { select: { nama: true } },
              },
            },
          },
          orderBy: { jemaat: { nama: 'asc' } },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { nama: 'asc' }],
    })

    return {
      success: true,
      data: items,
    }
  } catch (error: any) {
    console.error('Error in getKategorialForPrintReportsAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat laporan kategorial.', data: [] }
  }
}
