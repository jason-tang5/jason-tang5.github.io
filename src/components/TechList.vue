<script setup>
// a list of technologies or tools, each one its own element.
// by default it's a line of text separated with dots, `chips` shows each one as
// a small raised button instead. they only look like buttons, clicking does nothing
defineProps({ items: Array, chips: Boolean });
</script>

<template>
  <span v-if="chips" class="tech-chips">
    <span v-for="item in items" :key="item" class="tech-tag tech-chip raised">{{ item }}</span>
  </span>
  <template v-else>
    <template v-for="(item, i) in items" :key="item">
      <span class="tech-tag">{{ item }}</span><template v-if="i < items.length - 1"> · </template>
    </template>
  </template>
</template>
