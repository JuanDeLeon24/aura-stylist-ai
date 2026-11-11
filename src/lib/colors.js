export const PALETTES = {
  calido: {
    id: 'calido',
    name: 'Otoño cálido',
    tagline: 'Tonos tierra, dorados y verdes orgánicos.',
    description:
      'Tu subtono dorado se lleva mejor con colores que parecen bañados por el sol: camel, oliva, crema y terracota. Evita los fríos eléctricos cerca del rostro.',
    colors: [
      { name: 'Camel', hex: '#B08968' },
      { name: 'Oliva', hex: '#6B7255' },
      { name: 'Crema', hex: '#EFE6D3' },
      { name: 'Terracota', hex: '#B15A3C' },
      { name: 'Chocolate', hex: '#4A332A' },
      { name: 'Mostaza', hex: '#C6A15B' },
      { name: 'Verde bosque', hex: '#3F5744' },
      { name: 'Teja', hex: '#8C4A36' },
    ],
    avoid: [
      { name: 'Lavanda frío', hex: '#B9A7D1' },
      { name: 'Fucsia neón', hex: '#FF2E88' },
      { name: 'Gris acerado', hex: '#8C98A4' },
      { name: 'Azul eléctrico', hex: '#2447FF' },
    ],
  },
  frio: {
    id: 'frio',
    name: 'Invierno frío',
    tagline: 'Contrastes nítidos, joyas profundas y blancos puros.',
    description:
      'Tu subtono rosado o azulado gana con contrastes limpios: marino, esmeralda, borgoña y blanco puro. Los tierras amarillentos pueden apagarte cerca del rostro.',
    colors: [
      { name: 'Azul marino', hex: '#1F2A44' },
      { name: 'Carbón', hex: '#2B2D31' },
      { name: 'Esmeralda', hex: '#0E5A4A' },
      { name: 'Borgoña', hex: '#6B1F35' },
      { name: 'Blanco puro', hex: '#F7F7F4' },
      { name: 'Plata', hex: '#B9BEC6' },
      { name: 'Ciruela', hex: '#4A2545' },
      { name: 'Azul hielo', hex: '#A9C7D8' },
    ],
    avoid: [
      { name: 'Naranja quemado', hex: '#C45A2A' },
      { name: 'Mostaza', hex: '#C6A15B' },
      { name: 'Beige amarillento', hex: '#D8C39A' },
      { name: 'Camel cálido', hex: '#B08968' },
    ],
  },
  neutro: {
    id: 'neutro',
    name: 'Neutro equilibrado',
    tagline: 'Una base flexible que juega con ambos extremos.',
    description:
      'Tu piel no se inclina claramente hacia cálido ni frío, así que puedes construir con neutros sofisticados y sumar acentos en cualquier temperatura.',
    colors: [
      { name: 'Taupe', hex: '#8C7B6B' },
      { name: 'Pizarra', hex: '#475569' },
      { name: 'Marfil', hex: '#F2EEE6' },
      { name: 'Oliva suave', hex: '#6B7255' },
      { name: 'Denim', hex: '#3B5A78' },
      { name: 'Óxido', hex: '#A0522D' },
      { name: 'Arena', hex: '#D6C4AB' },
      { name: 'Negro suave', hex: '#22201E' },
    ],
    avoid: [
      { name: 'Verde neón', hex: '#39FF14' },
      { name: 'Pastel lavado', hex: '#D9C7E8' },
      { name: 'Amarillo flúor', hex: '#F2FF00' },
      { name: 'Rosa chicle', hex: '#FF6FAE' },
    ],
  },
};

const NAMED_COLORS = [
  ['Blanco puro', '#F7F7F4'],
  ['Marfil', '#F2EEE6'],
  ['Crema', '#EFE6D3'],
  ['Arena', '#D6C4AB'],
  ['Beige', '#D8C39A'],
  ['Camel', '#B08968'],
  ['Taupe', '#8C7B6B'],
  ['Chocolate', '#4A332A'],
  ['Café moka', '#6F4E37'],
  ['Terracota', '#B15A3C'],
  ['Teja', '#8C4A36'],
  ['Óxido', '#A0522D'],
  ['Mostaza', '#C6A15B'],
  ['Oliva', '#6B7255'],
  ['Verde bosque', '#3F5744'],
  ['Esmeralda', '#0E5A4A'],
  ['Verde salvia', '#9CAF88'],
  ['Azul marino', '#1F2A44'],
  ['Denim', '#3B5A78'],
  ['Azul cielo', '#A9C7D8'],
  ['Azul eléctrico', '#2447FF'],
  ['Pizarra', '#475569'],
  ['Gris acerado', '#8C98A4'],
  ['Plata', '#B9BEC6'],
  ['Carbón', '#2B2D31'],
  ['Negro suave', '#22201E'],
  ['Negro', '#0D0D0D'],
  ['Borgoña', '#6B1F35'],
  ['Ciruela', '#4A2545'],
  ['Lavanda', '#B9A7D1'],
  ['Rosa chicle', '#FF6FAE'],
  ['Fucsia', '#FF2E88'],
  ['Rojo', '#B3261E'],
  ['Amarillo flúor', '#F2FF00'],
];

export function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  let value = hex.trim().replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

export function isNeutral(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const { s, l } = rgbToHsl(rgb);
  return s < 0.16 || l < 0.1 || l > 0.93;
}

function distance(a, b) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return 441;
  return Math.sqrt((ra.r - rb.r) ** 2 + (ra.g - rb.g) ** 2 + (ra.b - rb.b) ** 2);
}

export function colorName(hex) {
  if (!hexToRgb(hex)) return 'Sin color';
  let best = NAMED_COLORS[0];
  let bestDistance = Infinity;
  for (const entry of NAMED_COLORS) {
    const d = distance(hex, entry[1]);
    if (d < bestDistance) {
      bestDistance = d;
      best = entry;
    }
  }
  return best[0];
}

export function getPalette(undertone = 'neutro') {
  return PALETTES[undertone] || PALETTES.neutro;
}

export function getSeasonName(undertone, skinTone) {
  if (undertone === 'calido') {
    if (skinTone === 'profundo' || skinTone === 'oscuro') return 'Otoño profundo';
    if (skinTone === 'claro') return 'Primavera cálida';
    return 'Otoño cálido';
  }
  if (undertone === 'frio') {
    if (skinTone === 'profundo' || skinTone === 'oscuro') return 'Invierno profundo';
    if (skinTone === 'claro') return 'Invierno frío';
    return 'Verano frío';
  }
  return 'Neutro suave';
}

export function colorMatch(hex, undertone = 'neutro') {
  const palette = getPalette(undertone);
  if (!hexToRgb(hex)) return 70;
  let nearest = Infinity;
  for (const color of palette.colors) {
    nearest = Math.min(nearest, distance(hex, color.hex));
  }
  let score = 100 - (nearest / 441) * 100;

  if (isNeutral(hex)) score = Math.max(score, 88);

  let avoidDistance = Infinity;
  for (const color of palette.avoid) {
    avoidDistance = Math.min(avoidDistance, distance(hex, color.hex));
  }
  if (avoidDistance < 55) score -= 18;
  else if (avoidDistance < 90) score -= 7;

  return Math.max(40, Math.min(100, Math.round(score)));
}

export function matchLabel(score) {
  if (score >= 90) return 'Impecable';
  if (score >= 80) return 'Muy favorecedor';
  if (score >= 70) return 'Favorecedor';
  if (score >= 60) return 'Aceptable';
  return 'A revisar';
}

export function readableText(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#f3ede2';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? '#161412' : '#f8f4ec';
}

function normalizeTone(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getContrast(skinTone, hairColor) {
  const skinDepth =
    {
      claro: 1,
      medio: 2,
      trigueno: 3,
      oscuro: 4,
      profundo: 5,
    }[normalizeTone(skinTone)] || 3;
  const hairDepth = {
    rubio: 1,
    castano: 2,
    'castano claro': 2,
    rojizo: 2,
    negro: 5,
    'negro azulado': 5,
    gris: 3,
    canoso: 3,
    caoba: 3,
  }[normalizeTone(hairColor)] || 3;
  const diff = Math.abs(skinDepth - hairDepth);
  if (diff >= 3) return { level: 'Alto', advice: 'Los contrastes marcados te favorecen: combina claro y oscuro en el mismo look.' };
  if (diff === 2) return { level: 'Medio', advice: 'Juega con un punto de contraste: una capa oscura sobre base clara, o al revés.' };
  return { level: 'Bajo', advice: 'Los looks monocromáticos y los degradados suaves te sientan especialmente bien.' };
}
