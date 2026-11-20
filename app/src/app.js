// LEONIDA POSTCARD — a Vice City cover studio.
// Turns a person's own photos into GTA-style postcard cover art from Leonida:
// multi-panel layouts, gradient-map colour grades, a stamp and postmark,
// a heat meter of stars, and PNG export in the three common post sizes.
// Everything runs locally in the browser; photos never leave the machine.

'use strict';

/* ------------------------------------------------------------------ data */

const LAYOUTS = [
  { id: 'hero3', label: 'Hero + 3' },
  { id: 'fullbleed', label: 'Full bleed' },
  { id: 'nine', label: 'Nine panel' },
  { id: 'tilted', label: 'Tilted snaps' },
  { id: 'split', label: 'Split day/night' },
  { id: 'postcard', label: 'Postcard frame' },
];

const GRADES = [
  { id: 'sunset', label: 'Vice Sunset' },
  { id: 'neon', label: 'Neon Night' },
  { id: 'gold', label: 'Palm Gold' },
  { id: 'teal', label: 'Ocean Teal' },
  { id: 'mono', label: 'Mono Noir' },
];

// Gradient-map ramps: luminance stop -> [r, g, b].
const RAMPS = {
  sunset: [[0, [26, 8, 44]], [0.25, [96, 30, 86]], [0.5, [216, 84, 44]], [0.75, [246, 152, 64]], [1, [255, 226, 170]]],
  neon: [[0, [8, 10, 38]], [0.3, [54, 16, 94]], [0.55, [200, 38, 110]], [0.8, [36, 176, 214]], [1, [216, 250, 255]]],
  gold: [[0, [30, 16, 4]], [0.35, [112, 62, 12]], [0.65, [219, 156, 38]], [1, [255, 244, 198]]],
  teal: [[0, [4, 32, 40]], [0.35, [10, 86, 96]], [0.65, [31, 160, 152]], [1, [218, 255, 244]]],
  mono: [[0, [8, 8, 10]], [0.5, [130, 126, 122]], [1, [252, 248, 240]]],
};

const SIZES = [
  { id: 'wide', label: '1920 x 1080', w: 1920, h: 1080 },
  { id: 'story', label: '1080 x 1350', w: 1080, h: 1350 },
  { id: 'square', label: '1080 x 1080', w: 1080, h: 1080 },
];

const TITLE_PRESETS = ['NEON SHORE', 'NIGHT SHIFT', 'PIER PRESSURE', 'PALM HOUR', 'VICE MAIL'];

const SAMPLES = [
  { src: 'samples/boulevard.jpg', name: 'Sample — boulevard', focus: { x: 0.50, y: 0.30 } },
  { src: 'samples/pier.jpg', name: 'Sample — pier', focus: { x: 0.32, y: 0.30 } },
];

function defaultPanels() {
  const rows = [
    { photo: 0, x: 0.50, y: 1.60, zoom: 1.05 },
    { photo: 1, x: 0.32, y: 1.20, zoom: 1.05 },
    { photo: 0, x: 0.50, y: 1.45, zoom: 1.05 },
    { photo: 1, x: 0.32, y: 1.20, zoom: 1.05 },
    { photo: 0, x: 0.50, y: 1.40, zoom: 1.05 },
    { photo: 1, x: 0.32, y: 1.15, zoom: 1.05 },
    { photo: 0, x: 0.50, y: 1.40, zoom: 1.05 },
    { photo: 1, x: 0.32, y: 1.15, zoom: 1.05 },
    { photo: 0, x: 0.50, y: 1.35, zoom: 1.05 },
  ];
  return rows.map((p) => ({ ...p }));
}

const state = {
  layout: 'hero3',
  grade: 'sunset',
  caption: 'NEON SHORE',
  subtitle: 'wish you were here',
  stampTitle: 'LEONIDA 25¢',
  stampPlace: 'VICE CITY',
  postmarkPlace: 'VICE CITY',
  heat: 4,
  grain: true,
  vignette: true,
  halftone: true,
  ribbon: true,
  size: 'wide',
  panels: defaultPanels(),
  selectedPanel: 0,
};

const photos = []; // { name, img, focus }
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
for (const g of GRADES) LUTS[g.id] = buildLUT(RAMPS[g.id]);

function gradedCanvas(photo, gradeId) {
  const key = photo.name + '|' + gradeId;
  if (gradedCache.has(key)) return gradedCache.get(key);
  const img = photo.img;
  const scale = Math.min(1, 1600 / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0, w, h);
  const data = cx.getImageData(0, 0, w, h);
  const px = data.data;
  const lut = LUTS[gradeId];
  const mix = 0.52;
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
  gradedCache.set(key, c);
  return c;
}

/* -------------------------------------------------------------- geometry */

// Panel rectangles for the grid layouts. Returns { tb, rects } where tb is
// the title-block height; rects are the photo areas in draw order.
function gridPanels(layout, W, H) {
  const g = Math.max(6, Math.round(W * 0.006));
  const tb = Math.round(H * 0.215);
  const photoH = H - tb;
  if (layout === 'fullbleed') return { tb, rects: [{ x: 0, y: 0, w: W, h: H }] };
  if (layout === 'split') {
    const w = (W - g) / 2;
    return { tb, rects: [{ x: 0, y: 0, w, h: photoH }, { x: w + g, y: 0, w, h: photoH }] };
  }
  if (layout === 'nine') {
    const cw = (W - 2 * g) / 3;
    const ch = (photoH - 2 * g) / 3;
    const rects = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) rects.push({ x: c * (cw + g), y: r * (ch + g), w: cw, h: ch });
    return { tb, rects };
  }
  // hero3
  const heroH = Math.round(photoH * 0.70);
  const smallY = heroH + g;
  const smallH = photoH - smallY;
  const cw = (W - 2 * g) / 3;
  return {
    tb,
    rects: [
      { x: 0, y: 0, w: W, h: heroH },
      { x: 0, y: smallY, w: cw, h: smallH },
      { x: cw + g, y: smallY, w: cw, h: smallH },
      { x: 2 * (cw + g), y: smallY, w: cw, h: smallH },
    ],
  };
}

// Tilted snapshot cards: polaroid-style cards over a sunset gradient.
// Returns cards in draw order (back card first), each with its photo rect
// in card-local coordinates plus the panel index it shows.
function tiltedCards(W, H) {
  const tb = Math.round(H * 0.215);
  const areaH = H - tb;
  let cw = W * 0.335;
  let ch = cw * 1.40;
  if (ch > areaH * 0.94) { ch = areaH * 0.94; cw = ch / 1.40; }
  const border = cw * 0.045;
  const bottom = cw * 0.14;
  const defs = [
    { panel: 3, fx: 0.335, fy: 0.16, rot: -7 },
    { panel: 0, fx: 0.185, fy: 0.47, rot: -4.5 },
    { panel: 2, fx: 0.825, fy: 0.45, rot: 4 },
    { panel: 1, fx: 0.505, fy: 0.53, rot: 2 },
  ];
  return {
    tb,
    cards: defs.map((d) => ({
      panel: d.panel,
      cx: d.fx * W,
      cy: d.fy * areaH,
      rot: (d.rot * Math.PI) / 180,
      cardW: cw,
      cardH: ch,
      photo: { x: -cw / 2 + border, y: -ch / 2 + border, w: cw - 2 * border, h: ch - border - bottom },
    })),
  };
}

// Postcard frame layout: a paper frame on a dark table, photos inside.
function postcardFrame(W, H) {
  const m = Math.round(Math.min(W, H) * 0.045);
  const frame = { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
  const p = Math.round(frame.w * 0.02);
  const ix = frame.x + p;
  const iy = frame.y + p;
  const iw = frame.w - 2 * p;
  const ih = frame.h - 2 * p;
  const titleH = Math.round(ih * 0.17);
  const photoH = ih - titleH;
  const g = Math.max(5, Math.round(iw * 0.008));
  const heroH = Math.round(photoH * 0.68);
  const smallY = iy + heroH + g;
  const smallH = iy + photoH - smallY;
  const cw = (iw - 2 * g) / 3;
  return {
    frame,
    title: { x: ix, y: iy + photoH, w: iw, h: titleH },
    rects: [
      { x: ix, y: iy, w: iw, h: heroH },
      { x: ix, y: smallY, w: cw, h: smallH },
      { x: ix + cw + g, y: smallY, w: cw, h: smallH },
      { x: ix + 2 * (cw + g), y: smallY, w: cw, h: smallH },
    ],
  };
}

function panelCount() {
  return { hero3: 4, fullbleed: 1, nine: 9, tilted: 4, split: 2, postcard: 4 }[state.layout] || 4;
}

function panelAt(index) {
  if (!state.panels[index]) {
    state.panels[index] = { ...(defaultPanels()[index] || { photo: 0, x: 0.5, y: 1.1, zoom: 1.05 }) };
  }
  return state.panels[index];
}

/* --------------------------------------------------------------- drawing */

// Draw one graded photo into a rect using the focal model:
// x = the photo fraction sitting at the panel's centre,
// y = 1 + downward shift measured in panel heights.
function drawPhoto(ctx, photo, gradeId, panel, rect) {
  const src = gradedCanvas(photo, gradeId);
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
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(src, dx, dy, dw, dh);
  ctx.restore();
  return { s, iw, ih };
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + rad * Math.cos(a);
    const y = cy + rad * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
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

function drawStamp(ctx, rightX, topY, w) {
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
  ctx.strokeStyle = '#c2185b';
  ctx.strokeRect(-w / 2 + w * 0.055, -h / 2 + w * 0.055, w * 0.89, h - w * 0.11);
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8115f';
  const tSize = fitFont(ctx, state.stampTitle, 'Anton', w * 0.20, w * 0.86);
  ctx.font = `${tSize}px Anton, sans-serif`;
  ctx.fillText(state.stampTitle, 0, -h * 0.08);
  ctx.fillStyle = '#3a2c22';
  ctx.font = `${Math.round(w * 0.105)}px Anton, sans-serif`;
  ctx.fillText('★ ' + state.stampPlace + ' ★', 0, h * 0.16);
  ctx.font = `${Math.round(w * 0.09)}px Anton, sans-serif`;
  ctx.fillText('PAR AVION', 0, h * 0.36);
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
  ctx.font = `${Math.round(r * 0.24)}px Anton, sans-serif`;
  arcText(ctx, 'LEONIDA', 0, 0, r * 0.90, -Math.PI * 0.80, -Math.PI * 0.20, false);
  arcText(ctx, state.postmarkPlace, 0, 0, r * 0.90, Math.PI * 0.80, Math.PI * 0.20, true);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const now = new Date();
  ctx.font = `${Math.round(r * 0.34)}px Anton, sans-serif`;
  ctx.fillText(months[now.getMonth()] + ' ' + now.getDate(), 0, -r * 0.06);
  ctx.font = `${Math.round(r * 0.20)}px Anton, sans-serif`;
  ctx.fillText('★', 0, r * 0.24);
  ctx.restore();
}

function drawHeat(ctx, rightX, cy, starR, label) {
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffb52e';
  ctx.font = `${Math.round(starR * 0.62)}px Anton, sans-serif`;
  if (label) ctx.fillText('HEAT', rightX, cy - starR * 1.25);
  const gap = starR * 2.25;
  for (let i = 0; i < 5; i++) {
    const lit = i < state.heat;
    drawStar(ctx, rightX - starR - (4 - i) * gap, cy, starR, lit ? '#ffb52e' : 'rgba(120,96,160,0.55)');
  }
  ctx.fillStyle = '#cfc0ea';
  ctx.font = `${Math.round(starR * 0.5)}px 'Segoe UI', sans-serif`;
  ctx.fillText(state.heat + '/5', rightX, cy + starR * 1.55);
}

function drawRibbon(ctx, x, y, w, h) {
  ctx.save();
  const slant = h * 0.55;
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = '#ff2e88';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = fitFont(ctx, '★ GREETINGS FROM LEONIDA ★', 'Anton', h * 0.52, w * 0.9);
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.fillText('★ GREETINGS FROM LEONIDA ★', x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function drawTitleBlock(ctx, W, H, tb) {
  const y0 = H - tb;
  ctx.fillStyle = '#1d0b31';
  ctx.fillRect(0, y0, W, tb);
  if (state.halftone) {
    const step = tb * 0.105;
    ctx.fillStyle = 'rgba(255,120,190,0.10)';
    for (let row = 0, yy = y0 + step * 0.6; yy < H; row++, yy += step) {
      for (let xx = (row % 2) * step * 0.5 + step * 0.4; xx < W; xx += step) {
        ctx.beginPath();
        ctx.arc(xx, yy, step * 0.17, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(0, y0, W, Math.max(3, tb * 0.03));
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const capSize = fitFont(ctx, state.caption || 'UNTITLED', 'Anton', tb * 0.54, W * 0.49);
  ctx.font = `${capSize}px Anton, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(state.caption || 'UNTITLED', W * 0.028, y0 + tb * 0.60);
  ctx.save();
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = tb * 0.13;
  ctx.fillStyle = '#ff8ac2';
  const subSize = fitFont(ctx, state.subtitle || '', 'Pacifico', tb * 0.30, W * 0.55);
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.fillText(state.subtitle || '', W * 0.032, y0 + tb * 0.92);
  ctx.restore();
  drawHeat(ctx, W * 0.975, y0 + tb * 0.46, tb * 0.145, true);
  if (state.ribbon) {
    const rh = tb * 0.21;
    drawRibbon(ctx, W * 0.545, H - rh - tb * 0.03, W * 0.45, rh);
  }
}

let noisePattern = null;
function makeNoise(ctx) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const cx = c.getContext('2d');
  const img = cx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = 16;
  }
  cx.putImageData(img, 0, 0);
  noisePattern = ctx.createPattern(c, 'repeat');
}

function sunsetBackdrop(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#2a1052');
  grad.addColorStop(0.45, '#7c1d64');
  grad.addColorStop(0.78, '#e0492e');
  grad.addColorStop(1, '#f58a3c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

/* ------------------------------------------------------------ the render */

const renderInfo = { rects: [], scales: [], W: 0, H: 0, tilted: null };

function renderCover(ctx, W, H, forExport) {
  renderInfo.rects = [];
  renderInfo.scales = [];
  renderInfo.tilted = null;
  renderInfo.W = W; renderInfo.H = H;
  ctx.clearRect(0, 0, W, H);
  const photoAt = (panel) => photos[Math.min(panel.photo, photos.length - 1)];

  if (state.layout === 'tilted') {
    sunsetBackdrop(ctx, W, H);
    const { tb, cards } = tiltedCards(W, H);
    renderInfo.tilted = { cards, tb };
    for (const card of cards) {
      const panel = panelAt(card.panel);
      ctx.save();
      ctx.translate(card.cx, card.cy);
      ctx.rotate(card.rot);
      ctx.shadowColor = 'rgba(10,0,20,0.5)';
      ctx.shadowBlur = W * 0.02;
      ctx.shadowOffsetY = W * 0.008;
      ctx.fillStyle = '#fff8ea';
      ctx.fillRect(-card.cardW / 2, -card.cardH / 2, card.cardW, card.cardH);
      ctx.shadowColor = 'transparent';
      if (photos.length) {
        const info = drawPhoto(ctx, photoAt(panel), state.grade, panel, card.photo);
        renderInfo.scales[card.panel] = info;
      }
      ctx.restore();
    }
    applyAtmosphere(ctx, W, H, 0, H - tb);
    const stamp = drawStamp(ctx, W * 0.988, H * 0.018, W * 0.115);
    drawPostmark(ctx, stamp.left + stamp.w * 0.16, stamp.top + stamp.h * 0.78, stamp.w * 0.52);
    drawTitleBlock(ctx, W, H, tb);
  } else if (state.layout === 'postcard') {
    sunsetBackdrop(ctx, W, H);
    const pf = postcardFrame(W, H);
    renderInfo.rects = pf.rects;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = W * 0.025;
    ctx.shadowOffsetY = W * 0.01;
    ctx.fillStyle = '#fff6e8';
    ctx.fillRect(pf.frame.x, pf.frame.y, pf.frame.w, pf.frame.h);
    ctx.restore();
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(pf.rects[0].x, pf.rects[0].y, pf.title.w, pf.rects[3].y + pf.rects[3].h - pf.rects[0].y);
    pf.rects.forEach((rect, i) => {
      const panel = panelAt(i);
      if (photos.length) renderInfo.scales[i] = drawPhoto(ctx, photoAt(panel), state.grade, panel, rect);
    });
    applyAtmosphere(ctx, W, H, pf.frame.y, pf.title.y);
    const stamp = drawStamp(ctx, pf.frame.x + pf.frame.w * 0.985, pf.frame.y + pf.frame.h * 0.02, pf.frame.w * 0.115);
    drawPostmark(ctx, stamp.left + stamp.w * 0.16, stamp.top + stamp.h * 0.78, stamp.w * 0.52);
    // Title row on the paper. The ribbon is drawn first, straddling the
    // photo area's lower edge, so the lettering stays readable over it.
    const t = pf.title;
    if (state.ribbon) {
      const rh = t.h * 0.34;
      drawRibbon(ctx, t.x + t.w * 0.52, t.y - rh / 2, t.w * 0.48, rh);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const capSize = fitFont(ctx, state.caption || 'UNTITLED', 'Anton', t.h * 0.5, t.w * 0.60);
    ctx.font = `${capSize}px Anton, sans-serif`;
    ctx.fillStyle = '#241040';
    ctx.fillText(state.caption || 'UNTITLED', t.x, t.y + t.h * 0.52);
    const subSize = fitFont(ctx, state.subtitle || '', 'Pacifico', t.h * 0.27, t.w * 0.55);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#d8115f';
    ctx.fillText(state.subtitle || '', t.x + t.w * 0.005, t.y + t.h * 0.88);
    drawHeatOnPaper(ctx, t.x + t.w * 0.995, t.y + t.h * 0.48, t.h * 0.13);
  } else {
    const { tb, rects } = gridPanels(state.layout, W, H);
    renderInfo.rects = rects;
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(0, 0, W, H);
    rects.forEach((rect, i) => {
      const panel = panelAt(i);
      if (!photos.length) return;
      const gradeId = state.layout === 'split' && i === 1 ? 'neon' : state.grade;
      renderInfo.scales[i] = drawPhoto(ctx, photoAt(panel), gradeId, panel, rect);
    });
    applyAtmosphere(ctx, W, H, 0, state.layout === 'fullbleed' ? H : H - tb);
    const stamp = drawStamp(ctx, W * 0.988, H * 0.018, W * 0.115);
    drawPostmark(ctx, stamp.left + stamp.w * 0.16, stamp.top + stamp.h * 0.78, stamp.w * 0.52);
    if (state.layout === 'fullbleed') {
      ctx.fillStyle = 'rgba(24,8,42,0.88)';
      ctx.fillRect(0, H - tb, W, tb);
      drawTitleBlockContents(ctx, W, H, tb);
    } else {
      drawTitleBlock(ctx, W, H, tb);
    }
  }

  if (state.grain) {
    if (!noisePattern) makeNoise(ctx);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = noisePattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  if (!forExport) drawSelection(ctx, W, H);
}

function drawHeatOnPaper(ctx, rightX, cy, starR) {
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8a6d1f';
  ctx.font = `${Math.round(starR * 0.62)}px Anton, sans-serif`;
  ctx.fillText('HEAT', rightX, cy - starR * 1.25);
  const gap = starR * 2.25;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, rightX - starR - (4 - i) * gap, cy, starR, i < state.heat ? '#f5a623' : 'rgba(90,70,40,0.30)');
  }
}

// The fullbleed layout paints its own translucent block first, then this
// lettering pass (the same lettering as the title block, minus its opaque
// fill and halftone dots, which would muddy the photo showing through).
function drawTitleBlockContents(ctx, W, H, tb) {
  const y0 = H - tb;
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(0, y0, W, Math.max(3, tb * 0.03));
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const capSize = fitFont(ctx, state.caption || 'UNTITLED', 'Anton', tb * 0.54, W * 0.49);
  ctx.font = `${capSize}px Anton, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(state.caption || 'UNTITLED', W * 0.028, y0 + tb * 0.60);
  ctx.save();
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = tb * 0.13;
  ctx.fillStyle = '#ff8ac2';
  const subSize = fitFont(ctx, state.subtitle || '', 'Pacifico', tb * 0.30, W * 0.55);
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.fillText(state.subtitle || '', W * 0.032, y0 + tb * 0.92);
  ctx.restore();
  drawHeat(ctx, W * 0.975, y0 + tb * 0.46, tb * 0.145, true);
  if (state.ribbon) {
    const rh = tb * 0.21;
    drawRibbon(ctx, W * 0.545, H - rh - tb * 0.03, W * 0.45, rh);
  }
}

function applyAtmosphere(ctx, W, H, top, bottom) {
  if (!state.vignette) return;
  const cx = W / 2;
  const cy = (top + bottom) / 2;
  const r0 = Math.min(W, bottom - top) * 0.42;
  const r1 = Math.max(W, bottom - top) * 0.82;
  const grad = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  grad.addColorStop(0, 'rgba(12,0,24,0)');
  grad.addColorStop(1, 'rgba(12,0,24,0.40)');
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, W, bottom - top);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(0, top, W, bottom - top);
  ctx.restore();
}

function drawSelection(ctx, W, H) {
  const idx = state.selectedPanel;
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, W * 0.0022);
  ctx.setLineDash([W * 0.012, W * 0.008]);
  if (state.layout === 'tilted' && renderInfo.tilted) {
    const card = renderInfo.tilted.cards.find((c) => c.panel === idx);
    if (card) {
      ctx.translate(card.cx, card.cy);
      ctx.rotate(card.rot);
      ctx.strokeRect(card.photo.x, card.photo.y, card.photo.w, card.photo.h);
    }
  } else {
    const rect = renderInfo.rects[idx];
    if (rect) ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- editor */

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');
const els = {};
for (const id of ['fileInput', 'photoStrip', 'layoutBar', 'gradeBar', 'sizeBar', 'presetRow', 'panelPhoto', 'panelZoom', 'panelX', 'panelY', 'captionInput', 'subtitleInput', 'stampTitleInput', 'postmarkInput', 'heatStars', 'grainToggle', 'vignetteToggle', 'halftoneToggle', 'ribbonToggle', 'exportBtn', 'undoBtn', 'redoBtn', 'stage']) {
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
  return JSON.stringify({ ...state, panels: state.panels.map((p) => ({ ...p })) });
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
      panelAt(state.selectedPanel).photo = i;
      state.panels[state.selectedPanel] = panelAt(state.selectedPanel);
      pushHistory(true);
      syncPanelControls();
      renderPreview();
    });
    els.photoStrip.appendChild(img);
  });
  els.panelPhoto.innerHTML = '';
  photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = 'Photo ' + (i + 1) + ' — ' + photo.name;
    els.panelPhoto.appendChild(opt);
  });
}

function buildHeatStars() {
  els.heatStars.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = '★';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(i === state.heat));
    if (i <= state.heat) b.classList.add('lit');
    b.addEventListener('click', () => {
      state.heat = state.heat === i ? i - 1 : i;
      pushHistory(true);
      buildHeatStars();
      renderPreview();
    });
    els.heatStars.appendChild(b);
  }
}

function syncPanelControls() {
  const p = panelAt(state.selectedPanel);
  els.panelPhoto.value = String(Math.min(p.photo, Math.max(0, photos.length - 1)));
  els.panelZoom.value = String(p.zoom);
  els.panelX.value = String(p.x);
  els.panelY.value = String(p.y);
}

function syncControls() {
  buildButtons(els.layoutBar, LAYOUTS, state.layout, (id) => { state.layout = id; state.selectedPanel = 0; pushHistory(true); syncControls(); renderPreview(); });
  buildButtons(els.gradeBar, GRADES, state.grade, (id) => { state.grade = id; pushHistory(true); syncControls(); renderPreview(); });
  buildButtons(els.sizeBar, SIZES, state.size, (id) => { state.size = id; pushHistory(true); syncControls(); renderPreview(); });
  els.captionInput.value = state.caption;
  els.subtitleInput.value = state.subtitle;
  els.stampTitleInput.value = state.stampTitle;
  els.postmarkInput.value = state.postmarkPlace;
  els.grainToggle.checked = state.grain;
  els.vignetteToggle.checked = state.vignette;
  els.halftoneToggle.checked = state.halftone;
  els.ribbonToggle.checked = state.ribbon;
  buildHeatStars();
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
bindText(els.stampTitleInput, (v) => { state.stampTitle = v.toUpperCase(); });
bindText(els.postmarkInput, (v) => { state.postmarkPlace = v.toUpperCase(); });

for (const [el, key] of [[els.grainToggle, 'grain'], [els.vignetteToggle, 'vignette'], [els.halftoneToggle, 'halftone'], [els.ribbonToggle, 'ribbon']]) {
  el.addEventListener('change', () => { state[key] = el.checked; pushHistory(true); renderPreview(); });
}

els.panelPhoto.addEventListener('change', () => {
  const p = panelAt(state.selectedPanel);
  p.photo = Number(els.panelPhoto.value);
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
function addPhoto(name, img, focus) {
  photos.push({ name, img, focus: focus || { x: 0.5, y: 0.35 } });
  buildPhotoStrip();
  syncPanelControls();
  renderPreview();
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function loadSamples() {
  for (const sample of SAMPLES) {
    try {
      const img = await loadImage(sample.src);
      addPhoto(sample.name, img, sample.focus);
    } catch { /* sample missing: the studio still works with uploads */ }
  }
}
function addFiles(files) {
  for (const file of files) {
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
  if (state.layout === 'tilted' && renderInfo.tilted) {
    const cards = [...renderInfo.tilted.cards].reverse();
    for (const card of cards) {
      const dx = pt.x - card.cx;
      const dy = pt.y - card.cy;
      const cos = Math.cos(-card.rot);
      const sin = Math.sin(-card.rot);
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      if (lx >= card.photo.x && lx <= card.photo.x + card.photo.w && ly >= card.photo.y && ly <= card.photo.y + card.photo.h) return card.panel;
    }
    return -1;
  }
  for (let i = renderInfo.rects.length - 1; i >= 0; i--) {
    const r = renderInfo.rects[i];
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) return i;
  }
  return -1;
}
function activeRect(idx) {
  if (state.layout === 'tilted' && renderInfo.tilted) {
    const card = renderInfo.tilted.cards.find((c) => c.panel === idx);
    return card ? card.photo : null;
  }
  return renderInfo.rects[idx] || null;
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
  const rect = activeRect(drag.idx);
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
    a.download = `leonida-postcard-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
});

/* automation hook: the screenshot tooling drives the app through here */
function applyPatch(patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'panels' && Array.isArray(value)) {
      state.panels = value.map((p) => ({ photo: 0, x: 0.5, y: 1.1, zoom: 1.05, ...p }));
    } else if (key in state) {
      state[key] = value;
    }
  }
  syncControls();
  renderPreview();
}
Object.defineProperty(window, '__postcard', {
  configurable: true,
  value: {
    get photos() { return photos.length; },
    setState(patch) { applyPatch(patch); },
    getState() { return JSON.parse(snapshot()); },
    async exportPNGDataURL(w, h) {
      await document.fonts.ready;
      return exportCanvas(w, h).toDataURL('image/png');
    },
  },
});

/* boot */
syncControls();
renderPreview();
history.push(snapshot());
historyIndex = 0;
syncHistoryButtons();
Promise.all([
  document.fonts.load('80px Anton'),
  document.fonts.load('40px Pacifico'),
]).then(() => renderPreview()).catch(() => {});
loadSamples();
