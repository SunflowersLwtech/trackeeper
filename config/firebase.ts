import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyAe5xWkCaRAic3LFUgjwA_-1MN1Jl8a3bY",
  authDomain: "trackeeper-912ea.firebaseapp.com",
  projectId: "trackeeper-912ea",
  storageBucket: "trackeeper-912ea.firebasestorage.app",
  messagingSenderId: "778187557933",
  appId: "1:778187557933:web:0e17e8e9ddc6ae6a833ca4",
  measurementId: "G-MTGXLWF4G1",
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
  // @ts-ignore — getReactNativePersistence exists in RN bundle but not in web types
  const { getReactNativePersistence } = require("firebase/auth");
  return initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export const auth = createAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
