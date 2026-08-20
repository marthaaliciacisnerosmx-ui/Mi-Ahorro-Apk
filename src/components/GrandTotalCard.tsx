import type { AppSettings } from '@/types';
import type { FundWithStats, Totals } from '@/hooks/useStore';
import Icon from './Icon';
import { formatCurrency, formatAmount, formatDate } from '@/utils/format';
import { TrendingUp, TrendingDown, Wallet, Layers, Eye, EyeOff, Calendar } from 'lucide-react';

interface Props {
  totals: Totals;
  settings: AppSettings;
  hidden: boolean;
  onToggleHidden: () => void;
}

export default function GrandTotalCard({ totals, settings, hidden, onToggleHidden }: Props) {
  const ocultar = (val: string) => (hidden ? '••••••' : val);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-5 shadow-xl">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Wallet size={16} /> Total general
          </div>
          <button onClick={onToggleHidden} className="text-slate-400 hover:text-white transition-colors p-1">
            {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className={`text-3xl font-bold tracking-tight ${totals.grandTotalCents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {ocultar(formatCurrency(totals.grandTotalCents, settings))}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-emerald-500/10 rounded-2xl p-3 border border-emerald-500/20">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-1">
              <TrendingUp size={14} /> Ingresos
            </div>
            <p className="text-emerald-300 font-semibold text-sm">{ocultar(formatCurrency(totals.totalIncomeCents, settings))}</p>
          </div>
          <div className="bg-red-500/10 rounded-2xl p-3 border border-red-500/20">
            <div className="flex items-center gap-1.5 text-red-400 text-xs mb-1">
              <TrendingDown size={14} /> Retiros
            </div>
            <p className="text-red-300 font-semibold text-sm">{ocultar(formatCurrency(totals.totalExpenseCents, settings))}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Layers size={13} /> {totals.activeFundCount} fondos activos
          </span>
          {totals.lastMovementDate && (
            <span className="flex items-center gap-1">
              <Calendar size={13} /> {formatDate(totals.lastMovementDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
