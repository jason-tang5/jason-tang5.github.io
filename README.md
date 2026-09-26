# jasontang.dev

my portfolio, dressed up as a windows 95 desktop. built with vue 3 and vite, and deployed to cloudflare workers as a static site.

## running it

```sh
npm install
npm run dev       # local dev server
npm test          # unit tests (window geometry, cd player track end detection)
npm run build     # builds everything into dist/
npm run preview   # serves dist/ locally
```

there's also a full browser check that clicks through every app. it needs playwright's chromium (`npx playwright install chromium`) and a fresh build:

```sh
npm run build
node tests/browser-check.mjs
```

it serves the build under `/portfolio/` to make sure nothing breaks on a subpath, and it saves screenshots to `tmp/qa/`.

## deploying

`npm run deploy` builds and runs `wrangler deploy`. the config is in `wrangler.jsonc`. log in once first with `npx wrangler login`. pushing to `main` also deploys automatically.

the site is static except `/api/contact`, a small worker in `worker/` that emails me whatever gets sent from the mail window (it opens after you beat breakout). it uses cloudflare email routing, which has to be turned on for jasontang.dev with my gmail verified as a destination. `npx wrangler dev` runs it locally and saves sent emails as `.eml` files in `.wrangler/tmp/email/` instead of sending them.

## writing blog posts from the site

when i'm signed in, the blog window gets New Post, Edit and Delete buttons. posts are saved by the worker into a workers kv namespace, and anyone can read them. signing in goes through cloudflare access, so there's no password code in the repo. one-time setup:

1. `npx wrangler kv namespace create BLOG` and paste the id into `wrangler.jsonc`
2. in the cloudflare dashboard, zero trust → access → applications → add a self-hosted app for `jasontang.dev/api/admin`, with a policy that only allows my email (one-time pin login is fine)
3. copy the app's audience (aud) tag and the team domain (`<team>.cloudflareaccess.com`) into `ACCESS_AUD` and `ACCESS_TEAM_DOMAIN` in `wrangler.jsonc`, then deploy

to sign in, go to `jasontang.dev/api/admin/login`. access asks for the email code, then drops me back in the blog. sign out is in the blog toolbar. the worker checks the access token itself too, so if the access app is ever misconfigured, writes fail instead of being open to everyone.

the editor format: blank lines split paragraphs, `## ` starts a heading, `![alt](url "caption")` on its own line adds an image, and ``` fences a code block. drafts are kept in localstorage until published.

## where things live

- `src/content.mjs`: bio, jobs, projects and email. most text edits happen here
- `src/registry.js`: the list of apps, their icons and default window sizes
- `src/components/AppContent.vue`: what shows inside each window
- `src/components/DesktopWindow.vue` + `src/window-state.mjs`: dragging, resizing, maximizing
- `src/theme.css`: all the styling, split into sections per app
- `src/components/RetroIcon.vue`: the pixel icons, drawn as svg
- `src/breakout.js`: the breakout game in the contact window. clearing it reveals my email
- `src/music.mjs`: the album the cd player plays
- `src/photos.mjs`: photos for my pictures. full size webps plus 200px thumbnails live in `assets/photos/`
- `src/blog.mjs`: blog posts kept in the repo (empty for now). the supported block types are listed at the top of the file
- `worker/blog.mjs` + `src/blog-markup.mjs`: posts written from the site itself (see below)

the old site had pages like `/about/` and `/projects/`. `npm run content` (part of the build) regenerates small redirect pages there so old links open the right window.

## credits

- window chrome and palette adapted from don chia's [vuejs-os-template](https://github.com/DonChiaQE/vuejs-os-template) (mit, `licenses/vuejs-os-template-MIT.txt`)
- some win98 control styling borrowed from [98.css](https://github.com/jdan/98.css) (mit, `licenses/98css-MIT.txt`)
- windows 95/98 cursors by darix555, public domain (`licenses/win98-cursors-public-domain.txt`)
- the wallpaper is a vaporwave sunset gif from tenor, rendered as ascii with [react-video-ascii](https://www.npmjs.com/package/react-video-ascii). source link in `assets/wallpaper-source.txt`
