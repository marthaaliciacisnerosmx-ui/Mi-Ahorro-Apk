import { useState } from 'react';
import type { AppSettings, Fund, Location } from '@/types';
import type { LocationWithStats, MovementWithExtra } from '@/hooks/useStore';
import Icon from './Icon';
import MovementList from './MovementList';
import { formatAmount, formatDate } from '@/utils/format';
import { ArrowLeft, Plus, Minus, ArrowRightLeft, Share2, Pencil, Archive, Trash2, TriangleAlert as AlertTriangle, MapPin, Calendar } from 'lucide-react';

interface Props {
  location: LocationWithStats;
  settings: AppSettings;
  funds: Fund[];
  locations: Location[];
  categories: import('@/types').Category[];
  movements: MovementWithExtra[];
  onBack: () => void;
  onEditar: () => void;
  onAgregar: () => void;
  onRetirar: () => void;
  onTransferir: () => void;
  onArchivar: () => void;
  onEliminar: () => void;
  onEditarMovimiento: (m: MovementWithExtra) => void;
  onEliminarMovimiento: (m: MovementWithExtra) => void;
}

export default function LocationDetailView({
  location, settings, funds, locations, categories, movements,
  onBack, onEditar, onAgregar, onRetirar, onTransferir, onArchivar, onEliminar,
  onEditarMovimiento, onEliminarMovimiento,
}: Props) {
  const [showDelete, setShowDelete] = useState(false);
  const locMovements = movements.filter((m) => m.locationId === location.id || m.destinationLocationId === location.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px]">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-white flex-1 truncate">{location.name}</h1>
        <button onClick={onEditar} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px]">
          <Pencil size={16} />
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 p-5 shadow-xl"
        style={{ background: `linear-gradient(135deg, ${location.color}15, #1e293b)` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${location.color}22` }}>
            <Icon name={location.icon} size={24} color={location.color} />
          </div>
          <div>
            <p className="text-slate-400 text-xs">{location.description || 'Sin descripción'}</p>
          </div>
        </div>
        <p className={`text-3xl font-bold ${location.balanceCents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatAmount(location.balanceCents, settings.currencySymbol)} {settings.currency}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-emerald-500/10 rounded-xl p-2.5 border border-emerald-500/20">
            <p className="text-emerald-400 text-xs">Ingresado</p>
            <p className="text-emerald-300 font-semibold text-sm">{formatAmount(location.totalIncomeCents, settings.currencySymbol)}</p>
          </div>
          <div className="bg-red-500/10 rounded-xl p-2.5 border border-red-500/20">
            <p className="text-red-400 text-xs">Retirado</p>
            <p className="text-red-300 font-semibold text-sm">{formatAmount(location.totalExpenseCents, settings.currencySymbol)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <MapPin size={12} /> {location.movementCount} movimiento(s)
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={onAgregar} className="flex flex-col items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-3 rounded-xl transition-colors min-h-[44px]">
          <Plus size={18} />
          <span className="text-[10px] font-medium">Agregar</span>
        </button>
        <button onClick={onRetirar} className="flex flex-col items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-xl transition-colors min-h-[44px]">
          <Minus size={18} />
          <span className="text-[10px] font-medium">Retirar</span>
        </button>
        <button onClick={onTransferir} className="flex flex-col items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-3 rounded-xl transition-colors min-h-[44px]">
          <ArrowRightLeft size={18} />
          <span className="text-[10px] font-medium">Transferir</span>
        </button>
      </div>

      <div className="flex gap-2">
        {!location.isArchived ? (
          <button onClick={onArchivar} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-amber-400 bg-slate-800 py-2.5 rounded-xl transition-colors min-h-[44px]">
            <Archive size={14} /> Archivar
          </button>
        ) : null}
        <button onClick={() => setShowDelete(true)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-400 bg-slate-800 py-2.5 rounded-xl transition-colors min-h-[44px]">
          <Trash2 size={14} /> Eliminar
        </button>
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-3">Historial</h2>
        {locMovements.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">Sin movimientos en esta ubicación.</p>
          </div>
        ) : (
          <MovementList
            movimientos={locMovements}
            funds={funds}
            settings={settings}
            onEditar={onEditarMovimiento}
            onEliminar={onEliminarMovimiento}
            lockFundFilter={undefined}
          />
        )}
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDelete(false)} />
          <div className="relative w-full max-w-md bg-slate-800 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-300">
              <AlertTriangle size={20} />
              <h2 className="text-lg font-bold">Eliminar ubicación</h2>
            </div>
            <p className="text-sm text-slate-300">
              La ubicación <strong className="text-white">{location.name}</strong> tiene {location.movementCount} movimiento(s).
            </p>
            <div className="space-y-2">
              <button onClick={() => { onEliminar(); setShowDelete(false); }}
                className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-400 transition-colors min-h-[44px]">
                Eliminar ubicación
              </button>
              <button onClick={() => setShowDelete(false)}
                className="w-full py-3 rounded-xl bg-white/5 text-slate-400 font-semibold text-sm hover:bg-white/10 transition-colors min-h-[44px]">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
