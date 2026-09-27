<script setup>
// the taskbar clock's popup: a little win95 date/time style month calendar.
// opens on the current month with today picked out, and flips months with the arrows.
import { computed, ref } from 'vue';

const props = defineProps({ now: Date });

const shown = ref(new Date(props.now.getFullYear(), props.now.getMonth(), 1));
const weekdays = computed(() => Array.from({ length: 7 }, (_, i) =>
  new Date(2024, 0, 7 + i).toLocaleDateString([], { weekday: 'narrow' })));
const title = computed(() => shown.value.toLocaleDateString([], { month: 'long', year: 'numeric' }));

// six weeks of days, starting on the sunday on or before the 1st
const days = computed(() => {
  const first = shown.value;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return {
      key: date.toDateString(),
      day: date.getDate(),
      outside: date.getMonth() !== first.getMonth(),
      today: date.toDateString() === props.now.toDateString(),
      label: date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    };
  });
});

function step(months) {
  shown.value = new Date(shown.value.getFullYear(), shown.value.getMonth() + months, 1);
}
</script>

<template>
  <div class="calendar raised" role="dialog" aria-label="Calendar">
    <div class="calendar-title">
      <button class="raised calendar-step" aria-label="Previous month" @click="step(-1)">
        <svg viewBox="0 0 4 7" aria-hidden="true"><path d="M3 0h1v7H3V6H2V5H1V4H0V3h1V2h1V1h1z"/></svg>
      </button>
      <strong aria-live="polite">{{ title }}</strong>
      <button class="raised calendar-step" aria-label="Next month" @click="step(1)">
        <svg viewBox="0 0 4 7" aria-hidden="true"><path d="M0 0h1v1h1v1h1v1h1v1H3v1H2v1H1v1H0z"/></svg>
      </button>
    </div>
    <div class="calendar-grid inset" role="grid">
      <span v-for="(w, i) in weekdays" :key="'w' + i" class="calendar-weekday" role="columnheader">{{ w }}</span>
      <span
        v-for="d in days"
        :key="d.key"
        class="calendar-day"
        :class="{ outside: d.outside, today: d.today }"
        role="gridcell"
        :aria-label="d.label"
        :aria-current="d.today ? 'date' : undefined"
      >{{ d.day }}</span>
    </div>
    <p class="calendar-today">{{ now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) }}</p>
  </div>
</template>
