// Auth state: demo login (manager@hktransport.pk / demo1234) while no
// backend is connected; JWT via lib/api once NEXT_PUBLIC_API_URL is set.
// Logged-out users can still browse in DEMO VIEW (banner shown, write
// actions blocked) — the same pattern as the MARQUE ONE polish.

"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { clearSession, fetchMe, getStoredUser, login as apiLogin, saveSession } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  demoMode: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  /** True when the user may write (create/edit/record). False in demo view. */
  canWrite: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  demoMode: true,
  login: async () => {
    throw new Error("Auth not ready");
  },
  logout: () => undefined,
  canWrite: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Lazy init from localStorage so no setState-in-effect is needed.
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [loading, setLoading] = useState<boolean>(false);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      saveSession(res.access_token, res.user);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  // Validate a stored session once (backend mode only; demo tokens are local).
  React.useEffect(() => {
    const stored = getStoredUser();
    if (!stored) return;
    if (stored.email === "manager@hktransport.pk") return; // demo session
    fetchMe().catch(() => {
      clearSession();
      setUser(null);
    });
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    demoMode: user === null,
    login,
    logout,
    canWrite: user !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
