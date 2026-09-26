// when something copied from google docs, word, notion or a web page has a table in it,
// the plain text version loses the grid (every cell ends up on its own line). this reads
// the html version instead and turns it into post text, with tables as | a | b | rows.
// only the words are kept, the html itself never ends up in the post.

const blocks = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'LI', 'H4', 'H5', 'H6']);
const headings = { H1: '# ', H2: '## ', H3: '### ' };

const squash = text => text.replace(/\s+/g, ' ').trim();

function pipeTable(table) {
  const rows = [...table.rows].map(row => [...row.cells].map(cell => squash(cell.textContent).replace(/\|/g, '\\|')));
  if (!rows.length) return '';
  const width = Math.max(...rows.map(row => row.length));
  for (const row of rows) while (row.length < width) row.push('');

  // pad the columns so the table still reads as a grid in the editor
  const sizes = Array.from({ length: width }, (_, i) => Math.max(3, ...rows.map(row => row[i].length)));
  const line = row => `| ${row.map((cell, i) => cell.padEnd(sizes[i])).join(' | ')} |`;
  // the first row is the header, which is how nearly every copied table starts
  return [line(rows[0]), `|${sizes.map(size => '-'.repeat(size + 2)).join('|')}|`, ...rows.slice(1).map(line)].join('\n');
}

function walk(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent.replace(/\s+/g, ' ');
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const tag = node.tagName;
  if (tag === 'TABLE') return `\n\n${pipeTable(node)}\n\n`;
  if (tag === 'BR') return '\n';
  if (['SCRIPT', 'STYLE', 'TEMPLATE', 'HEAD'].includes(tag)) return '';

  const inner = [...node.childNodes].map(walk).join('');
  if (headings[tag]) return `\n\n${headings[tag]}${squash(inner)}\n\n`;
  if (blocks.has(tag)) return `\n\n${inner}\n\n`;
  return inner;
}

// post text for the pasted html, or null when there's no table (then the paste goes through as normal)
export function pastedTable(html) {
  if (!html || !/<table/i.test(html)) return null;
  // DOMParser documents are inert: no scripts run and nothing loads
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc.querySelector('table')) return null;
  return walk(doc.body)
    .split('\n')
    .map(line => (line.startsWith('|') ? line : line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
