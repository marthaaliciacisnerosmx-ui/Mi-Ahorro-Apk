import type { AppSettings, AuditLog, Category, Fund, Location, Movement, Payment, PinSecurity } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { generateId, nowISO } from '@/utils/format';

const DB_NAME = 'mi-ahorro-db';
const DB_VERSION = 3;
const STORE_FUNDS = 'funds';
const STORE_MOVEMENTS = 'movements';
const STORE_CATEGORIES = 'categories';
const STORE_SETTINGS = 'settings';
const STORE_LOCATIONS = 'locations';
const STORE_PAYMENTS = 'payments';
const STORE_AUDIT = 'audit';
const STORE_PIN = 'pin';
const STORE_MIGRATIONS = 'migrations';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FUNDS)) db.createObjectStore(STORE_FUNDS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_MOVEMENTS)) db.createObjectStore(STORE_MOVEMENTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORE_LOCATIONS)) db.createObjectStore(STORE_LOCATIONS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_PAYMENTS)) db.createObjectStore(STORE_PAYMENTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_AUDIT)) db.createObjectStore(STORE_AUDIT, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_PIN)) db.createObjectStore(STORE_PIN, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORE_MIGRATIONS)) db.createObjectStore(STORE_MIGRATIONS, { keyPath: 'key' });

      // v2 -> v3: add isArchived and order to categories
      if (event.oldVersion < 3) {
        const tx = (event.target as IDBOpenDBRequest).transaction;
        if (tx) {
          const catStore = tx.objectStore(STORE_CATEGORIES);
          const catReq = catStore.getAll();
          catReq.onsuccess = () => {
            for (const c of (catReq.result as Category[]) || []) {
              if (c.isArchived === undefined) {
                catStore.put({ ...c, isArchived: false, order: 0 });
              }
            }
          };
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

function txAll<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T[]>): Promise<T[]> {
  return tx(store, mode, fn) as Promise<T[]>;
}

async function hasMigration(key: string): Promise<boolean> {
  const result = await tx<{ key: string } | undefined>(STORE_MIGRATIONS, 'readonly', (s) => s.get(key));
  return !!result;
}

async function markMigration(key: string): Promise<void> {
  await tx(STORE_MIGRATIONS, 'readwrite', (s) => s.put({ key, done: true, at: nowISO() }));
}

// One-time migration to remove known demo data from previous versions.
// Demo funds had specific names; we detect and remove them only if they match exactly.
async function clearDemoDataMigration(): Promise<void> {
  if (await hasMigration('clear-demo-data-v1')) return;

  const DEMO_FUND_NAMES = ['Mi dinero', 'Dinero de mamá', 'Pagos de la escuela', 'Vacaciones'];
  const funds = await txAll<Fund>(STORE_FUNDS, 'readonly', (s) => s.getAll());
  const demoFunds = (funds || []).filter((f) => DEMO_FUND_NAMES.includes(f.name));
  const demoFundIds = new Set(demoFunds.map((f) => f.id));

  // Only proceed if ALL four demo funds are present (strong signal this is the demo dataset)
  if (demoFunds.length === DEMO_FUND_NAMES.length) {
    // Remove movements associated with demo funds
    const movements = await txAll<Movement>(STORE_MOVEMENTS, 'readonly', (s) => s.getAll());
    for (const m of (movements || [])) {
      if (demoFundIds.has(m.fundId) || (m.destinationFundId && demoFundIds.has(m.destinationFundId))) {
        await tx(STORE_MOVEMENTS, 'readwrite', (s) => s.delete(m.id));
      }
    }
    // Remove demo funds
    for (const f of demoFunds) {
      await tx(STORE_FUNDS, 'readwrite', (s) => s.delete(f.id));
    }
    // Remove demo payments
    const payments = await txAll<Payment>(STORE_PAYMENTS, 'readonly', (s) => s.getAll());
    for (const p of (payments || [])) {
      if (demoFundIds.has(p.fundId)) {
        await tx(STORE_PAYMENTS, 'readwrite', (s) => s.delete(p.id));
      }
    }
  }

  // Remove demo locations (only if all three match)
  const DEMO_LOCATION_NAMES = ['Efectivo', 'Cuenta bancaria', 'Tarjeta'];
  const locations = await txAll<Location>(STORE_LOCATIONS, 'readonly', (s) => s.getAll());
  const demoLocations = (locations || []).filter((l) => DEMO_LOCATION_NAMES.includes(l.name));
  if (demoLocations.length === DEMO_LOCATION_NAMES.length) {
    for (const l of demoLocations) {
      await tx(STORE_LOCATIONS, 'readwrite', (s) => s.delete(l.id));
    }
  }

  // Remove default (non-custom) categories from previous seed
  const categories = await txAll<Category>(STORE_CATEGORIES, 'readonly', (s) => s.getAll());
  for (const c of (categories || [])) {
    if (!c.isCustom) {
      await tx(STORE_CATEGORIES, 'readwrite', (s) => s.delete(c.id));
    }
  }

  // Clear audit logs from demo
  await tx(STORE_AUDIT, 'readwrite', (s) => s.clear());

  await markMigration('clear-demo-data-v1');
}

async function ensureSettings(): Promise<void> {
  const result = await tx<{ key: string; value: AppSettings } | undefined>(STORE_SETTINGS, 'readonly', (s) => s.get('settings'));
  if (!result) {
    await tx(STORE_SETTINGS, 'readwrite', (s) => s.put({ key: 'settings', value: DEFAULT_SETTINGS }));
  } else {
    // Merge any new fields from DEFAULT_SETTINGS that might be missing
    const merged = { ...DEFAULT_SETTINGS, ...result.value };
    await tx(STORE_SETTINGS, 'readwrite', (s) => s.put({ key: 'settings', value: merged }));
  }
}

export const storage = {
  async init(): Promise<void> {
    await openDB();
    await clearDemoDataMigration();
    await ensureSettings();
  },

  // Funds
  async getFunds(): Promise<Fund[]> {
    const all = await txAll<Fund>(STORE_FUNDS, 'readonly', (s) => s.getAll());
    return (all || []).sort((a, b) => a.order - b.order);
  },
  async saveFund(fund: Fund): Promise<void> { await tx(STORE_FUNDS, 'readwrite', (s) => s.put(fund)); },
  async deleteFund(id: string): Promise<void> { await tx(STORE_FUNDS, 'readwrite', (s) => s.delete(id)); },

  // Locations
  async getLocations(): Promise<Location[]> {
    const all = await txAll<Location>(STORE_LOCATIONS, 'readonly', (s) => s.getAll());
    return (all || []).sort((a, b) => a.order - b.order);
  },
  async saveLocation(loc: Location): Promise<void> { await tx(STORE_LOCATIONS, 'readwrite', (s) => s.put(loc)); },
  async deleteLocation(id: string): Promise<void> { await tx(STORE_LOCATIONS, 'readwrite', (s) => s.delete(id)); },

  // Movements
  async getMovements(): Promise<Movement[]> {
    const all = await txAll<Movement>(STORE_MOVEMENTS, 'readonly', (s) => s.getAll());
    return all || [];
  },
  async saveMovement(m: Movement): Promise<void> { await tx(STORE_MOVEMENTS, 'readwrite', (s) => s.put(m)); },
  async deleteMovement(id: string): Promise<void> { await tx(STORE_MOVEMENTS, 'readwrite', (s) => s.delete(id)); },

  // Categories
  async getCategories(): Promise<Category[]> {
    const all = await txAll<Category>(STORE_CATEGORIES, 'readonly', (s) => s.getAll());
    return (all || []).sort((a, b) => a.order - b.order);
  },
  async saveCategory(c: Category): Promise<void> { await tx(STORE_CATEGORIES, 'readwrite', (s) => s.put(c)); },
  async deleteCategory(id: string): Promise<void> { await tx(STORE_CATEGORIES, 'readwrite', (s) => s.delete(id)); },

  // Payments
  async getPayments(): Promise<Payment[]> {
    const all = await txAll<Payment>(STORE_PAYMENTS, 'readonly', (s) => s.getAll());
    return all || [];
  },
  async savePayment(p: Payment): Promise<void> { await tx(STORE_PAYMENTS, 'readwrite', (s) => s.put(p)); },
  async deletePayment(id: string): Promise<void> { await tx(STORE_PAYMENTS, 'readwrite', (s) => s.delete(id)); },

  // Audit
  async getAuditLogs(): Promise<AuditLog[]> {
    const all = await txAll<AuditLog>(STORE_AUDIT, 'readonly', (s) => s.getAll());
    return (all || []).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  async saveAuditLog(log: AuditLog): Promise<void> { await tx(STORE_AUDIT, 'readwrite', (s) => s.put(log)); },
  async clearAudit(): Promise<void> { await tx(STORE_AUDIT, 'readwrite', (s) => s.clear()); },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const result = await tx<{ key: string; value: AppSettings } | undefined>(STORE_SETTINGS, 'readonly', (s) => s.get('settings'));
    return result?.value ?? DEFAULT_SETTINGS;
  },
  async saveSettings(settings: AppSettings): Promise<void> { await tx(STORE_SETTINGS, 'readwrite', (s) => s.put({ key: 'settings', value: settings })); },

  // PIN security
  async getPinSecurity(): Promise<PinSecurity | null> {
    const result = await tx<{ key: string; value: PinSecurity } | undefined>(STORE_PIN, 'readonly', (s) => s.get('pin'));
    return result?.value ?? null;
  },
  async savePinSecurity(pin: PinSecurity): Promise<void> { await tx(STORE_PIN, 'readwrite', (s) => s.put({ key: 'pin', value: pin })); },
  async deletePinSecurity(): Promise<void> { await tx(STORE_PIN, 'readwrite', (s) => s.delete('pin')); },

  // Bulk
  async clearAll(): Promise<void> {
    await tx(STORE_MOVEMENTS, 'readwrite', (s) => s.clear());
    await tx(STORE_FUNDS, 'readwrite', (s) => s.clear());
    await tx(STORE_CATEGORIES, 'readwrite', (s) => s.clear());
    await tx(STORE_LOCATIONS, 'readwrite', (s) => s.clear());
    await tx(STORE_PAYMENTS, 'readwrite', (s) => s.clear());
    await tx(STORE_AUDIT, 'readwrite', (s) => s.clear());
    await tx(STORE_PIN, 'readwrite', (s) => s.clear());
    await tx(STORE_SETTINGS, 'readwrite', (s) => s.put({ key: 'settings', value: { ...DEFAULT_SETTINGS } }));
  },

  async exportAll(includeReceipts: boolean = false): Promise<{
    funds: Fund[]; movements: Movement[]; categories: Category[]; settings: AppSettings;
    locations: Location[]; payments: Payment[]; audit: AuditLog[];
  }> {
    const [funds, movements, categories, settings, locations, payments, audit] = await Promise.all([
      this.getFunds(), this.getMovements(), this.getCategories(), this.getSettings(),
      this.getLocations(), this.getPayments(), this.getAuditLogs(),
    ]);
    const cleanMovements = includeReceipts ? movements : movements.map((m) => ({ ...m, receiptData: null }));
    // Never export PIN hash or recovery code
    const safeSettings = { ...settings };
    return { funds, movements: cleanMovements, categories, settings: safeSettings, locations, payments, audit };
  },

  async importAll(data: {
    funds: Fund[]; movements: Movement[]; categories: Category[]; settings: AppSettings;
    locations?: Location[]; payments?: Payment[]; audit?: AuditLog[];
  }, mode: 'replace' | 'merge'): Promise<void> {
    if (mode === 'replace') await this.clearAll();
    for (const f of data.funds) await tx(STORE_FUNDS, 'readwrite', (s) => s.put(f));
    for (const m of data.movements) await tx(STORE_MOVEMENTS, 'readwrite', (s) => s.put(m));
    for (const c of data.categories) await tx(STORE_CATEGORIES, 'readwrite', (s) => s.put(c));
    if (data.locations) for (const l of data.locations) await tx(STORE_LOCATIONS, 'readwrite', (s) => s.put(l));
    if (data.payments) for (const p of data.payments) await tx(STORE_PAYMENTS, 'readwrite', (s) => s.put(p));
    if (data.audit) for (const a of data.audit) await tx(STORE_AUDIT, 'readwrite', (s) => s.put(a));
    // Merge settings but keep current PIN config
    const currentSettings = await this.getSettings();
    const importedSettings = { ...data.settings };
    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...importedSettings,
      pinEnabled: currentSettings.pinEnabled,
      autoLockMinutes: currentSettings.autoLockMinutes,
      lockOnBlur: currentSettings.lockOnBlur,
    };
    await this.saveSettings(merged);
  },
};
