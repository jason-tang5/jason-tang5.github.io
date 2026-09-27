<script setup>
// picks what goes inside each window based on its type. the small apps live
// right here, the bigger ones have their own components.
import { defineAsyncComponent, onBeforeUnmount, ref, watch } from 'vue';
import { profile, projects, roles } from '../content.mjs';
import { folders, registry } from '../registry.js';
import AsciiImage from './AsciiImage.vue';
import Analytics from './Analytics.vue';
import Blog from './Blog.vue';
import Music from './Music.vue';
import Mail from './Mail.vue';
import Pictures from './Pictures.vue';
import Stickies from './Stickies.vue';
import StickyNote from './StickyNote.vue';
import RetroIcon from './RetroIcon.vue';
import InlineText from './InlineText.vue';
import TechList from './TechList.vue';
import { read, save, remove } from '../storage.js';
import { noteGlyphs, noteColors } from '../notes.mjs';
import { play, setSoundEnabled, setSoundLevel, soundEnabled, soundLevel } from '../sound.js';
import { theme, setTheme } from '../theme.js';
import { defaultWallpaper, wallpaperFilter, wallpapers } from '../wallpaper.js';
import { autoHide, edges, setAutoHide, setTaskbarEdge, taskbarEdge } from '../taskbar.js';

// the games only load when someone actually opens them
const Game = defineAsyncComponent(() => import('./Game.vue'));
const Snake = defineAsyncComponent(() => import('./Snake.vue'));
const Minesweeper = defineAsyncComponent(() => import('./Minesweeper.vue'));
const Reversi = defineAsyncComponent(() => import('./Reversi.vue'));

defineProps({
  win: Object,
  active: Boolean,
  wallpaper: String,
  visible: Boolean,
});
const emit = defineEmits(['open', 'close', 'unlock', 'wallpaper']);

const selected = ref(projects[0]);
const favoritesStrip = ref(null);
const favoritesLeft = ref(false);
const favoritesRight = ref(false);
const favoritesScroll = ref(0);
const favoritesScrollMax = ref(0);
const favoritesThumb = ref(100);
function updateFavoritesScroll() {
  const strip = favoritesStrip.value;
  if (!strip) return;
  favoritesScroll.value = strip.scrollLeft;
  favoritesScrollMax.value = Math.max(0, strip.scrollWidth - strip.clientWidth);
  favoritesThumb.value = Math.max(20, strip.clientWidth / strip.scrollWidth * 100);
  favoritesLeft.value = strip.scrollLeft > 1;
  favoritesRight.value = strip.scrollLeft < strip.scrollWidth - strip.clientWidth - 1;
}
watch(favoritesStrip, (strip, _, onCleanup) => {
  if (!strip) return;
  const observer = new ResizeObserver(updateFavoritesScroll);
  observer.observe(strip);
  updateFavoritesScroll();
  onCleanup(() => observer.disconnect());
}, { flush: 'post' });
function scrollFavorites(direction) {
  favoritesStrip.value?.scrollBy({
    left: direction * favoritesStrip.value.clientWidth * 0.75,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
}

// the volume in desktop settings, kept in step with the taskbar's speaker
const sound = ref(soundEnabled());
const level = ref(soundLevel());
function soundChanged(event) {
  sound.value = event.detail.enabled;
  level.value = event.detail.level;
}
addEventListener('site-sound', soundChanged);
onBeforeUnmount(() => removeEventListener('site-sound', soundChanged));
// the about window's side pane, each place with the path it'd have on the computer.
// hovering one shows its path in the address bar, like explorer
const places = [
  {
    title: 'Favorites',
    star: true,
    items: [
      { id: 'resume', path: 'Portfolio:\\Jason_Tang_Resume.pdf' },
      { id: 'experience', path: 'Portfolio:\\Experience.txt' },
      { id: 'projects', path: 'Portfolio:\\Projects' },
      { id: 'blog', path: 'Portfolio:\\Blog' },
    ],
  },
  {
    title: 'Other places',
    items: [
      { id: 'games', path: 'Portfolio:\\Games' },
      { id: 'funstuff', path: 'Portfolio:\\Fun Stuff' },
      { id: 'pictures', path: 'Portfolio:\\My Pictures' },
      { id: 'stickies', path: 'Portfolio:\\Sticky Notes' },
    ],
  },
];
const hoveredPlace = ref(null);

// the projects folder shows its files as large icons or as a details list
const projectViews = [
  { id: 'icons', label: 'Large icons', glyph: 'M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H1zM9 9h6v6H9zM2 2v4h4V2zM10 2v4h4V2zM2 10v4h4v-4zM10 10v4h4v-4z' },
  { id: 'details', label: 'Details', glyph: 'M1 2h3v3H1zM6 3h9v1H6zM1 7h3v3H1zM6 8h9v1H6zM1 12h3v3H1zM6 13h9v1H6z' },
];
const projectView = ref(read('projects-view', 'icons') === 'details' ? 'details' : 'icons');
function setProjectView(view) {
  projectView.value = view;
  save('projects-view', view);
}

// the details view's columns can be dragged wider or narrower by their header edges.
// until one is dragged they squeeze to fit the pane, after that every column keeps
// its own width and the pane scrolls if it runs out. an empty last column holds the
// row's open button so it never sits on top of the type
let savedColumns = null;
try { savedColumns = JSON.parse(read('projects-columns', 'null')); } catch { /* keep the defaults */ }
const columns = ref(savedColumns?.name ? savedColumns : null);
const detailsHeader = ref(null);
function detailsColumns() {
  const c = columns.value;
  return c
    ? `24px ${c.name}px ${c.date}px ${c.kind}px minmax(64px, 1fr)`
    : '24px minmax(90px, 1fr) minmax(0, 112px) minmax(0, 100px) 64px';
}
function resizeColumn(key, event) {
  // pin every column to its current width so dragging one doesn't reflow the others.
  // the name header also spans the icon column
  if (!columns.value) {
    const [name, date, kind] = [...detailsHeader.value.children].map(el => el.getBoundingClientRect().width);
    columns.value = { name: Math.round(name - 24), date: Math.round(date), kind: Math.round(kind) };
  }
  const start = columns.value[key];
  const x = event.clientX;
  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);
  const move = e => {
    columns.value[key] = Math.max(40, Math.round(start + e.clientX - x));
  };
  const end = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', end);
    handle.removeEventListener('pointercancel', end);
    save('projects-columns', JSON.stringify(columns.value));
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}
const resumeUrl = `${import.meta.env.BASE_URL}assets/Jason_Tang_Resume.pdf`;
const portraitUrl = new URL('../../assets/profile.jpg', import.meta.url).href;
const portraitHint = ref(true);
const portraitAscii = ref(read('portrait-ascii', 'on') !== 'off');


// the cd at the bottom of the about page. hovering it spins it, plays a little
// music box tune and puffs out small notes, like the cd player does while it
// plays. clicking it opens the real cd player
const hoverNotes = ref([]);
const cdSpinning = ref(false);
const cdDisc = ref(null);
let hoverNoteId = 0;
let hoverNoteTimer;
let tuneTimer;
let tuneStep = 0;

// the notes are teleported onto the desktop (like the cd player's) so they can
// float up past the edge of the window instead of being cut off by it
function spawnHoverNote() {
  const host = document.querySelector('.desktop');
  const rect = cdDisc.value?.getBoundingClientRect();
  if (!host || !rect?.width || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const box = host.getBoundingClientRect();
  const id = hoverNoteId++;
  const dir = id % 2 ? 1 : -1;
  hoverNotes.value.push({
    id,
    glyph: noteGlyphs[id % noteGlyphs.length],
    style: {
      left: `${rect.left - box.left + rect.width / 2 + dir * rect.width * 0.35}px`,
      top: `${rect.top - box.top + rect.height * 0.25}px`,
      color: noteColors[id % noteColors.length],
      '--dx': `${dir * (20 + Math.random() * 40)}px`,
      '--dy': `${-(80 + Math.random() * 70)}px`,
    },
  });
}

function startCd() {
  cdSpinning.value = true;
  clearInterval(hoverNoteTimer);
  clearInterval(tuneTimer);
  spawnHoverNote();
  hoverNoteTimer = setInterval(spawnHoverNote, 320);
  tuneStep = 0;
  play('tune', tuneStep++);
  tuneTimer = setInterval(() => play('tune', tuneStep++), 240);
}

function stopCd() {
  cdSpinning.value = false;
  clearInterval(hoverNoteTimer);
  clearInterval(tuneTimer);
}

onBeforeUnmount(stopCd);

function setPortraitAscii(value) {
  portraitHint.value = false;
  portraitAscii.value = value;
  save('portrait-ascii', value ? 'on' : 'off');
}

</script>

<template>
  <!-- about -->
  <div v-if="win.type === 'about'" class="app-layout about-app">
    <div class="address-bar">
      <span>Address</span>
      <div class="inset">{{ hoveredPlace?.path || 'Portfolio:\\About Me' }}</div>
    </div>
    <div class="about-explorer">
      <!-- the left pane of an explorer window, like browsing my computer to get to things -->
      <div class="about-favorites-pane">
      <nav ref="favoritesStrip" class="about-favorites inset" aria-label="Favorites" @scroll.passive="updateFavoritesScroll">
        <template v-for="group in places" :key="group.title">
          <p class="favorites-head" aria-hidden="true">
            <svg v-if="group.star" viewBox="0 0 16 16"><path d="M7 1h2v4h5v2h-1v1h-1v1h-1v2h1v4h-1v-1h-1v-1H9v-1H7v1H6v1H5v1H4v-4h1V9H4V8H3V7H2V5h5z"/></svg>
            <RetroIcon v-else name="computer" small/>
            {{ group.title }}
          </p>
          <button
            v-for="place in group.items"
            :key="place.id"
            class="favorite"
            :title="place.path"
            @click="emit('open', place.id)"
            @pointerenter="hoveredPlace = place"
            @pointerleave="hoveredPlace = null"
            @focus="hoveredPlace = place"
            @blur="hoveredPlace = null"
          >
            <RetroIcon :name="registry[place.id].icon" small/>
            <span>{{ registry[place.id].label }}</span>
          </button>
        </template>
      </nav>
      <div v-if="favoritesLeft || favoritesRight" class="favorites-scroll-cue">
        <button class="raised" aria-label="Scroll shortcuts left" :disabled="!favoritesLeft" @click="scrollFavorites(-1)"><svg viewBox="0 0 7 7" aria-hidden="true" shape-rendering="crispEdges"><path d="M4 0h1v7H4zM3 1h1v5H3zM2 2h1v3H2zM1 3h1v1H1z"/></svg></button>
        <input class="favorites-scroll-track" type="range" aria-label="Scroll shortcuts"
          min="0" :max="favoritesScrollMax" :value="favoritesScroll"
          :style="{ '--scroll-thumb': `${favoritesThumb}%` }"
          @input="favoritesStrip.scrollLeft = Number($event.target.value)">
        <button class="raised" aria-label="Scroll shortcuts right" :disabled="!favoritesRight" @click="scrollFavorites(1)"><svg viewBox="0 0 7 7" aria-hidden="true" shape-rendering="crispEdges"><path d="M2 0h1v7H2zM3 1h1v5H3zM4 2h1v3H4zM5 3h1v1H5z"/></svg></button>
      </div>
      </div>
      <div class="content-scroll about-content">
        <!-- linkedin, github, contact and the cd player as toolbar icons in the top right.
             each has its own hover: linkedin's letters bounce with a ping, the octocat wags
             its tail and meows, the envelope wiggles with a paper swish, and the cd spins,
             plays a tune and puffs out notes -->
        <div class="about-shortcuts raised">
          <a class="about-shortcut ie-button" :href="profile.links.linkedin" target="_blank" rel="noopener" title="LinkedIn (opens in a new tab)" @pointerenter="play('ping')">
            <RetroIcon name="linkedin"/>
            <span>LinkedIn</span>
          </a>
          <a class="about-shortcut ie-button" :href="profile.links.github" target="_blank" rel="noopener" title="GitHub (opens in a new tab)" @pointerenter="play('meow')">
            <RetroIcon name="github"/>
            <span>GitHub</span>
          </a>
          <button class="about-shortcut ie-button about-contact" @pointerenter="play('letter')" @click="emit('open', 'contact')">
            <RetroIcon name="contact"/>
            <span>Contact</span>
          </button>
          <button
            class="about-shortcut ie-button"
            @click="emit('open', 'music')"
            @pointerenter="startCd"
            @pointerleave="stopCd"
            @focus="startCd"
            @blur="stopCd"
          >
            <span ref="cdDisc" class="about-cd-disc" :class="{ spinning: cdSpinning }" aria-hidden="true"><RetroIcon name="music"/></span>
            <span>CD Player</span>
          </button>
        </div>
        <Teleport to=".desktop">
          <span
            v-for="n in hoverNotes"
            :key="n.id"
            class="cd-note cd-note-small"
            :style="n.style"
            aria-hidden="true"
            @animationend="hoverNotes = hoverNotes.filter(h => h.id !== n.id)"
          >
            <svg :viewBox="`0 0 ${n.glyph.w} ${n.glyph.h}`" :width="n.glyph.w * 1.5" :height="n.glyph.h * 1.5" shape-rendering="crispEdges">
              <path :d="n.glyph.d" fill="currentColor"/>
            </svg>
          </span>
        </Teleport>
        <div class="about-grid">
          <div class="portrait-frame inset" @pointerdown.capture="portraitHint = false">
            <span v-if="portraitHint" class="portrait-hint">Try clicking me!</span>
            <AsciiImage
              class="portrait-ascii"
              :source="portraitUrl"
              description="Jason in a golden mirrored room"
              :enabled="portraitAscii"
              :visible="visible"
              @update:enabled="setPortraitAscii"
            />
          </div>
          <div class="about-copy">
            <h1>{{ profile.name }}</h1>
            <p class="subtitle">{{ profile.subtitle }}</p>
            <p class="intro">{{ profile.intro }}</p>
            <p class="intro">{{ profile.bio }}</p>
            <div class="about-bottom">
              <div class="about-links">
                <!-- a windows group box, the etched frame with its title in the border -->
                <fieldset class="lift-box">
                  <legend>lifts (lb)</legend>
                  <dl>
                    <div v-for="[lift, weight] in profile.lifts" :key="lift">
                      <dt>{{ lift }}</dt>
                      <dd>{{ weight }}</dd>
                    </div>
                  </dl>
                </fieldset>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <footer class="status-bar">
      <span>{{ hoveredPlace ? registry[hoveredPlace.id].label : 'About Me' }}</span>
      <span>{{ projects.length }} projects</span>
    </footer>
  </div>

  <!-- projects folder, explorer style: the selected file's details on the left,
       the files as big icons on the right like a my computer folder -->
  <div v-else-if="win.type === 'projects'" class="app-layout">
    <div class="toolbar explorer-toolbar">
      <div class="explorer-folder inset" aria-hidden="true">
        <RetroIcon name="folder" small/>
        <span>Projects</span>
      </div>
      <span class="toolbar-separator" aria-hidden="true"/>
      <!-- large icons or details, like the view buttons on a windows 95 folder -->
      <div class="view-toggle" role="group" aria-label="View">
        <button
          v-for="v in projectViews"
          :key="v.id"
          class="raised view-button"
          :class="{ pressed: projectView === v.id }"
          :aria-pressed="projectView === v.id"
          :aria-label="v.label"
          :title="v.label"
          @click="setProjectView(v.id)"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path :d="v.glyph" fill="currentColor" fill-rule="evenodd"/></svg>
        </button>
      </div>
    </div>
    <div class="address-bar">
      <span>Address</span>
      <div class="inset address-with-icon"><RetroIcon name="folder" small/>Portfolio:\Projects</div>
    </div>
    <div class="project-explorer content-scroll inset">
      <aside class="project-preview">
        <RetroIcon :name="selected.icon"/>
        <h2>{{ selected.name }}</h2>
        <p>{{ selected.summary }}</p>
        <small><TechList :items="selected.tech" chips/></small>
        <button class="raised" @click="emit('open', selected.id)">View project →</button>
      </aside>
      <div
        :class="projectView === 'details' ? ['project-details', { 'fixed-columns': columns }] : 'project-icons'"
        :style="projectView === 'details' ? { '--details-columns': detailsColumns() } : null"
        role="group"
        aria-label="Projects"
      >
        <div v-if="projectView === 'details'" ref="detailsHeader" class="list-header" aria-hidden="true">
          <span>Name<i class="col-resize" @pointerdown.prevent="resizeColumn('name', $event)"/></span>
          <span>Modified<i class="col-resize" @pointerdown.prevent="resizeColumn('date', $event)"/></span>
          <span>Type<i class="col-resize" @pointerdown.prevent="resizeColumn('kind', $event)"/></span>
          <span class="col-filler"/>
        </div>
        <!-- hovering a file (or selecting it) shows an open button under its name -->
        <div v-for="p in projects" :key="p.id" :class="['project-item', { selected: selected.id === p.id }]">
          <button
            class="project-file"
            :aria-pressed="selected.id === p.id"
            :title="projectView === 'details' ? null : p.kind"
            @click="selected = p"
            @dblclick="emit('open', p.id)"
            @keydown.enter.prevent="emit('open', p.id)"
          >
            <RetroIcon :name="p.icon" :small="projectView === 'details'"/>
            <span>{{ p.name }}</span>
            <template v-if="projectView === 'details'">
              <small class="col-date">{{ p.date }}</small>
              <small class="col-kind">{{ p.kind }}</small>
            </template>
          </button>
          <button class="row-open raised" :title="`Open ${p.name} in its own window`" @click="emit('open', p.id)">
            Open<span class="sr-only"> {{ p.name }}</span>
          </button>
        </div>
      </div>
    </div>
    <footer class="status-bar"><span>{{ selected.name }} · {{ selected.kind }}</span><span>{{ projects.length }} objects</span></footer>
  </div>

  <!-- a single project -->
  <div v-else-if="win.type === 'project'" class="app-layout">
    <div class="toolbar ie-toolbar">
      <button class="ie-button" title="Back to the projects folder" @click="emit('open', 'projects')">
        <RetroIcon name="folder"/>
        <span>All projects</span>
      </button>
      <a v-if="win.project.demo" class="ie-button icon-button" :href="win.project.demo" target="_blank" rel="noopener" title="Try the live demo in a new tab">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path class="page" d="M1 3h9v12H1z"/><path d="M1 3h9v1H1zM1 14h9v1H1zM1 3h1v12H1zM9 9h1v6H9zM3 6h4v1H3zM3 8h3v1H3zM3 10h4v1H3z"/><path class="accent" d="M9 1h6v6h-1V3h-1v1h-1v1h-1v1h-1v1H9V6h1V5h1V4h1V3h1V2H9z"/></svg>
        <span>Open demo</span>
      </a>
      <!-- projects that have a playable version in the games folder -->
      <button v-if="win.project.game" class="ie-button" :title="`Play ${registry[win.project.game].label} in the Games folder`" @click="emit('open', win.project.game)">
        <RetroIcon :name="registry[win.project.game].icon"/>
        <span>Play it</span>
      </button>
    </div>
    <article class="content-scroll document pixel-headings">
      <p class="eyebrow">{{ win.project.kind }}<template v-if="win.project.date"> / {{ win.project.date }}</template></p>
      <h1>{{ win.project.name }}</h1>
      <p class="intro">{{ win.project.summary }}</p>
      <p class="tech-line"><TechList :items="win.project.tech" chips/></p>
      <template v-if="win.project.contribution">
        <h2>What I built</h2>
        <p>{{ win.project.contribution }}</p>
      </template>
      <h2>Implementation</h2>
      <p v-for="paragraph in [win.project.implementation].flat()" :key="paragraph">{{ paragraph }}</p>
      <template v-if="win.project.outcomes">
        <h2>Results</h2>
        <ul>
          <li v-for="outcome in win.project.outcomes" :key="outcome">{{ outcome }}</li>
        </ul>
      </template>
    </article>
    <footer class="status-bar"><span>Project information</span><span>{{ win.project.tech[0] }}</span></footer>
  </div>

  <!-- experience -->
  <div v-else-if="win.type === 'experience'" class="app-layout">
    <div class="toolbar"><RetroIcon name="document" small/><span>Experience.txt</span></div>
    <article class="content-scroll document pixel-headings">
      <p class="eyebrow">WORK & EDUCATION</p>
      <h1>Experience</h1>
      <section v-for="role in roles" :key="role.company" class="role">
        <p class="role-date">{{ role.dates }} · {{ role.location }}</p>
        <h2>{{ role.company }}</h2>
        <strong>{{ role.role }}</strong>
        <ul>
          <li v-for="bullet in role.bullets" :key="bullet"><InlineText :text="bullet" /></li>
        </ul>
      </section>
      <section class="role">
        <h2>University of Toronto</h2>
        <p>{{ profile.education }}</p>
        <h3>Tools I’ve worked with</h3>
        <p><TechList :items="profile.skills" chips/></p>
      </section>
    </article>
    <footer class="status-bar"><span>{{ roles.length }} roles</span><span>Jason Tang</span></footer>
  </div>

  <!-- resume pdf -->
  <div v-else-if="win.type === 'resume'" class="app-layout">
    <div class="toolbar ie-toolbar">
      <a class="ie-button icon-button" :href="resumeUrl" target="_blank" rel="noopener" title="Open PDF in a new tab">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path class="page" d="M1 3h9v12H1z"/><path d="M1 3h9v1H1zM1 14h9v1H1zM1 3h1v12H1zM9 9h1v6H9zM3 6h4v1H3zM3 8h3v1H3zM3 10h4v1H3z"/><path class="accent" d="M9 1h6v6h-1V3h-1v1h-1v1h-1v1h-1v1H9V6h1V5h1V4h1V3h1V2H9z"/></svg>
        <span>Open PDF</span>
      </a>
      <a class="ie-button icon-button" :href="resumeUrl" download="Jason_Tang_Resume.pdf" title="Download PDF">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path class="accent" d="M7 1h2v7h2v1h-1v1H9v1H7v-1H6V9H5V8h2z"/><path d="M1 10h1v4h12v-4h1v5H1z"/></svg>
        <span>Download</span>
      </a>
    </div>
    <object class="resume-viewer" :data="resumeUrl" type="application/pdf" aria-label="Jason Tang resume">
      <p>Your browser cannot display this PDF. <a :href="resumeUrl">Open PDF</a>.</p>
    </object>
  </div>

  <Game v-else-if="win.type === 'contact'" :active="active" @unlock="(id, message) => emit('unlock', id, message)"/>
  <Mail v-else-if="win.type === 'mail'"/>
  <Music v-else-if="win.type === 'music'" :win="win"/>
  <Pictures v-else-if="win.type === 'pictures'" :visible="visible"/>
  <Analytics v-else-if="win.type === 'analytics'"/>
  <Blog v-else-if="win.type === 'blog'"/>
  <!-- the games and fun stuff folders: a big icon for each app inside -->
  <div v-else-if="folders[win.type]" class="app-layout">
    <div class="address-bar"><span>Address</span><div class="inset">Portfolio:\{{ win.label }}</div></div>
    <div class="content-scroll games-folder inset">
      <button v-for="id in folders[win.type]" :key="id" class="game-shortcut" @click="emit('open', id)">
        <RetroIcon :name="registry[id].icon"/><span>{{ registry[id].label }}</span>
      </button>
    </div>
    <footer class="status-bar"><span>{{ folders[win.type].length }} {{ win.type === 'games' ? 'games' : 'items' }}</span></footer>
  </div>
  <Snake v-else-if="win.type === 'snake'" :active="active"/>
  <Minesweeper v-else-if="win.type === 'minesweeper'" :active="active" :win="win"/>
  <Reversi v-else-if="win.type === 'reversi'" :active="active"/>

  <!-- desktop settings -->
  <div v-else-if="win.type === 'settings'" class="app-layout">
    <div class="content-scroll settings-content">
      <h1>Desktop Settings</h1>
      <div class="monitor-preview inset">
        <span class="wallpaper-tone" :style="{ '--tone-filter': wallpaperFilter(wallpaper), backgroundColor: wallpaper }"/>
        <RetroIcon name="computer"/>
        <span>Jason’s desktop</span>
      </div>
      <fieldset>
        <legend>Appearance</legend>
        <div class="theme-choices" role="group" aria-label="Color theme">
          <button
            v-for="mode in ['light', 'dark']"
            :key="mode"
            class="raised"
            :class="{ pressed: theme === mode }"
            :aria-pressed="theme === mode"
            @click="setTheme(mode)"
          >
            <RetroIcon :name="mode === 'light' ? 'sun' : 'moon'" small/>
            {{ mode === 'light' ? 'Light' : 'Dark' }}
          </button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Desktop color</legend>
        <div class="swatches">
          <button
            v-for="{ label, color, filter } in wallpapers"
            :key="color"
            class="swatch raised"
            :aria-label="label"
            :aria-pressed="wallpaper === color"
            :title="label"
            @click="emit('wallpaper', color)"
          >
            <span class="wallpaper-tone" :style="{ '--tone-filter': filter, backgroundColor: color }"/>
            <span v-if="wallpaper === color">✓</span>
          </button>
        </div>
        <button class="raised settings-reset" @click="emit('wallpaper', defaultWallpaper)">Reset wallpaper</button>
      </fieldset>
      <fieldset>
        <legend>Sound</legend>
        <div class="settings-volume">
          <RetroIcon :name="sound && level ? 'sound' : 'mute'" small/>
          <input
            type="range"
            min="0"
            max="100"
            :value="level"
            aria-label="Volume"
            :disabled="!sound"
            @input="setSoundLevel(Number($event.target.value))"
          >
          <span class="settings-volume-level">{{ sound ? level : 'Off' }}</span>
        </div>
        <label class="settings-check">
          <input type="checkbox" :checked="!sound" @change="setSoundEnabled(!$event.target.checked)">
          Mute
        </label>
      </fieldset>
      <fieldset>
        <legend>Taskbar</legend>
        <!-- phones always keep it at the bottom, so the edge choice is desktop only -->
        <div class="taskbar-edges" role="group" aria-label="Taskbar position">
          <button
            v-for="e in edges"
            :key="e.id"
            class="raised"
            :class="{ pressed: taskbarEdge === e.id }"
            :aria-pressed="taskbarEdge === e.id"
            @click="taskbarEdge !== e.id && setTaskbarEdge(e.id)"
          >
            <svg viewBox="0 0 12 10" aria-hidden="true">
              <path class="taskbar-edge-screen" d="M0 0h12v10H0z"/>
              <path class="taskbar-edge-bar" :d="{ bottom: 'M0 8h12v2H0z', top: 'M0 0h12v2H0z', left: 'M0 0h2v10H0z', right: 'M10 0h2v10h-2z' }[e.id]"/>
            </svg>
            {{ e.label }}
          </button>
        </div>
        <label class="settings-check">
          <input type="checkbox" :checked="autoHide" @change="setAutoHide($event.target.checked)">
          Automatically hide the taskbar
        </label>
      </fieldset>
    </div>
    <footer class="status-bar"><span>Display properties</span></footer>
  </div>

  <Stickies v-else-if="win.type === 'stickies'" @open="id => emit('open', id)" @close="id => emit('close', id)"/>
  <StickyNote v-else-if="win.type === 'sticky'" :win="win" @open="id => emit('open', id)" @close="id => emit('close', id)"/>
</template>
