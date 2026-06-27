/**
 * Block screen capture / screen recording while a sensitive screen is mounted.
 *
 * Implementation:
 *   - Uses `expo-screen-capture` (Android: FLAG_SECURE).
 *   - On iOS the OS does not allow truly blocking screenshots, but the package still
 *     exposes a screenshot listener; we surface that via `onScreenshot` so callers can
 *     blur sensitive UI as a fallback.
 *   - Wrapped in try/catch so missing native modules never crash the app.
 *
 * Usage:
 *   usePreventScreenCapture(true);
 *   const { screenshotTaken } = usePreventScreenCapture(true, { listen: true });
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

interface Options {
  /** Subscribe to iOS screenshot detection events (no-op on Android). */
  listen?: boolean;
}

export function usePreventScreenCapture(enabled = true, options: Options = {}) {
  const { listen = false } = options;
  const [screenshotTaken, setScreenshotTaken] = useState(false);
  const tagRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const tag = `dt_${Math.random().toString(36).slice(2, 9)}`;
    tagRef.current = tag;
    let active = true;
    (async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync(tag);
      } catch {
        /* noop: best-effort */
      }
    })();

    let sub: { remove: () => void } | undefined;
    if (listen) {
      try {
        sub = ScreenCapture.addScreenshotListener(() => {
          if (active) setScreenshotTaken(true);
        });
      } catch {
        /* noop */
      }
    }

    return () => {
      active = false;
      const t = tagRef.current;
      tagRef.current = null;
      if (t) {
        try {
          void ScreenCapture.allowScreenCaptureAsync(t).catch(() => {});
        } catch {
          /* noop */
        }
      }
      sub?.remove();
    };
  }, [enabled, listen]);

  /** Useful for components that want to clear a "blur fallback" after acknowledging. */
  const acknowledgeScreenshot = useCallback(() => setScreenshotTaken(false), []);

  return { screenshotTaken, acknowledgeScreenshot };
}
