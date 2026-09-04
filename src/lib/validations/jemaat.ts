import { z } from 'zod'

export const JenisKelaminEnum = z.enum(['LAK_LAKI', 'PEREMPUAN'])
export const StatusJemaatEnum = z.enum(['ACTIVE', 'INACTIVE', 'MOVED', 'DECEASED', 'SUSPENDED', 'TAMU'])
export const StatusBaptisEnum = z.enum(['SUDAH_BAPTIS', 'BELUM_BAPTIS'])
export const StatusFollowUpEnum = z.enum(['NEW', 'IN_PROGRESS', 'NEED_VISITATION', 'COMPLETED'])
export const StatusPernikahanEnum = z.enum(['BELUM_MENIKAH', 'MENIKAH', 'DUDA', 'JANDA', 'BERCERAI'])
export const PendidikanEnum = z.enum(['SD', 'SMP', 'SMA', 'D3', 'S1', 'S2', 'S3'])

export const createJemaatSchema = z.object({
  nik: z.string().max(20, { message: 'NIK maksimal 20 digit.' }).optional().or(z.literal('')).nullable(),
  nama: z.string().min(2, { message: 'Nama minimal 2 karakter.' }),
  namaPanggilan: z.string().optional().nullable(),
  jenisKelamin: JenisKelaminEnum,
  tempatLahir: z.string().optional().nullable(),
  tanggalLahir: z.string().optional().nullable(),
  noHp: z.string().optional().nullable(),
  whatsApp: z.string().optional().nullable(),
  email: z.string().email({ message: 'Format email tidak valid.' }).optional().or(z.literal('')).nullable(),
  alamat: z.string().optional().nullable(),
  kota: z.string().default('Padang'),
  provinsi: z.string().default('Sumatera Barat'),
  kodePos: z.string().optional().nullable(),
  statusJemaat: StatusJemaatEnum.default('ACTIVE'),
  tanggalBergabung: z.string().optional().nullable(),
  statusBaptis: StatusBaptisEnum.default('BELUM_BAPTIS'),
  tanggalBaptis: z.string().optional().nullable(),
  statusFollowUp: StatusFollowUpEnum.default('NEW'),
  statusPernikahan: StatusPernikahanEnum.default('BELUM_MENIKAH'),
  tanggalMenikah: z.string().optional().nullable(),
  pekerjaan: z.string().optional().nullable(),
  pendidikan: PendidikanEnum.optional().nullable(),
  kontakDarurat: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
  keluargaId: z.string().optional().nullable(),
  kategorialId: z.string().optional().nullable(),
  komselId: z.string().optional().nullable(),
})

export const updateJemaatSchema = createJemaatSchema.partial().extend({
  id: z.string().uuid({ message: 'ID Jemaat harus berformat UUID.' }),
})

export const deleteJemaatSchema = z.object({
  id: z.string().uuid({ message: 'ID Jemaat harus berformat UUID.' }),
  reason: z.string().min(3, { message: 'Alasan penghapusan wajib diisi (minimal 3 karakter).' }),
})

export const restoreJemaatSchema = z.object({
  id: z.string().uuid({ message: 'ID Jemaat harus berformat UUID.' }),
})

export const hardDeleteJemaatSchema = z.object({
  id: z.string().uuid({ message: 'ID Jemaat harus berformat UUID.' }),
  reason: z.string().optional(),
})

export const jemaatFilterSchema = z.object({
  search: z.string().optional(),
  statusJemaat: StatusJemaatEnum.optional(),
  jenisKelamin: JenisKelaminEnum.optional(),
  kategorialId: z.string().optional(),
  komselId: z.string().optional(),
  statusHapus: z.enum(['ACTIVE', 'DELETED', 'ALL']).default('ACTIVE').optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
})

export type CreateJemaatInput = z.infer<typeof createJemaatSchema>
export type UpdateJemaatInput = z.infer<typeof updateJemaatSchema>
export type DeleteJemaatInput = z.infer<typeof deleteJemaatSchema>
export type RestoreJemaatInput = z.infer<typeof restoreJemaatSchema>
export type HardDeleteJemaatInput = z.infer<typeof hardDeleteJemaatSchema>
export type JemaatFilterParams = z.infer<typeof jemaatFilterSchema>
