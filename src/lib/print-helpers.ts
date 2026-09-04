import { PrintLayoutConfig, DEFAULT_PRINT_LAYOUT_CONFIG, SignatoryConfig } from '@/lib/validations/print-layout'
import { getPrintLayoutConfigAction } from '@/actions/print-layout'
import { escapeHtml } from '@/lib/utils'

export type SignatoryRoleKey =
  | 'gembala'
  | 'sekretaris'
  | 'bendahara'
  | 'ketuaMajelis'
  | 'koordinatorDivisi'
  | 'pembinaKategorial'
  | 'koordinatorKomsel'
  | 'ketuaPendidikan'

export interface SignatorySlot {
  roleKey: SignatoryRoleKey
  customTitle?: string
  overrideName?: string
  includeStamp?: boolean
}

/**
 * Fetch latest effective print config from database
 */
export async function getEffectivePrintConfig(): Promise<PrintLayoutConfig> {
  try {
    const res = await getPrintLayoutConfigAction()
    if (res.success && res.data) {
      return res.data
    }
  } catch (err) {
    console.warn('[PrintHelpers] Failed to load print config, using defaults:', err)
  }
  return DEFAULT_PRINT_LAYOUT_CONFIG
}

/**
 * Generate standard HTML Kop Surat Resmi Gereja
 * @param logoPreviewOverride - Optional local blob/object URL to override config.kop.logoUrl (for settings live preview)
 */
export function buildKopHtml(
  config: PrintLayoutConfig,
  opts?: {
    badgeText?: string
    dateText?: string
    logoPreviewOverride?: string | null
  }
): string {
  const borderBottomStyle =
    config.kop.garisKopStyle === 'DOUBLE'
      ? `3px double ${config.kop.garisKopColor || '#0f172a'}`
      : config.kop.garisKopStyle === 'GOLD'
      ? `3px solid #d97706`
      : config.kop.garisKopStyle === 'NAVY'
      ? `3px solid #1e3a8a`
      : `2px solid ${config.kop.garisKopColor || '#0f172a'}`

  // Use local preview override (settings page) or saved URL (production), else badge
  const effectiveLogoUrl = opts?.logoPreviewOverride ?? config.kop.logoUrl

  const logoHtml =
    config.kop.tampilkanLogo && effectiveLogoUrl
      ? `<img src="${effectiveLogoUrl}" alt="Logo" style="height: 48px; width: 48px; object-fit: contain; border-radius: 6px;" />`
      : `<div style="width: 44px; height: 44px; background: ${config.kop.garisKopColor || '#0f172a'}; color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px;">G</div>`

  const badgeText = opts?.badgeText || 'DOKUMEN RESMI'
  const dateText = opts?.dateText || new Date().toLocaleDateString('id-ID')

  return `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: ${borderBottomStyle}; padding-bottom: 8px; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        ${logoHtml}
        <div>
          <div style="font-size: 13px; font-weight: 900; color: ${config.kop.garisKopColor || '#0f172a'}; text-transform: uppercase; letter-spacing: -0.2px;">
            ${escapeHtml(config.kop.namaGereja)}
          </div>
          <div style="font-size: 8.5px; color: #475569; margin-top: 1px;">
            ${escapeHtml(config.kop.subJudul)} • ${escapeHtml(config.kop.kontak)}
          </div>
          <div style="font-size: 8px; color: #64748b; font-style: italic; margin-top: 1px;">
            ${escapeHtml(config.kop.nomorIzin)}
          </div>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="background: ${config.kop.garisKopColor || '#0f172a'}; color: #ffffff; font-size: 8.5px; font-weight: 800; padding: 2.5px 8px; border-radius: 4px; display: inline-block;">
          ${escapeHtml(badgeText)}
        </div>
        <div style="font-size: 8.5px; font-family: monospace; color: #64748b; margin-top: 3px;">
          ${escapeHtml(dateText)}
        </div>
      </div>
    </div>
  `
}

/**
 * TTD Preview URLs for settings page live preview (keyed by roleKey)
 * Pass this to buildSignaturesHtml to show local file previews instead of saved DB URLs
 */
export type TtdPreviewOverrides = Partial<Record<SignatoryRoleKey, string | null>> & {
  stempelPreviewUrl?: string | null
}

/**
 * Generate standard HTML Signatures block with Stempel and digital TTD
 * @param previewOverrides - Optional local blob URLs to override saved DB URLs (for settings live preview)
 */
export function buildSignaturesHtml(
  config: PrintLayoutConfig,
  slots: SignatorySlot[],
  previewOverrides?: TtdPreviewOverrides
): string {
  if (!slots || slots.length === 0) return ''

  // Support stempel from local preview override or saved config URL
  const stempelUrl = previewOverrides?.stempelPreviewUrl ?? config.stempel.stempelUrl
  const stempelSrc =
    config.stempel.tampilkanStempel && stempelUrl
      ? stempelUrl
      : null

  const stampHeight =
    config.stempel.ukuran === 'SMALL'
      ? 44
      : config.stempel.ukuran === 'MEDIUM'
      ? 56
      : config.stempel.ukuran === 'LARGE'
      ? 68
      : 52 // AUTO default

  const stampRotation = config.stempel.rotasi ?? -6
  const stampOpacity = config.stempel.opacity ?? 0.85

  const stampPositionStyle =
    config.stempel.posisiOffset === 'OVERLAP_LEFT'
      ? `position: absolute; left: 5px; top: -5px; height: ${stampHeight}px; opacity: ${stampOpacity}; transform: rotate(${stampRotation}deg); pointer-events: none; object-fit: contain; z-index: 1;`
      : config.stempel.posisiOffset === 'CENTER'
      ? `position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(${stampRotation}deg); height: ${stampHeight}px; opacity: ${stampOpacity}; pointer-events: none; object-fit: contain; z-index: 1;`
      : `position: absolute; right: 5px; top: -5px; height: ${stampHeight}px; opacity: ${stampOpacity}; transform: rotate(${stampRotation}deg); pointer-events: none; object-fit: contain; z-index: 1;`

  const boxesHtml = slots
    .map((slot) => {
      const signatory = config.signatories[slot.roleKey] as SignatoryConfig | undefined
      if (!signatory) return ''

      const roleTitle = slot.customTitle || signatory.jabatan
      const personName =
        slot.overrideName ||
        `${signatory.nama}${signatory.gelar ? ', ' + signatory.gelar : ''}`

      // Use local preview override (settings page) or saved DB URL (production)
      const effectiveTtdUrl = previewOverrides?.[slot.roleKey] ?? signatory.ttdUrl
      const ttdSrc =
        config.options.modeTandaTangan !== 'MANUAL_LINE' && effectiveTtdUrl
          ? effectiveTtdUrl
          : null

      // Check if stamp belongs to this slot
      const isStamped =
        slot.includeStamp ??
        ((config.stempel.posisiStempel === 'GEMBALA' && slot.roleKey === 'gembala') ||
          (config.stempel.posisiStempel === 'SEKRETARIS' && slot.roleKey === 'sekretaris') ||
          (config.stempel.posisiStempel === 'BENDAHARA' && slot.roleKey === 'bendahara') ||
          (config.stempel.posisiStempel === 'KETUA_MAJELIS' && slot.roleKey === 'ketuaMajelis'))

      return `
        <div style="text-align: center; width: 200px; font-size: 9px; position: relative;">
          <div style="font-weight: 600; color: #475569; margin-bottom: 2px;">
            ${escapeHtml(roleTitle)}
          </div>
          <div style="height: 48px; display: flex; align-items: center; justify-content: center; position: relative;">
            ${
              isStamped && stempelSrc
                ? `<img src="${stempelSrc}" style="${stampPositionStyle}" />`
                : ''
            }
            ${
              ttdSrc
                ? `<img src="${ttdSrc}" style="max-height: 44px; max-width: 120px; object-fit: contain; position: relative; z-index: 2;" />`
                : `<div style="height: 44px; position: relative; z-index: 2;"></div>`
            }
          </div>
          <div style="border-top: 1px solid #0f172a; padding-top: 3px; font-weight: bold; color: #0f172a;">
            ${escapeHtml(personName)}
          </div>
          ${
            signatory.nomorInduk
              ? `<div style="font-size: 8px; color: #64748b; font-family: monospace; margin-top: 1px;">NIP: ${escapeHtml(
                  signatory.nomorInduk
                )}</div>`
              : ''
          }
        </div>
      `
    })
    .join('')

  return `
    <div style="display: flex; justify-content: space-between; margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0; break-inside: avoid; page-break-inside: avoid;">
      ${boxesHtml}
    </div>
  `
}


/**
 * Generate Complete Standalone HTML Printable Document
 */
export function buildPrintableHtmlDocument(
  config: PrintLayoutConfig,
  opts: {
    title: string
    bodyHtml: string
    isLandscape?: boolean
    paperSize?: 'A4' | 'F4'
    extraStyles?: string
    badgeText?: string
    dateText?: string
  }
): string {
  const isLandscape = opts.isLandscape ?? config.options.orientasiDefault === 'LANDSCAPE'
  const paperSize = opts.paperSize || config.options.ukuranKertasDefault || 'A4'
  const sizeRule = `${paperSize} ${isLandscape ? 'landscape' : 'portrait'}`
  const kopHtml = buildKopHtml(config, {
    badgeText: opts.badgeText,
    dateText: opts.dateText,
  })

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(opts.title)} - ${escapeHtml(config.kop.namaGereja)}</title>
      <style>
        @page {
          size: ${sizeRule};
          margin: ${isLandscape ? '10mm' : '12mm'};
        }
        * { box-sizing: border-box; margin: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #ffffff;
          color: #0f172a;
          padding: 4px;
          font-size: 9.5px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        ${opts.extraStyles || ''}
      </style>
    </head>
    <body>
      ${kopHtml}
      ${opts.bodyHtml}

      ${
        config.options.tampilkanWatermarkAudit
          ? `
            <div style="font-size: 8px; color: #94a3b8; margin-top: 14px; text-align: center; font-family: monospace; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
              ${escapeHtml(config.options.catatanKakiResmi)} • Verifikasi Dokumen SHA-256 Otentik ${escapeHtml(config.kop.namaGereja || 'Gereja')}.
            </div>
          `
          : ''
      }

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `
}

/**
 * Generate Standalone Pixel-Perfect Printable Document for Official Church Letters (Surat Resmi)
 */
export function buildSuratResmiPrintDocument(values: any): string {
  const isDoubleLogo = values.modeLogo === 'DUA_LOGO'

  const borderBottomStyle =
    values.garisKopStyle === 'DOUBLE'
      ? `3px double ${values.garisKopColor || '#0f172a'}`
      : values.garisKopStyle === 'GOLD'
      ? `3px solid #d97706`
      : values.garisKopStyle === 'NAVY'
      ? `3px solid #1e3a8a`
      : `2px solid ${values.garisKopColor || '#0f172a'}`

  const formattedDate = values.tanggalSurat
    ? (() => {
        try {
          const d = new Date(values.tanggalSurat)
          if (isNaN(d.getTime())) return values.tanggalSurat
          return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        } catch {
          return values.tanggalSurat
        }
      })()
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

  const logoKiriHtml = values.logoKiriUrl
    ? `<img src="${values.logoKiriUrl}" alt="Logo Kiri" style="width: 60px; height: 60px; object-fit: contain; flex-shrink: 0;" />`
    : `<div style="width: 54px; height: 54px; border-radius: 8px; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #94a3b8; flex-shrink: 0;">Logo 1</div>`

  const logoKananHtml = isDoubleLogo
    ? values.logoKananUrl
      ? `<img src="${values.logoKananUrl}" alt="Logo Kanan" style="width: 60px; height: 60px; object-fit: contain; flex-shrink: 0;" />`
      : `<div style="width: 54px; height: 54px; border-radius: 8px; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #94a3b8; flex-shrink: 0;">Logo 2</div>`
    : ''

  const pointsHtml =
    values.poinIsi && values.poinIsi.length > 0
      ? values.poinIsi
          .map(
            (item: any, idx: number) => `
          <div style="display: flex; align-items: flex-start; margin-bottom: 5px; text-align: justify; line-height: 1.45;">
            <span style="font-weight: bold; width: 20px; flex-shrink: 0; text-align: right; padding-right: 6px;">${
              idx + 1
            }.</span>
            <span style="${
              item.isBold ? 'font-weight: 700; color: #0f172a;' : 'color: #1e293b;'
            }">${escapeHtml(item.text)}</span>
          </div>
        `
          )
          .join('')
      : ''

  const pejabats = values.signatories || []
  const p1 = pejabats[0] || { jabatan: 'Ketua', nama: '-' }
  const p2 = pejabats[1] || { jabatan: 'Sekretaris', nama: '-' }

  const stampHtml =
    values.tampilkanStempel && values.stempelUrl
      ? `<img src="${values.stempelUrl}" alt="Stempel" style="position: absolute; ${
          values.posisiStempel === 'LEFT'
            ? 'left: 20px;'
            : values.posisiStempel === 'RIGHT'
            ? 'right: 20px;'
            : 'left: 50%; transform: translateX(-50%) rotate(-6deg);'
        } top: -5px; height: 75px; opacity: 0.85; pointer-events: none; z-index: 1;" />`
      : ''

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(values.perihal || 'Surat Resmi')} - ${escapeHtml(values.nomorSurat || '')}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Times New Roman', Times, 'Nimbus Roman No9 L', Georgia, serif;
          background: #ffffff;
          color: #0f172a;
          font-size: 11px;
          line-height: 1.5;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          padding: 2px;
        }
        .break-before-page {
          page-break-before: always;
          break-before: page;
        }
        .break-inside-avoid {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <!-- ── 1. KOP SURAT ── -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; padding-bottom: 8px; margin-bottom: 12px; border-bottom: ${borderBottomStyle};">
        ${logoKiriHtml}
        <div style="flex: 1; text-align: center; padding: 0 4px;">
          <h1 style="font-size: 12.5px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.2px; line-height: 1.25; color: ${
            values.garisKopColor || '#0f172a'
          };">
            ${(values.kopNama || '').split('\n').map((l: string) => escapeHtml(l)).join('<br />')}
          </h1>
          ${
            values.kopSub
              ? `<div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #1e293b; margin-top: 2px;">${escapeHtml(
                  values.kopSub
                )}</div>`
              : ''
          }
          ${
            values.kopBadanHukum
              ? `<div style="font-size: 8px; color: #475569; margin-top: 2px;">${escapeHtml(
                  values.kopBadanHukum
                )}</div>`
              : ''
          }
          ${
            values.kopAlamat
              ? `<div style="font-size: 8.5px; color: #334155; margin-top: 2px;">${escapeHtml(
                  values.kopAlamat
                )}</div>`
              : ''
          }
          ${
            values.kopKontak
              ? `<div style="font-size: 8px; color: #475569; font-family: monospace; margin-top: 1px;">${escapeHtml(
                  values.kopKontak
                )}</div>`
              : ''
          }
        </div>
        ${logoKananHtml}
      </div>

      <!-- ── 2. METADATA SURAT (NOMOR, PERIHAL, TANGGAL) ── -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; font-size: 10px;">
        <table style="border-collapse: collapse; font-size: 10px;">
          <tbody>
            <tr>
              <td style="padding: 1px 6px 1px 0; font-weight: 600; color: #475569; width: 60px;">No</td>
              <td style="padding: 1px 4px 1px 0; font-weight: 600;">:</td>
              <td style="padding: 1px 0; font-family: monospace; font-weight: bold; color: #0f172a;">${escapeHtml(
                values.nomorSurat || '-'
              )}</td>
            </tr>
            <tr>
              <td style="padding: 1px 6px 1px 0; font-weight: 600; color: #475569;">Perihal</td>
              <td style="padding: 1px 4px 1px 0; font-weight: 600;">:</td>
              <td style="padding: 1px 0; font-weight: 800; text-transform: uppercase; text-decoration: underline; color: #0f172a;">${escapeHtml(
                values.perihal || '-'
              )}</td>
            </tr>
            <tr>
              <td style="padding: 1px 6px 1px 0; font-weight: 600; color: #475569;">Lampiran</td>
              <td style="padding: 1px 4px 1px 0; font-weight: 600;">:</td>
              <td style="padding: 1px 0; color: #334155;">${escapeHtml(
                values.lampiran || '-'
              )}</td>
            </tr>
          </tbody>
        </table>

        <div style="text-align: right; font-weight: 600; color: #334155; font-size: 10px;">
          ${escapeHtml(values.tempatSurat || 'Jakarta')}, ${formattedDate}
        </div>
      </div>

      <!-- ── 3. TUJUAN SURAT (KEPADA YTH) ── -->
      <div style="margin-bottom: 12px; font-size: 10px; line-height: 1.4;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 2px;">Kepada Yth,</div>
        <div style="font-weight: bold; color: #0f172a; white-space: pre-line;">${escapeHtml(
          values.tujuanKepada || '-'
        )}</div>
        <div style="font-weight: 600; color: #334155; margin-top: 2px;">${escapeHtml(
          values.tujuanDi || 'Di Tempat'
        )}</div>
      </div>

      <!-- ── 4. SALAM PEMBUKA & PARAGRAF PEMBUKA ── -->
      <div style="margin-bottom: 10px; font-size: 10px; line-height: 1.45;">
        <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${escapeHtml(
          values.salamPembuka || 'Salam dalam kasih Kristus,'
        )}</div>
        <div style="color: #1e293b; text-align: justify; white-space: pre-line;">${escapeHtml(
          values.paragrafPembuka || ''
        )}</div>
      </div>

      <!-- ── 5. SUB-JUDUL POKOK & POIN-POIN ── -->
      ${
        values.subJudul
          ? `<div style="text-align: center; margin: 8px 0 6px 0;"><span style="font-weight: 900; text-transform: uppercase; font-size: 10.5px; border-bottom: 1.5px solid #0f172a; padding-bottom: 1px;">${escapeHtml(
              values.subJudul
            )}</span></div>`
          : ''
      }

      ${pointsHtml}

      <!-- ── 6. PARAGRAF PENUTUP ── -->
      <div style="margin-top: 8px; margin-bottom: 14px; font-size: 10px; line-height: 1.45; text-align: justify; white-space: pre-line; color: #1e293b;">
        ${escapeHtml(values.paragrafPenutup || '')}
      </div>

      <!-- ── 7. TANDA TANGAN PEJABAT & STEMPEL RESMI ── -->
      <div class="break-inside-avoid" style="margin-top: 14px;">
        <div style="margin-bottom: 6px; font-size: 10px;">
          <div style="font-weight: 600; color: #334155;">${escapeHtml(
            values.salamPenutup || 'Dalam KasihNya,'
          )}</div>
          ${
            values.namaInstansiTtd
              ? `<div style="font-weight: bold; text-transform: uppercase; color: #0f172a; margin-top: 1px;">${escapeHtml(
                  values.namaInstansiTtd
                )}</div>`
              : ''
          }
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; position: relative; padding-top: 4px;">
          ${stampHtml}

          <!-- Pejabat 1 (Kiri) -->
          <div style="text-align: center; width: 210px; position: relative; z-index: 2;">
            <div style="font-weight: 700; font-size: 10px; color: #334155; margin-bottom: 2px;">${escapeHtml(
              p1.jabatan
            )}</div>
            <div style="height: 48px; display: flex; align-items: center; justify-content: center; margin: 2px 0;">
              ${
                p1.ttdUrl
                  ? `<img src="${p1.ttdUrl}" alt="TTD" style="max-height: 44px; max-width: 120px; object-fit: contain; position: relative; z-index: 2;" />`
                  : `<div style="height: 44px; position: relative; z-index: 2;"></div>`
              }
            </div>
            <div style="font-weight: 900; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #0f172a; padding-bottom: 2px; font-size: 10px;">
              ${escapeHtml(p1.nama)}${p1.gelar ? `, ${escapeHtml(p1.gelar)}` : ''}
            </div>
            ${
              p1.nomorInduk
                ? `<div style="font-size: 8.5px; color: #64748b; font-family: monospace; margin-top: 2px;">${escapeHtml(
                    p1.nomorInduk
                  )}</div>`
                : ''
            }
          </div>

          <!-- Pejabat 2 (Kanan) -->
          ${
            values.formatTtd === 'DUA_PEJABAT'
              ? `
            <div style="text-align: center; width: 210px; position: relative; z-index: 2;">
              <div style="font-weight: 700; font-size: 10px; color: #334155; margin-bottom: 2px;">${escapeHtml(
                p2.jabatan
              )}</div>
              <div style="height: 48px; display: flex; align-items: center; justify-content: center; margin: 2px 0;">
                ${
                  p2.ttdUrl
                    ? `<img src="${p2.ttdUrl}" alt="TTD" style="max-height: 44px; max-width: 120px; object-fit: contain; position: relative; z-index: 2;" />`
                    : `<div style="height: 44px; position: relative; z-index: 2;"></div>`
                }
              </div>
              <div style="font-weight: 900; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #0f172a; padding-bottom: 2px; font-size: 10px;">
                ${escapeHtml(p2.nama)}${p2.gelar ? `, ${escapeHtml(p2.gelar)}` : ''}
              </div>
              ${
                p2.nomorInduk
                  ? `<div style="font-size: 8.5px; color: #64748b; font-family: monospace; margin-top: 2px;">${escapeHtml(
                      p2.nomorInduk
                    )}</div>`
                  : ''
              }
            </div>
          `
              : ''
          }
        </div>
      </div>

      <!-- ── 8. LAMPIRAN TAMBAHAN (LEMBAR KE-2 OPSIONAL) ── -->
      ${
        values.adaLampiran
          ? `
        <div class="break-before-page" style="padding-top: 15px;">
          <div style="text-align: center; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">
            <div style="font-size: 9px; font-family: monospace; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
              LAMPIRAN SURAT NO: ${escapeHtml(values.nomorSurat || '-')}
            </div>
            <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; margin-top: 3px; color: #0f172a;">
              ${escapeHtml(values.judulLampiran || 'Rincian Lampiran Dokumen')}
            </div>
          </div>
          ${
            values.isiLampiran
              ? `<div style="font-size: 9.5px; line-height: 1.5; color: #1e293b; background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; white-space: pre-line;">${escapeHtml(
                  values.isiLampiran
                )}</div>`
              : ''
          }
          ${
            values.gambarLampiranUrl
              ? `<div style="margin-top: 12px; text-align: center;"><img src="${values.gambarLampiranUrl}" alt="Gambar Lampiran" style="max-height: 320px; max-width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; display: inline-block; object-fit: contain;" /></div>`
              : ''
          }
        </div>
      `
          : ''
      }

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `
}

