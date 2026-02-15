const store = new Map<string, { count: number; resetAt: number }>()

/**
 * Simple in-memory rate limiter.
 * Returns true if the request is allowed, false if it should be blocked.
 */
export function rateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const record = store.get(ip)

    if (!record || now > record.resetAt) {
        store.set(ip, { count: 1, resetAt: now + windowMs })
        return true
    }

    if (record.count >= maxRequests) {
        return false
    }

    record.count++
    return true
}

export function getClientIp(request: Request): string {
    const forwarded = (request as any).headers?.get?.('x-forwarded-for')
    return forwarded?.split(',')[0].trim() ?? 'unknown'
}
