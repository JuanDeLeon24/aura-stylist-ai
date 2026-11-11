import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Upload, X, Check, Sparkles, Layers } from 'lucide-react';
import { CATEGORIES, FREQUENCIES, SEASONS, STYLES, WARMTH } from '../lib/data';
import { colorMatch, colorName as detectColorName, getPalette, readableText } from '../lib/colors';
import { readImageFile, uid } from '../lib/storage';
import { Field, GarmentImage, MatchPill, Modal } from './ui';

const EMPTY = {
  name: '',
  category: 'tops',
  subtype: 'Camisa',
  colorName: 'Arena',
  colorHex: '#D6C4AB',
  style: 'Casual',
  formality: 5,
  season: 'todo',
  material: '',
  warmth: 1,
  layer: false,
  frequency: 'ocasional',
  image: '',
  notes: '',
};

export default function ItemModal({ open, onClose, item, profile, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef(null);
  const palette = getPalette(profile.undertone);
  const isEdit = Boolean(item);

  useEffect(() => {
    if (!open) return;
    setForm(item ? { ...EMPTY, ...item } : { ...EMPTY, image: '' });
  }, [open, item]);

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  const handleFile = async (file) => {
    if (!file) return;
    setReading(true);
    try {
      const image = await readImageFile(file, 950, 0.84);
      update({ image });
    } finally {
      setReading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      name: form.name.trim(),
      material: form.material.trim() || 'Por definir',
      colorName: form.colorName.trim() || detectColorName(form.colorHex),
      id: item?.id || uid('item'),
      updatedAt: new Date().toISOString(),
    };
    onSave(payload, isEdit);
    onClose();
  };

  const match = colorMatch(form.colorHex, profile.undertone);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar prenda' : 'Nueva prenda'}
      subtitle={
        isEdit
          ? 'Ajusta las etiquetas para que el agente la use mejor.'
          : 'Una foto y unas etiquetas bastan para que AURA empiece a combinarla.'
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="hidden text-[10px] text-cream/30 sm:block">
            {isEdit ? `ID ${form.id}` : 'Se guarda solo en este dispositivo'}
          </span>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 sm:flex-none">
              Cancelar
            </button>
            <button
              type="submit"
              form="item-form"
              disabled={!form.name.trim() || reading}
              className="btn btn-primary flex-1 disabled:opacity-40 sm:flex-none"
            >
              <Check className="h-4 w-4" />
              {isEdit ? 'Guardar cambios' : 'Añadir al clóset'}
            </button>
          </div>
        </div>
      }
    >
      <form id="item-form" onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              handleFile(event.dataTransfer.files?.[0]);
            }}
            className={`relative aspect-[4/5] overflow-hidden rounded-2xl border border-dashed transition ${
              dragOver ? 'border-sand bg-sand/10' : 'border-white/15 bg-ink-950/50'
            }`}
          >
            {form.image ? (
              <>
                <GarmentImage item={form} className="h-full w-full" />
                <div className="absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent p-3">
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="rounded-lg border border-white/15 bg-ink-950/70 px-2.5 py-1.5 text-[10px] font-semibold text-cream backdrop-blur-md transition hover:bg-ink-800"
                  >
                    Cambiar foto
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ image: '' })}
                    className="rounded-lg border border-white/15 bg-ink-950/70 p-1.5 text-cream/70 backdrop-blur-md transition hover:bg-red-950/70 hover:text-red-200"
                    aria-label="Quitar foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center"
              >
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sand">
                  {reading ? <Upload className="h-6 w-6 animate-pulse" /> : <ImagePlus className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-cream/80">{reading ? 'Procesando imagen…' : 'Sube una foto'}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-cream/35">
                    Arrastra o toca para elegir. JPG, PNG o WEBP. La foto se comprime en tu dispositivo.
                  </p>
                </div>
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </div>

          <label className="block">
            <span className="field-label">O pega una URL de imagen</span>
            <input
              value={form.image.startsWith('data:') ? '' : form.image}
              onChange={(event) => update({ image: event.target.value })}
              placeholder="https://..."
              className="field text-[11px]"
            />
            <span className="mt-1 block text-[9px] text-cream/25">
              Útil para catálogos. Si subes un archivo, la URL se reemplaza.
            </span>
          </label>

          <div className="rounded-2xl border border-white/10 bg-ink-950/50 p-3.5">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Vista previa</p>
              <MatchPill score={match} undertone={profile.undertone} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <GarmentImage item={{ ...form, name: form.name || 'Nueva prenda' }} className="h-14 w-12 shrink-0 rounded-lg" compact />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-cream">{form.name || 'Nombre de la prenda'}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-cream/40">
                  <span className="h-2 w-2 rounded-full border border-white/20" style={{ backgroundColor: form.colorHex }} />
                  {form.colorName} · {form.formality}/10
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" className="sm:col-span-2">
              <input
                autoFocus
                value={form.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="Ej: Blazer de lino camel"
                className="field"
                required
              />
            </Field>

            <div className="sm:col-span-2">
              <span className="field-label">Categoría</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => update({ category: category.id })}
                    className={`rounded-xl border px-2.5 py-2.5 text-[11px] font-semibold transition ${
                      form.category === category.id
                        ? 'border-sand/50 bg-sand/10 text-sand'
                        : 'border-white/10 bg-white/[0.02] text-cream/45 hover:border-white/20 hover:text-cream/75'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Tipo de prenda">
              <input
                value={form.subtype}
                onChange={(event) => update({ subtype: event.target.value })}
                placeholder="Camisa, blazer, jeans…"
                className="field"
              />
            </Field>

            <Field label="Estilo">
              <select value={form.style} onChange={(event) => update({ style: event.target.value })} className="field">
                {STYLES.map((style) => (
                  <option key={style}>{style}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-2xl border border-white/10 bg-ink-950/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Color de la prenda</p>
                <p className="mt-1 text-[10px] text-cream/35">El color cercano al rostro pesa más en el match.</p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-[10px] font-bold"
                style={{ backgroundColor: form.colorHex, color: readableText(form.colorHex) }}
              >
                {form.colorHex.replace('#', '')}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Nombre del color">
                <input
                  value={form.colorName}
                  onChange={(event) => update({ colorName: event.target.value })}
                  placeholder="Camel, oliva, marfil…"
                  className="field"
                />
              </Field>
              <Field label="Hex">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.colorHex}
                    onChange={(event) => update({ colorHex: event.target.value.toUpperCase() })}
                    className="h-10 w-11 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                    aria-label="Selector de color"
                  />
                  <input
                    value={form.colorHex}
                    onChange={(event) => {
                      const value = event.target.value.toUpperCase();
                      update({ colorHex: value, colorName: /^#[0-9A-F]{6}$/.test(value) ? detectColorName(value) : form.colorName });
                    }}
                    className="field w-24 font-mono text-[11px]"
                    maxLength={7}
                  />
                </div>
              </Field>
            </div>

            <div className="mt-3">
              <span className="field-label">Tu paleta</span>
              <div className="flex flex-wrap gap-2">
                {palette.colors.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => update({ colorHex: color.hex, colorName: color.name })}
                    title={`${color.name} · ${color.hex}`}
                    className={`h-7 w-7 rounded-full border transition hover:scale-110 ${
                      form.colorHex.toUpperCase() === color.hex.toUpperCase() ? 'border-cream ring-2 ring-sand/30' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Formalidad · ${form.formality}/10`} hint="1 es ropa de casa; 10 es etiqueta." className="sm:col-span-2">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={form.formality}
                onChange={(event) => update({ formality: Number(event.target.value) })}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-[9px] text-cream/25">
                <span>Casual</span>
                <span>Smart</span>
                <span>Etiqueta</span>
              </div>
            </Field>

            <Field label="Temporada">
              <select value={form.season} onChange={(event) => update({ season: event.target.value })} className="field">
                {SEASONS.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Abrigo">
              <select
                value={form.warmth}
                onChange={(event) => update({ warmth: Number(event.target.value) })}
                className="field"
              >
                {WARMTH.map((warmth) => (
                  <option key={warmth.value} value={warmth.value}>
                    {warmth.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Material">
              <input
                value={form.material}
                onChange={(event) => update({ material: event.target.value })}
                placeholder="Lino, lana, cuero…"
                className="field"
              />
            </Field>

            <Field label="Frecuencia de uso">
              <select
                value={form.frequency}
                onChange={(event) => update({ frequency: event.target.value })}
                className="field"
              >
                {FREQUENCIES.map((frequency) => (
                  <option key={frequency.id} value={frequency.id}>
                    {frequency.label}
                  </option>
                ))}
              </select>
            </Field>

            {form.category === 'tops' && (
              <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.layer)}
                  onChange={(event) => update({ layer: event.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-ink-950 accent-sand"
                />
                <span className="flex items-center gap-2 text-[11px] text-cream/65">
                  <Layers className="h-3.5 w-3.5 text-sand/70" />
                  Es una capa exterior (blazer, abrigo, chaqueta)
                </span>
              </label>
            )}

            <Field label="Notas" className="sm:col-span-2">
              <textarea
                value={form.notes}
                onChange={(event) => update({ notes: event.target.value })}
                rows={2}
                placeholder="Corte, caída, si combina con todo…"
                className="field resize-none"
              />
            </Field>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-sand/15 bg-sand/[0.04] px-3 py-2.5">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sand/70" />
            <p className="text-[10px] leading-relaxed text-cream/40">
              Cuanto más precisa sea la etiqueta, mejor será el plan de viaje y la sugerencia de compra. El material y la
              temporada son los datos que más cambian el resultado.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
