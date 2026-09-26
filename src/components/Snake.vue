<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { columns, rows, directions, newSnake, stepSnake } from '../snake.mjs';
import { read, save } from '../storage.js';

const props = defineProps({ active: Boolean });
const board = ref(null);
const game = ref(newSnake());
const running = ref(false);
const started = ref(false);
const best = ref(Math.max(0, Number(read('snake-best', '0')) || 0));
const turns = [];
let timer;
const keyDirections = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const art = computed(() => {
  const cells = Array.from({ length: rows }, () => Array(columns).fill(' '));
  if (game.value.food) cells[game.value.food.y][game.value.food.x] = '*';
  game.value.body.forEach((p, i) => { cells[p.y][p.x] = i ? 'o' : { up: '^', down: 'v', left: '<', right: '>' }[game.value.direction]; });
  const border = '+' + '--'.repeat(columns) + '+';
  return [border, ...cells.map(row => '|' + row.map(cell => cell + ' ').join('') + '|'), border].join('\n');
});
const status = computed(() => game.value.won ? 'You win!' : game.value.over ? 'Game over' : '');

function pause() {
  running.value = false;
  clearTimeout(timer);
}
function tick() {
  if (!running.value) return;
  game.value = stepSnake(game.value, turns.shift() || game.value.direction);
  if (game.value.score > best.value) {
    best.value = game.value.score;
    save('snake-best', String(best.value));
  }
  if (game.value.over) pause();
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
function visibility() { if (document.hidden) pause(); }
watch(() => props.active, active => { if (!active) pause(); });
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', visibility);
onBeforeUnmount(() => {
  pause();
  window.removeEventListener('blur', pause);
  document.removeEventListener('visibilitychange', visibility);
});
</script>

<template>
  <div class="app-layout snake-app" @keydown="key">
    <div class="toolbar">
      <button class="raised" @click="toggle">{{ running ? 'Pause' : game.over ? 'Play again' : started ? 'Resume' : 'Play' }}</button>
      <button class="raised" @click="reset">Restart</button>
      <span class="snake-score">Score: {{ game.score }} · Best: {{ best }}</span>
    </div>
    <div class="content-scroll snake-content">
      <div ref="board" class="snake-board inset" tabindex="0" role="group" aria-label="ASCII Snake game board" aria-describedby="snake-help">
        <pre aria-hidden="true">{{ art }}</pre>
      </div>
      <p id="snake-help" class="sr-only">Arrow keys or WASD to move. Space to pause.</p>
      <div class="snake-controls" aria-label="Direction controls">
        <button class="raised snake-up" aria-label="Move up" @click="turn('up')">↑</button>
        <button class="raised" aria-label="Move left" @click="turn('left')">←</button>
        <button class="raised" aria-label="Move down" @click="turn('down')">↓</button>
        <button class="raised" aria-label="Move right" @click="turn('right')">→</button>
      </div>
    </div>
    <footer v-if="status" class="status-bar" role="status"><span>{{ status }}</span></footer>
  </div>
</template>
