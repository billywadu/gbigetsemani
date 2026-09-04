'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  createEventSchema,
  updateEventSchema,
  deleteEventSchema,
  restoreEventSchema,
  hardDeleteEventSchema,
  scanAttendanceSchema,
  recordGuestAttendanceSchema,
  updateEventHeadcountSchema,
  recordAttendanceByIdSchema,
  eventFilterSchema,
  CreateEventInput,
  UpdateEventInput,
  DeleteEventInput,
  RestoreEventInput,
  HardDeleteEventInput,
  ScanAttendanceInput,
  RecordGuestAttendanceInput,
  UpdateEventHeadcountInput,
  RecordAttendanceByIdInput,
  EventFilterParams,
  EventKategori,
} from '@/lib/validations/event'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'
import { getStorageProvider } from '@/lib/storage'
import { getCurrentStaffSession } from '@/lib/security/session'
import { isUserAssignedToKategorial } from '@/lib/permissions'

const CURRENT_STAFF_ACTOR = 'Staff Usher / Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

async function getEventActor() {
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

export type EventDTO = {
  id: string
  namaEvent: string
  kategori: EventKategori
  tanggalMulai: string
  tanggalSelesai: string | null
  presensiBuka: string | null
  presensiTutup: string | null
  namaLokasi: string | null
  alamatLokasi: string | null
  lokasi: string
  thumbnailUrl: string | null
  deskripsi: string | null
  manualHeadcount: number
  totalAttendance: number
  guestAttendanceCount: number
  regularAttendanceCount: number
  deletedAt: string | null
  createdAt: string
  tanggal: string
}

export type AttendanceResultDTO = {
  attendanceId: string
  jemaatId: string
  nij: string
  barcodeCode: string
  nama: string
  statusJemaat: string
  scannedAt: string
  idempotent: boolean
}

function mapEventToDTO(ev: any, attendanceCount?: number, guestCount?: number): EventDTO {
  const total = attendanceCount ?? ev._count?.attendances ?? ev.attendances?.length ?? 0
  const guests = guestCount ?? (ev.attendances ? ev.attendances.filter((a: any) => a.jemaat?.statusJemaat === 'TAMU').length : 0)
  const regulars = Math.max(0, total - guests)
  const startDate = ev.tanggalMulai || ev.tanggal || new Date()

  return {
    id: ev.id,
    namaEvent: ev.namaEvent,
    kategori: ev.kategori,
    tanggalMulai: startDate instanceof Date ? startDate.toISOString() : new Date(startDate).toISOString(),
    tanggalSelesai: ev.tanggalSelesai ? (ev.tanggalSelesai instanceof Date ? ev.tanggalSelesai.toISOString() : new Date(ev.tanggalSelesai).toISOString()) : null,
    presensiBuka: ev.presensiBuka ? (ev.presensiBuka instanceof Date ? ev.presensiBuka.toISOString() : new Date(ev.presensiBuka).toISOString()) : null,
    presensiTutup: ev.presensiTutup ? (ev.presensiTutup instanceof Date ? ev.presensiTutup.toISOString() : new Date(ev.presensiTutup).toISOString()) : null,
    namaLokasi: ev.namaLokasi || ev.lokasi || 'Gedung Utama Gereja',
    alamatLokasi: ev.alamatLokasi || null,
    lokasi: ev.namaLokasi || ev.lokasi || 'Gedung Utama Gereja',
    thumbnailUrl: ev.thumbnailUrl || null,
    deskripsi: ev.deskripsi,
    manualHeadcount: ev.manualHeadcount || 0,
    totalAttendance: total,
    guestAttendanceCount: guests,
    regularAttendanceCount: regulars,
    deletedAt: ev.deletedAt ? (ev.deletedAt instanceof Date ? ev.deletedAt.toISOString() : new Date(ev.deletedAt).toISOString()) : null,
    createdAt: ev.createdAt instanceof Date ? ev.createdAt.toISOString() : new Date(ev.createdAt).toISOString(),
    tanggal: startDate instanceof Date ? startDate.toISOString() : new Date(startDate).toISOString(),
  }
}

/**
 * Get Paginated Events with attendance counts and filters
 */
export async function getEventListAction(params?: EventFilterParams) {
  try {
    const actor = await getEventActor()
    const validated = eventFilterSchema.parse(params || {})
    const { search, kategori, statusHapus = 'ACTIVE', page, pageSize } = validated

    const whereClause: Prisma.EventWhereInput = {}

    // Scoped filtering for SEKRETARIS_KATEGORIAL
    if (actor.role === 'SEKRETARIS_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId)
      if (assignedIds.length > 0) {
        whereClause.kategorialId = { in: assignedIds }
      }
    }

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }

    if (kategori) {
      whereClause.kategori = kategori
    }

    if (search) {
      whereClause.OR = [
        { namaEvent: { contains: search, mode: 'insensitive' } },
        { lokasi: { contains: search, mode: 'insensitive' } },
        { namaLokasi: { contains: search, mode: 'insensitive' } },
        { alamatLokasi: { contains: search, mode: 'insensitive' } },
        { deskripsi: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * pageSize

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { tanggalMulai: 'desc' },
        include: {
          _count: {
            select: { attendances: true },
          },
        },
      }),
      prisma.event.count({ where: whereClause }),
    ])

    const formattedEvents: EventDTO[] = events.map((ev) => mapEventToDTO(ev))

    const totalPages = Math.ceil(total / pageSize) || 1

    return {
      success: true,
      data: {
        items: formattedEvents,
        total,
        page,
        pageSize,
        totalPages,
      },
    }
  } catch (error: any) {
    console.error('Error in getEventListAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengambil data event dari database.',
      data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 },
    }
  }
}

/**
 * Get Event by ID with Attendance Records
 */
export async function getEventByIdAction(id: string) {
  try {
    if (!id) throw new Error('ID Event wajib disertakan.')

    const event = await prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: {
        attendances: {
          orderBy: { scannedAt: 'desc' },
          include: {
            jemaat: {
              select: {
                id: true,
                nij: true,
                barcodeCode: true,
                nama: true,
                statusJemaat: true,
                noHp: true,
              },
            },
          },
        },
      },
    })

    if (!event) {
      return {
        success: false,
        error: 'Event tidak ditemukan atau telah dihapus.',
      }
    }

    const formattedAttendance: AttendanceResultDTO[] = event.attendances.map((att) => ({
      attendanceId: att.id,
      jemaatId: att.jemaatId,
      nij: att.jemaat?.nij || '-',
      barcodeCode: att.jemaat?.barcodeCode || '-',
      nama: att.jemaat?.nama || 'Jemaat Terdaftar',
      statusJemaat: att.jemaat?.statusJemaat || 'ACTIVE',
      scannedAt: att.scannedAt.toISOString(),
      idempotent: false,
    }))

    const guestAttendanceCount = event.attendances.filter(a => a.jemaat?.statusJemaat === 'TAMU').length
    const eventDTO = mapEventToDTO(event, event.attendances.length, guestAttendanceCount)

    return {
      success: true,
      data: {
        event: eventDTO,
        attendance: formattedAttendance,
        totalAttendance: formattedAttendance.length,
      },
    }
  } catch (error: any) {
    console.error('Error in getEventByIdAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengambil detail event.',
    }
  }
}

/**
 * Create New Event & Jadwal Ibadah
 */
export async function createEventAction(input: CreateEventInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'event.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin event.manage.' }
    }

    const validated = createEventSchema.parse(input)
    const startDate = validated.tanggalMulai || validated.tanggal || new Date()

    const newEvent = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          namaEvent: validated.namaEvent,
          kategori: validated.kategori,
          tanggalMulai: startDate,
          tanggalSelesai: validated.tanggalSelesai || null,
          presensiBuka: validated.presensiBuka || null,
          presensiTutup: validated.presensiTutup || null,
          namaLokasi: validated.namaLokasi || validated.lokasi || 'Gedung Utama Gereja',
          alamatLokasi: validated.alamatLokasi || null,
          lokasi: validated.namaLokasi || validated.lokasi || 'Gedung Utama Gereja',
          thumbnailUrl: validated.thumbnailUrl || null,
          deskripsi: validated.deskripsi || null,
          tanggal: startDate,
        },
      })

      // Cryptographic SHA-256 Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'EVENT_CREATED',
        'Event',
        created.id,
        JSON.stringify({
          namaEvent: created.namaEvent,
          kategori: created.kategori,
          tanggalMulai: created.tanggalMulai,
          namaLokasi: created.namaLokasi,
        }),
        undefined,
        tx
      )

      return created
    })

    try {
      revalidatePath('/dashboard/event')
      revalidatePath('/dashboard')
    } catch {}

    return {
      success: true,
      data: mapEventToDTO(newEvent),
      message: `Event "${newEvent.namaEvent}" berhasil dibuat!`,
    }
  } catch (error: any) {
    console.error('Error in createEventAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal membuat jadwal event.',
    }
  }
}

/**
 * Update Event Details
 */
export async function updateEventAction(input: UpdateEventInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'event.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin event.manage.' }
    }

    const validated = updateEventSchema.parse(input)
    const startDate = validated.tanggalMulai || validated.tanggal

    const updateData: any = {}
    if (validated.namaEvent !== undefined) updateData.namaEvent = validated.namaEvent
    if (validated.kategori !== undefined) updateData.kategori = validated.kategori
    if (startDate !== undefined) {
      updateData.tanggalMulai = startDate
      updateData.tanggal = startDate
    }
    if (validated.tanggalSelesai !== undefined) updateData.tanggalSelesai = validated.tanggalSelesai
    if (validated.presensiBuka !== undefined) updateData.presensiBuka = validated.presensiBuka
    if (validated.presensiTutup !== undefined) updateData.presensiTutup = validated.presensiTutup
    if (validated.namaLokasi !== undefined) {
      updateData.namaLokasi = validated.namaLokasi
      updateData.lokasi = validated.namaLokasi || 'Gedung Utama Gereja'
    }
    if (validated.alamatLokasi !== undefined) updateData.alamatLokasi = validated.alamatLokasi
    if (validated.lokasi !== undefined && !validated.namaLokasi) updateData.lokasi = validated.lokasi
    if (validated.thumbnailUrl !== undefined) updateData.thumbnailUrl = validated.thumbnailUrl
    if (validated.deskripsi !== undefined) updateData.deskripsi = validated.deskripsi

    const updated = await prisma.event.update({
      where: { id: validated.id },
      data: updateData,
    })

    try {
      revalidatePath('/dashboard/event')
      revalidatePath(`/dashboard/event/${updated.id}`)
      revalidatePath(`/scan/${updated.id}`)
      revalidatePath('/dashboard')
    } catch {}

    return {
      success: true,
      data: mapEventToDTO(updated),
      message: `Event "${updated.namaEvent}" berhasil diperbarui.`,
    }
  } catch (error: any) {
    console.error('Error in updateEventAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui event.',
    }
  }
}

/**
 * Delete Event (Soft Delete)
 */
export async function deleteEventAction(input: DeleteEventInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'event.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin event.manage.' }
    }

    const validated = deleteEventSchema.parse(input)

    const existing = await prisma.event.findUnique({
      where: { id: validated.id },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Event tidak ditemukan atau sudah dihapus.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: validated.id },
        data: {
          deletedAt: new Date(),
          deletedBy: CURRENT_STAFF_ACTOR,
          deletionReason: validated.reason,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'EVENT_SOFT_DELETED',
        'Event',
        validated.id,
        JSON.stringify({
          namaEvent: existing.namaEvent,
          reason: validated.reason,
        }),
        undefined,
        tx
      )
    })

    try {
      revalidatePath('/dashboard/event')
    } catch {}

    return {
      success: true,
      message: `Event "${existing.namaEvent}" berhasil di-soft delete.`,
    }
  } catch (error: any) {
    console.error('Error in deleteEventAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menghapus event.',
    }
  }
}

/**
 * Restore Soft Deleted Event
 */
export async function restoreEventAction(input: RestoreEventInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'event.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin event.manage.' }
    }

    const validated = restoreEventSchema.parse(input)

    const existing = await prisma.event.findUnique({
      where: { id: validated.id },
    })

    if (!existing || !existing.deletedAt) {
      return { success: false, error: 'Event tidak ditemukan dalam daftar terhapus.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: validated.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'EVENT_RESTORED',
        'Event',
        validated.id,
        JSON.stringify({
          namaEvent: existing.namaEvent,
        }),
        undefined,
        tx
      )
    })

    try {
      revalidatePath('/dashboard/event')
    } catch {}

    return {
      success: true,
      message: `Event "${existing.namaEvent}" berhasil dipulihkan!`,
    }
  } catch (error: any) {
    console.error('Error in restoreEventAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memulihkan event.',
    }
  }
}

/**
 * Hard Delete Event from Database
 */
export async function hardDeleteEventAction(input: HardDeleteEventInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'event.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin event.manage.' }
    }

    const validated = hardDeleteEventSchema.parse(input)

    const existing = await prisma.event.findUnique({
      where: { id: validated.id },
    })

    if (!existing) {
      return { success: false, error: 'Event tidak ditemukan.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated attendances
      await tx.attendance.deleteMany({
        where: { eventId: validated.id },
      })

      // 2. Delete audit logs
      await tx.auditLog.deleteMany({
        where: { entityId: validated.id },
      })

      // 3. Delete event
      await tx.event.delete({
        where: { id: validated.id },
      })

      // 4. Create audit log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'EVENT_PERMANENTLY_DELETED',
        'Event',
        validated.id,
        JSON.stringify({
          namaEvent: existing.namaEvent,
          kategori: existing.kategori,
          reason: validated.reason,
        }),
        undefined,
        tx
      )
    })

    try {
      revalidatePath('/dashboard/event')
    } catch {}

    return {
      success: true,
      message: `Event "${existing.namaEvent}" berhasil dihapus permanen dari database.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeleteEventAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menghapus permanen event.',
    }
  }
}

function validateCheckInWindow(
  event: { presensiBuka: Date | null; presensiTutup: Date | null; namaEvent: string },
  isDashboardOverride?: boolean
): { isOpen: boolean; message?: string } {
  if (isDashboardOverride) {
    return { isOpen: true } // Admin/Staff override allowed for post-event dashboard reconciliation
  }

  const now = new Date()

  if (event.presensiBuka && now < new Date(event.presensiBuka)) {
    const openTimeStr = new Date(event.presensiBuka).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    return {
      isOpen: false,
      message: `Presensi belum dibuka. Jendela presensi "${event.namaEvent}" baru dibuka pada pukul ${openTimeStr} WIB.`,
    }
  }

  if (event.presensiTutup && now > new Date(event.presensiTutup)) {
    const closeTimeStr = new Date(event.presensiTutup).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    return {
      isOpen: false,
      message: `Presensi telah ditutup resmi pada pukul ${closeTimeStr} WIB. Terminal scanner dinonaktifkan.`,
    }
  }

  return { isOpen: true }
}

/**
 * Critical Action: Scan Attendance Barcode/QR Code
 * High performance (<2s), atomic constraint & concurrency safe, idempotent
 */
export async function scanAttendanceAction(input: ScanAttendanceInput) {
  try {
    const validated = scanAttendanceSchema.parse(input)
    const { eventId, barcodeCode, notes, isDashboardOverride } = validated

    // 1. Find Event & Validate Check-in Window
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true, namaEvent: true, presensiBuka: true, presensiTutup: true },
    })

    if (!event) {
      return {
        success: false,
        errorCode: 'EVENT_NOT_FOUND',
        message: 'Event tidak ditemukan atau telah ditutup.',
      }
    }

    const windowCheck = validateCheckInWindow(event, isDashboardOverride)
    if (!windowCheck.isOpen) {
      return {
        success: false,
        errorCode: 'CHECKIN_CLOSED',
        message: windowCheck.message || 'Jendela waktu presensi untuk event ini telah ditutup.',
      }
    }

    // 2. Find Jemaat by unique indexed barcodeCode, NIJ, or ID
    const cleanCode = barcodeCode.trim()
    const jemaat = await prisma.jemaat.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { barcodeCode: cleanCode },
          { nij: cleanCode },
          { id: cleanCode },
        ],
      },
      select: {
        id: true,
        nij: true,
        barcodeCode: true,
        nama: true,
        statusJemaat: true,
      },
    })

    if (!jemaat) {
      return {
        success: false,
        errorCode: 'JEMAAT_NOT_FOUND',
        message: `Barcode presensi "${barcodeCode}" tidak terdaftar dalam sistem.`,
      }
    }

    // 3. Validate Jemaat Status
    if (jemaat.statusJemaat !== 'ACTIVE') {
      return {
        success: false,
        errorCode: 'JEMAAT_INACTIVE',
        message: `Presensi ditolak: Jemaat "${jemaat.nama}" berstatus ${jemaat.statusJemaat} (hanya jemaat ACTIVE yang dapat presensi).`,
      }
    }

    // 4. Check existing attendance (Idempotency check)
    const existing = await prisma.attendance.findUnique({
      where: {
        eventId_jemaatId: {
          eventId: event.id,
          jemaatId: jemaat.id,
        },
      },
    })

    if (existing) {
      return {
        success: true,
        idempotent: true,
        data: {
          attendanceId: existing.id,
          jemaatId: jemaat.id,
          nij: jemaat.nij || '-',
          barcodeCode: jemaat.barcodeCode || '-',
          nama: jemaat.nama,
          statusJemaat: jemaat.statusJemaat,
          scannedAt: existing.scannedAt.toISOString(),
          idempotent: true,
        },
        message: `Jemaat "${jemaat.nama}" sudah terdaftar hadir sebelumnya pada pukul ${new Date(existing.scannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB.`,
      }
    }

    // 5. Atomic Insert protected against concurrent race condition
    try {
      const attendance = await prisma.$transaction(async (tx) => {
        const created = await tx.attendance.create({
          data: {
            eventId: event.id,
            jemaatId: jemaat.id,
            scannedAt: new Date(),
            scannedBy: CURRENT_STAFF_ACTOR,
            notes: notes || null,
          },
        })

        // Cryptographic SHA-256 Audit Log
        await createAuditLog(
          CURRENT_STAFF_ACTOR,
          'ATTENDANCE_SCANNED',
          'Attendance',
          created.id,
          JSON.stringify({
            eventId: event.id,
            attendanceId: created.id,
            jemaatId: jemaat.id,
            barcodeCode: jemaat.barcodeCode,
            scannedAt: created.scannedAt,
          }),
          undefined,
          tx
        )

        return created
      })

      try {
        revalidatePath(`/dashboard/event/${event.id}`)
      } catch {}

      return {
        success: true,
        idempotent: false,
        data: {
          attendanceId: attendance.id,
          jemaatId: jemaat.id,
          nij: jemaat.nij || '-',
          barcodeCode: jemaat.barcodeCode || '-',
          nama: jemaat.nama,
          statusJemaat: jemaat.statusJemaat,
          scannedAt: attendance.scannedAt.toISOString(),
          idempotent: false,
        },
        message: `✓ Presensi Berhasil! Selamat datang, ${jemaat.nama}.`,
      }
    } catch (err: any) {
      // If concurrent scan triggered unique constraint P2002
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const concurrentAtt = await prisma.attendance.findUnique({
          where: {
            eventId_jemaatId: {
              eventId: event.id,
              jemaatId: jemaat.id,
            },
          },
        })

        return {
          success: true,
          idempotent: true,
          data: {
            attendanceId: concurrentAtt?.id || 'idempotent',
            jemaatId: jemaat.id,
            nij: jemaat.nij || '-',
            barcodeCode: jemaat.barcodeCode || '-',
            nama: jemaat.nama,
            statusJemaat: jemaat.statusJemaat,
            scannedAt: concurrentAtt?.scannedAt ? concurrentAtt.scannedAt.toISOString() : new Date().toISOString(),
            idempotent: true,
          },
          message: `Jemaat "${jemaat.nama}" sudah terdaftar hadir (Concurrent Scan).`,
        }
      }
      throw err
    }
  } catch (error: any) {
    console.error('Error in scanAttendanceAction:', error)
    return {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: error?.message || 'Terjadi kesalahan sistem saat pemrosesan presensi.',
    }
  }
}

/**
 * Get Event Attendance Full Report
 */
export async function getEventAttendanceReportAction(eventId: string) {
  try {
    if (!eventId) throw new Error('ID Event wajib disertakan.')

    const attendances = await prisma.attendance.findMany({
      where: { eventId },
      orderBy: { scannedAt: 'desc' },
      include: {
        jemaat: {
          select: {
            id: true,
            nij: true,
            barcodeCode: true,
            nama: true,
            statusJemaat: true,
          },
        },
      },
    })

    const formatted: AttendanceResultDTO[] = attendances.map((att) => ({
      attendanceId: att.id,
      jemaatId: att.jemaatId,
      nij: att.jemaat?.nij || '-',
      barcodeCode: att.jemaat?.barcodeCode || '-',
      nama: att.jemaat?.nama || 'Jemaat Terdaftar',
      statusJemaat: att.jemaat?.statusJemaat || 'ACTIVE',
      scannedAt: att.scannedAt.toISOString(),
      idempotent: false,
    }))

    return {
      success: true,
      data: formatted,
    }
  } catch (error: any) {
    console.error('Error in getEventAttendanceReportAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat laporan presensi event.',
    }
  }
}

/**
 * Bulk Update Kategori for Events
 */
export async function bulkUpdateKategoriEventAction(data: {
  ids: string[]
  kategori: EventKategori
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'event.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin event.manage.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada event yang dipilih.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.updateMany({
        where: { id: { in: data.ids } },
        data: {
          kategori: data.kategori,
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'UPDATE_BULK_KATEGORI',
        'EVENT',
        `${data.ids.length}_RECORDS`,
        `Mengubah kategori massal (${data.ids.length} event) menjadi [${data.kategori}].`
      )
    })

    revalidatePath('/dashboard/event')

    return {
      success: true,
      message: `Berhasil memperbarui kategori ${data.ids.length} jadwal/event menjadi "${data.kategori}".`,
    }
  } catch (error: any) {
    console.error('Error in bulkUpdateKategoriEventAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui kategori event.' }
  }
}

/**
 * Bulk Update Lokasi for Events
 */
export async function bulkUpdateLokasiEventAction(data: {
  ids: string[]
  lokasi: string
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'event.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin event.manage.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada event yang dipilih.' }
    }

    if (!data.lokasi || !data.lokasi.trim()) {
      return { success: false, error: 'Nama lokasi/ruangan wajib diisi.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.updateMany({
        where: { id: { in: data.ids } },
        data: {
          lokasi: data.lokasi.trim(),
        },
      })

      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'UPDATE_BULK_LOKASI',
        'EVENT',
        `${data.ids.length}_RECORDS`,
        `Mengubah lokasi massal (${data.ids.length} event) menjadi [${data.lokasi.trim()}].`
      )
    })

    revalidatePath('/dashboard/event')

    return {
      success: true,
      message: `Berhasil memperbarui lokasi ${data.ids.length} event menjadi "${data.lokasi.trim()}".`,
    }
  } catch (error: any) {
    console.error('Error in bulkUpdateLokasiEventAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui lokasi event.' }
  }
}

/**
 * Bulk Soft Delete Events
 */
export async function bulkSoftDeleteEventAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'event.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin event.manage.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada event yang dipilih.' }
    }

    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penghapusan massal wajib diisi.' }
    }

    const { ids, reason } = data

    await prisma.$transaction(async (tx) => {
      await tx.event.updateMany({
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
        'EVENT',
        `${ids.length}_RECORDS`,
        `Soft delete massal (${ids.length} event). Alasan: ${reason.trim()}`
      )
    })

    revalidatePath('/dashboard/event')

    return {
      success: true,
      message: `${ids.length} jadwal/event berhasil dipindahkan ke kotak sampah.`,
    }
  } catch (error: any) {
    console.error('Error in bulkSoftDeleteEventAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus event terpilih.' }
  }
}

/**
 * Get Full Event Details for Official A4 Print Agenda
 */
export async function getEventsForPrintAgendaAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada event yang dipilih.', data: [] }
    }

    const items = await prisma.event.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: { attendances: true },
        },
      },
      orderBy: { tanggal: 'asc' },
    })

    const formatted: EventDTO[] = items.map((ev) => mapEventToDTO(ev))

    return {
      success: true,
      data: formatted,
    }
  } catch (error: any) {
    console.error('Error in getEventsForPrintAgendaAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat data lembar agenda event.', data: [] }
  }
}

/**
 * Record Guest (Tamu) Attendance Directly from Scanner Terminal
 * Seamlessly creates Tamu in CRM & records Attendance on the active event
 */
export async function recordGuestAttendanceAction(input: RecordGuestAttendanceInput) {
  try {
    const validated = recordGuestAttendanceSchema.parse(input)
    const { eventId, nama, jenisKelamin, noHp, whatsApp, catatan, isDashboardOverride } = validated

    // 1. Verify Event Exists & Validate Check-in Window
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true, namaEvent: true, tanggal: true, presensiBuka: true, presensiTutup: true },
    })

    if (!event) {
      return { success: false, message: 'Event tidak ditemukan atau sudah ditutup.' }
    }

    const windowCheck = validateCheckInWindow(event, isDashboardOverride)
    if (!windowCheck.isOpen) {
      return { success: false, message: windowCheck.message || 'Presensi telah ditutup resmi.' }
    }

    const eventDateStr = new Date(event.tanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    const guestNotes = `[Hadir di Event: ${event.namaEvent} (${eventDateStr})] ${catatan || ''}`.trim()

    const result = await prisma.$transaction(async (tx) => {
      // 2. Create new Tamu in Jemaat table
      const tamu = await tx.jemaat.create({
        data: {
          nij: null,
          barcodeCode: null,
          nama,
          jenisKelamin,
          noHp: noHp || whatsApp || null,
          whatsApp: whatsApp || noHp || null,
          alamat: null,
          statusJemaat: 'TAMU',
          statusFollowUp: 'NEW',
          tanggalBergabung: new Date(),
          catatan: guestNotes,
          completenessPercentage: 25,
        },
      })

      // 3. Record Attendance for this Tamu
      const attendance = await tx.attendance.create({
        data: {
          eventId: event.id,
          jemaatId: tamu.id,
          scannedAt: new Date(),
          notes: 'Tamu Baru diinput saat Event',
        },
      })

      // 4. Cryptographic Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'GUEST_ATTENDANCE_RECORDED',
        'Attendance',
        attendance.id,
        JSON.stringify({
          tamuId: tamu.id,
          nama: tamu.nama,
          eventId: event.id,
          namaEvent: event.namaEvent,
        }),
        undefined,
        tx
      )

      return { tamu, attendance }
    })

    try {
      revalidatePath(`/scan/${eventId}`)
      revalidatePath(`/dashboard/event/${eventId}`)
      revalidatePath('/dashboard/tamu')
      revalidatePath('/dashboard')
    } catch {}

    return {
      success: true,
      message: `Tamu "${result.tamu.nama}" berhasil dicatat hadir dan masuk ke antrean Follow-Up Tamu.`,
      data: {
        tamuId: result.tamu.id,
        nama: result.tamu.nama,
        whatsApp: result.tamu.whatsApp,
        eventId: event.id,
        namaEvent: event.namaEvent,
      },
    }
  } catch (error: any) {
    console.error('Error in recordGuestAttendanceAction:', error)
    return { success: false, message: error?.message || 'Gagal mencatat tamu baru.' }
  }
}

/**
 * Search Active Jemaat for Manual Attendance Recording (Instant Autocomplete)
 */
export async function searchJemaatForAttendanceAction(query: string) {
  try {
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] }
    }

    const q = query.trim()
    const jemaatList = await prisma.jemaat.findMany({
      where: {
        deletedAt: null,
        OR: [
          { nama: { contains: q, mode: 'insensitive' } },
          { nij: { contains: q, mode: 'insensitive' } },
          { noHp: { contains: q, mode: 'insensitive' } },
          { whatsApp: { contains: q, mode: 'insensitive' } },
          { barcodeCode: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        nij: true,
        barcodeCode: true,
        nama: true,
        statusJemaat: true,
        noHp: true,
        whatsApp: true,
        kategorial: { select: { nama: true } },
      },
      take: 8,
      orderBy: { nama: 'asc' },
    })

    return {
      success: true,
      data: jemaatList.map((j) => ({
        id: j.id,
        nij: j.nij || '-',
        nama: j.nama,
        statusJemaat: j.statusJemaat,
        noHp: j.whatsApp || j.noHp || '-',
        kategorial: j.kategorial?.nama || null,
        barcodeCode: j.barcodeCode || '-',
      })),
    }
  } catch (error: any) {
    console.error('Error in searchJemaatForAttendanceAction:', error)
    return { success: false, error: error?.message || 'Gagal mencari data jemaat.', data: [] }
  }
}

/**
 * Record Attendance by Jemaat ID Directly (From Manual Search Selection)
 */
export async function recordAttendanceByIdAction(input: RecordAttendanceByIdInput) {
  try {
    const validated = recordAttendanceByIdSchema.parse(input)
    const { eventId, jemaatId, notes, isDashboardOverride } = validated

    // 1. Verify Event Exists & Validate Check-in Window
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true, namaEvent: true, presensiBuka: true, presensiTutup: true },
    })

    if (!event) {
      return { success: false, message: 'Event tidak ditemukan atau sudah ditutup.' }
    }

    const windowCheck = validateCheckInWindow(event, isDashboardOverride)
    if (!windowCheck.isOpen) {
      return { success: false, message: windowCheck.message || 'Presensi telah ditutup resmi.' }
    }

    // 2. Verify Jemaat Exists
    const jemaat = await prisma.jemaat.findFirst({
      where: { id: jemaatId, deletedAt: null },
      select: { id: true, nama: true, nij: true, statusJemaat: true, barcodeCode: true },
    })

    if (!jemaat) {
      return { success: false, message: 'Data jemaat tidak ditemukan.' }
    }

    // 3. Check for existing attendance (Idempotent)
    const existing = await prisma.attendance.findUnique({
      where: {
        eventId_jemaatId: { eventId, jemaatId },
      },
    })

    if (existing) {
      return {
        success: true,
        idempotent: true,
        message: `${jemaat.nama} sudah tercatat hadir sebelumnya.`,
        data: {
          attendanceId: existing.id,
          jemaatId: jemaat.id,
          nij: jemaat.nij || '-',
          barcodeCode: jemaat.barcodeCode || '-',
          nama: jemaat.nama,
          statusJemaat: jemaat.statusJemaat,
          scannedAt: existing.scannedAt.toISOString(),
          idempotent: true,
        },
      }
    }

    // 4. Create Attendance
    const newAtt = await prisma.attendance.create({
      data: {
        eventId,
        jemaatId,
        scannedAt: new Date(),
        notes: notes || 'Input Manual Search',
      },
    })

    // 5. Audit Log
    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ATTENDANCE_RECORDED_MANUAL',
      'Attendance',
      newAtt.id,
      JSON.stringify({
        eventId,
        namaEvent: event.namaEvent,
        jemaatId: jemaat.id,
        nama: jemaat.nama,
      })
    )

    try {
      revalidatePath(`/scan/${eventId}`)
      revalidatePath(`/dashboard/event/${eventId}`)
      revalidatePath('/dashboard')
    } catch {}

    return {
      success: true,
      idempotent: false,
      message: `Presensi ${jemaat.nama} berhasil dicatat.`,
      data: {
        attendanceId: newAtt.id,
        jemaatId: jemaat.id,
        nij: jemaat.nij || '-',
        barcodeCode: jemaat.barcodeCode || '-',
        nama: jemaat.nama,
        statusJemaat: jemaat.statusJemaat,
        scannedAt: newAtt.scannedAt.toISOString(),
        idempotent: false,
      },
    }
  } catch (error: any) {
    console.error('Error in recordAttendanceByIdAction:', error)
    return { success: false, message: error?.message || 'Gagal mencatat presensi jemaat.' }
  }
}

/**
 * Update Usher Physical Headcount Counting for Event
 */
export async function updateEventHeadcountAction(input: UpdateEventHeadcountInput) {
  try {
    const validated = updateEventHeadcountSchema.parse(input)
    const { eventId, manualHeadcount, isDashboardOverride } = validated

    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true, namaEvent: true, presensiBuka: true, presensiTutup: true },
    })

    if (!event) {
      return { success: false, message: 'Event tidak ditemukan.' }
    }

    const windowCheck = validateCheckInWindow(event, isDashboardOverride)
    if (!windowCheck.isOpen) {
      return { success: false, message: windowCheck.message || 'Jendela presensi telah ditutup resmi.' }
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        manualHeadcount,
      },
    })

    // Audit Log
    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'EVENT_HEADCOUNT_UPDATED',
      'Event',
      eventId,
      JSON.stringify({
        eventId,
        manualHeadcount,
      })
    )

    try {
      revalidatePath(`/scan/${eventId}`)
      revalidatePath(`/dashboard/event/${eventId}`)
      revalidatePath('/dashboard/event')
    } catch {}

    return {
      success: true,
      message: `Jumlah headcount fisik (${manualHeadcount} orang) berhasil disimpan.`,
      data: {
        eventId: updated.id,
        manualHeadcount: (updated as any).manualHeadcount || 0,
      },
    }
  } catch (error: any) {
    console.error('Error in updateEventHeadcountAction:', error)
    return { success: false, message: error?.message || 'Gagal memperbarui jumlah headcount.' }
  }
}

/**
 * Upload Local Poster / Banner Image for Event
 */
export async function uploadEventThumbnailAction(formData: FormData) {
  try {
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File)) {
      return { success: false, error: 'Berkas gambar poster wajib disertakan.' }
    }

    const storage = getStorageProvider('public/uploads/events')
    const result = await storage.upload(file)

    return {
      success: true,
      data: {
        fileUrl: result.fileUrl,
        identifier: result.identifier,
      },
      message: 'Poster event berhasil diunggah!',
    }
  } catch (error: any) {
    console.error('Error in uploadEventThumbnailAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengunggah berkas poster lokal.',
    }
  }
}

/**
 * Public: Get Active Events with Thumbnails for Homepage Event Banner Carousel
 */
export async function getPublicActiveEventsAction(limit: number = 6) {
  try {
    const events = await prisma.event.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ tanggalMulai: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        namaEvent: true,
        kategori: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        namaLokasi: true,
        lokasi: true,
        thumbnailUrl: true,
        deskripsi: true,
      },
    })

    return {
      success: true,
      data: events.map((ev) => ({
        id: ev.id,
        namaEvent: ev.namaEvent,
        kategori: ev.kategori,
        tanggalMulai: ev.tanggalMulai.toISOString(),
        tanggalSelesai: ev.tanggalSelesai ? ev.tanggalSelesai.toISOString() : null,
        namaLokasi: ev.namaLokasi || ev.lokasi,
        thumbnailUrl: ev.thumbnailUrl,
        deskripsi: ev.deskripsi || '',
      })),
    }
  } catch (error: any) {
    console.error('Error in getPublicActiveEventsAction:', error)
    return { success: false, data: [], error: 'Gagal memuat banner event.' }
  }
}
