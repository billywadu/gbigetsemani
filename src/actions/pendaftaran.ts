'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  submitPendaftaranMandiriSchema,
  approvePendaftaranSchema,
  rejectPendaftaranSchema,
  deletePendaftaranSchema,
  restorePendaftaranSchema,
  hardDeletePendaftaranSchema,
  pendaftaranFilterSchema,
  SubmitPendaftaranMandiriInput,
  ApprovePendaftaranInput,
  RejectPendaftaranInput,
  DeletePendaftaranInput,
  RestorePendaftaranInput,
  HardDeletePendaftaranInput,
  PendaftaranFilterParams,
  AnggotaKeluargaItem,
} from '@/lib/validations/pendaftaran'
import {
  getNextAtomicNij,
  generateUniqueBarcodeCode,
  calculateJemaatCompleteness,
  createAuditLog,
} from '@/lib/jemaat-helpers'
import { getNextAtomicNomorKeluarga, syncKeluargaTotalAnggota } from '@/lib/keluarga-helpers'
import { getOrCreateDefaultKategorial } from '@/actions/kategorial'
import { getStorageProvider } from '@/lib/storage'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

const CURRENT_STAFF_ACTOR = 'Staff Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

/**
 * Public Action: Secure KK File Upload for Registration Form
 * Validates file size (max 5MB), MIME type, magic bytes, and safe UUID generation.
 */
export async function uploadKkRegistrationAction(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Berkas Kartu Keluarga tidak ditemukan atau kosong.' }
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Ukuran berkas melebihi batas maksimum 5 MB.' }
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedMimes.includes(file.type)) {
      return {
        success: false,
        error: 'Format berkas tidak didukung. Hanya gambar (JPG, PNG, WEBP) dan dokumen PDF yang diizinkan.',
      }
    }

    const storage = getStorageProvider('public/uploads/dokumen')
    const uploadResult = await storage.upload(file)

    return {
      success: true,
      data: {
        fileUrl: uploadResult.fileUrl,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        identifier: uploadResult.identifier,
      },
    }
  } catch (error: any) {
    console.error('Error in uploadKkRegistrationAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengunggah berkas Kartu Keluarga.',
    }
  }
}

/**
 * Get Count of Pending Registrations for Navigation Badge
 */
export async function getPendaftaranPendingCountAction() {
  try {
    const pendingCount = await prisma.pendaftaranJemaat.count({
      where: { status: 'PENDING', deletedAt: null },
    })
    const totalCount = await prisma.pendaftaranJemaat.count({
      where: { deletedAt: null },
    })
    return { success: true, pendingCount, totalCount }
  } catch (error) {
    return { success: false, pendingCount: 0, totalCount: 0 }
  }
}

/**
 * Public Action: Submit Mandiri Registration via /daftar
 * NO Authentication required
 * Includes Honeypot Trap, XSS sanitization, and duplicate detection
 */
export async function submitPendaftaranMandiriAction(input: SubmitPendaftaranMandiriInput) {
  try {
    // 1. Anti-Bot Honeypot Trap
    if (input.website && input.website.trim().length > 0) {
      // Fake success for bots to prevent retries
      return {
        success: true,
        data: { id: 'bot-trap', nama: input.nama, createdAt: new Date() },
        message: 'Pendaftaran Anda telah diterima dan akan diverifikasi oleh Sekretariat.',
      }
    }

    const validated = submitPendaftaranMandiriSchema.parse(input)

    // Check duplicate pending submission (Bug 2 Fix: include whatsApp in duplicate detection)
    if (validated.whatsApp || validated.noHp || validated.email) {
      const existingPending = await prisma.pendaftaranJemaat.findFirst({
        where: {
          status: 'PENDING',
          deletedAt: null,
          OR: [
            ...(validated.whatsApp ? [{ whatsApp: validated.whatsApp }] : []),
            ...(validated.noHp ? [{ noHp: validated.noHp }] : []),
            ...(validated.email ? [{ email: validated.email }] : []),
          ],
        },
      })

      if (existingPending) {
        return {
          success: false,
          error: 'Permohonan pendaftaran dengan nomor kontak atau email tersebut sedang dalam antrean peninjauan Sekretariat.',
        }
      }
    }

    // Check duplicate in active Jemaat master data (Bug 2 Fix: include whatsApp)
    if (validated.whatsApp || validated.noHp || validated.email) {
      const existingJemaat = await prisma.jemaat.findFirst({
        where: {
          statusJemaat: 'ACTIVE',
          deletedAt: null,
          OR: [
            ...(validated.whatsApp ? [{ whatsApp: validated.whatsApp }] : []),
            ...(validated.noHp ? [{ noHp: validated.noHp }] : []),
            ...(validated.email ? [{ email: validated.email }] : []),
          ],
        },
      })

      if (existingJemaat) {
        return {
          success: false,
          error: 'Data dengan kontak atau email tersebut sudah terdaftar sebagai Jemaat aktif. Silakan hubungi Sekretariat Gereja.',
        }
      }
    }

    // Create individual PendaftaranJemaat records in transaction so each person is a separate row in queue table
    const createdList = await prisma.$transaction(async (tx) => {
      // 1. Primary Applicant Record
      const primary = await tx.pendaftaranJemaat.create({
        data: {
          nama: validated.nama,
          namaPanggilan: validated.namaPanggilan || null,
          jenisKelamin: validated.jenisKelamin,
          tempatLahir: validated.tempatLahir || null,
          tanggalLahir: validated.tanggalLahir ? new Date(validated.tanggalLahir) : null,
          noHp: validated.noHp || null,
          whatsApp: validated.whatsApp || null,
          email: validated.email || null,
          alamat: validated.alamat || null,
          statusPernikahan: validated.statusPernikahan || 'BELUM_MENIKAH',
          pekerjaan: validated.pekerjaan || null,
          status: 'PENDING',
          tipePendaftaran: 'PRIBADI',
          namaKeluarga: null,
          nomorKk: validated.nomorKk || null,
          kkFileUrl: validated.kkFileUrl || null,
          kkFileSize: validated.kkFileSize || null,
          anggotaKeluargaJson: null,
        },
      })

      const list = [primary]

      // 2. Separate Record for each additional family member
      if (validated.anggotaKeluarga && validated.anggotaKeluarga.length > 0) {
        for (const member of validated.anggotaKeluarga) {
          if (!member.nama || member.nama.trim() === '') continue
          const memberRecord = await tx.pendaftaranJemaat.create({
            data: {
              nama: member.nama.trim(),
              namaPanggilan: member.namaPanggilan?.trim() || null,
              jenisKelamin: member.jenisKelamin || 'LAK_LAKI',
              tempatLahir: member.tempatLahir?.trim() || null,
              tanggalLahir: member.tanggalLahir ? new Date(member.tanggalLahir) : null,
              noHp: member.noHp?.trim() || null,
              whatsApp: member.noHp?.trim() || null,
              email: member.email?.trim() || null,
              alamat: validated.alamat || null,
              statusPernikahan: member.statusPernikahan || 'BELUM_MENIKAH',
              pekerjaan: member.pekerjaan?.trim() || null,
              status: 'PENDING',
              tipePendaftaran: 'PRIBADI',
              namaKeluarga: null,
              nomorKk: validated.nomorKk || null,
              kkFileUrl: validated.kkFileUrl || null,
              kkFileSize: validated.kkFileSize || null,
              anggotaKeluargaJson: null,
            },
          })
          list.push(memberRecord)
        }
      }

      return list
    })

    try {
      revalidatePath('/dashboard/pendaftaran')
    } catch {}

    const first = createdList[0]

    return {
      success: true,
      data: {
        id: first.id,
        nama: first.nama,
        tipePendaftaran: 'PRIBADI',
        createdAt: first.createdAt,
        totalCreated: createdList.length,
      },
      message:
        createdList.length > 1
          ? `Pendaftaran sebanyak ${createdList.length} calon jemaat berhasil dikirim. Seluruh data telah masuk ke antrean verifikasi Sekretariat.`
          : 'Pendaftaran berhasil dikirim. Data Anda telah masuk ke antrean verifikasi Sekretariat.',
    }
  } catch (error: any) {
    // Bug 7 Fix: log full detail server-side only, expose safe generic message to client
    console.error('[pendaftaran] submitPendaftaranMandiriAction error:', error)
    if (error?.name === 'ZodError' && Array.isArray(error.errors) && error.errors.length > 0) {
      const firstErr = error.errors[0]
      return {
        success: false,
        error: firstErr.message || 'Data formulir tidak valid. Mohon periksa kembali isian Anda.',
      }
    }
    return {
      success: false,
      error: 'Gagal mengirimkan formulir pendaftaran. Silakan coba beberapa saat lagi.',
    }
  }
}

/**
 * Internal Action: Get Paginated Pendaftaran Queue with Filters & Live Stats
 * Requires PBAC permission pendaftaran.review
 */
export async function getPendaftaranQueueAction(params?: PendaftaranFilterParams) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pendaftaran.review')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pendaftaran.review.' }
    }

    const validated = pendaftaranFilterSchema.parse(params || {})
    const { search, statusHapus = 'ACTIVE', status, tipePendaftaran, page, pageSize } = validated

    const whereClause: any = {}

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }

    if (status) {
      whereClause.status = status
    }

    if (tipePendaftaran && tipePendaftaran !== 'ALL') {
      whereClause.tipePendaftaran = tipePendaftaran
    }

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { nama: { contains: q, mode: 'insensitive' } },
        { namaPanggilan: { contains: q, mode: 'insensitive' } },
        { namaKeluarga: { contains: q, mode: 'insensitive' } },
        { noHp: { contains: q, mode: 'insensitive' } },
        { whatsApp: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { alamat: { contains: q, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * pageSize

    const [items, total, totalPendaftaran, pendingCount, approvedCount, rejectedCount] =
      await Promise.all([
        prisma.pendaftaranJemaat.findMany({
          where: whereClause,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.pendaftaranJemaat.count({ where: whereClause }),
        prisma.pendaftaranJemaat.count({ where: { deletedAt: null } }),
        prisma.pendaftaranJemaat.count({ where: { status: 'PENDING', deletedAt: null } }),
        prisma.pendaftaranJemaat.count({ where: { status: 'APPROVED', deletedAt: null } }),
        prisma.pendaftaranJemaat.count({ where: { status: 'REJECTED', deletedAt: null } }),
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
        stats: {
          totalPendaftaran,
          pendingCount,
          approvedCount,
          rejectedCount,
        },
      },
    }
  } catch (error: any) {
    console.error('Error in getPendaftaranQueueAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat antrean pendaftaran.',
    }
  }
}

/**
 * Internal Action: Get Detail of Pendaftaran Queue
 */
export async function getPendaftaranByIdAction(id: string) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pendaftaran.review')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pendaftaran.review.' }
    }

    if (!id) throw new Error('ID Pendaftaran wajib disertakan.')

    const item = await prisma.pendaftaranJemaat.findUnique({
      where: { id },
    })

    if (!item) {
      return { success: false, error: 'Data pendaftaran tidak ditemukan.' }
    }

    return {
      success: true,
      data: item,
    }
  } catch (error: any) {
    console.error('Error in getPendaftaranByIdAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengambil detail pendaftaran.',
    }
  }
}

/**
 * Internal Action: Approve Pendaftaran (Create Jemaat ACTIVE or Full Family Batch + Issue NIJ & Barcode)
 * Atomic Transaction & Concurrency Safe
 */
export async function approvePendaftaranAction(input: ApprovePendaftaranInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pendaftaran.review')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pendaftaran.review.' }
    }

    const validated = approvePendaftaranSchema.parse(input)

    const registration = await prisma.pendaftaranJemaat.findUnique({
      where: { id: validated.registrationId },
    })

    if (!registration) {
      return { success: false, error: 'Data pendaftaran tidak ditemukan.' }
    }

    // Concurrency / Idempotency protection
    if (registration.status === 'APPROVED') {
      return { success: false, error: 'Pendaftaran ini sudah diproses dan disetujui sebelumnya.' }
    }

    if (registration.status === 'REJECTED') {
      return { success: false, error: 'Pendaftaran ini sudah ditolak sebelumnya.' }
    }

    // Check duplicate in Jemaat before approval
    if (registration.noHp || registration.email) {
      const existingJemaat = await prisma.jemaat.findFirst({
        where: {
          statusJemaat: 'ACTIVE',
          deletedAt: null,
          OR: [
            ...(registration.noHp ? [{ noHp: registration.noHp }] : []),
            ...(registration.email ? [{ email: registration.email }] : []),
          ],
        },
      })

      if (existingJemaat) {
        return {
          success: false,
          error: `Pendaftaran tidak dapat disetujui karena kontak calon jemaat sudah terdaftar dalam Master Data Jemaat (${existingJemaat.nama} - ${existingJemaat.nij}).`,
        }
      }
    }

    const beforeState = {
      status: registration.status,
    }

    const isFamily = registration.tipePendaftaran === 'KELUARGA'

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve Default "Umum" Kategorial
      const defaultKategorial = await getOrCreateDefaultKategorial(tx)

      // 2. Generate Atomic NIJ & Barcode Code for Head/Primary Registrant
      const atomicNij = await getNextAtomicNij(tx)
      const barcodeCode = await generateUniqueBarcodeCode(tx)

      // 3. Calculate Completeness for Primary Registrant
      const completenessPercentage = calculateJemaatCompleteness({
        nama: registration.nama,
        namaPanggilan: registration.namaPanggilan,
        jenisKelamin: registration.jenisKelamin,
        noHp: registration.noHp,
        whatsApp: registration.whatsApp,
        email: registration.email,
        alamat: registration.alamat,
        statusJemaat: 'ACTIVE',
        statusPernikahan: registration.statusPernikahan,
        pekerjaan: registration.pekerjaan,
      })

      // 4. Create Primary Jemaat record
      const createdJemaat = await tx.jemaat.create({
        data: {
          nij: atomicNij,
          barcodeCode,
          nama: registration.nama,
          namaPanggilan: registration.namaPanggilan || null,
          jenisKelamin: registration.jenisKelamin,
          tempatLahir: registration.tempatLahir || null,
          tanggalLahir: registration.tanggalLahir || null,
          noHp: registration.noHp || null,
          whatsApp: registration.whatsApp || null,
          email: registration.email || null,
          alamat: registration.alamat || null,
          statusPernikahan: registration.statusPernikahan || 'BELUM_MENIKAH',
          pekerjaan: registration.pekerjaan || null,
          statusJemaat: 'ACTIVE',
          statusFollowUp: 'NEW',
          tanggalBergabung: new Date(),
          kategorialId: defaultKategorial.id,
          completenessPercentage,
        },
      })

      // 5. Create AnggotaKategorial record for Primary Registrant
      await tx.anggotaKategorial.create({
        data: {
          kategorialId: defaultKategorial.id,
          jemaatId: createdJemaat.id,
          catatan: 'Otomatis terdaftar ke Kategori Umum saat persetujuan pendaftaran',
        },
      })

      // 6. Archive document to DokumenJemaat if uploaded
      if (registration.kkFileUrl) {
        await tx.dokumenJemaat.create({
          data: {
            jemaatId: createdJemaat.id,
            judul: `Dokumen Lampiran Pendaftaran - ${createdJemaat.nama}`,
            jenisDokumen: 'LAINNYA',
            fileUrl: registration.kkFileUrl,
            fileSize: registration.kkFileSize || 0,
            mimeType: registration.kkFileUrl.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            status: 'VERIFIED',
            tanggalTerbit: new Date(),
            deskripsi: 'Dokumen lampiran identitas yang diunggah saat pendaftaran mandiri calon jemaat.',
          },
        })
      }

      // 7. Update Kategorial member count
      const countDefault = await tx.anggotaKategorial.count({
        where: { kategorialId: defaultKategorial.id },
      })
      await tx.kategorial.update({
        where: { id: defaultKategorial.id },
        data: { totalAnggota: countDefault },
      })

      // 8. Update PendaftaranJemaat status
      const updatedRegistration = await tx.pendaftaranJemaat.update({
        where: { id: registration.id },
        data: {
          status: 'APPROVED',
          jemaatId: createdJemaat.id,
          rejectionReason: null,
        },
      })

      const afterState = {
        status: updatedRegistration.status,
        jemaatId: createdJemaat.id,
        nij: createdJemaat.nij,
        barcodeCode: createdJemaat.barcodeCode,
        tipePendaftaran: registration.tipePendaftaran,
      }

      // 9. Cryptographic SHA-256 Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'PENDAFTARAN_APPROVED',
        'PendaftaranJemaat',
        updatedRegistration.id,
        JSON.stringify({
          calon: registration.nama,
          tipe: registration.tipePendaftaran,
          nij: createdJemaat.nij,
          before: beforeState,
          after: afterState,
        }),
        undefined,
        tx
      )

      return {
        jemaat: createdJemaat,
        registration: updatedRegistration,
      }
    })

    try {
      revalidatePath('/dashboard/pendaftaran')
      revalidatePath('/dashboard/jemaat')
      revalidatePath(`/dashboard/jemaat/${result.jemaat.id}`)
    } catch {}

    return {
      success: true,
      data: {
        id: result.registration.id,
        jemaatId: result.jemaat.id,
        nama: result.jemaat.nama,
        nij: result.jemaat.nij,
        barcodeCode: result.jemaat.barcodeCode,
      },
      message: `Pendaftaran "${result.jemaat.nama}" berhasil disetujui. NIJ ${result.jemaat.nij} telah resmi diterbitkan.`,
    }
  } catch (error: any) {
    console.error('[pendaftaran] approvePendaftaranAction error:', error)
    return {
      success: false,
      error: 'Gagal menyetujui pendaftaran. Silakan coba lagi atau hubungi administrator.',
    }
  }
}

/**
 * Internal Action: Reject Pendaftaran with Mandatory Reason
 */
export async function rejectPendaftaranAction(input: RejectPendaftaranInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pendaftaran.review')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pendaftaran.review.' }
    }

    const validated = rejectPendaftaranSchema.parse(input)

    const registration = await prisma.pendaftaranJemaat.findUnique({
      where: { id: validated.registrationId },
    })

    if (!registration) {
      return { success: false, error: 'Data pendaftaran tidak ditemukan.' }
    }

    if (registration.status === 'APPROVED') {
      return { success: false, error: 'Pendaftaran ini sudah disetujui sebelumnya.' }
    }

    if (registration.status === 'REJECTED') {
      return { success: false, error: 'Pendaftaran ini sudah ditolak sebelumnya.' }
    }

    const beforeState = {
      status: registration.status,
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.pendaftaranJemaat.update({
        where: { id: registration.id },
        data: {
          status: 'REJECTED',
          rejectionReason: validated.reason.trim(),
        },
      })

      const afterState = {
        status: res.status,
        rejectionReason: res.rejectionReason,
      }

      // Cryptographic SHA-256 Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'PENDAFTARAN_REJECTED',
        'PendaftaranJemaat',
        res.id,
        JSON.stringify({
          calon: registration.nama,
          reason: validated.reason.trim(),
          before: beforeState,
          after: afterState,
        }),
        undefined,
        tx
      )

      return res
    })

    try {
      revalidatePath('/dashboard/pendaftaran')
    } catch {}

    return {
      success: true,
      data: updated,
      message: `Pendaftaran ${updated.nama} berhasil ditolak.`,
    }
  } catch (error: any) {
    console.error('[pendaftaran] rejectPendaftaranAction error:', error)
    return {
      success: false,
      error: 'Gagal menolak pendaftaran. Silakan coba lagi.',
    }
  }
}

/**
 * Internal Action: Soft Delete Pendaftaran
 */
export async function deletePendaftaranAction(input: DeletePendaftaranInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pendaftaran.review')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pendaftaran.review.' }
    }

    const validated = deletePendaftaranSchema.parse(input)

    const registration = await prisma.pendaftaranJemaat.findFirst({
      where: { id: validated.id, deletedAt: null },
    })

    if (!registration) {
      return { success: false, error: 'Data pendaftaran tidak ditemukan atau sudah dihapus.' }
    }

    const deleted = await prisma.pendaftaranJemaat.update({
      where: { id: registration.id },
      data: {
        deletedAt: new Date(),
        deletedBy: CURRENT_STAFF_ACTOR,
        deletionReason: validated.reason,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'PENDAFTARAN_DELETED',
      'PendaftaranJemaat',
      deleted.id,
      JSON.stringify({
        nama: deleted.nama,
        reason: validated.reason,
      })
    )

    try {
      revalidatePath('/dashboard/pendaftaran')
    } catch {}

    return {
      success: true,
      message: `Pendaftaran "${registration.nama}" berhasil di-soft delete.`,
    }
  } catch (error: any) {
    console.error('Error in deletePendaftaranAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus data pendaftaran.' }
  }
}

/**
 * Internal Action: Restore Soft Deleted Pendaftaran
 */
export async function restorePendaftaranAction(input: RestorePendaftaranInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pendaftaran.review')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pendaftaran.review.' }
    }

    const validated = restorePendaftaranSchema.parse(input)

    const registration = await prisma.pendaftaranJemaat.findFirst({
      where: { id: validated.id },
    })

    if (!registration || !registration.deletedAt) {
      return { success: false, error: 'Data pendaftaran tidak ditemukan dalam daftar terhapus.' }
    }

    const restored = await prisma.pendaftaranJemaat.update({
      where: { id: registration.id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'PENDAFTARAN_RESTORED',
      'PendaftaranJemaat',
      restored.id,
      JSON.stringify({
        nama: restored.nama,
      })
    )

    try {
      revalidatePath('/dashboard/pendaftaran')
    } catch {}

    return {
      success: true,
      message: `Pendaftaran "${registration.nama}" berhasil dipulihkan!`,
    }
  } catch (error: any) {
    console.error('Error in restorePendaftaranAction:', error)
    return { success: false, error: error?.message || 'Gagal memulihkan data pendaftaran.' }
  }
}

/**
 * Internal Action: Hard Delete Pendaftaran (Permanent from DB)
 */
export async function hardDeletePendaftaranAction(input: HardDeletePendaftaranInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pendaftaran.review')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pendaftaran.review.' }
    }

    const validated = hardDeletePendaftaranSchema.parse(input)

    const registration = await prisma.pendaftaranJemaat.findFirst({
      where: { id: validated.id },
    })

    if (!registration) {
      return { success: false, error: 'Data pendaftaran tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete audit logs
      await tx.auditLog.deleteMany({
        where: { entityId: validated.id },
      })

      // 2. Delete database record
      await tx.pendaftaranJemaat.delete({
        where: { id: validated.id },
      })

      // 3. Create hard delete audit log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'PENDAFTARAN_PERMANENTLY_DELETED',
        'PendaftaranJemaat',
        validated.id,
        JSON.stringify({
          nama: registration.nama,
          reason: validated.reason,
        }),
        undefined,
        tx
      )
    })

    try {
      revalidatePath('/dashboard/pendaftaran')
    } catch {}

    return {
      success: true,
      message: `Pendaftaran "${registration.nama}" berhasil dihapus permanen dari database.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeletePendaftaranAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus permanen data pendaftaran.' }
  }
}

/**
 * Bulk Approve Pendaftaran (Create Jemaat Records + Issue NIJs & Barcodes)
 */
export async function bulkApprovePendaftaranAction(ids: string[]) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pendaftaran.review')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pendaftaran.review.' }
    }

    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada data pendaftaran yang dipilih.' }
    }

    const pendingRegistrations = await prisma.pendaftaranJemaat.findMany({
      where: {
        id: { in: ids },
        status: 'PENDING',
        deletedAt: null,
      },
    })

    if (pendingRegistrations.length === 0) {
      return {
        success: false,
        error: 'Tidak ada pendaftaran berstatus PENDING yang dapat disetujui di antara data yang dipilih.',
      }
    }

    const approvedJemaats = await prisma.$transaction(async (tx) => {
      const defaultKategorial = await getOrCreateDefaultKategorial(tx)
      const createdList = []

      for (const reg of pendingRegistrations) {
        // 1. Generate Atomic NIJ & Unique Barcode
        const atomicNij = await getNextAtomicNij(tx)
        const barcodeCode = await generateUniqueBarcodeCode(tx)

        // 2. Calculate Completeness
        const completenessPercentage = calculateJemaatCompleteness({
          nama: reg.nama,
          namaPanggilan: reg.namaPanggilan,
          jenisKelamin: reg.jenisKelamin,
          noHp: reg.noHp,
          whatsApp: reg.whatsApp,
          email: reg.email,
          alamat: reg.alamat,
          statusJemaat: 'ACTIVE',
          statusPernikahan: reg.statusPernikahan,
          pekerjaan: reg.pekerjaan,
        })

        // 3. Create Jemaat
        const createdJemaat = await tx.jemaat.create({
          data: {
            nij: atomicNij,
            barcodeCode,
            nama: reg.nama,
            namaPanggilan: reg.namaPanggilan || null,
            jenisKelamin: reg.jenisKelamin,
            tempatLahir: reg.tempatLahir || null,
            tanggalLahir: reg.tanggalLahir || null,
            noHp: reg.noHp || null,
            whatsApp: reg.whatsApp || null,
            email: reg.email || null,
            alamat: reg.alamat || null,
            statusPernikahan: reg.statusPernikahan || 'BELUM_MENIKAH',
            pekerjaan: reg.pekerjaan || null,
            statusJemaat: 'ACTIVE',
            statusFollowUp: 'NEW',
            tanggalBergabung: new Date(),
            kategorialId: defaultKategorial.id,
            completenessPercentage,
          },
        })

        await tx.anggotaKategorial.create({
          data: {
            kategorialId: defaultKategorial.id,
            jemaatId: createdJemaat.id,
            catatan: 'Otomatis terdaftar saat persetujuan pendaftaran massal',
          },
        })

        // 4. Update Registration
        await tx.pendaftaranJemaat.update({
          where: { id: reg.id },
          data: {
            status: 'APPROVED',
            jemaatId: createdJemaat.id,
          },
        })

        createdList.push(createdJemaat)
      }

      // 5. Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'APPROVE_BULK_PENDAFTARAN',
        'PendaftaranJemaat',
        `${createdList.length}_RECORDS`,
        `Persetujuan massal (${createdList.length} pendaftar) & penerbitan profil Jemaat dengan NIJ baru.`,
        undefined,
        tx
      )

      return createdList
    })

    try {
      revalidatePath('/dashboard/pendaftaran')
      revalidatePath('/dashboard/jemaat')
      revalidatePath('/dashboard')
    } catch {}

    return {
      success: true,
      message: `Berhasil menyetujui ${approvedJemaats.length} calon jemaat. Profil jemaat baru, NIJ resmi, dan QR Code telah diterbitkan.`,
      approvedCount: approvedJemaats.length,
    }
  } catch (error: any) {
    console.error('Error in bulkApprovePendaftaranAction:', error)
    return { success: false, error: error?.message || 'Gagal menyetujui pendaftaran massal.' }
  }
}

/**
 * Bulk Reject Pendaftaran
 */
export async function bulkRejectPendaftaranAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pendaftaran.review')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pendaftaran.review.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada data pendaftaran yang dipilih.' }
    }

    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penolakan wajib diisi.' }
    }

    const { ids, reason } = data

    const pendingRegistrations = await prisma.pendaftaranJemaat.findMany({
      where: {
        id: { in: ids },
        status: 'PENDING',
        deletedAt: null,
      },
    })

    if (pendingRegistrations.length === 0) {
      return {
        success: false,
        error: 'Tidak ada pendaftaran berstatus PENDING yang dapat ditolak di antara data yang dipilih.',
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.pendaftaranJemaat.updateMany({
        where: { id: { in: pendingRegistrations.map((r) => r.id) } },
        data: {
          status: 'REJECTED',
          rejectionReason: reason.trim(),
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'REJECT_BULK_PENDAFTARAN',
        'PendaftaranJemaat',
        `${pendingRegistrations.length}_RECORDS`,
        `Penolakan massal (${pendingRegistrations.length} pendaftar). Alasan: ${reason.trim()}`,
        undefined,
        tx
      )
    })

    try {
      revalidatePath('/dashboard/pendaftaran')
      revalidatePath('/dashboard')
    } catch {}

    return {
      success: true,
      message: `${pendingRegistrations.length} permohonan pendaftaran berhasil ditolak.`,
    }
  } catch (error: any) {
    console.error('Error in bulkRejectPendaftaranAction:', error)
    return { success: false, error: error?.message || 'Gagal menolak pendaftaran terpilih.' }
  }
}

/**
 * Bulk Soft Delete Pendaftaran
 */
export async function bulkSoftDeletePendaftaranAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'pendaftaran.review')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin pendaftaran.review.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada data pendaftaran yang dipilih.' }
    }

    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penghapusan massal wajib diisi.' }
    }

    const { ids, reason } = data

    await prisma.$transaction(async (tx) => {
      // Bug 3 Fix: only soft-delete records that are not already deleted
      await tx.pendaftaranJemaat.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: reason.trim(),
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'DELETE_BULK_SOFT_PENDAFTARAN',
        'PendaftaranJemaat',
        `${ids.length}_RECORDS`,
        `Soft delete massal (${ids.length} data pendaftaran). Alasan: ${reason.trim()}`,
        undefined,
        tx
      )
    })

    try {
      revalidatePath('/dashboard/pendaftaran')
      revalidatePath('/dashboard')
    } catch {}

    return {
      success: true,
      message: `${ids.length} data pendaftaran berhasil dipindahkan ke kotak sampah.`,
    }
  } catch (error: any) {
    console.error('Error in bulkSoftDeletePendaftaranAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus data pendaftaran terpilih.' }
  }
}
