'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { loginSchema, LoginInput } from '@/lib/validations/auth'
import { createStaffSession, getCurrentStaffSession, destroyStaffSession } from '@/lib/security/session'
import { createCryptographicAuditLog } from '@/lib/security/audit'

const LOCKOUT_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

/**
 * Staff Login Server Action with 15-Min Lockout & SHA-256 Audit Log
 */
export async function loginAction(input: LoginInput) {
  try {
    const validated = loginSchema.parse(input)
    const { username, password } = validated

    // 1. Find User by Username
    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      await createCryptographicAuditLog(
        `Anonymous (${username})`,
        'LOGIN_FAILED',
        'User',
        'N/A',
        `Attempted login with non-existent username: ${username}`
      )
      return {
        success: false,
        error: 'Username atau Password yang Anda masukkan tidak valid.',
      }
    }

    // 2. Check Active Status
    if (!user.isActive) {
      return {
        success: false,
        error: 'Akun Anda telah dinonaktifkan. Silakan hubungi Administrator.',
      }
    }

    // 3. Check Lockout Status
    const now = new Date()
    if (user.lockedUntil && now < user.lockedUntil) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / (1000 * 60))
      return {
        success: false,
        error: `Akun sementara dikunci karena 5x percobaan login gagal. Silakan coba lagi dalam ${remainingMinutes} menit.`,
        isLockedOut: true,
      }
    }

    // 4. Verify Password Hash (Bcrypt)
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      const nextAttempts = user.failedLoginAttempts + 1
      let lockDate: Date | null = null

      if (nextAttempts >= LOCKOUT_ATTEMPTS) {
        lockDate = new Date(Date.now() + 1000 * 60 * LOCKOUT_MINUTES)
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: nextAttempts,
          lastFailedLoginAt: now,
          lockedUntil: lockDate,
        },
      })

      if (nextAttempts >= LOCKOUT_ATTEMPTS) {
        await createCryptographicAuditLog(
          user.nama || user.username,
          'ACCOUNT_LOCKED',
          'User',
          user.id,
          `Account locked for 15 minutes due to 5 failed login attempts`,
          user.id
        )
        return {
          success: false,
          error: `Akun ter kunci sementara (15 Menit) karena 5x percobaan gagal berturut-turut.`,
          isLockedOut: true,
        }
      } else {
        await createCryptographicAuditLog(
          user.nama || user.username,
          'LOGIN_FAILED',
          'User',
          user.id,
          `Failed login attempt ${nextAttempts} of 5`,
          user.id
        )
        return {
          success: false,
          error: `Username atau Password salah. Percobaan ke-${nextAttempts} dari 5.`,
        }
      }
    }

    // 5. Successful Login: Reset Lockout Counters & Create Session
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
        lastLoginAt: now,
      },
    })

    await createStaffSession(user.id)

    // Audit Log
    await createCryptographicAuditLog(
      user.nama || user.username,
      'LOGIN_SUCCESS',
      'User',
      user.id,
      `User ${user.nama} (${user.username}) successfully authenticated as ${user.role}`,
      user.id
    )

    return {
      success: true,
      user: {
        id: user.id,
        nama: user.nama,
        username: user.username,
        role: user.role,
      },
    }
  } catch (error: any) {
    console.error('Error in loginAction:', error)
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan sistem saat memproses login.',
    }
  }
}

/**
 * Staff Logout Action
 */
export async function logoutAction() {
  try {
    const session = await getCurrentStaffSession()
    if (session) {
      await createCryptographicAuditLog(
        session.user.nama || session.user.username,
        'LOGOUT',
        'User',
        session.user.id,
        `User ${session.user.nama || session.user.username} logged out`,
        session.user.id
      )
    }

    await destroyStaffSession()
    return { success: true }
  } catch (error: any) {
    console.error('Error in logoutAction:', error)
    return { success: false, error: 'Gagal memproses logout.' }
  }
}

/**
 * Get Authenticated User Details
 */
export async function getAuthUserAction() {
  try {
    const session = await getCurrentStaffSession()
    if (!session) return { success: false, user: null }
    return {
      success: true,
      user: session.user,
    }
  } catch (error) {
    return { success: false, user: null }
  }
}
