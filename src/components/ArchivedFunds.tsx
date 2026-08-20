import type { AppSettings, Fund } from '@/types';
import type { FundWithStats } from '@/hooks/useStore';
import Icon from './Icon';
import { formatAmount } from '@/utils/format';
import { Archive, RotateCcw } from 'lucide-react';

interface Props {
  funds: FundWithStats[];
  settings: AppSettings;
  onUnarchive: (id: string) => void;
  onOpen: (id: string) => void;
}

export default function ArchivedFunds({ funds, settings, onUnarchive, onOpen }: Props) {
  const archived = funds.filter((f) => f.isArchived);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Archive size={20} /> Fondos archivados
        </h2>
        <p className="text-slate-400 text-sm mt-1">{archived.length} fondo(s) archivado(s)</p>
      </div>

      {archived.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Archive size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay fondos archivados.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {archived.map((fund) => (
            <div
              key={fund.id}
              className="bg-slate-800 rounded-2xl p-4 border border-white/5 flex items-center gap-3"
              style={{ borderLeft: `4px solid ${fund.color}` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 opacity-60" style={{ backgroundColor: `${fund.color}22` }}>
                <Icon name={fund.icon} size={18} color={fund.color} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-300 text-sm truncate">{fund.name}</h3>
                <p className={`text-sm font-medium ${fund.balanceCents >= 0 ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
                  {formatAmount(fund.balanceCents, settings.currencySymbol)}
                </p>
              </div>
              <button onClick={() => onUnarchive(fund.id)} className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-lg transition-colors">
                <RotateCcw size={14} /> Restaurar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
