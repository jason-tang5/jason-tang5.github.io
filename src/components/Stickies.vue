<script setup>
// the sticky notes list, drawn like the windows 10 app in pixels. each note opens
// in its own window (StickyNote.vue) that can be dragged anywhere on the desktop.
import { computed, ref } from 'vue';
import { addNote, deleteNote, glyphs, noteColors, notes, openNotes, storageFailed, windowId } from '../stickies.js';

const emit = defineEmits(['open', 'close']);
const search = ref('');
// the note whose ... menu is open, and whether delete is waiting for a second click
const menuFor = ref(null);
const confirmDelete = ref(false);

const shown = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? notes.value.filter(n => n.text.toLowerCase().includes(q)) : notes.value;
});

function add() {
  search.value = '';
  emit('open', addNote());
}

// time for today, day and month this past year, and the year too after that
function when(time) {
  const date = new Date(time);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const yearAgo = new Date(now);
  yearAgo.setFullYear(now.getFullYear() - 1);
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', ...(date < yearAgo && { year: 'numeric' }) });
}
const firstLine = note => note.text.trim().split(/\r?\n/)[0] || 'Empty note';

function toggleMenu(note) {
  menuFor.value = menuFor.value === note.id ? null : note.id;
  confirmDelete.value = false;
}
function menuBlur(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) menuFor.value = null;
}

function openOrClose(note) {
  menuFor.value = null;
  emit(openNotes.value.has(note.id) ? 'close' : 'open', windowId(note.id));
}

function del(note) {
  if (!confirmDelete.value) { confirmDelete.value = true; return; }
  menuFor.value = null;
  if (openNotes.value.has(note.id)) emit('close', windowId(note.id));
  deleteNote(note);
}
</script>

<template>
  <section class="stickies" aria-label="Sticky notes">
    <header class="stickies-bar">
      <button class="stickies-button" title="New note" aria-label="New note" @click="add">
        <svg viewBox="0 0 9 9" aria-hidden="true"><path :d="glyphs.plus"/></svg>
      </button>
    </header>
    <h2>Sticky Notes</h2>
    <label class="stickies-search">
      <input v-model="search" type="search" aria-label="Search notes" placeholder="Search…">
      <svg viewBox="0 0 9 9" aria-hidden="true"><path :d="glyphs.search"/></svg>
    </label>
    <p v-if="!notes.length" class="stickies-empty">No notes yet. Press + to write one.</p>
    <p v-else-if="!shown.length" class="stickies-empty">No notes match.</p>
    <ul>
      <li
        v-for="note in shown"
        :key="note.id"
        class="sticky-card-wrap"
        :class="{ 'menu-open': menuFor === note.id }"
        :style="{ '--note': noteColors[note.color] ?? noteColors.yellow }"
      >
        <button
          class="sticky-card"
          :aria-label="`Open note: ${firstLine(note)}`"
          @click="emit('open', windowId(note.id))"
        >
          <span :class="{ empty: !note.text.trim() }">{{ note.text.trim() || 'Empty note' }}</span>
        </button>
        <time>{{ when(note.updated) }}</time>
        <div class="sticky-card-menu" @focusout="menuBlur">
          <button class="stickies-button" title="Note options" aria-label="Note options" :aria-expanded="menuFor === note.id" @click="toggleMenu(note)">
            <svg viewBox="0 0 9 9" aria-hidden="true"><path :d="glyphs.dots"/></svg>
          </button>
          <div v-if="menuFor === note.id" class="sticky-menu">
            <button class="sticky-menu-item" @click="openOrClose(note)">
              <svg viewBox="0 0 9 9" aria-hidden="true"><path :d="openNotes.has(note.id) ? glyphs.close : glyphs.list"/></svg>
              {{ openNotes.has(note.id) ? 'Close note' : 'Open note' }}
            </button>
            <button class="sticky-menu-item" :class="{ confirm: confirmDelete }" @click="del(note)">
              <svg viewBox="0 0 9 9" aria-hidden="true"><path :d="glyphs.trash" fill-rule="evenodd"/></svg>
              {{ confirmDelete ? 'Click again to delete' : 'Delete note' }}
            </button>
          </div>
        </div>
      </li>
    </ul>
    <p class="stickies-privacy" role="status">{{ storageFailed ? 'Storage unavailable. Notes vanish when this window closes.' : 'Saved in this browser only.' }}</p>
  </section>
</template>
