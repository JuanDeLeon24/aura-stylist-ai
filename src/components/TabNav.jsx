import { Shirt, ScanFace, Luggage, Share2 } from 'lucide-react';

const TABS = [
  { id: 'closet', label: 'Mi Clóset', shortLabel: 'Clóset', icon: Shirt, meta: 'inventario' },
  { id: 'twin', label: 'Gemelo Digital', shortLabel: 'Gemelo', icon: ScanFace, meta: 'colorimetría' },
  { id: 'agent', label: 'Agente & Maleta', shortLabel: 'Agente', icon: Luggage, meta: 'viajes' },
  { id: 'share', label: 'Compartir', shortLabel: 'Compartir', icon: Share2, meta: 'respaldo' },
];

export default function TabNav({ activeTab, onChange, itemCount }) {
  return (
    <div className="border-b border-white/8 bg-ink-950/50">
      <nav
        className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 sm:px-6 lg:px-8"
        aria-label="Secciones principales"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex shrink-0 items-center gap-2.5 px-3 py-4 text-xs font-semibold transition sm:px-4 ${
                active ? 'text-cream' : 'text-cream/38 hover:text-cream/70'
              }`}
            >
              <Icon
                className={`hidden h-4 w-4 transition sm:block ${active ? 'text-sand' : 'text-cream/30 group-hover:text-cream/55'}`}
              />
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'closet' && itemCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    active ? 'bg-sand/15 text-sand' : 'bg-white/5 text-cream/35'
                  }`}
                >
                  {itemCount}
                </span>
              )}
              <span
                className={`absolute inset-x-2 bottom-0 h-px rounded-full transition ${
                  active ? 'bg-gradient-to-r from-transparent via-sand to-transparent' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
