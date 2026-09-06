'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentStaffSession } from '@/lib/security/session'
import { revalidatePath } from 'next/cache'

export type KategoriPengurusType = 'PIMPINAN_UTAMA' | 'BPH_MAJELIS' | 'KATEGORIAL' | 'DEPARTEMEN_PELAYANAN'
export type ScopeStrukturType = 'UTAMA' | 'KATEGORIAL'
export type LayoutStyleTierType = 'FEATURED' | 'GRID'

export type PengurusGerejaDTO = {
  id: string
  jemaatId: string
  nama: string
  gelar: string | null
  namaOverride: string | null
  namaLengkapTampil: string
  jabatan: string
  kategori: KategoriPengurusType
  kategorialId: string | null
  kategorialNama: string | null
  tierId: string | null
  tierNama: string | null
  level: number // Fallback level (1-4)
  urutan: number
  fotoPublikUrl: string | null
  bioRingkas: string | null
  emailPublik: string | null
  teleponPublik: string | null
  isActivePublik: boolean
  periodeAwal: number | null
  periodeAkhir: number | null
  createdAt: string
  updatedAt: string
}

export type StrukturTierDTO = {
  id: string
  lingkup: ScopeStrukturType
  kategorialId: string | null
  kategorialNama?: string | null
  nama: string
  deskripsi: string | null
  urutan: number
  layoutStyle: LayoutStyleTierType
  jumlahPengurus?: number
  pengurusList?: PengurusGerejaDTO[]
  createdAt: string
  updatedAt: string
}

export type KategorialProfilDTO = {
  id: string
  nama: string
  slug: string
  deskripsi: string | null
  slogan: string | null
  ayatTema: string | null
  jadwalIbadah: string | null
  instagramUrl: string | null
  bannerUrl: string | null
  isActivePublik: boolean
  totalAnggota: number
  tiersCount?: number
  pengurusCount?: number
}

/**
 * Helper to slugify string
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/**
 * Ensure default Tiers, Kategorial Slugs, and Seed Data
 */
export async function ensureDefaultPengurusAndTiers() {
  // 1. Ensure Kategorial Slugs
  const kategorials = await prisma.kategorial.findMany({ where: { deletedAt: null } })
  for (const kat of kategorials) {
    if (!kat.slug) {
      let baseSlug = 'kategorial'
      const lower = kat.nama.toLowerCase()
      if (lower.includes('youth') || lower.includes('pemuda')) baseSlug = 'youth'
      else if (lower.includes('anak') || lower.includes('minggu')) baseSlug = 'anak'
      else if (lower.includes('wanita') || lower.includes('wbi')) baseSlug = 'wanita'
      else if (lower.includes('pria') || lower.includes('pbi')) baseSlug = 'pria'
      else if (lower.includes('remaja') || lower.includes('teens')) baseSlug = 'remaja'
      else if (lower.includes('lansia') || lower.includes('senior')) baseSlug = 'lansia'
      else baseSlug = slugify(kat.nama) || 'komisi'

      // Check unique
      const existing = await prisma.kategorial.findUnique({ where: { slug: baseSlug } })
      const finalSlug = existing ? `${baseSlug}-${kat.id.slice(0, 4)}` : baseSlug

      const defaultSlogan =
        baseSlug === 'youth'
          ? 'Generasi Terang dan Pembawa Dampak Bagi Kristus'
          : baseSlug === 'anak'
          ? 'Mendidik dan Menuntun Anak Dalam Terang Firman Tuhan'
          : baseSlug === 'wanita'
          ? 'Wanita Berkarakter Kristus, Bijak dan Berdaya'
          : baseSlug === 'pria'
          ? 'Pria Sejati, Pemimpin Keluarga yang Berintegritas'
          : 'Melayani Bersama Membangun Tubuh Kristus'

      const defaultJadwal =
        baseSlug === 'youth'
          ? 'Sabtu, 17:00 WIB'
          : baseSlug === 'anak'
          ? 'Minggu, 08:00 & 10:30 WIB'
          : baseSlug === 'wanita'
          ? 'Selasa, 10:00 WIB'
          : 'Minggu, 10:00 WIB'

      await prisma.kategorial.update({
        where: { id: kat.id },
        data: {
          slug: finalSlug,
          slogan: kat.slogan || defaultSlogan,
          ayatTema: kat.ayatTema || (baseSlug === 'youth' ? '1 Timotius 4:12' : 'Amsal 22:6'),
          jadwalIbadah: kat.jadwalIbadah || defaultJadwal,
          instagramUrl: kat.instagramUrl || (baseSlug === 'youth' ? '@getsemaniyouth' : null),
          isActivePublik: true,
        },
      })
    }
  }

  // 2. Ensure Main Tiers (Scope: UTAMA)
  const mainTiersCount = await prisma.strukturTier.count({
    where: { lingkup: 'UTAMA' },
  })
  if (mainTiersCount === 0) {
    const tier1 = await prisma.strukturTier.create({
      data: {
        lingkup: 'UTAMA',
        nama: 'Dewan Gembala & Pimpinan Utama',
        deskripsi: 'Mengarahkan visi rohani, pengajaran firman, dan penggembalaan jemaat.',
        urutan: 1,
        layoutStyle: 'FEATURED',
      },
    })
    const tier2 = await prisma.strukturTier.create({
      data: {
        lingkup: 'UTAMA',
        nama: 'Badan Pengurus Harian & Majelis Jemaat',
        deskripsi: 'Mengelola tata kelola lembaga gereja, administrasi, perbendaharaan, dan tata ibadah.',
        urutan: 2,
        layoutStyle: 'GRID',
      },
    })
    const tier3 = await prisma.strukturTier.create({
      data: {
        lingkup: 'UTAMA',
        nama: 'Departemen Pelayanan & Fasilitas',
        deskripsi: 'Mengkoordinasikan pelayanan teknis ibadah, multimedia, musik, usher, dan diakonia.',
        urutan: 3,
        layoutStyle: 'GRID',
      },
    })

    // Assign existing PengurusGereja without tierId
    const unassignedPengurus = await prisma.pengurusGereja.findMany({
      where: { tierId: null, kategorialId: null },
    })
    for (const p of unassignedPengurus) {
      let targetTierId = tier3.id
      if (p.level === 1 || p.kategori === 'PIMPINAN_UTAMA') targetTierId = tier1.id
      else if (p.level === 2 || p.kategori === 'BPH_MAJELIS') targetTierId = tier2.id

      await prisma.pengurusGereja.update({
        where: { id: p.id },
        data: { tierId: targetTierId },
      })
    }
  }

  // 3. Ensure Youth Default Tiers (Scope: KATEGORIAL)
  const youthKat = await prisma.kategorial.findFirst({
    where: {
      OR: [
        { slug: 'youth' },
        { nama: { contains: 'youth', mode: 'insensitive' } },
        { nama: { contains: 'pemuda', mode: 'insensitive' } },
      ],
      deletedAt: null,
    },
  })

  if (youthKat) {
    const youthTiersCount = await prisma.strukturTier.count({
      where: { lingkup: 'KATEGORIAL', kategorialId: youthKat.id },
    })

    if (youthTiersCount === 0) {
      const yTier1 = await prisma.strukturTier.create({
        data: {
          lingkup: 'KATEGORIAL',
          kategorialId: youthKat.id,
          nama: 'Pembina & Pastoral Youth',
          deskripsi: 'Mendampingi secara rohani dan memberikan bimbingan pastoral bagi pengurus dan jemaat muda.',
          urutan: 1,
          layoutStyle: 'FEATURED',
        },
      })
      const yTier2 = await prisma.strukturTier.create({
        data: {
          lingkup: 'KATEGORIAL',
          kategorialId: youthKat.id,
          nama: 'Badan Pengurus Inti Youth (Core Team)',
          deskripsi: 'Ketua, Wakil Ketua, Sekretaris, dan Bendahara Komisi Pemuda.',
          urutan: 2,
          layoutStyle: 'GRID',
        },
      })
      await prisma.strukturTier.create({
        data: {
          lingkup: 'KATEGORIAL',
          kategorialId: youthKat.id,
          nama: 'Koordinator Divisi Pelayanan Youth',
          deskripsi: 'Divisi Creative Media, Worship & Music, Usher & Hospitality, serta Doa & Komunitas.',
          urutan: 3,
          layoutStyle: 'GRID',
        },
      })

      // Link any existing youth officials
      const unassignedYouthPengurus = await prisma.pengurusGereja.findMany({
        where: { kategorialId: youthKat.id, tierId: null },
      })
      for (const yp of unassignedYouthPengurus) {
        await prisma.pengurusGereja.update({
          where: { id: yp.id },
          data: { tierId: yp.level === 1 ? yTier1.id : yTier2.id },
        })
      }
    }
  }
}

export const ensureDefaultPengurus = ensureDefaultPengurusAndTiers

// ─────────────────────────────────────────────────────────────────────────────
// TIER MANAGEMENT ACTIONS (CRUD & REORDER)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get Tiers for a specific scope & kategorial
 */
export async function getStrukturTiersAction(
  lingkup: ScopeStrukturType = 'UTAMA',
  kategorialId?: string
): Promise<{ success: boolean; data?: StrukturTierDTO[]; error?: string }> {
  try {
    await ensureDefaultPengurusAndTiers()

    const where: any = { lingkup }
    if (lingkup === 'KATEGORIAL') {
      if (kategorialId) {
        where.kategorialId = kategorialId
      }
    } else {
      where.kategorialId = null
    }

    const tiers = await prisma.strukturTier.findMany({
      where,
      include: {
        kategorial: { select: { nama: true } },
        _count: { select: { pengurusList: true } },
      },
      orderBy: { urutan: 'asc' },
    })

    const formatted: StrukturTierDTO[] = tiers.map((t) => ({
      id: t.id,
      lingkup: t.lingkup as ScopeStrukturType,
      kategorialId: t.kategorialId,
      kategorialNama: t.kategorial?.nama || null,
      nama: t.nama,
      deskripsi: t.deskripsi,
      urutan: t.urutan,
      layoutStyle: t.layoutStyle as LayoutStyleTierType,
      jumlahPengurus: t._count.pengurusList,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    return { success: true, data: formatted }
  } catch (error: any) {
    console.error('Error fetching tiers:', error)
    return { success: false, error: 'Gagal memuat tingkatan organisasi.' }
  }
}

/**
 * Create a new Struktur Tier
 */
export async function createStrukturTierAction(input: {
  lingkup: ScopeStrukturType
  kategorialId?: string
  nama: string
  deskripsi?: string
  layoutStyle?: LayoutStyleTierType
  urutan?: number
}): Promise<{ success: boolean; data?: StrukturTierDTO; error?: string }> {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'].includes(session.user.role)) {
      return { success: false, error: 'Akses ditolak.' }
    }

    if (!input.nama.trim()) {
      return { success: false, error: 'Nama tingkat wajib diisi.' }
    }

    // Determine default urutan
    let finalUrutan = input.urutan ?? 0
    if (finalUrutan <= 0) {
      const maxUrutan = await prisma.strukturTier.aggregate({
        where: {
          lingkup: input.lingkup,
          kategorialId: input.lingkup === 'KATEGORIAL' ? input.kategorialId || null : null,
        },
        _max: { urutan: true },
      })
      finalUrutan = (maxUrutan._max.urutan || 0) + 1
    }

    const created = await prisma.strukturTier.create({
      data: {
        lingkup: input.lingkup,
        kategorialId: input.lingkup === 'KATEGORIAL' ? input.kategorialId || null : null,
        nama: input.nama.trim(),
        deskripsi: input.deskripsi?.trim() || null,
        layoutStyle: input.layoutStyle || 'GRID',
        urutan: finalUrutan,
      },
    })

    revalidatePath('/struktur-organisasi')
    revalidatePath('/dashboard/struktur-organisasi')

    return {
      success: true,
      data: {
        id: created.id,
        lingkup: created.lingkup as ScopeStrukturType,
        kategorialId: created.kategorialId,
        nama: created.nama,
        deskripsi: created.deskripsi,
        urutan: created.urutan,
        layoutStyle: created.layoutStyle as LayoutStyleTierType,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    }
  } catch (error: any) {
    console.error('Error creating tier:', error)
    return { success: false, error: 'Gagal menambahkan tingkat jabatan.' }
  }
}

/**
 * Update Struktur Tier
 */
export async function updateStrukturTierAction(
  id: string,
  input: {
    nama?: string
    deskripsi?: string
    layoutStyle?: LayoutStyleTierType
    urutan?: number
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'].includes(session.user.role)) {
      return { success: false, error: 'Akses ditolak.' }
    }

    await prisma.strukturTier.update({
      where: { id },
      data: {
        nama: input.nama?.trim(),
        deskripsi: input.deskripsi !== undefined ? input.deskripsi.trim() || null : undefined,
        layoutStyle: input.layoutStyle,
        urutan: input.urutan !== undefined ? Number(input.urutan) : undefined,
      },
    })

    revalidatePath('/struktur-organisasi')
    revalidatePath('/dashboard/struktur-organisasi')

    return { success: true }
  } catch (error: any) {
    console.error('Error updating tier:', error)
    return { success: false, error: 'Gagal memperbarui tingkat jabatan.' }
  }
}

/**
 * Delete Struktur Tier
 */
export async function deleteStrukturTierAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'].includes(session.user.role)) {
      return { success: false, error: 'Akses ditolak.' }
    }

    // Unassign officials from this tier first
    await prisma.pengurusGereja.updateMany({
      where: { tierId: id },
      data: { tierId: null },
    })

    await prisma.strukturTier.delete({ where: { id } })

    revalidatePath('/struktur-organisasi')
    revalidatePath('/dashboard/struktur-organisasi')

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting tier:', error)
    return { success: false, error: 'Gagal menghapus tingkat jabatan.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KATEGORIAL COMMUNITY PROFILE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get All Kategorials with Profile Information for Admin
 */
export async function getKategorialListForAdminAction(): Promise<{
  success: boolean
  data?: KategorialProfilDTO[]
  error?: string
}> {
  try {
    await ensureDefaultPengurusAndTiers()

    const kategorials = await prisma.kategorial.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            strukturTiers: true,
            pengurusGereja: true,
            anggotaKategorial: true,
          },
        },
      },
      orderBy: { nama: 'asc' },
    })

    const formatted: KategorialProfilDTO[] = kategorials.map((k) => ({
      id: k.id,
      nama: k.nama,
      slug: k.slug || slugify(k.nama),
      deskripsi: k.deskripsi,
      slogan: k.slogan,
      ayatTema: k.ayatTema,
      jadwalIbadah: k.jadwalIbadah,
      instagramUrl: k.instagramUrl,
      bannerUrl: k.bannerUrl,
      isActivePublik: k.isActivePublik,
      totalAnggota: k._count.anggotaKategorial,
      tiersCount: k._count.strukturTiers,
      pengurusCount: k._count.pengurusGereja,
    }))

    return { success: true, data: formatted }
  } catch (error: any) {
    console.error('Error fetching kategorial list for admin:', error)
    return { success: false, error: 'Gagal memuat daftar kategorial.' }
  }
}

/**
 * Update Kategorial Profile
 */
export async function updateProfilKategorialAction(
  id: string,
  input: {
    slogan?: string
    ayatTema?: string
    jadwalIbadah?: string
    instagramUrl?: string
    bannerUrl?: string
    isActivePublik?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'].includes(session.user.role)) {
      return { success: false, error: 'Akses ditolak.' }
    }

    await prisma.kategorial.update({
      where: { id },
      data: {
        slogan: input.slogan !== undefined ? input.slogan.trim() || null : undefined,
        ayatTema: input.ayatTema !== undefined ? input.ayatTema.trim() || null : undefined,
        jadwalIbadah: input.jadwalIbadah !== undefined ? input.jadwalIbadah.trim() || null : undefined,
        instagramUrl: input.instagramUrl !== undefined ? input.instagramUrl.trim() || null : undefined,
        bannerUrl: input.bannerUrl !== undefined ? input.bannerUrl.trim() || null : undefined,
        isActivePublik: input.isActivePublik !== undefined ? input.isActivePublik : undefined,
      },
    })

    revalidatePath('/struktur-organisasi')
    revalidatePath('/dashboard/struktur-organisasi')

    return { success: true }
  } catch (error: any) {
    console.error('Error updating kategorial profile:', error)
    return { success: false, error: 'Gagal memperbarui profil kategorial.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ACTIONS: MAIN CHURCH & DEDICATED KATEGORIAL SUB-PAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get Public Main Church Organizational Structure (Grouped by Dynamic Tiers) + Kategorial Catalogue
 */
export async function getStrukturOrganisasiPublicAction(): Promise<{
  success: boolean
  data?: {
    tiers: StrukturTierDTO[]
    kategorialKatalog: KategorialProfilDTO[]
  }
  error?: string
}> {
  try {
    await ensureDefaultPengurusAndTiers()

    // 1. Fetch Main Tiers with their Active Officials
    const rawTiers = await prisma.strukturTier.findMany({
      where: { lingkup: 'UTAMA' },
      include: {
        pengurusList: {
          where: { isActivePublik: true },
          include: {
            jemaat: { select: { id: true, nama: true } },
            kategorial: { select: { id: true, nama: true } },
          },
          orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { urutan: 'asc' },
    })

    // Also check any main officials without a tier
    const unassignedOfficials = await prisma.pengurusGereja.findMany({
      where: {
        isActivePublik: true,
        tierId: null,
        kategorialId: null,
      },
      include: {
        jemaat: { select: { id: true, nama: true } },
        kategorial: { select: { id: true, nama: true } },
      },
      orderBy: [{ level: 'asc' }, { urutan: 'asc' }, { createdAt: 'asc' }],
    })

    const tiers: StrukturTierDTO[] = rawTiers.map((t) => ({
      id: t.id,
      lingkup: 'UTAMA',
      kategorialId: null,
      nama: t.nama,
      deskripsi: t.deskripsi,
      urutan: t.urutan,
      layoutStyle: t.layoutStyle as LayoutStyleTierType,
      pengurusList: t.pengurusList.map((p) => {
        const namaDasar = p.namaOverride?.trim() || p.jemaat.nama
        return {
          id: p.id,
          jemaatId: p.jemaatId,
          nama: p.jemaat.nama,
          gelar: p.gelar,
          namaOverride: p.namaOverride,
          namaLengkapTampil: p.gelar ? `${namaDasar}, ${p.gelar}` : namaDasar,
          jabatan: p.jabatan,
          kategori: p.kategori as KategoriPengurusType,
          kategorialId: p.kategorialId,
          kategorialNama: p.kategorial?.nama || null,
          tierId: p.tierId,
          tierNama: t.nama,
          level: p.level,
          urutan: p.urutan,
          fotoPublikUrl: p.fotoPublikUrl || null,
          bioRingkas: p.bioRingkas,
          emailPublik: p.emailPublik,
          teleponPublik: p.teleponPublik,
          isActivePublik: p.isActivePublik,
          periodeAwal: p.periodeAwal,
          periodeAkhir: p.periodeAkhir,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }
      }),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    // If there are unassigned officials, append them to the last tier or a default tier
    if (unassignedOfficials.length > 0) {
      if (tiers.length > 0) {
        const lastTier = tiers[tiers.length - 1]
        lastTier.pengurusList = [
          ...(lastTier.pengurusList || []),
          ...unassignedOfficials.map((p) => {
            const namaDasar = p.namaOverride?.trim() || p.jemaat.nama
            return {
              id: p.id,
              jemaatId: p.jemaatId,
              nama: p.jemaat.nama,
              gelar: p.gelar,
              namaOverride: p.namaOverride,
              namaLengkapTampil: p.gelar ? `${namaDasar}, ${p.gelar}` : namaDasar,
              jabatan: p.jabatan,
              kategori: p.kategori as KategoriPengurusType,
              kategorialId: p.kategorialId,
              kategorialNama: p.kategorial?.nama || null,
              tierId: p.tierId,
              tierNama: lastTier.nama,
              level: p.level,
              urutan: p.urutan,
              fotoPublikUrl: p.fotoPublikUrl || null,
              bioRingkas: p.bioRingkas,
              emailPublik: p.emailPublik,
              teleponPublik: p.teleponPublik,
              isActivePublik: p.isActivePublik,
              periodeAwal: p.periodeAwal,
              periodeAkhir: p.periodeAkhir,
              createdAt: p.createdAt.toISOString(),
              updatedAt: p.updatedAt.toISOString(),
            }
          }),
        ]
      }
    }

    // 2. Fetch Active Kategorials Catalogue (excluding 'Umum' since it is the main structure above)
    const kategorials = await prisma.kategorial.findMany({
      where: {
        isActivePublik: true,
        deletedAt: null,
        NOT: {
          OR: [
            { slug: 'umum' },
            { nama: 'Umum' },
            { isDefault: true },
          ],
        },
      },
      include: {
        _count: {
          select: {
            pengurusGereja: { where: { isActivePublik: true } },
            anggotaKategorial: true,
          },
        },
      },
      orderBy: { nama: 'asc' },
    })

    const kategorialKatalog: KategorialProfilDTO[] = kategorials.map((k) => ({
      id: k.id,
      nama: k.nama,
      slug: k.slug || slugify(k.nama),
      deskripsi: k.deskripsi,
      slogan: k.slogan,
      ayatTema: k.ayatTema,
      jadwalIbadah: k.jadwalIbadah,
      instagramUrl: k.instagramUrl,
      bannerUrl: k.bannerUrl,
      isActivePublik: k.isActivePublik,
      totalAnggota: k._count.anggotaKategorial,
      pengurusCount: k._count.pengurusGereja,
    }))

    return {
      success: true,
      data: {
        tiers,
        kategorialKatalog,
      },
    }
  } catch (error: any) {
    console.error('Error fetching public structure:', error)
    return { success: false, error: 'Gagal memuat struktur organisasi publik.' }
  }
}

/**
 * Get Public Dedicated Kategorial Sub-Page Data (e.g. /youth)
 */
export async function getStrukturKategorialPublicAction(slug: string): Promise<{
  success: boolean
  data?: {
    kategorial: KategorialProfilDTO
    tiers: StrukturTierDTO[]
  }
  error?: string
}> {
  try {
    await ensureDefaultPengurusAndTiers()

    const targetSlug = slug.toLowerCase().trim()
    const kategorial = await prisma.kategorial.findFirst({
      where: {
        slug: targetSlug,
        isActivePublik: true,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            pengurusGereja: { where: { isActivePublik: true } },
            anggotaKategorial: true,
          },
        },
      },
    })

    if (!kategorial) {
      return { success: false, error: 'Halaman kategorial tidak ditemukan atau belum aktif.' }
    }

    // Fetch Tiers belonging to this Kategorial
    const rawTiers = await prisma.strukturTier.findMany({
      where: {
        lingkup: 'KATEGORIAL',
        kategorialId: kategorial.id,
      },
      include: {
        pengurusList: {
          where: { isActivePublik: true },
          include: {
            jemaat: { select: { id: true, nama: true } },
          },
          orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { urutan: 'asc' },
    })

    // Fetch any officials of this kategorial not yet assigned to a tier
    const unassignedOfficials = await prisma.pengurusGereja.findMany({
      where: {
        kategorialId: kategorial.id,
        tierId: null,
        isActivePublik: true,
      },
      include: {
        jemaat: { select: { id: true, nama: true } },
      },
      orderBy: [{ level: 'asc' }, { urutan: 'asc' }, { createdAt: 'asc' }],
    })

    const tiers: StrukturTierDTO[] = rawTiers.map((t) => ({
      id: t.id,
      lingkup: 'KATEGORIAL',
      kategorialId: t.kategorialId,
      nama: t.nama,
      deskripsi: t.deskripsi,
      urutan: t.urutan,
      layoutStyle: t.layoutStyle as LayoutStyleTierType,
      pengurusList: t.pengurusList.map((p) => {
        const namaDasar = p.namaOverride?.trim() || p.jemaat.nama
        return {
          id: p.id,
          jemaatId: p.jemaatId,
          nama: p.jemaat.nama,
          gelar: p.gelar,
          namaOverride: p.namaOverride,
          namaLengkapTampil: p.gelar ? `${namaDasar}, ${p.gelar}` : namaDasar,
          jabatan: p.jabatan,
          kategori: p.kategori as KategoriPengurusType,
          kategorialId: p.kategorialId,
          kategorialNama: kategorial.nama,
          tierId: p.tierId,
          tierNama: t.nama,
          level: p.level,
          urutan: p.urutan,
          fotoPublikUrl: p.fotoPublikUrl || null,
          bioRingkas: p.bioRingkas,
          emailPublik: p.emailPublik,
          teleponPublik: p.teleponPublik,
          isActivePublik: p.isActivePublik,
          periodeAwal: p.periodeAwal,
          periodeAkhir: p.periodeAkhir,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }
      }),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    // If there are unassigned officials, append to last tier or create a virtual tier
    if (unassignedOfficials.length > 0) {
      if (tiers.length > 0) {
        const lastTier = tiers[tiers.length - 1]
        lastTier.pengurusList = [
          ...(lastTier.pengurusList || []),
          ...unassignedOfficials.map((p) => {
            const namaDasar = p.namaOverride?.trim() || p.jemaat.nama
            return {
              id: p.id,
              jemaatId: p.jemaatId,
              nama: p.jemaat.nama,
              gelar: p.gelar,
              namaOverride: p.namaOverride,
              namaLengkapTampil: p.gelar ? `${namaDasar}, ${p.gelar}` : namaDasar,
              jabatan: p.jabatan,
              kategori: p.kategori as KategoriPengurusType,
              kategorialId: p.kategorialId,
              kategorialNama: kategorial.nama,
              tierId: p.tierId,
              tierNama: lastTier.nama,
              level: p.level,
              urutan: p.urutan,
              fotoPublikUrl: p.fotoPublikUrl || null,
              bioRingkas: p.bioRingkas,
              emailPublik: p.emailPublik,
              teleponPublik: p.teleponPublik,
              isActivePublik: p.isActivePublik,
              periodeAwal: p.periodeAwal,
              periodeAkhir: p.periodeAkhir,
              createdAt: p.createdAt.toISOString(),
              updatedAt: p.updatedAt.toISOString(),
            }
          }),
        ]
      }
    }

    return {
      success: true,
      data: {
        kategorial: {
          id: kategorial.id,
          nama: kategorial.nama,
          slug: kategorial.slug || targetSlug,
          deskripsi: kategorial.deskripsi,
          slogan: kategorial.slogan,
          ayatTema: kategorial.ayatTema,
          jadwalIbadah: kategorial.jadwalIbadah,
          instagramUrl: kategorial.instagramUrl,
          bannerUrl: kategorial.bannerUrl,
          isActivePublik: kategorial.isActivePublik,
          totalAnggota: kategorial._count.anggotaKategorial,
          pengurusCount: kategorial._count.pengurusGereja,
        },
        tiers,
      },
    }
  } catch (error: any) {
    console.error('Error fetching dedicated kategorial structure:', error)
    return { success: false, error: 'Gagal memuat profil kategorial.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIALS CRUD FOR ADMIN (SCOPE-AWARE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get Officials for Admin CMS Table with Scope Filter
 */
export async function getStrukturOrganisasiAdminAction(params?: {
  scope?: ScopeStrukturType
  kategorialId?: string
  search?: string
}): Promise<{
  success: boolean
  data?: PengurusGerejaDTO[]
  error?: string
}> {
  try {
    const session = await getCurrentStaffSession()
    if (!session) {
      return { success: false, error: 'Sesi berakhir. Silakan login kembali.' }
    }

    await ensureDefaultPengurusAndTiers()

    const whereClause: any = {}

    if (params?.scope === 'UTAMA') {
      whereClause.kategorialId = null
    } else if (params?.scope === 'KATEGORIAL') {
      if (params.kategorialId) {
        whereClause.kategorialId = params.kategorialId
      } else {
        whereClause.kategorialId = { not: null }
      }
    }

    if (params?.search) {
      const q = params.search.trim()
      whereClause.OR = [
        { jabatan: { contains: q, mode: 'insensitive' } },
        { namaOverride: { contains: q, mode: 'insensitive' } },
        { jemaat: { nama: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const rawList = await prisma.pengurusGereja.findMany({
      where: whereClause,
      include: {
        jemaat: { select: { id: true, nama: true } },
        kategorial: { select: { id: true, nama: true } },
        tier: { select: { id: true, nama: true } },
      },
      orderBy: [{ level: 'asc' }, { urutan: 'asc' }, { createdAt: 'asc' }],
    })

    const formatted: PengurusGerejaDTO[] = rawList.map((p) => {
      const namaDasar = p.namaOverride?.trim() || p.jemaat.nama
      return {
        id: p.id,
        jemaatId: p.jemaatId,
        nama: p.jemaat.nama,
        gelar: p.gelar,
        namaOverride: p.namaOverride,
        namaLengkapTampil: p.gelar ? `${namaDasar}, ${p.gelar}` : namaDasar,
        jabatan: p.jabatan,
        kategori: p.kategori as KategoriPengurusType,
        kategorialId: p.kategorialId,
        kategorialNama: p.kategorial?.nama || null,
        tierId: p.tierId,
        tierNama: p.tier?.nama || null,
        level: p.level,
        urutan: p.urutan,
        fotoPublikUrl: p.fotoPublikUrl || null,
        bioRingkas: p.bioRingkas,
        emailPublik: p.emailPublik,
        teleponPublik: p.teleponPublik,
        isActivePublik: p.isActivePublik,
        periodeAwal: p.periodeAwal,
        periodeAkhir: p.periodeAkhir,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }
    })

    return { success: true, data: formatted }
  } catch (error: any) {
    console.error('Error fetching admin struktur organisasi:', error)
    return { success: false, error: 'Gagal memuat data pengurus.' }
  }
}

/**
 * Get simple list of Jemaat for Autocomplete picker
 */
export async function getJemaatListForSelectAction(searchQuery?: string) {
  try {
    const where: any = { deletedAt: null }
    if (searchQuery && searchQuery.trim().length > 0) {
      where.OR = [
        { nama: { contains: searchQuery.trim(), mode: 'insensitive' } },
        { nij: { contains: searchQuery.trim(), mode: 'insensitive' } },
      ]
    }

    const jemaatList = await prisma.jemaat.findMany({
      where,
      select: {
        id: true,
        nama: true,
        nij: true,
        statusJemaat: true,
      },
      orderBy: { nama: 'asc' },
      take: 50,
    })

    return { success: true, data: jemaatList }
  } catch (error: any) {
    console.error('Error fetching jemaat for select:', error)
    return { success: false, error: 'Gagal mencari data jemaat.', data: [] }
  }
}

/**
 * Create Pengurus Record (With Dynamic Tier & Scope)
 */
export async function createPengurusAction(input: {
  jemaatId: string
  jabatan: string
  gelar?: string
  namaOverride?: string
  kategori: KategoriPengurusType
  kategorialId?: string
  tierId?: string
  level?: number
  urutan?: number
  fotoPublikUrl?: string
  bioRingkas?: string
  emailPublik?: string
  teleponPublik?: string
  isActivePublik?: boolean
  periodeAwal?: number
  periodeAkhir?: number
}): Promise<{ success: boolean; data?: PengurusGerejaDTO; error?: string }> {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'].includes(session.user.role)) {
      return { success: false, error: 'Akses ditolak.' }
    }

    // Determine default urutan if not provided
    let finalUrutan = input.urutan ?? 0
    if (finalUrutan === 0) {
      const maxUrutan = await prisma.pengurusGereja.aggregate({
        where: {
          tierId: input.tierId || null,
          kategorialId: input.kategorialId || null,
        },
        _max: { urutan: true },
      })
      finalUrutan = (maxUrutan._max.urutan || 0) + 1
    }

    const created = await prisma.pengurusGereja.create({
      data: {
        jemaatId: input.jemaatId,
        jabatan: input.jabatan.trim(),
        gelar: input.gelar?.trim() || null,
        namaOverride: input.namaOverride?.trim() || null,
        kategori: input.kategori,
        kategorialId: input.kategorialId || null,
        tierId: input.tierId || null,
        level: Number(input.level) || 3,
        urutan: finalUrutan,
        fotoPublikUrl: input.fotoPublikUrl || null,
        bioRingkas: input.bioRingkas?.trim() || null,
        emailPublik: input.emailPublik?.trim() || null,
        teleponPublik: input.teleponPublik?.trim() || null,
        isActivePublik: input.isActivePublik ?? true,
        periodeAwal: input.periodeAwal ? Number(input.periodeAwal) : null,
        periodeAkhir: input.periodeAkhir ? Number(input.periodeAkhir) : null,
      },
      include: {
        jemaat: { select: { nama: true } },
        kategorial: { select: { nama: true } },
        tier: { select: { nama: true } },
      },
    })

    revalidatePath('/struktur-organisasi')
    revalidatePath('/dashboard/struktur-organisasi')

    const namaDasar = created.namaOverride?.trim() || created.jemaat.nama
    const namaLengkap = created.gelar ? `${namaDasar}, ${created.gelar}` : namaDasar

    return {
      success: true,
      data: {
        id: created.id,
        jemaatId: created.jemaatId,
        nama: created.jemaat.nama,
        gelar: created.gelar,
        namaOverride: created.namaOverride,
        namaLengkapTampil: namaLengkap,
        jabatan: created.jabatan,
        kategori: created.kategori as KategoriPengurusType,
        kategorialId: created.kategorialId,
        kategorialNama: created.kategorial?.nama || null,
        tierId: created.tierId,
        tierNama: created.tier?.nama || null,
        level: created.level,
        urutan: created.urutan,
        fotoPublikUrl: created.fotoPublikUrl || null,
        bioRingkas: created.bioRingkas,
        emailPublik: created.emailPublik,
        teleponPublik: created.teleponPublik,
        isActivePublik: created.isActivePublik,
        periodeAwal: created.periodeAwal,
        periodeAkhir: created.periodeAkhir,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    }
  } catch (error: any) {
    console.error('Error creating pengurus:', error)
    return { success: false, error: error?.message || 'Gagal menambahkan pengurus gereja.' }
  }
}

/**
 * Update Pengurus Record
 */
export async function updatePengurusAction(
  id: string,
  input: {
    jemaatId?: string
    jabatan: string
    gelar?: string
    namaOverride?: string
    kategori: KategoriPengurusType
    kategorialId?: string
    tierId?: string
    level: number
    urutan?: number
    fotoPublikUrl?: string
    bioRingkas?: string
    emailPublik?: string
    teleponPublik?: string
    isActivePublik?: boolean
    periodeAwal?: number
    periodeAkhir?: number
  }
): Promise<{ success: boolean; data?: PengurusGerejaDTO; error?: string }> {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'].includes(session.user.role)) {
      return { success: false, error: 'Akses ditolak.' }
    }

    const updated = await prisma.pengurusGereja.update({
      where: { id },
      data: {
        jemaatId: input.jemaatId || undefined,
        jabatan: input.jabatan.trim(),
        gelar: input.gelar !== undefined ? input.gelar.trim() || null : undefined,
        namaOverride: input.namaOverride !== undefined ? input.namaOverride.trim() || null : undefined,
        kategori: input.kategori,
        kategorialId: input.kategorialId !== undefined ? input.kategorialId || null : undefined,
        tierId: input.tierId !== undefined ? input.tierId || null : undefined,
        level: Number(input.level) || 3,
        urutan: input.urutan !== undefined ? Number(input.urutan) : undefined,
        fotoPublikUrl: input.fotoPublikUrl !== undefined ? input.fotoPublikUrl.trim() || null : undefined,
        bioRingkas: input.bioRingkas !== undefined ? input.bioRingkas.trim() || null : undefined,
        emailPublik: input.emailPublik !== undefined ? input.emailPublik.trim() || null : undefined,
        teleponPublik: input.teleponPublik !== undefined ? input.teleponPublik.trim() || null : undefined,
        isActivePublik: input.isActivePublik,
        periodeAwal: input.periodeAwal !== undefined ? (input.periodeAwal ? Number(input.periodeAwal) : null) : undefined,
        periodeAkhir: input.periodeAkhir !== undefined ? (input.periodeAkhir ? Number(input.periodeAkhir) : null) : undefined,
      },
      include: {
        jemaat: { select: { nama: true } },
        kategorial: { select: { nama: true } },
        tier: { select: { nama: true } },
      },
    })

    revalidatePath('/struktur-organisasi')
    revalidatePath('/dashboard/struktur-organisasi')

    const namaDasar = updated.namaOverride?.trim() || updated.jemaat.nama
    const namaLengkap = updated.gelar ? `${namaDasar}, ${updated.gelar}` : namaDasar

    return {
      success: true,
      data: {
        id: updated.id,
        jemaatId: updated.jemaatId,
        nama: updated.jemaat.nama,
        gelar: updated.gelar,
        namaOverride: updated.namaOverride,
        namaLengkapTampil: namaLengkap,
        jabatan: updated.jabatan,
        kategori: updated.kategori as KategoriPengurusType,
        kategorialId: updated.kategorialId,
        kategorialNama: updated.kategorial?.nama || null,
        tierId: updated.tierId,
        tierNama: updated.tier?.nama || null,
        level: updated.level,
        urutan: updated.urutan,
        fotoPublikUrl: updated.fotoPublikUrl || null,
        bioRingkas: updated.bioRingkas,
        emailPublik: updated.emailPublik,
        teleponPublik: updated.teleponPublik,
        isActivePublik: updated.isActivePublik,
        periodeAwal: updated.periodeAwal,
        periodeAkhir: updated.periodeAkhir,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    }
  } catch (error: any) {
    console.error('Error updating pengurus:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui pengurus gereja.' }
  }
}

/**
 * Delete Pengurus Record
 */
export async function deletePengurusAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'].includes(session.user.role)) {
      return { success: false, error: 'Akses ditolak.' }
    }

    await prisma.pengurusGereja.delete({ where: { id } })

    revalidatePath('/struktur-organisasi')
    revalidatePath('/dashboard/struktur-organisasi')

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting pengurus:', error)
    return { success: false, error: 'Gagal menghapus pengurus gereja.' }
  }
}
