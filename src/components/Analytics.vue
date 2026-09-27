<script setup>
import { computed, onMounted, ref } from 'vue';
import RetroIcon from './RetroIcon.vue';
import { useLiveStats } from '../live-stats.js';
const { data: live, error: liveError } = useLiveStats();
const days = ref(30);
const data = ref(null);
const privateData = ref(null);
const busy = ref(false);
const error = ref('');
const privateError = ref('');
const admin = ref(false);
const number = value => Number(value || 0).toLocaleString();
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
const sections = computed(() => privateData.value ? [
  ['Windows opened', privateData.value.windows], ['Blog posts', privateData.value.blogPosts],
  ['Breakout funnel', privateData.value.funnel], ['Devices', privateData.value.devices],
  ['Referrers', privateData.value.referrers], ['Mail errors', privateData.value.mail.errors],
] : []);
async function get(url) {
  const response = await fetch(url, { redirect: 'error' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load analytics.');
  return result;
}
async function load() {
  busy.value = true;
  error.value = '';
  privateError.value = '';
  data.value = null;
  privateData.value = null;
  try { data.value = await get(`/api/analytics?days=${days.value}`); }
  catch { error.value = 'Site history is unavailable right now. Please try again later.'; }
  if (admin.value) {
    try { privateData.value = await get(`/api/admin/analytics?days=${days.value}`); }
    catch { privateError.value = 'Could not load private analytics. Try signing in again.'; }
  }
  busy.value = false;
}
onMounted(async () => {
  await load();
  try {
    const response = await fetch('/api/admin/me', { redirect: 'manual' });
    admin.value = response.ok && Boolean((await response.json()).email);
    if (admin.value) await load();
  } catch { /* Public scoreboard remains available when signed out. */ }
});
</script>

<template>
  <div class="app-layout">
    <div class="toolbar analytics-toolbar">
      <label>Last <select v-model="days" :disabled="busy" @change="load"><option :value="7">7 days</option><option :value="30">30 days</option><option :value="90">90 days</option></select></label>
      <button class="raised" :disabled="busy" @click="load">Refresh</button>
      <a href="/api/admin/login?next=analytics">{{ admin ? 'Signed in' : 'Admin sign in' }}</a>
    </div>
    <main class="content-scroll document pixel-headings analytics-page" :aria-busy="busy">
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
        <p class="analytics-note"><strong>{{ number(live.visitors) }}</strong> total visits &middot; <strong>{{ number(live.online) }}</strong> online now. Since tracking began. Online counts tabs active in the last 90 seconds. Scores are client-reported.</p>
      </template>
      <h1>A little bit of site history</h1>
      <p>People dropping by, snakes getting longer, and a few games finally beaten.</p>
      <p v-if="busy" role="status">Loading site history...</p>
      <p v-else-if="error" role="status">{{ error }}</p>
      <template v-if="data">
        <p class="analytics-note"><strong>{{ number(data.visitors) }}</strong> visits in the last {{ days }} days. Visits count page loads with a click, tap or keypress, not unique people.</p>
        <h2>Visitors by day</h2>
        <p v-if="!data.visitors">No visits recorded yet. The next adventure starts with a click.</p>
        <div class="analytics-chart" role="img" :aria-label="`Daily visits over the last ${days} days. Peak: ${peak === 1 && !data.visitors ? 0 : peak}. Exact counts in the table below.`">
          <div v-for="row in daily" :key="row.day" class="analytics-column" :title="`${row.day}: ${number(row.visits)} visits`">
            <span :style="{ height: `${row.visits / peak * 100}%` }"/>
          </div>
        </div>
        <div class="analytics-axis"><span>{{ daily[0].day }}</span><span>{{ daily.at(-1).day }} (UTC)</span></div>
        <details><summary>Daily counts</summary><table class="analytics-table"><thead><tr><th>Date (UTC)</th><th>Visits</th></tr></thead><tbody><tr v-for="row in daily" :key="row.day"><td>{{ row.day }}</td><td>{{ number(row.visits) }}</td></tr></tbody></table></details>
        <h2>Boards cleared</h2>
        <p class="analytics-note">Last {{ days }} days, replays included.</p>
        <div v-for="(value, label) in { Minesweeper: data.minesweeperWins, Breakout: data.breakoutWins }" :key="label" class="analytics-bar-row">
          <div><span>{{ label }}</span><strong>{{ number(value) }}</strong></div>
          <div class="analytics-bar"><span :style="{ width: `${value / Math.max(1, data.minesweeperWins, data.breakoutWins) * 100}%` }"/></div>
        </div>
      </template>
      <template v-if="live?.leaderboard.length">
        <h2>Snake leaderboard</h2>
        <table class="analytics-table"><thead><tr><th>Rank</th><th>Player</th><th>Score</th></tr></thead><tbody><tr v-for="row in live.leaderboard" :key="row.rank"><td>{{ row.rank }}</td><td>{{ row.player }}</td><td>{{ row.score }}</td></tr></tbody></table>
      </template>
      <p v-if="privateError" role="status">{{ privateError }}</p>
      <template v-if="privateData">
        <h2>Behind the scenes</h2><p>Private analytics · {{ number(privateData.breakout.losses) }} lost balls · {{ privateData.breakout.averageWinSeconds ?? '—' }} seconds to win on average · {{ number(privateData.mail.failed) }} failed messages.</p>
        <section v-for="[title, rows] in sections" :key="title">
          <h2>{{ title }}</h2><p v-if="!rows.length">No events yet.</p>
          <div v-for="row in rows" :key="row.label" class="analytics-bar-row">
            <div><span>{{ row.label || 'Unknown' }}</span><strong>{{ number(row.count) }}</strong></div>
            <div class="analytics-bar"><span :style="{ width: `${row.count / Math.max(1, ...rows.map(r => r.count)) * 100}%` }"/></div>
          </div>
        </section>
      </template>
    </main>
    <div class="status-bar">Anonymous events · no analytics cookies · updates after processing</div>
  </div>
</template>

<style scoped>
.analytics-toolbar { flex-wrap: wrap; gap: 8px; }
.analytics-toolbar a { margin-left: auto; font-size: 12px; }
.analytics-toolbar select { font: inherit; }
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
.analytics-chart { display: flex; align-items: stretch; gap: 2px; height: 144px; border-left: 2px solid #555; border-bottom: 2px solid #555; padding: 8px 4px 0; background: repeating-linear-gradient(to top, #ddd 0 1px, transparent 1px 32px); }
.analytics-column { flex: 1; min-width: 0; display: flex; align-items: flex-end; }
.analytics-column span { width: 100%; background: repeating-linear-gradient(to top, #008080 0 6px, #fff 6px 8px); }
.analytics-axis { display: flex; justify-content: space-between; font: 10px/2 monospace; gap: 8px; }
.analytics-bar-row { margin: 14px 0; }
.analytics-bar-row > div:first-child { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.analytics-bar { height: 16px; background: #eee; margin-top: 4px; }
.analytics-bar span { display: block; height: 100%; background: repeating-linear-gradient(to right, #000080 0 6px, transparent 6px 8px); }
.analytics-table { width: 100%; text-align: left; font-size: 12px; }
.analytics-table td, .analytics-table th { border-bottom: 1px solid #ddd; }
@media (max-width: 560px) { .score-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 400px) { .analytics-page { padding: 18px 14px; } }
</style>
