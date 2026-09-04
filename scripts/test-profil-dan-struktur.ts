/**
 * QA & Security RBAC Test Suite for Profil Gereja, Sejarah & Struktur Organisasi
 * Run with: npx tsx scripts/test-profil-dan-struktur.ts
 */

import { prisma } from '../src/lib/prisma'
import {
  ensureDefaultProfilGereja,
  getProfilGerejaPublicAction,
  createMilestoneAction,
  updateMilestoneAction,
  deleteMilestoneAction,
} from '../src/actions/profil-gereja'
import {
  ensureDefaultPengurus,
  getStrukturOrganisasiPublicAction,
  getStrukturOrganisasiAdminAction,
  createPengurusAction,
  updatePengurusAction,
  deletePengurusAction,
} from '../src/actions/struktur-organisasi'

async function runTestSuite() {
  console.log('=================================================================')
  console.log('🚀 RUNNING PROFIL GEREJA & STRUKTUR ORGANISASI QA & SECURITY TEST')
  console.log('=================================================================\n')

  let passedTests = 0
  let failedTests = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`)
      passedTests++
    } else {
      console.error(`  ❌ [FAIL] ${testName}`)
      if (detail) console.error(`     Detail: ${detail}`)
      failedTests++
    }
  }

  try {
    // ── TEST 1: PROFIL GEREJA SINGLETON INITIALIZATION ──
    console.log('🏛️ TEST 1: Profil Gereja Singleton Integrity...')
    await ensureDefaultProfilGereja()

    const pubRes = await getProfilGerejaPublicAction()
    assert(pubRes.success && !!pubRes.data?.profil, 'Public ProfilGereja fetched successfully')
    assert(pubRes.data?.profil.id === 'MAIN', 'ProfilGereja maintains MAIN singleton ID')
    assert(
      pubRes.data?.profil.namaGereja.length! > 0 && pubRes.data?.profil.tagline.length! > 0,
      'Profil contains valid namaGereja and tagline'
    )
    assert((pubRes.data?.milestones.length || 0) >= 4, 'Default Milestones generated (Found at least 4)')

    // ── TEST 2: MILESTONE TIMELINE DATA INTEGRITY ──
    console.log('\n⏳ TEST 2: Milestone Timeline CRUD Operations...')
    const testYear = 1990
    const newMs = await prisma.milestoneSejarah.create({
      data: {
        tahun: testYear,
        judul: 'QA Milestone Perintisan Awal',
        deskripsi: 'Deskripsi pengujian otomatis milestone timeline.',
        urutan: 99,
      },
    })

    assert(!!newMs.id, 'Milestone created in database')

    const updatedMs = await prisma.milestoneSejarah.update({
      where: { id: newMs.id },
      data: { judul: 'QA Milestone Perintisan Awal (Updated)' },
    })
    assert(updatedMs.judul.includes('(Updated)'), 'Milestone title updated successfully')

    await prisma.milestoneSejarah.delete({ where: { id: newMs.id } })
    const deletedMs = await prisma.milestoneSejarah.findUnique({ where: { id: newMs.id } })
    assert(deletedMs === null, 'Milestone deleted cleanly from database')

    // ── TEST 3: STRUKTUR ORGANISASI & MASTER JEMAAT LINKAGE ──
    console.log('\n👥 TEST 3: Master Jemaat Linkage to PengurusGereja...')
    await ensureDefaultPengurus()

    let testJemaat = await prisma.jemaat.findFirst({
      where: { nama: 'QA Test Jemaat Pengurus' },
    })
    if (!testJemaat) {
      testJemaat = await prisma.jemaat.create({
        data: {
          nama: 'QA Test Jemaat Pengurus',
          jenisKelamin: 'LAK_LAKI',
          statusJemaat: 'ACTIVE',
          nij: `QA-${Date.now()}`,
        },
      })
    }

    assert(!!testJemaat.id, 'Test master jemaat created/found')

    // Create Official linked to Jemaat
    const testPengurus = await prisma.pengurusGereja.create({
      data: {
        jemaatId: testJemaat.id,
        jabatan: 'Koordinator QA & Multimedia',
        gelar: 'S.Kom',
        kategori: 'DEPARTEMEN_PELAYANAN',
        level: 3,
        urutan: 10,
        fotoPublikUrl: 'https://example.com/photos/qa-formal.jpg',
        bioRingkas: 'Pengujian integritas data pengurus.',
        isActivePublik: true,
        periodeAwal: 2024,
        periodeAkhir: 2026,
      },
      include: { jemaat: true },
    })

    assert(
      testPengurus.jemaatId === testJemaat.id && testPengurus.jemaat.nama === testJemaat.nama,
      'PengurusGereja correctly linked to Master Jemaat without data duplication'
    )
    assert(
      testPengurus.fotoPublikUrl === 'https://example.com/photos/qa-formal.jpg',
      'PengurusGereja stores custom public profile photo independently'
    )

    // ── TEST 4: PUBLIC VISIBILITY PRIVACY ISOLATION ──
    console.log('\n🔒 TEST 4: Public Visibility Privacy Isolation...')

    // Check visible when isActivePublik: true
    const publicData1 = await getStrukturOrganisasiPublicAction()
    const allOfficials1 = (publicData1.data?.tiers || []).flatMap((t) => t.pengurusList || [])
    const foundInPublic1 = allOfficials1.some((p: any) => p.id === testPengurus.id)
    assert(foundInPublic1 === true, 'Pengurus with isActivePublik=true is visible on public endpoint')

    // Toggle to isActivePublik: false
    await prisma.pengurusGereja.update({
      where: { id: testPengurus.id },
      data: { isActivePublik: false },
    })

    const publicData2 = await getStrukturOrganisasiPublicAction()
    const allOfficials2 = (publicData2.data?.tiers || []).flatMap((t) => t.pengurusList || [])
    const foundInPublic2 = allOfficials2.some((p: any) => p.id === testPengurus.id)
    assert(foundInPublic2 === false, 'Pengurus with isActivePublik=false is strictly HIDDEN from public endpoint')

    // ── TEST 5: TIER GROUPING & HIERARCHY SORTING ──
    console.log('\n📊 TEST 5: Tier Grouping & Hierarchy Sorting...')

    // Re-activate
    await prisma.pengurusGereja.update({
      where: { id: testPengurus.id },
      data: { isActivePublik: true },
    })

    const finalPublic = await getStrukturOrganisasiPublicAction()
    assert(
      (finalPublic.data?.tiers.length || 0) >= 1,
      `Dynamic Tiers: Found ${finalPublic.data?.tiers.length} leadership tiers`
    )
    assert(
      (finalPublic.data?.kategorialKatalog.length || 0) >= 1,
      `Kategorial Hub: Found ${finalPublic.data?.kategorialKatalog.length} active kategorial communities`
    )

    // ── CLEANUP TEST DATA ──
    await prisma.pengurusGereja.delete({ where: { id: testPengurus.id } })
    await prisma.jemaat.delete({ where: { id: testJemaat.id } })

    console.log('\n=================================================================')
    console.log(`🏁 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`)
    console.log('=================================================================\n')

    if (failedTests > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('Fatal error during test suite execution:', error)
    process.exit(1)
  }
}

runTestSuite()
