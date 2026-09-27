// One SQLite Durable Object serializes counters and retains all-time records.
export class LiveStats {
  constructor(ctx) {
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS totals (name TEXT PRIMARY KEY, value INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, seen INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS scores (id TEXT PRIMARY KEY, score INTEGER NOT NULL)`);
  }
  async fetch(request) {
    const now = Date.now();
    if (request.method === 'POST') {
      const { visit, name, value } = await request.json();
      if (name === 'visit') {
        this.sql.exec(`INSERT INTO totals VALUES ('visitors', 1) ON CONFLICT(name) DO UPDATE SET value=value+1`);
      }
      if (name === 'visit' || name === 'heartbeat') {
        this.sql.exec(`INSERT INTO sessions VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET seen=excluded.seen`, visit, now);
      }
      if (name === 'leave') this.sql.exec(`DELETE FROM sessions WHERE id=?`, visit);
      const counter = { 'minesweeper-win': 'minesweeperWins', 'breakout-complete': 'breakoutWins', 'reversi-lose': 'clippyWins', 'reversi-win': 'clippyLosses' }[name];
      if (counter) this.sql.exec(`INSERT INTO totals VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value=value+1`, counter);
      if (name === 'snake-score' && Number.isInteger(value) && value > 0 && value <= 1000) {
        this.sql.exec(`INSERT INTO scores VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET score=MAX(score, excluded.score)`, visit, value);
        // Only the top 100 anonymous sessions need permanent storage.
        this.sql.exec(`DELETE FROM scores WHERE id NOT IN (SELECT id FROM scores ORDER BY score DESC, id LIMIT 100)`);
      }
    }
    this.sql.exec(`DELETE FROM sessions WHERE seen < ?`, now - 90000);
    const totals = Object.fromEntries([...this.sql.exec('SELECT * FROM totals')].map(r => [r.name, r.value]));
    const leaderboard = [...this.sql.exec('SELECT id, score FROM scores ORDER BY score DESC, id LIMIT 10')].map((r, i) => ({ rank: i + 1, player: 'Player ' + r.id.slice(0, 6).toUpperCase(), score: r.score }));
    const online = [...this.sql.exec('SELECT COUNT(*) AS count FROM sessions')][0].count;
    return Response.json({ visitors: 0, minesweeperWins: 0, breakoutWins: 0, clippyWins: 0, clippyLosses: 0, ...totals, online, snakeHighScore: leaderboard[0]?.score || 0, leaderboard }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
export function liveStats(env) {
  return env.LIVE_STATS.get(env.LIVE_STATS.idFromName('site'));
}
