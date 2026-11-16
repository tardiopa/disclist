import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanName, joinArtists, fromBasicInfo, fromSearchResult, plainProfile, isVinyl } from "./normalize.ts";
import { aggregate, pickSample, rarity } from "./stats.ts";
import { planCollectionImport, planWishlistImport } from "./merge.ts";
import type { Edition, Item, NewItem } from "./types.ts";

const ed = (id: number, have: number): Edition => ({
  id, have, title: "", format: "", label: "", catno: "", country: "", year: "", thumb: "",
});
const item = (over: Partial<Item>): Item => ({
  id: "x", key: "m1", masterId: 1, releaseId: null, title: "T", artist: "A", year: 1973,
  cover: "", thumb: "", genres: [], styles: [], stats: null, addedAt: 0, ...over,
});
const incoming = (over: Partial<NewItem>): NewItem => {
  const { id: _id, ...rest } = item(over);
  return rest;
};

test("names", () => {
  assert.equal(cleanName("Nirvana (2)"), "Nirvana");
  assert.equal(cleanName("Air"), "Air");
  assert.equal(joinArtists([{ name: "Miles Davis", join: "&" }, { name: "Gil Evans (3)" }]), "Miles Davis & Gil Evans");
  assert.equal(joinArtists([{ name: "A", join: "," }, { name: "B" }]), "A, B");
});

test("basic info → item, master is the unit", () => {
  const i = fromBasicInfo(
    { id: 9, master_id: 5, title: "Kind Of Blue", year: 0, artists: [{ name: "Miles Davis", id: 3 }],
      formats: [{ name: "Vinyl" }], genres: ["Jazz"], styles: ["Modal"], cover_image: "c", thumb: "t" }, 1);
  assert.equal(i.key, "m5");
  assert.equal(i.year, null);
  assert.equal(i.releaseId, 9);
  assert.equal(fromBasicInfo({ id: 9, master_id: 0, title: "X" }, 1).key, "r9");
  assert.equal(isVinyl([{ name: "CD" }]), false);
  assert.equal(isVinyl([{ name: "Vinyl" }, { name: "CD" }]), true);
});

test("search result", () => {
  const h = fromSearchResult({ type: "master", id: 10362, title: "Pink Floyd - The Dark Side Of The Moon", year: "1973", genre: ["Rock"] });
  assert.deepEqual([h.key, h.artist, h.title, h.year], ["m10362", "Pink Floyd", "The Dark Side Of The Moon", 1973]);
  const r = fromSearchResult({ type: "release", id: 7, master_id: 0, title: "Solo" });
  assert.equal(r.key, "r7");
});

test("profile markup", () => {
  assert.equal(plainProfile("Member of [a=Can (2)] on [l=Mute]. [url=http://x]Site[/url] [b]bold[/b] [a123]"), "Member of Can on Mute. Site bold");
});

test("stats", () => {
  const all = [ed(1, 100), ed(2, 50), ed(3, 30), ed(4, 20)];
  const sample = pickSample(all, 2);
  assert.deepEqual(sample.map((e) => e.id), [1, 2]);
  const s = aggregate(sample, [{ lowest: 20, forSale: 30 }, { lowest: null, forSale: 0 }], all, 4, 7);
  assert.equal(s.avg, 20);
  assert.equal(s.min, 20);
  assert.equal(s.forSale, 40); // 30 × 200/150
  const s2 = aggregate(sample, [{ lowest: 10, forSale: 1 }, { lowest: 31, forSale: 1 }], sample, 2, 7);
  assert.deepEqual([s2.avg, s2.min, s2.forSale], [20.5, 10, 2]);
  const none = aggregate([], [], [], 0, 7);
  assert.deepEqual([none.avg, none.min, none.forSale], [null, null, 0]);
  assert.deepEqual([rarity(0), rarity(49), rarity(199), rarity(999), rarity(5000)], [5, 4, 3, 2, 1]);
});

test("collection import adds, keeps, links, never duplicates", () => {
  const existing = [
    item({ id: "d100", instanceId: 100, releaseId: 11 }),
    item({ id: "manual", key: "m2", masterId: 2 }),
    item({ id: "manual-other-edition", key: "m3", masterId: 3, releaseId: 31 }),
  ];
  const plan = planCollectionImport(existing, [
    incoming({ instanceId: 100, releaseId: 11 }), // already imported
    incoming({ instanceId: 101, releaseId: 12 }), // second copy of m1
    incoming({ instanceId: 102, key: "m2", masterId: 2, releaseId: 21 }), // matches manual
    incoming({ instanceId: 103, key: "m2", masterId: 2, releaseId: 22 }), // another copy
    incoming({ instanceId: 104, key: "m3", masterId: 3, releaseId: 32 }), // different edition
    incoming({ instanceId: 104, key: "m3", masterId: 3, releaseId: 32 }), // duplicate row
  ]);
  assert.deepEqual(plan.create.map((c) => c.id), ["d101", "d103", "d104"]);
  assert.deepEqual(plan.attach, [{ id: "manual", instanceId: 102, releaseId: 21 }]);
});

test("wishlist import keeps one entry per album", () => {
  const out = planWishlistImport(
    [item({ id: "m1" })],
    [incoming({ releaseId: 1 }), incoming({ key: "m2", masterId: 2, releaseId: 5 }), incoming({ key: "m2", masterId: 2, releaseId: 6 })],
  );
  assert.deepEqual(out.map((o) => o.id), ["m2"]);
});

import { applyFilters, decadesOf, genresOf, type Filters } from "./view.ts";

test("filters and sort", () => {
  const items = [
    item({ id: "a", title: "Moon Safari", artist: "Air", year: 1998, genres: ["Electronic"], addedAt: 1 }),
    item({ id: "b", title: "Histoire De Melody Nelson", artist: "Serge Gainsbourg", year: 1971, genres: ["Rock", "Pop"], addedAt: 3 }),
    item({ id: "c", title: "Abbey Road", artist: "The Beatles", year: 1969, genres: ["Rock"], addedAt: 2,
      stats: { avg: 30, min: 10, forSale: 5, versions: 1, sampled: 1, updatedAt: 0 } }),
  ];
  const base: Filters = { q: "", genre: "", decade: "", sort: "recent" };
  const ids = (f: Partial<Filters>) => applyFilters(items, { ...base, ...f }).map((i) => i.id).join("");
  assert.equal(ids({}), "bca");
  assert.equal(ids({ sort: "artist" }), "acb"); // "The" ignored
  assert.equal(ids({ q: "melody gains" }), "b");
  assert.equal(ids({ q: "1969" }), "c");
  assert.equal(ids({ genre: "Rock" }), "bc");
  assert.equal(ids({ decade: "1990" }), "a");
  assert.equal(ids({ sort: "priceDesc" })[0], "c");
  assert.deepEqual(genresOf(items), ["Rock", "Electronic", "Pop"]);
  assert.deepEqual(decadesOf(items), [1990, 1970, 1960]);
});

import { summarize } from "./summary.ts";

test("dashboard summary", () => {
  const st = (avg: number | null) => ({ avg, min: avg, forSale: 1, versions: 1, sampled: 1, updatedAt: 0 });
  const s = summarize(
    [
      item({ id: "a", year: 1969, genres: ["Rock"], stats: st(30) }),
      item({ id: "b", year: 1998, genres: ["Electronic", "Rock"], stats: st(80.4) }),
      item({ id: "c", year: null, genres: [], stats: null }),
    ],
    [item({ id: "w", stats: st(25) }), item({ id: "x", stats: st(null) })],
  );
  assert.deepEqual([s.collectionCount, s.collectionPriced, s.collectionValue], [3, 2, 110]);
  assert.deepEqual([s.wishlistCount, s.wishlistPriced, s.wishlistCost], [2, 1, 25]);
  assert.equal(s.top?.id, "b");
  assert.deepEqual(s.genres, [{ name: "Rock", count: 2 }, { name: "Electronic", count: 1 }]);
  assert.deepEqual(s.decades.map((d) => `${d.decade}:${d.count}`), ["1960:1", "1970:0", "1980:0", "1990:1"]);
});
