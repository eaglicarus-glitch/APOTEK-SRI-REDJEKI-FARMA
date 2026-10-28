import React, { useState } from 'react';
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
  const pageSize = 6;

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
  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Kategori sesuai mockup
  const categories = ['Semua', 'Tablet', 'Kapsul', 'Sirup', 'Salep', 'Lainnya'];

  const filtered = products.filter((p) => {
    const matchCat =
      selectedCategory === 'Semua' ||
      (selectedCategory === 'Lainnya'
        ? !['Tablet', 'Kapsul', 'Sirup', 'Salep'].includes(p.category)
        : p.category === selectedCategory);

    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pageProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAddModal = () => {
    setEditingId(null);
    let seq = products.length + 1;
    while (products.some((p) => p.code === `OBT${String(seq).padStart(3, '0')}`)) {
      seq++;
    }
    setCode(`OBT${String(seq).padStart(3, '0')}`);
    setName('');
    setCategory('Tablet');
    setUnit('Strip');
    setPrice('');
    setStock('');
    setDescription('');
    setImageBase64('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingId(p.id);
    setCode(p.code);
    setName(p.name);
    setCategory(p.category);
    setUnit(p.unit || 'Strip');
    setPrice(String(p.price));
    setStock(String(p.stock));
    setDescription(p.description || '');
    setImageBase64(p.image || '');
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImageBase64(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!code.trim() || !name.trim()) {
      showToast('Harap lengkapi semua field yang bertanda bintang (*)!', 'warning');
      return;
    }

    const numPrice = Number(price);
    const numStock = Number(stock);

    if (numPrice <= 0) {
      showToast('Harga jual harus lebih dari Rp 0!', 'warning');
      return;
    }
    if (numStock < 0) {
      showToast('Stok awal tidak boleh bernilai negatif!', 'warning');
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
        price: numPrice,
        stock: numStock,
        minStock: 10,
        description,
        image: imageBase64 || null
      });

      showToast(`Data obat "${name}" berhasil disimpan!`, 'success');
      setIsModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan data obat!', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMedicine(deleteTarget.id);
      showToast(`Obat "${deleteTarget.name}" berhasil dihapus.`, 'info');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || 'Gagal menghapus obat!', 'danger');
    }
  };

  return (
    <section id="view-medicines" className="view-panel">
      <div className="content-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 className="content-title">Data Obat</h1>
        </div>
        <button
          type="button"
          id="btn-add-medicine"
          className="btn btn-primary"
          onClick={handleOpenAddModal}
        >
          + Tambah Obat
        </button>
      </div>

      {/* Search Input Box */}
      <div className="medicines-filter-bar">
        <div className="pos-search-box" style={{ width: '100%', marginBottom: '12px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="pos-search-input"
            placeholder="Cari nama obat, kategori, atau kode..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Category Pills Bar */}
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

      {/* Tabel Data Obat Sesuai Mockup */}
      <div className="card table-card-clean">
        <div className="table-responsive">
          <table className="data-table" id="table-medicines">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>No</th>
                <th>Nama Obat</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Harga Jual</th>
                <th style={{ textAlign: 'center', width: '140px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted" style={{ padding: '30px' }}>
                    Tidak ada data obat ditemukan.
                  </td>
                </tr>
              ) : (
                pageProducts.map((p, idx) => (
                  <tr key={p.id}>
                    <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: '500', color: 'var(--primary-text)' }}>{p.name}</div>
                    </td>
                    <td>{p.category}</td>
                    <td>{p.stock}</td>
                    <td>{formatRupiah(p.price)}</td>
                    <td>
                      <div className="table-actions" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditModal(p)}
                          title="Edit Data Obat"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => setDeleteTarget(p)}
                          title="Hapus Obat"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination at bottom right matching mockup */}
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

      {/* MODAL TAMBAH / EDIT OBAT PERSIS MOCKUP (MIDDLE CENTER) */}
      {isModalOpen && (
        <div className="modal-backdrop active" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Data Obat' : 'Tambah Data Obat'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                <div className="modal-split-layout">
                  {/* Kolom Kiri: Form Fields */}
                  <div>
                    <div className="form-group">
                      <label htmlFor="modal-med-name">Nama Obat *</label>
                      <input
                        type="text"
                        id="modal-med-name"
                        className="form-control"
                        placeholder="Masukkan nama obat"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal-med-category">Kategori *</label>
                      <select
                        id="modal-med-category"
                        className="form-control"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                      >
                        <option value="Tablet">Tablet</option>
                        <option value="Kapsul">Kapsul</option>
                        <option value="Sirup">Sirup</option>
                        <option value="Salep">Salep</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal-med-unit">Satuan</label>
                      <select
                        id="modal-med-unit"
                        className="form-control"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      >
                        <option value="Strip">Strip</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Kapsul">Kapsul</option>
                        <option value="Botol">Botol</option>
                        <option value="Tube">Tube</option>
                        <option value="Box">Box / Kotak</option>
                        <option value="Sachet">Sachet</option>
                        <option value="Pcs">Pcs</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal-med-price">Harga Jual *</label>
                      <div className="input-prefix-wrap">
                        <span className="input-prefix">Rp</span>
                        <input
                          type="number"
                          id="modal-med-price"
                          className="form-control with-prefix"
                          placeholder="Masukkan harga"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal-med-stock">Stok Awal *</label>
                      <input
                        type="number"
                        id="modal-med-stock"
                        className="form-control"
                        placeholder="Masukkan jumlah stok"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        required
                      />
                    </div>

                  </div>

                  {/* Kolom Kanan: Upload Gambar Drag & Drop */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>
                      Upload Gambar Obat
                    </label>
                    <label className="upload-dropzone" htmlFor="med-file-input">
                      <input
                        type="file"
                        id="med-file-input"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImageChange}
                      />
                      {imageBase64 ? (
                        <div style={{ textAlign: 'center' }}>
                          <img
                            src={imageBase64}
                            alt="Preview"
                            style={{ maxWidth: '140px', maxHeight: '140px', objectFit: 'contain', borderRadius: '6px', marginBottom: '8px' }}
                          />
                          <p style={{ fontSize: '11px', color: 'var(--primary-blue)' }}>Klik untuk ganti gambar</p>
                        </div>
                      ) : (
                        <div className="dropzone-content">
                          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <span className="dropzone-text">Upload Gambar Obat</span>
                          <span className="dropzone-sub">Klik untuk mengunggah atau drag &amp; drop</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Data Obat"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Katalog obat ini akan dihapus dari sistem.`}
        confirmText="Hapus Obat"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
