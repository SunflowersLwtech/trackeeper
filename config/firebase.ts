import { initializeApp } from "firebase/app";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Firebase config loaded from environment variables via app.config.ts → extra.
// Falls back to process.env for SSR / Node contexts where Constants is unavailable.
// See .env.example for required variables. Copy to .env and fill in values.
const extra = Constants.expoConfig?.extra ?? {};

function requireEnv(key: string): string {
  const value = (extra[key] as string | undefined) || (typeof process !== "undefined" ? process.env[key] : undefined);
  if (!value) {
    throw new Error(`Missing Firebase config: ${key}. Check your .env file and app.config.ts`);
  }
  return value;
}

const firebaseConfig = {
  apiKey: requireEnv("FIREBASE_API_KEY"),
  authDomain: requireEnv("FIREBASE_AUTH_DOMAIN"),
  projectId: requireEnv("FIREBASE_PROJECT_ID"),
  storageBucket: requireEnv("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requireEnv("FIREBASE_MESSAGING_SENDER_ID"),
  appId: requireEnv("FIREBASE_APP_ID"),
  measurementId: (extra.FIREBASE_MEASUREMENT_ID as string) || undefined,
};

const app = initializeApp(firebaseConfig);

// Platform-aware auth initialization:
// - Native (iOS/Android): use AsyncStorage persistence via getReactNativePersistence
// - Web: use browser localStorage persistence (default)
function createAuth() {
  if (Platform.OS === "web") {
    return initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  }
  // Dynamic require to avoid web bundle crash (firebase-js-sdk#9739)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const firebaseAuth = require("firebase/auth") as { getReactNativePersistence: (storage: typeof AsyncStorage) => import("firebase/auth").Persistence };
  return initializeAuth(app, {
    persistence: firebaseAuth.getReactNativePersistence(AsyncStorage),
  });
}

export const auth = createAuth();
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});
export const storage = getStorage(app);
export default app;
