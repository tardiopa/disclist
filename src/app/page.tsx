"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth";
import { Logo } from "@/components/bits";
import { CollectionShot, DashboardMini, DiscogsShot, PriceMini, RarityMini, ShareShot, WishlistShot } from "@/components/landing-shots";
import { useI18n } from "@/lib/i18n";

export default function Landing() {
  const { t, lang, setLang } = useI18n();
  const { user, ready } = useAuth();

  // Same page signed in or out; only the calls to action change.
  const cta = user ? { href: "/collection", label: t("openApp") } : { href: "/login?mode=signup", label: t("start") };
  const top = user ? { href: "/collection", label: t("openApp") } : { href: "/login", label: t("signIn") };

  const promises: { title: string; text: string; shot: ReactNode }[] = [
    { title: t("v1Title"), text: t("v1Text"), shot: <DiscogsShot /> },
    { title: t("v2Title"), text: t("v2Text"), shot: <WishlistShot /> },
    { title: t("v3Title"), text: t("v3Text"), shot: <ShareShot /> },
  ];
  const extras: { title: string; text: string; visual: ReactNode }[] = [
    { title: t("s1Title"), text: t("s1Text"), visual: <PriceMini /> },
    { title: t("s2Title"), text: t("s2Text"), visual: <RarityMini /> },
    { title: t("s3Title"), text: t("s3Text"), visual: <DashboardMini /> },
  ];

  return (
    <>
    {/* Always in view, so signing in is one click away from anywhere on the page. */}
    <header className="sticky top-0 z-30 bg-bg">
      <div className="mx-auto flex h-16 max-w-[1300px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="text-[19px]">
          <Logo />
        </Link>
        <div className="flex items-center gap-5">
          <button className="label hover:text-ink" onClick={() => setLang(lang === "en" ? "fr" : "en")}>
            {lang === "en" ? "FR" : "EN"}
          </button>
          <Link href={top.href} className={`btn btn-ghost h-9 ${ready ? "" : "invisible"}`}>
            {top.label}
          </Link>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-[1300px] px-5 sm:px-8">

      <section className="pt-14 pb-14 sm:pt-24 sm:pb-20">
        <h1 className="text-[44px] leading-[0.98] font-semibold tracking-[-0.045em] whitespace-pre-line sm:text-[76px] lg:text-[92px]">
          {t("heroTitle")}
        </h1>
        <p className="mt-7 max-w-md text-lg text-muted sm:text-xl">{t("heroSub")}</p>
        <Link href={cta.href} className={`btn btn-primary mt-9 h-12 px-6 text-[15px] ${ready ? "" : "invisible"}`}>
          {cta.label}
          <ArrowRight size={17} />
        </Link>
      </section>

      <CollectionShot />

      <section className="mt-24 space-y-20 sm:mt-36 sm:space-y-32">
        {promises.map((p, n) => (
          <div key={p.title} className="grid items-center gap-10 md:grid-cols-2 md:gap-20">
            <div className={n % 2 ? "md:order-2" : ""}>
              <p className="label">0{n + 1}</p>
              <h2 className="mt-4 max-w-[14ch] text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-[44px]">{p.title}</h2>
              <p className="mt-4 max-w-md text-lg text-muted">{p.text}</p>
            </div>
            <div className={n % 2 ? "md:order-1" : ""}>{p.shot}</div>
          </div>
        ))}
      </section>

      <section className="mt-24 grid border-t border-line sm:mt-36 md:grid-cols-3">
        {extras.map((e, n) => (
          <div key={e.title} className={`flex flex-col border-b border-line py-9 md:border-b-0 md:py-11 ${n ? "md:border-l md:pl-8" : ""} md:pr-8`}>
            <div className="flex h-20 items-end">{e.visual}</div>
            <h3 className="mt-7 text-xl font-medium tracking-tight">{e.title}</h3>
            <p className="mt-2 text-muted">{e.text}</p>
          </div>
        ))}
      </section>

      <section className="border-t border-line py-24 text-center sm:py-36">
        <h2 className="mx-auto max-w-[14ch] text-[40px] leading-none font-semibold tracking-[-0.04em] text-balance sm:text-[68px]">{t("ctaTitle")}</h2>
        <Link href={cta.href} className={`btn btn-primary mt-10 h-12 px-6 text-[15px] ${ready ? "" : "invisible"}`}>
          {cta.label}
          <ArrowRight size={17} />
        </Link>
      </section>

      <footer className="label flex items-center justify-between border-t border-line py-8">
        <span>Disclist</span>
        <span>
          {t("poweredBy")}{" "}
          <a href="https://www.linkedin.com/in/patrice-tardio-57101198" target="_blank" rel="noreferrer" className="text-ink underline-offset-4 hover:underline">
            Patrice Tardio
          </a>
        </span>
      </footer>
    </div>
    </>
  );
}
