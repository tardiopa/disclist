// Pure pricing / rarity maths. Discogs only exposes the current lowest listing
// and the number of copies for sale per edition, so album-level figures are
// aggregated over a sample of its most-owned vinyl editions.
import type { Edition, Stats } from "./types.ts";

export interface Market {
  /** Lowest listing in EUR, null when nothing is for sale. */
  lowest: number | null;
  forSale: number;
}

/** Editions worth pricing first: the ones most people own. */
export function pickSample(editions: Edition[], n: number): Edition[] {
  return [...editions].sort((a, b) => b.have - a.have).slice(0, n);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * @param sample   editions that were priced, aligned with `markets`
 * @param fetched  every edition we know about (may be fewer than `versions`)
 * @param versions total vinyl editions on Discogs
 */
export function aggregate(
  sample: Edition[],
  markets: Market[],
  fetched: Edition[],
  versions: number,
  now: number,
): Stats {
  const prices = markets.map((m) => m.lowest).filter((p): p is number => p != null && p > 0);
  const sampledForSale = markets.reduce((s, m) => s + (m.forSale || 0), 0);

  // Scale the sampled supply up to the editions we did not price, using how
  // widely owned they are as a proxy for how often they are listed.
  const haveSampled = sample.reduce((s, e) => s + e.have, 0);
  const haveFetched = fetched.reduce((s, e) => s + e.have, 0);
  let forSale = sampledForSale;
  if (sample.length && fetched.length > sample.length) {
    const ratio = haveSampled > 0 ? haveFetched / haveSampled : fetched.length / sample.length;
    forSale *= Math.min(ratio, fetched.length / sample.length);
  }
  if (fetched.length && versions > fetched.length) forSale *= Math.min(versions / fetched.length, 3);

  return {
    avg: prices.length ? round2(prices.reduce((s, p) => s + p, 0) / prices.length) : null,
    min: prices.length ? round2(Math.min(...prices)) : null,
    forSale: Math.round(forSale),
    versions: Math.max(versions, fetched.length),
    sampled: sample.length,
    updatedAt: now,
  };
}

/** 1 = common, 2 = rare, 3 = very rare — by vinyl copies currently for sale. */
export type RarityLevel = 1 | 2 | 3;

export function rarity(forSale: number): RarityLevel {
  if (forSale < 25) return 3;
  if (forSale < 150) return 2;
  return 1;
}
