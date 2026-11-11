import { useEffect, useRef, useState } from 'react';

export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored != null) return JSON.parse(stored);
    } catch (error) {
      console.warn(`No se pudo leer ${key}`, error);
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });
  const [error, setError] = useState(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      setError(null);
    } catch (storageError) {
      console.warn(`No se pudo guardar ${key}`, storageError);
      setError('El almacenamiento local está lleno. Elimina fotos o prendas para seguir guardando.');
    }
  }, [key, value]);

  return [value, setValue, error];
}

export function downloadFile(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJSON(filename, data) {
  downloadFile(filename, JSON.stringify(data, null, 2), 'application/json');
}

export function uid(prefix = 'item') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function readImageFile(file, maxSize = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen válida.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      image.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const CATEGORY_WORDS = {
  tops: ['top', 'camisa', 'camiseta', 'blusa', 'sueter', 'suéter', 'sweater', 'chaqueta', 'blazer', 'abrigo', 'trench', 'hoodie', 'polera', 'polo', 'cardigan', 'jersey', 'shirt', 'jacket', 'coat'],
  bottoms: ['pantalon', 'pantalón', 'jean', 'jeans', 'short', 'falda', 'chino', 'trouser', 'pants', 'skirt', 'bermuda', 'cargo'],
  shoes: ['zapato', 'zapatilla', 'tenis', 'sneaker', 'loafer', 'mocasin', 'mocasín', 'bota', 'botin', 'botín', 'sandalia', 'chancla', 'heel', 'boot', 'shoe', 'sandal'],
  accessories: ['gafas', 'lentes', 'reloj', 'bolso', 'cartera', 'sombrero', 'gorra', 'cinturon', 'cinturón', 'bufanda', 'corbata', 'joya', 'collar', 'anillo', 'arete', 'pulsera', 'bag', 'watch', 'sunglasses', 'hat', 'belt', 'scarf'],
};

export function inferCategory(filename = '') {
  const value = filename.toLowerCase();
  for (const [category, words] of Object.entries(CATEGORY_WORDS)) {
    if (words.some((word) => value.includes(word))) return category;
  }
  return 'tops';
}

export function inferSubtype(filename = '') {
  const value = filename.toLowerCase().replace(/[-_]/g, ' ');
  const words = [
    ['Camiseta', ['camiseta', 't-shirt', 'tee']],
    ['Camisa', ['camisa', 'shirt', 'oxford']],
    ['Blazer', ['blazer']],
    ['Abrigo', ['abrigo', 'coat', 'trench']],
    ['Suéter', ['sueter', 'suéter', 'sweater', 'jersey']],
    ['Pantalón', ['pantalon', 'pantalón', 'trouser']],
    ['Jeans', ['jean', 'jeans', 'denim']],
    ['Chino', ['chino']],
    ['Sneakers', ['sneaker', 'tenis', 'zapatilla']],
    ['Loafers', ['loafer', 'mocasin', 'mocasín']],
    ['Botines', ['botin', 'botín', 'boot']],
    ['Sandalias', ['sandalia', 'sandal']],
    ['Gafas de sol', ['gafas', 'lentes', 'sunglasses']],
    ['Reloj', ['reloj', 'watch']],
    ['Bolso', ['bolso', 'bag', 'tote']],
    ['Sombrero', ['sombrero', 'hat', 'gorra']],
  ];
  const found = words.find(([, aliases]) => aliases.some((alias) => value.includes(alias)));
  return found ? found[0] : 'Prenda';
}

export function prettyFilename(filename = '') {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function isImageFile(name = '') {
  return /\.(jpe?g|png|webp|avif|gif|bmp)$/i.test(name);
}

export function extractDominantColor(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onerror = () => resolve('#8C7B6B');
    image.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, size, size);
        const { data } = context.getImageData(0, 0, size, size);
        const buckets = new Map();
        for (let index = 0; index < data.length; index += 4) {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];
          if (a < 180) continue;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const lightness = (max + min) / 2 / 255;
          const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
          if (lightness > 0.94 || lightness < 0.05) continue;
          if (saturation < 0.06 && lightness > 0.8) continue;
          const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
          const entry = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
          entry.count += 1;
          entry.r += r;
          entry.g += g;
          entry.b += b;
          buckets.set(key, entry);
        }
        if (!buckets.size) {
          resolve('#8C7B6B');
          return;
        }
        const best = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
        const r = Math.round(best.r / best.count);
        const g = Math.round(best.g / best.count);
        const b = Math.round(best.b / best.count);
        resolve(`#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`);
      } catch {
        resolve('#8C7B6B');
      }
    };
    image.src = dataUrl;
  });
}

