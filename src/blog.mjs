// blog posts live here. each post looks like:
//   { slug, title, subtitle, date: 'YYYY-MM-DD', lead, blocks }
// (subtitle is optional, one line under the title in the post list)
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
