import { useState, useMemo } from 'react';
import type { AppSettings, Fund } from '@/types';
import type { MovementWithExtra } from '@/hooks/useStore';
import { Share2, Download, Image, FileText, MessageCircle, FileSpreadsheet, Eye, X } from 'lucide-react';
import {
  type ReportOptions,
  type ReportFormat,
  getDefaultReportOptions,
  resolvePeriodDates,
  filterMovementsForReport,
  generateWhatsAppText,
  generateCSV,
  generatePNG,
  generatePDF,
  shareOrDownload,
  downloadBlob,
} from '@/utils/reportGenerator';
import { formatAmount, formatDateShort } from '@/utils/format';

interface Props {
  open: boolean;
  movements: MovementWithExtra[];
  funds: Fund[];
  settings: AppSettings;
  preselectedFundId?: string;
  onCerrar: () => void;
}

export default function ReportGenerator({ open, movements, funds, settings, preselectedFundId, onCerrar }: Props) {
  const [opts, setOpts] = useState<ReportOptions>(() => {
    const o = getDefaultReportOptions();
    if (preselectedFundId) o.fundId = preselectedFundId;
    return o;
  });
  const [formato, setFormato] = useState<ReportFormat>('whatsapp');
  const [preview, setPreview] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  const { start, end, label } = useMemo(() => resolvePeriodDates(opts), [opts]);
  const movimientosFiltrados = useMemo(() => filterMovementsForReport(movements, opts, funds), [movements, opts, funds]);

  let totalIn = 0, totalOut = 0;
  for (const m of movimientosFiltrados) {
    if (m.type === 'income') totalIn += m.amountInCents;
    else if (m.type === 'expense') totalOut += m.amountInCents;
  }

  const handleGenerar = async () => {
    setGenerando(true);
    try {
      if (formato === 'png') {
        const dataUrl = await generatePNG(movimientosFiltrados, opts, settings, funds);
        setPreview(dataUrl);
      } else if (formato === 'pdf') {
        const blob = generatePDF(movimientosFiltrados, opts, settings, funds);
        const url = URL.createObjectURL(blob);
        setPreview(url);
      } else if (formato === 'whatsapp') {
        const text = generateWhatsAppText(movimientosFiltrados, opts, settings, funds);
        setPreview(text);
      } else if (formato === 'csv') {
        const csv = generateCSV(movimientosFiltrados, settings);
        setPreview(csv);
      }
    } finally {
      setGenerando(false);
    }
  };

  const handleCompartir = async () => {
    const filename = `mi-ahorro-reporte-${new Date().toISOString().slice(0, 10)}`;
    if (formato === 'png') {
      const dataUrl = await generatePNG(movimientosFiltrados, opts, settings, funds);
      const blob = await (await fetch(dataUrl)).blob();
      await shareOrDownload({ title: 'Reporte Mi Ahorro', blob, filename: `${filename}.png` });
    } else if (formato === 'pdf') {
      const blob = generatePDF(movimientosFiltrados, opts, settings, funds);
      await shareOrDownload({ title: 'Reporte Mi Ahorro', blob, filename: `${filename}.pdf` });
    } else if (formato === 'whatsapp') {
      const text = generateWhatsAppText(movimientosFiltrados, opts, settings, funds);
      await shareOrDownload({ title: 'Reporte Mi Ahorro', text, filename: `${filename}.txt` });
    } else if (formato === 'csv') {
      const csv = generateCSV(movimientosFiltrados, settings);
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      await shareOrDownload({ title: 'Reporte Mi Ahorro', blob, filename: `${filename}.csv` });
    }
  };

  const handleGuardar = () => {
    const filename = `mi-ahorro-reporte-${new Date().toISOString().slice(0, 10)}`;
    if (formato === 'png') {
      generatePNG(movimientosFiltrados, opts, settings, funds).then((dataUrl) => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${filename}.png`;
        a.click();
      });
    } else if (formato === 'pdf') {
      const blob = generatePDF(movimientosFiltrados, opts, settings, funds);
      downloadBlob(blob, `${filename}.pdf`);
    } else if (formato === 'whatsapp') {
      const text = generateWhatsAppText(movimientosFiltrados, opts, settings, funds);
      const blob = new Blob([text], { type: 'text/plain' });
      downloadBlob(blob, `${filename}.txt`);
    } else if (formato === 'csv') {
      const csv = generateCSV(movimientosFiltrados, settings);
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      downloadBlob(blob, `${filename}.csv`);
    }
  };

  if (!open) return null;

  const formatos: { id: ReportFormat; label: string; icon: typeof Image }[] = [
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'csv', label: 'CSV', icon: FileSpreadsheet },
    { id: 'png', label: 'Imagen', icon: Image },
    { id: 'pdf', label: 'PDF', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCerrar} />
      <div className="relative w-full max-w-md bg-slate-800 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Share2 size={18} /> Compartir reporte</h2>
          <button onClick={onCerrar} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Fund selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Fondo</label>
            <select value={opts.fundId} onChange={(e) => setOpts({ ...opts, fundId: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50">
              <option value="all">Todos los fondos</option>
              {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Periodo</label>
            <div className="grid grid-cols-4 gap-2">
              {(['dia', 'semana', 'mes', 'custom'] as const).map((p) => (
                <button key={p} onClick={() => setOpts({ ...opts, period: p })}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${opts.period === p ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-300 border border-white/10'}`}>
                  {p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Personalizado'}
                </button>
              ))}
            </div>
          </div>

          {opts.period === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Desde</label>
                <input type="date" value={opts.dateStart} onChange={(e) => setOpts({ ...opts, dateStart: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Hasta</label>
                <input type="date" value={opts.dateEnd} onChange={(e) => setOpts({ ...opts, dateEnd: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>
          )}

          {/* Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Filtrar por tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(['todos', 'income', 'expense'] as const).map((f) => (
                <button key={f} onClick={() => setOpts({ ...opts, filter: f })}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${opts.filter === f ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-300 border border-white/10'}`}>
                  {f === 'todos' ? 'Todos' : f === 'income' ? 'Ingresos' : 'Retiros'}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={opts.showBalance} onChange={(e) => setOpts({ ...opts, showBalance: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
              Incluir saldo total
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={opts.showNotes} onChange={(e) => setOpts({ ...opts, showNotes: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
              Incluir notas
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={opts.showCategories} onChange={(e) => setOpts({ ...opts, showCategories: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
              Incluir categorías
            </label>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Formato</label>
            <div className="grid grid-cols-4 gap-2">
              {formatos.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { setFormato(id); setPreview(null); }}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-colors ${formato === id ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border border-white/10 text-slate-400'}`}>
                  <Icon size={18} />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-900 rounded-xl p-3 text-xs text-slate-400">
            <div className="flex justify-between mb-1">
              <span>Movimientos: {movimientosFiltrados.length}</span>
              <span>Periodo: {label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-400">Ingresos: {formatAmount(totalIn, settings.currencySymbol)}</span>
              <span className="text-red-400">Retiros: {formatAmount(totalOut, settings.currencySymbol)}</span>
            </div>
          </div>

          {/* Generate + Preview */}
          <button onClick={handleGenerar} disabled={generando}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-700 text-white font-semibold text-sm hover:bg-slate-600 transition-colors disabled:opacity-50">
            <Eye size={16} /> {generando ? 'Generando...' : 'Generar vista previa'}
          </button>

          {preview && (
            <div className="space-y-2">
              <div className="bg-slate-900 rounded-xl p-3 max-h-48 overflow-y-auto">
                {formato === 'png' && <img src={preview} alt="Vista previa" className="w-full rounded-lg" />}
                {formato === 'pdf' && <iframe src={preview} title="PDF" className="w-full h-48 rounded-lg bg-white" />}
                {(formato === 'whatsapp' || formato === 'csv') && (
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{preview}</pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/10 shrink-0">
          <button onClick={onCerrar} className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 font-semibold text-sm hover:bg-white/10 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={!movimientosFiltrados.length}
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-slate-700 text-white font-semibold text-sm hover:bg-slate-600 transition-colors disabled:opacity-50">
            <Download size={16} /> Guardar
          </button>
          <button onClick={handleCompartir} disabled={!movimientosFiltrados.length}
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition-colors disabled:opacity-50">
            <Share2 size={16} /> Compartir
          </button>
        </div>
      </div>
    </div>
  );
}
