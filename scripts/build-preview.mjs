/**
 * Builds a single, fully self-contained HTML file (preview/portfolio-preview.html)
 * with the CSS, JS, photo and demo data inlined — handy for offline previewing.
 *
 *   npm run build:preview
 */
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS, DEFAULT_ROWS } from '../lib/schema.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('public/index.html');
const css = read('public/assets/site.css');
const js = read('public/assets/site.js');

const photo = fs.readFileSync(path.join(root, 'public/zarif.jpg')).toString('base64');

const data = {
  settings: { ...DEFAULT_SETTINGS, photo_url: `data:image/jpeg;base64,${photo}` },
  education: DEFAULT_ROWS.education,
  skills: DEFAULT_ROWS.skills,
  interests: DEFAULT_ROWS.interests,
  socials: DEFAULT_ROWS.socials,
  phones: DEFAULT_ROWS.phones,
};

// NB: use function replacers — template strings containing `$$` would
// otherwise be treated as replacement patterns by String.prototype.replace.
const cssBlock = `<style>\n${css}\n</style>`;
const jsBlock = `<script>\n${js}\n</script>`;
const dataBlock = `<script id="site-data" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

html = html
  .replace(/<link rel="preconnect"[^>]*>/g, '')
  .replace(/\s*<link\s+href="https:\/\/fonts\.googleapis\.com[\s\S]*?\/>\n/, '\n')
  .replace('<link rel="stylesheet" href="/assets/site.css" />', () => cssBlock)
  .replace('<script src="/assets/site.js" defer></script>', () => jsBlock)
  .replace('<!--SITE_DATA-->', () => dataBlock);

fs.writeFileSync(path.join(root, 'preview/portfolio-preview.html'), html);
console.log('✓ preview/portfolio-preview.html তৈরি হয়েছে (' + Math.round(html.length / 1024) + ' KB)');
