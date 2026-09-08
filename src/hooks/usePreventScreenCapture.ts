/**
 * Screen capture hook - configured to allow screenshots across the application.
 */
import { useCallback, useEffect, useState } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

interface Options {
  /** Subscribe to iOS screenshot detection events (no-op on Android). */
  listen?: boolean;
}

export function usePreventScreenCapture(_enabled = false, options: Options = {}) {
  const { listen = false } = options;
  const [screenshotTaken, setScreenshotTaken] = useState(false);

  useEffect(() => {
    // Explicitly ensure screen capture is allowed
    (async () => {
      try {
        await ScreenCapture.allowScreenCaptureAsync();
      } catch {
        /* noop */
      }
    })();

    let sub: { remove: () => void } | undefined;
    if (listen) {
      try {
        sub = ScreenCapture.addScreenshotListener(() => {
          setScreenshotTaken(true);
        });
      } catch {
        /* noop */
      }
    }

    return () => {
      sub?.remove();
    };
  }, [listen]);

  /** Useful for components that want to clear a "blur fallback" after acknowledging. */
  const acknowledgeScreenshot = useCallback(() => setScreenshotTaken(false), []);

  return { screenshotTaken, acknowledgeScreenshot };
}

