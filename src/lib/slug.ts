import { prisma } from './prisma'

/**
 * Convert string to URL-safe kebab-case slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // separate accents
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
    .replace(/[\s_-]+/g, '-') // collapse whitespace and underscores to -
    .replace(/^-+|-+$/g, '') // trim leading/trailing -
}

/**
 * Generate unique slug for Artikel
 */
export async function generateUniqueArtikelSlug(
  judul: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = slugify(judul) || 'artikel'
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.artikel.findFirst({
      where: {
        slug,
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    })

    if (!existing) {
      return slug
    }

    counter++
    slug = `${baseSlug}-${counter}`
  }
}

/**
 * Generate unique slug for KategoriArtikel
 */
export async function generateUniqueKategoriArtikelSlug(
  nama: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = slugify(nama) || 'kategori-artikel'
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.kategoriArtikel.findFirst({
      where: {
        slug,
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    })

    if (!existing) {
      return slug
    }

    counter++
    slug = `${baseSlug}-${counter}`
  }
}

// Backward compatibility aliases
export const generateUniqueMateriSlug = generateUniqueArtikelSlug
export const generateUniqueKategoriSlug = generateUniqueKategoriArtikelSlug
