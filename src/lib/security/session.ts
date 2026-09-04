import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const SESSION_COOKIE_NAME = 'gbi_cms_session'
const SESSION_DURATION_DAYS = 7

/**
 * Create Server-Side Session and Set HttpOnly Cookie
 */
export async function createStaffSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_DURATION_DAYS)

  const session = await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  })

  try {
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })
  } catch {}

  return session
}

/**
 * Get Current Authenticated Staff Session
 */
export async function getCurrentStaffSession() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) return null

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nama: true,
            email: true,
            fotoUrl: true,
            noHp: true,
            role: true,
            status: true,
            isActive: true,
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
        },
      },
    })

    if (!session || !session.user || !session.user.isActive) {
      return null
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } })
      return null
    }

    return session
  } catch (error) {
    console.error('Error in getCurrentStaffSession:', error)
    return null
  }
}

/**
 * Destroy Staff Session & Clear Cookie
 */
export async function destroyStaffSession() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (token) {
      await prisma.session.deleteMany({ where: { token } })
    }

    cookieStore.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  } catch (error) {
    console.error('Error in destroyStaffSession:', error)
  }
}
