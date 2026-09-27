<script setup>
// the contact window. it's just breakout, and beating it shows my email and
// unlocks the mail window so you can actually send me something.
// a win is remembered in the browser: the go to mail button stays for good, and the
// board stays beaten until someone presses restart.
// the game itself is plain js in breakout.js, this only mounts it.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { contact } from '../content.mjs';
import { createBreakout } from '../breakout.js';
import { createBackdrop } from '../ascii-backdrop.js';
import { theme } from '../theme.js';
import { beatContact, contactBeaten, contactBoardCleared, resetContactBoard } from '../unlocks.js';
import { track, trackOnce } from '../analytics.js';
import { play } from '../sound.js';
import RetroIcon from './RetroIcon.vue';

const props = defineProps({ active: Boolean });
const emit = defineEmits(['unlock']);
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
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 1h4v1H4zM9 1h1v1H9zM2 2h2v1H2zM8 2h2v1H8zM2 3h1v1H2zM7 3h3v1H7zM1 4h1v4H1zM10 6h1v2h-1zM2 8h1v1H2zM9 8h1v1H9zM2 9h2v1H2zM8 9h2v1H8zM4 10h4v1H4z"/></svg>
        <span>Restart</span>
      </button>
      <button v-if="beaten" class="ie-button go-to-mail" title="Open the mail window and send me a message" @pointerenter="play('letter')" @click="openMail">
        <RetroIcon name="mail"/>
        <span>Go to Mail</span>
      </button>
    </div>

    <div class="content-scroll game-content">
      <canvas ref="backdropCanvas" class="breakout-backdrop" aria-hidden="true"/>
      <p class="contact-invitation">Want to get my email? Beat the game :)</p>
      <!-- --email-chars lets the css size the email text to fit the board -->
      <div class="breakout-board inset" :style="{ '--email-chars': contact.email.length }">
        <div class="breakout-email"/>
        <canvas
          id="breakout"
          width="300"
          height="300"
          tabindex="0"
          aria-label="Breakout"
          aria-describedby="breakout-help"
        />
      </div>
    </div>

    <p id="breakout-help" class="sr-only">Move with the mouse, touch, or arrow keys. Space starts or pauses. Clear the bricks to reveal my email.</p>
    <div id="breakout-progress" class="sr-only" aria-label="Email reveal progress"/>
    <span id="breakout-status" class="sr-only" role="status"/>

    <footer class="status-bar"><span>move with mouse or arrow keys</span></footer>
  </div>
</template>
