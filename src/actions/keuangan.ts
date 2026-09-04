'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  createScopeSchema,
  updateScopeSchema,
  deleteScopeSchema,
  createLaporanKeuanganSchema,
  updateLaporanKeuanganSchema,
  createTransaksiKeuanganSchema,
  updateTransaksiKeuanganSchema,
  finalizePeriodSchema,
  reopenPeriodSchema,
  deleteLaporanKeuanganSchema,
  restoreLaporanKeuanganSchema,
  hardDeleteLaporanKeuanganSchema,
  deleteTransaksiKeuanganSchema,
  restoreTransaksiKeuanganSchema,
  hardDeleteTransaksiKeuanganSchema,
  laporanFilterSchema,
  laporanGabunganFilterSchema,
  CreateScopeInput,
  UpdateScopeInput,
  DeleteScopeInput,
  CreateLaporanKeuanganInput,
  UpdateLaporanKeuanganInput,
  CreateTransaksiKeuanganInput,
  UpdateTransaksiKeuanganInput,
  FinalizePeriodInput,
  ReopenPeriodInput,
  DeleteLaporanKeuanganInput,
  RestoreLaporanKeuanganInput,
  HardDeleteLaporanKeuanganInput,
  DeleteTransaksiKeuanganInput,
  RestoreTransaksiKeuanganInput,
  HardDeleteTransaksiKeuanganInput,
  LaporanFilterParams,
  LaporanGabunganFilterParams,
  StatusPeriode,
  TipeTransaksi,
  MetodePembayaran,
} from '@/lib/validations/keuangan'
import { getNextAtomicTrxNumber, createAuditLog } from '@/lib/jemaat-helpers'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@/config/navigation'
import { getCurrentStaffSession } from '@/lib/security/session'

function safeRevalidatePath(...paths: string[]) {
  try {
    for (const p of paths) {
      safeRevalidatePath(p);
    }
  } catch {}
}

const CURRENT_STAFF_ACTOR = 'Bendahara Gereja / Administrator'
const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'

async function getKeuanganActor() {
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

export type ScopeWithStatsDTO = {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  saldoTerkini: number
  totalPemasukanYtd: number
  totalPengeluaranYtd: number
  totalPeriodeCount: number
  activePeriodeCount: number
  closedPeriodeCount: number
  latestPeriode: {
    id: string
    bulan: number
    tahun: number
    status: StatusPeriode
    saldoAkhir: number
  } | null
}

export type LaporanKeuanganDTO = {
  id: string
  scopeId: string
  scopeCode: string
  scopeName: string
  bulan: number
  tahun: number
  saldoAwal: number
  totalPemasukan: number
  totalPengeluaran: number
  saldoAkhir: number
  status: StatusPeriode
  reopenReason: string | null
  closedAt: string | null
  closedBy: string | null
  deletedAt: string | null
  createdAt: string
  transaksiCount?: number
}

export type TransaksiKeuanganDTO = {
  id: string
  laporanId: string
  nomorReferensi: string
  tipe: TipeTransaksi
  kategori: string
  nominal: number
  metodePembayaran: MetodePembayaran
  catatan: string | null
  deletedAt: string | null
  tanggal: string
  createdAt: string
}

function toPlainLaporan(item: any, scopeCode?: string, scopeName?: string): LaporanKeuanganDTO {
  return {
    id: item.id,
    scopeId: item.scopeId,
    scopeCode: scopeCode || item.scope?.code || '',
    scopeName: scopeName || item.scope?.name || '',
    bulan: item.bulan,
    tahun: item.tahun,
    saldoAwal: Number(item.saldoAwal),
    totalPemasukan: Number(item.totalPemasukan),
    totalPengeluaran: Number(item.totalPengeluaran),
    saldoAkhir: Number(item.saldoAkhir),
    status: item.status,
    reopenReason: item.reopenReason || null,
    closedAt: item.closedAt ? (item.closedAt instanceof Date ? item.closedAt.toISOString() : String(item.closedAt)) : null,
    closedBy: item.closedBy || null,
    deletedAt: item.deletedAt ? (item.deletedAt instanceof Date ? item.deletedAt.toISOString() : String(item.deletedAt)) : null,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
    transaksiCount: item._count?.transaksi ?? item.transaksi?.length ?? undefined,
  }
}

function toPlainTransaksi(t: any): TransaksiKeuanganDTO {
  return {
    id: t.id,
    laporanId: t.laporanId,
    nomorReferensi: t.nomorReferensi,
    tipe: t.tipe,
    kategori: t.kategori,
    nominal: Number(t.nominal),
    metodePembayaran: t.metodePembayaran,
    catatan: t.catatan || null,
    deletedAt: t.deletedAt ? (t.deletedAt instanceof Date ? t.deletedAt.toISOString() : String(t.deletedAt)) : null,
    tanggal: t.tanggal instanceof Date ? t.tanggal.toISOString() : String(t.tanggal),
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
  }
}

/**
 * Helper to ensure default scopes exist and are linked to active kategorials
 */
export async function ensureDefaultScopes() {
  const defaultScopes = [
    { code: 'UMUM', name: 'Kas Umum Gereja', description: 'Operasional umum, perpuluhan, kolekte ibadah raya', kategorialId: null },
    { code: 'DIAKONIA', name: 'Kas Diakonia Pastoral', description: 'Bantuan sosial, santunan jemaat, dan pelayanan kasih', kategorialId: null },
    { code: 'PEMBANGUNAN', name: 'Kas Pembangunan Gedung', description: 'Renovasi gedung gereja dan sarana prasarana', kategorialId: null },
  ]

  for (const sc of defaultScopes) {
    const existing = await prisma.scopeKeuangan.findUnique({ where: { code: sc.code } })
    if (!existing) {
      await prisma.scopeKeuangan.create({ data: sc })
    }
  }

  // Auto-sync existing Kategorials with dedicated ScopeKeuangan
  try {
    const allKategorials = await prisma.kategorial.findMany({
      where: { deletedAt: null },
      select: { id: true, nama: true, deskripsi: true },
    })

    for (const kat of allKategorials) {
      // Check if a scope is already linked to this kategorial
      const existingLinked = await prisma.scopeKeuangan.findFirst({
        where: { kategorialId: kat.id },
      })

      if (!existingLinked) {
        // Generate a clean unique code based on kategorial name
        const cleanSlug = kat.nama
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 15)
        const targetCode = `KAS_${cleanSlug}`

        const codeExists = await prisma.scopeKeuangan.findUnique({ where: { code: targetCode } })
        if (!codeExists) {
          await prisma.scopeKeuangan.create({
            data: {
              code: targetCode,
              name: `Kas ${kat.nama}`,
              description: kat.deskripsi || `Buku kas operasional dan kegiatan ${kat.nama}`,
              kategorialId: kat.id,
              isActive: true,
            },
          })
        } else {
          // If code exists but unlinked, link it
          await prisma.scopeKeuangan.update({
            where: { id: codeExists.id },
            data: { kategorialId: kat.id },
          })
        }
      }
    }
  } catch (err) {
    console.error('Error auto-syncing kategorial scopes:', err)
  }
}

/**
 * Get list of all scopes with aggregated live balances & stats (Level 1 Page)
 */
export async function getScopeListWithStatsAction(): Promise<{
  success: boolean
  data?: {
    scopes: ScopeWithStatsDTO[]
    summary: {
      totalSaldoKonsolidasi: number
      totalPemasukanYtd: number
      totalPengeluaranYtd: number
      totalActiveScopes: number
      totalAllScopes: number
    }
    userScopedDepartmentName?: string
  }
  error?: string
}> {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.read')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keuangan.read.' }
    }

    await ensureDefaultScopes()

    const whereScope: any = {}
    let userScopedDepartmentName: string | undefined

    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean)
      if (assignedIds.length > 0) {
        whereScope.kategorialId = { in: assignedIds }
      } else {
        whereScope.kategorialId = 'NO_ASSIGNED_KATEGORIAL'
      }
    }

    const rawScopes = await prisma.scopeKeuangan.findMany({
      where: whereScope,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
      include: {
        laporan: {
          where: { deletedAt: null },
          orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
          select: {
            id: true,
            bulan: true,
            tahun: true,
            saldoAwal: true,
            totalPemasukan: true,
            totalPengeluaran: true,
            saldoAkhir: true,
            status: true,
          },
        },
      },
    })

    const currentYear = new Date().getFullYear()
    let grandSaldo = 0
    let grandPemasukan = 0
    let grandPengeluaran = 0
    let activeScopesCount = 0

    const formattedScopes: ScopeWithStatsDTO[] = rawScopes.map((sc) => {
      if (sc.isActive) activeScopesCount++

      const totalPeriodeCount = sc.laporan.length
      let activePeriodeCount = 0
      let closedPeriodeCount = 0
      let scopePemasukanYtd = 0
      let scopePengeluaranYtd = 0

      sc.laporan.forEach((lap) => {
        if (lap.status === 'DRAFT') activePeriodeCount++
        if (lap.status === 'CLOSED') closedPeriodeCount++

        if (lap.tahun === currentYear) {
          scopePemasukanYtd += Number(lap.totalPemasukan)
          scopePengeluaranYtd += Number(lap.totalPengeluaran)
        }
      })

      // The live current balance is the saldoAkhir of the most recent report, or 0 if no reports yet
      const latest = sc.laporan[0] || null
      const saldoTerkini = latest ? Number(latest.saldoAkhir) : 0

      grandSaldo += saldoTerkini
      grandPemasukan += scopePemasukanYtd
      grandPengeluaran += scopePengeluaranYtd

      return {
        id: sc.id,
        code: sc.code,
        name: sc.name,
        description: sc.description,
        isActive: sc.isActive,
        createdAt: sc.createdAt.toISOString(),
        saldoTerkini,
        totalPemasukanYtd: scopePemasukanYtd,
        totalPengeluaranYtd: scopePengeluaranYtd,
        totalPeriodeCount,
        activePeriodeCount,
        closedPeriodeCount,
        latestPeriode: latest
          ? {
              id: latest.id,
              bulan: latest.bulan,
              tahun: latest.tahun,
              status: latest.status,
              saldoAkhir: Number(latest.saldoAkhir),
            }
          : null,
      }
    })

    return {
      success: true,
      data: {
        scopes: formattedScopes,
        summary: {
          totalSaldoKonsolidasi: grandSaldo,
          totalPemasukanYtd: grandPemasukan,
          totalPengeluaranYtd: grandPengeluaran,
          totalActiveScopes: activeScopesCount,
          totalAllScopes: rawScopes.length,
        },
      },
    }
  } catch (error: any) {
    console.error('Error in getScopeListWithStatsAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat daftar master pos kas.' }
  }
}

/**
 * Get simple list of active scopes for select dropdowns (Scoped for BENDAHARA_KATEGORIAL)
 */
export async function getScopesAction() {
  try {
    const actor = await getKeuanganActor()
    await ensureDefaultScopes()

    const whereClause: any = { isActive: true }
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean)
      whereClause.kategorialId = assignedIds.length > 0 ? { in: assignedIds } : 'NO_ASSIGNED_KATEGORIAL'
    }

    const scopes = await prisma.scopeKeuangan.findMany({
      where: whereClause,
      orderBy: { code: 'asc' },
    })
    const safeScopes = scopes.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      isActive: s.isActive,
    }))
    return { success: true, data: safeScopes }
  } catch (error: any) {
    console.error('Error in getScopesAction:', error)
    return { success: false, error: 'Gagal memuat daftar scope kas.' }
  }
}

/**
 * Create New Scope Keuangan (Master Pos Kas Baru)
 * Restrict: Super Admin & Central Treasurer only
 */
export async function createScopeAction(input: CreateScopeInput) {
  try {
    const actor = await getKeuanganActor()
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      return { success: false, error: 'Akses ditolak: Pembuatan pos kas hanya dapat dilakukan oleh Bendahara Pusat atau Super Admin.' }
    }

    if (!hasPermission(actor.role, 'keuangan.create') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin membuat pos kas.' }
    }

    const validated = createScopeSchema.parse(input)

    let finalCode = validated.code
    if (!finalCode) {
      const baseCode = validated.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 20) || 'POS_KAS'

      let candidate = baseCode
      let count = 1
      while (await prisma.scopeKeuangan.findUnique({ where: { code: candidate } })) {
        candidate = `${baseCode}_${count++}`
      }
      finalCode = candidate
    } else {
      const existingCode = await prisma.scopeKeuangan.findUnique({
        where: { code: finalCode },
      })
      if (existingCode) {
        return { success: false, error: `Kode pos kas "${finalCode}" sudah digunakan.` }
      }
    }

    const newScope = await prisma.$transaction(async (tx) => {
      const created = await tx.scopeKeuangan.create({
        data: {
          name: validated.name,
          code: finalCode,
          description: validated.description,
          isActive: validated.isActive ?? true,
        },
      })

      await createAuditLog(
        actor.name,
        'SCOPE_KEUANGAN_CREATED',
        'ScopeKeuangan',
        created.id,
        JSON.stringify({ code: created.code, name: created.name }),
        undefined,
        tx
      )

      return created
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Pos Kas "${newScope.name}" berhasil dibuat.`,
      data: newScope,
    }
  } catch (error: any) {
    console.error('Error in createScopeAction:', error)
    return { success: false, error: error?.message || 'Gagal membuat pos kas baru.' }
  }
}

/**
 * Update Scope Keuangan (Ubah Nama / Deskripsi / Status Pos Kas)
 */
export async function updateScopeAction(input: UpdateScopeInput) {
  try {
    const actor = await getKeuanganActor()
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      return { success: false, error: 'Akses ditolak: Pengaturan pos kas hanya dapat dilakukan oleh Bendahara Pusat.' }
    }

    if (!hasPermission(actor.role, 'keuangan.manage') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mengedit pos kas.' }
    }

    const validated = updateScopeSchema.parse(input)

    const existing = await prisma.scopeKeuangan.findUnique({
      where: { id: validated.id },
    })

    if (!existing) {
      return { success: false, error: 'Pos kas tidak ditemukan.' }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.scopeKeuangan.update({
        where: { id: validated.id },
        data: {
          name: validated.name,
          description: validated.description,
          isActive: validated.isActive,
        },
      })

      await createAuditLog(
        actor.name,
        'SCOPE_KEUANGAN_UPDATED',
        'ScopeKeuangan',
        res.id,
        JSON.stringify({ name: res.name, isActive: res.isActive }),
        undefined,
        tx
      )

      return res
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath(`/dashboard/keuangan/scope/${existing.code}`)
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Pos Kas "${updated.name}" berhasil diperbarui.`,
      data: updated,
    }
  } catch (error: any) {
    console.error('Error in updateScopeAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui pos kas.' }
  }
}

/**
 * Delete or Deactivate Scope Keuangan with Safety Guard
 */
export async function deleteScopeAction(input: DeleteScopeInput) {
  try {
    const actor = await getKeuanganActor()
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      return { success: false, error: 'Akses ditolak: Penghapusan pos kas hanya dapat dilakukan oleh Bendahara Pusat.' }
    }

    if (!hasPermission(actor.role, 'keuangan.delete') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus pos kas.' }
    }

    const validated = deleteScopeSchema.parse(input)

    const existing = await prisma.scopeKeuangan.findUnique({
      where: { id: validated.id },
      include: {
        _count: {
          select: { laporan: true },
        },
      },
    })

    if (!existing) {
      return { success: false, error: 'Pos kas tidak ditemukan.' }
    }

    // Safety Guard: if reports exist, do safe deactivation instead of hard delete
    if (existing._count.laporan > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.scopeKeuangan.update({
          where: { id: validated.id },
          data: { isActive: false },
        })

        await createAuditLog(
          actor.name,
          'SCOPE_KEUANGAN_DEACTIVATED',
          'ScopeKeuangan',
          existing.id,
          JSON.stringify({ code: existing.code, reason: validated.reason || 'Deactivated due to historical data' }),
          undefined,
          tx
        )
      })

      safeRevalidatePath('/dashboard/keuangan')
      safeRevalidatePath(`/dashboard/keuangan/scope/${existing.code}`)

      return {
        success: true,
        message: `Pos Kas "${existing.name}" memiliki ${existing._count.laporan} buku laporan historis. Pos kas dinonaktifkan (diarsipkan) untuk menjaga integritas data.`,
        isDeactivated: true,
      }
    }

    // If completely empty, allow safe deletion
    await prisma.$transaction(async (tx) => {
      await tx.scopeKeuangan.delete({
        where: { id: validated.id },
      })

      await createAuditLog(
        actor.name,
        'SCOPE_KEUANGAN_HARD_DELETED',
        'ScopeKeuangan',
        existing.id,
        JSON.stringify({ code: existing.code, name: existing.name }),
        undefined,
        tx
      )
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Pos Kas "${existing.name}" berhasil dihapus secara permanen.`,
      isDeactivated: false,
    }
  } catch (error: any) {
    console.error('Error in deleteScopeAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus pos kas.' }
  }
}

/**
 * Get Paginated List of Laporan Keuangan with Filter & Summary
 * Scoped enforcement for BENDAHARA_KATEGORIAL
 */
export async function getLaporanKeuanganListAction(params?: LaporanFilterParams) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.read')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keuangan.read.' }
    }

    await ensureDefaultScopes()
    const validated = laporanFilterSchema.parse(params || {})
    const { scopeId, tahun, bulan, status, statusHapus = 'ACTIVE', page, pageSize } = validated

    const whereClause: Prisma.LaporanKeuanganWhereInput = {}

    // Check scope ownership if actor is BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]

      if (scopeId && scopeId !== 'all') {
        const targetScope = await prisma.scopeKeuangan.findFirst({
          where: { OR: [{ id: scopeId }, { code: scopeId }] },
        })
        if (!targetScope || !targetScope.kategorialId || !assignedIds.includes(targetScope.kategorialId)) {
          return { success: false, error: 'Akses ditolak: Anda tidak memiliki akses ke buku kas pos ini.' }
        }
      } else {
        whereClause.scope = {
          kategorialId: assignedIds.length > 0 ? { in: assignedIds } : 'NO_ASSIGNED_KATEGORIAL',
        }
      }
    }

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }

    if (scopeId && scopeId !== 'all') {
      whereClause.OR = [
        { scopeId: scopeId },
        { scope: { code: scopeId } },
      ]
    }

    if (tahun) whereClause.tahun = tahun
    if (bulan) whereClause.bulan = bulan
    if (status) whereClause.status = status

    const skip = (page - 1) * pageSize

    const [items, total, allReports, activeScopesCount] = await Promise.all([
      prisma.laporanKeuangan.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }, { scope: { code: 'asc' } }],
        include: {
          scope: true,
          _count: { select: { transaksi: true } },
        },
      }),
      prisma.laporanKeuangan.count({ where: whereClause }),
      prisma.laporanKeuangan.findMany({
        where: whereClause,
        select: {
          saldoAwal: true,
          totalPemasukan: true,
          totalPengeluaran: true,
          saldoAkhir: true,
        },
      }),
      prisma.scopeKeuangan.count({ where: { isActive: true } }),
    ])

    // Convert Decimals to Number for DTO
    const formattedItems: LaporanKeuanganDTO[] = items.map((item) => ({
      id: item.id,
      scopeId: item.scopeId,
      scopeCode: item.scope.code,
      scopeName: item.scope.name,
      bulan: item.bulan,
      tahun: item.tahun,
      saldoAwal: Number(item.saldoAwal),
      totalPemasukan: Number(item.totalPemasukan),
      totalPengeluaran: Number(item.totalPengeluaran),
      saldoAkhir: Number(item.saldoAkhir),
      status: item.status,
      reopenReason: item.reopenReason,
      closedAt: item.closedAt ? item.closedAt.toISOString() : null,
      closedBy: item.closedBy,
      deletedAt: item.deletedAt ? item.deletedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      transaksiCount: item._count.transaksi,
    }))

    // Calculate aggregated live metrics
    let totalPemasukan = 0
    let totalPengeluaran = 0
    let totalSaldo = 0

    allReports.forEach((r) => {
      totalPemasukan += Number(r.totalPemasukan)
      totalPengeluaran += Number(r.totalPengeluaran)
      totalSaldo += Number(r.saldoAkhir)
    })

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
          totalSaldo,
          totalPemasukan,
          totalPengeluaran,
          totalScopes: activeScopesCount,
        },
      },
    }
  } catch (error: any) {
    console.error('Error in getLaporanKeuanganListAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat daftar laporan keuangan.',
    }
  }
}

/**
 * Get Laporan Keuangan Detail with all Transactions
 */
export async function getLaporanByIdAction(id: string) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.read')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keuangan.read.' }
    }

    if (!id) throw new Error('ID Laporan Keuangan wajib disertakan.')

    const item = await prisma.laporanKeuangan.findUnique({
      where: { id },
      include: {
        scope: true,
        transaksi: {
          orderBy: { tanggal: 'desc' },
        },
      },
    })

    if (!item) {
      return { success: false, error: 'Laporan keuangan tidak ditemukan.' }
    }

    // Scoped check
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!item.scope.kategorialId || !assignedIds.includes(item.scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak memiliki hak akses ke laporan buku kas ini.' }
      }
    }

    const formattedLaporan: LaporanKeuanganDTO = toPlainLaporan(item)
    const formattedTransaksi: TransaksiKeuanganDTO[] = item.transaksi.map((t) => toPlainTransaksi(t))

    return {
      success: true,
      data: {
        laporan: formattedLaporan,
        transaksi: formattedTransaksi,
      },
    }
  } catch (error: any) {
    console.error('Error in getLaporanByIdAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal mengambil detail laporan.',
    }
  }
}

/**
 * Detect Prior Period Balance for a Scope
 */
export async function getPriorPeriodBalanceAction(params: {
  scopeIdOrCode: string
  bulan: number
  tahun: number
}) {
  try {
    const scope = await prisma.scopeKeuangan.findFirst({
      where: {
        OR: [{ id: params.scopeIdOrCode }, { code: params.scopeIdOrCode.toUpperCase() }],
      },
    })

    if (!scope) {
      return { success: false, error: 'Pos kas tidak ditemukan.' }
    }

    const priorPeriod = await prisma.laporanKeuangan.findFirst({
      where: {
        scopeId: scope.id,
        deletedAt: null,
        OR: [
          { tahun: { lt: params.tahun } },
          { tahun: params.tahun, bulan: { lt: params.bulan } },
        ],
      },
      orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
    })

    if (priorPeriod) {
      return {
        success: true,
        data: {
          hasPrior: true,
          priorPeriod: {
            id: priorPeriod.id,
            bulan: priorPeriod.bulan,
            tahun: priorPeriod.tahun,
            saldoAkhir: Number(priorPeriod.saldoAkhir),
            status: priorPeriod.status,
          },
        },
      }
    }

    return {
      success: true,
      data: {
        hasPrior: false,
        priorPeriod: null,
      },
    }
  } catch (error: any) {
    return { success: false, error: 'Gagal mendeteksi saldo periode sebelumnya.' }
  }
}

/**
 * Create New Laporan Keuangan Period with Automatic or Custom Initial Balance
 */
export async function createLaporanKeuanganAction(input: CreateLaporanKeuanganInput) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.create') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keuangan.create.' }
    }

    const validated = createLaporanKeuanganSchema.parse(input)
    const { scopeId, bulan, tahun } = validated

    // 1. Resolve Scope
    const scope = await prisma.scopeKeuangan.findFirst({
      where: {
        OR: [{ id: scopeId }, { code: scopeId }],
      },
    })

    if (!scope) {
      return { success: false, error: 'Scope kas yang dipilih tidak valid.' }
    }

    // Scoped RBAC Check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!scope.kategorialId || !assignedIds.includes(scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang untuk membuka periode pada pos kas ini.' }
      }
    }

    // 2. Prevent Duplicate Period for same scope
    const existing = await prisma.laporanKeuangan.findUnique({
      where: {
        scopeId_bulan_tahun: {
          scopeId: scope.id,
          bulan,
          tahun,
        },
      },
    })

    if (existing) {
      return {
        success: false,
        error: `Laporan keuangan untuk ${scope.name} periode ${bulan}/${tahun} sudah pernah dibuat.`,
      }
    }

    // 3. Initial Balance Calculation (Carry-Over + Adjustment or Manual)
    let finalSaldoAwal = 0
    let auditNote = ''

    if (validated.saldoAwalMode === 'MANUAL') {
      finalSaldoAwal = Math.max(0, Number(validated.saldoAwalCustom) || 0)
      auditNote = `Manual Initial Balance: Rp ${finalSaldoAwal.toLocaleString('id-ID')}`
    } else {
      // Find prior period: latest before (tahun, bulan)
      const priorPeriod = await prisma.laporanKeuangan.findFirst({
        where: {
          scopeId: scope.id,
          deletedAt: null,
          OR: [
            { tahun: { lt: tahun } },
            { tahun: tahun, bulan: { lt: bulan } },
          ],
        },
        orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
      })

      const basePriorSaldo = priorPeriod ? Number(priorPeriod.saldoAkhir) : 0
      const penyesuaian = Number(validated.penyesuaianManual) || 0
      finalSaldoAwal = Math.max(0, basePriorSaldo + penyesuaian)
      auditNote = priorPeriod
        ? `Carry-over from ${priorPeriod.bulan}/${priorPeriod.tahun} (Rp ${basePriorSaldo}) + Adjustment (Rp ${penyesuaian}) = Rp ${finalSaldoAwal}`
        : `First period default saldo: Rp ${finalSaldoAwal}`
    }

    // 4. Create in Transaction + SHA-256 Audit Log
    const created = await prisma.$transaction(async (tx) => {
      const newLaporan = await tx.laporanKeuangan.create({
        data: {
          scopeId: scope.id,
          bulan,
          tahun,
          saldoAwal: finalSaldoAwal,
          totalPemasukan: 0,
          totalPengeluaran: 0,
          saldoAkhir: finalSaldoAwal,
          status: 'DRAFT',
        },
      })

      // Cryptographic SHA-256 Audit Log
      await createAuditLog(
        actor.name,
        'LAPORAN_KEUANGAN_CREATED',
        'LaporanKeuangan',
        newLaporan.id,
        JSON.stringify({
          scope: scope.name,
          bulan,
          tahun,
          saldoAwal: finalSaldoAwal,
          mode: validated.saldoAwalMode,
          note: auditNote,
          status: 'DRAFT',
        }),
        undefined,
        tx
      )

      return newLaporan
    })

    safeRevalidatePath('/dashboard/keuangan', `/dashboard/keuangan/scope/${scope.code}`, '/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      data: toPlainLaporan(created, scope.code, scope.name),
      message: `Laporan periode ${bulan}/${tahun} untuk ${scope.name} berhasil dibuat dengan Saldo Awal Rp ${finalSaldoAwal.toLocaleString('id-ID')}.`,
    }
  } catch (error: any) {
    console.error('Error in createLaporanKeuanganAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal membuat laporan keuangan.',
    }
  }
}

/**
 * Update Laporan Keuangan Period (Only for DRAFT status)
 */
export async function updateLaporanKeuanganAction(input: UpdateLaporanKeuanganInput) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.create') && !hasPermission(actor.role, 'keuangan.manage') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mengedit periode keuangan.' }
    }

    const validated = updateLaporanKeuanganSchema.parse(input)

    const existing = await prisma.laporanKeuangan.findUnique({
      where: { id: validated.id },
      include: { scope: true },
    })

    if (!existing) {
      return { success: false, error: 'Periode laporan keuangan tidak ditemukan.' }
    }

    // Scoped RBAC Check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!existing.scope.kategorialId || !assignedIds.includes(existing.scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak memiliki akses ke pos kas ini.' }
      }
    }

    if (existing.status === 'CLOSED') {
      return { success: false, error: 'Periode sudah ditutup (CLOSED). Buka kembali periode sebelum mengubah data.' }
    }

    const newBulan = validated.bulan ?? existing.bulan
    const newTahun = validated.tahun ?? existing.tahun
    const newSaldoAwal = validated.saldoAwal !== undefined ? new Prisma.Decimal(validated.saldoAwal) : existing.saldoAwal

    // Check duplicate month/year if changed
    if (newBulan !== existing.bulan || newTahun !== existing.tahun) {
      const duplicate = await prisma.laporanKeuangan.findUnique({
        where: {
          scopeId_bulan_tahun: {
            scopeId: existing.scopeId,
            bulan: newBulan,
            tahun: newTahun,
          },
        },
      })
      if (duplicate && duplicate.id !== existing.id) {
        return { success: false, error: `Laporan keuangan periode ${newBulan}/${newTahun} sudah ada.` }
      }
    }

    // Recalculate saldo akhir
    const newSaldoAkhir = newSaldoAwal.plus(existing.totalPemasukan).minus(existing.totalPengeluaran)

    const updated = await prisma.$transaction(async (tx) => {
      const lap = await tx.laporanKeuangan.update({
        where: { id: validated.id },
        data: {
          bulan: newBulan,
          tahun: newTahun,
          saldoAwal: newSaldoAwal,
          saldoAkhir: newSaldoAkhir,
        },
      })

      await createAuditLog(
        actor.name,
        'LAPORAN_KEUANGAN_UPDATED',
        'LaporanKeuangan',
        lap.id,
        JSON.stringify({
          bulan: newBulan,
          tahun: newTahun,
          saldoAwal: Number(newSaldoAwal),
          saldoAkhir: Number(newSaldoAkhir),
        }),
        undefined,
        tx
      )

      return lap
    })

    safeRevalidatePath('/dashboard/keuangan', `/dashboard/keuangan/scope/${existing.scope.code}`, '/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Periode pembukuan ${newBulan}/${newTahun} berhasil diperbarui.`,
      data: toPlainLaporan(updated, existing.scope.code, existing.scope.name),
    }
  } catch (error: any) {
    console.error('Error in updateLaporanKeuanganAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui periode laporan keuangan.' }
  }
}

/**
 * Create Financial Transaction with Atomic Reference Number and Balance Recalculation
 */
export async function createTransaksiKeuanganAction(input: CreateTransaksiKeuanganInput) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.create') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keuangan.create.' }
    }

    const validated = createTransaksiKeuanganSchema.parse(input)
    const { laporanId, tipe, kategori, nominal, metodePembayaran, catatan, tanggal } = validated

    // 1. Lock and Validate Laporan Keuangan
    const laporan = await prisma.laporanKeuangan.findUnique({
      where: { id: laporanId },
      include: { scope: true },
    })

    if (!laporan) {
      return { success: false, error: 'Laporan keuangan tidak ditemukan.' }
    }

    // Scoped RBAC Check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!laporan.scope.kategorialId || !assignedIds.includes(laporan.scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak berhak mencatat transaksi pada buku kas ini.' }
      }
    }

    // 2. Strict Server-side Closed & Deleted Period Enforcement
    if (laporan.deletedAt) {
      return {
        success: false,
        error: 'Tidak dapat mencatat transaksi pada buku kas yang berada di kotak sampah.',
      }
    }

    if (laporan.status === 'CLOSED') {
      return {
        success: false,
        error: 'Periode keuangan sudah ditutup (CLOSED) dan bersifat Read-Only. Transaksi tidak dapat ditambahkan.',
      }
    }

    // 3. Atomic Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      // a. Generate atomic unique reference number: TRX-YYYYMM-0001
      const nomorReferensi = await getNextAtomicTrxNumber(tx, tanggal)

      // b. Insert transaction
      const newTrx = await tx.transaksiKeuangan.create({
        data: {
          laporanId: laporan.id,
          nomorReferensi,
          tipe,
          kategori,
          nominal: new Prisma.Decimal(nominal),
          metodePembayaran,
          catatan,
          tanggal,
        },
      })

      // c. Server-side Recalculate Totals from DB (Never trust client balance calculations)
      const aggregates = await tx.transaksiKeuangan.groupBy({
        by: ['tipe'],
        where: { laporanId: laporan.id, deletedAt: null },
        _sum: { nominal: true },
      })

      let totalPemasukan = new Prisma.Decimal(0)
      let totalPengeluaran = new Prisma.Decimal(0)

      aggregates.forEach((agg) => {
        if (agg.tipe === 'MASUK' && agg._sum.nominal) {
          totalPemasukan = agg._sum.nominal
        } else if (agg.tipe === 'KELUAR' && agg._sum.nominal) {
          totalPengeluaran = agg._sum.nominal
        }
      })

      // Saldo Akhir = Saldo Awal + Pemasukan - Pengeluaran
      const saldoAkhir = laporan.saldoAwal.plus(totalPemasukan).minus(totalPengeluaran)

      // d. Update Laporan Keuangan with recalculated balances
      const updatedLaporan = await tx.laporanKeuangan.update({
        where: { id: laporan.id },
        data: {
          totalPemasukan,
          totalPengeluaran,
          saldoAkhir,
        },
      })

      // e. Cryptographic SHA-256 Audit Log
      await createAuditLog(
        actor.name,
        'TRANSAKSI_KEUANGAN_CREATED',
        'TransaksiKeuangan',
        newTrx.id,
        JSON.stringify({
          nomorReferensi: newTrx.nomorReferensi,
          tipe: newTrx.tipe,
          kategori: newTrx.kategori,
          nominal: Number(newTrx.nominal),
          metodePembayaran: newTrx.metodePembayaran,
          laporanId: laporan.id,
          saldoAkhirBaru: Number(updatedLaporan.saldoAkhir),
        }),
        undefined,
        tx
      )

      return {
        transaksi: newTrx,
        laporan: updatedLaporan,
      }
    })

    safeRevalidatePath('/dashboard/keuangan', `/dashboard/keuangan/scope/${laporan.scope.code}`, '/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      data: toPlainTransaksi(result.transaksi),
      message: `Transaksi ${result.transaksi.nomorReferensi} (${tipe}) sebesar Rp ${nominal.toLocaleString('id-ID')} berhasil dicatat! Saldo akhir diperbarui.`,
    }
  } catch (error: any) {
    console.error('Error in createTransaksiKeuanganAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menambahkan transaksi kas.',
    }
  }
}

/**
 * Update Financial Transaction with Balance Recalculation
 */
export async function updateTransaksiKeuanganAction(input: UpdateTransaksiKeuanganInput) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.create') && !hasPermission(actor.role, 'keuangan.manage') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mengedit transaksi keuangan.' }
    }

    const validated = updateTransaksiKeuanganSchema.parse(input)
    const { id, tipe, kategori, nominal, metodePembayaran, catatan, tanggal } = validated

    // 1. Check existing transaction and parent period
    const existing = await prisma.transaksiKeuangan.findUnique({
      where: { id },
      include: { laporan: { include: { scope: true } } },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Transaksi tidak ditemukan atau sudah dihapus.' }
    }

    // Scoped RBAC Check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!existing.laporan.scope.kategorialId || !assignedIds.includes(existing.laporan.scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak berhak mengedit transaksi pada buku kas ini.' }
      }
    }

    if (existing.laporan.deletedAt) {
      return {
        success: false,
        error: 'Tidak dapat mengedit transaksi pada buku kas yang berada di kotak sampah.',
      }
    }

    if (existing.laporan.status === 'CLOSED') {
      return {
        success: false,
        error: 'Periode keuangan sudah ditutup (CLOSED) dan bersifat Read-Only. Transaksi tidak dapat diubah.',
      }
    }

    // 2. Atomic Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedTrx = await tx.transaksiKeuangan.update({
        where: { id },
        data: {
          tipe,
          kategori,
          nominal: new Prisma.Decimal(nominal),
          metodePembayaran,
          catatan,
          tanggal,
        },
      })

      // Recalculate balance for the parent period
      await recalculateLaporanBalances(existing.laporanId, tx)

      // Cryptographic SHA-256 Audit Log
      await createAuditLog(
        actor.name,
        'TRANSAKSI_KEUANGAN_UPDATED',
        'TransaksiKeuangan',
        updatedTrx.id,
        JSON.stringify({
          nomorReferensi: updatedTrx.nomorReferensi,
          tipe: updatedTrx.tipe,
          kategori: updatedTrx.kategori,
          nominal: Number(updatedTrx.nominal),
          metodePembayaran: updatedTrx.metodePembayaran,
          laporanId: existing.laporanId,
        }),
        undefined,
        tx
      )

      return updatedTrx
    })

    safeRevalidatePath('/dashboard/keuangan', `/dashboard/keuangan/scope/${existing.laporan.scope.code}`, '/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      data: toPlainTransaksi(result),
      message: `Transaksi ${result.nomorReferensi} berhasil diperbarui dan saldo buku kas telah dikalkulasi ulang.`,
    }
  } catch (error: any) {
    console.error('Error in updateTransaksiKeuanganAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui transaksi kas.',
    }
  }
}

/**
 * Finalize / Close Period (Make Period Read-Only)
 */
export async function finalizePeriodAction(input: FinalizePeriodInput) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.close') && !hasPermission(actor.role, 'keuangan.create') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menutup periode keuangan.' }
    }

    const validated = finalizePeriodSchema.parse(input)
    const { laporanId } = validated

    const laporan = await prisma.laporanKeuangan.findUnique({
      where: { id: laporanId },
      include: { scope: true },
    })

    if (!laporan) {
      return { success: false, error: 'Laporan keuangan tidak ditemukan.' }
    }

    // Scoped RBAC Check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!laporan.scope.kategorialId || !assignedIds.includes(laporan.scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak berhak menutup periode buku kas ini.' }
      }
    }

    if (laporan.status === 'CLOSED') {
      return { success: false, error: 'Periode keuangan ini sudah berstatus CLOSED sebelumnya.' }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Recalculate balances one final time to guarantee mathematical accuracy
      const aggregates = await tx.transaksiKeuangan.groupBy({
        by: ['tipe'],
        where: { laporanId: laporan.id, deletedAt: null },
        _sum: { nominal: true },
      })

      let totalPemasukan = new Prisma.Decimal(0)
      let totalPengeluaran = new Prisma.Decimal(0)

      aggregates.forEach((agg) => {
        if (agg.tipe === 'MASUK' && agg._sum.nominal) {
          totalPemasukan = agg._sum.nominal
        } else if (agg.tipe === 'KELUAR' && agg._sum.nominal) {
          totalPengeluaran = agg._sum.nominal
        }
      })

      const saldoAkhir = laporan.saldoAwal.plus(totalPemasukan).minus(totalPengeluaran)

      const closed = await tx.laporanKeuangan.update({
        where: { id: laporan.id },
        data: {
          totalPemasukan,
          totalPengeluaran,
          saldoAkhir,
          status: 'CLOSED',
          closedAt: new Date(),
          closedBy: actor.name,
        },
      })

      // Cryptographic SHA-256 Audit Log
      await createAuditLog(
        actor.name,
        'LAPORAN_KEUANGAN_CLOSED',
        'LaporanKeuangan',
        closed.id,
        JSON.stringify({
          laporanId: closed.id,
          scopeId: closed.scopeId,
          scopeName: laporan.scope.name,
          bulan: closed.bulan,
          tahun: closed.tahun,
          saldoAwal: Number(closed.saldoAwal),
          totalPemasukan: Number(closed.totalPemasukan),
          totalPengeluaran: Number(closed.totalPengeluaran),
          saldoAkhir: Number(closed.saldoAkhir),
          status: 'CLOSED',
        }),
        undefined,
        tx
      )

      return closed
    })

    safeRevalidatePath('/dashboard/keuangan', `/dashboard/keuangan/scope/${laporan.scope.code}`, '/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      data: toPlainLaporan(updated, laporan.scope.code, laporan.scope.name),
      message: `Periode keuangan ${laporan.scope.name} (${laporan.bulan}/${laporan.tahun}) berhasil ditutup (CLOSED). Seluruh transaksi kini bersifat Read-Only.`,
    }
  } catch (error: any) {
    console.error('Error in finalizePeriodAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal menutup periode keuangan.',
    }
  }
}


/**
 * Reopen Closed Period with Mandatory Reason
 */
export async function reopenPeriodAction(input: ReopenPeriodInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'keuangan.reopen')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keuangan.reopen.' }
    }

    const validated = reopenPeriodSchema.parse(input)
    const { laporanId, reason } = validated

    const laporan = await prisma.laporanKeuangan.findUnique({
      where: { id: laporanId },
      include: { scope: true },
    })

    if (!laporan) {
      return { success: false, error: 'Laporan keuangan tidak ditemukan.' }
    }

    if (laporan.status === 'DRAFT') {
      return { success: false, error: 'Periode keuangan ini sudah berstatus DRAFT.' }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reopened = await tx.laporanKeuangan.update({
        where: { id: laporan.id },
        data: {
          status: 'DRAFT',
          reopenReason: reason,
        },
      })

      // Cryptographic SHA-256 Audit Log
      await createAuditLog(
        CURRENT_STAFF_ACTOR,
        'LAPORAN_KEUANGAN_REOPENED',
        'LaporanKeuangan',
        reopened.id,
        JSON.stringify({
          laporanId: reopened.id,
          previousStatus: 'CLOSED',
          newStatus: 'DRAFT',
          reopenReason: reason,
          scopeId: reopened.scopeId,
          scopeName: laporan.scope.name,
          bulan: reopened.bulan,
          tahun: reopened.tahun,
        }),
        undefined,
        tx
      )

      return reopened
    })

    safeRevalidatePath('/dashboard/keuangan', `/dashboard/keuangan/scope/${laporan.scope.code}`, '/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      data: toPlainLaporan(updated, laporan.scope.code, laporan.scope.name),
      message: `Periode keuangan ${laporan.scope.name} berhasil dibuka kembali (DRAFT). Alasan telah dicatat dalam Audit Trail.`,
    }
  } catch (error: any) {
    console.error('Error in reopenPeriodAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal membuka kembali periode keuangan.',
    }
  }
}

/**
 * Get Consolidated Multi-Scope Financial Report (Laporan Gabungan)
 * Restrict: Super Admin, Gembala, and Central Treasurer only
 */
export async function getLaporanGabunganAction(params?: LaporanGabunganFilterParams) {
  try {
    const actor = await getKeuanganActor()
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      return { success: false, error: 'Akses ditolak: Laporan gabungan konsolidasi gereja hanya dapat diakses oleh Bendahara Pusat dan Gembala.' }
    }

    if (!hasPermission(actor.role, 'keuangan.read') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keuangan.read.' }
    }

    await ensureDefaultScopes()
    const validated = laporanGabunganFilterSchema.parse(params || {})
    const { tahun, bulan } = validated

    const scopes = await prisma.scopeKeuangan.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    })

    const whereClause: Prisma.LaporanKeuanganWhereInput = {
      tahun,
      deletedAt: null,
    }
    if (bulan) whereClause.bulan = bulan

    const reports = await prisma.laporanKeuangan.findMany({
      where: whereClause,
      include: { scope: true },
    })

    let totalSaldoAwal = 0
    let totalPemasukan = 0
    let totalPengeluaran = 0
    let totalSaldoAkhir = 0

    const scopeBreakdown = scopes.map((sc) => {
      // Find matching report for this scope
      const scReports = reports.filter((r) => r.scopeId === sc.id)

      let scSaldoAwal = 0
      let scPemasukan = 0
      let scPengeluaran = 0
      let scSaldoAkhir = 0
      let scStatus: StatusPeriode = 'DRAFT'
      let scLaporanId = ''

      if (scReports.length > 0) {
        // If single month requested, take direct values
        if (bulan && scReports.length === 1) {
          const r = scReports[0]
          scSaldoAwal = Number(r.saldoAwal)
          scPemasukan = Number(r.totalPemasukan)
          scPengeluaran = Number(r.totalPengeluaran)
          scSaldoAkhir = Number(r.saldoAkhir)
          scStatus = r.status
          scLaporanId = r.id
        } else {
          // Yearly aggregate
          scReports.forEach((r) => {
            scPemasukan += Number(r.totalPemasukan)
            scPengeluaran += Number(r.totalPengeluaran)
          })
          // Saldo awal = earliest month in year, Saldo akhir = latest month in year
          const sorted = [...scReports].sort((a, b) => a.bulan - b.bulan)
          scSaldoAwal = Number(sorted[0].saldoAwal)
          scSaldoAkhir = Number(sorted[sorted.length - 1].saldoAkhir)
          scStatus = sorted.every((r) => r.status === 'CLOSED') ? 'CLOSED' : 'DRAFT'
          scLaporanId = sorted[sorted.length - 1].id
        }
      }

      totalSaldoAwal += scSaldoAwal
      totalPemasukan += scPemasukan
      totalPengeluaran += scPengeluaran
      totalSaldoAkhir += scSaldoAkhir

      return {
        scopeId: sc.id,
        scopeCode: sc.code,
        scopeName: sc.name,
        laporanId: scLaporanId,
        saldoAwal: scSaldoAwal,
        totalPemasukan: scPemasukan,
        totalPengeluaran: scPengeluaran,
        saldoAkhir: scSaldoAkhir,
        status: scStatus,
      }
    })

    return {
      success: true,
      data: {
        tahun,
        bulan: bulan || null,
        totalSaldoAwal,
        totalPemasukan,
        totalPengeluaran,
        totalSaldoAkhir,
        scopes: scopeBreakdown,
      },
    }
  } catch (error: any) {
    console.error('Error in getLaporanGabunganAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat laporan keuangan gabungan.',
    }
  }
}

/**
 * Helper to recalculate Laporan balances from active transactions
 */
async function recalculateLaporanBalances(laporanId: string, tx: any) {
  const activeTransactions = await tx.transaksiKeuangan.findMany({
    where: { laporanId, deletedAt: null },
    select: { tipe: true, nominal: true },
  })

  let totalPemasukan = 0
  let totalPengeluaran = 0

  activeTransactions.forEach((t: any) => {
    const val = Number(t.nominal)
    if (t.tipe === 'MASUK') totalPemasukan += val
    else if (t.tipe === 'KELUAR') totalPengeluaran += val
  })

  const laporan = await tx.laporanKeuangan.findUnique({
    where: { id: laporanId },
    select: { saldoAwal: true },
  })

  const saldoAwal = Number(laporan?.saldoAwal || 0)
  const saldoAkhir = saldoAwal + totalPemasukan - totalPengeluaran

  await tx.laporanKeuangan.update({
    where: { id: laporanId },
    data: {
      totalPemasukan,
      totalPengeluaran,
      saldoAkhir,
    },
  })
}

/**
 * Soft Delete Laporan Keuangan (Buku Kas)
 */
export async function deleteLaporanKeuanganAction(input: DeleteLaporanKeuanganInput) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.delete') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keuangan.delete.' }
    }

    const validated = deleteLaporanKeuanganSchema.parse(input)
    const existing = await prisma.laporanKeuangan.findUnique({
      where: { id: validated.id },
      include: { scope: true },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Laporan keuangan tidak ditemukan atau sudah dihapus.' }
    }

    // Scoped check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!existing.scope.kategorialId || !assignedIds.includes(existing.scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak berhak menghapus buku kas ini.' }
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Soft delete all child transactions
      await tx.transaksiKeuangan.updateMany({
        where: { laporanId: existing.id },
        data: {
          deletedAt: new Date(),
          deletedBy: actor.name,
          deletionReason: `Buku kas periode ${existing.bulan}/${existing.tahun} dihapus: ${validated.reason.trim()}`,
        },
      })

      // 2. Soft delete laporan
      await tx.laporanKeuangan.update({
        where: { id: existing.id },
        data: {
          deletedAt: new Date(),
          deletedBy: actor.name,
          deletionReason: validated.reason.trim(),
        },
      })

      // Audit Log
      await createAuditLog(
        actor.name,
        'LAPORAN_KEUANGAN_DELETED',
        'LaporanKeuangan',
        existing.id,
        JSON.stringify({
          scope: existing.scope.name,
          bulan: existing.bulan,
          tahun: existing.tahun,
          reason: validated.reason.trim(),
        }),
        undefined,
        tx
      )
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath(`/dashboard/keuangan/scope/${existing.scope.code}`)
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Buku Kas ${existing.scope.name} periode ${existing.bulan}/${existing.tahun} berhasil di-soft delete.`,
    }
  } catch (error: any) {
    console.error('Error in deleteLaporanKeuanganAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus laporan keuangan.' }
  }
}

/**
 * Restore Soft-Deleted Laporan Keuangan
 */
export async function restoreLaporanKeuanganAction(input: RestoreLaporanKeuanganInput) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.delete') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keuangan.delete.' }
    }

    const validated = restoreLaporanKeuanganSchema.parse(input)
    const existing = await prisma.laporanKeuangan.findFirst({
      where: { id: validated.id, deletedAt: { not: null } },
      include: { scope: true },
    })

    if (!existing) {
      return { success: false, error: 'Laporan keuangan terhapus tidak ditemukan.' }
    }

    // Scoped check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!existing.scope.kategorialId || !assignedIds.includes(existing.scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak berhak memulihkan buku kas ini.' }
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Restore laporan
      await tx.laporanKeuangan.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      })

      // 2. Restore all child transactions
      await tx.transaksiKeuangan.updateMany({
        where: { laporanId: existing.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      })

      // Audit Log
      await createAuditLog(
        actor.name,
        'LAPORAN_KEUANGAN_RESTORED',
        'LaporanKeuangan',
        existing.id,
        `Restored Buku Kas ${existing.scope.name} (${existing.bulan}/${existing.tahun})`,
        undefined,
        tx
      )
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath(`/dashboard/keuangan/scope/${existing.scope.code}`)
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Buku Kas ${existing.scope.name} periode ${existing.bulan}/${existing.tahun} berhasil dipulihkan.`,
    }
  } catch (error: any) {
    console.error('Error in restoreLaporanKeuanganAction:', error)
    return { success: false, error: error?.message || 'Gagal memulihkan laporan keuangan.' }
  }
}

/**
 * Hard Delete Laporan Keuangan Permanently from PostgreSQL Database
 */
export async function hardDeleteLaporanKeuanganAction(input: HardDeleteLaporanKeuanganInput) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.delete') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus permanen laporan keuangan.' }
    }

    const validated = hardDeleteLaporanKeuanganSchema.parse(input)
    const existing = await prisma.laporanKeuangan.findUnique({
      where: { id: validated.id },
      include: { scope: true },
    })

    if (!existing) {
      return { success: false, error: 'Data laporan keuangan tidak ditemukan di database.' }
    }

    // Scoped check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!existing.scope.kategorialId || !assignedIds.includes(existing.scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak berhak menghapus buku kas ini.' }
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete all transactions
      await tx.transaksiKeuangan.deleteMany({
        where: { laporanId: existing.id },
      })

      // 2. Delete laporan permanently
      await tx.laporanKeuangan.delete({
        where: { id: existing.id },
      })

      // Audit Log
      await createAuditLog(
        actor.name,
        'LAPORAN_KEUANGAN_PERMANENTLY_DELETED',
        'LaporanKeuangan',
        existing.id,
        `Permanently deleted Buku Kas ${existing.scope.name} (${existing.bulan}/${existing.tahun}) from database.`,
        undefined,
        tx
      )
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath(`/dashboard/keuangan/scope/${existing.scope.code}`)
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Buku Kas ${existing.scope.name} periode ${existing.bulan}/${existing.tahun} berhasil dihapus secara PERMANEN dari database.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeleteLaporanKeuanganAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus permanen laporan keuangan.' }
  }
}

/**
 * Soft Delete Transaksi Keuangan
 */
export async function deleteTransaksiKeuanganAction(input: DeleteTransaksiKeuanganInput) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.delete') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus transaksi keuangan.' }
    }

    const validated = deleteTransaksiKeuanganSchema.parse(input)
    const existing = await prisma.transaksiKeuangan.findUnique({
      where: { id: validated.id },
      include: { laporan: { include: { scope: true } } },
    })

    if (!existing || existing.deletedAt) {
      return { success: false, error: 'Transaksi tidak ditemukan atau sudah dihapus.' }
    }

    // Scoped check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!existing.laporan.scope.kategorialId || !assignedIds.includes(existing.laporan.scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak berhak menghapus transaksi pada buku kas ini.' }
      }
    }

    if (existing.laporan.status === 'CLOSED') {
      return { success: false, error: 'Transaksi tidak dapat dihapus pada periode buku kas yang sudah DITUTUP (CLOSED).' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaksiKeuangan.update({
        where: { id: existing.id },
        data: {
          deletedAt: new Date(),
          deletedBy: actor.name,
          deletionReason: validated.reason.trim(),
        },
      })

      // Recalculate balance
      await recalculateLaporanBalances(existing.laporanId, tx)

      // Audit Log
      await createAuditLog(
        actor.name,
        'TRANSAKSI_KEUANGAN_DELETED',
        'TransaksiKeuangan',
        existing.id,
        JSON.stringify({
          nomorReferensi: existing.nomorReferensi,
          tipe: existing.tipe,
          nominal: Number(existing.nominal),
          reason: validated.reason.trim(),
        }),
        undefined,
        tx
      )
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath(`/dashboard/keuangan/scope/${existing.laporan.scope.code}`)
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Transaksi ${existing.nomorReferensi} berhasil di-soft delete dan saldo buku kas telah dikalkulasi ulang.`,
    }
  } catch (error: any) {
    console.error('Error in deleteTransaksiKeuanganAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus transaksi.' }
  }
}

/**
 * Restore Soft-Deleted Transaksi Keuangan
 */
export async function restoreTransaksiKeuanganAction(input: RestoreTransaksiKeuanganInput) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.delete') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin memulihkan transaksi.' }
    }

    const validated = restoreTransaksiKeuanganSchema.parse(input)
    const existing = await prisma.transaksiKeuangan.findFirst({
      where: { id: validated.id, deletedAt: { not: null } },
      include: { laporan: { include: { scope: true } } },
    })

    if (!existing) {
      return { success: false, error: 'Transaksi terhapus tidak ditemukan.' }
    }

    // Scoped check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!existing.laporan.scope.kategorialId || !assignedIds.includes(existing.laporan.scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak berhak memulihkan transaksi ini.' }
      }
    }

    if (existing.laporan.deletedAt) {
      return {
        success: false,
        error: 'Tidak dapat memulihkan transaksi pada buku kas yang berada di kotak sampah. Pulihkan buku kas terlebih dahulu.',
      }
    }

    if (existing.laporan.status === 'CLOSED') {
      return {
        success: false,
        error: 'Transaksi tidak dapat dipulihkan pada periode buku kas yang sudah DITUTUP (CLOSED). Buka kembali periode terlebih dahulu.',
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaksiKeuangan.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      })

      // Recalculate balance
      await recalculateLaporanBalances(existing.laporanId, tx)

      // Audit Log
      await createAuditLog(
        actor.name,
        'TRANSAKSI_KEUANGAN_RESTORED',
        'TransaksiKeuangan',
        existing.id,
        `Restored transaction ${existing.nomorReferensi}`,
        undefined,
        tx
      )
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath(`/dashboard/keuangan/scope/${existing.laporan.scope.code}`)
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Transaksi ${existing.nomorReferensi} berhasil dipulihkan.`,
    }
  } catch (error: any) {
    console.error('Error in restoreTransaksiKeuanganAction:', error)
    return { success: false, error: error?.message || 'Gagal memulihkan transaksi.' }
  }
}

/**
 * Hard Delete Transaksi Keuangan Permanently
 */
export async function hardDeleteTransaksiKeuanganAction(input: HardDeleteTransaksiKeuanganInput) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.delete') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus permanen transaksi.' }
    }

    const validated = hardDeleteTransaksiKeuanganSchema.parse(input)
    const existing = await prisma.transaksiKeuangan.findUnique({
      where: { id: validated.id },
      include: { laporan: { include: { scope: true } } },
    })

    if (!existing) {
      return { success: false, error: 'Transaksi tidak ditemukan di database.' }
    }

    // Scoped check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!existing.laporan.scope.kategorialId || !assignedIds.includes(existing.laporan.scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak berhak menghapus transaksi ini.' }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaksiKeuangan.delete({
        where: { id: existing.id },
      })

      // Recalculate balance
      await recalculateLaporanBalances(existing.laporanId, tx)

      // Audit Log
      await createAuditLog(
        actor.name,
        'TRANSAKSI_KEUANGAN_PERMANENTLY_DELETED',
        'TransaksiKeuangan',
        existing.id,
        `Permanently deleted transaction ${existing.nomorReferensi} from database.`,
        undefined,
        tx
      )
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath(`/dashboard/keuangan/scope/${existing.laporan.scope.code}`)
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Transaksi ${existing.nomorReferensi} berhasil dihapus permanen dari database.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeleteTransaksiKeuanganAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus permanen transaksi.' }
  }
}

/**
 * Bulk Finalize / Close Period for Financial Reports
 */
export async function bulkFinalizeLaporanAction(data: { ids: string[] }) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.close') && !hasPermission(actor.role, 'keuangan.create') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menutup buku periode.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada laporan keuangan yang dipilih.' }
    }

    const { ids } = data

    await prisma.$transaction(async (tx) => {
      // Loop to recalculate and close
      for (const id of ids) {
        const laporan = await tx.laporanKeuangan.findUnique({
          where: { id },
          include: { scope: true },
        })
        if (!laporan || laporan.status === 'CLOSED') continue

        // Scoped check for BENDAHARA_KATEGORIAL
        if (actor.role === 'BENDAHARA_KATEGORIAL') {
          const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
          if (!laporan.scope.kategorialId || !assignedIds.includes(laporan.scope.kategorialId)) {
            continue
          }
        }

        const aggregates = await tx.transaksiKeuangan.groupBy({
          by: ['tipe'],
          where: { laporanId: id, deletedAt: null },
          _sum: { nominal: true },
        })

        let totalPemasukan = new Prisma.Decimal(0)
        let totalPengeluaran = new Prisma.Decimal(0)

        aggregates.forEach((agg) => {
          if (agg.tipe === 'MASUK' && agg._sum.nominal) {
            totalPemasukan = agg._sum.nominal
          } else if (agg.tipe === 'KELUAR' && agg._sum.nominal) {
            totalPengeluaran = agg._sum.nominal
          }
        })

        const saldoAkhir = laporan.saldoAwal.plus(totalPemasukan).minus(totalPengeluaran)

        await tx.laporanKeuangan.update({
          where: { id },
          data: {
            totalPemasukan,
            totalPengeluaran,
            saldoAkhir,
            status: 'CLOSED',
            closedAt: new Date(),
            closedBy: actor.name,
          },
        })
      }

      await createAuditLog(
        actor.name,
        'FINALIZE_BULK_LAPORAN',
        'LaporanKeuangan',
        `${ids.length}_RECORDS`,
        `Tutup buku massal (${ids.length} laporan pos keuangan).`,
        undefined,
        tx
      )
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Berhasil memfinalisasi dan menutup buku untuk ${ids.length} laporan keuangan terpilih.`,
    }
  } catch (error: any) {
    console.error('Error in bulkFinalizeLaporanAction:', error)
    return { success: false, error: error?.message || 'Gagal menutup buku laporan keuangan terpilih.' }
  }
}

/**
 * Bulk Reopen Closed Financial Reports with Reason
 */
export async function bulkReopenLaporanAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.reopen') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin membuka kembali periode keuangan.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada laporan keuangan yang dipilih.' }
    }

    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan buka buku massal wajib diisi.' }
    }

    const { ids, reason } = data

    await prisma.$transaction(async (tx) => {
      // Check scope ownership for kategorials
      if (actor.role === 'BENDAHARA_KATEGORIAL') {
        const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
        const laporans = await tx.laporanKeuangan.findMany({ where: { id: { in: ids } }, include: { scope: true } })
        for (const lap of laporans) {
          if (!lap.scope.kategorialId || !assignedIds.includes(lap.scope.kategorialId)) {
            return { success: false, error: `Akses ditolak: Anda tidak berhak membuka kembali laporan ${lap.scope.name}.` }
          }
        }
      }

      await tx.laporanKeuangan.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'DRAFT',
          reopenReason: reason.trim(),
          closedAt: null,
          closedBy: null,
        },
      })

      await createAuditLog(
        actor.name,
        'REOPEN_BULK_LAPORAN',
        'LaporanKeuangan',
        `${ids.length}_RECORDS`,
        `Buka buku massal (${ids.length} laporan). Alasan: ${reason.trim()}`,
        undefined,
        tx
      )
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `Berhasil membuka kembali ${ids.length} laporan keuangan terpilih.`,
    }
  } catch (error: any) {
    console.error('Error in bulkReopenLaporanAction:', error)
    return { success: false, error: error?.message || 'Gagal membuka kembali laporan keuangan terpilih.' }
  }
}

/**
 * Bulk Soft Delete Financial Reports
 */
export async function bulkSoftDeleteLaporanAction(data: {
  ids: string[]
  reason: string
}) {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.delete') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus laporan keuangan.' }
    }

    if (!data.ids || data.ids.length === 0) {
      return { success: false, error: 'Tidak ada laporan keuangan yang dipilih.' }
    }

    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: 'Alasan penghapusan massal wajib diisi.' }
    }

    const { ids, reason } = data

    await prisma.$transaction(async (tx) => {
      // Check scope ownership for kategorials
      if (actor.role === 'BENDAHARA_KATEGORIAL') {
        const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
        const laporans = await tx.laporanKeuangan.findMany({ where: { id: { in: ids } }, include: { scope: true } })
        for (const lap of laporans) {
          if (!lap.scope.kategorialId || !assignedIds.includes(lap.scope.kategorialId)) {
            return { success: false, error: `Akses ditolak: Anda tidak berhak menghapus laporan ${lap.scope.name}.` }
          }
        }
      }

      await tx.laporanKeuangan.updateMany({
        where: { id: { in: ids } },
        data: {
          deletedAt: new Date(),
          deletedBy: actor.name,
          deletionReason: reason.trim(),
        },
      })

      await createAuditLog(
        actor.name,
        'DELETE_BULK_SOFT',
        'LaporanKeuangan',
        `${ids.length}_RECORDS`,
        `Soft delete massal (${ids.length} laporan keuangan). Alasan: ${reason.trim()}`,
        undefined,
        tx
      )
    })

    safeRevalidatePath('/dashboard/keuangan')
    safeRevalidatePath('/dashboard/keuangan/laporan-gabungan')

    return {
      success: true,
      message: `${ids.length} laporan keuangan berhasil dipindahkan ke kotak sampah.`,
    }
  } catch (error: any) {
    console.error('Error in bulkSoftDeleteLaporanAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus laporan keuangan terpilih.' }
  }
}

/**
 * Get Full Financial Reports for Official A4 Print Summary Sheets
 */
export async function getLaporanForPrintSheetsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada laporan yang dipilih.', data: [] }
    }

    const items = await prisma.laporanKeuangan.findMany({
      where: { id: { in: ids } },
      include: {
        scope: true,
        _count: {
          select: { transaksi: true },
        },
      },
      orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }, { scope: { name: 'asc' } }],
    })

    const formatted: LaporanKeuanganDTO[] = items.map((item) => ({
      id: item.id,
      scopeId: item.scopeId,
      scopeCode: item.scope.code,
      scopeName: item.scope.name,
      bulan: item.bulan,
      tahun: item.tahun,
      saldoAwal: Number(item.saldoAwal),
      totalPemasukan: Number(item.totalPemasukan),
      totalPengeluaran: Number(item.totalPengeluaran),
      saldoAkhir: Number(item.saldoAkhir),
      status: item.status,
      reopenReason: item.reopenReason,
      closedAt: item.closedAt ? item.closedAt.toISOString() : null,
      closedBy: item.closedBy,
      deletedAt: item.deletedAt ? item.deletedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      transaksiCount: item._count.transaksi,
    }))

    return {
      success: true,
      data: formatted,
    }
  } catch (error: any) {
    console.error('Error in getLaporanForPrintSheetsAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat data lembar laporan keuangan.', data: [] }
  }
}

export type ScopeBookPrintDataDTO = {
  scope: {
    id: string
    code: string
    name: string
    description: string | null
  }
  summary: {
    totalPeriods: number
    totalPemasukan: number
    totalPengeluaran: number
    saldoAwalPertama: number
    saldoAkhirTerkini: number
    tahunList: number[]
  }
  periods: {
    id: string
    bulan: number
    tahun: number
    saldoAwal: number
    totalPemasukan: number
    totalPengeluaran: number
    saldoAkhir: number
    status: StatusPeriode
    transaksiPemasukan: TransaksiKeuanganDTO[]
    transaksiPengeluaran: TransaksiKeuanganDTO[]
  }[]
}

/**
 * Get Compiled Full Multi-Period Book Data for a Scope (Buku Bundel LPJ Kas)
 */
export async function getScopeFullBookPrintDataAction(params: {
  scopeIdOrCode: string
  tahun?: number
}): Promise<{
  success: boolean
  data?: ScopeBookPrintDataDTO
  error?: string
}> {
  try {
    const actor = await getKeuanganActor()
    if (!hasPermission(actor.role, 'keuangan.read')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keuangan.read.' }
    }

    const scope = await prisma.scopeKeuangan.findFirst({
      where: {
        OR: [{ id: params.scopeIdOrCode }, { code: params.scopeIdOrCode.toUpperCase() }],
      },
    })

    if (!scope) {
      return { success: false, error: 'Pos kas tidak ditemukan.' }
    }

    // Scoped RBAC Check for BENDAHARA_KATEGORIAL
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      const assignedIds = actor.kategorialScopes.map((s) => s.kategorialId).filter(Boolean) as string[]
      if (!scope.kategorialId || !assignedIds.includes(scope.kategorialId)) {
        return { success: false, error: 'Akses ditolak: Anda tidak berhak mencetak buku kas pos ini.' }
      }
    }

    const whereLaporan: Prisma.LaporanKeuanganWhereInput = {
      scopeId: scope.id,
      deletedAt: null,
    }

    if (params.tahun) {
      whereLaporan.tahun = params.tahun
    }

    const laporans = await prisma.laporanKeuangan.findMany({
      where: whereLaporan,
      orderBy: [{ tahun: 'asc' }, { bulan: 'asc' }],
      include: {
        transaksi: {
          where: { deletedAt: null },
          orderBy: [{ tanggal: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    if (laporans.length === 0) {
      return { success: false, error: 'Belum ada data periode pembukuan untuk pos kas ini.' }
    }

    let grandTotalPemasukan = 0
    let grandTotalPengeluaran = 0
    const tahunSet = new Set<number>()

    const formattedPeriods = laporans.map((lap) => {
      grandTotalPemasukan += Number(lap.totalPemasukan)
      grandTotalPengeluaran += Number(lap.totalPengeluaran)
      tahunSet.add(lap.tahun)

      const pemasukan = lap.transaksi
        .filter((t) => t.tipe === 'MASUK')
        .map((t) => toPlainTransaksi(t))
      const pengeluaran = lap.transaksi
        .filter((t) => t.tipe === 'KELUAR')
        .map((t) => toPlainTransaksi(t))

      return {
        id: lap.id,
        bulan: lap.bulan,
        tahun: lap.tahun,
        saldoAwal: Number(lap.saldoAwal),
        totalPemasukan: Number(lap.totalPemasukan),
        totalPengeluaran: Number(lap.totalPengeluaran),
        saldoAkhir: Number(lap.saldoAkhir),
        status: lap.status,
        transaksiPemasukan: pemasukan,
        transaksiPengeluaran: pengeluaran,
      }
    })

    const saldoAwalPertama = Number(laporans[0].saldoAwal)
    const saldoAkhirTerkini = Number(laporans[laporans.length - 1].saldoAkhir)

    return {
      success: true,
      data: {
        scope: {
          id: scope.id,
          code: scope.code,
          name: scope.name,
          description: scope.description,
        },
        summary: {
          totalPeriods: laporans.length,
          totalPemasukan: grandTotalPemasukan,
          totalPengeluaran: grandTotalPengeluaran,
          saldoAwalPertama,
          saldoAkhirTerkini,
          tahunList: Array.from(tahunSet).sort((a, b) => b - a),
        },
        periods: formattedPeriods,
      },
    }
  } catch (error: any) {
    console.error('Error in getScopeFullBookPrintDataAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat bundel buku kas pos pelayanan.' }
  }
}

export type ConsolidatedBookPrintDataDTO = {
  tahun: number
  bulan: number | null
  totalSaldoAwal: number
  totalPemasukan: number
  totalPengeluaran: number
  totalSaldoAkhir: number
  scopes: {
    scopeId: string
    scopeCode: string
    scopeName: string
    saldoAwal: number
    totalPemasukan: number
    totalPengeluaran: number
    saldoAkhir: number
    status: string
    transaksiPemasukan: TransaksiKeuanganDTO[]
    transaksiPengeluaran: TransaksiKeuanganDTO[]
  }[]
}

/**
 * Get Full Multi-Scope Consolidated Book Print Data for the entire church
 * Restrict: Super Admin, Gembala, and Central Treasurer only
 */
export async function getConsolidatedFullBookPrintDataAction(params: {
  tahun: number
  bulan?: number
}): Promise<{
  success: boolean
  data?: ConsolidatedBookPrintDataDTO
  error?: string
}> {
  try {
    const actor = await getKeuanganActor()
    if (actor.role === 'BENDAHARA_KATEGORIAL') {
      return { success: false, error: 'Akses ditolak: Laporan gabungan konsolidasi gereja hanya dapat diakses oleh Bendahara Pusat dan Gembala.' }
    }

    if (!hasPermission(actor.role, 'keuangan.read')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin keuangan.read.' }
    }

    const where: Prisma.LaporanKeuanganWhereInput = {
      tahun: params.tahun,
      deletedAt: null,
    }
    if (params.bulan) {
      where.bulan = params.bulan
    }

    const scopes = await prisma.scopeKeuangan.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    const laporans = await prisma.laporanKeuangan.findMany({
      where,
      include: {
        scope: true,
        transaksi: {
          where: { deletedAt: null },
          orderBy: [{ tanggal: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ scope: { name: 'asc' } }, { bulan: 'asc' }],
    })

    let grandSaldoAwal = 0
    let grandPemasukan = 0
    let grandPengeluaran = 0
    let grandSaldoAkhir = 0

    const scopeMap: Record<string, {
      scopeId: string
      scopeCode: string
      scopeName: string
      saldoAwal: number
      totalPemasukan: number
      totalPengeluaran: number
      saldoAkhir: number
      status: string
      transaksiPemasukan: TransaksiKeuanganDTO[]
      transaksiPengeluaran: TransaksiKeuanganDTO[]
    }> = {}

    scopes.forEach((sc) => {
      scopeMap[sc.id] = {
        scopeId: sc.id,
        scopeCode: sc.code,
        scopeName: sc.name,
        saldoAwal: 0,
        totalPemasukan: 0,
        totalPengeluaran: 0,
        saldoAkhir: 0,
        status: 'DRAFT',
        transaksiPemasukan: [],
        transaksiPengeluaran: [],
      }
    })

    laporans.forEach((lap) => {
      const target = scopeMap[lap.scopeId]
      if (target) {
        target.saldoAwal += Number(lap.saldoAwal)
        target.totalPemasukan += Number(lap.totalPemasukan)
        target.totalPengeluaran += Number(lap.totalPengeluaran)
        target.saldoAkhir += Number(lap.saldoAkhir)
        if (lap.status === 'CLOSED') target.status = 'CLOSED'

        lap.transaksi.forEach((t) => {
          if (t.tipe === 'MASUK') {
            target.transaksiPemasukan.push(toPlainTransaksi(t))
          } else {
            target.transaksiPengeluaran.push(toPlainTransaksi(t))
          }
        })
      }
    })

    const resultScopes = Object.values(scopeMap)
    resultScopes.forEach((s) => {
      grandSaldoAwal += s.saldoAwal
      grandPemasukan += s.totalPemasukan
      grandPengeluaran += s.totalPengeluaran
      grandSaldoAkhir += s.saldoAkhir
    })

    return {
      success: true,
      data: {
        tahun: params.tahun,
        bulan: params.bulan || null,
        totalSaldoAwal: grandSaldoAwal,
        totalPemasukan: grandPemasukan,
        totalPengeluaran: grandPengeluaran,
        totalSaldoAkhir: grandSaldoAkhir,
        scopes: resultScopes,
      },
    }
  } catch (error: any) {
    console.error('Error in getConsolidatedFullBookPrintDataAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat data buku LPJ konsolidasi.' }
  }
}
