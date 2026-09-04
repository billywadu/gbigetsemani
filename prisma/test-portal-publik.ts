import { prisma } from '../src/lib/prisma'
import { getProfilPublikAction, getPublicHomepageMateriAction } from '../src/actions/publik'
import { submitPendaftaranMandiriAction } from '../src/actions/pendaftaran'
import { sanitizeAndFormatArticleHtml } from '../src/lib/sanitizer'

async function main() {
  console.log('=== TEST SUITE MODUL 14: PORTAL PUBLIK GEREJA ===')

  // 1. Test Verification Action: Find an active member
  const activeMember = await prisma.jemaat.findFirst({
    where: { deletedAt: null, statusJemaat: { not: 'TAMU' } },
  })

  if (activeMember && activeMember.nij) {
    console.log(`\n[Test 1] Exact Match NIJ Verification for: ${activeMember.nij}`)
    const resExact = await getProfilPublikAction(activeMember.nij, '192.168.1.10')
    console.log(`Exact NIJ result: success=${resExact.success}, nama="${resExact.data?.nama}", status="${resExact.data?.statusJemaat}"`)
    if (!resExact.success || !resExact.data) throw new Error('Exact NIJ match failed')

    // Verify minimal DTO privacy (no sensitive data leakage)
    const dtoKeys = Object.keys(resExact.data)
    console.log(`DTO exposed fields: ${dtoKeys.join(', ')}`)
    const forbidden = ['noHp', 'whatsApp', 'email', 'alamat', 'tanggalLahir', 'catatan', 'passwordHash']
    for (const f of forbidden) {
      if (dtoKeys.includes(f)) throw new Error(`Privacy breach: sensitive field "${f}" was exposed in PublicVerificationDTO!`)
    }
    console.log('✓ Strict privacy barrier verified: No PII leakage!')

    // Test Barcode Exact match if available
    if (activeMember.barcodeCode) {
      console.log(`\n[Test 2] Exact Match Barcode Verification for: ${activeMember.barcodeCode}`)
      const resBarcode = await getProfilPublikAction(activeMember.barcodeCode, '192.168.1.11')
      console.log(`Exact Barcode result: success=${resBarcode.success}, nama="${resBarcode.data?.nama}"`)
      if (!resBarcode.success) throw new Error('Exact Barcode match failed')
      console.log('✓ Barcode verification verified!')
    }
  }

  // 2. Test Partial / Enumeration / Wildcard Rejection
  console.log('\n[Test 3] Partial Query & Name Enumeration Rejection:')
  const partialQueries = ['NIJ-', 'NIJ-%', 'Andreas', 'JMT-', '1234']
  for (const q of partialQueries) {
    const resPartial = await getProfilPublikAction(q, '192.168.1.12')
    if (resPartial.success) throw new Error(`Security breach: Query "${q}" matched a record! Partial match must be rejected!`)
  }
  console.log('✓ Anti-enumeration exact match rule passed!')

  // 3. Test TAMU and Deleted Member Rejection
  console.log('\n[Test 4] TAMU and Deleted Member Protection:')
  const guestMember = await prisma.jemaat.findFirst({
    where: { statusJemaat: 'TAMU' },
  })
  if (guestMember && guestMember.nij) {
    const resGuest = await getProfilPublikAction(guestMember.nij, '192.168.1.13')
    if (resGuest.success) throw new Error('Security breach: TAMU record was verified in public portal!')
    console.log('✓ TAMU exclusion verified!')
  }

  // 4. Test Rate Limiting
  console.log('\n[Test 5] Public Verification Rate Limiting (20 req / 60s per IP):')
  const testIp = '10.200.0.99'
  let triggeredRateLimit = false
  for (let i = 1; i <= 25; i++) {
    const res = await getProfilPublikAction('NIJ-9999', testIp)
    if (res.rateLimited) {
      triggeredRateLimit = true
      console.log(`Rate limit successfully triggered on request #${i}!`)
      break
    }
  }
  if (!triggeredRateLimit) throw new Error('Rate limit was not enforced!')
  console.log('✓ Rate limiting protection verified!')

  // 5. Test Public Self-Registration
  console.log('\n[Test 6] Submit Public Self-Registration via Modul 8 Action:')
  const testPhone = `0812${Date.now().toString().slice(-8)}`
  const testEmail = `budi.test.${Date.now()}@example.com`
  const submitRes = await submitPendaftaranMandiriAction({
    nama: 'Budi Santoso Public Test',
    namaPanggilan: 'Budi',
    jenisKelamin: 'LAK_LAKI',
    noHp: testPhone,
    whatsApp: testPhone,
    email: testEmail,
    alamat: 'Jl. Khatib Sulaiman No. 20, Padang',
    statusPernikahan: 'MENIKAH',
    pekerjaan: 'Wiraswasta',
  })
  console.log(`Self-registration result: success=${submitRes.success}, message="${submitRes.message}"`)
  if (!submitRes.success || !submitRes.data) throw new Error(`Self-registration failed: ${submitRes.error}`)
  if (!submitRes.data.id) throw new Error('Registration did not create a record')
  console.log('✓ Modul 8 Pendaftaran Mandiri integration verified!')

  // Clean test registration
  await prisma.pendaftaranJemaat.delete({ where: { id: submitRes.data.id } })

  // 6. Test Public Homepage Materials
  console.log('\n[Test 7] Public Homepage Materials (Only PUBLISHED):')
  const homeMateri = await getPublicHomepageMateriAction(5)
  console.log(`Fetched ${homeMateri.data.length} published materials for homepage.`)
  for (const m of homeMateri.data) {
    if (m.status !== 'PUBLISHED') throw new Error('Draft material leaked to homepage!')
  }
  console.log('✓ Homepage published materials filter verified!')

  // 7. Test HTML Sanitization & TOC Parser
  console.log('\n[Test 8] HTML Sanitization & Table of Contents Parser:')
  const dirtyHtml = `
    <h1>Pengenalan Firman</h1>
    <script>alert('xss');</script>
    <p onclick="steal()">Teks artikel firman Tuhan <a href="javascript:alert(1)">Tautan berbahaya</a></p>
    <h2>Poin 1: Kasih Karunia</h2>
    <iframe src="http://evil.com"></iframe>
    <div class="bible-callout">📖 Yohanes 3:16</div>
    <h3>Sub-poin 1.1: Pengorbanan</h3>
  `
  const { sanitizedHtml, headings } = sanitizeAndFormatArticleHtml(dirtyHtml)
  console.log(`Sanitized HTML has <script>: ${sanitizedHtml.includes('<script>')}`)
  console.log(`Sanitized HTML has <iframe>: ${sanitizedHtml.includes('<iframe>')}`)
  console.log(`Sanitized HTML has javascript:: ${sanitizedHtml.includes('javascript:')}`)
  console.log(`Headings extracted (${headings.length}):`, headings.map((h) => `${h.id} (${h.level}): ${h.text}`))

  if (sanitizedHtml.includes('<script>') || sanitizedHtml.includes('<iframe>') || sanitizedHtml.includes('javascript:')) {
    throw new Error('HTML Sanitizer allowed dangerous content!')
  }
  if (headings.length !== 3) throw new Error(`Expected 3 headings, got ${headings.length}`)
  console.log('✓ HTML Sanitization and Table of Contents parser verified!')

  console.log('\n=============================================')
  console.log('✓ ALL MODUL 14 TEST SUITES PASSED SUCCESSFULLY!')
  console.log('=============================================')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
