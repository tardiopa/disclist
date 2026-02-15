import 'server-only'

const DISCOGS_API_BASE = 'https://api.discogs.com'

export async function searchDiscogs(query: string, type: 'release' | 'master' | 'artist' = 'master') {
    const token = process.env.DISCOGS_TOKEN
    if (!token) {
        throw new Error('DISCOGS_TOKEN is not set')
    }

    const params = new URLSearchParams({
        q: query,
        type,
        token,
        per_page: '50', // Fetch more to filter locally
        // country: 'France',
    })

    // Discogs requires a User-Agent
    const res = await fetch(`${DISCOGS_API_BASE}/database/search?${params}`, {
        headers: {
            'User-Agent': 'DisclistApp/1.0',
        },
    })

    if (!res.ok) {
        throw new Error(`Discogs API error: ${res.statusText}`)
    }

    const data = await res.json()

    // List of Vinyl formats locally
    // Masters usually have an array of formats like ["Vinyl", "CD"]
    const filteredResults = data.results.filter((result: any) => {
        // Always keep artists
        if (type === 'artist') return true
        if (!result.format || !Array.isArray(result.format)) return false

        // Check for common vinyl indicators
        const vinylKeywords = ['Vinyl', 'LP']

        const isVinyl = result.format.some((fmt: string) =>
            vinylKeywords.some(keyword => fmt.toLowerCase().includes(keyword.toLowerCase()))
        )

        // RESCUE LOGIC:
        // Some Masters (like Gorillaz - Demon Days, ID 58002) are primarily listed as CD
        // even though they have vinyl versions.
        // We rescue them if:
        // 1. It's a Master (implied or checked if we had type)
        // 2. It has "Album" in format
        // 3. It does NOT have negative keywords (Box Set, Promo, Sampler, etc.)

        let isRescued = false
        if (!isVinyl) {
            const formats = result.format.map((f: string) => f.toLowerCase())
            const hasAlbum = formats.includes('album')
            // Removed 'file', 'mp3', 'cd-rom' because some Vinyl Masters are tagged as Digital primarily
            const exclusionKeywords = ['box set', 'promo', 'sampler', 'mini-album', 'maxi-single', 'single', 'ep', 'interview', 'educational', 'dvd']

            const hasExcluded = formats.some((fmt: string) =>
                exclusionKeywords.some(ex => fmt.includes(ex))
            )

            if (hasAlbum && !hasExcluded) {
                isRescued = true
            }
        }

        // Stricter Text Matching
        const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 0)
        const titleLower = result.title.toLowerCase()
        const matchesKeywords = queryWords.every(word => titleLower.includes(word))

        if (!isVinyl && !isRescued) return false
        if (!matchesKeywords) return false

        return true
    })

    return { results: filteredResults }
}

export async function getLowestPrice(id: string, type: string) {
    const token = process.env.DISCOGS_TOKEN
    if (!token) return null

    try {
        if (type === 'master') {
            // Fetch top 5 most collected vinyl versions
            const versionsUrl = `${DISCOGS_API_BASE}/masters/${id}/versions?format=Vinyl&per_page=5&sort=have&sort_order=desc&token=${token}`
            const versionsRes = await fetch(versionsUrl, { headers: { 'User-Agent': 'DisclistApp/1.0' } })

            if (versionsRes.ok) {
                const versionsData = await versionsRes.json()
                if (versionsData.versions && versionsData.versions.length > 0) {
                    const topReleaseIds = versionsData.versions.map((v: any) => v.id)

                    // Fetch prices for all top 5 in parallel
                    const pricePromises = topReleaseIds.map(async (releaseId: number) => {
                        try {
                            const r = await fetch(`${DISCOGS_API_BASE}/releases/${releaseId}?token=${token}`, {
                                headers: { 'User-Agent': 'DisclistApp/1.0' }
                            })
                            if (!r.ok) return null
                            const d = await r.json()
                            return {
                                lowest: d.lowest_price || null,
                                average: d.avg_price || null,
                                numForSale: d.num_for_sale || 0
                            }
                        } catch (e) {
                            return null
                        }
                    })

                    const results = await Promise.all(pricePromises)
                    const validResults = results.filter(r => r !== null && r.lowest !== null && r.lowest > 0)
                    
                    if (validResults.length > 0) {
                        // Calculate totals across all versions
                        const totalNumForSale = validResults.reduce((sum, r) => sum + (r?.numForSale || 0), 0)
                        const allPrices = validResults.flatMap(r => {
                            const prices: number[] = []
                            if (r?.lowest) prices.push(r.lowest)
                            if (r?.average) prices.push(r.average)
                            return prices
                        }).filter(p => p > 0)
                        
                        const lowestPrice = Math.min(...validResults.map(r => r!.lowest!))
                        const avgPrice = allPrices.length > 0 
                            ? allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length 
                            : null

                        return {
                            lowest: lowestPrice,
                            average: avgPrice,
                            numForSale: totalNumForSale
                        }
                    }
                }
            }
            // Fallback
            const res = await fetch(`${DISCOGS_API_BASE}/masters/${id}?token=${token}`, {
                headers: { 'User-Agent': 'DisclistApp/1.0' }
            })
            if (res.ok) {
                const data = await res.json()
                return {
                    lowest: data.lowest_price || null,
                    average: data.avg_price || null,
                    numForSale: data.num_for_sale || 0
                }
            }
        }

        // Fetch specific Release
        const res = await fetch(`${DISCOGS_API_BASE}/releases/${id}?token=${token}`, {
            headers: { 'User-Agent': 'DisclistApp/1.0' }
        })

        if (!res.ok) return null

        const data = await res.json()
        return {
            lowest: data.lowest_price || null,
            average: data.avg_price || null,
            numForSale: data.num_for_sale || 0
        }

    } catch (error) {
        console.error('Error fetching price:', error)
        return null
    }
}
