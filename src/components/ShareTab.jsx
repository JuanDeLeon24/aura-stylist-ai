import { useRef, useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Database,
  Sparkles,
  Link2,
  Lock,
  FileJson,
  Palette,
  Shirt,
  Luggage,
  Users,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';
import { getPalette } from '../lib/colors';
import { downloadJSON } from '../lib/storage';
import { Modal } from './ui';

export default function ShareTab({ profile, inventory, plan, onImport, onReset, notify }) {
  const [copied, setCopied] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const importInput = useRef(null);
  const palette = getPalette(profile.undertone);
  const appUrl = `${window.location.origin}${window.location.pathname}`;

  const shareText = `Mi perfil en AURA · Stylist AI\nPaleta: ${palette.name}\n${inventory.length} prendas digitalizadas\n${plan ? `Último viaje: ${plan.trip.destination}` : 'Listo para armar el próximo viaje'}\n${appUrl}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      notify('Enlace de AURA copiado.', 'success');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('No se pudo copiar el enlace.', 'error');
    }
  };

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedCard(true);
      notify('Resumen de estilo copiado.', 'success');
      setTimeout(() => setCopiedCard(false), 1800);
    } catch {
      notify('No se pudo copiar el resumen.', 'error');
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      copyLink();
      return;
    }
    try {
      await navigator.share({ title: 'AURA · Stylist AI', text: shareText, url: appUrl });
    } catch (error) {
      if (error?.name !== 'AbortError') notify('No se pudo abrir el menú de compartir.', 'error');
    }
  };

  const exportBackup = () => {
    downloadJSON(`aura-backup-${new Date().toISOString().slice(0, 10)}.json`, {
      app: 'aura-stylist-ai',
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      inventory,
      plan,
    });
    notify('Respaldo descargado. Guárdalo en un lugar seguro.', 'success');
  };

  const importBackup = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !data.profile || !Array.isArray(data.inventory)) {
        throw new Error('El archivo no tiene el formato de respaldo de AURA.');
      }
      onImport(data);
      notify('Respaldo importado. Tu clóset y perfil se actualizaron.', 'success');
    } catch (error) {
      notify(error.message || 'No se pudo importar el respaldo.', 'error');
    } finally {
      if (importInput.current) importInput.current.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sand/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-olive/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="chip border-sand/20 bg-sand/10 text-sand">
              <Users className="h-3 w-3" /> Compartir & respaldar
            </span>
            <h1 className="mt-4 font-display text-4xl leading-[0.98] text-cream sm:text-5xl">
              Tu estilo, <span className="italic text-sand">portátil</span>.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-cream/45">
              Comparte AURA con quien quieras o lleva tu clóset a otro dispositivo. Sin cuentas, sin nube y sin perder
              tus etiquetas.
            </p>

            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-950/50 p-1.5 pl-4">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-sand/60" />
              <span className="min-w-0 flex-1 truncate text-[11px] text-cream/40">{appUrl}</span>
              <button type="button" onClick={copyLink} className="btn btn-primary px-3 py-2 text-[10px]">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={nativeShare} className="btn btn-secondary text-[11px]">
                <Share2 className="h-3.5 w-3.5" />
                Compartir con el sistema
              </button>
              <button type="button" onClick={copyCard} className="btn btn-ghost text-[11px]">
                {copiedCard ? <Check className="h-3.5 w-3.5 text-moss" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCard ? 'Resumen copiado' : 'Copiar resumen de estilo'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-ink-950/55 p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Vista previa</p>
                <p className="mt-1.5 font-display text-3xl text-cream">{profile.name || 'Tu perfil'}</p>
                <p className="mt-0.5 text-[10px] text-cream/35">
                  {profile.city || 'Sin ciudad'} · {profile.height} cm
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sand/20 bg-gradient-to-br from-sand-soft/20 to-sand/5 font-display text-xl text-sand-soft">
                {profile.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-[0.12em] text-cream/30">Paleta</span>
                <span className="text-[10px] font-semibold text-sand">{palette.name}</span>
              </div>
              <div className="mt-2 flex gap-1">
                {palette.colors.map((color) => (
                  <span
                    key={color.hex}
                    className="h-5 flex-1 rounded-sm border border-white/10"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { icon: Shirt, value: inventory.length, label: 'prendas' },
                { icon: Palette, value: profile.undertone, label: 'subtono' },
                { icon: Luggage, value: plan ? plan.trip.days : '—', label: 'días de viaje' },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-white/8 bg-white/[0.02] px-2.5 py-2">
                    <Icon className="h-3 w-3 text-sand/50" />
                    <p className="mt-1 truncate text-[11px] font-semibold capitalize text-cream/75">{stat.value}</p>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-cream/25">{stat.label}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[8px] text-cream/25">
              <Sparkles className="h-3 w-3 text-sand/50" />
              Cada persona crea su propio clóset local al abrir el enlace.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="surface rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-sand">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-cream/80">Exportar respaldo</p>
              <p className="text-[9px] text-cream/30">JSON con perfil y clóset</p>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-cream/35">
            Incluye fotos, etiquetas, colorimetría y el último plan. Úsalo para migrar de navegador o guardar una copia.
          </p>
          <button type="button" onClick={exportBackup} className="btn btn-secondary mt-4 w-full text-[11px]">
            <FileJson className="h-3.5 w-3.5" /> Descargar .json
          </button>
        </section>

        <section className="surface rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-sand">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-cream/80">Importar respaldo</p>
              <p className="text-[9px] text-cream/30">Restaura tu clóset</p>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-cream/35">
            Carga un archivo exportado por AURA. Se reemplaza el contenido actual de este dispositivo.
          </p>
          <button type="button" onClick={() => importInput.current?.click()} className="btn btn-secondary mt-4 w-full text-[11px]">
            <Upload className="h-3.5 w-3.5" /> Elegir archivo
          </button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => importBackup(event.target.files?.[0])}
          />
        </section>

        <section className="surface rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-clay/20 bg-clay/[0.06] p-2 text-clay">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-cream/80">Reiniciar demo</p>
              <p className="text-[9px] text-cream/30">Volver al clóset inicial</p>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-cream/35">
            Borra tus datos locales y restaura las 18 prendas de demostración. Esta acción no se puede deshacer.
          </p>
          <button type="button" onClick={() => setResetOpen(true)} className="btn btn-secondary mt-4 w-full text-[11px] hover:border-clay/30 hover:text-clay">
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar demo
          </button>
        </section>
      </div>

      <section className="surface rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-moss" />
          <h2 className="font-display text-2xl text-cream">Privacidad sin letra pequeña</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Lock,
              title: 'Todo vive en tu navegador',
              text: 'Perfil, fotos, prendas y planes se guardan en localStorage. No hay cuentas ni servidor de AURA.',
            },
            {
              icon: Database,
              title: 'Una sola consulta externa',
              text: 'Solo el destino viaja a Open-Meteo para traer el pronóstico. No se envía tu clóset ni tus fotos.',
            },
            {
              icon: ShieldCheck,
              title: 'Tú tienes el control',
              text: 'Puedes exportar, importar o borrar todo en cualquier momento. Sin rastreo ni publicidad.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <Icon className="h-4 w-4 text-sand/70" />
                <p className="mt-3 text-[11px] font-semibold text-cream/80">{item.title}</p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-cream/35">{item.text}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-moss/15 bg-moss/[0.04] px-3.5 py-2.5">
          <p className="flex items-center gap-2 text-[9px] text-cream/40">
            <ShieldCheck className="h-3.5 w-3.5 text-moss/70" />
            AURA es una demo funcional. No sustituye asesoría de imagen profesional.
          </p>
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[9px] font-semibold text-moss/80 hover:text-moss"
          >
            Datos de clima: Open-Meteo <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </section>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Restaurar la demo"
        subtitle="Se eliminarán tus prendas, fotos y planes guardados en este navegador."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setResetOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onReset();
                setResetOpen(false);
                notify('Demo restaurada. Tu clóset volvió al estado inicial.', 'success');
              }}
              className="btn bg-clay text-white hover:bg-clay/90"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Sí, restaurar
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-3 rounded-2xl border border-clay/20 bg-clay/[0.05] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
          <div>
            <p className="text-[11px] font-semibold text-cream/80">Antes de continuar</p>
            <p className="mt-1 text-[10px] leading-relaxed text-cream/40">
              Si quieres conservar tu información, descarga un respaldo primero. El clóset de demostración incluye 18
              prendas, un perfil neutro y la paleta Otoño cálido.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
