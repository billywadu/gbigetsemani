'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  createKomselSchema,
  updateKomselSchema,
  setKoordinatorKomselSchema,
  addAnggotaKomselSchema,
  removeAnggotaKomselSchema,
  deleteKomselSchema,
  restoreKomselSchema,
  hardDeleteKomselSchema,
  komselFilterSchema,
  CreateKomselInput,
  UpdateKomselInput,
  SetKoordinatorKomselInput,
  AddAnggotaKomselInput,
  RemoveAnggotaKomselInput,
  DeleteKomselInput,
  RestoreKomselInput,
  HardDeleteKomselInput,
  KomselFilterParams,
} from '@/lib/validations/komsel'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

const CURRENT_STAFF_ACTOR = 'Staff Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

/**
 * Get Paginated Komsel List with Search & Filtering
 */
export async function getKomselListAction(params?: KomselFilterParams) {
  try {
    const validated = komselFilterSchema.parse(params || {})
    const { search, kategorialId, hari, statusHapus = 'ACTIVE', page, pageSize } = validated

    const whereClause: any = {}

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { nama: { contains: q, mode: 'insensitive' } },
        { wilayah: { contains: q, mode: 'insensitive' } },
        { koordinator: { nama: { contains: q, mode: 'insensitive' } } },
        { koordinator: { nij: { contains: q, mode: 'insensitive' } } },
      ]
    }

    if (kategorialId && kategorialId !== 'all') {
      whereClause.kategorialId = kategorialId
    }

    if (hari) {
      whereClause.hari = hari
    }

    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.komsel.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: [{ nama: 'asc' }],
        include: {
          kategorial: { select: { id: true, nama: true } },
          koordinator: {
            select: {
              id: true,
              nama: true,
              nij: true,
              noHp: true,
              statusJemaat: true,
            },
          },
          _count: {
            select: { anggota: true },
          },
        },
      }),
      prisma.komsel.count({ where: whereClause }),
    ])

    const formattedItems = items.map((kms) => ({
      ...kms,
      totalAnggota: kms._count.anggota,
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
    console.error('Error in getKomselListAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat data Komsel.',
    }
  }
}

/**
 * Get Komsel Detail by ID with Full Member List
 */
export async function getKomselByIdAction(id: string) {
  try {
    if (!id) throw new Error('ID Komsel wajib disertakan.')

    const komsel = await prisma.komsel.findFirst({
      where: { id, deletedAt: null },
      include: {
        kategorial: { select: { id: true, nama: true, deskripsi: true } },
        koordinator: {
          select: {
            id: true,
            nama: true,
            nij: true,
            noHp: true,
            jenisKelamin: true,
            statusJemaat: true,
            tanggalLahir: true,
          },
        },
        anggota: {
          include: {
            jemaat: {
              select: {
                id: true,
                nama: true,
                nij: true,
                noHp: true,
                jenisKelamin: true,
                statusJemaat: true,
                tanggalLahir: true,
                kategorial: { select: { id: true, nama: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!komsel) {
      return {
        success: false,
        error: 'Data Komsel tidak ditemukan atau telah dihapus.',
      }
    }

    return {
      success: true,
      data: {
        ...komsel,
        totalAnggota: komsel.anggota.length,
      },
    }
  } catch (error: any) {
    console.error('Error in getKomselByIdAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengambil detail Komsel.',
    }
  }
}

/**
 * Get Komsel List by Kategorial ID
 */
export async function getKomselByKategorialAction(kategorialId: string) {
  try {
    if (!kategorialId) throw new Error('ID Kategorial wajib disertakan.')

    const [kategorial, items] = await Promise.all([
      prisma.kategorial.findFirst({
        where: { id: kategorialId, deletedAt: null },
      }),
      prisma.komsel.findMany({
        where: { kategorialId, deletedAt: null },
        orderBy: { nama: 'asc' },
        include: {
          koordinator: {
            select: {
              id: true,
              nama: true,
              nij: true,
              noHp: true,
            },
          },
          _count: {
            select: { anggota: true },
          },
        },
      }),
    ])

    if (!kategorial) {
      return {
        success: false,
        error: 'Kategorial tidak ditemukan.',
      }
    }

    const formattedItems = items.map((kms) => ({
      ...kms,
      totalAnggota: kms._count.anggota,
    }))

    const totalAnggotaAll = formattedItems.reduce((acc, curr) => acc + curr.totalAnggota, 0)

    return {
      success: true,
      data: {
        kategorial,
        items: formattedItems,
        totalKomsel: items.length,
        totalAnggotaAll,
      },
    }
  } catch (error: any) {
    console.error('Error in getKomselByKategorialAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat komsel per kategorial.',
    }
  }
}

/**
 * Create Komsel
 */
export async function createKomselAction(input: CreateKomselInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'komsel.create')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin komsel.create.' }
    }

    const validated = createKomselSchema.parse(input)

    const existing = await prisma.komsel.findFirst({
      where: {
        nama: { equals: validated.nama, mode: 'insensitive' },
        deletedAt: null,
      },
    })

    if (existing) {
      return { success: false, error: `Komsel dengan nama "${validated.nama}" sudah ada.` }
    }

    // Validate Kategorial if provided
    if (validated.kategorialId) {
      const kat = await prisma.kategorial.findFirst({
        where: { id: validated.kategorialId, deletedAt: null },
      })
      if (!kat) {
        return { success: false, error: 'Kategorial yang dipilih tidak ditemukan.' }
      }
    }

    // Validate Koordinator if provided
    if (validated.koordinatorId) {
      const jemaat = await prisma.jemaat.findFirst({
        where: { id: validated.koordinatorId, deletedAt: null },
      })
      if (!jemaat) {
        return { success: false, error: 'Jemaat yang dipilih sebagai Koordinator tidak ditemukan.' }
      }
      if (jemaat.statusJemaat !== 'ACTIVE') {
        return { success: false, error: `Koordinator harus jemaat dengan status ACTIVE. Status saat ini: ${jemaat.statusJemaat}.` }
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const komsel = await tx.komsel.create({
        data: {
          nama: validated.nama,
          wilayah: validated.wilayah,
          hari: validated.hari,
          jam: validated.jam,
          kategorialId: validated.kategorialId || null,
          koordinatorId: validated.koordinatorId || null,
        },
        include: {
          kategorial: { select: { id: true, nama: true } },
          koordinator: { select: { id: true, nama: true, nij: true } },
        },
      })

      // If Koordinator assigned, register in AnggotaKomsel and update Jemaat.komselId
      if (validated.koordinatorId) {
        await tx.anggotaKomsel.create({
          data: {
            komselId: komsel.id,
            jemaatId: validated.koordinatorId,
          },
        })
        await tx.jemaat.update({
          where: { id: validated.koordinatorId },
          data: { komselId: komsel.id },
        })
      }

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KOMSEL_CREATED',
        'Komsel',
        komsel.id,
        JSON.stringify({
          nama: komsel.nama,
          wilayah: komsel.wilayah,
          hari: komsel.hari,
          jam: komsel.jam,
          kategorial: komsel.kategorial?.nama || null,
          koordinator: komsel.koordinator ? `${komsel.koordinator.nama} (${komsel.koordinator.nij})` : null,
        }),
        undefined,
        tx
      )

      return komsel
    })

    revalidatePath('/dashboard/komsel')
    if (validated.kategorialId) {
      revalidatePath(`/dashboard/komsel/kategorial/${validated.kategorialId}`)
    }

    return {
      success: true,
      data: created,
    }
  } catch (error: any) {
    console.error('Error in createKomselAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal membuat Komsel baru.',
    }
  }
}

/**
 * Update Komsel Basic Info
 */
export async function updateKomselAction(input: UpdateKomselInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'komsel.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin komsel.update.' }
    }

    const validated = updateKomselSchema.parse(input)

    const existing = await prisma.komsel.findUnique({
      where: { id: validated.id },
      include: {
        kategorial: { select: { id: true, nama: true } },
      },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Komsel tidak ditemukan atau telah dihapus.' }
    }

    // Check unique name if changed
    const duplicate = await prisma.komsel.findFirst({
      where: {
        nama: { equals: validated.nama, mode: 'insensitive' },
        id: { not: validated.id },
        deletedAt: null,
      },
    })

    if (duplicate) {
      return { success: false, error: `Komsel dengan nama "${validated.nama}" sudah ada.` }
    }

    if (validated.kategorialId) {
      const kat = await prisma.kategorial.findFirst({
        where: { id: validated.kategorialId, deletedAt: null },
      })
      if (!kat) {
        return { success: false, error: 'Kategorial yang dipilih tidak ditemukan.' }
      }
    }

    const beforeState = {
      nama: existing.nama,
      wilayah: existing.wilayah,
      hari: existing.hari,
      jam: existing.jam,
      kategorialId: existing.kategorialId,
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.komsel.update({
        where: { id: validated.id },
        data: {
          nama: validated.nama,
          wilayah: validated.wilayah,
          hari: validated.hari,
          jam: validated.jam,
          kategorialId: validated.kategorialId || null,
        },
      })

      const afterState = {
        nama: res.nama,
        wilayah: res.wilayah,
        hari: res.hari,
        jam: res.jam,
        kategorialId: res.kategorialId,
      }

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KOMSEL_UPDATED',
        'Komsel',
        res.id,
        JSON.stringify({ before: beforeState, after: afterState }),
        undefined,
        tx
      )

      return res
    })

    revalidatePath('/dashboard/komsel')
    revalidatePath(`/dashboard/komsel/${validated.id}`)
    if (existing.kategorialId) {
      revalidatePath(`/dashboard/komsel/kategorial/${existing.kategorialId}`)
    }
    if (validated.kategorialId && validated.kategorialId !== existing.kategorialId) {
      revalidatePath(`/dashboard/komsel/kategorial/${validated.kategorialId}`)
    }

    return {
      success: true,
      data: updated,
    }
  } catch (error: any) {
    console.error('Error in updateKomselAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui Komsel.',
    }
  }
}

/**
 * Set / Change Koordinator Komsel
 */
export async function setKoordinatorKomselAction(input: SetKoordinatorKomselInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'komsel.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin komsel.update.' }
    }

    const validated = setKoordinatorKomselSchema.parse(input)

    const komsel = await prisma.komsel.findUnique({
      where: { id: validated.komselId },
      include: {
        koordinator: { select: { id: true, nama: true, nij: true } },
      },
    })

    if (!komsel || komsel.deletedAt) {
      return { success: false, error: 'Komsel tidak ditemukan atau telah dihapus.' }
    }

    const jemaat = await prisma.jemaat.findUnique({
      where: { id: validated.koordinatorId },
    })

    if (!jemaat || jemaat.deletedAt) {
      return { success: false, error: 'Jemaat tidak ditemukan.' }
    }

    if (jemaat.statusJemaat !== 'ACTIVE') {
      return { success: false, error: `Koordinator harus berstatus ACTIVE. Status saat ini: ${jemaat.statusJemaat}.` }
    }

    const beforeKoordinator = komsel.koordinator ? `${komsel.koordinator.nama} (${komsel.koordinator.nij})` : null

    await prisma.$transaction(async (tx) => {
      // 1. Update Komsel koordinatorId
      await tx.komsel.update({
        where: { id: komsel.id },
        data: { koordinatorId: validated.koordinatorId },
      })

      // 2. Ensure AnggotaKomsel relation exists for new koordinator
      await tx.anggotaKomsel.upsert({
        where: {
          komselId_jemaatId: {
            komselId: komsel.id,
            jemaatId: validated.koordinatorId,
          },
        },
        update: {},
        create: {
          komselId: komsel.id,
          jemaatId: validated.koordinatorId,
        },
      })

      // 3. Set primary Komsel if not yet set
      if (!jemaat.komselId) {
        await tx.jemaat.update({
          where: { id: validated.koordinatorId },
          data: { komselId: komsel.id },
        })
      }

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KOMSEL_KOORDINATOR_UPDATED',
        'Komsel',
        komsel.id,
        JSON.stringify({
          komsel: komsel.nama,
          previousKoordinator: beforeKoordinator,
          newKoordinator: `${jemaat.nama} (${jemaat.nij})`,
        }),
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/komsel')
    revalidatePath(`/dashboard/komsel/${komsel.id}`)
    revalidatePath(`/dashboard/jemaat/${validated.koordinatorId}`)

    return {
      success: true,
      message: `Koordinator Komsel ${komsel.nama} berhasil diubah menjadi ${jemaat.nama}.`,
    }
  } catch (error: any) {
    console.error('Error in setKoordinatorKomselAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengubah Koordinator Komsel.',
    }
  }
}

/**
 * Add Member to Komsel (Supports Multi-Komsel Membership)
 */
export async function addAnggotaKomselAction(input: AddAnggotaKomselInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'komsel.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin komsel.update.' }
    }

    const validated = addAnggotaKomselSchema.parse(input)

    const komsel = await prisma.komsel.findUnique({
      where: { id: validated.komselId },
    })

    if (!komsel || komsel.deletedAt) {
      return { success: false, error: 'Komsel tidak ditemukan atau telah dihapus.' }
    }

    const jemaat = await prisma.jemaat.findUnique({
      where: { id: validated.jemaatId },
      include: {
        komsel: { select: { id: true, nama: true } },
      },
    })

    if (!jemaat || jemaat.deletedAt) {
      return { success: false, error: 'Jemaat tidak ditemukan.' }
    }

    if (jemaat.statusJemaat !== 'ACTIVE') {
      return { success: false, error: `Hanya Jemaat ACTIVE yang dapat ditambahkan ke Komsel. Status saat ini: ${jemaat.statusJemaat}.` }
    }

    // Check duplicate in AnggotaKomsel for THIS komsel
    const existingMember = await prisma.anggotaKomsel.findUnique({
      where: {
        komselId_jemaatId: {
          komselId: validated.komselId,
          jemaatId: validated.jemaatId,
        },
      },
    })

    if (existingMember) {
      return {
        success: false,
        error: `Jemaat ${jemaat.nama} (${jemaat.nij}) sudah terdaftar dalam Komsel ${komsel.nama}.`,
      }
    }

    const newAnggota = await prisma.$transaction(async (tx) => {
      // 1. Create AnggotaKomsel relation
      const member = await tx.anggotaKomsel.create({
        data: {
          komselId: validated.komselId,
          jemaatId: validated.jemaatId,
        },
      })

      // 2. Set primary Komsel if not yet set
      if (!jemaat.komselId) {
        await tx.jemaat.update({
          where: { id: validated.jemaatId },
          data: { komselId: validated.komselId },
        })
      }

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ANGGOTA_KOMSEL_ADDED',
        'AnggotaKomsel',
        member.id,
        JSON.stringify({
          komsel: komsel.nama,
          jemaat: `${jemaat.nama} (${jemaat.nij})`,
        }),
        undefined,
        tx
      )

      return member
    })

    revalidatePath('/dashboard/komsel')
    revalidatePath(`/dashboard/komsel/${validated.komselId}`)
    revalidatePath('/dashboard/jemaat')
    revalidatePath(`/dashboard/jemaat/${validated.jemaatId}`)

    return {
      success: true,
      data: newAnggota,
      message: `Jemaat ${jemaat.nama} berhasil ditambahkan ke Komsel ${komsel.nama}.`,
    }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'Jemaat sudah terdaftar dalam Komsel ini (race condition protected).' }
    }
    console.error('Error in addAnggotaKomselAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menambahkan anggota Komsel.',
    }
  }
}

/**
 * Remove Member from Komsel
 */
export async function removeAnggotaKomselAction(input: RemoveAnggotaKomselInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'komsel.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin komsel.update.' }
    }

    const validated = removeAnggotaKomselSchema.parse(input)

    const member = await prisma.anggotaKomsel.findUnique({
      where: { id: validated.anggotaId },
      include: {
        jemaat: { select: { id: true, nama: true, nij: true, komselId: true } },
        komsel: { select: { id: true, nama: true, koordinatorId: true } },
      },
    })

    if (!member) {
      return { success: false, error: 'Data keanggotaan Komsel tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Release Jemaat.komselId
      if (member.jemaat.komselId === member.komselId) {
        await tx.jemaat.update({
          where: { id: member.jemaatId },
          data: { komselId: null },
        })
      }

      // 2. If this member was the coordinator, clear koordinatorId
      if (member.komsel.koordinatorId === member.jemaatId) {
        await tx.komsel.update({
          where: { id: member.komselId },
          data: { koordinatorId: null },
        })
      }

      // 3. Delete AnggotaKomsel record
      await tx.anggotaKomsel.delete({
        where: { id: validated.anggotaId },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ANGGOTA_KOMSEL_REMOVED',
        'AnggotaKomsel',
        member.id,
        JSON.stringify({
          komsel: member.komsel.nama,
          jemaat: `${member.jemaat.nama} (${member.jemaat.nij})`,
        }),
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/komsel')
    revalidatePath(`/dashboard/komsel/${member.komselId}`)
    revalidatePath('/dashboard/jemaat')
    revalidatePath(`/dashboard/jemaat/${member.jemaatId}`)

    return {
      success: true,
      message: `Jemaat ${member.jemaat.nama} berhasil dilepaskan dari Komsel ${member.komsel.nama}.`,
    }
  } catch (error: any) {
    console.error('Error in removeAnggotaKomselAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengeluarkan anggota Komsel.',
    }
  }
}

/**
 * Soft Delete Komsel
 */
export async function deleteKomselAction(input: DeleteKomselInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'komsel.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin komsel.delete.' }
    }

    const validated = deleteKomselSchema.parse(input)

    const existing = await prisma.komsel.findUnique({
      where: { id: validated.id },
      include: {
        koordinator: { select: { id: true, nama: true, nij: true } },
      },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Komsel tidak ditemukan atau sudah dihapus.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Release all member links in Jemaat
      await tx.jemaat.updateMany({
        where: { komselId: existing.id },
        data: { komselId: null },
      })

      // 2. Delete all AnggotaKomsel records
      await tx.anggotaKomsel.deleteMany({
        where: { komselId: existing.id },
      })

      // 3. Soft Delete Komsel
      const softDeleted = await tx.komsel.update({
        where: { id: existing.id },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: validated.reason.trim(),
          koordinatorId: null,
        },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KOMSEL_DELETED',
        'Komsel',
        softDeleted.id,
        JSON.stringify({
          nama: existing.nama,
          wilayah: existing.wilayah,
          deletionReason: validated.reason.trim(),
        }),
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/komsel')
    revalidatePath('/dashboard/jemaat')
    if (existing.kategorialId) {
      revalidatePath(`/dashboard/komsel/kategorial/${existing.kategorialId}`)
    }

    return {
      success: true,
      message: `Komsel "${existing.nama}" berhasil di-soft delete. Semua anggota dilepaskan dan data profil Jemaat tetap utuh.`,
    }
  } catch (error: any) {
    console.error('Error in deleteKomselAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menghapus Komsel.',
    }
  }
}

/**
 * Restore Soft-Deleted Komsel
 */
export async function restoreKomselAction(input: RestoreKomselInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'komsel.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin memulihkan komsel.' }
    }

    const validated = restoreKomselSchema.parse(input)
    const existing = await prisma.komsel.findFirst({
      where: { id: validated.id, deletedAt: { not: null } },
    })

    if (!existing) {
      return { success: false, error: 'Data komsel yang terhapus tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.komsel.update({
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
        'KOMSEL_RESTORED',
        'Komsel',
        existing.id,
        `Restored Komsel "${existing.nama}"`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/komsel')
    revalidatePath('/dashboard/jemaat')

    return {
      success: true,
      message: `Komsel "${existing.nama}" berhasil dipulihkan.`,
    }
  } catch (error: any) {
    console.error('Error in restoreKomselAction:', error)
    return { success: false, error: error?.message || 'Gagal memulihkan komsel.' }
  }
}

/**
 * Hard Delete Komsel Permanently from PostgreSQL Database
 */
export async function hardDeleteKomselAction(input: HardDeleteKomselInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'komsel.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus permanen komsel.' }
    }

    const validated = hardDeleteKomselSchema.parse(input)
    const existing = await prisma.komsel.findUnique({
      where: { id: validated.id },
    })

    if (!existing) {
      return { success: false, error: 'Data komsel tidak ditemukan di database.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Release member links in Jemaat
      await tx.jemaat.updateMany({
        where: { komselId: existing.id },
        data: { komselId: null },
      })

      // 2. Delete all AnggotaKomsel records
      await tx.anggotaKomsel.deleteMany({
        where: { komselId: existing.id },
      })

      // 3. Delete Komsel permanently
      await tx.komsel.delete({
        where: { id: existing.id },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KOMSEL_PERMANENTLY_DELETED',
        'Komsel',
        existing.id,
        `Permanently deleted Komsel "${existing.nama}" from database.`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/komsel')
    revalidatePath('/dashboard/jemaat')

    return {
      success: true,
      message: `Komsel "${existing.nama}" berhasil dihapus secara PERMANEN dari database.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeleteKomselAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus permanen komsel.' }
  }
}

/**
 * Bulk Soft Delete Komsel
 */
export async function bulkSoftDeleteKomselAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'komsel.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin komsel.delete.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada komsel yang dipilih.' }
    }

    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penghapusan massal wajib diisi.' }
    }

    const { ids, reason } = data

    await prisma.$transaction(async (tx) => {
      await tx.komsel.updateMany({
        where: { id: { in: ids } },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: reason.trim(),
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'DELETE_BULK_SOFT_KOMSEL',
        'Komsel',
        `${ids.length}_RECORDS`,
        `Soft delete massal (${ids.length} komsel). Alasan: ${reason.trim()}`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/komsel')
    revalidatePath('/dashboard')

    return {
      success: true,
      message: `${ids.length} data komsel berhasil dipindahkan ke kotak sampah.`,
    }
  } catch (error: any) {
    console.error('Error in bulkSoftDeleteKomselAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus data komsel terpilih.' }
  }
}

/**
 * Bulk Assign / Change Kategorial for Selected Komsel
 */
export async function bulkAssignKategorialKomselAction(data: {
  ids: string[]
  kategorialId: string | null
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'komsel.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin komsel.update.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada komsel yang dipilih.' }
    }

    const { ids, kategorialId } = data

    await prisma.$transaction(async (tx) => {
      await tx.komsel.updateMany({
        where: { id: { in: ids } },
        data: {
          kategorialId: kategorialId || null,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ASSIGN_BULK_KATEGORIAL_KOMSEL',
        'Komsel',
        `${ids.length}_RECORDS`,
        `Penetapan kategorial massal untuk (${ids.length} komsel).`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/komsel')

    return {
      success: true,
      message: `Berhasil memperbarui kategorial pembina untuk ${ids.length} komsel terpilih.`,
    }
  } catch (error: any) {
    console.error('Error in bulkAssignKategorialKomselAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui kategorial komsel.' }
  }
}

/**
 * Get Full Komsel Details with Member Roster for Official A4 Print Sheets
 */
export async function getKomselForPrintSheetsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada komsel yang dipilih.', data: [] }
    }

    const items = await prisma.komsel.findMany({
      where: { id: { in: ids } },
      include: {
        kategorial: { select: { id: true, nama: true } },
        koordinator: {
          select: {
            id: true,
            nij: true,
            nama: true,
            namaPanggilan: true,
            noHp: true,
            whatsApp: true,
            email: true,
          },
        },
        anggota: {
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
                alamat: true,
                statusBaptis: true,
                statusJemaat: true,
              },
            },
          },
        },
      },
      orderBy: { nama: 'asc' },
    })

    return {
      success: true,
      data: items,
    }
  } catch (error: any) {
    console.error('Error in getKomselForPrintSheetsAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat data cetak lembar komsel.', data: [] }
  }
}
