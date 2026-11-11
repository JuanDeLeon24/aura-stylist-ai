import { ShieldCheck, Plus, Sparkles } from 'lucide-react';
import { Segmented } from './ui';

const MODES = [
  { id: 'unisex', label: 'Unisex' },
  { id: 'fem', label: 'Femenino' },
  { id: 'masc', label: 'Masculino' },
];

export default function Header({ mode, onModeChange, onAddItem }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sand/25 bg-gradient-to-br from-sand-soft/20 to-sand/5 shadow-[0_10px_30px_-15px_rgba(203,184,154,0.6)]">
            <span className="font-display text-2xl leading-none text-sand-soft">A</span>
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-moss shadow-[0_0_12px_rgba(143,191,168,0.8)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-extrabold tracking-[0.2em] text-cream">AURA</span>
              <span className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-sand/60 sm:inline">
                Stylist AI
              </span>
            </div>
            <p className="hidden text-[10px] tracking-wide text-cream/35 sm:block">Tu clóset, con intención.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 rounded-full border border-moss/15 bg-moss/[0.06] px-2.5 py-1.5 lg:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-moss" />
            <span className="text-[10px] font-semibold text-moss/90">Datos locales</span>
          </div>
          <div className="hidden sm:block">
            <Segmented options={MODES} value={mode} onChange={onModeChange} />
          </div>
          <button type="button" onClick={onAddItem} className="btn btn-primary px-3.5 sm:px-4">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Añadir prenda</span>
            <span className="sm:hidden">Añadir</span>
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-2 sm:hidden">
        <Sparkles className="h-3.5 w-3.5 text-sand/70" />
        <span className="text-[10px] text-cream/40">Colorimetría, outfits y maleta en un solo lugar.</span>
      </div>
    </header>
  );
}
