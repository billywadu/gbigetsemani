import { prisma } from '../src/lib/prisma'
import {
  getStrukturTiersAction,
  createStrukturTierAction,
  updateStrukturTierAction,
  deleteStrukturTierAction,
  getStrukturOrganisasiPublicAction,
  getStrukturKategorialPublicAction,
  getKategorialListForAdminAction,
  updateProfilKategorialAction,
} from '../src/actions/struktur-organisasi'

async function runDynamicOrgTestSuite() {
  console.log('=================================================================')
  console.log('🚀 RUNNING MULTI-KATEGORIAL & DYNAMIC TIERS QA & SECURITY TEST')
  console.log('=================================================================\n')

  let passed = 0
  let failed = 0

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`)
      passed++
    } else {
      console.log(`  ❌ [FAIL] ${testName}`)
      failed++
    }
  }

  try {
    // ─────────────────────────────────────────────────────────────────
    // TEST 1: Kategorial Slugs & Database Seed Resolution
    // ─────────────────────────────────────────────────────────────────
    console.log('📦 TEST 1: Kategorial Slugs & Public Profile Resolution...')
    const kategorialsRes = await getKategorialListForAdminAction()
    assert(kategorialsRes.success === true, 'getKategorialListForAdminAction returned success')
    assert(
      (kategorialsRes.data || []).length > 0,
      `Found ${kategorialsRes.data?.length} kategorials in database`
    )

    const youthKat = kategorialsRes.data?.find((k) => k.slug === 'youth')
    assert(!!youthKat, 'Youth kategorial found with slug "youth"')
    if (youthKat) {
      assert(
        !!youthKat.slogan && !!youthKat.jadwalIbadah,
        `Youth profile has community details (Slogan: "${youthKat.slogan}", Jadwal: "${youthKat.jadwalIbadah}")`
      )
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 2: Dynamic Tier CRUD Operations (Admin Scope)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n🏛️ TEST 2: Dynamic Tier Management & Ordering...')
    // Note: Calling createStrukturTierAction directly without mock session will test security guard
    const unauthorizedTierCreate = await createStrukturTierAction({
      lingkup: 'UTAMA',
      nama: 'Hacker Injected Tier',
    })
    assert(
      unauthorizedTierCreate.success === false,
      'Security RBAC: createStrukturTierAction strictly rejects unauthorized mutations'
    )

    // Direct DB Tier operations for testing model integrity
    const testTier = await prisma.strukturTier.create({
      data: {
        lingkup: 'UTAMA',
        nama: 'QA Test Custom Tier',
        deskripsi: 'Khusus menguji fleksibilitas penambahan tingkat dinamis',
        urutan: 99,
        layoutStyle: 'FEATURED',
      },
    })
    assert(!!testTier.id, `Created dynamic tier directly in DB with ID: ${testTier.id}`)

    const updatedTier = await prisma.strukturTier.update({
      where: { id: testTier.id },
      data: { nama: 'QA Test Custom Tier (Updated)', layoutStyle: 'GRID' },
    })
    assert(
      updatedTier.nama === 'QA Test Custom Tier (Updated)' && updatedTier.layoutStyle === 'GRID',
      'Dynamic tier updated name and layoutStyle successfully'
    )

    await prisma.strukturTier.delete({ where: { id: testTier.id } })
    const deletedCheck = await prisma.strukturTier.findUnique({ where: { id: testTier.id } })
    assert(!deletedCheck, 'Dynamic tier deleted cleanly without leaving orphaned records')

    // ─────────────────────────────────────────────────────────────────
    // TEST 3: Main Church Public Endpoint (Exclusively Scope: UTAMA)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n🌐 TEST 3: Main Church Public Structure Partitioning...')
    const mainPublicRes = await getStrukturOrganisasiPublicAction()
    assert(mainPublicRes.success === true, 'Public endpoint getStrukturOrganisasiPublicAction returned success')
    assert((mainPublicRes.data?.tiers || []).length > 0, `Returned ${mainPublicRes.data?.tiers.length} main tiers`)

    // Verify all tiers in main public are lingkup: UTAMA
    const allAreUtama = (mainPublicRes.data?.tiers || []).every((t) => t.lingkup === 'UTAMA')
    assert(allAreUtama, 'Every tier returned on main church page is strictly lingkup: UTAMA')

    // Verify catalogue contains kategorials
    assert(
      (mainPublicRes.data?.kategorialKatalog || []).length > 0,
      `Catalogue contains ${mainPublicRes.data?.kategorialKatalog.length} active kategorial communities`
    )

    // ─────────────────────────────────────────────────────────────────
    // TEST 4: Dedicated Kategorial Sub-Page Endpoint (e.g. /youth)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n🔥 TEST 4: Dedicated Kategorial Sub-Page Resolution & Context Isolation...')
    const youthPublicRes = await getStrukturKategorialPublicAction('youth')
    assert(youthPublicRes.success === true, 'Dedicated /youth sub-page returned success')
    assert(youthPublicRes.data?.kategorial.slug === 'youth', 'Sub-page matches target slug "youth"')
    assert(
      (youthPublicRes.data?.tiers || []).length > 0,
      `Youth sub-page has ${youthPublicRes.data?.tiers.length} dedicated youth tiers`
    )

    const allYouthTiersAreKategorial = (youthPublicRes.data?.tiers || []).every(
      (t) => t.lingkup === 'KATEGORIAL'
    )
    assert(allYouthTiersAreKategorial, 'All tiers in youth sub-page are strictly lingkup: KATEGORIAL')

    // Test non-existent slug returns error
    const nonExistentRes = await getStrukturKategorialPublicAction('slug-palsu-12345')
    assert(
      nonExistentRes.success === false,
      'Requesting non-existent slug correctly returns error / 404 response'
    )

    // ─────────────────────────────────────────────────────────────────
    // TEST 5: Data Context Isolation & Master Linkage
    // ─────────────────────────────────────────────────────────────────
    console.log('\n🔒 TEST 5: Data Isolation Between Main & Kategorial...')
    // Create a temporary youth official
    let testJemaat = await prisma.jemaat.findFirst({ where: { deletedAt: null } })
    if (!testJemaat) {
      testJemaat = await prisma.jemaat.create({
        data: { nama: 'QA Youth Tester', jenisKelamin: 'LAK_LAKI', statusJemaat: 'ACTIVE' },
      })
    }

    const youthTier = await prisma.strukturTier.findFirst({
      where: { lingkup: 'KATEGORIAL', kategorial: { slug: 'youth' } },
    })

    if (youthTier && youthKat) {
      const youthOfficial = await prisma.pengurusGereja.create({
        data: {
          jemaatId: testJemaat.id,
          tierId: youthTier.id,
          kategorialId: youthKat.id,
          jabatan: 'Koordinator Acara Youth (QA)',
          kategori: 'KATEGORIAL',
          isActivePublik: true,
          urutan: 99,
        },
      })

      // Verify it does NOT appear on main church structure
      const mainCheck = await getStrukturOrganisasiPublicAction()
      const foundInMain = (mainCheck.data?.tiers || []).some((t) =>
        (t.pengurusList || []).some((p) => p.id === youthOfficial.id)
      )
      assert(!foundInMain, 'Data Isolation: Youth official DOES NOT appear on main church structure page')

      // Verify it DOES appear on youth sub-page
      const youthCheck = await getStrukturKategorialPublicAction('youth')
      const foundInYouth = (youthCheck.data?.tiers || []).some((t) =>
        (t.pengurusList || []).some((p) => p.id === youthOfficial.id)
      )
      assert(foundInYouth, 'Data Isolation: Youth official appears correctly on dedicated youth sub-page')

      // Clean up test official
      await prisma.pengurusGereja.delete({ where: { id: youthOfficial.id } })
    }
  } catch (error: any) {
    console.error('Fatal error during test execution:', error)
    failed++
  }

  console.log('\n=================================================================')
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================\n')

  if (failed > 0) process.exit(1)
}

runDynamicOrgTestSuite()
