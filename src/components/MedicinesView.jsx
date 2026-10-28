import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah } from '../lib/constants';
import ConfirmModal from './ConfirmModal';

export default function MedicinesView() {
  const { products, saveMedicine, deleteMedicine } = usePharmacy();
  const { showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Tablet');
  const [unit, setUnit] = useState('Strip');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('10');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const categories = ['Semua', 'Tablet', 'Kapsul', 'Sirup', 'Salep', 'Obat Bebas', 'Obat Keras', 'Lainnya'];
  const unitOptions = ['Strip', 'Botol', 'Tube', 'Tablet', 'Kapsul', 'Box', 'Sachet', 'Pcs'];

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === 'Semua' ||
        (selectedCategory === 'Lainnya'
          ? !['Tablet', 'Kapsul', 'Sirup', 'Salep', 'Obat Bebas', 'Obat Keras'].includes(p.category)
          : p.category === selectedCategory);

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q);

      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pageProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAddModal = () => {
    setEditingId(null);
    let seq = products.length + 1;
    while (products.some((p) => p.code === `MED-${String(seq).padStart(3, '0')}`)) {
      seq++;
    }
    setCode(`MED-${String(seq).padStart(3, '0')}`);
    setName('');
    setCategory('Tablet');
    setUnit('Strip');
    setPrice('');
    setStock('0');
    setMinStock('10');
    setImageUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingId(p.id);
    setCode(p.code);
    setName(p.name);
    setCategory(p.category || 'Tablet');
    setUnit(p.unit || 'Strip');
    setPrice(String(p.price));
    setStock(String(p.stock));
    setMinStock(String(p.minStock || 10));
    setImageUrl(p.image || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!code.trim() || !name.trim()) {
      showToast('Kode obat dan nama obat wajib diisi!', 'warning');
      return;
    }

    const priceNum = Number(price);
    const stockNum = Number(stock);
    const minStockNum = Number(minStock);

    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Harga jual harus berupa angka valid (>= 0)!', 'warning');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      showToast('Jumlah stok harus berupa angka valid (>= 0)!', 'warning');
      return;
    }
    if (isNaN(minStockNum) || minStockNum < 0) {
      showToast('Batas minimum stok harus berupa angka valid (>= 0)!', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveMedicine({
        id: editingId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        category,
        unit,
        price: priceNum,
        stock: stockNum,
        minStock: minStockNum,
        image: imageUrl.trim() || null
      });

      setIsModalOpen(false);
      showToast(editingId ? 'Data obat berhasil diperbarui!' : 'Obat baru berhasil ditambahkan ke katalog!', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan data obat.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteMedicine(deleteTarget.id);
      showToast(`Obat "${deleteTarget.name}" berhasil dihapus dari sistem.`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(`Gagal menghapus obat: ${err.message}`, 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section id="view-medicines" className="view-panel">
      {/* Header */}
      <div className="content-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="content-title">Data Master Obat</h1>
          <p style={{ fontSize: '13px', color: 'var(--secondary-text)', marginTop: '2px' }}>
            Kelola katalog obat resmi, kategori farmasi, satuan, harga jual, dan batas restok
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenAddModal}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Obat Baru
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="category-pills-bar" style={{ margin: 0 }}>
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

          <div style={{ minWidth: '240px', flex: '1', maxWidth: '320px' }}>
            <div className="pos-search-box" style={{ margin: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="pos-search-input"
                placeholder="Cari kode atau nama obat..."
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

      {/* Tabel Data Obat */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th>Kode Obat</th>
                <th>Nama Produk</th>
                <th>Kategori</th>
                <th>Satuan</th>
                <th style={{ textAlign: 'right' }}>Harga Jual</th>
                <th style={{ textAlign: 'center' }}>Stok Fisik</th>
                <th>Status Persediaan</th>
                <th style={{ textAlign: 'center', width: '130px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="table-empty-row">
                    <div className="empty-state-container">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                        <path d="m8.5 8.5 7 7" />
                      </svg>
                      <p style={{ marginTop: '8px', fontWeight: '600', color: 'var(--primary-text)' }}>Tidak Ada Obat Ditemukan</p>
                      <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                        Coba sesuaikan kategori atau kata kunci pencarian Anda.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageProducts.map((p, idx) => {
                  const isZero = p.stock === 0;
                  const isLow = !isZero && p.stock <= (p.minStock || 10);

                  return (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--muted-text)' }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', color: 'var(--primary-text)' }}>
                          {p.code}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {p.image ? (
                              <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                              </svg>
                            )}
                          </div>
                          <span style={{ fontWeight: '600', color: 'var(--primary-text)' }}>{p.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '11px' }}>{p.category}</span>
                      </td>
                      <td style={{ color: 'var(--secondary-text)' }}>{p.unit}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--primary-emerald, #059669)' }}>
                        {formatRupiah(p.price)}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '700', color: isZero ? 'var(--danger)' : isLow ? 'var(--warning-text)' : 'inherit' }}>
                        {p.stock}
                      </td>
                      <td>
                        {isZero ? (
                          <span className="badge badge-danger">Habis</span>
                        ) : isLow ? (
                          <span className="badge badge-warning">Stok Menipis (Min: {p.minStock || 10})</span>
                        ) : (
                          <span className="badge badge-success">Tersedia</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit informasi obat"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setDeleteTarget(p)}
                            style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
                            title="Hapus obat ini"
                          >
                            Hapus
                          </button>
                        </div>
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
              Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filtered.length)} dari {filtered.length} obat
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

      {/* Modal Tambah / Edit Obat */}
      {isModalOpen && (
        <div className="modal-backdrop active" role="dialog" aria-modal="true">
          <div className="modal-dialog" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Data Obat' : 'Tambah Obat Baru'}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                disabled={isSubmitting}
                aria-label="Tutup"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                      Kode Obat *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                      Nama Obat / Produk *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      placeholder="Contoh: Paracetamol 500mg"
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                      Kategori Obat
                    </label>
                    <select
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.filter((c) => c !== 'Semua').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                      Satuan Penjualan
                    </label>
                    <select
                      className="form-control"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                      Harga Jual (Rp) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={price}
                      placeholder="Contoh: 15000"
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                      Stok Fisik *
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={stock}
                      placeholder="0"
                      onChange={(e) => setStock(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                      Batas Min. Stok
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={minStock}
                      placeholder="10"
                      onChange={(e) => setMinStock(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '4px', display: 'block' }}>
                    URL Gambar Produk (Opsional)
                  </label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://images.unsplash.com/... atau URL gambar publik"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  {imageUrl && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Pratinjau:</span>
                      <img
                        src={imageUrl}
                        alt="Preview"
                        style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 20px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Tambah Obat')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Obat"
        message={`Apakah Anda yakin ingin menghapus data obat "${deleteTarget?.name}" (${deleteTarget?.code})? Tindakan ini akan menghapus obat dari katalog.`}
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelText="Batal"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  );
}
