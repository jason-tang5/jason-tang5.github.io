<script setup>
// the mail window you get for beating breakout. it looks like old outlook express
// but actually sends: it posts to /api/contact, which the cloudflare worker
// (worker/index.js) emails to me with the sender as the reply-to.
// problems show up in a windows 95 style error box instead of the browser's own
// bubbles, and how the last send went stays at the bottom of the window
import { nextTick, ref } from 'vue';
import { contact } from '../content.mjs';
import { play } from '../sound.js';
// the same checks the worker runs, so the two can't disagree
import { validate } from '../../worker/contact.mjs';

const name = ref('');
const email = ref('');
const message = ref('');
// hidden from people, bots tend to fill it in
const website = ref('');
const sending = ref(false);
const openedAt = Date.now();

// { ok, text } for the last send, shown in the status bar
const result = ref(null);
// the error box: its text and which field to go back to afterwards
const dialog = ref(null);
const okButton = ref(null);
const fields = { name: ref(null), email: ref(null), message: ref(null) };

// success or failure also shows up as the yellow note on the desktop (App.vue)
const notify = (title, text) => window.dispatchEvent(new CustomEvent('site-notice', { detail: { title, message: text } }));

// which field an error is about, going by its wording
function fieldFor(error) {
  if (/name/i.test(error)) return 'name';
  if (/email/i.test(error)) return 'email';
  if (/message/i.test(error)) return 'message';
  return null;
}

async function showError(text, field = fieldFor(text)) {
  dialog.value = { text, field };
  play('error');
  await nextTick();
  okButton.value?.focus();
}

async function closeDialog() {
  const field = dialog.value?.field;
  dialog.value = null;
  await nextTick();
  fields[field]?.value?.focus();
}

async function send() {
  if (sending.value || dialog.value) return;

  const body = {
    name: name.value,
    email: email.value,
    message: message.value,
    website: website.value,
    elapsed: Date.now() - openedAt,
  };
  const check = validate(body);
  if (!check.ok) return showError(check.error);

  sending.value = true;
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const reply = await response.json().catch(() => ({}));
    if (!response.ok || reply.ok !== true) throw new Error(reply.error || 'Couldn’t send right now.');

    message.value = '';
    result.value = { ok: true, text: 'Message sent! I’ll get back to you soon.' };
    notify('Message sent', 'Thanks! I’ll get back to you soon.');
    play('chime');
  } catch (error) {
    // the message stays in the box so it can be sent again
    result.value = { ok: false, text: `Not sent: ${error.message}` };
    notify('Couldn’t send', `${error.message} You can also email ${contact.email}.`);
    showError(`${error.message} You can also email ${contact.email}.`, fieldFor(error.message));
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <!-- novalidate turns off the browser's own "please fill out this field" bubbles -->
  <form class="app-layout mail-app" novalidate @submit.prevent="send">
    <div class="mail-fields">
      <button class="raised mail-label tinted" type="submit" :disabled="sending">{{ sending ? 'Sending…' : 'Send' }}</button>
      <input class="inset" :value="contact.email" aria-label="To" readonly>

      <label class="raised mail-label" for="mail-name">Name</label>
      <input id="mail-name" :ref="fields.name" v-model="name" class="inset" autocomplete="name" maxlength="100" required>

      <label class="raised mail-label" for="mail-email">Email</label>
      <input id="mail-email" :ref="fields.email" v-model="email" class="inset" type="email" autocomplete="email" maxlength="200" required>
    </div>

    <textarea
      :ref="fields.message"
      v-model="message"
      class="mail-message inset"
      aria-label="Message"
      placeholder="Enter your message here... then click Send"
      maxlength="5000"
      required
    />

    <!-- honeypot, see worker/contact.mjs -->
    <input v-model="website" class="mail-trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">

    <!-- how the last send went, with a pixel tick or cross -->
    <footer v-if="result" class="status-bar mail-result" :class="result.ok ? 'sent' : 'failed'" role="status">
      <span>
        <svg width="14" height="14" viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true">
          <path v-if="result.ok" fill="#1a7f2e" d="M6 1h1v1H6zM5 2h1v1H5zM4 3h1v1H4zM0 3h1v1H0zM1 4h1v1H1zM3 4h1v1H3zM2 5h1v1H2z"/>
          <path v-else fill="#c01818" d="M0 0h2v1H0zM5 0h2v1H5zM1 1h2v1H1zM4 1h2v1H4zM2 2h3v3H2zM1 5h2v1H1zM4 5h2v1H4zM0 6h2v1H0zM5 6h2v1H5z"/>
        </svg>
        {{ result.text }}
      </span>
    </footer>

    <!-- the windows 95 error box, over the mail window until it's dismissed -->
    <div v-if="dialog" class="mail-dialog-backdrop" @keydown.esc.stop.prevent="closeDialog">
      <div class="mail-dialog window-style" role="alertdialog" aria-modal="true" aria-labelledby="mail-dialog-title" aria-describedby="mail-dialog-text">
        <div class="mail-dialog-title">
          <span id="mail-dialog-title">Mail</span>
          <button type="button" class="control" aria-label="Close" @click="closeDialog">×</button>
        </div>
        <div class="mail-dialog-body">
          <!-- the classic red circle with a white cross -->
          <svg width="32" height="32" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
            <path fill="#800000" d="M5 0h6v1H5zM3 1h10v1H3zM2 2h12v1H2zM1 3h14v2H1zM0 5h16v6H0zM1 11h14v2H1zM2 13h12v1H2zM3 14h10v1H3zM5 15h6v1H5z"/>
            <path fill="#e01010" d="M5 1h6v1H5zM3 2h10v1H3zM2 3h12v2H2zM1 5h14v6H1zM2 11h12v2H2zM3 13h10v1H3zM5 14h6v1H5z"/>
            <path fill="#fff" d="M4 4h2v1H4zM10 4h2v1h-2zM5 5h2v1H5zM9 5h2v1H9zM6 6h4v1H6zM7 7h2v2H7zM6 9h4v1H6zM5 10h2v1H5zM9 10h2v1H9zM4 11h2v1H4zM10 11h2v1h-2z"/>
          </svg>
          <p id="mail-dialog-text">{{ dialog.text }}</p>
        </div>
        <button ref="okButton" type="button" class="raised mail-dialog-ok" @click="closeDialog">OK</button>
      </div>
    </div>
  </form>
</template>
