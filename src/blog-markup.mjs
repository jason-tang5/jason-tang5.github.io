// turns what i type in the blog editor into the block list Blog.vue renders.
// shared by the editor preview and the worker, so both agree on the result.
//
//   blank line          starts a new paragraph
//   ## heading          a heading (one or more #)
//   ![alt](src "cap")   an image on its own line, the caption is optional
//   ```js ... ```       a code block, the language is optional
//
// anything else is plain text. nothing is ever rendered as html.

const image = /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)$/;

// images and demos only load from this site or over https, never javascript: and friends
export const safeSrc = src => /^https:\/\//i.test(src) || /^(?:\/(?!\/)|\.{1,2}\/|assets\/)/.test(src);

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
      const code = [];
      // an unclosed fence runs to the end of the post
      while (++i < lines.length && lines[i].trim() !== '```') code.push(lines[i]);
      blocks.push({ type: 'code', language: line.slice(3).trim(), code: code.join('\n') });
    } else if (/^#+\s/.test(line)) {
      flush();
      blocks.push({ type: 'heading', text: line.replace(/^#+\s+/, '') });
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

export const slugify = title => String(title ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80)
  .replace(/-+$/, '');
