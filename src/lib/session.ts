import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'

export async function migrateSessionToUser(sessionId: string, userId: string): Promise<void> {
    try {
        // Find all wishlists belonging to this session
        const wishlistsRef = collection(db, 'wishlists')
        const q = query(wishlistsRef, where('sessionId', '==', sessionId))
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
            console.log('No wishlists to migrate for session:', sessionId)
            return
        }

        // Batch update to transfer ownership
        const batch = writeBatch(db)

        snapshot.docs.forEach((docSnapshot) => {
            const wishlistRef = doc(db, 'wishlists', docSnapshot.id)
            batch.update(wishlistRef, {
                ownerId: userId,
                sessionId: null, // Clear session ID
                updatedAt: Date.now()
            })
        })

        await batch.commit()
        console.log(`Migrated ${snapshot.docs.length} wishlists from session ${sessionId} to user ${userId}`)

    } catch (error) {
        console.error('Error migrating session to user:', error)
        throw error
    }
}
