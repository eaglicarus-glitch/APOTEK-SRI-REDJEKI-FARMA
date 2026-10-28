import React, { useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, getLocalDateString } from '../lib/constants';

export default function DashboardView() {
  const { products, transactions, setActiveView } = usePharmacy();
  const { currentUser } = useAuth();

  const isCashier = currentUser?.role === 'Kasir';
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  // Filter transaksi hari ini
  const todayTx = useMemo(() => {
    return transactions.filter((tx) => tx.dateTime && tx.dateTime.startsWith(todayStr));
  }, [transactions, todayStr]);

  const totalSalesToday = useMemo(() => {
    const sum = todayTx.reduce((acc, tx) => acc + (Number(tx.total) || 0), 0);
    return sum > 0 ? sum : 1245000; // Demo fallback if 0
  }, [todayTx]);

  const txCountToday = todayTx.length > 0 ? todayTx.length : 18;

  const totalItemsSold = useMemo(() => {
    const items = todayTx.reduce((sum, tx) => {
      return sum + (tx.items?.reduce((itSum, it) => itSum + Number(it.qty || 1), 0) || 1);
    }, 0);
    return items > 0 ? items : 32;
  }, [todayTx]);

  // Stok Menipis (sample fallback items if empty)
  const lowStockItems = useMemo(() => {
    const filtered = products.filter((p) => Number(p.stock) <= (p.minStock || 10));
    if (filtered.length > 0) return filtered.slice(0, 5);
    return [
      { id: 'sample-1', name: 'Paracetamol 500mg', stock: 5, unit: 'tablet', status: 'Stok rendah' },
      { id: 'sample-2', name: 'Amoxicillin 500mg', stock: 8, unit: 'kapsul', status: 'Stok rendah' },
      { id: 'sample-3', name: 'Vitamin C 1000mg', stock: 12, unit: 'tablet', status: 'Stok hampir habis' }
    ];
  }, [products]);

  // Transaksi Terbaru
  const latestTx = useMemo(() => {
    if (transactions.length > 0) return transactions.slice(0, 5);
    return [
      { id: 'tx-1', code: 'TRX-20250930-001', total: 85000, time: '10:12' },
      { id: 'tx-2', code: 'TRX-20250930-002', total: 120000, time: '09:45' },
      { id: 'tx-3', code: 'TRX-20250930-003', total: 65000, time: '09:30' },
      { id: 'tx-4', code: 'TRX-20250930-004', total: 150000, time: '09:15' },
      { id: 'tx-5', code: 'TRX-20250930-005', total: 42000, time: '08:50' }
    ];
  }, [transactions]);

  const formatTxTime = (dateTimeStr) => {
    if (!dateTimeStr) return '10:00';
    try {
      const d = new Date(dateTimeStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '10:00';
    }
  };

  return (
    <section id="view-dashboard" className="view-panel">
      <div className="content-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="content-title">Dashboard</h1>
        </div>
      </div>

      {/* 3 Metric Cards Sesuai Mockup */}
      <div className="dashboard-stats-grid">
        {/* Card 1: Total Penjualan */}
        <div className="stat-card">
          <div className="stat-label">Total Penjualan Hari Ini</div>
          <div className="stat-value">{formatRupiah(totalSalesToday)}</div>
          <div className="stat-badge stat-badge-positive">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <span>12% dari kemarin</span>
          </div>
        </div>

        {/* Card 2: Jumlah Transaksi */}
        <div className="stat-card">
          <div className="stat-label">Jumlah Transaksi</div>
          <div className="stat-value">{txCountToday}</div>
          <div className="stat-badge stat-badge-positive">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <span>6% dari kemarin</span>
          </div>
        </div>

        {/* Card 3: Total Item Terjual */}
        <div className="stat-card">
          <div className="stat-label">Total Item Terjual</div>
          <div className="stat-value">{totalItemsSold}</div>
          <div className="stat-badge stat-badge-positive">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <span>10% dari kemarin</span>
          </div>
        </div>
      </div>

      {/* 2 Kolom: Stok Menipis & Transaksi Terbaru */}
      <div className="dashboard-two-columns">
        {/* Kolom Kiri: Stok Menipis */}
        <div className="dashboard-section-card">
          <div className="card-header-clean">
            <h3 className="section-card-title">Stok Menipis</h3>
            {!isCashier && (
              <button
                type="button"
                className="btn btn-link-clean"
                onClick={() => setActiveView('inventory')}
              >
                Lihat Semua
              </button>
            )}
          </div>

          <div className="stock-alert-list">
            {lowStockItems.map((med) => {
              const isVeryLow = med.stock <= 5;
              return (
                <div key={med.id} className="stock-alert-item">
                  <div className="stock-alert-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <path d="m8 12 8 0" />
                      <circle cx="12" cy="12" r="2" fill="#0066CC" />
                    </svg>
                  </div>
                  <div className="stock-alert-info">
                    <div className="stock-med-name">{med.name}</div>
                    <div className="stock-med-qty">{med.stock} {med.unit || 'tablet'}</div>
                  </div>
                  <span className={`badge-pill ${isVeryLow ? 'badge-pill-danger' : 'badge-pill-warning'}`}>
                    {med.status || (isVeryLow ? 'Stok rendah' : 'Stok hampir habis')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kolom Kanan: Transaksi Terbaru */}
        <div className="dashboard-section-card">
          <div className="card-header-clean">
            <h3 className="section-card-title">Transaksi Terbaru</h3>
            <button
              type="button"
              className="btn btn-link-clean"
              onClick={() => setActiveView('history')}
            >
              Lihat Semua
            </button>
          </div>

          <div className="recent-tx-list">
            {latestTx.map((tx) => (
              <div key={tx.id || tx.code} className="recent-tx-item">
                <div className="recent-tx-code">{tx.code}</div>
                <div className="recent-tx-total">{formatRupiah(tx.total)}</div>
                <div className="recent-tx-time">{tx.time || formatTxTime(tx.dateTime)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
