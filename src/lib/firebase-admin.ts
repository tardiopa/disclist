import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function initAdmin() {
    if (getApps().length > 0) return

    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    if (serviceAccount) {
        initializeApp({ credential: cert(JSON.parse(serviceAccount)) })
        return
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required in production')
    }

    // Local dev only: use application default credentials
    initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID })
}

initAdmin()

export const adminAuth = getAuth()
export const adminDb = getFirestore()
