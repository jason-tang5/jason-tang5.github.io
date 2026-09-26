<script setup>
// the cd player. it drives spotify's embed through their iframe api, which only
// loads the first time you press play. while it plays, little pixel notes float
// up off the disc.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { albumUrl, tracks } from '../music.mjs';
import { loadSpotifyApi } from '../spotify.js';
import { createPlaybackEndTracker } from '../playback-end.mjs';

const props = defineProps({ win: Object });

const selected = ref(0);
const position = ref(0);
const duration = ref(0);
const paused = ref(true);
const loading = ref(false);
const ready = ref(false);
const showSpotify = ref(true);
const message = ref('');
const notes = ref([]);

// template refs
const embedHost = ref(null);
const panel = ref(null);
const disc = ref(null);

let controller;
let disposed = false;
let startupTimer;
let noteTimer;
let noteId = 0;
let baseHeight;
let panelObserver;

const playbackEnd = createPlaybackEndTracker();
const current = computed(() => tracks[selected.value]);
// spotify only tells us the duration once it's playing, until then use ours
const length = computed(() => duration.value || current.value.duration);

// ms to m:ss
function time(ms) {
  return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
}

function update({ data }) {
  // ignore stale updates from the track we just switched away from
  if (disposed || (data.playingURI && data.playingURI !== current.value.uri)) return;

  const ended = playbackEnd.update(data);
  paused.value = data.isPaused;
  position.value = data.position || 0;
  duration.value = data.duration || 0;

  const index = tracks.findIndex(t => t.uri === data.playingURI);
  if (index >= 0) selected.value = index;

  if (!data.isPaused) {
    clearTimeout(startupTimer);
    message.value = '';
  }
  if (ended) choose(selected.value + 1);
}

// spotify's play() always restarts from 0:00, so after a pause we have to use resume().
// browsers sometimes block autoplay in the iframe, so if nothing starts after a few
// seconds we open the real spotify player and ask the user to press play there.
function requestPlay(resume = false) {
  if (resume) controller?.resume();
  else controller?.play();

  clearTimeout(startupTimer);
  startupTimer = setTimeout(() => {
    if (paused.value && !disposed) {
      showSpotify.value = true;
      message.value = 'Press Play in Spotify to start playback.';
    }
  }, 6000);
}

function giveUp(text) {
  loading.value = false;
  showSpotify.value = true;
  message.value = text;
}

async function initialize() {
  if (controller || loading.value) return;
  loading.value = true;
  message.value = 'Loading Spotify…';

  try {
    const api = await loadSpotifyApi();
    if (disposed) return;

    const mount = document.createElement('div');
    embedHost.value.append(mount);

    api.createController(mount, { uri: current.value.uri, width: '100%', height: 152 }, value => {
      // the window might have closed while spotify was loading
      if (disposed) {
        value.destroy();
        return;
      }

      controller = value;
      controller.addListener('playback_update', update);
      controller.addListener('ready', () => {
        if (disposed) return;
        loading.value = false;
        ready.value = true;
        message.value = '';
        requestPlay();
      });

      clearTimeout(startupTimer);
      startupTimer = setTimeout(() => {
        if (!ready.value && !disposed) giveUp('Spotify is taking longer to load. You can open the album below.');
      }, 12000);
    });
  } catch {
    if (!disposed) giveUp('Spotify is unavailable. Open the album below.');
  }
}

function pause() {
  clearTimeout(startupTimer);
  playbackEnd.pause();
  controller.pause();
}

function togglePlay() {
  if (!controller) initialize();
  else if (paused.value) requestPlay(position.value > 0);
  else pause();
}

// spotify's embed has no volume control we can reach, so the closest thing is
// pausing when the site is muted or the volume slider hits zero.
// turning sound back on doesn't restart the music by itself
function siteSound({ detail }) {
  if ((!detail.enabled || !detail.level) && controller && !paused.value) pause();
}

// wraps around in both directions
function choose(index) {
  playbackEnd.reset();
  selected.value = (index + tracks.length) % tracks.length;
  position.value = 0;
  duration.value = 0;
  if (controller) {
    controller.loadUri(current.value.uri);
    requestPlay();
  }
}

function seek(event) {
  controller?.seek(Math.floor(Number(event.target.value) / 1000));
}

// ---- floating notes ----
// they're teleported onto the desktop so they can float out past the window edges

function pixelNote(rows) {
  const d = rows
    .flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : '')))
    .join('');
  return { w: rows[0].length, h: rows.length, d };
}

const noteGlyphs = [
  // eighth note
  pixelNote([
    '...XX....',
    '...XXX...',
    '...X.XX..',
    '...X..XX.',
    '...X...X.',
    '...X.....',
    '...X.....',
    '.XXX.....',
    'XXXX.....',
    'XXXX.....',
    '.XX......',
  ]),
  // two beamed notes
  pixelNote([
    '...XXXXXXX',
    '...XXXXXXX',
    '...X.....X',
    '...X.....X',
    '...X.....X',
    '...X.....X',
    '.XXX...XXX',
    'XXXX..XXXX',
    'XXXX..XXXX',
    '.XX....XX.',
  ]),
  // quarter note
  pixelNote(['...X', '...X', '...X', '...X', '...X', '...X', '.XXX', 'XXXX', 'XXXX', '.XX.']),
];
const noteColors = ['#000080', '#800080', '#008080', '#800000'];

function spawnNote() {
  const host = document.querySelector('.desktop');
  const rect = disc.value?.getBoundingClientRect();
  if (!host || !rect?.width || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const box = host.getBoundingClientRect();
  const id = noteId++;
  // alternate left and right
  const dir = id % 2 ? 1 : -1;

  // start somewhere on the upper rim of the disc, not the middle
  const angle = -Math.PI / 2 + dir * (Math.PI / 5 + Math.random() * Math.PI / 4);
  const radius = rect.width / 2;

  notes.value.push({
    id,
    glyph: noteGlyphs[id % noteGlyphs.length],
    style: {
      left: `${rect.left - box.left + radius + Math.cos(angle) * radius}px`,
      top: `${rect.top - box.top + rect.height / 2 + Math.sin(angle) * radius}px`,
      color: noteColors[id % noteColors.length],
      // how far it drifts, the css animation reads these
      '--dx': `${dir * (50 + Math.random() * 100)}px`,
      '--dy': `${-(170 + Math.random() * 130)}px`,
    },
  });
}

function removeNote(id) {
  notes.value = notes.value.filter(n => n.id !== id);
}

watch(paused, isPaused => {
  clearInterval(noteTimer);
  if (!isPaused) {
    spawnNote();
    noteTimer = setInterval(spawnNote, 450);
  }
});

// ---- window size ----
// the window is fixed size, so it grows to fit the spotify panel and shrinks back when it's hidden

async function fitWindow() {
  await nextTick();
  const win = props.win;
  if (!win || !panel.value || innerWidth <= 700) return;

  baseHeight ??= win.height;
  const height = showSpotify.value ? baseHeight + Math.ceil(panel.value.offsetHeight) : baseHeight;
  if (height === win.height) return;
  Object.assign(win, { height, minHeight: height });

  const desktop = document.querySelector('.desktop')?.getBoundingClientRect();
  if (desktop) win.y = Math.max(0, Math.min(win.y, desktop.height - height));
}

watch(showSpotify, fitWindow);

onMounted(() => {
  panelObserver = new ResizeObserver(() => {
    if (showSpotify.value) fitWindow();
  });
  panelObserver.observe(panel.value);
  window.addEventListener('site-sound', siteSound);
});

onBeforeUnmount(() => {
  disposed = true;
  window.removeEventListener('site-sound', siteSound);
  clearTimeout(startupTimer);
  clearInterval(noteTimer);
  panelObserver?.disconnect();
  controller?.destroy();
});
</script>

<template>
  <div class="app-layout cd-app">
    <div class="cd-face">
      <span ref="disc" class="cd-disc" :class="{ spinning: !paused }" aria-hidden="true"/>

      <div class="cd-controls">
        <select class="cd-track inset" aria-label="Track" :value="selected" @change="choose(Number($event.target.value))">
          <option v-for="(track, i) in tracks" :key="track.uri" :value="i">{{ i + 1 }} of {{ tracks.length }}: {{ track.title }}</option>
        </select>

        <div class="cd-timeline">
          <output aria-label="Elapsed time">{{ time(position) }}</output>
          <input
            aria-label="Seek playback"
            type="range"
            min="0"
            :max="length"
            step="1000"
            :value="position"
            :disabled="!ready"
            @change="seek"
          >
          <output aria-label="Track duration">{{ time(length) }}</output>
        </div>

        <div class="cd-transport">
          <button class="raised" aria-label="Previous track" @click="choose(selected - 1)">
            <svg viewBox="0 0 20 14" aria-hidden="true"><path d="M9 2 2 7l7 5V2zm8 0-7 5 7 5V2z"/></svg>
          </button>
          <button
            class="raised"
            :aria-label="loading ? 'Loading Spotify' : paused ? 'Play' : 'Pause'"
            :disabled="loading"
            @click="togglePlay"
          >
            <svg viewBox="0 0 20 14" aria-hidden="true">
              <path v-if="paused" d="m6 2 10 5-10 5z"/>
              <path v-else d="M5 2h4v10H5zm7 0h4v10h-4z"/>
            </svg>
          </button>
          <button class="raised" aria-label="Next track" @click="choose(selected + 1)">
            <svg viewBox="0 0 20 14" aria-hidden="true"><path d="m3 2 7 5-7 5V2zm8 0 7 5-7 5V2z"/></svg>
          </button>
          <button
            class="raised cd-spotify-toggle"
            :class="{ pressed: showSpotify }"
            :aria-label="showSpotify ? 'Hide Spotify player' : 'Show Spotify player'"
            title="Spotify"
            :aria-expanded="showSpotify"
            aria-controls="cd-spotify"
            @click="showSpotify = !showSpotify"
          >
            <svg viewBox="0 0 20 14" aria-hidden="true">
              <circle cx="10" cy="7" r="6.5"/>
              <path
                d="M6 5.2c2.8-.9 5.6-.6 8 .8M6.5 7.6c2.3-.6 4.5-.4 6.6.7M7 9.8c1.8-.4 3.4-.3 5 .5"
                fill="none"
                stroke="#c0c0c0"
                stroke-width="1.2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- the Spotify panel is open by default; playback still starts on request -->
    <div id="cd-spotify" ref="panel" class="cd-spotify" :class="{ expanded: showSpotify }" :inert="!showSpotify">
      <p v-if="message" role="status">{{ message }}</p>
      <div ref="embedHost" class="cd-embed"/>
      <a :href="albumUrl" target="_blank" rel="noopener">Open in Spotify</a>
    </div>

    <span class="sr-only" role="status">{{ message }} {{ current.title }}. {{ paused ? 'Paused' : 'Playing' }}. </span>
  </div>

  <Teleport to=".desktop">
    <span
      v-for="n in notes"
      :key="n.id"
      class="cd-note"
      :style="n.style"
      aria-hidden="true"
      @animationend="removeNote(n.id)"
    >
      <svg :viewBox="`0 0 ${n.glyph.w} ${n.glyph.h}`" :width="n.glyph.w * 3" :height="n.glyph.h * 3" shape-rendering="crispEdges">
        <path :d="n.glyph.d" fill="currentColor"/>
      </svg>
    </span>
  </Teleport>
</template>
