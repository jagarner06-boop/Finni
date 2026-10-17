#!/usr/bin/env node
// Makes Finn art transparent: removes the flat light background around him, keeps his cream belly.
//
//   npm run finn:cutout -- assets/finn/3d            # every .png in a folder, in place
//   npm run finn:cutout -- a.png b.png --out tmp/    # specific files, written elsewhere
//   npm run finn:cutout -- assets/finn/plush-*.png --no-pockets   # lit 3D renders (see below)
//
// How: flood fill from the image border through "background" pixels only — close to the border's
// colour AND not warmer than it (the belly is the same brightness but warmer, r−b ≈ 15–20 vs ≈ 8,
// and sometimes touches the background with no outline). The fill only travels through 5px-wide
// gaps so it can't leak through hairline breaks in the outline, then cool background pockets
// (e.g. between a flipper and the tail) are cleared too. Edges get a soft alpha ramp.
// --no-pockets skips that last step: on lit 3D renders the face highlights are as cool and pale as
// the background, so they'd be cleared as "pockets" and leave holes in Finn's face.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const HARD = 14; // distance from the background colour that is fully transparent
const SOFT = 46; // distance where pixels become fully opaque
const R = 2; // gap rule radius (fill passes only through (2R+1)px-wide background)
const POCKET = 60; // enclosed background patches at least this big are cleared (eye shines are smaller)

/** Returns a new RGBA PNG with the background made transparent. */
function cutout(src, { pockets = true } = {}) {
  const { width: w, height: h, data } = src;
  const out = new PNG({ width: w, height: h });
  data.copy(out.data);

  const border = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  const median = (c) => border.map((p) => data[p * 4 + c]).sort((a, b) => a - b)[border.length >> 1];
  const bg = [median(0), median(1), median(2)];
  const dist = (p) => Math.hypot(data[p * 4] - bg[0], data[p * 4 + 1] - bg[1], data[p * 4 + 2] - bg[2]);
  const bgWarm = bg[0] - bg[2];

  const bgLike = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) bgLike[p] = data[p * 4 + 3] > 0 && dist(p) < SOFT && data[p * 4] - data[p * 4 + 2] <= bgWarm + 4 ? 1 : 0;
  const bgAt = (x, y) => x < 0 || y < 0 || x >= w || y >= h || bgLike[y * w + x] === 1;

  const open = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let ok = 1;
      for (let dy = -R; dy <= R && ok; dy++) for (let dx = -R; dx <= R; dx++) if (!bgAt(x + dx, y + dy)) { ok = 0; break; }
      open[y * w + x] = ok;
    }

  const neighbours = (p) => {
    const x = p % w;
    const y = (p / w) | 0;
    return [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
  };

  // Flood from the border, then clear large enclosed pockets.
  const filled = new Uint8Array(w * h);
  const stack = border.filter((p) => open[p]);
  for (const p of stack) filled[p] = 1;
  while (stack.length) for (const q of neighbours(stack.pop())) if (q >= 0 && !filled[q] && open[q]) { filled[q] = 1; stack.push(q); }

  const seen = new Uint8Array(w * h);
  for (let s = 0; pockets && s < w * h; s++) {
    if (!open[s] || filled[s] || seen[s]) continue;
    const members = [s];
    seen[s] = 1;
    for (let k = 0; k < members.length; k++) for (const q of neighbours(members[k])) if (q >= 0 && open[q] && !filled[q] && !seen[q]) { seen[q] = 1; members.push(q); }
    if (members.length >= POCKET) for (const p of members) filled[p] = 1;
  }

  // Grow back into the outline's anti-aliasing and ramp alpha.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!bgLike[p]) continue;
      let near = filled[p];
      for (let dy = -R - 1; dy <= R + 1 && !near; dy++)
        for (let dx = -R - 1; dx <= R + 1; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy >= 0 && yy < h && xx >= 0 && xx < w && filled[yy * w + xx]) { near = 1; break; }
        }
      if (!near) continue;
      const d = dist(p);
      out.data[p * 4 + 3] = Math.min(data[p * 4 + 3], d <= HARD ? 0 : Math.round(((d - HARD) / (SOFT - HARD)) * 255));
    }
  return out;
}

module.exports = { cutout };

if (require.main === module) {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outDir = outIdx >= 0 ? args[outIdx + 1] : null;
  const pockets = !args.includes('--no-pockets');
  const inputs = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));
  const files = inputs.flatMap((p) => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter((f) => f.endsWith('.png')).map((f) => path.join(p, f)) : [p]));
  if (files.length === 0) {
    console.error('Usage: finn-cutout <folder | file.png ...> [--out <dir>]');
    process.exit(1);
  }
  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  for (const file of files) {
    const result = cutout(PNG.sync.read(fs.readFileSync(file)), { pockets });
    const dest = outDir ? path.join(outDir, path.basename(file)) : file;
    fs.writeFileSync(dest, PNG.sync.write(result, { colorType: 6 }));
    console.log(`cut out ${path.relative(process.cwd(), dest)}`);
  }
}
