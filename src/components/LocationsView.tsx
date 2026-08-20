import type { AppSettings, Fund } from '@/types';
import type { LocationWithStats } from '@/hooks/useStore';
import Icon from './Icon';
import { formatAmount } from '@/utils/format';
import { ArrowUp, ArrowDown, MapPin, Archive, RotateCcw, Plus } from 'lucide-react';

interface Props {
  locations: LocationWithStats[];
  settings: AppSettings;
  onOpen: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onCrear: () => void;
  onUnarchive: (id: string) => void;
}

export default function LocationsView({ locations, settings, onOpen, onMove, onCrear, onUnarchive }: Props) {
  const active = locations.filter((l) => !l.isArchived);
  const archived = locations.filter((l) => l.isArchived);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <MapPin size={20} /> Ubicaciones
        </h2>
        <button onClick={onCrear} className="flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-lg transition-colors min-h-[44px]">
          <Plus size={16} /> Nueva
        </button>
      </div>

      <p className="text-slate-400 text-sm">Las ubicaciones indican dónde está guardado el dinero: efectivo, banco, tarjeta, alcancía, etc.</p>

      {active.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <MapPin size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tienes ubicaciones.</p>
          <button onClick={onCrear} className="text-emerald-400 text-sm mt-2 font-medium">Crear ubicación</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {active.map((loc, idx) => (
            <div key={loc.id} className="bg-slate-800 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all cursor-pointer active:scale-[0.98]"
              onClick={() => onOpen(loc.id)} style={{ borderLeft: `4px solid ${loc.color}` }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${loc.color}22` }}>
                  <Icon name={loc.icon} size={18} color={loc.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-white text-sm truncate">{loc.name}</h3>
                    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => onMove(loc.id, 'up')} disabled={idx === 0}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors">
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={() => onMove(loc.id, 'down')} disabled={idx === active.length - 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors">
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                  <p className={`font-bold text-lg mt-0.5 ${loc.balanceCents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatAmount(loc.balanceCents, settings.currencySymbol)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{loc.movementCount} movimiento(s)</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="space-y-2 pt-4">
          <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-1.5">
            <Archive size={14} /> Archivadas ({archived.length})
          </h3>
          {archived.map((loc) => (
            <div key={loc.id} className="bg-slate-800 rounded-2xl p-4 border border-white/5 flex items-center gap-3" style={{ borderLeft: `4px solid ${loc.color}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 opacity-60" style={{ backgroundColor: `${loc.color}22` }}>
                <Icon name={loc.icon} size={18} color={loc.color} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-300 text-sm truncate">{loc.name}</h3>
                <p className={`text-sm font-medium ${loc.balanceCents >= 0 ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
                  {formatAmount(loc.balanceCents, settings.currencySymbol)}
                </p>
              </div>
              <button onClick={() => onUnarchive(loc.id)} className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-lg transition-colors min-h-[44px]">
                <RotateCcw size={14} /> Restaurar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
