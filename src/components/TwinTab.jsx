import { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  X,
  ScanFace,
  Sparkles,
  Ruler,
  Palette,
  ShieldCheck,
  Copy,
  Check,
  UserRound,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  BODY_SHAPES,
  BODY_TYPES,
  EYE_COLORS,
  FACE_SHAPES,
  HAIR_COLORS,
  PHOTO_SLOTS,
  SKIN_TONE_LABELS,
  SKIN_TONES,
  UNDERTONES,
} from '../lib/data';
import { colorMatch, getContrast, getPalette, getSeasonName, matchLabel, readableText } from '../lib/colors';
import { readImageFile } from '../lib/storage';
import { buildProfilePrompt } from '../lib/prompt';
import { Field, GarmentImage, ScoreRing } from './ui';

export default function TwinTab({ profile, inventory, onUpdateProfile, notify }) {
  const [copied, setCopied] = useState(false);
  const inputs = useRef({});
  const palette = getPalette(profile.undertone);
  const season = getSeasonName(profile.undertone, profile.skinTone);
  const contrast = getContrast(profile.skinTone, profile.hairColor);
  const photoCount = Object.values(profile.photos || {}).filter(Boolean).length;

  const ranked = useMemo(
    () =>
      [...inventory]
        .map((item) => ({ item, match: colorMatch(item.colorHex, profile.undertone) }))
        .sort((a, b) => b.match - a.match)
        .slice(0, 3),
    [inventory, profile.undertone],
  );

  const update = (patch) => onUpdateProfile(patch);
  const updateSize = (key, value) => update({ sizes: { ...profile.sizes, [key]: value } });

  const handlePhoto = async (slot, file) => {
    if (!file) return;
    try {
      const data = await readImageFile(file, 1000, 0.82);
      update({ photos: { ...profile.photos, [slot]: data } });
      notify('Foto actualizada. Ya puede usarse en el Virtual Try-On.', 'success');
    } catch (error) {
      notify(error.message || 'No se pudo procesar la foto.', 'error');
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildProfilePrompt(profile));
      setCopied(true);
      notify('Prompt base copiado.', 'success');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('No se pudo copiar el prompt.', 'error');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
      <div className="space-y-6">
        <section className="surface overflow-hidden rounded-3xl">
          <div className="relative border-b border-white/8 px-5 py-5 sm:px-6">
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-sand/10 blur-3xl" />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Gemelo digital</p>
                <h1 className="mt-2 font-display text-4xl leading-none text-cream">
                  Tu cuerpo, tus <span className="italic text-sand">reglas</span>.
                </h1>
                <p className="mt-2 max-w-lg text-xs leading-relaxed text-cream/45">
                  Biometría y fotos de referencia para que cada prompt de Virtual Try-On respete tu identidad, tu
                  proporción y tu paleta.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-950/50 px-3.5 py-2.5">
                <ScoreRing value={(photoCount / 4) * 100} size={48} sublabel={`${photoCount}/4`} />
                <div>
                  <p className="text-[10px] font-semibold text-cream/70">Fotos cargadas</p>
                  <p className="text-[9px] text-cream/30">Para el try-on</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:p-6">
            {PHOTO_SLOTS.map((slot) => {
              const photo = profile.photos?.[slot.id];
              return (
                <div key={slot.id} className="group">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-ink-950/60">
                    {photo ? (
                      <>
                        <img src={photo} alt={`Foto ${slot.label}`} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                        <div className="absolute inset-x-2 bottom-2 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => inputs.current[slot.id]?.click()}
                            className="flex-1 rounded-lg border border-white/15 bg-ink-950/75 py-1.5 text-[9px] font-semibold text-cream backdrop-blur-md hover:bg-ink-800"
                          >
                            Cambiar
                          </button>
                          <button
                            type="button"
                            onClick={() => update({ photos: { ...profile.photos, [slot.id]: '' } })}
                            className="rounded-lg border border-white/15 bg-ink-950/75 p-1.5 text-cream/70 backdrop-blur-md hover:bg-red-950/70 hover:text-red-200"
                            aria-label={`Eliminar foto ${slot.label}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-ink-950/70 px-2 py-0.5 text-[9px] font-semibold text-cream/80 backdrop-blur-md">
                          {slot.label}
                        </span>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => inputs.current[slot.id]?.click()}
                        className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center transition hover:bg-white/[0.03]"
                      >
                        <div className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-sand/70">
                          {slot.id === 'face' ? <UserRound className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-cream/65">{slot.label}</p>
                          <p className="mt-0.5 text-[8px] text-cream/30">{slot.hint}</p>
                        </div>
                      </button>
                    )}
                    <input
                      ref={(element) => {
                        inputs.current[slot.id] = element;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handlePhoto(slot.id, event.target.files?.[0])}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 bg-white/[0.015] px-5 py-3 sm:px-6">
            <p className="flex items-center gap-2 text-[10px] text-cream/35">
              <ShieldCheck className="h-3.5 w-3.5 text-moss/70" />
              Tus fotos se quedan en este navegador. Nunca se suben a un servidor.
            </p>
            <button type="button" onClick={copyPrompt} className="btn btn-ghost !px-2 text-[10px]">
              {copied ? <Check className="h-3.5 w-3.5 text-moss" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar prompt base'}
            </button>
          </div>
        </section>

        <section className="surface rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Biometría</p>
              <h2 className="mt-1.5 font-display text-2xl text-cream">Tus proporciones</h2>
            </div>
            <span className="chip">
              <Ruler className="h-3 w-3 text-sand/70" /> {profile.height} cm
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input value={profile.name} onChange={(event) => update({ name: event.target.value })} className="field" />
            </Field>
            <Field label="Ciudad base">
              <input value={profile.city} onChange={(event) => update({ city: event.target.value })} className="field" />
            </Field>
            <Field label="Estatura (cm)">
              <input
                type="number"
                min="120"
                max="230"
                value={profile.height}
                onChange={(event) => update({ height: Number(event.target.value) })}
                className="field"
              />
            </Field>
            <Field label="Peso (kg)">
              <input
                type="number"
                min="35"
                max="220"
                value={profile.weight}
                onChange={(event) => update({ weight: Number(event.target.value) })}
                className="field"
              />
            </Field>
            <Field label="Complexión">
              <select
                value={profile.bodyType}
                onChange={(event) => update({ bodyType: event.target.value })}
                className="field"
              >
                {BODY_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field label="Forma corporal">
              <select
                value={profile.bodyShape}
                onChange={(event) => update({ bodyShape: event.target.value })}
                className="field"
              >
                {Object.keys(BODY_SHAPES).map((shape) => (
                  <option key={shape}>{shape}</option>
                ))}
              </select>
            </Field>
            <Field label="Forma de rostro">
              <select
                value={profile.faceShape}
                onChange={(event) => update({ faceShape: event.target.value })}
                className="field"
              >
                {FACE_SHAPES.map((shape) => (
                  <option key={shape}>{shape}</option>
                ))}
              </select>
            </Field>
            <Field label="Talla superior">
              <input value={profile.sizes.top} onChange={(event) => updateSize('top', event.target.value)} className="field" />
            </Field>
            <Field label="Talla inferior">
              <input
                value={profile.sizes.bottom}
                onChange={(event) => updateSize('bottom', event.target.value)}
                className="field"
              />
            </Field>
            <Field label="Calzado">
              <input value={profile.sizes.shoe} onChange={(event) => updateSize('shoe', event.target.value)} className="field" />
            </Field>
          </div>
        </section>

        <section className="surface rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Colorimetría estacional</p>
              <h2 className="mt-1.5 font-display text-2xl text-cream">El color antes que la marca</h2>
            </div>
            <Palette className="h-5 w-5 text-sand/60" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <span className="field-label">Tono de piel</span>
              <select
                value={profile.skinTone}
                onChange={(event) => update({ skinTone: event.target.value })}
                className="field"
              >
                {SKIN_TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {SKIN_TONE_LABELS[tone]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="field-label">Subtono</span>
              <div className="grid grid-cols-3 gap-1.5">
                {UNDERTONES.map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => update({ undertone: tone.id })}
                    className={`rounded-xl border px-2 py-2 text-center transition ${
                      profile.undertone === tone.id
                        ? 'border-sand/50 bg-sand/10 text-sand'
                        : 'border-white/10 bg-white/[0.02] text-cream/45 hover:border-white/20'
                    }`}
                  >
                    <span className="block text-[10px] font-semibold">{tone.label}</span>
                    <span className="mt-0.5 block text-[8px] opacity-60">{tone.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Color de ojos">
              <select value={profile.eyeColor} onChange={(event) => update({ eyeColor: event.target.value })} className="field">
                {EYE_COLORS.map((color) => (
                  <option key={color}>{color}</option>
                ))}
              </select>
            </Field>
            <Field label="Color de cabello">
              <select
                value={profile.hairColor}
                onChange={(event) => update({ hairColor: event.target.value })}
                className="field"
              >
                {HAIR_COLORS.map((color) => (
                  <option key={color}>{color}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="surface relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sand/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="chip border-sand/20 bg-sand/10 text-sand">
                <Sparkles className="h-3 w-3" /> Diagnóstico AURA
              </span>
              <span className="text-[9px] uppercase tracking-[0.14em] text-cream/30">Subtono {profile.undertone}</span>
            </div>
            <h2 className="mt-4 font-display text-4xl leading-none text-cream">{season}</h2>
            <p className="mt-1.5 text-[11px] font-medium text-sand/80">{palette.name}</p>
            <p className="mt-3 text-[11px] leading-relaxed text-cream/45">{palette.description}</p>

            <div className="mt-5">
              <p className="field-label">Power colors</p>
              <div className="grid grid-cols-4 gap-2">
                {palette.colors.map((color) => (
                  <div key={color.hex} className="group text-center">
                    <div
                      className="h-12 rounded-lg border border-white/15 shadow-inner transition group-hover:scale-[1.04]"
                      style={{ backgroundColor: color.hex }}
                      title={`${color.name} · ${color.hex}`}
                    />
                    <span className="mt-1 block truncate text-[8px] text-cream/40">{color.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-ink-950/40 p-3">
              <p className="field-label">Contraste {contrast.level}</p>
              <p className="text-[10px] leading-relaxed text-cream/45">{contrast.advice}</p>
            </div>

            <div className="mt-4">
              <p className="field-label">A evitar cerca del rostro</p>
              <div className="flex flex-wrap gap-2">
                {palette.avoid.map((color) => (
                  <div key={color.hex} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-2 py-1">
                    <span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
                    <span className="text-[9px] text-cream/40">{color.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-3">
              <span className="text-[9px] text-cream/30">Afinidad promedio del clóset</span>
              <span className="text-xs font-bold text-sand">
                {inventory.length
                  ? `${Math.round(
                      inventory.reduce((sum, item) => sum + colorMatch(item.colorHex, profile.undertone), 0) /
                        inventory.length,
                    )}%`
                  : '—'}
              </span>
            </div>
          </div>
        </section>

        <section className="surface rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Reglas de proporción</p>
              <h3 className="mt-1.5 font-display text-2xl text-cream">Tu silueta</h3>
            </div>
            <Layers className="h-4 w-4 text-sand/60" />
          </div>
          <div className="mt-4 rounded-xl border border-sand/15 bg-sand/[0.04] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sand/80">{profile.bodyShape}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-cream/50">
              {BODY_SHAPES[profile.bodyShape] || 'Equilibra volumen y línea según tu silueta.'}
            </p>
          </div>
          <ul className="mt-3 space-y-2 text-[10px] leading-relaxed text-cream/40">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sand/70" />
              {profile.height < 168
                ? 'Las líneas verticales, el monocolor y los largos precisos alargan la silueta.'
                : 'Puedes jugar con capas, proporciones y largos sin perder armonía.'}
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sand/70" />
              {profile.bodyType === 'Ectomorfo'
                ? 'Suma textura y volumen controlado en capas; evita prendas demasiado rígidas.'
                : profile.bodyType === 'Endomorfo'
                  ? 'Prioriza estructura suave, caída y líneas verticales; evita volumen extra en la cintura.'
                  : 'La estructura media te permite alternar piezas entalladas y holgadas con intención.'}
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sand/70" />
              Rostro {profile.faceShape.toLowerCase()}: elige escotes y gafas que repitan o contrasten la línea del rostro.
            </li>
          </ul>
        </section>

        <section className="surface rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">En tu clóset</p>
              <h3 className="mt-1.5 font-display text-2xl text-cream">Tus mejores aliados</h3>
            </div>
            <ArrowUpRight className="h-4 w-4 text-sand/60" />
          </div>
          {ranked.length ? (
            <div className="mt-4 space-y-2.5">
              {ranked.map(({ item, match }) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-2">
                  <GarmentImage item={item} className="h-11 w-9 shrink-0 rounded-lg" compact />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold text-cream/80">{item.name}</p>
                    <p className="mt-0.5 text-[9px] text-cream/35">{matchLabel(match)}</p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                    style={{
                      backgroundColor: `${item.colorHex}22`,
                      color: readableText(item.colorHex) === '#f8f4ec' ? '#e5d8c4' : '#161412',
                    }}
                  >
                    {match}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[10px] text-cream/35">Añade prendas para ver tus mejores aliados de color.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
