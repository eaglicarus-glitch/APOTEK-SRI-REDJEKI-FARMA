import React from 'react';

export default function ApotekLogo({ size = 36, showText = false, textColor = '#ffffff', tagline = false }) {
  return (
    <div className="apotek-logo-component" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="logoGreen" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10B981" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="logoBlue" x1="12" y1="12" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0284C7" />
            <stop offset="1" stopColor="#0066CC" />
          </linearGradient>
          <filter id="logoShadow" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0F2238" floodOpacity="0.08" />
          </filter>
        </defs>
        <g filter="url(#logoShadow)">
          {/* Rounded Medical Cross Base */}
          <rect x="19" y="8" width="10" height="32" rx="5" fill="url(#logoGreen)" />
          <rect x="8" y="19" width="32" height="10" rx="5" fill="url(#logoGreen)" />
          {/* Elegant Circular Care Orbit */}
          <path
            d="M 12 36 A 18 18 0 1 0 38 12"
            fill="none"
            stroke="url(#logoBlue)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Center Core Accent */}
          <circle cx="24" cy="24" r="2.5" fill="#FFFFFF" fillOpacity="0.9" />
        </g>
      </svg>

      {showText && (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ color: '#0066CC', fontWeight: 800, fontSize: size > 40 ? '12px' : '10px', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
            APOTEK
          </div>
          <div style={{ color: textColor, fontWeight: 700, fontSize: size > 40 ? '17px' : '14px', letterSpacing: '0.3px' }}>
            SRI REDJEKI FARMA
          </div>
          {tagline && (
            <div style={{ color: '#64748B', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
              Sehat Bersama, Hidup Lebih Baik
            </div>
          )}
        </div>
      )}
    </div>
  );
}

