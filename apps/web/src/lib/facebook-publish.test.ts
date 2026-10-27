import { describe, expect, it, vi } from "vitest";
import { markPosted, type PostRepo } from "./facebook-publish";

const A = "3f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f";
const B = "4f2b8a52-9c1e-4d3a-8f6b-1a2b3c4d5e6f";

function fakeRepo(overrides: Partial<PostRepo> = {}): PostRepo {
  return {
    currentUserId: vi.fn().mockResolvedValue("u1"),
    markPosted: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
}

describe("markPosted", () => {
  it("marks the records as posted", async () => {
    const repo = fakeRepo();
    expect(await markPosted(repo, [A, B])).toEqual({ ok: true });
    expect(repo.markPosted).toHaveBeenCalledWith([A, B]);
  });

  it("refuses an empty list or a bad id without touching the database", async () => {
    const repo = fakeRepo();
    expect(await markPosted(repo, [])).toEqual({ ok: false, reason: "invalid_ids" });
    expect(await markPosted(repo, [A, "nope"])).toEqual({ ok: false, reason: "invalid_ids" });
    expect(repo.markPosted).not.toHaveBeenCalled();
  });

  it("refuses more records than a post can hold", async () => {
    const repo = fakeRepo();
    const many = Array.from({ length: 31 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);
    expect(await markPosted(repo, many)).toEqual({ ok: false, reason: "invalid_ids" });
    expect(repo.markPosted).not.toHaveBeenCalled();
  });

  it("needs a session", async () => {
    const repo = fakeRepo({ currentUserId: vi.fn().mockResolvedValue(null) });
    expect(await markPosted(repo, [A])).toEqual({ ok: false, reason: "unauthenticated" });
    expect(repo.markPosted).not.toHaveBeenCalled();
  });

  it("reports a database failure", async () => {
    const repo = fakeRepo({ markPosted: vi.fn().mockResolvedValue({ ok: false, reason: "other" }) });
    expect(await markPosted(repo, [A])).toEqual({ ok: false, reason: "failed" });
  });
});
