import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { TAMOS } from './tokens';

// Light + dark palettes — direct port of the CSS variables from the web `ds.jsx`
// (`.tamos-root` / `.tamos-root.dark`). Brand colours are merged in so screens
// can read `c.green`, `c.goldDeep`, etc., replacing `var(--tamos-*)`.
const light = {
  bg: '#F6F4EE',
  bg2: '#ECEAE2',
  surface: '#FFFFFF',
  surface2: '#F9F7F1',
  ink: '#14110D',
  ink2: '#4A463E',
  ink3: '#8C8678',
  border: '#E4DFD3',
  borderStrong: '#C9C2B0',
  greenSoft: '#E5F1E6',
  blueSoft: '#E4E9F4',
  redSoft: '#F6E3E0',
  goldSoft: '#FBEFCF',
  ...TAMOS,
};

const dark = {
  bg: '#0F0E0C',
  bg2: '#19171A',
  surface: '#1B1916',
  surface2: '#232019',
  ink: '#F5F2E9',
  ink2: '#B9B3A3',
  ink3: '#6E6A5E',
  border: '#2C2823',
  borderStrong: '#423D34',
  greenSoft: '#1B3024',
  blueSoft: '#1C2541',
  redSoft: '#3A1F1C',
  goldSoft: '#3A2D14',
  ...TAMOS,
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
