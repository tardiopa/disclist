import { scrapeFnacPrice, scrapeCulturaPrice } from '@/lib/scraper'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/verify-admin'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST(request: Request) {
    try {
        await verifyAdmin(request.headers.get('Authorization'))
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { items } = await request.json()

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid items array' }, { status: 400 })
        }

        const results: Record<string, { fnac: number | null; cultura: number | null }> = {}

        // Process items sequentially
        for (const item of items) {
            const query = `${item.artist} ${item.album} vinyl`

            const fnacPrice = await scrapeFnacPrice(query)

            await delay(3000)

            const culturaPrice = await scrapeCulturaPrice(query)

            results[item.id] = { fnac: fnacPrice, cultura: culturaPrice }
        }

        return NextResponse.json({ prices: results })

    } catch (error) {
        console.error('[Scraper] API error:', error)
        return NextResponse.json({ error: 'Scraping failed' }, { status: 500 })
    }
}
