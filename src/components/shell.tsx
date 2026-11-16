"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Settings2 } from "lucide-react";
import { AddRecord } from "./add";
import { Logo, Spinner } from "./bits";
import { Detail, type DetailTarget } from "./detail";
import { useLibrary } from "./library";
import { useI18n } from "@/lib/i18n";
import { morphOpen } from "@/lib/morph";
import type { Key } from "@/lib/dict";

interface Ui {
  openAdd: () => void;
  openDetail: (t: DetailTarget) => void;
}

const Ctx = createContext<Ui>({ openAdd: () => {}, openDetail: () => {} });
export const useUi = () => useContext(Ctx);

const TABS: [string, Key][] = [
  ["/collection", "collection"],
  ["/wishlist", "wishlist"],
  ["/dashboard", "dashboard"],
];

/**
 * Fades a screen in. The fade starts only after the screen has been painted
 * once (invisible): a heavy screen such as the cover grid would otherwise spend
 * the whole animation on its first paint and simply pop in.
 */
function PageFade({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setShown(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  return <div className={`transition-opacity duration-300 ease-out ${shown ? "opacity-100" : "opacity-0"}`}>{children}</div>;
}

export function Shell({ children }: { children: ReactNode }) {
  const { t, count } = useI18n();
  const path = usePathname();
  const { pending } = useLibrary();
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const [morphed, setMorphed] = useState(false);

  // The cover travels from its tile to the detail view, and back on close.
  const coverId = (t: DetailTarget | null) => (t && t.list && "id" in t.base ? t.base.id : null);
  const openDetail = useCallback((t: DetailTarget) => {
    setMorphed(morphOpen(coverId(t), () => setDetail(t)));
  }, []);

  const ui = useMemo<Ui>(() => ({ openAdd: () => setAdding(true), openDetail }), [openDetail]);
  const closeAdd = useCallback(() => setAdding(false), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  return (
    <Ctx.Provider value={ui}>
      <header className="sticky top-0 z-30 border-b border-line bg-bg">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-8 px-5 sm:px-8">
          <Link href="/" className="text-[17px]">
            <Logo />
          </Link>
          <nav className="hidden h-full items-center gap-6 sm:flex">
            {TABS.map(([href, key]) => (
              <Link
                key={href}
                href={href}
                className={`relative flex h-full items-center text-[14px] transition-colors ${path === href ? "text-ink" : "text-muted hover:text-ink"}`}
              >
                {t(key)}
                {path === href && <span className="absolute inset-x-0 -bottom-px h-px bg-ink" />}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {pending > 0 && (
              <span className="label mr-2 hidden items-center gap-2 md:inline-flex" title={t("pricing")}>
                <Spinner className="h-3 w-3" />
                {t("pricing")} · {count(pending)}
              </span>
            )}
            <button onClick={ui.openAdd} className="btn btn-primary h-9 pr-4 pl-3">
              <Plus size={16} />
              {t("add")}
            </button>
            <Link
              href="/settings"
              aria-label={t("settings")}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${path === "/settings" ? "border-ink" : "border-line hover:border-ink"}`}
            >
              <Settings2 size={16} />
            </Link>
          </div>
        </div>
        {/* Phones: the tabs sit on their own line under the logo. */}
        <nav className="flex h-11 items-stretch gap-6 border-t border-line px-5 sm:hidden">
          {TABS.map(([href, key]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
              className={`relative flex items-center text-[14px] whitespace-nowrap ${path === href ? "font-medium text-ink" : "text-muted"}`}
            >
              {t(key)}
              {path === href && <span className="absolute inset-x-0 -bottom-px h-px bg-ink" />}
            </Link>
          ))}
        </nav>
      </header>

      {/* --bar-top: where a screen pins its own toolbar, i.e. the header's height (two lines on phones). */}
      <main className="mx-auto max-w-[1500px] px-5 [--bar-top:100px] sm:px-8 sm:[--bar-top:3.5rem]">
        {/* Re-mounted per screen so each one fades in the same way. */}
        <PageFade key={path}>{children}</PageFade>
      </main>

      {adding && (
        <AddRecord
          hidden={!!detail}
          onClose={closeAdd}
          onPick={(hit) => openDetail({ base: hit })}
        />
      )}
      {detail && <Detail key={detail.base.key + ("id" in detail.base ? detail.base.id : "")} target={detail} onClose={closeDetail} morphed={morphed} />}
    </Ctx.Provider>
  );
}
