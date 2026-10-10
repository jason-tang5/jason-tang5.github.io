<script setup>
// the figures in the liftlens writeup (content.mjs, figures): a clean you can scrub
// through with the joint angles worked out the way the app does it, the plate finder's
// circle check with a circle you can drag around, and three ways to get bar speed out
// of the same noisy track. the numbers follow lift-lens/backend (metrics.py,
// plate_tracking.py), drawn at 140 px a metre
import { computed, onBeforeUnmount, ref } from 'vue';
defineProps({ figure: { type: String, required: true } });

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = v => Math.hypot(v[0], v[1]);
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

// ---- angles: a side-on clean, facing right, the floor at y 280 ----
const poses = [
  { t: 0, label: 'Setup', p: { ankle: [150, 272], knee: [190, 232], hip: [135, 205], shoulder: [190, 150], elbow: [178, 200], wrist: [165, 246] } },
  { t: 0.25, label: 'Bar past the knee', p: { ankle: [150, 272], knee: [172, 224], hip: [118, 182], shoulder: [180, 120], elbow: [172, 165], wrist: [165, 206] } },
  { t: 0.5, label: 'Extension', p: { ankle: [152, 262], knee: [160, 212], hip: [148, 158], shoulder: [140, 88], elbow: [148, 132], wrist: [156, 176] } },
  { t: 0.75, label: 'Catch', p: { ankle: [150, 272], knee: [196, 232], hip: [132, 218], shoulder: [152, 148], elbow: [196, 150], wrist: [176, 140] } },
  { t: 1, label: 'Stand', p: { ankle: [150, 272], knee: [153, 212], hip: [150, 158], shoulder: [153, 86], elbow: [194, 90], wrist: [174, 80] } },
];
const jointNames = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'];
function poseAt(t) {
  const i = Math.min(poses.length - 2, Math.max(0, poses.findIndex(p => p.t > t) - 1));
  const a = poses[i], b = poses[i + 1];
  const raw = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
  const k = raw * raw * (3 - 2 * raw);
  return Object.fromEntries(jointNames.map(j => [j, lerp(a.p[j], b.p[j], k)]));
}
const progress = ref(0);
const pose = computed(() => poseAt(progress.value));
const bar = computed(() => [pose.value.wrist[0], pose.value.wrist[1] + 2]);
const head = computed(() => {
  const { shoulder, hip } = pose.value;
  const up = sub(shoulder, hip);
  const n = len(up);
  return [shoulder[0] + up[0] / n * 22 + 4, shoulder[1] + up[1] / n * 22];
});
const toe = computed(() => [pose.value.ankle[0] + 24, 279]);
const path = computed(() => Array.from({ length: 41 }, (_, i) => {
  const w = poseAt(i / 40).wrist;
  return `${w[0].toFixed(1)},${(w[1] + 2).toFixed(1)}`;
}).join(' '));
const phase = computed(() => poses.reduce((best, p) => (Math.abs(p.t - progress.value) < Math.abs(best.t - progress.value) ? p : best)).label);

// clicking a joint drops it under the 0.35 confidence floor, which blanks any angle using it
const dropped = ref(new Set());
function toggle(j) {
  const next = new Set(dropped.value);
  next.has(j) ? next.delete(j) : next.add(j);
  dropped.value = next;
}
// theta = acos(dot(A-B, C-B) / (|A-B| |C-B|)) at joint B
const angleDefs = [
  { name: 'Knee', at: 'knee', from: ['hip', 'ankle'] },
  { name: 'Hip', at: 'hip', from: ['shoulder', 'knee'] },
  { name: 'Elbow', at: 'elbow', from: ['shoulder', 'wrist'] },
];
const angles = computed(() => angleDefs.map(d => {
  const used = [d.at, ...d.from];
  if (used.some(j => dropped.value.has(j))) return { ...d, value: null, missing: used.filter(j => dropped.value.has(j)), label: [pose.value[d.at][0] + 12, pose.value[d.at][1] + 4] };
  const u = sub(pose.value[d.from[0]], pose.value[d.at]);
  const v = sub(pose.value[d.from[1]], pose.value[d.at]);
  const cos = Math.min(1, Math.max(-1, (u[0] * v[0] + u[1] * v[1]) / (len(u) * len(v))));
  // the label sits outside the angle, opposite the line halfway between the two limbs
  const mid = [u[0] / len(u) + v[0] / len(v), u[1] / len(u) + v[1] / len(v)];
  // a straight limb has no inside, so its label goes out the front, where there's room
  const across = [-v[1] / len(v), v[0] / len(v)];
  const front = across[0] >= 0 ? across : [-across[0], -across[1]];
  const out = len(mid) > 0.2 ? [-mid[0] / len(mid), -mid[1] / len(mid)] : front;
  return { ...d, value: Math.round(Math.acos(cos) * 180 / Math.PI), label: [pose.value[d.at][0] + out[0] * 20, pose.value[d.at][1] + out[1] * 20 + 4] };
}));
const bones = [['shoulder', 'elbow'], ['elbow', 'wrist'], ['shoulder', 'hip'], ['hip', 'knee'], ['knee', 'ankle']];

let frame = 0;
const playing = ref(false);
function play() {
  if (playing.value) { cancelAnimationFrame(frame); playing.value = false; return; }
  const start = performance.now() - (progress.value >= 1 ? 0 : progress.value * 2400);
  playing.value = true;
  const tick = now => {
    progress.value = Math.min(1, (now - start) / 2400);
    if (progress.value < 1) frame = requestAnimationFrame(tick);
    else playing.value = false;
  };
  frame = requestAnimationFrame(tick);
}
onBeforeUnmount(() => cancelAnimationFrame(frame));

// ---- plate: the circle check from setup_plate. the plate is 450 mm, 31.5 px here ----
const floor = 176;
const wrist = [110, 145];
const circles = [{ x: 110, y: 145, r: 31.5 }, { x: 266, y: 66, r: 26 }];
const knee = [168, 118];
const presets = {
  plate: { label: 'The plate', x: 110, y: 145, r: 31.5 },
  near: { label: 'Close miss', x: 124, y: 136, r: 34 },
  knee: { label: 'A knee', x: knee[0], y: knee[1], r: 18 },
  rack: { label: 'Racked plate', x: 266, y: 66, r: 26 },
};
const cand = ref({ ...presets.near });
const RIM = Array.from({ length: 72 }, (_, i) => i * Math.PI / 36);
const RADIAL = Array.from({ length: 7 }, (_, i) => 0.88 + i * 0.04);
// an angle has support when some sample along its short radial line sits on a real
// circle's edge and that edge runs across the line rather than along it
const ticks = computed(() => {
  const { x, y, r } = cand.value;
  return RIM.map(a => {
    const c = Math.cos(a), s = Math.sin(a);
    const hit = circles.some(C => {
      const f = RADIAL.map(k => Math.hypot(x + c * k * r - C.x, y + s * k * r - C.y) - C.r);
      const i = f.findIndex((v, j) => Math.abs(v) < 1 || (j && Math.sign(v) !== Math.sign(f[j - 1])));
      if (i < 0) return false;
      const px = x + c * RADIAL[i] * r - C.x, py = y + s * RADIAL[i] * r - C.y;
      return Math.abs(px * c + py * s) / Math.hypot(px, py) > 0.6;
    });
    return { a, hit, inner: [x + c * r * 0.88, y + s * r * 0.88], outer: [x + c * r * 1.12, y + s * r * 1.12] };
  });
});
const support = computed(() => ticks.value.filter(t => t.hit).length / ticks.value.length);
const checks = computed(() => {
  const { x, y, r } = cand.value;
  const bottom = y + r - floor;
  return [
    { label: 'Half the rim has an edge', ok: support.value >= 0.5, value: `${Math.round(support.value * 100)}%` },
    { label: 'Level with the wrists', ok: Math.abs(wrist[1] - y) <= 0.8 * r && Math.abs(wrist[0] - x) <= 3 * r },
    { label: 'Resting on the floor', ok: bottom >= -0.6 * r && bottom <= 1.2 * r },
  ];
});
const accepted = computed(() => checks.value.every(c => c.ok));
const plateSvg = ref(null);
let dragging = null;
function toSvg(event) {
  const pt = plateSvg.value.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  return pt.matrixTransform(plateSvg.value.getScreenCTM().inverse());
}
function grab(event) {
  const p = toSvg(event);
  dragging = [p.x - cand.value.x, p.y - cand.value.y];
  event.currentTarget.setPointerCapture(event.pointerId);
}
function drag(event) {
  if (!dragging) return;
  const p = toSvg(event);
  cand.value = { ...cand.value, x: Math.round(Math.min(310, Math.max(10, p.x - dragging[0]))), y: Math.round(Math.min(190, Math.max(10, p.y - dragging[1]))) };
}
function release() { dragging = null; }
function nudge(event) {
  const step = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[event.key];
  if (!step) return;
  event.preventDefault();
  cand.value = { ...cand.value, x: cand.value.x + step[0], y: cand.value.y + step[1] };
}

// ---- smooth: one clean's bar height at 60 fps with a pixel or so of noise ----
const DT = 1 / 60;
const PX = 140;
const bump = (t, mu, s) => Math.exp(-(((t - mu) / s) ** 2) / 2);
const times = Array.from({ length: 61 }, (_, i) => i * DT);
const truth = times.map(t => 1.05 * bump(t, 0.32, 0.12) + 1.75 * bump(t, 0.7, 0.065));
const seed = ref(7);
// a small seeded generator so the same noise comes back each time the figure opens
function noise(n) {
  let s = n * 9301 + 49297;
  const next = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return () => Math.sqrt(-2 * Math.log(next() || 1e-9)) * Math.cos(2 * Math.PI * next());
}
const heights = computed(() => {
  const n = noise(seed.value);
  let h = 0;
  return truth.map((v, i) => { if (i) h += (truth[i - 1] + v) / 2 * DT * PX; return h + n() * 1.2; });
});
const methods = {
  raw: { label: 'Frame to frame', note: 'Every pixel of noise becomes a spike, since it’s divided by a 60th of a second.' },
  average: { label: 'Moving average', note: 'Averaging the last 9 frames calms it down, but the peak comes out lower and late.' },
  fit: { label: 'Quadratic fit', note: 'A curve fit to the 50 ms either side of each point keeps the peak where it was, with little noise.' },
};
const method = ref('fit');
const estimate = computed(() => {
  const y = heights.value;
  const raw = y.map((v, i) => (i ? (v - y[i - 1]) / DT / PX : 0));
  if (method.value === 'raw') return raw;
  if (method.value === 'average') return raw.map((_, i) => { const w = raw.slice(Math.max(1, i - 8), i + 1); return w.length ? w.reduce((a, b) => a + b) / w.length : 0; });
  // least squares fit of a + b dt + c dt^2 over the window, solved with the normal equations
  return y.map((_, i) => {
    let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, r0 = 0, r1 = 0, r2 = 0;
    for (let j = Math.max(0, i - 3); j <= Math.min(y.length - 1, i + 3); j++) {
      const d = (j - i) * DT;
      s0 += 1; s1 += d; s2 += d * d; s3 += d ** 3; s4 += d ** 4;
      r0 += y[j]; r1 += y[j] * d; r2 += y[j] * d * d;
    }
    const m = [[s0, s1, s2], [s1, s2, s3], [s2, s3, s4]];
    const det = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
    const withCol = [[s0, r0, s2], [s1, r1, s3], [s2, r2, s4]];
    return det(withCol) / det(m) / PX;
  });
});
const W = 300, H = 130, VMIN = -1.5, VMAX = 3.5;
const sx = t => 30 + t * (W - 40);
const sy = v => 10 + (VMAX - v) / (VMAX - VMIN) * (H - 30);
const line = vs => vs.map((v, i) => `${sx(times[i]).toFixed(1)},${sy(Math.max(VMIN, Math.min(VMAX, v))).toFixed(1)}`).join(' ');
const peakOf = vs => vs.reduce((best, v, i) => (v > best.v ? { v, i } : best), { v: -Infinity, i: 0 });
const truePeak = peakOf(truth);
const estPeak = computed(() => peakOf(estimate.value));
const lag = computed(() => Math.round((estPeak.value.i - truePeak.i) * DT * 1000));
</script>

<template>
  <figure v-if="figure === 'angles'" class="ll-figure">
    <figcaption><strong>Fig. 1</strong> A clean, side on. Each angle comes from three keypoints. Click a joint to drop its confidence below 35%.</figcaption>
    <div class="ll-panel ll-angles">
      <svg class="ll-lifter" viewBox="84 60 160 228" role="group" aria-label="Lifter">
        <line class="ll-floor" x1="84" y1="280" x2="244" y2="280"/>
        <polyline class="ll-path" :points="path"/>
        <g class="ll-plate" aria-hidden="true">
          <circle :cx="bar[0]" :cy="bar[1]" r="31.5"/>
          <circle class="ll-hub" :cx="bar[0]" :cy="bar[1]" r="3"/>
        </g>
        <line class="ll-bone" :x1="pose.ankle[0]" :y1="pose.ankle[1]" :x2="toe[0]" :y2="toe[1]"/>
        <line v-for="b in bones" :key="b.join()" class="ll-bone" :class="{ off: dropped.has(b[0]) || dropped.has(b[1]) }"
          :x1="pose[b[0]][0]" :y1="pose[b[0]][1]" :x2="pose[b[1]][0]" :y2="pose[b[1]][1]"/>
        <circle class="ll-head" :cx="head[0]" :cy="head[1]" r="11"/>
        <g v-for="j in jointNames" :key="j" class="ll-joint" :class="{ off: dropped.has(j) }" role="button" tabindex="0"
          :aria-label="`${j}, ${dropped.has(j) ? 'low' : 'high'} confidence`" :aria-pressed="dropped.has(j)"
          @click="toggle(j)" @keydown.enter.space.prevent="toggle(j)">
          <circle :cx="pose[j][0]" :cy="pose[j][1]" r="9" class="ll-hit"/>
          <circle :cx="pose[j][0]" :cy="pose[j][1]" r="4.5"/>
        </g>
        <text v-for="a in angles" :key="a.name" class="ll-angle-label" :x="a.label[0]" :y="a.label[1]" text-anchor="middle">{{ a.value === null ? '—' : `${a.value}°` }}</text>
      </svg>
      <div class="ll-side">
        <p class="ll-phase"><b>{{ phase }}</b></p>
        <dl class="ll-readout" aria-live="polite">
          <template v-for="a in angles" :key="a.name">
            <dt>{{ a.name }}</dt>
            <dd :class="{ blank: a.value === null }">{{ a.value === null ? `blank, no ${a.missing.join(' or ')}` : `${a.value}°` }}</dd>
          </template>
        </dl>
        <input v-model.number="progress" class="ll-scrub" type="range" min="0" max="1" step="0.005" aria-label="Point in the lift">
        <div class="ll-buttons">
          <button class="raised ll-button" @click="play">{{ playing ? 'Pause' : 'Play' }}</button>
          <button class="raised ll-button" :disabled="!dropped.size" @click="dropped = new Set()">All joints back</button>
        </div>
      </div>
    </div>
  </figure>

  <figure v-else-if="figure === 'plate'" class="ll-figure">
    <figcaption><strong>Fig. 2</strong> Finding the plate at setup. Drag the dashed circle: green ticks are rim angles with a strong edge across them.</figcaption>
    <div class="ll-panel">
      <svg ref="plateSvg" class="ll-scene" viewBox="0 0 320 200" @pointermove="drag" @pointerup="release" @pointercancel="release">
        <rect class="ll-ground" x="0" :y="floor + 2" width="320" :height="200 - floor - 2"/>
        <g class="ll-rack" aria-hidden="true"><rect x="290" y="30" width="8" height="148"/><rect x="232" y="90" width="66" height="5"/></g>
        <g aria-hidden="true">
          <circle v-for="(c, i) in circles" :key="i" class="ll-real" :cx="c.x" :cy="c.y" :r="c.r"/>
          <circle v-for="(c, i) in circles" :key="`h${i}`" class="ll-hub" :cx="c.x" :cy="c.y" r="3"/>
          <polyline class="ll-bone thin" :points="`138,${floor} ${knee[0]},${knee[1]} 120,96 150,52`"/>
          <polyline class="ll-bone thin" :points="`150,52 ${wrist[0] + 8},100 ${wrist[0]},${wrist[1]}`"/>
          <circle v-for="(p, i) in [[138, floor], knee, [120, 96], [150, 52], wrist]" :key="`k${i}`" class="ll-key" :cx="p[0]" :cy="p[1]" r="3"/>
          <text class="ll-tag" :x="knee[0] + 8" :y="knee[1] - 4">knee</text>
          <text class="ll-tag" :x="wrist[0] - 30" :y="wrist[1] - 36">wrists</text>
          <text class="ll-tag" x="142" :y="floor - 4">ankle</text>
        </g>
        <g aria-hidden="true">
          <line v-for="(t, i) in ticks" :key="i" class="ll-tick" :class="{ hit: t.hit }" :x1="t.inner[0]" :y1="t.inner[1]" :x2="t.outer[0]" :y2="t.outer[1]"/>
        </g>
        <circle class="ll-cand" :class="{ ok: accepted }" :cx="cand.x" :cy="cand.y" :r="cand.r" tabindex="0" role="slider"
          aria-label="Candidate circle, arrow keys move it" :aria-valuetext="`${Math.round(support * 100)}% rim support`"
          @pointerdown="grab" @keydown="nudge"/>
      </svg>
      <div class="ll-controls">
        <label class="ll-radius">Radius <input v-model.number="cand.r" type="range" min="12" max="48" step="0.5"></label>
        <span class="ll-toggle" role="group" aria-label="Try a circle">
          <button v-for="(p, id) in presets" :key="id" class="raised ll-button" @click="cand = { ...p }">{{ p.label }}</button>
        </span>
      </div>
      <ul class="ll-checks" aria-live="polite">
        <li v-for="c in checks" :key="c.label" :class="{ ok: c.ok }"><b>{{ c.ok ? '✓' : '✗' }}</b> {{ c.label }}<template v-if="c.value"> ({{ c.value }})</template></li>
        <li class="ll-verdict" :class="{ ok: accepted }">{{ accepted ? 'Taken as the plate' : 'Rejected' }}</li>
      </ul>
    </div>
  </figure>

  <figure v-else-if="figure === 'smooth'" class="ll-figure">
    <figcaption><strong>Fig. 3</strong> Bar speed through one clean, three ways, from the same noisy 60 fps track. The dashed line is the true speed.</figcaption>
    <div class="ll-panel">
      <svg class="ll-chart" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`${methods[method].label}: peak ${estPeak.v.toFixed(2)} m/s`">
        <line v-for="v in [-1, 0, 1, 2, 3]" :key="v" class="ll-grid" :class="{ zero: v === 0 }" :x1="sx(0)" :x2="sx(1)" :y1="sy(v)" :y2="sy(v)"/>
        <text v-for="v in [-1, 0, 1, 2, 3]" :key="`l${v}`" class="ll-axis" :x="sx(0) - 5" :y="sy(v) + 3" text-anchor="end">{{ v }}</text>
        <text v-for="t in [0, 0.5, 1]" :key="`t${t}`" class="ll-axis" :x="sx(t)" :y="H - 6" text-anchor="middle">{{ t }} s</text>
        <text class="ll-axis" x="4" y="12">m/s</text>
        <polyline class="ll-truth" :points="line(truth)"/>
        <polyline class="ll-est" :points="line(estimate)"/>
        <circle class="ll-peak" :cx="sx(times[estPeak.i])" :cy="sy(Math.min(VMAX, estPeak.v))" r="3.5"/>
      </svg>
      <p class="ll-note" aria-live="polite">
        <b>Peak {{ estPeak.v.toFixed(2) }} m/s</b>, true {{ truePeak.v.toFixed(2) }} m/s,
        {{ lag === 0 ? 'right on time' : `${Math.abs(lag)} ms ${lag > 0 ? 'late' : 'early'}` }}. {{ methods[method].note }}
      </p>
      <div class="ll-buttons">
        <span class="ll-toggle" role="group" aria-label="Method">
          <button v-for="(m, id) in methods" :key="id" class="raised ll-button" :class="{ pressed: method === id }" :aria-pressed="method === id" @click="method = id">{{ m.label }}</button>
        </span>
        <button class="raised ll-button" @click="seed++">New noise</button>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.ll-figure { margin: 18px 0 22px; font-family: 'Pixel MS Sans Serif', Tahoma, sans-serif; container-type: inline-size; }
.ll-figure figcaption { margin-bottom: 8px; font-size: 12px; color: var(--muted); }
.ll-figure figcaption strong { color: var(--ink); margin-right: 4px; }
/* sunken like the other figures, grey bottom right edge so the corner shows on white */
.ll-panel { --sunk-edge: var(--shadow); padding: 12px; background: var(--paper); border: 2px solid; border-color: var(--edge) var(--sunk-edge) var(--sunk-edge) var(--edge); box-shadow: inset 1px 1px var(--shadow); }
:root[data-theme="dark"] .ll-panel { --sunk-edge: var(--light); }
.ll-button { padding: 3px 10px; font: 12px 'Pixel MS Sans Serif', Tahoma, sans-serif; color: var(--ink); }
.ll-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
.ll-toggle { display: inline-flex; flex-wrap: wrap; gap: 0; }
.ll-note { min-height: 2.8em; margin: 10px 0 8px; font-size: 13px; line-height: 1.4; }

/* the lifter, in the app's dark dashboard colours */
.ll-bone { stroke: var(--ink); stroke-width: 4; stroke-linecap: round; fill: none; }
.ll-bone.off { stroke-dasharray: 2 5; opacity: .45; }
.ll-bone.thin { stroke-width: 3; opacity: .55; }
.ll-head { fill: var(--paper); stroke: var(--ink); stroke-width: 3; }
.ll-floor { stroke: var(--muted); stroke-width: 2; }
.ll-path { fill: none; stroke: #1baf7a; stroke-width: 2; stroke-dasharray: 3 3; }
.ll-plate circle { fill: rgba(0, 0, 128, .07); stroke: var(--navy, #000080); stroke-width: 3; }
:root[data-theme="dark"] .ll-plate circle { fill: rgba(140, 160, 255, .1); stroke: #8ca0ff; }
.ll-plate .ll-hub, .ll-hub { fill: var(--ink); stroke: none; }
.ll-joint { cursor: var(--classic-pointer, pointer); outline: none; }
.ll-joint circle { fill: #e8a33d; stroke: var(--ink); stroke-width: 1.5; }
.ll-joint .ll-hit { fill: transparent; stroke: none; }
.ll-joint.off circle:not(.ll-hit) { fill: var(--paper); stroke-dasharray: 2 2; }
.ll-joint:focus-visible .ll-hit { stroke: var(--ink); stroke-dasharray: 2 2; stroke-width: 1; }
.ll-angle-label { font: bold 11px 'Courier New', monospace; fill: var(--ink); paint-order: stroke; stroke: var(--paper); stroke-width: 3px; pointer-events: none; }

.ll-angles { display: grid; grid-template-columns: minmax(0, 250px) minmax(0, 1fr); gap: 12px 18px; align-items: center; }
.ll-lifter { display: block; width: 100%; }
.ll-phase { margin: 0 0 6px; font-size: 13px; }
.ll-readout { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; margin: 0 0 10px; font-size: 13px; }
.ll-readout dt { color: var(--muted); }
.ll-readout dd { margin: 0; font: bold 13px 'Courier New', monospace; }
.ll-readout dd.blank { font: 12px 'Pixel MS Sans Serif', Tahoma, sans-serif; color: #c0392b; }
.ll-scrub { width: 100%; margin: 0 0 8px; }
@container (max-width: 420px) { .ll-angles { grid-template-columns: minmax(0, 1fr); } .ll-lifter { max-width: 240px; margin: 0 auto; } }

/* fig 2 */
.ll-scene { display: block; width: 100%; max-width: 480px; margin: 0 auto; touch-action: none; }
.ll-ground { fill: var(--d-page-alt, #fffdf2); stroke: var(--muted); stroke-width: 1; }
.ll-rack rect { fill: var(--muted); opacity: .5; }
.ll-real { fill: rgba(0, 0, 0, .08); stroke: var(--ink); stroke-width: 3; }
:root[data-theme="dark"] .ll-real { fill: rgba(255, 255, 255, .08); }
.ll-key { fill: #e8a33d; stroke: var(--ink); stroke-width: 1; }
.ll-tag { font: 8px 'Courier New', monospace; fill: var(--muted); }
.ll-tick { stroke: var(--muted); stroke-width: 1.5; opacity: .45; }
.ll-tick.hit { stroke: #1baf7a; stroke-width: 2.5; opacity: 1; }
.ll-cand { fill: rgba(232, 163, 61, .12); stroke: #c0392b; stroke-width: 1.5; stroke-dasharray: 4 3; cursor: grab; outline: none; }
.ll-cand.ok { stroke: #1baf7a; }
.ll-cand:focus-visible { stroke-width: 2.5; }
.ll-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-top: 10px; font-size: 12px; }
.ll-radius { display: inline-flex; align-items: center; gap: 6px; }
.ll-checks { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 10px 0 0; padding: 0; list-style: none; font-size: 12px; }
.ll-checks li { color: #c0392b; }
.ll-checks li.ok { color: var(--ink); }
.ll-checks li.ok b { color: #1baf7a; }
.ll-verdict { padding: 0 6px; font-weight: bold; background: #c0392b; color: #fff !important; }
.ll-verdict.ok { background: #1baf7a; }

/* fig 3 */
.ll-chart { display: block; width: 100%; max-width: 520px; margin: 0 auto; }
.ll-grid { stroke: var(--d-line, #ccc); stroke-width: 1; opacity: .5; }
.ll-grid.zero { opacity: 1; }
.ll-axis { font: 8px 'Courier New', monospace; fill: var(--muted); }
.ll-truth { fill: none; stroke: var(--muted); stroke-width: 1.5; stroke-dasharray: 4 3; }
.ll-est { fill: none; stroke: var(--navy, #000080); stroke-width: 2; stroke-linejoin: round; }
:root[data-theme="dark"] .ll-est { stroke: #8ca0ff; }
.ll-peak { fill: #e8a33d; stroke: var(--ink); stroke-width: 1; }
</style>
