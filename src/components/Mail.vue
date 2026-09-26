<script setup>
// the mail window you get for beating breakout. it looks like old outlook express
// but actually sends: it posts to /api/contact, which the cloudflare worker
// (worker/index.js) emails to me with the sender as the reply-to
import { ref } from 'vue';
import { contact } from '../content.mjs';
import { play } from '../sound.js';

const name = ref('');
const email = ref('');
const message = ref('');
// hidden from people, bots tend to fill it in
const website = ref('');
const sending = ref(false);
const openedAt = Date.now();

// success or failure shows up as the yellow note on the desktop (App.vue)
const notify = (title, message) => window.dispatchEvent(new CustomEvent('site-notice', { detail: { title, message } }));

async function send() {
  if (sending.value) return;
  sending.value = true;

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        message: message.value,
        website: website.value,
        elapsed: Date.now() - openedAt,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) throw new Error(result.error || 'Couldn’t send right now.');

    message.value = '';
    notify('Message sent', 'Thanks! I’ll get back to you soon.');
    play('chime');
  } catch (error) {
    // the message stays in the box so it can be sent again
    notify('Couldn’t send', `${error.message} You can also email ${contact.email}.`);
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <form class="app-layout mail-app" @submit.prevent="send">
    <div class="mail-fields">
      <button class="raised mail-label tinted" type="submit" :disabled="sending">{{ sending ? 'Sending…' : 'Send' }}</button>
      <input class="inset" :value="contact.email" aria-label="To" readonly>

      <label class="raised mail-label" for="mail-name">Name</label>
      <input id="mail-name" v-model="name" class="inset" autocomplete="name" maxlength="100" required>

      <label class="raised mail-label" for="mail-email">Email</label>
      <input id="mail-email" v-model="email" class="inset" type="email" autocomplete="email" maxlength="200" required>
    </div>

    <textarea
      v-model="message"
      class="mail-message inset"
      aria-label="Message"
      placeholder="Enter your message here... then click Send"
      maxlength="5000"
      required
    />

    <!-- honeypot, see worker/contact.mjs -->
    <input v-model="website" class="mail-trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">

  </form>
</template>
