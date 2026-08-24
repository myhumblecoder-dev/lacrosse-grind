/**
 * The facts the legal pages state about the operator.
 *
 * Kept in one place because they are the parts that cannot be read off the
 * code — everything else in those pages describes what the app actually does
 * and was checked against it. All supplied by the operator rather than
 * inferred, since guessing any of them would be worse than asking.
 */
export const LEGAL = {
  company: "BotGuild AI LLC",
  product: "Lacrosse Grind",
  contactEmail: "myhumblecoder@gmail.com",
  jurisdiction: "the State of Georgia, USA",
  effectiveDate: "24 August 2026",
  /** Where the database and stored photos physically live. */
  dataRegion: "the United States (us-east-1)",
} as const;
