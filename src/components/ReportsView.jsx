import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah, formatDateTime, getLocalDateString } from '../lib/constants';

export default function ReportsView() {
  const { transactions } = usePharmacy();
  const { showToast } = useToast();
  const [period, setPeriod] = useState('today'); // 'today' | 'week' | 'month' | 'all'

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  // Filter transaksi berdasarkan periode
  const filteredTx = useMemo(() => {
    const now = new Date();
    if (period === 'today') {
      return transactions.filter((tx) => tx.dateTime && tx.dateTime.startsWith(todayStr));
    } else if (period === 'week') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      const past7Str = getLocalDateString(past7);
      return transactions.filter((tx) => tx.dateTime && tx.dateTime >= `${past7Str}T00:00:00`);
    } else if (period === 'month') {
      const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return transactions.filter((tx) => tx.dateTime && tx.dateTime.startsWith(monthPrefix));
    }
    return transactions;
  }, [transactions, period, todayStr]);

  // Metrik Penjualan
  const totalRevenue = filteredTx.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
  const totalTransactions = filteredTx.length;
  const totalItemsSold = filteredTx.reduce((sum, tx) => {
    return sum + (tx.items ? tx.items.reduce((s, it) => s + (Number(it.qty) || 0), 0) : 0);
  }, 0);
  const totalDiscount = filteredTx.reduce((sum, tx) => sum + (Number(tx.discount) || 0), 0);
  const avgBasket = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  // Analisis Obat Terlaris
  const topSellingList = useMemo(() => {
    const itemMap = {};
    filteredTx.forEach((tx) => {
      if (tx.items) {
        tx.items.forEach((it) => {
          const key = it.code || it.name;
          if (!itemMap[key]) {
            itemMap[key] = { name: it.name, unit: it.unit || 'Strip', qty: 0, revenue: 0 };
          }
          itemMap[key].qty += Number(it.qty) || 0;
          itemMap[key].revenue += Number(it.subtotal) || 0;
        });
      }
    });

    return Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [filteredTx]);

  // Distribusi Metode Pembayaran
  const paymentBreakdown = useMemo(() => {
    const counts = { Tunai: 0, Debit: 0, QRIS: 0 };
    filteredTx.forEach((tx) => {
      const method = tx.paymentMethod || 'Tunai';
      if (counts[method] !== undefined) {
        counts[method] += Number(tx.total) || 0;
      } else {
        counts.Tunai += Number(tx.total) || 0;
      }
    });
    return counts;
  }, [filteredTx]);

  const paymentSum = (paymentBreakdown.Tunai + paymentBreakdown.Debit + paymentBreakdown.QRIS) || 1;

  // Tren Penjualan 7 Hari Terakhir
  const last7DaysData = useMemo(() => {
    const daysIndo = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = getLocalDateString(d);
      const dayLabel = daysIndo[d.getDay()];
      const daySales = transactions
        .filter((tx) => tx.dateTime && tx.dateTime.startsWith(dStr))
        .reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
      days.push({ date: dStr, label: dayLabel, sales: daySales });
    }
    return days;
  }, [transactions]);

  // Ekspor CSV
  const handleExportCSV = () => {
    if (filteredTx.length === 0) {
      showToast('Tidak ada data transaksi untuk diekspor!', 'warning');
      return;
    }

    const headers = ['Kode Transaksi', 'Tanggal', 'Pelanggan', 'Metode Pembayaran', 'Total (Rp)', 'Kasir', 'Item Detail'];
    const rows = filteredTx.map((tx) => {
      const itemsStr = tx.items ? tx.items.map((it) => `${it.name} x${it.qty}`).join('; ') : '';
      return [
        `"${tx.code}"`,
        `"${formatDateTime(tx.dateTime)}"`,
        `"${(tx.customer || '').replace(/"/g, '""')}"`,
        `"${tx.paymentMethod}"`,
        tx.total,
        `"${tx.cashier || ''}"`,
        `"${itemsStr.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Apotek_Sri_Redjeki_${period}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Laporan CSV berhasil diunduh.', 'success');
  };

  return (
    <section id="view-reports" className="view-panel">
      {/* Header Halaman */}
      <div className="content-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 className="content-title">Laporan Penjualan &amp; Keuangan</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExportCSV}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Ekspor CSV</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Periode Filter Pills */}
      <div className="category-pills-bar" style={{ marginBottom: '18px' }}>
        <button
          type="button"
          className={`category-pill ${period === 'today' ? 'active' : ''}`}
          onClick={() => setPeriod('today')}
        >
          Hari Ini
        </button>
        <button
          type="button"
          className={`category-pill ${period === 'week' ? 'active' : ''}`}
          onClick={() => setPeriod('week')}
        >
          7 Hari Terakhir
        </button>
        <button
          type="button"
          className={`category-pill ${period === 'month' ? 'active' : ''}`}
          onClick={() => setPeriod('month')}
        >
          Bulan Ini
        </button>
        <button
          type="button"
          className={`category-pill ${period === 'all' ? 'active' : ''}`}
          onClick={() => setPeriod('all')}
        >
          Semua Riwayat
        </button>
      </div>

      {/* Metrics Cards Grid (4 Kolom Sesuai Desain Modern) */}
      <div className="dashboard-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Omzet Penjualan</div>
          <div className="stat-value" style={{ color: 'var(--primary-blue)' }}>{formatRupiah(totalRevenue)}</div>
          <div className="stat-badge stat-badge-positive">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <span>{totalTransactions} Transaksi</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Jumlah Transaksi</div>
          <div className="stat-value">{totalTransactions}</div>
          <div className="stat-badge stat-badge-positive">
            <span>Selesai diproses</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Item Terjual</div>
          <div className="stat-value">{totalItemsSold}</div>
          <div className="stat-badge stat-badge-positive">
            <span>Unit obat</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Potongan Diskon</div>
          <div className="stat-value text-danger">{formatRupiah(totalDiscount)}</div>
          <div className="stat-badge" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
            <span>Rata-rata: {formatRupiah(avgBasket)} / trx</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics 2-Kolom: Tren Penjualan & Distribusi Metode Bayar */}
      <div className="dashboard-two-columns" style={{ marginBottom: '20px' }}>
        {/* Kolom Kiri: Tren Penjualan 7 Hari Terakhir */}
        <div className="dashboard-section-card">
          <div className="card-header-clean">
            <h3 className="section-card-title">Tren Penjualan 7 Hari Terakhir</h3>
          </div>
          <div style={{ width: '100%', height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(() => {
              const maxSale = Math.max(...last7DaysData.map((d) => d.sales), 100000);
              const chartHeight = 140;
              const barWidth = 32;
              const gap = 20;
              const totalWidth = 7 * barWidth + 6 * gap;

              return (
                <svg viewBox={`0 0 ${totalWidth} 190`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  {last7DaysData.map((day, idx) => {
                    const x = idx * (barWidth + gap);
                    const h = Math.max(8, Math.round((day.sales / maxSale) * chartHeight));
                    const y = 155 - h;

                    return (
                      <g key={day.date} className="chart-bar-group">
                        <title>{`${day.label} (${day.date}): ${formatRupiah(day.sales)}`}</title>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={h}
                          rx={5}
                          fill={day.sales > 0 ? '#0066CC' : '#E2E8F0'}
                          style={{ transition: 'all 0.3s ease' }}
                        />
                        <text
                          x={x + barWidth / 2}
                          y="175"
                          textAnchor="middle"
                          fill="#64748B"
                          fontSize="11"
                          fontWeight="500"
                        >
                          {day.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>
        </div>

        {/* Kolom Kanan: Distribusi Metode Pembayaran */}
        <div className="dashboard-section-card">
          <div className="card-header-clean">
            <h3 className="section-card-title">Distribusi Metode Pembayaran</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
            {[
              { label: 'Tunai (Cash)', count: paymentBreakdown.Tunai, color: '#0066CC' },
              { label: 'Debit Card', count: paymentBreakdown.Debit, color: '#10B981' },
              { label: 'QRIS', count: paymentBreakdown.QRIS, color: '#F59E0B' }
            ].map((m) => {
              const pct = Math.round((m.count / paymentSum) * 100);
              return (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '600', color: '#1E293B' }}>{m.label}</span>
                    <span style={{ color: '#64748B' }}>
                      {formatRupiah(m.count)} ({pct}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: m.color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabel Produk Paling Laris */}
      <div className="card table-card-clean">
        <div className="card-header-clean" style={{ padding: '14px 18px', margin: 0, borderBottom: '1px solid #F1F5F9' }}>
          <h3 className="section-card-title">Obat Paling Laris Terjual (Top Products)</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>No</th>
                <th>Nama Obat</th>
                <th>Satuan</th>
                <th style={{ textAlign: 'center' }}>Total Terjual</th>
                <th style={{ textAlign: 'right' }}>Total Omzet</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {topSellingList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted" style={{ padding: '24px' }}>
                    Belum ada data penjualan pada periode ini.
                  </td>
                </tr>
              ) : (
                topSellingList.map((item, idx) => (
                  <tr key={item.name}>
                    <td>{idx + 1}</td>
                    <td className="fw-medium">{item.name}</td>
                    <td>{item.unit}</td>
                    <td style={{ textAlign: 'center' }} className="fw-bold">{item.qty} {item.unit}</td>
                    <td style={{ textAlign: 'right' }} className="fw-bold text-primary">{formatRupiah(item.revenue)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-pill badge-pill-success">
                        Terlaris #{idx + 1}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
