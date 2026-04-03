import { initializeApp } from "firebase/app";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Environment-based Firebase config via app.json extra or env vars
// Falls back to default project config if not set
const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: (extra.FIREBASE_API_KEY as string) || "AIzaSyAS_Rz6v5jfcmsEIHHP_gBv0FxXxWzO7ew",
  authDomain: (extra.FIREBASE_AUTH_DOMAIN as string) || "tracekeeper-51b4d.firebaseapp.com",
  projectId: (extra.FIREBASE_PROJECT_ID as string) || "tracekeeper-51b4d",
  storageBucket: (extra.FIREBASE_STORAGE_BUCKET as string) || "tracekeeper-51b4d.firebasestorage.app",
  messagingSenderId: (extra.FIREBASE_MESSAGING_SENDER_ID as string) || "882072395645",
  appId: (extra.FIREBASE_APP_ID as string) || "1:882072395645:web:efea775a61fc7a4e9eb614",
  measurementId: (extra.FIREBASE_MEASUREMENT_ID as string) || "G-17Q38MBZ8L",
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
});
export const storage = getStorage(app);
export default app;
