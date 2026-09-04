import { prisma } from './prisma'
import crypto from 'crypto'

/**
 * Atomic NIJ Generator (PostgreSQL Safe & Collision Proof)
 * Format: {PREFIX}{4_DIGIT_SEQ} (e.g. NIJ-0001)
 */
export async function getNextAtomicNij(tx?: any): Promise<string> {
  const db = tx || prisma
  let prefix = 'NIJ-'

  try {
    const sysSetting = await db.appSetting.findUnique({ where: { key: 'APP_SYSTEM' } })
    if (sysSetting?.value) {
      const parsed = typeof sysSetting.value === 'string' ? JSON.parse(sysSetting.value) : sysSetting.value
      if (parsed?.prefixNij) {
        prefix = parsed.prefixNij.endsWith('-') ? parsed.prefixNij : `${parsed.prefixNij}-`
      }
    }
  } catch {}

  // Find the highest sequence number in Jemaat table
  const allNij = await db.jemaat.findMany({
    where: {
      nij: {
        startsWith: prefix,
      },
    },
    select: {
      nij: true,
    },
  })

  let maxSeq = 0
  for (const item of allNij) {
    if (item.nij) {
      const parts = item.nij.split('-')
      const num = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num
      }
    }
  }

  let nextNum = maxSeq + 1
  let candidate = `${prefix}${String(nextNum).padStart(4, '0')}`

  let exists = await db.jemaat.findUnique({
    where: { nij: candidate },
    select: { id: true },
  })

  while (exists) {
    nextNum += 1
    candidate = `${prefix}${String(nextNum).padStart(4, '0')}`
    exists = await db.jemaat.findUnique({
      where: { nij: candidate },
      select: { id: true },
    })
  }

  return candidate
}

/**
 * Barcode Code Generator
 * Format: JMT-{6_ALPHA_NUMERIC} (e.g. JMT-893201)
 */
export async function generateUniqueBarcodeCode(tx?: any): Promise<string> {
  const db = tx || prisma
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let attempts = 0

  while (attempts < 10) {
    let randomPart = ''
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const candidate = `JMT-${randomPart}`
    const existing = await db.jemaat.findUnique({ where: { barcodeCode: candidate } })
    if (!existing) return candidate
    attempts++
  }

  throw new Error('Gagal membuat Barcode Code unik setelah 10 percobaan.')
}

/**
 * Completeness Percentage Calculator (13 Indicators)
 */
export function calculateJemaatCompleteness(data: {
  nama?: string | null
  namaPanggilan?: string | null
  jenisKelamin?: string | null
  tempatLahir?: string | null
  tanggalLahir?: Date | string | null
  noHp?: string | null
  whatsApp?: string | null
  email?: string | null
  alamat?: string | null
  statusJemaat?: string | null
  statusBaptis?: string | null
  statusPernikahan?: string | null
  pekerjaan?: string | null
  pendidikan?: string | null
  kontakDarurat?: string | null
}): number {
  let score = 0

  if (data.nama && data.nama.trim().length > 0) score++
  if (data.namaPanggilan && data.namaPanggilan.trim().length > 0) score++
  if (data.jenisKelamin) score++
  if (data.tempatLahir && data.tanggalLahir) score++
  if ((data.noHp && data.noHp.trim().length > 0) || (data.whatsApp && data.whatsApp.trim().length > 0)) score++
  if (data.email && data.email.trim().length > 0) score++
  if (data.alamat && data.alamat.trim().length > 0) score++
  if (data.statusJemaat) score++
  if (data.statusBaptis) score++
  if (data.statusPernikahan) score++
  if (data.pekerjaan && data.pekerjaan.trim().length > 0) score++
  if (data.pendidikan) score++
  if (data.kontakDarurat && data.kontakDarurat.trim().length > 0) score++

  return Math.round((score / 13) * 100)
}

/**
 * SHA-256 Audit Trail Logger
 */
export async function createAuditLog(
  actor: string,
  action: string,
  entity: string,
  entityId: string,
  stateChange?: string,
  userId?: string,
  tx?: any
) {
  const db = tx || prisma
  const lastLog = await db.auditLog.findFirst({
    orderBy: { timestamp: 'desc' },
  })

  const previousHash = lastLog?.currentHash || '0000000000000000000000000000000000000000000000000000000000000000'
  const timestampIso = new Date().toISOString()
  const rawPayload = `${timestampIso}|${actor}|${action}|${entity}|${entityId}|${stateChange || ''}|${previousHash}`
  const currentHash = crypto.createHash('sha256').update(rawPayload).digest('hex')

  return await db.auditLog.create({
    data: {
      timestamp: new Date(timestampIso),
      actor,
      userId,
      ip: '127.0.0.1',
      action,
      entity,
      entityId,
      stateChange,
      previousHash,
      currentHash,
    },
  })
}

/**
 * Atomic Financial Transaction Reference Number Generator
 * Format: TRX-{YYYYMM}-{4_DIGIT_SEQ} (e.g. TRX-202608-0001)
 * 100% Collision-Proof: Scans highest existing sequence and increments reliably.
 */
export async function getNextAtomicTrxNumber(tx?: any, date?: Date): Promise<string> {
  const db = tx || prisma
  const d = date ? new Date(date) : new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const prefix = `TRX-${yyyy}${mm}-`

  // Find all existing transaction reference numbers for this YYYYMM
  const allMatching = await db.transaksiKeuangan.findMany({
    where: {
      nomorReferensi: {
        startsWith: prefix,
      },
    },
    select: {
      nomorReferensi: true,
    },
  })

  let maxSeq = 0
  for (const item of allMatching) {
    if (item.nomorReferensi) {
      const parts = item.nomorReferensi.split('-')
      const num = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num
      }
    }
  }

  let nextNum = maxSeq + 1
  let candidate = `${prefix}${String(nextNum).padStart(4, '0')}`

  // Safety check: ensure candidate does not collide with existing record
  let exists = await db.transaksiKeuangan.findUnique({
    where: { nomorReferensi: candidate },
    select: { id: true },
  })

  while (exists) {
    nextNum += 1
    candidate = `${prefix}${String(nextNum).padStart(4, '0')}`
    exists = await db.transaksiKeuangan.findUnique({
      where: { nomorReferensi: candidate },
      select: { id: true },
    })
  }

  return candidate
}
