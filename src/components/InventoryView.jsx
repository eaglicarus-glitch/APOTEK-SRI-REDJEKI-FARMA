import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../lib/constants';

export default function InventoryView() {
  const { products, adjustStock, stockMovements } = usePharmacy();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'movements'

  // Tab Inventory Filter
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [stockStatusFilter, setStockStatusFilter] = useState('Semua'); // 'Semua' | 'Kritis' | 'Habis' | 'Aman'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Tab Mutasi Filter
  const [mutationSearch, setMutationSearch] = useState('');
  const [mutationType, setMutationType] = useState('Semua');
  const [mutationPage, setMutationPage] = useState(1);
  const mutationPageSize = 8;

  // Modal Penyesuaian Stok State
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [actionType, setActionType] = useState('restock'); // restock | damaged | correction
  const [amountStr, setAmountStr] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Semua', 'Tablet', 'Kapsul', 'Sirup', 'Salep', 'Obat Bebas', 'Obat Keras', 'Lainnya'];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === 'Semua' ||
        (selectedCategory === 'Lainnya'
          ? !['Tablet', 'Kapsul', 'Sirup', 'Salep', 'Obat Bebas', 'Obat Keras'].includes(p.category)
          : p.category === selectedCategory);

      let matchStatus = true;
      const isZero = p.stock === 0;
      const isLow = !isZero && p.stock <= (p.minStock || 10);

      if (stockStatusFilter === 'Kritis') matchStatus = isLow;
      else if (stockStatusFilter === 'Habis') matchStatus = isZero;
      else if (stockStatusFilter === 'Aman') matchStatus = !isZero && !isLow;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q);

      return matchCat && matchStatus && matchQuery;
    });
  }, [products, selectedCategory, stockStatusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const pageProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedMed = useMemo(() => {
    return products.find((p) => p.id === selectedMedId) || products[0];
  }, [products, selectedMedId]);

  const handleOpenStockModal = (medId = null) => {
    const targetId = medId || (products[0] ? products[0].id : '');
    setSelectedMedId(targetId);
    setActionType('restock');
    setAmountStr('');
    setNotes('');
    setIsStockModalOpen(true);
  };

  const calcPreviewStock = () => {
    if (!selectedMed) return 0;
    const amt = Number(amountStr) || 0;
    if (actionType === 'restock') return selectedMed.stock + amt;
    if (actionType === 'damaged') return Math.max(0, selectedMed.stock - amt);
    if (actionType === 'correction') return amountStr === '' ? selectedMed.stock : amt;
    return selectedMed.stock;
  };

  const filteredMutations = useMemo(() => {
    return (stockMovements || []).filter((m) => {
      const matchType = mutationType === 'Semua' || m.changeType === mutationType;
      const q = mutationSearch.toLowerCase().trim();
      const matchQuery =
        !q ||
        (m.medicineName && m.medicineName.toLowerCase().includes(q)) ||
        (m.medicineCode && m.medicineCode.toLowerCase().includes(q)) ||
        (m.reason && m.reason.toLowerCase().includes(q));
      return matchType && matchQuery;
    });
  }, [stockMovements, mutationType, mutationSearch]);

  const totalMutationPages = Math.ceil(filteredMutations.length / mutationPageSize) || 1;
  const pageMutations = filteredMutations.slice(
    (mutationPage - 1) * mutationPageSize,
    mutationPage * mutationPageSize
  );

  const handleSaveStockAdjustment = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedMed) {
      showToast('Harap pilih data obat yang valid!', 'warning');
      return;
    }

    const amt = Number(amountStr);
    if (isNaN(amt) || amt < 0) {
      showToast('Jumlah unit penyesuaian harus berupa angka positif (>= 0)!', 'warning');
      return;
    }

    if (actionType === 'damaged' && amt > selectedMed.stock) {
      showToast(`Jumlah pengurangan (${amt}) melebihi sisa stok fisik (${selectedMed.stock})!`, 'danger');
      return;
    }

    if (!notes.trim()) {
      showToast('Harap isi alasan atau catatan penyesuaian stok!', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await adjustStock(
        selectedMed.id,
        actionType,
        amt,
        notes.trim(),
        currentUser?.name || 'Apoteker Pengelola'
      );

      setIsStockModalOpen(false);
      showToast(`Stok ${selectedMed.name} berhasil diperbarui menjadi ${calcPreviewStock()} ${selectedMed.unit}!`, 'success');
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan penyesuaian stok!', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="view-inventory" className="view-panel">
      {/* Header */}
      <div className="content-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="content-title">Inventaris & Manajemen Stok</h1>
          <p style={{ fontSize: '13px', color: 'var(--secondary-text)', marginTop: '2px' }}>
            Pantau persediaan fisik obat, batas minimum restok, dan audit log mutasi stok
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => handleOpenStockModal()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Sesuaikan Stok Obat
        </button>
      </div>

      {/* Navigasi Tab (Persediaan Fisik vs Mutasi) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '600',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'inventory' ? '2px solid var(--primary-emerald, #059669)' : '2px solid transparent',
            color: activeTab === 'inventory' ? 'var(--primary-emerald, #059669)' : 'var(--secondary-text)',
            cursor: 'pointer'
          }}
        >
          Status Persediaan Obat ({products.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('movements')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '600',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'movements' ? '2px solid var(--primary-emerald, #059669)' : '2px solid transparent',
            color: activeTab === 'movements' ? 'var(--primary-emerald, #059669)' : 'var(--secondary-text)',
            cursor: 'pointer'
          }}
        >
          Audit Log Mutasi Stok ({stockMovements.length})
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginRight: '4px' }}>
                  Filter Ketersediaan:
                </span>
                {['Semua', 'Kritis', 'Habis', 'Aman'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`btn btn-sm ${stockStatusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => {
                      setStockStatusFilter(st);
                      setCurrentPage(1);
                    }}
                  >
                    {st === 'Kritis' ? '⚠️ Stok Menipis' : st === 'Habis' ? '❌ Habis' : st === 'Aman' ? '✅ Aman' : 'Semua'}
                  </button>
                ))}

                <select
                  className="form-control"
                  style={{ width: 'auto', padding: '4px 10px', fontSize: '12px', marginLeft: '6px' }}
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c === 'Semua' ? 'Semua Kategori' : c}</option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: '240px', flex: '1', maxWidth: '320px' }}>
                <div className="pos-search-box" style={{ margin: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="pos-search-input"
                    placeholder="Cari obat dalam persediaan..."
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

          {/* Tabel Persediaan Obat */}
          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>No</th>
                    <th>Kode</th>
                    <th>Nama Obat</th>
                    <th>Kategori</th>
                    <th style={{ textAlign: 'center' }}>Stok Fisik Saat Ini</th>
                    <th style={{ textAlign: 'center' }}>Batas Min. Stok</th>
                    <th>Indikator Level</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageProducts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="table-empty-row">
                        <div className="empty-state-container">
                          <p style={{ fontWeight: '600', color: 'var(--primary-text)' }}>Tidak ada data persediaan obat yang cocok.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageProducts.map((p, idx) => {
                      const isZero = p.stock === 0;
                      const isLow = !isZero && p.stock <= (p.minStock || 10);
                      const ratio = Math.min(100, Math.round((p.stock / ((p.minStock || 10) * 2)) * 100));

                      return (
                        <tr key={p.id}>
                          <td style={{ color: 'var(--muted-text)' }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td style={{ fontWeight: '600' }}>{p.code}</td>
                          <td style={{ fontWeight: '600', color: 'var(--primary-text)' }}>{p.name}</td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: '11px' }}>{p.category}</span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '800', fontSize: '14px', color: isZero ? 'var(--danger)' : isLow ? 'var(--warning-text)' : 'var(--primary-emerald, #059669)' }}>
                            {p.stock} <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--secondary-text)' }}>{p.unit}</span>
                          </td>
                          <td style={{ textAlign: 'center', color: 'var(--secondary-text)' }}>
                            {p.minStock || 10} {p.unit}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: '1', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${ratio}%`,
                                    background: isZero ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: '600', color: isZero ? 'var(--danger)' : isLow ? 'var(--warning-text)' : 'var(--success-text)' }}>
                                {isZero ? 'Habis' : isLow ? 'Perlu Restok' : 'Aman'}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => handleOpenStockModal(p.id)}
                            >
                              Sesuaikan
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-bar">
                <div className="pagination-info">
                  Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredProducts.length)} dari {filteredProducts.length} obat
                </div>
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((cp) => Math.max(1, cp - 1))}
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
                    onClick={() => setCurrentPage((cp) => Math.min(totalPages, cp + 1))}
                  >
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Tab Log Mutasi Stok */
        <div className="card">
          <div className="card-header-clean" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 className="card-clean-title">Riwayat Log Mutasi Stok Obat</h3>
              <p className="card-clean-subtitle">Catatan historis penambahan stok, barang rusak/kadaluarsa, dan koreksi opname</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Cari obat / alasan mutasi..."
                value={mutationSearch}
                onChange={(e) => {
                  setMutationSearch(e.target.value);
                  setMutationPage(1);
                }}
                style={{ width: '220px', padding: '6px 10px', fontSize: '12px' }}
              />
              {['Semua', 'in', 'out', 'adjustment'].map((mt) => (
                <button
                  key={mt}
                  type="button"
                  className={`btn btn-sm ${mutationType === mt ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    setMutationType(mt);
                    setMutationPage(1);
                  }}
                >
                  {mt === 'in' ? 'Restok (+)' : mt === 'out' ? 'Rusak/Kadaluarsa (-)' : mt === 'adjustment' ? 'Opname (±)' : 'Semua Tipe'}
                </button>
              ))}
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No</th>
                  <th>Waktu Kejadian</th>
                  <th>Obat</th>
                  <th>Tipe Mutasi</th>
                  <th style={{ textAlign: 'center' }}>Perubahan</th>
                  <th style={{ textAlign: 'center' }}>Stok Akhir</th>
                  <th>Alasan / Keterangan</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                {pageMutations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="table-empty-row">
                      <div className="empty-state-container">
                        <p style={{ fontWeight: '600', color: 'var(--primary-text)' }}>Belum ada catatan mutasi stok obat.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageMutations.map((m, idx) => {
                    const isPlus = m.delta > 0;
                    return (
                      <tr key={m.id || idx}>
                        <td style={{ color: 'var(--muted-text)' }}>
                          {(mutationPage - 1) * mutationPageSize + idx + 1}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                          {formatDateTime(m.date)}
                        </td>
                        <td style={{ fontWeight: '600', color: 'var(--primary-text)' }}>
                          {m.medicineName || m.medicineCode}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              m.changeType === 'in'
                                ? 'badge-success'
                                : m.changeType === 'out'
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {m.changeType === 'in' ? 'Restok' : m.changeType === 'out' ? 'Rusak/Kadaluarsa' : 'Opname Fisik'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: isPlus ? 'var(--success)' : 'var(--danger)' }}>
                          {isPlus ? `+${m.delta}` : m.delta}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>
                          {m.finalStock}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                          {m.reason || '-'}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--primary-text)' }}>
                          {m.cashier || m.operatorName || 'Apoteker'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Mutasi */}
          {totalMutationPages > 1 && (
            <div className="pagination-bar">
              <div className="pagination-info">
                Menampilkan {(mutationPage - 1) * mutationPageSize + 1} - {Math.min(mutationPage * mutationPageSize, filteredMutations.length)} dari {filteredMutations.length} mutasi
              </div>
              <div className="pagination-controls">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={mutationPage === 1}
                  onClick={() => setMutationPage((p) => Math.max(1, p - 1))}
                >
                  ← Sebelumnya
                </button>
                <span style={{ fontSize: '12px', fontWeight: '600', padding: '0 8px', color: 'var(--primary-text)' }}>
                  Halaman {mutationPage} dari {totalMutationPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={mutationPage === totalMutationPages}
                  onClick={() => setMutationPage((p) => Math.min(totalMutationPages, p + 1))}
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Penyesuaian Stok Atomik */}
      {isStockModalOpen && (
        <div className="modal-backdrop active" role="dialog" aria-modal="true">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Sesuaikan Stok Fisik Obat</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !isSubmitting && setIsStockModalOpen(false)}
                disabled={isSubmitting}
                aria-label="Tutup"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                    Pilih Obat *
                  </label>
                  <select
                    className="form-control"
                    value={selectedMedId}
                    onChange={(e) => setSelectedMedId(e.target.value)}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name} (Stok Saat Ini: {p.stock} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                    Jenis Penyesuaian
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${actionType === 'restock' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setActionType('restock')}
                    >
                      ➕ Tambah Stok
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${actionType === 'damaged' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setActionType('damaged')}
                      style={{ color: actionType === 'damaged' ? '#fff' : 'var(--danger)', borderColor: actionType === 'damaged' ? '' : '#fca5a5' }}
                    >
                      ➖ Rusak / Expired
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${actionType === 'correction' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setActionType('correction')}
                    >
                      ⚖️ Opname Fisik
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                    {actionType === 'correction' ? 'Jumlah Stok Fisik Sebenarnya (Unit) *' : 'Jumlah Perubahan (Unit) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={amountStr}
                    placeholder="Contoh: 10"
                    onChange={(e) => setAmountStr(e.target.value)}
                    required
                  />
                </div>

                {/* Live Preview Stok */}
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Stok Saat Ini:</span>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{selectedMed?.stock || 0} {selectedMed?.unit}</div>
                  </div>
                  <div style={{ fontSize: '16px', color: 'var(--muted-text)' }}>→</div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Estimasi Stok Akhir:</span>
                    <div style={{ fontWeight: '800', fontSize: '16px', color: 'var(--primary-emerald, #059669)' }}>
                      {calcPreviewStock()} {selectedMed?.unit}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                    Alasan / Keterangan Penyesuaian *
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Contoh: Penerimaan kiriman PBF / Barang rusak segel / Hasil stock opname bulanan"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 20px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsStockModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Penyesuaian Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
