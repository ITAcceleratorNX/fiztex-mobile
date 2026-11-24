import React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';

/** «‹ Назад» словом в начале экрана (Figma посещаемости 2170:5100, причины Р5). */
export function BackLink({ onPress, label = 'Назад' }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="chevronLeft" size={16} color={c.blue} strokeWidth={2.4} />
      <Txt style={{ fontSize: 16, fontWeight: '500', color: c.blue }}>{label}</Txt>
    </Pressable>
  );
}
