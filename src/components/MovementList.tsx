import { useState } from 'react';
import { Search, Filter, ArrowDownUp } from 'lucide-react';
import type { AppSettings, Fund } from '@/types';
import type { MovementWithExtra } from '@/hooks/useStore';
import MovementItem from './MovementItem';
import { formatAmount } from '@/utils/format';

type FiltroTipo = 'todos' | 'income' | 'expense' | 'transfer';
type Orden = 'fecha-desc' | 'fecha-asc' | 'cantidad-desc' | 'cantidad-asc';

interface Props {
  movimientos: MovementWithExtra[];
  funds: Fund[];
  settings: AppSettings;
  onEditar: (m: MovementWithExtra) => void;
  onEliminar: (m: MovementWithExtra) => void;
  lockFundFilter?: string;
}

export default function MovementList({ movimientos, funds, settings, onEditar, onEliminar, lockFundFilter }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroFondo, setFiltroFondo] = useState(lockFundFilter ?? 'todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [orden, setOrden] = useState<Orden>('fecha-desc');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const categorias = Array.from(new Set(movimientos.map((m) => m.categoryName))).filter((c) => c && c !== 'Transferencia').sort();

  const filtrados = movimientos.filter((m) => {
    if (filtroTipo !== 'todos' && m.type !== filtroTipo) return false;
    if (filtroCategoria !== 'todas' && m.categoryName !== filtroCategoria) return false;
    if (filtroFondo !== 'todos' && m.fundId !== filtroFondo && m.destinationFundId !== filtroFondo) return false;
    if (fechaInicio && m.movementDate < fechaInicio) return false;
    if (fechaFin && m.movementDate > fechaFin) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      if (!m.note.toLowerCase().includes(q) && !m.categoryName.toLowerCase().includes(q) && !m.fundName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const ordenados = [...filtrados].sort((a, b) => {
    switch (orden) {
      case 'fecha-desc': return new Date(b.movementDate + 'T' + b.movementTime).getTime() - new Date(a.movementDate + 'T' + a.movementTime).getTime();
      case 'fecha-asc': return new Date(a.movementDate + 'T' + a.movementTime).getTime() - new Date(b.movementDate + 'T' + b.movementTime).getTime();
      case 'cantidad-desc': return b.amountInCents - a.amountInCents;
      case 'cantidad-asc': return a.amountInCents - b.amountInCents;
    }
  });

  const limpiarFiltros = () => {
    setFiltroTipo('todos');
    setFiltroCategoria('todas');
    if (!lockFundFilter) setFiltroFondo('todos');
    setFechaInicio('');
    setFechaFin('');
    setOrden('fecha-desc');
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nota, categoría o fondo..."
          className="w-full bg-slate-800 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors ${
            mostrarFiltros ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300 border border-white/10'
          }`}
        >
          <Filter size={15} /> Filtros
        </button>
        <div className="flex-1 flex items-center gap-1.5 text-sm">
          <ArrowDownUp size={15} className="text-slate-500" />
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-emerald-500/50"
          >
            <option value="fecha-desc">Más recientes primero</option>
            <option value="fecha-asc">Más antiguos primero</option>
            <option value="cantidad-desc">Mayor cantidad primero</option>
            <option value="cantidad-asc">Menor cantidad primero</option>
          </select>
        </div>
      </div>

      {mostrarFiltros && (
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3 border border-white/10 animate-[fadeIn_200ms_ease]">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo</label>
            <div className="flex gap-2">
              {(['todos', 'income', 'expense', 'transfer'] as FiltroTipo[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setFiltroTipo(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    filtroTipo === t ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-300 border border-white/10'
                  }`}
                >
                  {t === 'todos' ? 'Todos' : t === 'income' ? 'Ingresos' : t === 'expense' ? 'Retiros' : 'Transf.'}
                </button>
              ))}
            </div>
          </div>

          {!lockFundFilter && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Fondo</label>
              <select
                value={filtroFondo}
                onChange={(e) => setFiltroFondo(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-emerald-500/50"
              >
                <option value="todos">Todos los fondos</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-emerald-500/50"
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Desde</label>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Hasta</label>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>

          <button onClick={limpiarFiltros} className="text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors">
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="text-xs text-slate-500 px-1">
        {ordenados.length} {ordenados.length === 1 ? 'movimiento' : 'movimientos'}
      </div>

      <div className="space-y-2.5">
        {ordenados.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-sm">No hay movimientos que coincidan.</p>
          </div>
        ) : (
          ordenados.map((m) => (
            <MovementItem
              key={m.id}
              movimiento={m}
              settings={settings}
              onEditar={() => onEditar(m)}
              onEliminar={() => onEliminar(m)}
            />
          ))
        )}
      </div>

      {ordenados.length > 0 && (
        <div className="text-center text-xs text-slate-600 pt-2">
          Total mostrado: {formatAmount(
            ordenados.reduce((acc, m) => acc + (m.type === 'income' ? m.amountInCents : m.type === 'expense' ? -m.amountInCents : 0), 0),
            settings.currencySymbol,
          )}
        </div>
      )}
    </div>
  );
}
