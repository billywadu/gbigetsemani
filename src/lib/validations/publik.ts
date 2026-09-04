import { z } from 'zod'

export const verificationMethodEnum = z.enum(['TANGGAL_LAHIR', 'LAST_4_HP'])

export const verifyDokumenAccessSchema = z.object({
  nij: z
    .string()
    .min(3, { message: 'Nomor Induk Jemaat (NIJ) / Barcode wajib diisi.' })
    .max(50)
    .transform((val) => val.trim().toUpperCase()),
  verificationMethod: verificationMethodEnum.default('TANGGAL_LAHIR'),
  tanggalLahir: z.string().optional().nullable(),
  last4Hp: z
    .string()
    .length(4, { message: 'Harus tepat 4 digit terakhir nomor HP.' })
    .regex(/^\d{4}$/, { message: 'Harus berupa 4 digit angka.' })
    .optional()
    .nullable(),
})

export type VerifyDokumenAccessInput = z.infer<typeof verifyDokumenAccessSchema>
export type VerificationMethod = z.infer<typeof verificationMethodEnum>

export type PublicDokumenItemDTO = {
  id: string
  judul: string
  jenisDokumen: string
  tanggalTerbit: string
  mimeType: string
  fileSize: number
  fileUrl: string | null
  downloadToken: string
}

export type VerifyDokumenAccessResultDTO = {
  jemaatNama: string
  nij: string
  totalDokumen: number
  dokumenList: PublicDokumenItemDTO[]
  unlockedAt: string
}
