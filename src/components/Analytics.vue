<script setup>
import { computed, onMounted, ref } from 'vue';
import RetroIcon from './RetroIcon.vue';
import PixelPie from './PixelPie.vue';
import Leaderboard from './Leaderboard.vue';
import { useLiveStats } from '../live-stats.js';
import { read, save } from '../storage.js';
const { data: live, error: liveError, refresh } = useLiveStats();
const periods = [7, 30, 90];
const days = ref(30);
const data = ref(null);
const busy = ref(false);
const error = ref('');
const number = value => Number(value || 0).toLocaleString();
// the window is split into win95 tabs
const tabs = [
  { id: 'scoreboard', label: 'Scoreboard' },
  { id: 'behind', label: 'Behind the scenes' },
];
const tab = ref(read('analytics-tab', 'scoreboard'));
const current = computed(() => tabs.some(t => t.id === tab.value) ? tab.value : 'scoreboard');
function pick(id) {
  reread.value++;
  tab.value = id;
  save('analytics-tab', id);
}
// left and right arrows move between tabs, like a real tab strip
function step(event, by) {
  const list = tabs;
  const next = list[(list.findIndex(t => t.id === current.value) + by + list.length) % list.length];
  pick(next.id);
  event.currentTarget.parentElement.querySelector(`[data-tab="${next.id}"]`)?.focus();
}
// the four all-time cards up top, from the live scoreboard
const cards = computed(() => {
  const s = live.value;
  if (!s) return [];
  const games = s.clippyWins + s.clippyLosses;
  return [
    { label: 'Minesweeper beaten', value: number(s.minesweeperWins), icon: 'mine' },
    { label: 'Breakout finished', value: number(s.breakoutWins), icon: 'game' },
    { label: 'Highest Snake score', value: number(s.snakeHighScore), icon: 'snake' },
    { label: 'Clippy win-lose', value: `${number(s.clippyWins)}-${number(s.clippyLosses)}`, icon: 'reversi',
      note: games ? `Clippy wins ${Math.round(s.clippyWins / games * 100)}%` : 'No games yet' },
  ];
});
// your own scores, kept in this browser by each game
// storage isn't reactive, so bumping this re-reads it (on refresh and tab changes)
const reread = ref(0);
const yourMines = computed(() => {
  reread.value;
  return ['Beginner', 'Intermediate', 'Expert'].map(level => ({ level, wins: Number(read(`minesweeper-wins-${level.toLowerCase()}`, '0')) || 0 }));
});
const yourCards = computed(() => {
  reread.value;
  const you = Number(read('reversi-you', '0')) || 0, clippy = Number(read('reversi-clippy', '0')) || 0;
  return [
    { label: 'Minesweeper games beaten', value: number(yourMines.value.reduce((sum, l) => sum + l.wins, 0)), icon: 'mine', levels: yourMines.value },
    { label: 'Your Snake best', value: number(read('snake-best', '0')), icon: 'snake' },
    { label: 'You vs Clippy', value: `${you}-${clippy}`, icon: 'reversi', note: you + clippy ? `You win ${Math.round(you / (you + clippy) * 100)}%` : 'No games yet' },
  ];
});
// the same kind of cards for the behind the scenes numbers, over the chosen period
const behindCards = computed(() => data.value ? [
  { label: 'Messages sent', value: number(data.value.mail.sent), icon: 'mail' },
  { label: 'Breakout balls lost', value: number(data.value.breakout.losses), icon: 'game' },
  { label: 'Seconds to win Breakout', value: data.value.breakout.averageWinSeconds ?? '—', icon: 'games', note: 'on average' },
] : []);
const daily = computed(() => {
  const counts = new Map(data.value?.daily.map(row => [row.day, row.visits]) || []);
  return Array.from({ length: days.value }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days.value + 1 + i);
    const day = date.toISOString().slice(0, 10);
    return { day, visits: counts.get(day) || 0 };
  });
});
const peak = computed(() => Math.max(1, ...daily.value.map(row => row.visits)));
const sections = computed(() => data.value ? [
  // the last number is the section's bar color, --bar-1 to --bar-7 below
  ['Windows opened', data.value.windows, 3], ['Blog posts', data.value.blogPosts, 5],
  ['Breakout funnel', data.value.funnel, 7], ['Mail errors', data.value.mail.errors, 2],
] : []);
async function get(url) {
  const response = await fetch(url, { redirect: 'error' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load analytics.');
  return result;
}
function setDays(value) {
  days.value = value;
  load();
}
async function load() {
  reread.value++;
  busy.value = true;
  error.value = '';
  data.value = null;
  try { data.value = await get(`/api/analytics?days=${days.value}`); }
  catch { error.value = 'Site history is unavailable right now. Please try again later.'; }
  busy.value = false;
}
onMounted(load);
</script>

<template>
  <div class="app-layout">
    <div class="toolbar analytics-toolbar">
      <div class="analytics-periods" role="group" aria-label="Period">
        <span>Last</span>
        <button v-for="value in periods" :key="value" class="raised" :class="{ pressed: days === value }" :aria-pressed="days === value" :disabled="busy" @click="setDays(value)">{{ value }} days</button>
      </div>
      <button class="raised analytics-refresh" :disabled="busy" @click="refresh(); load()">
        <!-- the same arrow circle as the restart buttons in contact and reversi -->
        <svg class="spin-icon" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true"><path d="M4 1h4v1H4zM9 1h1v1H9zM2 2h2v1H2zM8 2h2v1H8zM2 3h1v1H2zM7 3h3v1H7zM1 4h1v4H1zM10 6h1v2h-1zM2 8h1v1H2zM9 8h1v1H9zM2 9h2v1H2zM8 9h2v1H8zM4 10h4v1H4z"/></svg>
        Refresh
      </button>
    </div>
    <div class="analytics-tabs" role="tablist" aria-label="Analytics">
      <button v-for="t in tabs" :id="`analytics-tab-${t.id}`" :key="t.id" :data-tab="t.id" role="tab" :aria-selected="current === t.id" :aria-controls="`analytics-panel-${t.id}`" :tabindex="current === t.id ? 0 : -1"
        @click="pick(t.id)" @keydown.right.prevent="step($event, 1)" @keydown.left.prevent="step($event, -1)">{{ t.label }}</button>
    </div>
    <main :id="`analytics-panel-${current}`" class="content-scroll document pixel-headings fancy-dividers analytics-page" role="tabpanel" :aria-labelledby="`analytics-tab-${current}`" :aria-busy="busy">
      <template v-if="current === 'scoreboard'">
        <h1>All-time scoreboard</h1>
        <p v-if="liveError && !live" role="status">{{ liveError }}</p>
        <p v-else-if="!live" role="status">Loading scores...</p>
        <template v-else>
          <div class="score-cards">
            <section v-for="card in cards" :key="card.label" class="score-card">
              <RetroIcon :name="card.icon"/>
              <strong>{{ card.value }}</strong>
              <span>{{ card.label }}</span>
              <small v-if="card.note">{{ card.note }}</small>
            </section>
          </div>
          <div class="visit-banner">
            <section><RetroIcon name="person"/><div><strong>{{ number(live.visitors) }}</strong><span>total visits</span></div></section>
            <section><span class="online-dot" aria-hidden="true"/><div><strong>{{ number(live.online) }}</strong><span>online now</span></div></section>
          </div>
          <h2>Your scores</h2>
          <div class="score-cards three">
            <section v-for="card in yourCards" :key="card.label" class="score-card">
              <RetroIcon :name="card.icon"/>
              <strong>{{ card.value }}</strong>
              <span>{{ card.label }}</span>
              <small v-if="card.note">{{ card.note }}</small>
              <ul v-if="card.levels" class="level-counts">
                <li v-for="l in card.levels" :key="l.level"><span>{{ l.level }}</span><b>{{ number(l.wins) }}</b></li>
              </ul>
            </section>
          </div>
          <h2>Snake leaderboard</h2>
          <Leaderboard class="analytics-cart" :tuckable="false"/>
        </template>
        <p v-if="busy" role="status">Loading site history...</p>
        <p v-else-if="error" role="status">{{ error }}</p>
        <template v-if="data">
          <div class="history-row">
          <section>
          <h2>Visitors by day</h2>
          <p class="analytics-note"><strong>{{ number(data.visitors) }}</strong> visits in the last {{ days }} days</p>
          <p v-if="!data.visitors">No visits recorded yet. The next adventure starts with a click.</p>
          <div class="analytics-chart" role="img" :aria-label="`Daily visits over the last ${days} days. Peak: ${peak === 1 && !data.visitors ? 0 : peak}.`">
            <div v-for="row in daily" :key="row.day" class="analytics-column" :title="`${row.day}: ${number(row.visits)} visits`">
              <span :style="{ height: `${row.visits / peak * 100}%` }"/>
            </div>
          </div>
          <div class="analytics-axis"><span>{{ daily[0].day }}</span><span>{{ daily.at(-1).day }} (UTC)</span></div>
          </section>
          <section>
          <h2>Boards cleared</h2>
          <p class="analytics-note">Last {{ days }} days, replays included.</p>
          <PixelPie :rows="[{ label: 'Minesweeper', count: data.minesweeperWins }, { label: 'Breakout', count: data.breakoutWins }]" label="Boards cleared"/>
          </section>
          </div>
        </template>
      </template>
      <template v-else>
        <h1>Behind the scenes</h1>
        <p v-if="busy" role="status">Loading...</p>
        <p v-else-if="error" role="status">{{ error }}</p>
        <template v-if="data">
          <div class="score-cards three">
            <section v-for="card in behindCards" :key="card.label" class="score-card">
              <RetroIcon :name="card.icon"/>
              <strong>{{ card.value }}</strong>
              <span>{{ card.label }}</span>
              <small v-if="card.note">{{ card.note }}</small>
            </section>
          </div>
          <h2>Devices</h2>
          <PixelPie :rows="data.devices" label="Devices"/>
          <section v-for="[title, rows, color] in sections" :key="title">
            <h2>{{ title }}</h2><p v-if="!rows.length">No events yet.</p>
            <div v-for="row in rows" :key="row.label" class="analytics-bar-row" :style="{ '--bar': `var(--bar-${color})` }">
              <div><span>{{ row.label || 'Unknown' }}{{ row.label === 'sticky notes' ? '*' : '' }}</span><strong>{{ number(row.count) }}</strong></div>
              <div class="analytics-bar"><span :style="{ width: `${row.count / Math.max(1, ...rows.map(r => r.count)) * 100}%` }"/></div>
            </div>
            <p v-if="rows.some(row => row.label === 'sticky notes')" class="analytics-note">*Every sticky note is its own window, so they're added together here.</p>
          </section>
        </template>
      </template>
    </main>
    <div class="status-bar">Anonymous events · no analytics cookies · updates after processing</div>
  </div>
</template>

<style scoped>
.analytics-toolbar { flex-wrap: wrap; gap: 8px; font-family: 'Pixel MS Sans Serif', Tahoma, sans-serif; }
.analytics-toolbar .raised { font: inherit; color: var(--ink); text-decoration: none; }
.analytics-periods { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.analytics-periods span { margin-right: 4px; }
.analytics-periods .pressed { font-weight: bold; background: var(--hilite); }
/* win95 tab strip: the selected tab stands taller and joins the page below it */
.analytics-tabs { display: flex; gap: 2px; padding: 6px 6px 0; margin-bottom: -2px; position: relative; z-index: 1; overflow-x: auto; flex-shrink: 0; }
.analytics-tabs button {
  font: 13px 'Pixel MS Sans Serif', Tahoma, sans-serif; color: var(--ink); white-space: nowrap; cursor: pointer;
  padding: 4px 12px 3px; margin-top: 3px; background: var(--surface);
  border: 2px solid; border-bottom: 0; border-color: var(--light) var(--edge) transparent var(--light);
  box-shadow: inset -1px 0 var(--shadow), inset 1px 1px var(--hilite);
}
.analytics-tabs button[aria-selected="true"] { margin-top: 0; padding-bottom: 6px; font-weight: bold; background: var(--paper); }
.analytics-tabs button:focus-visible { outline: 1px dotted var(--ink); outline-offset: -5px; }
.analytics-page { border-top: 2px solid var(--light); }
.visit-banner { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0 0 12px; }
.visit-banner section {
  display: flex; align-items: center; justify-content: center; gap: 14px; padding: 14px 10px; min-width: 0;
  background: var(--d-page-alt, #fffdf2); border: 2px solid var(--d-line, #000); box-shadow: 4px 4px 0 var(--d-line, #000);
  font-family: 'Pixel MS Sans Serif', Tahoma, sans-serif;
}
.visit-banner .retro-icon { width: 40px; height: 40px; flex: none; }
.visit-banner strong { display: block; font: bold 40px/1.1 'Pixel MS Sans Serif', monospace; color: var(--d-link, #000080); }
.visit-banner span { font-size: 14px; }
/* a square green light that blinks like a modem */
.online-dot { width: 20px; height: 20px; flex: none; background: #1baf7a; border: 2px solid var(--d-line, #000); animation: online-blink 1.2s steps(1) infinite; }
@keyframes online-blink { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .online-dot { animation: none; } }
.score-cards.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.level-counts { list-style: none; margin: 4px 0 0; padding: 0; width: 100%; max-width: 150px; font-size: 11px; }
.level-counts li { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; border-top: 1px dotted var(--d-line, #999); }
/* visitors by day and boards cleared side by side, stacked on a phone */
.history-row { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 0 24px; align-items: start; margin-top: 12px; }
.history-row .pixel-pie { flex-direction: column; align-items: flex-start; }
@media (max-width: 700px) { .history-row { grid-template-columns: minmax(0, 1fr); } }
.analytics-refresh { display: inline-flex; align-items: center; gap: 6px; }
.analytics-refresh svg { width: 16px; height: 16px; fill: currentColor; }
.score-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 12px 0; }
.score-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px; text-align: center; min-width: 0;
  background: var(--d-page-alt, #fffdf2); border: 2px solid var(--d-line, #000); box-shadow: 4px 4px 0 var(--d-line, #000);
  font-family: 'Pixel MS Sans Serif', Tahoma, sans-serif; image-rendering: pixelated;
}
.score-card svg { width: 32px; height: 32px; }
.score-card strong { font: bold 28px/1.2 'Pixel MS Sans Serif', monospace; color: var(--d-link, #000080); overflow-wrap: anywhere; }
.score-card span { font-size: 12px; }
.score-card small { font-size: 11px; color: var(--muted); }
.analytics-note { font-size: 12px; color: var(--muted); }
.analytics-chart { display: flex; align-items: stretch; gap: 2px; height: 144px; border-left: 2px solid #555; border-bottom: 2px solid #555; padding: 8px 4px 0; background: repeating-linear-gradient(to top, var(--d-rule, #ddd) 0 1px, transparent 1px 32px); }
.analytics-column { flex: 1; min-width: 0; display: flex; align-items: flex-end; }
.analytics-column span { width: 100%; background: repeating-linear-gradient(to top, #008080 0 6px, var(--paper) 6px 8px); }
.analytics-axis { display: flex; justify-content: space-between; font: 10px/2 monospace; gap: 8px; }
.analytics-bar-row { margin: 14px 0; }
.analytics-bar-row > div:first-child { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.analytics-page { --bar-1: #2a78d6; --bar-2: #eb6834; --bar-3: #1baf7a; --bar-4: #eda100; --bar-5: #e87ba4; --bar-6: #8a8a8a; --bar-7: #4a3aa7; }
:root[data-theme="dark"] .analytics-page { --bar-1: #3987e5; --bar-2: #d95926; --bar-3: #199e70; --bar-4: #c98500; --bar-5: #d55181; --bar-6: #77777c; --bar-7: #9085e9; }
.analytics-bar { height: 16px; background: var(--d-rule, #eee); margin-top: 4px; }
.analytics-bar span { display: block; height: 100%; background: repeating-linear-gradient(to right, var(--bar) 0 6px, transparent 6px 8px); }
.analytics-table { width: 100%; text-align: left; font-size: 12px; }
.analytics-table td, .analytics-table th { border-bottom: 1px solid #ddd; }
@media (max-width: 560px) { .score-cards, .score-cards.three { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 400px) { .analytics-page { padding: 18px 14px; } }
</style>
