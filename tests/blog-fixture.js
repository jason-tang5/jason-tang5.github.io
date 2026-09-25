// mounts the blog renderer with a fake post so browser-check can test it.
// no real posts ship yet, so this is the only way to see the article view.
import { createApp } from 'vue';
import Blog from '../src/components/Blog.vue';

export function mountFixture() {
  const host = document.createElement('div');
  host.id = 'blog-fixture';
  host.style = 'position:fixed;inset:0;z-index:999999;background:white;display:flex';
  document.body.append(host);

  const post = {
    slug: 'test',
    title: 'Renderer fixture',
    date: '2026-09-25',
    lead: { type: 'image', src: '/tests/fixtures/vaporwave.svg', alt: 'Test sunset' },
    blocks: [
      { type: 'paragraph', text: 'A readable paragraph.' },
      { type: 'heading', text: 'Example section' },
      // the renderer should show this as text, not run it
      { type: 'code', language: 'js', code: 'const safe = "<script>";' },
    ],
  };

  createApp(Blog, { posts: [post] }).mount(host);
}
