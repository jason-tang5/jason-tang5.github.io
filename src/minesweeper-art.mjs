// pixel art for minesweeper. it's all svg paths so it stays crisp at any zoom.
// each bitmap is a list of rows, and every "on" pixel becomes a 1x1 square.
export function bitmapPath(rows, on = '1') {
  let d = '';
  rows.forEach((row, y) => {
    [...row].forEach((pixel, x) => {
      if (pixel === on) d += `M${x} ${y}h1v1h-1z`;
    });
  });
  return d;
}

// chunky 8x8 numbers with two pixel strokes, like the classic game
const digitRows = {
  1: ['...11...', '..111...', '.1111...', '...11...', '...11...', '...11...', '.111111.', '.111111.'],
  2: ['.111111.', '11....11', '......11', '....111.', '..111...', '.11.....', '11111111', '11111111'],
  3: ['1111111.', '......11', '......11', '..11111.', '......11', '......11', '11111111', '1111111.'],
  4: ['...1111.', '..11.11.', '.11..11.', '11...11.', '11111111', '11111111', '.....11.', '.....11.'],
  5: ['11111111', '11......', '11......', '1111111.', '......11', '......11', '11111111', '1111111.'],
  6: ['.111111.', '11......', '11......', '1111111.', '11....11', '11....11', '11111111', '.111111.'],
  7: ['11111111', '11111111', '......11', '.....11.', '....11..', '...11...', '...11...', '...11...'],
  8: ['.111111.', '11....11', '11....11', '.111111.', '11....11', '11....11', '11111111', '.111111.'],
};
export const digits = Object.fromEntries(
  Object.entries(digitRows).map(([n, rows]) => [n, bitmapPath(rows)]),
);

// 13x13 mine traced from the original. k = black body, w = the white shine
const mine = [
  '......k......',
  '......k......',
  '..k.kkkkk.k..',
  '...kkkkkkk...',
  '..kkwwkkkkk..',
  '..kkwwkkkkk..',
  'kkkkkkkkkkkkk',
  '..kkkkkkkkk..',
  '..kkkkkkkkk..',
  '...kkkkkkk...',
  '..k.kkkkk.k..',
  '......k......',
  '......k......',
];
export const mineBody = bitmapPath(mine, 'k');
export const mineShine = bitmapPath(mine, 'w');

// the win9x flag, cropped to the 8x10 pixels it actually uses. r = red cloth, k = pole
const flag = [
  '...rr...',
  '.rrrr...',
  'rrrrr...',
  '.rrrr...',
  '...rr...',
  '....k...',
  '....k...',
  '..kkkk..',
  'kkkkkkkk',
  'kkkkkkkk',
];
export const flagCloth = bitmapPath(flag, 'r');
export const flagPole = bitmapPath(flag, 'k');

// 17x17 smiley traced from the original game. every mood shares the same
// head, then adds its own eyes and mouth on top. y = yellow, k = outline
const head = [
  '......kkkkk......',
  '....kkyyyyykk....',
  '...kyyyyyyyyyk...',
  '..kyyyyyyyyyyyk..',
  '.kyyyyyyyyyyyyyk.',
  '.kyyyyyyyyyyyyyk.',
  'kyyyyyyyyyyyyyyyk',
  'kyyyyyyyyyyyyyyyk',
  'kyyyyyyyyyyyyyyyk',
  'kyyyyyyyyyyyyyyyk',
  'kyyyyyyyyyyyyyyyk',
  '.kyyyyyyyyyyyyyk.',
  '.kyyyyyyyyyyyyyk.',
  '..kyyyyyyyyyyyk..',
  '...kyyyyyyyyyk...',
  '....kkyyyyykk....',
  '......kkkkk......',
];
export const faceFill = bitmapPath(head, 'y');
export const faceOutline = bitmapPath(head, 'k');

// face features as "x,y" pixel lists, way shorter than full bitmaps for a few dots
const eyes = '5,5 6,5 5,6 6,6 10,5 11,5 10,6 11,6';
const smile = '4,10 5,11 6,12 7,12 8,12 9,12 10,12 11,11 12,10';
const moods = {
  smile: `${eyes} ${smile}`,
  surprised: `${eyes} 7,10 8,10 9,10 6,11 10,11 6,12 10,12 7,13 8,13 9,13`,
  dead: '4,4 6,4 5,5 4,6 6,6 10,4 12,4 11,5 10,6 12,6 6,10 7,10 8,10 9,10 10,10 5,11 11,11 4,12 12,12',
  cool: `3,5 4,5 5,5 6,5 7,5 8,5 9,5 10,5 11,5 12,5 13,5 4,6 5,6 6,6 7,6 9,6 10,6 11,6 12,6 5,7 6,7 10,7 11,7 2,6 14,6 ${smile}`,
};

function points(list) {
  return list
    .split(' ')
    .map(point => {
      const [x, y] = point.split(',');
      return `M${x} ${y}h1v1h-1z`;
    })
    .join('');
}

export const faces = Object.fromEntries(
  Object.entries(moods).map(([mood, list]) => [mood, points(list)]),
);

// seven segment led digits on a 13x23 grid, used by the mine counter and timer.
// each segment is a polygon, and segmentsOn says which ones light up per character
const segments = {
  a: '2,1 11,1 9,3 4,3',
  b: '12,2 12,10 10,9 10,4',
  c: '12,13 12,21 10,19 10,14',
  d: '2,22 11,22 9,20 4,20',
  e: '1,13 3,14 3,19 1,21',
  f: '1,2 3,4 3,9 1,10',
  g: '2,11.5 4,10.5 9,10.5 11,11.5 9,12.5 4,12.5',
};
export const segmentPolygons = Object.entries(segments).map(([name, pts]) => ({ name, pts }));

export const segmentsOn = {
  0: 'abcdef',
  1: 'bc',
  2: 'abdeg',
  3: 'abcdg',
  4: 'bcfg',
  5: 'acdfg',
  6: 'acdefg',
  7: 'abc',
  8: 'abcdefg',
  9: 'abcdfg',
  '-': 'g',
};
