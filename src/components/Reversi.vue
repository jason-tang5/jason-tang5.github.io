<script setup>
// reversi against clippy. you're black and go first, clippy is white and thinks a few
// moves ahead (see bestMove in reversi.mjs). clippy talks in a yellow balloon the
// whole time, like the office assistant it's borrowed from.
// behind the table a much bigger ascii board keeps flipping itself, see ascii-backdrop.js
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { black, white, newBoard, legalMoves, flipsFor, play as playMove, count, gameOver, bestMove } from '../reversi.mjs';
import { read, save } from '../storage.js';
import { play } from '../sound.js';
import { buzz } from '../haptics.js';
import { track } from '../analytics.js';
import { createBackdrop, reversiScene } from '../ascii-backdrop.js';
import { theme } from '../theme.js';
import ClippyArt from './ClippyArt.vue';

const props = defineProps({ active: Boolean });
const board = ref(newBoard());
const turn = ref(black);
const thinking = ref(false);
const lastMove = ref(-1);
// each disc's flip is keyed so vue remounts it and the flip animation plays again,
// with a small delay per disc so a capture ripples out from the new one
const flipKeys = ref(Array(64).fill(0));
const flipDelay = ref(Array(64).fill(0));
const record = ref({ you: Number(read('reversi-you', '0')) || 0, clippy: Number(read('reversi-clippy', '0')) || 0 });
const say = ref('It looks like you’re trying to play Reversi. Would you like me to beat you?');
let timer;

const score = computed(() => count(board.value));
const over = computed(() => gameOver(board.value));
const moves = computed(() => (turn.value === black && !thinking.value && !over.value ? legalMoves(board.value, black) : []));
const status = computed(() => {
  if (over.value) {
    const s = score.value;
    return s[black] > s[white] ? 'You win!' : s[black] < s[white] ? 'Clippy wins' : 'Draw';
  }
  return thinking.value ? 'Clippy is thinking…' : 'Your move';
});

const lines = {
  start: ['It looks like you’re trying to play Reversi. Would you like me to beat you?', 'Ready when you are. Black goes first.', 'I’ve been practising since 1997.'],
  corner: ['Ooh, a corner. Nobody takes those back.', 'Corner! I love a corner.', 'That one’s mine for good.'],
  youCorner: ['Hey, that was my corner.', 'Okay, okay. Nice corner.', 'Did someone give you a hint?'],
  big: ['Look at them all flip!', 'That’s a lot of white.', 'Mind if I tidy that row up?'],
  normal: ['Your turn.', 'Hmm, your move.', 'I think that’ll do.', 'Would you like help with your next move? No? Okay.', 'Tap a dot to play.'],
  youPass: ['You don’t have a move, so I’ll go again.', 'No moves for you. My turn again!'],
  clippyPass: ['I don’t have a move. Go again.', 'Hmm, I’m stuck. You go.'],
  win: ['You won?! I’m going back to the Office.', 'Well played. I’ll be in the recycle bin.'],
  lose: ['Good game! Would you like help with your strategy?', 'I win! Want a rematch?'],
  draw: ['A draw! Let’s call it even.'],
  // the help button never helps
  help: [
    'It looks like you’re asking for help. Have you tried winning?',
    'Tip: the discs are black and white.',
    'I could help, but then I’d lose.',
    'Searching Help for “how to beat Clippy”… 0 results found.',
    'I’m not allowed to help the opponent. Office policy.',
    'Have you tried turning the board off and on again?',
    'Hint: put your disc somewhere good.',
    'Would you like me to write a letter about your next move?',
    'Press F1 for more of this.',
    'Help is on the way! (It isn’t.)',
  ],
  helpTired: ['Please stop pressing that.', 'Help is getting tired…', 'I can hear it creaking.'],
  helpBroken: ['Oh no. You broke Help.', 'Help has stopped working. Maybe that’s a sign.', 'That’s it, Help has left the building.'],
};
// the discs are tiny 8x9 pixel sprites, kept low res on purpose: a black outline drawn
// twice one row apart, and the face with a one pixel edge peeking out under it.
// each list is the width of a row of pixels
const rowsOf = (widths, y) => widths.map((w, row) => `M${(8 - w) / 2} ${y + row}h${w}v1h-${w}z`).join('');
const discShape = {
  outline: rowsOf([4, 6, 8, 8, 8, 8, 6, 4], 0) + rowsOf([4, 6, 8, 8, 8, 8, 6, 4], 1),
  edge: rowsOf([4, 6, 6, 6, 6, 4], 2),
  face: rowsOf([4, 6, 6, 6, 6, 4], 1),
};
const discColors = {
  [black]: { face: '#34343c', edge: '#000' },
  [white]: { face: '#f2f2ea', edge: '#8a8a84' },
};

const helpGlyph = 'M4 1h4v1H4zM3 2h2v1H3zM7 2h2v1H7zM7 3h2v1H7zM6 4h2v1H6zM5 5h2v1H5zM5 6h2v2H5zM5 9h2v2H5z';
const pick = list =>list[Math.floor(Math.random() * list.length)];
// clippy's face matches what he's saying (see ClippyArt.vue for the moods)
const moods = {
  start: 'happy', corner: 'smug', youCorner: 'surprised', big: 'smug', normal: 'neutral',
  youPass: 'smug', clippyPass: 'sad', win: 'sad', lose: 'happy', draw: 'neutral',
  help: 'smug', helpTired: 'angry', helpBroken: 'surprised',
};
const mood = ref('happy');
function speak(kind) {
  say.value = pick(lines[kind]);
  mood.value = moods[kind];
}
// clippy says something unhelpful, never the same line twice running. pressed too
// often, the button snaps in half and stays broken until reversi is opened again
const helpClicks = ref(0);
const helpBroken = ref(false);
function help() {
  if (helpBroken.value) return;
  helpClicks.value++;
  if (helpClicks.value >= 8) {
    helpBroken.value = true;
    speak('helpBroken');
    play('error');
    buzz([20, 30, 40]);
    return;
  }
  const list = helpClicks.value >= 5 ? lines.helpTired : lines.help;
  let line;
  do line = pick(list); while (line === say.value);
  say.value = line;
  mood.value = moods[helpClicks.value >= 5 ? 'helpTired' : 'help'];
  play('ping');
  buzz(8);
}
const isCorner = i => [0, 7, 56, 63].includes(i);

function place(index, player) {
  const flips = flipsFor(board.value, index, player);
  board.value = playMove(board.value, index, player);
  lastMove.value = index;
  const keys = flipKeys.value.slice();
  const delays = flipDelay.value.slice();
  const x0 = index % 8;
  const y0 = Math.floor(index / 8);
  keys[index]++;
  delays[index] = 0;
  for (const i of flips) {
    keys[i]++;
    delays[i] = Math.max(Math.abs(i % 8 - x0), Math.abs(Math.floor(i / 8) - y0)) * 70;
  }
  flipKeys.value = keys;
  flipDelay.value = delays;
  return flips.length;
}

function finish() {
  const s = score.value;
  const result = s[black] > s[white] ? 'win' : s[black] < s[white] ? 'lose' : 'draw';
  speak(result);
  if (result === 'win') record.value.you++;
  if (result === 'lose') record.value.clippy++;
  if (result !== 'draw') track(`reversi-${result}`);
  save('reversi-you', String(record.value.you));
  save('reversi-clippy', String(record.value.clippy));
  play(result === 'lose' ? 'error' : 'chime');
  buzz([60, 50, 90]);
}

// hand the turn over, skipping whoever has no move
function nextTurn(after) {
  if (gameOver(board.value)) {
    turn.value = black;
    return finish();
  }
  const next = after === black ? white : black;
  if (legalMoves(board.value, next).length) {
    turn.value = next;
  } else {
    turn.value = after;
    speak(next === black ? 'youPass' : 'clippyPass');
  }
  if (turn.value === white) clippyMove();
}

function clippyMove() {
  thinking.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!props.active) return;
    const move = bestMove(board.value, white);
    const flipped = place(move, white);
    play('tap');
    thinking.value = false;
    const youPass = !legalMoves(board.value, black).length;
    if (!youPass) speak(isCorner(move) ? 'corner' : flipped >= 5 ? 'big' : 'normal');
    nextTurn(white);
  }, 650 + Math.random() * 400);
}

function choose(index) {
  if (!props.active || !moves.value.includes(index)) return;
  const corner = isCorner(index);
  place(index, black);
  buzz(12);
  if (corner) speak('youCorner');
  nextTurn(black);
}

function restart() {
  clearTimeout(timer);
  board.value = newBoard();
  turn.value = black;
  thinking.value = false;
  lastMove.value = -1;
  speak('start');
}

// if the window lost focus while clippy was thinking, pick up again when it's back
watch(() => props.active, active => {
  backdrop?.setActive(active);
  if (active && thinking.value) clippyMove();
});

const cellLabel = i => {
  const where = `row ${Math.floor(i / 8) + 1}, column ${i % 8 + 1}`;
  const what = board.value[i] === black ? 'black' : board.value[i] === white ? 'white' : moves.value.includes(i) ? 'empty, you can play here' : 'empty';
  return `${where}, ${what}`;
};

const backdropCanvas = ref(null);
let backdrop;
onMounted(() => {
  backdrop = createBackdrop(backdropCanvas.value, { running: () => thinking.value, scene: reversiScene });
  backdrop.setActive(props.active);
});
watch(theme, () => backdrop?.redraw());
onBeforeUnmount(() => {
  clearTimeout(timer);
  backdrop?.destroy();
});
</script>

<template>
  <div class="app-layout reversi-app">
    <div class="toolbar ie-toolbar">
      <button class="ie-button icon-button" title="Clear the board and start over" @click="restart">
        <svg class="spin-icon" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 1h4v1H4zM9 1h1v1H9zM2 2h2v1H2zM8 2h2v1H8zM2 3h1v1H2zM7 3h3v1H7zM1 4h1v4H1zM10 6h1v2h-1zM2 8h1v1H2zM9 8h1v1H9zM2 9h2v1H2zM8 9h2v1H8zM4 10h4v1H4z"/></svg>
        <span>New game</span>
      </button>
      <button v-if="!helpBroken" class="ie-button icon-button" title="Ask Clippy for help" @click="help">
        <svg viewBox="0 0 12 12" aria-hidden="true"><path :d="helpGlyph"/></svg>
        <span>Help</span>
      </button>
      <!-- snapped in two along a jagged crack, each half slumped its own way -->
      <span v-else class="reversi-help-broken" role="img" aria-label="Help is broken" title="Help is broken. Reopen Reversi to fix it.">
        <span v-for="half in ['left', 'right']" :key="half" :class="['ie-button', 'icon-button', 'reversi-help-half', half]" aria-hidden="true">
          <svg viewBox="0 0 12 12"><path :d="helpGlyph"/></svg>
          <span>Help</span>
        </span>
      </span>
      <span class="reversi-record" title="Games won against Clippy, remembered in this browser">You {{ record.you }} · Clippy {{ record.clippy }}</span>
    </div>

    <div class="content-scroll reversi-content">
      <canvas ref="backdropCanvas" class="reversi-backdrop" aria-hidden="true"/>

      <div class="reversi-clippy">
        <ClippyArt :class="['reversi-clippy-art', { thinking }]" :mood="thinking ? 'thinking' : mood"/>
        <p class="reversi-balloon" aria-live="polite">{{ thinking ? 'Hmm, let me think…' : say }}</p>
      </div>

      <div class="reversi-table">
        <div class="reversi-scores">
          <span v-for="side in [black, white]" :key="side" :class="['reversi-side', { turn: turn === side && !over }]">
            <svg class="reversi-disc" viewBox="0 0 8 9" shape-rendering="crispEdges" aria-hidden="true">
              <path :d="discShape.outline" fill="#000"/>
              <path :d="discShape.edge" :fill="discColors[side].edge"/>
              <path :d="discShape.face" :fill="discColors[side].face"/>
            </svg>
            {{ side === black ? 'You' : 'Clippy' }} {{ score[side] }}
          </span>
        </div>
        <div class="reversi-board" role="grid" aria-label="Reversi board">
          <button
            v-for="(cell, i) in board"
            :key="i"
            :class="['reversi-cell', { legal: moves.includes(i), last: lastMove === i }]"
            :aria-label="cellLabel(i)"
            :disabled="!moves.includes(i)"
            @click="choose(i)"
          >
            <svg
              v-if="cell"
              :key="flipKeys[i]"
              :class="['reversi-disc', { flip: flipKeys[i] }]"
              :style="{ animationDelay: `${flipDelay[i]}ms` }"
              viewBox="0 0 8 9"
              shape-rendering="crispEdges"
              aria-hidden="true"
            >
              <path :d="discShape.outline" fill="#000"/>
              <path :d="discShape.edge" :fill="discColors[cell].edge"/>
              <path :d="discShape.face" :fill="discColors[cell].face"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <span class="sr-only" role="status">{{ status }}</span>
    <footer class="status-bar"><span>{{ status }}</span><span>{{ score[black] + score[white] }} / 64 discs</span></footer>
  </div>
</template>
