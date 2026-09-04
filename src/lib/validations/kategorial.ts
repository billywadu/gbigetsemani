import { z } from 'zod'

export const createKategorialSchema = z.object({
  nama: z
    .string()
    .min(2, { message: 'Nama Kategorial minimal 2 karakter.' })
    .transform((val) => val.trim()),
  deskripsi: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
})

export const updateKategorialSchema = createKategorialSchema.extend({
  id: z.string().uuid({ message: 'ID Kategorial harus UUID.' }),
})

export const addAnggotaKategorialSchema = z.object({
  kategorialId: z.string().uuid({ message: 'ID Kategorial harus UUID.' }),
  jemaatId: z.string().uuid({ message: 'ID Jemaat harus UUID.' }),
  catatan: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
})

export const removeAnggotaKategorialSchema = z.object({
  anggotaId: z.string().uuid({ message: 'ID Anggota Kategorial harus UUID.' }),
})

export const updateAnggotaKategorialSchema = z.object({
  anggotaId: z.string().uuid({ message: 'ID Anggota Kategorial harus UUID.' }),
  catatan: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
})

export const deleteKategorialSchema = z.object({
  id: z.string().uuid({ message: 'ID Kategorial harus UUID.' }),
  reason: z.string().min(3, { message: 'Alasan penghapusan kategorial wajib diisi (minimal 3 karakter).' }),
})

export const restoreKategorialSchema = z.object({
  id: z.string().uuid({ message: 'ID Kategorial harus UUID.' }),
})

export const hardDeleteKategorialSchema = z.object({
  id: z.string().uuid({ message: 'ID Kategorial harus UUID.' }),
  reason: z.string().optional(),
})

export const kategorialFilterSchema = z.object({
  search: z.string().optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export type CreateKategorialInput = z.infer<typeof createKategorialSchema>
export type UpdateKategorialInput = z.infer<typeof updateKategorialSchema>
export type AddAnggotaKategorialInput = z.infer<typeof addAnggotaKategorialSchema>
export type RemoveAnggotaKategorialInput = z.infer<typeof removeAnggotaKategorialSchema>
export type UpdateAnggotaKategorialInput = z.infer<typeof updateAnggotaKategorialSchema>
export type DeleteKategorialInput = z.infer<typeof deleteKategorialSchema>
export type RestoreKategorialInput = z.infer<typeof restoreKategorialSchema>
export type HardDeleteKategorialInput = z.infer<typeof hardDeleteKategorialSchema>
export type KategorialFilterParams = z.infer<typeof kategorialFilterSchema>
