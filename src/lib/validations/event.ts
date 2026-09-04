import { z } from 'zod'

export const eventKategoriEnum = z.enum([
  'IBADAH_RAYA',
  'KOMSEL',
  'YOUTH',
  'SEMINAR',
  'SEKOLAH_MINGGU',
])

export const createEventSchema = z.object({
  namaEvent: z
    .string()
    .min(2, { message: 'Nama event minimal 2 karakter.' })
    .max(100)
    .transform((val) => val.trim()),
  kategori: eventKategoriEnum,
  
  // Waktu Pelaksanaan
  tanggalMulai: z.coerce.date({ message: 'Tanggal dan jam mulai wajib diisi.' }),
  tanggalSelesai: z.coerce.date().optional().nullable(),
  
  // Jendela Waktu Presensi
  presensiBuka: z.coerce.date().optional().nullable(),
  presensiTutup: z.coerce.date().optional().nullable(),
  
  // Lokasi & Ruangan
  namaLokasi: z.string().max(100).optional().nullable().transform((val) => (val ? val.trim() : null)),
  alamatLokasi: z.string().max(300).optional().nullable().transform((val) => (val ? val.trim() : null)),
  lokasi: z
    .string()
    .max(150)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : 'Gedung Utama Gereja')),
    
  // Media & Metadata
  thumbnailUrl: z.string().max(500).optional().nullable().transform((val) => (val ? val.trim() : null)),
  deskripsi: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),

  // Legacy fallback
  tanggal: z.coerce.date().optional().nullable(),
})

export const updateEventSchema = z.object({
  id: z.string().uuid({ message: 'ID Event harus valid UUID.' }),
  namaEvent: z
    .string()
    .min(2)
    .max(100)
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
  kategori: eventKategoriEnum.optional(),
  tanggalMulai: z.coerce.date().optional(),
  tanggalSelesai: z.coerce.date().optional().nullable(),
  presensiBuka: z.coerce.date().optional().nullable(),
  presensiTutup: z.coerce.date().optional().nullable(),
  namaLokasi: z.string().max(100).optional().nullable(),
  alamatLokasi: z.string().max(300).optional().nullable(),
  lokasi: z.string().max(150).optional().nullable(),
  thumbnailUrl: z.string().max(500).optional().nullable(),
  deskripsi: z.string().max(500).optional().nullable(),
  tanggal: z.coerce.date().optional().nullable(),
})

export const scanAttendanceSchema = z.object({
  eventId: z.string().uuid({ message: 'ID Event harus valid UUID.' }),
  barcodeCode: z
    .string()
    .min(1, { message: 'Kode barcode presensi wajib disertakan.' })
    .transform((val) => val.trim()),
  notes: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  isDashboardOverride: z.boolean().optional().default(false),
})

export const deleteEventSchema = z.object({
  id: z.string().uuid({ message: 'ID Event harus valid UUID.' }),
  reason: z.string().min(1, { message: 'Alasan penghapusan wajib diisi.' }),
})

export const restoreEventSchema = z.object({
  id: z.string().uuid({ message: 'ID Event harus valid UUID.' }),
})

export const hardDeleteEventSchema = z.object({
  id: z.string().uuid({ message: 'ID Event harus valid UUID.' }),
  reason: z.string().optional().nullable(),
})

export const recordGuestAttendanceSchema = z.object({
  eventId: z.string().uuid({ message: 'ID Event harus valid UUID.' }),
  nama: z.string().min(2, { message: 'Nama tamu minimal 2 karakter.' }).max(100).transform((val) => val.trim()),
  jenisKelamin: z.enum(['LAK_LAKI', 'PEREMPUAN']).default('LAK_LAKI'),
  noHp: z.string().max(20).optional().nullable().transform((val) => (val ? val.trim() : null)),
  whatsApp: z.string().max(20).optional().nullable().transform((val) => (val ? val.trim() : null)),
  catatan: z.string().max(300).optional().nullable().transform((val) => (val ? val.trim() : null)),
  isDashboardOverride: z.boolean().optional().default(false),
})

export const updateEventHeadcountSchema = z.object({
  eventId: z.string().uuid({ message: 'ID Event harus valid UUID.' }),
  manualHeadcount: z.number().int().min(0, { message: 'Jumlah kehadiran minimal 0.' }),
  isDashboardOverride: z.boolean().optional().default(false),
})

export const recordAttendanceByIdSchema = z.object({
  eventId: z.string().uuid({ message: 'ID Event harus valid UUID.' }),
  jemaatId: z.string().uuid({ message: 'ID Jemaat harus valid UUID.' }),
  notes: z.string().max(200).optional().nullable(),
  isDashboardOverride: z.boolean().optional().default(false),
})

export const eventFilterSchema = z.object({
  search: z.string().optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  kategori: eventKategoriEnum.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export type CreateEventInput = z.input<typeof createEventSchema>
export type UpdateEventInput = z.input<typeof updateEventSchema>
export type DeleteEventInput = z.input<typeof deleteEventSchema>
export type RestoreEventInput = z.input<typeof restoreEventSchema>
export type HardDeleteEventInput = z.input<typeof hardDeleteEventSchema>
export type ScanAttendanceInput = z.input<typeof scanAttendanceSchema>
export type RecordGuestAttendanceInput = z.input<typeof recordGuestAttendanceSchema>
export type UpdateEventHeadcountInput = z.input<typeof updateEventHeadcountSchema>
export type RecordAttendanceByIdInput = z.input<typeof recordAttendanceByIdSchema>
export type EventFilterParams = z.input<typeof eventFilterSchema>
export type EventKategori = z.infer<typeof eventKategoriEnum>

