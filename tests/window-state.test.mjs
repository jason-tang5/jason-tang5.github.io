import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampBounds,
  resizeBounds,
  createWindow,
  placeBeside,
  toggleMaximize,
  nextVisible,
  bounds,
} from '../src/window-state.mjs';

const area = { width: 1440, height: 860 };
const app = { id: 'test', width: 690, height: 520, minWidth: 400, minHeight: 260 };

// true if the window sits fully inside the area
const inside = (w, space) => w.x >= 0 && w.y >= 0 && w.x + w.width <= space.width && w.y + w.height <= space.height;

test('cascades remain inside the work area, including a small landscape viewport', () => {
  for (const viewport of [area, { width: 740, height: 290 }]) {
    for (let i = 0; i < 15; i++) {
      assert.ok(inside(createWindow(app, i, viewport), viewport));
    }
  }
});

test('dragging far offscreen and viewport shrink always retain reachable title bars', () => {
  const small = { width: 800, height: 500 };
  for (const [x, y] of [[-999, -999], [9999, 9999]]) {
    assert.ok(inside(clampBounds({ ...app, x, y }, small), small));
  }
});

test('all eight resize handles respect minimum size and screen boundaries', () => {
  const start = { ...app, x: 100, y: 100 };
  for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
    for (const d of [-10000, 10000]) {
      const w = resizeBounds(start, edge, d, d, area);
      assert.ok(w.width >= 400 && w.height >= 260);
      assert.ok(inside(w, area));
    }
  }
});

test('windows opened beside another one sit to its right and stay on screen', () => {
  const anchor = createWindow({ ...app, width: 900, height: 740 }, 0, area);
  for (let i = 1; i < 8; i++) {
    const w = placeBeside(app, anchor, i, area);
    assert.ok(w.x >= anchor.x + 80, 'starts well to the right of the anchor');
    assert.ok(inside(w, area));
  }

  // on a tiny screen it still has to fit, even if that means overlapping more
  const small = { width: 800, height: 500 };
  assert.ok(inside(placeBeside(app, createWindow(app, 0, small), 1, small), small));
});

test('maximize and restore preserve bounds and re-clamp after screen resize', () => {
  const w = createWindow(app, 0, area);
  const original = bounds(w);

  toggleMaximize(w, area);
  assert.equal(w.maximized, true);
  assert.deepEqual(w.restoreBounds, original);

  toggleMaximize(w, area);
  assert.equal(w.maximized, false);
  assert.deepEqual(bounds(w), original);

  // maximize, then restore onto a smaller screen
  toggleMaximize(w, area);
  toggleMaximize(w, { width: 800, height: 600 });
  assert.ok(w.x + w.width <= 800 && w.y + w.height <= 600);
});

test('next focus skips minimized windows and chooses the most recent visible window', () => {
  const windows = [
    { id: 'about', z: 3 },
    { id: 'projects', z: 5, minimized: true },
    { id: 'contact', z: 4 },
  ];
  assert.equal(nextVisible(windows), 'contact');
  assert.equal(nextVisible(windows.map(w => ({ ...w, minimized: true }))), null);
});
