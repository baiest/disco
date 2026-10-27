import { describe, expect, it } from "vitest";
import { mediaKindOfFile, videoContentType } from "./file-kind";

describe("mediaKindOfFile", () => {
  it.each([
    [{ type: "image/jpeg", name: "a.jpg" }, "photo"],
    [{ type: "image/heic", name: "a.heic" }, "photo"],
    [{ type: "image/png", name: "a.png" }, "photo"],
    [{ type: "video/mp4", name: "a.mp4" }, "video"],
    [{ type: "video/quicktime", name: "a.mov" }, "video"],
    [{ type: "", name: "IMG_0001.JPG" }, "photo"],
    [{ type: "", name: "clip.MOV" }, "video"],
    [{ type: "", name: "clip.webm" }, "video"],
  ] as const)("recognises %j as %s", (file, kind) => {
    expect(mediaKindOfFile(file)).toBe(kind);
  });

  it.each([
    { type: "application/pdf", name: "a.pdf" },
    { type: "", name: "notes.txt" },
    { type: "", name: "noextension" },
    { type: "audio/mpeg", name: "a.mp3" },
  ])("does not recognise %j", (file) => {
    expect(mediaKindOfFile(file)).toBeNull();
  });
});

describe("videoContentType", () => {
  it("keeps a type the app accepts", () => {
    expect(videoContentType({ type: "video/webm", name: "a.webm" })).toBe("video/webm");
  });

  it("works the type out from the extension when the browser gives none", () => {
    expect(videoContentType({ type: "", name: "a.MOV" })).toBe("video/quicktime");
    expect(videoContentType({ type: "", name: "a.mp4" })).toBe("video/mp4");
    expect(videoContentType({ type: "", name: "a.webm" })).toBe("video/webm");
  });

  it("returns the browser's type unchanged when it is one the app will refuse", () => {
    expect(videoContentType({ type: "video/x-matroska", name: "a.mkv" })).toBe("video/x-matroska");
    expect(videoContentType({ type: "", name: "a.mkv" })).toBe("");
  });
});
