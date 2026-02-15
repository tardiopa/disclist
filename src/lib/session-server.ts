import 'server-only'
import { v4 as uuidv4 } from 'uuid'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'disclist_session'

export async function getOrCreateSession(): Promise<string> {
    const cookieStore = await cookies()
    const existingSession = cookieStore.get(SESSION_COOKIE_NAME)

    if (existingSession?.value) {
        return existingSession.value
    }

    // Create new session
    const sessionId = uuidv4()

    return sessionId
}

export async function getSessionId(): Promise<string | null> {
    const cookieStore = await cookies()
    const session = cookieStore.get(SESSION_COOKIE_NAME)
    return session?.value || null
}
