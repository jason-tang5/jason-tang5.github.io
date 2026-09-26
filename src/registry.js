// every app that can open as a window. sizes are the default width/height,
// then the minimum width/height the window can be resized down to.
import { projects } from './content.mjs';

const app = (id, label, icon, width, height, minWidth = 340, minHeight = 260) => ({
  id,
  label,
  icon,
  width,
  height,
  minWidth,
  minHeight,
});

export const apps = [
  app('about', 'About Jason', 'person', 900, 740, 430, 350),
  app('projects', 'Projects', 'folder', 720, 480, 430, 310),
  app('experience', 'Experience', 'case', 680, 570, 410, 310),
  app('resume', 'Resume', 'document', 740, 650),
  app('contact', 'Contact', 'mail', 440, 540, 340, 400),
  app('pictures', 'My Pictures', 'pictures', 760, 720, 340, 400),
  app('settings', 'Desktop Settings', 'settings', 470, 420),
  app('notepad', 'Notepad', 'notepad', 520, 420),
  app('music', 'CD Player', 'music', 306, 160, 306, 160),
  app('blog', 'Blog', 'document', 720, 580),
  app('games', 'Games', 'folder', 440, 350, 300, 270),
  app('snake', 'Snake', 'snake', 520, 590, 340, 420),
  app('minesweeper', 'Minesweeper', 'mine', 300, 400, 250, 330),
];

for (const a of apps) {
  a.desktop = !['settings', 'notepad', 'minesweeper', 'snake'].includes(a.id); // gets a desktop icon
  a.menu = !['settings', 'minesweeper', 'snake'].includes(a.id); // shows up in the start menu
  a.fixedSize = ['minesweeper', 'music'].includes(a.id);
}

// old links used #app=breakout, the game lives in contact now
export const canonicalApp = id => (id === 'breakout' ? 'contact' : id);

// each project also opens as its own window from the projects folder
export const projectApps = projects.map(p => ({
  ...app(p.id, p.name, p.icon, 690, 550, 400, 310),
  type: 'project',
  project: p,
}));

export const registry = Object.fromEntries(
  [...apps, ...projectApps].map(a => [a.id, { ...a, type: a.type || a.id }]),
);

export const shortcuts = apps.filter(a => a.desktop);
export const menuApps = apps.filter(a => a.menu);
