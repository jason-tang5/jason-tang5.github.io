// animated ascii backdrops for the space around the game boards, in courier text and
// the game's own colours: bricks and sparks drifting up in contact, little snakes
// playing snake in snake. they speed up while a game is running, pause when the
// window isn't in front, and stay still for reduced motion.

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

const cell = 12;
const headFor = { right: '>', left: '<', up: '^', down: 'v' };
const moves = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
const turnsFrom = { right: ['up', 'down'], left: ['up', 'down'], up: ['left', 'right'], down: ['left', 'right'] };

export function createBackdrop(canvas, options) {
  return options.scene?.snakes ? createSnakeField(canvas, options) : createDrift(canvas, options);
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
