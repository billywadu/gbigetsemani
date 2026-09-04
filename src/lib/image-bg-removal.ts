/**
 * Client-Side Image Background Removal & Auto-Adjust Utilities
 * Features:
 * 1. AI Neural Background Removal via @imgly/background-removal (Dynamic Import)
 * 2. Instant Smart Canvas Color Keying / Paper Cleaner (<50ms for signatures and stamps)
 */

export interface BackgroundRemovalOptions {
  mode?: 'AI' | 'SMART_KEYING'
  onProgress?: (progress: number, message: string) => void
  threshold?: number // 0 to 255 for smart keying
}

/**
 * Remove background using Canvas Smart Luminance & Color Keying (ultra-fast, client-side, zero latency)
 * Perfect for signatures and stamps photographed on white/cream paper with shadows.
 */
export async function removeSignatureBackgroundCanvas(
  imageSource: File | Blob | string,
  threshold: number = 210
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'))
          return
        }

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imgData.data

        // Process pixels: calculate luminance and make background transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          // Relative luminance formula
          const lum = 0.299 * r + 0.587 * g + 0.114 * b

          if (lum >= threshold) {
            // White / bright paper background -> fully transparent
            data[i + 3] = 0
          } else if (lum > threshold - 40) {
            // Smooth alpha feathering at edge
            const alphaFactor = (threshold - lum) / 40
            data[i + 3] = Math.round(data[i + 3] * alphaFactor)
          } else {
            // Enhance ink darkness slightly for clean contrast
            data[i] = Math.max(0, Math.round(r * 0.85))
            data[i + 1] = Math.max(0, Math.round(g * 0.85))
            data[i + 2] = Math.max(0, Math.round(b * 0.85))
          }
        }

        ctx.putImageData(imgData, 0, 0)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const fileName =
                imageSource instanceof File
                  ? `transparent_${imageSource.name.replace(/\.[^/.]+$/, '')}.png`
                  : 'signature_transparent.png'
              resolve(new File([blob], fileName, { type: 'image/png' }))
            } else {
              reject(new Error('Failed to create PNG blob'))
            }
          },
          'image/png',
          1.0
        )
      } catch (err) {
        reject(err)
      }
    }

    img.onerror = (e) => reject(new Error('Failed to load image for processing: ' + e))

    if (imageSource instanceof Blob) {
      img.src = URL.createObjectURL(imageSource)
    } else {
      img.src = imageSource
    }
  })
}

/**
 * Remove background with AI Neural Network (@imgly/background-removal)
 * Falls back to Smart Canvas Keying if WebAssembly or ONNX isn't supported.
 */
export async function removeImageBackground(
  imageSource: File | Blob | string,
  options?: BackgroundRemovalOptions
): Promise<File> {
  const onProgress = options?.onProgress || (() => {})

  if (options?.mode === 'SMART_KEYING') {
    onProgress(50, 'Membersihkan latar belakang kertas...')
    const result = await removeSignatureBackgroundCanvas(imageSource, options.threshold || 210)
    onProgress(100, 'Selesai!')
    return result
  }

  try {
    onProgress(10, 'Memuat model AI penghapus background...')
    // Dynamically load @imgly/background-removal
    const { removeBackground } = await import('@imgly/background-removal')

    onProgress(30, 'Menganalisis objek tanda tangan / stempel...')
    const blobResult = await removeBackground(imageSource, {
      progress: (key: string, current: number, total: number) => {
        if (total > 0) {
          const pct = Math.min(90, Math.round(30 + (current / total) * 60))
          onProgress(pct, `Memproses AI (${key}): ${Math.round((current / total) * 100)}%`)
        }
      },
      output: {
        format: 'image/png',
        quality: 1.0,
      },
    })

    onProgress(95, 'Menyelesaikan format PNG transparan...')
    const originalName =
      imageSource instanceof File
        ? imageSource.name.replace(/\.[^/.]+$/, '')
        : 'ai_bg_removed'
    const cleanFile = new File([blobResult], `${originalName}_transparent.png`, {
      type: 'image/png',
    })

    onProgress(100, 'Background berhasil dihapus!')
    return cleanFile
  } catch (err) {
    console.warn('[ImageBgRemoval] AI removal encountered an issue, falling back to smart canvas cleaner:', err)
    onProgress(60, 'Menggunakan pembersih cerdas (Smart Canvas Keying)...')
    const fallback = await removeSignatureBackgroundCanvas(imageSource, options?.threshold || 210)
    onProgress(100, 'Selesai!')
    return fallback
  }
}
