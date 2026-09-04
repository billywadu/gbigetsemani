import { z } from 'zod'

export const RelasiKeluargaEnum = z.enum([
  'SUAMI',
  'ISTRI',
  'ANAK',
  'ORANG_TUA',
  'MERTUA',
  'CUCU',
  'LAINNYA',
])

export const createKeluargaSchema = z.object({
  namaKeluarga: z.string().min(2, { message: 'Nama Keluarga minimal 2 karakter.' }),
  kepalaId: z.string().uuid({ message: 'ID Kepala Keluarga harus UUID.' }).optional().or(z.literal('')).nullable(),
  noHp: z.string().optional().nullable(),
  alamat: z.string().optional().nullable(),
})

export const updateKeluargaSchema = createKeluargaSchema.partial().extend({
  id: z.string().uuid({ message: 'ID Keluarga harus UUID.' }),
})

export const addAnggotaKeluargaSchema = z.object({
  keluargaId: z.string().uuid({ message: 'ID Keluarga harus UUID.' }),
  jemaatId: z.string().uuid({ message: 'ID Jemaat harus UUID.' }),
  relasi: RelasiKeluargaEnum,
  catatanRelasi: z.string().optional().nullable(),
})

export const updateRelasiAnggotaSchema = z.object({
  anggotaId: z.string().uuid({ message: 'ID Anggota Keluarga harus UUID.' }),
  relasi: RelasiKeluargaEnum,
  catatanRelasi: z.string().optional().nullable(),
})

export const removeAnggotaKeluargaSchema = z.object({
  anggotaId: z.string().uuid({ message: 'ID Anggota Keluarga harus UUID.' }),
})

export const deleteKeluargaSchema = z.object({
  id: z.string().uuid({ message: 'ID Keluarga harus UUID.' }),
  reason: z.string().min(3, { message: 'Alasan penghapusan wajib diisi (minimal 3 karakter).' }),
})

export const restoreKeluargaSchema = z.object({
  id: z.string().uuid({ message: 'ID Keluarga harus UUID.' }),
})

export const hardDeleteKeluargaSchema = z.object({
  id: z.string().uuid({ message: 'ID Keluarga harus UUID.' }),
  reason: z.string().optional(),
})

export const promoteKepalaKeluargaSchema = z.object({
  keluargaId: z.string().uuid({ message: 'ID Keluarga harus UUID.' }),
  anggotaId: z.string().uuid({ message: 'ID Anggota Keluarga harus UUID.' }),
  relasiKepalaLama: RelasiKeluargaEnum.optional(),
})

export const keluargaFilterSchema = z.object({
  search: z.string().optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export type CreateKeluargaInput = z.infer<typeof createKeluargaSchema>
export type UpdateKeluargaInput = z.infer<typeof updateKeluargaSchema>
export type AddAnggotaKeluargaInput = z.infer<typeof addAnggotaKeluargaSchema>
export type UpdateRelasiAnggotaInput = z.infer<typeof updateRelasiAnggotaSchema>
export type RemoveAnggotaKeluargaInput = z.infer<typeof removeAnggotaKeluargaSchema>
export type DeleteKeluargaInput = z.infer<typeof deleteKeluargaSchema>
export type RestoreKeluargaInput = z.infer<typeof restoreKeluargaSchema>
export type HardDeleteKeluargaInput = z.infer<typeof hardDeleteKeluargaSchema>
export type PromoteKepalaKeluargaInput = z.infer<typeof promoteKepalaKeluargaSchema>
export type KeluargaFilterParams = z.infer<typeof keluargaFilterSchema>

