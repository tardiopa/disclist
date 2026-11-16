// Dashboard figures.
import type { Item } from "./types.ts";

export interface Summary {
  collectionCount: number;
  wishlistCount: number;
  collectionValue: number;
  collectionPriced: number;
  wishlistCost: number;
  wishlistPriced: number;
  /** The three most valuable albums of the collection (one entry per album). */
  top: Item[];
  genres: { name: string; count: number }[];
  artists: { name: string; count: number }[];
  /** Every decade between the first and the last, gaps included. */
  decades: { decade: number; count: number }[];
}

export function summarize(collection: Item[], wishlist: Item[]): Summary {
  const priced = (items: Item[]) => items.filter((i) => i.stats?.avg != null);
  const sum = (items: Item[]) => Math.round(items.reduce((s, i) => s + (i.stats?.avg ?? 0), 0));
  const cp = priced(collection);
  const wp = priced(wishlist);

  const genreCount = new Map<string, number>();
  const decadeCount = new Map<number, number>();
  const artistCount = new Map<string, number>();
  for (const i of collection) {
    for (const g of i.genres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    if (i.artist && i.artist !== "Various") artistCount.set(i.artist, (artistCount.get(i.artist) ?? 0) + 1);
    if (i.year) {
      const d = Math.floor(i.year / 10) * 10;
      decadeCount.set(d, (decadeCount.get(d) ?? 0) + 1);
    }
  }
  const decades: Summary["decades"] = [];
  if (decadeCount.size) {
    const keys = [...decadeCount.keys()];
    for (let d = Math.min(...keys); d <= Math.max(...keys); d += 10) decades.push({ decade: d, count: decadeCount.get(d) ?? 0 });
  }

  const seen = new Set<string>();
  const top = [...cp]
    .sort((a, b) => b.stats!.avg! - a.stats!.avg!)
    .filter((i) => !seen.has(i.key) && !!seen.add(i.key))
    .slice(0, 3);

  const top10 = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

  return {
    collectionCount: collection.length,
    wishlistCount: wishlist.length,
    collectionValue: sum(cp),
    collectionPriced: cp.length,
    wishlistCost: sum(wp),
    wishlistPriced: wp.length,
    top,
    genres: top10(genreCount),
    artists: top10(artistCount),
    decades,
  };
}
