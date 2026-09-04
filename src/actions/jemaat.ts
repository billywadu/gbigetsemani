'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  createJemaatSchema,
  updateJemaatSchema,
  deleteJemaatSchema,
  restoreJemaatSchema,
  hardDeleteJemaatSchema,
  jemaatFilterSchema,
  StatusJemaatEnum,
  CreateJemaatInput,
  UpdateJemaatInput,
  DeleteJemaatInput,
  RestoreJemaatInput,
  HardDeleteJemaatInput,
  JemaatFilterParams,
} from '@/lib/validations/jemaat'
import { requireStaffSession } from '@/lib/security/auth-guard'
import {
  createAuditLog,
  calculateJemaatCompleteness,
  getNextAtomicNij,
  generateUniqueBarcodeCode,
} from '@/lib/jemaat-helpers'
import { Role } from '@/config/navigation'

/**
 * Get Paginated Jemaat List with Search & Filtering
 */
export async function getJemaatListAction(params?: JemaatFilterParams) {
  try {
    const auth = await requireStaffSession('jemaat.read')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const validated = jemaatFilterSchema.parse(params || {})
    const { search, statusJemaat, jenisKelamin, kategorialId, komselId, statusHapus = 'ACTIVE', page, pageSize } = validated

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
        { nama: { contains: q, mode: 'insensitive' } },
        { nij: { contains: q, mode: 'insensitive' } },
        { nik: { contains: q, mode: 'insensitive' } },
        { noHp: { contains: q, mode: 'insensitive' } },
        { barcodeCode: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (statusJemaat) {
      whereClause.statusJemaat = statusJemaat
    } else {
      whereClause.statusJemaat = { not: 'TAMU' }
    }
    if (jenisKelamin) whereClause.jenisKelamin = jenisKelamin
    if (kategorialId) whereClause.kategorialId = kategorialId
    if (komselId) whereClause.komselId = komselId

    const skip = (page - 1) * pageSize

    const [items, total, totalJemaatCount, activeCount, inactiveCount, maleCount, femaleCount] = await Promise.all([
      prisma.jemaat.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          keluarga: { select: { id: true, namaKeluarga: true, nomorKeluarga: true } },
          kategorial: { select: { id: true, nama: true } },
          anggotaKategorialList: {
            select: {
              kategorialId: true,
              kategorial: { select: { id: true, nama: true } },
            },
          },
          komsel: { select: { id: true, nama: true, wilayah: true } },
        },
      }),
      prisma.jemaat.count({ where: whereClause }),
      prisma.jemaat.count({ where: { deletedAt: null, statusJemaat: { not: 'TAMU' } } }),
      prisma.jemaat.count({ where: { deletedAt: null, statusJemaat: 'ACTIVE' } }),
      prisma.jemaat.count({ where: { deletedAt: null, statusJemaat: 'INACTIVE' } }),
      prisma.jemaat.count({ where: { deletedAt: null, statusJemaat: { not: 'TAMU' }, jenisKelamin: 'LAK_LAKI' } }),
      prisma.jemaat.count({ where: { deletedAt: null, statusJemaat: { not: 'TAMU' }, jenisKelamin: 'PEREMPUAN' } }),
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
          totalJemaat: totalJemaatCount,
          active: activeCount,
          inactive: inactiveCount,
          male: maleCount,
          female: femaleCount,
        },
      },
    }
  } catch (error: any) {
    console.error('Error in getJemaatListAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat data jemaat.',
    }
  }
}

/**
 * Get Jemaat Detail by ID with Full Relations
 */
export async function getJemaatByIdAction(id: string) {
  try {
    if (!id) throw new Error('ID Jemaat wajib disertakan.')

    const jemaat = await prisma.jemaat.findFirst({
      where: { id, deletedAt: null },
      include: {
        keluarga: {
          include: {
            kepalaJemaat: {
              select: { id: true, nama: true, nij: true, noHp: true, jenisKelamin: true },
            },
            anggotaKeluarga: {
              include: {
                jemaat: {
                  select: {
                    id: true,
                    nama: true,
                    nij: true,
                    statusJemaat: true,
                    jenisKelamin: true,
                    tanggalLahir: true,
                    noHp: true,
                  },
                },
              },
            },
          },
        },
        kategorial: true,
        komsel: {
          include: {
            koordinator: {
              select: { id: true, nama: true, nij: true, noHp: true },
            },
          },
        },
        pelayanRecord: {
          include: {
            kategorial: true,
            kategoriPelayanan: {
              include: {
                kategoriPelayanan: true,
                kategorial: true,
              },
            },
          },
        },
        documents: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        attendances: {
          orderBy: { scannedAt: 'desc' },
          take: 100,
          include: {
            event: {
              select: {
                id: true,
                namaEvent: true,
                kategori: true,
                tanggalMulai: true,
                tanggalSelesai: true,
                namaLokasi: true,
                alamatLokasi: true,
              },
            },
          },
        },
      },
    })

    if (!jemaat) {
      return {
        success: false,
        error: 'Data jemaat tidak ditemukan atau telah dihapus.',
      }
    }

    // Query Audit Logs for this Jemaat
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: id },
          { entity: 'Jemaat', entityId: id },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            username: true,
            role: true,
          },
        },
      },
    })

    return {
      success: true,
      data: {
        ...jemaat,
        auditLogs,
      },
    }
  } catch (error: any) {
    console.error('Error in getJemaatByIdAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengambil detail jemaat.',
    }
  }
}

/**
 * Create New Jemaat Record
 */
export async function createJemaatAction(input: CreateJemaatInput) {
  try {
    const auth = await requireStaffSession('jemaat.create')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const staffActor = `${auth.user.nama} (${auth.user.role})`

    const validated = createJemaatSchema.parse(input)

    const completenessPercentage = calculateJemaatCompleteness({
      nama: validated.nama,
      namaPanggilan: validated.namaPanggilan,
      jenisKelamin: validated.jenisKelamin,
      tempatLahir: validated.tempatLahir,
      tanggalLahir: validated.tanggalLahir,
      noHp: validated.noHp,
      whatsApp: validated.whatsApp,
      email: validated.email,
      alamat: validated.alamat,
      statusJemaat: validated.statusJemaat,
      statusBaptis: validated.statusBaptis,
      statusPernikahan: validated.statusPernikahan,
      pekerjaan: validated.pekerjaan,
      pendidikan: validated.pendidikan,
      kontakDarurat: validated.kontakDarurat,
    })

    // Execute in Transaction
    const newJemaat = await prisma.$transaction(async (tx) => {
      const atomicNij = await getNextAtomicNij(tx)
      const barcodeCode = await generateUniqueBarcodeCode(tx)

      const created = await tx.jemaat.create({
        data: {
          nij: atomicNij,
          barcodeCode,
          nik: validated.nik ? validated.nik.trim() : null,
          nama: validated.nama,
          namaPanggilan: validated.namaPanggilan || null,
          jenisKelamin: validated.jenisKelamin,
          tempatLahir: validated.tempatLahir || null,
          tanggalLahir: validated.tanggalLahir ? new Date(validated.tanggalLahir) : null,
          noHp: validated.noHp || null,
          whatsApp: validated.whatsApp || null,
          email: validated.email || null,
          alamat: validated.alamat || null,
          kota: validated.kota || 'Padang',
          provinsi: validated.provinsi || 'Sumatera Barat',
          kodePos: validated.kodePos || null,
          statusJemaat: validated.statusJemaat,
          tanggalBergabung: validated.tanggalBergabung ? new Date(validated.tanggalBergabung) : new Date(),
          statusBaptis: validated.statusBaptis,
          tanggalBaptis: validated.tanggalBaptis ? new Date(validated.tanggalBaptis) : null,
          statusFollowUp: validated.statusFollowUp,
          statusPernikahan: validated.statusPernikahan,
          tanggalMenikah: validated.tanggalMenikah ? new Date(validated.tanggalMenikah) : null,
          pekerjaan: validated.pekerjaan || null,
          pendidikan: validated.pendidikan || null,
          kontakDarurat: validated.kontakDarurat || null,
          catatan: validated.catatan || null,
          completenessPercentage,
          keluargaId: validated.keluargaId || null,
          kategorialId: validated.kategorialId || null,
          komselId: validated.komselId || null,
        },
      })

      // SHA-256 Audit Log Entry
      await createAuditLog(
        staffActor,
        'JEMAAT_CREATED',
        'Jemaat',
        created.id,
        `Created Jemaat ${created.nama} (${created.nij})`,
        undefined,
        tx
      )

      return created
    })

    revalidatePath('/dashboard/jemaat')
    return {
      success: true,
      data: newJemaat,
    }
  } catch (error: any) {
    console.error('Error in createJemaatAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menambahkan jemaat baru.',
    }
  }
}

/**
 * Update Existing Jemaat Record
 */
export async function updateJemaatAction(input: UpdateJemaatInput) {
  try {
    const auth = await requireStaffSession('jemaat.update')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const staffActor = `${auth.user.nama} (${auth.user.role})`

    const validated = updateJemaatSchema.parse(input)
    const existing = await prisma.jemaat.findUnique({ where: { id: validated.id } })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Data jemaat tidak ditemukan.' }
    }

    const mergedData = {
      nik: validated.nik !== undefined ? (validated.nik ? validated.nik.trim() : null) : existing.nik,
      nama: validated.nama ?? existing.nama,
      namaPanggilan: validated.namaPanggilan !== undefined ? validated.namaPanggilan : existing.namaPanggilan,
      jenisKelamin: validated.jenisKelamin ?? existing.jenisKelamin,
      tempatLahir: validated.tempatLahir !== undefined ? validated.tempatLahir : existing.tempatLahir,
      tanggalLahir: validated.tanggalLahir !== undefined ? (validated.tanggalLahir ? new Date(validated.tanggalLahir) : null) : existing.tanggalLahir,
      noHp: validated.noHp !== undefined ? validated.noHp : existing.noHp,
      whatsApp: validated.whatsApp !== undefined ? validated.whatsApp : existing.whatsApp,
      email: validated.email !== undefined ? validated.email : existing.email,
      alamat: validated.alamat !== undefined ? validated.alamat : existing.alamat,
      kota: validated.kota ?? existing.kota,
      provinsi: validated.provinsi ?? existing.provinsi,
      kodePos: validated.kodePos !== undefined ? validated.kodePos : existing.kodePos,
      statusJemaat: validated.statusJemaat ?? existing.statusJemaat,
      tanggalBergabung: validated.tanggalBergabung !== undefined ? (validated.tanggalBergabung ? new Date(validated.tanggalBergabung) : null) : existing.tanggalBergabung,
      statusBaptis: validated.statusBaptis ?? existing.statusBaptis,
      tanggalBaptis: validated.tanggalBaptis !== undefined ? (validated.tanggalBaptis ? new Date(validated.tanggalBaptis) : null) : existing.tanggalBaptis,
      statusFollowUp: validated.statusFollowUp ?? existing.statusFollowUp,
      statusPernikahan: validated.statusPernikahan ?? existing.statusPernikahan,
      tanggalMenikah: validated.tanggalMenikah !== undefined ? (validated.tanggalMenikah ? new Date(validated.tanggalMenikah) : null) : existing.tanggalMenikah,
      pekerjaan: validated.pekerjaan !== undefined ? validated.pekerjaan : existing.pekerjaan,
      pendidikan: validated.pendidikan !== undefined ? validated.pendidikan : existing.pendidikan,
      kontakDarurat: validated.kontakDarurat !== undefined ? validated.kontakDarurat : existing.kontakDarurat,
      catatan: validated.catatan !== undefined ? validated.catatan : existing.catatan,
      keluargaId: validated.keluargaId !== undefined ? validated.keluargaId : existing.keluargaId,
      kategorialId: validated.kategorialId !== undefined ? validated.kategorialId : existing.kategorialId,
      komselId: validated.komselId !== undefined ? validated.komselId : existing.komselId,
    }

    const completenessPercentage = calculateJemaatCompleteness(mergedData)

    const updatedJemaat = await prisma.$transaction(async (tx) => {
      const updated = await tx.jemaat.update({
        where: { id: validated.id },
        data: {
          ...mergedData,
          completenessPercentage,
        },
      })

      // SHA-256 Audit Log Entry
      await createAuditLog(
        staffActor,
        'JEMAAT_UPDATED',
        'Jemaat',
        updated.id,
        `Updated Jemaat ${updated.nama} (${updated.nij})`,
        undefined,
        tx
      )

      return updated
    })

    revalidatePath('/dashboard/jemaat')
    revalidatePath(`/dashboard/jemaat/${validated.id}`)

    return {
      success: true,
      data: updatedJemaat,
    }
  } catch (error: any) {
    console.error('Error in updateJemaatAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui data jemaat.',
    }
  }
}

/**
 * Soft Delete Jemaat Record
 */
export async function deleteJemaatAction(input: DeleteJemaatInput) {
  try {
    const auth = await requireStaffSession('jemaat.delete')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const staffActor = `${auth.user.nama} (${auth.user.role})`

    const validated = deleteJemaatSchema.parse(input)
    const existing = await prisma.jemaat.findUnique({ where: { id: validated.id } })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Data jemaat tidak ditemukan atau sudah dihapus.' }
    }

    await prisma.$transaction(async (tx) => {
      const softDeleted = await tx.jemaat.update({
        where: { id: validated.id },
        data: {
          deletedAt: new Date(),
          deletedBy: staffActor,
          deletionReason: validated.reason,
        },
      })

      // SHA-256 Audit Log Entry
      await createAuditLog(
        staffActor,
        'JEMAAT_DELETED',
        'Jemaat',
        softDeleted.id,
        `Soft-deleted Jemaat ${softDeleted.nama} (${softDeleted.nij}). Reason: "${validated.reason}"`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/jemaat')

    return {
      success: true,
      message: `Jemaat ${existing.nama} (${existing.nij}) berhasil di-soft delete.`,
    }
  } catch (error: any) {
    console.error('Error in deleteJemaatAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menghapus data jemaat.',
    }
  }
}

/**
 * Get Overall Jemaat Aggregated Statistics
 */
export async function getJemaatStatsAction() {
  try {
    const auth = await requireStaffSession('jemaat.read')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    const [total, active, inactive, male, female] = await Promise.all([
      prisma.jemaat.count({ where: { deletedAt: null } }),
      prisma.jemaat.count({ where: { deletedAt: null, statusJemaat: 'ACTIVE' } }),
      prisma.jemaat.count({ where: { deletedAt: null, statusJemaat: 'INACTIVE' } }),
      prisma.jemaat.count({ where: { deletedAt: null, jenisKelamin: 'LAK_LAKI' } }),
      prisma.jemaat.count({ where: { deletedAt: null, jenisKelamin: 'PEREMPUAN' } }),
    ])

    return {
      success: true,
      data: {
        totalJemaat: total,
        active,
        inactive,
        male,
        female,
      },
    }
  } catch (error: any) {
    console.error('Error in getJemaatStatsAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat statistik jemaat.',
    }
  }
}

/**
 * Restore Soft-Deleted Jemaat
 */
export async function restoreJemaatAction(input: RestoreJemaatInput) {
  try {
    const auth = await requireStaffSession('jemaat.delete')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const staffActor = `${auth.user.nama} (${auth.user.role})`

    const validated = restoreJemaatSchema.parse(input)
    const { id } = validated

    const existing = await prisma.jemaat.findFirst({
      where: { id, deletedAt: { not: null } },
    })
    if (!existing) {
      return { success: false, error: 'Data jemaat yang dihapus tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.jemaat.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
          statusJemaat: 'ACTIVE',
        },
      })

      // SHA-256 Audit Log Entry
      await createAuditLog(
        staffActor,
        'JEMAAT_RESTORED',
        'Jemaat',
        id,
        `Restored Jemaat ${existing.nama} (${existing.nij || '-'})`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/jemaat')

    return {
      success: true,
      message: `Jemaat ${existing.nama} berhasil dipulihkan kembali ke status AKTIF.`,
    }
  } catch (error: any) {
    console.error('Error in restoreJemaatAction:', error)
    return { success: false, error: error?.message || 'Gagal memulihkan data jemaat.' }
  }
}

/**
 * Hard Delete (Permanent Purge) Jemaat from Database
 */
export async function hardDeleteJemaatAction(input: HardDeleteJemaatInput) {
  try {
    const auth = await requireStaffSession('jemaat.delete')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    const staffActor = `${auth.user.nama} (${auth.user.role})`

    const validated = hardDeleteJemaatSchema.parse(input)
    const { id } = validated

    const existing = await prisma.jemaat.findUnique({
      where: { id },
    })
    if (!existing) {
      return { success: false, error: 'Data jemaat tidak ditemukan dalam database.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.jemaat.delete({ where: { id } })

      // SHA-256 Audit Log Entry
      await createAuditLog(
        staffActor,
        'JEMAAT_PERMANENTLY_DELETED',
        'Jemaat',
        id,
        `Permanently purged Jemaat ${existing.nama} (${existing.nij || '-'}) from database.`,
        undefined,
        tx
      )
    })

    revalidatePath('/dashboard/jemaat')

    return {
      success: true,
      message: `Data jemaat ${existing.nama} berhasil dihapus secara PERMANEN dari database.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeleteJemaatAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus data jemaat secara permanen.' }
  }
}

/**
 * Get Dropdown Options for Jemaat Create/Edit Forms
 */
export async function getJemaatFormOptionsAction() {
  try {
    const [kategorialList, komselList, keluargaList] = await Promise.all([
      prisma.kategorial.findMany({
        where: { deletedAt: null },
        select: { id: true, nama: true },
        orderBy: { nama: 'asc' },
      }),
      prisma.komsel.findMany({
        where: { deletedAt: null },
        select: { id: true, nama: true },
        orderBy: { nama: 'asc' },
      }),
      prisma.keluarga.findMany({
        where: { deletedAt: null },
        select: { id: true, nomorKeluarga: true, namaKeluarga: true, kepalaJemaat: { select: { nama: true } } },
        orderBy: { nomorKeluarga: 'asc' },
      }),
    ])

    return {
      success: true,
      data: {
        kategorial: kategorialList,
        komsel: komselList.map((k) => ({ id: k.id, nama: k.nama })),
        keluarga: keluargaList.map((k) => ({
          id: k.id,
          nama: `${k.nomorKeluarga} - ${k.namaKeluarga} (${k.kepalaJemaat?.nama || 'Tanpa Kepala'})`,
        })),
      },
    }
  } catch (error: any) {
    console.error('Error in getJemaatFormOptionsAction:', error)
    return {
      success: false,
      data: { kategorial: [], komsel: [], keluarga: [] },
    }
  }
}

/**
 * Bulk Update Status Jemaat
 */
export async function bulkUpdateJemaatStatusAction(data: {
  ids: string[]
  statusJemaat: z.infer<typeof StatusJemaatEnum>
  reason?: string
}) {
  try {
    const auth = await requireStaffSession('jemaat.update')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada jemaat yang dipilih.' }
    }

    const { ids, statusJemaat, reason } = data

    await prisma.$transaction(async (tx) => {
      await tx.jemaat.updateMany({
        where: { id: { in: ids } },
        data: { statusJemaat, updatedAt: new Date() },
      })

      await createAuditLog(
        auth.user.nama,
        'UPDATE_BULK_STATUS',
        'Jemaat',
        `${ids.length}_RECORDS`,
        `Mengubah status massal (${ids.length} jemaat) menjadi [${statusJemaat}]. ${reason ? `Alasan: ${reason}` : ''}`,
        auth.user.userId,
        tx
      )
    })

    revalidatePath('/dashboard/jemaat')
    revalidatePath('/dashboard')

    return {
      success: true,
      message: `Status untuk ${ids.length} jemaat berhasil diperbarui menjadi ${statusJemaat}.`,
    }
  } catch (error: any) {
    console.error('Error in bulkUpdateJemaatStatusAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui status jemaat secara massal.' }
  }
}

/**
 * Bulk Assign Kategorial and/or Komsel
 */
export async function bulkAssignJemaatGroupAction(data: {
  ids: string[]
  kategorialId?: string | null
  komselId?: string | null
}) {
  try {
    const auth = await requireStaffSession('jemaat.update')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada jemaat yang dipilih.' }
    }

    const { ids, kategorialId, komselId } = data
    const updatePayload: any = { updatedAt: new Date() }

    if (kategorialId !== undefined) {
      updatePayload.kategorialId = kategorialId === 'NONE' || kategorialId === '' ? null : kategorialId
    }
    if (komselId !== undefined) {
      updatePayload.komselId = komselId === 'NONE' || komselId === '' ? null : komselId
    }

    await prisma.$transaction(async (tx) => {
      await tx.jemaat.updateMany({
        where: { id: { in: ids } },
        data: updatePayload,
      })

      await createAuditLog(
        auth.user.nama,
        'ASSIGN_BULK_GROUP',
        'Jemaat',
        `${ids.length}_RECORDS`,
        `Assign massal kategorial/komsel untuk (${ids.length} jemaat).`,
        auth.user.userId,
        tx
      )
    })

    revalidatePath('/dashboard/jemaat')
    return {
      success: true,
      message: `Berhasil memperbarui grup kategorial/komsel untuk ${ids.length} jemaat.`,
    }
  } catch (error: any) {
    console.error('Error in bulkAssignJemaatGroupAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui grup jemaat.' }
  }
}

/**
 * Bulk Soft Delete Jemaat
 */
export async function bulkSoftDeleteJemaatAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    const auth = await requireStaffSession('jemaat.delete')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada jemaat yang dipilih.' }
    }
    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penghapusan massal wajib diisi.' }
    }

    const { ids, reason } = data

    await prisma.$transaction(async (tx) => {
      await tx.jemaat.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: new Date() },
      })

      await createAuditLog(
        auth.user.nama,
        'DELETE_BULK_SOFT',
        'Jemaat',
        `${ids.length}_RECORDS`,
        `Soft delete massal (${ids.length} jemaat). Alasan: ${reason}`,
        auth.user.userId,
        tx
      )
    })

    revalidatePath('/dashboard/jemaat')
    revalidatePath('/dashboard')
    return {
      success: true,
      message: `${ids.length} jemaat berhasil dipindahkan ke kotak sampah.`,
    }
  } catch (error: any) {
    console.error('Error in bulkSoftDeleteJemaatAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus data jemaat terpilih.' }
  }
}

/**
 * Get Jemaat data for Print Cards
 */
export async function getJemaatForPrintCardsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada jemaat yang dipilih.', data: [] }
    }

    const items = await prisma.jemaat.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        nama: true,
        namaPanggilan: true,
        nij: true,
        nik: true,
        barcodeCode: true,
        jenisKelamin: true,
        statusJemaat: true,
        tanggalBergabung: true,
        kategorial: { select: { nama: true } },
        komsel: { select: { nama: true } },
      },
      orderBy: { nama: 'asc' },
    })

    return {
      success: true,
      data: items,
    }
  } catch (error: any) {
    console.error('Error in getJemaatForPrintCardsAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat data kartu jemaat.', data: [] }
  }
}

