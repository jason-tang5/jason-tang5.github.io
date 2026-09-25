// copies the static stuff vite doesn't know about into dist after the build.
// this is an allowlist on purpose so random files in the repo never get deployed.
import { cp } from 'node:fs/promises';

const folders = ['assets', 'about', 'experiences', 'projects', 'contact', 'blog', 'licenses', 'games'];

for (const folder of folders) {
  await cp(folder, `dist/${folder}`, { recursive: true });
}

console.log('copied static pages and assets to dist');
