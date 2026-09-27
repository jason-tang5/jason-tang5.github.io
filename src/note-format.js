// formatting for sticky notes: bold, italic, underline, strikethrough and bullet
// lists, like the windows sticky notes app. a note keeps its formatted html next to
// the plain text (the list and search still use the text). the html only ever holds
// the handful of tags below with no attributes, so nothing pasted or saved can carry
// styles, links or scripts into the page.

// tag the browser writes -> tag we keep. anything else is unwrapped to its contents
const allowed = {
  B: 'b', STRONG: 'b',
  I: 'i', EM: 'i',
  U: 'u',
  S: 's', STRIKE: 's', DEL: 's',
  UL: 'ul', LI: 'li',
  DIV: 'div', P: 'div',
  BR: 'br',
};
// dropped along with everything inside them
const dropped = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'IMG', 'VIDEO', 'AUDIO']);

function clean(from, to) {
  for (const node of from.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      to.append(node.textContent);
    } else if (node.nodeType === Node.ELEMENT_NODE && !dropped.has(node.tagName)) {
      const tag = allowed[node.tagName];
      if (!tag) {
        clean(node, to);
        continue;
      }
      const copy = document.createElement(tag);
      clean(node, copy);
      to.append(copy);
    }
  }
}

export function sanitize(html) {
  // a template's content is inert: nothing in it loads or runs while it's cleaned
  const source = document.createElement('template');
  source.innerHTML = html;
  const out = document.createElement('div');
  clean(source.content, out);
  return out.innerHTML;
}

// notes written before formatting existed are plain text, one line per div
export function textToHtml(text) {
  const out = document.createElement('div');
  for (const line of text.split(/\r?\n/)) {
    const div = document.createElement('div');
    if (line) div.textContent = line;
    else div.append(document.createElement('br'));
    out.append(div);
  }
  return out.innerHTML;
}

// the buttons on the formatting bar, in order. key is the windows sticky notes shortcut
export const formats = [
  { command: 'bold', label: 'Bold', key: 'Ctrl+B', rows: ['.XXXXX...', '.XX..XX..', '.XX..XX..', '.XXXXX...', '.XX..XX..', '.XX..XX..', '.XX..XX..', '.XXXXX...', '.........'] },
  { command: 'italic', label: 'Italic', key: 'Ctrl+I', rows: ['...XXXXX.', '.....XX..', '.....X...', '....XX...', '....X....', '...XX....', '...X.....', '.XXXXX...', '.........'] },
  { command: 'underline', label: 'Underline', key: 'Ctrl+U', rows: ['.XX...XX.', '.XX...XX.', '.XX...XX.', '.XX...XX.', '.XX...XX.', '..XXXXX..', '.........', 'XXXXXXXXX', '.........'] },
  { command: 'strikeThrough', label: 'Strikethrough', key: 'Ctrl+T', rows: ['..XXXXX..', '.XX...XX.', '.XX......', 'XXXXXXXXX', '......XX.', '.XX...XX.', '..XXXXX..', '.........', '.........'] },
  { command: 'insertUnorderedList', label: 'Toggle bullets', key: 'Ctrl+Shift+L', rows: ['.........', 'XX.XXXXXX', 'XX.......', '.........', 'XX.XXXXXX', 'XX.......', '.........', 'XX.XXXXXX', 'XX.......'] },
].map(f => ({
  ...f,
  glyph: f.rows.flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : ''))).join(''),
}));
