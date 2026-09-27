<script setup>
// my pictures: one big photo with arrows and a strip of thumbnails underneath. when
// the window (or the phone) is too small for the ascii controls to sit on the photo,
// they and the arrows move up into a toolbar over it. a sideways swipe on the photo
// goes to the next or previous one
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AsciiImage from './AsciiImage.vue';
import { photos } from '../photos.mjs';
import { read, save } from '../storage.js';

defineProps({ visible: Boolean });

const selected = ref(0);
const ascii = ref(read('pictures-ascii', 'on') !== 'off');
const photo = computed(() => photos[selected.value]);

// the arrows are the scrollbar's pixel triangles
const arrows = { prev: 'M4 0h1v7H4zM3 1h1v5H3zM2 2h1v3H2zM1 3h1v1H1z', next: 'M2 0h1v7H2zM3 1h1v5H3zM4 2h1v3H4zM5 3h1v1H5z' };

// once the photo area is 620px wide or 340px tall or less, the sliders coming down
// from the top of the photo and up from the bottom run into each other, and on a
// phone-sized screen they'd drop under the photo (theme.css), so everything goes in
// the toolbar. the toolbar's own height is counted back in, or showing it would
// shrink the area enough to keep it showing
const phoneScreen = matchMedia('(max-width: 700px)');
const stage = ref(null);
const toolbar = ref(null);
const controlsHost = ref(null);
const compact = ref(false);
function measure() {
  const area = stage.value;
  if (!area) return;
  const height = area.clientHeight + (compact.value ? toolbar.value?.offsetHeight ?? 0 : 0);
  compact.value = phoneScreen.matches || area.clientWidth <= 620 || height <= 340;
}
const observer = new ResizeObserver(measure);
onMounted(() => observer.observe(stage.value));
onBeforeUnmount(() => observer.disconnect());

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
  <div class="app-layout pictures-app" :class="{ compact }" @keydown="keys">
    <div v-if="compact" ref="toolbar" class="pictures-toolbar">
      <button class="raised picture-arrow" aria-label="Previous photo" @click="step(-1)"><svg viewBox="0 0 7 7" aria-hidden="true" shape-rendering="crispEdges"><path :d="arrows.prev"/></svg></button>
      <div ref="controlsHost" class="pictures-controls"/>
      <button class="raised picture-arrow" aria-label="Next photo" @click="step(1)"><svg viewBox="0 0 7 7" aria-hidden="true" shape-rendering="crispEdges"><path :d="arrows.next"/></svg></button>
    </div>
    <div ref="stage" class="pictures-stage" @pointerdown="swipeStart" @pointerup="swipeEnd" @pointercancel="swipeEnd">
      <button v-if="!compact" class="raised picture-arrow picture-arrow-prev" aria-label="Previous photo" @click="step(-1)"><svg viewBox="0 0 7 7" aria-hidden="true" shape-rendering="crispEdges"><path :d="arrows.prev"/></svg></button>
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
          :controls-to="compact ? controlsHost : null"
          @update:enabled="setMode"
        />
        <figcaption v-if="photo.caption" class="picture-subtitle">
          <span>{{ photo.caption }}</span> <strong>{{ photo.name }}</strong>
        </figcaption>
      </figure>
      <button v-if="!compact" class="raised picture-arrow picture-arrow-next" aria-label="Next photo" @click="step(1)"><svg viewBox="0 0 7 7" aria-hidden="true" shape-rendering="crispEdges"><path :d="arrows.next"/></svg></button>
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
