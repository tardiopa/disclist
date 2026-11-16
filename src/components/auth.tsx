"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  ready: boolean;
  /**
   * Best guess before Firebase has answered: was someone signed in on the last
   * visit? Only used to pick a button label without a flash; never for access.
   */
  likely: boolean;
}

const Ctx = createContext<AuthState>({ user: null, ready: false, likely: false });

export function AuthProvider({ likely, children }: { likely: boolean; children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false, likely });
  useEffect(() => {
    const done = (user: User | null) => {
      document.cookie = `authed=${user ? 1 : 0};path=/;max-age=31536000;samesite=lax`;
      setState({ user, ready: true, likely: !!user });
    };
    return onAuthStateChanged(auth, done, () => done(null));
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
