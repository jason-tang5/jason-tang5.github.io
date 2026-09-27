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
  // the desktop icons and start menu follow this order
  app('about', 'About Me', 'person', 900, 740, 430, 350),
  app('resume', 'Resume', 'document', 740, 650),
  app('experience', 'Experience', 'case', 680, 570, 410, 310),
  app('projects', 'Projects', 'folder', 720, 480, 430, 310),
  app('blog', 'Blog', 'notebook', 720, 580),
  app('contact', 'Contact', 'contact', 460, 680, 340, 520),
  app('games', 'Games', 'games', 440, 350, 300, 270),
  app('funstuff', 'Fun Stuff', 'funstuff', 440, 350, 300, 270),
  // opened from the start menu, shows every app in one folder view
  app('computer', 'All Apps', 'computer', 480, 440, 300, 270),
  app('pictures', 'My Pictures', 'pictures', 760, 720, 340, 400),
  app('settings', 'Desktop Settings', 'settings', 470, 730),
  app('stickies', 'Sticky Notes', 'sticky', 340, 520, 280, 300),
  app('music', 'CD Player', 'music', 360, 490, 335, 312),
  app('analytics', 'Analytics', 'chart', 720, 640),
  app('snake', 'Snake', 'snake', 400, 700, 340, 560),
  app('minesweeper', 'Minesweeper', 'mine', 300, 400, 250, 330),
  app('reversi', 'Reversi', 'reversi', 420, 660, 320, 480),
  // locked until you beat the breakout game in contact, see unlock() in App.vue
  app('mail', 'Mail', 'mail', 500, 450, 360, 330),
];

// the apps that live inside the games and fun stuff folders instead of on the desktop
export const folders = {
  games: ['minesweeper', 'snake', 'reversi'],
  funstuff: ['pictures', 'stickies', 'music', 'analytics'],
};
const tucked = ['settings', 'mail', 'computer', ...Object.values(folders).flat()];
// all apps holds everything, including what's inside the other folders
folders.computer = apps.map(a => a.id).filter(id => id !== 'computer');

for (const a of apps) {
  a.desktop = !tucked.includes(a.id); // gets a desktop icon
  a.menu = !tucked.includes(a.id); // shows up in the start menu
  a.fixedSize = false;
  a.locked = a.id === 'mail'; // can't be opened until something unlocks it
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
