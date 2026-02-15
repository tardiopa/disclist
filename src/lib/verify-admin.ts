import { adminAuth, adminDb } from './firebase-admin'

/**
 * Verifies the Firebase ID token from an Authorization header
 * and checks that the user has admin: true in their Firestore document.
 * Returns the uid on success, throws on failure.
 */
export async function verifyAdmin(authHeader: string | null): Promise<string> {
    if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('Missing or invalid Authorization header')
    }

    const token = authHeader.slice(7)
    const decoded = await adminAuth.verifyIdToken(token)

    const userDoc = await adminDb.collection('users').doc(decoded.uid).get()
    if (!userDoc.exists || userDoc.data()?.admin !== true) {
        throw new Error('Admin access required')
    }

    return decoded.uid
}
