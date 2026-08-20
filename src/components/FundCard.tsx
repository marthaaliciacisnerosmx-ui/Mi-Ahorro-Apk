import type { AppSettings } from '@/types';
import type { FundWithStats, Totals } from '@/hooks/useStore';
import Icon from './Icon';
import { formatAmount, formatDate } from '@/utils/format';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface Props {
  fund: FundWithStats;
  totals: Totals;
  settings: AppSettings;
  hidden: boolean;
  onOpen: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export default function FundCard({ fund, totals, settings, hidden, onOpen, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: Props) {
  const ocultar = (val: string) => (hidden ? '••••••' : val);
  const pct = totals.grandTotalCents !== 0 ? Math.round((Math.abs(fund.balanceCents) / Math.abs(totals.grandTotalCents)) * 100) : 0;

  return (
    <div
      className="bg-slate-800 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all cursor-pointer active:scale-[0.98]"
      onClick={onOpen}
      style={{ borderLeft: `4px solid ${fund.color}` }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${fund.color}22` }}>
          <Icon name={fund.icon} size={18} color={fund.color} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-white text-sm truncate">{fund.name}</h3>
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
              >
                <ArrowDown size={14} />
              </button>
            </div>
          </div>

          <p className={`font-bold text-lg mt-0.5 ${fund.balanceCents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {ocultar(formatAmount(fund.balanceCents, settings.currencySymbol))}
          </p>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
            <span className="flex items-center gap-0.5 text-emerald-500/80">
              <TrendingUp size={11} /> {ocultar(formatAmount(fund.totalIncomeCents, settings.currencySymbol))}
            </span>
            <span className="flex items-center gap-0.5 text-red-500/80">
              <TrendingDown size={11} /> {ocultar(formatAmount(fund.totalExpenseCents, settings.currencySymbol))}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-600">
              {fund.lastMovementDate ? (
                <span className="flex items-center gap-1"><Calendar size={10} /> {formatDate(fund.lastMovementDate)}</span>
              ) : 'Sin movimientos'}
            </span>
            {pct > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">{pct}% del total</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
