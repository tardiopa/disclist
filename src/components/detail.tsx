"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Plus, X } from "lucide-react";
import { Confirm, Rarity, Sleeve, Spinner } from "./bits";
import { useOptionalLibrary } from "./library";
import * as discogs from "@/lib/discogs";
import { useI18n } from "@/lib/i18n";
import type { AlbumDetail, ArtistInfo, Item, ListName, NewItem, SearchHit, Stats } from "@/lib/types";

/** What the view opens on: a library entry, or a search hit not yet added. */
export interface DetailTarget {
  base: Item | SearchHit;
  /** Where the entry lives; undefined for a search hit or a shared page. */
  list?: ListName;
}

const FRESH_MS = 7 * 24 * 3600 * 1000;

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Lock scrolling on the root element, not on <body>: locking <body> turns it
    // into its own scroll container, and the sticky header underneath then
    // jumps to the top of the document until the lock is released.
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = prev;
    };
  }, [onClose]);
}

const CLOSE_MS = 300;

export function Detail({ target, onClose: unmount, morphed }: { target: DetailTarget; onClose: () => void; morphed?: boolean }) {
  // Closing is a plain fade of the whole view (same pace as switching screens);
  // the screen underneath is already painted, so nothing has to travel back.
  const [closing, setClosing] = useState(false);
  const onClose = useCallback(() => {
    setClosing(true);
    setTimeout(unmount, CLOSE_MS);
  }, [unmount]);

  const { t, money, count } = useI18n();
  const lib = useOptionalLibrary();
  const token = lib?.link?.token;
  const { base, list } = target;
  useEscape(onClose);

  // Follow the live entry so edits (edition, prices) show immediately.
  const entry = useMemo<Item | null>(() => {
    if (!list || !("id" in base)) return null;
    if (!lib) return base;
    return (list === "collection" ? lib.collection : lib.wishlist).find((i) => i.id === base.id) ?? null;
  }, [lib, list, base]);

  const [detail, setDetail] = useState<AlbumDetail | null>(null);
  const [artist, setArtist] = useState<ArtistInfo | null>(null);
  const [fresh, setFresh] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [allEditions, setAllEditions] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const saveAlbum = lib?.saveAlbum;
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    let live = true;
    const known = ("stats" in base ? base.stats : null) ?? null;
    (async () => {
      try {
        const d = await discogs.album(base, token);
        if (!live) return;
        setDetail(d);
        setLoading(false);
        if (d.artistId) discogs.artist(d.artistId, token).then((a) => live && setArtist(a)).catch(() => {});
        const outdated = "enriched" in base && base.enriched !== discogs.ALBUM_PASS;
        const stale = !known || outdated || Date.now() - known.updatedAt > FRESH_MS;
        if (stale || discogs.canDeepen(known, discogs.SAMPLE_FULL)) {
          const s = await discogs.stats(d, discogs.SAMPLE_FULL, token, "high");
          if (!live) return;
          setFresh(s);
          saveAlbum?.(base.key, d, s).catch(() => {});
        }
      } catch {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
      started.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, base.key]);

  const stats = fresh ?? entry?.stats ?? ("stats" in base ? base.stats : null) ?? null;
  const title = detail?.title || base.title;
  const artistName = detail?.artist || base.artist;
  const year = detail?.year ?? base.year;
  const genres = detail?.genres.length ? detail.genres : base.genres;
  const styles = detail?.styles.length ? detail.styles : base.styles;
  // Album artwork first: an edition's own image is often a buyer's photo.
  const cover = detail?.cover || base.cover || base.thumb;

  const owned = lib?.collection.filter((i) => i.key === base.key) ?? [];
  const wished = lib?.wishlist.find((i) => i.key === base.key);
  const ownedIds = new Set(owned.map((i) => i.releaseId).filter(Boolean));

  const asNew = (): NewItem => ({
    key: base.key,
    masterId: base.masterId,
    releaseId: base.masterId ? null : base.releaseId,
    title,
    artist: artistName,
    artistId: detail?.artistId ?? null,
    year,
    cover: cover || "",
    thumb: base.thumb || detail?.thumb || "",
    genres,
    styles,
    stats,
    enriched: detail ? discogs.ALBUM_PASS : false,
    addedAt: Date.now(),
  });

  const act = async (name: string, fn: () => Promise<unknown>, close?: boolean) => {
    setBusy(name);
    try {
      await fn();
      if (close) onClose();
    } finally {
      setBusy(null);
    }
  };

  const editions = detail?.editions ?? [];
  const sortedEditions = useMemo(() => {
    const mine = (id: number) => (ownedIds.has(id) ? 1 : 0);
    return [...editions].sort((a, b) => mine(b.id) - mine(a.id) || b.have - a.have);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editions, owned.length]);
  const visibleEditions = allEditions ? sortedEditions : sortedEditions.slice(0, 6);

  const cells: [string, React.ReactNode][] = [
    [t("average"), <span key="a" className="num">{money(stats?.avg)}</span>],
    [t("lowest"), <span key="l" className="num">{money(stats?.min)}</span>],
    [t("rarity"), <Rarity key="r" stats={stats} />],
    [t("editions"), <span key="e" className="num">{stats?.versions || detail?.versions ? count(detail?.versions ?? stats!.versions) : "—"}</span>],
  ];

  return (
    <div
      className={`${morphed ? "" : "anim-fade"} fixed inset-0 z-50 overflow-y-auto bg-bg scroll-thin [scrollbar-gutter:stable] transition-opacity duration-300 ease-out ${closing ? "pointer-events-none opacity-0" : ""}`} role="dialog" aria-modal aria-label={title}>
      {/* Floating close button, aligned with the right edge of the content. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 [scrollbar-gutter:stable]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-end px-5 sm:px-8">
          <button
            onClick={onClose}
            aria-label="Close"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-line bg-bg/80 backdrop-blur-md hover:border-ink"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-16 pb-24 sm:px-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16 md:pt-24">
        <div className={`md:sticky md:top-24 md:self-start ${morphed ? "" : "anim-rise"}`}>
          <div className="mx-auto w-[78%] -translate-x-[9%] md:w-[82%]">
            <Sleeve src={cover} alt={title} reveal target eager />
          </div>
        </div>

        <div className={`min-w-0 ${morphed ? "" : "anim-rise-late"}`}>
          <p className="label">{[year, ...genres].filter(Boolean).join(" · ")}</p>
          <h1 className="mt-3 text-[34px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-[46px]">{title}</h1>
          <p className="mt-2 text-xl text-muted sm:text-2xl">{artistName}</p>

          {styles.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {styles.slice(0, 8).map((s) => (
                <li key={s} className="rounded-full border border-line px-2.5 py-0.5 text-[12.5px] text-muted">
                  {s}
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-8 grid grid-cols-2 border-y border-line sm:grid-cols-4 [&>div]:py-4 [&>div:nth-child(even)]:border-l [&>div:nth-child(even)]:border-line [&>div:nth-child(even)]:pl-4 [&>div:nth-child(-n+2)]:border-b [&>div:nth-child(-n+2)]:border-line sm:[&>div:nth-child(-n+2)]:border-b-0 sm:[&>div:not(:first-child)]:border-l sm:[&>div:not(:first-child)]:border-line sm:[&>div:not(:first-child)]:pl-4">
            {cells.map(([k, v]) => (
              <div key={k}>
                <dt className="label">{k}</dt>
                <dd className="mt-1.5 text-[19px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {stats && stats.forSale > 0 && (
            <p className="label mt-3 normal-case tracking-normal">
              ≈ {count(stats.forSale)} {t("forSale").toLowerCase()}
            </p>
          )}

          {/* actions */}
          <div className="mt-7 flex flex-wrap items-center gap-2">
            {lib && !list && (
              <>
                {owned.length > 0 && (
                  <span className="btn pointer-events-none bg-surface pl-3.5 text-ink">
                    <Check size={16} className="text-accent" />
                    {t("inCollection")}
                    {owned.length > 1 ? ` ×${owned.length}` : ""}
                  </span>
                )}
                {wished && (
                  <span className="btn pointer-events-none bg-surface pl-3.5 text-ink">
                    <Check size={16} className="text-accent" />
                    {t("inWishlist")}
                  </span>
                )}
                <button
                  className={`btn ${owned.length ? "btn-ghost" : "btn-primary"}`}
                  disabled={!!busy}
                  onClick={() => act("col", () => (wished && !owned.length ? lib.gotIt(wished) : lib.add("collection", asNew())))}
                >
                  {busy === "col" ? <Spinner /> : <Plus size={16} />}
                  {owned.length ? t("addAnotherCopy") : t("addToCollection")}
                </button>
                {!wished && !owned.length && (
                  <button className="btn btn-ghost" disabled={!!busy} onClick={() => act("wish", () => lib.add("wishlist", asNew()))}>
                    {busy === "wish" ? <Spinner /> : <Plus size={16} />}
                    {t("addToWishlist")}
                  </button>
                )}
              </>
            )}
            {lib && list === "wishlist" && entry && (
              <button className="btn btn-primary" disabled={!!busy} onClick={() => act("got", () => lib.gotIt(entry), true)}>
                {busy === "got" ? <Spinner /> : <ArrowRight size={16} />}
                {t("gotIt")}
              </button>
            )}
            {(list === "wishlist" || !list) && (
              <a className="btn btn-ghost" href={discogs.marketUrl(base)} target="_blank" rel="noreferrer">
                {t("buy")}
                <ArrowUpRight size={15} />
              </a>
            )}
            <a className="btn btn-ghost" href={discogs.discogsUrl(base)} target="_blank" rel="noreferrer">
              {t("viewOnDiscogs")}
              <ArrowUpRight size={15} />
            </a>
            {lib && list && entry && (
              <button className="btn ml-auto text-muted hover:text-accent" disabled={!!busy} onClick={() => setConfirming(true)}>
                {t("remove")}
              </button>
            )}
          </div>

          {loading && (
            <div className="mt-12 flex items-center gap-3 text-muted">
              <Spinner />
            </div>
          )}

          {detail && detail.tracklist.length > 0 && (
            <section className="mt-12">
              <h2 className="label">{t("tracklist")}</h2>
              <ol className="mt-3 border-t border-line">
                {detail.tracklist.map((tr, n) =>
                  tr.heading ? (
                    <li key={n} className="label border-b border-line pt-5 pb-2">
                      {tr.title}
                    </li>
                  ) : (
                    <li key={n} className="flex items-baseline gap-4 border-b border-line py-2.5">
                      <span className="num w-7 shrink-0 text-[12px] text-faint">{tr.position}</span>
                      <span className="min-w-0 flex-1">{tr.title}</span>
                      <span className="num text-[12px] text-muted">{tr.duration}</span>
                    </li>
                  ),
                )}
              </ol>
            </section>
          )}

          {artist && (artist.profile || artist.image) && (
            <section className="mt-12">
              <h2 className="label">{artistName}</h2>
              <div className="mt-4 flex gap-5">
                {artist.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.image} alt="" referrerPolicy="no-referrer" className="h-24 w-24 shrink-0 rounded-full object-cover grayscale" />
                )}
                {artist.profile && <ArtistBio text={artist.profile} />}
              </div>
            </section>
          )}

          {sortedEditions.length > 0 && (
            <section className="mt-12">
              <h2 className="label">
                {t("editions")} · {count(detail!.versions)}
              </h2>
              <ul className="mt-3 border-t border-line">
                {visibleEditions.map((e) => (
                  <li key={e.id} className="border-b border-line">
                    <a
                      href={`https://www.discogs.com/release/${e.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3 py-2.5 transition-colors hover:bg-surface"
                    >
                      <span className="num w-10 shrink-0 text-[12px] text-muted">{e.year || "—"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {e.label}
                          {e.catno && <span className="num ml-2 text-[12px] text-faint">{e.catno}</span>}
                        </span>
                        <span className="block truncate text-[13px] text-muted">{[e.country, e.format].filter(Boolean).join(" · ")}</span>
                      </span>
                      {ownedIds.has(e.id) && (
                        <span className="group/tip relative shrink-0">
                          <span className="label text-ink">{t("yours")}</span>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 w-max max-w-64 translate-y-1 rounded-md bg-ink px-2.5 py-1.5 text-[12.5px] leading-snug text-bg opacity-0 shadow-lg transition duration-150 group-hover/tip:translate-y-0 group-hover/tip:opacity-100"
                          >
                            {t("markYours")}
                          </span>
                        </span>
                      )}
                      <ArrowUpRight size={15} className="mr-1 shrink-0 text-faint group-hover:text-ink" />
                    </a>
                  </li>
                ))}
              </ul>
              {sortedEditions.length > 6 && !allEditions && (
                <button className="label mt-3 hover:text-ink" onClick={() => setAllEditions(true)}>
                  + {sortedEditions.length - 6}
                </button>
              )}
            </section>
          )}
        </div>
      </div>
      {confirming && lib && list && entry && (
        <Confirm
          title={t("removeTitle")}
          text={
            <>
              <span className="text-ink">{title}</span> — {artistName}. {t(list === "collection" ? "removeFromCollection" : "removeFromWishlist")}
            </>
          }
          action={t("remove")}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            act("rm", () => lib.remove(list, entry.id), true);
          }}
        />
      )}
    </div>
  );
}

function ArtistBio({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 420;
  return (
    <p className="min-w-0 text-[14.5px] leading-relaxed whitespace-pre-line text-muted">
      {open || !long ? text : `${text.slice(0, 380).trimEnd()}… `}
      {long && !open && (
        <button className="text-ink underline underline-offset-2" onClick={() => setOpen(true)}>
          +
        </button>
      )}
    </p>
  );
}
