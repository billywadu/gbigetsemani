import { getCurrentStaffSession } from '@/lib/security/session'
import { hasPermission, Permission } from '@/lib/permissions'
import { Role } from '@/config/navigation'

export interface AuthenticatedStaff {
  userId: string
  username: string
  nama: string
  email?: string | null
  role: Role
  kategorialScopes?: string[]
}

export type AuthGuardResult =
  | { success: true; user: AuthenticatedStaff }
  | { success: false; error: string; status: 401 | 403 }

/**
 * Validates staff session and checks required RBAC permission.
 * Fails closed if session is invalid, expired, or user is inactive.
 */
export async function requireStaffSession(requiredPermission?: Permission): Promise<AuthGuardResult> {
  try {
    const session = await getCurrentStaffSession()

    if (!session || !session.user) {
      return {
        success: false,
        error: 'Sesi Anda tidak valid atau telah kedaluwarsa. Silakan masuk kembali.',
        status: 401,
      }
    }

    const { user } = session

    if (!user.isActive) {
      return {
        success: false,
        error: 'Akun Anda telah dinonaktifkan oleh Administrator.',
        status: 403,
      }
    }

    // Role-Based Access Control Verification
    if (requiredPermission) {
      const isAuthorized = hasPermission(user.role as Role, requiredPermission)
      if (!isAuthorized) {
        return {
          success: false,
          error: `Akses ditolak: Anda tidak memiliki izin '${requiredPermission}'.`,
          status: 403,
        }
      }
    }

    const kategorialScopes = user.kategorialScopes?.map((s) => s.kategorialId) || []

    return {
      success: true,
      user: {
        userId: user.id,
        username: user.username,
        nama: user.nama,
        email: user.email,
        role: user.role as Role,
        kategorialScopes,
      },
    }
  } catch (error: any) {
    console.error('Security AuthGuard Exception:', error)
    return {
      success: false,
      error: 'Terjadi kesalahan sistem saat memverifikasi hak akses.',
      status: 401,
    }
  }
}
