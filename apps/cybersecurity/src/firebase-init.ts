/**
 * Cybersecurity-side Firebase bootstrap.
 *
 * Reads the Firebase Web config from Vite env vars (VITE_FIREBASE_*) at
 * build time and calls initFirebase() from @dci/shared once. Imported by
 * main.tsx before React mounts, so any shared/* module that calls getDb()
 * after that point is safe.
 */

import { initFirebase } from "@dci/shared";

const env = import.meta.env;

function required(key: keyof ImportMetaEnv): string {
  const value = env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Missing required env var ${key}. Copy apps/cybersecurity/.env.example to apps/cybersecurity/.env and fill in the Firebase console values.`,
    );
  }
  return value;
}

initFirebase({
  apiKey: required("VITE_FIREBASE_API_KEY"),
  authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: required("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: required("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: required("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: required("VITE_FIREBASE_APP_ID"),
});
