export const SEASON_WEEKS = 13;
export const WEEKS_REQUIRED = 11;
export const LANES_REQUIRED = 3;
export const REST_CAP_PER_WEEK = 1;

/**
 * The most lanes one person may own, retired ones included.
 *
 * Nothing else bounds this: the demand ladder caps how many must be ACTIVE at
 * six, while `createLane` had no ceiling of any kind. Paired with the check-in
 * window, it is what actually bounds how many rows an account can create —
 * lanes multiplied by the couple of days a check-in may be dated.
 *
 * Far above any real season: swapping a lane a week for thirteen weeks and
 * never reusing one comes to about twenty.
 */
export const MAX_LANES_PER_USER = 50;
