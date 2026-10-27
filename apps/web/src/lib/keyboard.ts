const DEFAULT_THRESHOLD = 120;

/**
 * The on screen keyboard is open when the visible part of the page is clearly shorter than the full
 * height. A small difference is just the browser bar moving, not a keyboard.
 */
export function isKeyboardOpen({
  baselineHeight,
  visibleHeight,
  threshold = DEFAULT_THRESHOLD,
}: {
  baselineHeight: number;
  visibleHeight: number;
  threshold?: number;
}): boolean {
  return baselineHeight - visibleHeight >= threshold;
}
