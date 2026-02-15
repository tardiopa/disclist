import { collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore'
import { db } from './firebase'

export interface Wishlist {
    id: string
    name: string
    ownerId: string | null
    sessionId: string | null
    isPublic: boolean
    createdAt: number
    updatedAt: number
}

export interface WishlistItem {
    id: string
    discogsId: number
    type?: 'release' | 'master' | 'artist'
    artist: string
    album: string
    year: string
    coverUrl: string
    fnacPrice?: number
    culturaPrice?: number
    pricesFetchedAt?: number
    addedAt: number
}

export async function createWishlist(
    name: string,
    ownerId?: string | null,
    sessionId?: string | null
): Promise<Wishlist> {
    console.log('[CREATE] Attempting createWishlist:', { name, ownerId, sessionId });
    const wishlistData = {
        name,
        ownerId: ownerId || null,
        sessionId: sessionId || null,
        isPublic: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
    }

    try {
        const docRef = await addDoc(collection(db, 'wishlists'), wishlistData)
        return {
            id: docRef.id,
            ...wishlistData
        }
    } catch (err) {
        console.error('Error creating wishlist:', err);
        throw err
    }
}

export async function getWishlists(userId: string): Promise<Wishlist[]> {
    const wishlistsRef = collection(db, 'wishlists')
    const q = query(
        wishlistsRef,
        where('ownerId', '==', userId)
        // orderBy('createdAt', 'desc') // Temporarily disabled while index builds
    )

    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Wishlist))
}

export async function getSessionWishlists(sessionId: string): Promise<Wishlist[]> {
    const wishlistsRef = collection(db, 'wishlists')
    const q = query(
        wishlistsRef,
        where('sessionId', '==', sessionId)
        // orderBy('createdAt', 'desc') // Temporarily disabled while index builds
    )

    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Wishlist))
}

export async function getWishlist(id: string): Promise<Wishlist | null> {
    const docRef = doc(db, 'wishlists', id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) return null

    return {
        id: docSnap.id,
        ...docSnap.data()
    } as Wishlist
}

export async function updateWishlist(id: string, data: Partial<Wishlist>): Promise<void> {
    const docRef = doc(db, 'wishlists', id)
    await updateDoc(docRef, {
        ...data,
        updatedAt: Date.now()
    })
}

export async function deleteWishlist(id: string): Promise<void> {
    // Delete all items first
    const itemsRef = collection(db, 'wishlists', id, 'items')
    const itemsSnapshot = await getDocs(itemsRef)

    const deletePromises = itemsSnapshot.docs.map(itemDoc =>
        deleteDoc(doc(db, 'wishlists', id, 'items', itemDoc.id))
    )

    await Promise.all(deletePromises)

    // Delete the wishlist itself
    await deleteDoc(doc(db, 'wishlists', id))
}

export async function togglePublic(id: string, isPublic: boolean): Promise<void> {
    await updateWishlist(id, { isPublic })
}

export async function getWishlistItems(wishlistId: string): Promise<WishlistItem[]> {
    const itemsRef = collection(db, 'wishlists', wishlistId, 'items')
    const q = query(itemsRef, orderBy('addedAt', 'desc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as WishlistItem))
}
