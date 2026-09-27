// the taskbar settings from desktop settings: which edge of the screen it sits on,
// and whether it hides itself until the pointer comes near that edge.
// phones always keep it at the bottom, and hide it by default to give the page the
// whole screen. both choices are remembered in the browser.
import { ref } from 'vue';
import { read, save } from './storage.js';

export const edges = [
  { id: 'bottom', label: 'Bottom' },
  { id: 'top', label: 'Top' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
];

const savedEdge = read('taskbar-edge', 'bottom');
export const taskbarEdge = ref(edges.some(e => e.id === savedEdge) ? savedEdge : 'bottom');

// no saved choice yet means phones hide it and desktops don't
const savedHide = read('taskbar-autohide', '');
export const autoHide = ref(savedHide ? savedHide === 'on' : matchMedia('(max-width: 700px)').matches);

export function setTaskbarEdge(edge) {
  taskbarEdge.value = edge;
  save('taskbar-edge', edge);
}

export function setAutoHide(on) {
  autoHide.value = on;
  save('taskbar-autohide', on ? 'on' : 'off');
}

// the notice that pops up after moving it. it's a fair question
export const edgeNotices = {
  bottom: ['Taskbar is back at the bottom', 'Right where Windows 95 left it. Good call.'],
  top: ['Taskbar moved to the top', 'Why up there? Missing the Mac menu bar? You can put it back in Desktop Settings.'],
  left: ['Taskbar moved to the left', 'Why the left? Were you an Ubuntu person once? You can put it back in Desktop Settings.'],
  right: ['Taskbar moved to the right', 'Why would anyone do that? It does work, though. You can put it back in Desktop Settings.'],
};
