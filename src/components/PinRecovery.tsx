import { useState } from 'react';
import { ArrowLeft, KeyRound, TriangleAlert as AlertTriangle, Trash2, Check } from 'lucide-react';
import { verifyRecoveryCode, resetPinWithRecoveryCode } from '@/utils/pinSecurity';

interface Props {
  onBack: () => void;
  onResetApp: () => void;
  onRecovered: () => void;
}

type Step = 'options' | 'recovery' | 'newPin' | 'reset';

export default function PinRecovery({ onBack, onResetApp, onRecovered }: Props) {
  const [step, setStep] = useState<Step>('options');
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinLength] = useState<4 | 6>(4);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleRecovery = async () => {
    setBusy(true);
    setError('');
    const valid = await verifyRecoveryCode(code);
    if (!valid) {
      setError('Código de recuperación incorrecto.');
      setBusy(false);
      return;
    }
    setStep('newPin');
    setBusy(false);
  };

  const handleNewPin = async () => {
    if (newPin.length !== pinLength) {
      setError(`El PIN debe tener ${pinLength} dígitos.`);
      return;
    }
    setBusy(true);
    setError('');
    const result = await resetPinWithRecoveryCode(code, newPin, pinLength);
    if (!result) {
      setError('No se pudo crear el nuevo PIN.');
      setBusy(false);
      return;
    }
    setBusy(false);
    onRecovered();
  };

  return (
    <div className="fixed inset-0 z-[65] bg-slate-950 flex flex-col">
      <div className="max-w-md w-full mx-auto flex flex-col min-h-screen px-4 pt-[env(safe-area-inset-top)]">
        <div className="pt-3" />

        {/* Header */}
        <div className="flex items-center gap-3 py-3">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px]">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-white flex-1 truncate">Recuperar PIN</h1>
        </div>

        <div className="flex-1 overflow-y-auto pb-8">
          {step === 'options' && (
            <div className="space-y-4 pt-4">
              <p className="text-slate-400 text-sm">Tienes dos opciones para recuperar el acceso:</p>
              <button onClick={() => setStep('recovery')}
                className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-left transition-colors min-h-[44px]">
                <KeyRound size={20} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">Usar código de recuperación</p>
                  <p className="text-slate-400 text-xs">Si guardaste el código que se generó al crear el PIN</p>
                </div>
              </button>
              <button onClick={() => setStep('reset')}
                className="w-full flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl p-4 text-left transition-colors min-h-[44px]">
                <Trash2 size={20} className="text-red-400 shrink-0" />
                <div>
                  <p className="text-red-300 font-semibold text-sm">Borrar todos los datos</p>
                  <p className="text-slate-400 text-xs">Elimina todo y empieza desde cero. No se puede deshacer.</p>
                </div>
              </button>
            </div>
          )}

          {step === 'recovery' && (
            <div className="space-y-4 pt-4">
              <p className="text-slate-400 text-sm">Escribe el código de recuperación que guardaste al crear el PIN.</p>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white tracking-wider font-mono focus:outline-none focus:border-emerald-500/50" />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleRecovery} disabled={busy}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 min-h-[44px]">
                {busy ? 'Verificando...' : 'Verificar código'}
              </button>
            </div>
          )}

          {step === 'newPin' && (
            <div className="space-y-4 pt-4">
              <p className="text-slate-400 text-sm">Código verificado. Crea un nuevo PIN de {pinLength} dígitos.</p>
              <input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, pinLength))} placeholder={'•'.repeat(pinLength)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white tracking-widest focus:outline-none focus:border-emerald-500/50" />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleNewPin} disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 min-h-[44px]">
                <Check size={18} /> {busy ? 'Guardando...' : 'Crear nuevo PIN'}
              </button>
            </div>
          )}

          {step === 'reset' && (
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-red-300 font-semibold text-sm">Advertencia</p>
                  <p className="text-slate-400 text-xs">Esta acción borrará permanentemente todos tus fondos, movimientos, ubicaciones, categorías y configuración. No se puede deshacer.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Escribe ELIMINAR para confirmar</label>
                <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ELIMINAR"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50" />
              </div>
              <button onClick={onResetApp} disabled={confirmText !== 'ELIMINAR'}
                className="w-full bg-red-500 hover:bg-red-400 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 min-h-[44px]">
                Borrar todo y restablecer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
