/**
 * The facts the legal pages state about the operator.
 *
 * Kept in one place because they are the parts that cannot be read off the
 * code — everything else in those pages describes what the app actually does
 * and was checked against it.
 *
 * Two of these need a human decision before this is relied upon:
 *   contactEmail — currently a personal address, which a public privacy
 *                  policy will publish. A role address is usually better.
 *   jurisdiction — the state BotGuild AI LLC is organised in. Guessing this
 *                  would be worse than leaving it obviously unset.
 */
export const LEGAL = {
  company: "BotGuild AI LLC",
  product: "Lacrosse Grind",
  contactEmail: "thomasfgooch@gmail.com",
  jurisdiction: "the State of Ohio",
  effectiveDate: "24 August 2026",
  /** Where the database and stored photos physically live. */
  dataRegion: "the United States (us-east-1)",
} as const;
