import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';

/**
 * Figma «Учитель — Загрузка»: скелет повторяет геометрию самой карточки —
 * тонированный блок шапки, белый блок учебной части и сетка 2×2. Так контент не
 * прыгает при подмене, а экран сразу читается как «карточка урока», а не как
 * абстрактный лоадер.
 */
export function LessonCardSkeleton() {
  const { c } = useTheme();
  // Плейсхолдеры берут те же токены, что и реальные поверхности, поэтому скелет
  // сам подстраивается под тему — отдельной палитры для загрузки не нужно.
  const strong = c.stripeIdle;
  const soft = c.bg2;

  const bar = (width, height = 12, color = strong) => (
    <View style={{ width, height, borderRadius: 4, backgroundColor: color }} />
  );

  return (
    <View style={{ padding: 16, gap: 12 }} accessibilityLabel="Загрузка урока">
      <View style={{ backgroundColor: c.blueSoft, borderRadius: 16, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {bar(96, 20)}
          {bar(76, 16, soft)}
        </View>
        {bar('70%', 24)}
        <View style={{ gap: 8 }}>
          {bar('55%', 14, soft)}
          {bar('40%', 14, soft)}
          {bar('48%', 14, soft)}
        </View>
      </View>

      <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 16, gap: 14 }}>
        {bar(84, 10, soft)}
        {bar('88%', 14)}
        <View style={{ height: 1, backgroundColor: c.border }} />
        {bar(140, 10, soft)}
        {bar('100%', 14)}
        {bar('62%', 14)}
      </View>

      <View style={{ gap: 10 }}>
        {[0, 1].map((row) => (
          <View key={row} style={{ flexDirection: 'row', gap: 10 }}>
            {[0, 1].map((col) => (
              <View
                key={col}
                style={{
                  flex: 1,
                  height: 72,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.surface,
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
