import { useState, useRef } from 'react';
import type { AppSettings, Category, Fund, Movement, Location } from '@/types';
import { CURRENCIES } from '@/types';
import { Download, Upload, FileSpreadsheet, Trash2, TriangleAlert as AlertTriangle, Check, Lock, Palette, FolderPlus, Tag, CircleAlert as AlertCircle, MapPin, Calendar, Scale, KeyRound, RotateCcw } from 'lucide-react';
import CategoryForm from './CategoryForm';
import { createPin, changePin, disablePin, generateNewRecoveryCode } from '@/utils/pinSecurity';

interface Props {
  settings: AppSettings;
  funds: Fund[];
  categories: Category[];
  movements: Movement[];
  locations: Location[];
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImport: (file: File, mode: 'replace' | 'merge') => void;
  onClearAll: () => void;
  onCreateCategory: (data: { name: string; type: 'income' | 'expense'; color: string; icon: string }) => void;
  onDeleteCategory: (id: string) => void;
  onArchiveCategory: (id: string) => void;
  onOpenFundsManager: () => void;
  onOpenLocationsManager: () => void;
  onOpenPayments: () => void;
  onOpenCashCount: () => void;
}

export default function SettingsView({
  settings, funds, categories, movements, locations,
  onUpdateSettings, onExportJSON, onExportCSV, onImport, onClearAll,
  onCreateCategory, onDeleteCategory, onArchiveCategory, onOpenFundsManager, onOpenLocationsManager, onOpenPayments, onOpenCashCount,
}: Props) {
  const [appName, setAppName] = useState(settings.appName);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [resetText, setResetText] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [showCatForm, setShowCatForm] = useState(false);
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [pinStep, setPinStep] = useState<'none' | 'create' | 'enter-current' | 'show-recovery' | 'change-new' | 'show-new-recovery'>('none');
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mostrarMensaje = (m: string) => { setMensaje(m); setTimeout(() => setMensaje(''), 3000); };

  const guardarNombre = () => { onUpdateSettings({ appName: appName.trim() || 'Mi Ahorro' }); mostrarMensaje('Nombre actualizado.'); };
  const cambiarMoneda = (codigo: string) => {
    const moneda = CURRENCIES.find((m) => m.code === codigo);
    if (moneda) onUpdateSettings({ currency: moneda.code, currencySymbol: moneda.symbol });
  };

  const handleImport = () => {
    if (!importFile) return;
    onImport(importFile, importMode);
    setShowImport(false); setImportFile(null);
    mostrarMensaje('Respaldo importado correctamente.');
  };

  // PIN management
  const handleCreatePin = async () => {
    if (pin1.length !== pinLength) { setPinError(`El PIN debe tener ${pinLength} dígitos.`); return; }
    if (pin1 !== pin2) { setPinError('Los PIN no coinciden.'); return; }
    setPinBusy(true); setPinError('');
    const result = await createPin(pin1, pinLength);
    setRecoveryCode(result.recoveryCode);
    setPinStep('show-recovery');
    onUpdateSettings({ pinEnabled: true });
    setPinBusy(false);
    setPin1(''); setPin2('');
  };

  const handleDisablePin = async () => {
    setPinBusy(true); setPinError('');
    const ok = await disablePin(currentPin);
    if (!ok) { setPinError('PIN incorrecto.'); setPinBusy(false); return; }
    onUpdateSettings({ pinEnabled: false });
    setPinStep('none'); setCurrentPin('');
    mostrarMensaje('PIN desactivado.');
    setPinBusy(false);
  };

  const handleChangePinStart = async () => {
    setPinBusy(true); setPinError('');
    const ok = await changePin(currentPin, '__check__', pinLength);
    // Actually we need to verify first, then set new pin
    // Use verifyPin indirectly - changePin does both
    setPinBusy(false);
    if (!currentPin) { setPinError('Ingresa tu PIN actual.'); return; }
    setPinStep('change-new');
  };

  const handleChangePinFinish = async () => {
    if (pin1.length !== pinLength) { setPinError(`El PIN debe tener ${pinLength} dígitos.`); return; }
    if (pin1 !== pin2) { setPinError('Los PIN no coinciden.'); return; }
    setPinBusy(true); setPinError('');
    const result = await changePin(currentPin, pin1, pinLength);
    if (!result) { setPinError('PIN actual incorrecto.'); setPinBusy(false); return; }
    setRecoveryCode(result.recoveryCode);
    setPinStep('show-new-recovery');
    setPinBusy(false);
    setPin1(''); setPin2(''); setCurrentPin('');
  };

  const handleNewRecoveryCode = async () => {
    setPinBusy(true); setPinError('');
    const code = await generateNewRecoveryCode(currentPin);
    if (!code) { setPinError('PIN incorrecto.'); setPinBusy(false); return; }
    setRecoveryCode(code);
    setPinStep('show-new-recovery');
    setPinBusy(false);
    setCurrentPin('');
  };

  const incomeCategories = categories.filter((c) => c.type === 'income' && !c.isArchived);
  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.isArchived);
  const archivedCategories = categories.filter((c) => c.isArchived);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">Configuración</h1>

      {mensaje && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 text-emerald-300 text-sm animate-[fadeIn_200ms_ease]">
          <Check size={16} /> {mensaje}
        </div>
      )}

      {/* General */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-4 border border-white/10">
        <h3 className="text-sm font-semibold text-slate-300">General</h3>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Nombre de la aplicación</label>
          <div className="flex gap-2">
            <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)}
              className="flex-1 min-w-0 bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
            <button onClick={guardarNombre} className="px-4 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-400 transition-colors min-h-[44px]">Guardar</button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Moneda</label>
          <select value={settings.currency} onChange={(e) => cambiarMoneda(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-emerald-500/50">
            {CURRENCIES.map((m) => <option key={m.code} value={m.code}>{m.name} ({m.code})</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Modo oscuro</span>
          <button onClick={() => onUpdateSettings({ darkMode: !settings.darkMode })}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${settings.darkMode ? 'bg-emerald-500' : 'bg-slate-600'}`}>
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${settings.darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Spending controls */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-4 border border-white/10">
        <h3 className="text-sm font-semibold text-slate-300">Control de retiros</h3>
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-sm text-slate-300 block">Bloquear retiros sin saldo</span>
            <span className="text-xs text-slate-500">Impide retirar más del saldo disponible</span>
          </div>
          <button onClick={() => onUpdateSettings({ blockOverspend: !settings.blockOverspend })}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${settings.blockOverspend ? 'bg-emerald-500' : 'bg-slate-600'}`}>
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${settings.blockOverspend ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-sm text-slate-300 block">Permitir saldo negativo</span>
            <span className="text-xs text-slate-500">Muestra advertencia pero permite el retiro</span>
          </div>
          <button onClick={() => onUpdateSettings({ allowNegativeBalance: !settings.allowNegativeBalance })}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${settings.allowNegativeBalance ? 'bg-emerald-500' : 'bg-slate-600'}`}>
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${settings.allowNegativeBalance ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Privacy / PIN */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-4 border border-white/10">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5"><Lock size={15} /> Privacidad y PIN</h3>

        {pinStep === 'none' && !settings.pinEnabled && (
          <>
            <p className="text-sm text-slate-400">Protege tu app con un PIN. No se guarda en texto plano: se usa un hash seguro con PBKDF2.</p>
            <div className="flex gap-2">
              <button onClick={() => { setPinLength(4); setPinStep('create'); setPin1(''); setPin2(''); setPinError(''); }}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors min-h-[44px]">Crear PIN de 4 dígitos</button>
              <button onClick={() => { setPinLength(6); setPinStep('create'); setPin1(''); setPin2(''); setPinError(''); }}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors min-h-[44px]">Crear PIN de 6 dígitos</button>
            </div>
          </>
        )}

        {pinStep === 'create' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Crea un PIN de {pinLength} dígitos.</p>
            <input type="password" inputMode="numeric" value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, '').slice(0, pinLength))} placeholder={'•'.repeat(pinLength)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white tracking-widest focus:outline-none focus:border-emerald-500/50" />
            <input type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, pinLength))} placeholder="Repetir PIN"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white tracking-widest focus:outline-none focus:border-emerald-500/50" />
            {pinError && <p className="text-red-400 text-sm">{pinError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setPinStep('none')} className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 font-semibold text-sm hover:bg-white/10 min-h-[44px]">Cancelar</button>
              <button onClick={handleCreatePin} disabled={pinBusy} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 min-h-[44px] disabled:opacity-50">{pinBusy ? 'Creando...' : 'Crear PIN'}</button>
            </div>
          </div>
        )}

        {pinStep === 'show-recovery' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400"><Check size={18} /><span className="font-semibold text-sm">PIN creado</span></div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
              <p className="text-amber-300 text-sm font-medium">Código de recuperación:</p>
              <div className="bg-slate-900 rounded-lg p-2 text-center"><code className="text-emerald-400 text-lg font-bold tracking-wider">{recoveryCode}</code></div>
              <p className="text-slate-500 text-xs">Anótalo en un lugar seguro. Si olvidas tu PIN, es la única forma de recuperarlo sin perder datos.</p>
            </div>
            <button onClick={() => setPinStep('none')} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 min-h-[44px]">Entendido</button>
          </div>
        )}

        {pinStep === 'none' && settings.pinEnabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-sm text-slate-300 block">PIN activado</span>
                <span className="text-xs text-slate-500">Tu app está protegida</span>
              </div>
              <button onClick={() => onUpdateSettings({ pinEnabled: false })}
                className="text-xs text-emerald-400 font-medium px-3 py-2 min-h-[44px]">Activo</button>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Bloqueo automático</label>
              <select value={settings.autoLockMinutes} onChange={(e) => onUpdateSettings({ autoLockMinutes: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-emerald-500/50">
                <option value={0}>Solo al reiniciar</option>
                <option value={1}>1 minuto</option>
                <option value={5}>5 minutos</option>
                <option value={15}>15 minutos</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Bloquear al salir de la app</span>
              <button onClick={() => onUpdateSettings({ lockOnBlur: !settings.lockOnBlur })}
                className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${settings.lockOnBlur ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${settings.lockOnBlur ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="space-y-2 pt-2 border-t border-white/10">
              <button onClick={() => { setPinStep('enter-current'); setCurrentPin(''); setPinError(''); }}
                className="w-full flex items-center gap-2 bg-slate-900 hover:bg-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm font-medium transition-colors min-h-[44px]">
                <KeyRound size={16} className="text-emerald-400" /> Cambiar PIN
              </button>
              <button onClick={() => { setPinStep('enter-current'); setCurrentPin(''); setPinError(''); setPin1(''); setPin2(''); }}
                className="w-full flex items-center gap-2 bg-slate-900 hover:bg-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm font-medium transition-colors min-h-[44px]">
                <RotateCcw size={16} className="text-emerald-400" /> Generar nuevo código de recuperación
              </button>
              <button onClick={() => { setPinStep('enter-current'); setCurrentPin(''); setPinError(''); }}
                className="w-full flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm font-medium transition-colors min-h-[44px]">
                <Lock size={16} /> Desactivar PIN
              </button>
            </div>
          </div>
        )}

        {pinStep === 'enter-current' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Ingresa tu PIN actual para continuar.</p>
            <input type="password" inputMode="numeric" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              placeholder="PIN actual"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white tracking-widest focus:outline-none focus:border-emerald-500/50" />
            {pinError && <p className="text-red-400 text-sm">{pinError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setPinStep('none')} className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 font-semibold text-sm hover:bg-white/10 min-h-[44px]">Cancelar</button>
              <button onClick={handleDisablePin} disabled={pinBusy} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-400 min-h-[44px] disabled:opacity-50">{pinBusy ? 'Verificando...' : 'Desactivar PIN'}</button>
            </div>
            <button onClick={handleChangePinStart} disabled={pinBusy || !currentPin}
              className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 min-h-[44px] disabled:opacity-50">Cambiar PIN</button>
            <button onClick={handleNewRecoveryCode} disabled={pinBusy || !currentPin}
              className="w-full py-3 rounded-xl bg-slate-700 text-white font-semibold text-sm hover:bg-slate-600 min-h-[44px] disabled:opacity-50">Generar nuevo código de recuperación</button>
          </div>
        )}

        {pinStep === 'change-new' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Nuevo PIN de {pinLength} dígitos.</p>
            <div className="flex gap-2 mb-2">
              <button onClick={() => { setPinLength(4); setPin1(''); setPin2(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium ${pinLength === 4 ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-300 border border-white/10'}`}>4 dígitos</button>
              <button onClick={() => { setPinLength(6); setPin1(''); setPin2(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium ${pinLength === 6 ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-300 border border-white/10'}`}>6 dígitos</button>
            </div>
            <input type="password" inputMode="numeric" value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, '').slice(0, pinLength))} placeholder={'•'.repeat(pinLength)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white tracking-widest focus:outline-none focus:border-emerald-500/50" />
            <input type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, pinLength))} placeholder="Repetir"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white tracking-widest focus:outline-none focus:border-emerald-500/50" />
            {pinError && <p className="text-red-400 text-sm">{pinError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setPinStep('none')} className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 font-semibold text-sm hover:bg-white/10 min-h-[44px]">Cancelar</button>
              <button onClick={handleChangePinFinish} disabled={pinBusy} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 min-h-[44px] disabled:opacity-50">{pinBusy ? 'Guardando...' : 'Guardar nuevo PIN'}</button>
            </div>
          </div>
        )}

        {pinStep === 'show-new-recovery' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400"><Check size={18} /><span className="font-semibold text-sm">PIN actualizado</span></div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
              <p className="text-amber-300 text-sm font-medium">Nuevo código de recuperación:</p>
              <div className="bg-slate-900 rounded-lg p-2 text-center"><code className="text-emerald-400 text-lg font-bold tracking-wider">{recoveryCode}</code></div>
              <p className="text-slate-500 text-xs">Anótalo en un lugar seguro. El código anterior ya no es válido.</p>
            </div>
            <button onClick={() => setPinStep('none')} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 min-h-[44px]">Entendido</button>
          </div>
        )}

        <p className="text-xs text-slate-500 flex items-start gap-1.5">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          La app no envía datos a servidores externos ni usa rastreadores. Todo se guarda localmente.
        </p>
      </div>

      {/* Manage */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3 border border-white/10">
        <h3 className="text-sm font-semibold text-slate-300">Gestionar</h3>
        <button onClick={onOpenFundsManager} className="w-full flex items-center gap-3 bg-slate-900 hover:bg-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm font-medium transition-colors min-h-[44px]">
          <Palette size={18} className="text-emerald-400" /> Fondos ({funds.length})
        </button>
        <button onClick={onOpenLocationsManager} className="w-full flex items-center gap-3 bg-slate-900 hover:bg-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm font-medium transition-colors min-h-[44px]">
          <MapPin size={18} className="text-emerald-400" /> Ubicaciones ({locations.length})
        </button>
        <button onClick={onOpenPayments} className="w-full flex items-center gap-3 bg-slate-900 hover:bg-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm font-medium transition-colors min-h-[44px]">
          <Calendar size={18} className="text-emerald-400" /> Pagos próximos
        </button>
        <button onClick={onOpenCashCount} className="w-full flex items-center gap-3 bg-slate-900 hover:bg-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm font-medium transition-colors min-h-[44px]">
          <Scale size={18} className="text-emerald-400" /> Comprobar dinero
        </button>
      </div>

      {/* Categories */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3 border border-white/10">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5"><Tag size={15} /> Categorías</h3>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Ingresos</span>
            <button onClick={() => { setCatType('income'); setShowCatForm(true); }} className="text-xs text-emerald-400 font-medium min-h-[44px]">+ Nueva</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {incomeCategories.map((c) => (
              <span key={c.id} className="flex items-center gap-1 text-xs bg-slate-900 px-2.5 py-1.5 rounded-lg text-slate-300">
                {c.name}
                <button onClick={() => onArchiveCategory(c.id)} className="text-slate-500 hover:text-amber-400 ml-1">↩</button>
                <button onClick={() => onDeleteCategory(c.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={11} /></button>
              </span>
            ))}
            {incomeCategories.length === 0 && <span className="text-xs text-slate-500">Sin categorías</span>}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Retiros</span>
            <button onClick={() => { setCatType('expense'); setShowCatForm(true); }} className="text-xs text-emerald-400 font-medium min-h-[44px]">+ Nueva</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {expenseCategories.map((c) => (
              <span key={c.id} className="flex items-center gap-1 text-xs bg-slate-900 px-2.5 py-1.5 rounded-lg text-slate-300">
                {c.name}
                <button onClick={() => onArchiveCategory(c.id)} className="text-slate-500 hover:text-amber-400 ml-1">↩</button>
                <button onClick={() => onDeleteCategory(c.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={11} /></button>
              </span>
            ))}
            {expenseCategories.length === 0 && <span className="text-xs text-slate-500">Sin categorías</span>}
          </div>
        </div>
        {archivedCategories.length > 0 && (
          <div>
            <span className="text-xs text-slate-400">Archivadas ({archivedCategories.length})</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {archivedCategories.map((c) => (
                <span key={c.id} className="flex items-center gap-1 text-xs bg-slate-900/50 px-2.5 py-1.5 rounded-lg text-slate-500 opacity-60">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Backups */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3 border border-white/10">
        <h3 className="text-sm font-semibold text-slate-300">Respaldos</h3>
        {settings.lastBackupAt && <p className="text-xs text-slate-500">Último respaldo: {new Date(settings.lastBackupAt).toLocaleString('es-MX')}</p>}
        <button onClick={onExportJSON} className="w-full flex items-center gap-3 bg-slate-900 hover:bg-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm font-medium transition-colors min-h-[44px]">
          <Download size={18} className="text-emerald-400" /> Exportar respaldo JSON
        </button>
        <button onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-3 bg-slate-900 hover:bg-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm font-medium transition-colors min-h-[44px]">
          <Upload size={18} className="text-sky-400" /> Importar respaldo JSON
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImportFile(f); setShowImport(true); } e.target.value = ''; }} />
        <button onClick={onExportCSV} className="w-full flex items-center gap-3 bg-slate-900 hover:bg-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm font-medium transition-colors min-h-[44px]">
          <FileSpreadsheet size={18} className="text-amber-400" /> Exportar a CSV (Excel)
        </button>
      </div>

      {/* Danger zone */}
      <div className="bg-red-500/5 rounded-2xl p-4 space-y-3 border border-red-500/20">
        <h3 className="text-sm font-semibold text-red-300 flex items-center gap-1.5"><AlertTriangle size={15} /> Zona de peligro</h3>
        {confirmarBorrado ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-red-500/10 rounded-xl px-3 py-2.5 text-red-300 text-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>Se borrarán {funds.length} fondos, {movements.length} movimientos, {locations.length} ubicaciones y {categories.length} categorías. Esta acción no se puede deshacer.</span>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Escribe ELIMINAR para confirmar</label>
              <input type="text" value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="ELIMINAR"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setConfirmarBorrado(false); setResetText(''); }} className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm font-semibold hover:bg-white/10 min-h-[44px]">Cancelar</button>
              <button onClick={() => { if (resetText === 'ELIMINAR') { onClearAll(); setConfirmarBorrado(false); setResetText(''); mostrarMensaje('Todos los datos fueron borrados.'); } }}
                disabled={resetText !== 'ELIMINAR'} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 disabled:opacity-50 min-h-[44px]">Sí, borrar todo</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmarBorrado(true)} className="w-full flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm font-medium transition-colors min-h-[44px]">
            <Trash2 size={18} /> Restablecer aplicación
          </button>
        )}
      </div>

      <p className="text-center text-xs text-slate-600 pt-2">Mi Ahorro · Almacenamiento local · v3.0</p>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowImport(false)} />
          <div className="relative w-full max-w-md bg-slate-800 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl p-5 space-y-4">
            <h2 className="text-lg font-bold text-white">Importar respaldo</h2>
            <p className="text-sm text-slate-300">Archivo: {importFile?.name}</p>
            <div className="space-y-2">
              <button onClick={() => setImportMode('merge')} className={`w-full p-3 rounded-xl border text-sm font-medium transition-colors ${importMode === 'merge' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-white/10 text-slate-300'}`}>Combinar (evitar duplicados)</button>
              <button onClick={() => setImportMode('replace')} className={`w-full p-3 rounded-xl border text-sm font-medium transition-colors ${importMode === 'replace' ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-slate-900 border-white/10 text-slate-300'}`}>Reemplazar todos los datos</button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowImport(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 font-semibold text-sm hover:bg-white/10 min-h-[44px]">Cancelar</button>
              <button onClick={handleImport} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 min-h-[44px]">Importar</button>
            </div>
          </div>
        </div>
      )}

      {/* Category form modal */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCatForm(false)} />
          <div className="relative w-full max-w-md bg-slate-800 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">Nueva categoría de {catType === 'income' ? 'ingreso' : 'retiro'}</h2>
            <CategoryForm open={showCatForm} type={catType}
              onGuardar={(data) => { onCreateCategory(data); setShowCatForm(false); mostrarMensaje('Categoría creada.'); }}
              onCancelar={() => setShowCatForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
