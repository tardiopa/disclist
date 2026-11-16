// Import rules: add what is new, keep what is there, never remove.
import type { Item, NewItem } from "./types.ts";
import { fold } from "./view.ts";

export interface CollectionPlan {
  /** New documents, keyed by the id they must be written under. */
  create: { id: string; item: NewItem }[];
  /** Existing manual entries that turn out to be a Discogs instance. */
  attach: { id: string; instanceId: number; releaseId: number | null }[];
}

export const instanceDocId = (instanceId: number) => `d${instanceId}`;

/**
 * Every Discogs collection instance becomes one item (two copies = two items).
 * An instance already imported is skipped. A record added by hand that matches
 * an instance (same album, same or unspecified edition) is linked to it rather
 * than duplicated.
 */
export function planCollectionImport(existing: Item[], incoming: NewItem[]): CollectionPlan {
  const known = new Set(existing.map((i) => i.instanceId).filter((n): n is number => n != null));
  const free = existing.filter((i) => i.instanceId == null);
  const claimed = new Set<string>();
  const plan: CollectionPlan = { create: [], attach: [] };
  const seen = new Set<number>();

  for (const item of incoming) {
    const instanceId = item.instanceId;
    if (instanceId == null || known.has(instanceId) || seen.has(instanceId)) continue;
    seen.add(instanceId);

    const candidates = free.filter((f) => !claimed.has(f.id) && f.key === item.key);
    const match =
      candidates.find((f) => f.releaseId != null && f.releaseId === item.releaseId) ??
      candidates.find((f) => f.releaseId == null);
    if (match) {
      claimed.add(match.id);
      plan.attach.push({ id: match.id, instanceId, releaseId: item.releaseId });
    } else {
      plan.create.push({ id: instanceDocId(instanceId), item });
    }
  }
  return plan;
}

/**
 * Some pressings have no Discogs master, so nothing ties them to their album.
 * For those, the artist + title pair stands in as the album identity.
 */
const nameId = (i: { artist: string; title: string }) => `${fold(i.artist)}|${fold(i.title)}`;

/**
 * The wishlist shows each album once. Master-less pressings of an album that
 * is already listed (under its master, or another master-less pressing) are
 * folded into it. Nothing is deleted: the extra entries are just not shown.
 */
export function mergeWishlist<T extends Item | NewItem>(items: T[]): T[] {
  const ordered = [...items].sort((a, b) => Number(!a.masterId) - Number(!b.masterId) || a.addedAt - b.addedAt);
  const names = new Set<string>();
  const keep = new Set<T>();
  for (const i of ordered) {
    const id = nameId(i);
    if (!i.masterId && names.has(id)) continue;
    names.add(id);
    keep.add(i);
  }
  return items.filter((i) => keep.has(i));
}

/** The wishlist holds each album once, whatever edition was wanted on Discogs. */
export function planWishlistImport(existing: Item[], incoming: NewItem[]): { id: string; item: NewItem }[] {
  const have = new Set(existing.map((i) => i.key));
  const names = new Set(existing.map(nameId));
  const out: { id: string; item: NewItem }[] = [];
  // Albums with a master first, so their master-less pressings fold into them.
  const ordered = [...incoming].sort((a, b) => Number(!a.masterId) - Number(!b.masterId));
  for (const item of ordered) {
    if (have.has(item.key)) continue;
    if (!item.masterId && names.has(nameId(item))) continue;
    have.add(item.key);
    names.add(nameId(item));
    out.push({ id: item.key, item: { ...item, instanceId: null } });
  }
  return out;
}
