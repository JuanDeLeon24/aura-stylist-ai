import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  MapPin,
  CalendarDays,
  Sun,
  CloudSun,
  CloudRain,
  Snowflake,
  Cloud,
  Loader2,
  ArrowRight,
  Copy,
  Download,
  Check,
  Wand2,
  Luggage,
  Shirt,
  ShoppingBag,
  ExternalLink,
  CheckCircle2,
  Circle,
  AlertCircle,
  Wind,
  Droplets,
  ThermometerSun,
  Route,
  BadgeCheck,
  ChevronDown,
} from 'lucide-react';
import { CLIMATE_OPTIONS, EVENT_TYPES, QUICK_PROMPTS } from '../lib/data';
import {
  buildTryOnPrompt,
  defaultStartDate,
  formatDate,
  formatDateRange,
  parseTripPrompt,
  planToMarkdown,
} from '../lib/recommendation';
import { downloadFile } from '../lib/storage';
import { EmptyState, GarmentImage, MatchPill, Modal, ScoreRing } from './ui';

const LOADING_STEPS = [
  'Consultando el clima del destino',
  'Leyendo la formalidad de cada escenario',
  'Optimizando la cápsula de viaje',
  'Validando colorimetría y proporciones',
  'Armando la maleta y el missing piece',
];

function weatherIcon(weather) {
  if (weather?.rainy) return CloudRain;
  if (weather?.climate === 'frio') return Snowflake;
  if (weather?.climate === 'calor') return Sun;
  return CloudSun;
}

function coverageStyle(level) {
  if (level === 'completa') return 'border-moss/25 bg-moss/10 text-moss';
  if (level === 'parcial') return 'border-sand/25 bg-sand/10 text-sand';
  return 'border-clay/25 bg-clay/10 text-clay';
}

export default function AgentTab({ profile, inventory, plan, onGenerate, notify, onGoCloset }) {
  const [form, setForm] = useState(() => ({
    destination: plan?.trip?.destination || 'Cartagena, Colombia',
    startDate: plan?.trip?.startDate || defaultStartDate(),
    days: plan?.trip?.days || 4,
    nights: plan?.trip?.nights ?? 3,
    eventType: plan?.trip?.eventType || 'vacaciones',
    climate: plan?.trip?.climate || 'auto',
    notes: plan?.trip?.notes || '',
  }));
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [resultTab, setResultTab] = useState('itinerary');
  const [promptOutfit, setPromptOutfit] = useState(null);
  const [copiedPlan, setCopiedPlan] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [checked, setChecked] = useState(new Set());

  useEffect(() => {
    if (!plan) return;
    setForm((current) => ({
      ...current,
      destination: plan.trip.destination,
      startDate: plan.trip.startDate,
      days: plan.trip.days,
      nights: plan.trip.nights,
      eventType: plan.trip.eventType,
      climate: plan.trip.climate,
      notes: plan.trip.notes || '',
    }));
  }, [plan?.id]);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setLoadingStep((step) => Math.min(LOADING_STEPS.length - 1, step + 1));
    }, 850);
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    setChecked(new Set());
    setResultTab('itinerary');
  }, [plan?.id]);

  const selectedEvent = EVENT_TYPES.find((event) => event.id === form.eventType) || EVENT_TYPES[0];
  const WeatherIcon = weatherIcon(plan?.weather);
  const totalChecks = useMemo(() => {
    if (!plan) return 0;
    const items = Object.values(plan.packing.groups).reduce((sum, group) => sum + group.length, 0);
    const essentials = plan.packing.essentials.reduce((sum, group) => sum + group.items.length, 0);
    return items + essentials;
  }, [plan]);
  const progress = totalChecks ? Math.round((checked.size / totalChecks) * 100) : 0;

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  const interpretPrompt = () => {
    const parsed = parseTripPrompt(prompt);
    if (!Object.keys(parsed).length) {
      notify('No pude interpretar el texto. Prueba: “Voy a Madrid por 5 días, negocios y cenas”.', 'info');
      return;
    }
    update({
      ...parsed,
      nights: parsed.nights ?? Math.max(0, (parsed.days || form.days) - 1),
      destination: parsed.destination || form.destination,
    });
    if (parsed.days && !parsed.nights) update({ nights: Math.max(0, parsed.days - 1) });
    notify('Itinerario interpretado. Revisa los datos y genera el plan.', 'success');
  };

  const handleGenerate = async () => {
    if (!form.destination.trim()) {
      notify('Escribe un destino para calcular clima y outfits.', 'error');
      return;
    }
    if (!form.startDate) {
      notify('Elige una fecha de inicio.', 'error');
      return;
    }
    setLoading(true);
    try {
      await onGenerate({
        ...form,
        destination: form.destination.trim(),
        days: Number(form.days),
        nights: Math.min(Number(form.nights), Number(form.days)),
      });
      setResultTab('itinerary');
    } catch (error) {
      notify(error.message || 'No se pudo generar el plan. Intenta de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const markdown = useMemo(() => (plan ? planToMarkdown(plan, profile) : ''), [plan, profile]);

  const copyPlan = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedPlan(true);
      notify('Plan copiado como Markdown.', 'success');
      setTimeout(() => setCopiedPlan(false), 1800);
    } catch {
      notify('No se pudo copiar el plan.', 'error');
    }
  };

  const downloadPlan = () => {
    if (!markdown) return;
    const slug = plan.trip.destination.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    downloadFile(`aura-${slug || 'viaje'}.md`, markdown, 'text/markdown');
    notify('Plan descargado en Markdown.', 'success');
  };

  const copyTryOn = async () => {
    if (!promptOutfit) return;
    try {
      await navigator.clipboard.writeText(promptOutfit.prompt);
      setCopiedPrompt(true);
      notify('Prompt de Virtual Try-On copiado.', 'success');
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      notify('No se pudo copiar el prompt.', 'error');
    }
  };

  const toggleCheck = (id) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allIds = useMemo(() => {
    if (!plan) return [];
    const ids = [];
    Object.values(plan.packing.groups).forEach((group) => {
      group.forEach(({ item }) => ids.push(`item-${item.id}`));
    });
    plan.packing.essentials.forEach((group) => {
      group.items.forEach((item, index) => ids.push(`ess-${group.group}-${index}`));
    });
    return ids;
  }, [plan]);

  const toggleAll = () => {
    setChecked((current) => (current.size === allIds.length ? new Set() : new Set(allIds)));
  };

  const openPrompt = (outfit) => {
    setPromptOutfit({
      outfit,
      prompt: buildTryOnPrompt(profile, outfit, {
        destination: plan?.trip?.destination,
        moment: outfit.label,
      }),
    });
    setCopiedPrompt(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
      <aside className="self-start lg:sticky lg:top-24">
        <section className="surface overflow-hidden rounded-3xl">
          <div className="relative border-b border-white/8 px-5 py-5">
            <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-sand/10 blur-3xl" />
            <div className="flex items-center justify-between">
              <span className="chip border-sand/20 bg-sand/10 text-sand">
                <Sparkles className="h-3 w-3" /> Agente de viaje
              </span>
              <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-moss/80">
                <span className="h-1.5 w-1.5 rounded-full bg-moss" /> Online
              </span>
            </div>
            <h2 className="mt-3 font-display text-3xl leading-none text-cream">Dime a dónde vas.</h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-cream/40">
              Yo reviso el clima, tu clóset y tu paleta. Tú solo haces la maleta.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="field-label mb-0">Describe tu plan</span>
                <button
                  type="button"
                  onClick={interpretPrompt}
                  disabled={!prompt.trim()}
                  className="text-[9px] font-semibold text-sand/80 transition hover:text-sand disabled:opacity-30"
                >
                  Interpretar con IA
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                placeholder="Ej: Voy a Ciudad de México por 3 días, summit de trabajo y cena de networking."
                className="field mt-1.5 resize-none text-[11px] leading-relaxed"
              />
              <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
                {QUICK_PROMPTS.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setPrompt(quick)}
                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[9px] text-cream/40 transition hover:border-sand/30 hover:text-sand"
                  >
                    {quick.split(' ').slice(0, 3).join(' ')}…
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-white/8" />

            <div className="space-y-3">
              <label className="block">
                <span className="field-label">Destino</span>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sand/60" />
                  <input
                    value={form.destination}
                    onChange={(event) => update({ destination: event.target.value })}
                    placeholder="Ciudad, país"
                    className="field pl-9"
                  />
                </div>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="col-span-3 block sm:col-span-1">
                  <span className="field-label">Inicio</span>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sand/60" />
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(event) => update({ startDate: event.target.value })}
                      className="field pl-8 text-[11px]"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="field-label">Días</span>
                  <input
                    type="number"
                    min="1"
                    max="21"
                    value={form.days}
                    onChange={(event) => {
                      const days = Math.max(1, Math.min(21, Number(event.target.value) || 1));
                      update({ days, nights: Math.max(0, days - 1) });
                    }}
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Noches</span>
                  <input
                    type="number"
                    min="0"
                    max={form.days}
                    value={form.nights}
                    onChange={(event) => update({ nights: Math.max(0, Math.min(Number(form.days), Number(event.target.value) || 0)) })}
                    className="field"
                  />
                </label>
              </div>

              <label className="block">
                <span className="field-label">Motivo del viaje</span>
                <select
                  value={form.eventType}
                  onChange={(event) => update({ eventType: event.target.value })}
                  className="field"
                >
                  {EVENT_TYPES.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[9px] leading-relaxed text-cream/30">{selectedEvent.description}</span>
              </label>

              <label className="block">
                <span className="field-label">Clima</span>
                <select
                  value={form.climate}
                  onChange={(event) => update({ climate: event.target.value })}
                  className="field"
                >
                  {CLIMATE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[9px] leading-relaxed text-cream/30">
                  “Automático” consulta el pronóstico real de Open-Meteo. Si la fecha está lejos, usamos una referencia.
                </span>
              </label>

              <label className="block">
                <span className="field-label">Notas para el agente (opcional)</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => update({ notes: event.target.value })}
                  rows={2}
                  placeholder="Cena en la playa, mucha caminata, no quiero tacones…"
                  className="field resize-none text-[11px]"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="btn btn-sand w-full py-3 text-[12px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {loading ? 'Analizando tu clóset…' : 'Generar outfits y maleta'}
            </button>
            <p className="text-center text-[9px] text-cream/25">
              {inventory.length} prendas disponibles · {profile.name || 'tu perfil'} · {profile.height} cm
            </p>
          </div>
        </section>

        {inventory.length === 0 && (
          <button
            type="button"
            onClick={onGoCloset}
            className="mt-3 flex w-full items-center justify-between rounded-2xl border border-clay/20 bg-clay/[0.06] px-4 py-3 text-left transition hover:bg-clay/10"
          >
            <span>
              <span className="block text-[11px] font-semibold text-clay">Tu clóset está vacío</span>
              <span className="mt-0.5 block text-[9px] text-cream/35">Añade prendas para generar un plan real.</span>
            </span>
            <ArrowRight className="h-4 w-4 text-clay" />
          </button>
        )}
      </aside>

      <div className="min-w-0 space-y-4">
        {loading && (
          <section className="surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sand/15 blur-3xl" />
            <div className="relative">
              <span className="eyebrow">AURA está trabajando</span>
              <h2 className="mt-3 font-display text-4xl leading-none text-cream">
                Tu viaje está tomando <span className="italic text-sand">forma</span>.
              </h2>
              <p className="mt-2 text-xs text-cream/40">
                Cruzando clima, formalidad, colorimetría y capacidad de la maleta.
              </p>
              <div className="mt-7 space-y-2.5">
                {LOADING_STEPS.map((step, index) => (
                  <div
                    key={step}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                      index <= loadingStep
                        ? 'border-sand/20 bg-sand/[0.05] text-cream/80'
                        : 'border-white/8 bg-white/[0.015] text-cream/25'
                    }`}
                  >
                    {index < loadingStep ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-moss" />
                    ) : index === loadingStep ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sand" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0" />
                    )}
                    <span className="text-[11px] font-medium">{step}</span>
                    {index < loadingStep && <span className="ml-auto text-[9px] text-moss/70">listo</span>}
                  </div>
                ))}
              </div>
              <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sand-deep to-sand transition-all duration-700"
                  style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          </section>
        )}

        {!loading && !plan && (
          <section className="surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-sand/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-10 h-60 w-60 rounded-full bg-olive/10 blur-3xl" />
            <div className="relative">
              <span className="eyebrow">Tu próximo viaje</span>
              <h2 className="mt-3 max-w-xl font-display text-4xl leading-[0.98] text-cream sm:text-5xl">
                Una maleta pequeña. <span className="italic text-sand">Muchas</span> posibilidades.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-cream/45">
                Cuéntame el destino y el motivo. AURA arma un plan día por día, optimiza una cápsula para no cargar de
                más y detecta la pieza que te falta antes de salir.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Route, title: 'Plan día / noche', text: 'Outfits con nivel de formalidad y validación de color.' },
                  { icon: Luggage, title: 'Maleta cápsula', text: 'Piezas que rotan sin repetir de más.' },
                  { icon: ShoppingBag, title: 'Missing piece', text: 'Compras que combinan con 3+ prendas.' },
                ].map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5">
                      <div className="rounded-lg border border-white/10 bg-ink-950/50 p-2 text-sand/80 w-fit">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-3 text-[11px] font-semibold text-cream/80">{feature.title}</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-cream/35">{feature.text}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-[9px] text-cream/25">
                <span className="chip">
                  <Sun className="h-3 w-3 text-sand/60" /> Clima real
                </span>
                <span className="chip">
                  <Shirt className="h-3 w-3 text-sand/60" /> Tu clóset
                </span>
                <span className="chip">
                  <BadgeCheck className="h-3 w-3 text-sand/60" /> Colorimetría
                </span>
                <span className="chip">
                  <Luggage className="h-3 w-3 text-sand/60" /> Cero peso extra
                </span>
              </div>
            </div>
          </section>
        )}

        {!loading && plan && (
          <div className="space-y-4 animate-fade-up">
            <section className="surface relative overflow-hidden rounded-3xl">
              <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-sand/10 blur-3xl" />
              <div className="relative border-b border-white/8 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip border-sand/20 bg-sand/10 text-sand">
                        <Sparkles className="h-3 w-3" /> Plan generado
                      </span>
                      <span className={`chip ${coverageStyle(plan.coverage.level)}`}>{plan.coverage.label}</span>
                    </div>
                    <h2 className="mt-3 truncate font-display text-4xl leading-none text-cream sm:text-5xl">
                      {plan.trip.destination}
                    </h2>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-cream/40">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 text-sand/60" />
                        {formatDateRange(plan.trip.startDate, plan.trip.days)} · {plan.trip.days} días / {plan.trip.nights} noches
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3 text-sand/60" />
                        {plan.event.label}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={copyPlan} className="btn btn-secondary px-3 py-2 text-[10px]">
                      {copiedPlan ? <Check className="h-3.5 w-3.5 text-moss" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{copiedPlan ? 'Copiado' : 'Copiar plan'}</span>
                    </button>
                    <button type="button" onClick={downloadPlan} className="btn btn-secondary px-3 py-2 text-[10px]">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Descargar</span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: 'Outfits', value: plan.stats.outfits, icon: Shirt },
                    { label: 'Piezas', value: plan.stats.pieces, icon: Luggage },
                    { label: 'Match medio', value: `${plan.stats.avgScore}%`, icon: Sparkles },
                    { label: 'Formalidad', value: `${plan.stats.avgFormality}/10`, icon: BadgeCheck },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="rounded-xl border border-white/10 bg-ink-950/45 px-3 py-2.5">
                        <Icon className="h-3.5 w-3.5 text-sand/60" />
                        <p className="mt-1.5 font-display text-2xl leading-none text-cream">{stat.value}</p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-cream/30">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.015] px-5 py-3 sm:px-6">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5 text-[10px] text-cream/55">
                    <WeatherIcon className="h-4 w-4 text-sand" />
                    {plan.weather.summary}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-cream/40">
                    <ThermometerSun className="h-3.5 w-3.5 text-sand/60" />
                    {plan.weather.climate === 'calor' ? 'Cálido' : plan.weather.climate === 'frio' ? 'Frío' : 'Templado'}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-cream/40">
                    <Droplets className="h-3.5 w-3.5 text-sand/60" />
                    {plan.weather.maxRain}% lluvia
                  </span>
                  <span className="hidden items-center gap-1.5 text-[10px] text-cream/30 sm:flex">
                    <Wind className="h-3.5 w-3.5 text-sand/40" />
                    {plan.weather.source === 'forecast' ? 'Open-Meteo' : 'Referencia manual'}
                  </span>
                </div>
                <p className="text-[9px] leading-relaxed text-cream/25">{plan.weather.note}</p>
              </div>
            </section>

            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {[
                { id: 'itinerary', label: 'Itinerario', icon: Route, count: plan.outfits.length },
                { id: 'packing', label: 'Maleta', icon: Luggage, count: totalChecks },
                { id: 'shopping', label: 'Personal shopper', icon: ShoppingBag, count: plan.missing.items.length },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = resultTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setResultTab(tab.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-semibold transition ${
                      active
                        ? 'border-cream bg-cream text-ink-950'
                        : 'border-white/10 bg-white/[0.025] text-cream/45 hover:border-white/20 hover:text-cream/80'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] ${active ? 'bg-ink-950/10' : 'bg-white/5'}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {resultTab === 'itinerary' && (
              <div className="space-y-4">
                {Array.from(new Set(plan.outfits.map((outfit) => outfit.dayIndex))).map((dayIndex) => {
                  const dayOutfits = plan.outfits.filter((outfit) => outfit.dayIndex === dayIndex);
                  const dayDate = plan.slots.find((slot) => slot.dayIndex === dayIndex)?.date;
                  const dayWeather = plan.weather.days?.find((day) => day.date === dayDate);
                  return (
                    <section key={dayIndex} className="surface overflow-hidden rounded-2xl">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3 sm:px-5">
                        <div className="flex items-baseline gap-2.5">
                          <span className="font-display text-2xl text-cream">Día {dayIndex + 1}</span>
                          <span className="text-[10px] uppercase tracking-[0.12em] text-cream/30">
                            {formatDate(dayDate, { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                        </div>
                        {dayWeather && (
                          <span className="flex items-center gap-2 text-[9px] text-cream/35">
                            <span>{dayWeather.label}</span>
                            <span className="text-cream/60">
                              {dayWeather.max}° / {dayWeather.min}°
                            </span>
                            <span className="flex items-center gap-1">
                              <Droplets className="h-3 w-3" /> {dayWeather.rain}%
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="grid gap-3 p-3 sm:p-4 xl:grid-cols-2">
                        {dayOutfits.map((outfit) => {
                          const pieces = [outfit.top, outfit.layer, outfit.bottom, outfit.shoes, ...(outfit.accessories || [])].filter(Boolean);
                          return (
                            <article key={outfit.slotId} className="rounded-2xl border border-white/10 bg-ink-950/45 p-3.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-cream/50">
                                      {outfit.part === 'day' ? 'Día' : 'Noche'}
                                    </span>
                                    <span className="text-[10px] font-semibold text-cream/80">{outfit.label}</span>
                                  </div>
                                  <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-cream/40">{outfit.reason}</p>
                                </div>
                                <ScoreRing value={outfit.score} size={48} sublabel="match" />
                              </div>

                              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                                {pieces.map((item) => (
                                  <div key={item.id} className="w-[72px] shrink-0">
                                    <GarmentImage item={item} className="aspect-square rounded-xl border border-white/10" compact />
                                    <p className="mt-1 line-clamp-1 text-[8px] text-cream/45">{item.name}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-2.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold ${
                                      outfit.colorScore >= 82
                                        ? 'border-moss/20 bg-moss/10 text-moss'
                                        : outfit.colorScore >= 72
                                          ? 'border-sand/20 bg-sand/10 text-sand'
                                          : 'border-clay/20 bg-clay/10 text-clay'
                                    }`}
                                  >
                                    {outfit.validation}
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[8px] text-cream/40">
                                    Formalidad {outfit.formality}/10
                                  </span>
                                  <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[8px] text-cream/40 sm:inline">
                                    Objetivo {outfit.target}/10
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openPrompt(outfit)}
                                  className="flex items-center gap-1.5 rounded-full border border-sand/20 bg-sand/[0.06] px-2.5 py-1 text-[9px] font-semibold text-sand transition hover:bg-sand/10"
                                >
                                  <Wand2 className="h-3 w-3" />
                                  Try-on
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {resultTab === 'packing' && (
              <section className="surface overflow-hidden rounded-3xl">
                <div className="border-b border-white/8 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow">Packing checklist</p>
                      <h3 className="mt-1.5 font-display text-3xl text-cream">Maleta cápsula</h3>
                      <p className="mt-1.5 text-[10px] text-cream/35">
                        {plan.packing.totalPieces} prendas · {plan.packing.bag}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-3xl text-cream">{progress}%</p>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-cream/30">empacado</p>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sand-deep via-sand to-cream transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[9px] text-cream/30">
                      {checked.size} de {totalChecks} ítems marcados
                    </p>
                    <button type="button" onClick={toggleAll} className="text-[9px] font-semibold text-sand hover:text-sand-soft">
                      {checked.size === allIds.length ? 'Desmarcar todo' : 'Marcar todo'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                  {Object.entries(plan.packing.groups).map(([category, entries]) => (
                    <div key={category}>
                      <p className="field-label">
                        {{ tops: 'Superiores', bottoms: 'Inferiores', shoes: 'Calzado', accessories: 'Accesorios' }[category] ||
                          category}
                      </p>
                      <div className="space-y-1.5">
                        {entries.map(({ item, uses }) => {
                          const id = `item-${item.id}`;
                          const done = checked.has(id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleCheck(id)}
                              className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                                done
                                  ? 'border-moss/20 bg-moss/[0.05]'
                                  : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                              }`}
                            >
                              {done ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-moss" />
                              ) : (
                                <Circle className="h-4 w-4 shrink-0 text-cream/25" />
                              )}
                              <GarmentImage item={item} className="h-9 w-8 shrink-0 rounded-md" compact />
                              <span className="min-w-0 flex-1">
                                <span className={`block truncate text-[10px] font-medium ${done ? 'text-cream/45 line-through' : 'text-cream/75'}`}>
                                  {item.name}
                                </span>
                                <span className="mt-0.5 block text-[8px] text-cream/30">
                                  {uses} {uses === 1 ? 'uso' : 'usos'} · {item.colorName}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {plan.packing.essentials.map((group) => (
                    <div key={group.group}>
                      <p className="field-label">{group.group}</p>
                      <div className="space-y-1.5">
                        {group.items.map((item, index) => {
                          const id = `ess-${group.group}-${index}`;
                          const done = checked.has(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggleCheck(id)}
                              className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                                done ? 'border-moss/20 bg-moss/[0.05]' : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                              }`}
                            >
                              {done ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-moss" />
                              ) : (
                                <Circle className="h-4 w-4 shrink-0 text-cream/25" />
                              )}
                              <span className={`text-[10px] ${done ? 'text-cream/40 line-through' : 'text-cream/65'}`}>{item}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 bg-white/[0.015] px-5 py-3 sm:px-6">
                  <p className="flex items-center gap-1.5 text-[9px] text-cream/30">
                    <Luggage className="h-3.5 w-3.5 text-sand/50" />
                    Consejo: enrolla las prendas y deja los zapatos en bolsas de tela.
                  </p>
                  <button type="button" onClick={copyPlan} className="text-[9px] font-semibold text-sand hover:text-sand-soft">
                    Copiar checklist completo
                  </button>
                </div>
              </section>
            )}

            {resultTab === 'shopping' && (
              <section className="space-y-4">
                <div className="surface rounded-3xl p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow">Personal shopper</p>
                      <h3 className="mt-1.5 font-display text-3xl text-cream">La pieza que falta</h3>
                      <p className="mt-1.5 max-w-xl text-[10px] leading-relaxed text-cream/40">{plan.missing.message}</p>
                    </div>
                    <span
                      className={`chip ${
                        plan.missing.coverage ? 'border-moss/20 bg-moss/10 text-moss' : 'border-clay/20 bg-clay/10 text-clay'
                      }`}
                    >
                      {plan.missing.coverage ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {plan.missing.coverage ? 'Clóset cubierto' : `${plan.missing.gaps.length} gaps detectados`}
                    </span>
                  </div>

                  {plan.missing.gaps.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {plan.missing.gaps.map((gap) => (
                        <div key={gap.id} className="rounded-xl border border-clay/15 bg-clay/[0.04] p-3">
                          <p className="text-[10px] font-semibold text-clay/90">{gap.title}</p>
                          <p className="mt-1 text-[9px] leading-relaxed text-cream/35">{gap.detail}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {plan.missing.alternative && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-ink-950/45 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="field-label mb-1">Solución rápida con lo que ya tienes</p>
                          <p className="text-[10px] text-cream/55">{plan.missing.alternative.label}</p>
                          <p className="mt-0.5 line-clamp-1 text-[9px] text-cream/30">{plan.missing.alternative.reason}</p>
                        </div>
                        <ScoreRing value={plan.missing.alternative.score} size={46} sublabel="match" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {plan.missing.items.map((product) => (
                    <article key={product.id} className="surface flex flex-col overflow-hidden rounded-2xl">
                      <div className="relative aspect-[16/9]">
                        <GarmentImage
                          item={{ ...product, image: '' }}
                          className="h-full w-full"
                          imgClassName="opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent" />
                        <div className="absolute left-3 top-3 flex gap-1.5">
                          <span className="rounded-full border border-white/15 bg-ink-950/70 px-2 py-0.5 text-[8px] font-semibold text-cream/70 backdrop-blur-md">
                            {product.store}
                          </span>
                          {product.gap && (
                            <span className="rounded-full border border-clay/25 bg-ink-950/70 px-2 py-0.5 text-[8px] font-semibold text-clay/90 backdrop-blur-md">
                              Missing piece
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-[11px] font-semibold leading-tight text-cream">{product.name}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-[9px] text-cream/45">
                            <span className="h-2 w-2 rounded-full border border-white/20" style={{ backgroundColor: product.colorHex }} />
                            {product.colorName} · {product.budget}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-3.5">
                        <p className="text-[9px] leading-relaxed text-cream/40">{product.reason}</p>
                        <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
                          <p className="text-[8px] uppercase tracking-[0.12em] text-cream/30">Combina con</p>
                          <p className="mt-1 text-[9px] leading-relaxed text-cream/55">
                            {product.pairCount} prendas de tu clóset
                          </p>
                          {product.pairedWith.length > 0 && (
                            <p className="mt-0.5 line-clamp-2 text-[8px] leading-relaxed text-cream/30">
                              {product.pairedWith.join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                          <MatchPill score={product.match} undertone={profile.undertone} />
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[9px] font-semibold text-sand transition hover:text-sand-soft"
                          >
                            Ver tienda <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <p className="px-1 text-[8px] leading-relaxed text-cream/25">
                  Enlaces de búsqueda conceptuales, no afiliados. Los precios son rangos de referencia y pueden variar por
                  país. AURA prioriza piezas que combinen con al menos 3 prendas de tu clóset.
                </p>
              </section>
            )}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(promptOutfit)}
        onClose={() => setPromptOutfit(null)}
        title="Virtual Try-On Prompt"
        subtitle="Copia este prompt en tu generador de imágenes favorito."
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="hidden text-[9px] text-cream/30 sm:block">Incluye identidad, proporción, outfit y negativos.</span>
            <button type="button" onClick={copyTryOn} className="btn btn-primary w-full sm:w-auto">
              {copiedPrompt ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedPrompt ? 'Copiado' : 'Copiar prompt'}
            </button>
          </div>
        }
      >
        {promptOutfit && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-950/50 p-3">
              <ScoreRing value={promptOutfit.outfit.score} size={52} sublabel="match" />
              <div>
                <p className="text-[11px] font-semibold text-cream/80">{promptOutfit.outfit.label}</p>
                <p className="mt-0.5 text-[9px] text-cream/35">
                  {promptOutfit.outfit.reason} · Formalidad {promptOutfit.outfit.formality}/10
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-ink-950/60 p-4">
              <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-cream/65">
                {promptOutfit.prompt}
              </pre>
            </div>
            <p className="flex items-start gap-2 text-[9px] leading-relaxed text-cream/30">
              <Wand2 className="mt-0.5 h-3 w-3 shrink-0 text-sand/60" />
              Para mejores resultados, usa las fotos de tu gemelo digital como referencia y mantén el prompt de identidad
              intacto. AURA no genera imágenes: prepara la instrucción para tu motor favorito.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
