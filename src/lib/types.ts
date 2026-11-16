export type ListName = "collection" | "wishlist";

/** Market snapshot for one album, aggregated over its vinyl editions. */
export interface Stats {
  /** Mean of the lowest listing of each sampled vinyl edition (EUR). */
  avg: number | null;
  /** Cheapest listing among sampled vinyl editions (EUR). */
  min: number | null;
  /** Estimated vinyl copies for sale across all editions. */
  forSale: number;
  /** Number of vinyl editions known to Discogs. */
  versions: number;
  /** How many editions were priced. */
  sampled: number;
  updatedAt: number;
}

/**
 * One album on vinyl. `key` identifies the album regardless of edition:
 * "m<masterId>" or, for releases without a master, "r<releaseId>".
 */
export interface Item {
  id: string;
  key: string;
  masterId: number | null;
  /** The edition owned (collection) or a representative release. */
  releaseId: number | null;
  /** Discogs collection instance this item was imported from. */
  instanceId?: number | null;
  title: string;
  artist: string;
  artistId?: number | null;
  year: number | null;
  cover: string;
  thumb: string;
  genres: string[];
  styles: string[];
  stats: Stats | null;
  /** True once year/genres come from the master rather than one edition. */
  enriched?: boolean;
  addedAt: number;
}

export type NewItem = Omit<Item, "id">;

export interface Profile {
  shareId: string;
  name: string;
  collectionPublic: boolean;
  wishlistPublic: boolean;
}

export interface DiscogsLink {
  token: string;
  username: string;
}

export interface Track {
  position: string;
  title: string;
  duration: string;
  heading?: boolean;
}

export interface Edition {
  id: number;
  title: string;
  format: string;
  label: string;
  catno: string;
  country: string;
  year: string;
  have: number;
  thumb: string;
}

export interface AlbumDetail {
  key: string;
  masterId: number | null;
  releaseId: number | null;
  title: string;
  artist: string;
  artistId: number | null;
  year: number | null;
  cover: string;
  thumb: string;
  genres: string[];
  styles: string[];
  tracklist: Track[];
  editions: Edition[];
  versions: number;
}

export interface ArtistInfo {
  name: string;
  profile: string;
  image: string;
}

export interface SearchHit {
  key: string;
  masterId: number | null;
  releaseId: number | null;
  title: string;
  artist: string;
  year: number | null;
  cover: string;
  thumb: string;
  genres: string[];
  styles: string[];
}
