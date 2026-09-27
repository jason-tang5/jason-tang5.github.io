// the public scoreboard from /api/stats, shared by everything that shows it (the
// scoreboard in analytics and snake, and the hi-score screen on the handheld), so
// they poll it once between them. it polls every 30s while anything is using it.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { onLocalAnalytics } from './local-analytics.js';
import { createOptimisticStats } from './optimistic-stats.mjs';

const data = ref(null);
const error = ref('');
let users = 0;
let timer;
let refreshTimer;
let request = 0;
const optimistic = createOptimisticStats();
onLocalAnalytics(event => {
  optimistic.apply(event);
  data.value = optimistic.value();
  if (users && !refreshTimer) refreshTimer = setTimeout(() => {
    refreshTimer = null;
    load();
  }, 1000);
});

async function load() {
  const id = ++request;
  const revision = optimistic.revision;
  try {
    const response = await fetch('/api/stats', { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const snapshot = await response.json();
    if (id !== request) return;
    data.value = optimistic.accept(snapshot, revision);
    error.value = '';
  } catch { if (id === request) error.value = 'Live stats unavailable. Try again shortly.'; }
}

// which leaderboard in the stats goes with each period
export const boardKeys = { 7: 'leaderboardWeek', 30: 'leaderboardMonth', 90: 'leaderboardQuarter', all: 'leaderboard' };

export function useLiveStats() {
  onMounted(() => {
    if (users++ === 0) {
      load();
      timer = setInterval(load, 30000);
    }
  });
  onBeforeUnmount(() => {
    if (--users === 0) {
      clearInterval(timer);
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  });
  return { data, error, refresh: load };
}
