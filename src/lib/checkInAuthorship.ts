export type CheckInActor = "player" | "witness";

/** The row as it stands, or null when the day is unmarked. */
export type PresentCheckIn = { attestedAt: Date | null; isRest: boolean };
export type ExistingCheckIn = PresentCheckIn | null;

export type AuthorshipRefusal = "attested" | "already-marked" | "not-found";

export type Verdict =
  | { allowed: true }
  | { allowed: false; error: AuthorshipRefusal };

/**
 * A removal verdict carries the row it just proved present, so a caller that
 * needs its fields — `withdrawCheckIn` records `wasRest` — gets them already
 * narrowed instead of re-checking for null the function has already ruled out.
 */
export type RemoveVerdict =
  | { allowed: true; existing: PresentCheckIn }
  | { allowed: false; error: AuthorshipRefusal };

const ALLOWED: Verdict = { allowed: true };

/**
 * Who owns a check-in row, and may this actor change it?
 *
 * One place, because the rule was previously enforced per-action and two review
 * rounds each found a hole in a path that had been missed — `deleteCheckIn` but
 * not `createCheckIn`, then the grid but not the server. Four copies of an
 * invariant is four chances to guard three of them.
 *
 * `CheckIn.attestedAt` is the authorship marker: null means the player tapped
 * it, set means a witness put it on the record. Two rules follow, in opposite
 * directions, and both exist to stop the record claiming something nobody said:
 *
 * - **A player may not touch a day a witness owns.** The player's controls ask
 *   for no passphrase and leave no `CheckInRemoval`, so without this a kid could
 *   flip a parent's attested rest day into a session that still reads as
 *   witnessed, or delete the attestation outright.
 * - **A witness may not relabel a day the player owns unless it genuinely
 *   changes.** Attesting an already-matching row would stamp `attestedAt` on the
 *   player's own tap and pass his word off as a parent's.
 *
 * A witness changing what a day SAYS is allowed — that is the amendment — as is
 * a witness editing a statement they already own.
 */
export function mayRecord(
  actor: CheckInActor,
  existing: ExistingCheckIn,
  isRest: boolean
): Verdict {
  if (actor === "player") {
    return existing?.attestedAt != null
      ? { allowed: false, error: "attested" }
      : ALLOWED;
  }

  // Witness. Nothing to attest about a day that already says this, and saying
  // it anyway would relabel the player's own entry.
  if (existing && existing.attestedAt === null && existing.isRest === isRest) {
    return { allowed: false, error: "already-marked" };
  }

  return ALLOWED;
}

/**
 * May this actor take the day back off the record?
 *
 * A missing row is a refusal for either actor: there is nothing to remove from a
 * day that was never marked. Beyond that, only the authorship rule applies — a
 * witness may withdraw anything inside the window, including the player's own
 * entries, which is the entire point of the feature.
 */
export function mayRemove(
  actor: CheckInActor,
  existing: ExistingCheckIn
): RemoveVerdict {
  if (existing === null) {
    return { allowed: false, error: "not-found" };
  }

  if (actor === "player" && existing.attestedAt !== null) {
    return { allowed: false, error: "attested" };
  }

  return { allowed: true, existing };
}
