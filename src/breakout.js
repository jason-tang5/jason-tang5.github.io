// breakout for the contact window.  email is hidden behind the bricks and
// shows up as you clear them. everything is drawn on a 300x300 canvas and
// scaled up with css, so all the numbers below are in those canvas units.
//
// returns { setActive, destroy } so the vue component can pause it when the
// window loses focus and clean everything up when it closes.

import { play } from './sound.js';

// 5x7 pixel font for tracking which email letters are uncovered.
const glyphs = {
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  b: ['10000', '10000', '11110', '10001', '10001', '10001', '11110'],
  c: ['00000', '00000', '01111', '10000', '10000', '10000', '01111'],
  d: ['00001', '00001', '01111', '10001', '10001', '10001', '01111'],
  e: ['00000', '00000', '01110', '10001', '11111', '10000', '01111'],
  f: ['00110', '01001', '01000', '11100', '01000', '01000', '01000'],
  g: ['00000', '01111', '10001', '10001', '01111', '00001', '01110'],
  h: ['10000', '10000', '11110', '10001', '10001', '10001', '10001'],
  i: ['00100', '00000', '01100', '00100', '00100', '00100', '01110'],
  j: ['00100', '00000', '00100', '00100', '00100', '10100', '01000'],
  k: ['10000', '10000', '10010', '10100', '11000', '10100', '10010'],
  l: ['01100', '00100', '00100', '00100', '00100', '00100', '01110'],
  m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
  n: ['00000', '00000', '11110', '10001', '10001', '10001', '10001'],
  o: ['00000', '00000', '01110', '10001', '10001', '10001', '01110'],
  p: ['00000', '11110', '10001', '10001', '11110', '10000', '10000'],
  r: ['00000', '00000', '10110', '11001', '10000', '10000', '10000'],
  s: ['00000', '00000', '01111', '10000', '01110', '00001', '11110'],
  t: ['00100', '00100', '11111', '00100', '00100', '00101', '00010'],
  u: ['00000', '00000', '10001', '10001', '10001', '10001', '01111'],
  w: ['00000', '00000', '10001', '10001', '10101', '10101', '01010'],
  y: ['00000', '10001', '10001', '01111', '00001', '10001', '01110'],
  '@': ['01110', '10001', '10111', '10101', '10111', '10000', '01110'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
};

const brickColors = ['#000080', '#244f9c', '#3972ac', '#538eaf', '#008080', '#379b95', '#7170a0', '#9693b7'];
const ballSpeedScale = 0.5;
const ballSpeed = 380 * ballSpeedScale;
const paddleY = 268;
const brickArt = ['+--------+', '|        |', '+--------+'];
const brickFontSize = 9;
const brickLineHeight = 8;
const font = size => `bold ${size}px "Courier New", monospace`;

export function createBreakout(root, { email }) {
  // one abort controller so destroy() can drop every listener at once
  const events = new AbortController();
  const on = (target, type, listener) => target?.addEventListener(type, listener, { signal: events.signal });

  const canvas = root.querySelector('#breakout');
  const ctx = canvas.getContext('2d');
  ctx.font = font(brickFontSize);
  const brickCellWidth = ctx.measureText('M').width;
  const board = root.querySelector('.breakout-board');
  const emailBox = root.querySelector('.breakout-email');
  const startButton = root.querySelector('#breakout-start');
  const status = root.querySelector('#breakout-status');
  const emailProgress = root.querySelector('#breakout-progress');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

  // screen reader progress: one slot per character, filled in as it's uncovered
  const emailSlots = [...email].map(() => {
    const slot = document.createElement('span');
    slot.textContent = '_';
    emailProgress.append(slot);
    return slot;
  });

  // the real link sits under the canvas and only becomes clickable once the board is clear
  const link = document.createElement('a');
  link.href = `mailto:${email}`;
  link.setAttribute('aria-label', email);
  link.textContent = email;
  link.tabIndex = -1;
  emailBox.replaceChildren(link);

  let bricks;
  let balls;
  let paddle;
  let score = 0;
  let elapsed = 0;
  let running = false;
  let started = false;
  let complete = false;
  let message = 'paused';
  let hostActive = true;
  let previous = 0;
  let animationFrame = 0;
  let fallingText = []; // bits of broken bricks
  const keys = new Set();
  const letterSprites = new Map();

  function pixelText(text, y, size = 1.5, color = '#000080') {
    ctx.fillStyle = color;
    ctx.font = font(size * 7);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text, 150, y);
  }

  // Break the same outline characters into small falling pieces.
  function breakText(brick) {
    if (motionQuery.matches) return;
    const left = brick.x + (brick.w - brickArt[0].length * brickCellWidth) / 2;
    const top = brick.y + (brick.h - brickArt.length * brickLineHeight) / 2;

    brickArt.forEach((row, line) => [...row].forEach((letter, column) => {
      if (letter === ' ') return;
      const key = `${brick.color}:${letter}`;
      if (!letterSprites.has(key)) {
        const sprite = document.createElement('canvas');
        sprite.width = 10;
        sprite.height = 12;
        const pen = sprite.getContext('2d');
        pen.font = font(brickFontSize);
        pen.textAlign = 'center';
        pen.textBaseline = 'middle';
        pen.fillStyle = brick.color;
        pen.fillText(letter, 5, 6);
        letterSprites.set(key, sprite);
      }

      fallingText.push({
        sprite: letterSprites.get(key),
        x: left + (column + 0.5) * brickCellWidth,
        y: top + line * brickLineHeight + brickLineHeight / 2,
        vx: (column - 4.5) * 8 + (Math.random() - 0.5) * 35,
        vy: -45 - Math.random() * 65,
        angle: 0,
        spin: (Math.random() - 0.5) * 7,
      });
    }));

    // cap it so a big combo doesn't pile up hundreds of sprites
    if (fallingText.length > 120) fallingText = fallingText.slice(-120);
  }

  function updateFallingText(dt) {
    for (const letter of fallingText) {
      letter.vy += 360 * dt; // gravity
      letter.x += letter.vx * dt;
      letter.y += letter.vy * dt;
      letter.angle += letter.spin * dt;
    }
    fallingText = fallingText.filter(letter => letter.y < 312 && letter.x > -12 && letter.x < 312);
  }

  on(motionQuery, 'change', () => {
    if (motionQuery.matches) {
      fallingText = [];
      draw();
    }
  });

  // the email uses the same pixel font as the desktop signature. it isn't
  // monospace, so measure where each letter really sits (in ems) and tell the
  // css the total width, which it uses to stretch the email across the board
  const emailFont = '"Pixel MS Sans Serif", Tahoma, sans-serif';
  let emailMetrics;

  function measureEmail() {
    const pen = document.createElement('canvas').getContext('2d');
    pen.font = `bold 100px ${emailFont}`;
    const width = text => pen.measureText(text).width / 100;
    emailMetrics = {
      total: width(email),
      offsets: [...email].map((_, i) => width(email.slice(0, i))),
      widths: [...email].map(width),
    };
    board.style.setProperty('--email-em', emailMetrics.total);
  }

  // works out which letters of the email are fully uncovered by checking each
  // lit pixel of the glyph against the bricks still standing
  function updateEmailProgress() {
    if (!canvas.getBoundingClientRect().width) return;

    // matches the revealed link, which spans 96% of the board
    const emailWidth = 300 * 0.96;
    const emailLeft = (300 - emailWidth) / 2;
    const em = emailWidth / emailMetrics.total;

    [...email].forEach((letter, index) => {
      // the 5x7 glyph (plus a pixel of spacing) stretched over the letter's real width
      const scale = emailMetrics.widths[index] * em / 6;
      const start = emailLeft + emailMetrics.offsets[index] * em;
      const top = 68 - (7 * scale) / 2;

      const stillCovered = glyphs[letter].some((row, y) => [...row].some((pixel, x) => {
        if (pixel !== '1') return false;
        const left = start + x * scale;
        const upper = top + y * scale;
        return bricks.some(brick => brick.alive &&
          left < brick.x + brick.w && left + scale > brick.x &&
          upper < brick.y + brick.h && upper + scale > brick.y);
      }));

      const value = stillCovered ? '_' : letter;
      if (emailSlots[index].textContent !== value) emailSlots[index].textContent = value;
    });
  }

  function newBall(x) {
    return { x, y: 247, vx: 210 * ballSpeedScale, vy: -290 * ballSpeedScale };
  }

  function reset() {
    const columns = 5;
    const rows = 2;
    bricks = Array.from({ length: columns * rows }, (_, i) => ({
      x: (i % columns) * (300 / columns),
      y: 40 + Math.floor(i / columns) * (56 / rows),
      w: 300 / columns,
      h: 56 / rows,
      row: Math.floor(i / columns),
      color: brickColors[Math.floor(i / columns)],
      alive: true,
    }));

    score = 0;
    elapsed = 0;
    paddle = 120;
    balls = [newBall(150)];
    complete = false;
    fallingText = [];
    startButton.textContent = 'Play';

    board.classList.remove('is-revealed');
    emailBox.setAttribute('aria-hidden', 'true');
    link.tabIndex = -1;
    status.textContent = `${bricks.length} bricks to go.`;
    updateEmailProgress();
    draw();
  }

  function drawScore(value, x) {
    ctx.font = font(13);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(value).padStart(3, '0'), x, 15);
  }

  function draw() {
    ctx.clearRect(0, 0, 300, 300);

    // score on the left, bricks left on the right
    ctx.fillStyle = '#bcbcbc';
    drawScore(score, 20);
    drawScore(bricks.filter(brick => brick.alive).length, 240);

    for (const brick of bricks) {
      if (!brick.alive) continue;
      // solid background so the email underneath stays hidden until the brick breaks
      ctx.fillStyle = '#eeeee7';
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      ctx.fillStyle = brick.color;
      // Use a real monospace grid; never stretch glyphs to fill the brick.
      ctx.font = font(brickFontSize);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const top = brick.y + (brick.h - brickArt.length * brickLineHeight) / 2;
      brickArt.forEach((line, row) => {
        ctx.fillText(line, brick.x + brick.w / 2, top + (row + 0.5) * brickLineHeight);
      });
    }

    // paddle and the little side walls
    ctx.fillStyle = '#000080';
    ctx.font = font(10);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('[========]', paddle, 270);
    ctx.fillText('|', 0, 271);
    ctx.fillText('|', 294, 271);

    ctx.fillStyle = '#111';
    ctx.font = font(12);
    ctx.textAlign = 'center';
    for (const ball of balls) {
      ctx.fillText('*', Math.round(ball.x), Math.round(ball.y + 2));
    }

    if (complete) {
      pixelText('all clear', 178, 2);
      pixelText('click to play again', 218);
    } else if (!running) {
      // dim the board while paused
      ctx.fillStyle = 'rgba(238, 238, 231, .88)';
      ctx.fillRect(0, 0, 300, 300);
      if (started) {
        pixelText(message, 125, 2);
        pixelText('click to play', 175, 2);
      } else {
        pixelText('click to play', 188, 2);
      }
    }

    for (const letter of fallingText) {
      ctx.save();
      ctx.translate(letter.x, letter.y);
      ctx.rotate(letter.angle);
      ctx.drawImage(letter.sprite, -5, -6);
      ctx.restore();
    }

  }

  function finish() {
    running = false;
    complete = true;
    startButton.textContent = 'Play again';

    bricks.forEach(brick => { brick.alive = false; });
    updateEmailProgress();
    board.classList.add('is-revealed');
    emailBox.removeAttribute('aria-hidden');
    link.tabIndex = 0;
    status.textContent = 'Email revealed. Say hello!';
    draw();
  }

  function toggle() {
    if (!hostActive) return;
    if (complete) reset();
    started = true;
    running = !running;
    message = 'paused';
    startButton.textContent = running ? 'Pause' : 'Resume';
    schedule();
    draw();
  }

  function update(dt) {
    elapsed += dt;
    const direction = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
    paddle = Math.max(0, Math.min(240, paddle + direction * 240 * dt));

    for (const ball of balls) {
      updateBall(ball, dt);
      if (complete) return;
    }

    // drop balls that fell off the bottom
    balls = balls.filter(ball => ball.y <= 306);
    if (!balls.length) {
      balls.push(newBall(paddle + 30));
      running = false;
      message = 'try again';
      startButton.textContent = 'Try again';
      status.textContent = 'Ball lost! Your cleared bricks stay cleared.';
    }
  }

  function updateBall(ball, dt) {
    const oldY = ball.y;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // walls and ceiling
    if (ball.x < 4 || ball.x > 296) {
      ball.x = Math.max(4, Math.min(296, ball.x));
      ball.vx *= -1;
    }
    if (ball.y < 9) {
      ball.y = 9;
      ball.vy = Math.abs(ball.vy);
    }

    // only one brick per step, otherwise the ball can flip direction twice and tunnel through
    for (const brick of bricks) {
      const missed = ball.x + 4 < brick.x || ball.x - 4 > brick.x + brick.w ||
        ball.y + 4 < brick.y || ball.y - 4 > brick.y + brick.h;
      if (!brick.alive || missed) continue;

      brick.alive = false;
      breakText(brick);
      play('brick', brick.row);
      updateEmailProgress();
      score += 1;

      // if the ball came from above or below, bounce vertically, otherwise it hit a side
      if (oldY + 4 <= brick.y || oldY - 4 >= brick.y + brick.h) ball.vy *= -1;
      else ball.vx *= -1;

      const left = bricks.filter(b => b.alive).length;
      status.textContent = `${left} ${left === 1 ? 'brick' : 'bricks'} to go.`;
      if (!left) finish();
      break;
    }

    // paddle bounce. where it lands on the paddle sets the angle, like the original
    const crossedPaddle = ball.vy > 0 && oldY + 4 <= paddleY && ball.y + 4 >= paddleY;
    if (crossedPaddle && ball.x >= paddle - 4 && ball.x <= paddle + 64) {
      const angle = (ball.x - paddle - 30) / 34;
      ball.vx = angle * 330 * ballSpeedScale;
      ball.vy = -Math.sqrt(ballSpeed ** 2 - ball.vx * ball.vx);
      // After the opening rallies, guide successful paddle returns toward
      // a remaining brick so the email reveal does not become a long cleanup.
      if (elapsed >= 15) {
        const target = bricks.filter(brick => brick.alive).sort((a, b) =>
          Math.abs(a.x + a.w / 2 - ball.x) - Math.abs(b.x + b.w / 2 - ball.x))[0];
        if (target) {
          const dx = target.x + target.w / 2 - ball.x;
          const dy = target.y + target.h - 264;
          const distance = Math.hypot(dx, dy);
          ball.vx = dx / distance * ballSpeed;
          ball.vy = dy / distance * ballSpeed;
        }
      }
      ball.y = 264;
    }
  }

  function frame(now) {
    // cap dt so a background tab doesn't teleport the ball when it comes back
    const dt = Math.min((now - previous) / 1000, 0.025);
    previous = now;

    const hadFallingText = fallingText.length > 0;
    updateFallingText(dt);

    if (running) {
      // small substeps so fast balls don't skip over thin bricks
      const steps = Math.ceil(dt / 0.005);
      for (let i = 0; i < steps && running; i++) update(dt / steps);
      draw();
    } else if (hadFallingText) {
      draw();
    }

    // keep the loop going only while something is moving
    animationFrame = 0;
    if (running || fallingText.length) {
      animationFrame = requestAnimationFrame(frame);
    }
  }

  function schedule() {
    if (animationFrame || !hostActive) return;
    previous = performance.now();
    animationFrame = requestAnimationFrame(frame);
  }

  function pause() {
    keys.clear();
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    fallingText = [];
    if (running) {
      running = false;
      message = 'paused';
      startButton.textContent = 'Resume';
    }
    draw();
  }

  on(canvas, 'pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    paddle = Math.max(0, Math.min(240, (event.clientX - rect.left) * 300 / rect.width - 30));
    if (!running) draw();
  });

  on(canvas, 'pointerdown', event => {
    if (!hostActive || event.button !== 0) return;
    // after winning, clicks on the top half go to the email link, not the game
    if (complete && event.offsetY / canvas.getBoundingClientRect().height < 0.46) return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    if (!running) toggle();
  });

  on(canvas, 'keydown', event => {
    if (!hostActive) return;
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.code === 'Space' && !event.repeat) toggle();
    keys.add(event.code);
  });

  on(canvas, 'keyup', event => keys.delete(event.code));
  on(window, 'blur', pause);
  on(document, 'visibilitychange', () => {
    if (document.hidden) pause();
  });

  on(startButton, 'click', toggle);
  on(root.querySelector('#breakout-restart'), 'click', () => {
    pause();
    started = false;
    message = 'paused';
    reset();
  });

  // measure with whatever font is ready now, then again once the pixel font has loaded
  measureEmail();
  reset();
  document.fonts?.load(`bold 100px ${emailFont}`).then(() => {
    if (events.signal.aborted) return;
    measureEmail();
    updateEmailProgress();
  });

  // the letter positions depend on the board size, so recheck when it resizes
  const observer = new ResizeObserver(updateEmailProgress);
  observer.observe(canvas);

  return {
    setActive(value) {
      hostActive = value;
      if (!value) pause();
    },
    destroy() {
      pause();
      events.abort();
      observer.disconnect();
    },
  };
}
