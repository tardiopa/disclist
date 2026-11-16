# CLAUDE.md

## Commands

```bash
npm run dev         # dev server on :3000
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm test            # node --test on src/lib/*.test.ts (pure logic, no network)
firebase deploy --only firestore:rules
```

## What it is

Disclist is a personal vinyl collection + wishlist. The unit is the **album** (a Discogs
master, key `m<id>`; or a master-less release, key `r<id>`), never the pressing. Vinyl only.

## Architecture

Client-rendered Next.js app. Firebase Auth (Google + email/password) and Firestore are used
straight from the browser; security lives in `firestore.rules`.

```
users/{uid}                  public profile: name, shareId, collectionPublic, wishlistPublic
users/{uid}/private/discogs  { token, username } — owner only
users/{uid}/collection/{id}  one doc per copy owned (imported copies use id `d<instance_id>`)
users/{uid}/wishlist/{key}   one doc per album
shares/{shareId}             { uid } — short public link → owner
```

- `src/lib/discogs.ts` — read-only Discogs client (GET only). Calls api.discogs.com from the
  browser with the user's token; falls back to the `/api/discogs/*` relay if blocked. A queue
  keeps requests under 60/min, interactive calls first.
- `src/lib/stats.ts` — typical price (median of the editions' lowest listings, so collector
  pressings don't skew it) / lowest / rarity. Discogs has no sales history in its API, so
  figures are aggregated from `marketplace/stats` over the most-owned vinyl editions
  (6 in background pricing, 20 when a detail view is opened).
- `src/lib/merge.ts` — import rules: add new, keep existing, never remove.
- `src/components/library.tsx` — live lists + background pricing loop.
- `src/components/detail.tsx` — the one detail view (library entry, search hit, shared page).
- `src/lib/dict.ts` — EN/FR strings. Keep copy short.

Pure modules in `src/lib` import each other with explicit `.ts` extensions so `node --test`
can run them without a bundler.
