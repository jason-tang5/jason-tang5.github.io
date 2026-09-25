// window geometry, adapted from don chia's vue os template state model
// (see licenses/vuejs-os-template-MIT.txt). it's plain js with no vue in it so
// the tests can run in node without a browser.

export const bounds = w => ({ x: w.x, y: w.y, width: w.width, height: w.height });

// keeps a window inside the work area and at least its minimum size
export function clampBounds(w, area) {
  const width = Math.min(Math.max(w.minWidth || 1, w.width), area.width);
  const height = Math.min(Math.max(w.minHeight || 1, w.height), area.height);
  return {
    width,
    height,
    x: Math.max(0, Math.min(w.x, area.width - width)),
    y: Math.max(0, Math.min(w.y, area.height - height)),
  };
}

// edge is some combo of n/s/e/w depending on which handle is being dragged.
// dragging the left or top edge moves x/y and keeps the opposite edge pinned.
export function resizeBounds(start, edge, dx, dy, area) {
  let { x, y, width, height } = start;
  const minW = Math.min(start.minWidth, area.width);
  const minH = Math.min(start.minHeight, area.height);

  if (edge.includes('e')) {
    width = Math.min(area.width - x, Math.max(minW, width + dx));
  }
  if (edge.includes('s')) {
    height = Math.min(area.height - y, Math.max(minH, height + dy));
  }
  if (edge.includes('w')) {
    const right = x + width;
    x = Math.max(0, Math.min(x + dx, right - minW));
    width = right - x;
  }
  if (edge.includes('n')) {
    const bottom = y + height;
    y = Math.max(0, Math.min(y + dy, bottom - minH));
    height = bottom - y;
  }

  return { x, y, width, height };
}

// new windows cascade down and to the right, wrapping every 6 so they don't walk off screen
export function createWindow(app, index, area) {
  const offset = (index % 6) * 28;
  const position = clampBounds({
    ...app,
    x: Math.round(area.width * 0.23) + offset,
    y: Math.round(area.height * 0.13) + offset,
  }, area);

  return {
    ...app,
    ...position,
    minimized: false,
    maximized: false,
    restoreBounds: null,
    z: index + 1,
  };
}

// opens a window off to the right of one that's already on screen, so it doesn't
// land right on top of it. it hugs the right edge of the desktop, but always starts
// at least 80px right of the anchor so the anchor's left side stays visible.
// more windows opened this way stagger down and to the left.
export function placeBeside(app, anchor, index, area) {
  const stagger = (index % 4) * 28;
  const position = clampBounds({
    ...app,
    x: Math.max(anchor.x + 80, area.width - app.width - 24 - stagger),
    y: anchor.y + 40 + stagger,
  }, area);

  return { ...createWindow(app, index, area), ...position };
}

export function toggleMaximize(w, area) {
  if (w.maximized) {
    // the screen might have shrunk while maximized, so re-clamp on the way back
    Object.assign(w, clampBounds({ ...w, ...w.restoreBounds }, area));
    w.maximized = false;
  } else {
    w.restoreBounds = bounds(w);
    w.maximized = true;
  }
}

// the topmost window that isn't minimized, or null if there isn't one
export function nextVisible(windows) {
  const open = windows.filter(w => !w.minimized).sort((a, b) => b.z - a.z);
  return open[0]?.id || null;
}
