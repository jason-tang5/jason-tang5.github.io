<script setup>
import { computed, ref, watch } from 'vue';
import RetroIcon from './RetroIcon.vue';
const props = defineProps({ graphic: { type: Object, required: true } });
const selected = ref(0);
const flowScroll = ref(null);
watch(() => props.graphic, () => { selected.value = 0; });
const current = computed(() => props.graphic.items[selected.value] || props.graphic.items[0]);
function selectStep(index) {
  selected.value = Math.max(0, Math.min(index, props.graphic.items.length - 1));
  const strip = flowScroll.value;
  const stage = strip?.querySelectorAll('.bg-flow-stage')[selected.value];
  if (!stage) return;
  strip.scrollTo({
    left: stage.offsetLeft - (strip.clientWidth - stage.offsetWidth) / 2,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
}
</script>

<template>
  <figure class="bg-figure" :class="`bg-figure--${graphic.template}`">
    <figcaption><strong>{{ graphic.title }}</strong><span v-if="graphic.caption">{{ graphic.caption }}</span></figcaption>
    <div class="bg-panel">
      <div v-if="graphic.template === 'flow'" ref="flowScroll" class="bg-flow-scroll" tabindex="0" role="region" :aria-label="`${graphic.title}, left-to-right flowchart; scroll horizontally for more steps`">
        <div class="bg-flow-rail" :class="{ 'bg-flow-many': graphic.items.length > 5 }" :style="{ '--stages': graphic.items.length }">
          <div v-for="(item, i) in graphic.items" :key="i" class="bg-flow-stage">
            <button class="raised bg-node" :class="{ pressed: selected === i }" :aria-pressed="selected === i" @click="selectStep(i)">{{ item.label }}</button>
            <span v-if="i < graphic.items.length - 1" class="bg-flow-wire" aria-hidden="true">→</span>
            <div v-if="item.branch" class="bg-branch"><span class="bg-branch-wire" aria-hidden="true">↓</span><p>{{ item.branch }}</p></div>
          </div>
        </div>
      </div>
      <div v-else-if="graphic.template === 'steps'" class="bg-steps">
        <template v-for="(item, i) in graphic.items" :key="i">
          <span v-if="i" class="bg-step-wire" aria-hidden="true">→</span>
          <button class="raised bg-node" :class="{ pressed: selected === i }" :aria-pressed="selected === i" @click="selected = i"><b class="bg-number">{{ i + 1 }}</b>{{ item.label }}</button>
        </template>
      </div>
      <ol v-else-if="graphic.template === 'timeline'" class="bg-timeline">
        <li v-for="(item, i) in graphic.items" :key="i"><span class="bg-pin" aria-hidden="true" /><div><small>{{ item.label }}</small><strong>{{ item.note }}</strong><p>{{ item.text }}</p></div></li>
      </ol>
      <div v-else-if="graphic.template === 'comparison'" class="bg-cards">
        <section v-for="(item, i) in graphic.items" :key="i" class="bg-card"><div class="bg-card-title"><RetroIcon name="document" small /><strong>{{ item.label }}</strong></div><p>{{ item.text }}</p><small v-if="item.note">{{ item.note }}</small></section>
      </div>
      <div v-else-if="graphic.template === 'metrics'" class="bg-cards">
        <div v-for="(item, i) in graphic.items" :key="i" class="bg-metric"><RetroIcon name="chart" /><strong>{{ item.value }}</strong><b>{{ item.label }}</b><p>{{ item.text }}</p><small v-if="item.note">{{ item.note }}</small></div>
      </div>
      <div v-else-if="graphic.template === 'bars'" class="bg-bars">
        <div v-for="(item, i) in graphic.items" :key="i"><div class="bg-bar-label"><strong>{{ item.label }}</strong><span>{{ item.value }}%</span></div><div class="inset bg-track" role="meter" :aria-label="item.label" :aria-valuenow="item.value" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${item.value}%` }" /></div><p>{{ item.text }}</p></div>
      </div>
      <div v-if="graphic.template === 'flow'" class="bg-flow-nav" role="group" aria-label="Flowchart navigation">
        <button class="raised bg-flow-prev" aria-label="Previous flowchart step" :disabled="selected === 0" @click="selectStep(selected - 1)" />
        <span>{{ selected + 1 }} / {{ graphic.items.length }}</span>
        <button class="raised bg-flow-next" aria-label="Next flowchart step" :disabled="selected === graphic.items.length - 1" @click="selectStep(selected + 1)" />
      </div>
      <div v-if="['flow', 'steps'].includes(graphic.template)" class="bg-detail" aria-live="polite"><strong>{{ current.label }}</strong><p>{{ current.text }}</p><small v-if="current.note">{{ current.note }}</small></div>
    </div>
  </figure>
</template>

<style scoped>
.bg-figure { container-type: inline-size; margin: 28px 0; font: 12px/1.5 'Pixel MS Sans Serif', Tahoma, sans-serif; color: var(--ink); }
.bg-figure figcaption { margin-bottom: 8px; }
.bg-figure figcaption strong { display: block; color: var(--ink); font-size: 13px; }
.bg-figure figcaption > span { display: block; margin-top: 3px; color: var(--muted); font: 12px/1.5 Tahoma, sans-serif; }
.bg-panel { padding: 14px; background: var(--paper); border: 2px solid; border-color: var(--edge) var(--shadow) var(--shadow) var(--edge); box-shadow: inset 1px 1px var(--shadow); }
:root[data-theme="dark"] .bg-panel { border-right-color: var(--light); border-bottom-color: var(--light); }
.bg-node { min-width: 0; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; color: var(--ink); font: inherit; overflow-wrap: anywhere; }
.bg-node svg { flex: none; width: 24px; height: 24px; }
.bg-node.pressed { background: var(--navy, #000080); color: #fff; }
.bg-node:focus-visible { outline: 1px dotted currentColor; outline-offset: -5px; }
.bg-flow-scroll { overflow-x: auto; padding: 2px 2px 8px; }
.bg-flow-scroll:focus-visible { outline: 1px dotted var(--ink); outline-offset: -1px; }
.bg-flow-rail { position: relative; display: grid; grid-template-columns: repeat(var(--stages), minmax(108px, 1fr)); gap: 22px; }
.bg-flow-nav { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 8px; }
.bg-flow-nav span { color: var(--muted); font: 11px Tahoma, sans-serif; }
.bg-flow-nav button { width: 28px; height: 24px; padding: 0; background-repeat: no-repeat; background-position: center; }
.bg-flow-prev { background-image: var(--arrow-left); }
.bg-flow-next { background-image: var(--arrow-right); }
.bg-flow-nav button:disabled { opacity: .45; }
.bg-flow-nav button:focus-visible { outline: 1px dotted var(--ink); outline-offset: -5px; }
.bg-flow-stage { position: relative; min-width: 0; }
.bg-flow-stage .bg-node { width: 100%; min-height: 64px; padding: 8px; text-align: center; }
.bg-flow-wire { position: absolute; top: 20px; right: -22px; width: 22px; text-align: center; color: var(--d-link, #000080); font: bold 18px/24px 'Courier New', monospace; }
.bg-flow-many { grid-template-columns: repeat(var(--stages), minmax(82px, 1fr)); gap: 16px; }
.bg-flow-many .bg-node { padding: 6px; font-size: 11px; }
.bg-flow-many .bg-flow-wire { right: -16px; width: 16px; }
.bg-branch { display: flex; flex-direction: column; align-items: stretch; min-width: 0; }
.bg-branch-wire { height: 26px; text-align: center; font: bold 18px/26px 'Courier New', monospace; color: var(--d-link, #000080); }
.bg-branch p { min-width: 0; margin: 0; padding: 7px; border: 1px dashed var(--d-line, #888); background: var(--d-page-alt, #fffdf2); font: 12px/1.5 Tahoma, sans-serif; overflow-wrap: anywhere; }
.bg-detail { margin-top: 14px; padding: 10px; border: 2px solid var(--d-line, #000); box-shadow: 3px 3px 0 var(--d-line, #000); background: var(--d-page-alt, #fffdf2); }
.bg-detail p, .bg-card p, .bg-metric p, .bg-bars p, .bg-timeline p { margin: 5px 0 0; font: 13px/1.5 Tahoma, sans-serif; }
.bg-detail small, .bg-card small, .bg-metric small { display: block; margin-top: 7px; color: var(--muted); font: 11px/1.5 Tahoma, sans-serif; }
.bg-steps { display: flex; align-items: center; }
.bg-steps .bg-node { flex: 1; flex-direction: column; }
.bg-number { display: grid; place-items: center; width: 24px; height: 24px; border: 1px solid currentColor; font: bold 15px 'Courier New', monospace; }
.bg-step-wire { flex: 0 0 24px; text-align: center; color: var(--muted); }
.bg-timeline { list-style: none; padding: 0 0 0 7px; margin: 0; }
.bg-timeline li { position: relative; padding: 0 0 22px 23px; border-left: 2px solid var(--d-line, #888); }
.bg-timeline li:last-child { padding-bottom: 0; border-color: transparent; }
.bg-pin { position: absolute; left: -6px; top: 5px; width: 10px; height: 10px; background: var(--navy, #000080); border: 1px solid var(--light); box-shadow: 1px 1px 0 var(--edge); }
.bg-timeline small { display: inline-block; margin-right: 10px; color: var(--muted); }
.bg-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr)); gap: 12px; }
.bg-card { min-width: 0; padding: 3px 3px 10px; background: var(--surface); border: 2px solid; border-color: var(--light) var(--edge) var(--edge) var(--light); }
.bg-card-title { display: flex; align-items: center; gap: 5px; padding: 3px 6px; background: var(--navy, #000080); color: #fff; }
.bg-card-title svg { width: 16px; height: 16px; }
.bg-card p, .bg-card small { padding: 0 7px; }
.bg-metric { min-width: 0; padding: 14px 10px; text-align: center; background: var(--d-page-alt, #fffdf2); border: 2px solid var(--d-line, #000); box-shadow: 3px 3px 0 var(--d-line, #000); overflow-wrap: anywhere; }
.bg-metric svg { width: 28px; height: 28px; }
.bg-metric > strong { display: block; margin: 6px 0; font: bold 24px 'Pixel MS Sans Serif', monospace; color: var(--d-link, #000080); }
.bg-bars { display: grid; gap: 18px; }
.bg-bar-label { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 5px; }
.bg-track { height: 20px; padding: 2px; background: var(--surface); }
.bg-track > span { display: block; height: 100%; background: repeating-linear-gradient(to right, var(--navy, #000080) 0 8px, transparent 8px 10px); }
@container (max-width: 440px) {
  .bg-steps { flex-direction: column; align-items: stretch; }
  .bg-steps .bg-node { flex-direction: row; justify-content: flex-start; }
  .bg-step-wire { transform: rotate(90deg); align-self: center; }
}
</style>
