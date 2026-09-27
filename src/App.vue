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
import Calendar from './components/Calendar.vue';
import MenuGlyph from './components/MenuGlyph.vue';
import ClippyArt from './components/ClippyArt.vue';
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
import { trackOnce } from './analytics.js';
import { theme, setTheme } from './theme.js';
import { defaultWallpaper, wallpaperFilter, wallpapers } from './wallpaper.js';
import { useResting } from './resting.js';
import { autoHide, edgeNotices, setAutoHide, taskbarEdge } from './taskbar.js';
import { addNote } from './stickies.js';


const windows = reactive([]);
const active = ref(null);
const selected = ref(null);
const startOpen = ref(false);
const calendar = ref(false);
const announcement = ref('');
// a yellow note in the top right, like the welcome tip but on top of the windows.
// { title, message }. any window can ask for one with a 'site-notice' event
const notice = ref(null);
let noticeTimer;

// template refs
const desktop = ref(null);
const start = ref(null);
const startMenu = ref(null);

// the work area is the screen minus the 46px taskbar
const area = reactive({ width: innerWidth, height: innerHeight - 46 });
// on small screens windows go full screen and only the active one shows
const compact = ref(innerWidth <= 700);
// on a touch phone the desktop fades to just the wallpaper when the phone sits still
const { resting } = useResting(() => compact.value && matchMedia('(pointer: coarse)').matches);
const clock = ref(new Date());
const tip = ref(read('tip') !== 'dismissed');

const savedColor = read('wallpaper', defaultWallpaper);
const wallpaper = ref(wallpapers.some(w => w.color === savedColor) ? savedColor : defaultWallpaper);
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

// contact asks for this after a win, or from its go to mail button, or with a
// message when it gives mail away after three losses in a row
function unlock(id, message) {
  open(id);
  if (message) showNotice('Mail unlocked', message);
}

function showNotice(title, message) {
  notice.value = { title, message };
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.value = null; }, 8000);
}

// mail uses this to say whether a message went through
function noticeEvent(event) {
  showNotice(event.detail.title, event.detail.message);
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

function open(id, updateUrl = true, sound = true) {
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
    if (sound) play('open');
    // windows put back after a refresh were opened on an earlier visit, so skip them
    if (!restoring) trackOnce('open', id);
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

// the taskbar text is a size bigger until the buttons overflow and it has to scroll
const taskItems = ref(null);
const taskbarCrowded = ref(false);
function measureTaskbar() {
  const el = taskItems.value;
  if (!el) return;
  taskbarCrowded.value = ['left', 'right'].includes(edge.value)
    ? el.scrollHeight > el.clientHeight + 1
    : el.scrollWidth > el.clientWidth + 1;
}

// ---- taskbar edge and auto-hide (settings in taskbar.js) ----

// phones always keep the taskbar along the bottom
const edge = computed(() => (compact.value ? 'bottom' : taskbarEdge.value));
watch(taskbarEdge, value => {
  showNotice(...edgeNotices[value]);
  nextTick(measureTaskbar);
});

// a hidden taskbar slides out when the mouse reaches its edge of the screen, and
// tucks away again once the mouse leaves it with no menu open. on a touch screen a
// tap near the edge brings it out and a tap anywhere else puts it away
const taskbarEl = ref(null);
const taskbarShown = ref(false);
let hideTimer;
const menuOpen = () => startOpen.value || volumeOpen.value || calendar.value || !!taskMenu.value;

function nearEdge(x, y, reach) {
  return {
    bottom: y >= innerHeight - reach,
    top: y <= reach,
    left: x <= reach,
    right: x >= innerWidth - reach,
  }[edge.value];
}

function overTaskbar(x, y) {
  const r = taskbarEl.value?.getBoundingClientRect();
  return r && x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8;
}

function showTaskbar() {
  clearTimeout(hideTimer);
  taskbarShown.value = true;
}

function hideTaskbarSoon(delay = 400) {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (!menuOpen()) taskbarShown.value = false;
  }, delay);
}

// the tab's arrow points where the taskbar will move: out of its edge while hidden,
// back into it while shown. the arrow is drawn pointing up
const tabArrow = computed(() => {
  const out = { bottom: 0, top: 180, left: 90, right: 270 }[edge.value];
  return taskbarShown.value ? out + 180 : out;
});

// clicking the tab to put the taskbar away keeps it away until the mouse has left the
// edge, or hovering there would just bring it straight back
let tabDismissed = false;
function toggleTaskbar() {
  if (!taskbarShown.value) return showTaskbar();
  clearTimeout(hideTimer);
  taskbarShown.value = false;
  tabDismissed = true;
}

function taskbarPointerMove(event) {
  if (!autoHide.value || event.pointerType === 'touch') return;
  const near = nearEdge(event.clientX, event.clientY, 6) || (taskbarShown.value && overTaskbar(event.clientX, event.clientY));
  if (tabDismissed) {
    if (!nearEdge(event.clientX, event.clientY, 60)) tabDismissed = false;
    return;
  }
  if (near) showTaskbar();
  else if (taskbarShown.value) hideTaskbarSoon();
}

function taskbarPointerDown(event) {
  if (!autoHide.value || event.pointerType === 'mouse') return;
  if (event.target.closest('.taskbar, .start-menu, .task-menu')) return;
  if (nearEdge(event.clientX, event.clientY, 28)) showTaskbar();
  else if (taskbarShown.value) hideTaskbarSoon(0);
}

// on a phone the taskbar also swipes: up from the bottom of the screen to bring it
// out, down on the taskbar to put it away. only mostly-vertical swipes count, and
// swipes up have to start near the bottom so scrolling a window doesn't catch it
let swipe = null;

function swipeStart(event) {
  swipe = null;
  if (!autoHide.value || !compact.value || event.touches.length !== 1) return;
  const touch = event.touches[0];
  const onTaskbar = taskbarShown.value && event.target.closest('.taskbar');
  const fromBottom = !taskbarShown.value && touch.clientY >= innerHeight - 44;
  if (onTaskbar || fromBottom) swipe = { x: touch.clientX, y: touch.clientY, up: !!fromBottom };
}

function swipeMove(event) {
  if (!swipe) return;
  const touch = event.touches[0];
  const dy = touch.clientY - swipe.y;
  if (Math.abs(touch.clientX - swipe.x) > Math.abs(dy)) return;
  if (swipe.up && dy < -24) {
    showTaskbar();
    swipe = null;
  } else if (!swipe.up && dy > 24) {
    clearTimeout(hideTimer);
    taskbarShown.value = false;
    swipe = null;
  }
}

function swipeEnd() {
  swipe = null;
}

// the first time on a phone, clippy peeks up from under the bottom edge to say the
// taskbar is down there. once someone has brought it out, he never shows up again
const swipeHint = ref(false);
let hintTimer;
function offerSwipeHint() {
  if (read('taskbar-swiped', '') === 'yes') return;
  hintTimer = setTimeout(() => {
    if (!compact.value || !autoHide.value || taskbarShown.value) return;
    swipeHint.value = true;
    hintTimer = setTimeout(() => { swipeHint.value = false; }, 10000);
  }, 3000);
}
watch(taskbarShown, shown => {
  if (!shown || !compact.value) return;
  swipeHint.value = false;
  clearTimeout(hintTimer);
  save('taskbar-swiped', 'yes');
});

// picking something from the start menu on a phone puts the taskbar away too.
// started in onMounted, since volumeOpen is declared further down
function watchMenus() {
  watch(menuOpen, open => {
    if (!open && autoHide.value && compact.value) hideTaskbarSoon(300);
  });
}
watch(() => windows.length, () => nextTick(measureTaskbar));

// right clicking a taskbar button opens its window menu just off the taskbar.
// { id, x, y } is where the pointer was, kept on screen
const taskMenu = ref(null);
const taskMenuEl = ref(null);
async function openTaskMenu(event, id) {
  startOpen.value = false;
  calendar.value = false;
  taskMenu.value = { id, x: Math.min(event.clientX, innerWidth - 176), y: Math.min(event.clientY, innerHeight - 190) };
  await nextTick();
  taskMenuEl.value?.querySelector('button:not(:disabled)')?.focus();
}
// the menu sits beside whichever edge the taskbar is on
const taskMenuStyle = computed(() => {
  const { x, y } = taskMenu.value;
  return {
    bottom: { left: `${x}px` },
    top: { left: `${x}px`, top: 'calc(var(--taskbar-height) + 2px)', bottom: 'auto' },
    left: { left: 'calc(var(--taskbar-width) + 2px)', top: `${y}px`, bottom: 'auto' },
    right: { right: 'calc(var(--taskbar-width) + 2px)', top: `${y}px`, bottom: 'auto' },
  }[edge.value];
});
function taskMenuAction(action) {
  const { id } = taskMenu.value;
  taskMenu.value = null;
  if (action === 'restore') open(id);
  else if (action === 'minimize') minimize(id);
  else if (action === 'maximize') { open(id); maximize(id); }
  else close(id);
}
function taskMenuKeys(event) {
  if (event.key === 'Escape') {
    taskMenu.value = null;
    event.stopPropagation();
    return;
  }
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  const items = [...taskMenuEl.value.querySelectorAll('button:not(:disabled)')];
  const i = items.indexOf(document.activeElement);
  items[(i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
}

// ---- right click menus on the desktop and the taskbar ----
// right clicking empty desktop or empty taskbar opens a win98 style menu instead of
// the browser's. icons, windows and taskbar buttons keep their own behaviour.
// { kind: 'desktop' | 'taskbar', x, y } where x and y are the menu's top left corner
const contextMenu = ref(null);
const contextMenuEl = ref(null);

async function openContextMenu(event, kind) {
  event.preventDefault();
  startOpen.value = false;
  calendar.value = false;
  volumeOpen.value = false;
  taskMenu.value = null;
  contextMenu.value = { kind, x: event.clientX, y: event.clientY };
  await nextTick();
  // like windows, it opens up or left of the pointer when it would run off the screen
  const el = contextMenuEl.value;
  if (!el) return;
  const { width, height } = el.getBoundingClientRect();
  if (event.clientX + width > innerWidth) contextMenu.value.x = Math.max(0, event.clientX - width);
  if (event.clientY + height > innerHeight) contextMenu.value.y = Math.max(0, event.clientY - height);
  el.querySelector('button:not(:disabled)')?.focus();
}

// only the bare desktop (or its wallpaper) and the empty parts of the taskbar count
function desktopContext(event) {
  if (event.target.closest('.desktop-shortcut, .window, .first-tip')) return;
  openContextMenu(event, 'desktop');
}
function taskbarContext(event) {
  if (event.target.closest('button')) return;
  openContextMenu(event, 'taskbar');
}

// every open window stacked from the top left, each a step down and to the right
function cascade() {
  const shown = windows.filter(w => !w.minimized);
  shown.forEach((w, i) => {
    if (w.maximized) toggleMaximize(w, area);
    Object.assign(w, clampBounds({ ...w, x: 24 + i * 28, y: 20 + i * 28 }, area));
  });
  if (shown.length) focus(shown.at(-1).id);
}

function contextAction(action) {
  contextMenu.value = null;
  if (action === 'arrange') Object.keys(iconCells).forEach(id => delete iconCells[id]);
  else if (action === 'note') open(addNote());
  else if (action === 'properties') open('settings');
  else if (action === 'cascade') cascade();
  else if (action === 'minimize') minimizeAll();
  else if (action === 'autohide') setAutoHide(!autoHide.value);
}

function contextMenuKeys(event) {
  if (event.key === 'Escape') {
    contextMenu.value = null;
    event.stopPropagation();
    return;
  }
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  const items = [...contextMenuEl.value.querySelectorAll('button:not(:disabled)')];
  const i = items.indexOf(document.activeElement);
  items[(i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
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

// which windows are open, bottom to top, so a refresh brings them all back
// (not just the one in the url)
function loadOpen() {
  try {
    const list = JSON.parse(read('open-windows', '[]'));
    return Array.isArray(list) ? list.filter(entry => typeof entry?.id === 'string') : [];
  } catch {
    return [];
  }
}

watch(
  () => windows.map(w => [w.id, w.minimized, w.z]),
  () => save('open-windows', JSON.stringify(
    [...windows].sort((a, b) => a.z - b.z).map(w => ({ id: w.id, minimized: w.minimized })),
  )),
  { deep: true },
);

let restoring = false;

function restoreOpen() {
  restoring = true;
  for (const { id, minimized } of loadOpen()) {
    if (!canOpen(id)) continue;
    open(id, false, false);
    if (minimized) get(id).minimized = true;
  }
  restoring = false;
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
// icon positions only last for this page load, refreshing puts them back on the grid.
// once an icon has been dragged, every icon keeps the grid cell it's in (iconCells).
// the cells actually used are worked out fresh whenever the desktop changes size: a
// cell that no longer fits is swapped for the nearest free one that does, so a
// smaller window never pushes an icon off the desktop, and making it bigger again
// puts the icon back where it was left

const iconCells = reactive({});
const dragging = ref(null);
const dragShift = ref({ x: 0, y: 0 });
// a dropped icon slides from where it was let go into its cell. { id, x, y, still }:
// the offset from the cell, and still means no transition for that first frame
const settling = ref(null);
let iconDrag = null;
let dragEndedAt = 0;

// the grid matches .desktop-grid and .desktop-shortcut in theme.css. on a desktop the
// icons are 86x83 with 12px and 5px gaps, on a phone 85x90 with 4px and 10px gaps. room
// is kept at the bottom for the taskbar, or just its sliver when it hides itself
const gridSize = computed(() => (compact.value
  ? { width: 85, height: 90, x: 89, y: 100, left: 12, top: 12 }
  : { width: 86, height: 83, x: 98, y: 88, left: 14, top: 16 }));

const gridFits = () => {
  const g = gridSize.value;
  const bottom = autoHide.value ? 4 : 50;
  return {
    cols: Math.max(1, Math.floor((area.width - g.left - g.width) / g.x) + 1),
    rows: Math.max(1, Math.floor((area.height - g.top - bottom - g.height) / g.y) + 1),
  };
};

// the free cell closest to where an icon wants to be
function nearestFree(taken, want, { cols, rows }) {
  let best = null;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (taken.has(`${col},${row}`)) continue;
      const distance = (col - want.col) ** 2 + (row - want.row) ** 2;
      if (!best || distance < best.distance) best = { col, row, distance };
    }
  }
  // more icons than cells: let it overlap rather than vanish
  return best ? { col: best.col, row: best.row } : { col: Math.min(want.col, cols - 1), row: Math.min(want.row, rows - 1) };
}

// where every icon goes right now. icons nobody has moved yet fill the grid in
// order, top to bottom then left to right, like the css grid does
const iconLayout = computed(() => {
  const fits = gridFits();
  const taken = new Set();
  const out = {};
  for (const app of shortcuts) {
    const want = iconCells[app.id];
    if (!want) continue;
    const cell = nearestFree(taken, { col: Math.min(want.col, fits.cols - 1), row: Math.min(want.row, fits.rows - 1) }, fits);
    taken.add(`${cell.col},${cell.row}`);
    out[app.id] = cell;
  }
  let next = 0;
  for (const app of shortcuts) {
    if (out[app.id]) continue;
    while (taken.has(`${Math.floor(next / fits.rows)},${next % fits.rows}`)) next++;
    out[app.id] = { col: Math.floor(next / fits.rows), row: next % fits.rows };
    next++;
  }
  return out;
});

// what pressed the icon last. safari's clicks don't always say whether they came
// from a finger, so a tap is recognised from this instead
let iconPointer = 'mouse';

function iconDown(event, id) {
  iconPointer = event.pointerType;
  if (event.button !== 0) return;
  const el = event.currentTarget;
  settling.value = null;
  iconDrag = {
    id,
    el,
    pointer: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    rect: el.getBoundingClientRect(),
    bounds: desktop.value.getBoundingClientRect(),
  };
  // a finger stays with the icon it pressed anyway. capturing it here as well can
  // stop safari sending the tap's click, so only the mouse is captured
  if (event.pointerType === 'mouse') el.setPointerCapture(event.pointerId);
}

function iconMove(event) {
  if (!iconDrag || event.pointerId !== iconDrag.pointer) return;
  if (!(event.buttons & 1)) return iconUp();

  const { rect, bounds } = iconDrag;
  let dx = event.clientX - iconDrag.x;
  let dy = event.clientY - iconDrag.y;

  // small dead zone so a sloppy click (or a tap on a phone) doesn't count as a drag
  if (!dragging.value) {
    if (Math.hypot(dx, dy) < (event.pointerType === 'touch' ? 10 : 5)) return;
    dragging.value = iconDrag.id;
    selected.value = iconDrag.id;
  }

  // don't let icons leave the desktop
  dx = Math.max(bounds.left - rect.left, Math.min(bounds.right - rect.right, dx));
  dy = Math.max(bounds.top - rect.top, Math.min(bounds.bottom - rect.bottom, dy));
  dragShift.value = { x: dx, y: dy };
}

// drops the icon into the nearest free grid cell
function snapIcon({ id }) {
  // the first drag pins every icon where it is, so the others don't close the gap
  for (const [other, cell] of Object.entries(iconLayout.value)) iconCells[other] ??= { ...cell };
  const from = iconLayout.value[id];
  const { x, y } = gridSize.value;
  const want = {
    col: Math.max(0, Math.round((from.col * x + dragShift.value.x) / x)),
    row: Math.max(0, Math.round((from.row * y + dragShift.value.y) / y)),
  };
  const taken = new Set(
    Object.entries(iconLayout.value).filter(([other]) => other !== id).map(([, c]) => `${c.col},${c.row}`),
  );
  iconCells[id] = nearestFree(taken, want, gridFits());
}

function iconUp() {
  if (dragging.value) {
    const id = dragging.value;
    const from = { ...iconLayout.value[id] };
    snapIcon(iconDrag);
    const to = iconLayout.value[id];
    // start the icon exactly where it was dropped, then let it slide into the cell
    settling.value = {
      id,
      x: (from.col - to.col) * gridSize.value.x + dragShift.value.x,
      y: (from.row - to.row) * gridSize.value.y + dragShift.value.y,
      still: true,
    };
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (settling.value?.id === id) settling.value = { id, x: 0, y: 0, still: false };
    }));
    dragEndedAt = performance.now();
  }
  iconDrag = null;
  dragging.value = null;
  dragShift.value = { x: 0, y: 0 };
}

// each icon is placed in its cell, on a phone as well as a desktop
function iconStyle(id) {
  const cell = iconLayout.value[id];
  const { x, y } = gridSize.value;
  const settle = settling.value?.id === id ? settling.value : null;
  const shift = dragging.value === id ? dragShift.value : settle || { x: 0, y: 0 };
  return {
    position: 'absolute',
    left: `${cell.col * x}px`,
    top: `${cell.row * y}px`,
    transform: shift.x || shift.y ? `translate(${shift.x}px, ${shift.y}px)` : null,
    transition: settle?.still ? 'none' : null,
  };
}

function selectShortcut(event, id) {
  // the click that fires right after a drag shouldn't count
  if (performance.now() - dragEndedAt < 150) return;
  selected.value = id;
  // touch and pen open on a single tap, detail 0 means it came from the keyboard
  if (iconPointer === 'touch' || iconPointer === 'pen' || event.detail === 0) open(id);
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
  if (!taskMenuEl.value?.contains(event.target)) taskMenu.value = null;
  if (!contextMenuEl.value?.contains(event.target)) contextMenu.value = null;
  if (!event.target.closest('.tray')) {
    calendar.value = false;
    volumeOpen.value = false;
  }
}

function escape(event) {
  if (event.key !== 'Escape') return;
  contextMenu.value = null;
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

// desktop settings has a volume slider too, so follow changes made there
function soundChanged(event) {
  sound.value = event.detail.enabled;
  level.value = event.detail.level;
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

// the show desktop button is a toggle, like windows: the first click minimizes
// everything and remembers what was open, the next click brings those windows back.
// opening anything in between starts over
let desktopShown = null;

function minimizeAll() {
  windows.forEach(w => { w.minimized = true; });
  active.value = null;
  startOpen.value = false;
  nextTick(() => document.querySelector('.desktop-shortcut')?.focus());
}

function showDesktop() {
  const stillHidden = desktopShown && windows.every(w => w.minimized);
  if (stillHidden) {
    const { ids, front } = desktopShown;
    desktopShown = null;
    startOpen.value = false;
    windows.filter(w => ids.includes(w.id)).forEach(w => { w.minimized = false; });
    if (front && get(front)) focus(front);
    return;
  }
  const ids = windows.filter(w => !w.minimized).map(w => w.id);
  desktopShown = ids.length ? { ids, front: active.value } : null;
  minimizeAll();
}

onMounted(() => {
  measure();
  resizeObserver = new ResizeObserver(() => {
    measure();
    measureTaskbar();
  });
  resizeObserver.observe(desktop.value);

  // bring back the windows from last time, then put whatever the url asks for on
  // top. a fresh visit (or one where everything was closed) gets the about window
  restoreOpen();
  const id = hashApp();
  if (canOpen(id)) open(id, false, false);
  else if (!windows.length) open('about', false, false);
  else {
    active.value = nextVisible(windows);
    if (active.value) {
      route(active.value);
      focusRegion(active.value);
    }
  }

  timer = setInterval(() => { clock.value = new Date(); }, 60000);
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', escape);
  document.addEventListener('pointerdown', pressSound, true);
  document.addEventListener('click', clickSound, true);
  document.addEventListener('pointerover', hoverSound);
  watchMenus();
  offerSwipeHint();
  document.addEventListener('touchstart', swipeStart, { passive: true });
  document.addEventListener('touchmove', swipeMove, { passive: true });
  document.addEventListener('touchend', swipeEnd, { passive: true });
  document.addEventListener('pointermove', taskbarPointerMove);
  document.addEventListener('pointerdown', taskbarPointerDown);
  window.addEventListener('hashchange', hashOpen);
  window.addEventListener('site-notice', noticeEvent);
  window.addEventListener('site-sound', soundChanged);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  clearInterval(timer);
  clearTimeout(saveLayoutTimer);
  clearTimeout(noticeTimer);
  document.removeEventListener('pointerdown', outside);
  document.removeEventListener('keydown', escape);
  document.removeEventListener('pointerdown', pressSound, true);
  document.removeEventListener('click', clickSound, true);
  document.removeEventListener('pointerover', hoverSound);
  document.removeEventListener('touchstart', swipeStart);
  document.removeEventListener('touchmove', swipeMove);
  document.removeEventListener('touchend', swipeEnd);
  clearTimeout(hintTimer);
  document.removeEventListener('pointermove', taskbarPointerMove);
  document.removeEventListener('pointerdown', taskbarPointerDown);
  clearTimeout(hideTimer);
  window.removeEventListener('hashchange', hashOpen);
  window.removeEventListener('site-notice', noticeEvent);
  window.removeEventListener('site-sound', soundChanged);
});
</script>

<template>
  <div
    class="desktop-shell"
    :class="[`taskbar-${edge}`, { resting, 'taskbar-autohide': autoHide, 'taskbar-shown': taskbarShown }]"
    :style="{ '--desktop': wallpaper }"
  >
    <main ref="desktop" class="desktop" aria-label="Jason Tang’s desktop" @pointerdown.self="selected = null" @contextmenu="desktopContext">
      <AsciiImage
        class="desktop-wallpaper"
        :style="{ filter: wallpaperFilter(wallpaper) }"
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

      <aside v-if="notice" class="first-tip desktop-notice raised" role="status" aria-label="Notification">
        <div class="tip-heading">
          <strong>{{ notice.title }}</strong>
          <button aria-label="Dismiss notification" @click="notice = null">×</button>
        </div>
        <p>{{ notice.message }}</p>
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
          @close="close"
          @unlock="unlock"
          @wallpaper="setWallpaper"
        />
      </DesktopWindow>
    </main>

    <nav ref="taskbarEl" class="taskbar" aria-label="Taskbar" @contextmenu="taskbarContext" @focusin="autoHide && $event.target.matches(':focus-visible') && showTaskbar()" @focusout="autoHide && hideTaskbarSoon()">
      <!-- a hidden taskbar has a tab sticking out of its edge to tap (or swipe on a
           phone), with an arrow that bobs toward where the taskbar will go -->
      <button
        v-if="autoHide"
        class="taskbar-tab raised"
        :aria-label="taskbarShown ? 'Hide the taskbar' : 'Show the taskbar'"
        :aria-expanded="taskbarShown"
        @click="toggleTaskbar"
      >
        <svg viewBox="0 0 7 4" aria-hidden="true" :style="{ rotate: `${tabArrow}deg` }"><path d="M3 0h1v1h1v1h1v1h1v1H0V3h1V2h1V1h1z"/></svg>
      </button>
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

      <div ref="taskItems" class="task-items" :class="{ crowded: taskbarCrowded }" aria-label="Running applications">
        <button
          v-for="win in windows"
          :key="win.id"
          class="task-button raised"
          :class="{ pressed: active === win.id && !win.minimized }"
          :aria-label="`${win.label}${win.minimized ? ' (minimized)' : ''}`"
          :aria-pressed="active === win.id && !win.minimized"
          @click="taskClick(win.id)"
          @contextmenu.prevent="openTaskMenu($event, win.id)"
        >
          <RetroIcon :name="win.icon" small/>
          <span>{{ win.label }}</span>
        </button>
      </div>

      <div class="tray">
        <button
          class="tray-sound raised"
          :aria-expanded="volumeOpen"
          :aria-label="audible ? 'Volume' : 'Volume (muted)'"
          title="Volume"
          @click="toggleVolume"
        >
          <RetroIcon :name="audible ? 'sound' : 'mute'" small/>
        </button>
        <button
          class="tray-theme raised"
          :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="setTheme(theme === 'dark' ? 'light' : 'dark')"
        >
          <RetroIcon :name="theme === 'dark' ? 'moon' : 'sun'" small/>
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
        <Calendar v-if="calendar" :now="clock"/>
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
        <button role="menuitem" @click="open('computer')">
          <RetroIcon name="computer"/>
          <span>All Apps</span>
        </button>
        <button role="menuitem" @click="open('settings')">
          <RetroIcon name="settings"/>
          <span>Desktop Settings</span>
        </button>
        <button role="menuitem" @click="reset">
          <RetroIcon name="reset"/>
          <span>Reset Desktop</span>
        </button>
      </div>
    </div>

    <div
      v-if="taskMenu && get(taskMenu.id)"
      ref="taskMenuEl"
      class="system-menu task-menu raised"
      role="menu"
      :aria-label="`${get(taskMenu.id).label} window menu`"
      :style="taskMenuStyle"
      @keydown="taskMenuKeys"
    >
      <!-- the app's full name up top, since the taskbar button often cuts it off -->
      <div class="task-menu-title" aria-hidden="true">
        <RetroIcon :name="get(taskMenu.id).icon" small/>
        <span>{{ get(taskMenu.id).label }}</span>
      </div>
      <button role="menuitem" :disabled="!get(taskMenu.id).minimized && active === taskMenu.id" @click="taskMenuAction('restore')"><MenuGlyph name="restore"/>Restore</button>
      <button role="menuitem" :disabled="get(taskMenu.id).minimized" @click="taskMenuAction('minimize')"><MenuGlyph name="minimize"/>Minimize</button>
      <button role="menuitem" :disabled="compact || get(taskMenu.id).fixedSize || get(taskMenu.id).maximized" @click="taskMenuAction('maximize')"><MenuGlyph name="maximize"/>Maximize</button>
      <hr>
      <button role="menuitem" data-sound="none" @click="taskMenuAction('close')"><MenuGlyph name="close"/><strong>Close</strong></button>
    </div>

    <!-- clippy peeking up from under the bottom edge, with a bobbing pixel arrow -->
    <div v-if="swipeHint" class="swipe-hint" role="status">
      <p class="swipe-hint-balloon">
        <svg viewBox="0 0 7 8" aria-hidden="true"><path d="M3 0h1v1h1v1h1v1h1v1H5v4H2V4H0V3h1V2h1V1h1z"/></svg>
        Swipe up from the bottom for the taskbar
      </p>
      <div class="swipe-hint-peek"><ClippyArt :shadow="false"/></div>
    </div>

    <div
      v-if="contextMenu"
      ref="contextMenuEl"
      class="system-menu context-menu raised"
      role="menu"
      :aria-label="contextMenu.kind === 'desktop' ? 'Desktop menu' : 'Taskbar menu'"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @keydown="contextMenuKeys"
      @contextmenu.prevent
    >
      <template v-if="contextMenu.kind === 'desktop'">
        <button role="menuitem" :disabled="!Object.keys(iconCells).length" @click="contextAction('arrange')"><MenuGlyph/>Arrange Icons</button>
        <button role="menuitem" @click="contextAction('note')"><MenuGlyph/>New Sticky Note</button>
        <hr>
        <button role="menuitem" @click="contextAction('properties')"><MenuGlyph/><strong>Properties</strong></button>
      </template>
      <template v-else>
        <button role="menuitem" :disabled="compact || !windows.some(w => !w.minimized)" @click="contextAction('cascade')"><MenuGlyph/>Cascade Windows</button>
        <button role="menuitem" :disabled="!windows.some(w => !w.minimized)" @click="contextAction('minimize')"><MenuGlyph name="minimize"/>Minimize All Windows</button>
        <hr>
        <button role="menuitemcheckbox" :aria-checked="autoHide" @click="contextAction('autohide')"><MenuGlyph :name="autoHide ? 'check' : ''"/>Auto-hide the Taskbar</button>
        <button role="menuitem" @click="contextAction('properties')"><MenuGlyph/><strong>Properties</strong></button>
      </template>
    </div>

    <div class="sr-only" role="status">{{ announcement }}</div>
  </div>
</template>
