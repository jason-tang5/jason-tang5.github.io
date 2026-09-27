<script setup>
// picks what goes inside each window based on its type. the small apps live
// right here, the bigger ones have their own components.
import { defineAsyncComponent, onBeforeUnmount, ref } from 'vue';
import { profile, projects, roles } from '../content.mjs';
import AsciiImage from './AsciiImage.vue';
import Analytics from './Analytics.vue';
import Blog from './Blog.vue';
import Music from './Music.vue';
import Mail from './Mail.vue';
import Pictures from './Pictures.vue';
import RetroIcon from './RetroIcon.vue';
import InlineText from './InlineText.vue';
import TechList from './TechList.vue';
import { read, save, remove } from '../storage.js';
import { noteGlyphs, noteColors } from '../notes.mjs';
import { play } from '../sound.js';

// the games only load when someone actually opens them
const Game = defineAsyncComponent(() => import('./Game.vue'));
const Snake = defineAsyncComponent(() => import('./Snake.vue'));
const Minesweeper = defineAsyncComponent(() => import('./Minesweeper.vue'));

defineProps({
  win: Object,
  active: Boolean,
  wallpaper: String,
  visible: Boolean,
});
const emit = defineEmits(['open', 'unlock', 'wallpaper']);

const selected = ref(projects[0]);
const resumeUrl = `${import.meta.env.BASE_URL}assets/Jason_Tang_Resume.pdf`;
const portraitUrl = new URL('../../assets/profile.jpg', import.meta.url).href;
const portraitHint = ref(true);
const portraitAscii = ref(read('portrait-ascii', 'on') !== 'off');

const colors = [
  ['Classic teal', '#008080'],
  ['Midnight blue', '#18334f'],
  ['Slate', '#576575'],
  ['Forest', '#3c6255'],
  ['Plum', '#62465e'],
];

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

const note = ref(read('note'));
const noteStatus = ref('');

function setPortraitAscii(value) {
  portraitHint.value = false;
  portraitAscii.value = value;
  save('portrait-ascii', value ? 'on' : 'off');
}

function saveNote() {
  noteStatus.value = save('note', note.value)
    ? 'saved!'
    : 'Storage is unavailable. Your note is still here until this window closes.';
}

function clearSaved() {
  remove('note');
  noteStatus.value = 'Saved copy cleared. The text in this window is unchanged.';
}
</script>

<template>
  <!-- about -->
  <div v-if="win.type === 'about'" class="app-layout about-app">
    <div class="content-scroll about-content">
      <!-- contact and the cd player as two unlabelled icons in the top right.
           the envelope wiggles on hover, the cd spins, plays a tune and puffs out notes -->
      <div class="about-shortcuts raised">
        <button class="about-shortcut about-contact" aria-label="Contact" @click="emit('open', 'contact')">
          <RetroIcon name="mail" />
        </button>
        <button
          class="about-shortcut"
          aria-label="CD Player"
          @click="emit('open', 'music')"
          @pointerenter="startCd"
          @pointerleave="stopCd"
          @focus="startCd"
          @blur="stopCd"
        >
          <span ref="cdDisc" class="about-cd-disc" :class="{ spinning: cdSpinning }" aria-hidden="true"/>
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
            <!-- the lifts box stretches to exactly the width of the button row above it -->
            <div class="about-links">
              <div class="button-row">
                <button class="raised" @click="emit('open', 'projects')">Projects</button>
                <button class="raised" @click="emit('open', 'experience')">Experience</button>
                <button class="raised" @click="emit('open', 'resume')">Resume</button>
                <button class="raised" @click="emit('open', 'blog')">Blog</button>
              </div>
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
    <footer class="status-bar"><span>{{ projects.length }} projects</span></footer>
  </div>

  <!-- projects folder, explorer style -->
  <div v-else-if="win.type === 'projects'" class="app-layout">
    <div class="toolbar">
      <button class="raised" @click="emit('open', selected.id)">Open selected</button>
      <span class="toolbar-link">{{ projects.length }} projects</span>
    </div>
    <div class="address-bar">
      <span>Address</span>
      <div class="inset">Portfolio:\Projects</div>
    </div>
    <div class="project-explorer content-scroll inset">
      <aside class="project-preview">
        <RetroIcon :name="selected.icon"/>
        <h2>{{ selected.name }}</h2>
        <p>{{ selected.summary }}</p>
        <small><TechList :items="selected.tech" chips/></small>
        <button class="raised" @click="emit('open', selected.id)">View project →</button>
      </aside>
      <div class="project-list">
        <div class="list-header"><span>Name</span><span>Type</span></div>
        <button
          v-for="p in projects"
          :key="p.id"
          :class="['project-row', { selected: selected.id === p.id }]"
          @click="selected = p"
          @dblclick="emit('open', p.id)"
          @keydown.enter.prevent="emit('open', p.id)"
        >
          <RetroIcon :name="p.icon" small/>
          <span>{{ p.name }}</span>
          <small>{{ p.kind }}</small>
        </button>
        <p class="list-help">Select a file to preview.<br>Double-click or press Enter to open.</p>
      </div>
    </div>
    <footer class="status-bar"><span>{{ selected.name }}</span><span>1 object selected</span></footer>
  </div>

  <!-- a single project -->
  <div v-else-if="win.type === 'project'" class="app-layout">
    <div class="toolbar">
      <button class="raised" @click="emit('open', 'projects')">All projects</button>
      <a v-if="win.project.demo" class="raised link-button" :href="win.project.demo" target="_blank" rel="noopener">Open demo ↗ <span class="sr-only">(new tab)</span></a>
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
      <p>{{ win.project.implementation }}</p>
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
    <div class="toolbar">
      <a class="raised link-button" :href="resumeUrl" target="_blank" rel="noopener">Open PDF</a>
      <a class="raised link-button" :href="resumeUrl" download="Jason_Tang_Resume.pdf">Download</a>
      <button class="raised" @click="emit('open', 'experience')">View experience</button>
    </div>
    <object class="resume-viewer" :data="resumeUrl" type="application/pdf" aria-label="Jason Tang resume">
      <p>Your browser cannot display this PDF. <a :href="resumeUrl">Open PDF</a> or <button @click="emit('open', 'experience')">View experience</button>.</p>
    </object>
  </div>

  <Game v-else-if="win.type === 'contact'" :active="active" @unlock="(id, message) => emit('unlock', id, message)"/>
  <Mail v-else-if="win.type === 'mail'"/>
  <Music v-else-if="win.type === 'music'" :win="win"/>
  <Pictures v-else-if="win.type === 'pictures'" :visible="visible"/>
  <Analytics v-else-if="win.type === 'analytics'"/>
  <Blog v-else-if="win.type === 'blog'"/>
  <div v-else-if="win.type === 'games'" class="app-layout">
    <div class="address-bar"><span>Address</span><div class="inset">Portfolio:\Games</div></div>
    <div class="content-scroll games-folder inset">
      <button class="game-shortcut" @click="emit('open', 'minesweeper')">
        <RetroIcon name="mine"/><span>Minesweeper</span>
      </button>
      <button class="game-shortcut" @click="emit('open', 'snake')">
        <RetroIcon name="snake"/><span>Snake</span>
      </button>
    </div>
    <footer class="status-bar"><span>2 games</span></footer>
  </div>
  <Snake v-else-if="win.type === 'snake'" :active="active"/>
  <Minesweeper v-else-if="win.type === 'minesweeper'" :active="active" :win="win"/>

  <!-- desktop settings -->
  <div v-else-if="win.type === 'settings'" class="app-layout">
    <div class="content-scroll settings-content">
      <h1>Desktop Settings</h1>
      <div class="monitor-preview inset" :style="{ background: wallpaper }">
        <RetroIcon name="computer"/>
        <span>Jason’s desktop</span>
      </div>
      <fieldset>
        <legend>Desktop tint</legend>
        <div class="swatches">
          <button
            v-for="[label, color] in colors"
            :key="color"
            class="swatch raised"
            :style="{ background: color }"
            :aria-label="label"
            :aria-pressed="wallpaper === color"
            :title="label"
            @click="emit('wallpaper', color)"
          >
            <span v-if="wallpaper === color">✓</span>
          </button>
        </div>
      </fieldset>
      <button class="raised" @click="emit('wallpaper', '#008080')">Reset wallpaper</button>
    </div>
    <footer class="status-bar"><span>Display properties</span></footer>
  </div>

  <!-- notepad, saves to localstorage only if you ask it to -->
  <div v-else-if="win.type === 'notepad'" class="app-layout">
    <div class="toolbar">
      <button class="raised" @click="saveNote">Save locally</button>
      <button class="raised" @click="clearSaved">Clear saved copy</button>
    </div>
    <textarea
      v-model="note"
      class="notepad inset"
      aria-label="Your local note"
      placeholder="Write a note"
      spellcheck="false"
    />
    <footer class="status-bar note-status" role="status"><span>{{ noteStatus }}</span></footer>
  </div>
</template>
