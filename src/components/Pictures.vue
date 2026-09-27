<script setup>
// my pictures: one big photo with arrows and a strip of thumbnails underneath. on a
// phone the arrows and the ascii controls move up into a toolbar over the photo, and a
// sideways swipe on the photo goes to the next or previous one
import { computed, onBeforeUnmount, ref } from 'vue';
import AsciiImage from './AsciiImage.vue';
import { photos } from '../photos.mjs';
import { read, save } from '../storage.js';

defineProps({ visible: Boolean });

const selected = ref(0);
const ascii = ref(read('pictures-ascii', 'on') !== 'off');
const photo = computed(() => photos[selected.value]);

const phoneQuery = matchMedia('(max-width: 700px)');
const phone = ref(phoneQuery.matches);
const syncPhone = () => { phone.value = phoneQuery.matches; };
phoneQuery.addEventListener('change', syncPhone);
onBeforeUnmount(() => phoneQuery.removeEventListener('change', syncPhone));
const controlsHost = ref(null);

// a finger that moves mostly sideways, far enough, is a swipe. the ascii letters let
// unarmed touches through to here (KnockoffAscii.vue), an armed hammer keeps them
let swipe = null;
function swipeStart(event) {
  if (event.pointerType !== 'touch' || !event.isPrimary) return;
  swipe = { x: event.clientX, y: event.clientY };
}
function swipeEnd(event) {
  if (!swipe) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
}

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
  <div class="app-layout pictures-app" :class="{ phone }" @keydown="keys">
    <!-- the arrows are the scrollbar's pixel triangles -->
    <div v-if="phone" class="pictures-toolbar">
      <button class="raised picture-arrow" aria-label="Previous photo" @click="step(-1)"><svg viewBox="0 0 7 7" aria-hidden="true" shape-rendering="crispEdges"><path d="M4 0h1v7H4zM3 1h1v5H3zM2 2h1v3H2zM1 3h1v1H1z"/></svg></button>
      <div ref="controlsHost" class="pictures-controls"/>
      <button class="raised picture-arrow" aria-label="Next photo" @click="step(1)"><svg viewBox="0 0 7 7" aria-hidden="true" shape-rendering="crispEdges"><path d="M2 0h1v7H2zM3 1h1v5H3zM4 2h1v3H4zM5 3h1v1H5z"/></svg></button>
    </div>
    <div class="pictures-stage" @pointerdown="swipeStart" @pointerup="swipeEnd" @pointercancel="swipeEnd">
      <button v-if="!phone" class="raised picture-arrow picture-arrow-prev" aria-label="Previous photo" @click="step(-1)">←</button>
      <figure class="pictures-hero" :style="{ '--photo-ratio': photo.width / photo.height, '--photo-brightness': photo.brightness ?? 1.22, '--ascii-brightness': photo.brightness ?? 1 }">
        <AsciiImage
          :key="photo.id"
          class="picture-image inset"
          :source="photo.source"
          :media-type="photo.mediaType || 'image'"
          :poster="photo.poster"
          show-controls
          :description="photo.description"
          :enabled="ascii"
          :visible="visible"
          :cell-size="6"
          :controls-to="phone ? controlsHost : null"
          @update:enabled="setMode"
        />
        <figcaption v-if="photo.caption" class="picture-subtitle">
          <span>{{ photo.caption }}</span> <strong>{{ photo.name }}</strong>
        </figcaption>
      </figure>
      <button v-if="!phone" class="raised picture-arrow picture-arrow-next" aria-label="Next photo" @click="step(1)">→</button>
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
        <img :src="entry.thumbnail" :style="{ '--photo-brightness': entry.brightness ?? 1.22 }" alt="" width="54" height="54" loading="lazy">
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
