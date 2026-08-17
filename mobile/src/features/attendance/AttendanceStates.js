import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';

/**
 * Пустое тело экрана вместо списка (Figma `mobile-body-empty`).
 *
 * Два повода показать его, и оба — не ошибка: в уроке нет учеников, и отмечать
 * некого; урок отменён, и витрина погашена. Поэтому это не `StateView` с кнопкой
 * «Повторить» — повторять нечего, экран остаётся рабочим, просто списка в нём нет.
 *
 * @param {'circle'|'plain'} frame круг под иконкой рисуется только у пустого состава:
 *   в макете отменённого урока иконка стоит без подложки
 */
function EmptyBody({ icon, frame = 'circle', title, subtitle }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20, paddingVertical: 48 }}>
      {frame === 'circle' ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.bg2,
          }}
        >
          <Icon name={icon} size={24} color={c.ink3} strokeWidth={2} />
        </View>
      ) : (
        <Icon name={icon} size={36} color={c.ink3} strokeWidth={1.8} />
      )}
      <View style={{ gap: 8 }}>
        {title ? (
          <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink2, textAlign: 'center' }}>
            {title}
          </Txt>
        ) : null}
        <Txt style={{ fontSize: 13, fontWeight: '500', lineHeight: 18, color: c.ink3, textAlign: 'center' }}>
          {subtitle}
        </Txt>
      </View>
    </View>
  );
}

/** §31: отмечать некого — и это вопрос к составу класса, а не к посещаемости. */
export function AttendanceEmptyRoster() {
  return (
    <EmptyBody
      icon="users"
      title="В уроке отсутствуют ученики."
      subtitle="Проверьте состав класса или подгруппы у Admin."
    />
  );
}

/**
 * §26: урок отменён. Текст зависит от того, было ли что гасить: у листа, который
 * успели опубликовать, витрина действительно погашена, а урок, посещаемость которого
 * никто не открывал, ничего не скрывает — и обещать ученику спрятанные данные,
 * которых нет, значит врать.
 */
export function AttendanceCancelled({ annulled }) {
  return (
    <EmptyBody
      icon="eyeOff"
      frame="plain"
      subtitle={annulled
        ? 'Ранее опубликованные данные скрыты от ученика и родителя, но сохранены в истории.'
        : 'Урок отменён — посещаемость по нему не заполняется.'}
    />
  );
}

/**
 * Скелет списка: повторяет геометрию карточки ученика, чтобы содержимое не прыгало
 * при подмене, а экран сразу читался как лист посещаемости.
 */
export function AttendanceSkeleton({ rows = 5 }) {
  const { c } = useTheme();
  const bar = (width, height = 12, color) => (
    <View style={{ width, height, borderRadius: 4, backgroundColor: color || c.bg2 }} />
  );

  return (
    <View style={{ gap: 12 }} accessibilityLabel="Загрузка посещаемости">
      <View style={{ backgroundColor: c.blueSoft, borderRadius: 16, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {bar(160, 22, c.stripeIdle)}
          {bar(70, 16)}
        </View>
        {bar('60%', 16)}
        {bar('45%', 14)}
      </View>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 47,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
            paddingHorizontal: 16,
            justifyContent: 'center',
          }}
        >
          {bar('55%', 14)}
        </View>
      ))}
    </View>
  );
}
