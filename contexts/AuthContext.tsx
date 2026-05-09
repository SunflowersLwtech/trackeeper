import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import { User } from "@/types";
import { onAuthChange, signOut } from "@/services/auth";
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

  // We chain two subscriptions:
  //   • onAuthChange — Firebase Auth (sign-in / sign-out)
  //   • onSnapshot(users/{uid}) — Firestore profile (status, onboarding flags,
  //     notification prefs, push token, etc.)
  // Using a snapshot rather than getDoc means anything that mutates the
  // profile (markOnboardingSkipped, manager approval, suspendUser…) is
  // reflected in the UI immediately without a manual refresh.
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthChange((firebaseUser) => {
      // Tear down the previous profile subscription whenever auth changes.
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      setError(null);

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      profileUnsub = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        (snap) => {
          setUser(snap.exists() ? (snap.data() as User) : null);
          setLoading(false);
        },
        (err) => {
          const message = err instanceof Error ? err.message : "Failed to load user profile";
          console.error("[AuthContext] Profile snapshot error:", message);
          setError(message);
          setUser(null);
          setLoading(false);
        },
      );
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
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
