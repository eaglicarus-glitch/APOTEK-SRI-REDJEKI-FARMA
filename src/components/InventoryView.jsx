import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../lib/constants';

export default function InventoryView() {
  const { products, adjustStock, stockMovements, setActiveView } = usePharmacy();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'movements'

  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Audit Mutasi State
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

  // Detail Modal State
  const [detailMedicine, setDetailMedicine] = useState(null);

  // Kategori dinamis sesuai database dan standar apotek
  const categories = React.useMemo(() => {
    const standardCats = [
      'Obat Bebas',
      'Obat Bebas Terbatas',
      'Obat Keras',
      'Obat Luar',
      'Vitamin & Suplemen',
      'Alat Kesehatan',
      'Herbal & Jamu'
    ];
    const productCats = products
      .map((p) => p.category)
      .filter((c) => c && typeof c === 'string' && c.trim() !== '');

    const set = new Set(['Semua', ...standardCats, ...productCats]);
    return Array.from(set);
  }, [products]);

  const filtered = products.filter((p) => {
    const matchCat =
      selectedCategory === 'Semua' ||
      (selectedCategory === 'Lainnya'
        ? !categories.filter((c) => c !== 'Semua' && c !== 'Lainnya').includes(p.category)
        : p.category === selectedCategory);

    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pageProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedMed = products.find((p) => p.id === selectedMedId) || products[0];

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

  const filteredMutations = (stockMovements || []).filter((m) => {
    const matchType = mutationType === 'Semua' || m.changeType === mutationType;
    const q = mutationSearch.toLowerCase().trim();
    const matchQuery =
      !q ||
      (m.medicineName && m.medicineName.toLowerCase().includes(q)) ||
      (m.medicineCode && m.medicineCode.toLowerCase().includes(q)) ||
      (m.reason && m.reason.toLowerCase().includes(q));
    return matchType && matchQuery;
  });

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
      showToast('Jumlah stok harus berupa angka valid (minimal 0)!', 'warning');
      return;
    }
    if (actionType !== 'correction' && amt <= 0) {
      showToast('Jumlah perubahan harus lebih dari 0!', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await adjustStock({
        medicineId: selectedMed.id,
        action: actionType,
        amount: amt,
        reason: notes || (actionType === 'restock' ? 'Penambahan Stok Baru' : 'Penyesuaian Manual'),
        operatorName: currentUser?.name || 'Apoteker'
      });

      showToast(`Stok ${selectedMed.name} berhasil diperbarui!`, 'success');
      setIsStockModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Gagal memperbarui stok!', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <section id="view-inventory" className="view-panel">
      {/* Content Header Sesuai Mockup */}
      <div className="content-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 className="content-title">Persediaan Obat</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleOpenStockModal()}
          >
            Penyesuaian Stok
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveView('medicines')}
          >
            + Tambah Obat
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="tab-pill-switcher" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`tab-pill-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Katalog Persediaan
        </button>
        <button
          type="button"
          className={`tab-pill-btn ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('movements')}
        >
          Riwayat Mutasi Stok (Audit Trail)
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Filter Bar Sesuai Mockup */}
          <div className="medicines-filter-bar">
            <div className="pos-search-box" style={{ width: '100%', marginBottom: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="pos-search-input"
                placeholder="Cari obat..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="category-pills-bar" style={{ marginBottom: '16px' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tabel Persediaan Obat Sesuai Mockup */}
          <div className="card table-card-clean">
            <div className="table-responsive">
              <table className="data-table" id="table-inventory">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>No</th>
                    <th>Nama Obat</th>
                    <th>Kategori</th>
                    <th>Stok</th>
                    <th style={{ textAlign: 'center', width: '140px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageProducts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center text-muted" style={{ padding: '30px' }}>
                        Tidak ada data persediaan obat ditemukan.
                      </td>
                    </tr>
                  ) : (
                    pageProducts.map((p, idx) => (
                      <tr key={p.id}>
                        <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="fw-medium">{p.name}</td>
                        <td>{p.category}</td>
                        <td>{p.stock}</td>
                        <td>
                          <div className="table-actions" style={{ justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenStockModal(p.id)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setDetailMedicine(p)}
                            >
                              Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="table-pagination-footer">
              <div className="pagination-controls">
                <button
                  type="button"
                  className="page-btn-arrow"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  className="page-btn-arrow"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* TAB AUDIT TRAIL MUTASI */}
          <div className="history-filter-bar-clean" style={{ marginBottom: '16px' }}>
            <div className="filter-input-group" style={{ flex: 1 }}>
              <label>Pencarian Log Mutasi</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cari nama obat, kode, atau alasan..."
                value={mutationSearch}
                onChange={(e) => {
                  setMutationSearch(e.target.value);
                  setMutationPage(1);
                }}
              />
            </div>
            <div className="filter-input-group">
              <label>Jenis Perubahan</label>
              <select
                className="form-control"
                value={mutationType}
                onChange={(e) => {
                  setMutationType(e.target.value);
                  setMutationPage(1);
                }}
              >
                <option value="Semua">Semua Jenis</option>
                <option value="SALE">Penjualan Kasir (SALE)</option>
                <option value="IN">Stok Masuk / Restock (IN)</option>
                <option value="OUT">Stok Rusak / Keluar (OUT)</option>
                <option value="ADJUST">Koreksi Opname (ADJUST)</option>
              </select>
            </div>
          </div>

          <div className="card table-card-clean">
            <div className="table-responsive">
              <table className="data-table" id="table-stock-movements">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Nama Obat</th>
                    <th>Jenis Mutasi</th>
                    <th style={{ textAlign: 'right' }}>Perubahan</th>
                    <th style={{ textAlign: 'right' }}>Stok Akhir</th>
                    <th>Operator</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {pageMutations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center text-muted" style={{ padding: '30px' }}>
                        Belum ada riwayat mutasi stok tercatat.
                      </td>
                    </tr>
                  ) : (
                    pageMutations.map((m, idx) => (
                      <tr key={m.id || idx}>
                        <td style={{ fontSize: '12px' }}>{formatDateTime(m.createdAt || m.dateTime)}</td>
                        <td className="fw-medium">{m.medicineName}</td>
                        <td>
                          <span className={`badge ${m.changeType === 'IN' ? 'badge-success' : m.changeType === 'OUT' || m.changeType === 'SALE' ? 'badge-danger' : 'badge-primary'}`}>
                            {m.changeType === 'IN' ? 'Restock (Masuk)' : m.changeType === 'SALE' ? 'Penjualan' : m.changeType === 'OUT' ? 'Rusak/Hilang' : 'Koreksi'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: m.deltaQty > 0 ? '#10B981' : '#EF4444' }}>
                          {m.deltaQty > 0 ? `+${m.deltaQty}` : m.deltaQty}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{m.finalStock}</td>
                        <td>{m.operator || 'Apoteker'}</td>
                        <td style={{ fontSize: '12px', color: '#64748B' }}>{m.reason || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalMutationPages > 1 && (
              <div className="table-pagination-footer">
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="page-btn-arrow"
                    disabled={mutationPage === 1}
                    onClick={() => setMutationPage((p) => Math.max(1, p - 1))}
                  >
                    &lt;
                  </button>
                  <span style={{ fontSize: '12px', padding: '0 8px', color: '#64748B' }}>
                    Hal {mutationPage} / {totalMutationPages}
                  </span>
                  <button
                    type="button"
                    className="page-btn-arrow"
                    disabled={mutationPage === totalMutationPages}
                    onClick={() => setMutationPage((p) => Math.min(totalMutationPages, p + 1))}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* DETAIL MODAL */}
      {detailMedicine && (
        <div className="modal-backdrop active" role="dialog" aria-modal="true">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Detail Persediaan Obat</h3>
              <button type="button" className="modal-close-btn" onClick={() => setDetailMedicine(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '16px' }}>{detailMedicine.name}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Kategori</span>
                  <strong>{detailMedicine.category}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Stok Fisik</span>
                  <strong style={{ color: detailMedicine.stock <= 10 ? '#EF4444' : '#10B981' }}>{detailMedicine.stock} {detailMedicine.unit}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Status</span>
                  <span className={`badge-pill ${detailMedicine.stock <= 5 ? 'badge-pill-danger' : detailMedicine.stock <= 10 ? 'badge-pill-warning' : 'badge-pill-success'}`}>
                    {detailMedicine.stock <= 5 ? 'Stok Rendah' : detailMedicine.stock <= 10 ? 'Hampir Habis' : 'Aman'}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDetailMedicine(null)}>
                Tutup
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const id = detailMedicine.id;
                  setDetailMedicine(null);
                  handleOpenStockModal(id);
                }}
              >
                Ubah Stok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENYESUAIAN STOK */}
      {isStockModalOpen && (
        <div className="modal-backdrop active" role="dialog" aria-modal="true">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Penyesuaian Stok Fisik</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsStockModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Pilih Obat *</label>
                  <select
                    className="form-control"
                    value={selectedMedId}
                    onChange={(e) => setSelectedMedId(e.target.value)}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name} (Stok: {p.stock} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Jenis Tindakan</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${actionType === 'restock' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setActionType('restock')}
                    >
                      + Tambah (IN)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${actionType === 'damaged' ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => setActionType('damaged')}
                    >
                      - Rusak (OUT)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${actionType === 'correction' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setActionType('correction')}
                    >
                      Koreksi
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    {actionType === 'correction' ? 'Stok Fisik Baru (Hasil Hitung)' : 'Jumlah Unit *'}
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Contoh: 10"
                    min="0"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    required
                  />
                  {selectedMed && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748B' }}>
                      Stok saat ini: <strong>{selectedMed.stock}</strong> &rarr; Stok setelah disimpan:{' '}
                      <strong style={{ color: '#0066CC' }}>{calcPreviewStock()} {selectedMed.unit}</strong>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Catatan / Alasan</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Faktur No 442 atau Kadaluarsa"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsStockModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
