import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

// Soft elevation presets — replace the web `--shadow` / `--shadow-lg` CSS vars.
export const shadowSm = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

// Карточки экрана урока: мягкая тень в фирменный navy, а не в нейтральный графит —
// Figma `drop-shadow(0 8px 12px rgba(39,65,133,0.08))`.
export const shadowCard = {
  shadowColor: '#274185',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
};

export const shadowLg = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.16,
  shadowRadius: 28,
  shadowOffset: { width: 0, height: 16 },
  elevation: 10,
};

// Screen container — scrollable by default, themed background, status-bar inset.
// Pass `onRefresh` (with `refreshing`) to enable pull-to-refresh.
export function Screen({ children, scroll = true, contentStyle, style, refreshing = false, onRefresh }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 4 };

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: c.bg }, pad, style]}>{children}</View>
    );
  }

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: c.bg }, style]}
      contentContainerStyle={[pad, contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.blue}
            colors={[c.blue]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
