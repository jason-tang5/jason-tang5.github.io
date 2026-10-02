This site is a Windows 95 desktop that I built in about 180 commits over five days. A lot of the parts I had the most fun with aren't really laid out in HTML, they're drawn on a canvas. This post goes through three of them: the photos you can smash, the game backdrops that play themselves, and the figures in these posts.

# Photos made of letters

The About photo and everything in My Pictures show up as coloured ASCII. If you pick up the hammer you can knock the letters off and see the photo underneath. The one at the top of this post is the actual component, so feel free to smash Pocky.

The animated wallpaper uses [react-video-ascii](https://www.npmjs.com/package/react-video-ascii), mounted in a tiny React root inside the Vue app. For photos I wrote my own canvas version, `KnockoffAscii.vue`, mostly because I wanted the hammer.

## From pixels to letters

First the photo gets shrunk until each letter has one pixel. Letters are about 1.65 times taller than they are wide, so the grid ends up with fewer rows than you'd expect. Each pixel's brightness (using the luma formula, which weights green the most) picks a character from this ramp, dark to bright:

```text
 .,:;i1tfLCG08@
```

I skip the space, so even the darkest cell still gets a dot. Each letter is drawn in its pixel's colour, brightened a bit so dark photos don't disappear.

![Picking a letter for each pixel](/figures/ui/ramp "Point at any cell to see its maths")

## Drawing thousands of letters without lag

My first version called `fillText` once per cell with its own fill colour. At full detail that's tens of thousands of letters every rebuild, and dragging the detail slider was laggy.

What I do now is draw each of the 14 characters once, in white, into a strip. Every cell copies its letter out of that strip, and then the colour goes on all at once: I stretch the one-pixel-per-cell photo over the letters with the `source-in` composite mode, so the colour only lands where there are letters.

![Stamping instead of typing](/figures/ui/stamp "Draw once, stamp everywhere, colour it all in one go")

On my laptop in Chrome this is about 1.2 to 1.4 times faster at full detail and 1.7 times faster at the default. The button above times it on whatever you're using. If your browser draws in software, stamping might actually come out slower. The other half of the fix was making the slider rebuild at most once per animation frame instead of on every change.

After it's built, the picture is kept in three canvases: **backing** (the letters that are still there), **glyphs** (letters with no background, for the pieces that fly off) and **glow** (a brighter copy for the mouse trail). Each frame copies `backing` and draws the other two on top.

## The hammer

When every hit broke a perfect circle of letters it looked fake. So now each hit has a solid core, 82% of the radius, where everything breaks, and a wobbly edge made from two sine waves at a random rotation. Letters between the core and the edge break randomly, and less often the further out they are.

![How a hit is worked out](/figures/ui/hit "Click the picture to swing somewhere else")

My first version also made a canvas for every broken letter, and one big hit could freeze the page for half a second. I changed it so neighbouring letters fly off together in chunks at least 8 pixels across, with at most 60 per hit and 300 in the air.

The hit lands 15% into the 0.36 s swing, when the hammer comes down. The crumble sound is made with Web Audio, like every other sound on the site. If you change the detail, the holes stay where they were, because each new cell checks whether the old grid was cleared at its centre. On phones you have to pick up the hammer first, otherwise dragging across a photo wouldn't scroll.

# Games that play themselves in the background

Every game window fills the space around its board with an ASCII version of that game playing itself. In Breakout, bricks and sparks drift up. Snake has snakes playing Snake. Minesweeper's minefield sweeps itself until it hits a mine. Reversi discs flip their neighbours in ripples, and 2048 has a board sliding and merging.

![The real backdrops](/figures/ui/backdrop "The same code as the game windows. Try the switches")

The 2048 backdrop calls the game's own `slideLine`, so the merges follow the real rules. They all speed up while you're playing, stop when their window isn't in front or the tab is hidden, stay still if you have reduced motion on, and repaint when you switch themes.

# Figures you can poke

There are two ways to put a figure in a post. The first is a `figure` code block, which is a bit of JSON that fills in one of six templates (flow, steps, timeline, comparison, metrics or bars). Every field gets checked, so it can't contain HTML, and I can write one from my phone.

Figures like the ones in this post are Vue components. `blog-figures.mjs` replaces an image line that has a specific address with a figure, so the post text stays plain. If I remove the entry, the image comes back.

![How a figure gets into a post](/figures/ui/swap "Edit the text and watch the blocks change")

When I can, I have the figures run the real code. The [contact form post](/#app=blog) calls the Worker's own `validate`. In this post, the smash and backdrop figures are the real components, and the ramp and hit figures use the hammer's numbers. They only animate while they're on screen, and on a phone they stack into a column.

# Wrapping up

Getting ASCII on the screen only took a few lines. Most of my time went into the second version: making it fast enough for a slider, keeping holes when the grid changes, and not freezing on a big hit. Reusing the real code for the backdrops and figures also turned out to be less work than faking it, and it means the explanations stay accurate when I change things.
