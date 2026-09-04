import { z } from 'zod'

export const RoleEnum = z.enum([
  'SUPER_ADMIN',
  'GEMBALA',
  'SEKRETARIS',
  'BENDAHARA',
  'SEKRETARIS_KATEGORIAL',
  'BENDAHARA_KATEGORIAL',
  'USHER',
])
export type RoleEnumType = z.infer<typeof RoleEnum>

export const StatusUserEnum = z.enum(['AKTIF', 'NONAKTIF', 'SUSPENDED'])
export type StatusUserEnumType = z.infer<typeof StatusUserEnum>

export const createUserSchema = z
  .object({
    nama: z
      .string()
      .min(2, 'Nama lengkap minimal 2 karakter')
      .max(100, 'Nama lengkap maksimal 100 karakter'),
    username: z
      .string()
      .min(3, 'Username minimal 3 karakter')
      .max(50, 'Username maksimal 50 karakter')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh mengandung huruf, angka, titik, underscore, dan strip'),
    email: z
      .string()
      .email('Format email tidak valid'),
    noHp: z.string().optional().nullable(),
    role: RoleEnum,
    kategorialIds: z.array(z.string()).optional().default([]),
    password: z
      .string()
      .min(6, 'Kata sandi minimal 6 karakter'),
    confirmPassword: z
      .string()
      .min(6, 'Konfirmasi kata sandi minimal 6 karakter'),
    status: z.enum(['AKTIF', 'NONAKTIF']).default('AKTIF'),
    fotoUrl: z.string().optional().nullable(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.role === 'SEKRETARIS_KATEGORIAL' || data.role === 'BENDAHARA_KATEGORIAL') {
        return data.kategorialIds && data.kategorialIds.length > 0
      }
      return true
    },
    {
      message: 'Pilih minimal satu kategorial untuk peran kategorial ini',
      path: ['kategorialIds'],
    }
  )

export type CreateUserInput = z.input<typeof createUserSchema>

export const updateUserSchema = z
  .object({
    id: z.string().uuid('ID User tidak valid'),
    nama: z
      .string()
      .min(2, 'Nama lengkap minimal 2 karakter')
      .max(100, 'Nama lengkap maksimal 100 karakter'),
    email: z
      .string()
      .email('Format email tidak valid'),
    noHp: z.string().optional().nullable(),
    role: RoleEnum,
    kategorialIds: z.array(z.string()).optional().default([]),
    fotoUrl: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.role === 'SEKRETARIS_KATEGORIAL' || data.role === 'BENDAHARA_KATEGORIAL') {
        return data.kategorialIds && data.kategorialIds.length > 0
      }
      return true
    },
    {
      message: 'Pilih minimal satu kategorial untuk peran kategorial ini',
      path: ['kategorialIds'],
    }
  )

export type UpdateUserInput = z.input<typeof updateUserSchema>

export const resetUserPasswordSchema = z
  .object({
    userId: z.string().uuid('ID User tidak valid'),
    newPassword: z
      .string()
      .min(6, 'Kata sandi baru minimal 6 karakter'),
    confirmPassword: z
      .string()
      .min(6, 'Konfirmasi kata sandi minimal 6 karakter'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru',
    path: ['confirmPassword'],
  })

export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>

export const toggleUserStatusSchema = z.object({
  id: z.string().uuid('ID User tidak valid'),
  status: StatusUserEnum,
})

export type ToggleUserStatusInput = z.infer<typeof toggleUserStatusSchema>

export const deleteUserSchema = z.object({
  id: z.string().uuid('ID User tidak valid'),
  reason: z
    .string()
    .min(3, 'Alasan penghapusan minimal 3 karakter'),
})
export type DeleteUserInput = z.infer<typeof deleteUserSchema>

export const StatusHapusEnum = z.enum(['ACTIVE', 'DELETED', 'ALL'])
export type StatusHapusEnumType = z.infer<typeof StatusHapusEnum>

export const restoreUserSchema = z.object({
  id: z.string().uuid('ID User tidak valid'),
})
export type RestoreUserInput = z.infer<typeof restoreUserSchema>

export const hardDeleteUserSchema = z.object({
  id: z.string().uuid('ID User tidak valid'),
  reason: z.string().optional(),
})
export type HardDeleteUserInput = z.infer<typeof hardDeleteUserSchema>

export const userFilterSchema = z.object({
  search: z.string().optional().default(''),
  role: z.string().optional(),
  status: z.string().optional(),
  statusHapus: StatusHapusEnum.default('ACTIVE').optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(10),
})

export type UserFilterParams = z.infer<typeof userFilterSchema>
