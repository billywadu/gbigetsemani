import { z } from 'zod'

export const appProfileConfigSchema = z.object({
  namaResmi: z.string().min(3, 'Nama resmi gereja wajib diisi').default('GEREJA BETH-EL INDONESIA'),
  namaSingkat: z.string().min(2, 'Nama singkat gereja wajib diisi').default('GBI Jemaat'),
  akronim: z.string().min(2, 'Singkatan/Akronim wajib diisi').default('GBI'),
  logoUrl: z.string().nullable().default(null),
  logoCloudinaryId: z.string().nullable().default(null),
  faviconUrl: z.string().nullable().default(null),
  tagline: z.string().default('Tempat untuk bertumbuh dalam iman, bersekutu dalam kasih Kristus, dan melayani sesama.'),
  alamat: z.string().default('Jln. Gereja No. 1'),
  kota: z.string().default('Kota'),
  provinsi: z.string().default('Provinsi'),
  kodePos: z.string().default('12345'),
  telepon: z.string().default('(021) 123456'),
  whatsAppCenter: z.string().default('0812-3456-7890'),
  email: z.string().email('Format email tidak valid').default('sekretariat@gereja.org'),
  website: z.string().default('https://gereja.org'),
  nomorIzin: z.string().default('SK Sinode GBI No. 123/GBI/2005 - Kemenag RI No. 45/2010'),
})

export type AppProfileConfig = z.infer<typeof appProfileConfigSchema>

export const DEFAULT_APP_PROFILE_CONFIG: AppProfileConfig = {
  namaResmi: 'GEREJA BETH-EL INDONESIA',
  namaSingkat: 'GBI Jemaat',
  akronim: 'GBI',
  logoUrl: null,
  logoCloudinaryId: null,
  faviconUrl: null,
  tagline: 'Tempat untuk bertumbuh dalam iman, bersekutu dalam kasih Kristus, dan melayani sesama.',
  alamat: 'Jln. Gereja No. 1',
  kota: 'Kota',
  provinsi: 'Provinsi',
  kodePos: '12345',
  telepon: '(021) 123456',
  whatsAppCenter: '0812-3456-7890',
  email: 'sekretariat@gereja.org',
  website: 'https://gereja.org',
  nomorIzin: 'SK Sinode GBI No. 123/GBI/2005 - Kemenag RI No. 45/2010',
}
