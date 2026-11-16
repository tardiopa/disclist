"use client";

import { useMemo } from "react";
import { Thumb } from "@/components/bits";
import { useLibrary } from "@/components/library";
import { useUi } from "@/components/shell";
import { useI18n } from "@/lib/i18n";
import { summarize } from "@/lib/summary";

export default function DashboardPage() {
  const { t, money, count } = useI18n();
  const { collection, wishlist, loading } = useLibrary();
  const { openDetail } = useUi();
  const s = useMemo(() => summarize(collection, wishlist), [collection, wishlist]);
  if (loading) return null;

  const tiles: { label: string; value: string; note?: string }[] = [
    { label: t("inCollectionCount"), value: count(s.collectionCount) },
    { label: t("inWishlistCount"), value: count(s.wishlistCount) },
    {
      label: t("collectionValue"),
      value: s.collectionPriced ? money(s.collectionValue) : "—",
      note: s.collectionPriced < s.collectionCount ? `${count(s.collectionPriced)}/${count(s.collectionCount)} ${t("pricedOf")}` : undefined,
    },
    {
      label: t("wishlistCost"),
      value: s.wishlistPriced ? money(s.wishlistCost) : "—",
      note: s.wishlistPriced < s.wishlistCount ? `${count(s.wishlistPriced)}/${count(s.wishlistCount)} ${t("pricedOf")}` : undefined,
    },
  ];
  const decadeMax = Math.max(1, ...s.decades.map((d) => d.count));

  return (
    <div className="pb-24">
      <header className="pt-8 pb-6 sm:pt-12">
        <h1 className="text-[34px] leading-none font-semibold tracking-[-0.035em] sm:text-[44px]">{t("dashboard")}</h1>
        <p className="label mt-3">{t("estimate")}</p>
      </header>

      <dl className="grid grid-cols-2 border-t border-line lg:grid-cols-4">
        {tiles.map((tile, n) => (
          <div key={tile.label} className={`border-b border-line py-6 ${n % 2 ? "border-l pl-5" : ""} ${n ? "lg:border-l lg:pl-6" : ""}`}>
            <dt className="label">{tile.label}</dt>
            <dd className="num mt-3 text-[32px] leading-none font-medium tracking-[-0.04em] sm:text-[44px]">{tile.value}</dd>
            {tile.note && <p className="label mt-3 normal-case tracking-normal">{tile.note}</p>}
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-x-16 gap-y-14 pt-12 lg:grid-cols-2">
        {s.top.length > 0 && (
          <section className="min-w-0 lg:col-span-2">
            <h2 className="label">{t("mostValuable")}</h2>
            <ol className="mt-4 border-t border-line">
              {s.top.map((item, n) => (
                <li key={item.id} className="border-b border-line">
                  <button
                    onClick={() => openDetail({ base: item, list: "collection" })}
                    className="flex w-full items-center gap-4 py-3.5 text-left transition-colors hover:bg-surface sm:gap-5"
                  >
                    <span className="num w-5 text-[13px] text-faint">{n + 1}</span>
                    <Thumb src={item.cover || item.thumb} alt="" size={n === 0 ? 72 : 56} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-medium tracking-tight ${n === 0 ? "text-xl sm:text-2xl" : "text-[17px]"}`}>{item.title}</span>
                      <span className="block truncate text-muted">
                        {item.artist}
                        {item.year ? ` · ${item.year}` : ""}
                      </span>
                    </span>
                    <span className={`num font-medium tracking-[-0.04em] ${n === 0 ? "text-2xl sm:text-[32px]" : "text-xl"}`}>{money(item.stats?.avg)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}

        {(
          [
            [t("topGenres"), s.genres],
            [t("topArtists"), s.artists],
          ] as const
        ).map(
          ([heading, rows]) =>
            rows.length > 0 && (
              <section key={heading} className="min-w-0">
                <h2 className="label">{heading}</h2>
                <ul className="mt-5 space-y-3.5">
                  {rows.map((g) => (
                    <li key={g.name} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_2rem] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_2.5rem] sm:gap-4" title={`${g.name}: ${g.count}`}>
                      <span className="truncate text-[14px]">{g.name}</span>
                      <span className="h-2">
                        <span className="block h-full min-w-1 rounded-r-[4px] bg-ink" style={{ width: `${(g.count / rows[0].count) * 100}%` }} />
                      </span>
                      <span className="num text-right text-[13px] text-muted">{count(g.count)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )}

        {s.decades.length > 0 && (
          <section className="min-w-0 lg:col-span-2">
            <h2 className="label">{t("decades")}</h2>
            <ol className="mt-5 flex h-56 items-stretch gap-[6px] border-b border-line">
              {s.decades.map((d) => (
                <li key={d.decade} className="group relative flex min-w-0 flex-1 flex-col justify-end" title={`${d.decade}s: ${d.count}`}>
                  <span className="num mb-1.5 text-center text-[12px] text-muted">{d.count ? count(d.count) : ""}</span>
                  <span
                    className="mx-auto block w-full max-w-14 rounded-t-[4px] bg-ink transition-opacity group-hover:opacity-70"
                    style={{ height: `${(d.count / decadeMax) * 82}%`, minHeight: d.count ? 2 : 0 }}
                  />
                </li>
              ))}
            </ol>
            <ol className="mt-2 flex gap-[6px]">
              {s.decades.map((d) => (
                <li key={d.decade} className="num min-w-0 flex-1 text-center text-[11px] text-muted">
                  {s.decades.length > 8 ? `${String(d.decade).slice(2)}s` : `${d.decade}s`}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
