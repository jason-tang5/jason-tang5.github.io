import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/blog-markup.mjs';
import { graphicExamples, graphicMarkup, parseGraphic } from '../src/blog-templates.mjs';
import { highlightCode } from '../src/code-highlight.mjs';

test('gallery templates round-trip through the same parser used by the editor and Worker', () => {
  for (const example of graphicExamples) {
    const [block] = parse(graphicMarkup(example));
    assert.equal(block.type, 'graphic');
    assert.equal(block.template, example.template);
    assert.equal(block.title, example.title);
    assert.equal(block.items.length, example.items.length);
  }
});

test('invalid templates remain code and arbitrary display fields are discarded', () => {
  for (const config of [{}, { ...graphicExamples[0], template: 'script' }, { ...graphicExamples[0], items: Array(13).fill({label:'x'}) }, { ...graphicExamples[5], items: [{label:'x',value:101}] }]) {
    assert.equal(parse(graphicMarkup(config))[0].type, 'code');
  }
  assert.equal(parse('```figure\nnot JSON\n```')[0].type, 'code');
  const graphic = parseGraphic(JSON.stringify({ ...graphicExamples[0], onclick: 'bad()', items: [{label:'<script>alert(1)</script>', style:'position:fixed'}] }));
  assert.equal(graphic.onclick, undefined);
  assert.equal(graphic.items[0].style, undefined);
  assert.equal(graphic.items[0].label, '<script>alert(1)</script>');
});

test('highlighting supports aliases, preserves source and escapes hostile markup', () => {
  assert.match(highlightCode('const value = 42;', 'js'), /hljs-keyword/);
  assert.match(highlightCode('{"value": true}', 'json'), /hljs-attr/);
  const source = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  for (const language of ['html', 'js', 'unknown', '']) {
    const result = highlightCode(source, language);
    assert.doesNotMatch(result, /<(?:img|script)\b/);
    assert.match(result, /&lt;/);
  }
  assert.equal(highlightCode('a < b && c > d', 'unknown'), 'a &lt; b &amp;&amp; c &gt; d');
});
