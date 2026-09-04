# Product Requirement Document (PRD) Summary & System Flow
## Church Management System (CMS) v4.2.0

---

## 1. RINGKASAN EKSEKUTIF & VISI SISTEM

**Church CMS v4.2.0** adalah sistem informasi manajemen gereja terpadu (*Production-Grade Enterprise CMS*) yang dirancang untuk mengintegrasikan seluruh tata kelola administrasi keanggotaan jemaat, pelayanan pastoral, presensi QR ibadah, pencatatan keuangan berstandar akuntansi, penyimpanan arsip/dokumen terproteksi, serta publikasi renungan harian.

### Tujuan Utama Sistem:
1. **Standar Identifikasi Tunggal**: Menerbitkan Nomor Induk Jemaat (**NIJ**) unik dengan format `NIJ-YYYY-XXXX` dan kode QR barcode resmi untuk setiap jemaat.
2. **Transformasi Operasional Ibadah**: Pemindaian QR presensi di pintu masuk ibadah dengan waktu respon di bawah 2 detik via layar scanner mobile (`/scan/[id]`).
3. **Pipeline Follow-Up Tamu**: Mengubah pendaftaran simpatisan/tamu baru menjadi pipeline pelayanan pastoral hingga terkonversi menjadi jemaat tetap.
4. **Transparansi Akuntansi**: Pembukuan kas gereja multi-scope (Umum, Pemuda, Anak, Diakonia) dengan jurnal otomatis dan pencetakan laporan gabungan.
5. **Kepatuhan Perlindungan Data (UU PDP)**: Proteksi data pribadi jemaat sesuai UU No. 27 Tahun 2022 dengan fitur pencarian *Exact Match* pada portal publik.
6. **Audit Trail Kriptografi**: Pencatatan riwayat perubahan data (*Audit Log*) menggunakan rantai hash SHA-256 (*Tamper-Evident Chain*) yang anti-manipulasi.

---

## 2. ARSITEKTA & MATRIKS HAK AKSES (ROLES & PBAC)

Sistem menggunakan kontrol akses berbasis peran (**RBAC**) yang diperketat dengan kontrol berbasis kebijakan (**PBAC**) dan cakupan wilayah (*Scope*):

| Peran (Role) | Hak Akses & Cakupan Operasional |
| :--- | :--- |
| **SUPER_ADMIN** | Akses penuh 100% ke seluruh modul, audit trail SHA-256, pengelola pengguna staff, dan konfigurasi sistem. |
| **GEMBALA / PASTOR** | Akses baca/tulis ke seluruh data jemaat, laporan keuangan gabungan, pipeline follow-up tamu, dan publikasi renungan. |
| **SEKRETIARIS / STAFF** | Pengelola master data jemaat, keluarga, kategorial, komsel, antrean pendaftaran mandiri, dokumen, dan presensi event. |
| **BENDAHARA / TREASURER** | Pengelola pembukuan kas keuangan, jurnal transaksi masuk/keluar, dan laporan keuangan per scope maupun gabungan. |
| **USHER / PELAYAN SCANNER** | Akses khusus pemindaian QR Code presensi ibadah/event (`/scan/[id]`) tanpa akses ke data pribadi jemaat. |
| **JEMAAT / PUBLIK** | Akses portal publik: Pendaftaran mandiri (`/daftar`), verifikasi keanggotaan NIJ (`/profil-jemaat`), dan baca renungan (`/renungan/[slug]`). |

---

## 3. KATALOG MODUL FITUR SELESAI & SPESIFIKASI FUNGSIONAL

### Modul 1: Autentikasi & Audit Trail SHA-256 (`/login`, `/dashboard/audit`)
- **Fitur**: Login staff dengan proteksi *lockout* (5x gagal = kunci 15 menit), manajemen sesi berbasis cookie aman (JWT/Session).
- **Audit Log Cryptographic**: Setiap aksi penambahan, perubahan, dan penghapusan data mencatat `previousHash`, `currentHash` (SHA-256), IP address, user-agent, dan payload state.

### Modul 2: Master Data Keanggotaan Jemaat (`/dashboard/jemaat`, `/dashboard/jemaat/baru`, `/dashboard/jemaat/[id]`)

Modul inti (*Core Domain*) yang menangani siklus hidup lengkap (*End-to-End Lifecycle*) seluruh anggota jemaat Gereja, mulai dari pendaftaran awal, verifikasi keanggotaan, penetapan kelompok pelayanan/komsel, hingga pengelolaan status soft delete.

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`JemaatDTO`)
Setiap data jemaat menyimpan 25+ atribut terstruktur:
1. **Identitas Utama & Sistem**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `nij`: Nomor Induk Jemaat resmi berformat `NIJ-{4_DIGIT_SEQ}` (Contoh: `NIJ-0001`). Diterbitkan otomatis oleh sistem.
   - `barcodeCode`: Kode Barcode unik berformat `JMT-{RANDOM_6_ALPHA_NUMERIC}` (Contoh: `JMT-893201`) yang dipindai saat presensi event.
2. **Data Identitas Pribadi**:
   - `nama`: Nama lengkap sesuai KTP/Identitas resmi (Wajib).
   - `namaPanggilan`: Nama panggilan jemaat (Opsional).
   - `jenisKelamin`: Enum `LAK_LAKI` | `PEREMPUAN` (Wajib).
   - `tempatLahir`: Kota/kabupaten kelahiran.
   - `tanggalLahir`: Tanggal lahir (ISO 8601 Date String).
3. **Data Kontak & Domisili**:
   - `noHp`: Nomor telepon genggam aktif.
   - `whatsApp`: Nomor WhatsApp aktif untuk komunikasi pastoral.
   - `email`: Alamat surel aktif.
   - `alamat`: Alamat rumah lengkap.
   - `kota`: Kota tempat tinggal (Default: Padang).
   - `provinsi`: Provinsi domisili (Default: Sumatera Barat).
   - `kodePos`: Kode pos domisili.
4. **Status Keanggotaan & Rohani**:
   - `statusJemaat`: Enum `ACTIVE` (Jemaat Aktif), `INACTIVE` (Non-Aktif), `MOVED` (Pindah Jemaat/Gereja), `DECEASED` (Meninggal Dunia), `SUSPENDED` (Pembinaan Pastoral), `TAMU` (Pengunjung Baru).
   - `tanggalBergabung`: Tanggal resmi terdaftar sebagai jemaat Gereja.
   - `statusBaptis`: Status baptisan air (`SUDAH_BAPTIS` | `BELUM_BAPTIS`).
   - `tanggalBaptis`: Tanggal pelaksanaan baptisan air.
5. **Status Pernikahan & Pekerjaan**:
   - `statusPernikahan`: Enum `BELUM_MENIKAH`, `MENIKAH`, `DUDA`, `JANDA`, `BERCERAI`.
   - `tanggalMenikah`: Tanggal pemberkatan pernikahan.
   - `pekerjaan`: Jenis pekerjaan/profesi jemaat.
   - `pendidikan`: Tingkat pendidikan terakhir (SD, SMP, SMA, D3, S1, S2, S3).
   - `kontakDarurat`: Nama & Nomor Telepon kerabat darurat.
   - `catatan`: Catatan khusus pembinaan atau riwayat khusus dari Sekretariat/Pastor.
6. **Status Pipeline Follow-Up & Relasi Entitas**:
   - `statusFollowUp`: Enum `NEW`, `IN_PROGRESS`, `NEED_VISITATION`, `COMPLETED`.
   - `kepalaKeluargaId`: Foreign Key ke Data Keluarga.
   - `komselId`: Foreign Key ke Komunitas Sel (Komsel).
   - `kategorialId`: Foreign Key ke Kelompok Kategorial (Pria, Wanita, Youth, Anak).
7. **Kelengkapan Profil (%) & Audit Soft Delete**:
   - `completenessPercentage`: Nilai kalkulasi dinamis (0% - 100%) berdasarkan 13 indikator kelengkapan data.
   - `deletedAt`: Timestamp saat data di-soft-delete (NULL jika aktif).
   - `deletedBy`: User ID staff yang menghapus data.
   - `deletionReason`: Alasan resmi penghapusan data.

#### B. Generator Otomatis NIJ & Barcode Code (Atomic Lock)
- **Format NIJ**: `NIJ-{4 Digit Urutan}`. Generator menggunakan fungsi atomic `getNextSequence('NIJ_SEQUENCE')` dengan transaksi database terproteksi dari *race condition* saat diakses simultan oleh banyak staff.
- **Format Barcode**: `JMT-XXXXXX`. Dibuat otomatis via fungsi pembangun hash acak unik 6 karakter alfanumerik kapital untuk presensi QR scanner.

#### C. Kalkulasi Persentase Kelengkapan Profil (`completenessPercentage`)
Profil jemaat dihitung secara otomatis berdasarkan 13 komponen field:
$$\text{Completeness} = \left( \frac{\text{Jumlah Field Terisi}}{13} \right) \times 100\%$$
*(Indikator meliputi: Nama, Nama Panggilan, Jenis Kelamin, Tempat & Tgl Lahir, Kontak HP/WA, Email, Alamat, Status Jemaat, Status Baptis, Status Pernikahan, Pekerjaan, Pendidikan, Kontak Darurat).*

#### D. Katalog Server Actions Modul Jemaat (`src/actions/jemaat.ts`)
1. **`getJemaatListAction(params)`**:
   - Menerima parameter: `search` (Nama/NIJ/HP), `statusJemaat`, `jenisKelamin`, `kategorialId`, `komselId`, `page` (default: 1), `pageSize` (default: 10).
   - Mengembalikan daftar jemaat terpaginasi beserta total count dan statistik ringkas.
2. **`getJemaatByIdAction(id)`**:
   - Mengambil detail profil jemaat lengkap beserta riwayat presensi ibadah, relasi keluarga, dan dokumen sertifikat terlampir.
3. **`createJemaatAction(input)`**:
   - Menerapkan validasi **Zod Schema** (`createJemaatSchema`).
   - Menerbitkan NIJ & Barcode secara otomatis.
   - Memeriksa hak akses PBAC (`enforcePermission`).
   - Merekam **Cryptographic Audit Log (SHA-256)** dengan aksi `JEMAAT_CREATED`.
4. **`updateJemaatAction(input)`**:
   - Memperbarui data jemaat yang ada. Merekam perubahan keadaan sebelum (*beforeState*) dan sesudah (*afterState*) ke rantai audit SHA-256.
5. **`deleteJemaatAction({ id, reason })`**:
   - Menerapkan **Soft Delete** (`deletedAt = now()`, `deletedBy = userId`, `deletionReason = reason`). Data tidak dihapus fisik dari database demi keamanan integritas relasi.
6. **`getJemaatStatsAction()`**:
   - Mengembalikan rekapitulasi statistik real-time: Total Jemaat, Total Aktif, Total Non-Aktif, Distribusi Laki-laki vs Perempuan.

### Modul 3: Data Keluarga & Hubungan Relasi (`/dashboard/keluarga`, `/dashboard/keluarga/[id]`)

Modul pengelolaan Kartu Keluarga (KK) Gereja dan pemetaan struktur hierarki hubungan relasi antar-jemaat (Kepala Keluarga, Suami, Istri, Anak, Orang Tua, Mertua, Cucu).

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`KeluargaDTO` & `AnggotaKeluargaDTO`)
1. **Entitas Utama Kartu Keluarga (`KeluargaDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `nomorKeluarga`: Nomor unik KK Gereja berformat `KK-{YYYY}-{4_DIGIT_SEQ}` (Contoh: `KK-2026-0012`). Diterbitkan otomatis oleh generator urutan atomic.
   - `namaKeluarga`: Nama resmi Kartu Keluarga (Contoh: "Keluarga Bpk. Andreas Wijaya").
   - `kepalaId`: Foreign Key ke `Jemaat.id` yang ditunjuk sebagai Kepala Keluarga (Nullable).
   - `kepalaName`: Nama lengkap Kepala Keluarga untuk tampilan cepat.
   - `noHp`: Nomor telepon utama keluarga untuk kontak pastoral.
   - `alamat`: Alamat domisili tempat tinggal keluarga.
   - `totalAnggota`: Jumlah anggota jemaat yang terikat dalam Kartu Keluarga ini.
   - `anggota`: Array dari `AnggotaKeluargaDTO[]` yang terdaftar.
   - `deletedAt`: Timestamp saat data keluarga di-soft-delete.
   - `deletedBy`: User ID staff yang menghapus data keluarga.
   - `deletionReason`: Alasan resmi penghapusan KK.
2. **Entitas Relasi Anggota Keluarga (`AnggotaKeluargaDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `keluargaId`: Foreign Key mengikat ke `Keluarga.id`.
   - `jemaatId`: Foreign Key mengikat ke `Jemaat.id` anggota.
   - `relasi`: Enum hierarki relasi keluarga:
     - `SUAMI`: Suami / Kepala Keluarga Laki-laki.
     - `ISTRI`: Istri / Pendamping Kepala Keluarga.
     - `ANAK`: Anak kandung / anak angkat.
     - `ORANG_TUA`: Orang tua kandung / senior.
     - `MERTUA`: Mertua.
     - `CUCU`: Cucu.
     - `LAINNYA`: Kerabat / Saudara yang tinggal serumah.
   - `catatanRelasi`: Catatan khusus relasi (Contoh: "Anak Pertama", "Tinggal Bersama").
   - `jemaat`: Objek profil `JemaatDTO` lengkap milik anggota.

#### B. Generator Otomatis Nomor KK (`nomorKeluarga`)
- **Format Nomor KK**: `KK-{Tahun}-{4 Digit Urutan}` (Contoh: `KK-2026-0001`). Diterbitkan secara aman via fungsi atomic `getNextSequence('KELUARGA_SEQUENCE')` dalam *database transaction lock* untuk mencegah nomor ganda saat dibuat simultan oleh banyak staff.

#### C. Aturan Integritas & Validasi Bisnis Relasi Keluarga
- **Struktur Satu KK Per Jemaat**: Seorang jemaat aktif hanya boleh terhubung ke 1 Kartu Keluarga utama (`kepalaKeluargaId` di tabel `Jemaat`).
- **Sinkronisasi Kepala Keluarga**: Saat `kepalaId` ditentukan, jemaat tersebut otomatis ditambahkan ke tabel relasi `AnggotaKeluarga` dengan status relasi `SUAMI` atau `ORANG_TUA` jika belum ada.
- **Transisi Soft Delete**: Mengapus Kartu Keluarga tidak menghapus data `Jemaat` secara fisik, melainkan melepas ikatan `kepalaKeluargaId` pada anggota jemaat dan menandai `deletedAt` pada entitas `Keluarga`.

#### D. Katalog Server Actions Modul Keluarga (`src/actions/keluarga.ts`)
1. **`getKeluargaListAction(params)`**:
   - Parameter: `search` (Nama Keluarga/Nomor KK/Kepala), `page` (default: 1), `pageSize` (default: 10).
   - Mengembalikan daftar Kartu Keluarga terpaginasi beserta rekap total anggota dan nama Kepala Keluarga.
2. **`getKeluargaByIdAction(id)`**:
   - Mengambil detail Kartu Keluarga lengkap beserta seluruh daftar anggota (`AnggotaKeluargaDTO[]`), relasi masing-masing, dan profil jemaat terikat.
3. **`createKeluargaAction(input)`**:
   - Menerapkan validasi **Zod Schema** (`createKeluargaSchema`).
   - Menerbitkan `nomorKeluarga` otomatis.
   - Memeriksa hak akses PBAC (`enforcePermission`).
   - Merekam **Cryptographic Audit Log (SHA-256)** dengan aksi `KELUARGA_CREATED`.
4. **`updateKeluargaAction(input)`**:
   - Memperbarui data umum KK (Nama Keluarga, Kepala Keluarga, No HP, Alamat).
   - Merekam perbandingan `beforeState` & `afterState` ke rantai audit SHA-256 (`KELUARGA_UPDATED`).
5. **`addAnggotaKeluargaAction(input)`**:
   - Validasi via `addAnggotaKeluargaSchema` (Menerima `keluargaId`, `jemaatId`, `relasi`, `catatanRelasi`).
   - Memastikan `jemaatId` belum terdaftar di KK lain.
   - Memperbarui `kepalaKeluargaId` pada entitas `Jemaat` dan merekam audit log `ANGGOTA_KELUARGA_ADDED`.
6. **`updateRelasiAnggotaAction(input)`**:
   - Mengubah tipe relasi (misal: dari `LAINNYA` menjadi `ANAK`) atau catatan relasi anggota keluarga.
7. **`removeAnggotaKeluargaAction({ anggotaId })`**:
   - Melepaskan ikatan anggota dari Kartu Keluarga (`kepalaKeluargaId = NULL`) dan menghapus entitas `AnggotaKeluarga`.
8. **`deleteKeluargaAction({ id, reason })`**:
   - Soft Delete Kartu Keluarga (`deletedAt = now()`, `deletedBy = userId`, `deletionReason = reason`). Merekam aksi `KELUARGA_DELETED` ke audit log SHA-256.

### Modul 4: Data Kategorial (`/dashboard/kategorial`, `/dashboard/kategorial/[id]`)

Modul pengelompokan keanggotaan jemaat berdasarkan kelompok demografi usia, gender, dan tahap kehidupan (*Life Stages*) untuk efektifitas penggembalaan, pembinaan rohani, dan program pelayanan khusus.

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`KategorialDTO` & `AnggotaKategorialDTO`)
1. **Entitas Utama Kelompok Kategorial (`KategorialDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `nama`: Nama kelompok kategorial (Contoh: "Pria Sejati", "Wanita Bijak", "Youth & Pemuda", "Remaja / Teen", "Sekolah Minggu / Anak", "Lansia / Senior").
   - `deskripsi`: Penjelasan ruang lingkup dan target demografi kelompok.
   - `isDefault`: Flag boolean `true`/`false`. Menandakan kelompok kategorial sistem bawaan yang terproteksi dari penghapusan.
   - `totalAnggota`: Jumlah jemaat yang terdaftar dalam kategorial ini.
   - `anggota`: Array dari `AnggotaKategorialDTO[]` yang terdaftar.
   - `deletedAt`: Timestamp saat kategorial di-soft-delete (NULL jika aktif).
   - `deletedBy`: User ID staff yang menghapus kategorial.
   - `deletionReason`: Alasan resmi penghapusan kelompok.
2. **Entitas Relasi Anggota Kategorial (`AnggotaKategorialDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `kategorialId`: Foreign Key mengikat ke `Kategorial.id`.
   - `jemaatId`: Foreign Key mengikat ke `Jemaat.id` anggota.
   - `catatan`: Catatan khusus peranan atau posisi dalam kategorial.
   - `jemaat`: Objek DTO profil `JemaatDTO` anggota terikat.

#### B. Daftar Kategorial Default Sistem & Batasan Usia/Gender
Sistem menyediakan 6 kelompok kategorial standar (`isDefault = true`):
1. **Pria / Pria Sejati**: Khusus jemaat laki-laki dewasa ($>18$ tahun).
2. **Wanita / Wanita Bijak**: Khusus jemaat perempuan dewasa ($>18$ tahun).
3. **Youth & Pemuda**: Jemaat muda-mudi usia 17 - 25 tahun / mahasiswa & pekerja muda.
4. **Remaja / Teens**: Jemaat usia 12 - 16 tahun (SMP & SMA).
5. **Sekolah Minggu / Anak**: Jemaat anak usia 0 - 11 tahun.
6. **Lansia / Senior**: Jemaat usia lanjut ($\ge 60$ tahun).

#### C. Aturan Integritas & Validasi Bisnis Kategorial
- **Proteksi Kelompok Default (`isDefault`)**: Kelompok bawaan sistem tidak dapat dihapus (*Soft Delete Restricted*) untuk menjamin konsolidasi laporan penggembalaan.
- **Relasi Ganda / Fleksibel**: Seorang jemaat dapat terhubung ke kategorial utama di tabel `Jemaat.kategorialId` dan dapat terdaftar di beberapa sub-kategorial via tabel relasi `AnggotaKategorial`.
- **Integritas Penghapusan**: Mengapus kelompok kategorial kustom (`isDefault = false`) melepaskan referensi `kategorialId` pada anggota terikat tanpa menghapus profil `Jemaat`.

#### D. Katalog Server Actions Modul Kategorial (`src/actions/kategorial.ts`)
1. **`getKategorialListAction(params)`**:
   - Parameter: `search` (Nama/Deskripsi Kategorial), `page` (default: 1), `pageSize` (default: 10).
   - Mengembalikan daftar kategorial terpaginasi beserta rekap `totalAnggota` masing-masing.
2. **`getKategorialByIdAction(id)`**:
   - Mengambil detail kategorial lengkap beserta daftar seluruh anggota terdaftar (`AnggotaKategorialDTO[]`) dan rincian profil jemaat.
3. **`createKategorialAction(input)`**:
   - Menerapkan validasi **Zod Schema** (`createKategorialSchema`).
   - Menerima `nama` (Wajib, Unik) dan `deskripsi`.
   - Memeriksa hak akses PBAC (`enforcePermission`).
   - Merekam **Cryptographic Audit Log (SHA-256)** dengan aksi `KATEGORIAL_CREATED`.
4. **`updateKategorialAction(input)`**:
   - Memperbarui nama dan deskripsi kategorial.
   - Merekam keadaan `beforeState` & `afterState` ke rantai audit SHA-256 (`KATEGORIAL_UPDATED`).
5. **`addAnggotaKategorialAction(input)`**:
   - Validasi via `addAnggotaKategorialSchema` (`kategorialId`, `jemaatId`, `catatan`).
   - Memastikan `jemaatId` belum terdaftar ganda di kategorial yang sama.
   - Memperbarui `kategorialId` pada entitas `Jemaat` dan merekam audit log `ANGGOTA_KATEGORIAL_ADDED`.
6. **`removeAnggotaKategorialAction({ anggotaId })`**:
   - Melepaskan anggota dari kelompok kategorial (`kategorialId = NULL` di profil jemaat) dan menghapus entitas `AnggotaKategorial`.
7. **`deleteKategorialAction({ id, reason })`**:
   - Soft Delete kelompok kategorial kustom (`deletedAt = now()`, `deletedBy = userId`, `deletionReason = reason`). Menolak penghapusan jika `isDefault = true`. Merekam aksi `KATEGORIAL_DELETED` ke audit log SHA-256.

### Modul 5: Data Pelayan & Struktur Kategori (`/dashboard/pelayan`, `/dashboard/pelayan/kategori`, `/dashboard/pelayan/kategori/[id]`, `/dashboard/pelayan/kategorial/[id]`)

Modul pendaftaran, penetapan bidang tugas pelayanan, dan penjadwalan struktur tim pelayan ibadah (Worship Team, Diakonia, Media & Ops) berbasis kelompok kategorial dan kategori spesialisasi bidang pelayanan.

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`PelayanDTO` & `KategoriPelayananDTO`)
1. **Entitas Utama Pelayan Ibadah (`PelayanDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `jemaatId`: Foreign Key mengikat ke `Jemaat.id` pelayan.
   - `kategorialId`: Foreign Key mengikat ke `Kategorial.id` asal pelayan.
   - `deskripsiTugas`: Penjelasan spesifik peranan/posisi tugas (Contoh: "Lead Guitarist", "Senior Singer", "Kamera 1", "Penerima Tamu Pintu Utama").
   - `jemaat`: Objek DTO profil `JemaatDTO` pelayan terikat.
   - `kategorial`: Objek DTO `KategorialDTO` asal pelayan.
   - `kategoriPelayanan`: Array dari `PelayanKategoriDTO[]` (Relasi Many-to-Many ke Bidang Pelayanan).
   - `deletedAt`: Timestamp saat pelayan di-soft-delete (NULL jika aktif).
   - `deletedBy`: User ID staff yang menghapus data pelayan.
   - `deletionReason`: Alasan resmi penghapusan pelayan dari tim.
2. **Entitas Kategori Spesialisasi Pelayanan (`KategoriPelayananDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `nama`: Nama bidang spesialisasi pelayanan (Contoh: "Worship Leader", "Singer", "Musisi / Pemusik", "Usher / Penerima Tamu", "Multimedia & Projection", "Sound Engineer", "Tim Doa & Konseling", "Sekolah Minggu / Kids Ministry").
   - `deskripsi`: Penjelasan kualifikasi dan tanggung jawab bidang pelayanan.
   - `deletedAt`: Timestamp soft delete kategori.
   - `deletedBy`: User ID staff yang menghapus kategori.
   - `deletionReason`: Alasan penghapusan bidang.
3. **Entitas Rekapitulasi Statistik & Breakdown (`KategoriPelayananWithStatsDTO`)**:
   - `totalPelayan`: Jumlah total pelayan aktif di bidang spesialisasi ini.
   - `breakdownPerKategorial`: Rincian distribusi pelayan per kelompok kategorial (Contoh: Total Youth vs Total Pria Sejati).

#### B. Struktur Relasi Many-to-Many Multi-Spesialisasi (`PelayanKategoriDTO`)
- **Multi-Role Capability**: Seorang jemaat yang terdaftar sebagai Pelayan (`PelayanDTO`) dapat memegang lebih dari 1 bidang spesialisasi pelayanan via tabel perantara `PelayanKategori` (Contoh: Bpk. Andreas dapat terdaftar sebagai *Worship Leader* sekaligus *Tim Doa*).

#### C. Aturan Integritas & Validasi Bisnis Pelayanan
- **Prasyarat Status Jemaat**: Hanya jemaat dengan status `ACTIVE` yang dapat didaftarkan sebagai Pelayan Ibadah.
- **Pemeriksaan Registrasi Ganda**: Seorang jemaat hanya boleh memiliki 1 pendaftaran utama di tabel `Pelayan`. Penambahan bidang tugas dilakukan via relasi `kategoriPelayanan`.
- **Integritas Penghapusan**: Mengapus `KategoriPelayanan` melepaskan ikatan spesialisasi pada pelayan tanpa menghapus profil `Jemaat` maupun entitas `Pelayan` utama.

#### D. Katalog Server Actions Modul Pelayan (`src/actions/pelayan.ts`)
1. **`getPelayanListAction(params)`**:
   - Parameter: `search` (Nama/NIJ/Tugas), `kategoriPelayananId`, `kategorialId`, `page` (default: 1), `pageSize` (default: 10).
   - Mengembalikan daftar pelayan terpaginasi beserta bidang tugas dan kelompok kategorial.
2. **`getPelayanByIdAction(id)`**:
   - Mengambil detail pelayan lengkap beserta profil jemaat, seluruh bidang pelayanan yang dipegang (`kategoriPelayanan[]`), dan riwayat presensi.
3. **`createPelayanAction(input)`**:
   - Menerapkan validasi **Zod Schema** (`createPelayanSchema`).
   - Menerima `jemaatId`, `kategorialId`, `deskripsiTugas`, dan array `kategoriPelayananIds[]`.
   - Memeriksa hak akses PBAC (`enforcePermission`).
   - Merekam **Cryptographic Audit Log (SHA-256)** dengan aksi `PELAYAN_CREATED`.
4. **`updatePelayanAction(input)`**:
   - Memperbarui deskripsi tugas dan menyinkronkan array `kategoriPelayananIds[]` (menambah/menghapus relasi Many-to-Many).
   - Merekam audit log SHA-256 dengan aksi `PELAYAN_UPDATED`.
5. **`deletePelayanAction({ id, reason })`**:
   - Soft Delete pelayan (`deletedAt = now()`, `deletedBy = userId`, `deletionReason = reason`). Merekam aksi `PELAYAN_DELETED` ke audit log SHA-256.
6. **`getKategoriPelayananListAction()`**:
   - Mengembalikan daftar seluruh bidang pelayanan beserta statistik `totalPelayan` dan `breakdownPerKategorial`.
7. **`createKategoriPelayananAction(input)`**:
   - Validasi via `createKategoriPelayananSchema` (Nama & Deskripsi bidang baru). Merekam audit log `KATEGORI_PELAYANAN_CREATED`.
8. **`updateKategoriPelayananAction(input)`**:
   - Memperbarui nama/deskripsi bidang pelayanan + merekam audit log `KATEGORI_PELAYANAN_UPDATED`.
9. **`deleteKategoriPelayananAction({ id, reason })`**:
   - Soft Delete bidang pelayanan + merekam audit log `KATEGORI_PELAYANAN_DELETED`.

### Modul 6: Komunitas Sel / Komsel (`/dashboard/komsel`, `/dashboard/komsel/[id]`, `/dashboard/komsel/kategorial/[id]`)

Modul pengelolaan jaringan kelompok persekutuan sel (Komsel) berbasis wilayah/distrik domisili jemaat, jadwal hari/jam pertemuan rutin, penunjukkan Koordinator Komsel (Ketua/Pemimpin Persekutuan), dan pendaftaran keanggotaan sel.

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`KomselDTO` & `AnggotaKomselDTO`)
1. **Entitas Utama Komunitas Sel (`KomselDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `nama`: Nama resmi kelompok Komsel (Contoh: "Komsel Beth-El Niaga", "Komsel Youth Generation", "Komsel Deborah Padang Barat").
   - `wilayah`: Distrik / Wilayah geografis domisili kelompok (Contoh: "Padang Barat", "Padang Selatan", "Kuranji", "Bungus").
   - `hari`: Enum `HariPertemuan` (`SENIN` | `SELASA` | `RABU` | `KAMIS` | `JUMAT` | `SABTU` | `MINGGU`). Hari pelaksanaan persekutuan rutin.
   - `jam`: Format waktu jam pelaksanaan pertemuan rutin (Contoh: "19.00 WIB").
   - `kategorialId`: Foreign Key mengikat ke `Kategorial.id` target demografi Komsel.
   - `koordinatorId`: Foreign Key ke `Jemaat.id` yang ditunjuk sebagai Pemimpin / Koordinator Komsel (Nullable).
   - `kategorial`: Objek DTO `KategorialDTO` target demografi.
   - `koordinator`: Objek DTO profil `JemaatDTO` Koordinator Komsel.
   - `totalAnggota`: Jumlah jemaat yang aktif terdaftar dalam Komsel ini.
   - `anggota`: Array dari `AnggotaKomselDTO[]` yang terdaftar.
   - `deletedAt`: Timestamp saat Komsel di-soft-delete (NULL jika aktif).
   - `deletedBy`: User ID staff yang menghapus Komsel.
   - `deletionReason`: Alasan resmi pembubaran / penggabungan Komsel.
2. **Entitas Relasi Anggota Komsel (`AnggotaKomselDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `komselId`: Foreign Key mengikat ke `Komsel.id`.
   - `jemaatId`: Foreign Key mengikat ke `Jemaat.id` anggota.
   - `jemaat`: Objek DTO profil `JemaatDTO` milik anggota Komsel.

#### B. Aturan Integritas & Validasi Bisnis Komsel
- **Satu Komsel Utama Per Jemaat**: Setiap jemaat terikat pada 1 kelompok Komsel utama (`komselId` di tabel `Jemaat`). Penambahan anggota ke `AnggotaKomsel` otomatis menyinkronkan `komselId` pada profil jemaat.
- **Penunjukkan Koordinator**: Koordinator Komsel harus merupakan jemaat dengan status `ACTIVE`. Saat `koordinatorId` ditetapkan, jemaat tersebut otomatis terdaftar sebagai anggota Komsel terkait.
- **Integritas Penghapusan (Soft Delete)**: Menghapus / membubarkan Komsel (`deleteKomselAction`) tidak menghapus profil `Jemaat` secara fisik, melainkan melepas referensi `komselId = NULL` pada seluruh anggota terdaftar dan mencatat timestamp `deletedAt`.

#### C. Katalog Server Actions Modul Komsel (`src/actions/komsel.ts`)
1. **`getKomselListAction(params)`**:
   - Parameter: `search` (Nama Komsel/Wilayah/Koordinator), `kategorialId`, `hari`, `page` (default: 1), `pageSize` (default: 10).
   - Mengembalikan daftar Komsel terpaginasi beserta rekap total anggota, jadwal hari/jam, dan nama Koordinator.
2. **`getKomselByIdAction(id)`**:
   - Mengambil detail Komsel lengkap beserta data Koordinator, kelompok kategorial target, dan daftar seluruh anggota (`AnggotaKomselDTO[]`).
3. **`createKomselAction(input)`**:
   - Menerapkan validasi **Zod Schema** (`createKomselSchema`).
   - Menerima `nama`, `wilayah`, `hari`, `jam`, `kategorialId`, dan `koordinatorId` (Opsional).
   - Memeriksa hak akses PBAC (`enforcePermission`).
   - Merekam **Cryptographic Audit Log (SHA-256)** dengan aksi `KOMSEL_CREATED`.
4. **`updateKomselAction(input)`**:
   - Memperbarui nama, wilayah, hari, jam, atau kategorial Komsel.
   - Merekam perbandingan `beforeState` & `afterState` ke rantai audit SHA-256 (`KOMSEL_UPDATED`).
5. **`setKoordinatorKomselAction({ komselId, koordinatorId })`**:
   - Validasi via `setKoordinatorKomselSchema`.
   - Mengubah penunjukkan Pemimpin Komsel dan menyinkronkan keanggotaan Koordinator. Merekam audit log `KOMSEL_KOORDINATOR_UPDATED`.
6. **`addAnggotaKomselAction(input)`**:
   - Validasi via `addAnggotaKomselSchema` (`komselId`, `jemaatId`).
   - Memastikan `jemaatId` belum terdaftar di Komsel lain.
   - Memperbarui `komselId` pada entitas `Jemaat` dan merekam audit log `ANGGOTA_KOMSEL_ADDED`.
7. **`removeAnggotaKomselAction({ anggotaId })`**:
   - Melepaskan anggota dari kelompok Komsel (`komselId = NULL` di profil jemaat) dan menghapus entitas `AnggotaKomsel`. Merekam audit log `ANGGOTA_KOMSEL_REMOVED`.
8. **`deleteKomselAction({ id, reason })`**:
   - Soft Delete Komsel (`deletedAt = now()`, `deletedBy = userId`, `deletionReason = reason`). Melepaskan `komselId` seluruh anggota terikat. Merekam aksi `KOMSEL_DELETED` ke audit log SHA-256.

### Modul 7: Data Tamu & Pipeline Follow-Up Pastoral (`/dashboard/tamu`)

Modul pendaftaran simpatisan/pengunjung pertama kali (*Guest/Visitor Slips*) dan eksekusi pipeline pelayanan pastoral dari kontak awal hingga terkonversi menjadi Jemaat Tetap resmi Gereja.

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`JemaatDTO` dengan Status Tamu)
1. **Atribut Identitas Tamu**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `nama`: Nama lengkap tamu (Wajib).
   - `jenisKelamin`: Enum `LAK_LAKI` | `PEREMPUAN`.
   - `noHp`: Nomor telepon genggam aktif.
   - `whatsApp`: Nomor WhatsApp aktif untuk komunikasi tim pastoral.
   - `email`: Alamat surel aktif (Opsional).
   - `alamat`: Alamat domisili tempat tinggal.
   - `catatan`: Informasi pengajak, gereja asal, atau kebutuhan doa khusus.
2. **Tahapan Pipeline Follow-Up Pastoral (`statusFollowUp`)**:
   - `NEW`: Tamu baru terdaftar di sistem (Baru Tiba / Mengisi Slip Tamu).
   - `IN_PROGRESS`: Dalam komunikasi awal via Telepon / WhatsApp oleh Tim Diakonia.
   - `NEED_VISITATION`: Membutuhkan kunjungan tatap muka / konseling khusus dari Pastor.
   - `COMPLETED`: Berhasil dibina & telah menyetujui bergabung sebagai Jemaat Tetap.

#### B. Konversi Automatis 1-Klik ke Jemaat Tetap
- **Mekanisme Konversi**: Saat status follow-up diset ke `COMPLETED` atau tombol *Konversi ke Jemaat* ditekan:
  1. Status keanggotaan `statusJemaat` diubah otomatis dari `TAMU` menjadi `ACTIVE`.
  2. Sistem menggenerasi **NIJ** resmi (`NIJ-YYYY-XXXX`) via `getNextSequence('NIJ_SEQUENCE')`.
  3. Sistem menggenerasi **Barcode Code** unik (`JMT-XXXXXX`) untuk presensi QR.
  4. Data tamu berpindah secara mulus ke Master Data Jemaat aktif tanpa mengulang input data.

#### C. Katalog Server Actions Modul Tamu (`src/actions/jemaat.ts` & Tamu Handlers)
1. **`getTamuListAction(params)`**:
   - Parameter: `search` (Nama/HP/Alamat), `statusFollowUp`, `page` (default: 1), `pageSize` (default: 10).
   - Mengembalikan daftar tamu terpaginasi beserta durasi sejak kedatangan awal.
2. **`createTamuAction(input)`**:
   - Menerapkan validasi **Zod Schema**. Mengisi `statusJemaat = 'TAMU'` dan `statusFollowUp = 'NEW'`.
   - Merekam **Cryptographic Audit Log (SHA-256)** dengan aksi `TAMU_CREATED`.
3. **`updateStatusFollowUpAction({ id, statusFollowUp, catatan })`**:
   - Memperbarui tahapan pipeline pastoral + merekam audit log `TAMU_FOLLOWUP_UPDATED`.
4. **`konversiTamuKeJemaatAction({ id })`**:
   - Memproses konversi 1-klik ke Jemaat Tetap + auto-generate NIJ & Barcode + merekam audit log `TAMU_CONVERTED_TO_JEMAAT`.

---

### Modul 8: Antrean Pendaftaran Mandiri Jemaat (`/dashboard/pendaftaran`)

Modul pengelola penampung antrean permohonan pendaftaran mandiri dari calon jemaat via portal publik (`/daftar`) yang memerlukan peninjauan dan persetujuan dari Sekretariat Gereja.

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`PendaftaranQueueDTO`)
- `id`: Unique UUIDv4 (Primary Key).
- `nama`: Nama lengkap calon jemaat (Sesuai KTP).
- `namaPanggilan`: Nama panggilan.
- `jenisKelamin`: Enum `LAK_LAKI` | `PEREMPUAN`.
- `noHp`: Nomor telepon utama.
- `whatsApp`: Nomor WhatsApp aktif.
- `email`: Alamat surel aktif.
- `alamat`: Alamat domisili tempat tinggal.
- `statusPernikahan`: Enum `BELUM_MENIKAH`, `MENIKAH`, `DUDA`, `JANDA`, `BERCERAI`.
- `pekerjaan`: Jenis pekerjaan/profesi.
- `status`: Enum Status Antrean (`PENDING` | `APPROVED` | `REJECTED`).
- `createdAt`: Timestamp waktu pendaftaran dikirim dari portal publik.

#### B. Workflow Persetujuan & Auto-Provisioning Keanggotaan
1. **Pengajuan Publik (`/daftar`)**: Pengunjung mengisi form tanpa autentikasi. Data masuk dengan `status = 'PENDING'`.
2. **Peninjauan Sekretariat**: Admin memeriksa kelengkapan isian di `/dashboard/pendaftaran`.
3. **Persetujuan (Approve)**:
   - Membuat profil baru di tabel `Jemaat` dengan `statusJemaat = 'ACTIVE'`.
   - Menerbitkan **NIJ** resmi (`NIJ-XXXX`) & **Barcode Code** (`JMT-XXXXXX`).
   - Mengubah status pendaftaran menjadi `APPROVED`.
4. **Penolakan (Reject)**: Mengubah status pendaftaran menjadi `REJECTED` dengan catatan alasan penolakan.

#### C. Katalog Server Actions Modul Pendaftaran (`src/actions/pendaftaran.ts`)
1. **`submitPendaftaranMandiriAction(input)`**:
   - Public Server Action (tanpa auth guard). Validasi Zod `submitPendaftaranMandiriSchema`. Menyimpan permohonan ke tabel `PendaftaranJemaat`.
2. **`getPendaftaranQueueAction(params)`**:
   - Filter antrean berdasarkan `status` (`PENDING`/`APPROVED`/`REJECTED`), `search` + paginasi.
3. **`approvePendaftaranAction({ registrationId })`**:
   - Menerapkan pembentukan Jemaat baru + penerbitan atomic NIJ/Barcode + pembaharuan status `APPROVED` + audit log SHA-256 (`PENDAFTARAN_APPROVED`).
4. **`rejectPendaftaranAction({ registrationId, reason })`**:
   - Membatalkan pendaftaran + merekam alasan penolakan + audit log SHA-256 (`PENDAFTARAN_REJECTED`).

---

### Modul 9: Jadwal & Presensi Event QR Code (`/dashboard/event`, `/scan/[id]`)

Modul manajemen jadwal ibadah raya, event kategorial, seminar pembinaan, serta eksekusi pemindaian presensi kehadiran jemaat secara real-time berbasis kode barcode QR (`/scan/[id]`).

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`EventDTO` & `AttendanceResultDTO`)
1. **Entitas Event & Jadwal Ibadah (`EventDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `namaEvent`: Nama acara/ibadah (Contoh: "Ibadah Raya 1", "Youth Celebration", "Seminar Pernikahan").
   - `kategori`: Kategori event (`IBADAH_RAYA`, `KOMSEL`, `YOUTH`, `SEMINAR`, `SEKOLAH_MINGGU`).
   - `tanggal`: Tanggal & waktu pelaksanaan event.
   - `lokasi`: Ruangan / tempat acara (Contoh: "Main Hall Gereja").
   - `scopeId`: ID Scope Keuangan / Departemen penyelenggara.
   - `totalAttendance`: Jumlah total jemaat yang telah dipindai hadir.
   - `createdAt`: Timestamp pembuatan event.
2. **Entitas Absensi Kehadiran (`AttendanceResultDTO`)**:
   - `attendanceId`: Unique UUIDv4 presensi.
   - `jemaatId`: Foreign Key mengikat ke `Jemaat.id`.
   - `nij`: NIJ jemaat terverifikasi.
   - `barcodeCode`: Kode barcode yang dipindai.
   - `nama`: Nama lengkap jemaat.
   - `statusJemaat`: Status keanggotaan jemaat saat dipindai.
   - `scannedAt`: Timestamp waktu pemindaian presensi.
   - `idempotent`: Flag boolean `true` (jika sudah pernah dipindai sebelumnya) / `false` (scan pertama kali).

#### B. Fitur Idempotensi Scan & Kecepatan Respon (< 2 Detik)
- **Pencegahan Data Ganda (Idempotency Control)**: Apabila barcode jemaat dipindai lebih dari 1 kali pada event yang sama, sistem tidak membuat record duplicate melainkan mengembalikan `idempotent = true` dengan pesan "Jemaat Sudah Terdaftar Hadir".
- **Layar Scanner Mobile Dedicated (`/scan/[id]`)**: Antarmuka khusus kamera HP / pemindai hardware barcode yang memberikan respons audio/visual hijau (Sukses) atau merah (Gagal/Duplikat) dalam waktu di bawah 2 detik.

#### C. Katalog Server Actions Modul Event (`src/actions/event.ts`)
1. **`getEventListAction()`**:
   - Mengambil daftar seluruh event aktif beserta rekapitulasi jumlah kehadiran (`totalAttendance`).
2. **`createEventAction(input)`**:
   - Validasi via `createEventSchema` (`namaEvent`, `kategori`, `tanggal`, `lokasi`, `scopeId`). Merekam audit log SHA-256 (`EVENT_CREATED`).
3. **`scanAttendanceAction({ eventId, barcodeCode })`**:
   - Menerima `eventId` dan `barcodeCode`.
   - Memvalidasi keberadaan jemaat aktif.
   - Merekam presensi baru / mengembalikan status idempotensi < 2 detik.
   - Merekam audit log SHA-256 (`ATTENDANCE_SCANNED`).
4. **`getEventAttendanceReportAction(eventId)`**:
   - Mengambil daftar rekapitulasi nama, NIJ, dan jam scan seluruh jemaat yang hadir di event tertentu.

---

### Modul 10: Keuangan & Pembukuan Kas Gereja (`/dashboard/keuangan`, `/dashboard/keuangan/scope/[scopeId]`, `/dashboard/keuangan/laporan-gabungan`)

Modul pembukuan kas keuangan gereja multi-scope berstandar akuntansi dengan pencatatan jurnal transaksi masuk/keluar, saldo awal otomatis, penutupan periode (*Closing Period*), dan laporan arus kas gabungan.

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`LaporanKeuanganDTO` & `TransaksiKeuanganDTO`)
1. **Entitas Periode Laporan Kas (`LaporanKeuanganDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `scopeId`: Foreign Key departemen/kas (`UMUM`, `YOUTH`, `KIDS`, `DIAKONIA`, `PEMBANGUNAN`).
   - `scopeName`: Nama lengkap scope kas (Contoh: "Kas Umum Gereja").
   - `bulan`: Angka bulan laporan (1 - 12).
   - `tahun`: Tahun laporan (Contoh: 2026).
   - `saldoAwal`: Saldo awal periode (Otomatis diambil dari `saldoAkhir` bulan sebelumnya).
   - `totalPemasukan`: Rekap total transaksi masuk pada bulan terkait.
   - `totalPengeluaran`: Rekap total transaksi keluar pada bulan terkait.
   - `saldoAkhir`: Calculated Balance ($\text{Saldo Awal} + \text{Pemasukan} - \text{Pengeluaran}$).
   - `status`: Enum Status Periode (`DRAFT` | `CLOSED`).
   - `reopenReason`: Catatan alasan jika periode laporan dibuka kembali setelah ditutup.
   - `closedAt`: Timestamp penutupan resmi periode.
2. **Entitas Jurnal Transaksi Kas (`TransaksiKeuanganDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `laporanId`: Foreign Key mengikat ke `LaporanKeuangan.id`.
   - `nomorReferensi`: Nomor unik jurnal berformat `TRX-{YYYYMM}-{4_DIGIT_SEQ}` (Contoh: `TRX-202608-0015`).
   - `tipe`: Enum `MASUK` (Pemasukan) | `KELUAR` (Pengeluaran).
   - `kategori`: Kategori penerimaan/pengeluaran (Persembahan Minggu, Persepuluhan, Pembangunan, Diakonia, Operasional, Honor Pembicara, Pemeliharaan Gedung).
   - `nominal`: Amount nilai transaksi dalam Rupiah (Decimal/BigInt).
   - `metodePembayaran`: Enum `CASH`, `TRANSFER`, `QRIS`.
   - `catatan`: Keterangan detail rincian transaksi.
   - `tanggal`: Tanggal pelaksanaan transaksi.

#### B. Formula Neraca Keuangan & Aturan Penutupan Periode (Closing)
- **Persamaan Dasar Kas**:
  $$\text{Saldo Akhir} = \text{Saldo Awal} + \sum \text{Pemasukan} - \sum \text{Pengeluaran}$$
- **Proteksi Closing Period (`CLOSED`)**: Saat Bendahara menutup laporan bulan berjalan, seluruh transaksi di dalamnya terkunci (*Read-Only*) untuk mencegah manipulasi data historis.
- **Mekanisme Reopen Period**: Laporan yang telah `CLOSED` hanya dapat dibuka kembali (*Reopen*) oleh Pastor/Bendahara Utama dengan mengisi `reopenReason` yang dicatat penuh ke Audit Log SHA-256.

#### C. Katalog Server Actions Modul Keuangan (`src/actions/keuangan.ts`)
1. **`getLaporanKeuanganListAction(params)`**:
   - Parameter: `scopeId`, `tahun`, `bulan`. Mengembalikan daftar laporan kas per scope terpaginasi.
2. **`createLaporanKeuanganAction(input)`**:
   - Inisialisasi laporan periode baru + otomatis menarik `saldoAkhir` periode sebelumnya sebagai `saldoAwal`.
3. **`createTransaksiKeuanganAction(input)`**:
   - Validasi via `createTransaksiKeuanganSchema`.
   - Menambahkan transaksi baru + otomatis memperbarui `totalPemasukan`/`totalPengeluaran` dan `saldoAkhir` laporan terkait.
   - Merekam **Cryptographic Audit Log (SHA-256)** dengan aksi `TRANSAKSI_KEUANGAN_CREATED`.
4. **`finalizePeriodAction({ laporanId })`**:
   - Mengubah status laporan menjadi `CLOSED` + mengunci seluruh jurnal + merekam audit log `LAPORAN_KEUANGAN_CLOSED`.
5. **`reopenPeriodAction({ laporanId, reason })`**:
   - Pembukaan kembali laporan `CLOSED` + merekam alasan `reopenReason` + audit log `LAPORAN_KEUANGAN_REOPENED`.
6. **`getLaporanGabunganAction(params)`**:
   - Rekapitulasi konsolidasi total penerimaan, pengeluaran, dan saldo kas dari seluruh Scope Kas Gereja untuk Laporan Keuangan Tahunan/Bulanan Gembala.

---

### Modul 11: Dokumen Vault Jemaat (`/dashboard/dokumen-jemaat`, `/dashboard/dokumen-jemaat/baru`)

Modul repositori terproteksi untuk menyimpan sertifikat dan dokumen keanggotaan pribadi milik jemaat (Surat Baptis, Surat Nikah, Penyerahan Anak, Surat Keanggotaan).

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`DokumenJemaatDTO`)
- `id`: Unique UUIDv4 (Primary Key).
- `jemaatId`: Foreign Key mengikat ke `Jemaat.id` pemilik dokumen.
- `jemaatNama`: Nama lengkap jemaat pemilik.
- `jemaatNij`: NIJ jemaat pemilik.
- `judul`: Nama/Judul dokumen (Contoh: "Sertifikat Baptis Air Andreas Wijaya").
- `jenisDokumen`: Jenis dokumen (`BAPTIS`, `NIKAH`, `PENYERAHAN_ANAK`, `SAKSI`, `LAINNYA`).
- `status`: Enum Status Dokumen (`DRAFT`, `VERIFIED`, `EXPIRED`).
- `tanggalTerbit`: Tanggal resmi penerbitan dokumen.
- `tanggalKadaluarsa`: Tanggal kadaluarsa dokumen (Nullable).
- `deskripsi`: Catatan/keterangan tambahan.
- `cloudinaryPublicId`: Identifikasi unik file di storage.
- `fileUrl`: URL akses berkas (Local Upload URL / Cloudinary Signed URL).
- `mimeType`: Format MIME file (`application/pdf`, `image/png`, `image/jpeg`, `image/webp`).
- `fileSize`: Ukuran file dalam bytes (Maksimal 5MB).
- `uploadedById`: User ID staff pengunggah.
- `deletedAt`: Timestamp soft delete.

#### B. Keamanan Storage & Abstraksi File (`src/lib/storage.ts`)
- **Validasi File Strict**: Batas ukuran file maksimal **5 MB**. Tipe MIME dibatasi pada PDF dan Gambar (PNG/JPEG/WEBP).
- **Abstraksi Storage Provider**:
  - `STORAGE_PROVIDER="local"`: Disimpan di `public/uploads/dokumen/` untuk environment pengembangan.
  - `STORAGE_PROVIDER="cloudinary"`: Disimpan di Cloudinary Media Vault dengan Signed URL terproteksi untuk produksi.

#### C. Katalog Server Actions Modul Dokumen Jemaat (`src/actions/dokumen.ts`)
1. **`getDokumenJemaatListAction(params)`**:
   - Parameter: `search`, `jenisDokumen`, `status`, `jemaatId`, `page`, `pageSize`. Mengembalikan daftar dokumen terpaginasi.
2. **`getDokumenJemaatByIdAction(id)`**:
   - Detail dokumen + URL unduhan aman.
3. **`uploadDokumenJemaatAction(formData)`**:
   - Mengunggah berkas ke storage provider + validasi ukuran/MIME + menyimpan metadata + merekam audit log SHA-256 (`DOKUMEN_JEMAAT_UPLOADED`).
4. **`updateDokumenJemaatAction(input)`**:
   - Memperbarui judul, jenis, status, atau deskripsi dokumen + audit log `DOKUMEN_JEMAAT_UPDATED`.
5. **`deleteDokumenJemaatAction({ id, reason })`**:
   - Soft delete record + menghapus berkas fisik dari storage + merekam audit log SHA-256 (`DOKUMEN_JEMAAT_DELETED`).

---

### Modul 12: Arsip Dokumen Gereja (`/dashboard/arsip-gereja`, `/dashboard/arsip-gereja/baru`)

Modul repositori arsip operasional, legalitas hukum, dan inventarisasi organisasi gereja (SK Sinode, Surat Tanah, IMB, Notulen Rapat Dewan, Sertifikat Kepemilikan Aset, Perjanjian Kerjasama).

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`ArsipGerejaDTO`)
- `id`: Unique UUIDv4 (Primary Key).
- `judul`: Judul arsip gereja (Contoh: "Sertifikat Tanah Gedung Gereja").
- `jenisArsip`: Jenis kategori arsip (`LEGALITAS`, `NOTULEN`, `SURAT_MASUK`, `SURAT_KELUAR`, `KONTRAK`, `KEUANGAN_ARCHIVE`).
- `kategorialId`: Foreign Key departemen/kategorial pemilik arsip (Nullable).
- `kategorialNama`: Nama kategorial terkait.
- `tanggalDokumen`: Tanggal resmi penerbitan/pencatatan dokumen.
- `status`: Enum Status Arsip (`AKTIF`, `INAKTIF`, `PERMANEN`).
- `deskripsi`: Catatan ringkasan isi arsip.
- `cloudinaryPublicId`: Identifikasi file di storage.
- `fileUrl`: URL berkas dokumen.
- `mimeType`: Format MIME berkas (PDF/Gambar).
- `fileSize`: Ukuran berkas (Maksimal 5MB).
- `uploadedById`: User ID staff pengunggah.
- `deletedAt`: Timestamp soft delete.

#### B. Proteksi Akses & Klasifikasi Berkas
- **Pemisahan dari Dokumen Pribadi**: Modul Arsip Gereja terpisah secara penuh dari Dokumen Jemaat untuk menjamin kerahasiaan sertifikat organisasi.
- **Proteksi Akses PBAC**: Akses dibatasi pada peran `SUPER_ADMIN`, `GEMBALA`, dan `SEKRETARIS` via guard `enforcePermission('document.read')`.

#### C. Katalog Server Actions Modul Arsip Gereja (`src/actions/arsip.ts`)
1. **`getArsipGerejaListAction(params)`**:
   - Parameter: `search`, `jenisArsip`, `kategorialId`, `status`, `page`, `pageSize`. Mengembalikan daftar arsip terpaginasi.
2. **`uploadArsipGerejaAction(formData)`**:
   - Upload berkas arsip ke storage provider (`public/uploads/arsip/` atau Cloudinary) + validasi 5MB/MIME + merekam audit log SHA-256 (`ARSIP_GEREJA_UPLOADED`).
3. **`updateArsipGerejaAction(input)`**:
   - Pembaruan judul, jenis, atau status arsip + audit log `ARSIP_GEREJA_UPDATED`.
4. **`deleteArsipGerejaAction({ id, reason })`**:
   - Soft delete record + hapus file dari storage + audit log `ARSIP_GEREJA_DELETED`.

---

### Modul 13: Materi Khotbah & Renungan Harian (`/dashboard/materi`, `/dashboard/materi/baru`, `/dashboard/materi/[id]/edit`)

Modul manajemen materi khotbah minggu, artikel pengajaran rohani, dan renungan harian yang dipublikasikan ke portal publik Gereja.

#### A. Spesifikasi Struktur & Atribut Data Lengkap (`MateriRenunganDTO` & `KategoriMateriDTO`)
1. **Entitas Materi Renungan (`MateriRenunganDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `judul`: Judul khotbah / renungan (Contoh: "Hidup Yang Berdampak Bagi Kota").
   - `slug`: URL-friendly slug unik (Contoh: `hidup-yang-berdampak-bagi-kota`). Diterbitkan otomatis dari judul.
   - `kategoriId`: Foreign Key mengikat ke `KategoriMateri.id`.
   - `kategoriNama`: Nama kategori materi.
   - `kategoriSlug`: Slug URL kategori.
   - `pembicara`: Nama pengkhotbah / penulis renungan (Contoh: "Pdt. Andreas Wijaya, M.Th.").
   - `tanggal`: Tanggal publikasi renungan.
   - `status`: Enum Status Publikasi (`DRAFT` | `PUBLISHED`).
   - `thumbnailUrl`: URL gambar sampul/thumbnail renungan.
   - `ringkasan`: Rangkuman singkat materi (tampil pada card pratinjau).
   - `konten`: Rich Text HTML string hasil olahan TipTap Editor.
   - `totalDilihat`: Counter angka total pembaca artikel (Di-inkremen otomatis saat publik mengakses `/renungan/[slug]`).
   - `createdAt`: Timestamp pembuatan.
2. **Entitas Kategori Materi (`KategoriMategoriDTO`)**:
   - `id`: Unique UUIDv4 (Primary Key).
   - `nama`: Nama kategori khotbah (Contoh: "Khotbah Minggu", "Renungan Harian", "Pemahaman Alkitab", "Pengajaran Youth").
   - `slug`: URL slug kategori.
   - `totalMateri`: Rekap jumlah materi di dalam kategori ini.

#### B. Integrasi Rich Text Editor (TipTap Editor) & Component Preset
- **Fitur Text Formatting**: Headings H1-H3, Bold, Italic, Underline, Strikethrough, Hyperlink, Image Upload, Bullet List, Numbered List, dan **Bible Callout Box** (Komponen kutipan ayat alkitab berdesain khusus).

#### C. Katalog Server Actions Modul Materi Renungan (`src/actions/materi.ts`)
1. **`getMateriListAction(params)`**:
   - Parameter: `search`, `kategoriId`, `status` (`DRAFT`/`PUBLISHED`), `page`, `pageSize`. Mengembalikan daftar materi terpaginasi.
2. **`getMateriBySlugPublicAction(slug)`**:
   - Public Action (tanpa auth guard). Mengambil artikel renungan berdasarkan `slug`, memverifikasi `status = 'PUBLISHED'`, dan meng-inkremen `totalDilihat` (+1).
3. **`createMateriAction(formData)`**:
   - Validasi Zod `createMateriSchema` + generate `slug` unik + upload thumbnail ke storage (`public/uploads/materi/` atau Cloudinary) + merekam audit log SHA-256 (`MATERI_CREATED`).
4. **`updateMateriAction(formData)`**:
   - Memperbarui isi khotbah/renungan + sync thumbnail baru (jika diubah) + audit log `MATERI_UPDATED`.
5. **`deleteMateriAction({ id, reason })`**:
   - Soft delete materi + hapus thumbnail dari storage + audit log SHA-256 (`MATERI_DELETED`).
6. **`createKategoriMateriAction(input)`**:
   - Tambah kategori khotbah baru + generate `slug` + audit log `KATEGORI_MATERI_CREATED`.

### Modul 14: Portal Publik Verifikasi Keanggotaan & Renungan (`/`, `/daftar`, `/profil-jemaat`, `/renungan/[slug]`)

Modul layanan publik independen (*Public Facing Application Layer*) yang tidak memerlukan autentikasi login staff. Dirancang dengan keunggulan estetika modern, dukungan mode Terang & Gelap (**next-themes**), kepatuhan Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27/2022), serta aksesibilitas tinggi (WCAG 2.2 AA).

#### A. Rincian Sub-Halaman & Komponen Portal Publik

1. **Beranda Utama / Landing Page (`/`)**:
   - **Hero Banner Section**: Selamat datang di Gereja, badge kepatuhan UU PDP, dan tombol CTA utama (*Pendaftaran Jemaat Baru* & *Verifikasi NIJ*).
   - **Portal Layanan Publik Grid**: Tiga kartu akses cepat berbasis shadcn `Card` (Pendaftaran Mandiri, Verifikasi Kartu Jemaat, Presensi QR Event).
   - **Seksi Materi & Renungan Terbaru**: Grid kartu renungan harian yang telah dipublikasikan (`status = 'PUBLISHED'`) dengan thumbnail, kategori, statistik pembaca, dan pembicara.
   - **Seksi Jadwal Ibadah Minggu & Kegiatan**: Kartu jadwal Ibadah Raya 1 (08.00 WIB), Ibadah Raya 2 (10.30 WIB), serta Ibadah Komsel & Pemuda (Jumat & Sabtu 19.00 WIB).
   - **Footer Kontak Sekretariat**: Alamat gereja (Jl. Niaga No. 14, Padang), nomor telepon, email resmi, dan disclaimer hak cipta UU PDP.

2. **Formulir Pendaftaran Jemaat Mandiri (`/daftar`)**:
   - **Public Entry Form**: Form interaktif tanpa login yang menerima isian Nama Lengkap, Nama Panggilan, Jenis Kelamin, No HP, WhatsApp, Email, Alamat, Status Pernikahan, dan Pekerjaan.
   - **Validasi Zod Strict (`submitPendaftaranMandiriSchema`)**: Memastikan input nomor telepon dan format data valid sebelum dikirim.
   - **Dedicated Full-Page Success Confirmation**: Setelah pengiriman sukses, antarmuka berganti menjadi halaman konfirmasi sukses (*Dedicated Success View*) yang menampilkan nama pendaftar, icon animasi sukses, panduan 3 langkah tata kelola sekretariat, serta opsi mendaftarkan anggota keluarga lain.

3. **Portal Verifikasi Keanggotaan Jemaat UU PDP (`/profil-jemaat`)**:
   - **Kepatuhan Hukum UU PDP No. 27/2022**: Menggunakan strategi pencarian **Exact Match Only** (hanya berdasarkan NIJ persis `NIJ-XXXX` atau Kode Barcode `JMT-XXXXXX`). Pencarian berbasis nama/wildcard (*LIKE %query%*) dilarang keras untuk mencegah pemindaian massal data pribadi.
   - **Proteksi Rate Limiting**: Pembatasan maksimal 20 permintaan per menit per IP (`checkRateLimit(clientIp, 20, 60000)`). Jika terlampaui, mengembalikan status `RATE_LIMITED` dengan banner peringatan 1 menit.
   - **Eksklusi Rekaman Tamu**: Menolak verifikasi data dengan `statusJemaat = 'TAMU'` atau data yang telah di-soft-delete (`deletedAt != null`).
   - **Payload DTO Minimalis (`PublicVerificationDTO`)**: Hanya mengembalikan field aman: `nama`, `nij`, `statusJemaat`, dan kategori status keanggotaan tanpa membocorkan nomor telepon, alamat, maupun tanggal lahir.

4. **Halaman Baca Renungan Harian (`/renungan/[slug]`)**:
   - **Dynamic Route & Incremental Views Counter**: Menerima parameter `slug`, memverifikasi status `PUBLISHED` via `getMateriBySlugPublicAction(slug)`, dan meng-inkremen angka pembaca `totalDilihat` (+1) secara otomatis.
   - **Sticky Collapsible Accordion Table of Contents (TOC)**:
     - **Parsing Otomatis**: Fungsi `parseTocHeadings` mengekstraksi seluruh tag heading H1-H3 dari HTML TipTap Editor dan memberikan atribut `id="heading-X"` serta `scroll-mt-24`.
     - **Tampilan Mobile (Responsive Accordion)**: Tombol header dropdown sticky di bawah Top Bar. Menampilkan teks *"Daftar Isi Artikel"* + Badge jumlah heading + Chevron rotate 180°. Otomatis menutup (*Auto-Close*) saat jemaat menekan salah satu judul heading.
     - **Tampilan Desktop (`lg:sticky lg:top-20`)**: Sidebar navigasi daftar isi menempel di samping artikel saat di-scroll.
   - **Fitur Share & Social Buttons**:
     - **WhatsApp Share**: Membuka API WhatsApp dengan teks judul & URL artikel terformat.
     - **Facebook Share**: Membuka dialog Facebook Sharer.
     - **Copy Link**: Menyalin URL langsung ke clipboard disertai notifikasi Toast `useToast()`.

#### B. Katalog Server Actions Portal Publik (`src/actions/publik.ts` & `src/actions/materi.ts`)
1. **`getProfilPublikAction(query, clientIp)`**:
   - Memeriksa Rate Limit IP (max 20 req/min). Executing Exact Match pencarian NIJ/Barcode. Mengembalikan `PublicVerificationDTO` atau error `NOT_FOUND` / `RATE_LIMITED`.
2. **`submitPendaftaranMandiriAction(input)`**:
   - Menyimpan isian form publik pendaftaran mandiri ke antrean `PendaftaranJemaat` dengan status `PENDING`.
3. **`getMateriBySlugPublicAction(slug)`**:
   - Mengambil artikel renungan `PUBLISHED` berdasarkan slug, menambah `totalDilihat = totalDilihat + 1`, dan mengembalikan DTO materi lengkap untuk dibaca.

### Modul 15: Pengelolaan Pengguna (User Management) & Hak Akses Peran (`/dashboard/users`, `/dashboard/users/baru`, `/dashboard/users/[id]`)

Modul administrasi akun staf dan tata kelola hak akses sistem (*Identity & Access Management - IAM*) yang mengatur siklus hidup kredensial, penugasan peran (**Role-Based Access Control - RBAC**), penegakan izin operasional (**Policy-Based Access Control - PBAC**), status akun (`AKTIF`, `NONAKTIF`, `SUSPENDED`), pengaturan ulang kata sandi terenkripsi (Bcrypt Salt 10), serta perekaman jejak audit kriptografi SHA-256 untuk setiap aktivitas pengelolaan pengguna.

#### A. Matriks Peran (Role Matrix), Tugas & Tanggung Jawab Operasional

Sistem mendefinisikan 5 tingkatan peran staf internal secara hierarkis:

1. **`SUPER_ADMIN` (Administrator Utama & IT Gereja)**:
   - **Tugas & Tanggung Jawab**: Pengaturan seluruh parameter sistem CMS, manajemen akun staf (tambah/edit/reset/deaktivasi), pemantauan log audit kriptografi SHA-256 (`/dashboard/audit`), pengawasan integritas database PostgreSQL, dan konfigurasi penyimpanan berkas (*Cloudinary / Local*).
   - **Cakupan Hak Akses**: Akses penuh 100% (*Full Privilege*) ke seluruh modul (Modul 1–15).
   - **Proteksi Khusus**: Sistem mencegah penghapusan atau penonaktifan akun Super Admin terakhir (*Last Super Admin Lock*) untuk mencegah penguncian sistem (*System Lockout*).

2. **`GEMBALA` (Gembala Sidang / Pastor / Pemimpin Rohani)**:
   - **Tugas & Tanggung Jawab**: Penggembalaan jemaat, peninjauan perkembangan jiwa baru & pipeline follow-up pastoral tamu (`/dashboard/tamu`), pemantauan pertumbuhan komsel & kategorial, peninjauan persetujuan pendaftaran jemaat baru (`/dashboard/pendaftaran`), pemantauan transparansi keuangan gereja (`/dashboard/keuangan`), penulisan & publikasi materi khotbah/renungan (`/dashboard/materi`).
   - **Cakupan Hak Akses**: Akses baca/tulis ke Master Jemaat, Keluarga, Kategorial, Pelayan, Komsel, Tamu Pastoral, Antrean Pendaftaran, Jadwal Event & Presensi, Vault Dokumen Jemaat, Arsip Gereja, Materi Khotbah, serta pembacaan & pembukaan kembali transaksi kas keuangan (`keuangan.read`, `keuangan.create`, `keuangan.reopen`).

3. **`SEKRETARIS` (Sekretariat Gereja & Tata Usaha)**:
   - **Tugas & Tanggung Jawab**: Pengelolaan administrasi harian gereja, pemrosesan antrean pendaftaran mandiri calon jemaat (`/dashboard/pendaftaran`), penerbitan Nomor Induk Jemaat (NIJ) & Barcode, pencatatan data keluarga & kategorial, pengelolaan arsip surat masuk/keluar/notulen (`/dashboard/arsip-gereja`), upload dokumen sertifikat baptis/nikah jemaat (`/dashboard/dokumen-jemaat`), pembuatan jadwal event & tiket presensi ibadah (`/dashboard/event`).
   - **Cakupan Hak Akses**: Akses operasional administrasi jemaat lengkap, presensi event, vault dokumen jemaat, arsip gereja, materi pengajaran, dan antrean pendaftaran mandiri.

4. **`BENDAHARA` (Bendahara Gereja & Akuntansi)**:
   - **Tugas & Tanggung Jawab**: Pengelolaan buku kas gereja multi-scope (Kas Umum, Kas Pemuda, Kas Anak, Kas Diakonia), pencatatan transaksi penerimaan kas (kolekte ibadah raya, perpuluhan, persembahan khusus, donasi transfer) dan pengeluaran kas (biaya operasional, listrik/air/internet, bantuan kasih, honor pembicara), penutupan buku kas bulanan (*Monthly Closing*), serta pencetakan laporan keuangan gabungan.
   - **Cakupan Hak Akses**: Akses khusus Modul Keuangan (`keuangan.read`, `keuangan.create`, `keuangan.close`) dan dokumen arsip keuangan.

5. **`USHER` (Petugas Penyambut & Operator Scanner QR)**:
   - **Tugas & Tanggung Jawab**: Bertugas di pintu masuk gereja saat ibadah raya atau seminar berlangsung untuk memindai kartu jemaat fisik (barcode) atau QR code pada ponsel jemaat via aplikasi mobile scanner (`/scan/[id]`) untuk mencatat presensi secara sub-50ms.
   - **Cakupan Hak Akses**: Terisolasi khusus pada modul pemindaian event (`scan.execute`). Tidak memiliki akses ke data sensitif jemaat, catatan keuangan, maupun konfigurasi sistem.

#### B. Spesifikasi Entitas Database & DTO (`UserDTO`)

1. **Model Database `User` (`prisma/schema.prisma`)**:
   - `id`: String UUIDv4 Primary Key.
   - `username`: String Unique (3–50 karakter alfanumerik).
   - `email`: String Unique (format email valid).
   - `nama`: String nama lengkap staf.
   - `passwordHash`: String hash kata sandi menggunakan algoritma **Bcrypt** dengan salt round 10.
   - `role`: Enum `Role` (`SUPER_ADMIN`, `GEMBALA`, `SEKRETARIS`, `BENDAHARA`, `USHER`).
   - `status`: Enum `StatusUser` (`AKTIF`, `NONAKTIF`, `SUSPENDED`) - Default: `AKTIF`.
   - `noHp`: String nomor telepon/WhatsApp staf (opsional).
   - `fotoUrl`: String URL avatar foto profil staf (opsional).
   - `lastLoginAt`: DateTime timestamp aktivitas login terakhir.
   - `lastLoginIp`: String IP address perangkat saat login terakhir.
   - `deletedAt`: DateTime soft delete timestamp.
   - `deletedBy`: String aktor penghapus.
   - `deletionReason`: String alasan resmi penghapusan akun.
   - `createdAt` & `updatedAt`: Timestamps audit sistem.

2. **Data Transfer Object `UserDTO` (Anti-Leakage Data)**:
   - `UserDTO` secara tegas **TIDAK MENGEKSPOS** `passwordHash` ke sisi client:
     ```ts
     type UserDTO = {
       id: string
       username: string
       email: string
       nama: string
       role: Role
       status: "AKTIF" | "NONAKTIF" | "SUSPENDED"
       noHp: string | null
       fotoUrl: string | null
       lastLoginAt: string | null
       createdAt: string
       updatedAt: string
     }
     ```

#### C. Rincian Sub-Halaman & Komponen Antarmuka Modul User

1. **Daftar Pengguna & Staf Gereja (`/dashboard/users`)**:
   - **Header Bar**: Judul *"Pengelolaan Pengguna & Hak Akses"*, deskripsi panduan, tombol CTA `+ Tambah Pengguna Baru`.
   - **4 Kartu Ringkasan Statistik (Summary Cards)**:
     - *Total Akun Staf*: Total seluruh pengguna terdaftar di sistem.
     - *Pengguna Aktif*: Jumlah akun dengan status `AKTIF` yang dapat login.
     - *Pengguna Nonaktif / Suspended*: Jumlah akun yang dinonaktifkan sementara.
     - *Distribusi Peran*: Rekapitulasi jumlah Super Admin, Gembala, Sekretaris, Bendahara, dan Usher.
   - **Toolbar Filter & Pencarian**:
     - Input pencarian real-time (Nama Lengkap, Username, Email).
     - Filter Dropdown Peran (Semua Peran, Super Admin, Gembala, Sekretaris, Bendahara, Usher).
     - Filter Dropdown Status (Semua Status, Aktif, Nonaktif).
     - Dropdown Toggle Kolom Tampilan (*Column Visibility*).
   - **DataTable Interaktif (shadcn/ui Table)**:
     - Kolom: Avatar & Nama Lengkap, Username, Email, Badge Role (dengan warna aksen spesifik per peran), Badge Status (`AKTIF` emerald / `NONAKTIF` amber), Terakhir Login (format tanggal & jam lokal), serta Menu Aksi Dropdown.
     - **Menu Aksi Pengguna**:
       - *Lihat Detail Profil* (`/dashboard/users/[id]`).
       - *Edit Data Staf* (Dialog / Modal edit nama, email, no HP, dan peran).
       - *Reset Password* (Modal pembuatan password baru sementara atau acak).
       - *Aktivasi / Deaktivasi Akun* (Toggle instan status `AKTIF` / `NONAKTIF`).
       - *Hapus Akun* (AlertDialog konfirmasi soft delete dengan input alasan wajib).
   - **Dialog Tambah Pengguna Cepat**: Modal popup dengan validasi instan untuk mendaftarkan staf baru tanpa berpindah halaman.
   - **AlertDialog Konfirmasi Hapus Akun**: Dilengkapi pengecekan sistem untuk menolak penghapusan akun jika user merupakan Super Admin aktif terakhir.

2. **Formulir Pendaftaran Staf Baru (`/dashboard/users/baru`)**:
   - **Field Formulir**:
     - *Informasi Akun*: Nama Lengkap Staf, Username (alfanumerik unik), Alamat Email Resmi, Nomor Handphone / WhatsApp.
     - *Otoritas & Peran*: Dropdown pemilihan Role (`SUPER_ADMIN`, `GEMBALA`, `SEKRETARIS`, `BENDAHARA`, `USHER`) dengan penjelasan wewenang masing-masing.
     - *Keamanan Kata Sandi*: Kata Sandi Awal (minimal 6 karakter) dan Konfirmasi Kata Sandi.
     - *Status Awal*: Pilihan status akun (`AKTIF` langsung bisa login, atau `NONAKTIF`).
   - **Tombol Aksi**: *Simpan Akun Pengguna* & *Batal*.

3. **Detail Profil Pengguna & Log Aktivitas (`/dashboard/users/[id]`)**:
   - **Kartu Profil Staf**: Menampilkan avatar, nama, role badge, username, email, nomor kontak, tanggal terdaftar, status akun, serta riwayat IP login terakhir.
   - **Tabel Jejak Audit Aktivitas (SHA-256 Activity Trail)**: Menampilkan 20 riwayat tindakan terakhir yang dilakukan oleh staf tersebut di seluruh modul CMS (misal: menambahkan jemaat, menyetujui pendaftaran, mencatat kas, menghapus arsip) bersumber dari tabel `AuditLog`.
   - **Aksi Cepat**: Tombol *Ubah Peran*, *Reset Kata Sandi*, *Nonaktifkan Akun*, dan *Hapus Pengguna*.

#### D. Fitur Keamanan & Tata Kelola Kredensial

1. **Hashing Kata Sandi Satu Arah (Bcrypt)**: Kata sandi pengguna tidak pernah disimpan dalam bentuk teks biasa (*plaintext*). Sistem menggunakan enkripsi `bcryptjs` dengan salt round 10.
2. **Validasi Kekuatan Kata Sandi**: Validasi Zod memeriksa panjang minimal kata sandi saat pendaftaran dan reset password.
3. **Mekanisme Reset Password Aman**: Administrator dapat mereset kata sandi staf dengan memasukkan password baru atau membuat password acak sementara. Setiap aksi reset password langsung dicatat ke rantai audit SHA-256.
4. **Deaktivasi Instan (Kill Switch)**: Staf yang dinonaktifkan (`status = 'NONAKTIF'`) secara otomatis ditolak pada sesi login berikutnya.
5. **Pencegahan Penghapusan Diri Sendiri (*Self-Deletion Prevention*)**: Administrator yang sedang login tidak dapat menghapus akunnya sendiri secara tidak sengaja.
6. **Proteksi Super Admin Terakhir (*Last Super Admin Lock*)**: Sistem menghitung jumlah Super Admin aktif. Jika hanya tersisa 1 Super Admin, perintah hapus atau nonaktifkan akan ditolak keras oleh Server Action demi menjaga keberlanjutan kontrol sistem.

#### E. Katalog Server Actions Modul User (`src/actions/users.ts`)

1. **`getUserListAction(params)`**:
   - Menerima parameter filter: `search` (Nama/Username/Email), `role`, `status`, `page`, `pageSize`.
   - Melakukan paginasi database (`skip`, `take`) dan mengembalikan `UserDTO[]` beserta statistik ringkas.
   - Memeriksa hak akses PBAC (`SUPER_ADMIN`).
2. **`getUserByIdAction(id)`**:
   - Mengambil detail akun staf dan rekapitulasi riwayat aksi audit log staf dari database.
3. **`createUserAction(input)`**:
   - Validasi Zod (`createUserSchema`), verifikasi keunikan username & email di PostgreSQL.
   - Enkripsi kata sandi via `bcrypt.hash(password, 10)`.
   - Membuat record `User` baru dan merekam audit log kriptografi SHA-256 `USER_CREATED`.
4. **`updateUserAction(input)`**:
   - Validasi Zod (`updateUserSchema`), pembaruan nama, email, noHp, dan role.
   - Merekam audit log kriptografi SHA-256 `USER_UPDATED` (mencatat *beforeState* & *afterState*).
5. **`resetUserPasswordAction(input)`**:
   - Menerima `userId` dan `newPassword`.
   - Melakukan validasi panjang password, enkripsi Bcrypt, dan update `passwordHash`.
   - Merekam audit log kriptografi SHA-256 `USER_PASSWORD_RESET`.
6. **`toggleUserStatusAction(id, newStatus)`**:
   - Memeriksa proteksi Super Admin terakhir sebelum menonaktifkan akun.
   - Mengubah status akun menjadi `AKTIF` atau `NONAKTIF`.
   - Merekam audit log kriptografi SHA-256 `USER_STATUS_TOGGLED`.
7. **`deleteUserAction({ id, reason })`**:
   - Memeriksa pencegahan *self-deletion* dan proteksi Super Admin terakhir.
   - Menerapkan **Soft Delete** (`deletedAt = now()`, `deletedBy = actor`, `deletionReason = reason`).
   - Merekam audit log kriptografi SHA-256 `USER_DELETED`.

---

## 4. ALUR KERJA BISNIS & END-TO-END FLOW CHART

```
+---------------------------------------------------------------------------------------------------+
|                                  ALUR KERJA UTAMA SISTEM CMS                                     |
+---------------------------------------------------------------------------------------------------+

[1. PENDAFTARAN MANDIRI JEMAAT]
Pengunjung Publik ---> Mengisi Form (/daftar) ---> Masuk Antrean Pendaftaran (/dashboard/pendaftaran)
                                                          |
                                           +--------------+--------------+
                                           |                             |
                                    [Setujui / Approve]           [Tolak / Reject]
                                           |                             |
                                   Sistem Buat Jemaat            Notifikasi & Status
                                    + NIJ + Barcode              Pendaftaran Dibatalkan

[2. PENANGANAN TAMU BARU]
Tamu Datang ---> Dicatat di Modul Tamu (/dashboard/tamu) ---> Pipeline Pastoral (Kunjungan/Telepon)
                                                                       |
                                                              [Konversi ke Jemaat]
                                                                       |
                                                              Terbit NIJ & Barcode

[3. PRESENSI IBADAH EVENT]
Jemaat Tiba ---> Tunjukkan QR Barcode ---> Scanned oleh Usher via (/scan/[id]) ---> Presensi Tercatat

[4. PUBLIKASI KHOTBAH / RENUNGAN]
Admin Tulis Khotbah di TipTap Editor (/dashboard/materi) ---> Set Status PUBLISHED ---> Tampil di (/renungan/[slug])
                                                                                                |
                                                                                       TOC Sticky Mobile/Desktop

[5. PEMBUKUAN KEUANGAN]
Penerimaan Kas (Persembahan/Persepuluhan) ---> Input Transaksi Per Scope ---> Rekap Laporan Gabungan

[6. PENGELOLAAN PENGGUNA & HAK AKSES]
Super Admin Buka (/dashboard/users) ---> Tambah/Edit User & Tetapkan Role ---> Enkripsi Bcrypt + SHA-256 Audit Log
```

---

### Alur Detail Step-by-Step:

#### Alur A: Pendaftaran Jemaat Mandiri Hingga Penerbitan NIJ
1. **Input Publik**: Jemaat membuka `/daftar`, mengisi nama lengkap, nomor kontak, jenis kelamin, alamat, dan status pernikahan.
2. **Penyimpanan Antrean**: Data tersimpan dengan status `PENDING` di modul Antrean Pendaftaran.
3. **Verifikasi Sekretariat**: Admin membuka `/dashboard/pendaftaran`, memeriksa keabsahan berkas.
4. **Persetujuan**: Saat disetujui, sistem secara otomatis:
   - Membuat rekaman baru di tabel `Jemaat`.
   - Menggenerasi **NIJ** resmi (contoh: `NIJ-2026-0042`).
   - Menggenerasi **Barcode Code** (contoh: `JMT-893201`).
   - Mengubah status pendaftaran menjadi `APPROVED`.

#### Alur B: Pemindaian Presensi Event / Ibadah Raya
1. **Persiapan Event**: Admin membuat event ibadah baru di `/dashboard/event` (misal: "Ibadah Raya 1 - Minggu 17 Agustus 2026").
2. **Tampilan Scanner**: Usher/Pelayan membuka rute `/scan/[eventId]`.
3. **Proses Scan**: Usher mengarahkan kamera atau pemindai barcode ke kartu jemaat.
4. **Validasi**: Sistem memverifikasi kode barcode, mencatat timestamp kehadiran, dan menampilkan feedback visual hijau (Sukses) atau merah (Sudah Terdaftar / Tidak Valid) dalam waktu < 2 detik.

#### Alur C: Pengelolaan Tamu Baru & Konsolidasi Pastoral
1. **Pencatatan**: Pengunjung baru yang datang diibadahi dicatat di `/dashboard/tamu`.
2. **Follow-Up**: Tim diakonia/pastoral memperbarui status follow-up (`PERLU_KUNJUNGAN` -> `DALAM_PROSES`).
3. **Konversi**: Apabila tamu memutuskan menjadi anggota tetap, admin menekan tombol *Konversi ke Jemaat*, yang secara otomatis memindahkan data tamu ke Master Data Jemaat dan menerbitkan NIJ.

#### Alur D: Pembukuan Keuangan & Laporan Gabungan
1. **Input Transaksi**: Bendahara membuka `/dashboard/keuangan` atau rute scope khusus (`/dashboard/keuangan/scope/[scopeId]`).
2. **Pencatatan Jurnal**: Menambahkan transaksi (Kategori: `MASUK` atau `KELUAR`, Jumlah, Tanggal, Keterangan).
3. **Konsolidasi**: Sistem menghitung total saldo per scope dan menyusun Laporan Gabungan Keuangan Gereja di `/dashboard/keuangan/laporan-gabungan`.

#### Alur E: Tata Kelola Akun Pengguna Staf & Hak Akses (Modul 15)
1. **Pendaftaran Staf Baru**: Super Admin membuka `/dashboard/users/baru` atau membuka Dialog Tambah Pengguna di `/dashboard/users`.
2. **Penetapan Otoritas & Role**: Menetapkan peran operasional (`SUPER_ADMIN`, `GEMBALA`, `SEKRETARIS`, `BENDAHARA`, `USHER`).
3. **Enkripsi Kata Sandi**: Kata sandi di-hash secara aman menggunakan algoritma **Bcrypt** (Salt 10).
4. **Pencatatan Audit Trail Kriptografi**: Pembuatan akun memicu pencatatan audit log `USER_CREATED` dengan rantai hash SHA-256 anti-manipulasi.
5. **Pemeliharaan & Reset Kredensial**: Super Admin dapat mereset kata sandi staf (`USER_PASSWORD_RESET`), mengaktifkan/menonaktifkan akun (`USER_STATUS_TOGGLED`), atau melakukan soft delete (`USER_DELETED`) dengan proteksi anti-lockout Super Admin terakhir.

---

## 5. KEPATUHAN HUKUM & KEAMANAN DATA (UU PDP & SECURITY)

### 1. Kepatuhan Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27/2022):
- **Prinsip Minimalisasi Data**: Portal verifikasi publik (`/profil-jemaat`) hanya dapat diakses dengan pencarian persis (*Exact Match*) NIJ atau Barcode. Tidak ada pencarian wildcard (*LIKE %query%*) untuk mencegah ekstraksi massal data jemaat.
- **Proteksi Data Sensitif**: Informasi keuangan, dokumen pribadi, dan catatan medis/pastoral hanya dapat diakses oleh peran berwenang (Gembala & Super Admin).

### 2. Strategi Penyimpanan File Upload (`src/lib/storage.ts`):
- **Environment Development**: Menggunakan **Local File Storage** (`public/uploads/{folder}/`) agar pengujian lokal cepat dan tanpa ketergantungan API pihak ketiga.
- **Environment Production**: Menggunakan **Cloudinary Media Storage** dengan URL terproteksi & signed URL (berlaku 15 menit) untuk dokumen pribadi.
- **Abstraksi Mulus**: Variabel `.env` `STORAGE_PROVIDER="local"` / `STORAGE_PROVIDER="cloudinary"` mengontrol seluruh operasi tanpa mengubah skema database Prisma.

---

## 6. SPESIFIKASI TEKNOLOGI & ARSITEKTA SERVER

- **Framework Core**: Next.js 16.2.12 (App Router dengan Turbopack)
- **Bahasa**: TypeScript 5.7.2 (Strict Mode)
- **Database & ORM**: PostgreSQL Serverless (Neon DB) & Prisma ORM 6.19.3
- **Design System & UI**: **shadcn/ui** berbasis Radix UI Primitives, Tailwind CSS (HSL CSS Variables), dan Lucide Icons
- **Rich Text Editor**: TipTap Editor 3.30.0 (Starter Kit, Image, Link, Underline)
- **State & Theme Management**: `next-themes` (Dark Mode & Light Mode switcher)
- **Manajemen Sesi & Validasi**: Zod Schema Validation & Custom Authentication Server Actions

---

> **Dokumen PRD & System Flow Summary ini sah dan berlaku sebagai panduan operasional teknis utama Church CMS v4.2.0.**
