import { z } from 'zod'

// ── 1. Section Order Item Schema ───────────────────────────────────────
export const sectionIdEnum = z.enum([
  'hero',
  'quickActions',
  'eventBanner',
  'khotbah',
  'socialMedia',
  'bibleStudy',
  'zoom',
  'schedule',
  // Legacy aliases
  'services',
  'materi',
  'contact',
])

export type SectionId = z.infer<typeof sectionIdEnum>

export const sectionOrderItemSchema = z.object({
  id: sectionIdEnum,
  title: z.string().min(1),
  enabled: z.boolean().default(true),
  order: z.number().int().min(1),
})

export type SectionOrderItem = z.infer<typeof sectionOrderItemSchema>

// ── 2. Top Bar Info Schema ─────────────────────────────────────────────
export const topBarConfigSchema = z.object({
  enabled: z.boolean().default(true),
  jadwalText: z.string().default('Ibadah Raya: Minggu 08.00 & 10.30 WIB'),
  hotlineText: z.string().default('Hotline Doa & Konseling: (0751) 34567 / 0812-3456-7890'),
  rekeningText: z.string().default('BCA 1234567890 a/n GBI Getsemani'),
  rekeningDetail: z.string().default('Bank Central Asia (BCA) - No. Rek: 1234567890 a/n GBI Getsemani Padang'),
})

export type TopBarConfig = z.infer<typeof topBarConfigSchema>

// ── 3. Hero Video Section Schema ───────────────────────────────────────
export const heroConfigSchema = z.object({
  badgeText: z.string().default('Kepatuhan UU Perlindungan Data Pribadi (UU PDP No. 27/2022)'),
  titlePrefix: z.string().default('Gereja Yang Membawa'),
  titleHighlight: z.string().default('Pemulihan Hidup'),
  rotatingWords: z.array(z.string()).default([
    'Pemulihan',
    'Transformasi',
    'Pengharapan',
    'Kasih Karunia',
  ]),
  description: z.string().default(
    'Berakar kuat dalam firman, bersekutu dalam kasih Kristus, melayani sesama, dan mentransformasi generasi.'
  ),
  videoUrl: z
    .string()
    .default(
      'https://assets.mixkit.co/videos/preview/mixkit-hands-raised-in-a-concert-or-worship-event-42354-large.mp4'
    ),
  videoPosterUrl: z
    .string()
    .default(
      'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1920&q=80'
    ),
  ctaDaftarText: z.string().default('Jadwal Ibadah Minggu'),
  ctaDaftarUrl: z.string().default('#jadwal'),
  ctaDaftarEnabled: z.boolean().default(true),
  ctaVerifikasiText: z.string().default('Permohonan Doa'),
  ctaVerifikasiUrl: z.string().default('/doa'),
  ctaVerifikasiEnabled: z.boolean().default(true),
})

export type HeroConfig = z.infer<typeof heroConfigSchema>

// ── 4. Quick Action Item Schema ─────────────────────────────────────────
export const quickActionIconEnum = z.enum([
  'HeartHandshake',
  'BookOpen',
  'Video',
  'Calendar',
  'UserPlus',
  'Search',
  'Users',
  'MapPin',
  'ShieldCheck',
  'QrCode',
  'Phone',
])

export type QuickActionIcon = z.infer<typeof quickActionIconEnum>

export const quickActionItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  buttonText: z.string().default('Buka'),
  linkUrl: z.string().min(1),
  icon: quickActionIconEnum,
  enabled: z.boolean().default(true),
})

export type QuickActionItem = z.infer<typeof quickActionItemSchema>

export const quickActionsConfigSchema = z.object({
  sectionTitle: z.string().default('Akses Cepat Layanan Jemaat'),
  sectionSubtitle: z.string().default('Akses mandiri permohonan doa, warta firman, pendaftaran, dan layanan gereja.'),
  items: z.array(quickActionItemSchema).default([]),
})

export type QuickActionsConfig = z.infer<typeof quickActionsConfigSchema>

// Legacy alias for servicesConfig
export const serviceItemSchema = quickActionItemSchema
export type ServiceItem = QuickActionItem
export const servicesConfigSchema = quickActionsConfigSchema
export type ServicesConfig = QuickActionsConfig

// ── 5. Event Banner Carousel Schema ────────────────────────────────────
export const eventBannerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sectionTitle: z.string().default('Warta & Agenda Kegiatan Terkini'),
  sectionSubtitle: z.string().default('Ikuti berbagai kegiatan rohani, persekutuan kategorial, dan seminar yang memberkati.'),
  limit: z.number().int().min(1).max(10).default(6),
  autoPlayInterval: z.number().int().min(2000).max(15000).default(5000),
})

export type EventBannerConfig = z.infer<typeof eventBannerConfigSchema>

// ── 6. Section 1: Ringkasan Khotbah Schema ──────────────────────────────
export const khotbahConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sectionTitle: z.string().default('RINGKASAN KHOTBAH'),
  sectionSubtitle: z.string().default('Intisari firman Tuhan dan khotbah mingguan dari mimbar GBI Getsemani.'),
  kategoriId: z.string().nullable().default(null),
  limit: z.number().int().min(2).max(12).default(4),
})

export type KhotbahConfig = z.infer<typeof khotbahConfigSchema>

// ── 7. Section 2: Social Media Hub Schema ──────────────────────────────
export const socialMediaConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sectionTitle: z.string().default('Terhubung & Bertumbuh Bersama Kami'),
  sectionSubtitle: z.string().default(
    'Ikuti siaran langsung ibadah raya, warta kegiatan harian, dan renungan rohani di kanal sosial media resmi gereja.'
  ),
  youtubeUrl: z.string().default('https://youtube.com/@gbigetsemanipadang'),
  youtubeLabel: z.string().default('Live Streaming & Khotbah'),
  instagramUrl: z.string().default('https://instagram.com/gbigetsemanipadang'),
  instagramLabel: z.string().default('Warta & Foto Kegiatan'),
  tiktokUrl: z.string().default('https://tiktok.com/@gbigetsemani'),
  tiktokLabel: z.string().default('Inspirasi Firman 1 Menit'),
  whatsappUrl: z.string().default('https://wa.me/6281234567890'),
  whatsappLabel: z.string().default('Layanan Doa & Informasi'),
  spotifyUrl: z.string().default('https://open.spotify.com'),
  spotifyLabel: z.string().default('Podcast Renungan Firman'),
})

export type SocialMediaConfig = z.infer<typeof socialMediaConfigSchema>

// ── 8. Section 3: Bible Study & Pemuridan Schema ───────────────────────
export const bibleStudyConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sectionTitle: z.string().default('BIBLE STUDY & PEMURIDAN'),
  sectionSubtitle: z.string().default('Pendalaman Alkitab tematik, modul pemuridan, dan fondasi pengajaran iman Kristen.'),
  kategoriId: z.string().nullable().default(null),
  limit: z.number().int().min(2).max(12).default(4),
})

export type BibleStudyConfig = z.infer<typeof bibleStudyConfigSchema>

// ── 9. Section 4: Zoom & Doa Online Schema ─────────────────────────────
export const zoomCardItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  hariJam: z.string().min(1),
  deskripsi: z.string().default(''),
  meetingId: z.string().default('842 9182 3019'),
  passcode: z.string().default('GETSEMANI'),
  linkUrl: z.string().default('https://zoom.us/j/84291823019'),
  bannerUrl: z.string().optional(),
})

export type ZoomCardItem = z.infer<typeof zoomCardItemSchema>

export const zoomConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sectionTitle: z.string().default('ZOOM & MEZBAH DOA ONLINE'),
  sectionSubtitle: z.string().default('Bergabunglah bersama saudara seiman dalam mezbah doa fajar dan persekutuan daring.'),
  kategoriId: z.string().nullable().default(null),
  meetingIdDefault: z.string().default('842 9182 3019'),
  passcodeDefault: z.string().default('GETSEMANI'),
  zoomUrlDefault: z.string().default('https://zoom.us/j/84291823019'),
  cards: z.array(zoomCardItemSchema).default([]),
})

export type ZoomConfig = z.infer<typeof zoomConfigSchema>

// ── 10. Jadwal Ibadah Schema (Schedule) ────────────────────────────────
export const scheduleItemSchema = z.object({
  id: z.string(),
  nama: z.string().min(1, 'Nama ibadah wajib diisi'),
  hari: z.string().min(1, 'Hari wajib diisi'),
  jam: z.string().min(1, 'Jam wajib diisi'),
  lokasi: z.string().min(1, 'Lokasi wajib diisi'),
  deskripsi: z.string().default(''),
  enabled: z.boolean().default(true),
  order: z.number().int().default(1),
})

export type ScheduleItem = z.infer<typeof scheduleItemSchema>

export const scheduleConfigSchema = z.object({
  sectionTitle: z.string().default('Jadwal Ibadah Gereja'),
  sectionSubtitle: z.string().default('Bergabunglah bersama kami dalam persekutuan ibadah yang memberkati.'),
  items: z.array(scheduleItemSchema).default([]),
})

export type ScheduleConfig = z.infer<typeof scheduleConfigSchema>

// ── 11. Footer & Parallax Schema ───────────────────────────────────────
export const footerConfigSchema = z.object({
  churchName: z.string().default('GBI Getsemani Padang'),
  tagline: z.string().default('Gereja yang hidup, berakar dalam firman, dan membawa dampak bagi bangsa-bangsa.'),
  alamat: z.string().default('Jl. Bagindo Aziz Chan No. 34-36, Padang, Sumatera Barat 25112'),
  telepon: z.string().default('(0751) 34567 / 0812-3456-7890'),
  email: z.string().default('sekretariat@gbigetsemanipadang.org'),
  copyrightText: z.string().default('© 2026 GBI Getsemani Padang. Segala kemuliaan hanya bagi Tuhan.'),
  backgroundImageUrl: z
    .string()
    .default(
      'https://images.unsplash.com/photo-1519491058846-2bf9eb2b3394?auto=format&fit=crop&w=1920&q=80'
    ),
  parallaxEnabled: z.boolean().default(true),
})

export type FooterConfig = z.infer<typeof footerConfigSchema>

// ── 12. Legacy Materi Config Schema ────────────────────────────────────
export const materiConfigSchema = z.object({
  sectionTitle: z.string().default('Artikel & Renungan Terbaru'),
  sectionSubtitle: z.string().default('Kumpulan artikel firman Tuhan, renungan rohani, dan wawasan pelayanan jemaat.'),
  limit: z.number().int().min(3).max(12).default(6),
})

export type MateriConfig = z.infer<typeof materiConfigSchema>

// ── 13. Master Landing Page Configuration Schema ───────────────────────
export const landingPageConfigSchema = z.object({
  sections: z.array(sectionOrderItemSchema),
  topBar: topBarConfigSchema.default({} as any),
  hero: heroConfigSchema.default({} as any),
  quickActions: quickActionsConfigSchema.default({} as any),
  services: servicesConfigSchema.default({} as any), // Alias for backward compat
  eventBanner: eventBannerConfigSchema.default({} as any),
  khotbah: khotbahConfigSchema.default({} as any),
  socialMedia: socialMediaConfigSchema.default({} as any),
  bibleStudy: bibleStudyConfigSchema.default({} as any),
  zoom: zoomConfigSchema.default({} as any),
  schedule: scheduleConfigSchema.default({} as any),
  footer: footerConfigSchema.default({} as any),
  materi: materiConfigSchema.default({} as any), // Alias for backward compat
})

export type LandingPageConfig = z.infer<typeof landingPageConfigSchema>

// ── 14. DEFAULT VALUES ─────────────────────────────────────────────────
export const DEFAULT_QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'qa-1',
    title: 'Permohonan Doa',
    description: 'Sampaikan pokok doa agar didoakan oleh tim pastoral',
    buttonText: 'Kirim Doa',
    linkUrl: '/doa',
    icon: 'HeartHandshake',
    enabled: true,
  },
  {
    id: 'qa-2',
    title: 'Renungan & Khotbah',
    description: 'Kumpulan artikel firman dan renungan mingguan',
    buttonText: 'Baca Firman',
    linkUrl: '/artikel',
    icon: 'BookOpen',
    enabled: true,
  },
  {
    id: 'qa-3',
    title: 'YouTube Live',
    description: 'Siaran langsung ibadah raya & arsip khotbah',
    buttonText: 'Tonton Live',
    linkUrl: 'https://youtube.com/@gbigetsemanipadang',
    icon: 'Video',
    enabled: true,
  },
  {
    id: 'qa-4',
    title: 'Jadwal Ibadah',
    description: 'Waktu dan lokasi ibadah raya serta kategorial',
    buttonText: 'Lihat Jadwal',
    linkUrl: '#jadwal',
    icon: 'Calendar',
    enabled: true,
  },
  {
    id: 'qa-5',
    title: 'Pendaftaran Jemaat',
    description: 'Formulir bergabung menjadi anggota jemaat baru',
    buttonText: 'Daftar Mandiri',
    linkUrl: '/daftar',
    icon: 'UserPlus',
    enabled: true,
  },
  {
    id: 'qa-6',
    title: 'Cek Kartu & NIJ',
    description: 'Verifikasi status keanggotaan dan kartu digital',
    buttonText: 'Verifikasi',
    linkUrl: '/profil-jemaat',
    icon: 'Search',
    enabled: true,
  },
  {
    id: 'qa-7',
    title: 'Struktur Pelayanan',
    description: 'Badan pengurus harian dan koordinator pelayanan',
    buttonText: 'Lihat Struktur',
    linkUrl: '/struktur-organisasi',
    icon: 'Users',
    enabled: true,
  },
  {
    id: 'qa-8',
    title: 'Lokasi & Kontak',
    description: 'Alamat gereja, peta Google Maps, dan sekretariat',
    buttonText: 'Hubungi Kami',
    linkUrl: '/tentang-kami#kontak',
    icon: 'MapPin',
    enabled: true,
  },
]

export const DEFAULT_LANDING_PAGE_CONFIG: LandingPageConfig = {
  sections: [
    { id: 'hero', title: 'Hero Banner Video & Pengenalan', enabled: true, order: 1 },
    { id: 'quickActions', title: 'Akses Cepat Layanan Jemaat', enabled: true, order: 2 },
    { id: 'eventBanner', title: 'Warta & Banner Acara Terkini', enabled: true, order: 3 },
    { id: 'khotbah', title: 'Ringkasan Khotbah', enabled: true, order: 4 },
    { id: 'socialMedia', title: 'Hub Sosial Media Komunitas', enabled: true, order: 5 },
    { id: 'bibleStudy', title: 'Bible Study & Pemuridan', enabled: true, order: 6 },
    { id: 'zoom', title: 'Zoom & Mezbah Doa Online', enabled: true, order: 7 },
    { id: 'schedule', title: 'Jadwal Ibadah Gereja', enabled: true, order: 8 },
  ],
  topBar: {
    enabled: true,
    jadwalText: 'Ibadah Raya: Minggu 08.00 & 10.30 WIB',
    hotlineText: 'Hotline Doa & Konseling: (0751) 34567 / 0812-3456-7890',
    rekeningText: 'BCA 1234567890 a/n GBI Getsemani',
    rekeningDetail: 'Bank Central Asia (BCA) - No. Rek: 1234567890 a/n GBI Getsemani Padang',
  },
  hero: {
    badgeText: 'Kepatuhan UU Perlindungan Data Pribadi (UU PDP No. 27/2022)',
    titlePrefix: 'Gereja Yang Membawa',
    titleHighlight: 'Pemulihan Hidup',
    rotatingWords: ['Pemulihan', 'Transformasi', 'Pengharapan', 'Kasih Karunia'],
    description:
      'Berakar kuat dalam firman, bersekutu dalam kasih Kristus, melayani sesama, dan mentransformasi generasi.',
    videoUrl:
      'https://assets.mixkit.co/videos/preview/mixkit-hands-raised-in-a-concert-or-worship-event-42354-large.mp4',
    videoPosterUrl:
      'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1920&q=80',
    ctaDaftarText: 'Jadwal Ibadah Minggu',
    ctaDaftarUrl: '#jadwal',
    ctaDaftarEnabled: true,
    ctaVerifikasiText: 'Permohonan Doa',
    ctaVerifikasiUrl: '/doa',
    ctaVerifikasiEnabled: true,
  },
  quickActions: {
    sectionTitle: 'Akses Cepat Layanan Jemaat',
    sectionSubtitle: 'Akses mandiri permohonan doa, warta firman, pendaftaran, dan layanan gereja.',
    items: DEFAULT_QUICK_ACTIONS,
  },
  services: {
    sectionTitle: 'Layanan Publik Jemaat',
    sectionSubtitle: 'Akses mandiri untuk keanggotaan, verifikasi data, dan presensi kegiatan gereja.',
    items: DEFAULT_QUICK_ACTIONS,
  },
  eventBanner: {
    enabled: true,
    sectionTitle: 'Warta & Agenda Kegiatan Terkini',
    sectionSubtitle: 'Ikuti berbagai kegiatan rohani, persekutuan kategorial, dan seminar yang memberkati.',
    limit: 6,
    autoPlayInterval: 5000,
  },
  khotbah: {
    enabled: true,
    sectionTitle: 'RINGKASAN KHOTBAH',
    sectionSubtitle: 'Intisari firman Tuhan dan khotbah mingguan dari mimbar GBI Getsemani.',
    kategoriId: null,
    limit: 4,
  },
  socialMedia: {
    enabled: true,
    sectionTitle: 'Terhubung & Bertumbuh Bersama Kami',
    sectionSubtitle:
      'Ikuti siaran langsung ibadah raya, warta kegiatan harian, dan renungan rohani di kanal sosial media resmi gereja.',
    youtubeUrl: 'https://youtube.com/@gbigetsemanipadang',
    youtubeLabel: 'Live Streaming & Khotbah',
    instagramUrl: 'https://instagram.com/gbigetsemanipadang',
    instagramLabel: 'Warta & Foto Kegiatan',
    tiktokUrl: 'https://tiktok.com/@gbigetsemani',
    tiktokLabel: 'Inspirasi Firman 1 Menit',
    whatsappUrl: 'https://wa.me/6281234567890',
    whatsappLabel: 'Layanan Doa & Informasi',
    spotifyUrl: 'https://open.spotify.com',
    spotifyLabel: 'Podcast Renungan Firman',
  },
  bibleStudy: {
    enabled: true,
    sectionTitle: 'BIBLE STUDY & PEMURIDAN',
    sectionSubtitle: 'Pendalaman Alkitab tematik, modul pemuridan, dan fondasi pengajaran iman Kristen.',
    kategoriId: null,
    limit: 4,
  },
  zoom: {
    enabled: true,
    sectionTitle: 'ZOOM & MEZBAH DOA ONLINE',
    sectionSubtitle: 'Bergabunglah bersama saudara seiman dalam mezbah doa fajar dan persekutuan daring.',
    kategoriId: null,
    meetingIdDefault: '842 9182 3019',
    passcodeDefault: 'GETSEMANI',
    zoomUrlDefault: 'https://zoom.us/j/84291823019',
    cards: [
      {
        id: 'zm-1',
        title: 'Doa Fajar Online',
        hariJam: 'Setiap Senin – Sabtu, 05.00 WIB',
        deskripsi: 'Memulai hari dengan puji-pujian, doa syafaat, dan perenungan firman Tuhan.',
        meetingId: '842 9182 3019',
        passcode: 'GETSEMANI',
        linkUrl: 'https://zoom.us/j/84291823019',
      },
      {
        id: 'zm-2',
        title: 'Menara Doa Syafaat',
        hariJam: 'Setiap Rabu Malam, 19.30 WIB',
        deskripsi: 'Berdoa bagi pemulihan keluarga, gereja, kota, dan keselamatan bangsa-bangsa.',
        meetingId: '842 9182 3019',
        passcode: 'GETSEMANI',
        linkUrl: 'https://zoom.us/j/84291823019',
      },
    ],
  },
  schedule: {
    sectionTitle: 'Jadwal Ibadah Gereja',
    sectionSubtitle: 'Bergabunglah bersama kami dalam persekutuan ibadah yang memberkati.',
    items: [
      {
        id: 'sch-1',
        nama: 'Ibadah Raya 1 (Pagi)',
        hari: 'Minggu',
        jam: '08.00 WIB',
        lokasi: 'Main Sanctuary Lt. 1',
        deskripsi: 'Ibadah umum sesi pagi dengan puji-pujian dan firman Tuhan.',
        enabled: true,
        order: 1,
      },
      {
        id: 'sch-2',
        nama: 'Ibadah Raya 2 (Siang)',
        hari: 'Minggu',
        jam: '10.30 WIB',
        lokasi: 'Main Sanctuary Lt. 1',
        deskripsi: 'Ibadah umum sesi kedua disertai Sekolah Minggu Anak.',
        enabled: true,
        order: 2,
      },
      {
        id: 'sch-3',
        nama: 'Persekutuan Komsel (Doa & Firman)',
        hari: 'Jumat',
        jam: '19.00 WIB',
        lokasi: 'Rumah Jemaat / Multi Lokasi',
        deskripsi: 'Persekutuan kelompok sel untuk saling menguatkan iman.',
        enabled: true,
        order: 3,
      },
      {
        id: 'sch-4',
        nama: 'Ibadah Youth & Remaja',
        hari: 'Sabtu',
        jam: '19.00 WIB',
        lokasi: 'Youth Sanctuary Lt. 2',
        deskripsi: 'Ibadah pemuda, mahasiswa, dan profesional muda.',
        enabled: true,
        order: 4,
      },
    ],
  },
  footer: {
    churchName: 'GBI Getsemani Padang',
    tagline: 'Gereja yang hidup, berakar dalam firman, dan membawa dampak bagi bangsa-bangsa.',
    alamat: 'Jl. Bagindo Aziz Chan No. 34-36, Padang, Sumatera Barat 25112',
    telepon: '(0751) 34567 / 0812-3456-7890',
    email: 'sekretariat@gbigetsemanipadang.org',
    copyrightText: '© 2026 GBI Getsemani Padang. Segala kemuliaan hanya bagi Tuhan.',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1519491058846-2bf9eb2b3394?auto=format&fit=crop&w=1920&q=80',
    parallaxEnabled: true,
  },
  materi: {
    sectionTitle: 'Artikel & Renungan Terbaru',
    sectionSubtitle: 'Kumpulan artikel firman Tuhan, renungan rohani, dan wawasan pelayanan jemaat.',
    limit: 6,
  },
}
