import { Chrome as Home, Receipt, ChartBar as BarChart3, Settings, Plus } from 'lucide-react';

export type TabId = 'inicio' | 'movimientos' | 'resumen' | 'configuracion';

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
  onAdd: () => void;
}

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'movimientos', label: 'Movimientos', icon: Receipt },
  { id: 'resumen', label: 'Resumen', icon: BarChart3 },
  { id: 'configuracion', label: 'Ajustes', icon: Settings },
];

export default function BottomNav({ active, onChange, onAdd }: Props) {
  return (
    <>
      {/* Floating action button — positioned relative to the app container */}
      <button
        onClick={onAdd}
        className="absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-90 shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all"
        aria-label="Nuevo movimiento"
      >
        <Plus size={28} className="text-white" strokeWidth={2.5} />
      </button>

      <nav className="flex-shrink-0 relative z-30 bg-slate-900/95 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex items-stretch justify-around px-2">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 px-3 flex-1 transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{ transition: 'transform 200ms ease', transform: isActive ? 'scale(110%)' : 'none' }} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
