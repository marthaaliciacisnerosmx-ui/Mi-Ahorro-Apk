interface Bar {
  label: string;
  income: number;
  expense: number;
}

interface Props {
  data: Bar[];
  symbol: string;
}

export default function BarChart({ data, symbol }: Props) {
  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);

  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">Sin datos suficientes.</p>
      ) : (
        <div className="space-y-3">
          {data.map((d, i) => (
            <div key={i}>
              <div className="text-xs text-slate-400 mb-1 capitalize">{d.label}</div>
              <div className="flex items-end gap-2 h-16">
                <div className="flex-1 flex flex-col items-center justify-end gap-1">
                  <span className="text-[10px] text-emerald-400 font-medium">
                    {symbol}{(d.income / 100).toFixed(0)}
                  </span>
                  <div
                    className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500"
                    style={{ height: `${(d.income / maxVal) * 100}%`, minHeight: d.income > 0 ? '4px' : '0' }}
                  />
                </div>
                <div className="flex-1 flex flex-col items-center justify-end gap-1">
                  <span className="text-[10px] text-red-400 font-medium">
                    {symbol}{(d.expense / 100).toFixed(0)}
                  </span>
                  <div
                    className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t-lg transition-all duration-500"
                    style={{ height: `${(d.expense / maxVal) * 100}%`, minHeight: d.expense > 0 ? '4px' : '0' }}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4 pt-2 border-t border-white/5">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Ingresos
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-3 rounded bg-red-500" /> Retiros
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
