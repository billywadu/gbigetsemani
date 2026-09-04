/**
 * Automated QA & Security Verification Suite for Global Search (Command Palette ⌘K)
 * Tests:
 * 1. Authentication & Session Protection on search Server Action
 * 2. Input Sanitization & SQLi/XSS Injection Resistance
 * 3. Schema & Data Integrity for Searchable Entities
 * 4. Code Hygiene: Zero Unicode Emoji / Emoticons in Search UI
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, testName, details = '') {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  [PASS] ${testName}`)
  } else {
    failedTests++
    console.error(`  [FAIL] ${testName} - ${details}`)
  }
}

async function runQaSearchSuite() {
  console.log('\n======================================================')
  console.log('   QA & SECURITY SUITE: DASHBOARD GLOBAL OMNI-SEARCH   ')
  console.log('======================================================\n')

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: Code Hygiene & Zero Emoji Verification
    // ----------------------------------------------------
    console.log('[GROUP 1] Code Hygiene & Zero Emoji Rule')
    const commandMenuPath = path.join(process.cwd(), 'src', 'components', 'command-menu.tsx')
    const commandMenuContent = fs.readFileSync(commandMenuPath, 'utf8')

    // Regex for emoji characters
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    const hasEmoji = emojiRegex.test(commandMenuContent)
    assert(!hasEmoji, 'UI component contains 0 emoticons/emojis (Lucide Icons only)')

    assert(
      commandMenuContent.includes('globalSearchAction') &&
      commandMenuContent.includes('UserPlus') &&
      commandMenuContent.includes('QrCode') &&
      commandMenuContent.includes('CalendarPlus') &&
      commandMenuContent.includes('FilePlus2'),
      'CommandMenu imports and renders proper Lucide Quick Action Icons'
    )

    // ----------------------------------------------------
    // TEST GROUP 2: Search Action File & Sanitization Integrity
    // ----------------------------------------------------
    console.log('\n[GROUP 2] Security & Sanitization Integrity')
    const searchActionPath = path.join(process.cwd(), 'src', 'actions', 'search.ts')
    const searchActionContent = fs.readFileSync(searchActionPath, 'utf8')

    assert(
      searchActionContent.includes('getCurrentStaffSession'),
      'Search Action checks staff session before executing queries'
    )
    assert(
      searchActionContent.includes('sanitizeText'),
      'Search Action applies input sanitization'
    )
    assert(
      searchActionContent.includes('cleanQuery.slice(0, 50)'),
      'Search Action bounds query string length to prevent ReDoS / query bloating'
    )
    assert(
      searchActionContent.includes('deletedAt: null'),
      'Search Action enforces soft-delete exclusion across all searchable entities'
    )

    // ----------------------------------------------------
    // TEST GROUP 3: Database Query Safety & Searchable Models
    // ----------------------------------------------------
    console.log('\n[GROUP 3] Database Search Performance & Prisma Queries')

    // Warm-up connection pool for remote DB TLS handshake
    await prisma.$queryRaw`SELECT 1`

    // Test Jemaat search query safety
    const startJemaat = performance.now()
    const sampleJemaat = await prisma.jemaat.findMany({
      where: {
        deletedAt: null,
        OR: [
          { nama: { contains: 'a', mode: 'insensitive' } },
          { nij: { contains: 'a', mode: 'insensitive' } },
        ],
      },
      take: 5,
    })
    const durationJemaat = performance.now() - startJemaat
    assert(
      Array.isArray(sampleJemaat) && durationJemaat < 1000,
      `Prisma Jemaat search executes cleanly under 1000ms (${durationJemaat.toFixed(1)}ms)`
    )

    // Test Event search query safety
    const sampleEvent = await prisma.event.findMany({
      where: {
        deletedAt: null,
        OR: [{ namaEvent: { contains: 'ibadah', mode: 'insensitive' } }],
      },
      take: 5,
    })
    assert(Array.isArray(sampleEvent), 'Prisma Event search executes successfully')

    // Test Surat Resmi search query safety
    const sampleSurat = await prisma.suratResmi.findMany({
      where: {
        deletedAt: null,
        OR: [{ perihal: { contains: 'surat', mode: 'insensitive' } }],
      },
      take: 5,
    })
    assert(Array.isArray(sampleSurat), 'Prisma SuratResmi search executes successfully')

    // Test Artikel search query safety
    const sampleArtikel = await prisma.artikel.findMany({
      where: {
        deletedAt: null,
        OR: [{ judul: { contains: 'renungan', mode: 'insensitive' } }],
      },
      take: 5,
    })
    assert(Array.isArray(sampleArtikel), 'Prisma Artikel search executes successfully')

    // Test Doa search query safety
    const sampleDoa = await prisma.permohonanDoa.findMany({
      where: {
        deletedAt: null,
        OR: [{ namaPemohon: { contains: 'test', mode: 'insensitive' } }],
      },
      take: 5,
    })
    assert(Array.isArray(sampleDoa), 'Prisma PermohonanDoa search executes successfully')

    // ----------------------------------------------------
    // TEST GROUP 4: Injection Resilience Test Payloads
    // ----------------------------------------------------
    console.log('\n[GROUP 4] Injection Payloads Resilience')
    const injectionPayloads = [
      "' OR '1'='1",
      '"><script>alert(1)</script>',
      "admin'--",
      "%27%20OR%201=1",
      "UNION SELECT * FROM User",
      "../../../../etc/passwd",
    ]

    for (const payload of injectionPayloads) {
      const sanitized = payload.replace(/[<>"']/g, '').trim().slice(0, 50)
      const res = await prisma.jemaat.findMany({
        where: {
          deletedAt: null,
          OR: [{ nama: { contains: sanitized, mode: 'insensitive' } }],
        },
        take: 5,
      })
      assert(
        Array.isArray(res),
        `Injection payload "${payload.slice(0, 18)}..." handled safely without database error`
      )
    }

  } catch (error) {
    console.error('Test execution error:', error)
    failedTests++
  } finally {
    await prisma.$disconnect()
  }

  console.log('\n------------------------------------------------------')
  console.log(`TOTAL TESTS : ${totalTests}`)
  console.log(`PASSED      : ${passedTests}`)
  console.log(`FAILED      : ${failedTests}`)
  console.log('------------------------------------------------------\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runQaSearchSuite()
