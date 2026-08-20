import { useState } from 'react';
import type { AppSettings } from '@/types';
import type { MovementWithExtra } from '@/hooks/useStore';
import { formatAmount, formatDate } from '@/utils/format';
import Icon from './Icon';
import { TrendingUp, TrendingDown, ArrowRightLeft, Pencil, Trash2 } from 'lucide-react';

interface Props {
  movimiento: MovementWithExtra;
  settings: AppSettings;
  onEditar: () => void;
  onEliminar: () => void;
}

export default function MovementItem({ movimiento, settings, onEditar, onEliminar }: Props) {
  const [confirmar, setConfirmar] = useState(false);

  const isIngreso = movimiento.type === 'income';
  const isTransfer = movimiento.type === 'transfer';

  const color = isIngreso ? 'text-emerald-400' : isTransfer ? 'text-blue-400' : 'text-red-400';
  const bg = isIngreso ? 'bg-emerald-500/15 text-emerald-400' : isTransfer ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/15 text-red-400';
  const sign = isIngreso ? '+' : isTransfer ? '↔' : '-';

  return (
    <div className="bg-slate-800 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          {isIngreso ? <TrendingUp size={18} /> : isTransfer ? <ArrowRightLeft size={18} /> : <TrendingDown size={18} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`font-bold text-base ${color}`}>
              {sign} {formatAmount(movimiento.amountInCents, settings.currencySymbol)}
            </span>
            {movimiento.categoryId && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 shrink-0">
                <Icon name={movimiento.categoryIcon} size={11} />
                {movimiento.categoryName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
            <Icon name={movimiento.fundIcon} size={11} color={movimiento.fundColor} />
            <span>{movimiento.fundName}</span>
            {movimiento.destinationFundName && (
              <>
                <ArrowRightLeft size={10} className="text-blue-400" />
                <span>{movimiento.destinationFundName}</span>
              </>
            )}
          </div>

          {movimiento.note && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{movimiento.note}</p>}

          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
            <span>{formatDate(movimiento.movementDate)} · {movimiento.movementTime}</span>
            <span className="text-slate-600">|</span>
            <span>Saldo: {formatAmount(movimiento.balanceAfterCents, settings.currencySymbol)}</span>
          </div>
        </div>
      </div>

      {confirmar ? (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
          <span className="text-xs text-slate-400 flex-1">
            {isTransfer ? '¿Eliminar esta transferencia? Afectará ambos fondos.' : '¿Eliminar este movimiento?'}
          </span>
          <button onClick={onEliminar} className="text-xs font-semibold bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-400">
            Sí, eliminar
          </button>
          <button onClick={() => setConfirmar(false)} className="text-xs font-semibold bg-white/5 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-white/10">
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
          <button onClick={onEditar} className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors">
            <Pencil size={13} /> Editar
          </button>
          <button onClick={() => setConfirmar(true)} className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-400 transition-colors ml-auto">
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
