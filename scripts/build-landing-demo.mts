// Builds the landing page's demo content from a real Discogs account (read-only):
// album covers into public/landing/ and their facts into src/lib/demo.json.
// Usage: node scripts/build-landing-demo.mts   (needs DISCOGS_TOKEN in .env.local)
import { mkdirSync, writeFileSync } from "node:fs";
import * as d from "../src/lib/discogs.ts";
import { mergeWishlist, planWishlistImport } from "../src/lib/merge.ts";
import { summarize } from "../src/lib/summary.ts";

process.loadEnvFile(".env.local");
const token = process.env.DISCOGS_TOKEN!;
const GRID = 12;
const WISH = 4;
const SEARCH = 3;

mkdirSync("public/landing", { recursive: true });
const save = async (url: string, name: string) => {
  const res = await fetch(url, { headers: { "User-Agent": "Disclist/1.0" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  writeFileSync(`public/landing/${name}`, Buffer.from(await res.arrayBuffer()));
};

const user = await d.identity(token);
const collection = (await d.fetchCollection(user, token)).sort((a, b) => b.addedAt - a.addedAt);
// Same rules as the app: one entry per album.
const wantlist = mergeWishlist(planWishlistImport([], await d.fetchWantlist(user, token)).map((p) => p.item)).filter((w) => w.masterId);

// An album appears once across the whole page: grid, search results and wishlist never overlap.
const used = new Set<string>();

const grid = [];
for (const [n, item] of collection.slice(0, GRID).entries()) {
  const al = await d.album(item, token);
  await save(al.cover || item.cover, `c${n}.jpg`);
  used.add(item.key);
  grid.push({ title: al.title, artist: al.artist, year: al.year, img: `/landing/c${n}.jpg` });
}

// Search preview: one query, so the results are albums by the same artist —
// the one with the most records outside the grid.
const rest = collection.slice(GRID).filter((i) => !used.has(i.key));
const byArtist = new Map<string, number>();
for (const i of rest) byArtist.set(i.artist, (byArtist.get(i.artist) ?? 0) + 1);
const [searchArtist] = [...byArtist.entries()].sort((a, b) => b[1] - a[1])[0];
const search = [];
for (const item of [...rest.filter((i) => i.artist === searchArtist), ...rest.filter((i) => i.artist !== searchArtist)]) {
  if (used.has(item.key) || search.length >= SEARCH) continue;
  const al = await d.album(item, token);
  await save(al.thumb || al.cover || item.thumb, `s${search.length}.jpg`);
  used.add(item.key);
  search.push({ title: al.title, artist: al.artist, year: al.year, img: `/landing/s${search.length}.jpg` });
}

const wish = [];
for (const item of wantlist) {
  if (used.has(item.key) || wish.length >= WISH) continue;
  const al = await d.album(item, token);
  const st = await d.stats(al, 12, token, "high");
  await save(al.thumb || al.cover || item.thumb, `w${wish.length}.jpg`);
  used.add(item.key);
  wish.push({ title: al.title, artist: al.artist, year: al.year, genre: al.genres[0] ?? "", avg: st.avg, min: st.min, forSale: st.forSale, img: `/landing/w${wish.length}.jpg` });
}

const sum = summarize(collection.map((c, n) => ({ ...c, id: String(n) })), []);
writeFileSync(
  "src/lib/demo.json",
  JSON.stringify({ count: collection.length, grid, search, wish, genres: sum.genres.slice(0, 5), decades: sum.decades }, null, 2) + "\n",
);
console.log("grid", grid.length, "wish", wish.length);
