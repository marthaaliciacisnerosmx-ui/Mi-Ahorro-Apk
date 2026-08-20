import type { AppSettings } from '@/types';
import type { FundWithStats, Totals, MovementWithExtra } from '@/hooks/useStore';
import GrandTotalCard from './GrandTotalCard';
import FundCard from './FundCard';
import { PiggyBank, Plus, Minus, ArrowRightLeft, FolderPlus, Share2, Archive } from 'lucide-react';

interface Props {
  settings: AppSettings;
  totals: Totals;
  activeFunds: FundWithStats[];
  archivedFunds: FundWithStats[];
  recientes: MovementWithExtra[];
  hidden: boolean;
  onToggleHidden: () => void;
  onOpenFund: (id: string) => void;
  onMoveFund: (id: string, dir: 'up' | 'down') => void;
  onAgregar: () => void;
  onRetirar: () => void;
  onTransferir: () => void;
  onCrearFondo: () => void;
  onCompartir: () => void;
  onVerArchivados: () => void;
}

export default function HomeView({
  settings, totals, activeFunds, archivedFunds, recientes, hidden,
  onToggleHidden, onOpenFund, onMoveFund,
  onAgregar, onRetirar, onTransferir, onCrearFondo, onCompartir, onVerArchivados,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pt-1">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <PiggyBank size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{settings.appName}</h1>
          <p className="text-slate-400 text-xs">Control de ahorros</p>
        </div>
      </div>

      <GrandTotalCard totals={totals} settings={settings} hidden={hidden} onToggleHidden={onToggleHidden} />

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={onAgregar} className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm">
          <Plus size={18} /> Agregar dinero
        </button>
        <button onClick={onRetirar} className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-400 active:scale-95 text-white font-semibold py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all text-sm">
          <Minus size={18} /> Retirar dinero
        </button>
        <button onClick={onTransferir} className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all text-sm">
          <ArrowRightLeft size={18} /> Transferir
        </button>
        <button onClick={onCrearFondo} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-semibold py-3 rounded-xl transition-all text-sm">
          <FolderPlus size={18} /> Crear fondo
        </button>
      </div>

      <button onClick={onCompartir} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold py-3 rounded-xl border border-white/10 transition-all text-sm">
        <Share2 size={18} /> Compartir reporte
      </button>

      {/* Funds */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-200">Mis fondos</h2>
          {archivedFunds.length > 0 && (
            <button onClick={onVerArchivados} className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1">
              <Archive size={12} /> {archivedFunds.length} archivados
            </button>
          )}
        </div>

        {activeFunds.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FolderPlus size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tienes fondos activos.</p>
            <button onClick={onCrearFondo} className="text-emerald-400 text-sm mt-2 font-medium">Crear mi primer fondo</button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeFunds.map((fund, idx) => (
              <FundCard
                key={fund.id}
                fund={fund}
                totals={totals}
                settings={settings}
                hidden={hidden}
                onOpen={() => onOpenFund(fund.id)}
                onMoveUp={() => onMoveFund(fund.id, 'up')}
                onMoveDown={() => onMoveFund(fund.id, 'down')}
                canMoveUp={idx > 0}
                canMoveDown={idx < activeFunds.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
