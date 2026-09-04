'use server'

import { prisma } from '@/lib/prisma'
import { verifyAuditChainIntegrity } from '@/lib/security/audit'
import { getCurrentStaffSession } from '@/lib/security/session'
import { hasPermission } from '@/lib/permissions'

export interface AuditFilterParams {
  search?: string
  actionFilter?: string
  entityFilter?: string
  page?: number
  pageSize?: number
}

/**
 * Get Paginated Audit Log List from PostgreSQL
 */
export async function getAuditLogListAction(params?: AuditFilterParams) {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !hasPermission(session.user.role as any, 'audit.read')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin untuk membaca log audit.' }
    }

    const { search, actionFilter, entityFilter, page = 1, pageSize = 25 } = params || {}

    const whereClause: any = {}

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { actor: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { entity: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { stateChange: { contains: q, mode: 'insensitive' } },
        { currentHash: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (actionFilter && actionFilter !== 'ALL') {
      whereClause.action = actionFilter
    }

    if (entityFilter && entityFilter !== 'ALL') {
      whereClause.entity = entityFilter
    }

    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.auditLog.count({ where: whereClause }),
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
      },
    }
  } catch (error: any) {
    console.error('Error in getAuditLogListAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat log audit.',
    }
  }
}

/**
 * Verify Complete Cryptographic SHA-256 Hash Chain Integrity
 */
export async function verifyAuditChainAction() {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !hasPermission(session.user.role as any, 'audit.read')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin memverifikasi audit.' }
    }

    const result = await verifyAuditChainIntegrity()
    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error('Error in verifyAuditChainAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memverifikasi rantai audit.',
    }
  }
}
