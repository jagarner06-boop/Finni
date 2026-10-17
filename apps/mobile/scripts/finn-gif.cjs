#!/usr/bin/env node
// Builds Finn reaction GIFs from numbered PNG frames.
//
//   npm run finn:gif -- celebrating            # assets/finn/reactions/celebrating/*.png → celebrating.gif
//   npm run finn:gif -- celebrating --fps 15   # default 12 fps
//   npm run finn:gif -- --all                  # every frame folder in assets/finn/reactions/
//
// Frames are sorted by name (001.png, 002.png, …), cut out (transparent background, see
// finn-cutout.cjs), and encoded with 1-bit transparency. Prints the durationMs to put in
// src/components/finn/reactions.ts.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const { cutout } = require('./finn-cutout.cjs');

const DIR = path.join(__dirname, '..', 'assets', 'finn', 'reactions');
const ALPHA_CUTOFF = 128; // GIF transparency is on/off: pixels below this alpha become transparent

function build(name, fps) {
  const folder = path.join(DIR, name);
  const frames = fs.readdirSync(folder).filter((f) => f.endsWith('.png')).sort();
  if (frames.length === 0) throw new Error(`No .png frames in ${folder}`);

  const gif = GIFEncoder();
  const delay = Math.round(1000 / fps);
  for (const f of frames) {
    const png = cutout(PNG.sync.read(fs.readFileSync(path.join(folder, f))));
    const rgba = new Uint8Array(png.data);
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = rgba[i] < ALPHA_CUTOFF ? 0 : 255;
    const palette = quantize(rgba, 256, { format: 'rgba4444', oneBitAlpha: true, clearAlpha: true, clearAlphaThreshold: ALPHA_CUTOFF });
    const index = applyPalette(rgba, palette, 'rgba4444');
    const transparentIndex = palette.findIndex((c) => c[3] === 0);
    gif.writeFrame(index, png.width, png.height, { palette, delay, transparent: transparentIndex >= 0, transparentIndex: Math.max(0, transparentIndex), dispose: 2 });
  }
  gif.finish();

  const dest = path.join(DIR, `${name}.gif`);
  fs.writeFileSync(dest, gif.bytes());
  const durationMs = frames.length * delay;
  console.log(`${name}.gif: ${frames.length} frames @ ${fps}fps, ${(gif.bytes().length / 1024).toFixed(0)}KB → durationMs: ${durationMs}`);
}

const args = process.argv.slice(2);
const fpsIdx = args.indexOf('--fps');
const fps = fpsIdx >= 0 ? Number(args[fpsIdx + 1]) : 12;
const names = args.includes('--all')
  ? fs.readdirSync(DIR).filter((f) => fs.statSync(path.join(DIR, f)).isDirectory())
  : args.filter((a, i) => !a.startsWith('--') && (fpsIdx < 0 || i !== fpsIdx + 1));
if (names.length === 0) {
  console.error('Usage: finn-gif <mood ...> [--fps 12] | --all');
  process.exit(1);
}
for (const name of names) build(name, fps);
