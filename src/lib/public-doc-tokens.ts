import crypto from 'crypto'

const TOKEN_SECRET = process.env.NEXTAUTH_SECRET || 'church-cms-public-doc-vault-key-secret-2026'

/**
 * Generate Secure HMAC Token for Public Document Download (expires in 1 hour)
 */
export function generateDocAccessToken(dokumenId: string, jemaatId: string, expiresAt: number): string {
  const payload = `${dokumenId}:${jemaatId}:${expiresAt}`
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}:${signature}`).toString('base64url')
}

/**
 * Verify Secure HMAC Token for Public Document Download
 */
export function verifyDocAccessToken(token: string): { valid: boolean; dokumenId?: string; jemaatId?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const [dokumenId, jemaatId, expiresAtStr, signature] = decoded.split(':')
    const expiresAt = parseInt(expiresAtStr, 10)
    if (!dokumenId || !jemaatId || isNaN(expiresAt) || !signature) {
      return { valid: false }
    }
    if (Date.now() > expiresAt) {
      return { valid: false }
    }
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(`${dokumenId}:${jemaatId}:${expiresAt}`).digest('hex')
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: true, dokumenId, jemaatId }
    }
    return { valid: false }
  } catch {
    return { valid: false }
  }
}
