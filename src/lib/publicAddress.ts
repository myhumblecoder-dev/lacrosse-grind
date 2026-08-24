/**
 * Is this IP address one we are willing to make a request to?
 *
 * Only addresses on the public internet qualify. Everything reachable *from*
 * the server but not *by* the person pasting the link is refused: loopback,
 * the RFC1918 ranges, and above all 169.254.169.254, the cloud metadata
 * endpoint that hands out instance credentials to anything that asks.
 *
 * Rejects anything it cannot parse. A blocklist that fails open is not a
 * blocklist, and an address we do not recognise is not one we can vouch for.
 */
export function isPublicAddress(ip: string): boolean {
  const addr = ip.trim().toLowerCase();
  if (addr === "") return false;

  // ::ffff:169.254.169.254 reaches the same metadata service as the bare v4
  // address, so unwrap IPv4-mapped form before judging it.
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicAddress(mapped[1]);

  if (addr.includes(":")) return isPublicV6(addr);
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

  const [a, b] = octets;
  if (a === 0) return false; // 0.0.0.0/8 "this network"
  if (a === 10) return false; // private
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local INCLUDING metadata
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 168) return false; // private
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 192 && b === 0) return false; // 192.0.0/24 + 192.0.2/24 test nets
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51) return false; // TEST-NET-2
  if (a === 203 && b === 0) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast, reserved, broadcast

  return true;
}

function isPublicV6(addr: string): boolean {
  // Strip a zone index (fe80::1%eth0) before matching.
  const bare = addr.split("%")[0];
  if (!/^[0-9a-f:.]+$/.test(bare)) return false;

  if (bare === "::" || bare === "::1") return false; // unspecified, loopback
  if (/^f[cd]/.test(bare)) return false; // fc00::/7 unique local
  if (/^fe[89ab]/.test(bare)) return false; // fe80::/10 link-local
  if (/^ff/.test(bare)) return false; // ff00::/8 multicast
  if (/^2001:0?db8:/.test(bare)) return false; // documentation
  if (/^64:ff9b:/.test(bare)) return false; // NAT64, can wrap a private v4

  return true;
}
