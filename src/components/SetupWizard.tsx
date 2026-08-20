import { useState } from 'react';
import type { AppSettings, Fund, Location } from '@/types';
import { FUND_COLORS, FUND_ICONS, LOCATION_ICONS } from '@/types';
import Icon from './Icon';
import { PiggyBank, ArrowRight, Check, Lock, Wallet, MapPin, SkipForward } from 'lucide-react';
import { createPin } from '@/utils/pinSecurity';

interface Props {
  settings: AppSettings;
  onCreateFund: (data: { name: string; description: string; color: string; icon: string }) => Promise<Fund>;
  onCreateLocation: (data: { name: string; description: string; color: string; icon: string }) => Promise<Location>;
  onAddMovement: (data: {
    fundId: string;
    locationId: string;
    type: 'income';
    amountInCents: number;
    categoryId: string;
    note: string;
    movementDate: string;
    movementTime: string;
    isInitialBalance: boolean;
    verificationStatus: 'verified';
    recipientName: string;
    verificationNote: string;
    verificationDeadline: null;
    receiptData: null;
  }) => Promise<void>;
  onEnablePin: (enabled: boolean) => void;
  onComplete: () => void;
}

type Step = 'welcome' | 'fund' | 'location' | 'balance' | 'pin' | 'done';

export default function SetupWizard({
  settings, onCreateFund, onCreateLocation, onAddMovement, onEnablePin, onComplete,
}: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [fundName, setFundName] = useState('');
  const [fundColor, setFundColor] = useState(FUND_COLORS[0]);
  const [fundIcon, setFundIcon] = useState(FUND_ICONS[0]);
  const [locName, setLocName] = useState('');
  const [locColor, setLocColor] = useState(FUND_COLORS[0]);
  const [locIcon, setLocIcon] = useState(LOCATION_ICONS[0]);
  const [hasBalance, setHasBalance] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceFundId, setBalanceFundId] = useState('');
  const [balanceLocId, setBalanceLocId] = useState('');
  const [createdFundId, setCreatedFundId] = useState('');
  const [createdLocId, setCreatedLocId] = useState('');
  const [enablePin, setEnablePin] = useState(false);
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const time = new Date().toTimeString().slice(0, 5);

  const handleCreateFund = async () => {
    if (!fundName.trim()) { setError('Escribe un nombre para el fondo.'); return; }
    setBusy(true);
    setError('');
    const fund = await onCreateFund({ name: fundName.trim(), description: '', color: fundColor, icon: fundIcon });
    setCreatedFundId(fund.id);
    setBalanceFundId(fund.id);
    setBusy(false);
    setStep('location');
  };

  const handleCreateLocation = async () => {
    if (!locName.trim()) { setError('Escribe un nombre para la ubicación.'); return; }
    setBusy(true);
    setError('');
    const loc = await onCreateLocation({ name: locName.trim(), description: '', color: locColor, icon: locIcon });
    setCreatedLocId(loc.id);
    setBalanceLocId(loc.id);
    setBusy(false);
    setStep('balance');
  };

  const handleBalance = async () => {
    if (hasBalance) {
      const val = parseFloat(balanceAmount);
      if (isNaN(val) || val <= 0) { setError('Escribe una cantidad válida.'); return; }
      if (!balanceFundId || !balanceLocId) { setError('Selecciona fondo y ubicación.'); return; }
      setBusy(true);
      setError('');
      await onAddMovement({
        fundId: balanceFundId,
        locationId: balanceLocId,
        type: 'income',
        amountInCents: Math.round(val * 100),
        categoryId: '',
        note: 'Saldo inicial',
        movementDate: today,
        movementTime: time,
        isInitialBalance: true,
        verificationStatus: 'verified',
        recipientName: '',
        verificationNote: '',
        verificationDeadline: null,
        receiptData: null,
      });
      setBusy(false);
    }
    setStep('pin');
  };

  const handlePin = async () => {
    if (!enablePin) {
      onComplete();
      return;
    }
    if (pin1.length !== pinLength) { setError(`El PIN debe tener ${pinLength} dígitos.`); return; }
    if (pin1 !== pin2) { setError('Los PIN no coinciden.'); return; }
    setBusy(true);
    setError('');
    const result = await createPin(pin1, pinLength);
    setRecoveryCode(result.recoveryCode);
    setShowRecovery(true);
    await onEnablePin(true);
    setBusy(false);
  };

  const finish = () => {
    onComplete();
  };

  const skipAll = () => {
    onComplete();
  };

  const stepInfo: Record<Step, { num: number; total: number; title: string; icon: typeof PiggyBank }> = {
    welcome: { num: 0, total: 4, title: 'Bienvenido', icon: PiggyBank },
    fund: { num: 1, total: 4, title: 'Crear fondo', icon: Wallet },
    location: { num: 2, total: 4, title: 'Crear ubicación', icon: MapPin },
    balance: { num: 3, total: 4, title: 'Saldo inicial', icon: PiggyBank },
    pin: { num: 4, total: 4, title: 'PIN de seguridad', icon: Lock },
    done: { num: 4, total: 4, title: 'Listo', icon: Check },
  };

  const info = stepInfo[step];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col">
      <div className="max-w-md w-full mx-auto flex flex-col min-h-screen px-4 pt-[env(safe-area-inset-top)]">
        <div className="pt-6" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/assets/chanchullos-mys-icon.png"
            alt="Chanchullos MyS"
            className="w-12 h-12 rounded-2xl object-contain shrink-0 bg-slate-800"
            style={{ aspectRatio: '1 / 1' }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white truncate">{settings.appName}</h1>
            <p className="text-slate-400 text-xs">Configuración inicial</p>
          </div>
          {step !== 'welcome' && step !== 'done' && (
            <button onClick={skipAll} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-3 py-2 min-h-[44px]">
              <SkipForward size={14} /> Omitir
            </button>
          )}
        </div>

        {/* Progress bar */}
        {step !== 'welcome' && step !== 'done' && (
          <div className="flex gap-1.5 mb-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`flex-1 h-1.5 rounded-full transition-colors ${n <= info.num ? 'bg-emerald-500' : 'bg-slate-700'}`}
              />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-8">
          {step === 'welcome' && (
            <div className="space-y-6">
              <div className="text-center space-y-3 pt-8">
                <img
                  src="/assets/chanchullos-mys-icon.png"
                  alt="Chanchullos MyS"
                  className="w-20 h-20 rounded-3xl object-contain mx-auto bg-slate-800"
                  style={{ aspectRatio: '1 / 1' }}
                />
                <h2 className="text-2xl font-bold text-white">¡Comencemos!</h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                  Esta aplicación está vacía. Vamos a configurar lo básico para que puedas empezar a controlar tu dinero.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-xs">1</span>
                  </div>
                  <span>Crear tu primer fondo</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-xs">2</span>
                  </div>
                  <span>Crear tu primera ubicación</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-xs">3</span>
                  </div>
                  <span>Registrar un saldo inicial (opcional)</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-xs">4</span>
                  </div>
                  <span>Configurar un PIN (opcional)</span>
                </div>
              </div>
              <button onClick={() => setStep('fund')} className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 min-h-[44px]">
                Comenzar <ArrowRight size={18} />
              </button>
              <button onClick={skipAll} className="w-full text-slate-400 hover:text-white text-sm font-medium py-2 transition-colors min-h-[44px]">
                Omitir y empezar vacío
              </button>
            </div>
          )}

          {step === 'fund' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Wallet size={20} className="text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Crear tu primer fondo</h2>
              </div>
              <p className="text-slate-400 text-sm">Un fondo es un apartado de dinero. Ejemplos: "Mi dinero", "Ahorros", "Escuela".</p>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre *</label>
                <input type="text" value={fundName} onChange={(e) => setFundName(e.target.value)} placeholder="Ej. Mi dinero"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {FUND_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setFundColor(c)}
                      className={`w-9 h-9 rounded-full transition-all ${fundColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Icono</label>
                <div className="grid grid-cols-6 gap-2">
                  {FUND_ICONS.map((ic) => (
                    <button key={ic} type="button" onClick={() => setFundIcon(ic)}
                      className={`aspect-square rounded-xl flex items-center justify-center transition-all ${fundIcon === ic ? 'bg-emerald-500/20 ring-2 ring-emerald-500' : 'bg-slate-900 hover:bg-slate-700'}`}>
                      <Icon name={ic} size={18} className={fundIcon === ic ? 'text-emerald-400' : 'text-slate-400'} />
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleCreateFund} disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]">
                {busy ? 'Creando...' : 'Crear fondo'} <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 'location' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin size={20} className="text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Crear ubicación</h2>
              </div>
              <p className="text-slate-400 text-sm">¿Dónde guardas el dinero? Ejemplos: "Efectivo", "Banco", "Tarjeta", "Alcancía".</p>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre *</label>
                <input type="text" value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="Ej. Efectivo"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {FUND_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setLocColor(c)}
                      className={`w-9 h-9 rounded-full transition-all ${locColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Icono</label>
                <div className="grid grid-cols-5 gap-2">
                  {LOCATION_ICONS.map((ic) => (
                    <button key={ic} type="button" onClick={() => setLocIcon(ic)}
                      className={`aspect-square rounded-xl flex items-center justify-center transition-all ${locIcon === ic ? 'bg-emerald-500/20 ring-2 ring-emerald-500' : 'bg-slate-900 hover:bg-slate-700'}`}>
                      <Icon name={ic} size={18} className={locIcon === ic ? 'text-emerald-400' : 'text-slate-400'} />
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleCreateLocation} disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]">
                {busy ? 'Creando...' : 'Crear ubicación'} <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 'balance' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-300">
                <PiggyBank size={20} className="text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Saldo inicial</h2>
              </div>
              <p className="text-slate-400 text-sm">¿Ya tienes dinero guardado? Puedes registrarlo como saldo inicial.</p>
              <div className="flex gap-2">
                <button onClick={() => setHasBalance(true)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${hasBalance ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-300 border border-white/10'}`}>
                  Sí, registrar
                </button>
                <button onClick={() => setHasBalance(false)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${!hasBalance ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-300 border border-white/10'}`}>
                  No, omitir
                </button>
              </div>
              {hasBalance && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Cantidad *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">{settings.currencySymbol}</span>
                      <input type="number" inputMode="decimal" step="0.01" min="0" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} placeholder="0.00"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white text-lg font-semibold focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  </div>
                </div>
              )}
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleBalance} disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]">
                {busy ? 'Guardando...' : 'Continuar'} <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 'pin' && !showRecovery && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Lock size={20} className="text-emerald-400" />
                <h2 className="text-lg font-bold text-white">PIN de seguridad</h2>
              </div>
              <p className="text-slate-400 text-sm">Bloquea la app con un PIN para que nadie vea tu dinero sin permiso.</p>
              <div className="flex gap-2">
                <button onClick={() => { setEnablePin(true); setPinLength(4); setPin1(''); setPin2(''); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${enablePin && pinLength === 4 ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-300 border border-white/10'}`}>
                  PIN de 4 dígitos
                </button>
                <button onClick={() => { setEnablePin(true); setPinLength(6); setPin1(''); setPin2(''); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${enablePin && pinLength === 6 ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-300 border border-white/10'}`}>
                  PIN de 6 dígitos
                </button>
              </div>
              {!enablePin && (
                <button onClick={() => setEnablePin(false)}
                  className="w-full py-3 rounded-xl text-sm font-medium bg-slate-900 text-slate-300 border border-white/10 min-h-[44px]">
                  Sin PIN por ahora
                </button>
              )}
              {enablePin && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">PIN ({pinLength} dígitos)</label>
                    <input type="password" inputMode="numeric" value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, '').slice(0, pinLength))} placeholder={'•'.repeat(pinLength)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white tracking-widest focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Repetir PIN</label>
                    <input type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, pinLength))} placeholder={'•'.repeat(pinLength)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white tracking-widest focus:outline-none focus:border-emerald-500/50" />
                  </div>
                </div>
              )}
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handlePin} disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]">
                {busy ? 'Configurando...' : enablePin ? 'Crear PIN' : 'Finalizar'} <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 'pin' && showRecovery && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check size={20} />
                <h2 className="text-lg font-bold text-white">PIN creado</h2>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
                <p className="text-amber-300 text-sm font-medium">Guarda este código de recuperación</p>
                <p className="text-slate-400 text-xs">Si olvidas tu PIN, este código es la única forma de recuperarlo sin perder tus datos.</p>
                <div className="bg-slate-900 rounded-lg p-3 text-center">
                  <code className="text-emerald-400 text-lg font-bold tracking-wider">{recoveryCode}</code>
                </div>
                <p className="text-slate-500 text-xs">Anótalo en un lugar seguro. No se volverá a mostrar.</p>
              </div>
              <button onClick={finish}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 min-h-[44px]">
                <Check size={18} /> Entendido, finalizar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
