import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

// Event vocabulary matches the web admissions flow's anti-cheat events
// (useAttemptEvents.ts) so both clients feed the same `/attempts/{id}/events` log.
const EVENTS = {
  FOCUS_LOST: 'focus_lost',
  FOCUS_RETURNED: 'focus_returned',
  RESUMED: 'resumed',
  SCREENSHOT_ATTEMPT: 'screenshot_attempt',
};

export function useAnticheat({ enabled, onEvent, onPrivacy }) {
  const appState = useRef(AppState.currentState);
  const wasBackground = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    ScreenCapture.preventScreenCaptureAsync().catch(() => {});

    const screenshotSub = ScreenCapture.addScreenshotListener(() => {
      onEvent?.(EVENTS.SCREENSHOT_ATTEMPT, 'Screenshot detected');
    });

    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/active/) && next.match(/inactive|background/)) {
        wasBackground.current = true;
        onPrivacy?.(true);
        onEvent?.(EVENTS.FOCUS_LOST, `App state: ${next}`);
      }
      if (appState.current.match(/inactive|background/) && next === 'active') {
        onPrivacy?.(false);
        if (wasBackground.current) {
          onEvent?.(EVENTS.RESUMED, 'Returned to test after background');
          wasBackground.current = false;
        } else {
          onEvent?.(EVENTS.FOCUS_RETURNED, 'App active again');
        }
      }
      appState.current = next;
    });

    return () => {
      sub.remove();
      screenshotSub?.remove?.();
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, [enabled, onEvent, onPrivacy]);
}

export { EVENTS };
