import { arrangements, formats } from './cover.js';
import { paletteNames } from './grades.js';

export const sampleFiles = ['pier', 'boulevard'];

export async function decodePhoto(source) {
  const picture = new Image();
  picture.src = source;
  await picture.decode();
  return picture;
}

export function readScene(search) {
  const query = new URLSearchParams(search);
  const choice = (key, options, fallback) => {
    const candidate = query.get(key);
    return options.includes(candidate) ? candidate : fallback;
  };
  const intensity = query.get('intensity');
  const amount = intensity?.trim() ? Number(intensity) : NaN;

  return {
    mode: choice('shot', ['cover', 'editor'], 'studio'),
    sample: choice('photo', sampleFiles, 'pier'),
    design: {
      arrangement: choice('layout', Object.keys(arrangements), 'hero2'),
      format: choice('size', formats, '1920x1080'),
      palette: choice('grade', paletteNames, 'sunset'),
      placement: choice('captionPos', ['top', 'bottom'], 'bottom'),
      strength: Number.isFinite(amount) ? Math.min(1, Math.max(0, amount)) : 0.85,
      flatTones: ['1', 'true'].includes(query.get('posterize')),
      headline: query.get('caption') ?? 'Sunset Heist',
      tagline: query.get('subcaption') ?? 'One last ride down the coast',
      letterScale: 1,
    },
  };
}

export function afterPaint() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
