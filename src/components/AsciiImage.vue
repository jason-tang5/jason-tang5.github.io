<script setup>
// shows an image or video as colored ascii art, with the original underneath as a fallback.
//   - videos (the wallpaper) use react-video-ascii, which is a react component,
//     so we mount a tiny react root just for it. the rest of the site is vue.
//   - images (portrait, photos) use KnockoffAscii, which is our own canvas version.
// if webgl isn't available or anything crashes, it quietly falls back to the plain media.
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { createElement, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { VideoAscii } from 'react-video-ascii';
import KnockoffAscii from './KnockoffAscii.vue';
import { imageDetail } from '../ascii-density.js';

const props = defineProps({
  source: String,
  description: String,
  enabled: Boolean,
  visible: Boolean,
  mediaType: { type: String, default: 'image' },
  poster: String,
  columns: Number,
  cellSize: Number,
  showControls: Boolean,
});
const emit = defineEmits(['update:enabled']);

const host = ref(null);
const fallbackVideo = ref(null);
const failed = ref(false);
const asciiReset = ref(0);
const reducedMotion = ref(false);
const pageHidden = ref(document.hidden);
// one detail setting for every photo and video in my pictures. it becomes a letter
// size in pixels, not a column count, so a narrow portrait video and a wide landscape
// one (or a photo) get the same size letters at the same slider position
const asciiColumns = imageDetail;
const imageCellSize = computed(() => 540 / asciiColumns.value);
const densitySlider = ref(null);
const modeControls = ref(null);
// the detail slider starts open so people find it. clicking elsewhere tucks it away
// and the ascii button brings it back
const densityOpen = ref(true);
const spinning = ref(false);

// the ↻ button in the top left brings every knocked out letter back
function resetAscii() {
  asciiReset.value++;
  spinning.value = false;
  requestAnimationFrame(() => { spinning.value = true; });
}
let densityDragging = false;

function setColumns(value) {
  asciiColumns.value = Math.max(40, Math.min(220, Math.round(value / 10) * 10));
}

function densityAt(event) {
  const rect = densitySlider.value.getBoundingClientRect();
  setColumns(40 + (rect.bottom - event.clientY - 5.5) / (rect.height - 11) * 180);
}

function densityDown(event) {
  if (!props.enabled || event.button !== 0) return;
  densityDragging = true;
  densitySlider.value.setPointerCapture(event.pointerId);
  densitySlider.value.focus();
  densityAt(event);
}

function densityKeys(event) {
  if (!props.enabled) return;
  const steps = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10, PageUp: 30, PageDown: -30 };
  if (event.key === 'Home') setColumns(40);
  else if (event.key === 'End') setColumns(220);
  else if (event.key in steps) setColumns(asciiColumns.value + steps[event.key]);
  else return;
  event.preventDefault();
}

// only burn gpu when someone can actually see it
const running = computed(() =>
  (props.enabled || props.mediaType === 'video') && props.visible && !failed.value && !reducedMotion.value && !pageHidden.value,
);

const mouseTrail = { style: 'brighten', radius: 0.04, duration: 1.0, trailLen: 14, trailDecay: 6, brightness: 2.4 };
const ripple = { style: 'ripple', brightness: 1.3, speed: 1.2 };

let root;
let observer;
let motionQuery;

// react error boundary so a crash inside the library flips us to the fallback instead of breaking the page
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    failed.value = true;
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function restoreAscii() {
  densityOpen.value = props.enabled ? !densityOpen.value : true;
  emit('update:enabled', true);
}

function normalMode() {
  densityOpen.value = false;
  emit('update:enabled', false);
}

function closeDensity(event) {
  if (!modeControls.value?.contains(event.target)) densityOpen.value = false;
}

function release() {
  root?.unmount();
  root = null;
}

function render() {
  if (!host.value) return;
  if (failed.value || props.mediaType === 'image') {
    release();
    return;
  }

  if (!root) {
    // check webgl2 exists before handing things to the library, then give the test context back
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      failed.value = true;
      return;
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    root = createRoot(host.value);
  }

  // the gpu loop keeps running so the mouse trail and ripples can fade out.
  // with reduced motion it's paused but still draws the frame.
  const columns = props.showControls
    ? Math.max(20, Math.round(host.value.clientWidth / imageCellSize.value))
    : (props.columns || Math.min(180, Math.max(40, Math.round(host.value.clientWidth / 7))));
  root.render(createElement(Boundary, null, createElement(VideoAscii, {
    src: props.source,
    mediaType: props.mediaType,
    videoMode: !props.enabled,
    paused: !running.value,
    mouseEffect: running.value && props.enabled ? mouseTrail : false,
    clickEffect: running.value && props.enabled ? ripple : false,
    revealEffect: false,
    maxDpr: props.showControls ? 2 : 1,
    numColsRaw: columns,
    brightnessRaw: 1.15,
    saturationRaw: 1.2,
    bgOpacityRaw: 0.35,
  })));
}

function lost(event) {
  event.preventDefault();
  failed.value = true;
}

function syncMotion() {
  reducedMotion.value = motionQuery.matches;
}

function syncVisibility() {
  pageHidden.value = document.hidden;
}

// the plain fallback video should also pause when nobody's looking
function syncFallback() {
  const video = fallbackVideo.value;
  if (!video) return;
  if (props.visible && !reducedMotion.value && !pageHidden.value) video.play().catch(() => {});
  else video.pause();
}

watch(
  () => [
    props.source,
    props.mediaType,
    props.columns,
    asciiColumns.value,
    props.enabled,
    props.visible,
    failed.value,
    running.value,
    reducedMotion.value,
    pageHidden.value,
  ],
  async () => {
    render();
    await nextTick();
    syncFallback();
  },
);

onMounted(() => {
  motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  syncMotion();
  motionQuery.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncVisibility);
  document.addEventListener('pointerdown', closeDensity, true);
  host.value.addEventListener('webglcontextlost', lost, true);
  observer = new ResizeObserver(render);
  observer.observe(host.value);
  render();
  syncFallback();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  motionQuery?.removeEventListener('change', syncMotion);
  document.removeEventListener('visibilitychange', syncVisibility);
  document.removeEventListener('pointerdown', closeDensity, true);
  fallbackVideo.value?.pause();
  host.value?.removeEventListener('webglcontextlost', lost, true);
  release();
});
</script>

<template>
  <div
    class="ascii-image"
    :role="mediaType === 'image' || showControls ? 'group' : 'img'"
    :aria-label="description"
  >
    <img :src="poster || source" alt="" class="ascii-original">
    <video
      v-if="mediaType === 'video' && failed"
      ref="fallbackVideo"
      class="ascii-original"
      :src="source"
      :poster="poster"
      muted
      loop
      playsinline
      preload="auto"
      aria-hidden="true"
      @loadeddata="syncFallback"
    />
    <div
      ref="host"
      class="ascii-layer"
      aria-hidden="true"
      :style="{
        visibility: (enabled || mediaType === 'video') && !failed && visible ? 'visible' : 'hidden',
        animationPlayState: running ? 'running' : 'paused',
      }"
    />
    <KnockoffAscii
      v-if="mediaType === 'image' && enabled && !failed"
      :reset-version="asciiReset"
      :source="source"
      :description="description"
      :cell-size="imageCellSize"

      :visible="visible"
      :reduced-motion="reducedMotion"
      @error="failed = true"
    />
    <button
      v-if="mediaType === 'image' && enabled && !failed"
      class="ascii-reset raised"
      :class="{ spinning }"
      title="Bring the letters back"
      aria-label="Bring the ASCII letters back"
      @pointerdown.stop
      @pointermove.stop
      @keydown.stop
      @click.stop="resetAscii"
      @animationend="spinning = false"
    >
      <svg width="24" height="24" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">
        <path fill="#404040" d="M4 1h4v1H4zM9 1h1v1H9zM2 2h2v1H2zM8 2h2v1H8zM2 3h1v1H2zM7 3h3v1H7zM1 4h1v4H1zM10 6h1v2h-1zM2 8h1v1H2zM9 8h1v1H9zM2 9h2v1H2zM8 9h2v1H8zM4 10h4v1H4z"/>
      </svg>
    </button>
    <!-- stop events here so clicking the toggle doesn't also poke the image or drag the window -->
    <div
      v-if="mediaType === 'image' || showControls"
      ref="modeControls"
      class="ascii-mode-controls"

      role="group"
      aria-label="Photo rendering"
      @pointerdown.stop
      @pointermove.stop
      @click.stop
      @keydown.stop
    >
      <button class="raised" :class="{ pressed: enabled }" :aria-pressed="enabled" :aria-expanded="densityOpen && enabled" @click="restoreAscii">ASCII</button>
      <button class="raised" :class="{ pressed: !enabled }" :aria-pressed="!enabled" @click="normalMode">Normal</button>
      <div v-if="densityOpen && enabled" class="ascii-density raised" title="ASCII detail" @keydown.esc.stop="densityOpen = false">
        <div
          ref="densitySlider"
          class="volume-slider density-slider"
          role="slider"
          :tabindex="enabled ? 0 : -1"
          aria-label="ASCII detail"
          aria-orientation="vertical"
          aria-valuemin="40"
          aria-valuemax="220"
          :aria-valuenow="asciiColumns"
          :aria-valuetext="`${Math.round((asciiColumns - 40) / 180 * 100)}% detail`"
          :aria-disabled="!enabled"
          :style="{ '--level': (asciiColumns - 40) / 180 * 100 }"
          @pointerdown="densityDown"
          @pointermove="densityDragging && enabled && densityAt($event)"
          @pointerup="densityDragging = false"
          @pointercancel="densityDragging = false"
          @lostpointercapture="densityDragging = false"
          @keydown="densityKeys"
        >
          <span class="volume-groove" />
          <span class="volume-thumb" />
        </div>
      </div>
    </div>
  </div>
</template>
