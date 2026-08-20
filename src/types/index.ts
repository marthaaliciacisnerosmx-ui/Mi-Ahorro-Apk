export type MovementType = 'income' | 'expense' | 'transfer' | 'transfer_location';
export type VerificationStatus = 'verified' | 'pending' | 'adjusted';

export interface Fund {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  order: number;
  isArchived: boolean;
  isCommitted: boolean;
  committedNote: string;
  goalAmountCents: number | null;
  goalDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  order: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  fundId: string;
  locationId: string;
  type: MovementType;
  amountInCents: number;
  categoryId: string;
  note: string;
  movementDate: string;
  movementTime: string;
  transferId?: string;
  destinationFundId?: string;
  destinationLocationId?: string;
  isInitialBalance: boolean;
  verificationStatus: VerificationStatus;
  recipientName: string;
  verificationNote: string;
  verificationDeadline: string | null;
  receiptData: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  isCustom: boolean;
  isArchived: boolean;
  order: number;
}

export interface Payment {
  id: string;
  concept: string;
  amountCents: number;
  dueDate: string;
  fundId: string;
  locationId: string;
  note: string;
  status: 'pending' | 'paid' | 'cancelled';
  linkedMovementId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: 'edit' | 'delete' | 'create' | 'verify' | 'adjust' | 'import';
  timestamp: string;
  movementId: string;
  beforeData: string;
  afterData: string;
  reason: string;
}

export interface PinSecurity {
  pinLength: 4 | 6;
  salt: string;
  hash: string;
  recoveryCode: string;
  failedAttempts: number;
  lockUntil: number | null;
}

export interface AppSettings {
  appName: string;
  currency: string;
  currencySymbol: string;
  darkMode: boolean;
  blockOverspend: boolean;
  allowNegativeBalance: boolean;
  pinEnabled: boolean;
  autoLockMinutes: number;
  lockOnBlur: boolean;
  lastBackupAt: string | null;
  setupCompleted: boolean;
  demoDataCleared: boolean;
}

export interface TransferPair {
  origin: Movement;
  destination: Movement;
}

export const FUND_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#a855f7', '#6366f1',
];

export const FUND_ICONS = [
  'Wallet', 'PiggyBank', 'Banknote', 'CreditCard', 'Home',
  'GraduationCap', 'Plane', 'Heart', 'Shield', 'Car',
  'Gift', 'Dumbbell', 'Coffee', 'ShoppingBag', 'Briefcase',
  'Star', 'Target', 'Bookmark',
];

export const LOCATION_ICONS = [
  'Banknote', 'CreditCard', 'Wallet', 'PiggyBank', 'Building2',
  'Safe', 'HandCoins', 'Coins', 'Landmark', 'Store',
];

export const CATEGORY_ICONS = [
  'PiggyBank', 'Briefcase', 'ShoppingBag', 'Banknote', 'Gift',
  'RotateCcw', 'CircleDollarSign', 'Circle', 'UtensilsCrossed', 'Car',
  'GraduationCap', 'Home', 'Receipt', 'Shield', 'HandCoins',
  'Clapperboard', 'Heart', 'Plane', 'Dumbbell', 'Coffee',
  'Star', 'Target', 'Bookmark', 'Wallet', 'CreditCard',
];

export const CURRENCIES = [
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
  { code: 'USD', symbol: '$', name: 'Dólar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  appName: 'Mi Ahorro',
  currency: 'MXN',
  currencySymbol: '$',
  darkMode: true,
  blockOverspend: true,
  allowNegativeBalance: false,
  pinEnabled: false,
  autoLockMinutes: 0,
  lockOnBlur: true,
  lastBackupAt: null,
  setupCompleted: false,
  demoDataCleared: false,
};
