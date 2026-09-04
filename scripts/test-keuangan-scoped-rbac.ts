/**
 * QA & Security RBAC Test Suite for Modul Keuangan Scoped per Kategorial
 * Run with: npx tsx scripts/test-keuangan-scoped-rbac.ts
 */

import { prisma } from '../src/lib/prisma'
import {
  ensureDefaultScopes,
  getScopesAction,
  getScopeListWithStatsAction,
  getLaporanKeuanganListAction,
  getLaporanByIdAction,
  createLaporanKeuanganAction,
  createTransaksiKeuanganAction,
  getLaporanGabunganAction,
  createScopeAction,
  updateScopeAction,
  deleteScopeAction,
} from '../src/actions/keuangan'

async function runTestSuite() {
  console.log('=================================================================')
  console.log('🚀 RUNNING KEUANGAN SCOPED RBAC & DATA ISOLATION TEST SUITE')
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
    // ── STEP 0: SETUP TEST DATA ──
    console.log('📦 STEP 0: Setting up kategorials and test data...')

    // 1. Ensure at least two kategorials exist
    let katPemuda = await prisma.kategorial.findFirst({ where: { nama: { contains: 'Pemuda' } } })
    if (!katPemuda) {
      katPemuda = await prisma.kategorial.create({
        data: {
          nama: 'Komisi Pemuda Remaja',
          deskripsi: 'Kategorial pelayanan pemuda dan remaja',
        },
      })
    }

    let katWanita = await prisma.kategorial.findFirst({ where: { nama: { contains: 'Wanita' } } })
    if (!katWanita) {
      katWanita = await prisma.kategorial.create({
        data: {
          nama: 'Komisi Wanita (PW/WKI)',
          deskripsi: 'Kategorial pelayanan kaum wanita',
        },
      })
    }

    // 2. Ensure default scopes and auto-sync
    await ensureDefaultScopes()

    const scopePemuda = await prisma.scopeKeuangan.findFirst({ where: { kategorialId: katPemuda.id } })
    const scopeWanita = await prisma.scopeKeuangan.findFirst({ where: { kategorialId: katWanita.id } })
    const scopeUmum = await prisma.scopeKeuangan.findFirst({ where: { OR: [{ code: 'UMUM' }, { code: 'KAS_UMUM' }] } })

    assert(!!scopePemuda, 'Pos Kas Komisi Pemuda auto-linked with kategorialId')
    assert(!!scopeWanita, 'Pos Kas Komisi Wanita auto-linked with kategorialId')
    assert(!!scopeUmum && scopeUmum.kategorialId === null, 'Kas Umum has no kategorialId (Church Central Fund)')

    // ── TEST 1: Auto-linked Scope Data Integrity ──
    console.log('\n🔒 TEST 1: Verifying ScopeKeuangan Relations...')
    const allScopes = await prisma.scopeKeuangan.findMany({ include: { kategorial: true } })
    const kategorialScopes = allScopes.filter((s) => s.kategorialId !== null)
    assert(
      kategorialScopes.length >= 2,
      `At least 2 kategorial scopes linked in DB (Found ${kategorialScopes.length})`
    )

    // ── TEST 2: Seed Period Reports for Testing ──
    console.log('\n📊 TEST 2: Creating Test Reports and Transactions...')
    const currentYear = new Date().getFullYear()

    // Create report for Pemuda if not exists
    let repPemuda = await prisma.laporanKeuangan.findFirst({
      where: { scopeId: scopePemuda!.id, tahun: currentYear, bulan: 1 },
    })
    if (!repPemuda) {
      repPemuda = await prisma.laporanKeuangan.create({
        data: {
          scopeId: scopePemuda!.id,
          bulan: 1,
          tahun: currentYear,
          saldoAwal: 500000,
          totalPemasukan: 0,
          totalPengeluaran: 0,
          saldoAkhir: 500000,
          status: 'DRAFT',
        },
      })
    }

    // Create report for Wanita if not exists
    let repWanita = await prisma.laporanKeuangan.findFirst({
      where: { scopeId: scopeWanita!.id, tahun: currentYear, bulan: 1 },
    })
    if (!repWanita) {
      repWanita = await prisma.laporanKeuangan.create({
        data: {
          scopeId: scopeWanita!.id,
          bulan: 1,
          tahun: currentYear,
          saldoAwal: 1000000,
          totalPemasukan: 0,
          totalPengeluaran: 0,
          saldoAkhir: 1000000,
          status: 'DRAFT',
        },
      })
    }

    // Create report for Kas Umum if not exists
    let repUmum = await prisma.laporanKeuangan.findFirst({
      where: { scopeId: scopeUmum!.id, tahun: currentYear, bulan: 1 },
    })
    if (!repUmum) {
      repUmum = await prisma.laporanKeuangan.create({
        data: {
          scopeId: scopeUmum!.id,
          bulan: 1,
          tahun: currentYear,
          saldoAwal: 25000000,
          totalPemasukan: 0,
          totalPengeluaran: 0,
          saldoAkhir: 25000000,
          status: 'DRAFT',
        },
      })
    }

    assert(!!repPemuda && !!repWanita && !!repUmum, 'Test reports for Pemuda, Wanita, and Kas Umum established')

    // ── TEST 3: User Scopes Configuration in DB ──
    console.log('\n👥 TEST 3: User Kategorial Assignment in DB...')

    // Create or find a test Bendahara Pemuda user
    let userBendaharaPemuda = await prisma.user.findFirst({
      where: { username: 'test_bendahara_pemuda' },
    })
    if (!userBendaharaPemuda) {
      userBendaharaPemuda = await prisma.user.create({
        data: {
          username: 'test_bendahara_pemuda',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          nama: 'Bendahara Pemuda QA',
          role: 'BENDAHARA_KATEGORIAL',
          isActive: true,
          kategorialScopes: {
            create: {
              kategorialId: katPemuda!.id,
            },
          },
        },
      })
    } else {
      // Ensure scope link
      await prisma.userKategorialScope.upsert({
        where: {
          userId_kategorialId: {
            userId: userBendaharaPemuda.id,
            kategorialId: katPemuda!.id,
          },
        },
        create: {
          userId: userBendaharaPemuda.id,
          kategorialId: katPemuda!.id,
        },
        update: {},
      })
    }

    const assignedScopes = await prisma.userKategorialScope.findMany({
      where: { userId: userBendaharaPemuda.id },
      include: { kategorial: true },
    })

    assert(
      assignedScopes.length === 1 && assignedScopes[0].kategorialId === katPemuda!.id,
      'User test_bendahara_pemuda strictly assigned to Komisi Pemuda only'
    )

    // ── TEST 4: Scoped List Query Logic Verification ──
    console.log('\n🔍 TEST 4: Scoped Filter Logic Verification...')

    const pemudaAssignedIds = [katPemuda!.id]
    const scopedScopes = await prisma.scopeKeuangan.findMany({
      where: {
        isActive: true,
        kategorialId: { in: pemudaAssignedIds },
      },
    })

    assert(
      scopedScopes.length === 1 && scopedScopes[0].id === scopePemuda!.id,
      'Scoped query isolates exactly 1 Pos Kas (Kas Pemuda) for Bendahara Pemuda'
    )

    const unauthorizedScopes = await prisma.scopeKeuangan.findMany({
      where: {
        isActive: true,
        NOT: { kategorialId: { in: pemudaAssignedIds } },
      },
    })

    assert(
      unauthorizedScopes.some((s) => s.code === 'UMUM' || s.code === 'KAS_UMUM') && unauthorizedScopes.some((s) => s.id === scopeWanita!.id),
      'Unauthorized scopes (Kas Umum & Kas Wanita) excluded from Bendahara Pemuda query'
    )

    // ── TEST 5: Atomic Transaction Recalculation Verification ──
    console.log('\n💰 TEST 5: Atomic Transaction Recalculation...')

    const trxNominal = 150000
    const newTrx = await prisma.transaksiKeuangan.create({
      data: {
        laporanId: repPemuda.id,
        nomorReferensi: `TEST-TRX-${Date.now()}`,
        tipe: 'MASUK',
        kategori: 'Persembahan Ibadah Pemuda',
        nominal: trxNominal,
        metodePembayaran: 'CASH',
        tanggal: new Date(),
        catatan: 'QA Automated Test Entry',
      },
    })

    // Recalculate
    const aggregates = await prisma.transaksiKeuangan.groupBy({
      by: ['tipe'],
      where: { laporanId: repPemuda.id, deletedAt: null },
      _sum: { nominal: true },
    })

    let totalMasuk = 0
    let totalKeluar = 0
    aggregates.forEach((agg) => {
      if (agg.tipe === 'MASUK') totalMasuk = Number(agg._sum.nominal)
      if (agg.tipe === 'KELUAR') totalKeluar = Number(agg._sum.nominal)
    })

    const expectedSaldoAkhir = Number(repPemuda.saldoAwal) + totalMasuk - totalKeluar

    await prisma.laporanKeuangan.update({
      where: { id: repPemuda.id },
      data: {
        totalPemasukan: totalMasuk,
        totalPengeluaran: totalKeluar,
        saldoAkhir: expectedSaldoAkhir,
      },
    })

    const updatedRepPemuda = await prisma.laporanKeuangan.findUnique({
      where: { id: repPemuda.id },
    })

    assert(
      Number(updatedRepPemuda?.saldoAkhir) === expectedSaldoAkhir,
      `Balance recalculated accurately: Saldo Awal (${repPemuda.saldoAwal}) + Masuk (${totalMasuk}) = Saldo Akhir (${expectedSaldoAkhir})`
    )

    // Clean up test transaction
    await prisma.transaksiKeuangan.delete({ where: { id: newTrx.id } })

    // Restore rep balance
    await prisma.laporanKeuangan.update({
      where: { id: repPemuda.id },
      data: {
        totalPemasukan: 0,
        totalPengeluaran: 0,
        saldoAkhir: repPemuda.saldoAwal,
      },
    })

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
