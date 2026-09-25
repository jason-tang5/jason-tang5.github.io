<script setup>
// my pictures: one big photo with arrows and a strip of thumbnails underneath
import { computed, ref } from 'vue';
import AsciiImage from './AsciiImage.vue';
import { photos } from '../photos.mjs';
import { read, save } from '../storage.js';

defineProps({ visible: Boolean });

const selected = ref(0);
const ascii = ref(read('pictures-ascii', 'on') !== 'off');
const photo = computed(() => photos[selected.value]);

// dates are "YYYY-MM-DD" or just "YYYY-MM", shown in the reader's locale
function formatDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  const options = d
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'long' };
  return new Date(y, m - 1, d || 1).toLocaleDateString([], options);
}

// wraps around at both ends
function step(delta) {
  selected.value = (selected.value + delta + photos.length) % photos.length;
}

function setMode(value) {
  ascii.value = value;
  save('pictures-ascii', value ? 'on' : 'off');
}

function keys(event) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  step(event.key === 'ArrowLeft' ? -1 : 1);
}
</script>

<template>
  <div class="app-layout pictures-app" @keydown="keys">
    <div class="pictures-stage">
      <button class="raised picture-arrow picture-arrow-prev" aria-label="Previous photo" @click="step(-1)">←</button>
      <figure class="pictures-hero" :style="{ '--photo-ratio': photo.width / photo.height }">
        <AsciiImage
          class="picture-image inset"
          :source="photo.source"
          :description="photo.description"
          :enabled="ascii"
          :visible="visible"
          :cell-size="6"
          @update:enabled="setMode"
        />
        <figcaption v-if="photo.caption" class="picture-subtitle">
          <span>{{ photo.caption }}</span> <strong>{{ photo.name }}</strong>
        </figcaption>
      </figure>
      <button class="raised picture-arrow picture-arrow-next" aria-label="Next photo" @click="step(1)">→</button>
    </div>

    <nav class="picture-thumbnails" aria-label="Photos">
      <button
        v-for="(entry, index) in photos"
        :key="entry.id"
        :aria-label="`Photo ${index + 1}: ${entry.description}`"
        :aria-pressed="selected === index"
        :class="['raised', { pressed: selected === index }]"
        @click="selected = index"
      >
        <img :src="entry.thumbnail" alt="" width="54" height="54" loading="lazy">
      </button>
    </nav>

    <footer class="status-bar" aria-live="polite">
      <span>{{ selected + 1 }} / {{ photos.length }}</span>
      <span v-if="photo.date" class="picture-date">
        <time :datetime="photo.date">{{ formatDate(photo.date) }}</time>
      </span>
    </footer>
  </div>
</template>
