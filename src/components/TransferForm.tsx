import { useState, useEffect } from 'react';
import type { AppSettings, Fund, Location } from '@/types';
import { today, currentTime } from '@/utils/format';
import { ArrowRightLeft } from 'lucide-react';

interface Props {
  open: boolean;
  settings: AppSettings;
  funds: Fund[];
  locations: Location[];
  preselectedFundId?: string;
  preselectedLocationId?: string;
  onTransferFund: (data: { fromFundId: string; toFundId: string; amountInCents: number; movementDate: string; movementTime: string; note: string; locationId: string }) => void;
  onTransferLocation: (data: { fromLocationId: string; toLocationId: string; amountInCents: number; movementDate: string; movementTime: string; note: string; fundId: string }) => void;
  onCancelar: () => void;
}

export default function TransferForm({ open, settings, funds, locations, preselectedFundId, preselectedLocationId, onTransferFund, onTransferLocation, onCancelar }: Props) {
  const [mode, setMode] = useState<'fund' | 'location'>('fund');
  const [fromFundId, setFromFundId] = useState('');
  const [toFundId, setToFundId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [fundId, setFundId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(currentTime());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const activeFunds = funds.filter((f) => !f.isArchived);
  const activeLocations = locations.filter((l) => !l.isArchived);

  useEffect(() => {
    if (open) {
      setMode('fund');
      setFromFundId(preselectedFundId || activeFunds[0]?.id || '');
      setToFundId(activeFunds[1]?.id || activeFunds[0]?.id || '');
      setFromLocationId(preselectedLocationId || activeLocations[0]?.id || '');
      setToLocationId(activeLocations[1]?.id || activeLocations[0]?.id || '');
      setLocationId(activeLocations[0]?.id || '');
      setFundId(preselectedFundId || activeFunds[0]?.id || '');
      setAmount('');
      setDate(today());
      setTime(currentTime());
      setNote('');
      setError('');
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) { setError('La cantidad debe ser mayor que cero.'); return; }
    const amountInCents = Math.round(value * 100);

    if (mode === 'fund') {
      if (!fromFundId || !toFundId) { setError('Selecciona ambos fondos.'); return; }
      if (fromFundId === toFundId) { setError('Los fondos deben ser diferentes.'); return; }
      if (!locationId) { setError('Selecciona una ubicación.'); return; }
      setSaving(true);
      onTransferFund({ fromFundId, toFundId, amountInCents, movementDate: date, movementTime: time, note: note.trim(), locationId });
    } else {
      if (!fromLocationId || !toLocationId) { setError('Selecciona ambas ubicaciones.'); return; }
      if (fromLocationId === toLocationId) { setError('Las ubicaciones deben ser diferentes.'); return; }
      if (!fundId) { setError('Selecciona un fondo.'); return; }
      setSaving(true);
      onTransferLocation({ fromLocationId, toLocationId, amountInCents, movementDate: date, movementTime: time, note: note.trim(), fundId });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('fund')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${mode === 'fund' ? 'bg-blue-500 text-white' : 'bg-slate-900 text-slate-300 border border-white/10'}`}>
          Entre fondos
        </button>
        <button type="button" onClick={() => setMode('location')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${mode === 'location' ? 'bg-blue-500 text-white' : 'bg-slate-900 text-slate-300 border border-white/10'}`}>
          Entre ubicaciones
        </button>
      </div>

      {mode === 'fund' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Fondo de origen *</label>
            <select value={fromFundId} onChange={(e) => setFromFundId(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
              {activeFunds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Fondo de destino *</label>
            <select value={toFundId} onChange={(e) => setToFundId(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
              {activeFunds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Ubicación</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
              {activeLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Ubicación de origen *</label>
            <select value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
              {activeLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Ubicación de destino *</label>
            <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
              {activeLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Fondo</label>
            <select value={fundId} onChange={(e) => setFundId(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
              {activeFunds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Cantidad *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">{settings.currencySymbol}</span>
          <input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white text-lg font-semibold focus:outline-none focus:border-blue-500/50" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-blue-500/50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Hora</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-blue-500/50" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Nota o motivo</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Opcional..."
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500/50" />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancelar} className="flex-1 py-3.5 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-colors min-h-[44px]">Cancelar</button>
        <button type="submit" disabled={saving}
          className="flex-1 py-3.5 rounded-xl bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-400 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]">
          <span className="flex items-center justify-center gap-2"><ArrowRightLeft size={18} /> {saving ? 'Guardando...' : 'Transferir'}</span>
        </button>
      </div>
    </form>
  );
}
