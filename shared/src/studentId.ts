/**
 * Student ID derivation.
 *
 * studentId is a deterministic SHA-256 of `normalized(accessCode):normalized(displayName)`.
 * Deriving (rather than storing a UUID in localStorage) means a student's
 * progress follows them across devices — classroom to homework — as long as
 * they use the same access code + display name. Browser-data clears also
 * don't drop progress.
 *
 * Collision handling is caller-side: the caller checks whether a students/{id}
 * doc already exists with a DIFFERENT original displayName, and if so,
 * prompts the student to pick a different name.
 */

/**
 * Normalize a display name for hashing.
 * - Trim leading/trailing whitespace
 * - Collapse internal whitespace to single spaces
 * - Lowercase
 * - Strip trailing punctuation
 *
 * "Kevin C."   → "kevin c"
 * " kevin  c " → "kevin c"
 * "Kevin C!!"  → "kevin c"
 */
export function normalizeDisplayName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/[.,;:!?'"]+$/u, "");
}

/**
 * Compute the deterministic student ID.
 *
 * Uses Web Crypto (available in all evergreen browsers and secure contexts).
 * Output is a 64-character lowercase hex string.
 */
/** Normalize an access code: trim + uppercase. */
export function normalizeAccessCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function computeStudentId(
  accessCode: string,
  displayName: string,
): Promise<string> {
  const normalizedCode = normalizeAccessCode(accessCode);
  const normalized = normalizeDisplayName(displayName);
  if (!normalizedCode) {
    throw new Error("Access code must contain at least one non-whitespace character");
  }
  if (!normalized) {
    throw new Error("Display name must contain at least one non-whitespace character");
  }
  const input = `${normalizedCode}:${normalized}`;
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
