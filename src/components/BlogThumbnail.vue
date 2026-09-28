<script setup>
import { computed, ref, watch } from 'vue';
import RetroIcon from './RetroIcon.vue';
const props = defineProps({ src: { type: String, default: '' }, gallery: Boolean });
const failed = ref(false);
watch(() => props.src, () => { failed.value = false; });
const showImage = computed(() => props.src && !failed.value);
</script>

<template>
  <span class="blog-thumbnail" aria-hidden="true">
    <img v-if="showImage" :src="src" alt="" loading="lazy" @error="failed = true">
    <span v-else class="thumb-window"><span class="thumb-title"><i /><i /><i /></span><span class="thumb-body"><RetroIcon :name="gallery ? 'chart' : 'document'" /><span class="thumb-lines"><i /><i /><i /></span></span></span>
  </span>
</template>

<style scoped>
.blog-thumbnail { display: grid; place-items: center; width: 112px; height: 84px; flex: none; padding: 3px; box-sizing: border-box; background: var(--surface); border: 2px solid; border-color: var(--shadow) var(--light) var(--light) var(--shadow); overflow: hidden; }
.blog-thumbnail img { display: block; width: 100%; height: 100%; object-fit: cover; }
.thumb-window { width: 82%; border: 2px solid; border-color: var(--light) var(--edge) var(--edge) var(--light); background: var(--paper); }
.thumb-title { display: flex; justify-content: flex-end; gap: 2px; padding: 3px; background: var(--navy, #000080); }
.thumb-title i { width: 5px; height: 5px; background: #c0c0c0; }
.thumb-body { display: flex; align-items: center; gap: 7px; padding: 8px; }
.thumb-body svg { flex: none; width: 25px; height: 25px; }
.thumb-lines { display: grid; gap: 4px; flex: 1; }
.thumb-lines i { height: 3px; background: var(--shadow); }
.thumb-lines i:last-child { width: 65%; }
@media (max-width: 480px) { .blog-thumbnail { width: 84px; height: 72px; } .thumb-body { padding: 7px 3px; gap: 3px; } }
</style>
