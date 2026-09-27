// reversi on an 8x8 board. cells are 0 for empty, 1 for black (you), 2 for white (the bot).
// black moves first. the board is a flat array of 64, index = y * 8 + x.
export const size = 8;
export const black = 1;
export const white = 2;
export const other = player => 3 - player;

const steps = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

export function newBoard() {
  const board = Array(size * size).fill(0);
  board[27] = white; board[28] = black;
  board[35] = black; board[36] = white;
  return board;
}

// the discs a move at index would flip, empty if the move isn't legal
export function flipsFor(board, index, player) {
  if (board[index]) return [];
  const x0 = index % size;
  const y0 = Math.floor(index / size);
  const flips = [];
  for (const [dx, dy] of steps) {
    const line = [];
    let x = x0 + dx;
    let y = y0 + dy;
    while (x >= 0 && x < size && y >= 0 && y < size && board[y * size + x] === other(player)) {
      line.push(y * size + x);
      x += dx;
      y += dy;
    }
    if (line.length && x >= 0 && x < size && y >= 0 && y < size && board[y * size + x] === player) flips.push(...line);
  }
  return flips;
}

export function legalMoves(board, player) {
  const moves = [];
  for (let i = 0; i < board.length; i++) if (!board[i] && flipsFor(board, i, player).length) moves.push(i);
  return moves;
}

// returns a new board, or null if the move isn't legal
export function play(board, index, player) {
  const flips = flipsFor(board, index, player);
  if (!flips.length) return null;
  const next = board.slice();
  next[index] = player;
  for (const i of flips) next[i] = player;
  return next;
}

export function count(board) {
  let b = 0;
  let w = 0;
  for (const cell of board) {
    if (cell === black) b++;
    else if (cell === white) w++;
  }
  return { [black]: b, [white]: w };
}

export const gameOver = board => !legalMoves(board, black).length && !legalMoves(board, white).length;

// ---- the bot ----
// a classic positional table: corners are gold, the squares next to them are poison
// until the corner is taken, edges are decent
const weights = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];
const corners = [0, 7, 56, 63];
// each x or c square and the corner it hangs off
const nextToCorner = [[1, 0], [8, 0], [9, 0], [6, 7], [15, 7], [14, 7], [48, 56], [57, 56], [49, 56], [62, 63], [55, 63], [54, 63]];

// how good the board looks for player: position, mobility, corners, and near the end
// just the disc count
export function evaluate(board, player) {
  const them = other(player);
  const discs = count(board);
  if (gameOver(board)) return (discs[player] - discs[them]) * 1000;
  const empty = 64 - discs[player] - discs[them];
  let position = 0;
  for (let i = 0; i < 64; i++) {
    if (!board[i]) continue;
    let w = weights[i];
    // once a corner is taken the squares beside it stop being dangerous
    const corner = nextToCorner.find(([square]) => square === i);
    if (corner && board[corner[1]]) w = 5;
    position += board[i] === player ? w : -w;
  }
  const mine = legalMoves(board, player).length;
  const theirs = legalMoves(board, them).length;
  const mobility = mine + theirs ? (100 * (mine - theirs)) / (mine + theirs) : 0;
  const cornerScore = corners.reduce((sum, c) => sum + (board[c] === player ? 25 : board[c] === them ? -25 : 0), 0);
  const parity = empty < 14 ? (discs[player] - discs[them]) * 4 : 0;
  return position + mobility * 0.8 + cornerScore + parity;
}

function search(board, player, turn, depth, alpha, beta) {
  if (depth === 0 || gameOver(board)) return evaluate(board, player);
  const moves = legalMoves(board, turn);
  // no move means a pass, the other side goes again
  if (!moves.length) return search(board, player, other(turn), depth, alpha, beta);
  if (turn === player) {
    let best = -Infinity;
    for (const m of ordered(moves)) {
      best = Math.max(best, search(play(board, m, turn), player, other(turn), depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of ordered(moves)) {
    best = Math.min(best, search(play(board, m, turn), player, other(turn), depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

// try the moves that look best on the table first so alpha-beta cuts more
const ordered = moves => moves.slice().sort((a, b) => weights[b] - weights[a]);

// looks a few moves ahead with alpha-beta and plays the best one. ties are broken at
// random so the bot doesn't play the same game every time. returns -1 with no move
export function bestMove(board, player, { depth = 4, random = Math.random } = {}) {
  const moves = legalMoves(board, player);
  if (!moves.length) return -1;
  const empty = board.filter(cell => !cell).length;
  // near the end the tree is small, so look deeper and play it out properly
  const lookahead = empty <= 10 ? Math.max(depth, empty) : depth;
  let best = [];
  let bestScore = -Infinity;
  for (const m of ordered(moves)) {
    const score = search(play(board, m, player), player, other(player), lookahead - 1, -Infinity, Infinity);
    if (score > bestScore) { bestScore = score; best = [m]; }
    else if (score === bestScore) best.push(m);
  }
  return best[Math.floor(random() * best.length)];
}
