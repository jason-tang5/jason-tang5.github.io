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

const props = defineProps({
  source: String,
  description: String,
  enabled: Boolean,
  visible: Boolean,
  mediaType: { type: String, default: 'image' },
  poster: String,
  columns: Number,
  cellSize: Number,
});
const emit = defineEmits(['update:enabled']);

const host = ref(null);
const fallbackVideo = ref(null);
const failed = ref(false);
const asciiReset = ref(0);
const reducedMotion = ref(false);
const pageHidden = ref(document.hidden);

// only burn gpu when someone can actually see it
const running = computed(() =>
  props.enabled && props.visible && !failed.value && !reducedMotion.value && !pageHidden.value,
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

// clicking ascii again also resets any cells you knocked out of the image
function restoreAscii() {
  asciiReset.value++;
  emit('update:enabled', true);
}

function release() {
  root?.unmount();
  root = null;
}

function render() {
  if (!host.value) return;
  if (!props.enabled || failed.value || props.mediaType === 'image') {
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
  const columns = props.columns || Math.min(180, Math.max(40, Math.round(host.value.clientWidth / 7)));
  root.render(createElement(Boundary, null, createElement(VideoAscii, {
    src: props.source,
    mediaType: props.mediaType,
    paused: !running.value,
    mouseEffect: running.value ? mouseTrail : false,
    clickEffect: running.value ? ripple : false,
    revealEffect: false,
    maxDpr: 1,
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
  fallbackVideo.value?.pause();
  host.value?.removeEventListener('webglcontextlost', lost, true);
  release();
});
</script>

<template>
  <div
    class="ascii-image"
    :role="mediaType === 'image' ? 'group' : 'img'"
    :aria-label="description"
  >
    <img :src="poster || source" alt="" class="ascii-original">
    <video
      v-if="mediaType === 'video' && (!enabled || failed)"
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
        visibility: enabled && !failed && visible ? 'visible' : 'hidden',
        animationPlayState: running ? 'running' : 'paused',
      }"
    />
    <KnockoffAscii
      v-if="mediaType === 'image' && enabled && !failed"
      :reset-version="asciiReset"
      :source="source"
      :description="description"
      :columns="columns"
      :cell-size="cellSize"
      :visible="visible"
      :reduced-motion="reducedMotion"
      @error="failed = true"
    />
    <!-- stop events here so clicking the toggle doesn't also poke the image or drag the window -->
    <div
      v-if="mediaType === 'image'"
      class="ascii-mode-controls"
      role="group"
      aria-label="Photo rendering"
      @pointerdown.stop
      @pointermove.stop
      @click.stop
      @keydown.stop
    >
      <button class="raised" :class="{ pressed: !enabled }" :aria-pressed="!enabled" @click="emit('update:enabled', false)">Normal</button>
      <button class="raised" :class="{ pressed: enabled }" :aria-pressed="enabled" @click="restoreAscii">ASCII</button>
    </div>
  </div>
</template>
