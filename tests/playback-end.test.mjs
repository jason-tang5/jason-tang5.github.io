import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaybackEndTracker } from '../src/playback-end.mjs';

const state = (position, extra = {}) => ({ position, duration: 30000, isPaused: false, isBuffering: false, ...extra });

test('advances once when a preview reaches its end', () => {
  const tracker = createPlaybackEndTracker();
  assert.equal(tracker.update(state(29000)), false);
  assert.equal(tracker.update(state(30000, { isPaused: true })), true);
  assert.equal(tracker.update(state(30000, { isPaused: true })), false);
});

test('handles a cursor reset on completion and the following track', () => {
  const tracker = createPlaybackEndTracker();
  tracker.update(state(29900));
  assert.equal(tracker.update(state(0, { isPaused: true })), true);
  tracker.reset();
  assert.equal(tracker.update(state(0, { isPaused: true })), false);
  tracker.update(state(1000));
  assert.equal(tracker.update(state(30000)), true);
});

test('does not skip on manual pause, ordinary pause, or buffering', () => {
  const tracker = createPlaybackEndTracker();
  tracker.update(state(15000));
  assert.equal(tracker.update(state(15000, { isPaused: true })), false);
  tracker.update(state(29900));
  assert.equal(tracker.update(state(29900, { isPaused: true, isBuffering: true })), false);
  tracker.pause();
  assert.equal(tracker.update(state(29900, { isPaused: true })), false);
  tracker.update(state(29900));
  assert.equal(tracker.update(state(30000)), true);
});

test('uses the reported duration instead of cutting full tracks off at 30 seconds', () => {
  const tracker = createPlaybackEndTracker();
  tracker.update(state(29000, { duration: 202000 }));
  assert.equal(tracker.update(state(30000, { duration: 202000 })), false);
  assert.equal(tracker.update(state(202000, { duration: 202000, isPaused: true })), true);
});
