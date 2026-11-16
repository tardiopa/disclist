"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { dicts, type Key, type Lang } from "./dict";

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  money: (n: number | null | undefined) => string;
  count: (n: number) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, set] = useState<Lang>(initial);

  const setLang = useCallback((l: Lang) => {
    set(l);
    document.cookie = `lang=${l};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.lang = l;
  }, []);

  const value = useMemo<I18n>(() => {
    const locale = lang === "fr" ? "fr-FR" : "en-GB";
    const cur = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
    const num = new Intl.NumberFormat(locale);
    return {
      lang,
      setLang,
      t: (k) => dicts[lang][k],
      money: (n) => (n == null ? "—" : cur.format(n)),
      count: (n) => num.format(n),
    };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("I18nProvider missing");
  return v;
}
