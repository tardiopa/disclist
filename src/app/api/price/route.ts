import { getLowestPrice } from '@/lib/discogs-server'
import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(request: Request) {
    const ip = getClientIp(request)
    if (!rateLimit(ip, 60, 60_000)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') || 'master'

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    try {
        const priceData = await getLowestPrice(id, type)
        return NextResponse.json(priceData || { lowest: null, average: null, numForSale: 0 })
    } catch (error) {
        console.error('Price API Error:', error)
        return NextResponse.json({ error: 'Price fetch failed' }, { status: 500 })
    }
}
