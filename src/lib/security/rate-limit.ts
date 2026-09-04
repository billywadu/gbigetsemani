/**
 * Server-Side Sliding-Window Rate Limiter
 * Protects authentication, search, public submissions, and critical endpoints from DDoS/Abuse.
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Periodic cleanup every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

export interface RateLimitOptions {
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds?: number
}

/**
 * Checks and increments rate limit for a given key (IP, User ID, or composite).
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { limit: 60, windowMs: 60 * 1000 }
): RateLimitResult {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetAt) {
    const resetAt = now + options.windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return {
      success: true,
      remaining: options.limit - 1,
      resetAt,
    }
  }

  if (record.count >= options.limit) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000)
    return {
      success: false,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfterSeconds,
    }
  }

  record.count++
  return {
    success: true,
    remaining: options.limit - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * Predefined Rate Limit Profiles
 */
export const RateLimitProfiles = {
  // Login: 5 attempts per 15 minutes
  AUTH_LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 },
  // Public Prayer submission: 5 per hour
  PUBLIC_PRAYER: { limit: 5, windowMs: 60 * 60 * 1000 },
  // Public Self-Registration: 3 per hour
  PUBLIC_REGISTRATION: { limit: 3, windowMs: 60 * 60 * 1000 },
  // Public Document Token verification: 15 per 10 minutes
  PUBLIC_DOC_ACCESS: { limit: 15, windowMs: 10 * 60 * 1000 },
  // Global Omni-Search: 60 queries per minute
  GLOBAL_SEARCH: { limit: 60, windowMs: 60 * 1000 },
  // General Mutative Actions: 120 per minute
  MUTATIVE_ACTIONS: { limit: 120, windowMs: 60 * 1000 },
}
