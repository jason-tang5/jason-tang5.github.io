The Analytics window on this site is public. It shows visits, which windows people open, how many people beat Breakout, and how badly Clippy is winning at Reversi. I wanted real numbers without cookies, IP addresses or a third-party script.

The short version: the browser sends small anonymous events to a Cloudflare Worker. Live totals go into a Durable Object, and history goes into Workers Analytics Engine, which I read back with SQL. Your own events show up right away as "floors" that the server can only raise.

# What gets tracked

Nothing gets sent until your first click, tap or key press. That's when a visit id is made: ten random characters kept in a JavaScript variable, not a cookie or storage, so refreshing starts a new visit. Waiting for a real press also keeps bots and link previews out without any extra work. Anything that happens before that, like a window opened from a link, waits in a queue.

After that, the site calls `track(name, detail, value)` with one of 20 event names, like `open`, `minesweeper-win` or `breakout-win` (where the value is how many seconds it took). Funnel steps use `trackOnce`, so opening Contact five times only counts once. There's also a `heartbeat` every 30 seconds and a `leave` when the page is hidden, which are only used for "online now".

Events are sent with `navigator.sendBeacon`, which still gets through while the page is closing. They're only sent on `jasontang.dev`, so my local testing doesn't count.

![What one visit sends](/figures/analytics/event "Load the page, then press things")

# Checking and storing

Anyone can `POST` to `/api/event`, so the Worker is strict about what it accepts. The `Origin` has to be `jasontang.dev`, the body has to be under 1,000 bytes, the name has to be one of the 20, the other fields have to be short slugs, and the value has to be between 0 and a million. Anything else gets a 400, which is what the "forge an event" button above does.

Valid events go to the Durable Object for the live numbers (I wrote about that in [One Durable Object as the Whole Backend](/#app=blog)). Heartbeats and leaves stop there. Everything else also gets written to **Workers Analytics Engine** with `writeDataPoint`, using the visit id as the index, plus five text fields and the value. The Worker doesn't wait for a reply.

# Reading it back

The Analytics Engine SQL API needs an account token, so the window asks the Worker for `/api/analytics?days=30` (or 7, or 90, which is about as far back as it keeps data). The Worker runs two queries, one for events grouped by name, detail, device and referrer, and one for visits per day. Both count with:

```sql
SUM(_sample_interval) AS count
```

When there's a lot of traffic, Analytics Engine might only keep a sample, and `_sample_interval` tells you how many events each row stands for, so the sum still comes out right. Sampling keeps or drops whole indexes, and since the index is the visit, a sampled visit keeps its entire Breakout run.

![Rows in, numbers out](/figures/analytics/summary "Try storing only 1 visit in 4")

`summarize()` turns those rows into the funnel, the average Breakout win time and everything else. It also combines all the sticky notes, which are each their own window, into one row.

# How it's displayed

The window has two tabs. **Scoreboard** has the cards, visits per day and the leaderboard. **Behind the scenes** has the funnel, windows opened, posts read and mail form errors. "Your scores" come from `localStorage` in your browser and never get sent anywhere.

The pie charts are pixel art. They're a 24 × 24 grid where each pixel takes the colour of whichever slice its angle falls in. Anything past the top five goes into "Other".

![The pixel pie](/figures/analytics/pie "Point at any pixel. This is the real PixelPie component")

# Live counters that never go backwards

Say you beat Minesweeper and then open Analytics. The card should already include your win, but your event might not have reached the server yet. The window asks for new numbers a second after opening and then every 30 seconds, and that request can get there before your event does.

If I just added your changes on top of the server's numbers, your win would get counted twice once the server caught up. If I dropped your change too early, the card would go up, then down, then up again. So I treat your change as a **floor**. The card shows at least the old count plus one, and the server's number can only raise it. The floor is removed once the server reaches it, or after 90 seconds, so a lost event doesn't stay stuck forever.

![Three ways to show a counter](/figures/analytics/floors "Win, lose an event, and slow the network down")

There was one case that took me a while to catch. A request sent just before your win can come back just after it, with numbers that are already out of date. To handle that, every change gets a revision number, and a response can only clear floors that were set before its request went out. Averages can't really have a floor, so the average win time stays put until the server has counted as many wins as your screen shows. New leaderboard scores get added straight away.

All of this is in `optimistic-stats.mjs`, which is about 90 lines and tested in Node. The figure above runs that same module on a fake clock.

# Wrapping up

Anonymous analytics ended up being easier than I expected. An id kept in memory, nothing sent before a press, and a strict Worker covered most of it. The tricky part was getting your own changes to show up immediately without the numbers ever going backwards, and what fixed it was treating your change as a minimum instead of something to add on top.
