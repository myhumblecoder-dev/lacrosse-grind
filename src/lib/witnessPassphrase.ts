import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

/**
 * Hash and verify the witness passphrase — the thing that unlocks `/amend`.
 *
 * `node:crypto` scrypt rather than bcrypt: one column does not justify a
 * dependency, and scrypt is in the standard library. The specifier is prefixed
 * because the Vitest environment is `jsdom`, where a bare `"crypto"` is
 * ambiguous with the browser global.
 *
 * This module holds no constants. The minimum length is a validation rule and
 * lives in `src/lib/validation.ts`, so nothing has to import this file to learn
 * it: `validation.ts` is imported by actions today, and the moment a client form
 * imports a schema from it, an import of this module would pull `node:crypto`
 * into the browser bundle and break the build. The arrow only ever points one
 * way — validation never imports crypto, and crypto never imports validation.
 */
export function hashWitnessPassphrase(plain: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = scryptSync(plain, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

/**
 * Does `plain` match the stored `"salt:hash"`?
 *
 * A malformed or missing column is a refusal, never a throw: this runs on a
 * path a parent reaches by typing, and an exception there would surface as a
 * crashed page rather than "that passphrase didn't match".
 */
export function verifyWitnessPassphrase(
  plain: string,
  stored: string | null | undefined
): boolean {
  if (!stored) return false;

  const parts = stored.split(":");
  if (parts.length !== 2) return false;

  const [salt, expected] = parts;
  if (!salt || !expected) return false;

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = scryptSync(plain, salt, KEY_LENGTH);

  // timingSafeEqual throws on unequal lengths, so the guard comes first — and
  // a length mismatch is already a mismatch.
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
