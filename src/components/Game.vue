<script setup>
// the contact window. it's just breakout, and beating it shows my email and
// unlocks the mail window so you can actually send me something.
// a win is remembered in the browser: the go to mail button stays for good, and the
// board stays beaten until someone presses restart.
// the game itself is plain js in breakout.js, this only mounts it.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { contact } from '../content.mjs';
import { createBreakout, arrowFor } from '../breakout.js';
import { createBackdrop } from '../ascii-backdrop.js';
import { theme } from '../theme.js';
import { beatContact, contactBeaten, contactBoardCleared, resetContactBoard } from '../unlocks.js';
import { track, trackOnce } from '../analytics.js';
import { play } from '../sound.js';
import RetroIcon from './RetroIcon.vue';
import { padShape } from '../arcade-button.mjs';
import { buzz } from '../haptics.js';

const props = defineProps({ active: Boolean });
const emit = defineEmits(['unlock', 'open']);
const root = ref(null);
const backdropCanvas = ref(null);
const beaten = ref(contactBeaten());
let game;
let backdrop;
let mailTimer;

// three lost balls in a row and mail opens anyway. kept outside the component so
// closing and reopening the contact window doesn't reset the streak
const mercyAfter = 3;
let lossesInARow = 0;

// for the analytics window: how many balls are lost, and how long a win takes from
// the first time play started this visit
let firstStart = 0;
let losses = 0;

function openMail() {
  emit('unlock', 'mail');
}

// the cabinet's coin slot starts a game: the coin drops in with a clink and a chime,
// then play begins. clicking the board before paying jiggles the slot, or pays when
// the slot is out of view
const coinDropping = ref(false);
const coinNudge = ref(false);
let coinTimer;
function insertCoin() {
  if (coinDropping.value) return;
  coinDropping.value = true;
  play('coin');
  buzz(10);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  coinTimer = setTimeout(() => {
    coinDropping.value = false;
    game?.start();
  }, still ? 0 : 650);
}
function askForCoin() {
  // a small window can push the deck off the bottom, so pay for them then
  const slot = root.value?.querySelector('.arcade-coin')?.getBoundingClientRect();
  const view = root.value?.querySelector('.game-content')?.getBoundingClientRect();
  if (!slot || !view || slot.top + 8 > view.bottom) return insertCoin();
  coinNudge.value = false;
  requestAnimationFrame(() => { coinNudge.value = true; });
}

// the left and right buttons hold the paddle's direction like the arrow keys, and
// the arrow keys (or a and d) press the buttons down on screen while they're held
const held = ref(null);
const keyHeld = ref(null);
const keyDirections = { ArrowLeft: 'left', ArrowRight: 'right' };
function keyDown(event) {
  const direction = keyDirections[arrowFor(event.code)];
  if (direction) keyHeld.value = direction;
}
function keyUp(event) {
  if (keyDirections[arrowFor(event.code)] === keyHeld.value) keyHeld.value = null;
}
function hold(direction, down) {
  if (down === (held.value === direction)) return;
  held.value = down ? direction : null;
  game?.hold(direction, down);
  if (down) buzz(6);
}
const buttons = [
  { direction: 'left', label: 'Move left', color: '#2f9e44', rim: '#175325', shine: '#96e5a4', rotate: -90 },
  { direction: 'right', label: 'Move right', color: '#e03131', rim: '#7d1717', shine: '#ffadad', rotate: 90 },
];

onMounted(() => {
  game = createBreakout(root.value, {
    email: contact.email,
    won: contactBoardCleared(),
    onStart: () => {
      firstStart ||= Date.now();
      trackOnce('breakout-start');
    },
    onWin: () => {
      track('breakout-complete');
      trackOnce('breakout-win', '', Math.round((Date.now() - firstStart) / 1000));
      lossesInARow = 0;
      beatContact();
      beaten.value = true;
      // give the revealed email a moment on screen before the mail window pops up
      mailTimer = setTimeout(openMail, 1200);
    },
    // restart puts the bricks back, but mail stays unlocked and go to mail stays put
    onRestart: () => {
      clearTimeout(mailTimer);
      if (beaten.value) resetContactBoard();
    },
    onCoin: askForCoin,
    onLose: () => {
      track('breakout-lose', '', ++losses);
      if (++lossesInARow < mercyAfter || beaten.value) return;
      trackOnce('breakout-mercy');
      lossesInARow = 0;
      beatContact();
      beaten.value = true;
      emit('unlock', 'mail', 'Three tries is plenty. Mail is open, say hi anyway!');
    },
  });
  game.setActive(props.active);
  backdrop = createBackdrop(backdropCanvas.value, {
    running: () => root.value?.querySelector('#breakout-start')?.dataset.state === 'pause',
  });
  backdrop.setActive(props.active);
  // the email revealed on the board is a mailto link. clicking it skips the mail form
  root.value.querySelector('.breakout-email').addEventListener('click', event => {
    if (event.target.closest('a')) trackOnce('email-click');
  });
});

// pause when the window isn't in front
watch(() => props.active, active => {
  game?.setActive(active);
  backdrop?.setActive(active);
});
watch(theme, () => backdrop?.redraw());

onBeforeUnmount(() => {
  clearTimeout(mailTimer);
  clearTimeout(coinTimer);
  game?.destroy();
  backdrop?.destroy();
});
</script>

<template>
  <div ref="root" class="app-layout contact-game">
    <div class="toolbar ie-toolbar">
      <button id="breakout-start" class="ie-button icon-button" data-state="play" title="Start or pause the ball (Space)">
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <!-- an equilateral triangle: 10px tall, about 8.7px across -->
          <path class="accent play-glyph" d="M2 1h1v1H2zM2 2h3v1H2zM2 3h4v1H2zM2 4h6v1H2zM2 5h8v2H2zM2 7h6v1H2zM2 8h4v1H2zM2 9h3v1H2zM2 10h1v1H2z"/>
          <path class="accent pause-glyph" d="M3 2h2v8H3zM7 2h2v8H7z"/>
        </svg>
        <span>Play</span>
      </button>
      <button id="breakout-restart" class="ie-button icon-button" title="Put the bricks back and start over">
        <!-- the same arrow circle as the portrait's reset button -->
        <svg class="spin-icon" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 1h4v1H4zM9 1h1v1H9zM2 2h2v1H2zM8 2h2v1H8zM2 3h1v1H2zM7 3h3v1H7zM1 4h1v4H1zM10 6h1v2h-1zM2 8h1v1H2zM9 8h1v1H9zM2 9h2v1H2zM8 9h2v1H8zM4 10h4v1H4z"/></svg>
        <span>Restart</span>
      </button>
      <button v-if="beaten" class="ie-button go-to-mail" title="Open the mail window and send me a message" @pointerenter="play('letter')" @click="openMail">
        <RetroIcon name="mail"/>
        <span>Go to Mail</span>
      </button>
      <button class="ie-button" title="Open the Games folder" @click="emit('open', 'games')">
        <RetroIcon name="games"/>
        <span>Games</span>
      </button>
      <button class="ie-button" title="See Breakout wins in Analytics" @click="emit('open', 'analytics')">
        <RetroIcon name="chart"/>
        <span>Stats</span>
      </button>
    </div>

    <div class="content-scroll game-content" @keydown="keyDown" @keyup="keyUp" @focusout="keyHeld = null">
      <canvas ref="backdropCanvas" class="breakout-backdrop" aria-hidden="true"/>
      <!-- the game stands in an upright arcade cabinet: a lit CONTACT marquee, speakers,
           the screen in its bezel, and a control deck with the
           left and right buttons and the coin slot -->
      <div class="arcade-cabinet">
        <div class="arcade-marquee">
          <div class="arcade-sign">
            <span class="arcade-badge" aria-hidden="true">TANGO</span>
            <!-- one span per letter so the marquee can animate them -->
            <h2 class="arcade-title" aria-label="CONTACT"><span v-for="(letter, i) in 'CONTACT'" :key="i" :style="{ '--i': i }" aria-hidden="true">{{ letter }}</span></h2>
            <span class="arcade-subtitle" aria-hidden="true"><span class="star">&#9733;</span>&nbsp;<span v-for="(letter, i) in 'BREAKOUT'" :key="i" :style="{ '--i': i }">{{ letter }}</span>&nbsp;<span class="star">&#9733;</span></span>
          </div>
        </div>
        <!-- the screen sits back in a recess: a ceiling under the marquee and a wall
             either side angle in toward it, and the deck below is its floor -->
        <div class="arcade-alcove">
        <div class="arcade-ceiling" aria-hidden="true"/>
        <div class="arcade-speakers" aria-hidden="true"><i/><i/></div>
        <div class="arcade-bezel">
          <!-- --email-chars lets the css size the email text to fit the board -->
          <div class="breakout-board" :style="{ '--email-chars': contact.email.length }">
            <div class="breakout-email"/>
            <canvas
              id="breakout"
              width="300"
              height="240"
              tabindex="0"
              aria-label="Breakout"
              aria-describedby="breakout-help"
            />
          </div>
        </div>
        </div>
        <div class="arcade-deck">
          <div class="arcade-deck-shell" aria-hidden="true"/>
          <div class="arcade-controls">
            <button
              v-for="b in buttons"
              :key="b.direction"
              :class="['arcade-button', { held: held === b.direction || keyHeld === b.direction }]"
              :aria-label="b.label"
              @pointerdown.prevent="hold(b.direction, true)"
              @pointerup="hold(b.direction, false)"
              @pointercancel="hold(b.direction, false)"
              @pointerleave="hold(b.direction, false)"
              @keydown.enter.space.prevent="hold(b.direction, true)"
              @keyup.enter.space="hold(b.direction, false)"
              @blur="hold(b.direction, false)"
            >
              <svg viewBox="0 0 16 18" shape-rendering="crispEdges" aria-hidden="true">
                <path :d="padShape.outline" fill="#111"/>
                <path :d="padShape.rim" :fill="b.rim"/>
                <g class="arcade-button-cap">
                  <path :d="padShape.cap" :fill="b.color"/>
                  <path :d="padShape.shine" :fill="b.shine"/>
                  <path :d="padShape.arrow" fill="#fff" :transform="`rotate(${b.rotate} 8 8)`"/>
                </g>
              </svg>
            </button>
          </div>
          <!-- the coin slot on the deck: a blinking COIN beside the slot, which takes
               your coin and starts the game -->
          <div class="arcade-door">
            <button class="arcade-coin" :class="{ dropping: coinDropping, nudge: coinNudge }"
              aria-label="Insert coin to start" @click="insertCoin" @animationend.self="coinNudge = false">
              <span class="arcade-coin-label" aria-hidden="true">COIN</span>
              <span class="arcade-coin-slot" aria-hidden="true"><span class="arcade-coin-piece"/></span>
            </button>
          </div>
        </div>
        <!-- the lower body runs down to the bottom of the window, with a service door
             when there's room -->
        <div class="arcade-lower"><span class="arcade-service" aria-hidden="true"/></div>
      </div>
    </div>

    <p id="breakout-help" class="sr-only">Insert a coin to start. Move with the mouse, touch, the arrow keys, A and D, or the left and right buttons. Space pauses. Clear the bricks to reveal my email.</p>
    <div id="breakout-progress" class="sr-only" aria-label="Email reveal progress"/>
    <span id="breakout-status" class="sr-only" role="status"/>

    <footer class="status-bar"><span>insert coin, then move with mouse, arrows or a / d</span></footer>
  </div>
</template>
