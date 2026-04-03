import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types";
import { onAuthChange, getUserProfile, signOut } from "@/services/auth";
import { unregisterPushToken } from "@/services/notifications";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  error: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      try {
        setError(null);
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load user profile";
        console.error("[AuthContext] Profile load error:", message);
        setError(message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    if (user) {
      await unregisterPushToken(user.uid).catch(() => {});
    }
    await signOut();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
