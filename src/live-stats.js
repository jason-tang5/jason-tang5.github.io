// the public scoreboard from /api/stats, shared by everything that shows it (the
// scoreboard in analytics and snake, and the hi-score screen on the handheld), so
// they poll it once between them. it polls every 30s while anything is using it.
import { onBeforeUnmount, onMounted, ref } from 'vue';

const data = ref(null);
const error = ref('');
let users = 0;
let timer;

async function load() {
  try {
    const response = await fetch('/api/stats');
    if (!response.ok) throw new Error();
    data.value = await response.json();
    error.value = '';
  } catch { error.value = 'Live stats unavailable. Try again shortly.'; }
}

export function useLiveStats() {
  onMounted(() => {
    if (users++ === 0) {
      load();
      timer = setInterval(load, 30000);
    }
  });
  onBeforeUnmount(() => {
    if (--users === 0) clearInterval(timer);
  });
  return { data, error };
}
