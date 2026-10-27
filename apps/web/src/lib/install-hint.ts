export type InstallHint = "android" | "ios";

export interface InstallContext {
  userAgent: string;
  /** `navigator.maxTouchPoints`; an iPad that presents itself as a Mac is told apart by it. */
  touchPoints: number;
  /** Already opened from the home screen. */
  installed: boolean;
  dismissed: boolean;
}

/** Which "add to home screen" steps to show, or null when the hint is not needed. */
export function installHintFor(context: InstallContext): InstallHint | null {
  if (context.installed || context.dismissed) {
    return null;
  }
  if (/iPhone|iPad|iPod/.test(context.userAgent) || (/Macintosh/.test(context.userAgent) && context.touchPoints > 1)) {
    return "ios";
  }
  return /Android/.test(context.userAgent) ? "android" : null;
}
