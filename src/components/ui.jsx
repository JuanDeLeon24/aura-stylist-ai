import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Shirt,
  Layers,
  Footprints,
  Glasses,
  Sparkles,
} from 'lucide-react';
import { colorMatch } from '../lib/colors';

const CATEGORY_ICONS = {
  tops: Shirt,
  bottoms: Layers,
  shoes: Footprints,
  accessories: Glasses,
};

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-2xl',
    lg: 'sm:max-w-4xl',
    xl: 'sm:max-w-5xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[93vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-900 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] animate-fade-up sm:rounded-3xl ${sizes[size] || sizes.md}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-2xl leading-none text-cream">{title}</h2>
            {subtitle && <p className="mt-1.5 text-xs text-cream/45">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-cream/60 transition hover:bg-white/10 hover:text-cream"
            aria-label="Cerrar ventana"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-white/8 bg-ink-950/60 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ToastViewport({ toasts, onDismiss }) {
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[130] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = toast.type === 'error' ? AlertCircle : toast.type === 'info' ? Info : CheckCircle2;
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/12 bg-ink-800/95 p-3.5 shadow-2xl backdrop-blur-xl animate-fade-up"
          >
            <div
              className={`mt-0.5 rounded-full p-1 ${
                toast.type === 'error'
                  ? 'bg-red-500/15 text-red-300'
                  : toast.type === 'info'
                    ? 'bg-sand/15 text-sand'
                    : 'bg-moss/15 text-moss'
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-relaxed text-cream/85">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action.onClick();
                    onDismiss(toast.id);
                  }}
                  className="mt-1.5 text-[11px] font-semibold text-sand underline decoration-sand/40 underline-offset-4 hover:text-sand-soft"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-full p-1 text-cream/35 transition hover:bg-white/10 hover:text-cream"
              aria-label="Cerrar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

export function ScoreRing({ value = 0, size = 64, stroke = 4, label, sublabel }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const color = value >= 85 ? '#8fbfa8' : value >= 70 ? '#cbb89a' : '#b96b4b';
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(244,239,230,0.09)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold leading-none text-cream">{Math.round(value)}</span>
        {sublabel && <span className="mt-0.5 text-[8px] uppercase tracking-widest text-cream/40">{sublabel}</span>}
        {label && <span className="mt-0.5 text-[8px] uppercase tracking-widest text-cream/40">{label}</span>}
      </div>
    </div>
  );
}

export function GarmentImage({ item, className = '', imgClassName = '', compact = false }) {
  const [failed, setFailed] = useState(false);
  const Icon = CATEGORY_ICONS[item?.category] || Shirt;
  const showFallback = !item?.image || failed;
  const color = item?.colorHex || '#8C7B6B';

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: showFallback
          ? `radial-gradient(circle at 30% 20%, ${color}55, #151311 70%)`
          : '#151311',
      }}
    >
      {!showFallback && (
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      )}
      {showFallback && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3">
          <div className="rounded-full border border-white/10 bg-black/20 p-3 backdrop-blur-sm">
            <Icon className={compact ? 'h-4 w-4' : 'h-6 w-6'} style={{ color: '#f4efe6' }} />
          </div>
          {!compact && (
            <span className="line-clamp-2 text-center text-[10px] font-medium text-cream/60">{item?.name || 'Sin foto'}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function ColorDot({ hex, size = 10, className = '' }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border border-white/25 ${className}`}
      style={{ backgroundColor: hex, width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function MatchPill({ score, undertone, className = '' }) {
  const value = score ?? colorMatch('#8C7B6B', undertone);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        value >= 85
          ? 'border-moss/25 bg-moss/10 text-moss'
          : value >= 72
            ? 'border-sand/25 bg-sand/10 text-sand'
            : 'border-clay/25 bg-clay/10 text-clay'
      } ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value}% match
    </span>
  );
}

export function EmptyState({ icon: Icon = Sparkles, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-14 text-center">
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-sand">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-2xl text-cream">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-xs leading-relaxed text-cream/45">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] leading-relaxed text-cream/35">{hint}</span>}
    </label>
  );
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-full border border-white/10 bg-ink-950/60 p-1 ${className}`}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              active ? 'bg-cream text-ink-950 shadow-sm' : 'text-cream/45 hover:text-cream/80'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
