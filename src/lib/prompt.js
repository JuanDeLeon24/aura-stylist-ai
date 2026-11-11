const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const term = (dictionary, value, fallback) => dictionary[normalize(value)] || fallback;

const SKIN = {
  claro: 'fair',
  medio: 'medium',
  trigueno: 'olive',
  oscuro: 'deep',
  profundo: 'rich deep',
};

const UNDERTONE = {
  calido: 'warm golden',
  frio: 'cool',
  neutro: 'neutral',
};

const HAIR = {
  negro: 'black',
  castano: 'chestnut brown',
  'castano claro': 'light brown',
  rubio: 'blonde',
  rojizo: 'auburn',
  caoba: 'mahogany',
  gris: 'grey',
  canoso: 'salt-and-pepper',
};

const EYES = {
  cafe: 'brown',
  miel: 'honey',
  verde: 'green',
  azul: 'blue',
  gris: 'grey',
  negro: 'black',
};

const BODY_TYPE = {
  ectomorfo: 'ectomorph',
  mesomorfo: 'mesomorph',
  endomorfo: 'endomorph',
  'atletica / neutra': 'athletic',
};

const BODY_SHAPE = {
  rectangular: 'rectangular',
  'triangulo invertido': 'inverted triangle',
  pera: 'pear',
  'reloj de arena': 'hourglass',
  ovalada: 'oval',
  trapecio: 'trapezoid',
};

const FACE_SHAPE = {
  ovalado: 'oval',
  redondo: 'round',
  cuadrado: 'square',
  corazon: 'heart-shaped',
  alargado: 'elongated',
  diamante: 'diamond',
};

const MODE = {
  fem: 'feminine',
  masc: 'masculine',
  unisex: 'gender-neutral',
};

const COLOR = {
  'gris topo': 'taupe grey',
  'blanco puro': 'pure white',
  'negro suave': 'soft black',
  denim: 'denim blue',
  crema: 'cream',
  camel: 'camel',
  carbon: 'charcoal',
  'denim claro': 'light denim',
  'rosa palo': 'dusty pink',
  oliva: 'olive',
  'cafe moka': 'mocha brown',
  taupe: 'taupe',
  dorado: 'gold',
  arena: 'sand',
  beige: 'beige',
  marfil: 'ivory',
  'azul marino': 'navy',
  negro: 'black',
  cognac: 'cognac',
  'gris acerado': 'steel grey',
};

const MATERIAL = {
  'lana fria': 'cool wool',
  lino: 'linen',
  'algodon pima': 'pima cotton',
  'chambray de algodon': 'cotton chambray',
  'punto de algodon': 'cotton knit',
  'gabardina de algodon': 'cotton gabardine',
  denim: 'denim',
  algodon: 'cotton',
  'algodon con stretch': 'stretch cotton',
  'cuero liso': 'smooth leather',
  cuero: 'leather',
  metal: 'metal',
  'acero y cuero': 'steel and leather',
  'lona y cuero': 'canvas and leather',
  'paja toquilla': 'toquilla straw',
  'lino con forro parcial': 'lined linen',
  'lyocell / seda': 'lyocell and silk',
  'gabardina tecnica': 'technical gabardine',
  'merino extrafino': 'extra-fine merino',
  lana: 'wool',
};

const SUBTYPE = {
  blazer: 'blazer',
  camisa: 'shirt',
  camiseta: 't-shirt',
  sueter: 'sweater',
  abrigo: 'coat',
  'pantalon de vestir': 'dress trousers',
  jeans: 'jeans',
  pantalon: 'trousers',
  chino: 'chinos',
  sneakers: 'sneakers',
  derby: 'derby shoes',
  sandalias: 'sandals',
  botines: 'ankle boots',
  'gafas de sol': 'sunglasses',
  reloj: 'watch',
  bolso: 'bag',
  sombrero: 'hat',
  zapatos: 'shoes',
  cinturon: 'belt',
  bufanda: 'scarf',
};

const capitalize = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

function garmentDescription(item) {
  if (!item) return '';
  const color = term(COLOR, item.colorName, String(item.colorName || '').toLowerCase());
  const material = term(MATERIAL, item.material, String(item.material || '').toLowerCase());
  const subtype = term(SUBTYPE, item.subtype, String(item.subtype || 'garment').toLowerCase());
  return `${color} ${material} ${subtype}`;
}

function profileTerms(profile) {
  return {
    skin: term(SKIN, profile.skinTone, 'medium'),
    undertone: term(UNDERTONE, profile.undertone, 'neutral'),
    hair: term(HAIR, profile.hairColor, 'natural'),
    eyes: term(EYES, profile.eyeColor, 'natural'),
    bodyType: term(BODY_TYPE, profile.bodyType, 'natural'),
    bodyShape: term(BODY_SHAPE, profile.bodyShape, 'balanced'),
    faceShape: term(FACE_SHAPE, profile.faceShape, 'oval'),
    mode: term(MODE, profile.mode, 'gender-neutral'),
  };
}

export function buildProfilePrompt(profile) {
  const t = profileTerms(profile);
  return [
    `Full-body editorial reference photograph of a ${profile.height} cm ${t.mode} person with a ${t.bodyType} ${t.bodyShape} silhouette.`,
    `${capitalize(t.skin)} skin with a ${t.undertone} undertone, ${t.hair} hair, ${t.eyes} eyes, ${t.faceShape} face shape.`,
    'Neutral standing pose, arms relaxed, natural soft daylight, plain warm-grey studio background, 85mm lens, realistic skin texture, no logos, no text.',
    'Keep the face, body proportions and identity exactly as in the reference photos.',
  ].join(' ');
}

export function buildTryOnPrompt(profile, outfit, context = {}) {
  const t = profileTerms(profile);
  const pieces = [
    outfit.top && garmentDescription(outfit.top),
    outfit.layer && `${garmentDescription(outfit.layer)} worn open`,
    outfit.bottom && garmentDescription(outfit.bottom),
    outfit.shoes && garmentDescription(outfit.shoes),
    ...(outfit.accessories || []).map((item) => garmentDescription(item)),
  ].filter(Boolean);

  const location = context.destination || 'a refined urban setting';
  const moment = context.moment || 'editorial fashion portrait';

  return [
    `Full-body editorial fashion photograph of a ${profile.height} cm ${t.mode} person with a ${t.bodyType} ${t.bodyShape} silhouette.`,
    `${capitalize(t.skin)} skin with a ${t.undertone} undertone, ${t.hair} hair, ${t.eyes} eyes, ${t.faceShape} face shape.`,
    `Wearing exactly: ${pieces.join('; ')}.`,
    `Setting: ${location}, ${moment}, natural soft daylight, 85mm lens, shallow depth of field, neutral warm color grade, realistic fabric texture.`,
    'Keep the face, body proportions and identity exactly as in the reference photos. No logos, no text, no extra accessories. Do not change the outfit or its colors.',
    'Negative prompt: distorted anatomy, extra fingers, floating garments, heavy retouching, plastic skin, neon lighting, watermark.',
  ].join(' ');
}
