<script setup>
// the figures in the durable object post (blog.mjs), swapped in by blog-figures.mjs:
// two wins at once with and without one coordinator, the four sqlite tables taking
// requests, who counts as online, the rolling leaderboards, and the trade-off. the
// tables are a small copy of worker/live-stats.mjs run in the page (there's no sqlite
// here), with the same statements, rules and limits
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import RetroIcon from './RetroIcon.vue';
import BlogGraphic from './BlogGraphic.vue';
import { cleanName } from '../names.mjs';
import '../post-figures.css';

const props = defineProps({
  figure: { type: String, required: true },
  caption: { type: String, default: '' },
  number: { type: Number, default: 0 },
});

const descriptions = {
  race: 'Two visitors win at the same moment. With two separate functions that each read the count and write it back, one win is lost. With one Durable Object the requests go through one at a time and both count.',
  tables: 'The four SQLite tables inside the Durable Object. Buttons send visits, heartbeats, wins and Snake scores, and show the SQL each one runs and the rows it changes.',
  online: 'Four visitors on a timeline with their heartbeats and leaves. A clock slider shows who counts as online at each moment: anyone heard from in the last 90 seconds.',
  boards: 'Snake scores spread over a year, with a slider for today. The 7, 30, 90 and 365 day boards and the all-time board update as the windows slide past old scores.',
  choice: 'A comparison of Supabase and a single Durable Object for this site.',
};

const root = ref(null);
const visible = ref(false);
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observer;
onMounted(() => {
  if (typeof IntersectionObserver !== 'function') { visible.value = true; return; }
  observer = new IntersectionObserver(([entry]) => { visible.value = entry.isIntersecting; });
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());

// ---- race: two wins at the same moment ----
const raceModes = {
  functions: {
    label: 'Two functions',
    middle: 'Two separate functions',
    steps: [
      { a: 'win', b: 'win', count: 40, text: 'Two visitors beat Minesweeper at the same moment. Each request lands on its own copy of the function.' },
      { a: 'read 40', count: 40, text: 'A reads the count: 40.' },
      { b: 'read 40', count: 40, text: 'B reads the count before A has written anything back. Also 40.' },
      { a: 'write 41', count: 41, text: 'A adds one and writes 41.' },
      { b: 'write 41', count: 41, bad: true, text: 'B adds one to what it read and also writes 41. Two wins, one counted. This is a lost update.' },
    ],
  },
  object: {
    label: 'One Durable Object',
    middle: 'One Durable Object',
    steps: [
      { a: 'win', b: 'win', count: 40, text: 'The same two wins. Both requests go to the one object named site, wherever they came from.' },
      { a: 'running', b: 'waiting', count: 40, text: 'The object handles one request at a time. B waits in line while A runs.' },
      { a: 'value+1', b: 'waiting', count: 41, text: 'A’s UPDATE runs: 41. Its response is built from the same state, so it can’t disagree with the table.' },
      { a: 'done', b: 'value+1', count: 42, text: 'Then B’s runs: 42.' },
      { a: 'done', b: 'done', count: 42, good: true, text: 'Both counted. The online list, the leaderboards and the top-100 trim all run inside the same queue, so none of them can trip over each other either.' },
    ],
  },
};
const raceMode = ref('functions');
const raceStep = ref(0);
const race = computed(() => raceModes[raceMode.value].steps[raceStep.value]);
const raceTotal = computed(() => raceModes[raceMode.value].steps.length);
let raceTimer;
let raceTouched = false;
// plays both versions in turn while it's on screen, until someone takes over
watch(visible, on => {
  clearInterval(raceTimer);
  if (!on || reduced || raceTouched || props.figure !== 'race') return;
  raceTimer = setInterval(() => {
    if (raceStep.value < raceTotal.value - 1) raceStep.value++;
    else {
      raceMode.value = raceMode.value === 'functions' ? 'object' : 'functions';
      raceStep.value = 0;
    }
  }, 2200);
});
onBeforeUnmount(() => clearInterval(raceTimer));
function raceGo(step, mode = raceMode.value) {
  raceTouched = true;
  clearInterval(raceTimer);
  raceMode.value = mode;
  raceStep.value = step;
}

// ---- tables: a copy of LiveStats, one request at a time ----
const day = 86400000;
const dayOf = time => new Date(time).toISOString().slice(0, 10);
const start = Date.UTC(2026, 8, 28, 12, 0, 0);
const visitors = [
  { id: 'k3v9x2m0qa', label: 'Visitor A', player: 'q7w2e9r4t1y6' },
  { id: 'p8d1z5c7fh', label: 'Visitor B', player: 'm4n8b2v6c1x3' },
  { id: 'r2t6y0u4ib', label: 'Visitor C', player: 'z9x7c5v3b1n2' },
];
const who = ref(0);
const snakeName = ref('ACE');
const snakeScore = ref(24);
const db = ref(null);
const lastRun = ref(null);
function freshDb() {
  return {
    now: start,
    totals: [{ name: 'visitors', value: 1204 }, { name: 'minesweeperWins', value: 40 }],
    sessions: [{ id: 'j5k1l9h3g7', seen: start - 20000 }],
    scores: [{ id: 'a1s2d3f4g5h6', score: 31, name: 'JT' }],
    daily_scores: [{ id: 'a1s2d3f4g5h6', day: dayOf(start - 3 * day), score: 31, name: 'JT' }],
  };
}
function resetTables() {
  db.value = freshDb();
  lastRun.value = null;
}
const counters = { 'minesweeper-win': 'minesweeperWins', 'breakout-complete': 'breakoutWins', 'reversi-lose': 'clippyWins', 'reversi-win': 'clippyLosses', '2048-win': 'twenty48Wins' };
// runs one request against the tables, like LiveStats.fetch. returns what ran, and
// marks the rows it touched
function request(body) {
  // plain json in and out, the tables are small and vue's proxies can't be cloned
  const d = JSON.parse(JSON.stringify(db.value));
  const ran = [];
  const touched = { totals: new Set(), sessions: new Set(), scores: new Set(), daily_scores: new Set() };
  const gone = { sessions: [], scores: [], daily_scores: [] };
  const bump = name => {
    const row = d.totals.find(r => r.name === name);
    if (row) row.value++;
    else d.totals.push({ name, value: 1 });
    touched.totals.add(name);
  };
  const { name, visit, value, player, playerId } = body ?? {};
  if (body) {
    if (name === 'visit') {
      ran.push(`INSERT INTO totals VALUES ('visitors', 1) ON CONFLICT(name) DO UPDATE SET value=value+1`);
      bump('visitors');
    }
    if (name === 'visit' || name === 'heartbeat') {
      ran.push(`INSERT INTO sessions VALUES ('${visit}', ${d.now}) ON CONFLICT(id) DO UPDATE SET seen=excluded.seen`);
      const row = d.sessions.find(r => r.id === visit);
      if (row) row.seen = d.now;
      else d.sessions.push({ id: visit, seen: d.now });
      touched.sessions.add(visit);
    }
    if (name === 'leave') {
      ran.push(`DELETE FROM sessions WHERE id='${visit}'`);
      gone.sessions.push(...d.sessions.filter(r => r.id === visit));
      d.sessions = d.sessions.filter(r => r.id !== visit);
    }
    if (counters[name]) {
      ran.push(`INSERT INTO totals VALUES ('${counters[name]}', 1) ON CONFLICT(name) DO UPDATE SET value=value+1`);
      bump(counters[name]);
    }
    if (name === 'snake-score' && Number.isInteger(value) && value > 0 && value <= 1000) {
      const id = playerId;
      const playerName = cleanName(player) || null;
      const keep = (table, match, row) => {
        const found = d[table].find(match);
        if (found) Object.assign(found, { score: Math.max(found.score, row.score), name: row.name });
        else d[table].push(row);
        touched[table].add(JSON.stringify([row.id, row.day ?? '']));
      };
      ran.push(`INSERT INTO scores (id, score, name) VALUES ('${id}', ${value}, ${playerName ? `'${playerName}'` : 'NULL'}) ON CONFLICT(id) DO UPDATE SET score=MAX(score, excluded.score), name=excluded.name`);
      keep('scores', r => r.id === id, { id, score: value, name: playerName });
      const today = dayOf(d.now);
      ran.push(`INSERT INTO daily_scores (id, day, score, name) VALUES ('${id}', '${today}', ${value}, ${playerName ? `'${playerName}'` : 'NULL'}) ON CONFLICT(id, day) DO UPDATE SET score=MAX(score, excluded.score), name=excluded.name`);
      keep('daily_scores', r => r.id === id && r.day === today, { id, day: today, score: value, name: playerName });
      const cutoff = dayOf(d.now - 366 * day);
      ran.push(`DELETE FROM daily_scores WHERE day < '${cutoff}'`);
      gone.daily_scores.push(...d.daily_scores.filter(r => r.day < cutoff));
      d.daily_scores = d.daily_scores.filter(r => r.day >= cutoff);
      ran.push(`DELETE FROM scores WHERE id NOT IN (SELECT id FROM scores ORDER BY score DESC, id LIMIT 100)`);
    } else if (name === 'snake-score') {
      ran.push('-- a score outside 1 to 1000 is ignored');
    }
  }
  // every request, reads too, sweeps out anyone not heard from in 90 seconds
  const cutoff = d.now - 90000;
  ran.push(`DELETE FROM sessions WHERE seen < ${cutoff}`);
  gone.sessions.push(...d.sessions.filter(r => r.seen < cutoff));
  d.sessions = d.sessions.filter(r => r.seen >= cutoff);
  const totals = Object.fromEntries(d.totals.map(r => [r.name, r.value]));
  const best = [...d.scores].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 10);
  const response = {
    visitors: totals.visitors ?? 0,
    minesweeperWins: totals.minesweeperWins ?? 0,
    online: d.sessions.length,
    leaderboard: best.map((r, i) => ({ rank: i + 1, player: cleanName(r.name) || `Player ${r.id.slice(0, 6).toUpperCase()}`, score: r.score })),
  };
  db.value = d;
  lastRun.value = { body, ran, touched, gone, response };
}
const me = computed(() => visitors[who.value]);
const tableActions = [
  { label: 'Visit', run: () => request({ name: 'visit', visit: me.value.id }) },
  { label: 'Heartbeat', run: () => request({ name: 'heartbeat', visit: me.value.id }) },
  { label: 'Leave', run: () => request({ name: 'leave', visit: me.value.id }) },
  { label: 'Beat Minesweeper', run: () => request({ name: 'minesweeper-win', visit: me.value.id }) },
  { label: 'GET /api/stats', run: () => request(null) },
];
function sendScore() {
  request({ name: 'snake-score', visit: me.value.id, value: snakeScore.value, player: snakeName.value, playerId: me.value.player });
}
function wait(seconds) {
  db.value = { ...db.value, now: db.value.now + seconds * 1000 };
  lastRun.value = { ran: [`-- ${seconds} seconds pass. nothing runs until the next request`], touched: {}, gone: {}, response: null, waited: true };
}
const nameError = computed(() => (snakeName.value && !cleanName(snakeName.value) ? 'Not allowed, it’ll be saved without a name' : ''));
const clock = computed(() => db.value && new Date(db.value.now).toISOString().slice(11, 19));
const isNew = (table, key) => lastRun.value?.touched?.[table]?.has(key);
const goneRows = table => lastRun.value?.gone?.[table] ?? [];

// ---- online: who counts, on a clock ----
// each visitor's events, in seconds. a heartbeat goes every 30 s while the tab is
// showing, hiding it sends a leave, and a dropped connection just goes quiet
const lanes = [
  { label: 'At a desk', events: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300].map(t => ({ t, kind: t ? 'heartbeat' : 'visit' })) },
  { label: 'Closes the tab', events: [{ t: 40, kind: 'visit' }, { t: 70, kind: 'heartbeat' }, { t: 100, kind: 'heartbeat' }, { t: 130, kind: 'heartbeat' }, { t: 150, kind: 'leave' }] },
  { label: 'Locks the phone', events: [{ t: 20, kind: 'visit' }, { t: 50, kind: 'heartbeat' }, { t: 80, kind: 'heartbeat' }, { t: 100, kind: 'leave' }, { t: 200, kind: 'heartbeat' }, { t: 230, kind: 'heartbeat' }, { t: 260, kind: 'heartbeat' }, { t: 290, kind: 'heartbeat' }] },
  { label: 'Loses signal', events: [{ t: 10, kind: 'visit' }, { t: 40, kind: 'heartbeat' }, { t: 70, kind: 'heartbeat' }, { t: 100, kind: 'heartbeat' }, { t: 130, kind: 'heartbeat' }] },
];
const onlineAt = ref(170);
const laneState = computed(() => lanes.map(lane => {
  const last = lane.events.filter(e => e.t <= onlineAt.value).at(-1);
  if (!last) return { ...lane, state: 'not here yet', on: false };
  if (last.kind === 'leave') return { ...lane, state: `left at ${last.t} s, deleted straight away`, on: false };
  const age = onlineAt.value - last.t;
  if (age > 90) return { ...lane, state: `last heard at ${last.t} s, swept out at ${last.t + 90} s`, on: false };
  return { ...lane, state: `heard ${age} s ago`, on: true };
}));
const onlineCount = computed(() => laneState.value.filter(l => l.on).length);
let onlineTimer;
const onlinePlaying = ref(false);
function playOnline() {
  onlinePlaying.value = !onlinePlaying.value;
  clearInterval(onlineTimer);
  if (!onlinePlaying.value) return;
  if (onlineAt.value >= 300) onlineAt.value = 0;
  onlineTimer = setInterval(() => {
    onlineAt.value = Math.min(300, onlineAt.value + 2);
    if (onlineAt.value >= 300) playOnline();
  }, 60);
}
watch(visible, on => { if (!on && onlinePlaying.value) playOnline(); });
onBeforeUnmount(() => clearInterval(onlineTimer));
const tx = t => 8 + t / 300 * 424;

// ---- boards: windows sliding over a year of scores ----
// day 0 is the first day on the chart. each entry is a player's best that day
const scoreDays = [
  { id: 'ace', name: 'ACE', day: 4, score: 88 },
  { id: 'bob', name: 'BOB', day: 60, score: 61 },
  { id: 'ace', name: 'ACE', day: 120, score: 47 },
  { id: 'cat', name: 'CAT', day: 210, score: 55 },
  { id: 'dee', name: 'DEE', day: 300, score: 39 },
  { id: 'bob', name: 'BOB', day: 330, score: 44 },
  { id: 'eve', name: 'EVE', day: 372, score: 36 },
  { id: 'cat', name: 'CAT', day: 390, score: 29 },
  { id: 'fox', name: 'FOX', day: 395, score: 33 },
  { id: 'dee', name: 'DEE', day: 398, score: 21 },
];
const today = ref(400);
const span = 420;
const boardDays = [
  { key: 7, label: '7 days' },
  { key: 30, label: '30 days' },
  { key: 90, label: '90 days' },
  { key: 365, label: '1 year' },
];
// the same rule as since() in live-stats.mjs: day > today - n, then each player's best
const since = n => {
  const best = new Map();
  for (const s of scoreDays) {
    if (s.day > today.value || s.day <= today.value - n) continue;
    if (!best.has(s.id) || best.get(s.id).score < s.score) best.set(s.id, s);
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 10);
};
const boards = computed(() => [
  ...boardDays.map(b => ({ ...b, rows: since(b.key) })),
  // all time is the scores table, a player's best ever, kept for the top 100
  { key: 'all', label: 'All time', rows: since(Infinity) },
]);
const pruned = computed(() => scoreDays.filter(s => s.day <= today.value && s.day < today.value - 366));
const bx = d => 6 + d / span * 288;

// ---- choice: the trade-off ----
const choice = {
  template: 'comparison', title: 'Supabase or one Durable Object', items: [
    { label: 'Supabase', text: 'A hosted Postgres database with realtime bolted on. Validation would live in a separate function, and fan-out in Realtime watching the table, so a rule like “delete stale sessions, then count” spans two systems.', note: 'Database first · SQL dashboard · portable Postgres' },
    { label: 'One Durable Object', text: 'A single-threaded coordinator with SQLite attached. Every rule runs in one place, in order, next to the data, on the same domain as the site. Idle, it costs next to nothing.', note: 'Coordinator first · one location · Cloudflare only' },
  ],
};

onMounted(() => {
  if (props.figure === 'tables') resetTables();
});
</script>

<template>
  <figure ref="root" class="pf-figure" :class="`bf-fig-${figure}`">
    <figcaption v-if="caption || number">
      <strong v-if="number">Fig. {{ number }}</strong> {{ caption }}
    </figcaption>
    <p class="sr-only">{{ descriptions[figure] }}</p>

    <!-- lead: two wins at once -->
    <div v-if="figure === 'race'" class="pf-panel">
      <div class="bf-race" aria-hidden="true">
        <div class="bf-visitors">
          <div class="bf-visitor" :class="{ on: race.a }"><RetroIcon name="person" /><strong>A</strong><code>{{ race.a ?? '·' }}</code></div>
          <div class="bf-visitor" :class="{ on: race.b }"><RetroIcon name="person" /><strong>B</strong><code>{{ race.b ?? '·' }}</code></div>
        </div>
        <div class="bf-middle" :class="raceMode">
          <template v-if="raceMode === 'functions'">
            <span class="bf-fn"><RetroIcon name="chip" />function</span>
            <span class="bf-fn"><RetroIcon name="chip" />function</span>
          </template>
          <span v-else class="bf-fn bf-one"><RetroIcon name="chip" />Durable Object<small>one at a time</small></span>
        </div>
        <div class="bf-store" :class="{ bad: race.bad, good: race.good }">
          <RetroIcon name="notebook" />
          <span>minesweeperWins</span>
          <strong>{{ race.count }}</strong>
          <small v-if="race.bad">should be 42</small>
          <small v-else-if="race.good">both counted</small>
        </div>
      </div>
      <div class="pf-detail" aria-live="polite">
        <strong><b>{{ raceStep + 1 }}/{{ raceTotal }}</b> {{ raceModes[raceMode].middle }}</strong>
        <p>{{ race.text }}</p>
      </div>
      <div class="pf-buttons">
        <button class="raised pf-button" :disabled="raceStep === 0" @click="raceGo(raceStep - 1)">Back</button>
        <button class="raised pf-button" :disabled="raceStep >= raceTotal - 1" @click="raceGo(raceStep + 1)">Next</button>
        <span class="pf-toggle" role="group" aria-label="Backend">
          <button v-for="(m, id) in raceModes" :key="id" class="raised pf-button" :class="{ pressed: raceMode === id }" :aria-pressed="raceMode === id" @click="raceGo(0, id)">{{ m.label }}</button>
        </span>
      </div>
    </div>

    <!-- tables: the durable object's sqlite -->
    <div v-else-if="figure === 'tables' && db" class="pf-panel">
      <div class="pf-controls">
        <div class="pf-control">
          <span id="bf-who">Sent by</span>
          <span class="pf-toggle" role="group" aria-labelledby="bf-who">
            <button v-for="(v, i) in visitors" :key="v.id" class="raised pf-button" :class="{ pressed: who === i }" :aria-pressed="who === i" @click="who = i">{{ v.label }}</button>
          </span>
        </div>
        <div class="pf-control">
          <span>Clock <b>{{ clock }} UTC</b></span>
          <span class="pf-toggle">
            <button class="raised pf-button" @click="wait(30)">+30 s</button>
            <button class="raised pf-button" @click="wait(120)">+2 min</button>
            <button class="raised pf-button" @click="resetTables">Reset</button>
          </span>
        </div>
      </div>
      <div class="pf-buttons bf-sends">
        <button v-for="a in tableActions" :key="a.label" class="raised pf-button" @click="a.run">{{ a.label }}</button>
      </div>
      <div class="pf-buttons bf-snake">
        <label for="bf-name">Snake name</label>
        <input id="bf-name" v-model="snakeName" class="inset" maxlength="12" autocomplete="off">
        <label for="bf-score">score <b>{{ snakeScore }}</b></label>
        <input id="bf-score" v-model.number="snakeScore" class="pf-range bf-score" type="range" min="1" max="99">
        <button class="raised pf-button" @click="sendScore">Save score</button>
        <span v-if="nameError" class="pf-note bf-name-error">{{ nameError }}</span>
      </div>
      <pre v-if="lastRun" class="pf-code bf-ran" aria-live="polite"><span v-for="(line, i) in lastRun.ran" :key="i" :class="{ dim: line.startsWith('--') || line.startsWith('DELETE FROM sessions WHERE seen') }">{{ line }}
</span></pre>
      <p v-else class="pf-note">Send something to see the statements it runs.</p>
      <div class="bf-tables">
        <div class="pf-scroll">
          <table class="pf-table">
            <caption>totals</caption>
            <thead><tr><th>name</th><th>value</th></tr></thead>
            <tbody><tr v-for="r in db.totals" :key="r.name" :class="{ new: isNew('totals', r.name) }"><td>{{ r.name }}</td><td>{{ r.value }}</td></tr></tbody>
          </table>
        </div>
        <div class="pf-scroll">
          <table class="pf-table">
            <caption>sessions ({{ db.sessions.length }} online)</caption>
            <thead><tr><th>id</th><th>seen</th></tr></thead>
            <tbody>
              <tr v-for="r in db.sessions" :key="r.id" :class="{ new: isNew('sessions', r.id) }"><td>{{ r.id }}</td><td>{{ Math.round((db.now - r.seen) / 1000) }} s ago</td></tr>
              <tr v-for="r in goneRows('sessions')" :key="`gone-${r.id}`" class="gone"><td>{{ r.id }}</td><td>deleted</td></tr>
              <tr v-if="!db.sessions.length && !goneRows('sessions').length" class="empty"><td colspan="2">nobody</td></tr>
            </tbody>
          </table>
        </div>
        <div class="pf-scroll">
          <table class="pf-table">
            <caption>scores</caption>
            <thead><tr><th>id</th><th>score</th><th>name</th></tr></thead>
            <tbody><tr v-for="r in db.scores" :key="r.id" :class="{ new: isNew('scores', JSON.stringify([r.id, ''])) }"><td>{{ r.id.slice(0, 6) }}…</td><td>{{ r.score }}</td><td>{{ r.name ?? 'NULL' }}</td></tr></tbody>
          </table>
        </div>
        <div class="pf-scroll">
          <table class="pf-table">
            <caption>daily_scores</caption>
            <thead><tr><th>id</th><th>day</th><th>score</th><th>name</th></tr></thead>
            <tbody><tr v-for="r in db.daily_scores" :key="r.id + r.day" :class="{ new: isNew('daily_scores', JSON.stringify([r.id, r.day])) }"><td>{{ r.id.slice(0, 6) }}…</td><td>{{ r.day }}</td><td>{{ r.score }}</td><td>{{ r.name ?? 'NULL' }}</td></tr></tbody>
          </table>
        </div>
      </div>
      <div v-if="lastRun?.response" class="pf-detail">
        <strong>Response</strong> <code>200, part of the JSON</code>
        <pre class="pf-code bf-response">{{ JSON.stringify(lastRun.response) }}</pre>
      </div>
    </div>

    <!-- online: the 90 second rule -->
    <div v-else-if="figure === 'online'" class="pf-panel">
      <svg class="bf-lanes" viewBox="0 0 440 118" role="img" :aria-label="`At ${onlineAt} seconds, ${onlineCount} of 4 visitors count as online.`">
        <g v-for="(lane, i) in laneState" :key="lane.label" :transform="`translate(0 ${10 + i * 26})`">
          <line :x1="tx(0)" :x2="tx(300)" y1="0" y2="0" class="bf-track" />
          <rect v-if="lane.on" :x="tx(Math.max(0, onlineAt - 90))" y="-5" :width="tx(onlineAt) - tx(Math.max(0, onlineAt - 90))" height="10" class="bf-window" />
          <g v-for="e in lane.events" :key="e.t">
            <rect v-if="e.kind === 'leave'" :x="tx(e.t) - 3" y="-4" width="6" height="8" class="bf-leave" :class="{ past: e.t <= onlineAt }" />
            <circle v-else :cx="tx(e.t)" cy="0" :r="e.kind === 'visit' ? 4.4 : 3.2" class="bf-beat" :class="{ past: e.t <= onlineAt, visit: e.kind === 'visit' }" />
          </g>
        </g>
        <line :x1="tx(onlineAt)" :x2="tx(onlineAt)" y1="0" y2="112" class="bf-now" />
      </svg>
      <div class="pf-controls bf-online-controls">
        <div class="pf-control">
          <label for="bf-online-at">Clock <b>{{ onlineAt }} s</b></label>
          <input id="bf-online-at" v-model.number="onlineAt" class="pf-range bf-wide" type="range" min="0" max="300">
        </div>
        <button class="raised pf-button" @click="playOnline">{{ onlinePlaying ? 'Stop' : 'Play' }}</button>
      </div>
      <ul class="bf-who" aria-live="polite">
        <li v-for="lane in laneState" :key="lane.label" :class="{ on: lane.on }"><i />{{ lane.label }}<span>{{ lane.state }}</span></li>
      </ul>
      <div class="pf-detail">
        <strong>{{ onlineCount }} online now</strong> <code>SELECT COUNT(*) FROM sessions</code>
        <p>Dots are heartbeats, the big dot is the visit, and squares are leaves. The shaded band is the last 90 seconds: anyone with a dot inside it counts.</p>
      </div>
    </div>

    <!-- boards: sliding windows -->
    <div v-else-if="figure === 'boards'" class="pf-panel">
      <svg class="bf-days" viewBox="0 0 300 70" role="img" :aria-label="`Scores over ${span} days, with today at day ${today}.`">
        <rect v-for="b in boardDays" :key="b.key" :x="bx(Math.max(0, today - b.key))" :width="bx(today) - bx(Math.max(0, today - b.key))" :y="4 + boardDays.indexOf(b) * 4" :height="62 - boardDays.indexOf(b) * 8" class="bf-span" />
        <line :x1="bx(today)" :x2="bx(today)" y1="0" y2="70" class="bf-now" />
        <g v-for="(s, i) in scoreDays" :key="i">
          <circle :cx="bx(s.day)" :cy="66 - s.score * 0.6" r="3" class="bf-score-dot" :class="{ future: s.day > today, pruned: s.day <= today && s.day < today - 366 }"><title>{{ s.name }}: {{ s.score }} on day {{ s.day }}</title></circle>
        </g>
      </svg>
      <div class="pf-controls">
        <div class="pf-control">
          <label for="bf-today">Today is day <b>{{ today }}</b></label>
          <input id="bf-today" v-model.number="today" class="pf-range bf-wide" type="range" :min="0" :max="span">
        </div>
      </div>
      <div class="bf-boards">
        <section v-for="b in boards" :key="b.key" class="bf-board">
          <h4>{{ b.label }}</h4>
          <ol>
            <li v-for="r in b.rows.slice(0, 3)" :key="r.id"><span>{{ r.name }}</span><b>{{ r.score }}</b></li>
            <li v-if="!b.rows.length" class="empty">no scores</li>
          </ol>
        </section>
      </div>
      <p class="pf-note">
        Each board is one query over daily_scores: every row newer than the window, each player’s best. Nothing moves a score off a board. The window slides past it.
        <template v-if="pruned.length"> {{ pruned.length }} {{ pruned.length === 1 ? 'row is' : 'rows are' }} older than 366 days and go the next time a score is saved (hollow dots). All time reads the scores table, so ACE’s 88 stays.</template>
      </p>
    </div>

    <!-- choice -->
    <BlogGraphic v-else-if="figure === 'choice'" :graphic="choice" class="bf-choice" />
  </figure>
</template>

<style scoped>
/* race: two visitors, what's in between, and the stored count */
.bf-race { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr); align-items: center; gap: 12px; }
.bf-visitors { display: grid; gap: 8px; }
.bf-visitor { display: grid; grid-template-columns: auto auto minmax(0, 1fr); align-items: center; gap: 6px; padding: 6px 8px; font-size: 12px; background: var(--d-page-alt, #fffdf2); border: 2px solid var(--d-line, #000); }
.bf-visitor svg { width: 20px; height: 20px; }
.bf-visitor code { text-align: right; overflow-wrap: anywhere; }
.bf-visitor.on { border-color: var(--navy, #000080); box-shadow: 3px 3px 0 var(--navy, #000080); }
.bf-middle { display: grid; gap: 8px; }
.bf-fn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; font-size: 12px; text-align: center; background: var(--surface); border: 2px solid; border-color: var(--light) var(--edge) var(--edge) var(--light); color: var(--ink); }
.bf-fn svg { width: 22px; height: 22px; }
.bf-one { padding: 20px 4px; }
.bf-one small { color: var(--muted); font-size: 11px; }
.bf-store { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; font-size: 11px; text-align: center; background: var(--paper); border: 2px solid var(--d-line, #000); }
.bf-store svg { width: 24px; height: 24px; }
.bf-store strong { font: bold 30px/1.1 'Pixel MS Sans Serif', monospace; color: var(--ink); }
.bf-store.bad { border-color: var(--pf-bad); box-shadow: 3px 3px 0 var(--pf-bad); }
.bf-store.bad small { color: var(--pf-bad); font-weight: bold; }
.bf-store.good { border-color: var(--pf-good); box-shadow: 3px 3px 0 var(--pf-good); }
.bf-store.good small { color: var(--pf-good); font-weight: bold; }
@container (max-width: 440px) {
  .bf-race { grid-template-columns: minmax(0, 1fr); }
  .bf-visitors { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bf-middle:not(.object) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* tables */
.bf-sends { margin: 0 0 8px; }
.bf-snake { margin: 0 0 10px; font-size: 12px; }
.bf-snake input.inset { width: 7em; padding: 3px 5px; font: 12px Tahoma, sans-serif; text-transform: uppercase; background: var(--paper); color: var(--ink); }
.bf-score { width: 110px; }
.bf-name-error { margin: 0; color: var(--pf-bad); }
.bf-ran { margin-bottom: 10px; font-size: 11px; }
.bf-ran span { display: block; }
.bf-tables { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.bf-response { margin-top: 6px; font-size: 11px; }
@container (max-width: 520px) { .bf-tables { grid-template-columns: minmax(0, 1fr); } }

/* online */
.bf-lanes, .bf-days { display: block; width: 100%; height: auto; background: var(--paper); border: 1px solid var(--d-rule, #ccc); }
.bf-track { stroke: var(--d-rule, #ccc); stroke-width: 1; }
.bf-window { fill: #1baf7a; opacity: .22; }
.bf-beat { fill: var(--paper); stroke: var(--muted); stroke-width: 1; }
.bf-beat.past { fill: #1baf7a; stroke: var(--d-line, #000); }
.bf-beat.visit.past { fill: var(--navy, #000080); }
.bf-leave { fill: var(--paper); stroke: var(--muted); }
.bf-leave.past { fill: var(--pf-bad); stroke: var(--d-line, #000); }
.bf-now { stroke: var(--ink); stroke-width: 1; stroke-dasharray: 2 2; }
.bf-online-controls { margin: 10px 0 6px; }
.bf-wide { width: 260px; }
.bf-who { margin: 0; padding: 0; list-style: none; display: grid; gap: 3px; font-size: 12px; }
.bf-who li { display: grid; grid-template-columns: 14px 8.5em minmax(0, 1fr); align-items: center; gap: 6px; color: var(--muted); }
.bf-who li.on { color: var(--ink); font-weight: bold; }
.bf-who i { width: 10px; height: 10px; border: 1px solid var(--d-line, #000); background: var(--surface); }
.bf-who li.on i { background: #1baf7a; }
.bf-who span { font: 12px Tahoma, sans-serif; font-weight: normal; }

/* boards */
.bf-days { margin-bottom: 10px; }
.bf-span { fill: var(--bar-1); opacity: .12; }
.bf-score-dot { fill: var(--bar-2); stroke: var(--d-line, #000); stroke-width: .6; }
.bf-score-dot.future { fill: none; stroke: var(--d-rule, #ccc); }
.bf-score-dot.pruned { fill: var(--paper); stroke: var(--muted); }
.bf-boards { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.bf-board { padding: 6px; background: var(--d-page-alt, #fffdf2); border: 2px solid var(--d-line, #000); min-width: 0; }
.bf-board h4 { margin: 0 0 4px; font: bold 11px 'Pixel MS Sans Serif', Tahoma, sans-serif; }
.bf-board ol { margin: 0; padding: 0 0 0 16px; font: 11px 'Courier New', monospace; }
.bf-board li { display: list-item; }
.bf-board li span { margin-right: 4px; }
.bf-board li.empty { list-style: none; margin-left: -16px; color: var(--muted); font-style: italic; }
@container (max-width: 520px) { .bf-boards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.bf-choice { margin: 0; }
</style>
