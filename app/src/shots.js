// Deterministic screenshot scenes: ?shot=cover renders a cover full-bleed,
// ?shot=editor renders the editor with a sample photo loaded.
// Query params: photo (pier|boulevard), caption, subcaption, size, layout, grade,
// intensity, posterize, captionPos. Sets window.__shotReady once painted.

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Varied crops so shared-photo panels do not all show the same crop. */
export const SAMPLE_CROPS = [
  { zoom: 1, ox: 0, oy: -40 },
  { zoom: 1.35, ox: -40, oy: 30 },
  { zoom: 1.5, ox: 60, oy: -20 },
  { zoom: 1.2, ox: 0, oy: 50 },
];

/**
 * Runs a shot scene. `setup` receives the loaded sample image and the parsed
 * query, and returns a promise that resolves after the scene is painted.
 */
export async function runShot(shot, query, setup) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photoName = query.get('photo') ?? 'pier';
  const img = await loadImage(`samples/${photoName}.jpg`);
  await setup(img, query);
  try { await document.fonts.load('100px Anton'); } catch { /* font already there */ }
  await setup(img, query);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
