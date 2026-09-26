// little ui sound effects, generated with web audio so there are no sound files.
// the idea (quiet clicks, a close click, a blip when things open, and a hover
// sound that climbs in pitch) comes from sharyap.com.
import { read, save } from './storage.js';

let ctx;
let master;
let noise;
let enabled = read('sound', 'on') !== 'off';
const lastPlayed = {};

// volume slider level, 0 to 100. 75 is how loud the sounds were designed to be,
// so the top of the slider is a bit louder than that
const defaultLevel = 75;
let level = Number(read('volume', defaultLevel));
if (!Number.isFinite(level) || level < 0 || level > 100) level = defaultLevel;

// do re mi fa sol la ti do: the c major scale from c5 to c6, which the hover xylophone steps through
const xylophone = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
let note = 0;

// minimum ms between repeats, so sweeping the mouse or dragging doesn't turn into a buzz
const throttle = { hover: 60, crumble: 70, brick: 30 };

export const soundEnabled = () => enabled;
export const soundLevel = () => level;

// loudness follows the square of the slider, which feels more even to the ear than a straight line
const gainFor = value => (value / defaultLevel) ** 2;

// other parts of the site (the cd player) listen for this to pause when sound goes off
function announce() {
  window.dispatchEvent(new CustomEvent('site-sound', { detail: { enabled, level } }));
}

export function setSoundEnabled(value) {
  enabled = value;
  save('sound', value ? 'on' : 'off');
  announce();
  if (value) play('chime');
}

export function setSoundLevel(value) {
  level = Math.max(0, Math.min(100, Math.round(value)));
  save('volume', String(level));
  if (master) master.gain.value = gainFor(level);
  announce();
}

// browsers only allow audio after the user has interacted with the page,
// so the context is made (or woken up) on the first sound.
// everything plays through one master gain so the volume slider controls it all
function audio() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = gainFor(level);
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// the master gain for the live page, or the plain output for anything else
const output = ac => (ac === ctx ? master : ac.destination);

// one short tone with a quick attack and exponential fade
function blip(ac, { type = 'square', from, to = from, start = 0, length = 0.04, volume }) {
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

  osc.connect(gain).connect(output(ac));
  osc.start(t);
  osc.stop(t + length + 0.02);
}

// a tiny burst of filtered noise. this is what makes clicks feel physical
// instead of beepy, like the snap of a real switch
function burst(ac, { freq, q = 1, start = 0, length = 0.012, volume }) {
  if (!noise) {
    noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.2), ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  const t = ac.currentTime + start;
  const src = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();

  src.buffer = noise;
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

  src.connect(filter).connect(gain).connect(output(ac));
  // start at a random spot in the noise so repeats don't sound identical
  src.start(t, Math.random() * 0.15);
  src.stop(t + length + 0.02);
}

const sounds = {
  // pressing a button down: a short snap with a soft low thump under it
  press: ac => {
    burst(ac, { freq: 2600, q: 0.8, length: 0.014, volume: 0.14 });
    blip(ac, { type: 'sine', from: 170, to: 80, length: 0.035, volume: 0.09 });
  },

  // letting go: a much lighter tick
  release: ac => burst(ac, { freq: 5200, q: 1.2, length: 0.007, volume: 0.05 }),

  // keyboard presses have no separate down and up, so play both
  click: ac => {
    sounds.press(ac);
    burst(ac, { freq: 5200, q: 1.2, start: 0.05, length: 0.007, volume: 0.05 });
  },

  // clicking the empty desktop, softer and duller than a button.
  // kept above ~300hz so it still comes through laptop speakers
  tap: ac => {
    burst(ac, { freq: 1200, q: 0.7, length: 0.03, volume: 0.12 });
    blip(ac, { type: 'sine', from: 380, to: 260, length: 0.035, volume: 0.05 });
  },

  // ascii letters breaking off: typewriter keys. each clack is a sharp resonant
  // snap with a little knock of the key hitting bottom, pitched slightly
  // differently every time. bigger hits get a quick flurry of two or three keys
  crumble: (ac, amount = 1) => {
    const keys = Math.min(3, 1 + Math.floor(amount / 40));
    for (let i = 0; i < keys; i++) {
      const start = i * 0.045 + Math.random() * 0.01;
      const tone = 0.9 + Math.random() * 0.25;
      burst(ac, { freq: 3200 * tone, q: 3, start, length: 0.018, volume: 0.28 });
      blip(ac, { from: 1400 * tone, to: 700 * tone, start, length: 0.02, volume: 0.025 });
      burst(ac, { freq: 700 * tone, q: 1.5, start: start + 0.004, length: 0.03, volume: 0.1 });
    }
  },

  // turning sound back on: a quick rising bell arpeggio (c e g c)
  chime: ac => {
    [1046.5, 1318.51, 1567.98, 2093].forEach((freq, i) => {
      blip(ac, { type: 'sine', from: freq, start: i * 0.07, length: 0.5, volume: 0.045 });
      blip(ac, { type: 'sine', from: freq * 2.76, start: i * 0.07, length: 0.12, volume: 0.01 });
    });
  },

  // breakout brick: an arcade blip plus a small crack. each brick broken this
  // round climbs one note up a major scale, so the last brick is the highest
  brick: (ac, broken = 0) => {
    const scale = [0, 2, 4, 5, 7, 9, 11];
    const step = scale[broken % 7] + 12 * Math.floor(broken / 7);
    const pitch = 440 * 2 ** (step / 12);
    blip(ac, { from: pitch, to: pitch * 0.92, length: 0.06, volume: 0.05 });
    burst(ac, { freq: 3000, q: 0.8, length: 0.015, volume: 0.07 });
  },

  // lower and a touch longer than a normal click
  close: ac => {
    blip(ac, { from: 900, to: 500, length: 0.05, volume: 0.06 });
    blip(ac, { from: 600, to: 350, start: 0.045, length: 0.05, volume: 0.04 });
  },

  // two rising notes
  open: ac => {
    blip(ac, { type: 'triangle', from: 660, length: 0.07, volume: 0.08 });
    blip(ac, { type: 'triangle', from: 990, start: 0.06, length: 0.09, volume: 0.07 });
  },

  // a xylophone note. each hover plays the next note of do re mi, then starts
  // over at do. a wooden bar is mostly a
  // pure tone with a bright overtone about 4x higher that dies off fast, plus the tap of the mallet
  hover: ac => {
    const freq = xylophone[note];
    note = (note + 1) % xylophone.length;
    blip(ac, { type: 'sine', from: freq, length: 0.3, volume: 0.035 });
    blip(ac, { type: 'sine', from: freq * 3.9, length: 0.05, volume: 0.008 });
    burst(ac, { freq: 3500, q: 1, length: 0.004, volume: 0.01 });
  },
};

export function play(name, amount) {
  if (!enabled || !level || document.hidden) return;
  // hovering before the first click would just get blocked by the browser
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;

  if (throttle[name]) {
    const now = performance.now();
    if (now - (lastPlayed[name] || 0) < throttle[name]) return;
    lastPlayed[name] = now;
  }

  const ac = audio();
  if (ac) sounds[name](ac, amount);
}
