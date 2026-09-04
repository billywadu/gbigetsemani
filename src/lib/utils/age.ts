/**
 * Calculate exact age dynamically based on birth date (tanggalLahir)
 */
export function calculateAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  if (isNaN(birth.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age >= 0 ? age : 0
}

/**
 * Format Age Display String (e.g. "35 Tahun")
 */
export function formatAgeString(birthDate: Date | string | null | undefined): string {
  const age = calculateAge(birthDate)
  if (age === null) return 'Usia Belum Diisi'
  return `${age} Tahun`
}
