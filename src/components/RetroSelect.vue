<script setup>
// a win98 style dropdown standing in for a native <select>, whose popup list is drawn
// by the os and never matches the desktop. the list is teleported to the body so a
// window's edges can't clip it, and it opens upward when there's no room below.
import { nextTick, onBeforeUnmount, ref, useId } from 'vue';

const props = defineProps({
  options: { type: Array, required: true },
  modelValue: { type: Number, default: 0 },
  label: String,
  disabled: Boolean,
});
const emit = defineEmits(['update:modelValue']);

const id = useId();
const button = ref(null);
const list = ref(null);
const open = ref(false);
const active = ref(0);
const place = ref({});

const GUTTER = 12; // matches --gutter on .retro-select-list
let follow = 0;
let above = false;
let font = '';

async function show() {
  if (props.disabled || open.value) return;
  active.value = props.modelValue;
  const rect = button.value.getBoundingClientRect();
  const below = innerHeight - rect.bottom;
  // picks a side once, so the list doesn't flip over while its window is dragged
  above = below < 160 && rect.top > below;
  font = getComputedStyle(button.value).font;
  open.value = true;
  track();
  addEventListener('resize', hide);
  addEventListener('scroll', scrolled, true);
  await nextTick();
  reveal();
}
// keeps the list stuck to the field every frame, so it rides along when the window
// it sits in is dragged, resized or snapped
function track() {
  const rect = button.value.getBoundingClientRect();
  // a minimised or hidden window takes the list away with it
  if (!rect.width) return hide();
  // the list reaches a gutter's width further left than the field, so the row you're on
  // has room to slide out past its edge
  place.value = { left: `${rect.left - GUTTER}px`, width: `${rect.width + GUTTER}px`, font };
  if (above) place.value.bottom = `${innerHeight - rect.top}px`;
  else place.value.top = `${rect.bottom}px`;
  follow = requestAnimationFrame(track);
}
function hide() {
  open.value = false;
  cancelAnimationFrame(follow);
  removeEventListener('resize', hide);
  removeEventListener('scroll', scrolled, true);
}
// the page scrolling away from the field closes the list, but not the list's own scrolling
function scrolled(event) {
  if (event.target !== list.value) hide();
}
function pick(index) {
  hide();
  if (index !== props.modelValue) emit('update:modelValue', index);
}
function reveal() {
  list.value?.children[active.value]?.scrollIntoView({ block: 'nearest' });
}
function move(to) {
  active.value = Math.max(0, Math.min(props.options.length - 1, to));
  nextTick(reveal);
}
function key(event) {
  const last = props.options.length - 1;
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); show(); }
    return;
  }
  const steps = {
    ArrowDown: active.value + 1, ArrowUp: active.value - 1,
    PageDown: active.value + 8, PageUp: active.value - 8, Home: 0, End: last,
  };
  if (event.key in steps) { event.preventDefault(); move(steps[event.key]); }
  else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(active.value); }
  else if (event.key === 'Escape') { event.preventDefault(); hide(); }
  else if (event.key === 'Tab') hide();
}
onBeforeUnmount(hide);
</script>

<template>
  <button ref="button" type="button" class="retro-select" role="combobox" aria-haspopup="listbox"
    :aria-label="label" :aria-expanded="open" :aria-controls="`${id}-list`"
    :aria-activedescendant="open ? `${id}-${active}` : undefined" :disabled="disabled"
    @click="open ? hide() : show()" @keydown="key" @blur="hide">
    <span class="retro-select-value">{{ options[modelValue] }}</span>
    <span class="retro-select-arrow raised" aria-hidden="true">
      <svg viewBox="0 0 7 4" shape-rendering="crispEdges"><path d="M0 0h7v1H0zM1 1h5v1H1zM2 2h3v1H2zM3 3h1v1H3z"/></svg>
    </span>
  </button>
  <Teleport to="body">
    <!-- pointerdown is cancelled so the button keeps focus (and doesn't blur shut) -->
    <ul v-if="open" :id="`${id}-list`" ref="list" class="retro-select-list" role="listbox" :aria-label="label"
      :style="place" @pointerdown.prevent>
      <li v-for="(option, i) in options" :id="`${id}-${i}`" :key="i" role="option"
        :class="{ active: i === active }" :aria-selected="i === modelValue"
        @pointermove="active = i" @click="pick(i)">{{ option }}</li>
    </ul>
  </Teleport>
</template>
