// turns what i type in the blog editor into the block list Blog.vue renders.
// shared by the editor preview and the worker, so both agree on the result.
//
//   blank line          starts a new paragraph
//   # heading           a heading. # big, ## medium, ### small
//   ![alt](src "cap")   an image on its own line, the caption is optional
//   ```js ... ```       a code block, the language is optional
//   | a | b |           a table, one row per line. a |---|---| line under the
//   |---|---|           first row makes it the header, and colons in it
//   | 1 | 2 |           (|:--|:-:|--:|) align the columns. \| for a plain |
//
// inside paragraphs, headings and table cells, like discord (see inline() below):
//   **bold**  *italic* or _italic_  __underline__  ~~strike~~  `code`  \* for a plain *
//   [text](https://…) a link. https, http, mailto or a path on this site, anything else stays text
//
// anything else is plain text. nothing is ever rendered as html.

// the space can be left out after ## or ###, but #hashtag stays text
const heading = /^(#{1,3})(?:\s+|(?<=##)(?=[^#\s]))(\S.*)$/;
const image = /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)$/;

// images and demos only load from this site or over https, never javascript: and friends
export const safeSrc = src => /^https:\/\//i.test(src) || /^(?:\/(?!\/)|\.{1,2}\/|assets\/)/.test(src);

// links can also go to plain http, an email address, or a #app= window on this site
export const safeHref = href => /^(?:https?:\/\/|mailto:)/i.test(href) || /^(?:\/(?!\/)|#)/.test(href);

export function parse(source) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('```')) {
      flush();
      const rest = line.slice(3);
      // ```x = 1``` all on one line
      if (rest.includes('```')) {
        blocks.push({ type: 'code', language: '', code: rest.slice(0, rest.indexOf('```')).trim() });
        paragraph.push(...[rest.slice(rest.indexOf('```') + 3).trim()].filter(Boolean));
        continue;
      }
      const code = [];
      let after = '';
      // closes on a line starting with ``` (text after it carries on as a paragraph)
      // or a code line ending in ```. an unclosed fence runs to the end of the post
      while (++i < lines.length) {
        const next = lines[i].trimEnd();
        if (next.trim().startsWith('```')) {
          after = next.trim().slice(3).trim();
          break;
        }
        if (next.endsWith('```')) {
          code.push(next.slice(0, -3).trimEnd());
          break;
        }
        code.push(lines[i]);
      }
      blocks.push({ type: 'code', language: rest.trim(), code: code.join('\n') });
      if (after) paragraph.push(after);
    } else if (line.startsWith('|')) {
      flush();
      const rows = [line];
      while (lines[i + 1]?.trim().startsWith('|')) rows.push(lines[++i].trim());
      blocks.push(table(rows));
    } else if (heading.test(line)) {
      flush();
      const [, hashes, text] = line.match(heading);
      blocks.push({ type: 'heading', level: hashes.length, text });
    } else if (image.test(line) && safeSrc(line.match(image)[2])) {
      flush();
      const [, alt, src, caption] = line.match(image);
      blocks.push({ type: 'image', src, alt, ...(caption && { caption }) });
    } else if (line) {
      paragraph.push(line);
    } else {
      flush();
    }
  }

  flush();
  return blocks;
}

const divider = /^:?-+:?$/;

// | a | b | into ['a', 'b']. the outer pipes are optional after the first one
function cells(row) {
  const parts = row.replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/);
  return parts.map(cell => cell.trim().replace(/\\\|/g, '|'));
}

function table(lines) {
  let rows = lines.map(cells);
  let header = null;
  let align = [];

  if (rows.length > 1 && rows[1].every(cell => divider.test(cell))) {
    align = rows[1].map(cell => (cell.endsWith(':') ? (cell.startsWith(':') ? 'center' : 'right') : 'left'));
    [header] = rows;
    rows = rows.slice(2);
  }

  // every row gets the same number of cells, so the grid stays square
  const width = Math.max(header?.length ?? 0, ...rows.map(row => row.length));
  const fill = row => [...row, ...Array(width - row.length).fill('')];
  return {
    type: 'table',
    header: header && fill(header),
    align: Array.from({ length: width }, (_, i) => align[i] ?? 'left'),
    rows: rows.map(fill),
  };
}

// discord style inline formatting. turns a line of text into spans like
// { text, bold, italic, underline, strike, code, href } for Blog.vue to style.
// markers can nest (***bold italic***, __*underlined italic*__, [**bold link**](…))
const styles = [
  ['code', /`([^`]+)`/],
  // not ![alt](src), that's an image
  ['link', /(?<!!)\[([^\]]+)\]\(\s*([^\s()]+)\s*\)/],
  ['bold', /\*\*([\s\S]+?)\*\*(?!\*)/],
  ['underline', /__([\s\S]+?)__(?!_)/],
  ['strike', /~~([\s\S]+?)~~/],
  ['italic', /\*(?![\s*])([\s\S]+?)(?<![\s*])\*(?!\*)/],
  // not inside words, so snake_case_names stay as they are
  ['italic', /(?<![\p{L}\p{N}_])_(?![\s_])([\s\S]+?)(?<![\s_])_(?![\p{L}\p{N}_])/u],
];

// \* and friends are hidden in the private use area while parsing, then put back
const hide = text => text.replace(/\\([*_~`\\])/g, (_, c) => String.fromCharCode(0xe000 + c.charCodeAt(0)));
const unhide = text => text.replace(/[\ue000-\ue0ff]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xe000));

export function inline(text) {
  const spans = [];

  const walk = (rest, style) => {
    while (rest) {
      // the earliest marker wins, ties go to the one listed first
      let found = null;
      for (const [name, pattern] of styles) {
        const match = rest.match(pattern);
        if (match && (!found || match.index < found.match.index)) found = { name, match };
      }
      if (!found) {
        spans.push({ ...style, text: unhide(rest) });
        return;
      }
      const { name, match } = found;
      if (match.index) spans.push({ ...style, text: unhide(rest.slice(0, match.index)) });
      if (name === 'code') spans.push({ ...style, code: true, text: unhide(match[1]) });
      else if (name !== 'link') walk(match[1], { ...style, [name]: true });
      else if (safeHref(unhide(match[2]))) walk(match[1], { ...style, href: unhide(match[2]) });
      else spans.push({ ...style, text: unhide(match[0]) });
      rest = rest.slice(match.index + match[0].length);
    }
  };

  walk(hide(String(text ?? '')), {});
  return spans;
}

export const slugify = title => String(title ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80)
  .replace(/-+$/, '');
