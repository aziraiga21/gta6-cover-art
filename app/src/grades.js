const recipes = {
  sunset: { low: [40, 17, 63], mid: [210, 64, 107], high: [255, 221, 151], color: 0.47, contrast: 1.12 },
  neon: { low: [16, 13, 53], mid: [176, 46, 232], high: [137, 255, 248], color: 0.48, contrast: 1.3 },
  noir: { low: [12, 12, 17], mid: [116, 119, 130], high: [254, 249, 236], color: 0, contrast: 1.28 },
  vice: { low: [8, 35, 65], mid: [47, 183, 174], high: [255, 199, 217], color: 0.54, contrast: 1.06 },
};

export const paletteNames = Object.keys(recipes);
const clamp = (value) => Math.max(0, Math.min(255, value));

export function developPixels(context, width, height, palette, amount, posterize) {
  if (!amount && !posterize) return;
  const { low, mid, high, color, contrast } = recipes[palette];
  const map = Array.from({ length: 256 }, (_, light) => {
    const tone = clamp((light - 128) * contrast + 128);
    const start = tone < 128 ? low : mid;
    const end = tone < 128 ? mid : high;
    const weight = tone < 128 ? tone / 128 : (tone - 128) / 127;
    return start.map((channel, index) => channel + (end[index] - channel) * weight);
  });

  const pixels = context.getImageData(0, 0, width, height);
  const bytes = pixels.data;
  for (let offset = 0; offset < bytes.length; offset += 4) {
    const light = (bytes[offset] * 0.2126 + bytes[offset + 1] * 0.7152 + bytes[offset + 2] * 0.0722) | 0;
    const tint = map[light];
    for (let channel = 0; channel < 3; channel++) {
      const input = bytes[offset + channel];
      const graded = clamp(tint[channel] + (input - light) * color);
      const blended = input + (graded - input) * amount;
      bytes[offset + channel] = posterize ? Math.round(blended / 36.43) * 36.43 : blended;
    }
  }
  context.putImageData(pixels, 0, 0);
}
