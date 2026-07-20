import { useMemo } from 'react';
import { useTheme } from '@shared/theme/ThemeContext';
import { PHYSTECH } from '@shared/theme/tokens';

/** Semantic journey colours derived from the brand palette. */
export function journeyPalette(c) {
  return {
    green: c.green,
    greenDark: c.greenDeep,
    greenLight: c.greenSoft,
    blue: c.blue,
    blueDark: c.blueDeep,
    gold: c.gold,
    goldDark: c.goldDeep,
    orange: c.red,
    purple: c.blue,
    red: c.red,
    skyTop: c.bg,
    skyMid: c.blueSoft,
    grass: c.greenSoft,
    grassDark: c.green,
    path: c.goldDeep,
    pathLight: c.gold,
    locked: c.bg2,
    lockedBorder: c.borderStrong,
    lockedIcon: c.ink3,
    white: c.surface,
    text: c.ink,
    textMuted: c.ink3,
    textSecondary: c.ink2,
    cardBorder: c.border,
    cream: c.bg,
    navy: c.blueDeep,
    shadow: 'rgba(20, 17, 13, 0.08)',
  };
}

export function useJourneyTheme() {
  const { c } = useTheme();
  return useMemo(() => journeyPalette(c), [c]);
}

export const ALIGN_X = {
  left: '22%',
  center: '50%',
  right: '78%',
};

/** Static light palette for module-level StyleSheet fallbacks. */
export const theme = journeyPalette({
  bg: '#F8FAFC',
  bg2: '#F1F5F9',
  surface: '#FFFFFF',
  ink: '#0F172A',
  ink2: '#475569',
  ink3: '#94A3B8',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  greenSoft: '#FFF7ED',
  blueSoft: '#EEF1F8',
  goldSoft: '#FEF9C3',
  ...PHYSTECH,
});
