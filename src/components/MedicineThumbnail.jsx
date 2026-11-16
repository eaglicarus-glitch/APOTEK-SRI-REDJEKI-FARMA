import React, { useState } from 'react';

/**
 * Komponen thumbnail obat dengan fallback otomatis ke ikon profil default (seperti pada ganjos).
 * Jika foto tidak ada, null, kosong, atau gagal dimuat (broken link / 404),
 * otomatis menampilkan ikon kapsul medis default warna biru (#0066CC) dengan latar #eff6ff.
 */
export default function MedicineThumbnail({ src, alt, size = 18, className = '' }) {
  const [loadError, setLoadError] = useState(false);

  const cleanSrc = typeof src === 'string' ? src.trim() : null;

  // Jika foto obat tidak diberikan atau gagal dimuat (broken image link)
  if (!cleanSrc || loadError) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0066CC"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label={alt || 'Ikon Obat'}
      >
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt || 'Foto Obat'}
      onError={() => setLoadError(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      className={className}
    />
  );
}

