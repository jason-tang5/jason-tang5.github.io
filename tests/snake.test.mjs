import test from 'node:test';
import assert from 'node:assert/strict';
import { newSnake, stepSnake, placeFood, columns, rows } from '../src/snake.mjs';

test('snake moves, refuses reversal, and grows only when eating', () => {
  const state = newSnake();
  state.food = { x: 8, y: 8 };
  const next = stepSnake(state, 'left');
  assert.equal(next.direction, 'right');
  assert.equal(next.body.length, 4);
  assert.equal(next.score, 1);
  assert.ok(!next.body.some(p => p.x === next.food.x && p.y === next.food.y));
  assert.equal(stepSnake({ ...next, food: { x: 0, y: 0 } }, 'up').body.length, 4);
});

test('walls and body end the game, but a vacating tail is safe', () => {
  assert.equal(stepSnake({ ...newSnake(), body: [{ x: columns - 1, y: 8 }] }).over, true);
  const loop = { ...newSnake(), direction: 'up', body: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }], food: { x: 0, y: 0 } };
  assert.equal(stepSnake(loop, 'right').over, false);
  loop.body.push({ x: 4, y: 2 });
  assert.equal(stepSnake(loop, 'right').over, true);
});

test('food placement handles a nearly full and completely full board', () => {
  const body = Array.from({ length: columns * rows }, (_, i) => ({ x: i % columns, y: Math.floor(i / columns) }));
  assert.equal(placeFood(body), null);
  const last = body.pop();
  assert.deepEqual(placeFood(body), last);
});
