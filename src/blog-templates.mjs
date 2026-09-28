// A small data-only figure format shared by the browser and Worker parser.
export const templateNames = ['flow', 'steps', 'timeline', 'comparison', 'metrics', 'bars'];
const text = (value, max = 600) => typeof value === 'string' && value.length <= max;
export function parseGraphic(source) {
  let data;
  try { data = JSON.parse(source); } catch { return null; }
  if (!data || !templateNames.includes(data.template) || !text(data.title, 160)) return null;
  if (data.caption !== undefined && !text(data.caption)) return null;
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 12) return null;
  if (!data.items.every(item => item && text(item.label, 160)
    && ['text', 'note', 'branch'].every(key => item[key] === undefined || text(item[key]))
    && (data.template === 'bars' ? typeof item.value === 'number' && Number.isFinite(item.value) && item.value >= 0 && item.value <= 100
      : item.value === undefined || text(item.value, 100)))) return null;
  // Only known display fields pass through, never HTML, style, URLs, or event handlers.
  return { type: 'graphic', template: data.template, title: data.title, caption: data.caption || '',
    items: data.items.map(({ label, text = '', value, note = '', branch = '' }) => ({ label, text, value, note, branch })) };
}

export const graphicExamples = [
  { template: 'flow', title: 'A request, with a decision', caption: 'Use a branch for an alternate result. Follow the arrows for the main path.', items: [
    { label: 'Receive request', text: 'Read the submitted fields.' },
    { label: 'Input valid?', text: 'Yes: continue to the right.', branch: 'No → show an error and keep the draft.' },
    { label: 'Process request', text: 'Return the result.' },
  ] },
  { template: 'steps', title: 'How it works', caption: 'Select a stage to read its explanation.', items: [
    { label: 'Collect', text: 'Read the input and keep the original data.' },
    { label: 'Transform', text: 'Apply the rules one stage at a time.' },
    { label: 'Deliver', text: 'Return the result and explain any errors.' },
  ] },
  { template: 'timeline', title: 'From prototype to release', caption: 'A sample sequence of milestones.', items: [
    { label: 'Day 1', text: 'Build the smallest working prototype.', note: 'Prototype' },
    { label: 'Day 3', text: 'Test edge cases and refine the interface.', note: 'Validate' },
    { label: 'Day 5', text: 'Release, observe, and iterate.', note: 'Ship' },
  ] },
  { template: 'comparison', title: 'Before and after', caption: 'Compare two approaches using the same criteria.', items: [
    { label: 'Before', text: 'A fixed screenshot with tiny labels.', note: 'Manual updates · fixed colors' },
    { label: 'After', text: 'A responsive figure with selectable details.', note: 'Editable data · theme-aware colors' },
  ] },
  { template: 'metrics', title: 'Results at a glance', caption: 'Illustrative values only. Replace with your measured results.', items: [
    { label: 'Load time', value: '120 ms', text: 'Median over the sample.' },
    { label: 'Bundle size', value: '48 KB', text: 'Compressed output.' },
    { label: 'Checks passed', value: '24 / 24', text: 'For this example run.' },
  ] },
  { template: 'bars', title: 'Progress by stage', caption: 'Illustrative percentages; bar values range from 0 to 100.', items: [
    { label: 'Prototype', value: 100, text: 'Core behavior is in place.' },
    { label: 'Validation', value: 75, text: 'Some edge cases remain.' },
    { label: 'Polish', value: 40, text: 'Layout and accessibility review.' },
  ] },
];
export const graphicMarkup = data => '```figure\n' + JSON.stringify(data, null, 2) + '\n```';
