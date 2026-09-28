<script setup>
import { graphicExamples } from '../blog-templates.mjs';
import BlogGraphic from './BlogGraphic.vue';
const exhibits = graphicExamples.map(example => ({ ...example, caption: '' }));
</script>

<template>
  <section class="blog-gallery" aria-label="Unused graphics">
    <p>trash heap of unused graphics</p>
    <div v-for="example in exhibits" :key="example.template" class="gallery-example">
      <BlogGraphic :graphic="example" />
    </div>
  </section>
</template>

<style scoped>
.gallery-example { margin: 28px 0 36px; }
.gallery-example > figure { margin-bottom: 10px; }
</style>
