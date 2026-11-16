"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Search, X } from "lucide-react";
import { Spinner, Thumb } from "./bits";
import { useLibrary } from "./library";
import * as discogs from "@/lib/discogs";
import { useI18n } from "@/lib/i18n";
import type { SearchHit } from "@/lib/types";

/** Discogs search, one row per album on vinyl. Picking a row opens its detail. */
export function AddRecord({ onClose, onPick, hidden }: { onClose: () => void; onPick: (hit: SearchHit) => void; hidden?: boolean }) {
  const { t } = useI18n();
  const { link, collection, wishlist } = useLibrary();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const token = link?.token;

  useEffect(() => {
    if (hidden) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hidden, onClose]);

  useEffect(() => {
    const term = q.trim();
    if (!token || term.length < 2) {
      setHits(null);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await discogs.search(term, token, ctrl.signal);
        setHits(res);
        setCursor(0);
        setSearching(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setHits([]);
          setSearching(false);
        }
      }
    }, 280);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, token]);

  const owned = new Set(collection.map((i) => i.key));
  const wished = new Set(wishlist.map((i) => i.key));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!hits?.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onPick(hits[cursor]);
    }
  };

  return (
    <div className={`fixed inset-0 z-40 ${hidden ? "invisible" : ""}`} role="dialog" aria-modal aria-label={t("add")}>
      <div className="anim-fade absolute inset-0 bg-scrim backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-drop relative mx-auto mt-0 flex max-h-dvh w-full max-w-xl flex-col overflow-hidden bg-raised shadow-2xl sm:mt-[12vh] sm:max-h-[70vh] sm:rounded-xl sm:border sm:border-line">
        {token ? (
          <>
            <div className="flex items-center gap-3 border-b border-line px-4">
              {searching ? <Spinner className="text-muted" /> : <Search size={17} className="shrink-0 text-muted" />}
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t("searchDiscogs")}
                aria-label={t("searchDiscogs")}
                autoComplete="off"
                spellCheck={false}
                className="h-14 min-w-0 flex-1 bg-transparent text-[17px] placeholder:text-faint"
              />
              <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
              {hits === null ? (
                <p className="px-4 py-10 text-center text-[14px] text-muted">{t("typeToSearch")}</p>
              ) : hits.length === 0 ? (
                <p className="px-4 py-10 text-center text-[14px] text-muted">{t("noResults")}</p>
              ) : (
                <ul className="py-1.5">
                  {hits.map((h, n) => (
                    <li key={h.key}>
                      <button
                        onClick={() => onPick(h)}
                        onMouseEnter={() => setCursor(n)}
                        className={`flex w-full items-center gap-3.5 px-4 py-2 text-left ${n === cursor ? "bg-bg" : ""}`}
                      >
                        <Thumb src={h.thumb || h.cover} alt="" size={48} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{h.title}</span>
                          <span className="block truncate text-[13px] text-muted">{h.artist}</span>
                        </span>
                        {owned.has(h.key) ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11.5px] font-medium text-bg">
                            <Check size={12} />
                            {t("collection")}
                          </span>
                        ) : (
                          wished.has(h.key) && (
                            <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11.5px] text-muted">{t("wishlist")}</span>
                          )
                        )}
                        <span className="num w-10 shrink-0 text-right text-[12px] text-faint">{h.year ?? ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-5 px-8 py-14 text-center">
            <p className="max-w-xs text-muted">{t("connectToSearch")}</p>
            <Link href="/settings" onClick={onClose} className="btn btn-primary">
              {t("connect")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
