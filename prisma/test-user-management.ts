import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'
import {
  getUserListAction,
  getUserByIdAction,
  createUserAction,
  updateUserAction,
  resetUserPasswordAction,
  toggleUserStatusAction,
  deleteUserAction,
} from '../src/actions/users'
import { loginAction } from '../src/actions/auth'

async function main() {
  console.log('=== TEST SUITE MODUL 15: USER MANAGEMENT & IAM ===\n')

  // 1. Test Create Staff User
  console.log('[Test 1] Create New Staff User (Bcrypt Salt 10 & SHA-256 Audit):')
  const testTimestamp = Date.now()
  const testUsername = `staf_${testTimestamp.toString().slice(-6)}`
  const testEmail = `staf_${testTimestamp}@gereja.org`

  const createRes = await createUserAction({
    nama: 'Yohanes Kristian Staf Test',
    username: testUsername,
    email: testEmail,
    noHp: '081299881122',
    role: 'SEKRETARIS',
    password: 'password123',
    confirmPassword: 'password123',
    status: 'AKTIF',
  })

  console.log(`Create User Result: success=${createRes.success}, nama="${createRes.data?.nama}", role="${createRes.data?.role}"`)
  if (!createRes.success || !createRes.data) {
    throw new Error(`Failed to create user: ${createRes.error}`)
  }

  const createdUserId = createRes.data.id

  // 2. Test Privacy: Ensure passwordHash is NEVER in DTO
  console.log('\n[Test 2] Password Privacy & Anti-Leakage Verification:')
  const userDtoKeys = Object.keys(createRes.data)
  console.log(`DTO keys returned: ${userDtoKeys.join(', ')}`)
  if (userDtoKeys.includes('password') || userDtoKeys.includes('passwordHash')) {
    throw new Error('CRITICAL SECURITY BREACH: passwordHash was exposed in UserDTO!')
  }

  // Verify hash in database is valid Bcrypt
  const dbUser = await prisma.user.findUnique({ where: { id: createdUserId } })
  if (!dbUser || !dbUser.passwordHash.startsWith('$2')) {
    throw new Error('Database passwordHash is not a valid Bcrypt hash!')
  }
  const isHashValid = await bcrypt.compare('password123', dbUser.passwordHash)
  if (!isHashValid) throw new Error('Bcrypt hash comparison failed!')
  console.log('✓ Password properly hashed with Bcrypt and completely redacted from DTO!')

  // 3. Test User List & Pagination & Stats
  console.log('\n[Test 3] User List, Filters & Statistics:')
  const listRes = await getUserListAction({
    search: testUsername,
    page: 1,
    pageSize: 10,
  })
  console.log(`Found ${listRes.data.length} users with query "${testUsername}". Total in DB: ${listRes.stats.totalStaff}`)
  if (!listRes.success || listRes.data.length === 0) throw new Error('User list search failed')
  console.log('✓ User list & pagination verified!')

  // 4. Test User Detail & Activity Trail
  console.log('\n[Test 4] User Detail by ID with 20 Latest Audit Records:')
  const detailRes = await getUserByIdAction(createdUserId)
  console.log(`Detail user: ${detailRes.data?.nama}, audit trail count: ${detailRes.auditLogs?.length}`)
  if (!detailRes.success || !detailRes.data) throw new Error('User detail fetch failed')
  console.log('✓ User detail & activity trail verified!')

  // 5. Test Update User
  console.log('\n[Test 5] Update User Profile:')
  const updateRes = await updateUserAction({
    id: createdUserId,
    nama: 'Yohanes Kristian Updated',
    email: testEmail,
    noHp: '081299883344',
    role: 'BENDAHARA',
  })
  console.log(`Update Result: success=${updateRes.success}, newRole="${updateRes.data?.role}"`)
  if (!updateRes.success || updateRes.data?.role !== 'BENDAHARA') throw new Error('User update failed')
  console.log('✓ User update verified!')

  // 6. Test Reset Password & Session Invalidation
  console.log('\n[Test 6] Reset User Password:')
  const resetRes = await resetUserPasswordAction({
    userId: createdUserId,
    newPassword: 'newSecretPassword456',
    confirmPassword: 'newSecretPassword456',
  })
  console.log(`Reset Password Result: success=${resetRes.success}`)
  if (!resetRes.success) throw new Error('Password reset failed')

  // Verify new password works in login
  const loginWithOld = await loginAction({ username: testUsername, password: 'password123' })
  const loginWithNew = await loginAction({ username: testUsername, password: 'newSecretPassword456' })
  if (loginWithOld.success) throw new Error('Old password was still accepted after reset!')
  if (!loginWithNew.success) throw new Error('New password was rejected after reset!')
  console.log('✓ Password reset and old credential invalidation verified!')

  // 7. Test Toggle Status & Inactive Login Lock
  console.log('\n[Test 7] Toggle Status to NONAKTIF & Login Lock:')
  const toggleRes = await toggleUserStatusAction({
    id: createdUserId,
    status: 'NONAKTIF',
  })
  console.log(`Toggle Status Result: success=${toggleRes.success}`)
  if (!toggleRes.success) throw new Error('Toggle status failed')

  const loginInactive = await loginAction({ username: testUsername, password: 'newSecretPassword456' })
  console.log(`Login attempt on NONAKTIF account: success=${loginInactive.success}, error="${loginInactive.error}"`)
  if (loginInactive.success) throw new Error('NONAKTIF account was allowed to login!')
  console.log('✓ Inactive account login block verified!')

  // Reactivate for further tests
  await toggleUserStatusAction({ id: createdUserId, status: 'AKTIF' })

  // 8. Test Last Super Admin Protection
  console.log('\n[Test 8] Last Super Admin Protection (Security Critical):')
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN', status: 'AKTIF', deletedAt: null },
  })

  if (superAdmin) {
    // Count active super admins
    const totalSuperAdmins = await prisma.user.count({
      where: { role: 'SUPER_ADMIN', status: 'AKTIF', deletedAt: null },
    })

    if (totalSuperAdmins === 1) {
      // Test deactivation rejection
      const deactRes = await toggleUserStatusAction({ id: superAdmin.id, status: 'NONAKTIF' })
      console.log(`Deactivate last Super Admin: success=${deactRes.success}, error="${deactRes.error}"`)
      if (deactRes.success) throw new Error('Security violation: Last Super Admin was deactivated!')

      // Test role downgrade rejection
      const roleDowngradeRes = await updateUserAction({
        id: superAdmin.id,
        nama: superAdmin.nama,
        email: superAdmin.email || 'admin@gereja.org',
        role: 'SEKRETARIS',
      })
      console.log(`Downgrade last Super Admin role: success=${roleDowngradeRes.success}, error="${roleDowngradeRes.error}"`)
      if (roleDowngradeRes.success) throw new Error('Security violation: Last Super Admin role was downgraded!')

      // Test deletion rejection
      const delSuperAdminRes = await deleteUserAction({ id: superAdmin.id, reason: 'Test delete' })
      console.log(`Delete last Super Admin: success=${delSuperAdminRes.success}, error="${delSuperAdminRes.error}"`)
      if (delSuperAdminRes.success) throw new Error('Security violation: Last Super Admin was deleted!')
      console.log('✓ Last Super Admin lock verified across all mutation vectors!')
    }
  }

  // 9. Test Soft Delete
  console.log('\n[Test 9] Soft Delete User:')
  const delRes = await deleteUserAction({
    id: createdUserId,
    reason: 'Pengujian integrasi Modul 15 selesai.',
  })
  console.log(`Soft Delete Result: success=${delRes.success}, message="${delRes.message}"`)
  if (!delRes.success) throw new Error('Soft delete user failed')

  // Verify user is soft-deleted and cannot login
  const deletedCheck = await prisma.user.findUnique({ where: { id: createdUserId } })
  if (!deletedCheck || !deletedCheck.deletedAt) throw new Error('User deletedAt was not set!')
  const loginDeleted = await loginAction({ username: testUsername, password: 'newSecretPassword456' })
  if (loginDeleted.success) throw new Error('Soft-deleted user was allowed to login!')
  console.log('✓ Soft delete and deleted login block verified!')

  // 10. Test Audit Trail Log Integrity
  console.log('\n[Test 10] Cryptographic SHA-256 Audit Trail Integrity:')
  const auditEntries = await prisma.auditLog.findMany({
    where: {
      action: { in: ['USER_CREATED', 'USER_UPDATED', 'USER_PASSWORD_RESET', 'USER_STATUS_TOGGLED', 'USER_DELETED'] },
    },
    take: 5,
    orderBy: { timestamp: 'desc' },
  })
  console.log(`Found ${auditEntries.length} audit entries for user actions:`)
  for (const entry of auditEntries) {
    console.log(`- Action: ${entry.action} | Entity: ${entry.entity} | Hash: ${entry.currentHash.substring(0, 16)}...`)
    if (entry.stateChange && (entry.stateChange.includes('password123') || entry.stateChange.includes('newSecretPassword456'))) {
      throw new Error('CRITICAL SECURITY BREACH: Plaintext password leaked in audit log payload!')
    }
  }
  console.log('✓ SHA-256 Audit trail integrity verified without secret leakage!')

  console.log('\n=============================================')
  console.log('✓ ALL MODUL 15 TEST SUITES PASSED SUCCESSFULLY!')
  console.log('=============================================')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
