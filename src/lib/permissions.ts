import { Role } from '@/config/navigation'

export type Permission =
  | 'jemaat.read'
  | 'jemaat.create'
  | 'jemaat.update'
  | 'jemaat.delete'
  | 'keluarga.manage'
  | 'kategorial.manage'
  | 'pelayan.read'
  | 'pelayan.manage'
  | 'pelayan.create'
  | 'pelayan.update'
  | 'pelayan.delete'
  | 'pelayan.category.read'
  | 'pelayan.category.create'
  | 'pelayan.category.update'
  | 'pelayan.category.delete'
  | 'komsel.read'
  | 'komsel.manage'
  | 'komsel.create'
  | 'komsel.update'
  | 'komsel.delete'
  | 'tamu.read'
  | 'tamu.manage'
  | 'tamu.create'
  | 'tamu.update'
  | 'tamu.convert'
  | 'pendaftaran.review'
  | 'event.manage'
  | 'scan.execute'
  | 'keuangan.read'
  | 'keuangan.create'
  | 'keuangan.close'
  | 'keuangan.reopen'
  | 'keuangan.delete'
  | 'keuangan.manage'
  | 'document.read'
  | 'document.upload'
  | 'document.update'
  | 'document.verify'
  | 'document.delete'
  | 'archive.read'
  | 'artikel.read'
  | 'artikel.create'
  | 'artikel.update'
  | 'artikel.delete'
  | 'artikel.manage'
  | 'kategori_artikel.read'
  | 'kategori_artikel.create'
  | 'kategori_artikel.update'
  | 'kategori_artikel.delete'
  | 'materi.read'
  | 'materi.create'
  | 'materi.update'
  | 'materi.delete'
  | 'materi.manage'
  | 'kategori_materi.read'
  | 'kategori_materi.create'
  | 'kategori_materi.update'
  | 'kategori_materi.delete'
  | 'audit.read'
  | 'user.read'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.manage'

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'jemaat.read',
    'jemaat.create',
    'jemaat.update',
    'jemaat.delete',
    'keluarga.manage',
    'kategorial.manage',
    'pelayan.read',
    'pelayan.manage',
    'pelayan.create',
    'pelayan.update',
    'pelayan.delete',
    'pelayan.category.read',
    'pelayan.category.create',
    'pelayan.category.update',
    'pelayan.category.delete',
    'komsel.read',
    'komsel.manage',
    'komsel.create',
    'komsel.update',
    'komsel.delete',
    'tamu.read',
    'tamu.manage',
    'tamu.create',
    'tamu.update',
    'tamu.convert',
    'pendaftaran.review',
    'event.manage',
    'scan.execute',
    'keuangan.read',
    'keuangan.create',
    'keuangan.close',
    'keuangan.reopen',
    'keuangan.delete',
    'keuangan.manage',
    'document.read',
    'document.upload',
    'document.update',
    'document.verify',
    'document.delete',
    'archive.read',
    'artikel.read',
    'artikel.create',
    'artikel.update',
    'artikel.delete',
    'artikel.manage',
    'kategori_artikel.read',
    'kategori_artikel.create',
    'kategori_artikel.update',
    'kategori_artikel.delete',
    'materi.read',
    'materi.create',
    'materi.update',
    'materi.delete',
    'materi.manage',
    'kategori_materi.read',
    'kategori_materi.create',
    'kategori_materi.update',
    'kategori_materi.delete',
    'audit.read',
    'user.read',
    'user.create',
    'user.update',
    'user.delete',
    'user.manage',
  ],
  GEMBALA: [
    'jemaat.read',
    'jemaat.create',
    'jemaat.update',
    'keluarga.manage',
    'kategorial.manage',
    'pelayan.read',
    'pelayan.manage',
    'pelayan.create',
    'pelayan.update',
    'pelayan.delete',
    'pelayan.category.read',
    'pelayan.category.create',
    'pelayan.category.update',
    'pelayan.category.delete',
    'komsel.read',
    'komsel.manage',
    'komsel.create',
    'komsel.update',
    'komsel.delete',
    'tamu.read',
    'tamu.manage',
    'tamu.create',
    'tamu.update',
    'tamu.convert',
    'pendaftaran.review',
    'event.manage',
    'scan.execute',
    'keuangan.read',
    'keuangan.create',
    'keuangan.reopen',
    'document.read',
    'document.upload',
    'document.update',
    'document.verify',
    'document.delete',
    'archive.read',
    'artikel.read',
    'artikel.create',
    'artikel.update',
    'artikel.delete',
    'artikel.manage',
    'kategori_artikel.read',
    'kategori_artikel.create',
    'kategori_artikel.update',
    'kategori_artikel.delete',
    'materi.read',
    'materi.create',
    'materi.update',
    'materi.delete',
    'materi.manage',
    'kategori_materi.read',
    'kategori_materi.create',
    'kategori_materi.update',
    'kategori_materi.delete',
  ],
  SEKRETARIS: [
    'jemaat.read',
    'jemaat.create',
    'jemaat.update',
    'keluarga.manage',
    'kategorial.manage',
    'pelayan.read',
    'pelayan.manage',
    'pelayan.create',
    'pelayan.update',
    'pelayan.category.read',
    'komsel.read',
    'komsel.manage',
    'komsel.create',
    'komsel.update',
    'tamu.read',
    'tamu.manage',
    'tamu.create',
    'tamu.update',
    'tamu.convert',
    'pendaftaran.review',
    'event.manage',
    'scan.execute',
    'document.read',
    'document.upload',
    'document.update',
    'document.verify',
    'document.delete',
    'archive.read',
    'artikel.read',
    'artikel.create',
    'artikel.update',
    'artikel.delete',
    'artikel.manage',
    'kategori_artikel.read',
    'kategori_artikel.create',
    'kategori_artikel.update',
    'kategori_artikel.delete',
    'materi.read',
    'materi.create',
    'materi.update',
    'materi.delete',
    'materi.manage',
    'kategori_materi.read',
    'kategori_materi.create',
    'kategori_materi.update',
    'kategori_materi.delete',
  ],
  BENDAHARA: [
    'keuangan.read',
    'keuangan.create',
    'keuangan.close',
    'keuangan.reopen',
    'keuangan.delete',
    'keuangan.manage',
    'document.read',
  ],
  SEKRETARIS_KATEGORIAL: [
    'kategorial.manage',
    'event.manage',
    'scan.execute',
    'jemaat.read',
  ],
  BENDAHARA_KATEGORIAL: [
    'keuangan.read',
    'keuangan.create',
    'keuangan.manage',
  ],
  USHER: [
    'scan.execute',
  ],
  PUBLIC: [],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === 'SUPER_ADMIN') return true
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function isRoleAllowed(userRole: Role, allowedRoles?: Role[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true
  if (userRole === 'SUPER_ADMIN') return true
  return allowedRoles.includes(userRole)
}

export function enforcePermission(role: Role, permission: Permission): boolean {
  if (!hasPermission(role, permission)) {
    throw new Error(`Akses ditolak: Anda tidak memiliki izin '${permission}'.`)
  }
  return true
}

export function isUserAssignedToKategorial(
  user: { role: Role; kategorialScopes?: { kategorialId?: string; id?: string }[] },
  targetKategorialId: string
): boolean {
  if (user.role === 'SUPER_ADMIN' || user.role === 'GEMBALA' || user.role === 'SEKRETARIS' || user.role === 'BENDAHARA') {
    return true
  }
  if (!targetKategorialId) return false
  return user.kategorialScopes?.some((s) => (s.kategorialId || s.id) === targetKategorialId) ?? false
}

