/**
 * WhatsApp Helper Utilities
 * Formats dynamic variables into template strings and produces clean WhatsApp Web / App URLs.
 */

export function formatWhatsAppMessage(
  templateText: string,
  variables: Record<string, string | number | null | undefined>
): string {
  let result = templateText || ''
  for (const [key, val] of Object.entries(variables)) {
    const placeholder = `{${key}}`
    const replacement = val !== null && val !== undefined ? String(val) : ''
    result = result.split(placeholder).join(replacement)
  }
  return result
}

export function generateWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null
  const cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone) return null
  const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone
  const encodedMsg = encodeURIComponent(message)
  return `https://wa.me/${formattedPhone}?text=${encodedMsg}`
}

export function openWhatsAppChat(phone: string | null | undefined, message: string): boolean {
  const url = generateWhatsAppUrl(phone, message)
  if (!url) return false
  if (typeof window !== 'undefined') {
    window.open(url, '_blank')
    return true
  }
  return false
}
