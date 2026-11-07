# ShopNest API

Express + MongoDB backend for the ShopNest storefront ([client repo](https://github.com/sonetseopage1/mern_ecommerce_client)).

## Run
```bash
npm install
cp .env.example .env        # then edit MONGO_URI, JWT_SECRET, CLIENT_URL
npm run seed                # demo data (wipes the database first!)
npm run dev                 # http://localhost:5000
```
Demo logins: `admin@shop.com / admin123`, `manager@shop.com / manager123`, `user@shop.com / user123`.

`npm run seed:more` only **adds** demo content (extra products, Bangladesh areas, shipping rates, payment setup, banners) without deleting anything, so it is safe to re-run.

## What's inside
- Roles: `admin`, `manager`, `user` (checked on every protected route).
- Products with generic option groups (Color / RAM / Storage / Size …), per-variant price & stock, flash deals, product-specific coupons.
- Bangladesh divisions → districts → upazilas/thanas (`src/data/bd-geo.json`), area-based shipping rules, COD / SSLCommerz payments (sandbox ready; payments are re-verified server-side).
- Admin-managed site settings, pages, FAQ, banners; image uploads (`public/uploads`, JPG/PNG/WEBP/GIF/ICO ≤ 5 MB).
- Rich-text content is sanitized before it is stored.

## Demo photos
`public/photos/` holds the product / category / banner photos used by the seed. They are open-licence images from Openverse; authors and licences are in each folder's `CREDITS.json`. Re-create them with `node scripts/fetch-images.js`, `node scripts/fetch-banners.js` and `node scripts/picks.js`. Replace them with your own photos for a real shop.

## Environment
See `.env.example`. Set `PUBLIC_API_URL` to the public address of this API when you deploy (needed for SSLCommerz callbacks).
