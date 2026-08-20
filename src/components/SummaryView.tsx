import { useMemo } from 'react';
import type { AppSettings } from '@/types';
import type { FundWithStats, MovementWithExtra, Totals } from '@/hooks/useStore';
import DonutChart from './DonutChart';
import BarChart from './BarChart';
import { formatCurrency, formatAmount, currentMonthKey, previousMonthKey, getMonthKey, getMonthLabel, getMonthLabelShort } from '@/utils/format';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Crown, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';

interface Props {
  funds: FundWithStats[];
  movements: MovementWithExtra[];
  totals: Totals;
  settings: AppSettings;
}

export default function SummaryView({ funds, movements, totals, settings }: Props) {
  const mesActual = currentMonthKey();
  const mesAnterior = previousMonthKey();

  const stats = useMemo(() => {
    const delMes = movements.filter((m) => getMonthKey(m.movementDate) === mesActual);
    let ingresos = 0, retiros = 0;
    const gastosPorCategoria: Record<string, number> = {};
    const retirosPorFondo: Record<string, number> = {};

    for (const m of delMes) {
      if (m.type === 'income') ingresos += m.amountInCents;
      else if (m.type === 'expense') {
        retiros += m.amountInCents;
        gastosPorCategoria[m.categoryName] = (gastosPorCategoria[m.categoryName] || 0) + m.amountInCents;
        retirosPorFondo[m.fundName] = (retirosPorFondo[m.fundName] || 0) + m.amountInCents;
      }
    }

    const delMesAnterior = movements.filter((m) => getMonthKey(m.movementDate) === mesAnterior);
    let ingresosAnt = 0, retirosAnt = 0;
    for (const m of delMesAnterior) {
      if (m.type === 'income') ingresosAnt += m.amountInCents;
      else if (m.type === 'expense') retirosAnt += m.amountInCents;
    }

    let categoriaTop = '', maxGasto = 0;
    for (const [cat, val] of Object.entries(gastosPorCategoria)) {
      if (val > maxGasto) { maxGasto = val; categoriaTop = cat; }
    }

    let fondoConMasRetiros = '', maxRetirosFondo = 0;
    for (const [fondo, val] of Object.entries(retirosPorFondo)) {
      const numVal: number = val;
      if (numVal > maxRetirosFondo) { maxRetirosFondo = numVal; fondoConMasRetiros = fondo; }
    }

    let fondoMayorSaldo = '', maxSaldo = -Infinity;
    for (const f of funds) {
      if (!f.isArchived && f.balanceCents > maxSaldo) { maxSaldo = f.balanceCents; fondoMayorSaldo = f.name; }
    }

    const ahorroNeto = ingresos - retiros;
    const ahorroAnterior = ingresosAnt - retirosAnt;
    const diff = ahorroNeto - ahorroAnterior;
    const pct = ahorroAnterior !== 0 ? Math.round((diff / Math.abs(ahorroAnterior)) * 100) : null;

    return { ingresos, retiros, ahorroNeto, categoriaTop, fondoConMasRetiros, fondoMayorSaldo, diff, pct };
  }, [movements, mesActual, mesAnterior, funds]);

  const donutSlices = useMemo(() => {
    return funds.filter((f) => !f.isArchived && f.balanceCents > 0).map((f) => ({
      label: f.name,
      value: f.balanceCents,
      color: f.color,
    }));
  }, [funds]);

  const monthlyData = useMemo(() => {
    const mapa = new Map<string, { income: number; expense: number }>();
    for (const m of movements) {
      const mes = getMonthKey(m.movementDate);
      const actual = mapa.get(mes) || { income: 0, expense: 0 };
      if (m.type === 'income') actual.income += m.amountInCents;
      else if (m.type === 'expense') actual.expense += m.amountInCents;
      mapa.set(mes, actual);
    }
    return Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([mes, vals]) => ({ label: getMonthLabelShort(mes), income: vals.income, expense: vals.expense }));
  }, [movements]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Resumen</h1>
        <p className="text-slate-400 text-sm capitalize">{getMonthLabel(mesActual)}</p>
      </div>

      {/* Grand total */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Wallet size={16} /> Total general
        </div>
        <span className={`font-bold text-lg ${totals.grandTotalCents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatCurrency(totals.grandTotalCents, settings)}
        </span>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-1.5">
            <TrendingUp size={14} /> Ingresos del mes
          </div>
          <p className="text-emerald-300 font-bold text-base">{formatCurrency(stats.ingresos, settings)}</p>
        </div>
        <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20">
          <div className="flex items-center gap-1.5 text-red-400 text-xs mb-1.5">
            <TrendingDown size={14} /> Retiros del mes
          </div>
          <p className="text-red-300 font-bold text-base">{formatCurrency(stats.retiros, settings)}</p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 border border-white/10 col-span-2">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5">
            <PiggyBank size={14} /> Ahorro neto del mes
          </div>
          <p className={`font-bold text-2xl ${stats.ahorroNeto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(stats.ahorroNeto, settings)}
          </p>
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Comparación vs mes anterior</span>
          <span className={`flex items-center gap-1 font-medium text-sm ${stats.diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.diff >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {stats.pct !== null ? `${stats.pct > 0 ? '+' : ''}${stats.pct}%` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Fondo con mayor saldo</span>
          <span className="text-white font-medium text-sm">{stats.fondoMayorSaldo || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Fondo con más retiros</span>
          <span className="text-white font-medium text-sm">{stats.fondoConMasRetiros || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm flex items-center gap-1">
            <Crown size={14} /> Categoría con mayor gasto
          </span>
          <span className="text-amber-400 font-medium text-sm">{stats.categoriaTop || '—'}</span>
        </div>
      </div>

      {/* Donut chart */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Distribución entre fondos</h3>
        <div className="bg-slate-800 rounded-2xl p-4 border border-white/10 flex flex-col items-center gap-4">
          <DonutChart slices={donutSlices} />
          <div className="w-full space-y-1.5">
            {donutSlices.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="text-slate-400">{formatAmount(s.value, settings.currencySymbol)}</span>
              </div>
            ))}
            {donutSlices.length === 0 && (
              <p className="text-slate-500 text-sm text-center">Sin fondos con saldo positivo.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Ingresos y retiros por mes</h3>
        <div className="bg-slate-800 rounded-2xl p-4 border border-white/10">
          <BarChart data={monthlyData} symbol={settings.currencySymbol} />
        </div>
      </div>
    </div>
  );
}
