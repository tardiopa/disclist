"use client";

// Product previews for the landing page: the app's own building blocks, filled
// with real albums (see scripts/build-landing-demo.mts). Decorative only.
import type { ReactNode } from "react";
import { ArrowUpRight, Check, Copy, Plus, Search } from "lucide-react";
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
          <LogoMark className="h-[0.94em] w-[1.31em]" />
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
  const hits = [demo.grid[5], demo.grid[10], demo.grid[3]];
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
        <span className="w-24 text-right">{t("average")}</span>
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

function Switch({ on }: { on: boolean }) {
  return (
    <span className={`relative h-6 w-10 shrink-0 rounded-full ${on ? "bg-ink" : "bg-line"}`}>
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-bg ${on ? "translate-x-4" : ""}`} />
    </span>
  );
}

/** Sharing: two independent switches, one link each. */
export function ShareShot() {
  const { t } = useI18n();
  return (
    <Frame className="px-5 py-2 sm:px-6">
      <div className="flex min-h-16 items-center gap-3 border-b border-line">
        <span className="flex-1">
          {t("collection")}
          <span className="label ml-3">{t("public")}</span>
        </span>
        <span className="hidden h-8 items-center gap-2 rounded-full border border-line px-3 text-[12.5px] sm:inline-flex">
          <Copy size={13} />
          {t("copyLink")}
        </span>
        <Switch on />
      </div>
      <div className="num flex h-11 items-center border-b border-line text-[12.5px] text-muted">disclist.app/u/k7m2p9xw4a</div>
      <div className="flex min-h-16 items-center gap-3">
        <span className="flex-1">
          {t("wishlist")}
          <span className="label ml-3">{t("private")}</span>
        </span>
        <Switch on={false} />
      </div>
    </Frame>
  );
}

/* ---------- small visuals for the secondary promises ---------- */

export function PriceMini() {
  const { t, money } = useI18n();
  const w = demo.wish[3] ?? demo.wish[0];
  return (
    <div aria-hidden className="flex items-end gap-6">
      <div>
        <p className="label">{t("average")}</p>
        <p className="num mt-1.5 text-[34px] leading-none font-medium tracking-[-0.04em]">{money(w.avg)}</p>
      </div>
      <div>
        <p className="label">{t("lowest")}</p>
        <p className="num mt-1.5 text-[22px] leading-none tracking-[-0.04em] text-muted">{money(w.min)}</p>
      </div>
    </div>
  );
}

export function RarityMini() {
  const { t } = useI18n();
  const rows: [string, string][] = [
    ["bg-faint", t("rarity1")],
    ["bg-amber", t("rarity2")],
    ["bg-accent", t("rarity3")],
  ];
  return (
    <div aria-hidden className="flex flex-wrap gap-2">
      {rows.map(([dot, label]) => (
        <span key={label} className="inline-flex h-8 items-center gap-2 rounded-full border border-line px-3 text-[13px]">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

export function DashboardMini() {
  const max = demo.genres[0]?.count ?? 1;
  return (
    <div aria-hidden className="space-y-2">
      {demo.genres.slice(0, 4).map((g) => (
        <div key={g.name} className="grid grid-cols-[5.5rem_1fr_1.5rem] items-center gap-3 text-[12.5px]">
          <span className="truncate">{g.name}</span>
          <span className="h-1.5">
            <span className="block h-full rounded-r-[3px] bg-ink" style={{ width: `${(g.count / max) * 100}%` }} />
          </span>
          <span className="num text-right text-[11.5px] text-muted">{g.count}</span>
        </div>
      ))}
    </div>
  );
}
