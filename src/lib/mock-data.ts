export interface JemaatDTO {
  id: string
  nij: string
  barcodeCode: string
  nama: string
  namaPanggilan?: string
  jenisKelamin: 'LAK_LAKI' | 'PEREMPUAN'
  tempatLahir: string
  tanggalLahir: string
  noHp: string
  whatsApp: string
  email: string
  alamat: string
  kota: string
  provinsi: string
  kodePos: string
  statusJemaat: 'ACTIVE' | 'INACTIVE' | 'MOVED' | 'DECEASED' | 'SUSPENDED' | 'TAMU'
  tanggalBergabung: string
  statusBaptis: 'SUDAH_BAPTIS' | 'BELUM_BAPTIS'
  tanggalBaptis?: string
  statusPernikahan: 'BELUM_MENIKAH' | 'MENIKAH' | 'DUDA' | 'JANDA' | 'BERCERAI'
  tanggalMenikah?: string
  pekerjaan: string
  pendidikan: string
  kontakDarurat: string
  catatan?: string
  statusFollowUp?: 'NEW' | 'IN_PROGRESS' | 'NEED_VISITATION' | 'COMPLETED'
  kepalaKeluargaId?: string
  komselId?: string
  komselNama?: string
  kategorialId?: string
  kategorialNama?: string
  completenessPercentage: number
  deletedAt?: string | null
  deletedBy?: string
  deletionReason?: string
}

export interface KeluargaDTO {
  id: string
  nomorKeluarga: string
  namaKeluarga: string
  kepalaId?: string
  kepalaName?: string
  noHp: string
  alamat: string
  totalAnggota: number
  anggota: {
    id: string
    jemaatId: string
    nama: string
    relasi: 'SUAMI' | 'ISTRI' | 'ANAK' | 'ORANG_TUA' | 'MERTUA' | 'CUCU' | 'LAINNYA'
    catatanRelasi?: string
  }[]
}

export interface KategorialDTO {
  id: string
  nama: string
  deskripsi: string
  isDefault: boolean
  totalAnggota: number
  kriteria: string
}

export interface PelayanDTO {
  id: string
  jemaatId: string
  nama: string
  nij: string
  kategorialNama: string
  deskripsiTugas: string
  spesialisasi: string[]
  status: 'AKTIF' | 'CUTI'
}

export interface KomselDTO {
  id: string
  nama: string
  wilayah: string
  hari: 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' | 'MINGGU'
  jam: string
  kategorialNama: string
  koordinatorNama: string
  totalAnggota: number
}

export interface PendaftaranQueueDTO {
  id: string
  nama: string
  namaPanggilan: string
  jenisKelamin: 'LAK_LAKI' | 'PEREMPUAN'
  noHp: string
  whatsApp: string
  email: string
  alamat: string
  statusPernikahan: string
  pekerjaan: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  rejectionReason?: string
}

export interface EventDTO {
  id: string
  namaEvent: string
  kategori: 'IBADAH_RAYA' | 'KOMSEL' | 'YOUTH' | 'SEMINAR' | 'SEKOLAH_MINGGU'
  tanggal: string
  jam: string
  lokasi: string
  totalAttendance: number
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED'
}

export interface TransaksiKeuanganDTO {
  id: string
  nomorReferensi: string
  laporanScope: 'Kas Umum' | 'Kas Pemuda' | 'Kas Anak' | 'Kas Diakonia' | 'Kas Pembangunan'
  tipe: 'MASUK' | 'KELUAR'
  kategori: string
  nominal: number
  metodePembayaran: 'CASH' | 'TRANSFER' | 'QRIS'
  tanggal: string
  catatan: string
}

export interface DokumenJemaatDTO {
  id: string
  jemaatNama: string
  jemaatNij: string
  judul: string
  jenisDokumen: 'BAPTIS' | 'NIKAH' | 'PENYERAHAN_ANAK' | 'SAKSI' | 'LAINNYA'
  status: 'VERIFIED' | 'DRAFT' | 'EXPIRED'
  tanggalTerbit: string
  fileSize: string
  mimeType: string
}

export interface ArsipGerejaDTO {
  id: string
  judul: string
  jenisArsip: 'LEGALITAS' | 'NOTULEN' | 'SURAT_MASUK' | 'SURAT_KELUAR' | 'KONTRAK' | 'KEUANGAN_ARCHIVE'
  tanggalDokumen: string
  status: 'AKTIF' | 'INAKTIF' | 'PERMANEN'
  deskripsi: string
  fileSize: string
}

export interface MateriRenunganDTO {
  id: string
  judul: string
  slug: string
  kategoriNama: string
  pembicara: string
  tanggal: string
  status: 'PUBLISHED' | 'DRAFT'
  thumbnailUrl: string
  ringkasan: string
  konten: string
  totalDilihat: number
}

export interface AuditTrailDTO {
  id: string
  timestamp: string
  actor: string
  action: string
  entity: string
  entityId: string
  ip: string
  userAgent: string
  previousHash: string
  currentHash: string
  stateChange: string
}

// Initial Realistic Datasets
export const mockJemaatList: JemaatDTO[] = [
  {
    id: 'jmt-001',
    nij: 'NIJ-2026-0001',
    barcodeCode: 'JMT-893201',
    nama: 'Bpk. Andreas Wijaya',
    namaPanggilan: 'Andreas',
    jenisKelamin: 'LAK_LAKI',
    tempatLahir: 'Padang',
    tanggalLahir: '1980-05-14',
    noHp: '081266554433',
    whatsApp: '081266554433',
    email: 'andreas.wijaya@gmail.com',
    alamat: 'Jl. Niaga No. 42, Kel. Kampung Pondok',
    kota: 'Padang',
    provinsi: 'Sumatera Barat',
    kodePos: '25118',
    statusJemaat: 'ACTIVE',
    tanggalBergabung: '2015-01-10',
    statusBaptis: 'SUDAH_BAPTIS',
    tanggalBaptis: '2010-06-20',
    statusPernikahan: 'MENIKAH',
    tanggalMenikah: '2008-09-12',
    pekerjaan: 'Wiraswasta',
    pendidikan: 'S1',
    kontakDarurat: 'Ibu Maria (Istri) - 081266554434',
    catatan: 'Koordinator Komsel Niaga & Pelayan Doa',
    komselId: 'kms-01',
    komselNama: 'Komsel Beth-El Niaga',
    kategorialId: 'ktg-01',
    kategorialNama: 'Pria Sejati',
    completenessPercentage: 100,
  },
  {
    id: 'jmt-002',
    nij: 'NIJ-2026-0002',
    barcodeCode: 'JMT-748392',
    nama: 'Ibu Maria Susanti',
    namaPanggilan: 'Maria',
    jenisKelamin: 'PEREMPUAN',
    tempatLahir: 'Padang',
    tanggalLahir: '1984-08-22',
    noHp: '081266554434',
    whatsApp: '081266554434',
    email: 'maria.susanti@gmail.com',
    alamat: 'Jl. Niaga No. 42, Kel. Kampung Pondok',
    kota: 'Padang',
    provinsi: 'Sumatera Barat',
    kodePos: '25118',
    statusJemaat: 'ACTIVE',
    tanggalBergabung: '2015-01-10',
    statusBaptis: 'SUDAH_BAPTIS',
    statusPernikahan: 'MENIKAH',
    pekerjaan: 'Guru',
    pendidikan: 'S1',
    kontakDarurat: 'Bpk. Andreas (Suami)',
    komselId: 'kms-01',
    komselNama: 'Komsel Beth-El Niaga',
    kategorialId: 'ktg-02',
    kategorialNama: 'Wanita Bijak',
    completenessPercentage: 92,
  },
  {
    id: 'jmt-003',
    nij: 'NIJ-2026-0003',
    barcodeCode: 'JMT-119283',
    nama: 'Daniel Wijaya',
    namaPanggilan: 'Daniel',
    jenisKelamin: 'LAK_LAKI',
    tempatLahir: 'Padang',
    tanggalLahir: '2005-11-03',
    noHp: '082188776655',
    whatsApp: '082188776655',
    email: 'daniel.w@gmail.com',
    alamat: 'Jl. Niaga No. 42',
    kota: 'Padang',
    provinsi: 'Sumatera Barat',
    kodePos: '25118',
    statusJemaat: 'ACTIVE',
    tanggalBergabung: '2020-03-15',
    statusBaptis: 'SUDAH_BAPTIS',
    statusPernikahan: 'BELUM_MENIKAH',
    pekerjaan: 'Mahasiswa',
    pendidikan: 'SMA',
    kontakDarurat: 'Bpk. Andreas (Ayah)',
    komselId: 'kms-02',
    komselNama: 'Komsel Youth Generation',
    kategorialId: 'ktg-03',
    kategorialNama: 'Youth & Pemuda',
    completenessPercentage: 85,
  },
  {
    id: 'jmt-004',
    nij: 'NIJ-2026-0004',
    barcodeCode: 'JMT-338291',
    nama: 'Pengunjung Baru / Tamu Johanes',
    namaPanggilan: 'Johanes',
    jenisKelamin: 'LAK_LAKI',
    tempatLahir: 'Bukittinggi',
    tanggalLahir: '1995-02-18',
    noHp: '081399887766',
    whatsApp: '081399887766',
    email: 'johanes.tamu@gmail.com',
    alamat: 'Jl. Khatib Sulaiman No. 12',
    kota: 'Padang',
    provinsi: 'Sumatera Barat',
    kodePos: '25134',
    statusJemaat: 'TAMU',
    tanggalBergabung: '2026-08-01',
    statusBaptis: 'BELUM_BAPTIS',
    statusPernikahan: 'BELUM_MENIKAH',
    pekerjaan: 'Karyawan Swasta',
    pendidikan: 'S1',
    kontakDarurat: '-',
    catatan: 'Pengunjung ibadah minggu 3 Agustus. Diingatkan follow-up kunjungan.',
    statusFollowUp: 'NEED_VISITATION',
    completenessPercentage: 62,
  },
]

export const mockKeluargaList: KeluargaDTO[] = [
  {
    id: 'klg-01',
    nomorKeluarga: 'KK-2026-0001',
    namaKeluarga: 'Keluarga Bpk. Andreas Wijaya',
    kepalaId: 'jmt-001',
    kepalaName: 'Bpk. Andreas Wijaya',
    noHp: '081266554433',
    alamat: 'Jl. Niaga No. 42, Kel. Kampung Pondok, Padang',
    totalAnggota: 3,
    anggota: [
      { id: 'ak-1', jemaatId: 'jmt-001', nama: 'Bpk. Andreas Wijaya', relasi: 'SUAMI', catatanRelasi: 'Kepala Keluarga' },
      { id: 'ak-2', jemaatId: 'jmt-002', nama: 'Ibu Maria Susanti', relasi: 'ISTRI', catatanRelasi: 'Istri' },
      { id: 'ak-3', jemaatId: 'jmt-003', nama: 'Daniel Wijaya', relasi: 'ANAK', catatanRelasi: 'Anak Sulung' },
    ],
  },
]

export const mockKategorialList: KategorialDTO[] = [
  { id: 'ktg-01', nama: 'Pria Sejati', deskripsi: 'Penggembalaan Pria Dewasa (>18 thn)', isDefault: true, totalAnggota: 142, kriteria: 'Gender Pria, Usia > 18 tahun' },
  { id: 'ktg-02', nama: 'Wanita Bijak', deskripsi: 'Penggembalaan Wanita Dewasa (>18 thn)', isDefault: true, totalAnggota: 168, kriteria: 'Gender Wanita, Usia > 18 tahun' },
  { id: 'ktg-03', nama: 'Youth & Pemuda', deskripsi: 'Komunitas Muda-Mudi (17-25 thn)', isDefault: true, totalAnggota: 94, kriteria: 'Mahasiswa / Pekerja Muda' },
  { id: 'ktg-04', nama: 'Remaja / Teens', deskripsi: 'Komunitas Remaja SMP-SMA (12-16 thn)', isDefault: true, totalAnggota: 58, kriteria: 'Siswa SMP / SMA' },
  { id: 'ktg-05', nama: 'Sekolah Minggu / Kids', deskripsi: 'Pembinaan Anak-anak (0-11 thn)', isDefault: true, totalAnggota: 85, kriteria: 'Anak usia 0 - 11 tahun' },
  { id: 'ktg-06', nama: 'Lansia / Senior', deskripsi: 'Persekutuan Senior Usia Lanjut (>=60 thn)', isDefault: true, totalAnggota: 42, kriteria: 'Usia 60 tahun ke atas' },
]

export const mockPelayanList: PelayanDTO[] = [
  { id: 'ply-01', jemaatId: 'jmt-001', nama: 'Bpk. Andreas Wijaya', nij: 'NIJ-2026-0001', kategorialNama: 'Pria Sejati', deskripsiTugas: 'Tim Doa Konseling & Tim Usher Utama', spesialisasi: ['Tim Doa', 'Usher / Penerima Tamu'], status: 'AKTIF' },
  { id: 'ply-02', jemaatId: 'jmt-003', nama: 'Daniel Wijaya', nij: 'NIJ-2026-0003', kategorialNama: 'Youth & Pemuda', deskripsiTugas: 'Lead Acoustic & Electric Guitarist', spesialisasi: ['Musisi / Pemusik', 'Multimedia'], status: 'AKTIF' },
]

export const mockKomselList: KomselDTO[] = [
  { id: 'kms-01', nama: 'Komsel Beth-El Niaga', wilayah: 'Padang Barat', hari: 'RABU', jam: '19.00 WIB', kategorialNama: 'Pria & Wanita Dewasa', koordinatorNama: 'Bpk. Andreas Wijaya', totalAnggota: 18 },
  { id: 'kms-02', nama: 'Komsel Youth Generation', wilayah: 'Padang Timur', hari: 'JUMAT', jam: '19.30 WIB', kategorialNama: 'Youth & Pemuda', koordinatorNama: 'Daniel Wijaya', totalAnggota: 24 },
]

export const mockPendaftaranQueue: PendaftaranQueueDTO[] = [
  {
    id: 'reg-01',
    nama: 'Bpk. Stephen Tan',
    namaPanggilan: 'Stephen',
    jenisKelamin: 'LAK_LAKI',
    noHp: '081122334455',
    whatsApp: '081122334455',
    email: 'stephen.tan@gmail.com',
    alamat: 'Jl. Sudirman No. 88, Padang',
    statusPernikahan: 'MENIKAH',
    pekerjaan: 'Pengusaha',
    status: 'PENDING',
    createdAt: '2026-08-13T14:30:00Z',
  },
  {
    id: 'reg-02',
    nama: 'Sdri. Jessica Livia',
    namaPanggilan: 'Jessica',
    jenisKelamin: 'PEREMPUAN',
    noHp: '085277889900',
    whatsApp: '085277889900',
    email: 'jessica.livia@gmail.com',
    alamat: 'Jl. Veteran No. 15, Padang',
    statusPernikahan: 'BELUM_MENIKAH',
    pekerjaan: 'Desainer Grafis',
    status: 'APPROVED',
    createdAt: '2026-08-10T10:15:00Z',
  },
]

export const mockEventList: EventDTO[] = [
  { id: 'evt-01', namaEvent: 'Ibadah Raya 1 (Minggu 08.00 WIB)', kategori: 'IBADAH_RAYA', tanggal: '2026-08-16', jam: '08.00 - 10.00 WIB', lokasi: 'Main Sanctuary Gereja', totalAttendance: 342, status: 'SCHEDULED' },
  { id: 'evt-02', namaEvent: 'Ibadah Raya 2 (Minggu 10.30 WIB)', kategori: 'IBADAH_RAYA', tanggal: '2026-08-16', jam: '10.30 - 12.30 WIB', lokasi: 'Main Sanctuary Gereja', totalAttendance: 289, status: 'SCHEDULED' },
  { id: 'evt-03', namaEvent: 'Youth Night Celebration', kategori: 'YOUTH', tanggal: '2026-08-15', jam: '19.00 - 21.00 WIB', lokasi: 'Youth Hall Lt. 2', totalAttendance: 110, status: 'SCHEDULED' },
]

export const mockTransaksiList: TransaksiKeuanganDTO[] = [
  { id: 'trx-01', nomorReferensi: 'TRX-202608-0001', laporanScope: 'Kas Umum', tipe: 'MASUK', kategori: 'Persembahan Minggu', nominal: 18500000, metodePembayaran: 'CASH', tanggal: '2026-08-10', catatan: 'Persembahan Ibadah Raya 1 & 2' },
  { id: 'trx-02', nomorReferensi: 'TRX-202608-0002', laporanScope: 'Kas Umum', tipe: 'MASUK', kategori: 'Persepuluhan Jemaat', nominal: 32000000, metodePembayaran: 'TRANSFER', tanggal: '2026-08-11', catatan: 'Transfer BCA Kas Gereja' },
  { id: 'trx-03', nomorReferensi: 'TRX-202608-0003', laporanScope: 'Kas Umum', tipe: 'KELUAR', kategori: 'Operasional Gedung', nominal: 4500000, metodePembayaran: 'TRANSFER', tanggal: '2026-08-12', catatan: 'Pembayaran Listrik & AC Gedung Utama' },
]

export const mockDokumenList: DokumenJemaatDTO[] = [
  { id: 'doc-01', jemaatNama: 'Bpk. Andreas Wijaya', jemaatNij: 'NIJ-2026-0001', judul: 'Sertifikat Baptis Air Andreas Wijaya', jenisDokumen: 'BAPTIS', status: 'VERIFIED', tanggalTerbit: '2010-06-20', fileSize: '1.4 MB', mimeType: 'application/pdf' },
  { id: 'doc-02', jemaatNama: 'Bpk. Andreas & Maria', jemaatNij: 'NIJ-2026-0001', judul: 'Surat Pemberkatan Nikah Gereja', jenisDokumen: 'NIKAH', status: 'VERIFIED', tanggalTerbit: '2008-09-12', fileSize: '2.1 MB', mimeType: 'application/pdf' },
]

export const mockArsipList: ArsipGerejaDTO[] = [
  { id: 'ars-01', judul: 'SK Pengesahan Sinode Gereja', jenisArsip: 'LEGALITAS', tanggalDokumen: '2005-04-12', status: 'PERMANEN', deskripsi: 'Surat Keputusan Resmi Sinode', fileSize: '3.8 MB' },
  { id: 'ars-02', judul: 'Notulen Rapat Pleno Dewan Gembala Q2 2026', jenisArsip: 'NOTULEN', tanggalDokumen: '2026-06-30', status: 'AKTIF', deskripsi: 'Notulen rapat evaluasi program kerja mid-year', fileSize: '850 KB' },
]

export const mockMateriList: MateriRenunganDTO[] = [
  {
    id: 'mat-01',
    judul: 'Hidup Yang Berdampak Bagi Kota Padang',
    slug: 'hidup-yang-berdampak-bagi-kota-padang',
    kategoriNama: 'Renungan Harian',
    pembicara: 'Pdt. Andreas Wijaya, M.Th.',
    tanggal: '2026-08-14',
    status: 'PUBLISHED',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=80',
    ringkasan: 'Bagaimana jemaat Tuhan dipanggil menjadi terang dan garam yang membawa transformasi nyata di mana pun ditempatkan.',
    konten: `
      <h2>Memahami Panggilan Menjadi Garam dan Terang</h2>
      <p>Dalam Matius 5:13-16, Yesus menegaskan identitas murid-murid-Nya sebagai <strong>garam dan terang dunia</strong>. Ini bukanlah imbauan opsional, melainkan esensi dasar dari orang percaya.</p>
      
      <div class="bible-callout border-l-4 border-primary bg-primary/10 p-4 rounded-r-lg my-6">
        <p class="font-serif italic text-lg">"Demikianlah hendaknya terangmu bercahaya di depan orang, supaya mereka melihat perbuatanmu yang baik dan memuliakan Bapamu yang di sorga."</p>
        <p class="text-sm font-bold text-primary mt-2">— Matius 5:16</p>
      </div>

      <h3>1. Garam Mencegah Pembusukan</h3>
      <p>Garam dalam dunia kuno berfungsi sebagai pengawet. Kehadiran kita di Kota Padang harus membawa pengaruh moral yang menahan kejahatan dan memancarkan integritas Kristus.</p>

      <h3>2. Terang Mengusir Kegelapan</h3>
      <p>Terang tidak menyembunyikan dirinya. Setiap karya, profesi, dan tutur kata jemaat harus membawa pengharapan bagi mereka yang kehilangan arah.</p>
    `,
    totalDilihat: 1420,
  },
]

export const mockAuditLogs: AuditTrailDTO[] = [
  {
    id: 'aud-001',
    timestamp: '2026-08-14 00:05:12',
    actor: 'Pdt. Andreas Wijaya (SUPER_ADMIN)',
    action: 'JEMAAT_CREATED',
    entity: 'Jemaat',
    entityId: 'jmt-001',
    ip: '180.252.12.94',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
    currentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    stateChange: 'Penerbitan NIJ NIJ-2026-0001 dan Barcode Code JMT-893201 untuk Bpk. Andreas Wijaya',
  },
  {
    id: 'aud-002',
    timestamp: '2026-08-14 00:07:45',
    actor: 'Bendahara Utama (BENDAHARA)',
    action: 'TRANSAKSI_KEUANGAN_CREATED',
    entity: 'TransaksiKeuangan',
    entityId: 'trx-01',
    ip: '180.252.12.95',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    previousHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    currentHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    stateChange: 'Pencatatan Pemasukan TRX-202608-0001 sebesar Rp 18.500.000 (Kas Umum)',
  },
]
