// Firebase init
export { initFirebase, getApp, getDb, isFirebaseReady } from "./firebase";

// Auth
export {
  validateAccessCode,
  saveSession,
  loadSession,
  clearSession,
  validateInstructorCode,
  saveInstructorSession,
  loadInstructorSession,
  clearInstructorSession,
  type Session,
} from "./auth";

// Student ID derivation
export { normalizeDisplayName, computeStudentId } from "./studentId";

// Progress tracking
export {
  ensureStudentDoc,
  recordLabCompletion,
  getStudentProgress,
  getAllStudentsProgress,
  type StudentDoc,
  type LabCompletion,
  type StudentProgress,
  type EnsureStudentResult,
} from "./progress";

// Module registry
export { MODULES, getModule, type DciModule } from "./modules";
