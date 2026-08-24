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
