<script setup>
// the desktop shell: icons, windows, taskbar and start menu.
// started from don chia's App.vue, AppGrid and windows navbar (mit, see
// licenses/vuejs-os-template-MIT.txt), then moved to vue 3 and extended a lot.
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import AsciiImage from './components/AsciiImage.vue';
import DesktopWindow from './components/DesktopWindow.vue';
import AppContent from './components/AppContent.vue';
import RetroIcon from './components/RetroIcon.vue';
import VolumeControl from './components/VolumeControl.vue';
import { registry, shortcuts, menuApps, canonicalApp } from './registry.js';
import {
  clampBounds,
  createWindow,
  isSavedBounds,
  nextVisible,
  placeBeside,
  restoreWindow,
  presetBounds,
  toggleMaximize,
} from './window-state.mjs';
import { read, save, remove } from './storage.js';
import { play, setSoundEnabled, setSoundLevel, soundEnabled, soundLevel } from './sound.js';
import { isUnlocked } from './unlocks.js';

const defaultWallpaper = '#008080';
const wallpaperColors = ['#008080', '#18334f', '#576575', '#3c6255', '#62465e'];

const windows = reactive([]);
const active = ref(null);
const selected = ref(null);
const startOpen = ref(false);
const calendar = ref(false);
const announcement = ref('');

// template refs
const desktop = ref(null);
const start = ref(null);
const startMenu = ref(null);

// the work area is the screen minus the 40px taskbar
const area = reactive({ width: innerWidth, height: innerHeight - 40 });
// on small screens windows go full screen and only the active one shows
const compact = ref(innerWidth <= 700);
const clock = ref(new Date());
const tip = ref(read('tip') !== 'dismissed');

const savedColor = read('wallpaper', defaultWallpaper);
const wallpaper = ref(wallpaperColors.includes(savedColor) ? savedColor : defaultWallpaper);
const wallpaperUrl = new URL('../assets/vaporwave-sunset.mp4', import.meta.url).href;
const wallpaperPoster = new URL('../assets/vaporwave-sunset-poster.png', import.meta.url).href;

// where every window was last time, by app id, so a refresh puts them back
let savedLayout = loadLayout();
let saveLayoutTimer;

let z = 1;
let resizeObserver;
let timer;
// whatever had focus before a window opened, so we can give it back when the last one closes
let keyboardReturn = null;

const timeLabel = computed(() => clock.value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
const dateLabel = computed(() => clock.value.toLocaleDateString([], {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}));

function get(id) {
  return windows.find(w => w.id === id);
}

function visible(win) {
  return !win.minimized && (!compact.value || active.value === win.id);
}

function focus(id) {
  if (active.value === id) return;
  const win = get(id);
  if (!win) return;
  win.z = ++z;
  active.value = id;
}

async function focusRegion(id) {
  await nextTick();
  document.querySelector(`[data-window="${id}"]`)?.focus({ preventScroll: true });
}

// locked apps (just mail) stay closed until they're earned, see unlocks.js
const canOpen = id => Boolean(registry[id]) && (!registry[id].locked || isUnlocked(id));

// contact asks for this after a win, or from its go to mail button
function unlock(id) {
  open(id);
}

// keep the url in sync so links like #app=projects open the right window.
// locked apps never go in the url, so there's no link that skips the game
function route(id) {
  if (registry[id]?.locked) {
    history.replaceState(null, '', location.pathname + location.search);
    return;
  }
  if (location.hash !== `#app=${id}`) history.replaceState(null, '', `#app=${id}`);
}

function hashApp() {
  return canonicalApp(new URLSearchParams(location.hash.slice(1)).get('app'));
}

function open(id, updateUrl = true) {
  id = canonicalApp(id);
  if (!canOpen(id)) return;

  keyboardReturn = document.activeElement;
  let win = get(id);
  if (!win) {
    // put it back where it was last time, or its set spot if it has one, or else
    // open off to the side of whatever is already on screen instead of right on top of it
    const saved = savedLayout[id];
    const preset = !compact.value && presetBounds(id, area);
    const anchor = active.value && get(active.value);
    const beside = anchor && visible(anchor) && !anchor.maximized && !compact.value;

    if (isSavedBounds(saved)) win = restoreWindow(registry[id], saved, windows.length, area);
    else if (preset) win = restoreWindow(registry[id], preset, windows.length, area);
    else if (beside) win = placeBeside(registry[id], anchor, windows.length, area);
    else win = createWindow(registry[id], windows.length, area);

    win = reactive(win);
    play('open');
    windows.push(win);
  }

  win.minimized = false;
  win.z = ++z;
  active.value = id;
  startOpen.value = false;
  calendar.value = false;

  if (updateUrl) route(id);
  focusRegion(id);
}

function focusNext() {
  active.value = nextVisible(windows);
  if (active.value) {
    route(active.value);
    focusRegion(active.value);
    return;
  }

  // nothing left open, so clear the hash and put focus somewhere sensible
  history.replaceState(null, '', location.pathname + location.search);
  nextTick(() => {
    if (keyboardReturn?.isConnected && !keyboardReturn.closest('[data-window]')) keyboardReturn.focus();
    else start.value?.focus();
  });
}

function close(id) {
  const index = windows.findIndex(w => w.id === id);
  if (index < 0) return;
  windows.splice(index, 1);
  play('close');
  if (active.value === id) focusNext();
}

function minimize(id) {
  get(id).minimized = true;
  if (active.value === id) focusNext();
}

function maximize(id) {
  if (compact.value || get(id).fixedSize) return;
  toggleMaximize(get(id), area);
  focusRegion(id);
}

// clicking the active window's taskbar button minimizes it, like real windows
function taskClick(id) {
  if (active.value === id && !get(id).minimized) minimize(id);
  else open(id);
}

// ---- remembering window positions ----

function loadLayout() {
  try {
    const layout = JSON.parse(read('windows', '{}'));
    return layout && typeof layout === 'object' ? layout : {};
  } catch {
    return {};
  }
}

// small delay so dragging a window doesn't write to storage on every pixel
function saveLayout() {
  clearTimeout(saveLayoutTimer);
  saveLayoutTimer = setTimeout(() => {
    for (const w of windows) {
      savedLayout[w.id] = { x: w.x, y: w.y, width: w.width, height: w.height, maximized: w.maximized };
    }
    save('windows', JSON.stringify(savedLayout));
  }, 300);
}

// on phones every window is full screen, so there's nothing worth remembering.
// closed windows keep their last saved spot for next time
watch(
  () => windows.map(w => [w.x, w.y, w.width, w.height, w.maximized]),
  () => {
    if (!compact.value) saveLayout();
  },
  { deep: true },
);

// ---- desktop icon dragging ----
// icon positions only last for this page load, refreshing puts them back on the grid

const iconOffsets = reactive({});
const dragging = ref(null);
let iconDrag = null;
let dragEndedAt = 0;

// grid pitch matches .desktop-grid in theme.css: 86px columns + 12px gap, 83px rows + 5px gap
const cellX = 98;
const cellY = 88;

function iconDown(event, id) {
  if (compact.value || event.button !== 0 || event.pointerType === 'touch') return;
  const el = event.currentTarget;
  iconDrag = {
    id,
    el,
    pointer: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    start: iconOffsets[id] || { x: 0, y: 0 },
    rect: el.getBoundingClientRect(),
    bounds: desktop.value.getBoundingClientRect(),
  };
  el.setPointerCapture(event.pointerId);
}

function iconMove(event) {
  if (!iconDrag || event.pointerId !== iconDrag.pointer) return;
  if (!(event.buttons & 1)) return iconUp();

  const { rect, bounds, start } = iconDrag;
  let dx = event.clientX - iconDrag.x;
  let dy = event.clientY - iconDrag.y;

  // small dead zone so a sloppy click doesn't count as a drag
  if (!dragging.value) {
    if (Math.hypot(dx, dy) < 5) return;
    dragging.value = iconDrag.id;
    selected.value = iconDrag.id;
  }

  // don't let icons leave the desktop
  dx = Math.max(bounds.left - rect.left, Math.min(bounds.right - rect.right, dx));
  dy = Math.max(bounds.top - rect.top, Math.min(bounds.bottom - rect.bottom, dy));
  iconOffsets[iconDrag.id] = { x: start.x + dx, y: start.y + dy };
}

// drops the icon into the nearest free grid cell
function snapIcon({ id, el }) {
  const grid = el.parentElement.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const desktopRight = desktop.value.getBoundingClientRect().right;
  const cols = Math.max(1, Math.floor((desktopRight - grid.left - el.offsetWidth) / cellX) + 1);
  const rows = Math.max(1, Math.floor((grid.height - el.offsetHeight) / cellY) + 1);

  const cellOf = r => [Math.round((r.left - grid.left) / cellX), Math.round((r.top - grid.top) / cellY)];
  const taken = new Set(
    [...el.parentElement.children]
      .filter(other => other !== el)
      .map(other => cellOf(other.getBoundingClientRect()).join()),
  );
  const [wantCol, wantRow] = cellOf(rect);

  let best = null;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (taken.has(`${col},${row}`)) continue;
      const distance = (col - wantCol) ** 2 + (row - wantRow) ** 2;
      if (!best || distance < best.distance) best = { col, row, distance };
    }
  }
  if (!best) return;

  const offset = iconOffsets[id];
  iconOffsets[id] = {
    x: offset.x + grid.left + best.col * cellX - rect.left,
    y: offset.y + grid.top + best.row * cellY - rect.top,
  };
}

function iconUp() {
  if (dragging.value) {
    snapIcon(iconDrag);
    dragEndedAt = performance.now();
  }
  iconDrag = null;
  dragging.value = null;
}

function iconStyle(id) {
  const offset = iconOffsets[id];
  if (!offset || compact.value) return null;
  return { transform: `translate(${offset.x}px, ${offset.y}px)` };
}

function selectShortcut(event, id) {
  // the click that fires right after a drag shouldn't count
  if (performance.now() - dragEndedAt < 150) return;
  selected.value = id;
  // touch and pen open on a single tap, detail 0 means it came from the keyboard
  if (event.pointerType === 'touch' || event.pointerType === 'pen' || event.detail === 0) open(id);
}

// ---- settings ----

function setWallpaper(color) {
  wallpaper.value = color;
  const saved = save('wallpaper', color);
  announcement.value = saved ? 'Wallpaper saved.' : 'Wallpaper changed. Browser storage is unavailable.';
}

function dismissTip() {
  tip.value = false;
  save('tip', 'dismissed');
}

function reset() {
  windows.splice(0);
  selected.value = null;
  wallpaper.value = defaultWallpaper;
  remove('wallpaper');
  savedLayout = {};
  remove('windows');
  startOpen.value = false;
  open('about');
  announcement.value = 'Desktop reset. Saved notes were kept.';
}

// ---- start menu ----

async function toggleStart() {
  startOpen.value = !startOpen.value;
  calendar.value = false;
  if (startOpen.value) {
    await nextTick();
    startMenu.value.querySelector('[role="menuitem"]')?.focus();
  }
}

function dismissStart(returnFocus = true) {
  startOpen.value = false;
  if (returnFocus) start.value?.focus();
}

// arrow keys, home and end move through the menu, wrapping around at the ends
function menuKeys(event) {
  const items = [...startMenu.value.querySelectorAll('[role="menuitem"]')];
  const i = items.indexOf(document.activeElement);

  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    let next;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else next = (i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  if (event.key === 'Tab') dismissStart(false);
}

// clicking anywhere else closes the start menu, calendar and volume popup
function outside(event) {
  const inMenu = startMenu.value?.contains(event.target) || start.value?.contains(event.target);
  if (startOpen.value && !inMenu) dismissStart(false);
  if (!event.target.closest('.tray')) {
    calendar.value = false;
    volumeOpen.value = false;
  }
}

function escape(event) {
  if (event.key !== 'Escape') return;
  if (startOpen.value) {
    dismissStart();
    event.preventDefault();
  }
  calendar.value = false;
  volumeOpen.value = false;
}

function toggleCalendar() {
  calendar.value = !calendar.value;
  volumeOpen.value = false;
  startOpen.value = false;
}

// ---- sound effects ----

const sound = ref(soundEnabled());
const level = ref(soundLevel());
const volumeOpen = ref(false);
const audible = computed(() => sound.value && level.value > 0);

function toggleVolume() {
  volumeOpen.value = !volumeOpen.value;
  calendar.value = false;
  startOpen.value = false;
}

function setSound(on) {
  sound.value = on;
  setSoundEnabled(on);
}

function setLevel(value) {
  level.value = value;
  setSoundLevel(value);
}

// a few listeners for the whole page instead of wiring up every button.
// things marked data-sound="none" play their own sound (or none at all)
function soundTarget(el) {
  const target = el.closest('button, a, select');
  if (!target || target.disabled || target.closest('[data-sound="none"]')) return null;
  return target;
}

// clicks on the empty desktop, not on icons, windows or the welcome note
function isBackground(el) {
  return el.closest('.desktop') && !el.closest('[data-window], .desktop-grid, .first-tip');
}

// buttons click like a real switch: a press on the way down, a lighter tick on the way up
function pressSound(event) {
  if (event.button !== 0) return;
  if (soundTarget(event.target)) play('press');
  else if (isBackground(event.target)) play('tap');
}

function clickSound(event) {
  if (!soundTarget(event.target)) return;
  // detail 0 means the keyboard pressed it, so there was no pointerdown press
  play(event.detail === 0 ? 'click' : 'release');
}

// the hover tick is only for technologies and tools, it climbs in pitch as you run across a list
function hoverSound(event) {
  if (event.pointerType === 'touch') return;
  const el = event.target.closest('.tech-tag');
  if (el && !el.contains(event.relatedTarget)) play('hover');
}

// ---- layout ----

function measure() {
  const rect = desktop.value.getBoundingClientRect();
  area.width = rect.width;
  area.height = rect.height;
  compact.value = rect.width <= 700;
  // leave window sizes alone in compact mode so they come back when the screen gets wide again
  if (!compact.value) windows.forEach(w => Object.assign(w, clampBounds(w, area)));
}

function hashOpen() {
  const id = hashApp();
  if (canOpen(id)) open(id, false);
}

function showDesktop() {
  windows.forEach(w => { w.minimized = true; });
  active.value = null;
  startOpen.value = false;
  nextTick(() => document.querySelector('.desktop-shortcut')?.focus());
}

onMounted(() => {
  measure();
  resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(desktop.value);

  // open whatever the url asks for, or the about window on a fresh visit
  const id = hashApp();
  open(canOpen(id) ? id : 'about', false);

  timer = setInterval(() => { clock.value = new Date(); }, 60000);
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', escape);
  document.addEventListener('pointerdown', pressSound, true);
  document.addEventListener('click', clickSound, true);
  document.addEventListener('pointerover', hoverSound);
  window.addEventListener('hashchange', hashOpen);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  clearInterval(timer);
  clearTimeout(saveLayoutTimer);
  document.removeEventListener('pointerdown', outside);
  document.removeEventListener('keydown', escape);
  document.removeEventListener('pointerdown', pressSound, true);
  document.removeEventListener('click', clickSound, true);
  document.removeEventListener('pointerover', hoverSound);
  window.removeEventListener('hashchange', hashOpen);
});
</script>

<template>
  <div class="desktop-shell" :style="{ '--desktop': wallpaper }">
    <main ref="desktop" class="desktop" aria-label="Jason Tang’s desktop" @pointerdown.self="selected = null">
      <AsciiImage
        class="desktop-wallpaper"
        :columns="350"
        :source="wallpaperUrl"
        :poster="wallpaperPoster"
        media-type="video"
        description="Animated vaporwave sunset from the selected Tenor GIF, rendered as colored ASCII"
        :enabled="true"
        :visible="true"
        @pointerdown="selected = null"
      />

      <nav class="desktop-grid" aria-label="Desktop shortcuts">
        <button
          v-for="app in shortcuts"
          :key="app.id"
          :class="['desktop-shortcut', { selected: selected === app.id, dragging: dragging === app.id }]"
          :style="iconStyle(app.id)"
          @pointerdown="iconDown($event, app.id)"
          @pointermove="iconMove"
          @pointerup="iconUp"
          @pointercancel="iconUp"
          @lostpointercapture="iconUp"
          @click="selectShortcut($event, app.id)"
          @dblclick="open(app.id)"
        >
          <RetroIcon :name="app.icon"/>
          <span>{{ app.label }}</span>
        </button>
      </nav>

      <div class="desktop-signature" aria-hidden="true"><span>JASON TANG</span></div>

      <aside v-if="tip" class="first-tip raised" aria-label="Welcome">
        <div class="tip-heading">
          <strong>Welcome!</strong>
          <button aria-label="Dismiss welcome message" @click="dismissTip">×</button>
        </div>
        <p>feel free to click around</p>
      </aside>

      <DesktopWindow
        v-for="win in windows"
        :key="win.id"
        :win="win"
        :active="active === win.id"
        :visible="visible(win)"
        :compact="compact"
        :area="area"
        @focus="focus"
        @close="close"
        @minimize="minimize"
        @maximize="maximize"
      >
        <AppContent
          :win="win"
          :active="active === win.id && visible(win)"
          :wallpaper="wallpaper"
          :visible="visible(win)"
          @open="open"
          @unlock="unlock"
          @wallpaper="setWallpaper"
        />
      </DesktopWindow>
    </main>

    <nav class="taskbar" aria-label="Taskbar">
      <button
        ref="start"
        class="start-button raised"
        :class="{ pressed: startOpen }"
        :aria-expanded="startOpen"
        aria-haspopup="menu"
        aria-controls="start-menu"
        @click="toggleStart"
      >
        <RetroIcon name="start" small/>
        <strong>Start</strong>
      </button>

      <div class="taskbar-divider"/>

      <button class="show-desktop raised" aria-label="Show desktop" title="Show desktop" @click="showDesktop">
        <RetroIcon name="computer" small/>
      </button>

      <div class="task-items" aria-label="Running applications">
        <button
          v-for="win in windows"
          :key="win.id"
          class="task-button raised"
          :class="{ pressed: active === win.id && !win.minimized }"
          :aria-label="`${win.label}${win.minimized ? ' (minimized)' : ''}`"
          :aria-pressed="active === win.id && !win.minimized"
          @click="taskClick(win.id)"
        >
          <RetroIcon :name="win.icon" small/>
          <span>{{ win.label }}</span>
        </button>
      </div>

      <div class="tray">
        <button
          class="tray-sound"
          :aria-expanded="volumeOpen"
          :aria-label="audible ? 'Volume' : 'Volume (muted)'"
          title="Volume"
          @click="toggleVolume"
        >
          <RetroIcon :name="audible ? 'sound' : 'mute'" small/>
        </button>
        <VolumeControl
          v-if="volumeOpen"
          :level="level"
          :enabled="sound"
          @update:level="setLevel"
          @update:enabled="setSound"
        />
        <button
          class="clock inset"
          :title="dateLabel"
          :aria-label="`${timeLabel}, ${dateLabel}`"
          :aria-expanded="calendar"
          @click="toggleCalendar"
        >
          <time :datetime="clock.toISOString()">{{ timeLabel }}</time>
        </button>
        <div v-if="calendar" class="calendar raised">
          <strong>{{ dateLabel }}</strong>
          <p>Your local time</p>
        </div>
      </div>
    </nav>

    <div
      v-if="startOpen"
      ref="startMenu"
      id="start-menu"
      class="start-menu raised"
      role="menu"
      aria-label="Start"
      @keydown="menuKeys"
    >
      <div class="identity-strip" aria-hidden="true">
        <span>Jason<span class="identity-light">Tang</span><small>PORTFOLIO</small></span>
      </div>
      <div class="start-entries">
        <button v-for="app in menuApps" :key="app.id" role="menuitem" @click="open(app.id)">
          <RetroIcon :name="app.icon"/>
          <span>{{ app.label }}</span>
        </button>
        <hr>
        <button role="menuitem" @click="open('settings')">
          <RetroIcon name="settings"/>
          <span>Desktop Settings</span>
        </button>
        <button role="menuitem" @click="reset">
          <RetroIcon name="computer"/>
          <span>Reset Desktop</span>
        </button>
      </div>
    </div>

    <div class="sr-only" role="status">{{ announcement }}</div>
  </div>
</template>
