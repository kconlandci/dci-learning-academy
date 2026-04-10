/**
 * Firebase client initialization.
 *
 * Step 4 ships a stub: no real config yet. Step 5 wires the real config
 * returned by the Firebase console after the project is created. All other
 * modules in @dci/shared call getDb()/getApp() and will start working
 * automatically once initFirebase() is called at portal bootstrap with a
 * real config object.
 */

import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function initFirebase(config: FirebaseOptions): void {
  if (app) return;
  app = initializeApp(config);
  db = getFirestore(app);
}

export function getApp(): FirebaseApp {
  if (!app) {
    throw new Error(
      "Firebase not initialized. Call initFirebase(config) at app bootstrap before using shared auth/progress modules.",
    );
  }
  return app;
}

export function getDb(): Firestore {
  if (!db) {
    throw new Error(
      "Firestore not initialized. Call initFirebase(config) at app bootstrap before using shared auth/progress modules.",
    );
  }
  return db;
}

export function isFirebaseReady(): boolean {
  return app !== null && db !== null;
}
