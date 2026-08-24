import { describe, expect, it, vi } from "vitest";
import { assertFetchableUrl } from "@/lib/fetchableUrl";

const publicHost = async () => ["93.184.216.34"];
const blocked = { ok: false, error: "url-not-allowed" };

describe("assertFetchableUrl", () => {
  it("allows an ordinary https image on a public host", async () => {
    const result = await assertFetchableUrl("https://images.example/ps5.png", publicHost);

    expect(result.ok).toBe(true);
  });

  // The design doc's own verification checklist, which did not pass before.
  it("refuses the cloud metadata endpoint", async () => {
    const direct = await assertFetchableUrl("https://169.254.169.254/latest/meta-data/", publicHost);
    const byName = await assertFetchableUrl("https://metadata.attacker.test/", async () => [
      "169.254.169.254",
    ]);

    expect(direct).toEqual(blocked);
    expect(byName).toEqual(blocked);
  });

  it("refuses file: URLs", async () => {
    expect(await assertFetchableUrl("file:///etc/passwd", publicHost)).toEqual(blocked);
  });

  it("refuses plain http", async () => {
    expect(await assertFetchableUrl("http://images.example/ps5.png", publicHost)).toEqual(blocked);
  });

  it("refuses schemes that are not http at all", async () => {
    for (const url of ["ftp://h/x.png", "gopher://h/x", "data:image/png;base64,AAAA"]) {
      expect(await assertFetchableUrl(url, publicHost), url).toEqual(blocked);
    }
  });

  it("refuses a host that resolves into the private network", async () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.1.1", "172.16.0.9", "::1"]) {
      const result = await assertFetchableUrl("https://inside.test/x.png", async () => [ip]);
      expect(result, ip).toEqual(blocked);
    }
  });

  it("refuses a name answering with one public and one private address", async () => {
    // Split-horizon rebinding: passing on the strength of the good answer
    // would let the connection land on the bad one.
    const result = await assertFetchableUrl("https://rebind.test/x.png", async () => [
      "93.184.216.34",
      "169.254.169.254",
    ]);

    expect(result).toEqual(blocked);
  });

  it("refuses credentials embedded in the URL", async () => {
    const result = await assertFetchableUrl("https://user:pass@images.example/x.png", publicHost);

    expect(result).toEqual(blocked);
  });

  it("refuses a name that resolves to nothing", async () => {
    expect(await assertFetchableUrl("https://void.test/x.png", async () => [])).toEqual(blocked);
  });

  it("refuses when the resolver itself fails", async () => {
    const result = await assertFetchableUrl("https://nope.test/x.png", async () => {
      throw new Error("ENOTFOUND");
    });

    expect(result).toEqual(blocked);
  });

  it("refuses input that is not a URL", async () => {
    for (const raw of ["", "not a url", "//images.example/x.png"]) {
      expect(await assertFetchableUrl(raw, publicHost), JSON.stringify(raw)).toEqual(blocked);
    }
  });

  it("never resolves a host it has already rejected on scheme", async () => {
    const resolver = vi.fn(publicHost);

    await assertFetchableUrl("http://169.254.169.254/", resolver);

    expect(resolver).not.toHaveBeenCalled();
  });
});

describe("assertFetchableUrl — addresses disguised as IPv6 literals", () => {
  const publicHost = async () => ["93.184.216.34"];

  it("refuses the metadata endpoint however it is spelled", async () => {
    for (const url of [
      "https://[::ffff:169.254.169.254]/latest/meta-data/",
      "https://[::169.254.169.254]/",
      "https://[2002:a9fe:a9fe::]/",
      "https://[64:ff9b::a9fe:a9fe]/",
      "https://2852039166/", // decimal shorthand, normalised by URL
      "https://0251.0376.0251.0376/", // octal shorthand
    ]) {
      const result = await assertFetchableUrl(url, publicHost);
      expect(result, url).toEqual({ ok: false, error: "url-not-allowed" });
    }
  });

  it("refuses loopback and private space in bracketed form", async () => {
    for (const url of [
      "https://[::1]/", "https://[::ffff:127.0.0.1]/",
      "https://[::ffff:10.0.0.1]/", "https://[2002:c0a8:1::]/",
    ]) {
      const result = await assertFetchableUrl(url, publicHost);
      expect(result, url).toEqual({ ok: false, error: "url-not-allowed" });
    }
  });

  it("does not mistake hostnames of hex letters and digits for addresses", async () => {
    // b2b.ec and f5.ca are names. Treating them as malformed addresses
    // refused real shop links with no explanation.
    for (const host of ["b2b.ec", "a1.cc", "f5.ca", "cdn3.ac", "1and1.com"]) {
      const result = await assertFetchableUrl(`https://${host}/x.png`, publicHost);
      expect(result.ok, host).toBe(true);
    }
  });

  it("still allows a public IPv6 host", async () => {
    const result = await assertFetchableUrl("https://[2606:4700:4700::1111]/x.png", publicHost);
    expect(result.ok).toBe(true);
  });
})
