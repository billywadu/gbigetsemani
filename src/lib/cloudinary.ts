import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import crypto from 'crypto'

/**
 * Configure Cloudinary SDK v2
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export type CloudinaryResourceType = 'image' | 'raw' | 'video' | 'auto'

export interface CloudinaryUploadOptions {
  folder?: string
  resourceType?: CloudinaryResourceType
  fileName?: string
  tags?: string[]
  isPrivate?: boolean
}

export interface CloudinaryResult {
  publicId: string
  secureUrl: string
  format: string
  resourceType: string
  bytes: number
  width?: number
  height?: number
  originalFilename?: string
}

/**
 * Validates file buffer magic bytes to ensure true file type
 */
export function validateMagicBytes(buffer: Buffer): {
  valid: boolean
  detectedMime?: string
  detectedExt?: string
} {
  if (!buffer || buffer.length < 4) {
    return { valid: false }
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { valid: true, detectedMime: 'image/png', detectedExt: 'png' }
  }

  // JPEG/JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg', detectedExt: 'jpg' }
  }

  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return { valid: true, detectedMime: 'image/gif', detectedExt: 'gif' }
  }

  // WebP: RIFF ... WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedMime: 'image/webp', detectedExt: 'webp' }
  }

  // PDF: %PDF- (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { valid: true, detectedMime: 'application/pdf', detectedExt: 'pdf' }
  }

  // ZIP / DOCX / XLSX: PK.. (50 4B 03 04)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return {
      valid: true,
      detectedMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      detectedExt: 'docx',
    }
  }

  // MP4 Video: ....ftyp (66 74 79 70 at offset 4)
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return { valid: true, detectedMime: 'video/mp4', detectedExt: 'mp4' }
  }

  // Fallback for text/plain or svg if safe
  const textHead = buffer.subarray(0, 100).toString('utf8').trim()
  if (textHead.startsWith('<svg') || textHead.includes('<svg')) {
    return { valid: true, detectedMime: 'image/svg+xml', detectedExt: 'svg' }
  }

  return { valid: false }
}

/**
 * Upload Buffer directly to Cloudinary using Upload Stream
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryResult> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    throw new Error('Kredensial Cloudinary belum dikonfigurasi pada environment.')
  }

  // Verify Magic Bytes
  const magic = validateMagicBytes(buffer)
  if (!magic.valid) {
    throw new Error('Format berkas tidak valid atau tidak diizinkan oleh sistem keamanan.')
  }

  const folder = options.folder ? `cmsgereja/${options.folder.replace(/^cmsgereja\/?/, '')}` : 'cmsgereja/general'
  
  // Determine appropriate resource type based on magic bytes if not explicitly provided
  let resourceType: CloudinaryResourceType = options.resourceType || 'auto'
  if (resourceType === 'auto') {
    if (magic.detectedMime?.startsWith('image/')) {
      resourceType = 'image'
    } else if (magic.detectedMime?.startsWith('video/')) {
      resourceType = 'video'
    } else {
      resourceType = 'raw'
    }
  }

  const uniqueSuffix = crypto.randomUUID().replace(/-/g, '').substring(0, 12)
  const sanitizedName = options.fileName
    ? options.fileName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40)
    : `file_${uniqueSuffix}`
  const publicId = `${sanitizedName}_${uniqueSuffix}`

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        type: options.isPrivate ? 'authenticated' : 'upload',
        tags: options.tags || ['cmsgereja'],
        overwrite: false,
        use_filename: false,
        unique_filename: true,
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          console.error('[Cloudinary] Upload Stream Error:', error)
          return reject(new Error(error?.message || 'Gagal mengunggah berkas ke Cloudinary.'))
        }

        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          format: result.format || magic.detectedExt || '',
          resourceType: result.resource_type,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          originalFilename: options.fileName,
        })
      }
    )

    uploadStream.end(buffer)
  })
}

/**
 * Upload Standard Image with Optimization
 */
export async function uploadImageToCloudinary(
  buffer: Buffer,
  folder = 'images',
  fileName?: string
): Promise<CloudinaryResult> {
  return uploadBufferToCloudinary(buffer, {
    folder,
    resourceType: 'image',
    fileName,
  })
}

/**
 * Upload Raw Document (PDF, DOCX, ZIP)
 */
export async function uploadDocumentToCloudinary(
  buffer: Buffer,
  folder = 'documents',
  fileName?: string,
  isPrivate = false
): Promise<CloudinaryResult> {
  return uploadBufferToCloudinary(buffer, {
    folder,
    resourceType: 'raw',
    fileName,
    isPrivate,
  })
}

/**
 * Upload Video Asset
 */
export async function uploadVideoToCloudinary(
  buffer: Buffer,
  folder = 'videos',
  fileName?: string
): Promise<CloudinaryResult> {
  return uploadBufferToCloudinary(buffer, {
    folder,
    resourceType: 'video',
    fileName,
  })
}

/**
 * Delete Asset from Cloudinary
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: CloudinaryResourceType = 'image'
): Promise<{ success: boolean; result?: string }> {
  if (!publicId || !process.env.CLOUDINARY_CLOUD_NAME) {
    return { success: false, result: 'No publicId or credentials' }
  }

  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    })
    return { success: res.result === 'ok', result: res.result }
  } catch (error: any) {
    console.error('[Cloudinary] Delete Error:', error)
    return { success: false, result: error.message }
  }
}

/**
 * Generate Secure Signed URL for Private / Authenticated Assets
 */
export function generateCloudinarySignedUrl(
  publicId: string,
  resourceType: CloudinaryResourceType = 'raw',
  expiresInSeconds = 3600
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds
  return cloudinary.utils.private_download_url(publicId, '', {
    resource_type: resourceType,
    type: 'authenticated',
    expires_at: expiresAt,
  })
}

/**
 * Extract Cloudinary publicId and resourceType from full URL or ID
 */
export function extractCloudinaryPublicId(urlOrId: string | null | undefined): {
  publicId: string | null
  resourceType: CloudinaryResourceType
} {
  if (!urlOrId || typeof urlOrId !== 'string') {
    return { publicId: null, resourceType: 'image' }
  }

  const clean = urlOrId.trim()
  if (!clean.includes('res.cloudinary.com')) {
    if (clean.startsWith('http://') || clean.startsWith('/') || clean.length < 3) {
      return { publicId: null, resourceType: 'image' }
    }
    const isDoc =
      clean.includes('dokumen') ||
      clean.includes('arsip') ||
      clean.includes('vault') ||
      clean.endsWith('.pdf') ||
      clean.endsWith('.docx')
    return {
      publicId: clean.startsWith('/') ? clean.substring(1) : clean,
      resourceType: isDoc ? 'raw' : 'image',
    }
  }

  try {
    const url = new URL(clean)
    const parts = url.pathname.split('/')
    const uploadIndex = parts.indexOf('upload')
    if (uploadIndex === -1 || uploadIndex >= parts.length - 1) {
      return { publicId: null, resourceType: 'image' }
    }

    const typePrefix = parts[uploadIndex - 1]
    let resourceType: CloudinaryResourceType = 'image'
    if (typePrefix === 'raw') resourceType = 'raw'
    else if (typePrefix === 'video') resourceType = 'video'

    let publicIdParts = parts.slice(uploadIndex + 1)
    if (publicIdParts.length > 0 && /^v\d+$/.test(publicIdParts[0])) {
      publicIdParts = publicIdParts.slice(1)
    }

    const rawPublicIdWithExt = publicIdParts.join('/')
    if (resourceType === 'image' || resourceType === 'video') {
      const dotIndex = rawPublicIdWithExt.lastIndexOf('.')
      const publicId = dotIndex !== -1 ? rawPublicIdWithExt.substring(0, dotIndex) : rawPublicIdWithExt
      return { publicId, resourceType }
    } else {
      return { publicId: rawPublicIdWithExt, resourceType }
    }
  } catch {
    return { publicId: null, resourceType: 'image' }
  }
}

/**
 * Automatically cleanup/destroy old Cloudinary asset when replaced or hard-deleted
 */
export async function cleanupCloudinaryAsset(
  urlOrId: string | null | undefined,
  explicitResourceType?: CloudinaryResourceType
): Promise<{ success: boolean; result?: string }> {
  if (!urlOrId) return { success: true }

  const { publicId, resourceType } = extractCloudinaryPublicId(urlOrId)
  if (!publicId) return { success: true }

  const targetType = explicitResourceType || resourceType
  return deleteFromCloudinary(publicId, targetType)
}

export { cloudinary }

