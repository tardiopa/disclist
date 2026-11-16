// Pure helpers that turn Discogs payloads into Disclist shapes.
import type { NewItem, SearchHit, Track, Edition } from "./types.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Discogs disambiguates homonyms with a numeric suffix: "Nirvana (2)". */
export function cleanName(name: string): string {
  return (name || "").replace(/\s\(\d+\)$/, "").replace(/\*$/, "").trim();
}

export function joinArtists(artists: any[] | undefined): string {
  if (!artists?.length) return "";
  let out = "";
  artists.forEach((a, i) => {
    out += cleanName(a.anv || a.name);
    if (i < artists.length - 1) {
      const j = (a.join || ",").trim();
      out += j === "," || j === "" ? ", " : ` ${j} `;
    }
  });
  return out.trim();
}

export function isVinyl(formats: any[] | undefined): boolean {
  return !!formats?.some((f) => f?.name === "Vinyl");
}

export function toYear(v: unknown): number | null {
  const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 1000 ? n : null;
}

export function albumKey(masterId: number | null | undefined, releaseId: number | null | undefined): string {
  return masterId ? `m${masterId}` : `r${releaseId}`;
}

const PLACEHOLDER = /spacer\.gif$/;
function img(url: unknown): string {
  return typeof url === "string" && !PLACEHOLDER.test(url) ? url : "";
}

/** A release's `basic_information` block (collection and wantlist share it). */
export function fromBasicInfo(b: any, addedAt: number): NewItem {
  const masterId = b.master_id || null;
  return {
    key: albumKey(masterId, b.id),
    masterId,
    releaseId: b.id,
    title: b.title || "",
    artist: joinArtists(b.artists),
    artistId: b.artists?.[0]?.id ?? null,
    year: toYear(b.year),
    cover: img(b.cover_image),
    thumb: img(b.thumb),
    genres: b.genres ?? [],
    styles: b.styles ?? [],
    stats: null,
    enriched: false,
    addedAt,
  };
}

/** Search results title is "Artist - Album". */
export function splitSearchTitle(title: string): { artist: string; title: string } {
  const i = title.indexOf(" - ");
  if (i < 0) return { artist: "", title };
  const artist = title
    .slice(0, i)
    .split(/\s*,\s*/)
    .map(cleanName)
    .join(", ");
  return { artist, title: title.slice(i + 3) };
}

export function fromSearchResult(r: any): SearchHit {
  const isMaster = r.type === "master";
  const masterId = isMaster ? r.id : r.master_id || null;
  const releaseId = isMaster ? null : r.id;
  const { artist, title } = splitSearchTitle(r.title || "");
  return {
    key: albumKey(masterId, releaseId),
    masterId,
    releaseId,
    title,
    artist,
    year: toYear(r.year),
    cover: img(r.cover_image),
    thumb: img(r.thumb),
    genres: r.genre ?? [],
    styles: r.style ?? [],
  };
}

export function toTracklist(list: any[] | undefined): Track[] {
  return (list ?? [])
    .filter((t) => t.type_ !== "index" || t.title)
    .map((t) => ({
      position: t.position || "",
      title: t.title || "",
      duration: t.duration || "",
      heading: t.type_ === "heading" || t.type_ === "index" || undefined,
    }));
}

export function toEdition(v: any): Edition {
  return {
    id: v.id,
    title: v.title || "",
    format: v.format || "",
    label: v.label || "",
    catno: v.catno || "",
    country: v.country || "",
    year: v.released ? String(v.released).slice(0, 4) : "",
    have: v.stats?.community?.in_collection ?? 0,
    thumb: img(v.thumb),
  };
}

/** Strip Discogs markup ([a=Name], [l123], [url=..]text[/url], [b]..[/b]). */
export function plainProfile(text: string): string {
  return (text || "")
    .replace(/\[url=[^\]]*\]([^[]*)\[\/url\]/gi, "$1")
    .replace(/\[(?:a|l|r|m)=([^\]]+)\]/gi, (_, n) => cleanName(n))
    .replace(/\[(?:a|l|r|m)\d+\]/gi, "")
    .replace(/\[\/?(?:b|i|u)\]/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
}
