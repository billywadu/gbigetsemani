import { PrismaClient } from '@prisma/client'

const testDirect = async () => {
  const direct1 = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres.ypojnzisxzlrofmaueik:6PwYF8jw2QEGMTRn@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
      },
    },
  })

  try {
    const res = await direct1.$queryRaw`SELECT count(*)::int as tbl_count FROM information_schema.tables WHERE table_schema = 'public'`
    console.log('Direct Pooler 5432 result:', res)
  } catch (e) {
    console.log('Direct Pooler 5432 error:', e.message)
  } finally {
    await direct1.$disconnect()
  }

  const pooler6543 = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres.ypojnzisxzlrofmaueik:6PwYF8jw2QEGMTRn@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
      },
    },
  })

  try {
    const res2 = await pooler6543.$queryRaw`SELECT count(*)::int as tbl_count FROM information_schema.tables WHERE table_schema = 'public'`
    console.log('Pooler 6543 result:', res2)
  } catch (e) {
    console.log('Pooler 6543 error:', e.message)
  } finally {
    await pooler6543.$disconnect()
  }
}

testDirect()
