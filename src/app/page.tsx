"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth";
import { Logo } from "@/components/bits";
import { DemoShelf } from "@/components/demo-sleeves";
import { useI18n } from "@/lib/i18n";

export default function Landing() {
  const { t, lang, setLang } = useI18n();
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace("/collection");
  }, [ready, user, router]);

  if (!ready || user) return null;

  const features = [
    [t("f1Title"), t("f1Text")],
    [t("f2Title"), t("f2Text")],
    [t("f3Title"), t("f3Text")],
  ];

  return (
    <div className="mx-auto max-w-[1300px] px-5 sm:px-8">
      <header className="flex h-16 items-center justify-between">
        <span className="text-[19px]">
          <Logo />
        </span>
        <div className="flex items-center gap-5">
          <button className="label hover:text-ink" onClick={() => setLang(lang === "en" ? "fr" : "en")}>
            {lang === "en" ? "FR" : "EN"}
          </button>
          <Link href="/login" className="btn btn-ghost h-9">
            {t("signIn")}
          </Link>
        </div>
      </header>

      <section className="pt-16 pb-16 sm:pt-28 sm:pb-24">
        <h1 className="max-w-[15ch] text-[44px] leading-[0.98] font-semibold tracking-[-0.045em] text-balance sm:text-[76px] lg:text-[92px]">
          {t("heroTitle")}
        </h1>
        <p className="mt-7 max-w-md text-lg text-muted sm:text-xl">{t("heroSub")}</p>
        <Link href="/login?new" className="btn btn-primary mt-9 h-12 px-6 text-[15px]">
          {t("start")}
          <ArrowRight size={17} />
        </Link>
      </section>

      <DemoShelf />

      <section className="mt-20 grid border-t border-line sm:mt-28 md:grid-cols-3">
        {features.map(([title, text], n) => (
          <div key={title} className={`border-b border-line py-8 md:border-b-0 md:py-10 ${n ? "md:border-l md:pl-8" : ""} md:pr-8`}>
            <p className="label">0{n + 1}</p>
            <h2 className="mt-4 text-xl font-medium tracking-tight">{title}</h2>
            <p className="mt-2 text-muted">{text}</p>
          </div>
        ))}
      </section>

      <footer className="label flex items-center justify-between border-t border-line py-8">
        <span>Disclist</span>
        <span>{t("poweredBy")}</span>
      </footer>
    </div>
  );
}
