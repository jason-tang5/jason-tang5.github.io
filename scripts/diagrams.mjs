// builds the hand drawn diagrams in docs/diagrams/ as .excalidraw files.
// open one at excalidraw.com (menu → open), tweak it, then export an svg for the blog.
// run with `node scripts/diagrams.mjs`
import { mkdirSync, writeFileSync } from 'node:fs';

let n = 0;
const id = () => `el${++n}`;
const seed = () => Math.floor(Math.random() * 2 ** 31);

const base = type => ({
  id: id(),
  type,
  angle: 0,
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  seed: seed(),
  version: 1,
  versionNonce: seed(),
  isDeleted: false,
  boundElements: [],
  updated: 1,
  link: null,
  locked: false,
});

// virgil is roughly this wide per character
const measure = (text, size) => {
  const lines = text.split('\n');
  return { width: Math.max(...lines.map(l => l.length)) * size * 0.55, height: lines.length * size * 1.25 };
};

// centred on the container, or on [x, y] for an arrow's label
function label(text, container, size, [cx, cy] = [container.x + container.width / 2, container.y + container.height / 2]) {
  const { width, height } = measure(text, size);
  const t = {
    ...base('text'),
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
    text,
    originalText: text,
    fontSize: size,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: container.id,
    lineHeight: 1.25,
    autoResize: true,
    roundness: null,
  };
  container.boundElements.push({ id: t.id, type: 'text' });
  return t;
}

function diagram() {
  const elements = [];

  const box = (text, x, y, width = 220, height = 80, size = 20) => {
    const b = { ...base('rectangle'), x, y, width, height, roundness: { type: 3 } };
    elements.push(b, label(text, b, size));
    return b;
  };

  const title = (text, x, y) => {
    const { width, height } = measure(text, 32);
    elements.push({
      ...base('text'), x, y, width, height, text, originalText: text, fontSize: 32, fontFamily: 1,
      textAlign: 'left', verticalAlign: 'top', containerId: null, lineHeight: 1.25, autoResize: true, roundness: null,
    });
  };

  // from and to are [box, side], side is top/bottom/left/right, with an optional
  // 0–1 position along that side. both: arrowheads at both ends
  const arrow = (from, to, text, { both = false } = {}) => {
    const point = ([b, side, at = 0.5]) => ({
      top: [b.x + b.width * at, b.y - 6],
      bottom: [b.x + b.width * at, b.y + b.height + 6],
      left: [b.x - 6, b.y + b.height * at],
      right: [b.x + b.width + 6, b.y + b.height * at],
    })[side];
    const [x1, y1] = point(from);
    const [x2, y2] = point(to);
    const a = {
      ...base('arrow'),
      x: x1,
      y: y1,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      points: [[0, 0], [x2 - x1, y2 - y1]],
      lastCommittedPoint: null,
      startBinding: { elementId: from[0].id, focus: 0, gap: 6 },
      endBinding: { elementId: to[0].id, focus: 0, gap: 6 },
      startArrowhead: both ? 'arrow' : null,
      endArrowhead: 'arrow',
      elbowed: false,
      roundness: { type: 2 },
    };
    from[0].boundElements.push({ id: a.id, type: 'arrow' });
    to[0].boundElements.push({ id: a.id, type: 'arrow' });
    elements.push(a);
    if (text) elements.push(label(text, a, 16, [(x1 + x2) / 2, (y1 + y2) / 2]));
    return a;
  };

  const file = () => ({
    type: 'excalidraw',
    version: 2,
    source: 'https://excalidraw.com',
    elements,
    appState: { viewBackgroundColor: '#ffffff', gridSize: null },
    files: {},
  });

  return { box, title, arrow, file };
}

// how the pieces of the live chat fit together
function architecture() {
  const { box, title, arrow, file } = diagram();
  title('Live Chat on jasontang.dev', 40, 0);

  const browser = box('Visitor\nChat window', 40, 250);
  const worker = box('Worker\njasontang.dev', 480, 250);
  const room = box('ChatRoom\nDurable Object', 920, 250, 240);
  const assets = box('Static site\n(dist/)', 480, 90);
  const turnstile = box('Turnstile', 920, 90, 240);
  const sqlite = box('SQLite\nmessages · sessions · settings', 880, 460, 320, 90, 18);
  const admin = box('Admin (me)', 40, 460);
  const access = box('Cloudflare\nAccess', 480, 460);

  arrow([browser, 'right', 0.25], [worker, 'left', 0.25], 'join (Turnstile token)');
  arrow([browser, 'right', 0.75], [worker, 'left', 0.75], 'WebSocket', { both: true });
  arrow([worker, 'top'], [assets, 'bottom'], 'everything else');
  arrow([worker, 'right', 0.2], [turnstile, 'left', 0.5], 'check token');
  arrow([worker, 'right', 0.7], [room, 'left', 0.7], 'socket + RPC', { both: true });
  arrow([room, 'bottom'], [sqlite, 'top'], 'read / write');
  arrow([admin, 'right'], [access, 'left'], 'email code login');
  arrow([access, 'top'], [worker, 'bottom'], '/api/admin/*');
  return file();
}

// what the room does with every message someone sends
function sending() {
  const { box, title, arrow, file } = diagram();
  title('Sending a Message', 40, 0);

  const steps = [
    ['A frame arrives\non the socket', null],
    ['Who sent it?\n(socket attachment)', null],
    ['Banned?', 'error: banned\nclose the socket'],
    ['Chat turned off?', 'error: chat-disabled'],
    ['Muted?', 'error: muted until …'],
    ['Sending too fast?', 'error: rate-limited'],
    ['Empty or over\n250 characters?', 'error: empty / too-long'],
    ['Same as their\nlast 3 messages?', 'error: duplicate'],
    ['Save to SQLite', null],
    ['Send to every\nopen socket', null],
  ];

  let previous;
  steps.forEach(([text, error], i) => {
    const step = box(text, 40, 80 + i * 150, 240, 80);
    if (previous) arrow([previous, 'bottom'], [step, 'top'], steps[i - 1][1] ? 'No' : null);
    if (error) arrow([step, 'right'], [box(error, 440, step.y, 260, 80), 'left'], 'Yes');
    previous = step;
  });
  return file();
}

mkdirSync('docs/diagrams', { recursive: true });
for (const [name, build] of [['live-chat-architecture', architecture], ['live-chat-sending', sending]]) {
  writeFileSync(`docs/diagrams/${name}.excalidraw`, `${JSON.stringify(build(), null, 2)}\n`);
  console.log(`wrote docs/diagrams/${name}.excalidraw`);
}
