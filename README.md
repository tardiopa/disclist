# Disclist

Your vinyl collection and wishlist, as good online as on the shelf.

Disclist is a personal web app built on top of [Discogs](https://www.discogs.com). It keeps
track of the records you own and the ones you want, shows what they are worth, and lets you
share either list with a link.

## What it does

- **Albums, not pressings.** One album is one item, whatever the edition. Vinyl only.
- **Collection and wishlist.** Add records by searching Discogs, or import your Discogs
  collection and wantlist. Imports only add: they keep what is already there and never
  remove anything.
- **Prices and rarity.** For each album: a typical price, the lowest listing, and a rarity
  level, computed from the Discogs marketplace in EUR.
- **Dashboard.** Total value, most valuable records, genres, and decades.
- **Sharing.** Both lists are private by default. Each can be made public and shared with
  its own short link.
- **Read-only on Discogs.** You bring your own Discogs token; Disclist only reads with it
  and never writes anything back to your Discogs account.
- English and French, light and dark.

## How prices are computed

Discogs does not expose sales history in its API. Disclist reads `marketplace/stats` for the
most-owned vinyl editions of an album and aggregates them:

- **Typical price** is the median of those editions' lowest listings, so one collector
  pressing does not skew the figure.
- **Lowest** is the cheapest listing among them.
- **Rarity** has three levels, based on how many copies are currently for sale.

A whole library is priced in the background on a quick sample (6 editions per album).
Opening an album goes deeper (20 editions). Requests are queued to stay under Discogs'
limit of 60 per minute, with interactive calls first.

## Stack

Next.js (App Router), React, Tailwind CSS v4, Firebase Auth and Firestore, hosted on Vercel.

## Architecture

The app is rendered in the browser. Firebase Auth (Google and email/password) and Firestore
are used directly from the client; access control lives in [`firestore.rules`](firestore.rules).

```
users/{uid}                  public profile: name, shareId, collectionPublic, wishlistPublic
users/{uid}/private/discogs  { token, username }, owner only
users/{uid}/collection/{id}  one document per copy owned
users/{uid}/wishlist/{key}   one document per album
shares/{shareId}             { uid }, short public link to its owner
```

Discogs is called from the browser with the user's token. If the browser cannot reach
`api.discogs.com` directly, requests go through a small relay (`/api/discogs/*`) that only
accepts GET on a fixed list of paths.

| Path | Role |
|---|---|
| `src/lib/discogs.ts` | Read-only Discogs client and request queue |
| `src/lib/stats.ts` | Typical price, lowest price, rarity |
| `src/lib/merge.ts` | Import rules: add new, keep existing, never remove |
| `src/lib/store.ts` | Firestore access |
| `src/lib/dict.ts` | English and French strings |
| `src/components/library.tsx` | Live lists and the background pricing loop |
| `src/components/library-view.tsx` | Grid and list views, search, filters, sorting |
| `src/components/detail.tsx` | The album detail view |
| `src/app/api/discogs/[...path]/route.ts` | Fallback relay to Discogs |

## Run it yourself

You need Node.js, a Firebase project, and a Discogs account.

1. In the Firebase console, create a project, enable **Authentication** with the Google and
   Email/Password providers, and create a **Firestore** database.
2. Copy the web app configuration into `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

3. Point `.firebaserc` at your project and deploy the security rules:

   ```bash
   firebase deploy --only firestore:rules
   ```

4. Install and start:

   ```bash
   npm install
   npm run dev        # http://localhost:3000
   ```

5. Sign in, then paste a Discogs personal access token in Settings
   (Discogs → Settings → Developers → Generate new token).

If you deploy somewhere else than `localhost`, add that domain to the authorized domains in
Firebase Authentication.

## Commands

```bash
npm run dev         # development server on :3000
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm test            # unit tests of the pure logic in src/lib (no network)
```

Two optional scripts read `.env.local`:

```bash
node scripts/check-rules.mjs          # exercises firestore.rules against the live project with throwaway accounts
node scripts/build-landing-demo.mts   # rebuilds the landing page demo from a Discogs account (needs DISCOGS_TOKEN)
```

## Security notes

- The Firebase web configuration is public by design; data is protected by the Firestore
  rules, not by hiding those values.
- A user's Discogs token is stored in their own `private` document, readable by them only.
  It is sent to Discogs, or to the relay when direct access is blocked, and nowhere else.
- No secrets are committed. `.env*` files are ignored, except `.env.example`.

## Credits

Album data, cover art, and marketplace figures come from the Discogs API. The covers in
`public/landing/` illustrate the landing page and belong to their respective rights holders.
Disclist is not affiliated with Discogs.
