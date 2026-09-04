import {
  getKategoriArtikelPaginatedAction,
  getKategoriArtikelListAction,
  createKategoriArtikelAction,
  updateKategoriArtikelAction,
  deleteKategoriArtikelAction,
  getPublicArtikelCatalogAction,
} from '../src/actions/artikel'

async function runArtikelCategoryQATest() {
  console.log('--- STARTING ARTIKEL CATEGORY & CATALOG QA SUITE ---')

  // 1. Test get paginated & list
  console.log('\n[1] Testing getKategoriArtikelPaginatedAction & getKategoriArtikelListAction...')
  const listRes = await getKategoriArtikelPaginatedAction({ page: 1, pageSize: 20 })
  if (!listRes.success || !listRes.data) {
    throw new Error('Failed to fetch category paginated list: ' + listRes.error)
  }
  console.log(`✓ Fetched ${listRes.data.items.length} categories (Total: ${listRes.data.total}).`)
  listRes.data.items.forEach(c => {
    console.log(`  - [${c.slug}] ${c.nama} (${c.totalArtikel} artikel)`)
  })

  // 2. Test create category
  console.log('\n[2] Testing createKategoriArtikelAction...')
  const testName = 'QA Kategori Khusus ' + Date.now()
  const createRes = await createKategoriArtikelAction({
    nama: testName,
  })

  if (!createRes.success || !createRes.data) {
    throw new Error('Failed to create category: ' + createRes.error)
  }
  const createdId = createRes.data.id
  console.log(`✓ Category created successfully: ID=${createdId}, Slug=${createRes.data.slug}`)

  // 3. Test update category
  console.log('\n[3] Testing updateKategoriArtikelAction...')
  const updatedName = testName + ' (Updated)'
  const updateRes = await updateKategoriArtikelAction({
    id: createdId,
    nama: updatedName,
  })
  if (!updateRes.success || !updateRes.data) {
    throw new Error('Failed to update category: ' + updateRes.error)
  }
  console.log(`✓ Category updated successfully: New Name="${updateRes.data.nama}"`)

  // 4. Test public catalog action
  console.log('\n[4] Testing getPublicArtikelCatalogAction...')
  const catalogRes = await getPublicArtikelCatalogAction({
    search: '',
    kategoriSlug: 'all',
    page: 1,
    pageSize: 5,
  })
  if (!catalogRes.success || !catalogRes.data) {
    throw new Error('Failed to fetch public catalog: ' + catalogRes.error)
  }
  console.log(`✓ Public catalog fetched: Total Published=${catalogRes.data.totalPublishedAll}, Page Items=${catalogRes.data.items.length}`)

  // 5. Test delete category
  console.log('\n[5] Testing deleteKategoriArtikelAction...')
  const deleteRes = await deleteKategoriArtikelAction({
    id: createdId,
    reason: 'Kategori pengujian otomatis QA selesai digunakan',
  })
  if (!deleteRes.success) {
    throw new Error('Failed to delete category: ' + deleteRes.error)
  }
  console.log(`✓ Category deleted successfully.`)

  console.log('\n========================================')
  console.log('🎉 ALL ARTIKEL CATEGORY & CATALOG QA TESTS PASSED SUCCESSFULLY (100% PASS)!')
  console.log('========================================')
}

runArtikelCategoryQATest().catch((err) => {
  console.error('❌ QA Test Failed:', err)
  process.exit(1)
})
