// blog posts live here. each post looks like:
//   { slug, title, date: 'YYYY-MM-DD', lead, blocks }
//
// block types:
//   paragraph { text }
//   heading   { text }
//   image     { src, alt, caption }
//   demo      { src, title }
//   code      { code, language }
//
// the lead is either an image or a demo block. everything is rendered as text,
// so don't try to sneak raw html in.
export const posts = [];
