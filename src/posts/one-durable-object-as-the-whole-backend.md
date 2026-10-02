This site is almost all static files. The only things that change are some small counters: visits, who's online, Minesweeper wins, Clippy's Reversi record, and Snake leaderboards over five time ranges. All of that lives in one Cloudflare Durable Object with SQLite inside it, in about 60 lines.

The short version: one object handles every request in order, right next to its data, and that makes the rest of the backend a lot simpler.

# What a Durable Object is

A Durable Object is an instance of a class that Cloudflare runs for you, with storage attached. Every request for a given name goes to the same instance, no matter where it comes from. Mine is called `site`:

```js
env.LIVE_STATS.get(env.LIVE_STATS.idFromName('site'))
```

It handles one request at a time, and its SQLite calls are synchronous, so nothing else can run in the middle of a request's statements. That's why the figure at the top can't lose a count.

To be fair, a normal database can increment safely too. What I actually like is everything around the increment. When a Snake score is saved, it updates the player's best and today's best, prunes old days, trims the all-time table, clears out stale sessions and builds the response. All of that runs in order, and I don't need a transaction spread across separate services.

The Worker sends every valid analytics event to it from `/api/event`, and reads the numbers from `/api/stats`. In `wrangler.jsonc` it's just one binding and one migration:

```json
"durable_objects": { "bindings": [{ "name": "LIVE_STATS", "class_name": "LiveStats" }] },
"migrations": [{ "tag": "v1-live-stats", "new_sqlite_classes": ["LiveStats"] }]
```

# Four tables

| table | columns | holds |
|---|---|---|
| totals | name, value | all-time counters |
| sessions | id, seen | visits heard from recently |
| scores | id, score, name | each Snake player's best ever |
| daily_scores | id, day, score, name | each player's best per day |

Almost every write is an upsert:

```sql
INSERT INTO totals VALUES ('visitors', 1)
ON CONFLICT(name) DO UPDATE SET value=value+1
```

Best scores use `MAX(score, excluded.score)`, so a worse run never overwrites a better one. When I added leaderboard names, I had the constructor run `ALTER TABLE scores ADD COLUMN name TEXT` inside a try/catch, which throws once the column already exists. It's about the cheapest migration you can do, and it's fine when there's only one.

![The four tables taking requests](/figures/backend/tables "Send some requests and watch the SQL")

# Who's online

"Online now" is just the number of rows in `sessions`. Visits add rows, heartbeats every 30 seconds refresh them, and a leave deletes one. Leaves don't always arrive, so every request starts by removing anyone who's been quiet for 90 seconds:

```sql
DELETE FROM sessions WHERE seen < ?
```

I didn't need a cron job or a timer for this. Stale rows can sit around for a while, but the cleanup always runs before the count.

![Who counts as online](/figures/backend/online "Drag the clock, or press Play")

# Leaderboards over any window

Rather than keeping a table for each board, `daily_scores` stores each player's best per day, and every board is the same query with a different start day:

```sql
SELECT id, MAX(score) AS score, name FROM daily_scores
WHERE day > ? GROUP BY id ORDER BY score DESC, id LIMIT 10
```

Nothing has to move a score off a board, the window just slides past it. With `MAX()`, SQLite takes the other columns from the row with the max, so `name` comes from the player's best day. Days older than 366 are pruned on every save, and the all-time board reads from `scores`, which keeps the top 100.

![Windows sliding over a year of scores](/figures/backend/boards "Move today and watch the boards change")

Names are checked in the browser and then again in the object with the [obscenity](https://www.npmjs.com/package/obscenity) package, which catches swaps like `sh1t`. If a name gets blocked it's saved as `NULL` and shown as `Player` plus six characters of the player's id.

# What it costs

My original plan was Supabase: Postgres, realtime, and a separate function for validation. That's three systems that all have to agree with each other. A Durable Object is a coordinator first with a database attached, which is simpler when all you have is one small set of counters.

![Supabase or one Durable Object](/figures/backend/choice)

There are some downsides, though. It runs in one location, so visitors who are far away wait a bit longer for the numbers. One object's throughput is the limit, which is fine for a portfolio but wouldn't be for a busy app. Moving off Cloudflare would mean rewriting it. And there's no SQL console, so every new question I want answered needs its own endpoint.

It fits in the free plan with lots of room left over.

# Wrapping up

The whole thing is one class, four tables and about a dozen statements. Since requests run one at a time next to the data, things like "clean up, then count" and "save, prune, rank" are just lines of code in order. Storing only what I needed, like a best score per day and a last-seen time, turned out to answer every question without adding more tables or timers.
