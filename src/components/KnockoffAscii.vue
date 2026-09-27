<script setup>
// turns a photo into colored ascii letters that you can smash away with the mouse
// to reveal the real photo underneath (the <img> sits behind this canvas).
//
// how the drawing works:
//   - backing: the letters that are still standing, drawn once per layout
//   - glyphs: every letter with no background, used to make falling sprites
//   - glow: a brightened copy, stamped over cells near the cursor for the trail
// every frame just copies backing, then adds the glow and flying letters on top.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { play } from '../sound.js';

const props = defineProps({
  source: String,
  description: String,
  columns: Number,
  cellSize: Number,
  visible: Boolean,
  reducedMotion: Boolean,
  resetVersion: Number,
  controlsTo: { type: Object, default: null },
});
const emit = defineEmits(['error']);

// dark to bright
const characters = ' .,:;i1tfLCG08@';

const canvas = ref(null);
const remaining = ref(0);
const hammerSize = ref(2);
// on a touchscreen a drag over the letters scrolls the page like anywhere else, and
// a tap still knocks one letter out. the hammer button arms it so a drag smashes
// instead. a mouse always smashes
const armed = ref(false);
let tap = null;
const hammerSlider = ref(null);
let hammerDragging = false;

// the hammer slider runs 1 (bottom) to 7 (top) in quarter steps, dragged or with the keys
function setHammer(value) {
  hammerSize.value = Math.max(1, Math.min(7, Math.round(value * 4) / 4));
}

// upright on big screens, flat under the photo on phones
function hammerAt(event) {
  const rect = hammerSlider.value.getBoundingClientRect();
  const along = rect.width > rect.height
    ? (event.clientX - rect.left - 5.5) / (rect.width - 11)
    : (rect.bottom - event.clientY - 5.5) / (rect.height - 11);
  setHammer(1 + along * 6);
}

function hammerDown(event) {
  if (event.button !== 0) return;
  hammerDragging = true;
  hammerSlider.value.setPointerCapture(event.pointerId);
  hammerSlider.value.focus();
  hammerAt(event);
}

function hammerKeys(event) {
  const steps = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5, PageUp: 1.5, PageDown: -1.5 };
  if (event.key === 'Home') setHammer(1);
  else if (event.key === 'End') setHammer(7);
  else if (event.key in steps) setHammer(hammerSize.value + steps[event.key]);
  else return;
  event.preventDefault();
}

let picture;
let observer;
let cells = [];
let particles = [];
let frame = 0;
let lastTime = 0;
let width = 0;
let height = 0;
let cellWidth = 0;
let cellHeight = 0;
let cols = 0;
let rows = 0;
let disposed = false;
let backing;
let glyphs;
let glow;
let drag = null;
const trail = [];

// Keep only cleared cell IDs and the grid they belong to. Density changes
// sample the old grid at each new cell's center, snapping holes to whole cells.
const cleared = new Map();

function revealState() {
  if (!cleared.has(props.source)) cleared.set(props.source, { cols, rows, gone: new Set() });
  return cleared.get(props.source);
}

function removed() {
  return revealState().gone;
}

function remapClearedCells() {
  const state = revealState();
  if (state.cols === cols && state.rows === rows) return;
  const gone = new Set();
  if (state.gone.size && state.cols && state.rows) {
    for (let row = 0; row < rows; row++) {
      const oldRow = Math.min(state.rows - 1, Math.floor((row + 0.5) * state.rows / rows));
      for (let col = 0; col < cols; col++) {
        const oldCol = Math.min(state.cols - 1, Math.floor((col + 0.5) * state.cols / cols));
        if (state.gone.has(oldRow * state.cols + oldCol)) gone.add(row * cols + col);
      }
    }
  }
  Object.assign(state, { cols, rows, gone });
}

function hitRadius() {
  return Math.max(40, Math.min(width, height) * 0.24) * hammerSize.value / 5 * 0.7;
}

function draw() {
  if (!canvas.value) return;
  const ctx = canvas.value.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  // still loading, so cover the real photo underneath with the ascii background
  // instead of letting it flash through before the letters are ready
  if (!backing) {
    ctx.fillStyle = '#15151e';
    ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);
    return;
  }

  ctx.drawImage(backing, 0, 0, width, height);

  // mouse trail. meant to look like the wallpaper's effect: 14 bright spots
  // that shrink over a second with a steep falloff
  const now = performance.now();
  const gone = removed();
  while (trail.length && now - trail[0].time >= 1000) trail.shift();

  // with tiny letters (high detail) there are thousands under the cursor, so instead of
  // lighting them one by one, show the bright copy through circles. glow has the same
  // holes knocked out as backing, so empty cells stay empty
  const cellsUnderCursor = (hitRadius() * 2 / cellWidth) * (hitRadius() * 2 / cellHeight);
  if (cellsUnderCursor > 2000) {
    ctx.save();
    ctx.beginPath();
    for (const point of trail) {
      const radius = hitRadius() * Math.max(0, 1 - (now - point.time) / 1000) ** 6;
      if (radius < 0.5) continue;
      ctx.moveTo(point.x + radius, point.y);
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    }
    ctx.clip();
    ctx.drawImage(glow, 0, 0, width, height);
    ctx.restore();
    drawParticles(ctx);
    return;
  }

  const lit = new Set();
  for (const point of trail) {
    const radius = hitRadius() * Math.max(0, 1 - (now - point.time) / 1000) ** 6;
    const firstRow = Math.max(0, Math.floor((point.y - radius) / cellHeight));
    const lastRow = Math.min(rows - 1, Math.floor((point.y + radius) / cellHeight));
    const firstCol = Math.max(0, Math.floor((point.x - radius) / cellWidth));
    const lastCol = Math.min(cols - 1, Math.floor((point.x + radius) / cellWidth));

    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        const cell = cells[row * cols + col];
        if (!gone.has(cell.id) && Math.hypot(cell.x - point.x, cell.y - point.y) < radius) lit.add(cell.id);
      }
    }
  }
  for (const id of lit) stamp(ctx, glow, cells[id], cells[id].x, cells[id].y);
  drawParticles(ctx);
}

function drawParticles(ctx) {
  for (const particle of particles) {
    const cosine = Math.cos(particle.angle);
    const sine = Math.sin(particle.angle);
    ctx.setTransform(cosine, sine, -sine, cosine, particle.x, particle.y);
    ctx.drawImage(particle.sprite, -particle.sprite.width / 2, -particle.sprite.height / 2);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// copies one cell from a source canvas, centered on x/y
function stamp(ctx, source, cell, x, y) {
  const sx = (cell.id % cols) * cellWidth;
  const sy = Math.floor(cell.id / cols) * cellHeight;
  ctx.drawImage(source, sx, sy, cellWidth, cellHeight, x - cellWidth / 2, y - cellHeight / 2, cellWidth, cellHeight);
}

function schedule() {
  if (frame || (!particles.length && !trail.length)) return;
  lastTime = performance.now();
  frame = requestAnimationFrame(animate);
}

function stop() {
  endDrag();
  cancelAnimationFrame(frame);
  frame = 0;
  particles = [];
  trail.length = 0;
  draw();
}

function animate(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.035);
  lastTime = now;

  for (const particle of particles) {
    particle.vy += 650 * dt; // gravity
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.angle += particle.spin * dt;
  }
  particles = particles.filter(p => p.y < height + p.margin && p.x > -p.margin && p.x < width + p.margin);

  draw();
  frame = particles.length || trail.length ? requestAnimationFrame(animate) : 0;
}

// each hit makes at most this many flying sprites, with this many in the air at once.
// at max detail one big hit can break thousands of letters, and a new canvas per
// letter (or per 4x3 block) froze the page for half a second at a time
const spritesPerHit = 60;
const maxSprites = 300;

function fallingLetters(broken, x, y) {
  const budget = Math.min(spritesPerHit, maxSprites - particles.length);
  if (props.reducedMotion || !broken.length || budget <= 0) return;

  // group neighbouring letters into roughly square chunks, never smaller than about
  // 8px so tiny letters still fly as something visible, and big enough that this hit fits the budget
  const rowsFor = groupCols => Math.max(1, Math.round(groupCols * cellWidth / cellHeight));
  let groupCols = Math.max(1, Math.ceil(8 / cellWidth));
  while (broken.length / (groupCols * rowsFor(groupCols)) > budget) groupCols++;
  const groupRows = rowsFor(groupCols);

  const groups = new Map();
  for (const cell of broken) {
    const col = Math.floor((cell.id % cols) / groupCols) * groupCols;
    const row = Math.floor(Math.floor(cell.id / cols) / groupRows) * groupRows;
    const key = row * cols + col;
    if (!groups.has(key)) groups.set(key, { col, row, cells: [] });
    groups.get(key).cells.push(cell);
  }

  // chunks at the edge of the hit are partly empty, so the count can run a little over
  for (const group of [...groups.values()].slice(0, budget)) {
    const left = group.col * cellWidth;
    const top = group.row * cellHeight;
    const sprite = document.createElement('canvas');
    sprite.width = Math.ceil(Math.min(groupCols, cols - group.col) * cellWidth);
    sprite.height = Math.ceil(Math.min(groupRows, rows - group.row) * cellHeight);

    const pen = sprite.getContext('2d');
    for (const cell of group.cells) stamp(pen, glyphs, cell, cell.x - left, cell.y - top);

    const centerX = left + sprite.width / 2;
    const centerY = top + sprite.height / 2;
    particles.push({
      sprite,
      x: centerX,
      y: centerY,
      margin: Math.hypot(sprite.width, sprite.height),
      // fly away from where you hit
      vx: (centerX - x) * 3 + (Math.random() - 0.5) * 60,
      vy: -80 - Math.random() * 130,
      angle: 0,
      spin: (Math.random() - 0.5) * 7,
    });
  }
}

// knocks out the letters around x/y
function knock(x, y, repaint = true) {
  if (!props.visible || document.hidden || !cells.length) return;

  const radius = hitRadius();
  const gone = removed();
  const coreRadius = Math.max(Math.hypot(cellWidth, cellHeight), radius * 0.82);
  const phase = Math.random() * Math.PI * 2;
  const ctx = backing.getContext('2d');
  const bright = glow.getContext('2d');
  const broken = [];

  const reach = Math.max(coreRadius, radius * 1.165);
  const firstCol = Math.max(0, Math.floor((x - reach) / cellWidth));
  const lastCol = Math.min(cols - 1, Math.floor((x + reach) / cellWidth));
  const firstRow = Math.max(0, Math.floor((y - reach) / cellHeight));
  const lastRow = Math.min(rows - 1, Math.floor((y + reach) / cellHeight));

  for (let row = firstRow; row <= lastRow; row++) {
    for (let col = firstCol; col <= lastCol; col++) {
      const cell = cells[row * cols + col];
      if (gone.has(cell.id)) continue;

      // solid in the middle, with a wobbly random edge so it doesn't look like a perfect circle.
      // only letters outside the solid core need the (slower) wobble maths
      const distance = Math.hypot(cell.x - x, cell.y - y);
      if (distance > coreRadius) {
        const angle = Math.atan2(cell.y - y, cell.x - x);
        const edge = radius * (1 + 0.11 * Math.sin(angle * 3 + phase) + 0.055 * Math.cos(angle * 7 - phase));
        if (Math.random() >= (edge - distance) / (edge - coreRadius)) continue;
      }

      gone.add(cell.id);
      ctx.clearRect(cell.x - cellWidth / 2, cell.y - cellHeight / 2, cellWidth, cellHeight);
      bright.clearRect(cell.x - cellWidth / 2, cell.y - cellHeight / 2, cellWidth, cellHeight);
      broken.push(cell);
    }
  }

  fallingLetters(broken, x, y);
  if (broken.length) play('crumble', broken.length);
  remaining.value -= broken.length;
  // wipe the dark background too once every letter is gone
  if (!remaining.value) {
    ctx.clearRect(0, 0, width, height);
    bright.clearRect(0, 0, width, height);
  }

  if (repaint) {
    draw();
    schedule();
  }
}

// pointer position in canvas pixels, clamped to the canvas
function point(event) {
  const rect = canvas.value.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(width, (event.clientX - rect.left) * width / rect.width)),
    y: Math.max(0, Math.min(height, (event.clientY - rect.top) * height / rect.height)),
  };
}

function move(event) {
  if (!props.visible || document.hidden || !cells.length) return;
  if (drag && event.pointerId !== drag.id) return;

  const { x, y } = point(event);
  if (drag) {
    if (!(event.buttons & 1)) endDrag();
    else dragTo(x, y);
  }

  if (props.reducedMotion) return;
  trail.push({ x, y, time: performance.now() });
  if (trail.length > 14) trail.shift();
  schedule();
}

// mouse and touch are handled on pointerdown. this is just so screen readers
// and other assistive "clicks" still do something
function click(event) {
  if (event.detail === 0 && !event.pointerType) keyboard();
}

function startDrag(event) {
  if (event.pointerType === 'touch' && !armed.value) {
    tap = { id: event.pointerId, x: event.clientX, y: event.clientY };
    return;
  }
  // the press is the letters', not the window's or a swipe's
  event.stopPropagation();
  if (event.button !== 0 || !event.isPrimary || drag || !props.visible || !cells.length) return;
  event.preventDefault();
  canvas.value.focus({ preventScroll: true });
  canvas.value.setPointerCapture(event.pointerId);

  const p = point(event);
  drag = { id: event.pointerId, ...p };
  knock(p.x, p.y);
}

function dragTo(x, y, finish = false) {
  const distance = Math.hypot(x - drag.x, y - drag.y);
  const spacing = Math.max(4, hitRadius() * 0.45);
  if (distance < 0.5) return;
  if (distance < spacing && !finish) return;

  // pointer events can be far apart on fast drags, so fill in the gap with
  // evenly spaced hits and only repaint once at the end
  const steps = Math.max(1, Math.ceil(distance / spacing));
  const start = { ...drag };
  for (let i = 1; i <= steps; i++) {
    knock(start.x + (x - start.x) * i / steps, start.y + (y - start.y) * i / steps, false);
  }

  drag.x = x;
  drag.y = y;
  draw();
  schedule();
}

function pointerUp(event) {
  // an unarmed tap that didn't turn into a scroll or a swipe knocks where it landed
  if (tap?.id === event.pointerId) {
    const still = Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 10;
    tap = null;
    if (still && props.visible && cells.length) {
      const p = point(event);
      knock(p.x, p.y);
    }
    return;
  }
  if (drag?.id !== event.pointerId) return;
  const p = point(event);
  dragTo(p.x, p.y, true);
  endDrag();
}

function endDrag() {
  tap = null;
  const id = drag?.id;
  drag = null;
  if (id !== undefined && canvas.value?.hasPointerCapture(id)) canvas.value.releasePointerCapture(id);
}

// enter or space knocks out the first letter still standing
function keyboard() {
  const cell = cells.find(c => !removed().has(c.id));
  if (cell) knock(cell.x, cell.y);
}

const surface = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
};

// a drag on the detail slider can change the size many times a frame, so rebuilding
// waits for the next frame and only happens once, with the latest size
let layoutFrame = 0;
function layoutSoon() {
  if (layoutFrame) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    layout();
  });
}

// rebuilds the letter grid, runs on load and whenever the canvas resizes
function layout() {
  if (!canvas.value || !picture?.complete || !picture.naturalWidth) return;
  stop();

  width = canvas.value.clientWidth;
  height = canvas.value.clientHeight;
  if (!width || !height) return;

  canvas.value.width = Math.round(width);
  canvas.value.height = Math.round(height);
  canvas.value.getContext('2d').setTransform(1, 0, 0, 1, 0, 0);

  // a fixed cell size keeps letters the same size on every photo no matter its shape.
  // the 1.65 is roughly how much taller a monospace letter is than it is wide
  cols = props.columns || (props.cellSize ? Math.max(20, Math.round(width / props.cellSize)) : 70);
  rows = Math.max(1, Math.round(cols * height / width / 1.65));
  cellWidth = width / cols;
  cellHeight = height / rows;

  // shrink the photo down to one pixel per cell to get each cell's color.
  // crop it the same way the <img> underneath does (centered, object-fit: cover)
  const sample = document.createElement('canvas');
  sample.width = cols;
  sample.height = rows;
  const ctx = sample.getContext('2d', { willReadFrequently: true });
  const scale = Math.max(width / picture.naturalWidth, height / picture.naturalHeight);
  const sw = width / scale;
  const sh = height / scale;
  ctx.drawImage(picture, (picture.naturalWidth - sw) / 2, (picture.naturalHeight - sh) / 2, sw, sh, 0, 0, cols, rows);
  const pixels = ctx.getImageData(0, 0, cols, rows).data;

  // each cell's letter (by brightness), its colour lifted a little, and a much brighter
  // copy of that colour for the glow. the colours stay one pixel per cell
  const colors = new ImageData(cols, rows);
  const brightColors = new ImageData(cols, rows);
  const letterOf = new Uint8Array(cols * rows);
  for (let id = 0; id < cols * rows; id++) {
    const o = id * 4;
    const brightness = (0.2126 * pixels[o] + 0.7152 * pixels[o + 1] + 0.0722 * pixels[o + 2]) / 255;
    // never the space character, every cell gets something visible
    letterOf[id] = Math.max(1, Math.round(brightness * (characters.length - 1)));
    for (let k = 0; k < 3; k++) {
      const lifted = Math.min(255, pixels[o + k] * 1.25 + 20);
      colors.data[o + k] = lifted;
      brightColors.data[o + k] = Math.min(255, lifted * 2.4);
    }
    colors.data[o + 3] = 255;
    brightColors.data[o + 3] = 255;
  }
  cells = Array.from({ length: cols * rows }, (_, id) => ({
    id,
    x: ((id % cols) + 0.5) * cellWidth,
    y: (Math.floor(id / cols) + 0.5) * cellHeight,
  }));
  remapClearedCells();
  remaining.value = cells.length - removed().size;

  // drawing thousands of letters one by one, each in its own colour, is what made the
  // detail slider lag. instead each character is drawn once, in white, into a strip,
  // every cell is stamped from that strip, and then the colours go over all the letters
  // in one go: the one-pixel-per-cell colours stretched to full size without smoothing
  const slotWidth = Math.ceil(cellHeight) + 2;
  const slotHeight = Math.ceil(cellHeight * 1.3) + 2;
  const strip = surface(slotWidth * characters.length, slotHeight);
  const pen = strip.getContext('2d');
  pen.font = `bold ${cellHeight}px "Courier New", monospace`;
  pen.textAlign = 'center';
  pen.textBaseline = 'middle';
  pen.fillStyle = '#fff';
  for (let i = 1; i < characters.length; i++) pen.fillText(characters[i], (i + 0.5) * slotWidth, slotHeight / 2);

  const mask = surface(width, height);
  const stamps = mask.getContext('2d');
  for (const cell of cells) {
    stamps.drawImage(strip, letterOf[cell.id] * slotWidth, 0, slotWidth, slotHeight, cell.x - slotWidth / 2, cell.y - slotHeight / 2, slotWidth, slotHeight);
  }

  // the mask's letters, painted in one set of colours
  const colored = paint => {
    const small = surface(cols, rows);
    small.getContext('2d').putImageData(paint, 0, 0);
    const out = surface(width, height);
    const ink = out.getContext('2d');
    ink.drawImage(mask, 0, 0);
    ink.globalCompositeOperation = 'source-in';
    ink.imageSmoothingEnabled = false;
    ink.drawImage(small, 0, 0, width, height);
    return out;
  };

  glyphs = colored(colors);
  backing = surface(width, height);
  glow = surface(width, height);

  const base = backing.getContext('2d');
  base.fillStyle = '#15151e';
  base.fillRect(0, 0, width, height);
  base.drawImage(glyphs, 0, 0);

  // the glow is the same picture 2.4 times brighter, background included
  const bright = glow.getContext('2d');
  bright.fillStyle = 'rgb(50, 50, 72)';
  bright.fillRect(0, 0, width, height);
  bright.drawImage(colored(brightColors), 0, 0);

  // Bake the snapped holes into the cached background once, not every frame.
  for (const id of removed()) {
    const cell = cells[id];
    base.clearRect(cell.x - cellWidth / 2, cell.y - cellHeight / 2, cellWidth, cellHeight);
    bright.clearRect(cell.x - cellWidth / 2, cell.y - cellHeight / 2, cellWidth, cellHeight);
  }


  draw();
}

function load() {
  stop();
  cells = [];
  backing = null;
  glyphs = null;
  glow = null;
  remaining.value = 0;
  draw();

  // ignore late loads if the photo changed again in the meantime
  const next = new Image();
  picture = next;
  next.onload = () => {
    if (!disposed && picture === next) layout();
  };
  next.onerror = () => {
    if (!disposed && picture === next) emit('error');
  };
  next.src = props.source;
}

function visibility() {
  if (document.hidden) stop();
}

watch(() => props.source, load);
watch(() => [props.columns, props.cellSize], layoutSoon);

// the ascii button was pressed again, bring every letter back for this photo
watch(() => props.resetVersion, () => {
  cleared.delete(props.source);
  layout();
});

watch(() => [props.visible, props.reducedMotion], () => {
  if (!props.visible || props.reducedMotion) stop();
});

onMounted(() => {
  observer = new ResizeObserver(layoutSoon);
  observer.observe(canvas.value);
  document.addEventListener('visibilitychange', visibility);
  load();
});

onBeforeUnmount(() => {
  disposed = true;
  endDrag();
  cancelAnimationFrame(frame);
  cancelAnimationFrame(layoutFrame);
  observer?.disconnect();
  document.removeEventListener('visibilitychange', visibility);
});
</script>

<template>
  <canvas
    ref="canvas"
    class="ascii-knockoff"
    :class="{ armed }"
    role="button"
    :tabindex="visible ? 0 : -1"
    :aria-label="remaining
      ? `${description}. Click or drag, or press Enter or Space, to knock letters away and reveal the photo.`
      : `${description}. Photo fully revealed.`"
    @pointerdown="startDrag"
    @pointermove="move"
    @pointerup="pointerUp"
    @pointercancel="endDrag"
    @lostpointercapture="endDrag"
    @click.stop="click"
    @keydown.enter.stop.prevent="keyboard"
    @keydown.space.stop.prevent="keyboard"
  />

  <!-- hammer size slider, built like the ascii detail slider and stacked under the reset
       button. a big pixel circle marks the big end, a small one the small end. stops events
       so dragging it doesn't smash letters or move the window -->
  <Teleport :to="controlsTo || 'body'" :disabled="!controlsTo">
  <div v-show="visible" class="ascii-hammer raised" title="Hammer size" @click.stop @pointerdown.stop @pointermove.stop @keydown.stop>
    <svg width="11" height="11" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true">
      <path fill="currentColor" d="M3 0h5v1H3zM1 1h9v2H1zM0 3h11v5H0zM1 8h9v2H1zM3 10h5v1H3z"/>
    </svg>
    <div
      ref="hammerSlider"
      class="volume-slider density-slider"
      role="slider"
      :tabindex="visible ? 0 : -1"
      aria-label="Hammer size"
      aria-orientation="vertical"
      aria-valuemin="1"
      aria-valuemax="7"
      :aria-valuenow="hammerSize"
      :aria-valuetext="`Size ${hammerSize}`"
      :style="{ '--level': (hammerSize - 1) / 6 * 100 }"
      @pointerdown="hammerDown"
      @pointermove="hammerDragging && hammerAt($event)"
      @pointerup="hammerDragging = false"
      @pointercancel="hammerDragging = false"
      @lostpointercapture="hammerDragging = false"
      @keydown="hammerKeys"
    >
      <span class="volume-groove" />
      <span class="volume-thumb" />
    </div>
    <svg width="5" height="5" viewBox="0 0 5 5" shape-rendering="crispEdges" aria-hidden="true">
      <path fill="currentColor" d="M1 0h3v1H1zM0 1h5v3H0zM1 4h3v1H1z"/>
    </svg>
    <!-- touchscreens only: pressed in, a drag over the photo smashes letters instead of scrolling -->
    <button
      class="hammer-toggle raised"
      :class="{ pressed: armed }"
      :aria-pressed="armed"
      :title="armed ? 'Put the hammer down' : 'Pick up the hammer'"
      aria-label="Hammer"
      @click="armed = !armed"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
        <path fill="currentColor" d="M3 1h7v1h2v1h1v4h-2V5H9v2H8v1H6V7H5V5H3V4H2V2h1z"/>
        <path fill="#8a5a2b" d="M8 8h2v1h1v1h1v1h1v1h1v2h-2v-1h-1v-1h-1v-1H9V9H8z"/>
      </svg>
    </button>
  </div>
  </Teleport>
</template>
