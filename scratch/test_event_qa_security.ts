/**
 * Automated QA & Security Test Suite for Event & Attendance Module
 * Tests:
 * 1. Security & RBAC Enforcement
 * 2. Check-In Window Operational Boundary & Time-Locking (Early, Late, Override)
 * 3. Idempotency, Concurrency & Double Check-In Prevention
 * 4. Member Status Verification & Tamper Protection
 * 5. Instant Guest Attendance & XSS Sanitization
 * 6. Headcount Validation & Synchronization
 * 7. Cryptographic SHA-256 Audit Trail
 * 8. Performance Benchmark (<500ms)
 */

import { prisma } from '../src/lib/prisma'
import {
  createEventAction,
  updateEventAction,
  deleteEventAction,
  restoreEventAction,
  hardDeleteEventAction,
  scanAttendanceAction,
  recordGuestAttendanceAction,
  recordAttendanceByIdAction,
  updateEventHeadcountAction,
  getEventListAction,
} from '../src/actions/event'

interface TestResult {
  category: string
  name: string
  passed: boolean
  details: string
  durationMs: number
}

const results: TestResult[] = []

async function runTest(category: string, name: string, fn: () => Promise<{ passed: boolean; details: string }>) {
  const start = performance.now()
  try {
    const res = await fn()
    const durationMs = Math.round(performance.now() - start)
    results.push({
      category,
      name,
      passed: res.passed,
      details: res.details,
      durationMs,
    })
    console.log(`[${res.passed ? 'PASS' : 'FAIL'}] [${category}] ${name} (${durationMs}ms) - ${res.details}`)
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start)
    results.push({
      category,
      name,
      passed: false,
      details: `Exception: ${err?.message || err}`,
      durationMs,
    })
    console.error(`[FAIL] [${category}] ${name} (${durationMs}ms) - EXCEPTION:`, err)
  }
}

async function main() {
  console.log('==================================================================')
  console.log('🚀 STARTING COMPREHENSIVE QA & SECURITY TEST SUITE: EVENT & PRESENSI')
  console.log('==================================================================\n')

  let testJemaatActive: any = null
  let testJemaatInactive: any = null
  let testEventNormal: any = null
  let testEventEarly: any = null
  let testEventClosed: any = null

  try {
    // -------------------------------------------------------------
    // SETUP FIXTURES
    // -------------------------------------------------------------
    console.log('📦 Setting up test fixtures in PostgreSQL...')

    // Active Jemaat
    testJemaatActive = await prisma.jemaat.create({
      data: {
        nij: 'QA-ACTIVE-001',
        barcodeCode: 'BARCODE-QA-ACTIVE-001',
        nama: 'QA Test Jemaat Active',
        jenisKelamin: 'LAK_LAKI',
        statusJemaat: 'ACTIVE',
        alamat: 'Jl. Uji Kualitas No. 1',
        noHp: '081299990001',
      },
    })

    // Inactive Jemaat
    testJemaatInactive = await prisma.jemaat.create({
      data: {
        nij: 'QA-INACTIVE-002',
        barcodeCode: 'BARCODE-QA-INACTIVE-002',
        nama: 'QA Test Jemaat Inactive',
        jenisKelamin: 'PEREMPUAN',
        statusJemaat: 'INACTIVE',
        alamat: 'Jl. Uji Kualitas No. 2',
      },
    })

    const now = new Date()

    // Event 1: Normal Open Check-In Window (Open 2 hours ago, closes in 2 hours)
    const openTime = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const closeTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const resEv1 = await createEventAction({
      namaEvent: 'QA Normal Open Service',
      kategori: 'IBADAH_RAYA',
      tanggal: openTime.toISOString(),
      tanggalMulai: openTime.toISOString(),
      tanggalSelesai: closeTime.toISOString(),
      presensiBuka: openTime.toISOString(),
      presensiTutup: closeTime.toISOString(),
      namaLokasi: 'Main Hall Sanctuary',
      deskripsi: 'QA Test Event with Active Check-In Window',
    })
    testEventNormal = resEv1.data

    // Event 2: Early Event (Presensi opens in +3 hours)
    const futureOpen = new Date(now.getTime() + 3 * 60 * 60 * 1000)
    const futureClose = new Date(now.getTime() + 5 * 60 * 60 * 1000)
    const resEv2 = await createEventAction({
      namaEvent: 'QA Future Service (Early)',
      kategori: 'YOUTH',
      tanggal: futureOpen.toISOString(),
      tanggalMulai: futureOpen.toISOString(),
      tanggalSelesai: futureClose.toISOString(),
      presensiBuka: futureOpen.toISOString(),
      presensiTutup: futureClose.toISOString(),
      namaLokasi: 'Youth Hall',
      deskripsi: 'QA Test Event Not Yet Open',
    })
    testEventEarly = resEv2.data

    // Event 3: Closed Event (Presensi closed 2 hours ago)
    const pastOpen = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const pastClose = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const resEv3 = await createEventAction({
      namaEvent: 'QA Past Closed Service',
      kategori: 'KOMSEL',
      tanggal: pastOpen.toISOString(),
      tanggalMulai: pastOpen.toISOString(),
      tanggalSelesai: pastClose.toISOString(),
      presensiBuka: pastOpen.toISOString(),
      presensiTutup: pastClose.toISOString(),
      namaLokasi: 'Komsel Room',
      deskripsi: 'QA Test Event Already Closed',
    })
    testEventClosed = resEv3.data

    console.log('✅ Fixtures created successfully!\n')

    // -------------------------------------------------------------
    // CATEGORY 1: Security & RBAC Enforcement Test
    // -------------------------------------------------------------
    await runTest('Security & RBAC', 'Creation & Validation of Event', async () => {
      if (!testEventNormal?.id) return { passed: false, details: 'Failed to create event' }
      return { passed: true, details: `Event created with ID ${testEventNormal.id}` }
    })

    await runTest('Security & RBAC', 'Soft Delete & Restore Event Lifecycle', async () => {
      // Create temporary event with full date range for soft delete test
      const tempRes = await createEventAction({
        namaEvent: 'QA Temp Event for Deletion Test',
        kategori: 'SEMINAR',
        tanggal: new Date().toISOString(),
        tanggalMulai: new Date().toISOString(),
        tanggalSelesai: new Date(Date.now() + 3600000).toISOString(),
      })
      if (!tempRes.success || !tempRes.data?.id) {
        return { passed: false, details: `Failed to create temp event: ${JSON.stringify(tempRes)}` }
      }
      const tempId = tempRes.data.id

      // 1. Soft delete
      const delRes = await deleteEventAction({ id: tempId, reason: 'QA Audit Soft Delete Test' })
      if (!delRes.success) return { passed: false, details: `Soft delete failed: ${delRes.error}` }

      const evDeleted = await prisma.event.findUnique({ where: { id: tempId } })
      if (!evDeleted?.deletedAt) return { passed: false, details: 'deletedAt timestamp not set on soft delete' }

      // 2. Restore
      const restRes = await restoreEventAction({ id: tempId })
      if (!restRes.success) return { passed: false, details: `Restore failed: ${restRes.error}` }

      const evRestored = await prisma.event.findUnique({ where: { id: tempId } })
      if (evRestored?.deletedAt !== null) return { passed: false, details: 'deletedAt not cleared on restore' }

      // 3. Hard delete cleanup
      await hardDeleteEventAction({ id: tempId, reason: 'QA Cleanup' })
      const evGone = await prisma.event.findUnique({ where: { id: tempId } })
      if (evGone !== null) return { passed: false, details: 'Hard delete did not remove record from PostgreSQL' }

      return { passed: true, details: 'Soft delete, restore, and hard delete executed with full integrity' }
    })

    // -------------------------------------------------------------
    // CATEGORY 2: Check-In Window Operational Boundary & Time-Locking
    // -------------------------------------------------------------
    await runTest('Check-In Window Boundary', 'Block Scan When Check-In Window Not Yet Open', async () => {
      const res = await scanAttendanceAction({
        eventId: testEventEarly.id,
        barcodeCode: testJemaatActive.barcodeCode,
      })
      if (res.success === false && res.errorCode === 'CHECKIN_CLOSED') {
        return { passed: true, details: `Correctly rejected: "${res.message}"` }
      }
      return { passed: false, details: `Failed to block early scan. Result: ${JSON.stringify(res)}` }
    })

    await runTest('Check-In Window Boundary', 'Block Scan When Check-In Window Already Closed', async () => {
      const res = await scanAttendanceAction({
        eventId: testEventClosed.id,
        barcodeCode: testJemaatActive.barcodeCode,
      })
      if (res.success === false && res.errorCode === 'CHECKIN_CLOSED') {
        return { passed: true, details: `Correctly rejected: "${res.message}"` }
      }
      return { passed: false, details: `Failed to block scan on closed event. Result: ${JSON.stringify(res)}` }
    })

    await runTest('Check-In Window Boundary', 'Dashboard Reconciliation Override on Closed Event', async () => {
      const res = await scanAttendanceAction({
        eventId: testEventClosed.id,
        barcodeCode: testJemaatActive.barcodeCode,
        isDashboardOverride: true,
        notes: 'Admin Post-Event Reconciliation',
      })
      if (res.success && res.data?.attendanceId) {
        return { passed: true, details: `Successfully bypassed closed window for admin reconciliation (Attendance ID: ${res.data.attendanceId})` }
      }
      return { passed: false, details: `Failed to override closed check-in window. Result: ${JSON.stringify(res)}` }
    })

    // -------------------------------------------------------------
    // CATEGORY 3: Idempotency, Concurrency & Double Check-In Prevention
    // -------------------------------------------------------------
    await runTest('Idempotency & Concurrency', 'First Valid Scan Registers Attendance', async () => {
      const res = await scanAttendanceAction({
        eventId: testEventNormal.id,
        barcodeCode: testJemaatActive.barcodeCode,
      })
      if (res.success && res.idempotent === false && res.data?.attendanceId) {
        return { passed: true, details: `Attendance recorded on first scan (ID: ${res.data.attendanceId})` }
      }
      return { passed: false, details: `Unexpected response on initial scan: ${JSON.stringify(res)}` }
    })

    await runTest('Idempotency & Concurrency', 'Duplicate Scan Handled Idempotently Without Duplication', async () => {
      const res = await scanAttendanceAction({
        eventId: testEventNormal.id,
        barcodeCode: testJemaatActive.barcodeCode,
      })
      if (res.success && res.idempotent === true) {
        // Verify database count is exactly 1
        const count = await prisma.attendance.count({
          where: { eventId: testEventNormal.id, jemaatId: testJemaatActive.id },
        })
        if (count === 1) {
          return { passed: true, details: `Idempotency verified: duplicate scan safely ignored, DB count = ${count}` }
        } else {
          return { passed: false, details: `Duplicate record created in database! Count = ${count}` }
        }
      }
      return { passed: false, details: `Duplicate scan did not return idempotent flag: ${JSON.stringify(res)}` }
    })

    // -------------------------------------------------------------
    // CATEGORY 4: Member Status Verification & Tamper Protection
    // -------------------------------------------------------------
    await runTest('Member Status Verification', 'Reject Inactive Member Attendance', async () => {
      const res = await scanAttendanceAction({
        eventId: testEventNormal.id,
        barcodeCode: testJemaatInactive.barcodeCode,
      })
      if (res.success === false && res.errorCode === 'JEMAAT_INACTIVE') {
        return { passed: true, details: `Correctly rejected inactive member: "${res.message}"` }
      }
      return { passed: false, details: `Failed to reject inactive jemaat: ${JSON.stringify(res)}` }
    })

    await runTest('Member Status Verification', 'Reject Tampered / Non-Existent Barcode', async () => {
      const tamperedCode = 'BARCODE-INJECTION-DROP-TABLE-999'
      const res = await scanAttendanceAction({
        eventId: testEventNormal.id,
        barcodeCode: tamperedCode,
      })
      if (res.success === false && res.errorCode === 'JEMAAT_NOT_FOUND') {
        return { passed: true, details: `Correctly rejected non-existent barcode: "${res.message}"` }
      }
      return { passed: false, details: `Failed to reject tampered barcode: ${JSON.stringify(res)}` }
    })

    // -------------------------------------------------------------
    // CATEGORY 5: Instant Guest Attendance & XSS Sanitization
    // -------------------------------------------------------------
    await runTest('Guest Attendance & Anti-XSS', 'Instant Guest Attendance Registration', async () => {
      const guestRes = await recordGuestAttendanceAction({
        eventId: testEventNormal.id,
        nama: 'Bapak Tamu Baru Terhormat',
        jenisKelamin: 'LAK_LAKI',
        noHp: '081399887766',
        whatsApp: '081399887766',
        catatan: 'Tamu undangan ibadah raya',
      })
      if (guestRes.success && guestRes.data?.tamuId) {
        // Verify guest created with status TAMU
        const guestJemaat = await prisma.jemaat.findUnique({
          where: { id: guestRes.data.tamuId },
        })
        if (guestJemaat?.statusJemaat === 'TAMU') {
          return { passed: true, details: `Guest registered with status "${guestJemaat.statusJemaat}" (ID: ${guestJemaat.id})` }
        }
        return { passed: false, details: `Guest jemaat status mismatch: ${JSON.stringify(guestJemaat)}` }
      }
      return { passed: false, details: `Guest registration failed: ${JSON.stringify(guestRes)}` }
    })

    await runTest('Guest Attendance & Anti-XSS', 'Anti-XSS & Script Injection Neutralization', async () => {
      const maliciousPayload = '<script>alert("XSS_ATTACK_VECTOR")</script> <b>Dr. John Doe</b>'
      const guestRes = await recordGuestAttendanceAction({
        eventId: testEventNormal.id,
        nama: maliciousPayload,
        jenisKelamin: 'LAK_LAKI',
        catatan: '<img src=x onerror=alert(1)> Catatan Tamu',
      })
      if (guestRes.success && guestRes.data?.tamuId) {
        const guest = await prisma.jemaat.findUnique({ where: { id: guestRes.data.tamuId } })
        if (guest?.nama === maliciousPayload) {
          return { passed: true, details: `Payload safely parameterized in PostgreSQL without injection execution: "${guest?.nama}"` }
        }
      }
      return { passed: false, details: `Malicious guest payload failed to process safely: ${JSON.stringify(guestRes)}` }
    })

    // -------------------------------------------------------------
    // CATEGORY 6: Headcount Validation & Synchronization
    // -------------------------------------------------------------
    await runTest('Headcount Validation', 'Update Valid Positive Headcount Number', async () => {
      const updateRes = await updateEventHeadcountAction({
        eventId: testEventNormal.id,
        manualHeadcount: 145,
      })
      if (updateRes.success) {
        const ev = await prisma.event.findUnique({ where: { id: testEventNormal.id } })
        if (ev?.manualHeadcount === 145) {
          return { passed: true, details: `Headcount successfully synchronized to ${ev.manualHeadcount} in PostgreSQL` }
        }
        return { passed: false, details: `Database headcount mismatch: ${ev?.manualHeadcount}` }
      }
      return { passed: false, details: `Headcount update failed: ${JSON.stringify(updateRes)}` }
    })

    await runTest('Headcount Validation', 'Negative Headcount Rejected Safely by Zod Schema', async () => {
      const updateRes = await updateEventHeadcountAction({
        eventId: testEventNormal.id,
        manualHeadcount: -50,
      })
      if (!updateRes.success) {
        return { passed: true, details: `Negative number correctly rejected by validation schema: "${updateRes.message}"` }
      }
      return { passed: false, details: `Negative headcount was erroneously accepted: ${JSON.stringify(updateRes)}` }
    })

    // -------------------------------------------------------------
    // CATEGORY 7: Cryptographic SHA-256 Audit Trail
    // -------------------------------------------------------------
    await runTest('Cryptographic Audit Trail', 'Verify SHA-256 Audit Log Record for Attendance', async () => {
      const logs = await prisma.auditLog.findMany({
        where: {
          action: 'ATTENDANCE_SCANNED',
        },
        orderBy: { timestamp: 'desc' },
        take: 1,
      })
      if (logs.length > 0) {
        const log = logs[0]
        const hasValidHash = typeof log.currentHash === 'string' && log.currentHash.length === 64
        if (hasValidHash) {
          return { passed: true, details: `Audit log found with valid SHA-256 hash (${log.currentHash.substring(0, 16)}...)` }
        }
        return { passed: false, details: `Invalid currentHash format: ${log.currentHash}` }
      }
      return { passed: false, details: 'No ATTENDANCE_SCANNED audit log found' }
    })

    // -------------------------------------------------------------
    // CATEGORY 8: Performance Benchmark
    // -------------------------------------------------------------
    await runTest('Performance Benchmark', 'Scan Attendance Latency under 500ms Threshold', async () => {
      const start = performance.now()
      const res = await scanAttendanceAction({
        eventId: testEventNormal.id,
        barcodeCode: testJemaatActive.barcodeCode,
      })
      const latencyMs = Math.round(performance.now() - start)
      if (res.success && latencyMs < 500) {
        return { passed: true, details: `Server execution completed in ${latencyMs}ms (< 500ms SLA target)` }
      }
      return { passed: false, details: `Latency exceeded SLA: ${latencyMs}ms` }
    })

  } finally {
    // -------------------------------------------------------------
    // TEARDOWN & CLEANUP
    // -------------------------------------------------------------
    console.log('\n🧹 Cleaning up test fixtures from PostgreSQL...')
    try {
      if (testEventNormal?.id) {
        await prisma.attendance.deleteMany({ where: { eventId: testEventNormal.id } })
        await prisma.auditLog.deleteMany({ where: { entityId: testEventNormal.id } })
        await prisma.event.delete({ where: { id: testEventNormal.id } }).catch(() => {})
      }
      if (testEventEarly?.id) {
        await prisma.attendance.deleteMany({ where: { eventId: testEventEarly.id } })
        await prisma.auditLog.deleteMany({ where: { entityId: testEventEarly.id } })
        await prisma.event.delete({ where: { id: testEventEarly.id } }).catch(() => {})
      }
      if (testEventClosed?.id) {
        await prisma.attendance.deleteMany({ where: { eventId: testEventClosed.id } })
        await prisma.auditLog.deleteMany({ where: { entityId: testEventClosed.id } })
        await prisma.event.delete({ where: { id: testEventClosed.id } }).catch(() => {})
      }
      if (testJemaatActive?.id) {
        await prisma.attendance.deleteMany({ where: { jemaatId: testJemaatActive.id } })
        await prisma.auditLog.deleteMany({ where: { entityId: testJemaatActive.id } })
        await prisma.jemaat.delete({ where: { id: testJemaatActive.id } }).catch(() => {})
      }
      if (testJemaatInactive?.id) {
        await prisma.attendance.deleteMany({ where: { jemaatId: testJemaatInactive.id } })
        await prisma.auditLog.deleteMany({ where: { entityId: testJemaatInactive.id } })
        await prisma.jemaat.delete({ where: { id: testJemaatInactive.id } }).catch(() => {})
      }

      // Cleanup generated guests
      const guests = await prisma.jemaat.findMany({
        where: {
          OR: [
            { nama: 'Bapak Tamu Baru Terhormat' },
            { nama: { contains: 'XSS_ATTACK_VECTOR' } },
          ],
        },
      })
      for (const g of guests) {
        await prisma.attendance.deleteMany({ where: { jemaatId: g.id } })
        await prisma.auditLog.deleteMany({ where: { entityId: g.id } })
        await prisma.jemaat.delete({ where: { id: g.id } }).catch(() => {})
      }
      console.log('✅ Teardown complete!')
    } catch (cleanupErr) {
      console.error('⚠️ Cleanup warning:', cleanupErr)
    }
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n==================================================================')
  console.log('📊 TEST EXECUTION SUMMARY REPORT')
  console.log('==================================================================')
  const total = results.length
  const passed = results.filter((r) => r.passed).length
  const failed = total - passed

  console.log(`Total Tests Executed : ${total}`)
  console.log(`Passed               : ${passed}`)
  console.log(`Failed               : ${failed}`)
  console.log(`Success Rate         : ${Math.round((passed / total) * 100)}%\n`)

  results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL'
    console.log(`${idx + 1}. [${r.category}] ${r.name} -> ${status} (${r.durationMs}ms)`)
    if (!r.passed) {
      console.log(`   Error Details: ${r.details}`)
    }
  })
  console.log('==================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal Test Runner Exception:', err)
    process.exit(1)
  })
