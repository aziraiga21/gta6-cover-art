// Sunset Cover Studio editor: wires the controls to the cover renderer.
// Photos stay on the user's machine (object URLs); nothing is uploaded.

import { drawCover, layoutRects, panelCount } from './cover.js';
import { loadImage, runShot, SAMPLE_CROPS } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subcaptionInput = document.getElementById('subcaption');
const zoomInput = document.getElementById('zoom');
const panelNumber = document.getElementById('panelNumber');
const panelNumber2 = document.getElementById('panelNumber2');

/** Fresh empty panel slots (the renderer supports up to 4). */
function emptyPanels() {
  return [0, 1, 2, 3].map(() => ({ img: null, zoom: 1, ox: 0, oy: 0 }));
}

const state = {
  layout: 'hero2',
  size: '1920x1080',
  grade: 'sunset',
  intensity: 0.85,
  posterize: false,
  caption: 'Sunset Heist',
  subcaption: 'One last ride down the coast',
  captionPos: 'bottom',
  captionSize: 1,
  panels: emptyPanels(),
  selected: 0,
};

/** Redraws the preview; during a drag the posterize pass is skipped for speed. */
function redraw(fast = false) {
  const view = fast ? { ...state, posterize: false } : state;
  drawCover(canvas, view);
}

/** Resizes the preview canvas to the chosen export size, then redraws. */
function applySize(size) {
  const [w, h] = size.split('x').map(Number);
  if (!w || !h) return;
  state.size = size;
  canvas.width = w;
  canvas.height = h;
  redraw();
}

/** Marks the selected panel in the controls. */
function selectPanel(i) {
  const count = panelCount(state.layout);
  state.selected = Math.max(0, Math.min(count - 1, i));
  const panel = state.panels[state.selected];
  panelNumber.textContent = String(state.selected + 1);
  panelNumber2.textContent = String(state.selected + 1);
  zoomInput.value = String(panel.zoom || 1);
  redraw();
}

/** Builds panels from one photo: each panel its own crop, and when a portrait
 * photo fills a wide panel the crop favours the top of the photo (faces). */
function samplePanels(img) {
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  return SAMPLE_CROPS.map((crop, i) => {
    const rect = rects[i];
    let oy = crop.oy || 0;
    if (rect && img.naturalHeight > img.naturalWidth) {
      const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * (crop.zoom || 1);
      const overflowY = img.naturalHeight * base - rect.h;
      if (overflowY > 0) oy += Math.min(overflowY * 0.4, 320);
    }
    return { img, zoom: crop.zoom, ox: crop.ox, oy };
  });
}

/** Loads one sample photo into every panel, each with its own crop. */
async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  state.panels = samplePanels(img);
  selectPanel(0);
  status.textContent = `Sample “${name}” loaded into all panels — drag a panel to reposition it.`;
}

/** Loads a user file into a panel (or all panels when fillAll is set). */
async function loadFileIntoPanel(file, index, fillAll = false) {
  if (!file || !file.type.startsWith('image/')) return;
  const img = await loadImage(URL.createObjectURL(file));
  if (fillAll) {
    state.panels = samplePanels(img);
  } else {
    state.panels[index] = { img, zoom: 1, ox: 0, oy: 0 };
  }
  selectPanel(index);
  status.textContent = `Photo loaded${fillAll ? ' into all panels' : ` into panel ${index + 1}`}.`;
}

// --- Layout, grade and size pickers -----------------------------------------
function wirePicker(rowId, attr, apply) {
  document.getElementById(rowId).addEventListener('click', (e) => {
    const button = e.target.closest(`[data-${attr}]`);
    if (!button) return;
    for (const b of e.currentTarget.querySelectorAll('button')) b.classList.remove('picked');
    button.classList.add('picked');
    apply(button.dataset[attr]);
  });
}
wirePicker('layoutRow', 'layout', (v) => { state.layout = v; selectPanel(state.selected); });
wirePicker('gradeRow', 'grade', (v) => { state.grade = v; redraw(); });
wirePicker('sizeRow', 'size', (v) => applySize(v));

// --- Caption controls --------------------------------------------------------
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subcaptionInput.addEventListener('input', () => { state.subcaption = subcaptionInput.value; redraw(); });
document.getElementById('capBottom').addEventListener('click', (e) => {
  state.captionPos = 'bottom';
  e.currentTarget.classList.add('picked');
  document.getElementById('capTop').classList.remove('picked');
  redraw();
});
document.getElementById('capTop').addEventListener('click', (e) => {
  state.captionPos = 'top';
  e.currentTarget.classList.add('picked');
  document.getElementById('capBottom').classList.remove('picked');
  redraw();
});
document.getElementById('captionSize').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value);
  redraw();
});
document.getElementById('intensity').addEventListener('input', (e) => {
  state.intensity = Number(e.target.value);
  redraw();
});
document.getElementById('posterize').addEventListener('change', (e) => {
  state.posterize = e.target.checked;
  redraw();
});

// --- Photo controls ----------------------------------------------------------
document.getElementById('photoFile').addEventListener('change', async (e) => {
  await loadFileIntoPanel(e.target.files[0], state.selected);
  e.target.value = '';
});
document.getElementById('samplePier').addEventListener('click', () => loadSample('pier'));
document.getElementById('sampleBoulevard').addEventListener('click', () => loadSample('boulevard'));
document.getElementById('fillAll').addEventListener('click', async () => {
  const panel = state.panels[state.selected];
  if (!panel.img) { status.textContent = 'Load a photo into the selected panel first.'; return; }
  state.panels = samplePanels(panel.img);
  redraw();
  status.textContent = 'Same photo now fills all panels, each with its own crop.';
});
document.getElementById('resetCrop').addEventListener('click', () => {
  state.panels[state.selected] = { ...state.panels[state.selected], zoom: 1, ox: 0, oy: 0 };
  zoomInput.value = '1';
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomInput.value);
  redraw();
});

// --- Canvas interaction: click to select, drag to pan, wheel to zoom --------
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}
function panelAt(point) {
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  return rects.findIndex((r) => point.x >= r.x && point.x < r.x + r.w && point.y >= r.y && point.y < r.y + r.h);
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(canvasPoint(e));
  if (i < 0) return;
  selectPanel(i);
  drag = { x: e.clientX, y: e.clientY, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const dx = (e.clientX - drag.x) * sx;
  const dy = (e.clientY - drag.y) * sy;
  if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
  const panel = state.panels[state.selected];
  panel.ox = (panel.ox || 0) + dx;
  panel.oy = (panel.oy || 0) + dy;
  drag.x = e.clientX;
  drag.y = e.clientY;
  redraw(true);
});
canvas.addEventListener('pointerup', () => { drag = null; redraw(); });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  panel.zoom = Math.max(1, Math.min(3, (panel.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.93)));
  zoomInput.value = String(panel.zoom);
  redraw();
}, { passive: false });

// Drag-and-drop a photo file straight onto a panel.
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  const i = panelAt(canvasPoint(e));
  if (i < 0) return;
  await loadFileIntoPanel(e.dataTransfer.files[0], i);
});

// --- Export ------------------------------------------------------------------
document.getElementById('export').addEventListener('click', () => {
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sunset-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved sunset-cover-${state.size}.png (${state.size.replace('x', ' × ')}).`;
  }, 'image/png');
});

/** Syncs the picked buttons with the current state (used by ?shot= scenes). */
function syncPickers() {
  const mark = (rowId, attr, value) => {
    for (const b of document.getElementById(rowId).querySelectorAll('button')) {
      b.classList.toggle('picked', b.dataset[attr] === value);
    }
  };
  mark('layoutRow', 'layout', state.layout);
  mark('gradeRow', 'grade', state.grade);
  mark('sizeRow', 'size', state.size);
  document.getElementById('capBottom').classList.toggle('picked', state.captionPos === 'bottom');
  document.getElementById('capTop').classList.toggle('picked', state.captionPos === 'top');
}

// --- Screenshot scenes -------------------------------------------------------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async (img, q) => {
    if (q.get('size')) applySize(q.get('size'));
    if (q.get('layout')) state.layout = q.get('layout');
    if (q.get('grade')) state.grade = q.get('grade');
    if (q.get('intensity')) state.intensity = Number(q.get('intensity'));
    if (q.get('posterize') === '1') state.posterize = true;
    if (q.get('captionPos')) state.captionPos = q.get('captionPos');
    if (q.get('caption') !== null) { state.caption = q.get('caption'); captionInput.value = state.caption; }
    if (q.get('subcaption') !== null) { state.subcaption = q.get('subcaption'); subcaptionInput.value = state.subcaption; }
    state.panels = samplePanels(img);
    syncPickers();
    selectPanel(0);
  });
} else {
  redraw();
  if (document.fonts?.ready) document.fonts.ready.then(() => redraw());
}
