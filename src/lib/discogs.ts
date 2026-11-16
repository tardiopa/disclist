// Read-only Discogs client. Every call is a GET: nothing is ever written back.
// Requests run on the user's own token and are paced to stay inside Discogs'
// 60 requests / minute window, with interactive calls jumping the queue.
import {
  albumKey,
  fromBasicInfo,
  fromSearchResult,
  isVinyl,
  joinArtists,
  plainProfile,
  toEdition,
  toTracklist,
  toYear,
} from "./normalize.ts";
import { aggregate, pickSample, type Market } from "./stats.ts";
import type { AlbumDetail, ArtistInfo, Edition, NewItem, SearchHit, Stats } from "./types.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Priority = "high" | "low";

export class DiscogsError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 54;
/** Background work leaves headroom so search and detail views stay snappy. */
const MAX_LOW_PER_WINDOW = 44;
const MAX_CONCURRENT = 3;

interface Job {
  path: string;
  token: string;
  priority: Priority;
  signal?: AbortSignal;
  resolve: (v: any) => void;
  reject: (e: unknown) => void;
  tries: number;
}

const queue: Job[] = [];
const stamps: number[] = [];
let running = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let pausedUntil = 0;
let useProxy = false;

function schedule(delay: number) {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    pump();
  }, delay);
}

function pump() {
  const now = Date.now();
  while (stamps.length && now - stamps[0] > WINDOW_MS) stamps.shift();
  if (now < pausedUntil) return schedule(pausedUntil - now);

  while (running < MAX_CONCURRENT && queue.length) {
    let idx = queue.findIndex((j) => j.priority === "high");
    const cap = idx >= 0 ? MAX_PER_WINDOW : MAX_LOW_PER_WINDOW;
    if (idx < 0) idx = 0;
    if (stamps.length >= cap) {
      const free = stamps[stamps.length - cap] + WINDOW_MS - now;
      return schedule(Math.max(free, 250));
    }
    const [job] = queue.splice(idx, 1);
    if (job.signal?.aborted) {
      job.reject(new DOMException("Aborted", "AbortError"));
      continue;
    }
    stamps.push(Date.now());
    running++;
    run(job).finally(() => {
      running--;
      pump();
    });
  }
}

async function send(job: Job): Promise<Response> {
  if (!useProxy) {
    try {
      return await fetch(`https://api.discogs.com${job.path}`, {
        headers: { Authorization: `Discogs token=${job.token}` },
        signal: job.signal,
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      // Blocked cross-origin (CORS, extension, network policy): go through our own relay.
      useProxy = true;
    }
  }
  return fetch(`/api/discogs${job.path}`, {
    headers: { "x-discogs-token": job.token },
    signal: job.signal,
  });
}

async function run(job: Job) {
  try {
    const res = await send(job);
    if (res.status === 429 && job.tries < 4) {
      job.tries++;
      pausedUntil = Date.now() + 8_000 * job.tries;
      queue.unshift(job);
      return;
    }
    if (!res.ok) {
      let message = res.statusText;
      try {
        message = (await res.json()).message || message;
      } catch {}
      throw new DiscogsError(res.status, message);
    }
    job.resolve(await res.json());
  } catch (e) {
    job.reject(e);
  }
}

function get(path: string, token: string, priority: Priority = "high", signal?: AbortSignal): Promise<any> {
  return new Promise((resolve, reject) => {
    queue.push({ path, token, priority, signal, resolve, reject, tries: 0 });
    pump();
  });
}

/* ---------- account ---------- */

export async function identity(token: string): Promise<string> {
  const me = await get("/oauth/identity", token);
  return me.username as string;
}

/* ---------- search ---------- */

/**
 * Albums on vinyl, one hit per album. Masters come first; releases that never
 * got a master (private pressings, one-off editions) fill in when few match.
 */
export async function search(q: string, token: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const query = encodeURIComponent(q);
  const masters = await get(`/database/search?q=${query}&type=master&format=Vinyl&per_page=15`, token, "high", signal);
  const hits: SearchHit[] = (masters.results ?? []).map(fromSearchResult);
  if (hits.length < 6) {
    const rel = await get(`/database/search?q=${query}&type=release&format=Vinyl&per_page=25`, token, "high", signal);
    const seen = new Set(hits.map((h) => `${h.artist}|${h.title}`.toLowerCase()));
    for (const r of rel.results ?? []) {
      if (r.master_id) continue;
      const hit = fromSearchResult(r);
      const id = `${hit.artist}|${hit.title}`.toLowerCase();
      if (seen.has(id)) continue;
      seen.add(id);
      hits.push(hit);
      if (hits.length >= 15) break;
    }
  }
  return hits;
}

/* ---------- album ---------- */

const albumCache = new Map<string, Promise<AlbumDetail>>();
const VERSION_PAGES = 2;

function primaryImage(images: any[] | undefined): { cover: string; thumb: string } {
  const im = images?.find((i) => i.type === "primary") ?? images?.[0];
  return { cover: im?.uri ?? "", thumb: im?.uri150 ?? "" };
}

async function loadMaster(masterId: number, token: string, priority: Priority): Promise<AlbumDetail> {
  const versionsPath = (page: number) => `/masters/${masterId}/versions?format=Vinyl&per_page=100&page=${page}`;
  const [m, v1] = await Promise.all([
    get(`/masters/${masterId}`, token, priority),
    get(versionsPath(1), token, priority),
  ]);
  const editions: Edition[] = (v1.versions ?? []).map(toEdition);
  const pages = Math.min(v1.pagination?.pages ?? 1, VERSION_PAGES);
  for (let p = 2; p <= pages; p++) {
    const more = await get(versionsPath(p), token, priority);
    editions.push(...(more.versions ?? []).map(toEdition));
  }
  return {
    key: albumKey(masterId, null),
    masterId,
    releaseId: m.main_release ?? null,
    title: m.title ?? "",
    artist: joinArtists(m.artists),
    artistId: m.artists?.[0]?.id ?? null,
    year: toYear(m.year),
    ...primaryImage(m.images),
    genres: m.genres ?? [],
    styles: m.styles ?? [],
    tracklist: toTracklist(m.tracklist),
    editions,
    versions: v1.pagination?.items ?? editions.length,
  };
}

async function loadRelease(releaseId: number, token: string, priority: Priority): Promise<AlbumDetail> {
  const r = await get(`/releases/${releaseId}`, token, priority);
  const vinyl = isVinyl(r.formats);
  const f = r.formats?.[0];
  const edition: Edition = {
    id: r.id,
    title: r.title ?? "",
    format: [f?.name, ...(f?.descriptions ?? [])].filter(Boolean).join(", "),
    label: r.labels?.[0]?.name ?? "",
    catno: r.labels?.[0]?.catno ?? "",
    country: r.country ?? "",
    year: r.released ? String(r.released).slice(0, 4) : "",
    have: r.community?.have ?? 0,
    thumb: r.thumb ?? "",
  };
  return {
    key: albumKey(null, releaseId),
    masterId: null,
    releaseId,
    title: r.title ?? "",
    artist: joinArtists(r.artists),
    artistId: r.artists?.[0]?.id ?? null,
    year: toYear(r.year),
    ...primaryImage(r.images),
    genres: r.genres ?? [],
    styles: r.styles ?? [],
    tracklist: toTracklist(r.tracklist),
    editions: vinyl ? [edition] : [],
    versions: vinyl ? 1 : 0,
  };
}

export function album(
  ids: { masterId: number | null; releaseId: number | null },
  token: string,
  priority: Priority = "high",
): Promise<AlbumDetail> {
  const key = albumKey(ids.masterId, ids.releaseId);
  let p = albumCache.get(key);
  if (!p) {
    p = ids.masterId ? loadMaster(ids.masterId, token, priority) : loadRelease(ids.releaseId!, token, priority);
    albumCache.set(key, p);
    p.catch(() => albumCache.delete(key));
  }
  return p;
}

const artistCache = new Map<number, Promise<ArtistInfo>>();

export function artist(id: number, token: string): Promise<ArtistInfo> {
  let p = artistCache.get(id);
  if (!p) {
    p = get(`/artists/${id}`, token).then((a) => ({
      name: a.name ?? "",
      profile: plainProfile(a.profile ?? ""),
      image: primaryImage(a.images).cover,
    }));
    artistCache.set(id, p);
    p.catch(() => artistCache.delete(id));
  }
  return p;
}

/* ---------- market ---------- */

const marketCache = new Map<number, Market>();

async function market(releaseId: number, token: string, priority: Priority): Promise<Market> {
  const hit = marketCache.get(releaseId);
  if (hit) return hit;
  const s = await get(`/marketplace/stats/${releaseId}?curr_abbr=EUR`, token, priority);
  const value = s?.lowest_price?.value;
  const m: Market = { lowest: typeof value === "number" ? value : null, forSale: s?.num_for_sale ?? 0 };
  marketCache.set(releaseId, m);
  return m;
}

/** Bump to make every stored item refresh its album-level facts (see Item.enriched). */
export const ALBUM_PASS = 2;

/** Quick pass used while pricing a whole library; the detail view goes deeper. */
export const SAMPLE_QUICK = 6;
export const SAMPLE_FULL = 20;

export async function stats(detail: AlbumDetail, sampleSize: number, token: string, priority: Priority): Promise<Stats> {
  const sample = pickSample(detail.editions, sampleSize);
  const markets = await Promise.all(sample.map((e) => market(e.id, token, priority)));
  return aggregate(sample, markets, detail.editions, detail.versions, Date.now());
}

/** True when a deeper sample would price more editions than `s` did. */
export function canDeepen(s: Stats | null, target: number): boolean {
  if (!s) return true;
  return s.sampled < Math.min(target, s.versions);
}

/* ---------- import sources ---------- */

async function paged(
  first: string,
  list: "releases" | "wants",
  token: string,
  onProgress?: (done: number, total: number) => void,
): Promise<any[]> {
  const out: any[] = [];
  let page = 1;
  let pages = 1;
  do {
    const data = await get(`${first}${first.includes("?") ? "&" : "?"}per_page=100&page=${page}`, token);
    out.push(...(data[list] ?? []));
    pages = data.pagination?.pages ?? 1;
    onProgress?.(out.length, data.pagination?.items ?? out.length);
    page++;
  } while (page <= pages);
  return out;
}

const added = (iso: string | undefined) => (iso ? Date.parse(iso) || Date.now() : Date.now());

/** Vinyl only; every other format in the Discogs collection is ignored. */
export async function fetchCollection(
  username: string,
  token: string,
  onProgress?: (done: number, total: number) => void,
): Promise<NewItem[]> {
  const rows = await paged(`/users/${encodeURIComponent(username)}/collection/folders/0/releases`, "releases", token, onProgress);
  return rows
    .filter((r) => isVinyl(r.basic_information?.formats))
    .map((r) => ({ ...fromBasicInfo(r.basic_information, added(r.date_added)), instanceId: r.instance_id }));
}

export async function fetchWantlist(
  username: string,
  token: string,
  onProgress?: (done: number, total: number) => void,
): Promise<NewItem[]> {
  const rows = await paged(`/users/${encodeURIComponent(username)}/wants`, "wants", token, onProgress);
  return rows
    .filter((r) => isVinyl(r.basic_information?.formats))
    .map((r) => fromBasicInfo(r.basic_information, added(r.date_added)));
}

/* ---------- links ---------- */

export function discogsUrl(i: { masterId: number | null; releaseId: number | null }): string {
  return i.masterId ? `https://www.discogs.com/master/${i.masterId}` : `https://www.discogs.com/release/${i.releaseId}`;
}

export function marketUrl(i: { masterId: number | null; releaseId: number | null }): string {
  return i.masterId
    ? `https://www.discogs.com/sell/list?master_id=${i.masterId}&format=Vinyl`
    : `https://www.discogs.com/sell/release/${i.releaseId}`;
}
