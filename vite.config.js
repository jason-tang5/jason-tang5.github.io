import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // relative base so the build works from any subpath, not just the domain root
  base: './',
  // Vite serves the UI locally; published posts and uploaded images stay in KV.
  server: {
    proxy: {
      '^/api/blog(?:/|$)': {
        target: 'https://jasontang.dev',
        changeOrigin: true,
      },
    },
  },
  // keep vite's output out of assets/, which holds our own static files
  build: { assetsDir: 'desktop-assets' },
});
