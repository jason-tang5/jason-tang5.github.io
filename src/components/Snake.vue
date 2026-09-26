<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { columns, rows, directions, newSnake, stepSnake } from '../snake.mjs';
import { read, save } from '../storage.js';
import { play } from '../sound.js';
import { track } from '../analytics.js';
import { buzz } from '../haptics.js';

const props = defineProps({ active: Boolean });
const board = ref(null);
const game = ref(newSnake());
const running = ref(false);
const started = ref(false);
const best = ref(Math.max(0, Number(read('snake-best', '0')) || 0));
const turns = [];
let timer;
const keyDirections = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
// "SNAKE" in figlet's slant font, for the start screen
const title = String.raw`
   _____ _   _____    __ __ ______
  / ___// | / /   |  / //_// ____/
  \__ \/  |/ / /| | / ,<  / __/
 ___/ / /|  / ___ |/ /| |/ /___
/____/_/ |_/_/  |_/_/ |_/_____/`.split('\n').slice(1);

// "touch to play" blinks on the start and game over screens
const blink = ref(true);
const blinkTimer = setInterval(() => { blink.value = !blink.value; }, 530);

const width = columns * 2;
const center = (text, size = width) => {
  const left = Math.floor((size - text.length) / 2);
  return ' '.repeat(Math.max(0, left)) + text + ' '.repeat(Math.max(0, size - left - text.length));
};
// a text box the full width of the screen, around the given lines
const box = lines => [
  `+${'-'.repeat(width - 2)}+`,
  ...lines.map(line => `|${line.padEnd(width - 2).slice(0, width - 2)}|`),
  `+${'-'.repeat(width - 2)}+`,
];

// the screen: the title before a game, a game over box after one, otherwise the board
const art = computed(() => {
  const g = game.value;
  let lines;
  if (!started.value) {
    // centre the title as one block so the slanted letters stay lined up
    const titleWidth = Math.max(...title.map(line => line.length));
    lines = ['', ...box(title.map(line => center(line.padEnd(titleWidth), width - 2))), '', center(blink.value ? 'touch to play' : ''), '', center(`best ${best.value}`)];
  } else if (g.over) {
    lines = ['', '', ...box(['', center(g.won ? 'YOU WIN!' : 'GAME OVER', width - 2), '', center(`score ${g.score}`, width - 2), center(`best ${best.value}`, width - 2), '']), '', center(blink.value ? 'touch to play again' : '')];
  } else {
    const cells = Array.from({ length: rows }, () => Array(columns).fill(' '));
    if (g.food) cells[g.food.y][g.food.x] = '*';
    g.body.forEach((p, i) => { cells[p.y][p.x] = i ? 'o' : { up: '^', down: 'v', left: '<', right: '>' }[g.direction]; });
    lines = cells.map(row => row.map(cell => cell + ' ').join(''));
    if (!running.value) lines[Math.floor(rows / 2)] = center('- paused -');
  }
  while (lines.length < rows) lines.push('');
  const border = '+' + '-'.repeat(width) + '+';
  return [border, ...lines.map(line => '|' + line.padEnd(width) + '|'), border].join('\n');
});
const status = computed(() => game.value.won ? 'You win!' : game.value.over ? 'Game over' : '');
const startLabel = computed(() => (running.value ? 'Pause' : game.value.over ? 'Play again' : started.value ? 'Resume' : 'Play'));

// the direction pad: four pixel art arcade buttons in a diamond, coloured like a
// super nintendo's face buttons. each is drawn on a 16x18 grid: a dark outline,
// a darker rim under the cap for depth, the cap itself with a highlight, and an arrow
const discRows = { 16: [6, 10, 12, 14, 14, 16, 16, 16, 16, 16, 16, 14, 14, 12, 10, 6], 14: [6, 10, 12, 12, 14, 14, 14, 14, 14, 14, 12, 12, 10, 6] };
const disc = (size, x, y) => discRows[size].map((w, row) => `M${x + (size - w) / 2} ${y + row}h${w}v1h-${w}z`).join('');
const pad = [
  { direction: 'up', label: 'Move up', color: '#3b5bdb', rim: '#1f3183', shine: '#9fb2f7', rotate: 0 },
  { direction: 'left', label: 'Move left', color: '#2f9e44', rim: '#175325', shine: '#96e5a4', rotate: -90 },
  { direction: 'right', label: 'Move right', color: '#e03131', rim: '#7d1717', shine: '#ffadad', rotate: 90 },
  { direction: 'down', label: 'Move down', color: '#f2c318', rim: '#8a6c05', shine: '#fff1a6', rotate: 180 },
];
const padShape = {
  outline: disc(16, 0, 0) + disc(16, 0, 2),
  rim: disc(14, 1, 3),
  cap: disc(14, 1, 1),
  shine: 'M4 3h3v1H4zM3 4h2v2H3z',
  // an up arrow in the middle of the cap, turned for the other directions
  arrow: 'M7 4h2v1H7zM6 5h4v1H6zM5 6h6v1H5zM7 7h2v4H7z',
};

function pause() {
  running.value = false;
  clearTimeout(timer);
}
function tick() {
  if (!running.value) return;
  const before = game.value.score;
  game.value = stepSnake(game.value, turns.shift() || game.value.direction);
  if (game.value.score > before) {
    track('snake-score', '', game.value.score);
    play('eat');
    buzz(25);
  }
  if (game.value.score > best.value) {
    best.value = game.value.score;
    save('snake-best', String(best.value));
  }
  if (game.value.over) {
    play(game.value.won ? 'chime' : 'error');
    buzz([60, 50, 90]);
    pause();
  }
  else timer = setTimeout(tick, Math.max(85, 170 - game.value.score * 4));
}
function reset() {
  pause();
  game.value = newSnake();
  turns.length = 0;
  started.value = false;
}
function toggle() {
  if (!props.active) return;
  if (running.value) return pause();
  if (game.value.over) reset();
  running.value = true;
  started.value = true;
  board.value?.focus({ preventScroll: true });
  timer = setTimeout(tick, 170);
}
function turn(direction) {
  if (!props.active || game.value.over || turns.length >= 2) return;
  const previous = directions[turns.at(-1) || game.value.direction];
  const next = directions[direction];
  if (next.x === -previous.x && next.y === -previous.y) return;
  turns.push(direction);
  if (!running.value) toggle();
  board.value?.focus({ preventScroll: true });
}
function key(event) {
  const direction = keyDirections[event.key] || keyDirections[event.key.toLowerCase()];
  if (direction || event.code === 'Space') event.preventDefault();
  if (event.repeat) return;
  if (direction) turn(direction);
  else if (event.code === 'Space') toggle();
}
// the pad reacts the moment a finger lands instead of waiting for a click (which
// only fires when the finger lifts), stays visibly pressed while held, and buzzes.
// the site already plays the button press sound (App.vue). keyboard presses still
// come through as clicks
const held = ref(null);
function padDown(event, direction) {
  if (event.button !== 0) return;
  event.preventDefault();
  held.value = direction;
  buzz(12);
  turn(direction);
}
function padUp() {
  held.value = null;
}
function padClick(event, direction) {
  if (event.detail === 0) turn(direction);
}
// the start and select pills get the same feel
function pill(action) {
  buzz(12);
  action();
}

// tapping the screen starts a game, resumes one, or starts over after a game over
function screenTap() {
  if (!running.value) toggle();
}
function visibility() { if (document.hidden) pause(); }
watch(() => props.active, active => { if (!active) pause(); });
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', visibility);
onBeforeUnmount(() => {
  pause();
  clearInterval(blinkTimer);
  window.removeEventListener('blur', pause);
  document.removeEventListener('visibilitychange', visibility);
});
</script>

<template>
  <!-- a vertical handheld: the screen up top, the arcade pad and start / select below -->
  <div class="app-layout snake-app" @keydown="key">
    <div class="content-scroll snake-content">
      <div class="snake-handheld">
        <div class="snake-bezel">
          <div class="snake-screen-top">
            <span class="snake-led" :class="{ on: running }" aria-hidden="true"/>
            <span class="snake-score">SCORE {{ String(game.score).padStart(3, '0') }}</span>
            <span class="snake-score">BEST {{ String(best).padStart(3, '0') }}</span>
          </div>
          <div
            ref="board"
            class="snake-board"
            tabindex="0"
            role="group"
            aria-label="ASCII Snake game board"
            aria-describedby="snake-help"
            @click="screenTap"
          >
            <pre aria-hidden="true">{{ art }}</pre>
          </div>
        </div>
        <p class="snake-brand" aria-hidden="true">JASON <em>boy</em></p>
        <p id="snake-help" class="sr-only">Arrow keys or WASD to move. Space to pause. Tap the screen to play.</p>

        <div class="snake-controls" role="group" aria-label="Direction controls">
          <button
            v-for="b in pad"
            :key="b.direction"
            :class="['snake-pad-button', `snake-pad-${b.direction}`, { held: held === b.direction }]"
            :aria-label="b.label"
            @pointerdown="padDown($event, b.direction)"
            @pointerup="padUp"
            @pointercancel="padUp"
            @pointerleave="padUp"
            @click="padClick($event, b.direction)"
          >
            <svg viewBox="0 0 16 18" shape-rendering="crispEdges" aria-hidden="true">
              <path :d="padShape.outline" fill="#111"/>
              <path :d="padShape.rim" :fill="b.rim"/>
              <g class="snake-pad-cap">
                <path :d="padShape.cap" :fill="b.color"/>
                <path :d="padShape.shine" :fill="b.shine"/>
                <path :d="padShape.arrow" fill="#fff" :transform="`rotate(${b.rotate} 8 8)`"/>
              </g>
            </svg>
          </button>
        </div>

        <!-- select restarts, start plays and pauses, like the pills on a game boy -->
        <div class="snake-pills">
          <div class="snake-pill-wrap">
            <button class="snake-pill" aria-label="Restart" @click="pill(reset)"/>
            <span aria-hidden="true">SELECT</span>
          </div>
          <div class="snake-pill-wrap">
            <button class="snake-pill" :aria-label="startLabel" @click="pill(toggle)"/>
            <span aria-hidden="true">START</span>
          </div>
        </div>
        <div class="snake-speaker" aria-hidden="true"/>
      </div>
    </div>
    <span class="sr-only" role="status">{{ status }}</span>
  </div>
</template>
