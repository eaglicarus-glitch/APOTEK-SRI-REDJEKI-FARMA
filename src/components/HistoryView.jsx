import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { formatRupiah, formatDateTime, getLocalDateString } from '../lib/constants';
import ReceiptModal from './ReceiptModal';

export default function HistoryView() {
  const { transactions, globalSearch } = usePharmacy();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Selected Transaction for Detail Modal / Receipt
  const [selectedTx, setSelectedTx] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Sync with globalSearch if present
  React.useEffect(() => {
    if (globalSearch) {
      setSearchQuery(globalSearch);
      setCurrentPage(1);
    }
  }, [globalSearch]);

  // Quick Date Filter Presets
  const applyDatePreset = (preset) => {
    const now = new Date();
    setCurrentPage(1);
    if (preset === 'today') {
      const today = getLocalDateString(now);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === '7days') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      setStartDate(getLocalDateString(past7));
      setEndDate(getLocalDateString(now));
    } else if (preset === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(getLocalDateString(startOfMonth));
      setEndDate(getLocalDateString(now));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      let matchDate = true;
      if (startDate) {
        matchDate = matchDate && tx.dateTime >= `${startDate}T00:00:00`;
      }
      if (endDate) {
        matchDate = matchDate && tx.dateTime <= `${endDate}T23:59:59`;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        tx.code.toLowerCase().includes(q) ||
        (tx.customer && tx.customer.toLowerCase().includes(q)) ||
        (tx.cashier && tx.cashier.toLowerCase().includes(q));

      return matchDate && matchQuery;
    });
  }, [transactions, startDate, endDate, searchQuery]);

  // Total omset terfilter
  const totalFilteredRevenue = useMemo(() => {
    return filtered.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pageTransactions = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenDetail = (tx) => {
    setSelectedTx(tx);
    setIsReceiptOpen(true);
  };

  return (
    <section id="view-history" className="view-panel">
      {/* Header */}
      <div className="content-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="content-title">Riwayat Transaksi Penjualan</h1>
          <p style={{ fontSize: '13px', color: 'var(--secondary-text)', marginTop: '2px' }}>
            Arsip faktur kasir, rincian obat terjual, dan cetak ulang nota resmi
          </p>
        </div>
      </div>

      {/* KPI Ringkasan Transaksi Terfilter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
        <div className="stat-card" style={{ padding: '14px 18px' }}>
          <span className="stat-label">Total Transaksi Ditemukan</span>
          <div className="stat-value" style={{ fontSize: '22px', marginTop: '4px' }}>{filtered.length}</div>
          <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Faktur penjualan terdata</span>
        </div>
        <div className="stat-card" style={{ padding: '14px 18px' }}>
          <span className="stat-label">Akumulasi Omset Terfilter</span>
          <div className="stat-value" style={{ fontSize: '22px', marginTop: '4px', color: 'var(--primary-emerald, #059669)' }}>
            {formatRupiah(totalFilteredRevenue)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Nilai tagihan bersih</span>
        </div>
      </div>

      {/* Filter Bar Lengkap dengan Preset Tanggal */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            <div className="filter-input-group">
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                Tanggal Mulai
              </label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="filter-input-group">
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                Tanggal Selesai
              </label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => applyDatePreset('today')}
              >
                Hari Ini
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => applyDatePreset('7days')}
              >
                7 Hari
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => applyDatePreset('month')}
              >
                Bulan Ini
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => applyDatePreset('all')}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569' }}
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Pencarian Faktur / Kasir */}
          <div style={{ minWidth: '240px', flex: '1', maxWidth: '360px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
              Pencarian
            </label>
            <div className="pos-search-box" style={{ margin: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="pos-search-input"
                placeholder="Cari kode invoice atau kasir..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Riwayat Transaksi */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th>No. Invoice</th>
                <th>Waktu Transaksi</th>
                <th>Kasir</th>
                <th>Item Belanja</th>
                <th>Metode</th>
                <th style={{ textAlign: 'right' }}>Total Tagihan</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageTransactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-empty-row">
                    <div className="empty-state-container">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <p style={{ marginTop: '8px', fontWeight: '600', color: 'var(--primary-text)' }}>Tidak Ada Transaksi Ditemukan</p>
                      <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                        Coba sesuaikan tanggal filter atau kata kunci pencarian Anda.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageTransactions.map((tx, idx) => (
                  <tr key={tx.id || tx.code}>
                    <td style={{ color: 'var(--muted-text)' }}>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: 'var(--primary-text)' }}>
                        {tx.code}
                      </span>
                    </td>
                    <td style={{ color: 'var(--secondary-text)', fontSize: '12px' }}>
                      {formatDateTime(tx.dateTime)}
                    </td>
                    <td style={{ color: 'var(--primary-text)' }}>
                      {tx.cashier || 'Kasir'}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                        {tx.items && tx.items.length > 0 ? (
                          <span>
                            {tx.items[0].name} {tx.items.length > 1 && `+${tx.items.length - 1} lainnya`}
                          </span>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '11px' }}>
                        {tx.paymentMethod || 'Tunai'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--primary-emerald, #059669)' }}>
                      {formatRupiah(tx.total)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => handleOpenDetail(tx)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 6 2 18 2 18 9" />
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                          <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        Nota
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <div className="pagination-info">
              Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filtered.length)} dari {filtered.length} transaksi
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ← Sebelumnya
              </button>
              <span style={{ fontSize: '12px', fontWeight: '600', padding: '0 8px', color: 'var(--primary-text)' }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Cetak Nota / Struk */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        transaction={selectedTx}
        onClose={() => setIsReceiptOpen(false)}
      />
    </section>
  );
}
