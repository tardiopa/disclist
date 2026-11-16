# Disclist

Your vinyl collection and wishlist, as good online as on the shelf.

- One album = one item, whatever the pressing. Vinyl only.
- Prices and rarity aggregated over an album's vinyl editions (Discogs marketplace, EUR).
- Bring your own Discogs token. Read-only: nothing is written back to Discogs.
- Collection and wishlist are private by default, each shareable with its own link.

## Stack

Next.js (App Router) · Tailwind CSS v4 · Firebase Auth + Firestore · hosted on Vercel.

## Develop

```bash
cp .env.example .env.local   # Firebase web config
npm install
npm run dev
npm test                     # pure logic: import merge, pricing, filters
npm run typecheck
firebase deploy --only firestore:rules
```
