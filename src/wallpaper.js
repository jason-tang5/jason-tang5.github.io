// the desktop is always the animated sunset; each colour choice re-tints it with
// a css filter. the hex values are what earlier visits saved, so they stay the keys.
export const wallpapers = [
  { label: 'Sunset', color: '#008080', filter: 'none' },
  { label: 'Midnight blue', color: '#18334f', filter: 'hue-rotate(-70deg) saturate(1.1)' },
  { label: 'Slate', color: '#576575', filter: 'grayscale(.85) brightness(.95)' },
  { label: 'Forest', color: '#3c6255', filter: 'hue-rotate(150deg) saturate(.9)' },
  { label: 'Plum', color: '#62465e', filter: 'hue-rotate(-35deg) saturate(.8) brightness(.9)' },
];

export const defaultWallpaper = wallpapers[0].color;
export const wallpaperFilter = color => (wallpapers.find(w => w.color === color) ?? wallpapers[0]).filter;
