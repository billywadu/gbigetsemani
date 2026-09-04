import { z } from 'zod'

export const statusArtikelEnum = z.enum(['DRAFT', 'PUBLISHED'])

export const createArtikelSchema = z.object({
  judul: z
    .string()
    .min(3, { message: 'Judul artikel minimal 3 karakter.' })
    .max(200, { message: 'Judul artikel maksimal 200 karakter.' })
    .transform((val) => val.trim()),
  kategoriId: z.string().uuid({ message: 'Kategori artikel wajib dipilih.' }),
  penulis: z
    .string()
    .min(2, { message: 'Nama penulis / narasumber minimal 2 karakter.' })
    .max(100, { message: 'Nama penulis maksimal 100 karakter.' })
    .transform((val) => val.trim()),
  tanggal: z.coerce.date({ message: 'Tanggal publikasi wajib diisi.' }),
  status: statusArtikelEnum.default('DRAFT'),
  ringkasan: z
    .string()
    .min(5, { message: 'Ringkasan artikel minimal 5 karakter.' })
    .max(1000, { message: 'Ringkasan artikel maksimal 1000 karakter.' })
    .transform((val) => val.trim()),
  konten: z
    .string()
    .min(10, { message: 'Isi konten artikel minimal 10 karakter.' })
    .transform((val) => val.trim()),
  thumbnailUrl: z.string().url().optional().nullable(),
  cloudinaryPublicId: z.string().optional().nullable(),
})

export const updateArtikelSchema = z.object({
  id: z.string().uuid({ message: 'ID Artikel harus valid UUID.' }),
  judul: z
    .string()
    .min(3)
    .max(200)
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
  kategoriId: z.string().uuid().optional(),
  penulis: z
    .string()
    .min(2)
    .max(100)
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
  tanggal: z.coerce.date().optional(),
  status: statusArtikelEnum.optional(),
  ringkasan: z
    .string()
    .min(5)
    .max(1000)
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
  konten: z
    .string()
    .min(10)
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
  thumbnailUrl: z.string().url().optional().nullable(),
  cloudinaryPublicId: z.string().optional().nullable(),
})

export const deleteArtikelSchema = z.object({
  id: z.string().uuid({ message: 'ID Artikel harus valid UUID.' }),
  reason: z
    .string()
    .min(1, { message: 'Alasan penghapusan minimal 1 karakter.' })
    .max(300)
    .transform((val) => val.trim()),
})

export const restoreArtikelSchema = z.object({
  id: z.string().uuid({ message: 'ID Artikel harus valid UUID.' }),
})

export const hardDeleteArtikelSchema = z.object({
  id: z.string().uuid({ message: 'ID Artikel harus valid UUID.' }),
  reason: z.string().optional(),
})

export const artikelFilterSchema = z.object({
  search: z.string().optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  kategoriId: z.string().optional(),
  status: statusArtikelEnum.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export const createKategoriArtikelSchema = z.object({
  nama: z
    .string()
    .min(2, { message: 'Nama kategori artikel minimal 2 karakter.' })
    .max(100, { message: 'Nama kategori maksimal 100 karakter.' })
    .transform((val) => val.trim()),
})

export const updateKategoriArtikelSchema = z.object({
  id: z.string().uuid({ message: 'ID Kategori harus valid UUID.' }),
  nama: z
    .string()
    .min(2, { message: 'Nama kategori artikel minimal 2 karakter.' })
    .max(100, { message: 'Nama kategori maksimal 100 karakter.' })
    .transform((val) => val.trim()),
})

export const deleteKategoriArtikelSchema = z.object({
  id: z.string().uuid({ message: 'ID Kategori harus valid UUID.' }),
  reason: z
    .string()
    .min(1, { message: 'Alasan penghapusan minimal 1 karakter.' })
    .max(300)
    .transform((val) => val.trim()),
})

export const kategoriArtikelFilterSchema = z.object({
  search: z.string().optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export const publicArtikelFilterSchema = z.object({
  search: z.string().optional(),
  kategoriSlug: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(9),
})

export type CreateArtikelInput = z.input<typeof createArtikelSchema>
export type UpdateArtikelInput = z.input<typeof updateArtikelSchema>
export type DeleteArtikelInput = z.input<typeof deleteArtikelSchema>
export type RestoreArtikelInput = z.input<typeof restoreArtikelSchema>
export type HardDeleteArtikelInput = z.input<typeof hardDeleteArtikelSchema>
export type ArtikelFilterParams = z.input<typeof artikelFilterSchema>

export type CreateKategoriArtikelInput = z.input<typeof createKategoriArtikelSchema>
export type UpdateKategoriArtikelInput = z.input<typeof updateKategoriArtikelSchema>
export type DeleteKategoriArtikelInput = z.input<typeof deleteKategoriArtikelSchema>
export type KategoriArtikelFilterParams = z.input<typeof kategoriArtikelFilterSchema>
export type PublicArtikelFilterParams = z.input<typeof publicArtikelFilterSchema>
export type StatusArtikel = z.infer<typeof statusArtikelEnum>
