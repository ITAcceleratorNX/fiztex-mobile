import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

const SUSPICIOUS = {
  APP_BACKGROUND: 'APP_BACKGROUND',
  RE_ENTRY: 'RE_ENTRY',
  SCREENSHOT_ATTEMPT: 'SCREENSHOT_ATTEMPT',
  WINDOW_BLUR: 'WINDOW_BLUR',
};

export function useAnticheat({ enabled, onEvent, onPrivacy }) {
  const appState = useRef(AppState.currentState);
  const wasBackground = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    ScreenCapture.preventScreenCaptureAsync().catch(() => {});

    const screenshotSub = ScreenCapture.addScreenshotListener(() => {
      onEvent?.(SUSPICIOUS.SCREENSHOT_ATTEMPT, 'Screenshot detected');
    });

    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/active/) && next.match(/inactive|background/)) {
        wasBackground.current = true;
        onPrivacy?.(true);
        onEvent?.(SUSPICIOUS.APP_BACKGROUND, `App state: ${next}`);
      }
      if (appState.current.match(/inactive|background/) && next === 'active') {
        onPrivacy?.(false);
        if (wasBackground.current) {
          onEvent?.(SUSPICIOUS.RE_ENTRY, 'Returned to test after background');
          wasBackground.current = false;
        }
      }
      if (next === 'inactive') {
        onEvent?.(SUSPICIOUS.WINDOW_BLUR, 'App inactive');
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

export { SUSPICIOUS };
