// the pixel balloon that floats up over the about window, and the balloon icon that
// lets them go, so the button looks like what comes out of it.
// the balloon is a little sprite, 14 pixels across, drawn in four frames instead of
// being rotated: it leans left with the string trailing right, stretches tall, leans
// right with the string trailing left, then squashes wide, like it's bobbing on air
const balloonBodies = {
  round: [4, 8, 10, 12, 12, 12, 12, 12, 12, 10, 8, 6, 4, 2],
  tall: [4, 6, 10, 10, 12, 12, 12, 12, 10, 10, 8, 6, 4, 2],
  wide: [6, 10, 12, 14, 14, 14, 14, 12, 12, 10, 8, 4, 2],
};
const rowPath = (widths, shift = 0, y0 = 0) => widths.map((w, y) => (w > 0 ? `M${(14 - w) / 2 + shift} ${y0 + y}h${w}v1h-${w}z` : '')).join('');
// the string, as how far each pixel sits from under the knot, top to bottom
const balloonStrings = { right: [0, 0, 1, 1, 2, 2, 1, 1, 0], straight: [0, 0, 0, 1, 1, 0, 0, -1, -1], left: [0, 0, -1, -1, -2, -2, -1, -1, 0], wiggle: [0, 1, 1, 0, 0, -1, -1, 0, 0] };
function balloonFrame(body, shift, string) {
  const rows = balloonBodies[body];
  const y0 = 24 - rows.length - 1 - 9;
  const knotY = y0 + rows.length;
  const left = (14 - rows[3]) / 2 + shift;
  return {
    outline: rowPath(rows, shift, y0),
    fill: rowPath(rows.map((w, y) => Math.min(w, rows[y - 1] ?? 0, rows[y + 1] ?? 0) - 2), shift, y0),
    shine: `M${left + 2} ${y0 + 3}h2v1h-2zM${left + 2} ${y0 + 4}h1v2h-1z`,
    knot: `M${6 + shift} ${knotY}h2v1h-2z`,
    string: balloonStrings[string].map((dx, i) => `M${7 + shift + dx} ${knotY + 1 + i}h1v1h-1z`).join(''),
  };
}
// a fifth frame hangs round and upright, for the ends of a sway where it stops
export const balloonFrames = [balloonFrame('round', -1, 'right'), balloonFrame('tall', 0, 'straight'), balloonFrame('round', 1, 'left'), balloonFrame('wide', 0, 'wiggle'), balloonFrame('round', 0, 'straight')];
// [body, outline and knot]
export const balloonColors = [['#e8413c', '#8e1c18'], ['#f5c542', '#8a6410'], ['#3f7fe0', '#1c3f80'], ['#43b85c', '#1d6a2e'], ['#ee6fb4', '#8a2a60'], ['#f08c2e', '#8a4a10'], ['#9a62dc', '#4e2a80']];
export const balloonString = '#6b6b66';
