<script setup>
// one line of blog text with its **bold**, *italic*, [links](…) and friends (inline() in
// blog-markup.mjs). every piece is plain text in a styled span or link, never html
import { computed } from 'vue';
import { inline } from '../blog-markup.mjs';

const props = defineProps({ text: { type: String, default: '' } });

const spans = computed(() => inline(props.text));
const styles = span => ({ bold: span.bold, italic: span.italic, underline: span.underline, strike: span.strike });
// other sites open in a new tab, links around this site stay in the desktop
const external = href => /^(?:https?:|mailto:)/i.test(href);
</script>

<template>
  <template v-for="(span, i) in spans" :key="i">
    <a
      v-if="span.href"
      :href="span.href"
      :target="external(span.href) ? '_blank' : undefined"
      :rel="external(span.href) ? 'noopener noreferrer' : undefined"
    >
      <code v-if="span.code" class="inline-code" :class="styles(span)">{{ span.text }}</code>
      <span v-else :class="styles(span)">{{ span.text }}</span>
    </a>
    <code v-else-if="span.code" class="inline-code" :class="styles(span)">{{ span.text }}</code>
    <span v-else :class="styles(span)">{{ span.text }}</span>
  </template>
</template>
