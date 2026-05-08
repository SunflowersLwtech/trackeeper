/**
 * Node-side Firebase initialisation for seed/maintenance scripts.
 *
 * The React Native runtime uses `config/firebase.ts`, which depends on
 * `expo-constants` and React Native primitives that don't exist in Node.
 * This module spins up a parallel Firebase Web SDK app, reading config from
 * `process.env`, so that scripts in this folder can talk to the same
 * Firestore project without dragging in any Expo dependencies.
 *
 * The app name `"seed"` is intentional — it avoids any clash with the
 * default app the RN code creates if both ever ran in the same process.
 */
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const APP_NAME = "seed";

type RequiredKey =
  | "FIREBASE_API_KEY"
  | "FIREBASE_AUTH_DOMAIN"
  | "FIREBASE_PROJECT_ID"
  | "FIREBASE_STORAGE_BUCKET"
  | "FIREBASE_MESSAGING_SENDER_ID"
  | "FIREBASE_APP_ID";

function requireEnv(key: RequiredKey): string {
  // eslint-disable-next-line expo/no-dynamic-env-var
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing ${key} — copy .env.example to .env and fill in Firebase project credentials`,
    );
  }
  return value;
}

function getOrCreateApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;

  return initializeApp(
    {
      apiKey: requireEnv("FIREBASE_API_KEY"),
      authDomain: requireEnv("FIREBASE_AUTH_DOMAIN"),
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      storageBucket: requireEnv("FIREBASE_STORAGE_BUCKET"),
      messagingSenderId: requireEnv("FIREBASE_MESSAGING_SENDER_ID"),
      appId: requireEnv("FIREBASE_APP_ID"),
    },
    APP_NAME,
  );
}

export const app: FirebaseApp = getOrCreateApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

/** The raw Firebase Web API key — needed by Auth REST helpers. */
export const FIREBASE_API_KEY: string = requireEnv("FIREBASE_API_KEY");

/**
 * Best-effort lookup of the named app. Returns undefined if scripts are run
 * in an environment that already initialised under the default name.
 */
export function getSeedApp(): FirebaseApp {
  return getApp(APP_NAME);
}
