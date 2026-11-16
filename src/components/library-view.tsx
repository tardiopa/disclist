"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, ArrowUpRight, ChevronDown, LayoutGrid, Rows3, Search, X } from "lucide-react";
import { Rarity, Sleeve, Thumb } from "./bits";
import { marketUrl } from "@/lib/discogs";
import { useI18n } from "@/lib/i18n";
import { applyFilters, decadesOf, genresOf, type Filters, type Sort } from "@/lib/view";
import type { Item, ListName } from "@/lib/types";

interface Props {
  list: ListName;
  items: Item[];
  title: string;
  onOpen: (item: Item) => void;
  /** Owner-only row action on the wishlist. */
  onRemove?: (item: Item) => void;
  empty?: ReactNode;
  actions?: ReactNode;
}

/** Filter pill: every filter has the same width so the bar reads as one row of controls. */
function Filter({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: ReactNode }) {
  return (
    <label
      className={`relative flex h-9 min-w-0 flex-1 items-center rounded-full border text-[13px] transition-colors sm:w-36 sm:flex-none ${value ? "border-ink" : "border-line hover:border-faint"}`}
    >
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full w-full cursor-pointer appearance-none truncate rounded-full bg-transparent pr-8 pl-3.5 outline-none"
      >
        {children}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-3 text-muted" />
    </label>
  );
}

export function LibraryView({ list, items, title, onOpen, onRemove, empty, actions }: Props) {
  const { t, money, count } = useI18n();
  const isWishlist = list === "wishlist";
  const [filters, setFilters] = useState<Filters>({ q: "", genre: "", decade: "", rarity: "", sort: "recent" });
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (!isWishlist && localStorage.getItem("view") === "list") setView("list");
  }, [isWishlist]);

  const pickView = (v: "grid" | "list") => {
    setView(v);
    localStorage.setItem("view", v);
  };

  const genres = useMemo(() => genresOf(items), [items]);
  const decades = useMemo(() => decadesOf(items), [items]);
  const shown = useMemo(() => applyFilters(items, filters), [items, filters]);
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const filtered = !!(filters.q || filters.genre || filters.decade || filters.rarity);
  const asList = isWishlist || view === "list";

  const sorts: [Sort, string][] = [
    ["recent", t("sortRecent")],
    ["artist", t("sortArtist")],
    ["title", t("sortTitle")],
    ["yearDesc", t("sortYearDesc")],
    ["yearAsc", t("sortYearAsc")],
    ...(isWishlist ? ([["priceDesc", t("sortPriceDesc")], ["priceAsc", t("sortPriceAsc")]] as [Sort, string][]) : []),
  ];

  return (
    <div>
      <header className="flex items-end justify-between gap-4 pt-8 pb-6 sm:pt-12">
        <div>
          <h1 className="text-[34px] leading-none font-semibold tracking-[-0.035em] sm:text-[44px]">{title}</h1>
          <p className="label mt-3">
            {filtered ? `${count(shown.length)} / ` : ""}
            {count(items.length)} {items.length === 1 ? t("record") : t("records")}
          </p>
        </div>
        {actions}
      </header>

      {items.length > 0 && (
        <div className="sticky top-14 z-20 -mx-5 flex flex-wrap items-center gap-2 border-y border-line bg-bg px-5 py-2.5 sm:-mx-8 sm:px-8">
          <label className="flex h-9 basis-full items-center gap-2 rounded-full border border-line pr-1 pl-3.5 transition-colors focus-within:border-ink sm:mr-auto sm:max-w-xs sm:flex-1 sm:basis-auto">
            <Search size={15} className="shrink-0 text-muted" />
            <input
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder={t("search")}
              aria-label={t("search")}
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] placeholder:text-faint"
            />
            {filters.q && (
              <button
                onClick={() => set({ q: "" })}
                aria-label={t("clear")}
                title={t("clear")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </label>

          {genres.length > 1 && (
            <Filter value={filters.genre} onChange={(genre) => set({ genre })} label={t("genre")}>
              <option value="">{t("genre")}</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Filter>
          )}
          {decades.length > 1 && (
            <Filter value={filters.decade} onChange={(decade) => set({ decade })} label={t("decade")}>
              <option value="">{t("decade")}</option>
              {decades.map((d) => (
                <option key={d} value={d}>
                  {d}s
                </option>
              ))}
            </Filter>
          )}
          {isWishlist && (
            <Filter value={filters.rarity} onChange={(rarity) => set({ rarity })} label={t("rarity")}>
              <option value="">{t("rarity")}</option>
              <option value="1">{t("rarity1")}</option>
              <option value="2">{t("rarity2")}</option>
              <option value="3">{t("rarity3")}</option>
            </Filter>
          )}

          {/* Sorting is not a filter: set apart, labelled, and styled differently. */}
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <label className="relative flex h-9 items-center gap-1.5 text-[13px] text-muted hover:text-ink">
            <ArrowUpDown size={14} className="shrink-0" />
            <span className="hidden lg:inline">{t("sort")}</span>
            <span className="text-ink">{sorts.find(([v]) => v === filters.sort)?.[1]}</span>
            <ChevronDown size={13} />
            <select
              aria-label={t("sort")}
              value={filters.sort}
              onChange={(e) => set({ sort: e.target.value as Sort })}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {sorts.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          {!isWishlist && (
            <div className="ml-auto flex h-9 items-center rounded-full border border-line p-0.5 sm:ml-2">
              {(["grid", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => pickView(v)}
                  aria-label={t(v)}
                  title={t(v)}
                  aria-pressed={view === v}
                  className={`flex h-full w-9 items-center justify-center rounded-full transition-colors ${view === v ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
                >
                  {v === "grid" ? <LayoutGrid size={15} /> : <Rows3 size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        empty
      ) : shown.length === 0 ? (
        <p className="py-24 text-center text-muted">{t("emptySearch")}</p>
      ) : asList ? (
        <ul className="pb-24">
          <li className="label hidden items-center gap-4 border-b border-line py-3 md:flex">
            <span className="w-11" />
            <span className="min-w-0 flex-1">{t("album")}</span>
            {isWishlist ? (
              <>
                <span className="hidden w-36 lg:block">{t("genre")}</span>
                <span className="w-12 text-right">{t("year")}</span>
                <span className="w-20 text-right">{t("average")}</span>
                <span className="w-20 text-right">{t("lowest")}</span>
                <span className="w-20 text-right">{t("forSale")}</span>
                <span className="w-24 pl-2">{t("rarity")}</span>
                <span className="w-[4.5rem]" />
              </>
            ) : (
              <>
                <span className="w-56">{t("genre")}</span>
                <span className="w-14 text-right">{t("year")}</span>
              </>
            )}
          </li>
          {shown.map((i) => (
            <li key={i.id} className="group relative flex items-center gap-4 border-b border-line py-2.5 transition-colors hover:bg-surface">
              <button onClick={() => onOpen(i)} className="absolute inset-0" aria-label={`${i.title} — ${i.artist}`} />
              <Thumb src={i.thumb || i.cover} alt="" coverId={i.id} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{i.title}</span>
                <span className="block truncate text-[13px] text-muted">
                  {i.artist}
                  <span className="md:hidden">{i.year ? ` · ${i.year}` : ""}</span>
                </span>
              </span>
              {isWishlist ? (
                <>
                  <span className="hidden w-36 truncate text-[13px] text-muted lg:block">{i.genres.slice(0, 2).join(", ")}</span>
                  <span className="num hidden w-12 text-right text-[13px] text-muted md:block">{i.year ?? "—"}</span>
                  <span className="num w-16 text-right text-[13px] md:w-20">{money(i.stats?.avg)}</span>
                  <span className="num hidden w-20 text-right text-[13px] text-muted md:block">{money(i.stats?.min)}</span>
                  <span className="num hidden w-20 text-right text-[13px] text-muted md:block">{i.stats?.versions ? count(i.stats.forSale) : "—"}</span>
                  <span className="hidden w-24 pl-2 text-[13px] md:block">
                    <Rarity stats={i.stats} />
                  </span>
                  <span className="relative hidden w-[4.5rem] items-center justify-end gap-1 md:flex">
                    <a
                      href={marketUrl(i)}
                      target="_blank"
                      rel="noreferrer"
                      title={t("buy")}
                      aria-label={t("buy")}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink"
                    >
                      <ArrowUpRight size={16} />
                    </a>
                    {onRemove && (
                      <button onClick={() => onRemove(i)} title={t("remove")} aria-label={t("remove")} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-line hover:text-accent">
                        <X size={16} />
                      </button>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="hidden w-56 truncate text-[13px] text-muted md:block">{i.genres.slice(0, 2).join(", ")}</span>
                  <span className="num hidden w-14 text-right text-[13px] text-muted md:block">{i.year ?? "—"}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-9 pt-8 pb-24 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-10 lg:gap-y-12 2xl:grid-cols-5">
          {shown.map((i, n) => (
            <li key={i.id} className="min-w-0">
              <button onClick={() => onOpen(i)} className="tile block w-full text-left">
                <Sleeve src={i.cover || i.thumb} alt="" eager={n < 12} coverId={i.id} />
                <span className="mt-3 block truncate text-[14px] leading-tight font-medium lg:mt-4 lg:text-[15.5px]">{i.title}</span>
                <span className="mt-0.5 flex items-baseline gap-2 text-[13px] text-muted lg:mt-1 lg:text-[14px]">
                  <span className="min-w-0 flex-1 truncate">{i.artist}</span>
                  {i.year && <span className="num text-[11.5px] text-faint">{i.year}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
