/**
 * The word that has to be typed before an account is destroyed.
 *
 * Lives here rather than beside the action because a `'use server'` module may
 * only export async functions — Next strips anything else, and the import
 * fails at build time with the module appearing to have no exports at all.
 */
export const DELETE_CONFIRMATION = "DELETE";
