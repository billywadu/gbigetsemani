import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

/**
 * Recursively Redact Secrets from Payload
 */
export function redactSecrets(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(redactSecrets)
  }

  const redacted: Record<string, any> = {}
  const secretKeys = ['password', 'passwordhash', 'token', 'secret', 'apikey', 'refreshtoken', 'cookie']

  for (const [key, value] of Object.entries(obj)) {
    if (secretKeys.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED_SECRET]'
    } else if (value && typeof value === 'object') {
      redacted[key] = redactSecrets(value)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Deterministic Canonical JSON Stringify (Sorted Keys)
 */
export function canonicalizeJson(data: any): string {
  if (data === undefined || data === null) return ''
  const cleanData = redactSecrets(data)
  if (typeof cleanData !== 'object') return String(cleanData)

  const keys = Object.keys(cleanData).sort()
  const sortedObj: Record<string, any> = {}
  for (const k of keys) {
    sortedObj[k] = cleanData[k]
  }
  return JSON.stringify(sortedObj)
}

/**
 * Compute SHA-256 Hash for Audit Log Record
 */
export function calculateAuditHash(params: {
  timestampIso: string
  actor: string
  action: string
  entity: string
  entityId: string
  stateChange?: string | null
  previousHash: string
}): string {
  const payloadStr = params.stateChange ? canonicalizeJson(params.stateChange) : ''
  const rawString = `${params.timestampIso}|${params.actor}|${params.action}|${params.entity}|${params.entityId}|${payloadStr}|${params.previousHash}`
  return crypto.createHash('sha256').update(rawString).digest('hex')
}

/**
 * Concurrency-Safe SHA-256 Cryptographic Audit Trail Logger
 */
export async function createCryptographicAuditLog(
  actor: string,
  action: string,
  entity: string,
  entityId: string,
  stateChange?: any,
  userId?: string,
  tx?: any
) {
  const execute = async (db: any) => {
    // 1. Obtain Atomic Lock on AuditChainState
    const chainState = await db.auditChainState.upsert({
      where: { id: 'GLOBAL' },
      update: {},
      create: { id: 'GLOBAL', lastHash: GENESIS_HASH },
    })

    const previousHash = chainState.lastHash || GENESIS_HASH
    const timestampIso = new Date().toISOString()
    const redactedPayloadStr = stateChange ? (typeof stateChange === 'string' ? stateChange : canonicalizeJson(stateChange)) : null

    const currentHash = calculateAuditHash({
      timestampIso,
      actor,
      action,
      entity,
      entityId,
      stateChange: redactedPayloadStr,
      previousHash,
    })

    // 2. Insert Audit Log
    const auditRecord = await db.auditLog.create({
      data: {
        timestamp: new Date(timestampIso),
        actor,
        userId: userId || null,
        ip: '127.0.0.1',
        action,
        entity,
        entityId,
        stateChange: redactedPayloadStr,
        previousHash,
        currentHash,
      },
    })

    // 3. Update AuditChainState
    await db.auditChainState.update({
      where: { id: 'GLOBAL' },
      data: { lastHash: currentHash },
    })

    return auditRecord
  }

  if (tx) {
    return await execute(tx)
  } else {
    return await prisma.$transaction(async (db) => {
      return await execute(db)
    })
  }
}

/**
 * Verify Complete Cryptographic SHA-256 Audit Chain Integrity
 */
export async function verifyAuditChainIntegrity() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'asc' },
    })

    if (logs.length === 0) {
      return {
        isChainValid: true,
        totalLogs: 0,
        details: 'Audit trail kosong. Tidak ada log yang perlu diverifikasi.',
      }
    }

    let expectedPreviousHash = GENESIS_HASH

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]

      // Verify previousHash linkage
      if (log.previousHash !== expectedPreviousHash && i > 0) {
        return {
          isChainValid: false,
          totalLogs: logs.length,
          invalidLogId: log.id,
          details: `Kerusakan Rantai Hash terdeteksi pada Log #${i + 1} (${log.id}). Previous Hash '${log.previousHash}' tidak cocok dengan Current Hash log sebelumnya '${expectedPreviousHash}'.`,
        }
      }

      // Recalculate currentHash
      const timestampIso = log.timestamp.toISOString()
      const computedHash = calculateAuditHash({
        timestampIso,
        actor: log.actor,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        stateChange: log.stateChange,
        previousHash: log.previousHash,
      })

      if (computedHash !== log.currentHash) {
        return {
          isChainValid: false,
          totalLogs: logs.length,
          invalidLogId: log.id,
          details: `Manipulasi Data / Payload Terdeteksi pada Log #${i + 1} (${log.id}). Hash tersimpan '${log.currentHash}' tidak cocok dengan hasil re-kalkulasi SHA-256 '${computedHash}'.`,
        }
      }

      expectedPreviousHash = log.currentHash
    }

    return {
      isChainValid: true,
      totalLogs: logs.length,
      details: `100% Valid! Seluruh ${logs.length} rekaman log audit SHA-256 bebas dari manipulasi.`,
    }
  } catch (error: any) {
    console.error('Error in verifyAuditChainIntegrity:', error)
    return {
      isChainValid: false,
      totalLogs: 0,
      details: error?.message || 'Gagal memverifikasi integritas audit trail.',
    }
  }
}
