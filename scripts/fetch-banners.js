// Downloads wide, openly-licensed photos from Openverse as hero-banner candidates.
//   node scripts/fetch-banners.js [key ...]    ->  public/photos/banners/<key>-<n>.jpg (1600x600, cropped)
// Author + license for every file is stored in CREDITS.json. Pick the good ones in public/photos/banners/index.json.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'photos', 'banners');
const UA = 'ShopNestDemoSeeder/1.0 (local development demo data)';
const BAD = /(diagram|logo|drawing|vector|icon|illustration|poster|screenshot|map|chart|sketch|painting|museum|stamp|cartoon|infographic|politic|minister|president|protest|rally|crowd|children|kids|baby|nude|wedding)/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const Q = {
  fashion: ['fashion clothing store', 'clothes rack boutique', 'fashion shopping women'],
  electronics: ['electronics gadgets desk', 'laptop headphones desk', 'technology devices'],
  decor: ['modern living room interior', 'home decor interior', 'cozy living room'],
  grocery: ['fresh vegetables market', 'grocery fruits basket', 'farmers market produce'],
  delivery: ['delivery parcels boxes', 'courier package delivery', 'shopping bags'],
  watches: ['wristwatches collection', 'luxury watch display'],
};

async function getJson(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500 || r.status === 403) { await sleep(2500 * (i + 1)); continue; }
    throw new Error(`HTTP ${r.status}`);
  }
  throw new Error('too many retries');
}
async function getBuf(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    await sleep(2000 * (i + 1));
  }
  throw new Error('download failed');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const creditsFile = path.join(OUT, 'CREDITS.json');
  const credits = fs.existsSync(creditsFile) ? JSON.parse(fs.readFileSync(creditsFile, 'utf8')) : {};
  const used = new Set(Object.values(credits).map((c) => c.source));
  const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(Q);

  for (const key of keys) {
    let n = 0;
    for (const q of Q[key] || []) {
      if (n >= 4) break;
      let results = [];
      try {
        const d = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&category=photograph&license_type=commercial&extension=jpg&mature=false&page_size=20`);
        results = (d.results || []).filter((r) => r.url && r.width >= 1200 && r.height >= 600 && r.width / r.height > 1.3 && r.width / r.height < 2.4 && !BAD.test(r.title || ''));
      } catch (e) { console.warn(`  search failed "${q}": ${e.message}`); }
      await sleep(1000);
      for (const r of results) {
        if (n >= 4) break;
        const src = r.foreign_landing_url || r.url;
        if (used.has(src)) continue;
        try {
          const buf = await getBuf(r.width * r.height > 8e6 && r.thumbnail ? r.thumbnail : r.url);
          const file = `${key}-${n + 1}.jpg`;
          await sharp(buf).resize(1600, 600, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 80 }).toFile(path.join(OUT, file));
          credits[file] = { source: src, title: r.title, author: r.creator || '', license: `${(r.license || '').toUpperCase()} ${r.license_version || ''}`.trim(), from: r.source };
          used.add(src);
          n++;
          await sleep(300);
        } catch (e) { console.warn(`  skip "${r.title}": ${e.message}`); }
      }
    }
    console.log(`${n ? 'OK  ' : 'NONE'} ${key}: ${n} candidate(s)`);
  }
  fs.writeFileSync(creditsFile, JSON.stringify(credits, null, 1));
  console.log('done');
})();
