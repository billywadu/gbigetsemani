'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { Role } from '@/config/navigation'
import { hasPermission } from '@/lib/permissions'
import { createCryptographicAuditLog } from '@/lib/security/audit'
import { getCurrentStaffSession } from '@/lib/security/session'
import {
  createUserSchema,
  updateUserSchema,
  resetUserPasswordSchema,
  toggleUserStatusSchema,
  deleteUserSchema,
  restoreUserSchema,
  hardDeleteUserSchema,
  userFilterSchema,
  CreateUserInput,
  UpdateUserInput,
  ResetUserPasswordInput,
  ToggleUserStatusInput,
  DeleteUserInput,
  RestoreUserInput,
  HardDeleteUserInput,
  UserFilterParams,
} from '@/lib/validations/users'

export interface UserDTO {
  id: string
  username: string
  email: string
  nama: string
  role: Role
  status: 'AKTIF' | 'NONAKTIF' | 'SUSPENDED'
  noHp: string | null
  fotoUrl: string | null
  lastLoginAt: string | null
  lastLoginIp: string | null
  deletedAt: string | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: string
  updatedAt: string
  kategorialScopes?: {
    id: string
    kategorialId: string
    namaKategorial: string
  }[]
}

export interface UserStatsSummary {
  totalStaff: number
  totalActive: number
  totalInactive: number
  roleBreakdown: {
    superAdmin: number
    gembala: number
    sekretaris: number
    bendahara: number
    sekretarisKategorial: number
    bendaharaKategorial: number
    usher: number
  }
}

export interface AuditActivityDTO {
  id: string
  action: string
  entity: string
  entityId: string
  timestamp: string
  actor: string
  ip: string
  currentHash: string
}

/**
 * Helper to get current staff role and actor info safely
 */
async function getAuthenticatedActor() {
  try {
    const session = await getCurrentStaffSession()
    if (session && session.user) {
      return {
        userId: session.user.id,
        name: session.user.nama || session.user.username,
        username: session.user.username,
        role: session.user.role as Role,
      }
    }
  } catch {}

  // Fallback to active admin user from DB if available
  const adminUser = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN', deletedAt: null },
    select: { id: true, nama: true, username: true, role: true },
  })

  if (adminUser) {
    return {
      userId: adminUser.id,
      name: adminUser.nama,
      username: adminUser.username,
      role: adminUser.role as Role,
    }
  }

  return {
    userId: undefined,
    name: 'Super Administrator',
    username: 'admin',
    role: 'SUPER_ADMIN' as Role,
  }
}

/**
 * 1. Get Paginated User List with Search, Filter & Stats
 * Requires PBAC permission: user.read (SUPER_ADMIN)
 */
export async function getUserListAction(params?: UserFilterParams) {
  try {
    const actor = await getAuthenticatedActor()
    if (!hasPermission(actor.role, 'user.read') && actor.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Akses ditolak: Anda tidak memiliki izin untuk melihat pengelolaan pengguna.',
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
        stats: {
          totalStaff: 0,
          totalActive: 0,
          totalInactive: 0,
          roleBreakdown: {
            superAdmin: 0,
            gembala: 0,
            sekretaris: 0,
            bendahara: 0,
            sekretarisKategorial: 0,
            bendaharaKategorial: 0,
            usher: 0,
          },
        },
      }
    }

    const validated = userFilterSchema.parse(params || {})
    const { search, role, status, statusHapus = 'ACTIVE', page, pageSize } = validated

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
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (role && role !== 'ALL') {
      whereClause.role = role as any
    }

    if (status && status !== 'ALL') {
      whereClause.status = status as any
    }

    const skip = (page - 1) * pageSize

    // Execute queries in parallel
    const [users, total, allNonDeleted] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          username: true,
          email: true,
          nama: true,
          role: true,
          status: true,
          noHp: true,
          fotoUrl: true,
          lastLoginAt: true,
          lastLoginIp: true,
          deletedAt: true,
          deletedBy: true,
          deletionReason: true,
          createdAt: true,
          updatedAt: true,
          kategorialScopes: {
            select: {
              id: true,
              kategorialId: true,
              kategorial: {
                select: {
                  id: true,
                  nama: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: { deletedAt: null },
        select: { role: true, status: true },
      }),
    ])

    const totalPages = Math.ceil(total / pageSize)

    // Calculate live summary statistics
    let totalActive = 0
    let totalInactive = 0
    const roleBreakdown = {
      superAdmin: 0,
      gembala: 0,
      sekretaris: 0,
      bendahara: 0,
      sekretarisKategorial: 0,
      bendaharaKategorial: 0,
      usher: 0,
    }

    for (const u of allNonDeleted) {
      if (u.status === 'AKTIF') totalActive++
      else totalInactive++

      if (u.role === 'SUPER_ADMIN') roleBreakdown.superAdmin++
      else if (u.role === 'GEMBALA') roleBreakdown.gembala++
      else if (u.role === 'SEKRETARIS') roleBreakdown.sekretaris++
      else if (u.role === 'BENDAHARA') roleBreakdown.bendahara++
      else if (u.role === 'SEKRETARIS_KATEGORIAL') roleBreakdown.sekretarisKategorial++
      else if (u.role === 'BENDAHARA_KATEGORIAL') roleBreakdown.bendaharaKategorial++
      else if (u.role === 'USHER') roleBreakdown.usher++
    }

    const safeUsers: UserDTO[] = users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email || '',
      nama: u.nama,
      role: u.role as Role,
      status: u.status as 'AKTIF' | 'NONAKTIF' | 'SUSPENDED',
      noHp: u.noHp || null,
      fotoUrl: u.fotoUrl || null,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      lastLoginIp: u.lastLoginIp || null,
      deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
      deletedBy: u.deletedBy || null,
      deletionReason: u.deletionReason || null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      kategorialScopes: u.kategorialScopes?.map((s) => ({
        id: s.id,
        kategorialId: s.kategorialId,
        namaKategorial: s.kategorial?.nama || '',
      })) || [],
    }))

    return {
      success: true,
      data: safeUsers,
      total,
      page,
      pageSize,
      totalPages,
      stats: {
        totalStaff: allNonDeleted.length,
        totalActive,
        totalInactive,
        roleBreakdown,
      },
    }
  } catch (error: any) {
    console.error('Error in getUserListAction:', error)
    return {
      success: false,
      error: error?.message || 'Gagal memuat daftar pengguna.',
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      stats: {
        totalStaff: 0,
        totalActive: 0,
        totalInactive: 0,
        roleBreakdown: {
          superAdmin: 0,
          gembala: 0,
          sekretaris: 0,
          bendahara: 0,
          sekretarisKategorial: 0,
          bendaharaKategorial: 0,
          usher: 0,
        },
      },
    }
  }
}

/**
 * 2. Get User by ID with Audit Activity Trail
 * Requires PBAC permission: user.read (SUPER_ADMIN)
 */
export async function getUserByIdAction(id: string) {
  try {
    const actor = await getAuthenticatedActor()
    if (!hasPermission(actor.role, 'user.read') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin melihat detail pengguna.' }
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        username: true,
        email: true,
        nama: true,
        role: true,
        status: true,
        noHp: true,
        fotoUrl: true,
        lastLoginAt: true,
        lastLoginIp: true,
        deletedAt: true,
        deletedBy: true,
        deletionReason: true,
        createdAt: true,
        updatedAt: true,
        kategorialScopes: {
          select: {
            id: true,
            kategorialId: true,
            kategorial: {
              select: {
                id: true,
                nama: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return { success: false, error: 'Pengguna tidak ditemukan atau telah dihapus.' }
    }

    // Fetch 20 latest audit logs performed by this user
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { userId: id },
          { actor: user.nama },
          { actor: { contains: user.username, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        timestamp: true,
        actor: true,
        ip: true,
        currentHash: true,
      },
    })

    const safeUser: UserDTO = {
      id: user.id,
      username: user.username,
      email: user.email || '',
      nama: user.nama,
      role: user.role as Role,
      status: user.status as 'AKTIF' | 'NONAKTIF' | 'SUSPENDED',
      noHp: user.noHp || null,
      fotoUrl: user.fotoUrl || null,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      lastLoginIp: user.lastLoginIp || null,
      deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
      deletedBy: user.deletedBy || null,
      deletionReason: user.deletionReason || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      kategorialScopes: user.kategorialScopes?.map((s) => ({
        id: s.id,
        kategorialId: s.kategorialId,
        namaKategorial: s.kategorial?.nama || '',
      })) || [],
    }

    const formattedLogs: AuditActivityDTO[] = auditLogs.map((l) => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      timestamp: l.timestamp.toISOString(),
      actor: l.actor,
      ip: l.ip,
      currentHash: l.currentHash,
    }))

    return {
      success: true,
      data: safeUser,
      auditLogs: formattedLogs,
    }
  } catch (error: any) {
    console.error('Error in getUserByIdAction:', error)
    return { success: false, error: error?.message || 'Gagal memuat detail pengguna.' }
  }
}

/**
 * 3. Create New Staff User with Bcrypt Hash & Cryptographic SHA-256 Audit Trail
 * Requires PBAC permission: user.create (SUPER_ADMIN)
 */
export async function createUserAction(input: CreateUserInput) {
  try {
    const actor = await getAuthenticatedActor()
    if (!hasPermission(actor.role, 'user.create') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang membuat akun staf baru.' }
    }

    const validated = createUserSchema.parse(input)
    const cleanUsername = validated.username.trim().toLowerCase()
    const cleanEmail = validated.email.trim().toLowerCase()

    // Check duplicate username
    const existingUsername = await prisma.user.findFirst({
      where: {
        username: { equals: cleanUsername, mode: 'insensitive' },
        deletedAt: null,
      },
    })
    if (existingUsername) {
      return { success: false, error: `Username '${cleanUsername}' sudah digunakan oleh pengguna lain.` }
    }

    // Check duplicate email
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        deletedAt: null,
      },
    })
    if (existingEmail) {
      return { success: false, error: `Email '${cleanEmail}' sudah terdaftar pada akun lain.` }
    }

    // Hash password with Bcrypt Salt 10
    const passwordHash = await bcrypt.hash(validated.password, 10)

    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          nama: validated.nama.trim(),
          username: cleanUsername,
          email: cleanEmail,
          passwordHash,
          role: validated.role as any,
          status: validated.status as any,
          isActive: validated.status === 'AKTIF',
          noHp: validated.noHp?.trim() || null,
          fotoUrl: validated.fotoUrl || null,
        },
        select: {
          id: true,
          username: true,
          email: true,
          nama: true,
          role: true,
          status: true,
          noHp: true,
          fotoUrl: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (
        (validated.role === 'SEKRETARIS_KATEGORIAL' || validated.role === 'BENDAHARA_KATEGORIAL') &&
        validated.kategorialIds &&
        validated.kategorialIds.length > 0
      ) {
        await tx.userKategorialScope.createMany({
          data: validated.kategorialIds.map((kId) => ({
            userId: newUser.id,
            kategorialId: kId,
          })),
        })
      }

      return newUser
    })

    // Record SHA-256 Cryptographic Audit Log (No password in payload!)
    await createCryptographicAuditLog(
      actor.name,
      'USER_CREATED',
      'User',
      created.id,
      {
        nama: created.nama,
        username: created.username,
        email: created.email,
        role: created.role,
        status: created.status,
      },
      actor.userId
    )

    try {
      revalidatePath('/dashboard/users')
    } catch {}

    const safeUser: UserDTO = {
      id: created.id,
      username: created.username,
      email: created.email || '',
      nama: created.nama,
      role: created.role as Role,
      status: created.status as 'AKTIF' | 'NONAKTIF' | 'SUSPENDED',
      noHp: created.noHp || null,
      fotoUrl: created.fotoUrl || null,
      lastLoginAt: null,
      lastLoginIp: null,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    }

    return {
      success: true,
      data: safeUser,
      message: `Akun staf ${created.nama} (@${created.username}) berhasil didaftarkan!`,
    }
  } catch (error: any) {
    console.error('Error in createUserAction:', error)
    return { success: false, error: error?.message || 'Gagal mendaftarkan pengguna baru.' }
  }
}

/**
 * 4. Update Staff User Details with Last Super Admin Role Protection & Audit Trail
 * Requires PBAC permission: user.update (SUPER_ADMIN)
 */
export async function updateUserAction(input: UpdateUserInput) {
  try {
    const actor = await getAuthenticatedActor()
    if (!hasPermission(actor.role, 'user.update') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mengubah data akun pengguna.' }
    }

    const validated = updateUserSchema.parse(input)
    const { id, nama, email, noHp, role, fotoUrl } = validated
    const cleanEmail = email.trim().toLowerCase()

    const targetUser = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    })
    if (!targetUser) {
      return { success: false, error: 'Pengguna tidak ditemukan atau telah dihapus.' }
    }

    // Check duplicate email
    if (cleanEmail !== targetUser.email?.toLowerCase()) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: { equals: cleanEmail, mode: 'insensitive' },
          id: { not: id },
          deletedAt: null,
        },
      })
      if (emailExists) {
        return { success: false, error: `Email '${cleanEmail}' sudah digunakan akun lain.` }
      }
    }

    // Security Check: Last Super Admin Protection when changing role
    if (targetUser.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      const activeSuperAdminCount = await prisma.user.count({
        where: {
          role: 'SUPER_ADMIN',
          status: 'AKTIF',
          deletedAt: null,
        },
      })
      if (activeSuperAdminCount <= 1) {
        return {
          success: false,
          error: 'Tidak dapat mengubah peran Super Admin terakhir. Minimal harus terdapat 1 Super Admin aktif di dalam sistem.',
        }
      }
    }

    const beforeState = {
      nama: targetUser.nama,
      email: targetUser.email,
      role: targetUser.role,
      noHp: targetUser.noHp,
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          nama: nama.trim(),
          email: cleanEmail,
          noHp: noHp?.trim() || null,
          role: role as any,
          fotoUrl: fotoUrl || targetUser.fotoUrl,
        },
        select: {
          id: true,
          username: true,
          email: true,
          nama: true,
          role: true,
          status: true,
          noHp: true,
          fotoUrl: true,
          lastLoginAt: true,
          lastLoginIp: true,
          deletedAt: true,
          deletedBy: true,
          deletionReason: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // Sync kategorial scopes
      await tx.userKategorialScope.deleteMany({ where: { userId: id } })
      if (
        (role === 'SEKRETARIS_KATEGORIAL' || role === 'BENDAHARA_KATEGORIAL') &&
        validated.kategorialIds &&
        validated.kategorialIds.length > 0
      ) {
        await tx.userKategorialScope.createMany({
          data: validated.kategorialIds.map((kId) => ({
            userId: id,
            kategorialId: kId,
          })),
        })
      }

      return u
    })

    const afterState = {
      nama: updated.nama,
      email: updated.email,
      role: updated.role,
      noHp: updated.noHp,
    }

    // Record SHA-256 Audit Trail
    await createCryptographicAuditLog(
      actor.name,
      'USER_UPDATED',
      'User',
      updated.id,
      { beforeState, afterState },
      actor.userId
    )

    try {
      revalidatePath('/dashboard/users')
      revalidatePath(`/dashboard/users/${id}`)
    } catch {}

    const safeUser: UserDTO = {
      id: updated.id,
      username: updated.username,
      email: updated.email || '',
      nama: updated.nama,
      role: updated.role as Role,
      status: updated.status as 'AKTIF' | 'NONAKTIF' | 'SUSPENDED',
      noHp: updated.noHp || null,
      fotoUrl: updated.fotoUrl || null,
      lastLoginAt: updated.lastLoginAt ? updated.lastLoginAt.toISOString() : null,
      lastLoginIp: updated.lastLoginIp || null,
      deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
      deletedBy: updated.deletedBy || null,
      deletionReason: updated.deletionReason || null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }

    return {
      success: true,
      data: safeUser,
      message: `Data akun ${updated.nama} berhasil diperbarui!`,
    }
  } catch (error: any) {
    console.error('Error in updateUserAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui data pengguna.' }
  }
}

/**
 * 5. Reset User Password with Bcrypt Hash & Session Invalidation
 * Requires PBAC permission: user.update (SUPER_ADMIN)
 */
export async function resetUserPasswordAction(input: ResetUserPasswordInput) {
  try {
    const actor = await getAuthenticatedActor()
    if (!hasPermission(actor.role, 'user.update') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin untuk mengatur ulang kata sandi.' }
    }

    const validated = resetUserPasswordSchema.parse(input)
    const { userId, newPassword } = validated

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    })
    if (!targetUser) {
      return { success: false, error: 'Pengguna tidak ditemukan atau telah dihapus.' }
    }

    // Hash new password with Bcrypt Salt 10
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password hash and reset lockout counters
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      },
    })

    // Invalidate existing sessions for security
    await prisma.session.deleteMany({
      where: { userId },
    })

    // Record SHA-256 Audit Trail (NEVER log password plaintext or hash!)
    await createCryptographicAuditLog(
      actor.name,
      'USER_PASSWORD_RESET',
      'User',
      userId,
      {
        targetUsername: targetUser.username,
        resetBy: actor.name,
        timestamp: new Date().toISOString(),
      },
      actor.userId
    )

    try {
      revalidatePath('/dashboard/users')
      revalidatePath(`/dashboard/users/${userId}`)
    } catch {}

    return {
      success: true,
      message: `Kata sandi untuk @${targetUser.username} berhasil diatur ulang. Seluruh sesi login sebelumnya telah diakhiri.`,
    }
  } catch (error: any) {
    console.error('Error in resetUserPasswordAction:', error)
    return { success: false, error: error?.message || 'Gagal mengatur ulang kata sandi pengguna.' }
  }
}

/**
 * 6. Toggle User Status (AKTIF / NONAKTIF / SUSPENDED) with Last Super Admin Lock
 * Requires PBAC permission: user.update (SUPER_ADMIN)
 */
export async function toggleUserStatusAction(input: ToggleUserStatusInput) {
  try {
    const actor = await getAuthenticatedActor()
    if (!hasPermission(actor.role, 'user.update') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mengubah status pengguna.' }
    }

    const validated = toggleUserStatusSchema.parse(input)
    const { id, status } = validated

    const targetUser = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    })
    if (!targetUser) {
      return { success: false, error: 'Pengguna tidak ditemukan atau telah dihapus.' }
    }

    // Security Check: Last Super Admin Lock when deactivating
    if (targetUser.role === 'SUPER_ADMIN' && status !== 'AKTIF') {
      const activeSuperAdminCount = await prisma.user.count({
        where: {
          role: 'SUPER_ADMIN',
          status: 'AKTIF',
          deletedAt: null,
        },
      })
      if (activeSuperAdminCount <= 1) {
        return {
          success: false,
          error: 'Tidak dapat menonaktifkan Super Admin terakhir. Minimal harus terdapat 1 Super Admin aktif di dalam sistem.',
        }
      }
    }

    await prisma.user.update({
      where: { id },
      data: {
        status: status as any,
        isActive: status === 'AKTIF',
      },
    })

    // If status is changed to inactive, delete active sessions
    if (status !== 'AKTIF') {
      await prisma.session.deleteMany({
        where: { userId: id },
      })
    }

    // Record SHA-256 Audit Trail
    await createCryptographicAuditLog(
      actor.name,
      'USER_STATUS_TOGGLED',
      'User',
      id,
      {
        username: targetUser.username,
        previousStatus: targetUser.status,
        newStatus: status,
      },
      actor.userId
    )

    try {
      revalidatePath('/dashboard/users')
      revalidatePath(`/dashboard/users/${id}`)
    } catch {}

    return {
      success: true,
      message: `Status akun @${targetUser.username} berhasil diubah menjadi ${status}.`,
    }
  } catch (error: any) {
    console.error('Error in toggleUserStatusAction:', error)
    return { success: false, error: error?.message || 'Gagal mengubah status akun pengguna.' }
  }
}

/**
 * 7. Soft Delete User with Self-Deletion & Last Super Admin Protection
 * Requires PBAC permission: user.delete (SUPER_ADMIN)
 */
export async function deleteUserAction(input: DeleteUserInput) {
  try {
    const actor = await getAuthenticatedActor()
    if (!hasPermission(actor.role, 'user.delete') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang menghapus akun pengguna.' }
    }

    const validated = deleteUserSchema.parse(input)
    const { id, reason } = validated

    // 1. Self-Deletion Prevention
    if (actor.userId === id) {
      return {
        success: false,
        error: 'Anda tidak dapat menghapus akun Anda sendiri demi keamanan sistem.',
      }
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    })
    if (!targetUser) {
      return { success: false, error: 'Pengguna tidak ditemukan atau sudah dihapus.' }
    }

    // 2. Last Super Admin Lock
    if (targetUser.role === 'SUPER_ADMIN') {
      const activeSuperAdminCount = await prisma.user.count({
        where: {
          role: 'SUPER_ADMIN',
          status: 'AKTIF',
          deletedAt: null,
        },
      })
      if (activeSuperAdminCount <= 1) {
        return {
          success: false,
          error: 'Tidak dapat menghapus Super Admin terakhir. Minimal harus terdapat 1 Super Admin aktif di dalam sistem.',
        }
      }
    }

    // 3. Soft delete user
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actor.name,
        deletionReason: reason.trim(),
        status: 'NONAKTIF',
        isActive: false,
      },
    })

    // Invalidate sessions
    await prisma.session.deleteMany({
      where: { userId: id },
    })

    // Record SHA-256 Audit Trail
    await createCryptographicAuditLog(
      actor.name,
      'USER_DELETED',
      'User',
      id,
      {
        deletedUsername: targetUser.username,
        deletedName: targetUser.nama,
        role: targetUser.role,
        reason: reason.trim(),
      },
      actor.userId
    )

    try {
      revalidatePath('/dashboard/users')
    } catch {}

    return {
      success: true,
      message: `Akun @${targetUser.username} (${targetUser.nama}) berhasil dihapus dari sistem.`,
    }
  } catch (error: any) {
    console.error('Error in deleteUserAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus pengguna.' }
  }
}

/**
 * 8. Restore Soft-Deleted User
 * Requires PBAC permission: user.delete (SUPER_ADMIN)
 */
export async function restoreUserAction(input: RestoreUserInput) {
  try {
    const actor = await getAuthenticatedActor()
    if (!hasPermission(actor.role, 'user.delete') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang memulihkan akun pengguna.' }
    }

    const validated = restoreUserSchema.parse(input)
    const { id } = validated

    const targetUser = await prisma.user.findFirst({
      where: { id, deletedAt: { not: null } },
    })
    if (!targetUser) {
      return { success: false, error: 'Pengguna yang dihapus tidak ditemukan.' }
    }

    // Restore user
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        status: 'AKTIF',
        isActive: true,
      },
    })

    // Record SHA-256 Audit Trail
    await createCryptographicAuditLog(
      actor.name,
      'USER_RESTORED',
      'User',
      id,
      {
        restoredUsername: targetUser.username,
        restoredName: targetUser.nama,
        role: targetUser.role,
      },
      actor.userId
    )

    try {
      revalidatePath('/dashboard/users')
    } catch {}

    return {
      success: true,
      message: `Akun @${targetUser.username} (${targetUser.nama}) berhasil dipulihkan kembali ke status AKTIF.`,
    }
  } catch (error: any) {
    console.error('Error in restoreUserAction:', error)
    return { success: false, error: error?.message || 'Gagal memulihkan pengguna.' }
  }
}

/**
 * 9. Hard Delete (Permanent Purge) from Database
 * Requires PBAC permission: user.delete (SUPER_ADMIN)
 */
export async function hardDeleteUserAction(input: HardDeleteUserInput) {
  try {
    const actor = await getAuthenticatedActor()
    if (!hasPermission(actor.role, 'user.delete') && actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang menghapus permanen akun pengguna.' }
    }

    const validated = hardDeleteUserSchema.parse(input)
    const { id, reason } = validated

    // 1. Self-Deletion Prevention
    if (actor.userId === id) {
      return {
        success: false,
        error: 'Anda tidak dapat menghapus permanen akun Anda sendiri.',
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    })
    if (!targetUser) {
      return { success: false, error: 'Pengguna tidak ditemukan dalam database.' }
    }

    // 2. Last Super Admin Lock
    if (targetUser.role === 'SUPER_ADMIN') {
      const remainingSuperAdmins = await prisma.user.count({
        where: {
          role: 'SUPER_ADMIN',
          id: { not: id },
          status: 'AKTIF',
          deletedAt: null,
        },
      })
      if (remainingSuperAdmins === 0) {
        return {
          success: false,
          error: 'Tidak dapat menghapus permanen Super Admin terakhir.',
        }
      }
    }

    // 3. Delete sessions and user record from database
    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId: id } })
      await tx.auditLog.updateMany({ where: { userId: id }, data: { userId: null } })
      await tx.user.delete({ where: { id } })
    })

    // Record SHA-256 Audit Trail
    await createCryptographicAuditLog(
      actor.name,
      'USER_PERMANENTLY_DELETED',
      'User',
      id,
      {
        purgedUsername: targetUser.username,
        purgedName: targetUser.nama,
        role: targetUser.role,
        reason: reason || 'Hard delete from database',
      },
      actor.userId
    )

    try {
      revalidatePath('/dashboard/users')
    } catch {}

    return {
      success: true,
      message: `Akun @${targetUser.username} (${targetUser.nama}) telah dihapus secara PERMANEN dari database.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeleteUserAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus pengguna secara permanen.' }
  }
}
