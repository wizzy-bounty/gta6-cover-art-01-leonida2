// LEONIDA GRID — your photos, posted from Leonida.
// A GTA-style cover-art maker wrapped in a Leonida postcard: drop in up to
// six photos and they land in a multi-panel comic grid inside a perforated
// postcard frame, under a grade stamp and a LEONIDA postmark. Four drawn
// Leonida scenes fill the grid until your own photos replace them, panel by
// panel. Everything runs locally in the browser; photos never leave the
// machine.

'use strict';

/* ------------------------------------------------------------------ data */

const LAYOUTS = [
  { id: 'hero-left', label: 'Hero Left' },
  { id: 'hero-top', label: 'Hero Top' },
  { id: 'twin', label: 'Twin Strip' },
  { id: 'quad', label: 'Quad' },
  { id: 'six', label: 'Six-Up' },
  { id: 'classic', label: 'Classic Cover' },
];

// The five postcard grades. Each tints the card's paper and frame, restyles
// the corner stamp (ink + denomination) and grades the photos with its own
// gradient-map ramp; the flavour line is printed on the card and echoed in
// the controls panel.
const GRADES = [
  { id: 'bronze', label: 'Bronze', ramp: 'bronze', paper: '#f2dfc2', paperEdge: '#d9ba8a', stampInk: '#a05a2c', denom: '25¢', flavour: 'Third-class postage, first-class trouble.' },
  { id: 'silver', label: 'Silver', ramp: 'mono', paper: '#eceeed', paperEdge: '#b9c0c4', stampInk: '#5a6a7a', denom: '50¢', flavour: 'Moonlight rates apply after dark.' },
  { id: 'gold', label: 'Gold', ramp: 'gold', paper: '#fdf0cd', paperEdge: '#e3c169', stampInk: '#b8860b', denom: '75¢', flavour: 'Gilded edges, guilty pleasures.' },
  { id: 'platinum', label: 'Platinum', ramp: 'ice', paper: '#e7f3f5', paperEdge: '#a9cdd6', stampInk: '#3d7e99', denom: '$1', flavour: 'Cold metal, colder hearts.' },
  { id: 'legend', label: 'Leonida Legend', ramp: 'sunset', paper: '#ffe9d2', paperEdge: '#eda56f', stampInk: '#d8115f', denom: '$5', flavour: 'The one they write songs about.' },
];

// Gradient-map ramps: luminance stop -> [r, g, b].
const RAMPS = {
  sunset: [[0, [26, 8, 44]], [0.25, [96, 30, 86]], [0.5, [216, 84, 44]], [0.75, [246, 152, 64]], [1, [255, 226, 170]]],
  gold: [[0, [30, 16, 4]], [0.35, [112, 62, 12]], [0.65, [219, 156, 38]], [1, [255, 244, 198]]],
  mono: [[0, [8, 8, 10]], [0.5, [130, 126, 122]], [1, [252, 248, 240]]],
  bronze: [[0, [24, 12, 6]], [0.35, [110, 58, 22]], [0.65, [198, 122, 52]], [1, [255, 232, 196]]],
  ice: [[0, [6, 22, 34]], [0.35, [38, 92, 116]], [0.65, [120, 186, 204]], [1, [238, 252, 255]]],
};

const TREATMENTS = [
  { id: 'classic', label: 'Classic' },
  { id: 'neon', label: 'Neon' },
  { id: 'newsprint', label: 'Newsprint' },
];

const SIZES = [
  { id: 'wide', label: '1920 x 1080', w: 1920, h: 1080 },
  { id: 'story', label: '1080 x 1350', w: 1080, h: 1350 },
  { id: 'square', label: '1080 x 1080', w: 1080, h: 1080 },
];

const TITLE_PRESETS = ['LEONIDA GRID', 'NEON SHORE', 'PALM HOUR', 'NIGHT SHIFT', 'VICE MAIL'];

const SCENE_NAMES = ['Sunset Bay', 'Palm Strip', 'Neon Harbor', 'Causeway at Dusk'];

function gradeOf(id) {
  return GRADES.find((g) => g.id === id) || GRADES[GRADES.length - 1];
}

// Each panel starts on a drawn demo scene (cycling through the four) with a
// varied focal framing, so repeated scenes never look like copy-paste.
function defaultPanels() {
  const focals = [
    { x: 0.50, y: 1.45, zoom: 1.05 },
    { x: 0.36, y: 1.20, zoom: 1.12 },
    { x: 0.62, y: 1.55, zoom: 1.05 },
    { x: 0.44, y: 1.15, zoom: 1.18 },
    { x: 0.55, y: 1.40, zoom: 1.08 },
    { x: 0.30, y: 1.30, zoom: 1.05 },
    { x: 0.66, y: 1.25, zoom: 1.14 },
    { x: 0.48, y: 1.50, zoom: 1.05 },
    { x: 0.58, y: 1.18, zoom: 1.10 },
  ];
  return focals.map((f, i) => ({ src: { kind: 'demo', scene: i % 4 }, ...f }));
}

const state = {
  layout: 'hero-left',
  grade: 'legend',
  treatment: 'classic',
  caption: 'LEONIDA GRID',
  subtitle: 'wish you were here',
  popOut: true,
  grain: true,
  vignette: true,
  size: 'wide',
  panels: defaultPanels(),
  selectedPanel: 0,
};

const photos = []; // { uid, name, img, focus }
let photoUid = 0;
const gradedCache = new Map();

/* ------------------------------------------------------- gradient mapping */

function buildLUT(ramp) {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = ramp[0];
    let b = ramp[ramp.length - 1];
    for (let s = 0; s < ramp.length - 1; s++) {
      if (t >= ramp[s][0] && t <= ramp[s + 1][0]) { a = ramp[s]; b = ramp[s + 1]; break; }
    }
    const span = b[0] - a[0] || 1;
    const f = (t - a[0]) / span;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * f);
  }
  return lut;
}
const LUTS = {};
for (const g of GRADES) LUTS[g.ramp] = buildLUT(RAMPS[g.ramp]);

// Run any source canvas through a grade's gradient map. Photos get the full
// treatment; the drawn demo scenes get a lighter pass so their painted
// colours survive.
function gradeCanvas(src, rampId, mix) {
  const w = src.width;
  const h = src.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(src, 0, 0);
  const data = cx.getImageData(0, 0, w, h);
  const px = data.data;
  const lut = LUTS[rampId];
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const lum = Math.max(0, Math.min(255, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)));
    let nr = r + (lut[lum * 3] - r) * mix;
    let ng = g + (lut[lum * 3 + 1] - g) * mix;
    let nb = b + (lut[lum * 3 + 2] - b) * mix;
    nr = (nr - 128) * 1.05 + 128;
    ng = (ng - 128) * 1.05 + 128;
    nb = (nb - 128) * 1.05 + 128;
    const gray = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
    px[i] = Math.max(0, Math.min(255, gray + (nr - gray) * 1.12));
    px[i + 1] = Math.max(0, Math.min(255, gray + (ng - gray) * 1.12));
    px[i + 2] = Math.max(0, Math.min(255, gray + (nb - gray) * 1.12));
  }
  cx.putImageData(data, 0, 0);
  return c;
}

function gradedPhoto(photo, gradeId) {
  const key = 'photo|' + photo.uid + '|' + gradeId;
  if (gradedCache.has(key)) return gradedCache.get(key);
  const img = photo.img;
  const scale = Math.min(1, 1600 / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const raw = document.createElement('canvas');
  raw.width = w; raw.height = h;
  raw.getContext('2d').drawImage(img, 0, 0, w, h);
  const out = gradeCanvas(raw, gradeOf(gradeId).ramp, 0.52);
  gradedCache.set(key, out);
  return out;
}

function gradedScene(sceneIdx, gradeId) {
  const key = 'scene|' + sceneIdx + '|' + gradeId;
  if (gradedCache.has(key)) return gradedCache.get(key);
  const out = gradeCanvas(demoScenes[sceneIdx], gradeOf(gradeId).ramp, 0.34);
  gradedCache.set(key, out);
  return out;
}

function sourceCanvas(panel) {
  if (panel.src.kind === 'photo') {
    const photo = photos[panel.src.photo];
    if (photo) return gradedPhoto(photo, state.grade);
    return gradedScene(panel.src.scene || 0, state.grade);
  }
  return gradedScene(panel.src.scene, state.grade);
}

/* ------------------------------------------------- drawn demo scenes ---- */
/* Four Leonida postcard scenes, painted once at boot with a seeded RNG so
   every load — and every screenshot — shows the same pictures. No external
   assets: gradients, silhouettes and light, straight on canvas. */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sky(ctx, w, h, stops) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, col] of stops) grad.addColorStop(at, col);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawPalm(ctx, x, y, s, flip, color) {
  const topX = x + 0.30 * s * flip;
  const topY = y - 0.98 * s;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.075);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 0.08 * s * flip, y - 0.55 * s, topX, topY);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  const fronds = [[-0.95, -0.30], [-0.62, -0.52], [-0.25, -0.62], [0.18, -0.60], [0.55, -0.48], [0.88, -0.24]];
  for (const [fx, fy] of fronds) {
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + fx * s * 0.55 * flip, topY + fy * s * 0.55,
      topX + fx * s * 0.92 * flip, topY + (fy + 0.38) * s * 0.72,
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(topX - 0.05 * s * flip, topY + 0.05 * s, s * 0.055, 0, Math.PI * 2);
  ctx.arc(topX + 0.07 * s * flip, topY + 0.07 * s, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function litWindows(ctx, rng, x, y, w, h, color, density) {
  ctx.save();
  ctx.fillStyle = color;
  const cols = Math.max(2, Math.floor(w / 14));
  const rows = Math.max(2, Math.floor(h / 18));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (rng() < density) ctx.fillRect(x + 4 + i * ((w - 8) / cols), y + 5 + j * ((h - 10) / rows), 4, 6);
    }
  }
  ctx.restore();
}

function sceneSunsetBay(ctx, w, h) {
  const rng = mulberry32(1201);
  sky(ctx, w, h, [[0, '#38135e'], [0.42, '#a11c68'], [0.60, '#e0492e'], [0.66, '#f7b733'], [1, '#f7b733']]);
  const horizon = h * 0.62;
  // sun + glow
  ctx.save();
  ctx.shadowColor = '#ffd76e';
  ctx.shadowBlur = 60;
  ctx.fillStyle = '#ffd76e';
  ctx.beginPath(); ctx.arc(w * 0.66, horizon - h * 0.02, w * 0.075, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // clouds
  ctx.fillStyle = 'rgba(46,10,66,0.55)';
  for (const [cx, cy, cw] of [[0.18, 0.16, 0.30], [0.52, 0.10, 0.22], [0.80, 0.24, 0.26]]) {
    ctx.beginPath();
    ctx.ellipse(w * cx, h * cy, w * cw * 0.5, h * 0.028, 0, 0, Math.PI * 2);
    ctx.ellipse(w * (cx + 0.05), h * (cy - 0.03), w * cw * 0.32, h * 0.024, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // sea
  const sea = ctx.createLinearGradient(0, horizon, 0, h);
  sea.addColorStop(0, '#e0492e');
  sea.addColorStop(0.25, '#93355f');
  sea.addColorStop(1, '#3d0f42');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, h - horizon);
  // sun path sparkles
  ctx.fillStyle = 'rgba(255,214,110,0.75)';
  for (let i = 0; i < 90; i++) {
    const yy = horizon + rng() * (h - horizon) * 0.92;
    const spread = 0.02 + ((yy - horizon) / (h - horizon)) * 0.11;
    const xx = w * 0.66 + (rng() - 0.5) * w * spread * 2;
    ctx.fillRect(xx, yy, 3 + rng() * 14, 2);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  for (let i = 0; i < 130; i++) ctx.fillRect(rng() * w, horizon + rng() * (h - horizon), 2 + rng() * 6, 1.4);
  // skyline silhouette, left
  ctx.fillStyle = '#1c0b31';
  let bx = 0;
  while (bx < w * 0.42) {
    const bw = 18 + rng() * 42;
    const bh = h * (0.10 + rng() * 0.20);
    ctx.fillRect(bx, horizon - bh, bw, bh);
    litWindows(ctx, rng, bx, horizon - bh, bw, bh, 'rgba(255,215,110,0.9)', 0.30);
    bx += bw + 3;
  }
  // beach foreground + palms
  ctx.fillStyle = '#170826';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.90);
  ctx.quadraticCurveTo(w * 0.5, h * 0.84, w, h * 0.92);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  drawPalm(ctx, w * 0.06, h * 1.02, h * 0.52, 1, '#0f0518');
  drawPalm(ctx, w * 0.97, h * 1.03, h * 0.62, -1, '#0f0518');
  drawPalm(ctx, w * 0.86, h * 0.99, h * 0.34, -1, '#1c0b31');
  // birds
  ctx.strokeStyle = 'rgba(20,5,30,0.8)';
  ctx.lineWidth = 2;
  for (const [bx2, by2, bs] of [[0.30, 0.20, 9], [0.38, 0.16, 7], [0.24, 0.13, 6]]) {
    ctx.beginPath();
    ctx.arc(w * bx2 - bs, h * by2, bs, Math.PI * 1.15, Math.PI * 1.85);
    ctx.arc(w * bx2 + bs, h * by2, bs, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
}

function scenePalmStrip(ctx, w, h) {
  const rng = mulberry32(2202);
  sky(ctx, w, h, [[0, '#0f2b4c'], [0.45, '#7c2a6d'], [0.62, '#ff8a5c'], [1, '#2a1440']]);
  const horizon = h * 0.60;
  const vx = w * 0.5;
  // side buildings with neon signs
  const signs = ['#ff2e88', '#19d3c5', '#ffb52e', '#ff2e88', '#19d3c5'];
  for (const side of [0, 1]) {
    let bx = side ? w * 0.70 : 0;
    const end = side ? w : w * 0.30;
    while ((side && bx < end) || (!side && bx < end)) {
      const bw = 26 + rng() * 40;
      const bh = h * (0.22 + rng() * 0.20);
      ctx.fillStyle = '#150a28';
      ctx.fillRect(bx, horizon - bh, bw, bh + (h - horizon));
      litWindows(ctx, rng, bx, horizon - bh, bw, bh, 'rgba(160,220,255,0.55)', 0.22);
      const signCol = signs[Math.floor(rng() * signs.length)];
      ctx.save();
      ctx.shadowColor = signCol;
      ctx.shadowBlur = 16;
      ctx.fillStyle = signCol;
      ctx.fillRect(bx + bw * 0.18, horizon - bh + 10, bw * 0.64, 12 + rng() * 10);
      ctx.restore();
      bx += bw + 4;
      if (!side && bx >= end) break;
    }
  }
  // road
  ctx.fillStyle = '#241a33';
  ctx.beginPath();
  ctx.moveTo(w * 0.16, h);
  ctx.lineTo(vx - w * 0.035, horizon);
  ctx.lineTo(vx + w * 0.035, horizon);
  ctx.lineTo(w * 0.84, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,110,0.85)';
  ctx.lineWidth = 4;
  ctx.setLineDash([26, 30]);
  ctx.beginPath();
  ctx.moveTo(vx, horizon + 4);
  ctx.lineTo(vx, h);
  ctx.stroke();
  ctx.setLineDash([]);
  // palms marching to the vanishing point
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const yBase = horizon + (h - horizon) * Math.pow(t, 1.4) + h * 0.02;
    const size = h * (0.16 + t * 0.42);
    drawPalm(ctx, w * (0.335 - t * 0.155), yBase, size, 1, '#0d0618');
    drawPalm(ctx, w * (0.665 + t * 0.155), yBase, size, -1, '#0d0618');
  }
  // hero car silhouette
  ctx.save();
  ctx.fillStyle = '#0a0414';
  const cw = w * 0.34, chh = h * 0.115, cx0 = vx - cw / 2, cy0 = h * 0.885;
  ctx.beginPath();
  ctx.moveTo(cx0, cy0 + chh);
  ctx.lineTo(cx0 + cw * 0.06, cy0 + chh * 0.42);
  ctx.lineTo(cx0 + cw * 0.24, cy0 + chh * 0.30);
  ctx.lineTo(cx0 + cw * 0.34, cy0);
  ctx.lineTo(cx0 + cw * 0.66, cy0);
  ctx.lineTo(cx0 + cw * 0.78, cy0 + chh * 0.30);
  ctx.lineTo(cx0 + cw * 0.95, cy0 + chh * 0.45);
  ctx.lineTo(cx0 + cw, cy0 + chh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(140,220,255,0.5)';
  ctx.fillRect(cx0 + cw * 0.37, cy0 + chh * 0.10, cw * 0.26, chh * 0.20);
  ctx.shadowColor = '#ff2244';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ff3355';
  ctx.fillRect(cx0 + cw * 0.05, cy0 + chh * 0.52, cw * 0.13, chh * 0.13);
  ctx.fillRect(cx0 + cw * 0.82, cy0 + chh * 0.52, cw * 0.13, chh * 0.13);
  ctx.restore();
}

function sceneNeonHarbor(ctx, w, h) {
  const rng = mulberry32(3303);
  sky(ctx, w, h, [[0, '#050914'], [0.5, '#0d1b3e'], [0.58, '#123'], [1, '#071228']]);
  const horizon = h * 0.56;
  // stars + moon
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 130; i++) ctx.fillRect(rng() * w, rng() * horizon * 0.9, rng() < 0.2 ? 2.4 : 1.3, 1.3);
  ctx.fillStyle = '#f4f1de';
  ctx.beginPath(); ctx.arc(w * 0.16, h * 0.14, w * 0.032, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0a1430';
  ctx.beginPath(); ctx.arc(w * 0.175, h * 0.125, w * 0.028, 0, Math.PI * 2); ctx.fill();
  // distant glow city, left
  ctx.fillStyle = '#0a1128';
  let bx = 0;
  while (bx < w * 0.34) {
    const bw = 16 + rng() * 34;
    const bh = h * (0.06 + rng() * 0.13);
    ctx.fillRect(bx, horizon - bh, bw, bh);
    litWindows(ctx, rng, bx, horizon - bh, bw, bh, 'rgba(255,190,90,0.85)', 0.35);
    bx += bw + 2;
  }
  // ferris wheel, right
  const wx = w * 0.80, wy = horizon - h * 0.16, wr = w * 0.115;
  ctx.strokeStyle = '#0a0f22';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(wx - wr * 0.55, horizon + h * 0.02); ctx.lineTo(wx, wy); ctx.lineTo(wx + wr * 0.55, horizon + h * 0.02); ctx.stroke();
  ctx.strokeStyle = 'rgba(25,211,197,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + wr * Math.cos(a), wy + wr * Math.sin(a)); ctx.stroke();
    ctx.save();
    ctx.shadowColor = i % 2 ? '#ff2e88' : '#ffb52e';
    ctx.shadowBlur = 12;
    ctx.fillStyle = i % 2 ? '#ff2e88' : '#ffb52e';
    ctx.beginPath(); ctx.arc(wx + wr * Math.cos(a), wy + wr * Math.sin(a), 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // water + neon reflections
  const sea = ctx.createLinearGradient(0, horizon, 0, h);
  sea.addColorStop(0, '#0a1a3a');
  sea.addColorStop(1, '#040814');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, h - horizon);
  const refl = ['rgba(255,46,136,', 'rgba(25,211,197,', 'rgba(255,181,46,'];
  for (let i = 0; i < 110; i++) {
    const xx = rng() * w;
    const yy = horizon + 6 + rng() * (h - horizon - 12);
    const len = 6 + rng() * 26 * ((yy - horizon) / (h - horizon) + 0.3);
    ctx.fillStyle = refl[Math.floor(rng() * 3)] + (0.10 + rng() * 0.30) + ')';
    ctx.fillRect(xx, yy, len, 2.2);
  }
  // pier + boats
  ctx.fillStyle = '#060a18';
  ctx.fillRect(0, horizon - 4, w, 9);
  for (let x = 10; x < w; x += 46) ctx.fillRect(x, horizon + 5, 7, h * 0.05);
  for (const [boatX, boatS, lights] of [[0.30, 1.0, true], [0.52, 0.7, false], [0.63, 0.85, true]]) {
    const bw = w * 0.15 * boatS;
    const by = horizon + h * (0.05 + (1 - boatS) * 0.06);
    ctx.fillStyle = '#05070f';
    ctx.beginPath();
    ctx.moveTo(w * boatX - bw / 2, by);
    ctx.lineTo(w * boatX + bw / 2, by);
    ctx.lineTo(w * boatX + bw * 0.34, by + h * 0.045 * boatS);
    ctx.lineTo(w * boatX - bw * 0.34, by + h * 0.045 * boatS);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(w * boatX - bw * 0.16, by - h * 0.05 * boatS, bw * 0.32, h * 0.05 * boatS);
    ctx.strokeStyle = '#05070f';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w * boatX, by - h * 0.05 * boatS); ctx.lineTo(w * boatX, by - h * 0.20 * boatS); ctx.stroke();
    if (lights) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,181,46,0.75)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(w * boatX, by - h * 0.20 * boatS); ctx.lineTo(w * boatX + bw * 0.42, by - h * 0.02); ctx.stroke();
      ctx.fillStyle = '#ffd76e';
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        ctx.beginPath(); ctx.arc(w * boatX + bw * 0.42 * t, by - h * 0.20 * boatS + (h * 0.18 * boatS) * t, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
}

function sceneCauseway(ctx, w, h) {
  const rng = mulberry32(4404);
  sky(ctx, w, h, [[0, '#1d1440'], [0.40, '#6d2a6d'], [0.52, '#e2693a'], [1, '#2a1440']]);
  const horizon = h * 0.52;
  // low moon
  ctx.fillStyle = '#f7e8c9';
  ctx.beginPath(); ctx.arc(w * 0.13, h * 0.16, w * 0.028, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#241647';
  ctx.beginPath(); ctx.arc(w * 0.145, h * 0.15, w * 0.024, 0, Math.PI * 2); ctx.fill();
  // far city, right
  ctx.fillStyle = '#180b30';
  let bx = w * 0.66;
  while (bx < w) {
    const bw = 18 + rng() * 40;
    const bh = h * (0.07 + rng() * 0.15);
    ctx.fillRect(bx, horizon - bh, bw, bh);
    litWindows(ctx, rng, bx, horizon - bh, bw, bh, 'rgba(255,205,110,0.85)', 0.3);
    bx += bw + 3;
  }
  // water
  const sea = ctx.createLinearGradient(0, horizon, 0, h);
  sea.addColorStop(0, '#93355f');
  sea.addColorStop(0.3, '#4a1a52');
  sea.addColorStop(1, '#160a2e');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.fillStyle = 'rgba(255,190,120,0.35)';
  for (let i = 0; i < 70; i++) ctx.fillRect(rng() * w, horizon + rng() * (h - horizon), 3 + rng() * 12, 1.6);
  // bridge deck in perspective: near-left to mid-right horizon
  const deck = [
    { x: -w * 0.05, y: h * 1.0 },
    { x: w * 0.60, y: horizon + h * 0.015 },
    { x: w * 0.685, y: horizon + h * 0.015 },
    { x: w * 1.02, y: h * 1.0 },
  ];
  ctx.fillStyle = '#120a24';
  ctx.beginPath();
  ctx.moveTo(deck[0].x, deck[0].y);
  ctx.lineTo(deck[1].x, deck[1].y);
  ctx.lineTo(deck[2].x, deck[2].y);
  ctx.lineTo(deck[3].x, deck[3].y);
  ctx.closePath();
  ctx.fill();
  // deck edge lights + lamp posts
  for (let i = 0; i <= 9; i++) {
    const t = i / 9;
    const lx = deck[0].x + (deck[1].x - deck[0].x) * t;
    const ly = deck[0].y + (deck[1].y - deck[0].y) * t;
    const lampH = h * 0.16 * (1 - t * 0.78);
    ctx.strokeStyle = '#0a0518';
    ctx.lineWidth = Math.max(1.5, 5 * (1 - t * 0.7));
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - lampH); ctx.stroke();
    ctx.save();
    ctx.shadowColor = '#ffb52e';
    ctx.shadowBlur = 14 * (1 - t * 0.6);
    ctx.fillStyle = '#ffd76e';
    ctx.beginPath(); ctx.arc(lx, ly - lampH, Math.max(1.6, 4.4 * (1 - t * 0.65)), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // reflection
    ctx.fillStyle = 'rgba(255,183,46,0.30)';
    ctx.fillRect(lx - 1.5, horizon + (horizon - ly) * 0.4 + h * 0.06, 3, h * 0.05 + rng() * h * 0.05);
  }
  // light trails: headlights one way, tail lights the other
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#fff3c4';
  ctx.strokeStyle = 'rgba(255,243,196,0.95)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, h * 0.97);
  ctx.quadraticCurveTo(w * 0.34, h * 0.78, w * 0.615, horizon + h * 0.03);
  ctx.stroke();
  ctx.shadowColor = '#ff2244';
  ctx.strokeStyle = 'rgba(255,51,85,0.95)';
  ctx.beginPath();
  ctx.moveTo(w * 0.94, h * 0.99);
  ctx.quadraticCurveTo(w * 0.72, h * 0.76, w * 0.665, horizon + h * 0.03);
  ctx.stroke();
  ctx.restore();
  // support pylons
  ctx.fillStyle = 'rgba(10,5,22,0.85)';
  for (const t of [0.25, 0.5, 0.75]) {
    const px = deck[0].x + (deck[2].x - deck[0].x) * t + w * 0.06;
    const py = deck[0].y + (deck[1].y - deck[0].y) * t;
    ctx.fillRect(px, py, w * 0.016, h - py);
  }
}

const demoScenes = [];
function buildDemoScenes() {
  const painters = [sceneSunsetBay, scenePalmStrip, sceneNeonHarbor, sceneCauseway];
  for (const paint of painters) {
    const c = document.createElement('canvas');
    c.width = 960; c.height = 720;
    paint(c.getContext('2d'), 960, 720);
    demoScenes.push(c);
  }
}

/* -------------------------------------------------------------- geometry */

// The postcard's content box: perforation strip down the left edge, even
// margins elsewhere, and a title band along the bottom.
function cardBox(W, H) {
  const perfW = Math.round(W * 0.030);
  const x = perfW + Math.round(W * 0.024);
  const right = Math.round(W * 0.026);
  const top = Math.round(H * 0.034);
  const bottom = Math.round(H * 0.030);
  const tb = Math.round(H * 0.205);
  return {
    perfW,
    x,
    y: top,
    w: W - x - right,
    gridH: H - top - bottom - tb,
    tb,
    bandY: H - bottom - tb,
    bottom,
  };
}

// Panel rectangles for the six grid layouts, inside the grid area.
// Hero Left: the hero spans a 2x2 block, two panels stack beside it.
// Hero Top: the hero spans the full width over a row of three.
// Classic Cover returns one full-bleed rect that runs under the title band.
function gridPanels(layout, box) {
  const { x, y, w } = box;
  const h = box.gridH;
  const g = Math.max(6, Math.round(w * 0.009));
  const colW = (w - 2 * g) / 3;
  const rowH = (h - g) / 2;
  switch (layout) {
    case 'hero-left':
      return [
        { x, y, w: 2 * colW + g, h },
        { x: x + 2 * colW + 2 * g, y, w: colW, h: rowH },
        { x: x + 2 * colW + 2 * g, y: y + rowH + g, w: colW, h: rowH },
      ];
    case 'hero-top': {
      const hh = Math.round(h * 0.585); // hero takes ~59% of the height
      return [
        { x, y, w, h: hh },
        { x, y: y + hh + g, w: colW, h: h - hh - g },
        { x: x + colW + g, y: y + hh + g, w: colW, h: h - hh - g },
        { x: x + 2 * (colW + g), y: y + hh + g, w: colW, h: h - hh - g },
      ];
    }
    case 'twin': {
      const tw = (w - g) / 2;
      return [
        { x, y, w: tw, h },
        { x: x + tw + g, y, w: tw, h },
      ];
    }
    case 'quad': {
      const qw = (w - g) / 2;
      return [
        { x, y, w: qw, h: rowH },
        { x: x + qw + g, y, w: qw, h: rowH },
        { x, y: y + rowH + g, w: qw, h: rowH },
        { x: x + qw + g, y: y + rowH + g, w: qw, h: rowH },
      ];
    }
    case 'six': {
      const rects = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          rects.push({ x: x + c * (colW + g), y: y + r * (rowH + g), w: colW, h: rowH });
        }
      }
      return rects;
    }
    default: // classic
      return [{ x, y, w, h: h + box.tb * 0.94 }];
  }
}

const PANEL_COUNTS = { 'hero-left': 3, 'hero-top': 4, twin: 2, quad: 4, six: 6, classic: 1 };
function panelCount() {
  return PANEL_COUNTS[state.layout] || 3;
}

function panelAt(index) {
  if (!state.panels[index]) {
    const fresh = defaultPanels();
    state.panels[index] = { ...(fresh[index] || { src: { kind: 'demo', scene: index % 4 }, x: 0.5, y: 1.3, zoom: 1.05 }) };
  }
  return state.panels[index];
}

/* --------------------------------------------------------------- drawing */

// Cover-crop geometry for one source in one rect, using the focal model:
// x = the source fraction sitting at the panel's centre,
// y = 1 + downward shift measured in panel heights.
function coverGeom(src, panel, rect) {
  const iw = src.width;
  const ih = src.height;
  const s0 = Math.max(rect.w / iw, rect.h / ih);
  const s = s0 * (panel.zoom || 1);
  const dw = iw * s;
  const dh = ih * s;
  let dx = rect.x + rect.w / 2 - panel.x * iw * s;
  let dy = rect.y - (panel.y - 1) * rect.h;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  return { dx, dy, dw, dh, s, iw, ih };
}

function drawPanelImage(ctx, panel, rect) {
  const src = sourceCanvas(panel);
  const geo = coverGeom(src, panel, rect);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(src, geo.dx, geo.dy, geo.dw, geo.dh);
  ctx.restore();
  return geo;
}

function panelBorder(ctx, rect, W) {
  ctx.save();
  ctx.strokeStyle = '#16101f';
  ctx.lineWidth = Math.max(3, W * 0.0030);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// The pop-out hero: the hero panel's picture redrawn scaled past its frame
// edge, with a drop shadow and a paper edge, so it breaks the grid.
function drawPopOut(ctx, panel, rect, W, H) {
  const src = sourceCanvas(panel);
  const geo = coverGeom(src, panel, rect);
  const k = 1.13;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = cx + (geo.dx - cx) * k;
  const dy = cy + (geo.dy - cy) * k;
  const dw = geo.dw * k;
  const dh = geo.dh * k;
  const frame = { x: cx + (rect.x - cx) * k, y: cy + (rect.y - cy) * k, w: rect.w * k, h: rect.h * k };
  ctx.save();
  ctx.shadowColor = 'rgba(8,2,16,0.55)';
  ctx.shadowBlur = W * 0.022;
  ctx.shadowOffsetY = H * 0.012;
  ctx.fillStyle = gradeOf(state.grade).paper;
  ctx.fillRect(frame.x - 5, frame.y - 5, frame.w + 10, frame.h + 10);
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();
  ctx.drawImage(src, dx, dy, dw, dh);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#16101f';
  ctx.lineWidth = Math.max(3, W * 0.0030);
  ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
  ctx.restore();
  return geo;
}

function fitFont(ctx, text, family, startSize, maxWidth) {
  let size = Math.round(startSize);
  ctx.font = `${size}px ${family}, sans-serif`;
  while (size > 8 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}, sans-serif`;
  }
  return size;
}

// The corner stamp: its art follows the selected grade — a little painted
// sunset over the bay in the grade's ink, the grade's name and denomination.
function drawStamp(ctx, rightX, topY, w) {
  const grade = gradeOf(state.grade);
  const h = w * 0.80;
  ctx.save();
  ctx.translate(rightX - w / 2, topY + h / 2);
  ctx.rotate(0.055);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = w * 0.05;
  ctx.shadowOffsetY = w * 0.02;
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#8a7a5c';
  ctx.lineWidth = Math.max(1, w * 0.008);
  ctx.strokeRect(-w / 2 + w * 0.02, -h / 2 + w * 0.02, w * 0.96, h - w * 0.04);
  ctx.setLineDash([w * 0.03, w * 0.022]);
  ctx.strokeStyle = grade.stampInk;
  ctx.strokeRect(-w / 2 + w * 0.055, -h / 2 + w * 0.055, w * 0.89, h - w * 0.11);
  ctx.setLineDash([]);
  // mini scene: sun over water, in the grade ink
  ctx.save();
  ctx.strokeStyle = grade.stampInk;
  ctx.fillStyle = grade.stampInk;
  ctx.lineWidth = Math.max(1, w * 0.014);
  ctx.beginPath(); ctx.arc(0, -h * 0.10, w * 0.085, Math.PI, 0); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * w * 0.115, -h * 0.10 + Math.sin(a) * w * 0.115);
    ctx.lineTo(Math.cos(a) * w * 0.155, -h * 0.10 + Math.sin(a) * w * 0.155);
    ctx.stroke();
  }
  for (let r = 0; r < 3; r++) {
    ctx.beginPath();
    const yy = h * (0.02 + r * 0.055);
    const ww = w * (0.16 - r * 0.03);
    ctx.moveTo(-ww, yy);
    ctx.quadraticCurveTo(-ww / 2, yy - h * 0.03, 0, yy);
    ctx.quadraticCurveTo(ww / 2, yy + h * 0.03, ww, yy);
    ctx.stroke();
  }
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.fillStyle = grade.stampInk;
  const nameSize = fitFont(ctx, grade.label.toUpperCase(), 'Anton', w * 0.145, w * 0.86);
  ctx.font = `${nameSize}px Anton, sans-serif`;
  ctx.fillText(grade.label.toUpperCase(), 0, h * 0.315);
  ctx.fillStyle = '#3a2c22';
  ctx.font = `${Math.round(w * 0.10)}px Anton, sans-serif`;
  ctx.fillText('LEONIDA · ' + grade.denom, 0, h * 0.435);
  ctx.restore();
  return { left: rightX - w, top: topY, w, h };
}

function arcText(ctx, text, cx, cy, r, from, to, flip) {
  const n = text.length;
  for (let i = 0; i < n; i++) {
    const a = n === 1 ? (from + to) / 2 : from + ((to - from) * i) / (n - 1);
    ctx.save();
    ctx.translate(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
}

// The postmark is always the same souvenir strike: LEONIDA — MAY 26 2026.
function drawPostmark(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.22);
  ctx.strokeStyle = 'rgba(28,26,54,0.78)';
  ctx.fillStyle = 'rgba(28,26,54,0.78)';
  ctx.lineWidth = Math.max(1.4, r * 0.045);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.028);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.80, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(r * 0.235)}px Anton, sans-serif`;
  arcText(ctx, 'LEONIDA', 0, 0, r * 0.90, -Math.PI * 0.80, -Math.PI * 0.20, false);
  arcText(ctx, 'POSTAGE PAID', 0, 0, r * 0.90, Math.PI * 0.78, Math.PI * 0.22, true);
  ctx.font = `${Math.round(r * 0.335)}px Anton, sans-serif`;
  ctx.fillText('MAY 26', 0, -r * 0.10);
  ctx.font = `${Math.round(r * 0.30)}px Anton, sans-serif`;
  ctx.fillText('2026', 0, r * 0.24);
  ctx.restore();
}

// Wavy cancellation lines running from the postmark across the stamp.
function drawCancellation(ctx, fromX, toX, cy, r) {
  ctx.save();
  ctx.strokeStyle = 'rgba(28,26,54,0.60)';
  ctx.lineWidth = Math.max(1.4, r * 0.038);
  const amp = r * 0.075;
  const wl = r * 0.46;
  for (let line = 0; line < 4; line++) {
    const yy = cy - r * 0.30 + line * r * 0.20;
    ctx.beginPath();
    for (let x = fromX; x <= toX; x += 6) {
      const y = yy + Math.sin(((x - fromX) / wl) * Math.PI * 2 + line * 0.4) * amp;
      if (x === fromX) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawPerforation(ctx, W, H, box) {
  const grade = gradeOf(state.grade);
  ctx.save();
  // tinted strip + tear line
  ctx.fillStyle = grade.paperEdge;
  ctx.fillRect(0, 0, box.perfW, H);
  ctx.strokeStyle = 'rgba(22,16,31,0.35)';
  ctx.lineWidth = Math.max(1, W * 0.0012);
  ctx.setLineDash([W * 0.006, W * 0.006]);
  ctx.beginPath();
  ctx.moveTo(box.perfW, 0);
  ctx.lineTo(box.perfW, H);
  ctx.stroke();
  ctx.setLineDash([]);
  // punched holes: dark notches opening on the left edge
  const step = box.perfW * 1.55;
  const r = box.perfW * 0.34;
  ctx.fillStyle = '#17102a';
  for (let y = step * 0.6; y < H; y += step) {
    ctx.beginPath();
    ctx.arc(0, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.beginPath();
    ctx.arc(0, y + r * 0.28, r * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#17102a';
  }
  ctx.restore();
}

/* --------------------------------------------------------- title band --- */

function drawTitleBand(ctx, W, H, box) {
  const grade = gradeOf(state.grade);
  const { x, w, tb } = box;
  const y0 = box.bandY;
  const title = state.caption || 'UNTITLED';
  const sub = state.subtitle || '';
  const overlay = state.layout === 'classic';

  ctx.save();
  if (state.treatment === 'newsprint') {
    ctx.fillStyle = overlay ? 'rgba(250,244,230,0.94)' : grade.paper;
    ctx.fillRect(x, y0, w, tb);
    ctx.strokeStyle = '#17130e';
    ctx.lineWidth = Math.max(2, tb * 0.016);
    ctx.beginPath(); ctx.moveTo(x, y0 + tb * 0.045); ctx.lineTo(x + w, y0 + tb * 0.045); ctx.stroke();
    ctx.lineWidth = Math.max(4, tb * 0.034);
    ctx.beginPath(); ctx.moveTo(x, y0 + tb * 0.115); ctx.lineTo(x + w, y0 + tb * 0.115); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const capSize = fitFont(ctx, title, 'Anton', tb * 0.50, w * 0.66);
    ctx.font = `${capSize}px Anton, sans-serif`;
    ctx.fillStyle = '#17130e';
    ctx.fillText(title, x + w * 0.004, y0 + tb * 0.60);
    ctx.font = `700 ${Math.round(tb * 0.115)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = '#4a3f30';
    const subUp = sub.toUpperCase().split('').join('  ');
    ctx.fillText(subUp, x + w * 0.006, y0 + tb * 0.82);
    ctx.textAlign = 'right';
    ctx.font = `italic ${Math.round(tb * 0.115)}px Georgia, serif`;
    ctx.fillStyle = '#6b5a41';
    ctx.fillText(grade.flavour, x + w * 0.996, y0 + tb * 0.82);
    ctx.font = `${Math.round(tb * 0.115)}px Anton, sans-serif`;
    ctx.fillStyle = grade.stampInk;
    ctx.fillText('GRADE · ' + grade.label.toUpperCase(), x + w * 0.996, y0 + tb * 0.36);
  } else if (state.treatment === 'neon') {
    ctx.fillStyle = overlay ? 'rgba(8,4,24,0.90)' : '#0a0618';
    ctx.fillRect(x, y0, w, tb);
    ctx.fillStyle = '#19d3c5';
    ctx.fillRect(x, y0, w, Math.max(3, tb * 0.03));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const capSize = fitFont(ctx, title, 'Anton', tb * 0.54, w * 0.66);
    ctx.font = `${capSize}px Anton, sans-serif`;
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = tb * 0.16;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, x + w * 0.006, y0 + tb * 0.60);
    ctx.shadowColor = '#19d3c5';
    ctx.shadowBlur = tb * 0.10;
    ctx.fillStyle = '#a5fbff';
    ctx.fillText(title, x + w * 0.006, y0 + tb * 0.60);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.shadowColor = '#19d3c5';
    ctx.shadowBlur = tb * 0.12;
    ctx.fillStyle = '#7df3ff';
    const subSize = fitFont(ctx, sub, 'Pacifico', tb * 0.28, w * 0.5);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillText(sub, x + w * 0.010, y0 + tb * 0.90);
    ctx.restore();
    ctx.textAlign = 'right';
    ctx.font = `${Math.round(tb * 0.125)}px Anton, sans-serif`;
    ctx.fillStyle = '#ff8ac2';
    ctx.fillText('GRADE · ' + grade.label.toUpperCase(), x + w * 0.994, y0 + tb * 0.36);
    ctx.font = `${Math.round(tb * 0.105)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = '#b9a6d9';
    ctx.fillText(grade.flavour, x + w * 0.994, y0 + tb * 0.86);
  } else {
    // classic
    ctx.fillStyle = overlay ? 'rgba(24,8,42,0.90)' : '#1d0b31';
    ctx.fillRect(x, y0, w, tb);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(x, y0, w, Math.max(3, tb * 0.03));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const capSize = fitFont(ctx, title, 'Anton', tb * 0.54, w * 0.66);
    ctx.font = `${capSize}px Anton, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, x + w * 0.006, y0 + tb * 0.60);
    ctx.save();
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = tb * 0.13;
    ctx.fillStyle = '#ff8ac2';
    const subSize = fitFont(ctx, sub, 'Pacifico', tb * 0.29, w * 0.5);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillText(sub, x + w * 0.010, y0 + tb * 0.92);
    ctx.restore();
    ctx.textAlign = 'right';
    ctx.font = `${Math.round(tb * 0.125)}px Anton, sans-serif`;
    ctx.fillStyle = '#ffb52e';
    ctx.fillText('GRADE · ' + grade.label.toUpperCase(), x + w * 0.994, y0 + tb * 0.36);
    ctx.font = `${Math.round(tb * 0.105)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = '#cfc0ea';
    ctx.fillText(grade.flavour, x + w * 0.994, y0 + tb * 0.86);
  }
  ctx.restore();
}

let noisePattern = null;
function makeNoise(ctx) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const cx = c.getContext('2d');
  const img = cx.createImageData(256, 256);
  const rng = mulberry32(777);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rng() * 255;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = 16;
  }
  cx.putImageData(img, 0, 0);
  noisePattern = ctx.createPattern(c, 'repeat');
}

function applyVignette(ctx, box) {
  if (!state.vignette) return;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.gridH / 2;
  const r0 = Math.min(box.w, box.gridH) * 0.46;
  const r1 = Math.max(box.w, box.gridH) * 0.80;
  const grad = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  grad.addColorStop(0, 'rgba(12,0,24,0)');
  grad.addColorStop(1, 'rgba(12,0,24,0.34)');
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.gridH + (state.layout === 'classic' ? box.tb : 0));
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(box.x, box.y, box.w, box.gridH + box.tb);
  ctx.restore();
}

function drawSelection(ctx, W) {
  const rect = renderInfo.rects[state.selectedPanel];
  if (!rect) return;
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, W * 0.0022);
  ctx.setLineDash([W * 0.012, W * 0.008]);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/* ------------------------------------------------------------ the render */

const renderInfo = { rects: [], scales: [], W: 0, H: 0 };

function renderCover(ctx, W, H, forExport) {
  renderInfo.rects = [];
  renderInfo.scales = [];
  renderInfo.W = W; renderInfo.H = H;
  const grade = gradeOf(state.grade);
  const box = cardBox(W, H);
  const rects = gridPanels(state.layout, box);
  renderInfo.rects = rects;

  // paper
  ctx.clearRect(0, 0, W, H);
  const paperGrad = ctx.createLinearGradient(0, 0, W, H);
  paperGrad.addColorStop(0, grade.paper);
  paperGrad.addColorStop(1, grade.paperEdge);
  ctx.fillStyle = paperGrad;
  ctx.fillRect(0, 0, W, H);
  drawPerforation(ctx, W, H, box);

  // panels: cream gutters are the paper showing through between ink frames
  const heroIdx = (state.layout === 'hero-left' || state.layout === 'hero-top') ? 0 : -1;
  rects.forEach((rect, i) => {
    const panel = panelAt(i);
    if (state.popOut && i === heroIdx) {
      // base pass still fills the frame; the pop-out redraw happens after
      renderInfo.scales[i] = drawPanelImage(ctx, panel, rect);
    } else {
      renderInfo.scales[i] = drawPanelImage(ctx, panel, rect);
    }
    panelBorder(ctx, rect, W);
  });
  applyVignette(ctx, box);
  if (state.popOut && heroIdx >= 0) {
    renderInfo.scales[heroIdx] = drawPopOut(ctx, panelAt(heroIdx), rects[heroIdx], W, H);
  }

  // title band (caption bar)
  drawTitleBand(ctx, W, H, box);

  // postcard dressing: stamp, postmark, cancellation waves
  const stampW = Math.min(W * 0.118, box.w * 0.20);
  const stamp = drawStamp(ctx, box.x + box.w - stampW * 0.06, box.y - H * 0.006, stampW);
  const pmR = stamp.w * 0.52;
  const pmCx = stamp.left + stamp.w * 0.14;
  const pmCy = stamp.top + stamp.h * 0.72;
  drawCancellation(ctx, pmCx - pmR * 0.15, stamp.left + stamp.w * 0.94, pmCy, pmR);
  drawPostmark(ctx, pmCx, pmCy, pmR);

  if (state.grain) {
    if (!noisePattern) makeNoise(ctx);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = noisePattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  if (!forExport) drawSelection(ctx, W);
}

/* ---------------------------------------------------------------- editor */

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');
const els = {};
for (const id of ['fileInput', 'photoStrip', 'layoutBar', 'gradeBar', 'gradeFlavour', 'treatmentBar', 'sizeBar', 'presetRow', 'panelPhoto', 'panelZoom', 'panelX', 'panelY', 'captionInput', 'subtitleInput', 'popoutToggle', 'grainToggle', 'vignetteToggle', 'demoResetBtn', 'exportBtn', 'undoBtn', 'redoBtn', 'stage']) {
  els[id] = document.getElementById(id);
}

function currentSize() {
  return SIZES.find((s) => s.id === state.size) || SIZES[0];
}

function renderPreview() {
  const { w, h } = currentSize();
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  renderCover(ctx, w, h, false);
}

/* history */
const history = [];
let historyIndex = -1;
let historyTimer = null;
function snapshot() {
  return JSON.stringify({ ...state, panels: state.panels.map((p) => ({ ...p, src: { ...p.src } })) });
}
function pushHistory(immediate) {
  const commit = () => {
    history.splice(historyIndex + 1);
    history.push(snapshot());
    if (history.length > 80) history.shift();
    historyIndex = history.length - 1;
    syncHistoryButtons();
  };
  if (immediate) { clearTimeout(historyTimer); commit(); return; }
  clearTimeout(historyTimer);
  historyTimer = setTimeout(commit, 350);
}
function restore(json) {
  const data = JSON.parse(json);
  for (const k of Object.keys(state)) if (k in data) state[k] = data[k];
  syncControls();
  renderPreview();
}
function syncHistoryButtons() {
  els.undoBtn.disabled = historyIndex <= 0;
  els.redoBtn.disabled = historyIndex >= history.length - 1;
}
els.undoBtn.addEventListener('click', () => { if (historyIndex > 0) { historyIndex--; restore(history[historyIndex]); syncHistoryButtons(); } });
els.redoBtn.addEventListener('click', () => { if (historyIndex < history.length - 1) { historyIndex++; restore(history[historyIndex]); syncHistoryButtons(); } });
document.addEventListener('keydown', (e) => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) els.redoBtn.click(); else els.undoBtn.click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); els.redoBtn.click(); }
});

/* controls */
function buildButtons(bar, items, current, onPick) {
  bar.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.label;
    if (item.id === current) b.classList.add('active');
    b.addEventListener('click', () => onPick(item.id));
    bar.appendChild(b);
  }
}

function buildPhotoStrip() {
  els.photoStrip.innerHTML = '';
  photos.forEach((photo, i) => {
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    img.title = photo.name + ' — click to place in the selected panel';
    img.addEventListener('click', () => {
      const p = panelAt(state.selectedPanel);
      p.src = { kind: 'photo', photo: i };
      state.panels[state.selectedPanel] = p;
      pushHistory(true);
      syncPanelControls();
      renderPreview();
    });
    els.photoStrip.appendChild(img);
  });
  buildPanelPhotoOptions();
}

function buildPanelPhotoOptions() {
  const p = panelAt(state.selectedPanel);
  els.panelPhoto.innerHTML = '';
  SCENE_NAMES.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = 'demo:' + i;
    opt.textContent = 'Demo scene — ' + name;
    els.panelPhoto.appendChild(opt);
  });
  photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = 'photo:' + i;
    opt.textContent = 'Photo ' + (i + 1) + ' — ' + photo.name;
    els.panelPhoto.appendChild(opt);
  });
  els.panelPhoto.value = p.src.kind === 'photo' ? 'photo:' + p.src.photo : 'demo:' + p.src.scene;
}

function syncPanelControls() {
  const p = panelAt(state.selectedPanel);
  buildPanelPhotoOptions();
  els.panelZoom.value = String(p.zoom);
  els.panelX.value = String(p.x);
  els.panelY.value = String(p.y);
}

function syncControls() {
  buildButtons(els.layoutBar, LAYOUTS, state.layout, (id) => { state.layout = id; state.selectedPanel = 0; pushHistory(true); syncControls(); renderPreview(); });
  buildButtons(els.gradeBar, GRADES, state.grade, (id) => { state.grade = id; pushHistory(true); syncControls(); renderPreview(); });
  buildButtons(els.treatmentBar, TREATMENTS, state.treatment, (id) => { state.treatment = id; pushHistory(true); syncControls(); renderPreview(); });
  buildButtons(els.sizeBar, SIZES, state.size, (id) => { state.size = id; pushHistory(true); syncControls(); renderPreview(); });
  els.gradeFlavour.textContent = gradeOf(state.grade).flavour;
  els.captionInput.value = state.caption;
  els.subtitleInput.value = state.subtitle;
  els.popoutToggle.checked = state.popOut;
  els.grainToggle.checked = state.grain;
  els.vignetteToggle.checked = state.vignette;
  buildPhotoStrip();
  syncPanelControls();
}

for (const preset of TITLE_PRESETS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = preset;
  b.addEventListener('click', () => {
    state.caption = preset;
    els.captionInput.value = preset;
    pushHistory(true);
    renderPreview();
  });
  els.presetRow.appendChild(b);
}

function bindText(input, apply) {
  input.addEventListener('input', () => { apply(input.value); pushHistory(false); renderPreview(); });
}
bindText(els.captionInput, (v) => { state.caption = v.toUpperCase(); });
bindText(els.subtitleInput, (v) => { state.subtitle = v; });

for (const [el, key] of [[els.popoutToggle, 'popOut'], [els.grainToggle, 'grain'], [els.vignetteToggle, 'vignette']]) {
  el.addEventListener('change', () => { state[key] = el.checked; pushHistory(true); renderPreview(); });
}

els.demoResetBtn.addEventListener('click', () => {
  const fresh = defaultPanels();
  state.panels = state.panels.map((p, i) => ({ ...p, src: { ...(fresh[i] ? fresh[i].src : { kind: 'demo', scene: i % 4 }) } }));
  pushHistory(true);
  syncPanelControls();
  renderPreview();
});

els.panelPhoto.addEventListener('change', () => {
  const [kind, idx] = els.panelPhoto.value.split(':');
  const p = panelAt(state.selectedPanel);
  p.src = kind === 'photo' ? { kind: 'photo', photo: Number(idx) } : { kind: 'demo', scene: Number(idx) };
  state.panels[state.selectedPanel] = p;
  pushHistory(true);
  renderPreview();
});
function bindRange(input, apply) {
  input.addEventListener('input', () => {
    const p = panelAt(state.selectedPanel);
    apply(p, Number(input.value));
    state.panels[state.selectedPanel] = p;
    pushHistory(false);
    renderPreview();
  });
}
bindRange(els.panelZoom, (p, v) => { p.zoom = v; });
bindRange(els.panelX, (p, v) => { p.x = v; });
bindRange(els.panelY, (p, v) => { p.y = v; });

/* photo loading */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function addPhoto(name, img) {
  photos.push({ uid: ++photoUid, name, img, focus: { x: 0.5, y: 0.35 } });
  // Uploaded photos replace demo panels one by one, in panel order.
  const count = panelCount();
  for (let i = 0; i < count; i++) {
    const p = panelAt(i);
    if (p.src.kind === 'demo') {
      p.src = { kind: 'photo', photo: photos.length - 1 };
      state.panels[i] = p;
      break;
    }
  }
  buildPhotoStrip();
  syncPanelControls();
  renderPreview();
}
function addFiles(files) {
  for (const file of [...files].slice(0, 6)) {
    if (!file.type.startsWith('image/')) continue;
    const reader = new FileReader();
    reader.onload = async () => {
      const img = await loadImage(String(reader.result));
      addPhoto(file.name, img);
      pushHistory(true);
    };
    reader.readAsDataURL(file);
  }
}
els.fileInput.addEventListener('change', () => { addFiles([...els.fileInput.files]); els.fileInput.value = ''; });
for (const evt of ['dragenter', 'dragover']) {
  els.stage.addEventListener(evt, (e) => { e.preventDefault(); els.stage.classList.add('dragging'); });
}
for (const evt of ['dragleave', 'drop']) {
  els.stage.addEventListener(evt, (e) => { e.preventDefault(); els.stage.classList.remove('dragging'); });
}
els.stage.addEventListener('drop', (e) => { if (e.dataTransfer) addFiles([...e.dataTransfer.files]); });

/* canvas interaction: select, drag to reposition, wheel to zoom */
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}
function hitPanel(pt) {
  for (let i = renderInfo.rects.length - 1; i >= 0; i--) {
    const r = renderInfo.rects[i];
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const idx = hitPanel(pt);
  if (idx < 0) return;
  state.selectedPanel = idx;
  syncPanelControls();
  renderPreview();
  drag = { idx, lastX: pt.x, lastY: pt.y };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = canvasPoint(e);
  const dx = pt.x - drag.lastX;
  const dy = pt.y - drag.lastY;
  drag.lastX = pt.x;
  drag.lastY = pt.y;
  const p = panelAt(drag.idx);
  const info = renderInfo.scales[drag.idx];
  const rect = renderInfo.rects[drag.idx];
  if (!info || !rect) return;
  p.x = Math.max(0, Math.min(1, p.x - dx / (info.iw * info.s)));
  p.y = Math.max(0.4, Math.min(2.6, p.y - dy / rect.h));
  state.panels[drag.idx] = p;
  syncPanelControls();
  renderPreview();
});
canvas.addEventListener('pointerup', () => { if (drag) { drag = null; pushHistory(true); } });
canvas.addEventListener('wheel', (e) => {
  const pt = canvasPoint(e);
  const idx = hitPanel(pt);
  if (idx < 0) return;
  e.preventDefault();
  const p = panelAt(idx);
  p.zoom = Math.max(1, Math.min(3, p.zoom * Math.exp(-e.deltaY * 0.0012)));
  state.panels[idx] = p;
  state.selectedPanel = idx;
  syncPanelControls();
  pushHistory(false);
  renderPreview();
}, { passive: false });

/* export */
function exportCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  renderCover(c.getContext('2d'), w, h, true);
  return c;
}
els.exportBtn.addEventListener('click', () => {
  const { w, h } = currentSize();
  exportCanvas(w, h).toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-grid-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
});

/* automation hook: the screenshot tooling drives the app through here */
function applyPatch(patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'panels' && Array.isArray(value)) {
      state.panels = value.map((p) => ({ src: { kind: 'demo', scene: 0 }, x: 0.5, y: 1.3, zoom: 1.05, ...p }));
    } else if (key in state) {
      state[key] = value;
    }
  }
  syncControls();
  renderPreview();
}
const automation = {
  get photos() { return photos.length; },
  setState(patch) { applyPatch(patch); },
  getState() { return JSON.parse(snapshot()); },
  async exportPNGDataURL(w, h) {
    await document.fonts.ready;
    return exportCanvas(w, h).toDataURL('image/png');
  },
};
Object.defineProperty(window, '__leonida', { configurable: true, value: automation });
Object.defineProperty(window, '__postcard', { configurable: true, value: automation });

/* boot */
buildDemoScenes();
syncControls();
renderPreview();
history.push(snapshot());
historyIndex = 0;
syncHistoryButtons();
Promise.all([
  document.fonts.load('80px Anton'),
  document.fonts.load('40px Pacifico'),
]).then(() => renderPreview()).catch(() => {});
