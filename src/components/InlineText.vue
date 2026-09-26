<script setup>
// one line of blog text with its **bold**, *italic* and friends (inline() in blog-markup.mjs).
// every piece is plain text in a styled span, never html
import { computed } from 'vue';
import { inline } from '../blog-markup.mjs';

const props = defineProps({ text: { type: String, default: '' } });

const spans = computed(() => inline(props.text));
const styles = span => ({ bold: span.bold, italic: span.italic, underline: span.underline, strike: span.strike });
</script>

<template>
  <template v-for="(span, i) in spans" :key="i">
    <code v-if="span.code" class="inline-code" :class="styles(span)">{{ span.text }}</code>
    <span v-else :class="styles(span)">{{ span.text }}</span>
  </template>
</template>
