import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import sql from 'highlight.js/lib/languages/sql';
import verilog from 'highlight.js/lib/languages/verilog';

for (const [name, grammar] of Object.entries({ javascript, typescript, json, xml, css, python, bash, cpp, sql, verilog })) hljs.registerLanguage(name, grammar);
const aliases = { js: 'javascript', ts: 'typescript', html: 'xml', vue: 'xml', py: 'python', sh: 'bash', c: 'cpp', 'c++': 'cpp', sv: 'verilog', systemverilog: 'verilog' };
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

export function highlightCode(code, language = '') {
  const name = language.trim().toLowerCase();
  const registered = aliases[name] || name;
  // No guessing: unknown or unlabelled fences remain escaped plain text.
  if (!hljs.getLanguage(registered)) return escape(code);
  return hljs.highlight(code, { language: registered, ignoreIllegals: true }).value;
}
