import { describe, expect, it } from "vitest";
import { isPublicAddress } from "@/lib/publicAddress";

describe("isPublicAddress", () => {
  it("allows ordinary public addresses", () => {
    for (const ip of ["93.184.216.34", "8.8.8.8", "1.1.1.1", "142.250.187.206"]) {
      expect(isPublicAddress(ip), ip).toBe(true);
    }
  });

  it("refuses the cloud metadata endpoint", () => {
    // The one that matters: it hands instance credentials to any caller.
    expect(isPublicAddress("169.254.169.254")).toBe(false);
    expect(isPublicAddress("::ffff:169.254.169.254")).toBe(false);
    expect(isPublicAddress("169.254.0.1")).toBe(false);
  });

  it("refuses loopback and the private ranges", () => {
    for (const ip of [
      "127.0.0.1", "127.1.2.3", "0.0.0.0",
      "10.0.0.1", "10.255.255.255",
      "172.16.0.1", "172.31.255.255",
      "192.168.0.1", "192.168.1.1",
      "100.64.0.1", // CGNAT
    ]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  it("allows the public neighbours of private ranges", () => {
    // Off-by-one guards: these sit just outside the blocked blocks.
    for (const ip of ["172.15.0.1", "172.32.0.1", "11.0.0.1", "100.63.255.255", "100.128.0.1"]) {
      expect(isPublicAddress(ip), ip).toBe(true);
    }
  });

  it("refuses multicast, reserved and broadcast", () => {
    for (const ip of ["224.0.0.1", "239.255.255.250", "240.0.0.1", "255.255.255.255"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  it("refuses octal and hex octets that resolvers disagree about", () => {
    // 0177.0.0.1 is 127.0.0.1 to anything reading it as octal.
    for (const ip of ["0177.0.0.1", "010.0.0.1", "0x7f.0.0.1", "127.0.0.01"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  it("refuses IPv6 loopback, unique-local and link-local", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "fe80::1%eth0", "ff02::1"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  it("allows public IPv6", () => {
    for (const ip of ["2606:4700:4700::1111", "2a00:1450:4009:81f::200e"]) {
      expect(isPublicAddress(ip), ip).toBe(true);
    }
  });

  it("refuses anything it cannot parse rather than failing open", () => {
    for (const ip of ["", "   ", "not-an-ip", "1.2.3", "1.2.3.4.5", "999.1.1.1", "<script>"]) {
      expect(isPublicAddress(ip), JSON.stringify(ip)).toBe(false);
    }
  });
});

describe("isPublicAddress — IPv4 hidden inside IPv6", () => {
  // These all reach the metadata endpoint or the private network while looking
  // nothing like it as text. `new URL()` rewrites the readable spellings into
  // hex, so a guard that matched prefixes as strings waved them through.
  it("refuses IPv4-mapped addresses in hex form", () => {
    expect(isPublicAddress("::ffff:a9fe:a9fe")).toBe(false); // 169.254.169.254
    expect(isPublicAddress("::ffff:7f00:1")).toBe(false); // 127.0.0.1
    expect(isPublicAddress("::ffff:a00:1")).toBe(false); // 10.0.0.1
    expect(isPublicAddress("::ffff:c0a8:1")).toBe(false); // 192.168.0.1
  });

  it("refuses deprecated IPv4-compatible addresses", () => {
    expect(isPublicAddress("::7f00:1")).toBe(false); // 127.0.0.1
    expect(isPublicAddress("::a9fe:a9fe")).toBe(false); // 169.254.169.254
  });

  it("refuses 6to4-wrapped private addresses", () => {
    expect(isPublicAddress("2002:a00:1::1")).toBe(false); // wraps 10.0.0.1
    expect(isPublicAddress("2002:a9fe:a9fe::")).toBe(false); // wraps metadata
    expect(isPublicAddress("2002:7f00:1::")).toBe(false); // wraps 127.0.0.1
  });

  it("refuses NAT64-translated private addresses", () => {
    expect(isPublicAddress("64:ff9b::a9fe:a9fe")).toBe(false);
    expect(isPublicAddress("64:ff9b::7f00:1")).toBe(false);
  });

  it("still allows 6to4 wrapping a public address", () => {
    // 2002:5db8:d822:: wraps 93.184.216.34 — a real public host.
    expect(isPublicAddress("2002:5db8:d822::")).toBe(true);
  });

  it("refuses malformed IPv6 rather than failing open", () => {
    for (const ip of ["::ffff::1", "1:2:3", "gggg::1", "1::2::3", "12345::1"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });
})

describe("isPublicAddress — reserved ranges are the documented width", () => {
  it("blocks only the reserved /24s, not the whole /16", () => {
    // These are routable public space and must not be refused.
    for (const ip of ["192.0.1.5", "198.51.50.5", "203.0.50.5"]) {
      expect(isPublicAddress(ip), ip).toBe(true);
    }
    for (const ip of ["192.0.0.8", "192.0.2.5", "198.51.100.5", "203.0.113.5"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });
})
