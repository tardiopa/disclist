import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const SESSION_COOKIE_NAME = 'disclist_session'
const SESSION_DURATION_DAYS = 7

const LOCALES = ['en', 'fr']
const DEFAULT_LOCALE = 'en'

function detectLocale(request: NextRequest): string {
    // 1. User preference cookie (set when they manually switch)
    const localeCookie = request.cookies.get('NEXT_LOCALE')
    if (localeCookie && LOCALES.includes(localeCookie.value)) {
        return localeCookie.value
    }

    // 2. Geolocation header (set by Vercel edge network)
    const country = request.headers.get('X-Vercel-IP-Country')
    if (country === 'FR') return 'fr'

    // 3. Accept-Language header
    const acceptLanguage = request.headers.get('Accept-Language')
    if (acceptLanguage) {
        const preferred = acceptLanguage.split(',')[0].split('-')[0].toLowerCase()
        if (LOCALES.includes(preferred)) return preferred
    }

    return DEFAULT_LOCALE
}

function setSessionCookie(response: NextResponse, value: string) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)
    response.cookies.set(SESSION_COOKIE_NAME, value, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
    })
}

export function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Skip API routes and static files
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next/') ||
        pathname.includes('.')
    ) {
        return NextResponse.next()
    }

    // Check if path already has a locale prefix
    const firstSegment = pathname.split('/')[1]
    const hasLocale = LOCALES.includes(firstSegment)

    if (!hasLocale) {
        // Redirect to locale-prefixed path
        const locale = detectLocale(request)
        const newUrl = request.nextUrl.clone()
        newUrl.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
        const response = NextResponse.redirect(newUrl)

        // Handle session cookie on redirect
        const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
        if (!sessionCookie) {
            setSessionCookie(response, uuidv4())
        } else {
            setSessionCookie(response, sessionCookie.value)
        }

        return response
    }

    // Path has locale — just handle session cookie
    const response = NextResponse.next()
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
    if (!sessionCookie) {
        setSessionCookie(response, uuidv4())
    } else {
        setSessionCookie(response, sessionCookie.value)
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
