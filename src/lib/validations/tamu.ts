import { z } from 'zod'

export const statusFollowUpEnum = z.enum([
  'NEW',
  'IN_PROGRESS',
  'NEED_VISITATION',
  'COMPLETED',
])

export const createTamuSchema = z.object({
  nama: z
    .string()
    .min(2, { message: 'Nama lengkap minimal 2 karakter.' })
    .max(100)
    .transform((val) => val.trim()),
  namaPanggilan: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  jenisKelamin: z.enum(['LAK_LAKI', 'PEREMPUAN'], {
    message: 'Pilih jenis kelamin.',
  }),
  noHp: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  whatsApp: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  email: z
    .string()
    .email({ message: 'Format email tidak valid.' })
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val && val.trim() ? val.trim().toLowerCase() : null)),
  alamat: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  kota: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : 'Padang')),
  provinsi: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : 'Sumatera Barat')),
  catatan: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
})

export const updateStatusFollowUpSchema = z.object({
  id: z.string().uuid({ message: 'ID Tamu harus valid UUID.' }),
  statusFollowUp: statusFollowUpEnum,
  catatan: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
})

export const konversiTamuKeJemaatSchema = z.object({
  id: z.string().uuid({ message: 'ID Tamu harus valid UUID.' }),
})

export const deleteTamuSchema = z.object({
  id: z.string().uuid({ message: 'ID Tamu harus valid UUID.' }),
  reason: z.string().min(1, { message: 'Alasan penghapusan wajib diisi.' }),
})

export const restoreTamuSchema = z.object({
  id: z.string().uuid({ message: 'ID Tamu harus valid UUID.' }),
})

export const hardDeleteTamuSchema = z.object({
  id: z.string().uuid({ message: 'ID Tamu harus valid UUID.' }),
  reason: z.string().optional(),
})

export const tamuFilterSchema = z.object({
  search: z.string().optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  statusFollowUp: statusFollowUpEnum.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export type CreateTamuInput = z.input<typeof createTamuSchema>
export type UpdateStatusFollowUpInput = z.input<typeof updateStatusFollowUpSchema>
export type KonversiTamuKeJemaatInput = z.input<typeof konversiTamuKeJemaatSchema>
export type DeleteTamuInput = z.input<typeof deleteTamuSchema>
export type RestoreTamuInput = z.input<typeof restoreTamuSchema>
export type HardDeleteTamuInput = z.input<typeof hardDeleteTamuSchema>
export type TamuFilterParams = z.input<typeof tamuFilterSchema>
export type StatusFollowUp = z.infer<typeof statusFollowUpEnum>
