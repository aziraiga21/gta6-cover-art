import { developPixels } from './grades.js';

export const formats = ['1920x1080', '1080x1350', '1080x1080'];
export const arrangements = { hero2: 3, hero3: 4, grid: 4 };

export function measurePanels(width, height, layout) {
  const shortSide = Math.min(width, height);
  const gutter = Math.round(shortSide * 0.014);
  const innerWidth = width - gutter * 2;
  const innerHeight = height - gutter * 2;
  const across = width >= height;
  const regions = [];

  if (layout === 'grid') {
    const cellWidth = (innerWidth - gutter) / 2;
    const cellHeight = (innerHeight - gutter) / 2;
    for (let index = 0; index < 4; index++) {
      regions.push([gutter + index % 2 * (cellWidth + gutter),
        gutter + Math.floor(index / 2) * (cellHeight + gutter), cellWidth, cellHeight]);
    }
    return regions;
  }

  const mainSpan = Math.round((across ? innerWidth : innerHeight) * 0.64);
  const count = arrangements[layout] - 1;
  const stripWidth = across ? innerWidth - mainSpan - gutter : innerWidth;
  const stripHeight = across ? innerHeight : innerHeight - mainSpan - gutter;
  const tileWidth = across ? stripWidth : (stripWidth - gutter * (count - 1)) / count;
  const tileHeight = across ? (stripHeight - gutter * (count - 1)) / count : stripHeight;

  regions.push([gutter, gutter, across ? mainSpan : innerWidth, across ? innerHeight : mainSpan]);
  for (let index = 0; index < count; index++) {
    regions.push(across
      ? [mainSpan + gutter * 2, gutter + index * (tileHeight + gutter), tileWidth, tileHeight]
      : [gutter + index * (tileWidth + gutter), mainSpan + gutter * 2, tileWidth, tileHeight]);
  }
  return regions;
}

function setPhoto(context, [x, y, width, height], { image, magnification, horizontal, vertical }) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * magnification;
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const left = (image.naturalWidth - cropWidth) * (1 - horizontal) / 2;
  const top = (image.naturalHeight - cropHeight) * (1 - vertical) / 2;
  context.drawImage(image, left, top, cropWidth, cropHeight, x, y, width, height);
}

function letterPoster(context, width, height, design) {
  const headline = design.headline.trim().toUpperCase();
  const tagline = design.tagline.trim().toUpperCase();
  if (!headline && !tagline) return;

  const unit = Math.min(width, height);
  const mainSize = unit * 0.147 * design.letterScale;
  const subSize = unit * 0.036 * design.letterScale;
  const atTop = design.placement === 'top';
  const edge = height * 0.068;
  const gap = headline && tagline ? unit * 0.018 : 0;
  const textHeight = (headline ? mainSize : 0) + gap + (tagline ? subSize : 0);
  const origin = atTop ? edge : height - edge - textHeight;
  const fade = context.createLinearGradient(0, atTop ? 0 : height, 0,
    atTop ? origin + textHeight + edge : origin - edge);
  fade.addColorStop(0, '#170d20dc');
  fade.addColorStop(1, '#170d2000');
  context.fillStyle = fade;
  context.fillRect(0, atTop ? 0 : origin - edge, width, origin < edge ? edge + textHeight + edge : height - origin + edge);

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.strokeStyle = '#1c1021';

  if (headline) {
    const y = origin + mainSize / 2;
    const ink = context.createLinearGradient(0, origin, 0, origin + mainSize);
    ink.addColorStop(0, '#fff7d9');
    ink.addColorStop(0.5, '#ffdb9c');
    ink.addColorStop(1, '#ff927b');
    context.font = `900 ${mainSize}px Impact, Haettenschweiler, "Arial Narrow", system-ui, sans-serif`;
    context.lineWidth = mainSize * 0.11;
    context.strokeText(headline, width / 2, y + mainSize * 0.035, width * 0.87);
    context.fillStyle = ink;
    context.fillText(headline, width / 2, y, width * 0.87);
  }

  if (tagline) {
    const y = origin + (headline ? mainSize : 0) + gap + subSize / 2;
    context.font = `800 ${subSize}px "Arial Narrow", system-ui, sans-serif`;
    context.lineWidth = subSize * 0.18;
    context.strokeText(tagline, width / 2, y, width * 0.82);
    context.fillStyle = '#fff2e4';
    context.fillText(tagline, width / 2, y, width * 0.82);
  }
}

export function createCompositor(canvas) {
  const layer = document.createElement('canvas');
  const backdrop = layer.getContext('2d', { alpha: false, willReadFrequently: true });
  const output = canvas.getContext('2d', { alpha: false });

  return (design, tiles, repaintPhotos) => {
    const [width, height] = design.format.split('x').map(Number);
    const regions = measurePanels(width, height, design.arrangement);
    if (layer.width !== width || layer.height !== height) {
      layer.width = canvas.width = width;
      layer.height = canvas.height = height;
      canvas.style.setProperty('--ratio', width / height);
      repaintPhotos = true;
    }
    if (repaintPhotos) {
      backdrop.fillStyle = '#25192e';
      backdrop.fillRect(0, 0, width, height);
      regions.forEach((region, index) => {
        if (tiles[index].image) setPhoto(backdrop, region, tiles[index]);
      });
      developPixels(backdrop, width, height, design.palette, design.strength, design.flatTones);
      backdrop.fillStyle = '#1c1220';
      const gutter = Math.round(Math.min(width, height) * 0.014);
      backdrop.beginPath();
      backdrop.rect(0, 0, width, height);
      regions.forEach(([x, y, w, h]) => backdrop.rect(x, y, w, h));
      backdrop.fill('evenodd');
      backdrop.strokeStyle = '#efa987';
      backdrop.lineWidth = gutter * 0.14;
      regions.forEach((region) => backdrop.strokeRect(...region));
    }
    output.drawImage(layer, 0, 0);
    letterPoster(output, width, height, design);
    return regions;
  };
}
