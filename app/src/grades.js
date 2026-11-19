// Colour grade presets for the cover: each grade is a stack of full-canvas
// gradient washes drawn with a blend mode, scaled by the strength slider.
// All colours are drawn in code — no image assets, no network.

/** Grade definitions: name, and layers of {stops, mode, alpha}. Stops are [offset, colour]. */
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    layers: [
      { mode: 'overlay', alpha: 1, stops: [[0, 'rgba(255,122,24,0.55)'], [0.55, 'rgba(255,80,120,0.35)'], [1, 'rgba(123,47,247,0.55)']] },
      { mode: 'soft-light', alpha: 1, stops: [[0, 'rgba(255,200,80,0.5)'], [1, 'rgba(40,10,90,0.5)']] },
      { mode: 'source-over', alpha: 1, stops: [[0, 'rgba(255,122,24,0)'], [0.7, 'rgba(198,43,110,0.18)'], [1, 'rgba(30,8,60,0.32)']] },
    ],
  },
  neon: {
    label: 'Neon Nights',
    layers: [
      { mode: 'overlay', alpha: 1, stops: [[0, 'rgba(0,229,255,0.6)'], [0.5, 'rgba(255,0,170,0.35)'], [1, 'rgba(123,47,247,0.6)']] },
      { mode: 'screen', alpha: 1, stops: [[0, 'rgba(0,180,255,0.22)'], [1, 'rgba(255,0,200,0.22)']] },
      { mode: 'source-over', alpha: 1, stops: [[0, 'rgba(0,20,40,0.10)'], [1, 'rgba(10,0,40,0.34)']] },
    ],
  },
  noir: {
    label: 'Palm Noir',
    layers: [
      { mode: 'overlay', alpha: 1, stops: [[0, 'rgba(0,180,170,0.5)'], [0.6, 'rgba(0,90,110,0.35)'], [1, 'rgba(5,10,30,0.6)']] },
      { mode: 'multiply', alpha: 1, stops: [[0, 'rgba(20,60,70,0.35)'], [1, 'rgba(0,0,0,0.45)']] },
      { mode: 'source-over', alpha: 1, stops: [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,5,15,0.4)']] },
    ],
  },
  daylight: {
    label: 'Daylight',
    layers: [
      { mode: 'soft-light', alpha: 1, stops: [[0, 'rgba(255,220,150,0.35)'], [1, 'rgba(80,140,255,0.25)']] },
      { mode: 'source-over', alpha: 1, stops: [[0, 'rgba(255,255,255,0.06)'], [1, 'rgba(0,0,0,0.08)']] },
    ],
  },
};

/** Paints a grade over the whole canvas at the given strength (0..1). */
export function applyGrade(ctx, w, h, gradeId, strength) {
  const grade = GRADES[gradeId] ?? GRADES.sunset;
  for (const layer of grade.layers) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    for (const [offset, colour] of layer.stops) g.addColorStop(offset, colour);
    ctx.save();
    ctx.globalCompositeOperation = layer.mode;
    ctx.globalAlpha = strength * layer.alpha;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  // Vignette: darkens the corners so the caption lettering pops.
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(10,0,25,${0.35 * strength})`);
  ctx.save();
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Flattens the canvas pixels into a comic-poster look: few flat colour levels. */
export function posterizeCanvas(ctx, w, h, levels = 5) {
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / step) * step;
    d[i + 1] = Math.round(d[i + 1] / step) * step;
    d[i + 2] = Math.round(d[i + 2] / step) * step;
  }
  ctx.putImageData(image, 0, 0);
}
