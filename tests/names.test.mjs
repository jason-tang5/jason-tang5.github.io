import test from 'node:test';
import assert from 'node:assert/strict';
import { nameProblem, cleanName } from '../src/names.mjs';

test('ordinary names are fine', () => {
  for (const name of ['Jason', 'xX_snek_Xx', 'Sam 2', 'Hancock', 'Classic', 'grape.ape', 'Nigel', 'torpedo', 'Siegfried', 'assassin', 'Dickens', 'Scunthorpe', '']) {
    assert.equal(nameProblem(name), '', name);
  }
  assert.equal(cleanName('  Big   Al  '), 'Big Al');
});
test('rude names are blocked, including letter swaps and stretched letters', () => {
  for (const name of ['fuck', 'FUUUCK', 'sh1t', 'b!tch', 'a55', '@ss', 'my ass', 'Dick', 'shit_head', 'c0ck', 'n4zi', 'Hitler']) {
    assert.notEqual(nameProblem(name), '', name);
    assert.equal(cleanName(name), '', name);
  }
});
test('names are short and plain', () => {
  assert.match(nameProblem('a'.repeat(13)), /12 characters/);
  assert.match(nameProblem('<script>'), /only/);
  assert.equal(cleanName({ toString: () => 'x' }), 'x');
});
