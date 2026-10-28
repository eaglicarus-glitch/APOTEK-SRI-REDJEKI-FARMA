import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Header({ onToggleSidebar }) {
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { products, setActiveView, setGlobalSearch } = usePharmacy();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Format Waktu Indonesia persis seperti di mockup: "Selasa, 30 Sep 2025  10:24"
  useEffect(() => {
    const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthsIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const updateClock = () => {
      const now = new Date();
      const day = daysIndo[now.getDay()];
      const date = now.getDate();
      const month = monthsIndo[now.getMonth()];
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setCurrentDateTime(`${day}, ${date} ${month} ${year}  ${hours}:${mins}`);
    };

    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, []);

  const lowStockCount = products.filter((p) => Number(p.stock) <= (p.minStock || 10)).length;

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      const q = searchQuery.trim();
      if (q) {
        setGlobalSearch(q);
        if (q.toUpperCase().startsWith('TRX') || q.toUpperCase().startsWith('INV')) {
          setActiveView('history');
        } else {
          setActiveView('pos');
        }
      }
    }
  };

  const handleNotificationClick = () => {
    if (lowStockCount > 0) {
      showToast(`Pemberitahuan: Terdapat ${lowStockCount} jenis obat dengan stok menipis!`, 'warning');
      if (currentUser?.role !== 'Kasir') {
        setActiveView('inventory');
      }
    } else {
      showToast('Semua stok obat dan sistem kasir berjalan normal.', 'info');
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          id="btn-toggle-sidebar"
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Buka menu navigasi"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="header-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            id="global-search"
            placeholder="Cari obat, nama pelanggan, atau nomor transaksi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchSubmit}
          />
        </div>
      </div>

      <div className="header-right">
        <div className="datetime-indicator" id="header-datetime">
          {currentDateTime}
        </div>

        <button
          className="notification-btn"
          id="btn-header-bell"
          onClick={handleNotificationClick}
          aria-label="Pemberitahuan"
          title={lowStockCount > 0 ? `${lowStockCount} jenis obat stok menipis` : 'Semua stok aman'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {lowStockCount > 0 && <span className="notification-badge" />}
        </button>

        {/* User Profile Pill in Header */}
        <div className="header-user-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--light-emerald-bg, #ecfdf5)', color: 'var(--primary-emerald, #059669)', border: '1px solid var(--emerald-border, #a7f3d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px' }}>
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="header-user-info" style={{ lineHeight: '1.2' }}>
            <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--primary-text)' }}>
              {currentUser?.name || 'Pengguna'}
            </div>
            <div style={{ fontSize: '11px', color: currentUser?.role === 'Kasir' ? 'var(--info-text, #0369a1)' : 'var(--primary-emerald, #059669)', fontWeight: '600' }}>
              {currentUser?.role || 'Kasir'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
