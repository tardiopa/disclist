// Import rules: add what is new, keep what is there, never remove.
import type { Item, NewItem } from "./types.ts";

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

/** The wishlist holds each album once, whatever edition was wanted on Discogs. */
export function planWishlistImport(existing: Item[], incoming: NewItem[]): { id: string; item: NewItem }[] {
  const have = new Set(existing.map((i) => i.key));
  const out: { id: string; item: NewItem }[] = [];
  for (const item of incoming) {
    if (have.has(item.key)) continue;
    have.add(item.key);
    out.push({ id: item.key, item: { ...item, instanceId: null } });
  }
  return out;
}
