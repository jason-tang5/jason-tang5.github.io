<script setup>
// a single draggable, resizable window. the geometry math lives in
// window-state.mjs, this file just wires it up to pointer and keyboard events.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import RetroIcon from './RetroIcon.vue';
import { bounds, clampBounds, resizeBounds } from '../window-state.mjs';

const props = defineProps({
  win: Object,
  active: Boolean,
  compact: Boolean,
  area: Object,
  visible: Boolean,
});
const emit = defineEmits(['focus', 'close', 'minimize', 'maximize']);

const root = ref(null);
const menu = ref(false);
const menuButton = ref(null);
// set while moving or resizing with the keyboard through the window menu
const keyboard = ref(null);
// set while a mouse drag is in progress
let gesture = null;

const edges = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const style = computed(() => {
  const full = props.compact || props.win.maximized;
  return {
    left: full ? '0px' : `${props.win.x}px`,
    top: full ? '0px' : `${props.win.y}px`,
    width: full ? '100%' : `${props.win.width}px`,
    height: full ? '100%' : `${props.win.height}px`,
    zIndex: props.win.z,
  };
});

function focus() {
  emit('focus', props.win.id);
}

// starts a drag. no edge means we're moving the whole window by the title bar
function start(event, edge = '') {
  if (event.button !== 0 || props.compact || props.win.maximized) return;
  if (event.target.closest('button')) return;

  focus();
  menu.value = false;
  gesture = {
    x: event.clientX,
    y: event.clientY,
    start: { ...bounds(props.win), minWidth: props.win.minWidth, minHeight: props.win.minHeight },
    edge,
    target: event.currentTarget,
    pointer: event.pointerId,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function move(event) {
  if (!gesture) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  const next = gesture.edge
    ? resizeBounds(gesture.start, gesture.edge, dx, dy, props.area)
    : clampBounds({ ...gesture.start, x: gesture.start.x + dx, y: gesture.start.y + dy }, props.area);
  Object.assign(props.win, next);
}

function end() {
  if (gesture?.target.hasPointerCapture(gesture.pointer)) {
    gesture.target.releasePointerCapture(gesture.pointer);
  }
  gesture = null;
}

// arrow keys, home and end move through the window menu
function menuKey(event) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();

  const items = [...root.value.querySelectorAll('.system-menu button:not(:disabled)')];
  const i = items.indexOf(document.activeElement);
  let next;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = items.length - 1;
  else next = (i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
  items[next]?.focus();
}

async function openMenu() {
  menu.value = !menu.value;
  if (menu.value) {
    await nextTick();
    root.value.querySelector('.system-menu button:not(:disabled)')?.focus();
  }
}

function closeMenuAnd(action) {
  menu.value = false;
  emit(action, props.win.id);
}

// the old windows trick: pick move or resize from the menu, then use the arrow keys
function keyboardStart(kind) {
  menu.value = false;
  keyboard.value = { kind, start: bounds(props.win) };
  root.value.focus();
}

function key(event) {
  if (event.key === 'Escape' && menu.value) {
    menu.value = false;
    menuButton.value.focus();
    event.stopPropagation();
  }

  if (!keyboard.value) return;

  // enter keeps the new position, escape puts it back
  if (event.key === 'Enter' || event.key === 'Escape') {
    if (event.key === 'Escape') Object.assign(props.win, keyboard.value.start);
    keyboard.value = null;
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (!event.key.startsWith('Arrow')) return;
  event.preventDefault();
  event.stopPropagation();

  // shift for fine 1px steps
  const step = event.shiftKey ? 1 : 10;
  const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
  const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;

  const next = keyboard.value.kind === 'Move'
    ? clampBounds({ ...props.win, x: props.win.x + dx, y: props.win.y + dy }, props.area)
    : resizeBounds(props.win, 'se', dx, dy, props.area);
  Object.assign(props.win, next);
}

function onTitleDoubleClick(event) {
  if (event.target.closest('button') || props.compact || props.win.fixedSize) return;
  emit('maximize', props.win.id);
}

function outside(event) {
  const inMenu = event.target.closest(`[data-window="${props.win.id}"] .system-menu`);
  if (!inMenu && !menuButton.value?.contains(event.target)) menu.value = false;
}

watch(() => props.active, active => {
  if (!active) {
    menu.value = false;
    keyboard.value = null;
  }
});

// minimizing mid drag would leave the pointer captured otherwise
watch(() => props.visible, visible => {
  if (!visible) end();
});

document.addEventListener('pointerdown', outside);

onBeforeUnmount(() => {
  end();
  document.removeEventListener('pointerdown', outside);
});
</script>

<template>
  <section
    v-show="visible"
    ref="root"
    :data-window="win.id"
    :aria-label="win.label"
    role="region"
    tabindex="-1"
    class="window window-style"
    :class="{ active, compact, maximized: win.maximized }"
    :style="style"
    @pointerdown="focus"
    @focusin="focus"
    @keydown="key"
  >
    <header
      class="top-bar"
      @pointerdown="start($event)"
      @pointermove="move"
      @pointerup="end"
      @pointercancel="end"
      @dblclick="onTitleDoubleClick"
    >
      <button
        ref="menuButton"
        class="system-button"
        :aria-label="`${win.label} window menu`"
        aria-haspopup="menu"
        :aria-expanded="menu"
        @click="openMenu"
      >
        <RetroIcon :name="win.icon" small/>
      </button>
      <span class="window-name">{{ win.label }}</span>
      <div class="triple-button">
        <button class="control" :aria-label="`Minimize ${win.label}`" @click="emit('minimize', win.id)">
          <span class="min-symbol"/>
        </button>
        <button
          class="control"
          :aria-label="`${win.maximized ? 'Restore' : 'Maximize'} ${win.label}`"
          :disabled="compact || win.fixedSize"
          @click="emit('maximize', win.id)"
        >
          <span :class="win.maximized ? 'restore-symbol' : 'max-symbol'"/>
        </button>
        <button class="control close-button" data-sound="none" :aria-label="`Close ${win.label}`" @click="emit('close', win.id)">×</button>
      </div>
    </header>

    <div v-if="menu" class="system-menu raised" role="menu" @keydown="menuKey">
      <button role="menuitem" :disabled="compact || win.maximized" @click="keyboardStart('Move')">Move</button>
      <button role="menuitem" :disabled="compact || win.maximized || win.fixedSize" @click="keyboardStart('Resize')">Resize</button>
      <button role="menuitem" @click="closeMenuAnd('minimize')">Minimize</button>
      <button role="menuitem" :disabled="compact || win.fixedSize" @click="closeMenuAnd('maximize')">
        {{ win.maximized ? 'Restore' : 'Maximize' }}
      </button>
      <hr>
      <button role="menuitem" data-sound="none" @click="emit('close', win.id)">Close</button>
    </div>

    <div v-if="keyboard" class="keyboard-hint" role="status">
      {{ keyboard.kind }}: arrow keys · Enter to finish · Escape to cancel
    </div>

    <div class="window-body"><slot/></div>

    <template v-if="!compact && !win.maximized && !win.fixedSize">
      <div
        v-for="edge in edges"
        :key="edge"
        :class="['resize-edge', edge]"
        aria-hidden="true"
        @pointerdown="start($event, edge)"
        @pointermove="move"
        @pointerup="end"
        @pointercancel="end"
      />
    </template>
  </section>
</template>
