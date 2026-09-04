'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  createTamuSchema,
  updateStatusFollowUpSchema,
  konversiTamuKeJemaatSchema,
  deleteTamuSchema,
  restoreTamuSchema,
  hardDeleteTamuSchema,
  tamuFilterSchema,
  CreateTamuInput,
  UpdateStatusFollowUpInput,
  KonversiTamuKeJemaatInput,
  DeleteTamuInput,
  RestoreTamuInput,
  HardDeleteTamuInput,
  TamuFilterParams,
} from '@/lib/validations/tamu'
import {
  getNextAtomicNij,
  generateUniqueBarcodeCode,
  calculateJemaatCompleteness,
  createAuditLog,
} from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

const CURRENT_STAFF_ACTOR = 'Staff Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

/**
 * Format relative duration from a date
 */
function getRelativeDurationString(date: Date | null | undefined): string {
  if (!date) return 'Hari ini'
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Hari ini'
  if (diffDays === 1) return '1 hari yang lalu'
  if (diffDays < 7) return `${diffDays} hari yang lalu`
  if (diffDays < 14) return '1 minggu yang lalu'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu yang lalu`
  if (diffDays < 60) return '1 bulan yang lalu'
  return `${Math.floor(diffDays / 30)} bulan yang lalu`
}

/**
 * Get Paginated Tamu List with Search, Filter & Pipeline Stats
 */
export async function getTamuListAction(params?: TamuFilterParams) {
  try {
    const validated = tamuFilterSchema.parse(params || {})
    const { search, statusHapus = 'ACTIVE', statusFollowUp, page, pageSize } = validated

    const whereClause: any = {
      statusJemaat: 'TAMU',
    }

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { nama: { contains: q, mode: 'insensitive' } },
        { namaPanggilan: { contains: q, mode: 'insensitive' } },
        { noHp: { contains: q, mode: 'insensitive' } },
        { whatsApp: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { alamat: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (statusFollowUp) {
      whereClause.statusFollowUp = statusFollowUp
    }

    const skip = (page - 1) * pageSize

    const [items, total, totalTamu, newCount, inProgressCount, needVisitationCount, completedCount] =
      await Promise.all([
        prisma.jemaat.findMany({
          where: whereClause,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            kategorial: { select: { id: true, nama: true } },
            komsel: { select: { id: true, nama: true } },
          },
        }),
        prisma.jemaat.count({ where: whereClause }),
        prisma.jemaat.count({ where: { statusJemaat: 'TAMU', deletedAt: null } }),
        prisma.jemaat.count({ where: { statusJemaat: 'TAMU', statusFollowUp: 'NEW', deletedAt: null } }),
        prisma.jemaat.count({ where: { statusJemaat: 'TAMU', statusFollowUp: 'IN_PROGRESS', deletedAt: null } }),
        prisma.jemaat.count({ where: { statusJemaat: 'TAMU', statusFollowUp: 'NEED_VISITATION', deletedAt: null } }),
        prisma.jemaat.count({ where: { statusJemaat: 'TAMU', statusFollowUp: 'COMPLETED', deletedAt: null } }),
      ])

    const formattedItems = items.map((item) => ({
      ...item,
      durasiKedatangan: getRelativeDurationString(item.tanggalBergabung || item.createdAt),
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
        stats: {
          totalTamu,
          newCount,
          inProgressCount,
          needVisitationCount,
          completedCount,
        },
      },
    }
  } catch (error: any) {
    console.error('Error in getTamuListAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat data tamu.',
    }
  }
}

/**
 * Get Tamu Detail by ID
 */
export async function getTamuByIdAction(id: string) {
  try {
    if (!id) throw new Error('ID Tamu wajib disertakan.')

    const tamu = await prisma.jemaat.findFirst({
      where: { id, statusJemaat: 'TAMU', deletedAt: null },
      include: {
        kategorial: { select: { id: true, nama: true } },
        komsel: { select: { id: true, nama: true } },
      },
    })

    if (!tamu) {
      return {
        success: false,
        error: 'Data tamu tidak ditemukan atau telah dikonversi/dihapus.',
      }
    }

    return {
      success: true,
      data: {
        ...tamu,
        durasiKedatangan: getRelativeDurationString(tamu.tanggalBergabung || tamu.createdAt),
      },
    }
  } catch (error: any) {
    console.error('Error in getTamuByIdAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengambil detail tamu.',
    }
  }
}

/**
 * Create New Tamu Record
 */
export async function createTamuAction(input: CreateTamuInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'tamu.create')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin tamu.create.' }
    }

    const validated = createTamuSchema.parse(input)

    const completenessPercentage = calculateJemaatCompleteness({
      nama: validated.nama,
      namaPanggilan: validated.namaPanggilan,
      jenisKelamin: validated.jenisKelamin,
      noHp: validated.noHp,
      whatsApp: validated.whatsApp,
      email: validated.email,
      alamat: validated.alamat,
      statusJemaat: 'TAMU',
    })

    const newTamu = await prisma.$transaction(async (tx) => {
      const created = await tx.jemaat.create({
        data: {
          nij: null,
          barcodeCode: null,
          nama: validated.nama,
          namaPanggilan: validated.namaPanggilan || null,
          jenisKelamin: validated.jenisKelamin,
          noHp: validated.noHp || null,
          whatsApp: validated.whatsApp || null,
          email: validated.email || null,
          alamat: validated.alamat || null,
          kota: validated.kota || 'Padang',
          provinsi: validated.provinsi || 'Sumatera Barat',
          statusJemaat: 'TAMU',
          statusFollowUp: 'NEW',
          tanggalBergabung: new Date(),
          catatan: validated.catatan || null,
          completenessPercentage,
        },
      })

      // Cryptographic SHA-256 Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'TAMU_CREATED',
        'Jemaat',
        created.id,
        JSON.stringify({
          nama: created.nama,
          jenisKelamin: created.jenisKelamin,
          noHp: created.noHp,
          statusFollowUp: created.statusFollowUp,
          catatan: created.catatan,
        }),
        undefined,
        tx
      )

      return created
    })

    revalidatePath('/dashboard/tamu')
    return {
      success: true,
      data: newTamu,
    }
  } catch (error: any) {
    console.error('Error in createTamuAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mendaftarkan tamu baru.',
    }
  }
}

/**
 * Update Status Follow-Up & Pastoral Notes
 */
export async function updateStatusFollowUpAction(input: UpdateStatusFollowUpInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'tamu.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin tamu.update.' }
    }

    const validated = updateStatusFollowUpSchema.parse(input)

    const existing = await prisma.jemaat.findUnique({
      where: { id: validated.id },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Data tamu tidak ditemukan.' }
    }

    if (existing.statusJemaat !== 'TAMU') {
      return { success: false, error: 'Update follow-up pastoral hanya dapat dilakukan pada jemaat berstatus TAMU.' }
    }

    const beforeState = {
      statusFollowUp: existing.statusFollowUp,
      catatan: existing.catatan,
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.jemaat.update({
        where: { id: validated.id },
        data: {
          statusFollowUp: validated.statusFollowUp,
          catatan: validated.catatan !== undefined ? validated.catatan : existing.catatan,
        },
      })

      const afterState = {
        statusFollowUp: res.statusFollowUp,
        catatan: res.catatan,
      }

      // Cryptographic SHA-256 Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'TAMU_FOLLOWUP_UPDATED',
        'Jemaat',
        res.id,
        JSON.stringify({
          tamu: `${res.nama}`,
          before: beforeState,
          after: afterState,
        }),
        undefined,
        tx
      )

      return res
    })

    revalidatePath('/dashboard/tamu')
    revalidatePath(`/dashboard/tamu/${validated.id}`)

    return {
      success: true,
      data: updated,
      message: `Status follow-up ${updated.nama} berhasil diubah menjadi ${updated.statusFollowUp}.`,
    }
  } catch (error: any) {
    console.error('Error in updateStatusFollowUpAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui status follow-up tamu.',
    }
  }
}

/**
 * Convert Tamu to Official Jemaat Tetap (1-Click Transactional Conversion)
 */
export async function konversiTamuKeJemaatAction(input: KonversiTamuKeJemaatInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'tamu.convert')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin tamu.convert.' }
    }

    const validated = konversiTamuKeJemaatSchema.parse(input)

    const existing = await prisma.jemaat.findUnique({
      where: { id: validated.id },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Data tamu tidak ditemukan.' }
    }

    // Idempotency & Double-click protection
    if (existing.statusJemaat === 'ACTIVE') {
      return { success: false, error: 'Tamu sudah dikonversi menjadi Jemaat Tetap.' }
    }

    if (existing.statusJemaat !== 'TAMU') {
      return {
        success: false,
        error: `Konversi hanya dapat dilakukan untuk status TAMU. Status saat ini: ${existing.statusJemaat}.`,
      }
    }

    const beforeState = {
      statusJemaat: existing.statusJemaat,
      statusFollowUp: existing.statusFollowUp,
      nij: existing.nij,
      barcodeCode: existing.barcodeCode,
    }

    const converted = await prisma.$transaction(async (tx) => {
      // 1. Generate Atomic NIJ & Barcode Code
      const atomicNij = await getNextAtomicNij(tx)
      const barcodeCode = await generateUniqueBarcodeCode(tx)

      // 2. Update existing Jemaat
      const res = await tx.jemaat.update({
        where: { id: validated.id },
        data: {
          statusJemaat: 'ACTIVE',
          statusFollowUp: 'COMPLETED',
          nij: atomicNij,
          barcodeCode,
          tanggalBergabung: existing.tanggalBergabung || new Date(),
        },
      })

      // 3. Recalculate Completeness
      const updatedCompleteness = calculateJemaatCompleteness({
        nama: res.nama,
        namaPanggilan: res.namaPanggilan,
        jenisKelamin: res.jenisKelamin,
        tempatLahir: res.tempatLahir,
        tanggalLahir: res.tanggalLahir,
        noHp: res.noHp,
        whatsApp: res.whatsApp,
        email: res.email,
        alamat: res.alamat,
        statusJemaat: res.statusJemaat,
        statusBaptis: res.statusBaptis,
        statusPernikahan: res.statusPernikahan,
        pekerjaan: res.pekerjaan,
        pendidikan: res.pendidikan,
        kontakDarurat: res.kontakDarurat,
      })

      const finalJemaat = await tx.jemaat.update({
        where: { id: res.id },
        data: { completenessPercentage: updatedCompleteness },
      })

      const afterState = {
        statusJemaat: finalJemaat.statusJemaat,
        statusFollowUp: finalJemaat.statusFollowUp,
        nij: finalJemaat.nij,
        barcodeCode: finalJemaat.barcodeCode,
      }

      // 4. Cryptographic SHA-256 Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'TAMU_CONVERTED_TO_JEMAAT',
        'Jemaat',
        finalJemaat.id,
        JSON.stringify({
          nama: finalJemaat.nama,
          before: beforeState,
          after: afterState,
        }),
        undefined,
        tx
      )

      return finalJemaat
    })

    revalidatePath('/dashboard/tamu')
    revalidatePath('/dashboard/jemaat')
    revalidatePath(`/dashboard/jemaat/${converted.id}`)

    return {
      success: true,
      data: converted,
      message: `Tamu "${converted.nama}" berhasil dikonversi menjadi Jemaat Tetap! NIJ resmi: ${converted.nij}.`,
    }
  } catch (error: any) {
    console.error('Error in konversiTamuKeJemaatAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengonversi tamu menjadi Jemaat.',
    }
  }
}

/**
 * Soft Delete Tamu
 */
export async function deleteTamuAction(input: DeleteTamuInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'jemaat.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin untuk menghapus tamu.' }
    }

    const validated = deleteTamuSchema.parse(input)

    const existing = await prisma.jemaat.findUnique({
      where: { id: validated.id },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Data tamu tidak ditemukan atau sudah dihapus.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.jemaat.update({
        where: { id: validated.id },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: validated.reason,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'TAMU_SOFT_DELETED',
        'Jemaat',
        validated.id,
        JSON.stringify({
          nama: existing.nama,
          reason: validated.reason,
        }),
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/tamu')
    return { success: true, message: `Data tamu "${existing.nama}" berhasil di-soft delete.` }
  } catch (error: any) {
    console.error('Error in deleteTamuAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus data tamu.' }
  }
}

/**
 * Restore Soft Deleted Tamu
 */
export async function restoreTamuAction(input: RestoreTamuInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'jemaat.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin untuk memulihkan tamu.' }
    }

    const validated = restoreTamuSchema.parse(input)

    const existing = await prisma.jemaat.findUnique({
      where: { id: validated.id },
    })

    if (!existing || !existing.deletedAt) {
      return { success: false, error: 'Data tamu tidak ditemukan dalam daftar terhapus.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.jemaat.update({
        where: { id: validated.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'TAMU_RESTORED',
        'Jemaat',
        validated.id,
        JSON.stringify({
          nama: existing.nama,
        }),
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/tamu')
    return { success: true, message: `Data tamu "${existing.nama}" berhasil dipulihkan!` }
  } catch (error: any) {
    console.error('Error in restoreTamuAction:', error)
    return { success: false, error: error?.message || 'Gagal memulihkan data tamu.' }
  }
}

/**
 * Permanently Delete Tamu from Database
 */
export async function hardDeleteTamuAction(input: HardDeleteTamuInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'jemaat.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin untuk menghapus permanen tamu.' }
    }

    const validated = hardDeleteTamuSchema.parse(input)

    const existing = await prisma.jemaat.findUnique({
      where: { id: validated.id },
    })

    if (!existing) {
      return { success: false, error: 'Data tamu tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete audit logs referencing this jemaat
      await tx.auditLog.deleteMany({
        where: { entityId: validated.id },
      })

      // 2. Delete the record
      await tx.jemaat.delete({
        where: { id: validated.id },
      })

      // 3. Create hard delete audit log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'TAMU_PERMANENTLY_DELETED',
        'Jemaat',
        validated.id,
        JSON.stringify({
          nama: existing.nama,
          statusJemaat: existing.statusJemaat,
          reason: validated.reason,
        }),
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/tamu')
    return { success: true, message: `Data tamu "${existing.nama}" berhasil dihapus permanen dari database.` }
  } catch (error: any) {
    console.error('Error in hardDeleteTamuAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus permanen data tamu.' }
  }
}

/**
 * Get Real Database Count of Active Tamu for Sidebar Badge
 */
export async function getTamuActiveCountAction() {
  try {
    const count = await prisma.jemaat.count({
      where: {
        statusJemaat: 'TAMU',
        deletedAt: null,
      },
    })
    return { success: true, count }
  } catch (error: any) {
    console.error('Error in getTamuActiveCountAction:', error)
    return { success: false, count: 0 }
  }
}
