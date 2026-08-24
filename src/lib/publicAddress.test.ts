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
