// interactive figures for posts written on the site. the posts themselves live in kv
// and stay as they are: this swaps an image (or code block) with an exact source for a
// figure from ContactFigures.vue, and can add a figure at the end of a section. anything
// not listed renders as normal, so a newly uploaded image shows until it's added here,
// and deleting an entry brings the original back.
//
//   images   exact image src → figure, keeping the image's caption
//   code     exact code block text → figure
//   after    heading text → figure, placed at the end of that section
//   captions caption for a figure that isn't replacing an image
export const blogFigures = {
  'how-i-built-the-contact-form-on-jasontang-dev': {
    images: {
      '/assets/blog/contact-mail-icon.png': 'mail',
      '/api/blog/images/a58252be59c98f98d440ed11fc8d5aaf59076245eba9f16e0b4b54173605936e.png': 'journey',
      '/api/blog/images/9bb002127d9596a84bf4b3d1b753e85e01f9bba6d3e0a8f5a538f5ee1e8d46a5.png': 'delivery',
    },
    code: {
      'Vue → HTTP → Cloudflare Worker → MIME → Email Routing → DNS → Gmail': 'pipeline',
    },
    after: {
      'Sending from the frontend': 'flow',
      'Lightweight spam protection': 'spam',
      'HOW did you get my email????': 'headers',
    },
    captions: {
      flow: 'From Send to the result shown in Mail',
      spam: 'The three spam checks, in the order the Worker runs them',
      headers: 'Who the email says it’s from, and who a reply goes to',
      pipeline: 'Every layer a message passes through',
    },
  },
};

// the lead figure has no caption or number, every other figure is numbered in order
export function withFigures(slug, blocks) {
  const entry = blogFigures[slug];
  if (!entry) return blocks;

  const out = [];
  let pending = null;
  let number = 0;
  const figure = (name, from = {}) => ({
    type: 'figure',
    figure: name,
    caption: from.caption ?? entry.captions?.[name] ?? '',
    lead: Boolean(from.lead),
  });

  for (const block of blocks) {
    if (block.type === 'heading' && pending) {
      out.push(figure(pending));
      pending = null;
    }

    // Blog.vue marks the post's lead image with lead: true
    const name = block.type === 'image' ? entry.images?.[block.src] : block.type === 'code' ? entry.code?.[block.code.trim()] : null;
    out.push(name ? figure(name, block) : block);

    if (block.type === 'heading' && entry.after?.[block.text.trim()]) pending = entry.after[block.text.trim()];
  }
  if (pending) out.push(figure(pending));

  for (const block of out) if (block.type === 'figure' && !block.lead) block.number = ++number;
  return out;
}
