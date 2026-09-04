import { z } from 'zod'

// ── KategoriPelayanan Schemas ──────────────────────────────────────────
export const createKategoriPelayananSchema = z.object({
  nama: z
    .string()
    .min(2, { message: 'Nama bidang pelayanan minimal 2 karakter.' })
    .max(100)
    .transform((v) => v.trim()),
  deskripsi: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim() : null)),
})

export const updateKategoriPelayananSchema = createKategoriPelayananSchema.extend({
  id: z.string().uuid({ message: 'ID KategoriPelayanan harus UUID.' }),
})

export const deleteKategoriPelayananSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(3, { message: 'Alasan penghapusan wajib diisi (minimal 3 karakter).' }),
})

export const restoreKategoriPelayananSchema = z.object({
  id: z.string().uuid(),
})

export const hardDeleteKategoriPelayananSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
})

// ── Pelayan Schemas ───────────────────────────────────────────────────
export const penugasanItemSchema = z.object({
  kategorialId: z.string().uuid({ message: 'Kategorial wajib dipilih.' }).nullable().optional(),
  kategoriPelayananIds: z
    .array(z.string().uuid())
    .min(1, { message: 'Pilih minimal satu bidang pelayanan pada kategorial ini.' }),
})

export type PenugasanItemInput = z.infer<typeof penugasanItemSchema>

export const createPelayanSchema = z.object({
  jemaatId: z.string().uuid({ message: 'ID Jemaat harus UUID.' }),
  deskripsiTugas: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim() : null)),
  // Multi-Kategorial Penugasan Matriks
  penugasan: z
    .array(penugasanItemSchema)
    .optional(),
  // Backward compatibility fields
  kategorialId: z.string().uuid().optional().nullable(),
  kategoriPelayananIds: z.array(z.string().uuid()).optional(),
}).refine(
  (data) => (data.penugasan && data.penugasan.length > 0) || (data.kategoriPelayananIds && data.kategoriPelayananIds.length > 0),
  { message: 'Pilih minimal satu penugasan bidang pelayanan.' }
)

export const updatePelayanSchema = z.object({
  id: z.string().uuid({ message: 'ID Pelayan harus UUID.' }),
  deskripsiTugas: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim() : null)),
  // Multi-Kategorial Penugasan Matriks
  penugasan: z
    .array(penugasanItemSchema)
    .optional(),
  // Backward compatibility fields
  kategoriPelayananIds: z.array(z.string().uuid()).optional(),
}).refine(
  (data) => (data.penugasan && data.penugasan.length > 0) || (data.kategoriPelayananIds && data.kategoriPelayananIds.length > 0),
  { message: 'Pilih minimal satu penugasan bidang pelayanan.' }
)

export const deletePelayanSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(3, { message: 'Alasan penghapusan wajib diisi (minimal 3 karakter).' }),
})

export const restorePelayanSchema = z.object({
  id: z.string().uuid(),
})

export const hardDeletePelayanSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
})

export const pelayanFilterSchema = z.object({
  search: z.string().optional(),
  kategorialId: z.string().uuid().optional(),
  kategoriPelayananId: z.string().uuid().optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export const removePelayanFromKategoriSchema = z.object({
  pelayanId: z.string().uuid({ message: 'ID Pelayan harus UUID.' }),
  kategoriPelayananId: z.string().uuid({ message: 'ID Kategori Pelayanan harus UUID.' }),
  kategorialId: z.string().uuid().optional().nullable(),
})

export type CreateKategoriPelayananInput = z.infer<typeof createKategoriPelayananSchema>
export type UpdateKategoriPelayananInput = z.infer<typeof updateKategoriPelayananSchema>
export type DeleteKategoriPelayananInput = z.infer<typeof deleteKategoriPelayananSchema>
export type RestoreKategoriPelayananInput = z.infer<typeof restoreKategoriPelayananSchema>
export type HardDeleteKategoriPelayananInput = z.infer<typeof hardDeleteKategoriPelayananSchema>
export type CreatePelayanInput = z.infer<typeof createPelayanSchema>
export type UpdatePelayanInput = z.infer<typeof updatePelayanSchema>
export type DeletePelayanInput = z.infer<typeof deletePelayanSchema>
export type RestorePelayanInput = z.infer<typeof restorePelayanSchema>
export type HardDeletePelayanInput = z.infer<typeof hardDeletePelayanSchema>
export type RemovePelayanFromKategoriInput = z.infer<typeof removePelayanFromKategoriSchema>
export type PelayanFilterParams = z.infer<typeof pelayanFilterSchema>
