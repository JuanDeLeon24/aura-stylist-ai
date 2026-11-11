import { useMemo, useRef, useState } from 'react';
import {
  Plus,
  Upload,
  Search,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  Layers,
  ScanLine,
  ArrowUpRight,
  Palette,
  SlidersHorizontal,
} from 'lucide-react';
import { CATEGORIES } from '../lib/data';
import { colorMatch, colorName, getPalette } from '../lib/colors';
import {
  extractDominantColor,
  inferCategory,
  inferSubtype,
  isImageFile,
  prettyFilename,
  readImageFile,
  uid,
} from '../lib/storage';
import { EmptyState, GarmentImage, MatchPill, ScoreRing } from './ui';

const FORMALITY_BY_SUBTYPE = {
  Camiseta: 3,
  Camisa: 6,
  Blazer: 8,
  Abrigo: 7,
  Suéter: 5,
  Pantalón: 6,
  Jeans: 4,
  Chino: 6,
  Sneakers: 4,
  Loafers: 7,
  Botines: 7,
  Sandalias: 3,
  'Gafas de sol': 4,
  Reloj: 7,
  Bolso: 5,
  Sombrero: 5,
  Prenda: 5,
};

const STYLE_BY_FORMALITY = (value) => (value >= 7 ? 'Formal' : value >= 5 ? 'Smart casual' : 'Casual');

function metadataFromName(filename, image, colorHex, colorLabel) {
  const category = inferCategory(filename);
  const subtype = inferSubtype(filename);
  const formality = FORMALITY_BY_SUBTYPE[subtype] || 5;
  const isWinter = ['Abrigo', 'Suéter', 'Botines'].includes(subtype);
  const isSummer = ['Sandalias', 'Sombrero'].includes(subtype);
  const layer = ['Blazer', 'Abrigo'].includes(subtype);
  const baseName = prettyFilename(filename.split('/').pop() || '');
  const generic = /^(img|dsc|photo|image|whatsapp|screenshot)/i.test(baseName) || baseName.length < 4;
  return {
    id: uid('item'),
    name: generic ? `${subtype} ${colorLabel.toLowerCase()}` : baseName,
    category,
    subtype,
    colorName: colorLabel,
    colorHex,
    style: STYLE_BY_FORMALITY(formality),
    formality,
    season: isWinter ? 'invierno' : isSummer ? 'verano' : 'todo',
    material: 'Por definir',
    warmth: isWinter ? 3 : formality >= 6 ? 2 : 1,
    layer,
    frequency: 'ocasional',
    image,
    notes: 'Añadida por lote. Ajusta material, temporada y formalidad para mejorar las recomendaciones.',
  };
}

export default function ClosetTab({ inventory, profile, onAdd, onEdit, onDelete, onAddBatch, onEvaluate, notify }) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [processing, setProcessing] = useState(null);
  const batchInput = useRef(null);

  const palette = getPalette(profile.undertone);
  const avgMatch = inventory.length
    ? Math.round(inventory.reduce((sum, item) => sum + colorMatch(item.colorHex, profile.undertone), 0) / inventory.length)
    : 0;
  const formalCount = inventory.filter((item) => item.formality >= 7).length;

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    let items = inventory.filter((item) => {
      const matchesCategory = category === 'all' || item.category === category;
      const matchesSearch =
        !value ||
        [item.name, item.colorName, item.style, item.material, item.subtype]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(value));
      return matchesCategory && matchesSearch;
    });
    items = [...items];
    if (sort === 'formality') items.sort((a, b) => b.formality - a.formality);
    else if (sort === 'match') {
      items.sort(
        (a, b) =>
          colorMatch(b.colorHex, profile.undertone) - colorMatch(a.colorHex, profile.undertone),
      );
    } else if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [inventory, category, search, sort, profile.undertone]);

  const handleBatch = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setProcessing({ done: 0, total: 0, phase: 'Leyendo archivos' });
    try {
      const collected = [];
      for (const file of files) {
        if (/\.zip$/i.test(file.name)) {
          const { default: JSZip } = await import('jszip');
          const zip = await JSZip.loadAsync(file);
          const entries = Object.values(zip.files)
            .filter((entry) => !entry.dir && isImageFile(entry.name))
            .slice(0, 20);
          for (const entry of entries) {
            const extension = entry.name.split('.').pop()?.toLowerCase();
            const type =
              extension === 'png'
                ? 'image/png'
                : extension === 'webp'
                  ? 'image/webp'
                  : extension === 'gif'
                    ? 'image/gif'
                    : 'image/jpeg';
            const blob = await entry.async('blob');
            const imageFile = new File([blob], entry.name.split('/').pop() || 'prenda.jpg', { type });
            collected.push({ file: imageFile, originalName: entry.name });
          }
        } else if (file.type?.startsWith('image/')) {
          collected.push({ file, originalName: file.name });
        }
      }

      const limited = collected.slice(0, 20);
      if (!limited.length) {
        notify('No encontramos imágenes en el lote. Revisa el ZIP o usa JPG, PNG o WEBP.', 'error');
        setProcessing(null);
        return;
      }
      setProcessing({ done: 0, total: limited.length, phase: 'Analizando color y categoría' });
      const items = [];
      for (let index = 0; index < limited.length; index += 1) {
        const { file, originalName } = limited[index];
        try {
          const image = await readImageFile(file, 820, 0.8);
          const colorHex = await extractDominantColor(image);
          const label = colorName(colorHex);
          items.push(metadataFromName(originalName, image, colorHex, label));
        } catch (error) {
          console.warn('No se pudo procesar', originalName, error);
        }
        setProcessing({ done: index + 1, total: limited.length, phase: 'Analizando color y categoría' });
      }
      if (items.length) {
        onAddBatch(items);
        notify(
          `${items.length} ${items.length === 1 ? 'prenda añadida' : 'prendas añadidas'}. Revisa sus etiquetas para afinar el match.`,
        );
      } else {
        notify('No se pudo procesar ninguna imagen del lote.', 'error');
      }
      if (collected.length > 20) {
        notify('Procesamos las primeras 20 imágenes para cuidar el almacenamiento local.', 'info');
      }
    } catch (error) {
      console.error(error);
      notify('No se pudo leer el lote. Verifica que el ZIP no esté dañado.', 'error');
    } finally {
      setProcessing(null);
      if (batchInput.current) batchInput.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-850 via-ink-900 to-ink-950 p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-sand/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-olive/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
          <div>
            <p className="eyebrow">Inventario vivo · {inventory.length} prendas</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl leading-[0.98] text-cream sm:text-5xl">
              Un clóset que se piensa <span className="italic text-sand">solo</span>.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-cream/50">
              Sube tus prendas y AURA extrae color, categoría, formalidad y temporada. Después cruza esos datos con tu
              colorimetría para armar looks que sí tienen sentido.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={onAdd} className="btn btn-primary">
                <Plus className="h-4 w-4" />
                Añadir prenda
              </button>
              <button
                type="button"
                onClick={() => batchInput.current?.click()}
                disabled={Boolean(processing)}
                className="btn btn-secondary"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {processing
                  ? `${processing.phase} ${processing.done}/${processing.total || '…'}`
                  : 'Cargar lote · ZIP o fotos'}
              </button>
              <button type="button" onClick={onEvaluate} className="btn btn-ghost">
                <ScanLine className="h-4 w-4" />
                Evaluar un look
              </button>
            </div>
            <p className="mt-3 text-[10px] text-cream/30">
              Hasta 20 imágenes por lote. Nombra tus archivos <span className="text-cream/50">top-camisa-lino.jpg</span>,{' '}
              <span className="text-cream/50">bottom-jeans.jpg</span> para autocompletar mejor las etiquetas.
            </p>
            <input
              ref={batchInput}
              type="file"
              accept="image/*,.zip,application/zip"
              multiple
              className="hidden"
              onChange={(event) => handleBatch(event.target.files)}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-ink-950/50 p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">ADN de color</p>
                <p className="mt-1.5 font-display text-2xl text-cream">{palette.name}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-cream/40">{palette.tagline}</p>
              </div>
              <ScoreRing value={avgMatch} size={62} sublabel="match" />
            </div>
            <div className="mt-4 flex gap-1.5">
              {palette.colors.slice(0, 6).map((color) => (
                <div key={color.hex} className="group relative flex-1">
                  <div
                    className="h-8 rounded-md border border-white/15 transition group-hover:scale-y-110"
                    style={{ backgroundColor: color.hex }}
                    title={`${color.name} · ${color.hex}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
              <span className="text-[10px] text-cream/40">Promedio de afinidad del clóset</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-sand">
                <Palette className="h-3 w-3" />
                {avgMatch >= 82 ? 'Muy alineado' : avgMatch >= 70 ? 'Buen camino' : 'Por afinar'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Prendas totales', value: inventory.length, hint: 'en tu clóset digital' },
          { label: 'Nivel formal', value: formalCount, hint: 'piezas 7/10 o más' },
          { label: 'Categorías', value: new Set(inventory.map((item) => item.category)).size, hint: 'de 4 posibles' },
          { label: 'Match promedio', value: `${avgMatch}%`, hint: palette.name },
        ].map((stat) => (
          <div key={stat.label} className="surface rounded-2xl px-4 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cream/35">{stat.label}</p>
            <p className="mt-1.5 font-display text-3xl leading-none text-cream">{stat.value}</p>
            <p className="mt-1 text-[10px] text-cream/30">{stat.hint}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition ${
              category === 'all'
                ? 'border-cream bg-cream text-ink-950'
                : 'border-white/10 bg-white/[0.03] text-cream/50 hover:border-white/20 hover:text-cream/80'
            }`}
          >
            Todas · {inventory.length}
          </button>
          {CATEGORIES.map((entry) => {
            const count = inventory.filter((item) => item.category === entry.id).length;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setCategory(entry.id)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition ${
                  category === entry.id
                    ? 'border-cream bg-cream text-ink-950'
                    : 'border-white/10 bg-white/[0.03] text-cream/50 hover:border-white/20 hover:text-cream/80'
                }`}
              >
                {entry.label} · {count}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cream/30" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar prenda, color..."
              className="field py-2 pl-9 text-[11px]"
              aria-label="Buscar prendas"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cream/30" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="field w-auto py-2 pl-9 pr-8 text-[11px]"
              aria-label="Ordenar prendas"
            >
              <option value="recent">Recientes</option>
              <option value="match">Mejor match</option>
              <option value="formality">Más formal</option>
              <option value="name">A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item, index) => {
            const match = colorMatch(item.colorHex, profile.undertone);
            return (
              <article
                key={item.id}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-ink-900 transition duration-300 hover:-translate-y-0.5 hover:border-sand/30 hover:shadow-[0_24px_50px_-30px_rgba(0,0,0,0.9)] animate-fade-up"
                style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
                onClick={() => onEdit(item)}
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <GarmentImage
                    item={item}
                    className="h-full w-full"
                    imgClassName="transition duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/5 to-transparent opacity-80" />
                  <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-white/15 bg-ink-950/65 px-2 py-0.5 text-[9px] font-semibold text-cream/75 backdrop-blur-md">
                      {CATEGORIES.find((entry) => entry.id === item.category)?.short}
                    </span>
                    {item.layer && (
                      <span className="flex items-center gap-1 rounded-full border border-sand/20 bg-ink-950/65 px-2 py-0.5 text-[9px] font-semibold text-sand/90 backdrop-blur-md">
                        <Layers className="h-2.5 w-2.5" />
                        Capa
                      </span>
                    )}
                  </div>
                  <div className="absolute right-2.5 top-2.5">
                    <MatchPill score={match} undertone={profile.undertone} className="bg-ink-950/70 backdrop-blur-md" />
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 flex gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(item);
                      }}
                      className="rounded-lg border border-white/15 bg-ink-950/75 p-1.5 text-cream/70 backdrop-blur-md transition hover:bg-ink-800 hover:text-cream"
                      aria-label={`Editar ${item.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(item);
                      }}
                      className="rounded-lg border border-white/15 bg-ink-950/75 p-1.5 text-cream/60 backdrop-blur-md transition hover:border-red-500/40 hover:bg-red-950/70 hover:text-red-200"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="relative -mt-8 space-y-2 p-3">
                  <div>
                    <h3 className="line-clamp-1 text-[12px] font-semibold text-cream">{item.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-cream/40">
                      <span
                        className="inline-block h-2 w-2 rounded-full border border-white/20"
                        style={{ backgroundColor: item.colorHex }}
                      />
                      {item.colorName}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-white/8 pt-2">
                    <span className="text-[9px] uppercase tracking-[0.1em] text-cream/30">{item.style}</span>
                    <span className="text-[9px] font-semibold text-cream/55">{item.formality}/10</span>
                  </div>
                  <div className="h-0.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sand-deep to-sand"
                      style={{ width: `${item.formality * 10}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title={inventory.length ? 'Nada por aquí' : 'Tu clóset empieza aquí'}
          description={
            inventory.length
              ? 'Prueba con otra categoría, otro color o borra la búsqueda.'
              : 'Añade tu primera prenda o sube un lote de fotos. AURA se encarga de etiquetar color, categoría y formalidad.'
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={onAdd} className="btn btn-primary">
                <Plus className="h-4 w-4" /> Añadir prenda
              </button>
              <button type="button" onClick={() => batchInput.current?.click()} className="btn btn-secondary">
                <Upload className="h-4 w-4" /> Subir lote
              </button>
            </div>
          }
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
        <p className="flex items-center gap-2 text-[10px] leading-relaxed text-cream/35">
          <Sparkles className="h-3.5 w-3.5 text-sand/60" />
          Consejo: completa material y temporada de cada prenda. El agente usa esos datos para elegir mejor la maleta.
        </p>
        <button type="button" onClick={onEvaluate} className="text-[10px] font-semibold text-sand hover:text-sand-soft">
          <span className="inline-flex items-center gap-1">
            Evaluar combinación <ArrowUpRight className="h-3 w-3" />
          </span>
        </button>
      </div>
    </div>
  );
}
