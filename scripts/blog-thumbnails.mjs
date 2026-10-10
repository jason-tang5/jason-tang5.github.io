// makes the post list thumbnails for the posts in blog.mjs whose lead is an
// interactive figure. there's no picture to use there, so this opens each post in a
// browser, takes the picture part of its lead figure (not the notes and buttons under
// it) and puts it on a 4:3 card in the figure's own background colour, saved to
// assets/blog/thumbs/<slug>.png.
// run with node scripts/blog-thumbnails.mjs after changing a lead figure
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 5199, strictPort: true } });
await server.listen();
// through vite, since blog.mjs pulls the posts in as .md?raw
const { posts } = await server.ssrLoadModule('/src/blog.mjs');
const leads = posts.filter(post => post.leadImage?.startsWith('/figures/'));
let browser;
try {
  browser = await chromium.launch();
  await mkdir('assets/blog/thumbs', { recursive: true });
  for (const post of leads) {
    // a fresh page each time, so the blog opens on its list
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
    // only the posts in the repo, never the live ones in kv
    await page.route('**/api/**', route => route.fulfill({ json: route.request().url().endsWith('/api/blog') ? { posts: [] } : {} }));
    await page.goto('http://127.0.0.1:5199/#app=blog');
    await page.addStyleTag({ content: '.sticky-note, .window:not(:has(.blog-thumbnail, article)) { display: none !important; }' });
    await page.getByRole('button', { name: post.title, exact: true }).click();
    // the picture is the first thing in the lead figure's panel, or the figure's own
    // first block when it has no panel
    const lead = page.locator('article .pf-figure').first();
    const picture = lead.locator(':scope > .pf-panel > :first-child, :scope > div:not(.pf-panel, .sr-only) > :first-child').first();
    await picture.scrollIntoViewIfNeeded();
    // let the figure settle into its first frame
    await page.waitForTimeout(1500);
    const shot = (await picture.screenshot()).toString('base64');
    const card = await page.evaluate(async src => {
      const img = new Image();
      img.src = `data:image/png;base64,${src}`;
      await img.decode();
      const canvas = Object.assign(document.createElement('canvas'), { width: 448, height: 336 });
      const ctx = canvas.getContext('2d');
      // the background is the colour in the picture's top left corner
      ctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // fitting a wide diagram whole leaves it too small to read at 112 px, so zoom in
      // up to 1.4 times past that. the diagrams read left to right, so the right edge
      // is what goes
      const fit = Math.min((canvas.width - 32) / img.width, (canvas.height - 32) / img.height);
      const scale = Math.min(fit * 1.4, Math.max(canvas.width / img.width, canvas.height / img.height));
      const w = img.width * scale, h = img.height * scale;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, w > canvas.width - 32 ? 16 : (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      return canvas.toDataURL('image/png').split(',')[1];
    }, shot);
    const path = `assets/blog/thumbs/${post.slug}.png`;
    await writeFile(path, Buffer.from(card, 'base64'));
    console.log(`saved ${path}`);
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
