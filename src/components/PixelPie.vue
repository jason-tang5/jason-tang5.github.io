<script setup>
// a pie chart drawn on a 24x24 pixel grid, for the analytics window. each cell is
// colored by which slice its angle falls in, clockwise from the top, and a one pixel
// ring outlines it. slices use --bar-1 to --bar-5 from the analytics page, anything
// past five folds into "Other" (--bar-6)
import { computed } from 'vue';

const props = defineProps({ rows: Array, label: String });
const size = 24;
const center = size / 2;

const slices = computed(() => {
  const rows = props.rows.filter(row => row.count > 0);
  const top = rows.slice(0, 5);
  const rest = rows.slice(5).reduce((sum, row) => sum + row.count, 0);
  if (rest) top.push({ label: 'Other', count: rest });
  const total = top.reduce((sum, row) => sum + row.count, 0);
  let start = 0;
  return top.map((row, i) => {
    const share = row.count / total;
    const slice = { ...row, color: `var(--bar-${rest && i === top.length - 1 ? 6 : i + 1})`, share, start, end: start + share, d: '' };
    start += share;
    return slice;
  });
});

const drawing = computed(() => {
  const list = slices.value.map(slice => ({ ...slice }));
  let ring = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - center, dy = y + 0.5 - center;
      const distance = Math.hypot(dx, dy);
      const cell = `M${x} ${y}h1v1h-1z`;
      if (distance > center) continue;
      if (distance > center - 1.2 || !list.length) { ring += cell; continue; }
      const turn = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
      (list.find(slice => turn < slice.end) || list.at(-1)).d += cell;
    }
  }
  return { list, ring };
});

const percent = share => `${Math.round(share * 100)}%`;
</script>

<template>
  <figure class="pixel-pie">
    <svg :viewBox="`0 0 ${size} ${size}`" shape-rendering="crispEdges" role="img"
      :aria-label="slices.length ? `${label}: ${slices.map(s => `${s.label} ${percent(s.share)}`).join(', ')}` : `${label}: no data yet`">
      <path v-for="slice in drawing.list" :key="slice.label" :d="slice.d" :style="{ fill: slice.color }"><title>{{ slice.label }}: {{ slice.count.toLocaleString() }} ({{ percent(slice.share) }})</title></path>
      <path class="pixel-pie-ring" :class="{ empty: !slices.length }" :d="drawing.ring"/>
    </svg>
    <figcaption>
      <ul v-if="slices.length">
        <li v-for="slice in slices" :key="slice.label">
          <i :style="{ background: slice.color }"/><span>{{ slice.label || 'Unknown' }}</span><strong>{{ slice.count.toLocaleString() }}</strong><small>{{ percent(slice.share) }}</small>
        </li>
      </ul>
      <p v-else>No data yet.</p>
    </figcaption>
  </figure>
</template>

<style scoped>
.pixel-pie { display: flex; align-items: center; gap: 16px; margin: 12px 0; flex-wrap: wrap; }
.pixel-pie svg { width: 120px; height: 120px; flex: none; image-rendering: pixelated; }
.pixel-pie-ring { fill: var(--ink); }
.pixel-pie-ring.empty { fill: var(--d-rule, #ccc); }
figcaption { flex: 1; min-width: 160px; max-width: 300px; font-size: 13px; }
ul { list-style: none; margin: 0; padding: 0; }
li { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
i { width: 12px; height: 12px; flex: none; border: 1px solid var(--ink); }
li span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
small { width: 36px; text-align: right; color: var(--muted); }
p { margin: 0; color: var(--muted); }
</style>
