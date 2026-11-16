"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import * as discogs from "@/lib/discogs";
import { mergeWishlist } from "@/lib/merge";
import * as store from "@/lib/store";
import type { AlbumDetail, DiscogsLink, Item, ListName, NewItem, Profile, Stats } from "@/lib/types";

interface Library {
  uid: string;
  profile: Profile | null;
  link: DiscogsLink | null;
  collection: Item[];
  wishlist: Item[];
  loading: boolean;
  /** Albums still waiting for a price. */
  pending: number;
  add: (list: ListName, item: NewItem) => Promise<void>;
  remove: (list: ListName, id: string) => Promise<void>;
  gotIt: (item: Item) => Promise<void>;
  setEdition: (id: string, releaseId: number | null) => Promise<void>;
  /** Store fresh market data on every entry of that album. */
  saveAlbum: (key: string, detail: AlbumDetail | null, stats: Stats) => Promise<void>;
}

const Ctx = createContext<Library | null>(null);
export const LibraryContext = Ctx;
export type { Library };

export const useLibrary = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("LibraryProvider missing");
  return v;
};

/** Present only inside the signed-in app; public pages get null. */
export const useOptionalLibrary = () => useContext(Ctx);

const STALE_MS = 30 * 24 * 3600 * 1000;
const EMPTY: Stats = { avg: null, min: null, forSale: 0, versions: 0, sampled: 0, updatedAt: 0 };

function needsPricing(i: Item, now: number): boolean {
  return !i.stats || i.enriched !== discogs.ALBUM_PASS || now - i.stats.updatedAt > STALE_MS;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user!.uid;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [link, setLink] = useState<DiscogsLink | null>(null);
  const [collection, setCollection] = useState<Item[]>([]);
  const [wishlist, setWishlist] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState({ collection: false, wishlist: false });
  const [pending, setPending] = useState(0);

  useEffect(() => {
    store.ensureProfile(user!).catch(() => {});
    const subs = [
      store.watchProfile(uid, setProfile),
      store.watchDiscogs(uid, setLink),
      store.watchList(uid, "collection", (items) => {
        setCollection(items);
        setLoaded((l) => ({ ...l, collection: true }));
      }),
      store.watchList(uid, "wishlist", (items) => {
        setWishlist(mergeWishlist(items));
        setLoaded((l) => ({ ...l, wishlist: true }));
      }),
    ];
    return () => subs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const lists = useRef({ collection, wishlist });
  lists.current = { collection, wishlist };

  const saveAlbum = useCallback(
    async (key: string, detail: AlbumDetail | null, stats: Stats) => {
      const { collection, wishlist } = lists.current;
      const targets = [
        ...collection.filter((i) => i.key === key).map((i) => ({ list: "collection" as const, id: i.id, item: i })),
        ...wishlist.filter((i) => i.key === key).map((i) => ({ list: "wishlist" as const, id: i.id, item: i })),
      ];
      if (!targets.length) return;
      const patch: Partial<NewItem> = { stats, enriched: discogs.ALBUM_PASS };
      if (detail) {
        // The album, not the edition, is the unit: take its canonical facts.
        if (detail.title) patch.title = detail.title;
        if (detail.artist) patch.artist = detail.artist;
        if (detail.artistId) patch.artistId = detail.artistId;
        if (detail.year) patch.year = detail.year;
        if (detail.genres.length) patch.genres = detail.genres;
        if (detail.styles.length) patch.styles = detail.styles;
        // Album artwork beats the photo of one particular pressing.
        if (detail.cover) patch.cover = detail.cover;
        if (detail.thumb) patch.thumb = detail.thumb;
      }
      await store.patchMany(uid, targets, patch);
    },
    [uid],
  );

  /* Background pricing: one album at a time, at low priority. */
  const token = link?.token;
  const failed = useRef(new Set<string>());
  const working = useRef(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const queued = useCallback(() => {
    const now = Date.now();
    const keys = new Set<string>();
    for (const i of [...lists.current.collection, ...lists.current.wishlist]) {
      if (needsPricing(i, now) && !failed.current.has(i.key)) keys.add(i.key);
    }
    return keys.size;
  }, []);

  useEffect(() => {
    const size = token ? queued() : 0;
    setPending(size);
    if (!token || !size || working.current) return;
    working.current = true;

    (async () => {
      while (alive.current && tokenRef.current) {
        const now = Date.now();
        const all = [...lists.current.collection, ...lists.current.wishlist];
        const next =
          all.find((i) => !i.stats && !failed.current.has(i.key)) ??
          all.find((i) => needsPricing(i, now) && !failed.current.has(i.key));
        if (!next) break;
        try {
          const detail = await discogs.album(next, tokenRef.current, "low");
          const stats = await discogs.stats(detail, discogs.SAMPLE_QUICK, tokenRef.current, "low");
          // Keep a deeper, still-fresh sample rather than downgrade it.
          const keep = next.stats && next.stats.sampled > stats.sampled && now - next.stats.updatedAt < STALE_MS;
          await saveAlbum(next.key, detail, keep ? next.stats! : stats);
        } catch (e) {
          failed.current.add(next.key);
          const status = (e as discogs.DiscogsError)?.status;
          if (status === 404) await saveAlbum(next.key, null, { ...EMPTY, updatedAt: Date.now() }).catch(() => {});
          else if (status === 401 || !status) break; // bad token or offline: stop until something changes
        }
        // Let the snapshot land before picking the next one.
        await new Promise((r) => setTimeout(r, 200));
        if (alive.current) setPending(queued());
      }
      working.current = false;
      if (alive.current) setPending(tokenRef.current ? queued() : 0);
    })();
  }, [token, collection, wishlist, saveAlbum, queued]);

  const value = useMemo<Library>(
    () => ({
      uid,
      profile,
      link,
      collection,
      wishlist,
      loading: !loaded.collection || !loaded.wishlist,
      pending,
      add: (list, item) => store.addItem(uid, list, item),
      remove: (list, id) => store.removeItem(uid, list, id),
      gotIt: (item) => store.moveToCollection(uid, item),
      setEdition: (id, releaseId) => store.patchItem(uid, "collection", id, { releaseId }),
      saveAlbum,
    }),
    [uid, profile, link, collection, wishlist, loaded, pending, saveAlbum],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
