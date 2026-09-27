import test from 'node:test';
import assert from 'node:assert/strict';
import { nameProblem, cleanName, tidyName } from '../src/names.mjs';

test('ordinary names are fine and come out in capitals', () => {
  for (const name of ['JASON', 'Jason', 'Hancock', 'Classic', 'Nigel', 'torpedo', 'Siegfried', 'assassin', 'Dickens', 'Scunthorpe', '']) {
    assert.equal(nameProblem(name), '', name);
  }
  assert.equal(cleanName('  Jason  '), 'JASON');
});
test('rude names are blocked, including stretched letters and hidden words', () => {
  for (const name of ['fuck', 'FUUUCK', 'Dick', 'shithead', 'ASS', 'Hitler', 'nazi', 'COCK']) {
    assert.notEqual(nameProblem(name), '', name);
    assert.equal(cleanName(name), '', name);
  }
});
test('names are short and capital letters only', () => {
  assert.match(nameProblem('A'.repeat(13)), /12 characters/);
  for (const name of ['Sam 2', 'sh1t', 'x_x', '<script>']) assert.match(nameProblem(name), /Capital letters only/, name);
  assert.equal(cleanName({ toString: () => 'x' }), 'X');
  assert.equal(tidyName('sam 2-go!'), 'SAMGO');
});
