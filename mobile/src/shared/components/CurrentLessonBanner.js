import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';

/**
 * Кнопка «Текущий урок» в нижней панели (Figma `teacher-banner-glavnaya`,
 * `glavnaya-student-home`, `glavnaya-Родитель-home`).
 *
 * <p>В макете это не пятая вкладка, а полоса над панелью — и правильно: вкладка означает
 * раздел, в который приходят и из которого возвращаются, а здесь один шаг наружу, в
 * карточку конкретного урока. Заодно полоса умеет то, чего иконка не умеет: сказать,
 * какой именно урок откроется.
 *
 * <p>Живёт в панели, а не на «Главной», поэтому доступна с любой вкладки — иначе за
 * «одним нажатием» пришлось бы сначала вернуться на главную.
 *
 * <p>Пустое состояние не прячет полосу, а занимает её словами: ТЗ §5 требует, чтобы пункт
 * оставался доступен и показывал сообщение, а на телефоне сообщение помещается прямо
 * сюда — заставлять человека нажать, чтобы прочитать «уроков нет», незачем.
 */
export function CurrentLessonBanner({ state, onOpen, style }) {
  const { c } = useTheme();
  const [opening, setOpening] = useState(false);
  const { loading, error, data } = state;

  const ready = Boolean(data?.lessonId);
  const pressable = ready && Boolean(onOpen);

  const handlePress = useCallback(async () => {
    if (!pressable || opening) return;
    setOpening(true);
    try {
      await onOpen();
    } finally {
      setOpening(false);
    }
  }, [pressable, opening, onOpen]);

  // Пока ничего не известно, полосы нет вовсе: пустая оранжевая плашка под панелью
  // навигации на первом кадре читается как сбой, а не как загрузка.
  if (loading && !data) return null;

  const text = bannerText({ loading, error, data });
  if (!text) return null;

  const tone = ready
    ? { bg: c.green, ink: '#FFFFFF', icon: '#FFFFFF' }
    // Нечего открывать — полоса перестаёт быть кнопкой и внешне: оранжевый со
    // стрелкой обещает переход, которого не будет.
    : { bg: c.surface2, ink: c.ink2, icon: c.ink3 };

  return (
    <Pressable
      accessibilityRole={pressable ? 'button' : 'text'}
      accessibilityLabel={pressable ? `Текущий урок. ${text}` : text}
      disabled={!pressable}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: 44,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: tone.bg,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <Icon name="clock" size={18} color={tone.icon} strokeWidth={2} />
      <Txt
        numberOfLines={1}
        style={{ flex: 1, fontSize: 14, fontWeight: '600', color: tone.ink }}
      >
        {text}
      </Txt>
      {opening ? (
        <ActivityIndicator size="small" color={tone.icon} />
      ) : pressable ? (
        <Icon name="chevronRight" size={18} color={tone.icon} strokeWidth={2.2} />
      ) : (
        <View style={{ width: 18 }} />
      )}
    </Pressable>
  );
}

/**
 * Что написано на полосе.
 *
 * <p>Ошибка показывается только когда показывать больше нечего: сорвавшееся фоновое
 * обновление не должно стирать урок, который человек уже видит (ТЗ §5 — сбой не выдаём
 * за отсутствие занятий, но и не устраиваем из него событие).
 */
function bannerText({ loading, error, data }) {
  if (data?.label) return data.label;
  if (error) return 'Не удалось определить текущий урок';
  if (loading) return null;
  return null;
}
