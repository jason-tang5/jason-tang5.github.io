import test from 'node:test';
import assert from 'node:assert/strict';
import { black, white, newBoard, legalMoves, flipsFor, play, count, gameOver, bestMove, other } from '../src/reversi.mjs';

test('the opening has four moves for black', () => {
  assert.deepEqual(legalMoves(newBoard(), black), [19, 26, 37, 44]);
});

test('a move flips the discs it brackets', () => {
  const board = play(newBoard(), 19, black);
  assert.equal(board[19], black);
  assert.equal(board[27], black);
  assert.deepEqual(count(board), { [black]: 4, [white]: 1 });
});

test('illegal moves are refused', () => {
  assert.equal(play(newBoard(), 0, black), null);
  assert.equal(play(newBoard(), 27, black), null);
  assert.deepEqual(flipsFor(newBoard(), 0, black), []);
});

test('the bot always picks a legal move', () => {
  let board = newBoard();
  let turn = black;
  while (!gameOver(board)) {
    const moves = legalMoves(board, turn);
    if (moves.length) {
      const move = bestMove(board, turn, { depth: 2 });
      assert.ok(moves.includes(move));
      board = play(board, move, turn);
    }
    turn = other(turn);
  }
  const discs = count(board);
  assert.ok(discs[black] + discs[white] <= 64);
});

test('the bot beats a random mover almost every time', () => {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let wins = 0;
  for (let game = 0; game < 10; game++) {
    let board = newBoard();
    let turn = black;
    while (!gameOver(board)) {
      const moves = legalMoves(board, turn);
      if (moves.length) {
        const move = turn === white ? bestMove(board, white, { depth: 3, random }) : moves[Math.floor(random() * moves.length)];
        board = play(board, move, turn);
      }
      turn = other(turn);
    }
    const discs = count(board);
    if (discs[white] > discs[black]) wins++;
  }
  assert.ok(wins >= 9, `won ${wins} of 10`);
});
