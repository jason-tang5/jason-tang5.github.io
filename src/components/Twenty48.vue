<script setup>
// 2048, remade from my fpga project (see the fpga 2048 project window). the game is
// drawn the way the de1-soc drew it: a 160x120 vga screen in 3-bit colour, the
// title up top, score and best in boxes either side, and the board in the middle,
// scaled up with crisp pixels. under the monitor is the fpga board itself, with the
// score on its six seven-segment hex displays and the same arcade buttons as snake.
// the rules are in twenty48.mjs. arrows or wasd, a swipe on the screen, or the pad
import RetroIcon from './RetroIcon.vue';
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { newGame, slide, addTile, canMove, hasWon, value, size, rgb, tileColor, tileInk } from '../twenty48.mjs';
import { read, save } from '../storage.js';
import { play } from '../sound.js';
import { buzz } from '../haptics.js';
import { track } from '../analytics.js';
import { createBackdrop, tilesScene } from '../ascii-backdrop.js';
import { theme } from '../theme.js';

const props = defineProps({ active: Boolean });
const emit = defineEmits(['open']);

// ---- the game, saved in the browser so it's still there next time ----
function load() {
  try {
    const saved = JSON.parse(read('2048-game', 'null'));
    if (saved && Array.isArray(saved.board) && saved.board.length === size * size && saved.board.every(p => Number.isInteger(p) && p >= 0 && p < 16)) return saved;
  } catch { /* a fresh game instead */ }
  return { board: newGame(), score: 0, won: false, keepGoing: false };
}
const game = ref(load());
const best = ref(Math.max(0, Number(read('2048-best', '0')) || 0));
const over = computed(() => !canMove(game.value.board));
const showWin = computed(() => game.value.won && !game.value.keepGoing);
watch(game, value => save('2048-game', JSON.stringify(value)), { deep: true });

// ---- the screen: a 160x120 canvas, like the vga adapter ----
const W = 160, H = 120;
const cell = 22, line = 2;
const boardX = 31, boardY = 18;
const cellX = i => boardX + line + (i % size) * (cell + line);
const cellY = i => boardY + line + Math.floor(i / size) * (cell + line);
const frame = '#e6eeff';

// a 3x5 pixel font, just the characters the screen needs
const font = {
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'],
  3: ['###', '..#', '.##', '..#', '###'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'],
  6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '..#', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '###'], A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['###', '#..', '#..', '#..', '###'], E: ['###', '#..', '##.', '#..', '###'], G: ['###', '#..', '#.#', '#.#', '###'],
  I: ['###', '.#.', '.#.', '.#.', '###'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['###', '#.#', '#.#', '#.#', '###'], P: ['###', '#.#', '###', '#..', '#..'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['###', '#..', '###', '..#', '###'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], F: ['###', '#..', '##.', '#..', '#..'], L: ['#..', '#..', '#..', '#..', '###'], '!': ['#', '#', '#', '.', '#'], ' ': ['..', '..', '..', '..', '..'],
};
// Board silkscreen uses the same actual square-pixel glyphs as the display.
const boardFont = {
  ...font,
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  '-': ['...', '...', '###', '...', '...'],
  '?': ['.', '.', '#', '.', '.'],
};
const BoardLabel = ({ text }) => {
  let x = 0, path = '';
  for (const c of text.toUpperCase()) {
    const glyph = boardFont[c] || boardFont[' '];
    glyph.forEach((row, y) => [...row].forEach((pixel, col) => {
      if (pixel === '#') path += `M${x + col} ${y}h1v1h-1z`;
    }));
    x += glyph[0].length + 1;
  }
  const width = Math.max(1, x - 1);
  return h('svg', { class: 't48-label', viewBox: `0 0 ${width} 5`, style: { width: `${width / 5}em` }, 'aria-hidden': 'true', 'shape-rendering': 'crispEdges' }, [h('path', { d: path, fill: 'currentColor' })]);
};
const textWidth = (text, scale = 1) => [...text].reduce((w, c) => w + ((font[c]?.[0].length ?? 2) + 1) * scale, -scale);
function text(ctx, str, x, y, color, scale = 1) {
  ctx.fillStyle = color;
  for (const c of str) {
    const glyph = font[c] || font[' '];
    glyph.forEach((row, r) => [...row].forEach((on, k) => { if (on === '#') ctx.fillRect(x + k * scale, y + r * scale, scale, scale); }));
    x += (glyph[0].length + 1) * scale;
  }
}
const centered = (ctx, str, cx, y, color, scale = 1) => text(ctx, str, Math.round(cx - textWidth(str, scale) / 2), y, color, scale);

function drawTile(ctx, power, x, y, grow = 1) {
  const s = Math.round(cell * grow);
  const left = Math.round(x + (cell - s) / 2), top = Math.round(y + (cell - s) / 2);
  ctx.fillStyle = tileColor(power);
  ctx.fillRect(left, top, s, s);
  // 2048 and up is black on the real board, so it gets a white edge to stand out
  if (power >= 11) { ctx.strokeStyle = frame; ctx.lineWidth = 1; ctx.strokeRect(left + 1.5, top + 1.5, s - 3, s - 3); }
  if (grow > 0.75) centered(ctx, String(value(power)), x + cell / 2, y + 9, tileInk(power));
}

const canvas = ref(null);
let anim = null; // { from, to, moves, spawn, start }
let raf = 0;
const slideMs = 90, popMs = 110;
const still = matchMedia('(prefers-reduced-motion: reduce)');

function draw(now = performance.now()) {
  const ctx = canvas.value?.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  // with the board off the monitor has nothing coming in
  if (!powered.value) {
    centered(ctx, 'NO SIGNAL', W / 2, 54, blink.value ? rgb.yellow : '#000');
    return;
  }
  centered(ctx, '2048', W / 2, 3, frame, 2);
  for (const [label, amount, cx] of [['SCORE', game.value.score, 15], ['BEST', best.value, 145]]) {
    centered(ctx, label, cx, 40, frame);
    ctx.strokeStyle = frame;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 13.5, 47.5, 27, 11);
    centered(ctx, String(Math.min(amount, 999999)), cx, 50, frame);
  }
  // the grid: white lines around every cell
  ctx.fillStyle = frame;
  ctx.fillRect(boardX, boardY, size * (cell + line) + line, size * (cell + line) + line);
  for (let i = 0; i < size * size; i++) { ctx.fillStyle = '#000'; ctx.fillRect(cellX(i), cellY(i), cell, cell); }

  const t = anim ? now - anim.start : Infinity;
  if (anim && t < slideMs) {
    // tiles slide from their old cell to the new one, in three steps like a slow vga redraw
    const k = Math.min(1, Math.ceil((t / slideMs) * 3) / 3);
    for (const m of anim.moves) {
      const x = cellX(m.from) + (cellX(m.to) - cellX(m.from)) * k;
      const y = cellY(m.from) + (cellY(m.to) - cellY(m.from)) * k;
      drawTile(ctx, anim.from[m.from], x, y);
    }
  } else {
    const p = anim ? Math.min(1, (t - slideMs) / popMs) : 1;
    game.value.board.forEach((power, i) => {
      if (!power) return;
      let grow = 1;
      if (anim && p < 1) {
        if (i === anim.spawn) grow = 0.3 + 0.7 * p;
        else if (anim.merged.has(i)) grow = 1 + 0.12 * Math.sin(p * Math.PI);
      }
      drawTile(ctx, power, cellX(i), cellY(i), grow);
    });
    if (anim && p >= 1) anim = null;
  }

  if (showWin.value || over.value) {
    ctx.fillStyle = '#000';
    ctx.fillRect(boardX + 6, 52, 86, 30);
    ctx.strokeStyle = frame;
    ctx.strokeRect(boardX + 6.5, 52.5, 85, 29);
    const cx = boardX + 49;
    if (showWin.value) {
      centered(ctx, 'YOU WIN!', cx, 57, rgb.yellow);
      centered(ctx, 'KEEP GOING?', cx, 69, blink.value ? frame : '#000');
    } else {
      centered(ctx, 'GAME OVER', cx, 57, rgb.red);
      centered(ctx, 'FLIP SW0', cx, 69, blink.value ? frame : '#000');
    }
  }
  if (anim) raf = requestAnimationFrame(draw);
}
function redraw() {
  cancelAnimationFrame(raf);
  draw();
}

// "keep going?" and "press new game" blink, like snake's touch to play
const blink = ref(true);
const blinkTimer = setInterval(() => { blink.value = !blink.value; if (showWin.value || over.value || !powered.value) redraw(); }, 530);

// the board's power button. off, the monitor loses its signal, the displays and leds
// go dark and the buttons do nothing, but the game is kept for when it's back on
const powered = ref(read('2048-power', 'on') !== 'off');
function togglePower() {
  powered.value = !powered.value;
  save('2048-power', powered.value ? 'on' : 'off');
  play(powered.value ? 'open' : 'close');
  buzz(powered.value ? [15, 30, 15] : 25);
  status.value = powered.value ? 'Board on.' : 'Board off.';
  anim = null;
  redraw();
}

// ---- playing ----
let lastMove = 0;
const status = ref('');
function move(direction) {
  if (!props.active || !powered.value || over.value) return;
  if (showWin.value) { game.value = { ...game.value, keepGoing: true }; redraw(); return; }
  const result = slide(game.value.board, direction);
  if (!result.moved) { buzz(6); return; }
  const spawned = addTile(result.board);
  const merged = new Set(result.moves.filter(m => m.merged).map(m => m.to));
  const from = game.value.board;
  const score = game.value.score + result.gained;
  const won = game.value.won || hasWon(result.board);
  game.value = { ...game.value, board: spawned.board, score, won };
  if (score > best.value) { best.value = score; save('2048-best', String(score)); }
  lastMove = performance.now();
  anim = still.matches ? null : { from, moves: result.moves, spawn: spawned.at, merged, start: lastMove };
  redraw();

  if (won && !from.some(p => p >= 11) && hasWon(result.board)) {
    play('chime');
    buzz([40, 40, 80]);
    track('2048-win');
    status.value = 'You made 2048!';
  } else if (!canMove(spawned.board)) {
    play('gameOver');
    buzz([60, 50, 90]);
    track('2048-score', '', score);
    status.value = `Game over. Score ${score}.`;
  } else if (merged.size) {
    // higher merges ring higher
    play('brick', Math.max(...[...merged].map(i => spawned.board[i])) - 1);
    buzz(20);
  } else {
    play('click');
    buzz(10);
  }
}
function restart() {
  // starting over mid-game still counts that game's score
  if (game.value.score > 0 && canMove(game.value.board)) track('2048-score', '', game.value.score);
  buzz(12);
  play('coin');
  anim = null;
  game.value = { board: newGame(), score: 0, won: false, keepGoing: false };
  status.value = 'New game.';
  redraw();
  screen.value?.focus({ preventScroll: true });
}

const keyDirections = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const held = ref(null);
// keys work whenever this window is the one in front, not only when the game has
// focus, except while typing somewhere (a text box, or another window's editor)
const typing = target => target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
function key(event) {
  if (!props.active || event.defaultPrevented || typing(event.target)) return;
  // r flips the reset switch
  if (event.key.toLowerCase?.() === 'r' && !event.repeat && !event.ctrlKey && !event.metaKey) { flip(0); return; }
  const direction = keyDirections[event.key] || keyDirections[event.key.toLowerCase?.()];
  if (!direction || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  held.value = direction;
  if (!event.repeat) move(direction);
}
function keyUp() { held.value = null; }

// a swipe on the screen, for phones
const screen = ref(null);
let swipeFrom = null;
function swipeDown(event) {
  swipeFrom = { x: event.clientX, y: event.clientY };
  screen.value?.focus({ preventScroll: true });
}
function swipeUp(event) {
  if (!swipeFrom) return;
  const dx = event.clientX - swipeFrom.x, dy = event.clientY - swipeFrom.y;
  swipeFrom = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
}

// the de1-soc's four push buttons, KEY3 to KEY0, wired up as W A S D. pressing the
// letter on your keyboard pushes the button down too. they move the moment a finger lands
const keys = [
  { n: 3, key: 'W', direction: 'up' },
  { n: 2, key: 'A', direction: 'left' },
  { n: 1, key: 'S', direction: 'down' },
  { n: 0, key: 'D', direction: 'right' },
];
// each button is pixel art on the same 16x18 grid as snake's pad, and moves the same
// way (see .snake-pad-button in theme.css), but shaped like the de1-soc's: a square
// metal housing with a round black cap sitting on a darker rim
const capRows = [4, 6, 8, 10, 10, 10, 10, 8, 6, 4];
const disc = (x, y) => capRows.map((w, row) => `M${x + (10 - w) / 2} ${y + row}h${w}v1h-${w}z`).join('');
const keyShape = {
  outline: 'M0 0h16v18H0z',
  face: 'M1 1h14v14H1z',
  light: 'M1 1h14v1H2v13H1z',
  dark: 'M14 2h1v13H2v-1h12z',
  side: 'M1 15h14v2H1z',
  rim: disc(3, 4),
  fasteners: 'M2 2h2v2H2zM12 2h2v2h-2zM2 12h2v2H2zM12 12h2v2h-2z',
  cap: disc(3, 2),
  shine: 'M5 3h2v1H5zM4 4h1v2H4z',
};
// the slide switches, pixel art in the same style as the buttons: a metal housing with
// a light and a dark edge, a dark slot, and a black knob that steps up when it's on
const switchShape = {
  outline: 'M0 0h8v14H0z',
  face: 'M1 1h6v12H1z',
  light: 'M1 1h6v1H2v11H1z',
  dark: 'M6 2h1v11H2v-1h4z',
  slot: 'M3 3h2v8H3z',
  knob: 'M2 8h4v3H2z',
  shine: 'M2 8h4v1H2z',
};
// Two 40-pin GPIO sockets: twenty recessed pairs, with subdued contact edges.
const gpioSockets = Array.from({ length: 20 }, (_, r) => `M3 ${4 + r * 3}h2v2H3zM6 ${4 + r * 3}h2v2H6z`).join('');
const gpioContacts = Array.from({ length: 20 }, (_, r) => `M4 ${5 + r * 3}h1v1H4zM7 ${5 + r * 3}h1v1H7z`).join('');
// the 2x7 ltc expansion header below them, drawn the same way
const ltcSockets = gpioSockets.split('z').slice(0, 14).join('z') + 'z';
const ltcContacts = gpioContacts.split('z').slice(0, 14).join('z') + 'z';
function padDown(event, direction) {
  if (event.button !== 0) return;
  event.preventDefault();
  held.value = direction;
  move(direction);
}
function padClick(event, direction) {
  if (event.detail === 0) move(direction);
}

// ---- the ten slide switches. SW0 is reset, like on the real project: flipping it
// either way starts a new game. the rest just click ----
const switches = ref(Array(10).fill(false));
function flip(n) {
  switches.value = switches.value.map((on, i) => (i === n ? !on : on));
  if (n === 0 && powered.value) restart();
  else { play('click'); buzz(8); }
}

// ---- the six hex displays on the fpga board show the score ----
const segments = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
const segmentPaths = {
  a: 'M3 1h8v2H3z', b: 'M11 3h2v7h-2z', c: 'M11 12h2v7h-2z', d: 'M3 19h8v2H3z',
  e: 'M1 12h2v7H1z', f: 'M1 3h2v7H1z', g: 'M3 10h8v2H3z',
};
// leading zeros stay dark, like the real displays with nothing to show
const hex = computed(() => (powered.value ? String(Math.min(game.value.score, 999999)).padStart(6, ' ') : '      ').split('').map(c => segments[c] || ''));

// ---- the vga cable, from the board's port up into the bottom right corner of the
// monitor. it's measured from where the two actually are, so it fits any size ----
const stage = ref(null);
const plug = ref(null);
const monitor = ref(null);
const cable = ref({ d: '', x: 0, y: 0 });
// the acrylic cover runs down to just above the switches
const boardEl = ref(null);
const boardMount = ref(null);
const switchRow = ref(null);
const acrylic = ref(150);
// Keep the scene in design coordinates; only its outer transform changes on resize.
const content = ref(null);
const desk = ref(null);
const fit = ref(1);
const wide = ref(false);
function fitStage() {
  if (!content.value || !stage.value || !desk.value || !boardEl.value) return;
  const dw = desk.value.offsetWidth, dh = desk.value.offsetHeight;
  const bw = boardMount.value.offsetWidth, bh = boardMount.value.offsetHeight;
  const sizes = {
    stacked: { w: Math.max(dw, bw) + 12, h: dh + 18 + bh + 16 },
    wide: { w: dw + 28 + bw + 12, h: Math.max(dh, bh) + 16 },
  };
  const zoomFor = mode => Math.min(content.value.clientWidth / sizes[mode].w, content.value.clientHeight / sizes[mode].h);
  // A small dead band prevents flicker near the orientation boundary.
  const current = wide.value ? 'wide' : 'stacked';
  const other = wide.value ? 'stacked' : 'wide';
  const best = zoomFor(other) > zoomFor(current) * 1.05 ? other : current;
  wide.value = best === 'wide';
  fit.value = Math.max(0.01, zoomFor(best));
}
function routeCable() {
  if (!stage.value || !plug.value || !monitor.value) return;
  // Convert attachment points directly into the SVG's coordinates. This also
  // handles ancestor transforms and browser zoom without a second scale estimate.
  const svg = stage.value.querySelector('.t48-cable');
  const matrix = svg.getScreenCTM();
  if (!matrix) return;
  const inverse = matrix.inverse();
  const local = (x, y) => {
    const point = new DOMPoint(x, y).matrixTransform(inverse);
    return [point.x, point.y];
  };
  if (boardEl.value && switchRow.value) {
    acrylic.value = Math.max(0, switchRow.value.offsetTop - 14);
  }
  const p = plug.value.getBoundingClientRect();
  const m = monitor.value.getBoundingClientRect();
  // Stop at the socket's top edge: neither the cable nor its collar covers
  // the blue connector face.
  const socket = plug.value.parentElement.getBoundingClientRect();
  const [x1, y1] = local(p.left + p.width / 2, socket.top);
  // and goes in three quarters of the way across the monitor's bottom, ending a little
  // inside it so the monitor, which sits on top, hides the end
  const [x2, bottom] = local(m.left + m.width * 0.75, m.bottom);
  const y2 = bottom - 6;
  // The cable deliberately crosses the stand, on the layer in front of it.
  const bend = bottom + 14;
  let d = `M${x1} ${y1}V${bend + 4}H${x1 + 4}V${bend}H${x2 - 4}V${bend - 4}H${x2}V${y2}`;
  if (wide.value && boardEl.value) {
    // beside the monitor: up out of the plug, over and down the gap between the two,
    // along the desk, then up into the monitor's bottom
    const b = boardEl.value.getBoundingClientRect();
    const [gx] = local((m.right + b.left) / 2, 0);
    const desk = bottom + 12;
    // Stair-step bends keep the cable off the controls and match the pixel art.
    d = `M${x1} ${y1}V${y1 - 20}H${x1 - 4}V${y1 - 24}H${gx + 4}`
      + `V${y1 - 20}H${gx}V${desk - 8}H${gx - 4}V${desk - 4}H${gx - 8}`
      + `V${desk}H${x2 + 8}V${desk - 4}H${x2 + 4}V${desk - 8}H${x2}V${y2}`;
  }
  cable.value = { d, x: x1, y: y1 };
}
let layoutFrame;
function layout() {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(async () => {
    fitStage();
    await nextTick();
    routeCable();
  });
}
let cableObserver;

// ---- the backdrop: a faint 2048 board playing itself, see ascii-backdrop.js ----
const backdropCanvas = ref(null);
let backdrop;
onMounted(() => {
  backdrop = createBackdrop(backdropCanvas.value, { running: () => performance.now() - lastMove < 1500, scene: tilesScene });
  backdrop.setActive(props.active);
  redraw();
  if (props.active) screen.value?.focus({ preventScroll: true });
  cableObserver = new ResizeObserver(layout);
  cableObserver.observe(content.value);
  cableObserver.observe(stage.value);
  document.fonts.ready.then(layout);
  layout();
});
watch(theme, () => backdrop?.redraw());
watch(() => props.active, active => {
  backdrop?.setActive(active);
  if (active) screen.value?.focus({ preventScroll: true });
});
window.addEventListener('blur', keyUp);
window.addEventListener('keydown', key);
window.addEventListener('keyup', keyUp);
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  clearInterval(blinkTimer);
  backdrop?.destroy();
  cableObserver?.disconnect();
  cancelAnimationFrame(layoutFrame);
  window.removeEventListener('blur', keyUp);
  window.removeEventListener('keydown', key);
  window.removeEventListener('keyup', keyUp);
});
</script>

<template>
  <div class="app-layout t48-app">
    <canvas ref="backdropCanvas" class="t48-backdrop" aria-hidden="true"/>
    <!-- a new game, and the writeup for the fpga project this game was rebuilt from -->
    <div class="toolbar ie-toolbar t48-toolbar">
      <!-- the same as pressing R: SW0 flips on the board and the game starts over -->
      <button class="ie-button icon-button" title="Start over (flips SW0, or press R)" @click="flip(0)">
        <svg class="spin-icon" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 1h4v1H4zM9 1h1v1H9zM2 2h2v1H2zM8 2h2v1H8zM2 3h1v1H2zM7 3h3v1H7zM1 4h1v4H1zM10 6h1v2h-1zM2 8h1v1H2zM9 8h1v1H9zM2 9h2v1H2zM8 9h2v1H8zM4 10h4v1H4z"/></svg>
        <span>New game</span>
      </button>
      <button class="ie-button" title="Read how FPGA 2048 was built" @click="emit('open', 'fpga-2048')">
        <RetroIcon name="document"/>
        <span>Project</span>
      </button>
    </div>
    <div ref="content" class="content-scroll t48-content">
      <div ref="stage" class="t48-stage" :class="{ wide }" :style="{ transform: `translate3d(-50%, -50%, 0) scale(${fit})` }">
        <!-- the vga cable, from the board up into the monitor's bottom right corner -->
        <svg class="t48-cable" shape-rendering="crispEdges" stroke-linejoin="miter" aria-hidden="true">
          <path :d="cable.d" fill="none" stroke="#111" stroke-width="8"/>
          <path :d="cable.d" fill="none" stroke="#3b3d44" stroke-width="4"/>
          <!-- Rubber strain relief ends flush with the socket edge. -->
          <g v-if="cable.d" :transform="`translate(${cable.x} ${cable.y})`">
            <path d="M-4-12H4V-8H6V0H-6V-8H-4Z" fill="#101114"/>
            <path d="M-2-10H2V-6H4V0H-4V-6H-2Z" fill="#34373d"/>
            <path d="M-4-6H4V-4H-4ZM-4-2H4V0H-4Z" fill="#17191e"/>
            <path d="M-4-6H-2V0H-4Z" fill="#565b64"/>
          </g>
        </svg>
        <!-- the vga monitor on its stand -->
        <div ref="desk" class="t48-desk">
        <div ref="monitor" class="t48-monitor">
          <div ref="screen" class="t48-screen" tabindex="0" role="group" aria-label="2048 game screen" aria-describedby="t48-help"
            @pointerdown="swipeDown" @pointerup="swipeUp" @pointercancel="swipeFrom = null">
            <canvas ref="canvas" :width="W" :height="H" aria-hidden="true"/>
          </div>
          <div class="t48-monitor-chin">
            <span class="arcade-badge t48-badge" aria-hidden="true">TANGO</span>
            <span class="t48-power" :class="{ standby: !powered }" aria-hidden="true"/>
          </div>
        </div>
        <div class="t48-stand" aria-hidden="true"><i/><b/></div>
        </div>

        <!-- the de1-soc, drawn after the real board in a few big pieces: the ports along
             the top edge, the six hex displays showing the score beside the fpga, the
             slide switches with their leds, and the four push buttons you play with -->
        <div ref="boardMount" class="t48-board-mount">
        <div ref="boardEl" class="t48-board" :style="{ '--acrylic': `${acrylic}px` }">
          <i v-for="c in ['bl', 'br']" :key="c" :class="['t48-standoff', c]" aria-hidden="true"/>
          <div class="t48-acrylic" aria-hidden="true"><i v-for="c in ['tl', 'tr', 'bl', 'br']" :key="c" :class="['t48-standoff', c]"/></div>
          <div class="t48-ports">
            <i class="t48-jack" style="--jack: #e98aa0" aria-hidden="true"/><i class="t48-jack" style="--jack: #4a95dc" aria-hidden="true"/><i class="t48-jack" style="--jack: #95d57a" aria-hidden="true"/>
            <i class="t48-rca" aria-hidden="true"/>
            <i class="t48-vga" aria-hidden="true"><b/><span ref="plug" class="t48-plug"/></i>
            <i class="t48-ethernet" aria-hidden="true"><b/></i>
            <i class="t48-usb" aria-hidden="true"><b/><b/></i><i class="t48-usb" aria-hidden="true"><b/><b/></i>
          </div>
          <div class="t48-middle">
            <div class="t48-left">
              <div class="t48-hex" role="img" :aria-label="`Score ${game.score}`">
                <div v-for="(lit, i) in hex" :key="i" class="t48-digit">
                  <svg viewBox="0 0 14 22" shape-rendering="crispEdges" aria-hidden="true">
                    <path v-for="(d, seg) in segmentPaths" :key="seg" :d="d" :class="{ on: lit.includes(seg) }"/>
                  </svg>
                </div>
              </div>
              <div class="t48-hex-labels" aria-hidden="true"><small v-for="i in 6" :key="i"><BoardLabel :text="`HEX${6 - i}`"/></small></div>
            </div>
            <div class="t48-chip" aria-hidden="true"><div class="t48-chip-mark"><BoardLabel text="ALTERA"/><span><BoardLabel text="CYCLONE V"/></span></div></div>
          </div>
          <p class="t48-silk" aria-hidden="true"><BoardLabel text="DE1-SOC"/></p>
          <div ref="switchRow" class="t48-switches" role="group" aria-label="Slide switches">
            <button v-for="n in [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]" :key="n" class="t48-switch" :class="{ on: switches[n], reset: n === 0 }"
              :aria-label="n === 0 ? 'SW0: new game' : `Switch SW${n}`" :aria-pressed="switches[n]" :title="n === 0 ? 'SW0 resets the board (or press R)' : undefined" @click="flip(n)">
              <em class="t48-led" :class="{ lit: powered && switches[n] }" aria-hidden="true"/>
              <svg viewBox="0 0 8 14" shape-rendering="crispEdges" aria-hidden="true">
                <path :d="switchShape.outline" :fill="n === 0 ? '#ffe066' : '#111'"/>
                <path :d="switchShape.face" fill="#a3aab3"/>
                <path :d="switchShape.light" fill="#dfe3e8"/>
                <path :d="switchShape.dark" fill="#6b727c"/>
                <path :d="switchShape.slot" fill="#1b1c20"/>
                <g class="t48-knob">
                  <path :d="switchShape.knob" fill="#26272c"/>
                  <path :d="switchShape.shine" fill="#5c5f68"/>
                </g>
              </svg>
              <small aria-hidden="true"><BoardLabel :text="n === 0 ? 'RESET' : `SW${n}`"/></small>
            </button>
          </div>
          <div class="t48-lower">
          <div class="t48-board-power">
            <button class="t48-power-button" :class="{ off: !powered }" :aria-label="powered ? 'Turn the board off' : 'Turn the board on'" :aria-pressed="powered" @click="togglePower"/>
            <i class="t48-power-led" :class="{ on: powered }" aria-hidden="true"/>
            <small aria-hidden="true"><BoardLabel text="POWER"/></small>
          </div>
          <div class="t48-keys" role="group" aria-label="Push buttons">
            <div v-for="k in keys" :key="k.n" class="t48-key">
              <button :class="['snake-pad-button', { held: held === k.direction }]" :aria-label="`KEY${k.n}: slide ${k.direction} (${k.key})`"
                @pointerdown="padDown($event, k.direction)" @pointerup="keyUp" @pointercancel="keyUp" @pointerleave="keyUp" @click="padClick($event, k.direction)">
                <svg viewBox="0 0 16 18" shape-rendering="crispEdges" aria-hidden="true">
                  <path :d="keyShape.outline" fill="#111"/>
                  <path :d="keyShape.side" fill="#454a52"/>
                  <path :d="keyShape.face" fill="#a3aab3"/>
                  <path :d="keyShape.light" fill="#dfe3e8"/>
                  <path :d="keyShape.dark" fill="#6b727c"/>
                  <path :d="keyShape.rim" fill="#050506"/>
                  <path :d="keyShape.fasteners" fill="#111"/>
                  <g class="snake-pad-cap">
                    <path :d="keyShape.cap" fill="#26272c"/>
                    <path :d="keyShape.shine" fill="#5c5f68"/>
                  </g>
                </svg>
              </button>
              <small aria-hidden="true"><BoardLabel :text="`KEY${k.n}`"/></small>
              <b aria-hidden="true"><BoardLabel :text="k.key"/></b>
            </div>
          </div>
          </div>
          <!-- Edge-mounted PS/2 and USB sockets, facing out from the PCB. -->
          <div class="t48-side-ports" aria-hidden="true">
            <svg viewBox="0 0 32 32" shape-rendering="crispEdges">
              <path d="M0 2h30v28H0z" fill="#373b42"/>
              <path d="M2 4h26v24H2z" fill="#a8adb3"/>
              <path d="M2 4h26v2H4v20H2z" fill="#e2e5e8"/>
              <path d="M24 6h4v22H4v-2h20z" fill="#727984"/>
              <path d="M22 8h8v16h-8z" fill="#4c535c"/>
              <path d="M24 10h6v12h-6z" fill="#15171c"/>
              <path d="M26 12h2v2h-2zM26 18h2v2h-2z" fill="#aeb4bc"/>
            </svg>
            <svg viewBox="0 0 32 32" shape-rendering="crispEdges">
              <path d="M0 3h30v26H0z" fill="#373b42"/>
              <path d="M2 5h26v22H2z" fill="#a8adb3"/>
              <path d="M2 5h26v2H4v18H2z" fill="#e2e5e8"/>
              <path d="M24 7h4v20H4v-2h20z" fill="#727984"/>
              <path d="M22 9h8v14h-8z" fill="#101217"/>
              <path d="M24 11h6v3h-6z" fill="#c7cbd1"/>
              <path d="M24 17h4v2h-4z" fill="#746744"/>
            </svg>
          </div>
          <div class="t48-gpio" aria-hidden="true">
            <div v-for="n in 2" :key="n" class="t48-gpio-header">
              <svg viewBox="0 0 11 66" shape-rendering="crispEdges">
                <path d="M0 0h11v66H0z" fill="#08090b"/>
                <path d="M1 1h9v63H1z" fill="#24262b"/>
                <path d="M1 1h9v1H2v62H1z" fill="#555960"/>
                <path d="M9 2h1v63H2v-1h7z" fill="#101114"/>
                <path d="M2 3h7v60H2z" fill="#34363b"/>
                <path d="M0 29h2v8H0z" fill="#08090b"/>
                <path :d="gpioSockets" fill="#050506"/>
                <path :d="gpioContacts" fill="#857a52"/>
              </svg>
              <BoardLabel :text="`GPIO ${n - 1}`"/>
            </div>
          </div>
          <!-- the corner under the gpio, after the real board: the 2x7 ltc header, the
               hps user led, and the little warm reset and hps reset buttons -->
          <div class="t48-hps" aria-hidden="true">
            <div class="t48-gpio-header t48-ltc">
              <svg viewBox="0 0 11 25" shape-rendering="crispEdges">
                <path d="M0 0h11v25H0z" fill="#08090b"/>
                <path d="M1 1h9v23H1z" fill="#24262b"/>
                <path d="M1 1h9v1H2v22H1z" fill="#555960"/>
                <path d="M2 3h7v20H2z" fill="#34363b"/>
                <path d="M0 9h2v7H0z" fill="#08090b"/>
                <path :d="ltcSockets" fill="#050506"/>
                <path :d="ltcContacts" fill="#857a52"/>
              </svg>
              <BoardLabel text="LTC"/>
            </div>
            <div class="t48-hps-side">
              <div class="t48-hps-led"><i :class="{ on: powered }"/><BoardLabel text="LED"/></div>
              <div v-for="t in ['WARM', 'HPS']" :key="t" class="t48-tact">
                <svg viewBox="0 0 8 8" shape-rendering="crispEdges">
                  <path d="M0 0h8v8H0z" fill="#111"/>
                  <path d="M1 1h6v6H1z" fill="#a3aab3"/>
                  <path d="M1 1h6v1H2v5H1z" fill="#dfe3e8"/>
                  <path d="M2 2h4v4H2z" fill="#26272c"/>
                  <path d="M3 3h2v1H3z" fill="#5c5f68"/>
                </svg>
                <BoardLabel :text="t"/>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
    <p id="t48-help" class="sr-only">Arrow keys, WASD, the four push buttons, or a swipe on the screen slide the tiles. Equal tiles merge. Reach 2048 to win. Press R or flip SW0 for a new game.</p>
    <span class="sr-only" role="status">{{ status }}</span>
    <footer class="status-bar"><span>Score {{ game.score }}</span><span>Best {{ best }}</span></footer>
  </div>
</template>

<style scoped>
.t48-app {
  /* A two-unit edge everywhere; the board compensates for its smaller scale. */
  --t48-edge: 2px;
  --t48-back: #b9b9b9;
  --t48-bezel: #3a3a42;
  --t48-bezel-light: #56565f;
  --t48-bezel-dark: #202026;
  --t48-pcb: #1d4f86;
  --t48-pcb-dark: #12345c;
  --t48-pcb-light: #2f6aa8;
  position: relative;
  background: var(--t48-back);
}
:root[data-theme="dark"] .t48-app { --t48-back: #1d1d21; --t48-bezel: #2a2a31; --t48-bezel-light: #3c3c45; --t48-bezel-dark: #121216; }
.t48-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
/* the toolbar sits over the ascii backdrop */
.t48-toolbar { position: relative; z-index: 1; background: var(--surface); }
.t48-content { position: relative; overflow: hidden; }
/* Centre and scale one fixed scene without changing its internal layout. */
.t48-stage { position: absolute; left: 50%; top: 50%; transform-origin: center; will-change: transform; isolation: isolate; display: flex; flex-direction: column; align-items: center; gap: 18px; width: max-content; box-sizing: border-box; padding: 8px 6px; }
.t48-desk { display: flex; flex-direction: column; align-items: center; }
/* wide: the board sits beside the monitor, both standing on the same desk */
.t48-stage.wide { flex-direction: row; align-items: flex-end; gap: 28px; }


/* Resolve these on each housing so the board's scale compensation also applies
   to its bevel and cast shadow, rather than inheriting precomputed dimensions. */
.t48-monitor, .t48-board {
  --t48-inset: inset var(--t48-edge) var(--t48-edge) 0 var(--t48-light), inset calc(-1 * var(--t48-edge)) calc(-1 * var(--t48-edge)) 0 var(--t48-dark);
  --t48-shadow: var(--t48-edge) var(--t48-edge) 0 #0006;
}
/* a chunky crt monitor, pixel bevels like the rest of the site */
.t48-monitor {
  position: relative; z-index: 3;
  width: 480px; box-sizing: border-box; padding: 16px 16px 0;
  background: var(--t48-bezel);
  --t48-light: var(--t48-bezel-light); --t48-dark: var(--t48-bezel-dark); box-shadow: var(--t48-inset), var(--t48-shadow);
}
.t48-screen {
  position: relative; display: block; padding: 6px; background: #000;
  box-shadow: inset var(--t48-edge) var(--t48-edge) 0 #111, inset calc(-1 * var(--t48-edge)) calc(-1 * var(--t48-edge)) 0 #56565f; touch-action: none; cursor: var(--classic-pointer, pointer);
}
.t48-screen canvas { display: block; width: 100%; aspect-ratio: 4 / 3; image-rendering: pixelated; }
/* scanlines */
.t48-screen::after { content: ''; position: absolute; inset: 6px; pointer-events: none; background: repeating-linear-gradient(to bottom, #0000 0 2px, #0003 2px 3px);  }
.t48-screen:focus-visible { outline: 1px dotted #fff; outline-offset: -4px; }
.t48-monitor-chin { position: relative; display: flex; align-items: center; justify-content: center; padding: 8px 2px 10px; }
.t48-badge { position: static; }
.t48-power { position: absolute; right: 4px; top: 50%; margin-top: -4px; width: 8px; height: 8px; box-sizing: border-box; background: #3cf23c; border: 1px solid #0a0a0a; box-shadow: inset var(--t48-edge) 0 0 #baffba; }
/* amber on standby while the board is off */
.t48-power.standby { background: #f2a93c; box-shadow: inset var(--t48-edge) 0 0 #ffe6a0; }
.t48-stand { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
.t48-stand i { width: 40px; height: 12px; background: var(--t48-bezel-dark); }
.t48-stand b { width: 120px; height: 8px; background: var(--t48-bezel); box-shadow: inset 0 var(--t48-edge) 0 var(--t48-bezel-light), var(--t48-edge) var(--t48-edge) 0 #0006; }

/* the de1-soc: a plain blue board, drawn in a few big chunky pieces like the arcade
   cabinet and the reversi table */
.t48-board-mount { position: relative; flex: none; width: 266px; height: 196px; }
.t48-board {
  --t48-edge: calc(2px / .7);
  transform: scale(.7); transform-origin: top left; will-change: transform;
  position: relative; width: 360px; height: 280px; box-sizing: border-box; padding: 12px 14px 14px;
  container-type: inline-size;
  background: var(--t48-pcb);
  --t48-light: var(--t48-pcb-light); --t48-dark: var(--t48-pcb-dark); box-shadow: var(--t48-inset), var(--t48-shadow);
}
/* brass standoffs in the corners */
.t48-standoff { position: absolute; z-index: 2; width: 10px; height: 10px; background: #d9b44a; border: var(--t48-edge) solid #5c4410; box-sizing: border-box; box-shadow: inset var(--t48-edge) var(--t48-edge) 0 #f3d77a; }
.t48-standoff.tl { left: 4px; top: 4px; } .t48-standoff.tr { right: 4px; top: 4px; }
.t48-standoff.bl { left: 4px; bottom: 4px; } .t48-standoff.br { right: 4px; bottom: 4px; }
/* the clear acrylic cover: a pale sheen with a bright edge, laid over the connectors' feet,
   the displays and the chip, stopping above the switches like on the real board */
.t48-acrylic {
  position: absolute; z-index: 3; left: 6px; right: 66px; top: 8px; box-sizing: border-box; height: var(--acrylic, 150px); pointer-events: none;
  background: linear-gradient(135deg, #ffffff20 0 24%, #ffffff0c 24% 72%, #ffffff18 72%);
  border: var(--t48-edge) solid #ffffff70; box-shadow: inset var(--t48-edge) var(--t48-edge) 0 #ffffff40, var(--t48-edge) var(--t48-edge) 0 #0006;
}
.t48-acrylic .t48-standoff.tl, .t48-acrylic .t48-standoff.tr { top: 3px; }
.t48-acrylic .t48-standoff.bl, .t48-acrylic .t48-standoff.br { bottom: 3px; }
.t48-acrylic .t48-standoff.tl, .t48-acrylic .t48-standoff.bl { left: 3px; }
.t48-acrylic .t48-standoff.tr, .t48-acrylic .t48-standoff.br { right: 3px; }

/* the connectors along the top edge. they stand up off the board and stick out
   past its top edge, like the real ones, each lit from above with a shadow under it */
.t48-ports { position: relative; z-index: 2; display: flex; align-items: flex-start; gap: 5px; height: 36px; padding-left: 46px; margin: -30px 4px 10px 12px; }
.t48-ports i { position: relative; display: block; flex: none; }
.t48-ports b { display: block; }
.t48-jack, .t48-rca, .t48-vga, .t48-ethernet, .t48-usb { box-sizing: border-box; }
.t48-jack { width: 17px; height: 30px; background: var(--jack); border: var(--t48-edge) solid #0006; box-shadow: inset 0 var(--t48-edge) 0 #fff6, inset calc(-1 * var(--t48-edge)) 0 0 #0002, 0 var(--t48-edge) 0 #0006; }
.t48-jack::after { content: ''; position: absolute; left: 2px; top: 7px; width: 8px; height: 8px; clip-path: polygon(25% 0, 75% 0, 75% 25%, 100% 25%, 100% 75%, 75% 75%, 75% 100%, 25% 100%, 25% 75%, 0 75%, 0 25%, 25% 25%); background: #151515; box-shadow: 0 0 0 var(--t48-edge) #0003; }
.t48-rca { width: 16px; height: 26px; margin-top: 4px; background: #d6d9de; border: var(--t48-edge) solid #5b6068; box-shadow: inset 0 var(--t48-edge) 0 #fff, inset calc(-1 * var(--t48-edge)) 0 0 #0002, 0 var(--t48-edge) 0 #0006; }
.t48-rca::after { content: ''; position: absolute; left: 2px; top: 6px; width: 8px; height: 8px; clip-path: polygon(25% 0, 75% 0, 75% 25%, 100% 25%, 100% 75%, 75% 75%, 75% 100%, 25% 100%, 25% 75%, 0 75%, 0 25%, 25% 25%); background: #1d1d1d; box-shadow: 0 0 0 var(--t48-edge) #9aa0a8; }
.t48-vga { width: 72px; height: 34px; background: #33353c; border: var(--t48-edge) solid #111; box-shadow: inset 0 var(--t48-edge) 0 #5a5d66, 0 var(--t48-edge) 0 #0006; }
.t48-vga b { position: absolute; left: 14px; right: 14px; top: 9px; height: 15px; background: #16171b; clip-path: polygon(0 0, 100% 0, 100% 75%, 85% 75%, 85% 100%, 15% 100%, 15% 75%, 0 75%); }
.t48-vga::before, .t48-vga::after { content: ''; position: absolute; top: 9px; width: 8px; height: 12px; background: #c9ccd2; box-shadow: inset 0 var(--t48-edge) 0 #fff, inset 0 calc(-1 * var(--t48-edge)) 0 #8d939b; }
.t48-vga::before { left: 2px; } .t48-vga::after { right: 2px; }
/* the cable's blue plug over the port, and the cable itself heading up out of sight
   in front of the stand (the monitor bezel hides its far end) */
.t48-plug { position: absolute; z-index: 3; left: 12px; right: 12px; top: 3px; height: 26px; background: #2f5aa0; border: var(--t48-edge) solid #0c1c38; box-sizing: border-box; box-shadow: inset var(--t48-edge) var(--t48-edge) 0 #6f94d6, inset calc(-1 * var(--t48-edge)) calc(-1 * var(--t48-edge)) 0 #203b6b, 0 var(--t48-edge) 0 #0006; }
.t48-cable { position: absolute; z-index: 2; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.t48-ethernet { width: 28px; height: 34px; background: #c9cdd4; border: var(--t48-edge) solid #555a62; box-shadow: inset 0 var(--t48-edge) 0 #f1f3f6, inset calc(-1 * var(--t48-edge)) 0 0 #0002, 0 var(--t48-edge) 0 #0006; }
.t48-ethernet b { position: absolute; left: 4px; right: 4px; bottom: 4px; height: 13px; background: #1d1d1f; }
.t48-usb { display: flex !important; flex-direction: column; justify-content: center; gap: 3px; width: 24px; height: 30px; padding: 5px 4px 3px; background: #c9cdd4; border: var(--t48-edge) solid #555a62; box-shadow: inset 0 var(--t48-edge) 0 #f1f3f6, 0 var(--t48-edge) 0 #0006; }
.t48-usb:first-of-type { margin-left: auto; }
.t48-usb b { height: 7px; background: #202022; border-top: 3px solid #eceef1; box-sizing: border-box; }
/* Power lives beside the keys at the lower left, clear of the acrylic. */
.t48-board-power { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.t48-power-button { position: relative; z-index: 2; flex: none; width: 24px; height: 24px; padding: 0; background: #d6d6da; border: var(--t48-edge) solid #3a3a3a; box-sizing: border-box; cursor: var(--classic-pointer, pointer); }
.t48-power-button::after { content: ''; position: absolute; inset: 3px; background: #d8262c; box-shadow: inset calc(-1 * var(--t48-edge)) calc(-1 * var(--t48-edge)) 0 #8e1216, inset var(--t48-edge) var(--t48-edge) 0 #ff7a7a; transform: translateY(1px); transition: transform .06s steps(1); }
.t48-power-button.off::after { transform: translateY(-2px); box-shadow: inset calc(-1 * var(--t48-edge)) calc(-1 * var(--t48-edge)) 0 #8e1216, inset var(--t48-edge) var(--t48-edge) 0 #ff7a7a, 0 var(--t48-edge) 0 #6d0d10; }
@media (hover: hover) { .t48-power-button:hover::after { background: #ed352d; } }
.t48-power-button:focus-visible { outline: 1px dotted #fff; outline-offset: 2px; }
.t48-power-led { width: 6px; height: 4px; box-sizing: border-box; display: block; background: #1f3b24; border: 1px solid #0a140c; }
.t48-board-power small { color: #e9eef6; font-size: 7px; white-space: nowrap; }
.t48-power-led.on { background: #3cf23c; box-shadow: inset var(--t48-edge) 0 0 #baffba; }

/* the six hex displays behind their smoky grey window, beside the fpga */
.t48-middle { margin-right: 64px; display: flex; align-items: center; gap: 12px; }
.t48-left { flex: 1; min-width: 0; }
.t48-hex { display: flex; gap: 3px; padding: 5px; background: #8d8a8f; border: var(--t48-edge) solid #3e3e44; box-shadow: inset var(--t48-edge) var(--t48-edge) 0 #b2afb4; }
.t48-digit { flex: 1; min-width: 0; padding: 3px 2px; background: #5f5d62; }
.t48-digit svg { display: block; width: 100%; height: auto; aspect-ratio: 14 / 22; }
.t48-digit path { fill: #7e5c5a; }
.t48-digit path.on { fill: #ff3b2f;  }
.t48-hex-labels { display: flex; gap: 3px; padding: 2px 7px 0; }
.t48-hex-labels small { flex: 1; color: #e6ecf5; font-size: 7px; text-align: center; }
.t48-chip {
  display: grid; place-items: center; flex: none; width: 76px; height: 76px;
  background: #55575f; border: var(--t48-edge) solid #1d1e22; box-shadow: 0 0 0 var(--t48-edge) #9aa4b1, inset var(--t48-edge) var(--t48-edge) 0 #6e7078, inset calc(-1 * var(--t48-edge)) calc(-1 * var(--t48-edge)) 0 #3c3e44;
  color: #e3e6eb; font-size: 10px;
}
.t48-chip-mark { display: flex; flex-direction: column; align-items: center; gap: 7px; font-size: 10px; }
.t48-chip-mark span { font-size: 7px; }
.t48-silk { position: relative; z-index: 2; display: flex; align-items: center; margin: 10px 14px 0; color: #e9eef6; font-size: 10px; opacity: .85; }

/* ten slide switches, SW9 on the left to SW0 on the right, each with a red led above
   it that lights while it's on */
.t48-switches { margin-right: 64px; display: flex; justify-content: space-between; gap: 3px; margin-top: 10px; }
.t48-switch { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; min-width: 0; padding: 0; border: 0; background: none; cursor: var(--classic-pointer, pointer); }
.t48-led { display: block; width: 8px; height: 5px; background: #5a1f1f; border: 1px solid #1a0a0a; }
.t48-led.lit { background: #ff3b2f; box-shadow: inset var(--t48-edge) 0 0 #ff9990; }
.t48-switch > svg { display: block; width: 16px; height: 28px; }
/* the knob steps up the slot when the switch is on */
.t48-knob { transition: transform .08s steps(2); }
.t48-switch.on .t48-knob { transform: translateY(-5px); }
.t48-switch small { color: #e9eef6; font-size: 7px; white-space: nowrap; }
.t48-switch.reset small { color: #ffe066; font-weight: bold; }

.t48-switch:focus-visible { outline: 1px dotted #fff; outline-offset: 1px; }

/* the four push buttons, centred, with their labels underneath. the buttons
   themselves move like snake's pad */
.t48-lower { display: grid; grid-template-columns: 24px repeat(4, 40px); margin-right: 64px; justify-content: space-between; align-items: start; margin-top: 14px; }
.t48-keys { display: contents; }
/* The jacks stick halfway out past the edge; the mount width reserves that overhang so resizing never clips them. */
.t48-side-ports { position: absolute; right: -16px; top: 190px; display: flex; flex-direction: column; gap: 2px; }
.t48-side-ports svg { display: block; width: 32px; height: 32px; filter: drop-shadow(2px 2px 0 #0006); }
/* Tall GPIO sockets occupy their own right-edge strip, beside the chip and switches. */
.t48-gpio { position: absolute; right: 12px; top: 34px; display: flex; align-items: flex-start; gap: 6px; }
.t48-gpio-header { display: flex; flex-direction: column; align-items: center; gap: 5px; color: #e9eef6; font-size: 5px; }
.t48-gpio-header > svg:first-child { display: block; width: 22px; height: 132px; box-shadow: var(--t48-edge) var(--t48-edge) 0 #0006; }
.t48-gpio-header > .t48-label { height: 1em; }
.t48-label { display: block; height: 1em; flex: none; }
/* the hps corner: ltc header on the left, the user led and two tiny tact buttons beside it */
.t48-hps { position: absolute; right: 22px; top: 184px; display: flex; align-items: flex-start; gap: 5px; color: #e9eef6; font-size: 5px; }
.t48-ltc > svg:first-child { height: 50px; }
.t48-hps-side { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.t48-hps-led { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.t48-hps-led i { display: block; width: 6px; height: 4px; box-sizing: border-box; background: #1f3b24; border: 1px solid #0a140c; }
.t48-hps-led i.on { background: #3cf23c; box-shadow: inset var(--t48-edge) 0 0 #baffba; }
.t48-tact { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.t48-tact svg { display: block; width: 16px; height: 16px; box-shadow: var(--t48-edge) var(--t48-edge) 0 #0006; }
.t48-hex-labels small { display: flex; justify-content: center; }
.t48-key .snake-pad-button { width: 40px; height: 45px; }
.t48-key { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.t48-key small { color: #e9eef6; font-size: 7px; }
.t48-key b { color: #ffe066; font-size: 10px; }
.t48-led { width: 4px; height: 7px; box-sizing: border-box; }
/* Keep the scaled housing on a stable layer. Only the cap moves on a press;
   inherited brightness/filter transitions otherwise rerasterize the sprite. */
.t48-key .snake-pad-button svg,
.t48-key .snake-pad-button:hover svg,
.t48-key .snake-pad-button.held svg { width: 40px; height: 45px; filter: none; transition: none; }
.t48-key .snake-pad-cap { will-change: transform; transition: transform .08s steps(1); }
/* a narrow board (on a phone) packs its ports and buttons tighter */
@container (max-width: 290px) {
  .t48-ports { gap: 4px; margin-left: 2px; margin-right: 2px; }
  .t48-power-button { width: 20px; height: 20px; }
  .t48-jack { width: 14px; }
  .t48-jack::after { left: 1px; width: 8px; height: 8px; }
  .t48-vga { width: 62px; }
  .t48-plug { left: 10px; right: 10px; }
  .t48-rca, .t48-ethernet, .t48-usb + .t48-usb { display: none !important; }
  .t48-keys { gap: 6px; margin-right: 0; }
  .t48-gpio, .t48-hps { display: none; }
}
</style>
