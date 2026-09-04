'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  uploadDokumenJemaatSchema,
  updateDokumenJemaatSchema,
  deleteDokumenJemaatSchema,
  restoreDokumenJemaatSchema,
  hardDeleteDokumenJemaatSchema,
  dokumenFilterSchema,
  UploadDokumenJemaatInput,
  UpdateDokumenJemaatInput,
  DeleteDokumenJemaatInput,
  RestoreDokumenJemaatInput,
  HardDeleteDokumenJemaatInput,
  DokumenFilterParams,
  JenisDokumen,
  StatusDokumen,
} from '@/lib/validations/dokumen'
import { getStorageProvider } from '@/lib/storage'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

const CURRENT_STAFF_ACTOR = 'Sekretariat / Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

export type DokumenJemaatDTO = {
  id: string
  jemaatId: string
  jemaatNama: string
  jemaatNij: string
  judul: string
  jenisDokumen: JenisDokumen
  status: StatusDokumen
  tanggalTerbit: string
  tanggalKadaluarsa: string | null
  deskripsi: string | null
  mimeType: string
  fileSize: number
  uploadedById: string | null
  deletedAt: string | null
  createdAt: string
}

export type DokumenJemaatDetailDTO = DokumenJemaatDTO & {
  accessUrl: string
  cloudinaryPublicId?: string | null
}

/**
 * Search Jemaat for Document Selector (returns top 20 matches)
 */
export async function searchJemaatOptionsAction(query?: string) {
  try {
    const whereClause: Prisma.JemaatWhereInput = {
      deletedAt: null,
    }

    if (query && query.trim()) {
      const q = query.trim()
      whereClause.OR = [
        { nama: { contains: q, mode: 'insensitive' } },
        { nij: { contains: q, mode: 'insensitive' } },
      ]
    }

    const jemaats = await prisma.jemaat.findMany({
      where: whereClause,
      take: 20,
      orderBy: { nama: 'asc' },
      select: {
        id: true,
        nama: true,
        nij: true,
        statusJemaat: true,
      },
    })

    return {
      success: true,
      data: jemaats.map((j) => ({
        id: j.id,
        nama: j.nama,
        nij: j.nij || '-',
        statusJemaat: j.statusJemaat,
      })),
    }
  } catch (error: any) {
    console.error('Error in searchJemaatOptionsAction:', error)
    return { success: false, error: 'Gagal mencari data jemaat.' }
  }
}

/**
 * Get Paginated List of Member Documents with Search, Filter & Summary Stats
 */
export async function getDokumenJemaatListAction(params?: DokumenFilterParams) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.read')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.read.' }
    }

    const validated = dokumenFilterSchema.parse(params || {})
    const { search, statusHapus = 'ACTIVE', jenisDokumen, status, jemaatId, page, pageSize } = validated

    const whereClause: Prisma.DokumenJemaatWhereInput = {}

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }

    if (jenisDokumen) whereClause.jenisDokumen = jenisDokumen
    if (status) whereClause.status = status
    if (jemaatId) whereClause.jemaatId = jemaatId

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { judul: { contains: q, mode: 'insensitive' } },
        { jemaat: { nama: { contains: q, mode: 'insensitive' } } },
        { jemaat: { nij: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * pageSize

    const [items, total, allDocs] = await Promise.all([
      prisma.dokumenJemaat.findMany({
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
            },
          },
        },
      }),
      prisma.dokumenJemaat.count({ where: whereClause }),
      prisma.dokumenJemaat.findMany({
        where: { deletedAt: null },
        select: { status: true, tanggalKadaluarsa: true },
      }),
    ])

    const now = new Date()
    let totalVerified = 0
    let totalDraft = 0
    let totalExpired = 0

    allDocs.forEach((doc) => {
      if (doc.tanggalKadaluarsa && new Date(doc.tanggalKadaluarsa) < now) {
        totalExpired++
      } else if (doc.status === 'VERIFIED') {
        totalVerified++
      } else if (doc.status === 'DRAFT') {
        totalDraft++
      }
    })

    const formattedItems: DokumenJemaatDTO[] = items.map((doc) => ({
      id: doc.id,
      jemaatId: doc.jemaatId,
      jemaatNama: doc.jemaat?.nama || 'Jemaat Terdaftar',
      jemaatNij: doc.jemaat?.nij || '-',
      judul: doc.judul,
      jenisDokumen: doc.jenisDokumen,
      status:
        doc.tanggalKadaluarsa && new Date(doc.tanggalKadaluarsa) < now
          ? 'EXPIRED'
          : doc.status,
      tanggalTerbit: doc.tanggalTerbit.toISOString(),
      tanggalKadaluarsa: doc.tanggalKadaluarsa ? doc.tanggalKadaluarsa.toISOString() : null,
      deskripsi: doc.deskripsi,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadedById: doc.uploadedById,
      deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
      createdAt: doc.createdAt.toISOString(),
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
          totalDokumen: allDocs.length,
          totalVerified,
          totalDraft,
          totalExpired,
        },
      },
    }
  } catch (error: any) {
    console.error('Error in getDokumenJemaatListAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat daftar dokumen jemaat.',
    }
  }
}

/**
 * Get Document Details with Protected Access URL (IDOR Protected)
 */
export async function getDokumenJemaatByIdAction(id: string) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.read')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.read.' }
    }

    if (!id) throw new Error('ID Dokumen wajib disertakan.')

    const doc = await prisma.dokumenJemaat.findFirst({
      where: { id, deletedAt: null },
      include: {
        jemaat: {
          select: {
            id: true,
            nama: true,
            nij: true,
            noHp: true,
            statusJemaat: true,
          },
        },
      },
    })

    if (!doc) {
      return { success: false, error: 'Dokumen tidak ditemukan atau telah dihapus.' }
    }

    const storage = getStorageProvider()
    const accessUrl = doc.cloudinaryPublicId
      ? await storage.getSignedUrl(doc.cloudinaryPublicId)
      : doc.fileUrl || '/placeholder.pdf'

    const now = new Date()
    const detail: DokumenJemaatDetailDTO = {
      id: doc.id,
      jemaatId: doc.jemaatId,
      jemaatNama: doc.jemaat?.nama || 'Jemaat Terdaftar',
      jemaatNij: doc.jemaat?.nij || '-',
      judul: doc.judul,
      jenisDokumen: doc.jenisDokumen,
      status:
        doc.tanggalKadaluarsa && new Date(doc.tanggalKadaluarsa) < now
          ? 'EXPIRED'
          : doc.status,
      tanggalTerbit: doc.tanggalTerbit.toISOString(),
      tanggalKadaluarsa: doc.tanggalKadaluarsa ? doc.tanggalKadaluarsa.toISOString() : null,
      deskripsi: doc.deskripsi,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadedById: doc.uploadedById,
      deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
      createdAt: doc.createdAt.toISOString(),
      accessUrl,
      cloudinaryPublicId: doc.cloudinaryPublicId,
    }

    return {
      success: true,
      data: detail,
    }
  } catch (error: any) {
    console.error('Error in getDokumenJemaatByIdAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengambil detail dokumen.',
    }
  }
}

/**
 * Upload New Member Document with Magic Bytes Verification & Storage Abstraction
 */
export async function uploadDokumenJemaatAction(formData: FormData) {
  let uploadedFileIdentifier: string | null = null
  const storage = getStorageProvider()

  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.upload')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.upload.' }
    }

    const jemaatId = formData.get('jemaatId') as string
    const judul = formData.get('judul') as string
    const jenisDokumen = formData.get('jenisDokumen') as string
    const tanggalTerbit = formData.get('tanggalTerbit') as string
    const tanggalKadaluarsa = formData.get('tanggalKadaluarsa') as string | null
    const deskripsi = formData.get('deskripsi') as string | null
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Berkas dokumen wajib diunggah.' }
    }

    // 1. Zod Metadata Validation
    const validated = uploadDokumenJemaatSchema.parse({
      jemaatId,
      judul,
      jenisDokumen,
      tanggalTerbit,
      tanggalKadaluarsa: tanggalKadaluarsa || null,
      deskripsi,
    })

    // 2. Validate Jemaat existence
    const jemaat = await prisma.jemaat.findFirst({
      where: { id: validated.jemaatId, deletedAt: null },
      select: { id: true, nama: true, nij: true },
    })

    if (!jemaat) {
      return { success: false, error: 'Data Jemaat pemilik dokumen tidak ditemukan.' }
    }

    // 3. Upload File to Storage (checks size <= 5MB and validates binary magic bytes)
    const uploadResult = await storage.upload(file)
    uploadedFileIdentifier = uploadResult.identifier

    // 4. Save Database Record
    const createdDoc = await prisma.dokumenJemaat.create({
      data: {
        jemaatId: jemaat.id,
        judul: validated.judul,
        jenisDokumen: validated.jenisDokumen,
        status: 'DRAFT',
        tanggalTerbit: validated.tanggalTerbit,
        tanggalKadaluarsa: validated.tanggalKadaluarsa,
        deskripsi: validated.deskripsi,
        cloudinaryPublicId: uploadResult.identifier,
        fileUrl: uploadResult.fileUrl,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        uploadedById: CURRENT_STAFF_ACTOR,
      },
    })

    // 5. Cryptographic SHA-256 Audit Log
    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'DOKUMEN_JEMAAT_UPLOADED',
      'DokumenJemaat',
      createdDoc.id,
      JSON.stringify({
        dokumenId: createdDoc.id,
        jemaatId: jemaat.id,
        jemaatNama: jemaat.nama,
        judul: createdDoc.judul,
        jenisDokumen: createdDoc.jenisDokumen,
        status: 'DRAFT',
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
      })
    )

    try {
      revalidatePath('/dashboard/dokumen-jemaat')
      revalidatePath(`/dashboard/jemaat/${jemaat.id}`)
    } catch {}

    return {
      success: true,
      data: createdDoc,
      message: `Dokumen "${createdDoc.judul}" milik ${jemaat.nama} berhasil diunggah!`,
    }
  } catch (error: any) {
    console.error('Error in uploadDokumenJemaatAction:', error)

    // Cleanup uploaded physical file if database transaction/insert failed (prevent orphan files)
    if (uploadedFileIdentifier) {
      try {
        await storage.delete(uploadedFileIdentifier)
      } catch (cleanupErr) {
        console.error('Failed to cleanup orphan file:', cleanupErr)
      }
    }

    return {
      success: false,
      error: error?.message || 'Gagal mengunggah dokumen jemaat.',
    }
  }
}

/**
 * Update Document Metadata & Status
 */
export async function updateDokumenJemaatAction(input: UpdateDokumenJemaatInput) {
  try {
    const validated = updateDokumenJemaatSchema.parse(input)

    // PBAC Check: Verification requires document.verify
    const requiredPermission = validated.status === 'VERIFIED' ? 'document.verify' : 'document.update'
    if (!hasPermission(CURRENT_STAFF_ROLE, requiredPermission)) {
      return {
        success: false,
        error: `Akses ditolak: Anda tidak memiliki izin ${requiredPermission}.`,
      }
    }

    const existing = await prisma.dokumenJemaat.findFirst({
      where: { id: validated.id, deletedAt: null },
    })

    if (!existing) {
      return { success: false, error: 'Dokumen tidak ditemukan.' }
    }

    const updated = await prisma.dokumenJemaat.update({
      where: { id: validated.id },
      data: {
        judul: validated.judul,
        jenisDokumen: validated.jenisDokumen,
        status: validated.status,
        tanggalTerbit: validated.tanggalTerbit,
        tanggalKadaluarsa: validated.tanggalKadaluarsa,
        deskripsi: validated.deskripsi,
      },
    })

    // Cryptographic SHA-256 Audit Log
    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'DOKUMEN_JEMAAT_UPDATED',
      'DokumenJemaat',
      updated.id,
      JSON.stringify({
        dokumenId: updated.id,
        before: {
          judul: existing.judul,
          status: existing.status,
          jenisDokumen: existing.jenisDokumen,
        },
        after: {
          judul: updated.judul,
          status: updated.status,
          jenisDokumen: updated.jenisDokumen,
        },
      })
    )

    try {
      revalidatePath('/dashboard/dokumen-jemaat')
      revalidatePath(`/dashboard/dokumen-jemaat/${updated.id}`)
      revalidatePath(`/dashboard/jemaat/${updated.jemaatId}`)
    } catch {}

    return {
      success: true,
      data: updated,
      message: `Dokumen "${updated.judul}" berhasil diperbarui.`,
    }
  } catch (error: any) {
    console.error('Error in updateDokumenJemaatAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui dokumen.',
    }
  }
}

/**
 * Delete Document (Database Soft Delete)
 */
export async function deleteDokumenJemaatAction(input: DeleteDokumenJemaatInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.delete.' }
    }

    const validated = deleteDokumenJemaatSchema.parse(input)

    const doc = await prisma.dokumenJemaat.findFirst({
      where: { id: validated.id, deletedAt: null },
    })

    if (!doc) {
      return { success: false, error: 'Dokumen tidak ditemukan atau telah dihapus.' }
    }

    // Soft Delete Record in DB (keep physical file in storage so it can be restored)
    const deleted = await prisma.dokumenJemaat.update({
      where: { id: doc.id },
      data: {
        deletedAt: new Date(),
        deletedBy: CURRENT_STAFF_ACTOR,
        deletionReason: validated.reason,
      },
    })

    // Cryptographic SHA-256 Audit Log
    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'DOKUMEN_JEMAAT_DELETED',
      'DokumenJemaat',
      deleted.id,
      JSON.stringify({
        dokumenId: deleted.id,
        jemaatId: deleted.jemaatId,
        judul: deleted.judul,
        reason: validated.reason,
      })
    )

    try {
      revalidatePath('/dashboard/dokumen-jemaat')
      revalidatePath(`/dashboard/jemaat/${doc.jemaatId}`)
    } catch {}

    return {
      success: true,
      message: `Dokumen "${doc.judul}" berhasil di-soft delete.`,
    }
  } catch (error: any) {
    console.error('Error in deleteDokumenJemaatAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menghapus dokumen.',
    }
  }
}

/**
 * Restore Soft Deleted Document
 */
export async function restoreDokumenJemaatAction(input: RestoreDokumenJemaatInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.delete.' }
    }

    const validated = restoreDokumenJemaatSchema.parse(input)

    const doc = await prisma.dokumenJemaat.findFirst({
      where: { id: validated.id },
    })

    if (!doc || !doc.deletedAt) {
      return { success: false, error: 'Dokumen tidak ditemukan dalam daftar terhapus.' }
    }

    const restored = await prisma.dokumenJemaat.update({
      where: { id: doc.id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'DOKUMEN_JEMAAT_RESTORED',
      'DokumenJemaat',
      restored.id,
      JSON.stringify({
        dokumenId: restored.id,
        jemaatId: restored.jemaatId,
        judul: restored.judul,
      })
    )

    try {
      revalidatePath('/dashboard/dokumen-jemaat')
      revalidatePath(`/dashboard/jemaat/${doc.jemaatId}`)
    } catch {}

    return {
      success: true,
      message: `Dokumen "${doc.judul}" berhasil dipulihkan!`,
    }
  } catch (error: any) {
    console.error('Error in restoreDokumenJemaatAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memulihkan dokumen.',
    }
  }
}

/**
 * Hard Delete Document (Database Permanent Delete + Physical Storage File Removal)
 */
export async function hardDeleteDokumenJemaatAction(input: HardDeleteDokumenJemaatInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.delete.' }
    }

    const validated = hardDeleteDokumenJemaatSchema.parse(input)

    const doc = await prisma.dokumenJemaat.findFirst({
      where: { id: validated.id },
    })

    if (!doc) {
      return { success: false, error: 'Dokumen tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete audit logs
      await tx.auditLog.deleteMany({
        where: { entityId: validated.id },
      })

      // 2. Delete database record
      await tx.dokumenJemaat.delete({
        where: { id: validated.id },
      })

      // 3. Create hard delete audit log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'DOKUMEN_JEMAAT_PERMANENTLY_DELETED',
        'DokumenJemaat',
        validated.id,
        JSON.stringify({
          judul: doc.judul,
          jemaatId: doc.jemaatId,
          reason: validated.reason,
        }),
        undefined,
        tx
      )
    })

    // 4. Physical Storage File Removal
    if (doc.cloudinaryPublicId) {
      try {
        const storage = getStorageProvider()
        await storage.delete(doc.cloudinaryPublicId)
      } catch (err) {
        console.error('Physical storage file delete warning:', err)
      }
    }

    try {
      revalidatePath('/dashboard/dokumen-jemaat')
      revalidatePath(`/dashboard/jemaat/${doc.jemaatId}`)
    } catch {}

    return {
      success: true,
      message: `Dokumen "${doc.judul}" berhasil dihapus permanen dari database dan penyimpanan.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeleteDokumenJemaatAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menghapus permanen dokumen.',
    }
  }
}

/**
 * Bulk Update Status (e.g. Mass Verify / Reject / Draft)
 */
export async function bulkUpdateStatusDokumenAction(data: {
  ids: string[]
  status: StatusDokumen
}) {
  try {
    const requiredPermission = data.status === 'VERIFIED' ? 'document.verify' : 'document.update'
    if (!hasPermission(CURRENT_STAFF_ROLE, requiredPermission)) {
      return { success: false, error: `Akses ditolak: Anda tidak memiliki izin ${requiredPermission}.` }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada dokumen yang dipilih.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.dokumenJemaat.updateMany({
        where: { id: { in: data.ids } },
        data: {
          status: data.status,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'UPDATE_BULK_STATUS_DOKUMEN',
        'DokumenJemaat',
        `${data.ids.length}_RECORDS`,
        `Mengubah status massal (${data.ids.length} dokumen) menjadi [${data.status}].`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/dokumen-jemaat')

    return {
      success: true,
      message: `Berhasil memperbarui status ${data.ids.length} dokumen menjadi "${data.status}".`,
    }
  } catch (error: any) {
    console.error('Error in bulkUpdateStatusDokumenAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui status dokumen.' }
  }
}

/**
 * Bulk Update Jenis Dokumen (e.g. BAPTIS, PERNIKAHAN, PENYERAHAN_ANAK, etc.)
 */
export async function bulkUpdateJenisDokumenAction(data: {
  ids: string[]
  jenisDokumen: JenisDokumen
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.update')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.update.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada dokumen yang dipilih.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.dokumenJemaat.updateMany({
        where: { id: { in: data.ids } },
        data: {
          jenisDokumen: data.jenisDokumen,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'UPDATE_BULK_JENIS_DOKUMEN',
        'DokumenJemaat',
        `${data.ids.length}_RECORDS`,
        `Mengubah jenis dokumen massal (${data.ids.length} berkas) menjadi [${data.jenisDokumen}].`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/dokumen-jemaat')

    return {
      success: true,
      message: `Berhasil mengubah klasifikasi jenis ${data.ids.length} dokumen menjadi "${data.jenisDokumen}".`,
    }
  } catch (error: any) {
    console.error('Error in bulkUpdateJenisDokumenAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui jenis dokumen.' }
  }
}

/**
 * Bulk Soft Delete Dokumen Jemaat
 */
export async function bulkSoftDeleteDokumenAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'document.delete')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin document.delete.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada dokumen yang dipilih.' }
    }

    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penghapusan massal wajib diisi.' }
    }

    const { ids, reason } = data

    await prisma.$transaction(async (tx) => {
      await tx.dokumenJemaat.updateMany({
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
        'DokumenJemaat',
        `${ids.length}_RECORDS`,
        `Soft delete massal (${ids.length} dokumen jemaat). Alasan: ${reason.trim()}`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/dokumen-jemaat')

    return {
      success: true,
      message: `${ids.length} dokumen jemaat berhasil dipindahkan ke kotak sampah.`,
    }
  } catch (error: any) {
    console.error('Error in bulkSoftDeleteDokumenAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus dokumen terpilih.' }
  }
}

/**
 * Get Full Document Details with Jemaat Profile for Official A4 Print Transcript
 */
export async function getDokumenForPrintSheetsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada dokumen yang dipilih.', data: [] }
    }

    const items = await prisma.dokumenJemaat.findMany({
      where: { id: { in: ids } },
      include: {
        jemaat: {
          select: {
            id: true,
            nama: true,
            nij: true,
            noHp: true,
            statusJemaat: true,
          },
        },
      },
      orderBy: [{ jemaat: { nama: 'asc' } }, { tanggalTerbit: 'desc' }],
    })

    const formatted: DokumenJemaatDTO[] = items.map((doc) => ({
      id: doc.id,
      jemaatId: doc.jemaatId,
      jemaatNama: doc.jemaat?.nama || 'Tanpa Nama',
      jemaatNij: doc.jemaat?.nij || '-',
      judul: doc.judul,
      jenisDokumen: doc.jenisDokumen as JenisDokumen,
      status: doc.status as StatusDokumen,
      tanggalTerbit: doc.tanggalTerbit.toISOString(),
      tanggalKadaluarsa: doc.tanggalKadaluarsa ? doc.tanggalKadaluarsa.toISOString() : null,
      deskripsi: doc.deskripsi,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadedById: doc.uploadedById,
      deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
      createdAt: doc.createdAt.toISOString(),
    }))

    return {
      success: true,
      data: formatted,
    }
  } catch (error: any) {
    console.error('Error in getDokumenForPrintSheetsAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat data lembar dokumen.', data: [] }
  }
}
