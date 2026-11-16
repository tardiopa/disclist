// Filtering and sorting for the collection / wishlist views.
import { rarity } from "./stats.ts";
import type { Item } from "./types.ts";

export type Sort = "recent" | "artist" | "title" | "yearDesc" | "yearAsc" | "priceDesc" | "priceAsc";

export interface Filters {
  q: string;
  genre: string;
  decade: string;
  /** "" or a rarity level ("1" | "2" | "3"). */
  rarity: string;
  sort: Sort;
}

export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const sortName = (s: string) => fold(s).replace(/^(the|les|le|la) /, "");

export const decadeOf = (year: number | null) => (year ? Math.floor(year / 10) * 10 : null);

export function genresOf(items: Item[]): string[] {
  const counts = new Map<string, number>();
  for (const i of items) for (const g of i.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g);
}

export function decadesOf(items: Item[]): number[] {
  const set = new Set<number>();
  for (const i of items) {
    const d = decadeOf(i.year);
    if (d) set.add(d);
  }
  return [...set].sort((a, b) => b - a);
}

export function applyFilters(items: Item[], f: Filters): Item[] {
  const words = fold(f.q).split(/\s+/).filter(Boolean);
  const decade = f.decade ? Number(f.decade) : null;
  const out = items.filter((i) => {
    if (f.genre && !i.genres.includes(f.genre)) return false;
    if (decade != null && decadeOf(i.year) !== decade) return false;
    if (f.rarity && (!i.stats?.versions || String(rarity(i.stats.forSale)) !== f.rarity)) return false;
    if (!words.length) return true;
    const hay = fold(`${i.title} ${i.artist} ${i.year ?? ""} ${i.genres.join(" ")} ${i.styles.join(" ")}`);
    return words.every((w) => hay.includes(w));
  });

  const byArtist = (a: Item, b: Item) =>
    sortName(a.artist).localeCompare(sortName(b.artist)) || (a.year ?? 0) - (b.year ?? 0) || a.title.localeCompare(b.title);
  const price = (i: Item, missing: number) => i.stats?.avg ?? missing;

  switch (f.sort) {
    case "artist":
      return out.sort(byArtist);
    case "title":
      return out.sort((a, b) => sortName(a.title).localeCompare(sortName(b.title)));
    case "yearDesc":
      return out.sort((a, b) => (b.year ?? -1) - (a.year ?? -1) || byArtist(a, b));
    case "yearAsc":
      return out.sort((a, b) => (a.year ?? 99999) - (b.year ?? 99999) || byArtist(a, b));
    case "priceDesc":
      return out.sort((a, b) => price(b, -1) - price(a, -1));
    case "priceAsc":
      return out.sort((a, b) => price(a, Infinity) - price(b, Infinity));
    default:
      return out.sort((a, b) => b.addedAt - a.addedAt);
  }
}
