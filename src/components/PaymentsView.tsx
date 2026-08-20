import { useState } from 'react';
import type { AppSettings, Fund, Payment } from '@/types';
import { formatAmount, formatDate } from '@/utils/format';
import { Calendar, Plus, Check, Trash2, Clock, CircleAlert as AlertCircle, X } from 'lucide-react';
import { today } from '@/utils/format';

interface Props {
  payments: Payment[];
  funds: Fund[];
  settings: AppSettings;
  onPay: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (data: { concept: string; amountCents: number; dueDate: string; fundId: string; locationId: string; note: string; status: 'pending' }) => void;
  locations: import('@/types').Location[];
}

export default function PaymentsView({ payments, funds, settings, onPay, onCancel, onDelete, onCreate, locations }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(today());
  const [fundId, setFundId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const pending = payments.filter((p) => p.status === 'pending');
  const paid = payments.filter((p) => p.status === 'paid');
  const cancelled = payments.filter((p) => p.status === 'cancelled');

  const activeFunds = funds.filter((f) => !f.isArchived);
  const activeLocations = locations.filter((l) => !l.isArchived);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!concept.trim()) { setError('Escribe un concepto.'); return; }
    if (isNaN(val) || val <= 0) { setError('Cantidad inválida.'); return; }
    if (!fundId) { setError('Selecciona un fondo.'); return; }
    if (!locationId) { setError('Selecciona una ubicación.'); return; }
    onCreate({
      concept: concept.trim(),
      amountCents: Math.round(val * 100),
      dueDate,
      fundId,
      locationId,
      note: note.trim(),
      status: 'pending',
    });
    setShowForm(false);
    setConcept(''); setAmount(''); setNote(''); setFundId(''); setLocationId('');
    setError('');
  };

  const getFundName = (id: string) => funds.find((f) => f.id === id)?.name ?? '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar size={20} /> Pagos próximos
        </h2>
        <button onClick={() => { setFundId(activeFunds[0]?.id ?? ''); setLocationId(activeLocations[0]?.id ?? ''); setShowForm(true); }}
          className="flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-lg transition-colors min-h-[44px]">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tienes pagos pendientes.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pending.map((p) => {
            const overdue = p.dueDate < today();
            return (
              <div key={p.id} className={`bg-slate-800 rounded-2xl p-4 border ${overdue ? 'border-red-500/30' : 'border-white/5'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white text-sm truncate">{p.concept}</h3>
                    <p className="text-lg font-bold text-amber-400 mt-0.5">{formatAmount(p.amountCents, settings.currencySymbol)}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
                        {overdue ? <AlertCircle size={11} /> : <Clock size={11} />} {formatDate(p.dueDate)}
                      </span>
                      <span className="text-slate-600">|</span>
                      <span>{getFundName(p.fundId)}</span>
                    </div>
                    {p.note && <p className="text-slate-400 text-xs mt-1 line-clamp-2">{p.note}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                  <button onClick={() => onPay(p.id)} className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-emerald-500 text-white py-2.5 rounded-lg hover:bg-emerald-400 transition-colors min-h-[44px]">
                    <Check size={14} /> Pagar
                  </button>
                  <button onClick={() => onCancel(p.id)} className="flex items-center justify-center gap-1 text-xs font-medium text-slate-400 hover:text-white bg-white/5 py-2.5 px-3 rounded-lg transition-colors min-h-[44px]">
                    <X size={14} />
                  </button>
                  <button onClick={() => onDelete(p.id)} className="flex items-center justify-center gap-1 text-xs font-medium text-slate-400 hover:text-red-400 bg-white/5 py-2.5 px-3 rounded-lg transition-colors min-h-[44px]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {paid.length > 0 && (
        <div className="pt-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-2">Pagados ({paid.length})</h3>
          <div className="space-y-2">
            {paid.map((p) => (
              <div key={p.id} className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 opacity-60">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{p.concept}</p>
                  <p className="text-xs text-slate-500">{formatAmount(p.amountCents, settings.currencySymbol)} · {formatDate(p.dueDate)}</p>
                </div>
                <button onClick={() => onDelete(p.id)} className="text-slate-500 hover:text-red-400 transition-colors min-h-[44px] px-2">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <div className="pt-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-2">Cancelados ({cancelled.length})</h3>
          <div className="space-y-2">
            {cancelled.map((p) => (
              <div key={p.id} className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 opacity-50">
                <X size={16} className="text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-400 truncate">{p.concept}</p>
                  <p className="text-xs text-slate-500">{formatAmount(p.amountCents, settings.currencySymbol)}</p>
                </div>
                <button onClick={() => onDelete(p.id)} className="text-slate-500 hover:text-red-400 transition-colors min-h-[44px] px-2">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md bg-slate-800 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white">Nuevo pago</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Concepto *</label>
                <input type="text" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Renta, Luz, Agua..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Cantidad *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">{settings.currencySymbol}</span>
                  <input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Fecha de vencimiento</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Fondo *</label>
                <select value={fundId} onChange={(e) => setFundId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50">
                  <option value="">Selecciona...</option>
                  {activeFunds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Ubicación *</label>
                <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50">
                  <option value="">Selecciona...</option>
                  {activeLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nota</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Opcional..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm resize-none focus:outline-none focus:border-emerald-500/50" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3.5 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-colors min-h-[44px]">Cancelar</button>
                <button type="submit" className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-all active:scale-95 min-h-[44px]">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
