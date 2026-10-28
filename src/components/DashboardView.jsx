import React, { useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, getLocalDateString } from '../lib/constants';

export default function DashboardView() {
  const { products, transactions, setActiveView } = usePharmacy();
  const { currentUser } = useAuth();

  const isCashier = currentUser?.role === 'Kasir';
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  // Filter transaksi hari ini (100% data nyata dari database)
  const todayTx = useMemo(() => {
    return transactions.filter((tx) => tx.dateTime && tx.dateTime.startsWith(todayStr));
  }, [transactions, todayStr]);

  const totalSalesToday = useMemo(() => {
    return todayTx.reduce((acc, tx) => acc + (Number(tx.total) || 0), 0);
  }, [todayTx]);

  const txCountToday = todayTx.length;

  const totalItemsSoldToday = useMemo(() => {
    return todayTx.reduce((sum, tx) => {
      return sum + (tx.items?.reduce((itSum, it) => itSum + Number(it.qty || 1), 0) || 0);
    }, 0);
  }, [todayTx]);

  // Obat dengan stok kritis / menipis (data aktual)
  const lowStockItems = useMemo(() => {
    return products.filter((p) => Number(p.stock) <= (p.minStock || 10));
  }, [products]);

  // Transaksi terbaru (5 transaksi terakhir nyata)
  const latestTx = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  const formatTxTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    try {
      const d = new Date(dateTimeStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '-';
    }
  };

  return (
    <section id="view-dashboard" className="view-panel">
      {/* Header Halaman */}
      <div className="content-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="content-title">Dashboard {isCashier ? 'Kasir' : 'Apoteker & Manajemen'}</h1>
          <p style={{ fontSize: '13px', color: 'var(--secondary-text)', marginTop: '4px' }}>
            {isCashier
              ? `Selamat bertugas, ${currentUser?.name || 'Kasir'}. Pantau penjualan harian Anda.`
              : `Ikhtisar operasional, penjualan harian, dan ketersediaan stok fisik Apotek Sri Redjeki Farma.`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveView('pos')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Buka Kasir Penjualan (POS)
          </button>
        </div>
      </div>

      {/* Grid Kartu Metrik Utama (Data Nyata) */}
      <div className="dashboard-stats-grid">
        {/* Card 1: Total Penjualan Hari Ini */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Penjualan Hari Ini</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--light-emerald-bg, #ecfdf5)', color: 'var(--primary-emerald, #059669)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{formatRupiah(totalSalesToday)}</div>
          <div className="stat-footer-text">
            {txCountToday > 0 ? (
              <span style={{ color: 'var(--success-text, #15803d)', fontWeight: '600' }}>
                Dari {txCountToday} transaksi tercatat hari ini
              </span>
            ) : (
              <span style={{ color: 'var(--muted-text, #94a3b8)' }}>
                Belum ada transaksi pada hari ini
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Jumlah Transaksi */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Jumlah Transaksi Hari Ini</span>
            <div className="stat-icon-wrapper" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{txCountToday}</div>
          <div className="stat-footer-text">
            <span style={{ color: 'var(--secondary-text)' }}>
              {todayStr}
            </span>
          </div>
        </div>

        {/* Card 3: Total Obat Terjual */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Obat Terjual Hari Ini</span>
            <div className="stat-icon-wrapper" style={{ background: '#fef3c7', color: '#b45309' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                <path d="m8.5 8.5 7 7" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{totalItemsSoldToday} <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--secondary-text)' }}>item</span></div>
          <div className="stat-footer-text">
            <span style={{ color: 'var(--secondary-text)' }}>
              Total kuantitas obat keluar
            </span>
          </div>
        </div>

        {/* Card 4 (Khusus Owner/Apoteker): Peringatan Stok Menipis */}
        {!isCashier && (
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-label">Obat Stok Menipis</span>
              <div
                className="stat-icon-wrapper"
                style={{
                  background: lowStockItems.length > 0 ? 'var(--danger-bg, #fee2e2)' : 'var(--success-bg, #dcfce7)',
                  color: lowStockItems.length > 0 ? 'var(--danger-text, #b91c1c)' : 'var(--success-text, #15803d)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>
            <div className="stat-value" style={{ color: lowStockItems.length > 0 ? 'var(--danger, #ef4444)' : 'inherit' }}>
              {lowStockItems.length}
            </div>
            <div className="stat-footer-text">
              {lowStockItems.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveView('inventory')}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--danger-text)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Lihat & restok {lowStockItems.length} jenis obat →
                </button>
              ) : (
                <span style={{ color: 'var(--success-text)' }}>Semua stok obat aman</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Konten Khusus Kasir: Quick Action & Transaksi Shift Hari Ini */}
      {isCashier && (
        <div style={{ marginTop: '24px' }}>
          <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #09201a 0%, #064e3b 100%)', color: '#ffffff', borderRadius: 'var(--radius-lg)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#a7f3d0', border: '1px solid rgba(16, 185, 129, 0.4)', marginBottom: '10px' }}>
                  Mesin Kasir Siap Melayani
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '6px' }}>
                  Layanan Kasir Apotek Sri Redjeki Farma
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '520px', margin: 0 }}>
                  Proses penjualan obat cepat, cetak struk nota belanja, dan pencatatan transaksi otomatis terhubung ke sistem.
                </p>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => setActiveView('pos')}
                style={{ background: 'var(--primary-emerald, #059669)', color: '#ffffff', padding: '12px 24px', fontWeight: '700', fontSize: '14px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)' }}
              >
                Mulai Transaksi Penjualan Baru →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2 Kolom Operasional: Stok Menipis & Transaksi Terbaru (Khusus Owner / Apoteker) */}
      {!isCashier ? (
        <div className="dashboard-content-grid" style={{ marginTop: '24px' }}>
          {/* Panel Kiri: Peringatan Stok Menipis */}
          <div className="card dashboard-table-card">
            <div className="card-header-clean">
              <div>
                <h3 className="card-clean-title">Obat Perlu Restok</h3>
                <p className="card-clean-subtitle">Daftar obat dengan stok fisik mencapai batas minimum</p>
              </div>
              <button
                type="button"
                className="btn-link"
                onClick={() => setActiveView('inventory')}
              >
                Ke Inventaris
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama Obat</th>
                    <th style={{ textAlign: 'center' }}>Sisa Stok</th>
                    <th style={{ textAlign: 'center' }}>Min. Stok</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="table-empty-row">
                        <div className="empty-state-container">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                          <p style={{ marginTop: '8px', fontWeight: '600', color: 'var(--primary-text)' }}>Semua Stok Aman</p>
                          <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>Seluruh obat memiliki persediaan mencukupi.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    lowStockItems.slice(0, 5).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--primary-text)' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>{item.code} • {item.category}</div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: item.stock === 0 ? 'var(--danger)' : 'var(--warning-text)' }}>
                          {item.stock} {item.unit}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--secondary-text)' }}>
                          {item.minStock || 10} {item.unit}
                        </td>
                        <td>
                          <span className={`badge ${item.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                            {item.stock === 0 ? 'Habis' : 'Stok Menipis'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setActiveView('inventory')}
                            title="Restok obat ini"
                          >
                            Restok
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel Kanan: Transaksi Terbaru */}
          <div className="card dashboard-table-card">
            <div className="card-header-clean">
              <div>
                <h3 className="card-clean-title">Transaksi Penjualan Terbaru</h3>
                <p className="card-clean-subtitle">5 transaksi terakhir yang tercatat di sistem</p>
              </div>
              <button
                type="button"
                className="btn-link"
                onClick={() => setActiveView('history')}
              >
                Lihat Semua
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Jam</th>
                    <th>Metode</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {latestTx.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="table-empty-row">
                        <div className="empty-state-container">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <p style={{ marginTop: '8px', fontWeight: '600', color: 'var(--primary-text)' }}>Belum Ada Transaksi</p>
                          <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>Transaksi yang dibuat kasir akan muncul di sini.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    latestTx.map((tx) => (
                      <tr key={tx.id || tx.code}>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--primary-text)' }}>{tx.code}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>Kasir: {tx.cashier || 'Kasir'}</div>
                        </td>
                        <td style={{ color: 'var(--secondary-text)', fontSize: '12px' }}>
                          {formatTxTime(tx.dateTime)}
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: '11px' }}>
                            {tx.paymentMethod || 'Tunai'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--primary-emerald, #059669)' }}>
                          {formatRupiah(tx.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Jika Kasir: Tampilkan tabel riwayat transaksi kasir hari ini */
        <div className="card dashboard-table-card" style={{ marginTop: '16px' }}>
          <div className="card-header-clean">
            <div>
              <h3 className="card-clean-title">Aktivitas Transaksi Kasir Hari Ini</h3>
              <p className="card-clean-subtitle">Daftar transaksi yang diproses pada shift hari ini</p>
            </div>
            <button
              type="button"
              className="btn-link"
              onClick={() => setActiveView('history')}
            >
              Lihat Riwayat Lengkap
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Jam</th>
                  <th>Item Belanja</th>
                  <th>Metode</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {todayTx.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="table-empty-row">
                      <div className="empty-state-container">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p style={{ marginTop: '8px', fontWeight: '600', color: 'var(--primary-text)' }}>Belum Ada Transaksi Kasir Hari Ini</p>
                        <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>Silakan buka menu Penjualan untuk melayani pembelian.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  todayTx.slice(0, 8).map((tx) => (
                    <tr key={tx.id || tx.code}>
                      <td style={{ fontWeight: '600', color: 'var(--primary-text)' }}>{tx.code}</td>
                      <td style={{ color: 'var(--secondary-text)' }}>{formatTxTime(tx.dateTime)}</td>
                      <td style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                        {tx.items ? `${tx.items.length} jenis obat` : '-'}
                      </td>
                      <td>
                        <span className="badge badge-info">{tx.paymentMethod || 'Tunai'}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--primary-emerald, #059669)' }}>
                        {formatRupiah(tx.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
