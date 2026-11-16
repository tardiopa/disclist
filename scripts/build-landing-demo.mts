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
const WISH = 5;

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

const grid = [];
for (const [n, item] of collection.slice(0, GRID).entries()) {
  const al = await d.album(item, token);
  await save(al.cover || item.cover, `c${n}.jpg`);
  const st = await d.stats(al, d.SAMPLE_QUICK, token, "high");
  grid.push({ title: al.title, artist: al.artist, year: al.year, img: `/landing/c${n}.jpg`, avg: st.avg });
}
// The three most valuable among them, for the dashboard preview.
const top = [...grid].filter((g) => g.avg != null).sort((a, b) => b.avg! - a.avg!).slice(0, 3);

const wish = [];
for (const [n, item] of wantlist.slice(0, WISH).entries()) {
  const al = await d.album(item, token);
  const st = await d.stats(al, 12, token, "high");
  await save(al.thumb || al.cover || item.thumb, `w${n}.jpg`);
  wish.push({ title: al.title, artist: al.artist, year: al.year, genre: al.genres[0] ?? "", avg: st.avg, min: st.min, forSale: st.forSale, img: `/landing/w${n}.jpg` });
}

const sum = summarize(collection.map((c, n) => ({ ...c, id: String(n) })), []);
writeFileSync(
  "src/lib/demo.json",
  JSON.stringify({ count: collection.length, grid, top, wish, genres: sum.genres.slice(0, 5), artists: sum.artists.slice(0, 5), decades: sum.decades }, null, 2) + "\n",
);
console.log("grid", grid.length, "wish", wish.length);
