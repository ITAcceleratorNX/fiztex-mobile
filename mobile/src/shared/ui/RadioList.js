import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';

/**
 * Выбор одного значения списком в карточке (Figma `phyztex` Р5, «Причина отсутствия»): строки
 * через тонкую черту, справа круг выбора, выбранная строка — жирнее и с заполненным кругом.
 *
 * Отличие от `PickerSheet`: там выбор во всплывающей шторке и закрывается после нажатия, здесь
 * список — само поле формы, и выбранное видно, пока человек дописывает комментарий.
 */
export function RadioList({ options = [], value, onChange, disabled = false, accessibilityLabel }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange?.(option.value)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 49,
              paddingHorizontal: 18,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: c.border,
              backgroundColor: pressed ? c.bg2 : 'transparent',
            })}
          >
            <Txt style={{ flex: 1, fontSize: 15, fontWeight: selected ? '700' : '400', color: c.ink }}>
              {option.label}
            </Txt>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: selected ? 0 : 1.5,
                borderColor: c.borderStrong,
                backgroundColor: selected ? c.blue : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.surface }} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
