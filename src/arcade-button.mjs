// the round arcade button sprite shared by the snake pad and the breakout cabinet:
// a black outline, a darker rim showing under the cap, the cap with a shine, and an
// up arrow that each button turns to face its own way. drawn on a 16x18 grid
const discRows = { 16: [6, 10, 12, 14, 14, 16, 16, 16, 16, 16, 16, 14, 14, 12, 10, 6], 14: [6, 10, 12, 12, 14, 14, 14, 14, 14, 14, 12, 12, 10, 6] };
const disc = (size, x, y) => discRows[size].map((w, row) => `M${x + (size - w) / 2} ${y + row}h${w}v1h-${w}z`).join('');

export const padShape = {
  outline: disc(16, 0, 0) + disc(16, 0, 2),
  rim: disc(14, 1, 3),
  cap: disc(14, 1, 1),
  shine: 'M4 3h3v1H4zM3 4h2v2H3z',
  arrow: 'M7 4h2v1H7zM6 5h4v1H6zM5 6h6v1H5zM7 7h2v4H7z',
};
