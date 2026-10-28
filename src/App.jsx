import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PharmacyProvider, usePharmacy } from './context/PharmacyContext';
import { ToastProvider, useToast } from './context/ToastContext';
import LoginView from './components/LoginView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import PosView from './components/PosView';
import HistoryView from './components/HistoryView';
import InventoryView from './components/InventoryView';
import MedicinesView from './components/MedicinesView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import ConfirmModal from './components/ConfirmModal';
import ApotekLogo from './components/ApotekLogo';

function MainApp() {
  const { currentUser, loading, logout } = useAuth();
  const { activeView, setActiveView } = usePharmacy();
  const { showToast } = useToast();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0066CC', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Memuat Sistem Apotek...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  const handleToggleSidebar = () => {
    if (window.innerWidth < 900) {
      setIsOpenMobile((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    showToast('Anda telah keluar dari sistem.', 'info');
  };

  return (
    <div id="app-shell" className={isSidebarCollapsed ? 'sidebar-collapsed' : ''}>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        onConfirmLogout={() => setIsLogoutModalOpen(true)}
      />

      <div className="app-main-wrapper">
        <Header onToggleSidebar={handleToggleSidebar} />

        <main className="app-content">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'pos' && <PosView />}
          {activeView === 'history' && <HistoryView />}

          {/* Akses Terbatas untuk Peran Apoteker / Owner */}
          {['inventory', 'medicines', 'reports', 'settings'].includes(activeView) && (
            currentUser?.role === 'Kasir' ? (
              <div className="card text-center" style={{ padding: '48px 24px', maxWidth: '520px', margin: '40px auto' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--color-danger, #EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--primary-text)' }}>Akses Dibatasi</h2>
                <p style={{ fontSize: '13px', color: 'var(--secondary-text)', lineHeight: '1.6', marginBottom: '24px' }}>
                  Akun Anda dengan peran <strong>Kasir</strong> tidak memiliki kewenangan untuk mengakses modul manajemen ini. Modul ini dikhususkan untuk <strong>Apoteker / Owner</strong>.
                </p>
                <button type="button" className="btn btn-primary" onClick={() => setActiveView('pos')}>
                  Buka Kasir Penjualan
                </button>
              </div>
            ) : (
              <>
                {activeView === 'inventory' && <InventoryView />}
                {activeView === 'medicines' && <MedicinesView />}
                {activeView === 'reports' && <ReportsView />}
                {activeView === 'settings' && <SettingsView />}
              </>
            )
          )}
        </main>

        {/* Bottom Status / Footer Bar Persis Mockup */}
        <footer className="app-bottom-bar">
          <div className="bottom-bar-left">
            <ApotekLogo size={18} />
            <span className="bottom-bar-brand">Apotek Sri Redjeki Farma</span>
            <span className="bottom-bar-divider">|</span>
            <span className="bottom-bar-subtitle">Web Kasir &amp; Manajemen Stok</span>
          </div>
          <div className="bottom-bar-right">
            <span>Mudah &bull; Cepat &bull; Akurat</span>
          </div>
        </footer>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari sistem kasir Apotek Sri Redjeki Farma?"
        confirmText="Keluar"
        isDanger={true}
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <PharmacyProvider>
          <MainApp />
        </PharmacyProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
