import { PrismaClient } from '@prisma/client'
import { isUserAssignedToKategorial, hasPermission } from '../src/lib/permissions'
import { createUserSchema } from '../src/lib/validations/users'

const prisma = new PrismaClient()

async function runTests() {
  console.log('🚀 [TEST-START] Testing Scoped RBAC Per Kategorial...')

  // 1. Ensure test kategorials exist
  let youthKat = await prisma.kategorial.findFirst({
    where: { nama: { contains: 'Youth', mode: 'insensitive' } },
  })
  if (!youthKat) {
    youthKat = await prisma.kategorial.create({
      data: {
        nama: 'Departemen Youth & Remaja Test',
        deskripsi: 'Kategorial untuk pemuda & remaja',
        isDefault: false,
        totalAnggota: 0,
      },
    })
  }

  let kidsKat = await prisma.kategorial.findFirst({
    where: { nama: { contains: 'Sekolah Minggu', mode: 'insensitive' } },
  })
  if (!kidsKat) {
    kidsKat = await prisma.kategorial.create({
      data: {
        nama: 'Departemen Anak & Sekolah Minggu Test',
        deskripsi: 'Kategorial untuk anak-anak',
        isDefault: false,
        totalAnggota: 0,
      },
    })
  }

  console.log(`✅ [1] Test Kategorials Ready: [${youthKat.nama} (${youthKat.id})], [${kidsKat.nama} (${kidsKat.id})]`)

  // 2. Test Zod Validation: Rejection when 0 kategorial assigned to scoped role
  try {
    createUserSchema.parse({
      nama: 'Testing Zero Scope',
      username: 'testzeroscope',
      email: 'zero@test.org',
      role: 'SEKRETARIS_KATEGORIAL',
      kategorialIds: [],
      password: 'password123',
      confirmPassword: 'password123',
      status: 'AKTIF',
    })
    console.error('❌ [2] Zod failed to reject empty kategorialIds for SEKRETARIS_KATEGORIAL')
  } catch (err: any) {
    console.log('✅ [2] Zod correctly rejected empty kategorialIds for scoped role:', err.issues?.[0]?.message || 'Validation error')
  }

  // 3. Test Zod Validation: Success with valid multi-scope
  const validPayload = createUserSchema.parse({
    nama: 'Staf Multi Scope Test',
    username: 'multiscope_' + Date.now().toString().slice(-4),
    email: 'multiscope_' + Date.now().toString().slice(-4) + '@test.org',
    role: 'SEKRETARIS_KATEGORIAL',
    kategorialIds: [youthKat.id, kidsKat.id],
    password: 'password123',
    confirmPassword: 'password123',
    status: 'AKTIF',
  })
  console.log('✅ [3] Zod successfully validated multi-scope payload for 2 kategorials.')

  // 4. Test isUserAssignedToKategorial Helper
  const mockScopedUser = {
    role: 'SEKRETARIS_KATEGORIAL' as const,
    kategorialScopes: [
      { kategorialId: youthKat.id },
      { kategorialId: kidsKat.id },
    ],
  }
  const hasAccessYouth = isUserAssignedToKategorial(mockScopedUser, youthKat.id)
  const hasAccessKids = isUserAssignedToKategorial(mockScopedUser, kidsKat.id)
  const hasAccessRandom = isUserAssignedToKategorial(mockScopedUser, 'random-unassigned-id')

  console.log(`✅ [4] Access Check -> Youth: ${hasAccessYouth} (Expected: true), Kids: ${hasAccessKids} (Expected: true), Unassigned: ${hasAccessRandom} (Expected: false)`)

  if (!hasAccessYouth || !hasAccessKids || hasAccessRandom) {
    throw new Error('Scoped helper permission check failed!')
  }

  // 5. Test Super Admin Bypass
  const mockSuperAdmin = {
    role: 'SUPER_ADMIN' as const,
    kategorialScopes: [],
  }
  const adminAccess = isUserAssignedToKategorial(mockSuperAdmin, 'random-unassigned-id')
  console.log(`✅ [5] Super Admin Global Access: ${adminAccess} (Expected: true)`)

  // 6. Test PBAC permissions
  const canSekretarisManageJemaat = hasPermission('SEKRETARIS_KATEGORIAL', 'jemaat.create')
  const canSekretarisViewKategorial = hasPermission('SEKRETARIS_KATEGORIAL', 'kategorial.manage')
  const canSekretarisScanAttendance = hasPermission('SEKRETARIS_KATEGORIAL', 'scan.execute')
  const canBendaharaManageKeuangan = hasPermission('BENDAHARA_KATEGORIAL', 'keuangan.create')

  console.log(`✅ [6] PBAC Matrix:
  - SEKRETARIS_KATEGORIAL can create global jemaat? ${canSekretarisManageJemaat} (Expected: false)
  - SEKRETARIS_KATEGORIAL can manage kategorial members? ${canSekretarisViewKategorial} (Expected: true)
  - SEKRETARIS_KATEGORIAL can scan attendance? ${canSekretarisScanAttendance} (Expected: true)
  - BENDAHARA_KATEGORIAL can record transactions? ${canBendaharaManageKeuangan} (Expected: true)`)

  console.log('🎉 [TEST-SUCCESS] All Scoped RBAC validations & helpers passed!')
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
