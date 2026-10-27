import { describe, expect, it, vi } from "vitest";
import { copyText, fetchFiles, shareFiles, type ShareNavigator } from "./share-media";

const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

describe("copyText", () => {
  it("copies to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await copyText({ clipboard: { writeText } }, "hola")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hola");
  });

  it("says it could not when the clipboard is missing or refuses", async () => {
    expect(await copyText({}, "hola")).toBe(false);
    expect(await copyText({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) } }, "hola")).toBe(false);
  });
});

describe("shareFiles", () => {
  it("opens the share sheet with the files", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const nav: ShareNavigator = { canShare: () => true, share };
    expect(await shareFiles(nav, [file])).toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [file] });
  });

  it("is unsupported when the browser cannot share files", async () => {
    expect(await shareFiles({}, [file])).toBe("unsupported");
    expect(await shareFiles({ share: vi.fn() }, [file])).toBe("unsupported");
    expect(await shareFiles({ canShare: () => false, share: vi.fn() }, [file])).toBe("unsupported");
  });

  it("tells a closed share sheet apart from a failure", async () => {
    const abort = Object.assign(new Error("closed"), { name: "AbortError" });
    expect(await shareFiles({ canShare: () => true, share: vi.fn().mockRejectedValue(abort) }, [file])).toBe("cancelled");
    expect(await shareFiles({ canShare: () => true, share: vi.fn().mockRejectedValue(new Error("boom")) }, [file])).toBe("failed");
  });

  it("has nothing to share without files", async () => {
    expect(await shareFiles({ canShare: () => true, share: vi.fn() }, [])).toBe("unsupported");
  });
});

describe("fetchFiles", () => {
  const items = [
    { id: "m1", kind: "photo" as const, url: "https://s/1" },
    { id: "m2", kind: "video" as const, url: "https://s/2" },
  ];

  it("downloads every item as a named file with the right type", async () => {
    const fetcher = vi.fn((url: string) =>
      Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob([url], { type: "" })) }),
    );
    const result = await fetchFiles(fetcher, items);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.files.map((f) => [f.name, f.type])).toEqual([
        ["m1.jpg", "image/jpeg"],
        ["m2.mp4", "video/mp4"],
      ]);
    }
  });

  it("fails as a whole when one download fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob(["x"])) })
      .mockResolvedValueOnce({ ok: false, blob: () => Promise.resolve(new Blob([])) });
    expect(await fetchFiles(fetcher, items)).toEqual({ ok: false });
    expect(await fetchFiles(vi.fn().mockRejectedValue(new Error("net")), items)).toEqual({ ok: false });
  });
});
