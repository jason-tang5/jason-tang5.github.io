// animated ascii backdrops for the space around the game boards, in courier text and
// the game's own colours: bricks and sparks drifting up in contact, little snakes
// playing snake in snake, a huge reversi board flipping itself over in reversi, and
// a minefield sweeping itself in minesweeper, and a 2048 board playing itself in 2048.
// they speed up while a game is running, pause when the window isn't in front, and
// stay still for reduced motion.
import { slideLine } from './twenty48.mjs';

// contact: bricks and sparks floating up past the breakout board
export const breakoutScene = {
  light: ['#000080', '#244f9c', '#3972ac', '#538eaf', '#008080', '#379b95', '#7170a0', '#9693b7'],
  dark: ['#6f86ff', '#6a95e6', '#72a8dc', '#86bedb', '#2cc3b9', '#5fd0c8', '#a3a1d8', '#c0bde6'],
  glyphs: ['+', '*', '.', '#', '·', '+', '.', '*'],
  pieces: ['|####|', '[##]', '+---+', '|######|'],
  pieceChance: 0.28,
  alpha: { light: 0.5, dark: 0.7 },
};

// snake: little snakes playing their own game of snake on a grid, turning at right
// angles, wrapping round the edges and growing when they eat the twinkling food
export const snakeScene = {
  light: ['#2f6b3a', '#3f8a4a', '#4f7d3a', '#5a9e5a', '#2e5e4e'],
  dark: ['#7fe08a', '#b2edaa', '#5fc46e', '#9ad89a', '#4fb38a'],
  snakes: true,
  alpha: { light: 0.45, dark: 0.6 },
};

// minesweeper: a big ascii minefield that sweeps itself. patches flood open to show
// their numbers in the classic colours, mines get flagged, and once most of it is
// cleared a mine goes off and the field starts over
export const minesScene = {
  light: { hidden: '#8f8f8f', open: '#a8a8a8', flag: '#c00000', mine: '#000', numbers: ['', '#0000ff', '#008000', '#e00000', '#000080', '#800000', '#008080', '#000', '#606060'] },
  dark: { hidden: '#5a5a66', open: '#3c3c46', flag: '#ff6b6b', mine: '#e8e8e8', numbers: ['', '#7f9cff', '#6fd08a', '#ff7b7b', '#a9b4ff', '#e08a8a', '#5fd0c8', '#e8e8e8', '#a0a0a0'] },
  sweep: true,
  alpha: { light: 0.4, dark: 0.55 },
};

// reversi: the whole backdrop is a board of discs. every so often a disc lands and
// flips a line of its neighbours in each direction, rippling out like a real capture
export const reversiScene = {
  light: ['#5aa574', '#6fb886', '#4c9466', '#86c79a'],
  dark: ['#5fc48a', '#7fd6a2', '#4aa874', '#9ae2b8'],
  discs: true,
  alpha: { light: 0.55, dark: 0.45 },
};

// 2048: a big faint ascii 2048 board behind the monitor. every so often the whole
// field slides one way, equal blocks merge and new ones pop in, like the game
// playing itself. the colours are the fpga's 3-bit ones, toned down
export const tilesScene = {
  light: ['#8a8a1f', '#2f8a2f', '#a33b3b', '#2f8a9a', '#8a3ba3', '#3b4fa3'],
  dark: ['#e0dd6a', '#7fe07f', '#ff8a8a', '#7fe0ea', '#d99aff', '#8f9cff'],
  blocks: true,
  alpha: { light: 0.4, dark: 0.45 },
};

const cell = 12;
const headFor = { right: '>', left: '<', up: '^', down: 'v' };
const moves = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
const turnsFrom = { right: ['up', 'down'], left: ['up', 'down'], up: ['left', 'right'], down: ['left', 'right'] };

export function createBackdrop(canvas, options) {
  if (options.scene?.snakes) return createSnakeField(canvas, options);
  if (options.scene?.discs) return createDiscField(canvas, options);
  if (options.scene?.blocks) return createBlockField(canvas, options);
  if (options.scene?.sweep) return createSweepField(canvas, options);
  return createDrift(canvas, options);
}

function createDrift(canvas, { running, scene = breakoutScene }) {
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let height = 0;
  let items = [];
  let frame = 0;
  let last = 0;
  let active = true;

  // anywhere scatters it over the whole canvas, otherwise it enters from the far edge
  function spawn(anywhere) {
    const piece = Math.random() < scene.pieceChance;
    const depth = 0.35 + Math.random() * 0.65;
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 20,
      text: piece
        ? scene.pieces[Math.floor(Math.random() * scene.pieces.length)]
        : scene.glyphs[Math.floor(Math.random() * scene.glyphs.length)],
      piece,
      size: Math.round(9 + depth * 7),
      depth,
      color: Math.floor(Math.random() * scene.light.length),
      phase: Math.random() * Math.PI * 2,
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = devicePixelRatio || 1;
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.round((width * height) / 2600);
    items = Array.from({ length: count }, () => spawn(true));
    draw(0);
  }

  function draw(dt) {
    const dark = document.documentElement.dataset.theme === 'dark';
    const colors = dark ? scene.dark : scene.light;
    const speed = running() ? 2.6 : 1;
    ctx.clearRect(0, 0, width, height);
    ctx.textBaseline = 'top';
    const now = performance.now() / 1000;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      const step = dt * 14 * p.depth * speed;
      p.y -= step;
      if (p.y < -20) items[i] = spawn(false);
      const twinkle = p.piece ? 1 : 0.5 + 0.5 * Math.sin(now * 2.2 + p.phase);
      ctx.globalAlpha = scene.alpha[dark ? 'dark' : 'light'] * p.depth * twinkle;
      ctx.fillStyle = colors[p.color];
      ctx.font = `bold ${p.size}px 'Courier New', monospace`;
      ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
    }
    ctx.globalAlpha = 1;
  }

  function loop(time) {
    frame = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
    last = time;
    if (!active || document.hidden || reduced.matches) return;
    draw(dt);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  frame = requestAnimationFrame(loop);

  return {
    setActive(value) { active = value; },
    // the theme changed, so repaint in the new colours even when paused
    redraw() { draw(0); },
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}

// the snake scene. every tick each snake steps one cell, sometimes turning a
// corner. the tick gets quicker while a real game is running
function createSnakeField(canvas, { running, scene }) {
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let height = 0;
  let cols = 1;
  let rows = 1;
  let snakes = [];
  let food = [];
  let frame = 0;
  let last = 0;
  let wait = 0;
  let active = true;

  const random = n => Math.floor(Math.random() * n);
  const wrap = (v, n) => (v + n) % n;
  const place = () => ({ x: random(cols), y: random(rows), phase: Math.random() * Math.PI * 2 });

  function newSnake() {
    const direction = Object.keys(moves)[random(4)];
    const [dx, dy] = moves[direction];
    const head = place();
    const length = 3 + random(5);
    const body = Array.from({ length }, (_, i) => ({ x: wrap(head.x - dx * i, cols), y: wrap(head.y - dy * i, rows) }));
    return { body, direction, color: random(scene.light.length), depth: 0.55 + Math.random() * 0.45 };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = devicePixelRatio || 1;
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    cols = Math.max(1, Math.ceil(width / cell));
    rows = Math.max(1, Math.ceil(height / cell));
    const area = cols * rows;
    snakes = Array.from({ length: Math.max(2, Math.round(area / 260)) }, newSnake);
    food = Array.from({ length: Math.max(3, Math.round(area / 150)) }, place);
    draw();
  }

  function step() {
    for (const snake of snakes) {
      // mostly straight on, now and then a right angle turn, never straight back
      if (Math.random() < 0.18) snake.direction = turnsFrom[snake.direction][random(2)];
      const [dx, dy] = moves[snake.direction];
      const head = snake.body[0];
      const next = { x: wrap(head.x + dx, cols), y: wrap(head.y + dy, rows) };
      snake.body.unshift(next);
      const eaten = food.findIndex(f => f.x === next.x && f.y === next.y);
      if (eaten >= 0) {
        food[eaten] = place();
        // grow, but not forever: long snakes shed a few tail pieces
        if (snake.body.length > 14) snake.body.splice(-4);
      } else {
        snake.body.pop();
      }
    }
  }

  function draw() {
    const dark = document.documentElement.dataset.theme === 'dark';
    const colors = dark ? scene.dark : scene.light;
    const alpha = scene.alpha[dark ? 'dark' : 'light'];
    const now = performance.now() / 1000;
    ctx.clearRect(0, 0, width, height);
    ctx.textBaseline = 'top';
    ctx.font = `bold ${cell + 1}px 'Courier New', monospace`;
    for (const f of food) {
      ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(now * 2 + f.phase)));
      ctx.fillStyle = colors[1];
      ctx.fillText('*', f.x * cell + 2, f.y * cell);
    }
    for (const snake of snakes) {
      ctx.globalAlpha = alpha * snake.depth;
      ctx.fillStyle = colors[snake.color];
      snake.body.forEach((part, i) => {
        ctx.fillText(i ? 'o' : headFor[snake.direction], part.x * cell + 2, part.y * cell);
      });
    }
    ctx.globalAlpha = 1;
  }

  function loop(time) {
    frame = requestAnimationFrame(loop);
    const dt = last ? Math.min(100, time - last) : 0;
    last = time;
    if (!active || document.hidden || reduced.matches) return;
    wait -= dt;
    if (wait <= 0) {
      step();
      wait = running() ? 110 : 200;
    }
    draw();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  frame = requestAnimationFrame(loop);

  return {
    setActive(value) { active = value; },
    redraw() { draw(); },
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}

// the reversi scene. each cell holds a dark (@) or light (O) disc. a flip turns the
// disc edge on through ( | ) before it shows the other face, and a capture flips
// its line one cell at a time so it reads as a wave
const discCell = 16;
const flipTime = 320;
const flipFrames = ['(', '|', ')'];

function createDiscField(canvas, { running, scene }) {
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let height = 0;
  let cols = 1;
  let rows = 1;
  let discs = [];
  let frame = 0;
  let last = 0;
  let wait = 0;
  let now = 0;
  let active = true;

  const random = n => Math.floor(Math.random() * n);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = devicePixelRatio || 1;
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    cols = Math.max(1, Math.ceil(width / discCell));
    rows = Math.max(1, Math.ceil(height / discCell));
    discs = Array.from({ length: cols * rows }, () => ({
      dark: Math.random() < 0.5,
      color: random(scene.light.length),
      depth: 0.45 + Math.random() * 0.55,
      flipAt: -Infinity,
    }));
    draw();
  }

  // a disc lands somewhere and captures outwards in every direction
  function capture() {
    const x0 = random(cols);
    const y0 = random(rows);
    const dark = Math.random() < 0.5;
    const flip = (x, y, delay) => {
      const d = discs[y * cols + x];
      if (d.dark === dark) return;
      d.dark = dark;
      d.flipAt = now + delay;
    };
    flip(x0, y0, 0);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const reach = 2 + random(5);
      for (let i = 1; i <= reach; i++) {
        const x = x0 + dx * i;
        const y = y0 + dy * i;
        if (x < 0 || y < 0 || x >= cols || y >= rows) break;
        flip(x, y, i * 90);
      }
    }
  }

  function draw() {
    const dark = document.documentElement.dataset.theme === 'dark';
    const colors = dark ? scene.dark : scene.light;
    const alpha = scene.alpha[dark ? 'dark' : 'light'];
    ctx.clearRect(0, 0, width, height);
    ctx.textBaseline = 'top';
    ctx.font = `bold ${discCell - 2}px 'Courier New', monospace`;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const d = discs[y * cols + x];
        const t = (now - d.flipAt) / flipTime;
        let glyph = d.dark ? '@' : 'O';
        // mid flip: still showing the old face until it starts turning
        if (t < 0) glyph = d.dark ? 'O' : '@';
        else if (t < 1) glyph = flipFrames[Math.min(2, Math.floor(t * 3))];
        // a freshly flipped disc glows for a moment
        const glow = t >= 0 && t < 3.5 ? 1 + (1 - t / 3.5) * 2 : 1;
        ctx.globalAlpha = Math.min(1, alpha * d.depth * glow);
        ctx.fillStyle = colors[d.color];
        ctx.fillText(glyph, x * discCell + 2, y * discCell + 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(time) {
    frame = requestAnimationFrame(loop);
    const dt = last ? Math.min(100, time - last) : 0;
    last = time;
    if (!active || document.hidden || reduced.matches) return;
    now += dt;
    wait -= dt;
    if (wait <= 0) {
      capture();
      // idle it still flips every half second or so, faster while clippy is thinking
      wait = running() ? 260 + Math.random() * 300 : 560 + Math.random() * 720;
    }
    draw();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  frame = requestAnimationFrame(loop);

  return {
    setActive(value) { active = value; },
    redraw() { draw(); },
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}

// the minesweeper scene. every tick one hidden safe cell opens and floods out like a
// real click, a few cells at a time so the opening spreads, and now and then a mine
// next to the cleared ground gets flagged. past 60% cleared a mine goes off, the
// mines show, and a moment later the field is covered back up with new mines
const sweepCell = 14;

function createSweepField(canvas, { running, scene }) {
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let height = 0;
  let cols = 1;
  let rows = 1;
  let field = [];
  let queue = [];
  let frame = 0;
  let last = 0;
  let wait = 0;
  let spread = 0;
  let boomAt = 0;
  let now = 0;
  let active = true;

  const random = n => Math.floor(Math.random() * n);
  const around = i => {
    const x = i % cols;
    const y = Math.floor(i / cols);
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < cols && ny < rows) out.push(ny * cols + nx);
      }
    }
    return out;
  };

  function lay() {
    field = Array.from({ length: cols * rows }, () => ({ mine: Math.random() < 0.15, open: false, flag: false, n: 0, depth: 0.5 + Math.random() * 0.5 }));
    field.forEach((c, i) => { c.n = around(i).filter(j => field[j].mine).length; });
    queue = [];
    boomAt = 0;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = devicePixelRatio || 1;
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    cols = Math.max(1, Math.ceil(width / sweepCell));
    rows = Math.max(1, Math.ceil(height / sweepCell));
    lay();
    draw();
  }

  // click a random covered safe cell
  function click() {
    const hidden = field.map((c, i) => i).filter(i => !field[i].open && !field[i].mine && !field[i].flag);
    if (hidden.length) queue.push(hidden[random(hidden.length)]);
    // flag a mine that borders ground already cleared
    const edge = field.map((c, i) => i).filter(i => field[i].mine && !field[i].flag && around(i).some(j => field[j].open));
    if (edge.length && Math.random() < 0.6) field[edge[random(edge.length)]].flag = true;
  }

  // the flood fill, a handful of cells per step so it visibly spreads
  function flood() {
    for (let step = 0; step < 6 && queue.length; step++) {
      const i = queue.shift();
      const c = field[i];
      if (c.open || c.flag || c.mine) continue;
      c.open = true;
      if (!c.n) queue.push(...around(i).filter(j => !field[j].open));
    }
  }

  function draw() {
    const dark = document.documentElement.dataset.theme === 'dark';
    const colors = dark ? scene.dark : scene.light;
    const alpha = scene.alpha[dark ? 'dark' : 'light'];
    ctx.clearRect(0, 0, width, height);
    ctx.textBaseline = 'top';
    ctx.font = `bold ${sweepCell - 1}px 'Courier New', monospace`;
    field.forEach((c, i) => {
      let glyph = '#';
      let color = colors.hidden;
      if (c.flag) { glyph = 'F'; color = colors.flag; }
      if (boomAt && c.mine) { glyph = '*'; color = colors.mine; }
      else if (c.open) { glyph = c.n ? String(c.n) : '.'; color = c.n ? colors.numbers[c.n] : colors.open; }
      ctx.globalAlpha = alpha * (c.open && !c.n ? 0.6 : c.depth);
      ctx.fillStyle = color;
      ctx.fillText(glyph, (i % cols) * sweepCell + 3, Math.floor(i / cols) * sweepCell + 1);
    });
    ctx.globalAlpha = 1;
  }

  function loop(time) {
    frame = requestAnimationFrame(loop);
    const dt = last ? Math.min(100, time - last) : 0;
    last = time;
    if (!active || document.hidden || reduced.matches) return;
    now += dt;
    if (boomAt) {
      if (now - boomAt > 1600) lay();
      draw();
      return;
    }
    spread -= dt;
    if (spread <= 0) {
      flood();
      spread = 45;
    }
    wait -= dt;
    if (wait <= 0 && !queue.length) {
      click();
      // a new patch opens every 167-333ms mid game, 400-867ms idle
      wait = running() ? 167 + Math.random() * 167 : 400 + Math.random() * 467;
      const safe = field.filter(c => !c.mine).length;
      if (field.filter(c => c.open).length > safe * 0.6) boomAt = now;
    }
    draw();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  frame = requestAnimationFrame(loop);

  return {
    setActive(value) { active = value; },
    redraw() { draw(); },
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}

// the 2048 scene. blocks are ascii boxes on a grid; each slide works out where every
// block goes with the game's own slideLine, glides them there, then merged blocks
// glow and new blocks pop in to keep it packed, around three quarters full. when it
// gets too crowded to move, some blocks go so it never locks up
const blockW = 48;
const blockH = 40;
const glideTime = 260;

function createBlockField(canvas, { running, scene }) {
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, cols = 1, rows = 1;
  let grid = [];
  let sprites = []; // blocks mid-glide: { power, from, to, merged }
  let born = new Map(); // cell -> time it popped in or merged, for the glow
  let glideStart = -Infinity;
  let frame = 0, last = 0, wait = 400, now = 0, active = true;
  const random = n => Math.floor(Math.random() * n);

  function spawn(count) {
    for (let k = 0; k < count; k++) {
      const empty = grid.flatMap((p, i) => (p ? [] : [i]));
      if (!empty.length) return;
      const at = empty[random(empty.length)];
      grid[at] = Math.random() < 0.85 ? 1 : 2;
      born.set(at, now);
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = devicePixelRatio || 1;
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    cols = Math.max(1, Math.ceil(width / blockW));
    rows = Math.max(1, Math.ceil(height / blockH));
    grid = Array(cols * rows).fill(0);
    sprites = [];
    born = new Map();
    spawn(Math.ceil(cols * rows * 0.75));
    draw();
  }

  // every row or column, listed from the side the blocks are pushed toward
  function lines(direction) {
    const out = [];
    const across = direction === 'left' || direction === 'right';
    for (let a = 0; a < (across ? rows : cols); a++) {
      const line = [];
      const length = across ? cols : rows;
      for (let b = 0; b < length; b++) {
        const along = direction === 'right' || direction === 'down' ? length - 1 - b : b;
        line.push(across ? a * cols + along : along * cols + a);
      }
      out.push(line);
    }
    return out;
  }

  function slideAll() {
    const direction = ['left', 'right', 'up', 'down'][random(4)];
    const next = Array(cols * rows).fill(0);
    sprites = [];
    for (const cells of lines(direction)) {
      slideLine(cells.map(i => grid[i])).tiles.forEach((t, k) => {
        const to = cells[k];
        next[to] = Math.min(t.power, 11);
        for (const from of t.from) sprites.push({ power: grid[cells[from]], from: cells[from], to, merged: Boolean(t.merged) });
        if (t.merged) born.set(to, now + glideTime);
      });
    }
    grid = next;
    glideStart = now;
    // too crowded to move: let some blocks go, the big ones first
    const filled = grid.filter(Boolean).length;
    if (filled > cols * rows * 0.92) grid = grid.map(p => (p && Math.random() < 0.08 + p * 0.03 ? 0 : p));
  }

  const cellX = i => (i % cols) * blockW + 2;
  const cellY = i => Math.floor(i / cols) * blockH + 2;

  function drawBlock(power, x, y, glow) {
    const dark = document.documentElement.dataset.theme === 'dark';
    const colors = dark ? scene.dark : scene.light;
    const label = String(2 ** power);
    ctx.globalAlpha = Math.min(1, scene.alpha[dark ? 'dark' : 'light'] * glow);
    ctx.fillStyle = colors[(power - 1) % colors.length];
    ctx.fillText('+----+', x, y);
    ctx.fillText(`|${label.padStart(Math.ceil((4 + label.length) / 2)).padEnd(4)}|`, x, y + 11);
    ctx.fillText('+----+', x, y + 22);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.textBaseline = 'top';
    ctx.font = `bold 11px 'Courier New', monospace`;
    const t = (now - glideStart) / glideTime;
    if (t < 1) {
      // three steps, like a slow redraw, rather than a smooth glide
      const k = Math.ceil(t * 3) / 3;
      for (const s of sprites) drawBlock(s.power, cellX(s.from) + (cellX(s.to) - cellX(s.from)) * k, cellY(s.from) + (cellY(s.to) - cellY(s.from)) * k, 1);
    } else {
      grid.forEach((power, i) => {
        if (!power) return;
        const age = now - (born.get(i) ?? -Infinity);
        drawBlock(power, cellX(i), cellY(i), age >= 0 && age < 400 ? 1 + (1 - age / 400) * 0.35 : 1);
      });
    }
    ctx.globalAlpha = 1;
  }

  function loop(time) {
    frame = requestAnimationFrame(loop);
    const dt = last ? Math.min(100, time - last) : 0;
    last = time;
    if (!active || document.hidden || reduced.matches) return;
    now += dt;
    const wasGliding = now - dt - glideStart < glideTime;
    // new blocks pop in once the glide has landed, topping the field back up
    if (wasGliding && now - glideStart >= glideTime) spawn(Math.max(1, Math.round(cols * rows * 0.78) - grid.filter(Boolean).length));
    wait -= dt;
    if (wait <= 0) {
      slideAll();
      // it slides about once a second, quicker while you're playing
      wait = running() ? 520 + Math.random() * 300 : 1100 + Math.random() * 800;
    }
    draw();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  frame = requestAnimationFrame(loop);

  return {
    setActive(value) { active = value; },
    redraw() { draw(); },
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}
