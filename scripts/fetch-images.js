// Downloads real, openly-licensed photos from Openverse (Flickr, StockSnap, Rawpixel, Wikimedia ...) for the demo data.
//   node scripts/fetch-images.js [slug ...]          product candidates -> public/photos/products/<slug>-<n>.jpg
//   node scripts/fetch-images.js --cats [slug ...]   category candidates -> public/photos/categories/<slug>-<n>.jpg
// Candidates are cropped to 800x800 JPEG. Author + license of every file is stored in CREDITS.json (attribution).
// Then pick the good ones in public/photos/<kind>/index.json  ({ "slug": ["slug-1.jpg", ...] }).
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const args = process.argv.slice(2);
const CATS = args.includes('--cats');
const slugsArg = args.filter((a) => !a.startsWith('--'));
const OUT = path.join(__dirname, '..', 'public', 'photos', CATS ? 'categories' : 'products');
const UA = 'ShopNestDemoSeeder/1.0 (local development demo data)';
const BAD = /(diagram|logo|drawing|vector|icon|illustration|poster|screenshot|map of|chart|sketch|painting|museum|exhibit|stamp|coin|toy|lego|cartoon|infographic|manual|patent|politic|minister|president|parliament|ceremony|conference|protest|rally|demonstration|distribution|wedding|celebrity|actor|actress|hot |unseen|crowd|children|kids|baby|dog|cat\b|recipe)/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FOOD = /(beignet|taquito|sausage|bagel|chicken|fries|wings|breakfast|guac|food|cook|bacon|salmon|donut|pizza|potato|cake|bread)/i;

// slug -> [search query, title must match, title must NOT match]
const Q = {
  'premium-cotton-tshirt': ['plain t-shirt', /shirt/i],
  'leather-formal-shoes': ['leather oxford shoes', /(shoe|oxford|brogue)/i],
  'nova-x-smartphone': ['smartphone', /(phone|smartphone)/i],
  'wireless-earbuds-pro': ['wireless earbuds', /(earbud|earphone|airpod)/i],
  'crunchy-potato-chips': ['potato chips bowl', /(chip|crisp)/i],
  'floral-summer-dress': ['floral summer dress', /dress/i],
  'nova-lite-5g': ['android phone', /phone/i],
  'pixelon-pro-max': ['smartphone camera phone', /phone/i],
  'bass-boost-speaker': ['bluetooth speaker', /speaker/i],
  'studio-headphones': ['over-ear headphones', /headphone/i],
  'gaming-laptop-r7': ['gaming laptop', /laptop/i],
  'ultraslim-laptop-i5': ['ultrabook laptop', /(laptop|ultrabook|macbook|notebook)/i],
  'rgb-mechanical-keyboard': ['mechanical keyboard', /keyboard/i],
  'wireless-mouse': ['wireless mouse', /mouse/i],
  'power-bank-20000': [['power bank', 'portable charger powerbank'], /(power ?bank|charger)/i],
  'smart-led-tv-43': ['smart tv television', /(tv|television)/i],
  'air-fryer-5l': [['air fryer', 'airfryer appliance', 'air fryer kitchen'], /fryer/i, FOOD],
  'electric-kettle': ['electric kettle', /kettle/i],
  'classic-leather-watch': ['leather strap wristwatch', /watch/i],
  'chronograph-steel-watch': ['chronograph wristwatch', /watch/i],
  'minimal-mesh-watch-women': ["women's wristwatch", /watch/i],
  'pearl-dial-ladies-watch': ['ladies gold watch', /watch/i],
  'smartwatch-ultra-amoled': ['smartwatch', /watch/i],
  'fitness-band-pro': ['fitness tracker band', /(tracker|band|fitbit)/i],
  'digital-sports-watch': ['digital sports watch', /watch/i],
  'evening-gown-maxi': ['evening gown', /(gown|dress)/i],
  'casual-midi-dress': ['midi dress', /dress/i],
  'cotton-kurti-set': [['kurti', 'salwar kameez', 'kurta woman'], /(kurti|kurta|salwar|kameez|churidar)/i],
  'katan-silk-saree': [['silk saree', 'saree', 'sari'], /(saree|sari)/i],
  'jamdani-saree': [['jamdani saree', 'saree', 'sari'], /(saree|sari|jamdani)/i],
  'embroidered-panjabi': [['panjabi', 'kurta men', 'punjabi kurta'], /(panjabi|punjabi|kurta)/i],
  'eid-special-panjabi': ['panjabi eid men', /(panjabi|punjabi|kurta|eid)/i],
  'slim-fit-jeans': ['blue jeans', /(jeans|denim)/i],
  'formal-cotton-shirt': ['dress shirt', /shirt/i],
  'polo-tshirt': ['polo shirt', /polo/i],
  'ceramic-flower-vase': ['ceramic vase', /vase/i],
  'canvas-wall-art-set': [['wall art frames', 'framed wall art', 'canvas wall art'], /(frame|canvas|gallery|wall art|art)/i],
  'wooden-wall-clock': ['wall clock', /clock/i],
  'led-table-lamp': ['table lamp', /lamp/i],
  'rattan-pendant-light': ['rattan pendant light', /(pendant|rattan|wicker|lamp|light)/i],
  'velvet-cushion-covers': ['velvet cushion', /(cushion|pillow)/i],
  'artificial-indoor-plant': ['potted indoor plant', /plant/i],
  'scented-candle-gift-set': ['scented candle', /candle/i],
  'round-decor-mirror': ['round wall mirror', /mirror/i],
};
const CQ = {
  fashion: ['fashion clothing rack', /(cloth|fashion|garment|dress|boutique|rack)/i],
  electronics: ['electronics gadgets', /(electronic|gadget|device|tech)/i],
  grocery: ['groceries vegetables basket', /(grocer|vegetable|fruit|basket|market)/i],
  watches: ['wristwatches', /watch/i],
  'home-decor': ['home decor interior', /(decor|interior|living|home)/i],
  'mens-wear': ["men's clothing", /(men|cloth|suit|shirt)/i],
  'womens-wear': ["women's fashion clothes", /(women|cloth|fashion|dress)/i],
  shoes: ['shoes', /(shoe|sneaker|boot)/i],
  't-shirts': ['t-shirts', /shirt/i],
  smartphones: ['smartphones', /phone/i],
  audio: ['headphones', /(headphone|speaker|audio)/i],
  laptops: ['laptop', /laptop/i],
  'home-appliances': ['kitchen appliances', /(appliance|kitchen|blender|toaster|kettle|oven)/i],
  accessories: ['tech accessories', /(accessor|usb|cable|charger|mouse|keyboard)/i],
  'mens-watches': ["men's watch", /watch/i],
  'womens-watches': ["women's watch", /watch/i],
  'smart-watches': ['smartwatch', /watch/i],
  dresses: ['dress', /dress/i],
  sarees: ['saree', /(saree|sari)/i],
  panjabi: ['panjabi kurta', /(panjabi|punjabi|kurta)/i],
  jeans: ['jeans', /(jeans|denim)/i],
  shirts: ['dress shirt', /shirt/i],
  'wall-decor': ['wall decor', /(wall|decor|art|frame)/i],
  lighting: ['pendant light', /(lamp|light)/i],
  'vases-plants': ['vase plants', /(vase|plant)/i],
  'cushions-candles': ['cushions', /(cushion|pillow|candle)/i],
  snacks: ['snacks', /(snack|chip|crisp)/i],
  beverages: ['beverages drinks', /(beverage|drink|juice|soda|bottle)/i],
};

async function fetchRetry(url, kind, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) return kind === 'json' ? r.json() : Buffer.from(await r.arrayBuffer());
    if (r.status === 429 || r.status >= 500) {
      const wait = Math.min(60000, (+r.headers.get('retry-after') || 0) * 1000 || 2500 * (i + 1));
      console.warn(`  ${r.status} – waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait); continue;
    }
    throw new Error(`HTTP ${r.status}`);
  }
  throw new Error('too many retries');
}

async function search(q, kw, ex) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&category=photograph&license_type=commercial&extension=jpg&mature=false&page_size=20`;
  const d = await fetchRetry(url, 'json');
  return (d.results || []).filter((r) => r.url && r.width >= 600 && r.height >= 500 && r.width / r.height > 0.55 && r.width / r.height < 1.9
    && !BAD.test(r.title || '') && (!kw || kw.test(r.title || '')) && !(ex && ex.test(r.title || '')));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const creditsFile = path.join(OUT, 'CREDITS.json');
  const credits = fs.existsSync(creditsFile) ? JSON.parse(fs.readFileSync(creditsFile, 'utf8')) : {};
  const used = new Set(Object.values(credits).map((c) => c.source));
  const table = CATS ? CQ : Q;
  const want = CATS ? 3 : 4;
  const slugs = slugsArg.length ? slugsArg : Object.keys(table);

  for (const slug of slugs) {
    const [q, kw, ex] = table[slug] || [];
    if (!q) { console.log(`NONE ${slug}: no query`); continue; }
    let n = 0;
    for (const query of Array.isArray(q) ? q : [q]) {
      if (n >= want) break;
      let results = [];
      try { results = await search(query, kw, ex); } catch (e) { console.warn(`  search failed "${query}": ${e.message}`); }
      await sleep(900);
      const seenCreators = new Set();
      for (const r of results) {
        if (n >= want) break;
        const key = r.foreign_landing_url || r.url;
        if (used.has(key) || (r.creator && seenCreators.has(r.creator + r.title))) continue;
        try {
          const src = r.width * r.height > 6e6 && r.thumbnail ? r.thumbnail : r.url;
          const buf = await fetchRetry(src, 'buf', 3);
          const file = `${slug}-${n + 1}.jpg`;
          await sharp(buf).resize(800, 800, { fit: 'cover', position: sharp.strategy.attention }).flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toFile(path.join(OUT, file));
          credits[file] = { source: key, title: r.title, author: r.creator || '', license: `${(r.license || '').toUpperCase()} ${r.license_version || ''}`.trim(), from: r.source };
          used.add(key); seenCreators.add((r.creator || '') + r.title);
          n++;
          await sleep(300);
        } catch (e) { console.warn(`  skip "${r.title}": ${e.message}`); }
      }
    }
    console.log(`${n ? 'OK  ' : 'NONE'} ${slug}: ${n} candidate(s)`);
  }
  fs.writeFileSync(creditsFile, JSON.stringify(credits, null, 1));
  console.log('done');
})();
