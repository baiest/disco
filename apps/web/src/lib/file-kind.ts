import { kindFromContentType, type MediaKind } from "@disco/domain";

interface NamedFile {
  type: string;
  name: string;
}

const PHOTO_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif", "gif"]);
const VIDEO_TYPES: Record<string, string> = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };
const OTHER_VIDEO_EXTENSIONS = new Set(["m4v", "3gp", "mkv", "avi"]);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Photo or video, from the browser's file type or, when it gives none, the file extension. */
export function mediaKindOfFile(file: NamedFile): MediaKind | null {
  if (file.type.startsWith("image/")) {
    return "photo";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  if (file.type !== "") {
    return null;
  }
  const extension = extensionOf(file.name);
  if (PHOTO_EXTENSIONS.has(extension)) {
    return "photo";
  }
  return extension in VIDEO_TYPES || OTHER_VIDEO_EXTENSIONS.has(extension) ? "video" : null;
}

/** The content type to upload a video with. Photos are always re-encoded as JPEG, so they need none. */
export function videoContentType(file: NamedFile): string {
  if (kindFromContentType(file.type) === "video") {
    return file.type;
  }
  return file.type === "" ? (VIDEO_TYPES[extensionOf(file.name)] ?? "") : file.type;
}
