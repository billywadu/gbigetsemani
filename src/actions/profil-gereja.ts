'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentStaffSession } from '@/lib/security/session'
import { revalidatePath } from 'next/cache'

export type ProfilGerejaDTO = {
  id: string
  namaGereja: string
  sinode: string
  tagline: string
  ayatEmas: string
  isiAyatEmas: string | null
  alamat: string
  telepon: string | null
  email: string | null
  whatsapp: string | null
  instagram: string | null
  youtube: string | null
  googleMapsUrl: string | null
  visi: string | null
  misi: string | null
  nilaiInti: string | null
  pengakuanIman: string | null
  sejarahLengkap: string | null
  fotoGedungUrl: string | null
  fotoGembalaUrl: string | null
  updatedAt: string
}

export type MilestoneDTO = {
  id: string
  tahun: number
  judul: string
  deskripsi: string
  fotoUrl: string | null
  urutan: number
}

/**
 * Ensure default ProfilGereja and starter Milestones exist in DB
 */
export async function ensureDefaultProfilGereja() {
  const existing = await prisma.profilGereja.findUnique({
    where: { id: 'MAIN' },
  })

  if (!existing) {
    await prisma.profilGereja.create({
      data: {
        id: 'MAIN',
        namaGereja: 'GBI Getsemani',
        sinode: 'Gereja Bethel Indonesia',
        tagline: 'Gereja Yang Membawa Pemulihan & Transformasi Hidup',
        ayatEmas: 'Matius 28:19-20',
        isiAyatEmas:
          'Karena itu pergilah, jadikanlah semua bangsa murid-Ku dan baptislah mereka dalam nama Bapa dan Anak dan Roh Kudus, dan ajarlah mereka melakukan segala sesuatu yang telah Kuperintahkan kepadamu. Dan ketahuilah, Aku menyertai kamu senantiasa sampai kepada akhir zaman.',
        alamat: 'Jl. Kasih Karunia No. 7, Jakarta',
        telepon: '(021) 555-1234',
        email: 'info@gbigetsemani.org',
        whatsapp: '+6281234567890',
        instagram: '@gbigetsemani',
        youtube: 'GBI Getsemani Official',
        visi: 'Menjadi gereja yang berakar kuat dalam firman Tuhan, bertumbuh dalam kasih persaudaraan, dan berbuah lebat mentransformasi komunitas serta bangsa-bangsa bagi kemuliaan Kristus.',
        misi: JSON.stringify([
          'Menyatakan kasih Kristus melalui ibadah yang hidup dan pengajaran firman yang murni.',
          'Membangun pemuridan yang berkesinambungan melalui kelompok sel (Komsel) dan kategorial.',
          'Menjangkau jiwa-jiwa baru dan memberdayakan jemaat untuk melayani sesama dengan integritas.',
          'Melakukan aksi nyata kepedulian sosial dan misi lintas generasi.',
        ]),
        nilaiInti: JSON.stringify([
          {
            title: 'Christ-Centered (Berpusat Pada Kristus)',
            desc: 'Segala pelayanan, pengajaran, dan kehidupan bergereja berakar dan bermuara hanya kepada Tuhan Yesus Kristus.',
          },
          {
            title: 'Authentic Community (Komunitas Sejati)',
            desc: 'Membangun keluarga rohani yang saling mengasihi, menguatkan, transparan, dan bertumbuh bersama dalam iman.',
          },
          {
            title: 'Servant Leadership (Kepemimpinan Melayani)',
            desc: 'Memimpin dengan kerendahan hati dan ketulusan hati, meneladani teladan Tuhan Yesus yang datang untuk melayani.',
          },
          {
            title: 'Kingdom Impact (Dampak Kerajaan Allah)',
            desc: 'Menjadi terang dan garam yang membawa transformasi positif, belas kasih, dan pengharapan bagi masyarakat sekitar.',
          },
        ]),
        pengakuanIman: `Kami percaya kepada satu Allah yang Esa, yang menyatakan diri-Nya dalam tiga pribadi: Bapa, Anak, dan Roh Kudus.

Kami percaya bahwa Alkitab adalah firman Allah yang diilhamkan tanpa salah, menjadi pedoman mutlak bagi iman dan tingkah laku orang percaya.

Kami percaya kepada Yesus Kristus, Anak Allah yang tunggal, yang telah mati disalibkan untuk menebus dosa manusia, bangkit pada hari ketiga, naik ke surga, dan akan datang kembali dalam kemuliaan.

Kami percaya akan baptisan Roh Kudus dengan tanda berkata-kata dalam bahasa roh sebagaimana diilhamkan oleh Roh Kudus, dan buah Roh serta karunia-karunia Roh yang nyata dalam kehidupan orang percaya.`,
        sejarahLengkap: `## Awal Mula Perintisan

Perjalanan **GBI Getsemani** berawal dari sebuah persekutuan doa kecil yang terdiri dari beberapa keluarga pada tahun 1995. Didorong oleh kerinduan yang mendalam akan kebangunan rohani dan pengajaran firman Tuhan yang mendalam, persekutuan doa ini mulai mengadakan ibadah mingguan di sebuah ruko sederhana.

Dalam pimpinan Roh Kudus, jemaat terus mengalami pertumbuhan rohani dan kuantitas. Pada tahun 2002, gereja secara resmi bergabung dalam naungan Sinode Gereja Bethel Indonesia (GBI).

> [!BIBLE] Matius 16:18
> "Dan Akupun berkata kepadamu: Engkau adalah Petrus dan di atas batu karang ini Aku akan mendirikan jemaat-Ku dan alam maut tidak akan menguasainya."

## Masa Pertumbuhan & Pembangunan

Dengan semakin bertambahnya jiwa-jiwa yang dimenangkan, gereja memulai pembangunan gedung ibadah permanen pada tahun 2008. Melalui kemurahan Tuhan dan kesatuan hati seluruh jemaat, gedung gereja diresmikan pada tahun 2011 sebagai pusat ibadah, pemuridan, dan pelayanan masyarakat.

## Pelayanan Multi-Generasi & Transformasi

Hingga saat ini, GBI Getsemani terus berkomitmen melayani seluruh generasi—mulai dari Sekolah Minggu, Remaja & Pemuda (Youth), Kaum Profesional, hingga Kaum Lanjut Usia. Kami percaya bahwa setiap jemaat dipanggil untuk menjadi murid Kristus yang berbuah dan berdampak nyata bagi kota dan bangsa.`,
      },
    })
  }

  // Ensure default milestones exist
  const countMilestones = await prisma.milestoneSejarah.count()
  if (countMilestones === 0) {
    await prisma.milestoneSejarah.createMany({
      data: [
        {
          tahun: 1995,
          judul: 'Awal Perintisan & Persekutuan Doa',
          deskripsi: 'Dimulainya persekutuan doa mingguan oleh 5 keluarga perintis di ruko sederhana dengan visi penjangkauan jiwa.',
          urutan: 1,
        },
        {
          tahun: 2002,
          judul: 'Peresmian Jemaat Lokal Mandiri',
          deskripsi: 'Secara resmi bergabung dan ditahbiskan di bawah naungan Sinode Gereja Bethel Indonesia (GBI).',
          urutan: 2,
        },
        {
          tahun: 2008,
          judul: 'Peletakan Batu Pertama Gedung Ibadah',
          deskripsi: 'Pembangunan gedung ibadah tetap dimulai di atas lahan yang didedikasikan untuk pelayanan multi-generasi.',
          urutan: 3,
        },
        {
          tahun: 2011,
          judul: 'Pentahbisan Gedung Gereja & Pusat Pelayanan',
          deskripsi: 'Peresmian gedung ibadah permanen dan perluasan divisi pelayanan kategorial serta komsel wilayah.',
          urutan: 4,
        },
        {
          tahun: 2020,
          judul: 'Transformasi Pelayanan Digital & Media',
          deskripsi: 'Pengembangan streaming ibadah daring, aplikasi presensi jemaat, dan pelayanan sosial terpadu masa pandemi.',
          urutan: 5,
        },
      ],
    })
  }
}

/**
 * Get Public Profile & Milestones
 */
export async function getProfilGerejaPublicAction(): Promise<{
  success: boolean
  data?: {
    profil: ProfilGerejaDTO
    milestones: MilestoneDTO[]
  }
  error?: string
}> {
  try {
    await ensureDefaultProfilGereja()

    const raw = await prisma.profilGereja.findUnique({
      where: { id: 'MAIN' },
    })

    const milestones = await prisma.milestoneSejarah.findMany({
      orderBy: [{ tahun: 'asc' }, { urutan: 'asc' }],
    })

    if (!raw) {
      return { success: false, error: 'Profil gereja belum tersedia.' }
    }

    const profil: ProfilGerejaDTO = {
      id: raw.id,
      namaGereja: raw.namaGereja,
      sinode: raw.sinode,
      tagline: raw.tagline,
      ayatEmas: raw.ayatEmas,
      isiAyatEmas: raw.isiAyatEmas,
      alamat: raw.alamat,
      telepon: raw.telepon,
      email: raw.email,
      whatsapp: raw.whatsapp,
      instagram: raw.instagram,
      youtube: raw.youtube,
      googleMapsUrl: raw.googleMapsUrl,
      visi: raw.visi,
      misi: raw.misi,
      nilaiInti: raw.nilaiInti,
      pengakuanIman: raw.pengakuanIman,
      sejarahLengkap: raw.sejarahLengkap,
      fotoGedungUrl: raw.fotoGedungUrl,
      fotoGembalaUrl: raw.fotoGembalaUrl,
      updatedAt: raw.updatedAt.toISOString(),
    }

    const formattedMilestones: MilestoneDTO[] = milestones.map((m) => ({
      id: m.id,
      tahun: m.tahun,
      judul: m.judul,
      deskripsi: m.deskripsi,
      fotoUrl: m.fotoUrl,
      urutan: m.urutan,
    }))

    return {
      success: true,
      data: {
        profil,
        milestones: formattedMilestones,
      },
    }
  } catch (error: any) {
    console.error('Error fetching public profil gereja:', error)
    return { success: false, error: error?.message || 'Gagal memuat profil gereja.' }
  }
}

/**
 * Get Full Admin Profile & Milestones
 */
export async function getProfilGerejaAdminAction(): Promise<{
  success: boolean
  data?: {
    profil: ProfilGerejaDTO
    milestones: MilestoneDTO[]
  }
  error?: string
}> {
  try {
    const session = await getCurrentStaffSession()
    if (!session) {
      return { success: false, error: 'Sesi Anda telah berakhir. Silakan login kembali.' }
    }

    await ensureDefaultProfilGereja()

    const raw = await prisma.profilGereja.findUnique({
      where: { id: 'MAIN' },
    })

    const milestones = await prisma.milestoneSejarah.findMany({
      orderBy: [{ tahun: 'asc' }, { urutan: 'asc' }],
    })

    if (!raw) {
      return { success: false, error: 'Profil gereja belum tersedia.' }
    }

    return {
      success: true,
      data: {
        profil: {
          id: raw.id,
          namaGereja: raw.namaGereja,
          sinode: raw.sinode,
          tagline: raw.tagline,
          ayatEmas: raw.ayatEmas,
          isiAyatEmas: raw.isiAyatEmas,
          alamat: raw.alamat,
          telepon: raw.telepon,
          email: raw.email,
          whatsapp: raw.whatsapp,
          instagram: raw.instagram,
          youtube: raw.youtube,
          googleMapsUrl: raw.googleMapsUrl,
          visi: raw.visi,
          misi: raw.misi,
          nilaiInti: raw.nilaiInti,
          pengakuanIman: raw.pengakuanIman,
          sejarahLengkap: raw.sejarahLengkap,
          fotoGedungUrl: raw.fotoGedungUrl,
          fotoGembalaUrl: raw.fotoGembalaUrl,
          updatedAt: raw.updatedAt.toISOString(),
        },
        milestones: milestones.map((m) => ({
          id: m.id,
          tahun: m.tahun,
          judul: m.judul,
          deskripsi: m.deskripsi,
          fotoUrl: m.fotoUrl,
          urutan: m.urutan,
        })),
      },
    }
  } catch (error: any) {
    console.error('Error fetching admin profil gereja:', error)
    return { success: false, error: error?.message || 'Gagal memuat profil gereja.' }
  }
}

/**
 * Update Profile Information (Protected: SUPER_ADMIN, GEMBALA)
 */
export async function updateProfilGerejaAction(input: {
  namaGereja: string
  sinode: string
  tagline: string
  ayatEmas: string
  isiAyatEmas?: string
  alamat: string
  telepon?: string
  email?: string
  whatsapp?: string
  instagram?: string
  youtube?: string
  googleMapsUrl?: string
  visi?: string
  misi?: string
  nilaiInti?: string
  pengakuanIman?: string
  sejarahLengkap?: string
  fotoGedungUrl?: string
  fotoGembalaUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentStaffSession()
    if (!session) {
      return { success: false, error: 'Sesi Anda telah berakhir. Silakan login kembali.' }
    }

    if (!['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'].includes(session.user.role)) {
      return { success: false, error: 'Akses ditolak: Anda tidak berhak mengubah profil gereja.' }
    }

    await prisma.profilGereja.upsert({
      where: { id: 'MAIN' },
      create: {
        id: 'MAIN',
        ...input,
        updatedBy: session.user.nama,
      },
      update: {
        ...input,
        updatedBy: session.user.nama,
      },
    })

    revalidatePath('/tentang-kami')
    revalidatePath('/dashboard/settings/profil-gereja')

    return { success: true }
  } catch (error: any) {
    console.error('Error updating profil gereja:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui profil gereja.' }
  }
}

/**
 * Milestone CRUD Actions
 */
export async function createMilestoneAction(input: {
  tahun: number
  judul: string
  deskripsi: string
  fotoUrl?: string
  urutan?: number
}): Promise<{ success: boolean; data?: MilestoneDTO; error?: string }> {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'].includes(session.user.role)) {
      return { success: false, error: 'Akses ditolak.' }
    }

    const created = await prisma.milestoneSejarah.create({
      data: {
        tahun: Number(input.tahun),
        judul: input.judul.trim(),
        deskripsi: input.deskripsi.trim(),
        fotoUrl: input.fotoUrl || null,
        urutan: input.urutan || 0,
      },
    })

    revalidatePath('/tentang-kami')
    revalidatePath('/dashboard/settings/profil-gereja')

    return {
      success: true,
      data: {
        id: created.id,
        tahun: created.tahun,
        judul: created.judul,
        deskripsi: created.deskripsi,
        fotoUrl: created.fotoUrl,
        urutan: created.urutan,
      },
    }
  } catch (error: any) {
    console.error('Error creating milestone:', error)
    return { success: false, error: error?.message || 'Gagal menambah tonggak sejarah.' }
  }
}

export async function updateMilestoneAction(
  id: string,
  input: {
    tahun: number
    judul: string
    deskripsi: string
    fotoUrl?: string
    urutan?: number
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'].includes(session.user.role)) {
      return { success: false, error: 'Akses ditolak.' }
    }

    await prisma.milestoneSejarah.update({
      where: { id },
      data: {
        tahun: Number(input.tahun),
        judul: input.judul.trim(),
        deskripsi: input.deskripsi.trim(),
        fotoUrl: input.fotoUrl || null,
        urutan: input.urutan ?? 0,
      },
    })

    revalidatePath('/tentang-kami')
    revalidatePath('/dashboard/settings/profil-gereja')

    return { success: true }
  } catch (error: any) {
    console.error('Error updating milestone:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui tonggak sejarah.' }
  }
}

export async function deleteMilestoneAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentStaffSession()
    if (!session || !['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'].includes(session.user.role)) {
      return { success: false, error: 'Akses ditolak.' }
    }

    await prisma.milestoneSejarah.delete({ where: { id } })

    revalidatePath('/tentang-kami')
    revalidatePath('/dashboard/settings/profil-gereja')

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting milestone:', error)
    return { success: false, error: error?.message || 'Gagal menghapus tonggak sejarah.' }
  }
}
