<script setup>
// blog list and article view. posts come from blog.mjs unless the test passes some in.
// every block renders as plain text, demos run in a sandboxed iframe.
import { computed, ref, watch, nextTick } from 'vue';
import { posts as localPosts } from '../blog.mjs';

const props = defineProps({
  posts: { type: Array, default: () => localPosts },
});

const slug = ref(null);
const status = ref('');
const reading = ref(null);

const post = computed(() => props.posts.find(p => p.slug === slug.value));

// jump back to the top whenever you switch posts
watch(slug, async () => {
  status.value = '';
  await nextTick();
  reading.value?.scrollTo(0, 0);
});

// noon so the date doesn't slip a day in timezones behind utc
function date(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function copy(code) {
  try {
    await navigator.clipboard.writeText(code);
    status.value = 'Code copied.';
  } catch {
    status.value = 'Copy unavailable. Select the code and copy it manually.';
  }
}
</script>

<template>
  <div class="app-layout">
    <div class="toolbar">
      <button v-if="post" class="raised" @click="slug = null">Back to Blog</button>
      <span v-else>Blog</span>
    </div>

    <div ref="reading" class="content-scroll blog-reading">
      <template v-if="!post">
        <h1>Blog</h1>
        <p v-if="!posts.length">No posts published yet.</p>
        <ul v-else class="blog-list">
          <li v-for="entry in posts" :key="entry.slug">
            <button @click="slug = entry.slug">{{ entry.title }}</button>
            <time :datetime="entry.date">{{ date(entry.date) }}</time>
          </li>
        </ul>
      </template>

      <article v-else>
        <h1>{{ post.title }}</h1>
        <time :datetime="post.date">{{ date(post.date) }}</time>
        <template v-for="(block, i) in [post.lead, ...post.blocks].filter(Boolean)" :key="i">
          <p v-if="block.type === 'paragraph'">{{ block.text }}</p>
          <h2 v-else-if="block.type === 'heading'">{{ block.text }}</h2>
          <figure v-else-if="block.type === 'image'">
            <img :src="block.src" :alt="block.alt">
            <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
          </figure>
          <iframe
            v-else-if="block.type === 'demo'"
            :src="block.src"
            :title="block.title"
            sandbox="allow-scripts"
            loading="lazy"
            class="blog-demo"
          />
          <div v-else-if="block.type === 'code'" class="code-block">
            <div>
              <span>{{ block.language }}</span>
              <button class="raised" @click="copy(block.code)">Copy</button>
            </div>
            <pre><code>{{ block.code }}</code></pre>
          </div>
        </template>
      </article>
    </div>

    <footer class="status-bar" role="status"><span>{{ status || `${posts.length} posts` }}</span></footer>
  </div>
</template>
