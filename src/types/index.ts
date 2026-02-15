export interface DiscogsSearchResponse {
    results: DiscogsRelease[]
}

export interface DiscogsRelease {
    id: number
    type: 'release' | 'master' | 'artist'
    title: string
    year?: string
    thumb: string
    cover_image: string
    country?: string
    format?: string[]
    label?: string[]
    resource_url?: string
}

export interface WishlistItem {
    id: string // Firestore ID
    discogsId: number
    type?: 'release' | 'master' | 'artist'
    artist: string
    album: string
    year: string
    coverUrl: string
    addedAt: number
    fnacPrice?: number
    culturaPrice?: number
    pricesFetchedAt?: number // Timestamp for cache invalidation
}
