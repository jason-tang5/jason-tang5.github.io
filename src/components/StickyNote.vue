<script setup>
// one sticky note in its own window. there's no normal title bar: the coloured
// bar on top is what you drag (DesktopWindow looks for data-drag-handle), with
// new note, the colour/list/delete menu and close on it, like windows 10.
// while the note has focus a formatting bar shows along the bottom, again like
// windows: bold, italic, underline, strikethrough and bullets (see note-format.js)
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { addNote, deleteNote, editNote, findNote, glyphs, noteColors, openNotes, recolorNote } from '../stickies.js';
import { formats, sanitize, textToHtml } from '../note-format.js';

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

// the editor is filled once when the window opens and then left to the browser,
// so re-rendering never moves the cursor. every edit saves both versions
const empty = ref(true);
function save() {
  const text = editor.value.innerText.replace(/\n$/, '');
  const html = sanitize(editor.value.innerHTML);
  empty.value = !text.trim() && !html.includes('<li>');
  editNote(note.value, text, html);
}

// which formats are on where the cursor is, so their buttons show pressed
const active = reactive({});
function refresh() {
  if (!editor.value?.contains(document.getSelection()?.anchorNode)) return;
  for (const f of formats) active[f.command] = document.queryCommandState(f.command);
}

function format(command) {
  editor.value.focus();
  document.execCommand(command);
  refresh();
  save();
}

// ctrl+b, i and u are built into the browser. strikethrough and bullets get the
// same shortcuts as windows sticky notes
function keys(event) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  const command = key === 't' && !event.shiftKey ? 'strikeThrough' : key === 'l' && event.shiftKey ? 'insertUnorderedList' : null;
  if (!command) return;
  event.preventDefault();
  format(command);
}

// pasting brings in plain text only, never another page's fonts and colours
function paste(event) {
  event.preventDefault();
  document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
}

onMounted(async () => {
  openNotes.value.add(props.win.noteId);
  if (!note.value) return;
  // write <b> and <i> tags rather than inline styles
  document.execCommand('styleWithCSS', false, false);
  editor.value.innerHTML = note.value.html != null ? sanitize(note.value.html) : textToHtml(note.value.text);
  empty.value = !note.value.text.trim() && !editor.value.querySelector('li');
  document.addEventListener('selectionchange', refresh);
  // brand new notes are empty, so put the cursor straight in
  await nextTick();
  if (!note.value.text) editor.value.focus();
});
onBeforeUnmount(() => {
  openNotes.value.delete(props.win.noteId);
  document.removeEventListener('selectionchange', refresh);
});
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
    <div
      ref="editor"
      :class="['sticky-editor', { empty }]"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      aria-label="Note text"
      data-placeholder="Take a note…"
      spellcheck="false"
      @input="save"
      @keydown="keys"
      @paste="paste"
    />
    <!-- mousedown is cancelled so pressing a button doesn't take the cursor out of the note -->
    <div class="sticky-format" role="toolbar" aria-label="Formatting" @mousedown.prevent>
      <button
        v-for="f in formats"
        :key="f.command"
        class="stickies-button"
        :class="{ on: active[f.command] }"
        :title="`${f.label} (${f.key})`"
        :aria-label="f.label"
        :aria-pressed="!!active[f.command]"
        @click="format(f.command)"
      >
        <svg viewBox="0 0 9 9" aria-hidden="true"><path :d="f.glyph"/></svg>
      </button>
    </div>
  </div>
</template>
