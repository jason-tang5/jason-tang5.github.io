// 2048 on a 4x4 board, kept like the fpga version (see the fpga 2048 project): the
// board is 16 cells of 4 bits each, 64 bits in all, and a cell holds the tile's power
// of two, so 0 is empty, 1 is a 2, 2 is a 4 ... 11 is 2048. index = y * 4 + x.
// a slide happens in two steps, like on the slides: equal tiles combine, skipping
// the gaps between them, then everything compacts to the side it was pushed to.
// plain js with no vue in it, so it's tested in node.
export const size = 4;
export const winAt = 11; // 2 ** 11 = 2048

export const value = power => (power ? 2 ** power : 0);

// the vga adapter only had 3-bit colour, so these eight, given out as on the real
// board: 2 yellow, 4 green, 8 red ... 2048 black. ink is the number's colour
export const rgb = { black: '#000000', blue: '#2a3cff', green: '#3cf23c', cyan: '#3ce8ff', red: '#ff3c3c', magenta: '#df3cff', yellow: '#fff03c', white: '#f4f4f4' };
const tileColors = [null, 'yellow', 'green', 'red', 'cyan', 'magenta', 'blue', 'white', 'yellow', 'green', 'red', 'black'];
export const tileColor = power => rgb[tileColors[power] || 'white'];
export const tileInk = power => (['blue', 'black'].includes(tileColors[power] || 'white') ? '#f4f4f4' : '#161616');
export const emptyBoard = () => Array(size * size).fill(0);

// the cells of each line, listed from the side the tiles are pushed toward
function lines(direction) {
  const out = [];
  for (let i = 0; i < size; i++) {
    const line = [];
    for (let j = 0; j < size; j++) {
      if (direction === 'left') line.push(i * size + j);
      if (direction === 'right') line.push(i * size + size - 1 - j);
      if (direction === 'up') line.push(j * size + i);
      if (direction === 'down') line.push((size - 1 - j) * size + i);
    }
    out.push(line);
  }
  return out;
}

// one line, already ordered from the pushed-to side: combine, then compact.
// returns the new powers plus, for each tile, where it came from
export function slideLine(powers) {
  const tiles = powers.map((power, from) => ({ power, from: [from] })).filter(t => t.power);
  const combined = [];
  for (let i = 0; i < tiles.length; i++) {
    const next = tiles[i + 1];
    if (next && next.power === tiles[i].power) {
      combined.push({ power: tiles[i].power + 1, from: [...tiles[i].from, ...next.from], merged: true });
      i++;
    } else combined.push(tiles[i]);
  }
  const out = Array(powers.length).fill(0);
  combined.forEach((t, i) => { out[i] = t.power; });
  return { powers: out, tiles: combined };
}

// slides the whole board. moves lists each tile's trip (from and to cell indexes,
// and whether it merged there), for the animation. gained is the points scored
export function slide(board, direction) {
  const next = emptyBoard();
  const moves = [];
  let gained = 0;
  for (const cells of lines(direction)) {
    const { tiles } = slideLine(cells.map(i => board[i]));
    tiles.forEach((t, i) => {
      const to = cells[i];
      next[to] = t.power;
      if (t.merged) gained += value(t.power);
      for (const from of t.from) moves.push({ from: cells[from], to, merged: Boolean(t.merged) });
    });
  }
  const moved = next.some((power, i) => power !== board[i]);
  return { board: next, moved, gained, moves };
}

// a new 2 (or a 4, one time in ten) in a random empty cell. returns the new board
// and where it landed, or null when the board is full
export function addTile(board, random = Math.random) {
  const empty = board.flatMap((power, i) => (power ? [] : [i]));
  if (!empty.length) return null;
  const at = empty[Math.floor(random() * empty.length)];
  const next = [...board];
  next[at] = random() < 0.9 ? 1 : 2;
  return { board: next, at };
}

export function newGame(random = Math.random) {
  const first = addTile(emptyBoard(), random);
  return addTile(first.board, random).board;
}

// the game's over when nothing can move, not just when the board is full: a full
// board can still merge (the "game over check" the fpga version never got to)
export const canMove = board => ['left', 'right', 'up', 'down'].some(d => slide(board, d).moved);
export const hasWon = board => board.some(power => power >= winAt);

// the board as the fpga's 64-bit register, cell 0 in the lowest 4 bits, as hex
export function toRegister(board) {
  return board.reduceRight((hex, power) => hex + power.toString(16), '');
}
