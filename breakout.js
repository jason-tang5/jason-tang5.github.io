(() => {
  // Set the owner's email here; it is kept as HTML behind the canvas bricks.
  const email = 'jasontcanada@gmail.com';
  const canvas = document.querySelector('#breakout');
  const ctx = canvas.getContext('2d');
  const board = document.querySelector('.breakout-board');
  const emailBox = document.querySelector('.breakout-email');
  const startButton = document.querySelector('#breakout-start');
  const addBallButton = document.querySelector('#breakout-add-ball');
  const status = document.querySelector('#breakout-status');
  const emailProgress = document.querySelector('#breakout-progress');
  const emailSlots = [...email].map(() => {
    const slot = document.createElement('span');
    slot.textContent = '_';
    emailProgress.append(slot);
    return slot;
  });
  let glyphs;
  if (email) {
    const link = document.createElement('a');
    link.href = `mailto:${email}`;
    link.setAttribute('aria-label', email);
    // Local pixel glyphs keep the arcade lettering crisp without a font download.
    glyphs = {
      j: ['00100', '00000', '00100', '00100', '00100', '10100', '01000'],
      a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
      s: ['00000', '00000', '01111', '10000', '01110', '00001', '11110'],
      o: ['00000', '00000', '01110', '10001', '10001', '10001', '01110'],
      n: ['00000', '00000', '11110', '10001', '10001', '10001', '10001'],
      t: ['00100', '00100', '11111', '00100', '00100', '00101', '00010'],
      c: ['00000', '00000', '01111', '10000', '10000', '10000', '01111'],
      d: ['00001', '00001', '01111', '10001', '10001', '10001', '01111'],
      g: ['00000', '01111', '10001', '10001', '01111', '00001', '01110'],
      m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
      i: ['00100', '00000', '01100', '00100', '00100', '00100', '01110'],
      l: ['01100', '00100', '00100', '00100', '00100', '00100', '01110'],
      '@': ['01110', '10001', '10111', '10101', '10111', '10000', '01110'],
      '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${email.length * 6 - 1} 7`);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('shape-rendering', 'crispEdges');
    [...email].forEach((letter, index) => {
      glyphs[letter].forEach((row, y) => {
        [...row].forEach((pixel, x) => {
          if (pixel !== '1') return;
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', index * 6 + x);
          rect.setAttribute('y', y);
          rect.setAttribute('width', '1');
          rect.setAttribute('height', '1');
          rect.setAttribute('fill', 'currentColor');
          svg.append(rect);
        });
      });
    });
    link.append(svg);
    link.tabIndex = -1;
    emailBox.replaceChildren(link);
  }
  Object.assign(glyphs, {
    b: ['10000','10000','11110','10001','10001','10001','11110'],
    e: ['00000','00000','01110','10001','11111','10000','01111'],
    f: ['00110','01001','01000','11100','01000','01000','01000'],
    h: ['10000','10000','11110','10001','10001','10001','10001'],
    k: ['10000','10000','10010','10100','11000','10100','10010'],
    p: ['00000','11110','10001','10001','11110','10000','10000'],
    r: ['00000','00000','10110','11001','10000','10000','10000'],
    u: ['00000','00000','10001','10001','10001','10001','01111'],
    w: ['00000','00000','10001','10001','10101','10101','01010'],
    y: ['00000','10001','10001','01111','00001','10001','01110'],
    '?': ['01110','10001','00001','00010','00100','00000','00100'],
    ':': ['00000','00100','00100','00000','00100','00100','00000'],
    ')': ['01000','00100','00010','00010','00010','00100','01000'],
    '+': ['00000','00100','00100','11111','00100','00100','00000'],
    '1': ['00100','01100','00100','00100','00100','00100','01110'],
  });
  function pixelText(text, y, size = 1.5, color = '#eee') {
    ctx.fillStyle = color;
    const left = (300 - (text.length * 6 - 1) * size) / 2;
    [...text].forEach((letter, index) => {
      if (letter === ' ') return;
      glyphs[letter].forEach((row, py) => [...row].forEach((pixel, px) => {
        if (pixel === '1') ctx.fillRect(left + (index * 6 + px) * size, y + py * size, size, size);
      }));
    });
  }
  const colors = ['#c63120', '#d34a22', '#c46b1d', '#b68a19', '#9ca51c', '#80aa20', '#b5bf20', '#d0cb24'];
  const digits = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
  let bricks, balls, paddle, score = 0, running = false, complete = false, previous = 0;
  const keys = new Set();
  let started = false, message = 'paused', ballFeedback = [];
  let buttonFeedbackTimer;
  const ballSpeedScale = 0.5;
  function updateEmailProgress() {
    // Match the centered SVG: 90% of the 300px board, within y=80..136.
    const scale = 270 / (email.length * 6 - 1);
    const top = 108 - 7 * scale / 2;
    [...email].forEach((letter, index) => {
      const stillVisible = glyphs[letter].some((row, y) => [...row].some((pixel, x) => {
        if (pixel !== '1') return false;
        const left = 15 + (index * 6 + x) * scale;
        const upper = top + y * scale;
        return bricks.some(brick => brick.alive &&
          left < brick.x + brick.w && left + scale > brick.x &&
          upper < brick.y + brick.h && upper + scale > brick.y);
      }));
      const value = stillVisible ? '_' : letter;
      if (emailSlots[index].textContent !== value) emailSlots[index].textContent = value;
    });
  }
  function reset() {
    score = 0;
    bricks = Array.from({ length: 112 }, (_, i) => ({
      x: (i % 14) * (300 / 14), y: 80 + Math.floor(i / 14) * 7,
      w: 300 / 14, h: 7, color: colors[Math.floor(i / 14)], alive: true,
    }));
    paddle = 120;
    balls = [{ x: 150, y: 247, vx: 210 * ballSpeedScale, vy: -290 * ballSpeedScale }];
    complete = false;
    startButton.textContent = 'Play';
    addBallButton.disabled = false;
    ballFeedback = [];

    board.classList.remove('is-revealed');
    if (email) emailBox.firstChild.tabIndex = -1;
    status.textContent = '112 bricks to go.';
    updateEmailProgress();
    draw();
  }
  function drawScore(value, x) {
    for (const digit of String(value).padStart(3, '0')) {
      [...digits[Number(digit)]].forEach((pixel, i) => {
        if (pixel === '1') ctx.fillRect(x + (i % 3) * 3, 55 + Math.floor(i / 3) * 3, 3, 3);
      });
      x += 13;
    }
  }
  function draw() {
    ctx.clearRect(0, 0, 300, 300);
    ctx.fillStyle = '#bcbcbc';
    ctx.fillRect(0, 40, 300, 5);
    drawScore(score, 20);
    drawScore(bricks.filter(brick => brick.alive).length, 240);
    for (const brick of bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(brick.x + .5, brick.y + .5, brick.w - 1, brick.h - 1);
    }
    ctx.fillStyle = '#009bc4';
    ctx.fillRect(paddle, 268, 60, 5);
    ctx.fillRect(0, 268, 3, 8);
    ctx.fillRect(297, 268, 3, 8);
    ctx.fillStyle = '#eee';
    for (const ball of balls) {
      ctx.fillRect(Math.round(ball.x - 3), Math.round(ball.y - 3), 6, 6);
    }
    if (complete) {
      pixelText('you did it :)', 178, 2, '#d0cb24');
      pixelText('click to play again', 218);
    } else if (!running) {
      ctx.fillStyle = 'rgba(0, 0, 0, .8)';
      ctx.fillRect(0, 0, 300, 300);
      if (!started) {
        pixelText('want to get my email?', 113, 2);
        pixelText('beat the game :)', 137, 2);
        pixelText('click to play', 188, 2, '#009bc4');
      } else {
        pixelText(message, 125, 2);
        pixelText('click to play', 175, 2, '#009bc4');
      }
      pixelText('click adds a ball', 228, 1);
      pixelText('space to pause', 242, 1);
    }
    pixelText('contact', 10, 2, '#009bc4');
    const now = performance.now();
    ballFeedback = ballFeedback.filter(feedback => now - feedback.time < 1600);
    for (const feedback of ballFeedback) {
      const progress = Math.min(1, (now - feedback.time) / 1600);
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      const y = feedback.y - progress * 38;
      ctx.fillStyle = '#009bc4';
      const text = '+1 ball';
      const size = 2;
      const left = Math.max(0, Math.min(300 - (text.length * 6 - 1) * size, feedback.x - (text.length * 6 - 1) * size / 2));
      [...text].forEach((letter, index) => {
        if (letter === ' ') return;
        glyphs[letter].forEach((row, py) => [...row].forEach((pixel, px) => {
          if (pixel === '1') ctx.fillRect(left + (index * 6 + px) * size, y + py * size, size, size);
        }));
      });
      ctx.restore();
    }
  }
  function finish() {

    running = false;
    complete = true;
    addBallButton.disabled = true;
    startButton.textContent = 'Play again';

    bricks.forEach(brick => brick.alive = false);
    updateEmailProgress();
    board.classList.add('is-revealed');
    if (email) emailBox.firstChild.tabIndex = 0;
    status.textContent = email ? 'Email revealed. Say hello!' : 'All clear! Email address coming soon.';
    draw();
  }
  function toggle() {
    if (complete) reset();
    started = true;
    running = !running;
    message = 'paused';
    startButton.textContent = running ? 'Pause' : (started ? 'Resume' : 'Play');
    draw();
  }
  function update(dt) {
    paddle = Math.max(0, Math.min(240, paddle + ((keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)) * 240 * dt));
    for (const ball of balls) {
      updateBall(ball, dt);
      if (complete) return;
    }
    balls = balls.filter(ball => ball.y <= 306);
    if (!balls.length) {
      balls.push({ x: paddle + 30, y: 247, vx: 210 * ballSpeedScale, vy: -290 * ballSpeedScale });
      running = false;
      message = 'try again';
      startButton.textContent = 'Try again';
      status.textContent = 'All balls lost! Your cleared bricks stay cleared.';
    }
  }
  function updateBall(ball, dt) {
    const oldY = ball.y;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x < 4 || ball.x > 296) { ball.x = Math.max(4, Math.min(296, ball.x)); ball.vx *= -1; }
    if (ball.y < 49) { ball.y = 49; ball.vy = Math.abs(ball.vy); }
    for (const brick of bricks) {
      if (!brick.alive || ball.x + 4 < brick.x || ball.x - 4 > brick.x + brick.w || ball.y + 4 < brick.y || ball.y - 4 > brick.y + brick.h) continue;
      brick.alive = false;
      updateEmailProgress();
      score += 1;
      if (oldY + 4 <= brick.y || oldY - 4 >= brick.y + brick.h) ball.vy *= -1;
      else ball.vx *= -1;
      const left = bricks.filter(b => b.alive).length;
      status.textContent = `${left} ${left === 1 ? 'brick' : 'bricks'} to go.`;
      if (!left) finish();
      break;
    }
    if (ball.vy > 0 && oldY + 4 <= 268 && ball.y + 4 >= 268 && ball.x >= paddle - 4 && ball.x <= paddle + 64) {
      const angle = (ball.x - paddle - 30) / 34;
      ball.vx = angle * 330 * ballSpeedScale;
      ball.vy = -Math.sqrt((380 * ballSpeedScale) ** 2 - ball.vx * ball.vx);
      ball.y = 264;
    }
  }
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, .025);
    previous = now;
    if (running) {
      // Small steps keep collisions reliable with thin bricks and the faster ball.
      const steps = Math.ceil(dt / .005);
      for (let i = 0; i < steps && running; i++) update(dt / steps);
      draw();
    } else if (ballFeedback.length) {
      draw();
    }
    requestAnimationFrame(frame);
  }
  canvas.addEventListener('pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    paddle = Math.max(0, Math.min(240, (event.clientX - rect.left) * 300 / rect.width - 30));
    if (!running) draw();
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    if (complete && event.offsetY / canvas.getBoundingClientRect().height < .46) return;
    canvas.setPointerCapture(event.pointerId);
    if (!running) toggle();
    else launchBall();
  });
  canvas.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.code === 'Space' && !event.repeat) toggle();
    if (event.code === 'KeyB' && !event.repeat && running) launchBall();
    keys.add(event.code);
  });
  canvas.addEventListener('keyup', event => keys.delete(event.code));
  function pause() {
    keys.clear();
    if (running) { running = false; message = 'paused'; startButton.textContent = 'Resume'; draw(); }
  }
  canvas.addEventListener('blur', () => keys.clear());
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  function launchBall() {
    if (complete) return;
    const vx = (Math.random() * 2 - 1) * 280 * ballSpeedScale;
    balls.push({ x: paddle + 30, y: 247, vx, vy: -Math.sqrt((380 * ballSpeedScale) ** 2 - vx * vx) });
    ballFeedback.push({ x: balls[balls.length - 1].x, y: balls[balls.length - 1].y - 12, time: performance.now() });
    clearTimeout(buttonFeedbackTimer);
    addBallButton.textContent = '+1 ball!';
    addBallButton.classList.add('ball-added');
    buttonFeedbackTimer = setTimeout(() => {
      addBallButton.textContent = 'Add ball';
      addBallButton.classList.remove('ball-added');
    }, 350);
    status.textContent = `${balls.length} balls in play. ${bricks.filter(brick => brick.alive).length} bricks to go.`;
    if (!running) {
      started = true;
      running = true;
      startButton.textContent = 'Pause';
      message = 'paused';
    }
    draw();
  }
  startButton.addEventListener('click', toggle);
  addBallButton.addEventListener('click', launchBall);

  reset();
  requestAnimationFrame(frame);
})();
