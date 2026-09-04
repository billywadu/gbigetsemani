'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  uploadArsipGerejaSchema,
  updateArsipGerejaSchema,
  deleteArsipGerejaSchema,
  restoreArsipGerejaSchema,
  hardDeleteArsipGerejaSchema,
  arsipFilterSchema,
  UploadArsipGerejaInput,
  UpdateArsipGerejaInput,
  DeleteArsipGerejaInput,
  RestoreArsipGerejaInput,
  HardDeleteArsipGerejaInput,
  ArsipFilterParams,
  JenisArsip,
  StatusArsip,
} from '@/lib/validations/arsip'
import { getStorageProvider } from '@/lib/storage'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

const CURRENT_STAFF_ACTOR = 'Sekretariat / Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

export type ArsipGerejaDTO = {
  id: string
  judul: string
  jenisArsip: JenisArsip
  kategorialId: string | null
  kategorialNama: string | null
  tanggalDokumen: string
  status: StatusArsip
  deskripsi: string | null
  cloudinaryPublicId: string | null
  fileUrl: string | null
  mimeType: string
  fileSize: number
  uploadedById: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ArsipGerejaDetailDTO = ArsipGerejaDTO & {
  accessUrl: string
}

/**
 * Get Kategorial Options for Archive Filter & Form
 */
export async function getKategorialOptionsAction() {
  try {
    const kategorials = await prisma.kategorial.findMany({
      where: { deletedAt: null },
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true },
    })
    return { success: true, data: kategorials }
  } catch (error: any) {
    console.error('Error in getKategorialOptionsAction:', error)
    return { success: false, error: 'Gagal memuat kategorial.' }
  }
}

/**
 * Get Paginated List of Church Archives with Filters & Summary Stats
 */
export async function getArsipGerejaListAction(params?: ArsipFilterParams) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'archive.read') && !hasPermission(CURRENT_STAFF_ROLE, 'document.read')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin archive.read.' }
    }

    const validated = arsipFilterSchema.parse(params || {})
    const { search, statusHapus = 'ACTIVE', jenisArsip, kategorialId, status, page, pageSize } = validated

    const whereClause: Prisma.ArsipGerejaWhereInput = {}

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }

    if (jenisArsip) whereClause.jenisArsip = jenisArsip
    if (status) whereClause.status = status

    if (kategorialId) {
      if (kategorialId === 'none' || kategorialId === 'UMUM') {
        whereClause.kategorialId = null
      } else if (kategorialId !== 'all') {
        whereClause.kategorialId = kategorialId
      }
    }

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { judul: { contains: q, mode: 'insensitive' } },
        { deskripsi: { contains: q, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * pageSize

    const [items, total, allArchives] = await Promise.all([
      prisma.arsipGereja.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { tanggalDokumen: 'desc' },
        include: {
          kategorial: {
            select: { id: true, nama: true },
          },
        },
      }),
      prisma.arsipGereja.count({ where: whereClause }),
      prisma.arsipGereja.findMany({
        where: { deletedAt: null },
        select: { status: true },
      }),
    ])

    let totalAktif = 0
    let totalInaktif = 0
    let totalPermanen = 0

    allArchives.forEach((a) => {
      if (a.status === 'AKTIF') totalAktif++
      else if (a.status === 'INAKTIF') totalInaktif++
      else if (a.status === 'PERMANEN') totalPermanen++
    })

    const formattedItems: ArsipGerejaDTO[] = items.map((a) => ({
      id: a.id,
      judul: a.judul,
      jenisArsip: a.jenisArsip,
      kategorialId: a.kategorialId,
      kategorialNama: a.kategorial?.nama || 'Arsip Umum Gereja',
      tanggalDokumen: a.tanggalDokumen.toISOString(),
      status: a.status,
      deskripsi: a.deskripsi,
      cloudinaryPublicId: a.cloudinaryPublicId,
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
      uploadedById: a.uploadedById,
      deletedAt: a.deletedAt ? a.deletedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
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
          totalArsip: allArchives.length,
          totalAktif,
          totalInaktif,
          totalPermanen,
        },
      },
    }
  } catch (error: any) {
    console.error('Error in getArsipGerejaListAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat daftar arsip dokumen gereja.',
    }
  }
}

/**
 * Get Church Archive by ID (IDOR Protected)
 */
export async function getArsipGerejaByIdAction(id: string) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'archive.read') && !hasPermission(CURRENT_STAFF_ROLE, 'document.read')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin archive.read.' }
    }

    if (!id) throw new Error('ID Arsip wajib disertakan.')

    const a = await prisma.arsipGereja.findFirst({
      where: { id, deletedAt: null },
      include: {
        kategorial: { select: { id: true, nama: true } },
      },
    })

    if (!a) {
      return { success: false, error: 'Arsip dokumen gereja tidak ditemukan atau telah dihapus.' }
    }

    const storage = getStorageProvider('public/uploads/arsip')
    const accessUrl = a.cloudinaryPublicId
      ? await storage.getSignedUrl(a.cloudinaryPublicId)
      : a.fileUrl || '/placeholder.pdf'

    const detail: ArsipGerejaDetailDTO = {
      id: a.id,
      judul: a.judul,
      jenisArsip: a.jenisArsip,
      kategorialId: a.kategorialId,
      kategorialNama: a.kategorial?.nama || 'Arsip Umum Gereja',
      tanggalDokumen: a.tanggalDokumen.toISOString(),
      status: a.status,
      deskripsi: a.deskripsi,
      cloudinaryPublicId: a.cloudinaryPublicId,
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
      uploadedById: a.uploadedById,
      deletedAt: a.deletedAt ? a.deletedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      accessUrl,
    }

    return {
      success: true,
      data: detail,
    }
  } catch (error: any) {
    console.error('Error in getArsipGerejaByIdAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengambil detail arsip.',
    }
  }
}

/**
 * Upload New Church Archive Document with Storage Abstraction & Audit
 */
export async function uploadArsipGerejaAction(formData: FormData) {
  let uploadedFileIdentifier: string | null = null
  const storage = getStorageProvider('public/uploads/arsip')

  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.upload')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.upload.' }
    }

    const judul = formData.get('judul') as string
    const jenisArsip = formData.get('jenisArsip') as string
    const kategorialId = formData.get('kategorialId') as string | null
    const tanggalDokumen = formData.get('tanggalDokumen') as string
    const status = (formData.get('status') as string) || 'AKTIF'
    const deskripsi = formData.get('deskripsi') as string | null
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Berkas arsip dokumen gereja wajib diunggah.' }
    }

    // 1. Zod Metadata Validation
    const validated = uploadArsipGerejaSchema.parse({
      judul,
      jenisArsip,
      kategorialId: kategorialId || null,
      tanggalDokumen,
      status,
      deskripsi,
    })

    // 2. Upload File to Storage (checks size <= 5MB and validates binary magic bytes)
    const uploadResult = await storage.upload(file)
    uploadedFileIdentifier = uploadResult.identifier

    // 3. Save Database Record
    const created = await prisma.arsipGereja.create({
      data: {
        judul: validated.judul,
        jenisArsip: validated.jenisArsip,
        kategorialId: validated.kategorialId,
        tanggalDokumen: validated.tanggalDokumen,
        status: validated.status,
        deskripsi: validated.deskripsi,
        cloudinaryPublicId: uploadResult.identifier,
        fileUrl: uploadResult.fileUrl,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        uploadedById: CURRENT_STAFF_ACTOR,
      },
      include: {
        kategorial: { select: { nama: true } },
      },
    })

    // 4. Cryptographic SHA-256 Audit Log
    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARSIP_GEREJA_UPLOADED',
      'ArsipGereja',
      created.id,
      JSON.stringify({
        arsipId: created.id,
        judul: created.judul,
        jenisArsip: created.jenisArsip,
        kategorialNama: created.kategorial?.nama || 'Arsip Umum',
        status: created.status,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
      })
    )

    try {
      revalidatePath('/dashboard/arsip-gereja')
    } catch {}

    return {
      success: true,
      data: created,
      message: `Arsip "${created.judul}" berhasil diunggah!`,
    }
  } catch (error: any) {
    console.error('Error in uploadArsipGerejaAction:', error)

    // Cleanup uploaded file if database insert failed
    if (uploadedFileIdentifier) {
      try {
        await storage.delete(uploadedFileIdentifier)
      } catch (cleanupErr) {
        console.error('Failed to cleanup orphan archive file:', cleanupErr)
      }
    }

    return {
      success: false,
      error: error?.message || 'Gagal mengunggah arsip dokumen gereja.',
    }
  }
}

/**
 * Update Church Archive Metadata
 */
export async function updateArsipGerejaAction(input: UpdateArsipGerejaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.update.' }
    }

    const validated = updateArsipGerejaSchema.parse(input)

    const existing = await prisma.arsipGereja.findFirst({
      where: { id: validated.id, deletedAt: null },
    })

    if (!existing) {
      return { success: false, error: 'Arsip dokumen tidak ditemukan.' }
    }

    const updated = await prisma.arsipGereja.update({
      where: { id: validated.id },
      data: {
        judul: validated.judul,
        jenisArsip: validated.jenisArsip,
        kategorialId: validated.kategorialId,
        tanggalDokumen: validated.tanggalDokumen,
        status: validated.status,
        deskripsi: validated.deskripsi,
      },
      include: {
        kategorial: { select: { nama: true } },
      },
    })

    // Cryptographic SHA-256 Audit Log
    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARSIP_GEREJA_UPDATED',
      'ArsipGereja',
      updated.id,
      JSON.stringify({
        arsipId: updated.id,
        before: {
          judul: existing.judul,
          jenisArsip: existing.jenisArsip,
          status: existing.status,
        },
        after: {
          judul: updated.judul,
          jenisArsip: updated.jenisArsip,
          status: updated.status,
        },
      })
    )

    try {
      revalidatePath('/dashboard/arsip-gereja')
      revalidatePath(`/dashboard/arsip-gereja/${updated.id}`)
    } catch {}

    return {
      success: true,
      data: updated,
      message: `Arsip "${updated.judul}" berhasil diperbarui.`,
    }
  } catch (error: any) {
    console.error('Error in updateArsipGerejaAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui arsip dokumen.',
    }
  }
}

/**
 * Delete Church Archive (Database Soft Delete)
 */
export async function deleteArsipGerejaAction(input: DeleteArsipGerejaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.delete.' }
    }

    const validated = deleteArsipGerejaSchema.parse(input)

    const archive = await prisma.arsipGereja.findFirst({
      where: { id: validated.id, deletedAt: null },
    })

    if (!archive) {
      return { success: false, error: 'Arsip tidak ditemukan atau telah dihapus.' }
    }

    // Soft Delete Record in DB (keep physical file so it can be restored)
    const deleted = await prisma.arsipGereja.update({
      where: { id: archive.id },
      data: {
        deletedAt: new Date(),
        deletedBy: CURRENT_STAFF_ACTOR,
        deletionReason: validated.reason,
      },
    })

    // Cryptographic SHA-256 Audit Log
    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARSIP_GEREJA_DELETED',
      'ArsipGereja',
      deleted.id,
      JSON.stringify({
        arsipId: deleted.id,
        judul: deleted.judul,
        reason: validated.reason,
      })
    )

    try {
      revalidatePath('/dashboard/arsip-gereja')
    } catch {}

    return {
      success: true,
      message: `Arsip "${archive.judul}" berhasil di-soft delete.`,
    }
  } catch (error: any) {
    console.error('Error in deleteArsipGerejaAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menghapus arsip dokumen.',
    }
  }
}

/**
 * Restore Soft Deleted Church Archive
 */
export async function restoreArsipGerejaAction(input: RestoreArsipGerejaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.delete.' }
    }

    const validated = restoreArsipGerejaSchema.parse(input)

    const archive = await prisma.arsipGereja.findFirst({
      where: { id: validated.id },
    })

    if (!archive || !archive.deletedAt) {
      return { success: false, error: 'Arsip tidak ditemukan dalam daftar terhapus.' }
    }

    const restored = await prisma.arsipGereja.update({
      where: { id: archive.id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARSIP_GEREJA_RESTORED',
      'ArsipGereja',
      restored.id,
      JSON.stringify({
        arsipId: restored.id,
        judul: restored.judul,
      })
    )

    try {
      revalidatePath('/dashboard/arsip-gereja')
    } catch {}

    return {
      success: true,
      message: `Arsip "${archive.judul}" berhasil dipulihkan!`,
    }
  } catch (error: any) {
    console.error('Error in restoreArsipGerejaAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memulihkan arsip dokumen.',
    }
  }
}

/**
 * Hard Delete Church Archive (Permanent Delete + Physical File Removal)
 */
export async function hardDeleteArsipGerejaAction(input: HardDeleteArsipGerejaInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.delete.' }
    }

    const validated = hardDeleteArsipGerejaSchema.parse(input)

    const archive = await prisma.arsipGereja.findFirst({
      where: { id: validated.id },
    })

    if (!archive) {
      return { success: false, error: 'Arsip tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete audit logs
      await tx.auditLog.deleteMany({
        where: { entityId: validated.id },
      })

      // 2. Delete database record
      await tx.arsipGereja.delete({
        where: { id: validated.id },
      })

      // 3. Create hard delete audit log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'ARSIP_GEREJA_PERMANENTLY_DELETED',
        'ArsipGereja',
        validated.id,
        JSON.stringify({
          judul: archive.judul,
          reason: validated.reason,
        }),
        undefined,
        tx
      )
    })

    // 4. Physical Storage File Removal
    if (archive.cloudinaryPublicId) {
      try {
        const storage = getStorageProvider('public/uploads/arsip')
        await storage.delete(archive.cloudinaryPublicId)
      } catch (err) {
        console.error('Archive storage file delete warning:', err)
      }
    }

    try {
      revalidatePath('/dashboard/arsip-gereja')
    } catch {}

    return {
      success: true,
      message: `Arsip "${archive.judul}" berhasil dihapus permanen dari database dan penyimpanan.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeleteArsipGerejaAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menghapus permanen arsip dokumen.',
    }
  }
}

/**
 * Bulk Update Status Retensi (e.g. Mass AKTIF / INAKTIF / PERMANEN)
 */
export async function bulkUpdateStatusArsipAction(data: {
  ids: string[]
  status: StatusArsip
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.update.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada arsip yang dipilih.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.arsipGereja.updateMany({
        where: { id: { in: data.ids } },
        data: {
          status: data.status,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'UPDATE_BULK_STATUS_ARSIP',
        'ArsipGereja',
        `${data.ids.length}_RECORDS`,
        `Mengubah status retensi massal (${data.ids.length} arsip) menjadi [${data.status}].`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/arsip-gereja')

    return {
      success: true,
      message: `Berhasil memperbarui status ${data.ids.length} arsip menjadi "${data.status}".`,
    }
  } catch (error: any) {
    console.error('Error in bulkUpdateStatusArsipAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui status arsip.' }
  }
}

/**
 * Bulk Update Jenis Klasifikasi Arsip (e.g. LEGALITAS, NOTULEN_RAPAT, SURAT_MASUK, etc.)
 */
export async function bulkUpdateJenisArsipAction(data: {
  ids: string[]
  jenisArsip: JenisArsip
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.update.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada arsip yang dipilih.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.arsipGereja.updateMany({
        where: { id: { in: data.ids } },
        data: {
          jenisArsip: data.jenisArsip,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'UPDATE_BULK_JENIS_ARSIP',
        'ArsipGereja',
        `${data.ids.length}_RECORDS`,
        `Mengubah klasifikasi jenis massal (${data.ids.length} berkas) menjadi [${data.jenisArsip}].`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/arsip-gereja')

    return {
      success: true,
      message: `Berhasil mengubah klasifikasi jenis ${data.ids.length} arsip menjadi "${data.jenisArsip}".`,
    }
  } catch (error: any) {
    console.error('Error in bulkUpdateJenisArsipAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui jenis arsip.' }
  }
}

/**
 * Bulk Soft Delete Arsip Gereja
 */
export async function bulkSoftDeleteArsipAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.delete.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada arsip yang dipilih.' }
    }

    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penghapusan massal wajib diisi.' }
    }

    const { ids, reason } = data

    await prisma.$transaction(async (tx) => {
      await tx.arsipGereja.updateMany({
        where: { id: { in: ids } },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: reason.trim(),
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'DELETE_BULK_SOFT',
        'ArsipGereja',
        `${ids.length}_RECORDS`,
        `Soft delete massal (${ids.length} arsip dokumen). Alasan: ${reason.trim()}`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/arsip-gereja')

    return {
      success: true,
      message: `${ids.length} berkas arsip berhasil dipindahkan ke kotak sampah.`,
    }
  } catch (error: any) {
    console.error('Error in bulkSoftDeleteArsipAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus arsip terpilih.' }
  }
}

/**
 * Get Full Archive Details with Kategorial for Official A4 Print Transcript
 */
export async function getArsipForPrintSheetsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada arsip yang dipilih.', data: [] }
    }

    const items = await prisma.arsipGereja.findMany({
      where: { id: { in: ids } },
      include: {
        kategorial: { select: { nama: true } },
      },
      orderBy: [{ tanggalDokumen: 'desc' }, { judul: 'asc' }],
    })

    const formatted: ArsipGerejaDTO[] = items.map((doc) => ({
      id: doc.id,
      judul: doc.judul,
      jenisArsip: doc.jenisArsip as JenisArsip,
      kategorialId: doc.kategorialId,
      kategorialNama: doc.kategorial?.nama || null,
      tanggalDokumen: doc.tanggalDokumen.toISOString(),
      status: doc.status as StatusArsip,
      deskripsi: doc.deskripsi,
      cloudinaryPublicId: doc.cloudinaryPublicId,
      fileUrl: doc.fileUrl,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadedById: doc.uploadedById,
      deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }))

    return {
      success: true,
      data: formatted,
    }
  } catch (error: any) {
    console.error('Error in getArsipForPrintSheetsAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat data lembar arsip.', data: [] }
  }
}
