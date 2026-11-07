// Builds public/photos/{products,categories}/index.json from hand-picked candidates.
//   n<k> = candidate k from the Openverse run (public/photos/products/<slug>-k.jpg)
//   o<k> = candidate k from the earlier Wikimedia run (public/products/<slug>-k.jpg), copied to <slug>-o<k>.jpg
//   node scripts/picks.js
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const P = path.join(PUB, 'photos', 'products');
const C = path.join(PUB, 'photos', 'categories');
fs.mkdirSync(P, { recursive: true });
fs.mkdirSync(C, { recursive: true });

const PRODUCTS = {
  'artificial-indoor-plant': ['n1'],
  'bass-boost-speaker': ['o1', 'o2', 'n2'],
  'canvas-wall-art-set': ['n2', 'n3'],
  'ceramic-flower-vase': ['n3', 'n4'],
  'cotton-kurti-set': ['o7'],
  'electric-kettle': ['n1', 'o2', 'o3'],
  'embroidered-panjabi': ['o3', 'n1'],
  'evening-gown-maxi': ['o1', 'o3', 'n1'],
  'fitness-band-pro': ['n1', 'o1', 'o3'],
  'floral-summer-dress': ['n1', 'o1'],
  'formal-cotton-shirt': ['o1', 'o2', 'n2'],
  'gaming-laptop-r7': ['n1', 'n4', 'n2'],
  'jamdani-saree': ['o1', 'o3'],
  'katan-silk-saree': ['o5', 'n2'],
  'leather-formal-shoes': ['n3', 'o1', 'o2', 'n2'],
  'led-table-lamp': ['n2', 'o5', 'n4'],
  'minimal-mesh-watch-women': ['n1', 'o6'],
  'nova-lite-5g': ['n2', 'o2', 'n3'],
  'nova-x-smartphone': ['n1', 'o2', 'o3'],
  'pearl-dial-ladies-watch': ['o5', 'n1', 'n2'],
  'pixelon-pro-max': ['n2', 'n4', 'o6'],
  'polo-tshirt': ['o3', 'n1', 'n2'],
  'power-bank-20000': ['n1'],
  'premium-cotton-tshirt': ['n2', 'n3', 'n1'],
  'rgb-mechanical-keyboard': ['n2', 'n4', 'o1'],
  'round-decor-mirror': ['n1', 'o6', 'o7'],
  'scented-candle-gift-set': ['n1', 'n2', 'n3'],
  'slim-fit-jeans': ['n1', 'n3'],
  'smartwatch-ultra-amoled': ['n1', 'n2', 'n4'],
  'studio-headphones': ['o1', 'o2'],
  'velvet-cushion-covers': ['o5'],
  'wireless-earbuds-pro': ['n1', 'n3', 'n2'],
  'wireless-mouse': ['o3', 'o1', 'o2'],
  'wooden-wall-clock': ['n2', 'n1', 'o1'],
  // no Openverse results -> earlier Wikimedia picks
  'air-fryer-5l': ['o5', 'o6', 'o7'],
  'classic-leather-watch': ['o1', 'o2'],
  'chronograph-steel-watch': ['o1', 'o2', 'o3'],
  'digital-sports-watch': ['o2', 'o1'],
  'casual-midi-dress': ['o2', 'o3'],
  'eid-special-panjabi': ['o1', 'o2', 'o3'],
  'crunchy-potato-chips': ['o1', 'o2', 'o3'],
  'ultraslim-laptop-i5': ['o1', 'o2'],
  'smart-led-tv-43': ['o5', 'o6', 'o3'],
  'rattan-pendant-light': ['o2', 'o7'],
  'leather-formal-shoes-extra': [],
};
delete PRODUCTS['leather-formal-shoes-extra'];

// category slug -> photo: ['c', file] from the category run, or ['p', productSlug, 'n1'|'o3'] reuse of a product photo
const CATEGORIES = {
  fashion: ['c', 'fashion-1.jpg'], electronics: ['c', 'electronics-2.jpg'], grocery: ['c', 'grocery-1.jpg'],
  watches: ['p', 'chronograph-steel-watch', 'o1'], 'home-decor': ['p', 'round-decor-mirror', 'n1'],
  'mens-wear': ['p', 'formal-cotton-shirt', 'o1'], 'womens-wear': ['p', 'evening-gown-maxi', 'o1'],
  shoes: ['p', 'leather-formal-shoes', 'n3'], 't-shirts': ['p', 'premium-cotton-tshirt', 'n2'],
  smartphones: ['p', 'pixelon-pro-max', 'n2'], audio: ['c', 'audio-1.jpg'], laptops: ['c', 'laptops-2.jpg'],
  'home-appliances': ['p', 'air-fryer-5l', 'o7'], accessories: ['p', 'rgb-mechanical-keyboard', 'n2'],
  'mens-watches': ['p', 'classic-leather-watch', 'o1'], 'womens-watches': ['p', 'minimal-mesh-watch-women', 'n1'],
  'smart-watches': ['c', 'smart-watches-1.jpg'], dresses: ['c', 'dresses-1.jpg'], sarees: ['p', 'katan-silk-saree', 'o5'],
  panjabi: ['p', 'eid-special-panjabi', 'o2'], jeans: ['p', 'slim-fit-jeans', 'n1'], shirts: ['p', 'formal-cotton-shirt', 'n2'],
  'wall-decor': ['p', 'canvas-wall-art-set', 'n2'], lighting: ['c', 'lighting-1.jpg'], 'vases-plants': ['c', 'vases-plants-1.jpg'],
  'cushions-candles': ['p', 'scented-candle-gift-set', 'n1'], snacks: ['p', 'crunchy-potato-chips', 'o1'], beverages: ['c', 'beverages-1.jpg'],
};

// resolve a product photo spec to a file inside photos/products (copying old Wikimedia files when needed)
function productFile(slug, spec) {
  const kind = spec[0], k = spec.slice(1);
  if (kind === 'n') { const f = `${slug}-${k}.jpg`; return fs.existsSync(path.join(P, f)) ? f : null; }
  const src = path.join(PUB, 'products', `${slug}-${k}.jpg`);
  const f = `${slug}-o${k}.jpg`;
  if (!fs.existsSync(src)) return null;
  if (!fs.existsSync(path.join(P, f))) fs.copyFileSync(src, path.join(P, f));
  return f;
}

const pIndex = {};
for (const [slug, specs] of Object.entries(PRODUCTS)) {
  const files = specs.map((s) => productFile(slug, s)).filter(Boolean);
  if (files.length) pIndex[slug] = files; else console.warn('no photo for', slug);
}
fs.writeFileSync(path.join(P, 'index.json'), JSON.stringify(pIndex, null, 1));

const cIndex = {};
for (const [slug, spec] of Object.entries(CATEGORIES)) {
  let src;
  if (spec[0] === 'c') src = path.join(C, spec[1]);
  else { const f = productFile(spec[1], spec[2]); src = f && path.join(P, f); }
  if (!src || !fs.existsSync(src)) { console.warn('no category photo for', slug); continue; }
  const f = `${slug}.jpg`;
  if (path.resolve(src) !== path.resolve(path.join(C, f))) fs.copyFileSync(src, path.join(C, f));
  cIndex[slug] = [f];
}
fs.writeFileSync(path.join(C, 'index.json'), JSON.stringify(cIndex, null, 1));
console.log(`picked photos for ${Object.keys(pIndex).length} products and ${Object.keys(cIndex).length} categories`);
