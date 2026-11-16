"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/bits";
import { Detail, type DetailTarget } from "@/components/detail";
import { LibraryView } from "@/components/library-view";
import { useI18n } from "@/lib/i18n";
import { loadShared, type Shared } from "@/lib/store";
import type { ListName } from "@/lib/types";

export default function SharedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const [data, setData] = useState<Shared | null | undefined>(undefined);
  const [list, setList] = useState<ListName>("collection");
  const [detail, setDetail] = useState<DetailTarget | null>(null);

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("list") === "wishlist" ? "wishlist" : "collection";
    loadShared(id)
      .then((d) => {
        setData(d);
        if (d) setList(d[wanted] ? wanted : d.collection ? "collection" : "wishlist");
      })
      .catch(() => setData(null));
  }, [id]);

  const items = data?.[list];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-[17px]">
            <Logo />
          </Link>
          <Link href="/" className="btn btn-ghost h-9">
            {t("makeYours")}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-5 sm:px-8">
        {data === undefined ? null : !data || !items ? (
          <p className="py-40 text-center text-lg text-muted">{t("notShared")}</p>
        ) : (
          <LibraryView
            key={list}
            list={list}
            title={data.profile.name || t(list)}
            items={items}
            onOpen={(item) => setDetail({ base: item, list })}
            empty={<p className="border-t border-line py-28 text-center text-lg text-muted">{t(list === "collection" ? "emptyCollection" : "emptyWishlist")}</p>}
            actions={
              data.collection && data.wishlist ? (
                <div className="flex h-9 items-center rounded-full border border-line p-0.5">
                  {(["collection", "wishlist"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setList(l)}
                      aria-pressed={list === l}
                      className={`h-full rounded-full px-3.5 text-[13px] transition-colors ${list === l ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
                    >
                      {t(l)}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="label pb-1">{t(list)}</span>
              )
            }
          />
        )}
      </main>
      {detail && <Detail key={detail.base.key} target={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
