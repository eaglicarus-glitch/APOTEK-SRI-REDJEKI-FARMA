import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { formatRupiah, formatDateTime } from '../lib/constants';
import ReceiptModal from './ReceiptModal';

export default function HistoryView() {
  const { transactions, globalSearch, setGlobalSearch } = usePharmacy();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

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

  // Filter transactions
  const filtered = transactions.filter((tx) => {
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

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pageTransactions = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenDetail = (tx) => {
    setSelectedTx(tx);
    setIsReceiptOpen(true);
  };

  return (
    <section id="view-history" className="view-panel">
      <div className="content-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="content-title">Riwayat Transaksi</h1>
        </div>
      </div>

      {/* Filter Bar Sesuai Mockup (Tanggal Mulai, Tanggal Selesai, Tombol Filter) */}
      <div className="history-filter-bar-clean">
        <div className="filter-input-group">
          <label>Tanggal Mulai</label>
          <div className="input-date-wrapper">
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
        </div>

        <div className="filter-input-group">
          <label>Tanggal Selesai</label>
          <div className="input-date-wrapper">
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
        </div>

        <div className="filter-actions-group">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCurrentPage(1)}
          >
            Filter
          </button>
          {(startDate || endDate || searchQuery) && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchQuery('');
                setGlobalSearch('');
                setCurrentPage(1);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tabel Riwayat Transaksi Sesuai Mockup */}
      <div className="card table-card-clean">
        <div className="table-responsive">
          <table className="data-table" id="table-history">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>No</th>
                <th>Kode Transaksi</th>
                <th>Tanggal</th>
                <th>Pelanggan</th>
                <th>Total</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted" style={{ padding: '30px' }}>
                    Tidak ada transaksi ditemukan.
                  </td>
                </tr>
              ) : (
                pageTransactions.map((tx, idx) => (
                  <tr key={tx.id || tx.code}>
                    <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td className="fw-medium">{tx.code}</td>
                    <td>{formatDateTime(tx.dateTime)}</td>
                    <td>{tx.customer || 'Umum'}</td>
                    <td>{formatRupiah(tx.total)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-link-action"
                        onClick={() => handleOpenDetail(tx)}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination at bottom right */}
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

      {/* STRUK DETAIL NOTA */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        transaction={selectedTx}
        onClose={() => setIsReceiptOpen(false)}
      />
    </section>
  );
}
