/**
 * Progress tracking against Firestore.
 *
 * Schema:
 *   config/access                         { code }
 *   students/{studentId}                  { displayName, createdAt }
 *   students/{studentId}/progress/{labId} { module, labId, completedAt }
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

export interface StudentDoc {
  displayName: string;
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
 * - `created`: no doc existed, a new one was created with displayName.
 * - `existing`: a doc already existed with the same displayName; no write.
 * - `collision`: a doc already existed with a DIFFERENT displayName at this
 *   studentId hash. Caller should prompt the student to pick a different
 *   name (add a last initial, etc.).
 */
export type EnsureStudentResult =
  | { kind: "created"; displayName: string }
  | { kind: "existing"; displayName: string }
  | { kind: "collision"; existingDisplayName: string };

/**
 * Create or reconcile a students/{studentId} doc.
 *
 * Called once per session after the student enters their display name.
 * Returns a discriminated result so the caller can route collision UX.
 */
export async function ensureStudentDoc(
  studentId: string,
  displayName: string,
): Promise<EnsureStudentResult> {
  const db = getDb();
  const ref = doc(db, "students", studentId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      displayName,
      createdAt: serverTimestamp(),
    });
    return { kind: "created", displayName };
  }

  const existing = snap.data() as StudentDoc;
  if (existing.displayName === displayName) {
    return { kind: "existing", displayName: existing.displayName };
  }
  return { kind: "collision", existingDisplayName: existing.displayName };
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
