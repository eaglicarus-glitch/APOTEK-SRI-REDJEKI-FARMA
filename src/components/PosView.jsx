import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah } from '../lib/constants';
import ReceiptModal from './ReceiptModal';

export default function PosView() {
  const {
    products,
    cart,
    addToCart,
    updateCartQty,
    setCartQty,
    removeFromCart,
    clearCart,
    processCheckout,
    globalSearch,
    setGlobalSearch
  } = usePharmacy();

  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchInput, setSearchInput] = useState(globalSearch || '');
  const [debouncedQuery, setDebouncedQuery] = useState(globalSearch || '');
  const [discount, setDiscount] = useState(0);

  // Modal Pembayaran State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [tenderedStr, setTenderedStr] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Struk Modal State
  const [lastTransaction, setLastTransaction] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Search input ref for quick shortcut
  const searchInputRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Sync with global search from header
  useEffect(() => {
    if (globalSearch) {
      setSearchInput(globalSearch);
      setDebouncedQuery(globalSearch);
    }
  }, [globalSearch]);

  // Kategori filter
  const categories = ['Semua', 'Tablet', 'Kapsul', 'Sirup', 'Salep', 'Lainnya'];

  // Filter katalog produk
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === 'Semua' ||
        (selectedCategory === 'Lainnya'
          ? !['Tablet', 'Kapsul', 'Sirup', 'Salep'].includes(p.category)
          : p.category === selectedCategory);

      const q = debouncedQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q);

      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, debouncedQuery]);

  const cartSubtotal = cart.reduce((sum, it) => sum + it.subtotal, 0);
  const effectiveDiscount = Math.min(cartSubtotal, Math.max(0, Number(discount) || 0));
  const cartTotal = Math.max(0, cartSubtotal - effectiveDiscount);

  // Parsed Uang Diterima
  const tenderedAmount = useMemo(() => {
    if (paymentMethod !== 'Tunai') return cartTotal;
    const num = Number(tenderedStr.replace(/\D/g, ''));
    return isNaN(num) || num <= 0 ? 0 : num;
  }, [paymentMethod, tenderedStr, cartTotal]);

  const changeAmount = Math.max(0, tenderedAmount - cartTotal);
  const isShort = paymentMethod === 'Tunai' && tenderedAmount < cartTotal;

  const handleAddToCart = (product) => {
    if (product.stock <= 0) {
      showToast(`Stok ${product.name} telah habis!`, 'danger');
      return;
    }
    const success = addToCart(product);
    if (!success) {
      showToast(`Kuantitas di keranjang sudah mencapai sisa stok fisik (${product.stock})!`, 'warning');
    }
  };

  const handleOpenPayModal = () => {
    if (cart.length === 0) {
      showToast('Keranjang belanja masih kosong!', 'warning');
      return;
    }
    // Re-verify stock in cart before opening pay modal
    for (const item of cart) {
      const liveProd = products.find((p) => p.id === item.id || p.code === item.code);
      if (liveProd && liveProd.stock < item.qty) {
        showToast(`Stok ${item.name} berubah di sistem (sisa: ${liveProd.stock}). Harap sesuaikan keranjang!`, 'danger');
        return;
      }
    }

    setPaymentMethod('Tunai');
    setTenderedStr(new Intl.NumberFormat('id-ID').format(cartTotal));
    setIsPayModalOpen(true);
  };

  // Quick cash buttons for rapid cashier entry
  const setQuickTendered = (amount) => {
    setTenderedStr(new Intl.NumberFormat('id-ID').format(amount));
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    if (paymentMethod === 'Tunai' && tenderedAmount < cartTotal) {
      showToast(`Uang diterima kurang dari total tagihan! Kurang ${formatRupiah(cartTotal - tenderedAmount)}`, 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      // Sesuai Aturan 10: Pelanggan Umum standar (tanpa form pelanggan individual)
      const tx = await processCheckout({
        customer: 'Pelanggan Umum',
        paymentMethod,
        amountTendered: paymentMethod === 'Tunai' ? tenderedAmount : cartTotal,
        discount: effectiveDiscount,
        notes: '-',
        cashierName: currentUser?.name || 'Kasir Utama'
      });

      setIsPayModalOpen(false);
      setDiscount(0);
      setLastTransaction(tx);
      setIsReceiptOpen(true);
      showToast('Transaksi kasir berhasil dicatat ke sistem!', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal memproses transaksi kasir!', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedQuery('');
    if (setGlobalSearch) setGlobalSearch('');
  };

  return (
    <section id="view-pos" className="view-panel pos-view-clean">
      {/* Header Penjualan */}
      <div className="content-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="content-title">Kasir Penjualan</h1>
          <p style={{ fontSize: '13px', color: 'var(--secondary-text)', marginTop: '2px' }}>
            Pelayanan resep & penjualan obat bebas Apotek Sri Redjeki Farma
          </p>
        </div>
      </div>

      <div className="pos-main-split">
        {/* Kolom Kiri: Katalog Obat */}
        <div className="pos-catalog-column">
          {/* Input Pencarian */}
          <div className="pos-search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              id="pos-search-input"
              className="pos-search-input"
              placeholder="Cari obat berdasarkan nama atau kode (tekan F2)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                aria-label="Bersihkan pencarian"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Kategori Horizontal Pills */}
          <div className="category-pills-bar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* List Produk Horizontal Cards */}
          <div className="pos-products-list">
            {filteredProducts.length === 0 ? (
              <div className="empty-catalog-box">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p style={{ fontWeight: '600', color: 'var(--primary-text)' }}>Obat tidak ditemukan</p>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                  Tidak ada obat dengan kata kunci "{debouncedQuery}" pada kategori {selectedCategory}.
                </span>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLow = !isOutOfStock && p.stock <= (p.minStock || 10);

                return (
                  <div
                    key={p.id}
                    className={`pos-product-row-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                    onClick={() => !isOutOfStock && handleAddToCart(p)}
                    role="button"
                    tabIndex={isOutOfStock ? -1 : 0}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !isOutOfStock) {
                        e.preventDefault();
                        handleAddToCart(p);
                      }
                    }}
                  >
                    <div className="product-row-thumb">
                      {p.image ? (
                        <img src={p.image} alt={p.name} loading="lazy" />
                      ) : (
                        <div className="product-thumb-placeholder">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-emerald, #059669)" strokeWidth="1.8">
                            <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                            <path d="m8.5 8.5 7 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="product-row-info">
                      <div className="product-row-name">{p.name}</div>
                      <div className="product-row-sub">
                        {p.code} • {p.category} ({p.unit})
                      </div>
                    </div>
                    <div className="product-row-price-area" style={{ textAlign: 'right' }}>
                      <div className="product-row-price">{formatRupiah(p.price)}</div>
                      <div>
                        {isOutOfStock ? (
                          <span className="badge badge-danger" style={{ fontSize: '10px' }}>Habis</span>
                        ) : isLow ? (
                          <span className="badge badge-warning" style={{ fontSize: '10px' }}>Sisa {p.stock}</span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '10px' }}>Stok {p.stock}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom Kanan: Keranjang Transaksi & Total */}
        <div className="pos-cart-column">
          <div className="pos-cart-panel card">
            <div className="cart-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <h3 className="cart-title">Keranjang Kasir</h3>
                <span className="badge badge-info" style={{ marginLeft: 'auto', fontSize: '11px' }}>
                  {cart.length} Obat
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="cart-clear-btn"
                  onClick={clearCart}
                  title="Kosongkan seluruh keranjang"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {/* List Item Keranjang */}
            <div className="cart-items-container">
              {cart.length === 0 ? (
                <div className="cart-empty-state">
                  <div className="empty-cart-icon-wrap">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
                      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                  </div>
                  <p style={{ fontWeight: '600', color: 'var(--primary-text)', marginTop: '8px' }}>Keranjang Masih Kosong</p>
                  <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                    Klik obat di sebelah kiri untuk menambahkan ke daftar kasir.
                  </span>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="cart-item-card">
                    <div className="cart-item-top">
                      <div className="cart-item-name">{item.name}</div>
                      <button
                        type="button"
                        className="cart-item-del-btn"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Hapus ${item.name}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>

                    <div className="cart-item-bottom">
                      <div className="cart-item-unit-price">
                        {formatRupiah(item.price)} <span style={{ fontSize: '11px', color: 'var(--muted-text)' }}>/ {item.unit}</span>
                      </div>

                      <div className="cart-item-stepper">
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => updateCartQty(item.id, -1)}
                          aria-label="Kurangi kuantitas"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          className="stepper-input"
                          value={item.qty}
                          min="1"
                          max={item.maxStock}
                          onChange={(e) => setCartQty(item.id, e.target.value)}
                        />
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => updateCartQty(item.id, 1)}
                          disabled={item.qty >= item.maxStock}
                          aria-label="Tambah kuantitas"
                        >
                          +
                        </button>
                      </div>

                      <div className="cart-item-subtotal">
                        {formatRupiah(item.subtotal)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ringkasan & Total */}
            <div className="cart-summary-section">
              <div className="summary-row">
                <span className="summary-label">Subtotal:</span>
                <span className="summary-val">{formatRupiah(cartSubtotal)}</span>
              </div>

              <div className="summary-row" style={{ alignItems: 'center' }}>
                <span className="summary-label">Diskon (Rp):</span>
                <input
                  type="number"
                  min="0"
                  max={cartSubtotal}
                  value={discount === 0 ? '' : discount}
                  placeholder="0"
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  style={{
                    width: '110px',
                    textAlign: 'right',
                    padding: '4px 8px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface)'
                  }}
                />
              </div>

              <div className="summary-divider" />

              <div className="summary-row total-highlight">
                <span className="total-title">Total Tagihan</span>
                <span className="total-amount-display">{formatRupiah(cartTotal)}</span>
              </div>

              <button
                type="button"
                className="btn btn-primary checkout-full-btn"
                disabled={cart.length === 0}
                onClick={handleOpenPayModal}
              >
                Bayar Sekarang ({cart.length} Item) →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Pembayaran Kasir Modern */}
      {isPayModalOpen && (
        <div className="modal-backdrop active" role="dialog" aria-modal="true">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Pembayaran Kasir</h3>
                <p style={{ fontSize: '12px', color: 'var(--secondary-text)', margin: 0 }}>
                  Transaksi Pelanggan Umum • {cart.length} Jenis Obat
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !isProcessing && setIsPayModalOpen(false)}
                disabled={isProcessing}
                aria-label="Tutup modal"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="modal-body" style={{ padding: '20px' }}>
                {/* Total Display Prominent */}
                <div style={{ background: 'var(--light-emerald-bg, #ecfdf5)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--emerald-border, #a7f3d0)', textAlign: 'center', marginBottom: '18px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--primary-emerald-hover, #047857)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total Tagihan Bersih
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--primary-emerald-dark, #064e3b)', marginTop: '4px' }}>
                    {formatRupiah(cartTotal)}
                  </div>
                </div>

                {/* Metode Pembayaran */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '8px', display: 'block' }}>
                    Metode Pembayaran
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {['Tunai', 'QRIS', 'Transfer', 'Debit'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        style={{
                          padding: '10px 6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-sm)',
                          border: paymentMethod === method ? '2px solid var(--primary-emerald, #059669)' : '1px solid var(--border-color)',
                          background: paymentMethod === method ? 'var(--light-emerald-bg, #ecfdf5)' : 'var(--surface)',
                          color: paymentMethod === method ? 'var(--primary-emerald, #059669)' : 'var(--secondary-text)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Khusus Pembayaran Tunai: Input Uang Diterima & Tombol Pecahan Cepat */}
                {paymentMethod === 'Tunai' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-text)', marginBottom: '6px', display: 'block' }}>
                      Uang Diterima (Rp) *
                    </label>
                    <input
                      type="text"
                      id="input-cash-tendered"
                      className="form-control"
                      value={tenderedStr}
                      autoFocus
                      placeholder="Contoh: 50.000"
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setTenderedStr(val ? new Intl.NumberFormat('id-ID').format(Number(val)) : '');
                      }}
                      style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' }}
                    />

                    {/* Tombol Cepat Pecahan Uang Rupiah */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setQuickTendered(cartTotal)}
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b', fontSize: '11px', fontWeight: '600' }}
                      >
                        Uang Pas
                      </button>
                      {[10000, 20000, 50000, 100000, 200000].map((nominal) => (
                        <button
                          key={nominal}
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setQuickTendered(nominal)}
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b', fontSize: '11px' }}
                        >
                          {new Intl.NumberFormat('id-ID').format(nominal)}
                        </button>
                      ))}
                    </div>

                    {/* Status Kembalian / Kurang */}
                    <div style={{ marginTop: '14px' }}>
                      {isShort ? (
                        <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg, #fee2e2)', color: 'var(--danger-text, #b91c1c)', fontSize: '12px', fontWeight: '600' }}>
                          Uang kurang: {formatRupiah(cartTotal - tenderedAmount)}
                        </div>
                      ) : (
                        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--light-emerald-bg, #ecfdf5)', border: '1px solid var(--emerald-border, #a7f3d0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--primary-emerald-hover, #047857)', fontWeight: '600' }}>
                            Kembalian:
                          </span>
                          <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-emerald-dark, #064e3b)' }}>
                            {formatRupiah(changeAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Non-Tunai Notice */}
                {paymentMethod !== 'Tunai' && (
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--secondary-text)', marginBottom: '14px' }}>
                    Pembayaran via <strong>{paymentMethod}</strong> akan dicatat sebesar nilai total tepat ({formatRupiah(cartTotal)}). Pastikan transaksi telah berhasil pada mesin EDC/QRIS apotek sebelum menyelesaikan.
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '16px 20px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsPayModalOpen(false)}
                  disabled={isProcessing}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isProcessing || isShort}
                  style={{ minWidth: '150px' }}
                >
                  {isProcessing ? 'Memproses Transaksi...' : 'Selesaikan Transaksi & Cetak Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Nota / Struk Belanja */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        transaction={lastTransaction}
        onClose={() => setIsReceiptOpen(false)}
      />
    </section>
  );
}
