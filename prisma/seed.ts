import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('--- SEEDING PRODUCTION SUPER ADMIN USER ONLY ---')

  const adminUsername = process.env.SEED_SUPER_ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'wew54321'
  const passwordHashAdmin = await bcrypt.hash(adminPassword, 10)

  // 1. Clean up demo audit logs & sessions for other users
  await prisma.session.deleteMany()
  await prisma.userKategorialScope.deleteMany()
  await prisma.auditLog.deleteMany()

  // 2. Clean up all demo dummy tables
  await prisma.permohonanDoa.deleteMany()
  await prisma.artikel.deleteMany()
  await prisma.kategoriArtikel.deleteMany()
  await prisma.dokumenJemaat.deleteMany()
  await prisma.arsipGereja.deleteMany()
  await prisma.transaksiKeuangan.deleteMany()
  await prisma.laporanKeuangan.deleteMany()
  await prisma.scopeKeuangan.deleteMany()
  await prisma.pendaftaranJemaat.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.event.deleteMany()
  await prisma.pelayanKategori.deleteMany()
  await prisma.pelayan.deleteMany()
  await prisma.kategoriPelayanan.deleteMany()
  await prisma.anggotaKomsel.deleteMany()
  await prisma.komsel.deleteMany()
  await prisma.anggotaKategorial.deleteMany()
  await prisma.kategorial.deleteMany()
  await prisma.anggotaKeluarga.deleteMany()
  await prisma.keluarga.deleteMany()
  await prisma.jemaat.deleteMany()
  await prisma.suratResmi.deleteMany()
  await prisma.pengurusGereja.deleteMany()
  await prisma.strukturTier.deleteMany()
  await prisma.milestoneSejarah.deleteMany()

  // 3. Remove all other users except the single Super Admin
  await prisma.user.deleteMany({
    where: {
      username: {
        not: adminUsername,
      },
    },
  })

  // 4. Upsert Single Super Admin Account
  const superAdmin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash: passwordHashAdmin,
      email: 'admin@gereja.org',
      nama: 'Super Administrator',
      role: 'SUPER_ADMIN',
      status: 'AKTIF',
      isActive: true,
      noHp: '081122334455',
      deletedAt: null,
    },
    create: {
      username: adminUsername,
      email: 'admin@gereja.org',
      nama: 'Super Administrator',
      passwordHash: passwordHashAdmin,
      role: 'SUPER_ADMIN',
      status: 'AKTIF',
      isActive: true,
      noHp: '081122334455',
    },
  })

  // 5. Upsert Permanent System Default Kategorial "Umum"
  const defaultKategorial = await prisma.kategorial.upsert({
    where: { nama: 'Umum' },
    update: {
      isDefault: true,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
    },
    create: {
      nama: 'Umum',
      deskripsi: 'Kategori jemaat umum bawaan sistem. Seluruh jemaat baru secara otomatis masuk ke kategori ini.',
      isDefault: true,
      totalAnggota: 0,
      slug: 'umum',
      isActivePublik: true,
    },
  })

  console.log(`✅ Production database cleaned. Single Super Admin: [${superAdmin.username}] (${superAdmin.role}), Default Kategorial: [${defaultKategorial.nama}]`)
}

main()
  .catch((e) => {
    console.error('Seed Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
