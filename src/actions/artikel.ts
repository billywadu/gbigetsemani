'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  createArtikelSchema,
  updateArtikelSchema,
  deleteArtikelSchema,
  restoreArtikelSchema,
  hardDeleteArtikelSchema,
  artikelFilterSchema,
  createKategoriArtikelSchema,
  updateKategoriArtikelSchema,
  deleteKategoriArtikelSchema,
  kategoriArtikelFilterSchema,
  publicArtikelFilterSchema,
  ArtikelFilterParams,
  DeleteArtikelInput,
  RestoreArtikelInput,
  HardDeleteArtikelInput,
  CreateKategoriArtikelInput,
  UpdateKategoriArtikelInput,
  DeleteKategoriArtikelInput,
  KategoriArtikelFilterParams,
  PublicArtikelFilterParams,
  StatusArtikel,
} from '@/lib/validations/artikel'
import { generateUniqueArtikelSlug, generateUniqueKategoriArtikelSlug } from '@/lib/slug'
import { getStorageProvider } from '@/lib/storage'
import { cleanupCloudinaryAsset } from '@/lib/cloudinary'
import { createAuditLog } from '@/lib/jemaat-helpers'
import { requireStaffSession } from '@/lib/security/auth-guard'
import { Role } from '@/config/navigation'
import { hasPermission } from '@/lib/permissions'

const CURRENT_STAFF_ROLE: Role = 'SUPER_ADMIN'
const CURRENT_STAFF_ACTOR = 'Admin Gereja'

export type KategoriArtikelDTO = {
  id: string
  nama: string
  slug: string
  totalArtikel: number
  deletedAt?: string | null
  createdAt?: string
}

export type ArtikelDTO = {
  id: string
  judul: string
  slug: string
  kategoriId: string
  kategoriNama: string
  kategoriSlug: string
  penulis: string
  tanggal: string
  status: StatusArtikel
  thumbnailUrl: string | null
  ringkasan: string
  konten: string
  totalDilihat: number
  deletedAt: string | null
  createdAt: string
  updatedAt?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// KATEGORI ARTIKEL SERVER ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get Active Categories with Dynamic Article Count
 */
export async function getKategoriArtikelListAction() {
  try {
    const categories = await prisma.kategoriArtikel.findMany({
      where: { deletedAt: null },
      orderBy: { nama: 'asc' },
      include: {
        _count: {
          select: {
            artikel: {
              where: { deletedAt: null },
            },
          },
        },
      },
    })

    const data: KategoriArtikelDTO[] = categories.map((c) => ({
      id: c.id,
      nama: c.nama,
      slug: c.slug,
      totalArtikel: c._count.artikel,
      deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    }))

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in getKategoriArtikelListAction:', error)
    return { success: false, error: 'Gagal memuat kategori artikel.' }
  }
}

/**
 * Get Paginated List of Categories for Management Page
 */
export async function getKategoriArtikelPaginatedAction(params?: KategoriArtikelFilterParams) {
  try {
    if (
      !hasPermission(CURRENT_STAFF_ROLE, 'kategori_artikel.read') &&
      !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage') &&
      !hasPermission(CURRENT_STAFF_ROLE, 'artikel.read')
    ) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin membaca kategori artikel.' }
    }

    const validated = kategoriArtikelFilterSchema.parse(params || {})
    const { search, statusHapus = 'ACTIVE', page = 1, pageSize = 10 } = validated

    const whereClause: Prisma.KategoriArtikelWhereInput = {}

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { nama: { contains: search.trim(), mode: 'insensitive' } },
        { slug: { contains: search.trim(), mode: 'insensitive' } },
      ]
    }

    const [total, items] = await Promise.all([
      prisma.kategoriArtikel.count({ where: whereClause }),
      prisma.kategoriArtikel.findMany({
        where: whereClause,
        orderBy: [{ nama: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              artikel: {
                where: { deletedAt: null },
              },
            },
          },
        },
      }),
    ])

    const data: KategoriArtikelDTO[] = items.map((c) => ({
      id: c.id,
      nama: c.nama,
      slug: c.slug,
      totalArtikel: c._count.artikel,
      deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    }))

    return {
      success: true,
      data: {
        items: data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    }
  } catch (error: any) {
    console.error('Error in getKategoriArtikelPaginatedAction:', error)
    return { success: false, error: 'Gagal memuat data kategori artikel.' }
  }
}

/**
 * Create New Category with Unique Slug and Audit Log
 */
export async function createKategoriArtikelAction(input: CreateKategoriArtikelInput) {
  try {
    if (
      !hasPermission(CURRENT_STAFF_ROLE, 'kategori_artikel.create') &&
      !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')
    ) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin kategori_artikel.create.' }
    }

    const validated = createKategoriArtikelSchema.parse(input)

    // Check duplicate name
    const duplicate = await prisma.kategoriArtikel.findFirst({
      where: {
        nama: { equals: validated.nama, mode: 'insensitive' },
        deletedAt: null,
      },
    })

    if (duplicate) {
      return { success: false, error: `Kategori "${validated.nama}" sudah terdaftar.` }
    }

    const slug = await generateUniqueKategoriArtikelSlug(validated.nama)

    const created = await prisma.kategoriArtikel.create({
      data: {
        nama: validated.nama,
        slug,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'KATEGORI_ARTIKEL_CREATED',
      'KategoriArtikel',
      created.id,
      JSON.stringify({
        kategoriId: created.id,
        nama: created.nama,
        slug: created.slug,
      })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath('/dashboard/artikel/kategori')
      revalidatePath('/artikel')
    } catch {}

    return {
      success: true,
      data: {
        id: created.id,
        nama: created.nama,
        slug: created.slug,
        totalArtikel: 0,
      },
      message: `Kategori "${created.nama}" berhasil ditambahkan!`,
    }
  } catch (error: any) {
    console.error('Error in createKategoriArtikelAction:', error)
    return { success: false, error: error?.message || 'Gagal menambahkan kategori artikel.' }
  }
}

/**
 * Update Category
 */
export async function updateKategoriArtikelAction(input: UpdateKategoriArtikelInput) {
  try {
    if (
      !hasPermission(CURRENT_STAFF_ROLE, 'kategori_artikel.update') &&
      !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')
    ) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin kategori_artikel.update.' }
    }

    const validated = updateKategoriArtikelSchema.parse(input)

    const existing = await prisma.kategoriArtikel.findUnique({
      where: { id: validated.id },
    })

    if (!existing) {
      return { success: false, error: 'Kategori tidak ditemukan.' }
    }

    let slug = existing.slug
    if (existing.nama.toLowerCase() !== validated.nama.toLowerCase()) {
      const duplicate = await prisma.kategoriArtikel.findFirst({
        where: {
          id: { not: validated.id },
          nama: { equals: validated.nama, mode: 'insensitive' },
          deletedAt: null,
        },
      })
      if (duplicate) {
        return { success: false, error: `Kategori "${validated.nama}" sudah digunakan.` }
      }
      slug = await generateUniqueKategoriArtikelSlug(validated.nama, validated.id)
    }

    const updated = await prisma.kategoriArtikel.update({
      where: { id: validated.id },
      data: {
        nama: validated.nama,
        slug,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'KATEGORI_ARTIKEL_UPDATED',
      'KategoriArtikel',
      updated.id,
      JSON.stringify({
        kategoriId: updated.id,
        namaLama: existing.nama,
        namaBaru: updated.nama,
      })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath('/dashboard/artikel/kategori')
      revalidatePath('/artikel')
    } catch {}

    return {
      success: true,
      data: {
        id: updated.id,
        nama: updated.nama,
        slug: updated.slug,
      },
      message: 'Kategori artikel berhasil diperbarui!',
    }
  } catch (error: any) {
    console.error('Error in updateKategoriArtikelAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui kategori artikel.' }
  }
}

/**
 * Delete Category (Soft delete)
 */
export async function deleteKategoriArtikelAction(input: DeleteKategoriArtikelInput) {
  try {
    if (
      !hasPermission(CURRENT_STAFF_ROLE, 'kategori_artikel.delete') &&
      !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')
    ) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin kategori_artikel.delete.' }
    }

    const validated = deleteKategoriArtikelSchema.parse(input)

    const activeArticles = await prisma.artikel.count({
      where: {
        kategoriId: validated.id,
        deletedAt: null,
      },
    })

    if (activeArticles > 0) {
      return {
        success: false,
        error: `Kategori tidak dapat dihapus karena masih digunakan oleh ${activeArticles} artikel aktif. Pindahkan artikel terlebih dahulu.`,
      }
    }

    const deleted = await prisma.kategoriArtikel.update({
      where: { id: validated.id },
      data: {
        deletedAt: new Date(),
        deletedBy: CURRENT_STAFF_ACTOR,
        deletionReason: validated.reason,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'KATEGORI_ARTIKEL_DELETED',
      'KategoriArtikel',
      deleted.id,
      JSON.stringify({
        kategoriId: deleted.id,
        nama: deleted.nama,
        alasan: validated.reason,
      })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath('/dashboard/artikel/kategori')
      revalidatePath('/artikel')
    } catch {}

    return {
      success: true,
      message: `Kategori "${deleted.nama}" berhasil dihapus.`,
    }
  } catch (error: any) {
    console.error('Error in deleteKategoriArtikelAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus kategori artikel.' }
  }
}

/**
 * Restore Category
 */
export async function restoreKategoriArtikelAction(id: string) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin memulihkan kategori artikel.' }
    }

    const restored = await prisma.kategoriArtikel.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'KATEGORI_ARTIKEL_RESTORED',
      'KategoriArtikel',
      restored.id,
      JSON.stringify({
        kategoriId: restored.id,
        nama: restored.nama,
      })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath('/dashboard/artikel/kategori')
      revalidatePath('/artikel')
    } catch {}

    return {
      success: true,
      message: `Kategori "${restored.nama}" berhasil dipulihkan!`,
    }
  } catch (error: any) {
    console.error('Error in restoreKategoriArtikelAction:', error)
    return { success: false, error: 'Gagal memulihkan kategori artikel.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTIKEL (PUBLIKASI) SERVER ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get Paginated List of Articles with Filters
 */
export async function getArtikelListAction(params?: ArtikelFilterParams) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'artikel.read') && !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin membaca artikel.' }
    }

    const validated = artikelFilterSchema.parse(params || {})
    const { search, statusHapus = 'ACTIVE', kategoriId, status, page = 1, pageSize = 10 } = validated

    const whereClause: Prisma.ArtikelWhereInput = {}

    if (statusHapus === 'ACTIVE') {
      whereClause.deletedAt = null
    } else if (statusHapus === 'DELETED') {
      whereClause.deletedAt = { not: null }
    }

    if (kategoriId && kategoriId !== 'ALL') {
      whereClause.kategoriId = kategoriId
    }

    if (status) {
      whereClause.status = status
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { judul: { contains: search.trim(), mode: 'insensitive' } },
        { penulis: { contains: search.trim(), mode: 'insensitive' } },
        { ringkasan: { contains: search.trim(), mode: 'insensitive' } },
      ]
    }

    const [total, items, totalPublished, totalDraft, totalViewsAgg] = await Promise.all([
      prisma.artikel.count({ where: whereClause }),
      prisma.artikel.findMany({
        where: whereClause,
        orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          kategori: {
            select: {
              id: true,
              nama: true,
              slug: true,
            },
          },
        },
      }),
      prisma.artikel.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      prisma.artikel.count({ where: { status: 'DRAFT', deletedAt: null } }),
      prisma.artikel.aggregate({
        where: { deletedAt: null },
        _sum: { totalDilihat: true },
      }),
    ])

    const data: ArtikelDTO[] = items.map((m) => ({
      id: m.id,
      judul: m.judul,
      slug: m.slug,
      kategoriId: m.kategoriId,
      kategoriNama: m.kategori.nama,
      kategoriSlug: m.kategori.slug,
      penulis: m.penulis,
      tanggal: m.tanggal.toISOString(),
      status: m.status,
      thumbnailUrl: m.thumbnailUrl,
      ringkasan: m.ringkasan,
      konten: m.konten,
      totalDilihat: m.totalDilihat,
      deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt ? m.updatedAt.toISOString() : undefined,
    }))

    return {
      success: true,
      data: {
        items: data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        stats: {
          totalMateri: total,
          totalArtikel: total,
          totalPublished,
          totalDraft,
          totalViews: totalViewsAgg._sum.totalDilihat || 0,
        },
      },
    }
  } catch (error: any) {
    console.error('Error in getArtikelListAction:', error)
    return { success: false, error: 'Gagal memuat daftar artikel.' }
  }
}

/**
 * Get Article Detail by ID
 */
export async function getArtikelDetailAction(id: string) {
  try {
    const article = await prisma.artikel.findUnique({
      where: { id },
      include: {
        kategori: {
          select: {
            id: true,
            nama: true,
            slug: true,
          },
        },
      },
    })

    if (!article) {
      return { success: false, error: 'Artikel tidak ditemukan.' }
    }

    const data: ArtikelDTO = {
      id: article.id,
      judul: article.judul,
      slug: article.slug,
      kategoriId: article.kategoriId,
      kategoriNama: article.kategori.nama,
      kategoriSlug: article.kategori.slug,
      penulis: article.penulis,
      tanggal: article.tanggal.toISOString(),
      status: article.status,
      thumbnailUrl: article.thumbnailUrl,
      ringkasan: article.ringkasan,
      konten: article.konten,
      totalDilihat: article.totalDilihat,
      deletedAt: article.deletedAt ? article.deletedAt.toISOString() : null,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt ? article.updatedAt.toISOString() : undefined,
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in getArtikelDetailAction:', error)
    return { success: false, error: 'Gagal memuat detail artikel.' }
  }
}

/**
 * Create New Article
 */
export async function createArtikelAction(input: any) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'artikel.create') && !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin membuat artikel.' }
    }

    let judul = ''
    let kategoriId = ''
    let penulis = ''
    let tanggal = new Date()
    let status: StatusArtikel = 'DRAFT'
    let ringkasan = ''
    let konten = ''
    let thumbnailUrl: string | null = null
    let cloudinaryPublicId: string | null = null

    if (input instanceof FormData) {
      judul = (input.get('judul') as string) || ''
      kategoriId = (input.get('kategoriId') as string) || ''
      penulis = (input.get('penulis') as string) || (input.get('pembicara') as string) || ''
      const tglStr = input.get('tanggal') as string
      if (tglStr) tanggal = new Date(tglStr)
      status = ((input.get('status') as StatusArtikel) || 'DRAFT')
      ringkasan = (input.get('ringkasan') as string) || ''
      konten = (input.get('konten') as string) || ''

      const thumb = input.get('thumbnail') as File | null
      if (thumb && thumb.size > 0 && typeof thumb !== 'string') {
        const storage = getStorageProvider()
        const uploadRes = await storage.upload(thumb)
        thumbnailUrl = uploadRes.fileUrl
        cloudinaryPublicId = uploadRes.identifier
      } else if (input.get('thumbnailUrl')) {
        thumbnailUrl = input.get('thumbnailUrl') as string
      }
    } else {
      judul = input.judul || ''
      kategoriId = input.kategoriId || ''
      penulis = input.penulis || input.pembicara || ''
      tanggal = input.tanggal ? new Date(input.tanggal) : new Date()
      status = input.status || 'DRAFT'
      ringkasan = input.ringkasan || ''
      konten = input.konten || ''
      thumbnailUrl = input.thumbnailUrl || null
      cloudinaryPublicId = input.cloudinaryPublicId || null
    }

    const validated = createArtikelSchema.parse({
      judul,
      kategoriId,
      penulis,
      tanggal,
      status,
      ringkasan,
      konten,
      thumbnailUrl,
      cloudinaryPublicId,
    })

    const category = await prisma.kategoriArtikel.findUnique({
      where: { id: validated.kategoriId, deletedAt: null },
    })

    if (!category) {
      return { success: false, error: 'Kategori artikel tidak valid atau sudah dihapus.' }
    }

    const slug = await generateUniqueArtikelSlug(validated.judul)

    const created = await prisma.artikel.create({
      data: {
        judul: validated.judul,
        slug,
        kategoriId: validated.kategoriId,
        penulis: validated.penulis,
        tanggal: validated.tanggal,
        status: validated.status,
        ringkasan: validated.ringkasan,
        konten: validated.konten,
        thumbnailUrl: validated.thumbnailUrl,
        cloudinaryPublicId: validated.cloudinaryPublicId,
      },
      include: {
        kategori: true,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARTIKEL_CREATED',
      'Artikel',
      created.id,
      JSON.stringify({
        artikelId: created.id,
        judul: created.judul,
        slug: created.slug,
        penulis: created.penulis,
        kategori: created.kategori.nama,
        status: created.status,
      })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath('/artikel')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      data: {
        id: created.id,
        slug: created.slug,
        judul: created.judul,
      },
      message: `Artikel "${created.judul}" berhasil disimpan sebagai ${created.status === 'PUBLISHED' ? 'Terbit' : 'Draft'}!`,
    }
  } catch (error: any) {
    console.error('Error in createArtikelAction:', error)
    return { success: false, error: error?.message || 'Gagal membuat artikel.' }
  }
}

/**
 * Update Article
 */
export async function updateArtikelAction(input: any) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'artikel.update') && !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin mengedit artikel.' }
    }

    let id = ''
    let judul: string | undefined
    let kategoriId: string | undefined
    let penulis: string | undefined
    let tanggal: Date | undefined
    let status: StatusArtikel | undefined
    let ringkasan: string | undefined
    let konten: string | undefined
    let thumbnailUrl: string | null | undefined
    let cloudinaryPublicId: string | null | undefined

    if (input instanceof FormData) {
      id = input.get('id') as string
      if (input.has('judul')) judul = input.get('judul') as string
      if (input.has('kategoriId')) kategoriId = input.get('kategoriId') as string
      if (input.has('penulis') || input.has('pembicara')) {
        penulis = (input.get('penulis') as string) || (input.get('pembicara') as string)
      }
      if (input.has('tanggal') && input.get('tanggal')) {
        tanggal = new Date(input.get('tanggal') as string)
      }
      if (input.has('status')) status = input.get('status') as StatusArtikel
      if (input.has('ringkasan')) ringkasan = input.get('ringkasan') as string
      if (input.has('konten')) konten = input.get('konten') as string

      const thumb = input.get('thumbnail') as File | null
      if (thumb && thumb.size > 0 && typeof thumb !== 'string') {
        const storage = getStorageProvider()
        const uploadRes = await storage.upload(thumb)
        thumbnailUrl = uploadRes.fileUrl
        cloudinaryPublicId = uploadRes.identifier
      } else if (input.get('removeThumbnail') === 'true') {
        thumbnailUrl = null
        cloudinaryPublicId = null
      }
    } else {
      id = input.id
      judul = input.judul
      kategoriId = input.kategoriId
      penulis = input.penulis || input.pembicara
      tanggal = input.tanggal ? new Date(input.tanggal) : undefined
      status = input.status
      ringkasan = input.ringkasan
      konten = input.konten
      thumbnailUrl = input.thumbnailUrl
      cloudinaryPublicId = input.cloudinaryPublicId
    }

    const validated = updateArtikelSchema.parse({
      id,
      judul,
      kategoriId,
      penulis,
      tanggal,
      status,
      ringkasan,
      konten,
      thumbnailUrl,
      cloudinaryPublicId,
    })

    const existing = await prisma.artikel.findUnique({
      where: { id: validated.id },
    })

    if (!existing) {
      return { success: false, error: 'Artikel tidak ditemukan.' }
    }

    let slug = existing.slug
    if (validated.judul && validated.judul !== existing.judul) {
      slug = await generateUniqueArtikelSlug(validated.judul, validated.id)
    }

    if (validated.kategoriId && validated.kategoriId !== existing.kategoriId) {
      const cat = await prisma.kategoriArtikel.findUnique({
        where: { id: validated.kategoriId, deletedAt: null },
      })
      if (!cat) {
        return { success: false, error: 'Kategori baru tidak valid.' }
      }
    }

    const updated = await prisma.artikel.update({
      where: { id: validated.id },
      data: {
        ...(validated.judul ? { judul: validated.judul, slug } : {}),
        ...(validated.kategoriId ? { kategoriId: validated.kategoriId } : {}),
        ...(validated.penulis ? { penulis: validated.penulis } : {}),
        ...(validated.tanggal ? { tanggal: validated.tanggal } : {}),
        ...(validated.status ? { status: validated.status } : {}),
        ...(validated.ringkasan ? { ringkasan: validated.ringkasan } : {}),
        ...(validated.konten ? { konten: validated.konten } : {}),
        ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
        ...(cloudinaryPublicId !== undefined ? { cloudinaryPublicId } : {}),
      },
      include: {
        kategori: true,
      },
    })

    // Cleanup old thumbnail in Cloudinary if replaced or removed
    if (thumbnailUrl !== undefined && existing.thumbnailUrl && existing.thumbnailUrl !== thumbnailUrl) {
      try {
        await cleanupCloudinaryAsset(existing.cloudinaryPublicId || existing.thumbnailUrl, 'image')
      } catch (cleanupErr) {
        console.warn('Failed to cleanup old Cloudinary thumbnail:', cleanupErr)
      }
    }

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARTIKEL_UPDATED',
      'Artikel',
      updated.id,
      JSON.stringify({
        artikelId: updated.id,
        judulLama: existing.judul,
        judulBaru: updated.judul,
        status: updated.status,
      })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath(`/dashboard/artikel/${updated.id}/edit`)
      revalidatePath('/artikel')
      revalidatePath(`/artikel/${updated.slug}`)
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      data: {
        id: updated.id,
        slug: updated.slug,
        judul: updated.judul,
      },
      message: 'Artikel berhasil diperbarui!',
    }
  } catch (error: any) {
    console.error('Error in updateArtikelAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui artikel.' }
  }
}

/**
 * Soft Delete Article
 */
export async function deleteArtikelAction(input: DeleteArtikelInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'artikel.delete') && !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus artikel.' }
    }

    const validated = deleteArtikelSchema.parse(input)

    const deleted = await prisma.artikel.update({
      where: { id: validated.id },
      data: {
        deletedAt: new Date(),
        deletedBy: CURRENT_STAFF_ACTOR,
        deletionReason: validated.reason,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARTIKEL_DELETED',
      'Artikel',
      deleted.id,
      JSON.stringify({
        artikelId: deleted.id,
        judul: deleted.judul,
        alasan: validated.reason,
      })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath('/artikel')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: `Artikel "${deleted.judul}" berhasil dipindahkan ke sampah.`,
    }
  } catch (error: any) {
    console.error('Error in deleteArtikelAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus artikel.' }
  }
}

/**
 * Restore Article
 */
export async function restoreArtikelAction(input: RestoreArtikelInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin memulihkan artikel.' }
    }

    const validated = restoreArtikelSchema.parse(input)

    const restored = await prisma.artikel.update({
      where: { id: validated.id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARTIKEL_RESTORED',
      'Artikel',
      restored.id,
      JSON.stringify({
        artikelId: restored.id,
        judul: restored.judul,
      })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath('/artikel')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: `Artikel "${restored.judul}" berhasil dipulihkan!`,
    }
  } catch (error: any) {
    console.error('Error in restoreArtikelAction:', error)
    return { success: false, error: 'Gagal memulihkan artikel.' }
  }
}

/**
 * Hard Delete Article
 */
export async function hardDeleteArtikelAction(input: HardDeleteArtikelInput) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki izin menghapus permanen artikel.' }
    }

    const validated = hardDeleteArtikelSchema.parse(input)

    const target = await prisma.artikel.findUnique({
      where: { id: validated.id },
    })

    if (!target) {
      return { success: false, error: 'Artikel tidak ditemukan.' }
    }

    await prisma.artikel.delete({
      where: { id: validated.id },
    })

    // Cleanup Cloudinary thumbnail asset
    if (target.cloudinaryPublicId || target.thumbnailUrl) {
      try {
        await cleanupCloudinaryAsset(target.cloudinaryPublicId || target.thumbnailUrl, 'image')
      } catch (err) {
        console.warn('Cloudinary asset cleanup warning:', err)
      }
    }

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARTIKEL_HARD_DELETED',
      'Artikel',
      validated.id,
      JSON.stringify({
        artikelId: target.id,
        judul: target.judul,
      })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath('/artikel')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: `Artikel "${target.judul}" telah dihapus secara permanen.`,
    }
  } catch (error: any) {
    console.error('Error in hardDeleteArtikelAction:', error)
    return { success: false, error: 'Gagal menghapus permanen artikel.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC PORTAL SERVER ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public: Get Published Articles List for Public Portal
 */
export async function getPublicArtikelListAction(params?: PublicArtikelFilterParams) {
  try {
    const validated = publicArtikelFilterSchema.parse(params || {})
    const { search, kategoriSlug, page = 1, pageSize = 9 } = validated

    const whereClause: Prisma.ArtikelWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
    }

    if (kategoriSlug && kategoriSlug !== 'all') {
      whereClause.kategori = {
        slug: kategoriSlug,
        deletedAt: null,
      }
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { judul: { contains: search.trim(), mode: 'insensitive' } },
        { penulis: { contains: search.trim(), mode: 'insensitive' } },
        { ringkasan: { contains: search.trim(), mode: 'insensitive' } },
      ]
    }

    const [total, items] = await Promise.all([
      prisma.artikel.count({ where: whereClause }),
      prisma.artikel.findMany({
        where: whereClause,
        orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          kategori: {
            select: {
              id: true,
              nama: true,
              slug: true,
            },
          },
        },
      }),
    ])

    const data: ArtikelDTO[] = items.map((m) => ({
      id: m.id,
      judul: m.judul,
      slug: m.slug,
      kategoriId: m.kategoriId,
      kategoriNama: m.kategori.nama,
      kategoriSlug: m.kategori.slug,
      penulis: m.penulis,
      tanggal: m.tanggal.toISOString(),
      status: m.status,
      thumbnailUrl: m.thumbnailUrl,
      ringkasan: m.ringkasan,
      konten: m.konten,
      totalDilihat: m.totalDilihat,
      deletedAt: null,
      createdAt: m.createdAt.toISOString(),
    }))

    return {
      success: true,
      data: {
        items: data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    }
  } catch (error: any) {
    console.error('Error in getPublicArtikelListAction:', error)
    return { success: false, error: 'Gagal memuat artikel publik.' }
  }
}

/**
 * Public: Get Catalog with Categories & Meta
 */
export async function getPublicArtikelCatalogAction(params?: {
  search?: string
  kategoriSlug?: string
  page?: number
  pageSize?: number
}) {
  try {
    const search = params?.search?.trim() || ''
    const kategoriSlug = params?.kategoriSlug || 'all'
    const page = Math.max(1, Number(params?.page) || 1)
    const pageSize = Math.max(1, Math.min(50, Number(params?.pageSize) || 9))

    const whereClause: Prisma.ArtikelWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
    }

    if (kategoriSlug && kategoriSlug !== 'all') {
      whereClause.kategori = { slug: kategoriSlug }
    }

    if (search) {
      whereClause.OR = [
        { judul: { contains: search, mode: 'insensitive' } },
        { penulis: { contains: search, mode: 'insensitive' } },
        { ringkasan: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, items, rawCategories, totalPublishedAll] = await Promise.all([
      prisma.artikel.count({ where: whereClause }),
      prisma.artikel.findMany({
        where: whereClause,
        orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          kategori: {
            select: { id: true, nama: true, slug: true },
          },
        },
      }),
      prisma.kategoriArtikel.findMany({
        where: { deletedAt: null },
        orderBy: { nama: 'asc' },
        include: {
          _count: {
            select: {
              artikel: {
                where: { status: 'PUBLISHED', deletedAt: null },
              },
            },
          },
        },
      }),
      prisma.artikel.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    ])

    const data: ArtikelDTO[] = items.map((m) => ({
      id: m.id,
      judul: m.judul,
      slug: m.slug,
      kategoriId: m.kategoriId,
      kategoriNama: m.kategori.nama,
      kategoriSlug: m.kategori.slug,
      penulis: m.penulis,
      tanggal: m.tanggal.toISOString(),
      status: m.status,
      thumbnailUrl: m.thumbnailUrl,
      ringkasan: m.ringkasan,
      konten: m.konten,
      totalDilihat: m.totalDilihat,
      deletedAt: null,
      createdAt: m.createdAt.toISOString(),
    }))

    const categories = rawCategories.map((c) => ({
      id: c.id,
      nama: c.nama,
      slug: c.slug,
      totalArtikel: c._count.artikel,
      totalMateri: c._count.artikel,
    }))

    return {
      success: true,
      data: {
        items: data,
        categories,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
        totalPublishedAll,
      },
    }
  } catch (error: any) {
    console.error('Error in getPublicArtikelCatalogAction:', error)
    return { success: false, error: 'Gagal memuat katalog artikel.' }
  }
}

/**
 * Public: Get Single Published Article by Slug
 */
export async function getPublicArtikelBySlugAction(slug: string) {
  try {
    const article = await prisma.artikel.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        deletedAt: null,
      },
      include: {
        kategori: {
          select: {
            id: true,
            nama: true,
            slug: true,
          },
        },
      },
    })

    if (!article) {
      return { success: false, error: 'Artikel tidak ditemukan atau belum dipublikasikan.' }
    }

    const data: ArtikelDTO = {
      id: article.id,
      judul: article.judul,
      slug: article.slug,
      kategoriId: article.kategoriId,
      kategoriNama: article.kategori.nama,
      kategoriSlug: article.kategori.slug,
      penulis: article.penulis,
      tanggal: article.tanggal.toISOString(),
      status: article.status,
      thumbnailUrl: article.thumbnailUrl,
      ringkasan: article.ringkasan,
      konten: article.konten,
      totalDilihat: article.totalDilihat,
      deletedAt: null,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in getPublicArtikelBySlugAction:', error)
    return { success: false, error: 'Gagal memuat artikel.' }
  }
}

/**
 * Public: Get Latest Articles for Homepage Swiper/Grid
 */
export async function getPublicHomepageArtikelAction(limit: number = 6) {
  try {
    const articles = await prisma.artikel.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
      },
      orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        kategori: {
          select: {
            id: true,
            nama: true,
            slug: true,
          },
        },
      },
    })

    const data: ArtikelDTO[] = articles.map((m) => ({
      id: m.id,
      judul: m.judul,
      slug: m.slug,
      kategoriId: m.kategoriId,
      kategoriNama: m.kategori.nama,
      kategoriSlug: m.kategori.slug,
      penulis: m.penulis,
      tanggal: m.tanggal.toISOString(),
      status: m.status,
      thumbnailUrl: m.thumbnailUrl,
      ringkasan: m.ringkasan,
      konten: m.konten,
      totalDilihat: m.totalDilihat,
      deletedAt: null,
      createdAt: m.createdAt.toISOString(),
    }))

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in getPublicHomepageArtikelAction:', error)
    return { success: false, error: 'Gagal memuat artikel beranda.' }
  }
}

/**
 * Public: Get Articles by Category for Dynamic Landing Page Sections (Khotbah, Bible Study, Zoom)
 */
export async function getPublicArticlesByCategoryAction(params?: {
  kategoriId?: string | null
  limit?: number
}) {
  try {
    const limit = params?.limit || 4
    const whereClause: any = {
      status: 'PUBLISHED',
      deletedAt: null,
    }

    if (params?.kategoriId) {
      whereClause.kategoriId = params.kategoriId
    }

    const articles = await prisma.artikel.findMany({
      where: whereClause,
      orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        kategori: {
          select: {
            id: true,
            nama: true,
            slug: true,
          },
        },
      },
    })

    // If a specific category was requested but has no articles, fall back to recent published articles
    let fallbackArticles = articles
    if (articles.length === 0 && params?.kategoriId) {
      fallbackArticles = await prisma.artikel.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
        },
        orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        include: {
          kategori: {
            select: {
              id: true,
              nama: true,
              slug: true,
            },
          },
        },
      })
    }

    const data: ArtikelDTO[] = fallbackArticles.map((m) => ({
      id: m.id,
      judul: m.judul,
      slug: m.slug,
      kategoriId: m.kategoriId,
      kategoriNama: m.kategori.nama,
      kategoriSlug: m.kategori.slug,
      penulis: m.penulis,
      tanggal: m.tanggal.toISOString(),
      status: m.status,
      thumbnailUrl: m.thumbnailUrl,
      ringkasan: m.ringkasan,
      konten: m.konten,
      totalDilihat: m.totalDilihat,
      deletedAt: null,
      createdAt: m.createdAt.toISOString(),
    }))

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in getPublicArticlesByCategoryAction:', error)
    return { success: false, error: 'Gagal memuat artikel kategori publik.', data: [] }
  }
}

/**
 * Public: Increment Article View Counter (with security check)
 */
export async function incrementArtikelViewAction(slug: string) {
  try {
    if (!slug) return { success: false }

    await prisma.artikel.updateMany({
      where: {
        slug,
        status: 'PUBLISHED',
        deletedAt: null,
      },
      data: {
        totalDilihat: {
          increment: 1,
        },
      },
    })

    return { success: true }
  } catch (error) {
    // Non-blocking error for view counter
    return { success: false }
  }
}

/**
 * Upload image for article editor
 */
export async function uploadEditorImageAction(formData: FormData) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'artikel.create') && !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')) {
      return { success: false, error: 'Akses ditolak: Tidak memiliki izin mengunggah gambar.' }
    }

    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'Tidak ada file yang diunggah.' }
    }

    const storage = getStorageProvider()
    const result = await storage.upload(file)

    return {
      success: true,
      data: {
        url: result.fileUrl,
        identifier: result.identifier,
      },
    }
  } catch (error: any) {
    console.error('Error in uploadEditorImageAction:', error)
    return { success: false, error: error?.message || 'Gagal mengunggah gambar.' }
  }
}

/**
 * Bulk Update Article Status (PUBLISHED / DRAFT)
 */
export async function bulkUpdateStatusArtikelAction(input: { ids: string[]; status: StatusArtikel }) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'artikel.update') && !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')) {
      return { success: false, error: 'Akses ditolak: Tidak memiliki izin memperbarui artikel.' }
    }

    const { ids, status } = input
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Pilih minimal satu artikel.' }
    }

    await prisma.artikel.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { status },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARTIKEL_BULK_STATUS_UPDATED',
      'Artikel',
      ids.join(','),
      JSON.stringify({ total: ids.length, newStatus: status })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath('/artikel')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: `Status ${ids.length} artikel berhasil diubah menjadi ${status === 'PUBLISHED' ? 'Terbit' : 'Draft'}.`,
    }
  } catch (error: any) {
    console.error('Error in bulkUpdateStatusArtikelAction:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui status massal.' }
  }
}

/**
 * Bulk Update Article Category
 */
export async function bulkUpdateKategoriArtikelAction(input: { ids: string[]; kategoriId: string }) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'artikel.update') && !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')) {
      return { success: false, error: 'Akses ditolak: Tidak memiliki izin memperbarui artikel.' }
    }

    const { ids, kategoriId } = input
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Pilih minimal satu artikel.' }
    }

    const cat = await prisma.kategoriArtikel.findUnique({
      where: { id: kategoriId, deletedAt: null },
    })

    if (!cat) {
      return { success: false, error: 'Kategori tujuan tidak valid.' }
    }

    await prisma.artikel.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { kategoriId },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARTIKEL_BULK_CATEGORY_UPDATED',
      'Artikel',
      ids.join(','),
      JSON.stringify({ total: ids.length, targetCategory: cat.nama })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath('/artikel')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: `Kategori ${ids.length} artikel berhasil dialihkan ke "${cat.nama}".`,
    }
  } catch (error: any) {
    console.error('Error in bulkUpdateKategoriArtikelAction:', error)
    return { success: false, error: error?.message || 'Gagal memindahkan kategori massal.' }
  }
}

/**
 * Bulk Soft Delete Articles
 */
export async function bulkSoftDeleteArtikelAction(input: { ids: string[]; reason: string }) {
  try {
    if (!hasPermission(CURRENT_STAFF_ROLE, 'artikel.delete') && !hasPermission(CURRENT_STAFF_ROLE, 'artikel.manage')) {
      return { success: false, error: 'Akses ditolak: Tidak memiliki izin menghapus artikel.' }
    }

    const { ids, reason } = input
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Pilih minimal satu artikel.' }
    }

    await prisma.artikel.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        deletedBy: CURRENT_STAFF_ACTOR,
        deletionReason: reason,
      },
    })

    await createAuditLog(
      CURRENT_STAFF_ACTOR,
      'ARTIKEL_BULK_DELETED',
      'Artikel',
      ids.join(','),
      JSON.stringify({ total: ids.length, reason })
    )

    try {
      revalidatePath('/dashboard/artikel')
      revalidatePath('/artikel')
      revalidatePath('/')
    } catch {}

    return {
      success: true,
      message: `${ids.length} artikel berhasil dipindahkan ke sampah.`,
    }
  } catch (error: any) {
    console.error('Error in bulkSoftDeleteArtikelAction:', error)
    return { success: false, error: error?.message || 'Gagal menghapus massal artikel.' }
  }
}

/**
 * Get Articles for Printable Sheet / Catalogue
 */
export async function getArtikelForPrintSheetsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada artikel yang dipilih.' }
    }

    const items = await prisma.artikel.findMany({
      where: { id: { in: ids } },
      include: {
        kategori: {
          select: { id: true, nama: true, slug: true },
        },
      },
      orderBy: [{ tanggal: 'desc' }],
    })

    const data: ArtikelDTO[] = items.map((m) => ({
      id: m.id,
      judul: m.judul,
      slug: m.slug,
      kategoriId: m.kategoriId,
      kategoriNama: m.kategori.nama,
      kategoriSlug: m.kategori.slug,
      penulis: m.penulis,
      tanggal: m.tanggal.toISOString(),
      status: m.status,
      thumbnailUrl: m.thumbnailUrl,
      ringkasan: m.ringkasan,
      konten: m.konten,
      totalDilihat: m.totalDilihat,
      deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt ? m.updatedAt.toISOString() : undefined,
    }))

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in getArtikelForPrintSheetsAction:', error)
    return { success: false, error: 'Gagal memuat data cetak artikel.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARD COMPATIBILITY ALIASES (FOR SMOOTH TRANSITION)
// ─────────────────────────────────────────────────────────────────────────────
export type MateriRenunganDTO = ArtikelDTO
export type KategoriMateriDTO = KategoriArtikelDTO
export const getKategoriMateriListAction = getKategoriArtikelListAction
export const getKategoriMateriPaginatedAction = getKategoriArtikelPaginatedAction
export const createKategoriMateriAction = createKategoriArtikelAction
export const updateKategoriMateriAction = updateKategoriArtikelAction
export const deleteKategoriMateriAction = deleteKategoriArtikelAction
export const restoreKategoriMateriAction = restoreKategoriArtikelAction
export const getMateriListAction = getArtikelListAction
export const getMateriDetailAction = getArtikelDetailAction
export const createMateriAction = createArtikelAction
export const updateMateriAction = updateArtikelAction
export const deleteMateriAction = deleteArtikelAction
export const restoreMateriAction = restoreArtikelAction
export const hardDeleteMateriAction = hardDeleteArtikelAction
export const getPublicMateriListAction = getPublicArtikelListAction
export const getPublicMateriBySlugAction = getPublicArtikelBySlugAction
export const incrementMateriViewAction = incrementArtikelViewAction
export const bulkUpdateStatusMateriAction = bulkUpdateStatusArtikelAction
export const bulkUpdateKategoriMateriAction = bulkUpdateKategoriArtikelAction
export const bulkSoftDeleteMateriAction = bulkSoftDeleteArtikelAction
export const getMateriForPrintSheetsAction = getArtikelForPrintSheetsAction
export const getArtikelByIdAction = getArtikelDetailAction
export const getMateriByIdAction = getArtikelDetailAction
export const getPublicRenunganCatalogAction = getPublicArtikelCatalogAction

