import test from 'node:test';
import assert from 'node:assert/strict';
import { slideLine, slide, addTile, newGame, canMove, hasWon, toRegister, emptyBoard, value } from '../src/twenty48.mjs';

test('a line combines equal tiles across gaps, then compacts', () => {
  // the example from the slides: 2 _ 2 _ slid right is _ _ _ 4
  assert.deepEqual(slideLine([0, 1, 0, 1]).powers, [2, 0, 0, 0]);
  assert.deepEqual(slideLine([1, 1, 1, 1]).powers, [2, 2, 0, 0]);
  assert.deepEqual(slideLine([1, 1, 2, 0]).powers, [2, 2, 0, 0]);
  assert.deepEqual(slideLine([2, 1, 1, 0]).powers, [2, 2, 0, 0]);
  assert.deepEqual(slideLine([1, 2, 3, 4]).powers, [1, 2, 3, 4]);
});

test('sliding the board in each direction, with the score and tile trips', () => {
  const board = emptyBoard();
  board[0] = 1; board[2] = 1; // 2 _ 2 _ on the top row
  const right = slide(board, 'right');
  assert.equal(right.board[3], 2);
  assert.equal(right.gained, 4);
  assert.ok(right.moved);
  assert.deepEqual(right.moves.map(m => m.from).sort(), [0, 2]);
  assert.ok(right.moves.every(m => m.to === 3 && m.merged));
  const down = slide(board, 'down');
  assert.equal(down.board[12], 1);
  assert.equal(down.board[14], 1);
  assert.equal(down.gained, 0);
  const up = slide(board, 'up');
  assert.equal(up.moved, false);
});

test('new tiles land in empty cells, and a full board has none', () => {
  const full = Array(16).fill(1);
  assert.equal(addTile(full), null);
  const start = newGame(() => 0.5);
  assert.equal(start.filter(Boolean).length, 2);
});

test('the game only ends when nothing can move', () => {
  const stuck = [1, 2, 1, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 1];
  assert.equal(canMove(stuck), false);
  const fullButMergeable = [...stuck];
  fullButMergeable[1] = 1;
  assert.equal(canMove(fullButMergeable), true);
  assert.equal(hasWon(emptyBoard()), false);
  assert.equal(hasWon([11, ...Array(15).fill(0)]), true);
  assert.equal(value(11), 2048);
});

test('the board reads as a 64-bit register, 4 bits a tile', () => {
  const board = emptyBoard();
  board[0] = 1; board[15] = 11;
  assert.equal(toRegister(board), 'b000000000000001');
  assert.equal(toRegister(board).length, 16);
});
