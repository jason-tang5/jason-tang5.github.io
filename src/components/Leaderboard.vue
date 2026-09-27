<script setup>
// the all-time snake leaderboard under the handheld, with an optional name to show
// on it. the name is checked as you type (src/names.mjs) and again by the worker
import { computed } from 'vue';
import { useLiveStats } from '../live-stats.js';
import { maxNameLength, nameProblem } from '../names.mjs';
const name = defineModel('name', { type: String, default: '' });
const { data, error } = useLiveStats();
const problem = computed(() => nameProblem(name.value));
</script>
<template>
  <section class="live-scoreboard">
    <h2>Snake leaderboard &middot; all-time</h2>
    <label class="leaderboard-name">
      <span>Your name on the board</span>
      <input v-model="name" type="text" :maxlength="maxNameLength" placeholder="Anonymous" autocomplete="nickname" spellcheck="false" :aria-invalid="Boolean(problem)" aria-describedby="leaderboard-name-note" @keydown.stop>
    </label>
    <p id="leaderboard-name-note" class="leaderboard-note" :class="{ bad: problem }" role="status">{{ problem || 'Optional. Set it before you play and your scores show under it.' }}</p>
    <p v-if="error && !data" role="status">{{ error }}</p>
    <template v-else-if="data">
      <table v-if="data.leaderboard.length"><thead><tr><th>Rank</th><th>Player</th><th>Score</th></tr></thead><tbody><tr v-for="row in data.leaderboard" :key="row.rank"><td>{{ row.rank }}</td><td>{{ row.player }}</td><td>{{ row.score }}</td></tr></tbody></table>
      <p v-else>No scores yet. Play to set the first record!</p>
    </template>
    <p v-else role="status">Loading scores...</p>
  </section>
</template>
<style scoped>
.live-scoreboard { margin: 16px 0; padding: 12px; background: var(--d-page-alt, #fffdf2); border: 1px solid var(--d-line, #999); }
h2 { font-family: 'Pixel MS Sans Serif', sans-serif; font-size: 18px; } p { font-size: 13px; }
.leaderboard-name { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; }
.leaderboard-name input { font: inherit; width: 14ch; max-width: 100%; }
.leaderboard-note { font-size: 11px; color: var(--muted); margin: 4px 0 10px; }
.leaderboard-note.bad { color: var(--d-bad, #b00000); }
table { width: 100%; text-align: left; font-size: 13px; border-collapse: collapse; } td, th { padding: 5px; border-bottom: 1px solid var(--d-rule, #ccc); }
</style>
