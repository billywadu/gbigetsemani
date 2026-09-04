export * from '@/lib/validations/artikel'

// Legacy backward-compatibility aliases
export {
  createArtikelSchema as createMateriSchema,
  updateArtikelSchema as updateMateriSchema,
  deleteArtikelSchema as deleteMateriSchema,
  restoreArtikelSchema as restoreMateriSchema,
  hardDeleteArtikelSchema as hardDeleteMateriSchema,
  artikelFilterSchema as materiFilterSchema,
  createKategoriArtikelSchema as createKategoriMateriSchema,
  updateKategoriArtikelSchema as updateKategoriMateriSchema,
  deleteKategoriArtikelSchema as deleteKategoriMateriSchema,
  kategoriArtikelFilterSchema as kategoriMateriFilterSchema,
  publicArtikelFilterSchema as publicRenunganFilterSchema,
  statusArtikelEnum as statusMateriEnum,
} from '@/lib/validations/artikel'

export type {
  CreateArtikelInput as CreateMateriInput,
  UpdateArtikelInput as UpdateMateriInput,
  DeleteArtikelInput as DeleteMateriInput,
  RestoreArtikelInput as RestoreMateriInput,
  HardDeleteArtikelInput as HardDeleteMateriInput,
  ArtikelFilterParams as MateriFilterParams,
  CreateKategoriArtikelInput as CreateKategoriMateriInput,
  UpdateKategoriArtikelInput as UpdateKategoriMateriInput,
  DeleteKategoriArtikelInput as DeleteKategoriMateriInput,
  KategoriArtikelFilterParams as KategoriMateriFilterParams,
  PublicArtikelFilterParams as PublicRenunganFilterParams,
  StatusArtikel as StatusMateri,
} from '@/lib/validations/artikel'
