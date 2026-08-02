import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { PHYSTECH } from './tokens';

// Light + dark palettes — matches web's slate-based admin/entrance UI
// (slate-50 background, white surfaces, slate-900/500 ink, slate-200 borders).
// Brand colours are merged in so screens can read `c.green`, `c.goldDeep`, etc.
// Шапка карточки урока — всегда фирменный navy, в обеих темах одна и та же подложка.
// Поэтому цвета поверх неё тоже одинаковые: если бы они «переключались» вместе с темой,
// в тёмной теме белый текст поехал бы на светлый, а фон под ним остался бы синим.
const hero = {
  // Подложка шапки карточки урока. У ученика она фирменная navy, у родителя —
  // оранжевая (Figma «Родитель — полный экран»): роль видно по цвету, ещё до чтения.
  heroBg: '#274185',
  heroBgParent: '#FB923C',
  heroInk: '#FFFFFF',
  heroInkSoft: 'rgba(255,255,255,0.82)',
  heroSurface: 'rgba(255,255,255,0.09)',
  heroChipBg: '#E2E8F0',
  heroChipInk: '#64748B',
  // Фирменные знаки на подложке (Figma `ЛОГО`, node 2077:918): на navy — заливка
  // #88A7F9 с прозрачностью 3%, на оранжевой — белая с 6%. Альфа задаётся не в цвете,
  // а прозрачностью слоя знаков — так значение читается ровно как в макете
  // (fill + fill-opacity).
  heroWatermark: '#88A7F9',
  heroWatermarkOpacity: 0.03,
  heroWatermarkParent: '#FFFFFF',
  heroWatermarkParentOpacity: 0.06,
};

const light = {
  bg: '#FAFBFC',
  bg2: '#F1F5F9',
  surface: '#FFFFFF',
  surface2: '#F8FAFC',
  ink: '#1A1F36',
  ink2: '#475569',
  ink3: '#94A3B8',
  // Figma mobile greys — lesson meta / weekday labels and the idle accent stripe.
  inkMuted: '#6B7280',
  stripeIdle: '#D1D5DB',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  greenSoft: '#FFF7ED',
  blueSoft: '#EEF1F8',
  redSoft: '#FEE2E2',
  goldSoft: '#FEF9C3',
  // Успех — отдельный слот: brand-«green» это оранжевый CTA, зелёным ему быть нельзя,
  // а «готово» без зелёного не читается.
  success: '#065F46',
  successSoft: '#E0FBE3',
  ...hero,
  ...PHYSTECH,
};

const dark = {
  bg: '#0F172A',
  bg2: '#182338',
  surface: '#1E293B',
  surface2: '#243149',
  ink: '#F1F5F9',
  ink2: '#B6C2D6',
  ink3: '#64748B',
  inkMuted: '#9AA6BC',
  stripeIdle: '#3E4F6D',
  border: '#2E3D57',
  borderStrong: '#3E4F6D',
  greenSoft: '#3A2412',
  blueSoft: '#1B2745',
  redSoft: '#3A1C1C',
  goldSoft: '#3A2E0C',
  success: '#4ADE80',
  successSoft: '#123527',
  ...hero,
  ...PHYSTECH,
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
