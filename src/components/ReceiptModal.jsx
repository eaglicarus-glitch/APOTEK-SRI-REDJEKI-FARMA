import React from 'react';
import { formatRupiah, formatDateTime } from '../lib/constants';
import { usePharmacy } from '../context/PharmacyContext';
import ApotekLogo from './ApotekLogo';

export default function ReceiptModal({ isOpen, transaction, onClose }) {
  const { settings } = usePharmacy();
  if (!isOpen || !transaction) return null;

  return (
    <div id="modal-receipt" className="modal-backdrop active" role="dialog" aria-modal="true">
      <div className="modal-dialog" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Nota Penjualan</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Tutup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ background: '#F8FAFC', padding: '16px' }}>
          <div id="receipt-print-area" className="receipt-paper-card">
            {/* Header Nota */}
            <div className="receipt-header-center">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                <ApotekLogo size={36} />
              </div>
              <h2 className="receipt-pharmacy-name">{settings.pharmacyName || 'APOTEK SRI REDJEKI FARMA'}</h2>
              <p className="receipt-pharmacy-address">
                {settings.address || 'Jl. Raya No. 123, Kec. Sidoarjo'} | Telp: {settings.phone || '0812-3456-7890'}
              </p>
              <h3 className="receipt-title-badge">NOTA PENJUALAN</h3>
            </div>

            {/* Meta Transaksi */}
            <div className="receipt-meta-grid">
              <div className="meta-row">
                <span className="meta-label">No. Transaksi</span>
                <span className="meta-colon">:</span>
                <span className="meta-val fw-bold">{transaction.code}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Tanggal</span>
                <span className="meta-colon">:</span>
                <span className="meta-val">{formatDateTime(transaction.dateTime)}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Kasir</span>
                <span className="meta-colon">:</span>
                <span className="meta-val">{transaction.cashier || 'Kasir Utama'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Pelanggan</span>
                <span className="meta-colon">:</span>
                <span className="meta-val">{transaction.customer || 'Pelanggan Umum'}</span>
              </div>
            </div>

            {/* Tabel Item Belanja */}
            <table className="receipt-table-items">
              <thead>
                <tr>
                  <th style={{ width: '24px' }}>No</th>
                  <th>Nama Obat</th>
                  <th style={{ textAlign: 'center', width: '32px' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Harga</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items && transaction.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td className="fw-medium">{item.name}</td>
                    <td style={{ textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(item.price)}</td>
                    <td style={{ textAlign: 'right' }} className="fw-bold">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Garis Dotted */}
            <div className="receipt-dotted-line" />

            {/* Total */}
            <div className="receipt-totals-clean">
              {transaction.discount > 0 && (
                <div className="total-row-item">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              )}
              <div className="total-row-item main-total">
                <span>Total:</span>
                <span className="fw-bold">{formatRupiah(transaction.total)}</span>
              </div>
              <div className="total-row-item">
                <span>Bayar ({transaction.paymentMethod}):</span>
                <span>{formatRupiah(transaction.amountTendered)}</span>
              </div>
              {transaction.change !== undefined && transaction.change !== null && (
                <div className="total-row-item">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(transaction.change)}</span>
                </div>
              )}
            </div>

            {/* Footer Nota */}
            <div className="receipt-footer-greetings">
              <p>Terima Kasih</p>
              <p>Semoga Sehat Selalu</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Tutup
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Cetak Nota</span>
          </button>
        </div>
      </div>
    </div>
  );
}
