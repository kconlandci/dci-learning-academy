/**
 * Progress tracking against Firestore.
 *
 * Schema:
 *   config/access                         { code }
 *   students/{studentId}                  { displayName, normalizedDisplayName, createdAt }
 *   students/{studentId}/progress/{labId} { module, labId, completedAt }
 *
 * `displayName` is the raw string the student typed (e.g. "Kevin C."),
 * shown verbatim in the UI. `normalizedDisplayName` is the canonical form
 * used to derive studentId and exists on the doc to support cheap identity
 * checks and backfills.
 *
 * No cohorts, no term semantics — DCI uses rolling admissions and flat
 * progress tracking. The instructor view reads students/ as a single flat
 * collection.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { normalizeDisplayName } from "./studentId";

export interface StudentDoc {
  displayName: string;
  normalizedDisplayName: string;
  createdAt: Timestamp;
}

export interface LabCompletion {
  module: string;
  labId: string;
  completedAt: Timestamp;
}

export interface StudentProgress {
  studentId: string;
  displayName: string;
  createdAt: Timestamp;
  completions: LabCompletion[];
}

/**
 * Result of ensureStudentDoc.
 *
 * - `created`: no doc existed, a new one was created.
 * - `existing`: a doc already existed at this studentId; returned verbatim.
 *
 * There is no `collision` case: if the hash matches an existing doc, the
 * student IS that doc's owner by definition. The hash is derived from the
 * normalized display name, so "Kevin C." and "Kevin C" (same person on two
 * devices) land on the same hash and are treated as the same identity.
 *
 * This does mean two real humans who pick identical normalized names will
 * silently share a record. That's unavoidable without adding a second
 * identity factor (real auth, device fingerprint, etc.) and is mitigated at
 * the classroom level — instructors ask students to pick distinct names.
 */
export type EnsureStudentResult =
  | { kind: "created"; displayName: string }
  | { kind: "existing"; displayName: string };

/**
 * Create or reconcile a students/{studentId} doc.
 *
 * Called once per session after the student enters their display name. If
 * an existing doc predates the normalizedDisplayName field, this function
 * backfills it as a side effect.
 */
export async function ensureStudentDoc(
  studentId: string,
  displayName: string,
): Promise<EnsureStudentResult> {
  const db = getDb();
  const ref = doc(db, "students", studentId);
  const snap = await getDoc(ref);
  const normalized = normalizeDisplayName(displayName);

  if (!snap.exists()) {
    await setDoc(ref, {
      displayName,
      normalizedDisplayName: normalized,
      createdAt: serverTimestamp(),
    });
    return { kind: "created", displayName };
  }

  const existing = snap.data() as Partial<StudentDoc>;
  // Backfill normalizedDisplayName for pre-fix docs written before this
  // field existed. Safe to overwrite: by construction, `normalized` matches
  // whatever the original doc would have computed — they hashed to the
  // same studentId, so they normalize to the same string.
  if (!existing.normalizedDisplayName) {
    await setDoc(ref, { normalizedDisplayName: normalized }, { merge: true });
  }
  return { kind: "existing", displayName: existing.displayName ?? displayName };
}

/**
 * Record a single lab completion.
 *
 * Idempotent: re-completing a lab overwrites the timestamp with the latest.
 * Document ID is `${module}:${labId}` so it's stable and human-readable.
 */
export async function recordLabCompletion(
  studentId: string,
  module: string,
  labId: string,
): Promise<void> {
  const db = getDb();
  const ref = doc(db, "students", studentId, "progress", `${module}:${labId}`);
  await setDoc(ref, {
    module,
    labId,
    completedAt: serverTimestamp(),
  });
}

/** Fetch all lab completions for a single student. */
export async function getStudentProgress(studentId: string): Promise<LabCompletion[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, "students", studentId, "progress"));
  return snap.docs.map((d) => d.data() as LabCompletion);
}

/**
 * Fetch every student's progress (instructor view).
 *
 * Flat query: no cohort filtering. For ~30 students × ~600 total labs this
 * is well within Firestore free-tier read budgets; optimize later if needed.
 */
export async function getAllStudentsProgress(): Promise<StudentProgress[]> {
  const db = getDb();
  const studentsSnap = await getDocs(collection(db, "students"));

  const results: StudentProgress[] = [];
  for (const studentSnap of studentsSnap.docs) {
    const student = studentSnap.data() as StudentDoc;
    const progressSnap = await getDocs(
      collection(db, "students", studentSnap.id, "progress"),
    );
    results.push({
      studentId: studentSnap.id,
      displayName: student.displayName,
      createdAt: student.createdAt,
      completions: progressSnap.docs.map((d) => d.data() as LabCompletion),
    });
  }
  return results;
}
