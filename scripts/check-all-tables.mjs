import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const models = [
    'user', 'kategorial', 'jemaat', 'komsel', 'artikel', 'renungan',
    'wartaJemaat', 'event', 'khotbah', 'materi', 'persembahan',
    'pelayanan', 'liturgi', 'bukuTamu', 'prayerRequest', 'bibleStudy',
    'zoomMeeting', 'jadwalIbadah', 'kehadiranJemaat', 'kehadiranKomsel',
    'siteSetting', 'churchProfile', 'auditLog', 'session'
  ]
  const counts = {}
  for (const model of models) {
    if (prisma[model]) {
      try {
        counts[model] = await prisma[model].count()
      } catch (err) {
        counts[model] = err.message
      }
    }
  }
  console.log('SUPABASE TABLE COUNTS:')
  console.log(JSON.stringify(counts, null, 2))
}

main().finally(() => prisma.$disconnect())
