import { prisma } from '../src/lib/prisma'
import {
  getScopesAction,
  getLaporanKeuanganListAction,
  createLaporanKeuanganAction,
  createTransaksiKeuanganAction,
  finalizePeriodAction,
  reopenPeriodAction,
  getLaporanByIdAction,
  getLaporanGabunganAction,
} from '../src/actions/keuangan'

async function main() {
  console.log('=== TEST SERIALIZATION & ACTIONS MODUL KEUANGAN ===\n')

  // 1. Test getScopesAction
  console.log('[Test 1] Get Scopes Action:')
  const scopesRes = await getScopesAction()
  if (!scopesRes.success || !scopesRes.data || scopesRes.data.length === 0) {
    throw new Error('getScopesAction failed')
  }
  console.log(`Found ${scopesRes.data.length} scopes. First scope: ${scopesRes.data[0].name} (${scopesRes.data[0].code})`)
  console.log('✓ getScopesAction verified!')

  const targetScope = scopesRes.data[0]
  const testBulan = 9
  const testTahun = 2035 // Future year to avoid conflicts

  // Cleanup existing test report if any
  const existing = await prisma.laporanKeuangan.findUnique({
    where: {
      scopeId_bulan_tahun: {
        scopeId: targetScope.id,
        bulan: testBulan,
        tahun: testTahun,
      },
    },
  })
  if (existing) {
    await prisma.transaksiKeuangan.deleteMany({ where: { laporanId: existing.id } })
    await prisma.laporanKeuangan.delete({ where: { id: existing.id } })
  }

  // 2. Test createLaporanKeuanganAction
  console.log('\n[Test 2] Create Laporan Keuangan Action (Decimal serialization test):')
  const createRes = await createLaporanKeuanganAction({
    scopeId: targetScope.id,
    bulan: testBulan,
    tahun: testTahun,
  })
  console.log(`Create Result: success=${createRes.success}, message="${createRes.message}"`)
  if (!createRes.success || !createRes.data) {
    throw new Error(`createLaporanKeuanganAction failed: ${createRes.error}`)
  }

  // Verify that all numeric fields are standard JavaScript numbers and NOT Prisma Decimal objects
  const laporanData = createRes.data
  console.log('Verifying data types on returned LaporanKeuanganDTO:')
  console.log(`- saldoAwal: ${typeof laporanData.saldoAwal} (${laporanData.saldoAwal})`)
  console.log(`- totalPemasukan: ${typeof laporanData.totalPemasukan} (${laporanData.totalPemasukan})`)
  console.log(`- totalPengeluaran: ${typeof laporanData.totalPengeluaran} (${laporanData.totalPengeluaran})`)
  console.log(`- saldoAkhir: ${typeof laporanData.saldoAkhir} (${laporanData.saldoAkhir})`)

  if (
    typeof laporanData.saldoAwal !== 'number' ||
    typeof laporanData.totalPemasukan !== 'number' ||
    typeof laporanData.totalPengeluaran !== 'number' ||
    typeof laporanData.saldoAkhir !== 'number'
  ) {
    throw new Error('FAIL: Decimal objects detected in LaporanKeuanganDTO response!')
  }

  // Verify JSON stringify passes without Decimal class reference
  const serializedLaporan = JSON.stringify(laporanData)
  if (serializedLaporan.includes('[Decimal]') || serializedLaporan.includes('"d":') || serializedLaporan.includes('"e":')) {
    throw new Error('FAIL: Decimal internal structures found in serialized JSON!')
  }
  console.log('✓ createLaporanKeuanganAction returned 100% plain serializable object!')

  // 3. Test createTransaksiKeuanganAction
  console.log('\n[Test 3] Create Transaksi Kas Masuk & Keluar (Decimal serialization test):')
  const trxMasukRes = await createTransaksiKeuanganAction({
    laporanId: laporanData.id,
    tipe: 'MASUK',
    kategori: 'Persembahan Ibadah',
    nominal: 5000000,
    metodePembayaran: 'CASH',
    catatan: 'Kolekte ibadah raya',
    tanggal: `${testTahun}-09-05T10:00:00.000Z`,
  })
  console.log(`Trx Masuk Result: success=${trxMasukRes.success}`)
  if (!trxMasukRes.success || !trxMasukRes.data) throw new Error('createTransaksiKeuanganAction failed')

  console.log(`- nominal type: ${typeof trxMasukRes.data.nominal} (${trxMasukRes.data.nominal})`)
  if (typeof trxMasukRes.data.nominal !== 'number') {
    throw new Error('FAIL: Transaction nominal is not a plain number!')
  }
  console.log('✓ createTransaksiKeuanganAction returned 100% plain serializable object!')

  // 4. Test getLaporanByIdAction
  console.log('\n[Test 4] Get Laporan Detail By ID:')
  const detailRes = await getLaporanByIdAction(laporanData.id)
  if (!detailRes.success || !detailRes.data) throw new Error('getLaporanByIdAction failed')
  console.log(`Detail Laporan: saldoAkhir=${detailRes.data.laporan.saldoAkhir}, trxCount=${detailRes.data.transaksi.length}`)
  console.log('✓ getLaporanByIdAction verified!')

  // 5. Test finalizePeriodAction
  console.log('\n[Test 5] Finalize / Close Period:')
  const closeRes = await finalizePeriodAction({ laporanId: laporanData.id })
  console.log(`Close Result: success=${closeRes.success}`)
  if (!closeRes.success || !closeRes.data) throw new Error('finalizePeriodAction failed')
  if (typeof closeRes.data.saldoAkhir !== 'number') throw new Error('Close response saldoAkhir is not number!')
  console.log('✓ finalizePeriodAction verified!')

  // 6. Test reopenPeriodAction
  console.log('\n[Test 6] Reopen Closed Period:')
  const reopenRes = await reopenPeriodAction({
    laporanId: laporanData.id,
    reason: 'Koreksi pencatatan mutasi kas uji coba',
  })
  console.log(`Reopen Result: success=${reopenRes.success}`)
  if (!reopenRes.success || !reopenRes.data) throw new Error('reopenPeriodAction failed')
  if (typeof reopenRes.data.saldoAkhir !== 'number') throw new Error('Reopen response saldoAkhir is not number!')
  console.log('✓ reopenPeriodAction verified!')

  // 7. Test getLaporanGabunganAction
  console.log('\n[Test 7] Get Laporan Gabungan:')
  const gabunganRes = await getLaporanGabunganAction({ tahun: testTahun })
  if (!gabunganRes.success || !gabunganRes.data) throw new Error('getLaporanGabunganAction failed')
  console.log(`Laporan Gabungan: Total Saldo=${gabunganRes.data.totalSaldoAkhir}, Scopes=${gabunganRes.data.scopes.length}`)
  console.log('✓ getLaporanGabunganAction verified!')

  // Clean up test records
  await prisma.transaksiKeuangan.deleteMany({ where: { laporanId: laporanData.id } })
  await prisma.laporanKeuangan.delete({ where: { id: laporanData.id } })

  console.log('\n=============================================')
  console.log('✓ ALL KEUANGAN SERIALIZATION TESTS PASSED!')
  console.log('=============================================')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
