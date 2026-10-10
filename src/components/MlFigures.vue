<script setup>
// the figures in the mini ml framework writeup (content.mjs, figures): the backward
// pass through x·x + x one gradient at a time, the tiled matmul kernel loading its
// tiles phase by phase, and where pytorch and keras put adam's epsilon. the rules
// follow ml-framework/crates/minitorch (autograd.rs, cuda.rs, optim.rs)
import { computed, ref } from 'vue';
defineProps({ figure: { type: String, required: true } });

const fmt = v => (Number.isInteger(v) ? String(v) : v.toFixed(1));

// ---- graph: y = x·x + x ----
const x = ref(3);
const overwrite = ref(false);
const step = ref(0);
// each step lights some edges and may add a gradient contribution to x
const steps = computed(() => {
  const v = x.value;
  return [
    { note: `Forward. x = ${fmt(v)}.`, show: ['x'] },
    { note: `a = x · x = ${fmt(v * v)}. Both of mul’s inputs are x, so x gets two edges into it.`, show: ['x', 'a'], edges: ['x-a1', 'x-a2'] },
    { note: `y = a + x = ${fmt(v * v + v)}. That’s a third edge out of x.`, show: ['x', 'a', 'y'], edges: ['a-y', 'x-y'] },
    { note: 'Backward. Seed dy/dy = 1 and walk the graph in reverse.', show: ['x', 'a', 'y'], grads: { y: 1 } },
    { note: 'add passes its gradient straight through: 1 to a.', back: ['a-y'], grads: { y: 1, a: 1 } },
    { note: 'and 1 to x.', back: ['x-y'], grads: { y: 1, a: 1 }, give: 1 },
    { note: `mul sends gradient × the other input to each input: 1 × ${fmt(v)} = ${fmt(v)} down the first edge…`, back: ['x-a1'], grads: { y: 1, a: 1 }, give: v },
    { note: `…and ${fmt(v)} down the second.`, back: ['x-a2'], grads: { y: 1, a: 1 }, give: v },
  ];
});
const at = computed(() => steps.value[step.value]);
// what x's gradient holds so far: every contribution added, or only the last one
const contributions = computed(() => steps.value.slice(0, step.value + 1).filter(s => s.give !== undefined).map(s => s.give));
const xGrad = computed(() => {
  const c = contributions.value;
  if (!c.length) return null;
  return overwrite.value ? c[c.length - 1] : c.reduce((a, b) => a + b);
});
const done = computed(() => step.value === steps.value.length - 1);
const right = computed(() => 2 * x.value + 1);
const shown = id => step.value >= 3 || at.value.show.includes(id);
const lit = id => step.value >= 3 || at.value.edges?.includes(id);
const back = id => at.value.back?.includes(id);
const nodes = {
  x: { x: 50, y: 92, label: 'x', value: () => x.value },
  a: { x: 170, y: 36, label: 'mul', sub: 'a = x · x', value: () => x.value * x.value },
  y: { x: 290, y: 92, label: 'add', sub: 'y = a + x', value: () => x.value * x.value + x.value },
};
const edges = [
  { id: 'x-a1', d: 'M70 82 Q100 30 146 32' },
  { id: 'x-a2', d: 'M72 92 Q120 70 148 44' },
  { id: 'x-y', d: 'M74 98 H266' },
  { id: 'a-y', d: 'M194 40 Q250 44 272 78' },
];
function setX(v) { x.value = v; }

// ---- tiles: C = A · B, 8 × 8, in 2 × 2 tiles (the real kernel uses 16 × 16) ----
const N = 8, T = 2, phases = N / T;
const out = ref([1, 2]);
const phase = ref(0);
const transposed = ref(false);
const cell = 11;
const grids = { a: { x: 10, label: 'A' }, b: { x: 122, label: 'B' }, c: { x: 234, label: 'C' } };
// which tile of each matrix is in shared memory this phase. with the transpose flag
// the kernel wants Bᵀ's tile (k, j), which is B's tile (j, k) read across instead of down
const aTile = computed(() => [out.value[0], phase.value]);
const bTile = computed(() => (transposed.value ? [out.value[1], phase.value] : [phase.value, out.value[1]]));
// every phase loads two tiles. without tiles, each of the block's T² threads reads a
// whole row of A and column of B on its own
const loads = computed(() => ({ sofar: 2 * T * T * (phase.value + 1), tiled: 2 * T * T * phases, naive: 2 * N * T * T }));
function pick(i, j) { out.value = [i, j]; phase.value = 0; }
const inTile = (r, c, t) => Math.floor(r / T) === t[0] && Math.floor(c / T) === t[1];
const seenTile = (r, c, matrix) => {
  for (let k = 0; k < phase.value; k++) {
    const t = matrix === 'a' ? [out.value[0], k] : transposed.value ? [out.value[1], k] : [k, out.value[1]];
    if (inTile(r, c, t)) return true;
  }
  return false;
};
const cellClass = (m, r, c) => {
  if (m === 'c') return { now: inTile(r, c, out.value), pickable: true };
  const t = m === 'a' ? aTile.value : bTile.value;
  return { now: inTile(r, c, t), seen: seenTile(r, c, m) };
};
const range = Array.from({ length: N }, (_, i) => i);

// ---- epsilon: one adam step with a steady gradient g, as in the test fixtures ----
const LR = 0.01, B2 = 0.999, EPS = 1e-8;
const gExp = ref(-6);
const tChoices = [1, 10, 100, 1000, 10000];
const tIndex = ref(0);
const t = computed(() => tChoices[tIndex.value]);
const g = computed(() => 10 ** gExp.value);
// with a steady gradient, the bias corrected m and sqrt(v) are both g. pytorch adds
// eps after the correction, keras before, which is eps / sqrt(1 - b2^t) after it
const keraEps = computed(() => EPS / Math.sqrt(1 - B2 ** t.value));
const torchStep = computed(() => LR * g.value / (g.value + EPS));
const kerasStep = computed(() => LR * g.value / (g.value + keraEps.value));
const gap = computed(() => Math.abs(torchStep.value - kerasStep.value) / torchStep.value);
const sci = v => {
  const e = Math.floor(Math.log10(v));
  const m = v / 10 ** e;
  return `${m.toFixed(m < 9.95 ? 2 : 1)}e${e}`;
};
const pct = v => (v < 0.0001 ? `${(v * 1e6).toFixed(1)} ppm` : v < 0.01 ? `${(v * 100).toFixed(3)}%` : `${(v * 100).toFixed(1)}%`);
</script>

<template>
  <figure v-if="figure === 'graph'" class="mm-figure">
    <figcaption><strong>Fig. 1</strong> The backward pass through y = x·x + x. Three gradients reach x, and they have to be added up.</figcaption>
    <div class="mm-panel">
      <svg class="mm-graph" viewBox="0 0 340 128" aria-hidden="true">
        <defs><marker id="mm-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L6 3L0 6z"/></marker></defs>
        <g class="mm-edges">
          <path v-for="e in edges" :key="e.id" :d="e.d" :class="{ lit: lit(e.id), back: back(e.id) }" marker-end="url(#mm-arrow)"/>
        </g>
        <g v-for="(n, id) in nodes" :key="id" class="mm-node" :class="{ on: shown(id), hot: id === 'x' && at.give !== undefined }">
          <rect :x="n.x - 30" :y="n.y - 15" width="60" height="30"/>
          <text :x="n.x" :y="n.sub ? n.y - 2 : n.y + 4">{{ n.label }}</text>
          <text v-if="n.sub" class="mm-sub" :x="n.x" :y="n.y + 9">{{ n.sub }}</text>
          <text v-if="shown(id)" class="mm-val" :x="n.x" :y="n.y + 27">= {{ fmt(n.value()) }}</text>
          <text v-if="id === 'x' ? xGrad !== null : at.grads?.[id] !== undefined" class="mm-grad" :x="n.x" :y="n.y - 21">
            grad {{ id === 'x' ? fmt(xGrad) : at.grads[id] }}
          </text>
        </g>
      </svg>
      <p class="mm-sum" aria-live="polite">
        <span>x.grad =</span>
        <template v-if="contributions.length">
          <code>{{ overwrite ? fmt(contributions[contributions.length - 1]) : contributions.map(c => (c < 0 ? `(${fmt(c)})` : fmt(c))).join(' + ') }}</code>
          <b v-if="contributions.length > 1 && !overwrite">= {{ fmt(xGrad) }}</b>
        </template>
        <code v-else>—</code>
        <span v-if="done" class="mm-check" :class="{ bad: xGrad !== right }">{{ xGrad === right ? `✓ matches 2x + 1 = ${fmt(right)}` : `✗ should be 2x + 1 = ${fmt(right)}` }}</span>
      </p>
      <p class="mm-note" aria-live="polite"><b>{{ step + 1 }}/{{ steps.length }}</b> {{ at.note }}</p>
      <div class="mm-buttons">
        <button class="raised mm-button" :disabled="step === 0" @click="step--">Back</button>
        <button class="raised mm-button" :disabled="done" @click="step++">Step</button>
        <span class="mm-toggle" role="group" aria-label="x">
          <button v-for="v in [-2, 1, 3]" :key="v" class="raised mm-button" :class="{ pressed: x === v }" :aria-pressed="x === v" @click="setX(v)">x = {{ v }}</button>
        </span>
        <label class="mm-check-box"><input v-model="overwrite" type="checkbox"> Overwrite instead of add</label>
      </div>
    </div>
  </figure>

  <figure v-else-if="figure === 'tiles'" class="mm-figure">
    <figcaption><strong>Fig. 2</strong> The tiled matmul. Each block of C loads one tile of A and one of B into shared memory per phase. Click a block of C.</figcaption>
    <div class="mm-panel">
      <div class="mm-scroll">
        <svg class="mm-tiles" viewBox="0 0 334 112" role="group" aria-label="Matrices">
          <g v-for="(gd, m) in grids" :key="m">
            <text class="mm-label" :x="gd.x + N * cell / 2" y="10">{{ m === 'b' && transposed ? 'B, read as Bᵀ' : gd.label }}</text>
            <template v-for="r in range" :key="r">
              <rect v-for="c in range" :key="c" class="mm-cell" :class="cellClass(m, r, c)"
                :x="gd.x + c * cell" :y="16 + r * cell" :width="cell - 1" :height="cell - 1"
                @click="m === 'c' && pick(Math.floor(r / T), Math.floor(c / T))"/>
            </template>
          </g>
          <text class="mm-op" x="106" y="64">·</text>
          <text class="mm-op" x="218" y="64">=</text>
        </svg>
      </div>
      <p class="mm-note" aria-live="polite">
        <b>Phase {{ phase + 1 }}/{{ phases }}</b>
        Block ({{ out[0] }}, {{ out[1] }}) of C adds A’s tile ({{ aTile[0] }}, {{ aTile[1] }}) times
        {{ transposed ? `B’s tile (${bTile[0]}, ${bTile[1]}), read across` : `B’s tile (${bTile[0]}, ${bTile[1]})` }}.
        Reads from GPU memory: <b>{{ loads.sofar }}</b> so far, {{ loads.tiled }} for the whole block, against {{ loads.naive }} without tiles. With the real 16 × 16 tiles it’s 16 times fewer.
      </p>
      <div class="mm-buttons">
        <button class="raised mm-button" :disabled="phase === 0" @click="phase--">Back</button>
        <button class="raised mm-button" :disabled="phase === phases - 1" @click="phase++">Next phase</button>
        <label class="mm-check-box"><input v-model="transposed" type="checkbox"> Transpose flag on B (backward pass)</label>
      </div>
    </div>
  </figure>

  <figure v-else-if="figure === 'epsilon'" class="mm-figure">
    <figcaption><strong>Fig. 3</strong> One Adam step on a weight with a steady gradient, the way PyTorch and Keras each add epsilon (1e-8).</figcaption>
    <div class="mm-panel">
      <div class="mm-sliders">
        <label>Gradient <code>{{ sci(g) }}</code><input v-model.number="gExp" type="range" min="-10" max="-2" step="0.5" aria-label="Gradient size"></label>
        <label>Step t <code>{{ t }}</code><input v-model.number="tIndex" type="range" min="0" :max="tChoices.length - 1" step="1" aria-label="Step number"></label>
      </div>
      <div class="mm-bars">
        <span>PyTorch</span><span class="mm-bar"><i :style="{ width: `${torchStep / LR * 100}%` }"/></span><code>{{ sci(torchStep) }}</code>
        <span>Keras</span><span class="mm-bar keras"><i :style="{ width: `${kerasStep / LR * 100}%` }"/></span><code>{{ sci(kerasStep) }}</code>
      </div>
      <p class="mm-note" aria-live="polite">
        Keras’s epsilon works out to <code>{{ sci(keraEps) }}</code> here. The steps differ by <b>{{ pct(gap) }}</b>,
        {{ gap > 1e-4 ? 'outside' : 'inside' }} the 1e-4 tolerance the PyTorch tests use.
        {{ gap > 1e-4 ? 'Tiny gradients early in training are where they part ways.' : 'Once the gradient dwarfs epsilon, they agree.' }}
      </p>
    </div>
  </figure>
</template>

<style scoped>
.mm-figure { margin: 18px 0 22px; font-family: 'Pixel MS Sans Serif', Tahoma, sans-serif; container-type: inline-size; }
.mm-figure figcaption { margin-bottom: 8px; font-size: 12px; color: var(--muted); }
.mm-figure figcaption strong { color: var(--ink); margin-right: 4px; }
.mm-panel { --sunk-edge: var(--shadow); padding: 12px; background: var(--paper); border: 2px solid; border-color: var(--edge) var(--sunk-edge) var(--sunk-edge) var(--edge); box-shadow: inset 1px 1px var(--shadow); }
:root[data-theme="dark"] .mm-panel { --sunk-edge: var(--light); }
.mm-button { padding: 3px 10px; font: 12px 'Pixel MS Sans Serif', Tahoma, sans-serif; color: var(--ink); }
.mm-buttons { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.mm-toggle { display: inline-flex; gap: 0; }
.mm-check-box { display: inline-flex; align-items: center; gap: 4px; margin-left: 4px; font-size: 12px; }
.mm-note { min-height: 2.8em; margin: 10px 0 8px; font-size: 13px; line-height: 1.45; }
.mm-note > b:first-child { margin-right: 6px; font: bold 11px 'Courier New', monospace; color: var(--muted); }
.mm-note code, .mm-sum code, .mm-sliders code, .mm-bars code { font: bold 12px 'Courier New', monospace; color: var(--d-link, #000080); }

/* fig 1 */
.mm-graph { display: block; width: 100%; max-width: 480px; margin: 0 auto; }
.mm-edges path { fill: none; stroke: var(--d-line, #888); stroke-width: 2; stroke-dasharray: 4 3; }
.mm-edges path.lit { stroke: var(--ink); stroke-dasharray: none; }
.mm-edges path.back { stroke: #1baf7a; stroke-width: 3; stroke-dasharray: none; }
#mm-arrow path { fill: var(--d-line, #888); }
.mm-node rect { fill: var(--d-page-alt, #fffdf2); stroke: var(--muted); stroke-width: 2; }
.mm-node.on rect { stroke: var(--ink); }
.mm-node.hot rect { fill: var(--navy, #000080); }
.mm-node.hot > text:not(.mm-val):not(.mm-grad) { fill: #fff; }
.mm-node text { fill: var(--ink); font: bold 10px 'Pixel MS Sans Serif', Tahoma, sans-serif; text-anchor: middle; }
.mm-node .mm-sub { font: 8px 'Courier New', monospace; }
.mm-node .mm-val { font: bold 9px 'Courier New', monospace; fill: var(--muted); }
.mm-node .mm-grad { font: bold 9px 'Courier New', monospace; fill: #1baf7a; }
.mm-sum { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; margin: 10px 0 0; font-size: 13px; }
.mm-check { font-weight: bold; color: #1baf7a; }
.mm-check.bad { color: #c0392b; }

/* fig 2: scrolls sideways on a phone rather than shrinking to dots */
.mm-scroll { overflow-x: auto; }
.mm-tiles { display: block; width: 100%; min-width: 320px; max-width: 560px; margin: 0 auto; }
.mm-label { font: bold 9px 'Pixel MS Sans Serif', Tahoma, sans-serif; fill: var(--ink); text-anchor: middle; }
.mm-op { font: bold 18px 'Courier New', monospace; fill: var(--muted); text-anchor: middle; }
.mm-cell { fill: var(--d-page-alt, #fffdf2); stroke: var(--d-line, #bbb); stroke-width: .5; }
.mm-cell.seen { fill: #b9e6d4; }
.mm-cell.now { fill: #1baf7a; }
.mm-cell.pickable { cursor: var(--classic-pointer, pointer); }
.mm-cell.pickable.now { fill: var(--navy, #000080); }
:root[data-theme="dark"] .mm-cell.seen { fill: #245c48; }

/* fig 3 */
.mm-sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px 16px; margin-bottom: 10px; font-size: 12px; }
.mm-sliders label { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; align-items: center; }
.mm-sliders input { grid-column: 1 / -1; width: 100%; }
.mm-bars { display: grid; grid-template-columns: auto minmax(0, 1fr) 72px; gap: 6px 10px; align-items: center; font-size: 12px; }
.mm-bar { height: 14px; background: var(--d-page-alt, #fffdf2); border: 1px solid var(--d-line, #999); }
.mm-bar i { display: block; height: 100%; background: var(--navy, #000080); }
.mm-bar.keras i { background: #e8a33d; }
:root[data-theme="dark"] .mm-bar i { background: #8ca0ff; }
:root[data-theme="dark"] .mm-bar.keras i { background: #e8a33d; }
</style>
