<script setup>
// the snake leaderboard as a 90s pager beside (or under) the handheld: a backlit
// screen with the top ten, and three buttons to flip between the last 7 days, the
// last 30 and all time. names are typed on the handheld's screen (Snake.vue)
import { computed, ref } from 'vue';
import { useLiveStats } from '../live-stats.js';
import { read, save } from '../storage.js';
const { data, error } = useLiveStats();
const periods = [
  { id: 'week', button: '7D', title: 'LAST 7 DAYS', key: 'leaderboardWeek' },
  { id: 'month', button: '30D', title: 'LAST 30 DAYS', key: 'leaderboardMonth' },
  { id: 'all', button: 'ALL', title: 'ALL TIME', key: 'leaderboard' },
];
const saved = read('snake-board-period', 'all');
const period = ref(periods.some(p => p.id === saved) ? saved : 'all');
const current = computed(() => periods.find(p => p.id === period.value));
const rows = computed(() => data.value?.[current.value.key] || []);
function pick(id) {
  period.value = id;
  save('snake-board-period', id);
}
</script>
<template>
  <section class="snake-pager">
    <h2 class="sr-only">Snake leaderboard, {{ current.title.toLowerCase() }}</h2>
    <div class="pager-top" aria-hidden="true">
      <span class="pager-brand">JASON <em>page</em></span>
      <span class="pager-led" :class="{ on: data && !error }"/>
    </div>
    <div class="pager-screen">
      <p class="pager-title">HI-SCORES <span>{{ current.title }}</span></p>
      <p v-if="error && !data" class="pager-message" role="status">NO SIGNAL</p>
      <p v-else-if="!data" class="pager-message" role="status">CONNECTING...</p>
      <table v-else-if="rows.length">
        <thead class="sr-only"><tr><th>Rank</th><th>Player</th><th>Score</th></tr></thead>
        <tbody><tr v-for="row in rows" :key="row.rank"><td>{{ String(row.rank).padStart(2, '0') }}</td><td>{{ row.player.replace(/^Player /, '#') }}</td><td>{{ String(row.score).padStart(3, '0') }}</td></tr></tbody>
      </table>
      <p v-else class="pager-message">NO SCORES YET<br>BE THE FIRST!</p>
    </div>
    <div class="pager-buttons" role="group" aria-label="Leaderboard period">
      <button v-for="p in periods" :key="p.id" :aria-pressed="period === p.id" :aria-label="p.title.toLowerCase()" @click="pick(p.id)">{{ p.button }}</button>
    </div>
  </section>
</template>
<style scoped>
/* dark plastic with a belt clip on the back, like the handheld's cousin */
.snake-pager {
  --pager-body: #2c2e35;
  --pager-light: #464954;
  --pager-dark: #17181c;
  --lcd: #a9bb7c;
  --lcd-ink: #1e2a12;
  position: relative;
  width: min(100%, 300px);
  box-sizing: border-box;
  margin: 18px auto 0;
  padding: 12px 14px 16px;
  border-radius: 14px 14px 22px 22px;
  background: var(--pager-body);
  box-shadow: inset -3px -3px 0 var(--pager-dark), inset 3px 3px 0 var(--pager-light), 3px 3px 0 var(--gb-drop, #555);
}
.snake-pager::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 34px;
  width: 58px;
  height: 8px;
  border-radius: 3px 3px 0 0;
  background: var(--pager-dark);
}
.pager-top { display: flex; align-items: center; justify-content: space-between; margin: 0 2px 8px; }
.pager-brand { color: #c9cad8; font: bold 13px 'Pixel MS Sans Serif', Tahoma, sans-serif; letter-spacing: 1px; -webkit-font-smoothing: none; }
.pager-brand em { font-weight: normal; }
.pager-led { width: 8px; height: 8px; background: #4a1f1f; border: 1px solid #000; }
.pager-led.on { background: #ff5a4a; box-shadow: 0 0 4px #ff5a4a; animation: pager-blink 2.4s steps(1) infinite; }
@keyframes pager-blink { 90% { opacity: .3; } }
/* the backlit screen, sunk into the plastic */
.pager-screen {
  min-height: 188px;
  padding: 8px 10px;
  border: 4px solid var(--pager-dark);
  border-radius: 4px;
  background: var(--lcd);
  color: var(--lcd-ink);
  box-shadow: inset 2px 2px 0 #0003;
  font: bold 13px/1.45 'Courier New', monospace;
}
.pager-title { display: flex; justify-content: space-between; gap: 8px; margin: 0 0 4px; padding: 0 4px; background: var(--lcd-ink); color: var(--lcd); font-size: 12px; }
.pager-message { margin: 40px 0 0; text-align: center; font-size: 13px; }
table { width: 100%; border-collapse: collapse; }
td { padding: 0 2px; }
td:nth-child(2) { width: 100%; overflow-wrap: anywhere; }
td:last-child { text-align: right; }
/* three rubber buttons along the bottom edge */
.pager-buttons { display: flex; justify-content: center; gap: 12px; margin-top: 12px; }
.pager-buttons button {
  min-width: 52px;
  padding: 4px 10px;
  border: 1px solid #000;
  border-radius: 8px;
  background: #5a5d68;
  color: #e2e3ea;
  font: bold 11px Tahoma, sans-serif;
  letter-spacing: 1px;
  box-shadow: inset 0 -3px 0 #3a3c44;
  cursor: var(--classic-pointer);
  transition: transform .08s, filter .08s;
}
@media (hover: hover) {
  .pager-buttons button:hover { transform: translateY(-1px); filter: brightness(1.15); }
}
.pager-buttons button:active,
.pager-buttons button[aria-pressed="true"] { transform: translateY(1px); box-shadow: inset 0 1px 0 #0006; background: #4a4d57; color: var(--lcd); }
.pager-buttons button:focus-visible { outline: 1px dotted #c9cad8; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .pager-led.on { animation: none; } }
</style>
