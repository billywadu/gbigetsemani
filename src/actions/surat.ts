'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  SuratResmiFormSchema,
  SuratResmiFormValues,
  KategoriSuratType,
  generateAutoNomorSurat,
} from '@/lib/validations/surat'
import { getCurrentStaffSession } from '@/lib/security/session'
import { hasPermission } from '@/lib/permissions'
import { createCryptographicAuditLog } from '@/lib/security/audit'

export interface SuratFilterParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  kategori?: string
  includeDeleted?: boolean
}

/**
 * Basic XSS & control character sanitation for text inputs
 */
function sanitizeText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}

/**
 * Get Paginated List of Saved & Archived Letters
 */
export async function getSuratListAction(params?: SuratFilterParams) {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !session.user) {
      return {
        success: false,
        error: 'Sesi berakhir atau tidak valid. Silakan login kembali.',
        data: [],
        meta: { total: 0, page: 1, pageSize: 10, totalPages: 1 },
      }
    }

    const role = session.user.role as any
    const canRead = hasPermission(role, 'document.read') || hasPermission(role, 'archive.read')
    if (!canRead) {
      return {
        success: false,
        error: 'Akses ditolak: Anda tidak memiliki izin untuk melihat arsip surat.',
        data: [],
        meta: { total: 0, page: 1, pageSize: 10, totalPages: 1 },
      }
    }

    const page = Math.max(1, params?.page || 1)
    const pageSize = Math.min(100, Math.max(1, params?.pageSize || 10))
    const skip = (page - 1) * pageSize

    const where: any = {}

    if (params?.includeDeleted) {
      where.deletedAt = { not: null }
    } else {
      where.deletedAt = null
    }

    if (params?.status && params.status !== 'ALL') {
      where.status = params.status
    }

    if (params?.kategori && params.kategori !== 'ALL') {
      where.kategori = params.kategori
    }

    if (params?.search && params.search.trim()) {
      const q = sanitizeText(params.search)
      where.OR = [
        { nomorSurat: { contains: q, mode: 'insensitive' } },
        { perihal: { contains: q, mode: 'insensitive' } },
        { tujuanKepada: { contains: q, mode: 'insensitive' } },
        { subJudul: { contains: q, mode: 'insensitive' } },
        { paragrafPembuka: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [total, items] = await Promise.all([
      prisma.suratResmi.count({ where }),
      prisma.suratResmi.findMany({
        where,
        orderBy: [{ tanggalSurat: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
    ])

    return {
      success: true,
      data: items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    }
  } catch (error: any) {
    console.error('[getSuratListAction] Error:', error)
    return {
      success: false,
      error: error.message || 'Gagal memuat daftar arsip surat.',
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 1 },
    }
  }
}

/**
 * Get Detail Letter by ID
 */
export async function getSuratDetailAction(id: string) {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !session.user) {
      return { success: false, error: 'Sesi berakhir atau tidak valid.' }
    }

    const role = session.user.role as any
    const canRead = hasPermission(role, 'document.read') || hasPermission(role, 'archive.read')
    if (!canRead) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin untuk melihat detail surat.' }
    }

    const surat = await prisma.suratResmi.findUnique({
      where: { id },
    })

    if (!surat) {
      return { success: false, error: 'Surat resmi tidak ditemukan.' }
    }

    return { success: true, data: surat }
  } catch (error: any) {
    console.error('[getSuratDetailAction] Error:', error)
    return { success: false, error: error.message || 'Gagal memuat surat.' }
  }
}

/**
 * Save or Update Official Church Letter (Draft or Published)
 */
export async function saveSuratResmiAction(values: SuratResmiFormValues) {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !session.user) {
      return { success: false, error: 'Sesi berakhir atau tidak valid. Silakan login kembali.' }
    }

    const role = session.user.role as any
    const isEdit = Boolean(values.id)
    const requiredPermission = isEdit ? 'document.update' : 'document.upload'

    if (!hasPermission(role, requiredPermission)) {
      return {
        success: false,
        error: `Akses ditolak: Peran Anda (${role}) tidak memiliki izin '${requiredPermission}'.`,
      }
    }

    const parsed = SuratResmiFormSchema.safeParse(values)
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || 'Data tidak valid'
      return { success: false, error: firstErr }
    }

    const data = parsed.data

    // IDOR Protection: Check existence and deletion status if updating
    if (isEdit && data.id) {
      const existing = await prisma.suratResmi.findUnique({
        where: { id: data.id },
      })
      if (!existing) {
        return { success: false, error: 'Surat yang akan diedit tidak ditemukan di basis data.' }
      }
      if (existing.deletedAt) {
        return { success: false, error: 'Surat ini telah dihapus dan tidak dapat diperbarui.' }
      }
    }

    // Sanitize text fields
    const sanitizedPoinIsi = Array.isArray(data.poinIsi)
      ? data.poinIsi.map((p) => ({
          id: p.id,
          text: sanitizeText(p.text),
          isBold: Boolean(p.isBold),
        }))
      : []

    const sanitizedSignatories = Array.isArray(data.signatories)
      ? data.signatories.map((s) => ({
          roleKey: s.roleKey,
          jabatan: sanitizeText(s.jabatan),
          nama: sanitizeText(s.nama),
          gelar: sanitizeText(s.gelar),
          nomorInduk: sanitizeText(s.nomorInduk),
          ttdUrl: s.ttdUrl || null,
        }))
      : []

    const payload = {
      nomorSurat: sanitizeText(data.nomorSurat),
      perihal: sanitizeText(data.perihal),
      lampiran: sanitizeText(data.lampiran) || '-',
      tanggalSurat: new Date(data.tanggalSurat),
      tempatSurat: sanitizeText(data.tempatSurat) || 'Jakarta',
      kategori: data.kategori,
      status: data.status,

      tujuanKepada: sanitizeText(data.tujuanKepada),
      tujuanDi: sanitizeText(data.tujuanDi) || 'Di Tempat',

      salamPembuka: sanitizeText(data.salamPembuka),
      paragrafPembuka: sanitizeText(data.paragrafPembuka),
      subJudul: sanitizeText(data.subJudul) || null,
      poinIsi: sanitizedPoinIsi,
      paragrafPenutup: sanitizeText(data.paragrafPenutup),

      modeLogo: data.modeLogo,
      logoKiriUrl: data.logoKiriUrl || null,
      logoKananUrl: data.logoKananUrl || null,
      kopNama: sanitizeText(data.kopNama),
      kopSub: sanitizeText(data.kopSub) || null,
      kopBadanHukum: sanitizeText(data.kopBadanHukum) || null,
      kopAlamat: sanitizeText(data.kopAlamat) || null,
      kopKontak: sanitizeText(data.kopKontak) || null,
      garisKopStyle: data.garisKopStyle,
      garisKopColor: data.garisKopColor || '#0f172a',

      salamPenutup: sanitizeText(data.salamPenutup),
      namaInstansiTtd: sanitizeText(data.namaInstansiTtd) || null,
      formatTtd: data.formatTtd,
      signatories: sanitizedSignatories,
      tampilkanStempel: data.tampilkanStempel,
      stempelUrl: data.stempelUrl || null,
      posisiStempel: data.posisiStempel,

      adaLampiran: data.adaLampiran,
      judulLampiran: sanitizeText(data.judulLampiran) || null,
      isiLampiran: sanitizeText(data.isiLampiran) || null,
      gambarLampiranUrl: data.gambarLampiranUrl || null,
    }

    let savedSurat: any

    if (isEdit && data.id) {
      savedSurat = await prisma.suratResmi.update({
        where: { id: data.id },
        data: payload,
      })

      // Cryptographic Audit Trail
      await createCryptographicAuditLog(
        session.user.nama || session.user.username || 'Staff',
        'UPDATE_SURAT_RESMI',
        'SuratResmi',
        savedSurat.id,
        {
          nomorSurat: savedSurat.nomorSurat,
          perihal: savedSurat.perihal,
          status: savedSurat.status,
          kategori: savedSurat.kategori,
        },
        session.user.id
      ).catch((e) => console.error('[saveSuratResmiAction] Audit log warning:', e))
    } else {
      savedSurat = await prisma.suratResmi.create({
        data: payload,
      })

      // Cryptographic Audit Trail
      await createCryptographicAuditLog(
        session.user.nama || session.user.username || 'Staff',
        'CREATE_SURAT_RESMI',
        'SuratResmi',
        savedSurat.id,
        {
          nomorSurat: savedSurat.nomorSurat,
          perihal: savedSurat.perihal,
          status: savedSurat.status,
          kategori: savedSurat.kategori,
        },
        session.user.id
      ).catch((e) => console.error('[saveSuratResmiAction] Audit log warning:', e))
    }

    revalidatePath('/dashboard/surat')

    return {
      success: true,
      data: savedSurat,
      message: isEdit
        ? 'Surat resmi berhasil diperbarui.'
        : data.status === 'DRAFT'
        ? 'Draf surat berhasil disimpan ke arsip.'
        : 'Surat resmi berhasil diterbitkan dan diarsipkan.',
    }
  } catch (error: any) {
    console.error('[saveSuratResmiAction] Error:', error)
    return {
      success: false,
      error: error.message || 'Gagal menyimpan surat resmi.',
    }
  }
}

/**
 * Soft Delete Letter
 */
export async function deleteSuratResmiAction(id: string, reason?: string) {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !session.user) {
      return { success: false, error: 'Sesi berakhir atau tidak valid. Silakan login kembali.' }
    }

    const role = session.user.role as any
    if (!hasPermission(role, 'document.delete')) {
      return {
        success: false,
        error: `Akses ditolak: Peran Anda (${role}) tidak memiliki izin 'document.delete'.`,
      }
    }

    const existing = await prisma.suratResmi.findUnique({
      where: { id },
    })

    if (!existing) {
      return { success: false, error: 'Surat resmi tidak ditemukan.' }
    }

    if (existing.deletedAt) {
      return { success: false, error: 'Surat ini sudah berada di tempat sampah.' }
    }

    const updated = await prisma.suratResmi.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletionReason: sanitizeText(reason) || 'Dihapus oleh pengguna',
      },
    })

    // Cryptographic Audit Trail
    await createCryptographicAuditLog(
      session.user.nama || session.user.username || 'Staff',
      'DELETE_SURAT_RESMI',
      'SuratResmi',
      updated.id,
      {
        nomorSurat: updated.nomorSurat,
        perihal: updated.perihal,
        deletionReason: updated.deletionReason,
      },
      session.user.id
    ).catch((e) => console.error('[deleteSuratResmiAction] Audit log warning:', e))

    revalidatePath('/dashboard/surat')
    return { success: true, message: 'Surat berhasil dipindahkan ke sampah.' }
  } catch (error: any) {
    console.error('[deleteSuratResmiAction] Error:', error)
    return { success: false, error: error.message || 'Gagal menghapus surat.' }
  }
}

/**
 * Generate Next Sequential Letter Number
 */
export async function getNextNomorSuratAction(kategori: KategoriSuratType) {
  try {
    const currentYear = new Date().getFullYear()
    const startOfYear = new Date(currentYear, 0, 1)
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)

    const count = await prisma.suratResmi.count({
      where: {
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
    })

    const nextNumber = generateAutoNomorSurat(kategori, count + 1)
    return { success: true, data: nextNumber }
  } catch (error: any) {
    console.error('[getNextNomorSuratAction] Error:', error)
    return {
      success: true,
      data: generateAutoNomorSurat(kategori, 1),
    }
  }
}
