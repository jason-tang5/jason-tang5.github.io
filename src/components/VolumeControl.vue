<script setup>
// the little volume popup from the taskbar speaker, modelled on the win98 volume
// control: a vertical slider with tick marks and a mute checkbox underneath.
// the slider is hand made instead of a styled range input so it looks the same in
// every browser, but it still works with the keyboard and screen readers
import { ref } from 'vue';
import { play } from '../sound.js';

const props = defineProps({ level: Number, enabled: Boolean });
const emit = defineEmits(['update:level', 'update:enabled']);

const slider = ref(null);
let dragging = false;

const thumbHeight = 11;

function setLevel(value) {
  emit('update:level', Math.max(0, Math.min(100, Math.round(value))));
}

// turns a pointer position into a level, the top of the groove is 100
function levelAt(clientY) {
  const rect = slider.value.getBoundingClientRect();
  const travel = rect.height - thumbHeight;
  return (1 - (clientY - rect.top - thumbHeight / 2) / travel) * 100;
}

function down(event) {
  if (event.button !== 0) return;
  dragging = true;
  slider.value.setPointerCapture(event.pointerId);
  slider.value.focus();
  setLevel(levelAt(event.clientY));
}

function move(event) {
  if (dragging) setLevel(levelAt(event.clientY));
}

// like windows, play a test sound at the new volume when you let go
function up() {
  if (!dragging) return;
  dragging = false;
  play('click');
}

function keys(event) {
  const steps = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 20, PageDown: -20 };
  let next;
  if (event.key in steps) next = props.level + steps[event.key];
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = 100;
  else return;

  event.preventDefault();
  setLevel(next);
  play('click');
}
</script>

<template>
  <div class="volume-popup raised" role="group" aria-label="Volume control">
    <span class="volume-title">Volume</span>
    <div
      ref="slider"
      class="volume-slider"
      role="slider"
      tabindex="0"
      aria-label="Volume"
      aria-orientation="vertical"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="level"
      :aria-valuetext="`${level}%`"
      :style="{ '--level': level }"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
      @keydown="keys"
    >
      <span class="volume-groove"/>
      <span class="volume-ticks"/>
      <span class="volume-thumb"/>
    </div>
    <label class="volume-mute">
      <input type="checkbox" :checked="!enabled" @change="emit('update:enabled', !$event.target.checked)">
      <span>Mute</span>
    </label>
  </div>
</template>
