"use client";

import { useState, type ReactNode } from "react";
import { signOut } from "firebase/auth";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useAuth } from "@/components/auth";
import { Spinner, Toggle } from "@/components/bits";
import { useLibrary } from "@/components/library";
import * as discogs from "@/lib/discogs";
import { auth } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";
import { planCollectionImport, planWishlistImport } from "@/lib/merge";
import * as store from "@/lib/store";
import { useTheme } from "@/lib/theme";
import type { ListName } from "@/lib/types";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-x-12 gap-y-4 border-t border-line py-9 md:grid-cols-[14rem_1fr]">
      <div>
        <h2 className="font-medium">{title}</h2>
        {hint && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

type ImportState = { phase: "idle" } | { phase: "reading"; done: number; total: number } | { phase: "done"; added: number } | { phase: "error" };

export default function SettingsPage() {
  const { t, lang, setLang, count } = useI18n();
  const { user } = useAuth();
  const { uid, profile, link, collection, wishlist } = useLibrary();
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [imports, setImports] = useState<Record<ListName, ImportState>>({ collection: { phase: "idle" }, wishlist: { phase: "idle" } });
  const [copied, setCopied] = useState<ListName | null>(null);
  const [theme, setTheme] = useTheme();

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = token.trim();
    if (!value) return;
    setConnecting(true);
    setTokenError(false);
    try {
      const username = await discogs.identity(value);
      await store.saveDiscogs(uid, { token: value, username });
      setToken("");
    } catch {
      setTokenError(true);
    } finally {
      setConnecting(false);
    }
  };

  const runImport = async (list: ListName) => {
    if (!link) return;
    const set = (s: ImportState) => setImports((prev) => ({ ...prev, [list]: s }));
    const progress = (done: number, total: number) => set({ phase: "reading", done, total });
    set({ phase: "reading", done: 0, total: 0 });
    try {
      if (list === "collection") {
        const plan = planCollectionImport(collection, await discogs.fetchCollection(link.username, link.token, progress));
        await store.applyCollectionPlan(uid, plan);
        set({ phase: "done", added: plan.create.length });
      } else {
        const create = planWishlistImport(wishlist, await discogs.fetchWantlist(link.username, link.token, progress));
        await store.applyWishlistPlan(uid, create);
        set({ phase: "done", added: create.length });
      }
    } catch {
      set({ phase: "error" });
    }
  };

  const shareUrl = (list: ListName) =>
    profile ? `${window.location.origin}/u/${profile.shareId}${list === "wishlist" ? "?list=wishlist" : ""}` : "";

  const copy = async (list: ListName) => {
    await navigator.clipboard.writeText(shareUrl(list));
    setCopied(list);
    setTimeout(() => setCopied(null), 1600);
  };

  const importRow = (list: ListName, label: string) => {
    const s = imports[list];
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button className="btn btn-ghost" disabled={s.phase === "reading"} onClick={() => runImport(list)}>
          {s.phase === "reading" && <Spinner />}
          {label}
        </button>
        <span className="label" aria-live="polite">
          {s.phase === "reading" && s.total > 0 && `${t("importing")} ${count(s.done)} / ${count(s.total)}`}
          {s.phase === "done" && (s.added ? `+${count(s.added)} ${t("importDone")}` : t("importNothing"))}
          {s.phase === "error" && <span className="text-accent">{t("authError")}</span>}
        </span>
      </div>
    );
  };

  const shareRow = (list: ListName, label: string, on: boolean) => (
    <div className="flex min-h-14 items-center gap-4 border-b border-line py-3 first:border-t-0">
      <span className="flex-1">
        {label}
        <span className="label ml-3">{on ? t("public") : t("private")}</span>
      </span>
      {on && (
        <button className="btn btn-ghost h-9" onClick={() => copy(list)}>
          {copied === list ? <Check size={15} /> : <Copy size={15} />}
          {copied === list ? t("copied") : t("copyLink")}
        </button>
      )}
      <Toggle on={on} label={`${label} — ${t("public")}`} onChange={(v) => store.setVisibility(uid, list, v)} />
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <header className="pt-8 pb-8 sm:pt-12">
        <h1 className="text-[34px] leading-none font-semibold tracking-[-0.035em] sm:text-[44px]">{t("settings")}</h1>
      </header>

      <Section title={t("discogs")} hint={t("discogsHint")}>
        {link ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span>
                {t("connected")} <span className="font-medium">{link.username}</span>
              </span>
              <button className="label ml-auto hover:text-ink" onClick={() => store.saveDiscogs(uid, null)}>
                {t("disconnect")}
              </button>
            </div>
            <div className="space-y-3">
              {importRow("collection", t("importCollection"))}
              {importRow("wishlist", t("importWishlist"))}
              <p className="text-[13px] text-muted">{t("importHint")}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={connect} className="space-y-3">
            <div className="flex gap-2">
              <input
                className="field num"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t("tokenPlaceholder")}
                aria-label={t("tokenPlaceholder")}
              />
              <button className="btn btn-primary h-11" disabled={connecting || !token.trim()}>
                {connecting && <Spinner />}
                {t("connect")}
              </button>
            </div>
            {tokenError && <p className="text-[13px] text-accent">{t("invalidToken")}</p>}
            <a
              href="https://www.discogs.com/settings/developers"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[13px] text-muted underline underline-offset-4 hover:text-ink"
            >
              {t("getToken")}
              <ArrowUpRight size={13} />
            </a>
          </form>
        )}
      </Section>

      <Section title={t("sharing")}>
        {profile && (
          <div className="-mt-3">
            {shareRow("collection", t("collection"), profile.collectionPublic)}
            {shareRow("wishlist", t("wishlist"), profile.wishlistPublic)}
          </div>
        )}
      </Section>

      <Section title={t("appearance")}>
        <div className="inline-flex h-10 items-center rounded-full border border-line p-0.5">
          {(["system", "light", "dark"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTheme(m)}
              aria-pressed={theme === m}
              className={`h-full rounded-full px-4 text-[14px] transition-colors ${theme === m ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
            >
              {t(m === "system" ? "themeSystem" : m === "light" ? "themeLight" : "themeDark")}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("language")}>
        <div className="inline-flex h-10 items-center rounded-full border border-line p-0.5">
          {(["en", "fr"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`h-full rounded-full px-4 text-[14px] transition-colors ${lang === l ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
            >
              {l === "en" ? "English" : "Français"}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("account")}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="min-w-0 flex-1 truncate text-muted">{user?.email}</span>
          <button className="btn btn-ghost" onClick={() => signOut(auth)}>
            {t("signOut")}
          </button>
        </div>
      </Section>
    </div>
  );
}
