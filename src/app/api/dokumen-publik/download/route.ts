import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyDocAccessToken } from '@/lib/public-doc-tokens'
import { createAuditLog } from '@/lib/jemaat-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const mode = searchParams.get('mode') // 'download' or 'view'

    if (!token) {
      return new NextResponse('Token unduhan tidak ditemukan.', { status: 400 })
    }

    const verification = verifyDocAccessToken(token)
    if (!verification.valid || !verification.dokumenId) {
      return new NextResponse('Token akses tidak valid atau sudah kedaluwarsa. Silakan lakukan verifikasi ulang pada portal jemaat.', {
        status: 403,
      })
    }

    const dokumen = await prisma.dokumenJemaat.findFirst({
      where: {
        id: verification.dokumenId,
        status: 'VERIFIED',
        deletedAt: null,
      },
      include: {
        jemaat: {
          select: {
            nama: true,
            nij: true,
          },
        },
      },
    })

    if (!dokumen || !dokumen.fileUrl) {
      return new NextResponse('Berkas dokumen tidak ditemukan atau telah dinonaktifkan.', { status: 404 })
    }

    // Client IP detection
    const forwardedFor = request.headers.get('x-forwarded-for')
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1'

    // Log Audit Log
    try {
      await createAuditLog(
        `Jemaat Mandiri (${dokumen.jemaat?.nama || 'Publik'})`,
        mode === 'view' ? 'DOKUMEN_MANDIRI_VIEWED' : 'DOKUMEN_MANDIRI_DOWNLOADED',
        'DokumenJemaat',
        dokumen.id,
        JSON.stringify({
          judul: dokumen.judul,
          jenisDokumen: dokumen.jenisDokumen,
          jemaatNij: dokumen.jemaat?.nij,
          ip: clientIp,
        })
      )
    } catch (auditErr) {
      console.error('Failed to log audit for public doc download:', auditErr)
    }

    // Clean filename for download
    const cleanDocName = dokumen.judul.replace(/[^a-zA-Z0-9_-]/g, '_')
    const cleanJemaatName = (dokumen.jemaat?.nama || 'Jemaat').replace(/[^a-zA-Z0-9_-]/g, '_')
    const extension = dokumen.mimeType.includes('pdf') ? 'pdf' : dokumen.mimeType.includes('png') ? 'png' : 'jpg'
    const finalFilename = `${dokumen.jenisDokumen}_${cleanDocName}_${cleanJemaatName}.${extension}`

    // Safe destination URL validation (prevents Open Redirect / SSRF to arbitrary host)
    const isSafeUrl =
      dokumen.fileUrl.startsWith('https://res.cloudinary.com/') ||
      dokumen.fileUrl.startsWith('/uploads/') ||
      dokumen.fileUrl.startsWith('/')

    if (!isSafeUrl) {
      console.warn(`[Security Alert] Blocked suspicious redirect destination: ${dokumen.fileUrl}`)
      return new NextResponse('Format berkas tidak diizinkan untuk diunduh.', { status: 400 })
    }

    // If viewing in browser
    if (mode === 'view') {
      return NextResponse.redirect(dokumen.fileUrl)
    }

    // For download attachment: fetch from storage or redirect
    return NextResponse.redirect(dokumen.fileUrl, {
      headers: {
        'Content-Disposition': `attachment; filename="${finalFilename}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error: any) {
    console.error('Error in public document download route:', error)
    return new NextResponse('Terjadi kesalahan pada server saat memproses unduhan dokumen.', { status: 500 })
  }
}
