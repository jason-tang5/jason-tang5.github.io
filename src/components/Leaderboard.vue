<script setup>
import { useLiveStats } from '../live-stats.js';
const { data, error } = useLiveStats();
</script>
<template>
  <section class="live-scoreboard">
    <h2>All-time scoreboard</h2>
    <p v-if="error" role="status">{{ error }}</p>
    <template v-else-if="data">
      <p><strong>{{ data.visitors.toLocaleString() }}</strong> total visits &middot; <strong>{{ data.online }}</strong> online now</p>
      <p>Minesweeper beaten: {{ data.minesweeperWins }} &middot; Breakout finished: {{ data.breakoutWins }} &middot; Highest Snake score: {{ data.snakeHighScore }}</p>
      <h3>Snake leaderboard &middot; all-time</h3>
      <table v-if="data.leaderboard.length"><thead><tr><th>Rank</th><th>Player</th><th>Score</th></tr></thead><tbody><tr v-for="row in data.leaderboard" :key="row.rank"><td>{{ row.rank }}</td><td>{{ row.player }}</td><td>{{ row.score }}</td></tr></tbody></table>
      <p v-else>No scores yet. Play to set the first record!</p>
      <small>Since tracking began. Visits count page loads with interaction; online counts visible, active tabs in the last 90 seconds. One best score per anonymous visit. Scores are client-reported.</small>
    </template>
    <p v-else role="status">Loading scores...</p>
  </section>
</template>
<style scoped>
.live-scoreboard { margin: 16px 0; padding: 12px; background: var(--d-page-alt, #fffdf2); border: 1px solid var(--d-line, #999); }
h2, h3 { font-family: 'Pixel MS Sans Serif', sans-serif; }
h2 { font-size: 18px; } h3 { font-size: 14px; } p { font-size: 13px; } small { font-size: 11px; color: var(--muted); }
table { width: 100%; text-align: left; font-size: 13px; border-collapse: collapse; } td, th { padding: 5px; border-bottom: 1px solid var(--d-rule, #ccc); }
</style>
