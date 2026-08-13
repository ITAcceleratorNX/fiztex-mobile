import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import Icon from '@shared/components/Icon';

export const VIEW_MODES = { day: 'day', week: 'week' };

const SEGMENTS = [
  { mode: VIEW_MODES.day, icon: 'list', label: 'День' },
  { mode: VIEW_MODES.week, icon: 'table', label: 'Неделя' },
];

/**
 * Figma `view-toggle` (node 2085:9407): 76×32, два сегмента 36×28 с иконками 16.
 * Подписей в макете нет — они уходят в `accessibilityLabel`, иначе режим
 * невозможно выбрать со скринридером.
 */
export function ViewModeToggle({ mode, onChange }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: 2,
        borderRadius: 10,
        backgroundColor: c.bg2,
      }}
    >
      {SEGMENTS.map((segment) => {
        const active = mode === segment.mode;
        return (
          <Pressable
            key={segment.mode}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label}
            onPress={() => onChange(segment.mode)}
            style={({ pressed }) => ({
              width: 36,
              height: 28,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? c.blue : 'transparent',
              opacity: pressed && !active ? 0.6 : 1,
            })}
          >
            <Icon
              name={segment.icon}
              size={16}
              color={active ? '#fff' : c.inkMuted}
              strokeWidth={2}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
