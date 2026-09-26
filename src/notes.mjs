// the little pixel music notes that float out of the cd player while it plays,
// and (smaller) out of the cd player button on the about page when you hover it.
// each glyph is a grid of X pixels turned into one svg path

function pixelNote(rows) {
  const d = rows
    .flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : '')))
    .join('');
  return { w: rows[0].length, h: rows.length, d };
}

export const noteGlyphs = [
  // eighth note
  pixelNote([
    '...XX....',
    '...XXX...',
    '...X.XX..',
    '...X..XX.',
    '...X...X.',
    '...X.....',
    '...X.....',
    '.XXX.....',
    'XXXX.....',
    'XXXX.....',
    '.XX......',
  ]),
  // two beamed notes
  pixelNote([
    '...XXXXXXX',
    '...XXXXXXX',
    '...X.....X',
    '...X.....X',
    '...X.....X',
    '...X.....X',
    '.XXX...XXX',
    'XXXX..XXXX',
    'XXXX..XXXX',
    '.XX....XX.',
  ]),
  // quarter note
  pixelNote(['...X', '...X', '...X', '...X', '...X', '...X', '.XXX', 'XXXX', 'XXXX', '.XX.']),
];

export const noteColors = ['#000080', '#800080', '#008080', '#800000'];
