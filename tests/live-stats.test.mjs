import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { LiveStats } from '../worker/live-stats.mjs';
function setup() {
  const db = new DatabaseSync(':memory:');
  const ctx = { storage: { sql: { exec(query, ...args) { const statement = db.prepare(query); return statement.columns().length ? statement.all(...args) : (statement.run(...args), []); } } } };
  return { ctx, stats: new LiveStats(ctx) };
}
const post = (stats, name, visit = 'visitor123', value = 0) => stats.fetch(new Request('https://stats/', { method: 'POST', body: JSON.stringify({ name, visit, value }) }));
const get = async stats => (await stats.fetch(new Request('https://stats/'))).json();
test('durable totals, presence and leaderboard survive object recreation', async () => {
  const { stats, ctx } = setup();
  await post(stats, 'visit');
  await post(stats, 'heartbeat');
  await post(stats, 'minesweeper-win');
  await post(stats, 'breakout-complete');
  await post(stats, 'reversi-lose');
  await post(stats, 'reversi-lose');
  await post(stats, 'reversi-win');
  await post(stats, 'snake-score', 'visitor123', 12);
  await post(stats, 'snake-score', 'visitor123', 5);
  await post(stats, 'snake-score', 'visitor456', 20);
  const data = await get(new LiveStats(ctx));
  assert.equal(data.visitors, 1);
  assert.equal(data.online, 1);
  assert.equal(data.minesweeperWins, 1);
  assert.equal(data.breakoutWins, 1);
  assert.equal(data.clippyWins, 2);
  assert.equal(data.clippyLosses, 1);
  assert.equal(data.snakeHighScore, 20);
  assert.deepEqual(data.leaderboard.map(r => r.score), [20, 12]);
  await post(stats, 'leave');
  assert.equal((await get(stats)).online, 0);
});
test('presence expires and score storage stays bounded', async () => {
  const { stats, ctx } = setup();
  ctx.storage.sql.exec('INSERT INTO sessions VALUES (?, ?)', 'stale', Date.now() - 91000);
  for (let i = 1; i <= 105; i++) await post(stats, 'snake-score', 'player' + i, i);
  assert.equal((await get(stats)).online, 0);
  assert.equal((await get(stats)).leaderboard.length, 10);
  assert.equal([...ctx.storage.sql.exec('SELECT COUNT(*) AS n FROM scores')][0].n, 100);
});
test('snake names show on the leaderboard, blocked ones stay anonymous', async () => {
  const { stats } = setup();
  const score = (visit, value, player) => stats.fetch(new Request('https://stats/', { method: 'POST', body: JSON.stringify({ name: 'snake-score', visit, value, player }) }));
  await score('visitor001', 30, 'Jason');
  await score('visitor002', 20, 'sh1tface');
  await score('visitor003', 10);
  assert.deepEqual((await get(stats)).leaderboard.map(r => r.player), ['Jason', 'Player VISITO', 'Player VISITO']);
});
test('an older scores table without names gets the column', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE scores (id TEXT PRIMARY KEY, score INTEGER NOT NULL)');
  db.exec("INSERT INTO scores VALUES ('oldplayer1', 5)");
  const ctx = { storage: { sql: { exec(query, ...args) { const statement = db.prepare(query); return statement.columns().length ? statement.all(...args) : (statement.run(...args), []); } } } };
  new LiveStats(ctx);
  const data = await get(new LiveStats(ctx));
  assert.equal(data.leaderboard[0].player, 'Player OLDPLA');
});
test('one player id keeps one row across visits', async () => {
  const { stats } = setup();
  const score = (visit, value, playerId) => stats.fetch(new Request('https://stats/', { method: 'POST', body: JSON.stringify({ name: 'snake-score', visit, value, playerId, player: 'Jason' }) }));
  await score('visitaaaa1', 8, 'browserabc123');
  await score('visitbbbb2', 15, 'browserabc123');
  await score('visitcccc3', 4, 'browserabc123');
  await score('visitdddd4', 9, 'bad id!');
  const board = (await get(stats)).leaderboard;
  assert.deepEqual(board.map(r => [r.player, r.score]), [['Jason', 15], ['Jason', 9]]);
});
