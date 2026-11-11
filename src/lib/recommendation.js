import { EVENT_TYPES, PRODUCT_CATALOG, BODY_SHAPES } from './data';
import { colorMatch, getPalette } from './colors';
import { buildTryOnPrompt } from './prompt';

export { buildTryOnPrompt };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const stdDev = (values) => {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - avg) ** 2)));
};
const round1 = (n) => Math.round(n * 10) / 10;

export const toISODate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseISODate = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const todayISO = () => toISODate(new Date());

export const defaultStartDate = () => toISODate(addDays(new Date(), 10));

export function formatDate(value, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const date = typeof value === 'string' ? parseISODate(value) : value;
  if (!date) return '';
  return new Intl.DateTimeFormat('es-CO', options).format(date);
}

export function formatDateRange(startDate, days) {
  const start = parseISODate(startDate);
  if (!start) return '';
  const end = addDays(start, Math.max(0, days - 1));
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = formatDate(start, { day: 'numeric', month: 'short' });
  const endLabel = formatDate(end, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
  return `${startLabel} – ${endLabel}`;
}

export function dateRange(startDate, days) {
  const start = parseISODate(startDate) || new Date();
  return Array.from({ length: days }, (_, index) => addDays(start, index));
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function jitter(seed, amount = 3) {
  const x = Math.sin(hashString(seed) + 1) * 10000;
  return (x - Math.floor(x)) * amount * 2 - amount;
}

function fetchJson(url, timeout = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .finally(() => clearTimeout(timer));
}

const WEATHER_CODES = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna',
  55: 'Llovizna intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia',
  65: 'Lluvia fuerte',
  71: 'Nieve ligera',
  73: 'Nieve',
  75: 'Nieve fuerte',
  80: 'Chubascos ligeros',
  81: 'Chubascos',
  82: 'Chubascos fuertes',
  95: 'Tormenta',
  96: 'Tormenta con granizo',
};

export async function fetchWeather(destination, startDate, days) {
  if (!destination?.trim()) return null;
  const start = parseISODate(startDate);
  if (!start) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = addDays(today, 15);
  const end = addDays(start, Math.max(0, days - 1));
  if (start > limit || end > limit) {
    return {
      error: 'La fecha está fuera del rango de pronóstico (16 días).',
      outOfRange: true,
    };
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    destination.trim(),
  )}&count=1&language=es&format=json`;
  const geo = await fetchJson(geoUrl);
  const place = geo?.results?.[0];
  if (!place) {
    return { error: 'No encontramos ese destino. Revisa el nombre o elige el clima manualmente.' };
  }

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
    `&timezone=auto&start_date=${toISODate(start)}&end_date=${toISODate(end)}`;
  const forecast = await fetchJson(forecastUrl);
  const daily = forecast?.daily;
  if (!daily?.time?.length) {
    return { error: 'El pronóstico no devolvió datos para esas fechas.' };
  }

  const entries = daily.time.map((date, index) => ({
    date,
    max: Math.round(daily.temperature_2m_max?.[index] ?? 0),
    min: Math.round(daily.temperature_2m_min?.[index] ?? 0),
    rain: Math.round(daily.precipitation_probability_max?.[index] ?? 0),
    code: daily.weather_code?.[index] ?? 0,
    label: WEATHER_CODES[daily.weather_code?.[index]] || 'Variable',
  }));

  const avgMax = mean(entries.map((d) => d.max));
  const avgMin = mean(entries.map((d) => d.min));
  const maxRain = Math.max(...entries.map((d) => d.rain));
  const climate = avgMax >= 27 ? 'calor' : avgMax <= 16 ? 'frio' : 'templado';
  const rainy = maxRain >= 45;

  return {
    source: 'forecast',
    location: {
      name: place.name,
      region: place.admin1 || '',
      country: place.country || '',
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone,
    },
    days: entries,
    climate,
    rainy,
    avgMax: Math.round(avgMax),
    avgMin: Math.round(avgMin),
    maxRain,
    summary: `${Math.round(avgMax)}° / ${Math.round(avgMin)}°`,
    note: 'Pronóstico real de Open-Meteo para las fechas del viaje.',
  };
}

export function fallbackWeather({ destination, climate = 'auto', days = 4, startDate, error }) {
  const normalized =
    climate === 'lluvia' ? 'templado' : ['calor', 'templado', 'frio'].includes(climate) ? climate : 'templado';
  const rainy = climate === 'lluvia';
  const ranges = {
    calor: [31, 24, 20],
    templado: [23, 14, 35],
    frio: [13, 5, 30],
  };
  const [max, min, rain] = ranges[normalized];
  const dates = dateRange(startDate, days);
  const entries = dates.map((date, index) => ({
    date: toISODate(date),
    max: max + (index % 2 === 0 ? 1 : -1),
    min: min + (index % 2 === 0 ? 0 : 1),
    rain: rainy ? 70 : rain,
    code: rainy ? 61 : normalized === 'calor' ? 0 : 2,
    label: rainy ? 'Lluvia intermitente' : normalized === 'calor' ? 'Despejado' : 'Parcialmente nublado',
  }));
  const climateLabel = { calor: 'cálido', templado: 'templado', frio: 'frío' }[normalized];
  return {
    source: 'manual',
    location: null,
    days: entries,
    climate: normalized,
    rainy,
    avgMax: max,
    avgMin: min,
    maxRain: rainy ? 70 : rain,
    summary: `${max}° / ${min}°`,
    note:
      error ||
      (climate === 'auto'
        ? `Sin pronóstico disponible. Usamos una referencia ${climateLabel} para que el plan siga siendo útil.`
        : `Clima configurado manualmente como ${climateLabel}${rainy ? ' y lluvioso' : ''}.`),
  };
}

const EVENT_STYLE_AFFINITY = {
  gala: ['Formal', 'Elegante'],
  boda: ['Formal', 'Elegante', 'Smart casual'],
  negocio: ['Formal', 'Smart casual', 'Elegante'],
  playa: ['Casual', 'Smart casual'],
  vacaciones: ['Casual', 'Smart casual', 'Elegante'],
  casual: ['Casual', 'Streetwear', 'Smart casual'],
  ciudad: ['Casual', 'Smart casual', 'Streetwear'],
  deporte: ['Deportivo', 'Casual', 'Streetwear'],
};

function seasonForClimate(climate) {
  if (climate === 'calor') return 'verano';
  if (climate === 'frio') return 'invierno';
  return 'transicion';
}

function seasonScore(item, needed) {
  if (item.season === needed) return 100;
  if (item.season === 'todo') return 92;
  if (item.season === 'transicion') return needed === 'verano' ? 62 : needed === 'invierno' ? 72 : 100;
  if (needed === 'transicion') return 55;
  return 30;
}

function warmthTarget(climate) {
  return climate === 'calor' ? 1 : climate === 'frio' ? 3 : 2;
}

function isEligible(item, climate) {
  if (!item) return false;
  const subtype = (item.subtype || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  if (climate === 'calor' && item.warmth === 3 && item.season === 'invierno') return false;
  if (climate === 'calor' && /sandalia|chancla/.test(subtype)) return true;
  if (climate === 'frio' && /sandalia|chancla/.test(subtype)) return false;
  if (climate === 'frio' && item.season === 'verano' && item.warmth === 1 && !/camiseta|top/.test(name)) {
    return false;
  }
  return true;
}

function baseScore(item, target, context) {
  const { profile, climate, eventId } = context;
  const neededSeason = seasonForClimate(climate);
  const formalityFit = 100 - Math.abs(item.formality - target) * 11;
  const color = colorMatch(item.colorHex, profile.undertone);
  const season = seasonScore(item, neededSeason);
  const warmth = 100 - Math.abs((item.warmth || 1) - warmthTarget(climate)) * 24;
  const versatility = { frecuente: 100, ocasional: 78, rara: 58 }[item.frequency] || 70;
  const styleAffinity = EVENT_STYLE_AFFINITY[eventId] || [];
  const style = styleAffinity.includes(item.style) ? 100 : styleAffinity.length ? 58 : 75;
  let total =
    formalityFit * 0.38 +
    color * 0.24 +
    season * 0.14 +
    warmth * 0.1 +
    versatility * 0.08 +
    style * 0.06;

  if (context.rainy && /sandalia|chancla/i.test(`${item.subtype} ${item.name}`)) {
    total -= 14;
  }

  return {
    total,
    formalityFit,
    color,
    season,
    warmth,
    versatility,
    style,
  };
}

function pickBest(items, target, context, { avoidId, usage = {}, seed = '' } = {}) {
  let best = null;
  let bestScore = -Infinity;
  for (const item of items) {
    if (!isEligible(item, context.climate)) continue;
    const score = baseScore(item, target, context);
    let total = score.total + jitter(`${seed}-${item.id}`, 2.2);
    if (avoidId && item.id === avoidId) total -= 16;
    total -= (usage[item.id] || 0) * 5.5;
    if (total > bestScore) {
      bestScore = total;
      best = { item, score, total };
    }
  }
  return best;
}

function pickCapsule(items, slots, max, context, seedPrefix) {
  const eligible = items.filter((item) => isEligible(item, context.climate));
  if (!eligible.length) return [];
  const sortedSlots = [...slots].sort((a, b) => a.target - b.target);
  const anchors = [sortedSlots[0], sortedSlots[sortedSlots.length - 1]];
  const selected = [];
  const selectedIds = new Set();

  for (const slot of anchors) {
    if (!slot || selected.length >= max) continue;
    const best = pickBest(
      eligible.filter((item) => !selectedIds.has(item.id)),
      slot.target,
      context,
      { seed: `${seedPrefix}-anchor-${slot.id}` },
    );
    if (best) {
      selected.push(best.item);
      selectedIds.add(best.item.id);
    }
  }

  while (selected.length < Math.min(max, eligible.length)) {
    let best = null;
    let bestScore = -Infinity;
    for (const item of eligible) {
      if (selectedIds.has(item.id)) continue;
      const scores = slots.map((slot) => baseScore(item, slot.target, context).total);
      const maxScore = Math.max(...scores);
      const avgScore = mean(scores);
      const versatility = { frecuente: 100, ocasional: 78, rara: 58 }[item.frequency] || 70;
      const score = maxScore * 0.55 + avgScore * 0.25 + versatility * 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (!best) break;
    selected.push(best);
    selectedIds.add(best.id);
  }

  return selected;
}

function accessoryContextScore(item, slot, context) {
  const subtype = (item.subtype || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  let bonus = 0;
  const isDay = slot.part === 'day';
  if (/gafas/.test(subtype + name) && isDay && context.climate !== 'frio') bonus += 26;
  if (/sombrero/.test(subtype + name) && isDay && context.climate === 'calor') bonus += 24;
  if (/reloj/.test(subtype + name) && slot.target >= 6) bonus += 26;
  if (/bolso|tote/.test(subtype + name) && isDay) bonus += 12;
  if (/bufanda/.test(subtype + name) && context.climate === 'frio') bonus += 28;
  if (slot.target >= 8 && /reloj|bolso/.test(subtype + name)) bonus += 10;
  return bonus;
}

function chooseAccessories(accessories, slot, context, usage) {
  if (!accessories.length) return [];
  const ranked = accessories
    .filter((item) => isEligible(item, context.climate))
    .map((item) => ({
      item,
      score:
        baseScore(item, slot.target, context).total +
        accessoryContextScore(item, slot, context) -
        (usage[item.id] || 0) * 3 +
        jitter(`${slot.id}-acc-${item.id}`, 2),
    }))
    .sort((a, b) => b.score - a.score);
  const count = slot.target >= 7 || slot.part === 'day' ? Math.min(2, ranked.length) : Math.min(1, ranked.length);
  return ranked.slice(0, count).map((entry) => entry.item);
}

function shouldAddLayer(climate, target, rainy) {
  if (climate === 'frio') return true;
  if (climate === 'templado') return target >= 4;
  return target >= 8 || (rainy && target >= 6);
}

function describePiece(item, fallback) {
  if (!item) return '';
  return `${(item.subtype || fallback).toLowerCase()} en ${item.colorName.toLowerCase()}`;
}

function pickOutfitCombination(pieces, slot, context, usage, comboUsage, last) {
  const tops = pieces.tops.filter((item) => isEligible(item, context.climate));
  const bottoms = pieces.bottoms.filter((item) => isEligible(item, context.climate));
  const shoes = pieces.shoes.filter((item) => isEligible(item, context.climate));

  let best = null;
  let bestTotal = -Infinity;

  for (const top of tops) {
    const topScore = baseScore(top, slot.target, context);
    for (const bottom of bottoms) {
      const bottomScore = baseScore(bottom, slot.target, context);
      for (const shoe of shoes) {
        const shoeScore = baseScore(shoe, slot.target, context);
        const core = [top, bottom, shoe];
        const coherence = 100 - stdDev(core.map((item) => item.formality)) * 10;
        const key = `${top.id}|${bottom.id}|${shoe.id}`;
        let total =
          topScore.total * 0.42 +
          bottomScore.total * 0.36 +
          shoeScore.total * 0.22 +
          coherence * 0.1 +
          jitter(`${slot.id}-${key}`, 1.4);
        total -= (usage[top.id] || 0) * 4.5;
        total -= (usage[bottom.id] || 0) * 4.5;
        total -= (usage[shoe.id] || 0) * 4.5;
        total -= (comboUsage[key] || 0) * 14;
        if (last.top === top.id) total -= 7;
        if (last.bottom === bottom.id) total -= 6;
        if (last.shoes === shoe.id) total -= 4;

        if (total > bestTotal) {
          bestTotal = total;
          best = { top, bottom, shoe };
        }
      }
    }
  }

  if (best) return best;

  return {
    top: pickBest(tops, slot.target, context, { seed: `${slot.id}-top` })?.item || null,
    bottom: pickBest(bottoms, slot.target, context, { seed: `${slot.id}-bottom` })?.item || null,
    shoe: pickBest(shoes, slot.target, context, { seed: `${slot.id}-shoe` })?.item || null,
  };
}

function buildOutfit(pieces, target, context, slot) {
  const { tops, bottoms, shoes, layers, accessories } = pieces;
  const outfit = {
    top: tops,
    bottom: bottoms,
    shoes,
    layer: layers,
    accessories,
  };
  const main = [tops, bottoms, shoes, layers].filter(Boolean);
  const formalityAvg = main.length ? mean(main.map((item) => item.formality)) : 0;
  const formalityFit = main.length ? 100 - Math.abs(formalityAvg - target) * 11 : 30;
  const nearFace = [tops, layers].filter(Boolean);
  const colorNearFace = nearFace.length ? mean(nearFace.map((item) => colorMatch(item.colorHex, context.profile.undertone))) : 70;
  const colorAll = main.length
    ? mean(main.map((item) => colorMatch(item.colorHex, context.profile.undertone)))
    : 70;
  const color = colorNearFace * 0.6 + colorAll * 0.4;
  const coherence = main.length >= 2 ? 100 - stdDev(main.map((item) => item.formality)) * 12 : 62;
  const weatherFit = main.length
    ? 100 - mean(main.map((item) => Math.abs((item.warmth || 1) - warmthTarget(context.climate)) * 22))
    : 50;
  const total = clamp(
    formalityFit * 0.4 + color * 0.3 + coherence * 0.2 + weatherFit * 0.1 + (main.length === 3 ? 3 : 0),
    42,
    100,
  );
  const match = Math.round(color);
  const validation =
    match >= 82 ? 'Paleta alineada' : match >= 72 ? 'Neutro seguro' : 'Revisar cercanía al rostro';

  const reason = [
    describePiece(tops, 'Superior'),
    describePiece(bottoms, 'Inferior'),
    describePiece(shoes, 'Calzado'),
  ]
    .filter(Boolean)
    .join(' + ');

  return {
    ...outfit,
    score: Math.round(total),
    formality: round1(formalityAvg),
    colorScore: Math.round(color),
    validation,
    target: round1(target),
    reason: reason ? reason.charAt(0).toUpperCase() + reason.slice(1) : '',
    slotId: slot.id,
    part: slot.part,
    dayIndex: slot.dayIndex,
    label: slot.label,
  };
}

function buildSlots(trip, event) {
  const days = clamp(Number(trip.days) || 3, 1, 21);
  const nights = clamp(Number(trip.nights) || 0, 0, days);
  const slots = [];
  for (let index = 0; index < days; index += 1) {
    const variance = (index % 3) - 1;
    const dayTarget = clamp(event.baseFormality + event.dayDelta + variance * 0.4, 1, 10);
    slots.push({
      id: `d${index + 1}-day`,
      dayIndex: index,
      part: 'day',
      label: `Día ${index + 1} · ${event.dayLabel}`,
      shortLabel: `Día ${index + 1}`,
      target: dayTarget,
      date: toISODate(addDays(parseISODate(trip.startDate) || new Date(), index)),
    });
    if (index < nights) {
      const nightTarget = clamp(event.baseFormality + event.nightDelta - variance * 0.3, 1, 10);
      slots.push({
        id: `d${index + 1}-night`,
        dayIndex: index,
        part: 'night',
        label: `Noche ${index + 1} · ${event.nightLabel}`,
        shortLabel: `Noche ${index + 1}`,
        target: nightTarget,
        date: toISODate(addDays(parseISODate(trip.startDate) || new Date(), index)),
      });
    }
  }
  return slots;
}

export function buildPlan({ profile, inventory, trip, weather }) {
  const event = EVENT_TYPES.find((entry) => entry.id === trip.eventType) || EVENT_TYPES[0];
  const slots = buildSlots(trip, event);
  const context = {
    profile,
    climate: weather?.climate || 'templado',
    eventId: event.id,
    rainy: Boolean(weather?.rainy),
  };
  const baseTops = inventory.filter((item) => item.category === 'tops' && !item.layer);
  const layerItems = inventory.filter((item) => item.category === 'tops' && item.layer);
  const bottoms = inventory.filter((item) => item.category === 'bottoms');
  const shoes = inventory.filter((item) => item.category === 'shoes');
  const accessories = inventory.filter((item) => item.category === 'accessories');

  const days = slots.length ? slots[slots.length - 1].dayIndex + 1 : Number(trip.days) || 1;
  const maxTops = clamp(Math.ceil(days / 2) + 1, 2, 4);
  const maxBottoms = clamp(Math.ceil(days / 3) + 1, 2, 3);
  const maxShoes = days <= 5 ? 2 : 3;
  const maxLayers =
    context.climate === 'frio' ? 2 : context.climate === 'templado' ? 1 : Math.max(...slots.map((s) => s.target)) >= 8 ? 1 : 0;
  const maxAccessories = 3;

  const capsule = {
    tops: pickCapsule(baseTops, slots, maxTops, context, 'tops'),
    bottoms: pickCapsule(bottoms, slots, maxBottoms, context, 'bottoms'),
    shoes: pickCapsule(shoes, slots, maxShoes, context, 'shoes'),
    layers: maxLayers ? pickCapsule(layerItems, slots, maxLayers, context, 'layers') : [],
    accessories: pickCapsule(accessories, slots, maxAccessories, context, 'accessories'),
  };

  const usage = {};
  const comboUsage = {};
  const last = { top: null, bottom: null, shoes: null };
  const outfits = slots.map((slot) => {
    const combination = pickOutfitCombination(capsule, slot, context, usage, comboUsage, last);
    const top = combination.top;
    const bottom = combination.bottom;
    const shoe = combination.shoe;
    const layer =
      capsule.layers.length && shouldAddLayer(context.climate, slot.target, context.rainy)
        ? pickBest(capsule.layers, slot.target, context, { seed: `${slot.id}-layer` })?.item || null
        : null;
    const selectedAccessories = chooseAccessories(capsule.accessories, slot, context, usage);

    if (top) usage[top.id] = (usage[top.id] || 0) + 1;
    if (bottom) usage[bottom.id] = (usage[bottom.id] || 0) + 1;
    if (shoe) usage[shoe.id] = (usage[shoe.id] || 0) + 1;
    if (layer) usage[layer.id] = (usage[layer.id] || 0) + 1;
    selectedAccessories.forEach((item) => {
      usage[item.id] = (usage[item.id] || 0) + 1;
    });

    if (top && bottom && shoe) {
      const key = `${top.id}|${bottom.id}|${shoe.id}`;
      comboUsage[key] = (comboUsage[key] || 0) + 1;
    }

    last.top = top?.id || null;
    last.bottom = bottom?.id || null;
    last.shoes = shoe?.id || null;

    return buildOutfit({ tops: top, bottoms: bottom, shoes: shoe, layers: layer, accessories: selectedAccessories }, slot.target, context, slot);
  });

  const packing = buildPackingList(outfits, weather, trip, event);
  const missing = buildMissingPieces({ inventory, profile, outfits, slots, context, event, trip });
  const coverage = computeCoverage(outfits, slots);

  const uniquePieces = new Set();
  outfits.forEach((outfit) => {
    [outfit.top, outfit.bottom, outfit.shoes, outfit.layer, ...(outfit.accessories || [])]
      .filter(Boolean)
      .forEach((item) => uniquePieces.add(item.id));
  });

  return {
    id: `plan-${Date.now()}`,
    createdAt: new Date().toISOString(),
    trip: {
      destination: trip.destination?.trim() || 'Tu destino',
      startDate: trip.startDate,
      days: Number(trip.days) || 1,
      nights: Number(trip.nights) || 0,
      eventType: event.id,
      eventLabel: event.label,
      climate: trip.climate || 'auto',
      notes: trip.notes || '',
    },
    event,
    weather,
    profileSnapshot: {
      name: profile.name,
      undertone: profile.undertone,
      palette: getPalette(profile.undertone).name,
    },
    slots,
    outfits,
    capsule,
    packing,
    missing,
    coverage,
    stats: {
      outfits: outfits.length,
      pieces: uniquePieces.size,
      avgScore: Math.round(mean(outfits.map((outfit) => outfit.score))),
      avgFormality: round1(mean(outfits.map((outfit) => outfit.formality))),
    },
  };
}

function computeCoverage(outfits, slots) {
  const complete = outfits.filter((outfit) => outfit.top && outfit.bottom && outfit.shoes).length;
  const ratio = slots.length ? complete / slots.length : 0;
  if (ratio === 1) return { level: 'completa', label: 'Cobertura completa', detail: 'Tu clóset cubre todos los escenarios.' };
  if (ratio >= 0.6) return { level: 'parcial', label: 'Cobertura parcial', detail: 'Hay escenarios que necesitan una pieza clave.' };
  return { level: 'baja', label: 'Clóset insuficiente', detail: 'Faltan bases para completar este viaje.' };
}

function buildPackingList(outfits, weather, trip, event) {
  const groups = {};
  const counts = {};
  const usage = {};
  outfits.forEach((outfit) => {
    [outfit.top, outfit.bottom, outfit.shoes, outfit.layer, ...(outfit.accessories || [])]
      .filter(Boolean)
      .forEach((item) => {
        usage[item.id] = (usage[item.id] || 0) + 1;
        counts[item.category] = (counts[item.category] || 0) + 1;
      });
  });
  const seen = new Set();
  outfits.forEach((outfit) => {
    [outfit.top, outfit.bottom, outfit.shoes, outfit.layer, ...(outfit.accessories || [])]
      .filter(Boolean)
      .forEach((item) => {
        if (seen.has(item.id)) return;
        seen.add(item.id);
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push({ item, uses: usage[item.id] || 1 });
      });
  });

  const days = Number(trip.days) || 1;
  const essentials = [
    {
      group: 'Básicos',
      items: [
        `${days} × ropa interior`,
        `${days} × calcetines`,
        '1 × pijama / ropa de descanso',
        'Neceser de baño',
      ],
    },
    {
      group: 'Tecnología',
      items: ['Cargador de teléfono', 'Adaptador de corriente', 'Audífonos'],
    },
    {
      group: 'Salud',
      items: ['Protector solar', 'Medicamentos personales', 'Bálsamo labial'],
    },
    {
      group: 'Logística',
      items: ['Documentos / identificación', 'Método de pago', 'Bolsa para ropa sucia'],
    },
  ];

  if (weather?.rainy) {
    essentials.push({
      group: 'Lluvia',
      items: ['Paraguas compacto', 'Funda impermeable para calzado', 'Capa extra de secado rápido'],
    });
  }
  if (weather?.climate === 'calor') {
    essentials.push({ group: 'Calor', items: ['Botella de agua reutilizable', 'Gorra o sombrero', 'After-sun'] });
  }
  if (weather?.climate === 'frio') {
    essentials.push({ group: 'Frío', items: ['Bufanda / cuello', 'Crema hidratante', 'Capas térmicas ligeras'] });
  }

  const bag =
    days <= 3
      ? 'Mochila de 28–35 L o carry-on pequeño'
      : days <= 6
        ? 'Maleta de cabina 40 L + bolso personal'
        : 'Maleta mediana 60 L + bolso personal';

  return {
    groups,
    essentials,
    bag,
    totalPieces: seen.size,
    counts,
    eventLabel: event.label,
  };
}

function pairScore(product, item, undertone) {
  if (!item || item.category === product.category) return 0;
  const colorA = colorMatch(product.colorHex, undertone);
  const colorB = colorMatch(item.colorHex, undertone);
  const neutralA = colorA >= 88;
  const neutralB = colorB >= 88;
  const colorCompatibility = neutralA || neutralB ? 100 : 100 - Math.abs(colorA - colorB) * 1.4;
  const formalityCompatibility = 100 - Math.abs((product.formality || 5) - (item.formality || 5)) * 14;
  const styleCompatibility = product.style === item.style ? 100 : 76;
  const score = colorCompatibility * 0.5 + formalityCompatibility * 0.35 + styleCompatibility * 0.15;
  return Math.round(score);
}

function enrichProduct(product, inventory, profile, gap) {
  const pairs = inventory
    .map((item) => ({ item, score: pairScore(product, item, profile.undertone) }))
    .filter((entry) => entry.score >= 62)
    .sort((a, b) => b.score - a.score);
  return {
    ...product,
    gap,
    pairCount: pairs.length,
    pairedWith: pairs.slice(0, 3).map((entry) => entry.item.name),
    match: pairs.length ? Math.round(mean(pairs.slice(0, 3).map((entry) => entry.score))) : 70,
  };
}

function paletteProduct(profile) {
  const palette = getPalette(profile.undertone);
  const color = palette.colors.find((entry) => !['Crema', 'Marfil', 'Blanco puro', 'Arena'].includes(entry.name)) || palette.colors[0];
  return {
    id: `prod-power-${profile.undertone}`,
    name: `Camisa / top en ${color.name.toLowerCase()}`,
    category: 'tops',
    subtype: 'Camisa',
    colorName: color.name,
    colorHex: color.hex,
    style: 'Smart casual',
    formality: 6,
    season: 'todo',
    material: 'Lyocell / algodón',
    warmth: 1,
    layer: false,
    budget: '$70 – $120 USD',
    store: 'COS',
    url: `https://www.cos.com/en/search?q=${encodeURIComponent(color.name)}%20shirt`,
    reason: `Refuerza tu paleta ${palette.name} y hace que el resto del clóset se vea más intencional.`,
  };
}

export function buildMissingPieces({ inventory, profile, outfits, slots, context, event, trip }) {
  const gaps = [];
  const formalSlots = slots.filter((slot) => slot.target >= 7.5);
  const formalOutfits = outfits.filter((outfit) => outfit.target >= 7.5);
  const bestFormal = formalOutfits.length ? Math.max(...formalOutfits.map((outfit) => outfit.score)) : 0;
  const bestShoeFormality = inventory.filter((item) => item.category === 'shoes').reduce((max, item) => Math.max(max, item.formality), 0);
  const bestTopFormality = inventory
    .filter((item) => item.category === 'tops' && !item.layer)
    .reduce((max, item) => Math.max(max, item.formality), 0);
  const hasWarmLayer = inventory.some(
    (item) => item.category === 'tops' && item.layer && (item.warmth || 1) >= 2,
  );
  const hasClosedShoes = inventory.some(
    (item) => item.category === 'shoes' && !/sandalia|chancla/i.test(`${item.subtype} ${item.name}`),
  );
  const topColorScores = inventory.filter((item) => item.category === 'tops').map((item) => colorMatch(item.colorHex, profile.undertone));
  const paletteRatio = topColorScores.length ? topColorScores.filter((score) => score >= 78).length / topColorScores.length : 0;

  if (formalSlots.length && (bestFormal < 72 || bestShoeFormality < 8)) {
    gaps.push({
      id: 'formal',
      title: 'Falta un cierre formal',
      detail: `Tu clóset llega a nivel ${bestFormal || '—'}/100 para los momentos de etiqueta. Un calzado formal o una capa estructurada harían la diferencia.`,
    });
  }
  if (context.climate === 'frio' && !hasWarmLayer) {
    gaps.push({
      id: 'cold',
      title: 'Falta una capa de abrigo',
      detail: 'El destino estará frío y no encontramos un abrigo con suficiente aislamiento.',
    });
  }
  if (context.rainy && !hasClosedShoes) {
    gaps.push({
      id: 'rain',
      title: 'Calzado para lluvia',
      detail: 'Hay probabilidad de lluvia y tu clóset solo tiene calzado abierto.',
    });
  }
  if (paletteRatio < 0.5 && topColorScores.length) {
    gaps.push({
      id: 'color',
      title: 'Más color en tu paleta',
      detail: 'Menos de la mitad de tus prendas superiores están alineadas con tu subtono. Un top estratégico multiplicaría tus combinaciones.',
    });
  }
  if (inventory.filter((item) => item.category === 'accessories').length < 2) {
    gaps.push({
      id: 'accessory',
      title: 'Pocos remates',
      detail: 'Los accesorios son los que hacen que un outfit se sienta terminado. Tu clóset tiene muy pocos.',
    });
  }

  const candidates = [];
  if (gaps.some((gap) => gap.id === 'formal')) {
    candidates.push(PRODUCT_CATALOG.find((item) => item.id === 'prod-derby'));
    candidates.push(PRODUCT_CATALOG.find((item) => item.id === 'prod-blazer'));
    candidates.push(PRODUCT_CATALOG.find((item) => item.id === 'prod-shirt'));
  }
  if (gaps.some((gap) => gap.id === 'cold')) {
    candidates.push(PRODUCT_CATALOG.find((item) => item.id === 'prod-trench'));
    candidates.push(PRODUCT_CATALOG.find((item) => item.id === 'prod-scarf'));
  }
  if (gaps.some((gap) => gap.id === 'rain')) {
    candidates.push(PRODUCT_CATALOG.find((item) => item.id === 'prod-chelsea'));
    candidates.push(PRODUCT_CATALOG.find((item) => item.id === 'prod-trench'));
  }
  if (gaps.some((gap) => gap.id === 'color')) {
    candidates.push(paletteProduct(profile));
  }
  if (gaps.some((gap) => gap.id === 'accessory')) {
    candidates.push(PRODUCT_CATALOG.find((item) => item.id === 'prod-belt'));
    candidates.push(PRODUCT_CATALOG.find((item) => item.id === 'prod-tote'));
  }

  if (!candidates.length) {
    candidates.push(PRODUCT_CATALOG.find((item) => item.id === 'prod-shirt'));
    candidates.push(PRODUCT_CATALOG.find((item) => item.id === 'prod-tote'));
    candidates.push(paletteProduct(profile));
  }

  const unique = [];
  const seen = new Set();
  for (const product of candidates.filter(Boolean)) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    unique.push(product);
  }

  const gapForProduct = (product) => {
    if (product.category === 'shoes') return gaps.find((gap) => gap.id === 'formal' || gap.id === 'rain') || null;
    if (product.category === 'accessories') return gaps.find((gap) => gap.id === 'accessory') || null;
    if (product.id === 'prod-trench' || product.id === 'prod-scarf') return gaps.find((gap) => gap.id === 'cold') || null;
    if (product.id.startsWith('prod-power')) return gaps.find((gap) => gap.id === 'color') || null;
    return gaps.find((gap) => gap.id === 'formal') || null;
  };

  const enriched = unique
    .map((product) => enrichProduct(product, inventory, profile, gapForProduct(product)))
    .sort((a, b) => b.pairCount * 2 + b.match - (a.pairCount * 2 + a.match))
    .slice(0, 3);

  const alternative = [...outfits].sort((a, b) => b.score - a.score)[0] || null;

  return {
    gaps,
    items: enriched,
    alternative,
    coverage: gaps.length === 0,
    message:
      gaps.length === 0
        ? 'Tu clóset cubre este viaje. Estas son mejoras opcionales para elevar el resultado.'
        : `Detectamos ${gaps.length} ${gaps.length === 1 ? 'oportunidad' : 'oportunidades'} para completar el look.`,
  };
}

export function evaluateLook({ items, profile }) {
  const pieces = items.filter(Boolean);
  if (!pieces.length) return null;
  const formalityValues = pieces.map((item) => item.formality || 5);
  const formalityAvg = mean(formalityValues);
  const spread = stdDev(formalityValues);
  const colorValues = pieces.map((item) => colorMatch(item.colorHex, profile.undertone));
  const colorAvg = mean(colorValues);
  const nearFace = items[0] ? colorMatch(items[0].colorHex, profile.undertone) : 75;
  const styleSet = new Set(pieces.map((item) => item.style));
  const styleCoherence = styleSet.size === 1 ? 100 : styleSet.size === 2 ? 82 : 64;
  const score = Math.round(
    clamp(colorAvg * 0.35 + nearFace * 0.15 + (100 - spread * 14) * 0.3 + styleCoherence * 0.2, 35, 100),
  );

  const feedback = [];
  if (nearFace >= 80) {
    feedback.push(`La pieza superior (${items[0].name}) está alineada con tu paleta ${getPalette(profile.undertone).name}. Favorece tu rostro.`);
  } else if (nearFace >= 70) {
    feedback.push('El color superior es un neutro seguro. Funciona, aunque no es tu máximo potencial colorimétrico.');
  } else {
    feedback.push('El color superior no es el más favorecedor cerca del rostro. Prueba una capa o un accesorio de tu paleta para separarlo de la piel.');
  }
  if (spread > 2.2) {
    feedback.push(`Hay una diferencia de formalidad de ${round1(spread)} puntos entre las piezas. Unifica el nivel o usa la pieza más informal como contraste intencional.`);
  } else {
    feedback.push('Las piezas están en un nivel de formalidad coherente. El look se lee intencional.');
  }
  if (styleSet.size > 2) {
    feedback.push('Conviven tres códigos de estilo distintos. Reduce a dos para que el look se sienta curado.');
  }
  if (!items[4] && !items[5]) {
    feedback.push('Suma un accesorio (reloj, gafas o bolso) para cerrar el look sin esfuerzo.');
  }
  feedback.push(BODY_SHAPES[profile.bodyShape] || 'Prioriza la proporción: equilibra volumen y línea según tu silueta.');

  return {
    score,
    label: score >= 88 ? 'Look editorial' : score >= 76 ? 'Muy bien resuelto' : score >= 64 ? 'Con ajustes menores' : 'Necesita edición',
    colorAvg: Math.round(colorAvg),
    nearFace: Math.round(nearFace),
    formalityAvg: round1(formalityAvg),
    spread: round1(spread),
    feedback,
  };
}

export function planToMarkdown(plan, profile) {
  if (!plan) return '';
  const lines = [];
  lines.push(`# AURA · Plan de viaje a ${plan.trip.destination}`);
  lines.push('');
  lines.push(`**Fechas:** ${formatDateRange(plan.trip.startDate, plan.trip.days)} · **${plan.trip.days} días / ${plan.trip.nights} noches**`);
  lines.push(`**Motivo:** ${plan.event.label} · **Clima:** ${plan.weather.summary} · ${plan.weather.note}`);
  lines.push(`**Perfil:** ${profile.name || 'Tú'} · Paleta ${getPalette(profile.undertone).name} · ${profile.height} cm`);
  lines.push('');
  lines.push('## Itinerario de outfits');
  let currentDay = -1;
  plan.outfits.forEach((outfit) => {
    if (outfit.dayIndex !== currentDay) {
      currentDay = outfit.dayIndex;
      lines.push('');
      lines.push(`### Día ${currentDay + 1} · ${formatDate(outfit.slotId ? plan.slots.find((slot) => slot.id === outfit.slotId)?.date : plan.trip.startDate)}`);
    }
    lines.push('');
    lines.push(`**${outfit.label}** — ${outfit.score}/100 · Formalidad ${outfit.formality}/10 · ${outfit.validation}`);
    lines.push(`- Superior: ${outfit.top?.name || '—'}`);
    if (outfit.layer) lines.push(`- Capa: ${outfit.layer.name}`);
    lines.push(`- Inferior: ${outfit.bottom?.name || '—'}`);
    lines.push(`- Calzado: ${outfit.shoes?.name || '—'}`);
    if (outfit.accessories?.length) lines.push(`- Accesorios: ${outfit.accessories.map((item) => item.name).join(', ')}`);
    lines.push(`- Virtual Try-On: ${buildTryOnPrompt(profile, outfit, { destination: plan.trip.destination, moment: outfit.label })}`);
  });
  lines.push('');
  lines.push('## Lista de equipaje');
  lines.push(`**Equipaje sugerido:** ${plan.packing.bag}`);
  Object.entries(plan.packing.groups).forEach(([category, entries]) => {
    const label = { tops: 'Superiores', bottoms: 'Inferiores', shoes: 'Calzado', accessories: 'Accesorios' }[category] || category;
    lines.push('');
    lines.push(`### ${label}`);
    entries.forEach(({ item, uses }) => lines.push(`- [ ] ${item.name} (${uses} ${uses === 1 ? 'uso' : 'usos'})`));
  });
  plan.packing.essentials.forEach((group) => {
    lines.push('');
    lines.push(`### ${group.group}`);
    group.items.forEach((item) => lines.push(`- [ ] ${item}`));
  });
  if (plan.missing?.items?.length) {
    lines.push('');
    lines.push('## Personal Shopper · Missing pieces');
    plan.missing.gaps.forEach((gap) => lines.push(`- **${gap.title}:** ${gap.detail}`));
    plan.missing.items.forEach((product) => {
      lines.push('');
      lines.push(`### ${product.name}`);
      lines.push(`- ${product.reason}`);
      lines.push(`- Combina con ${product.pairCount} prendas de tu clóset: ${product.pairedWith.join(', ') || '—'}`);
      lines.push(`- Presupuesto: ${product.budget} · Tienda: ${product.store}`);
      lines.push(`- Enlace: ${product.url}`);
    });
  }
  lines.push('');
  lines.push('---');
  lines.push('Generado con AURA · Stylist AI. Tus datos viven en tu dispositivo.');
  return lines.join('\n');
}

export function parseTripPrompt(text) {
  const value = text || '';
  const result = {};
  const daysMatch = value.match(/(\d+)\s*d[ií]as?/i);
  const nightsMatch = value.match(/(\d+)\s*noches?/i);
  if (daysMatch) result.days = clamp(Number(daysMatch[1]), 1, 21);
  if (nightsMatch) result.nights = clamp(Number(nightsMatch[1]), 0, 21);
  if (result.days && result.nights == null) result.nights = Math.max(0, result.days - 1);

  const destinationMatch = value.match(
    /(?:voy a|viajo a|viaje a|destino:?|escapada a|iré a|ire a)\s+(.+?)(?=\s+por\s+\d|\s+\d+\s*(?:d[ií]as?|noches?)|[,.!]|$)/i,
  );
  if (destinationMatch) result.destination = destinationMatch[1].trim();

  const lower = value.toLowerCase();
  const eventKeywords = [
    ['gala', ['gala', 'black tie', 'etiqueta']],
    ['boda', ['boda', 'casamiento', 'ceremonia']],
    ['negocio', ['negocio', 'trabajo', 'summit', 'reunión', 'reunion', 'conferencia', 'networking', 'oficina']],
    ['playa', ['playa', 'resort', 'mar', 'beach']],
    ['deporte', ['deporte', 'outdoor', 'senderismo', 'trekking', 'gym']],
    ['vacaciones', ['vacaciones', 'descanso', 'escapada']],
    ['ciudad', ['ciudad', 'turismo', 'paseo']],
    ['casual', ['casual', 'informal']],
  ];
  for (const [id, words] of eventKeywords) {
    if (words.some((word) => lower.includes(word))) {
      result.eventType = id;
      break;
    }
  }

  if (/lluvia|lluvioso|húmedo|humedo/.test(lower)) result.climate = 'lluvia';
  else if (/frío|frio|nieve|invierno/.test(lower)) result.climate = 'frio';
  else if (/calor|cálido|calido|verano|playa/.test(lower)) result.climate = 'calor';
  else if (/templado|primavera|otoño|otono/.test(lower)) result.climate = 'templado';

  return result;
}
