/**
 * Is this IP address one we are willing to make a request to?
 *
 * Only addresses on the public internet qualify. Everything reachable *from*
 * the server but not *by* the person pasting the link is refused: loopback,
 * the RFC1918 ranges, and above all 169.254.169.254, the cloud metadata
 * endpoint that hands out instance credentials to anything that asks.
 *
 * IPv6 is decoded rather than prefix-matched, because half a dozen forms carry
 * an IPv4 address inside them and `new URL()` rewrites them into hex on the
 * way past: `[::ffff:169.254.169.254]` arrives as `::ffff:a9fe:a9fe`, which
 * matches no textual pattern for the metadata endpoint while reaching exactly
 * the same host.
 *
 * Rejects anything it cannot parse. A blocklist that fails open is not a
 * blocklist, and an address we do not recognise is not one we can vouch for.
 */
export function isPublicAddress(ip: string): boolean {
  const addr = ip.trim().toLowerCase();
  if (addr === "") return false;

  if (addr.includes(":")) return isPublicV6(addr.split("%")[0]);
  return isPublicV4(addr);
}

function isPublicV4(addr: string): boolean {
  const parts = addr.split(".");
  if (parts.length !== 4) return false;

  const octets: number[] = [];
  for (const part of parts) {
    // Reject "010" and "0x7f": a leading zero or 0x prefix is read as octal or
    // hex by some resolvers and as decimal by others, which is exactly the
    // disagreement an attacker wants.
    if (!/^\d{1,3}$/.test(part)) return false;
    if (part.length > 1 && part[0] === "0") return false;
    const n = Number(part);
    if (n > 255) return false;
    octets.push(n);
  }

  return isPublicOctets(octets);
}

function isPublicOctets([a, b, c]: number[]): boolean {
  if (a === 0) return false; // 0.0.0.0/8 "this network"
  if (a === 10) return false; // private
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local INCLUDING metadata
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 168) return false; // private
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false; // IETF + TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast, reserved, broadcast

  return true;
}

function isPublicV6(addr: string): boolean {
  const groups = expandV6(addr);
  if (groups === null) return false;

  // Any form carrying an IPv4 address is judged as that address. This is the
  // one that matters: ::ffff:a9fe:a9fe and 2002:a9fe:a9fe:: both reach
  // 169.254.169.254.
  const embedded = embeddedV4(groups);
  if (embedded !== null) return isPublicOctets(embedded);

  const [g0, g1] = groups;
  if ((g0 & 0xfe00) === 0xfc00) return false; // fc00::/7 unique local
  if ((g0 & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
  if ((g0 & 0xff00) === 0xff00) return false; // ff00::/8 multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return false; // documentation
  if (g0 === 0x0100 && g1 === 0 && groups[2] === 0 && groups[3] === 0) {
    return false; // 100::/64 discard-only
  }

  return true;
}

/** The IPv4 address embedded in an IPv6 one, as octets, or null. */
function embeddedV4(g: number[]): number[] | null {
  const leadingZero = g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0;

  // ::ffff:a.b.c.d — IPv4-mapped, and ::a.b.c.d — IPv4-compatible. The second
  // is deprecated, which is precisely why a guard is unlikely to expect it.
  // :: and ::1 fall in here too and decode to 0.0.0.0 and 0.0.0.1, which the
  // octet rules already refuse — no need to special-case them back out.
  if (leadingZero && (g[5] === 0xffff || g[5] === 0)) {
    return groupsToOctets(g[6], g[7]);
  }
  // 2002:a.b.c.d::/48 — 6to4 wraps an IPv4 address in its second and third
  // groups.
  if (g[0] === 0x2002) return groupsToOctets(g[1], g[2]);
  // 64:ff9b::/96 — NAT64 translates to the IPv4 address in its tail.
  if (g[0] === 0x0064 && g[1] === 0xff9b) return groupsToOctets(g[6], g[7]);

  return null;
}

function groupsToOctets(high: number, low: number): number[] {
  return [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff];
}

/** An IPv6 address as its eight 16-bit groups, or null if it will not parse. */
function expandV6(input: string): number[] | null {
  let text = input;

  // A trailing dotted quad becomes the last two groups before anything else.
  const dotted = text.match(/^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (dotted) {
    const octets = dotted.slice(2).map(Number);
    if (octets.some((n) => n > 255)) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    text = `${dotted[1]}${high}:${low}`;
  }

  const halves = text.split("::");
  if (halves.length > 2) return null;

  const head = halves[0] === "" ? [] : halves[0].split(":");
  const tail = halves.length === 2 ? (halves[1] === "" ? [] : halves[1].split(":")) : [];

  let parts: string[];
  if (halves.length === 1) {
    parts = head;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 1) return null;
    parts = [...head, ...Array<string>(missing).fill("0"), ...tail];
  }
  if (parts.length !== 8) return null;

  const groups = parts.map((p) => (/^[0-9a-f]{1,4}$/.test(p) ? parseInt(p, 16) : NaN));
  return groups.some(Number.isNaN) ? null : groups;
}
