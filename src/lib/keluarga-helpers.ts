import { prisma } from './prisma'

/**
 * Atomic Nomor Keluarga Generator (PostgreSQL Transaction Safe)
 * Format: KK-{YYYY}-{4_DIGIT_SEQ} (e.g. KK-2026-0001)
 */
export async function getNextAtomicNomorKeluarga(tx?: any): Promise<string> {
  const db = tx || prisma
  const currentYear = new Date().getFullYear()

  const seq = await db.$queryRaw<{ currentVal: number }[]>`
    INSERT INTO "SystemSequence" (name, "currentVal", "updatedAt")
    VALUES ('KELUARGA_SEQUENCE', 1, NOW())
    ON CONFLICT (name)
    DO UPDATE SET "currentVal" = "SystemSequence"."currentVal" + 1, "updatedAt" = NOW()
    RETURNING "currentVal";
  `

  const num = seq[0]?.currentVal || 1
  const padded = String(num).padStart(4, '0')
  return `KK-${currentYear}-${padded}`
}

/**
 * Synchronize totalAnggota count for a Keluarga
 */
export async function syncKeluargaTotalAnggota(keluargaId: string, tx?: any): Promise<number> {
  const db = tx || prisma
  const count = await db.anggotaKeluarga.count({
    where: { keluargaId },
  })

  await db.keluarga.update({
    where: { id: keluargaId },
    data: { totalAnggota: count },
  })

  return count
}
