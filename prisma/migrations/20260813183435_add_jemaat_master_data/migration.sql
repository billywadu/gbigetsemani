-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAK_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "StatusJemaat" AS ENUM ('ACTIVE', 'INACTIVE', 'MOVED', 'DECEASED', 'SUSPENDED', 'TAMU');

-- CreateEnum
CREATE TYPE "StatusBaptis" AS ENUM ('SUDAH_BAPTIS', 'BELUM_BAPTIS');

-- CreateEnum
CREATE TYPE "StatusFollowUp" AS ENUM ('NEW', 'IN_PROGRESS', 'NEED_VISITATION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StatusPernikahan" AS ENUM ('BELUM_MENIKAH', 'MENIKAH', 'DUDA', 'JANDA', 'BERCERAI');

-- CreateEnum
CREATE TYPE "Pendidikan" AS ENUM ('SD', 'SMP', 'SMA', 'D3', 'S1', 'S2', 'S3');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'GEMBALA', 'SEKRETARIS', 'BENDAHARA', 'USHER', 'PUBLIC');

-- CreateTable
CREATE TABLE "SystemSequence" (
    "name" TEXT NOT NULL,
    "currentVal" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSequence_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SEKRETARIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jemaat" (
    "id" TEXT NOT NULL,
    "nij" TEXT NOT NULL,
    "barcodeCode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "namaPanggilan" TEXT,
    "jenisKelamin" "JenisKelamin" NOT NULL,
    "tempatLahir" TEXT,
    "tanggalLahir" TIMESTAMP(3),
    "noHp" TEXT,
    "whatsApp" TEXT,
    "email" TEXT,
    "alamat" TEXT,
    "kota" TEXT NOT NULL DEFAULT 'Padang',
    "provinsi" TEXT NOT NULL DEFAULT 'Sumatera Barat',
    "kodePos" TEXT,
    "statusJemaat" "StatusJemaat" NOT NULL DEFAULT 'ACTIVE',
    "tanggalBergabung" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "statusBaptis" "StatusBaptis" NOT NULL DEFAULT 'BELUM_BAPTIS',
    "tanggalBaptis" TIMESTAMP(3),
    "statusFollowUp" "StatusFollowUp" NOT NULL DEFAULT 'NEW',
    "statusPernikahan" "StatusPernikahan" NOT NULL DEFAULT 'BELUM_MENIKAH',
    "tanggalMenikah" TIMESTAMP(3),
    "pekerjaan" TEXT,
    "pendidikan" "Pendidikan",
    "kontakDarurat" TEXT,
    "catatan" TEXT,
    "completenessPercentage" INTEGER NOT NULL DEFAULT 0,
    "keluargaId" TEXT,
    "kategorialId" TEXT,
    "komselId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jemaat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keluarga" (
    "id" TEXT NOT NULL,
    "nomorKeluarga" TEXT NOT NULL,
    "namaKeluarga" TEXT NOT NULL,
    "alamatKeluarga" TEXT,
    "kepalaKeluargaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keluarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kategorial" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kategorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Komsel" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "wilayah" TEXT NOT NULL,
    "koordinatorNama" TEXT,
    "hari" TEXT,
    "jam" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Komsel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DokumenJemaat" (
    "id" TEXT NOT NULL,
    "jemaatId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "jenisDokumen" TEXT NOT NULL,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "fileSize" TEXT,
    "tanggalTerbit" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DokumenJemaat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presensi" (
    "id" TEXT NOT NULL,
    "jemaatId" TEXT NOT NULL,
    "eventId" TEXT,
    "scanTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'HADIR',

    CONSTRAINT "Presensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT NOT NULL DEFAULT '127.0.0.1',
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "stateChange" TEXT,
    "previousHash" TEXT,
    "currentHash" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Jemaat_nij_key" ON "Jemaat"("nij");

-- CreateIndex
CREATE UNIQUE INDEX "Jemaat_barcodeCode_key" ON "Jemaat"("barcodeCode");

-- CreateIndex
CREATE INDEX "Jemaat_nij_idx" ON "Jemaat"("nij");

-- CreateIndex
CREATE INDEX "Jemaat_barcodeCode_idx" ON "Jemaat"("barcodeCode");

-- CreateIndex
CREATE INDEX "Jemaat_nama_idx" ON "Jemaat"("nama");

-- CreateIndex
CREATE INDEX "Jemaat_noHp_idx" ON "Jemaat"("noHp");

-- CreateIndex
CREATE INDEX "Jemaat_statusJemaat_idx" ON "Jemaat"("statusJemaat");

-- CreateIndex
CREATE INDEX "Jemaat_jenisKelamin_idx" ON "Jemaat"("jenisKelamin");

-- CreateIndex
CREATE INDEX "Jemaat_kategorialId_idx" ON "Jemaat"("kategorialId");

-- CreateIndex
CREATE INDEX "Jemaat_komselId_idx" ON "Jemaat"("komselId");

-- CreateIndex
CREATE INDEX "Jemaat_deletedAt_idx" ON "Jemaat"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Keluarga_nomorKeluarga_key" ON "Keluarga"("nomorKeluarga");

-- CreateIndex
CREATE UNIQUE INDEX "Kategorial_nama_key" ON "Kategorial"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Komsel_nama_key" ON "Komsel"("nama");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "Jemaat" ADD CONSTRAINT "Jemaat_keluargaId_fkey" FOREIGN KEY ("keluargaId") REFERENCES "Keluarga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jemaat" ADD CONSTRAINT "Jemaat_kategorialId_fkey" FOREIGN KEY ("kategorialId") REFERENCES "Kategorial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jemaat" ADD CONSTRAINT "Jemaat_komselId_fkey" FOREIGN KEY ("komselId") REFERENCES "Komsel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumenJemaat" ADD CONSTRAINT "DokumenJemaat_jemaatId_fkey" FOREIGN KEY ("jemaatId") REFERENCES "Jemaat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presensi" ADD CONSTRAINT "Presensi_jemaatId_fkey" FOREIGN KEY ("jemaatId") REFERENCES "Jemaat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
