import { useState, useEffect, useCallback } from 'react';
import { Lock, Delete, CircleAlert as AlertCircle, KeyRound, Clock } from 'lucide-react';
import { verifyPin, getPinLength, getLockUntil } from '@/utils/pinSecurity';
import { storage } from '@/storage/storage';

interface Props {
  onUnlock: () => void;
  onForgotPin: () => void;
}

export default function PinLock({ onUnlock, onForgotPin }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pinLength, setPinLength] = useState<number>(4);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    getPinLength().then((len) => { if (len) setPinLength(len); });
  }, []);

  useEffect(() => {
    getLockUntil().then(setLockedUntil);
  }, [error]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = lockedUntil ? lockedUntil - now : 0;
  const isLocked = remainingMs > 0;

  const handleDigit = useCallback(async (d: string) => {
    if (checking || isLocked) return;
    if (input.length >= pinLength) return;
    const newInput = input + d;
    setInput(newInput);
    setError(false);
    setErrorMsg('');

    if (newInput.length === pinLength) {
      setChecking(true);
      const result = await verifyPin(newInput);
      if (result.ok) {
        onUnlock();
      } else {
        setError(true);
        setInput('');
        if (result.lockedUntil) {
          setLockedUntil(result.lockedUntil);
          setErrorMsg('Demasiados intentos. Espera un momento.');
        } else {
          setErrorMsg('PIN incorrecto');
        }
        setTimeout(() => { setError(false); setErrorMsg(''); }, 800);
      }
      setChecking(false);
    }
  }, [input, pinLength, checking, isLocked, onUnlock]);

  const handleDelete = () => {
    setInput(input.slice(0, -1));
    setError(false);
    setErrorMsg('');
  };

  const formatTime = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}m ${rs}s`;
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
        <Lock size={32} className="text-white" />
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold text-white mb-1">Mi Ahorro</h1>
        <p className="text-slate-400 text-sm">Ingresa tu PIN para continuar</p>
      </div>

      <div className={`flex gap-3 ${error ? 'animate-[shake_400ms_ease]' : ''}`}>
        {Array.from({ length: pinLength }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-colors ${
              error ? 'bg-red-500' : i < input.length ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-red-400 text-sm">
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}

      {isLocked && (
        <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
          <Clock size={16} /> Espera {formatTime(remainingMs)} para intentar de nuevo
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 w-64">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            disabled={isLocked || checking}
            className="aspect-square rounded-2xl bg-slate-800 text-white text-2xl font-semibold hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-30 min-h-[44px]"
          >
            {d}
          </button>
        ))}
        <div className="min-h-[44px]" />
        <button onClick={() => handleDigit('0')} disabled={isLocked || checking}
          className="aspect-square rounded-2xl bg-slate-800 text-white text-2xl font-semibold hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-30 min-h-[44px]">
          0
        </button>
        <button onClick={handleDelete} disabled={isLocked}
          className="aspect-square rounded-2xl bg-slate-800 text-slate-400 hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 min-h-[44px]">
          <Delete size={24} />
        </button>
      </div>

      <button onClick={onForgotPin} className="flex items-center gap-1.5 text-slate-500 hover:text-amber-400 text-sm transition-colors min-h-[44px] px-4">
        <KeyRound size={14} /> Olvidé mi PIN
      </button>
    </div>
  );
}

export async function checkPinExists(): Promise<boolean> {
  const security = await storage.getPinSecurity();
  return !!security;
}
