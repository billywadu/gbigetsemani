'use client'

import React from 'react'
import { SuratResmiFormValues } from '@/lib/validations/surat'

interface SuratPreviewSheetProps {
  values: SuratResmiFormValues
  id?: string
}

export function SuratPreviewSheet({ values, id = 'surat-printable-sheet' }: SuratPreviewSheetProps) {
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

  return (
    <div
      id={id}
      className='bg-white text-slate-900 shadow-lg border rounded-sm p-10 w-[210mm] min-w-[210mm] text-[12.5px] leading-relaxed mx-auto select-text print:shadow-none print:border-none print:p-0 print:m-0 print:w-full'
      style={{
        minHeight: '297mm',
        boxSizing: 'border-box',
        fontFamily: '"Times New Roman", Times, "Nimbus Roman No9 L", Georgia, serif',
      }}
    >
      {/* ── 1. KOP SURAT ────────────────────────────────────────── */}
      <div
        className='pb-3 mb-5 flex items-center justify-between gap-4'
        style={{ borderBottom: borderBottomStyle }}
      >
        {/* Logo Kiri (Logo Sinode atau Logo Utama Gereja) */}
        <div className='shrink-0 flex items-center justify-center'>
          {values.logoKiriUrl ? (
            <img
              src={values.logoKiriUrl}
              alt='Logo Kiri'
              className='size-14 sm:size-16 object-contain'
            />
          ) : (
            <div className='size-14 sm:size-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-400'>
              Logo 1
            </div>
          )}
        </div>

        {/* Teks Identitas Kop Surat */}
        <div className='flex-1 text-center px-2'>
          <h1
            className='text-xs sm:text-[13px] font-black uppercase tracking-tight leading-tight'
            style={{ color: values.garisKopColor || '#0f172a' }}
          >
            {values.kopNama.split('\n').map((line, idx) => (
              <React.Fragment key={idx}>
                {line}
                {idx < values.kopNama.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </h1>
          {values.kopSub && (
            <div className='text-[10px] font-extrabold uppercase text-slate-800 mt-0.5 tracking-wide'>
              {values.kopSub}
            </div>
          )}
          {values.kopBadanHukum && (
            <div className='text-[8px] text-slate-600 font-medium leading-tight mt-0.5'>
              {values.kopBadanHukum}
            </div>
          )}
          {values.kopAlamat && (
            <div className='text-[8.5px] text-slate-700 font-normal mt-0.5'>
              {values.kopAlamat}
            </div>
          )}
          {values.kopKontak && (
            <div className='text-[8px] text-slate-600 font-mono mt-0.5'>
              {values.kopKontak}
            </div>
          )}
        </div>

        {/* Logo Kanan (Opsional untuk Mode Dua Logo) */}
        {isDoubleLogo && (
          <div className='shrink-0 flex items-center justify-center'>
            {values.logoKananUrl ? (
              <img
                src={values.logoKananUrl}
                alt='Logo Kanan'
                className='size-14 sm:size-16 object-contain'
              />
            ) : (
              <div className='size-14 sm:size-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-400'>
                Logo 2
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 2. METADATA SURAT (NOMOR, PERIHAL, TANGGAL) ─────────── */}
      <div className='flex items-start justify-between gap-4 mb-4 text-[10.5px]'>
        <table className='border-collapse text-[10.5px]'>
          <tbody>
            <tr>
              <td className='pr-3 font-semibold text-slate-700 w-16'>No</td>
              <td className='pr-1 font-semibold'>:</td>
              <td className='font-mono font-bold text-slate-900'>
                {values.nomorSurat || '___/___/___/___/____'}
              </td>
            </tr>
            <tr>
              <td className='pr-3 font-semibold text-slate-700'>Perihal</td>
              <td className='pr-1 font-semibold'>:</td>
              <td className='font-extrabold uppercase text-slate-900 underline underline-offset-2'>
                {values.perihal || '-'}
              </td>
            </tr>
            <tr>
              <td className='pr-3 font-semibold text-slate-700'>Lampiran</td>
              <td className='pr-1 font-semibold'>:</td>
              <td className='text-slate-800'>{values.lampiran || '-'}</td>
            </tr>
          </tbody>
        </table>

        <div className='text-right text-[10.5px] font-medium text-slate-800'>
          {values.tempatSurat || 'Jakarta'}, {formattedDate}
        </div>
      </div>

      {/* ── 3. TUJUAN SURAT (KEPADA YTH) ────────────────────────── */}
      <div className='mb-4 text-[12px]'>
        <div className='font-semibold text-slate-700 mb-0.5'>Kepada Yth,</div>
        <div className='font-bold text-slate-900 whitespace-pre-line'>
          {values.tujuanKepada || '-'}
        </div>
        <div className='font-semibold text-slate-800 mt-0.5'>
          {values.tujuanDi || 'Di Tempat'}
        </div>
      </div>

      {/* ── 4. SALAM PEMBUKA & PARAGRAF PEMBUKA ─────────────────── */}
      <div className='mb-3 text-[10.5px] leading-relaxed'>
        <div className='font-semibold text-slate-800 mb-1.5'>
          {values.salamPembuka || 'Salam dalam kasih Kristus,'}
        </div>
        <div className='text-slate-800 text-justify whitespace-pre-line'>
          {values.paragrafPembuka}
        </div>
      </div>

      {/* ── 5. SUB-JUDUL POKOK & POIN-POIN ISI ──────────────────── */}
      {values.subJudul && (
        <div className='text-center my-3'>
          <span className='font-black uppercase text-[11px] tracking-wide border-b-2 border-slate-900 pb-0.5'>
            {values.subJudul}
          </span>
        </div>
      )}

      {values.poinIsi && values.poinIsi.length > 0 && (
        <div className='space-y-1.5 mb-3 text-[10.5px] pl-1'>
          {values.poinIsi.map((item, idx) => (
            <div key={item.id || idx} className='flex items-start gap-2 text-justify'>
              <span className='font-bold shrink-0 w-4 text-right'>{idx + 1}.</span>
              <span
                className={`flex-1 ${
                  item.isBold ? 'font-bold text-slate-900' : 'text-slate-800'
                }`}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 6. PARAGRAF PENUTUP ─────────────────────────────────── */}
      <div className='mb-6 text-[10.5px] leading-relaxed text-justify whitespace-pre-line text-slate-800'>
        {values.paragrafPenutup}
      </div>

      {/* ── 7. TANDA TANGAN PEJABAT & STEMPEL RESMI ──────────────── */}
      <div className='mt-6 break-inside-avoid'>
        <div className='mb-2 text-[10.5px]'>
          <div className='font-semibold text-slate-800'>{values.salamPenutup}</div>
          {values.namaInstansiTtd && (
            <div className='font-bold uppercase text-slate-900 mt-0.5'>
              {values.namaInstansiTtd}
            </div>
          )}
        </div>

        {/* Kotak Pejabat Berdampingan */}
        <div className='flex items-center justify-between gap-6 pt-2 relative'>
          {/* Stempel Resmi Gereja di Layer Belakang (Z-Index 1) */}
          {values.tampilkanStempel && values.stempelUrl && (
            <div
              className={`absolute pointer-events-none z-1 ${
                values.posisiStempel === 'LEFT'
                  ? 'left-10'
                  : values.posisiStempel === 'RIGHT'
                  ? 'right-10'
                  : 'left-1/2 -translate-x-1/2'
              }`}
              style={{
                top: '5px',
                opacity: 0.85,
                transform:
                  values.posisiStempel === 'CENTER_OVERLAP'
                    ? 'translateX(-50%) rotate(-6deg)'
                    : 'rotate(-6deg)',
              }}
            >
              <img
                src={values.stempelUrl}
                alt='Stempel Resmi'
                className='h-16 sm:h-20 object-contain'
              />
            </div>
          )}

          {/* Pejabat 1 (Kiri / Ketua) */}
          {values.signatories && values.signatories[0] && (
            <div className='text-center w-52 relative z-2'>
              <div className='font-bold text-[10.5px] text-slate-800 mb-1'>
                {values.signatories[0].jabatan}
              </div>
              <div className='h-12 flex items-center justify-center my-1'>
                {values.signatories[0].ttdUrl ? (
                  <img
                    src={values.signatories[0].ttdUrl}
                    alt='TTD'
                    className='max-h-12 max-w-30 object-contain relative z-2'
                  />
                ) : (
                  <div className='h-12'></div>
                )}
              </div>
              <div className='font-black text-slate-900 border-b border-slate-900 pb-0.5 uppercase'>
                {values.signatories[0].nama}
                {values.signatories[0].gelar ? `, ${values.signatories[0].gelar}` : ''}
              </div>
              {values.signatories[0].nomorInduk && (
                <div className='text-[8.5px] text-slate-600 font-mono mt-0.5'>
                  {values.signatories[0].nomorInduk}
                </div>
              )}
            </div>
          )}

          {/* Pejabat 2 (Kanan / Sekretaris) */}
          {values.formatTtd === 'DUA_PEJABAT' && values.signatories && values.signatories[1] && (
            <div className='text-center w-52 relative z-2'>
              <div className='font-bold text-[10.5px] text-slate-800 mb-1'>
                {values.signatories[1].jabatan}
              </div>
              <div className='h-12 flex items-center justify-center my-1'>
                {values.signatories[1].ttdUrl ? (
                  <img
                    src={values.signatories[1].ttdUrl}
                    alt='TTD'
                    className='max-h-12 max-w-30 object-contain relative z-2'
                  />
                ) : (
                  <div className='h-12'></div>
                )}
              </div>
              <div className='font-black text-slate-900 border-b border-slate-900 pb-0.5 uppercase'>
                {values.signatories[1].nama}
                {values.signatories[1].gelar ? `, ${values.signatories[1].gelar}` : ''}
              </div>
              {values.signatories[1].nomorInduk && (
                <div className='text-[8.5px] text-slate-600 font-mono mt-0.5'>
                  {values.signatories[1].nomorInduk}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 8. LAMPIRAN TAMBAHAN (LEMBAR KE-2 OPSIONAL) ─────────── */}
      {values.adaLampiran && (
        <div className='mt-10 pt-6 border-t-2 border-dashed border-slate-300 break-before-page'>
          <div className='text-center mb-4'>
            <div className='text-[9px] font-mono text-slate-500 uppercase tracking-widest'>
              LAMPIRAN SURAT NO: {values.nomorSurat || '-'}
            </div>
            <div className='font-black text-xs uppercase mt-0.5 text-slate-900'>
              {values.judulLampiran || 'Rincian Lampiran Dokumen'}
            </div>
          </div>
          {values.isiLampiran && (
            <div className='text-[10px] leading-relaxed text-slate-800 whitespace-pre-line bg-slate-50 p-4 border rounded-md'>
              {values.isiLampiran}
            </div>
          )}
          {values.gambarLampiranUrl && (
            <div className='mt-3 text-center'>
              <img
                src={values.gambarLampiranUrl}
                alt='Gambar Lampiran'
                className='max-h-64 mx-auto rounded-md border shadow-xs object-contain'
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
