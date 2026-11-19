// The cover renderer: multi-panel layouts, per-panel photo crop/pan/zoom,
// colour grade, posterize pass, and the big outlined caption.
// Layouts are fractions of the canvas, so one layout adapts to every export size.

import { applyGrade, posterizeCanvas } from './grades.js';

/** Panel layouts: each returns rects [x, y, w, h] as fractions of the canvas. */
export const LAYOUTS = {
  hero2: (w, h, g) => [
    [0, 0, 0.62 - g / 2, 1],
    [0.62 + g / 2, 0, 0.38 - g / 2, 0.5 - g / 2],
    [0.62 + g / 2, 0.5 + g / 2, 0.38 - g / 2, 0.5 - g / 2],
  ],
  hero3: (w, h, g) => [
    [0, 0, 1, 0.62 - g / 2],
    [0, 0.62 + g / 2, 1 / 3 - g * 2 / 3, 0.38 - g / 2],
    [1 / 3 + g / 3, 0.62 + g / 2, 1 / 3 - g * 2 / 3, 0.38 - g / 2],
    [2 / 3 + g * 2 / 3, 0.62 + g / 2, 1 / 3 - g * 2 / 3, 0.38 - g / 2],
  ],
  grid: (w, h, g) => [
    [0, 0, 0.5 - g / 2, 0.5 - g / 2],
    [0.5 + g / 2, 0, 0.5 - g / 2, 0.5 - g / 2],
    [0, 0.5 + g / 2, 0.5 - g / 2, 0.5 - g / 2],
    [0.5 + g / 2, 0.5 + g / 2, 0.5 - g / 2, 0.5 - g / 2],
  ],
};

/** How many panels a layout shows. */
export function panelCount(layoutId) {
  return (LAYOUTS[layoutId] ?? LAYOUTS.hero2)(1, 1, 0).length;
}

/** Pixel rects for a layout on a canvas of w x h. */
export function layoutRects(layoutId, w, h) {
  const g = 0.012; // gutter as a fraction of the canvas
  const fn = LAYOUTS[layoutId] ?? LAYOUTS.hero2;
  return fn(w, h, g).map(([fx, fy, fw, fh]) => ({
    x: Math.round(fx * w), y: Math.round(fy * h),
    w: Math.round(fw * w), h: Math.round(fh * h),
  }));
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan. */
export function drawPanelPhoto(ctx, rect, panel) {
  const img = panel.img;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img) {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, '#3a1548');
    grad.addColorStop(1, '#1a0b2e');
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `600 ${Math.max(14, rect.w * 0.045)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DROP A PHOTO HERE', rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
    return;
  }
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * (panel.zoom || 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + (panel.ox || 0);
  const cy = rect.y + rect.h / 2 + (panel.oy || 0);
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** Draws the caption block: big Anton capitals with outline + shadow, plus sub-caption. */
export function drawCaption(ctx, w, h, caption, subcaption, position, sizeFactor) {
  const text = (caption || '').trim().toUpperCase();
  if (!text) return;
  const base = Math.min(w, h) * 0.115 * (sizeFactor || 1);
  let size = base;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = (s) => { ctx.font = `${s}px Anton, sans-serif`; };
  setFont(size);
  try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas: no letter spacing */ }
  while (ctx.measureText(text).width > w * 0.92 && size > 14) {
    size -= 2;
    setFont(size);
  }
  const subSize = Math.max(16, size * 0.30);
  const bottom = position !== 'top';
  const mainY = bottom ? h - h * 0.055 : h * 0.055 + size * 0.9;
  const subY = bottom ? mainY - size - subSize * 0.55 : mainY + subSize * 1.15;
  const bandH = size + subSize * 1.6;
  const bandY = bottom ? h - bandH - h * 0.02 : h * 0.02;
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  band.addColorStop(0, 'rgba(10,0,25,0)');
  band.addColorStop(0.5, 'rgba(10,0,25,0.45)');
  band.addColorStop(1, 'rgba(10,0,25,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160826';
  ctx.lineWidth = Math.max(3, size * 0.14);
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(text, w / 2, mainY);
  const grad = ctx.createLinearGradient(0, mainY - size, 0, mainY);
  grad.addColorStop(0, '#fff7d6');
  grad.addColorStop(0.55, '#ffffff');
  grad.addColorStop(1, '#ffb347');
  ctx.fillStyle = grad;
  ctx.fillText(text, w / 2, mainY);
  ctx.restore();

  const sub = (subcaption || '').trim();
  if (sub) {
    ctx.save();
    ctx.font = `600 ${subSize}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.18)}px`; } catch { /* no letter spacing */ }
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = subSize * 0.4;
    ctx.fillText(sub.toUpperCase(), w / 2, subY);
    ctx.restore();
  }
  try { ctx.letterSpacing = '0px'; } catch { /* no letter spacing */ }
}

/**
 * Draws the whole cover onto a canvas.
 * state: { layout, grade, intensity, posterize, caption, subcaption, captionPos, captionSize, panels }
 * panels: [{ img, zoom, ox, oy }] — one entry per panel slot, extras ignored.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#14091f';
  ctx.fillRect(0, 0, w, h);
  const rects = layoutRects(state.layout, w, h);
  rects.forEach((rect, i) => drawPanelPhoto(ctx, rect, state.panels[i] || { img: null, zoom: 1, ox: 0, oy: 0 }));
  applyGrade(ctx, w, h, state.grade, state.intensity ?? 0.85);
  if (state.posterize) posterizeCanvas(ctx, w, h, 6);
  // Thin frame so the cover reads as a finished poster at any size.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  drawCaption(ctx, w, h, state.caption, state.subcaption, state.captionPos, state.captionSize);
}
