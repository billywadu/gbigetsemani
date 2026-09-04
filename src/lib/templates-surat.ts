import { SuratResmiFormValues } from './validations/surat'

export interface SuratTemplatePreset {
  id: string
  title: string
  kategori: string
  description: string
  badge: string
  values: Partial<SuratResmiFormValues>
}

export const SURAT_PRESET_TEMPLATES: SuratTemplatePreset[] = [
  {
    id: 'SIDANG_MAJELIS_DAERAH',
    title: 'Surat Undangan Sidang / Rapat Majelis',
    kategori: 'UNDANGAN',
    badge: 'Resmi Sinode / BPD',
    description:
      'Format lengkap undangan sidang majelis daerah/jemaat dengan kop 2 logo (Sinode & Daerah), jadwal pertemuan hybrid, dan petunjuk nomor VA.',
    values: {
      modeLogo: 'DUA_LOGO',
      kopNama: 'BADAN PEKERJA DAERAH DKI JAKARTA\nGEREJA BETHEL INDONESIA',
      kopSub: 'SEKRETARIAT BPD GBI DKI JAKARTA',
      kopBadanHukum:
        'Badan Hukum Gereja: SK Dirjen Bimas Kristen/Protestan Departemen Agama RI No.41 Tahun 1972',
      kopAlamat:
        'Jl. Prof. Dr. Latumeten No.50, Sentra Latumeten Blok C 5-6 Jakarta - 11460',
      kopKontak:
        'Telp: (021) 56965331 • Fax: (021) 5673603 • Email: bpdgbidkijkte@yahoo.com',
      garisKopStyle: 'DOUBLE',
      garisKopColor: '#1e3a8a',
      perihal: 'SIDANG MD BPD DKI JAKARTA',
      lampiran: '-',
      tempatSurat: 'Jakarta',
      kategori: 'UNDANGAN',
      status: 'DRAFT',
      tujuanKepada:
        'Bapak/Ibu Gembala Jemaat / Gembala Pembina\nDan seluruh Pejabat (Pdt, Pdm, Pdp)\nGereja Bethel Indonesia, se-DKI Jakarta',
      tujuanDi: 'Di Jakarta',
      salamPembuka: 'Salam dalam kasih Kristus,',
      paragrafPembuka:
        'Dengan ucapan syukur dan penuh sukacita, Badan Pekerja Daerah DKI Jakarta Gereja Bethel Indonesia memberitahukan kembali perihal Sidang Majelis Daerah DKI Jakarta Gereja Bethel Indonesia, bahwa:',
      subJudul: 'SIDANG MAJELIS DAERAH',
      poinIsi: [
        {
          id: '1',
          text: 'Sidang MD BPD DKI Jakarta periode berjalan akan dilaksanakan pada hari Selasa – Rabu bertempat di Gedung Pertemuan GBI.',
          isBold: false,
        },
        {
          id: '2',
          text: 'Sidang MD ini adalah Sidang MD yang wajib diikuti oleh seluruh Pejabat GBI (Pdt, Pdm, Pdp) yang ada di wilayah terkait.',
          isBold: false,
        },
        {
          id: '3',
          text: 'Pelaksanaan SMD diputuskan memakai mekanisme Hybrid (perpaduan antara online interaktif dan onsite langsung di lokasi).',
          isBold: false,
        },
        {
          id: '4',
          text: 'Pembayaran kontribusi sidang MD dapat dilakukan melalui No. Virtual Account (VA) Bank resmi sekretariat.',
          isBold: false,
        },
      ],
      paragrafPenutup:
        'Demikianlah hal yang dapat kami sampaikan, atas perhatian dan kerjasamanya untuk mensukseskan agenda ini kami ucapkan terima kasih. Tuhan Yesus Memberkati.',
      salamPenutup:
        'Dalam KasihNya,\nBadan Pekerja Daerah DKI Jakarta\nGereja Bethel Indonesia',
      namaInstansiTtd: 'BPD DKI Jakarta GBI',
      formatTtd: 'DUA_PEJABAT',
      signatories: [
        {
          roleKey: 'ketua',
          jabatan: 'Ketua BPD',
          nama: 'Pdt. Kiky Tjahjadi, M.Th.',
          gelar: 'M.Th.',
          nomorInduk: 'NIP-001/GBI-DKI',
          ttdUrl: null,
        },
        {
          roleKey: 'sekretaris',
          jabatan: 'Sekretaris',
          nama: 'Pdt. Maringan Tampubolon, S.Th.',
          gelar: 'S.Th.',
          nomorInduk: 'NIP-002/GBI-DKI',
          ttdUrl: null,
        },
      ],
      tampilkanStempel: true,
      posisiStempel: 'CENTER_OVERLAP',
    },
  },
  {
    id: 'SURAT_KETERANGAN_JEMAAT',
    title: 'Surat Keterangan Anggota Jemaat',
    kategori: 'KETERANGAN',
    badge: 'Administrasi Jemaat',
    description:
      'Surat keterangan resmi keanggotaan jemaat aktif gereja untuk keperluan administrasi, pendidikan, atau kepindahan tempat tinggal.',
    values: {
      modeLogo: 'SATU_LOGO',
      perihal: 'SURAT KETERANGAN ANGGOTA JEMAAT',
      lampiran: '-',
      kategori: 'KETERANGAN',
      subJudul: 'SURAT KETERANGAN KEANGGOTAAN GEREJA',
      tujuanKepada: 'Kepada Yth,\nPengurus / Pimpinan Instansi Terkait',
      tujuanDi: 'Di Tempat',
      salamPembuka: 'Salam sejahtera dalam kasih Tuhan Yesus Kristus,',
      paragrafPembuka:
        'Gembala Jemaat dan Majelis Gereja dengan ini menerangkan dengan sebenarnya bahwa:',
      poinIsi: [
        {
          id: '1',
          text: 'Nama Lengkap: Yohanes Pratama Putra, S.Th. (Nomor Induk Jemaat: NIJ-2024-0142).',
          isBold: true,
        },
        {
          id: '2',
          text: 'Tempat / Tanggal Lahir: Padang, 14 Maret 1990 | Jenis Kelamin: Laki-laki.',
          isBold: false,
        },
        {
          id: '3',
          text: 'Alamat Domisili: Jl. Jenderal Sudirman No. 45 RT.03/RW.02, Padang Barat, Kota Padang.',
          isBold: false,
        },
        {
          id: '4',
          text: 'Adalah benar anggota jemaat yang beribadah aktif dan berkelakuan baik di gereja kami.',
          isBold: false,
        },
      ],
      paragrafPenutup:
        'Demikian surat keterangan ini kami buat dengan sebenarnya dalam keadaan sadar dan tanpa paksaan dari pihak manapun untuk dapat dipergunakan sebagaimana mestinya.',
      salamPenutup: 'Dalam Kasih dan Pelayanan-Nya,',
      formatTtd: 'SATU_PEJABAT',
      signatories: [
        {
          roleKey: 'gembala',
          jabatan: 'Gembala Jemaat / Senior Pastor',
          nama: 'Pdt. Johanes Pratama, M.Th.',
          gelar: 'M.Th.',
          nomorInduk: 'NIP-2024-001',
          ttdUrl: null,
        },
      ],
      tampilkanStempel: true,
      posisiStempel: 'CENTER_OVERLAP',
    },
  },
  {
    id: 'SURAT_TUGAS_PELAYANAN',
    title: 'Surat Tugas Pelayanan & Misi',
    kategori: 'TUGAS',
    badge: 'Penugasan Pelayanan',
    description:
      'Surat mandat dan tugas resmi dari Gembala/Majelis untuk tim hamba Tuhan yang diutus melayani kegiatan KKR, misi, atau pembicara tamu.',
    values: {
      modeLogo: 'SATU_LOGO',
      perihal: 'SURAT TUGAS PELAYANAN MISI & IBADAH',
      lampiran: '1 (satu) Berkas Jadwal',
      kategori: 'TUGAS',
      subJudul: 'SURAT TUGAS PELAYANAN',
      tujuanKepada: 'Kepada Yang Bertugas:\nTim Pelayanan Misi Gereja',
      tujuanDi: 'Di Tempat',
      salamPembuka: 'Salam dalam kasih Tuhan kita Yesus Kristus,',
      paragrafPembuka:
        'Sesuai dengan visi amanat agung dan program kerja departemen misi gereja tahun berjalan, dengan ini Majelis Jemaat Gereja memberikan tugas resmi kepada:',
      poinIsi: [
        {
          id: '1',
          text: 'Pdt. Andreas Sutanto (Ketua Tim Pelayanan Misi / Pembicara Firman Tuhan).',
          isBold: true,
        },
        {
          id: '2',
          text: 'Tim Musik & Pujian Penyembahan (Pemusik dan Singers Pelayanan Ibadah).',
          isBold: false,
        },
        {
          id: '3',
          text: 'Tugas: Melaksanakan pelayanan Ibadah Kebangunan Rohani dan Pembinaan Jemaat Cabang.',
          isBold: false,
        },
      ],
      paragrafPenutup:
        'Demikian surat tugas ini diberikan kepada yang bersangkutan agar dilaksanakan dengan penuh tanggung jawab, kesungguhan hati, dan berbuah bagi kemuliaan Nama Tuhan.',
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
    },
  },
  {
    id: 'SURAT_REKOMENDASI_STUDI',
    title: 'Surat Rekomendasi Pendidikan / Pelayanan',
    kategori: 'REKOMENDASI',
    badge: 'Rekomendasi Resmi',
    description:
      'Surat rekomendasi pastoral untuk jemaat/pengerja yang mengajukan beasiswa, studi teologi (STT), atau penahbisan jabatan pelayanan.',
    values: {
      modeLogo: 'SATU_LOGO',
      perihal: 'SURAT REKOMENDASI STUDI TEOLOGI',
      lampiran: '-',
      kategori: 'REKOMENDASI',
      subJudul: 'SURAT REKOMENDASI PASTORAL',
      tujuanKepada:
        'Kepada Yth,\nKetua / Pimpinan Sekolah Tinggi Teologi (STT)\nPanitia Penerimaan Mahasiswa Baru',
      tujuanDi: 'Di Tempat',
      salamPembuka: 'Salam sejahtera dalam kasih Kristus Yesus,',
      paragrafPembuka:
        'Sehubungan dengan rencana pendaftaran studi teologi bagi salah satu pengerja/anggota jemaat kami, bersama surat ini kami memberikan rekomendasi positif bagi:',
      poinIsi: [
        {
          id: '1',
          text: 'Nama: Samuel Wijaya | NIJ: NIJ-2024-0031 | Jabatan Pelayanan: Leader Pemuda & Usher.',
          isBold: true,
        },
        {
          id: '2',
          text: 'Yang bersangkutan memiliki komitmen rohani yang teguh, integritas moral yang baik, dan dedikasi pelayanan yang nyata di tengah jemaat.',
          isBold: false,
        },
      ],
      paragrafPenutup:
        'Berdasarkan pengamatan pastoral kami, yang bersangkutan layak untuk mengikuti proses pendidikan teologi lanjutan. Terima kasih atas perhatian dan kerja sama yang terjalin.',
      formatTtd: 'SATU_PEJABAT',
      signatories: [
        {
          roleKey: 'gembala',
          jabatan: 'Gembala Jemaat / Senior Pastor',
          nama: 'Pdt. Johanes Pratama, M.Th.',
          gelar: 'M.Th.',
          nomorInduk: 'NIP-2024-001',
          ttdUrl: null,
        },
      ],
    },
  },
  {
    id: 'SURAT_KETERANGAN_BAPTIS',
    title: 'Surat Keterangan Baptis Selam',
    kategori: 'BAPTIS',
    badge: 'Sakramen Gereja',
    description:
      'Surat keterangan resmi pelaksanaan sakramen baptisan air selam kudus bagi jemaat yang telah dibaptis.',
    values: {
      modeLogo: 'SATU_LOGO',
      perihal: 'SURAT KETERANGAN BAPTISAN AIR',
      lampiran: '-',
      kategori: 'BAPTIS',
      subJudul: 'SURAT KETERANGAN BAPTIS SELAM',
      tujuanKepada: 'Kepada Yth,\nYang Bersangkutan & Keluarga',
      tujuanDi: 'Di Tempat',
      salamPembuka: 'Salam dalam kasih Tuhan kita Yesus Kristus,',
      paragrafPembuka:
        'Gembala Jemaat dan Majelis Gereja dengan ini menerangkan bahwa:',
      poinIsi: [
        {
          id: '1',
          text: 'Nama Lengkap: Ruth Deborah Pratama | Tanggal Lahir: Padang, 20 Mei 2002.',
          isBold: true,
        },
        {
          id: '2',
          text: 'Telah menerima Sakramen Baptisan Air Selam Kudus dalam Nama Allah Bapa, Anak, dan Roh Kudus pada hari Minggu, 15 Juni 2024.',
          isBold: false,
        },
        {
          id: '3',
          text: 'Dibaptiskan oleh: Pdt. Johanes Pratama, M.Th. (Gembala Jemaat).',
          isBold: false,
        },
      ],
      paragrafPenutup:
        'Demikian surat keterangan baptis ini diterbitkan sebagai bukti sah penerimaan sakramen baptisan kudus di hadapan Tuhan dan jemaat.',
      formatTtd: 'SATU_PEJABAT',
      signatories: [
        {
          roleKey: 'gembala',
          jabatan: 'Gembala Jemaat',
          nama: 'Pdt. Johanes Pratama, M.Th.',
          gelar: 'M.Th.',
          nomorInduk: 'NIP-2024-001',
          ttdUrl: null,
        },
      ],
      tampilkanStempel: true,
      posisiStempel: 'CENTER_OVERLAP',
    },
  },
  {
    id: 'SURAT_KETERANGAN_NIKAH',
    title: 'Surat Keterangan Pemberkatan Pernikahan',
    kategori: 'PERNIKAHAN',
    badge: 'Pernikahan Kudus',
    description:
      'Surat keterangan peneguhan dan pemberkatan pernikahan kudus pasangan suami-istri jemaat gereja.',
    values: {
      modeLogo: 'SATU_LOGO',
      perihal: 'SURAT KETERANGAN PEMBERKATAN NIKAH',
      lampiran: '-',
      kategori: 'PERNIKAHAN',
      subJudul: 'PEMBERKATAN PERNIKAHAN KUDUS',
      tujuanKepada: 'Kepada Yth,\nKantor Catatan Sipil / Instansi Terkait',
      tujuanDi: 'Di Tempat',
      salamPembuka: 'Salam sejahtera dalam kasih Kristus,',
      paragrafPembuka:
        'Dengan penuh rasa syukur kepada Tuhan Yang Maha Esa, Majelis Gereja menerangkan bahwa telah diteguhkan dalam Pernikahan Kudus:',
      poinIsi: [
        {
          id: '1',
          text: 'Mempelai Pria: Daniel Setiawan, S.Kom. (Putra dari Bpk. Hendra & Ibu Maria).',
          isBold: true,
        },
        {
          id: '2',
          text: 'Mempelai Wanita: Sarah Natalia, S.E. (Putri dari Bpk. Surya & Ibu Elizabeth).',
          isBold: true,
        },
        {
          id: '3',
          text: 'Hari / Tanggal Ibadah Peneguhan: Sabtu, 10 Agustus 2024 bertempat di Gedung Gereja.',
          isBold: false,
        },
      ],
      paragrafPenutup:
        'Demikian surat keterangan ini kami terbitkan untuk dapat dipergunakan dalam proses pencatatan sipil perkawinan resmi.',
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
          jabatan: 'Sekretaris Majelis',
          nama: 'Pdp. Daniel Setiawan, S.Kom.',
          gelar: 'S.Kom.',
          nomorInduk: 'NIP-2024-002',
          ttdUrl: null,
        },
      ],
      tampilkanStempel: true,
      posisiStempel: 'CENTER_OVERLAP',
    },
  },
]
