<script setup>
// the snake leaderboard as a game cartridge beside (or above) the handheld: the
// scores are printed on its label, buttons flip between the last 7 and 30 days and
// all time, and it can be tucked back into the handheld (Snake.vue). names are typed
// on the handheld's screen. analytics shows the same cartridge with nothing to tuck
// it into, so it hides that button, swaps all time for 90 days (as far back as the
// page's history goes) and ties the period to its own, so the whole page changes together
import { computed, ref } from 'vue';
import { boardKeys, useLiveStats } from '../live-stats.js';
import { read, save } from '../storage.js';
const props = defineProps({
  tuckable: { type: Boolean, default: true },
  // when given, the page owns the period: 7, 30 or 90
  period: { type: [Number, String], default: null },
  choices: { type: Array, default: () => [7, 30, 'all'] },
});
const emit = defineEmits(['tuck', 'update:period']);
const { data, error } = useLiveStats();
const allPeriods = [
  { id: 7, button: '7D', title: 'Last 7 days' },
  { id: 30, button: '30D', title: 'Last 30 days' },
  { id: 90, button: '90D', title: 'Last 90 days' },
  { id: 'all', button: 'ALL', title: 'All time' },
];
const periods = computed(() => allPeriods.filter(p => props.choices.includes(p.id)));
// on its own (the handheld) it remembers its period in this browser
const saved = { week: 7, month: 30 }[read('snake-board-period', 'all')] || 'all';
const own = ref(saved);
const period = computed(() => props.period ?? own.value);
const current = computed(() => allPeriods.find(p => p.id === period.value) || allPeriods.at(-1));
const rows = computed(() => data.value?.[boardKeys[current.value.id]] || []);
function pick(id) {
  if (props.period !== null) return emit('update:period', id);
  own.value = id;
  save('snake-board-period', { 7: 'week', 30: 'month' }[id] || 'all');
}
</script>
<template>
  <section class="snake-cart">
    <div class="cart-controls cart-top">
      <div class="cart-grip" aria-hidden="true"/>
      <button v-if="tuckable" class="cart-tuck" title="Tuck the cartridge into the handheld" @click="$emit('tuck')">&#9660; TUCK IN</button>
    </div>
    <div class="cart-label">
      <div class="cart-label-top">
        <h2>SNAKE <span>HI-SCORES</span></h2>
        <p>{{ current.title }}</p>
      </div>
      <p v-if="error && !data" class="cart-message" role="status">No signal. Try again shortly.</p>
      <p v-else-if="!data" class="cart-message" role="status">Loading...</p>
      <ol v-else-if="rows.length" class="cart-scores">
        <li v-for="row in rows" :key="row.rank">
          <span class="cart-rank">{{ row.rank }}</span>
          <span class="cart-player">{{ row.player.replace(/^Player /, '#') }}</span>
          <span class="cart-score">{{ String(row.score).padStart(3, '0') }}</span>
        </li>
      </ol>
      <p v-else class="cart-message">No scores yet.<br>Be the first!</p>
    </div>
    <div class="cart-controls">
      <div class="cart-periods" role="group" aria-label="Leaderboard period">
        <button v-for="p in periods" :key="p.id" :aria-pressed="period === p.id" :title="p.title" @click="pick(p.id)">{{ p.button }}</button>
      </div>
    </div>
  </section>
</template>
<style scoped>
/* grey plastic with the top right corner cut off and grip ridges along the top */
.snake-cart {
  --cart: #bcbcc3;
  --cart-light: #dcdce2;
  --cart-dark: #8e8e98;
  width: min(100%, 240px);
  box-sizing: border-box;
  margin: 0;
  padding: 8px 16px 14px;
  background: var(--cart);
  border-radius: 4px 0 12px 12px;
  clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%);
  box-shadow: inset -3px -3px 0 var(--cart-dark), inset 3px 3px 0 var(--cart-light);
  font-family: 'Pixel MS Sans Serif', Tahoma, sans-serif;
}
:root[data-theme="dark"] .snake-cart { --cart: #5a5a64; --cart-light: #74747f; --cart-dark: #3a3a42; }
.cart-grip { height: 12px; margin: 0 26px 10px 4px; background: repeating-linear-gradient(90deg, var(--cart-dark) 0 2px, transparent 2px 7px); }
/* the sticker, with a printed band across the top */
.cart-label { padding: 0 0 8px; background: #f3efe2; color: #1b1d33; border-radius: 3px; box-shadow: inset 0 0 0 2px var(--cart-dark), 2px 2px 0 var(--cart-light); overflow: hidden; }
.cart-label-top { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 6px 10px; background: var(--gb-ink, #26307f); color: #fff; }
.cart-label-top h2 { margin: 0; font: bold 16px 'Pixel MS Sans Serif', Tahoma, sans-serif; letter-spacing: 1px; -webkit-font-smoothing: none; }
.cart-label-top h2 span { font-size: 11px; font-weight: normal; }
.cart-label-top p { margin: 0; font-size: 11px; white-space: nowrap; }
:root[data-theme="dark"] .cart-label-top { background: #26307f; }
.cart-scores { list-style: none; margin: 6px 0 0; padding: 0 10px; min-height: 150px; font: bold 13px/1.5 'Courier New', monospace; }
.cart-scores li { display: flex; gap: 8px; border-bottom: 1px dotted #1b1d3333; }
.cart-rank { width: 2ch; text-align: right; color: #26307f; }
.cart-player { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.cart-message { min-height: 150px; margin: 0; padding-top: 50px; box-sizing: border-box; text-align: center; font-size: 13px; }
/* the buttons, shaped like the handheld's select and start */
.cart-controls { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.cart-top { margin: 0 10px 10px 0; flex-wrap: nowrap; }
.cart-top .cart-grip { flex: 1; margin: 0 0 0 4px; }
.cart-tuck { flex: none; }
/* the periods share the width, so they squeeze in without wrapping */
.cart-periods { display: flex; flex: 1; gap: 4px; }
.cart-periods button { flex: 1 1 0; padding-inline: 0; letter-spacing: 0; white-space: nowrap; }
.cart-controls button {
  padding: 3px 9px;
  border: 1px solid #333;
  border-radius: 7px;
  background: var(--gb-pill, #8d8b95);
  color: #fff;
  font: bold 10px Tahoma, sans-serif;
  letter-spacing: 1px;
  box-shadow: inset 0 -2px 0 var(--gb-pill-dark, #5f5d66);
  cursor: var(--classic-pointer);
  transition: transform .08s, filter .08s;
}
@media (hover: hover) {
  .cart-controls button:hover { transform: translateY(-1px); filter: brightness(1.15); }
}
.cart-controls button:active,
.cart-periods button[aria-pressed="true"] { transform: translateY(1px); box-shadow: inset 0 1px 0 #0005; background: var(--gb-ink, #26307f); }
.cart-controls button:focus-visible { outline: 1px dotted #000; outline-offset: 2px; }
</style>
