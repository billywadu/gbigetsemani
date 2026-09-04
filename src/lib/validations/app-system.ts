import { z } from 'zod'

export const appSystemConfigSchema = z.object({
  zonaWaktu: z.enum(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']).default('Asia/Jakarta'),
  formatTanggal: z.enum(['id-ID', 'en-US']).default('id-ID'),
  prefixNij: z.string().min(2, 'Prefix NIJ minimal 2 karakter').default('NIJ-'),
  prefixBarcode: z.string().min(2, 'Prefix Barcode minimal 2 karakter').default('JMT-'),
  defaultJendelaScanMenit: z.number().int().min(5).max(180).default(30),
  maxUploadFileMb: z.number().int().min(1).max(50).default(10),
  fiturKeuangan: z.boolean().default(true),
  fiturArsip: z.boolean().default(true),
  fiturMateri: z.boolean().default(true),
  fiturDoa: z.boolean().default(true),
  pesanSambutanScanner: z.string().default('Selamat datang dan selamat beribadah di Rumah Tuhan!'),
})

export type AppSystemConfig = z.infer<typeof appSystemConfigSchema>

export const DEFAULT_APP_SYSTEM_CONFIG: AppSystemConfig = {
  zonaWaktu: 'Asia/Jakarta',
  formatTanggal: 'id-ID',
  prefixNij: 'NIJ-',
  prefixBarcode: 'JMT-',
  defaultJendelaScanMenit: 30,
  maxUploadFileMb: 10,
  fiturKeuangan: true,
  fiturArsip: true,
  fiturMateri: true,
  fiturDoa: true,
  pesanSambutanScanner: 'Selamat datang dan selamat beribadah di Rumah Tuhan!',
}
