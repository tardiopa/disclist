"use client";

// Product previews for the landing page: the app's own building blocks, filled
// with real albums (see scripts/build-landing-demo.mts). Decorative only.
import type { ReactNode } from "react";
import { ArrowUpRight, Check, Plus, Search } from "lucide-react";
import { LogoMark, Rarity } from "./bits";
import { useI18n } from "@/lib/i18n";
import demo from "@/lib/demo.json";

/* eslint-disable @next/next/no-img-element */

function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none overflow-hidden rounded-2xl border border-line bg-bg shadow-[0_40px_80px_-40px_rgb(var(--shadow)/0.45)] select-none ${className}`}
    >
      {children}
    </div>
  );
}

function Cover({ src, className = "" }: { src: string; className?: string }) {
  return (
    <div className={`aspect-square overflow-hidden rounded-[2px] bg-line shadow-[0_8px_18px_-8px_rgb(var(--shadow)/0.35)] ${className}`}>
      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}

/** The collection screen, as it looks in the app. */
export function CollectionShot() {
  const { t, count } = useI18n();
  return (
    <Frame>
      <div className="flex h-12 items-center gap-6 border-b border-line px-5 sm:px-7">
        <span className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.03em]">
          <LogoMark className="h-[1.24em] w-[1.73em]" />
          Disclist
        </span>
        <span className="hidden gap-5 text-[13px] text-muted sm:flex">
          <span className="text-ink">{t("collection")}</span>
          <span>{t("wishlist")}</span>
          <span>{t("dashboard")}</span>
        </span>
        <span className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-full bg-ink pr-3 pl-2.5 text-[12px] font-medium text-bg">
          <Plus size={13} />
          {t("add")}
        </span>
      </div>
      <div className="px-5 pt-6 sm:px-7 sm:pt-8">
        <p className="text-[26px] leading-none font-semibold tracking-[-0.035em] sm:text-[34px]">{t("collection")}</p>
        <p className="label mt-2.5">
          {count(demo.count)} {t("records")}
        </p>
        <div className="mt-6 grid max-h-[22rem] grid-cols-3 gap-x-4 gap-y-6 overflow-hidden [mask-image:linear-gradient(#000_70%,transparent)] sm:max-h-[30rem] sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-6">
          {demo.grid.map((a) => (
            <div key={a.img} className="min-w-0">
              <Cover src={a.img} />
              <p className="mt-2.5 truncate text-[12.5px] leading-tight font-medium">{a.title}</p>
              <p className="mt-0.5 flex gap-2 text-[11.5px] text-muted">
                <span className="min-w-0 flex-1 truncate">{a.artist}</span>
                <span className="num text-[10.5px] text-faint">{a.year}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/** Discogs: search an album, import a whole collection. */
export function DiscogsShot() {
  const { t } = useI18n();
  const hits = demo.search;
  return (
    <div className="relative pb-10 sm:pr-10">
      <Frame className="bg-raised">
        <div className="flex h-12 items-center gap-3 border-b border-line px-4 text-[15px]">
          <Search size={16} className="text-muted" />
          <span>
            {hits[0].artist.toLowerCase()}
            <span className="ml-px inline-block h-4 w-px translate-y-0.5 bg-ink" />
          </span>
        </div>
        <div className="py-1.5">
          {hits.map((h, n) => (
            <div key={h.img} className={`flex items-center gap-3 px-4 py-2 ${n === 0 ? "bg-bg" : ""}`}>
              <Cover src={h.img} className="w-11 shrink-0 shadow-none" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{h.title}</span>
                <span className="block truncate text-[12.5px] text-muted">{h.artist}</span>
              </span>
              {n === 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-bg">
                  <Check size={11} />
                  {t("collection")}
                </span>
              )}
              <span className="num w-9 shrink-0 text-right text-[11.5px] text-faint">{h.year}</span>
            </div>
          ))}
        </div>
      </Frame>
      <Frame className="absolute right-0 bottom-0 flex items-center gap-3 !rounded-full bg-raised py-2.5 pr-5 pl-4 text-[13.5px]">
        <span className="h-2 w-2 rounded-full bg-accent" />
        {t("importCollection")}
        <span className="label">
          +{demo.count} {t("importDone")}
        </span>
      </Frame>
    </div>
  );
}

/** The wishlist with its market data. */
export function WishlistShot() {
  const { t, money } = useI18n();
  return (
    <Frame className="px-5 pt-5 pb-2 sm:px-6">
      <p className="text-[22px] leading-none font-semibold tracking-[-0.03em]">{t("wishlist")}</p>
      <div className="label mt-5 flex items-center gap-3 border-b border-line pb-2.5">
        <span className="w-10" />
        <span className="flex-1">{t("album")}</span>
        <span className="w-24 text-right">{t("s1Title")}</span>
        <span className="hidden w-24 sm:block">{t("rarity")}</span>
        <span className="w-4" />
      </div>
      {demo.wish.slice(0, 4).map((w) => (
        <div key={w.img} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
          <Cover src={w.img} className="w-10 shrink-0 shadow-none" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium">{w.title}</span>
            <span className="block truncate text-[12.5px] text-muted">{w.artist}</span>
          </span>
          <span className="num w-24 text-right text-[13px]">{money(w.avg)}</span>
          <span className="hidden w-24 text-[12.5px] sm:block">
            <Rarity stats={{ avg: w.avg, min: w.min, forSale: w.forSale, versions: 1, sampled: 1, updatedAt: 0 }} />
          </span>
          <ArrowUpRight size={14} className="w-4 text-faint" />
        </div>
      ))}
    </Frame>
  );
}

/** The dashboard: the collection by decade and by genre. */
export function DashboardShot() {
  const { t } = useI18n();
  const genreMax = demo.genres[0]?.count ?? 1;
  const decadeMax = Math.max(1, ...demo.decades.map((d) => d.count));
  return (
    <Frame className="px-5 pt-5 pb-6 sm:px-6">
      <p className="text-[22px] leading-none font-semibold tracking-[-0.03em]">{t("dashboard")}</p>

      <p className="label mt-6">{t("decades")}</p>
      {/* Heights in pixels: percentage heights inside a flex row are unreliable across browsers. */}
      <div className="mt-4 flex items-end gap-2 border-b border-line">
        {demo.decades.map((d) => (
          <span key={d.decade} className="flex flex-1 flex-col items-center">
            <span className="num mb-1.5 text-[11px] text-muted">{d.count || ""}</span>
            <span className="block w-full max-w-9 rounded-t-[3px] bg-ink" style={{ height: d.count ? Math.max(3, Math.round((d.count / decadeMax) * 96)) : 0 }} />
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {demo.decades.map((d) => (
          <span key={d.decade} className="num flex-1 text-center text-[10.5px] text-muted">
            {String(d.decade).slice(2)}s
          </span>
        ))}
      </div>

      <p className="label mt-7">{t("topGenres")}</p>
      <div className="mt-3.5 space-y-2.5">
        {demo.genres.map((g) => (
          <div key={g.name} className="grid items-center gap-3 text-[13px]" style={{ gridTemplateColumns: "6.5rem minmax(0, 1fr) 1.5rem" }}>
            <span className="truncate">{g.name}</span>
            <span className="block h-1.5">
              <span className="block h-full rounded-r-[3px] bg-ink" style={{ width: `${(g.count / genreMax) * 100}%` }} />
            </span>
            <span className="num text-right text-[12px] text-muted">{g.count}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}
