<script setup>
// the figures in the contact form blog post, swapped in for its images by
// blog-figures.mjs: the mail window you get for beating breakout, a message's trip
// from send to my inbox played a step at a time, where it goes and where it isn't
// kept, the spam checks to poke at, the email headers buildEmail writes, and the
// whole pipeline. the checks and the headers use the worker's own validate and
// buildEmail, so they can't drift from what really happens. nothing here sends email
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import RetroIcon from './RetroIcon.vue';
import BlogGraphic from './BlogGraphic.vue';
import { buildEmail, validate } from '../../worker/contact.mjs';

const props = defineProps({
  figure: { type: String, required: true },
  caption: { type: String, default: '' },
  number: { type: Number, default: 0 },
});

// read out in place of the picture, for screen readers
const descriptions = {
  flow: 'Send begins with validation in Mail. Invalid input stays in the browser. A valid request goes to the Worker: a disallowed Origin returns 403, a filled honeypot returns a fake success, and invalid fields or timing return 400. Otherwise Cloudflare accepts the email handoff and the Worker returns 200, or a send failure returns 502.',
  mail: 'A game of Breakout with every brick cleared and a YOU WIN banner, next to the Mail window it unlocks, where a visitor is typing a message to Jason.',
  journey: 'A message’s trip in steps: the Mail window posts to the Cloudflare Worker, the Worker checks it and hands it to Email Routing, the Worker answers the Mail window, and Email Routing delivers it to Gmail. Other versions show a message failing validation and a failed send.',
  delivery: 'The visitor’s browser sends to the Cloudflare Worker, which hands the email to Email Routing, which delivers it to Gmail. Separately, a note says nothing is saved in a database or KV.',
  spam: 'Controls for the Origin header, the hidden website field and how long the Mail window was open, and the Worker’s response for each combination.',
  headers: 'Compare the visitor as From with the site domain as From and the visitor as Reply-To. This illustrates sender alignment; it does not run an authentication or delivery check.',
  pipeline: 'Seven layers in a row: Vue, HTTP, Cloudflare Worker, MIME, Email Routing, DNS and Gmail, grouped into frontend, backend, infrastructure and delivery.',
};
const uid = `cf-${Math.random().toString(36).slice(2, 8)}`;
const contactFlow = {
  template: 'flow', title: 'Send → response', items: [
    { label: 'Press Send', text: 'Mail collects the name, email, message, honeypot and elapsed time.' },
    { label: 'Mail: input valid?', text: 'The shared validator runs in the browser before any request is sent.', branch: 'No → show the error; keep the draft.' },
    { label: 'POST /api/contact', text: 'The browser sends the fields as JSON to the Worker.' },
    { label: 'Origin allowed?', text: 'The Worker accepts its own Origin or an absent header.', branch: 'No → 403. Refuse the request.' },
    { label: 'Honeypot empty?', text: 'An empty website field lets validation continue.', branch: 'No → 200 fake success. Drop the message.' },
    { label: 'Timing and fields valid?', text: 'The Worker checks elapsed time and validates the fields again.', branch: 'No → 400. Show the error.' },
    { label: 'Handoff accepted?', text: 'The Worker builds the email and waits for SEND_EMAIL.send.', branch: 'No → 502. Keep the draft to retry.' },
    { label: '200 · Mail shows Sent', text: 'Cloudflare accepted the handoff. Gmail still decides how to handle the email.' },
  ],
};

// only animate while the figure is on screen, and not at all with reduced motion
const root = ref(null);
const visible = ref(false);
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observer;
onMounted(() => {
  if (typeof IntersectionObserver !== 'function') { visible.value = true; return; }
  observer = new IntersectionObserver(([entry]) => { visible.value = entry.isIntersecting; });
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());

// ---- mail: the message types itself out, once ----
const note = 'Hi Jason! Beat Breakout on the first try. Loved the desktop, want to chat about the internship?';
const typed = ref(reduced ? note.length : 0);
let typer;
watch(visible, on => {
  if (!on) { clearInterval(typer); typer = null; return; }
  if (props.figure !== 'mail' || !on || typer || typed.value >= note.length) return;
  typer = setInterval(() => {
    typed.value += 1;
    if (typed.value >= note.length) clearInterval(typer);
  }, 45);
});
onBeforeUnmount(() => clearInterval(typer));
const bricks = ['#000080', '#244f9c', '#3972ac', '#538eaf', '#008080', '#379b95', '#7170a0', '#9693b7'];

// ---- journey: one message, a step at a time ----
const actors = [
  { id: 'mail', name: 'Mail window', icon: 'person', code: 'Mail.vue' },
  { id: 'worker', name: 'Worker', icon: 'chip', code: '/api/contact' },
  { id: 'routing', name: 'Email Routing', icon: 'contact', code: 'SEND_EMAIL' },
  { id: 'gmail', name: 'Gmail', icon: 'mail', code: 'my inbox' },
];
// wire n joins actors n and n + 1. back means the packet runs toward the mail window
const type = { at: 'mail', title: 'Send', text: 'You type a message and press Send.' };
const post = { wire: 0, title: 'POST /api/contact', text: 'Mail.vue sends the name, email and message as JSON, plus the hidden website field and elapsed, how long the window was open.' };
const scenarios = {
  sent: {
    label: 'Sent',
    steps: [
      type,
      post,
      { at: 'worker', title: 'Validate', text: 'The Worker checks the Origin, the honeypot and the timing, then that the name, email and message are there, look right and fit.' },
      { wire: 1, title: 'Hand off', text: 'buildEmail writes the raw email and SEND_EMAIL.send hands it to Email Routing. The Worker waits until Cloudflare accepts it.' },
      { wire: 0, back: true, title: '200 { ok: true }', text: 'Accepted, so the Worker answers ok and Mail shows a tick. Ok means Cloudflare took the message, not that it has reached my inbox yet.', result: 'ok' },
      { wire: 2, title: 'Deliver', text: 'Email Routing delivers it to my one verified Gmail address. From there Gmail’s own checks decide between inbox and spam.', inbox: true },
    ],
  },
  invalid: {
    label: 'Empty message',
    steps: [
      { ...type, text: 'You press Send before writing anything in the message box.' },
      { at: 'mail', bad: true, title: 'Check before sending', text: 'Mail runs the shared validator first. An empty message is caught in the browser, so no request is sent.', result: 'bad' },
      { at: 'mail', bad: true, title: 'The message is empty.', text: 'Mail shows the error and keeps the name and email. A direct request that bypassed the form would also be rejected by the Worker with status 400.' },
    ],
  },
  failed: {
    label: 'Send fails',
    steps: [
      type,
      post,
      { at: 'worker', title: 'Validate', text: 'Everything checks out.' },
      { wire: 1, bad: true, title: 'Hand off', text: 'SEND_EMAIL.send throws, say because Email Routing is having a bad day. The Worker logs the error.' },
      { wire: 0, back: true, bad: true, title: '502 Couldn’t send right now.', text: 'The Worker suggests emailing me directly. The message stays in the box, so trying again is one click.', result: 'bad' },
    ],
  },
};
const scenario = ref('sent');
const step = ref(0);
const steps = computed(() => scenarios[scenario.value].steps);
const current = computed(() => steps.value[step.value]);
const past = computed(() => steps.value.slice(0, step.value + 1));
const result = computed(() => past.value.find(s => s.result)?.result);
function pick(id) {
  scenario.value = id;
  step.value = 0;
}
const actorState = id => ({
  on: current.value.at === id,
  bad: current.value.at === id && current.value.bad,
  inbox: id === 'gmail' && past.value.some(s => s.inbox),
});
function wireState(n) {
  const s = current.value;
  if (s.wire === n) return { on: true, back: s.back, bad: s.bad };
  // wires the message has already been along stay drawn
  return { done: past.value.some(p => p.wire === n && !p.back && !p.bad) };
}

// ---- delivery: where the message goes ----
const hops = {
  browser: { name: 'Your browser', icon: 'computer', code: 'Mail.vue',
    text: 'Sends the name, email and message once you press Send. If anything fails, the message stays in the box.' },
  worker: { name: 'Cloudflare Worker', icon: 'chip', code: 'worker/index.js',
    text: 'Checks the request, writes the email with buildEmail and hands it off, then answers the browser. It doesn’t save the message anywhere.' },
  routing: { name: 'Email Routing', icon: 'contact', code: 'SEND_EMAIL binding',
    text: 'Sends from contact@jasontang.dev, an address the domain lets Cloudflare send for. The binding can only deliver to one verified address, so it can’t be used to email anyone else.' },
  gmail: { name: 'Gmail', icon: 'mail', code: 'my inbox',
    text: 'The destination mailbox. The site keeps no database copy. Reply-To holds the visitor’s address, so hitting Reply goes straight to them.' },
};
const hopIds = Object.keys(hops);
const hop = ref('worker');

// ---- spam: the three checks, in the order the worker runs them ----
const origins = [
  { id: 'site', label: 'jasontang.dev', value: 'https://jasontang.dev' },
  { id: 'other', label: 'another site', value: 'https://evil.example' },
  { id: 'none', label: 'no header', value: null },
];
const origin = ref('site');
const trap = ref(false);
const seconds = ref(8);
const spam = computed(() => {
  const o = origins.find(x => x.id === origin.value);
  // the origin check lives in worker/index.js: a header from anywhere else is turned away
  const originOk = !o.value || o.value === 'https://jasontang.dev';
  const checks = [
    { name: 'Origin', detail: o.value ? `Origin: ${o.value}` : 'No Origin header, so there’s nothing to compare. Let through.' },
    { name: 'Honeypot', detail: trap.value ? 'The hidden website field has something in it.' : 'The hidden website field is empty.' },
    { name: 'Timing', detail: `elapsed: ${Math.round(seconds.value * 1000)} (at least 3000 needed)` },
  ];
  if (!originOk) {
    checks[0].state = 'fail';
    return { checks, status: 403, body: { error: 'Forbidden.' }, sees: 'An error', gets: 'Nothing' };
  }
  checks[0].state = 'pass';
  const v = validate({ name: 'Ada', email: 'ada@example.com', message: 'Hello!', website: trap.value ? 'http://spam.example' : '', elapsed: seconds.value * 1000 });
  checks[1].state = trap.value ? 'fail' : 'pass';
  if (v.spam) return { checks, status: 200, body: { ok: true }, sees: 'Sent! (it wasn’t)', gets: 'Nothing, it’s quietly dropped' };
  checks[2].state = v.ok ? 'pass' : 'fail';
  if (!v.ok) return { checks, status: 400, body: { error: v.error }, sees: 'That error, message still in the box', gets: 'Nothing yet' };
  return { checks, status: 200, body: { ok: true }, sees: 'Sent, if Cloudflare accepts the handoff', gets: 'Queued for delivery; inbox arrival is not guaranteed' };
});

// ---- headers: what buildEmail writes, and the version that doesn't work ----
const visitor = ref({ name: 'Zoë Kim', email: 'zoe@example.com' });
const fromVisitor = ref(false);
const raw = ref(false);
const example = { from: 'contact@jasontang.dev', to: 'jasontcanada@gmail.com', id: 'example', now: new Date('2026-09-26T18:30:00Z') };
// turns =?UTF-8?B?...?= back into the text it holds
const decode = line => line.replace(/=\?UTF-8\?B\?([^?]*)\?=/g, (_, b64) => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))));
const email = computed(() => {
  const v = validate({ ...visitor.value, message: 'Hi!', elapsed: 5000 });
  if (!v.ok) return { error: v.error };
  let lines = buildEmail(v.data, example).split('\r\n\r\n')[0].split('\r\n');
  // the obvious version: the visitor as the sender, and no need for a reply-to
  if (fromVisitor.value) {
    lines = lines.filter(l => !l.startsWith('Reply-To:'))
      .map(l => (l.startsWith('From:') ? l.replace(/<.*>/, `<${v.data.email}>`).replace(/=\?UTF-8\?B\?[^?]*\?=/, `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(v.data.name)))}?=`) : l));
  }
  const domain = fromVisitor.value ? v.data.email.split('@').pop() : 'jasontang.dev';
  return {
    lines: lines.map(l => {
      const [key] = l.split(':');
      return { key, text: raw.value ? l : decode(l), mark: key === 'From' || key === 'Reply-To' };
    }),
    domain,
    ownDomain: domain.toLowerCase() === 'jasontang.dev',
    reply: v.data.email,
  };
});

// ---- pipeline: every layer ----
const groups = {
  frontend: { name: 'Frontend', color: '#1f6fc4' },
  backend: { name: 'Backend', color: '#1baf7a' },
  infra: { name: 'Infrastructure', color: '#d8ac12' },
  delivery: { name: 'Delivery', color: '#e0483e' },
};
const layers = [
  { name: 'Vue', group: 'frontend', text: 'Mail.vue collects the name, email and message, shows how the send went, and keeps the message if it fails.' },
  { name: 'HTTP', group: 'frontend', text: 'One POST to /api/contact with a JSON body. The browser adds the Origin header on its own.' },
  { name: 'Cloudflare Worker', group: 'backend', text: 'Checks the origin, the honeypot, the timing and every field, then builds the email.' },
  { name: 'MIME', group: 'backend', text: 'buildEmail writes the headers and a Base64 plain text body by hand, with the visitor as Reply-To.' },
  { name: 'Email Routing', group: 'infra', text: 'The SEND_EMAIL binding hands the message to Cloudflare, which can only deliver to my one verified address.' },
  { name: 'DNS', group: 'infra', text: 'DNS publishes the domain’s mail configuration. DMARC needs a passing SPF or DKIM result aligned with the From domain; writing a From header alone does not prove that.' },
  { name: 'Gmail', group: 'delivery', text: 'Checks authentication and spam signals before deciding how to handle the email. The site keeps no database copy.' },
];
const layer = ref(0);
function layerKey(event) {
  const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!move) return;
  event.preventDefault();
  layer.value = (layer.value + move + layers.length) % layers.length;
  event.currentTarget.querySelectorAll('button')[layer.value]?.focus();
}
</script>

<template>
  <figure ref="root" class="cf-figure" :class="`cf-figure--${figure}`" :data-visible="visible">
    <figcaption v-if="caption || number">
      <strong v-if="number">Fig. {{ number }}</strong> {{ caption }}
    </figcaption>
    <p class="sr-only">{{ descriptions[figure] }}</p>

    <!-- lead: breakout won, mail unlocked -->
    <div v-if="figure === 'mail'" class="cf-mail" aria-hidden="true">
      <div class="cf-breakout">
        <div class="cf-bricks">
          <i v-for="(c, i) in bricks" :key="i" :style="{ background: c }" />
        </div>
        <b class="cf-win">YOU WIN!</b>
        <i class="cf-ball" />
        <i class="cf-paddle" />
      </div>
      <span class="cf-unlock"><span>unlocks</span></span>
      <div class="cf-window">
        <div class="cf-title"><RetroIcon name="mail" small /><span>Mail</span><i>×</i></div>
        <div class="cf-fields">
          <span class="raised">To:</span><span class="inset">Jason Tang</span><span class="raised cf-send">Send</span>
          <span class="raised">Name:</span><span class="inset">Ada</span>
          <span class="raised">From:</span><span class="inset">ada@example.com</span>
        </div>
        <p class="inset cf-message">{{ note.slice(0, typed) }}<i class="cf-caret" /></p>
      </div>
    </div>

    <BlogGraphic v-else-if="figure === 'flow'" :graphic="contactFlow" class="cf-flow-graphic" />

    <!-- one message, step by step -->
    <div v-else-if="figure === 'journey'" class="cf-panel">
      <div class="cf-lane">
        <template v-for="(a, i) in actors" :key="a.id">
          <div class="cf-actor" :class="actorState(a.id)">
            <span class="cf-icon"><RetroIcon :name="a.icon" /><em v-if="a.id === 'mail' && result" class="cf-badge" :class="result">{{ result === 'ok' ? '✓' : '✕' }}</em><em v-if="actorState(a.id).inbox" class="cf-badge ok">1</em></span>
            <strong>{{ a.name }}</strong>
            <code>{{ a.code }}</code>
          </div>
          <div v-if="i < actors.length - 1" class="cf-wire" :class="wireState(i)" aria-hidden="true"><i /></div>
        </template>
      </div>
      <div class="cf-detail" aria-live="polite">
        <strong><b>{{ step + 1 }}/{{ steps.length }}</b> {{ current.title }}</strong>
        <p>{{ current.text }}</p>
      </div>
      <div class="cf-buttons">
        <button class="raised cf-button" :disabled="step === 0" @click="step--">Back</button>
        <button class="raised cf-button" :disabled="step >= steps.length - 1" @click="step++">Next</button>
        <button class="raised cf-button" :disabled="step === 0" @click="step = 0">Reset</button>
        <span class="cf-toggle" role="group" aria-label="What happens">
          <button v-for="(s, id) in scenarios" :key="id" class="raised cf-button" :class="{ pressed: scenario === id }" :aria-pressed="scenario === id" @click="pick(id)">{{ s.label }}</button>
        </span>
      </div>
    </div>

    <!-- where it goes, and where it isn't kept -->
    <div v-else-if="figure === 'delivery'" class="cf-panel">
      <div class="cf-lane">
        <template v-for="(id, i) in hopIds" :key="id">
          <button class="cf-hop raised" :class="{ pressed: hop === id }" :aria-pressed="hop === id" @click="hop = id">
            <RetroIcon :name="hops[id].icon" /><span>{{ hops[id].name }}</span>
          </button>
          <div v-if="i < hopIds.length - 1" class="cf-wire" :class="{ on: i < hopIds.indexOf(hop) }" aria-hidden="true"><i /></div>
        </template>
      </div>
      <div class="cf-detail" aria-live="polite">
        <strong>{{ hops[hop].name }}</strong> <code>{{ hops[hop].code }}</code>
        <p>{{ hops[hop].text }}</p>
      </div>
      <p class="cf-aside">
        <span class="cf-nostore" aria-hidden="true"><RetroIcon name="notebook" /></span>
        <span><strong>No site copy.</strong> The Worker does not save submissions in a database or KV. Accepted mail is handed off for delivery to Gmail.</span>
      </p>
    </div>

    <!-- the spam checks -->
    <div v-else-if="figure === 'spam'" class="cf-panel cf-spam">
      <div class="cf-controls">
        <div class="cf-control">
          <span :id="`${uid}-origin`">Request from</span>
          <span class="cf-toggle" role="group" :aria-labelledby="`${uid}-origin`">
            <button v-for="o in origins" :key="o.id" class="raised cf-button" :class="{ pressed: origin === o.id }" :aria-pressed="origin === o.id" @click="origin = o.id">{{ o.label }}</button>
          </span>
        </div>
        <div class="cf-control">
          <span :id="`${uid}-trap`">Hidden website field</span>
          <span class="cf-toggle" role="group" :aria-labelledby="`${uid}-trap`">
            <button class="raised cf-button" :class="{ pressed: !trap }" :aria-pressed="!trap" @click="trap = false">Empty</button>
            <button class="raised cf-button" :class="{ pressed: trap }" :aria-pressed="trap" @click="trap = true">Filled in</button>
          </span>
        </div>
        <div class="cf-control">
          <label :for="`${uid}-time`">Window open for <b>{{ seconds.toFixed(1) }} s</b></label>
          <input :id="`${uid}-time`" v-model.number="seconds" class="cf-range" type="range" min="0" max="10" step="0.5">
        </div>
      </div>
      <ol class="cf-checks">
        <li v-for="c in spam.checks" :key="c.name" :class="c.state ?? 'skip'">
          <span class="cf-mark" aria-hidden="true">{{ c.state === 'pass' ? '✓' : c.state === 'fail' ? '✕' : '–' }}</span>
          <strong>{{ c.name }}</strong>
          <span class="sr-only">{{ c.state === 'pass' ? 'passes' : c.state === 'fail' ? 'fails' : 'not reached' }}.</span>
          <span>{{ c.state ? c.detail : 'Not reached.' }}</span>
        </li>
      </ol>
      <div class="cf-detail cf-verdict" aria-live="polite">
        <code>{{ spam.status }} {{ JSON.stringify(spam.body) }}</code>
        <dl>
          <dt>They see</dt><dd>{{ spam.sees }}</dd>
          <dt>I get</dt><dd>{{ spam.gets }}</dd>
        </dl>
      </div>
    </div>

    <!-- the headers -->
    <div v-else-if="figure === 'headers'" class="cf-panel">
      <div class="cf-controls">
        <div class="cf-control cf-inputs">
          <label :for="`${uid}-name`">Name</label>
          <input :id="`${uid}-name`" v-model="visitor.name" class="inset" maxlength="100" autocomplete="off">
          <label :for="`${uid}-email`">Email</label>
          <input :id="`${uid}-email`" v-model="visitor.email" class="inset" maxlength="200" autocomplete="off">
        </div>
        <div class="cf-control">
          <span :id="`${uid}-from`">From</span>
          <span class="cf-toggle" role="group" :aria-labelledby="`${uid}-from`">
            <button class="raised cf-button" :class="{ pressed: fromVisitor }" :aria-pressed="fromVisitor" @click="fromVisitor = true">The visitor</button>
            <button class="raised cf-button" :class="{ pressed: !fromVisitor }" :aria-pressed="!fromVisitor" @click="fromVisitor = false">My domain</button>
          </span>
          <span class="cf-toggle" role="group" aria-label="Header view">
            <button class="raised cf-button" :class="{ pressed: !raw }" :aria-pressed="!raw" @click="raw = false">Readable</button>
            <button class="raised cf-button" :class="{ pressed: raw }" :aria-pressed="raw" @click="raw = true">Raw</button>
          </span>
        </div>
      </div>
      <p v-if="email.error" class="cf-detail cf-error" aria-live="polite">{{ email.error }}</p>
      <template v-else>
        <pre class="inset cf-headers"><span v-for="l in email.lines" :key="l.key" :class="{ mark: l.mark }">{{ l.text }}</span></pre>
        <div class="cf-detail cf-verdict" aria-live="polite">
          <dl>
            <dt>From domain</dt><dd><code>{{ email.domain }}</code></dd>
            <dt>Sent by</dt><dd>Cloudflare, which may send for <code>jasontang.dev</code></dd>
            <dt>Sender alignment</dt><dd :class="email.ownDomain ? 'good' : 'bad'">{{ email.ownDomain ? 'Uses the configured site domain' : 'Uses a visitor domain the site does not control' }}</dd>
            <dt>Authentication</dt><dd>Needs passing, aligned SPF or DKIM. This example does not check DNS or signatures.</dd>
            <dt>Delivery</dt><dd>Gmail decides; a valid From address does not guarantee inbox delivery.</dd>
            <dt>Reply goes to</dt><dd><code>{{ email.reply }}</code></dd>
          </dl>
        </div>
      </template>
    </div>

    <!-- every layer -->
    <div v-else-if="figure === 'pipeline'" class="cf-panel">
      <div class="cf-pipes" role="group" aria-label="Layers" @keydown="layerKey">
        <template v-for="(l, i) in layers" :key="l.name">
          <button class="raised cf-pipe" :class="{ pressed: layer === i }" :style="{ '--band': groups[l.group].color }" :aria-pressed="layer === i" :tabindex="layer === i ? 0 : -1" @click="layer = i">{{ l.name }}</button>
          <span v-if="i < layers.length - 1" class="cf-arrow" aria-hidden="true">→</span>
        </template>
      </div>
      <ul class="cf-legend" aria-hidden="true">
        <li v-for="(g, id) in groups" :key="id" :class="{ on: layers[layer].group === id }"><i :style="{ background: g.color }" />{{ g.name }}</li>
      </ul>
      <div class="cf-detail" aria-live="polite">
        <strong>{{ layers[layer].name }}</strong> <code>{{ groups[layers[layer].group].name }}</code>
        <p>{{ layers[layer].text }}</p>
      </div>
    </div>
  </figure>
</template>

<style scoped>
/* the same panels, buttons and detail boxes as the project figures (FpgaFigures.vue,
   PortfolioFigures.vue), so a post reads like a project writeup */
.cf-figure { container-type: inline-size; margin: 18px 0 22px; font-family: 'Pixel MS Sans Serif', Tahoma, sans-serif; }
.cf-figure figcaption { margin-bottom: 8px; font-size: 12px; color: var(--muted); }
.cf-figure figcaption strong { color: var(--ink); margin-right: 4px; }
.cf-panel { --sunk-edge: var(--shadow); padding: 12px; background: var(--paper); border: 2px solid; border-color: var(--edge) var(--sunk-edge) var(--sunk-edge) var(--edge); box-shadow: inset 1px 1px var(--shadow); }
:root[data-theme="dark"] .cf-panel { --sunk-edge: var(--light); }
.cf-button { padding: 3px 10px; font: 12px 'Pixel MS Sans Serif', Tahoma, sans-serif; color: var(--ink); }
.cf-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.cf-toggle { display: inline-flex; flex-wrap: wrap; }
.cf-figure .pressed { background: var(--navy, #000080); color: #fff; }
.cf-figure code { font: 11px 'Courier New', monospace; color: var(--d-link, #000080); }
.cf-figure .pressed code { color: #dfe3ff; }
.cf-detail { margin-top: 12px; padding: 8px 10px; background: var(--d-page-alt, #fffdf2); border: 2px solid var(--d-line, #000); box-shadow: 3px 3px 0 var(--d-line, #000); font-size: 13px; }
.cf-detail > strong { margin-right: 6px; }
.cf-detail > strong b { margin-right: 6px; font: bold 11px 'Courier New', monospace; color: var(--muted); }
.cf-detail p { margin: 6px 0 0; font: 13px/1.5 Tahoma, sans-serif; }

.cf-flow-graphic { margin: 0; }

/* ---- lead: a small breakout screen, then the mail window it opens ---- */
.cf-mail { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 18px 12px; background: var(--d-page-alt, #fffdf2); border: 1px solid var(--d-rule, #d6d6de); }
.cf-breakout { position: relative; flex: 0 0 150px; height: 124px; background: #eeeee7; border: 2px solid; border-color: var(--shadow) var(--light) var(--light) var(--shadow); box-shadow: inset 1px 1px #000; overflow: hidden; }
:root[data-theme="dark"] .cf-breakout { background: #000; }
.cf-bricks { position: absolute; inset: 10px 8px auto; display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
/* every brick knocked out, just their ghosts left */
.cf-bricks i { height: 8px; opacity: .18; }
.cf-win { position: absolute; inset: 42px 0 auto; text-align: center; font: bold 15px 'Pixel MS Sans Serif', Tahoma, sans-serif; color: #000080; letter-spacing: 1px; animation: cf-blink 1s steps(1) infinite; }
:root[data-theme="dark"] .cf-win { color: #9db4ff; }
.cf-ball { position: absolute; left: 88px; bottom: 22px; width: 6px; height: 6px; background: #111; }
:root[data-theme="dark"] .cf-ball { background: #eee; }
.cf-paddle { position: absolute; left: 60px; bottom: 10px; width: 40px; height: 6px; background: #000080; }
.cf-unlock { display: flex; flex-direction: column; align-items: center; font-size: 11px; color: var(--muted); }
.cf-unlock::after { content: '→'; font: bold 22px 'Courier New', monospace; }
.cf-window { flex: 0 1 320px; min-width: 0; padding: 3px; background: var(--surface); border: 2px solid; border-color: var(--light) var(--edge) var(--edge) var(--light); box-shadow: inset -1px -1px var(--shadow); }
.cf-title { display: flex; align-items: center; gap: 4px; padding: 2px 3px; background: var(--navy, #000080); color: #fff; font-size: 12px; font-weight: bold; }
.cf-title svg { width: 16px; height: 16px; }
.cf-title i { margin-left: auto; width: 14px; line-height: 12px; text-align: center; font-style: normal; color: var(--ink); background: var(--surface); border: 1px solid; border-color: var(--light) var(--edge) var(--edge) var(--light); }
.cf-fields { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 3px; margin: 4px 0; font-size: 11px; }
.cf-fields span { padding: 2px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cf-fields .raised { text-align: right; }
.cf-fields .inset { background: var(--paper); color: var(--ink); }
.cf-fields .cf-send { grid-row: span 3; display: grid; place-items: center; padding: 0 10px; font-weight: bold; }
.cf-message { height: 54px; margin: 0; padding: 4px 6px; background: var(--paper); color: var(--ink); font: 12px/1.4 Tahoma, sans-serif; overflow: hidden; }
.cf-caret { display: inline-block; width: 1px; height: 13px; margin-left: 1px; vertical-align: -2px; background: var(--ink); animation: cf-blink 1s steps(1) infinite; }
@keyframes cf-blink { 50% { opacity: 0; } }
@container (max-width: 440px) {
  .cf-mail { flex-direction: column; }
  .cf-breakout { flex-basis: 96px; width: 150px; }
  .cf-unlock::after { content: '↓'; }
  .cf-window { flex-basis: auto; width: 100%; }
}

/* ---- boxes in a row joined by wires, a column when it's narrow ---- */
.cf-lane { display: flex; align-items: center; }
.cf-actor, .cf-hop { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 4px; text-align: center; font-size: 12px; color: var(--ink); }
.cf-actor { background: var(--d-page-alt, #fffdf2); border: 2px solid var(--d-line, #000); }
.cf-actor.on { background: var(--navy, #000080); color: #fff; border-color: var(--navy, #000080); }
.cf-actor.on code { color: #dfe3ff; }
.cf-actor.bad { background: #b81f16; border-color: #b81f16; }
.cf-actor code, .cf-hop code { overflow-wrap: anywhere; }
.cf-icon { position: relative; }
.cf-figure .cf-icon svg, .cf-hop svg { display: block; width: 28px; height: 28px; }
.cf-badge { position: absolute; right: -8px; top: -6px; min-width: 14px; height: 14px; font: bold 10px/14px Tahoma, sans-serif; font-style: normal; text-align: center; color: #fff; border: 1px solid var(--d-line, #000); }
.cf-badge.ok { background: #1a7f2e; }
.cf-badge.bad { background: #c01818; }
.cf-hop { cursor: var(--classic-pointer, pointer); font-family: inherit; }
.cf-hop.pressed { font-weight: bold; }
.cf-wire { position: relative; flex: 0 1 44px; min-width: 16px; height: 4px; background: repeating-linear-gradient(to right, var(--d-line, #888) 0 4px, transparent 4px 8px); }
.cf-wire.done, .cf-wire.on { background: repeating-linear-gradient(to right, #1baf7a 0 4px, transparent 4px 8px); }
.cf-wire.bad { background: repeating-linear-gradient(to right, #c01818 0 4px, transparent 4px 8px); }
/* a packet runs along the wire in use, back toward the mail window for an answer */
.cf-wire.on i { position: absolute; top: -2px; width: 8px; height: 8px; background: #1baf7a; box-shadow: 0 0 0 1px var(--d-line, #000); animation: cf-run 1s steps(5) infinite; }
.cf-wire.bad i { background: #c01818; }
.cf-wire.back i { animation-direction: reverse; }
@keyframes cf-run { from { left: -4px; } to { left: calc(100% - 4px); } }
@container (max-width: 480px) {
  .cf-lane { flex-direction: column; align-items: stretch; }
  .cf-actor, .cf-hop { flex-direction: row; flex-basis: auto; gap: 8px; padding: 6px 10px; text-align: left; }
  .cf-actor code { margin-left: auto; }
  .cf-wire { align-self: center; flex: 0 0 22px; width: 4px; height: auto; min-width: 0; background: repeating-linear-gradient(to bottom, var(--d-line, #888) 0 4px, transparent 4px 8px); }
  .cf-wire.done, .cf-wire.on { background: repeating-linear-gradient(to bottom, #1baf7a 0 4px, transparent 4px 8px); }
  .cf-wire.bad { background: repeating-linear-gradient(to bottom, #c01818 0 4px, transparent 4px 8px); }
  .cf-wire.on i { left: -2px; animation-name: cf-drop; }
}
@keyframes cf-drop { from { top: -4px; } to { top: calc(100% - 4px); } }

/* not stored: a note beside the path, not a box on it */
.cf-aside { display: flex; align-items: center; gap: 10px; margin: 14px 0 0; padding: 8px 10px; border: 2px dashed var(--d-line, #888); font: 13px/1.5 Tahoma, sans-serif; }
.cf-nostore { position: relative; flex: none; opacity: .7; }
.cf-nostore svg { display: block; width: 28px; height: 28px; }
.cf-nostore::after { content: ''; position: absolute; left: -3px; right: -3px; top: 13px; height: 3px; background: #c01818; transform: rotate(-40deg); }

/* ---- controls: a label over each toggle ---- */
.cf-controls { display: flex; flex-wrap: wrap; gap: 10px 20px; margin-bottom: 12px; }
.cf-control { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; font-size: 12px; }
.cf-control > span:first-child, .cf-control > label { color: var(--muted); }
.cf-control b { color: var(--ink); }
.cf-range { width: 180px; max-width: 100%; accent-color: var(--navy, #000080); }
.cf-inputs { display: grid; grid-template-columns: auto minmax(0, 190px); align-items: center; gap: 4px 6px; }
.cf-inputs input { min-width: 0; padding: 3px 5px; font: 12px Tahoma, sans-serif; background: var(--paper); color: var(--ink); }
.cf-figure :is(button, input):focus-visible { outline: 1px dotted currentColor; outline-offset: -4px; }

/* spam: each check ticked, crossed, or never reached */
.cf-checks { margin: 0; padding: 0; list-style: none; counter-reset: check; }
.cf-checks li { display: grid; grid-template-columns: 20px 80px minmax(0, 1fr); gap: 8px; align-items: baseline; padding: 5px 4px; font-size: 13px; border-bottom: 1px dotted var(--d-line, #999); }
.cf-checks li > span:last-child { font: 12px Tahoma, sans-serif; overflow-wrap: anywhere; }
.cf-mark { display: grid; place-items: center; width: 16px; height: 16px; font: bold 11px Tahoma, sans-serif; color: #fff; border: 1px solid var(--d-line, #000); }
.cf-checks .pass .cf-mark { background: #1a7f2e; }
.cf-checks .fail .cf-mark { background: #c01818; }
.cf-checks .skip { color: var(--muted); }
.cf-checks .skip .cf-mark { background: var(--surface); color: var(--muted); }
.cf-verdict code { display: block; margin-bottom: 6px; font-size: 12px; font-weight: bold; overflow-wrap: anywhere; }
.cf-verdict dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 12px; margin: 0; font: 13px/1.4 Tahoma, sans-serif; }
.cf-verdict dt { color: var(--muted); }
.cf-verdict dd { margin: 0; overflow-wrap: anywhere; }
.cf-verdict .good { color: #1a7f2e; }
.cf-verdict .bad { color: #c01818; font-weight: bold; }
:root[data-theme="dark"] .cf-verdict .good { color: #5fd07a; }
:root[data-theme="dark"] .cf-verdict .bad { color: #ff6b61; }
@container (max-width: 420px) {
  .cf-checks li { grid-template-columns: 20px minmax(0, 1fr); }
  .cf-checks li > span:last-child { grid-column: 2; }
}

/* headers: the raw email's top, from and reply-to picked out */
.cf-headers { margin: 0; padding: 8px 10px; background: var(--paper); color: var(--ink); font: 12px/1.55 'Courier New', monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
.cf-headers span { display: block; }
.cf-headers .mark { background: #ffec8a; color: #111; }
:root[data-theme="dark"] .cf-headers .mark { background: #5a4d10; color: #fff; }
.cf-error { color: #c01818; }

/* pipeline: chips with a coloured band for the part of the stack they belong to */
.cf-pipes { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 4px; }
.cf-pipe { padding: 5px 9px 4px; font: 12px 'Pixel MS Sans Serif', Tahoma, sans-serif; color: var(--ink); border-bottom-color: var(--band); box-shadow: inset 0 -4px var(--band); }
.cf-pipe.pressed { font-weight: bold; }
.cf-arrow { font: bold 14px 'Courier New', monospace; color: var(--muted); }
.cf-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 10px 0 0; padding: 0; list-style: none; font-size: 11px; color: var(--muted); }
.cf-legend li { display: flex; align-items: center; gap: 5px; }
.cf-legend li.on { color: var(--ink); font-weight: bold; }
.cf-legend i { width: 10px; height: 10px; border: 1px solid var(--d-line, #000); }

@media (prefers-reduced-motion: reduce) {
  .cf-win, .cf-caret { animation: none; }
  .cf-wire.on i { animation: none; left: calc(50% - 4px); }
}
.cf-figure[data-visible="false"] :is(.cf-win, .cf-caret, .cf-wire.on i) { animation-play-state: paused; }
@container (max-width: 480px) {
  @media (prefers-reduced-motion: reduce) { .cf-wire.on i { top: calc(50% - 4px); left: -2px; } }
}
</style>
