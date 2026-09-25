<script setup>
// minesweeper, as close to the win98 one as i could get it.
// left click opens, right click (or f, or long press on touch) flags,
// clicking a number with all its flags placed opens the rest around it.
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  digits,
  faceFill,
  faceOutline,
  faces,
  flagCloth,
  flagPole,
  mineBody,
  mineShine,
  segmentPolygons,
  segmentsOn,
} from '../minesweeper-art.mjs';

const props = defineProps({ active: Boolean, win: Object });

// [rows, cols, mines]
const levels = {
  Beginner: [9, 9, 10],
  Intermediate: [16, 16, 40],
  Expert: [16, 30, 99],
};

const level = ref('Beginner');
const cells = ref([]);
const state = ref('ready'); // ready, playing, won or lost
const seconds = ref(0);
const pressed = ref(false); // makes the face do the :o while you hold a cell down
const menuOpen = ref(false);

// template refs
const root = ref(null);
const grid = ref(null);
const gameButton = ref(null);

let timer;
let holdTimer;
let held = false;

const size = computed(() => {
  const [rows, cols, mines] = levels[level.value];
  return { rows, cols, mines };
});

const flags = computed(() => cells.value.filter(c => c.flag).length);

const face = computed(() => {
  if (state.value === 'lost') return 'dead';
  if (state.value === 'won') return 'cool';
  return pressed.value ? 'surprised' : 'smile';
});

const status = computed(() => ({
  ready: '',
  playing: `${size.value.mines - flags.value} mines left`,
  won: 'You win!',
  lost: 'Boom. Press the face to play again.',
})[state.value]);

// three digit led display. negative numbers happen when you place too many flags
function pad(n) {
  if (n < 0) return `-${String(Math.min(99, -n)).padStart(2, '0')}`;
  return String(Math.min(999, n)).padStart(3, '0');
}

function neighbors(i) {
  const { rows, cols } = size.value;
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if ((dr || dc) && nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  }
  return out;
}

function newGame(name = level.value) {
  const changed = name !== level.value;
  level.value = name;
  menuOpen.value = false;
  clearInterval(timer);
  seconds.value = 0;
  state.value = 'ready';
  cells.value = Array.from(
    { length: size.value.rows * size.value.cols },
    () => reactive({ mine: false, n: 0, open: false, flag: false, boom: false }),
  );
  if (changed) fitWindow();
}

// the window can't be resized by hand. instead it wraps the board exactly,
// so the squares are always 24px no matter the difficulty
async function fitWindow() {
  await nextTick();
  const win = props.win;
  if (!win || !root.value || innerWidth <= 700) return;

  const desktop = document.querySelector('.desktop')?.getBoundingClientRect();
  const frame = root.value.querySelector('.mines-frame');
  const menubar = root.value.querySelector('.mines-menubar');
  const width = Math.ceil(win.width - root.value.clientWidth + frame.offsetWidth + 12);
  const height = Math.ceil(win.height - root.value.clientHeight + menubar.offsetHeight + frame.offsetHeight + 6);
  Object.assign(win, { width, height, minWidth: width, minHeight: height });

  // bigger boards might hang off the edge, so nudge the window back on screen
  if (desktop) {
    win.x = Math.max(0, Math.min(win.x, desktop.width - width));
    win.y = Math.max(0, Math.min(win.y, desktop.height - height));
  }
}

// mines go down on the first click, and never on or next to that cell,
// so the first click always opens up some space
function plant(safe) {
  const keep = new Set([safe, ...neighbors(safe)]);
  const spots = cells.value.map((_, i) => i).filter(i => !keep.has(i));

  for (let left = size.value.mines; left > 0; left--) {
    const pick = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
    cells.value[pick].mine = true;
  }
  cells.value.forEach((cell, i) => {
    cell.n = neighbors(i).filter(j => cells.value[j].mine).length;
  });

  state.value = 'playing';
  timer = setInterval(() => {
    if (seconds.value < 999) seconds.value++;
  }, 1000);
}

// flood fill: opening an empty cell keeps opening its neighbours
function open(i) {
  const stack = [i];
  while (stack.length) {
    const j = stack.pop();
    const cell = cells.value[j];
    if (cell.open || cell.flag) continue;
    cell.open = true;
    if (cell.mine) return lose(cell);
    if (!cell.n) stack.push(...neighbors(j));
  }
  if (cells.value.every(c => c.mine || c.open)) win();
}

function reveal(i) {
  // a long press already flagged this cell, so skip the click that follows it
  if (held) {
    held = false;
    return;
  }
  if (state.value === 'won' || state.value === 'lost') return;

  const cell = cells.value[i];
  if (state.value === 'ready') plant(i);

  if (!cell.open) {
    open(i);
    return;
  }

  // chording: if a number already has the right amount of flags around it, open the rest
  const around = neighbors(i);
  const flagged = around.filter(j => cells.value[j].flag).length;
  if (cell.n && flagged === cell.n) {
    around.forEach(j => {
      if (state.value === 'playing') open(j);
    });
  }
}

function toggleFlag(i) {
  const cell = cells.value[i];
  if (state.value === 'won' || state.value === 'lost' || cell.open) return;
  cell.flag = !cell.flag;
}

// touch has no right click, so holding a cell flags it instead
function cellDown(event, i) {
  pressed.value = state.value === 'playing' || state.value === 'ready';
  if (event.pointerType !== 'touch') return;

  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    held = true;
    pressed.value = false;
    toggleFlag(i);
    navigator.vibrate?.(20);
  }, 450);
}

function cellUp() {
  clearTimeout(holdTimer);
  pressed.value = false;
}

function lose(cell) {
  cell.boom = true;
  state.value = 'lost';
  clearInterval(timer);
  // show every mine you didn't flag
  cells.value.forEach(c => {
    if (c.mine && !c.flag) c.open = true;
  });
}

function win() {
  state.value = 'won';
  clearInterval(timer);
  cells.value.forEach(c => {
    if (c.mine) c.flag = true;
  });
}

// arrow keys move around the board, f flags
function keys(event, i) {
  const { cols } = size.value;
  const move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[event.key];

  if (move !== undefined) {
    event.preventDefault();
    const next = i + move;
    const inBounds = next >= 0 && next < cells.value.length;
    // left/right shouldn't wrap onto the next row
    const wrapped = Math.abs(move) === 1 && Math.floor(next / cols) !== Math.floor(i / cols);
    if (inBounds && !wrapped) grid.value.children[next].focus();
  } else if (event.key === 'f' || event.key === 'F') {
    toggleFlag(i);
  }
}

function label(cell, i) {
  const { cols } = size.value;
  const where = `Row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}`;
  if (cell.flag) return `${where}, flagged`;
  if (!cell.open) return `${where}, hidden`;
  return `${where}, ${cell.mine ? 'mine' : cell.n || 'empty'}`;
}

async function toggleMenu() {
  menuOpen.value = !menuOpen.value;
  if (menuOpen.value) {
    await nextTick();
    root.value.querySelector('.mines-menu [aria-checked="true"]')?.focus();
  }
}

function menuKeys(event) {
  const items = [...root.value.querySelectorAll('.mines-menu [role="menuitemradio"]')];
  const i = items.indexOf(document.activeElement);

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const next = (i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  }

  if (event.key === 'Escape') {
    // don't let the window's escape handler see this too
    event.stopPropagation();
    menuOpen.value = false;
    gameButton.value.focus();
  }
}

function outside(event) {
  if (menuOpen.value && !event.target.closest('.mines-menubar')) menuOpen.value = false;
}

function onRightClick(event, i) {
  // touch uses long press instead, and some browsers fire contextmenu on long press too
  if (event.pointerType !== 'touch') toggleFlag(i);
}

newGame();

onMounted(() => {
  fitWindow();
  document.addEventListener('pointerdown', outside);
});

onBeforeUnmount(() => {
  clearInterval(timer);
  clearTimeout(holdTimer);
  document.removeEventListener('pointerdown', outside);
});
</script>

<template>
  <div ref="root" class="app-layout minesweeper-app">
    <nav class="mines-menubar">
      <button
        ref="gameButton"
        :class="{ open: menuOpen }"
        aria-haspopup="menu"
        :aria-expanded="menuOpen"
        @click="toggleMenu"
      ><u>G</u>ame</button>
      <div v-if="menuOpen" class="mines-menu raised" role="menu" aria-label="Game" @keydown="menuKeys">
        <button
          v-for="(_, name) in levels"
          :key="name"
          role="menuitemradio"
          :aria-checked="level === name"
          @click="newGame(name)"
        >
          <span class="mines-check" aria-hidden="true">{{ level === name ? '✓' : '' }}</span>{{ name }}
        </button>
      </div>
    </nav>

    <div class="mines-body">
      <div class="mines-frame raised">
        <div class="mines-header inset">
          <!-- mine counter on the left, timer on the right -->
          <span
            v-for="(value, key) in { 'Mines left': size.mines - flags, Seconds: seconds }"
            :key="key"
            :class="['mines-counter', { right: key === 'Seconds' }]"
            role="img"
            :aria-label="`${key}: ${value}`"
          >
            <svg v-for="(char, n) in pad(value)" :key="n" viewBox="0 0 13 23" aria-hidden="true">
              <polygon
                v-for="seg in segmentPolygons"
                :key="seg.name"
                :points="seg.pts"
                :class="{ lit: segmentsOn[char].includes(seg.name) }"
              />
            </svg>
          </span>

          <button class="mines-face raised" aria-label="New game" @click="newGame()">
            <svg viewBox="0 0 17 17" aria-hidden="true">
              <path :d="faceFill" fill="#ff0"/>
              <path :d="faceOutline + faces[face]" fill="#000"/>
            </svg>
          </button>
        </div>

        <div
          ref="grid"
          class="mines-grid inset"
          role="group"
          aria-label="Minefield"
          :style="{ '--cols': size.cols }"
          @pointerup="cellUp"
          @pointerleave="cellUp"
          @pointercancel="cellUp"
          @contextmenu.prevent
        >
          <button
            v-for="(cell, i) in cells"
            :key="`${level}-${i}`"
            :class="['mine-cell', cell.open ? 'open' : 'raised', { boom: cell.boom, [`n${cell.n}`]: cell.open && !cell.mine }]"
            :aria-label="label(cell, i)"
            @pointerdown="cellDown($event, i)"
            @click="reveal(i)"
            @contextmenu.prevent="onRightClick($event, i)"
            @keydown="keys($event, i)"
          >
            <svg v-if="cell.flag" class="mine-flag" viewBox="0 0 8 10" aria-hidden="true">
              <path :d="flagCloth" fill="#f00"/>
              <path :d="flagPole" fill="#000"/>
            </svg>
            <svg v-else-if="cell.open && cell.mine" class="mine-bomb" viewBox="0 0 13 13" aria-hidden="true">
              <path :d="mineBody" fill="#000"/>
              <path :d="mineShine" fill="#fff"/>
            </svg>
            <svg v-else-if="cell.open && cell.n" class="mine-number" viewBox="0 0 8 8" aria-hidden="true">
              <path :d="digits[cell.n]"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <span class="sr-only" role="status">{{ status }}</span>
  </div>
</template>
