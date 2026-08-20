import { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import type { Movement, Fund, Location } from '@/types';
import BottomNav, { type TabId } from '@/components/BottomNav';
import Modal from '@/components/Modal';
import MovementForm from '@/components/MovementForm';
import TransferForm from '@/components/TransferForm';
import FundForm from '@/components/FundForm';
import LocationForm from '@/components/LocationForm';
import CategoryForm from '@/components/CategoryForm';
import HomeView from '@/components/HomeView';
import MovementList from '@/components/MovementList';
import SummaryView from '@/components/SummaryView';
import SettingsView from '@/components/SettingsView';
import FundDetailView from '@/components/FundDetailView';
import ArchivedFunds from '@/components/ArchivedFunds';
import LocationsView from '@/components/LocationsView';
import LocationDetailView from '@/components/LocationDetailView';
import PaymentsView from '@/components/PaymentsView';
import CashCountView from '@/components/CashCountView';
import ReportGenerator from '@/components/ReportGenerator';
import PinLock from '@/components/PinLock';
import PinRecovery from '@/components/PinRecovery';
import SetupWizard from '@/components/SetupWizard';
import type { MovementWithExtra } from '@/hooks/useStore';
import { formatAmount } from '@/utils/format';

type SubView =
  | { type: 'main' }
  | { type: 'fundDetail'; fundId: string }
  | { type: 'archived' }
  | { type: 'locations' }
  | { type: 'locationDetail'; locationId: string }
  | { type: 'payments' }
  | { type: 'cashCount' };

type ModalType = 'income' | 'expense' | 'transfer' | null;

export default function App() {
  const store = useStore();
  const {
    funds, movements, categories, settings, locations, payments, loading,
    totals, fundStats, locationStats, movementsWithExtra,
    updateSettings, createFund, updateFund, archiveFund, unarchiveFund, moveFund, deleteFund,
    createLocation, updateLocation, archiveLocation, unarchiveLocation, moveLocation, deleteLocation,
    createCategory, deleteCategory, archiveCategory,
    addMovement, updateMovement, deleteMovement,
    transferBetweenFunds, transferBetweenLocations,
    createPayment, updatePayment, deletePayment, payPayment,
    adjustCashCount, exportData, importData, clearAllData,
  } = store;

  const [tab, setTab] = useState<TabId>('inicio');
  const [subView, setSubView] = useState<SubView>({ type: 'main' });
  const [modalTipo, setModalTipo] = useState<ModalType>(null);
  const [showFundForm, setShowFundForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [showCatFormInMovement, setShowCatFormInMovement] = useState(false);
  const [fundEditando, setFundEditando] = useState<Fund | null>(null);
  const [locationEditando, setLocationEditando] = useState<Location | null>(null);
  const [movimientoEditando, setMovimientoEditando] = useState<Movement | null>(null);
  const [preselectedFundId, setPreselectedFundId] = useState<string | undefined>(undefined);
  const [preselectedLocationId, setPreselectedLocationId] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState('');
  const [hidden, setHidden] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportFundId, setReportFundId] = useState<string | undefined>(undefined);
  const [showPinRecovery, setShowPinRecovery] = useState(false);

  // PIN lock check on mount
  useEffect(() => {
    if (!loading && settings?.pinEnabled) {
      setLocked(true);
    }
  }, [loading, settings]);

  // Auto lock timer
  const resetLockTimer = useCallback(() => {
    if (settings?.autoLockMinutes && settings?.pinEnabled) {
      localStorage.setItem('mi-ahorro:last-activity', Date.now().toString());
    }
  }, [settings]);

  useEffect(() => {
    if (!settings?.autoLockMinutes || !settings?.pinEnabled) return;
    const interval = setInterval(() => {
      const last = localStorage.getItem('mi-ahorro:last-activity');
      if (last) {
        const elapsed = Date.now() - Number(last);
        if (elapsed > settings.autoLockMinutes * 60 * 1000) setLocked(true);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [settings]);

  // Lock on blur (app goes to background)
  useEffect(() => {
    if (!settings?.pinEnabled || !settings?.lockOnBlur) return;
    const onBlur = () => {
      setLocked(true);
      localStorage.setItem('mi-ahorro:last-activity', '0');
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onBlur();
    });
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('blur', onBlur);
    };
  }, [settings]);

  useEffect(() => {
    const handler = () => resetLockTimer();
    window.addEventListener('click', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [resetLockTimer]);

  // Android back button / Escape handling
  useEffect(() => {
    const handleBack = (e: PopStateEvent) => {
      if (showPinRecovery) { setShowPinRecovery(false); return; }
      if (locked) return;
      if (modalTipo) { setModalTipo(null); setMovimientoEditando(null); return; }
      if (showFundForm) { setShowFundForm(false); setFundEditando(null); return; }
      if (showLocationForm) { setShowLocationForm(false); setLocationEditando(null); return; }
      if (showReport) { setShowReport(false); return; }
      if (showCatFormInMovement) { setShowCatFormInMovement(false); return; }
      if (subView.type !== 'main') {
        setSubView({ type: 'main' });
        return;
      }
      if (tab !== 'inicio') {
        setTab('inicio');
        return;
      }
    };
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [modalTipo, showFundForm, showLocationForm, showReport, showCatFormInMovement, subView, tab, locked, showPinRecovery]);

  // Escape closes modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPinRecovery) { setShowPinRecovery(false); return; }
        if (modalTipo) { setModalTipo(null); setMovimientoEditando(null); return; }
        if (showFundForm) { setShowFundForm(false); setFundEditando(null); return; }
        if (showLocationForm) { setShowLocationForm(false); setLocationEditando(null); return; }
        if (showReport) { setShowReport(false); return; }
        if (showCatFormInMovement) { setShowCatFormInMovement(false); return; }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalTipo, showFundForm, showLocationForm, showReport, showCatFormInMovement, showPinRecovery]);

  const mostrarToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const abrirAgregar = () => { setMovimientoEditando(null); setPreselectedFundId(undefined); setPreselectedLocationId(undefined); setModalTipo('income'); };
  const abrirRetirar = () => { setMovimientoEditando(null); setPreselectedFundId(undefined); setPreselectedLocationId(undefined); setModalTipo('expense'); };
  const abrirTransferir = () => { setModalTipo('transfer'); };
  const cerrarModal = () => { setModalTipo(null); setMovimientoEditando(null); };

  const handleEditarMovimiento = (m: MovementWithExtra) => {
    const original = movements.find((mv) => mv.id === m.id);
    if (!original) return;
    setMovimientoEditando(original);
    setModalTipo(original.type === 'income' ? 'income' : original.type === 'expense' ? 'expense' : 'expense');
  };

  const handleGuardarMovimiento = (data: Omit<Movement, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (movimientoEditando) {
      updateMovement(movimientoEditando.id, data).then(() => { mostrarToast('Movimiento actualizado.'); cerrarModal(); });
    } else {
      if (data.type === 'expense' && settings!.blockOverspend && !settings!.allowNegativeBalance) {
        const balance = fundStats.get(data.fundId)?.balanceCents ?? 0;
        if (data.amountInCents > balance) { mostrarToast('No puedes retirar más del saldo disponible.'); return; }
      }
      addMovement(data).then(() => { mostrarToast(data.type === 'income' ? 'Ingreso guardado.' : 'Retiro guardado.'); cerrarModal(); });
    }
  };

  const handleEliminarMovimiento = (m: MovementWithExtra) => {
    deleteMovement(m.id).then(() => mostrarToast('Movimiento eliminado.'));
  };

  const handleTransferFund = (data: { fromFundId: string; toFundId: string; amountInCents: number; movementDate: string; movementTime: string; note: string; locationId: string }) => {
    if (settings!.blockOverspend && !settings!.allowNegativeBalance) {
      const balance = fundStats.get(data.fromFundId)?.balanceCents ?? 0;
      if (data.amountInCents > balance) { mostrarToast('No puedes transferir más del saldo disponible.'); return; }
    }
    transferBetweenFunds(data).then(() => { mostrarToast('Transferencia realizada.'); cerrarModal(); });
  };

  const handleTransferLocation = (data: { fromLocationId: string; toLocationId: string; amountInCents: number; movementDate: string; movementTime: string; note: string; fundId: string }) => {
    transferBetweenLocations(data).then(() => { mostrarToast('Transferencia realizada.'); cerrarModal(); });
  };

  const handleGuardarFondo = (data: { name: string; description: string; color: string; icon: string }) => {
    if (fundEditando) {
      updateFund(fundEditando.id, data).then(() => { mostrarToast('Fondo actualizado.'); setShowFundForm(false); setFundEditando(null); });
    } else {
      createFund(data).then(() => { mostrarToast('Fondo creado.'); setShowFundForm(false); });
    }
  };

  const handleGuardarUbicacion = (data: { name: string; description: string; color: string; icon: string }) => {
    if (locationEditando) {
      updateLocation(locationEditando.id, data).then(() => { mostrarToast('Ubicación actualizada.'); setShowLocationForm(false); setLocationEditando(null); });
    } else {
      createLocation(data).then(() => { mostrarToast('Ubicación creada.'); setShowLocationForm(false); });
    }
  };

  const handleEliminarFondo = (deleteMovements: boolean) => {
    if (subView.type === 'fundDetail') {
      deleteFund(subView.fundId, deleteMovements).then(() => { mostrarToast('Fondo eliminado.'); setSubView({ type: 'main' }); });
    }
  };

  const handleExportCSV = () => {
    const headers = ['Tipo', 'Cantidad', 'Fondo', 'Fondo destino', 'Fecha', 'Hora', 'Categoria', 'Nota', 'Saldo'];
    const rows = movementsWithExtra.map((m) => {
      const tipo = m.type === 'income' ? 'Ingreso' : m.type === 'expense' ? 'Retiro' : 'Transferencia';
      return [tipo, (m.amountInCents / 100).toFixed(2), `"${m.fundName}"`, m.destinationFundName ? `"${m.destinationFundName}"` : '', m.movementDate, m.movementTime, m.categoryName, `"${m.note.replace(/"/g, '""')}"`, (m.balanceAfterCents / 100).toFixed(2)];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mi-ahorro-historial-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    mostrarToast('CSV exportado.');
  };

  const handleImport = (file: File, mode: 'replace' | 'merge') => {
    importData(file, mode).then(() => mostrarToast('Respaldo importado.')).catch(() => mostrarToast('Error: archivo inválido.'));
  };

  if (loading || !settings) {
    return (
      <div className="h-[100dvh] bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show setup wizard if not completed
  if (!settings.setupCompleted) {
    return (
      <SetupWizard
        settings={settings}
        onCreateFund={async (data) => { const f = await createFund(data); return f; }}
        onCreateLocation={async (data) => { const l = await createLocation(data); return l; }}
        onAddMovement={async (data) => { await addMovement(data); }}
        onEnablePin={(enabled) => { if (enabled) updateSettings({ pinEnabled: true, setupCompleted: true }); else updateSettings({ setupCompleted: true }); }}
        onComplete={() => { updateSettings({ setupCompleted: true }); }}
      />
    );
  }

  if (locked && settings.pinEnabled) {
    if (showPinRecovery) {
      return (
        <PinRecovery
          onBack={() => setShowPinRecovery(false)}
          onResetApp={() => { clearAllData().then(() => { setLocked(false); setShowPinRecovery(false); setSubView({ type: 'main' }); setTab('inicio'); }); }}
          onRecovered={() => { setLocked(false); setShowPinRecovery(false); resetLockTimer(); }}
        />
      );
    }
    return <PinLock onUnlock={() => { setLocked(false); resetLockTimer(); }} onForgotPin={() => setShowPinRecovery(true)} />;
  }

  const activeFunds = funds.filter((f) => !f.isArchived).map((f) => fundStats.get(f.id)!).filter(Boolean);
  const archivedFunds = funds.filter((f) => f.isArchived).map((f) => fundStats.get(f.id)!).filter(Boolean);
  const activeLocations = locations.filter((l) => !l.isArchived).map((l) => locationStats.get(l.id)!).filter(Boolean);
  const recientes = movementsWithExtra.slice(0, 5);

  const selectedFund = subView.type === 'fundDetail' ? fundStats.get(subView.fundId) : null;
  const selectedLocation = subView.type === 'locationDetail' ? locationStats.get(subView.locationId) : null;

  const showBottomNav = subView.type === 'main';

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-slate-950 text-white">
      <div className="max-w-md mx-auto w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden app-scroll px-4 pt-[env(safe-area-inset-top)] pb-4">
        <div className="pt-3" />

        {subView.type === 'fundDetail' && selectedFund ? (
          <FundDetailView
            fund={selectedFund} settings={settings} funds={funds} categories={categories} movements={movementsWithExtra}
            onBack={() => setSubView({ type: 'main' })}
            onEditar={() => { setFundEditando(funds.find((f) => f.id === selectedFund.id) ?? null); setShowFundForm(true); }}
            onAgregar={() => { setMovimientoEditando(null); setPreselectedFundId(selectedFund.id); setModalTipo('income'); }}
            onRetirar={() => { setMovimientoEditando(null); setPreselectedFundId(selectedFund.id); setModalTipo('expense'); }}
            onTransferir={() => { setPreselectedFundId(selectedFund.id); setModalTipo('transfer'); }}
            onCompartir={() => { setReportFundId(selectedFund.id); setShowReport(true); }}
            onArchivar={() => { archiveFund(selectedFund.id).then(() => { mostrarToast('Fondo archivado.'); setSubView({ type: 'main' }); }); }}
            onEliminar={handleEliminarFondo}
            onEditarMovimiento={handleEditarMovimiento}
            onEliminarMovimiento={handleEliminarMovimiento}
          />
        ) : subView.type === 'archived' ? (
          <ArchivedFunds
            funds={funds.map((f) => fundStats.get(f.id)!).filter(Boolean)} settings={settings}
            onUnarchive={(id) => { unarchiveFund(id).then(() => mostrarToast('Fondo restaurado.')); }}
            onOpen={(id) => setSubView({ type: 'fundDetail', fundId: id })}
          />
        ) : subView.type === 'locations' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSubView({ type: 'main' })} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px]">←</button>
              <h1 className="text-lg font-bold text-white">Ubicaciones</h1>
            </div>
            <LocationsView
              locations={locations.map((l) => locationStats.get(l.id)!).filter(Boolean)} settings={settings}
              onOpen={(id) => setSubView({ type: 'locationDetail', locationId: id })}
              onMove={moveLocation}
              onCrear={() => { setLocationEditando(null); setShowLocationForm(true); }}
              onUnarchive={(id) => { unarchiveLocation(id).then(() => mostrarToast('Ubicación restaurada.')); }}
            />
          </div>
        ) : subView.type === 'locationDetail' && selectedLocation ? (
          <LocationDetailView
            location={selectedLocation} settings={settings} funds={funds} locations={locations} categories={categories} movements={movementsWithExtra}
            onBack={() => setSubView({ type: 'locations' })}
            onEditar={() => { setLocationEditando(locations.find((l) => l.id === selectedLocation.id) ?? null); setShowLocationForm(true); }}
            onAgregar={() => { setMovimientoEditando(null); setPreselectedLocationId(selectedLocation.id); setModalTipo('income'); }}
            onRetirar={() => { setMovimientoEditando(null); setPreselectedLocationId(selectedLocation.id); setModalTipo('expense'); }}
            onTransferir={() => { setPreselectedLocationId(selectedLocation.id); setModalTipo('transfer'); }}
            onArchivar={() => { archiveLocation(selectedLocation.id).then(() => { mostrarToast('Ubicación archivada.'); setSubView({ type: 'locations' }); }); }}
            onEliminar={() => { deleteLocation(selectedLocation.id).then(() => { mostrarToast('Ubicación eliminada.'); setSubView({ type: 'locations' }); }); }}
            onEditarMovimiento={handleEditarMovimiento}
            onEliminarMovimiento={handleEliminarMovimiento}
          />
        ) : subView.type === 'payments' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSubView({ type: 'main' })} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px]">←</button>
              <h1 className="text-lg font-bold text-white">Pagos</h1>
            </div>
            <PaymentsView
              payments={payments} funds={funds} locations={locations} settings={settings}
              onPay={(id) => { payPayment(id).then(() => mostrarToast('Pago realizado.')); }}
              onCancel={(id) => { updatePayment(id, { status: 'cancelled' }).then(() => mostrarToast('Pago cancelado.')); }}
              onDelete={(id) => { deletePayment(id).then(() => mostrarToast('Pago eliminado.')); }}
              onCreate={(data) => { createPayment(data); mostrarToast('Pago creado.'); }}
            />
          </div>
        ) : subView.type === 'cashCount' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSubView({ type: 'main' })} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px]">←</button>
              <h1 className="text-lg font-bold text-white">Comprobar dinero</h1>
            </div>
            <CashCountView
              locations={locations.map((l) => locationStats.get(l.id)!).filter(Boolean)} settings={settings}
              onAdjust={(locId, counted, expected, note) => { adjustCashCount(locId, counted, expected, note).then(() => mostrarToast('Ajuste registrado.')); }}
            />
          </div>
        ) : tab === 'inicio' ? (
          <HomeView
            settings={settings} totals={totals} activeFunds={activeFunds} archivedFunds={archivedFunds} recientes={recientes}
            hidden={hidden} onToggleHidden={() => setHidden(!hidden)}
            onOpenFund={(id) => setSubView({ type: 'fundDetail', fundId: id })}
            onMoveFund={(id, dir) => moveFund(id, dir)}
            onAgregar={abrirAgregar} onRetirar={abrirRetirar} onTransferir={abrirTransferir}
            onCrearFondo={() => { setFundEditando(null); setShowFundForm(true); }}
            onCompartir={() => { setReportFundId(undefined); setShowReport(true); }}
            onVerArchivados={() => setSubView({ type: 'archived' })}
          />
        ) : tab === 'movimientos' ? (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-white pt-1">Movimientos</h1>
            <MovementList movimientos={movementsWithExtra} funds={funds} settings={settings}
              onEditar={handleEditarMovimiento} onEliminar={handleEliminarMovimiento} />
          </div>
        ) : tab === 'resumen' ? (
          <SummaryView funds={activeFunds} movements={movementsWithExtra} totals={totals} settings={settings} />
        ) : tab === 'configuracion' ? (
          <SettingsView
            settings={settings} funds={funds} categories={categories} movements={movements} locations={locations}
            onUpdateSettings={updateSettings}
            onExportJSON={() => { exportData(); mostrarToast('Respaldo exportado.'); }}
            onExportCSV={handleExportCSV}
            onImport={handleImport}
            onClearAll={() => { clearAllData().then(() => mostrarToast('Todos los datos fueron borrados.')); }}
            onCreateCategory={(data) => { createCategory(data); mostrarToast('Categoría creada.'); }}
            onDeleteCategory={(id) => { deleteCategory(id); mostrarToast('Categoría eliminada.'); }}
            onArchiveCategory={(id) => { archiveCategory(id); mostrarToast('Categoría archivada.'); }}
            onOpenFundsManager={() => setSubView({ type: 'archived' })}
            onOpenLocationsManager={() => setSubView({ type: 'locations' })}
            onOpenPayments={() => setSubView({ type: 'payments' })}
            onOpenCashCount={() => setSubView({ type: 'cashCount' })}
          />
        ) : null}
      </div>

      {showBottomNav && (
        <BottomNav active={tab} onChange={setTab} onAdd={abrirAgregar} />
      )}

      {/* Movement modal */}
      <Modal open={modalTipo === 'income' || modalTipo === 'expense'} onClose={cerrarModal}
        title={movimientoEditando ? 'Editar movimiento' : modalTipo === 'income' ? 'Agregar dinero' : 'Retirar dinero'}>
        {(modalTipo === 'income' || modalTipo === 'expense') && (
          <>
            {showCatFormInMovement ? (
              <CategoryForm open={showCatFormInMovement} type={modalTipo === 'income' ? 'income' : 'expense'}
                onGuardar={(data) => { createCategory(data); setShowCatFormInMovement(false); mostrarToast('Categoría creada.'); }}
                onCancelar={() => setShowCatFormInMovement(false)} />
            ) : (
              <MovementForm
                open={modalTipo !== null} tipo={modalTipo as 'income' | 'expense'}
                settings={settings} funds={funds} locations={locations} categories={categories}
                preselectedFundId={preselectedFundId} movimientoEditando={movimientoEditando}
                onGuardar={handleGuardarMovimiento} onCancelar={cerrarModal}
                onCreateCategory={() => setShowCatFormInMovement(true)}
              />
            )}
          </>
        )}
      </Modal>

      {/* Transfer modal */}
      <Modal open={modalTipo === 'transfer'} onClose={cerrarModal} title="Transferir dinero">
        {modalTipo === 'transfer' && (
          <TransferForm
            open={modalTipo === 'transfer'} settings={settings} funds={funds} locations={locations}
            preselectedFundId={preselectedFundId} preselectedLocationId={preselectedLocationId}
            onTransferFund={handleTransferFund} onTransferLocation={handleTransferLocation} onCancelar={cerrarModal}
          />
        )}
      </Modal>

      {/* Fund form modal */}
      <Modal open={showFundForm} onClose={() => { setShowFundForm(false); setFundEditando(null); }}
        title={fundEditando ? 'Editar fondo' : 'Crear fondo'}>
        <FundForm open={showFundForm} fundEditando={fundEditando} onGuardar={handleGuardarFondo}
          onCancelar={() => { setShowFundForm(false); setFundEditando(null); }} />
      </Modal>

      {/* Location form modal */}
      <Modal open={showLocationForm} onClose={() => { setShowLocationForm(false); setLocationEditando(null); }}
        title={locationEditando ? 'Editar ubicación' : 'Crear ubicación'}>
        <LocationForm open={showLocationForm} locationEditando={locationEditando} onGuardar={handleGuardarUbicacion}
          onCancelar={() => { setShowLocationForm(false); setLocationEditando(null); }} />
      </Modal>

      {/* Report generator */}
      <ReportGenerator open={showReport} movements={movementsWithExtra} funds={funds} settings={settings}
        preselectedFundId={reportFundId} onCerrar={() => setShowReport(false)} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 inset-x-0 z-[55] flex justify-center px-4 animate-[fadeIn_200ms_ease]">
          <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg shadow-emerald-500/30 text-sm font-medium">
            <Check size={16} /> {toast}
          </div>
        </div>
      )}
    </div>
  );
}
