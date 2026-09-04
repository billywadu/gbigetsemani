import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  generateCloudinarySignedUrl,
  validateMagicBytes,
  CloudinaryResourceType,
} from './cloudinary'

export { validateMagicBytes }

export interface StorageUploadResult {
  identifier: string
  fileUrl: string
  mimeType: string
  fileSize: number
  format?: string
  width?: number
  height?: number
}

export interface StorageProvider {
  upload(file: File, subfolder?: string): Promise<StorageUploadResult>
  delete(identifier: string, resourceType?: CloudinaryResourceType): Promise<void>
  getSignedUrl(identifier: string, resourceType?: CloudinaryResourceType, expiresInSeconds?: number): Promise<string>
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
] as const

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number]

/**
 * Local File System Storage Provider
 */
export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string
  private urlPrefix: string

  constructor(relativeDir = 'public/uploads/dokumen') {
    this.uploadDir = path.join(process.cwd(), relativeDir)
    this.urlPrefix = `/${relativeDir.replace(/^public\/?/, '')}`
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true })
    }
  }

  async upload(file: File, subfolder?: string): Promise<StorageUploadResult> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Strict Size Check
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Ukuran berkas (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimum 10 MB.`)
    }

    // Strict Magic Bytes Verification
    const magicCheck = validateMagicBytes(buffer)
    if (!magicCheck.valid || !magicCheck.detectedMime) {
      throw new Error('Format berkas tidak valid atau tidak diizinkan oleh sistem keamanan.')
    }

    // Determine safe extension based on verified magic bytes
    let safeExt = '.pdf'
    if (magicCheck.detectedMime === 'image/png') safeExt = '.png'
    else if (magicCheck.detectedMime === 'image/jpeg') safeExt = '.jpg'
    else if (magicCheck.detectedMime === 'image/webp') safeExt = '.webp'
    else if (magicCheck.detectedExt) safeExt = `.${magicCheck.detectedExt}`

    const safeFilename = `${crypto.randomUUID()}${safeExt}`
    const targetDir = subfolder ? path.join(this.uploadDir, path.basename(subfolder)) : this.uploadDir
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    const targetPath = path.join(targetDir, safeFilename)

    await fs.promises.writeFile(targetPath, buffer)

    const prefix = subfolder ? `${this.urlPrefix}/${path.basename(subfolder)}` : this.urlPrefix

    return {
      identifier: safeFilename,
      fileUrl: `${prefix}/${safeFilename}`,
      mimeType: magicCheck.detectedMime,
      fileSize: buffer.length,
      format: magicCheck.detectedExt,
    }
  }

  async delete(identifier: string): Promise<void> {
    const cleanIdentifier = path.basename(identifier)
    const targetPath = path.join(this.uploadDir, cleanIdentifier)
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath)
    }
  }

  async getSignedUrl(identifier: string): Promise<string> {
    const cleanIdentifier = path.basename(identifier)
    return `${this.urlPrefix}/${cleanIdentifier}`
  }
}

/**
 * Cloudinary Storage Provider (Production Default)
 */
export class CloudinaryStorageProvider implements StorageProvider {
  private defaultFolder: string

  constructor(defaultFolder = 'general') {
    this.defaultFolder = defaultFolder
  }

  async upload(file: File, subfolder?: string): Promise<StorageUploadResult> {
    // Fallback to local if credentials are not configured in environment
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.warn('Cloudinary credentials not found. Falling back to LocalStorageProvider.')
      const local = new LocalStorageProvider()
      return local.upload(file, subfolder)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Strict Size Check
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Ukuran berkas (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimum 10 MB.`)
    }

    const targetFolder = subfolder || this.defaultFolder
    const cleanName = path.parse(file.name || 'file').name

    const result = await uploadBufferToCloudinary(buffer, {
      folder: targetFolder,
      fileName: cleanName,
    })

    return {
      identifier: result.publicId,
      fileUrl: result.secureUrl,
      mimeType: result.resourceType === 'image' ? `image/${result.format}` : 'application/octet-stream',
      fileSize: result.bytes,
      format: result.format,
      width: result.width,
      height: result.height,
    }
  }

  async delete(identifier: string, resourceType: CloudinaryResourceType = 'image'): Promise<void> {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      const local = new LocalStorageProvider()
      return local.delete(identifier)
    }
    await deleteFromCloudinary(identifier, resourceType)
  }

  async getSignedUrl(identifier: string, resourceType: CloudinaryResourceType = 'raw', expiresInSeconds = 3600): Promise<string> {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      const local = new LocalStorageProvider()
      return local.getSignedUrl(identifier)
    }
    return generateCloudinarySignedUrl(identifier, resourceType, expiresInSeconds)
  }
}

/**
 * Storage Provider Factory
 */
export function getStorageProvider(folder = 'general'): StorageProvider {
  // Strip any legacy 'public/uploads/' prefix
  const cleanFolder = folder.replace(/^public\/?uploads\/?/, '').replace(/^\/+/, '') || 'general'
  const provider = process.env.STORAGE_PROVIDER || 'cloudinary'
  
  if (provider === 'cloudinary' && process.env.CLOUDINARY_CLOUD_NAME) {
    return new CloudinaryStorageProvider(cleanFolder)
  }
  return new LocalStorageProvider(`public/uploads/${cleanFolder}`)
}
