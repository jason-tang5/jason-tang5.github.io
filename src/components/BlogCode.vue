<script setup>
import { computed } from 'vue';
import { highlightCode } from '../code-highlight.mjs';

const props = defineProps({
  code: { type: String, required: true },
  language: { type: String, default: '' },
});
defineEmits(['copy']);
const labels = { js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript', json: 'JSON', html: 'HTML', css: 'CSS', sh: 'Shell', bash: 'Bash', python: 'Python', py: 'Python', text: 'Plain text' };
const label = computed(() => labels[props.language.toLowerCase()] || props.language || 'Plain text');
const lineCount = computed(() => props.code.split('\n').length);
const numbers = computed(() => Array.from({ length: lineCount.value }, (_, i) => i + 1).join('\n'));
// Only the highlighter's escaped output is HTML; the post source is never injected.
const highlighted = computed(() => highlightCode(props.code, props.language));
</script>

<template>
  <div class="code-block">
    <div class="code-toolbar">
      <span class="code-language"><span class="code-symbol" aria-hidden="true">&lt;/&gt;</span>{{ label }}</span>
      <span class="code-count">{{ lineCount }} {{ lineCount === 1 ? 'line' : 'lines' }}</span>
      <button class="raised" :aria-label="`Copy ${label} code`" @click="$emit('copy', code)">Copy</button>
    </div>
    <div class="code-scroll" tabindex="0" role="region" :aria-label="`${label} code, scroll horizontally for long lines`">
      <div class="code-source">
        <pre class="code-gutter" aria-hidden="true">{{ numbers }}</pre>
        <pre class="code-text"><code v-html="highlighted" /></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-block {
  min-width: 0;
  margin: 24px 0;
  padding: 3px;
  color: var(--ink);
  background: var(--surface);
  border: 2px solid;
  border-color: var(--light) var(--edge) var(--edge) var(--light);
  box-shadow: inset -1px -1px var(--shadow);
}
.code-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 30px;
  padding: 2px 4px 5px;
  font: 12px 'Pixel MS Sans Serif', Tahoma, sans-serif;
}
.code-language { display: flex; align-items: center; gap: 7px; min-width: 0; overflow-wrap: anywhere; font-weight: bold; }
.code-symbol { flex: none; color: var(--d-link, #000080); font: bold 14px Consolas, 'Courier New', monospace; }
.code-count { margin-left: auto; white-space: nowrap; color: var(--muted); font: 11px Tahoma, sans-serif; }
.code-toolbar button { flex: none; padding: 3px 10px; color: var(--ink); font: inherit; }
.code-scroll {
  overflow: auto;
  background: var(--paper);
  border: 2px solid;
  border-color: var(--shadow) var(--light) var(--light) var(--shadow);
  scrollbar-width: thin;
}
.code-source { display: flex; width: max-content; min-width: 100%; }
.code-source pre { margin: 0; padding: 14px 16px; font: 13px/1.7 Consolas, 'Courier New', monospace; tab-size: 2; }
.code-gutter { flex: none; color: var(--muted); background: var(--d-page-alt, #fffdf2); border-right: 1px solid var(--d-rule, #d6d6de); text-align: right; user-select: none; }
.code-text { flex: 1; color: var(--ink); }
.code-text code { font: inherit; }
.code-text :deep(.hljs-keyword), .code-text :deep(.hljs-selector-tag), .code-text :deep(.hljs-literal) { color: #7429a3; }
.code-text :deep(.hljs-string), .code-text :deep(.hljs-regexp), .code-text :deep(.hljs-addition) { color: #17643b; }
.code-text :deep(.hljs-number), .code-text :deep(.hljs-symbol), .code-text :deep(.hljs-deletion) { color: #a43b15; }
.code-text :deep(.hljs-title), .code-text :deep(.hljs-built_in), .code-text :deep(.hljs-attr), .code-text :deep(.hljs-name), .code-text :deep(.hljs-attribute) { color: #1554a0; }
.code-text :deep(.hljs-comment), .code-text :deep(.hljs-meta) { color: #65656d; }
:root[data-theme="dark"] .code-text :deep(.hljs-keyword), :root[data-theme="dark"] .code-text :deep(.hljs-selector-tag), :root[data-theme="dark"] .code-text :deep(.hljs-literal) { color: #d5a6ff; }
:root[data-theme="dark"] .code-text :deep(.hljs-string), :root[data-theme="dark"] .code-text :deep(.hljs-regexp), :root[data-theme="dark"] .code-text :deep(.hljs-addition) { color: #92d7a6; }
:root[data-theme="dark"] .code-text :deep(.hljs-number), :root[data-theme="dark"] .code-text :deep(.hljs-symbol), :root[data-theme="dark"] .code-text :deep(.hljs-deletion) { color: #ffba8a; }
:root[data-theme="dark"] .code-text :deep(.hljs-title), :root[data-theme="dark"] .code-text :deep(.hljs-built_in), :root[data-theme="dark"] .code-text :deep(.hljs-attr), :root[data-theme="dark"] .code-text :deep(.hljs-name), :root[data-theme="dark"] .code-text :deep(.hljs-attribute) { color: #9ecbff; }
:root[data-theme="dark"] .code-text :deep(.hljs-comment), :root[data-theme="dark"] .code-text :deep(.hljs-meta) { color: #a5a5b3; }
.code-text::selection, .code-text code::selection { background: var(--navy, #000080); color: #fff; }
.code-scroll:focus-visible, .code-toolbar button:focus-visible { outline: 1px dotted var(--ink); outline-offset: -4px; }
@media (max-width: 480px) {
  .code-toolbar { gap: 6px; }
  .code-source pre { padding: 12px 10px; }
}
</style>
