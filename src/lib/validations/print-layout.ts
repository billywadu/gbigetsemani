import { z } from 'zod'

export const signatoryConfigSchema = z.object({
  nama: z.string().min(1, 'Nama pejabat wajib diisi'),
  gelar: z.string().optional().default(''),
  jabatan: z.string().min(1, 'Jabatan wajib diisi'),
  nomorInduk: z.string().optional().default(''),
  ttdUrl: z.string().nullable().optional().default(null),
  cloudinaryPublicId: z.string().nullable().optional().default(null),
})

export type SignatoryConfig = z.infer<typeof signatoryConfigSchema>

export const printLayoutConfigSchema = z.object({
  // 1. Identitas Kop Surat Resmi Gereja
  kop: z.object({
    namaGereja: z.string().min(3, 'Nama gereja wajib diisi').default('GEREJA BETH-EL INDONESIA'),
    subJudul: z.string().default('Jln. Gereja No. 1, Kota - Provinsi'),
    kontak: z.string().default('Telp: (021) 123456 | Email: info@gereja.org | Web: www.gereja.org'),
    nomorIzin: z.string().default('SK Sinode GBI No. 123/GBI/2005 - Kemenag RI No. 45/2010'),
    logoUrl: z.string().nullable().default(null),
    logoCloudinaryId: z.string().nullable().default(null),
    garisKopColor: z.string().default('#0f172a'),
    garisKopStyle: z.enum(['SINGLE', 'DOUBLE', 'GOLD', 'NAVY']).default('DOUBLE'),
    tampilkanLogo: z.boolean().default(true),
  }),

  // 2. Data Pejabat & Tanda Tangan
  signatories: z.object({
    gembala: signatoryConfigSchema.default({
      nama: 'Pdt. Andreas Wijaya',
      gelar: 'M.Th.',
      jabatan: 'Gembala Jemaat / Senior Pastor',
      nomorInduk: 'SINODE-GBI-98421',
      ttdUrl: null,
      cloudinaryPublicId: null,
    }),
    sekretaris: signatoryConfigSchema.default({
      nama: 'Pnt. Hendra Gunawan',
      gelar: 'S.Kom.',
      jabatan: 'Sekretaris Majelis Jemaat',
      nomorInduk: 'SMJ-GBI-042',
      ttdUrl: null,
      cloudinaryPublicId: null,
    }),
    bendahara: signatoryConfigSchema.default({
      nama: 'Timotius Pratama',
      gelar: 'S.E., Ak.',
      jabatan: 'Bendahara Jemaat',
      nomorInduk: 'BEN-GBI-019',
      ttdUrl: null,
      cloudinaryPublicId: null,
    }),
    ketuaMajelis: signatoryConfigSchema.default({
      nama: 'Pnt. Dr. Markus Salim',
      gelar: 'M.Pd.K.',
      jabatan: 'Ketua Majelis Jemaat',
      nomorInduk: 'KMJ-GBI-007',
      ttdUrl: null,
      cloudinaryPublicId: null,
    }),
    koordinatorDivisi: signatoryConfigSchema.default({
      nama: 'Hanna Natalia',
      gelar: 'S.Sos.',
      jabatan: 'Koordinator Divisi Pelayanan & Acara',
      nomorInduk: 'KOR-GBI-088',
      ttdUrl: null,
      cloudinaryPublicId: null,
    }),
    pembinaKategorial: signatoryConfigSchema.default({
      nama: 'Ev. Yohanes Prasetyo',
      gelar: 'S.Th.',
      jabatan: 'Koordinator Departemen Kategorial',
      nomorInduk: 'KAT-GBI-012',
      ttdUrl: null,
      cloudinaryPublicId: null,
    }),
    koordinatorKomsel: signatoryConfigSchema.default({
      nama: 'Pnt. Samuel Kurniawan',
      gelar: 'S.E.',
      jabatan: 'Koordinator Komunitas Sel (Komsel)',
      nomorInduk: 'KMS-GBI-033',
      ttdUrl: null,
      cloudinaryPublicId: null,
    }),
    ketuaPendidikan: signatoryConfigSchema.default({
      nama: 'Pdt. Dr. Debora Setiawan',
      gelar: 'M.Th., D.Min.',
      jabatan: 'Kepala Biro Pengajaran & Kurikulum',
      nomorInduk: 'EDU-GBI-005',
      ttdUrl: null,
      cloudinaryPublicId: null,
    }),
  }),

  // 3. Stempel Resmi Gereja
  stempel: z.object({
    stempelUrl: z.string().nullable().default(null),
    stempelCloudinaryId: z.string().nullable().default(null),
    tampilkanStempel: z.boolean().default(true),
    posisiStempel: z.enum(['GEMBALA', 'SEKRETARIS', 'BENDAHARA', 'KETUA_MAJELIS']).default('GEMBALA'),
    ukuran: z.enum(['AUTO', 'SMALL', 'MEDIUM', 'LARGE']).default('AUTO'),
    rotasi: z.number().default(-6),
    opacity: z.number().default(0.85),
    posisiOffset: z.enum(['OVERLAP_RIGHT', 'OVERLAP_LEFT', 'CENTER', 'AUTO']).default('OVERLAP_RIGHT'),
  }),

  // 4. Opsi Format Tampilan Global
  options: z.object({
    modeTandaTangan: z.enum(['DIGITAL_IMAGE', 'MANUAL_LINE', 'BOTH']).default('DIGITAL_IMAGE'),
    tampilkanWatermarkAudit: z.boolean().default(true),
    tampilkanNomorHalaman: z.boolean().default(true),
    ukuranKertasDefault: z.enum(['A4', 'F4']).default('A4'),
    orientasiDefault: z.enum(['PORTRAIT', 'LANDSCAPE']).default('PORTRAIT'),
    catatanKakiResmi: z.string().default('Dokumen ini dicetak resmi dari Sistem Informasi Manajemen Gereja.'),
  }),

  // 5. Pengaturan Tema Warna Khusus Kartu Tanda Anggota (KTA)
  kta: z.object({
    theme: z.enum([
      'NAVY_GOLD',     // Deep Navy & Gold Line (Default GBI)
      'EMERALD_GOLD',  // Emerald Green & Gold Accent
      'BURGUNDY_GOLD', // Wine Burgundy & Gold Accent
      'ROYAL_BLUE',    // Royal Sapphire & Cyan Accent
      'PURPLE_GOLD',   // Majestic Purple & Gold Accent
      'SLATE_DARK',    // Dark Slate Modern Monochrome
      'CUSTOM',        // Kustom Warna Sendiri
    ]).default('NAVY_GOLD'),
    customColor1: z.string().default('#0f172a'),
    customColor2: z.string().default('#1e3a8a'),
    accentColor: z.string().default('#eab308'),
  }).default({
    theme: 'NAVY_GOLD',
    customColor1: '#0f172a',
    customColor2: '#1e3a8a',
    accentColor: '#eab308',
  }),
})

export type PrintLayoutConfig = z.infer<typeof printLayoutConfigSchema>

export const KTA_THEME_PRESETS = [
  {
    id: 'NAVY_GOLD',
    name: 'Royal Navy & Gold',
    desc: 'Tema biru tua formal dengan aksen garis emas berkilau (Resmi Gereja)',
    color1: '#0f172a',
    color2: '#1e3a8a',
    accent: '#eab308',
    previewGradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
    accentGradient: 'linear-gradient(90deg, #eab308, #f59e0b, #d97706)',
  },
  {
    id: 'EMERALD_GOLD',
    name: 'Emerald & Gold',
    desc: 'Warna hijau zamrud elegan lambang pertumbuhan rohani',
    color1: '#064e3b',
    color2: '#047857',
    accent: '#f59e0b',
    previewGradient: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
    accentGradient: 'linear-gradient(90deg, #f59e0b, #d97706, #b45309)',
  },
  {
    id: 'BURGUNDY_GOLD',
    name: 'Burgundy & Gold',
    desc: 'Warna merah anggur anggun dengan sentuhan emas mulia',
    color1: '#4c0519',
    color2: '#9f1239',
    accent: '#fbbf24',
    previewGradient: 'linear-gradient(135deg, #4c0519 0%, #9f1239 100%)',
    accentGradient: 'linear-gradient(90deg, #fbbf24, #d97706, #b45309)',
  },
  {
    id: 'ROYAL_BLUE',
    name: 'Royal Sapphire',
    desc: 'Nuansa biru safir bercahaya dengan aksen cyan modern',
    color1: '#1e1b4b',
    color2: '#2563eb',
    accent: '#38bdf8',
    previewGradient: 'linear-gradient(135deg, #1e1b4b 0%, #2563eb 100%)',
    accentGradient: 'linear-gradient(90deg, #38bdf8, #0284c7, #0369a1)',
  },
  {
    id: 'PURPLE_GOLD',
    name: 'Majestic Purple',
    desc: 'Ungu agung lambang kepemimpinan & kemuliaan kerajaan surga',
    color1: '#3b0764',
    color2: '#7e22ce',
    accent: '#facc15',
    previewGradient: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 100%)',
    accentGradient: 'linear-gradient(90deg, #facc15, #eab308, #ca8a04)',
  },
  {
    id: 'SLATE_DARK',
    name: 'Dark Slate Monochrome',
    desc: 'Gaya monokrom gelap modern, minimalis dan berwibawa',
    color1: '#020617',
    color2: '#334155',
    accent: '#94a3b8',
    previewGradient: 'linear-gradient(135deg, #020617 0%, #334155 100%)',
    accentGradient: 'linear-gradient(90deg, #94a3b8, #64748b, #475569)',
  },
  {
    id: 'CUSTOM',
    name: 'Kustom Mandiri (Custom)',
    desc: 'Pilih kombinasi warna gradien dan garis aksen Anda sendiri',
    color1: '#0f172a',
    color2: '#1e3a8a',
    accent: '#eab308',
    previewGradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
    accentGradient: 'linear-gradient(90deg, #eab308, #f59e0b, #d97706)',
  },
] as const

export function getKtaThemeColors(kta?: PrintLayoutConfig['kta']) {
  const theme = kta?.theme || 'NAVY_GOLD'
  switch (theme) {
    case 'EMERALD_GOLD':
      return {
        bgGradient: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
        accentGradient: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
        subColor: '#a7f3d0',
        statusBg: '#10b981',
      }
    case 'BURGUNDY_GOLD':
      return {
        bgGradient: 'linear-gradient(135deg, #4c0519 0%, #9f1239 100%)',
        accentGradient: 'linear-gradient(90deg, #fbbf24 0%, #d97706 100%)',
        subColor: '#fecdd3',
        statusBg: '#e11d48',
      }
    case 'ROYAL_BLUE':
      return {
        bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #2563eb 100%)',
        accentGradient: 'linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)',
        subColor: '#bae6fd',
        statusBg: '#0284c7',
      }
    case 'PURPLE_GOLD':
      return {
        bgGradient: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 100%)',
        accentGradient: 'linear-gradient(90deg, #facc15 0%, #ca8a04 100%)',
        subColor: '#e9d5ff',
        statusBg: '#a855f7',
      }
    case 'SLATE_DARK':
      return {
        bgGradient: 'linear-gradient(135deg, #020617 0%, #334155 100%)',
        accentGradient: 'linear-gradient(90deg, #94a3b8 0%, #64748b 100%)',
        subColor: '#cbd5e1',
        statusBg: '#475569',
      }
    case 'CUSTOM':
      return {
        bgGradient: `linear-gradient(135deg, ${kta?.customColor1 || '#0f172a'} 0%, ${kta?.customColor2 || '#1e3a8a'} 100%)`,
        accentGradient: `linear-gradient(90deg, ${kta?.accentColor || '#eab308'} 0%, ${kta?.accentColor || '#d97706'} 100%)`,
        subColor: '#93c5fd',
        statusBg: '#10b981',
      }
    case 'NAVY_GOLD':
    default:
      return {
        bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
        accentGradient: 'linear-gradient(90deg, #eab308 0%, #f59e0b 50%, #d97706 100%)',
        subColor: '#93c5fd',
        statusBg: '#10b981',
      }
  }
}

export const DEFAULT_PRINT_LAYOUT_CONFIG: PrintLayoutConfig = {
  kop: {
    namaGereja: 'GEREJA BETH-EL INDONESIA',
    subJudul: 'Jln. Gereja No. 1, Kota - Provinsi',
    kontak: 'Telp: (021) 123456 | Email: info@gereja.org | Web: www.gereja.org',
    nomorIzin: 'SK Sinode GBI No. 123/GBI/2005 - Kemenag RI No. 45/2010',
    logoUrl: null,
    logoCloudinaryId: null,
    garisKopColor: '#0f172a',
    garisKopStyle: 'DOUBLE',
    tampilkanLogo: true,
  },
  signatories: {
    gembala: {
      nama: 'Pdt. Andreas Wijaya',
      gelar: 'M.Th.',
      jabatan: 'Gembala Jemaat / Senior Pastor',
      nomorInduk: 'SINODE-GBI-98421',
      ttdUrl: null,
      cloudinaryPublicId: null,
    },
    sekretaris: {
      nama: 'Pnt. Hendra Gunawan',
      gelar: 'S.Kom.',
      jabatan: 'Sekretaris Majelis Jemaat',
      nomorInduk: 'SMJ-GBI-042',
      ttdUrl: null,
      cloudinaryPublicId: null,
    },
    bendahara: {
      nama: 'Timotius Pratama',
      gelar: 'S.E., Ak.',
      jabatan: 'Bendahara Jemaat',
      nomorInduk: 'BEN-GBI-019',
      ttdUrl: null,
      cloudinaryPublicId: null,
    },
    ketuaMajelis: {
      nama: 'Pnt. Dr. Markus Salim',
      gelar: 'M.Pd.K.',
      jabatan: 'Ketua Majelis Jemaat',
      nomorInduk: 'KMJ-GBI-007',
      ttdUrl: null,
      cloudinaryPublicId: null,
    },
    koordinatorDivisi: {
      nama: 'Hanna Natalia',
      gelar: 'S.Sos.',
      jabatan: 'Koordinator Divisi Pelayanan & Acara',
      nomorInduk: 'KOR-GBI-088',
      ttdUrl: null,
      cloudinaryPublicId: null,
    },
    pembinaKategorial: {
      nama: 'Ev. Yohanes Prasetyo',
      gelar: 'S.Th.',
      jabatan: 'Koordinator Departemen Kategorial',
      nomorInduk: 'KAT-GBI-012',
      ttdUrl: null,
      cloudinaryPublicId: null,
    },
    koordinatorKomsel: {
      nama: 'Pnt. Samuel Kurniawan',
      gelar: 'S.E.',
      jabatan: 'Koordinator Komunitas Sel (Komsel)',
      nomorInduk: 'KMS-GBI-033',
      ttdUrl: null,
      cloudinaryPublicId: null,
    },
    ketuaPendidikan: {
      nama: 'Pdt. Dr. Debora Setiawan',
      gelar: 'M.Th., D.Min.',
      jabatan: 'Kepala Biro Pengajaran & Kurikulum',
      nomorInduk: 'EDU-GBI-005',
      ttdUrl: null,
      cloudinaryPublicId: null,
    },
  },
  stempel: {
    stempelUrl: null,
    stempelCloudinaryId: null,
    tampilkanStempel: true,
    posisiStempel: 'GEMBALA',
    ukuran: 'AUTO',
    rotasi: -6,
    opacity: 0.85,
    posisiOffset: 'OVERLAP_RIGHT',
  },
  options: {
    modeTandaTangan: 'DIGITAL_IMAGE',
    tampilkanWatermarkAudit: true,
    tampilkanNomorHalaman: true,
    ukuranKertasDefault: 'A4',
    orientasiDefault: 'PORTRAIT',
    catatanKakiResmi: 'Dokumen ini dicetak resmi dari Sistem Informasi Manajemen Gereja.',
  },
  kta: {
    theme: 'NAVY_GOLD',
    customColor1: '#0f172a',
    customColor2: '#1e3a8a',
    accentColor: '#eab308',
  },
}
