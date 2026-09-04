import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getStats() {
  const users = await prisma.user.findMany({ select: { username: true, role: true } })
  console.log('Users in Supabase:', users)

  const kategorial = await prisma.kategorial.count()
  const jemaat = await prisma.jemaat.count()
  const komsel = await prisma.komsel.count()
  const event = await prisma.event.count()
  const artikel = await prisma.artikel.count()

  console.log({
    kategorial,
    jemaat,
    komsel,
    event,
    artikel,
  })

  await prisma.$disconnect()
}

getStats()
