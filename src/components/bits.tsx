"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { rarity } from "@/lib/stats";
import { useI18n } from "@/lib/i18n";
import type { Key } from "@/lib/dict";
import type { Stats } from "@/lib/types";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 20 20" className="h-[1.05em] w-[1.05em]" aria-hidden>
        <circle cx="10" cy="10" r="10" fill="currentColor" />
        <circle cx="10" cy="10" r="3.6" fill="var(--accent)" />
        <circle cx="10" cy="10" r="0.9" fill="var(--bg)" />
      </svg>
      Disclist
    </span>
  );
}

/** Square artwork with a quiet fallback when Discogs has no image. */
export function Art({ src, alt, eager }: { src: string; alt: string; eager?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-line" role="img" aria-label={alt}>
        <svg viewBox="0 0 20 20" className="w-1/4 text-faint" aria-hidden>
          <circle cx="10" cy="10" r="9.5" fill="none" stroke="currentColor" />
          <circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}

export function Sleeve({ src, alt, out, eager }: { src: string; alt: string; out?: boolean; eager?: boolean }) {
  return (
    <div className="sleeve">
      <div className={`wax ${out ? "wax-out" : ""}`} />
      <div className="sleeve-art">
        <Art src={src} alt={alt} eager={eager} />
      </div>
    </div>
  );
}

export function Thumb({ src, alt, size = 44 }: { src: string; alt: string; size?: number }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-[2px] bg-line [&_img]:h-full [&_img]:w-full [&_img]:object-cover" style={{ width: size, height: size }}>
      <Art src={src} alt={alt} />
    </div>
  );
}

export function rarityKey(stats: Stats): Key {
  return `rarity${rarity(stats.forSale)}` as Key;
}

const RARITY_DOT = ["", "bg-faint", "bg-amber", "bg-accent"];

/** Plain word plus a colour cue: grey = common, amber = rare, red = very rare. */
export function Rarity({ stats }: { stats: Stats | null }) {
  const { t } = useI18n();
  if (!stats || !stats.versions) return <span className="text-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className={`h-2 w-2 shrink-0 rounded-full ${RARITY_DOT[rarity(stats.forSale)]}`} aria-hidden />
      {t(rarityKey(stats))}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`spin h-4 w-4 ${className}`} aria-hidden>
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
      <path d="M10 1.5a8.5 8.5 0 0 1 8.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-ink" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-bg transition-transform ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}

/** Blocking confirmation for destructive actions. */
export function Confirm({
  title,
  text,
  action,
  onConfirm,
  onCancel,
}: {
  title: string;
  text?: ReactNode;
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" role="alertdialog" aria-modal aria-label={title}>
      <div className="anim-fade absolute inset-0 bg-scrim backdrop-blur-[2px]" onClick={onCancel} />
      <div className="anim-rise relative w-full max-w-sm rounded-xl border border-line bg-raised p-6 shadow-2xl">
        <h2 className="text-lg font-medium tracking-tight">{title}</h2>
        {text && <p className="mt-1.5 text-muted">{text}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancel} className="btn btn-ghost" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button className="btn bg-accent text-white hover:opacity-90" onClick={onConfirm}>
            {action}
          </button>
        </div>
      </div>
    </div>
  );
}
