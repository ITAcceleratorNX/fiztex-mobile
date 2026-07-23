import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/** Mobile anti-cheat — maps AppState to admissions event types (section 12). */
export function useAnticheat({ enabled, attemptId, onLogEvent, onPrivacy }) {
  const appState = useRef(AppState.currentState);
  const wasBackground = useRef(false);

  useEffect(() => {
    if (!enabled || !attemptId) return undefined;

    ScreenCapture.preventScreenCaptureAsync().catch(() => {});

    const screenshotSub = ScreenCapture.addScreenshotListener(() => {
      onLogEvent?.('screenshot_attempt', 'screenshot detected');
    });

    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/active/) && next.match(/inactive|background/)) {
        wasBackground.current = true;
        // Fire before privacy overlay; keepalive helps the request survive app backgrounding.
        onLogEvent?.('app_background', `state:${next}`, true);
        onPrivacy?.(true);
      }
      if (appState.current.match(/inactive|background/) && next === 'active') {
        onPrivacy?.(false);
        if (wasBackground.current) {
          onLogEvent?.('focus_returned', 'returned from background');
          wasBackground.current = false;
        }
      }
      appState.current = next;
    });

    return () => {
      sub.remove();
      screenshotSub?.remove?.();
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, [enabled, attemptId, onLogEvent, onPrivacy]);
}
