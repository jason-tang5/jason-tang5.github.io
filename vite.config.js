import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // relative base so the build works from any subpath, not just the domain root
  base: './',
  // keep vite's output out of assets/, which holds our own static files
  build: { assetsDir: 'desktop-assets' },
});
