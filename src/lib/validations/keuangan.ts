import { z } from 'zod'

export const statusPeriodeEnum = z.enum(['DRAFT', 'CLOSED'])
export const tipeTransaksiEnum = z.enum(['MASUK', 'KELUAR'])
export const metodePembayaranEnum = z.enum(['CASH', 'TRANSFER', 'QRIS'])

export const createScopeSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Nama pos kas minimal 3 karakter.' })
    .max(100, { message: 'Nama pos kas maksimal 100 karakter.' })
    .transform((val) => val.trim()),
  code: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? val.toUpperCase().trim() : undefined)),
  description: z
    .string()
    .max(500, { message: 'Deskripsi maksimal 500 karakter.' })
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  isActive: z.boolean().default(true),
})

export const updateScopeSchema = z.object({
  id: z.string().uuid({ message: 'ID pos kas harus valid UUID.' }),
  name: z
    .string()
    .min(3, { message: 'Nama pos kas minimal 3 karakter.' })
    .max(100, { message: 'Nama pos kas maksimal 100 karakter.' })
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, { message: 'Deskripsi maksimal 500 karakter.' })
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  isActive: z.boolean(),
})

export const deleteScopeSchema = z.object({
  id: z.string().uuid({ message: 'ID pos kas harus valid UUID.' }),
  reason: z.string().optional(),
})

export const createLaporanKeuanganSchema = z.object({
  scopeId: z.string().min(1, { message: 'Scope kas wajib dipilih.' }),
  bulan: z.coerce.number().int().min(1, { message: 'Bulan 1-12' }).max(12, { message: 'Bulan 1-12' }),
  tahun: z.coerce.number().int().min(2020, { message: 'Tahun minimal 2020' }).max(2050, { message: 'Tahun maksimal 2050' }),
  saldoAwalMode: z.enum(['CARRY_OVER', 'MANUAL']).default('CARRY_OVER'),
  saldoAwalCustom: z.coerce.number().finite().min(0).max(100_000_000_000).optional(),
  penyesuaianManual: z.coerce.number().finite().min(-100_000_000_000).max(100_000_000_000).optional(),
})

export const updateLaporanKeuanganSchema = z.object({
  id: z.string().uuid({ message: 'ID Laporan Keuangan harus valid UUID.' }),
  bulan: z.coerce.number().int().min(1).max(12).optional(),
  tahun: z.coerce.number().int().min(2020).max(2050).optional(),
  saldoAwal: z.coerce.number().finite().min(0).max(100_000_000_000).optional(),
})

export const createTransaksiKeuanganSchema = z.object({
  laporanId: z.string().uuid({ message: 'ID Laporan Keuangan harus valid UUID.' }),
  tipe: tipeTransaksiEnum,
  kategori: z
    .string()
    .min(2, { message: 'Kategori transaksi minimal 2 karakter.' })
    .max(100)
    .transform((val) => val.trim()),
  nominal: z.coerce
    .number({ message: 'Nominal harus angka valid.' })
    .finite({ message: 'Nominal harus angka terbatas yang valid.' })
    .positive({ message: 'Nominal harus lebih besar dari 0.' })
    .max(100_000_000_000, { message: 'Nominal maksimal Rp 100 Miliar per transaksi.' }),
  metodePembayaran: metodePembayaranEnum.default('CASH'),
  catatan: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  tanggal: z.coerce.date({ message: 'Tanggal transaksi wajib diisi.' }),
})

export const finalizePeriodSchema = z.object({
  laporanId: z.string().uuid({ message: 'ID Laporan Keuangan harus valid UUID.' }),
})

export const reopenPeriodSchema = z.object({
  laporanId: z.string().uuid({ message: 'ID Laporan Keuangan harus valid UUID.' }),
  reason: z
    .string()
    .min(10, { message: 'Alasan pembukaan kembali periode wajib diisi (minimal 10 karakter).' })
    .max(500)
    .transform((val) => val.trim()),
})

export const updateTransaksiKeuanganSchema = z.object({
  id: z.string().uuid({ message: 'ID Transaksi harus valid UUID.' }),
  tipe: tipeTransaksiEnum,
  kategori: z
    .string()
    .min(2, { message: 'Kategori transaksi minimal 2 karakter.' })
    .max(100)
    .transform((val) => val.trim()),
  nominal: z.coerce
    .number({ message: 'Nominal harus angka valid.' })
    .finite({ message: 'Nominal harus angka terbatas yang valid.' })
    .positive({ message: 'Nominal harus lebih besar dari 0.' })
    .max(100_000_000_000, { message: 'Nominal maksimal Rp 100 Miliar per transaksi.' }),
  metodePembayaran: metodePembayaranEnum.default('CASH'),
  catatan: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  tanggal: z.coerce.date({ message: 'Tanggal transaksi wajib diisi.' }),
})

export const deleteTransaksiKeuanganSchema = z.object({
  id: z.string().uuid({ message: 'ID Transaksi harus valid UUID.' }),
  reason: z.string().min(3, { message: 'Alasan penghapusan transaksi wajib diisi.' }),
})

export const restoreTransaksiKeuanganSchema = z.object({
  id: z.string().uuid({ message: 'ID Transaksi harus valid UUID.' }),
})

export const hardDeleteTransaksiKeuanganSchema = z.object({
  id: z.string().uuid({ message: 'ID Transaksi harus valid UUID.' }),
  reason: z.string().optional(),
})

export const deleteLaporanKeuanganSchema = z.object({
  id: z.string().uuid({ message: 'ID Laporan Keuangan harus valid UUID.' }),
  reason: z.string().min(3, { message: 'Alasan penghapusan buku kas wajib diisi.' }),
})

export const restoreLaporanKeuanganSchema = z.object({
  id: z.string().uuid({ message: 'ID Laporan Keuangan harus valid UUID.' }),
})

export const hardDeleteLaporanKeuanganSchema = z.object({
  id: z.string().uuid({ message: 'ID Laporan Keuangan harus valid UUID.' }),
  reason: z.string().optional(),
})

export const laporanFilterSchema = z.object({
  scopeId: z.string().optional(),
  tahun: z.coerce.number().optional(),
  bulan: z.coerce.number().optional(),
  status: statusPeriodeEnum.optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export const laporanGabunganFilterSchema = z.object({
  tahun: z.coerce.number().int().default(new Date().getFullYear()),
  bulan: z.coerce.number().int().optional(),
})

export type CreateScopeInput = z.input<typeof createScopeSchema>
export type UpdateScopeInput = z.input<typeof updateScopeSchema>
export type DeleteScopeInput = z.infer<typeof deleteScopeSchema>

export type CreateLaporanKeuanganInput = z.input<typeof createLaporanKeuanganSchema>
export type UpdateLaporanKeuanganInput = z.input<typeof updateLaporanKeuanganSchema>
export type CreateTransaksiKeuanganInput = z.input<typeof createTransaksiKeuanganSchema>
export type UpdateTransaksiKeuanganInput = z.input<typeof updateTransaksiKeuanganSchema>
export type FinalizePeriodInput = z.input<typeof finalizePeriodSchema>
export type ReopenPeriodInput = z.input<typeof reopenPeriodSchema>
export type DeleteTransaksiKeuanganInput = z.infer<typeof deleteTransaksiKeuanganSchema>
export type RestoreTransaksiKeuanganInput = z.infer<typeof restoreTransaksiKeuanganSchema>
export type HardDeleteTransaksiKeuanganInput = z.infer<typeof hardDeleteTransaksiKeuanganSchema>
export type DeleteLaporanKeuanganInput = z.infer<typeof deleteLaporanKeuanganSchema>
export type RestoreLaporanKeuanganInput = z.infer<typeof restoreLaporanKeuanganSchema>
export type HardDeleteLaporanKeuanganInput = z.infer<typeof hardDeleteLaporanKeuanganSchema>
export type LaporanFilterParams = z.input<typeof laporanFilterSchema>
export type LaporanGabunganFilterParams = z.input<typeof laporanGabunganFilterSchema>

export type StatusPeriode = z.infer<typeof statusPeriodeEnum>
export type TipeTransaksi = z.infer<typeof tipeTransaksiEnum>
export type MetodePembayaran = z.infer<typeof metodePembayaranEnum>
