"use client";

import { useState } from "react";
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

/** Five ticks; the more filled, the harder to find. */
export function Rarity({ stats, withLabel }: { stats: Stats | null; withLabel?: boolean }) {
  const { t } = useI18n();
  if (!stats || !stats.versions) return <span className="text-faint">—</span>;
  const level = rarity(stats.forSale);
  const label = t(rarityKey(stats));
  return (
    <span className="inline-flex items-center gap-2" title={label}>
      <span className="inline-flex gap-[3px]" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`h-3 w-[3px] rounded-full ${n <= level ? (level >= 4 ? "bg-accent" : "bg-ink") : "bg-line"}`} />
        ))}
      </span>
      {withLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
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
