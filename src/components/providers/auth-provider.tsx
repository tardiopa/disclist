"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { createWishlist, getWishlists } from "@/lib/wishlists";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Cookies from "js-cookie";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    hasPendingMigration: boolean;
    sessionId: string | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    signInWithGoogle: async () => { },
    logout: async () => { },
    hasPendingMigration: false,
    sessionId: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [hasPendingMigration, setHasPendingMigration] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Separate effect to watch for session cookie changes
    useEffect(() => {
        const updateSessionId = () => {
            const session = Cookies.get('disclist_session');
            setSessionId(session || null);
        };

        // Initial read
        updateSessionId();

        // Check periodically for cookie changes (e.g., from middleware)
        const interval = setInterval(updateSessionId, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // Read session ID fresh each time
            const currentSession = Cookies.get('disclist_session');
            
            setUser(user);

            if (user) {
                await handleUserSignIn(user, currentSession || undefined);
            } else {
                setIsAdmin(false);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleUserSignIn = async (user: User, sessionId?: string) => {
        try {
            // Check if this is a first-time user
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            const isFirstTimeUser = !userDoc.exists();

            setIsAdmin(userDoc.exists() && userDoc.data()?.admin === true);

            if (isFirstTimeUser) {
                // First-time user - create user document
                await setDoc(userDocRef, {
                    email: user.email,
                    displayName: user.displayName,
                    createdAt: Date.now()
                });

                // Only create default wishlist if there's no session to migrate
                // Otherwise, migration will handle it
                if (!sessionId) {
                    const firstName = user.displayName?.split(' ')[0] || null;
                    const wishlistName = firstName ? `${firstName}'s wishlist` : 'My wishlist';
                    await createWishlist(wishlistName, user.uid);
                }
            }

            // Check if there's a session to migrate
            if (sessionId) {
                // Check if session has wishlists (will be done in migration modal)
                setHasPendingMigration(true);
            }

        } catch (error) {
            console.error('Error handling user sign in:', error);
        }
    };

    const signInWithGoogle = async () => {
        if (!auth) {
            console.error("Firebase Auth not initialized");
            return;
        }
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
        }
    };

    const logout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            setHasPendingMigration(false);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAdmin,
            signInWithGoogle,
            logout,
            hasPendingMigration,
            sessionId
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
