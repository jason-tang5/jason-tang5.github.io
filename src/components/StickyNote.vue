<script setup>
// one sticky note in its own window. there's no normal title bar: the coloured
// bar on top is what you drag (DesktopWindow looks for data-drag-handle), with
// new note, the colour/list/delete menu and close on it, like windows 10.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { addNote, deleteNote, editNote, findNote, glyphs, noteColors, openNotes, recolorNote } from '../stickies.js';

const props = defineProps({ win: Object });
const emit = defineEmits(['open', 'close']);

const note = computed(() => findNote(props.win.noteId));
const menuOpen = ref(false);
const confirmDelete = ref(false);
const editor = ref(null);

function closeMenu() {
  menuOpen.value = false;
  confirmDelete.value = false;
}
function menuBlur(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
}

function del() {
  if (!confirmDelete.value) { confirmDelete.value = true; return; }
  emit('close', props.win.id);
  deleteNote(note.value);
}

// brand new notes are empty, so put the cursor straight in
onMounted(async () => {
  openNotes.value.add(props.win.noteId);
  await nextTick();
  if (note.value && !note.value.text) editor.value?.focus();
});
onBeforeUnmount(() => openNotes.value.delete(props.win.noteId));
</script>

<template>
  <div v-if="note" class="sticky-note" :style="{ '--note': noteColors[note.color] ?? noteColors.yellow }">
    <header class="sticky-bar" data-drag-handle>
      <button class="stickies-button" title="New note" aria-label="New note" @click="emit('open', addNote(note.color))">
        <svg viewBox="0 0 9 9" aria-hidden="true"><path :d="glyphs.plus"/></svg>
      </button>
      <div class="sticky-menu-wrap" @focusout="menuBlur">
        <button class="stickies-button" title="Note options" aria-label="Note options" :aria-expanded="menuOpen" @click="menuOpen ? closeMenu() : (menuOpen = true)">
          <svg viewBox="0 0 9 9" aria-hidden="true"><path :d="glyphs.dots"/></svg>
        </button>
        <div v-if="menuOpen" class="sticky-menu">
          <div class="sticky-colors" role="group" aria-label="Note color">
            <button
              v-for="(hex, name) in noteColors"
              :key="name"
              :style="{ background: hex }"
              :aria-label="name"
              :title="name"
              :aria-pressed="note.color === name"
              @click="recolorNote(note, name)"
            >
              <svg v-if="note.color === name" viewBox="0 0 9 9" aria-hidden="true"><path :d="glyphs.check"/></svg>
            </button>
          </div>
          <button class="sticky-menu-item" @click="closeMenu(); emit('open', 'stickies')">
            <svg viewBox="0 0 9 9" aria-hidden="true"><path :d="glyphs.list"/></svg>
            Notes list
          </button>
          <button class="sticky-menu-item" :class="{ confirm: confirmDelete }" @click="del">
            <svg viewBox="0 0 9 9" aria-hidden="true"><path :d="glyphs.trash" fill-rule="evenodd"/></svg>
            {{ confirmDelete ? 'Click again to delete' : 'Delete note' }}
          </button>
        </div>
      </div>
      <button class="stickies-button sticky-close" data-sound="none" title="Close note" aria-label="Close note" @click="emit('close', win.id)">
        <svg viewBox="0 0 9 9" aria-hidden="true"><path :d="glyphs.close"/></svg>
      </button>
    </header>
    <textarea
      ref="editor"
      :value="note.text"
      aria-label="Note text"
      placeholder="Take a note…"
      spellcheck="false"
      @input="editNote(note, $event.target.value)"
    />
  </div>
</template>
