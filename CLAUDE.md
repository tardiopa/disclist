# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test suite is configured.

## Architecture Overview

**Disclist** is a Next.js 16 (App Router) vinyl record wishlist app. It uses Firebase for auth and Firestore as the real-time database, with Next.js API routes as the serverless backend.

### Dual Authentication Model

The app supports two user types simultaneously:

1. **Authenticated users** — Firebase Google OAuth; Firestore documents keyed by `ownerId` (Firebase UID)
2. **Guest users** — UUID session cookie (`disclist_session`, 7-day sliding expiry) set by `src/middleware.ts`; Firestore documents keyed by `sessionId`

When a guest logs in, their wishlists migrate from `sessionId` to `ownerId`. This flow lives in `src/lib/session.ts` and is triggered from `src/components/providers/auth-provider.tsx`.

Auth state is exposed app-wide via `useAuth()` from `src/components/providers/auth-provider.tsx`.

### Data Model (Firestore)

```
/wishlists/{wishlistId}
  name, ownerId (null for guests), sessionId (null for users), isPublic, createdAt, updatedAt
  /items/{itemId}
    discogsId, type, artist, album, year, coverUrl, fnacPrice, culturaPrice, addedAt
```

Firestore security rules in `firestore.rules` enforce that users can only access their own wishlists (by UID or sessionId), while public wishlists are readable by anyone.

CRUD operations for wishlists are centralized in `src/lib/wishlists.ts`. The main dashboard (`src/app/page.tsx`) uses `onSnapshot()` for real-time updates.

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/search` | Discogs search, filtered to vinyl formats |
| `/api/price` | Discogs marketplace price lookup |
| `/api/scrape-prices` | Scrapes Fnac + Cultura for retail prices |
| `/api/share` | Sends wishlist share email via SendGrid |

Discogs integration logic is in `src/lib/discogs-server.ts` (server-only). The vinyl filtering applies both format-based filtering and a "rescue logic" heuristic for records miscategorized as CD. `src/lib/scraper.ts` handles Fnac/Cultura HTML parsing with Cheerio, with a 3-second delay between retailers.

### Public Wishlist View

`/w/[id]` is an unauthenticated read-only page that renders any wishlist where `isPublic: true`.

### UI Stack

- Tailwind CSS v4 with CSS variables for theming
- shadcn/ui components (Radix UI primitives), configured via `components.json` with "new-york" style
- Framer Motion for list item animations
- Lucide React for icons
- Path alias `@/*` → `src/*`

## Environment Variables

**Required in `.env.local`:**

```
# Firebase (public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Server-only
DISCOGS_TOKEN=
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=   # defaults to localhost:3000
```
