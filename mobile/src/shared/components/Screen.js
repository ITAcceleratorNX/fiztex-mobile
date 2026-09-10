import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

/**
 * Высота плавающего таб-бара без нижнего инсета: 6 сверху + пилюля (14 + 28 + 14) + 8 снизу
 * (`app/navigation/CustomTabBar`).
 *
 * <p>Живёт здесь, а не в самом баре: бар лежит поверх экрана (`position: absolute`), и
 * отодвигать из-под него содержимое обязаны экраны. Считать это число по месту значит
 * завести вторую копию геометрии бара, которая разойдётся с первой при первой же правке.
 */
export const TAB_BAR_HEIGHT = 6 + 14 + 28 + 14 + 8;

/**
 * Полоса «Текущий урок» над панелью (Figma `Current Lesson Banner`, 390×44).
 *
 * <p>Высота фиксированная, хотя полоса бывает скрыта: место под неё резервируется всегда.
 * Иначе последняя строка списка то пряталась бы, то нет — в зависимости от того, идёт ли
 * сейчас урок, а «прыгающий» конец списка выглядит как поломка вёрстки.
 */
export const CURRENT_LESSON_BAR_HEIGHT = 44;

/** Вся нижняя обвязка, из-под которой экран обязан себя вытащить. */
export const BOTTOM_CHROME_HEIGHT = TAB_BAR_HEIGHT + CURRENT_LESSON_BAR_HEIGHT;

/**
 * Отступ снизу для экрана-вкладки: нижняя обвязка плюс безопасная зона устройства.
 *
 * <p>Хук, а не константа, потому что второе слагаемое известно только устройству. И
 * общий, а не число по месту: до него у каждой вкладки было своё «примерно сто», и
 * появление полосы «Текущий урок» пришлось бы разносить по десятку экранов заново.
 */
export function useBottomChromePadding(extra = 0) {
  const insets = useSafeAreaInsets();
  return insets.bottom + BOTTOM_CHROME_HEIGHT + extra;
}

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
