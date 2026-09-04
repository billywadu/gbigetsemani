import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  ImageRun,
  UnderlineType,
} from 'docx'
import { SuratResmiFormValues } from './validations/surat'

/**
 * Fetch image as Uint8Array for docx ImageRun
 */
async function fetchImageAsBuffer(
  url: string | null | undefined
): Promise<{ buffer: Uint8Array; type: 'png' | 'jpg' } | null> {
  if (!url) return null

  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)
    const isJpeg = (blob.type || '').includes('jpeg') || (blob.type || '').includes('jpg')

    return {
      buffer: uint8,
      type: isJpeg ? 'jpg' : 'png',
    }
  } catch (err) {
    console.warn('[fetchImageAsBuffer] Failed to load image buffer:', err)
    return null
  }
}

/**
 * Export Surat Resmi to True Native OpenXML Microsoft Word (.docx)
 * The Kop Surat is placed directly into the native Document Header layer.
 */
export async function exportSuratToWord(values: SuratResmiFormValues) {
  const isDoubleLogo = values.modeLogo === 'DUA_LOGO'

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

  const pejabats = values.signatories || []
  const p1 = pejabats[0] || { jabatan: 'Ketua', nama: '-' }
  const p2 = pejabats[1] || { jabatan: 'Sekretaris', nama: '-' }

  // 1. Fetch images as buffers
  const [logoKiriData, logoKananData, ttd1Data, ttd2Data, stampData, lampiranData] =
    await Promise.all([
      fetchImageAsBuffer(values.logoKiriUrl),
      isDoubleLogo ? fetchImageAsBuffer(values.logoKananUrl) : Promise.resolve(null),
      fetchImageAsBuffer(p1.ttdUrl),
      values.formatTtd === 'DUA_PEJABAT'
        ? fetchImageAsBuffer(p2.ttdUrl)
        : Promise.resolve(null),
      values.tampilkanStempel ? fetchImageAsBuffer(values.stempelUrl) : Promise.resolve(null),
      values.adaLampiran ? fetchImageAsBuffer(values.gambarLampiranUrl) : Promise.resolve(null),
    ])

  // 2. Build Kop Surat Table for Header
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  }

  const kopTextParagraphs = [
    ...(values.kopNama || '').split('\n').map(
      (line) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 20 },
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 24, // 12pt
              font: 'Times New Roman',
              color: values.garisKopColor?.replace('#', '') || '0F172A',
            }),
          ],
        })
    ),
    ...(values.kopSub
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 20 },
            children: [
              new TextRun({
                text: values.kopSub,
                bold: true,
                size: 20, // 10pt
                font: 'Times New Roman',
                color: '1E293B',
              }),
            ],
          }),
        ]
      : []),
    ...(values.kopBadanHukum
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 20 },
            children: [
              new TextRun({
                text: values.kopBadanHukum,
                size: 17, // 8.5pt
                font: 'Times New Roman',
                color: '475569',
              }),
            ],
          }),
        ]
      : []),
    ...(values.kopAlamat
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 20 },
            children: [
              new TextRun({
                text: values.kopAlamat,
                size: 18, // 9pt
                font: 'Times New Roman',
                color: '334155',
              }),
            ],
          }),
        ]
      : []),
    ...(values.kopKontak
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 40 },
            children: [
              new TextRun({
                text: values.kopKontak,
                size: 17, // 8.5pt
                font: 'Times New Roman',
                color: '475569',
              }),
            ],
          }),
        ]
      : []),
  ]

  const kopCells: TableCell[] = [
    // Left Logo Cell
    new TableCell({
      width: { size: 15, type: WidthType.PERCENTAGE },
      borders: noBorder,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: logoKiriData
            ? [
                new ImageRun({
                  data: logoKiriData.buffer,
                  transformation: { width: 58, height: 58 },
                  type: logoKiriData.type,
                }),
              ]
            : [
                new TextRun({
                  text: '[LOGO]',
                  bold: true,
                  font: 'Times New Roman',
                }),
              ],
        }),
      ],
    }),
    // Center Text Cell
    new TableCell({
      width: { size: isDoubleLogo ? 70 : 85, type: WidthType.PERCENTAGE },
      borders: noBorder,
      children: kopTextParagraphs,
    }),
  ]

  if (isDoubleLogo) {
    kopCells.push(
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: noBorder,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: logoKananData
              ? [
                  new ImageRun({
                    data: logoKananData.buffer,
                    transformation: { width: 58, height: 58 },
                    type: logoKananData.type,
                  }),
                ]
              : [],
          }),
        ],
      })
    )
  }

  const kopTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    rows: [new TableRow({ children: kopCells })],
  })

  // 3. Document Body Content
  const bodyParagraphs: (Paragraph | Table)[] = []

  // Metadata Table: Nomor, Perihal, Lampiran di kiri vs Tanggal di kanan
  const metadataTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: 'No            : ', font: 'Times New Roman', size: 21, bold: true }),
                  new TextRun({ text: values.nomorSurat || '-', font: 'Times New Roman', size: 21, bold: true }),
                ],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: 'Perihal     : ', font: 'Times New Roman', size: 21, bold: true }),
                  new TextRun({
                    text: values.perihal || '-',
                    font: 'Times New Roman',
                    size: 21,
                    bold: true,
                    underline: { type: UnderlineType.SINGLE },
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: 'Lampiran : ', font: 'Times New Roman', size: 21, bold: true }),
                  new TextRun({ text: values.lampiran || '-', font: 'Times New Roman', size: 21 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${values.tempatSurat || 'Jakarta'}, ${formattedDate}`,
                    font: 'Times New Roman',
                    size: 21,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })

  bodyParagraphs.push(metadataTable)

  // Spacing
  bodyParagraphs.push(new Paragraph({ spacing: { before: 120 } }))

  // Tujuan Surat
  bodyParagraphs.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: 'Kepada Yth,\n', font: 'Times New Roman', size: 22, bold: true }),
        new TextRun({ text: `${values.tujuanKepada || '-'}\n`, font: 'Times New Roman', size: 22, bold: true }),
        new TextRun({ text: values.tujuanDi || 'Di Tempat', font: 'Times New Roman', size: 22, bold: true }),
      ],
    })
  )

  bodyParagraphs.push(new Paragraph({ spacing: { before: 80 } }))

  // Salam Pembuka & Paragraf Pembuka
  bodyParagraphs.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: values.salamPembuka || 'Salam dalam kasih Kristus,',
          font: 'Times New Roman',
          size: 22,
          bold: true,
        }),
      ],
    })
  )

  if (values.paragrafPembuka) {
    bodyParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 80 },
        indent: { firstLine: 400 },
        children: [
          new TextRun({
            text: values.paragrafPembuka,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    )
  }

  // Sub Judul
  if (values.subJudul) {
    bodyParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text: values.subJudul,
            font: 'Times New Roman',
            size: 22,
            bold: true,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
      })
    )
  }

  // Poin-poin Isi
  if (values.poinIsi && values.poinIsi.length > 0) {
    values.poinIsi.forEach((item, idx) => {
      bodyParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 40 },
          indent: { left: 400, hanging: 240 },
          children: [
            new TextRun({
              text: `${idx + 1}. `,
              font: 'Times New Roman',
              size: 22,
              bold: true,
            }),
            new TextRun({
              text: item.text,
              font: 'Times New Roman',
              size: 22,
              bold: item.isBold,
            }),
          ],
        })
      );
    });
  }

  // Paragraf Penutup
  if (values.paragrafPenutup) {
    bodyParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 80, after: 120 },
        indent: { firstLine: 400 },
        children: [
          new TextRun({
            text: values.paragrafPenutup,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    )
  }

  // Tanda Tangan & Stempel Section with proper elegant spacing
  bodyParagraphs.push(
    new Paragraph({
      spacing: { before: 240, after: 60 },
      children: [
        new TextRun({
          text: values.salamPenutup || 'Dalam KasihNya,',
          font: 'Times New Roman',
          size: 22,
          bold: true,
        }),
      ],
    })
  )

  if (values.namaInstansiTtd) {
    bodyParagraphs.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: values.namaInstansiTtd,
            font: 'Times New Roman',
            size: 22,
            bold: true,
          }),
        ],
      })
    )
  } else {
    bodyParagraphs.push(new Paragraph({ spacing: { after: 120 } }))
  }

  // Signatures 2-Column Table
  const sigCells: TableCell[] = [
    // Pejabat 1 (Left Column)
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: noBorder,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: p1.jabatan,
              font: 'Times New Roman',
              size: 21,
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
          children: [
            ...(ttd1Data
              ? [
                  new ImageRun({
                    data: ttd1Data.buffer,
                    transformation: { width: 110, height: 44 },
                    type: ttd1Data.type,
                  }),
                ]
              : [new TextRun({ text: '\n\n' })]),
            ...(stampData && values.posisiStempel !== 'RIGHT'
              ? [
                  new ImageRun({
                    data: stampData.buffer,
                    transformation: { width: 50, height: 50 },
                    type: stampData.type,
                  }),
                ]
              : []),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40 },
          children: [
            new TextRun({
              text: `${p1.nama}${p1.gelar ? `, ${p1.gelar}` : ''}`,
              font: 'Times New Roman',
              size: 21,
              bold: true,
              underline: { type: UnderlineType.SINGLE },
            }),
          ],
        }),
        ...(p1.nomorInduk
          ? [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: p1.nomorInduk,
                    font: 'Times New Roman',
                    size: 18,
                    color: '64748B',
                  }),
                ],
              }),
            ]
          : []),
      ],
    }),
  ]

  if (values.formatTtd === 'DUA_PEJABAT') {
    sigCells.push(
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: noBorder,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: p2.jabatan,
                font: 'Times New Roman',
                size: 21,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [
              ...(ttd2Data
                ? [
                    new ImageRun({
                      data: ttd2Data.buffer,
                      transformation: { width: 110, height: 44 },
                      type: ttd2Data.type,
                    }),
                  ]
                : [new TextRun({ text: '\n\n' })]),
              ...(stampData && values.posisiStempel === 'RIGHT'
                ? [
                    new ImageRun({
                      data: stampData.buffer,
                      transformation: { width: 50, height: 50 },
                      type: stampData.type,
                    }),
                  ]
                : []),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40 },
            children: [
              new TextRun({
                text: `${p2.nama}${p2.gelar ? `, ${p2.gelar}` : ''}`,
                font: 'Times New Roman',
                size: 21,
                bold: true,
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
          }),
          ...(p2.nomorInduk
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: p2.nomorInduk,
                      font: 'Times New Roman',
                      size: 18,
                      color: '64748B',
                    }),
                  ],
                }),
              ]
            : []),
        ],
      })
    )
  }

  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    rows: [new TableRow({ children: sigCells })],
  })

  bodyParagraphs.push(sigTable)

  // 4. Lampiran (Jika Ada)
  if (values.adaLampiran) {
    bodyParagraphs.push(
      new Paragraph({
        pageBreakBefore: true,
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 40 },
        children: [
          new TextRun({
            text: `LAMPIRAN SURAT NO: ${values.nomorSurat || '-'}\n`,
            font: 'Times New Roman',
            size: 18,
            color: '64748B',
            bold: true,
          }),
          new TextRun({
            text: values.judulLampiran || 'Rincian Lampiran Dokumen',
            font: 'Times New Roman',
            size: 24,
            bold: true,
          }),
        ],
      })
    )

    if (values.isiLampiran) {
      bodyParagraphs.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({
              text: values.isiLampiran,
              font: 'Times New Roman',
              size: 21,
            }),
          ],
        })
      )
    }

    if (lampiranData) {
      bodyParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: lampiranData.buffer,
              transformation: { width: 450, height: 260 },
              type: lampiranData.type,
            }),
          ],
        })
      )
    }
  }

  // 5. Assemble True DOCX Document with Header
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in DXA (210mm)
              height: 16838, // A4 height in DXA (297mm)
            },
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
              header: 720,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              kopTable,
              new Paragraph({
                border: {
                  bottom: {
                    style:
                      values.garisKopStyle === 'DOUBLE'
                        ? BorderStyle.DOUBLE
                        : BorderStyle.SINGLE,
                    size: 12,
                    color: values.garisKopColor?.replace('#', '') || '0F172A',
                  },
                },
                spacing: { after: 120 },
              }),
            ],
          }),
        },
        children: bodyParagraphs,
      },
    ],
  })

  // 6. Generate blob and trigger download as .docx
  const blob = await Packer.toBlob(doc)
  const cleanNomor = (values.nomorSurat || 'Surat_Resmi').replace(/[\/\\?%*:|"<>]/g, '_')
  const cleanPerihal = (values.perihal || 'Dokumen').replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 30)
  const filename = `${cleanNomor}_${cleanPerihal}_${new Date().toISOString().split('T')[0]}.docx`

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
