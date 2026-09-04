import { z } from 'zod'

export const hariPertemuanEnum = z.enum([
  'SENIN',
  'SELASA',
  'RABU',
  'KAMIS',
  'JUMAT',
  'SABTU',
  'MINGGU',
])

export const createKomselSchema = z.object({
  nama: z
    .string()
    .min(2, { message: 'Nama Komsel minimal 2 karakter.' })
    .max(100)
    .transform((val) => val.trim()),
  wilayah: z
    .string()
    .min(2, { message: 'Wilayah Komsel minimal 2 karakter.' })
    .max(100)
    .transform((val) => val.trim()),
  hari: hariPertemuanEnum,
  jam: z
    .string()
    .min(2, { message: 'Jam pertemuan wajib diisi.' })
    .max(50)
    .transform((val) => val.trim()),
  kategorialId: z
    .string()
    .uuid({ message: 'ID Kategorial harus valid UUID.' })
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  koordinatorId: z
    .string()
    .uuid({ message: 'ID Koordinator harus valid UUID.' })
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
})

export const updateKomselSchema = z.object({
  id: z.string().uuid({ message: 'ID Komsel harus valid UUID.' }),
  nama: z
    .string()
    .min(2, { message: 'Nama Komsel minimal 2 karakter.' })
    .max(100)
    .transform((val) => val.trim()),
  wilayah: z
    .string()
    .min(2, { message: 'Wilayah Komsel minimal 2 karakter.' })
    .max(100)
    .transform((val) => val.trim()),
  hari: hariPertemuanEnum,
  jam: z
    .string()
    .min(2, { message: 'Jam pertemuan wajib diisi.' })
    .max(50)
    .transform((val) => val.trim()),
  kategorialId: z
    .string()
    .uuid({ message: 'ID Kategorial harus valid UUID.' })
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
})

export const setKoordinatorKomselSchema = z.object({
  komselId: z.string().uuid({ message: 'ID Komsel harus valid UUID.' }),
  koordinatorId: z.string().uuid({ message: 'ID Koordinator harus valid UUID.' }),
})

export const addAnggotaKomselSchema = z.object({
  komselId: z.string().uuid({ message: 'ID Komsel harus valid UUID.' }),
  jemaatId: z.string().uuid({ message: 'ID Jemaat harus valid UUID.' }),
})

export const removeAnggotaKomselSchema = z.object({
  anggotaId: z.string().uuid({ message: 'ID Anggota Komsel harus valid UUID.' }),
})

export const deleteKomselSchema = z.object({
  id: z.string().uuid({ message: 'ID Komsel harus valid UUID.' }),
  reason: z.string().min(3, { message: 'Alasan penghapusan komsel wajib diisi (minimal 3 karakter).' }),
})

export const restoreKomselSchema = z.object({
  id: z.string().uuid({ message: 'ID Komsel harus valid UUID.' }),
})

export const hardDeleteKomselSchema = z.object({
  id: z.string().uuid({ message: 'ID Komsel harus valid UUID.' }),
  reason: z.string().optional(),
})

export const komselFilterSchema = z.object({
  search: z.string().optional(),
  kategorialId: z.string().optional(),
  hari: hariPertemuanEnum.optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export type CreateKomselInput = z.infer<typeof createKomselSchema>
export type UpdateKomselInput = z.infer<typeof updateKomselSchema>
export type SetKoordinatorKomselInput = z.infer<typeof setKoordinatorKomselSchema>
export type AddAnggotaKomselInput = z.infer<typeof addAnggotaKomselSchema>
export type RemoveAnggotaKomselInput = z.infer<typeof removeAnggotaKomselSchema>
export type DeleteKomselInput = z.infer<typeof deleteKomselSchema>
export type RestoreKomselInput = z.infer<typeof restoreKomselSchema>
export type HardDeleteKomselInput = z.infer<typeof hardDeleteKomselSchema>
export type KomselFilterParams = z.infer<typeof komselFilterSchema>
export type HariPertemuan = z.infer<typeof hariPertemuanEnum>
