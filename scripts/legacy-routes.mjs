// the old site had a page per section (/about/, /projects/, ...). these little
// redirect pages keep those links working by opening the matching desktop app.
import { mkdir, writeFile } from 'node:fs/promises';

const routes = {
  about: 'about',
  experiences: 'experience',
  projects: 'projects',
  contact: 'contact',
  blog: 'blog',
};

for (const [path, app] of Object.entries(routes)) {
  const target = `../index.html#app=${app}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><title>Jason Tang</title></head><body><a href="${target}">Open ${app}</a></body></html>\n`;

  await mkdir(path, { recursive: true });
  await writeFile(`${path}/index.html`, html);
}
