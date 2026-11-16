"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth";
import { Logo } from "@/components/bits";
import { CollectionShot, DashboardShot, DiscogsShot, WishlistShot } from "@/components/landing-shots";
import { useI18n } from "@/lib/i18n";

/** Fades its content up the first time it scrolls into view. */
function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      // Start as soon as the top of the block has entered the screen: on a
      // phone a tall block would otherwise leave a blank area for a long time.
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${shown ? "in" : ""} ${className}`}>
      {children}
    </div>
  );
}

export default function Landing() {
  const { t, lang, setLang } = useI18n();
  const { user, ready, likely } = useAuth();
  // Until Firebase has answered, trust what the last visit left behind.
  const signedIn = ready ? !!user : likely;

  // Same page signed in or out; only the calls to action change.
  const cta = signedIn ? { href: "/collection", label: t("openApp") } : { href: "/login?mode=signup", label: t("start") };
  const top = signedIn ? { href: "/collection", label: t("openApp") } : { href: "/login", label: t("signIn") };

  const promises: { title: string; text: string; shot: ReactNode }[] = [
    { title: t("v2Title"), text: t("v2Text"), shot: <WishlistShot /> },
    { title: t("v1Title"), text: t("v1Text"), shot: <DiscogsShot /> },
    { title: t("s3Title"), text: t("s3Text"), shot: <DashboardShot /> },
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
          <Link href={top.href} className="btn btn-ghost h-9">
            {top.label}
          </Link>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-[1300px] px-5 sm:px-8">

      <section className="pt-14 pb-14 sm:pt-24 sm:pb-20">
        <h1 className="text-[44px] leading-[0.98] font-semibold tracking-[-0.045em] text-balance sm:text-[76px] sm:whitespace-pre-line lg:text-[92px]">
          {t("heroTitle")}
        </h1>
        <p className="mt-7 max-w-md text-lg text-muted sm:text-xl">{t("heroSub")}</p>
        <Link href={cta.href} className="btn btn-primary mt-9 h-12 px-6 text-[15px]">
          {cta.label}
          <ArrowRight size={17} />
        </Link>
      </section>

      <Reveal>
        <CollectionShot />
      </Reveal>

      <section className="mt-20 space-y-16 sm:mt-36 sm:space-y-32">
        {promises.map((p, n) => (
          <Reveal key={p.title} className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-20">
            <div className={`min-w-0 ${n % 2 ? "md:order-2" : ""}`}>
              <p className="label">0{n + 1}</p>
              <h2 className="mt-4 max-w-[14ch] text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-[44px]">{p.title}</h2>
              <p className="mt-4 max-w-md text-lg text-muted">{p.text}</p>
            </div>
            <div className={`min-w-0 ${n % 2 ? "md:order-1" : ""}`}>{p.shot}</div>
          </Reveal>
        ))}
      </section>

      <section className="mt-24 border-t border-line py-24 text-center sm:mt-36 sm:py-36">
        <Reveal>
          <h2 className="mx-auto max-w-[14ch] text-[40px] leading-none font-semibold tracking-[-0.04em] text-balance sm:text-[68px]">{t("ctaTitle")}</h2>
          <Link href={cta.href} className="btn btn-primary mt-10 h-12 px-6 text-[15px]">
            {cta.label}
            <ArrowRight size={17} />
          </Link>
        </Reveal>
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
