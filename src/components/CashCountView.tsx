import { useState } from 'react';
import type { AppSettings } from '@/types';
import type { LocationWithStats } from '@/hooks/useStore';
import Icon from './Icon';
import { formatAmount } from '@/utils/format';
import { Scale, Check, TriangleAlert as AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  locations: LocationWithStats[];
  settings: AppSettings;
  onAdjust: (locationId: string, countedCents: number, expectedCents: number, note: string) => void;
}

export default function CashCountView({ locations, settings, onAdjust }: Props) {
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, 'ok' | 'diff'>>({});

  const active = locations.filter((l) => !l.isArchived);

  const handleCount = (locId: string) => {
    const loc = active.find((l) => l.id === locId);
    if (!loc) return;
    const val = parseFloat(counted[locId] ?? '');
    if (isNaN(val)) return;
    const countedCents = Math.round(val * 100);
    const expected = loc.balanceCents;
    if (countedCents === expected) {
      setResults((p) => ({ ...p, [locId]: 'ok' }));
    } else {
      setResults((p) => ({ ...p, [locId]: 'diff' }));
      onAdjust(locId, countedCents, expected, notes[locId]?.trim() || 'Comprobación de efectivo');
    }
  };

  const totalExpected = active.reduce((s, l) => s + l.balanceCents, 0);
  const totalCounted = active.reduce((s, l) => {
    const val = parseFloat(counted[l.id] ?? '0');
    return s + (isNaN(val) ? 0 : Math.round(val * 100));
  }, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Scale size={20} /> Comprobar dinero
        </h2>
        <p className="text-slate-400 text-sm mt-1">Cuenta el dinero real en cada ubicación y compáralo con el saldo registrado.</p>
      </div>

      {/* Summary */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-white/10 grid grid-cols-2 gap-3">
        <div>
          <p className="text-slate-400 text-xs">Saldo registrado</p>
          <p className="text-white font-bold text-lg">{formatAmount(totalExpected, settings.currencySymbol)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Dinero contado</p>
          <p className={`font-bold text-lg ${totalCounted === totalExpected ? 'text-emerald-400' : 'text-amber-400'}`}>
            {formatAmount(totalCounted, settings.currencySymbol)}
          </p>
        </div>
        {totalCounted !== totalExpected && (
          <div className="col-span-2 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
            <AlertTriangle size={14} />
            Diferencia: {formatAmount(totalCounted - totalExpected, settings.currencySymbol)}
          </div>
        )}
      </div>

      {active.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Scale size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tienes ubicaciones para comprobar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((loc) => {
            const val = parseFloat(counted[loc.id] ?? '0');
            const countedCents = isNaN(val) ? 0 : Math.round(val * 100);
            const diff = countedCents - loc.balanceCents;
            const result = results[loc.id];

            return (
              <div key={loc.id} className="bg-slate-800 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${loc.color}22` }}>
                    <Icon name={loc.icon} size={18} color={loc.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{loc.name}</h3>
                    <p className="text-xs text-slate-500">Registrado: {formatAmount(loc.balanceCents, settings.currencySymbol)}</p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">{settings.currencySymbol}</span>
                  <input type="number" inputMode="decimal" step="0.01" min="0" value={counted[loc.id] ?? ''} onChange={(e) => setCounted((p) => ({ ...p, [loc.id]: e.target.value }))}
                    placeholder="Contar..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-emerald-500/50" />
                </div>

                <input type="text" value={notes[loc.id] ?? ''} onChange={(e) => setNotes((p) => ({ ...p, [loc.id]: e.target.value }))}
                  placeholder="Nota (opcional)..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm mt-2 focus:outline-none focus:border-emerald-500/50" />

                {result === 'ok' && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm mt-2 bg-emerald-500/10 rounded-lg px-3 py-2">
                    <Check size={14} /> Coincide exactamente
                  </div>
                )}
                {result === 'diff' && (
                  <div className={`flex items-center gap-2 text-sm mt-2 rounded-lg px-3 py-2 ${diff > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    {diff > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    Diferencia: {formatAmount(Math.abs(diff), settings.currencySymbol)} {diff > 0 ? 'de más (ajuste agregado)' : 'de menos (ajuste restado)'}
                  </div>
                )}

                <button onClick={() => handleCount(loc.id)} disabled={!counted[loc.id]}
                  className="w-full mt-3 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition-colors disabled:opacity-50 min-h-[44px]">
                  Comprobar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
