import { PrismaClient } from '@prisma/client'
import https from 'https'

console.log('--- TESTING ENVIRONMENT VARIABLES CONFIGURATION ---')

// 1. Check Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dhc1lljru'
const apiKey = process.env.CLOUDINARY_API_KEY || '721323311784296'
const apiSecret = process.env.CLOUDINARY_API_SECRET || '5wo_tN4abvlYppZ54pWwF9OQpRo'

console.log(`\n[1] Checking Cloudinary (${cloudName})...`)
const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

const req = https.request(
  {
    hostname: 'api.cloudinary.com',
    path: `/v1_1/${cloudName}/ping`,
    method: 'GET',
    headers: {
      Authorization: authHeader,
    },
  },
  (res) => {
    let body = ''
    res.on('data', (chunk) => (body += chunk))
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Cloudinary API Credentials: VALID (Status 200 OK)')
      } else {
        console.log(`⚠️ Cloudinary API returned status ${res.statusCode}: ${body}`)
      }
    })
  }
)
req.on('error', (err) => {
  console.log(`❌ Cloudinary connection error: ${err.message}`)
})
req.end()

// 2. Check Supabase Endpoint
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ypojnzisxzlrofmaueik.supabase.co'
console.log(`\n[2] Checking Supabase URL (${supabaseUrl})...`)
const parsedSupabase = new URL(supabaseUrl)

const reqSupabase = https.request(
  {
    hostname: parsedSupabase.hostname,
    path: '/rest/v1/',
    method: 'GET',
  },
  (res) => {
    console.log(`✅ Supabase Endpoint Reachable (Status: ${res.statusCode})`)
  }
)
reqSupabase.on('error', (err) => {
  console.log(`❌ Supabase endpoint error: ${err.message}`)
})
reqSupabase.end()

// 3. Check Prisma connection with Supabase DB URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.ypojnzisxzlrofmaueik:6PwYF8jw2QEGMTRn@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    },
  },
})

console.log(`\n[3] Checking Supabase PostgreSQL via Prisma...`)
prisma.$queryRaw`SELECT 1 as result`
  .then((res) => {
    console.log('✅ Supabase PostgreSQL Database Connected Successfully:', res)
  })
  .catch((err) => {
    console.log('⚠️ Supabase DB Connection error:', err.message)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
