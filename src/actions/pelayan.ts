'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  createKategoriPelayananSchema,
  updateKategoriPelayananSchema,
  deleteKategoriPelayananSchema,
  restoreKategoriPelayananSchema,
  hardDeleteKategoriPelayananSchema,
  createPelayanSchema,
  updatePelayanSchema,
  deletePelayanSchema,
  restorePelayanSchema,
  hardDeletePelayanSchema,
  removePelayanFromKategoriSchema,
  pelayanFilterSchema,
  CreateKategoriPelayananInput,
  UpdateKategoriPelayananInput,
  DeleteKategoriPelayananInput,
  RestoreKategoriPelayananInput,
  HardDeleteKategoriPelayananInput,
  CreatePelayanInput,
  UpdatePelayanInput,
  DeletePelayanInput,
  RestorePelayanInput,
  HardDeletePelayanInput,
  RemovePelayanFromKategoriInput,
  PelayanFilterParams,
} from '@/lib/validations/pelayan'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

const CURRENT_STAFF_ACTOR = 'Staff Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

// ─────────────────────────────────────────────────────────────────
// KATEGORI PELAYANAN ACTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Get all KategoriPelayanan with stats (totalPelayan, breakdownPerKategorial)
 */
export async function getKategoriPelayananListAction(params?: { statusHapus?: 'ACTIVE' | 'DELETED' | 'ALL' }) {
  try {
    const statusHapus = params?.statusHapus || 'ACTIVE'
    const whereClause: any = {}

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }

    const categories = await prisma.kategoriPelayanan.findMany({
      where: whereClause,
      orderBy: { nama: 'asc' },
      include: {
        pelayanKategori: {
          where: {
            pelayan: { deletedAt: null },
          },
          include: {
            kategorial: { select: { id: true, nama: true } },
            pelayan: {
              include: {
                jemaat: { select: { id: true, deletedAt: true } },
                kategorial: { select: { id: true, nama: true } },
              },
            },
          },
        },
      },
    })

    const formattedCategories = categories.map((cat) => {
      // Only count active pelayan with active jemaat
      const activePelayanKategori = cat.pelayanKategori.filter(
        (pk) => pk.pelayan.deletedAt === null && pk.pelayan.jemaat.deletedAt === null
      )

      const breakdownMap: Record<string, { kategorialId: string; kategorialName: string; totalPelayan: number }> = {}
      activePelayanKategori.forEach((pk) => {
        const kat = pk.kategorial || pk.pelayan.kategorial
        if (kat) {
          const katId = kat.id
          const katName = kat.nama
          if (!breakdownMap[katId]) {
            breakdownMap[katId] = { kategorialId: katId, kategorialName: katName, totalPelayan: 0 }
          }
          breakdownMap[katId].totalPelayan++
        }
      })

      return {
        id: cat.id,
        nama: cat.nama,
        deskripsi: cat.deskripsi,
        deletedAt: cat.deletedAt,
        deletedBy: cat.deletedBy,
        deletionReason: cat.deletionReason,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        totalPelayan: activePelayanKategori.length,
        breakdownPerKategorial: Object.values(breakdownMap),
      }
    })

    return { success: true, data: formattedCategories }
  } catch (error: any) {
    console.error('Error in getKategoriPelayananListAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat bidang pelayanan.' }
  }
}

/**
 * Get KategoriPelayanan Detail by ID with full Pelayan list
 */
export async function getKategoriPelayananByIdAction(id: string) {
  try {
    if (!id) throw new Error('ID wajib disertakan.')

    const category = await prisma.kategoriPelayanan.findFirst({
      where: { id, deletedAt: null },
      include: {
        pelayanKategori: {
          where: {
            pelayan: { deletedAt: null },
          },
          include: {
            kategorial: { select: { id: true, nama: true } },
            pelayan: {
              include: {
                jemaat: {
                  select: {
                    id: true,
                    nama: true,
                    nij: true,
                    jenisKelamin: true,
                    tanggalLahir: true,
                    noHp: true,
                    statusJemaat: true,
                    deletedAt: true,
                  },
                },
                kategorial: { select: { id: true, nama: true } },
              },
            },
          },
        },
      },
    })

    if (!category) {
      return { success: false, error: 'Bidang pelayanan tidak ditemukan atau telah dihapus.' }
    }

    // Compute stats
    const activePk = category.pelayanKategori.filter(
      (pk) => pk.pelayan.deletedAt === null && pk.pelayan.jemaat.deletedAt === null
    )

    const breakdownMap: Record<string, { kategorialId: string; kategorialName: string; totalPelayan: number }> = {}
    activePk.forEach((pk) => {
      const kat = pk.kategorial || pk.pelayan.kategorial
      if (kat) {
        const katId = kat.id
        const katName = kat.nama
        if (!breakdownMap[katId]) {
          breakdownMap[katId] = { kategorialId: katId, kategorialName: katName, totalPelayan: 0 }
        }
        breakdownMap[katId].totalPelayan++
      }
    })

    return {
      success: true,
      data: {
        ...category,
        totalPelayan: activePk.length,
        breakdownPerKategorial: Object.values(breakdownMap),
        pelayanKategori: activePk,
      },
    }
  } catch (error: any) {
    console.error('Error in getKategoriPelayananByIdAction:', error)
    return { success: false, error: error?.message || 'Gagal mengambil detail bidang pelayanan.' }
  }
}

/**
 * Create KategoriPelayanan
 */
export async function createKategoriPelayananAction(input: CreateKategoriPelayananInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.category.create')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pelayan.category.create.' }
    }

    const validated = createKategoriPelayananSchema.parse(input)

    const existing = await prisma.kategoriPelayanan.findFirst({
      where: { nama: { equals: validated.nama, mode: 'insensitive' }, deletedAt: null },
    })
    if (existing) {
      return { success: false, error: `Bidang pelayanan "${validated.nama}" sudah ada.` }
    }

    const created = await prisma.$transaction(async (tx) => {
      const res = await tx.kategoriPelayanan.create({
        data: {
          nama: validated.nama,
          deskripsi: validated.deskripsi || null,
        },
      })
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KATEGORI_PELAYANAN_CREATED',
        'KategoriPelayanan',
        res.id,
        `Created KategoriPelayanan "${res.nama}"`,
        undefined,
        tx
      )
      return res
    })

    revalidatePath('/dashboard/pelayan')
    revalidatePath('/dashboard/pelayan/kategori')

    return { success: true, data: created }
  } catch (error: any) {
    console.error('Error in createKategoriPelayananAction:', error)
    return { success: false, error: error?.message || 'Gagal membuat bidang pelayanan.' }
  }
}

/**
 * Update KategoriPelayanan
 */
export async function updateKategoriPelayananAction(input: UpdateKategoriPelayananInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.category.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pelayan.category.update.' }
    }

    const validated = updateKategoriPelayananSchema.parse(input)
    const existing = await prisma.kategoriPelayanan.findUnique({ where: { id: validated.id } })
    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Bidang pelayanan tidak ditemukan.' }
    }

    // Unique name check excluding current
    const duplicate = await prisma.kategoriPelayanan.findFirst({
      where: {
        nama: { equals: validated.nama, mode: 'insensitive' },
        id: { not: validated.id },
        deletedAt: null,
      },
    })
    if (duplicate) {
      return { success: false, error: `Bidang pelayanan "${validated.nama}" sudah ada.` }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.kategoriPelayanan.update({
        where: { id: validated.id },
        data: { nama: validated.nama, deskripsi: validated.deskripsi ?? existing.deskripsi },
      })
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KATEGORI_PELAYANAN_UPDATED',
        'KategoriPelayanan',
        res.id,
        JSON.stringify({ before: { nama: existing.nama, deskripsi: existing.deskripsi }, after: { nama: res.nama, deskripsi: res.deskripsi } }),
        undefined,
        tx
      )
      return res
    })

    revalidatePath('/dashboard/pelayan/kategori')
    revalidatePath(`/dashboard/pelayan/kategori/${validated.id}`)

    return { success: true, data: updated }
  } catch (error: any) {
    console.error('Error in updateKategoriPelayananAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui bidang pelayanan.' }
  }
}

/**
 * Soft Delete KategoriPelayanan (detaches PelayanKategori relations, preserves Pelayan/Jemaat)
 */
export async function deleteKategoriPelayananAction(input: DeleteKategoriPelayananInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.category.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pelayan.category.delete.' }
    }

    const validated = deleteKategoriPelayananSchema.parse(input)
    const existing = await prisma.kategoriPelayanan.findUnique({ where: { id: validated.id } })
    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Bidang pelayanan tidak ditemukan atau sudah dihapus.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Remove all PelayanKategori relations for this category
      await tx.pelayanKategori.deleteMany({ where: { kategoriPelayananId: existing.id } })

      // 2. Soft delete KategoriPelayanan
      const softDeleted = await tx.kategoriPelayanan.update({
        where: { id: existing.id },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: validated.reason,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KATEGORI_PELAYANAN_DELETED',
        'KategoriPelayanan',
        softDeleted.id,
        JSON.stringify({ beforeState: { nama: existing.nama }, deletionReason: validated.reason }),
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/pelayan')
    revalidatePath('/dashboard/pelayan/kategori')

    return { success: true, message: `Bidang pelayanan "${existing.nama}" berhasil di-soft delete.` }
  } catch (error: any) {
    console.error('Error in deleteKategoriPelayananAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus bidang pelayanan.' }
  }
}

/**
 * Restore Soft-Deleted KategoriPelayanan
 */
export async function restoreKategoriPelayananAction(input: RestoreKategoriPelayananInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.category.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin memulihkan bidang pelayanan.' }
    }

    const validated = restoreKategoriPelayananSchema.parse(input)
    const existing = await prisma.kategoriPelayanan.findFirst({
      where: { id: validated.id, deletedAt: { not: null } },
    })

    if (!existing) {
      return { success: false, error: 'Bidang pelayanan yang terhapus tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.kategoriPelayanan.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KATEGORI_PELAYANAN_RESTORED',
        'KategoriPelayanan',
        existing.id,
        `Restored Bidang Pelayanan "${existing.nama}"`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/pelayan')
    revalidatePath('/dashboard/pelayan/kategori')

    return { success: true, message: `Bidang pelayanan "${existing.nama}" berhasil dipulihkan.` }
  } catch (error: any) {
    console.error('Error in restoreKategoriPelayananAction:', error)
    return { success: false, error: error?.message || 'Gagal memulihkan bidang pelayanan.' }
  }
}

/**
 * Hard Delete KategoriPelayanan from Database
 */
export async function hardDeleteKategoriPelayananAction(input: HardDeleteKategoriPelayananInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.category.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus permanen bidang pelayanan.' }
    }

    const validated = hardDeleteKategoriPelayananSchema.parse(input)
    const existing = await prisma.kategoriPelayanan.findUnique({
      where: { id: validated.id },
    })

    if (!existing) {
      return { success: false, error: 'Bidang pelayanan tidak ditemukan di database.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.pelayanKategori.deleteMany({ where: { kategoriPelayananId: existing.id } })
      await tx.kategoriPelayanan.delete({ where: { id: existing.id } })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KATEGORI_PELAYANAN_PERMANENTLY_DELETED',
        'KategoriPelayanan',
        existing.id,
        `Permanently deleted Bidang Pelayanan "${existing.nama}" from database.`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/pelayan')
    return { success: true, message: `Bidang pelayanan "${existing.nama}" berhasil dihapus secara PERMANEN dari database.` }
  } catch (error: any) {
    console.error('Error in hardDeleteKategoriPelayananAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus permanen bidang pelayanan.' }
  }
}

/**
 * Get Paginated Pelayan List with Search & Filters
 */
export async function getPelayanListAction(params?: PelayanFilterParams) {
  try {
    const validated = pelayanFilterSchema.parse(params || {})
    const { search, kategorialId, kategoriPelayananId, statusHapus = 'ACTIVE', page, pageSize } = validated

    const whereClause: any = {}

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
      whereClause.jemaat = { deletedAt: null }
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { jemaat: { nama: { contains: q, mode: 'insensitive' } } },
        { jemaat: { nij: { contains: q, mode: 'insensitive' } } },
        { deskripsiTugas: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (kategorialId) {
      whereClause.OR = [
        ...(whereClause.OR || []),
        { kategorialId },
        { kategoriPelayanan: { some: { kategorialId, kategoriPelayanan: { deletedAt: null } } } },
      ]
    }

    if (kategoriPelayananId) {
      whereClause.kategoriPelayanan = {
        some: { kategoriPelayananId, kategoriPelayanan: { deletedAt: null } },
      }
    }

    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.pelayan.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          jemaat: {
            select: {
              id: true,
              nama: true,
              nij: true,
              jenisKelamin: true,
              tanggalLahir: true,
              noHp: true,
              statusJemaat: true,
              kategorialId: true,
              anggotaKategorialList: { select: { kategorialId: true } },
            },
          },
          kategorial: { select: { id: true, nama: true } },
          kategoriPelayanan: {
            where: { kategoriPelayanan: { deletedAt: null } },
            include: {
              kategoriPelayanan: { select: { id: true, nama: true, deskripsi: true } },
              kategorial: { select: { id: true, nama: true } },
            },
          },
        },
      }),
      prisma.pelayan.count({ where: whereClause }),
    ])

    const totalPages = Math.ceil(total / pageSize) || 1

    return {
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages,
      },
    }
  } catch (error: any) {
    console.error('Error in getPelayanListAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat data pelayan.' }
  }
}

/**
 * Get Pelayan Detail by ID
 */
export async function getPelayanByIdAction(id: string) {
  try {
    if (!id) throw new Error('ID Pelayan wajib disertakan.')

    const pelayan = await prisma.pelayan.findFirst({
      where: { id, deletedAt: null },
      include: {
        jemaat: {
          include: {
            kategorial: { select: { id: true, nama: true } },
            komsel: { select: { id: true, nama: true } },
            attendances: {
              take: 10,
              orderBy: { scannedAt: 'desc' },
            },
          },
        },
        kategorial: { select: { id: true, nama: true } },
        kategoriPelayanan: {
          where: { kategoriPelayanan: { deletedAt: null } },
          include: {
            kategoriPelayanan: { select: { id: true, nama: true, deskripsi: true } },
            kategorial: { select: { id: true, nama: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!pelayan) {
      return { success: false, error: 'Pelayan tidak ditemukan atau telah dihapus.' }
    }

    return { success: true, data: pelayan }
  } catch (error: any) {
    console.error('Error in getPelayanByIdAction:', error)
    return { success: false, error: error?.message || 'Gagal mengambil detail pelayan.' }
  }
}

/**
 * Get Pelayan list by Kategorial ID
 */
export async function getPelayanByKategorialAction(kategorialId: string, page = 1, pageSize = 20) {
  try {
    if (!kategorialId) throw new Error('ID Kategorial wajib disertakan.')

    const kategorial = await prisma.kategorial.findFirst({
      where: { id: kategorialId, deletedAt: null },
    })
    if (!kategorial) {
      return { success: false, error: 'Kategorial tidak ditemukan.' }
    }

    const whereCondition = {
      deletedAt: null,
      jemaat: { deletedAt: null },
      OR: [
        { kategorialId },
        { kategoriPelayanan: { some: { kategorialId, kategoriPelayanan: { deletedAt: null } } } },
      ],
    }

    const [items, total] = await Promise.all([
      prisma.pelayan.findMany({
        where: whereCondition,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          jemaat: {
            select: {
              id: true,
              nama: true,
              nij: true,
              jenisKelamin: true,
              tanggalLahir: true,
              noHp: true,
              statusJemaat: true,
            },
          },
          kategorial: { select: { id: true, nama: true } },
          kategoriPelayanan: {
            where: { kategoriPelayanan: { deletedAt: null } },
            include: {
              kategoriPelayanan: { select: { id: true, nama: true } },
              kategorial: { select: { id: true, nama: true } },
            },
          },
        },
      }),
      prisma.pelayan.count({
        where: whereCondition,
      }),
    ])

    return {
      success: true,
      data: {
        kategorial,
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    }
  } catch (error: any) {
    console.error('Error in getPelayanByKategorialAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat pelayan per kategorial.' }
  }
}

/**
 * Create Pelayan (Supports Multi-Kategorial Matrix Assignments)
 */
export async function createPelayanAction(input: CreatePelayanInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.create')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pelayan.create.' }
    }

    const validated = createPelayanSchema.parse(input)

    const jemaat = await prisma.jemaat.findUnique({
      where: { id: validated.jemaatId },
      include: {
        kategorial: { select: { id: true, nama: true } },
        anggotaKategorialList: { select: { kategorialId: true } },
      },
    })
    if (!jemaat || jemaat.deletedAt) {
      return { success: false, error: 'Jemaat tidak ditemukan.' }
    }

    const ineligibleStatuses = ['INACTIVE', 'MOVED', 'DECEASED', 'SUSPENDED', 'TAMU']
    if (ineligibleStatuses.includes(jemaat.statusJemaat)) {
      return {
        success: false,
        error: `Jemaat tidak dapat didaftarkan sebagai Pelayan karena status keanggotaannya bukan ACTIVE. Status saat ini: ${jemaat.statusJemaat}.`,
      }
    }

    const existingPelayan = await prisma.pelayan.findUnique({ where: { jemaatId: validated.jemaatId } })
    if (existingPelayan && !existingPelayan.deletedAt) {
      return { success: false, error: 'Jemaat ini sudah terdaftar sebagai Pelayan.' }
    }

    // 4. Build assignments array
    const assignmentsToCreate: { kategoriPelayananId: string; kategorialId: string | null }[] = []
    if (validated.penugasan && validated.penugasan.length > 0) {
      validated.penugasan.forEach((p) => {
        p.kategoriPelayananIds.forEach((kpId) => {
          if (!assignmentsToCreate.some((a) => a.kategoriPelayananId === kpId && a.kategorialId === (p.kategorialId || null))) {
            assignmentsToCreate.push({
              kategoriPelayananId: kpId,
              kategorialId: p.kategorialId || null,
            })
          }
        })
      })
    } else if (validated.kategoriPelayananIds && validated.kategoriPelayananIds.length > 0) {
      validated.kategoriPelayananIds.forEach((kpId) => {
        assignmentsToCreate.push({
          kategoriPelayananId: kpId,
          kategorialId: validated.kategorialId || null,
        })
      })
    }

    if (assignmentsToCreate.length === 0) {
      return { success: false, error: 'Pilih minimal satu penugasan bidang pelayanan.' }
    }

    // 4b. Verify Jemaat belongs to each assigned Kategorial
    const allowedKategorialIds = new Set<string>()
    if (jemaat.kategorialId) allowedKategorialIds.add(jemaat.kategorialId)
    jemaat.anggotaKategorialList.forEach((ak) => allowedKategorialIds.add(ak.kategorialId))

    for (const a of assignmentsToCreate) {
      if (a.kategorialId && !allowedKategorialIds.has(a.kategorialId)) {
        const targetKategorial = await prisma.kategorial.findUnique({ where: { id: a.kategorialId } })
        const katName = targetKategorial?.nama || 'kategorial tersebut'
        return {
          success: false,
          error: `Jemaat "${jemaat.nama}" tidak terhubung dengan kategorial "${katName}". Jemaat harus terdaftar sebagai anggota kategorial "${katName}" sebelum dapat ditugaskan melayani di kategorial tersebut.`,
        }
      }
    }

    // 5. Verify all KategoriPelayanan exist and are active
    const uniqueKpIds = [...new Set(assignmentsToCreate.map((a) => a.kategoriPelayananId))]
    const kategoriPelayananRecords = await prisma.kategoriPelayanan.findMany({
      where: { id: { in: uniqueKpIds }, deletedAt: null },
    })
    if (kategoriPelayananRecords.length !== uniqueKpIds.length) {
      return { success: false, error: 'Satu atau lebih bidang pelayanan tidak ditemukan atau sudah dihapus.' }
    }

    // 6. Atomic Transaction: Create Pelayan + PelayanKategori relations + Audit
    const created = await prisma.$transaction(async (tx) => {
      const pelayan = await tx.pelayan.create({
        data: {
          jemaatId: validated.jemaatId,
          kategorialId: validated.kategorialId || assignmentsToCreate[0]?.kategorialId || null,
          deskripsiTugas: validated.deskripsiTugas || null,
          kategoriPelayanan: {
            create: assignmentsToCreate.map((a) => ({
              kategoriPelayananId: a.kategoriPelayananId,
              kategorialId: a.kategorialId,
            })),
          },
        },
        include: {
          jemaat: { select: { id: true, nama: true, nij: true } },
          kategorial: { select: { id: true, nama: true } },
          kategoriPelayanan: {
            include: {
              kategoriPelayanan: { select: { id: true, nama: true } },
              kategorial: { select: { id: true, nama: true } },
            },
          },
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'PELAYAN_CREATED',
        'Pelayan',
        pelayan.id,
        JSON.stringify({
          jemaat: `${pelayan.jemaat.nama} (${pelayan.jemaat.nij})`,
          penugasan: pelayan.kategoriPelayanan.map((pk) => ({
            bidang: pk.kategoriPelayanan.nama,
            kategorial: pk.kategorial?.nama || 'Umum',
          })),
          deskripsiTugas: pelayan.deskripsiTugas,
        }),
        undefined,
        tx
      )

      return pelayan
    })

    revalidatePath('/dashboard/pelayan')
    revalidatePath('/dashboard/pelayan/kategori')

    return { success: true, data: created }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'Jemaat ini sudah terdaftar sebagai Pelayan (race condition detected).' }
    }
    console.error('Error in createPelayanAction:', error)
    return { success: false, error: error?.message || 'Gagal mendaftarkan pelayan.' }
  }
}

/**
 * Update Pelayan (deskripsiTugas + multi-kategorial PelayanKategori matrix sync)
 */
export async function updatePelayanAction(input: UpdatePelayanInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pelayan.update.' }
    }

    const validated = updatePelayanSchema.parse(input)
    const existingPelayan = await prisma.pelayan.findUnique({
      where: { id: validated.id },
      include: {
        jemaat: {
          select: {
            id: true,
            nama: true,
            kategorialId: true,
            anggotaKategorialList: { select: { kategorialId: true } },
          },
        },
        kategoriPelayanan: {
          include: {
            kategoriPelayanan: { select: { id: true, nama: true } },
            kategorial: { select: { id: true, nama: true } },
          },
        },
      },
    })

    if (!existingPelayan || existingPelayan.deletedAt) {
      return { success: false, error: 'Pelayan tidak ditemukan.' }
    }

    // Build assignments array
    const assignmentsToCreate: { kategoriPelayananId: string; kategorialId: string | null }[] = []
    if (validated.penugasan && validated.penugasan.length > 0) {
      validated.penugasan.forEach((p) => {
        p.kategoriPelayananIds.forEach((kpId) => {
          if (!assignmentsToCreate.some((a) => a.kategoriPelayananId === kpId && a.kategorialId === (p.kategorialId || null))) {
            assignmentsToCreate.push({
              kategoriPelayananId: kpId,
              kategorialId: p.kategorialId || null,
            })
          }
        })
      })
    } else if (validated.kategoriPelayananIds && validated.kategoriPelayananIds.length > 0) {
      validated.kategoriPelayananIds.forEach((kpId) => {
        assignmentsToCreate.push({
          kategoriPelayananId: kpId,
          kategorialId: null,
        })
      })
    }

    // Verify Jemaat belongs to each assigned Kategorial
    const allowedKategorialIds = new Set<string>()
    if (existingPelayan.jemaat.kategorialId) allowedKategorialIds.add(existingPelayan.jemaat.kategorialId)
    existingPelayan.jemaat.anggotaKategorialList.forEach((ak) => allowedKategorialIds.add(ak.kategorialId))

    for (const a of assignmentsToCreate) {
      if (a.kategorialId && !allowedKategorialIds.has(a.kategorialId)) {
        const targetKategorial = await prisma.kategorial.findUnique({ where: { id: a.kategorialId } })
        const katName = targetKategorial?.nama || 'kategorial tersebut'
        return {
          success: false,
          error: `Jemaat "${existingPelayan.jemaat.nama}" tidak terhubung dengan kategorial "${katName}". Jemaat harus terdaftar sebagai anggota kategorial "${katName}" sebelum dapat ditugaskan melayani di kategorial tersebut.`,
        }
      }
    }

    const beforeState = {
      deskripsiTugas: existingPelayan.deskripsiTugas,
      penugasan: existingPelayan.kategoriPelayanan.map((pk) => ({
        bidang: pk.kategoriPelayanan.nama,
        kategorial: pk.kategorial?.nama || 'Umum',
      })),
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete all existing PelayanKategori relations for this pelayan
      await tx.pelayanKategori.deleteMany({
        where: { pelayanId: validated.id },
      })

      // 2. Re-create all matrix penugasan
      if (assignmentsToCreate.length > 0) {
        await tx.pelayanKategori.createMany({
          data: assignmentsToCreate.map((a) => ({
            pelayanId: validated.id,
            kategoriPelayananId: a.kategoriPelayananId,
            kategorialId: a.kategorialId,
          })),
        })
      }

      // 3. Update pelayan base fields
      const res = await tx.pelayan.update({
        where: { id: validated.id },
        data: { deskripsiTugas: validated.deskripsiTugas ?? existingPelayan.deskripsiTugas },
        include: {
          jemaat: { select: { id: true, nama: true, nij: true } },
          kategorial: { select: { id: true, nama: true } },
          kategoriPelayanan: {
            include: {
              kategoriPelayanan: { select: { id: true, nama: true } },
              kategorial: { select: { id: true, nama: true } },
            },
          },
        },
      })

      const afterState = {
        deskripsiTugas: res.deskripsiTugas,
        penugasan: res.kategoriPelayanan.map((pk) => ({
          bidang: pk.kategoriPelayanan.nama,
          kategorial: pk.kategorial?.nama || 'Umum',
        })),
      }

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'PELAYAN_UPDATED',
        'Pelayan',
        res.id,
        JSON.stringify({ before: beforeState, after: afterState }),
        undefined,
        tx
      )

      return res
    })

    revalidatePath('/dashboard/pelayan')
    revalidatePath('/dashboard/pelayan/kategori')

    return { success: true, data: updated }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'Bidang pelayanan sudah terdaftar pada Pelayan ini (race condition detected).' }
    }
    console.error('Error in updatePelayanAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui pelayan.' }
  }
}

/**
 * Soft Delete Pelayan (preserves Jemaat record)
 */
export async function deletePelayanAction(input: DeletePelayanInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pelayan.delete.' }
    }

    const validated = deletePelayanSchema.parse(input)
    const existing = await prisma.pelayan.findUnique({
      where: { id: validated.id },
      include: {
        jemaat: { select: { id: true, nama: true, nij: true } },
        kategorial: { select: { id: true, nama: true } },
        kategoriPelayanan: {
          include: { kategoriPelayanan: { select: { id: true, nama: true } } },
        },
      },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Pelayan tidak ditemukan atau sudah dihapus.' }
    }

    await prisma.$transaction(async (tx) => {
      const softDeleted = await tx.pelayan.update({
        where: { id: existing.id },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: validated.reason,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'PELAYAN_DELETED',
        'Pelayan',
        softDeleted.id,
        JSON.stringify({
          beforeState: {
            jemaat: `${existing.jemaat.nama} (${existing.jemaat.nij})`,
            kategorial: existing.kategorial?.nama || null,
            bidangPelayanan: existing.kategoriPelayanan.map((pk) => pk.kategoriPelayanan.nama),
          },
          deletionReason: validated.reason,
        }),
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/pelayan')
    revalidatePath('/dashboard/pelayan/kategori')

    return { success: true, message: `Pelayan ${existing.jemaat.nama} berhasil di-soft delete.` }
  } catch (error: any) {
    console.error('Error in deletePelayanAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus pelayan.' }
  }
}

/**
 * Restore Soft-Deleted Pelayan
 */
export async function restorePelayanAction(input: RestorePelayanInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin memulihkan pelayan.' }
    }

    const validated = restorePelayanSchema.parse(input)
    const existing = await prisma.pelayan.findFirst({
      where: { id: validated.id, deletedAt: { not: null } },
      include: { jemaat: { select: { nama: true } } },
    })

    if (!existing) {
      return { success: false, error: 'Data pelayan yang terhapus tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.pelayan.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'PELAYAN_RESTORED',
        'Pelayan',
        existing.id,
        `Restored Pelayan "${existing.jemaat.nama}"`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/pelayan')
    revalidatePath('/dashboard/pelayan/kategori')

    return { success: true, message: `Pelayan ${existing.jemaat.nama} berhasil dipulihkan.` }
  } catch (error: any) {
    console.error('Error in restorePelayanAction:', error)
    return { success: false, error: error?.message || 'Gagal memulihkan pelayan.' }
  }
}

/**
 * Hard Delete Pelayan Permanently from PostgreSQL Database
 */
export async function hardDeletePelayanAction(input: HardDeletePelayanInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus permanen pelayan.' }
    }

    const validated = hardDeletePelayanSchema.parse(input)
    const existing = await prisma.pelayan.findUnique({
      where: { id: validated.id },
      include: { jemaat: { select: { nama: true } } },
    })

    if (!existing) {
      return { success: false, error: 'Data pelayan tidak ditemukan di database.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete PelayanKategori relations
      await tx.pelayanKategori.deleteMany({ where: { pelayanId: existing.id } })

      // 2. Delete Pelayan record permanently
      await tx.pelayan.delete({ where: { id: existing.id } })

      // 3. Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'PELAYAN_PERMANENTLY_DELETED',
        'Pelayan',
        existing.id,
        `Permanently deleted Pelayan "${existing.jemaat.nama}" from database.`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/pelayan')
    revalidatePath('/dashboard/pelayan/kategori')

    return { success: true, message: `Pelayan ${existing.jemaat.nama} berhasil dihapus secara PERMANEN dari database.` }
  } catch (error: any) {
    console.error('Error in hardDeletePelayanAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus permanen pelayan.' }
  }
}

/**
 * Bulk Soft Delete Pelayan
 */
export async function bulkSoftDeletePelayanAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pelayan.delete.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada pelayan yang dipilih.' }
    }

    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penghapusan massal wajib diisi.' }
    }

    const { ids, reason } = data

    await prisma.$transaction(async (tx) => {
      await tx.pelayan.updateMany({
        where: { id: { in: ids } },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: reason.trim(),
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'DELETE_BULK_SOFT_PELAYAN',
        'Pelayan',
        `${ids.length}_RECORDS`,
        `Soft delete massal (${ids.length} pelayan). Alasan: ${reason.trim()}`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/pelayan')
    revalidatePath('/dashboard/pelayan/kategori')
    revalidatePath('/dashboard')

    return {
      success: true,
      message: `${ids.length} data pelayan berhasil dipindahkan ke kotak sampah.`,
    }
  } catch (error: any) {
    console.error('Error in bulkSoftDeletePelayanAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus data pelayan terpilih.' }
  }
}

/**
 * Bulk Assign / Add Kategori Pelayanan to Selected Pelayan
 */
export async function bulkAssignKategoriPelayananAction(data: {
  ids: string[]
  kategoriPelayananIds: string[]
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pelayan.update.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada pelayan yang dipilih.' }
    }

    if (!data.kategoriPelayananIds || data.kategoriPelayananIds.length === 0) {
      return { success: false, error: 'Pilih minimal satu kategori pelayanan.' }
    }

    const { ids, kategoriPelayananIds } = data

    await prisma.$transaction(async (tx) => {
      for (const pelayanId of ids) {
        for (const catId of kategoriPelayananIds) {
          const existing = await tx.pelayanKategori.findFirst({
            where: {
              pelayanId,
              kategoriPelayananId: catId,
              kategorialId: null,
            },
          })

          if (!existing) {
            await tx.pelayanKategori.create({
              data: {
                pelayanId,
                kategoriPelayananId: catId,
                kategorialId: null,
              },
            })
          }
        }
      }

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ASSIGN_BULK_KATEGORI_PELAYANAN',
        'Pelayan',
        `${ids.length}_RECORDS`,
        `Penetapan kategori pelayanan massal untuk (${ids.length} pelayan).`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/pelayan')
    revalidatePath('/dashboard/pelayan/kategori')

    return {
      success: true,
      message: `Berhasil menugaskan kategori pelayanan untuk ${ids.length} pelayan terpilih.`,
    }
  } catch (error: any) {
    console.error('Error in bulkAssignKategoriPelayananAction:', error)
    return { success: false, error: error?.message || 'Gagal menugaskan kategori pelayanan.' }
  }
}

/**
 * Get Full Pelayan Details with Ministry Roles for Official A4 Print Roster Sheet
 */
export async function getPelayanForPrintRosterAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada pelayan yang dipilih.', data: [] }
    }

    const items = await prisma.pelayan.findMany({
      where: { id: { in: ids } },
      include: {
        jemaat: {
          select: {
            id: true,
            nij: true,
            nama: true,
            namaPanggilan: true,
            jenisKelamin: true,
            noHp: true,
            whatsApp: true,
            statusJemaat: true,
            komsel: { select: { nama: true } },
          },
        },
        kategorial: { select: { id: true, nama: true } },
        kategoriPelayanan: {
          include: {
            kategoriPelayanan: {
              select: { id: true, nama: true },
            },
          },
        },
      },
      orderBy: { jemaat: { nama: 'asc' } },
    })

    return {
      success: true,
      data: items,
    }
  } catch (error: any) {
    console.error('Error in getPelayanForPrintRosterAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat data roster pelayan.', data: [] }
  }
}

/**
 * Remove Pelayan from a specific KategoriPelayanan (detaches PelayanKategori relation)
 */
export async function removePelayanFromKategoriPelayananAction(input: RemovePelayanFromKategoriInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pelayan.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mengelola anggota bidang pelayanan.' }
    }

    const validated = removePelayanFromKategoriSchema.parse(input)

    const whereClause: any = {
      pelayanId: validated.pelayanId,
      kategoriPelayananId: validated.kategoriPelayananId,
    }
    if (validated.kategorialId) {
      whereClause.kategorialId = validated.kategorialId
    }

    const existing = await prisma.pelayanKategori.findFirst({
      where: whereClause,
      include: {
        pelayan: {
          include: {
            jemaat: { select: { id: true, nama: true, nij: true } },
          },
        },
        kategoriPelayanan: { select: { id: true, nama: true } },
        kategorial: { select: { id: true, nama: true } },
      },
    })

    if (!existing) {
      return { success: false, error: 'Data pelayan tidak ditemukan pada bidang pelayanan ini.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.pelayanKategori.delete({
        where: { id: existing.id },
      })

      const scopeName = existing.kategorial ? ` (${existing.kategorial.nama})` : ''
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'PELAYAN_REMOVED_FROM_KATEGORI',
        'PelayanKategori',
        existing.id,
        `Removed Pelayan "${existing.pelayan.jemaat.nama}" (${existing.pelayan.jemaat.nij}) from Bidang Pelayanan "${existing.kategoriPelayanan.nama}"${scopeName}.`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/pelayan')
    revalidatePath('/dashboard/pelayan/kategori')
    revalidatePath(`/dashboard/pelayan/kategori/${validated.kategoriPelayananId}`)

    return {
      success: true,
      message: `Pelayan "${existing.pelayan.jemaat.nama}" berhasil dikeluarkan dari bidang pelayanan "${existing.kategoriPelayanan.nama}".`,
    }
  } catch (error: any) {
    console.error('Error in removePelayanFromKategoriPelayananAction:', error)
    return { success: false, error: error?.message || 'Gagal mengeluarkan pelayan dari bidang pelayanan.' }
  }
}

