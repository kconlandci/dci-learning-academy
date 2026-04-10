/**
 * Access-code authentication and session persistence.
 *
 * The access code lives in Firestore at `config/access` as a single-field doc
 * ({ code }). Rotating the code is a one-field edit in the Firebase console.
 * No cohorts — DCI has rolling admissions and all students see all labs.
 *
 * Session state (access code + display name + derived studentId) persists in
 * localStorage so students don't re-enter credentials every session. The
 * studentId itself is derived on demand from `computeStudentId`, not cached
 * as a separate source of truth — if the hash function ever changes, we'd
 * rather recompute than trust stale state.
 */

import { doc, getDoc } from "firebase/firestore";
import { getDb } from "./firebase";

const LS_ACCESS_CODE = "dci:access-code";
const LS_DISPLAY_NAME = "dci:display-name";
const LS_STUDENT_ID = "dci:student-id";

export interface Session {
  accessCode: string;
  displayName: string;
  studentId: string;
}

interface AccessConfig {
  code: string;
}

/** Normalize an access code for comparison (trim + uppercase). */
function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Check whether a candidate access code matches the one stored in Firestore.
 *
 * The check is case-insensitive and whitespace-insensitive so students can
 * type `dci-labs`, `DCI-LABS`, or ` DCI-LABS ` and all work.
 */
export async function validateAccessCode(candidate: string): Promise<boolean> {
  const db = getDb();
  const snap = await getDoc(doc(db, "config", "access"));
  if (!snap.exists()) {
    throw new Error("Access config missing. Seed config/access in Firestore.");
  }
  const config = snap.data() as AccessConfig;
  return normalizeCode(candidate) === normalizeCode(config.code);
}

/** Persist a session to localStorage. */
export function saveSession(session: Session): void {
  localStorage.setItem(LS_ACCESS_CODE, session.accessCode);
  localStorage.setItem(LS_DISPLAY_NAME, session.displayName);
  localStorage.setItem(LS_STUDENT_ID, session.studentId);
}

/** Load a session from localStorage, or null if none exists. */
export function loadSession(): Session | null {
  const accessCode = localStorage.getItem(LS_ACCESS_CODE);
  const displayName = localStorage.getItem(LS_DISPLAY_NAME);
  const studentId = localStorage.getItem(LS_STUDENT_ID);
  if (!accessCode || !displayName || !studentId) return null;
  return { accessCode, displayName, studentId };
}

/** Clear session state (logout). */
export function clearSession(): void {
  localStorage.removeItem(LS_ACCESS_CODE);
  localStorage.removeItem(LS_DISPLAY_NAME);
  localStorage.removeItem(LS_STUDENT_ID);
}
