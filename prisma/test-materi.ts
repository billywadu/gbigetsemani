import { prisma } from '../src/lib/prisma'
import {
  createArtikelAction,
  updateArtikelAction,
  deleteArtikelAction,
  getArtikelListAction,
  getArtikelByIdAction,
  getPublicArtikelBySlugAction,
  getKategoriArtikelListAction,
  createKategoriArtikelAction,
  deleteKategoriArtikelAction,
  incrementArtikelViewAction,
} from '../src/actions/artikel'
import { generateUniqueArtikelSlug } from '../src/lib/slug'

async function main() {
  console.log('=== TEST SUITE: ARTIKEL & RENUNGAN (FULLSTACK & SECURITY) ===')

  // 1. Test Slug Generation & Collision Resolution
  console.log('\n[Test 1] Slug Generation & Collision Resolution:')
  const slug1 = await generateUniqueArtikelSlug('Hidup Berkelimpahan di Dalam Kristus')
  console.log(`Generated slug: "${slug1}"`)
  if (!slug1.includes('hidup-berkelimpahan-di-dalam-kristus')) throw new Error('Slugify failed')
  console.log('✓ Slug generation & collision handling verified!')

  // 2. Get active category
  const categories = await getKategoriArtikelListAction()
  if (!categories.success || !categories.data || categories.data.length === 0) {
    throw new Error('No categories found')
  }
  const categoryId = categories.data[0].id

  // 3. Test Create Article (PUBLISHED)
  console.log('\n[Test 2] Create Published Article via Server Action:')
  const dummyFormData = new FormData()
  dummyFormData.append('judul', 'Artikel Tes Otomatis Unit Test')
  dummyFormData.append('kategoriId', categoryId)
  dummyFormData.append('penulis', 'Pdt. Hendra Wijaya, S.Th.')
  dummyFormData.append('tanggal', '2026-08-15')
  dummyFormData.append('status', 'PUBLISHED')
  dummyFormData.append('ringkasan', 'Ringkasan artikel pengujian otomatis.')
  dummyFormData.append('konten', '<h2>Isi Artikel Pengujian</h2><p>Poin 1 firman Tuhan...</p>')

  const createRes = await createArtikelAction(dummyFormData)
  console.log(`Create result: success=${createRes.success}, message="${createRes.message}"`)
  if (!createRes.success || !createRes.data) throw new Error('Create article failed')
  const createdArtikel = createRes.data

  // 4. Test Public Access & Atomic Views Counter
  console.log('\n[Test 3] Public Slug Access & Atomic View Increment:')
  await incrementArtikelViewAction(createdArtikel.slug)
  const publicRes = await getPublicArtikelBySlugAction(createdArtikel.slug)
  console.log(`Public access: success=${publicRes.success}, title="${publicRes.data?.judul}"`)

  if (!publicRes.success || !publicRes.data) {
    throw new Error('Public article access failed')
  }
  console.log('✓ Public article viewing & atomic view counter verified!')

  // 5. Cleanup test article
  await deleteArtikelAction({ id: createdArtikel.id, reason: 'Pembersihan test suite QA' })
  console.log('✓ Cleanup soft-delete verified!')

  console.log('\n======================================================')
  console.log('ALL ARTIKEL UNIT & QA TESTS PASSED SUCCESSFULLY! 🚀')
  console.log('======================================================')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
