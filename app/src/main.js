import { arrangements, createCompositor } from './cover.js';
import { afterPaint, decodePhoto, readScene } from './shots.js';

const scene = readScene(location.search);
const { design } = scene;
const find = (selector) => document.querySelector(selector);
const field = (name) => find(`[name="${name}"]`);
const canvas = find('[data-artwork]');
const panelPicker = find('[data-panels]');
const feedback = find('[data-feedback]');
const compose = createCompositor(canvas);
const limit = (value, min, max) => Math.max(min, Math.min(max, value));
const samples = new Map();
const tiles = Array.from({ length: 4 }, () => ({
  image: null, magnification: 1, horizontal: 0, vertical: 0, revision: 0,
}));
const cropFields = ['magnification', 'horizontal', 'vertical'];
let selected = 0;
let regions = [];
let frame = null;
let photosDirty = true;
let drag = null;

function paint() {
  regions = compose(design, tiles, photosDirty);
  photosDirty = false;
}

function schedule(redevelop = true) {
  photosDirty ||= redevelop;
  if (frame !== null) return;
  frame = requestAnimationFrame(() => {
    frame = null;
    paint();
  });
}

function choosePanel(index) {
  selected = index;
  [...panelPicker.children].forEach((button, position) => {
    button.setAttribute('aria-pressed', String(position === selected));
  });
  for (const name of cropFields) field(name).value = tiles[selected][name];
}

function listPanels() {
  const count = arrangements[design.arrangement];
  const buttons = Array.from({ length: count }, (_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Panel ${index + 1}`;
    button.addEventListener('click', () => choosePanel(index));
    return button;
  });
  panelPicker.replaceChildren(...buttons);
  choosePanel(Math.min(selected, count - 1));
}

function updateReadouts() {
  find('[data-resolution]').value = design.format.replace('x', ' × ');
  find('[data-strength]').value = `${Math.round(design.strength * 100)}%`;
}

function sample(name) {
  if (!samples.has(name)) {
    const source = new URL(`../samples/${name}.jpg`, import.meta.url);
    samples.set(name, decodePhoto(source).catch((error) => {
      samples.delete(name);
      throw error;
    }));
  }
  return samples.get(name);
}

async function replacePhoto(index, load) {
  const tile = tiles[index];
  const revision = ++tile.revision;
  feedback.textContent = '';
  try {
    const image = await load();
    if (revision !== tile.revision) return;
    Object.assign(tile, { image, magnification: 1, horizontal: 0, vertical: 0 });
    if (index === selected) choosePanel(index);
    schedule();
  } catch {
    if (revision === tile.revision) feedback.textContent = 'This photo could not be opened. Choose another image.';
  }
}

function upload(index, file) {
  if (!file) return;
  replacePhoto(index, async () => {
    const url = URL.createObjectURL(file);
    try {
      return await decodePhoto(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  });
}

function panelAt(event) {
  const box = canvas.getBoundingClientRect();
  const x = (event.clientX - box.left) * canvas.width / box.width;
  const y = (event.clientY - box.top) * canvas.height / box.height;
  return regions.findIndex(([left, top, width, height]) =>
    x >= left && x <= left + width && y >= top && y <= top + height);
}

function wireCanvas() {
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    const panel = panelAt(event);
    if (panel < 0) return;
    choosePanel(panel);
    const tile = tiles[panel];
    drag = { panel, id: event.pointerId, x: event.clientX, y: event.clientY,
      horizontal: tile.horizontal, vertical: tile.vertical };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (drag?.id !== event.pointerId) return;
    const [, , width, height] = regions[drag.panel];
    const box = canvas.getBoundingClientRect();
    const tile = tiles[drag.panel];
    tile.horizontal = limit(drag.horizontal + 2 * (event.clientX - drag.x) / (width * box.width / canvas.width), -1, 1);
    tile.vertical = limit(drag.vertical + 2 * (event.clientY - drag.y) / (height * box.height / canvas.height), -1, 1);
    if (selected === drag.panel) choosePanel(drag.panel);
    schedule();
  });
  canvas.addEventListener('lostpointercapture', () => { drag = null; });
  canvas.addEventListener('wheel', (event) => {
    const panel = panelAt(event);
    if (panel < 0 || !tiles[panel].image) return;
    event.preventDefault();
    tiles[panel].magnification = limit(tiles[panel].magnification + Math.sign(-event.deltaY) * 0.08, 1, 3);
    choosePanel(panel);
    schedule();
  }, { passive: false });
  canvas.addEventListener('dragover', (event) => {
    if (event.dataTransfer.types.includes('Files')) event.preventDefault();
  });
  canvas.addEventListener('drop', (event) => {
    event.preventDefault();
    const panel = panelAt(event);
    if (panel < 0) return;
    choosePanel(panel);
    upload(panel, event.dataTransfer.files[0]);
  });
}

function wireEditor() {
  const photoSettings = ['arrangement', 'format', 'palette', 'strength', 'flatTones'];
  for (const name of Object.keys(design)) {
    const control = field(name);
    const type = control.type;
    if (type === 'checkbox') control.checked = design[name];
    else control.value = design[name];
    control.addEventListener('input', () => {
      design[name] = type === 'checkbox' ? control.checked : type === 'range' ? control.valueAsNumber : control.value;
      if (name === 'arrangement') {
        drag = null;
        listPanels();
      }
      updateReadouts();
      schedule(photoSettings.includes(name));
    });
  }

  for (const name of cropFields) {
    field(name).addEventListener('input', (event) => {
      tiles[selected][name] = event.target.valueAsNumber;
      schedule();
    });
  }
  for (const button of document.querySelectorAll('[data-sample]')) {
    button.addEventListener('click', () => replacePhoto(selected, () => sample(button.dataset.sample)));
  }
  field('upload').addEventListener('change', (event) => {
    upload(selected, event.target.files[0]);
    event.target.value = '';
  });
  find('[data-repeat]').addEventListener('click', () => {
    const { image } = tiles[selected];
    if (!image) return;
    for (const tile of tiles) {
      tile.revision++;
      tile.image = image;
    }
    schedule();
  });
  find('[data-download]').addEventListener('click', () => {
    paint();
    canvas.toBlob((blob) => {
      if (!blob) {
        feedback.textContent = 'The browser could not create a PNG.';
        return;
      }
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = 'sunset-cover.png';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
    }, 'image/png');
  });

  listPanels();
  updateReadouts();
  wireCanvas();
}

if (scene.mode === 'cover') document.body.classList.add('cover-only');

try {
  const image = await sample(scene.sample);
  const alternate = scene.mode === 'studio' ? await sample('boulevard').catch(() => image) : image;
  const views = [[1, 0, 0], [1.28, -0.62, -0.3], [1.55, 0.65, 0.28], [1.2, -0.05, 0.72]];
  tiles.forEach((tile, index) => {
    const [magnification, horizontal, vertical] = views[index];
    Object.assign(tile, { image: index % 2 ? alternate : image, magnification, horizontal, vertical });
  });
} catch {
  feedback.textContent = 'The sample photo could not be loaded. You can still upload your own.';
}

if (scene.mode !== 'cover') wireEditor();
paint();
afterPaint();
