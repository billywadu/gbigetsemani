'use server'

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { ArtikelDTO as MateriRenunganDTO } from './artikel'
import {
  verifyDokumenAccessSchema,
  VerifyDokumenAccessInput,
  PublicDokumenItemDTO,
  VerifyDokumenAccessResultDTO,
} from '@/lib/validations/publik'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { generateDocAccessToken, verifyDocAccessToken } from '@/lib/public-doc-tokens'

export type PublicVerificationDTO = {
  nama: string
  nij: string
  statusJemaat: string
  kategoriNama: string
  verifiedAt: string
}

// In-memory rate limiting store (IP -> { count, resetAt })
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

/**
 * Helper to check rate limit (20 requests per 60 seconds per IP)
 */
function checkRateLimit(clientIp: string, maxRequests = 20, windowMs = 60000): boolean {
  const now = Date.now()
  const current = rateLimitMap.get(clientIp)

  if (!current || now > current.resetAt) {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (current.count >= maxRequests) {
    return false // Rate limit exceeded
  }

  current.count++
  return true
}

/**
 * Public Membership Verification Action
 * STRICT PRIVACY RULE: Exact Match Only on NIJ or Barcode
 * NO WILDCARDS, NO LIKE, NO NAME SEARCH, NO ENUMERATION
 */
export async function getProfilPublikAction(query: string, clientIp = '127.0.0.1') {
  try {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return {
        success: false,
        error: 'Nomor Induk Jemaat (NIJ) atau Kode Barcode wajib diisi.',
      }
    }

    // 1. Rate Limit Enforcement
    const isAllowed = checkRateLimit(clientIp, 20, 60000)
    if (!isAllowed) {
      return {
        success: false,
        rateLimited: true,
        error: 'Terlalu banyak permintaan verifikasi. Silakan coba kembali dalam 1 menit.',
      }
    }

    const exactCode = query.trim().toUpperCase()

    // Strict format check: Must be clean alphanumeric + hyphen, no wildcards or SQL characters
    if (!/^[A-Z0-9-]+$/.test(exactCode) || exactCode.length < 5 || exactCode.length > 50) {
      return {
        success: false,
        notFound: true,
        error: 'Format NIJ atau Barcode tidak valid. Pastikan Anda memasukkan kode resmi yang lengkap.',
      }
    }

    // 2. Strict Exact Match in Database (excluding TAMU and soft-deleted)
    const jemaat = await prisma.jemaat.findFirst({
      where: {
        deletedAt: null,
        statusJemaat: { not: 'TAMU' },
        OR: [
          { nij: exactCode },
          { barcodeCode: exactCode },
        ],
      },
      select: {
        nama: true,
        nij: true,
        statusJemaat: true,
        kategorial: { select: { nama: true } },
        createdAt: true,
      },
    })

    if (!jemaat) {
      return {
        success: false,
        notFound: true,
        error: 'Data keanggotaan tidak ditemukan. Pastikan NIJ atau kode barcode yang Anda masukkan sudah benar.',
      }
    }

    // 3. Return MINIMAL PublicVerificationDTO (NO PII, NO PHONE, NO ADDRESS, NO EMAIL)
    const data: PublicVerificationDTO = {
      nama: jemaat.nama,
      nij: jemaat.nij || '',
      statusJemaat: jemaat.statusJemaat,
      kategoriNama: jemaat.kategorial?.nama || 'Umum',
      verifiedAt: new Date().toISOString(),
    }

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    console.error('Error in getProfilPublikAction:', error)
    return {
      success: false,
      error: 'Terjadi kesalahan pada server saat memverifikasi keanggotaan.',
    }
  }
}

/**
 * Public Action: Get Latest Published Materials for Homepage Grid
 */
export async function getPublicHomepageMateriAction(limit = 3) {
  try {
    const items = await prisma.artikel.findMany({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
      },
      take: limit,
      orderBy: { tanggal: 'desc' },
      include: {
        kategori: {
          select: { id: true, nama: true, slug: true },
        },
      },
    })

    const formatted: MateriRenunganDTO[] = items.map((m) => ({
      id: m.id,
      judul: m.judul,
      slug: m.slug,
      kategoriId: m.kategoriId,
      kategoriNama: m.kategori?.nama || 'Artikel',
      kategoriSlug: m.kategori?.slug || 'artikel',
      penulis: m.penulis,
      tanggal: m.tanggal.toISOString(),
      status: m.status,
      thumbnailUrl: m.thumbnailUrl,
      ringkasan: m.ringkasan,
      konten: m.konten,
      totalDilihat: m.totalDilihat,
      deletedAt: null,
      createdAt: m.createdAt.toISOString(),
    }))

    return {
      success: true,
      data: formatted,
    }
  } catch (error: any) {
    console.error('Error in getPublicHomepageMateriAction:', error)
    return {
      success: false,
      data: [],
      error: 'Gagal memuat artikel beranda.',
    }
  }
}

// In-memory rate limiting store for document security challenge (5 attempts per 5 minutes per IP)
const docSecurityRateLimitMap = new Map<string, { attempts: number; blockUntil: number }>()

function checkDocSecurityRateLimit(clientIp: string): { allowed: boolean; remainingAttempts: number; waitMinutes?: number } {
  const now = Date.now()
  const record = docSecurityRateLimitMap.get(clientIp)

  if (record && record.blockUntil > now) {
    const waitMinutes = Math.ceil((record.blockUntil - now) / 60000)
    return { allowed: false, remainingAttempts: 0, waitMinutes }
  }

  if (!record || (record.blockUntil > 0 && record.blockUntil <= now)) {
    docSecurityRateLimitMap.set(clientIp, { attempts: 0, blockUntil: 0 })
    return { allowed: true, remainingAttempts: 5 }
  }

  if (record.attempts >= 5) {
    record.blockUntil = now + 5 * 60 * 1000 // Block for 5 minutes
    return { allowed: false, remainingAttempts: 0, waitMinutes: 5 }
  }

  return { allowed: true, remainingAttempts: 5 - record.attempts }
}

function recordDocSecurityFailure(clientIp: string) {
  const record = docSecurityRateLimitMap.get(clientIp) || { attempts: 0, blockUntil: 0 }
  record.attempts += 1
  if (record.attempts >= 5) {
    record.blockUntil = Date.now() + 5 * 60 * 1000
  }
  docSecurityRateLimitMap.set(clientIp, record)
}

function resetDocSecurityLimit(clientIp: string) {
  docSecurityRateLimitMap.delete(clientIp)
}

/**
 * Public Action: Verify Security Gate and Retrieve Verified Member Documents
 * Requires matching NIJ + Secondary Security Verification (Tanggal Lahir or Last 4 Digits of Phone)
 */
export async function verifyDokumenAccessAction(input: VerifyDokumenAccessInput, clientIp = '127.0.0.1') {
  try {
    const validated = verifyDokumenAccessSchema.parse(input)
    const { nij, verificationMethod, tanggalLahir, last4Hp } = validated

    // 1. Rate Limit Enforcement
    const rateCheck = checkDocSecurityRateLimit(clientIp)
    if (!rateCheck.allowed) {
      return {
        success: false,
        rateLimited: true,
        error: `Terlalu banyak percobaan verifikasi yang gagal. Akses dokumen sementara dikunci. Silakan coba kembali dalam ${rateCheck.waitMinutes} menit.`,
      }
    }

    // 2. Query Jemaat by NIJ or Barcode
    const jemaat = await prisma.jemaat.findFirst({
      where: {
        deletedAt: null,
        statusJemaat: { not: 'TAMU' },
        OR: [
          { nij },
          { barcodeCode: nij },
        ],
      },
      select: {
        id: true,
        nama: true,
        nij: true,
        barcodeCode: true,
        tanggalLahir: true,
        noHp: true,
        whatsApp: true,
      },
    })

    if (!jemaat) {
      recordDocSecurityFailure(clientIp)
      return {
        success: false,
        error: 'Data jemaat tidak ditemukan. Pastikan NIJ yang Anda masukkan benar.',
      }
    }

    // 3. Validate Secondary Challenge (Tanggal Lahir or Last 4 digits of phone)
    let isMatched = false

    if (verificationMethod === 'TANGGAL_LAHIR') {
      if (!tanggalLahir || !tanggalLahir.trim()) {
        return { success: false, error: 'Silakan masukkan tanggal lahir Anda (format DD/MM/YYYY atau YYYY-MM-DD).' }
      }

      if (!jemaat.tanggalLahir) {
        return {
          success: false,
          error: 'Tanggal lahir belum terdata di sekretariat. Silakan gunakan metode verifikasi 4 Digit Nomor HP atau hubungi Sekretariat Gereja.',
        }
      }

      // Normalize user input date to YYYY-MM-DD
      let normalizedInput = tanggalLahir.trim()
      if (normalizedInput.includes('/')) {
        const parts = normalizedInput.split('/')
        if (parts.length === 3) {
          // DD/MM/YYYY -> YYYY-MM-DD
          normalizedInput = `${parts[2].padStart(4, '20')}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
      }

      const dbBirthDate = new Date(jemaat.tanggalLahir)
      const utcDateStr = dbBirthDate.toISOString().split('T')[0]
      const y = dbBirthDate.getFullYear()
      const m = String(dbBirthDate.getMonth() + 1).padStart(2, '0')
      const d = String(dbBirthDate.getDate()).padStart(2, '0')
      const localDateStr = `${y}-${m}-${d}`

      isMatched = normalizedInput === utcDateStr || normalizedInput === localDateStr
    } else if (verificationMethod === 'LAST_4_HP') {
      if (!last4Hp || last4Hp.length !== 4) {
        return { success: false, error: 'Silakan masukkan 4 digit terakhir nomor HP / WhatsApp yang terdaftar.' }
      }

      const cleanPhone = (jemaat.noHp || '').replace(/\D/g, '')
      const cleanWa = (jemaat.whatsApp || '').replace(/\D/g, '')

      isMatched = cleanPhone.endsWith(last4Hp) || cleanWa.endsWith(last4Hp)
    }

    if (!isMatched) {
      recordDocSecurityFailure(clientIp)
      const updatedRate = checkDocSecurityRateLimit(clientIp)
      return {
        success: false,
        error: `Data verifikasi tidak cocok. Sisa percobaan: ${updatedRate.remainingAttempts}. Demi keamanan data Anda, pastikan data yang dimasukkan sesuai dengan data sekretariat.`,
      }
    }

    // Success! Reset security failure rate limit
    resetDocSecurityLimit(clientIp)

    // 4. Retrieve only VERIFIED and NON-DELETED documents
    const documents = await prisma.dokumenJemaat.findMany({
      where: {
        jemaatId: jemaat.id,
        status: 'VERIFIED',
        deletedAt: null,
      },
      orderBy: { tanggalTerbit: 'desc' },
      select: {
        id: true,
        judul: true,
        jenisDokumen: true,
        tanggalTerbit: true,
        mimeType: true,
        fileSize: true,
        fileUrl: true,
      },
    })

    const expiresAt = Date.now() + 60 * 60 * 1000 // 1 hour token validity

    const dokumenList: PublicDokumenItemDTO[] = documents.map((d) => ({
      id: d.id,
      judul: d.judul,
      jenisDokumen: d.jenisDokumen,
      tanggalTerbit: d.tanggalTerbit.toISOString(),
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      fileUrl: d.fileUrl,
      downloadToken: generateDocAccessToken(d.id, jemaat.id, expiresAt),
    }))

    // Log security unlock event
    await createAuditLog(
      `Jemaat Mandiri (${jemaat.nama})`,
      'DOKUMEN_MANDIRI_UNLOCKED',
      'Jemaat',
      jemaat.id,
      JSON.stringify({
        nij: jemaat.nij,
        totalDokumen: documents.length,
        method: verificationMethod,
        ip: clientIp,
      })
    )

    const result: VerifyDokumenAccessResultDTO = {
      jemaatNama: jemaat.nama,
      nij: jemaat.nij || '',
      totalDokumen: dokumenList.length,
      dokumenList,
      unlockedAt: new Date().toISOString(),
    }

    return {
      success: true,
      data: result,
      message: `Akses dokumen berhasil dibuka! Ditemukan ${dokumenList.length} dokumen resmi terverifikasi.`,
    }
  } catch (error: any) {
    console.error('Error in verifyDokumenAccessAction:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan sistem saat memverifikasi akses dokumen.',
    }
  }
}

/**
 * Public Action: Log Document Download Event for Security Audit
 */
export async function logDokumenDownloadAction(token: string, clientIp = '127.0.0.1') {
  try {
    const verified = verifyDocAccessToken(token)
    if (!verified.valid || !verified.dokumenId || !verified.jemaatId) {
      return { success: false, error: 'Token unduhan tidak valid atau sudah kedaluwarsa.' }
    }

    const doc = await prisma.dokumenJemaat.findUnique({
      where: { id: verified.dokumenId },
      include: { jemaat: { select: { nama: true, nij: true } } },
    })

    if (!doc) {
      return { success: false, error: 'Dokumen tidak ditemukan.' }
    }

    await createAuditLog(
      `Jemaat Mandiri (${doc.jemaat?.nama || 'Publik'})`,
      'DOKUMEN_MANDIRI_DOWNLOADED',
      'DokumenJemaat',
      doc.id,
      JSON.stringify({
        judul: doc.judul,
        jenisDokumen: doc.jenisDokumen,
        jemaatNij: doc.jemaat?.nij,
        ip: clientIp,
      })
    )

    return { success: true }
  } catch (error: any) {
    console.error('Error in logDokumenDownloadAction:', error)
    return { success: false, error: 'Gagal mencatat log unduhan.' }
  }
}
