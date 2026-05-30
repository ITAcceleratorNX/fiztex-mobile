import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

// Soft elevation presets — replace the web `--shadow` / `--shadow-lg` CSS vars.
export const shadowSm = {
  shadowColor: '#14110D',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

export const shadowLg = {
  shadowColor: '#14110D',
  shadowOpacity: 0.16,
  shadowRadius: 28,
  shadowOffset: { width: 0, height: 16 },
  elevation: 10,
};

// Screen container — scrollable by default, themed background, status-bar inset.
export function Screen({ children, scroll = true, contentStyle, style }) {
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
    >
      {children}
    </ScrollView>
  );
}
