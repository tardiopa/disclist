import { searchDiscogs } from '@/lib/discogs-server'
import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(request: Request) {
    const ip = getClientIp(request)
    if (!rateLimit(ip, 20, 60_000)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    if (!q) {
        return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }

    try {
        const data = await searchDiscogs(q)
        return NextResponse.json(data)
    } catch (error) {
        console.error('Search API Error:', error)
        return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
}
