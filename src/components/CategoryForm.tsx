import { useState, useEffect } from 'react';
import type { Category } from '@/types';
import { FUND_COLORS, CATEGORY_ICONS } from '@/types';
import Icon from './Icon';

interface Props {
  open: boolean;
  type: 'income' | 'expense';
  categoryEditando?: Category | null;
  onGuardar: (data: { name: string; type: 'income' | 'expense'; color: string; icon: string }) => void;
  onCancelar: () => void;
}

export default function CategoryForm({ open, type, categoryEditando, onGuardar, onCancelar }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(FUND_COLORS[0]);
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(categoryEditando?.name ?? '');
      setColor(categoryEditando?.color ?? FUND_COLORS[0]);
      setIcon(categoryEditando?.icon ?? CATEGORY_ICONS[0]);
      setError('');
    }
  }, [open, categoryEditando]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    onGuardar({ name: name.trim(), type, color, icon });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ropa" autoFocus
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {FUND_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-9 h-9 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Icono</label>
        <div className="grid grid-cols-6 gap-2">
          {CATEGORY_ICONS.map((ic) => (
            <button key={ic} type="button" onClick={() => setIcon(ic)}
              className={`aspect-square rounded-xl flex items-center justify-center transition-all ${icon === ic ? 'bg-emerald-500/20 ring-2 ring-emerald-500' : 'bg-slate-900 hover:bg-slate-700'}`}>
              <Icon name={ic} size={18} className={icon === ic ? 'text-emerald-400' : 'text-slate-400'} />
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancelar} className="flex-1 py-3.5 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-colors min-h-[44px]">Cancelar</button>
        <button type="submit" className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all active:scale-95 min-h-[44px]">
          {categoryEditando ? 'Guardar' : 'Crear categoría'}
        </button>
      </div>
    </form>
  );
}
