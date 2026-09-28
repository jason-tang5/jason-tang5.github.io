<script setup>
// my pictures: one big photo with arrows and a strip of thumbnails underneath. when
// the window (or the phone) is too small for the ascii controls to sit on the photo,
// they and the arrows move up into a toolbar over it. dragging the photo sideways
// slides it along with the next or previous one coming in beside it, like a phone's
// photo gallery
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AsciiImage from './AsciiImage.vue';
import { photos } from '../photos.mjs';
import { imageAscii } from '../ascii-density.js';

defineProps({ visible: Boolean });

const selected = ref(0);
const ascii = imageAscii;
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

// a finger that moves mostly sideways drags the photo along, with its neighbour
// following a gap behind. letting go past a third of the way, or with a flick, slides
// the rest of the way over and switches to it; otherwise both slide back. the ascii
// letters let unarmed touches through to here (KnockoffAscii.vue), an armed hammer
// keeps them
const gap = 20;
const offset = ref(0);
const settling = ref(false);
const dragging = ref(false);
let swipe = null;
let settleTimer = 0;
const neighbour = computed(() => {
  if (!offset.value) return null;
  const index = (selected.value + (offset.value < 0 ? 1 : -1) + photos.length) % photos.length;
  return photos[index];
});
const pageWidth = () => (stage.value?.clientWidth ?? 0) + gap;

function swipeStart(event) {
  if (event.pointerType !== 'touch' || !event.isPrimary || settling.value) return;
  swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, moves: [{ x: event.clientX, t: event.timeStamp }] };
}
function swipeMove(event) {
  if (swipe?.id !== event.pointerId) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  if (!dragging.value) {
    // wait to see which way the finger's going before taking it
    if (Math.hypot(dx, dy) < 8) return;
    if (Math.abs(dx) < Math.abs(dy)) { swipe = null; return; }
    dragging.value = true;
    swipe.x = event.clientX;
    stage.value.setPointerCapture(event.pointerId);
  }
  offset.value = event.clientX - swipe.x;
  swipe.moves.push({ x: event.clientX, t: event.timeStamp });
  if (swipe.moves.length > 5) swipe.moves.shift();
}
function swipeEnd(event) {
  if (swipe?.id !== event.pointerId) return;
  const moves = swipe.moves;
  swipe = null;
  if (!dragging.value) return;
  dragging.value = false;
  // how fast the finger was going over its last few moves, in px per ms
  const first = moves[0];
  const last = moves[moves.length - 1];
  const speed = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
  const width = pageWidth();
  const flick = Math.abs(speed) > 0.4 && Math.sign(speed) === Math.sign(offset.value);
  const go = event.type !== 'pointercancel' && (flick || Math.abs(offset.value) > width / 3);
  const direction = offset.value < 0 ? 1 : -1;
  settle(go ? -direction * width : 0, () => {
    if (go) step(direction);
    offset.value = 0;
  });
}
// slides to `target`, then lets `done` swap the photos without a jump
function settle(target, done) {
  if (offset.value === target) { done(); return; }
  settling.value = true;
  offset.value = target;
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    done();
    settling.value = false;
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
}
onBeforeUnmount(() => clearTimeout(settleTimer));

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
    <div ref="stage" :class="['pictures-stage', { swiping: offset || dragging, settling }]" @pointerdown="swipeStart" @pointermove="swipeMove" @pointerup="swipeEnd" @pointercancel="swipeEnd">
      <button v-if="!compact" class="raised picture-arrow picture-arrow-prev" aria-label="Previous photo" @click="step(-1)"><svg viewBox="0 0 7 7" aria-hidden="true" shape-rendering="crispEdges"><path :d="arrows.prev"/></svg></button>
      <!-- the photo coming in beside the one being dragged. it's the plain photo (or a
           video's poster) over its thumbnail until it's picked and gets its letters -->
      <figure
        v-if="neighbour"
        class="pictures-hero pictures-peek"
        aria-hidden="true"
        :style="{ '--photo-ratio': neighbour.width / neighbour.height, '--photo-brightness': neighbour.brightness ?? 1.22, transform: `translateX(${offset + (offset < 0 ? 1 : -1) * pageWidth()}px)` }"
      >
        <img class="inset" :src="neighbour.poster || neighbour.source" :style="{ backgroundImage: `url(${neighbour.thumbnail})` }" alt="">
      </figure>
      <figure class="pictures-hero" :style="{ transform: offset ? `translateX(${offset}px)` : null, '--photo-ratio': photo.width / photo.height, '--photo-brightness': photo.brightness ?? 1.22, '--ascii-brightness': photo.brightness ?? 1 }">
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
