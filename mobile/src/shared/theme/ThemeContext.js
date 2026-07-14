import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { FIZTEX } from './tokens';

// Light + dark palettes — matches fiztex-web's slate-based admin/entrance UI
// (slate-50 background, white surfaces, slate-900/500 ink, slate-200 borders).
// Brand colours are merged in so screens can read `c.green`, `c.goldDeep`, etc.
const light = {
  bg: '#F8FAFC',
  bg2: '#F1F5F9',
  surface: '#FFFFFF',
  surface2: '#F8FAFC',
  ink: '#0F172A',
  ink2: '#475569',
  ink3: '#94A3B8',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  greenSoft: '#FFF7ED',
  blueSoft: '#EEF1F8',
  redSoft: '#FEE2E2',
  goldSoft: '#FEF9C3',
  ...FIZTEX,
};

const dark = {
  bg: '#0F172A',
  bg2: '#182338',
  surface: '#1E293B',
  surface2: '#243149',
  ink: '#F1F5F9',
  ink2: '#B6C2D6',
  ink3: '#64748B',
  border: '#2E3D57',
  borderStrong: '#3E4F6D',
  greenSoft: '#3A2412',
  blueSoft: '#1B2745',
  redSoft: '#3A1C1C',
  goldSoft: '#3A2E0C',
  ...FIZTEX,
};

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  // null = follow system; otherwise an explicit override.
  const [override, setOverride] = useState(null);
  const isDark = override == null ? system === 'dark' : override === 'dark';

  const value = useMemo(() => {
    const c = isDark ? dark : light;
    return {
      c,
      dark: isDark,
      following: override == null,
      setScheme: setOverride, // 'light' | 'dark' | null
      toggle: () => setOverride(isDark ? 'light' : 'dark'),
    };
  }, [isDark, override]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    // Safe fallback so components can render outside the provider.
    return { c: light, dark: false, following: true, setScheme: () => {}, toggle: () => {} };
  }
  return ctx;
}

// Soft background variant for a brand colour name.
export function softFor(c, name) {
  return { green: c.greenSoft, blue: c.blueSoft, red: c.redSoft, gold: c.goldSoft }[name] || c.bg2;
}
