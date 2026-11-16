"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, Plus, X } from "lucide-react";
import { Rarity, Sleeve, Spinner } from "./bits";
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
}

export function Detail({ target, onClose }: { target: DetailTarget; onClose: () => void }) {
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
        const stale = !known || Date.now() - known.updatedAt > FRESH_MS;
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
  const cover = base.cover || detail?.cover || base.thumb;

  const owned = lib?.collection.filter((i) => i.key === base.key) ?? [];
  const wished = lib?.wishlist.find((i) => i.key === base.key);
  const yoursId = list === "collection" ? entry?.releaseId : null;
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
    enriched: !!detail,
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
    const mine = (id: number) => (id === yoursId ? 2 : ownedIds.has(id) ? 1 : 0);
    return [...editions].sort((a, b) => mine(b.id) - mine(a.id) || b.have - a.have);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editions, yoursId, owned.length]);
  const visibleEditions = allEditions ? sortedEditions : sortedEditions.slice(0, 6);

  const cells: [string, React.ReactNode][] = [
    [t("average"), <span key="a" className="num">{money(stats?.avg)}</span>],
    [t("lowest"), <span key="l" className="num">{money(stats?.min)}</span>],
    [t("rarity"), <Rarity key="r" stats={stats} withLabel />],
    [t("editions"), <span key="e" className="num">{stats?.versions || detail?.versions ? count(detail?.versions ?? stats!.versions) : "—"}</span>],
  ];

  return (
    <div className="anim-fade fixed inset-0 z-50 overflow-y-auto bg-bg scroll-thin" role="dialog" aria-modal aria-label={title}>
      <button
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-bg/80 backdrop-blur hover:border-ink sm:top-6 sm:right-6"
      >
        <X size={18} />
      </button>

      <div className="anim-rise mx-auto grid max-w-6xl gap-10 px-5 pt-16 pb-24 sm:px-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16 md:pt-24">
        <div className="md:sticky md:top-24 md:self-start">
          <div className="mx-auto w-[78%] -translate-x-[9%] md:w-[82%]">
            <Sleeve src={cover} alt={title} out eager />
          </div>
        </div>

        <div className="min-w-0">
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
              ≈ {count(stats.forSale)} {t("forSale")}
            </p>
          )}

          {/* actions */}
          <div className="mt-7 flex flex-wrap items-center gap-2">
            {lib && !list && (
              <>
                <button className="btn btn-primary" disabled={!!busy} onClick={() => act("col", () => lib.add("collection", asNew()))}>
                  {busy === "col" ? <Spinner /> : owned.length ? <Check size={16} /> : <Plus size={16} />}
                  {owned.length ? t("addAnotherCopy") : t("addToCollection")}
                </button>
                {wished ? (
                  <span className="btn btn-ghost pointer-events-none text-muted">
                    <Check size={16} />
                    {t("inWishlist")}
                  </span>
                ) : (
                  !owned.length && (
                    <button className="btn btn-ghost" disabled={!!busy} onClick={() => act("wish", () => lib.add("wishlist", asNew()))}>
                      {busy === "wish" ? <Spinner /> : <Plus size={16} />}
                      {t("addToWishlist")}
                    </button>
                  )
                )}
                {owned.length > 0 && (
                  <span className="label ml-1">
                    {t("inCollection")}
                    {owned.length > 1 ? ` ×${owned.length}` : ""}
                  </span>
                )}
              </>
            )}
            {lib && list === "wishlist" && entry && (
              <button className="btn btn-primary" disabled={!!busy} onClick={() => act("got", () => lib.gotIt(entry), true)}>
                {busy === "got" ? <Spinner /> : <Check size={16} />}
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
              <button
                className={`btn ml-auto ${confirming ? "bg-accent text-white" : "text-muted hover:text-ink"}`}
                disabled={!!busy}
                onBlur={() => setConfirming(false)}
                onClick={() => (confirming ? act("rm", () => lib.remove(list, entry.id), true) : setConfirming(true))}
              >
                {confirming ? `${t("remove")} ?` : t("remove")}
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
                {visibleEditions.map((e) => {
                  const yours = e.id === yoursId;
                  const canPick = !!lib && list === "collection" && !!entry;
                  const body = (
                    <>
                      <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${yours ? "bg-accent" : ownedIds.has(e.id) ? "bg-faint" : "bg-transparent"}`} />
                      <span className="num w-10 shrink-0 text-[12px] text-muted">{e.year || "—"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {e.label}
                          {e.catno && <span className="num ml-2 text-[12px] text-faint">{e.catno}</span>}
                        </span>
                        <span className="block truncate text-[13px] text-muted">{[e.country, e.format].filter(Boolean).join(" · ")}</span>
                      </span>
                      {yours && <span className="label text-accent">{t("yours")}</span>}
                    </>
                  );
                  return (
                    <li key={e.id} className="group flex items-start border-b border-line">
                      {canPick ? (
                        <button
                          className="flex min-w-0 flex-1 items-start gap-3 py-2.5 text-left hover:bg-surface"
                          title={t("markYours")}
                          onClick={() => lib!.setEdition(entry!.id, yours ? null : e.id)}
                        >
                          {body}
                        </button>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-start gap-3 py-2.5">{body}</div>
                      )}
                      <a
                        href={`https://www.discogs.com/release/${e.id}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Discogs"
                        className="ml-2 flex h-11 w-8 shrink-0 items-center justify-center text-faint hover:text-ink"
                      >
                        <ArrowUpRight size={15} />
                      </a>
                    </li>
                  );
                })}
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
