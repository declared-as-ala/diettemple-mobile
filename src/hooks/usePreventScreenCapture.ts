/**
 * Screen-capture protection for DietTemple.
 *
 * Android: `preventScreenCaptureAsync()` sets FLAG_SECURE on the window, which
 *   makes the OS block screenshots, screen-recording, and the Recents/app-switcher
 *   preview before any capture occurs. This is the correct native mechanism.
 *
 * iOS: There is no public API equivalent to FLAG_SECURE. expo-screen-capture
 *   uses a UITextField trick that can obscure content in the app-switcher
 *   snapshot but it does NOT prevent the user from pressing the side+volume
 *   buttons. We call preventScreenCaptureAsync() so the strongest available
 *   protection is active and add a screenshot listener so we can react in the UI.
 */
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

interface Options {
  /** Listen for iOS screenshot events (no-op on Android). Default: true. */
  listen?: boolean;
}

export function usePreventScreenCapture(_enabled = true, options: Options = {}) {
  const { listen = true } = options;
  const [screenshotTaken, setScreenshotTaken] = useState(false);

  useEffect(() => {
    let active = true;

    const protect = async () => {
      try {
        // Both platforms: activate strongest available protection.
        // Android → FLAG_SECURE (blocks capture at OS level).
        // iOS     → UITextField trick (obscures app-switcher snapshot).
        await ScreenCapture.preventScreenCaptureAsync();
      } catch {
        /* noop — protection is best-effort */
      }
    };

    protect();

    // iOS-only: listen for screenshot events so the UI can respond.
    // addScreenshotListener is a no-op on Android.
    let sub: { remove: () => void } | undefined;
    if (listen && Platform.OS === 'ios') {
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
      sub?.remove();
      // Allow on unmount (App root never unmounts, so this is a safety valve
      // for any future per-screen usage).
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, [listen]);

  /** Call this to clear the iOS screenshot-taken flag after showing a warning. */
  const acknowledgeScreenshot = useCallback(() => setScreenshotTaken(false), []);

  return { screenshotTaken, acknowledgeScreenshot };
}
