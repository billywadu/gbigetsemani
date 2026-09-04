import {
  LayoutDashboard,
  Users,
  Home,
  Layers,
  UserCheck,
  Building2,
  UserPlus,
  ClipboardList,
  ClipboardCheck,
  Calendar,
  QrCode,
  Wallet,
  FileText,
  Archive,
  BookOpen,
  ShieldAlert,
  UserCog,
  Settings,
  Settings2,
  HelpCircle,
  Globe,
  HeartHandshake,
  Printer,
  Sparkles,
  type LucideIcon
} from 'lucide-react'

export type Role =
  | 'SUPER_ADMIN'
  | 'GEMBALA'
  | 'SEKRETARIS'
  | 'BENDAHARA'
  | 'SEKRETARIS_KATEGORIAL'
  | 'BENDAHARA_KATEGORIAL'
  | 'USHER'
  | 'PUBLIC'

export type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  badge?: string
  roles?: Role[]
  permission?: string
  items?: {
    title: string
    url: string
    icon?: LucideIcon
    badge?: string
    roles?: Role[]
    permission?: string
  }[]
}

export type NavGroup = {
  title: string
  roles?: Role[]
  items: NavItem[]
}

export const cmsNavigation: NavGroup[] = [
  {
    title: 'Dashboard',
    items: [
      {
        title: 'Ringkasan Utama',
        url: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Master Data',
    roles: ['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS', 'SEKRETARIS_KATEGORIAL'],
    items: [
      {
        title: 'Jemaat',
        url: '/dashboard/jemaat',
        icon: Users,
        roles: ['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'],
      },
      {
        title: 'Keluarga (KK)',
        url: '/dashboard/keluarga',
        icon: Home,
        roles: ['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'],
      },
      {
        title: 'Kategorial',
        url: '/dashboard/kategorial',
        icon: Layers,
        roles: ['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS', 'SEKRETARIS_KATEGORIAL'],
      },
      {
        title: 'Pendaftaran',
        url: '/dashboard/pendaftaran',
        icon: ClipboardCheck,
        badge: '2',
        roles: ['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'],
      },
    ],
  },
  {
    title: 'Pelayanan Pastoral',
    roles: ['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'],
    items: [
      {
        title: 'Struktur Organisasi',
        url: '/dashboard/struktur-organisasi',
        icon: Users,
      },
      {
        title: 'Pelayan Ibadah',
        url: '/dashboard/pelayan',
        icon: UserCheck,
      },
      {
        title: 'Komunitas Sel',
        url: '/dashboard/komsel',
        icon: Building2,
      },
      {
        title: 'Tamu',
        url: '/dashboard/tamu',
        icon: UserPlus,
      },
      {
        title: 'Permohonan Doa',
        url: '/dashboard/doa',
        icon: HeartHandshake,
      },
    ],
  },
  {
    title: 'Event & Presensi',
    roles: ['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS', 'SEKRETARIS_KATEGORIAL', 'USHER'],
    items: [
      {
        title: 'Jadwal & Event',
        url: '/dashboard/event',
        icon: Calendar,
        roles: ['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS', 'SEKRETARIS_KATEGORIAL'],
      },
      {
        title: 'Scanner QR Presensi',
        url: '/scan/event-raya',
        icon: QrCode,
        roles: ['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS', 'SEKRETARIS_KATEGORIAL', 'USHER'],
      },
    ],
  },
  {
    title: 'Keuangan Gereja',
    roles: ['SUPER_ADMIN', 'GEMBALA', 'BENDAHARA', 'BENDAHARA_KATEGORIAL'],
    items: [
      {
        title: 'Ringkasan Kas',
        url: '/dashboard/keuangan',
        icon: Wallet,
        roles: ['SUPER_ADMIN', 'GEMBALA', 'BENDAHARA', 'BENDAHARA_KATEGORIAL'],
      },
      {
        title: 'Laporan Gabungan',
        url: '/dashboard/keuangan/laporan-gabungan',
        icon: FileText,
        roles: ['SUPER_ADMIN', 'GEMBALA', 'BENDAHARA'],
      },
    ],
  },
  {
    title: 'Dokumen & Arsip',
    roles: ['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'],
    items: [
      {
        title: 'Generator Surat Resmi',
        url: '/dashboard/surat',
        icon: Sparkles,
      },
      {
        title: 'Dokumen Vault Jemaat',
        url: '/dashboard/dokumen-jemaat',
        icon: FileText,
      },
      {
        title: 'Arsip Gereja & SK',
        url: '/dashboard/arsip-gereja',
        icon: Archive,
      },
    ],
  },
  {
    title: 'Publikasi & Konten',
    roles: ['SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS'],
    items: [
      {
        title: 'Artikel',
        url: '/dashboard/artikel',
        icon: BookOpen,
      },
    ],
  },
  {
    title: 'Pengaturan Aplikasi',
    roles: ['SUPER_ADMIN', 'GEMBALA'],
    items: [
      {
        title: 'Profil & Sejarah Gereja',
        url: '/dashboard/settings/profil-gereja',
        icon: Building2,
      },
      {
        title: 'Pengaturan Aplikasi',
        url: '/dashboard/settings',
        icon: Settings2,
      },
      {
        title: 'Landing Page',
        url: '/dashboard/settings/landing-page',
        icon: Globe,
      },
      {
        title: 'Pengaturan Cetak & PDF',
        url: '/dashboard/settings/cetak',
        icon: Printer,
      },
    ],
  },
  {
    title: 'SISTEM',
    roles: ['SUPER_ADMIN'],
    items: [
      {
        title: 'Pengguna & Hak Akses',
        url: '/dashboard/users',
        icon: UserCog,
      },
      {
        title: 'Audit Trail SHA-256',
        url: '/dashboard/audit',
        icon: ShieldAlert,
      },
    ],
  },
]
