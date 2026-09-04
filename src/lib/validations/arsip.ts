import { z } from 'zod'

export const jenisArsipEnum = z.enum([
  'LEGALITAS',
  'NOTULEN',
  'SURAT_MASUK',
  'SURAT_KELUAR',
  'KONTRAK',
  'KEUANGAN_ARCHIVE',
])

export const statusArsipEnum = z.enum(['AKTIF', 'INAKTIF', 'PERMANEN'])

export const uploadArsipGerejaSchema = z.object({
  judul: z
    .string()
    .min(2, { message: 'Judul arsip dokumen minimal 2 karakter.' })
    .max(200, { message: 'Judul arsip dokumen maksimal 200 karakter.' })
    .transform((val) => val.trim()),
  jenisArsip: jenisArsipEnum,
  kategorialId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val !== 'all' && val !== 'none' ? val : null)),
  tanggalDokumen: z.coerce.date({ message: 'Tanggal dokumen arsip wajib diisi.' }),
  status: statusArsipEnum.default('AKTIF'),
  deskripsi: z
    .string()
    .max(1000)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
})

export const updateArsipGerejaSchema = z.object({
  id: z.string().uuid({ message: 'ID Arsip harus valid UUID.' }),
  judul: z
    .string()
    .min(2)
    .max(200)
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
  jenisArsip: jenisArsipEnum.optional(),
  kategorialId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val !== 'all' && val !== 'none' ? val : null)),
  tanggalDokumen: z.coerce.date().optional(),
  status: statusArsipEnum.optional(),
  deskripsi: z.string().max(1000).optional().nullable(),
})

export const deleteArsipGerejaSchema = z.object({
  id: z.string().uuid({ message: 'ID Arsip harus valid UUID.' }),
  reason: z
    .string()
    .min(1, { message: 'Alasan penghapusan arsip wajib diisi.' })
    .max(300)
    .transform((val) => val.trim()),
})

export const restoreArsipGerejaSchema = z.object({
  id: z.string().uuid({ message: 'ID Arsip harus valid UUID.' }),
})

export const hardDeleteArsipGerejaSchema = z.object({
  id: z.string().uuid({ message: 'ID Arsip harus valid UUID.' }),
  reason: z.string().optional(),
})

export const arsipFilterSchema = z.object({
  search: z.string().optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  jenisArsip: jenisArsipEnum.optional(),
  kategorialId: z.string().optional(),
  status: statusArsipEnum.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export type UploadArsipGerejaInput = z.input<typeof uploadArsipGerejaSchema>
export type UpdateArsipGerejaInput = z.input<typeof updateArsipGerejaSchema>
export type DeleteArsipGerejaInput = z.input<typeof deleteArsipGerejaSchema>
export type RestoreArsipGerejaInput = z.input<typeof restoreArsipGerejaSchema>
export type HardDeleteArsipGerejaInput = z.input<typeof hardDeleteArsipGerejaSchema>
export type ArsipFilterParams = z.input<typeof arsipFilterSchema>

export type JenisArsip = z.infer<typeof jenisArsipEnum>
export type StatusArsip = z.infer<typeof statusArsipEnum>
