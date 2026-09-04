'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  createKeluargaSchema,
  updateKeluargaSchema,
  addAnggotaKeluargaSchema,
  updateRelasiAnggotaSchema,
  removeAnggotaKeluargaSchema,
  deleteKeluargaSchema,
  restoreKeluargaSchema,
  hardDeleteKeluargaSchema,
  promoteKepalaKeluargaSchema,
  keluargaFilterSchema,
  CreateKeluargaInput,
  UpdateKeluargaInput,
  AddAnggotaKeluargaInput,
  UpdateRelasiAnggotaInput,
  RemoveAnggotaKeluargaInput,
  DeleteKeluargaInput,
  RestoreKeluargaInput,
  HardDeleteKeluargaInput,
  PromoteKepalaKeluargaInput,
  KeluargaFilterParams,
} from '@/lib/validations/keluarga'
import { getNextAtomicNomorKeluarga, syncKeluargaTotalAnggota } from '@/lib/keluarga-helpers'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

const CURRENT_STAFF_ACTOR = 'Staff Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

/**
 * Get Paginated Keluarga List with Search & Filtering
 */
export async function getKeluargaListAction(params?: KeluargaFilterParams) {
  try {
    const validated = keluargaFilterSchema.parse(params || {})
    const { search, statusHapus = 'ACTIVE', page, pageSize } = validated

    const whereClause: any = {}

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }
    // If 'ALL', no deletedAt filter is applied

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { namaKeluarga: { contains: q, mode: 'insensitive' } },
        { nomorKeluarga: { contains: q, mode: 'insensitive' } },
        { kepalaJemaat: { nama: { contains: q, mode: 'insensitive' } } },
        { alamat: { contains: q, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.keluarga.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          kepalaJemaat: {
            select: { id: true, nama: true, nij: true, noHp: true },
          },
        },
      }),
      prisma.keluarga.count({ where: whereClause }),
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
    console.error('Error in getKeluargaListAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat data keluarga.',
    }
  }
}

/**
 * Get Keluarga Detail by ID with Full Member List
 */
export async function getKeluargaByIdAction(id: string) {
  try {
    if (!id) throw new Error('ID Keluarga wajib disertakan.')

    const keluarga = await prisma.keluarga.findFirst({
      where: { id, deletedAt: null },
      include: {
        kepalaJemaat: {
          select: { id: true, nama: true, nij: true, noHp: true, email: true },
        },
        anggotaKeluarga: {
          include: {
            jemaat: {
              select: {
                id: true,
                nama: true,
                nij: true,
                jenisKelamin: true,
                tanggalLahir: true,
                statusJemaat: true,
                noHp: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!keluarga) {
      return {
        success: false,
        error: 'Data Kartu Keluarga tidak ditemukan atau telah dihapus.',
      }
    }

    return {
      success: true,
      data: keluarga,
    }
  } catch (error: any) {
    console.error('Error in getKeluargaByIdAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengambil detail keluarga.',
    }
  }
}

/**
 * Create New Kartu Keluarga
 */
export async function createKeluargaAction(input: CreateKeluargaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'keluarga.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keluarga.manage.' }
    }

    const validated = createKeluargaSchema.parse(input)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomic Nomor KK Generator
      const nomorKeluarga = await getNextAtomicNomorKeluarga(tx)

      // 2. Validate Kepala Keluarga if selected
      let kepalaJemaat: any = null
      if (validated.kepalaId) {
        kepalaJemaat = await tx.jemaat.findUnique({
          where: { id: validated.kepalaId },
        })

        if (!kepalaJemaat || kepalaJemaat.deletedAt) {
          throw new Error('Jemaat yang dipilih sebagai Kepala Keluarga tidak valid.')
        }

        // Check if Kepala Keluarga is already in another active family
        const existingMembership = await tx.anggotaKeluarga.findUnique({
          where: { jemaatId: validated.kepalaId },
          include: { keluarga: true },
        })

        if (existingMembership && existingMembership.keluarga && !existingMembership.keluarga.deletedAt) {
          throw new Error(
            `Jemaat ${kepalaJemaat.nama} (${kepalaJemaat.nij}) sudah terdaftar sebagai anggota di Kartu Keluarga ${existingMembership.keluarga.nomorKeluarga}.`
          )
        }
      }

      // 3. Create Keluarga Record
      const createdKeluarga = await tx.keluarga.create({
        data: {
          nomorKeluarga,
          namaKeluarga: validated.namaKeluarga.trim(),
          kepalaId: validated.kepalaId || null,
          noHp: validated.noHp?.trim() || kepalaJemaat?.noHp || null,
          alamat: validated.alamat?.trim() || kepalaJemaat?.alamat || null,
          totalAnggota: validated.kepalaId ? 1 : 0,
        },
      })

      // 4. If Kepala Keluarga provided, add as AnggotaKeluarga & set Jemaat.keluargaId
      if (validated.kepalaId && kepalaJemaat) {
        const defaultRelasi = kepalaJemaat.jenisKelamin === 'PEREMPUAN' ? 'ORANG_TUA' : 'SUAMI'
        await tx.anggotaKeluarga.create({
          data: {
            keluargaId: createdKeluarga.id,
            jemaatId: validated.kepalaId,
            relasi: defaultRelasi,
            catatanRelasi: 'Kepala Keluarga',
          },
        })

        await tx.jemaat.update({
          where: { id: validated.kepalaId },
          data: { keluargaId: createdKeluarga.id },
        })
      }

      // 5. SHA-256 Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KELUARGA_CREATED',
        'Keluarga',
        createdKeluarga.id,
        `Created Kartu Keluarga ${createdKeluarga.namaKeluarga} (${createdKeluarga.nomorKeluarga})`,
        undefined,
        tx
      )

      return createdKeluarga
    })

    revalidatePath('/dashboard/keluarga')
    revalidatePath('/dashboard/jemaat')

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error('Error in createKeluargaAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal membuat Kartu Keluarga baru.',
    }
  }
}

/**
 * Update Existing Kartu Keluarga
 */
export async function updateKeluargaAction(input: UpdateKeluargaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'keluarga.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keluarga.manage.' }
    }

    const validated = updateKeluargaSchema.parse(input)
    const existing = await prisma.keluarga.findUnique({
      where: { id: validated.id },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Data Kartu Keluarga tidak ditemukan.' }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If kepalaId is updated
      if (validated.kepalaId !== undefined && validated.kepalaId !== existing.kepalaId) {
        if (validated.kepalaId) {
          const newKepala = await tx.jemaat.findUnique({
            where: { id: validated.kepalaId },
          })

          if (!newKepala || newKepala.deletedAt) {
            throw new Error('Kepala Keluarga yang dipilih tidak valid.')
          }

          // Check if new kepala is in another family
          const existingMem = await tx.anggotaKeluarga.findUnique({
            where: { jemaatId: validated.kepalaId },
            include: { keluarga: true },
          })

          if (existingMem && existingMem.keluargaId !== existing.id && existingMem.keluarga && !existingMem.keluarga.deletedAt) {
            throw new Error(
              `Jemaat ${newKepala.nama} (${newKepala.nij}) sudah terdaftar di Kartu Keluarga ${existingMem.keluarga.nomorKeluarga}.`
            )
          }

          // Ensure AnggotaKeluarga record exists for this family
          if (!existingMem) {
            const relasi = newKepala.jenisKelamin === 'PEREMPUAN' ? 'ORANG_TUA' : 'SUAMI'
            await tx.anggotaKeluarga.create({
              data: {
                keluargaId: existing.id,
                jemaatId: validated.kepalaId,
                relasi,
                catatanRelasi: 'Kepala Keluarga',
              },
            })
            await tx.jemaat.update({
              where: { id: validated.kepalaId },
              data: { keluargaId: existing.id },
            })
          }
        }
      }

      const res = await tx.keluarga.update({
        where: { id: validated.id },
        data: {
          namaKeluarga: validated.namaKeluarga ? validated.namaKeluarga.trim() : existing.namaKeluarga,
          kepalaId: validated.kepalaId !== undefined ? validated.kepalaId : existing.kepalaId,
          noHp: validated.noHp !== undefined ? validated.noHp : existing.noHp,
          alamat: validated.alamat !== undefined ? validated.alamat : existing.alamat,
        },
      })

      await syncKeluargaTotalAnggota(existing.id, tx)

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KELUARGA_UPDATED',
        'Keluarga',
        res.id,
        `Updated Kartu Keluarga ${res.namaKeluarga} (${res.nomorKeluarga})`,
        undefined,
        tx
      )

      return res
    })

    revalidatePath('/dashboard/keluarga')
    revalidatePath(`/dashboard/keluarga/${validated.id}`)
    revalidatePath('/dashboard/jemaat')

    return {
      success: true,
      data: updated,
    }
  } catch (error: any) {
    console.error('Error in updateKeluargaAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui Kartu Keluarga.',
    }
  }
}

/**
 * Add Member to Kartu Keluarga (Strict 1 Active Family per Jemaat Protection)
 */
export async function addAnggotaKeluargaAction(input: AddAnggotaKeluargaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'keluarga.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keluarga.manage.' }
    }

    const validated = addAnggotaKeluargaSchema.parse(input)

    const result = await prisma.$transaction(async (tx) => {
      const keluarga = await tx.keluarga.findUnique({
        where: { id: validated.keluargaId },
      })
      if (!keluarga || keluarga.deletedAt) {
        throw new Error('Kartu Keluarga tidak ditemukan.')
      }

      const jemaat = await tx.jemaat.findUnique({
        where: { id: validated.jemaatId },
      })
      if (!jemaat || jemaat.deletedAt) {
        throw new Error('Jemaat tidak ditemukan.')
      }

      // Check if Jemaat already belongs to ANY active family
      const existingMembership = await tx.anggotaKeluarga.findUnique({
        where: { jemaatId: validated.jemaatId },
        include: { keluarga: true },
      })

      if (existingMembership && existingMembership.keluarga && !existingMembership.keluarga.deletedAt) {
        if (existingMembership.keluargaId === validated.keluargaId) {
          throw new Error(`Jemaat ${jemaat.nama} (${jemaat.nij}) sudah terdaftar dalam Kartu Keluarga ini.`)
        } else {
          throw new Error(
            `Jemaat ${jemaat.nama} (${jemaat.nij}) sudah terdaftar sebagai anggota di Kartu Keluarga lain (${existingMembership.keluarga.nomorKeluarga}).`
          )
        }
      }

      // Create Member Record
      const newAnggota = await tx.anggotaKeluarga.create({
        data: {
          keluargaId: validated.keluargaId,
          jemaatId: validated.jemaatId,
          relasi: validated.relasi,
          catatanRelasi: validated.catatanRelasi?.trim() || null,
        },
      })

      // Link Jemaat.keluargaId
      await tx.jemaat.update({
        where: { id: validated.jemaatId },
        data: { keluargaId: validated.keluargaId },
      })

      // Sync total anggota
      await syncKeluargaTotalAnggota(validated.keluargaId, tx)

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ANGGOTA_KELUARGA_ADDED',
        'AnggotaKeluarga',
        newAnggota.id,
        `Added ${jemaat.nama} (${jemaat.nij}) as ${validated.relasi} to KK ${keluarga.nomorKeluarga}`,
        undefined,
        tx
      )

      return newAnggota
    })

    revalidatePath('/dashboard/keluarga')
    revalidatePath(`/dashboard/keluarga/${validated.keluargaId}`)
    revalidatePath('/dashboard/jemaat')
    revalidatePath(`/dashboard/jemaat/${validated.jemaatId}`)

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error('Error in addAnggotaKeluargaAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menambahkan anggota keluarga.',
    }
  }
}

/**
 * Update Family Member Relation / Notes
 */
export async function updateRelasiAnggotaAction(input: UpdateRelasiAnggotaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'keluarga.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keluarga.manage.' }
    }

    const validated = updateRelasiAnggotaSchema.parse(input)

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.anggotaKeluarga.findUnique({
        where: { id: validated.anggotaId },
        include: { jemaat: true, keluarga: true },
      })

      if (!existing) {
        throw new Error('Data Anggota Keluarga tidak ditemukan.')
      }

      const res = await tx.anggotaKeluarga.update({
        where: { id: validated.anggotaId },
        data: {
          relasi: validated.relasi,
          catatanRelasi: validated.catatanRelasi !== undefined ? validated.catatanRelasi : existing.catatanRelasi,
        },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ANGGOTA_KELUARGA_UPDATED',
        'AnggotaKeluarga',
        res.id,
        `Updated relation for ${existing.jemaat.nama} to ${validated.relasi} in KK ${existing.keluarga.nomorKeluarga}`,
        undefined,
        tx
      )

      return res
    })

    revalidatePath('/dashboard/keluarga')
    revalidatePath(`/dashboard/keluarga/${updated.keluargaId}`)

    return {
      success: true,
      data: updated,
    }
  } catch (error: any) {
    console.error('Error in updateRelasiAnggotaAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui hubungan keluarga.',
    }
  }
}

/**
 * Promote an existing family member to Kepala Keluarga
 */
export async function promoteKepalaKeluargaAction(input: PromoteKepalaKeluargaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'keluarga.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keluarga.manage.' }
    }

    const validated = promoteKepalaKeluargaSchema.parse(input)

    const result = await prisma.$transaction(async (tx) => {
      const targetAnggota = await tx.anggotaKeluarga.findUnique({
        where: { id: validated.anggotaId },
        include: { jemaat: true, keluarga: true },
      })

      if (!targetAnggota || targetAnggota.keluargaId !== validated.keluargaId) {
        throw new Error('Data Anggota Keluarga tidak ditemukan dalam keluarga ini.')
      }

      const keluarga = targetAnggota.keluarga
      const oldKepalaId = keluarga.kepalaId

      // 1. Update target member note/relasi
      await tx.anggotaKeluarga.update({
        where: { id: validated.anggotaId },
        data: {
          catatanRelasi: 'Kepala Keluarga',
        },
      })

      // 2. If there was a previous kepala, update old kepala note/relasi if specified
      if (oldKepalaId && oldKepalaId !== targetAnggota.jemaatId) {
        const oldKepalaMember = await tx.anggotaKeluarga.findFirst({
          where: { keluargaId: validated.keluargaId, jemaatId: oldKepalaId },
          include: { jemaat: true },
        })

        if (oldKepalaMember) {
          const fallbackRelasi = validated.relasiKepalaLama || (oldKepalaMember.jemaat?.jenisKelamin === 'PEREMPUAN' ? 'ISTRI' : 'SUAMI')
          await tx.anggotaKeluarga.update({
            where: { id: oldKepalaMember.id },
            data: {
              relasi: fallbackRelasi as any,
              catatanRelasi: null,
            },
          })
        }
      }

      // 3. Update keluarga.kepalaId
      const updatedKeluarga = await tx.keluarga.update({
        where: { id: validated.keluargaId },
        data: {
          kepalaId: targetAnggota.jemaatId,
          noHp: targetAnggota.jemaat?.noHp || targetAnggota.jemaat?.whatsApp || keluarga.noHp,
        },
      })

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KEPALA_KELUARGA_PROMOTED',
        'Keluarga',
        updatedKeluarga.id,
        `Promoted ${targetAnggota.jemaat.nama} (${targetAnggota.jemaat.nij}) as Kepala Keluarga in KK ${keluarga.nomorKeluarga}`,
        undefined,
        tx
      )

      return updatedKeluarga
    })

    revalidatePath('/dashboard/keluarga')
    revalidatePath(`/dashboard/keluarga/${validated.keluargaId}`)
    revalidatePath('/dashboard/jemaat')

    return {
      success: true,
      message: `Berhasil menetapkan Kepala Keluarga baru.`,
      data: result,
    }
  } catch (error: any) {
    console.error('Error in promoteKepalaKeluargaAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengubah Kepala Keluarga.',
    }
  }
}

/**
 * Remove Member from Kartu Keluarga (Releases relationship, DOES NOT delete Jemaat)
 */
export async function removeAnggotaKeluargaAction(input: RemoveAnggotaKeluargaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'keluarga.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keluarga.manage.' }
    }

    const validated = removeAnggotaKeluargaSchema.parse(input)

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.anggotaKeluarga.findUnique({
        where: { id: validated.anggotaId },
        include: { jemaat: true, keluarga: true },
      })

      if (!member) {
        throw new Error('Data Anggota Keluarga tidak ditemukan.')
      }

      // If this member was Kepala Keluarga, clear kepalaId
      if (member.keluarga.kepalaId === member.jemaatId) {
        await tx.keluarga.update({
          where: { id: member.keluargaId },
          data: { kepalaId: null },
        })
      }

      // Unlink Jemaat.keluargaId
      await tx.jemaat.update({
        where: { id: member.jemaatId },
        data: { keluargaId: null },
      })

      // Delete AnggotaKeluarga relation record
      await tx.anggotaKeluarga.delete({
        where: { id: validated.anggotaId },
      })

      // Sync total anggota
      await syncKeluargaTotalAnggota(member.keluargaId, tx)

      // Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ANGGOTA_KELUARGA_REMOVED',
        'AnggotaKeluarga',
        member.id,
        `Removed ${member.jemaat.nama} (${member.jemaat.nij}) from Kartu Keluarga ${member.keluarga.nomorKeluarga}`,
        undefined,
        tx
      )

      return member
    })

    revalidatePath('/dashboard/keluarga')
    revalidatePath(`/dashboard/keluarga/${result.keluargaId}`)
    revalidatePath('/dashboard/jemaat')
    revalidatePath(`/dashboard/jemaat/${result.jemaatId}`)

    return {
      success: true,
      message: `Anggota ${result.jemaat.nama} berhasil dikeluarkan dari Kartu Keluarga. Data Jemaat tetap utuh.`,
    }
  } catch (error: any) {
    console.error('Error in removeAnggotaKeluargaAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengeluarkan anggota keluarga.',
    }
  }
}

/**
 * Soft Delete Kartu Keluarga (Releases member relationships, DOES NOT delete Jemaat)
 */
export async function deleteKeluargaAction(input: DeleteKeluargaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'keluarga.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keluarga.manage.' }
    }

    const validated = deleteKeluargaSchema.parse(input)
    const existing = await prisma.keluarga.findUnique({
      where: { id: validated.id },
      include: { anggotaKeluarga: true },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Data Kartu Keluarga tidak ditemukan atau sudah dihapus.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Unlink all Jemaat.keluargaId
      await tx.jemaat.updateMany({
        where: { keluargaId: existing.id },
        data: { keluargaId: null },
      })

      // 2. Delete all AnggotaKeluarga records
      await tx.anggotaKeluarga.deleteMany({
        where: { keluargaId: existing.id },
      })

      // 3. Soft Delete Keluarga
      const softDeleted = await tx.keluarga.update({
        where: { id: existing.id },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: validated.reason.trim(),
          totalAnggota: 0,
          kepalaId: null,
        },
      })

      // 4. SHA-256 Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KELUARGA_DELETED',
        'Keluarga',
        softDeleted.id,
        `Soft-deleted Kartu Keluarga ${softDeleted.namaKeluarga} (${softDeleted.nomorKeluarga}). Reason: "${validated.reason}"`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/keluarga')
    revalidatePath('/dashboard/jemaat')

    return {
      success: true,
      message: `Kartu Keluarga ${existing.namaKeluarga} (${existing.nomorKeluarga}) berhasil di-soft delete. Seluruh data Jemaat tetap utuh.`,
    }
  } catch (error: any) {
    console.error('Error in deleteKeluargaAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menghapus Kartu Keluarga.',
    }
  }
}

/**
 * Restore Soft-Deleted Kartu Keluarga
 */
export async function restoreKeluargaAction(input: RestoreKeluargaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'keluarga.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin memulihkan Kartu Keluarga.' }
    }

    const validated = restoreKeluargaSchema.parse(input)
    const existing = await prisma.keluarga.findFirst({
      where: { id: validated.id, deletedAt: { not: null } },
    })

    if (!existing) {
      return { success: false, error: 'Data Kartu Keluarga yang terhapus tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.keluarga.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      })

      // SHA-256 Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KELUARGA_RESTORED',
        'Keluarga',
        existing.id,
        `Restored Kartu Keluarga ${existing.namaKeluarga} (${existing.nomorKeluarga})`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/keluarga')

    return {
      success: true,
      message: `Kartu Keluarga ${existing.namaKeluarga} berhasil dipulihkan.`,
    }
  } catch (error: any) {
    console.error('Error in restoreKeluargaAction:', error)
    return { success: false, error: error?.message || 'Gagal memulihkan Kartu Keluarga.' }
  }
}

/**
 * Hard Delete Kartu Keluarga from PostgreSQL Database
 */
export async function hardDeleteKeluargaAction(input: HardDeleteKeluargaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'keluarga.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus permanen Kartu Keluarga.' }
    }

    const validated = hardDeleteKeluargaSchema.parse(input)
    const existing = await prisma.keluarga.findUnique({
      where: { id: validated.id },
    })

    if (!existing) {
      return { success: false, error: 'Data Kartu Keluarga tidak ditemukan di database.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Unlink any remaining Jemaat.keluargaId
      await tx.jemaat.updateMany({
        where: { keluargaId: existing.id },
        data: { keluargaId: null },
      })

      // 2. Delete any AnggotaKeluarga rows
      await tx.anggotaKeluarga.deleteMany({
        where: { keluargaId: existing.id },
      })

      // 3. Delete Keluarga record permanently
      await tx.keluarga.delete({
        where: { id: existing.id },
      })

      // 4. SHA-256 Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'KELUARGA_PERMANENTLY_DELETED',
        'Keluarga',
        existing.id,
        `Permanently deleted Kartu Keluarga ${existing.namaKeluarga} (${existing.nomorKeluarga}) from database.`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/keluarga')

    return {
      success: true,
      message: `Kartu Keluarga ${existing.namaKeluarga} berhasil dihapus secara PERMANEN dari database.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeleteKeluargaAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus permanen Kartu Keluarga.' }
  }
}

/**
 * Bulk Soft Delete Keluarga
 */
export async function bulkSoftDeleteKeluargaAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada keluarga yang dipilih.' }
    }
    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penghapusan massal wajib diisi.' }
    }

    const { ids, reason } = data

    await prisma.$transaction(async (tx) => {
      await tx.keluarga.updateMany({
        where: { id: { in: ids } },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: reason,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'DELETE_BULK_SOFT',
        'Keluarga',
        `${ids.length}_RECORDS`,
        `Soft delete massal (${ids.length} keluarga). Alasan: ${reason}`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/keluarga')
    revalidatePath('/dashboard')
    return {
      success: true,
      message: `${ids.length} kartu keluarga berhasil dipindahkan ke kotak sampah.`,
    }
  } catch (error: any) {
    console.error('Error in bulkSoftDeleteKeluargaAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus data keluarga terpilih.' }
  }
}

/**
 * Bulk Assign Komsel to all Jemaat in selected Families
 */
export async function bulkAssignKomselKeluargaAction(data: {
  ids: string[]
  komselId?: string | null
}) {
  try {
    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada keluarga yang dipilih.' }
    }

    const { ids, komselId } = data
    const targetKomselId = komselId === 'NONE' || komselId === '' ? null : komselId

    await prisma.$transaction(async (tx) => {
      await tx.jemaat.updateMany({
        where: { keluargaId: { in: ids } },
        data: {
          komselId: targetKomselId,
          updatedAt: new Date(),
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ASSIGN_BULK_KOMSEL_KELUARGA',
        'Keluarga',
        `${ids.length}_RECORDS`,
        `Penetapan Komsel massal untuk seluruh anggota di (${ids.length} keluarga).`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/keluarga')
    revalidatePath('/dashboard/jemaat')
    return {
      success: true,
      message: `Komsel berhasil diperbarui untuk seluruh anggota dari ${ids.length} keluarga terpilih.`,
    }
  } catch (error: any) {
    console.error('Error in bulkAssignKomselKeluargaAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui komsel keluarga.' }
  }
}

/**
 * Get Full Keluarga Details with Members for Printing Official Kartu Keluarga Sheets
 */
export async function getKeluargaForPrintSheetsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada keluarga yang dipilih.', data: [] }
    }

    const items = await prisma.keluarga.findMany({
      where: { id: { in: ids } },
      include: {
        kepalaJemaat: {
          select: {
            id: true,
            nama: true,
            nij: true,
            noHp: true,
            whatsApp: true,
            alamat: true,
            komsel: { select: { nama: true } },
          },
        },
        anggotaKeluarga: {
          include: {
            jemaat: {
              select: {
                id: true,
                nij: true,
                nama: true,
                namaPanggilan: true,
                jenisKelamin: true,
                tempatLahir: true,
                tanggalLahir: true,
                statusBaptis: true,
                statusPernikahan: true,
                statusJemaat: true,
                kategorial: { select: { nama: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { nomorKeluarga: 'asc' },
    })

    return {
      success: true,
      data: items,
    }
  } catch (error: any) {
    console.error('Error in getKeluargaForPrintSheetsAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat data formulir kartu keluarga.', data: [] }
  }
}

/**
 * Get Dropdown Options for Keluarga (Active Komsel list)
 */
export async function getKeluargaFormOptionsAction() {
  try {
    const komselList = await prisma.komsel.findMany({
      where: { deletedAt: null },
      select: { id: true, nama: true },
      orderBy: { nama: 'asc' },
    })

    return {
      success: true,
      data: {
        komsel: komselList,
      },
    }
  } catch (error: any) {
    console.error('Error in getKeluargaFormOptionsAction:', error)
    return {
      success: false,
      data: { komsel: [] },
    }
  }
}
