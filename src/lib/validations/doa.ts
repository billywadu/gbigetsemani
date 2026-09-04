import { z } from 'zod'

export const KATEGORI_DOA_OPTIONS = [
  { value: 'KESEHATAN', label: 'Kesehatan & Kesembuhan', icon: 'HeartPulse', color: 'rose' },
  { value: 'KELUARGA', label: 'Keluarga & Pernikahan', icon: 'Users', color: 'blue' },
  { value: 'PEKERJAAN', label: 'Pekerjaan & Karir', icon: 'Briefcase', color: 'amber' },
  { value: 'ROHANI', label: 'Pertumbuhan Rohani', icon: 'Sparkles', color: 'purple' },
  { value: 'KEUANGAN', label: 'Keuangan & Usaha', icon: 'Coins', color: 'emerald' },
  { value: 'LAINNYA', label: 'Lainnya / Pribadi', icon: 'HelpCircle', color: 'slate' },
] as const

export const STATUS_DOA_OPTIONS = [
  { value: 'BARU', label: 'Perlu Didoakan', badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  { value: 'SEDANG_DIDOAKAN', label: 'Sedang Didoakan', badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { value: 'SELESAI', label: 'Sudah Didoakan', badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'TERJAWAB', label: 'Doa Terjawab / Kesaksian', badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
] as const

export const PRIVASI_DOA_OPTIONS = [
  { value: 'TIM_DOA_PUBLIK', label: 'Tim Doa & Menara Doa', description: 'Boleh dibagikan dan didoakan bersama Tim Pendoa Syafaat gereja.' },
  { value: 'RAHASIA_PASTORAL', label: 'Khusus Pastoral / Rahasia', description: 'Hanya dibaca & didoakan oleh Gembala Sidang & Tim Pastoral inti.' },
] as const

// Public Submission Schema
export const submitPermohonanDoaSchema = z.object({
  namaPemohon: z.string().min(2, 'Nama pemohon wajib diisi minimal 2 karakter').max(100),
  isAnonim: z.boolean().default(false),
  kontakWa: z.string().max(20).optional().or(z.literal('')),
  kategori: z.enum(['KESEHATAN', 'KELUARGA', 'PEKERJAAN', 'ROHANI', 'KEUANGAN', 'LAINNYA']).default('LAINNYA'),
  privasi: z.enum(['RAHASIA_PASTORAL', 'TIM_DOA_PUBLIK']).default('TIM_DOA_PUBLIK'),
  isiDoa: z.string().min(10, 'Pokok permohonan doa wajib diisi minimal 10 karakter').max(2000, 'Maksimal 2000 karakter'),
})

export type SubmitPermohonanDoaInput = z.infer<typeof submitPermohonanDoaSchema>

// Pastoral Update Schema
export const updateStatusDoaSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['BARU', 'SEDANG_DIDOAKAN', 'SELESAI', 'TERJAWAB']),
  didoakanOleh: z.string().max(100).optional(),
  catatanPastoral: z.string().max(1000).optional(),
})

export type UpdateStatusDoaInput = z.infer<typeof updateStatusDoaSchema>

// DTO Interfaces
export interface PermohonanDoaDTO {
  id: string
  namaPemohon: string
  isAnonim: boolean
  kontakWa: string | null
  kategori: 'KESEHATAN' | 'KELUARGA' | 'PEKERJAAN' | 'ROHANI' | 'KEUANGAN' | 'LAINNYA'
  privasi: 'RAHASIA_PASTORAL' | 'TIM_DOA_PUBLIK'
  isiDoa: string
  status: 'BARU' | 'SEDANG_DIDOAKAN' | 'SELESAI' | 'TERJAWAB'
  catatanPastoral: string | null
  didoakanOleh: string | null
  didoakanAt: string | null
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
}

export interface PermohonanDoaStatsDTO {
  total: number
  baru: number
  sedangDidoakan: number
  selesai: number
  terjawab: number
}
