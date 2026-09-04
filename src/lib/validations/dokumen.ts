import { z } from 'zod'

export const jenisDokumenEnum = z.enum([
  'BAPTIS',
  'NIKAH',
  'PENYERAHAN_ANAK',
  'SAKSI',
  'LAINNYA',
])

export const statusDokumenEnum = z.enum(['DRAFT', 'VERIFIED', 'EXPIRED'])

export const uploadDokumenJemaatSchema = z
  .object({
    jemaatId: z.string().uuid({ message: 'Pilih Jemaat pemilik dokumen yang valid.' }),
    judul: z
      .string()
      .min(2, { message: 'Judul dokumen minimal 2 karakter.' })
      .max(150, { message: 'Judul dokumen maksimal 150 karakter.' })
      .transform((val) => val.trim()),
    jenisDokumen: jenisDokumenEnum,
    tanggalTerbit: z.coerce.date({ message: 'Tanggal terbit dokumen wajib diisi.' }),
    tanggalKadaluarsa: z.coerce
      .date()
      .optional()
      .nullable()
      .transform((val) => val || null),
    deskripsi: z
      .string()
      .max(500)
      .optional()
      .nullable()
      .transform((val) => (val ? val.trim() : null)),
  })
  .refine(
    (data) => {
      if (data.tanggalKadaluarsa && data.tanggalTerbit) {
        return new Date(data.tanggalKadaluarsa) >= new Date(data.tanggalTerbit)
      }
      return true
    },
    {
      message: 'Tanggal kadaluarsa tidak boleh sebelum tanggal terbit dokumen.',
      path: ['tanggalKadaluarsa'],
    }
  )

export const updateDokumenJemaatSchema = z
  .object({
    id: z.string().uuid({ message: 'ID Dokumen harus valid UUID.' }),
    judul: z
      .string()
      .min(2)
      .max(150)
      .optional()
      .transform((val) => (val ? val.trim() : undefined)),
    jenisDokumen: jenisDokumenEnum.optional(),
    status: statusDokumenEnum.optional(),
    tanggalTerbit: z.coerce.date().optional(),
    tanggalKadaluarsa: z.coerce.date().optional().nullable(),
    deskripsi: z.string().max(500).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.tanggalKadaluarsa && data.tanggalTerbit) {
        return new Date(data.tanggalKadaluarsa) >= new Date(data.tanggalTerbit)
      }
      return true
    },
    {
      message: 'Tanggal kadaluarsa tidak boleh sebelum tanggal terbit dokumen.',
      path: ['tanggalKadaluarsa'],
    }
  )

export const deleteDokumenJemaatSchema = z.object({
  id: z.string().uuid({ message: 'ID Dokumen harus valid UUID.' }),
  reason: z
    .string()
    .min(1, { message: 'Alasan penghapusan dokumen wajib diisi.' })
    .max(300)
    .transform((val) => val.trim()),
})

export const restoreDokumenJemaatSchema = z.object({
  id: z.string().uuid({ message: 'ID Dokumen harus valid UUID.' }),
})

export const hardDeleteDokumenJemaatSchema = z.object({
  id: z.string().uuid({ message: 'ID Dokumen harus valid UUID.' }),
  reason: z.string().optional(),
})

export const dokumenFilterSchema = z.object({
  search: z.string().optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  jenisDokumen: jenisDokumenEnum.optional(),
  status: statusDokumenEnum.optional(),
  jemaatId: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export type UploadDokumenJemaatInput = z.input<typeof uploadDokumenJemaatSchema>
export type UpdateDokumenJemaatInput = z.input<typeof updateDokumenJemaatSchema>
export type DeleteDokumenJemaatInput = z.input<typeof deleteDokumenJemaatSchema>
export type RestoreDokumenJemaatInput = z.input<typeof restoreDokumenJemaatSchema>
export type HardDeleteDokumenJemaatInput = z.input<typeof hardDeleteDokumenJemaatSchema>
export type DokumenFilterParams = z.input<typeof dokumenFilterSchema>

export type JenisDokumen = z.infer<typeof jenisDokumenEnum>
export type StatusDokumen = z.infer<typeof statusDokumenEnum>
