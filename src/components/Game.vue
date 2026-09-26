<script setup>
// the contact window. it's just breakout, and beating it shows my email and
// unlocks the mail window so you can actually send me something.
// a win is remembered in the browser, so the board stays beaten (with a button
// straight to mail) until someone presses restart.
// the game itself is plain js in breakout.js, this only mounts it.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { contact } from '../content.mjs';
import { createBreakout } from '../breakout.js';
import { beatContact, contactBeaten, forgetContact } from '../unlocks.js';

const props = defineProps({ active: Boolean });
const emit = defineEmits(['unlock']);
const root = ref(null);
const beaten = ref(contactBeaten());
let game;
let mailTimer;

function openMail() {
  emit('unlock', 'mail');
}

onMounted(() => {
  game = createBreakout(root.value, {
    email: contact.email,
    won: beaten.value,
    onWin: () => {
      beatContact();
      beaten.value = true;
      // give the revealed email a moment on screen before the mail window pops up
      mailTimer = setTimeout(openMail, 1200);
    },
    onRestart: () => {
      clearTimeout(mailTimer);
      forgetContact();
      beaten.value = false;
    },
  });
  game.setActive(props.active);
});

// pause when the window isn't in front
watch(() => props.active, active => game?.setActive(active));

onBeforeUnmount(() => {
  clearTimeout(mailTimer);
  game?.destroy();
});
</script>

<template>
  <div ref="root" class="app-layout contact-game">
    <p class="contact-invitation">Want to get my email? Beat the game :)</p>
    <div class="toolbar">
      <button id="breakout-start" class="raised">Play</button>
      <button id="breakout-restart" class="raised">Restart</button>
      <button v-if="beaten" class="raised go-to-mail" @click="openMail">Go to Mail</button>
    </div>

    <div class="content-scroll game-content">
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

    <footer class="status-bar"><span>Move with your mouse, touch, or arrow keys.</span></footer>
  </div>
</template>
