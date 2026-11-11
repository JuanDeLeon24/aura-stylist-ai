import { useEffect, useMemo, useState } from 'react';
import { ScanLine, Shuffle, Sparkles, Check } from 'lucide-react';
import { colorMatch, getPalette } from '../lib/colors';
import { evaluateLook } from '../lib/recommendation';
import { EmptyState, GarmentImage, MatchPill, Modal, ScoreRing } from './ui';

export default function EvaluateLookModal({ open, onClose, inventory, profile }) {
  const [selection, setSelection] = useState({ top: '', layer: '', bottom: '', shoes: '', accessory: '' });

  const groups = useMemo(
    () => ({
      top: inventory.filter((item) => item.category === 'tops' && !item.layer),
      layer: inventory.filter((item) => item.category === 'tops' && item.layer),
      bottom: inventory.filter((item) => item.category === 'bottoms'),
      shoes: inventory.filter((item) => item.category === 'shoes'),
      accessory: inventory.filter((item) => item.category === 'accessories'),
    }),
    [inventory],
  );

  const randomize = () => {
    const pick = (items) => (items.length ? items[Math.floor(Math.random() * items.length)].id : '');
    setSelection({
      top: pick(groups.top),
      layer: Math.random() > 0.55 ? pick(groups.layer) : '',
      bottom: pick(groups.bottom),
      shoes: pick(groups.shoes),
      accessory: Math.random() > 0.3 ? pick(groups.accessory) : '',
    });
  };

  useEffect(() => {
    if (!open) return;
    const best = (items) =>
      items.length
        ? [...items].sort(
            (a, b) => colorMatch(b.colorHex, profile.undertone) - colorMatch(a.colorHex, profile.undertone),
          )[0].id
        : '';
    setSelection({
      top: best(groups.top),
      layer: '',
      bottom: best(groups.bottom),
      shoes: best(groups.shoes),
      accessory: best(groups.accessory),
    });
  }, [open, groups, profile.undertone]);

  const items = [
    groups.top.find((item) => item.id === selection.top),
    groups.layer.find((item) => item.id === selection.layer),
    groups.bottom.find((item) => item.id === selection.bottom),
    groups.shoes.find((item) => item.id === selection.shoes),
    groups.accessory.find((item) => item.id === selection.accessory),
  ];
  const selected = items.filter(Boolean);
  const result = useMemo(() => evaluateLook({ items, profile }), [selection, profile, inventory]);
  const palette = getPalette(profile.undertone);

  const renderSelect = (key, label, options) => (
    <label className="block">
      <span className="field-label">{label}</span>
      <select
        value={selection[key]}
        onChange={(event) => setSelection((current) => ({ ...current, [key]: event.target.value }))}
        className="field text-[11px]"
        disabled={!options.length}
      >
        <option value="">{options.length ? 'Sin seleccionar' : 'Sin prendas en esta categoría'}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} · {item.colorName}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Evaluar un look"
      subtitle="Selecciona las piezas y AURA revisa color, formalidad y proporción."
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="hidden text-[9px] text-cream/30 sm:block">La evaluación se actualiza en tiempo real.</span>
          <button type="button" onClick={onClose} className="btn btn-primary w-full sm:w-auto">
            <Check className="h-4 w-4" /> Listo
          </button>
        </div>
      }
    >
      {inventory.length < 2 ? (
        <EmptyState
          icon={ScanLine}
          title="Aún no hay suficiente para evaluar"
          description="Añade al menos una prenda superior, una inferior y calzado para que el análisis tenga sentido."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Selección</p>
              <button type="button" onClick={randomize} className="flex items-center gap-1.5 text-[9px] font-semibold text-sand hover:text-sand-soft">
                <Shuffle className="h-3 w-3" /> Sorpréndeme
              </button>
            </div>
            {renderSelect('top', 'Superior', groups.top)}
            {groups.layer.length > 0 && renderSelect('layer', 'Capa (opcional)', groups.layer)}
            {renderSelect('bottom', 'Inferior', groups.bottom)}
            {renderSelect('shoes', 'Calzado', groups.shoes)}
            {renderSelect('accessory', 'Accesorio (opcional)', groups.accessory)}

            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <p className="field-label">Paleta activa</p>
              <div className="flex gap-1.5">
                {palette.colors.map((color) => (
                  <span
                    key={color.hex}
                    className="h-4 flex-1 rounded-sm border border-white/10"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-cream/30">
                {palette.name} · el color de la capa superior pesa más porque está cerca del rostro.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-ink-950/45 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Resultado</p>
                  <p className="mt-1 font-display text-3xl leading-none text-cream">{result?.label || 'Selecciona un look'}</p>
                </div>
                <ScoreRing value={result?.score || 0} size={66} sublabel="look" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: 'Color', value: result ? `${result.colorAvg}%` : '—' },
                  { label: 'Rostro', value: result ? `${result.nearFace}%` : '—' },
                  { label: 'Formalidad', value: result ? `${result.formalityAvg}/10` : '—' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-1.5">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-cream/25">{stat.label}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-cream/70">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {selected.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selected.map((item) => (
                  <div key={item.id} className="w-20 shrink-0">
                    <GarmentImage item={item} className="aspect-square rounded-xl border border-white/10" compact />
                    <p className="mt-1 line-clamp-1 text-[8px] text-cream/40">{item.name}</p>
                    <MatchPill
                      score={colorMatch(item.colorHex, profile.undertone)}
                      undertone={profile.undertone}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            )}

            {result ? (
              <div className="space-y-2">
                {result.feedback.map((line, index) => (
                  <div key={index} className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sand/60" />
                    <p className="text-[10px] leading-relaxed text-cream/45">{line}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] leading-relaxed text-cream/30">
                Elige al menos una pieza para ver feedback sobre colorimetría, formalidad y proporción.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
