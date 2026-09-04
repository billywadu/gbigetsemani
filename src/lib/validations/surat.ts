import { z } from 'zod'

export const KategoriSuratEnum = z.enum([
  'UNDANGAN',
  'KETERANGAN',
  'REKOMENDASI',
  'TUGAS',
  'PEMBERITAHUAN',
  'BAPTIS',
  'PENYERAHAN_ANAK',
  'PERNIKAHAN',
  'LAINNYA',
])
export type KategoriSuratType = z.infer<typeof KategoriSuratEnum>

export const StatusSuratEnum = z.enum(['DRAFT', 'DIARSIPKAN', 'DITERBITKAN'])
export type StatusSuratType = z.infer<typeof StatusSuratEnum>

export const PoinIsiItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Teks poin tidak boleh kosong'),
  isBold: z.boolean().default(false),
})
export type PoinIsiItem = z.infer<typeof PoinIsiItemSchema>

export const SuratSignatorySchema = z.object({
  roleKey: z.string().default('gembala'),
  jabatan: z.string().min(1, 'Jabatan wajib diisi'),
  nama: z.string().min(1, 'Nama penandatangan wajib diisi'),
  gelar: z.string().optional().default(''),
  nomorInduk: z.string().optional().default(''),
  ttdUrl: z.string().nullable().optional(),
})
export type SuratSignatory = z.infer<typeof SuratSignatorySchema>

export const SuratResmiFormSchema = z.object({
  id: z.string().optional(),
  nomorSurat: z.string().min(1, 'Nomor surat wajib diisi'),
  perihal: z.string().min(1, 'Perihal surat wajib diisi'),
  lampiran: z.string().default('-'),
  tanggalSurat: z.string().min(1, 'Tanggal surat wajib diisi'), // ISO date string
  tempatSurat: z.string().default('Jakarta'),
  kategori: KategoriSuratEnum.default('LAINNYA'),
  status: StatusSuratEnum.default('DRAFT'),

  // Data Tujuan
  tujuanKepada: z.string().min(1, 'Penerima surat (Kepada Yth) wajib diisi'),
  tujuanDi: z.string().default('Di Tempat'),

  // Isi Surat
  salamPembuka: z.string().default('Salam dalam kasih Kristus,'),
  paragrafPembuka: z.string().min(1, 'Paragraf pembuka wajib diisi'),
  subJudul: z.string().optional().default(''),
  poinIsi: z.array(PoinIsiItemSchema).default([]),
  paragrafPenutup: z.string().min(1, 'Paragraf penutup wajib diisi'),

  // Konfigurasi Kop Surat
  modeLogo: z.enum(['SATU_LOGO', 'DUA_LOGO']).default('SATU_LOGO'),
  logoKiriUrl: z.string().nullable().optional(),
  logoKananUrl: z.string().nullable().optional(),
  kopNama: z.string().min(1, 'Nama gereja / instansi wajib diisi'),
  kopSub: z.string().optional().default(''),
  kopBadanHukum: z.string().optional().default(''),
  kopAlamat: z.string().optional().default(''),
  kopKontak: z.string().optional().default(''),
  garisKopStyle: z.enum(['DOUBLE', 'SINGLE', 'GOLD', 'NAVY']).default('DOUBLE'),
  garisKopColor: z.string().default('#0f172a'),

  // Tanda Tangan & Stempel
  salamPenutup: z.string().default('Dalam KasihNya,'),
  namaInstansiTtd: z.string().optional().default(''),
  formatTtd: z.enum(['SATU_PEJABAT', 'DUA_PEJABAT', 'TIGA_PEJABAT']).default('DUA_PEJABAT'),
  signatories: z.array(SuratSignatorySchema).default([]),
  tampilkanStempel: z.boolean().default(true),
  stempelUrl: z.string().nullable().optional(),
  posisiStempel: z.enum(['CENTER_OVERLAP', 'LEFT', 'RIGHT']).default('CENTER_OVERLAP'),

  // Lampiran Tambahan
  adaLampiran: z.boolean().default(false),
  judulLampiran: z.string().optional().default(''),
  isiLampiran: z.string().optional().default(''),
  gambarLampiranUrl: z.string().nullable().optional(),
})

export type SuratResmiFormValues = z.infer<typeof SuratResmiFormSchema>

export const KATEGORI_SURAT_OPTIONS = [
  { value: 'UNDANGAN', label: 'Surat Undangan' },
  { value: 'KETERANGAN', label: 'Surat Keterangan' },
  { value: 'REKOMENDASI', label: 'Surat Rekomendasi' },
  { value: 'TUGAS', label: 'Surat Tugas' },
  { value: 'PEMBERITAHUAN', label: 'Surat Pemberitahuan' },
  { value: 'BAPTIS', label: 'Surat Baptis' },
  { value: 'PENYERAHAN_ANAK', label: 'Surat Penyerahan Anak' },
  { value: 'PERNIKAHAN', label: 'Surat Pernikahan' },
  { value: 'LAINNYA', label: 'Lainnya / Umum' },
]

export const DEFAULT_SURAT_FORM_VALUES: SuratResmiFormValues = {
  nomorSurat: generateAutoNomorSurat('PEMBERITAHUAN', 1),
  perihal: 'PEMBERITAHUAN PELAYANAN GEREJA',
  lampiran: '-',
  tanggalSurat: new Date().toISOString().split('T')[0],
  tempatSurat: 'Jakarta',
  kategori: 'PEMBERITAHUAN',
  status: 'DRAFT',

  tujuanKepada: 'Bapak/Ibu Gembala Jemaat / Seluruh Jemaat\nGereja Bethel Indonesia',
  tujuanDi: 'Di Tempat',

  salamPembuka: 'Salam dalam kasih Tuhan Yesus Kristus,',
  paragrafPembuka:
    'Dengan penuh rasa syukur atas anugerah dan pemeliharaan Tuhan bagi keluarga besar gereja, bersama surat ini kami menyampaikan informasi resmi perihal pelaksanaan kegiatan pelayanan gereja sebagai berikut:',
  subJudul: 'AGENDA KEGIATAN & PELAYANAN GEREJA',
  poinIsi: [
    {
      id: '1',
      text: 'Kegiatan ibadah raya dan pelayanan akan dilaksanakan sesuai jadwal yang telah ditentukan.',
      isBold: false,
    },
    {
      id: '2',
      text: 'Seluruh pejabat dan jemaat diharapkan dapat hadir dan berpartisipasi dengan penuh sukacita.',
      isBold: false,
    },
  ],
  paragrafPenutup:
    'Demikianlah surat pemberitahuan ini kami sampaikan. Atas perhatian, dukungan doa, dan kerja sama yang baik dari seluruh jemaat dan pelayan, kami ucapkan terima kasih. Tuhan Yesus memberkati pelayanan kita bersama.',

  modeLogo: 'SATU_LOGO',
  logoKiriUrl: null,
  logoKananUrl: null,
  kopNama: 'GEREJA BETHEL INDONESIA',
  kopSub: 'JEMAAT LOKAL',
  kopBadanHukum:
    'Badan Hukum Gereja: SK Dirjen Bimas Kristen/Protestan Depag RI No.41 Thn 1972',
  kopAlamat: 'Jl. Gereja No. 1, Kota - Provinsi',
  kopKontak: 'Telp: (021) 123456 • Email: sekretariat@gereja.org',
  garisKopStyle: 'DOUBLE',
  garisKopColor: '#0f172a',

  salamPenutup: 'Dalam Kasih dan Pelayanan-Nya,',
  namaInstansiTtd: 'Majelis Jemaat Gereja',
  formatTtd: 'DUA_PEJABAT',
  signatories: [
    {
      roleKey: 'gembala',
      jabatan: 'Gembala Jemaat',
      nama: 'Pdt. Johanes Pratama, M.Th.',
      gelar: 'M.Th.',
      nomorInduk: 'NIP-2024-001',
      ttdUrl: null,
    },
    {
      roleKey: 'sekretaris',
      jabatan: 'Sekretaris Jemaat',
      nama: 'Pdp. Daniel Setiawan, S.Kom.',
      gelar: 'S.Kom.',
      nomorInduk: 'NIP-2024-002',
      ttdUrl: null,
    },
  ],
  tampilkanStempel: true,
  stempelUrl: null,
  posisiStempel: 'CENTER_OVERLAP',

  adaLampiran: false,
  judulLampiran: '',
  isiLampiran: '',
  gambarLampiranUrl: null,
}

export function generateAutoNomorSurat(kategori: KategoriSuratType, urut: number = 1): string {
  const romawi = [
    'I',
    'II',
    'III',
    'IV',
    'V',
    'VI',
    'VII',
    'VIII',
    'IX',
    'X',
    'XI',
    'XII',
  ]
  const d = new Date()
  const bulanRomawi = romawi[d.getMonth()]
  const tahun = d.getFullYear()
  const numPad = String(urut).padStart(3, '0')

  let kodeKat = 'SE'
  switch (kategori) {
    case 'UNDANGAN':
      kodeKat = 'UND'
      break
    case 'KETERANGAN':
      kodeKat = 'SK'
      break
    case 'REKOMENDASI':
      kodeKat = 'SR'
      break
    case 'TUGAS':
      kodeKat = 'ST'
      break
    case 'BAPTIS':
      kodeKat = 'BAP'
      break
    case 'PENYERAHAN_ANAK':
      kodeKat = 'SPA'
      break
    case 'PERNIKAHAN':
      kodeKat = 'NIK'
      break
    default:
      kodeKat = 'SE'
  }

  return `${numPad}/GBI-GET/${kodeKat}/${bulanRomawi}/${tahun}`
}
