import { useState, useEffect } from 'react';
import type { AppSettings, Category, Fund, Movement, MovementType, Location } from '@/types';
import { today, currentTime } from '@/utils/format';
import { TriangleAlert as AlertTriangle } from 'lucide-react';
import Icon from './Icon';

interface Props {
  open: boolean;
  tipo: MovementType;
  settings: AppSettings;
  funds: Fund[];
  locations: Location[];
  categories: Category[];
  preselectedFundId?: string;
  movimientoEditando?: Movement | null;
  onGuardar: (data: Omit<Movement, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancelar: () => void;
  onCreateCategory: () => void;
}

export default function MovementForm({
  open, tipo, settings, funds, locations, categories, preselectedFundId, movimientoEditando, onGuardar, onCancelar, onCreateCategory,
}: Props) {
  const [fundId, setFundId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(currentTime());
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const activeFunds = funds.filter((f) => !f.isArchived);
  const activeLocations = locations.filter((l) => !l.isArchived);
  const filteredCategories = categories.filter((c) => c.type === (tipo === 'income' ? 'income' : 'expense') && !c.isArchived);

  useEffect(() => {
    if (open) {
      if (movimientoEditando) {
        setFundId(movimientoEditando.fundId);
        setLocationId(movimientoEditando.locationId);
        setAmount((movimientoEditando.amountInCents / 100).toString());
        setDate(movimientoEditando.movementDate);
        setTime(movimientoEditando.movementTime);
        setCategoryId(movimientoEditando.categoryId);
        setNote(movimientoEditando.note);
      } else {
        setFundId(preselectedFundId || activeFunds[0]?.id || '');
        setLocationId(activeLocations[0]?.id || '');
        setAmount('');
        setDate(today());
        setTime(currentTime());
        setCategoryId('');
        setNote('');
      }
      setError('');
      setSaving(false);
    }
  }, [open, movimientoEditando, preselectedFundId, tipo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) { setError('La cantidad debe ser mayor que cero.'); return; }
    if (!fundId) { setError('Selecciona un fondo.'); return; }
    setSaving(true);
    onGuardar({
      fundId, locationId, type: tipo, amountInCents: Math.round(value * 100),
      categoryId, note: note.trim(), movementDate: date, movementTime: time,
      isInitialBalance: false, verificationStatus: 'verified',
      recipientName: '', verificationNote: '', verificationDeadline: null, receiptData: null,
    });
  };

  const isIncome = tipo === 'income';
  const buttonColor = isIncome ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20' : 'bg-red-500 hover:bg-red-400 shadow-red-500/20';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Fondo *</label>
        <select value={fundId} onChange={(e) => setFundId(e.target.value)}
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50">
          {activeFunds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Ubicación</label>
        <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50">
          {activeLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Cantidad {isIncome ? 'ingresada' : 'retirada'} *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">{settings.currencySymbol}</span>
          <input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white text-lg font-semibold focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Hora</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-slate-300">Categoría (opcional)</label>
          <button type="button" onClick={onCreateCategory} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">+ Crear categoría</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCategoryId('')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${categoryId === '' ? 'bg-slate-600 text-white' : 'bg-slate-900 text-slate-300 border border-white/10 hover:border-white/20'}`}>
            Sin categoría
          </button>
          {filteredCategories.map((cat) => (
            <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${categoryId === cat.id ? (isIncome ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'bg-slate-900 text-slate-300 border border-white/10 hover:border-white/20'}`}>
              <Icon name={cat.icon} size={14} />{cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">{isIncome ? 'Nota o descripción' : '¿En qué se utilizó?'}</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Opcional..."
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm resize-none focus:outline-none focus:border-emerald-500/50" />
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-red-300 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancelar} className="flex-1 py-3.5 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-colors min-h-[44px]">Cancelar</button>
        <button type="submit" disabled={saving}
          className={`flex-1 py-3.5 rounded-xl text-white font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-50 min-h-[44px] ${buttonColor}`}>
          {saving ? 'Guardando...' : isIncome ? 'Guardar ingreso' : 'Guardar retiro'}
        </button>
      </div>
    </form>
  );
}
