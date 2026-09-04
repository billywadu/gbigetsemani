import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSeedProgress() {
  try {
    const users = await prisma.user.count()
    const jemaat = await prisma.jemaat.count()
    const events = await prisma.event.count()
    const kas = await prisma.kasGereja.count()
    const kategoriArtikel = await prisma.kategoriArtikel.count()

    console.log(`CURRENT SEED COUNT in Supabase:
- Users: ${users}
- Jemaat: ${jemaat}
- Events: ${events}
- Kas: ${kas}
- Kategori Artikel: ${kategoriArtikel}
`)
  } catch (e) {
    console.error('Error counting:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkSeedProgress()
