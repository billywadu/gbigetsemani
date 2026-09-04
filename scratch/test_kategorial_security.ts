import { prisma } from '../src/lib/prisma'
import {
  createKategorialAction,
  updateKategorialAction,
  deleteKategorialAction,
  hardDeleteKategorialAction,
  getKategorialListAction,
  getOrCreateDefaultKategorial,
} from '../src/actions/kategorial'
import {
  submitPendaftaranMandiriAction,
  approvePendaftaranAction,
} from '../src/actions/pendaftaran'

async function runQASecurityTests() {
  console.log('====================================================')
  console.log('  QA & SECURITY TEST SUITE: KATEGORIAL UMUM SYSTEM  ')
  console.log('====================================================\n')

  let passedTests = 0
  let totalTests = 0

  function assert(condition: boolean, testName: string, errorDetail?: any) {
    totalTests++
    if (condition) {
      console.log(`✅ [PASS] Test ${totalTests}: ${testName}`)
      passedTests++
    } else {
      console.error(`❌ [FAIL] Test ${totalTests}: ${testName}`)
      if (errorDetail) console.error('   Detail:', errorDetail)
    }
  }

  // --- TEST 1: Verify Single System Default Kategorial "Umum" ---
  console.log('\n--- Test 1: Verify Single System Default Kategorial "Umum" ---')
  const defaultCategories = await prisma.kategorial.findMany({
    where: { isDefault: true, deletedAt: null },
  })
  assert(
    defaultCategories.length === 1 && defaultCategories[0].nama.toLowerCase() === 'umum',
    'Exactly ONE system default category exists and is named "Umum"',
    defaultCategories
  )
  const umumCategory = defaultCategories[0]

  // --- TEST 2: Auto-Assignment on Pendaftaran Approval ---
  console.log('\n--- Test 2: Auto-Assignment on Pendaftaran Approval ---')
  const testPhone = `08129999${Math.floor(1000 + Math.random() * 9000)}`
  const regRes = await submitPendaftaranMandiriAction({
    nama: 'Calon Jemaat QA Test Auto Umum',
    jenisKelamin: 'LAK_LAKI',
    noHp: testPhone,
    statusPernikahan: 'BELUM_MENIKAH',
  })

  assert(regRes.success === true, 'Pendaftaran mandiri created successfully', regRes)

  const regId = (regRes as any).data.id
  const approveRes = await approvePendaftaranAction({ registrationId: regId })
  assert(approveRes.success === true, 'Pendaftaran approved successfully', approveRes)

  const approvedJemaatId = (approveRes as any).data.jemaat?.id || (approveRes as any).data.jemaatId
  const jemaatInDb = await prisma.jemaat.findUnique({
    where: { id: approvedJemaatId },
    include: {
      kategorial: true,
      anggotaKategorialList: true,
    },
  })

  assert(
    jemaatInDb !== null &&
    jemaatInDb.kategorialId === umumCategory.id &&
    jemaatInDb.anggotaKategorialList.some((ak) => ak.kategorialId === umumCategory.id),
    'Approved jemaat is automatically and atomically enrolled into "Umum" Kategorial',
    jemaatInDb
  )

  // --- TEST 3: Anti-Delete Security Attack on "Umum" ---
  console.log('\n--- Test 3: Anti-Delete Security Attack on "Umum" ---')
  const softDeleteAttack = await deleteKategorialAction({
    id: umumCategory.id,
    reason: 'Hacker attempting to delete default category',
  })
  assert(
    softDeleteAttack.success === false &&
    softDeleteAttack.error?.includes('tidak dapat dihapus'),
    'Soft delete attack on "Umum" category is rejected by server',
    softDeleteAttack
  )

  const hardDeleteAttack = await hardDeleteKategorialAction({
    id: umumCategory.id,
  })
  assert(
    hardDeleteAttack.success === false &&
    hardDeleteAttack.error?.includes('tidak dapat dihapus'),
    'Hard delete attack on "Umum" category is rejected by server',
    hardDeleteAttack
  )

  // --- TEST 4: Anti-Rename Security Attack on "Umum" ---
  console.log('\n--- Test 4: Anti-Rename Security Attack on "Umum" ---')
  const renameAttack = await updateKategorialAction({
    id: umumCategory.id,
    nama: 'Hacked Umum Name',
    deskripsi: 'Attempting to change name of system default',
  })
  assert(
    renameAttack.success === false &&
    renameAttack.error?.includes('tidak dapat diubah'),
    'Rename attack on "Umum" category is rejected by server',
    renameAttack
  )

  // Verify category name remained intact
  const verifiedUmum = await prisma.kategorial.findUnique({
    where: { id: umumCategory.id },
  })
  assert(
    verifiedUmum?.nama === 'Umum' && verifiedUmum?.isDefault === true,
    'Umum category name and isDefault flag remained 100% intact',
    verifiedUmum
  )

  // --- TEST 5: Anti-Duplicate "Umum" Creation ---
  console.log('\n--- Test 5: Anti-Duplicate "Umum" Creation ---')
  const createDuplicateAttack = await createKategorialAction({
    nama: 'umum',
    deskripsi: 'Attempting to create another Umum category',
  })
  assert(
    createDuplicateAttack.success === false &&
    createDuplicateAttack.error?.includes('dicadangkan sebagai Kategori Default Sistem'),
    'Creating duplicate "Umum" category is rejected by server',
    createDuplicateAttack
  )

  // --- TEST 6: Custom Category Lifecycle & Fallback to "Umum" ---
  console.log('\n--- Test 6: Custom Category Lifecycle & Fallback to "Umum" ---')
  const customCatName = `Komunitas Musik ${Date.now()}`
  const createCustomRes = await createKategorialAction({
    nama: customCatName,
    deskripsi: 'Kategori kustom untuk musisi dan singer',
  })
  assert(createCustomRes.success === true, 'Custom category created successfully', createCustomRes)

  const customCatId = (createCustomRes as any).data.id

  // Move jemaat to custom category
  await prisma.jemaat.update({
    where: { id: approvedJemaatId },
    data: { kategorialId: customCatId },
  })
  await prisma.anggotaKategorial.create({
    data: {
      kategorialId: customCatId,
      jemaatId: approvedJemaatId,
      catatan: 'Pindah ke komunitas musik',
    },
  })

  // Delete custom category
  const deleteCustomRes = await deleteKategorialAction({
    id: customCatId,
    reason: 'Komunitas musik dibubarkan',
  })
  assert(deleteCustomRes.success === true, 'Custom category can be soft-deleted by admin', deleteCustomRes)

  // Verify jemaat is safely fallen back to "Umum"
  const jemaatAfterFallback = await prisma.jemaat.findUnique({
    where: { id: approvedJemaatId },
  })
  assert(
    jemaatAfterFallback?.kategorialId === umumCategory.id,
    'Jemaat whose custom category was deleted is safely redirected back to "Umum"',
    jemaatAfterFallback
  )

  // --- CLEANUP TEST DATA ---
  console.log('\n--- Cleaning up test artifacts ---')
  await prisma.anggotaKategorial.deleteMany({
    where: { jemaatId: approvedJemaatId },
  })
  await prisma.jemaat.delete({
    where: { id: approvedJemaatId },
  })
  await prisma.pendaftaranJemaat.delete({
    where: { id: regId },
  })
  await prisma.kategorial.delete({
    where: { id: customCatId },
  })

  console.log('\n====================================================')
  console.log(`  FINAL QA & SECURITY REPORT: ${passedTests} / ${totalTests} TESTS PASSED  `)
  console.log('====================================================\n')

  if (passedTests === totalTests) {
    console.log('🎉 ALL QA & SECURITY AUDITS PASSED WITH ZERO VULNERABILITIES!')
    process.exit(0)
  } else {
    console.error('⚠️ SOME TESTS FAILED. PLEASE REVIEW.')
    process.exit(1)
  }
}

runQASecurityTests()
  .catch((err) => {
    console.error('Test execution error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
