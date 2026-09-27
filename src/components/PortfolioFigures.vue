<script setup>
// the figures in the portfolio project's writeup (content.mjs, figures), one per
// section: a table of the apps on this desktop that opens each one, a diagram of
// how the site is wired up on cloudflare that you click through, and tiles with
// the live scoreboard from /api/stats. each is a small win95 panel
import { computed, ref } from 'vue';
import RetroIcon from './RetroIcon.vue';
import { useLiveStats } from '../live-stats.js';
import { registry } from '../registry.js';
defineProps({ figure: { type: String, required: true } });
const emit = defineEmits(['open']);

// ---- apps: what's on the desktop ----
const apps = [
  { id: 'contact', what: 'Breakout in an arcade cabinet. Clear the bricks to reveal my email and unlock Mail.', how: 'Canvas, Web Audio' },
  { id: 'snake', what: 'A handheld with a world leaderboard over 7 days, 30 days and all time.', how: 'Durable Object, name filter' },
  { id: 'minesweeper', what: 'The Windows 98 one, with three sizes that turn sideways to fit a phone.', how: 'Vue' },
  { id: 'reversi', what: 'Play against Clippy, who judges corners, mobility and position.', how: 'Heuristic bot' },
  { id: 'music', what: 'An album on a CD player, with a stereo display that dances along.', how: 'Spotify iFrame API, canvas' },
  { id: 'blog', what: 'Posts I write and edit from the site itself.', how: 'Workers KV, Cloudflare Access' },
  { id: 'analytics', what: 'Visits, wins and the leaderboard, over 7, 30 or 90 days.', how: 'Analytics Engine SQL' },
  { id: 'stickies', what: 'Notes you can drag around the desktop. They stay in your browser.', how: 'localStorage' },
];

// ---- stack: how a click travels ----
const nodes = {
  browser: { name: 'Your browser', icon: 'computer', route: 'jasontang.dev',
    text: 'The desktop, every window and every game run here, built with Vue and Vite. Sticky notes, settings and your best scores stay in this browser.' },
  worker: { name: 'Cloudflare Worker', icon: 'chip', route: 'worker/index.js',
    text: 'One small worker answers every request. Anything under /api goes to the service below it; everything else is the static site.' },
  assets: { name: 'Static assets', icon: 'document', route: 'GET /*, *.mp4',
    text: 'The built site, served from Cloudflare’s edge. Videos pass through the worker, which cuts out byte ranges so Safari will play them.' },
  email: { name: 'Email Routing', icon: 'mail', route: 'POST /api/contact',
    text: 'Messages from the Mail window are checked, then emailed to me. Mail only unlocks after you beat Breakout.' },
  kv: { name: 'Workers KV', icon: 'notebook', route: '/api/blog, /api/admin',
    text: 'Blog posts, readable by anyone. Writing goes through Cloudflare Access, and the worker checks the Access token itself too.' },
  stats: { name: 'Durable Object', icon: 'snake', route: 'GET /api/stats',
    text: 'One SQLite database keeps the running totals, who is online in the last 90 seconds, and every player’s best Snake score by day.' },
  events: { name: 'Analytics Engine', icon: 'chart', route: 'POST /api/event',
    text: 'Anonymous events with no cookies, read back with SQL for the Analytics window. Nothing is sent until your first click.' },
};
const services = ['assets', 'email', 'kv', 'stats', 'events'];
const picked = ref('worker');
const active = computed(() => nodes[picked.value]);
// the path lights up down to whatever is picked
const lit = computed(() => ({ top: picked.value !== 'browser', bottom: services.includes(picked.value) }));

// ---- live: the scoreboard right now ----
const { data: live, error } = useLiveStats();
const number = value => Number(value || 0).toLocaleString();
const tiles = computed(() => {
  const s = live.value;
  const show = value => (s ? value : '—');
  return [
    { label: 'Total visits', value: show(number(s?.visitors)), icon: 'person', app: 'analytics' },
    { label: 'Online now', value: show(number(s?.online)), icon: 'computer', app: 'analytics', dot: true },
    { label: 'Snake high score', value: show(number(s?.snakeHighScore)), icon: 'snake', app: 'snake' },
    { label: 'Minesweeper boards beaten', value: show(number(s?.minesweeperWins)), icon: 'mine', app: 'minesweeper' },
    { label: 'Breakout boards cleared', value: show(number(s?.breakoutWins)), icon: 'game', app: 'contact' },
    { label: 'Clippy wins-losses', value: show(`${number(s?.clippyWins)}-${number(s?.clippyLosses)}`), icon: 'reversi', app: 'reversi' },
  ];
});
</script>

<template>
  <figure v-if="figure === 'apps'" class="pf-figure">
    <figcaption><strong>Fig. 1</strong> What’s on the desktop. Pick one to open it.</figcaption>
    <div class="pf-table-wrap pf-frame">
      <table class="pf-table">
        <thead><tr><th scope="col">App</th><th scope="col">What it does</th><th scope="col">Under the hood</th></tr></thead>
        <tbody>
          <tr v-for="a in apps" :key="a.id" @click="emit('open', a.id)">
            <th scope="row">
              <button class="pf-open" :title="`Open ${registry[a.id].label}`" @click.stop="emit('open', a.id)">
                <RetroIcon :name="registry[a.id].icon"/><span>{{ registry[a.id].label }}</span>
              </button>
            </th>
            <td>{{ a.what }}<small class="pf-how-inline">{{ a.how }}</small></td>
            <td class="pf-how">{{ a.how }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>

  <figure v-else-if="figure === 'stack'" class="pf-figure">
    <figcaption><strong>Fig. 2</strong> How a click travels. Pick a box to see what it handles.</figcaption>
    <div class="pf-stack pf-frame">
      <button class="pf-node raised" :class="{ pressed: picked === 'browser' }" :aria-pressed="picked === 'browser'" @click="picked = 'browser'">
        <RetroIcon :name="nodes.browser.icon"/><span>{{ nodes.browser.name }}</span>
      </button>
      <div class="pf-wire" :class="{ lit: lit.top }" aria-hidden="true"><i/></div>
      <button class="pf-node raised" :class="{ pressed: picked === 'worker' }" :aria-pressed="picked === 'worker'" @click="picked = 'worker'">
        <RetroIcon :name="nodes.worker.icon"/><span>{{ nodes.worker.name }}</span>
      </button>
      <div class="pf-wire" :class="{ lit: lit.bottom }" aria-hidden="true"><i/></div>
      <fieldset class="pf-edge">
        <legend>Cloudflare</legend>
        <button v-for="id in services" :key="id" class="pf-node raised" :class="{ pressed: picked === id }" :aria-pressed="picked === id" @click="picked = id">
          <RetroIcon :name="nodes[id].icon"/><span>{{ nodes[id].name }}</span>
        </button>
      </fieldset>
      <div class="pf-detail" aria-live="polite">
        <strong>{{ active.name }}</strong>
        <code>{{ active.route }}</code>
        <p>{{ active.text }}</p>
      </div>
    </div>
  </figure>

  <figure v-else-if="figure === 'live'" class="pf-figure">
    <figcaption>
      <strong>Fig. 3</strong> This site, right now.
      <span class="pf-live"><i aria-hidden="true"/>{{ error && !live ? 'No signal' : 'Live, every 30 seconds' }}</span>
    </figcaption>
    <div class="pf-tiles">
      <button v-for="t in tiles" :key="t.label" class="pf-tile" :title="`Open ${registry[t.app].label}`" @click="emit('open', t.app)">
        <RetroIcon :name="t.icon"/>
        <strong><i v-if="t.dot" class="pf-dot" aria-hidden="true"/>{{ t.value }}</strong>
        <span>{{ t.label }}</span>
      </button>
    </div>
  </figure>
</template>

<style scoped>
.pf-figure { container-type: inline-size; margin: 18px 0 22px; font-family: 'Pixel MS Sans Serif', Tahoma, sans-serif; }
.pf-figure figcaption { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin-bottom: 8px; font-size: 12px; color: var(--muted); }
.pf-figure figcaption strong { color: var(--ink); }
/* sunken like a pressed button, but the bottom right edge is grey instead of white
   so the corner still shows on the white page (dark mode uses the light edge) */
.pf-frame { --sunk-edge: var(--shadow); border: 2px solid; border-color: var(--edge) var(--sunk-edge) var(--sunk-edge) var(--edge); box-shadow: inset 1px 1px var(--shadow); }
:root[data-theme="dark"] .pf-frame { --sunk-edge: var(--light); }

/* fig 1: a win95 list view */
.pf-table-wrap { overflow-x: auto; background: var(--paper); }
.pf-table { width: 100%; min-width: 460px; table-layout: auto; border-collapse: collapse; font-size: 12px; }
.pf-table thead th {
  position: sticky; top: 0; padding: 3px 8px; text-align: left; font-weight: normal; white-space: nowrap;
  background: var(--surface); border: 1px solid; border-color: var(--light) var(--shadow) var(--shadow) var(--light);
}
.pf-table tbody tr { cursor: var(--classic-pointer, pointer); }
.pf-table tbody tr:nth-child(even) { background: var(--d-page-alt, #fffdf2); }
.pf-table tbody tr:hover { background: var(--navy, #000080); color: #fff; }
.pf-table tbody tr:hover .pf-how { color: #dfe3ff; }
.pf-table td, .pf-table tbody th { padding: 5px 8px; vertical-align: top; text-align: left; font-weight: normal; border-bottom: 1px dotted var(--d-line, #999); }
.pf-how { color: var(--muted); white-space: nowrap; }
.pf-how-inline { display: none; margin-top: 3px; color: var(--muted); font-size: 11px; }
.pf-table tbody tr:hover .pf-how-inline { color: #dfe3ff; }
/* narrow, the third column moves under the description so nothing scrolls sideways */
@container (max-width: 520px) {
  .pf-table { min-width: 0; }
  .pf-table th:nth-child(3), .pf-table .pf-how { display: none; }
  .pf-how-inline { display: block; }
}
.pf-open { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; color: inherit; font: bold 12px 'Pixel MS Sans Serif', Tahoma, sans-serif; white-space: nowrap; cursor: inherit; }
.pf-open svg { width: 20px; height: 20px; flex: none; }
.pf-open:focus-visible { outline: 1px dotted currentColor; outline-offset: 2px; }

/* fig 2: boxes joined by wires, the path to the picked box lit up */
.pf-stack { display: flex; flex-direction: column; align-items: center; padding: 14px 12px; background: var(--paper); }
.pf-node {
  display: inline-flex; flex-direction: column; align-items: center; gap: 4px; min-width: 120px; padding: 8px 10px;
  font: 12px 'Pixel MS Sans Serif', Tahoma, sans-serif; color: var(--ink); cursor: var(--classic-pointer, pointer);
}
.pf-node svg { width: 28px; height: 28px; }
.pf-node.pressed { background: var(--navy, #000080); color: #fff; font-weight: bold; }
.pf-wire { position: relative; width: 4px; height: 26px; background: repeating-linear-gradient(to bottom, var(--d-line, #888) 0 4px, transparent 4px 8px); }
.pf-wire.lit { background: repeating-linear-gradient(to bottom, #1baf7a 0 4px, transparent 4px 8px); }
/* a packet runs down a lit wire */
.pf-wire.lit i { position: absolute; left: -2px; width: 8px; height: 8px; background: #1baf7a; box-shadow: 0 0 0 1px var(--d-line, #000); animation: pf-packet 1s steps(4) infinite; }
@keyframes pf-packet { from { top: -4px; } to { top: 22px; } }
.pf-edge {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 8px; width: 100%; box-sizing: border-box;
  margin: 0; padding: 10px; border: 2px dashed var(--d-line, #888);
}
.pf-edge legend { padding: 0 6px; font-size: 11px; letter-spacing: 1px; color: var(--muted); }
.pf-edge .pf-node { min-width: 0; }
.pf-detail { width: 100%; box-sizing: border-box; margin-top: 12px; padding: 8px 10px; background: var(--d-page-alt, #fffdf2); border: 2px solid var(--d-line, #000); box-shadow: 3px 3px 0 var(--d-line, #000); }
.pf-detail strong { margin-right: 8px; font-size: 13px; }
.pf-detail code { font: 11px 'Courier New', monospace; color: var(--d-link, #000080); }
.pf-detail p { margin: 6px 0 0; font: 13px/1.5 inherit; }

/* fig 3: score cards like the analytics window's */
.pf-live { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; }
.pf-live i, .pf-dot { display: inline-block; width: 8px; height: 8px; background: #1baf7a; border: 1px solid var(--d-line, #000); animation: pf-blink 1.2s steps(1) infinite; }
.pf-dot { margin-right: 6px; vertical-align: middle; }
@keyframes pf-blink { 50% { opacity: .35; } }
.pf-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.pf-tile {
  display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; padding: 12px 6px; text-align: center;
  background: var(--d-page-alt, #fffdf2); border: 2px solid var(--d-line, #000); box-shadow: 4px 4px 0 var(--d-line, #000);
  color: var(--ink); font-family: 'Pixel MS Sans Serif', Tahoma, sans-serif; cursor: var(--classic-pointer, pointer);
  transition: transform .08s, box-shadow .08s;
}
.pf-tile svg { width: 32px; height: 32px; }
.pf-tile strong { font: bold 24px/1.2 'Pixel MS Sans Serif', monospace; color: var(--d-link, #000080); overflow-wrap: anywhere; }
.pf-tile span { font-size: 12px; }
@media (hover: hover) { .pf-tile:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0 var(--d-line, #000); } }
.pf-tile:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 var(--d-line, #000); }
.pf-tile:focus-visible { outline: 1px dotted var(--ink); outline-offset: 3px; }
@media (max-width: 560px) { .pf-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) {
  .pf-wire.lit i, .pf-live i, .pf-dot { animation: none; }
  .pf-wire.lit i { top: 9px; }
}
</style>
