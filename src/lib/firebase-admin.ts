import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp() {
    if (getApps().length > 0) return getApp()

    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    if (serviceAccount) {
        return initializeApp({ credential: cert(JSON.parse(serviceAccount)) })
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required in production')
    }

    // Local dev only: use application default credentials
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID })
}

export const adminAuth = {
    verifyIdToken: (token: string) => getAuth(getAdminApp()).verifyIdToken(token),
}

export const adminDb = {
    collection: (name: string) => getFirestore(getAdminApp()).collection(name),
}
