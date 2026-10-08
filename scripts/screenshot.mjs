// Capture screenshots of the built app with headless Chromium (Playwright).
//   npm run shots                 build (if needed), serve dist/, write docs/shots/*.png
//   node scripts/screenshot.mjs --dev http://127.0.0.1:5280/   use a running dev server instead
//   node scripts/screenshot.mjs --only solo-waterdeep           just matching shots
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'shots');
const args = process.argv.slice(2);
const argv = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const only = argv('--only');
let base = argv('--dev');

const SHOTS = [
  ['parchment', '?layout=map&parchment=1'],
  ['board-atlas', '?layout=atlas'],
  ['board-map', '?layout=map'],
  ['board-chronicle', '?layout=chronicle'],
  ['year-714', '?layout=atlas&year=714'],
  ['year-1385', '?layout=map&year=1385'],
  ['year-1492', '?layout=atlas&year=1492'],
  ['night-map', '?layout=map&night=1'],
  ['focus-waterdeep', '?layout=atlas#waterdeep'],
  ['solo-waterdeep', '?solo=waterdeep'],
  ['solo-menzoberranzan', '?solo=menzoberranzan'],
  ['solo-thultanthar-1000', '?solo=thultanthar&year=1000'],
  ['solo-thultanthar-1400', '?solo=thultanthar&year=1400'],
  ['solo-thultanthar-1490', '?solo=thultanthar&year=1490'],
  ['solo-myth-drannor-1000', '?solo=myth-drannor&year=1000'],
  ['solo-candlekeep', '?solo=candlekeep'],
  ['solo-mithral-hall', '?solo=mithral-hall'],
  ['solo-calimport', '?solo=calimport'],
  ['solo-evereska', '?solo=evereska'],
  ['solo-neverwinter-1460', '?solo=neverwinter&year=1460'],
  ['solo-elturel-1492', '?solo=elturel&year=1492'],
  ['solo-high-forest', '?solo=high-forest'],
];

let server;
if (!base) {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html')) || args.includes('--build')) execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  server = spawn('npx', ['vite', 'preview', '--port', '5291', '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  base = 'http://127.0.0.1:5291/';
  await new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('preview server did not start')), 20000);
    server.stdout.on('data', (d) => { if (String(d).includes('5291')) { clearTimeout(to); resolve(); } });
  });
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
let pageError = null;
page.on('pageerror', (e) => { pageError = e; console.error('  page error:', e.message); });
page.on('console', (m) => { if (m.type() === 'error') console.error('  console:', m.text()); });

for (const [name, q] of SHOTS) {
  if (only && !name.includes(only)) continue;
  const [qs, hash] = q.split('#');
  const url = `${base}${qs}${qs.includes('?') ? '&' : '?'}shot=1${hash ? `#${hash}` : ''}`;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  pageError = null;
  for (let w = 0; w < 240 && !pageError; w++) {
    if (await page.evaluate(() => window.__atlasReady === true)) break;
    await page.waitForTimeout(500);
  }
  if (pageError) { console.error(`✗ ${name}: ${pageError.stack}`); continue; }
  await page.waitForTimeout(hash ? 3200 : 1200);
  const fps = await page.evaluate(() => window.__atlasFps ?? null);
  const stats = await page.evaluate(() => window.__atlasStats ?? null);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`✓ ${name}.png  (${((Date.now() - t0) / 1000).toFixed(1)}s${fps ? `, ~${fps.toFixed(0)} fps in software GL` : ''}${stats ? `, ${stats.calls} draw calls, ${(stats.triangles / 1000).toFixed(0)}k tris` : ''})`);
}
await browser.close();
server?.kill();
