// the sticky notes, shared by the notes list window and every open note window.
// each note gets its own "sticky-<id>" window in the registry, so notes can be
// dragged around the desktop and come back after a refresh like any other window.
// everything saves to this browser's localstorage, nothing is ever uploaded.
import { ref } from 'vue';
import { registry } from './registry.js';
import { read, save, remove } from './storage.js';

export const noteColors = {
  yellow: '#e6b800',
  green: '#6cbf4a',
  pink: '#e384c3',
  purple: '#b27ee0',
  blue: '#56c1ea',
  gray: '#9a9a9a',
  charcoal: '#4a4a4a',
};

export const windowId = id => `sticky-${id}`;

function register(note) {
  registry[windowId(note.id)] = {
    id: windowId(note.id),
    label: 'Sticky Note',
    icon: 'sticky',
    type: 'sticky',
    noteId: note.id,
    width: 300,
    height: 300,
    minWidth: 220,
    minHeight: 180,
  };
}

function load() {
  try {
    const list = JSON.parse(read('stickies', '[]'));
    if (Array.isArray(list)) return list.filter(n => n && typeof n.id === 'string' && typeof n.text === 'string');
  } catch {}
  return [];
}

export const notes = ref(load());
// ids of notes that have a window on the desktop right now, kept by StickyNote.vue
export const openNotes = ref(new Set());
export const storageFailed = ref(false);

function persist() {
  storageFailed.value = !save('stickies', JSON.stringify(notes.value));
}

// the old notepad kept a single note under "note", carry it over once
const legacy = read('note');
if (legacy) {
  notes.value.unshift({ id: crypto.randomUUID(), text: legacy, color: 'yellow', updated: Date.now() });
  persist();
  if (!storageFailed.value) remove('note');
}
notes.value.forEach(register);

export const findNote = id => notes.value.find(n => n.id === id);

export function addNote(color = 'yellow') {
  const note = { id: crypto.randomUUID(), text: '', color, updated: Date.now() };
  notes.value.unshift(note);
  register(note);
  persist();
  return windowId(note.id);
}

// text is the plain version for the list and search, html the formatted one the
// note window shows (see note-format.js)
export function editNote(note, text, html) {
  note.text = text;
  note.html = html;
  note.updated = Date.now();
  // the note you're typing in floats to the top of the list, like the real thing
  notes.value = [note, ...notes.value.filter(n => n !== note)];
  persist();
}

export function recolorNote(note, color) {
  note.color = color;
  persist();
}

export function deleteNote(note) {
  notes.value = notes.value.filter(n => n !== note);
  delete registry[windowId(note.id)];
  persist();
}

// 9x9 pixel glyphs for the note buttons and menus
export const glyphs = {
  plus: 'M4 0h1v4h4v1H5v4H4V5H0V4h4z',
  dots: 'M0 4h1v1H0zM4 4h1v1H4zM8 4h1v1H8z',
  close: 'M0 0h1v1H0zM8 0h1v1H8zM1 1h1v1H1zM7 1h1v1H7zM2 2h1v1H2zM6 2h1v1H6zM3 3h1v1H3zM5 3h1v1H5zM4 4h1v1H4zM3 5h1v1H3zM5 5h1v1H5zM2 6h1v1H2zM6 6h1v1H6zM1 7h1v1H1zM7 7h1v1H7zM0 8h1v1H0zM8 8h1v1H8z',
  check: 'M8 1h1v1H8zM7 2h1v1H7zM6 3h1v1H6zM0 4h1v1H0zM5 4h1v1H5zM1 5h1v1H1zM4 5h1v1H4zM2 6h2v1H2z',
  list: 'M0 2h9v1H0zM0 4h9v1H0zM0 6h6v1H0z',
  trash: 'M3 0h3v1h3v1H0V1h3zM1 3h7v6H1zM2 3v5h1V3zm2 0v5h1V3zm2 0v5h1V3z',
  search: 'M3 0h3v1H3zM2 1h1v1H2zM6 1h1v1H6zM1 2h1v3H1zM7 2h1v3H7zM2 5h1v1H2zM6 5h1v1H6zM3 6h3v1H3zM6 6h1v1H6zM7 7h1v1H7zM8 8h1v1H8z',
};
