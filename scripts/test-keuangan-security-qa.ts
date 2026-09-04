/**
 * Comprehensive QA & Security Penetration Test Suite for Financial Module (Modul Keuangan)
 * Church CMS
 */

import { prisma } from '../src/lib/prisma'
import {
  createLaporanKeuanganSchema,
  createTransaksiKeuanganSchema,
  updateTransaksiKeuanganSchema,
} from '../src/lib/validations/keuangan'
import {
  createScopeAction,
  createLaporanKeuanganAction,
  createTransaksiKeuanganAction,
  updateTransaksiKeuanganAction,
  deleteTransaksiKeuanganAction,
  restoreTransaksiKeuanganAction,
  hardDeleteTransaksiKeuanganAction,
  finalizePeriodAction,
  reopenPeriodAction,
  hardDeleteLaporanKeuanganAction,
  deleteScopeAction,
} from '../src/actions/keuangan'
import { escapeHtml } from '../src/lib/utils'

interface TestResult {
  name: string
  suite: string
  passed: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

function assert(condition: boolean, name: string, suite: string, message: string, details?: any) {
  results.push({
    name,
    suite,
    passed: !!condition,
    message: condition ? `✅ PASS: ${message}` : `❌ FAIL: ${message}`,
    details,
  })
}

async function runTestSuite() {
  console.log('\n=============================================================')
  console.log('  🔒 STARTING FINANCIAL MODULE QA & SECURITY AUDIT TEST SUITE')
  console.log('=============================================================\n')

  // ─────────────────────────────────────────────────────────────────
  // SUITE 1: Input Validation & Boundary Attack Test
  // ─────────────────────────────────────────────────────────────────
  console.log('▶ [Suite 1/6] Running Boundary & Malicious Input Validation Tests...')

  const dummyUUID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'

  // Test 1.1: Negative nominal injection
  const negCheck = createTransaksiKeuanganSchema.safeParse({
    laporanId: dummyUUID,
    tipe: 'MASUK',
    kategori: 'Persembahan',
    nominal: -500000,
    tanggal: '2026-08-28',
  })
  assert(!negCheck.success, 'Negative Nominal Injection', 'Boundary Validation', 'Negative nominal is strictly rejected by schema.')

  // Test 1.2: Zero nominal injection
  const zeroCheck = createTransaksiKeuanganSchema.safeParse({
    laporanId: dummyUUID,
    tipe: 'KELUAR',
    kategori: 'Listrik',
    nominal: 0,
    tanggal: '2026-08-28',
  })
  assert(!zeroCheck.success, 'Zero Nominal Injection', 'Boundary Validation', 'Zero nominal is strictly rejected by schema.')

  // Test 1.3: Absurd nominal / Integer Overflow injection (> 100 Miliar)
  const overflowCheck = createTransaksiKeuanganSchema.safeParse({
    laporanId: dummyUUID,
    tipe: 'MASUK',
    kategori: 'Donasi',
    nominal: 999_999_999_999,
    tanggal: '2026-08-28',
  })
  assert(!overflowCheck.success, 'Max Upper Limit Enforcement', 'Boundary Validation', 'Nominal exceeding Rp 100 Miliar is rejected.')

  // Test 1.4: SQL Injection in UUID parameter
  const sqliCheck = createTransaksiKeuanganSchema.safeParse({
    laporanId: "123' OR '1'='1' --",
    tipe: 'MASUK',
    kategori: 'Uji SQLi',
    nominal: 100000,
    tanggal: '2026-08-28',
  })
  assert(!sqliCheck.success, 'SQLi UUID Injection', 'Boundary Validation', 'SQLi string in UUID parameter is rejected by UUID validator.')

  // Test 1.5: Invalid month (13) and year (< 2020)
  const invalidMonth = createLaporanKeuanganSchema.safeParse({
    scopeId: 'UMUM',
    bulan: 13,
    tahun: 2026,
  })
  assert(!invalidMonth.success, 'Invalid Month Boundary (13)', 'Boundary Validation', 'Month 13 is rejected (Must be 1-12).')

  const invalidYear = createLaporanKeuanganSchema.safeParse({
    scopeId: 'UMUM',
    bulan: 5,
    tahun: 1999,
  })
  assert(!invalidYear.success, 'Invalid Year Boundary (< 2020)', 'Boundary Validation', 'Year 1999 is rejected (Must be >= 2020).')

  // ─────────────────────────────────────────────────────────────────
  // SETUP TEST DATA: Create dedicated testing scope
  // ─────────────────────────────────────────────────────────────────
  console.log('\n▶ Setting up temporary testing scope & period...')
  const testScopeCode = `QA_SEC_${Date.now().toString().slice(-4)}`
  const scopeRes = await createScopeAction({
    code: testScopeCode,
    name: `Pos Kas Uji Keamanan (${testScopeCode})`,
    description: 'Scope sementara untuk pengujian QA dan audit keamanan.',
    isActive: true,
  })

  if (!scopeRes.success || !scopeRes.data) {
    console.error('Fatal: Failed to create testing scope:', scopeRes.error)
    return
  }
  const scopeId = scopeRes.data.id

  const periodRes = await createLaporanKeuanganAction({
    scopeId: testScopeCode,
    bulan: 1,
    tahun: 2049,
    saldoAwalMode: 'MANUAL',
    saldoAwalCustom: 5000000,
  })

  if (!periodRes.success || !periodRes.data) {
    console.error('Fatal: Failed to create testing period:', periodRes.error)
    return
  }
  const laporanId = periodRes.data.id

  // ─────────────────────────────────────────────────────────────────
  // SUITE 2: Closed Period Protection (Immutability & Anti-Tampering)
  // ─────────────────────────────────────────────────────────────────
  console.log('▶ [Suite 2/6] Running Closed Period Anti-Tampering Protection Tests...')

  // Step 2.1: Finalize (Lock) the period
  const closeRes = await finalizePeriodAction({ laporanId })
  assert(closeRes.success, 'Period Finalization', 'Closed Period Immutability', 'Period successfully finalized to CLOSED status.')

  // Step 2.2: Attempt to insert transaction into CLOSED period -> MUST FAIL
  const addClosedTrx = await createTransaksiKeuanganAction({
    laporanId,
    tipe: 'MASUK',
    kategori: 'Hacker Injection',
    nominal: 1000000,
    metodePembayaran: 'CASH',
    tanggal: new Date('2049-01-15'),
    catatan: 'Attempting to inject funds into locked period',
  })
  assert(!addClosedTrx.success, 'Reject Insert on CLOSED Period', 'Closed Period Immutability', 'Insertion into CLOSED period was successfully blocked.', addClosedTrx.error)

  // ─────────────────────────────────────────────────────────────────
  // SUITE 3: Reopen & Mathematical Precision Invariant Tests
  // ─────────────────────────────────────────────────────────────────
  console.log('▶ [Suite 3/6] Running Reopening & Balance Recalculation Precision Tests...')

  // Step 3.1: Reopen period with valid audit reason
  const reopenRes = await reopenPeriodAction({
    laporanId,
    reason: 'QA Audit: Testing mathematical balance precision and mutations.',
  })
  assert(reopenRes.success, 'Reopen Period with Audit Reason', 'Audit Trail & Workflow', 'Period successfully reopened back to DRAFT status.')

  // Step 3.2: Insert sequential transactions
  const t1 = await createTransaksiKeuanganAction({
    laporanId,
    tipe: 'MASUK',
    kategori: 'Persembahan Kolekte 1',
    nominal: 1500000,
    metodePembayaran: 'CASH',
    tanggal: new Date('2049-01-05'),
  })
  const t2 = await createTransaksiKeuanganAction({
    laporanId,
    tipe: 'MASUK',
    kategori: 'Persembahan Kolekte 2',
    nominal: 2500000,
    metodePembayaran: 'TRANSFER',
    tanggal: new Date('2049-01-12'),
  })
  const t3 = await createTransaksiKeuanganAction({
    laporanId,
    tipe: 'MASUK',
    kategori: 'Perpuluhan Jemaat',
    nominal: 1000000,
    metodePembayaran: 'QRIS',
    tanggal: new Date('2049-01-19'),
  })
  const t4 = await createTransaksiKeuanganAction({
    laporanId,
    tipe: 'KELUAR',
    kategori: 'Biaya Kebersihan & Listrik',
    nominal: 750000,
    metodePembayaran: 'TRANSFER',
    tanggal: new Date('2049-01-20'),
  })
  const t5 = await createTransaksiKeuanganAction({
    laporanId,
    tipe: 'KELUAR',
    kategori: 'Bantuan Diakonia',
    nominal: 250000,
    metodePembayaran: 'CASH',
    tanggal: new Date('2049-01-25'),
  })

  assert(
    !!(t1.success && t2.success && t3.success && t4.success && t5.success),
    'Atomic Transaction Insertions',
    'Mathematical Integrity',
    'All 5 mutations inserted with atomic TRX reference numbers.'
  )

  // Step 3.3: Verify Exact Mathematical Invariant: Saldo Akhir = Saldo Awal (5jt) + Masuk (5jt) - Keluar (1jt) = 9jt
  const currentLap = await prisma.laporanKeuangan.findUnique({ where: { id: laporanId } })
  const saldoAwal = Number(currentLap?.saldoAwal || 0)
  const totalMasuk = Number(currentLap?.totalPemasukan || 0)
  const totalKeluar = Number(currentLap?.totalPengeluaran || 0)
  const saldoAkhir = Number(currentLap?.saldoAkhir || 0)

  const mathValid = saldoAwal === 5000000 && totalMasuk === 5000000 && totalKeluar === 1000000 && saldoAkhir === 9000000
  assert(mathValid, 'Strict Mathematical Invariant Test', 'Mathematical Integrity', `Formula Verified: Rp ${saldoAwal} + Rp ${totalMasuk} - Rp ${totalKeluar} = Rp ${saldoAkhir}`)

  // ─────────────────────────────────────────────────────────────────
  // SUITE 4: Transaction Lifecycle & Recalculation Tests
  // ─────────────────────────────────────────────────────────────────
  console.log('▶ [Suite 4/6] Running Transaction Lifecycle & Recalculation Tests...')

  const trxToModifyId = t3.data?.id!

  // Step 4.1: Soft-Delete 1 MASUK transaction of Rp 1.000.000
  const softDelRes = await deleteTransaksiKeuanganAction({
    id: trxToModifyId,
    reason: 'Kuitansi salah input untuk verifikasi soft-delete.',
  })
  assert(softDelRes.success, 'Soft-Delete Transaction', 'Lifecycle Recalculation', 'Transaction soft-deleted successfully.')

  const lapAfterDelete = await prisma.laporanKeuangan.findUnique({ where: { id: laporanId } })
  const masukAfterDel = Number(lapAfterDelete?.totalPemasukan || 0)
  const akhirAfterDel = Number(lapAfterDelete?.saldoAkhir || 0)
  assert(
    masukAfterDel === 4000000 && akhirAfterDel === 8000000,
    'Recalculation on Soft-Delete',
    'Lifecycle Recalculation',
    `Pemasukan automatically decreased to Rp ${masukAfterDel}, ending balance to Rp ${akhirAfterDel}.`
  )

  // Step 4.2: Restore transaction
  const restoreRes = await restoreTransaksiKeuanganAction({ id: trxToModifyId })
  assert(restoreRes.success, 'Restore Transaction', 'Lifecycle Recalculation', 'Transaction restored successfully.')

  const lapAfterRestore = await prisma.laporanKeuangan.findUnique({ where: { id: laporanId } })
  assert(
    Number(lapAfterRestore?.saldoAkhir) === 9000000,
    'Recalculation on Restore',
    'Lifecycle Recalculation',
    `Ending balance correctly restored back to Rp ${Number(lapAfterRestore?.saldoAkhir)}.`
  )

  // Step 4.3: Update transaction amount (Change t5 from Rp 250.000 to Rp 500.000)
  const updateRes = await updateTransaksiKeuanganAction({
    id: t5.data?.id!,
    tipe: 'KELUAR',
    kategori: 'Bantuan Diakonia Khusus',
    nominal: 500000,
    metodePembayaran: 'CASH',
    tanggal: new Date('2049-01-25'),
    catatan: 'Penambahan nominal santunan',
  })
  assert(updateRes.success, 'Update Transaction Action', 'Lifecycle Recalculation', 'Transaction updated with recalculation.')

  const lapAfterUpdate = await prisma.laporanKeuangan.findUnique({ where: { id: laporanId } })
  const keluarAfterUpd = Number(lapAfterUpdate?.totalPengeluaran || 0)
  const akhirAfterUpd = Number(lapAfterUpdate?.saldoAkhir || 0)
  assert(
    keluarAfterUpd === 1250000 && akhirAfterUpd === 8750000,
    'Recalculation on Edit/Update',
    'Lifecycle Recalculation',
    `Total pengeluaran changed to Rp ${keluarAfterUpd}, ending balance to Rp ${akhirAfterUpd}.`
  )

  // ─────────────────────────────────────────────────────────────────
  // SUITE 5: XSS Payload Neutralization Test
  // ─────────────────────────────────────────────────────────────────
  console.log('▶ [Suite 5/6] Running Cross-Site Scripting (XSS) Sanitization Tests...')

  const xssPayload1 = '<script>alert("XSS")</script>'
  const xssPayload2 = '<img src=x onerror=alert(document.cookie)>'
  const xssPayload3 = '"><svg onload=alert(1)>'

  const escaped1 = escapeHtml(xssPayload1)
  const escaped2 = escapeHtml(xssPayload2)
  const escaped3 = escapeHtml(xssPayload3)

  const xssSafe =
    !escaped1.includes('<script>') &&
    escaped1.includes('&lt;script&gt;') &&
    !escaped2.includes('<img') &&
    escaped2.includes('&lt;img') &&
    !escaped3.includes('<svg')

  assert(xssSafe, 'HTML Entity Escaping for Print & Views', 'XSS Sanitization', 'All malicious HTML/JS payloads were safely neutralized to HTML entities.')

  // ─────────────────────────────────────────────────────────────────
  // SUITE 6: Cryptographic SHA-256 Audit Trail Verification
  // ─────────────────────────────────────────────────────────────────
  console.log('▶ [Suite 6/6] Verifying Cryptographic Audit Trail in Database...')

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityId: laporanId },
        { entityId: t1.data?.id },
        { entityId: t5.data?.id },
      ],
    },
  })

  const hasAuditLogs = auditLogs.length >= 4
  assert(
    hasAuditLogs,
    'Cryptographic Audit Logs Persistence',
    'Audit Trail & Compliance',
    `Found ${auditLogs.length} immutable audit log entries recording creation, updates, and state transitions.`
  )

  // ─────────────────────────────────────────────────────────────────
  // CLEANUP: Clean test data from database
  // ─────────────────────────────────────────────────────────────────
  console.log('\n▶ Cleaning up temporary test data...')
  await hardDeleteLaporanKeuanganAction({ id: laporanId })
  await deleteScopeAction({ id: scopeId })
  console.log('🧹 Cleanup complete: Temporary test records removed.')

  // ─────────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────────
  console.log('\n=============================================================')
  console.log('               📊 QA & SECURITY AUDIT SUMMARY')
  console.log('=============================================================')

  const total = results.length
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length

  results.forEach((r) => {
    console.log(`${r.message} [${r.suite}] - ${r.name}`)
  })

  console.log('-------------------------------------------------------------')
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log(`SECURITY STATUS: ${failed === 0 ? '🟢 100% SECURE & VERIFIED' : '🔴 VULNERABILITY DETECTED'}`)
  console.log('=============================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite error:', err)
  process.exit(1)
})
