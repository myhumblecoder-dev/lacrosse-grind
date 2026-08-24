import { isPublicAddress } from "@/lib/publicAddress";

/**
 * Is this URL safe for the SERVER to request on a stranger's behalf?
 *
 * A pasted link is fetched from inside our own network, where none of the
 * browser's protections apply: `http://169.254.169.254/` hands back instance
 * credentials, and `https://10.0.0.5:5432` probes a database nobody outside
 * can reach. So the scheme is restricted and the hostname is resolved, letting
 * the decision be made about the address we will actually talk to rather than
 * the name written in front of it.
 *
 * Takes its resolver rather than calling DNS, so the rule can be tested by
 * handing it answers instead of depending on the network.
 */
export async function assertFetchableUrl(
  raw: string,
  resolveHost: (hostname: string) => Promise<string[]>
): Promise<{ ok: true; url: URL } | { ok: false; error: string }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "url-not-allowed" };
  }

  // https only: `file:` would read the server's own disk, and plain http lets
  // anyone on the path swap the image for something else anyway.
  if (url.protocol !== "https:") {
    return { ok: false, error: "url-not-allowed" };
  }

  // Credentials in a URL are only ever an attempt to have us authenticate to
  // something internal.
  if (url.username || url.password) {
    return { ok: false, error: "url-not-allowed" };
  }

  // A hostname that is already an address is judged on the spot. Sending it
  // through DNS would make the verdict depend on a resolver echoing literals
  // back unchanged, and `https://169.254.169.254/` must be refused whatever a
  // resolver has to say about it.
  const literal = asIpLiteral(url.hostname);
  if (literal !== null) {
    return isPublicAddress(literal)
      ? { ok: true, url }
      : { ok: false, error: "url-not-allowed" };
  }

  let addresses: string[];
  try {
    addresses = await resolveHost(url.hostname);
  } catch {
    return { ok: false, error: "url-not-allowed" };
  }

  // A name that resolves to nothing tells us nothing, and EVERY address has to
  // pass: one public and one private answer is a rebinding attempt, not a
  // coincidence.
  if (addresses.length === 0) {
    return { ok: false, error: "url-not-allowed" };
  }
  if (!addresses.every(isPublicAddress)) {
    return { ok: false, error: "url-not-allowed" };
  }

  return { ok: true, url };
}

/**
 * The hostname as a bare IP address, or null if it is a name.
 *
 * URL keeps IPv6 hosts in brackets, so those come off first. Anything made
 * only of digits and dots counts, including the octal and hex spellings that
 * `isPublicAddress` refuses — the point is to route them to that judgement
 * rather than to DNS.
 */
function asIpLiteral(hostname: string): string | null {
  const bare = hostname.replace(/^\[/, "").replace(/\]$/, "");
  if (bare === "") return null;
  if (bare.includes(":")) return bare; // any IPv6 form
  if (/^[0-9a-fx.]+$/i.test(bare) && /\d/.test(bare)) return bare;
  return null;
}
