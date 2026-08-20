import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppSettings, AuditLog, Category, Fund, Location, Movement, Payment } from '@/types';
import { storage } from '@/storage/storage';
import { generateId, nowISO } from '@/utils/format';

export interface FundWithStats extends Fund {
  balanceCents: number;
  totalIncomeCents: number;
  totalExpenseCents: number;
  lastMovementDate: string | null;
  movementCount: number;
}

export interface LocationWithStats extends Location {
  balanceCents: number;
  totalIncomeCents: number;
  totalExpenseCents: number;
  movementCount: number;
}

export interface MovementWithExtra extends Movement {
  fundName: string;
  fundColor: string;
  fundIcon: string;
  locationName: string;
  locationColor: string;
  locationIcon: string;
  destinationFundName?: string;
  destinationLocationName?: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  balanceAfterCents: number;
}

export interface Totals {
  grandTotalCents: number;
  totalIncomeCents: number;
  totalExpenseCents: number;
  activeFundCount: number;
  lastMovementDate: string | null;
  committedCents: number;
  freeCents: number;
  pendingVerificationCents: number;
}

export function useStore() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [f, m, c, s, l, p, a] = await Promise.all([
      storage.getFunds(), storage.getMovements(), storage.getCategories(), storage.getSettings(),
      storage.getLocations(), storage.getPayments(), storage.getAuditLogs(),
    ]);
    setFunds(f); setMovements(m); setCategories(c); setSettings(s);
    setLocations(l); setPayments(p); setAuditLogs(a);
    setLoading(false);
  }, []);

  useEffect(() => { storage.init().then(refresh); }, [refresh]);

  // --- Audit ---
  const logAudit = useCallback(async (entry: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const log: AuditLog = { ...entry, id: generateId(), timestamp: nowISO() };
    await storage.saveAuditLog(log);
    setAuditLogs((prev) => [log, ...prev]);
  }, []);

  // --- Settings ---
  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await storage.saveSettings(updated);
  }, [settings]);

  // --- Funds ---
  const createFund = useCallback(async (data: Pick<Fund, 'name' | 'description' | 'color' | 'icon'>) => {
    const now = nowISO();
    const fund: Fund = { id: generateId(), name: data.name, description: data.description, color: data.color, icon: data.icon, order: funds.length, isArchived: false, isCommitted: false, committedNote: '', goalAmountCents: null, goalDate: null, createdAt: now, updatedAt: now };
    await storage.saveFund(fund);
    setFunds((prev) => [...prev, fund]);
    return fund;
  }, [funds.length]);

  const updateFund = useCallback(async (id: string, patch: Partial<Fund>) => {
    const fund = funds.find((f) => f.id === id);
    if (!fund) return;
    const updated = { ...fund, ...patch, updatedAt: nowISO() };
    await storage.saveFund(updated);
    setFunds((prev) => prev.map((f) => (f.id === id ? updated : f)));
  }, [funds]);

  const archiveFund = useCallback(async (id: string) => { await updateFund(id, { isArchived: true }); }, [updateFund]);
  const unarchiveFund = useCallback(async (id: string) => { await updateFund(id, { isArchived: false }); }, [updateFund]);

  const moveFund = useCallback(async (id: string, direction: 'up' | 'down') => {
    const sorted = [...funds].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((f) => f.id === id);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const tmp = sorted[idx].order;
    sorted[idx].order = sorted[swapIdx].order;
    sorted[swapIdx].order = tmp;
    const updated = sorted.map((f) => ({ ...f, updatedAt: nowISO() }));
    setFunds(updated.sort((a, b) => a.order - b.order));
    for (const f of updated) await storage.saveFund(f);
  }, [funds]);

  const deleteFund = useCallback(async (id: string, deleteMovements: boolean) => {
    if (deleteMovements) {
      const fundMvts = movements.filter((m) => m.fundId === id || m.destinationFundId === id);
      for (const m of fundMvts) { await storage.deleteMovement(m.id); await logAudit({ action: 'delete', movementId: m.id, beforeData: JSON.stringify(m), afterData: '', reason: `Fondo eliminado: ${id}` }); }
      setMovements((prev) => prev.filter((m) => m.fundId !== id && m.destinationFundId !== id));
    }
    await storage.deleteFund(id);
    setFunds((prev) => prev.filter((f) => f.id !== id));
  }, [movements, logAudit]);

  // --- Locations ---
  const createLocation = useCallback(async (data: Pick<Location, 'name' | 'description' | 'color' | 'icon'>) => {
    const now = nowISO();
    const loc: Location = { id: generateId(), name: data.name, description: data.description, color: data.color, icon: data.icon, order: locations.length, isArchived: false, createdAt: now, updatedAt: now };
    await storage.saveLocation(loc);
    setLocations((prev) => [...prev, loc]);
    return loc;
  }, [locations.length]);

  const updateLocation = useCallback(async (id: string, patch: Partial<Location>) => {
    const loc = locations.find((l) => l.id === id);
    if (!loc) return;
    const updated = { ...loc, ...patch, updatedAt: nowISO() };
    await storage.saveLocation(updated);
    setLocations((prev) => prev.map((l) => (l.id === id ? updated : l)));
  }, [locations]);

  const archiveLocation = useCallback(async (id: string) => { await updateLocation(id, { isArchived: true }); }, [updateLocation]);
  const unarchiveLocation = useCallback(async (id: string) => { await updateLocation(id, { isArchived: false }); }, [updateLocation]);

  const moveLocation = useCallback(async (id: string, direction: 'up' | 'down') => {
    const sorted = [...locations].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const tmp = sorted[idx].order;
    sorted[idx].order = sorted[swapIdx].order;
    sorted[swapIdx].order = tmp;
    const updated = sorted.map((l) => ({ ...l, updatedAt: nowISO() }));
    setLocations(updated.sort((a, b) => a.order - b.order));
    for (const l of updated) await storage.saveLocation(l);
  }, [locations]);

  const deleteLocation = useCallback(async (id: string) => {
    await storage.deleteLocation(id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // --- Categories ---
  const createCategory = useCallback(async (data: Pick<Category, 'name' | 'type' | 'color' | 'icon'>) => {
    const cat: Category = { ...data, id: generateId(), isCustom: true, isArchived: false, order: categories.length };
    await storage.saveCategory(cat);
    setCategories((prev) => [...prev, cat]);
    return cat;
  }, [categories.length]);

  const updateCategory = useCallback(async (id: string, patch: Partial<Category>) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const updated = { ...cat, ...patch };
    await storage.saveCategory(updated);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, [categories]);

  const archiveCategory = useCallback(async (id: string) => { await updateCategory(id, { isArchived: true }); }, [updateCategory]);
  const unarchiveCategory = useCallback(async (id: string) => { await updateCategory(id, { isArchived: false }); }, [updateCategory]);

  const moveCategory = useCallback(async (id: string, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === id);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const tmp = sorted[idx].order;
    sorted[idx].order = sorted[swapIdx].order;
    sorted[swapIdx].order = tmp;
    const updated = sorted.map((c) => ({ ...c }));
    setCategories(updated.sort((a, b) => a.order - b.order));
    for (const c of updated) await storage.saveCategory(c);
  }, [categories]);

  const deleteCategory = useCallback(async (id: string) => {
    await storage.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reassignCategoryMovements = useCallback(async (fromId: string, toId: string) => {
    const updated = movements.map((m) => m.categoryId === fromId ? { ...m, categoryId: toId, updatedAt: nowISO() } : m);
    for (const m of updated) {
      if (m.categoryId === toId) await storage.saveMovement(m);
    }
    setMovements(updated);
  }, [movements]);

  // --- Movements ---
  const addMovement = useCallback(async (data: Omit<Movement, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = nowISO();
    const mvt: Movement = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await storage.saveMovement(mvt);
    setMovements((prev) => [...prev, mvt]);
    await logAudit({ action: 'create', movementId: mvt.id, beforeData: '', afterData: JSON.stringify(mvt), reason: '' });
    return mvt;
  }, [logAudit]);

  const updateMovement = useCallback(async (id: string, patch: Partial<Movement>, reason: string = '') => {
    const mvt = movements.find((m) => m.id === id);
    if (!mvt) return;
    const before = JSON.stringify(mvt);
    const updated = { ...mvt, ...patch, updatedAt: nowISO() };
    await storage.saveMovement(updated);
    setMovements((prev) => prev.map((m) => (m.id === id ? updated : m)));
    await logAudit({ action: 'edit', movementId: id, beforeData: before, afterData: JSON.stringify(updated), reason });
  }, [movements, logAudit]);

  const deleteMovement = useCallback(async (id: string, reason: string = '') => {
    const mvt = movements.find((m) => m.id === id);
    if (!mvt) return;
    const before = JSON.stringify(mvt);
    if (mvt.transferId) {
      const pair = movements.find((m) => m.transferId === mvt.transferId && m.id !== id);
      if (pair) {
        await storage.deleteMovement(pair.id);
        await logAudit({ action: 'delete', movementId: pair.id, beforeData: JSON.stringify(pair), afterData: '', reason: `Transferencia eliminada (par) ${reason}` });
        setMovements((prev) => prev.filter((m) => m.id !== id && m.id !== pair.id));
        return;
      }
    }
    await storage.deleteMovement(id);
    await logAudit({ action: 'delete', movementId: id, beforeData: before, afterData: '', reason });
    setMovements((prev) => prev.filter((m) => m.id !== id));
  }, [movements, logAudit]);

  // --- Transfers between funds ---
  const transferBetweenFunds = useCallback(async (data: { fromFundId: string; toFundId: string; amountInCents: number; movementDate: string; movementTime: string; note: string; locationId: string; }) => {
    const now = nowISO();
    const transferId = generateId();
    const origin: Movement = { id: generateId(), fundId: data.fromFundId, locationId: data.locationId, type: 'transfer', amountInCents: data.amountInCents, categoryId: '', note: data.note, movementDate: data.movementDate, movementTime: data.movementTime, transferId, destinationFundId: data.toFundId, isInitialBalance: false, verificationStatus: 'verified', recipientName: '', verificationNote: '', verificationDeadline: null, receiptData: null, createdAt: now, updatedAt: now };
    const dest: Movement = { id: generateId(), fundId: data.toFundId, locationId: data.locationId, type: 'transfer', amountInCents: data.amountInCents, categoryId: '', note: data.note, movementDate: data.movementDate, movementTime: data.movementTime, transferId, destinationFundId: data.fromFundId, isInitialBalance: false, verificationStatus: 'verified', recipientName: '', verificationNote: '', verificationDeadline: null, receiptData: null, createdAt: now, updatedAt: now };
    await storage.saveMovement(origin);
    await storage.saveMovement(dest);
    setMovements((prev) => [...prev, origin, dest]);
  }, []);

  // --- Transfers between locations ---
  const transferBetweenLocations = useCallback(async (data: { fromLocationId: string; toLocationId: string; amountInCents: number; movementDate: string; movementTime: string; note: string; fundId: string; }) => {
    const now = nowISO();
    const transferId = generateId();
    const origin: Movement = { id: generateId(), fundId: data.fundId, locationId: data.fromLocationId, type: 'transfer_location', amountInCents: data.amountInCents, categoryId: '', note: data.note, movementDate: data.movementDate, movementTime: data.movementTime, transferId, destinationLocationId: data.toLocationId, isInitialBalance: false, verificationStatus: 'verified', recipientName: '', verificationNote: '', verificationDeadline: null, receiptData: null, createdAt: now, updatedAt: now };
    const dest: Movement = { id: generateId(), fundId: data.fundId, locationId: data.toLocationId, type: 'transfer_location', amountInCents: data.amountInCents, categoryId: '', note: data.note, movementDate: data.movementDate, movementTime: data.movementTime, transferId, destinationLocationId: data.fromLocationId, isInitialBalance: false, verificationStatus: 'verified', recipientName: '', verificationNote: '', verificationDeadline: null, receiptData: null, createdAt: now, updatedAt: now };
    await storage.saveMovement(origin);
    await storage.saveMovement(dest);
    setMovements((prev) => [...prev, origin, dest]);
  }, []);

  // --- Payments ---
  const createPayment = useCallback(async (data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'linkedMovementId'>) => {
    const now = nowISO();
    const pay: Payment = { ...data, id: generateId(), linkedMovementId: null, createdAt: now, updatedAt: now };
    await storage.savePayment(pay);
    setPayments((prev) => [...prev, pay]);
    return pay;
  }, []);

  const updatePayment = useCallback(async (id: string, patch: Partial<Payment>) => {
    const pay = payments.find((p) => p.id === id);
    if (!pay) return;
    const updated = { ...pay, ...patch, updatedAt: nowISO() };
    await storage.savePayment(updated);
    setPayments((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }, [payments]);

  const deletePayment = useCallback(async (id: string) => {
    await storage.deletePayment(id);
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const payPayment = useCallback(async (paymentId: string) => {
    const pay = payments.find((p) => p.id === paymentId);
    if (!pay || pay.status !== 'pending') return;
    const now = nowISO();
    const mvt: Movement = {
      id: generateId(), fundId: pay.fundId, locationId: pay.locationId, type: 'expense',
      amountInCents: pay.amountCents, categoryId: '', note: `Pago: ${pay.concept}`,
      movementDate: now.slice(0, 10), movementTime: now.slice(11, 16),
      isInitialBalance: false, verificationStatus: 'verified', recipientName: '', verificationNote: '', verificationDeadline: null, receiptData: null,
      createdAt: now, updatedAt: now,
    };
    await storage.saveMovement(mvt);
    setMovements((prev) => [...prev, mvt]);
    const updatedPay = { ...pay, status: 'paid' as const, linkedMovementId: mvt.id, updatedAt: now };
    await storage.savePayment(updatedPay);
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? updatedPay : p)));
    await logAudit({ action: 'create', movementId: mvt.id, beforeData: '', afterData: JSON.stringify(mvt), reason: `Pago realizado: ${pay.concept}` });
  }, [payments, logAudit]);

  // --- Cash count (comprobar dinero) ---
  const adjustCashCount = useCallback(async (locationId: string, countedCents: number, expectedCents: number, note: string) => {
    const diff = countedCents - expectedCents;
    if (diff === 0) return;
    const now = nowISO();
    const type = diff > 0 ? 'income' : 'expense';
    const mvt: Movement = {
      id: generateId(), fundId: '', locationId, type, amountInCents: Math.abs(diff), categoryId: '',
      note: `Ajuste por comprobación: ${note}`, movementDate: now.slice(0, 10), movementTime: now.slice(11, 16),
      isInitialBalance: false, verificationStatus: 'adjusted', recipientName: '', verificationNote: note, verificationDeadline: null, receiptData: null,
      createdAt: now, updatedAt: now,
    };
    await storage.saveMovement(mvt);
    setMovements((prev) => [...prev, mvt]);
    await logAudit({ action: 'adjust', movementId: mvt.id, beforeData: `Esperado: ${expectedCents}`, afterData: `Contado: ${countedCents}`, reason: note });
  }, [logAudit]);

  // --- Integrity check ---
  const checkIntegrity = useCallback((): { ok: boolean; issues: string[] } => {
    const issues: string[] = [];
    const fundIds = new Set(funds.map((f) => f.id));
    const locationIds = new Set(locations.map((l) => l.id));
    const seenIds = new Set<string>();
    for (const m of movements) {
      if (seenIds.has(m.id)) issues.push(`Movimiento duplicado: ${m.id}`);
      seenIds.add(m.id);
      if (!fundIds.has(m.fundId) && m.fundId) issues.push(`Movimiento ${m.id} sin fondo válido`);
      if (!locationIds.has(m.locationId) && m.locationId) issues.push(`Movimiento ${m.id} sin ubicación válida`);
      if (m.transferId) {
        const pairs = movements.filter((x) => x.transferId === m.transferId);
        if (pairs.length !== 2) issues.push(`Transferencia incomplea: ${m.transferId} (${pairs.length} lados)`);
      }
    }
    return { ok: issues.length === 0, issues };
  }, [funds, locations, movements]);

  // --- Backups ---
  const exportData = useCallback(async (includeReceipts: boolean = false) => {
    const data = await storage.exportAll(includeReceipts);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mi-ahorro-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await updateSettings({ lastBackupAt: nowISO() });
  }, [updateSettings]);

  const importData = useCallback(async (file: File, mode: 'replace' | 'merge') => {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.funds || !data.movements) throw new Error('Archivo inválido');
    await storage.importAll(data, mode);
    await refresh();
  }, [refresh]);

  const clearAllData = useCallback(async () => {
    await storage.clearAll();
    await refresh();
  }, [refresh]);

  // --- Derived data ---
  const fundStats = useMemo((): Map<string, FundWithStats> => {
    const map = new Map<string, FundWithStats>();
    for (const f of funds) {
      map.set(f.id, { ...f, balanceCents: 0, totalIncomeCents: 0, totalExpenseCents: 0, lastMovementDate: null, movementCount: 0 });
    }
    for (const m of movements) {
      const stats = map.get(m.fundId);
      if (!stats) continue;
      stats.movementCount++;
      if (!stats.lastMovementDate || m.movementDate > stats.lastMovementDate) stats.lastMovementDate = m.movementDate;
      if (m.type === 'income') { stats.balanceCents += m.amountInCents; stats.totalIncomeCents += m.amountInCents; }
      else if (m.type === 'expense') { stats.balanceCents -= m.amountInCents; stats.totalExpenseCents += m.amountInCents; }
      else if (m.type === 'transfer') {
        if (m.destinationFundId) { stats.balanceCents -= m.amountInCents; stats.totalExpenseCents += m.amountInCents; }
        else { stats.balanceCents += m.amountInCents; stats.totalIncomeCents += m.amountInCents; }
      }
    }
    return map;
  }, [funds, movements]);

  const locationStats = useMemo((): Map<string, LocationWithStats> => {
    const map = new Map<string, LocationWithStats>();
    for (const l of locations) {
      map.set(l.id, { ...l, balanceCents: 0, totalIncomeCents: 0, totalExpenseCents: 0, movementCount: 0 });
    }
    for (const m of movements) {
      const stats = map.get(m.locationId);
      if (!stats) continue;
      stats.movementCount++;
      if (m.type === 'income') { stats.balanceCents += m.amountInCents; stats.totalIncomeCents += m.amountInCents; }
      else if (m.type === 'expense') { stats.balanceCents -= m.amountInCents; stats.totalExpenseCents += m.amountInCents; }
      else if (m.type === 'transfer') {
        // Fund transfer: location stays same, no location change
      } else if (m.type === 'transfer_location') {
        if (m.destinationLocationId) { stats.balanceCents -= m.amountInCents; stats.totalExpenseCents += m.amountInCents; }
        else { stats.balanceCents += m.amountInCents; stats.totalIncomeCents += m.amountInCents; }
      }
    }
    return map;
  }, [locations, movements]);

  const totals: Totals = useMemo(() => {
    let grandTotal = 0, totalIncome = 0, totalExpense = 0, lastDate: string | null = null, activeCount = 0;
    let committed = 0, pendingVerification = 0;
    for (const f of funds) {
      if (!f.isArchived) activeCount++;
      const stats = fundStats.get(f.id);
      if (!stats) continue;
      if (!f.isArchived || stats.balanceCents !== 0) grandTotal += stats.balanceCents;
      totalIncome += stats.totalIncomeCents;
      totalExpense += stats.totalExpenseCents;
      if (stats.lastMovementDate && (!lastDate || stats.lastMovementDate > lastDate)) lastDate = stats.lastMovementDate;
      if (f.isCommitted && stats.balanceCents > 0) committed += stats.balanceCents;
    }
    for (const m of movements) {
      if (m.verificationStatus === 'pending' && m.type === 'expense') pendingVerification += m.amountInCents;
    }
    return {
      grandTotalCents: grandTotal, totalIncomeCents: totalIncome, totalExpenseCents: totalExpense,
      activeFundCount: activeCount, lastMovementDate: lastDate,
      committedCents: committed, freeCents: grandTotal - committed, pendingVerificationCents: pendingVerification,
    };
  }, [funds, fundStats, movements]);

  const movementsWithExtra: MovementWithExtra[] = useMemo(() => {
    const sorted = [...movements].sort((a, b) => {
      const da = new Date(a.movementDate + 'T' + a.movementTime).getTime();
      const db = new Date(b.movementDate + 'T' + b.movementTime).getTime();
      if (da !== db) return da - db;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    const balances = new Map<string, number>();
    for (const f of funds) balances.set(f.id, 0);

    const result: MovementWithExtra[] = sorted.map((m) => {
      const fund = funds.find((f) => f.id === m.fundId);
      const destFund = m.destinationFundId ? funds.find((f) => f.id === m.destinationFundId) : undefined;
      const loc = locations.find((l) => l.id === m.locationId);
      const destLoc = m.destinationLocationId ? locations.find((l) => l.id === m.destinationLocationId) : undefined;
      const cat = categories.find((c) => c.id === m.categoryId);

      let delta = 0;
      if (m.type === 'income') delta = m.amountInCents;
      else if (m.type === 'expense') delta = -m.amountInCents;
      else if (m.type === 'transfer') delta = m.destinationFundId ? -m.amountInCents : m.amountInCents;
      else if (m.type === 'transfer_location') delta = m.destinationLocationId ? -m.amountInCents : m.amountInCents;

      const current = balances.get(m.fundId) || 0;
      const newBalance = current + delta;
      balances.set(m.fundId, newBalance);

      return {
        ...m,
        fundName: fund?.name ?? 'Sin fondo', fundColor: fund?.color ?? '#64748b', fundIcon: fund?.icon ?? 'Wallet',
        locationName: loc?.name ?? 'Sin ubicación', locationColor: loc?.color ?? '#64748b', locationIcon: loc?.icon ?? 'Wallet',
        destinationFundName: destFund?.name, destinationLocationName: destLoc?.name,
        categoryName: cat?.name ?? (m.type === 'transfer' || m.type === 'transfer_location' ? 'Transferencia' : 'Sin categoría'),
        categoryColor: cat?.color ?? '#64748b', categoryIcon: cat?.icon ?? 'Circle',
        balanceAfterCents: newBalance,
      };
    });
    return result.reverse();
  }, [movements, funds, locations, categories]);

  const getFundMovements = useCallback((fundId: string): MovementWithExtra[] => {
    return movementsWithExtra.filter((m) => m.fundId === fundId || m.destinationFundId === fundId);
  }, [movementsWithExtra]);

  const getLocationMovements = useCallback((locationId: string): MovementWithExtra[] => {
    return movementsWithExtra.filter((m) => m.locationId === locationId || m.destinationLocationId === locationId);
  }, [movementsWithExtra]);

  return {
    funds, movements, categories, settings, locations, payments, auditLogs, loading,
    totals, fundStats, locationStats, movementsWithExtra,
    refresh, updateSettings,
    createFund, updateFund, archiveFund, unarchiveFund, moveFund, deleteFund,
    createLocation, updateLocation, archiveLocation, unarchiveLocation, moveLocation, deleteLocation,
    createCategory, updateCategory, archiveCategory, unarchiveCategory, moveCategory, deleteCategory, reassignCategoryMovements,
    addMovement, updateMovement, deleteMovement,
    transferBetweenFunds, transferBetweenLocations,
    createPayment, updatePayment, deletePayment, payPayment,
    adjustCashCount, checkIntegrity, logAudit,
    exportData, importData, clearAllData,
    getFundMovements, getLocationMovements,
  };
}
