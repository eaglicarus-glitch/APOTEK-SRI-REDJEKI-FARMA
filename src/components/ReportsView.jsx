import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah, formatDateTime, getLocalDateString } from '../lib/constants';

export default function ReportsView() {
  const { transactions } = usePharmacy();
  const { showToast } = useToast();
  const [period, setPeriod] = useState('month'); // 'today' | 'week' | 'month' | 'all'

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

  // Metrik Penjualan Utama
  const totalRevenue = filteredTx.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
  const totalTransactions = filteredTx.length;
  const totalItemsSold = filteredTx.reduce((sum, tx) => {
    return sum + (tx.items ? tx.items.reduce((s, it) => s + (Number(it.qty) || 0), 0) : 0);
  }, 0);
  const avgBasket = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  // Analisis Obat Terlaris (Top Selling)
  const topSellingList = useMemo(() => {
    const itemMap = {};
    filteredTx.forEach((tx) => {
      if (tx.items) {
        tx.items.forEach((it) => {
          const key = it.code || it.name;
          if (!itemMap[key]) {
            itemMap[key] = { name: it.name, code: it.code, unit: it.unit || 'Strip', qty: 0, revenue: 0 };
          }
          itemMap[key].qty += Number(it.qty) || 0;
          itemMap[key].revenue += Number(it.subtotal) || 0;
        });
      }
    });

    return Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredTx]);

  // Metode Pembayaran
  const paymentBreakdown = useMemo(() => {
    const counts = { Tunai: 0, QRIS: 0, Transfer: 0, Debit: 0 };
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

  const paymentSum = (paymentBreakdown.Tunai + paymentBreakdown.QRIS + paymentBreakdown.Transfer + paymentBreakdown.Debit) || 1;

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

  const maxSales = Math.max(...last7DaysData.map((d) => d.sales), 100000);

  // Ekspor CSV
  const handleExportCSV = () => {
    if (filteredTx.length === 0) {
      showToast('Tidak ada data transaksi pada periode ini untuk diekspor!', 'warning');
      return;
    }

    const headers = ['Kode Faktur', 'Tanggal Jam', 'Pelanggan', 'Metode Pembayaran', 'Subtotal', 'Diskon', 'Total (Rp)', 'Kasir', 'Detail Item'];
    const rows = filteredTx.map((tx) => {
      const itemsStr = tx.items ? tx.items.map((it) => `${it.name} (${it.qty} ${it.unit || 'unit'})`).join('; ') : '-';
      return [
        `"${tx.code}"`,
        `"${formatDateTime(tx.dateTime)}"`,
        `"${tx.customer || 'Pelanggan Umum'}"`,
        `"${tx.paymentMethod || 'Tunai'}"`,
        tx.subtotal,
        tx.discount || 0,
        tx.total,
        `"${tx.cashier || 'Kasir'}"`,
        `"${itemsStr}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Penjualan_Apotek_${period}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Laporan penjualan CSV berhasil diunduh.', 'success');
  };

  return (
    <section id="view-reports" className="view-panel">
      {/* Header */}
      <div className="content-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="content-title">Laporan & Analitik Penjualan</h1>
          <p style={{ fontSize: '13px', color: 'var(--secondary-text)', marginTop: '2px' }}>
            Rekapitulasi pendapatan apotek, tren penjualan harian, dan analisis produk terlaris
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportCSV}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Ekspor Laporan (CSV)
          </button>
        </div>
      </div>

      {/* Filter Periode */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)' }}>
              Periode Waktu:
            </span>
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'week', label: '7 Hari Terakhir' },
              { id: 'month', label: 'Bulan Ini' },
              { id: 'all', label: 'Semua Riwayat' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${period === p.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
            Data dihitung dari <strong>{filteredTx.length}</strong> transaksi resmi.
          </div>
        </div>
      </div>

      {/* 4 Kartu Metrik Laporan */}
      <div className="dashboard-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <span className="stat-label">Total Omset Pendapatan</span>
          <div className="stat-value" style={{ color: 'var(--primary-emerald, #059669)' }}>{formatRupiah(totalRevenue)}</div>
          <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Total pendapatan kotor bersih</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Jumlah Faktur Penjualan</span>
          <div className="stat-value">{totalTransactions}</div>
          <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Total nota kasir tercatat</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Kuantitas Obat Terjual</span>
          <div className="stat-value">{totalItemsSold} <span style={{ fontSize: '14px', color: 'var(--secondary-text)' }}>unit</span></div>
          <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Akumulasi fisik obat keluar</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Rata-rata Nilai Transaksi</span>
          <div className="stat-value">{formatRupiah(avgBasket)}</div>
          <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Rata-rata belanja per nota</span>
        </div>
      </div>

      {/* Grafik Tren 7 Hari Terakhir & Distribusi Pembayaran */}
      <div className="dashboard-content-grid" style={{ marginBottom: '24px' }}>
        {/* Grafik Penjualan 7 Hari */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 className="card-clean-title" style={{ marginBottom: '4px' }}>Tren Penjualan 7 Hari Terakhir</h3>
          <p className="card-clean-subtitle" style={{ marginBottom: '20px' }}>Grafik fluktuasi omset penjualan harian</p>

          <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '12px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
            {last7DaysData.map((d) => {
              const heightPercent = Math.max(8, Math.round((d.sales / maxSales) * 100));
              return (
                <div key={d.date} style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      color: d.sales > 0 ? 'var(--primary-emerald, #059669)' : 'var(--muted-text)',
                      marginBottom: '4px'
                    }}
                  >
                    {d.sales > 0 ? `${Math.round(d.sales / 1000)}k` : '0'}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '36px',
                      height: `${heightPercent}%`,
                      background: d.sales > 0 ? 'var(--primary-emerald, #059669)' : '#e2e8f0',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }}
                    title={`${d.label} (${d.date}): ${formatRupiah(d.sales)}`}
                  />
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--secondary-text)', marginTop: '8px' }}>
                    {d.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribusi Metode Pembayaran */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 className="card-clean-title" style={{ marginBottom: '4px' }}>Distribusi Metode Pembayaran</h3>
          <p className="card-clean-subtitle" style={{ marginBottom: '20px' }}>Persentase perolehan kas berdasarkan kanal</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {['Tunai', 'QRIS', 'Transfer', 'Debit'].map((m) => {
              const amount = paymentBreakdown[m] || 0;
              const percent = Math.round((amount / paymentSum) * 100);
              return (
                <div key={m}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--primary-text)' }}>{m}</span>
                    <span style={{ fontWeight: '700', color: 'var(--primary-emerald, #059669)' }}>{formatRupiah(amount)} ({percent}%)</span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${percent}%`,
                        background: m === 'Tunai' ? 'var(--primary-emerald, #059669)' : m === 'QRIS' ? '#0284c7' : m === 'Transfer' ? '#f59e0b' : '#8b5cf6'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabel Obat Terlaris */}
      <div className="card">
        <div className="card-header-clean">
          <div>
            <h3 className="card-clean-title">5 Obat Paling Laris (Top Selling)</h3>
            <p className="card-clean-subtitle">Berdasarkan volume penjualan pada periode {period === 'today' ? 'hari ini' : period === 'week' ? '7 hari terakhir' : period === 'month' ? 'bulan ini' : 'seluruh waktu'}</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th>Kode Obat</th>
                <th>Nama Produk Obat</th>
                <th style={{ textAlign: 'center' }}>Total Terjual</th>
                <th style={{ textAlign: 'right' }}>Total Kontribusi Omset</th>
              </tr>
            </thead>
            <tbody>
              {topSellingList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="table-empty-row">
                    <div className="empty-state-container">
                      <p style={{ fontWeight: '600', color: 'var(--primary-text)' }}>Belum ada data penjualan pada periode ini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                topSellingList.map((item, idx) => (
                  <tr key={item.code || idx}>
                    <td style={{ color: 'var(--muted-text)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: '600' }}>{item.code || '-'}</td>
                    <td style={{ fontWeight: '600', color: 'var(--primary-text)' }}>{item.name}</td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--primary-emerald, #059669)' }}>
                      {item.qty} {item.unit}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>
                      {formatRupiah(item.revenue)}
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
