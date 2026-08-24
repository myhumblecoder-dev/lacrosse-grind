import { lookup } from "node:dns/promises";

/**
 * Every address a hostname resolves to.
 *
 * The one place DNS is touched, kept to a single thin function so the guard
 * that judges those addresses stays free of I/O and can be tested by handing
 * it answers directly.
 */
export async function resolveHost(hostname: string): Promise<string[]> {
  const addresses = await lookup(hostname, { all: true });
  return addresses.map((a) => a.address);
}
