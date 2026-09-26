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
});
const emit = defineEmits(['error']);

// dark to bright
const characters = ' .,:;i1tfLCG08@';

const canvas = ref(null);
const remaining = ref(0);
const hammerSize = ref(2);

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

function fallingLetters(broken, x, y) {
  if (props.reducedMotion || !broken.length) return;

  // small hits get one sprite per letter. big hits (or lots already flying)
  // group neighbouring letters into one sprite so we're not drawing thousands of things
  let groupCols = 1;
  if (particles.length > 400) groupCols = 4;
  else if (broken.length > 120 || particles.length > 120) groupCols = 3;
  const groupRows = groupCols === 4 ? 3 : groupCols === 3 ? 2 : 1;

  const groups = new Map();
  for (const cell of broken) {
    const col = Math.floor((cell.id % cols) / groupCols) * groupCols;
    const row = Math.floor(Math.floor(cell.id / cols) / groupRows) * groupRows;
    const key = row * cols + col;
    if (!groups.has(key)) groups.set(key, { col, row, cells: [] });
    groups.get(key).cells.push(cell);
  }

  for (const group of groups.values()) {
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

      // solid in the middle, with a wobbly random edge so it doesn't look like a perfect circle
      const distance = Math.hypot(cell.x - x, cell.y - y);
      const angle = Math.atan2(cell.y - y, cell.x - x);
      const edge = radius * (1 + 0.11 * Math.sin(angle * 3 + phase) + 0.055 * Math.cos(angle * 7 - phase));
      const edgeChance = Math.max(0, (edge - distance) / (edge - coreRadius));
      if (distance > coreRadius && Math.random() >= edgeChance) continue;

      gone.add(cell.id);
      ctx.clearRect(cell.x - cellWidth / 2, cell.y - cellHeight / 2, cellWidth, cellHeight);
      broken.push(cell);
    }
  }

  fallingLetters(broken, x, y);
  if (broken.length) play('crumble', broken.length);
  remaining.value -= broken.length;
  // wipe the dark background too once every letter is gone
  if (!remaining.value) ctx.clearRect(0, 0, width, height);

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
  if (drag?.id !== event.pointerId) return;
  const p = point(event);
  dragTo(p.x, p.y, true);
  endDrag();
}

function endDrag() {
  const id = drag?.id;
  drag = null;
  if (id !== undefined && canvas.value?.hasPointerCapture(id)) canvas.value.releasePointerCapture(id);
}

// enter or space knocks out the first letter still standing
function keyboard() {
  const cell = cells.find(c => !removed().has(c.id));
  if (cell) knock(cell.x, cell.y);
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

  const boost = value => Math.min(255, value * 1.25 + 20);
  cells = Array.from({ length: cols * rows }, (_, id) => {
    const [r, g, b] = pixels.subarray(id * 4, id * 4 + 3);
    const brightness = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return {
      id,
      x: ((id % cols) + 0.5) * cellWidth,
      y: (Math.floor(id / cols) + 0.5) * cellHeight,
      // never the space character, every cell gets something visible
      char: characters[Math.max(1, Math.round(brightness * (characters.length - 1)))],
      color: `rgb(${boost(r)},${boost(g)},${boost(b)})`,
    };
  });
  remapClearedCells();
  remaining.value = cells.length - removed().size;

  backing = document.createElement('canvas');
  glyphs = document.createElement('canvas');
  glow = document.createElement('canvas');
  for (const surface of [backing, glyphs, glow]) {
    surface.width = Math.ceil(width);
    surface.height = Math.ceil(height);
  }

  const letters = glyphs.getContext('2d');
  letters.font = `bold ${cellHeight}px "Courier New", monospace`;
  letters.textAlign = 'center';
  letters.textBaseline = 'middle';
  for (const cell of cells) {
    letters.fillStyle = cell.color;
    letters.fillText(cell.char, cell.x, cell.y);
  }

  const base = backing.getContext('2d');
  base.fillStyle = '#15151e';
  base.fillRect(0, 0, width, height);
  base.drawImage(glyphs, 0, 0);

  const bright = glow.getContext('2d');
  bright.filter = 'brightness(2.4)';
  bright.drawImage(backing, 0, 0);

  // Bake the snapped holes into the cached background once, not every frame.
  for (const id of removed()) {
    const cell = cells[id];
    base.clearRect(cell.x - cellWidth / 2, cell.y - cellHeight / 2, cellWidth, cellHeight);
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
watch(() => [props.columns, props.cellSize], layout);

// the ascii button was pressed again, bring every letter back for this photo
watch(() => props.resetVersion, () => {
  cleared.delete(props.source);
  layout();
});

watch(() => [props.visible, props.reducedMotion], () => {
  if (!props.visible || props.reducedMotion) stop();
});

onMounted(() => {
  observer = new ResizeObserver(layout);
  observer.observe(canvas.value);
  document.addEventListener('visibilitychange', visibility);
  load();
});

onBeforeUnmount(() => {
  disposed = true;
  endDrag();
  cancelAnimationFrame(frame);
  observer?.disconnect();
  document.removeEventListener('visibilitychange', visibility);
});
</script>

<template>
  <canvas
    ref="canvas"
    class="ascii-knockoff"
    role="button"
    :tabindex="visible ? 0 : -1"
    :aria-label="remaining
      ? `${description}. Click or drag, or press Enter or Space, to knock letters away and reveal the photo.`
      : `${description}. Photo fully revealed.`"
    @pointerdown.stop="startDrag"
    @pointermove="move"
    @pointerup="pointerUp"
    @pointercancel="endDrag"
    @lostpointercapture="endDrag"
    @click.stop="click"
    @keydown.enter.stop.prevent="keyboard"
    @keydown.space.stop.prevent="keyboard"
  />

  <!-- hammer size slider. stops events so dragging it doesn't smash letters or move the window -->
  <div v-show="visible" class="ascii-hammer" @click.stop @pointerdown.stop @pointermove.stop @keydown.stop>
    <span class="hammer-size-dot hammer-size-dot-small" aria-hidden="true"/>
    <div class="ascii-hammer-track">
      <input
        v-model.number="hammerSize"
        aria-label="Hammer size"
        type="range"
        min="1"
        max="7"
        step="0.25"
        :aria-valuetext="`Size ${hammerSize}`"
        :title="`Hammer size: ${hammerSize}`"
      >
    </div>
    <span class="hammer-size-dot hammer-size-dot-large" aria-hidden="true"/>
  </div>
</template>
