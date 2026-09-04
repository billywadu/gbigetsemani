import { z } from 'zod'

export const whatsappTemplateKeyEnum = z.enum([
  'ULTAH_JEMAAT',
  'LINK_PENDAFTARAN_TAMU',
  'SAMBUTAN_TAMU_SCANNER',
  'RESPON_DOA',
  'PENDAFTARAN_DISETUJUI',
  'FOLLOWUP_PENDAFTARAN',
  'SAPAAN_JEMAAT',
  'REMINDER_PELAYAN',
])

export type WhatsAppTemplateKey = z.infer<typeof whatsappTemplateKeyEnum>

export interface WhatsAppTemplateMeta {
  key: WhatsAppTemplateKey
  title: string
  description: string
  category: 'Jemaat' | 'Tamu' | 'Pelayanan' | 'Doa'
  defaultText: string
  availableVariables: { tag: string; label: string; example: string }[]
}

export const WHATSAPP_TEMPLATES_METADATA: WhatsAppTemplateMeta[] = [
  {
    key: 'SAPAAN_JEMAAT',
    title: 'Komunikasi & Sapaan Jemaat (1-Klik)',
    description: 'Template pesan WhatsApp 1-klik untuk menyapa dan menghubungi jemaat dari Tabel & Profil Jemaat.',
    category: 'Jemaat',
    defaultText:
      'Syalom Bapak/Ibu/Sdr. {nama},\n\nSalam damai sejahtera dari Sekretariat {namaGereja}. Kami menghubungi Anda terkait keanggotaan jemaat.\n\nKiranya kasih karunia, sukacita, dan damai sejahtera Tuhan senantiasa melimpah memberkati kehidupan Anda sekeluarga! Tuhan Yesus memberkati.',
    availableVariables: [
      { tag: '{nama}', label: 'Nama Jemaat', example: 'Budi Santoso' },
      { tag: '{nij}', label: 'Nomor Induk Jemaat', example: 'NIJ-2026-0042' },
      { tag: '{kategorial}', label: 'Kategorial Usia', example: 'Pemuda' },
      { tag: '{komsel}', label: 'Kelompok Komsel', example: 'Komsel Betlehem' },
      { tag: '{namaGereja}', label: 'Nama Gereja', example: 'GBI Jemaat' },
    ],
  },
  {
    key: 'ULTAH_JEMAAT',
    title: 'Ucapan Ulang Tahun Jemaat',
    description: 'Pesan selamat ulang tahun otomatis/manual dari Dashboard & Profil Jemaat.',
    category: 'Jemaat',
    defaultText:
      'Syalom Bapak/Ibu/Sdr. {nama}, Gembala Sidang & Seluruh Pelayan {namaGereja} mengucapkan Selamat Ulang Tahun yang ke-{umur}! Kiranya kasih karunia, sukacita, dan damai sejahtera Tuhan senantiasa melimpah memberkati kehidupan Anda! (Mazmur 90:12)',
    availableVariables: [
      { tag: '{nama}', label: 'Nama Jemaat', example: 'Budi Santoso' },
      { tag: '{umur}', label: 'Usia / Umur', example: '35' },
      { tag: '{namaGereja}', label: 'Nama Gereja', example: 'GBI Jemaat' },
      { tag: '{ayatAlkitab}', label: 'Ayat Alkitab', example: 'Mazmur 90:12' },
    ],
  },
  {
    key: 'LINK_PENDAFTARAN_TAMU',
    title: 'Kirim Link Formulir Pendaftaran Jemaat',
    description: 'Pesan ajakan bergabung menjadi jemaat tetap melalui formulir mandiri.',
    category: 'Tamu',
    defaultText:
      'Syalom Bapak/Ibu/Sdr. {nama},\n\nSalam hangat dari Tim Penggembalaan {namaGereja}.\n\nApabila Bapak/Ibu/Sdr. rindu dan terbeban untuk resmi bergabung menjadi Jemaat Tetap di {namaGereja}, silakan melengkapi data diri pada Formulir Pendaftaran Mandiri resmi melalui tautan berikut:\n👉 {linkFormulir}\n\nSetelah formulir dikirimkan, sekretariat gereja akan memverifikasi dan menerbitkan Nomor Induk Jemaat (NIJ) serta Kartu Digital Anda.\n\nKiranya kasih karunia dan damai sejahtera Tuhan Yesus Kristus senantiasa menyertai kita semua! (1 Korintus 12:12-13)',
    availableVariables: [
      { tag: '{nama}', label: 'Nama Tamu', example: 'Dewi Lestari' },
      { tag: '{namaGereja}', label: 'Nama Gereja', example: 'GBI Jemaat' },
      { tag: '{linkFormulir}', label: 'Link Pendaftaran', example: 'https://gereja.org/daftar' },
    ],
  },
  {
    key: 'SAMBUTAN_TAMU_SCANNER',
    title: 'Penyambutan Tamu Scanner Ibadah',
    description: 'Pesan terima kasih telah hadir beribadah saat tamu check-in di terminal scanner.',
    category: 'Tamu',
    defaultText:
      'Syalom Bapak/Ibu/Sdr. {nama}, terima kasih telah hadir beribadah bersama kami di {namaEvent} ({namaGereja}) hari ini. Kiranya hadirat dan firman Tuhan senantiasa memberkati serta menguatkan kehidupan Anda!',
    availableVariables: [
      { tag: '{nama}', label: 'Nama Tamu', example: 'Hendro Wijaya' },
      { tag: '{namaEvent}', label: 'Nama Ibadah / Event', example: 'Ibadah Raya 1' },
      { tag: '{namaGereja}', label: 'Nama Gereja', example: 'GBI Jemaat' },
    ],
  },
  {
    key: 'RESPON_DOA',
    title: 'Respon & Penguatan Permohonan Doa',
    description: 'Pesan dari tim pastoral / pendoa untuk menindaklanjuti pokok doa jemaat.',
    category: 'Doa',
    defaultText:
      'Syalom Bapak/Ibu/Sdr. {nama},\n\nKami dari Tim Doa {namaGereja} telah menerima permohonan doa Anda mengenai {kategoriDoa}. Bersama hamba-hamba Tuhan, kami turut bersatu hati menaikkan doa permohonan Anda ke hadirat Bapa di surga.\n\n"Sebab rancangan-Ku bukanlah rancanganmu, dan jalanmu bukanlah jalan-Ku, demikianlah firman TUHAN." (Yesaya 55:8)\n\nTetap teguh dalam iman, pengharapan, dan kasih Tuhan Yesus Kristus.',
    availableVariables: [
      { tag: '{nama}', label: 'Nama Pemohon Doa', example: 'Maria Magdalena' },
      { tag: '{kategoriDoa}', label: 'Kategori Pokok Doa', example: 'Kesehatan' },
      { tag: '{namaGereja}', label: 'Nama Gereja', example: 'GBI Jemaat' },
      { tag: '{namaPendoa}', label: 'Nama Pendoa', example: 'Pdt. Andreas' },
    ],
  },
  {
    key: 'PENDAFTARAN_DISETUJUI',
    title: 'Konfirmasi Penerimaan Jemaat Baru & NIJ',
    description: 'Notifikasi bahwa pendaftaran jemaat telah diverifikasi dan diterima resmi.',
    category: 'Jemaat',
    defaultText:
      'Syalom Bapak/Ibu/Sdr. {nama},\n\nPendaftaran keanggotaan jemaat Anda di {namaGereja} telah BERHASIL diverifikasi dan disetujui.\n\nNomor Induk Jemaat (NIJ) Anda: {nij}\n\nAnda dapat melihat dan mengunduh Kartu Digital Jemaat Anda melalui tautan berikut:\n👉 {linkProfil}\n\nSelamat bertumbuh dan berbuah bersama keluarga besar {namaGereja}!',
    availableVariables: [
      { tag: '{nama}', label: 'Nama Jemaat', example: 'Yohanes Pratama' },
      { tag: '{nij}', label: 'Nomor Induk Jemaat', example: 'NIJ-2026-0042' },
      { tag: '{namaGereja}', label: 'Nama Gereja', example: 'GBI Jemaat' },
      { tag: '{linkProfil}', label: 'Link Kartu Digital', example: 'https://gereja.org/profil-jemaat' },
    ],
  },
  {
    key: 'FOLLOWUP_PENDAFTARAN',
    title: 'Follow-up Calon Jemaat (Antrean Pendaftaran)',
    description: 'Pesan konfirmasi / follow-up untuk permohonan pendaftaran mandiri yang sedang diproses.',
    category: 'Jemaat',
    defaultText:
      'Syalom Bapak/Ibu/Sdr. {nama},\n\nSalam damai sejahtera dari Sekretariat {namaGereja}. Kami sedang memproses permohonan pendaftaran keanggotaan jemaat baru atas nama Anda. Apabila ada data berkas yang perlu dikonfirmasi lebih lanjut, tim sekretariat kami akan segera membantu Anda.\n\nTerima kasih dan Tuhan Yesus memberkati.',
    availableVariables: [
      { tag: '{nama}', label: 'Nama Pendaftar', example: 'Dewi Lestari' },
      { tag: '{namaGereja}', label: 'Nama Gereja', example: 'GBI Jemaat' },
    ],
  },
  {
    key: 'REMINDER_PELAYAN',
    title: 'Pengingat Jadwal Pelayanan',
    description: 'Pesan pengingat tugas pelayanan ibadah kepada pelayan jemaat.',
    category: 'Pelayanan',
    defaultText:
      'Syalom Pelayan Tuhan {nama},\n\nMengingatkan jadwal tugas pelayanan Anda pada:\n- Ibadah/Acara: {namaEvent}\n- Bidang Tugas: {bidangPelayanan}\n- Tanggal/Waktu: {tanggal} ({waktu})\n\nMari persiapkan hati dan raga untuk melayani Raja di atas segala raja dengan sukacita dan keunggulan. Tuhan memberkati pelayanan kita!',
    availableVariables: [
      { tag: '{nama}', label: 'Nama Pelayan', example: 'David Timothy' },
      { tag: '{bidangPelayanan}', label: 'Bidang Pelayanan', example: 'Pemusik (Keyboard)' },
      { tag: '{namaEvent}', label: 'Nama Ibadah / Acara', example: 'Ibadah Raya Minggu Pagi' },
      { tag: '{tanggal}', label: 'Tanggal Pelayanan', example: 'Minggu, 6 September 2026' },
      { tag: '{waktu}', label: 'Waktu / Jam', example: '08:30 WIB' },
      { tag: '{namaGereja}', label: 'Nama Gereja', example: 'GBI Jemaat' },
    ],
  },
]

export const whatsappTemplatesConfigSchema = z.object({
  SAPAAN_JEMAAT: z.string().min(10, 'Template minimal 10 karakter'),
  ULTAH_JEMAAT: z.string().min(10, 'Template minimal 10 karakter'),
  LINK_PENDAFTARAN_TAMU: z.string().min(10, 'Template minimal 10 karakter'),
  SAMBUTAN_TAMU_SCANNER: z.string().min(10, 'Template minimal 10 karakter'),
  RESPON_DOA: z.string().min(10, 'Template minimal 10 karakter'),
  PENDAFTARAN_DISETUJUI: z.string().min(10, 'Template minimal 10 karakter'),
  FOLLOWUP_PENDAFTARAN: z.string().min(10, 'Template minimal 10 karakter'),
  REMINDER_PELAYAN: z.string().min(10, 'Template minimal 10 karakter'),
})

export type WhatsAppTemplatesConfig = z.infer<typeof whatsappTemplatesConfigSchema>

export const DEFAULT_WHATSAPP_TEMPLATES_CONFIG: WhatsAppTemplatesConfig = {
  SAPAAN_JEMAAT: WHATSAPP_TEMPLATES_METADATA.find((m) => m.key === 'SAPAAN_JEMAAT')!.defaultText,
  ULTAH_JEMAAT: WHATSAPP_TEMPLATES_METADATA.find((m) => m.key === 'ULTAH_JEMAAT')!.defaultText,
  LINK_PENDAFTARAN_TAMU: WHATSAPP_TEMPLATES_METADATA.find((m) => m.key === 'LINK_PENDAFTARAN_TAMU')!.defaultText,
  SAMBUTAN_TAMU_SCANNER: WHATSAPP_TEMPLATES_METADATA.find((m) => m.key === 'SAMBUTAN_TAMU_SCANNER')!.defaultText,
  RESPON_DOA: WHATSAPP_TEMPLATES_METADATA.find((m) => m.key === 'RESPON_DOA')!.defaultText,
  PENDAFTARAN_DISETUJUI: WHATSAPP_TEMPLATES_METADATA.find((m) => m.key === 'PENDAFTARAN_DISETUJUI')!.defaultText,
  FOLLOWUP_PENDAFTARAN: WHATSAPP_TEMPLATES_METADATA.find((m) => m.key === 'FOLLOWUP_PENDAFTARAN')!.defaultText,
  REMINDER_PELAYAN: WHATSAPP_TEMPLATES_METADATA.find((m) => m.key === 'REMINDER_PELAYAN')!.defaultText,
}
