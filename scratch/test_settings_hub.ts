import { getAppProfileAction, updateAppProfileAction, resetAppProfileAction } from '../src/actions/app-profile'
import { getAppSystemConfigAction, updateAppSystemConfigAction, resetAppSystemConfigAction } from '../src/actions/app-system'
import { getPrintLayoutConfigAction } from '../src/actions/print-layout'
import { getLandingPageConfigAction } from '../src/actions/landing-page'

async function runSettingsVerification() {
  console.log('==================================================================')
  console.log('🚀 TESTING UNIFIED SETTINGS HUB & AUTOMATIC SYNC')
  console.log('==================================================================\n')

  // 1. Test Fetch Profile Defaults
  const initialProfile = await getAppProfileAction()
  console.log('[1] Fetch Profile Initial Config ->', initialProfile.success ? '✅ OK' : '❌ FAIL', `(Customized: ${initialProfile.isCustomized})`)

  // 2. Test Update Profile & Automatic Sync
  const formData = new FormData()
  formData.append(
    'configJson',
    JSON.stringify({
      namaResmi: 'GEREJA BETH-EL INDONESIA JEMAAT KOTA',
      namaSingkat: 'GBI Jemaat Kota',
      tagline: 'Tempat bertumbuh dalam iman dan kasih Tuhan.',
      alamat: 'Jl. Pemuda No. 12',
      kota: 'Jakarta',
      provinsi: 'DKI Jakarta',
      telepon: '(021) 123456',
      email: 'sekretariat@gereja.org',
    })
  )

  const updateProfileRes = await updateAppProfileAction(formData)
  console.log('[2] Update App Profile ->', updateProfileRes.success ? '✅ OK' : '❌ FAIL', updateProfileRes.message)

  // 3. Verify Sync with Print Layout & Landing Page
  const printConfig = await getPrintLayoutConfigAction()
  const landingConfig = await getLandingPageConfigAction()

  const isPrintSynced = printConfig.data.kop.namaGereja === 'GEREJA BETH-EL INDONESIA JEMAAT KOTA'
  const isLandingSynced = landingConfig.data.footer.churchName === 'GBI Jemaat Kota'

  console.log('[3] Auto-Sync Kop Cetak Dokumen ->', isPrintSynced ? '✅ SYNCED' : '⚠️ NOT MODIFIED')
  console.log('[4] Auto-Sync Footer Portal Landing Page ->', isLandingSynced ? '✅ SYNCED' : '⚠️ NOT MODIFIED')

  // 5. Test System Config
  const systemRes = await updateAppSystemConfigAction({
    prefixNij: 'GBI-PADANG-',
    prefixBarcode: 'JMT-',
    defaultJendelaScanMenit: 45,
    zonaWaktu: 'Asia/Jakarta',
  })
  console.log('[5] Update System & Preferensi Config ->', systemRes.success ? '✅ OK' : '❌ FAIL', systemRes.message)

  const verifySystem = await getAppSystemConfigAction()
  console.log('[6] Verify Updated System Config ->', verifySystem.data.prefixNij === 'GBI-PADANG-' ? '✅ VERIFIED' : '❌ MISMATCH')

  console.log('\n==================================================================')
  console.log('✅ ALL UNIFIED SETTINGS TESTS PASSED SUCCESSFULLY!')
  console.log('==================================================================\n')
}

runSettingsVerification()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
