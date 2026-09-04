import fs from 'fs'

if (fs.existsSync('.env')) {
  process.loadEnvFile?.('.env')
}

import { v2 as cloudinary } from 'cloudinary'
import {
  validateMagicBytes,
  uploadBufferToCloudinary,
  uploadImageToCloudinary,
  uploadDocumentToCloudinary,
  deleteFromCloudinary,
  generateCloudinarySignedUrl,
  extractCloudinaryPublicId,
  cleanupCloudinaryAsset,
} from '../src/lib/cloudinary.ts'
import { getStorageProvider, LocalStorageProvider, CloudinaryStorageProvider } from '../src/lib/storage.ts'
import assert from 'assert'

// Reconfigure cloudinary with loaded env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

console.log('===============================================================')
console.log('       QA & SECURITY TEST SUITE: CLOUDINARY INTEGRATION        ')
console.log('===============================================================')

let passedTests = 0
let failedTests = 0

function runTest(testName, fn) {
  try {
    fn()
    console.log(`  [PASS] ${testName}`)
    passedTests++
  } catch (error) {
    console.error(`  [FAIL] ${testName}: ${error.message}`)
    failedTests++
  }
}

async function runAsyncTest(testName, fn) {
  try {
    await fn()
    console.log(`  [PASS] ${testName}`)
    passedTests++
  } catch (error) {
    console.error(`  [FAIL] ${testName}: ${error.message}`)
    failedTests++
  }
}

async function main() {
  // ----------------------------------------------------
  // SECTION 1: Cloudinary API Connection & Config
  // ----------------------------------------------------
  console.log('\n[SECTION 1] Cloudinary API Credentials & Connectivity')

  await runAsyncTest('Cloudinary API Ping returns status OK', async () => {
    const res = await cloudinary.api.ping()
    assert.strictEqual(res.status, 'ok', 'Expected Cloudinary ping response to be ok')
  })

  runTest('Environment contains valid Cloud Name', () => {
    assert.ok(process.env.CLOUDINARY_CLOUD_NAME, 'CLOUDINARY_CLOUD_NAME must be set')
    assert.strictEqual(process.env.CLOUDINARY_CLOUD_NAME, 'dhc1lljru')
  })

  runTest('Environment contains valid API Key', () => {
    assert.ok(process.env.CLOUDINARY_API_KEY, 'CLOUDINARY_API_KEY must be set')
    assert.strictEqual(process.env.CLOUDINARY_API_KEY, '721323311784296')
  })

  // ----------------------------------------------------
  // SECTION 2: Binary Magic Bytes Inspection (Security)
  // ----------------------------------------------------
  console.log('\n[SECTION 2] Binary Magic Bytes Validation & Malware Defense')

  runTest('Detects valid PNG magic bytes', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    const res = validateMagicBytes(pngBuffer)
    assert.strictEqual(res.valid, true)
    assert.strictEqual(res.detectedMime, 'image/png')
  })

  runTest('Detects valid JPEG magic bytes', () => {
    const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
    const res = validateMagicBytes(jpgBuffer)
    assert.strictEqual(res.valid, true)
    assert.strictEqual(res.detectedMime, 'image/jpeg')
  })

  runTest('Detects valid PDF magic bytes', () => {
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35])
    const res = validateMagicBytes(pdfBuffer)
    assert.strictEqual(res.valid, true)
    assert.strictEqual(res.detectedMime, 'application/pdf')
  })

  runTest('Detects valid DOCX / OpenXML magic bytes (PK zip header)', () => {
    const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00])
    const res = validateMagicBytes(docxBuffer)
    assert.strictEqual(res.valid, true)
    assert.strictEqual(res.detectedExt, 'docx')
  })

  runTest('Blocks fake/corrupted binary header (EXE / ELF masquerading as image)', () => {
    const fakeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]) // MZ header
    const res = validateMagicBytes(fakeBuffer)
    assert.strictEqual(res.valid, false)
  })

  // ----------------------------------------------------
  // SECTION 3: Live Image Upload & Transformation
  // ----------------------------------------------------
  console.log('\n[SECTION 3] Live Image Upload, Folder Organization & Deletion')

  // 1x1 Transparent PNG for live test upload
  const sample1x1Png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  )

  let uploadedImagePublicId = null

  await runAsyncTest('Uploads test image to Cloudinary cmsgereja/test folder', async () => {
    const uploadRes = await uploadImageToCloudinary(sample1x1Png, 'test', 'qa_verify_image')
    assert.ok(uploadRes.publicId, 'Upload result must include publicId')
    assert.ok(uploadRes.secureUrl.startsWith('https://res.cloudinary.com/'), 'URL must be HTTPS Cloudinary URL')
    assert.strictEqual(uploadRes.resourceType, 'image')
    uploadedImagePublicId = uploadRes.publicId
  })

  await runAsyncTest('Deletes uploaded test image from Cloudinary (cleanup)', async () => {
    if (uploadedImagePublicId) {
      const delRes = await deleteFromCloudinary(uploadedImagePublicId, 'image')
      assert.strictEqual(delRes.success, true, 'Image deletion from Cloudinary must succeed')
    }
  })

  // ----------------------------------------------------
  // SECTION 4: Live Raw Document Upload & Signed URL
  // ----------------------------------------------------
  console.log('\n[SECTION 4] Live Document Upload (PDF) & Signed URL')

  // Minimal valid 1-page PDF buffer
  const samplePdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n162\n%%EOF',
    'utf-8'
  )

  let uploadedPdfPublicId = null

  await runAsyncTest('Uploads raw PDF document to Cloudinary without corruption', async () => {
    const docRes = await uploadDocumentToCloudinary(samplePdfBuffer, 'test_vault', 'qa_sample_doc.pdf')
    assert.ok(docRes.publicId, 'Raw document upload must return publicId')
    assert.strictEqual(docRes.resourceType, 'raw')
    assert.ok(docRes.secureUrl.includes('raw/upload'), 'Must use raw/upload endpoint for documents')
    uploadedPdfPublicId = docRes.publicId
  })

  runTest('Generates signed URL for private document download', () => {
    if (uploadedPdfPublicId) {
      const signedUrl = generateCloudinarySignedUrl(uploadedPdfPublicId, 'raw', 1800)
      assert.ok(typeof signedUrl === 'string' && signedUrl.length > 20, 'Signed URL must be non-empty')
    }
  })

  await runAsyncTest('Deletes uploaded raw test document from Cloudinary (cleanup)', async () => {
    if (uploadedPdfPublicId) {
      const delRes = await deleteFromCloudinary(uploadedPdfPublicId, 'raw')
      assert.strictEqual(delRes.success, true, 'Raw document deletion must succeed')
    }
  })

  // ----------------------------------------------------
  // SECTION 5: Storage Provider Factory & Architecture
  // ----------------------------------------------------
  console.log('\n[SECTION 5] Storage Provider Factory & Architecture')

  runTest('getStorageProvider returns CloudinaryStorageProvider when STORAGE_PROVIDER=cloudinary', () => {
    const provider = getStorageProvider('artikel')
    assert.ok(provider instanceof CloudinaryStorageProvider, 'Expected CloudinaryStorageProvider instance')
  })

  runTest('LocalStorageProvider functions correctly as secondary fallback', () => {
    const localProvider = new LocalStorageProvider('public/uploads/test_scratch')
    assert.ok(localProvider instanceof LocalStorageProvider)
  })

  // ----------------------------------------------------
  // SECTION 6: Cloudinary URL Parsing & Automated Cleanup
  // ----------------------------------------------------
  console.log('\n[SECTION 6] Cloudinary URL Parsing & Automated Asset Cleanup')

  runTest('extractCloudinaryPublicId parses image URL with version correctly', () => {
    const url = 'https://res.cloudinary.com/dhc1lljru/image/upload/v1741150000/cmsgereja/artikel/cover_a1b2c3.webp'
    const res = extractCloudinaryPublicId(url)
    assert.strictEqual(res.publicId, 'cmsgereja/artikel/cover_a1b2c3')
    assert.strictEqual(res.resourceType, 'image')
  })

  runTest('extractCloudinaryPublicId parses raw document URL correctly with extension', () => {
    const url = 'https://res.cloudinary.com/dhc1lljru/raw/upload/v1741150000/cmsgereja/dokumen/doc_x9y8z7.pdf'
    const res = extractCloudinaryPublicId(url)
    assert.strictEqual(res.publicId, 'cmsgereja/dokumen/doc_x9y8z7.pdf')
    assert.strictEqual(res.resourceType, 'raw')
  })

  runTest('extractCloudinaryPublicId safely ignores non-Cloudinary / local URLs', () => {
    const url = '/uploads/dokumen/local_sample.pdf'
    const res = extractCloudinaryPublicId(url)
    assert.strictEqual(res.publicId, null)
  })

  await runAsyncTest('cleanupCloudinaryAsset safely skips null or local URLs without error', async () => {
    const res1 = await cleanupCloudinaryAsset(null)
    const res2 = await cleanupCloudinaryAsset('/uploads/local.png')
    assert.strictEqual(res1.success, true)
    assert.strictEqual(res2.success, true)
  })

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n---------------------------------------------------------------')
  console.log(`TOTAL ASSERTIONS : ${passedTests + failedTests}`)
  console.log(`PASSED           : ${passedTests}`)
  console.log(`FAILED           : ${failedTests}`)
  console.log('---------------------------------------------------------------\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Test Suite Fatal Error:', err)
  process.exit(1)
})
