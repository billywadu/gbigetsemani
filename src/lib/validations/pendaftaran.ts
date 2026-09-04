import { z } from 'zod'

export const statusPendaftaranEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED'])

export const relasiKeluargaEnum = z.enum([
  'KEPALA_KELUARGA',
  'SUAMI',
  'ISTRI',
  'ANAK',
  'ORANG_TUA',
  'MERTUA',
  'CUCU',
  'FAMILI',
  'LAINNYA',
])

/**
 * Shared helper: validate phone number format only when the value is non-empty.
 * Allows digits, +, -, (, ), and spaces. Minimum 7 characters.
 */
const phoneSchema = z
  .string()
  .max(20, { message: 'Nomor telepon maksimal 20 karakter.' })
  .optional()
  .nullable()
  .transform((val) => (val && val.trim() !== '' ? val.trim() : null))
  .refine((val) => !val || /^[0-9+\-()\s]{7,20}$/.test(val), {
    message: 'Format nomor telepon tidak valid (gunakan angka, +, -, spasi, 7–20 karakter).',
  })

export const anggotaKeluargaItemSchema = z.object({
  id: z.string().optional(),
  nama: z
    .string()
    .min(1, { message: 'Nama anggota keluarga wajib diisi.' })
    .max(100, { message: 'Nama anggota keluarga maksimal 100 karakter.' })
    .transform((val) => val.trim()),
  namaPanggilan: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  hubungan: z
    .preprocess(
      (val) => (!val || val === '' ? 'ANAK' : val),
      relasiKeluargaEnum
    )
    .default('ANAK'),
  jenisKelamin: z
    .preprocess(
      (val) => (!val || val === '' ? 'LAK_LAKI' : val),
      z.enum(['LAK_LAKI', 'PEREMPUAN'])
    )
    .default('LAK_LAKI'),
  statusPernikahan: z
    .preprocess(
      (val) => (!val || val === '' ? 'BELUM_MENIKAH' : val),
      z.enum(['BELUM_MENIKAH', 'MENIKAH', 'DUDA', 'JANDA', 'BERCERAI'])
    )
    .optional()
    .default('BELUM_MENIKAH'),
  tempatLahir: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== '' ? val.trim() : null)),
  tanggalLahir: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== '' ? val.trim() : null)),
  statusBaptis: z
    .preprocess(
      (val) => (!val || val === '' ? 'BELUM_BAPTIS' : val),
      z.enum(['SUDAH_BAPTIS', 'BELUM_BAPTIS'])
    )
    .optional()
    .default('BELUM_BAPTIS'),
  // Bug 5 Fix: phone format validation for family member
  noHp: phoneSchema,
  email: z
    .preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
      z.string().email({ message: 'Format email tidak valid.' }).optional().nullable()
    )
    .optional()
    .nullable(),
  pekerjaan: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== '' ? val.trim() : null)),
})

export const submitPendaftaranMandiriSchema = z.object({
  // Honeypot Field (Anti-Bot / Anti-Spam Trap: MUST be empty)
  website: z.string().max(100).optional().nullable(),

  tipePendaftaran: z.enum(['PRIBADI', 'KELUARGA']).default('PRIBADI'),

  // Data Pemohon / Kepala Keluarga
  nama: z
    .string()
    .min(2, { message: 'Nama lengkap minimal 2 karakter (sesuai KTP).' })
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
  tempatLahir: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  tanggalLahir: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  // Bug 5 Fix: phone format validation for primary applicant
  noHp: phoneSchema,
  whatsApp: phoneSchema,
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
  statusPernikahan: z
    .enum(['BELUM_MENIKAH', 'MENIKAH', 'DUDA', 'JANDA', 'BERCERAI'])
    .optional()
    .nullable()
    .default('BELUM_MENIKAH'),
  pekerjaan: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),

  // Family Batch Fields (Optional when tipePendaftaran === 'KELUARGA')
  namaKeluarga: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  // Bug 6 Fix: nomorKk max aligned to UI (20) + digits-only validation
  nomorKk: z
    .string()
    .max(20, { message: 'Nomor KK maksimal 20 karakter.' })
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null))
    .refine((val) => !val || /^\d{1,20}$/.test(val), {
      message: 'Nomor KK hanya boleh berisi angka.',
    }),
  kkFileUrl: z
    .string()
    .max(500)
    .optional()
    .nullable(),
  kkFileSize: z
    .number()
    .int()
    .optional()
    .nullable(),
  // Bug 4 Fix: limit family member array to prevent DoS via large payloads
  anggotaKeluarga: z
    .array(anggotaKeluargaItemSchema)
    .max(30, { message: 'Maksimal 30 anggota keluarga dalam satu pendaftaran.' })
    .optional()
    .default([]),
})

export const approvePendaftaranSchema = z.object({
  registrationId: z.string().uuid({ message: 'ID Pendaftaran harus valid UUID.' }),
})

export const rejectPendaftaranSchema = z.object({
  registrationId: z.string().uuid({ message: 'ID Pendaftaran harus valid UUID.' }),
  reason: z
    .string()
    .min(3, { message: 'Alasan penolakan wajib diisi (minimal 3 karakter).' })
    .max(500)
    .transform((val) => val.trim()),
})

export const deletePendaftaranSchema = z.object({
  id: z.string().uuid({ message: 'ID Pendaftaran harus valid UUID.' }),
  reason: z
    .string()
    .min(1, { message: 'Alasan penghapusan minimal 1 karakter.' })
    .max(300)
    .transform((val) => val.trim()),
})

export const restorePendaftaranSchema = z.object({
  id: z.string().uuid({ message: 'ID Pendaftaran harus valid UUID.' }),
})

export const hardDeletePendaftaranSchema = z.object({
  id: z.string().uuid({ message: 'ID Pendaftaran harus valid UUID.' }),
  reason: z.string().optional(),
})

export const pendaftaranFilterSchema = z.object({
  search: z.string().optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  status: statusPendaftaranEnum.optional(),
  tipePendaftaran: z.enum(['ALL', 'PRIBADI', 'KELUARGA']).default('ALL').optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export type AnggotaKeluargaItem = z.infer<typeof anggotaKeluargaItemSchema>
export type SubmitPendaftaranMandiriInput = z.input<typeof submitPendaftaranMandiriSchema>
export type ApprovePendaftaranInput = z.input<typeof approvePendaftaranSchema>
export type RejectPendaftaranInput = z.input<typeof rejectPendaftaranSchema>
export type DeletePendaftaranInput = z.input<typeof deletePendaftaranSchema>
export type RestorePendaftaranInput = z.input<typeof restorePendaftaranSchema>
export type HardDeletePendaftaranInput = z.input<typeof hardDeletePendaftaranSchema>
export type PendaftaranFilterParams = z.input<typeof pendaftaranFilterSchema>
export type StatusPendaftaran = z.infer<typeof statusPendaftaranEnum>
export type RelasiKeluarga = z.infer<typeof relasiKeluargaEnum>
