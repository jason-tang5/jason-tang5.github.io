<script setup>
// a rainbow of segmented pixel bars with a reflection, filling the empty space under
// the cd player on phones. the music plays inside spotify's embed, which a page
// isn't allowed to listen to, so the bars can't follow the real audio. instead they
// bounce to a made up beat while it plays (stronger in the bass bars on the left)
// and settle down when it's paused
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({ playing: Boolean });

const canvas = ref(null);
const barCount = 20;
// purple through red, yellow and green to blue, like a classic equalizer
const hues = Array.from({ length: barCount }, (_, i) => (280 + i * 320 / (barCount - 1)) % 360);
const levels = new Float32Array(barCount); // 0 to 1, what's drawn
const peaks = new Float32Array(barCount); // the lighter block that falls slowly
let beat = 0;
let lastBeat = 0;
let frame = 0;
let observer;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function targetFor(i, now) {
  if (!props.playing) return 0.08 + 0.03 * Math.sin(now / 900 + i * 0.6);
  if (reducedMotion.matches) return 0.35 + 0.25 * Math.sin(i * 0.9);
  // a few slow waves at different speeds, plus a kick on every beat that hits the
  // bass hardest and fades toward the treble
  const t = now / 1000;
  const wave = 0.35
    + 0.18 * Math.sin(t * 2.1 + i * 0.7)
    + 0.12 * Math.sin(t * 3.7 - i * 1.3)
    + 0.08 * Math.sin(t * 6.3 + i * 2.1);
  const kick = beat * (1 - i / barCount) * 0.45;
  return Math.max(0.05, Math.min(1, wave + kick + (Math.random() - 0.5) * 0.12));
}

function draw(now) {
  const el = canvas.value;
  if (!el) return;
  const ctx = el.getContext('2d');
  const scale = window.devicePixelRatio || 1;
  const width = el.width;
  const height = el.height;

  // a beat roughly every 470ms (about 128bpm) that decays between hits
  if (now - lastBeat > 470) {
    lastBeat = now;
    beat = 1;
  }
  beat *= 0.9;

  ctx.fillStyle = '#0b0b10';
  ctx.fillRect(0, 0, width, height);

  const gap = Math.max(2, Math.round(3 * scale));
  const barWidth = Math.floor((width - gap * (barCount + 1)) / barCount);
  const left = Math.floor((width - (barWidth * barCount + gap * (barCount - 1))) / 2);
  // the bars sit on a line about two thirds down, the reflection goes below it
  const floor = Math.round(height * 0.68);
  const block = Math.max(3, Math.round(barWidth * 0.42));
  const rows = Math.floor((floor - gap * 2) / (block + gap));

  for (let i = 0; i < barCount; i++) {
    const target = targetFor(i, now);
    // rise quickly, fall a little slower, like a real meter
    levels[i] += (target - levels[i]) * (target > levels[i] ? 0.45 : 0.18);
    const lit = Math.max(1, Math.round(levels[i] * rows));
    peaks[i] = Math.max(peaks[i] - 0.012, lit / rows);
    const peakRow = Math.min(rows - 1, Math.round(peaks[i] * rows) - 1);

    const x = left + i * (barWidth + gap);
    const hue = hues[i];
    for (let row = 0; row < rows; row++) {
      const on = row < lit;
      const peak = row === peakRow && !on;
      if (!on && !peak) continue;
      const y = floor - (row + 1) * (block + gap) + gap;
      const light = peak ? 72 : 52 + row / rows * 8;
      ctx.fillStyle = `hsl(${hue} 85% ${light}%)`;
      ctx.fillRect(x, y, barWidth, block);
      // a small highlight on the top left of each block for the pixel look
      ctx.fillStyle = `hsl(${hue} 90% ${light + 18}%)`;
      ctx.fillRect(x, y, Math.max(1, Math.round(barWidth * 0.3)), Math.max(1, Math.round(scale)));

      // the reflection: the same block mirrored under the line, fading out
      const mirrorY = floor + (floor - y - block) + gap;
      const fade = 0.28 * (1 - (mirrorY - floor) / (height - floor));
      if (fade > 0.02) {
        ctx.globalAlpha = fade;
        ctx.fillStyle = `hsl(${hue} 85% ${light}%)`;
        ctx.fillRect(x, mirrorY, barWidth, block);
        ctx.globalAlpha = 1;
      }
    }
  }
}

function loop(now) {
  draw(now);
  frame = requestAnimationFrame(loop);
}

function start() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(loop);
}

function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
}

function resize() {
  const el = canvas.value;
  if (!el) return;
  const scale = window.devicePixelRatio || 1;
  el.width = Math.round(el.clientWidth * scale);
  el.height = Math.round(el.clientHeight * scale);
  draw(performance.now());
}

function visibility() {
  if (document.hidden) stop();
  else start();
}

watch(() => props.playing, () => draw(performance.now()));

onMounted(() => {
  observer = new ResizeObserver(resize);
  observer.observe(canvas.value);
  document.addEventListener('visibilitychange', visibility);
  resize();
  start();
});

onBeforeUnmount(() => {
  stop();
  observer?.disconnect();
  document.removeEventListener('visibilitychange', visibility);
});
</script>

<template>
  <div class="cd-visualizer inset" aria-hidden="true">
    <canvas ref="canvas"/>
  </div>
</template>
